"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  FileText,
  Printer,
  Download,
  Eye,
  RefreshCw,
  Building2,
  Trash2,
  Plus,
  Scale,
  Sparkles,
  FileCheck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronDown,
  Layers,
  HelpCircle,
  X,
  ExternalLink,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Portal } from "@/components/ui/portal";
import { toast } from "sonner";
import api from "@/lib/api";
import { Operation, SectionCard } from "./types";
import {
  LetterBottomActionWidget,
  FISCAL_YEAR_OPTIONS,
  LetterQrCloudCard,
  PdfExportLoadingModal,
  getLetterSpecificRegistrationNumber,
  regenerateLetterSpecificRegistrationNumber,
  FiscalYearSelect,
  replaceDocxFiscalAndDate,
  replaceDocxChairman,
  sanitizeChairmanTitle,
  getOperationRecipientTitle,
  getOperationFiscalYear,
  getOperationTechnicalOpeningDate,
  getOperationTenderMethod,
  getSharedOperationScope,
  isValidCloudDocUrl,
  generateHighResDocQrBuffer,
  getStandardDocQrPayload,
  buildOfficialSignaturesTableXml,
  cleanAllDocxXml,
  buildQrAnchorXml,
  injectSingleQrIntoDocXml,
  replaceDocxRecipient,
} from "./letter-utils";
import JSZip from "jszip";
import QRCode from "qrcode";
import { getPdfBlobFromDocx, uploadPdfToFreeCloud, getExpectedCloudPdfUrl } from "./client-pdf";
import { OnlyOfficeDocViewer } from "@/components/OnlyOfficeDocViewer";
import { loadArchivedPdfBlob, saveLetterToArchiveWithVersion } from "./archive-utils";

export interface GrievanceItem {
  id: string;
  itemNumber: number;            // م
  clauseName: string;            // إسم البند المراد
  clauseNumber: string;          // الرقم
  actionTakenOrReason: string;   // الوصف أو الإجراء المتخذ (سبب الاستبعاد)
  correctiveAction: string;      // طريقة تصحيح الخطأ (الإجراء التصحيحي المطلوب)
}

