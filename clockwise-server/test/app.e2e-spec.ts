import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';

describe('API (e2e)', () => {
  let app: INestApplication;
  const testDataFile = join(__dirname, 'test-data.json');
  const testSettingsFile = join(__dirname, 'settings.json');

  beforeAll(async () => {
    process.env.APP_DATA_FILE = testDataFile;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.getHttpAdapter().getInstance().set('trust proxy', true);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (existsSync(testDataFile)) unlinkSync(testDataFile);
    if (existsSync(testSettingsFile)) unlinkSync(testSettingsFile);
  });

  it('/api/v1/security/status (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/security/status')
      .expect(200)
      .then((response) => {
        expect(response.body).toHaveProperty('pinEnabled');
        expect(response.body).toHaveProperty('authorized');
      });
  });

  it('/api/v1/timers (POST and GET)', async () => {
    const newTimer = {
      name: 'E2E Timer',
      duration: 10,
      unit: 'seconds',
    };

    // Create timer
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/timers')
      .send(newTimer)
      .expect(201);

    expect(createRes.body.name).toBe('E2E Timer');
    const timerId = createRes.body.id;

    // Get timers
    const getRes = await request(app.getHttpServer())
      .get('/api/v1/timers')
      .expect(200);

    const found = getRes.body.find((t: any) => t.id === timerId);
    expect(found).toBeDefined();
    expect(found.name).toBe('E2E Timer');
  });

  it('limits repeated PIN verification attempts', async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      await request(app.getHttpServer())
        .post('/api/v1/security/verify')
        .set('X-Forwarded-For', '192.168.1.100')
        .send({ pin: '0000' })
        .expect(403);
    }

    await request(app.getHttpServer())
      .post('/api/v1/security/verify')
      .set('X-Forwarded-For', '192.168.1.100')
      .send({ pin: '0000' })
      .expect(429)
      .expect(({ body }) => {
        expect(body.message).toBe(
          'Too many security attempts. Please wait a minute before trying again.',
        );
        expect(body.disabled).toBe(true);
      });
  });
});
