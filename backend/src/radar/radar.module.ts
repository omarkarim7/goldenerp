import { Module } from '@nestjs/common';
import { RadarService } from './radar.service.js';
import { RadarScraperService } from './radar-scraper.service.js';
import { RadarController } from './radar.controller.js';
import { CompaniesModule } from '../companies/companies.module.js';

@Module({
  imports: [CompaniesModule],
  controllers: [RadarController],
  providers: [RadarService, RadarScraperService],
  exports: [RadarService, RadarScraperService],
})
export class RadarModule {}
