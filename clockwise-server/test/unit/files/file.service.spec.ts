import { Test, TestingModule } from '@nestjs/testing';
import { FileStorageService } from 'src/files/file.service';
import * as fs from 'node:fs';
import type { Mock } from 'vitest';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe('FileStorageService', () => {
  let service: FileStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileStorageService],
    }).compile();

    service = module.get<FileStorageService>(FileStorageService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('readData', () => {
    it('should return empty array if file does not exist', () => {
      (fs.existsSync as Mock).mockReturnValue(false);
      expect(service.readData()).toEqual([]);
    });

    it('should return parsed data if file exists', () => {
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue('[{"id": "1"}]');

      const data = service.readData();
      expect(data).toEqual([{ id: '1' }]);
    });

    it('should use cache on subsequent reads', () => {
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue('[{"id": "1"}]');

      service.readData();
      service.readData();

      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('writeData', () => {
    it('should write data to file and create directory if missing', () => {
      const data = [{ id: '2' }];
      (fs.existsSync as Mock).mockReturnValue(false); // directory doesn't exist

      service.writeData(data);

      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify(data, null, 2),
      );
    });
  });
});
