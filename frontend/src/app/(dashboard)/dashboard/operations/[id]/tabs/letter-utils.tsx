"use client";

import React from "react";

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

      if (changed) {
        zip.file(fileName, xml);
      }
    }
  }
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Portal } from "@/components/ui/portal";
import { toast } from "sonner";

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
}

/**
 * بطاقة الباركود الذكي ورمز QR والرفع السحابي المجاني (Catbox.moe / Gofile.io)
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
  subtitle = "عند مسح الباركود بكاميرا الموبايل يتم فتح النسخة الرقمية المعتمدة فوراً بدون الحاجة لأي تسجيل دخول.",
  badgeText = "مدمج بموضع كلمة (الباركود) بالأعلى ورقم القيد بالتذييل",
  gradientClass = "from-amber-500/10 via-orange-500/10 to-transparent border-amber-500/25",
}: LetterQrCloudCardProps) {
  // تصفية وحجب أي روابط سابقة لموقع tmpfiles لأن المستخدم طلب الاعتماد حصرياً على Catbox و Gofile
  const isTmpFiles = cloudPdfUrl && cloudPdfUrl.includes("tmpfiles.org");
  const effectiveCloudUrl = isTmpFiles ? "" : cloudPdfUrl;

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
                  <span>رابط سحابي دائم متاح لأي هاتف ✓ (Catbox/Gofile)</span>
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
                <span>فتح ملف PDF السحابي</span>
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
                className="border-border text-foreground hover:bg-muted text-xs font-bold h-9 px-3 rounded-xl cursor-pointer flex items-center gap-1"
                title="تحديث وإعادة رفع النسخة السحابية على Catbox / Gofile"
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
              <span>{uploadingCloud ? "جاري الرفع السحابي (Catbox/Gofile)..." : "رفع وتوثيق النسخة الرقمية سحابياً لرمز QR ☁️"}</span>
            </Button>
          )}
        </div>
      </div>
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



export interface PrintHistoryEntry {
  printCount: number;
  firstPrintedAt?: string;
  lastPrintedAt?: string;
  printedBy?: string;
  registrationNumber?: string;
  archiveDocId?: string;
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
  // This cleans out any residual template titles ('خطاب توضيح', 'عرض فني', etc.) that cause overlapping!
  const spaceRun = '<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorHAnsi" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:u w:val="single"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>';

  docXml = docXml.replace(
    /(<w:p\b[^>]*>)(?:<w:pPr>[\s\S]*?<\/w:pPr>)?[\s\S]*?(?:الباركود|البركود)[\s\S]*?(<\/w:p>)/,
    (match, pStart, pEnd) => {
      if (!qrDone && qrDrawingXml) {
        qrDone = true;
        const pPrMatch = match.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
        const pPr = pPrMatch
          ? pPrMatch[0]
          : '<w:pPr><w:spacing w:after="0"/><w:ind w:right="227"/><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:b/><w:bCs/><w:u w:val="single"/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr>';
        return `${pStart}${pPr}${qrDrawingXml}${spaceRun}${pEnd}`;
      }
      return match;
    }
  );

  // Fallback: registration number
  if (!qrDone && qrDrawingXml && docXml.includes("Ad26111000001")) {
    qrDone = true;
    docXml = docXml.replace("Ad26111000001", `${registrationNumber}</w:t></w:r>${qrDrawingXml}<w:r><w:t>`);
  } else {
    docXml = docXml.replace(/Ad26111000001/g, registrationNumber);
  }

  return docXml;
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
  onSave?: () => void;
  onCancelEdits?: () => void;
  saving?: boolean;
  onViewArchive?: () => void;
  customSubtitle?: string;
  icon?: any;
  iconColor?: string;
  iconBg?: string;
}) {
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
                <Badge className="bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
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



