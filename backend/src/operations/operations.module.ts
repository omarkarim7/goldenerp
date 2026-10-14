import { Module } from '@nestjs/common';
import { OperationsService } from './operations.service.js';
import { OperationsController } from './operations.controller.js';
import { CompaniesModule } from '../companies/companies.module.js';
import { RadarModule } from '../radar/radar.module.js';

@Module({
  imports: [CompaniesModule, RadarModule],
  controllers: [OperationsController],
  providers: [OperationsService],
  exports: [OperationsService],
})
export class OperationsModule {}