function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildGrievanceTableRowsXml(items: GrievanceItem[]): string {
  let rowsXml = "";

  const itemsList = items && items.length > 0 ? items : [
    {
      id: "grv-1",
      itemNumber: 1,
      clauseName: "بند رقم (1) من كراسة الشروط والمواصفات",
      clauseNumber: "1",
      actionTakenOrReason: "استبعاد البند لعدم مطابقة الكتالوج الفني المقدم",
      correctiveAction: "إعادة فحص الكتالوج المعتمد وإرفاق شهادة المطابقة الصادرة من الشركة المصنعة",
    }
  ];

  itemsList.forEach((item, idx) => {
    const trPr = `<w:trPr><w:trHeight w:val="288"/></w:trPr>`;

    const makeCell = (width: number, content: string, align: "center" | "right" = "center") => {
      const borderStr = '<w:top w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/><w:left w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/><w:bottom w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/><w:right w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/>';
      const textXml = content
        ? `<w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(content)}</w:t></w:r>`
        : "";

      return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:tcBorders>${borderStr}</w:tcBorders><w:hideMark/></w:tcPr><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="${align}"/><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr>${textXml}</w:p></w:tc>`;
    };

    const c0 = makeCell(630, String(idx + 1), "center");
    const c1 = makeCell(3334, item.clauseName, "right");
    const c2 = makeCell(992, item.clauseNumber || String(idx + 1), "center");
    const c3 = makeCell(2835, item.actionTakenOrReason, "right");
    const c4 = makeCell(2545, item.correctiveAction, "right");

    rowsXml += `<w:tr>${trPr}${c0}${c1}${c2}${c3}${c4}</w:tr>`;
  });

  return rowsXml;
}

export function GrievanceLetterSection({
  op,
  stage = "technical",
  onRefresh,
  onClose,
  initialOpenPreview = false,
}: {
  op: Operation;
  stage?: "technical" | "financial";
  onRefresh: () => void;
  onClose?: () => void;
  initialOpenPreview?: boolean;
}) {
  const isTech = stage === "technical";
  const noteKey = isTech ? "technicalGrievanceLetterDocx" : "financialGrievanceLetterDocx";
  const letterKey = isTech ? "tech_grievance" : "fin_grievance";

  // قراءة البيانات المحفوظة إن وجدت
  const savedGrievanceData = useMemo(() => {
    try {
      if (op.notes && op.notes.startsWith("{")) {
        const parsed = JSON.parse(op.notes);
        return parsed[noteKey] || null;
      }
    } catch {}
    return null;
  }, [op.notes, noteKey]);

  // 1. الشركة والترويسة
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => {
    return savedGrievanceData?.selectedCompanyId || op.companies?.[0]?.companyId || op.companies?.[0]?.id || "";
  });

  const handleSelectCompany = (compVal: string) => {
    setSelectedCompanyId(compVal);
    const link = (op.companies || []).find((c: any) => c.companyId === compVal || c.id === compVal);
    if (link) {
      if (link.displayCode) setCompanyOpCode(link.displayCode);
      if (link.company?.commercialRegister) setCompanyCommercialRegister(link.company.commercialRegister);
      if (link.company?.taxCard) setCompanyTaxCard(link.company.taxCard);
      if (link.company?.phone) setPhoneWhatsapp(link.company.phone);
      if (link.company?.mobile) setPhoneMobile(link.company.mobile);
      if (link.company?.address) setCompanyAddress(link.company.address);
    }
  };

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
    return getLetterSpecificRegistrationNumber(
      op,
      letterKey,
      currentCompanyLink?.displayCode,
      savedGrievanceData?.registrationNumber
    );
  });

  const handleRegenerateRef = async () => {
    await regenerateLetterSpecificRegistrationNumber({
      op,
      letterKey,
      companyCode: currentCompanyLink?.displayCode,
      onSuccess: (newVal) => setRegistrationNumber(newVal),
    });
    onRefresh();
  };

  // بيانات الترويسة
  const [companyOpCode, setCompanyOpCode] = useState(() => {
    return savedGrievanceData?.companyOpCode || currentCompanyLink?.displayCode || "A";
  });
  const [companyCommercialRegister, setCompanyCommercialRegister] = useState(() => {
    return savedGrievanceData?.companyCommercialRegister || currentCompany?.commercialRegister || "14258";
  });
  const [companyTaxCard, setCompanyTaxCard] = useState(() => {
    return savedGrievanceData?.companyTaxCard || currentCompany?.taxCard || "686-218-354";
  });
  const [phoneWhatsapp, setPhoneWhatsapp] = useState(() => {
    return savedGrievanceData?.phoneWhatsapp || currentCompany?.phone || "01007604470";
  });
  const [phoneMobile, setPhoneMobile] = useState(() => {
    return savedGrievanceData?.phoneMobile || currentCompany?.mobile || "01007604470";
  });
  const [companyAddress, setCompanyAddress] = useState(() => {
    return savedGrievanceData?.companyAddress || currentCompany?.address || "مصر — الإسكندرية / دمنهور";
  });
  const [issueDate, setIssueDate] = useState(() => {
    if (savedGrievanceData?.issueDate) return savedGrievanceData.issueDate;
    const d = new Date();
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  });

  // 2. جهة الخطاب والموضوع
  const [recipientPrefix, setRecipientPrefix] = useState(() => {
    return savedGrievanceData?.recipientPrefix || "الأستاذ";
  });
  const [recipientTitleAndAuthority, setRecipientTitleAndAuthority] = useState(() => {
    return (
      savedGrievanceData?.recipientTitleAndAuthority ||
      getOperationRecipientTitle(op, "مدير الادارة العامة للمشتريات والمخازن")
    );
  });

  // تفاصيل المناقصة
  const [operationRegisteredName, setOperationRegisteredName] = useState(() => {
    return savedGrievanceData?.operationRegisteredName || op.name || "توريد أصناف العملية";
  });
  const [operationNumber, setOperationNumber] = useState(() => {
    return savedGrievanceData?.operationNumber || op.externalNumber || op.serialNumber || "365";
  });
  const [tenderMethod, setTenderMethod] = useState(() => {
    return savedGrievanceData?.tenderMethod || getOperationTenderMethod(op);
  });
  const [operationScope, setOperationScope] = useState(() => {
    return savedGrievanceData?.operationScope || getSharedOperationScope(op);
  });
  const [fiscalYear, setFiscalYear] = useState(() => {
    return savedGrievanceData?.fiscalYear || getOperationFiscalYear(op);
  });
  const [sessionDate, setSessionDate] = useState(() => {
    if (savedGrievanceData?.sessionDate) return savedGrievanceData.sessionDate;
    if (isTech) return getOperationTechnicalOpeningDate(op);
    const finDate = (op.dates || []).find((d: any) => d.dateType === "FINANCIAL_OPENING");
    if (finDate?.dateValue) {
      const d = new Date(finDate.dateValue);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    }
    return getOperationTechnicalOpeningDate(op);
  });

  // نوع التظلم من الناحية (فنية / مالية / قانونية)
  const [grievanceAspect, setGrievanceAspect] = useState(() => {
    return savedGrievanceData?.grievanceAspect || (isTech ? "الفنية والقانونية" : "المالية والحسابية");
  });

  // موضوع وسند التظلم (تظلم من ...) - خانة حرة تملأ ديناميكياً
  const [grievanceSubject, setGrievanceSubject] = useState(() => {
    return (
      savedGrievanceData?.grievanceSubject ||
      (isTech ? "نتيجة البت الفني – ميعاد الفتح الفني" : "نتيجة البت المالي وفض المظاريف المالية")
    );
  });

  // 3. جدول بنود التظلم
  const [grievanceItems, setGrievanceItems] = useState<GrievanceItem[]>(() => {
    if (savedGrievanceData?.grievanceItems && Array.isArray(savedGrievanceData.grievanceItems) && savedGrievanceData.grievanceItems.length > 0) {
      return savedGrievanceData.grievanceItems;
    }
    return [
      {
        id: "grv-1",
        itemNumber: 1,
        clauseName: isTech ? "بند المواصفات الفنية والكتالوجات المرفقة بالعطاء" : "بند الأسعار وفئات الأصناف المقدمة بالعرض المالي",
        clauseNumber: "1",
        actionTakenOrReason: isTech
          ? "استبعاد العطاء الفني بزعم عدم مطابقة المواصفة أو نقص كتالوج معتمد"
          : "استبعاد العطاء المالي بدعوى ارتفاع السعر عن التقديري أو خطأ حسابي",
        correctiveAction: isTech
          ? "إعادة فحص الكتالوج الأصلي المرفق مع العرض وقبول المطابقة الفنية التامة"
          : "إعادة التدقيق المحاسبي ومقارنة السعر مع متوسط أسعار السوق وقبول العطاء المالي",
      },
    ];
  });

  const handleAddItem = () => {
    const nextIdx = grievanceItems.length + 1;
    const newItem: GrievanceItem = {
      id: "grv-" + Date.now(),
      itemNumber: nextIdx,
      clauseName: `بند رقم (${nextIdx}) من كراسة الشروط`,
      clauseNumber: String(nextIdx),
      actionTakenOrReason: "",
      correctiveAction: "",
    };
    setGrievanceItems([...grievanceItems, newItem]);
    toast.success(`تمت إضافة بند تظلم رقم (${nextIdx}) بنجاح`);
  };

  const handleRemoveItem = (id: string) => {
    if (grievanceItems.length <= 1) {
      toast.warning("يجب أن يحتوي الخطاب على بند تظلم واحد على الأقل");
      return;
    }
    setGrievanceItems(
      grievanceItems.filter((i) => i.id !== id).map((item, idx) => ({
        ...item,
        itemNumber: idx + 1,
      }))
    );
  };

  const handleUpdateItem = (id: string, field: keyof GrievanceItem, val: any) => {
    setGrievanceItems(
      grievanceItems.map((i) => (i.id === id ? { ...i, [field]: val } : i))
    );
  };

  // 4. الطلب الختامي
  const [grievanceRequest, setGrievanceRequest] = useState(() => {
    return (
      savedGrievanceData?.grievanceRequest ||
      (isTech
        ? "بإعادة فحص العطاء الفني وإلغاء قرار الاستبعاد واستكمال إجراءات فتح المظروف المالي للشركة وفقاً لأحكام القانون 182 لسنة 2018."
        : "بإعادة التدقيق المحاسبي والمفاضلة المالية وترسية العملية على شركتنا باعتبار عرضنا الأفضل شروطاً والأمثل سعراً.")
    );
  });

  // 5. التوقيعات والاعتمادات
  const [specialistTitle, setSpecialistTitle] = useState(() => {
    return savedGrievanceData?.specialistTitle || (isTech ? "المهندس / القانونى المختص :" : "المدير المالي / القانوني :");
  });
  const [specialistName, setSpecialistName] = useState(() => {
    return savedGrievanceData?.specialistName || "";
  });
  const [financeManagerName, setFinanceManagerName] = useState(() => {
    return savedGrievanceData?.financeManagerName || "";
  });
  const [boardChairman, setBoardChairman] = useState(() => {
    return sanitizeChairmanTitle(savedGrievanceData?.boardChairman);
  });

  // 6. الرابط السحابي
  const [cloudPdfUrl, setCloudPdfUrl] = useState(() => {
    const url = savedGrievanceData?.cloudPdfUrl || "";
    return isValidCloudDocUrl(url) ? url : "";
  });
  const [uploadingCloud, setUploadingCloud] = useState(false);

  // Modals & States
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDocxBlob, setPreviewDocxBlob] = useState<Blob | null>(null);
  const [previewPdfBlob, setPreviewPdfBlob] = useState<Blob | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [renderingDocx, setRenderingDocx] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [printingDocx, setPrintingDocx] = useState(false);
  const [savingLetter, setSavingLetter] = useState(false);
  const [lastGeneratedSnapshot, setLastGeneratedSnapshot] = useState<string | null>(null);

  // تتبع التعديلات (isDirty)
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
      recipientPrefix,
      recipientTitleAndAuthority,
      operationRegisteredName,
      operationNumber,
      tenderMethod,
      operationScope,
      fiscalYear,
      sessionDate,
      grievanceSubject,
      grievanceAspect,
      grievanceItems,
      grievanceRequest,
      specialistTitle,
      specialistName,
      financeManagerName,
      boardChairman,
      cloudPdfUrl,
    });
  }, [
    selectedCompanyId,
    registrationNumber,
    companyOpCode,
    companyCommercialRegister,
    companyTaxCard,
    phoneWhatsapp,
    phoneMobile,
    companyAddress,
    issueDate,
    recipientPrefix,
    recipientTitleAndAuthority,
    operationRegisteredName,
    operationNumber,
    tenderMethod,
    operationScope,
    fiscalYear,
    sessionDate,
    grievanceSubject,
    grievanceAspect,
    grievanceItems,
    grievanceRequest,
    specialistTitle,
    specialistName,
    financeManagerName,
    boardChairman,
    cloudPdfUrl,
  ]);

  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => currentSnapshot);
  const isDirty = useMemo(() => currentSnapshot !== savedSnapshot, [currentSnapshot, savedSnapshot]);

  // حفظ التعديلات في op.notes
  const handleSaveData = async () => {
    try {
      setSavingLetter(true);
      let parsedNotes: any = {};
      try {
        if (op.notes && op.notes.startsWith("{")) {
          parsedNotes = JSON.parse(op.notes);
        }
      } catch {}

      parsedNotes[noteKey] = JSON.parse(currentSnapshot);

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(parsedNotes),
      });

      setSavedSnapshot(currentSnapshot);
      toast.success(isTech ? "تم حفظ بيانات خطاب التظلم الفني بنجاح 💾" : "تم حفظ بيانات خطاب التظلم المالي بنجاح 💾");
      onRefresh();
    } catch {
      toast.error("حدث خطأ أثناء حفظ بيانات الخطاب");
    } finally {
      setSavingLetter(false);
    }
  };

  // توليد ملف Word (.docx) الأصلي المعتمد لخطاب التظلم
  const generateGrievanceDocx = async (): Promise<Blob> => {
    const templatePath = "/templates/grievance_letter_template.docx";
    const resp = await fetch(templatePath);
    if (!resp.ok) {
      throw new Error(`تعذر تحميل قالب خطاب التظلم من المسار: ${templatePath}`);
    }
    const arrayBuffer = await resp.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 1. معالجة وتحديث مستند الوورد الرئيسي (word/document.xml)
    let docXml = await zip.file("word/document.xml")!.async("text");

    // أسلوب الطرح بصيغة الباء
    const cleanMethod = (tenderMethod || "").replace(/^(ب|بال)/, "").trim();
    const methodWithBa = `ب${cleanMethod.startsWith("ال") ? cleanMethod : "ال" + cleanMethod}`;

    // عنوان الخطاب الرئيسي
    docXml = docXml.replace(/خط\s*ا\s*ب\s*ت\s*ظلم/g, isTech ? "خطاب تظلم فني" : "خطاب تظلم مالي");

    // جهة الخطاب بتوسيط وتنسيق متوازن
    docXml = replaceDocxRecipient(docXml, recipientPrefix, recipientTitleAndAuthority);

    // 1. موضوع وسند التظلم (تظلم من ...) - استبدال ديناميكي من الخانة الحرة دون أي كسر لوسوم XML
    const grvSubjectTarget =
      grievanceSubject?.trim() ||
      (isTech ? "نتيجة البت الفني – ميعاد الفتح الفني" : "نتيجة البت المالي وفض المظاريف المالية");

    const targetSubjectXml = `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">تظلم من ${escapeXml(grvSubjectTarget)} لعملية </w:t></w:r>`;

    docXml = docXml.replace(
      /<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?تظلم من(?:(?!<\/w:r>)[\s\S])*?<\/w:r>[\s\S]*?<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?لعملية(?:(?!<\/w:r>)[\s\S])*?<\/w:r>/,
      targetSubjectXml
    );

    if (!isTech) {
      docXml = docXml.replace(/تظلم من نتيجة\s+البت الفني/g, "تظلم من نتيجة البت المالي");
      docXml = docXml.replace(/ميعاد الفتح الفني/g, "ميعاد الفتح المالي");
      docXml = docXml.replace(/لفتح المظروف الفنى/g, "لفتح المظروف المالي");
      docXml = docXml.replace(/النتيجة الفنيه والقانونيه/g, "النتيجة الماليه والقانونيه");
      docXml = docXml.replace(/النتيجة\s+الفنيه/g, "النتيجة الماليه");
      docXml = docXml.replace(/المحدد لتقديم العطاءات/g, "لجلسة البت المالي");
    }

    // بيانات العملية
    docXml = docXml.replace(/اسم العملية المسجله[\s\.]*/g, escapeXml(operationRegisteredName) + " ");
    docXml = docXml.replace(/365/g, escapeXml(operationNumber));
    docXml = docXml.replace(/(ب)?(?:المناقصة\s+ال[\s\S]*?محدود[\s\S]*?ة|المناقصة\s+المحدودة)/g, (_m, hasB) => {
      return hasB ? escapeXml(methodWithBa) : escapeXml(cleanMethod || "المناقصة المحدودة");
    });
    docXml = docXml.replace(/توريد كاوتش وبطاريات للسيارات للجامعه/g, escapeXml(operationScope));

    // التواريخ والسنة المالية
    docXml = replaceDocxFiscalAndDate(docXml, fiscalYear, sessionDate);

    // نوع التظلم من الناحية
    const aspectClean = grievanceAspect || (isTech ? "الفنية والقانونية" : "المالية والحسابية");
    docXml = docXml.replace(
      /عن نوع الاستفسار من الناحية/g,
      `إن التظلم من الناحية ${escapeXml(aspectClean)} :`
    );

    // استبدال صفوف جدول التظلم بصفوف حقيقية ديناميكية دون أي تكرار لوسوم XML
    const newRowsXml = buildGrievanceTableRowsXml(grievanceItems);
    const tblStart = docXml.indexOf("<w:tbl>");
    const tblEnd = docXml.indexOf("</w:tbl>") !== -1 ? docXml.indexOf("</w:tbl>") + 8 : -1;
    if (tblStart !== -1 && tblEnd !== -1) {
      const tblXml = docXml.substring(tblStart, tblEnd);
      const headerEnd = tblXml.indexOf("</w:tr>") !== -1 ? tblXml.indexOf("</w:tr>") + 7 : -1;
      if (headerEnd !== -1) {
        const tableHeaderPart = tblXml.substring(0, headerEnd);
        const newTblXml = tableHeaderPart + newRowsXml + "</w:tbl>";
        docXml = docXml.substring(0, tblStart) + newTblXml + docXml.substring(tblEnd);
      }
    }

    // الطلب الختامي
    docXml = docXml.replace(
      /(الرجاء من سيادتكم التكرم\s*)(?:\.{3,}|[\s\._]*)/g,
      `$1 ${escapeXml(grievanceRequest || "باتخاذ اللازم قانوناً وإلغاء الاستبعاد")} `
    );

    // 4. جدول التوقيعات والاعتمادات الرسمية الثلاثي المتوازن في صف أفقي واحد (بدون أي التفاف Wrap)
    const fullSigBlockRegex = /<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?(?:المختص|المهندس).*?رئيس مجلس\s*ا?ل?ادارة(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/;
    if (fullSigBlockRegex.test(docXml)) {
      const sigTableXml = buildOfficialSignaturesTableXml({
        specialistTitle: specialistTitle || (isTech ? "المهندس / القانونى المختص :" : "المدير المالي / القانوني :"),
        specialistName: specialistName || " ",
        financeManagerName: financeManagerName || " ",
        boardChairman: boardChairman || "رئيس مجلس الإدارة",
      });
      docXml = docXml.replace(fullSigBlockRegex, sigTableXml);
    } else {
      docXml = replaceDocxChairman(docXml, boardChairman);
    }

    // إزالة خانات الملاحظات والعلامات الحمراء والصفراء
    docXml = docXml.replace(/<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?خان[ةه] (?:لكتابة )?ملاحظ[ةه](?:(?!<\/w:p>)[\s\S])*?<\/w:p>/gi, "");
    docXml = docXml.replace(/خان[ةه] (?:لكتابة )?ملاحظ[ةه]/gi, "");
    docXml = docXml.replace(/<w:highlight\s+[^>]*\/>/g, "");
    docXml = docXml.replace(/<w:color\s+w:val="(red|FF0000)"[^>]*\/>/g, "");

    // 2. الباركود ورمز QR المعتمد
    let qrDrawingXml = "";
    try {
      const targetFilename = `grievance_${isTech ? "tech" : "fin"}_${registrationNumber || op.serialNumber || "doc"}.pdf`;
      const qrPayload = await getStandardDocQrPayload(
        cloudPdfUrl,
        registrationNumber,
        isTech ? "مذكرة تظلم فني رسمي" : "مذكرة تظلم مالي رسمي",
        currentCompany?.name || "المجموعة الذهبية",
        targetFilename
      );
      const qrBuffer = await generateHighResDocQrBuffer(qrPayload);

      if (qrBuffer) {
        zip.file("word/media/doc_qr.png", qrBuffer);

        let relsXml = (await zip.file("word/_rels/document.xml.rels")?.async("text")) || "";
        if (relsXml && !relsXml.includes("rIdQR")) {
          relsXml = relsXml.replace(
            "</Relationships>",
            '<Relationship Id="rIdQR" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/doc_qr.png"/></Relationships>'
          );
          zip.file("word/_rels/document.xml.rels", relsXml);
        }

        let ctXml = (await zip.file("[Content_Types].xml")?.async("text")) || "";
        if (ctXml && !ctXml.includes('Extension="png"')) {
          ctXml = ctXml.replace("</Types>", '<Default Extension="png" ContentType="image/png"/></Types>');
          zip.file("[Content_Types].xml", ctXml);
        }

        qrDrawingXml = buildQrAnchorXml();
      }
    } catch (e) {
      console.warn("QR generation failed in GrievanceLetterSection:", e);
    }

    docXml = injectSingleQrIntoDocXml(docXml, qrDrawingXml, escapeXml(registrationNumber));

    zip.file("word/document.xml", docXml);

    // 3. ترويسة وتذييل الشركة في القالب
    const headerFiles = ["word/header1.xml", "word/header2.xml", "word/header3.xml"];
    for (const hf of headerFiles) {
      const hFile = zip.file(hf);
      if (hFile) {
        let hXml = await hFile.async("text");
        hXml = hXml.replace(/جولدن سرفيس/g, escapeXml(currentCompany?.name || "جولدن سرفيس"));
        hXml = hXml.replace(/110200700036620/g, escapeXml(companyCommercialRegister || ""));
        hXml = hXml.replace(/658369652/g, escapeXml(companyTaxCard || ""));
        hXml = hXml.replace(/\(?\s*كود العملية بالشرك[ةه]\s*\)?/g, escapeXml(companyOpCode || ""));
        hXml = hXml.replace(/رقم القيد\s*[:\s]*[\d\w\-\/]+/g, `رقم القيد : ${registrationNumber}`);
        zip.file(hf, hXml);
      }
    }

    const footerFiles = ["word/footer1.xml", "word/footer2.xml", "word/footer3.xml"];
    for (const ff of footerFiles) {
      const fFile = zip.file(ff);
      if (fFile) {
        let fXml = await fFile.async("text");
        fXml = fXml.replace(/15\/10\/2026/g, escapeXml(issueDate));
        fXml = fXml.replace(/التاريخ الصادر\s*:\s*[\d\/\-]+/g, `التاريخ الصادر: ${escapeXml(issueDate)}`);
        fXml = fXml.replace(/رقم القيد/g, `رقم القيد: ${escapeXml(registrationNumber)}`);
        fXml = fXml.replace(/01091708818/g, escapeXml(phoneWhatsapp));
        fXml = fXml.replace(/01557018818/g, escapeXml(phoneMobile));
        fXml = fXml.replace(/بجوار مستشفى ليدى كير\s*-\s*بدمنهور\s*-\s*البح\s*يره/g, escapeXml(companyAddress));
        zip.file(ff, fXml);
      }
    }

    await cleanAllDocxXml(zip);

    return await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  };

  // فتح نافذة المعاينة والطباعة الفورية (0ms Instant Cache)
  const handleOpenPreview = async (forceRefresh: boolean | any = false) => {
    setPreviewModalOpen(true);
    const shouldForce = forceRefresh === true;

    // حفظ فوري للمسودة لضمان تسجيل بيانات الخطاب
    try {
      let parsedNotes: any = {};
      if (op.notes && op.notes.startsWith("{")) {
        parsedNotes = JSON.parse(op.notes);
      }
      parsedNotes[noteKey] = JSON.parse(currentSnapshot);
      api.patch(`/operations/${op.id}`, { notes: JSON.stringify(parsedNotes) }).catch(() => {});
      setSavedSnapshot(currentSnapshot);
    } catch {}

    // 1. إذا كان الملف موجوداً ومولداً في الذاكرة ولم تتغير البيانات -> فتح فوري 0ms
    if (previewPdfBlob && previewPdfUrl && currentSnapshot === lastGeneratedSnapshot && !shouldForce) {
      return;
    }

    // 2. إذا كان المستند مضافاً مسبقاً في الأرشيف ولم يتم تعديل البيانات -> تحميل فوري من الأرشيف 0ms
    if (!shouldForce && !isDirty) {
      try {
        const cached = await loadArchivedPdfBlob(op, grievanceDocKey);
        if (cached?.blob) {
          setPreviewPdfBlob(cached.blob);
          if (previewPdfUrl) {
            URL.revokeObjectURL(previewPdfUrl);
          }
          const url = URL.createObjectURL(cached.blob);
          setPreviewPdfUrl(url);
          setLastGeneratedSnapshot(currentSnapshot);
          toast.success(`تم فتح النسخة المؤرشفة مباشرة ⚡`);
          return;
        }
      } catch (err) {
        console.warn("Could not load cached archive pdf:", err);
      }
    }

    if (renderingDocx) return;
    setRenderingDocx(true);
    try {
      const docx = await generateGrievanceDocx();
      setPreviewDocxBlob(docx);

      const pdf = await getPdfBlobFromDocx(
        docx,
        `grievance_${isTech ? "tech" : "fin"}_${registrationNumber || op.serialNumber}.docx`,
        shouldForce
      );
      setPreviewPdfBlob(pdf);
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
      const url = URL.createObjectURL(pdf);
      setPreviewPdfUrl(url);

      setLastGeneratedSnapshot(currentSnapshot);
      if (shouldForce) {
        toast.success("تم تحديث المعاينة الرسمية بنجاح! 🔄✨");
      }

      // رفع سحابي في الخلفية بدون حجب أو تعطيل شاشة المعاينة
      if (!cloudPdfUrl) {
        handleUploadToCloud(false).catch((e) => console.warn("Background cloud upload failed:", e));
      }
    } catch (err: any) {
      console.error(err);
      toast.error("فشل تجهيز مستند المعاينة: " + (err?.message || ""));
    } finally {
      setRenderingDocx(false);
    }
  };

  const handleCloseModal = () => {
    setPreviewModalOpen(false);
    if (initialOpenPreview) {
      onClose?.();
    }
  };

  useEffect(() => {
    if (initialOpenPreview) {
      handleOpenPreview(false);
    }
  }, [initialOpenPreview]);

  const handleDownloadDocx = async () => {
    if (previewDocxBlob && currentSnapshot === lastGeneratedSnapshot) {
      const url = URL.createObjectURL(previewDocxBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `خطاب_تظلم_${isTech ? "فني" : "مالي"}_${op.externalNumber || op.serialNumber}_${registrationNumber}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل مستند الوورد المعتمد بنجاح 📄");
      return;
    }

    try {
      setDownloadingDocx(true);
      const blob = await generateGrievanceDocx();
      setPreviewDocxBlob(blob);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `خطاب_تظلم_${isTech ? "فني" : "مالي"}_${op.externalNumber || op.serialNumber}_${registrationNumber}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل مستند الوورد المعتمد بنجاح 📄");
    } catch {
      toast.error("تعذر تحميل مستند الوورد");
    } finally {
      setDownloadingDocx(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (previewPdfBlob && currentSnapshot === lastGeneratedSnapshot) {
      const url = URL.createObjectURL(previewPdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `خطاب_تظلم_${isTech ? "فني" : "مالي"}_${op.externalNumber || op.serialNumber}_${registrationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل النسخة الرقمية PDF بنجاح 📄");
      return;
    }

    try {
      setDownloadingPdf(true);
      const docx = await generateGrievanceDocx();
      const blob = await getPdfBlobFromDocx(
        docx,
        `grievance_${isTech ? "tech" : "fin"}_${registrationNumber}.docx`
      );
      setPreviewPdfBlob(blob);
      setLastGeneratedSnapshot(currentSnapshot);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `خطاب_تظلم_${isTech ? "فني" : "مالي"}_${op.externalNumber || op.serialNumber}_${registrationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل النسخة الرقمية PDF بنجاح 📄");
    } catch {
      toast.error("تعذر تحميل نسخة PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrintWordDocument = async () => {
    try {
      setPrintingDocx(true);
      const pdfBlob = previewPdfBlob || (await getPdfBlobFromDocx(await generateGrievanceDocx()));
      const url = URL.createObjectURL(pdfBlob);
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 60000);
      };
    } catch {
      toast.error("تعذر إرسال الخطاب للطباعة");
    } finally {
      setPrintingDocx(false);
    }
  };

  // رفع النسخة الرقمية للسحابة وتحديث الباركود (Cloudflare R2 المعتمد)
  const handleUploadToCloud = async (forceReupload = false) => {
    if (cloudPdfUrl && !forceReupload) {
      toast.info("تم توثيق ورفع هذا الخطاب سحابياً مسبقاً وهو نشط بالفعل ✓");
      return;
    }
    setUploadingCloud(true);
    try {
      if (forceReupload) {
        toast.info("جاري توثيق ورفع خطاب التظلم سحابياً (رابط PDF مباشر)...");
      }
      let docx = previewDocxBlob;
      let pdf = previewPdfBlob;
      if (!docx || !pdf || forceReupload) {
        docx = await generateGrievanceDocx();
        pdf = await getPdfBlobFromDocx(
          docx,
          `grievance_${isTech ? "tech" : "fin"}_${registrationNumber || op.serialNumber}.docx`,
          forceReupload
        );
        setPreviewDocxBlob(docx);
        setPreviewPdfBlob(pdf);
        if (previewPdfUrl) {
          URL.revokeObjectURL(previewPdfUrl);
        }
        setPreviewPdfUrl(URL.createObjectURL(pdf));
      }

      const fileName = `خطاب_تظلم_${isTech ? "فني" : "مالي"}_${op.id}_${registrationNumber || op.serialNumber}.pdf`;
      const res = await uploadPdfToFreeCloud(pdf, fileName);
      const cloudUrl = typeof res === "string" ? res : res?.url;

      if (cloudUrl) {
        setCloudPdfUrl(cloudUrl);
        const syncedSnapshot = JSON.stringify({
          ...JSON.parse(currentSnapshot),
          cloudPdfUrl: cloudUrl,
        });
        setLastGeneratedSnapshot(syncedSnapshot);

        // حفظ الرابط تلقائياً
        let parsedNotes: any = {};
        try {
          if (op.notes && op.notes.startsWith("{")) parsedNotes = JSON.parse(op.notes);
        } catch {}
        parsedNotes[noteKey] = {
          ...(parsedNotes[noteKey] || {}),
          ...JSON.parse(currentSnapshot),
          cloudPdfUrl: cloudUrl,
          updatedAt: new Date().toISOString(),
        };
        await api.patch(`/operations/${op.id}`, { notes: JSON.stringify(parsedNotes) });
        if (forceReupload) {
          toast.success("تم توثيق ورفع خطاب التظلم سحابياً وتحديث المعاينة بنجاح! 🚀");
        }
        onRefresh();
      }
    } catch (err: any) {
      console.warn("Cloud upload error:", err);
      if (forceReupload) {
        toast.error("فشل الرفع السحابي: " + (err?.message || ""));
      }
    } finally {
      setUploadingCloud(false);
    }
  };

  // ━━━ حالة وإجراء الإضافة المباشرة للأرشيف ━━━
  const [addingToArchive, setAddingToArchive] = useState(false);
  const grievanceDocKey = isTech ? "grievance-tech" : "grievance-fin";
  const isArchived = useMemo(() => {
    try {
      if (op.notes && op.notes.startsWith("{")) {
        const parsed = JSON.parse(op.notes);
        const list = parsed.archivedDocIds || [];
        return (
          list.includes(grievanceDocKey) ||
          list.includes(isTech ? "letter-grievance-tech" : "letter-grievance-fin")
        );
      }
    } catch {}
    return false;
  }, [op.notes, grievanceDocKey, isTech]);

  const handleToggleArchive = async () => {
    setAddingToArchive(true);
    let notesObj: any = {};
    try {
      if (op.notes && op.notes.startsWith("{")) {
        notesObj = JSON.parse(op.notes);
      }
    } catch {}

    const altKey = isTech ? "letter-grievance-tech" : "letter-grievance-fin";
    const current: string[] = notesObj.archivedDocIds || [];
    const exists = current.includes(grievanceDocKey) || current.includes(altKey);

    if (exists) {
      notesObj.archivedDocIds = current.filter((id: string) => id !== grievanceDocKey && id !== altKey);
      try {
        await api.patch(`/operations/${op.id}`, { notes: JSON.stringify(notesObj) });
        toast.success(
          `تمت إزالة ${isTech ? "خطاب التظلم الفني" : "خطاب التظلم المالي"} من مستندات الأرشيف 📂`
        );
        onRefresh();
      } catch (err: any) {
        toast.error("فشل تحديث حالة الأرشيف: " + (err?.message || ""));
      } finally {
        setAddingToArchive(false);
      }
      return;
    }

    try {
      toast.info("جاري تجهيز وتوثيق نسخة PDF الرسمية لخطاب التظلم بالأرشيف...");
      const docx = previewDocxBlob || (await generateGrievanceDocx());
      const pdfBlob =
        previewPdfBlob ||
        (await getPdfBlobFromDocx(
          docx,
          `grievance_${isTech ? "tech" : "fin"}_${registrationNumber || op.serialNumber}.docx`
        ));

      const { versionName } = await saveLetterToArchiveWithVersion({
        op,
        docKey: grievanceDocKey,
        title: isTech ? "خطاب التظلم الفني" : "خطاب التظلم المالي",
        pdfBlob,
        currentSnapshot,
        docType: "LETTER",
        companyId: selectedCompanyId,
        registrationNumber,
      });

      toast.success(`تمت إضافة المستند للأرشيف بنجاح (${versionName})! 📦✨`);
      onRefresh();
    } catch (err: any) {
      toast.error("فشل حفظ المستند في الأرشيف: " + (err?.message || ""));
    } finally {
      setAddingToArchive(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ━━━ ترويسة الخطاب وشريط العنوان ━━━ */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-transparent border-2 border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-md shadow-rose-600/20 shrink-0">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-base sm:text-lg text-foreground">
                {isTech ? "خطاب التظلم الفني الرسمي (قانون 182 لسنة 2018)" : "خطاب التظلم المالي الرسمي (قانون 182 لسنة 2018)"}
              </h3>
              <Badge className={isTech ? "bg-rose-600 text-white text-[10px] font-bold" : "bg-cyan-600 text-white text-[10px] font-bold"}>
                {isTech ? "مرحلة البت الفني" : "مرحلة البت المالي"}
              </Badge>
              {isDirty && (
                <Badge variant="outline" className="text-amber-600 border-amber-500/40 bg-amber-500/10 text-[10px]">
                  توجد تعديلات غير محفوظة ⚠️
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              مذكرة تظلم رسمية معتمدة موجهة للسلطة المختصة تتضمن جدول أسباب الاستبعاد والطلبات التصحيحية وباركود التحقق الذكي.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleSaveData}
            disabled={savingLetter || !isDirty}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8.5 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{savingLetter ? "جاري الحفظ..." : "حفظ التعديلات"}</span>
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenPreview(false)}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-8.5 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>معاينة وطباعة الخطاب</span>
          </Button>

          {onClose && (
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="text-xs h-8.5 px-3 rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <span>الرجوع لحالة التظلم ↩️</span>
            </Button>
          )}
        </div>
      </div>

      {/* ━━━ SECTION 1: الشركة المصدرة ورقم القيد الصادر ━━━ */}
      <SectionCard
        title="1. الشركة المصدرة للتظلم ورقم القيد الصادر الذكي"
        icon={Building2}
        iconColor="text-blue-600"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1 sm:col-span-1">
            <Label className="text-xs font-bold text-foreground">الشركة المصدرة للخطاب</Label>
            <select
              value={selectedCompanyId}
              onChange={(e) => handleSelectCompany(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:ring-2 focus:ring-rose-500"
            >
              {(op.companies || []).map((c: any) => (
                <option key={c.companyId || c.id} value={c.companyId || c.id}>
                  {c.company?.name || `شركة (${c.displayCode})`}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 sm:col-span-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">رقم القيد الصادر الذكي</Label>
              <button
                type="button"
                onClick={handleRegenerateRef}
                className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                title="توليد رقم تسلسلي جديد"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                <span>توليد جديد</span>
              </button>
            </div>
            <div className="flex gap-1.5">
              <Input
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                className="h-9 text-xs font-mono font-bold"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(registrationNumber);
                  toast.success("تم نسخ رقم القيد بنجاح 📋");
                }}
                className="h-9 w-9 shrink-0 rounded-xl"
                title="نسخ رقم القيد"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-1 sm:col-span-1">
            <Label className="text-xs font-bold text-foreground">تاريخ تحرير التظلم (Footer)</Label>
            <Input
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              placeholder="يوم/شهر/سنة"
              className="h-9 text-xs font-mono font-bold text-center"
            />
          </div>
        </div>

        {/* حقول ترويسة الشركة (كود العملية، السجل التجاري، البطاقة الضريبية) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/50">
          <div className="space-y-1 sm:col-span-1">
            <Label className="text-xs font-bold text-foreground">كود العملية بالشركة (Header) *</Label>
            <Input
              value={companyOpCode}
              onChange={(e) => setCompanyOpCode(e.target.value)}
              placeholder="A"
              className="h-9 text-xs font-mono font-bold text-center"
            />
          </div>

          <div className="space-y-1 sm:col-span-1">
            <Label className="text-xs font-bold text-foreground">السجل التجاري (س . ت) *</Label>
            <Input
              value={companyCommercialRegister}
              onChange={(e) => setCompanyCommercialRegister(e.target.value)}
              placeholder="110200700036620"
              className="h-9 text-xs font-mono font-bold text-center"
            />
          </div>

          <div className="space-y-1 sm:col-span-1">
            <Label className="text-xs font-bold text-foreground">البطاقة الضريبية (ب . ض) *</Label>
            <Input
              value={companyTaxCard}
              onChange={(e) => setCompanyTaxCard(e.target.value)}
              placeholder="658369652"
              className="h-9 text-xs font-mono font-bold text-center"
            />
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 2: جهة توجيه التظلم ━━━ */}
      <SectionCard
        title="2. الجهة الإدارية الموجه إليها التظلم الرسمي"
        icon={Scale}
        iconColor="text-indigo-600"
      >
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="space-y-1 sm:col-span-1">
            <Label className="text-xs font-bold text-foreground">اللقب والصفة (السيد / ...)</Label>
            <Input
              value={recipientPrefix}
              onChange={(e) => setRecipientPrefix(e.target.value)}
              placeholder="الأستاذ الدكتور"
              className="h-9 text-xs font-bold text-center"
            />
          </div>

          <div className="space-y-1 sm:col-span-3">
            <Label className="text-xs font-bold text-foreground">الصفة الإدارية وجهة الإسناد *</Label>
            <Input
              value={recipientTitleAndAuthority}
              onChange={(e) => setRecipientTitleAndAuthority(e.target.value)}
              placeholder="مدير الادارة العامة للمشتريات والمخازن بجامعة دمنهور"
              className="h-9 text-xs font-bold"
            />
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 3: تفاصيل موضوع التظلم والعملية ━━━ */}
      <SectionCard
        title="3. تفاصيل المناقصة / المزايدة والعملية محل التظلم"
        icon={Layers}
        iconColor="text-amber-600"
      >
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs font-bold text-foreground">اسم العملية المسجلة *</Label>
            <Input
              value={operationRegisteredName}
              onChange={(e) => setOperationRegisteredName(e.target.value)}
              className="h-9 text-xs font-bold"
            />
          </div>

          <div className="space-y-1 sm:col-span-1">
            <Label className="text-xs font-bold text-foreground">رقم العملية *</Label>
            <Input
              value={operationNumber}
              onChange={(e) => setOperationNumber(e.target.value)}
              className="h-9 text-xs font-mono font-bold text-center"
            />
          </div>

          <div className="space-y-1 sm:col-span-1">
            <Label className="text-xs font-bold text-foreground">أسلوب الطرح</Label>
            <Input
              value={tenderMethod}
              onChange={(e) => setTenderMethod(e.target.value)}
              placeholder="المناقصة المحدودة / العامة"
              className="h-9 text-xs text-center"
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs font-bold text-foreground">نطاق التوريد (لزوم كذا) *</Label>
            <Input
              value={operationScope}
              onChange={(e) => setOperationScope(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1 sm:col-span-1">
            <Label className="text-xs font-bold text-foreground">السنة المالية</Label>
            <FiscalYearSelect
              value={fiscalYear}
              onChange={setFiscalYear}
              className="h-9 text-xs text-center font-bold"
            />
          </div>

          <div className="space-y-1 sm:col-span-1">
            <Label className="text-xs font-bold text-foreground">تاريخ الجلسة</Label>
            <Input
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              placeholder="يوم/شهر/سنة"
              className="h-9 text-xs text-center font-mono font-bold"
            />
          </div>

          <div className="space-y-1 sm:col-span-4">
            <Label className="text-xs font-bold text-foreground">
              موضوع وسند التظلم (تظلم من ...) *
            </Label>
            <Input
              value={grievanceSubject}
              onChange={(e) => setGrievanceSubject(e.target.value)}
              placeholder={isTech ? "نتيجة البت الفني – ميعاد الفتح الفني" : "نتيجة البت المالي وفض المظاريف المالية"}
              className="h-9 text-xs font-bold text-foreground bg-background"
            />
            <p className="text-[11px] text-muted-foreground">
              يحدد نص موضوع التظلم في السطر الرئيسي بالخطاب (مثل: نتيجة البت الفني – ميعاد الفتح الفني).
            </p>
          </div>

          <div className="space-y-1 sm:col-span-4">
            <Label className="text-xs font-bold text-foreground">نوع التظلم من الناحية (الجانب الفني / المالي / القانوني)</Label>
            <Input
              value={grievanceAspect}
              onChange={(e) => setGrievanceAspect(e.target.value)}
              placeholder="الفنية والقانونية"
              className="h-9 text-xs font-bold"
            />
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 4: جدول بنود التظلم والأسباب والإجراء التصحيحي ━━━ */}
      <SectionCard
        title="4. جدول البنود والموضوعات المطلوب رفع التظلم عنها (الجدول الرسمي المعتمد)"
        icon={Scale}
        iconColor="text-rose-600"
        badge={
          <Badge className="bg-rose-600 text-white text-xs font-bold px-2 py-0.5">
            {grievanceItems.length} بنود تظلم مسجلة
          </Badge>
        }
        actions={
          <Button
            size="sm"
            onClick={handleAddItem}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-8 px-3 rounded-xl flex items-center gap-1 cursor-pointer shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>إضافة بند تظلم</span>
          </Button>
        }
      >
        <div className="space-y-4">
          {grievanceItems.map((item, idx) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-card border-2 border-border/80 hover:border-rose-500/40 space-y-3 transition-all shadow-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-600 font-black text-xs flex items-center justify-center font-mono">
                    {idx + 1}
                  </div>
                  <span className="font-extrabold text-xs text-foreground">
                    بند التظلم رقم ({idx + 1}):
                  </span>
                </div>

                {grievanceItems.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveItem(item.id)}
                    className="h-7 px-2 text-rose-600 hover:bg-rose-500/10 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5 ml-1" />
                    <span>حذف البند</span>
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1 sm:col-span-3">
                  <Label className="text-[11px] font-bold text-foreground">إســــم البند المراد التظلم بشأنه *</Label>
                  <Input
                    value={item.clauseName}
                    onChange={(e) => handleUpdateItem(item.id, "clauseName", e.target.value)}
                    placeholder="مثلاً: بند الكاوتش مقاس 1200 / 20 سلك أو بند الأسعار المقدمة"
                    className="h-8.5 text-xs font-bold"
                  />
                </div>

                <div className="space-y-1 sm:col-span-1">
                  <Label className="text-[11px] font-bold text-foreground">رقم البند بالكراسة</Label>
                  <Input
                    value={item.clauseNumber}
                    onChange={(e) => handleUpdateItem(item.id, "clauseNumber", e.target.value)}
                    placeholder="1"
                    className="h-8.5 text-xs text-center font-mono font-bold"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    الوصف أو الإجراء المتخذ (سبب الاستبعاد المعترض عليه) *
                  </Label>
                  <Textarea
                    rows={2}
                    value={item.actionTakenOrReason}
                    onChange={(e) => handleUpdateItem(item.id, "actionTakenOrReason", e.target.value)}
                    placeholder="بيان سبب الاستبعاد الصادر من اللجنة الفنية أو المالية..."
                    className="text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    طريقة تصحيح الخطأ (الإجراء التصحيحي المطلوب قانوناً) *
                  </Label>
                  <Textarea
                    rows={2}
                    value={item.correctiveAction}
                    onChange={(e) => handleUpdateItem(item.id, "correctiveAction", e.target.value)}
                    placeholder="الإجراء الواجب اتخاذه وقبول المطابقة وإلغاء الاستبعاد..."
                    className="text-xs rounded-xl"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ━━━ SECTION 5: الطلب الختامي للتظلم ━━━ */}
      <SectionCard
        title="5. الطلب الختامي للتظلم (لذا الرجاء من سيادتكم التكرم ...)"
        icon={Sparkles}
        iconColor="text-amber-500"
      >
        <div className="space-y-2">
          <Label className="text-xs font-bold text-foreground">نص الطلب الرسمي الموجه للسلطة المختصة *</Label>
          <Textarea
            rows={3}
            value={grievanceRequest}
            onChange={(e) => setGrievanceRequest(e.target.value)}
            placeholder="لذا الرجاء من سيادتكم التكرم بإعادة فحص العطاء الفني/المالي وإلغاء قرار الاستبعاد..."
            className="text-xs rounded-xl leading-relaxed font-medium"
          />
        </div>
      </SectionCard>

      {/* ━━━ SECTION 6: التوقيعات والاعتمادات الرسمية ━━━ */}
      <SectionCard
        title="6. التوقيعات والاعتمادات الرسمية المعتمدة لخطاب التظلم"
        icon={FileCheck}
        iconColor="text-emerald-600"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">المهندس / القانوني المختص</Label>
            <Input
              value={specialistName}
              onChange={(e) => setSpecialistName(e.target.value)}
              placeholder="أحمد محمد (أو اسم القانوني المختص)"
              className="h-9.5 text-xs font-bold rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">المدير المالي</Label>
            <Input
              value={financeManagerName}
              onChange={(e) => setFinanceManagerName(e.target.value)}
              placeholder="محمود إبراهيم (أو اسم المدير المالي)"
              className="h-9.5 text-xs font-bold rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">اعتماد رئيس مجلس الإدارة</Label>
            <Input
              value={boardChairman}
              onChange={(e) => setBoardChairman(e.target.value)}
              placeholder="رئيس مجلس الإدارة"
              className="h-9.5 text-xs font-bold rounded-xl"
            />
          </div>
        </div>
      </SectionCard>

      {/* ━━━ BOTTOM ACTION BAR ━━━ */}
      <LetterBottomActionWidget
        title={isTech ? "خطاب التظلم الفني الرسمي" : "خطاب التظلم المالي الرسمي"}
        registrationNumber={registrationNumber}
        isDirty={isDirty}
        onPreview={handleOpenPreview}
        onSave={handleSaveData}
        saving={savingLetter}
        onAddToArchive={handleToggleArchive}
        isArchived={isArchived}
        addingToArchive={addingToArchive}
        customSubtitle={isTech ? "التظلم القانوني من قرارات لجنة البت الفني" : "التظلم القانوني والمحاسبي من قرارات لجنة البت المالي"}
        icon={Scale}
      />

      {/* ━━━ MODAL: OnlyOffice & Full Word Document Viewer ━━━ */}
      {previewModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-6xl h-[95vh] flex flex-col p-4 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                    <Scale className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      {isTech ? "معاينة خطاب التظلم الفني المعتمد (.docx)" : "معاينة خطاب التظلم المالي المعتمد (.docx)"}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      معاينة حية ومطابقة 100% لقالب الوورد الأصلي مع دعم التحميل والطباعة المباشرة
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenPreview(true)}
                    disabled={renderingDocx}
                    className="h-8 text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ml-1 ${renderingDocx ? "animate-spin" : ""}`} />
                    <span>تحديث المعاينة</span>
                  </Button>

                  {onClose && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPreviewModalOpen(false);
                        onClose();
                      }}
                      className="h-8 text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/60 font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>الرجوع لحالة التظلم ↩️</span>
                    </Button>
                  )}

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleCloseModal}
                    className="h-8 w-8 text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden pt-3 flex flex-col">
                {renderingDocx ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 text-center bg-slate-950 rounded-2xl">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shadow-lg">
                      <RefreshCw className="h-8 w-8 animate-spin text-rose-500" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white">جاري معالجة وتوليد المعاينة الأصلية لخطاب التظلم...</h4>
                      <p className="text-xs text-slate-400">تطبيق جدول البنود والباركود والمتغيرات بدقة 100%</p>
                    </div>
                  </div>
                ) : (
                  <OnlyOfficeDocViewer
                    documentTitle={`خطاب_تظلم_${isTech ? "فني" : "مالي"}_${op.externalNumber || op.serialNumber}_${registrationNumber}.docx`}
                    docxBlob={previewDocxBlob}
                    pdfBlob={previewPdfBlob}
                    onDownloadDocx={handleDownloadDocx}
                    onDownloadPdf={handleDownloadPdf}
                    onPrint={handlePrintWordDocument}
                    onAddToArchive={handleToggleArchive}
                    isArchived={isArchived}
                    addingToArchive={addingToArchive}
                    cloudUploadWarning={
                      cloudPdfUrl && currentSnapshot !== lastGeneratedSnapshot
                        ? "تنبيه هام: هذا الخطاب يحتوي على تعديلات جديدة لم يتم رفعها سحابياً — يرجى الضغط على 'إعادة الرفع والتحديث' لكي يتطابق الباركود مع أحدث بيانات!"
                        : null
                    }
                    onUploadCloud={() => handleUploadToCloud(true)}
                    isUploadingCloud={uploadingCloud}
                  />
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
