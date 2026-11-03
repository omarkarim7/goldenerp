import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const PROD_DATABASE_URL = "mysql://u179759652_admin:GoldenERP%232026%23%24%40@localhost:3306/u179759652_goldenerp";

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('mysql://') || process.env.DATABASE_URL.includes('root@')) {
  process.env.DATABASE_URL = PROD_DATABASE_URL;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
