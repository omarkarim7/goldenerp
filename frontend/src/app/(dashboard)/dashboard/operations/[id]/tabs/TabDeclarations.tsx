"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  FileCheck, ShieldCheck, CheckCircle2, Eye, Printer, Download,
  RefreshCw, Building2, Calendar, Hash, FileText, Check, AlertCircle,
  Copy, ExternalLink, QrCode, Cloud, ArrowRight, X, Sparkles, SlidersHorizontal,
  RotateCcw, Save, Lock
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
  getLetterSpecificRegistrationNumber,
  regenerateLetterSpecificRegistrationNumber,
  FiscalYearSelect,
  getSharedOperationScope,
  replaceDocxScope,
  replaceDocxFiscalAndDate,
  replaceDocxChairman,
  sanitizeChairmanTitle,
  getOperationRecipientTitle,
  getOperationFiscalYear,
  getOperationTechnicalOpeningDate,
  getOperationTenderMethod,
  isValidCloudDocUrl,
  generateHighResDocQrBuffer,
  getStandardDocQrPayload,
  buildOfficialSignaturesTableXml,
} from "./letter-utils";
import JSZip from "jszip";
import QRCode from "qrcode";
import { getPdfBlobFromDocx, uploadPdfToFreeCloud, getExpectedCloudPdfUrl } from "./client-pdf";
import { OnlyOfficeDocViewer } from "@/components/OnlyOfficeDocViewer";

export type DeclarationType = "specs" | "insurance";

