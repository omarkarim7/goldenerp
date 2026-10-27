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
} from "./letter-utils";
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
  const response = await fetch(`/templates/${meta.templateFile}`);
  if (!response.ok) {
    throw new Error(`فشل قراءة قالب الخطاب الرسمي (${meta.templateFile}) من خادم النظام`);
  }
  const buffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

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
        ? notesObj.grievanceLetterTech
        : notesObj.grievanceLetterFin
      : meta.category === "refund"
      ? notesObj.finalInsuranceRefund
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
  const companyEmail = savedSub?.companyEmail || comp.email || "goldengolden8818@gmail.com";

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

  // بيانات خاصة بخطاب الضمان البنكي
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
  }

  // تنظيف علامات التمييز والأحمر
  docXml = docXml.replace(/<w:highlight\s+[^>]*\/>/g, "");
  docXml = docXml.replace(/<w:color\s+w:val=\"(red|FF0000)\"[^>]*\/>/g, "");
  docXml = docXml.replace(/خان[ةه] خالي[ةه] للملاحظات/g, "");

  zip.file("word/document.xml", docXml);

  // 2. ترويسات الصفحات (header1, header2, header3)
  const headerFiles = ["word/header1.xml", "word/header2.xml", "word/header3.xml"];
  for (const hf of headerFiles) {
    if (zip.file(hf)) {
      let hXml = await zip.file(hf)!.async("text");
      hXml = hXml.replace(/110200700036620/g, escapeXml(companyCommercialRegister));
      hXml = hXml.replace(/658369652/g, escapeXml(companyTaxCard));
      hXml = hXml.replace(/\(\s*كود العملية بالشركه\s*\)/g, `( ${escapeXml(companyOpCode)} )`);
      hXml = hXml.replace(/كود العملية بالشركه/g, escapeXml(companyOpCode));
      hXml = hXml.replace(/<w:highlight\s+[^>]*\/>/g, "");
      hXml = hXml.replace(/<w:color\s+w:val=\"(red|FF0000)\"[^>]*\/>/g, "");
      zip.file(hf, hXml);
    }
  }

  // 3. تذييلات الصفحات (footer1, footer2, footer3)
  const footerFiles = ["word/footer1.xml", "word/footer2.xml", "word/footer3.xml"];
  for (const ff of footerFiles) {
    if (zip.file(ff)) {
      let fXml = await zip.file(ff)!.async("text");
      fXml = fXml.replace(/15\/10\/2026/g, escapeXml(outgoingDate));
      if (fXml.includes("رقم القيد")) {
        fXml = fXml.replace(/رقم القيد/g, `رقم القيد : ${escapeXml(regNum)}`);
      }
      fXml = fXml.replace(/\(\s*باركود المستند أو العمليه/g, `رقم القيد : ${escapeXml(regNum)}`);
      fXml = fXml.replace(/01091708818/g, escapeXml(phoneWhatsapp));
      fXml = fXml.replace(/01557018818/g, escapeXml(phoneMobile));
      fXml = fXml.replace(/بجوار مستشفى ليدى كير\s*-\s*بدمنهور\s*-\s*البح\s*يره/g, escapeXml(companyAddress));
      fXml = fXml.replace(/بجوار مستشفى ليدى كير\s*-\s*بدمنهور\s*-\s*البحيره/g, escapeXml(companyAddress));
      fXml = fXml.replace(/goldengolden8818@gmail.com/g, escapeXml(companyEmail));
      fXml = fXml.replace(/<w:highlight\s+[^>]*\/>/g, "");
      fXml = fXml.replace(/<w:color\s+w:val=\"(red|FF0000)\"[^>]*\/>/g, "");
      zip.file(ff, fXml);
    }
  }

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
