"use client";

import JSZip from "jszip";
import {
  escapeXml,
  buildQrAnchorXml,
  buildQrInlineXml,
  getStandardDocQrPayload,
  generateHighResDocQrBuffer,
  injectSingleQrIntoDocXml,
  formatNumericDate,
} from "./letter-utils";
import { Operation, tafqeetArabic } from "./types";

/**
 * فحص ما إذا كانت الشركة أو العملية تتبع شركة إكسلنت (الشركة ب)
 */
export function isExellentCompany(companyOrOp?: any, regNumOrCode?: string): boolean {
  if (regNumOrCode) {
    const r = String(regNumOrCode).trim().toUpperCase();
    if (r.startsWith("BZ") || r.startsWith("B-") || r.startsWith("B")) return true;
    if (r.startsWith("AZ") || r.startsWith("A-") || r.startsWith("A")) return false;
  }
  if (!companyOrOp) return false;
  if (typeof companyOrOp === "string") {
    const s = companyOrOp.trim();
    return (
      s === "B" ||
      s.startsWith("B-") ||
      s.startsWith("BZ") ||
      s.includes("إكسلنت") ||
      s.includes("إكسلانت") ||
      s.includes("اكسلانت") ||
      s.includes("اكسلنت") ||
      s.includes("العالمية") ||
      s.toLowerCase().includes("exellent")
    );
  }
  if (Array.isArray(companyOrOp?.companies) && companyOrOp.companies.length > 0) {
    const matched = companyOrOp.companies.some((c: any) => isExellentCompany(c));
    if (matched) return true;
  }
  const code = String(
    companyOrOp?.displayCode ||
    companyOrOp?.company?.code ||
    companyOrOp?.companyCode ||
    companyOrOp?.code ||
    ""
  ).toUpperCase();
  const name = String(
    companyOrOp?.company?.name ||
    companyOrOp?.companyName ||
    (typeof companyOrOp?.name === "string" &&
    (companyOrOp.name.includes("إكسل") ||
      companyOrOp.name.includes("اكسل") ||
      companyOrOp.name.includes("العالمية") ||
      companyOrOp.name.toLowerCase().includes("exellent"))
      ? companyOrOp.name
      : "")
  );
  return (
    code === "B" ||
    code.startsWith("B") ||
    name.includes("إكسلنت") ||
    name.includes("إكسلانت") ||
    name.includes("اكسلانت") ||
    name.includes("اكسلنت") ||
    name.includes("العالمية") ||
    name.toLowerCase().includes("exellent")
  );
}

/**
 * تحميل بافر قالب إكسلنت الحصري من /templates/exellent/
 */
