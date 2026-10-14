import { Module } from '@nestjs/common';
import { GuaranteesService } from './guarantees.service.js';
import { GuaranteesController } from './guarantees.controller.js';

@Module({
  controllers: [GuaranteesController],
  providers: [GuaranteesService],
  exports: [GuaranteesService],
})
export class GuaranteesModule {}
