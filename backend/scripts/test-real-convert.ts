import { PrismaClient, TenderType, OperationStatus, OperationDateType, GuaranteeType, GuaranteePaymentMethod, GuaranteeStatus, OpDocType } from '@prisma/client';

const prisma = new PrismaClient();

// Let's test the EXACT code of convertToOperation from radar.service.ts
async function testRealConvert() {
  const id = 'cmv8odoe200019jtcsb6w3qf1';
  const item = await prisma.radarItem.findUnique({ where: { id } });
  if (!item) {
    console.error('item not found');
    return;
  }

  let raw: any = {};
  if (item.rawData) {
    try {
      raw = JSON.parse(item.rawData);
    } catch {}
  }

  const targetCode = (item.matchedCompanyCode || 'A').toUpperCase();
  const company = await prisma.company.findUnique({ where: { code: targetCode } });
  if (!company) {
    console.error('company not found');
    return;
  }

  let tenderType: TenderType = TenderType.TENDER;
  const kindStr = (item.tenderType || raw.tenderMethod || raw.tenderKind || '').toLowerCase();
  if (kindStr.includes('محدودة') && (kindStr.includes('مناقصة') || kindStr.includes('مناقصه'))) {
    tenderType = TenderType.LIMITED_TENDER;
  } else if (kindStr.includes('محدودة') && (kindStr.includes('ممارسة') || kindStr.includes('ممارسه'))) {
    tenderType = TenderType.LIMITED_PRACTICE;
  } else if (kindStr.includes('ممارسة') || kindStr.includes('ممارسه')) {
    tenderType = TenderType.PRACTICE;
  } else if (kindStr.includes('مزايدة') || kindStr.includes('مزاد')) {
    tenderType = TenderType.AUCTION;
  } else if (kindStr.includes('مباشر') || kindStr.includes('إسناد') || kindStr.includes('اسناد')) {
    tenderType = TenderType.DIRECT_ORDER;
  } else {
    tenderType = TenderType.TENDER;
  }

  console.log('Determined tenderType:', tenderType);

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Create Operation
      const operation = await tx.operation.create({
        data: {
          name: item.title,
          authority: item.authority || 'الجهة الحكومية',
          externalNumber: item.referenceNumber || raw.refNo || undefined,
          governorate: item.governorate || 'القاهرة',
          tenderType,
          status: OperationStatus.DRAFT,
          notes: undefined,
          createdBy: undefined,
        },
      });
      console.log('1. Created op:', operation.id);

      // 2. Display code
      const displayCode = 'AZ01';
      await tx.operationCompany.create({
        data: {
          operationId: operation.id,
          companyId: company.id,
          displayCode,
        },
      });
      console.log('2. Created opCompany');

      // 3. Dates
      console.log('item dates:', { pub: item.publicationDate, deadline: item.deadline, rawTimeline: raw.timeline });

      // 4. Guarantees
      const tempAmount = item.temporaryInsurance || raw.temporaryInsurance;
      console.log('tempAmount:', tempAmount);
      if (tempAmount && tempAmount > 0) {
        await tx.guarantee.create({
          data: {
            operationId: operation.id,
            companyId: company.id,
            type: GuaranteeType.INITIAL,
            paymentMethod: GuaranteePaymentMethod.CASH,
            amount: tempAmount,
            percentage: 2,
            status: GuaranteeStatus.ACTIVE,
            notes: `تأمين مؤقت مسحوب آلياً من كراسة شروط العملية رقم ${item.referenceNumber || ''}`,
          },
        });
        console.log('4. Created guarantee');
      }

      // 5. Operation Finance
      const bookletAmount = item.bookletPrice || raw.bookletPrice || 0;
      console.log('bookletAmount:', bookletAmount);
      await tx.operationFinance.create({
        data: {
          operationId: operation.id,
          totalCost: bookletAmount,
          notes: bookletAmount > 0 ? `تكلفة شراء كراسة الشروط: ${bookletAmount} ج.م.` : undefined,
        },
      });
      console.log('5. Created finance');

      // 6. Documents
      const attachments = raw.attachments || [];
      console.log('attachments:', attachments);
      if (attachments.length > 0) {
        for (const att of attachments) {
          const docId = att.docId || (att.downloadUrl ? att.downloadUrl.match(/DocId=([a-zA-Z0-9\-]+)/i)?.[1] : '');
          const attName = att.name || `كراسة_شروط_${item.title.substring(0, 45)}`;
          await tx.operationDocument.create({
            data: {
              operationId: operation.id,
              companyId: company.id,
              type: OpDocType.BOOKLET,
              fileName: attName,
              filePath: `/radar/download-doc?docId=${docId || ''}&tenderId=${item.id}&download=true`,
              fileType: 'application/pdf',
              uploadedBy: 'الرادار الذكي (سحب كراسة الشروط والمرفقات)',
            },
          });
        }
      } else {
        await tx.operationDocument.create({
          data: {
            operationId: operation.id,
            companyId: company.id,
            type: OpDocType.BOOKLET,
            fileName: `كراسة_الشروط_والمواصفات_${item.referenceNumber ? `#${item.referenceNumber}` : displayCode}.pdf`,
            filePath: `/radar/download-doc?tenderId=${item.id}&download=true`,
            fileType: 'application/pdf',
            uploadedBy: 'الرادار الذكي (سحب آلي من بوابة التعاقدات)',
          },
        });
      }
      console.log('6. Created document');

      // Update operation status
      await tx.operation.update({
        where: { id: operation.id },
        data: {
          status: OperationStatus.BOOKLET_WITHDRAWN,
          isCodeLocked: true,
        },
      });
      console.log('7. Updated op status');

      // Mark radarItem
      await tx.radarItem.update({
        where: { id: item.id },
        data: {
          isImported: true,
          operationId: operation.id,
        },
      });
      console.log('8. Updated radarItem');
    });
    console.log('SUCCESSFULLY COMPLETED TRANSACTION!');
  } catch (e) {
    console.error('FAILED IN TRANSACTION:', e);
  }
}

testRealConvert().finally(() => prisma.$disconnect());
