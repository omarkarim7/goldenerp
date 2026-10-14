import { Module, Global } from '@nestjs/common';
import { TelegramService } from './telegram.service.js';
import { TelegramController } from './telegram.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
