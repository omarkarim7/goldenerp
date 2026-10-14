import { PrismaClient, TenderType, OperationStatus, OperationDateType, GuaranteeType, GuaranteePaymentMethod, GuaranteeStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding Rich Demo Operations, Suppliers & Employees into Aiven Cloud Database...');

  const companies = await prisma.company.findMany();
  const compA = companies.find((c) => c.code === 'A') || companies[0];
  const compB = companies.find((c) => c.code === 'B') || companies[1] || companies[0];
  const compC = companies.find((c) => c.code === 'C') || companies[2] || companies[0];

  // 1. Employees
  console.log('👤 Creating Employees...');
  const employeesData = [
    {
      name: 'م. أحمد عبد الرحمن',
      title: 'مدير قطاع العمليات والمناقصات',
      department: 'المكتب الفني',
      phone: '01012345678',
    },
    {
      name: 'أ. سحر حسن',
      title: 'مسؤول التقديم والضمانات البنكية',
      department: 'الشؤون الإدارية والمالية',
      phone: '01123456789',
    },
    {
      name: 'م. كريم الشناوي',
      title: 'مهندس أول تسعير ودراسات مكتب فني',
      department: 'التسعير والمشتريات',
      phone: '01234567890',
    },
  ];

  for (const emp of employeesData) {
    const existing = await prisma.employee.findFirst({ where: { phone: emp.phone } });
    if (!existing) {
      await prisma.employee.create({ data: emp });
    }
  }

  // 2. Suppliers
  console.log('🏢 Creating Suppliers...');
  const suppliersData = [
    {
      name: 'شركة الأمل للتوريدات العمومية ذ.م.م',
      phone: '01099887766',
      email: 'sales@alamal-supplies.eg',
      address: 'مدينة نصر — الحي السابع — القاهرة',
      notes: 'مورد معتمد للأجهزة الطبية والمعملية',
    },
    {
      name: 'مؤسسة النيل للتكنولوجيا والمهمات',
      phone: '01188776655',
      email: 'info@nile-tech.eg',
      address: 'شارع التحرير — الدقي — الجيزة',
      notes: 'مورد معتمد للشبكات والأنظمة الأمنية وكاميرات المراقبة',
    },
    {
      name: 'المجموعة الهندسية للحلول المتكاملة',
      phone: '01277665544',
      email: 'contact@eg-engineering.com',
      address: 'طريق الكورنيش — لوران — الإسكندرية',
      notes: 'مورد معتمد لمهمات السلامة والأمان الصناعي',
    },
  ];

  for (const sup of suppliersData) {
    const existing = await prisma.supplier.findFirst({ where: { phone: sup.phone } });
    if (!existing) {
      await prisma.supplier.create({ data: sup });
    }
  }

  // 3. Operations
  console.log('📑 Creating Real Operations with Lifecycle Stages...');

  // Operation 1: Medical supplies for Cairo University Hospitals (Tech Opening Accepted)
  const existingOp1 = await prisma.operation.findFirst({ where: { externalNumber: 'ق/2026/048' } });
  if (!existingOp1) {
    const op1 = await prisma.operation.create({
      data: {
        name: 'توريد وتركيب أجهزة ومستلزمات طبية متقدمة لمستشفيات جامعة القاهرة',
        authority: 'جامعة القاهرة — إدارة المشتريات والمخازن الطبية',
        externalNumber: 'ق/2026/048',
        tenderType: TenderType.TENDER,
        status: OperationStatus.TECHNICAL_ACCEPTED,
        governorate: 'الجيزة',
        notes: 'عملية تم اجتياز البت الفني بها وقبول العرض الفني، ومحدد جلسة الفتح المالي قريباً.',
        companies: {
          create: [
            { companyId: compA.id, displayCode: 'A1' },
            { companyId: compB.id, displayCode: 'B1' },
          ],
        },
        dates: {
          create: [
            {
              dateType: OperationDateType.PUBLICATION,
              dateValue: new Date(Date.now() - 25 * 86400000),
              label: 'تاريخ نشر المناقصة',
            },
            {
              dateType: OperationDateType.BOOKLET_DEADLINE,
              dateValue: new Date(Date.now() - 15 * 86400000),
              label: 'آخر موعد لشراء الكراسة',
            },
            {
              dateType: OperationDateType.TECHNICAL_OPENING,
              dateValue: new Date(Date.now() - 5 * 86400000),
              label: 'جلسة فتح المظاريف الفنية',
            },
            {
              dateType: OperationDateType.FINANCIAL_OPENING,
              dateValue: new Date(Date.now() + 10 * 86400000),
              label: 'الموعد المحدد لجلسة الفتح المالي',
            },
          ],
        },
        guarantees: {
          create: [
            {
              type: GuaranteeType.INITIAL,
              amount: 45000,
              paymentMethod: GuaranteePaymentMethod.BANK_GUARANTEE,
              bankName: 'بنك مصر — فرع قصر العيني',
              guaranteeNumber: 'LG-2026-MED-0091',
              startDate: new Date(Date.now() - 14 * 86400000),
              endDate: new Date(Date.now() + 75 * 86400000),
              duration: 90,
              status: GuaranteeStatus.ACTIVE,
              companyId: compA.id,
            },
          ],
        },
        contacts: {
          create: [
            {
              name: 'د. سامح عبد الفتاح',
              title: 'مدير عام المشتريات الطبية بجامعة القاهرة',
              phone: '0235678901',
              email: 'procurement@cu.edu.eg',
            },
          ],
        },
      },
    });
    console.log(`  ✅ Operation 1: ${op1.name} (Code: A1)`);
  }

  // Operation 2: Networks & Surveillance for Red Sea Ports Authority (Clarification & Inquiries)
  const existingOp2 = await prisma.operation.findFirst({ where: { externalNumber: 'م/2026/112' } });
  if (!existingOp2) {
    const op2 = await prisma.operation.create({
      data: {
        name: 'عملية توريد وتركيب وتطوير منظومة كاميرات المراقبة والشبكات — ميناء السويس',
        authority: 'الهيئة العامة لموانئ البحر الأحمر — قطاع تكنولوجيا المعلومات',
        externalNumber: 'م/2026/112',
        tenderType: TenderType.PRACTICE,
        status: OperationStatus.BOOKLET_WITHDRAWN,
        governorate: 'السويس',
        notes: 'تم شراء الكراسة وجاري إرسال خطاب الاستفسارات للجهة بخصوص الكاميرات والمواصفات الفنية.',
        companies: {
          create: [
            { companyId: compA.id, displayCode: 'A2' },
          ],
        },
        dates: {
          create: [
            {
              dateType: OperationDateType.PUBLICATION,
              dateValue: new Date(Date.now() - 10 * 86400000),
              label: 'تاريخ الإعلان',
            },
            {
              dateType: OperationDateType.INQUIRIES_DEADLINE,
              dateValue: new Date(Date.now() + 4 * 86400000),
              label: 'آخر موعد لتقديم خطابات الاستفسار',
            },
          ],
        },
        guarantees: {
          create: [
            {
              type: GuaranteeType.INITIAL,
              amount: 28000,
              paymentMethod: GuaranteePaymentMethod.CASH,
              receiptNumber: 'REC-RS-99210',
              startDate: new Date(Date.now() - 2 * 86400000),
              endDate: new Date(Date.now() + 90 * 86400000),
              duration: 90,
              status: GuaranteeStatus.ACTIVE,
              companyId: compA.id,
            },
          ],
        },
      },
    });
    console.log(`  ✅ Operation 2: ${op2.name} (Code: A2)`);
  }

  // Operation 3: Safety and Industrial equipment for Nasr Petroleum (Awarded & Supply in Progress)
  const existingOp3 = await prisma.operation.findFirst({ where: { externalNumber: 'ب/2026/015' } });
  if (!existingOp3) {
    const op3 = await prisma.operation.create({
      data: {
        name: 'توريد مهمات وقاية ومعدات السلامة والأمان الصناعي للعاملين بالمعامل والمستودعات',
        authority: 'شركة النصر للبترول — قطاع المهمات والسلامة',
        externalNumber: 'ب/2026/015',
        tenderType: TenderType.LIMITED_TENDER,
        status: OperationStatus.AWARDED,
        governorate: 'السويس',
        notes: 'تمت الترسية الرسمية وإصدار خطاب الضمان النهائي بنسبة 5% بقيمة 72,500 ج.م.',
        companies: {
          create: [
            { companyId: compB.id, displayCode: 'B2', isWinner: true },
          ],
        },
        dates: {
          create: [
            {
              dateType: OperationDateType.TECHNICAL_OPENING,
              dateValue: new Date(Date.now() - 40 * 86400000),
              label: 'الفتح الفني',
            },
            {
              dateType: OperationDateType.FINANCIAL_OPENING,
              dateValue: new Date(Date.now() - 20 * 86400000),
              label: 'الفتح المالي',
            },
            {
              dateType: OperationDateType.EXECUTION_END,
              dateValue: new Date(Date.now() + 52 * 86400000),
              label: 'الموعد النهائي لانتهاء التوريد التعاقدي',
            },
          ],
        },
        guarantees: {
          create: [
            {
              type: GuaranteeType.FINAL,
              amount: 72500,
              paymentMethod: GuaranteePaymentMethod.BANK_GUARANTEE,
              bankName: 'البنك الأهلي المصري — فرع السويس',
              guaranteeNumber: 'LG-FIN-2026-NSR-81',
              startDate: new Date(Date.now() - 5 * 86400000),
              endDate: new Date(Date.now() + 180 * 86400000),
              duration: 180,
              status: GuaranteeStatus.ACTIVE,
              companyId: compB.id,
            },
          ],
        },
      },
    });
    console.log(`  ✅ Operation 3: ${op3.name} (Code: B2)`);
  }

  // Operation 4: Alexandria Governorate Telecom Infrastructure
  const existingOp4 = await prisma.operation.findFirst({ where: { externalNumber: 'إ/2026/089' } });
  if (!existingOp4) {
    const op4 = await prisma.operation.create({
      data: {
        name: 'إنشاء وتجهيز البنية التحتية لمنظومة الاتصالات السحابية — ديوان عام محافظة الإسكندرية',
        authority: 'محافظة الإسكندرية — الإدارة العامة للعقود والمشتريات',
        externalNumber: 'إ/2026/089',
        tenderType: TenderType.TENDER,
        status: OperationStatus.BOOKLET_WITHDRAWN,
        governorate: 'الإسكندرية',
        notes: 'مرحلة إعداد وتجهيز مستندات المظروف الفني والمالي.',
        companies: {
          create: [
            { companyId: compC.id, displayCode: 'C1' },
          ],
        },
        dates: {
          create: [
            {
              dateType: OperationDateType.PUBLICATION,
              dateValue: new Date(Date.now() - 12 * 86400000),
              label: 'تاريخ النشر',
            },
            {
              dateType: OperationDateType.BOOKLET_DEADLINE,
              dateValue: new Date(Date.now() + 18 * 86400000),
              label: 'جلسة تقديم العطاءات',
            },
          ],
        },
      },
    });
    console.log(`  ✅ Operation 4: ${op4.name} (Code: C1)`);
  }

  // Operation 5: Giza Courts Paper and Stationery (Financial Opening)
  const existingOp5 = await prisma.operation.findFirst({ where: { externalNumber: 'ع/2026/033' } });
  if (!existingOp5) {
    const op5 = await prisma.operation.create({
      data: {
        name: 'توريد ورق تصوير وأدوات مكتبية ومطبوعات لمجمع محاكم الجيزة ومأموريات الشهر العقاري',
        authority: 'وزارة العدل — مجمع محاكم الجيزة',
        externalNumber: 'ع/2026/033',
        tenderType: TenderType.PRACTICE,
        status: OperationStatus.FINANCIAL_OPENED,
        governorate: 'الجيزة',
        notes: 'تمت جلسة الفتح المالي وجاري دراسة بنود الترسية الجزئية في البنود المطروحة.',
        companies: {
          create: [
            { companyId: compA.id, displayCode: 'A3' },
          ],
        },
        dates: {
          create: [
            {
              dateType: OperationDateType.TECHNICAL_OPENING,
              dateValue: new Date(Date.now() - 15 * 86400000),
              label: 'جلسة الفتح الفني',
            },
            {
              dateType: OperationDateType.FINANCIAL_OPENING,
              dateValue: new Date(Date.now() - 2 * 86400000),
              label: 'جلسة الفتح المالي ودراسة الترسية الجزئية',
            },
          ],
        },
        guarantees: {
          create: [
            {
              type: GuaranteeType.INITIAL,
              amount: 15000,
              paymentMethod: GuaranteePaymentMethod.BANK_GUARANTEE,
              bankName: 'بنك القاهرة — فرع الدقي',
              guaranteeNumber: 'LG-GZ-2026-0044',
              startDate: new Date(Date.now() - 16 * 86400000),
              endDate: new Date(Date.now() + 60 * 86400000),
              duration: 75,
              status: GuaranteeStatus.ACTIVE,
              companyId: compA.id,
            },
          ],
        },
      },
    });
    console.log(`  ✅ Operation 5: ${op5.name} (Code: A3)`);
  }

  console.log('\n🎉 ALL DEMO OPERATIONS & SEED DATA SUCCESSFULLY CREATED IN AIVEN CLOUD!');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
