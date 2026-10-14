import { Module } from '@nestjs/common';
import { PurchasesService } from './purchases.service.js';
import { PurchasesController } from './purchases.controller.js';

@Module({
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
