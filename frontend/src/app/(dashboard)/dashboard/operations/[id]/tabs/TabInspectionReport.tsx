"use client";

import React, { useState, useMemo, useEffect } from "react";
import JSZip from "jszip";
import {
  Building2,
  FileText,
  Calendar,
  Layers,
  Plus,
  Trash2,
  RefreshCw,
  X,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  ClipboardCheck,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
  Download,
  Printer,
  Eye,
  Check,
  FileSignature,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/lib/api";
import { Portal } from "@/components/ui/portal";
import { OnlyOfficeDocViewer } from "@/components/OnlyOfficeDocViewer";
import { Operation, SectionCard } from "./types";
import { StepFooterNav } from "./StepFooterNav";
import {
  isValidCloudDocUrl,
  escapeXml,
  cleanAllDocxXml,
  buildQrAnchorXml,
  injectSingleQrIntoDocXml,
  getLetterSpecificRegistrationNumber,
  regenerateLetterSpecificRegistrationNumber,
  LetterQrCloudCard,
  LetterBottomActionWidget,
  ReprintConfirmModal,
  PdfExportLoadingModal,
  PrintHistoryEntry,
  getCurrentUserName,
  generateHighResDocQrBuffer,
  getStandardDocQrPayload,
} from "./letter-utils";
import { getPdfBlobFromDocx, uploadPdfToFreeCloud } from "./client-pdf";
import {
  getArchivedLetterInfo,
  saveLetterToArchiveWithVersion,
  loadArchivedPdfBlob,
} from "./archive-utils";
import { SmartArabicDatePicker } from "@/components/ui/arabic-date-picker";

export interface InspectionReportItem {
  id: string;
  name: string;
  unit: string;
  quantity: string;
  technicalDescription: string;
  notes: string;
}

export interface TabInspectionReportProps {
  op: Operation;
  onRefresh: () => void;
  onNavigate?: (tabId: string) => void;
  onPreviewDoc?: (doc: any) => void;
  onDownloadDoc?: (doc: any) => void;
}

const ARABIC_DAYS = [
  "السبت",
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
];

function getArabicDayNameFromDate(dateStr: string): string {
  if (!dateStr) return "الأربعاء";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "الأربعاء";
    const days = [
      "الأحد",
      "الإثنين",
      "الثلاثاء",
      "الأربعاء",
      "الخميس",
      "الجمعة",
      "السبت",
    ];
    return days[d.getDay()] || "الأربعاء";
  } catch {
    return "الأربعاء";
  }
}