function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function TabDeclarations({
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
  // ━━━ قراءة البيانات المحفوظة مسبقاً ━━━
  const savedDec = useMemo(() => {
    try {
      if (op.notes && op.notes.startsWith("{")) {
        const parsed = JSON.parse(op.notes);
        return parsed.declarationsDocx || null;
      }
    } catch {}
    return null;
  }, [op.notes]);

  // التبويب النشط بين الإقرارين
  const [activeDeclType, setActiveDeclType] = useState<DeclarationType>("specs");

  // ━━━ 1. الشركة المصدرة والترويسة والتذييل ━━━
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => {
    return savedDec?.selectedCompanyId || op.companies?.[0]?.companyId || op.companies?.[0]?.id || "";
  });

  const currentCompanyLink = useMemo(() => {
    return (
      op.companies?.find(
        (c: any) => c.companyId === selectedCompanyId || c.id === selectedCompanyId
      ) || op.companies?.[0]
    );
  }, [op.companies, selectedCompanyId]);

  const currentCompany = currentCompanyLink?.company;

  // رقم القيد الصادر الذكي الخاص بكل إقرار على حدة
  const [letterRegNumbers, setLetterRegNumbers] = useState<Record<DeclarationType, string>>(() => {
    const saved = savedDec?.letterRegNumbers || {};
    return {
      specs: saved.specs || getLetterSpecificRegistrationNumber(op, "decl_specs", currentCompanyLink?.displayCode, savedDec?.registrationNumber),
      insurance: saved.insurance || getLetterSpecificRegistrationNumber(op, "decl_insurance", currentCompanyLink?.displayCode),
    };
  });

  const registrationNumber = letterRegNumbers[activeDeclType] || getLetterSpecificRegistrationNumber(
    op,
    activeDeclType === "specs" ? "decl_specs" : "decl_insurance",
    currentCompanyLink?.displayCode
  );

  const setRegistrationNumber = (val: string) => {
    setLetterRegNumbers((prev) => ({
      ...prev,
      [activeDeclType]: val,
    }));
  };

  // كود العملية بالشركة
  const [companyOpCode, setCompanyOpCode] = useState(() => {
    return (
      savedDec?.companyOpCode ||
      currentCompanyLink?.displayCode ||
      `AZ-0${op.serialNumber || 1}`
    );
  });

  const [companyCommercialRegister, setCompanyCommercialRegister] = useState(() => {
    return savedDec?.companyCommercialRegister || currentCompany?.commercialRegister || "110200700036620";
  });
  const [companyTaxCard, setCompanyTaxCard] = useState(() => {
    return savedDec?.companyTaxCard || currentCompany?.taxCard || "658369652";
  });
  const [phoneWhatsapp, setPhoneWhatsapp] = useState(() => {
    return savedDec?.phoneWhatsapp || currentCompany?.phone || "01091708818";
  });
  const [phoneMobile, setPhoneMobile] = useState(() => {
    return savedDec?.phoneMobile || "01557018818";
  });
  const [companyAddress, setCompanyAddress] = useState(() => {
    return savedDec?.companyAddress || currentCompany?.address || "بجوار مستشفى ليدى كير  -  بدمنهور -  البحيره";
  });
  const [companyEmail, setCompanyEmail] = useState(() => {
    return savedDec?.companyEmail || currentCompany?.email || "goldengolden8818@gmail.com";
  });
  const [outgoingDate, setOutgoingDate] = useState(() => {
    return savedDec?.outgoingDate || new Date().toLocaleDateString("en-GB");
  });

  // ━━━ 2. جهة الإسناد وبيانات العملية ━━━
  const [recipientPrefix, setRecipientPrefix] = useState(() => {
    return savedDec?.recipientPrefix || "الأستاذ";
  });
  const [recipientTitleAndAuthority, setRecipientTitleAndAuthority] = useState(() => {
    return getOperationRecipientTitle(op, savedDec?.recipientTitleAndAuthority);
  });

  const [operationRegisteredName, setOperationRegisteredName] = useState(() => {
    return savedDec?.operationRegisteredName || op.name || "";
  });
  const [operationNumber, setOperationNumber] = useState(() => {
    return savedDec?.operationNumber || op.externalNumber || (op.serialNumber ? String(op.serialNumber) : "") || "";
  });
  const [tenderMethod, setTenderMethod] = useState(() => {
    return savedDec?.tenderMethod || getOperationTenderMethod(op);
  });
  const [operationScope, setOperationScope] = useState(() => {
    return getSharedOperationScope(op, savedDec?.operationScope);
  });
  const [fiscalYear, setFiscalYear] = useState(() => {
    return getOperationFiscalYear(op, savedDec?.fiscalYear);
  });
  const [technicalOpeningDate, setTechnicalOpeningDate] = useState(() => {
    return getOperationTechnicalOpeningDate(op, savedDec?.technicalOpeningDate);
  });

  // مزامنة تلقائية للبيانات إذا تغيرت العملية دون وجود تعديل يدوي محفوظ
  useEffect(() => {
    if (!savedDec?.operationRegisteredName && op.name) {
      setOperationRegisteredName(op.name);
    }
    if (!savedDec?.operationScope && (op.name || (op as any).description)) {
      setOperationScope(getSharedOperationScope(op));
    }
    if (!savedDec?.operationNumber && (op.externalNumber || op.serialNumber)) {
      setOperationNumber(op.externalNumber || String(op.serialNumber));
    }
    if (!savedDec?.recipientTitleAndAuthority && op.authority) {
      setRecipientTitleAndAuthority(`مدير الادارة العامة للمشتريات والمخازن بـ ${op.authority}`);
    }
    if (!savedDec?.technicalOpeningDate) {
      setTechnicalOpeningDate(getOperationTechnicalOpeningDate(op));
    }
  }, [op.name, op.externalNumber, op.serialNumber, op.authority, op.dates, savedDec]);

  // ━━━ 3. التوقيعات والاعتمادات والملاحظات ━━━
  const [specialistTitle, setSpecialistTitle] = useState(() => {
    return savedDec?.specialistTitle || "المختص :";
  });
  const [specialistName, setSpecialistName] = useState(() => {
    return savedDec?.specialistName || "";
  });
  const [financeManagerName, setFinanceManagerName] = useState(() => {
    return savedDec?.financeManagerName || "";
  });
  const [boardChairman, setBoardChairman] = useState(() => {
    return sanitizeChairmanTitle(savedDec?.boardChairman);
  });
  const [additionalNotes, setAdditionalNotes] = useState(() => {
    return savedDec?.additionalNotes || "";
  });

  // ━━━ 4. الروابط السحابية لرمز QR (Cloudflare R2 / Gofile) ━━━
  const cleanCloudUrl = (u?: string) => {
    return isValidCloudDocUrl(u) ? (u || "") : "";
  };
  const [cloudPdfUrlSpecs, setCloudPdfUrlSpecs] = useState<string>(() => cleanCloudUrl(savedDec?.cloudPdfUrlSpecs));
  const [cloudPdfUrlInsurance, setCloudPdfUrlInsurance] = useState<string>(() => cleanCloudUrl(savedDec?.cloudPdfUrlInsurance));
  const [uploadingCloud, setUploadingCloud] = useState(false);
  const [lastGeneratedSnapshot, setLastGeneratedSnapshot] = useState<string | null>(null);

  // Modals & Document state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDocxBlob, setPreviewDocxBlob] = useState<Blob | null>(null);
  const [previewPdfBlob, setPreviewPdfBlob] = useState<Blob | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [renderingDocx, setRenderingDocx] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [printingDocx, setPrintingDocx] = useState(false);
  const [savingState, setSavingState] = useState(false);

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
      companyEmail,
      outgoingDate,
      recipientPrefix,
      recipientTitleAndAuthority,
      operationRegisteredName,
      operationNumber,
      tenderMethod,
      operationScope,
      fiscalYear,
      technicalOpeningDate,
      specialistTitle,
      specialistName,
      financeManagerName,
      boardChairman,
      additionalNotes,
      cloudPdfUrlSpecs,
      cloudPdfUrlInsurance,
    });
  }, [
    selectedCompanyId, registrationNumber, companyOpCode, companyCommercialRegister,
    companyTaxCard, phoneWhatsapp, phoneMobile, companyAddress, companyEmail,
    outgoingDate, recipientPrefix, recipientTitleAndAuthority, operationRegisteredName,
    operationNumber, tenderMethod, operationScope, fiscalYear, technicalOpeningDate,
    specialistTitle, specialistName, financeManagerName, boardChairman, additionalNotes,
    cloudPdfUrlSpecs, cloudPdfUrlInsurance,
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
      setCompanyEmail(snap.companyEmail);
      setOutgoingDate(snap.outgoingDate);
      setRecipientPrefix(snap.recipientPrefix);
      setRecipientTitleAndAuthority(snap.recipientTitleAndAuthority);
      setOperationRegisteredName(snap.operationRegisteredName);
      setOperationNumber(snap.operationNumber);
      setTenderMethod(snap.tenderMethod);
      setOperationScope(snap.operationScope);
      setFiscalYear(snap.fiscalYear);
      setTechnicalOpeningDate(snap.technicalOpeningDate);
      setSpecialistTitle(snap.specialistTitle);
      setSpecialistName(snap.specialistName);
      setFinanceManagerName(snap.financeManagerName);
      setBoardChairman(sanitizeChairmanTitle(snap.boardChairman));
      setAdditionalNotes(snap.additionalNotes);
      setCloudPdfUrlSpecs(snap.cloudPdfUrlSpecs);
      setCloudPdfUrlInsurance(snap.cloudPdfUrlInsurance);
      toast.info("تم التراجع عن التعديلات وإعادة الإقرارات للحالة السابقة ↺");
    } catch {
      toast.error("تعذر التراجع عن التعديلات");
    }
  };

  const handleDirectPrint = () => {
    if (isDirty) {
      toast.warning("يجب حفظ التعديلات أولاً قبل الطباعة!");
      return;
    }
    window.print();
  };

  // الرابط السحابي النشط بحسب الإقرار المختار
  const currentCloudUrl =
    activeDeclType === "specs"
      ? cloudPdfUrlSpecs
      : cloudPdfUrlInsurance;

  // إعادة توليد رقم القيد الخاص بالإقرار المختار
  const handleRegenerateRef = async () => {
    const letterKey = activeDeclType === "specs" ? "decl_specs" : "decl_insurance";
    await regenerateLetterSpecificRegistrationNumber({
      op,
      letterKey,
      companyCode: currentCompanyLink?.displayCode || "AZ",
      onSuccess: (fresh) => {
        setRegistrationNumber(fresh);
        onRefresh();
      },
    });
  };

  // ━━━ محرك استبدال المتغيرات في قوالب الإقرارات الرسمية ━━━
  const generateDeclarationDocxBlob = async (type: DeclarationType = activeDeclType): Promise<Blob> => {
    const templatePath =
      type === "specs"
        ? "/templates/declaration_specs_template.docx"
        : "/templates/declaration_insurance_template.docx";

    const response = await fetch(templatePath);
    if (!response.ok) throw new Error(`فشل قراءة قالب الإقرار (${type}) من الخادم`);
    const templateBuffer = await response.arrayBuffer();

    const zip = await JSZip.loadAsync(templateBuffer);

    let qrDrawingXml = "";
    try {
      let activeCloud =
        type === "specs"
          ? cloudPdfUrlSpecs
          : cloudPdfUrlInsurance;

      const docTitle =
        type === "specs"
          ? "إقرار المواصفات الفنية والشروط"
          : "إقرار سداد وقيمة التأمين الابتدائي";

      const filename = `declaration_${type}_${registrationNumber || op.serialNumber || "doc"}.pdf`;
      const qrPayload = await getStandardDocQrPayload(
        activeCloud,
        registrationNumber,
        docTitle,
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
      console.warn("QR generation failed in TabDeclarations:", e);
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

    // ━━━ استبدال متغيرات إقرارات الشروط والتأمينات ━━━
    docXml = docXml.replace(/اسم العملية المسجله[\s\.]*/g, escapeXml(operationRegisteredName) + " ");
    docXml = docXml.replace(/365/g, escapeXml(operationNumber));
    docXml = docXml.replace(/المناقصة المحدودة/g, escapeXml(tenderMethod));
    docXml = replaceDocxScope(docXml, operationScope);
    docXml = replaceDocxFiscalAndDate(docXml, fiscalYear, technicalOpeningDate);

    // التوقيعات والاعتمادات بأسفل الصفحة
    // التوقيعات بأسفل الصفحة في جدول ثلاثي منضبط (المختص | المدير المالي | يعتمد رئيس مجلس الإدارة)
    const decSigBlockRegex = /<w:p\b[^>]*>(?:(?!<w:p\b)[\s\S])*?المختص[\s\S]*?رئيس مجلس[\s\S]*?<\/w:p>/;
    if (decSigBlockRegex.test(docXml)) {
      const sigTableXml = buildOfficialSignaturesTableXml({
        specialistTitle: specialistTitle || "المختص :",
        specialistName: specialistName || " ",
        financeManagerName: financeManagerName || " ",
        boardChairman: boardChairman || "رئيس مجلس الإدارة",
      });
      docXml = docXml.replace(decSigBlockRegex, sigTableXml);
    } else {
      docXml = replaceDocxChairman(docXml, boardChairman);
    }

    // خانة الملاحظات
    if (additionalNotes.trim()) {
      docXml = docXml.replace(/خان[ةه] خالي[ةه] للملاحظات/g, escapeXml(additionalNotes));
    } else {
      docXml = docXml.replace(/خان[ةه] خالي[ةه] للملاحظات/g, "");
    }

    // إزالة علامات التمييز والألوان الحمراء
    docXml = docXml.replace(/<w:highlight\s+[^>]*\/>/g, "");
    docXml = docXml.replace(/<w:color\s+w:val=\"(red|FF0000)\"[^>]*\/>/g, "");

    zip.file("word/document.xml", docXml);

    // 2. ترويسات الصفحة بكافة أجزائها (header1, header2, header3)
    const headerParts = ["word/header1.xml", "word/header2.xml", "word/header3.xml"];
    for (const hp of headerParts) {
      if (zip.file(hp)) {
        let hdrXml = await zip.file(hp)!.async("text");
        hdrXml = hdrXml.replace(/110200700036620/g, escapeXml(companyCommercialRegister));
        hdrXml = hdrXml.replace(/658369652/g, escapeXml(companyTaxCard));
        hdrXml = hdrXml.replace(/\(\s*كود العملية بالشركه\s*\)/g, `( ${escapeXml(companyOpCode)} )`);
        hdrXml = hdrXml.replace(/كود العملية بالشركه/g, escapeXml(companyOpCode));
        hdrXml = hdrXml.replace(/<w:highlight\s+[^>]*\/>/g, "");
        hdrXml = hdrXml.replace(/<w:color\s+w:val=\"(red|FF0000)\"[^>]*\/>/g, "");
        zip.file(hp, hdrXml);
      }
    }

    // 3. تذييلات الصفحة بكافة أجزائها (footer1, footer2, footer3)
    const footerParts = ["word/footer1.xml", "word/footer2.xml", "word/footer3.xml"];
    for (const fp of footerParts) {
      if (zip.file(fp)) {
        let ftrXml = await zip.file(fp)!.async("text");
        ftrXml = ftrXml.replace(/15\/10\/2026/g, escapeXml(outgoingDate));
        if (ftrXml.includes("رقم القيد")) {
          ftrXml = ftrXml.replace(/رقم القيد/g, `رقم القيد : ${escapeXml(registrationNumber)}`);
        }
        ftrXml = ftrXml.replace(/\(\s*باركود المستند أو العمليه/g, `رقم القيد : ${escapeXml(registrationNumber)}`);
        ftrXml = ftrXml.replace(/01091708818/g, escapeXml(phoneWhatsapp));
        ftrXml = ftrXml.replace(/01557018818/g, escapeXml(phoneMobile));
        ftrXml = ftrXml.replace(/بجوار مستشفى ليدى كير\s*-\s*بدمنهور\s*-\s*البح\s*يره/g, escapeXml(companyAddress));
        ftrXml = ftrXml.replace(/بجوار مستشفى ليدى كير\s*-\s*بدمنهور\s*-\s*البحيره/g, escapeXml(companyAddress));
        ftrXml = ftrXml.replace(/goldengolden8818@gmail.com/g, escapeXml(companyEmail));
        ftrXml = ftrXml.replace(/<w:highlight\s+[^>]*\/>/g, "");
        ftrXml = ftrXml.replace(/<w:color\s+w:val=\"(red|FF0000)\"[^>]*\/>/g, "");
        zip.file(fp, ftrXml);
      }
    }

    // تفريغ كافة التحديدات الحمراء في سائر ملفات القالب
    // إزالة كافة علامات التحديد الأحمر والعلامات المائية والصور التالفة
    await cleanAllDocxXml(zip);

    return await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  };

  // ━━━ تحويل المستند الأصلي إلى PDF ذكي وفوري ━━━
  const generateDeclarationPdfBlob = async (type: DeclarationType = activeDeclType): Promise<Blob> => {
    const docxBlob = await generateDeclarationDocxBlob(type);
    setPreviewDocxBlob(docxBlob);
    const pdf = await getPdfBlobFromDocx(docxBlob, `declaration_${type}_${registrationNumber}.docx`);
    setPreviewPdfBlob(pdf);
    return pdf;
  };

  // ━━━ رفع وتوثيق النسخة الرقمية المعتمدة سحابياً (Catbox.moe / Gofile.io) ━━━
  const handleUploadToCloud = async (type: DeclarationType = activeDeclType, forceReupload = false, existingBlob?: Blob) => {
    const existingUrl =
      type === "specs"
        ? cloudPdfUrlSpecs
        : cloudPdfUrlInsurance;
    if (existingUrl && !existingUrl.includes("tmpfiles") && !existingUrl.includes("tmpfile") && !existingUrl.includes("catbox") && !forceReupload) {
      toast.info("تم رفع وتوثيق هذا المستند سحابياً مسبقاً وهو نشط بالفعل ✓");
      return;
    }

    setUploadingCloud(true);
    try {
      toast.info("جاري توثيق ورفع الإقرار سحابياً (رابط PDF مباشر)...");
      let pdfBlob = existingBlob;
      if (!pdfBlob || forceReupload) {
        pdfBlob = await generateDeclarationPdfBlob(type);
      }

      const res = await uploadPdfToFreeCloud(
        pdfBlob,
        `declaration_${type}_${registrationNumber || op.serialNumber}.pdf`
      );

      if (res?.url) {
        const nextSpecs = type === "specs" ? res.url : cloudPdfUrlSpecs;
        const nextIns = type === "insurance" ? res.url : cloudPdfUrlInsurance;

        if (type === "specs") {
          setCloudPdfUrlSpecs(res.url);
        } else {
          setCloudPdfUrlInsurance(res.url);
        }

        // مزامنة المعاينة في الذاكرة فوراً لفتحها بـ 0ms بدون أي إعادة توليد
        setPreviewPdfBlob(pdfBlob);
        if (previewPdfUrl) {
          URL.revokeObjectURL(previewPdfUrl);
        }
        setPreviewPdfUrl(URL.createObjectURL(pdfBlob));

        const syncedSnapshot = JSON.stringify({
          selectedCompanyId,
          registrationNumber,
          companyOpCode,
          companyCommercialRegister,
          companyTaxCard,
          phoneWhatsapp,
          phoneMobile,
          companyAddress,
          companyEmail,
          outgoingDate,
          recipientPrefix,
          recipientTitleAndAuthority,
          operationRegisteredName,
          operationNumber,
          tenderMethod,
          operationScope,
          fiscalYear,
          technicalOpeningDate,
          specialistTitle,
          specialistName,
          financeManagerName,
          boardChairman,
          additionalNotes,
          cloudPdfUrlSpecs: nextSpecs,
          cloudPdfUrlInsurance: nextIns,
        });
        setLastGeneratedSnapshot(syncedSnapshot);

        toast.success("تم توثيق ورفع الإقرار وتحديث المعاينة بنجاح! جاهز للمعاينة الفورية 🚀");

        // حفظ في notes العملية تلقائياً
        try {
          let existingNotesObj: any = {};
          if (op.notes && op.notes.startsWith("{")) existingNotesObj = JSON.parse(op.notes);
          else if (op.notes) existingNotesObj = { textNotes: op.notes };
          if (!existingNotesObj.declarationsDocx) existingNotesObj.declarationsDocx = {};
          if (type === "specs") {
            existingNotesObj.declarationsDocx.cloudPdfUrlSpecs = res.url;
          } else {
            existingNotesObj.declarationsDocx.cloudPdfUrlInsurance = res.url;
          }
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
  const loadOfficialPreview = async (forceRefresh = false) => {
    // 1. فتح نافذة المعاينة فوراً للمستخدم
    setPreviewModalOpen(true);

    // 2. إذا كان المستند مولداً ومطابقاً لآخر تعديل بدون أي تغيير -> فتح فوري بـ 0ms
    if (!forceRefresh && previewPdfBlob && currentSnapshot === lastGeneratedSnapshot) {
      return;
    }

    // منع أي تحويل مزدوج متزامن
    if (renderingDocx) {
      return;
    }

    setRenderingDocx(true);
    if (forceRefresh) {
      toast.info("جاري تحديث المعاينة الرسمية...");
    }
    try {
      const docx = await generateDeclarationDocxBlob(activeDeclType);
      setPreviewDocxBlob(docx);

      const pdfBlob = await getPdfBlobFromDocx(docx, `declaration_${activeDeclType}_${registrationNumber}.docx`);
      setPreviewPdfBlob(pdfBlob);
      const url = URL.createObjectURL(pdfBlob);
      setPreviewPdfUrl(url);

      setLastGeneratedSnapshot(currentSnapshot);
      if (forceRefresh) {
        toast.success("تم تحديث المعاينة بنجاح ✓");
      }
    } catch (err: any) {
      console.error("فشل تجهيز المعاينة:", err);
      toast.error("تعذر تجهيز المعاينة: " + (err?.message || ""));
    } finally {
      setRenderingDocx(false);
    }
  };

  // ━━━ سجل الطباعة وتنبيه إعادة الطباعة ━━━
  const [printHistory, setPrintHistory] = useState<Record<string, PrintHistoryEntry>>(() => {
    let notesObj: any = {};
    if (op.notes && op.notes.startsWith("{")) {
      try { notesObj = JSON.parse(op.notes); } catch (e) {}
    }
    return notesObj.declarationsDocx?.printHistory || notesObj.declarationsLetter?.printHistory || {};
  });
  const [reprintWarningOpen, setReprintWarningOpen] = useState(false);

  // ━━━ دالة تنفيذ الطباعة وتحديث سجل الطباعة الرسمي ━━━
  const executePrintDoc = async () => {
    setPrintingDocx(true);
    try {
      toast.info("جاري تجهيز مستند الإقرار للطباعة بأعلى دقة...");
      const pdfBlob = previewPdfBlob || (await generateDeclarationPdfBlob(activeDeclType));
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
      const prev = printHistory[activeDeclType] || { printCount: 0 };
      const updatedHistory = {
        ...printHistory,
        [activeDeclType]: {
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
        const existingDec = notesObj.declarationsDocx || {};
        existingDec.printHistory = updatedHistory;
        notesObj.declarationsDocx = existingDec;
        await api.patch(`/operations/${op.id}`, { notes: JSON.stringify(notesObj) });
        onRefresh();
      } catch (e) {
        console.warn("Could not persist print history:", e);
      }

      if (!currentCloudUrl || currentCloudUrl.includes("tmpfiles") || currentCloudUrl.includes("tmpfile") || currentCloudUrl.includes("catbox")) {
        handleUploadToCloud(activeDeclType, false, pdfBlob).catch(() => {});
      }

      toast.success("تم إرسال المستند للطباعة وتحديث سجل الطباعة بنجاح ✓");
    } catch (err: any) {
      toast.error("فشل تجهيز الطباعة: " + (err?.message || ""));
    } finally {
      setPrintingDocx(false);
    }
  };

  // ━━━ طباعة مستند الوورد الأصلي مع التحقق من الطباعة السابقة ━━━
  const handlePrintWordDocument = async () => {
    if (isDirty) {
      toast.warning("يجب حفظ التعديلات أولاً قبل الطباعة!");
      return;
    }
    const currentInfo = printHistory[activeDeclType];
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
    setPreviewModalOpen(true);
    loadOfficialPreview(false);
  };

  // تنزيل ملف Word (.docx)
  const handleDownloadDocx = async (type: DeclarationType = activeDeclType) => {
    const declName =
      type === "specs"
        ? "إقرار_الالتزام_بكراسة_الشروط"
        : type === "insurance"
        ? "إقرار_التأمينات_والعمالة"
        : "خطاب_عام_رسمي";

    if (previewDocxBlob && currentSnapshot === lastGeneratedSnapshot && type === activeDeclType) {
      const url = URL.createObjectURL(previewDocxBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${declName}_${op.serialNumber || "365"}_${registrationNumber}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل ملف الوورد فوراً! 📄✨");
      return;
    }

    setDownloadingDocx(true);
    try {
      const blob = await generateDeclarationDocxBlob(type);
      setPreviewDocxBlob(blob);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${declName}_${op.serialNumber || "365"}_${registrationNumber}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل ملف الوورد الأصلي المعتمد بنجاح! 📄✨");
    } catch (err: any) {
      toast.error("فشل تنزيل ملف الوورد: " + (err?.message || ""));
    } finally {
      setDownloadingDocx(false);
    }
  };

  // تنزيل ملف PDF
  const handleDownloadPdf = async (type: DeclarationType = activeDeclType) => {
    const declName =
      type === "specs"
        ? "إقرار_الالتزام_بكراسة_الشروط"
        : type === "insurance"
        ? "إقرار_التأمينات_والعمالة"
        : "خطاب_عام_رسمي";

    if (previewPdfBlob && currentSnapshot === lastGeneratedSnapshot && type === activeDeclType) {
      const url = URL.createObjectURL(previewPdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${declName}_${op.serialNumber || "365"}_${registrationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تحميل مستند PDF فوراً! 📑✨");

      if (!currentCloudUrl || currentCloudUrl.includes("tmpfiles") || currentCloudUrl.includes("tmpfile") || currentCloudUrl.includes("catbox")) {
        handleUploadToCloud(type, false, previewPdfBlob);
      }
      return;
    }

    setDownloadingPdf(true);
    try {
      toast.info("جاري تصدير المستند بصيغة PDF الرسمية عبر محرك Word...");
      const docx = await generateDeclarationDocxBlob(type);
      const pdfBlob = await getPdfBlobFromDocx(docx, `declaration_${type}_${registrationNumber}.docx`);
      setPreviewDocxBlob(docx);
      setPreviewPdfBlob(pdfBlob);
      setLastGeneratedSnapshot(currentSnapshot);

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${declName}_${op.serialNumber || "365"}_${registrationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تحميل مستند PDF بنجاح! 📑✨");

      if (!currentCloudUrl || currentCloudUrl.includes("tmpfiles") || currentCloudUrl.includes("tmpfile") || currentCloudUrl.includes("catbox")) {
        handleUploadToCloud(type, false, pdfBlob);
      }
    } catch (err: any) {
      toast.error("فشل تصدير ملف PDF: " + (err?.message || ""));
    } finally {
      setDownloadingPdf(false);
    }
  };

  // ━━━ حالة إضافة الإقرار إلى مستندات الأرشيف ━━━
  const [addingToArchive, setAddingToArchive] = useState(false);
  const currentArchiveDocId = useMemo(() => {
    return activeDeclType === "specs"
      ? "decl-specs"
      : activeDeclType === "insurance"
      ? "decl-insurance"
      : "decl-general";
  }, [activeDeclType]);

  const isCurrentArchived = useMemo(() => {
    if (isDirty) return false;
    try {
      if (op.notes && op.notes.startsWith("{")) {
        const parsed = JSON.parse(op.notes);
        const list = parsed.archivedDocIds || [];
        return list.includes(currentArchiveDocId);
      }
    } catch {}
    return false;
  }, [op.notes, currentArchiveDocId, isDirty]);

  const handleToggleArchive = async () => {
    setAddingToArchive(true);
    let notesObj: any = {};
    try {
      if (op.notes && op.notes.startsWith("{")) {
        notesObj = JSON.parse(op.notes);
      }
    } catch {}

    const current: string[] = notesObj.archivedDocIds || [];
    const exists = current.includes(currentArchiveDocId);
    const shouldRemove = exists && !isDirty;
    const updated = shouldRemove
      ? current.filter((id: string) => id !== currentArchiveDocId)
      : Array.from(new Set([...current, currentArchiveDocId]));

    notesObj.archivedDocIds = updated;

    try {
      if (!shouldRemove) {
        if (isDirty) {
          const snapToSave = currentSnapshot;
          setSavedSnapshot(snapToSave);
          notesObj.declarationsDocx = {
            ...(notesObj.declarationsDocx || {}),
            ...JSON.parse(snapToSave),
          };
        }

        const docTitle =
          activeDeclType === "specs"
            ? "إقرار الالتزام بكراسة الشروط والمواصفات"
            : "إقرار الالتزام بالتأمينات والعمالة والمساواة";
        toast.info(`جاري تجهيز وتوثيق نسخة PDF الرسمية لـ ${docTitle}...`);
        try {
          const docx = await generateDeclarationDocxBlob(activeDeclType);
          const pdf = await getPdfBlobFromDocx(
            docx,
            `declaration_${activeDeclType}_${registrationNumber || op.serialNumber}.docx`
          );
          const cloudFilename = `declaration_${activeDeclType}_${registrationNumber || op.serialNumber || "doc"}.pdf`;
          const cloudRes = await uploadPdfToFreeCloud(pdf, cloudFilename).catch(() => null);

          if (!notesObj.declarationsDocx) notesObj.declarationsDocx = {};
          if (cloudRes?.url) {
            if (activeDeclType === "specs") {
              notesObj.declarationsDocx.cloudPdfUrlSpecs = cloudRes.url;
              setCloudPdfUrlSpecs(cloudRes.url);
            } else {
              notesObj.declarationsDocx.cloudPdfUrlInsurance = cloudRes.url;
              setCloudPdfUrlInsurance(cloudRes.url);
            }
          }

          // رفع ملف الـ PDF كوثيقة رسمية للعملية
          const formData = new FormData();
          formData.append("file", pdf, `${docTitle}.pdf`);
          formData.append("type", "DECLARATION");
          await api.post(`/operations/${op.id}/documents`, formData).catch(() => {});
        } catch (pdfErr) {
          console.warn("Archival PDF generation error in TabDeclarations:", pdfErr);
        }
      }

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(notesObj),
      });
      toast.success(
        shouldRemove
          ? "تمت إزالة الإقرار من مستندات الأرشيف وحزمة التقديم 📂"
          : "تمت إضافة النسخة المحدثة وتوثيقها في الأرشيف وحزمة التقديم بنجاح! 📦✨"
      );
      onRefresh();
    } catch (err: any) {
      toast.error("فشل تحديث حالة الأرشيف للإقرار: " + (err?.message || ""));
    } finally {
      setAddingToArchive(false);
    }
  };

  useEffect(() => {
    if (previewModalOpen) {
      loadOfficialPreview();
    }
  }, [previewModalOpen, activeDeclType]);

  // حفظ الإقرارات في قاعدة بيانات النظام
  const handleSaveToSystem = async () => {
    const snapToSave = currentSnapshot;
    setSavedSnapshot(snapToSave);
    setSavingState(true);
    toast.success("تم حفظ بيانات الإقرارات بنجاح! 💾✨");

    try {
      let existingNotesObj: Record<string, any> = {};
      try {
        if (op.notes && op.notes.startsWith("{")) {
          existingNotesObj = JSON.parse(op.notes);
        } else if (op.notes) {
          existingNotesObj = { textNotes: op.notes };
        }
      } catch {}

      existingNotesObj.declarationsDocx = {
        ...(existingNotesObj.declarationsDocx || {}),
        ...JSON.parse(snapToSave),
        letterRegNumbers,
        cloudPdfUrlSpecs,
        cloudPdfUrlInsurance,
      };

      if (!existingNotesObj.letterRegistrationNumbers) {
        existingNotesObj.letterRegistrationNumbers = {};
      }
      existingNotesObj.letterRegistrationNumbers["decl_specs"] = letterRegNumbers.specs;
      existingNotesObj.letterRegistrationNumbers["decl_insurance"] = letterRegNumbers.insurance;

      existingNotesObj.operationScope = operationScope;
      existingNotesObj.fiscalYear = fiscalYear;

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(existingNotesObj),
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل الحفظ في السيرفر");
    } finally {
      setSavingState(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-foreground print:m-0 print:p-0">




      {/* ━━━ SUB-TAB SWITCHER (اختيار نوع الإقرار) ━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setActiveDeclType("specs")}
          className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
            activeDeclType === "specs"
              ? "bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-sm"
              : "bg-card border-border hover:bg-muted/60 text-muted-foreground"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm">1. إقرار الالتزام بكراسة الشروط</span>
              {cloudPdfUrlSpecs && (
                <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-1.5">سحابي ✓</Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              تعهد والتزام كامل بجميع شروط ومواصفات العملية
            </p>
          </div>
          <FileCheck className={`h-6 w-6 shrink-0 ${activeDeclType === "specs" ? "text-emerald-600" : "text-muted-foreground"}`} />
        </button>

        <button
          type="button"
          onClick={() => setActiveDeclType("insurance")}
          className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
            activeDeclType === "insurance"
              ? "bg-teal-500/15 border-teal-500 text-teal-900 dark:text-teal-200 shadow-sm"
              : "bg-card border-border hover:bg-muted/60 text-muted-foreground"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm">2. إقرار التأمينات والعمالة</span>
              {cloudPdfUrlInsurance && (
                <Badge className="bg-teal-600 text-white text-[10px] py-0 px-1.5">سحابي ✓</Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              سداد التأمينات على المقاولات والعمالة غير المنتظمة
            </p>
          </div>
          <ShieldCheck className={`h-6 w-6 shrink-0 ${activeDeclType === "insurance" ? "text-teal-600" : "text-muted-foreground"}`} />
        </button>
      </div>

      {/* ━━━ SECTION 1: بيانات الشركة المصدرة ورقم القيد والباركود السحابي ━━━ */}
      <SectionCard
        title="1. بيانات الشركة المصدرة وكود العملية ورقم القيد والباركود السحابي"
        icon={Building2}
        iconColor="text-emerald-600"
        badge={
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
            الشركة: {currentCompanyLink?.displayCode || "A1"}
          </Badge>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* اختيار الشركة المصدرة */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold text-foreground">الشركة المصدرة للإقرار *</Label>
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
                <Label className="text-xs font-bold text-foreground">رقم القيد الصادر بالإقرار *</Label>
                <button
                  type="button"
                  onClick={handleRegenerateRef}
                  className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
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

            {/* تاريخ الصادر */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">التاريخ الصادر (Footer) *</Label>
              <Input
                value={outgoingDate}
                onChange={(e) => setOutgoingDate(e.target.value)}
                className="h-9.5 text-xs font-mono rounded-xl"
              />
            </div>
          </div>

          {/* العنوان ووسائل الاتصال بالتذييل */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">هاتف الواتساب (Footer)</Label>
              <Input
                value={phoneWhatsapp}
                onChange={(e) => setPhoneWhatsapp(e.target.value)}
                className="h-9.5 text-xs font-mono rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">هاتف الموبايل (Footer)</Label>
              <Input
                value={phoneMobile}
                onChange={(e) => setPhoneMobile(e.target.value)}
                className="h-9.5 text-xs font-mono rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">البريد الإلكتروني (Footer)</Label>
              <Input
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                className="h-9.5 text-xs font-mono rounded-xl"
              />
            </div>
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
      </SectionCard>

      {/* ━━━ SECTION 2: جهة الإسناد وبيانات العملية في موضوع ومتن الإقرار الرسمي ━━━ */}
      <SectionCard
        title="2. جهة الإسناد وبيانات العملية في موضوع ومتن الإقرار الرسمي"
        icon={FileText}
        iconColor="text-teal-600"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">لقب المرسل إليه *</Label>
              <Input
                value={recipientPrefix}
                onChange={(e) => setRecipientPrefix(e.target.value)}
                className="h-9.5 text-xs font-bold rounded-xl text-center"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label className="text-xs font-bold text-foreground">صفة وجهة الإسناد الإدارية *</Label>
              <Input
                value={recipientTitleAndAuthority}
                onChange={(e) => setRecipientTitleAndAuthority(e.target.value)}
                className="h-9.5 text-xs font-bold rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">اسم العملية المسجلة *</Label>
              <Input
                value={operationRegisteredName}
                onChange={(e) => setOperationRegisteredName(e.target.value)}
                className="h-9.5 text-xs font-bold rounded-xl"
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
              <Label className="text-xs font-bold text-foreground">طريقة الطرح والتعاقد *</Label>
              <Input
                value={tenderMethod}
                onChange={(e) => setTenderMethod(e.target.value)}
                className="h-9.5 text-xs font-bold rounded-xl text-center"
              />
            </div>
          </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">طبيعة ونطاق التوريد بالعملية *</Label>
                  <Input
                    value={operationScope}
                    onChange={(e) => setOperationScope(e.target.value)}
                    className="h-9.5 text-xs rounded-xl"
                  />
                </div>

                <FiscalYearSelect
                  value={fiscalYear}
                  onChange={setFiscalYear}
                  label="العام المالي للعملية *"
                />

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">موعد جلسة فتح المظروف الفني *</Label>
                  <Input
                    value={technicalOpeningDate}
                    onChange={(e) => setTechnicalOpeningDate(e.target.value)}
                    className="h-9.5 text-xs font-mono rounded-xl text-center"
                  />
                </div>
              </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 3: الاعتمادات والتوقيعات والملاحظات ━━━ */}
      <SectionCard
        title="3. الاعتمادات والتوقيعات الرسمية والملاحظات الإضافية"
        icon={ShieldCheck}
        iconColor="text-indigo-600"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">صفة المختص</Label>
              <Input
                value={specialistTitle}
                onChange={(e) => setSpecialistTitle(e.target.value)}
                className="h-9.5 text-xs font-bold rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">اسم المختص</Label>
              <Input
                value={specialistName}
                onChange={(e) => setSpecialistName(e.target.value)}
                className="h-9.5 text-xs font-bold rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">المدير المالي (اسم أو توقيع)</Label>
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

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">ملاحظات إضافية بالإقرار (اختياري)</Label>
            <Textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="اكتب هنا أي ملاحظات إضافية ترغب في طباعتها بالإقرار (سيتم وضعها في خانة الملاحظات)، أو اتركها فارغة لتفريغها تماماً."
              className="text-xs rounded-xl min-h-[70px]"
            />
          </div>
        </div>
      </SectionCard>

      {/* ━━━ MODAL: معاينة مستند الوورد الأصلي المعتمد ━━━ */}
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
                        معاينة قالب الوورد المعتمد: {activeDeclType === "specs" ? "إقرار كراسة الشروط.docx" : activeDeclType === "insurance" ? "إقرار التأمينات والعمالة.docx" : "خطاب عام رسمي.docx"}
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
                    documentTitle={`${activeDeclType === "specs" ? "إقرار_شروط" : activeDeclType === "insurance" ? "إقرار_تأمينات" : "خطاب_عام"}_${op.externalNumber || op.serialNumber}_${registrationNumber}.docx`}
                    docxBlob={previewDocxBlob}
                    pdfBlob={previewPdfBlob}
                    pdfUrl={previewPdfUrl}
                    onDownloadDocx={() => handleDownloadDocx(activeDeclType)}
                    onDownloadPdf={() => handleDownloadPdf(activeDeclType)}
                    onPrint={handlePrintWordDocument}
                    onAddToArchive={handleToggleArchive}
                    isArchived={isCurrentArchived}
                    addingToArchive={addingToArchive}
                    cloudUploadWarning={
                      !(activeDeclType === "specs" ? cloudPdfUrlSpecs : cloudPdfUrlInsurance) || currentSnapshot !== lastGeneratedSnapshot
                        ? "⚠️ تنبيه هام: هذا الإقرار يحتوي على تعديلات جديدة لم يتم رفعها سحابياً — يرجى الضغط على 'إعادة الرفع والتحديث' لكي يتطابق الباركود مع أحدث بيانات!"
                        : null
                    }
                    onUploadCloud={() => handleUploadToCloud(activeDeclType, true)}
                    isUploadingCloud={uploadingCloud}
                  />
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ━━━ BOTTOM ACTION BAR: التوليد والطباعة والمعاينة بأسفل مرحلة الإقرارات ━━━ */}
      <LetterBottomActionWidget
        title={
          activeDeclType === "specs"
            ? "إقرار الالتزام بكراسة الشروط والمواصفات الفنية"
            : "إقرار سداد التأمينات الاجتماعية والعمالة غير المنتظمة"
        }
        registrationNumber={registrationNumber}
        isDirty={isDirty}
        printInfo={printHistory[activeDeclType]}
        onPreview={() => {
          loadOfficialPreview();
        }}
        onSave={handleSaveToSystem}
        onCancelEdits={handleCancelEdits}
        saving={savingState}
        onViewArchive={handleViewArchive}
        onAddToArchive={handleToggleArchive}
        isArchived={isCurrentArchived}
        addingToArchive={addingToArchive}
        icon={ShieldCheck}
        iconColor="text-emerald-700 dark:text-emerald-400"
        iconBg="bg-emerald-500/15 border-emerald-500/30"
        customSubtitle="مطابقة 100% لقوالب الوورد الرسمية المعتمدة للشركة. اضغط على زر المعاينة للاطلاع على المستند وتنزيله أو طباعته."
      />

      {/* ━━━ نافذة التنبيه عند إعادة طباعة مستند مطبوع مسبقاً ━━━ */}
      <ReprintConfirmModal
        open={reprintWarningOpen}
        onClose={() => setReprintWarningOpen(false)}
        printInfo={printHistory[activeDeclType]}
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
        currentTabId="declarations"
        onNavigate={onNavigate}
        nextLabel="الانتقال إلى: #9 تجهيز وطباعة ملفات التقديم ➔"
        prevLabel="← العرض المالي وجدول الكميات"
      />
    </div>
  );
}
