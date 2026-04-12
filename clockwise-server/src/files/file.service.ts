import { Injectable } from '@nestjs/common';
import { readFileSync, writeFileSync, existsSync } from 'fs';

@Injectable()
export class FileStorageService {
    private readonly filePath: string;

    constructor() {
        this.filePath = process.env.APP_DATA_FILE || './data/data.json';
    }

    private cache: any[] | null = null;

    public readData(): any[] {
        if (this.cache) return this.cache;
        if (!existsSync(this.filePath)) return [];
        try {
            const content = readFileSync(this.filePath, 'utf8');
            this.cache = JSON.parse(content);
            return this.cache || [];
        } catch (e) {
            return [];
        }
    }

    public writeData(data: any[]): void {
        this.cache = data;
        const dir = require('path').dirname(this.filePath);
        if (!existsSync(dir)) {
            require('fs').mkdirSync(dir, { recursive: true });
        }
        writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    }
}