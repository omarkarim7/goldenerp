import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { CompaniesModule } from './companies/companies.module.js';
import { AuthorizedPersonsModule } from './authorized-persons/authorized-persons.module.js';
import { OperationsModule } from './operations/operations.module.js';
import { OperationContactsModule } from './operation-contacts/operation-contacts.module.js';
import { GuaranteesModule } from './guarantees/guarantees.module.js';
import { SuppliersModule } from './suppliers/suppliers.module.js';
import { PurchasesModule } from './purchases/purchases.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { EmployeesModule } from './employees/employees.module.js';
import { PreviousWorksModule } from './previous-works/previous-works.module.js';
import { CertificatesModule } from './certificates/certificates.module.js';
import { FinanceModule } from './finance/finance.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { ApprovalsModule } from './approvals/approvals.module.js';
import { RadarModule } from './radar/radar.module.js';
import { AuditModule } from './audit/audit.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { TelegramModule } from './telegram/telegram.module.js';
import { FileUploadService } from './common/services/file-upload.service.js';

@Module({
  imports: [
    // Config — loads .env
    ConfigModule.forRoot({ isGlobal: true }),

    // Scheduler — for cron jobs (guarantee expiry, radar)
    ScheduleModule.forRoot(),

    // Database
    PrismaModule,

    // Auth & Users
    AuthModule,
    UsersModule,

    // Companies & Signatories
    CompaniesModule,
    AuthorizedPersonsModule,

    // Operations & Related
    OperationsModule,
    OperationContactsModule,
    PreviousWorksModule,

    // Tendering Workflow
    GuaranteesModule,
    CertificatesModule,
    ApprovalsModule,

    // Finance & Procurement
    SuppliersModule,
    PurchasesModule,
    FinanceModule,

    // Inventory
    InventoryModule,

    // HR
    EmployeesModule,

    // Documents & Archive
    DocumentsModule,

    // Radar
    RadarModule,

    // System
    AuditModule,
    SettingsModule,
    NotificationsModule,
    TelegramModule,
  ],
  controllers: [AppController],
  providers: [AppService, FileUploadService],
})
export class AppModule {}
