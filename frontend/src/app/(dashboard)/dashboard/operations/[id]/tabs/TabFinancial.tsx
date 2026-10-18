"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Coins, Sparkles, CheckCircle2, FileCheck, Check, Printer, Download, Eye,
  Plus, Trash2, X, FileText, AlertCircle, RefreshCw, Building2, Calendar, Hash,
  Layers, ShieldCheck, FileSpreadsheet, ChevronDown, ChevronUp, Copy, SlidersHorizontal,
  ArrowRight, QrCode, Cloud, Globe, ExternalLink, RotateCcw, Save, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Portal } from "@/components/ui/portal";
import { toast } from "sonner";
import api from "@/lib/api";
import { Operation, SectionCard, formatDate, tafqeetArabic, formatCurrency } from "./types";
import { StepFooterNav } from "./StepFooterNav";
import { generateSmartOutgoingRef, BarcodeVisual } from "./letter-utils";
import JSZip from "jszip";
import QRCode from "qrcode";
import { getPdfBlobFromDocx } from "./client-pdf";

// ━━━ تعريف بيانات بنود وبدائل العرض المالي ━━━
export interface FinancialVariant {
  id: string;
  variantType: "basic" | "alternative";
  variantLabel: string;
  description: string;
  subDescription: string;
  branch1: string;
  unitPrice: number;
  totalPrice: number;
  notes: string;
}

export interface FinancialOfferItem {
  id: string;
  itemNumber: number;
  itemName: string;
  unit: string;
  quantity: string;
  variants: FinancialVariant[];
}

function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// بناء صفوف جدول العرض المالي في الوورد (12 عمود بدقة ومطابقة تامة للقالب الأصلي)
function buildFinancialTableRowsXml(itemsList: FinancialOfferItem[]): string {
  let rowsXml = "";

  itemsList.forEach((item, itemIdx) => {
    const variants = item.variants && item.variants.length > 0
      ? item.variants
      : [{
          id: "basic",
          variantType: "basic" as const,
          variantLabel: "أساسى",
          description: "",
          subDescription: "",
          branch1: "",
          unitPrice: 0,
          totalPrice: 0,
          notes: "",
        }];

    const nVariants = variants.length;
    const isSingle = nVariants === 1;

    variants.forEach((variant, vIdx) => {
      const isFirst = vIdx === 0;
      const isLast = vIdx === nVariants - 1;

      // إزالة w:jc center لضمان تطابق محاذاة وهوامش الصفوف بدقة 100% مع صفي الرأس 0 و 1
      const trHeight = isFirst ? 165 : 90;
      const trPr = `<w:trPr><w:trHeight w:val="${trHeight}"/></w:trPr>`;

      const makeCell = (
        width: number,
        content: string,
        isMergedCol: boolean,
        align: "center" | "right" = "center"
      ) => {
        let vMergeStr = "";
        let cellWidthXml = `<w:tcW w:w="${width}" w:type="dxa"/>`;
        if (isMergedCol) {
          if (!isSingle) {
            if (isFirst) {
              vMergeStr = '<w:vMerge w:val="restart"/>';
            } else {
              vMergeStr = '<w:vMerge/>';
              cellWidthXml = '<w:tcW w:w="0" w:type="auto"/>';
            }
          }
        }

        let borderStr = "";
        if (isMergedCol) {
          if (isSingle) {
            borderStr = '<w:top w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:left w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:bottom w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:right w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/>';
          } else if (isFirst) {
            borderStr = '<w:top w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:left w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:right w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/>';
          } else if (isLast) {
            borderStr = '<w:bottom w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:left w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:right w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/>';
          } else {
            borderStr = '<w:left w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:right w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/>';
          }
        } else {
          const bottomVal = isLast ? "thinThickSmallGap" : "single";
          const bottomSz = isLast ? "24" : "4";
          borderStr = `<w:top w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:left w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:bottom w:val="${bottomVal}" w:sz="${bottomSz}" w:space="0" w:color="auto"/><w:right w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/>`;
        }

        let textXml = "";
        if (!isMergedCol || isFirst) {
          if (content !== undefined && content !== null && String(content) !== "") {
            textXml = `<w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(String(content))}</w:t></w:r>`;
          }
        }

        return `<w:tc><w:tcPr>${cellWidthXml}${vMergeStr}<w:tcBorders>${borderStr}</w:tcBorders><w:hideMark/></w:tcPr><w:p><w:pPr><w:spacing w:before="30" w:after="30" w:line="240" w:lineRule="auto"/><w:jc w:val="${align}"/><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr>${textXml}</w:p></w:tc>`;
      };

      const uPrice = Number(variant.unitPrice || 0);
      const uPounds = Math.floor(uPrice);
      const uPiasters = Math.round((uPrice - uPounds) * 100);

      const qVal = Number(item.quantity || 1);
      const tPrice = Number(variant.totalPrice || (uPrice * qVal));
      const tPounds = Math.floor(tPrice);
      const tPiasters = Math.round((tPrice - tPounds) * 100);

      const c0 = makeCell(561, String(itemIdx + 1), true, "center");
      const c1 = makeCell(2072, item.itemName, true, "right");
      const c2 = makeCell(1115, variant.description, false, "right");
      const c3 = makeCell(1115, variant.subDescription, false, "right");
      const c4 = makeCell(973, variant.branch1, false, "right");
      const c5 = makeCell(723, item.unit, true, "center");
      const c6 = makeCell(676, item.quantity, true, "center");
      const c7 = makeCell(555, uPiasters > 0 ? (uPiasters < 10 ? `0${uPiasters}` : String(uPiasters)) : "00", false, "center");
      const c8 = makeCell(600, uPounds > 0 ? String(uPounds) : "0", false, "center");
      const c9 = makeCell(570, tPiasters > 0 ? (tPiasters < 10 ? `0${tPiasters}` : String(tPiasters)) : "00", false, "center");
      const c10 = makeCell(542, tPounds > 0 ? String(tPounds) : "0", false, "center");
      const c11 = makeCell(1064, variant.notes, false, "right");

      rowsXml += `<w:tr>${trPr}${c0}${c1}${c2}${c3}${c4}${c5}${c6}${c7}${c8}${c9}${c10}${c11}</w:tr>`;
    });
  });

  return rowsXml;
}

// بناء صف الإجمالي العام والتفقيط في أسفل الجدول (مطابق للصف 14 في القالب الأصلي 100%)
function buildTotalRowXml(grandTotal: number, tafqeetText: string): string {
  const gPounds = Math.floor(grandTotal);
  const gPiasters = Math.round((grandTotal - gPounds) * 100);

  // تنظيف النص في حال كان يحتوي مسبقاً على 'فقط وقدره' أو 'لا غير' لتجنب أي تكرار
  const cleanTafqeet = (tafqeetText || "")
    .replace(/^الإجمالى\s*\/?\s*/i, "")
    .replace(/^فقط\s*وقدره\s*:?\s*/i, "")
    .replace(/\s*لا\s*غير\.?\s*$/i, "")
    .trim();

  return `<w:tr w:rsidR="002361FD" w:rsidTr="002361FD">
    <w:trPr><w:trHeight w:val="233"/></w:trPr>
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="8390" w:type="dxa"/><w:gridSpan w:val="9"/>
        <w:tcBorders>
          <w:top w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/>
          <w:left w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/>
          <w:bottom w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/>
          <w:right w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/>
        </w:tcBorders>
        <w:hideMark/>
      </w:tcPr>
      <w:p>
        <w:pPr><w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">الإجمالى / فقط وقدره :  ${escapeXml(cleanTafqeet)} لا غير</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="570" w:type="dxa"/><w:tcBorders><w:top w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:left w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:bottom w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:right w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/></w:tcBorders><w:hideMark/></w:tcPr>
      <w:p><w:pPr><w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${gPiasters > 0 ? (gPiasters < 10 ? `0${gPiasters}` : String(gPiasters)) : "00"}</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="542" w:type="dxa"/><w:tcBorders><w:top w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:left w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:bottom w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:right w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/></w:tcBorders><w:hideMark/></w:tcPr>
      <w:p><w:pPr><w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${gPounds > 0 ? String(gPounds) : "0"}</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="1064" w:type="dxa"/><w:tcBorders><w:top w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:right w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/></w:tcBorders><w:hideMark/></w:tcPr>
      <w:p><w:pPr><w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr></w:p>
    </w:tc>
  </w:tr>`;
}

