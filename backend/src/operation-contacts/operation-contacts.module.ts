import { Module } from '@nestjs/common';
import { OperationContactsService } from './operation-contacts.service.js';
import { OperationContactsController } from './operation-contacts.controller.js';

@Module({
  controllers: [OperationContactsController],
  providers: [OperationContactsService],
  exports: [OperationContactsService],
})
export class OperationContactsModule {}
