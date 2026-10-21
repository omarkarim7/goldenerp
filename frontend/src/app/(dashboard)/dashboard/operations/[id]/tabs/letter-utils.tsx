"use client";

import React, { useState } from "react";
import { formatDate } from "./types";

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
 * Barcode Visual Component (SVG-based Code-128 / Code-39 style)
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
  // Generate deterministic bar widths based on input string
  const bars: { width: number; isBlack: boolean }[] = [];
  const cleanVal = (value || "AZ261100001").toUpperCase();

  // Start guard
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 1, isBlack: false });
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 1, isBlack: false });

  for (let i = 0; i < cleanVal.length; i++) {
    const charCode = cleanVal.charCodeAt(i);
    const pattern = (charCode * 7 + i * 3) % 16;
    for (let b = 0; b < 4; b++) {
      const isBlack = (pattern & (1 << b)) !== 0;
      const width = ((charCode + b) % 3) + 1;
      bars.push({ width, isBlack });
    }
    bars.push({ width: 1, isBlack: false });
  }

  // End guard
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 1, isBlack: false });
  bars.push({ width: 2, isBlack: true });

  let currentX = 2;
  const height = 34;

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        height={height}
        className="overflow-visible"
        style={{ minWidth: "120px", maxWidth: "180px" }}
        viewBox="0 0 160 34"
        preserveAspectRatio="none"
      >
        <rect x="0" y="0" width="160" height={height} fill="white" />
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
              fill="#0f172a"
            />
          );
        })}
      </svg>
      {showText && (
        <span className="font-mono text-[9px] tracking-widest text-slate-700 dark:text-slate-300 font-bold mt-0.5">
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
        xml = xml.replace(/<w:highlight\s+[^>]*\/>/gi, "");
        xml = xml.replace(/<w:color\s+w:val="(?:red|FF0000)"[^>]*\/>/gi, "");
        changed = true;
      }

      // 2. Remove all picture watermarks and unwanted VML shapes
      if (xml.includes("WordPictureWatermark") || xml.includes("WordWatermark")) {
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
      '<w:r><w:rPr><w:rFonts w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:highlight w:val="red"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ' +
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
 * استخراج تاريخ جلسة فتح المظاريف الفنية الفعلي من العملية (Radar Technical Opening Date)
 */
export function getOperationTechnicalOpeningDate(op: any, savedDate?: string): string {
  if (Array.isArray(op.dates) && op.dates.length > 0) {
    const d = op.dates.find(
      (dt: any) =>
        dt.type === "TECHNICAL_OPENING" ||
        dt.title?.includes("فني") ||
        dt.title?.includes("المظروف الفني") ||
        dt.title?.includes("جلسة")
    );
    if (d?.dateValue) return formatDate(d.dateValue);
    if (d?.date) return formatDate(d.date);

    const deadline = op.dates.find((dt: any) => dt.type === "SUBMISSION_DEADLINE" || dt.title?.includes("تقديم"));
    if (deadline?.dateValue) return formatDate(deadline.dateValue);
    if (deadline?.date) return formatDate(deadline.date);
  }

  const portal = (op as any).portalDetails;
  if (portal?.dates?.technicalSession) {
    return formatDate(portal.dates.technicalSession);
  }
  if (portal?.dates?.deadline) {
    return formatDate(portal.dates.deadline);
  }

  if (savedDate && savedDate.trim() && !savedDate.includes("14/ 1 /2024") && !savedDate.includes("14/1/2024")) {
    return savedDate.trim();
  }

  return new Date().toLocaleDateString("en-GB");
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
      '<w:r><w:rPr><w:rFonts w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:highlight w:val="red"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ' +
      safeFiscal +
      ' </w:t></w:r>' +
      '<w:r><w:rPr><w:rFonts w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> والمحدد لها جلسة ( </w:t></w:r>' +
      '<w:r><w:rPr><w:rFonts w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:highlight w:val="red"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">' +
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

/**
 * بطاقة الباركود الذكي ورمز QR والرفع السحابي المجاني (Catbox.moe / رابط PDF مباشر)
 * موضوعة دائماً بأسفل الصفحة بجوار شريط الإجراءات والانتقال لعدم إعاقة ملء الخانات
 */
export function LetterQrCloudCard({
  cloudPdfUrl,
  registrationNumber,
  opId,
  docType,
  uploadingCloud,
  onUploadToCloud,
  title = "الباركود الذكي ورمز QR الرقمي المعتمد (PDF)",
  subtitle = "عند مسح الباركود بكاميرا الموبايل يتم فتح النسخة الرقمية المعتمدة فوراً بصيغة PDF مباشرة بدون الحاجة لأي تسجيل دخول.",
  badgeText = "مدمج بموضع كلمة (الباركود) بالأعلى ورقم القيد بالتذييل",
  gradientClass = "from-amber-500/10 via-orange-500/10 to-transparent border-amber-500/25",
  isModifiedAfterUpload = false,
}: LetterQrCloudCardProps) {
  const isInvalidCloud = Boolean(
    cloudPdfUrl && (
      cloudPdfUrl.includes("tmpfiles") ||
      cloudPdfUrl.includes("tmpfile") ||
      cloudPdfUrl.includes("catbox") ||
      cloudPdfUrl.includes("17a9mx.pdf")
    )
  );
  const effectiveCloudUrl = isInvalidCloud ? "" : (cloudPdfUrl || "");

  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-r ${gradientClass} border space-y-3 my-4 shadow-sm transition-all`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <QrCode className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-foreground">
                {title}
              </span>
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] font-bold">
                {badgeText}
              </Badge>
              {effectiveCloudUrl && (
                <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-bold flex items-center gap-1">
                  <Cloud className="h-3 w-3" />
                  <span>رابط PDF مباشر دائم يفتح فوراً بالكاميرا ✓</span>
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center flex-wrap justify-end">
          {effectiveCloudUrl ? (
            <>
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                <span>تم الرفع والتوثيق السحابي مسبقاً ✓</span>
              </Badge>
              <a
                href={effectiveCloudUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline px-3 py-1.5 rounded-xl bg-card border border-border"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>فتح ملف PDF المباشر</span>
              </a>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(effectiveCloudUrl);
                  toast.success("تم نسخ الرابط السحابي المباشر بنجاح! 📋");
                }}
                className="border-border text-foreground hover:bg-muted text-xs font-bold h-9 px-3 rounded-xl cursor-pointer flex items-center gap-1"
                title="نسخ الرابط"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>نسخ الرابط</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onUploadToCloud(true)}
                disabled={uploadingCloud}
                className={`border-border text-foreground hover:bg-muted text-xs font-bold h-9 px-3 rounded-xl cursor-pointer flex items-center gap-1 ${
                  isModifiedAfterUpload ? "border-amber-500 text-amber-600 bg-amber-500/10 animate-pulse" : ""
                }`}
                title="تحديث وإعادة رفع النسخة السحابية المباشرة"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${uploadingCloud ? "animate-spin" : ""}`} />
                <span>إعادة الرفع والتحديث ↻</span>
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => onUploadToCloud(false)}
              disabled={uploadingCloud}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Cloud className={`h-4 w-4 ${uploadingCloud ? "animate-spin" : ""}`} />
              <span>{uploadingCloud ? "جاري الرفع السحابي المباشر..." : "رفع وتوثيق النسخة الرقمية سحابياً لرمز QR ☁️"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* تنبيه ذكي عند تعديل البيانات بعد الرفع السحابي */}
      {effectiveCloudUrl && isModifiedAfterUpload && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs font-bold animate-pulse">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>⚠️ تنبيه: تم إجراء تعديلات على بيانات الخطاب، يُفضل الضغط على &quot;إعادة الرفع والتحديث ↻&quot; لتحديث النسخة السحابية المربوطة بالباركود.</span>
        </div>
      )}
    </div>
  );
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
 * - Matching EXACT coordinates and properties from user's ground-truth file
 *   (خطاب_توضيح_617_AZ26101800172 (1).docx):
 *   - Under the horizontal header separator line (Y: 899160 EMU ~ 2.497cm from top)
 *   - Left-aligned within border frame (X: 426720 EMU ~ 1.185cm from left)
 *   - Size: 519430 x 519430 EMU (~1.44cm)
 *   - behindDoc="1" & locked="1" & layoutInCell="0" & wrapNone & allowOverlap="1"
 */
