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

import { Eye, Printer, Download, FileText, Check, AlertCircle, Save, RotateCcw, Lock, Archive, Clock, User, HelpCircle, FileCheck, X, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Portal } from "@/components/ui/portal";

export function FreeConvertersQuickLinks({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <span className="text-[11px] font-bold text-muted-foreground hidden sm:inline">
        محولات مجانية:
      </span>
      <a
        href="https://www.adobe.com/acrobat/online/word-to-pdf.html"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/25 text-[11px] font-bold transition-all shadow-2xs"
        title="تحويل وورد إلى PDF مجاناً عبر Adobe Acrobat Online"
      >
        <ExternalLink className="h-3 w-3" />
        <span>Adobe Acrobat</span>
      </a>
      <a
        href="https://www.ilovepdf.com/word_to_pdf"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/25 text-[11px] font-bold transition-all shadow-2xs"
        title="تحويل وورد إلى PDF مجاناً عبر iLovePDF"
      >
        <ExternalLink className="h-3 w-3" />
        <span>iLovePDF</span>
      </a>
    </div>
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

/**
 * Returns the currently logged in user's display name from localStorage.
 */
export function getCurrentUserName(): string {
  if (typeof window === "undefined") return "المستخدم الحالي";
  try {
    const raw = localStorage.getItem("user");
    if (raw) {
      const u = JSON.parse(raw);
      return u.name || u.fullName || u.username || u.email || "المستخدم الحالي";
    }
  } catch (e) {}
  return "المستخدم الحالي";
}

/**
 * Generates Floating DrawingML XML for QR Code:
 * - Positioned at far-left (X: 450000 ~ 1.2cm from paper edge)
 * - Directly under the header line (Y: 1150000 ~ 3.1cm)
 * - Ultra-compact size: 400000 x 400000 (~1.1cm) so it NEVER interferes with or wraps text
 * - behindDoc="1" (Behind Text) & layoutInCell="0" & wrapNone & allowOverlap="1"
 */
export function buildQrAnchorXml(): string {
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="1" locked="0" layoutInCell="0" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>450000</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>1150000</wp:posOffset></wp:positionV><wp:extent cx="400000" cy="400000"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="777" name="DocQR"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="qr.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdQR"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="400000" cy="400000"/></a:xfrm><a:prstGeom prst="rect"/></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
}

/**
 * Injects QR Code strictly into the first page only and cleans any preceding spaces
 * that would otherwise push or wrap text in the title line.
 */
export function injectSingleQrIntoDocXml(
  docXml: string,
  qrDrawingXml: string,
  registrationNumber: string
): string {
  // 1. Remove space runs in the template immediately before the QR placeholder so lines never wrap
  docXml = docXml.replace(
    /<w:t xml:space="preserve">\s{2,}<\/w:t><\/w:r>(?=\s*<w:r[^>]*>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:t>(?:الباركود|البركود)<\/w:t>)/g,
    ""
  );

  // 2. Replace the first occurrence of الباركود with the QR anchor; empty all others
  let qrDone = false;
  docXml = docXml.replace(/\s*(?:الباركود|البركود)\s*/g, () => {
    if (!qrDone && qrDrawingXml) {
      qrDone = true;
      return `</w:t></w:r>${qrDrawingXml}<w:r><w:t>`;
    }
    return "";
  });

  // 3. Fallback to registration number if placeholder missing
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
                  طُبع بواسطة: <strong className="text-foreground">{printInfo.printedBy || "المستخدم"}</strong>
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
                {printInfo?.printedBy || "المستخدم الحالي"}
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