export async function fetchExellentDocxTemplate(templateName: string): Promise<ArrayBuffer> {
  const cleanName = templateName
    .replace(/^\/+/, "")
    .replace(/^templates\//, "")
    .replace(/^exellent\//, "");
  const res = await fetch(`/templates/exellent/${cleanName}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`تعذر تحميل قالب إكسلنت: ${cleanName} (${res.statusText})`);
  }
  return await res.arrayBuffer();
}

/**
 * تنظيف علامات التحديد واللون الأحمر المتبقية من XML
 */

/**
 * تنظيف شامل لكافة خطابات إكسلنت من أي تكرار للتفقيط مثل (لا غير لا غير) وتثبيت (والخاصة) بالتاء المربوطة
 */
export function cleanDocxRepetitions(xml: string): string {
  xml = purgeTafqeetDuplicates(xml);
  return xml
    .replace(/(?:فقط\s*وقدره\s*[:\s]*){2,}/g, 'فقط وقدره : ')
    .replace(/فقط\s*:\s*فقط\s*وقدره/g, 'فقط وقدره : ')
    .replace(/والخاص\s+بالمناقصة/g, "والخاصة بالمناقصة")
    .replace(/والخاص\s+بالمزايدة/g, "والخاصة بالمزايدة")
    .replace(/والخاص\s+بالممارسة/g, "والخاصة بالممارسة")
    .replace(/والخاص\s+بالأمر/g, "والخاصة بالأمر")
    .replace(/(?:لا\s*غير\s*){2,}/g, "لا غير")
    .replace(/لا\s*غير\s+لا\s*غير/g, "لا غير")
    .replace(/لا\s*غير\s+(?:جنيهاً?\s*)?لا\s*غير/g, "جنيهاً لا غير")
    .replace(/جنيها\s*لا\s*غير\s+جنيها\s*لا\s*غير/g, "جنيهاً لا غير")
    .replace(/ضد\s+عيوب\s+الصناع[ةه]\s+في\s+ضد\s+كافة\s+عيوب\s+الصناع[ةه]/g, "ضد كافة عيوب الصناعة");
}

export function purgeExellentRedMarks(xml: string): string {
  return xml
    .replace(/<w:highlight\b[^>]*\/>/gi, "")
    .replace(/<w:color\b[^>]*w:val="(?:red|FF0000|ff0000)"[^>]*\/>/gi, "");
}
/**
 * تنظيف التفقيط من أي عبارات مكررة مثل "فقط وقدره" و "لا غير" لتناسب مكانها في القالب
 */
export function cleanTafqeetForTemplate(rawTafqeet?: string): string {
  if (!rawTafqeet) return "";
  return rawTafqeet
    .replace(/^(?:فقط\s*:?\s*)?(?:وقدره\s*:?\s*)?/gi, "")
    .replace(/\s*:\s*:\s*/g, ": ")
    .replace(/^:\s*/, "")
    .replace(/\s*(?:جنيه\s*مصري|جنيهاً?\s*مصرياً?|جنيهاً?|جنيه)?\s*لا\s*غير\s*$/gi, "")
    .replace(/\s*(?:جنيه\s*مصري|جنيهاً?\s*مصرياً?|جنيهاً?|جنيه)\s*$/gi, "")
    .trim();
}

/**
 * معالجة أي تكرارات محتملة لعبارات التفقيط مثل "لا غير لا غير" أو "فقط وقدره فقط وقدره"
 */
export function purgeTafqeetDuplicates(xml: string): string {
  return xml
    .replace(/(?:فقط\s*:?\s*)+(?:وقدره\s*:?\s*)+/g, "فقط وقدره : ")
    .replace(/فقط\s*:\s*فقط\s*:\s*/g, "فقط : ")
    .replace(/فقط\s*:\s*فقط\s*وقدره\s*:\s*/g, "فقط وقدره : ")
    .replace(/فقط\s*وقدره\s*:\s*:\s*/g, "فقط وقدره : ")
    .replace(/فقط\s*:\s*:\s*/g, "فقط : ")
    .replace(/\s*:\s*:\s*/g, ": ")
    .replace(/(?:لا\s*غير\s*)+/g, "لا غير")
    .replace(/لا\s*غير\s+(?:جنيهاً?\s*)?لا\s*غير/g, "جنيهاً لا غير")
    .replace(/جنيها\s*لا\s*غير\s+جنيها\s*لا\s*غير/g, "جنيهاً لا غير")
    .replace(/لا\s*غير\s+لا\s*غير/g, "لا غير");
}


/**
 * استبدال الترويسة والتذييل الخاصة بشركة إكسلنت بدقة متناهية
 */
export async function applyExellentHeaderFooter(
  zip: any,
  params: {
    companyCommercialRegister?: string;
    companyTaxCard?: string;
    companyOpCode?: string;
    outgoingDate?: string;
    registrationNumber?: string;
    companyAddress?: string;
    phoneWhatsapp?: string;
    phoneMobile?: string;
    companyEmail?: string;
    companyOtherDetails?: string;
    qrBinary?: Uint8Array | null;
  }
): Promise<void> {
  const cr = escapeXml((params.companyCommercialRegister || "04042").trim());
  const tax = escapeXml((params.companyTaxCard || "7755731744").trim());
  const opCode = escapeXml((params.companyOpCode || "BZ-01").trim());
  const outDate = escapeXml((params.outgoingDate || formatNumericDate(new Date())).trim());
  const regNum = escapeXml((params.registrationNumber || "").trim());
  const mobile = escapeXml((params.phoneMobile || "01557018818").trim());
  const address = escapeXml((params.companyAddress || "عقار رقم 9 – شارع بيت الطالبات خلف مديرية الاسكان – دمنهور – البحيرة").trim());
  const email = escapeXml((params.companyEmail || "exellentservice@gmail.com").trim());
  const otherDetails = escapeXml((params.companyOtherDetails || "").trim());
  const phone = escapeXml((params.phoneWhatsapp || "01091708818").trim());

  // 1. تضمين صورة الباركود في الترويسة إذا توفرت
  if (params.qrBinary) {
    try {
      zip.file("word/media/header_qr.png", params.qrBinary);
      zip.file("word/media/doc_qr.png", params.qrBinary);

      const relsEntries = Object.keys(zip.files).filter((k) =>
        k.startsWith("word/_rels/header") && k.endsWith(".xml.rels")
      );

      for (const relPath of relsEntries) {
        let relsContent = await zip.file(relPath)?.async("text");
        if (relsContent && !relsContent.includes("rIdHeaderQr")) {
          relsContent = relsContent.replace(
            "</Relationships>",
            '<Relationship Id="rIdHeaderQr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/header_qr.png"/></Relationships>'
          );
          zip.file(relPath, relsContent);
        }
      }

      if (!relsEntries.includes("word/_rels/header2.xml.rels") && zip.file("word/header2.xml")) {
        zip.file(
          "word/_rels/header2.xml.rels",
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdHeaderQr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/header_qr.png"/></Relationships>'
        );
      }

      // دعم علاقات جسم المستند أيضاً لضمان سلامة أي مراجع
      let docRels = await zip.file("word/_rels/document.xml.rels")?.async("text");
      if (docRels && !docRels.includes("rIdQR")) {
        docRels = docRels.replace(
          "</Relationships>",
          '<Relationship Id="rIdQR" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/doc_qr.png"/></Relationships>'
        );
        zip.file("word/_rels/document.xml.rels", docRels);
      }

      let ct = await zip.file("[Content_Types].xml")?.async("text");
      if (ct && !ct.includes('Extension="png"')) {
        ct = ct.replace("</Types>", '<Default Extension="png" ContentType="image/png"/></Types>');
        zip.file("[Content_Types].xml", ct);
      }
    } catch (e) {
      console.warn("Exellent header QR attachment error:", e);
    }
  }

  // 2. تحديث ملفات الهيدر
  const headerFiles = Object.keys(zip.files).filter(
    (k) => k.startsWith("word/header") && k.endsWith(".xml")
  );

  for (const hFile of headerFiles) {
    let hXml = await zip.file(hFile)?.async("text");
    if (!hXml) continue;

    // استبدال نص "الباركود" برسم الباركود الفعلي أو إفراغه
    const barcodeRegex = /<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?الباركود[\s\S]*?<\/w:r>/g;
    if (params.qrBinary) {
      const qrInline = buildQrInlineXml(1020000).replace(/rIdQR/g, "rIdHeaderQr");
      if (barcodeRegex.test(hXml)) {
        hXml = hXml.replace(barcodeRegex, qrInline);
      } else if (hXml.includes("الباركود")) {
        hXml = hXml.replace(/(<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?)(?:الباركود)([\s\S]*?<\/w:p>)/g, `$1${qrInline}$2`);
      }
    } else {
      hXml = hXml.replace(barcodeRegex, "<w:r><w:t></w:t></w:r>");
    }
    hXml = hXml.replace(/الباركود/g, "");

    // استبدال قيم الترويسة بالقيم المحددة
    hXml = hXml.replace(/04042/g, cr);
    hXml = hXml.replace(/7755731744/g, tax);
    hXml = hXml.replace(/\(\s*كود العملية بالشركه\s*\)/g, `( ${opCode} )`);
    hXml = hXml.replace(/15\/10\/2026/g, outDate);
    hXml = hXml.replace(/رقم القيد:/g, `رقم القيد: ${regNum}`);

    hXml = purgeExellentRedMarks(hXml);
    zip.file(hFile, hXml);
  }

  // 3. تحديث ملفات الفوتر
  const footerFiles = Object.keys(zip.files).filter(
    (k) => k.startsWith("word/footer") && k.endsWith(".xml")
  );

  for (const fFile of footerFiles) {
    let fXml = await zip.file(fFile)?.async("text");
    if (!fXml) continue;

    // استبدال أرقام الهواتف بدقة
    fXml = fXml.replace(/1111111111111/g, mobile);
    fXml = fXml.replace(/1111111/g, phone);

    // استبدال العنوان فقط إذا تم تغييره عن العنوان الافتراضي مع الحفاظ التام على بنية ومقاس الخط
    const defaultAddress = "عقار رقم 9 – شارع بيت الطالبات خلف مديرية الاسكان – دمنهور – البحيرة";
    const cleanAddress = (address || "").trim();

    if (cleanAddress && cleanAddress !== defaultAddress) {
      let formattedAddress = cleanAddress;
      if (formattedAddress.startsWith("العنوان :") || formattedAddress.startsWith("العنوان:")) {
        formattedAddress = formattedAddress.replace(/^العنوان\s*:\s*/, "");
      }
      const addrPattern = /(<w:p\b[^>]*>(?:<w:pPr>[\s\S]*?<\/w:pPr>)?)(?:(?!<\/w:p>)[\s\S])*?العنوان\s*:\s*عقار رقم(?:(?!<\/w:p>)[\s\S])*?(<\/w:p>)/g;
      const addrRun = `<w:r><w:rPr><w:rFonts w:ascii="Arial Unicode MS" w:eastAsia="Arial Unicode MS" w:hAnsi="Arial Unicode MS" w:cs="Arial Unicode MS"/><w:b/><w:bCs/><w:i/><w:iCs/><w:sz w:val="20"/><w:szCs w:val="20"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">العنوان : ${formattedAddress}                               </w:t></w:r>`;
      fXml = fXml.replace(addrPattern, `$1${addrRun}$2`);
      fXml = fXml.replace(/عقار رقم 9 – شارع بيت الطالبات خلف مديرية الاسكان – دمنهور – البحيرة/g, formattedAddress);
    }

    // استبدال البريد الإلكتروني وتفاصيل التذييل بالمنطق الذكي المعتمد 100%
    const rawInput = (email || otherDetails || "").trim();
    let displayFooter = "";
    if (rawInput) {
      if (
        rawInput.startsWith("إيميل") ||
        rawInput.startsWith("البريد") ||
        rawInput.toLowerCase().startsWith("email") ||
        rawInput.startsWith("تفاصيل")
      ) {
        displayFooter = rawInput;
      } else if (rawInput.includes("@")) {
        displayFooter = `إيميل : ${rawInput}`;
      } else {
        displayFooter = rawInput;
      }
    } else {
      displayFooter = "إيميل : exellentservice@gmail.com";
    }

    fXml = fXml.replace(/تفاصيل أخرى\s*:\s*إيميل\s*WWWWWWWWWWW/g, displayFooter);
    fXml = fXml.replace(/تفاصيل أخرى\s*:\s*إيميل\s*/g, "");
    fXml = fXml.replace(/WWWWWWWWWWW/g, displayFooter);

    // الحفاظ الكامل على إحداثيات ومقاسات مربعات النص الأصلية للقالب 100% دون أي تحريك أو إزاحة
    fXml = purgeExellentRedMarks(fXml);
    zip.file(fFile, fXml);
  }
}

/**
 * استبدال التوقيعات والاعتمادات والملاحظات الإضافية لشركة إكسلنت بدقة واحترافية 100%
 */
export function applyExellentSignatures(
  docXml: string,
  params: {
    specialistTitle?: string;
    specialistName?: string;
    financeManagerTitle?: string;
    financeManagerName?: string;
    chairmanTitle?: string;
    boardChairman?: string;
    additionalNotes?: string;
  }
): string {
  const specTitle = escapeXml((params.specialistTitle || "المختص :").trim());
  const spec = escapeXml((params.specialistName || "").trim());
  const gmTitle = escapeXml((params.financeManagerTitle || "المدير العام").trim());
  const gm = escapeXml((params.financeManagerName || "").trim());
  const chairTitle = escapeXml((params.chairmanTitle || "يعتمد ،،،،،،").trim());
  const chair = escapeXml((params.boardChairman || "رئيس مجلس الإدارة").trim());

  // 1. تحديث وتصحيح عناوين الصف الأول بالجدول (المختص : / المدير العام / يعتمد)
  docXml = docXml.replace(/(<w:t\b[^>]*>)\s*المدير\s*ا?العام\s*(<\/w:t>)/g, `$1${gmTitle}$2`);
  if (params.specialistTitle) {
    docXml = docXml.replace(/(<w:t\b[^>]*>)\s*المختص\s*:?\s*(<\/w:t>)/g, `$1${specTitle}$2`);
  }
  if (params.chairmanTitle) {
    docXml = docXml.replace(/(<w:t\b[^>]*>)\s*يعتمد[\s\S]*?(<\/w:t>)/g, `$1${chairTitle}$2`);
  }

  // 2. استبدال خلايا الصف الثاني بجدول التوقيعات الثلاثي بدقة متناهية عبر بنية الجدول (المختص | المدير العام | يعتمد)
  const sigTableRegex = /(<w:tbl\b[\s\S]*?<w:t[^>]*>[^<]*المختص[\s\S]*?<w:t[^>]*>[^<]*يعتمد[\s\S]*?<\/w:tr>\s*<w:tr\b[^>]*>[\s\S]*?<w:tc\b[^>]*>)([\s\S]*?)(<\/w:tc>\s*<w:tc\b[^>]*>)([\s\S]*?)(<\/w:tc>\s*<w:tc\b[^>]*>)([\s\S]*?)(<\/w:tc>[\s\S]*?<\/w:tr>[\s\S]*?<\/w:tbl>)/;
  
  if (sigTableRegex.test(docXml)) {
    docXml = docXml.replace(
      sigTableRegex,
      (_match, trStart, cell1Content, sep1, cell2Content, sep2, cell3Content, cell3End) => {
        const newCell1 = cell1Content
          .replace(/<w:highlight\s+[^>]*\/>/g, "")
          .replace(/<w:t\b[^>]*>[\s\S]*?<\/w:t>/g, `<w:t>${spec || " "}</w:t>`);
        const newCell2 = cell2Content
          .replace(/<w:highlight\s+[^>]*\/>/g, "")
          .replace(/<w:t\b[^>]*>[\s\S]*?<\/w:t>/g, `<w:t>${gm || " "}</w:t>`);
        const newCell3 = cell3Content
          .replace(/<w:highlight\s+[^>]*\/>/g, "")
          .replace(/<w:t\b[^>]*>[\s\S]*?<\/w:t>/g, `<w:t>${chair || "رئيس مجلس الإدارة"}</w:t>`);
        return `${trStart}${newCell1}${sep1}${newCell2}${sep2}${newCell3}${cell3End}`;
      }
    );
  }

  // استبدال احتياطي على مستوى النصوص والخلايا الفردية داخل عناصر w:t حصراً
  docXml = docXml.replace(/(<w:t\b[^>]*>)\s*أحمد محمد\s*(<\/w:t>)/g, `$1${spec || " "}$2`);
  docXml = docXml.replace(/(<w:t\b[^>]*>)\s*اسم\s*(<\/w:t>)/g, `$1${gm || " "}$2`);
  docXml = docXml.replace(/(<w:t\b[^>]*>)\s*\.{12,25}\s*(<\/w:t>)/g, `$1${chair || "رئيس مجلس الإدارة"}$2`);

  // إزالة سطر "خانه خاليه للملاحظات"
  docXml = docXml.replace(
    /<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?خانه خاليه للملاحظات(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/gi,
    ""
  );

  // خانة الملاحظات الإضافية: إما ملؤها بالقيمة الفعلية أو حذف السطر عند الفراغ لمنع النقط المشوهة
  if (params.additionalNotes && params.additionalNotes.trim()) {
    const safeNote = escapeXml(params.additionalNotes.trim());
    docXml = docXml.replace(
      /(<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?اضافية[\s\S]*?<w:t[^>]*>)\s*\.{5,}\s*(<\/w:t>[\s\S]*?<\/w:p>)/gi,
      `$1${safeNote}$2`
    );
  } else {
    docXml = docXml.replace(
      /<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?اضافية[\s\S]*?<\/w:p>/gi,
      ""
    );
  }

  return docXml;
}

/**
 * إعداد صياغات أسلوب الطرح بحرف الباء وبدونه
 */
export function formatTenderMethod(rawMethod?: string): { cleanMethod: string; methodWithBa: string } {
  const raw = (rawMethod || "").trim();
  if (!raw) {
    return { cleanMethod: "المناقصة المحدودة", methodWithBa: "بالمناقصة المحدودة" };
  }

  if (raw.startsWith("بـ") || raw.startsWith("بال")) {
    const withoutBa = raw.replace(/^بـ?ال/, "ال");
    return { cleanMethod: withoutBa, methodWithBa: raw };
  }

  if (raw.startsWith("ب") && !raw.startsWith("بدون")) {
    const withoutBa = raw.slice(1).trim();
    return { cleanMethod: withoutBa, methodWithBa: raw };
  }

  let cleanMethod = raw;
  if (
    !cleanMethod.startsWith("ال") &&
    (cleanMethod.startsWith("مناقصة") || cleanMethod.startsWith("ممارسة") || cleanMethod.startsWith("مزايدة"))
  ) {
    cleanMethod = "ال" + cleanMethod;
  }

  const methodWithBa = cleanMethod.startsWith("ال") ? `ب${cleanMethod}` : `بـ${cleanMethod}`;
  return { cleanMethod, methodWithBa };
}

/**
 * استبدال السطر التوجيهي (السيد الأستاذ / جهة الإسناد) بدقة وإزالة أي "الساده" مسبقة
 */
export function applyExellentRecipient(
  docXml: string,
  prefix?: string,
  titleAndAuthority?: string
): string {
  const rawPrefix = (prefix || "الأستاذ").trim();
  const cleanPrefix = rawPrefix.replace(/^(?:الساده|السادة)\s*/, "").trim() || "الأستاذ";
  const t = escapeXml((titleAndAuthority || "مدير الادارة العامة للمشتريات والمخازن").trim());

  let replaced = false;
  docXml = docXml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (pXml) => {
    if (replaced) return pXml;
    const text = (pXml.match(/<w:t[\s\S]*?<\/w:t>/g) || []).map((x) => x.replace(/<[^>]+>/g, "")).join("");
    if (
      (text.includes("دمنهور") || text.includes("المشتريات") || text.includes("جامعة") || text.includes("الإسناد") || text.includes("الجهة")) &&
      (text.includes("مدير") || text.includes("الساد") || text.includes("الأستاذ")) &&
      !text.includes("بنك") &&
      !text.includes("المصرف")
    ) {
      replaced = true;
      const pPrMatch = pXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
      const pPr = pPrMatch ? pPrMatch[0] : '<w:pPr><w:jc w:val="center"/></w:pPr>';
      const rPr = '<w:rPr><w:rFonts w:asciiTheme="minorBidi" w:hAnsiTheme="minorBidi" w:cstheme="minorBidi"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr>';
      return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">الساده  </w:t></w:r><w:r>${rPr}<w:t>${escapeXml(cleanPrefix)}</w:t></w:r><w:r>${rPr}<w:t xml:space="preserve"> / </w:t></w:r><w:r>${rPr}<w:t>${t}</w:t></w:r></w:p>`;
    }
    return pXml;
  });

  if (!replaced) {
    docXml = docXml.replace(/مدير الادارة العامة للمشتريات والمخازن بجامعة دمنهور/g, t);
  }

  return docXml;
}

/**
 * استبدال طريقة الطرح المحددة للعملية بدقة متناهية داخل حدود الفقرة الواحدة
 */
export function applyExellentTenderMethod(
  docXml: string,
  tenderMethod?: string
): string {
  const { cleanMethod, methodWithBa } = formatTenderMethod(tenderMethod);
  const baXml = escapeXml(methodWithBa);
  const clXml = escapeXml(cleanMethod);

  // تثبيت كلمة "والخاصة" بالتاء المربوطة دائماً وأبداً في كافة خطابات إكسلنت
  docXml = docXml.replace(/والخاص\s+بالمناقصة/g, "والخاصة بالمناقصة");
  docXml = docXml.replace(/والخاص\s+/g, "والخاصة ");
  docXml = docXml.replace(/والخاص(?=[^\u0621-\u064A])/g, "والخاصة");

  // استبدال دقيق لطريقة الطرح بالمناقصة المحدودة / المناقصة المحدودة بدون تخريب أي نصوص سابقة
  docXml = docXml.replace(/(\(?)\s*بالمناقصة\s+المحدودة\s*(\)?)/g, baXml);
  docXml = docXml.replace(/(\(?)\s*المناقصة\s+المحدودة\s*(\)?)/g, clXml);

  return docXml;
}

/**
 * استبدال بيانات العملية المشتركة والمندوب وسنوات الطرح بدقة واحترافية وبشكل محصور داخل الفقرة الواحدة
 */
export function applyExellentCommonDetails(
  docXml: string,
  params: {
    operationRegisteredName?: string;
    operationNumber?: string;
    operationScope?: string;
    fiscalYear?: string;
    technicalOpeningDate?: string;
    delegateName?: string;
    delegateTitle?: string;
    delegateNationalId?: string;
    delegatePowers?: string;
  }
): string {
  if (params.operationRegisteredName !== undefined) {
    docXml = docXml.replace(/اسم العملية المسجله/g, escapeXml(params.operationRegisteredName || ""));
  }
  if (params.operationNumber !== undefined) {
    docXml = docXml.replace(/365/g, escapeXml(params.operationNumber || "365"));
  }
  if (params.operationScope !== undefined) {
    const scopeXml = escapeXml(params.operationScope || "");
    docXml = docXml.replace(/(\(?)\s*توريد\s+كاوتش\s+وبطاريات\s+للسيارات\s+للجامعه\s*(\)?)/g, scopeXml);
    docXml = docXml.replace(/الأصناف\s+المورده\s+من\s+كاوتش\s+وبطاريات/g, `الأصناف الموردة لعملية ${scopeXml}`);
  }
  if (params.fiscalYear !== undefined) {
    const fYearXml = escapeXml(params.fiscalYear || "");
    docXml = docXml.replace(
      /<w:t[^>]*>[^<]*202\s*<\/w:t>(?:(?!<\/w:p>)[\s\S])*?4\s*<\/w:t>(?:(?!<\/w:p>)[\s\S])*?5\s*<\/w:t>/g,
      `<w:t>${fYearXml}</w:t>`
    );
    docXml = docXml.replace(/2024\s*\/\s*2025/g, fYearXml);
  }
  if (params.technicalOpeningDate !== undefined) {
    const oDateXml = escapeXml(params.technicalOpeningDate || "");
    docXml = docXml.replace(
      /<w:t[^>]*>[^<]*14\s*<\/w:t>(?:(?!<\/w:p>)[\s\S])*?1\s*<\/w:t>(?:(?!<\/w:p>)[\s\S])*?4\s*<\/w:t>/g,
      `<w:t>${oDateXml}</w:t>`
    );
    docXml = docXml.replace(/(\(?)\s*14\s*\/\s*1\s*\/\s*2024\s*(\)?)/g, oDateXml);
  }
  if (params.delegateName !== undefined) {
    const dNameXml = escapeXml(params.delegateName || "");
    docXml = docXml.replace(/(\(?)\s*أحمد\s+محمد\s+أحمد\s*(\)?)/g, dNameXml);
  }
  if (params.delegateTitle !== undefined) {
    const dTitleXml = escapeXml(params.delegateTitle || "");
    docXml = docXml.replace(/(\(?)\s*مندوب\s+التعاقدات\s+المفوض\s*(\)?)/g, dTitleXml);
  }
  if (params.delegateNationalId !== undefined) {
    const dIdXml = escapeXml(params.delegateNationalId || "");
    docXml = docXml.replace(/23056289523202/g, dIdXml);
  }
  if (params.delegatePowers !== undefined && params.delegatePowers) {
    const powersXml = escapeXml(params.delegatePowers);
    docXml = docXml.replace(
      /والتوقيع على العقود واستلام الخطابات والمكاتبات الرسميه/g,
      powersXml
    );
  }

  return docXml;
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. توليد خطاب سحب كراسة الشروط (Exellent Booklet Withdrawal)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateExellentBookletWithdrawalDocx(params: {
  recipientPrefix?: string;
  recipientTitleAndAuthority?: string;
  operationRegisteredName?: string;
  operationNumber?: string;
  tenderMethod?: string;
  operationScope?: string;
  fiscalYear?: string;
  technicalOpeningDate?: string;
  delegateName?: string;
  delegateTitle?: string;
  delegateNationalId?: string;
  delegatePowers?: string;
  additionalNotes?: string;
  specialistTitle?: string;
  specialistName?: string;
  financeManagerTitle?: string;
  financeManagerName?: string;
  chairmanTitle?: string;
  boardChairman?: string;
  companyCommercialRegister?: string;
  companyTaxCard?: string;
  companyOpCode?: string;
  outgoingDate?: string;
  registrationNumber?: string;
  companyAddress?: string;
  phoneWhatsapp?: string;
  phoneMobile?: string;
  companyEmail?: string;
  companyOtherDetails?: string;
  qrBinary?: Uint8Array | null;
}): Promise<Blob> {
  const buffer = await fetchExellentDocxTemplate("booklet_withdrawal_template.docx");
  const zip = await JSZip.loadAsync(buffer);

  let docXml = await zip.file("word/document.xml")!.async("text");

  // QR Anchor
  if (params.qrBinary) {
    const qrXml = buildQrAnchorXml();
    docXml = injectSingleQrIntoDocXml(docXml, qrXml, escapeXml(params.registrationNumber || ""));
  }

  const { cleanMethod, methodWithBa } = formatTenderMethod(params.tenderMethod);

  // استبدال الحقول الرسمية والسطر التوجيهي وطريقة الطرح
  docXml = applyExellentRecipient(docXml, params.recipientPrefix, params.recipientTitleAndAuthority);
  docXml = applyExellentTenderMethod(docXml, params.tenderMethod);
  docXml = applyExellentCommonDetails(docXml, params);

  // التوقيعات والملاحظات
  docXml = applyExellentSignatures(docXml, params);
  docXml = cleanDocxRepetitions(docXml);
  docXml = purgeExellentRedMarks(docXml);
  zip.file("word/document.xml", docXml);

  // الترويسة والتذييل
  await applyExellentHeaderFooter(zip, params);

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}





// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. توليد خطاب سداد التأمين الابتدائي (Exellent Insurance Payment)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateExellentInsurancePaymentDocx(params: {
  recipientPrefix?: string;
  recipientTitleAndAuthority?: string;
  operationRegisteredName?: string;
  operationNumber?: string;
  insuranceAmount?: string;
  insuranceTafqeet?: string;
  tenderMethod?: string;
  operationScope?: string;
  fiscalYear?: string;
  technicalOpeningDate?: string;
  delegateName?: string;
  delegateTitle?: string;
  delegateNationalId?: string;
  delegatePowers?: string;
  additionalNotes?: string;
  specialistName?: string;
  financeManagerName?: string;
  boardChairman?: string;
  companyCommercialRegister?: string;
  companyTaxCard?: string;
  companyOpCode?: string;
  outgoingDate?: string;
  registrationNumber?: string;
  companyAddress?: string;
  phoneWhatsapp?: string;
  phoneMobile?: string;
  companyEmail?: string;
  companyOtherDetails?: string;
  qrBinary?: Uint8Array | null;
}): Promise<Blob> {
  const buffer = await fetchExellentDocxTemplate("insurance_payment_template.docx");
  const zip = await JSZip.loadAsync(buffer);

  let docXml = await zip.file("word/document.xml")!.async("text");

  if (params.qrBinary) {
    const qrXml = buildQrAnchorXml();
    docXml = injectSingleQrIntoDocXml(docXml, qrXml, escapeXml(params.registrationNumber || ""));
  }

  const { cleanMethod, methodWithBa } = formatTenderMethod(params.tenderMethod);

  docXml = applyExellentRecipient(docXml, params.recipientPrefix, params.recipientTitleAndAuthority);
  docXml = applyExellentTenderMethod(docXml, params.tenderMethod);
  docXml = applyExellentCommonDetails(docXml, params);
  if (params.insuranceAmount) {
    docXml = docXml.replace(/10000/g, escapeXml(params.insuranceAmount));
  }
  if (params.insuranceTafqeet) {
    docXml = docXml.replace(/عشرة\s+[أاآ]لاف\s+جنيه/g, escapeXml(params.insuranceTafqeet));
  }

  docXml = applyExellentSignatures(docXml, params);
  docXml = purgeExellentRedMarks(docXml);
  docXml = cleanDocxRepetitions(docXml);
  zip.file("word/document.xml", docXml);

  await applyExellentHeaderFooter(zip, params);

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}





// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. توليد خطاب سحب الكراسة وسداد التأمين معاً (Exellent Booklet & Insurance)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateExellentBookletAndInsuranceDocx(params: {
  recipientPrefix?: string;
  recipientTitleAndAuthority?: string;
  operationRegisteredName?: string;
  operationNumber?: string;
  insuranceAmount?: string;
  insuranceTafqeet?: string;
  tenderMethod?: string;
  operationScope?: string;
  fiscalYear?: string;
  technicalOpeningDate?: string;
  delegateName?: string;
  delegateTitle?: string;
  delegateNationalId?: string;
  delegatePowers?: string;
  additionalNotes?: string;
  specialistName?: string;
  financeManagerName?: string;
  boardChairman?: string;
  companyCommercialRegister?: string;
  companyTaxCard?: string;
  companyOpCode?: string;
  outgoingDate?: string;
  registrationNumber?: string;
  companyAddress?: string;
  phoneWhatsapp?: string;
  phoneMobile?: string;
  companyEmail?: string;
  companyOtherDetails?: string;
  qrBinary?: Uint8Array | null;
}): Promise<Blob> {
  const buffer = await fetchExellentDocxTemplate("booklet_and_insurance_template.docx");
  const zip = await JSZip.loadAsync(buffer);

  let docXml = await zip.file("word/document.xml")!.async("text");

  if (params.qrBinary) {
    const qrXml = buildQrAnchorXml();
    docXml = injectSingleQrIntoDocXml(docXml, qrXml, escapeXml(params.registrationNumber || ""));
  }

  const { cleanMethod, methodWithBa } = formatTenderMethod(params.tenderMethod);

  docXml = applyExellentRecipient(docXml, params.recipientPrefix, params.recipientTitleAndAuthority);
  docXml = applyExellentTenderMethod(docXml, params.tenderMethod);
  docXml = applyExellentCommonDetails(docXml, params);
  if (params.insuranceAmount) {
    docXml = docXml.replace(/10000/g, escapeXml(params.insuranceAmount));
  }
  if (params.insuranceTafqeet) {
    docXml = docXml.replace(/عشرة\s+[أاآ]لاف\s+جنيه/g, escapeXml(params.insuranceTafqeet));
  }

  docXml = applyExellentSignatures(docXml, params);
  docXml = purgeExellentRedMarks(docXml);
  docXml = cleanDocxRepetitions(docXml);
  zip.file("word/document.xml", docXml);

  await applyExellentHeaderFooter(zip, params);

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}





// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. توليد خطاب إصدار خطاب ضمان بنكي (Exellent Bank Guarantee)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateExellentBankGuaranteeDocx(params: {
  bankRecipientPrefix?: string;
  bankRecipientTitle?: string;
  bankName?: string;
  bankBranch?: string;
  guaranteeType?: "ابتدائي" | "نهائي";
  operationRegisteredName?: string;
  operationNumber?: string;
  authorityName?: string;
  authorityAddress?: string;
  actionText?: string;
  bankGuaranteeAmount?: string;
  bankGuaranteeTafqeet?: string;
  tenderMethod?: string;
  operationScope?: string;
  fiscalYear?: string;
  technicalOpeningDate?: string;
  guaranteePercentage?: string;
  operationTotalAmount?: string;
  operationTotalTafqeet?: string;
  guaranteeDurationText?: string;
  guaranteeStartDate?: string;
  guaranteeEndDate?: string;
  bankAccountNumber?: string;
  accountBankName?: string;
  accountBankBranch?: string;
  accountOwnerName?: string;
  accountOwnerNationalId?: string;
  authorizedSignatoryName?: string;
  companyCommercialRegister?: string;
  companyTaxCard?: string;
  companyOpCode?: string;
  outgoingDate?: string;
  registrationNumber?: string;
  companyAddress?: string;
  phoneWhatsapp?: string;
  phoneMobile?: string;
  companyEmail?: string;
  companyOtherDetails?: string;
  qrBinary?: Uint8Array | null;
}): Promise<Blob> {
  const buffer = await fetchExellentDocxTemplate("bank_guarantee_letter_template.docx");
  const zip = await JSZip.loadAsync(buffer);

  let docXml = await zip.file("word/document.xml")!.async("text");

  if (params.qrBinary) {
    const qrXml = buildQrAnchorXml();
    docXml = injectSingleQrIntoDocXml(docXml, qrXml, escapeXml(params.registrationNumber || ""));
  }

  const { cleanMethod, methodWithBa } = formatTenderMethod(params.tenderMethod);
  const isInitial = params.guaranteeType === "ابتدائي";

  const rawBankPrefix = (params.bankRecipientPrefix || "الأستاذ").trim();
  const cleanBankPrefix = rawBankPrefix.replace(/^(?:السيد|السادة|الساده)\s+/, "").trim() || "الأستاذ";
  docXml = docXml.replace(/الأستاذ/g, escapeXml(cleanBankPrefix));

  // 1. عنوان وتوجيه البنك في السطر الأول بدقة بدون تكرارات
  const bankTitle = (params.bankRecipientTitle || `مدير بنك ${params.bankName || "مصر"} فرع ${params.bankBranch || "دمنهور"}`).trim();
  const bankRecipRegex = /(<w:t[^>]*>\s*\/\s*<\/w:t><\/w:r>)([\s\S]*?)(<\/w:p>)/;
  if (bankRecipRegex.test(docXml)) {
    docXml = docXml.replace(
      bankRecipRegex,
      `$1<w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ${escapeXml(bankTitle)}</w:t></w:r>$3`
    );
  }

  // 2. نوع التأمين (ابتدائي / نهائي)
  docXml = docXml.replace(/سداد\s*تأمين\s*نهائي/g, `سداد تأمين ${isInitial ? "ابتدائي" : "نهائي"}`);
  docXml = docXml.replace(/قيمة\s*التأمين\s*النهائي/g, `قيمة التأمين ${isInitial ? "الابتدائي" : "النهائي"}`);

  // 3. اسم العملية ورقمها
  docXml = docXml.replace(/اسم العملية المسجله/g, escapeXml(params.operationRegisteredName || ""));
  docXml = docXml.replace(/365/g, escapeXml(params.operationNumber || "365"));

  // 4. استبدال جهة الإسناد وعنوانها عبر regex محصور يمنع تلويث العناوين
  const authRegex = /(<w:t[^>]*>[^<]*لدى\s*الجهه\s*<\/w:t><\/w:r>)([\s\S]*?)(<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:t[^>]*>[^<]*وعنوانها\s*:\s*<\/w:t>[\s\S]*?<\/w:r>)([\s\S]*?)(<\/w:p>)/;
  if (authRegex.test(docXml)) {
    docXml = docXml.replace(authRegex, (m, a1, _oldAuth, a2, _oldAddr, endP) => {
      const newAuthRun = `<w:r><w:rPr><w:rFonts w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ${escapeXml(params.authorityName || "")} </w:t></w:r>`;
      const newAddrRun = `<w:r><w:rPr><w:rFonts w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ${escapeXml(params.authorityAddress || "")} </w:t></w:r>`;
      return `${a1}${newAuthRun}${a2}${newAddrRun}${endP}`;
    });
  } else {
    docXml = docXml.replace(/مديرية الصحة بالبحيرة/g, escapeXml(params.authorityName || ""));
    docXml = docXml.replace(/البحيرة\s*–\s*دمنهور\s*-\s*خلف مستشفى الصدر/g, escapeXml(params.authorityAddress || ""));
  }

  // 5. متن الخطاب: مبالغ وتفقيط وطريقة الطرح ونطاق العملية والمدد
  if (params.actionText) {
    docXml = docXml.replace(/قبول\s*إصدار\s*خطاب\s*ضمان/g, escapeXml(params.actionText));
  }

  docXml = applyExellentTenderMethod(docXml, params.tenderMethod);
  docXml = applyExellentCommonDetails(docXml, params);

  // استبدال مبالغ ونسبة الضمان وإجمالي العملية بدقة تامة وبدون تكرار
  const rawBgTafqeet = cleanTafqeetForTemplate(params.bankGuaranteeTafqeet);
  const cleanBgTafqeet = rawBgTafqeet.replace(/(?:جنيها[ً|اً]?\s*)?(?:مصريا[ً|اً]?\s*)?لا\s*غير\s*$/g, "").trim();

  const rawTotalTafqeet = cleanTafqeetForTemplate(params.operationTotalTafqeet);
  const cleanTotalTafqeet = rawTotalTafqeet.replace(/(?:جنيها[ً|اً]?\s*)?(?:مصريا[ً|اً]?\s*)?لا\s*غير\s*$/g, "").trim();

  const rateStr = params.guaranteePercentage || "5 %";
  const bgAmount = params.bankGuaranteeAmount || "";
  const totalAmount = params.operationTotalAmount || "";

  const amountPattern = /(<w:t[^>]*>[^<]*باجمالى\s*نسبة[^<]*<\/w:t>[\s\S]*?<w:t[^>]*>[^<]*جنيها\s*لا\s*غير[^<]*<\/w:t>)/;

  let amountPhraseText = "";
  if (totalAmount && bgAmount && totalAmount !== bgAmount) {
    const finalTafqeet = cleanBgTafqeet || cleanTotalTafqeet;
    amountPhraseText = `باجمالى نسبة ${rateStr} من مبلغ العمليه وقيمتها ${totalAmount} جنيها ومبلغ الضمان المطلوب ${bgAmount} فقط وقدره : ${finalTafqeet} جنيها لا غير`;
  } else if (bgAmount) {
    amountPhraseText = `باجمالى نسبة ${rateStr} من مبلغ العمليه ومبلغ الضمان المطلوب ${bgAmount} فقط وقدره : ${cleanBgTafqeet || cleanTotalTafqeet} جنيها لا غير`;
  } else if (totalAmount) {
    amountPhraseText = `باجمالى نسبة ${rateStr} من مبلغ العمليه وقيمتها ${totalAmount} فقط وقدره : ${cleanTotalTafqeet} جنيها لا غير`;
  } else {
    amountPhraseText = `باجمالى نسبة ${rateStr} من مبلغ العمليه وقيمتها 47547 فقط وقدره : سبعه وأربعون ألفا وخمسمائة وسبعه وأربعون جنيها لا غير`;
  }

  if (amountPattern.test(docXml)) {
    docXml = docXml.replace(amountPattern, `<w:t xml:space="preserve">${escapeXml(amountPhraseText)}</w:t>`);
  } else {
    docXml = docXml.replace(/5\s*%/g, escapeXml(rateStr));
    docXml = docXml.replace(/47547/g, escapeXml(bgAmount || totalAmount || ""));
    if (cleanBgTafqeet) {
      docXml = docXml.replace(/سبعه وأربعون ألفا وخمسمائة وسبعه وأربعون/g, escapeXml(cleanBgTafqeet));
    }
  }

  const durationVal = (params.guaranteeDurationText || "سنة").trim();
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
  docXml = docXml.replace(/12\/12\/2027/g, escapeXml(params.guaranteeStartDate || ""));
  docXml = docXml.replace(/12\/12\s*\/2028/g, escapeXml(params.guaranteeEndDate || ""));

  // 6. بيانات الحساب البنكي المسجل (رقم الحساب + اسم البنك والفرع محصوراً داخل فقرته)
  docXml = docXml.replace(/2670220000004113/g, escapeXml(params.bankAccountNumber || ""));

  const accBankPRegex = /(<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?مصر\s*الاسلامى[\s\S]*?<\/w:p>)/;
  if (accBankPRegex.test(docXml)) {
    docXml = docXml.replace(accBankPRegex, (pXml) => {
      let updatedP = pXml;
      const accBank = (params.accountBankName || "مصر الاسلامى").trim();
      const accBranch = (params.accountBankBranch || params.bankBranch || "دمنهور").trim();
      updatedP = updatedP.replace(/(<w:t[^>]*>)\s*مصر\s*الاسلامى\s*(<\/w:t>)/g, `$1${escapeXml(accBank)}$2`);
      updatedP = updatedP.replace(/(<w:t[^>]*>)\s*دمنهور\s*(<\/w:t>)/g, `$1${escapeXml(accBranch)}$2`);
      return updatedP;
    });
  } else {
    docXml = docXml.replace(/مصر الاسلامى/g, escapeXml(params.accountBankName || "مصر الاسلامى"));
  }

  // 7. اسم صاحب الحساب والرقم القومي
  const nameRegex = /(<w:t[^>]*>[^<]*بإس[ـ]*م\s*:\s*<\/w:t><\/w:r>)([\s\S]*?)(<\/w:p>)/;
  if (nameRegex.test(docXml)) {
    docXml = docXml.replace(
      nameRegex,
      `$1<w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ${escapeXml(params.accountOwnerName || "إيهاب كامل عبدربه محمد")} </w:t></w:r>$3`
    );
  } else {
    docXml = docXml.replace(/ســـحر حسن محمد أحمد عبد السلام(?:\s+جولدن سرفيس)?/g, escapeXml(params.accountOwnerName || "إيهاب كامل عبدربه محمد"));
  }

  const nidRegex = /(<w:t[^>]*>[^<]*رق[ـ]*م\s*قومى\s*:\s*<\/w:t><\/w:r>)([\s\S]*?)(<\/w:p>)/;
  if (nidRegex.test(docXml)) {
    docXml = docXml.replace(
      nidRegex,
      `$1<w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">     ${escapeXml(params.accountOwnerNationalId || "")} </w:t></w:r>$3`
    );
  } else {
    docXml = docXml.replace(/28912111802623/g, escapeXml(params.accountOwnerNationalId || ""));
  }

  // 8. التوقيع بأسفل الصفحة
  const sigName = params.authorizedSignatoryName || params.accountOwnerName || "إيهاب كامل عبدربه محمد";
  docXml = docXml.replace(/إيهاب كامل عبدربه محمد/g, escapeXml(sigName));

  docXml = docXml.replace(
    /<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?خانه خاليه للملاحظات(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/gi,
    ""
  );

  docXml = purgeTafqeetDuplicates(docXml);
  docXml = purgeExellentRedMarks(docXml);
  docXml = cleanDocxRepetitions(docXml);
  zip.file("word/document.xml", docXml);

  await applyExellentHeaderFooter(zip, params);

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4.2 توليد خطاب سداد التأمين الابتدائي خصماً من مستحقات الشركة (Exellent Insurance Deduction Other)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateExellentInsuranceDeductionOtherDocx(params: {
  recipientPrefix?: string;
  recipientTitleAndAuthority?: string;
  operationRegisteredName?: string;
  operationNumber?: string;
  insuranceAmount?: string;
  insuranceTafqeet?: string;
  deductionOperationName?: string;
  deductionMonth?: string;
  deductionYear?: string;
  deductionEntityName?: string;
  deductionOrderNo?: string;
  tenderMethod?: string;
  operationScope?: string;
  fiscalYear?: string;
  technicalOpeningDate?: string;
  delegateName?: string;
  delegateTitle?: string;
  delegateNationalId?: string;
  delegatePowers?: string;
  additionalNotes?: string;
  specialistTitle?: string;
  specialistName?: string;
  financeManagerTitle?: string;
  financeManagerName?: string;
  chairmanTitle?: string;
  boardChairman?: string;
  companyCommercialRegister?: string;
  companyTaxCard?: string;
  companyOpCode?: string;
  outgoingDate?: string;
  registrationNumber?: string;
  companyAddress?: string;
  phoneWhatsapp?: string;
  phoneMobile?: string;
  companyEmail?: string;
  companyOtherDetails?: string;
  qrBinary?: Uint8Array | null;
}): Promise<Blob> {
  const buffer = await fetchExellentDocxTemplate("insurance_deduction_other_template.docx");
  const zip = await JSZip.loadAsync(buffer);

  let docXml = await zip.file("word/document.xml")!.async("text");

  // 1. تطبيق السطر التوجيهي وطريقة الطرح وبيانات العملية والمندوب بدقة
  docXml = applyExellentRecipient(docXml, params.recipientPrefix, params.recipientTitleAndAuthority);
  docXml = applyExellentTenderMethod(docXml, params.tenderMethod);
  docXml = applyExellentCommonDetails(docXml, params);

  // 2. استبدال مبالغ التأمين الابتدائي وتفقيطه
  if (params.insuranceAmount) {
    docXml = docXml.replace(/10000/g, escapeXml(params.insuranceAmount));
  }
  if (params.insuranceTafqeet) {
    docXml = docXml.replace(/عشرة\s+[أاآ]لاف\s+جنيه/g, escapeXml(params.insuranceTafqeet));
  }

  // 3. استبدال بيانات العملية المخصوم منها مستحقات الشركة والشهر والسنة بدقة داخل عناصر w:t
  const safeDedOp = (params.deductionOperationName || "").trim();
  const safeDedMonth = (params.deductionMonth || "").trim();
  const safeDedYear = (params.deductionYear || "").trim();

  if (safeDedOp) {
    docXml = docXml.replace(/(<w:t[^>]*>)\s*\.{7,15}\s*(<\/w:t>)/, `$1${escapeXml(safeDedOp)}$2`);
  }
  if (safeDedMonth) {
    docXml = docXml.replace(/(<w:t[^>]*>)\s*\.{6,12}\s*(<\/w:t>)/, `$1${escapeXml(safeDedMonth)}$2`);
  }
  if (safeDedYear) {
    docXml = docXml.replace(/(<w:t[^>]*>)\s*\.{4,8}\s*(<\/w:t>)/, `$1${escapeXml(safeDedYear)}$2`);
  }
  if (params.deductionEntityName && params.deductionEntityName.trim()) {
    docXml = docXml.replace(/لديكم/g, `لدى ${escapeXml(params.deductionEntityName.trim())}`);
  }

  // 4. التوقيعات والاعتماد الثلاثي والملاحظات الإضافية
  docXml = applyExellentSignatures(docXml, params);
  docXml = purgeExellentRedMarks(docXml);
  zip.file("word/document.xml", docXml);

  // 5. ترويسات وتذييلات الشركة
  await applyExellentHeaderFooter(zip, params);

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}








// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. توليد إقرار الالتزام بكراسة الشروط (Exellent Specs Declaration)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateExellentDeclarationSpecsDocx(params: {
  recipientPrefix?: string;
  recipientTitleAndAuthority?: string;
  preambleTitle?: string;
  operationRegisteredName?: string;
  operationNumber?: string;
  companyName?: string;
  commitmentDetails?: string;
  tenderMethod?: string;
  operationScope?: string;
  fiscalYear?: string;
  technicalOpeningDate?: string;
  additionalNotes?: string;
  specialistTitle?: string;
  specialistName?: string;
  financeManagerTitle?: string;
  financeManagerName?: string;
  chairmanTitle?: string;
  boardChairman?: string;
  companyCommercialRegister?: string;
  companyTaxCard?: string;
  companyOpCode?: string;
  outgoingDate?: string;
  registrationNumber?: string;
  companyAddress?: string;
  phoneWhatsapp?: string;
  phoneMobile?: string;
  companyEmail?: string;
  companyOtherDetails?: string;
  qrBinary?: Uint8Array | null;
}): Promise<Blob> {
  const buffer = await fetchExellentDocxTemplate("declaration_specs_template.docx");
  const zip = await JSZip.loadAsync(buffer);

  let docXml = await zip.file("word/document.xml")!.async("text");

  if (params.qrBinary) {
    const qrXml = buildQrAnchorXml();
    docXml = injectSingleQrIntoDocXml(docXml, qrXml, escapeXml(params.registrationNumber || ""));
  }

  // 1. استبدال فقرة المرسل إليه
  docXml = applyExellentRecipient(docXml, params.recipientPrefix, params.recipientTitleAndAuthority);

  // 2. استبدال فقرة التمهيد بالكامل (تمهيد : إقرار الإلتزام بكراسة الشروط والمواصفات لعملية ... رقم ...)
  const pTitle = (params.preambleTitle || "إقرار الإلتزام بكراسة الشروط والمواصفات").trim();
  const opRegName = (params.operationRegisteredName || "").trim();
  const opNum = (params.operationNumber || "365").trim();
  const preambleParagraphXml =
    `<w:p><w:pPr><w:spacing w:before="240" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="both"/><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:u w:val="single"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">تمهيد  : </w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(pTitle)} لعملية </w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(opRegName)}</w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> رقم   </w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(opNum)}</w:t></w:r></w:p>`;

  docXml = docXml.replace(/<w:p\b(?:(?!<\/w:p>)[\s\S])*?تمهيد[\s\S]*?<\/w:p>/, preambleParagraphXml);

  // 3. استبدال متن الإقرار الرئيسي بالكامل (تقر ... بأنها ملتزمة ... وذلك في ... وطبيعتها ... طرفكم للعام المالي ... والمحدد لها جلسة ... لفتح المظروف الفنى .)
  const company = (params.companyName || "اكسلانت سرفيس للنظافه والصيانه والنقل والخدمات والتوريدات").trim();
  const commitment = (params.commitmentDetails || "بكل ما جاء بكراسة الشروط والمواصفات وتوضح").trim();
  const { cleanMethod } = formatTenderMethod(params.tenderMethod);
  const scope = (params.operationScope || "توريد كاوتش وبطاريات للسيارات للجامعه").trim();
  const fYear = (params.fiscalYear || "2024 / 2025").trim();
  const oDate = (params.technicalOpeningDate || "14/ 1 /2024").trim();

  const declarationParagraphXml =
    `<w:p w14:paraId="071B403A" w14:textId="602CD6E1" w:rsidR="00482D1C" w:rsidRPr="00115CF9" w:rsidRDefault="00482D1C" w:rsidP="000A0E50">` +
    `<w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="-41"/><w:jc w:val="highKashida"/><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">تقر </w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(company)}</w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> بأنها ملتزمه </w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(commitment)} </w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">وذلك في </w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(cleanMethod)}</w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> وطبيعتها </w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ${escapeXml(scope)}</w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> طرفكم للعام المالى  </w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(fYear)}</w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> والمحدد لها جلسة </w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(oDate)}</w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> لفتح المظروف الفنى . </w:t></w:r></w:p>`;

  docXml = docXml.replace(/<w:p\b(?:(?!<\/w:p>)[\s\S])*?تقر[\s\S]*?<\/w:p>/, declarationParagraphXml);

  // 4. استبدال فقرة الملاحظات الإضافية (اضافية : ...)
  const notesText = params.additionalNotes && params.additionalNotes.trim() ? params.additionalNotes.trim() : "";
  const notesParagraphXml =
    `<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="right"/><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">اضافية :  </w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(notesText || "..................................")}</w:t></w:r></w:p>`;

  docXml = docXml.replace(/<w:p\b(?:(?!<\/w:p>)[\s\S])*?اضافية[\s\S]*?<\/w:p>/, notesParagraphXml);

  // 5. إزالة الفقرة الوهمية "خانه خاليه للملاحظات"
  docXml = docXml.replace(/<w:p\b(?:(?!<\/w:p>)[\s\S])*?خانه\s*خاليه\s*للملاحظات[\s\S]*?<\/w:p>/g, "");

  // 6. استبدال التوقيعات بأسفل الإقرار
  docXml = applyExellentSignatures(docXml, params);

  // 7. إزالة أي علامات حمراء وتكرارات التفقيط
  docXml = purgeExellentRedMarks(docXml);
  docXml = cleanDocxRepetitions(docXml);

  zip.file("word/document.xml", docXml);

  await applyExellentHeaderFooter(zip, params);

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}





// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. توليد إقرار التأمينات والعمالة (Exellent Insurance Declaration)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateExellentDeclarationInsuranceDocx(params: {
  recipientPrefix?: string;
  recipientTitleAndAuthority?: string;
  preambleTitle?: string;
  operationRegisteredName?: string;
  operationNumber?: string;
  companyName?: string;
  commitmentDetails?: string;
  tenderMethod?: string;
  operationScope?: string;
  fiscalYear?: string;
  technicalOpeningDate?: string;
  additionalNotes?: string;
  specialistTitle?: string;
  specialistName?: string;
  financeManagerTitle?: string;
  financeManagerName?: string;
  chairmanTitle?: string;
  boardChairman?: string;
  companyCommercialRegister?: string;
  companyTaxCard?: string;
  companyOpCode?: string;
  outgoingDate?: string;
  registrationNumber?: string;
  companyAddress?: string;
  phoneWhatsapp?: string;
  phoneMobile?: string;
  companyEmail?: string;
  companyOtherDetails?: string;
  qrBinary?: Uint8Array | null;
}): Promise<Blob> {
  const buffer = await fetchExellentDocxTemplate("declaration_insurance_template.docx");
  const zip = await JSZip.loadAsync(buffer);

  let docXml = await zip.file("word/document.xml")!.async("text");

  if (params.qrBinary) {
    const qrXml = buildQrAnchorXml();
    docXml = injectSingleQrIntoDocXml(docXml, qrXml, escapeXml(params.registrationNumber || ""));
  }

  // 1. استبدال فقرة المرسل إليه
  docXml = applyExellentRecipient(docXml, params.recipientPrefix, params.recipientTitleAndAuthority);

  // 2. استبدال فقرة التمهيد بالكامل
  const pTitle = (params.preambleTitle || "إقرار الإلتزام بالتأمينات والعماله الغير منتظمه والمساواه بين العاملين").trim();
  const opRegName = (params.operationRegisteredName || "").trim();
  const opNum = (params.operationNumber || "365").trim();
  const preambleParagraphXml =
    `<w:p><w:pPr><w:spacing w:before="240" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="both"/><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:u w:val="single"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">تمهيد  : </w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(pTitle)} لعملية </w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(opRegName)}</w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> رقم  </w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(opNum)}   </w:t></w:r></w:p>`;

  docXml = docXml.replace(/<w:p\b(?:(?!<\/w:p>)[\s\S])*?تمهيد[\s\S]*?<\/w:p>/, preambleParagraphXml);

  // 3. استبدال متن الإقرار الرئيسي بالكامل
  const company = (params.companyName || "اكسلانت سرفيس للنظافه والصيانه والنقل والخدمات والتوريدات").trim();
  const rawCommitment = (params.commitmentDetails || "بسداد نسبة التأمينات على المقاولات والعماله الغير منتظمه وحسن التعامل مع العاملين بالشركة وعدم التفرقه بينهم").trim();
  const commitment = rawCommitment.replace(/^(?:بأنها\s+)?(?:ملتزم[ةه]\s+)?/, "").trim();
  const { cleanMethod } = formatTenderMethod(params.tenderMethod);
  const scope = (params.operationScope || "توريد كاوتش وبطاريات للسيارات للجامعه").trim();
  const fYear = (params.fiscalYear || "2024 / 2025").trim();
  const oDate = (params.technicalOpeningDate || "14/ 1 /2024").trim();

  const declarationParagraphXml =
    `<w:p w14:paraId="071B403A" w14:textId="602CD6E1" w:rsidR="00482D1C" w:rsidRPr="00115CF9" w:rsidRDefault="00482D1C" w:rsidP="000A0E50">` +
    `<w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="-41"/><w:jc w:val="highKashida"/><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">تقر </w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(company)}</w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> بأنها ملتزمه </w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(commitment)} </w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">وذلك في </w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(cleanMethod)}</w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> وطبيعتها </w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ${escapeXml(scope)}</w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> طرفكم للعام المالى  </w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(fYear)}</w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> والمحدد لها جلسة </w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(oDate)}</w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> لفتح المظروف الفنى . </w:t></w:r></w:p>`;

  docXml = docXml.replace(/<w:p\b(?:(?!<\/w:p>)[\s\S])*?تقر[\s\S]*?<\/w:p>/, declarationParagraphXml);

  // 4. استبدال فقرة الملاحظات الإضافية (اضافية : ...)
  const notesText = params.additionalNotes && params.additionalNotes.trim() ? params.additionalNotes.trim() : "";
  const notesParagraphXml =
    `<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="right"/><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">اضافية :  </w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(notesText || "..................................")}</w:t></w:r></w:p>`;

  docXml = docXml.replace(/<w:p\b(?:(?!<\/w:p>)[\s\S])*?اضافية[\s\S]*?<\/w:p>/, notesParagraphXml);

  // 5. إزالة الفقرة الوهمية "خانه خاليه للملاحظات"
  docXml = docXml.replace(/<w:p\b(?:(?!<\/w:p>)[\s\S])*?خانه\s*خاليه\s*للملاحظات[\s\S]*?<\/w:p>/g, "");

  // 6. استبدال التوقيعات بأسفل الإقرار
  docXml = applyExellentSignatures(docXml, params);

  // 7. إزالة أي علامات حمراء وتكرارات التفقيط
  docXml = purgeExellentRedMarks(docXml);
  docXml = cleanDocxRepetitions(docXml);

  zip.file("word/document.xml", docXml);

  await applyExellentHeaderFooter(zip, params);

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}





// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. توليد الخطاب العام الموجه لجهة الإسناد (Exellent General Letter)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateExellentGeneralLetterDocx(params: {
  recipientPrefix?: string;
  recipientTitleAndAuthority?: string;
  letterSubject?: string;
  letterBody?: string;
  additionalNotes?: string;
  specialistTitle?: string;
  specialistName?: string;
  financeManagerTitle?: string;
  financeManagerName?: string;
  chairmanTitle?: string;
  boardChairman?: string;
  companyCommercialRegister?: string;
  companyTaxCard?: string;
  companyOpCode?: string;
  outgoingDate?: string;
  registrationNumber?: string;
  companyAddress?: string;
  phoneWhatsapp?: string;
  phoneMobile?: string;
  companyEmail?: string;
  companyOtherDetails?: string;
  qrBinary?: Uint8Array | null;
}): Promise<Blob> {
  const buffer = await fetchExellentDocxTemplate("general_letter_template.docx");
  const zip = await JSZip.loadAsync(buffer);

  let docXml = await zip.file("word/document.xml")!.async("text");

  if (params.qrBinary) {
    const qrXml = buildQrAnchorXml();
    docXml = injectSingleQrIntoDocXml(docXml, qrXml, escapeXml(params.registrationNumber || ""));
  }

  docXml = applyExellentRecipient(docXml, params.recipientPrefix, params.recipientTitleAndAuthority);

  // الموضوع بدقة متناهية دون المساس بنقاط جدول التوقيعات أو أي فقرة أخرى
  const safeSubj = escapeXml((params.letterSubject || "خطاب رسمي").trim());
  const subjPattern = /(<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?تمهيد[\s\S]*?بخصوص[\s\S]*?<w:t[^>]*>)\s*\.{3,}\s*(<\/w:t>[\s\S]*?<\/w:p>)/;
  if (subjPattern.test(docXml)) {
    docXml = docXml.replace(subjPattern, `$1 ${safeSubj}$2`);
  } else {
    docXml = docXml.replace(/تمهيد\s*:\s*بخصوص\s*:\s*\.{3,}/g, `تمهيد : بخصوص : ${safeSubj}`);
  }

  // استبدال متن الخطاب الكامل
  if (params.letterBody && params.letterBody.trim()) {
    const safeBody = escapeXml(params.letterBody.trim());
    const bodyParagraph = `<w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">${safeBody}</w:t></w:r>`;

    // استبدال الفقرة التجريبية من "الرجاء من سيادتكم" حتى "والمكاتبات الرسميه ."
    const dummyRegex = /<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?الرجاء من سيادتكم[\s\S]*?والمكاتبات الرسميه(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/;
    if (dummyRegex.test(docXml)) {
      const pOpen = `<w:p><w:pPr><w:spacing w:line="360" w:lineRule="auto"/><w:jc w:val="both"/><w:rPr><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr>${bodyParagraph}</w:p>`;
      docXml = docXml.replace(dummyRegex, pOpen);
    }
  }

  docXml = applyExellentSignatures(docXml, params);
  docXml = purgeExellentRedMarks(docXml);
  docXml = cleanDocxRepetitions(docXml);
  zip.file("word/document.xml", docXml);

  await applyExellentHeaderFooter(zip, params);

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}





// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. توليد خطاب التوضيح والاستفسارات (Exellent Clarification Letter)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export interface ExellentClarificationItem {
  id?: string;
  clauseName: string;
  clauseNumber?: string;
  description: string;
  proposal: string;
}