export function buildQrAnchorXml(): string {
  return `<w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="1" locked="1" layoutInCell="0" allowOverlap="1" wp14:anchorId="435524D4" wp14:editId="1E16E09C"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>426720</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>899160</wp:posOffset></wp:positionV><wp:extent cx="519430" cy="519430"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="777" name="DocQR"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="qr.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdQR"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="519430" cy="519430"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
}

export function buildQrInlineXml(): string {
  return `<w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="650000" cy="650000"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="777" name="DocQR"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="qr.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdQR"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="650000" cy="650000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}


/**
 * Injects QR Code strictly into the first page only and cleans the container paragraph
 * so that no residual text or whitespace causes text overlapping.
 */
export function injectSingleQrIntoDocXml(
  docXml: string,
  qrDrawingXml: string,
  registrationNumber: string
): string {
  let qrDone = false;

  // 1. Replace the entire contents of the paragraph containing the QR placeholder (الباركود أو البركود)
  // with the QR drawing + single space, matching the ground-truth document structure 100%.
  const spaceRun = '<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:u w:val="single"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>';

  const qrToInject = qrDrawingXml || buildQrInlineXml();

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

  // Fallback: registration number
  if (!qrDone && qrToInject && docXml.includes("Ad26111000001")) {
    qrDone = true;
    docXml = docXml.replace("Ad26111000001", `${registrationNumber}</w:t></w:r>${qrToInject}<w:r><w:t>`);
  } else {
    docXml = docXml.replace(/Ad26111000001/g, registrationNumber);
  }

  // 2. ضمان مسح أي نص متبقي لكلمة (الباركود) أو (البركود) في أي فقرة لعدم ظهوره كنص مطبوع إطلاقاً
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
  customSubtitle?: string;
  icon?: any;
  iconColor?: string;
  iconBg?: string;
}) {
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const hasPrinted = printInfo && printInfo.printCount > 0;

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

        {/* ━━━ زر واحد فقط للمعاينة + زر الأرشيف إن وجد ━━━ */}
        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
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

          <Button
            size="sm"
            onClick={onPreview}
            disabled={isDirty}
            title={isDirty ? "يرجى حفظ التعديلات أولاً لتفعيل المعاينة الرسمية" : "معاينة مستند الوورد"}
            className={`h-10 px-5 text-xs font-black rounded-xl border-2 border-[#d97706] bg-[#d97706] hover:bg-[#b45309] text-white shadow-md cursor-pointer flex items-center gap-2 transition-all ${
              isDirty ? "opacity-50 cursor-not-allowed" : "hover:scale-102"
            }`}
          >
            {isDirty ? <Lock className="h-4 w-4" /> : <Eye className="h-4 w-4 ml-1 text-white" />}
            <span>معاينة مستند الوورد</span>
          </Button>

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
 * ━━━ استخراج أو توليد رقم القيد الصادر الموحد للعملية بالكامل ━━━
 * يضمن تطابق رقم القيد في كافة الخطابات والمراحل (كراسة، توضيح، إقرارات، عروض فنية ومالية)
 */
export function getUnifiedOperationRegistrationNumber(op: any, companyCode?: string): string {
  try {
    if (op.notes && op.notes.startsWith("{")) {
      const parsed = JSON.parse(op.notes);
      if (parsed.unifiedRegistrationNumber) {
        return parsed.unifiedRegistrationNumber;
      }
      if (parsed.bookletLettersDocx?.registrationNumber) {
        return parsed.bookletLettersDocx.registrationNumber;
      }
      if (parsed.clarificationLetter?.registrationNumber) {
        return parsed.clarificationLetter.registrationNumber;
      }
      if (parsed.declarationsDocx?.registrationNumber) {
        return parsed.declarationsDocx.registrationNumber;
      }
      if (parsed.technicalOfferLetter?.registrationNumber) {
        return parsed.technicalOfferLetter.registrationNumber;
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
 * ━━━ توليد رقم قيد صادر ذكي جديد وعشوائي بالكامل وتحديثه في قاعدة البيانات لكافة المراحل ━━━
 * الثوابت: الرموز وتاريخ اليوم
 * المتغير: الرقم العشوائي (5 أرقام)
 * القيود: مرتان كحد أقصى للعملية الواحدة منعاً لتضارب المرجعيات الصادرة
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
  let notesObj: any = {};
  try {
    if (op.notes && op.notes.startsWith("{")) {
      notesObj = JSON.parse(op.notes);
    }
  } catch {}

  const currentCount = Number(notesObj.regUpdateCount || 0);
  if (currentCount >= 2) {
    toast.error("تم الوصول للحد الأقصى لتحديث رقم القيد (مرتان كحد أقصى للعملية الواحدة للحفاظ على المرجعية الرسمية المعتمدة)");
    return null;
  }

  // الجزء الثابت: الرمز وتاريخ اليوم
  const comp = (companyCode || op.companies?.[0]?.displayCode || "AZ").trim();
  const tenderType = op.tenderType || "LIMITED_TENDER";

  // توليد رقم عشوائي ديناميكي للسلسلة (5 أرقام عشوائية)
  const randomSeq = Math.floor(10000 + Math.random() * 89999);

  const newRef = generateSmartOutgoingRef({
    companyCode: comp,
    tenderType,
    dateStr: new Date().toISOString(),
    sequenceNumber: randomSeq,
    includeDay: true,
  });

  // تحديث قاعدة البيانات مركزياً وتحديث كافة السجلات الفرعية
  notesObj.unifiedRegistrationNumber = newRef;
  notesObj.regUpdateCount = currentCount + 1;

  if (notesObj.bookletLettersDocx) notesObj.bookletLettersDocx.registrationNumber = newRef;
  if (notesObj.clarificationLetter) notesObj.clarificationLetter.registrationNumber = newRef;
  if (notesObj.declarationsDocx) notesObj.declarationsDocx.registrationNumber = newRef;
  if (notesObj.technicalOfferLetter) notesObj.technicalOfferLetter.registrationNumber = newRef;
  if (notesObj.financialOfferDocx) notesObj.financialOfferDocx.registrationNumber = newRef;
  if (notesObj.finalGuaranteeLetter) notesObj.finalGuaranteeLetter.registrationNumber = newRef;

  try {
    await api.patch(`/operations/${op.id}`, {
      notes: JSON.stringify(notesObj),
    });
    const remaining = 2 - (currentCount + 1);
    toast.success(`تم تحديث وتعميم رقم القيد الجديد: ${newRef} لكافة خطابات ومراحل العملية بنجاح! 🔢✨ (متبقي ${remaining} تحديث)`);
    onSuccess?.(newRef);
    return newRef;
  } catch (err: any) {
    toast.error(err?.response?.data?.message || "فشل حفظ رقم القيد الجديد بقاعدة البيانات");
    return null;
  }
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
        accept=".pdf,.docx,.doc,.xlsx,.xls,image/*"
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
            const isExcel = rawExt.includes("xls") || doc.fileName?.toLowerCase().includes(".xls");
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



