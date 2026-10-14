# 🏆 GoldenERP V1.0

> نظام ERP متكامل وشامل لإدارة المناقصات والعمليات وتتبع خطابات الضمان للشركات الأربعة — مبني بأحدث تقنيات NestJS + Next.js + TailwindCSS + MySQL مع دعم كامل للوضعين الداكن والفاتح (Dark / Light Mode) باللغة العربية 100%.

---

## ▶️ طريقة التشغيل (خطوة بخطوة)

> **⚠️ مهم: لازم تشغّل الأوامر بالترتيب ده في كل مرة**

### الخطوة 1: شغّل MySQL (في Terminal جديد — سيبه مفتوح)
```powershell
& "C:\Program Files\MySQL\MySQL Server 26.7\bin\mysqld.exe" --datadir="f:/goldenerp/mysql_data" --port=3306 --console
```
> ⚠️ **اسم الـ Terminal دي: MySQL — لازم تسيبها مفتوحة طول ما المشروع شغال**
> لما تشوف `ready for connections` يبقى MySQL شغال ✅

### الخطوة 2: شغّل Backend (في Terminal تاني — سيبه مفتوح)
```powershell
cd f:\goldenerp\backend
npm run start:dev
```
> لما تشوف `🚀 GoldenERP Backend running on http://localhost:4000` يبقى شغال ✅

### الخطوة 3: شغّل Frontend (في Terminal تالت — سيبه مفتوح)
```powershell
cd f:\goldenerp\frontend
npm run dev
```
> لما تشوف `Ready in Xs` يبقى شغال ✅

### الخطوة 4: افتح المتصفح
```
http://localhost:3000/login
```

---

## 🔑 بيانات الدخول

| الدور | Username | Password |
|:---|:---|:---|
| 👑 مدير عام | `admin` | `admin123` |
| 🤵 نائب مدير | `deputy` | `deputy123` |
| 👤 موظف | `employee` | `emp123` |

---

## 🛑 طريقة الإيقاف

1. **Frontend**: اضغط `Ctrl+C` في Terminal الـ Frontend
2. **Backend**: اضغط `Ctrl+C` في Terminal الـ Backend
3. **MySQL**: اضغط `Ctrl+C` في Terminal الـ MySQL

---

## 🔄 أوامر مفيدة (من مجلد backend)

```powershell
# إعادة إنشاء الجداول (لو عدّلت schema.prisma)
npm run db:push

# إعادة تهيئة البيانات
npm run db:seed

# إنشاء Prisma Client (بعد تعديل schema)
npm run db:generate

# فتح Prisma Studio (واجهة بصرية لقاعدة البيانات)
npm run db:studio

# فحص TypeScript
npx tsc --noEmit
```

---

## 📊 إحصائيات المشروع

| البند | العدد |
|:---|:---:|
| Backend Modules | 20 |
| Frontend Pages | 17 |
| Database Tables | 47 |
| API Endpoints | 85+ |
| DTOs | 22 |

---

## 🏗️ الهيكل

```
f:\goldenerp\
├── backend\            ← NestJS API (Port 4000)
│   ├── src\            ← 20 module
│   ├── prisma\         ← Schema + Seed
│   └── .env            ← إعدادات البيئة
├── frontend\           ← Next.js UI (Port 3000)
│   └── src\app\        ← 17 page
├── mysql_data\         ← MySQL data directory
└── start.bat           ← سكريبت تشغيل سريع
```

---

## 📡 API Endpoints

### Auth
- `POST /api/auth/login` — تسجيل دخول
- `POST /api/auth/refresh` — تجديد Token
- `GET  /api/auth/me` — بيانات المستخدم الحالي

### Users
- `GET/POST /api/users` — قائمة/إنشاء مستخدمين
- `GET/PATCH /api/users/:id` — عرض/تعديل مستخدم

### Companies
- `GET/POST /api/companies` — الشركات
- `GET/PATCH /api/companies/:id`

### Authorized Persons
- `GET/POST /api/authorized-persons`
- `GET/PATCH/DELETE /api/authorized-persons/:id`

### Operations
- `GET/POST /api/operations`
- `GET/PATCH /api/operations/:id`
- `PATCH /api/operations/:id/status` — تغيير الحالة
- `PATCH /api/operations/:id/archive` — أرشفة
- `GET /api/operations/stats` — إحصائيات

### Operation Contacts
- `GET/POST /api/operations/:id/contacts`
- `PATCH/DELETE /api/operations/:id/contacts/:contactId`

### Previous Works
- `GET/POST /api/previous-works`
- `GET/PATCH/DELETE /api/previous-works/:id`

### Guarantees
- `GET/POST /api/guarantees`
- `GET /api/guarantees/stats`
- `GET /api/guarantees/expiring`
- `PATCH /api/guarantees/:id/request-recovery`
- `PATCH /api/guarantees/:id/mark-recovered`

### Certificates
- `GET/POST /api/certificates`
- `GET/PATCH/DELETE /api/certificates/:id`

### Approvals
- `GET/POST /api/approvals`
- `GET /api/approvals/pending-count`
- `PATCH /api/approvals/:id/approve`
- `PATCH /api/approvals/:id/reject`

### Suppliers
- `GET/POST /api/suppliers`
- `GET/PATCH/DELETE /api/suppliers/:id`
- `GET /api/suppliers/:id/balance`

### Purchases
- `GET/POST /api/purchases`
- `GET /api/purchases/stats`
- `POST /api/purchases/:id/payments`

### Finance
- `GET/POST /api/finance`
- `GET /api/finance/summary`
- `PATCH/DELETE /api/finance/:id`

### Inventory
- `GET/POST /api/inventory/products`
- `GET /api/inventory/products/low-stock`
- `GET /api/inventory/categories`
- `GET/POST /api/inventory/movements`

### Employees
- `GET/POST /api/employees`
- `POST /api/employees/:id/advances`
- `GET /api/employees/advances`
- `GET/POST /api/employees/visits`

### Documents
- `GET/POST /api/documents`
- `POST /api/documents/:id/versions`
- `POST /api/documents/:id/prints`
- `PATCH /api/documents/prints/:printId/approve`

### Radar
- `GET/POST /api/radar/sources`
- `GET/POST /api/radar/items`
- `PATCH /api/radar/items/:id/import`

### System
- `GET /api/audit` — سجل التدقيق
- `GET/PATCH /api/settings` — الإعدادات
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