export function buildExellentClarificationTableRowsXml(items: ExellentClarificationItem[]): string {
  let rowsXml = "";
  const list = items && items.length > 0 ? items : [
    {
      clauseName: "بند رقم (1) من كراسة الشروط",
      clauseNumber: "1",
      description: "طلب توضيح المواصفات الفنية والمواعيد المقررة للتوريد",
      proposal: "اقتراح اعتماد الملحق التوضيحي وفقاً للمواصفات القياسية",
    }
  ];

  list.forEach((it, idx) => {
    const makeCell = (w: number, text: string, align: "center" | "right" = "center") => {
      const borders = '<w:top w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/><w:left w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/><w:bottom w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/><w:right w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/>';
      return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:tcBorders>${borders}</w:tcBorders><w:hideMark/></w:tcPr><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="${align}"/><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(text || "")}</w:t></w:r></w:p></w:tc>`;
    };

    const c0 = makeCell(630, String(idx + 1), "center");
    const c1 = makeCell(3334, it.clauseName, "right");
    const c2 = makeCell(992, it.clauseNumber || String(idx + 1), "center");
    const c3 = makeCell(2835, it.description, "right");
    const c4 = makeCell(2545, it.proposal, "right");

    rowsXml += `<w:tr><w:trPr><w:trHeight w:val="288"/><w:jc w:val="center"/></w:trPr>${c0}${c1}${c2}${c3}${c4}</w:tr>`;
  });

  return rowsXml;
}

export async function generateExellentClarificationDocx(params: {
  recipientPrefix?: string;
  recipientTitleAndAuthority?: string;
  clarificationSubject?: string;
  operationRegisteredName?: string;
  operationNumber?: string;
  tenderMethod?: string;
  operationScope?: string;
  fiscalYear?: string;
  technicalOpeningDate?: string;
  clarificationTargetText?: string;
  clarificationScopeText?: string;
  clarificationResponseDemand?: string;
  items?: ExellentClarificationItem[];
  inquiryNatureText?: string;
  requestedAction?: string;
  additionalNotes?: string;
  specialistName?: string;
  financeManagerName?: string;
  boardChairman?: string;
  companyCommercialRegister?: string;
  companyTaxCard?: string;
  companyOpCode?: string;
  outgoingDate?: string;
  registrationNumber?: string;
  companyAddress?: string;
  phoneWhatsapp?: string;
  phoneMobile?: string;
  companyEmail?: string;
  companyOtherDetails?: string;
  qrBinary?: Uint8Array | null;
}): Promise<Blob> {
  const buffer = await fetchExellentDocxTemplate("clarification_letter_template.docx");
  const zip = await JSZip.loadAsync(buffer);

  let docXml = await zip.file("word/document.xml")!.async("text");

  if (params.qrBinary) {
    const qrXml = buildQrAnchorXml();
    docXml = injectSingleQrIntoDocXml(docXml, qrXml, escapeXml(params.registrationNumber || ""));
  }

  const { cleanMethod, methodWithBa } = formatTenderMethod(params.tenderMethod);

  docXml = applyExellentRecipient(docXml, params.recipientPrefix, params.recipientTitleAndAuthority);

  docXml = docXml.replace(
    /توضيح واستفسار للأصناف والمواعيد/g,
    escapeXml(params.clarificationSubject || "توضيح واستفسار للأصناف والمواعيد")
  );
  docXml = applyExellentCommonDetails(docXml, params);

  docXml = applyExellentTenderMethod(docXml, params.tenderMethod);
  docXml = applyExellentCommonDetails(docXml, params);

  // استبدال نطاق الاستفسار في الفقرة القانونية
  const scopeVal = (params.clarificationScopeText || params.clarificationTargetText || "").trim();
  if (scopeVal) {
    const scopeXml = escapeXml(scopeVal);
    docXml = docXml.replace(
      /(?:ال\s*<\/w:t>[\s\S]*?)?توضيح واستفسار عن الأصناف[\s\S]*?والقانونيه/g,
      scopeXml
    );
    docXml = docXml.replace(
      /التوضيح والاستفسار عن الأصناف\s*–\s*المواعيد\s*–\s*بعض البنود الفنيه والقانونيه/g,
      scopeXml
    );
  }

  // استبدال طلب إصدار الملحق وميعاده
  if (params.clarificationResponseDemand && params.clarificationResponseDemand.trim()) {
    const demandXml = escapeXml(params.clarificationResponseDemand.trim());
    docXml = docXml.replace(
      /بخطاب معتمد وموافاتنا قبل الموعد المحدد[\s\S]*?المطلوب توضيحها/g,
      demandXml
    );
  }

  // استبدال جدول البنود
  const tableMatch = docXml.match(/<w:tbl[\s\S]*?<\/w:tbl>/);
  if (tableMatch) {
    const originalTable = tableMatch[0];
    const rows = originalTable.match(/<w:tr[\s\S]*?<\/w:tr>/g) || [];
    if (rows.length > 0) {
      const headerRow = rows[0];
      const newRowsXml = buildExellentClarificationTableRowsXml(params.items || []);
      const newTable = originalTable.replace(
        /<w:tr[\s\S]*<\/w:tr>/,
        () => `${headerRow}${newRowsXml}`
      );
      docXml = docXml.replace(originalTable, () => newTable);
    }
  }

  if (params.inquiryNatureText) {
    docXml = docXml.replace(
      /(وحيث[\s\S]*?<w:t[^>]*>)\s*عن نوع الاستفسار من الناحية\s*(<\/w:t>)/g,
      `$1${escapeXml(params.inquiryNatureText)}$2`
    );
    docXml = docXml.replace(/وحيث\s+عن نوع الاستفسار من الناحية/g, `وحيث ${escapeXml(params.inquiryNatureText)}`);
    docXml = docXml.replace(/عن نوع الاستفسار من الناحية/g, escapeXml(params.inquiryNatureText));
  }

  if (params.requestedAction) {
    docXml = docXml.replace(
      /(التكرم[\s\S]*?<w:t[^>]*>)\s*\.{5,}\s*(<\/w:t>)/g,
      `$1 ${escapeXml(params.requestedAction)}$2`
    );
    docXml = docXml.replace(/يرجى التكرم\s*\.{5,}/g, `يرجى التكرم ${escapeXml(params.requestedAction)}`);
  }

  docXml = applyExellentSignatures(docXml, params);
  docXml = purgeExellentRedMarks(docXml);
  docXml = cleanDocxRepetitions(docXml);
  zip.file("word/document.xml", docXml);

  await applyExellentHeaderFooter(zip, params);

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}





// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 9. توليد خطاب التظلم الفني أو المالي (Exellent Grievance Letter)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export interface ExellentGrievanceItem {
  id?: string;
  clauseName: string;
  clauseNumber?: string;
  actionTakenOrReason: string;
  correctiveAction: string;
}

export function buildExellentGrievanceTableRowsXml(items: ExellentGrievanceItem[]): string {
  let rowsXml = "";
  const list = items && items.length > 0 ? items : [
    {
      clauseName: "بند رقم (1) من كراسة الشروط والمواصفات",
      clauseNumber: "1",
      actionTakenOrReason: "استبعاد البند لعدم مطابقة الكتالوج الفني المقدم",
      correctiveAction: "إعادة فحص الكتالوج المعتمد وإرفاق شهادة المطابقة الصادرة من الشركة المصنعة",
    }
  ];

  list.forEach((it, idx) => {
    const makeCell = (w: number, text: string, align: "center" | "right" = "center") => {
      const borders = '<w:top w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/><w:left w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/><w:bottom w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/><w:right w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/>';
      return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:tcBorders>${borders}</w:tcBorders><w:hideMark/></w:tcPr><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="${align}"/><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(text || "")}</w:t></w:r></w:p></w:tc>`;
    };

    const c0 = makeCell(630, String(idx + 1), "center");
    const c1 = makeCell(3334, it.clauseName, "right");
    const c2 = makeCell(992, it.clauseNumber || String(idx + 1), "center");
    const c3 = makeCell(2835, it.actionTakenOrReason, "right");
    const c4 = makeCell(2545, it.correctiveAction, "right");

    rowsXml += `<w:tr><w:trPr><w:trHeight w:val="288"/><w:jc w:val="center"/></w:trPr>${c0}${c1}${c2}${c3}${c4}</w:tr>`;
  });

  return rowsXml;
}

export async function generateExellentGrievanceDocx(params: {
  recipientPrefix?: string;
  recipientTitleAndAuthority?: string;
  grievanceStageTitle?: string;
  operationRegisteredName?: string;
  operationNumber?: string;
  tenderMethod?: string;
  operationScope?: string;
  fiscalYear?: string;
  technicalOpeningDate?: string;
  grievanceReasonSubject?: string;
  items?: ExellentGrievanceItem[];
  grievanceAspectText?: string;
  grievanceRequestText?: string;
  additionalNotes?: string;
  specialistName?: string;
  financeManagerName?: string;
  boardChairman?: string;
  companyCommercialRegister?: string;
  companyTaxCard?: string;
  companyOpCode?: string;
  outgoingDate?: string;
  registrationNumber?: string;
  companyAddress?: string;
  phoneWhatsapp?: string;
  phoneMobile?: string;
  companyEmail?: string;
  companyOtherDetails?: string;
  qrBinary?: Uint8Array | null;
}): Promise<Blob> {
  const buffer = await fetchExellentDocxTemplate("grievance_letter_template.docx");
  const zip = await JSZip.loadAsync(buffer);

  let docXml = await zip.file("word/document.xml")!.async("text");

  if (params.qrBinary) {
    const qrXml = buildQrAnchorXml();
    docXml = injectSingleQrIntoDocXml(docXml, qrXml, escapeXml(params.registrationNumber || ""));
  }

  const { cleanMethod, methodWithBa } = formatTenderMethod(params.tenderMethod);

  docXml = applyExellentRecipient(docXml, params.recipientPrefix, params.recipientTitleAndAuthority);

  if (params.grievanceStageTitle) {
    docXml = docXml.replace(
      /(تظلم من[\s\S]*?<w:t[^>]*>)\s*نتيجة[\s\S]*?الفتح المالي\s*(<\/w:t>)/g,
      `$1${escapeXml(params.grievanceStageTitle)}$2`
    );
    docXml = docXml.replace(
      /نتيجة\s+البت الفني – ميعاد الفتح الفني البت المالى – الفتح المالي/g,
      escapeXml(params.grievanceStageTitle)
    );
  }
  docXml = applyExellentCommonDetails(docXml, params);

  docXml = applyExellentTenderMethod(docXml, params.tenderMethod);
  docXml = applyExellentCommonDetails(docXml, params);

  if (params.grievanceReasonSubject) {
    docXml = docXml.replace(
      /التظلمات وطلبات الاعتراض على النتيجة الفنيه/g,
      escapeXml(params.grievanceReasonSubject)
    );
  }

  // استبدال جدول التظلم
  const tableMatch = docXml.match(/<w:tbl[\s\S]*?<\/w:tbl>/);
  if (tableMatch) {
    const originalTable = tableMatch[0];
    const rows = originalTable.match(/<w:tr[\s\S]*?<\/w:tr>/g) || [];
    if (rows.length > 0) {
      const headerRow = rows[0];
      const newRowsXml = buildExellentGrievanceTableRowsXml(params.items || []);
      const newTable = originalTable.replace(
        /<w:tr[\s\S]*<\/w:tr>/,
        () => `${headerRow}${newRowsXml}`
      );
      docXml = docXml.replace(originalTable, () => newTable);
    }
  }

  if (params.grievanceAspectText) {
    docXml = docXml.replace(
      /(وحيث[\s\S]*?<w:t[^>]*>)\s*عن نوع الاستفسار من الناحية[\s\S]*?(<\/w:t>)/g,
      `$1${escapeXml(params.grievanceAspectText)}$2`
    );
    docXml = docXml.replace(/وحيث\s+عن نوع الاستفسار من الناحية/g, `وحيث ${escapeXml(params.grievanceAspectText)}`);
    docXml = docXml.replace(/عن نوع الاستفسار من الناحية/g, escapeXml(params.grievanceAspectText));
  }

  if (params.grievanceRequestText) {
    docXml = docXml.replace(
      /(الرجاء من سيادتكم التكرم[\s\S]*?<w:t[^>]*>)\s*\.{5,}\s*(<\/w:t>)/g,
      `$1 ${escapeXml(params.grievanceRequestText)}$2`
    );
    docXml = docXml.replace(
      /الرجاء من سيادتكم التكرم\s*\.{5,}/g,
      `الرجاء من سيادتكم التكرم ${escapeXml(params.grievanceRequestText)}`
    );
  }

  docXml = applyExellentSignatures(docXml, params);
  docXml = purgeExellentRedMarks(docXml);
  docXml = cleanDocxRepetitions(docXml);
  zip.file("word/document.xml", docXml);

  await applyExellentHeaderFooter(zip, params);

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}





// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 10. توليد خطاب سداد التأمين النهائي نقداً بالخزينة (Exellent Final Cash)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateExellentFinalInsuranceCashDocx(params: {
  recipientPrefix?: string;
  recipientTitleAndAuthority?: string;
  operationRegisteredName?: string;
  operationNumber?: string;
  insuranceAmount?: string;
  insuranceTafqeet?: string;
  tenderMethod?: string;
  operationScope?: string;
  fiscalYear?: string;
  technicalOpeningDate?: string;
  delegateName?: string;
  delegateTitle?: string;
  delegateNationalId?: string;
  delegatePowers?: string;
  guaranteePercentage?: string;
  operationTotalAmount?: string;
  operationTotalTafqeet?: string;
  additionalNotes?: string;
  specialistName?: string;
  financeManagerName?: string;
  boardChairman?: string;
  companyCommercialRegister?: string;
  companyTaxCard?: string;
  companyOpCode?: string;
  outgoingDate?: string;
  registrationNumber?: string;
  companyAddress?: string;
  phoneWhatsapp?: string;
  phoneMobile?: string;
  companyEmail?: string;
  companyOtherDetails?: string;
  qrBinary?: Uint8Array | null;
}): Promise<Blob> {
  const buffer = await fetchExellentDocxTemplate("final_insurance_cash_template.docx");
  const zip = await JSZip.loadAsync(buffer);

  let docXml = await zip.file("word/document.xml")!.async("text");

  if (params.qrBinary) {
    const qrXml = buildQrAnchorXml();
    docXml = injectSingleQrIntoDocXml(docXml, qrXml, escapeXml(params.registrationNumber || ""));
  }

  const { cleanMethod, methodWithBa } = formatTenderMethod(params.tenderMethod);

  docXml = applyExellentRecipient(docXml, params.recipientPrefix, params.recipientTitleAndAuthority);
  docXml = applyExellentTenderMethod(docXml, params.tenderMethod);
  docXml = applyExellentCommonDetails(docXml, params);
  const cleanInsTafqeet = cleanTafqeetForTemplate(params.insuranceTafqeet);
  if (params.insuranceAmount) {
    docXml = docXml.replace(/10000/g, escapeXml(params.insuranceAmount));
  }
  if (cleanInsTafqeet) {
    docXml = docXml.replace(/عشرة\s+[أاآ]لاف\s+جنيه/g, escapeXml(cleanInsTafqeet) + " جنيه");
  }

  docXml = docXml.replace(/5\s*%/g, escapeXml(params.guaranteePercentage || "5 %"));
  if (params.operationTotalAmount) {
    const totalVal = escapeXml(params.operationTotalAmount.trim());
    docXml = docXml.replace(
      /(من اجمالى العمليه وقدرها[\s\S]*?<w:t[^>]*>)\s*\.{3,}\s*(<\/w:t>)/,
      `$1${totalVal}$2`
    );
    docXml = docXml.replace(/\(\s*\.{5,}\s*\)/g, `( ${totalVal} )`);
  }
  const cleanTotTafq = cleanTafqeetForTemplate(params.operationTotalTafqeet);
  if (cleanTotTafq) {
    docXml = docXml.replace(
      /(\)\s*[\s\S]*?<w:t[^>]*>)\s*\.{5,}\s*(<\/w:t>)/,
      `$1${escapeXml(cleanTotTafq)} جنيه مصري لا غير$2`
    );
  }
  docXml = purgeTafqeetDuplicates(docXml);

  docXml = applyExellentSignatures(docXml, params);
  docXml = purgeExellentRedMarks(docXml);
  docXml = cleanDocxRepetitions(docXml);
  zip.file("word/document.xml", docXml);

  await applyExellentHeaderFooter(zip, params);

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}





// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 11. توليد خطاب خصم التأمين النهائي من مستحقات (Exellent Final Deduction)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateExellentFinalInsuranceDeductionDocx(params: {
  recipientPrefix?: string;
  recipientTitleAndAuthority?: string;
  operationRegisteredName?: string;
  operationNumber?: string;
  insuranceAmount?: string;
  insuranceTafqeet?: string;
  deductionOperationName?: string;
  deductionMonth?: string;
  deductionYear?: string;
  tenderMethod?: string;
  operationScope?: string;
  fiscalYear?: string;
  technicalOpeningDate?: string;
  delegateName?: string;
  delegateTitle?: string;
  delegateNationalId?: string;
  delegatePowers?: string;
  guaranteePercentage?: string;
  operationTotalAmount?: string;
  operationTotalTafqeet?: string;
  additionalNotes?: string;
  specialistName?: string;
  financeManagerName?: string;
  boardChairman?: string;
  companyCommercialRegister?: string;
  companyTaxCard?: string;
  companyOpCode?: string;
  outgoingDate?: string;
  registrationNumber?: string;
  companyAddress?: string;
  phoneWhatsapp?: string;
  phoneMobile?: string;
  companyEmail?: string;
  companyOtherDetails?: string;
  qrBinary?: Uint8Array | null;
}): Promise<Blob> {
  const buffer = await fetchExellentDocxTemplate("final_insurance_deduction_template.docx");
  const zip = await JSZip.loadAsync(buffer);

  let docXml = await zip.file("word/document.xml")!.async("text");

  if (params.qrBinary) {
    const qrXml = buildQrAnchorXml();
    docXml = injectSingleQrIntoDocXml(docXml, qrXml, escapeXml(params.registrationNumber || ""));
  }

  const { cleanMethod, methodWithBa } = formatTenderMethod(params.tenderMethod);

  docXml = applyExellentRecipient(docXml, params.recipientPrefix, params.recipientTitleAndAuthority);
  docXml = applyExellentCommonDetails(docXml, params);

  const cleanInsTafqeet = cleanTafqeetForTemplate(params.insuranceTafqeet);
  docXml = docXml.replace(/10000/g, escapeXml(params.insuranceAmount || "10000"));
  if (cleanInsTafqeet) {
    docXml = docXml.replace(/عشرة\s+[أاآ]لاف\s+جنيه/g, escapeXml(cleanInsTafqeet) + " جنيه");
  }

  // تفاصيل الخصم من مستحقات العملية
  if (params.deductionOperationName) {
    docXml = docXml.replace(
      /(في\s*العملي[ةه][\s\S]*?<w:t[^>]*>)\s*\.{3,}\s*(<\/w:t>)/,
      `$1${escapeXml(params.deductionOperationName)}$2`
    );
    docXml = docXml.replace(/في العمليه\s*\.{3,}/g, `في العمليه ${escapeXml(params.deductionOperationName)}`);
  }
  if (params.deductionMonth) {
    docXml = docXml.replace(
      /(عن\s*شهر[\s\S]*?<w:t[^>]*>)\s*\.{3,}\s*(<\/w:t>)/,
      `$1${escapeXml(params.deductionMonth)}$2`
    );
    docXml = docXml.replace(/عن شهر\s*\.?\.{3,}/g, `عن شهر ${escapeXml(params.deductionMonth)} `);
  }
  if (params.deductionYear) {
    docXml = docXml.replace(
      /(السنة[\s\S]*?<w:t[^>]*>)\s*\.{3,}\s*(<\/w:t>)/,
      `$1${escapeXml(params.deductionYear)}$2`
    );
    docXml = docXml.replace(/السنة\s*\.{3,}/g, `السنة ${escapeXml(params.deductionYear)}`);
  }

  docXml = applyExellentTenderMethod(docXml, params.tenderMethod);
  docXml = applyExellentCommonDetails(docXml, params);

  docXml = docXml.replace(/أحمد محمد أحمد\s*/g, escapeXml(params.delegateName || "................") + " ");
  docXml = docXml.replace(/مندوب التعاقدات المفوض/g, escapeXml(params.delegateTitle || "مندوب التعاقدات المفوض"));
  docXml = docXml.replace(/23056289523202/g, escapeXml(params.delegateNationalId || "................"));
  if (params.delegatePowers) {
    docXml = docXml.replace(/والتوقيع على العقود واستلام الخطابات والمكاتبات الرسميه/g, escapeXml(params.delegatePowers));
  }

  docXml = docXml.replace(/5\s*%/g, escapeXml(params.guaranteePercentage || "5 %"));
  if (params.operationTotalAmount) {
    const totalVal = escapeXml(params.operationTotalAmount.trim());
    docXml = docXml.replace(
      /(من اجمالى العمليه وقدرها[\s\S]*?<w:t[^>]*>)\s*\.{3,}\s*(<\/w:t>)/,
      `$1${totalVal}$2`
    );
    docXml = docXml.replace(/\(\s*\.{5,}\s*\)/g, `( ${totalVal} )`);
  }
  const cleanTotTafq = cleanTafqeetForTemplate(params.operationTotalTafqeet);
  if (cleanTotTafq) {
    docXml = docXml.replace(
      /(\)\s*[\s\S]*?<w:t[^>]*>)\s*\.{5,}\s*(<\/w:t>)/,
      `$1${escapeXml(cleanTotTafq)} جنيه مصري لا غير$2`
    );
  }
  docXml = purgeTafqeetDuplicates(docXml);

  docXml = applyExellentSignatures(docXml, params);
  docXml = purgeExellentRedMarks(docXml);
  docXml = cleanDocxRepetitions(docXml);
  zip.file("word/document.xml", docXml);

  await applyExellentHeaderFooter(zip, params);

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}





// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 12. توليد خطاب خصم النهائي وتحويل الابتدائي (Exellent Deduction & Initial)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateExellentFinalInsuranceDeductionAndInitialDocx(params: {
  recipientPrefix?: string;
  recipientTitleAndAuthority?: string;
  operationRegisteredName?: string;
  operationNumber?: string;
  cashAmount?: string;
  cashTafqeet?: string;
  initialTransferredAmount?: string;
  initialTransferredTafqeet?: string;
  tenderMethod?: string;
  operationScope?: string;
  fiscalYear?: string;
  technicalOpeningDate?: string;
  delegateName?: string;
  delegateTitle?: string;
  delegateNationalId?: string;
  delegatePowers?: string;
  guaranteePercentage?: string;
  operationTotalAmount?: string;
  operationTotalTafqeet?: string;
  additionalNotes?: string;
  specialistName?: string;
  financeManagerName?: string;
  boardChairman?: string;
  companyCommercialRegister?: string;
  companyTaxCard?: string;
  companyOpCode?: string;
  outgoingDate?: string;
  registrationNumber?: string;
  companyAddress?: string;
  phoneWhatsapp?: string;
  phoneMobile?: string;
  companyEmail?: string;
  companyOtherDetails?: string;
  qrBinary?: Uint8Array | null;
}): Promise<Blob> {
  const buffer = await fetchExellentDocxTemplate("final_insurance_deduction_and_initial_template.docx");
  const zip = await JSZip.loadAsync(buffer);

  let docXml = await zip.file("word/document.xml")!.async("text");

  if (params.qrBinary) {
    const qrXml = buildQrAnchorXml();
    docXml = injectSingleQrIntoDocXml(docXml, qrXml, escapeXml(params.registrationNumber || ""));
  }

  const { cleanMethod, methodWithBa } = formatTenderMethod(params.tenderMethod);

  docXml = applyExellentRecipient(docXml, params.recipientPrefix, params.recipientTitleAndAuthority);
  docXml = applyExellentCommonDetails(docXml, params);

  docXml = docXml.replace(/1000/g, escapeXml(params.cashAmount || "1000"));
  docXml = docXml.replace(/عشرة\s+[أاآ]لاف\s+جنيه/g, escapeXml(params.cashTafqeet || "عشرة ألاف جنيه"));

  docXml = docXml.replace(/11111/g, escapeXml(params.initialTransferredAmount || "11111"));
  docXml = docXml.replace(/خمسة الاف جنيه/g, escapeXml(params.initialTransferredTafqeet || "خمسة الاف جنيه"));

  docXml = applyExellentTenderMethod(docXml, params.tenderMethod);
  docXml = applyExellentCommonDetails(docXml, params);

  docXml = docXml.replace(/أحمد محمد أحمد\s*/g, escapeXml(params.delegateName || "................") + " ");
  docXml = docXml.replace(/مندوب التعاقدات المفوض/g, escapeXml(params.delegateTitle || "مندوب التعاقدات المفوض"));
  docXml = docXml.replace(/23056289523202/g, escapeXml(params.delegateNationalId || "................"));
  if (params.delegatePowers) {
    docXml = docXml.replace(/والتوقيع على العقود واستلام الخطابات والمكاتبات الرسميه/g, escapeXml(params.delegatePowers));
  }

  docXml = docXml.replace(/5\s*%/g, escapeXml(params.guaranteePercentage || "5 %"));
  if (params.operationTotalAmount) {
    const totalVal = escapeXml(params.operationTotalAmount.trim());
    docXml = docXml.replace(
      /(من اجمالى العمليه وقدرها[\s\S]*?<w:t[^>]*>)\s*\.{3,}\s*(<\/w:t>)/,
      `$1${totalVal}$2`
    );
    docXml = docXml.replace(/\(\s*\.{5,}\s*\)/g, `( ${totalVal} )`);
  }
  const cleanTotTafq = cleanTafqeetForTemplate(params.operationTotalTafqeet);
  if (cleanTotTafq) {
    docXml = docXml.replace(
      /(\)\s*[\s\S]*?<w:t[^>]*>)\s*\.{5,}\s*(<\/w:t>)/,
      `$1${escapeXml(cleanTotTafq)} جنيه مصري لا غير$2`
    );
  }
  docXml = purgeTafqeetDuplicates(docXml);

  docXml = applyExellentSignatures(docXml, params);
  docXml = purgeExellentRedMarks(docXml);
  docXml = cleanDocxRepetitions(docXml);
  zip.file("word/document.xml", docXml);

  await applyExellentHeaderFooter(zip, params);

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}





// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 13. توليد خطاب استرداد التأمين النهائي (Exellent Final Refund)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateExellentFinalInsuranceRefundDocx(params: {
  recipientPrefix?: string;
  recipientTitleAndAuthority?: string;
  operationRegisteredName?: string;
  operationNumber?: string;
  refundAmount?: string;
  refundTafqeet?: string;
  paymentMethod?: "DEDUCTION" | "CASH_RECEIPT";
  deductionOperationName?: string;
  deductionMonth?: string;
  deductionYear?: string;
  receiptNumber?: string;
  receiptDate?: string;
  tenderMethod?: string;
  operationScope?: string;
  fiscalYear?: string;
  technicalOpeningDate?: string;
  bankName?: string;
  bankBranch?: string;
  accountHolderName?: string;
  bankAccountNumber?: string;
  accountNationalId?: string;
  additionalNotes?: string;
  specialistName?: string;
  financeManagerName?: string;
  boardChairman?: string;
  companyCommercialRegister?: string;
  companyTaxCard?: string;
  companyOpCode?: string;
  outgoingDate?: string;
  registrationNumber?: string;
  companyAddress?: string;
  phoneWhatsapp?: string;
  phoneMobile?: string;
  companyEmail?: string;
  companyOtherDetails?: string;
  attachmentType?: "COPY" | "ORIGINAL";
  attachmentNote?: string;
  qrBinary?: Uint8Array | null;
}): Promise<Blob> {
  const buffer = await fetchExellentDocxTemplate("final_insurance_refund_template.docx");
  const zip = await JSZip.loadAsync(buffer);

  let docXml = await zip.file("word/document.xml")!.async("text");

  // 1. تضمين رمز الباركود QR المعتمد داخل جسم المستند مع ربط ملف العلاقات
  if (params.qrBinary) {
    try {
      zip.file("word/media/doc_qr.png", params.qrBinary);

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

      const qrXml = buildQrAnchorXml();
      docXml = injectSingleQrIntoDocXml(docXml, qrXml, escapeXml(params.registrationNumber || ""));
    } catch (e) {
      console.warn("QR attachment failed in generateExellentFinalInsuranceRefundDocx:", e);
    }
  }

  const { cleanMethod, methodWithBa } = formatTenderMethod(params.tenderMethod);

  docXml = applyExellentRecipient(docXml, params.recipientPrefix, params.recipientTitleAndAuthority);
  docXml = applyExellentCommonDetails(docXml, params);

  // 2. استبدال المبلغ والتفقيط بدقة متناهية وبدون أي تكرار لكلمة (فقط وقدره) أو (لا غير)
  docXml = docXml.replace(/10000/g, escapeXml(params.refundAmount || "10000"));

  const tafqeetClean = (params.refundTafqeet || "عشرة آلاف جنيه مصري لا غير").trim();
  const sTafqeetToken = '<w:t xml:space="preserve"> فقط : </w:t>';
  const eTafqeetToken = 'لا غير </w:t></w:r>';
  const sTafIdx = docXml.indexOf(sTafqeetToken);
  const eTafIdx = docXml.indexOf(eTafqeetToken, sTafIdx !== -1 ? sTafIdx : 0);

  if (sTafIdx !== -1 && eTafIdx !== -1) {
    const beforeTaf = docXml.substring(0, sTafIdx);
    const afterTaf = docXml.substring(eTafIdx + eTafqeetToken.length);
    docXml = beforeTaf + `<w:t xml:space="preserve"> ( ${escapeXml(tafqeetClean)} ) </w:t></w:r>` + afterTaf;
  } else {
    docXml = docXml.replace(/عشرة\s+[أاآ]لاف\s+جنيه(?:\s*لا\s*غير)?/g, escapeXml(cleanTafqeetForTemplate(tafqeetClean)));
  }

  // 3. استبدال جملة طريقة السداد بدقة شاملة لكامل الكتلة بين (والمسدد) و (والخاصة)
  let paymentText = "";
  if (params.paymentMethod === "DEDUCTION") {
    paymentText = `خصما من مستحقات الشركة في عملية (${escapeXml(params.deductionOperationName || "........")}) عن شهر (${escapeXml(params.deductionMonth || "........")}) لسنة (${escapeXml(params.deductionYear || "....")})`;
  } else {
    paymentText = `بإيصال سداد نقدي رقم (${escapeXml(params.receiptNumber || "........")})${params.receiptDate ? ` بتاريخ (${escapeXml(params.receiptDate)})` : ""}`;
  }

  const sPayToken = '<w:t>والمسدد';
  const ePayToken = 'والخاصة';
  const sPayIdx = docXml.indexOf(sPayToken);
  const ePayIdx = docXml.indexOf(ePayToken, sPayIdx !== -1 ? sPayIdx : 0);

  if (sPayIdx !== -1 && ePayIdx !== -1) {
    const beforePay = docXml.substring(0, sPayIdx);
    const afterPay = docXml.substring(ePayIdx);
    const replacementPay = `<w:t xml:space="preserve">والمسدد ( ${paymentText} ) </w:t></w:r><w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">`;
    docXml = beforePay + replacementPay + afterPay;
  } else {
    docXml = docXml.replace(
      /والمسدد[\s\S]*?والخاصة/g,
      `والمسدد ( ${paymentText} ) والخاصة`
    );
  }

  docXml = applyExellentTenderMethod(docXml, params.tenderMethod);
  docXml = applyExellentCommonDetails(docXml, params);

  // 4. استبدال بيانات الحساب البنكي
  docXml = docXml.replace(/بنك مصر/g, escapeXml(params.bankName || "بنك مصر"));
  docXml = docXml.replace(/أحمد زويل/g, escapeXml(params.bankBranch || "أحمد زويل"));
  docXml = docXml.replace(/إيهاب عبدربة بصل/g, escapeXml(params.accountHolderName || ""));
  docXml = docXml.replace(/111111111111111111/g, escapeXml(params.bankAccountNumber || ""));
  docXml = docXml.replace(/2831210021512/g, escapeXml(params.accountNationalId || ""));

  // 5. استبدال فقرة المرفقات (أصل أو صورة إيصال السداد)
  const defaultAttText = params.attachmentType === "ORIGINAL" ? "مرفق أصل من إيصال السداد" : "مرفق صورة من إيصال السداد";
  const finalAttText = params.attachmentNote || defaultAttText;
  if (finalAttText) {
    const attachParagraphXml = `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:rPr><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">${escapeXml(finalAttText)}</w:t></w:r></w:p>`;
    if (docXml.includes("<w:tbl")) {
      docXml = docXml.replace("<w:tbl", `${attachParagraphXml}<w:tbl`);
    }
  }

  docXml = applyExellentSignatures(docXml, params);
  docXml = purgeExellentRedMarks(docXml);
  docXml = cleanDocxRepetitions(docXml);
  zip.file("word/document.xml", docXml);

  await applyExellentHeaderFooter(zip, params);

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}





// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 14. توليد شهادة الضمان الرسمية المعتمدة (Exellent Warranty Certificate)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export interface ExellentWarrantyItem {
  id?: string;
  itemName: string;
  unit: string;
  quantity: string;
  description: string;
  notes: string;
}

export function buildExellentWarrantyTableRowsXml(items: ExellentWarrantyItem[]): string {
  let rowsXml = "";
  items.forEach((item, idx) => {
    const makeCell = (w: number, text: string, align: "center" | "right" = "center") => {
      const borders = '<w:top w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/><w:left w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/><w:bottom w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/><w:right w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/>';
      return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:tcBorders>${borders}</w:tcBorders><w:hideMark/></w:tcPr><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="${align}"/><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(text || "")}</w:t></w:r></w:p></w:tc>`;
    };
    const c0 = makeCell(561, String(idx + 1), "center");
    const c1 = makeCell(3593, item.itemName, "right");
    const c2 = makeCell(977, item.unit, "center");
    const c3 = makeCell(977, item.quantity, "center");
    const c4 = makeCell(2798, item.description, "right");
    const c5 = makeCell(1241, item.notes, "right");
    rowsXml += `<w:tr><w:trPr><w:trHeight w:val="330"/></w:trPr>${c0}${c1}${c2}${c3}${c4}${c5}</w:tr>`;
  });
  return rowsXml;
}

export async function generateExellentWarrantyCertificateDocx(params: {
  recipientPrefix?: string;
  recipientTitleAndAuthority?: string;
  subjectTarget?: string;
  operationRegisteredName?: string;
  operationNumber?: string;
  companyName?: string;
  suppliedItemsCategory?: string;
  authorityShort?: string;
  tenderMethod?: string;
  operationScope?: string;
  fiscalYear?: string;
  technicalOpeningDate?: string;
  items?: ExellentWarrantyItem[];
  warrantyDuration?: string;
  warrantyCoverage?: string;
  case1?: string;
  case2?: string;
  case3?: string;
  case4?: string;
  validityDuration?: string;
  additionalNotes?: string;
  engineerSpecialist?: string;
  financeManager?: string;
  boardChairman?: string;
  companyCommercialRegister?: string;
  companyTaxCard?: string;
  companyOpCode?: string;
  outgoingDate?: string;
  registrationNumber?: string;
  companyAddress?: string;
  phoneWhatsapp?: string;
  phoneMobile?: string;
  companyEmail?: string;
  companyOtherDetails?: string;
  qrBinary?: Uint8Array | null;
}): Promise<Blob> {
  const buffer = await fetchExellentDocxTemplate("warranty_certificate_template.docx");
  const zip = await JSZip.loadAsync(buffer);

  let docXml = await zip.file("word/document.xml")!.async("text");

  if (params.qrBinary) {
    const qrXml = buildQrAnchorXml();
    docXml = injectSingleQrIntoDocXml(docXml, qrXml, escapeXml(params.registrationNumber || ""));
  }

  const { cleanMethod, methodWithBa } = formatTenderMethod(params.tenderMethod);

  docXml = applyExellentRecipient(docXml, params.recipientPrefix, params.recipientTitleAndAuthority);

  docXml = docXml.replace(/للأصناف الموردة/g, escapeXml(params.subjectTarget || "للأصناف الموردة"));
  docXml = applyExellentCommonDetails(docXml, params);

  docXml = docXml.replace(/إكسلانت سرفيس|اكسلانت سرفيس/g, escapeXml(params.companyName || "إكسلنت"));
  docXml = docXml.replace(/كاوتش وبطاريات/g, escapeXml(params.suppliedItemsCategory || "الأصناف والمهمات الموردة"));
  docXml = docXml.replace(/الجامعه/g, escapeXml(params.authorityShort || "الجهة الإدارية"));

  docXml = applyExellentTenderMethod(docXml, params.tenderMethod);
  docXml = applyExellentCommonDetails(docXml, params);

  // استبدال جدول الأصناف
  const tableMatch = docXml.match(/<w:tbl[\s\S]*?<\/w:tbl>/);
  if (tableMatch) {
    const originalTable = tableMatch[0];
    const rows = originalTable.match(/<w:tr[\s\S]*?<\/w:tr>/g) || [];
    if (rows.length > 0) {
      const headerRow = rows[0];
      const newRowsXml = buildExellentWarrantyTableRowsXml(params.items || []);
      const newTable = originalTable.replace(
        /<w:tr[\s\S]*<\/w:tr>/,
        () => `${headerRow}${newRowsXml}`
      );
      docXml = docXml.replace(originalTable, () => newTable);
    }
  }

  // 1. مدة الضمان وتغطيته بدقة مطلقة تمنع أي تكرار
  const duration = (params.warrantyDuration || "سنة").trim();
  let coverage = (params.warrantyCoverage || "ضد كافة عيوب الصناعة وعيوب المواد والخامات المصنعية").trim();
  coverage = coverage.replace(/^في\s+/i, "").trim();
  coverage = coverage.replace(/^ضد\s+عيوب\s+الصناع[ةه]\s+في\s+/i, "").trim();
  if (!coverage.startsWith("ضد")) {
    coverage = `ضد ${coverage}`;
  }
  const durationCombined = `${escapeXml(duration)} ${escapeXml(coverage)}`.trim();

  const warrantyDurationPXml =
    `<w:p w14:paraId="6EC61F2C" w14:textId="60BF4A65" w:rsidR="00C113B2" w:rsidRDefault="00C113B2" w:rsidP="00E75FA0">` +
    `<w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="4"/></w:numPr>` +
    `<w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="679" w:hanging="270"/><w:jc w:val="mediumKashida"/>` +
    `<w:rPr><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:u w:val="single"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr>` +
    `<w:r w:rsidRPr="00D36FD3"><w:rPr><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:u w:val="single"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>مدة الضمان</w:t></w:r>` +
    `<w:r w:rsidRPr="00D36FD3"><w:rPr><w:rFonts w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>:</w:t></w:r>` +
    `<w:r w:rsidRPr="00D36FD3"><w:rPr><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ${durationCombined}</w:t></w:r></w:p>`;

  docXml = docXml.replace(/<w:p\b(?:(?!<\/w:p>)[\s\S])*?مدة\s*الضمان[\s\S]*?<\/w:p>/, warrantyDurationPXml);

  // 2. معالجة الحالات التي لا يسري فيها الضمان (الحذف التام للفقرة عند مسحها بالواجهة)
  const c1 = (params.case1 || "").trim();
  const c2 = (params.case2 || "").trim();
  const c3 = (params.case3 || "").trim();
  const c4 = (params.case4 || "").trim();

  if (c1) {
    docXml = docXml.replace(/زيادة ضغط الهواء بالاطارات\.?\s*/g, escapeXml(c1.replace(/\.$/, "")) + ".");
  } else {
    docXml = docXml.replace(/<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?زيادة ضغط الهواء بالاطارات(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/g, "");
  }

  if (c2) {
    docXml = docXml.replace(/التعرض للصدمات أو اى الات حادة\.?\s*/g, escapeXml(c2.replace(/\.$/, "")) + ".");
  } else {
    docXml = docXml.replace(/<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?التعرض للصدمات(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/g, "");
  }

  if (c3) {
    docXml = docXml.replace(/سوء الاستخدام\.?\s*/g, escapeXml(c3.replace(/\.$/, "")) + ".");
  } else {
    docXml = docXml.replace(/<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?سوء الاستخدام(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/g, "");
  }

  if (c4) {
    docXml = docXml.replace(/أي شطب أو تعديل في هذه الشهادة تعتبر لاغيه\.?\s*/g, escapeXml(c4.replace(/\.$/, "")) + ".");
  } else {
    docXml = docXml.replace(/<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?أي شطب أو تعديل(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/g, "");
  }

  // إذا تم مسح كافة الحالات الأربعة -> حذف عنوان "لا يسرى الضمان في الحالات الاتيه"
  if (!c1 && !c2 && !c3 && !c4) {
    docXml = docXml.replace(/<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?لا يسرى الضمان في الحالات الاتيه(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/g, "");
  }

  // 3. مدة سريان الشهادة
  const valDur = (params.validityDuration || "").trim();
  if (valDur) {
    docXml = docXml.replace(
      /مدة سريان الشهادة\s*\(\s*ستة أشهر\s*\)/g,
      `مدة سريان الشهادة ( ${escapeXml(valDur)} )`
    );
  } else {
    docXml = docXml.replace(/<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?مدة سريان الشهادة(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/g, "");
  }

  docXml = applyExellentSignatures(docXml, {
    specialistName: params.engineerSpecialist,
    financeManagerName: params.financeManager,
    boardChairman: params.boardChairman,
    additionalNotes: params.additionalNotes,
  });

  docXml = purgeExellentRedMarks(docXml);
  docXml = cleanDocxRepetitions(docXml);
  zip.file("word/document.xml", docXml);

  await applyExellentHeaderFooter(zip, params);

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}