function buildInspectionTableRowsXml(items: InspectionReportItem[]): string {
  let rowsXml = "";
  const borderStr =
    '<w:top w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/><w:left w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/><w:bottom w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/><w:right w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/>';

  const makeCell = (w: number, text: string, align: "center" | "right" = "center") => {
    return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:tcBorders>${borderStr}</w:tcBorders><w:hideMark/></w:tcPr><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="${align}"/><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(text)}</w:t></w:r></w:p></w:tc>`;
  };

  const safeItems = items && items.length > 0 ? items : [
    {
      id: "def-1",
      name: "الأعمال والتوريدات المطلوبة",
      unit: "مقطوعية",
      quantity: "1",
      technicalDescription: "مطابق للشروط والمواصفات الفنية المعتمدة",
      notes: "بحالة جيدة وصالحة للاستخدام",
    },
  ];

  safeItems.forEach((item, idx) => {
    const trPr = `<w:trPr><w:trHeight w:val="330"/></w:trPr>`;
    const c0 = makeCell(560, String(idx + 1), "center");
    const c1 = makeCell(3589, item.name || "—", "right");
    const c2 = makeCell(976, item.unit || "عدد", "center");
    const c3 = makeCell(989, item.quantity || "1", "center");
    const c4 = makeCell(2793, item.technicalDescription || "مطابق للمواصفات الفنية", "right");
    const c5 = makeCell(1240, item.notes || "بحالة جيدة", "right");
    rowsXml += `<w:tr>${trPr}${c0}${c1}${c2}${c3}${c4}${c5}</w:tr>`;
  });

  return rowsXml;
}

export function TabInspectionReport({
  op,
  onRefresh,
  onNavigate,
  onPreviewDoc,
  onDownloadDoc,
}: TabInspectionReportProps) {
  // قراءة بيانات محضر المعاينة المحفوظة مسبقاً في ملاحظات العملية
  const savedReport = useMemo(() => {
    try {
      if (op.notes && op.notes.startsWith("{")) {
        const parsed = JSON.parse(op.notes);
        return parsed.inspectionReport || null;
      }
    } catch {}
    return null;
  }, [op.notes]);

  // قائمة الشركات المشاركة بالعملية
  const companiesList = useMemo(() => op.companies || [], [op.companies]);

  // الشركة المحددة
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => {
    if (savedReport?.selectedCompanyId) return savedReport.selectedCompanyId;
    return companiesList[0]?.companyId || "";
  });

  const currentCompanyLink = useMemo(() => {
    return companiesList.find((c) => c.companyId === selectedCompanyId) || companiesList[0];
  }, [companiesList, selectedCompanyId]);

  const currentCompany = currentCompanyLink?.company;

  // رقم القيد الصادر
  const [registrationNumber, setRegistrationNumber] = useState<string>(() => {
    if (savedReport?.registrationNumber) return savedReport.registrationNumber;
    return getLetterSpecificRegistrationNumber(
      op,
      "inspection_report",
      currentCompanyLink?.displayCode || "AZ"
    );
  });

  const handleRegenerateRef = async () => {
    await regenerateLetterSpecificRegistrationNumber({
      op,
      letterKey: "inspection_report",
      companyCode: currentCompanyLink?.displayCode || "AZ",
      onSuccess: (fresh) => {
        setRegistrationNumber(fresh);
        onRefresh();
      },
    });
  };

  // بيانات الترويسة الرسمية
  const [companyOpCode, setCompanyOpCode] = useState(() => {
    return (
      savedReport?.companyOpCode ||
      currentCompanyLink?.displayCode ||
      op.externalNumber ||
      `AZ-0${op.serialNumber || 1}`
    );
  });

  const [outgoingDate, setOutgoingDate] = useState(() => {
    return (
      savedReport?.outgoingDate ||
      new Date().toLocaleDateString("ar-EG-u-nu-latn", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }) ||
      "15/10/2026"
    );
  });

  const [companyCommercialRegister, setCompanyCommercialRegister] = useState(() => {
    return (
      savedReport?.commercialRegister ||
      currentCompany?.commercialRegister ||
      "110200700036620"
    );
  });

  const [companyTaxCard, setCompanyTaxCard] = useState(() => {
    return savedReport?.taxCard || currentCompany?.taxCard || "658369652";
  });

  const [phoneWhatsapp, setPhoneWhatsapp] = useState(() => {
    return savedReport?.companyPhone || currentCompany?.phone || "01091708818";
  });

  const [phoneMobile, setPhoneMobile] = useState(() => {
    return savedReport?.companyMobile || "01557018818";
  });

  const [companyAddress, setCompanyAddress] = useState(() => {
    return (
      savedReport?.companyAddress ||
      currentCompany?.address ||
      "بجوار مستشفى ليدى كير - بدمنهور - البحيره"
    );
  });

  const [companyEmail, setCompanyEmail] = useState(() => {
    return (
      savedReport?.companyEmail ||
      currentCompany?.email ||
      "goldengolden8818@gmail.com"
    );
  });

  // تحديث بيانات الترويسة تلقائياً عند تغيير الشركة المحددة
  useEffect(() => {
    if (currentCompany) {
      if (currentCompany.commercialRegister) setCompanyCommercialRegister(currentCompany.commercialRegister);
      if (currentCompany.taxCard) setCompanyTaxCard(currentCompany.taxCard);
      if (currentCompany.phone) setPhoneWhatsapp(currentCompany.phone);
      if (currentCompany.address) setCompanyAddress(currentCompany.address);
      if (currentCompany.email) setCompanyEmail(currentCompany.email);
      if (currentCompanyLink?.displayCode) {
        setCompanyOpCode(currentCompanyLink.displayCode);
      }
    }
  }, [currentCompany, currentCompanyLink]);

  // ━━━ بيانات المعاينة الميدانية واللجنة ━━━
  const [siteLocation, setSiteLocation] = useState<string>(() => {
    return savedReport?.siteLocation || op.authority || op.name || "عنبر التسمين بقرية المعصرة - مركز الداخلة";
  });

  const [inspectionDate, setInspectionDate] = useState<string>(() => {
    return (
      savedReport?.inspectionDate ||
      new Date().toLocaleDateString("ar-EG-u-nu-latn", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }) ||
      "2026/10/28"
    );
  });

  const [dayOfWeek, setDayOfWeek] = useState<string>(() => {
    return savedReport?.dayOfWeek || getArabicDayNameFromDate(inspectionDate);
  });

  // تحديث يوم الأسبوع تلقائياً عند تغيير تاريخ المعاينة إذا لم يتم تعديله يدوياً
  useEffect(() => {
    if (inspectionDate) {
      const computedDay = getArabicDayNameFromDate(inspectionDate);
      if (computedDay) setDayOfWeek(computedDay);
    }
  }, [inspectionDate]);

  const [requestNumber, setRequestNumber] = useState<string>(() => {
    if (savedReport?.requestNumber) return savedReport.requestNumber;
    if (op.externalNumber) return `طلب رقم ${op.externalNumber}`;
    return `تكليف رقم ${op.serialNumber} لسنة ${new Date().getFullYear()}`;
  });

  // أعضاء لجنة المعاينة الأربعة
  const [member1, setMember1] = useState<string>(() => {
    return savedReport?.member1 || "1- م / أحمد محمد أحمد (مهندس التنفيذ والموقع)";
  });
  const [member2, setMember2] = useState<string>(() => {
    return savedReport?.member2 || "2- م / محمود إبراهيم خليل (عضو اللجنة الفنية)";
  });
  const [member3, setMember3] = useState<string>(() => {
    return savedReport?.member3 || "3- أ / مصطفى كمال السيد (مندوب المخازن والمشتريات)";
  });
  const [member4, setMember4] = useState<string>(() => {
    return savedReport?.member4 || "4- أ / إسلام علي محمد (مندوب الشركة المفوض)";
  });

  // ━━━ جدول الأصناف والأعمال محل الفحص والمعاينة ━━━
  const [items, setItems] = useState<InspectionReportItem[]>(() => {
    if (savedReport?.items && Array.isArray(savedReport.items) && savedReport.items.length > 0) {
      return savedReport.items;
    }
    // استيراد أولي من بنود العملية إن وجدت
    const anyOp = op as any;
    const existing = anyOp.items || anyOp.financialItems || [];
    if (Array.isArray(existing) && existing.length > 0) {
      return existing.slice(0, 10).map((it: any, idx: number) => ({
        id: `insp-item-${idx + 1}`,
        name: it.name || it.itemName || `بند رقم ${idx + 1}`,
        unit: it.unit || "عدد",
        quantity: String(it.quantity || "1"),
        technicalDescription: it.description || it.specs || "مطابق للمواصفات الفنية والشروط",
        notes: "بحالة جيدة وصالحة للاستخدام",
      }));
    }
    return [
      {
        id: "insp-item-1",
        name: op.name || "أعمال تأجير وصيانة عنبر التسمين",
        unit: "مقطوعية",
        quantity: "1",
        technicalDescription: "مطابق لكافة الشروط والمواصفات الفنية المعتمدة",
        notes: "بحالة جيدة وصالحة للتشغيل",
      },
    ];
  });

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `insp-item-${Date.now()}`,
        name: "",
        unit: "عدد",
        quantity: "1",
        technicalDescription: "مطابق للشروط والمواصفات الفنية",
        notes: "بحالة جيدة",
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      toast.warning("يجب الإبقاء على بند واحد على الأقل في محضر المعاينة");
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof InspectionReportItem, val: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: val } : it)));
  };

  const handleImportOperationItems = () => {
    const anyOp = op as any;
    const existing = anyOp.items || anyOp.financialItems || [];
    if (Array.isArray(existing) && existing.length > 0) {
      const imported: InspectionReportItem[] = existing.map((it: any, idx: number) => ({
        id: `insp-item-imp-${Date.now()}-${idx}`,
        name: it.name || it.itemName || `بند رقم ${idx + 1}`,
        unit: it.unit || "عدد",
        quantity: String(it.quantity || "1"),
        technicalDescription: it.description || it.specs || "مطابق للمواصفات الفنية",
        notes: "بحالة جيدة",
      }));
      setItems(imported);
      toast.success(`تم استيراد ${imported.length} بنداً من بنود العملية بنجاح! 📦`);
    } else {
      toast.info("لم يتم العثور على بنود مسجلة في العملية، تم الإبقاء على البنود الحالية.");
    }
  };

  // ━━━ قرار ورأي اللجنة والتوصيات الفنية ━━━
  const [committeeOpinion, setCommitteeOpinion] = useState<string>(() => {
    return (
      savedReport?.committeeOpinion ||
      "تمت المعاينة والفحص الفعلي والدقيق لكافة الأعمال والأصناف على الطبيعة وتبين مطابقتها التامة لكافة الشروط والمواصفات الفنية المطلوبة دون أي ملاحظات جوهرية."
    );
  });

  const [technicalNotes, setTechnicalNotes] = useState<string>(() => {
    return (
      savedReport?.technicalNotes ||
      "تمت مراجعة التركيبات واختبارات التشغيل على الطبيعة وجميع الأعمال مطابقة ومستقرة وتعمل بكفاءة وانتظام."
    );
  });

  const [requiredAction, setRequiredAction] = useState<string>(() => {
    return (
      savedReport?.requiredAction ||
      "توريد وصيانة وإصلاح واستلام نهائي"
    );
  });

  const [executionPeriod, setExecutionPeriod] = useState<string>(() => {
    return savedReport?.executionPeriod || "خلال اسبوعان";
  });

  const [attachments, setAttachments] = useState<string>(() => {
    return (
      savedReport?.attachments ||
      "صور سجلات توقيعات كتالوجات أجزاء"
    );
  });

  const [additionalNotes, setAdditionalNotes] = useState<string>(() => {
    return (
      savedReport?.additionalNotes ||
      "تم تحرير هذا المحضر بعد المعاينة الميدانية لإثبات الحالة واتخاذ اللازم رسمياً."
    );
  });

  // ━━━ التوقيعات والاعتمادات الرسمية ━━━
  const [engineerName, setEngineerName] = useState<string>(() => {
    return savedReport?.engineerName || "م / أحمد محمد";
  });

  const [financeManagerName, setFinanceManagerName] = useState<string>(() => {
    return savedReport?.financeManagerName || "المدير المالي";
  });

  const [chairmanName, setChairmanName] = useState<string>(() => {
    return (
      savedReport?.chairmanName ||
      currentCompany?.owner ||
      "رئيس مجلس الإدارة"
    );
  });

  const [entityApprovalText, setEntityApprovalText] = useState<string>(() => {
    return savedReport?.entityApprovalText || "إعتماد الجهه يعتمد ,,";
  });

  // سجل الطباعة والنسخ
  const [printHistory, setPrintHistory] = useState<PrintHistoryEntry>(() => {
    return (
      savedReport?.printHistory || {
        printCount: 0,
      }
    );
  });

  // رابط سحابة Cloudflare R2
  const [cloudPdfUrl, setCloudPdfUrl] = useState<string>(() => {
    return savedReport?.cloudUrl || "";
  });
  const [uploadingCloud, setUploadingCloud] = useState(false);

  // لقطة التغييرات لاكتشاف التعديلات وتفعيل التحميل الفوري بـ 0ms
  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      selectedCompanyId,
      companyOpCode,
      registrationNumber,
      outgoingDate,
      companyCommercialRegister,
      companyTaxCard,
      phoneWhatsapp,
      phoneMobile,
      companyAddress,
      companyEmail,
      siteLocation,
      dayOfWeek,
      inspectionDate,
      requestNumber,
      member1,
      member2,
      member3,
      member4,
      items,
      committeeOpinion,
      technicalNotes,
      requiredAction,
      executionPeriod,
      attachments,
      additionalNotes,
      engineerName,
      financeManagerName,
      chairmanName,
      entityApprovalText,
    });
  }, [
    selectedCompanyId,
    companyOpCode,
    registrationNumber,
    outgoingDate,
    companyCommercialRegister,
    companyTaxCard,
    phoneWhatsapp,
    phoneMobile,
    companyAddress,
    companyEmail,
    siteLocation,
    dayOfWeek,
    inspectionDate,
    requestNumber,
    member1,
    member2,
    member3,
    member4,
    items,
    committeeOpinion,
    technicalNotes,
    requiredAction,
    executionPeriod,
    attachments,
    additionalNotes,
    engineerName,
    financeManagerName,
    chairmanName,
    entityApprovalText,
  ]);

  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => currentSnapshot);
  const isDirty = useMemo(() => currentSnapshot !== savedSnapshot, [currentSnapshot, savedSnapshot]);

  // حفظ التعديلات في ملاحظات العملية
  const [savingNotes, setSavingNotes] = useState(false);
  const handleSaveData = async () => {
    setSavingNotes(true);
    try {
      let notesObj: any = {};
      if (op.notes && op.notes.startsWith("{")) {
        try {
          notesObj = JSON.parse(op.notes);
        } catch {}
      }

      const reportData = {
        selectedCompanyId,
        companyOpCode,
        registrationNumber,
        outgoingDate,
        commercialRegister: companyCommercialRegister,
        taxCard: companyTaxCard,
        companyPhone: phoneWhatsapp,
        companyMobile: phoneMobile,
        companyAddress,
        companyEmail,
        siteLocation,
        dayOfWeek,
        inspectionDate,
        requestNumber,
        member1,
        member2,
        member3,
        member4,
        items,
        committeeOpinion,
        technicalNotes,
        requiredAction,
        executionPeriod,
        attachments,
        additionalNotes,
        engineerName,
        financeManagerName,
        chairmanName,
        entityApprovalText,
        cloudUrl: cloudPdfUrl,
        printHistory,
      };

      notesObj.inspectionReport = reportData;

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(notesObj),
      });

      setSavedSnapshot(currentSnapshot);
      toast.success("تم حفظ وتحديث بيانات محضر المعاينة بنجاح! 💾✨");
      onRefresh();
    } catch (err: any) {
      toast.error("فشل حفظ البيانات: " + (err?.message || ""));
    } finally {
      setSavingNotes(false);
    }
  };

  // ━━━ محرك توليد مستند الوورد الرسمي لمحضر المعاينة ━━━
  const generateInspectionDocxBlob = async (): Promise<Blob> => {
    const response = await fetch("/templates/inspection_report_template.docx");
    if (!response.ok) throw new Error("فشل قراءة قالب محضر المعاينة من الخادم");
    const templateBuffer = await response.arrayBuffer();

    const zip = await JSZip.loadAsync(templateBuffer);

    let qrDrawingXml = "";
    try {
      const activeCloud = cloudPdfUrl;
      const filename = `inspection_report_${registrationNumber || op.serialNumber || "doc"}.pdf`;
      const qrPayload = await getStandardDocQrPayload(
        activeCloud,
        registrationNumber,
        "محضر المعاينة والفحص الفعلي الرسمي",
        currentCompany?.name || "المجموعة الذهبية",
        filename
      );
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
      console.warn("QR generation failed in TabInspectionReport:", e);
    }

    // 1. ترويسة وتذييل المستند (Headers & Footers)
    for (const filename of Object.keys(zip.files)) {
      if (filename.includes("header") || filename.includes("footer")) {
        let hXml = await zip.file(filename)!.async("text");
        hXml = hXml.replace(/110200700036620/g, escapeXml(companyCommercialRegister || "110200700036620"));
        hXml = hXml.replace(/658369652/g, escapeXml(companyTaxCard || "658369652"));
        hXml = hXml.replace(/كود العملية بالشركه/g, escapeXml(companyOpCode || `AZ-0${op.serialNumber || 1}`));
        hXml = hXml.replace(/15\/10\/2026/g, escapeXml(outgoingDate || "15/10/2026"));
        hXml = hXml.replace(/رقم القيد/g, escapeXml(registrationNumber || "رقم القيد"));
        hXml = hXml.replace(/01091708818/g, escapeXml(phoneWhatsapp || "01091708818"));
        hXml = hXml.replace(/01557018818/g, escapeXml(phoneMobile || "01557018818"));
        hXml = hXml.replace(
          /بجوار مستشفى ليدى كير\s*-\s*بدمنهور\s*-\s*البح\s*يره/g,
          escapeXml(companyAddress || "بجوار مستشفى ليدى كير - بدمنهور - البحيره")
        );
        hXml = hXml.replace(/goldengolden8818@gmail\.com/g, escapeXml(companyEmail || "goldengolden8818@gmail.com"));

        if (currentCompany?.name) {
          hXml = hXml.replace(/جــ\s*ـ\s*ـولـــ\s*ـ\s*دن\s*سـ\s*ـ\s*رفـ\s*ـ\s*ــيس/g, escapeXml(currentCompany.name));
        }

        zip.file(filename, hXml);
      }
    }

    // 2. صلب المستند (word/document.xml)
    let docXml = await zip.file("word/document.xml")!.async("text");
    docXml = injectSingleQrIntoDocXml(docXml, qrDrawingXml, escapeXml(registrationNumber));

    // الموقع الميداني (P1)
    docXml = docXml.replace(/<w:t>\.\.\.\.\.<\/w:t>/g, `<w:t>${escapeXml(siteLocation || "الموقع المذكور")}</w:t>`);
    docXml = docXml.replace(/الموقع\s*:\s*\.{2,}/g, `الموقع : ${escapeXml(siteLocation || "الموقع المذكور")}`);

    // أنه في يوم ... الموافق ... (P2)
    docXml = docXml.replace(/\.أيام الأسبوع \./g, escapeXml(dayOfWeek || "الأربعاء"));
    docXml = docXml.replace(/(<w:t[^>]*>)تاريخ(<\/w:t>)/g, `$1${escapeXml(inspectionDate || "2026/10/28")}$2`);

    // أعضاء اللجنة الأربعة (P3 .. P6)
    const memberValues = [
      member1 || "1- المهندس الاستشاري / مندوب الجهة",
      member2 || "2- عضو اللجنة الفنية المختص",
      member3 || "3- مندوب الشؤون المالية والمخازن",
      member4 || "4- مندوب الشركة المنفذة المفوض",
    ];
    let mIdx = 0;
    docXml = docXml.replace(
      /(<w:numId w:val="5"\/>[\s\S]*?<w:t[^>]*>)\.{4,}(<\/w:t>)/g,
      (_match, before, after) => {
        const val = memberValues[mIdx++] || "—";
        return `${before}${escapeXml(val)}${after}`;
      }
    );

    // طلب / تكليف رقم (...) (P7)
    docXml = docXml.replace(/(<w:t[^>]*>)\(\.\.\.\)(<\/w:t>)/g, `$1(${escapeXml(requestNumber || op.externalNumber || String(op.serialNumber))})$2`);

    // جدول الأصناف والأعمال محل الفحص والمعاينة (TABLE 0)
    const tableMatch = docXml.match(/<w:tbl[\s\S]*?<\/w:tbl>/);
    if (tableMatch) {
      const originalTable = tableMatch[0];
      const rows = originalTable.match(/<w:tr[\s\S]*?<\/w:tr>/g) || [];
      if (rows.length > 0) {
        const headerRow = rows[0];
        const newRowsXml = buildInspectionTableRowsXml(items);
        const newTable = originalTable.replace(
          /<w:tr[\s\S]*<\/w:tr>/,
          () => `${headerRow}${newRowsXml}`
        );
        docXml = docXml.replace(originalTable, () => newTable);
      }
    }

    // قرار ورأي اللجنة (P44)
    docXml = docXml.replace(
      /<w:t>\.{40,}<\/w:t>/g,
      `<w:t>${escapeXml(committeeOpinion || "تمت المعاينة والفحص والأعمال مطابقة للشروط والمواصفات.")}</w:t>`
    );

    // الملاحظات الفنية (P45)
    docXml = docXml.replace(
      /<w:t>\.{20,}<\/w:t>/g,
      `<w:t>${escapeXml(technicalNotes || "لا توجد أي معوقات فنية والتشغيل مستقر.")}</w:t>`
    );

    // الإجراء المطلوب (P46)
    docXml = docXml.replace(
      /\/ توريد \/ صيانة \/ بشكل عاجل \/بشكل دورى \/ صيانة وإصلاح/g,
      escapeXml(requiredAction || "توريد وصيانة وإصلاح")
    );

    // مدة التنفيذ (P47)
    docXml = docXml.replace(
      /ومدة التنفيذ خلال اسبوعان/g,
      `ومدة التنفيذ خلال ${escapeXml(executionPeriod || "اسبوعان")}`
    );

    // المرفقات (P48)
    docXml = docXml.replace(
      /صور سجلات توقيعات كتالوجات أجزاء/g,
      escapeXml(attachments || "صور سجلات توقيعات كتالوجات أجزاء")
    );

    // توقيعات أعضاء اللجنة (P50)
    docXml = docXml.replace(
      /1-\s*\.{10,}\s*2-\s*\.{10,}\s*3-\s*\.{10,}\s*4-\s*\.{10,}/g,
      `1- ${escapeXml(member1 || ".............")}   2- ${escapeXml(member2 || ".............")}   3- ${escapeXml(member3 || ".............")}   4- ${escapeXml(member4 || ".............")}`
    );

    // توقيعات الإدارة والمسؤولين (P53)
    docXml = docXml.replace(/(<w:t[^>]*>)أحمد محمد(<\/w:t>)/g, `$1${escapeXml(engineerName || "م / أحمد محمد")}$2`);
    docXml = docXml.replace(/(<w:t[^>]*>)أو اسم(<\/w:t>)/g, `$1${escapeXml(financeManagerName || "المدير المالي")}$2`);
    docXml = docXml.replace(/(<w:t[^>]*>)رئيس مجلس الإدارة(<\/w:t>)/g, `$1${escapeXml(chairmanName || "رئيس مجلس الإدارة")}$2`);

    // اعتماد الجهة (P56)
    docXml = docXml.replace(/إعتماد الجه<\/w:t><w:t>ه يعتمد ,,/g, escapeXml(entityApprovalText || "إعتماد الجهة يعتمد ,,"));

    // ملاحظة إضافية (P58)
    docXml = docXml.replace(/خانة لكتابة ملاحظة/g, escapeXml(additionalNotes || "تم تحرير المحضر بعد المعاينة الميدانية لإثبات الحالة واتخاذ اللازم."));

    // تنظيف كل التظليلات الحمراء وضمان نقاء التنسيق
    docXml = docXml.replace(/<w:highlight[^>]*\/>/g, "");

    zip.file("word/document.xml", docXml);
    await cleanAllDocxXml(zip);

    return await zip.generateAsync({ type: "blob" });
  };

  // ━━━ المعاينة الحية وإدارة الـ PDF ━━━
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDocxBlob, setPreviewDocxBlob] = useState<Blob | null>(null);
  const [previewPdfBlob, setPreviewPdfBlob] = useState<Blob | null>(null);
  const [renderingDocx, setRenderingDocx] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [reprintWarningOpen, setReprintWarningOpen] = useState(false);
  const [lastGeneratedSnapshot, setLastGeneratedSnapshot] = useState("");

  const docKey = "letter-inspection-report";
  const archiveInfo = useMemo(() => getArchivedLetterInfo(op, docKey), [op, docKey]);
  const isArchived = useMemo(() => {
    if (isDirty) return false;
    return archiveInfo.isArchived;
  }, [archiveInfo, isDirty]);

  const loadOfficialPreview = async (forceRefresh = false) => {
    setPreviewModalOpen(true);

    if (!forceRefresh && previewPdfBlob && lastGeneratedSnapshot === currentSnapshot) {
      return;
    }

    // تحميل فوري مباشر من الأرشيف (0ms) إذا لم تطرأ تعديلات
    if (!forceRefresh && !isDirty) {
      try {
        const cached = await loadArchivedPdfBlob(op, docKey);
        if (cached?.blob) {
          setPreviewPdfBlob(cached.blob);
          setLastGeneratedSnapshot(currentSnapshot);
          toast.success(`تم فتح النسخة المؤرشفة مباشرة (نسخة رقم ${cached.version}) ⚡`);
          return;
        }
      } catch (err) {
        console.warn("Could not load cached inspection report:", err);
      }
    }

    if (renderingDocx) return;

    setRenderingDocx(true);
    if (forceRefresh) {
      toast.info("جاري تحديث معاينة محضر المعاينة الرسمي...");
    }

    try {
      const docx = await generateInspectionDocxBlob();
      setPreviewDocxBlob(docx);

      const pdf = await getPdfBlobFromDocx(
        docx,
        `inspection_report_${registrationNumber || op.serialNumber}.docx`
      );
      setPreviewPdfBlob(pdf);
      setLastGeneratedSnapshot(currentSnapshot);

      // رفع تلقائي فوري لسحابة Cloudflare R2 لربط الباركود
      const cloudFilename = `inspection_report_${registrationNumber || op.serialNumber || "doc"}.pdf`;
      uploadPdfToFreeCloud(pdf, cloudFilename)
        .then((cloudRes) => {
          if (cloudRes?.url) {
            setCloudPdfUrl(cloudRes.url);
            try {
              let notesObj: any = {};
              if (op.notes && op.notes.startsWith("{")) notesObj = JSON.parse(op.notes);
              if (!notesObj.inspectionReport) notesObj.inspectionReport = {};
              notesObj.inspectionReport.cloudUrl = cloudRes.url;
              api.patch(`/operations/${op.id}`, { notes: JSON.stringify(notesObj) }).catch(() => {});
            } catch {}
          }
        })
        .catch((e) => console.warn("Cloudflare R2 upload for inspection report:", e));

      if (forceRefresh) {
        toast.success("تم تحديث المعاينة بنجاح ✓");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("فشل تجهيز معاينة محضر المعاينة: " + (err?.message || ""));
    } finally {
      setRenderingDocx(false);
    }
  };

  useEffect(() => {
    if (previewModalOpen) {
      loadOfficialPreview();
    }
  }, [previewModalOpen]);

  // تنزيل بصيغة Word
  const handleDownloadDocx = async () => {
    try {
      toast.info("جاري تجهيز مستند الوورد الأصلي...");
      const docx = previewDocxBlob || (await generateInspectionDocxBlob());
      const url = URL.createObjectURL(docx);
      const a = document.createElement("a");
      a.href = url;
      a.download = `محضر_معاينة_${op.externalNumber || op.serialNumber}_${registrationNumber}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل مستند الوورد الأصلي بنجاح! 📑✨");
    } catch (err: any) {
      toast.error("فشل تنزيل ملف الوورد: " + (err?.message || ""));
    }
  };

  // تنزيل بصيغة PDF
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      toast.info("جاري تحويل المستند إلى PDF عالي الدقة...");
      const pdf = previewPdfBlob || (await getPdfBlobFromDocx(await generateInspectionDocxBlob(), "inspection_report.docx"));
      const url = URL.createObjectURL(pdf);
      const a = document.createElement("a");
      a.href = url;
      a.download = `محضر_معاينة_${op.externalNumber || op.serialNumber}_${registrationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تحويل وتنزيل ملف الـ PDF الرسمي بنجاح! 📑✨");
    } catch (err: any) {
      toast.error("فشل تنزيل ملف الـ PDF: " + (err?.message || ""));
    } finally {
      setDownloadingPdf(false);
    }
  };

  // تنفيذ الطباعة المباشرة
  const executePrintDoc = async () => {
    try {
      const pdf = previewPdfBlob || (await getPdfBlobFromDocx(await generateInspectionDocxBlob(), "inspection_report.docx"));
      const pdfUrl = URL.createObjectURL(pdf);

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.src = pdfUrl;
      document.body.appendChild(iframe);

      let triggered = false;
      const triggerPrint = () => {
        if (triggered) return;
        triggered = true;
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.open(pdfUrl, "_blank")?.print();
        }
      };

      iframe.onload = () => setTimeout(triggerPrint, 350);
      setTimeout(triggerPrint, 1500);

      // تحديث سجل الطباعة
      const currentUser = getCurrentUserName();
      const updatedHistory: PrintHistoryEntry = {
        printCount: (printHistory.printCount || 0) + 1,
        firstPrintedAt: printHistory.firstPrintedAt || new Date().toISOString(),
        lastPrintedAt: new Date().toISOString(),
        printedBy: currentUser,
        registrationNumber: printHistory.registrationNumber || registrationNumber,
        items: [
          ...(printHistory.items || []),
          {
            printedAt: new Date().toISOString(),
            printedBy: currentUser,
            registrationNumber,
          },
        ],
      };
      setPrintHistory(updatedHistory);

      try {
        let notesObj: any = {};
        if (op.notes && op.notes.startsWith("{")) notesObj = JSON.parse(op.notes);
        if (!notesObj.inspectionReport) notesObj.inspectionReport = {};
        notesObj.inspectionReport.printHistory = updatedHistory;
        notesObj.inspectionReport.registrationNumber = registrationNumber;
        await api.patch(`/operations/${op.id}`, { notes: JSON.stringify(notesObj) });
      } catch {}

      toast.success("تم إرسال محضر المعاينة للطباعة وتحديث سجل الطباعة الرسمي بنجاح ✓");
    } catch (err: any) {
      toast.error("فشل تجهيز الطباعة: " + (err?.message || ""));
    }
  };

  const handlePrintDocument = async () => {
    if (printHistory && printHistory.printCount > 0) {
      setReprintWarningOpen(true);
      return;
    }
    await executePrintDoc();
  };

  // الحفظ في الأرشيف
  const [addingToArchive, setAddingToArchive] = useState(false);
  const handleToggleArchive = async () => {
    setAddingToArchive(true);
    try {
      if (isDirty) {
        await handleSaveData();
      }

      toast.info("جاري توثيق وأرشفة محضر المعاينة الرسمي...");
      const pdf = previewPdfBlob || (await getPdfBlobFromDocx(await generateInspectionDocxBlob(), "inspection_report.docx"));

      const { versionName } = await saveLetterToArchiveWithVersion({
        op,
        docKey,
        title: "محضر المعاينة والفحص الفعلي",
        pdfBlob: pdf,
        currentSnapshot,
        docType: "LETTER",
        companyId: selectedCompanyId,
        registrationNumber,
      });

      toast.success(`تمت إضافة محضر المعاينة للأرشيف بنجاح (${versionName})! 📦✨`);
      onRefresh();
    } catch (err: any) {
      toast.error("فشل حفظ المستند في الأرشيف: " + (err?.message || ""));
    } finally {
      setAddingToArchive(false);
    }
  };

  // إعادة رفع المستند سحابياً لربط الباركود
  const handleUploadToCloud = async (notify = true) => {
    setUploadingCloud(true);
    try {
      const pdf = previewPdfBlob || (await getPdfBlobFromDocx(await generateInspectionDocxBlob(), "inspection_report.docx"));
      const cloudFilename = `inspection_report_${registrationNumber || op.serialNumber || "doc"}.pdf`;
      const cloudRes = await uploadPdfToFreeCloud(pdf, cloudFilename);

      if (cloudRes?.url) {
        setCloudPdfUrl(cloudRes.url);
        let notesObj: any = {};
        if (op.notes && op.notes.startsWith("{")) notesObj = JSON.parse(op.notes);
        if (!notesObj.inspectionReport) notesObj.inspectionReport = {};
        notesObj.inspectionReport.cloudUrl = cloudRes.url;
        await api.patch(`/operations/${op.id}`, { notes: JSON.stringify(notesObj) });
        if (notify) toast.success("تم رفع محضر المعاينة سحابياً وتفعيل الباركود الذكي بنجاح! ☁️✨");
      }
    } catch (err: any) {
      if (notify) toast.error("فشل الرفع السحابي: " + (err?.message || ""));
    } finally {
      setUploadingCloud(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      {/* ━━━ شريط الإجراءات العلوي لمحضر المعاينة ━━━ */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-600 text-white font-mono text-[10px] font-bold">
              مرحلة #17
            </Badge>
            <h3 className="text-lg sm:text-xl font-black text-foreground">
              محضر المعاينة والفحص الفعلي للأعمال والأصناف 📋
            </h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            توليد وطباعة محضر المعاينة الميداني الرسمي استناداً للقالب الأصلي المعتمد (Word DOCX) مع الباركود الذكي وتوثيق الأرشيف.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => loadOfficialPreview(false)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <Eye className="h-4 w-4" />
            <span>معاينة المستند الرسمي</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleSaveData}
            disabled={savingNotes}
            className="border-amber-500/40 text-foreground hover:bg-amber-500/10 font-bold text-xs h-10 px-4 rounded-xl cursor-pointer flex items-center gap-1.5"
          >
            <Check className="h-4 w-4 text-emerald-600" />
            <span>{savingNotes ? "جاري الحفظ..." : "حفظ التعديلات"}</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleToggleArchive}
            disabled={addingToArchive}
            className="border-border text-foreground hover:bg-muted font-bold text-xs h-10 px-3.5 rounded-xl cursor-pointer flex items-center gap-1.5"
            title="حفظ نسخة رسمية في أرشيف العملية"
          >
            <FileText className="h-4 w-4 text-purple-600" />
            <span>{isArchived ? "مؤرشف ✓" : "إضافة للأرشيف"}</span>
          </Button>
        </div>
      </div>

      {/* ━━━ بطاقة الباركود السحابي ورقم القيد الصادر ━━━ */}
      <LetterQrCloudCard
        cloudPdfUrl={cloudPdfUrl}
        registrationNumber={registrationNumber}
        opId={op.id}
        docType="inspection_report"
        uploadingCloud={uploadingCloud}
        onUploadToCloud={() => handleUploadToCloud(true)}
        isModifiedAfterUpload={isDirty}
      />

      {/* ━━━ SECTION 1: ترويسة الشركة وبيانات المكاتبة الرسمية ━━━ */}
      <SectionCard
        title="1. ترويسة الشركة وبيانات المكاتبة الرسمية"
        badge="ترويسة Word الرسمية"
        icon={Building2}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">الشركة المصدرة للمحضر *</Label>
              <Select
                value={selectedCompanyId}
                onValueChange={(val) => setSelectedCompanyId(val || "")}
              >
                <SelectTrigger className="h-9.5 text-xs rounded-xl font-bold">
                  <SelectValue placeholder="اختر الشركة..." />
                </SelectTrigger>
                <SelectContent>
                  {companiesList.map((c) => (
                    <SelectItem key={c.companyId} value={c.companyId} className="text-xs font-bold">
                      {c.company?.name || `شركة #${c.companyId}`} ({c.displayCode || "كود"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">كود العملية بالشركة *</Label>
              <Input
                value={companyOpCode}
                onChange={(e) => setCompanyOpCode(e.target.value)}
                className="h-9.5 text-xs font-mono font-bold rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">رقم القيد الصادر *</Label>
              <div className="flex items-center gap-1">
                <Input
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  className="h-9.5 text-xs font-mono font-bold rounded-xl"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleRegenerateRef}
                  className="h-9.5 w-9.5 rounded-xl shrink-0 cursor-pointer"
                  title="تحديث رقم القيد التلقائي"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <SmartArabicDatePicker
                label="تاريخ الصادر الرسمي"
                value={outgoingDate}
                onChange={(val) => setOutgoingDate(val || "")}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-border/60">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">السجل التجاري (س . ت)</Label>
              <Input
                value={companyCommercialRegister}
                onChange={(e) => setCompanyCommercialRegister(e.target.value)}
                className="h-8.5 text-xs font-mono rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">البطاقة الضريبية (ب . ض)</Label>
              <Input
                value={companyTaxCard}
                onChange={(e) => setCompanyTaxCard(e.target.value)}
                className="h-8.5 text-xs font-mono rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">أرقام التواصل والواتساب</Label>
              <Input
                value={phoneWhatsapp}
                onChange={(e) => setPhoneWhatsapp(e.target.value)}
                className="h-8.5 text-xs font-mono rounded-xl"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 2: بيانات المعاينة الميدانية واللجنة ━━━ */}
      <SectionCard
        title="2. بيانات المعاينة الميدانية وأمر التكليف واللجنة"
        badge="الموقع والموعد"
        icon={MapPin}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-bold text-foreground">موقع المعاينة الميدانية *</Label>
              <Input
                placeholder="مثال: عنبر التسمين بقرية المعصرة - مركز الداخلة"
                value={siteLocation}
                onChange={(e) => setSiteLocation(e.target.value)}
                className="h-9.5 text-xs rounded-xl font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">سند التكليف / طلب رقم *</Label>
              <Input
                placeholder="مثال: طلب رقم 4 لسنة 2026"
                value={requestNumber}
                onChange={(e) => setRequestNumber(e.target.value)}
                className="h-9.5 text-xs rounded-xl font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">يوم الأسبوع *</Label>
              <Select value={dayOfWeek} onValueChange={(val) => setDayOfWeek(val || "الأربعاء")}>
                <SelectTrigger className="h-9.5 text-xs rounded-xl font-bold">
                  <SelectValue placeholder="اختر اليوم..." />
                </SelectTrigger>
                <SelectContent>
                  {ARABIC_DAYS.map((day) => (
                    <SelectItem key={day} value={day} className="text-xs font-bold">
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <SmartArabicDatePicker
                label="تاريخ المعاينة الفعلي"
                value={inspectionDate}
                onChange={(val) => setInspectionDate(val || "")}
                required
              />
            </div>
          </div>

          {/* أعضاء لجنة المعاينة الأربعة */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                أعضاء لجنة المعاينة والفحص (المشار إليهم بالفقرة التمهيدية والتوقيعات):
              </span>
              <Badge className="bg-amber-600 text-white text-[10px] font-bold">
                4 أعضاء رسميين
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">عضو اللجنة (1) *</Label>
                <Input
                  value={member1}
                  onChange={(e) => setMember1(e.target.value)}
                  className="h-8.5 text-xs rounded-xl bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">عضو اللجنة (2) *</Label>
                <Input
                  value={member2}
                  onChange={(e) => setMember2(e.target.value)}
                  className="h-8.5 text-xs rounded-xl bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">عضو اللجنة (3) *</Label>
                <Input
                  value={member3}
                  onChange={(e) => setMember3(e.target.value)}
                  className="h-8.5 text-xs rounded-xl bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">عضو اللجنة (4) *</Label>
                <Input
                  value={member4}
                  onChange={(e) => setMember4(e.target.value)}
                  className="h-8.5 text-xs rounded-xl bg-background"
                />
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 3: جدول الأصناف والأعمال محل الفحص والمعاينة ━━━ */}
      <SectionCard
        title="3. جدول الأصناف والأعمال المطلوبة محل المعاينة"
        badge={`${items.length} بنود مدرجة`}
        icon={Layers}
      >
        <div className="space-y-3.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              يمكنك إضافة أو تعديل بنود المعاينة الفنية بدقة لتظهر داخل جدول الوورد الرسمي:
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleImportOperationItems}
                className="h-8 text-xs font-bold rounded-xl border-border text-foreground hover:bg-muted cursor-pointer flex items-center gap-1"
                title="استيراد الأصناف المعتمدة من بنود العملية"
              >
                <RefreshCw className="h-3 w-3" />
                <span>استيراد بنود العملية</span>
              </Button>

              <Button
                size="sm"
                onClick={handleAddItem}
                className="h-8 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white cursor-pointer flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>إضافة بند جديد</span>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-muted/70 border-b border-border text-foreground font-bold text-[11px]">
                    <th className="p-2.5 w-10 text-center">م</th>
                    <th className="p-2.5 min-w-[200px]">إسم الصنف / الأعمال</th>
                    <th className="p-2.5 w-24 text-center">الوحدة</th>
                    <th className="p-2.5 w-24 text-center">الكمية</th>
                    <th className="p-2.5 min-w-[240px]">الوصف – الملاحظات الفنية</th>
                    <th className="p-2.5 min-w-[140px]">ملاحظات</th>
                    <th className="p-2.5 w-12 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {items.map((it, idx) => (
                    <tr key={it.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-2 text-center font-mono font-bold text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="p-2">
                        <Input
                          value={it.name}
                          onChange={(e) => handleUpdateItem(it.id, "name", e.target.value)}
                          placeholder="اسم الصنف أو التجهيز..."
                          className="h-8 text-xs rounded-lg font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={it.unit}
                          onChange={(e) => handleUpdateItem(it.id, "unit", e.target.value)}
                          placeholder="عدد / مقطوعية"
                          className="h-8 text-xs text-center rounded-lg"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={it.quantity}
                          onChange={(e) => handleUpdateItem(it.id, "quantity", e.target.value)}
                          placeholder="1"
                          className="h-8 text-xs text-center font-mono font-bold rounded-lg"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={it.technicalDescription}
                          onChange={(e) => handleUpdateItem(it.id, "technicalDescription", e.target.value)}
                          placeholder="مطابق للمواصفات والشروط..."
                          className="h-8 text-xs rounded-lg"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={it.notes}
                          onChange={(e) => handleUpdateItem(it.id, "notes", e.target.value)}
                          placeholder="بحالة جيدة..."
                          className="h-8 text-xs rounded-lg"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveItem(it.id)}
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
                          title="حذف هذا البند"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 4: قرار ورأي اللجنة والتوصيات الفنية ━━━ */}
      <SectionCard
        title="4. قرار ورأي اللجنة والتوصيات الفنية ومدة التنفيذ"
        badge="الرأي الفني"
        icon={ClipboardCheck}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              قرار ورأي اللجنة الفنية (وتم عمل المعاينة والفحص اللازم وترى اللجنة :ـ) *
            </Label>
            <Textarea
              rows={2}
              value={committeeOpinion}
              onChange={(e) => setCommitteeOpinion(e.target.value)}
              className="text-xs leading-relaxed rounded-xl font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              الملاحظات الفنية التفصيلية (الملاحظات الفنيه :ـ) *
            </Label>
            <Textarea
              rows={2}
              value={technicalNotes}
              onChange={(e) => setTechnicalNotes(e.target.value)}
              className="text-xs leading-relaxed rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs font-bold text-foreground">ويلزم عمل / الإجراء المطلوب *</Label>
              <Input
                value={requiredAction}
                onChange={(e) => setRequiredAction(e.target.value)}
                className="h-9.5 text-xs rounded-xl font-bold"
              />
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {[
                  "توريد",
                  "صيانة وإصلاح",
                  "توريد وصيانة وإصلاح",
                  "بشكل عاجل",
                  "بشكل دورى",
                  "استلام نهائي",
                ].map((act) => (
                  <button
                    key={act}
                    type="button"
                    onClick={() => setRequiredAction(act)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-muted hover:bg-amber-500/15 text-muted-foreground hover:text-amber-700 font-bold transition-colors cursor-pointer border border-border"
                  >
                    {act}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs font-bold text-foreground">مدة التنفيذ المحددة *</Label>
              <Input
                value={executionPeriod}
                onChange={(e) => setExecutionPeriod(e.target.value)}
                className="h-9.5 text-xs rounded-xl font-bold"
              />
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {["خلال اسبوعان", "خلال 10 أيام", "خلال شهر", "فوري"].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setExecutionPeriod(dur)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-muted hover:bg-amber-500/15 text-muted-foreground hover:text-amber-700 font-bold transition-colors cursor-pointer border border-border"
                  >
                    {dur}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs font-bold text-foreground">المرفقات الرسمية *</Label>
              <Input
                value={attachments}
                onChange={(e) => setAttachments(e.target.value)}
                className="h-9.5 text-xs rounded-xl font-bold"
              />
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {[
                  "صور سجلات توقيعات كتالوجات أجزاء",
                  "صور فوتوغرافية وتقارير فنية",
                  "محاضر الفحص والاختبار",
                ].map((att) => (
                  <button
                    key={att}
                    type="button"
                    onClick={() => setAttachments(att)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-muted hover:bg-amber-500/15 text-muted-foreground hover:text-amber-700 font-bold transition-colors cursor-pointer border border-border"
                  >
                    {att}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <Label className="text-xs font-bold text-foreground">
              خانة لكتابة ملاحظة ختامية إضافية (P58)
            </Label>
            <Input
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="خانة لكتابة ملاحظة..."
              className="h-9 text-xs rounded-xl"
            />
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 5: التوقيعات والاعتمادات الرسمية ━━━ */}
      <SectionCard
        title="5. التوقيعات والاعتمادات الرسمية المعتمدة"
        badge="الاعتماد الرسمي"
        icon={FileSignature}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">المهندس المختص *</Label>
            <Input
              value={engineerName}
              onChange={(e) => setEngineerName(e.target.value)}
              className="h-9.5 text-xs rounded-xl font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">المدير المالي *</Label>
            <Input
              value={financeManagerName}
              onChange={(e) => setFinanceManagerName(e.target.value)}
              className="h-9.5 text-xs rounded-xl font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">رئيس مجلس الإدارة *</Label>
            <Input
              value={chairmanName}
              onChange={(e) => setChairmanName(e.target.value)}
              className="h-9.5 text-xs rounded-xl font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">صيغة اعتماد الجهة الإدارية *</Label>
            <Input
              value={entityApprovalText}
              onChange={(e) => setEntityApprovalText(e.target.value)}
              className="h-9.5 text-xs rounded-xl font-bold"
            />
          </div>
        </div>
      </SectionCard>

      {/* ━━━ شريط الإجراءات والطباعة السفلي المعتمد ━━━ */}
      <LetterBottomActionWidget
        title="محضر المعاينة والفحص الفعلي"
        registrationNumber={registrationNumber}
        isDirty={isDirty}
        printInfo={printHistory}
        onPreview={() => loadOfficialPreview(false)}
        onSave={handleSaveData}
        saving={savingNotes}
        onViewArchive={() => loadOfficialPreview(false)}
        onAddToArchive={handleToggleArchive}
        isArchived={isArchived}
        addingToArchive={addingToArchive}
        archivedVersion={archiveInfo.currentVersion}
        icon={ClipboardCheck}
      />

      {/* ━━━ MODAL: معاينة قالب الوورد المعتمد ━━━ */}
      {previewModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl h-[94vh] max-h-[94vh] flex flex-col overflow-hidden text-foreground">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-foreground text-base">
                        معاينة محضر المعاينة والفحص الفعلي المعتمد
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
                    onClick={() => loadOfficialPreview(true)}
                    disabled={renderingDocx}
                    className="text-xs font-bold h-9 rounded-xl border border-border hover:bg-muted cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${renderingDocx ? "animate-spin text-emerald-600" : ""}`} />
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

              {/* Viewer */}
              <div className="flex-1 min-h-0 overflow-hidden pt-3 flex flex-col">
                {renderingDocx ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 text-center bg-slate-950 rounded-2xl">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-lg">
                      <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white">
                        جاري فتح وتجهيز محضر المعاينة الأصلي للمعاينة الفورية...
                      </h4>
                      <p className="text-xs text-slate-400">
                        معاينة تفاعلية فورية لقالب الوورد بدقة 100%
                      </p>
                    </div>
                  </div>
                ) : (
                  <OnlyOfficeDocViewer
                    documentTitle={`محضر_معاينة_${op.externalNumber || op.serialNumber}_${registrationNumber}.docx`}
                    docxBlob={previewDocxBlob}
                    pdfBlob={previewPdfBlob}
                    onDownloadDocx={handleDownloadDocx}
                    onDownloadPdf={handleDownloadPdf}
                    onPrint={handlePrintDocument}
                    onAddToArchive={handleToggleArchive}
                    isArchived={isArchived}
                    addingToArchive={addingToArchive}
                    cloudUploadWarning={
                      !cloudPdfUrl || (lastGeneratedSnapshot !== "" && lastGeneratedSnapshot !== currentSnapshot)
                        ? "⚠️ تنبيه هام: هذا المحضر يحتوي على تعديلات جديدة لم يتم رفعها سحابياً — يرجى الضغط على 'إعادة الرفع والتحديث' لكي يتطابق الباركود مع أحدث بيانات!"
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

      {/* ━━━ نافذة التنبيه عند إعادة طباعة مستند مطبوع مسبقاً ━━━ */}
      <ReprintConfirmModal
        open={reprintWarningOpen}
        onClose={() => setReprintWarningOpen(false)}
        printInfo={printHistory}
        onConfirmReprint={async () => {
          setReprintWarningOpen(false);
          await executePrintDoc();
        }}
        onViewArchive={() => {
          setReprintWarningOpen(false);
          loadOfficialPreview(false);
        }}
      />

      {/* ━━━ نافذة التحميل العائمة المبتكرة عند تنزيل PDF ━━━ */}
      <PdfExportLoadingModal open={downloadingPdf} />

      {/* ━━━ شريط التنقل السفلي بين التبويبات ━━━ */}
      <StepFooterNav
        currentTabId="inspection_report"
        onNavigate={onNavigate}
      />
    </div>
  );
}
export default TabInspectionReport;
