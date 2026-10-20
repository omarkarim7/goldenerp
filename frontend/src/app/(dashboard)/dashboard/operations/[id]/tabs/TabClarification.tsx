"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  HelpCircle, Printer, Download, Eye, Plus, Trash2, X,
  FileText, Check, AlertCircle, Sparkles, RefreshCw, Zap,
  Building2, PenTool, Calendar, Hash, FileCheck, Copy, ArrowRight,
  Paperclip, QrCode, Cloud, Globe, ExternalLink, CheckCircle2, RotateCcw, Save, Lock
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
import { generateSmartOutgoingRef, cleanAllDocxXml, buildQrAnchorXml, injectSingleQrIntoDocXml, LetterBottomActionWidget, ReprintConfirmModal, getCurrentUserName, PrintHistoryEntry, FISCAL_YEAR_OPTIONS, LetterQrCloudCard, PdfExportLoadingModal } from "./letter-utils";
import { GOLDEN_STAMP_BASE64, GOLDEN_LOGO_BASE64 } from "./stamp-assets";
import JSZip from "jszip";
import QRCode from "qrcode";
import { getPdfBlobFromDocx, uploadPdfToFreeCloud } from "./client-pdf";
import { OnlyOfficeDocViewer } from "@/components/OnlyOfficeDocViewer";

export interface ClarificationInquiryItem {
  id: string;
  itemName: string;       // اسم البند المراد توضيحه
  clauseNumber: string;   // الرقم (رقم البند أو الصفحة بالكراسة)
  description: string;    // الوصف أو الاستفسار – الملاحظات الفنية
  companyProposal: string; // مقترح وطلب الشركة
}

function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildTableRowXml(index: number, itemName: string, clauseNumber: string, description: string, proposal: string) {
  const makeCell = (width: number, text: string, isCenter = true) => `
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="${width}" w:type="dxa"/>
        <w:tcBorders>
          <w:top w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/>
          <w:left w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/>
          <w:bottom w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/>
          <w:right w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/>
        </w:tcBorders>
        <w:hideMark/>
      </w:tcPr>
      <w:p>
        <w:pPr>
          <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
          <w:jc w:val="${isCenter ? "center" : "right"}"/>
          <w:rPr>
            <w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/>
            <w:b/>
            <w:bCs/>
            <w:sz w:val="28"/>
            <w:szCs w:val="28"/>
            <w:rtl/>
            <w:lang w:bidi="ar-EG"/>
          </w:rPr>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/>
            <w:b/>
            <w:bCs/>
            <w:sz w:val="28"/>
            <w:szCs w:val="28"/>
            <w:rtl/>
            <w:lang w:bidi="ar-EG"/>
          </w:rPr>
          <w:t>${escapeXml(text)}</w:t>
        </w:r>
      </w:p>
    </w:tc>`;

  return `<w:tr>
    <w:trPr><w:trHeight w:val="288"/><w:jc w:val="right"/></w:trPr>
    ${makeCell(630, String(index), true)}
    ${makeCell(3334, itemName, false)}
    ${makeCell(992, clauseNumber, true)}
    ${makeCell(2835, description, false)}
    ${makeCell(2545, proposal, false)}
  </w:tr>`;
}

