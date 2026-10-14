// =============================================================================
// GoldenERP — Database Seed
// يضيف: Admin user + 4 Companies + Permissions + System Settings
// =============================================================================

import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 بدء تهيئة قاعدة البيانات...\n');

  // =========================================================================
  // 1. الشركات الأربعة
  // =========================================================================
  console.log('🏢 إنشاء الشركات...');

  const companies = [
    { name: 'جولدن', code: 'A' },
    { name: 'إكسلنت', code: 'B' },
    { name: 'العهد', code: 'C' },
    { name: 'الشركة الرابعة', code: 'D' },
  ];

  for (const company of companies) {
    await prisma.company.upsert({
      where: { code: company.code },
      update: {},
      create: company,
    });
    console.log(`  ✅ ${company.name} (${company.code})`);
  }

  // =========================================================================
  // 2. الصلاحيات
  // =========================================================================
  console.log('\n🔐 إنشاء الصلاحيات...');

  const permissions = [
    // Operations
    { code: 'operation.create', name: 'إنشاء عملية', module: 'operations' },
    { code: 'operation.edit', name: 'تعديل عملية', module: 'operations' },
    { code: 'operation.view', name: 'عرض عملية', module: 'operations' },
    { code: 'operation.delete', name: 'حذف عملية', module: 'operations' },
    { code: 'operation.archive', name: 'أرشفة عملية', module: 'operations' },

    // Companies
    { code: 'company.create', name: 'إنشاء شركة', module: 'companies' },
    { code: 'company.edit', name: 'تعديل شركة', module: 'companies' },
    { code: 'company.view', name: 'عرض شركة', module: 'companies' },

    // Guarantees
    { code: 'guarantee.create', name: 'إنشاء تأمين', module: 'guarantees' },
    { code: 'guarantee.edit', name: 'تعديل تأمين', module: 'guarantees' },
    { code: 'guarantee.view', name: 'عرض تأمين', module: 'guarantees' },

    // Documents
    { code: 'document.upload', name: 'رفع مستند', module: 'documents' },
    { code: 'document.print', name: 'طباعة مستند', module: 'documents' },
    { code: 'document.view', name: 'عرض مستند', module: 'documents' },

    // Approvals
    { code: 'approval.manage', name: 'إدارة الموافقات', module: 'approvals' },
    { code: 'approval.print', name: 'موافقة طباعة', module: 'approvals' },

    // Reports
    { code: 'report.view', name: 'عرض التقارير', module: 'reports' },
    { code: 'report.export', name: 'تصدير التقارير', module: 'reports' },

    // Users
    { code: 'user.create', name: 'إنشاء مستخدم', module: 'users' },
    { code: 'user.edit', name: 'تعديل مستخدم', module: 'users' },
    { code: 'user.view', name: 'عرض مستخدم', module: 'users' },

    // Inventory
    { code: 'inventory.manage', name: 'إدارة المخزون', module: 'inventory' },
    { code: 'inventory.view', name: 'عرض المخزون', module: 'inventory' },

    // Suppliers
    { code: 'supplier.manage', name: 'إدارة الموردين', module: 'suppliers' },

    // Audit
    { code: 'audit.view', name: 'عرض سجل الحركات', module: 'audit' },

    // Settings
    { code: 'settings.manage', name: 'إدارة الإعدادات', module: 'settings' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
  }
  console.log(`  ✅ ${permissions.length} صلاحية`);

  // =========================================================================
  // 3. المستخدمين
  // =========================================================================
  console.log('\n👤 إنشاء المستخدمين...');

  const adminPassword = await argon2.hash('admin123');
  const deputyPassword = await argon2.hash('deputy123');
  const employeePassword = await argon2.hash('emp123');

  // المدير العام
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { displayPassword: 'admin123' },
    create: {
      username: 'admin',
      email: 'admin@goldenerp.com',
      password: adminPassword,
      displayPassword: 'admin123',
      fullName: 'المدير العام',
      role: UserRole.GENERAL_MANAGER,
    },
  });
  console.log(`  ✅ المدير العام (admin / admin123)`);

  // النائب
  await prisma.user.upsert({
    where: { username: 'deputy' },
    update: { displayPassword: 'deputy123' },
    create: {
      username: 'deputy',
      email: 'deputy@goldenerp.com',
      password: deputyPassword,
      displayPassword: 'deputy123',
      fullName: 'نائب المدير',
      role: UserRole.DEPUTY_MANAGER,
    },
  });
  console.log(`  ✅ نائب المدير (deputy / deputy123)`);

  // الموظف
  await prisma.user.upsert({
    where: { username: 'employee' },
    update: { displayPassword: 'emp123' },
    create: {
      username: 'employee',
      email: 'employee@goldenerp.com',
      password: employeePassword,
      displayPassword: 'emp123',
      fullName: 'موظف إدخال بيانات',
      role: UserRole.EMPLOYEE,
    },
  });
  console.log(`  ✅ موظف (employee / emp123)`);

  // Assign all permissions to admin
  const allPerms = await prisma.permission.findMany();
  for (const perm of allPerms) {
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId: admin.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        userId: admin.id,
        permissionId: perm.id,
      },
    });
  }
  console.log(`  ✅ كل الصلاحيات مُعينة للمدير العام`);

  // =========================================================================
  // 4. إعدادات النظام
  // =========================================================================
  console.log('\n⚙️  إنشاء إعدادات النظام...');

  const settings = [
    { key: 'vat_rate', value: '14', type: 'number', label: 'نسبة القيمة المضافة %', group: 'tax' },
    { key: 'tax_deduction_rate', value: '1', type: 'number', label: 'نسبة أ.ت.ص %', group: 'tax' },
    { key: 'performance_bond_rate', value: '5', type: 'number', label: 'نسبة ضمان الأعمال %', group: 'tax' },
    { key: 'initial_guarantee_rate', value: '2', type: 'number', label: 'نسبة التأمين الابتدائي %', group: 'guarantees' },
    { key: 'final_guarantee_rate', value: '5', type: 'number', label: 'نسبة التأمين النهائي %', group: 'guarantees' },
    { key: 'initial_guarantee_duration', value: '90', type: 'number', label: 'مدة التأمين الابتدائي (يوم)', group: 'guarantees' },
    { key: 'insurance_recovery_days', value: '60', type: 'number', label: 'أيام استرداد التأمين بعد الاستلام', group: 'guarantees' },
    { key: 'guarantee_reminder_days', value: '30,15,10,5', type: 'string', label: 'أيام التنبيه قبل انتهاء التأمين', group: 'notifications' },
    { key: 'deadline_reminder_hours', value: '48,24', type: 'string', label: 'ساعات التنبيه قبل الموعد', group: 'notifications' },
    { key: 'grievance_authority_days', value: '7', type: 'number', label: 'مدة التظلم للجهة (يوم)', group: 'legal' },
    { key: 'grievance_tribunal_days', value: '15', type: 'number', label: 'مدة التظلم للهيئة (يوم)', group: 'legal' },
    { key: 'account_lock_attempts', value: '3', type: 'number', label: 'محاولات القفل', group: 'security' },
    { key: 'after_hours_start', value: '20', type: 'number', label: 'بداية ساعات الحظر', group: 'security' },
    { key: 'after_hours_end', value: '6', type: 'number', label: 'نهاية ساعات الحظر', group: 'security' },
    { key: 'records_retention_years', value: '5', type: 'number', label: 'مدة حفظ السجلات (سنة)', group: 'security' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log(`  ✅ ${settings.length} إعداد`);

  console.log('\n✨ تم تهيئة قاعدة البيانات بنجاح!\n');
  console.log('📋 بيانات الدخول:');
  console.log('   المدير:  admin / admin123');
  console.log('   النائب:  deputy / deputy123');
  console.log('   الموظف: employee / emp123\n');
}

main()
  .catch((e) => {
    console.error('❌ خطأ:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
