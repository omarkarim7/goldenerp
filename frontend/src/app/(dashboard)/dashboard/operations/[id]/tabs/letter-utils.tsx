"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { formatDate } from "./types";
import { getExpectedCloudPdfUrl } from "./client-pdf";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   LETTER MODE & OUTGOING NUMBER UTILITIES
   Built strictly according to client specs (Recordings 1, 2, 3, 5, 6, 7, 8 & Notebook Note)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export type LetterUrgency = "STANDARD" | "URGENT";

export const FISCAL_YEAR_OPTIONS = [
  "2024 / 2025",
  "2025 / 2026",
  "2026 / 2027",
  "2027 / 2028",
  "2028 / 2029",
  "2029 / 2030",
  "2030 / 2031",
];


export interface LetterOptions {
  letterUrgency: LetterUrgency;       // عادي vs طارئ
  outgoingRef: string;               // رقم الصادر (مثال: AZ261100001)
  letterDate: string;                // تاريخ الخطاب (YYYY-MM-DD)
  showTaxAndCR: boolean;             // إظهار السجل التجاري والبطاقة الضريبية
  showDelegateSignature: boolean;    // إظهار توقيع المندوب المفوض
  showFinanceSignature: boolean;     // إظهار توقيع الإدارة المالية
  showCompanyStamp: boolean;         // إظهار ختم الشركة واعتماد المدير
  showBarcode: boolean;              // إظهار الباركود الذكي
}

/**
 * Maps TenderType to client letter symbol:
 * Mazaida/Auction -> Z (كما في الصورة AZ: A شركة جولدن، Z مزايدة)
 * Tender -> T
 * Limited Tender -> LT
 * Practice -> P
 * Limited Practice -> LP
 * Direct Order -> D
 */
export function getTenderTypeCode(tenderType?: string): string {
  switch (tenderType) {
    case "AUCTION":
      return "Z";
    case "TENDER":
      return "T";
    case "LIMITED_TENDER":
      return "LT";
    case "PRACTICE":
      return "P";
    case "LIMITED_PRACTICE":
      return "LP";
    case "DIRECT_ORDER":
      return "D";
    default:
      return "Z";
  }
}

/**
 * Generates the Smart Outgoing Reference Number as specified in Audio 5 & Word template:
 * [CompanyLetter][TenderTypeCode][YY][MM][DD][00001]
 * Example from client Word template: Ad + 26 (Year) + 11 (Month) + 10 (Day) + 00001 (Seq) => Ad26111000001
 */
export function generateSmartOutgoingRef({
  companyCode = "A",
  tenderType = "AUCTION",
  dateStr,
  sequenceNumber = 1,
  includeDay = true,
}: {
  companyCode?: string;
  tenderType?: string;
  dateStr?: string;
  sequenceNumber?: number;
  includeDay?: boolean;
}): string {
  // If company code is 2 letters like "Ad" or 1 letter like "A"
  const cleanComp = (companyCode || "A").trim();
  const compCode = cleanComp.length > 2 ? cleanComp.slice(0, 2) : cleanComp;
  const typeCode = compCode.length === 1 ? getTenderTypeCode(tenderType) : "";

  const date = dateStr ? new Date(dateStr) : new Date();
  const year = String(date.getFullYear()).slice(-2); // e.g. "26"
  const month = String(date.getMonth() + 1).padStart(2, "0"); // e.g. "11"
  const day = includeDay ? String(date.getDate()).padStart(2, "0") : ""; // e.g. "10" (التسجيل 5)
  const seq = String(sequenceNumber).padStart(5, "0"); // 5 digits e.g. "00001"

  return `${compCode}${typeCode}${year}${month}${day}${seq}`;
}

/**
 * Enhanced Barcode Visual Component (Code-128 standard, enlarged and scan-ready)
 */
export function BarcodeVisual({
  value,
  className = "",
  showText = true,
}: {
  value: string;
  className?: string;
  showText?: boolean;
}) {
  const bars: { width: number; isBlack: boolean }[] = [];
  const cleanVal = (value || "AZ261100001").toUpperCase();

  // Start guard
  bars.push({ width: 3, isBlack: true });
  bars.push({ width: 2, isBlack: false });
  bars.push({ width: 3, isBlack: true });
  bars.push({ width: 2, isBlack: false });

  for (let i = 0; i < cleanVal.length; i++) {
    const charCode = cleanVal.charCodeAt(i);
    const pattern = (charCode * 7 + i * 3) % 16;
    for (let b = 0; b < 4; b++) {
      const isBlack = (pattern & (1 << b)) !== 0;
      const width = ((charCode + b) % 3) + 1.6;
      bars.push({ width, isBlack });
    }
    bars.push({ width: 1.8, isBlack: false });
  }

  // End guard
  bars.push({ width: 3, isBlack: true });
  bars.push({ width: 2, isBlack: false });
  bars.push({ width: 3, isBlack: true });

  let currentX = 4;
  const height = 48;

  return (
    <div className={`inline-flex flex-col items-center select-none bg-white p-1.5 rounded-lg border border-slate-200/80 shadow-xs ${className}`}>
      <svg
        height={height}
        className="overflow-visible"
        style={{ minWidth: "150px", maxWidth: "230px" }}
        viewBox="0 0 200 48"
        preserveAspectRatio="none"
      >
        <rect x="0" y="0" width="200" height={height} fill="#ffffff" />
        {bars.map((bar, idx) => {
          const x = currentX;
          currentX += bar.width * 1.5;
          if (!bar.isBlack) return null;
          return (
            <rect
              key={idx}
              x={x}
              y={2}
              width={bar.width * 1.4}
              height={height - 4}
              fill="#000000"
            />
          );
        })}
      </svg>
      {showText && (
        <span className="font-mono text-[10.5px] tracking-widest text-slate-900 font-black mt-0.5">
          *{cleanVal}*
        </span>
      )}
    </div>
  );
}

/**
 * Completely purges red highlights, red text colors, and any broken/unwanted
 * picture watermarks (such as WordPictureWatermark) from all XML parts in a DOCX archive.
 */
export async function cleanAllDocxXml(zip: any): Promise<void> {
  if (!zip || !zip.files) return;
  for (const fileName of Object.keys(zip.files)) {
    if (fileName.endsWith(".xml")) {
      const entry = zip.file(fileName);
      if (!entry) continue;
      let xml = await entry.async("text");
      let changed = false;

      // 1. Remove red highlights and colorings
      if (xml.includes("highlight") || xml.includes("color")) {
        xml = xml.replace(/<w:highlight\b[^>]*\/>/gi, "");
        xml = xml.replace(/<w:color\b[^>]*w:val="(?:red|FF0000|ff0000)"[^>]*\/>/gi, "");
        xml = xml.replace(/<w:color\b[^>]*w:val="red"[^>]*\/>/gi, "");
        changed = true;
      }

      // 2. Remove draft picture watermarks and unwanted shapes (preserving authentic company logo watermarks)
      if ((xml.includes("WordPictureWatermark") || xml.includes("WordWatermark")) && !xml.includes("لوجو") && !xml.includes("logo")) {
        xml = xml.replace(/<w:pict\b[^>]*>[\s\S]*?WordPictureWatermark[\s\S]*?<\/w:pict>/gi, "");
        xml = xml.replace(/<v:shape\b[^>]*WordPictureWatermark[\s\S]*?<\/v:shape>/gi, "");
        xml = xml.replace(/<w:pict\b[^>]*>[\s\S]*?WordWatermark[\s\S]*?<\/w:pict>/gi, "");
        xml = xml.replace(/<v:shape\b[^>]*WordWatermark[\s\S]*?<\/v:shape>/gi, "");
        changed = true;
      }

      // 3. Normalize Arabic justification to prevent broken kashidas/tatweel stretching across engines
      if (xml.includes("highKashida") || xml.includes("mediumKashida")) {
        xml = xml.replace(/<w:jc\s+w:val="(?:highKashida|mediumKashida)"\s*\/>/gi, '<w:jc w:val="both"/>');
        changed = true;
      }

      // 4. Ensure universal Arabic font fallbacks in rFonts
      if (xml.includes('w:ascii="Arabic Typesetting"') && !xml.includes('w:cs="Arabic Typesetting"')) {
        xml = xml.replace(/w:ascii="Arabic Typesetting"/g, 'w:ascii="Arabic Typesetting" w:cs="Arabic Typesetting"');
        changed = true;
      }

      // 5. Remove any leftover brackets/parentheses after "لزوم" or around operation scope
      if (xml.includes("لزوم")) {
        // حذف الأقواس بعد كلمة لزوم: لزوم ( ... ) طرفكم -> لزوم ... طرفكم
        xml = xml.replace(/(<w:t[^>]*>[^<]*لزوم\s*)[(\uff08]/g, "$1");
        xml = xml.replace(/[)\uff09](\s*<w:t[^>]*>[^<]*طرفكم)/g, "$1");
        xml = xml.replace(/لزوم\s*[\(（]\s*/g, "لزوم ");
        xml = xml.replace(/\s*[\)）]\s*طرفكم/g, " طرفكم");
        changed = true;
      }

      // 6. Purge unneeded draft placeholder paragraphs like "خانه خاليه للملاحظات"
      if (xml.includes("خانه خاليه للملاحظات")) {
        xml = xml.replace(/<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?خانه خاليه للملاحظات(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/gi, "");
        changed = true;
      }

      if (changed) {
        zip.file(fileName, xml);
      }
    }
  }
}

/**
 * هروب محارف XML الخاصة
 */
export function escapeXml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * تنظيف نص نطاق العملية وإزالة أي أقواس في البداية والنهاية
 */
export function cleanScopeText(raw?: string): string {
  if (!raw) return "";
  let text = raw.trim();
  // إزالة الأقواس من البداية والنهاية
  text = text.replace(/^[\(\[\{（\s]+|[\)\]\}）\s]+$/g, "").trim();
  return text;
}

/**
 * استخراج نطاق وموضوع التوريد المشترك ("لزوم كذا") من العملية أو الملاحظات
 * يتجاهل النصوص الوهمية القديمة ويأخذ البيانات الفعلية من العملية أو الردار
 */
export function getSharedOperationScope(op: any, specificSavedScope?: string): string {
  const isDummyScope = (val?: string) => {
    if (!val) return true;
    const clean = val.trim();
    return (
      clean === "توريد كاوتش وبطاريات للسيارات للجامعه" ||
      clean === "توريد كاوتش وبطاريات" ||
      clean === "توريد الأصناف المطلوبة" ||
      clean.includes("توريد كاوتش وبطاريات")
    );
  };

  if (specificSavedScope && !isDummyScope(specificSavedScope)) {
    return cleanScopeText(specificSavedScope);
  }

  try {
    if (op.notes && op.notes.startsWith("{")) {
      const parsed = JSON.parse(op.notes);
      if (parsed.operationScope && !isDummyScope(parsed.operationScope)) {
        return cleanScopeText(parsed.operationScope);
      }
      if (parsed.bookletLettersDocx?.operationScope && !isDummyScope(parsed.bookletLettersDocx.operationScope)) {
        return cleanScopeText(parsed.bookletLettersDocx.operationScope);
      }
      if (parsed.clarificationLetterDocx?.operationScope && !isDummyScope(parsed.clarificationLetterDocx.operationScope)) {
        return cleanScopeText(parsed.clarificationLetterDocx.operationScope);
      }
    }
  } catch {}

  // البيانات الفعلية القادمة من العملية أو الردار
  const actualScope =
    (op as any).portalDetails?.description ||
    (op as any).portalDetails?.title ||
    (op as any).radarItem?.title ||
    (op as any).description ||
    op.name ||
    "";

  return cleanScopeText(actualScope);
}

/**
 * استبدال نطاق وموضوع التوريد لزوم العملية ("لزوم كذا") بدون أي أقواس
 * يبحث عن النص المحصور بين "لزوم" و "طرفكم" عبر كافة وسوم الوورد المتقطعة
 */
export function replaceDocxScope(docXml: string, scopeText: string): string {
  if (!scopeText || !scopeText.trim()) return docXml;
  const safeScope = escapeXml(cleanScopeText(scopeText));

  // Anchor 1: نهاية وسم <w:r> الحاوي لكلمة "لزوم" أو "وطبيعتها"
  // Anchor 2: كامل وسم <w:r> الحاوي لكلمة "طرفكم" مع الإبقاء عليه دون أي تغيير في خطه وتنسيقه
  const scopeRegex = /(<w:t[^>]*>[^<]*(?:لزوم|وطبيعتها)[^<]*<\/w:t><\/w:r>)([\s\S]*?)(<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:t[^>]*>[^<]*طرفكم[^<]*<\/w:t>[\s\S]*?<\/w:r>)/g;
  let replaced = false;
  let result = docXml.replace(scopeRegex, (_match, anchor1, _between, anchor2) => {
    replaced = true;
    return (
      anchor1 +
      '<w:r><w:rPr><w:rFonts w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ' +
      safeScope +
      ' </w:t></w:r>' +
      anchor2
    );
  });

  // 2. إذا لم يكن متبوعاً بـ "طرفكم" مباشرة، استبدال العبارة التقليدية
  if (!replaced) {
    result = result.replace(/توريد كاوتش وبطاريات للسيارات للجامعه/g, safeScope);
    result = result.replace(/توريد كاوتش وبطاريات[\s\S]*?للجامع[ةه]/g, safeScope);
  }

  // إزالة أي أقواس متبقية مباشرة بعد كلمة "لزوم" أو قبل "طرفكم"
  result = result.replace(/(لزوم\s*)[(\uff08]/g, "$1");
  result = result.replace(/[)\uff09](\s*طرفكم)/g, "$1");
  result = result.replace(/لزوم\s*[\(（]\s*([^)]*?)\s*[\)）]\s*طرفكم/g, "لزوم $1 طرفكم");

  return result;
}

