"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  FileText, ShieldCheck, CheckCircle2, Eye, Printer, Download,
  RefreshCw, Building2, Calendar, Hash, Check, AlertCircle,
  Copy, ExternalLink, QrCode, Cloud, ArrowRight, X, Sparkles, SlidersHorizontal,
  RotateCcw, Save, Lock, MessageSquareQuote, Send
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
  cleanAllDocxXml,
  buildQrAnchorXml,
  injectSingleQrIntoDocXml,
  LetterBottomActionWidget,
  ReprintConfirmModal,
  getCurrentUserName,
  PrintHistoryEntry,
  LetterQrCloudCard,
  PdfExportLoadingModal,
  getLetterSpecificRegistrationNumber,
  regenerateLetterSpecificRegistrationNumber,
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
  replaceDocxRecipient,
} from "./letter-utils";
import JSZip from "jszip";
import QRCode from "qrcode";
import { getPdfBlobFromDocx, uploadPdfToFreeCloud, getExpectedCloudPdfUrl } from "./client-pdf";
import { OnlyOfficeDocViewer } from "@/components/OnlyOfficeDocViewer";
import { SmartArabicDatePicker } from "@/components/ui/arabic-date-picker";

function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function TabGeneralLetter({
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
  const savedLetter = useMemo(() => {
    try {
      if (op.notes && op.notes.startsWith("{")) {
        const parsed = JSON.parse(op.notes);
        return parsed.generalLetterDocx || parsed.declarationsDocx || null;
      }
    } catch {}
    return null;
  }, [op.notes]);

  // ━━━ 1. الشركة المصدرة والترويسة والتذييل ━━━
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => {
    return savedLetter?.selectedCompanyId || op.companies?.[0]?.companyId || op.companies?.[0]?.id || "";
  });

  const currentCompanyLink = useMemo(() => {
    return (
      op.companies?.find(
        (c: any) => c.companyId === selectedCompanyId || c.id === selectedCompanyId
      ) || op.companies?.[0]
    );
  }, [op.companies, selectedCompanyId]);

  const currentCompany = currentCompanyLink?.company;

  // رقم القيد الصادر الذكي المستقل الخاص بالخطاب العام
  const [registrationNumber, setRegistrationNumber] = useState(() => {
    return getLetterSpecificRegistrationNumber(
      op,
      "general_letter",
      currentCompanyLink?.displayCode,
      savedLetter?.registrationNumber
    );
  });

  const handleRegenerateRef = async () => {
    await regenerateLetterSpecificRegistrationNumber({
      op,
      letterKey: "general_letter",
      companyCode: currentCompanyLink?.displayCode || "AZ",
      onSuccess: (fresh) => {
        setRegistrationNumber(fresh);
        onRefresh();
      },
    });
  };

  // كود العملية بالشركة (ثابت للعملية)
  const [companyOpCode, setCompanyOpCode] = useState(() => {
    return (
      savedLetter?.companyOpCode ||
      currentCompanyLink?.displayCode ||
      `AZ-0${op.serialNumber || 1}`
    );
  });

  const [companyCommercialRegister, setCompanyCommercialRegister] = useState(() => {
    return savedLetter?.companyCommercialRegister || currentCompany?.commercialRegister || "110200700036620";
  });
  const [companyTaxCard, setCompanyTaxCard] = useState(() => {
    return savedLetter?.companyTaxCard || currentCompany?.taxCard || "658369652";
  });
  const [phoneWhatsapp, setPhoneWhatsapp] = useState(() => {
    return savedLetter?.phoneWhatsapp || currentCompany?.phone || "01091708818";
  });
  const [phoneMobile, setPhoneMobile] = useState(() => {
    return savedLetter?.phoneMobile || "01557018818";
  });
  const [companyAddress, setCompanyAddress] = useState(() => {
    return savedLetter?.companyAddress || currentCompany?.address || "بجوار مستشفى ليدى كير  -  بدمنهور -  البحيره";
  });
  const [companyEmail, setCompanyEmail] = useState(() => {
    return savedLetter?.companyEmail || currentCompany?.email || "goldengolden8818@gmail.com";
  });
  const [outgoingDate, setOutgoingDate] = useState(() => {
    return savedLetter?.outgoingDate || new Date().toLocaleDateString("en-GB");
  });

  // ━━━ 2. جهة الإسناد وبيانات الموضوع والمتن ━━━
  const [recipientPrefix, setRecipientPrefix] = useState(() => {
    return savedLetter?.recipientPrefix || "الأستاذ";
  });
  const [recipientTitleAndAuthority, setRecipientTitleAndAuthority] = useState(() => {
    return getOperationRecipientTitle(op, savedLetter?.recipientTitleAndAuthority);
  });

  const [generalSubject, setGeneralSubject] = useState(() => {
    return savedLetter?.generalSubject || (op.name ? `بشأن عملية ${op.name}` : "طلب إفادة رسمية بشأن العملية");
  });

  // ━━━ بيانات المندوب المفوض في متن الخطاب ━━━
  const [delegateName, setDelegateName] = useState(() => {
    if (savedLetter?.delegateName) return savedLetter.delegateName;
    try {
      if (op.notes && op.notes.startsWith("{")) {
        const p = JSON.parse(op.notes);
        return p.bookletLettersDocx?.delegateName || p.declarationsDocx?.delegateName || "";
      }
    } catch {}
    return "";
  });

  const [delegateRole, setDelegateRole] = useState(() => {
    if (savedLetter?.delegateRole) return savedLetter.delegateRole;
    try {
      if (op.notes && op.notes.startsWith("{")) {
        const p = JSON.parse(op.notes);
        return p.bookletLettersDocx?.delegateTitle || p.declarationsDocx?.delegateRole || "مندوب التعاقدات المفوض";
      }
    } catch {}
    return "مندوب التعاقدات المفوض";
  });

  const [delegateNationalId, setDelegateNationalId] = useState(() => {
    if (savedLetter?.delegateNationalId) return savedLetter.delegateNationalId;
    try {
      if (op.notes && op.notes.startsWith("{")) {
        const p = JSON.parse(op.notes);
        return p.bookletLettersDocx?.delegateNationalId || p.declarationsDocx?.delegateNationalId || "";
      }
    } catch {}
    return "";
  });

  // دالة توليد متن الخطاب الافتراضي المعتمد
  const generateDefaultBody = (dName = delegateName, dRole = delegateRole, dNId = delegateNationalId) => {
    const tm = getOperationTenderMethod(op);
    const sc = getSharedOperationScope(op, savedLetter?.operationScope);
    const fy = getOperationFiscalYear(op, savedLetter?.fiscalYear);
    const tod = getOperationTechnicalOpeningDate(op, savedLetter?.technicalOpeningDate);
    const namePart = dName && dName.trim() ? `(${dName.trim()})` : "( .................... )";
    const rolePart = dRole && dRole.trim() ? `(${dRole.trim()})` : "( مندوب التعاقدات المفوض )";
    const nidPart = dNId && dNId.trim() ? dNId.trim() : "....................";
    return `الرجاء من سيادتكم التكرم بالموافقة على سحب كراسة الشروط والمواصفات والخاصة (${tm}) لزوم ${sc} طرفكم للعام المالى ${fy} والمحدد لها جلسة ( ${tod} ) لفتح المظروف الفنى . وتفوض الشركة السيد / ${namePart} وصفته ${rolePart} قومى رقم : ${nidPart} في تمثيل الشركة في كل ما يلزم من استلام المستندات وسداد المبالغ واستلام الايصالات وحضور الجلسات وجميع الأوراق والتوقيع على العقود واستلام الخطابات والمكاتبات الرسميه .`;
  };

  const [generalLetterBody, setGeneralLetterBody] = useState(() => {
    return savedLetter?.generalLetterBody || generateDefaultBody();
  });

  // ━━━ خانة الملاحظات الإضافية (تستبدل خانة الملاحظات الحمراء بالقالب) ━━━
  const [additionalNotes, setAdditionalNotes] = useState(() => {
    return savedLetter?.additionalNotes || "";
  });

  // مزامنة تلقائية للبيانات إذا تغيرت العملية الأصلية
  useEffect(() => {
    if (!savedLetter?.recipientTitleAndAuthority && op.authority) {
      setRecipientTitleAndAuthority(`مدير الادارة العامة للمشتريات والمخازن بـ ${op.authority}`);
    }
  }, [op.authority, savedLetter]);

  // ━━━ 3. التوقيعات والاعتمادات ━━━
  const [specialistTitle, setSpecialistTitle] = useState(() => {
    return savedLetter?.specialistTitle || "المختص :";
  });
  const [specialistName, setSpecialistName] = useState(() => {
    return savedLetter?.specialistName || "أحمد محمد";
  });
  const [financeManagerName, setFinanceManagerName] = useState(() => {
    return savedLetter?.financeManagerName || "";
  });
  const [boardChairman, setBoardChairman] = useState(() => {
    return sanitizeChairmanTitle(savedLetter?.boardChairman);
  });

  // ━━━ 4. الرابط السحابي ورمز QR ━━━
  const [cloudPdfUrl, setCloudPdfUrl] = useState<string>(() => {
    const url = savedLetter?.cloudPdfUrl || "";
    return isValidCloudDocUrl(url) ? url : "";
  });
  const [uploadingCloud, setUploadingCloud] = useState(false);

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

  // ━━━ تتبع حالة التعديل والحفظ (isDirty) ━━━
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
      generalSubject,
      generalLetterBody,
      delegateName,
      delegateRole,
      delegateNationalId,
      additionalNotes,
      specialistTitle,
      specialistName,
      financeManagerName,
      boardChairman,
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
    companyEmail,
    outgoingDate,
    recipientPrefix,
    recipientTitleAndAuthority,
    generalSubject,
    generalLetterBody,
    delegateName,
    delegateRole,
    delegateNationalId,
    additionalNotes,
    specialistTitle,
    specialistName,
    financeManagerName,
    boardChairman,
  ]);

  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => currentSnapshot);
  const isDirty = useMemo(() => currentSnapshot !== savedSnapshot, [currentSnapshot, savedSnapshot]);

  const [lastGeneratedSnapshot, setLastGeneratedSnapshot] = useState<string>("");
  const [lastUploadedSnapshot, setLastUploadedSnapshot] = useState<string>(() => (savedLetter?.cloudPdfUrl ? currentSnapshot : ""));

  const isCloudOutOfSync = useMemo(() => {
    return !cloudPdfUrl || (lastUploadedSnapshot !== "" && lastUploadedSnapshot !== currentSnapshot) || isDirty;
  }, [cloudPdfUrl, lastUploadedSnapshot, currentSnapshot, isDirty]);

  const cloudWarningMsg = useMemo(() => {
    if (!isCloudOutOfSync) return null;
    return "⚠️ تنبيه هام: هذا المستند يحتوي على تعديلات جديدة لم يتم رفعها سحابياً — يرجى الضغط على زر 'إعادة الرفع والتحديث' لكي يُفتح أحدث ملف عند مسح رمز الباركود بالكاميرا.";
  }, [isCloudOutOfSync]);

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
      setGeneralSubject(snap.generalSubject);
      setGeneralLetterBody(snap.generalLetterBody);
      setDelegateName(snap.delegateName || "");
      setDelegateRole(snap.delegateRole || "مندوب التعاقدات المفوض");
      setDelegateNationalId(snap.delegateNationalId || "");
      setAdditionalNotes(snap.additionalNotes || "");
      setSpecialistTitle(snap.specialistTitle);
      setSpecialistName(snap.specialistName || "أحمد محمد");
      setFinanceManagerName(snap.financeManagerName || "");
      setBoardChairman(sanitizeChairmanTitle(snap.boardChairman));
      toast.info("تم التراجع عن التعديلات وإعادة النموذج للحالة السابقة ↺");
    } catch {
      toast.error("تعذر التراجع عن التعديلات");
    }
  };

  // سجل الطباعة
  const [printHistory, setPrintHistory] = useState<Record<string, PrintHistoryEntry>>(() => {
    let notesObj: any = {};
    try {
      if (op.notes && op.notes.startsWith("{")) {
        notesObj = JSON.parse(op.notes);
      }
    } catch {}
    return notesObj.generalLetterDocx?.printHistory || notesObj.declarationsDocx?.printHistory || {};
  });
  const [reprintWarningOpen, setReprintWarningOpen] = useState(false);

  // ━━━ محرك استبدال المتغيرات في قالب الخطاب العام (general_letter_template.docx) ━━━
  const generateGeneralLetterDocxBlob = async (): Promise<Blob> => {
    const response = await fetch("/templates/general_letter_template.docx");
    if (!response.ok) throw new Error("فشل قراءة قالب الخطاب العام من الخادم");
    const templateBuffer = await response.arrayBuffer();

    const zip = await JSZip.loadAsync(templateBuffer);

    let qrDrawingXml = "";
    try {
      const filename = `general_letter_${registrationNumber || op.serialNumber || "doc"}.pdf`;
      const docTitle = generalSubject || "خطاب رسمي موجه للجهة";
      const qrPayload = await getStandardDocQrPayload(
        cloudPdfUrl,
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
      console.warn("QR generation failed in TabGeneralLetter:", e);
    }

    // 1. استبدال كافة المتغيرات في word/document.xml
    let docXml = await zip.file("word/document.xml")!.async("text");

    // استبدال موضع الباركود بـ QR مع مسح نص الباركود
    docXml = injectSingleQrIntoDocXml(docXml, qrDrawingXml, escapeXml(registrationNumber));

    // تنظيف المسافات الفارغة الزائدة في فقرة الباركود العلوية لمنع ظهور أي أسطر فارغة إضافية
    docXml = docXml.replace(/(<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?)(?:<w:t xml:space="preserve">\s+<\/w:t>)([\s\S]*?<\/w:p>)/g, "$1$2");

    // 1. لقب وصفة المرسل إليه والجهة بتوسيط وتنسيق متوازن
    docXml = replaceDocxRecipient(docXml, recipientPrefix, recipientTitleAndAuthority);

    // 2. الموضوع (استبدال الفقرة بالكامل بدقة مع التسطير والخط الأصلي)
    const subjectPattern = /<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?الموضوع بخصوص(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/;
    const subjectXml = `<w:p><w:pPr><w:tabs><w:tab w:val="left" w:pos="5387"/></w:tabs><w:spacing w:after="0"/><w:ind w:left="-567"/><w:jc w:val="both"/><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="56"/><w:szCs w:val="56"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="36"/><w:szCs w:val="36"/><w:u w:val="single"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">الموضوع بخصوص : ${escapeXml(generalSubject || "")}</w:t></w:r></w:p>`;
    if (subjectPattern.test(docXml)) {
      docXml = docXml.replace(subjectPattern, subjectXml);
    } else {
      docXml = docXml.replace(/الموضوع بخصوص\s*:\s*\.{3,}/g, `الموضوع بخصوص : ${escapeXml(generalSubject)}`);
      docXml = docXml.replace(/\.{3,}/g, escapeXml(generalSubject));
    }

    // محاذاة سطر (تحيه طيبه وبعد) في وسط السطر تماماً بدون أي مسافات بادئة أو انحياز جانبي
    const salutationPattern = /<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?تحي[ةه]\s*طيب[ةه]\s*وبعد(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/;
    const salutationXml = `<w:p><w:pPr><w:spacing w:before="140" w:after="140" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Aldhabi" w:hAnsi="Aldhabi" w:cs="Aldhabi"/><w:b/><w:bCs/><w:sz w:val="48"/><w:szCs w:val="48"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Aldhabi" w:hAnsi="Aldhabi" w:cs="Aldhabi" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="48"/><w:szCs w:val="48"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>تحيه طيبه وبعد</w:t></w:r></w:p>`;
    if (salutationPattern.test(docXml)) {
      docXml = docXml.replace(salutationPattern, salutationXml);
    }

    // 3. استبدال متن الخطاب العام بالكامل مع الحفاظ التام على محاذاة الفقرة وتكبير الخط العربي بشكل بارز ومريح للقراءة
    const bodyPattern = /<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?الرجاء من سيادتكم(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/;
    if (bodyPattern.test(docXml)) {
      const newBodyXml = `<w:p><w:pPr><w:spacing w:after="120" w:line="320" w:lineRule="auto"/><w:ind w:left="-567" w:hanging="283"/><w:jc w:val="both"/><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="40"/><w:szCs w:val="40"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="40"/><w:szCs w:val="40"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">${escapeXml(generalLetterBody)}</w:t></w:r></w:p>`;
      docXml = docXml.replace(bodyPattern, newBodyXml);
    } else {
      docXml = docXml.replace(/الرجاء من سيادتكم[\s\S]*?المكاتبات الرسميه\s*\./g, escapeXml(generalLetterBody));
    }

    // محاذاة سطر (وتفضلو بقبول وافر الاحترام والتقدير) في وسط السطر بدقة
    const closingPattern = /<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?وتفضلو\s*بقبول\s*وافر(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/;
    const closingXml = `<w:p><w:pPr><w:spacing w:before="120" w:after="140" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Andalus" w:hAnsi="Andalus" w:cs="Andalus"/><w:b/><w:bCs/><w:sz w:val="36"/><w:szCs w:val="36"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Andalus" w:hAnsi="Andalus" w:cs="Andalus" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="36"/><w:szCs w:val="36"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>وتفضلو بقبول وافر الاحترام والتقدير</w:t></w:r></w:p>`;
    if (closingPattern.test(docXml)) {
      docXml = docXml.replace(closingPattern, closingXml);
    }

    // 4. جدول التوقيعات والاعتمادات الرسمية الثلاثي المتوازن في صف أفقي واحد (بدون أي التفاف Wrap)
    const fullSigBlockRegex = /<w:p\b[^>]*>(?:(?!<w:p\b)[\s\S])*?المختص[\s\S]*?رئيس مجلس\s*ا?ل?ادارة(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/;
    if (fullSigBlockRegex.test(docXml)) {
      const sigTableXml = buildOfficialSignaturesTableXml({
        specialistTitle: specialistTitle || "المختص :",
        specialistName: specialistName || " ",
        financeManagerName: financeManagerName || " ",
        boardChairman: boardChairman || "رئيس مجلس الإدارة",
      });
      docXml = docXml.replace(fullSigBlockRegex, sigTableXml);
    } else {
      docXml = docXml.replace(/المختص\s*:/g, escapeXml(specialistTitle || "المختص :"));
      docXml = docXml.replace(/أحمد محمد/g, escapeXml(specialistName || " "));
      docXml = docXml.replace(/أو اسم/g, escapeXml(financeManagerName || " "));
      docXml = docXml.replace(/رئيس مجلس الادارة/g, escapeXml(boardChairman || "رئيس مجلس الإدارة"));
    }

    // 5. استبدال أو إزالة خانة الملاحظات الإضافية
    if (additionalNotes && additionalNotes.trim()) {
      const notesXml = `<w:p><w:pPr><w:spacing w:before="120" w:after="60" w:line="240" w:lineRule="auto"/><w:jc w:val="right"/><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">ملاحظات: ${escapeXml(additionalNotes.trim())}</w:t></w:r></w:p>`;
      docXml = docXml.replace(/<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?خانه خاليه للملاحظات(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/gi, notesXml);
    } else {
      docXml = docXml.replace(/<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?خانه خاليه للملاحظات(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/gi, "");
    }

    // تنظيف الفقرات الفارغة المتتالية بأسفل المستند لضمان بقائه في صفحة واحدة رسمية كاملة
    docXml = docXml.replace(/(?:<w:p\b[^>]*>(?:<w:pPr>[\s\S]*?<\/w:pPr>)?(?:\s*|<w:r[^>]*>\s*<\/w:r>|<w:r[^>]*><w:t[^>]*>\s*<\/w:t><\/w:r>)*<\/w:p>\s*){3,}(?=<\/w:body>)/gi, "");

    zip.file("word/document.xml", docXml);

    // 2. ترويسة الصفحة (word/header2.xml)
    let hdrXml = await zip.file("word/header2.xml")?.async("text");
    if (hdrXml) {
      hdrXml = hdrXml.replace(/110200700036620/g, escapeXml(companyCommercialRegister));
      hdrXml = hdrXml.replace(/658369652/g, escapeXml(companyTaxCard));
      hdrXml = hdrXml.replace(/\(\s*كود العملية بالشركه\s*\)/g, `( ${escapeXml(companyOpCode)} )`);
      hdrXml = hdrXml.replace(/كود العملية بالشركه/g, escapeXml(companyOpCode));
      hdrXml = hdrXml.replace(/<w:highlight\b[^>]*\/>/gi, "");
      hdrXml = hdrXml.replace(/<w:color\b[^>]*w:val="(?:red|FF0000|ff0000)"[^>]*\/>/gi, "");
      hdrXml = hdrXml.replace(/<w:color\b[^>]*w:val="red"[^>]*\/>/gi, "");
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
      // استبدال العنوان عبر كافة الوسوم المتقطعة بدقة
      const addrRegex = /<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:t[^>]*>[^<]*بجوار\s*مستشفى[\s\S]*?<w:t[^>]*>[^<]*يره<\/w:t>[\s\S]*?<\/w:r>/;
      if (addrRegex.test(ftrXml)) {
        ftrXml = ftrXml.replace(addrRegex, `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:eastAsia="Franklin Gothic Medium" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:hint="cs"/><w:b/><w:bCs/><w:i/><w:iCs/><w:sz w:val="20"/><w:szCs w:val="20"/><w:rtl/></w:rPr><w:t>${escapeXml(companyAddress)}</w:t></w:r>`);
      } else {
        ftrXml = ftrXml.replace(/بجوار مستشفى ليدى كير\s*-\s*بدمنهور\s*-\s*البح\s*يره/g, escapeXml(companyAddress));
        ftrXml = ftrXml.replace(/بجوار مستشفى ليدى كير\s*-\s*بدمنهور\s*-\s*البحيره/g, escapeXml(companyAddress));
      }
      ftrXml = ftrXml.replace(/goldengolden8818@gmail.com/g, escapeXml(companyEmail));
      ftrXml = ftrXml.replace(/<w:highlight\b[^>]*\/>/gi, "");
      ftrXml = ftrXml.replace(/<w:color\b[^>]*w:val="(?:red|FF0000|ff0000)"[^>]*\/>/gi, "");
      ftrXml = ftrXml.replace(/<w:color\b[^>]*w:val="red"[^>]*\/>/gi, "");
      zip.file("word/footer1.xml", ftrXml);
    }

    await cleanAllDocxXml(zip);

    return await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  };

  // ━━━ تحويل المستند الأصلي إلى PDF ذكي وفوري ━━━
  const generateGeneralLetterPdfBlob = async (): Promise<Blob> => {
    const docxBlob = await generateGeneralLetterDocxBlob();
    setPreviewDocxBlob(docxBlob);
    const pdf = await getPdfBlobFromDocx(docxBlob, `general_letter_${registrationNumber}.docx`);
    setPreviewPdfBlob(pdf);
    setLastGeneratedSnapshot(currentSnapshot);
    return pdf;
  };

  // ━━━ فتح المعاينة الرسمية ━━━
  const loadOfficialPreview = async (forceRefresh = false) => {
    setPreviewModalOpen(true);
    // فتح فوري بدون أي تحويل أو انتظار إذا لم تتغير البيانات
    if (!forceRefresh && previewPdfBlob && lastGeneratedSnapshot === currentSnapshot) {
      if (isCloudOutOfSync) {
        toast.warning("تنبيه: توجد تعديلات جديدة لم يتم رفعها سحابياً — يرجى الضغط على زر 'إعادة الرفع والتحديث' لكي يُفتح أحدث ملف عند مسح رمز الباركود بالكاميرا.", {
          duration: 5000,
        });
      }
      return;
    }

    if (renderingDocx) return;

    setRenderingDocx(true);
    try {
      const docx = await generateGeneralLetterDocxBlob();
      setPreviewDocxBlob(docx);
      const pdf = await getPdfBlobFromDocx(docx, `general_letter_${registrationNumber}.docx`);
      setPreviewPdfBlob(pdf);
      const url = URL.createObjectURL(pdf);
      setPreviewPdfUrl(url);
      setLastGeneratedSnapshot(currentSnapshot);

      if (isCloudOutOfSync) {
        toast.warning("تنبيه: توجد تعديلات جديدة لم يتم رفعها سحابياً — يرجى الضغط على زر 'إعادة الرفع والتحديث' لكي يُفتح أحدث ملف عند مسح رمز الباركود بالكاميرا.", {
          duration: 5000,
        });
      }

      // رفع سحابي صامت في الخلفية لضمان توفر ملف الـ PDF فوراً على Cloudflare R2 عند مسح الـ QR بكاميرا الهاتف
      if (!cloudPdfUrl) {
        setTimeout(async () => {
          try {
            const filename = `general_letter_${registrationNumber || op.serialNumber || "doc"}.pdf`;
            const uploadRes = await uploadPdfToFreeCloud(pdf, filename);
            if (uploadRes?.url) {
              setCloudPdfUrl(uploadRes.url);
              setLastUploadedSnapshot(currentSnapshot);
              let notesObj: any = {};
              if (op.notes && op.notes.startsWith("{")) {
                try { notesObj = JSON.parse(op.notes); } catch {}
              }
              if (!notesObj.generalLetterDocx) notesObj.generalLetterDocx = {};
              notesObj.generalLetterDocx.cloudPdfUrl = uploadRes.url;
              await api.patch(`/operations/${op.id}`, { notes: JSON.stringify(notesObj) });
            }
          } catch {}
        }, 500);
      }
    } catch (err: any) {
      toast.error(err?.message || "فشل توليد المعاينة");
    } finally {
      setRenderingDocx(false);
    }
  };

  // ━━━ حفظ البيانات في النظام ━━━
  const handleSaveToSystem = async () => {
    setSavingState(true);
    try {
      let notesObj: any = {};
      if (op.notes && op.notes.startsWith("{")) {
        try {
          notesObj = JSON.parse(op.notes);
        } catch {}
      }

      notesObj.generalLetterDocx = {
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
        generalSubject,
        generalLetterBody,
        delegateName,
        delegateRole,
        delegateNationalId,
        additionalNotes,
        specialistTitle,
        specialistName,
        financeManagerName,
        boardChairman,
        cloudPdfUrl,
        printHistory,
        updatedAt: new Date().toISOString(),
      };

      if (!notesObj.letterRegistrationNumbers) {
        notesObj.letterRegistrationNumbers = {};
      }
      notesObj.letterRegistrationNumbers["general_letter"] = registrationNumber;

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(notesObj),
      });

      setSavedSnapshot(currentSnapshot);
      toast.success("تم حفظ بيانات الخطاب العام بنجاح في النظام! 💾");
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل الحفظ في السيرفر");
    } finally {
      setSavingState(false);
    }
  };

  // ━━━ الرفع السحابي لرمز QR ━━━
  const handleUploadToCloud = async (force: boolean = false) => {
    setUploadingCloud(true);
    try {
      toast.info("جاري توثيق ورفع الخطاب العام سحابياً (رابط PDF مباشر)...");
      const pdf = await generateGeneralLetterPdfBlob();
      const filename = `general_letter_${registrationNumber || op.serialNumber || "doc"}.pdf`;
      const res = await uploadPdfToFreeCloud(pdf, filename);
      const cloudUrl = res?.url || "";

      setCloudPdfUrl(cloudUrl);
      setPreviewPdfBlob(pdf);
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
      setPreviewPdfUrl(URL.createObjectURL(pdf));
      setLastGeneratedSnapshot(currentSnapshot);
      setLastUploadedSnapshot(currentSnapshot);

      // حفظ مباشر في notes
      let notesObj: any = {};
      if (op.notes && op.notes.startsWith("{")) {
        try {
          notesObj = JSON.parse(op.notes);
        } catch {}
      }
      if (!notesObj.generalLetterDocx) notesObj.generalLetterDocx = {};
      notesObj.generalLetterDocx.cloudPdfUrl = cloudUrl;

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(notesObj),
      });

      toast.success("تم توثيق ورفع الخطاب العام وتحديث المعاينة بنجاح! جاهز للمعاينة الفورية 🚀");
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "فشل الرفع السحابي");
    } finally {
      setUploadingCloud(false);
    }
  };

  // ━━━ تنزيل DOCX ━━━
  const handleDownloadDocx = async () => {
    setDownloadingDocx(true);
    try {
      const blob = await generateGeneralLetterDocxBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `خطاب_عام_${registrationNumber || op.name}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تحميل مستند الوورد الرسمي بنجاح! 📄");
    } catch (err: any) {
      toast.error(err?.message || "فشل تحميل الوورد");
    } finally {
      setDownloadingDocx(false);
    }
  };

  // ━━━ تنزيل PDF ━━━
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const blob = await generateGeneralLetterPdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `خطاب_عام_${registrationNumber || op.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تحميل مستند PDF الرسمي بنجاح! 📑");
    } catch (err: any) {
      toast.error(err?.message || "فشل تحميل الـ PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // ━━━ حالة وإجراء الإضافة المباشرة للأرشيف ━━━
  const [addingToArchive, setAddingToArchive] = useState(false);
  const isArchived = useMemo(() => {
    try {
      if (op.notes && op.notes.startsWith("{")) {
        const parsed = JSON.parse(op.notes);
        const list = parsed.archivedDocIds || [];
        return list.includes("decl-general") || list.includes("general_letter");
      }
    } catch {}
    return false;
  }, [op.notes]);

  const handleToggleArchive = async () => {
    setAddingToArchive(true);
    let notesObj: any = {};
    try {
      if (op.notes && op.notes.startsWith("{")) {
        notesObj = JSON.parse(op.notes);
      }
    } catch {}

    const docKey = "decl-general";
    const current: string[] = notesObj.archivedDocIds || [];
    const exists = current.includes(docKey) || current.includes("general_letter");
    const updated = exists
      ? current.filter((id: string) => id !== docKey && id !== "general_letter")
      : [...current, docKey];

    notesObj.archivedDocIds = updated;

    try {
      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(notesObj),
      });
      toast.success(
        exists
          ? "تمت إزالة الخطاب العام من مستندات الأرشيف وحزمة التقديم 📂"
          : "تمت إضافة الخطاب العام إلى مستندات الأرشيف وحزمة التقديم بنجاح! 📦✨"
      );
      onRefresh();
    } catch (err: any) {
      toast.error("فشل تحديث حالة الأرشيف: " + (err?.message || ""));
    } finally {
      setAddingToArchive(false);
    }
  };

  // ━━━ الطباعة وتسجيل السجل ━━━
  const executePrintDoc = async () => {
    setPrintingDocx(true);
    try {
      const pdf = await generateGeneralLetterPdfBlob();
      const url = URL.createObjectURL(pdf);

      const printWindow = window.open(url, "_blank");
      if (printWindow) {
        printWindow.focus();
      }

      // تحديث سجل الطباعة
      const currentEntry = printHistory["general_letter"] || { printCount: 0 };
      const updatedEntry: PrintHistoryEntry = {
        printCount: (currentEntry.printCount || 0) + 1,
        firstPrintedAt: currentEntry.firstPrintedAt || new Date().toISOString(),
        lastPrintedAt: new Date().toISOString(),
        printedBy: getCurrentUserName(),
        registrationNumber,
        items: [
          ...(currentEntry.items || []),
          {
            printedAt: new Date().toISOString(),
            printedBy: getCurrentUserName(),
            registrationNumber,
          },
        ],
      };

      const newHistory = { ...printHistory, general_letter: updatedEntry };
      setPrintHistory(newHistory);

      let notesObj: any = {};
      if (op.notes && op.notes.startsWith("{")) {
        try {
          notesObj = JSON.parse(op.notes);
        } catch {}
      }
      if (!notesObj.generalLetterDocx) notesObj.generalLetterDocx = {};
      notesObj.generalLetterDocx.printHistory = newHistory;

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(notesObj),
      });

      toast.success("تم إرسال المستند للطباعة وتوثيق العملية في السجل بنجاح! 🖨️");
    } catch (err: any) {
      toast.error("فشل إرسال المستند للطباعة");
    } finally {
      setPrintingDocx(false);
    }
  };

  const handlePrintWordDocument = () => {
    const existing = printHistory["general_letter"];
    if (existing && existing.printCount > 0) {
      setReprintWarningOpen(true);
    } else {
      executePrintDoc();
    }
  };

  const handleConfirmReprint = () => {
    setReprintWarningOpen(false);
    executePrintDoc();
  };

  // نماذج وموضوعات سريعة جاهزة
  const applySubjectPreset = (subject: string, bodyText: string) => {
    setGeneralSubject(subject);
    setGeneralLetterBody(bodyText);
    toast.success(`تم تطبيق نموذج: ${subject}`);
  };

  const tenderMethod = getOperationTenderMethod(op);
  const operationScope = getSharedOperationScope(op);
  const fiscalYear = getOperationFiscalYear(op);
  const technicalOpeningDate = getOperationTechnicalOpeningDate(op);

  return (
    <div className="space-y-6 animate-fade-in text-foreground print:m-0 print:p-0">
      {/* ━━━ SECTION 1: بيانات الشركة المصدرة وكود العملية ورقم القيد والباركود السحابي ━━━ */}
      <SectionCard
        title="1. بيانات الشركة المصدرة وكود العملية ورقم القيد والباركود السحابي"
        icon={Building2}
        iconColor="text-indigo-600"
        badge={
          <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-[10px] font-bold">
            الشركة: {currentCompanyLink?.displayCode || "A1"}
          </Badge>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold text-foreground">الشركة المصدرة للخطاب *</Label>
              <Select
                value={currentCompanyLink?.companyId || currentCompanyLink?.id || selectedCompanyId}
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
                    if (matched.company?.phone) {
                      setPhoneWhatsapp(matched.company.phone);
                    }
                    if (matched.company?.address) {
                      setCompanyAddress(matched.company.address);
                    }
                    if (matched.company?.email) {
                      setCompanyEmail(matched.company.email);
                    }
                    setCompanyOpCode(matched.displayCode || `AZ-0${op.serialNumber || 1}`);
                  }
                }}
              >
                <SelectTrigger className="h-9.5 text-xs font-bold rounded-xl bg-background border-border">
                  <SelectValue placeholder="اختر الشركة">
                    {currentCompanyLink?.company?.name
                      ? `${currentCompanyLink.company.name} (${currentCompanyLink.displayCode || ""})`
                      : "اختر الشركة"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="text-xs font-medium">
                  {(op.companies || []).map((oc: any) => {
                    const compVal = oc.companyId || oc.id;
                    const compName = oc.company?.name || "الشركة";
                    return (
                      <SelectItem key={oc.id || compVal} value={compVal} className="text-xs font-bold">
                        {compName} ({oc.displayCode})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">رقم القيد الصادر بالخطاب العام *</Label>
                <button
                  type="button"
                  onClick={handleRegenerateRef}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
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
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">كود العملية بالشركة (Header) *</Label>
              <Input
                value={companyOpCode}
                onChange={(e) => setCompanyOpCode(e.target.value)}
                className="h-9.5 text-xs font-mono font-bold rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">السجل التجاري (س . ت) *</Label>
              <Input
                value={companyCommercialRegister}
                onChange={(e) => setCompanyCommercialRegister(e.target.value)}
                className="h-9.5 text-xs font-mono rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">البطاقة الضريبية (ب . ض) *</Label>
              <Input
                value={companyTaxCard}
                onChange={(e) => setCompanyTaxCard(e.target.value)}
                className="h-9.5 text-xs font-mono rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <SmartArabicDatePicker
                label="التاريخ الصادر (Footer)"
                value={outgoingDate}
                onChange={(val) => setOutgoingDate(val)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">واتساب الشركة (Footer)</Label>
              <Input
                value={phoneWhatsapp}
                onChange={(e) => setPhoneWhatsapp(e.target.value)}
                className="h-9.5 text-xs font-mono rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">الموبايل (Footer)</Label>
              <Input
                value={phoneMobile}
                onChange={(e) => setPhoneMobile(e.target.value)}
                className="h-9.5 text-xs font-mono rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">العنوان بالتذييل (Footer)</Label>
              <Input
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 2: جهة الإسناد وموضوع ومتن الخطاب العام ━━━ */}
      <SectionCard
        title="2. جهة الإسناد، وموضوع ونص الخطاب العام الرسمي"
        icon={MessageSquareQuote}
        iconColor="text-indigo-600"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs font-bold text-foreground">لقب المرسل إليه (السيد ...) *</Label>
              <Input
                value={recipientPrefix}
                onChange={(e) => setRecipientPrefix(e.target.value)}
                placeholder="الأستاذ"
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label className="text-xs font-bold text-foreground">المنصب والجهة الإدارية المسندة *</Label>
              <Input
                value={recipientTitleAndAuthority}
                onChange={(e) => setRecipientTitleAndAuthority(e.target.value)}
                placeholder="مدير الادارة العامة للمشتريات والمخازن بـ ..."
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
          </div>

          {/* بيانات المندوب القانوني المفوض (المذكور في متن تفويض الخطاب) */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-foreground">بيانات تفويض المندوب القانوني بالخطاب:</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setGeneralLetterBody(generateDefaultBody(delegateName, delegateRole, delegateNationalId));
                  toast.success("تم تحديث نص المتن ببيانات المندوب والعملية ↺");
                }}
                className="text-[11px] h-7 px-2.5 font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100/50 cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span>تحديث نص المتن بالبيانات الحالية ↺</span>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground">اسم المندوب المفوض (السيد / ...)</Label>
                <Input
                  value={delegateName}
                  onChange={(e) => setDelegateName(e.target.value)}
                  placeholder="أحمد محمد أحمد"
                  className="h-8.5 text-xs rounded-xl bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground">صفة المندوب (وصفته ...)</Label>
                <Input
                  value={delegateRole}
                  onChange={(e) => setDelegateRole(e.target.value)}
                  placeholder="مندوب التعاقدات المفوض"
                  className="h-8.5 text-xs rounded-xl bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground">الرقم القومي للمندوب</Label>
                <Input
                  value={delegateNationalId}
                  onChange={(e) => setDelegateNationalId(e.target.value)}
                  placeholder="23056289523202"
                  className="h-8.5 text-xs font-mono rounded-xl bg-background"
                />
              </div>
            </div>
          </div>

          {/* نماذج سريعة جاهزة للاختيار */}
          <div className="p-3 rounded-2xl bg-muted/40 border border-border space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>نماذج خطابات رسمية شائعة بنقرة واحدة:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  applySubjectPreset(
                    `سحب كراسة الشروط والمواصفات لعملية ${op.name || "المناقصة"} وتفويض مندوب`,
                    generateDefaultBody(delegateName, delegateRole, delegateNationalId)
                  )
                }
                className="text-[11px] h-7.5 px-3 rounded-xl border-border hover:bg-muted font-bold cursor-pointer"
              >
                📄 سحب الكراسة وتفويض مندوب
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  applySubjectPreset(
                    `طلب معاينة موقع عملية ${op.name || "المناقصة"}`,
                    `نحيط سيادتكم علماً برغبة شركتنا في إجراء المعاينة النافية للجهالة لموقع عملية (${operationScope}) طرفكم للعام المالي ${fiscalYear}، برجاء التكرم بالتوجيه لمن يلزم لتسهيل مأمورية مندوبنا وإصدار تصريح المعاينة اللازم.`
                  )
                }
                className="text-[11px] h-7.5 px-3 rounded-xl border-border hover:bg-muted font-bold cursor-pointer"
              >
                🔍 طلب معاينة الموقع
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  applySubjectPreset(
                    `طلب إفادة واستعجال بشأن عملية ${op.name || "المناقصة"}`,
                    `بالإشارة إلى موضوع العملية عاليه والمنعقدة طرفكم، نرجو من سيادتكم التكرم بإفادتنا بموقف البت الفني والمالي وتحديد موعد جلسة فتح المظاريف المالية، وذلك لاتخاذ الإجراءات اللازمة من جانبنا وفقاً للقانون.`
                  )
                }
                className="text-[11px] h-7.5 px-3 rounded-xl border-border hover:bg-muted font-bold cursor-pointer"
              >
                ⏱️ طلب إفادة ومتابعة
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  applySubjectPreset(
                    `تقديم مستندات رسمية إضافية لعملية ${op.name || "المناقصة"}`,
                    `مرفق طيه المستندات والأوراق الرسمية الإضافية المطلوبة من شركتنا بخصوص عملية (${operationScope}) طرفكم للعام المالي ${fiscalYear}، برجاء التفضل بالإحاطة والإضافة لملف العطاء.`
                  )
                }
                className="text-[11px] h-7.5 px-3 rounded-xl border-border hover:bg-muted font-bold cursor-pointer"
              >
                📎 تقديم مستندات إضافية
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              موضوع الخطاب الصادر (يستبدل عبارة: الموضوع بخصوص : ..... في القالب) *
            </Label>
            <Input
              value={generalSubject}
              onChange={(e) => setGeneralSubject(e.target.value)}
              placeholder="الموضوع بخصوص : ..."
              className="h-10 text-xs font-bold rounded-xl bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">
                متن ونص الخطاب الرسمي المعتمد (يستبدل متن القالب بالكامل مع الحفاظ التام على الخط والأبعاد) *
              </Label>
              <span className="text-[10px] text-muted-foreground font-mono">
                {generalLetterBody.length} حرف
              </span>
            </div>
            <Textarea
              value={generalLetterBody}
              onChange={(e) => setGeneralLetterBody(e.target.value)}
              rows={6}
              placeholder="اكتب نص الخطاب الرسمي هنا..."
              className="text-xs font-medium leading-relaxed rounded-2xl bg-background p-3"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              ملاحظات إضافية بأسفل الخطاب (اختياري - تستبدل خانة الملاحظات الحمراء بالقالب أو تُحذف تلقائياً إذا تركت فارغة)
            </Label>
            <Textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={2}
              placeholder="اكتب ملاحظات إضافية هنا لتظهر في موضع خانة الملاحظات، أو اتركها فارغة لإلغائها تماماً من المستند..."
              className="text-xs rounded-xl bg-background p-2.5"
            />
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 3: التوقيعات والاعتمادات الرسمية ━━━ */}
      <SectionCard
        title="3. التوقيعات والاعتمادات الرسمية المعتمدة بأسفل الخطاب"
        icon={ShieldCheck}
        iconColor="text-indigo-600"
      >
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">صفة الموظف المختص *</Label>
            <Input
              value={specialistTitle}
              onChange={(e) => setSpecialistTitle(e.target.value)}
              placeholder="المختص :"
              className="h-9.5 text-xs rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">اسم الموظف المختص *</Label>
            <Input
              value={specialistName}
              onChange={(e) => setSpecialistName(e.target.value)}
              placeholder="أحمد محمد"
              className="h-9.5 text-xs rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">اسم المدير المالي *</Label>
            <Input
              value={financeManagerName}
              onChange={(e) => setFinanceManagerName(e.target.value)}
              placeholder="محمود إبراهيم"
              className="h-9.5 text-xs rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">صفة الاعتماد الختامي *</Label>
            <Input
              value={boardChairman}
              onChange={(e) => setBoardChairman(e.target.value)}
              placeholder="رئيس مجلس الإدارة"
              className="h-9.5 text-xs rounded-xl font-bold"
            />
          </div>
        </div>
      </SectionCard>

      {/* ━━━ نافذة المعاينة والتحكم بالـ Word / PDF ━━━ */}
      {previewModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in text-foreground">
            <div className="relative w-full max-w-6xl h-[94vh] bg-background border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden">
              <div className="p-3.5 sm:p-4 border-b border-border flex items-center justify-between gap-3 bg-card shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-600 flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-foreground">
                      معاينة الخطاب العام الرسمي المعتمد (Word & PDF)
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      رقم القيد: {registrationNumber} • {generalSubject}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadDocx}
                    disabled={downloadingDocx}
                    className="h-9 px-3 text-xs font-bold rounded-xl border-border hover:bg-muted cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5 text-blue-600" />
                    <span>تحميل Word</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    className="h-9 px-3 text-xs font-bold rounded-xl border-border hover:bg-muted cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5 text-rose-600" />
                    <span>تحميل PDF</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handlePrintWordDocument}
                    disabled={printingDocx}
                    className="h-9 px-4 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>طباعة المستند 🖨️</span>
                  </Button>

                  <button
                    type="button"
                    onClick={() => setPreviewModalOpen(false)}
                    className="w-9 h-9 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-muted/20 relative overflow-hidden">
                {renderingDocx ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
                    <p className="text-xs font-bold text-muted-foreground">جاري تجهيز وعرض الخطاب الرسمي...</p>
                  </div>
                ) : (
                  <OnlyOfficeDocViewer
                    documentTitle={`خطاب_عام_${registrationNumber || op.name}.docx`}
                    docxBlob={previewDocxBlob}
                    pdfBlob={previewPdfBlob}
                    pdfUrl={previewPdfUrl}
                    onDownloadDocx={handleDownloadDocx}
                    onDownloadPdf={handleDownloadPdf}
                    onPrint={handlePrintWordDocument}
                    onAddToArchive={handleToggleArchive}
                    isArchived={isArchived}
                    addingToArchive={addingToArchive}
                    cloudUploadWarning={cloudWarningMsg}
                    onUploadCloud={() => handleUploadToCloud(true)}
                    isUploadingCloud={uploadingCloud}
                  />
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ━━━ BOTTOM ACTION BAR ━━━ */}
      <LetterBottomActionWidget
        title="الخطاب الرسمي العام الموجه لجهة الإسناد"
        registrationNumber={registrationNumber}
        isDirty={isDirty}
        printInfo={printHistory["general_letter"]}
        onPreview={() => {
          loadOfficialPreview();
        }}
        onSave={handleSaveToSystem}
        onCancelEdits={handleCancelEdits}
        saving={savingState}
        onViewArchive={() => {
          setPreviewModalOpen(true);
          loadOfficialPreview();
        }}
        onAddToArchive={handleToggleArchive}
        isArchived={isArchived}
        addingToArchive={addingToArchive}
        icon={FileText}
        iconColor="text-indigo-700 dark:text-indigo-400"
        iconBg="bg-indigo-500/15 border-indigo-500/30"
        customSubtitle="مطابق 100% لقالب الوورد الرسمي المعتمد للشركة. اضغط على زر المعاينة للاطلاع على المستند وتنزيله أو طباعته."
      />

      {/* ━━━ نافذة التنبيه عند إعادة طباعة مستند مطبوع مسبقاً ━━━ */}
      <ReprintConfirmModal
        open={reprintWarningOpen}
        onClose={() => setReprintWarningOpen(false)}
        printInfo={printHistory["general_letter"]}
        onConfirmReprint={handleConfirmReprint}
        onViewArchive={() => {
          setReprintWarningOpen(false);
          loadOfficialPreview();
        }}
      />

      {/* ━━━ نافذة التحميل العائمة المبتكرة عند تنزيل PDF ━━━ */}
      <PdfExportLoadingModal open={downloadingPdf} />

      {/* ━━━ STEP FOOTER NAVIGATION ━━━ */}
      <StepFooterNav
        currentTabId="general_letter"
        onNavigate={onNavigate}
        nextLabel="الانتقال إلى: الكراسة والتأمين الابتدائي ➔"
        prevLabel="← دراسة السوق والجدوى"
      />
    </div>
  );
}
