import { Module } from '@nestjs/common';
import { AuthorizedPersonsService } from './authorized-persons.service.js';
import { AuthorizedPersonsController } from './authorized-persons.controller.js';

@Module({
  controllers: [AuthorizedPersonsController],
  providers: [AuthorizedPersonsService],
  exports: [AuthorizedPersonsService],
})
export class AuthorizedPersonsModule {}