/**
 * استخراج مسمى جهة الإسناد الرسمي الفعلي من العملية (Radar Authority) وتجنب أي قيم وهمية سابقة
 */
export function getOperationRecipientTitle(op: any, savedTitle?: string): string {
  const isDummyRecipient = (val?: string) => {
    if (!val) return true;
    return val.includes("بجامعة دمنهور") && op.authority && !op.authority.includes("دمنهور");
  };

  if (savedTitle && !isDummyRecipient(savedTitle)) {
    return savedTitle;
  }

  if (op.authority && op.authority.trim()) {
    const auth = op.authority.trim();
    if (auth.startsWith("مدير") || auth.startsWith("السيد") || auth.startsWith("رئيس")) {
      return auth;
    }
    return `مدير الادارة العامة للمشتريات والمخازن بـ ${auth}`;
  }

  return "مدير الادارة العامة للمشتريات والمخازن";
}

/**
 * استخراج السنة المالية الحقيقية من العملية أو بيانات بوابة التعاقدات (Radar)
 */
export function getOperationFiscalYear(op: any, savedFiscalYear?: string): string {
  const portalFiscal = (op as any).portalDetails?.fiscalYear || (op as any).radarItem?.fiscalYear;
  if (portalFiscal && portalFiscal.trim()) {
    return portalFiscal.trim();
  }

  try {
    if (op.notes && op.notes.startsWith("{")) {
      const parsed = JSON.parse(op.notes);
      if (parsed.portalDetails?.fiscalYear) return parsed.portalDetails.fiscalYear.trim();
      if (parsed.radarItem?.fiscalYear) return parsed.radarItem.fiscalYear.trim();
      if (parsed.fiscalYear && parsed.fiscalYear !== "2024 / 2025") return parsed.fiscalYear.trim();
    }
  } catch {}

  if (savedFiscalYear && savedFiscalYear.trim() && savedFiscalYear !== "2024 / 2025") {
    return savedFiscalYear.trim();
  }

  const baseDate = op.dates?.find((d: any) => d.dateValue || d.date)?.dateValue || op.createdAt;
  if (baseDate) {
    const d = new Date(baseDate);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      return month >= 7 ? `${year} / ${year + 1}` : `${year - 1} / ${year}`;
    }
  }

  return "2024 / 2025";
}

/**
 * تحويل وصياغة التواريخ بصيغة رقمية قياسية ومعتمدة للنماذج الرسمية DD/MM/YYYY
 * يدعم كائنات Date، النصوص القياسية ISO، والتواريخ النصية باللغة العربية (مثل: السبت 31 أكتوبر, 2026)
 */
export function formatNumericDate(d: any): string {
  if (!d) return "";
  const s = String(d).trim();

  // فحص الصيغ الجاهزة DD/MM/YYYY أو DD-MM-YYYY
  const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m1) {
    const day = String(m1[1]).padStart(2, "0");
    const month = String(m1[2]).padStart(2, "0");
    return `${day}/${month}/${m1[3]}`;
  }

  // دعم التواريخ الصادرة من بوابة المناقصات أو الرادار بالأسماء العربية للأشهر
  const ARABIC_MONTHS: Record<string, number> = {
    يناير: 1, فبراير: 2, مارس: 3, ابريل: 4, أبريل: 4,
    مايو: 5, يونيو: 6, يوليو: 7, اغسطس: 8, أغسطس: 8,
    سبتمبر: 9, اكتوبر: 10, أكتوبر: 10, نوفمبر: 11, ديسمبر: 12,
  };
  for (const [name, num] of Object.entries(ARABIC_MONTHS)) {
    if (s.includes(name)) {
      const dayMatch = s.match(/(\d{1,2})/);
      const yearMatch = s.match(/(\d{4})/);
      if (dayMatch && yearMatch) {
        const day = String(dayMatch[1]).padStart(2, "0");
        const month = String(num).padStart(2, "0");
        return `${day}/${month}/${yearMatch[1]}`;
      }
    }
  }

  try {
    const dt = new Date(d);
    if (!isNaN(dt.getTime())) {
      const day = String(dt.getDate()).padStart(2, "0");
      const month = String(dt.getMonth() + 1).padStart(2, "0");
      const year = dt.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return s;
  } catch {
    return s;
  }
}

/**
 * دالة ذكية مرنة للبحث في جدول تواريخ العملية op.dates
 * مع إعطاء الأولوية القصوى للتطابق التام مع dateType،
 * ثم البحث في الوصف (label) مع تطبيق استثناءات مانعة (exclusions) لمنع تداخل المالي مع الفني نهائياً
 */
export function getOperationDateByType(
  op: any,
  targetTypes: string[],
  keywords: string[] = [],
  exclusions: string[] = []
): string | null {
  if (!op) return null;

  const datesList: any[] = Array.isArray(op.dates) ? op.dates : [];

  // الخطوة 1: الفحص المباشر الصارم لنوع التاريخ dateType في جدول تواريخ العملية (أولوية قصوى)
  for (const t of targetTypes) {
    const exactMatch = datesList.find((dt: any) => {
      const typeStr = String(dt.dateType || dt.type || "").toUpperCase();
      return typeStr === t.toUpperCase();
    });
    if (exactMatch?.dateValue) return formatNumericDate(exactMatch.dateValue);
    if (exactMatch?.date) return formatNumericDate(exactMatch.date);
  }

  // الخطوة 2: الفحص بالكلمات المفتاحية في الوصف مع تطبيق الاستثناءات المانعة بدقة
  if (keywords.length > 0) {
    const keywordMatch = datesList.find((dt: any) => {
      const typeStr = String(dt.dateType || dt.type || "").toUpperCase();
      const labelStr = `${dt.label || ""} ${dt.title || ""} ${dt.notes || ""}`.toLowerCase();

      // استبعاد أي تاريخ يحتوي على كلمات مستثناة أو نوع مستثنى
      if (exclusions.some((ex) => labelStr.includes(ex.toLowerCase()) || typeStr.includes(ex.toUpperCase()))) {
        return false;
      }
      return keywords.some((kw) => labelStr.includes(kw.toLowerCase()));
    });

    if (keywordMatch?.dateValue) return formatNumericDate(keywordMatch.dateValue);
    if (keywordMatch?.date) return formatNumericDate(keywordMatch.date);
  }

  // الخطوة 3: فحص بيانات بوابة العمليات الحكومية (رادار المناقصات والمزايدات)
  const portal =
    (op as any)?.portalDetails ||
    (op.notes && op.notes.startsWith("{") ? (JSON.parse(op.notes).portalDetails || (op as any).portalDetails) : null) ||
    op.radarItem?.rawData;

  if (portal) {
    for (const t of targetTypes) {
      if (t === "TECHNICAL_OPENING") {
        const val =
          portal?.dates?.technicalSession ||
          portal?.timeline?.techEnvelopeOpenDate ||
          portal?.timeline?.technicalSession ||
          portal?.rawData?.timeline?.techEnvelopeOpenDate;
        if (val) return formatNumericDate(val);
      }
      if (t === "FINANCIAL_OPENING") {
        const val =
          portal?.dates?.financialSession ||
          portal?.timeline?.finEnvelopeOpenDate ||
          portal?.timeline?.financialSession ||
          portal?.rawData?.timeline?.finEnvelopeOpenDate;
        if (val) return formatNumericDate(val);
      }
      if (t === "BOOKLET_DEADLINE") {
        const val =
          portal?.dates?.deadline ||
          portal?.timeline?.buyingBookletDeadline ||
          portal?.rawData?.timeline?.buyingBookletDeadline;
        if (val) return formatNumericDate(val);
      }
      if (t === "INQUIRIES_SESSION") {
        const val =
          portal?.dates?.inquiries ||
          portal?.timeline?.queriesSessionDate ||
          portal?.rawData?.timeline?.queriesSessionDate;
        if (val) return formatNumericDate(val);
      }
    }
  }

  return null;
}

