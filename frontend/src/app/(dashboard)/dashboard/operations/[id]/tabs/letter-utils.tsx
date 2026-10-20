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

/**
 * Generates Floating DrawingML XML for QR Code:
 * - Positioned at top-left below the company info lines (X: 720000 ~ 20mm, Y: 1350000 ~ 37.5mm)
 * - Compact size: 580000 x 580000 (~1.6cm) so it never overlaps header text
 * - behindDoc="1" (Behind Text) & layoutInCell="0" & wrapNone
 */
export function buildQrAnchorXml(): string {
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="1" locked="0" layoutInCell="0" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>720000</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>1350000</wp:posOffset></wp:positionV><wp:extent cx="580000" cy="580000"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="777" name="DocQR"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="qr.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdQR"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="580000" cy="580000"/></a:xfrm><a:prstGeom prst="rect"/></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
}


