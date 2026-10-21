"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ClipboardCheck, Sparkles, CheckCircle2, FileCheck, Check, Printer, Download, Eye,
  Plus, Trash2, X, FileText, AlertCircle, RefreshCw, Building2, Calendar, Hash,
  Layers, ShieldCheck, FileSpreadsheet, ChevronDown, ChevronUp, Copy, SlidersHorizontal,
  Paperclip, ArrowRight, QrCode, Cloud, Globe, ExternalLink, RotateCcw, Save, Lock
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
import { Operation, SectionCard, formatDate } from "./types";
import { StepFooterNav } from "./StepFooterNav";
import {
  generateSmartOutgoingRef,
  cleanAllDocxXml,
  buildQrAnchorXml,
  injectSingleQrIntoDocXml,
  LetterBottomActionWidget,
  ReprintConfirmModal,
  getCurrentUserName,
  PrintHistoryEntry,
  FISCAL_YEAR_OPTIONS,
  LetterQrCloudCard,
  PdfExportLoadingModal,
  getUnifiedOperationRegistrationNumber,
  regenerateUnifiedRegistrationNumber,
  FiscalYearSelect,
  replaceDocxFiscalAndDate,
  replaceDocxChairman,
  sanitizeChairmanTitle,
  getOperationRecipientTitle,
  getOperationFiscalYear,
  getOperationTechnicalOpeningDate,
  getOperationTenderMethod,
  getSharedOperationScope,
} from "./letter-utils";
import JSZip from "jszip";
import QRCode from "qrcode";
import { getPdfBlobFromDocx, uploadPdfToFreeCloud } from "./client-pdf";
import { OnlyOfficeDocViewer } from "@/components/OnlyOfficeDocViewer";

// ━━━ تعريف بيانات البدائل والمواصفات الفنية ━━━
export interface TechnicalVariant {
  id: string;
  variantType: "basic" | "alternative"; // أساسي أو بديل
  variantLabel: string;                 // مسمى البديل مثل: أساسي، بديل 1، بديل 2
  description: string;                  // الوصف الفني
  subDescription: string;               // الوصف الفرعى
  branch1: string;                      // فرعى 1
  notes: string;                        // ملاحظات
}

export interface TechnicalOfferItem {
  id: string;
  itemNumber: number;                   // م
  itemName: string;                     // اسم الصنف
  unit: string;                         // الوحدة (قطعة، عدد، متر...)
  quantity: string;                     // الكمية
  variants: TechnicalVariant[];         // قائمة المواصفة الأساسية والبدائل (بديل 1، 2، 3...)
}