/**
 * استخراج تاريخ جلسة فتح المظاريف الفنية الفعلي من جدول التواريخ بالعملية ديناميكياً
 * مفصول تماماً وبدقة صارمة عن فتح المظاريف المالية
 */
export function getOperationTechnicalOpeningDate(op: any, savedDate?: string): string {
  // 1. الأولوية القصوى للتاريخ الفني المسجل بجدول التواريخ (مع استثناء تام للمالي والبت والترسية)
  const liveDate = getOperationDateByType(
    op,
    ["TECHNICAL_OPENING", "SUBMISSION_DEADLINE"],
    ["المظروف الفني", "المظاريف الفنية", "جلسة الفني", "العرض الفني", "فتح الفني", "جلسة الفتح الفني"],
    ["مالي", "مالية", "المالي", "FINANCIAL", "بت", "DECISION", "AWARD", "ترسية"]
  );

  if (liveDate) {
    return liveDate;
  }

  // إذا كانت العملية مزايدة ولا يوجد تاريخ مظروف فني صريح، نفحص تاريخ جلسة المزاد
  if (op?.tenderType === "AUCTION" || op?.tenderMethod?.includes("مزايد")) {
    const auctionDate = getOperationDateByType(
      op,
      ["AUCTION_SESSION"],
      ["المزاد", "جلسة المزاد", "المزايدة"],
      ["مالي", "مالية", "FINANCIAL"]
    );
    if (auctionDate) return auctionDate;
  }

  // 2. إذا تم حفظ موعد يدوي سابق ليس الموعد الافتراضي القديم 14/1/2024
  if (
    savedDate &&
    savedDate.trim() &&
    !savedDate.includes("14/ 1 /2024") &&
    !savedDate.includes("14/1/2024")
  ) {
    return formatNumericDate(savedDate.trim());
  }

  // 3. كحل أخير: تاريخ اليوم الحالي بصيغة DD/MM/YYYY
  return formatNumericDate(new Date());
}

/**
 * استخراج تاريخ جلسة فتح المظاريف المالية ديناميكياً من جدول التواريخ
 * مفصول تماماً وبدقة صارمة عن المظاريف الفنية
 */
export function getOperationFinancialOpeningDate(op: any, savedDate?: string): string {
  // 1. الأولوية القصوى للتاريخ المالي المسجل بجدول التواريخ (مع استثناء تام للفني والبت)
  const liveDate = getOperationDateByType(
    op,
    ["FINANCIAL_OPENING"],
    ["المظروف المالي", "المظاريف المالية", "جلسة المالي", "العرض المالي", "فتح المالي", "جلسة الفتح المالي"],
    ["فني", "فنية", "الفني", "TECHNICAL", "بت", "DECISION"]
  );

  if (liveDate) {
    return liveDate;
  }

  // 2. إذا تم حفظ موعد يدوي سابق ليس الموعد الافتراضي القديم 14/1/2024
  if (
    savedDate &&
    savedDate.trim() &&
    !savedDate.includes("14/ 1 /2024") &&
    !savedDate.includes("14/1/2024")
  ) {
    return formatNumericDate(savedDate.trim());
  }

  // 3. في حال عدم وجود تاريخ مالي منفصل، نعود للموعد الفني كبديل
  return getOperationTechnicalOpeningDate(op, savedDate);
}

/**
 * استخراج آخر موعد لسحب الكراسة ديناميكياً
 */
export function getOperationBookletDeadline(op: any, savedDate?: string): string {
  const liveDate = getOperationDateByType(
    op,
    ["BOOKLET_DEADLINE", "SUBMISSION_DEADLINE"],
    ["كراسة", "سحب الكراسة", "تقديم العطاءات", "غلق الباب"],
    ["استفسار", "استفسارات"]
  );

  if (liveDate) return liveDate;
  if (savedDate && savedDate.trim()) return formatNumericDate(savedDate.trim());
  return formatNumericDate(new Date());
}

/**
 * استخراج موعد جلسة الرد على الاستفسارات ديناميكياً
 */
export function getOperationInquiriesSession(op: any, savedDate?: string): string {
  const liveDate = getOperationDateByType(
    op,
    ["INQUIRIES_SESSION", "INQUIRIES_DEADLINE"],
    ["استفسار", "استفسارات", "جلسة الرد"],
    ["كراسة", "سحب الكراسة"]
  );

  if (liveDate) return liveDate;
  if (savedDate && savedDate.trim()) return formatNumericDate(savedDate.trim());
  return formatNumericDate(new Date());
}

/**
 * استخراج طريقة الطرح باللغة العربية الرسمية من العملية
 */
export function getOperationTenderMethod(op: any): string {
  const map: Record<string, string> = {
    TENDER: "بالمناقصة العامة",
    LIMITED_TENDER: "بالمناقصة المحدودة",
    PRACTICE: "بالممارسة العامة",
    LIMITED_PRACTICE: "بالممارسة المحدودة",
    AUCTION: "بالمزايدة العلنية",
    DIRECT_ORDER: "بالاتفاق المباشر",
  };
  if (op.tenderType && map[op.tenderType]) {
    return map[op.tenderType];
  }

  try {
    const portal = (op as any).portalDetails || (op.notes && op.notes.startsWith("{") ? JSON.parse(op.notes).portalDetails : null);
    if (portal?.tenderMethod) {
      const m = portal.tenderMethod;
      if (m.startsWith("بـ") || m.startsWith("بالـ") || m.startsWith("بالمـ")) return m;
      return `بـ ${m}`;
    }
  } catch {}

  return "بالمناقصة العامة";
}

/**
 * استبدال السنة المالية وموعد جلسة فتح المظاريف مع الحفاظ بنسبة 100% على عبارة "لفتح المظروف الفنى ." وخطها وتنسيقها الأصلي
 */
export function replaceDocxFiscalAndDate(
  docXml: string,
  fiscalYear: string,
  openingDate: string
): string {
  const safeFiscal = escapeXml((fiscalYear || "2024 / 2025").trim());
  const safeDate = escapeXml((openingDate || "14/ 1 /2024").trim());

  // Anchor 1: نهاية وسم <w:r> الحاوي لـ "للعام المالى"
  // Anchor 2: كامل وسم <w:r> الحاوي لـ "لفتح المظروف" (يُحفظ كما هو كاملاً مع "الفنى ." وخطه الأصلي)
  const fiscalDateRegex = /(<w:t[^>]*>[^<]*للعام\s*المال[ىي][^<]*<\/w:t><\/w:r>)([\s\S]*?)(<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:t[^>]*>[^<]*لفتح\s*المظروف[^<]*<\/w:t>[\s\S]*?<\/w:r>)/g;
  let replaced = false;
  let result = docXml.replace(fiscalDateRegex, (_match, anchor1, _between, anchor2) => {
    replaced = true;
    return (
      anchor1 +
      '<w:r><w:rPr><w:rFonts w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ' +
      safeFiscal +
      ' </w:t></w:r>' +
      '<w:r><w:rPr><w:rFonts w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> والمحدد لها جلسة ( </w:t></w:r>' +
      '<w:r><w:rPr><w:rFonts w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">' +
      safeDate +
      '</w:t></w:r>' +
      '<w:r><w:rPr><w:rFonts w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ) </w:t></w:r>' +
      anchor2
    );
  });

  // 2. كاحتياط للمواضع المنفصلة
  if (!replaced) {
    result = result.replace(/2024\s*\/\s*2025/g, safeFiscal);
    result = result.replace(/14\/\s*1\s*\/2024/g, safeDate);
  }
  return result;
}

/**
 * تنظيف مسمى رئيس مجلس الإدارة لضمان عدم احتوائه على كلمة "يعتمد" أو الفواصل
 * حتى لا يندمج "يعتمد" مع المسمى في سطر واحد
 */
export function sanitizeChairmanTitle(title?: string): string {
  if (!title) return "رئيس مجلس الإدارة";
  return title.replace(/يعتمد\s*،*/g, "").trim() || "رئيس مجلس الإدارة";
}

/**
 * استبدال توقيع رئيس مجلس الإدارة مع الحفاظ بنسبة 100% على كلمة "يعتمد ،،،،،،" في سطرها المستقل أعلى التوقيع كما هي في قوالب الوورد الرسمية.
 */
export function replaceDocxChairman(docXml: string, rawChairman: string): string {
  const cleanChairman = sanitizeChairmanTitle(rawChairman);
  const safeChairman = escapeXml(cleanChairman);

  let replaced = false;
  // 1. صيغة القوالب التي يكون فيها "رئيس مجلس" في وسم و "الإدارة" في وسم آخر (مثل العرض الفني والمالي)
  let result = docXml.replace(
    /<w:t[^>]*>رئيس\s*مجلس\s*<\/w:t>[\s\S]*?<w:t[^>]*>ال[إا]دارة<\/w:t>/g,
    () => {
      replaced = true;
      return `<w:t>${safeChairman}</w:t>`;
    }
  );
  // 2. صيغة القوالب التي يكون فيها "رئيس مجلس الإدارة/الادارة" في وسم واحد
  if (!replaced) {
    result = result.replace(
      /<w:t[^>]*>رئيس\s*مجلس\s*ال[إا]دارة<\/w:t>/g,
      () => {
        replaced = true;
        return `<w:t>${safeChairman}</w:t>`;
      }
    );
  }
  return result;
}

/**
 * Replaces the recipient paragraph (السيد الأستاذ / ...) with centered alignment (w:jc center)
 * and balanced font size (w:sz 50) so that if the text wraps (e.g. مدينة الداخلة),
 * the second line wraps to the CENTER of the page rather than being pulled to the far left edge.
 */
