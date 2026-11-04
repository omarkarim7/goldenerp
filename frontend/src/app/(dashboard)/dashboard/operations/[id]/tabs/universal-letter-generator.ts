"use client";

import JSZip from "jszip";
import {
  escapeXml,
  buildQrAnchorXml,
  injectSingleQrIntoDocXml,
  cleanAllDocxXml,
  buildOfficialSignaturesTableXml,
  replaceDocxChairman,
  replaceDocxScope,
  replaceDocxFiscalAndDate,
  getOperationRecipientTitle,
  getOperationFiscalYear,
  getOperationTechnicalOpeningDate,
  getOperationTenderMethod,
  getStandardDocQrPayload,
  generateHighResDocQrBuffer,
  getLetterSpecificRegistrationNumber,
  fetchDocxTemplateArrayBuffer,
  replaceDocxStandardHeaderFooter,
} from "./letter-utils";
import {
  isExellentCompany,
  generateExellentBookletWithdrawalDocx,
  generateExellentInsurancePaymentDocx,
  generateExellentBookletAndInsuranceDocx,
  generateExellentBankGuaranteeDocx,
  generateExellentDeclarationSpecsDocx,
  generateExellentDeclarationInsuranceDocx,
  generateExellentGeneralLetterDocx,
  generateExellentClarificationDocx,
  generateExellentGrievanceDocx,
  generateExellentFinalInsuranceCashDocx,
  generateExellentFinalInsuranceDeductionDocx,
  generateExellentFinalInsuranceDeductionAndInitialDocx,
  generateExellentFinalInsuranceRefundDocx,
  generateExellentWarrantyCertificateDocx,
} from "./exellent-letter-engine";
import { Operation, tafqeetArabic, formatDate } from "./types";
import { getPdfBlobFromDocx } from "./client-pdf";

export interface UniversalLetterResult {
  docxBlob: Blob;
  pdfBlob: Blob;
  fileName: string;
  title: string;
}

export function detectLetterTypeFromId(id: string): {
  category: "booklet" | "declaration" | "clarification" | "technical" | "financial" | "guarantee" | "warranty" | "grievance" | "refund";
  subType: string;
  title: string;
  templateFile: string;
} {
  const cleanId = id.toLowerCase();

  // 1. Booklet Letters
  if (cleanId.includes("bank_guarantee_letter")) {
    return {
      category: "booklet",
      subType: "bank_guarantee_letter",
      title: "خطاب موجه للبنك لإصدار خطاب ضمان بنكي",
      templateFile: "bank_guarantee_letter_template.docx",
    };
  }
  if (cleanId.includes("booklet_withdrawal") || (cleanId.includes("booklet") && !cleanId.includes("insurance") && !cleanId.includes("guarantee"))) {
    return {
      category: "booklet",
      subType: "booklet_withdrawal",
      title: "خطاب سحب كراسة الشروط والمواصفات",
      templateFile: "booklet_withdrawal_template.docx",
    };
  }
  if (cleanId.includes("insurance_payment") || cleanId.includes("letter-booklet-insurance")) {
    return {
      category: "booklet",
      subType: "insurance_payment",
      title: "خطاب سداد التأمين الابتدائي القانوني",
      templateFile: "insurance_payment_template.docx",
    };
  }
  if (cleanId.includes("booklet_and_insurance")) {
    return {
      category: "booklet",
      subType: "booklet_and_insurance",
      title: "خطاب سحب الكراسة وسداد التأمين معاً",
      templateFile: "booklet_and_insurance_template.docx",
    };
  }
  if (cleanId.includes("insurance_deduction_other") || cleanId.includes("deduction_other") || (cleanId.includes("خصم") && cleanId.includes("مستحقات"))) {
    return {
      category: "booklet",
      subType: "insurance_deduction_other",
      title: "خطاب سداد التأمين الابتدائي بخصم من مستحقات الشركة في عملية أخرى",
      templateFile: "insurance_deduction_other_template.docx",
    };
  }

  // 2. Declarations
  if (cleanId.includes("specs") || cleanId.includes("decl-specs")) {
    return {
      category: "declaration",
      subType: "specs",
      title: "إقرار الالتزام بكراسة الشروط والمواصفات",
      templateFile: "declaration_specs_template.docx",
    };
  }
  if (cleanId.includes("insurance") || cleanId.includes("decl-insurance")) {
    return {
      category: "declaration",
      subType: "insurance",
      title: "إقرار الالتزام بالتأمينات والعمالة والمساواة",
      templateFile: "declaration_insurance_template.docx",
    };
  }
  if (cleanId.includes("decl-general") || cleanId.includes("general_letter")) {
    return {
      category: "declaration",
      subType: "general",
      title: "الخطاب الرسمي الموجه لجهة الإسناد",
      templateFile: "general_letter_template.docx",
    };
  }

  // 3. Clarifications
  if (cleanId.includes("clarification")) {
    return {
      category: "clarification",
      subType: "clarification",
      title: "خطاب التوضيح والاستفسارات الرسمي",
      templateFile: "clarification_letter_template.docx",
    };
  }

  // 4. Technical Offer
  if (cleanId.includes("technical")) {
    return {
      category: "technical",
      subType: "technical",
      title: "العرض الفني والمواصفات الفنية",
      templateFile: "technical_offer_template.docx",
    };
  }

  // 5. Financial Offer
  if (cleanId.includes("financial")) {
    return {
      category: "financial",
      subType: "financial",
      title: "العرض المالي وجدول الأسعار والتفقيط",
      templateFile: "financial_offer_template.docx",
    };
  }

  // 6. Warranty Certificate
  if (cleanId.includes("warranty")) {
    return {
      category: "warranty",
      subType: "warranty",
      title: "شهادة الضمان المعتمدة للأصناف الموردة",
      templateFile: "warranty_certificate_template.docx",
    };
  }

  // 7. Final Guarantees
  if (cleanId.includes("cash")) {
    return {
      category: "guarantee",
      subType: "CASH",
      title: "خطاب سداد التأمين النهائي نقداً بالخزينة",
      templateFile: "final_insurance_cash_template.docx",
    };
  }
  if (cleanId.includes("bank_guarantee") || cleanId.includes("guarantee_letter")) {
    return {
      category: "guarantee",
      subType: "BANK_GUARANTEE",
      title: "خطاب إصدار خطاب ضمان بنكي للتأمين النهائي",
      templateFile: "final_insurance_bank_guarantee_template.docx",
    };
  }
  if (cleanId.includes("deduction_and_initial") || cleanId.includes("deduction_and_transfer")) {
    return {
      category: "guarantee",
      subType: "DEDUCTION_AND_INITIAL",
      title: "خطاب خصم التأمين النهائي وتحويل التأمين الابتدائي",
      templateFile: "final_insurance_deduction_and_initial_template.docx",
    };
  }
  if (cleanId.includes("deduction")) {
    return {
      category: "guarantee",
      subType: "DEDUCTION",
      title: "خطاب خصم التأمين النهائي من مستحقات عملية أخرى",
      templateFile: "final_insurance_deduction_template.docx",
    };
  }
  if (cleanId.includes("initial_transfer")) {
    return {
      category: "guarantee",
      subType: "INITIAL_TRANSFER",
      title: "خطاب تحويل التأمين الابتدائي إلى نهائي",
      templateFile: "final_insurance_initial_transfer_template.docx",
    };
  }

  // 8. Grievance
  if (cleanId.includes("grievance")) {
    const isTech = cleanId.includes("tech");
    return {
      category: "grievance",
      subType: isTech ? "TECH" : "FIN",
      title: isTech ? "خطاب التظلم الفني الرسمي" : "خطاب التظلم المالي الرسمي",
      templateFile: "grievance_letter_template.docx",
    };
  }

  // 9. Refund
  if (cleanId.includes("refund")) {
    return {
      category: "refund",
      subType: "refund",
      title: "خطاب استرداد التأمين النهائي المعتمد",
      templateFile: "final_insurance_refund_template.docx",
    };
  }

  // Default fallback to general letter
  return {
    category: "declaration",
    subType: "general",
    title: "مستند رسمي معتمد",
    templateFile: "general_letter_template.docx",
  };
}