function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// بناء صفوف جدول العرض الفني في الوورد بدقة هندسية وتوافق كامل مع Microsoft Word
function buildTechnicalTableRowsXml(itemsList: TechnicalOfferItem[]): string {
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
          notes: ""
        }];

    const nVariants = variants.length;
    const isSingle = nVariants === 1;

    variants.forEach((variant, vIdx) => {
      const isFirst = vIdx === 0;
      const isLast = vIdx === nVariants - 1;

      const trHeight = isFirst ? 165 : 90;
      const trPr = `<w:trPr><w:trHeight w:val="${trHeight}"/><w:jc w:val="center"/></w:trPr>`;

      // دالة بناء خلية الجدول مع معالجة vMerge والحدود والتنسيق
      const makeCell = (
        width: number,
        content: string,
        isMergedCol: boolean,
        align: "center" | "right" = "center"
      ) => {
        let vMergeStr = "";
        if (isMergedCol) {
          if (!isSingle) {
            vMergeStr = isFirst ? '<w:vMerge w:val="restart"/>' : '<w:vMerge/>';
          }
        }

        // إعداد حدود الخلية بدقة
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

        // نص الخلية
        let textXml = "";
        if (!isMergedCol || isFirst) {
          if (content) {
            textXml = `<w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(content)}</w:t></w:r>`;
          }
        }

        return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${vMergeStr}<w:tcBorders>${borderStr}</w:tcBorders></w:tcPr><w:p><w:pPr><w:spacing w:before="40" w:after="40" w:line="280" w:lineRule="auto"/><w:jc w:val="${align}"/><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr>${textXml}</w:p></w:tc>`;
      };

      const c0 = makeCell(576, String(itemIdx + 1), true, "center");
      const c1 = makeCell(3240, item.itemName, true, "right");
      const c2 = makeCell(1530, variant.description, false, "right");
      const c3 = makeCell(1204, variant.subDescription, false, "right");
      const c4 = makeCell(983, variant.branch1, false, "right");
      const c5 = makeCell(845, item.unit, true, "center");
      const c6 = makeCell(982, item.quantity, true, "center");
      const c7 = makeCell(1026, variant.notes, false, "right");

      rowsXml += `<w:tr>${trPr}${c0}${c1}${c2}${c3}${c4}${c5}${c6}${c7}</w:tr>`;
    });
  });

  return rowsXml;
}

export function TabTechnical({
  op,
  onRefresh,
  onNavigate,
  onOpenSmartCover,
}: {
  op: Operation;
  onRefresh: () => void;
  onNavigate: (tabId: string) => void;
  onOpenSmartCover?: () => void;
}) {
  // ━━━ قراءة البيانات المحفوظة مسبقاً من notes العملية إن وجدت ━━━
  const savedTech = useMemo(() => {
    try {
      if (op.notes && op.notes.startsWith("{")) {
        const parsed = JSON.parse(op.notes);
        return parsed.technicalOfferDocx || null;
      }
    } catch {}
    return null;
  }, [op.notes]);

  // ━━━ 1. الشركة المصدرة للعرض الفني وبيانات الترويسة ━━━
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => {
    return savedTech?.selectedCompanyId || op.companies?.[0]?.companyId || op.companies?.[0]?.id || "";
  });

  const currentCompanyLink = useMemo(() => {
    return (
      op.companies?.find(
        (c: any) => c.companyId === selectedCompanyId || c.id === selectedCompanyId
      ) || op.companies?.[0]
    );
  }, [op.companies, selectedCompanyId]);

  const currentCompany = currentCompanyLink?.company;

  // رقم القيد الصادر الذكي الموحد للعملية
  const [registrationNumber, setRegistrationNumber] = useState(() => {
    if (savedTech?.registrationNumber) return savedTech.registrationNumber;
    return getUnifiedOperationRegistrationNumber(op, currentCompanyLink?.displayCode);
  });

  // كود العملية بالشركة
  const [companyOpCode, setCompanyOpCode] = useState(() => {
    return (
      savedTech?.companyOpCode ||
      currentCompanyLink?.displayCode ||
      `AZ-0${op.serialNumber || 1}`
    );
  });

  // السجل التجاري والبطاقة الضريبية
  const [companyCommercialRegister, setCompanyCommercialRegister] = useState(() => {
    return savedTech?.companyCommercialRegister || currentCompany?.commercialRegister || "110200700036620";
  });
  const [companyTaxCard, setCompanyTaxCard] = useState(() => {
    return savedTech?.companyTaxCard || currentCompany?.taxCard || "658369652";
  });

  // وسائل الاتصال والعنوان بالتذييل
  const [phoneWhatsapp, setPhoneWhatsapp] = useState(() => {
    return savedTech?.phoneWhatsapp || currentCompany?.phone || "01091708818";
  });
  const [phoneMobile, setPhoneMobile] = useState(() => {
    return savedTech?.phoneMobile || "01557018818";
  });
  const [companyAddress, setCompanyAddress] = useState(() => {
    return savedTech?.companyAddress || currentCompany?.address || "بجوار مستشفى ليدى كير  -  بدمنهور -  البحيره";
  });
  const [issueDate, setIssueDate] = useState(() => {
    return savedTech?.issueDate || new Date().toLocaleDateString("en-GB");
  });
  const [barcodeRef, setBarcodeRef] = useState(() => {
    return savedTech?.barcodeRef || `GS-TECH-${op.serialNumber || "365"}`;
  });

  // الرابط السحابي المعتمد للنسخة الرقمية (Catbox.moe / Tmpfile / Gofile)
  const [cloudPdfUrl, setCloudPdfUrl] = useState<string>(() => {
    const url = savedTech?.cloudPdfUrl || "";
    if (
      url &&
      (url.startsWith("http://") || url.startsWith("https://")) &&
      !url.includes("public-doc") &&
      !url.includes("17a9mx.pdf")
    ) {
      return url;
    }
    return "";
  });
  const [uploadingCloud, setUploadingCloud] = useState(false);

  // ━━━ 2. جهة الإسناد وبيانات العملية في الموضوع ━━━
  const [recipientPrefix, setRecipientPrefix] = useState(() => {
    return savedTech?.recipientPrefix || "الأستاذ";
  });
  const [recipientTitleAndAuthority, setRecipientTitleAndAuthority] = useState(() => {
    return getOperationRecipientTitle(op, savedTech?.recipientTitleAndAuthority);
  });

  const [subjectTarget, setSubjectTarget] = useState(() => {
    return savedTech?.subjectTarget || "للأصناف";
  });
  const [operationRegisteredName, setOperationRegisteredName] = useState(() => {
    return savedTech?.operationRegisteredName || op.name || "";
  });
  const [operationNumber, setOperationNumber] = useState(() => {
    return savedTech?.operationNumber || op.externalNumber || (op.serialNumber ? String(op.serialNumber) : "") || "";
  });
  const [fiscalYear, setFiscalYear] = useState(() => {
    return getOperationFiscalYear(op, savedTech?.fiscalYear);
  });
  const [technicalOpeningDate, setTechnicalOpeningDate] = useState(() => {
    return getOperationTechnicalOpeningDate(op, savedTech?.technicalOpeningDate);
  });

  // مزامنة تلقائية للبيانات إذا تغيرت العملية الأصلية دون وجود تعديل يدوي محفوظ
  useEffect(() => {
    if (!savedTech?.operationRegisteredName && op.name) {
      setOperationRegisteredName(op.name);
    }
    if (!savedTech?.operationNumber && (op.externalNumber || op.serialNumber)) {
      setOperationNumber(op.externalNumber || String(op.serialNumber));
    }
    if (!savedTech?.recipientTitleAndAuthority && op.authority) {
      setRecipientTitleAndAuthority(`مدير الادارة العامة للمشتريات والمخازن بـ ${op.authority}`);
    }
    if (!savedTech?.technicalOpeningDate) {
      const d = op.dates?.find((dt: any) => dt.type === "TECHNICAL_OPENING" || dt.title?.includes("فني"));
      if (d?.dateValue) setTechnicalOpeningDate(formatDate(d.dateValue));
      else if (d?.date) setTechnicalOpeningDate(formatDate(d.date));
    }
  }, [op.name, op.externalNumber, op.serialNumber, op.authority, op.dates, savedTech]);

  // ━━━ 3. جدول الأصناف والمواصفات الفنية والبدائل ━━━
  const [items, setItems] = useState<TechnicalOfferItem[]>(() => {
    if (savedTech?.items && savedTech.items.length > 0) {
      return savedTech.items;
    }
    // بنود افتراضية توضيحية مطابقة لقالب الوورد تماماً
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
            notes: "شامل البلف والشريط والشنبر",
          },
          {
            id: "v-1-2",
            variantType: "alternative",
            variantLabel: "بديل 1",
            description: "إطارات ماركة بريدجستون ياباني إنتاج 2026",
            subDescription: "حمولة 18PR سرعة L",
            branch1: "نقشة خطوط طولية",
            notes: "بديل رقم 1 مطابق بالكامل للكراسة",
          },
          {
            id: "v-1-3",
            variantType: "alternative",
            variantLabel: "بديل 2",
            description: "إطارات ماركة هانكوك كوري إنتاج 2026",
            subDescription: "حمولة 16PR سرعة J",
            branch1: "نقشة طريق سريع",
            notes: "بديل رقم 2 معتمد ومطابق",
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
            notes: "ضمان 18 شهر ضد عيوب الصناعة",
          },
        ],
      },
    ];
  });

  // ━━━ 4. مدة الضمان والشروط والإيضاحات الهامة ━━━
  const [warrantyDuration, setWarrantyDuration] = useState(() => {
    return savedTech?.warrantyDuration || "سنة";
  });
  const [warrantyTerms, setWarrantyTerms] = useState(() => {
    return savedTech?.warrantyTerms || "ضد عيوب الصناعه في مداس الكاوتش  فقط";
  });

  const [condition1, setCondition1] = useState(() => {
    return savedTech?.condition1 || "التوريد مخازن الشركة والنقل على حساب الشركة بالسيارات المخصصه";
  });
  const [condition2, setCondition2] = useState(() => {
    return savedTech?.condition2 || "في حالة تغير الأسعار للمحروقات بقرار مجلس الوزراء يتم رفع السعر بالنسبة المقررة قانونا وفى حينه من تاريخ اعلان الزيادة الرسمى";
  });
  const [condition3, setCondition3] = useState(() => {
    return savedTech?.condition3 || "الارتباط بالأسعار تسعون يوما من تاريخ الفتح الفنى";
  });
  const [condition4, setCondition4] = useState(() => {
    return savedTech?.condition4 || "زيادة ضغط الهواء بالاطارات";
  });

  // ━━━ 5. الاعتمادات والتوقيعات ━━━
  const [specialistTitle, setSpecialistTitle] = useState(() => {
    return savedTech?.specialistTitle || "المهندس المختص :";
  });
  const [specialistName, setSpecialistName] = useState(() => {
    return savedTech?.specialistName || "أحمد محمد";
  });
  const [financeManagerName, setFinanceManagerName] = useState(() => {
    return savedTech?.financeManagerName || "محمود إبراهيم";
  });
  const [boardChairman, setBoardChairman] = useState(() => {
    return sanitizeChairmanTitle(savedTech?.boardChairman);
  });

  // Modals & Document state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDocxBlob, setPreviewDocxBlob] = useState<Blob | null>(null);
  const [previewPdfBlob, setPreviewPdfBlob] = useState<Blob | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [renderingDocx, setRenderingDocx] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [printingDocx, setPrintingDocx] = useState(false);
  const [savingOffer, setSavingOffer] = useState(false);
  const [lastGeneratedSnapshot, setLastGeneratedSnapshot] = useState<string | null>(null);

  // ━━━ تتبع حالة التعديل والحفظ (isDirty control) ━━━
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
      technicalOpeningDate,
      items,
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
    operationRegisteredName, operationNumber, fiscalYear, technicalOpeningDate, items,
    warrantyDuration, warrantyTerms, condition1, condition2, condition3, condition4,
    specialistTitle, specialistName, financeManagerName, boardChairman,
  ]);

  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => currentSnapshot);
  const isDirty = useMemo(() => currentSnapshot !== savedSnapshot, [currentSnapshot, savedSnapshot]);

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
      setTechnicalOpeningDate(snap.technicalOpeningDate);
      setItems(snap.items);
      setWarrantyDuration(snap.warrantyDuration);
      setWarrantyTerms(snap.warrantyTerms);
      setCondition1(snap.condition1);
      setCondition2(snap.condition2);
      setCondition3(snap.condition3);
      setCondition4(snap.condition4);
      setSpecialistTitle(snap.specialistTitle);
      setSpecialistName(snap.specialistName);
      setFinanceManagerName(snap.financeManagerName);
      setBoardChairman(sanitizeChairmanTitle(snap.boardChairman));
      toast.info("تم التراجع عن التعديلات وإعادة النموذج للحالة السابقة ↺");
    } catch {
      toast.error("تعذر التراجع عن التعديلات");
    }
  };



  // إدارة عناصر الجدول
  const handleAddMainItem = () => {
    const nextIdx = items.length + 1;
    const newItem: TechnicalOfferItem = {
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
          notes: "",
        },
      ],
    };
    setItems([...items, newItem]);
    toast.success(`تمت إضافة الصنف رقم (${nextIdx}) بنجاح`);
  };

  const handleRemoveMainItem = (itemId: string) => {
    if (items.length <= 1) {
      toast.warning("يجب أن يحتوي العرض الفني على صنف واحد على الأقل");
      return;
    }
    const updated = items.filter((i) => i.id !== itemId).map((item, idx) => ({
      ...item,
      itemNumber: idx + 1,
    }));
    setItems(updated);
  };

  const handleUpdateItemField = (itemId: string, field: keyof TechnicalOfferItem, val: any) => {
    setItems(items.map((i) => (i.id === itemId ? { ...i, [field]: val } : i)));
  };

  const handleAddAlternative = (itemId: string) => {
    setItems(
      items.map((item) => {
        if (item.id !== itemId) return item;
        const currentAlts = item.variants.filter((v) => v.variantType === "alternative");
        const nextAltNum = currentAlts.length + 1;
        const newVariant: TechnicalVariant = {
          id: "v-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5),
          variantType: "alternative",
          variantLabel: `بديل ${nextAltNum}`,
          description: "",
          subDescription: "",
          branch1: "",
          notes: `بديل رقم ${nextAltNum} مطابق للمواصفات`,
        };
        return {
          ...item,
          variants: [...item.variants, newVariant],
        };
      })
    );
    toast.success("تمت إضافة بديل جديد للصنف بنجاح ✨");
  };

  const handleRemoveAlternative = (itemId: string, variantId: string) => {
    setItems(
      items.map((item) => {
        if (item.id !== itemId) return item;
        const remaining = item.variants.filter((v) => v.id !== variantId);
        // إعادة ترقيم البدائل
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
    field: keyof TechnicalVariant,
    val: string
  ) => {
    setItems(
      items.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          variants: item.variants.map((v) =>
            v.id === variantId ? { ...v, [field]: val } : v
          ),
        };
      })
    );
  };

  // استيراد الأصناف من جدول الكميات / العرض المالي إن وجد
  const handleImportFromFinancial = () => {
    const finOffer = op.financialOffers?.[0];
    if (!finOffer || !finOffer.items || finOffer.items.length === 0) {
      toast.info("لا توجد بنود مسجلة في جدول الكميات المالي بعد للاستيراد");
      return;
    }

    const imported: TechnicalOfferItem[] = finOffer.items.map((fi: any, idx: number) => ({
      id: "imported-" + (fi.id || idx),
      itemNumber: idx + 1,
      itemName: fi.itemName || `بند رقم (${idx + 1})`,
      unit: fi.unit || "عدد",
      quantity: String(fi.quantity || "1"),
      variants: [
        {
          id: "v-imp-" + idx,
          variantType: "basic",
          variantLabel: "أساسى",
          description: fi.description || "",
          subDescription: "",
          branch1: "",
          notes: "مطابق لكراسة الشروط والمواصفات",
        },
      ],
    }));

    setItems(imported);
    toast.success(`تم استيراد ${imported.length} أصناف بنجاح من جدول الكميات! 🚀`);
  };

  // إعادة توليد رقم القيد
  const handleRegenerateRef = async () => {
    await regenerateUnifiedRegistrationNumber({
      op,
      companyCode: currentCompanyLink?.displayCode || "AZ",
      onSuccess: (fresh) => {
        setRegistrationNumber(fresh);
        onRefresh();
      },
    });
  };

  // ━━━ محرك استبدال المتغيرات مباشرة في قالب الوورد الأصلي (عرض فنى.docx) ━━━
  const generateTechnicalDocxBlob = async (): Promise<Blob> => {
    const response = await fetch("/templates/technical_offer_template.docx");
    if (!response.ok) throw new Error("فشل قراءة قالب الوورد الأصلي من الخادم");
    const templateBuffer = await response.arrayBuffer();

    const zip = await JSZip.loadAsync(templateBuffer);

    // توليد رمز التحقق الرقمي والباركود للنسخة الرقمية
    let qrDrawingXml = "";
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "https://goldenerp-tau.vercel.app";
      let targetVerifyUrl = `${origin}/verify-doc?ref=${encodeURIComponent(registrationNumber)}&opId=${op.id}&type=technical&printedBy=${encodeURIComponent(getCurrentUserName())}&printedAt=${Date.now()}`;
      if (cloudPdfUrl && (cloudPdfUrl.startsWith("http://") || cloudPdfUrl.startsWith("https://")) && !cloudPdfUrl.includes("public-doc")) {
        targetVerifyUrl = cloudPdfUrl;
      }
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

      qrDrawingXml = buildQrAnchorXml();
    } catch (e) {
      console.warn("QR generation failed:", e);
    }

    // 1. استبدال كافة المتغيرات في word/document.xml
    let docXml = await zip.file("word/document.xml")!.async("text");
    docXml = injectSingleQrIntoDocXml(docXml, qrDrawingXml, escapeXml(registrationNumber));

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

    // العام المالي وموعد فتح المظروف الفني
    docXml = replaceDocxFiscalAndDate(docXml, fiscalYear, technicalOpeningDate);

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
    docXml = docXml.replace(
      /زيادة ضغط الهواء بالاطارات/g,
      escapeXml(condition4)
    );

    // الاعتمادات والتوقيعات
    docXml = docXml.replace(/المهندس\s*المختص\s*:/g, escapeXml(specialistTitle));
    docXml = docXml.replace(/أحمد محمد/g, escapeXml(specialistName));
    docXml = docXml.replace(/أو اسم/g, escapeXml(financeManagerName || " "));

    // اعتماد رئيس مجلس الإدارة مع الحفاظ التام على "يعتمد ،،،،،،" في سطرها المستقل
    docXml = replaceDocxChairman(docXml, boardChairman);

    // استبدال جدول الأصناف والمواصفات الفنية بالكامل (Table 0)
    const tblStart = docXml.indexOf("<w:tbl>");
    const tblEnd = docXml.indexOf("</w:tbl>") + 8;
    if (tblStart !== -1 && tblEnd !== -1) {
      const tblXml = docXml.substring(tblStart, tblEnd);
      const headerEnd = tblXml.indexOf("</w:tr>") + 7;
      const tableHeaderPart = tblXml.substring(0, headerEnd);

      const newRowsXml = buildTechnicalTableRowsXml(items);
      const newTblXml = tableHeaderPart + newRowsXml + "</w:tbl>";
      docXml = docXml.substring(0, tblStart) + newTblXml + docXml.substring(tblEnd);
    }

    // إزالة كافة التمييز بالألوان (Highlight الأحمر والأصفر) ليخرج المستند رسمي 100%
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
      
      // استبدال رقم القيد بالتذييل بالكامل
      if (ftrXml.includes("رقم القيد")) {
        ftrXml = ftrXml.replace(/رقم القيد/g, `رقم القيد : ${escapeXml(registrationNumber)}`);
      }
      ftrXml = ftrXml.replace(/\(\s*باركود المستند أو العمليه/g, `رقم القيد : ${escapeXml(registrationNumber)}`);
      ftrXml = ftrXml.replace(/01091708818/g, escapeXml(phoneWhatsapp));
      ftrXml = ftrXml.replace(/01557018818/g, escapeXml(phoneMobile));
      ftrXml = ftrXml.replace(/بجوار مستشفى ليدى كير\s*-\s*بدمنهور\s*-\s*البح\s*يره/g, escapeXml(companyAddress));
      ftrXml = ftrXml.replace(/بجوار مستشفى ليدى كير\s*-\s*بدمنهور\s*-\s*البحيره/g, escapeXml(companyAddress));
      ftrXml = ftrXml.replace(/<w:highlight\s+[^>]*\/>/g, "");
      ftrXml = ftrXml.replace(/<w:color\s+w:val=\"(red|FF0000)\"[^>]*\/>/g, "");
      zip.file("word/footer1.xml", ftrXml);
    }

    // إزالة كافة علامات التحديد الأحمر والعلامات المائية والصور التالفة
    await cleanAllDocxXml(zip);

    return await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  };

  // ━━━ تحويل المستند الأصلي إلى PDF ذكي وفوري ━━━
  const generateTechnicalPdfBlob = async (): Promise<Blob> => {
    const docxBlob = await generateTechnicalDocxBlob();
    setPreviewDocxBlob(docxBlob);
    const pdf = await getPdfBlobFromDocx(
      docxBlob,
      `technical_offer_${registrationNumber || op.serialNumber}.docx`
    );
    setPreviewPdfBlob(pdf);
    return pdf;
  };

  // ━━━ رفع وتوثيق النسخة الرقمية المعتمدة سحابياً (رابط PDF مباشر) ━━━
  const handleUploadToCloud = async (forceReupload = false, existingBlob?: Blob) => {
    if (cloudPdfUrl && !cloudPdfUrl.includes("tmpfiles.org") && !cloudPdfUrl.includes("gofile.io") && !forceReupload) {
      toast.info("تم رفع وتوثيق النسخة الرقمية سحابياً مسبقاً وهي نشطة بالفعل ✓");
      return;
    }

    setUploadingCloud(true);
    try {
      let pdfBlob = existingBlob;
      if (!pdfBlob) {
        if (previewPdfBlob && currentSnapshot === lastGeneratedSnapshot) {
          pdfBlob = previewPdfBlob;
        } else {
          pdfBlob = await generateTechnicalPdfBlob();
          setPreviewPdfBlob(pdfBlob);
          setLastGeneratedSnapshot(currentSnapshot);
        }
      }

      toast.info("جاري توثيق ورفع العرض الفني سحابياً (رابط PDF مباشر)...");
      const res = await uploadPdfToFreeCloud(
        pdfBlob,
        `technical_offer_${registrationNumber || op.serialNumber || "doc"}.pdf`
      );

      if (res?.url) {
        setCloudPdfUrl(res.url);
        toast.success("تم توثيق ورفع العرض الفني للسحابة بنجاح! الرابط جاهز ومتاح عالمياً لأي هاتف محمول 🚀");

        // حفظ الرابط السحابي في notes العملية تلقائياً لمنع التكرار
        try {
          let existingNotesObj: any = {};
          if (op.notes && op.notes.startsWith("{")) existingNotesObj = JSON.parse(op.notes);
          else if (op.notes) existingNotesObj = { textNotes: op.notes };
          if (!existingNotesObj.technicalOfferDocx) existingNotesObj.technicalOfferDocx = {};
          existingNotesObj.technicalOfferDocx.cloudPdfUrl = res.url;
          existingNotesObj.technicalOfferDocx.uploadedAt = new Date().toISOString();
          await api.patch(`/operations/${op.id}`, { notes: JSON.stringify(existingNotesObj) });
        } catch (e) {
          console.warn("Failed to auto-save cloud url:", e);
        }
      }
    } catch (err: any) {
      if (forceReupload) {
        toast.error("فشل الرفع السحابي: " + (err?.response?.data?.message || err?.message || ""));
      }
    } finally {
      setUploadingCloud(false);
    }
  };

  // تحميل المعاينة الرسمية من محرك Word الأصيل
  const loadOfficialPreview = async () => {
    if (previewPdfBlob && currentSnapshot === lastGeneratedSnapshot) {
      return;
    }

    setRenderingDocx(true);
    try {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
        setPreviewPdfUrl(null);
      }
      const docx = await generateTechnicalDocxBlob();
      setPreviewDocxBlob(docx);

      const pdfBlob = await getPdfBlobFromDocx(
        docx,
        `technical_offer_${registrationNumber || op.serialNumber}.docx`
      );
      setPreviewPdfBlob(pdfBlob);
      const url = URL.createObjectURL(pdfBlob);
      setPreviewPdfUrl(url);

      if (!cloudPdfUrl || cloudPdfUrl.includes("tmpfiles.org") || cloudPdfUrl.includes("gofile.io")) {
        handleUploadToCloud(false, pdfBlob);
      }
      setLastGeneratedSnapshot(currentSnapshot);
    } catch (err: any) {
      console.error("فشل تجهيز معاينة العرض الفني:", err);
      toast.error("تعذر تجهيز المعاينة: " + (err?.message || ""));
    } finally {
      setRenderingDocx(false);
    }
  };

  // سجل الطباعة وتنبيه إعادة الطباعة
  const [printHistory, setPrintHistory] = useState<Record<string, PrintHistoryEntry>>(() => {
    let notesObj: any = {};
    if (op.notes && op.notes.startsWith("{")) {
      try { notesObj = JSON.parse(op.notes); } catch (e) {}
    }
    return notesObj.technicalOfferLetter?.printHistory || {};
  });
  const [reprintWarningOpen, setReprintWarningOpen] = useState(false);

  // دالة تنفيذ الطباعة وتحديث سجل الطباعة الرسمي
  const executePrintDoc = async () => {
    setPrintingDocx(true);
    try {
      toast.info("جاري تجهيز مستند العرض الفني للطباعة بأعلى دقة...");
      const pdfBlob = await generateTechnicalPdfBlob();
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

      const triggerPrint = () => {
        iframe.focus();
        try {
          iframe.contentWindow?.print();
        } catch {
          window.open(pdfUrl, "_blank")?.print();
        }
      };

      iframe.onload = () => setTimeout(triggerPrint, 350);
      setTimeout(triggerPrint, 1500);

      const currentUser = getCurrentUserName();
      const prev = printHistory["technical"] || { printCount: 0 };
      const updatedHistory = {
        ...printHistory,
        technical: {
          printCount: (prev.printCount || 0) + 1,
          firstPrintedAt: prev.firstPrintedAt || new Date().toISOString(),
          lastPrintedAt: new Date().toISOString(),
          printedBy: currentUser,
          registrationNumber: prev.registrationNumber || registrationNumber,
          items: [
            ...(prev.items || []),
            {
              printedAt: new Date().toISOString(),
              printedBy: currentUser,
              registrationNumber: registrationNumber,
            },
          ],
        },
      };
      setPrintHistory(updatedHistory);

      try {
        let notesObj: any = {};
        if (op.notes && op.notes.startsWith("{")) {
          notesObj = JSON.parse(op.notes);
        }
        const existingLetter = notesObj.technicalOfferLetter || {};
        existingLetter.printHistory = updatedHistory;
        notesObj.technicalOfferLetter = existingLetter;
        await api.patch(`/operations/${op.id}`, { notes: JSON.stringify(notesObj) });
      } catch (e) {
        console.warn("Could not persist print history:", e);
      }

      toast.success("تم إرسال المستند للطباعة وتحديث سجل الطباعة بنجاح ✓");
    } catch (err: any) {
      toast.error("فشل تجهيز الطباعة: " + (err?.message || ""));
    } finally {
      setPrintingDocx(false);
    }
  };

  // طباعة مستند الوورد الأصلي
  const handlePrintWordDocument = async () => {
    const currentInfo = printHistory["technical"];
    if (currentInfo && currentInfo.printCount > 0) {
      setReprintWarningOpen(true);
      return;
    }
    await executePrintDoc();
  };

  const handleConfirmReprint = async () => {
    setReprintWarningOpen(false);
    await executePrintDoc();
  };

  // ━━━ دالة عرض الملف المؤرشف فوراً (0ms) بدون إعادة تحويل ━━━
  const handleViewArchive = () => {
    // 1. إذا كان رابط السحابة متاحاً، افتح النسخة السحابية المعتمدة فوراً
    if (cloudPdfUrl) {
      window.open(cloudPdfUrl, "_blank");
      return;
    }
    // 2. إذا كان ملف الـ PDF متوفراً في الذاكرة مسبقاً، افتح نافذة المعاينة فوراً
    if (previewPdfBlob) {
      setPreviewModalOpen(true);
      return;
    }
    // 3. التحقق من وجود مستند مؤرشف في أرشيف العملية
    const archivedDoc = op.documents?.find(
      (d: any) =>
        d.type?.toLowerCase().includes("technical") ||
        d.name?.toLowerCase().includes("technical") ||
        d.name?.includes("فني")
    );
    if (archivedDoc?.fileUrl) {
      window.open(archivedDoc.fileUrl, "_blank");
      return;
    }
    // 4. فتح المعاينة
    setPreviewModalOpen(true);
  };

  const handleDirectPrint = handlePrintWordDocument;

  // تحميل ملف Word (.docx)
  const handleDownloadDocx = async () => {
    if (previewDocxBlob && currentSnapshot === lastGeneratedSnapshot) {
      const url = URL.createObjectURL(previewDocxBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `عرض_فني_${op.serialNumber || "365"}_${registrationNumber}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل ملف الوورد فوراً! 📄✨");
      return;
    }

    setDownloadingDocx(true);
    try {
      const blob = await generateTechnicalDocxBlob();
      setPreviewDocxBlob(blob);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `عرض_فني_${op.serialNumber || "365"}_${registrationNumber}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل ملف الوورد الأصلي المعتمد بنجاح!");
    } catch (err: any) {
      toast.error("فشل تنزيل ملف الوورد: " + (err?.message || ""));
    } finally {
      setDownloadingDocx(false);
    }
  };

  // تحميل ملف PDF
  const handleDownloadPdf = async () => {
    if (previewPdfBlob && currentSnapshot === lastGeneratedSnapshot) {
      const url = URL.createObjectURL(previewPdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `عرض_فني_${op.serialNumber || "365"}_${registrationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تحميل مستند PDF فوراً! 📑✨");

      // التأكد من رفع النسخة السحابية لرمز QR إذا لم تكن مرفوعة
      if (!cloudPdfUrl || cloudPdfUrl.includes("tmpfiles.org") || cloudPdfUrl.includes("gofile.io")) {
        handleUploadToCloud(false, previewPdfBlob);
      }
      return;
    }

    setDownloadingPdf(true);
    try {
      toast.info("جاري تصدير العرض الفني بصيغة PDF الرسمية عبر محرك Word...");
      const docx = await generateTechnicalDocxBlob();
      const pdfBlob = await getPdfBlobFromDocx(
        docx,
        `technical_offer_${registrationNumber || op.serialNumber}.docx`
      );
      setPreviewDocxBlob(docx);
      setPreviewPdfBlob(pdfBlob);
      setLastGeneratedSnapshot(currentSnapshot);

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `عرض_فني_${op.serialNumber || "365"}_${registrationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تحميل مستند PDF بنجاح! 📑✨");

      // رفع المستند سحابياً لرمز QR فوراً (رابط PDF مباشر)
      if (!cloudPdfUrl || cloudPdfUrl.includes("tmpfiles.org") || cloudPdfUrl.includes("gofile.io")) {
        handleUploadToCloud(false, pdfBlob);
      }
    } catch (err: any) {
      toast.error("فشل تصدير ملف PDF: " + (err?.message || ""));
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

  // حفظ العرض الفني في قاعدة بيانات النظام
  const handleSaveToSystem = async () => {
    const snapToSave = currentSnapshot;
    setSavedSnapshot(snapToSave);
    setSavingOffer(true);
    toast.success("تم حفظ بيانات العرض الفني بنجاح! 💾✨");

    try {
      let existingNotesObj: Record<string, any> = {};
      try {
        if (op.notes && op.notes.startsWith("{")) {
          existingNotesObj = JSON.parse(op.notes);
        } else if (op.notes) {
          existingNotesObj = { textNotes: op.notes };
        }
      } catch {}

      existingNotesObj.technicalOfferDocx = {
        ...(existingNotesObj.technicalOfferDocx || {}),
        ...JSON.parse(snapToSave),
        cloudPdfUrl,
        printHistory,
      };

      existingNotesObj.fiscalYear = fiscalYear;

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(existingNotesObj),
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل الحفظ في السيرفر");
    } finally {
      setSavingOffer(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-foreground print:m-0 print:p-0">




      {/* ━━━ SECTION 1: بيانات الشركة المصدرة وكود العملية ورقم القيد والباركود ━━━ */}
      <SectionCard
        title="1. بيانات الشركة المصدرة وكود العملية ورقم القيد والباركود الرقمي"
        icon={Building2}
        iconColor="text-blue-600"
        badge={
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-bold">
            الشركة: {currentCompanyLink?.displayCode || "A1"}
          </Badge>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* اختيار الشركة المصدرة - مع تعريب كامل ومنع ظهور أي CUID إنجليزي */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold text-foreground">الشركة المصدرة للعرض الفني *</Label>
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
                        {oc.company?.name || "الشركة"} ({oc.displayCode})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* رقم القيد الصادر */}
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">رقم القيد الصادر بالعرض الفني *</Label>
                <button
                  type="button"
                  onClick={handleRegenerateRef}
                  className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>توليد ذكي</span>
                </button>
              </div>
              <Input
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                className="h-9.5 text-xs font-mono font-bold rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* كود العملية بالشركة */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">كود العملية بالشركة (Header) *</Label>
              <Input
                value={companyOpCode}
                onChange={(e) => setCompanyOpCode(e.target.value)}
                placeholder="مثلاً: AZ-01"
                className="h-9.5 text-xs font-mono font-bold rounded-xl"
              />
            </div>

            {/* السجل التجاري */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">السجل التجاري (س . ت) *</Label>
              <Input
                value={companyCommercialRegister}
                onChange={(e) => setCompanyCommercialRegister(e.target.value)}
                className="h-9.5 text-xs font-mono rounded-xl"
              />
            </div>

            {/* البطاقة الضريبية */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">البطاقة الضريبية (ب . ض) *</Label>
              <Input
                value={companyTaxCard}
                onChange={(e) => setCompanyTaxCard(e.target.value)}
                className="h-9.5 text-xs font-mono rounded-xl"
              />
            </div>

            {/* التاريخ الصادر */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">التاريخ الصادر (Footer) *</Label>
              <Input
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="h-9.5 text-xs font-mono rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">هاتف الواتساب (Footer)</Label>
              <Input
                value={phoneWhatsapp}
                onChange={(e) => setPhoneWhatsapp(e.target.value)}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">هاتف الموبايل (Footer)</Label>
              <Input
                value={phoneMobile}
                onChange={(e) => setPhoneMobile(e.target.value)}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">العنوان المطبوع بالتذييل</Label>
              <Input
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 2: جهة الإسناد وبيانات العملية وموعد الجلسة ━━━ */}
      <SectionCard
        title="2. جهة الإسناد والموضوع وموعد فتح المظاريف الفنية"
        icon={Calendar}
        iconColor="text-indigo-600"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs font-bold text-foreground">لقب المرسل إليه (السيد ...) *</Label>
              <Input
                value={recipientPrefix}
                onChange={(e) => setRecipientPrefix(e.target.value)}
                placeholder="الأستاذ / المهندس"
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label className="text-xs font-bold text-foreground">المنصب والجهة الإدارية المسندة *</Label>
              <Input
                value={recipientTitleAndAuthority}
                onChange={(e) => setRecipientTitleAndAuthority(e.target.value)}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs font-bold text-foreground">تقديم عرض (للأصناف / للأعمال...) *</Label>
              <Input
                value={subjectTarget}
                onChange={(e) => setSubjectTarget(e.target.value)}
                placeholder="للأصناف"
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold text-foreground">اسم العملية المسجلة بالكراسة *</Label>
              <Input
                value={operationRegisteredName}
                onChange={(e) => setOperationRegisteredName(e.target.value)}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs font-bold text-foreground">رقم العملية / المناقصة *</Label>
              <Input
                value={operationNumber}
                onChange={(e) => setOperationNumber(e.target.value)}
                className="h-9.5 text-xs font-mono font-bold rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FiscalYearSelect
              value={fiscalYear}
              onChange={setFiscalYear}
              label="العام المالي المذكور بالعرض *"
            />
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">موعد جلسة فتح المظروف الفني *</Label>
              <Input
                value={technicalOpeningDate}
                onChange={(e) => setTechnicalOpeningDate(e.target.value)}
                placeholder="14/ 1 /2024"
                className="h-9.5 text-xs font-mono rounded-xl"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 3: جدول الأصناف والمواصفات الفنية والبدائل ━━━ */}
      <SectionCard
        title="3. جدول الأصناف والمواصفات الفنية والبدائل (مطابق لجدول الوورد 8 أعمدة)"
        icon={Layers}
        iconColor="text-emerald-600"
        badge={
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
            {items.length} أصناف رئيسية
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={handleAddMainItem}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة صنف جديد</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border text-xs text-muted-foreground leading-relaxed flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              <strong>ميزة البدائل الذكية:</strong> كل صنف رئيسي يمكنك إضافة بديل (أو بديلين أو أكثر) له داخل نفس الصف مع دمج رقم الصنف والاسم والكمية والوحدة رأسياً تلقائياً كما في ملف الوورد تماماً وبدون أي أخطاء!
            </span>
          </div>

          {items.map((item, itemIdx) => {
            const basicVariant = item.variants.find((v) => v.variantType === "basic") || item.variants[0];
            const alternatives = item.variants.filter((v) => v.variantType === "alternative");

            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 rounded-3xl bg-card border border-border/80 shadow-md space-y-4 hover:border-emerald-500/50 transition-all"
              >
                {/* Header Bar of the Item */}
                <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 font-black font-mono flex items-center justify-center text-sm shadow-xs">
                      #{itemIdx + 1}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-foreground text-sm">
                        {item.itemName || `صنف رقم (${itemIdx + 1})`}
                      </h4>
                      <span className="text-[11px] text-muted-foreground">
                        الوحدة: {item.unit || "عدد"} • الكمية: {item.quantity || "1"} •{" "}
                        {alternatives.length > 0
                          ? `${alternatives.length} بدائل مطابقة مسجلة ✓`
                          : "المواصفة الأساسية فقط (بدون بدائل)"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAddAlternative(item.id)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] h-8 px-3 rounded-xl cursor-pointer shadow-xs flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>إضافة بديل</span>
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveMainItem(item.id)}
                      className="h-8 w-8 rounded-xl text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                      title="حذف هذا الصنف بالكامل"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Primary Attributes (م، إسم الصنف، الوحدة، الكمية) */}
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                  <div className="space-y-1 sm:col-span-3">
                    <Label className="text-[11px] font-bold text-foreground">إســــم الصــــــنف (العمود الرئيسي) *</Label>
                    <Input
                      value={item.itemName}
                      onChange={(e) => handleUpdateItemField(item.id, "itemName", e.target.value)}
                      placeholder="مثلاً: إطار كاوتش مقاس 1200 / 20 سلك"
                      className="h-9 text-xs font-bold rounded-xl"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <Label className="text-[11px] font-bold text-foreground">الوحدة *</Label>
                    <Input
                      value={item.unit}
                      onChange={(e) => handleUpdateItemField(item.id, "unit", e.target.value)}
                      placeholder="عدد / طقم"
                      className="h-9 text-xs rounded-xl text-center font-bold"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px] font-bold text-foreground">الكمية *</Label>
                    <Input
                      value={item.quantity}
                      onChange={(e) => handleUpdateItemField(item.id, "quantity", e.target.value)}
                      placeholder="مثلاً: 24"
                      className="h-9 text-xs rounded-xl text-center font-mono font-bold"
                    />
                  </div>
                </div>

                {/* المواصفة الأساسية (أساسي) */}
                {basicVariant && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/25 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Badge className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5">
                          المواصفة الأساسية (أساسى)
                        </Badge>
                        <span className="text-[11px] text-muted-foreground font-semibold">
                          البيانات المقابلة لأول صف فرعي للصنف
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-[10px] font-bold text-foreground">الوصف الفني الأساسي *</Label>
                        <Input
                          value={basicVariant.description}
                          onChange={(e) =>
                            handleUpdateVariantField(item.id, basicVariant.id, "description", e.target.value)
                          }
                          placeholder="مثلاً: إطارات ماركة ميشلان فرنسي إنتاج 2026"
                          className="h-8.5 text-xs rounded-lg"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-1">
                        <Label className="text-[10px] font-bold text-foreground">الوصف الفرعى</Label>
                        <Input
                          value={basicVariant.subDescription}
                          onChange={(e) =>
                            handleUpdateVariantField(item.id, basicVariant.id, "subDescription", e.target.value)
                          }
                          placeholder="حمولة 18PR سرعة K"
                          className="h-8.5 text-xs rounded-lg"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-1">
                        <Label className="text-[10px] font-bold text-foreground">فرعى 1</Label>
                        <Input
                          value={basicVariant.branch1}
                          onChange={(e) =>
                            handleUpdateVariantField(item.id, basicVariant.id, "branch1", e.target.value)
                          }
                          placeholder="نقشة شجري"
                          className="h-8.5 text-xs rounded-lg"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-4">
                        <Label className="text-[10px] font-bold text-foreground">ملاحظات المواصفة الأساسية</Label>
                        <Input
                          value={basicVariant.notes}
                          onChange={(e) =>
                            handleUpdateVariantField(item.id, basicVariant.id, "notes", e.target.value)
                          }
                          placeholder="شامل البلف والشريط والشنبر..."
                          className="h-8.5 text-xs rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* قائمة البدائل (Alternative Variants) */}
                {alternatives.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    <div className="text-[11px] font-extrabold text-foreground flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-indigo-600" />
                      <span>البدائل الفنية التابعة لهذا الصنف ({alternatives.length} بدائل):</span>
                    </div>

                    {alternatives.map((alt, altIdx) => (
                      <div
                        key={alt.id}
                        className="p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/25 space-y-3 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5">
                              {alt.variantLabel || `بديل ${altIdx + 1}`}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              صف فرعي مدمج مع نفس الصنف #{itemIdx + 1}
                            </span>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveAlternative(item.id, alt.id)}
                            className="h-7 px-2 text-rose-600 hover:bg-rose-500/10 text-[11px] font-bold rounded-lg cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3 ml-1" />
                            <span>حذف البديل</span>
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                          <div className="space-y-1 sm:col-span-2">
                            <Label className="text-[10px] font-bold text-foreground">الوصف الفني للبديل *</Label>
                            <Input
                              value={alt.description}
                              onChange={(e) =>
                                handleUpdateVariantField(item.id, alt.id, "description", e.target.value)
                              }
                              placeholder="مثلاً: إطارات ماركة بريدجستون ياباني إنتاج 2026"
                              className="h-8.5 text-xs rounded-lg"
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-1">
                            <Label className="text-[10px] font-bold text-foreground">الوصف الفرعى</Label>
                            <Input
                              value={alt.subDescription}
                              onChange={(e) =>
                                handleUpdateVariantField(item.id, alt.id, "subDescription", e.target.value)
                              }
                              placeholder="حمولة 18PR سرعة L"
                              className="h-8.5 text-xs rounded-lg"
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-1">
                            <Label className="text-[10px] font-bold text-foreground">فرعى 1</Label>
                            <Input
                              value={alt.branch1}
                              onChange={(e) =>
                                handleUpdateVariantField(item.id, alt.id, "branch1", e.target.value)
                              }
                              placeholder="نقشة خطوط طولية"
                              className="h-8.5 text-xs rounded-lg"
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-4">
                            <Label className="text-[10px] font-bold text-foreground">ملاحظات البديل</Label>
                            <Input
                              value={alt.notes}
                              onChange={(e) =>
                                handleUpdateVariantField(item.id, alt.id, "notes", e.target.value)
                              }
                              placeholder="بديل رقم 1 مطابق بالكامل للكراسة..."
                              className="h-8.5 text-xs rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground bg-muted/20 p-2.5 rounded-xl border border-dashed border-border flex items-center justify-between">
                    <span>لا توجد بدائل مسجلة لهذا الصنف (يتم عرض المواصفة الأساسية فقط).</span>
                    <button
                      type="button"
                      onClick={() => handleAddAlternative(item.id)}
                      className="text-indigo-600 hover:underline font-bold cursor-pointer"
                    >
                      + أضف بديل الآن
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* ━━━ SECTION 4: مدة الضمان والشروط والإيضاحات الهامة ━━━ */}
      <SectionCard
        title="4. مدة الضمان والشروط والإيضاحات الهامة للعرض"
        icon={ShieldCheck}
        iconColor="text-amber-600"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs font-bold text-foreground">مدة الضمان *</Label>
              <Input
                value={warrantyDuration}
                onChange={(e) => setWarrantyDuration(e.target.value)}
                placeholder="سنة"
                className="h-9.5 text-xs font-bold rounded-xl"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label className="text-xs font-bold text-foreground">شروط وتغطية الضمان *</Label>
              <Input
                value={warrantyTerms}
                onChange={(e) => setWarrantyTerms(e.target.value)}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="text-xs font-extrabold text-foreground">
              ملاحظات وشروط وإيضاحات هامة (البنود الأربعة المعتمدة بالقالب):
            </div>

            <div className="space-y-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">1. شرط التوريد ومكان التسليم والنقل:</Label>
                <Input
                  value={condition1}
                  onChange={(e) => setCondition1(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">2. شرط تغير أسعار المحروقات والقرارات الرسمية:</Label>
                <Input
                  value={condition2}
                  onChange={(e) => setCondition2(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">3. مدة الارتباط بالأسعار من تاريخ الفتح الفني:</Label>
                <Input
                  value={condition3}
                  onChange={(e) => setCondition3(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">4. الاشتراط الفني الإضافي (مثال: ضغط الهواء):</Label>
                <Input
                  value={condition4}
                  onChange={(e) => setCondition4(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 5: الاعتمادات وتوقيعات العرض الفني ━━━ */}
      <SectionCard
        title="5. التوقيعات والاعتمادات الرسمية للعرض الفني"
        icon={FileCheck}
        iconColor="text-emerald-600"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">المهندس المختص (الاسم) *</Label>
              <Input
                value={specialistName}
                onChange={(e) => setSpecialistName(e.target.value)}
                className="h-9.5 text-xs font-bold rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">المدير المالي (الاسم) *</Label>
              <Input
                value={financeManagerName}
                onChange={(e) => setFinanceManagerName(e.target.value)}
                className="h-9.5 text-xs font-bold rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">اعتماد رئيس مجلس الإدارة (الاعتماد النهائي) *</Label>
              <Input
                value={boardChairman}
                onChange={(e) => setBoardChairman(e.target.value)}
                placeholder="رئيس مجلس الإدارة"
                className="h-9.5 text-xs font-bold rounded-xl"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ━━━ MODAL: معاينة مستند الوورد الأصلي المعتمد (عرض فنى.docx) ━━━ */}
      {previewModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl h-[94vh] max-h-[94vh] flex flex-col overflow-hidden text-foreground">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-foreground text-base">
                        معاينة قالب الوورد المعتمد: العرض الفني.docx
                      </h3>
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                        معاينة Word COM الرسمية 100% ✓
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      معاينة حية ومطابقة 100% لقالب الوورد الأصلي مع دعم التحميل بصيغة Word أو PDF والطباعة المباشرة
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
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

              {/* View: OnlyOffice & Authentic Word Document Viewer */}
              <div className="flex-1 min-h-0 overflow-hidden pt-3 flex flex-col">
                {renderingDocx ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 text-center bg-slate-950 rounded-2xl">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-lg">
                      <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white">جاري معالجة وتوليد المعاينة الأصلية لمستند الوورد...</h4>
                      <p className="text-xs text-slate-400">تطبيق الباركود والمتغيرات وإزالة علامات التمييز الحمراء بدقة 100%</p>
                    </div>
                  </div>
                ) : (
                  <OnlyOfficeDocViewer
                    documentTitle={`عرض_فنى_${op.externalNumber || op.serialNumber}_${registrationNumber}.docx`}
                    docxBlob={previewDocxBlob}
                    pdfBlob={previewPdfBlob}
                    onDownloadDocx={handleDownloadDocx}
                    onDownloadPdf={handleDownloadPdf}
                    onPrint={handlePrintWordDocument}
                  />
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ━━━ الباركود الذكي ورمز QR والرفع السحابي المجاني للنسخة الرقمية بأسفل الصفحة ━━━ */}
      <LetterQrCloudCard
        cloudPdfUrl={cloudPdfUrl}
        registrationNumber={registrationNumber}
        opId={op.id}
        docType="technical"
        uploadingCloud={uploadingCloud}
        onUploadToCloud={handleUploadToCloud}
        title="الباركود الذكي ورمز QR الرقمي المعتمد (PDF)"
        subtitle="عند مسح الباركود بكاميرا الموبايل يتم فتح صفحة النسخة الرقمية المعتمدة للعرض الفني فوراً بدون الحاجة لأي تسجيل دخول."
        badgeText="مدمج بموضع كلمة (الباركود) بالأعلى ورقم القيد بالتذييل"
        gradientClass="from-blue-500/10 via-purple-500/10 to-transparent border-blue-500/25"
        isModifiedAfterUpload={isDirty}
      />

      {/* ━━━ BOTTOM ACTION BAR: التوليد والطباعة والمعاينة بأسفل مرحلة العرض الفني ━━━ */}
      <LetterBottomActionWidget
        title="العرض الفني والمواصفات الفنية والبدائل"
        registrationNumber={registrationNumber}
        isDirty={isDirty}
        printInfo={printHistory["technical"]}
        onPreview={() => setPreviewModalOpen(true)}
        onSave={handleSaveToSystem}
        onCancelEdits={handleCancelEdits}
        saving={savingOffer}
        onViewArchive={handleViewArchive}
        icon={ClipboardCheck}
        iconColor="text-blue-700 dark:text-blue-400"
        iconBg="bg-blue-500/15 border-blue-500/30"
        customSubtitle="مطابق 100% لقالب الوورد الأصلي للشركة (عرض فنى.docx). اضغط على زر المعاينة للاطلاع على المستند وتنزيله أو طباعته."
      />

      {/* ━━━ نافذة التنبيه عند إعادة طباعة مستند مطبوع مسبقاً ━━━ */}
      <ReprintConfirmModal
        open={reprintWarningOpen}
        onClose={() => setReprintWarningOpen(false)}
        printInfo={printHistory["technical"]}
        onConfirmReprint={handleConfirmReprint}
        onViewArchive={() => {
          setReprintWarningOpen(false);
          handleViewArchive();
        }}
      />

      {/* ━━━ نافذة التحميل العائمة المبتكرة عند تنزيل PDF ━━━ */}
      <PdfExportLoadingModal open={downloadingPdf} />

      {/* ━━━ STEP FOOTER NAVIGATION ━━━ */}
      <StepFooterNav
        currentTabId="technical"
        onNavigate={onNavigate}
        nextLabel="الانتقال إلى: #7 العرض المالي وجدول الكميات ➔"
        prevLabel="← خطاب التوضيح والاستفسارات"
      />
    </div>
  );
}