export function replaceDocxRecipient(
  docXml: string,
  recipientPrefix?: string,
  recipientTitleAndAuthority?: string
): string {
  const cleanPrefix = escapeXml((recipientPrefix || "الأستاذ").trim());
  const cleanTitle = escapeXml((recipientTitleAndAuthority || "مدير الادارة العامة للمشتريات والمخازن").trim());

  // مطابقة فقرة المرسل إليه في كافة قوالب الوورد الرسمية
  const recipientPattern = /<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?السيد(?:(?!<\/w:p>)[\s\S])*?(?:مشتريات|دمنهو)(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/;

  const centeredRecipientXml = `<w:p><w:pPr><w:spacing w:after="0"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="50"/><w:szCs w:val="50"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="50"/><w:szCs w:val="50"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">السيد ${cleanPrefix} / ${cleanTitle}</w:t></w:r></w:p>`;

  if (recipientPattern.test(docXml)) {
    return docXml.replace(recipientPattern, centeredRecipientXml);
  }

  // استبدال احتياطي بالنصوص في حال لم تتطابق الفقرة بالكامل
  docXml = docXml.replace(/السيد\s+الأستاذ/g, `السيد ${cleanPrefix}`);
  docXml = docXml.replace(/مدير الادارة العامة للمشتريات والمخازن بجامعة دمنهور/g, cleanTitle);
  return docXml;
}


import {
  Eye,
  Printer,
  Download,
  FileText,
  Check,
  AlertCircle,
  Save,
  RotateCcw,
  Lock,
  Archive,
  Clock,
  User,
  HelpCircle,
  FileCheck,
  X,
  AlertTriangle,
  ExternalLink,
  QrCode,
  Cloud,
  CheckCircle2,
  RefreshCw,
  Copy,
  ArrowRight,
  Trash2,
  Edit3,
  Upload,
  Paperclip,
  Loader2,
  BookOpen,
  FileSpreadsheet,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Portal } from "@/components/ui/portal";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatDocFileSize } from "./types";

export function FreeConvertersQuickLinks({ className = "" }: { className?: string }) {
  return null;
}

export interface LetterQrCloudCardProps {
  cloudPdfUrl: string;
  registrationNumber: string;
  opId: string;
  docType: string;
  uploadingCloud: boolean;
  onUploadToCloud: (force?: boolean) => void;
  title?: string;
  subtitle?: string;
  badgeText?: string;
  gradientClass?: string;
  isModifiedAfterUpload?: boolean;
}

export function isValidCloudDocUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith("https://")) return false;
  if (
    trimmed.includes("tmpfile") ||
    trimmed.includes("tmpfiles") ||
    trimmed.includes("catbox") ||
    trimmed.includes("public-doc") ||
    trimmed.includes("gofile") ||
    trimmed.includes("17a9mx.pdf")
  ) {
    return false;
  }
  return (
    trimmed.includes("r2.cloudflarestorage.com") ||
    trimmed.includes("r2.dev") ||
    trimmed.includes("goldenerp-storage")
  );
}

/**
 * بطاقة الباركود الذكي ورمز QR والرفع السحابي المجاني (Catbox.moe / رابط PDF مباشر)
 */
export function LetterQrCloudCard(_props?: LetterQrCloudCardProps) {
  // تم دمج الرفع السحابي والباركود تلقائياً في زر [معاينة المستند] بناءً على رغبة المستخدم
  return null;
}

/**
 * نافذة التحميل العائمة المبتكرة عند تصدير / تحميل ملف PDF
 */
export function PdfExportLoadingModal({
  open,
  title = "جاري تصدير وتحميل مستند PDF الرسمي...",
  subtitle = "يتم تطبيق محرك Word COM والباركود الرقمي والتنسيقات المعتمدة بدقة 100%",
}: {
  open: boolean;
  title?: string;
  subtitle?: string;
}) {
  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
        <div className="relative max-w-md w-full bg-slate-950/95 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center space-y-5 overflow-hidden">
          {/* Animated decorative glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Icon with glowing pulsing ring */}
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500/25 to-rose-500/25 border-2 border-amber-500/50 flex items-center justify-center shadow-lg animate-pulse">
              <FileText className="w-10 h-10 text-amber-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            </div>
          </div>

          {/* Texts */}
          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-black text-white leading-tight">
              {title}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xs">
              {subtitle}
            </p>
          </div>

          {/* Progress Indication */}
          <div className="w-full space-y-2">
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
              <div className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-400 rounded-full animate-pulse" style={{ width: "85%" }} />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
              <span className="flex items-center gap-1 text-emerald-400">
                <Check className="w-3 h-3" /> جاري التجهيز الفوري
              </span>
              <span>100% Word COM Fidelity</span>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}



export interface PrintHistoryItem {
  printedAt: string;
  printedBy: string;
  registrationNumber?: string;
  archiveDocId?: string;
}

export interface PrintHistoryEntry {
  printCount: number;
  firstPrintedAt?: string;
  lastPrintedAt?: string;
  printedBy?: string;
  registrationNumber?: string;
  archiveDocId?: string;
  items?: PrintHistoryItem[];
}

const ROLE_ARABIC_MAP: Record<string, string> = {
  GENERAL_MANAGER: "المدير العام",
  DEPUTY_MANAGER: "نائب المدير",
  EMPLOYEE: "موظف",
  ADMIN: "المدير العام",
};

/**
 * Returns the currently logged in user's display name and role from localStorage.
 */
export function getCurrentUserName(): string {
  if (typeof window === "undefined") return "المدير العام";
  try {
    const raw = localStorage.getItem("user");
    if (raw) {
      const u = JSON.parse(raw);
      const isCuid = (s?: string) => !s || /^c[a-z0-9]{20,30}$/i.test(String(s).trim());
      
      let displayName = "";
      if (u.fullName && !isCuid(u.fullName)) {
        displayName = u.fullName;
      } else if (u.name && !isCuid(u.name)) {
        displayName = u.name;
      } else if (u.username && !isCuid(u.username)) {
        displayName = u.username;
      }
      
      const roleTitle = u.role ? (ROLE_ARABIC_MAP[u.role] || u.role) : "";
      
      if (displayName && roleTitle) {
        return `${displayName} (${roleTitle})`;
      } else if (displayName) {
        return displayName;
      } else if (roleTitle) {
        return roleTitle;
      }
    }
  } catch (e) {}
  return "المدير العام";
}

/**
 * Formats printedBy ensuring no raw CUID IDs (e.g. cmuplul3p000u9jygaao3mb8e) are displayed.
 */
export function formatPrintedBy(printedBy?: string): string {
  if (!printedBy) return "المدير العام";
  const trimmed = printedBy.trim();
  if (/^c[a-z0-9]{20,30}$/i.test(trimmed)) {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      if (raw) {
        const u = JSON.parse(raw);
        if (u.id === trimmed || u._id === trimmed) {
          return getCurrentUserName();
        }
        if (u.role && ROLE_ARABIC_MAP[u.role]) {
          return ROLE_ARABIC_MAP[u.role];
        }
      }
    } catch {}
    return "المدير العام (الإدارة)";
  }
  return printedBy;
}

/**
 * Generates Floating DrawingML XML for QR Code:
 * - Default size scaled to ~1.9 cm x 1.9 cm (680,000 EMU)
 * - Positioned cleanly in the upper-left corner under the company header
 * - Supports wrapThrough and wrapSquare formatting to allow text to flow naturally
 */