export async function generateUniversalLetterDocxBlob(
  letterId: string,
  op: Operation,
  companyRel?: any
): Promise<{ blob: Blob; fileName: string; title: string }> {
  const meta = detectLetterTypeFromId(letterId);

  // قراءة بيانات التخزين من op.notes
  let notesObj: any = {};
  try {
    if (op.notes && op.notes.startsWith("{")) {
      notesObj = JSON.parse(op.notes);
    }
  } catch {}

  const currentCompanyRel =
    companyRel ||
    op.companies?.[0] || {
      company: {
        name: "المجموعة الذهبية",
        commercialRegister: "110200700036620",
        taxCard: "658369652",
        phone: "01091708818",
        address: "بدمنهور - البحيرة",
        email: "goldengolden8818@gmail.com",
      },
      displayCode: "AZ",
    };

  const buffer = await fetchDocxTemplateArrayBuffer(meta.templateFile, currentCompanyRel);
  const zip = await JSZip.loadAsync(buffer);

  const comp = currentCompanyRel.company || {};
  const compCode = currentCompanyRel.displayCode || "AZ";

  // إعداد المتغيرات الشائعة
  const savedSub =
    meta.category === "booklet"
      ? notesObj.bookletLettersDocx
      : meta.category === "declaration"
      ? notesObj.declarationsDocx
      : meta.category === "clarification"
      ? notesObj.clarificationLetterDocx
      : meta.category === "technical"
      ? notesObj.technicalOfferDocx
      : meta.category === "financial"
      ? notesObj.financialOfferDocx
      : meta.category === "guarantee"
      ? notesObj.finalGuaranteeLetter
      : meta.category === "warranty"
      ? notesObj.warrantyCertificate
      : meta.category === "grievance"
      ? meta.subType === "TECH"
        ? (notesObj.grievanceLetterTech || notesObj.technicalGrievanceLetterDocx)
        : (notesObj.grievanceLetterFin || notesObj.financialGrievanceLetterDocx)
      : meta.category === "refund"
      ? (notesObj.finalInsuranceRefundLetter || notesObj.finalInsuranceRefund)
      : {};

  const regNum =
    savedSub?.registrationNumber ||
    savedSub?.letterRegNumbers?.[meta.subType] ||
    getLetterSpecificRegistrationNumber(op, meta.subType, compCode);

  const recipientPrefix = savedSub?.recipientPrefix || "الأستاذ";
  const recipientTitle = getOperationRecipientTitle(op, savedSub?.recipientTitleAndAuthority);
  const opName = savedSub?.operationRegisteredName || op.name || "العملية المسجلة";
  const opNumber = savedSub?.operationNumber || op.externalNumber || (op.serialNumber ? String(op.serialNumber) : "") || "1";
  const rawTenderMethod = savedSub?.tenderMethod || getOperationTenderMethod(op);
  const opScope = savedSub?.operationScope || op.notes || "";
  const fiscalYear = savedSub?.fiscalYear || getOperationFiscalYear(op);
  const technicalOpeningDate = savedSub?.technicalOpeningDate || getOperationTechnicalOpeningDate(op);

  const specialistTitle = savedSub?.specialistTitle || "المختص :";
  const specialistName = savedSub?.specialistName || " ";
  const financeManagerName = savedSub?.financeManagerName || " ";
  const boardChairman = savedSub?.boardChairman || "رئيس مجلس الإدارة";

  const companyCommercialRegister = savedSub?.companyCommercialRegister || comp.commercialRegister || "110200700036620";
  const companyTaxCard = savedSub?.companyTaxCard || comp.taxCard || "658369652";
  const companyOpCode = savedSub?.companyOpCode || compCode || `AZ-0${op.serialNumber || 1}`;
  const outgoingDate = savedSub?.outgoingDate || new Date().toLocaleDateString("en-GB");
  const phoneWhatsapp = savedSub?.phoneWhatsapp || comp.phone || "01091708818";
  const phoneMobile = savedSub?.phoneMobile || "01557018818";
  const companyAddress = savedSub?.companyAddress || comp.address || "بجوار مستشفى ليدى كير - بدمنهور - البحيره";
  const isEx = isExellentCompany(currentCompanyRel);
  const companyEmail = savedSub?.companyEmail || comp.email || (isEx ? "exellentservice@gmail.com" : "goldengolden8818@gmail.com");
  const companyOtherDetails = savedSub?.companyOtherDetails || "";

  // ━━━ المسار المخصص المستقل لشركة إكسلنت (B) ━━━
  if (isExellentCompany(currentCompanyRel)) {
    let qrBinary: Uint8Array | null = null;
    try {
      const filename = `${meta.subType}_${regNum}.pdf`;
      const qrPayload = await getStandardDocQrPayload("", regNum, meta.title, comp.name || "إكسلنت سرفيس", filename);
      qrBinary = await generateHighResDocQrBuffer(qrPayload);
    } catch {}

    const commonParams = {
      recipientPrefix,
      recipientTitleAndAuthority: recipientTitle,
      operationRegisteredName: opName,
      operationNumber: opNumber,
      tenderMethod: rawTenderMethod,
      operationScope: opScope,
      fiscalYear,
      technicalOpeningDate,
      specialistName,
      financeManagerName,
      boardChairman,
      companyCommercialRegister,
      companyTaxCard,
      companyOpCode,
      outgoingDate,
      registrationNumber: regNum,
      companyAddress,
      phoneWhatsapp,
      phoneMobile,
      companyEmail,
      companyOtherDetails,
      qrBinary,
    };

    let exDocxBlob: Blob;
    if (meta.category === "booklet") {
      if (meta.subType === "bank_guarantee_letter") {
        exDocxBlob = await generateExellentBankGuaranteeDocx({
          ...commonParams,
          bankRecipientPrefix: recipientPrefix,
          bankName: savedSub?.bankName || "مصر",
          bankBranch: savedSub?.bankBranch || "دمنهور",
          guaranteeType: (savedSub?.bankGuaranteeType || "ابتدائي") as any,
          authorityName: savedSub?.authorityName || op.authority,
          authorityAddress: savedSub?.authorityAddress || "البحيرة – دمنهور - خلف مستشفى الصدر",
          actionText: "قبول إصدار خطاب ضمان",
          bankGuaranteeAmount: savedSub?.bankGuaranteeAmount || "37547",
          bankGuaranteeTafqeet: savedSub?.bankGuaranteeTafqeet,
          guaranteePercentage: savedSub?.guaranteePercentage || "5 %",
          operationTotalAmount: savedSub?.operationTotalAmount,
          operationTotalTafqeet: savedSub?.operationTotalTafqeet,
          guaranteeDurationText: savedSub?.guaranteeDurationText || "سنة",
          guaranteeStartDate: savedSub?.guaranteeStartDate,
          guaranteeEndDate: savedSub?.guaranteeEndDate,
          bankAccountNumber: savedSub?.bankAccountNumber,
          accountBankName: savedSub?.accountBankName,
          accountOwnerName: savedSub?.accountOwnerName,
          accountOwnerNationalId: savedSub?.accountOwnerNationalId,
        });
      } else if (meta.subType === "insurance_payment") {
        exDocxBlob = await generateExellentInsurancePaymentDocx({
          ...commonParams,
          insuranceAmount: savedSub?.insuranceAmount,
          insuranceTafqeet: savedSub?.insuranceTafqeet,
          delegateName: savedSub?.delegateName,
          delegateTitle: savedSub?.delegateTitle,
          delegateNationalId: savedSub?.delegateNationalId,
          delegatePowers: savedSub?.delegatePowers,
          additionalNotes: savedSub?.additionalNotes,
        });
      } else if (meta.subType === "booklet_and_insurance") {
        exDocxBlob = await generateExellentBookletAndInsuranceDocx({
          ...commonParams,
          insuranceAmount: savedSub?.insuranceAmount,
          insuranceTafqeet: savedSub?.insuranceTafqeet,
          delegateName: savedSub?.delegateName,
          delegateTitle: savedSub?.delegateTitle,
          delegateNationalId: savedSub?.delegateNationalId,
          delegatePowers: savedSub?.delegatePowers,
          additionalNotes: savedSub?.additionalNotes,
        });
      } else {
        exDocxBlob = await generateExellentBookletWithdrawalDocx({
          ...commonParams,
          delegateName: savedSub?.delegateName,
          delegateTitle: savedSub?.delegateTitle,
          delegateNationalId: savedSub?.delegateNationalId,
          delegatePowers: savedSub?.delegatePowers,
          additionalNotes: savedSub?.additionalNotes,
        });
      }
    } else if (meta.category === "declaration") {
      if (meta.subType === "specs") {
        exDocxBlob = await generateExellentDeclarationSpecsDocx({
          ...commonParams,
          companyName: savedSub?.declaringCompanyName || comp.name || "اكسلانت سرفيس للنظافه والصيانه والنقل والخدمات والتوريدات",
          preambleTitle: savedSub?.specsPreambleTitle || "إقرار الإلتزام بكراسة الشروط والمواصفات",
          commitmentDetails: savedSub?.specsCommitment || "بكل ما جاء بكراسة الشروط والمواصفات وتوضح",
          additionalNotes: savedSub?.additionalNotes,
        });
      } else if (meta.subType === "insurance") {
        exDocxBlob = await generateExellentDeclarationInsuranceDocx({
          ...commonParams,
          companyName: savedSub?.declaringCompanyName || comp.name || "اكسلانت سرفيس للنظافه والصيانه والنقل والخدمات والتوريدات",
          preambleTitle: savedSub?.insurancePreambleTitle || "إقرار الإلتزام بالتأمينات والعماله الغير منتظمه والمساواه بين العاملين",
          commitmentDetails: savedSub?.insuranceCommitment || "بسداد نسبة التأمينات على المقاولات والعماله الغير منتظمه وحسن التعامل مع العاملين بالشركة وعدم التفرقه بينهم",
          additionalNotes: savedSub?.additionalNotes,
        });
      } else {
        exDocxBlob = await generateExellentGeneralLetterDocx({
          ...commonParams,
          letterSubject: savedSub?.generalSubject || op.name,
          letterBody: savedSub?.generalBody,
        });
      }
    } else if (meta.category === "clarification") {
      exDocxBlob = await generateExellentClarificationDocx({
        ...commonParams,
        clarificationSubject: "توضيح واستفسار للأصناف والمواعيد",
        items: savedSub?.inquiries || [],
        inquiryNatureText: savedSub?.inquiryAspect,
        requestedAction: savedSub?.companyRequest,
      });
    } else if (meta.category === "grievance") {
      exDocxBlob = await generateExellentGrievanceDocx({
        ...commonParams,
        grievanceStageTitle: savedSub?.grievanceSubject || "نتيجة البت الفني",
        items: savedSub?.grievanceItems || [],
        grievanceAspectText: savedSub?.grievanceNotes,
        grievanceRequestText: savedSub?.requestedAction,
      });
    } else if (meta.category === "refund") {
      exDocxBlob = await generateExellentFinalInsuranceRefundDocx({
        ...commonParams,
        refundAmount: savedSub?.refundAmount,
        refundTafqeet: savedSub?.refundTafqeet,
        paymentMethod: savedSub?.paymentMethod,
        deductionOperationName: savedSub?.deductionOperationName,
        deductionMonth: savedSub?.deductionMonth,
        deductionYear: savedSub?.deductionYear,
        receiptNumber: savedSub?.receiptNumber,
        receiptDate: savedSub?.receiptDate,
        bankName: savedSub?.bankName,
        bankBranch: savedSub?.bankBranch,
        accountHolderName: savedSub?.accountHolderName,
        bankAccountNumber: savedSub?.bankAccountNumber,
        accountNationalId: savedSub?.accountNationalId,
        attachmentType: savedSub?.attachmentType,
        attachmentNote: savedSub?.attachmentNote,
      });
    } else if (meta.category === "warranty") {
      exDocxBlob = await generateExellentWarrantyCertificateDocx({
        ...commonParams,
        companyName: comp.name || "إكسلنت سرفيس",
        items: savedSub?.items || [],
        warrantyDuration: savedSub?.warrantyDuration,
        warrantyCoverage: savedSub?.warrantyCoverage,
        case1: savedSub?.case1,
        case2: savedSub?.case2,
        case3: savedSub?.case3,
        case4: savedSub?.case4,
        validityDuration: savedSub?.validityDuration,
      });
    } else if (meta.category === "guarantee") {
      if (meta.subType === "BANK_GUARANTEE") {
        exDocxBlob = await generateExellentBankGuaranteeDocx({
          ...commonParams,
          bankRecipientPrefix: recipientPrefix,
          bankName: savedSub?.bankName || "مصر",
          bankBranch: savedSub?.bankNameAndBranch || "دمنهور",
          guaranteeType: "نهائي",
          authorityName: savedSub?.bankTargetAuthority || op.authority,
          authorityAddress: savedSub?.bankTargetAddress || "البحيرة – دمنهور - خلف مستشفى الصدر",
          actionText: "قبول إصدار خطاب ضمان",
          bankGuaranteeAmount: savedSub?.amountPaid || "37547",
          bankGuaranteeTafqeet: savedSub?.amountPaidTafqeet,
          guaranteePercentage: `${savedSub?.guaranteeRate || 5} %`,
          operationTotalAmount: savedSub?.totalAwardAmount,
          operationTotalTafqeet: savedSub?.totalAwardTafqeet,
          guaranteeDurationText: savedSub?.guaranteeDurationText || "سنة",
          guaranteeStartDate: savedSub?.guaranteeStartDate,
          guaranteeEndDate: savedSub?.guaranteeEndDate,
          bankAccountNumber: savedSub?.bankAccountNumber,
          accountBankName: savedSub?.bankNameAndBranch,
          accountOwnerName: savedSub?.accountHolderName,
          accountOwnerNationalId: savedSub?.accountNationalId,
        });
      } else if (meta.subType === "DEDUCTION") {
        exDocxBlob = await generateExellentFinalInsuranceDeductionDocx({
          ...commonParams,
          insuranceAmount: savedSub?.amountPaid,
          insuranceTafqeet: savedSub?.amountPaidTafqeet,
          deductionOperationName: savedSub?.deductionOperationName,
          deductionMonth: savedSub?.deductionMonth,
          deductionYear: savedSub?.deductionYear,
          guaranteePercentage: `${savedSub?.guaranteeRate || 5} %`,
          operationTotalAmount: savedSub?.totalAwardAmount,
          operationTotalTafqeet: savedSub?.totalAwardTafqeet,
        });
      } else if (meta.subType === "DEDUCTION_AND_INITIAL" || meta.subType === "INITIAL_TRANSFER") {
        exDocxBlob = await generateExellentFinalInsuranceDeductionAndInitialDocx({
          ...commonParams,
          cashAmount: savedSub?.amountPaid,
          cashTafqeet: savedSub?.amountPaidTafqeet,
          initialTransferredAmount: savedSub?.initialGuaranteeFieldAmount,
          initialTransferredTafqeet: savedSub?.initialGuaranteeFieldAmountTafqeet,
          guaranteePercentage: `${savedSub?.guaranteeRate || 5} %`,
          operationTotalAmount: savedSub?.totalAwardAmount,
          operationTotalTafqeet: savedSub?.totalAwardTafqeet,
        });
      } else {
        exDocxBlob = await generateExellentFinalInsuranceCashDocx({
          ...commonParams,
          insuranceAmount: savedSub?.amountPaid,
          insuranceTafqeet: savedSub?.amountPaidTafqeet,
          guaranteePercentage: `${savedSub?.guaranteeRate || 5} %`,
          operationTotalAmount: savedSub?.totalAwardAmount,
          operationTotalTafqeet: savedSub?.totalAwardTafqeet,
        });
      }
    } else {
      exDocxBlob = await generateExellentGeneralLetterDocx({
        ...commonParams,
        letterSubject: op.name,
      });
    }

    const outFileName = `${meta.subType}_${regNum || op.serialNumber || "doc"}.docx`;
    return {
      blob: exDocxBlob,
      fileName: outFileName,
      title: meta.title,
    };
  }

  // توليد رمز QR الموثق
  let qrDrawingXml = "";
  try {
    const filename = `${meta.subType}_${regNum}.pdf`;
    const qrPayload = await getStandardDocQrPayload("", regNum, meta.title, comp.name || "المجموعة الذهبية", filename);
    const qrBinary = await generateHighResDocQrBuffer(qrPayload);

    zip.file("word/media/doc_qr.png", qrBinary);

    let relsXml = await zip.file("word/_rels/document.xml.rels")?.async("text");
    if (relsXml && !relsXml.includes("rIdQR")) {
      relsXml = relsXml.replace(
        "</Relationships>",
        '<Relationship Id="rIdQR" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/doc_qr.png"/></Relationships>'
      );
      zip.file("word/_rels/document.xml.rels", relsXml);
    }

    let ctXml = await zip.file("[Content_Types].xml")?.async("text");
    if (ctXml && !ctXml.includes('Extension="png"')) {
      ctXml = ctXml.replace("</Types>", '<Default Extension="png" ContentType="image/png"/></Types>');
      zip.file("[Content_Types].xml", ctXml);
    }

    qrDrawingXml = buildQrAnchorXml();
  } catch (e) {
    console.warn("QR injection failed in universal letter generator:", e);
  }

  // 1. معالجة word/document.xml
  let docXml = await zip.file("word/document.xml")!.async("text");
  docXml = injectSingleQrIntoDocXml(docXml, qrDrawingXml, escapeXml(regNum));

  // استبدال المرسل إليه
  docXml = docXml.replace(/الأستاذ/g, escapeXml(recipientPrefix));
  docXml = docXml.replace(/مدير الادارة العامة للمشتريات والمخازن بجامعة دمنهور/g, escapeXml(recipientTitle));

  // استبدال بيانات العملية
  docXml = docXml.replace(/اسم العملية المسجله[\s\.]*/g, escapeXml(opName) + " ");
  docXml = docXml.replace(/365/g, escapeXml(opNumber));

  // أسلوب الطرح
  const cleanMethod = (rawTenderMethod || "").trim();
  const methodWithBa = cleanMethod.startsWith("ب") ? cleanMethod : `بـ${cleanMethod}`;
  docXml = docXml.replace(/(ب)?(?:المناقصة\s+ال[\s\S]*?محدود[\s\S]*?ة|المناقصة\s+المحدودة)/g, (_m, hasB) => {
    return hasB ? escapeXml(methodWithBa) : escapeXml(cleanMethod || "المناقصة العامة");
  });

  // النطاق والسنة والتاريخ
  docXml = replaceDocxScope(docXml, opScope);
  docXml = replaceDocxFiscalAndDate(docXml, fiscalYear, technicalOpeningDate);

  // التوقيعات
  const sigRegex = /<w:p\b[^>]*>(?:(?!<w:p\b)[\s\S])*?المختص[\s\S]*?رئيس مجلس[\s\S]*?<\/w:p>/;
  if (sigRegex.test(docXml)) {
    const sigTableXml = buildOfficialSignaturesTableXml({
      specialistTitle: specialistTitle || "المختص :",
      specialistName: specialistName || " ",
      financeManagerName: financeManagerName || " ",
      boardChairman: boardChairman || "رئيس مجلس الإدارة",
    });
    docXml = docXml.replace(sigRegex, sigTableXml);
  } else {
    docXml = replaceDocxChairman(docXml, boardChairman);
  }

  // استبدال بيانات خطابات الكراسة والتأمين الابتدائي
  if (meta.category === "booklet") {
    const delegateName = savedSub?.delegateName || "";
    const delegateTitle = savedSub?.delegateTitle || "مندوب التعاقدات المفوض";
    const delegateNationalId = savedSub?.delegateNationalId || "";
    const delegatePowers = savedSub?.delegatePowers || "والتوقيع على العقود واستلام الخطابات والمكاتبات الرسميه";
    const safeDelegate = delegateName && delegateName.length > 0 ? escapeXml(delegateName) : "................";

    docXml = docXml.replace(
      /(وتفوض\s+الشركة\s+السيد\s*\/\s*(?:[\(（]\s*)?)(?:أحمد محمد أحمد|[^\)]*?)(\s*[\)）])?(\s*وصفته)/g,
      `$1${safeDelegate}$2 وصفته`
    );
    docXml = docXml.replace(/أحمد محمد أحمد/g, safeDelegate);
    docXml = docXml.replace(/([^\s>])وصفته/g, "$1 وصفته");
    docXml = docXml.replace(/<w:t>وصفته/g, '<w:t xml:space="preserve"> وصفته');
    docXml = docXml.replace(/مندوب التعاقدات المفوض/g, escapeXml(delegateTitle));
    docXml = docXml.replace(/23056289523202/g, escapeXml(delegateNationalId || "................"));
    docXml = docXml.replace(/والتوقيع على العقود واستلام الخطابات والمكاتبات الرسميه/g, escapeXml(delegatePowers));

    const insuranceAmount = savedSub?.insuranceAmount;
    const insuranceTafqeet = savedSub?.insuranceTafqeet;
    if (insuranceAmount) {
      docXml = docXml.replace(/10000/g, escapeXml(insuranceAmount));
    }
    if (insuranceTafqeet) {
      const cleanTafqeet = (insuranceTafqeet || "")
        .replace(/^فقط\s*وقدره\s*:?\s*/i, "")
        .replace(/\s*لا\s*غير\s*$/i, "")
        .trim();
      docXml = docXml.replace(/عشرة ألاف(?:\s+جنيه)?(?:\s+لا\s*غير)?/g, escapeXml(cleanTafqeet || "عشرة ألاف جنيه"));
      docXml = docXml.replace(/لا\s*غير\s+لا\s*غير/g, "لا غير");
    }
  }

  // استبدال بيانات الإقرارات الرسمية
  if (meta.category === "declaration") {
    if (savedSub?.additionalNotes) {
      docXml = docXml.replace(/خان[ةه] خالي[ةه] للملاحظات/g, escapeXml(savedSub.additionalNotes));
    }
  }

  // استبدال بيانات خطاب الاستفسارات والتوضيحات
  if (meta.category === "clarification") {
    if (savedSub?.inquiryAspect) {
      docXml = docXml.replace(/عن نوع الاستفسار من الناحية\s*/g, escapeXml(savedSub.inquiryAspect) + " ");
    }
    if (savedSub?.companyRequest) {
      docXml = docXml.replace(/\(\s*\.{5,}\s*\)/g, `(${escapeXml(savedSub.companyRequest)})`);
    }
    if (savedSub?.subjectTarget) {
      docXml = docXml.replace(/للأصناف/g, escapeXml(savedSub.subjectTarget));
    }
  }

  // استبدال بيانات خطابات التأمين النهائي
  if (meta.category === "guarantee") {
    if (savedSub?.finalGuaranteeAmount) {
      docXml = docXml.replace(/37547/g, escapeXml(savedSub.finalGuaranteeAmount));
    }
    if (savedSub?.finalGuaranteeTafqeet) {
      docXml = docXml.replace(/سبعة وثلاثون ألفا وخمسمائة وسبعه وأربعون/g, escapeXml(savedSub.finalGuaranteeTafqeet));
    }
  }

  // بيانات خاصة بخطاب الضمان البنكي (الابتدائي)
  if (meta.subType === "bank_guarantee_letter") {
    const bankName = savedSub?.bankName || "مصر";
    const bankBranch = savedSub?.bankBranch || "دمنهور";
    const bankManagerTitle = savedSub?.bankManagerTitle || `مدير بنك ${bankName} فرع ${bankBranch}`;
    const bankGuaranteeAmount = savedSub?.bankGuaranteeAmount || "37547";
    const bankGuaranteeTafqeet = savedSub?.bankGuaranteeTafqeet || tafqeetArabic(Number(bankGuaranteeAmount) || 37547);
    const authorityName = savedSub?.authorityName || op.authority || "مديرية الصحة بالبحيرة";
    const authorityAddress = savedSub?.authorityAddress || "البحيرة – دمنهور - خلف مستشفى الصدر";

    docXml = docXml.replace(/مدير بنك[\s\S]*?(?:دمنهو[\s\S]*?ر|دمنهور)/g, escapeXml(bankManagerTitle));
    docXml = docXml.replace(/مصر /g, escapeXml(bankName) + " ");
    docXml = docXml.replace(/ دمنهو[\s\S]*?ر|دمنهور/g, `  ${escapeXml(bankBranch)}`);
    docXml = docXml.replace(/مديرية الصحة بالبحيرة/g, escapeXml(authorityName));
    docXml = docXml.replace(/البحيرة – دمنهور - خلف مستشفى الصدر/g, escapeXml(authorityAddress));
    docXml = docXml.replace(/37547/g, escapeXml(bankGuaranteeAmount));
    docXml = docXml.replace(/سبعة وثلاثون ألفا وخمسمائة وسبعه وأربعون/g, escapeXml(bankGuaranteeTafqeet));

    if (savedSub?.guaranteePercentage) {
      docXml = docXml.replace(/5 %/g, escapeXml(savedSub.guaranteePercentage));
    }
    if (savedSub?.operationTotalAmount) {
      docXml = docXml.replace(/47547/g, escapeXml(savedSub.operationTotalAmount));
    }
    if (savedSub?.operationTotalTafqeet) {
      docXml = docXml.replace(/سبعه وأربعون ألفا وخمسمائة وسبعه وأربعون/g, escapeXml(savedSub.operationTotalTafqeet));
    }

    const durationVal = (savedSub?.guaranteeDurationText || "سنة").trim();
    const durationRegex = /(<w:t[^>]*>[^<]*ومدة\s*الارتباط\s*بالتأمين[^<]*<\/w:t><\/w:r>)([\s\S]*?)(<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:t[^>]*>[^<]*تبدأ\s*من[^<]*<\/w:t>[\s\S]*?<\/w:r>)/;
    if (durationRegex.test(docXml)) {
      docXml = docXml.replace(
        durationRegex,
        `$1<w:r><w:rPr><w:rFonts w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ${escapeXml(durationVal)} </w:t></w:r>$3`
      );
    } else {
      docXml = docXml.replace(
        /(?:<w:t[^>]*>\s*)?سنتين[\s\S]*?ثلاثة\s*أشهر(?:\s*<\/w:t>)?/g,
        `<w:t xml:space="preserve"> ${escapeXml(durationVal)} </w:t>`
      );
    }
    docXml = docXml.replace(/سنتين[\s\S]*?ثلاثة أشهر/g, escapeXml(durationVal));

    if (savedSub?.guaranteeStartDate) {
      docXml = docXml.replace(/12\/12\/2027/g, escapeXml(savedSub.guaranteeStartDate));
    }
    if (savedSub?.guaranteeEndDate) {
      docXml = docXml.replace(/12\/12\s*\/2028/g, escapeXml(savedSub.guaranteeEndDate));
    }

    if (savedSub?.bankAccountNumber) {
      docXml = docXml.replace(/2670220000004113/g, escapeXml(savedSub.bankAccountNumber));
    }
    if (savedSub?.accountBankName) {
      docXml = docXml.replace(/مصر الاسلامى/g, escapeXml(savedSub.accountBankName));
    }
    if (savedSub?.accountOwnerName) {
      docXml = docXml.replace(/سـ*حر حسن محمد أحمد عبد السلام(?:\s+جولدن سرفيس)?/g, escapeXml(savedSub.accountOwnerName));
    }
    if (savedSub?.accountOwnerNationalId) {
      docXml = docXml.replace(/28912111802623/g, escapeXml(savedSub.accountOwnerNationalId));
    }
  }

  // بيانات خاصة بخطاب الضمان البنكي للتأمين النهائي
  if (meta.subType === "BANK_GUARANTEE") {
    const bankNameAndBranch = savedSub?.bankNameAndBranch || "مصر الاسلامى فرع دمنهور";
    const bankRecipientTitle = savedSub?.bankRecipientTitle || "مدير بنك مصر الاسلامي فرع دمنهور";
    const bankTargetAuthority = savedSub?.bankTargetAuthority || op.authority;
    const bankTargetAddress = savedSub?.bankTargetAddress || "البحيرة – دمنهور - خلف مستشفى الصدر";

    const recipientRegex = /(<w:t[^>]*>\s*\/\s*<\/w:t><\/w:r>)([\s\S]*?)(<\/w:p>)/;
    docXml = docXml.replace(recipientRegex, `$1<w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ${escapeXml(bankRecipientTitle)}</w:t></w:r>$3`);

    const bankAuthRegex = /(<w:t[^>]*>[^<]*الجهه[^<]*<\/w:t><\/w:r>)([\s\S]*?)(<\/w:p>)/;
    docXml = docXml.replace(bankAuthRegex, `$1<w:r><w:rPr><w:rFonts w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ${escapeXml(bankTargetAuthority)} وعنوانها : ${escapeXml(bankTargetAddress)}</w:t></w:r>$3`);

    const durationVal = (savedSub?.guaranteeDurationText || "سنة").trim();
    const durationRegex = /(<w:t[^>]*>[^<]*ومدة\s*الارتباط\s*بالتأمين[^<]*<\/w:t><\/w:r>)([\s\S]*?)(<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:t[^>]*>[^<]*تبدأ\s*من[^<]*<\/w:t>[\s\S]*?<\/w:r>)/;
    if (durationRegex.test(docXml)) {
      docXml = docXml.replace(
        durationRegex,
        `$1<w:r><w:rPr><w:rFonts w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ${escapeXml(durationVal)} </w:t></w:r>$3`
      );
    } else {
      docXml = docXml.replace(
        /(?:<w:t[^>]*>\s*)?سنتين[\s\S]*?ثلاثة\s*أشهر(?:\s*<\/w:t>)?/g,
        `<w:t xml:space="preserve"> ${escapeXml(durationVal)} </w:t>`
      );
    }
    docXml = docXml.replace(/سنتين[\s\S]*?ثلاثة أشهر/g, escapeXml(durationVal));

    if (savedSub?.guaranteeStartDate) {
      docXml = docXml.replace(/12\/12\/2027/g, escapeXml(savedSub.guaranteeStartDate));
    }
    if (savedSub?.guaranteeEndDate) {
      docXml = docXml.replace(/12\/12\s*\/2028/g, escapeXml(savedSub.guaranteeEndDate));
    }
    if (savedSub?.bankAccountNumber) {
      docXml = docXml.replace(/2670220000004113/g, escapeXml(savedSub.bankAccountNumber));
    }
    docXml = docXml.replace(/مصر الاسلامى\s+فرع\s+:\s+دمنهور/g, escapeXml(bankNameAndBranch));
    docXml = docXml.replace(/مصر الاسلامى/g, escapeXml(bankNameAndBranch));
    if (savedSub?.accountHolderName) {
      docXml = docXml.replace(/ســـحر حسن محمد أحمد عبد السلام(?:\s+جولدن سرفيس)?/g, escapeXml(savedSub.accountHolderName));
      docXml = docXml.replace(/سحر حسن محمد أحمد عبد السلام/g, escapeXml(savedSub.accountHolderName));
    }
    if (savedSub?.accountNationalId) {
      docXml = docXml.replace(/28912111802623/g, escapeXml(savedSub.accountNationalId));
    }
  }

  // بيانات خاصة بسداد التأمين بخصم من مستحقات أخرى
  if (meta.subType === "insurance_deduction_other") {
    const dedOp = savedSub?.deductionOperationName || "................";
    const dedMonth = savedSub?.deductionMonth || "............";
    const dedYear = savedSub?.deductionYear || ".....";

    docXml = docXml.replace(/(<w:t[^>]*>)(\.{10})(<\/w:t>)/, `$1${escapeXml(dedOp)}$3`);
    docXml = docXml.replace(/(<w:t[^>]*>)(\.{12})(<\/w:t>)/, `$1${escapeXml(dedMonth)}$3`);
    docXml = docXml.replace(/(<w:t[^>]*>)(\.{5})(<\/w:t>)/, `$1${escapeXml(dedYear)}$3`);

    docXml = docXml.replace(/(في عملية \()\.{3,}(\))/g, `في عملية (${escapeXml(dedOp)})`);
    docXml = docXml.replace(/(عن شهر \()\.{3,}(\))/g, `عن شهر (${escapeXml(dedMonth)})`);
    docXml = docXml.replace(/(سنة \()\.{3,}(\))/g, `سنة (${escapeXml(dedYear)})`);
  }

  // تنظيف علامات التمييز والأحمر
  docXml = docXml.replace(/<w:highlight\s+[^>]*\/>/g, "");
  docXml = docXml.replace(/<w:color\s+w:val=\"(red|FF0000)\"[^>]*\/>/g, "");
  docXml = docXml.replace(/خان[ةه] خالي[ةه] للملاحظات/g, "");

  zip.file("word/document.xml", docXml);

  // 2. ترويسات وتذييلات الصفحات (header & footer للشركتين جولدن وإكسلنت)
  await replaceDocxStandardHeaderFooter(zip, {
    companyCommercialRegister,
    companyTaxCard,
    companyOpCode,
    outgoingDate,
    registrationNumber: regNum,
    companyAddress,
    phoneWhatsapp,
    phoneMobile,
    companyEmail,
  });

  // تنظيف شامل
  await cleanAllDocxXml(zip);

  const docxBlob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const safeFileName = `${meta.title.replace(/[/\\?%*:|"<>]/g, "_")}_${regNum || op.serialNumber}`;

  return {
    blob: docxBlob,
    fileName: safeFileName,
    title: meta.title,
  };
}

export async function generateUniversalLetterPdfBlob(
  letterId: string,
  op: Operation,
  companyRel?: any
): Promise<{ blob: Blob; fileName: string; title: string }> {
  const { blob: docxBlob, fileName, title } = await generateUniversalLetterDocxBlob(letterId, op, companyRel);
  const pdfBlob = await getPdfBlobFromDocx(docxBlob, `${fileName}.docx`);
  return {
    blob: pdfBlob,
    fileName: `${fileName}.pdf`,
    title,
  };
}
