# 🏗️ GoldenERP V1.0 — Master Development Plan

> **نظام إدارة المناقصات والمشتريات الحكومية**
> تاريخ الإعداد: 1 أكتوبر 2026

---

## 📋 جدول المحتويات

1. [القرار التقني النهائي](#-1-القرار-التقني-النهائي)
2. [هيكل المشروع](#-2-هيكل-المشروع)
3. [Database Schema الكامل](#-3-database-schema-الكامل)
4. [الخطة الزمنية — 20 أسبوع](#-4-الخطة-الزمنية)
5. [تفصيل كل Sprint](#-5-تفصيل-كل-sprint)
6. [Workflow دورة حياة العملية](#-6-workflow-دورة-حياة-العملية)
7. [قواعد ذهبية](#-7-قواعد-ذهبية)
8. [Deployment Strategy](#-8-deployment-strategy)

---

## 🔧 1. القرار التقني النهائي

| الجزء | الاختيار | السبب |
|---|---|---|
| **Frontend** | Next.js 14+ (App Router) + TypeScript | SSR + file-based routing + API routes |
| **UI Library** | Tailwind CSS + shadcn/ui | سريع + مكونات جاهزة + تخصيص كامل |
| **Backend** | NestJS + TypeScript | Modular architecture مناسب لـ ERP |
| **Database** | MySQL / MariaDB | متوافق مع Hostinger Web/Cloud |
| **ORM** | Prisma | Type-safe + migrations + سهل النقل |
| **Auth** | JWT + Refresh Token + Argon2 | آمن + stateless |
| **Permissions** | RBAC (Role-Based Access Control) | مرن + قابل للتوسع |
| **PDF** | `@react-pdf/renderer` أو `puppeteer` | طباعة خطابات + تقارير |
| **Notifications** | Telegram Bot API | تنبيهات + موافقات |
| **Scheduler** | `@nestjs/schedule` (cron) | تنبيهات تلقائية |
| **File Storage** | Local → Object Storage | ملفات منفصلة عن DB |
| **Version Control** | Git + GitHub | تتبع + backup |
| **Docker** | ❌ غير مستخدم | |
| **VPS** | ❌ غير مطلوب حالياً | |
| **Deployment** | Hostinger Web/Cloud Hosting | Node.js + MySQL مدعومين |

---

## 📁 2. هيكل المشروع

```
f:\goldenerp\
│
├── frontend/                     # Next.js App
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx        # Sidebar + Header
│   │   │   ├── page.tsx          # Dashboard Home
│   │   │   ├── companies/
│   │   │   ├── operations/
│   │   │   │   ├── page.tsx      # قائمة العمليات
│   │   │   │   ├── new/
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx  # تفاصيل العملية
│   │   │   │       ├── technical/
│   │   │   │       ├── financial/
│   │   │   │       ├── guarantees/
│   │   │   │       ├── submission/
│   │   │   │       ├── opening/
│   │   │   │       ├── grievance/
│   │   │   │       ├── award/
│   │   │   │       ├── supply/
│   │   │   │       ├── payments/
│   │   │   │       └── archive/
│   │   │   ├── radar/
│   │   │   ├── guarantees/
│   │   │   ├── suppliers/
│   │   │   ├── inventory/
│   │   │   ├── employees/
│   │   │   ├── reports/
│   │   │   ├── documents/
│   │   │   ├── archive/
│   │   │   └── settings/
│   │   └── api/                  # Next.js API routes (proxy)
│   ├── components/
│   │   ├── ui/                   # shadcn components
│   │   ├── layout/               # Sidebar, Header, Breadcrumbs
│   │   ├── forms/                # Reusable form components
│   │   ├── tables/               # Data tables
│   │   └── shared/               # Shared components
│   ├── hooks/
│   ├── lib/
│   ├── services/                 # API service layer
│   ├── store/                    # Zustand stores
│   ├── types/
│   └── utils/
│
├── backend/                      # NestJS App
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   │
│   │   ├── common/
│   │   │   ├── decorators/
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   ├── filters/
│   │   │   ├── pipes/
│   │   │   └── utils/
│   │   │
│   │   ├── config/
│   │   │
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   └── guards/
│   │   │
│   │   ├── users/
│   │   ├── roles/
│   │   ├── permissions/
│   │   │
│   │   ├── companies/
│   │   ├── authorized-persons/
│   │   │
│   │   ├── operations/
│   │   ├── operation-contacts/
│   │   ├── operation-documents/
│   │   │
│   │   ├── radar/
│   │   │
│   │   ├── previous-works/
│   │   ├── technical-offers/
│   │   ├── financial-offers/
│   │   │
│   │   ├── guarantees/
│   │   ├── submissions/
│   │   ├── openings/
│   │   ├── grievances/
│   │   ├── awards/
│   │   │
│   │   ├── suppliers/
│   │   ├── purchases/
│   │   ├── inventory/
│   │   │
│   │   ├── employees/
│   │   ├── advances/
│   │   ├── visits/
│   │   │
│   │   ├── certificates/
│   │   ├── finance/
│   │   │
│   │   ├── documents/
│   │   ├── archive/
│   │   ├── printing/
│   │   ├── approvals/
│   │   │
│   │   ├── notifications/
│   │   ├── telegram/
│   │   ├── reports/
│   │   │
│   │   ├── audit/
│   │   └── security/
│   │
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   │
│   └── test/
│
├── uploads/                      # Local file storage
│   ├── companies/
│   ├── operations/
│   ├── guarantees/
│   ├── previous-works/
│   ├── receipts/
│   └── archive/
│
├── docs/
│   ├── SOW.md
│   ├── ERD.md
│   └── API.md
│
├── .env.example
├── .gitignore
└── README.md
```

---

## 🗄️ 3. Database Schema الكامل

### 🔐 Core — المستخدمين والصلاحيات

```prisma
// =============================================
// AUTH & USERS
// =============================================

model User {
  id              String    @id @default(cuid())
  username        String    @unique
  email           String    @unique
  password        String    // Argon2 hashed
  fullName        String
  phone           String?
  role            UserRole  @default(EMPLOYEE)
  isActive        Boolean   @default(true)
  isLocked        Boolean   @default(false)
  failedAttempts  Int       @default(0)
  lastLogin       DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  permissions     UserPermission[]
  auditLogs       AuditLog[]
  loginAttempts   LoginAttempt[]
  approvals       Approval[]

  @@map("users")
}

enum UserRole {
  GENERAL_MANAGER   // كل الصلاحيات + موافقة الطباعة
  DEPUTY_MANAGER    // موافقة الطباعة فقط
  EMPLOYEE          // إدخال بيانات فقط
}

model Permission {
  id          String   @id @default(cuid())
  code        String   @unique  // e.g. "operation.create"
  name        String
  module      String
  description String?

  users       UserPermission[]

  @@map("permissions")
}

model UserPermission {
  id           String     @id @default(cuid())
  userId       String
  permissionId String

  user         User       @relation(fields: [userId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])

  @@unique([userId, permissionId])
  @@map("user_permissions")
}
```

### 🏢 Companies — الشركات

```prisma
// =============================================
// COMPANIES
// =============================================

model Company {
  id                  String   @id @default(cuid())
  name                String
  code                String   @unique  // A, B, C, D
  commercialRegister  String?
  taxCard             String?
  license             String?
  address             String?
  email               String?
  fax                 String?
  logoPath            String?
  bankName            String?
  bankBranch          String?
  bankAccountNumber   String?
  isActive            Boolean  @default(true)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  documents           CompanyDocument[]
  authorizedPersons   AuthorizedPerson[]
  operationCompanies  OperationCompany[]
  previousWorks       PreviousWork[]

  @@map("companies")
}

model CompanyDocument {
  id         String   @id @default(cuid())
  companyId  String
  type       CompanyDocType
  fileName   String
  filePath   String
  fileType   String   // pdf, jpg, png
  fileSize   Int?
  uploadedBy String?
  createdAt  DateTime @default(now())

  company    Company  @relation(fields: [companyId], references: [id])

  @@map("company_documents")
}

enum CompanyDocType {
  COMMERCIAL_REGISTER   // السجل التجاري
  TAX_CARD              // البطاقة الضريبية
  LICENSE               // ترخيص المزاولة
  STAMP                 // ختم الشركة
  SIGNATURE             // توقيع المفوض
}

model AuthorizedPerson {
  id          String   @id @default(cuid())
  companyId   String
  name        String
  title       String   // صفته
  nationalId  String
  signaturePath String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  company     Company  @relation(fields: [companyId], references: [id])

  @@map("authorized_persons")
}
```

### 📋 Operations — العمليات (الـ Core Entity)

```prisma
// =============================================
// OPERATIONS
// =============================================

model Operation {
  id              String          @id @default(cuid())
  serialNumber    Int             @unique @default(autoincrement())
  externalNumber  String?         // رقم العملية الخارجي من الجهة
  name            String
  authority       String          // الجهة
  tenderType      TenderType
  status          OperationStatus @default(DRAFT)
  isCodeLocked    Boolean         @default(false)
  isArchived      Boolean         @default(false)
  notes           String?         @db.Text
  createdBy       String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  companies       OperationCompany[]
  dates           OperationDate[]
  contacts        OperationContact[]
  documents       OperationDocument[]
  technicalOffers TechnicalOffer[]
  financialOffers FinancialOffer[]
  guarantees      Guarantee[]
  submissions     Submission[]
  technicalOpenings TechnicalOpening[]
  financialOpenings FinancialOpening[]
  grievances      Grievance[]
  awards          Award[]
  supplyOrders    SupplyOrder[]
  purchases       Purchase[]
  certificates    Certificate[]
  operationFinance OperationFinance?

  @@map("operations")
}

enum TenderType {
  TENDER         // مناقصة
  PRACTICE       // ممارسة
  AUCTION        // مزاد
  DIRECT_ORDER   // أمر مباشر
}

enum OperationStatus {
  DRAFT                // مسودة
  BOOKLET_WITHDRAWN    // تم سحب الكراسة
  SUBMITTED            // تم التقديم
  TECHNICAL_OPENED     // تم الفتح الفني
  TECHNICAL_ACCEPTED   // مقبول فنياً
  TECHNICAL_REJECTED   // مرفوض فنياً
  GRIEVANCE_FILED      // تم تقديم تظلم
  FINANCIAL_OPENED     // تم الفتح المالي
  AWARDED              // تم الترسية
  SUPPLY_IN_PROGRESS   // جاري التوريد
  COMPLETED            // تم الانتهاء
  CLOSED               // مغلقة
  CANCELLED            // ملغاة
  ARCHIVED             // مؤرشفة
}

// ربط العملية بالشركات (تقديم متعدد)
model OperationCompany {
  id          String   @id @default(cuid())
  operationId String
  companyId   String
  displayCode String   // A1, B3, etc. — يتولد أوتوماتيك
  isWinner    Boolean  @default(false)
  isLocked    Boolean  @default(false) // يُقفل بعد خسارة
  createdAt   DateTime @default(now())

  operation   Operation @relation(fields: [operationId], references: [id])
  company     Company   @relation(fields: [companyId], references: [id])

  @@unique([operationId, companyId])
  @@unique([displayCode])
  @@map("operation_companies")
}

// التواريخ الحرجة
model OperationDate {
  id              String   @id @default(cuid())
  operationId     String
  dateType        OperationDateType
  dateValue       DateTime
  reminderSent    Boolean  @default(false)
  createdAt       DateTime @default(now())

  operation       Operation @relation(fields: [operationId], references: [id])

  @@map("operation_dates")
}

enum OperationDateType {
  PUBLICATION         // تاريخ النشر
  BOOKLET_DEADLINE    // آخر سحب كراسة
  TECHNICAL_OPENING   // فتح فني
  FINANCIAL_OPENING   // فتح مالي
  EXECUTION_START     // بداية التنفيذ
  EXECUTION_END       // نهاية التنفيذ
}

// جهات الاتصال في الجهة
model OperationContact {
  id          String   @id @default(cuid())
  operationId String
  name        String
  title       String?
  phone       String?
  telegram    String?  // Telegram username أو chat_id
  email       String?
  notes       String?
  createdAt   DateTime @default(now())

  operation   Operation @relation(fields: [operationId], references: [id])

  @@map("operation_contacts")
}

// مستندات العملية
model OperationDocument {
  id          String   @id @default(cuid())
  operationId String
  companyId   String?
  type        OpDocType
  fileName    String
  filePath    String
  fileType    String
  fileSize    Int?
  uploadedBy  String?
  createdAt   DateTime @default(now())

  operation   Operation @relation(fields: [operationId], references: [id])

  @@map("operation_documents")
}

enum OpDocType {
  BOOKLET             // كراسة الشروط
  SUPPLY_ORDER        // أمر التوريد
  CONTRACT            // العقد
  RECEIPT             // إيصال
  LETTER              // خطاب
  OTHER
}
```

### 📄 Offers — العروض الفنية والمالية

```prisma
// =============================================
// PREVIOUS WORKS — سابقات الأعمال
// =============================================

model PreviousWork {
  id          String   @id @default(cuid())
  companyId   String
  category    String   // كاوتش، نظافة، أكياس...
  title       String
  authority   String?
  year        Int?
  docType     PrevWorkDocType
  fileName    String
  filePath    String
  fileSize    Int?
  uploadedBy  String?
  createdAt   DateTime @default(now())

  company     Company  @relation(fields: [companyId], references: [id])
  technicalOfferItems TechnicalOfferItem[]

  @@map("previous_works")
}

enum PrevWorkDocType {
  SUPPLY_ORDER      // أمر توريد
  CONTRACT          // عقد
  COMPLETION_CERT   // شهادة إتمام
}

// =============================================
// TECHNICAL OFFER — العرض الفني
// =============================================

model TechnicalOffer {
  id          String   @id @default(cuid())
  operationId String
  companyId   String
  notes       String?  @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  operation   Operation @relation(fields: [operationId], references: [id])
  items       TechnicalOfferItem[]

  @@map("technical_offers")
}

model TechnicalOfferItem {
  id               String       @id @default(cuid())
  technicalOfferId String
  previousWorkId   String
  isSelected       Boolean      @default(true)
  sortOrder        Int          @default(0)

  technicalOffer   TechnicalOffer @relation(fields: [technicalOfferId], references: [id])
  previousWork     PreviousWork   @relation(fields: [previousWorkId], references: [id])

  @@map("technical_offer_items")
}

// =============================================
// FINANCIAL OFFER — العرض المالي
// =============================================

model FinancialOffer {
  id          String   @id @default(cuid())
  operationId String
  companyId   String
  subtotal    Decimal  @default(0) @db.Decimal(15, 2)
  vatRate     Decimal  @default(14) @db.Decimal(5, 2) // نسبة القيمة المضافة
  vatAmount   Decimal  @default(0) @db.Decimal(15, 2)
  grandTotal  Decimal  @default(0) @db.Decimal(15, 2)
  amountInWords String? // المبلغ بالحروف
  executionPeriod Int?  // مدة التنفيذ بالأيام
  notes       String?  @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  operation   Operation @relation(fields: [operationId], references: [id])
  items       FinancialOfferItem[]

  @@map("financial_offers")
}

model FinancialOfferItem {
  id               String         @id @default(cuid())
  financialOfferId String
  itemName         String
  description      String?
  unit             String         // قطعة، كجم، متر...
  quantity         Decimal        @db.Decimal(15, 3)
  unitPrice        Decimal        @db.Decimal(15, 2)
  totalPrice       Decimal        @db.Decimal(15, 2)
  sortOrder        Int            @default(0)

  financialOffer   FinancialOffer @relation(fields: [financialOfferId], references: [id])

  @@map("financial_offer_items")
}
```

### 🛡️ Guarantees — التأمينات

```prisma
// =============================================
// GUARANTEES — التأمينات
// =============================================

model Guarantee {
  id             String          @id @default(cuid())
  operationId    String
  companyId      String
  type           GuaranteeType
  paymentMethod  GuaranteePaymentMethod
  amount         Decimal         @db.Decimal(15, 2)
  percentage     Decimal?        @db.Decimal(5, 2) // 1%, 2%, 5%
  startDate      DateTime?
  endDate        DateTime?
  duration       Int?            // بالأيام
  status         GuaranteeStatus @default(ACTIVE)

  // Bank Guarantee fields
  bankName       String?
  bankBranch     String?
  guaranteeNumber String?

  // Cash fields
  receiptNumber  String?
  treasury       String?
  paymentDate    DateTime?

  // Recovery
  isRecovered        Boolean   @default(false)
  recoveryLetterDate DateTime? // تاريخ خطاب الاسترداد
  recoveryLetterPath String?   // ملف خطاب الاسترداد
  paymentOrderDate   DateTime? // تاريخ أمر الدفع
  paymentOrderPath   String?   // ملف أمر الدفع
  actualRecoveryDate DateTime? // تاريخ الاسترداد الفعلي
  deliveredTo        String?   // مسلم لمين
  deliveryReceiptPath String?  // صورة إيصال التسليم

  notes          String?        @db.Text
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  operation      Operation      @relation(fields: [operationId], references: [id])
  notifications  GuaranteeNotification[]

  @@map("guarantees")
}

enum GuaranteeType {
  INITIAL   // تأمين ابتدائي
  FINAL     // تأمين نهائي
}

enum GuaranteePaymentMethod {
  BANK_GUARANTEE      // خطاب ضمان
  CASH                // سداد نقدي
  DEDUCTION_FROM_DUES // خصماً من المستحقات
}

enum GuaranteeStatus {
  ACTIVE              // ساري
  EXPIRING_SOON       // قرب الانتهاء
  EXPIRED             // منتهي
  RECOVERY_REQUESTED  // تم طلب الاسترداد
  RECOVERED           // تم الاسترداد
}

// تنبيهات التأمين
model GuaranteeNotification {
  id           String   @id @default(cuid())
  guaranteeId  String
  daysBefore   Int      // 30, 15, 10, 5
  sentAt       DateTime?
  isSent       Boolean  @default(false)

  guarantee    Guarantee @relation(fields: [guaranteeId], references: [id])

  @@map("guarantee_notifications")
}
```

### 📝 Submissions + Openings + Grievance + Award

```prisma
// =============================================
// SUBMISSION — تقديم العملية
// =============================================

model Submission {
  id             String   @id @default(cuid())
  operationId    String
  companyId      String
  submissionDate DateTime
  receiptNumber  String
  receiptPath    String?  // صورة الإيصال
  notes          String?
  createdAt      DateTime @default(now())

  operation      Operation @relation(fields: [operationId], references: [id])

  @@map("submissions")
}

// =============================================
// TECHNICAL OPENING — الفتح الفني
// =============================================

model TechnicalOpening {
  id          String              @id @default(cuid())
  operationId String
  companyId   String
  result      TechnicalResult
  reason      String?             // سبب الرفض
  openingDate DateTime?
  notes       String?
  createdAt   DateTime            @default(now())

  operation   Operation           @relation(fields: [operationId], references: [id])

  @@map("technical_openings")
}

enum TechnicalResult {
  ACCEPTED
  REJECTED
}

// =============================================
// GRIEVANCE — التظلم
// =============================================

model Grievance {
  id              String          @id @default(cuid())
  operationId     String
  companyId       String
  grievanceType   GrievanceTarget
  filingDate      DateTime
  deadlineDate    DateTime        // حسب النوع: 7 أو 15 يوم
  reason          String          @db.Text
  hashCode        String?         @unique // Hash 32 حرف
  status          GrievanceStatus @default(PENDING)
  printApproved   Boolean         @default(false)
  approvedBy      String?
  approvedAt      DateTime?
  documentPath    String?
  notes           String?
  createdAt       DateTime        @default(now())

  operation       Operation       @relation(fields: [operationId], references: [id])

  @@map("grievances")
}

enum GrievanceTarget {
  AUTHORITY       // تظلم للجهة — 7 أيام
  TRIBUNAL        // تظلم للهيئة — 15 يوم
}

enum GrievanceStatus {
  PENDING
  APPROVED
  FILED
  RESOLVED
  REJECTED
}

// =============================================
// FINANCIAL OPENING — الفتح المالي
// =============================================

model FinancialOpening {
  id          String   @id @default(cuid())
  operationId String
  openingDate DateTime?
  notes       String?
  createdAt   DateTime @default(now())

  operation   Operation @relation(fields: [operationId], references: [id])
  competitors Competitor[]

  @@map("financial_openings")
}

model Competitor {
  id                 String           @id @default(cuid())
  financialOpeningId String
  competitorName     String
  price              Decimal          @db.Decimal(15, 2)
  rank               Int?
  isOwnCompany       Boolean          @default(false) // هل شركتنا؟
  companyId          String?          // لو شركتنا
  notes              String?

  financialOpening   FinancialOpening @relation(fields: [financialOpeningId], references: [id])

  @@map("competitors")
}

// =============================================
// AWARD — الترسية
// =============================================

model Award {
  id          String   @id @default(cuid())
  operationId String
  winnerName  String
  winnerPrice Decimal  @db.Decimal(15, 2)
  isOurCompany Boolean @default(false)
  companyId   String?
  awardDate   DateTime?
  notes       String?
  createdAt   DateTime @default(now())

  operation   Operation @relation(fields: [operationId], references: [id])

  @@map("awards")
}
```

### 📦 Supply + Inventory + Suppliers

```prisma
// =============================================
// SUPPLY ORDER — أمر التوريد
// =============================================

model SupplyOrder {
  id          String   @id @default(cuid())
  operationId String
  companyId   String
  orderNumber String
  orderDate   DateTime
  filePath    String?  // رفع أمر التوريد
  notes       String?
  createdAt   DateTime @default(now())

  operation   Operation @relation(fields: [operationId], references: [id])
  goodsReceipts GoodsReceipt[]

  @@map("supply_orders")
}

// إذن الإضافة (التوريد الفعلي)
model GoodsReceipt {
  id            String     @id @default(cuid())
  supplyOrderId String
  receiptNumber String
  receiptDate   DateTime
  notes         String?
  createdAt     DateTime   @default(now())

  supplyOrder   SupplyOrder @relation(fields: [supplyOrderId], references: [id])
  items         GoodsReceiptItem[]

  @@map("goods_receipts")
}

model GoodsReceiptItem {
  id             String       @id @default(cuid())
  goodsReceiptId String
  productId      String?
  itemName       String
  unit           String
  quantity       Decimal      @db.Decimal(15, 3)
  unitPrice      Decimal      @db.Decimal(15, 2)
  totalPrice     Decimal      @db.Decimal(15, 2)

  goodsReceipt   GoodsReceipt @relation(fields: [goodsReceiptId], references: [id])
  product        Product?     @relation(fields: [productId], references: [id])

  @@map("goods_receipt_items")
}

// =============================================
// SUPPLIERS — الموردين
// =============================================

model Supplier {
  id          String   @id @default(cuid())
  name        String
  phone       String?
  telegram    String?
  email       String?
  address     String?
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  purchases   Purchase[]

  @@map("suppliers")
}

// =============================================
// PURCHASES — المشتريات
// =============================================

model Purchase {
  id          String        @id @default(cuid())
  operationId String?
  supplierId  String
  totalAmount Decimal       @db.Decimal(15, 2)
  paidAmount  Decimal       @default(0) @db.Decimal(15, 2)
  remaining   Decimal       @default(0) @db.Decimal(15, 2)
  status      PaymentStatus @default(UNPAID)
  description String?
  notes       String?       @db.Text
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  operation   Operation?    @relation(fields: [operationId], references: [id])
  supplier    Supplier      @relation(fields: [supplierId], references: [id])
  payments    SupplierPayment[]

  @@map("purchases")
}

model SupplierPayment {
  id            String   @id @default(cuid())
  purchaseId    String
  amount        Decimal  @db.Decimal(15, 2)
  paymentDate   DateTime
  paymentMethod String?
  receiptPath   String?
  notes         String?
  notifySent    Boolean  @default(false)
  createdAt     DateTime @default(now())

  purchase      Purchase @relation(fields: [purchaseId], references: [id])

  @@map("supplier_payments")
}

enum PaymentStatus {
  UNPAID          // 🔴
  PARTIALLY_PAID  // 🟡
  PAID            // 🟢
}

// =============================================
// INVENTORY — المخازن
// =============================================

model Product {
  id          String   @id @default(cuid())
  name        String
  sku         String?  @unique
  unit        String
  category    String?
  minStock    Int      @default(0)
  currentStock Decimal @default(0) @db.Decimal(15, 3)
  buyPrice    Decimal  @default(0) @db.Decimal(15, 2)
  sellPrice   Decimal  @default(0) @db.Decimal(15, 2)
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  movements   StockMovement[]
  goodsReceiptItems GoodsReceiptItem[]

  @@map("products")
}

model StockMovement {
  id          String        @id @default(cuid())
  productId   String
  type        MovementType
  quantity    Decimal       @db.Decimal(15, 3)
  unitPrice   Decimal?      @db.Decimal(15, 2)
  totalPrice  Decimal?      @db.Decimal(15, 2)
  reference   String?       // رقم الإذن أو الفاتورة
  operationId String?
  notes       String?
  createdAt   DateTime      @default(now())

  product     Product       @relation(fields: [productId], references: [id])

  @@map("stock_movements")
}

enum MovementType {
  IN    // وارد
  OUT   // صادر
  SALE  // بيع
}
```

### 👷 Employees + Advances + Visits

```prisma
// =============================================
// EMPLOYEES — العاملين
// =============================================

model Employee {
  id          String   @id @default(cuid())
  name        String
  title       String?
  department  String?
  phone       String?
  telegram    String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  advances    EmployeeAdvance[]
  visits      Visit[]

  @@map("employees")
}

model EmployeeAdvance {
  id          String        @id @default(cuid())
  employeeId  String
  amount      Decimal       @db.Decimal(15, 2)
  paidBack    Decimal       @default(0) @db.Decimal(15, 2)
  remaining   Decimal       @default(0) @db.Decimal(15, 2)
  reason      String?
  advanceDate DateTime
  status      PaymentStatus @default(UNPAID)
  notes       String?
  createdAt   DateTime      @default(now())

  employee    Employee      @relation(fields: [employeeId], references: [id])

  @@map("employee_advances")
}

model Visit {
  id          String   @id @default(cuid())
  employeeId  String
  operationId String?
  visitDate   DateTime
  location    String?
  purpose     String?
  expenses    Decimal  @default(0) @db.Decimal(15, 2)
  isPaid      Boolean  @default(false)
  notes       String?
  createdAt   DateTime @default(now())

  employee    Employee @relation(fields: [employeeId], references: [id])

  @@map("visits")
}
```

### 💰 Finance — المالية

```prisma
// =============================================
// CERTIFICATES — المستخلصات
// =============================================

model Certificate {
  id              String   @id @default(cuid())
  operationId     String
  companyId       String
  certificateNo   Int
  grossAmount     Decimal  @db.Decimal(15, 2)
  taxDeduction    Decimal  @default(0) @db.Decimal(15, 2)  // 1% أ.ت.ص
  vatAmount       Decimal  @default(0) @db.Decimal(15, 2)  // 14%
  performanceBond Decimal  @default(0) @db.Decimal(15, 2)  // 5% ضمان أعمال
  netAmount       Decimal  @default(0) @db.Decimal(15, 2)
  certificateDate DateTime?
  notes           String?
  createdAt       DateTime @default(now())

  operation       Operation @relation(fields: [operationId], references: [id])

  @@map("certificates")
}

// =============================================
// OPERATION FINANCE — ملخص مالي للعملية
// =============================================

model OperationFinance {
  id              String   @id @default(cuid())
  operationId     String   @unique
  totalCost       Decimal  @default(0) @db.Decimal(15, 2) // التكلفة الفعلية
  totalRevenue    Decimal  @default(0) @db.Decimal(15, 2) // الإيراد
  netProfit       Decimal  @default(0) @db.Decimal(15, 2) // صافي الربح
  finalReceiptDate DateTime? // تاريخ الاستلام النهائي
  insuranceRecoveryDate DateTime? // تاريخ استرداد التأمين (60 يوم)
  isClosed        Boolean  @default(false)
  closedAt        DateTime?
  notes           String?  @db.Text
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  operation       Operation @relation(fields: [operationId], references: [id])

  @@map("operation_finances")
}
```

### 📄 Documents + Approvals + Printing

```prisma
// =============================================
// DOCUMENTS — المستندات والأرشيف
// =============================================

model Document {
  id          String   @id @default(cuid())
  operationId String?
  companyId   String?
  type        String   // نوع المستند
  title       String
  fileName    String
  filePath    String   // نوع_المستند_رقم_العملية_الشركة_التاريخ.pdf
  fileSize    Int?
  hashCode    String?  // Hash 32 حرف
  uploadedBy  String?
  createdAt   DateTime @default(now())

  versions    DocumentVersion[]
  prints      DocumentPrint[]

  @@map("documents")
}

model DocumentVersion {
  id          String   @id @default(cuid())
  documentId  String
  version     Int
  filePath    String
  changedBy   String?
  changeNotes String?
  createdAt   DateTime @default(now())

  document    Document @relation(fields: [documentId], references: [id])

  @@map("document_versions")
}

model DocumentPrint {
  id          String   @id @default(cuid())
  documentId  String
  printedBy   String
  copies      Int      @default(1)
  approved    Boolean  @default(false)
  approvedBy  String?
  approvedAt  DateTime?
  screenshotPath String? // تصوير قبل الطباعة
  pdfCopyPath    String? // نسخة PDF أصلية
  printedAt   DateTime @default(now())

  document    Document @relation(fields: [documentId], references: [id])

  @@map("document_prints")
}

// =============================================
// APPROVALS — الموافقات
// =============================================

model Approval {
  id          String         @id @default(cuid())
  type        ApprovalType
  entityType  String         // grievance, guarantee, document
  entityId    String
  requestedBy String
  requestedAt DateTime       @default(now())
  status      ApprovalStatus @default(PENDING)
  approvedBy  String?
  approvedAt  DateTime?
  method      String?        // telegram, system
  notes       String?

  approver    User?          @relation(fields: [approvedBy], references: [id])

  @@map("approvals")
}

enum ApprovalType {
  PRINT_GRIEVANCE
  PRINT_GUARANTEE
  PRINT_DOCUMENT
  DELETE_OPERATION
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  ESCALATED // اتحول للنائب
}
```

### 🔒 Security + Audit + Notifications

```prisma
// =============================================
// AUDIT LOG — سجل الحركات
// =============================================

model AuditLog {
  id          String   @id @default(cuid())
  userId      String
  action      String   // CREATE, UPDATE, DELETE, PRINT, LOGIN, LOGOUT
  entityType  String   // operation, guarantee, document...
  entityId    String?
  details     String?  @db.Text // JSON with old/new values
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([entityType, entityId])
  @@index([createdAt])
  @@map("audit_logs")
}

// =============================================
// LOGIN ATTEMPTS — محاولات الدخول
// =============================================

model LoginAttempt {
  id          String   @id @default(cuid())
  userId      String?
  username    String
  success     Boolean
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  user        User?    @relation(fields: [userId], references: [id])

  @@map("login_attempts")
}

// =============================================
// NOTIFICATIONS — التنبيهات
// =============================================

model Notification {
  id          String             @id @default(cuid())
  type        NotificationType
  title       String
  message     String             @db.Text
  entityType  String?
  entityId    String?
  recipientId String?
  channel     NotificationChannel
  isSent      Boolean            @default(false)
  sentAt      DateTime?
  isRead      Boolean            @default(false)
  readAt      DateTime?
  scheduledAt DateTime?
  createdAt   DateTime           @default(now())

  @@index([recipientId, isRead])
  @@map("notifications")
}

enum NotificationType {
  DEADLINE_REMINDER       // تنبيه ميعاد
  GUARANTEE_EXPIRY        // تأمين قرب الانتهاء
  APPROVAL_REQUEST        // طلب موافقة
  SECURITY_ALERT          // تنبيه أمني
  PAYMENT_NOTIFICATION    // إشعار دفعة
  OPERATION_UPDATE        // تحديث عملية
  INSURANCE_RECOVERY      // استرداد تأمين
}

enum NotificationChannel {
  SYSTEM
  TELEGRAM
  EMAIL
}

// =============================================
// SYSTEM SETTINGS — إعدادات النظام
// =============================================

model SystemSetting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String   @db.Text
  type      String   @default("string") // string, number, boolean, json
  label     String?
  group     String?  // general, tax, notifications, etc
  updatedAt DateTime @updatedAt

  @@map("system_settings")
}

// =============================================
// RADAR — الرادار
// =============================================

model RadarSource {
  id          String   @id @default(cuid())
  name        String
  url         String
  isActive    Boolean  @default(true)
  lastFetched DateTime?
  createdAt   DateTime @default(now())

  items       RadarItem[]

  @@map("radar_sources")
}

model RadarItem {
  id              String      @id @default(cuid())
  sourceId        String
  externalId      String?     // رقم العملية في الموقع
  title           String
  authority       String?
  tenderType      String?
  governorate     String?
  category        String?
  publicationDate DateTime?
  deadline        DateTime?
  sourceUrl       String?
  isImported      Boolean     @default(false) // تم إضافتها كعملية
  operationId     String?     // مرتبطة بعملية
  rawData         String?     @db.Text // JSON
  createdAt       DateTime    @default(now())

  source          RadarSource @relation(fields: [sourceId], references: [id])

  @@map("radar_items")
}
```

---

## 🗓️ 4. الخطة الزمنية — 20 أسبوع

> **المعدل: يومين في الأسبوع × 5-6 ساعات = 10-12 ساعة/أسبوع**

```mermaid
gantt
    title GoldenERP V1.0 Development Timeline
    dateFormat  YYYY-MM-DD
    axisFormat  %b %d

    section Foundation
    Project Setup           :w1, 2026-10-04, 7d
    Auth + RBAC             :w2, after w1, 7d
    Companies               :w3, after w2, 7d
    Operations Core         :w4, after w3, 7d

    section Core ERP
    Operation Details       :w5, after w4, 7d
    Radar                   :w6, after w5, 7d
    Previous Works + Tech   :w7, after w6, 7d
    Financial Offer         :w8, after w7, 7d

    section Operational
    Guarantees              :w9, after w8, 7d
    Submission + Opening    :w10, after w9, 7d
    Award + Supply          :w11, after w10, 7d
    Suppliers + Inventory   :w12, after w11, 7d

    section Business V1
    Employees + Finance     :w13, after w12, 7d
    Reports Center          :w14, after w13, 7d
    Printing + Approvals    :w15, after w14, 7d
    Documents + Archive     :w16, after w15, 7d

    section Production
    Security + Audit        :w17, after w16, 7d
    Dashboard               :w18, after w17, 7d
    Testing                 :w19, after w18, 7d
    Deployment              :w20, after w19, 7d
```

### Milestones المهمة

| بعد أسبوع | عندك | الوصف |
|---|---|---|
| **4** | Foundation MVP | Login + Companies + Operations + Codes |
| **8** | Core ERP | + Radar + Offers + Previous Works |
| **12** | Operational ERP | + Guarantees + Supply + Inventory |
| **16** | Business V1 | + Reports + Printing + Telegram |
| **20** | Production V1 | + Security + Testing + Deployment |

---

## 📅 5. تفصيل كل Sprint

### 🔵 WEEK 1 — Project Setup + Database Foundation

#### DAY 1 — Project Architecture
```
الخطوات:
├── 1. إنشاء مجلد goldenerp/
├── 2. npx create-next-app@latest frontend/ (TypeScript + Tailwind + App Router)
├── 3. nest new backend
├── 4. git init + .gitignore + README
├── 5. إعداد ESLint + Prettier
├── 6. إنشاء .env.example
└── 7. تثبيت Packages الأساسية

Frontend packages:
  - axios, zustand, react-hook-form, zod
  - @tanstack/react-table, date-fns
  - lucide-react (icons)

Backend packages:
  - @nestjs/config, @nestjs/jwt, @nestjs/passport
  - prisma, @prisma/client
  - argon2, class-validator, class-transformer

Deliverable: مشروع شغال بـ npm run dev على الجانبين
```

#### DAY 2 — Database + Core Schema
```
الخطوات:
├── 1. تثبيت MySQL على Windows
├── 2. إنشاء database: goldenerp_dev
├── 3. إعداد Prisma: npx prisma init
├── 4. كتابة Core Models:
│   ├── User, Permission, UserPermission
│   ├── Company, CompanyDocument, AuthorizedPerson
│   └── SystemSetting
├── 5. npx prisma migrate dev --name init
├── 6. كتابة Seed script بـ بيانات تجريبية
└── 7. اختبار الاتصال

Deliverable: Database + Models + Migration شغالة
```

---

### 🟢 WEEK 2 — Authentication + Users

#### DAY 3 — Auth System
```
Backend:
├── POST /auth/login
│   ├── Validate credentials
│   ├── Check isLocked (3 failed = locked)
│   ├── Reset failedAttempts on success
│   ├── Generate JWT Access + Refresh Token
│   └── Log LoginAttempt
├── POST /auth/refresh
├── POST /auth/logout
├── GET  /auth/me
└── Guards: JwtAuthGuard, RolesGuard

Frontend:
├── Login page (تصميم احترافي)
├── Auth context/store (Zustand)
├── Protected routes
└── Auto-redirect

Deliverable: Login كامل مع JWT + حماية الصفحات
```

#### DAY 4 — RBAC + Users Management
```
Backend:
├── Permission system
│   ├── operation.create, operation.edit, operation.view
│   ├── document.print, approval.manage
│   ├── company.manage, report.view
│   └── ... (كل module وله permissions)
├── @Permissions() decorator
├── PermissionsGuard
└── Users CRUD (للمدير فقط)

Frontend:
├── Users list page
├── Create/Edit user form
├── Role assignment
└── Permission management

Deliverable: RBAC كامل + إدارة مستخدمين
```

---

### 🟡 WEEK 3 — Companies

#### DAY 5 — Company Management
```
Backend:
├── CRUD: /companies
├── Upload: logo, documents
├── Validation: code unique (A, B, C, D)
└── File storage: /uploads/companies/{companyId}/

Frontend:
├── Companies list
├── Company card/profile
├── Create/Edit company form
│   ├── الاسم + الكود
│   ├── السجل التجاري + البطاقة الضريبية
│   ├── الترخيص + العنوان
│   ├── الإيميل + الفاكس
│   ├── اللوجو
│   └── بيانات البنك
└── Upload documents (drag & drop)

Deliverable: إدارة 4 شركات كاملة
```

#### DAY 6 — Documents + Authorized Persons
```
Backend:
├── CompanyDocuments CRUD
│   ├── Upload PDF/Image
│   ├── Type: سجل / ضريبية / ترخيص / ختم / توقيع
│   └── Metadata storage
├── AuthorizedPersons CRUD
│   ├── الاسم + الصفة + الرقم القومي
│   └── التوقيع
└── File preview endpoint

Frontend:
├── Documents tab في Company profile
├── Upload interface
├── Document preview (PDF viewer)
├── Authorized persons list
└── Add/Edit authorized person form

Deliverable: كل شركة لها Profile + مستندات + مفوضين
```

---

### 🔵 WEEK 4 — Operation Core

#### DAY 7 — Operations CRUD
```
Backend:
├── CRUD: /operations
├── Auto-generate serialNumber
├── Filter: status, type, company, authority
├── Search: by code, name, authority, externalNumber
└── Pagination + sorting

Frontend:
├── Operations list (جدول)
│   ├── الكود | العملية | الجهة | النوع | الحالة
│   └── Filters + Search
├── Create operation form
│   ├── اسم العملية
│   ├── الجهة
│   ├── رقم العملية الخارجي
│   ├── نوع الطرح (مناقصة/ممارسة/مزاد/أمر مباشر)
│   └── اختيار الشركات المقدمة
└── Operation status badges

Deliverable: إنشاء + عرض + بحث عمليات
```

#### DAY 8 — Operation Code System
```
Backend:
├── OperationCompany creation
│   ├── displayCode = companyCode + serialNumber → "A1"
│   ├── Auto-increment per company
│   └── Unique constraint
├── Code locking logic
│   └── بعد سحب الكراسة: isCodeLocked = true
├── Smart Search
│   ├── البحث بـ "A15" → Operation #15, Company A
│   ├── البحث بـ رقم خارجي
│   ├── البحث بـ اسم الجهة
│   └── البحث بـ اسم العملية
└── Soft delete / Archive
    ├── ACTIVE → CANCELLED → ARCHIVED
    └── Hard delete ممنوع بعد سحب الكراسة

Frontend:
├── Operation code display في كل مكان
├── Global search bar
│   └── اكتب A15 → تفتح العملية
├── Multi-company selection في الإنشاء
└── Code badge في الطباعة

Deliverable: نظام الأكواد + البحث الذكي
```

---

### 🟣 WEEK 5 — Operation Details

#### DAY 9 — Operation Dashboard
```
Frontend:
├── Operation detail page (tabs/accordion)
│   ├── Overview — البيانات الأساسية
│   ├── Companies — الشركات المقدمة
│   ├── Dates — التواريخ الحرجة
│   ├── Contacts — جهات الاتصال في الجهة
│   ├── Documents — كراسة الشروط + مستندات
│   ├── Technical — العرض الفني
│   ├── Financial — العرض المالي
│   ├── Guarantees — التأمينات
│   ├── Submission — التقديم
│   ├── Opening — الفتح الفني + المالي
│   ├── Grievance — التظلم
│   ├── Award — الترسية
│   ├── Supply — التوريد
│   ├── Payments — المدفوعات
│   ├── Certificates — المستخلصات
│   ├── Finance — الملخص المالي
│   └── Archive — الأرشيف
└── Status timeline/stepper

Deliverable: صفحة تفاصيل العملية الكاملة
```

#### DAY 10 — Critical Dates + Notifications
```
Backend:
├── OperationDates CRUD
├── Scheduler: cron job كل ساعة
│   ├── يفحص التواريخ القادمة
│   ├── قبل 48 ساعة → تنبيه
│   ├── قبل 24 ساعة → تنبيه عاجل
│   └── يسجل الإشعار في DB
├── Notification service
│   ├── System notification
│   └── Telegram notification (لاحقاً)
└── OperationContacts CRUD

Frontend:
├── Dates form في العملية
├── Calendar view (اختياري)
├── Notification bell + dropdown
├── Contact list في العملية
└── Countdown timer للتواريخ الحرجة

Deliverable: التواريخ + التنبيهات الأساسية
```

---

### 🟠 WEEK 6 — Radar

#### DAY 11 — Radar Architecture
```
Backend:
├── RadarSource model + CRUD
├── RadarItem model
├── Radar service
│   ├── Interface: RadarSourceAdapter
│   │   └── fetch(): Promise<RadarItem[]>
│   ├── Adapter للموقع المحدد
│   │   ├── HTTP fetch
│   │   ├── HTML parsing (cheerio)
│   │   └── أو Playwright لو JavaScript
│   └── Normalizer: يوحد البيانات
├── Scheduler: يسحب كل ساعة/يوم
└── Import to Operation

⚠️ ملاحظة: لازم نحدد اسم الموقع قبل التنفيذ

Deliverable: Architecture + Proof of Concept
```

#### DAY 12 — Radar UI + Filters
```
Frontend:
├── Radar page
│   ├── آخر تحديث
│   ├── عدد الفرص الجديدة
│   └── زر "تحديث الآن"
├── Filters
│   ├── النشاط / التصنيف
│   ├── المحافظة
│   ├── النوع (مناقصة/ممارسة/...)
│   └── التاريخ
├── Radar items list
│   ├── عنوان العملية
│   ├── الجهة
│   ├── آخر موعد
│   ├── النوع
│   └── [إضافة كعملية] button
└── Import flow: Radar → Create Operation

Deliverable: رادار شغال على موقع واحد
```

---

### 🟤 WEEK 7 — Previous Works + Technical Offer

#### DAY 13 — Previous Works (سابقات الأعمال)
```
Backend:
├── PreviousWorks CRUD
│   ├── Upload PDF (أوامر توريد / عقود / شهادات)
│   ├── Category tagging (كاوتش، نظافة، أكياس...)
│   ├── Company-specific (كل شركة تشوف ملفاتها بس)
│   └── Auto-add: بعد إغلاق عملية ناجحة → تضاف كسابقة
├── Search by category
└── Filter by company + type + year

Frontend:
├── Previous works library per company
├── Upload interface مع تصنيف
├── Category management
├── Search + filter
└── Preview PDF

Deliverable: مكتبة سابقات الأعمال لكل شركة
```

#### DAY 14 — Technical Offer Builder
```
Backend:
├── TechnicalOffer CRUD
├── Auto-search: نوع العملية → category → previous works
├── Selection: المستخدم يحدد أي سابقات يضمها
└── Generate package: compile selected PDFs

Frontend:
├── Technical offer builder في صفحة العملية
│   ├── عرض سابقات الأعمال المناسبة أوتوماتيك
│   ├── Checkbox لاختيار السابقات
│   ├── Drag & drop لترتيب المستندات
│   └── Preview
├── لكل شركة: builder منفصل
└── Generate Technical Package button

Deliverable: بناء العرض الفني من سابقات الأعمال
```

---

### 🔵 WEEK 8 — Financial Offer

#### DAY 15 — Financial Items
```
Backend:
├── FinancialOffer CRUD
├── FinancialOfferItem CRUD
│   ├── Item name, description, unit
│   ├── Quantity × Unit Price = Total
│   └── Auto-calculate subtotal
├── VAT calculation (configurable rate)
├── Grand total
└── Amount in Arabic words (تحويل أرقام لحروف)

Frontend:
├── Financial offer table في صفحة العملية
│   ├── إضافة/حذف/تعديل أصناف
│   ├── Auto-calculate per row
│   └── Auto-calculate totals
├── Summary section
│   ├── الإجمالي
│   ├── القيمة المضافة 14%
│   ├── الإجمالي الشامل
│   └── المبلغ بالحروف
└── Per company: عرض مالي منفصل

Deliverable: العرض المالي الكامل مع الحسابات
```

#### DAY 16 — Anti-Collusion + PDF
```
Backend:
├── Anti-collusion check
│   ├── لو مقدم بأكثر من شركة:
│   │   ├── يقترح فروق أسعار +1% / -1.5%
│   │   └── اختلاف مدة التنفيذ
│   └── تحذير: تطابق العروض = حرمان (مادة 76)
├── PDF generation
│   ├── Financial offer PDF
│   └── Template-based generation
└── Print preview

Frontend:
├── Anti-collusion warnings/suggestions
├── PDF preview modal
└── Print button

Deliverable: منع التواطؤ + طباعة العرض المالي
```

---

### 🟢 WEEK 9 — Guarantees

#### DAY 17 — Initial Guarantee
```
Backend:
├── Guarantee CRUD
├── Initial guarantee
│   ├── Amount: 1% أو 2% من الكراسة
│   ├── Duration: 90 يوم
│   └── Payment method: bank / cash / deduction
├── Bank guarantee fields
│   ├── Bank, Branch, Guarantee Number
│   ├── Issue Date, Start Date, End Date
│   └── Amount
├── Cash fields
│   ├── Amount, Payment Date, Receipt Number
│   └── Treasury
├── Deduction fields
│   └── Amount, Deduction Date
└── Generate guarantee letter PDF

Frontend:
├── Guarantees section في العملية
├── Add guarantee form
│   ├── Type: ابتدائي/نهائي
│   ├── Payment method selector
│   └── Dynamic fields حسب النوع
├── Guarantee card view
└── Print guarantee letter

Deliverable: التأمين الابتدائي كامل
```

#### DAY 18 — Final Guarantee + Recovery
```
Backend:
├── Final guarantee
│   ├── Amount: 5% من قيمة العقد
│   ├── Duration + Start/End dates
│   └── Expiry notifications: 30, 15, 10, 5 أيام
├── Recovery workflow
│   ├── Step 1: جواب الاسترداد (تاريخ + ملف)
│   ├── Step 2: أمر الدفع (تاريخ + ملف)
│   ├── Step 3: الاسترداد الفعلي (تاريخ + مسلم لمين + ملف)
│   └── Status: Active → Recovery Requested → Recovered
├── Scheduler: تنبيهات قبل الانتهاء
│   ├── 30 يوم: "جهز خطاب الاسترداد"
│   ├── 15 يوم: "عاجل: التأمين ينتهي قريباً"
│   ├── 10 أيام: تنبيه
│   └── 5 أيام: تنبيه أخير
└── Recovery letter PDF (مع بيانات الشركة + رقم الحساب)

Frontend:
├── Final guarantee form
├── Recovery steps UI (stepper)
│   ├── خطاب الاسترداد
│   ├── أمر الدفع
│   └── الاسترداد الفعلي
├── Upload sections لكل خطوة
├── Status badges (ساري / قرب الانتهاء / مسترد)
└── Countdown timer

Deliverable: التأمين النهائي + الاسترداد + التنبيهات
```

---

### 🟡 WEEK 10 — Submission + Opening + Grievance

#### DAY 19 — Submission + Smart Cover
```
Backend:
├── Submission CRUD
│   ├── تاريخ التقديم
│   ├── رقم إيصال سحب الكراسة
│   ├── رفع صورة الإيصال
│   └── لكل شركة: إيصال منفصل
├── Smart Cover (الغلاف الذكي)
│   ├── PDF generation
│   ├── بيانات: الجهة + رقم العملية + نوع العملية + بيانات الشركة
│   └── Header: نفس البيانات تنزل في كل ورقة
└── Booklet download
    └── حفظ باسم: كراسة_رقم_العملية.pdf

Frontend:
├── Submission form لكل شركة
├── Receipt upload
├── Smart Cover preview + print
└── Download booklet

Deliverable: التقديم + الغلاف الذكي
```

#### DAY 20 — Technical Opening + Grievance
```
Backend:
├── TechnicalOpening CRUD
│   ├── النتيجة لكل شركة: مقبول / مرفوض
│   └── سبب الرفض
├── Grievance CRUD
│   ├── بيانات ثابتة (6): من Company + AuthorizedPerson
│   ├── بيانات العملية
│   ├── Hash code 32 حرف (crypto.randomBytes)
│   ├── ممنوع الطباعة إلا بموافقة المدير (Approval)
│   └── Deadline حسب النوع: 7 أو 15 يوم
├── Grievance countdown
│   └── عد تنازلي باليوم والساعة
├── Duplicate copies: نسخة للتسليم + نسخة للجهة
└── Approval workflow (مبدئي: system-based)

Frontend:
├── Technical opening results per company
├── Grievance form
├── Print approval request
├── Countdown timer للتظلم
├── Hash display
└── Dual-copy print option

Deliverable: الفتح الفني + التظلم + العد التنازلي
```

---

### 🟣 WEEK 11 — Financial Opening + Award + Supply

#### DAY 21 — Financial Opening
```
Backend:
├── FinancialOpening CRUD
├── Competitors CRUD
│   ├── اسم المنافس + السعر
│   ├── ترتيب شركتك
│   ├── ترتيب باقي شركاتك
│   └── isOwnCompany flag
└── Notification: تنبيه قبل الجلسة بـ 24 ساعة

Frontend:
├── Financial opening form
├── Competitors table
│   ├── المنافس | السعر | الترتيب | شركتنا؟
│   └── Auto-sort by price
├── Rankings highlight
└── Notification before session

Deliverable: الفتح المالي + تسجيل المنافسين
```

#### DAY 22 — Award + Supply Order
```
Backend:
├── Award CRUD
│   ├── الشركة الفائزة + السعر
│   ├── لو شركتنا: isOurCompany = true
│   └── Auto-lock losing companies
├── SupplyOrder CRUD
│   ├── رقم + تاريخ الأمر
│   ├── رفع أمر التوريد (PDF)
│   └── ربط بالعملية
└── Auto-add supply order كـ Previous Work

Frontend:
├── Award form
├── Auto-lock indicator للشركات الخاسرة
├── Supply order form
└── Upload supply order document

Deliverable: الترسية + أمر التوريد
```

---

### 🟠 WEEK 12 — Suppliers + Inventory

#### DAY 23 — Suppliers + Purchases + Payments
```
Backend:
├── Suppliers CRUD
├── Purchases CRUD
│   ├── المورد + المبلغ + الوصف
│   ├── ربط بالعملية
│   └── Auto-calculate remaining
├── SupplierPayments CRUD
│   ├── المبلغ + التاريخ + الإيصال
│   ├── Auto-update purchase remaining
│   ├── Auto-update status: UNPAID → PARTIAL → PAID
│   └── Telegram notification للمورد
└── Status indicators: 🔴 🟡 🟢

Frontend:
├── Suppliers list
├── Supplier profile + purchases history
├── Purchase form (linked to operation)
├── Payment recording
├── Status badges
└── Payment history per purchase

Deliverable: الموردين + المشتريات + المدفوعات
```

#### DAY 24 — Inventory
```
Backend:
├── Products CRUD
├── StockMovement CRUD
│   ├── IN: من GoodsReceipt
│   ├── OUT: صرف
│   └── SALE: بيع
├── Auto-update stock from GoodsReceipt
│   └── إذن الإضافة → يحدث المخزون تلقائياً
├── Stock calculations
│   ├── Current stock
│   ├── Min stock alert
│   └── Stock value
└── GoodsReceipt CRUD (إذن الإضافة)

Frontend:
├── Products list + categories
├── Product card: اسم / وحدة / رصيد / سعر شراء / سعر بيع
├── Stock movements history
├── Add goods receipt (from supply order)
├── Low stock alerts
└── Stock summary: إجمالي المخزون / المباع / الناقص

Deliverable: المخازن + حركة المخزون
```

---

### 🔵 WEEK 13 — Employees + Finance

#### DAY 25 — Employees + Advances + Visits
```
Backend:
├── Employees CRUD
├── EmployeeAdvances CRUD
│   ├── المبلغ + التاريخ + السبب
│   ├── تسديد السلفة (جزئي/كامل)
│   └── Status: UNPAID → PARTIAL → PAID
├── Visits CRUD
│   ├── الموظف + العملية + التاريخ
│   ├── الغرض + الموقع
│   ├── المصاريف
│   └── حالة الدفع
└── Telegram notification

Frontend:
├── Employees list
├── Employee profile
├── Advances tab: add/pay/history
├── Visits tab: add/view
└── Expenses summary

Deliverable: العاملين + السلف + الزيارات
```

#### DAY 26 — Certificates + Operation Finance
```
Backend:
├── Certificates CRUD
│   ├── Auto-deduct: 1% أ.ت.ص
│   ├── Auto-deduct: 14% قيمة مضافة
│   ├── Auto-deduct: 5% ضمان أعمال
│   └── Net amount
│   ⚠️ النسب configurable من SystemSettings
├── OperationFinance
│   ├── إجمالي التكلفة
│   ├── إجمالي الإيراد
│   ├── صافي الربح
│   └── تاريخ الاستلام النهائي
├── Close operation
│   └── بعد الاستلام النهائي
└── Insurance recovery countdown
    └── 60 يوم من تاريخ الاستلام → تنبيه في يوم 50

Frontend:
├── Certificates form + list
├── Auto-calculation preview
├── Operation finance summary
├── Close operation button
└── Profit display

Deliverable: المستخلصات + الملخص المالي + قفلة العملية
```

---

### 🟢 WEEK 14 — Reports Center

#### DAY 27 — Reports Engine
```
Backend:
├── Reports service
│   ├── Operations reports
│   │   ├── كل العمليات
│   │   ├── عمليات شركة معينة
│   │   ├── حسب التاريخ / الحالة / الجهة / النوع
│   │   └── عملية كاملة (full operation report)
│   ├── Guarantees reports
│   │   ├── التأمين الابتدائي
│   │   ├── التأمين النهائي
│   │   ├── المسترد / غير المسترد / المنتهي / قرب الانتهاء
│   │   └── المدفوع بتاريخ + الجهة + المبالغ + الإجمالي
│   ├── Inventory reports
│   │   ├── إجمالي المخزون / الناقص / الأصناف المباعة
│   │   ├── المشتريات / المبيعات
│   │   ├── إجمالي التكلفة / إجمالي البيع / صافي الربح
│   │   └── "شاريين بكام وبعنا بكام"
│   ├── Suppliers reports
│   │   ├── إجمالي مشتريات المورد
│   │   ├── المدفوع / المتبقي / آخر دفعة / حالة الحساب
│   │   └── Report per supplier
│   ├── Employees reports
│   │   └── السلف / الزيارات / المصروفات
│   └── Full operation report
│       └── كل تاريخ العملية من البداية للنهاية
├── Filters: company, date range, status, type
└── Export: PDF + Excel

Frontend:
├── Reports center page
│   ├── تقارير العمليات
│   ├── تقارير التأمينات
│   ├── تقارير المخازن
│   ├── تقارير الموردين
│   └── تقارير الموظفين
├── Dynamic filters
├── Table + charts
└── Export buttons (PDF / Excel)

Deliverable: مركز التقارير الكامل
```

#### DAY 28 — Full Operation Report + Dashboard Reports
```
Backend:
├── Full operation report
│   └── A15 → كل البيانات من البداية للنهاية
├── Dashboard aggregations
│   ├── إجمالي العمليات (نشطة / مكتملة / مغلقة)
│   ├── إجمالي التأمينات
│   ├── الأرباح
│   └── القادم (تواريخ / ضمانات)
└── Report scheduling (اختياري)

Frontend:
├── Full operation report page
│   ├── Timeline view
│   ├── All sections
│   └── Export as PDF
├── Quick report cards on dashboard
└── Charts: operations/month, revenue, expenses

Deliverable: تقرير العملية الكامل + إحصائيات
```

---

### 🟡 WEEK 15 — Printing + Approvals + Telegram

#### DAY 29 — Printing System
```
Backend:
├── Print service
│   ├── Print one document
│   ├── Print selected documents
│   ├── Print all operation documents
│   ├── Print package (كل مستندات العملية)
│   └── Dual copies (نسخة تسليم + نسخة جهة)
├── Print templates
│   ├── Header: بيانات الشركة + لوجو + كود العملية
│   ├── Footer: كود العملية + تاريخ
│   ├── خطاب الضمان
│   ├── خطاب الاسترداد
│   ├── التظلم
│   ├── الغلاف الذكي
│   └── المستخلص
├── Screenshot before print
├── PDF archive copy
└── Document naming: نوع_رقم_شركة_تاريخ.pdf

Frontend:
├── Print dialog
│   ├── Select: طباعة واحد / مختار / الكل
│   ├── Preview
│   ├── Copies count
│   └── Print button
├── Print history log
└── Upload signed copy after return

Deliverable: نظام الطباعة الكامل
```

#### DAY 30 — Telegram Approval Workflow
```
Backend:
├── Telegram Bot setup
│   ├── Bot token from @BotFather
│   ├── Webhook or polling
│   └── Chat ID management
├── Approval workflow
│   ├── 1. الموظف يطلب طباعة تظلم/ضمان
│   ├── 2. السيستم يوقف الطباعة
│   ├── 3. يبعت Telegram للمدير:
│   │   "طلب طباعة تظلم عملية A15 شركة جولدن"
│   │   "1 = موافق | 2 = مرفوض"
│   ├── 4. لو رد 1: الطباعة تشتغل + Hash + ختم + توقيع
│   ├── 5. لو مردش ساعة: يروح للنائب
│   └── 6. Audit log لكل خطوة
├── Notification types
│   ├── Deadline reminders (48h, 24h)
│   ├── Guarantee expiry
│   ├── Security alerts
│   ├── Payment notifications
│   └── Supplier notifications
└── Telegram message templates

⚠️ ملاحظة: Telegram Bot مش بيبعت لأي رقم —
   المستخدم لازم يبدأ محادثة مع الـ Bot الأول

Frontend:
├── Approval pending indicator
├── Approval status in print dialog
├── Telegram setup in settings
└── Notification preferences

Deliverable: نظام الموافقات + Telegram
```

---

### 🟣 WEEK 16 — Documents + Archive

#### DAY 31 — Document Management
```
Backend:
├── Document CRUD
│   ├── Upload + metadata
│   ├── Version control (كل تعديل = version جديد)
│   ├── Hash generation (32 حرف)
│   └── Auto-naming: نوع_رقم_شركة_تاريخ.pdf
├── Document types
│   ├── كراسة الشروط
│   ├── أمر التوريد
│   ├── العقد
│   ├── خطاب الضمان
│   ├── خطاب الاسترداد
│   ├── التظلم
│   ├── الإيصالات
│   └── أي مستند آخر
└── Document search

Frontend:
├── Documents library
├── Upload + categorize
├── Version history
├── Preview (PDF viewer)
└── Download

Deliverable: إدارة المستندات + الأرشفة التلقائية
```

#### DAY 32 — Archive + Global Search
```
Backend:
├── Archive service
│   ├── كل مستند يطلع من السيستم يتحفظ PDF أوتوماتيك
│   ├── Naming convention
│   └── Retention: 5 سنين
├── Global search
│   ├── A15 → Operation
│   ├── رقم خارجي → Operation
│   ├── اسم الجهة → Operations
│   ├── رقم خطاب ضمان → Guarantee
│   ├── رقم أمر التوريد → Supply Order
│   └── اسم المورد → Supplier
└── Search indexing

Frontend:
├── Archive browser
├── Search results page
│   ├── نتائج مجمعة حسب النوع
│   └── Quick navigation
├── Global search bar (في الـ Header)
└── Recent searches

Deliverable: الأرشيف + البحث الشامل
```

---

### 🟠 WEEK 17 — Security + Audit

#### DAY 33 — Audit Log
```
Backend:
├── AuditLog interceptor (NestJS)
│   ├── كل request = log entry
│   ├── مين + امتى + فتح إيه + طبع إيه + عدل إيه
│   ├── IP + User Agent
│   └── Old value + New value (لو update)
├── Audit endpoints
│   ├── GET /audit?user=&action=&entity=&date=
│   └── Export audit log
└── 5 سنين retention policy

Frontend:
├── Audit log page (للمدير فقط)
├── Filters: user, action, entity, date
├── Details modal
└── Export

Deliverable: سجل حركات كامل
```

#### DAY 34 — Security Features
```
Backend:
├── Account locking
│   ├── 3 محاولات غلط → isLocked = true
│   └── فك القفل: بواسطة المدير فقط
├── Security alerts (Telegram)
│   ├── دخول بعد 8 مساء
│   ├── 3 محاولات باسوورد غلط
│   └── محاولة طباعة مرفوضة
├── Session management
│   ├── JWT expiry
│   ├── Refresh token rotation
│   └── Force logout
├── Password policy
│   ├── Argon2 hashing
│   ├── Min length
│   └── Change password
└── Login attempts log

Frontend:
├── Security settings page
├── Active sessions
├── Force logout button
├── Password change form
├── Security alerts log
└── Locked accounts management

Deliverable: الأمان + التنبيهات الأمنية
```

---

### 🔵 WEEK 18 — Dashboard

#### DAY 35 — Main Dashboard
```
Frontend:
├── Dashboard cards
│   ├── إجمالي العمليات (نشطة/مكتملة)
│   ├── عمليات تنتظر إجراء
│   ├── تأمينات قرب الانتهاء
│   ├── مواعيد قادمة
│   ├── مدفوعات معلقة
│   ├── إجمالي الأرباح
│   └── المخزون الناقص
├── Charts
│   ├── عمليات / شهر
│   ├── إيرادات / مصروفات
│   ├── أرباح
│   └── توزيع التأمينات
├── Quick actions
│   ├── إضافة عملية
│   ├── بحث سريع
│   └── الرادار
└── Recent activity feed

Deliverable: Dashboard احترافي
```

#### DAY 36 — UI Polish + Responsive
```
Frontend:
├── Responsive design (tablet + mobile)
├── Loading states
├── Error handling
├── Empty states
├── Animations + transitions
├── Dark mode (اختياري)
├── Breadcrumbs
├── Keyboard shortcuts
└── Performance optimization

Deliverable: واجهة مصقولة واحترافية
```

---

### 🟢 WEEK 19 — Testing

#### DAY 37 — Backend Testing
```
Backend:
├── Unit tests
│   ├── Auth service
│   ├── Operations service
│   ├── Guarantees service
│   ├── Financial calculations
│   └── Reports service
├── Integration tests
│   ├── Auth flow
│   ├── Operation lifecycle
│   ├── Guarantee workflow
│   └── Payment flow
└── E2E tests (أهم الـ workflows)

Deliverable: Test coverage للـ core flows
```

#### DAY 38 — Frontend Testing + QA
```
Frontend:
├── Component tests
├── Form validation tests
├── Permission tests
├── Print preview tests
└── Cross-browser check

QA:
├── Full workflow testing
├── Edge cases
├── Data integrity
├── Performance
└── Security review

Deliverable: مشروع مختبر وجاهز
```

---

### 🔴 WEEK 20 — Deployment

#### DAY 39 — Hostinger Setup
```
Production:
├── Hostinger account setup
├── Domain configuration
├── SSL certificate
├── Node.js environment
├── MySQL/MariaDB database
├── Environment variables
├── GitHub deployment
└── Email setup (SMTP)

Migration:
├── npx prisma migrate deploy
├── Seed production data
│   ├── Admin account
│   ├── 4 Companies
│   ├── Roles + Permissions
│   └── System Settings
└── Test production connection

Deliverable: مشروع مرفوع على Hostinger
```

#### DAY 40 — Go Live
```
Final checklist:
├── ✅ Database backup strategy
├── ✅ Security hardening
├── ✅ Performance optimization
├── ✅ Error monitoring
├── ✅ Logging
├── ✅ Admin account created
├── ✅ Companies entered
├── ✅ Telegram bot connected
├── ✅ SSL working
├── ✅ Domain pointing
├── ✅ All workflows tested
├── ✅ Documentation updated
└── ✅ User training notes

Deliverable: 🚀 GoldenERP V1.0 LIVE!
```

---

## 🔄 6. Workflow دورة حياة العملية

```
                          ┌──────────┐
                          │  RADAR   │ ← سحب من الموقع
                          └────┬─────┘
                               │
                          ┌────▼─────┐
                          │ عملية    │ ← تسجيل + كود (A1)
                          │ جديدة   │
                          └────┬─────┘
                               │
                     ┌─────────▼─────────┐
                     │ اختيار الشركات    │ ← 1 أو 2 أو 3 أو 4
                     │ A? B? C? D?       │
                     └─────────┬─────────┘
                               │
                          ┌────▼─────┐
                          │ تواريخ   │ ← نشر / سحب / فتح
                          │ حرجة    │   + تنبيهات 48h
                          └────┬─────┘
                               │
                          ┌────▼─────┐
                          │ سحب     │ ← كراسة_رقم_العملية.pdf
                          │ كراسة   │   🔒 الكود يُقفل هنا
                          └────┬─────┘
                               │
                  ┌────────────┼────────────┐
                  │                         │
            ┌─────▼─────┐            ┌──────▼─────┐
            │ عرض فني   │            │ عرض مالي   │
            │ + سابقات  │            │ + حسابات   │
            └─────┬─────┘            │ + VAT      │
                  │                  │ + منع      │
                  │                  │   تواطؤ    │
                  │                  └──────┬─────┘
                  └────────────┬────────────┘
                               │
                          ┌────▼─────┐
                          │ تأمين   │ ← 1% أو 2%
                          │ ابتدائي │   بنك / نقدي / خصم
                          └────┬─────┘
                               │
                          ┌────▼─────┐
                          │ غلاف    │ ← ظرف لكل شركة
                          │ ذكي     │
                          └────┬─────┘
                               │
                          ┌────▼─────┐
                          │ تقديم   │ ← إيصال + صورة
                          │ العملية │
                          └────┬─────┘
                               │
                          ┌────▼─────┐
                          │ فتح     │ ← مقبول / مرفوض
                          │ فني     │
                          └────┬─────┘
                               │
                     ┌─────────▼─────────┐
              مقبول  │                   │ مرفوض
                     │                   │
                     │              ┌────▼─────┐
                     │              │ تظلم     │ ← Hash + موافقة
                     │              │          │   7 أو 15 يوم
                     │              └────┬─────┘
                     │                   │
                     └─────────┬─────────┘
                               │
                          ┌────▼─────┐
                          │ فتح     │ ← أسعار المنافسين
                          │ مالي    │   + ترتيب
                          └────┬─────┘
                               │
                          ┌────▼─────┐
                          │ ترسية   │ ← الفائز + السعر
                          │          │   🔒 قفل الخاسرين
                          └────┬─────┘
                               │
                          ┌────▼─────┐
                          │ أمر     │ ← رقم + تاريخ
                          │ توريد   │   → يضاف لسابقات الأعمال
                          └────┬─────┘
                               │
                          ┌────▼─────┐
                          │ تأمين   │ ← 5% من العقد
                          │ نهائي   │   + تنبيهات 30/15/10/5
                          └────┬─────┘
                               │
                          ┌────▼─────┐
                          │ توريد   │ ← إذن إضافة
                          │          │   → تحديث المخزون
                          └────┬─────┘
                               │
                          ┌────▼─────┐
                          │ مستخلص  │ ← 1% + 14% + 5%
                          │          │   auto-deduct
                          └────┬─────┘
                               │
                          ┌────▼─────┐
                          │ استلام  │ ← تكلفة + إيراد
                          │ نهائي   │   + صافي ربح
                          └────┬─────┘
                               │
                          ┌────▼─────┐
                          │ استرداد │ ← 60 يوم
                          │ تأمين   │   تنبيه يوم 50
                          └────┬─────┘
                               │
                          ┌────▼─────┐
                          │  قفل    │ ← أرشيف
                          │ العملية │
                          └──────────┘
```

---

## ⚡ 7. قواعد ذهبية

### ❌ ممنوع

| # | القاعدة |
|---|---|
| 1 | ❌ **لا تخزن ملفات PDF/صور داخل MySQL** — Database تخزن metadata فقط |
| 2 | ❌ **لا تكتب `if (role === "admin")`** — استخدم Permission System |
| 3 | ❌ **لا تعمل Hard-code للنسب** — VAT 14%, أ.ت.ص 1%, ضمان 5% كلها من SystemSettings |
| 4 | ❌ **لا تعمل Hard Delete للعمليات** — Soft delete + Archive |
| 5 | ❌ **لا تسمح بتغيير كود العملية بعد سحب الكراسة** — isCodeLocked |
| 6 | ❌ **لا تبدأ UI قبل ما تخلص ERD** — Database أولاً |
| 7 | ❌ **لا تعمل Screen Recording في V1** — Phase متقدمة |
| 8 | ❌ **لا تبدأ بالتقارير** — ابدأ بالـ Data entry الأول |

### ✅ لازم

| # | القاعدة |
|---|---|
| 1 | ✅ **كل Module = Controller + Service + DTO + Tests** |
| 2 | ✅ **كل API endpoint له validation (class-validator)** |
| 3 | ✅ **كل action مهم يتسجل في Audit Log** |
| 4 | ✅ **كل ملف يترفع يتحفظ metadata في DB + الملف في storage** |
| 5 | ✅ **كل تاريخ حرج يولّد notification تلقائياً** |
| 6 | ✅ **كل عملية لها displayCode فريد (A1, B15...)** |
| 7 | ✅ **Git commit بعد كل feature** |
| 8 | ✅ **`.env` لكل environment (dev, staging, prod)** |

---

## 🌐 8. Deployment Strategy

### Local Development
```
Windows
├── Node.js v20+
├── MySQL 8.0+
├── Next.js :3000
├── NestJS :4000
├── Prisma
└── VS Code
```

### Environment Variables
```env
# .env.example

# Database
DATABASE_URL="mysql://root:password@localhost:3306/goldenerp_dev"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_REFRESH_EXPIRES_IN="7d"

# Telegram
TELEGRAM_BOT_TOKEN="your-bot-token"
TELEGRAM_MANAGER_CHAT_ID="manager-chat-id"
TELEGRAM_DEPUTY_CHAT_ID="deputy-chat-id"

# File Storage
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760

# App
APP_PORT=4000
FRONTEND_URL="http://localhost:3000"

# Security
ACCOUNT_LOCK_ATTEMPTS=3
AFTER_HOURS_START=20
AFTER_HOURS_END=6
```

### Production (Hostinger)
```
Internet
    │
    ▼
Hostinger (Domain + SSL)
    │
    ├── Next.js (Frontend)
    │
    ├── NestJS (Backend API)
    │
    ├── MySQL/MariaDB (Database)
    │
    └── Storage (Files)
```

### Migration Commands
```bash
# Local
npx prisma migrate dev --name feature_name

# Production
npx prisma migrate deploy
```

---

## 📊 ملخص الإحصائيات

| المقياس | القيمة |
|---|---|
| **عدد الـ Modules** | ~30 module |
| **عدد جداول الـ Database** | ~40 جدول |
| **عدد الـ API endpoints** (تقدير) | ~150+ endpoint |
| **عدد صفحات الـ Frontend** (تقدير) | ~25+ صفحة |
| **مدة التطوير** | 20 أسبوع (40 يوم عمل) |
| **ساعات العمل الإجمالية** (تقدير) | 200-240 ساعة |

---

> [!IMPORTANT]
> **ابدأ دائماً بـ:**
> 1. Database Schema (ERD)
> 2. Backend API
> 3. Frontend UI
>
> **وليس العكس!**

---

> [!TIP]
> **للبدء فوراً:**
> 1. ثبّت MySQL + Node.js على جهازك
> 2. أنشئ المشروع (Next.js + NestJS)
> 3. اكتب schema.prisma الكامل
> 4. شغّل `npx prisma migrate dev`
> 5. ابدأ بـ Auth module

---

*— نهاية الخطة —*
*GoldenERP V1.0 Master Development Plan*
*آخر تحديث: 1 أكتوبر 2026*