export function TabClarification({
  op,
  onRefresh,
  onNavigate,
  onPreviewDoc,
  onDownloadDoc,
}: {
  op: Operation;
  onRefresh: () => void;
  onNavigate: (tabId: string) => void;
  onPreviewDoc?: (doc: any) => void;
  onDownloadDoc?: (doc: any) => void;
}) {
  // Parse existing saved letter data if present
  const savedLetter = useMemo(() => {
    try {
      if (op.notes && op.notes.startsWith("{")) {
        const parsed = JSON.parse(op.notes);
        return parsed.clarificationLetter || null;
      }
    } catch {}
    return null;
  }, [op.notes]);

  // Company Selection
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    savedLetter?.selectedCompanyId || op.companies?.[0]?.companyId || ""
  );
  const currentCompanyLink = (op.companies || []).find((c: any) => c.companyId === selectedCompanyId) || op.companies?.[0];
  const currentCompany = currentCompanyLink?.company;

  // ━━━ 1. الترويسة ورقم القيد والصادر وبيانات التذييل (Header & Footer) ━━━
  const [outgoingDate, setOutgoingDate] = useState(() => {
    if (savedLetter?.outgoingDate) return savedLetter.outgoingDate;
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  });

  // رقم القيد الذكي (Ad26111000001) - يدعم اليوم والشهر والسنة بدقة (التسجيل 5)
  const [registrationNumber, setRegistrationNumber] = useState<string>(() => {
    if (savedLetter?.registrationNumber) return savedLetter.registrationNumber;
    return generateSmartOutgoingRef({
      companyCode: currentCompanyLink?.displayCode || "Ad",
      tenderType: op.tenderType || "LIMITED_TENDER",
      dateStr: new Date().toISOString(),
      sequenceNumber: op.serialNumber || 1,
      includeDay: true,
    });
  });

  const [companyCommercialRegister, setCompanyCommercialRegister] = useState(
    savedLetter?.companyCommercialRegister || currentCompany?.commercialRegister || "110200700036620"
  );
  const [companyTaxCard, setCompanyTaxCard] = useState(
    savedLetter?.companyTaxCard || currentCompany?.taxCard || "658369652"
  );
  const [companyOpCode, setCompanyOpCode] = useState(() => {
    if (savedLetter?.companyOpCode) return savedLetter.companyOpCode;
    if (currentCompanyLink?.displayCode) return `( ${currentCompanyLink.displayCode} )`;
    if (op.externalNumber) return `( ${op.externalNumber} )`;
    return "( AZ-01 )";
  });
  const [companyWhatsapp, setCompanyWhatsapp] = useState(
    savedLetter?.companyWhatsapp || "01091708818"
  );
  const [companyMobile, setCompanyMobile] = useState(
    savedLetter?.companyMobile || currentCompany?.phone || "01557018818"
  );
  const [companyEmail, setCompanyEmail] = useState(
    savedLetter?.companyEmail || "goldengolden8818@gmail.com"
  );
  const [companyAddress, setCompanyAddress] = useState(
    savedLetter?.companyAddress || currentCompany?.address || "بجوار مستشفى ليدى كير - بدمنهور - البحيره"
  );

  // الرابط السحابي المعتمد للنسخة الرقمية (Catbox.moe / Gofile.io)
  const [cloudPdfUrl, setCloudPdfUrl] = useState<string>(() => {
    const url = savedLetter?.cloudPdfUrl || "";
    return url.includes("tmpfiles.org") ? "" : url;
  });
  const [uploadingCloud, setUploadingCloud] = useState(false);
  const [lastGeneratedSnapshot, setLastGeneratedSnapshot] = useState<string | null>(null);

  // اختيار الشركة المشاركة وتحديث بيانات الترويسة والتذييل وكود العملية تلقائياً
  const handleSelectCompany = (companyId: string | null) => {
    if (!companyId) return;
    setSelectedCompanyId(companyId);
    const link = (op.companies || []).find((c: any) => c.companyId === companyId);
    if (link) {
      if (link.displayCode) {
        setCompanyOpCode(`( ${link.displayCode} )`);
      }
      if (link.company?.commercialRegister) {
        setCompanyCommercialRegister(link.company.commercialRegister);
      }
      if (link.company?.taxCard) {
        setCompanyTaxCard(link.company.taxCard);
      }
      if (link.company?.address) {
        setCompanyAddress(link.company.address);
      }
      if (link.company?.phone) {
        setCompanyMobile(link.company.phone);
      }
      const freshRef = generateSmartOutgoingRef({
        companyCode: link.displayCode || "Ad",
        tenderType: op.tenderType || "LIMITED_TENDER",
        dateStr: new Date().toISOString(),
        sequenceNumber: op.serialNumber || 1,
        includeDay: true,
      });
      setRegistrationNumber(freshRef);
      toast.success(`تم اختيار شركة: ${link.company?.name || "الشركة"} (${link.displayCode || ""})`);
    }
  };

  // ━━━ 2. جهة الإسناد وبيانات العملية في الموضوع (Recipient & Subject Details) ━━━
  const [recipientPrefix, setRecipientPrefix] = useState(
    savedLetter?.recipientPrefix || "الأستاذ"
  );
  const [recipientTitleAndAuthority, setRecipientTitleAndAuthority] = useState(
    savedLetter?.recipientTitleAndAuthority ||
    (op.authority
      ? `مدير الادارة العامة للمشتريات والمخازن بـ ${op.authority}`
      : "مدير الادارة العامة للمشتريات والمخازن بجامعة دمنهور")
  );

  const [subjectTarget, setSubjectTarget] = useState(
    savedLetter?.subjectTarget || "للأصناف"
  );
  const [operationRegisteredName, setOperationRegisteredName] = useState(
    savedLetter?.operationRegisteredName || op.name || "توريد مواسير ومهمات شبكات المياه"
  );
  const [operationNumber, setOperationNumber] = useState(
    savedLetter?.operationNumber || op.externalNumber || String(op.serialNumber || "365")
  );
  const [tenderMethod, setTenderMethod] = useState(
    savedLetter?.tenderMethod || "بالمناقصة المحدودة"
  );
  const [operationScope, setOperationScope] = useState(
    savedLetter?.operationScope || (op as any).description || "توريد كاوتش وبطاريات للسيارات للجامعه"
  );
  const [fiscalYear, setFiscalYear] = useState(
    savedLetter?.fiscalYear || "2024 / 2025"
  );

  // تاريخ جلسة فتح المظروف الفني
  const [technicalOpeningDate, setTechnicalOpeningDate] = useState(() => {
    const d = op.dates?.find((dt: any) => dt.type === "TECHNICAL_OPENING" || dt.title?.includes("فني"));
    if (d?.dateValue) return formatDate(d.dateValue);
    if (d?.date) return formatDate(d.date);
    return "14/ 1 /2024";
  });

  // ━━━ 3. أسباب التوضيح والطلب الرسمي (وحيث... لذا...) ━━━
  const [inquiryAspect, setInquiryAspect] = useState(
    "عن نوع الاستفسار من الناحية الفنية الخاصة بالمواصفات والبدائل المطابقة وجداول الكميات"
  );
  const [companyRequest, setCompanyRequest] = useState(
    "النظر في الاستفسارات وطلبات التوضيح الفنية والقانونية المبينة أدناه وإصدار ملحق توضيحي معتمد وموافاتنا به قبل الموعد المحدد لتقديم العطاءات"
  );

  // ━━━ 4. جدول بنود الاستفسارات والمقترحات (5 أعمدة مطابقة لملف الوورد) ━━━
  const [inquiries, setInquiries] = useState<ClarificationInquiryItem[]>([
    {
      id: "1",
      itemName: "توريد مواسير بولي إيثيلين قطر 110 مم ضغط 10 بار",
      clauseNumber: "بند (1) ص 12",
      description: "هل يشترط تقديم عينات معتمدة داخل المظروف الفني أم يكتفى بكتالوجات الشركة المصنعة؟",
      companyProposal: "نرجو الاكتفاء بتقديم شهادات الجودة والكتالوجات المعتمدة وتقديم العينة عند الترسية.",
    },
    {
      id: "2",
      itemName: "محبس هواء كروي تفريغ مزدوج 2 بوصة معتمد",
      clauseNumber: "بند (4) ص 18",
      description: "نرجو إيضاح ما إذا كانت فترة التوريد تحتسب من تاريخ أمر التوريد أم من تاريخ استلام الموقع؟",
      companyProposal: "احتساب مدة التوريد من تاريخ استلام الموقع وأمر التوريد الرسمي من الجهة معاً.",
    },
    {
      id: "3",
      itemName: "بطاريات سيارات جافة 70 أمبير مواصفات قياسية",
      clauseNumber: "بند (7) ص 24",
      description: "هل تقبل بطاريات ذات منشأ كوري أو أوروبي معتمد مكافئ للمواصفة المطلوبة؟",
      companyProposal: "الموافقة على البدائل الكورية والأوروبية المعتمدة مع الالتزام بفترة الضمان المقررة.",
    },
  ]);

  // ━━━ 5. التوقيعات والاعتماد (Signatures & Approvals) ━━━
  const [specialistTitle, setSpecialistTitle] = useState("المهندس / القانونى المختص");
  const [specialistName, setSpecialistName] = useState("أحمد محمد");
  const [financeManagerName, setFinanceManagerName] = useState(() => {
    return savedLetter?.financeManagerName || savedLetter?.financeManagerSignature || "محمود إبراهيم";
  });
  const [boardChairman, setBoardChairman] = useState("يعتمد ،،،،،، رئيس مجلس الإدارة");

  // مسمى البند بترويسة الجدول (البند / الصنف / ...)
  const [itemHeaderLabel, setItemHeaderLabel] = useState(
    savedLetter?.itemHeaderLabel || "البند"
  );
  // مسمى خانة الملاحظات الفنية بالجدول (إما "الوصف" أو "الاستفسار")
  const [inquiryColumnLabel, setInquiryColumnLabel] = useState(
    savedLetter?.inquiryColumnLabel || "الوصف"
  );

  // Modals & Document state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewDocxBlob, setPreviewDocxBlob] = useState<Blob | null>(null);
  const [previewPdfBlob, setPreviewPdfBlob] = useState<Blob | null>(null);
  const [renderingDocx, setRenderingDocx] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [printingDocx, setPrintingDocx] = useState(false);
  const [savingLetter, setSavingLetter] = useState(false);

  // ━━━ تتبع حالة التعديل والحفظ (isDirty control) ━━━
  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      selectedCompanyId,
      registrationNumber,
      outgoingDate,
      companyCommercialRegister,
      companyTaxCard,
      companyOpCode,
      companyWhatsapp,
      companyMobile,
      companyEmail,
      companyAddress,
      recipientPrefix,
      recipientTitleAndAuthority,
      subjectTarget,
      operationRegisteredName,
      operationNumber,
      tenderMethod,
      operationScope,
      fiscalYear,
      technicalOpeningDate,
      inquiryAspect,
      companyRequest,
      inquiries,
      itemHeaderLabel,
      inquiryColumnLabel,
      specialistTitle,
      specialistName,
      financeManagerName,
      boardChairman,
      cloudPdfUrl,
    });
  }, [
    selectedCompanyId, registrationNumber, outgoingDate, companyCommercialRegister,
    companyTaxCard, companyOpCode, companyWhatsapp, companyMobile, companyEmail,
    companyAddress, recipientPrefix, recipientTitleAndAuthority, subjectTarget,
    operationRegisteredName, operationNumber, tenderMethod, operationScope,
    fiscalYear, technicalOpeningDate, inquiryAspect, companyRequest, inquiries,
    itemHeaderLabel, inquiryColumnLabel, specialistTitle, specialistName,
    financeManagerName, boardChairman, cloudPdfUrl,
  ]);

  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => currentSnapshot);
  const isDirty = useMemo(() => currentSnapshot !== savedSnapshot, [currentSnapshot, savedSnapshot]);

  // سجل الطباعة وتنبيه إعادة الطباعة
  const [printHistory, setPrintHistory] = useState<Record<string, PrintHistoryEntry>>(() => {
    let notesObj: any = {};
    if (op.notes && op.notes.startsWith("{")) {
      try { notesObj = JSON.parse(op.notes); } catch (e) {}
    }
    return notesObj.clarificationLetter?.printHistory || {};
  });
  const [reprintWarningOpen, setReprintWarningOpen] = useState(false);

  const handleCancelEdits = () => {
    try {
      const snap = JSON.parse(savedSnapshot);
      setSelectedCompanyId(snap.selectedCompanyId);
      setRegistrationNumber(snap.registrationNumber);
      setOutgoingDate(snap.outgoingDate);
      setCompanyCommercialRegister(snap.companyCommercialRegister);
      setCompanyTaxCard(snap.companyTaxCard);
      setCompanyOpCode(snap.companyOpCode);
      setCompanyWhatsapp(snap.companyWhatsapp);
      setCompanyMobile(snap.companyMobile);
      setCompanyEmail(snap.companyEmail);
      setCompanyAddress(snap.companyAddress);
      setRecipientPrefix(snap.recipientPrefix);
      setRecipientTitleAndAuthority(snap.recipientTitleAndAuthority);
      setSubjectTarget(snap.subjectTarget);
      setOperationRegisteredName(snap.operationRegisteredName);
      setOperationNumber(snap.operationNumber);
      setTenderMethod(snap.tenderMethod);
      setOperationScope(snap.operationScope);
      setFiscalYear(snap.fiscalYear);
      setTechnicalOpeningDate(snap.technicalOpeningDate);
      setInquiryAspect(snap.inquiryAspect);
      setCompanyRequest(snap.companyRequest);
      setInquiries(snap.inquiries);
      setItemHeaderLabel(snap.itemHeaderLabel);
      setInquiryColumnLabel(snap.inquiryColumnLabel);
      setSpecialistTitle(snap.specialistTitle);
      setSpecialistName(snap.specialistName);
      setFinanceManagerName(snap.financeManagerName);
      setBoardChairman(snap.boardChairman);
      setCloudPdfUrl(snap.cloudPdfUrl);
      toast.info("تم التراجع عن التعديلات وإعادة الخطاب للحالة السابقة ↺");
    } catch {
      toast.error("تعذر التراجع عن التعديلات");
    }
  };

  // Document attachments from DB
  const clarificationDocs = useMemo(() => {
    return (op.documents || []).filter(
      (d: any) =>
        d.type === "CLARIFICATION" ||
        d.fileName?.includes("توضيح") ||
        d.fileName?.includes("استفسار") ||
        d.fileName?.includes("ملحق")
    );
  }, [op.documents]);

  // Response upload state
  const [responseFile, setResponseFile] = useState<File | null>(null);
  const responseFileInputRef = useRef<HTMLInputElement>(null);
  const [responseRefNo, setResponseRefNo] = useState("");
  const [uploadingResponse, setUploadingResponse] = useState(false);

  // إعادة توليد رقم القيد عند تغيير الشركة أو التاريخ
  const handleRegenerateRef = () => {
    const fresh = generateSmartOutgoingRef({
      companyCode: currentCompanyLink?.displayCode || "Ad",
      tenderType: op.tenderType || "LIMITED_TENDER",
      dateStr: new Date().toISOString(),
      sequenceNumber: op.serialNumber || 1,
      includeDay: true,
    });
    setRegistrationNumber(fresh);
    toast.success(`تم تحديث رقم القيد باليوم والشهر والسنة: ${fresh} (التسجيل 5)`);
  };

  // إضافة وحذف بنود الجدول
  const handleAddInquiryRow = () => {
    const newRow: ClarificationInquiryItem = {
      id: Date.now().toString(),
      itemName: "",
      clauseNumber: `بند (${inquiries.length + 1})`,
      description: "",
      companyProposal: "",
    };
    setInquiries([...inquiries, newRow]);
  };

  const handleDuplicateInquiryRow = (item: ClarificationInquiryItem) => {
    const dup: ClarificationInquiryItem = {
      ...item,
      id: Date.now().toString(),
      clauseNumber: `${item.clauseNumber} (تابع)`,
    };
    setInquiries([...inquiries, dup]);
    toast.success("تم نسخ بند الاستفسار بنجاح 📋");
  };

  const handleRemoveInquiryRow = (id: string) => {
    if (inquiries.length <= 1) {
      toast.warning("يجب الإبقاء على بند استفسار واحد على الأقل في الجدول");
      return;
    }
    setInquiries(inquiries.filter((r) => r.id !== id));
  };

  const handleUpdateInquiry = (id: string, field: keyof ClarificationInquiryItem, val: string) => {
    setInquiries(inquiries.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  };

  // ━━━ محرك استبدال المتغيرات مباشرة في قالب الوورد الأصلي (خطاب توضيح.docx) ━━━
  const generateClarificationDocxBlob = async (): Promise<Blob> => {
    const response = await fetch("/templates/clarification_template.docx");
    if (!response.ok) throw new Error("فشل قراءة قالب الوورد الأصلي من الخادم");
    const templateBuffer = await response.arrayBuffer();

    const zip = await JSZip.loadAsync(templateBuffer);

    // توليد رمز التحقق الرقمي والباركود للنسخة الرقمية
    let qrDrawingXml = "";
    try {
      const targetVerifyUrl = cloudPdfUrl || registrationNumber;
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

    // لقب وصفة المرسل إليه
    docXml = docXml.replace(/الأستاذ/g, escapeXml(recipientPrefix));
    docXml = docXml.replace(
      /مدير الادارة العامة للمشتريات والمخازن بجامعة دمنهور/g,
      escapeXml(recipientTitleAndAuthority)
    );

    // الموضوع وبيانات العملية
    docXml = docXml.replace(/للأصناف/g, escapeXml(subjectTarget));

    // اسم العملية المسجلة: إزالة الأقواس حول اسم العملية بالكامل في الوورد (لعملية اسم_العملية رقم ...)
    docXml = docXml.replace(/(<w:t[^>]*>\s*لعملية)\s*\(\s*(<\/w:t>)/g, "$1 $2");
    docXml = docXml.replace(/اسم العملية المسجله[\s\.]*/g, escapeXml(operationRegisteredName));
    docXml = docXml.replace(/(<w:t[^>]*>)\s*\)\s*(رقم\s*\(?\s*<\/w:t>)/g, "$1 $2");
    docXml = docXml.replace(/لعملية\s*\(\s*/g, "لعملية ");
    docXml = docXml.replace(/\s*\)\s*رقم\s*\(\s*/g, " رقم  (  ");

    // رقم العملية / المناقصة
    docXml = docXml.replace(/365/g, escapeXml(operationNumber));

    // طريقة الطرح التعاقدية (text حر يكتبه المستخدم مش قائمة منسدلة)
    const formattedTender = tenderMethod.trim().startsWith("(") && tenderMethod.trim().endsWith(")")
      ? tenderMethod.trim()
      : `(${tenderMethod.trim()})`;
    docXml = docXml.replace(/\(بالمناقصة المحدودة\)/g, escapeXml(formattedTender));
    docXml = docXml.replace(/بالمناقصة المحدودة/g, escapeXml(tenderMethod.trim()));

    // نطاق وموضوع العملية
    docXml = docXml.replace(/\(\s*توريد كاوتش وبطاريات للسيارات للجامعه\s*\)/g, `(${escapeXml(operationScope)})`);
    docXml = docXml.replace(/توريد كاوتش وبطاريات للسيارات للجامعه/g, escapeXml(operationScope));

    // العام المالي
    docXml = docXml.replace(/2024\s*\/\s*2025/g, escapeXml(fiscalYear));

    // موعد فتح المظروف الفني
    docXml = docXml.replace(/14\/\s*1\s*\/2024/g, escapeXml(technicalOpeningDate));

    // وحيث: نوع الاستفسار (إزالة أي أقواس تلقائياً ليكون النص طبيعياً)
    docXml = docXml.replace(/وحيث\s*\(\s*عن نوع الاستفسار من الناحية\s*\)/g, `وحيث ${escapeXml(inquiryAspect)}`);
    docXml = docXml.replace(/وحيث\s+عن نوع الاستفسار من الناحية\s*/g, `وحيث ${escapeXml(inquiryAspect)} `);
    docXml = docXml.replace(/عن نوع الاستفسار من الناحية\s*/g, escapeXml(inquiryAspect) + " ");

    // لذا: طلب الشركة
    if (companyRequest.trim()) {
      docXml = docXml.replace(/\(\s*\.{5,}\s*\)/g, `(${escapeXml(companyRequest)})`);
      docXml = docXml.replace(/\.{15,}/g, escapeXml(companyRequest));
    }

    // صفة واسم المهندس / القانوني المختص
    docXml = docXml.replace(/المهندس\s*\/ القانونى\s*المختص/g, escapeXml(specialistTitle));
    docXml = docXml.replace(/أحمد محمد/g, escapeXml(specialistName));

    // اسم المدير المالي (مكتوب "اسم" أو "توقيع صورة أو اسم")
    docXml = docXml.replace("<w:t>اسم</w:t>", `<w:t>${escapeXml(financeManagerName || " ")}</w:t>`);
    docXml = docXml.replace(/توقيع صورة\s*أو اسم/g, escapeXml(financeManagerName || " "));
    docXml = docXml.replace(/توقيع صورة/g, escapeXml(financeManagerName || " "));
    docXml = docXml.replace(/أو اسم/g, "");

    // مسمى البند بترويسة الجدول (البند / الصنف / ...)
    docXml = docXml.replace("<w:t>البند</w:t>", `<w:t>${escapeXml(itemHeaderLabel || "البند")}</w:t>`);
    docXml = docXml.replace(/إســــــــم\s+البند\s+المراد\s+توضيحه/g, `إســــــــم ${escapeXml(itemHeaderLabel || "البند")} المراد توضيحه`);

    // مسمى الوصف أو الاستفسار بترويسة الجدول ليصبح كلمة واحدة
    docXml = docXml.replace("<w:t>الوص</w:t>", `<w:t>${escapeXml(inquiryColumnLabel || "الوصف")}</w:t>`);
    docXml = docXml.replace("<w:t>ــ</w:t>", "<w:t></w:t>");
    docXml = docXml.replace("<w:t>ف</w:t>", "<w:t></w:t>");
    docXml = docXml.replace("<w:t>أو الاستفسار</w:t>", "<w:t></w:t>");
    docXml = docXml.replace(/الوصــف\s*أو\s*الاستفسار/g, escapeXml(inquiryColumnLabel || "الوصف"));

    // استبدال صفوف جدول الاستفسارات الفنية (Table 0)
    const tblStart = docXml.indexOf("<w:tbl>");
    const tblEnd = docXml.indexOf("</w:tbl>") + 8;
    if (tblStart !== -1 && tblEnd !== -1) {
      const tblXml = docXml.substring(tblStart, tblEnd);
      const headerEnd = tblXml.indexOf("</w:tr>") + 7;
      const tableHeaderPart = tblXml.substring(0, headerEnd);

      let newRowsXml = "";
      inquiries.forEach((item, idx) => {
        newRowsXml += buildTableRowXml(idx + 1, item.itemName, item.clauseNumber, item.description, item.companyProposal);
      });

      const newTblXml = tableHeaderPart + newRowsXml + "</w:tbl>";
      docXml = docXml.substring(0, tblStart) + newTblXml + docXml.substring(tblEnd);
    }

    zip.file("word/document.xml", docXml);

    // 2. استبدال بيانات الترويسة في word/header2.xml
    if (zip.file("word/header2.xml")) {
      let headerXml = await zip.file("word/header2.xml")!.async("text");
      headerXml = headerXml.replace(/110200700036620/g, escapeXml(companyCommercialRegister));
      headerXml = headerXml.replace(/658369652/g, escapeXml(companyTaxCard));
      // يدعم "كود العملية بالشركه" بالهاء أو التاء وأي مسافات
      headerXml = headerXml.replace(/\(\s*كود\s+العملي[ةه]\s+بالشرك[ةه]\s*\)/g, escapeXml(companyOpCode));
      zip.file("word/header2.xml", headerXml);
    }

    // 3. استبدال بيانات التذييل في word/footer1.xml
    if (zip.file("word/footer1.xml")) {
      let footerXml = await zip.file("word/footer1.xml")!.async("text");
      footerXml = footerXml.replace(/15\/10\/2026/g, escapeXml(outgoingDate));
      
      // استبدال رقم القيد بالتذييل بالكامل
      if (footerXml.includes("رقم القيد")) {
        footerXml = footerXml.replace(/رقم القيد/g, `رقم القيد : ${escapeXml(registrationNumber)}`);
      }
      footerXml = footerXml.replace(/\(باركود المستند أو العمليه/g, `رقم القيد : ${escapeXml(registrationNumber)}`);
      footerXml = footerXml.replace(/01091708818/g, escapeXml(companyWhatsapp));
      footerXml = footerXml.replace(/01557018818/g, escapeXml(companyMobile));

      // العنوان في القالب موزع على مقاطع متعددة:
      footerXml = footerXml.replace(/بجوار مستشفى ليدى كير/g, escapeXml(companyAddress));
      footerXml = footerXml.replace(/\s*-\s*بدمنهور\s*-\s*البح/g, "");
      footerXml = footerXml.replace(/<w:t>يره<\/w:t>/g, "<w:t></w:t>");

      footerXml = footerXml.replace(/goldengolden8818@gmail.com/g, escapeXml(companyEmail));
      zip.file("word/footer1.xml", footerXml);
    }

    // الختم ثابت دائماً في قالب الوورد كما طلب العميل (بدون أي تعديل على ملفات الصور)

    // 4. ━━━ إزالة كافة علامات التحديد الأحمر والعلامات المائية والصور التالفة ━━━
    await cleanAllDocxXml(zip);

    return await zip.generateAsync({ type: "blob" });
  };

  // ━━━ تحويل وتوليد مستند PDF ذكي وفوري ━━━
  const generateClarificationPdfBlob = async (): Promise<Blob> => {
    const docxBlob = await generateClarificationDocxBlob();
    return await getPdfBlobFromDocx(docxBlob, `clarification_${registrationNumber}.docx`);
  };

  // ━━━ رفع وتوثيق النسخة الرقمية المعتمدة سحابياً (Catbox.moe / Gofile.io) ━━━
  const handleUploadToCloud = async (forceReupload = false, existingBlob?: Blob) => {
    if (cloudPdfUrl && !cloudPdfUrl.includes("tmpfiles.org") && !forceReupload) {
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
          pdfBlob = await generateClarificationPdfBlob();
          setPreviewPdfBlob(pdfBlob);
          setLastGeneratedSnapshot(currentSnapshot);
        }
      }

      toast.info("جاري توثيق ورفع المستند سحابياً (Catbox/Gofile)...");
      const res = await uploadPdfToFreeCloud(
        pdfBlob,
        `clarification_${registrationNumber || op.serialNumber || "doc"}.pdf`
      );

      if (res?.url) {
        setCloudPdfUrl(res.url);
        toast.success("تم رفع وتوثيق خطاب التوضيح سحابياً بنجاح! الرابط جاهز ومتاح عالمياً لأي هاتف محمول 🚀");

        // حفظ الرابط السحابي في notes العملية تلقائياً
        try {
          let existingNotesObj: any = {};
          if (op.notes && op.notes.startsWith("{")) existingNotesObj = JSON.parse(op.notes);
          else if (op.notes) existingNotesObj = { textNotes: op.notes };
          if (!existingNotesObj.clarificationLetterDocx) existingNotesObj.clarificationLetterDocx = {};
          existingNotesObj.clarificationLetterDocx.cloudPdfUrl = res.url;
          existingNotesObj.clarificationLetterDocx.uploadedAt = new Date().toISOString();
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

  // ━━━ تنزيل مستند الوورد الأصلي المحدث ━━━
  const handleDownloadDocx = async () => {
    // إذا كان مستند الوورد جاهزاً ومخزناً ولم يتغير أي حقل -> تنزيل فوري
    if (previewDocxBlob && currentSnapshot === lastGeneratedSnapshot) {
      const downloadUrl = URL.createObjectURL(previewDocxBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `خطاب_توضيح_${op.externalNumber || op.serialNumber}_${registrationNumber}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      toast.success("تم تنزيل ملف الوورد فوراً! 📄✨");
      return;
    }

    setDownloadingDocx(true);
    try {
      const blob = await generateClarificationDocxBlob();
      setPreviewDocxBlob(blob);
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `خطاب_توضيح_${op.externalNumber || op.serialNumber}_${registrationNumber}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      toast.success("تم توليد وتنزيل ملف الوورد (.docx) بنجاح مطابقاً لقالب خطاب توضيح.docx! 📄✨");
    } catch (err: any) {
      console.error(err);
      toast.error("فشل توليد ملف الوورد: " + (err?.message || ""));
    } finally {
      setDownloadingDocx(false);
    }
  };

  // ━━━ تنزيل مستند PDF رسمي عالي الدقة مطابق للوورد 100% ━━━
  const handleDownloadPdf = async () => {
    // إذا كان ملف الـ PDF قد تم توليده سابقاً بالمعاينة ولم تتغير أي خانة، يتم التحميل فورا 0ms!
    if (previewPdfBlob && currentSnapshot === lastGeneratedSnapshot) {
      const downloadUrl = URL.createObjectURL(previewPdfBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `خطاب_توضيح_${op.externalNumber || op.serialNumber}_${registrationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      toast.success("تم تنزيل ملف الـ PDF الرسمي فوراً! 📑✨");

      // التأكد من رفع النسخة السحابية لرمز QR إذا لم تكن مرفوعة
      if (!cloudPdfUrl || cloudPdfUrl.includes("tmpfiles.org")) {
        handleUploadToCloud(false, previewPdfBlob);
      }
      return;
    }

    setDownloadingPdf(true);
    try {
      toast.info("جاري تحويل وتجهيز مستند التوضيح بصيغة PDF الرسمية عبر محرك Word...");
      const docx = await generateClarificationDocxBlob();
      const pdfBlob = await getPdfBlobFromDocx(docx, `clarification_${registrationNumber}.docx`);
      setPreviewDocxBlob(docx);
      setPreviewPdfBlob(pdfBlob);
      setLastGeneratedSnapshot(currentSnapshot);

      const downloadUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `خطاب_توضيح_${op.externalNumber || op.serialNumber}_${registrationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      toast.success("تم تنزيل ملف الـ PDF الرسمي بنجاح! 📑✨");

      // رفع المستند سحابياً لرمز QR فوراً (Catbox/Gofile)
      if (!cloudPdfUrl || cloudPdfUrl.includes("tmpfiles.org")) {
        handleUploadToCloud(false, pdfBlob);
      }
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error("فشل تحويل وتنزيل ملف PDF: " + (err?.message || ""));
    } finally {
      setDownloadingPdf(false);
    }
  };

  // ━━━ دالة تحميل المعاينة الرسمية الحية من محرك Word الأصيل ━━━
  const loadOfficialPreview = async () => {
    // إذا كان المستند مولداً ومطابقاً لآخر تعديل بدون أي تغيير في الخانات -> فتح فوري
    if (previewPdfBlob && currentSnapshot === lastGeneratedSnapshot) {
      return;
    }

    setRenderingDocx(true);
    try {
      const docx = await generateClarificationDocxBlob();
      setPreviewDocxBlob(docx);
      const pdf = await getPdfBlobFromDocx(docx, `clarification_${registrationNumber}.docx`);
      setPreviewPdfBlob(pdf);
      setLastGeneratedSnapshot(currentSnapshot);
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
      const url = URL.createObjectURL(pdf);
      setPreviewPdfUrl(url);

      // رفع سحابي هادئ إذا لم يكن مرفوعاً
      if (!cloudPdfUrl || cloudPdfUrl.includes("tmpfiles.org")) {
        handleUploadToCloud(false, pdf);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("فشل تجهيز معاينة الوورد: " + (err?.response?.data?.message || err?.message || ""));
    } finally {
      setRenderingDocx(false);
    }
  };

  // ━━━ دالة تنفيذ الطباعة وتحديث سجل الطباعة الرسمي ━━━
  const executePrintDoc = async () => {
    setPrintingDocx(true);
    try {
      toast.info("جاري تجهيز مستند الوورد الأصلي للطباعة بأعلى دقة...");
      let pdfUrl: string;
      try {
        const pdfBlob = await generateClarificationPdfBlob();
        pdfUrl = URL.createObjectURL(pdfBlob);
      } catch {
        window.print();
        return;
      }

      // طباعة مستند الـ PDF الأصيل المولد من محرك Word مباشرة لضمان مطابقة القالب 100%
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

      // تحديث سجل الطباعة وحفظه تلقائياً
      const currentUser = getCurrentUserName();
      const prev = printHistory["clarification"] || { printCount: 0 };
      const updatedHistory = {
        ...printHistory,
        clarification: {
          printCount: (prev.printCount || 0) + 1,
          firstPrintedAt: prev.firstPrintedAt || new Date().toISOString(),
          lastPrintedAt: new Date().toISOString(),
          printedBy: currentUser,
          registrationNumber: prev.registrationNumber || registrationNumber,
        },
      };
      setPrintHistory(updatedHistory);

      try {
        let notesObj: any = {};
        if (op.notes && op.notes.startsWith("{")) {
          notesObj = JSON.parse(op.notes);
        }
        const existingLetter = notesObj.clarificationLetter || {};
        existingLetter.printHistory = updatedHistory;
        notesObj.clarificationLetter = existingLetter;
        await api.patch(`/operations/${op.id}`, { notes: JSON.stringify(notesObj) });
      } catch (e) {
        console.warn("Could not save print history:", e);
      }

      toast.success("تم إرسال المستند للطباعة وتحديث سجل الطباعة بنجاح ✓");
    } catch (err: any) {
      window.print();
    } finally {
      setPrintingDocx(false);
    }
  };

  // التحقق من الطباعة السابقة وعرض نافذة التنبيه
  const handlePrintWordDocument = async () => {
    const currentInfo = printHistory["clarification"];
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
        d.type?.toLowerCase().includes("clarification") ||
        d.name?.toLowerCase().includes("clarification") ||
        d.name?.includes("توضيح")
    );
    if (archivedDoc?.fileUrl) {
      window.open(archivedDoc.fileUrl, "_blank");
      return;
    }
    // 4. فتح المعاينة
    setPreviewModalOpen(true);
  };

  // تحميل المعاينة الرسمية بمجرد فتح نافذة المعاينة
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

  // حفظ الخطاب في قاعدة بيانات النظام
  const handleSaveToSystem = async () => {
    setSavingLetter(true);
    try {
      let existingNotesObj: Record<string, any> = {};
      try {
        if (op.notes && op.notes.startsWith("{")) {
          existingNotesObj = JSON.parse(op.notes);
        } else if (op.notes) {
          existingNotesObj = { textNotes: op.notes };
        }
      } catch {}

      existingNotesObj.clarificationLetter = {
        selectedCompanyId,
        registrationNumber,
        outgoingDate,
        companyCommercialRegister,
        companyTaxCard,
        companyOpCode,
        companyWhatsapp,
        companyMobile,
        companyEmail,
        companyAddress,
        recipientPrefix,
        recipientTitleAndAuthority,
        subjectTarget,
        operationRegisteredName,
        operationNumber,
        tenderMethod,
        operationScope,
        fiscalYear,
        technicalOpeningDate,
        inquiryAspect,
        companyRequest,
        inquiries,
        itemHeaderLabel,
        inquiryColumnLabel,
        specialistTitle,
        specialistName,
        financeManagerName,
        boardChairman,
        cloudPdfUrl,
      };

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(existingNotesObj),
      });

      setSavedSnapshot(currentSnapshot);
      toast.success("تم حفظ بيانات خطاب التوضيح في قاعدة البيانات بنجاح! 💾☁️");
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل الحفظ في قاعدة البيانات");
    } finally {
      setSavingLetter(false);
    }
  };

  // رفع توثيق رد الجهة
  const handleUploadResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseFile) {
      toast.error("يرجى اختيار ملف رد الجهة أو الملحق التوضيحي");
      return;
    }
    setUploadingResponse(true);
    try {
      const formData = new FormData();
      formData.append("file", responseFile);
      formData.append("type", "CLARIFICATION");
      formData.append("companyId", selectedCompanyId || "");
      formData.append(
        "fileName",
        `[رد الجهة] ملحق توضيحي رسمي (${responseRefNo || "معتمد"})`
      );

      await api.post(`/operations/${op.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("تم رفع وتوثيق رد الجهة والملحق التوضيحي بنجاح! ✓");
      setResponseFile(null);
      setResponseRefNo("");
      onRefresh();
    } catch {
      toast.error("فشل رفع رد الجهة");
    } finally {
      setUploadingResponse(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in print:m-0 print:p-0">




      {/* ━━━ SECTION 1: الترويسة التعريفية ورقم القيد والصادر وبيانات الشركة (Header & Footer) ━━━ */}
      <SectionCard
        title="1. الترويسة التعريفية ورقم القيد والصادر وبيانات الشركة (Header & Footer)"
        icon={Building2}
        iconColor="text-blue-600"
        badge={
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
            تفريغ تلقائي للألوان الحمراء بالكامل ✓
          </Badge>
        }
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-transparent border border-blue-500/20 text-xs text-foreground flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">
                يتم هنا تعيين <strong>كود العملية بالشركة</strong> وبيانات الترويسة والتذييل ورقم القيد الصادر باليوم والشهر والسنة.
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                تفريغ تلقائي للعلامات الحمراء: عند المعاينة أو تنزيل ملف الوورد، تُزال كافة التحديدات والألوان الحمراء في الترويسة والتذييل والمتن ليخرج الخطاب رسمياً ومعتمداً.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRegenerateRef}
              className="text-[11px] h-8 rounded-xl border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 shrink-0 cursor-pointer font-bold"
            >
              <RefreshCw className="h-3.5 w-3.5 ml-1.5" />
              <span>تحديث رقم القيد</span>
            </Button>
          </div>

          {/* Row 1: الشركة وكود العملية ورقم القيد والتاريخ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">الشركة المشاركة بالعملية *</Label>
              <Select value={selectedCompanyId} onValueChange={handleSelectCompany}>
                <SelectTrigger className="h-9.5 text-xs font-bold rounded-xl">
                  <SelectValue placeholder="اختر الشركة">
                    {currentCompanyLink
                      ? `${currentCompanyLink.company?.name || "الشركة"} (${currentCompanyLink.displayCode || ""})`
                      : (op.companies || []).find((c: any) => c.companyId === selectedCompanyId)
                      ? `${(op.companies || []).find((c: any) => c.companyId === selectedCompanyId)?.company?.name || "الشركة"} (${(op.companies || []).find((c: any) => c.companyId === selectedCompanyId)?.displayCode || ""})`
                      : "اختر الشركة"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(op.companies || []).map((oc: any) => (
                    <SelectItem key={oc.companyId} value={oc.companyId} className="text-xs font-bold">
                      {oc.company?.name || "الشركة"} ({oc.displayCode || "كود"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">كود العملية بالشركة (الترويسة) *</Label>
                {currentCompanyLink?.displayCode && (
                  <button
                    type="button"
                    onClick={() => setCompanyOpCode(`( ${currentCompanyLink.displayCode} )`)}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-mono font-bold cursor-pointer"
                    title="استعادة كود العملية المسجل بالنظام"
                  >
                    استعادة ({currentCompanyLink.displayCode})
                  </button>
                )}
              </div>
              <Input
                value={companyOpCode}
                onChange={(e) => setCompanyOpCode(e.target.value)}
                placeholder="( AZ-01 )"
                className="h-9.5 text-xs font-bold font-mono text-blue-700 dark:text-blue-300 rounded-xl text-center"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">رقم القيد الصادر الذكي *</Label>
              <Input
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                className="h-9.5 text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 rounded-xl text-center"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">تاريخ الصادر (التذييل) *</Label>
              <Input
                value={outgoingDate}
                onChange={(e) => setOutgoingDate(e.target.value)}
                placeholder="15/10/2026"
                className="h-9.5 text-xs font-mono rounded-xl text-center font-bold"
              />
            </div>
          </div>

          {/* Row 2: السجل التجاري والبطاقة الضريبية والهواتف */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">السجل التجاري (س . ت بالترويسة) *</Label>
              <Input
                value={companyCommercialRegister}
                onChange={(e) => setCompanyCommercialRegister(e.target.value)}
                placeholder="110200700036620"
                className="h-9.5 text-xs font-mono rounded-xl text-center font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">البطاقة الضريبية (ب . ض بالترويسة) *</Label>
              <Input
                value={companyTaxCard}
                onChange={(e) => setCompanyTaxCard(e.target.value)}
                placeholder="658369652"
                className="h-9.5 text-xs font-mono rounded-xl text-center font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">رقم الواتساب الرسمي (التذييل)</Label>
              <Input
                value={companyWhatsapp}
                onChange={(e) => setCompanyWhatsapp(e.target.value)}
                placeholder="01091708818"
                className="h-9.5 text-xs font-mono rounded-xl text-center"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">رقم المحمول الرسمي (التذييل)</Label>
              <Input
                value={companyMobile}
                onChange={(e) => setCompanyMobile(e.target.value)}
                placeholder="01557018818"
                className="h-9.5 text-xs font-mono rounded-xl text-center"
              />
            </div>
          </div>

          {/* Row 3: العنوان والإيميل */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold text-foreground">عنوان مقر الشركة (المطبوع بالتذييل)</Label>
              <Input
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="بجوار مستشفى ليدى كير - بدمنهور - البحيره"
                className="h-9.5 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">البريد الإلكتروني للشركة (التذييل)</Label>
              <Input
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                placeholder="goldengolden8818@gmail.com"
                className="h-9.5 text-xs font-mono rounded-xl"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 2: جهة الإسناد وبيانات العملية في الموضوع ━━━ */}
      <SectionCard
        title="2. جهة الإسناد وبيانات العملية في موضوع الخطاب (Recipient & Subject Details)"
        icon={FileText}
        iconColor="text-amber-600"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">لقب المرسل إليه *</Label>
              <Input
                value={recipientPrefix}
                onChange={(e) => setRecipientPrefix(e.target.value)}
                placeholder="الأستاذ"
                className="h-9.5 text-xs font-bold rounded-xl text-center"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-3">
              <Label className="text-xs font-bold text-foreground">
                المسؤول وجهة الإسناد (السيد / ... ) *
              </Label>
              <Input
                value={recipientTitleAndAuthority}
                onChange={(e) => setRecipientTitleAndAuthority(e.target.value)}
                placeholder="مدير الادارة العامة للمشتريات والمخازن بجامعة دمنهور"
                className="h-9.5 text-xs font-semibold rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">نوع الاستفسار في الموضوع *</Label>
              <Input
                value={subjectTarget}
                onChange={(e) => setSubjectTarget(e.target.value)}
                placeholder="للأصناف"
                className="h-9.5 text-xs font-bold rounded-xl text-center"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">طريقة الطرح التعاقدية *</Label>
              <Input
                value={tenderMethod}
                onChange={(e) => setTenderMethod(e.target.value)}
                placeholder="بالمناقصة المحدودة"
                className="h-9.5 text-xs font-semibold rounded-xl text-center"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">رقم العملية / المناقصة *</Label>
              <Input
                value={operationNumber}
                onChange={(e) => setOperationNumber(e.target.value)}
                className="h-9.5 text-xs font-mono font-bold rounded-xl text-center"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">العام المالي *</Label>
              <div className="flex gap-2">
                <Select
                  value={FISCAL_YEAR_OPTIONS.includes(fiscalYear) ? fiscalYear : "other"}
                  onValueChange={(val) => {
                    if (val !== "other") setFiscalYear(val);
                  }}
                >
                  <SelectTrigger className="h-9.5 text-xs font-mono rounded-xl">
                    <SelectValue placeholder="اختر العام المالي" />
                  </SelectTrigger>
                  <SelectContent>
                    {FISCAL_YEAR_OPTIONS.map((yr) => (
                      <SelectItem key={yr} value={yr} className="text-xs font-mono">
                        {yr}
                      </SelectItem>
                    ))}
                    <SelectItem value="other" className="text-xs font-bold text-amber-600">
                      أخرى (تحديد يدوي)
                    </SelectItem>
                  </SelectContent>
                </Select>
                {(!FISCAL_YEAR_OPTIONS.includes(fiscalYear) || fiscalYear === "other") && (
                  <Input
                    value={fiscalYear === "other" ? "" : fiscalYear}
                    onChange={(e) => setFiscalYear(e.target.value)}
                    placeholder="2024 / 2025"
                    className="h-9.5 text-xs font-mono rounded-xl text-center w-36"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold text-foreground">
                اسم العملية المسجلة (لعملية ...) *
              </Label>
              <Input
                value={operationRegisteredName}
                onChange={(e) => setOperationRegisteredName(e.target.value)}
                className="h-9.5 text-xs font-semibold rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                تاريخ جلسة فتح المظروف الفني *
              </Label>
              <Input
                value={technicalOpeningDate}
                onChange={(e) => setTechnicalOpeningDate(e.target.value)}
                placeholder="14/ 1 /2024"
                className="h-9.5 text-xs font-mono rounded-xl text-center"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              لزوم (الغرض التفصيلي للعملية في الخطاب) *
            </Label>
            <Input
              value={operationScope}
              onChange={(e) => setOperationScope(e.target.value)}
              placeholder="توريد كاوتش وبطاريات للسيارات للجامعه"
              className="h-9.5 text-xs rounded-xl"
            />
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 3: أسباب التوضيح والطلب الرسمي (وحيث... لذا...) ━━━ */}
      <SectionCard
        title="3. صياغة الاستفسار والطلب (وحيث... لذا فالرجاء التكرم...)"
        icon={Sparkles}
        iconColor="text-purple-600"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              وحيث: نوع الاستفسار من الناحية *
            </Label>
            <Textarea
              rows={2}
              value={inquiryAspect}
              onChange={(e) => setInquiryAspect(e.target.value)}
              className="text-xs rounded-xl leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              لذا: الرجاء من سيادتكم التكرم ( الطلب الموجه للجهة وإصدار الملحق ) *
            </Label>
            <Textarea
              rows={2}
              value={companyRequest}
              onChange={(e) => setCompanyRequest(e.target.value)}
              className="text-xs rounded-xl leading-relaxed"
            />
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 4: جدول بنود الاستفسارات والمقترحات (5 أعمدة مطابقة للوورد) ━━━ */}
      <SectionCard
        title="4. جدول بنود الاستفسارات والمقترحات الفنية (5 أعمدة مطابقة لملف الوورد)"
        icon={FileCheck}
        iconColor="text-emerald-600"
        badge={
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
            {inquiries.length} بنود استفسار
          </Badge>
        }
        actions={
          <Button
            size="sm"
            onClick={handleAddInquiryRow}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer shadow-md flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة بند استفسار جديد</span>
          </Button>
        }
      >
        <div className="space-y-3.5">
          {/* إعدادات مسميات ترويسة الجدول وتحديد الوصف أو الاستفسار */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                مسمى البند في ترويسة الجدول (إســــــــم ... المراد توضيحه) *
              </Label>
              <Input
                value={itemHeaderLabel}
                onChange={(e) => setItemHeaderLabel(e.target.value)}
                placeholder="البند (أو: الصنف، المهمات، الأعمال...)"
                className="h-9.5 text-xs font-bold rounded-xl bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                مسمى خانة الملاحظات بالجدول (اختيار إما وصف أو استفسار) *
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={inquiryColumnLabel === "الوصف" ? "default" : "outline"}
                  onClick={() => setInquiryColumnLabel("الوصف")}
                  className="h-9.5 px-4 text-xs font-bold rounded-xl cursor-pointer"
                >
                  الوصف
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={inquiryColumnLabel === "الاستفسار" ? "default" : "outline"}
                  onClick={() => setInquiryColumnLabel("الاستفسار")}
                  className="h-9.5 px-4 text-xs font-bold rounded-xl cursor-pointer"
                >
                  الاستفسار
                </Button>
                <Input
                  value={inquiryColumnLabel}
                  onChange={(e) => setInquiryColumnLabel(e.target.value)}
                  placeholder="أو اكتب مسمى مخصص..."
                  className="h-9.5 text-xs font-bold rounded-xl text-center flex-1 bg-background"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border shadow-xs">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-3 py-3 w-12 text-center font-bold">م</th>
                  <th className="px-3 py-3 min-w-[220px] font-bold">
                    إســــــــم {itemHeaderLabel || "البند"} المراد توضيحه
                  </th>
                  <th className="px-2 py-3 w-28 text-center font-bold">الرقم بالكراسة</th>
                  <th className="px-3 py-3 min-w-[280px] font-bold">
                    {inquiryColumnLabel || "الوصف"} – الملاحظـات الفنيه
                  </th>
                  <th className="px-3 py-3 min-w-[240px] font-bold">مقترح وطلب الشركة</th>
                  <th className="px-2 py-3 w-20 text-center font-bold">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inquiries.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2 text-center font-mono font-bold text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        placeholder="اسم الصنف / البند..."
                        value={row.itemName}
                        onChange={(e) => handleUpdateInquiry(row.id, "itemName", e.target.value)}
                        className="h-9 text-xs font-semibold rounded-lg bg-background"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        placeholder="بند 1 ص 12"
                        value={row.clauseNumber}
                        onChange={(e) => handleUpdateInquiry(row.id, "clauseNumber", e.target.value)}
                        className="h-9 text-xs rounded-lg bg-background text-center font-mono"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Textarea
                        rows={2}
                        placeholder="نص الاستفسار الفني أو القانوني..."
                        value={row.description}
                        onChange={(e) => handleUpdateInquiry(row.id, "description", e.target.value)}
                        className="text-xs rounded-lg bg-background leading-relaxed"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Textarea
                        rows={2}
                        placeholder="طلب الشركة أو البديل المقترح..."
                        value={row.companyProposal}
                        onChange={(e) => handleUpdateInquiry(row.id, "companyProposal", e.target.value)}
                        className="text-xs rounded-lg bg-background font-medium text-blue-700 dark:text-blue-300 leading-relaxed"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDuplicateInquiryRow(row)}
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                          title="نسخ البند"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveInquiryRow(row.id)}
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                          title="حذف البند"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddInquiryRow}
            className="text-xs h-9 font-bold rounded-xl border-dashed border-emerald-500/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 ml-1" />
            <span>إضافة بند استفسار إضافي للجدول</span>
          </Button>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 5: التوقيعات والاعتماد (Signatures & Approvals) ━━━ */}
      <SectionCard
        title="5. التوقيعات والاعتماد الرسمي (Signatures & Approvals)"
        icon={PenTool}
        iconColor="text-indigo-600"
        badge={
          <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-[10px] font-bold">
            التوقيعات الرسمية
          </Badge>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">صفة المختص *</Label>
              <Input
                value={specialistTitle}
                onChange={(e) => setSpecialistTitle(e.target.value)}
                placeholder="المهندس / القانونى المختص"
                className="h-9.5 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">اسم المختص (بالأحمر في الوورد) *</Label>
              <Input
                value={specialistName}
                onChange={(e) => setSpecialistName(e.target.value)}
                placeholder="أحمد محمد"
                className="h-9.5 text-xs font-bold text-foreground rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                اسم المدير المالي (يُكتب بين القوسين فقط) *
              </Label>
              <Input
                value={financeManagerName}
                onChange={(e) => setFinanceManagerName(e.target.value)}
                placeholder="محمود إبراهيم"
                className="h-9.5 text-xs font-bold rounded-xl"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 6: رفع وتوثيق رد الجهة الحكومية والملحق التوضيحي ━━━ */}
      <SectionCard
        title="6. توثيق رد جهة الإسناد والملحق التوضيحي المعتمد (Official Authority Addendum)"
        icon={FileCheck}
        iconColor="text-blue-600"
        badge={
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-bold">
            {clarificationDocs.length} مستندات بأرشيف التوضيحات
          </Badge>
        }
      >
        <form onSubmit={handleUploadResponse} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">رقم صادر رد الجهة / رقم الملحق</Label>
              <Input
                placeholder="مثلاً: ملحق رقم (1) لسنة 2026، إشارة رقم 442..."
                value={responseRefNo}
                onChange={(e) => setResponseRefNo(e.target.value)}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">ملف رد الجهة أو الملحق (PDF / صورة / Word) *</Label>
              <input
                ref={responseFileInputRef}
                type="file"
                accept=".pdf,image/*,.docx,.doc"
                onChange={(e) => setResponseFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <div
                onClick={() => responseFileInputRef.current?.click()}
                className="h-9.5 px-3 border border-border border-dashed rounded-xl bg-muted/30 hover:bg-muted/50 cursor-pointer flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                    <Paperclip className="h-3.5 w-3.5" />
                  </div>
                  {responseFile ? (
                    <span className="text-xs font-semibold text-foreground truncate max-w-[260px]">
                      {responseFile.name}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      انقر لاختيار ملف رد الجهة أو الملحق...
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] font-bold rounded-lg px-2.5 bg-background shadow-xs pointer-events-none"
                >
                  {responseFile ? "تغيير الملف" : "استعراض ملف"}
                </Button>
              </div>
            </div>
          </div>
          <Button
            type="submit"
            disabled={uploadingResponse || !responseFile}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9.5 px-5 rounded-xl cursor-pointer shadow-md flex items-center gap-1.5"
          >
            <Check className="h-4 w-4" />
            <span>{uploadingResponse ? "جاري الرفع والتوثيق..." : "رفع وتوثيق رد الجهة بالأرشيف"}</span>
          </Button>
        </form>
      </SectionCard>

      {/* ━━━ MODAL: معاينة خطاب التوضيح الرسمي وعارض ONLYOFFICE Docs ━━━ */}
      {previewModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in overflow-y-auto">
            <div className="bg-card border border-border rounded-3xl max-w-6xl w-full p-4 sm:p-6 space-y-4 shadow-2xl my-auto max-h-[96vh] flex flex-col overflow-hidden text-foreground">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-foreground text-base">
                        معاينة قالب الوورد المعتمد: خطاب توضيح.docx
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
                    size="icon"
                    variant="ghost"
                    onClick={() => setPreviewModalOpen(false)}
                    className="h-8.5 w-8.5 rounded-full hover:bg-muted cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* OnlyOffice & Authentic Word Document Viewer */}
              <div className="flex-1 overflow-hidden min-h-[640px]">
                {renderingDocx ? (
                  <div className="h-full min-h-[600px] flex flex-col items-center justify-center gap-4 text-center bg-slate-950 rounded-2xl">
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
                    documentTitle={`خطاب_توضيح_${op.externalNumber || op.serialNumber}_${registrationNumber}.docx`}
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
        docType="clarification"
        uploadingCloud={uploadingCloud}
        onUploadToCloud={handleUploadToCloud}
        title="الباركود الذكي ورمز QR الرقمي المعتمد (PDF)"
        subtitle="عند مسح الباركود بكاميرا الموبايل يتم فتح النسخة الرقمية المعتمدة لخطاب التوضيح فوراً بدون الحاجة لأي تسجيل دخول."
        badgeText="مدمج بموضع كلمة (الباركود) بالأعلى ورقم القيد بالتذييل"
        gradientClass="from-amber-500/10 via-orange-500/10 to-transparent border-amber-500/25"
      />

      {/* ━━━ BOTTOM ACTION BAR: التوليد والطباعة والمعاينة بأسفل مرحلة خطاب التوضيح ━━━ */}
      <LetterBottomActionWidget
        title="خطاب التوضيح والاستفسارات الفنية والقانونية الرسمية"
        registrationNumber={registrationNumber}
        isDirty={isDirty}
        printInfo={printHistory["clarification"]}
        onPreview={() => setPreviewModalOpen(true)}
        onSave={handleSaveToSystem}
        onCancelEdits={handleCancelEdits}
        saving={savingLetter}
        onViewArchive={handleViewArchive}
        customSubtitle="مطابق 100% لقالب الوورد المعتمد للشركة. اضغط على زر المعاينة للاطلاع على المستند وتنزيله أو طباعته."
      />

      {/* ━━━ نافذة التنبيه عند إعادة طباعة مستند مطبوع مسبقاً ━━━ */}
      <ReprintConfirmModal
        open={reprintWarningOpen}
        onClose={() => setReprintWarningOpen(false)}
        printInfo={printHistory["clarification"]}
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
        currentTabId="clarification"
        onNavigate={onNavigate}
        nextLabel="الانتقال إلى: #6 العرض الفني والمواصفات ➔"
        prevLabel="← #4 الكراسة والتأمين الابتدائي"
      />
    </div>
  );
}