export function TabFinancial({
  op,
  onRefresh,
  onNavigate,
}: {
  op: Operation;
  onRefresh: () => void;
  onNavigate: (tabId: string) => void;
}) {
  // ━━━ قراءة البيانات المحفوظة مسبقاً ━━━
  const savedFin = useMemo(() => {
    try {
      if (op.notes && op.notes.startsWith("{")) {
        const parsed = JSON.parse(op.notes);
        return parsed.financialOfferDocx || null;
      }
    } catch {}
    return null;
  }, [op.notes]);

  // ━━━ 1. الشركة المصدرة للعرض المالي ━━━
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => {
    return savedFin?.selectedCompanyId || op.companies?.[0]?.companyId || op.companies?.[0]?.id || "";
  });

  const currentCompanyLink = useMemo(() => {
    return (
      op.companies?.find(
        (c: any) => c.companyId === selectedCompanyId || c.id === selectedCompanyId
      ) || op.companies?.[0]
    );
  }, [op.companies, selectedCompanyId]);

  const currentCompany = currentCompanyLink?.company;

  // رقم القيد الصادر الذكي
  const [registrationNumber, setRegistrationNumber] = useState(() => {
    if (savedFin?.registrationNumber) return savedFin.registrationNumber;
    return generateSmartOutgoingRef({
      companyCode: currentCompanyLink?.displayCode || "Ad",
      tenderType: op.tenderType || "LIMITED_TENDER",
      dateStr: new Date().toISOString(),
    });
  });

  // كود العملية بالشركة
  const [companyOpCode, setCompanyOpCode] = useState(() => {
    return (
      savedFin?.companyOpCode ||
      currentCompanyLink?.displayCode ||
      `AZ-0${op.serialNumber || 1}`
    );
  });

  // السجل التجاري والبطاقة الضريبية
  const [companyCommercialRegister, setCompanyCommercialRegister] = useState(() => {
    return savedFin?.companyCommercialRegister || currentCompany?.commercialRegister || "110200700036620";
  });
  const [companyTaxCard, setCompanyTaxCard] = useState(() => {
    return savedFin?.companyTaxCard || currentCompany?.taxCard || "658369652";
  });

  // وسائل الاتصال والعنوان بالتذييل
  const [phoneWhatsapp, setPhoneWhatsapp] = useState(() => {
    return savedFin?.phoneWhatsapp || currentCompany?.phone || "01091708818";
  });
  const [phoneMobile, setPhoneMobile] = useState(() => {
    return savedFin?.phoneMobile || "01557018818";
  });
  const [companyAddress, setCompanyAddress] = useState(() => {
    return savedFin?.companyAddress || currentCompany?.address || "بجوار مستشفى ليدى كير  -  بدمنهور -  البحيره";
  });
  const [issueDate, setIssueDate] = useState(() => {
    return savedFin?.issueDate || new Date().toLocaleDateString("en-GB");
  });
  const [barcodeRef, setBarcodeRef] = useState(() => {
    return savedFin?.barcodeRef || `GS-FIN-${op.serialNumber || "365"}`;
  });

  // الرابط السحابي المعتمد للنسخة الرقمية
  const [cloudPdfUrl, setCloudPdfUrl] = useState<string>(() => savedFin?.cloudPdfUrl || "");
  const [uploadingCloud, setUploadingCloud] = useState(false);

  // ━━━ 2. جهة الإسناد وبيانات العملية في الموضوع ━━━
  const [recipientPrefix, setRecipientPrefix] = useState(() => {
    return savedFin?.recipientPrefix || "الأستاذ";
  });
  const [recipientTitleAndAuthority, setRecipientTitleAndAuthority] = useState(() => {
    return (
      savedFin?.recipientTitleAndAuthority ||
      (op.authority
        ? `مدير الادارة العامة للمشتريات والمخازن بـ ${op.authority}`
        : "مدير الادارة العامة للمشتريات والمخازن بجامعة دمنهور")
    );
  });

  const [subjectTarget, setSubjectTarget] = useState(() => {
    return savedFin?.subjectTarget || "للأصناف";
  });
  const [operationRegisteredName, setOperationRegisteredName] = useState(() => {
    return savedFin?.operationRegisteredName || op.name || "توريد كاوتش وبطاريات للسيارات";
  });
  const [operationNumber, setOperationNumber] = useState(() => {
    return savedFin?.operationNumber || op.externalNumber || String(op.serialNumber || "365");
  });
  const [fiscalYear, setFiscalYear] = useState(() => {
    return savedFin?.fiscalYear || "2024 / 2025";
  });
  const [financialOpeningDate, setFinancialOpeningDate] = useState(() => {
    if (savedFin?.financialOpeningDate) return savedFin.financialOpeningDate;
    const d = op.dates?.find((dt: any) => dt.type === "FINANCIAL_OPENING" || dt.title?.includes("مالي") || dt.type === "TECHNICAL_OPENING");
    if (d?.dateValue) return formatDate(d.dateValue);
    if (d?.date) return formatDate(d.date);
    return "14/ 1 /2024";
  });

  // ━━━ 3. جدول الأصناف والأسعار (12 عمود) ━━━
  const [items, setItems] = useState<FinancialOfferItem[]>(() => {
    if (savedFin?.items && savedFin.items.length > 0) {
      return savedFin.items;
    }
    return [
      {
        id: "item-1",
        itemNumber: 1,
        itemName: "إطار كاوتش مقاس 1200 / 20 سلك",
        unit: "عدد",
        quantity: "24",
        variants: [
          {
            id: "v-1-1",
            variantType: "basic",
            variantLabel: "أساسى",
            description: "إطارات ماركة ميشلان فرنسي إنتاج 2026",
            subDescription: "حمولة 18PR سرعة K",
            branch1: "نقشة شجري",
            unitPrice: 12500,
            totalPrice: 300000,
            notes: "شامل البلف والشريط والشنبر",
          },
          {
            id: "v-1-2",
            variantType: "alternative",
            variantLabel: "بديل 1",
            description: "إطارات ماركة بريدجستون ياباني إنتاج 2026",
            subDescription: "حمولة 18PR سرعة L",
            branch1: "نقشة خطوط طولية",
            unitPrice: 11800,
            totalPrice: 283200,
            notes: "بديل 1 معتمد ومطابق",
          },
        ],
      },
      {
        id: "item-2",
        itemNumber: 2,
        itemName: "بطارية جافة 70 أمبير",
        unit: "عدد",
        quantity: "10",
        variants: [
          {
            id: "v-2-1",
            variantType: "basic",
            variantLabel: "أساسى",
            description: "بطارية فارتا ألماني 70 أمبير قطب شمالي",
            subDescription: "جهد 12 فولت تيار بدء 640A",
            branch1: "صيانة مجانية",
            unitPrice: 3500,
            totalPrice: 35000,
            notes: "ضمان 18 شهر ضد عيوب الصناعة",
          },
        ],
      },
    ];
  });

  // حالة الضريبة
  const [taxCondition, setTaxCondition] = useState(() => {
    return savedFin?.taxCondition || "الأسعار شاملة ضريبة القيمة المضافه";
  });
  const [vatRate, setVatRate] = useState<number>(() => {
    return savedFin?.vatRate !== undefined ? savedFin.vatRate : 14;
  });

  // حساب الإجماليات بدقة
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => {
      // نحسب البند الأساسي أو أول بديل في كل صنف للإجمالي العام
      const basicVariant = item.variants.find((v) => v.variantType === "basic") || item.variants[0];
      const q = Number(item.quantity || 1);
      const u = Number(basicVariant?.unitPrice || 0);
      return acc + (u * q);
    }, 0);
  }, [items]);

  const vatAmount = useMemo(() => {
    if (taxCondition.includes("شاملة") && !taxCondition.includes("غير شاملة")) {
      return 0; // السعر شامل الضريبة بالفعل
    }
    return Math.round(subtotal * (vatRate / 100) * 100) / 100;
  }, [subtotal, taxCondition, vatRate]);

  const grandTotal = useMemo(() => {
    return subtotal + vatAmount;
  }, [subtotal, vatAmount]);

  const tafqeetText = useMemo(() => {
    return tafqeetArabic(grandTotal);
  }, [grandTotal]);

  // ━━━ 4. مدة الضمان والشروط والإيضاحات الهامة ━━━
  const [warrantyDuration, setWarrantyDuration] = useState(() => {
    return savedFin?.warrantyDuration || "سنة";
  });
  const [warrantyTerms, setWarrantyTerms] = useState(() => {
    return savedFin?.warrantyTerms || "ضد عيوب الصناعه في مداس الكاوتش  فقط";
  });

  const [condition1, setCondition1] = useState(() => {
    return savedFin?.condition1 || "التوريد مخازن الشركة والنقل على حساب الشركة بالسيارات المخصصه";
  });
  const [condition2, setCondition2] = useState(() => {
    return savedFin?.condition2 || "في حالة تغير الأسعار للمحروقات بقرار مجلس الوزراء يتم رفع السعر بالنسبة المقررة قانونا وفى حينه من تاريخ اعلان الزيادة الرسمى";
  });
  const [condition3, setCondition3] = useState(() => {
    return savedFin?.condition3 || "الارتباط بالأسعار تسعون يوما من تاريخ الفتح الفنى";
  });
  const [condition4, setCondition4] = useState(() => {
    return savedFin?.condition4 || "زيادة ضغط الهواء بالاطارات";
  });

  // ━━━ 5. الاعتمادات والتوقيعات ━━━
  const [specialistTitle, setSpecialistTitle] = useState(() => {
    return savedFin?.specialistTitle || "المهندس المختص :";
  });
  const [specialistName, setSpecialistName] = useState(() => {
    return savedFin?.specialistName || "أحمد محمد";
  });
  const [financeManagerName, setFinanceManagerName] = useState(() => {
    return savedFin?.financeManagerName || "محمود إبراهيم";
  });
  const [boardChairman, setBoardChairman] = useState(() => {
    return savedFin?.boardChairman || "يعتمد ،،،،،، رئيس مجلس الإدارة";
  });

  // ━━━ 6. تتبع حالة التعديل والحفظ (isDirty control) ━━━
  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      selectedCompanyId,
      registrationNumber,
      companyOpCode,
      companyCommercialRegister,
      companyTaxCard,
      phoneWhatsapp,
      phoneMobile,
      companyAddress,
      issueDate,
      barcodeRef,
      cloudPdfUrl,
      recipientPrefix,
      recipientTitleAndAuthority,
      subjectTarget,
      operationRegisteredName,
      operationNumber,
      fiscalYear,
      financialOpeningDate,
      items,
      taxCondition,
      vatRate,
      warrantyDuration,
      warrantyTerms,
      condition1,
      condition2,
      condition3,
      condition4,
      specialistTitle,
      specialistName,
      financeManagerName,
      boardChairman,
    });
  }, [
    selectedCompanyId, registrationNumber, companyOpCode, companyCommercialRegister,
    companyTaxCard, phoneWhatsapp, phoneMobile, companyAddress, issueDate, barcodeRef,
    cloudPdfUrl, recipientPrefix, recipientTitleAndAuthority, subjectTarget,
    operationRegisteredName, operationNumber, fiscalYear, financialOpeningDate, items,
    taxCondition, vatRate, warrantyDuration, warrantyTerms, condition1, condition2,
    condition3, condition4, specialistTitle, specialistName, financeManagerName, boardChairman,
  ]);

  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => currentSnapshot);
  const isDirty = useMemo(() => currentSnapshot !== savedSnapshot, [currentSnapshot, savedSnapshot]);

  // Modals & Action States
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [renderingDocx, setRenderingDocx] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [printingDocx, setPrintingDocx] = useState(false);
  const [savingOffer, setSavingOffer] = useState(false);

  // إدارة عناصر الجدول
  const handleAddMainItem = () => {
    const nextIdx = items.length + 1;
    const newItem: FinancialOfferItem = {
      id: "item-" + Date.now(),
      itemNumber: nextIdx,
      itemName: `صنف رقم (${nextIdx})`,
      unit: "عدد",
      quantity: "1",
      variants: [
        {
          id: "v-" + Date.now(),
          variantType: "basic",
          variantLabel: "أساسى",
          description: "",
          subDescription: "",
          branch1: "",
          unitPrice: 0,
          totalPrice: 0,
          notes: "",
        },
      ],
    };
    setItems([...items, newItem]);
    toast.success(`تمت إضافة الصنف رقم (${nextIdx}) بنجاح`);
  };

  const handleRemoveMainItem = (itemId: string) => {
    if (items.length <= 1) {
      toast.warning("يجب أن يحتوي العرض المالي على صنف واحد على الأقل");
      return;
    }
    const updated = items.filter((i) => i.id !== itemId).map((item, idx) => ({
      ...item,
      itemNumber: idx + 1,
    }));
    setItems(updated);
  };

  const handleUpdateItemField = (itemId: string, field: keyof FinancialOfferItem, val: any) => {
    setItems(
      items.map((item) => {
        if (item.id !== itemId) return item;
        const updatedItem = { ...item, [field]: val };
        // إذا تغيرت الكمية نعيد حساب إجمالي كل بديل
        if (field === "quantity") {
          const q = Number(val || 1);
          updatedItem.variants = item.variants.map((v) => ({
            ...v,
            totalPrice: Math.round(Number(v.unitPrice || 0) * q * 100) / 100,
          }));
        }
        return updatedItem;
      })
    );
  };

  const handleAddAlternative = (itemId: string) => {
    setItems(
      items.map((item) => {
        if (item.id !== itemId) return item;
        const currentAlts = item.variants.filter((v) => v.variantType === "alternative");
        const nextAltNum = currentAlts.length + 1;
        const q = Number(item.quantity || 1);
        const newVariant: FinancialVariant = {
          id: "v-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5),
          variantType: "alternative",
          variantLabel: `بديل ${nextAltNum}`,
          description: "",
          subDescription: "",
          branch1: "",
          unitPrice: 0,
          totalPrice: 0,
          notes: `بديل رقم ${nextAltNum} مطابق للمواصفات`,
        };
        return {
          ...item,
          variants: [...item.variants, newVariant],
        };
      })
    );
    toast.success("تمت إضافة بديل تسعير جديد للصنف بنجاح ✨");
  };

  const handleRemoveAlternative = (itemId: string, variantId: string) => {
    setItems(
      items.map((item) => {
        if (item.id !== itemId) return item;
        const remaining = item.variants.filter((v) => v.id !== variantId);
        let altCount = 1;
        const renumbered = remaining.map((v) => {
          if (v.variantType === "basic") return v;
          const updated = { ...v, variantLabel: `بديل ${altCount}` };
          altCount++;
          return updated;
        });
        return { ...item, variants: renumbered };
      })
    );
    toast.info("تم حذف البديل");
  };

  const handleUpdateVariantField = (
    itemId: string,
    variantId: string,
    field: keyof FinancialVariant,
    val: any
  ) => {
    setItems(
      items.map((item) => {
        if (item.id !== itemId) return item;
        const q = Number(item.quantity || 1);
        return {
          ...item,
          variants: item.variants.map((v) => {
            if (v.id !== variantId) return v;
            const updated = { ...v, [field]: val };
            if (field === "unitPrice") {
              const u = Number(val || 0);
              updated.totalPrice = Math.round(u * q * 100) / 100;
            }
            return updated;
          }),
        };
      })
    );
  };

  // استيراد الأصناف من العرض الفني إن وجد
  const handleImportFromTechnical = () => {
    try {
      if (op.notes && op.notes.startsWith("{")) {
        const parsed = JSON.parse(op.notes);
        const techItems = parsed.technicalOfferDocx?.items;
        if (techItems && techItems.length > 0) {
          const imported: FinancialOfferItem[] = techItems.map((ti: any, idx: number) => ({
            id: "imported-tech-" + idx,
            itemNumber: idx + 1,
            itemName: ti.itemName || `صنف رقم (${idx + 1})`,
            unit: ti.unit || "عدد",
            quantity: ti.quantity || "1",
            variants: (ti.variants || []).map((tv: any, vIdx: number) => ({
              id: "v-imp-" + idx + "-" + vIdx,
              variantType: tv.variantType || (vIdx === 0 ? "basic" : "alternative"),
              variantLabel: tv.variantLabel || (vIdx === 0 ? "أساسى" : `بديل ${vIdx}`),
              description: tv.description || "",
              subDescription: tv.subDescription || "",
              branch1: tv.branch1 || "",
              unitPrice: 0,
              totalPrice: 0,
              notes: tv.notes || "مطابق للمواصفات الفنية المعتمدة",
            })),
          }));
          setItems(imported);
          toast.success(`تم استيراد ${imported.length} صنف بمواصفاتها وبدائلها بنجاح من العرض الفني! 🚀`);
          return;
        }
      }
    } catch {}
    toast.info("لم يتم العثور على أصناف مسجلة بالعرض الفني للاستيراد");
  };

  // إعادة توليد رقم القيد
  const handleRegenerateRef = () => {
    const fresh = generateSmartOutgoingRef({
      companyCode: currentCompanyLink?.displayCode || "Ad",
      tenderType: op.tenderType || "LIMITED_TENDER",
      dateStr: new Date().toISOString(),
    });
    setRegistrationNumber(fresh);
    toast.success(`تم تحديث رقم القيد إلى: ${fresh}`);
  };

  // ━━━ محرك استبدال المتغيرات مباشرة في قالب الوورد الأصلي (عرض مالى.docx) ━━━
  const generateFinancialDocxBlob = async (): Promise<Blob> => {
    const response = await fetch("/templates/financial_offer_template.docx");
    if (!response.ok) throw new Error("فشل قراءة قالب العرض المالي الأصلي من الخادم");
    const templateBuffer = await response.arrayBuffer();

    const zip = await JSZip.loadAsync(templateBuffer);

    // توليد رمز التحقق الرقمي المباشر
    let qrDrawingXml = "";
    try {
      const targetVerifyUrl =
        cloudPdfUrl ||
        `${typeof window !== "undefined" ? window.location.origin : ""}/verify-doc?ref=${encodeURIComponent(registrationNumber)}&opId=${op.id}&type=financial`;
      const qrDataUrl = await QRCode.toDataURL(targetVerifyUrl, { width: 160, margin: 1 });
      const qrBase64 = qrDataUrl.split(",")[1];
      const qrBinary = Uint8Array.from(atob(qrBase64), (c) => c.charCodeAt(0));

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

      qrDrawingXml = `<w:r><w:drawing><wp:inline xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><wp:extent cx="850000" cy="850000"/><wp:docPr id="777" name="DocQR"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="qr.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdQR"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="850000" cy="850000"/></a:xfrm><a:prstGeom prst="rect"/></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
    } catch (e) {
      console.warn("QR generation failed:", e);
    }

    // 1. استبدال كافة المتغيرات في word/document.xml
    let docXml = await zip.file("word/document.xml")!.async("text");

    // استبدال كلمة الباركود بالأعلى في P0 برمز QR الرقمي المباشر
    if (qrDrawingXml) {
      if (docXml.includes("الباركود")) {
        docXml = docXml.replace(/الباركود/g, `</w:t></w:r>${qrDrawingXml}<w:r><w:t>`);
      } else if (docXml.includes("البركود")) {
        docXml = docXml.replace(/البركود/g, `</w:t></w:r>${qrDrawingXml}<w:r><w:t>`);
      }
    } else {
      docXml = docXml.replace(/الباركود/g, "");
      docXml = docXml.replace(/البركود/g, "");
    }

    // صفة ولقب المرسل إليه والجهة الإدارية
    docXml = docXml.replace(/الأستاذ/g, escapeXml(recipientPrefix));
    docXml = docXml.replace(
      /مدير الادارة العامة للمشتريات والمخازن بجامعة دمنهور/g,
      escapeXml(recipientTitleAndAuthority)
    );

    // الموضوع وبيانات العملية
    docXml = docXml.replace(/للأصناف/g, escapeXml(subjectTarget));
    docXml = docXml.replace(/اسم العملية المسجله[\s\.]*/g, escapeXml(operationRegisteredName) + " ");
    docXml = docXml.replace(/365/g, escapeXml(operationNumber));

    // العام المالي وموعد فتح المظروف
    docXml = docXml.replace(/2024\s*\/\s*2025/g, escapeXml(fiscalYear));
    docXml = docXml.replace(/14\/\s*1\s*\/2024/g, escapeXml(financialOpeningDate));

    // مدة الضمان وشروط وتغطية الضمان
    docXml = docXml.replace(/<w:t>سنة<\/w:t>/g, `<w:t>${escapeXml(warrantyDuration)}</w:t>`);
    docXml = docXml.replace(/ضد عيوب الصناعه في مداس\s*الكاوتش\s*فقط/g, escapeXml(warrantyTerms));
    docXml = docXml.replace(/ضد عيوب الصناعه في مداس\s*/g, escapeXml(warrantyTerms));
    docXml = docXml.replace(/الكاوتش\s*فقط/g, "");

    // الشروط والإيضاحات الهامة
    docXml = docXml.replace(
      /التوريد مخازن الشركة والنقل على حساب الشركة بالسيارات المخصصه/g,
      escapeXml(condition1)
    );
    docXml = docXml.replace(
      /في حالة تغير الأسعار للمحروقات بقرار مجلس الوزراء يتم رفع السعر بالنسبة المقررة قانونا وفى حينه من تاريخ اعلان الزيادة\s*الرسمى\s*/g,
      escapeXml(condition2)
    );
    docXml = docXml.replace(
      /الارتباط بالأسعار تسعون يوما من تاريخ الفتح الفنى/g,
      escapeXml(condition3)
    );
    docXml = docXml.replace(/زيادة ضغط الهواء بالاطارات/g, escapeXml(condition4));

    // شرط القيمة المضافة
    docXml = docXml.replace(
      /الأسعار شاملة \/ غير شاملة ضريبة القيمة المضافه/g,
      escapeXml(taxCondition)
    );

    // الاعتمادات والتوقيعات
    docXml = docXml.replace(/المهندس\s*المختص\s*:/g, escapeXml(specialistTitle));
    docXml = docXml.replace(/أحمد محمد/g, escapeXml(specialistName));
    docXml = docXml.replace(/اسم/g, escapeXml(financeManagerName || " "));

    // استبدال جدول الأصناف والأسعار بالكامل (Table 0)
    const tblStart = docXml.indexOf("<w:tbl>");
    const tblEnd = docXml.indexOf("</w:tbl>") + 8;
    if (tblStart !== -1 && tblEnd !== -1) {
      const tblXml = docXml.substring(tblStart, tblEnd);
      // الحفاظ على صفي الرأس 0 و 1
      const firstTrEnd = tblXml.indexOf("</w:tr>") + 7;
      const secondTrEnd = tblXml.indexOf("</w:tr>", firstTrEnd) + 7;
      const tableHeaderPart = tblXml.substring(0, secondTrEnd);

      const newRowsXml = buildFinancialTableRowsXml(items);
      const totalRowXml = buildTotalRowXml(grandTotal, tafqeetText);
      const newTblXml = tableHeaderPart + newRowsXml + totalRowXml + "</w:tbl>";
      docXml = docXml.substring(0, tblStart) + newTblXml + docXml.substring(tblEnd);
    }

    // إزالة أي Highlight أو ألوان تمييز
    docXml = docXml.replace(/<w:highlight\s+[^>]*\/>/g, "");
    docXml = docXml.replace(/<w:color\s+w:val=\"(red|FF0000)\"[^>]*\/>/g, "");

    zip.file("word/document.xml", docXml);

    // 2. ترويسة الصفحة (word/header2.xml)
    let hdrXml = await zip.file("word/header2.xml")?.async("text");
    if (hdrXml) {
      hdrXml = hdrXml.replace(/110200700036620/g, escapeXml(companyCommercialRegister));
      hdrXml = hdrXml.replace(/658369652/g, escapeXml(companyTaxCard));
      hdrXml = hdrXml.replace(/\(\s*كود العملية بالشركه\s*\)/g, `( ${escapeXml(companyOpCode)} )`);
      hdrXml = hdrXml.replace(/كود العملية بالشركه/g, escapeXml(companyOpCode));
      hdrXml = hdrXml.replace(/<w:highlight\s+[^>]*\/>/g, "");
      hdrXml = hdrXml.replace(/<w:color\s+w:val=\"(red|FF0000)\"[^>]*\/>/g, "");
      zip.file("word/header2.xml", hdrXml);
    }

    // 3. تذييل الصفحة (word/footer1.xml)
    let ftrXml = await zip.file("word/footer1.xml")?.async("text");
    if (ftrXml) {
      ftrXml = ftrXml.replace(/15\/10\/2026/g, escapeXml(issueDate));
      ftrXml = ftrXml.replace(/رقم القيد/g, `رقم القيد: ${escapeXml(registrationNumber)}`);
      ftrXml = ftrXml.replace(/01091708818/g, escapeXml(phoneWhatsapp));
      ftrXml = ftrXml.replace(/01557018818/g, escapeXml(phoneMobile));
      ftrXml = ftrXml.replace(
        /بجوار مستشفى ليدى كير\s*-\s*بدمنهور\s*-\s*البح\s*يره/g,
        escapeXml(companyAddress)
      );
      ftrXml = ftrXml.replace(/<w:highlight\s+[^>]*\/>/g, "");
      ftrXml = ftrXml.replace(/<w:color\s+w:val=\"(red|FF0000)\"[^>]*\/>/g, "");
      zip.file("word/footer1.xml", ftrXml);
    }

    return await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  };

  // ━━━ حفظ التعديلات ━━━
  const handleSaveOffer = async () => {
    setSavingOffer(true);
    try {
      let currentNotesObj: any = {};
      try {
        if (op.notes && op.notes.startsWith("{")) {
          currentNotesObj = JSON.parse(op.notes);
        }
      } catch {}

      const finPayload = {
        selectedCompanyId,
        registrationNumber,
        companyOpCode,
        companyCommercialRegister,
        companyTaxCard,
        phoneWhatsapp,
        phoneMobile,
        companyAddress,
        issueDate,
        barcodeRef,
        cloudPdfUrl,
        recipientPrefix,
        recipientTitleAndAuthority,
        subjectTarget,
        operationRegisteredName,
        operationNumber,
        fiscalYear,
        financialOpeningDate,
        items,
        taxCondition,
        vatRate,
        subtotal,
        grandTotal,
        tafqeetText,
        warrantyDuration,
        warrantyTerms,
        condition1,
        condition2,
        condition3,
        condition4,
        specialistTitle,
        specialistName,
        financeManagerName,
        boardChairman,
        updatedAt: new Date().toISOString(),
      };

      currentNotesObj.financialOfferDocx = finPayload;

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(currentNotesObj),
      });

      setSavedSnapshot(currentSnapshot);
      toast.success("تم حفظ جميع تعديلات العرض المالي بنجاح في قاعدة البيانات! 💾✨");
      onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error("فشل حفظ التعديلات: " + (err?.response?.data?.message || err?.message || "خطأ اتصال"));
    } finally {
      setSavingOffer(false);
    }
  };

  // ━━━ إلغاء التعديلات والتراجع للحالة المحفوظة ━━━
  const handleCancelEdits = () => {
    try {
      const snap = JSON.parse(savedSnapshot);
      setSelectedCompanyId(snap.selectedCompanyId);
      setRegistrationNumber(snap.registrationNumber);
      setCompanyOpCode(snap.companyOpCode);
      setCompanyCommercialRegister(snap.companyCommercialRegister);
      setCompanyTaxCard(snap.companyTaxCard);
      setPhoneWhatsapp(snap.phoneWhatsapp);
      setPhoneMobile(snap.phoneMobile);
      setCompanyAddress(snap.companyAddress);
      setIssueDate(snap.issueDate);
      setBarcodeRef(snap.barcodeRef);
      setCloudPdfUrl(snap.cloudPdfUrl);
      setRecipientPrefix(snap.recipientPrefix);
      setRecipientTitleAndAuthority(snap.recipientTitleAndAuthority);
      setSubjectTarget(snap.subjectTarget);
      setOperationRegisteredName(snap.operationRegisteredName);
      setOperationNumber(snap.operationNumber);
      setFiscalYear(snap.fiscalYear);
      setFinancialOpeningDate(snap.financialOpeningDate);
      setItems(snap.items);
      setTaxCondition(snap.taxCondition);
      setVatRate(snap.vatRate);
      setWarrantyDuration(snap.warrantyDuration);
      setWarrantyTerms(snap.warrantyTerms);
      setCondition1(snap.condition1);
      setCondition2(snap.condition2);
      setCondition3(snap.condition3);
      setCondition4(snap.condition4);
      setSpecialistTitle(snap.specialistTitle);
      setSpecialistName(snap.specialistName);
      setFinanceManagerName(snap.financeManagerName);
      setBoardChairman(snap.boardChairman);
      toast.info("تم التراجع عن التعديلات غير المحفوظة وإعادة النموذج للحالة السابقة ↺");
    } catch {
      toast.error("تعذر التراجع عن التعديلات");
    }
  };

  // ━━━ رفع النسخة الرقمية PDF إلى السحابة للـ QR المباشر (مرة واحدة فقط بدون تكرار) ━━━
  const handleUploadCloudPdf = async () => {
    if (cloudPdfUrl) {
      toast.info("هذا المستند مرفوع سحابياً بالفعل وموثق برابط مباشر! ✓");
      return;
    }

    setUploadingCloud(true);
    toast.info("جاري تحويل العرض المالي ورفعه سحابياً لاعتماد رمز QR المباشر... ⏳");

    try {
      const pdfBlob = await generateFinancialPdfBlob();
      const uploadForm = new FormData();
      uploadForm.append(
        "file",
        pdfBlob,
        `financial_${registrationNumber || op.serialNumber}.pdf`
      );

      const uploadRes = await api.post("/operations/upload-cloud-pdf", uploadForm, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (uploadRes.data && uploadRes.data.url) {
        const directUrl = uploadRes.data.url;
        setCloudPdfUrl(directUrl);

        let currentNotesObj: any = {};
        try {
          if (op.notes && op.notes.startsWith("{")) {
            currentNotesObj = JSON.parse(op.notes);
          }
        } catch {}
        if (!currentNotesObj.financialOfferDocx) {
          currentNotesObj.financialOfferDocx = {};
        }
        currentNotesObj.financialOfferDocx.cloudPdfUrl = directUrl;

        await api.patch(`/operations/${op.id}`, {
          notes: JSON.stringify(currentNotesObj),
        });

        toast.success("تم رفع النسخة السحابية بنجاح! سيفتح رمز QR ملف PDF مباشرة عند المسح 🚀");
        onRefresh();
      }
    } catch (err: any) {
      console.error("Cloud upload error:", err);
      toast.error(
        "تعذر رفع النسخة السحابية حالياً: " +
          (err?.response?.data?.message || err?.message || "خطأ اتصال")
      );
    } finally {
      setUploadingCloud(false);
    }
  };


  // ━━━ تحويل المستند الأصلي إلى PDF ذكي وفوري ━━━
  const generateFinancialPdfBlob = async (): Promise<Blob> => {
    const docxBlob = await generateFinancialDocxBlob();
    return await getPdfBlobFromDocx(
      docxBlob,
      `financial_offer_${registrationNumber || op.serialNumber}.docx`
    );
  };

  // ━━━ تحميل المعاينة الرسمية من محرك Word الأصلي ━━━
  const loadOfficialPreview = async () => {
    setRenderingDocx(true);
    try {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
        setPreviewPdfUrl(null);
      }
      const pdfBlob = await generateFinancialPdfBlob();
      const url = URL.createObjectURL(pdfBlob);
      setPreviewPdfUrl(url);
    } catch (err: any) {
      console.error("فشل تجهيز معاينة العرض المالي:", err);
      toast.error("تعذر تجهيز المعاينة: " + (err?.message || ""));
    } finally {
      setRenderingDocx(false);
    }
  };

  // ━━━ طباعة مستند الوورد الأصلي عبر PDF عالي الدقة ━━━
  const handlePrintWordDocument = async () => {
    if (isDirty) {
      toast.warning("يجب حفظ التعديلات أولاً قبل الطباعة!");
      return;
    }
    setPrintingDocx(true);
    try {
      toast.info("جاري تجهيز مستند العرض المالي للطباعة بأعلى دقة...");
      const pdfBlob = await generateFinancialPdfBlob();
      const pdfUrl = URL.createObjectURL(pdfBlob);

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.src = pdfUrl;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          iframe.focus();
          try {
            iframe.contentWindow?.print();
          } catch {
            window.open(pdfUrl, "_blank")?.print();
          }
        }, 400);
      };
    } catch (err: any) {
      toast.error("فشل تجهيز الطباعة: " + (err?.response?.data?.message || err?.message || ""));
    } finally {
      setPrintingDocx(false);
    }
  };

  // ━━━ تحميل ملف Word الأصلي (.docx) ━━━
  const handleDownloadDocx = async () => {
    if (isDirty) {
      toast.warning("يرجى حفظ التعديلات أولاً لضمان تحديث مستند الوورد!");
      return;
    }
    setDownloadingDocx(true);
    try {
      const blob = await generateFinancialDocxBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `عرض_مالي_${op.serialNumber || "365"}_${registrationNumber}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل ملف الوورد الأصلي المعتمد بنجاح! 📄");
    } catch (err: any) {
      console.error(err);
      toast.error("فشل توليد ملف Word: " + (err.message || "خطأ غير متوقع"));
    } finally {
      setDownloadingDocx(false);
    }
  };

  // ━━━ تحميل بصيغة PDF عالية الدقة ━━━
  const handleDownloadPdf = async () => {
    if (isDirty) {
      toast.warning("يرجى حفظ التعديلات أولاً لضمان احتواء الـ PDF على أحدث البيانات!");
      return;
    }
    setDownloadingPdf(true);
    try {
      toast.info("جاري تصدير العرض المالي بصيغة PDF الرسمية...");
      const pdfBlob = await generateFinancialPdfBlob();
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `عرض_مالي_${op.serialNumber || "365"}_${registrationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تصدير وتحميل مستند PDF بنجاح! 📑");
    } catch (err: any) {
      console.error(err);
      toast.error("فشل تصدير مستند PDF: " + (err?.response?.data?.message || err?.message || ""));
    } finally {
      setDownloadingPdf(false);
    }
  };

  useEffect(() => {
    if (previewModalOpen) {
      loadOfficialPreview();
    }
    return () => {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewModalOpen]);

  // ━━━ طباعة العرض المالي مباشرة ━━━
  const handleDirectPrint = () => {
    if (isDirty) {
      toast.warning("يجب حفظ التعديلات أولاً قبل الطباعة!");
      return;
    }
    handlePrintWordDocument();
  };

  return (
    <div className="space-y-6 animate-fade-in print:m-0 print:p-0">
      {/* ━━━ شريط تنبيه التعديلات غير المحفوظة وأزرار الحفظ/الإلغاء (حسب طلب المستخدم بدقة) ━━━ */}
      {isDirty && (
        <div className="sticky top-2 z-30 p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 shadow-xl backdrop-blur-md flex items-center justify-between gap-3 animate-bounce-subtle">
          <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 animate-pulse" />
            <div>
              <span className="font-extrabold text-sm block">توجد تعديلات جديدة غير محفوظة في العرض المالي!</span>
              <span className="text-[11px] opacity-90">
                أزرار المعاينة والطباعة مقفلة لحين حفظ التعديلات لضمان دقة وتطابق المستند المطبوع.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelEdits}
              className="h-8.5 px-3 text-xs font-bold rounded-xl border-amber-500/40 hover:bg-amber-500/20 cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>إلغاء التعديلات</span>
            </Button>

            <Button
              size="sm"
              onClick={handleSaveOffer}
              disabled={savingOffer}
              className="h-8.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{savingOffer ? "جاري الحفظ..." : "حفظ التعديلات 💾"}</span>
            </Button>
          </div>
        </div>
      )}

      {/* ━━━ HERO ACTION BANNER (مطابق تماماً للعرض الفني) ━━━ */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-700 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs font-bold px-2.5 py-0.5 backdrop-blur-md">
              قالب وورد معتمد: عرض مالى.docx
            </Badge>
            <span className="text-xs text-white/80 font-mono">
              رقم القيد: {registrationNumber}
            </span>
            {isDirty ? (
              <Badge className="bg-amber-400 text-amber-950 font-black text-xs px-2 py-0.5 animate-pulse">
                تعديلات غير محفوظة ⚠️
              </Badge>
            ) : (
              <Badge className="bg-emerald-400 text-emerald-950 font-bold text-xs px-2 py-0.5">
                محفوظ ومعتمد ✓
              </Badge>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight">
            العرض المالي وجدول الأسعار والكميات
          </h2>
          <p className="text-xs text-white/90 max-w-2xl leading-relaxed">
            مطابق 100% لقالب الوورد الأصلي للشركة. يمكنك تخصيص الأسعار والكميات وحساب الضرائب والتفقيط وتوليد المستند المعتمد مباشرة.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          {/* زر المعاينة - مقفول إذا كان هناك تعديلات غير محفوظة */}
          <Button
            size="sm"
            onClick={() => setPreviewModalOpen(true)}
            disabled={isDirty}
            title={isDirty ? "يجب حفظ التعديلات أولاً لتفعيل المعاينة الرسمية" : "معاينة مستند الوورد المعتمد"}
            className={`font-bold text-xs h-9 px-4 rounded-xl shadow-md flex items-center gap-1.5 transition-all ${
              isDirty
                ? "bg-white/40 text-white/70 cursor-not-allowed"
                : "bg-white hover:bg-white/90 text-teal-700 cursor-pointer"
            }`}
          >
            {isDirty ? <Lock className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span>معاينة مستند الوورد المعتمد</span>
          </Button>

          {/* زر طباعة مباشر */}
          <Button
            size="sm"
            onClick={handleDirectPrint}
            disabled={isDirty}
            title={isDirty ? "يجب حفظ التعديلات أولاً للطباعة" : "طباعة العرض المالي"}
            className={`font-bold text-xs h-9 px-3.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all ${
              isDirty
                ? "bg-white/30 text-white/70 cursor-not-allowed"
                : "bg-slate-900 hover:bg-black text-white cursor-pointer"
            }`}
          >
            {isDirty ? <Lock className="h-4 w-4" /> : <Printer className="h-4 w-4" />}
            <span>طباعة</span>
          </Button>

          {/* زر حفظ التعديلات */}
          <Button
            size="sm"
            onClick={handleSaveOffer}
            disabled={savingOffer || !isDirty}
            className={`font-bold text-xs h-9 px-3.5 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-all ${
              isDirty
                ? "bg-amber-400 hover:bg-amber-300 text-amber-950 font-black animate-pulse"
                : "bg-emerald-500 hover:bg-emerald-600 text-white"
            }`}
          >
            <Save className="h-4 w-4" />
            <span>{savingOffer ? "جاري الحفظ..." : isDirty ? "حفظ التعديلات 💾" : "التعديلات محفوظة ✓"}</span>
          </Button>
        </div>
      </div>

      {/* ━━━ بطاقة التحكم الرئيسية والأدوات الرسمية ━━━ */}
      <SectionCard
        title="العرض المالي وجدول الأسعار المعتمد (قالب Word الأصلي)"
        icon={Coins}
        iconColor="text-teal-600"
        badge={
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30 text-[10px] font-bold">
              12 عمود أسعار • قرش وجنيه
            </Badge>
            {isDirty ? (
              <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-[10px] font-black animate-pulse">
                تعديلات غير محفوظة ⚠️
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                محفوظ ومعتمد ✓
              </Badge>
            )}
            {cloudPdfUrl && (
              <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-bold flex items-center gap-1">
                <Globe className="h-3 w-3" />
                <span>QR مباشر مفعّل</span>
              </Badge>
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* حفظ التعديلات */}
            <Button
              size="sm"
              onClick={handleSaveOffer}
              disabled={savingOffer || !isDirty}
              className={`h-8.5 px-3 rounded-xl font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 transition-all ${
                isDirty
                  ? "bg-amber-600 hover:bg-amber-700 text-white animate-pulse"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              <Save className="h-3.5 w-3.5" />
              <span>{savingOffer ? "جاري الحفظ..." : isDirty ? "حفظ التعديلات 💾" : "التعديلات محفوظة ✓"}</span>
            </Button>

            {/* معاينة المستند (مقفولة إذا كان هناك تعديلات غير محفوظة) */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPreviewModalOpen(true)}
              disabled={isDirty}
              title={isDirty ? "يجب حفظ التعديلات أولاً لتفعيل المعاينة" : "معاينة العرض المالي"}
              className={`h-8.5 px-3 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${
                isDirty ? "opacity-50 cursor-not-allowed bg-muted/40" : "cursor-pointer hover:bg-teal-500/10 text-teal-600 border-teal-500/30"
              }`}
            >
              {isDirty ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5" />}
              <span>معاينة المستند</span>
            </Button>

            {/* تحميل Word */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadDocx}
              disabled={downloadingDocx || isDirty}
              title={isDirty ? "يجب حفظ التعديلات أولاً للتحميل" : "تحميل بصيغة Word"}
              className={`h-8.5 px-3 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${
                isDirty ? "opacity-50 cursor-not-allowed bg-muted/40" : "cursor-pointer hover:bg-blue-500/10 text-blue-600 border-blue-500/30"
              }`}
            >
              <Download className="h-3.5 w-3.5" />
              <span>{downloadingDocx ? "جاري الإنشاء..." : "Word (.docx)"}</span>
            </Button>

            {/* تحميل PDF */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf || isDirty}
              title={isDirty ? "يجب حفظ التعديلات أولاً للتحميل" : "تحميل بصيغة PDF"}
              className={`h-8.5 px-3 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${
                isDirty ? "opacity-50 cursor-not-allowed bg-muted/40" : "cursor-pointer hover:bg-rose-500/10 text-rose-600 border-rose-500/30"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>{downloadingPdf ? "جاري التحويل..." : "PDF (.pdf)"}</span>
            </Button>

            {/* طباعة مباشرة (مقفولة إذا كان هناك تعديل غير محفوظ) */}
            <Button
              size="sm"
              onClick={handleDirectPrint}
              disabled={isDirty}
              title={isDirty ? "يجب حفظ التعديلات أولاً للطباعة" : "طباعة العرض المالي"}
              className={`h-8.5 px-3 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${
                isDirty ? "opacity-50 cursor-not-allowed bg-muted" : "cursor-pointer bg-slate-800 hover:bg-slate-900 text-white"
              }`}
            >
              {isDirty ? <Lock className="h-3.5 w-3.5" /> : <Printer className="h-3.5 w-3.5" />}
              <span>طباعة</span>
            </Button>
          </div>
        }
      >
        {/* شريط الإحصائيات المالية المباشرة */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-2xl bg-muted/30 border border-border/80">
          <div className="p-2.5 rounded-xl bg-card border border-border">
            <span className="text-[10px] text-muted-foreground block font-bold">إجمالي البنود قبل الضريبة</span>
            <span className="text-sm font-black text-foreground font-mono">{formatCurrency(subtotal)}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-card border border-border">
            <span className="text-[10px] text-muted-foreground block font-bold">
              ضريبة القيمة المضافة ({taxCondition.includes("شاملة") && !taxCondition.includes("غير") ? "مشمولة بالسعر" : `${vatRate}%`})
            </span>
            <span className="text-sm font-black text-teal-600 dark:text-teal-400 font-mono">
              {formatCurrency(vatAmount)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-card border border-border">
            <span className="text-[10px] text-muted-foreground block font-bold">الإجمالي النهائي للعرض المالي</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(grandTotal)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-card border border-border">
            <span className="text-[10px] text-muted-foreground block font-bold">حالة التوثيق الرقمي والـ QR</span>
            {cloudPdfUrl ? (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>مرفوع سحابياً برابط مباشر</span>
              </span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUploadCloudPdf}
                disabled={uploadingCloud}
                className="h-6 px-1.5 text-[10px] text-blue-600 hover:text-blue-700 p-0 font-bold cursor-pointer"
              >
                {uploadingCloud ? "جاري الرفع..." : "رفع سحابي للـ QR ☁️"}
              </Button>
            )}
          </div>
        </div>

        {/* ━━━ القسم الأول: بيانات الترويسة والشركة والمرسل إليه ━━━ */}
        <div className="space-y-4 pt-2">
          <h4 className="text-xs font-black text-foreground flex items-center gap-2 pb-1 border-b border-border">
            <Building2 className="h-4 w-4 text-teal-600" />
            <span>بيانات الشركة المصدرة للعرض المالي وجهة الإسناد</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* اختيار الشركة المصدرة - مع تعريب كامل ومنع ظهور أي CUID إنجليزي */}
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-bold text-foreground">الشركة المصدرة للعرض المالي *</Label>
              <Select
                value={selectedCompanyId}
                onValueChange={(val) => {
                  setSelectedCompanyId(val);
                  const matched = op.companies?.find(
                    (c: any) => c.companyId === val || c.id === val
                  );
                  if (matched) {
                    if (matched.company?.commercialRegister) {
                      setCompanyCommercialRegister(matched.company.commercialRegister);
                    }
                    if (matched.company?.taxCard) {
                      setCompanyTaxCard(matched.company.taxCard);
                    }
                    setCompanyOpCode(matched.displayCode || `AZ-0${op.serialNumber || 1}`);
                  }
                }}
              >
                <SelectTrigger className="h-9.5 text-xs font-bold rounded-xl">
                  <SelectValue placeholder="اختر الشركة">
                    {currentCompanyLink?.company?.name
                      ? `${currentCompanyLink.company.name} (${currentCompanyLink.displayCode || ""})`
                      : "اختر الشركة"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="text-xs font-medium">
                  {(op.companies || []).map((oc: any) => {
                    const compVal = oc.companyId || oc.id;
                    return (
                      <SelectItem key={oc.id || compVal} value={compVal} className="text-xs font-bold">
                        {oc.company?.name || "شركة بدون اسم"} {oc.displayCode ? `(${oc.displayCode})` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold">رقم القيد الصادر المعتمد *</Label>
                <button
                  type="button"
                  onClick={handleRegenerateRef}
                  className="text-[10px] text-teal-600 hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  <span>تحديث</span>
                </button>
              </div>
              <Input
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                className="h-9 text-xs font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-bold">تاريخ إصدار العرض المالي *</Label>
              <Input
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">كود العملية بالشركة</Label>
              <Input
                value={companyOpCode}
                onChange={(e) => setCompanyOpCode(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">السجل التجاري</Label>
              <Input
                value={companyCommercialRegister}
                onChange={(e) => setCompanyCommercialRegister(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">البطاقة الضريبية</Label>
              <Input
                value={companyTaxCard}
                onChange={(e) => setCompanyTaxCard(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">المرسل إليه والصفة الوظيفية *</Label>
              <div className="flex gap-2">
                <Input
                  value={recipientPrefix}
                  onChange={(e) => setRecipientPrefix(e.target.value)}
                  placeholder="الأستاذ"
                  className="w-24 h-9 text-xs font-bold text-center"
                />
                <Input
                  value={recipientTitleAndAuthority}
                  onChange={(e) => setRecipientTitleAndAuthority(e.target.value)}
                  placeholder="مدير الادارة العامة للمشتريات والمخازن بـ..."
                  className="flex-1 h-9 text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-bold">الموضوع واسم العملية المسجلة *</Label>
              <Input
                value={operationRegisteredName}
                onChange={(e) => setOperationRegisteredName(e.target.value)}
                placeholder="اسم العملية المسجلة بكراسة الشروط"
                className="h-9 text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">رقم العملية / المناقصة</Label>
              <Input
                value={operationNumber}
                onChange={(e) => setOperationNumber(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">العام المالي</Label>
              <Input
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                className="h-9 text-xs font-mono text-center"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">جلسة فتح المظروف</Label>
              <Input
                value={financialOpeningDate}
                onChange={(e) => setFinancialOpeningDate(e.target.value)}
                className="h-9 text-xs font-mono text-center"
              />
            </div>
          </div>
        </div>

        {/* ━━━ القسم الثاني: جدول الأصناف والأسعار 12 عمود ━━━ */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="text-xs font-black text-foreground flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-teal-600" />
                <span>جدول الأصناف والأسعار والبدائل (12 عمود رسمي)</span>
              </h4>
              <p className="text-[11px] text-muted-foreground">
                يشمل تفقيط سعر الوحدة وسعر الكمية بالقرش والجنيه، مع إمكانية إضافة بدائل تسعير لكل بند
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleImportFromTechnical}
                className="h-8 text-xs font-bold rounded-xl cursor-pointer hover:bg-teal-500/10 text-teal-600 border-teal-500/30 flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>استيراد من العرض الفني</span>
              </Button>

              <Button
                size="sm"
                onClick={handleAddMainItem}
                className="h-8 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>إضافة صنف جديد</span>
              </Button>
            </div>
          </div>

          {/* البنود والبدائل */}
          <div className="space-y-4">
            {items.map((item, itemIdx) => {
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-card border-2 border-border/80 space-y-3 shadow-xs hover:border-teal-500/40 transition-all"
                >
                  {/* رأس الصنف الرئيسي */}
                  <div className="flex items-center justify-between gap-3 pb-2 border-b border-border flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-500/15 text-teal-600 font-black text-xs flex items-center justify-center font-mono">
                        {item.itemNumber}
                      </div>
                      <span className="font-extrabold text-xs text-foreground">
                        بند رقم ({item.itemNumber}):
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAddAlternative(item.id)}
                        className="h-7 px-2 text-[11px] font-bold text-teal-600 hover:bg-teal-500/10 rounded-lg cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        <span>إضافة بديل تسعير</span>
                      </Button>

                      {items.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveMainItem(item.id)}
                          className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                          title="حذف الصنف"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* بيانات الصنف الأساسية (الاسم، الوحدة، الكمية) */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-[10px] font-bold text-muted-foreground">اسم الصنف أساسي *</Label>
                      <Input
                        value={item.itemName}
                        onChange={(e) => handleUpdateItemField(item.id, "itemName", e.target.value)}
                        placeholder="اسم الصنف كما هو مذكور بكراسة الشروط"
                        className="h-8.5 text-xs font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-muted-foreground">الوحدة</Label>
                      <Input
                        value={item.unit}
                        onChange={(e) => handleUpdateItemField(item.id, "unit", e.target.value)}
                        placeholder="عدد / قطعة / متر"
                        className="h-8.5 text-xs text-center"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-muted-foreground">الكمية</Label>
                      <Input
                        value={item.quantity}
                        onChange={(e) => handleUpdateItemField(item.id, "quantity", e.target.value)}
                        placeholder="1"
                        className="h-8.5 text-xs font-mono font-bold text-center"
                      />
                    </div>
                  </div>

                  {/* البدائل ومواصفاتها وأسعارها */}
                  <div className="space-y-2 pt-2">
                    {item.variants.map((v, vIdx) => {
                      const isBasic = v.variantType === "basic";
                      const q = Number(item.quantity || 1);
                      const uPrice = Number(v.unitPrice || 0);
                      const tPrice = Math.round(uPrice * q * 100) / 100;

                      return (
                        <div
                          key={v.id}
                          className={`p-3 rounded-xl border text-xs space-y-2 ${
                            isBasic
                              ? "bg-teal-500/5 border-teal-500/30"
                              : "bg-muted/40 border-border"
                          }`}
                        >
                          <div className="flex items-center justify-between pb-1 border-b border-border/60">
                            <div className="flex items-center gap-2">
                              <Badge
                                className={`text-[10px] font-bold ${
                                  isBasic
                                    ? "bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/40"
                                    : "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30"
                                }`}
                              >
                                {v.variantLabel}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground">
                                {isBasic ? "المواصفة والتسعير الأساسي" : "تسعير ومواصفة بديلة"}
                              </span>
                            </div>

                            {!isBasic && (
                              <button
                                type="button"
                                onClick={() => handleRemoveAlternative(item.id, v.id)}
                                className="text-rose-500 hover:text-rose-700 text-[10px] font-bold cursor-pointer"
                              >
                                حذف البديل ✕
                              </button>
                            )}
                          </div>

                          {/* أعمدة المواصفات الفنية: الوصف، الفرعي، فرعي 1 */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="space-y-0.5">
                              <Label className="text-[10px] text-muted-foreground">الوصف</Label>
                              <Input
                                value={v.description}
                                onChange={(e) => handleUpdateVariantField(item.id, v.id, "description", e.target.value)}
                                placeholder="الماركة والمواصفات"
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <Label className="text-[10px] text-muted-foreground">الوصف الفرعي</Label>
                              <Input
                                value={v.subDescription}
                                onChange={(e) => handleUpdateVariantField(item.id, v.id, "subDescription", e.target.value)}
                                placeholder="المقاس / الجهد / السعة"
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <Label className="text-[10px] text-muted-foreground">فرعي 1</Label>
                              <Input
                                value={v.branch1}
                                onChange={(e) => handleUpdateVariantField(item.id, v.id, "branch1", e.target.value)}
                                placeholder="بلد المنشأ / الطراز"
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>

                          {/* أعمدة التسعير: سعر الوحدة، إجمالي الكمية، ملاحظات */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-bold text-teal-700 dark:text-teal-300">
                                  سعر الوحدة (جنيه) *
                                </Label>
                                <span className="text-[9px] font-mono text-muted-foreground">
                                  {Math.floor(uPrice)} ج • {Math.round((uPrice - Math.floor(uPrice)) * 100)} ق
                                </span>
                              </div>
                              <Input
                                type="number"
                                step="0.01"
                                value={v.unitPrice || ""}
                                onChange={(e) => handleUpdateVariantField(item.id, v.id, "unitPrice", parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className="h-8 text-xs font-mono font-bold text-teal-600 dark:text-teal-400"
                              />
                            </div>

                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                  سعر الكمية الإجمالي
                                </Label>
                                <span className="text-[9px] font-mono text-muted-foreground">
                                  {Math.floor(tPrice)} ج • {Math.round((tPrice - Math.floor(tPrice)) * 100)} ق
                                </span>
                              </div>
                              <Input
                                value={formatCurrency(tPrice)}
                                disabled
                                className="h-8 text-xs font-mono font-black bg-muted/60 text-emerald-600 dark:text-emerald-400 cursor-not-allowed"
                              />
                            </div>

                            <div className="space-y-0.5">
                              <Label className="text-[10px] text-muted-foreground">ملاحظات البند</Label>
                              <Input
                                value={v.notes}
                                onChange={(e) => handleUpdateVariantField(item.id, v.id, "notes", e.target.value)}
                                placeholder="شامل التوريد والضمان..."
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* صف الإجمالي والتفقيط وحالة الضريبة */}
          <div className="p-4 rounded-2xl bg-teal-500/10 border-2 border-teal-500/30 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">حالة ضريبة القيمة المضافة *</Label>
                <Select value={taxCondition} onValueChange={setTaxCondition}>
                  <SelectTrigger className="h-9 text-xs font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="الأسعار شاملة ضريبة القيمة المضافه">
                      الأسعار شاملة ضريبة القيمة المضافه
                    </SelectItem>
                    <SelectItem value="الأسعار غير شاملة ضريبة القيمة المضافه">
                      الأسعار غير شاملة ضريبة القيمة المضافه
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold">نسبة ضريبة القيمة المضافة (%)</Label>
                <Input
                  type="number"
                  value={vatRate}
                  onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                  disabled={taxCondition.includes("شاملة") && !taxCondition.includes("غير")}
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  الإجمالي النهائي المعتمد
                </Label>
                <div className="h-9 px-3 rounded-xl bg-card border border-emerald-500/40 flex items-center justify-between text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                  <span>{formatCurrency(grandTotal)}</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {Math.floor(grandTotal)} جنيه • {Math.round((grandTotal - Math.floor(grandTotal)) * 100)} قرش
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card border border-teal-500/30 text-xs">
              <span className="font-extrabold text-foreground ml-1">التفقيط الرسمي للجدول:</span>
              <span className="font-bold text-teal-700 dark:text-teal-300">
                {tafqeetText.startsWith("فقط وقدره") ? tafqeetText : `فقط وقدره : ${tafqeetText} لا غير.`}
              </span>
            </div>
          </div>
        </div>

        {/* ━━━ القسم الثالث: مدة الضمان والشروط والإيضاحات الهامة ━━━ */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h4 className="text-xs font-black text-foreground flex items-center gap-2 pb-1 border-b border-border">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            <span>مدة الضمان والشروط والملاحظات والإيضاحات الهامة</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">مدة الضمان *</Label>
              <Input
                value={warrantyDuration}
                onChange={(e) => setWarrantyDuration(e.target.value)}
                placeholder="سنة"
                className="h-9 text-xs font-bold text-center"
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-[11px] font-bold">شروط وتغطية الضمان *</Label>
              <Input
                value={warrantyTerms}
                onChange={(e) => setWarrantyTerms(e.target.value)}
                placeholder="ضد عيوب الصناعه في مداس الكاوتش فقط"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">1. مكان وطريقة التوريد والنقل</Label>
              <Input
                value={condition1}
                onChange={(e) => setCondition1(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">2. شرط تغير أسعار المحروقات الرسمية</Label>
              <Input
                value={condition2}
                onChange={(e) => setCondition2(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">3. مدة سريان والارتباط بالأسعار</Label>
              <Input
                value={condition3}
                onChange={(e) => setCondition3(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">4. اشتراطات فنية خاصة إضافية</Label>
              <Input
                value={condition4}
                onChange={(e) => setCondition4(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* ━━━ القسم الرابع: الاعتمادات والتوقيعات ━━━ */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h4 className="text-xs font-black text-foreground flex items-center gap-2 pb-1 border-b border-border">
            <FileCheck className="h-4 w-4 text-teal-600" />
            <span>الاعتمادات والتوقيعات الرسمية بالتذييل</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">المهندس المختص</Label>
              <div className="flex gap-1.5">
                <Input
                  value={specialistTitle}
                  onChange={(e) => setSpecialistTitle(e.target.value)}
                  className="w-24 h-9 text-xs text-center"
                />
                <Input
                  value={specialistName}
                  onChange={(e) => setSpecialistName(e.target.value)}
                  className="flex-1 h-9 text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-bold">المدير المالي</Label>
              <Input
                value={financeManagerName}
                onChange={(e) => setFinanceManagerName(e.target.value)}
                placeholder="اسم المدير المالي"
                className="h-9 text-xs font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-bold">اعتماد رئيس مجلس الإدارة</Label>
              <Input
                value={boardChairman}
                onChange={(e) => setBoardChairman(e.target.value)}
                className="h-9 text-xs font-bold text-center"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ━━━ MODAL: معاينة المستند الرسمي المعتمد (قالب الوورد الأصلي) ━━━ */}
      {previewModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
            <div className="bg-card w-full max-w-6xl h-[94vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between flex-wrap gap-3 bg-muted/40">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shadow-xs">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-foreground">
                        معاينة المستند الرسمي المعتمد (قالب الوورد الأصلي)
                      </h3>
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                        توليد حي من قالب Word المعتمد ✓
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      عرض صفحات مستند الوورد كما تطبع وتعتمد تماماً مع الباركود الرقمي وجدول الأسعار والتفقيط بدقة 100%
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={handlePrintWordDocument}
                    disabled={printingDocx}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-9 px-4 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className={`h-4 w-4 ${printingDocx ? "animate-spin" : ""}`} />
                    <span>{printingDocx ? "جاري التجهيز..." : "طباعة مستند الوورد"}</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadDocx}
                    disabled={downloadingDocx}
                    className="text-xs font-bold h-9 rounded-xl border-border hover:bg-muted cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="h-4 w-4 text-blue-600" />
                    <span>{downloadingDocx ? "جاري التوليد..." : "تنزيل ملف Word (.docx)"}</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-9 px-3.5 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <FileText className={`h-4 w-4 ${downloadingPdf ? "animate-spin" : ""}`} />
                    <span>{downloadingPdf ? "جاري التحويل..." : "تحميل PDF"}</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={loadOfficialPreview}
                    disabled={renderingDocx}
                    className="text-xs font-bold h-9 rounded-xl border border-border hover:bg-muted cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${renderingDocx ? "animate-spin text-amber-600" : ""}`} />
                    <span>تحديث</span>
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setPreviewModalOpen(false)}
                    className="h-8.5 w-8.5 rounded-full hover:bg-muted cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* View: Authentic Microsoft Word Workspace View */}
              <div className="flex-1 overflow-hidden p-2 sm:p-4 bg-slate-200 dark:bg-slate-950 rounded-2xl flex flex-col items-center justify-start min-h-[640px] overflow-y-auto">
                <div className="mb-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 self-stretch">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    تم تطبيق المتغيرات والمواصفات والبدائل واستبدال الباركود الرقمي وإزالة كافة علامات التمييز الحمراء لإنتاج مستند وورد معتمد ورسمي 100%.
                  </span>
                </div>

                {renderingDocx ? (
                  <div className="my-auto py-28 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-lg">
                      <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-foreground">جاري فتح ومعالجة قالب الوورد الأصلي...</h4>
                      <p className="text-xs text-muted-foreground">
                        يقوم محرك Microsoft Word بتطبيق المتغيرات وإنتاج صفحات المستند كما تطبع بدقة متناهية
                      </p>
                    </div>
                  </div>
                ) : previewPdfUrl ? (
                  <div className="w-full max-w-[850px] min-h-[650px] bg-white rounded-md shadow-2xl border border-slate-300 dark:border-slate-800 overflow-hidden flex flex-col my-auto">
                    <iframe
                      src={`${previewPdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                      className="w-full min-h-[650px] flex-1 border-0"
                      title="معاينة صفحات مستند الوورد"
                    />
                  </div>
                ) : (
                  <div className="my-auto py-20 text-center text-slate-400 space-y-3">
                    <AlertCircle className="h-10 w-10 mx-auto text-amber-500" />
                    <p className="text-sm">تعذر تحميل المعاينة تلقائياً</p>
                    <Button size="sm" onClick={loadOfficialPreview} className="bg-teal-600 text-white">
                      إعادة المحاولة
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* شريط التنقل السفلي */}
      <StepFooterNav
        currentTabId="financial"
        onNavigate={onNavigate}
        nextLabel="الانتقال إلى: #8 مستندات التقديم وحزم المظاريف ➔"
        prevLabel="← العرض الفني والمواصفات"
      />
    </div>
  );
}
