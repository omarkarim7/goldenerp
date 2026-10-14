import { Module } from '@nestjs/common';
import { PreviousWorksService } from './previous-works.service.js';
import { PreviousWorksController } from './previous-works.controller.js';

@Module({
  controllers: [PreviousWorksController],
  providers: [PreviousWorksService],
  exports: [PreviousWorksService],
})
export class PreviousWorksModule {}
