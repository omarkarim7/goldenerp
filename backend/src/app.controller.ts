import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getRoot() {
    return {
      status: 'online',
      name: 'GoldenERP Production API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