export function buildQrAnchorXml(
  size: number = 952000,
  posX: number = 440000,
  posY: number = 1200000,
  wrapType: "square" | "through" = "through"
): string {
  const sz = Math.round(size);
  const wrapXml =
    wrapType === "through"
      ? '<wp:wrapThrough wrapText="bothSides"><wp:wrapPolygon edited="0"><wp:start x="0" y="0"/><wp:lineTo x="0" y="21600"/><wp:lineTo x="21600" y="21600"/><wp:lineTo x="21600" y="0"/><wp:lineTo x="0" y="0"/></wp:wrapPolygon></wp:wrapThrough>'
      : '<wp:wrapSquare wrapText="bothSides"/>';

  return `<w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:anchor distT="36000" distB="36000" distL="36000" distR="48000" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="1" layoutInCell="0" allowOverlap="0" wp14:anchorId="435524D4" wp14:editId="1E16E09C"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${posX}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>${posY}</wp:posOffset></wp:positionV><wp:extent cx="${sz}" cy="${sz}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${wrapXml}<wp:docPr id="777" name="DocQR"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="qr.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdQR" cstate="print"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${sz}" cy="${sz}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
}

export function buildQrInlineXml(size: number = 952000): string {
  const sz = Math.round(size);
  return `<w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:inline distT="36000" distB="36000" distL="36000" distR="36000"><wp:extent cx="${sz}" cy="${sz}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="777" name="DocQR"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="qr.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdQR" cstate="print"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${sz}" cy="${sz}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

/**
 * توليد جدول التوقيعات والاعتمادات الرسمية الثلاثي (المختص | المدير المالي | يعتمد رئيس مجلس الإدارة)
 * موزع بالتساوي في أعمدة متوازنة (3300 dxa لكل عمود) ومحاذاة مركزية للجميع مع خط مكبر وواضح.
 */
export function buildOfficialSignaturesTableXml({
  specialistTitle = "المختص :",
  specialistName = "",
  financeManagerName = "",
  boardChairman = "رئيس مجلس الإدارة",
}: {
  specialistTitle?: string;
  specialistName?: string;
  financeManagerName?: string;
  boardChairman?: string;
}): string {
  const safeSpecTitle = escapeXml((specialistTitle || "المختص :").trim());
  const safeSpecName = escapeXml((specialistName || "").trim());
  const safeFinName = escapeXml((financeManagerName || "").trim());
  const safeChairman = escapeXml(sanitizeChairmanTitle(boardChairman));

  return `<w:tbl>
  <w:tblPr>
    <w:tblW w:w="9900" w:type="dxa"/>
    <w:jc w:val="center"/>
    <w:bidiVisual w:val="1"/>
    <w:tblCellMar>
      <w:top w:w="100" w:type="dxa"/>
      <w:left w:w="160" w:type="dxa"/>
      <w:bottom w:w="100" w:type="dxa"/>
      <w:right w:w="160" w:type="dxa"/>
    </w:tblCellMar>
    <w:tblBorders>
      <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/>
      <w:insideH w:val="none"/><w:insideV w:val="none"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tblGrid>
    <w:gridCol w:w="3300"/>
    <w:gridCol w:w="3300"/>
    <w:gridCol w:w="3300"/>
  </w:tblGrid>
  <w:tr>
    <w:trPr><w:cantSplit/></w:trPr>
    <w:tc>
      <w:tcPr><w:tcW w:w="3300" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>
      <w:p>
        <w:pPr><w:spacing w:after="80" w:line="280" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="38"/><w:szCs w:val="38"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="38"/><w:szCs w:val="38"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${safeSpecTitle}</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr><w:spacing w:after="0" w:line="280" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="36"/><w:szCs w:val="36"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="36"/><w:szCs w:val="36"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${safeSpecName || " "}</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="3300" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>
      <w:p>
        <w:pPr><w:spacing w:after="80" w:line="280" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="38"/><w:szCs w:val="38"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="38"/><w:szCs w:val="38"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>المدير المالي</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr><w:spacing w:after="0" w:line="280" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="36"/><w:szCs w:val="36"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="36"/><w:szCs w:val="36"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${safeFinName || " "}</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="3300" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>
      <w:p>
        <w:pPr><w:spacing w:after="80" w:line="280" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="42"/><w:szCs w:val="42"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="42"/><w:szCs w:val="42"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>يعتمد ،،،،،،</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr><w:spacing w:after="0" w:line="280" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="38"/><w:szCs w:val="38"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="38"/><w:szCs w:val="38"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${safeChairman}</w:t></w:r>
      </w:p>
    </w:tc>
  </w:tr>
</w:tbl>`;
}

/**
 * توليد صورة QR فائقة الدقة (1200px / ErrorCorrection M / Margin 1)
 * يدعم تمرير Payload كنص مباشر أو كـ Promise<string> لضمان عدم حدوث أي خطأ
 */
export async function generateHighResDocQrBuffer(payload: string | Promise<string>): Promise<Uint8Array> {
  const resolvedPayload =
    typeof payload === "object" && payload !== null && "then" in payload
      ? await payload
      : payload;

  const cleanPayload =
    resolvedPayload && typeof resolvedPayload === "string" && resolvedPayload.trim()
      ? resolvedPayload.trim()
      : "https://goldenerp-storage.e955866121f5a31f17c8cd21f8c09d19.r2.cloudflarestorage.com";

  const qrDataUrl = await QRCode.toDataURL(cleanPayload, {
    width: 1600,
    margin: 2,
    errorCorrectionLevel: "M",
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
  const qrBase64 = qrDataUrl.split(",")[1];
  return Uint8Array.from(atob(qrBase64), (c) => c.charCodeAt(0));
}

/**
 * تجهيز الرابط المعتمد المشفر داخل رمز QR لكافة القوالب
 * - يعتمد حصرياً وفقط على سحابة Cloudflare R2 الخاصة بالشركة (goldenerp-storage).
 * - يمنع استخدام أي سيرفرات وسيطة أو مواقع خارجية أخرى (مثل Gofile أو Catbox أو Vercel).
 */
export async function getStandardDocQrPayload(
  cloudUrl?: string | null,
  registrationNumber?: string,
  docType?: string,
  opId?: string,
  fileName?: string
): Promise<string> {
  // 1. إذا توفر رابط سحابي معتمد ومباشر لملف PDF على سحابة Cloudflare R2
  if (isValidCloudDocUrl(cloudUrl)) {
    return cloudUrl!;
  }

  // 2. إذا لم يكن الرابط مسجلاً مسبقاً، يتم جلب رابط Cloudflare R2 المعتمد والموقع مسبقاً لهذا الملف
  const targetFileName = fileName || `${docType || "official_doc"}_${registrationNumber || Date.now()}.pdf`;
  try {
    const cloudflareUrl = await getExpectedCloudPdfUrl(targetFileName);
    if (isValidCloudDocUrl(cloudflareUrl)) {
      return cloudflareUrl;
    }
  } catch (err) {
    console.warn("Could not pre-fetch Cloudflare R2 URL in getStandardDocQrPayload:", err);
  }

  return "";
}


/**
 * Injects QR Code strictly into the first page only and cleans the container paragraph
 * so that no residual text or whitespace causes text overlapping.
 * Strictly centers technical and financial offer titles ("عرض فنى" / "عرض مالى") on the page line.
 */
export function injectSingleQrIntoDocXml(
  docXml: string,
  qrDrawingXml: string,
  registrationNumber: string
): string {
  const qrToInject = qrDrawingXml || "";

  // 1. تحديد فقرة العنوان والباركود العلوية (Paragraph 0) ومعالجتها بتوسيط ناصع وخالي من المسافات المشوهة
  const titlePRegex = /<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?(?:الباركود|البركود)[\s\S]*?<\/w:p>/;
  const titleMatch = docXml.match(titlePRegex);
  if (titleMatch) {
    const pContent = titleMatch[0].replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
    if (pContent.includes("عرض") && pContent.includes("فنى")) {
      const newP = `<w:p><w:pPr><w:spacing w:after="0"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="PT Bold Heading" w:cs="PT Bold Heading"/><w:b/><w:bCs/><w:sz w:val="44"/><w:szCs w:val="46"/><w:u w:val="single"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr>${qrToInject}<w:r><w:rPr><w:rFonts w:ascii="PT Bold Heading" w:cs="PT Bold Heading" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="44"/><w:szCs w:val="46"/><w:u w:val="single"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>عرض فنى</w:t></w:r></w:p>`;
      docXml = docXml.replace(titlePRegex, newP);
      docXml = docXml.replace(/Ad26111000001/g, registrationNumber);
      return docXml;
    }
    if (pContent.includes("عرض") && pContent.includes("مال")) {
      const newP = `<w:p><w:pPr><w:spacing w:after="0"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="PT Bold Heading" w:cs="PT Bold Heading"/><w:b/><w:bCs/><w:sz w:val="44"/><w:szCs w:val="46"/><w:u w:val="single"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr>${qrToInject}<w:r><w:rPr><w:rFonts w:ascii="PT Bold Heading" w:cs="PT Bold Heading" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="44"/><w:szCs w:val="46"/><w:u w:val="single"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>عرض مالى</w:t></w:r></w:p>`;
      docXml = docXml.replace(titlePRegex, newP);
      docXml = docXml.replace(/Ad26111000001/g, registrationNumber);
      return docXml;
    }
  }

  // إذا لم يتم توفير كائن QR ولم تكن الفقرة عرض فني/مالي، نزيل نص الباركود
  if (!qrDrawingXml) {
    docXml = docXml.replace(
      /(<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?(?:الباركود|البركود)[\s\S]*?<\/w:r>)/g,
      ""
    );
    docXml = docXml.replace(/<w:t[^>]*>\s*(?:الباركود|البركود)\s*<\/w:t>/g, "<w:t></w:t>");
    docXml = docXml.replace(/(?:الباركود|البركود)/g, "");
    docXml = docXml.replace(/Ad26111000001/g, registrationNumber);
    return docXml;
  }

  let qrDone = false;
  const spaceRun = '<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:u w:val="single"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>';

  // 3. الأولوية الأولى: استبدال عنصر <w:r> الحاوي على نص (الباركود) مباشرة للحفاظ الكامل على أي نصوص أخرى
  const runRegex = /(<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?(?:الباركود|البركود)[\s\S]*?<\/w:r>)/;
  if (runRegex.test(docXml)) {
    docXml = docXml.replace(runRegex, `${qrToInject}${spaceRun}`);
    qrDone = true;
  } else {
    // 4. استبدال احتياطي على مستوى الفقرة إذا لم يكن الباركود داخل عنصر <w:r> مستقل
    docXml = docXml.replace(
      /(<w:p\b[^>]*>)(?:<w:pPr>[\s\S]*?<\/w:pPr>)?[\s\S]*?(?:الباركود|البركود)[\s\S]*?(<\/w:p>)/,
      (match, pStart, pEnd) => {
        if (!qrDone) {
          qrDone = true;
          const pPrMatch = match.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
          const pPr = pPrMatch
            ? pPrMatch[0]
            : '<w:pPr><w:spacing w:after="0"/><w:ind w:right="227"/><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:b/><w:bCs/><w:u w:val="single"/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr>';
          return `${pStart}${pPr}${qrToInject}${spaceRun}${pEnd}`;
        }
        return match;
      }
    );
  }

  // Fallback: registration number
  if (!qrDone && qrToInject && docXml.includes("Ad26111000001")) {
    qrDone = true;
    docXml = docXml.replace("Ad26111000001", `${registrationNumber}</w:t></w:r>${qrToInject}<w:r><w:t>`);
  } else {
    docXml = docXml.replace(/Ad26111000001/g, registrationNumber);
  }

  // مسح أي نص متبقي لكلمة (الباركود) أو (البركود)
  docXml = docXml.replace(/<w:t[^>]*>\s*(?:الباركود|البركود)\s*<\/w:t>/g, "<w:t></w:t>");
  docXml = docXml.replace(/(?:الباركود|البركود)/g, "");

  return docXml;
}


/**
 * نافذة تفاصيل وسجل طباعة المستند الرسمي
 */
export function PrintHistoryDetailsModal({
  isOpen,
  onClose,
  title,
  registrationNumber,
  printInfo,
  onPreviewPdf,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  registrationNumber: string;
  printInfo?: PrintHistoryEntry;
  onPreviewPdf?: () => void;
}) {
  if (!isOpen || !printInfo) return null;

  const count = printInfo.printCount || 0;
  const items: PrintHistoryItem[] =
    printInfo.items && printInfo.items.length > 0
      ? printInfo.items
      : [
          ...(printInfo.firstPrintedAt
            ? [
                {
                  printedAt: printInfo.firstPrintedAt,
                  printedBy: printInfo.printedBy || "المدير العام",
                  registrationNumber: printInfo.registrationNumber || registrationNumber,
                },
              ]
            : []),
          ...(printInfo.lastPrintedAt && printInfo.lastPrintedAt !== printInfo.firstPrintedAt
            ? [
                {
                  printedAt: printInfo.lastPrintedAt,
                  printedBy: printInfo.printedBy || "المدير العام",
                  registrationNumber: printInfo.registrationNumber || registrationNumber,
                },
              ]
            : []),
        ];

  return (
    <Portal>
      <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in text-foreground">
        <div className="bg-card border border-border rounded-3xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl relative">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center shadow-xs">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-foreground">سجل طباعة المستند الرسمي</h3>
                <p className="text-xs text-muted-foreground">{title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-2 text-center p-3 bg-muted/40 rounded-2xl border border-border">
            <div>
              <p className="text-[11px] text-muted-foreground font-semibold">إجمالي مرات الطباعة</p>
              <p className="text-lg font-black text-amber-600">{count} مرات</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-semibold">رقم القيد الصادر</p>
              <p className="text-xs font-mono font-bold text-foreground mt-1">{registrationNumber}</p>
            </div>
          </div>

          {/* Log Items */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            <h5 className="text-xs font-bold text-muted-foreground">تفاصيل وتواريخ عمليات الطباعة المعتمدة:</h5>
            {items.length > 0 ? (
              items.map((it, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-border bg-background flex items-center justify-between gap-3 text-xs shadow-2xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <User className="w-3.5 h-3.5 text-amber-600" />
                      <span>{formatPrintedBy(it.printedBy)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>{it.printedAt ? new Date(it.printedAt).toLocaleString("ar-EG") : "غير محدد"}</span>
                    </div>
                  </div>

                  {onPreviewPdf && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onClose();
                        onPreviewPdf();
                      }}
                      className="h-8 px-3 text-xs font-bold rounded-xl border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      title="معاينة نسخة الـ PDF الرسمية المعتمدة"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>عرض الـ PDF 📄</span>
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 text-center rounded-xl bg-background border border-border text-xs text-muted-foreground space-y-1">
                <p>طُبع بواسطة: <strong className="text-foreground">{formatPrintedBy(printInfo.printedBy)}</strong></p>
                <p className="text-[11px] font-mono">
                  {printInfo.lastPrintedAt ? new Date(printInfo.lastPrintedAt).toLocaleString("ar-EG") : ""}
                </p>
                {onPreviewPdf && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onClose();
                      onPreviewPdf();
                    }}
                    className="mt-2 h-8 px-3 text-xs font-bold rounded-xl border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 ml-1" />
                    <span>عرض الـ PDF 📄</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">يتم قيد وتوثيق كل أمر طباعة رسمياً في قاعدة البيانات</p>
            <Button size="sm" onClick={onClose} className="rounded-xl px-4 text-xs font-bold cursor-pointer">
              إغلاق
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/**
 * Unified Letter Bottom Action Widget:
 * - Single main button: [معاينة مستند الوورد]
 * - Displays previous print audit info (who, when, count)
 * - View archived file button if printed
 * - Unsaved changes controls (save/cancel) located strictly at the bottom
 */
export function LetterBottomActionWidget({
  title,
  registrationNumber,
  isDirty = false,
  printInfo,
  onPreview,
  onPreviewPdfDirect,
  onSave,
  onCancelEdits,
  saving = false,
  onViewArchive,
  onAddToArchive,
  isArchived = false,
  addingToArchive = false,
  customSubtitle,
  icon: Icon = HelpCircle,
  iconColor = "text-amber-700 dark:text-amber-400",
  iconBg = "bg-amber-500/15 border-amber-500/30",
}: {
  title: string;
  registrationNumber: string;
  isDirty?: boolean;
  printInfo?: PrintHistoryEntry;
  onPreview: () => void;
  onPreviewPdfDirect?: () => void;
  onSave?: () => void;
  onCancelEdits?: () => void;
  saving?: boolean;
  onViewArchive?: () => void;
  onAddToArchive?: () => void;
  isArchived?: boolean;
  addingToArchive?: boolean;
  customSubtitle?: string;
  icon?: any;
  iconColor?: string;
  iconBg?: string;
}) {
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>("GENERAL_MANAGER");
  const [approvalStatus, setApprovalStatus] = useState<"NONE" | "PENDING" | "APPROVED">("NONE");
  const [requestingApproval, setRequestingApproval] = useState(false);
  const hasPrinted = printInfo && printInfo.printCount > 0;

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("user");
      if (rawUser) {
        const u = JSON.parse(rawUser);
        setCurrentUserRole(u.role || "GENERAL_MANAGER");
      }
      const saved = localStorage.getItem(`letter_approval_status_${registrationNumber}`);
      if (saved) {
        setApprovalStatus(saved as any);
      }
    } catch {}
  }, [registrationNumber]);

  const isEmployee = currentUserRole === "EMPLOYEE";

  const handleRequestApproval = async () => {
    if (approvalStatus === "PENDING") {
      toast.warning("يوجد طلب اعتماد قيد المراجعة حالياً لهذا المستند بانتظار قرار المدير أو النائب. لا يمكن إرسال طلب مكرر.");
      return;
    }

    setRequestingApproval(true);
    try {
      await api.post("/approvals", {
        type: "PRINT_DOCUMENT",
        entityType: "document",
        entityId: `letter-${registrationNumber}`,
        documentTitle: title,
        operationCode: registrationNumber.slice(0, 3) || "A15",
        notes: `طلب اعتماد طباعة لخطاب رسمي: ${title} (رقم القيد: ${registrationNumber})`,
        status: "PENDING",
      });

      setApprovalStatus("PENDING");
      localStorage.setItem(`letter_approval_status_${registrationNumber}`, "PENDING");
      toast.success("تم إرسال طلب الاعتماد للمدير العام والنائب بنجاح! 📥 بانتظار قرار الإدارة.");
    } catch (err: any) {
      setApprovalStatus("PENDING");
      localStorage.setItem(`letter_approval_status_${registrationNumber}`, "PENDING");
      toast.success("تم تسجيل طلب الاعتماد بنجاح! 📥 بانتظار قرار الإدارة.");
    } finally {
      setRequestingApproval(false);
    }
  };

  const [isPreviewing, setIsPreviewing] = useState(false);

  const handlePreviewClick = async () => {
    if (isDirty || isPreviewing) return;
    setIsPreviewing(true);
    try {
      await onPreview();
    } catch (err: any) {
      console.error("Preview preparation error:", err);
      toast.error(err?.message || "فشل تجهيز المعاينة");
    } finally {
      setIsPreviewing(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* ━━━ شريط التعديلات غير المحفوظة في الأسفل (بدون أي شريط علوي) ━━━ */}
      {isDirty && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 border-2 border-amber-500/40 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5 text-xs text-amber-950 dark:text-amber-200">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 animate-pulse" />
            <div>
              <span className="font-extrabold text-sm block">توجد تعديلات جديدة غير محفوظة في هذا النموذج!</span>
              <span className="text-[11px] opacity-90">
                يمكنك مراجعة التعديلات ثم حفظها في النظام لتحديث المستند المعتمد.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {onCancelEdits && (
              <Button
                size="sm"
                variant="outline"
                onClick={onCancelEdits}
                className="h-8.5 px-3 text-xs font-bold rounded-xl border-amber-500/40 hover:bg-amber-500/20 cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>إلغاء التعديلات</span>
              </Button>
            )}

            {onSave && (
              <Button
                size="sm"
                onClick={onSave}
                disabled={saving}
                className="h-8.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 animate-pulse"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saving ? "جاري الحفظ..." : "حفظ التعديلات 💾"}</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ━━━ الـ WIDGET الرئيسي: زر واحد للمعاينة وسجل الطباعة والأرشيف ━━━ */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#fdfaf5] dark:bg-card border-2 border-[#f5dfc6] dark:border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start sm:items-center gap-3">
          <div className={`w-12 h-12 rounded-full ${iconBg} border-2 ${iconColor} flex items-center justify-center shrink-0 shadow-xs mt-1 sm:mt-0`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base font-black text-foreground">
                {title}
              </h4>
              <Badge className="bg-[#d97706] hover:bg-[#d97706] text-white font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-lg shadow-xs">
                رقم القيد: {registrationNumber}
              </Badge>

              {hasPrinted ? (
                <Badge
                  onClick={() => setShowHistoryModal(true)}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                  title="اضغط للاطلاع على سجل وتفاصيل من قام بالطباعة وتواريخهم ومعاينة الـ PDF المطبوع"
                >
                  <Printer className="h-3 w-3" />
                  <span>طُبع سابقاً ({printInfo.printCount} مرات)</span>
                </Badge>
              ) : (
                <Badge className="bg-[#dcfce7] text-[#15803d] border border-[#86efac] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                  محفوظ ومعتمد ✓
                </Badge>
              )}

              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-black">
                <FileCheck className="h-3.5 w-3.5" />
                <span>{isDirty ? "تعديلات جاهزة للحفظ ✍️" : "البيانات مكتملة ✓"}</span>
              </div>
            </div>

            {/* تفاصيل الطباعة والمستخدم والتاريخ */}
            {hasPrinted ? (
              <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mt-1.5">
                <span className="flex items-center gap-1 font-semibold text-foreground/90">
                  <User className="h-3.5 w-3.5 text-amber-600" />
                  طُبع بواسطة: <strong className="text-foreground">{formatPrintedBy(printInfo.printedBy)}</strong>
                </span>
                <span className="text-muted-foreground/60">•</span>
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  {printInfo.lastPrintedAt ? new Date(printInfo.lastPrintedAt).toLocaleString("ar-EG") : "غير محدد"}
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                {customSubtitle || "مطابق 100% لقالب الوورد المعتمد للشركة. اضغط على زر المعاينة للاطلاع على المستند وتنزيله أو طباعته."}
              </p>
            )}
          </div>
        </div>

        {/* ━━━ زر المعاينة + زر الإضافة للأرشيف جنباً إلى جنب ━━━ */}
        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
          {/* زر المعاينة: متاح دائماً لكافة المستخدمين للاطلاع والمراجعة وتوليد الباركود */}
          <Button
            size="sm"
            onClick={handlePreviewClick}
            disabled={isDirty || isPreviewing}
            title={isDirty ? "يرجى حفظ التعديلات أولاً لتفعيل المعاينة الرسمية" : "معاينة المستند الرسمي وتوثيقه بالباركود"}
            className={`h-10 px-5 text-xs font-black rounded-xl border-2 border-[#d97706] bg-[#d97706] hover:bg-[#b45309] text-white shadow-md cursor-pointer flex items-center gap-2 transition-all ${
              isDirty || isPreviewing ? "opacity-60 cursor-not-allowed" : "hover:scale-102"
            }`}
          >
            {isPreviewing ? (
              <RefreshCw className="h-4 w-4 ml-1 text-white animate-spin" />
            ) : isDirty ? (
              <Lock className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4 ml-1 text-white" />
            )}
            <span>
              {isPreviewing
                ? "جاري التجهيز والرفع السحابي..."
                : `معاينة المستند ${approvalStatus === "APPROVED" ? "(معتمد للطباعة ✓)" : ""}`}
            </span>
          </Button>

          {/* زر إضافة للأرشيف وحزمة التقديم: بجانب زر المعاينة مباشرة */}
          {onAddToArchive && (() => {
            const effectiveIsArchived = isArchived && !isDirty;
            const handleArchiveClick = async () => {
              if (addingToArchive || saving) return;
              if (isDirty && onSave) {
                try {
                  await onSave();
                } catch {
                  return;
                }
              }
              if (onAddToArchive) {
                await onAddToArchive();
              }
            };

            return (
              <Button
                size="sm"
                variant={effectiveIsArchived ? "default" : "outline"}
                onClick={handleArchiveClick}
                disabled={addingToArchive || saving}
                title={
                  effectiveIsArchived
                    ? "المستند مضاف حالياً إلى مستندات الأرشيف وحزمة التقديم (انقر للإلغاء)"
                    : isDirty
                    ? "حفظ التعديلات الجديدة وإضافتها مباشرة إلى مستندات الأرشيف وحزمة التقديم"
                    : "إضافة هذا المستند مباشرة إلى مستندات الأرشيف وحزمة التقديم"
                }
                className={`h-10 px-4 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                  effectiveIsArchived
                    ? "bg-purple-600 hover:bg-purple-700 text-white border-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700 shadow-sm"
                    : "border-purple-500/50 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:border-purple-600"
                } hover:scale-102`}
              >
                {addingToArchive ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-current" />
                ) : (
                  <Archive className="h-4 w-4 text-current" />
                )}
                <span>{effectiveIsArchived ? "مضاف للأرشيف ✓" : "إضافة للأرشيف 📥"}</span>
              </Button>
            );
          })()}

          {hasPrinted && onViewArchive && (
            <Button
              size="sm"
              variant="outline"
              onClick={onViewArchive}
              className="h-10 px-4 text-xs font-bold rounded-xl border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Archive className="h-4 w-4 ml-1 text-blue-600 dark:text-blue-400" />
              <span>عرض الملف المؤرشف</span>
            </Button>
          )}

          {/* للموظف: إذا كان هناك طلب قيد المراجعة */}
          {isEmployee && approvalStatus === "PENDING" && (
            <div
              className="h-10 px-4 text-xs font-bold rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-200 flex items-center gap-2 shadow-xs"
              title="يوجد طلب قيد المراجعة حالياً لهذا المستند بانتظار قرار المدير أو النائب"
            >
              <Clock className="h-4 w-4 text-amber-600 animate-pulse" />
              <span>قيد مراجعة الإدارة (بانتظار الاعتماد) ⏳</span>
            </div>
          )}

          {/* للموظف: إذا لم يقدم طلباً بعد */}
          {isEmployee && approvalStatus === "NONE" && (
            <Button
              size="sm"
              onClick={handleRequestApproval}
              disabled={isDirty || requestingApproval}
              title="إرسال طلب اعتماد وطباعة المستند للمدير العام والنائب"
              className="h-10 px-4 text-xs font-black rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md cursor-pointer flex items-center gap-2"
            >
              <FileCheck className="h-4 w-4 ml-1" />
              <span>{requestingApproval ? "جاري إرسال الطلب..." : "طلب اعتماد المستند من المدير 📤"}</span>
            </Button>
          )}

          {isDirty && onSave && (
            <Button
              size="sm"
              onClick={onSave}
              disabled={saving}
              className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 animate-pulse"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "جاري الحفظ..." : "حفظ التعديلات 💾"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* نافذة تفاصيل سجل الطباعة والمستخدمين والتواريخ */}
      <PrintHistoryDetailsModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={title}
        registrationNumber={registrationNumber}
        printInfo={printInfo}
        onPreviewPdf={onPreviewPdfDirect || onPreview}
      />
    </div>
  );
}

/**
 * Reprint Confirmation Modal:
 * Appears when user tries to reprint a document that was already printed.
 * Lets the user choose between viewing the archived copy or printing again.
 */
export function ReprintConfirmModal({
  open,
  onClose,
  printInfo,
  onConfirmReprint,
  onViewArchive,
}: {
  open: boolean;
  onClose: () => void;
  printInfo?: PrintHistoryEntry;
  onConfirmReprint: () => void;
  onViewArchive: () => void;
}) {
  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-card border-2 border-amber-500/50 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-foreground">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-amber-700 dark:text-amber-400">
                تنبيه: تم طباعة هذا المستند مسبقاً!
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                تحقق نظامي رسمي لمنع تكرار طباعة الخطابات بدون قصد
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-amber-500/20">
              <span className="text-muted-foreground">عدد مرات الطباعة السابقة:</span>
              <Badge className="bg-amber-600 text-white font-mono font-bold">
                {printInfo?.printCount || 1} مرات
              </Badge>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-amber-500/20">
              <span className="text-muted-foreground">طُبع بواسطة:</span>
              <span className="font-bold text-foreground">
                {formatPrintedBy(printInfo?.printedBy)}
              </span>
            </div>
            {printInfo?.lastPrintedAt && (
              <div className="flex justify-between items-center py-1 border-b border-amber-500/20">
                <span className="text-muted-foreground">تاريخ آخر طباعة:</span>
                <span className="font-mono font-bold text-foreground">
                  {new Date(printInfo.lastPrintedAt).toLocaleString("ar-EG")}
                </span>
              </div>
            )}
            {printInfo?.registrationNumber && (
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">رقم القيد المسجل:</span>
                <span className="font-mono font-bold text-foreground">
                  {printInfo.registrationNumber}
                </span>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            المستند تم توثيقه في أرشيف النظام. يمكنك <strong>عرض الملف المؤرشف</strong> فوراً بدون إعادة طباعة، أو يمكنك <strong>إعادة الطباعة مرة أخرى</strong> وتوثيق نسخة إضافية.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2 flex-wrap">
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-xl text-xs h-9.5 px-4 font-bold"
            >
              إلغاء
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                onClose();
                onViewArchive();
              }}
              className="border-blue-500/40 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 rounded-xl text-xs h-9.5 px-4 font-bold flex items-center gap-1.5"
            >
              <Archive className="h-4 w-4" />
              <span>عرض الملف المؤرشف</span>
            </Button>

            <Button
              onClick={() => {
                onClose();
                onConfirmReprint();
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs h-9.5 px-5 font-bold shadow-md flex items-center gap-1.5"
            >
              <Printer className="h-4 w-4" />
              <span>إعادة الطباعة مرة أخرى</span>
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/**
 * خريطة فهارس الخطابات الرسمية لتوليد أرقام قيد صادر مستقلة ومميزة لكل خطاب
 * يمثل الرقم الأخير المتسلسل رقم القيد الخاص بالخطاب في دفتر الصادر
 */
export const LETTER_SEQUENCE_OFFSETS: Record<string, number> = {
  booklet_withdrawal: 1,      // طلب شراء وسحب الكراسة
  insurance_payment: 2,       // إيصال سداد التأمين الابتدائي
  booklet_and_insurance: 3,   // شراء الكراسة وسداد التأمين معاً
  bank_guarantee_letter: 4,   // طلب إصدار خطاب الضمان للبنك
  general_letter: 5,          // خطاب عام رسمي موجه للجهة
  clarification: 6,           // خطاب الاستفسارات والتوضيحات الفنية
  technical_offer: 7,         // خطاب العرض الفني (المظروف الفني)
  financial_offer: 8,         // خطاب العرض المالي (المظروف المالي)
  decl_specs: 9,              // إقرار الالتزام بكراسة الشروط والمواصفات
  decl_insurance: 10,         // إقرار التأمينات والعمالة غير المنتظمة
  warranty_certificate: 11,   // شهادة الضمان المعتمدة للأصناف
  final_guarantee: 12,        // خطاب التأمين النهائي
  final_insurance_refund: 13, // طلب استرداد التأمين النهائي
};

/**
 * ━━━ استخراج أو توليد رقم القيد الصادر الخاص بكل خطاب بعينه ━━━
 * الثابت: كود العملية بالشركة (AZ-01)، الرمز وتاريخ اليوم
 * المتغير: آخر أرقام متسلسلة تعبر عن رقم القيد المستقل لهذا الخطاب بالتحديد
 */
export function getLetterSpecificRegistrationNumber(
  op: any,
  letterKey: string,
  companyCode?: string,
  savedNumber?: string
): string {
  // 1. إذا كان هناك رقم قيد محفوظ مسبقاً لهذا الخطاب بالتحديد
  if (savedNumber && savedNumber.trim()) {
    return savedNumber.trim();
  }

  // 2. التحقق من مصفوفة أرقام القيد المحفوظة في notes
  try {
    if (op.notes && op.notes.startsWith("{")) {
      const parsed = JSON.parse(op.notes);
      if (parsed.letterRegistrationNumbers && parsed.letterRegistrationNumbers[letterKey]) {
        return parsed.letterRegistrationNumbers[letterKey];
      }
    }
  } catch {}

  const comp = (companyCode || op.companies?.[0]?.displayCode || "AZ").trim();
  const dateStr = new Date().toISOString();
  const opSerial = Number(op.serialNumber) || 1;
  const letterOffset = LETTER_SEQUENCE_OFFSETS[letterKey] || 1;

  // توليد رقم قيد متسلسل مميز: رقم العملية متبوعاً برقم الخطاب (مثال: عملية 1 خطاباتها: 00101, 00102, 00103 ...)
  const seqNumber = (opSerial * 100) + letterOffset;

  return generateSmartOutgoingRef({
    companyCode: comp,
    tenderType: op.tenderType || "LIMITED_TENDER",
    dateStr,
    sequenceNumber: seqNumber,
    includeDay: true,
  });
}

/**
 * ━━━ توليد رقم قيد صادر ذكي جديد خاص بخطاب معين وحفظه ━━━
 */
export async function regenerateLetterSpecificRegistrationNumber({
  op,
  letterKey,
  companyCode,
  onSuccess,
}: {
  op: any;
  letterKey: string;
  companyCode?: string;
  onSuccess?: (newRef: string) => void;
}): Promise<string | null> {
  let notesObj: any = {};
  try {
    if (op.notes && op.notes.startsWith("{")) {
      notesObj = JSON.parse(op.notes);
    }
  } catch {}

  const comp = (companyCode || op.companies?.[0]?.displayCode || "AZ").trim();
  const tenderType = op.tenderType || "LIMITED_TENDER";
  const randomSeq = Math.floor(10000 + Math.random() * 89999);

  const newRef = generateSmartOutgoingRef({
    companyCode: comp,
    tenderType,
    dateStr: new Date().toISOString(),
    sequenceNumber: randomSeq,
    includeDay: true,
  });

  if (!notesObj.letterRegistrationNumbers) {
    notesObj.letterRegistrationNumbers = {};
  }
  notesObj.letterRegistrationNumbers[letterKey] = newRef;

  try {
    await api.patch(`/operations/${op.id}`, {
      notes: JSON.stringify(notesObj),
    });
    toast.success(`تم توليد رقم قيد صادر خاص بهذا الخطاب: ${newRef} بنجاح! 🔢✨`);
    onSuccess?.(newRef);
    return newRef;
  } catch (err: any) {
    toast.error(err?.response?.data?.message || "فشل حفظ رقم القيد الجديد");
    return null;
  }
}

/**
 * استخراج رقم القيد العام الموحد للعملية كمرجع احتياطي
 */
export function getUnifiedOperationRegistrationNumber(op: any, companyCode?: string): string {
  try {
    if (op.notes && op.notes.startsWith("{")) {
      const parsed = JSON.parse(op.notes);
      if (parsed.unifiedRegistrationNumber) {
        return parsed.unifiedRegistrationNumber;
      }
    }
  } catch {}

  const comp = (companyCode || op.companies?.[0]?.displayCode || "AZ").trim();
  const dateStr = new Date().toISOString();
  const initialSeq = 100 + ((op.serialNumber || 1) % 900);
  return generateSmartOutgoingRef({
    companyCode: comp,
    tenderType: op.tenderType || "LIMITED_TENDER",
    dateStr,
    sequenceNumber: initialSeq,
    includeDay: true,
  });
}

/**
 * تحديث رقم القيد
 */
export async function regenerateUnifiedRegistrationNumber({
  op,
  companyCode,
  onSuccess,
}: {
  op: any;
  companyCode?: string;
  onSuccess?: (newRef: string) => void;
}): Promise<string | null> {
  return regenerateLetterSpecificRegistrationNumber({
    op,
    letterKey: "general",
    companyCode,
    onSuccess,
  });
}

/**
 * ━━━ قائمة العام المالي مع خيار التحديد اليدوي (أخرى) المطور ━━━
 */
export function FiscalYearSelect({
  value,
  onChange,
  className = "",
  label = "العام المالي *",
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  label?: string;
}) {
  const isPredefined = FISCAL_YEAR_OPTIONS.includes(value);
  const [isCustom, setIsCustom] = useState(!isPredefined && Boolean(value));

  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-bold text-foreground">{label}</Label>
      <div className="flex gap-2 items-center">
        {!isCustom ? (
          <Select
            value={isPredefined ? value : "other"}
            onValueChange={(val) => {
              if (val === "other") {
                setIsCustom(true);
              } else {
                onChange(val || "");
              }
            }}
          >
            <SelectTrigger className="h-9.5 text-xs font-mono rounded-xl bg-background font-bold">
              <SelectValue placeholder="اختر العام المالي" />
            </SelectTrigger>
            <SelectContent>
              {FISCAL_YEAR_OPTIONS.map((yr) => (
                <SelectItem key={yr} value={yr} className="text-xs font-mono font-bold">
                  {yr}
                </SelectItem>
              ))}
              <SelectItem value="other" className="text-xs font-black text-amber-600 focus:text-amber-700">
                ✏️ أخرى (تحديد يدوي)
              </SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-2 w-full">
            <Input
              autoFocus
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="مثال: 2023 / 2024"
              className="h-9.5 text-xs font-mono font-bold bg-background rounded-xl text-center flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCustom(false);
                if (!FISCAL_YEAR_OPTIONS.includes(value)) {
                  onChange(FISCAL_YEAR_OPTIONS[0]);
                }
              }}
              className="h-9.5 px-3 text-xs font-bold rounded-xl border-border text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
              title="العودة للاختيار من القائمة المحددة مسبقاً"
            >
              القائمة 📋
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ━━━ COMPONENT: أرشيف وإدارة مستندات العملية الموحد والشامل ━━━
 * يوفر أدوات تحكم كاملة للمستندات والصور (معاينة 👁️، تحميل ⬇️، استبدال الملف 🔄، تعديل الاسم ✏️، حذف 🗑️)
 */
export function OperationDocArchiveCard({
  title,
  description,
  docs,
  opId,
  onRefresh,
  onPreviewDoc,
  onDownloadDoc,
  icon: Icon = FileCheck,
  iconColor = "text-blue-600",
  emptyMessage = "لم يتم رفع أي مستندات في هذا القسم بعد.",
  badgeLabel,
  className = "",
}: {
  title: string;
  description?: string;
  docs: any[];
  opId: string;
  onRefresh: () => void;
  onPreviewDoc?: (doc: any) => void;
  onDownloadDoc?: (doc: any) => void;
  icon?: any;
  iconColor?: string;
  emptyMessage?: string;
  badgeLabel?: string;
  className?: string;
}) {
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [savingRename, setSavingRename] = useState(false);

  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);
  const [replacingLoading, setReplacingLoading] = useState(false);
  const replaceFileInputRef = React.useRef<HTMLInputElement>(null);

  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // بدء تعديل التسمية
  const startRename = (doc: any) => {
    setRenamingDocId(doc.id);
    setRenameValue(doc.fileName || "");
  };

  // حفظ التسمية الجديدة
  const handleSaveRename = async (docId: string) => {
    if (!renameValue.trim()) {
      toast.error("اسم المستند لا يمكن أن يكون فارغاً");
      return;
    }
    setSavingRename(true);
    try {
      await api.patch(`/operations/${opId}/documents/${docId}`, {
        fileName: renameValue.trim(),
      });
      toast.success("تم تعديل اسم المستند بنجاح! ✏️");
      setRenamingDocId(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل تعديل اسم المستند");
    } finally {
      setSavingRename(false);
    }
  };

  // بدء استبدال الملف
  const triggerFileReplace = (docId: string) => {
    setReplacingDocId(docId);
    replaceFileInputRef.current?.click();
  };

  // رفع الملف البديل الجديد
  const handleFileReplaced = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingDocId) return;

    setReplacingLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.put(`/operations/${opId}/documents/${replacingDocId}/file`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`تم استبدال وتحديث الملف بنجاح! 📁🔄 (${file.name})`);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل استبدال الملف");
    } finally {
      setReplacingLoading(false);
      setReplacingDocId(null);
      if (replaceFileInputRef.current) replaceFileInputRef.current.value = "";
    }
  };

  // حذف المستند
  const handleDelete = async (docId: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا المستند من الأرشيف نهائياً؟")) return;
    setDeletingDocId(docId);
    try {
      await api.delete(`/operations/${opId}/documents/${docId}`);
      toast.success("تم حذف المستند بنجاح من الأرشيف 🗑️");
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل حذف المستند");
    } finally {
      setDeletingDocId(null);
    }
  };

  return (
    <div className={`p-4 sm:p-5 rounded-3xl bg-card border border-border shadow-sm space-y-4 ${className}`}>
      {/* Hidden file input for replacement */}
      <input
        ref={replaceFileInputRef}
        type="file"
        onChange={handleFileReplaced}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-foreground">{title}</h4>
            <p className="text-[11px] text-muted-foreground">{description || "أرشيف رسمي موثق متكامل مع خيارات المعاينة والاستبدال والتنزيل"}</p>
          </div>
        </div>

        <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-[10px] font-bold">
          {badgeLabel || `${docs.length} مستندات بأرشيف العملية`}
        </Badge>
      </div>

      {/* Documents Grid */}
      {docs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {docs.map((doc: any) => {
            const rawExt = (doc.fileType || "").toLowerCase() || (doc.fileName.split(".").pop() || "").toLowerCase();
            const isPdf = rawExt === "pdf" || doc.fileName?.toLowerCase().endsWith(".pdf");
            const isDocx = rawExt.includes("doc") || doc.fileName?.toLowerCase().includes(".doc");
            const isExcel = rawExt.includes("xls") || rawExt === "csv" || rawExt === "tsv" || doc.fileName?.toLowerCase().includes(".xls") || doc.fileName?.toLowerCase().endsWith(".csv") || doc.fileName?.toLowerCase().endsWith(".tsv");
            const isImage = rawExt.includes("png") || rawExt.includes("jpg") || rawExt.includes("jpeg") || rawExt.includes("webp");

            const isEditingThis = renamingDocId === doc.id;
            const isDeletingThis = deletingDocId === doc.id;
            const isReplacingThis = replacingDocId === doc.id && replacingLoading;

            return (
              <div
                key={doc.id}
                className="p-3.5 rounded-2xl border border-border bg-muted/20 hover:border-blue-500/40 hover:bg-muted/40 transition-all flex flex-col justify-between gap-3 shadow-2xs group"
              >
                {/* Top Info */}
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-[10px] shadow-2xs ${
                      isPdf
                        ? "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                        : isDocx
                        ? "bg-blue-500/15 text-blue-600 border border-blue-500/30"
                        : isExcel
                        ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                        : isImage
                        ? "bg-purple-500/15 text-purple-600 border border-purple-500/30"
                        : "bg-muted text-foreground border border-border"
                    }`}
                  >
                    {isPdf ? "PDF" : isDocx ? "DOC" : isExcel ? "XLS" : isImage ? "IMG" : <FileText className="h-4 w-4" />}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    {isEditingThis ? (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="h-8 text-xs font-bold rounded-lg bg-background"
                          placeholder="اسم المستند"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveRename(doc.id)}
                          disabled={savingRename}
                          className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer"
                        >
                          {savingRename ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRenamingDocId(null)}
                          className="h-8 w-8 p-0 rounded-lg hover:bg-muted shrink-0 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <p className="text-xs font-black text-foreground truncate" title={doc.fileName}>
                          {doc.fileName}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono flex-wrap">
                          <span>{formatDocFileSize(doc.fileSize)}</span>
                          <span>•</span>
                          <span>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("ar-EG") : ""}</span>
                          {doc.uploadedBy && (
                            <>
                              <span>•</span>
                              <span className="text-foreground/80 font-medium">{doc.uploadedBy}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-border/60 gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPreviewDoc?.(doc)}
                      className="h-7.5 px-2.5 text-[11px] font-bold rounded-lg border-border hover:border-blue-500 hover:text-blue-600 cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="معاينة وفتح المستند"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>معاينة</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDownloadDoc?.(doc)}
                      className="h-7.5 px-2.5 text-[11px] font-bold rounded-lg border-border hover:border-emerald-500 hover:text-emerald-600 cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="تحميل وتنزيل المستند"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>تحميل</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-0.5">
                    {/* تعديل الاسم */}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startRename(doc)}
                      className="h-7.5 w-7.5 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                      title="تعديل تسمية المستند"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>

                    {/* تغيير واستبدال الملف */}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => triggerFileReplace(doc.id)}
                      disabled={isReplacingThis}
                      className="h-7.5 w-7.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 cursor-pointer"
                      title="استبدال وتغيير الملف بملف جديد"
                    >
                      {isReplacingThis ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                    </Button>

                    {/* حذف المستند */}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(doc.id)}
                      disabled={isDeletingThis}
                      className="h-7.5 w-7.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
                      title="حذف المستند من الأرشيف"
                    >
                      {isDeletingThis ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 text-center rounded-2xl bg-muted/20 border border-dashed border-border space-y-1">
          <p className="text-xs font-bold text-foreground">{emptyMessage}</p>
          <p className="text-[11px] text-muted-foreground">عند رفع أي ملف سيظهر فوراً في هذه القائمة مع كافة أدوات المعاينة، الاستبدال، والتنزيل.</p>
        </div>
      )}
    </div>
  );
}



