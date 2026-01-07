import { Injectable } from '@nestjs/common';
import { readFileSync, writeFileSync, existsSync } from 'fs';

@Injectable()
export class FileStorageService {
    private readonly filePath = './data/data.json';

    public readData(): any[] {
        if (!existsSync(this.filePath)) return [];
        return JSON.parse(readFileSync(this.filePath, 'utf8'));
    }

    public writeData(data: any[]): void {
        if (!existsSync(this.filePath)) {
            const dir = this.filePath.substring(0, this.filePath.lastIndexOf('/'));
            if (!existsSync(dir)) {
                require('fs').mkdirSync(dir, { recursive: true });
            }
            writeFileSync(this.filePath, JSON.stringify([], null, 2));
        }
        writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    }
}