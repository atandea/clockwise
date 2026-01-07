import { Controller, Get } from '@nestjs/common';

@Controller('discovery')
export class DiscoveryController {
    @Get()
    discover() {
        return {
            service: 'clockwise',
            version: '1.0',
        };
    }
}
