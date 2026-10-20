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
import { generateSmartOutgoingRef, cleanAllDocxXml, buildQrAnchorXml, FISCAL_YEAR_OPTIONS } from "./letter-utils";
import JSZip from "jszip";
import QRCode from "qrcode";
import { getPdfBlobFromDocx } from "./client-pdf";

export type DeclarationType = "specs" | "insurance" | "general_letter";

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

  // رقم القيد الصادر الذكي
  const [registrationNumber, setRegistrationNumber] = useState(() => {
    if (savedDec?.registrationNumber) return savedDec.registrationNumber;
    return generateSmartOutgoingRef({
      companyCode: currentCompanyLink?.displayCode || "Ad",
      tenderType: op.tenderType || "LIMITED_TENDER",
      dateStr: new Date().toISOString(),
    });
  });

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
    return (
      savedDec?.recipientTitleAndAuthority ||
      (op.authority
        ? `مدير الادارة العامة للمشتريات والمخازن بـ ${op.authority}`
        : "مدير الادارة العامة للمشتريات والمخازن بجامعة دمنهور")
    );
  });

  const [operationRegisteredName, setOperationRegisteredName] = useState(() => {
    return savedDec?.operationRegisteredName || op.name || "توريد كاوتش وبطاريات للسيارات";
  });
  const [operationNumber, setOperationNumber] = useState(() => {
    return savedDec?.operationNumber || op.externalNumber || String(op.serialNumber || "365");
  });
  const [tenderMethod, setTenderMethod] = useState(() => {
    return savedDec?.tenderMethod || "المناقصة المحدودة";
  });
  const [operationScope, setOperationScope] = useState(() => {
    return savedDec?.operationScope || "توريد كاوتش وبطاريات للسيارات للجامعه";
  });
  const [fiscalYear, setFiscalYear] = useState(() => {
    return savedDec?.fiscalYear || "2024 / 2025";
  });
  const [technicalOpeningDate, setTechnicalOpeningDate] = useState(() => {
    if (savedDec?.technicalOpeningDate) return savedDec.technicalOpeningDate;
    const d = op.dates?.find((dt: any) => dt.type === "TECHNICAL_OPENING" || dt.title?.includes("فني"));
    if (d?.dateValue) return formatDate(d.dateValue);
    if (d?.date) return formatDate(d.date);
    return "14/ 1 /2024";
  });

  // ━━━ 3. التوقيعات والاعتمادات والملاحظات ━━━
  const [specialistTitle, setSpecialistTitle] = useState(() => {
    return savedDec?.specialistTitle || "المختص :";
  });
  const [specialistName, setSpecialistName] = useState(() => {
    return savedDec?.specialistName || "أحمد محمد";
  });
  const [financeManagerName, setFinanceManagerName] = useState(() => {
    return savedDec?.financeManagerName || "محمود إبراهيم";
  });
  const [boardChairman, setBoardChairman] = useState(() => {
    return savedDec?.boardChairman || "يعتمد ،،،،،، رئيس مجلس الإدارة";
  });
  const [additionalNotes, setAdditionalNotes] = useState(() => {
    return savedDec?.additionalNotes || "";
  });

  // ━━━ 4. الروابط السحابية لرمز QR ━━━
  const [cloudPdfUrlSpecs, setCloudPdfUrlSpecs] = useState<string>(() => savedDec?.cloudPdfUrlSpecs || "");
  const [cloudPdfUrlInsurance, setCloudPdfUrlInsurance] = useState<string>(() => savedDec?.cloudPdfUrlInsurance || "");
  const [cloudPdfUrlGeneral, setCloudPdfUrlGeneral] = useState<string>(() => savedDec?.cloudPdfUrlGeneral || "");
  const [uploadingCloud, setUploadingCloud] = useState(false);

  // ━━━ 5. بيانات الخطاب العام ━━━
  const [generalSubject, setGeneralSubject] = useState(() => {
    return savedDec?.generalSubject || (op.name ? `بشأن عملية ${op.name}` : "طلب إفادة رسمية بشأن العملية");
  });
  const [generalLetterBody, setGeneralLetterBody] = useState(() => {
    return (
      savedDec?.generalLetterBody ||
      `الرجاء من سيادتكم التكرم بالموافقة على سحب كراسة الشروط والمواصفات والخاصة (${op.tenderType === "LIMITED_TENDER" ? "بالمناقصة المحدودة" : "بالمناقصة العامة"}) لزوم (${op.name || "توريد الأصناف المطلوبة"}) طرفكم للعام المالى 2024 / 2025 والمحدد لها جلسة ( 14/ 1 /2024 ) لفتح المظروف الفنى . وتفوض الشركة السيد / (أحمد محمد أحمد ) وصفته ( مندوب التعاقدات المفوض ) قومى رقم : 23056289523202 في تمثيل الشركة في كل ما يلزم من استلام المستندات وسداد المبالغ واستلام الايصالات وحضور الجلسات وجميع الأوراق والتوقيع على العقود واستلام الخطابات والمكاتبات الرسميه .`
    );
  });

  // Modals & Document state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
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
      cloudPdfUrlGeneral,
      generalSubject,
      generalLetterBody,
    });
  }, [
    selectedCompanyId, registrationNumber, companyOpCode, companyCommercialRegister,
    companyTaxCard, phoneWhatsapp, phoneMobile, companyAddress, companyEmail,
    outgoingDate, recipientPrefix, recipientTitleAndAuthority, operationRegisteredName,
    operationNumber, tenderMethod, operationScope, fiscalYear, technicalOpeningDate,
    specialistTitle, specialistName, financeManagerName, boardChairman, additionalNotes,
    cloudPdfUrlSpecs, cloudPdfUrlInsurance, cloudPdfUrlGeneral, generalSubject, generalLetterBody,
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
      setBoardChairman(snap.boardChairman);
      setAdditionalNotes(snap.additionalNotes);
      setCloudPdfUrlSpecs(snap.cloudPdfUrlSpecs);
      setCloudPdfUrlInsurance(snap.cloudPdfUrlInsurance);
      setCloudPdfUrlGeneral(snap.cloudPdfUrlGeneral || "");
      if (snap.generalSubject) setGeneralSubject(snap.generalSubject);
      if (snap.generalLetterBody) setGeneralLetterBody(snap.generalLetterBody);
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
      : activeDeclType === "insurance"
      ? cloudPdfUrlInsurance
      : cloudPdfUrlGeneral;

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

  // ━━━ محرك استبدال المتغيرات في قوالب الإقرارات الرسمية ━━━
  const generateDeclarationDocxBlob = async (type: DeclarationType = activeDeclType): Promise<Blob> => {
    const templatePath =
      type === "specs"
        ? "/templates/declaration_specs_template.docx"
        : type === "insurance"
        ? "/templates/declaration_insurance_template.docx"
        : "/templates/general_letter_template.docx";

    const response = await fetch(templatePath);
    if (!response.ok) throw new Error(`فشل قراءة قالب الإقرار (${type}) من الخادم`);
    const templateBuffer = await response.arrayBuffer();

    const zip = await JSZip.loadAsync(templateBuffer);

    // توليد رمز التحقق الرقمي والباركود للنسخة الرقمية
    let qrDrawingXml = "";
    try {
      const activeCloud =
        type === "specs"
          ? cloudPdfUrlSpecs
          : type === "insurance"
          ? cloudPdfUrlInsurance
          : cloudPdfUrlGeneral;
      const targetVerifyUrl =
        activeCloud ||
        `${typeof window !== "undefined" ? window.location.origin : ""}/verify-doc?ref=${encodeURIComponent(registrationNumber)}&opId=${op.id}&type=declaration_${type}`;
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

    // استبدال كلمة الباركود بالأعلى في P0 برمز QR الرقمي مباشرة (الصفحة الأولى فقط)
    let qrDone = false;
    docXml = docXml.replace(/الباركود|البركود/g, () => {
      if (!qrDone && qrDrawingXml) {
        qrDone = true;
        return `</w:t></w:r>${qrDrawingXml}<w:r><w:t>`;
      }
      return "";
    });
    if (!qrDone && qrDrawingXml && docXml.includes("Ad26111000001")) {
      qrDone = true;
      docXml = docXml.replace("Ad26111000001", `${escapeXml(registrationNumber)}</w:t></w:r>${qrDrawingXml}<w:r><w:t>`);
    } else {
      docXml = docXml.replace(/Ad26111000001/g, escapeXml(registrationNumber));
    }

    // لقب وصفة المرسل إليه
    docXml = docXml.replace(/الأستاذ/g, escapeXml(recipientPrefix));
    docXml = docXml.replace(
      /مدير الادارة العامة للمشتريات والمخازن بجامعة دمنهور/g,
      escapeXml(recipientTitleAndAuthority)
    );

    if (type === "general_letter") {
      // ━━━ استبدال متغيرات الخطاب العام ━━━
      docXml = docXml.replace(/الموضوع بخصوص\s*:\s*\.{3,}/g, `الموضوع بخصوص : ${escapeXml(generalSubject)}`);
      docXml = docXml.replace(/\.{3,}/g, escapeXml(generalSubject));

      // استبدال متن الخطاب العام بالكامل
      const bodyPattern = /<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?الرجاء من سيادتكم(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/;
      if (bodyPattern.test(docXml)) {
        const newBodyXml = `<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="-567" w:hanging="283"/><w:jc w:val="highKashida"/><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="36"/><w:szCs w:val="36"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="36"/><w:szCs w:val="36"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">${escapeXml(generalLetterBody)}</w:t></w:r></w:p>`;
        docXml = docXml.replace(bodyPattern, newBodyXml);
      } else {
        docXml = docXml.replace(/الرجاء من سيادتكم[\s\S]*?المكاتبات الرسميه\s*\./g, escapeXml(generalLetterBody));
      }

      docXml = docXml.replace(/أحمد محمد/g, escapeXml(specialistName));
      docXml = docXml.replace(/توقيع صورة أو اسم/g, escapeXml(financeManagerName || " "));
      docXml = docXml.replace(/توقيع صورة/g, escapeXml(financeManagerName || " "));
      docXml = docXml.replace(/المختص\s*:/g, escapeXml(specialistTitle));
    } else {
      // ━━━ استبدال متغيرات إقرارات الشروط والتأمينات ━━━
      docXml = docXml.replace(/اسم العملية المسجله[\s\.]*/g, escapeXml(operationRegisteredName) + " ");
      docXml = docXml.replace(/365/g, escapeXml(operationNumber));
      docXml = docXml.replace(/المناقصة المحدودة/g, escapeXml(tenderMethod));
      docXml = docXml.replace(/المناقصة ال[\s\S]*?محدود[\s\S]*?ة/g, escapeXml(tenderMethod));
      docXml = docXml.replace(/توريد كاوتش وبطاريات للسيارات للجامعه/g, escapeXml(operationScope));
      docXml = docXml.replace(/2024\s*\/\s*2025/g, escapeXml(fiscalYear));
      docXml = docXml.replace(/14\/\s*1\s*\/2024/g, escapeXml(technicalOpeningDate));

      // التوقيعات والاعتمادات
      docXml = docXml.replace(/المختص\s*:/g, escapeXml(specialistTitle));
      docXml = docXml.replace(/أحمد محمد/g, escapeXml(specialistName));
      docXml = docXml.replace(/توقيع صورة/g, escapeXml(financeManagerName || " "));
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
      zip.file("word/footer1.xml", ftrXml);
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
    return await getPdfBlobFromDocx(docxBlob, `declaration_${type}_${registrationNumber}.docx`);
  };

  // ━━━ رفع وتوثيق النسخة الرقمية المعتمدة سحابياً (مرة واحدة لمنع التكرار) ━━━
  const handleUploadToCloud = async (type: DeclarationType = activeDeclType, forceReupload = false) => {
    const existingUrl =
      type === "specs"
        ? cloudPdfUrlSpecs
        : type === "insurance"
        ? cloudPdfUrlInsurance
        : cloudPdfUrlGeneral;
    if (existingUrl && !forceReupload) {
      toast.info("تم رفع وتوثيق هذا المستند سحابياً مسبقاً وهو نشط بالفعل ✓");
      return;
    }

    setUploadingCloud(true);
    try {
      toast.info("جاري تحويل المستند ورفعه سحابياً...");
      const pdfBlob = await generateDeclarationPdfBlob(type);
      const formData = new FormData();
      formData.append(
        "file",
        pdfBlob,
        `declaration_${type}_${registrationNumber || op.serialNumber}.pdf`
      );

      const res = await api.post("/operations/upload-cloud-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.url) {
        if (type === "specs") {
          setCloudPdfUrlSpecs(res.data.url);
        } else if (type === "insurance") {
          setCloudPdfUrlInsurance(res.data.url);
        } else {
          setCloudPdfUrlGeneral(res.data.url);
        }
        toast.success("تم رفع النسخة الرقمية للسحابة بنجاح! الرابط جاهز ومتاح عالمياً لأي هاتف محمول 🚀");

        // حفظ في notes العملية تلقائياً
        try {
          let existingNotesObj: any = {};
          if (op.notes && op.notes.startsWith("{")) existingNotesObj = JSON.parse(op.notes);
          else if (op.notes) existingNotesObj = { textNotes: op.notes };
          if (!existingNotesObj.declarationsDocx) existingNotesObj.declarationsDocx = {};
          if (type === "specs") {
            existingNotesObj.declarationsDocx.cloudPdfUrlSpecs = res.data.url;
          } else if (type === "insurance") {
            existingNotesObj.declarationsDocx.cloudPdfUrlInsurance = res.data.url;
          } else {
            existingNotesObj.declarationsDocx.cloudPdfUrlGeneral = res.data.url;
          }
          await api.patch(`/operations/${op.id}`, { notes: JSON.stringify(existingNotesObj) });
        } catch (e) {
          console.warn("Failed to auto-save cloud url:", e);
        }
      }
    } catch (err: any) {
      toast.error("فشل الرفع السحابي: " + (err?.response?.data?.message || err?.message || ""));
    } finally {
      setUploadingCloud(false);
    }
  };

  // تحميل المعاينة الرسمية
  const loadOfficialPreview = async () => {
    setRenderingDocx(true);
    try {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
        setPreviewPdfUrl(null);
      }
      const pdfBlob = await generateDeclarationPdfBlob(activeDeclType);
      const url = URL.createObjectURL(pdfBlob);
      setPreviewPdfUrl(url);

      // رفع تلقائي هادئ للسحابة إذا لم يكن مرفوعاً بعد
      if (!currentCloudUrl) {
        uploadPdfToCloudSilently(pdfBlob, activeDeclType);
      }
    } catch (err: any) {
      console.error("فشل تجهيز المعاينة:", err);
      toast.error("تعذر تجهيز المعاينة: " + (err?.message || ""));
    } finally {
      setRenderingDocx(false);
    }
  };

  const uploadPdfToCloudSilently = async (pdfBlob: Blob, type: DeclarationType) => {
    try {
      const formData = new FormData();
      formData.append("file", pdfBlob, `declaration_${type}_${registrationNumber || op.serialNumber}.pdf`);
      const res = await api.post("/operations/upload-cloud-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.url) {
        if (type === "specs") setCloudPdfUrlSpecs(res.data.url);
        else if (type === "insurance") setCloudPdfUrlInsurance(res.data.url);
        else setCloudPdfUrlGeneral(res.data.url);
      }
    } catch {}
  };

  // طباعة مستند الوورد الأصلي
  const handlePrintWordDocument = async () => {
    setPrintingDocx(true);
    try {
      toast.info("جاري تجهيز مستند الإقرار للطباعة...");
      const pdfBlob = await generateDeclarationPdfBlob(activeDeclType);
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
      toast.error("فشل تجهيز الطباعة: " + (err?.message || ""));
    } finally {
      setPrintingDocx(false);
    }
  };

  // تنزيل ملف Word (.docx)
  const handleDownloadDocx = async (type: DeclarationType = activeDeclType) => {
    setDownloadingDocx(true);
    try {
      const blob = await generateDeclarationDocxBlob(type);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const declName =
        type === "specs"
          ? "إقرار_الالتزام_بكراسة_الشروط"
          : type === "insurance"
          ? "إقرار_التأمينات_والعمالة"
          : "خطاب_عام_رسمي";
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
    setDownloadingPdf(true);
    try {
      toast.info("جاري تصدير المستند بصيغة PDF...");
      const pdfBlob = await generateDeclarationPdfBlob(type);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      const declName =
        type === "specs"
          ? "إقرار_الالتزام_بكراسة_الشروط"
          : type === "insurance"
          ? "إقرار_التأمينات_والعمالة"
          : "خطاب_عام_رسمي";
      a.download = `${declName}_${op.serialNumber || "365"}_${registrationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تحميل مستند PDF بنجاح!");
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
  }, [previewModalOpen, activeDeclType]);

  // حفظ الإقرارات في قاعدة بيانات النظام
  const handleSaveToSystem = async () => {
    setSavingState(true);
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
        activeDeclType,
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
        cloudPdfUrlGeneral,
        generalSubject,
        generalLetterBody,
      };

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(existingNotesObj),
      });

      setSavedSnapshot(currentSnapshot);
      toast.success("تم حفظ بيانات الإقرارات الرسمية في قاعدة البيانات بنجاح! 💾☁️");
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل الحفظ في قاعدة البيانات");
    } finally {
      setSavingState(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-foreground print:m-0 print:p-0">
      {/* ━━━ شريط تنبيه التعديلات غير المحفوظة وأزرار الحفظ/الإلغاء ━━━ */}
      {isDirty && (
        <div className="sticky top-2 z-30 p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 shadow-xl backdrop-blur-md flex items-center justify-between gap-3 animate-bounce-subtle">
          <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 animate-pulse" />
            <div>
              <span className="font-extrabold text-sm block">توجد تعديلات جديدة غير محفوظة في الإقرارات!</span>
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
              onClick={handleSaveToSystem}
              disabled={savingState}
              className="h-8.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{savingState ? "جاري الحفظ..." : "حفظ التعديلات 💾"}</span>
            </Button>
          </div>
        </div>
      )}



      {/* ━━━ SUB-TAB SWITCHER (اختيار نوع الإقرار أو الخطاب) ━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

        <button
          type="button"
          onClick={() => setActiveDeclType("general_letter")}
          className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
            activeDeclType === "general_letter"
              ? "bg-indigo-500/15 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-sm"
              : "bg-card border-border hover:bg-muted/60 text-muted-foreground"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm">3. خطاب عام رسمي للجهة</span>
              {cloudPdfUrlGeneral && (
                <Badge className="bg-indigo-600 text-white text-[10px] py-0 px-1.5">سحابي ✓</Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              كتابة خطاب رسمي عام بموضوع ونص مخصص للجهة
            </p>
          </div>
          <FileText className={`h-6 w-6 shrink-0 ${activeDeclType === "general_letter" ? "text-indigo-600" : "text-muted-foreground"}`} />
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

          {/* الباركود الذكي ورمز QR المدمج والرفع السحابي المجاني للنسخة الرقمية */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/25 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <QrCode className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-foreground">
                      الباركود الذكي ورمز QR الرقمي المعتمد (PDF)
                    </span>
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] font-bold">
                      مدمج بموضع كلمة (الباركود) بالأعلى ورقم القيد بالتذييل
                    </Badge>
                    {currentCloudUrl && (
                      <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-bold flex items-center gap-1">
                        <Cloud className="h-3 w-3" />
                        <span>رابط سحابي دائم متاح لأي هاتف ✓</span>
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    عند مسح الباركود بكاميرا الموبايل يتم فتح النسخة الرقمية المعتمدة للإقرار فوراً بدون الحاجة لأي تسجيل دخول.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center flex-wrap justify-end">
                {currentCloudUrl ? (
                  <>
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>تم الرفع والتوثيق السحابي مسبقاً ✓</span>
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleUploadToCloud(activeDeclType, true)}
                      disabled={uploadingCloud}
                      className="border-border text-foreground hover:bg-muted text-xs font-bold h-9 px-3 rounded-xl cursor-pointer flex items-center gap-1"
                      title="تحديث وإعادة رفع النسخة السحابية لهذا الإقرار"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${uploadingCloud ? "animate-spin" : ""}`} />
                      <span>إعادة الرفع والتحديث ↻</span>
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleUploadToCloud(activeDeclType, false)}
                    disabled={uploadingCloud}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Cloud className={`h-4 w-4 ${uploadingCloud ? "animate-spin" : ""}`} />
                    <span>{uploadingCloud ? "جاري الرفع السحابي..." : "رفع وتوثيق النسخة الرقمية سحابياً لرمز QR ☁️"}</span>
                  </Button>
                )}
              </div>
            </div>

            {/* تفاصيل الرابط السحابي والمعاينة المباشرة */}
            <div className="pt-2 border-t border-emerald-500/20 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-1 overflow-hidden">
                <span className="text-muted-foreground shrink-0 font-medium text-[11px]">الرابط المشفر في الرمز:</span>
                {currentCloudUrl ? (
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <span className="font-mono text-xs text-blue-600 dark:text-blue-400 truncate bg-white/60 dark:bg-slate-900/60 px-2 py-1 rounded-lg border border-border">
                      {currentCloudUrl}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(currentCloudUrl);
                        toast.success("تم نسخ الرابط السحابي المباشر بنجاح! 📋");
                      }}
                      className="text-muted-foreground hover:text-foreground text-xs p-1 cursor-pointer"
                      title="نسخ الرابط"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <a
                      href={currentCloudUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 font-bold text-[11px] shrink-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>فتح النسخة السحابية المباشرة</span>
                    </a>
                  </div>
                ) : (
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    الرمز الحالي مرتبط بمنظومة التحقق المحلية. اضغط على زر الرفع السحابي أعلاه للحصول على رابط مباشر دائم لأي هاتف محمول مجاناً.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 justify-end">
                <a
                  href={`/verify-doc?ref=${encodeURIComponent(registrationNumber)}&opId=${op.id}&type=declaration_${activeDeclType}${currentCloudUrl ? `&pdfUrl=${encodeURIComponent(currentCloudUrl)}` : ""}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800"
                >
                  <span>تجربة الفحص الرقمي</span>
                  <ArrowRight className="h-3 w-3 rtl:rotate-180" />
                </a>
              </div>
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

      {/* ━━━ SECTION 2: جهة الإسناد وبيانات العملية في موضوع ومتن الإقرار / الخطاب ━━━ */}
      <SectionCard
        title={activeDeclType === "general_letter" ? "2. جهة الإسناد، وموضوع ونص الخطاب العام الرسمي" : "2. جهة الإسناد وبيانات العملية في موضوع ومتن الإقرار الرسمي"}
        icon={FileText}
        iconColor={activeDeclType === "general_letter" ? "text-indigo-600" : "text-teal-600"}
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

          {activeDeclType === "general_letter" ? (
            /* ━━━ حقول الخطاب العام: الموضوع والنص الكامل الكبير ━━━ */
            <div className="space-y-4 pt-2 border-t border-border">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                    موضوع الخطاب الرسمي (الموضوع بخصوص : ......) *
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-mono">يحل محل النقط الحمراء بالقالب</span>
                </div>
                <Input
                  value={generalSubject}
                  onChange={(e) => setGeneralSubject(e.target.value)}
                  placeholder="مثال: سحب كراسة الشروط والمواصفات لعملية توريد كاوتش وبطاريات"
                  className="h-9.5 text-xs font-bold rounded-xl border-indigo-400/50 focus:border-indigo-600"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-indigo-500" />
                    نص الخطاب العام الكامل (الخانة الكبيرة للخطاب) *
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-mono">يحل محل الفقرة الكبيرة المحددة بالأحمر</span>
                </div>
                <Textarea
                  value={generalLetterBody}
                  onChange={(e) => setGeneralLetterBody(e.target.value)}
                  placeholder="اكتب هنا نص الخطاب الرسمي المطلوب توجيهه للجهة..."
                  rows={6}
                  className="text-xs leading-relaxed rounded-xl border-indigo-400/50 focus:border-indigo-600 min-h-[140px] font-medium"
                />
              </div>
            </div>
          ) : (
            /* ━━━ حقول إقرارات الشروط والتأمينات ━━━ */
            <>
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

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">العام المالي للعملية *</Label>
                    <span className="text-[10px] text-muted-foreground font-mono">اختر من القائمة</span>
                  </div>
                  <Select
                    value={FISCAL_YEAR_OPTIONS.includes(fiscalYear) ? fiscalYear : "other"}
                    onValueChange={(val) => {
                      if (!val || val === "other") {
                        setFiscalYear("");
                      } else {
                        setFiscalYear(val || "");
                      }
                    }}
                  >
                    <SelectTrigger className="h-9.5 text-xs font-mono bg-background rounded-xl">
                      <SelectValue placeholder="اختر العام المالي" />
                    </SelectTrigger>
                    <SelectContent>
                      {FISCAL_YEAR_OPTIONS.map((y) => (
                        <SelectItem key={y} value={y} className="text-xs font-mono">
                          {y}
                        </SelectItem>
                      ))}
                      <SelectItem value="other" className="text-xs font-bold text-amber-600">
                        أخرى (كتابة يدوي)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {(!FISCAL_YEAR_OPTIONS.includes(fiscalYear) || fiscalYear === "other") && (
                    <Input
                      placeholder="اكتب العام المالي مثلاً: 2026 / 2027"
                      value={fiscalYear === "other" ? "" : fiscalYear}
                      onChange={(e) => setFiscalYear(e.target.value)}
                      className="h-9 text-xs font-mono bg-amber-500/10 border-amber-500/40 rounded-xl mt-1 text-center"
                      autoFocus
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">موعد جلسة فتح المظروف الفني *</Label>
                  <Input
                    value={technicalOpeningDate}
                    onChange={(e) => setTechnicalOpeningDate(e.target.value)}
                    className="h-9.5 text-xs font-mono rounded-xl text-center"
                  />
                </div>
              </div>
            </>
          )}
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
              <Label className="text-xs font-bold text-foreground">الاعتماد النهائي</Label>
              <Input
                value={boardChairman}
                disabled
                className="h-9.5 text-xs font-bold rounded-xl bg-muted/50 cursor-not-allowed"
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
          <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in overflow-y-auto">
            <div className="bg-card border border-border rounded-3xl max-w-5xl w-full p-4 sm:p-6 space-y-4 shadow-2xl my-auto max-h-[96vh] flex flex-col overflow-hidden text-foreground">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-foreground text-base">
                        معاينة المستند الرسمي المعتمد (قالب الوورد الأصلي)
                      </h3>
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                        {activeDeclType === "specs"
                          ? "إقرار كراسة الشروط"
                          : activeDeclType === "insurance"
                          ? "إقرار التأمينات والعمالة"
                          : "خطاب عام رسمي"} ✓
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      عرض صفحات مستند الوورد كما تطبع وتعتمد تماماً مع الباركود الرقمي والتنسيق الرسمي بدقة 100%
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
                    onClick={() => handleDownloadDocx(activeDeclType)}
                    disabled={downloadingDocx}
                    className="text-xs font-bold h-9 rounded-xl border-border hover:bg-muted cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="h-4 w-4 text-emerald-600" />
                    <span>{downloadingDocx ? "جاري التوليد..." : "تنزيل ملف Word (.docx)"}</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleDownloadPdf(activeDeclType)}
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

              {/* View: Authentic Microsoft Word Workspace View */}
              <div className="flex-1 overflow-hidden p-2 sm:p-4 bg-slate-200 dark:bg-slate-950 rounded-2xl flex flex-col items-center justify-start min-h-[640px] overflow-y-auto">
                <div className="mb-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between self-stretch gap-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      تم تطبيق المتغيرات واستبدال الباركود السحابي وإزالة كافة علامات التمييز الحمراء لإنتاج مستند وورد معتمد ورسمي 100%.
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const nextType: Record<DeclarationType, DeclarationType> = {
                          specs: "insurance",
                          insurance: "general_letter",
                          general_letter: "specs",
                        };
                        setActiveDeclType(nextType[activeDeclType]);
                      }}
                      className="text-xs font-bold underline hover:text-emerald-950 dark:hover:text-white cursor-pointer"
                    >
                      التبديل إلى: {activeDeclType === "specs" ? "إقرار التأمينات" : activeDeclType === "insurance" ? "خطاب عام" : "إقرار الشروط"} ↺
                    </button>
                  </div>
                </div>

                {renderingDocx ? (
                  <div className="my-auto py-28 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-lg">
                      <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
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
                    <Button size="sm" onClick={loadOfficialPreview} className="bg-emerald-600 text-white">
                      إعادة المحاولة
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ━━━ BOTTOM ACTION BAR: التوليد والطباعة والمعاينة بأسفل مرحلة الإقرارات ━━━ */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#fdfaf5] dark:bg-card border-2 border-[#f5dfc6] dark:border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base font-black text-foreground">
                الإقرارات والتعهدات الرسمية المعتمدة
              </h4>
              <Badge className="bg-[#d97706] hover:bg-[#d97706] text-white font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-lg shadow-xs">
                رقم القيد: {registrationNumber}
              </Badge>
              {isDirty ? (
                <Badge className="bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 text-[10px] font-bold animate-pulse">
                  تعديلات غير محفوظة ⚠️
                </Badge>
              ) : (
                <Badge className="bg-[#dcfce7] text-[#15803d] border border-[#86efac] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                  محفوظ ومعتمد ✓
                </Badge>
              )}
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-xl bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 text-[11px] font-black">
                <FileCheck className="h-3.5 w-3.5" />
                <span>{isDirty ? "تعديلات جاهزة للمعاينة والحفظ ✍️" : "التعديلات محفوظة ✓"}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              مطابقة 100% لقوالب الوورد الرسمية المعتمدة للشركة. يمكنك المعاينة أو الطباعة مباشرة من هنا.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPreviewModalOpen(true)}
            disabled={isDirty}
            title={isDirty ? "يجب حفظ التعديلات أولاً لتفعيل المعاينة" : "معاينة مستند الوورد المعتمد"}
            className={`h-9.5 px-4 text-xs font-bold rounded-xl border-2 border-[#d97706] text-[#b45309] dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer bg-white dark:bg-card shadow-xs flex items-center gap-1.5 ${
              isDirty ? "opacity-50 cursor-not-allowed bg-muted/40" : ""
            }`}
          >
            {isDirty ? <Lock className="h-4 w-4" /> : <Eye className="h-4 w-4 ml-1.5 text-[#d97706]" />}
            <span>معاينة مستند الوورد</span>
          </Button>

          <Button
            size="sm"
            onClick={handlePrintWordDocument}
            disabled={printingDocx || isDirty}
            title={isDirty ? "يجب حفظ التعديلات أولاً للطباعة" : "طباعة الإقرار"}
            className={`h-9.5 px-4 bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 ${
              isDirty ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground" : ""
            }`}
          >
            {isDirty ? <Lock className="h-4 w-4" /> : <Printer className={`h-4 w-4 ${printingDocx ? "animate-spin" : ""}`} />}
            <span>{printingDocx ? "جاري التجهيز..." : "طباعة المستند"}</span>
          </Button>

          <Button
            size="sm"
            onClick={() => handleDownloadPdf(activeDeclType)}
            disabled={downloadingPdf || isDirty}
            title={isDirty ? "يجب حفظ التعديلات أولاً للتحميل" : "تحميل بصيغة PDF"}
            className={`h-9.5 px-3.5 bg-[#e11d48] hover:bg-[#be123c] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 ${
              isDirty ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground" : ""
            }`}
          >
            <FileText className={`h-4 w-4 ${downloadingPdf ? "animate-spin" : ""}`} />
            <span>{downloadingPdf ? "جاري التحويل..." : "PDF (.pdf)"}</span>
          </Button>

          <Button
            size="sm"
            onClick={() => handleDownloadDocx(activeDeclType)}
            disabled={downloadingDocx || isDirty}
            title={isDirty ? "يجب حفظ التعديلات أولاً للتحميل" : "تحميل بصيغة Word"}
            className={`h-9.5 px-3.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 ${
              isDirty ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground" : ""
            }`}
          >
            <Download className="h-4 w-4" />
            <span>{downloadingDocx ? "جاري التوليد..." : "Word (.docx)"}</span>
          </Button>

          {isDirty && (
            <Button
              size="sm"
              onClick={handleSaveToSystem}
              disabled={savingState}
              className="h-9.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 animate-pulse"
            >
              <Save className="h-4 w-4" />
              <span>{savingState ? "جاري الحفظ..." : "حفظ التعديلات 💾"}</span>
            </Button>
          )}
        </div>
      </div>

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
