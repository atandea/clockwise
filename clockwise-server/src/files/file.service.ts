import { Injectable } from '@nestjs/common';
import { readFileSync, writeFileSync, existsSync } from 'fs';

@Injectable()
export class FileStorageService {
    private readonly filePath: string;

    constructor() {
        this.filePath = process.env.APP_DATA_FILE || './data/data.json';
    }

    public readData(): any[] {
        if (!existsSync(this.filePath)) return [];
        return JSON.parse(readFileSync(this.filePath, 'utf8'));
    }

    public writeData(data: any[]): void {
        const dir = require('path').dirname(this.filePath);
        if (!existsSync(dir)) {
            require('fs').mkdirSync(dir, { recursive: true });
        }
        if (!existsSync(this.filePath)) {
            writeFileSync(this.filePath, JSON.stringify([], null, 2));
        }
        writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    }
}