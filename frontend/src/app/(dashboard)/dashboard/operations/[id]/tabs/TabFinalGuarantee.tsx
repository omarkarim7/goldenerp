"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ShieldCheck, Printer, Download, Eye, FileText, Check, AlertCircle,
  Building2, Calendar, Hash, FileCheck, Copy, ArrowRight, ArrowLeft,
  Paperclip, QrCode, Cloud, Globe, ExternalLink, CheckCircle2, RotateCcw,
  Save, Lock, Sparkles, Receipt, Landmark, RefreshCw, Trash2, Edit, X, Plus, Loader2, FolderOpen, Clock
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
import { Operation, SectionCard, DataRow, EmptyState, formatDate, formatCurrency, tafqeetArabic, formatDocFileSize } from "./types";
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
  getSharedOperationScope,
  replaceDocxScope,
  replaceDocxFiscalAndDate,
  replaceDocxChairman,
  sanitizeChairmanTitle,
  FiscalYearSelect,
  getOperationRecipientTitle,
  getOperationFiscalYear,
  getOperationTechnicalOpeningDate,
  getOperationTenderMethod,
} from "./letter-utils";
import JSZip from "jszip";
import QRCode from "qrcode";
import { getPdfBlobFromDocx, uploadPdfToFreeCloud } from "./client-pdf";
import { OnlyOfficeDocViewer } from "@/components/OnlyOfficeDocViewer";

export type FinalGuaranteeLetterType =
  | "CASH"
  | "DEDUCTION"
  | "DEDUCTION_AND_INITIAL"
  | "INITIAL_TRANSFER"
  | "BANK_GUARANTEE";

function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function TabFinalGuarantee({
  op,
  onRefresh,
  onNavigate,
  onPreviewDoc,
  onDownloadDoc,
}: {
  op: Operation;
  onRefresh: () => void;
  onNavigate?: (tabId: string) => void;
  onPreviewDoc?: (doc: any) => void;
  onDownloadDoc?: (doc: any) => void;
}) {
  // Read saved guarantee letter settings from op.notes
  const savedSettings = useMemo(() => {
    try {
      if (op.notes && op.notes.startsWith("{")) {
        const parsed = JSON.parse(op.notes);
        return parsed.finalGuaranteeLetter || null;
      }
    } catch {}
    return null;
  }, [op.notes]);

  // Active Letter Type
  const [activeLetterType, setActiveLetterType] = useState<FinalGuaranteeLetterType>(() => {
    return savedSettings?.activeLetterType || "CASH";
  });

  // Winning Award Details
  const ourWinningAward = (op.awards || []).find((a: any) => a.isOurCompany) || op.awards?.[0];
  const totalAwardPrice = Number(ourWinningAward?.winnerPrice || 850000);
  const calculated5Percent = Math.round(totalAwardPrice * 0.05);

  // Initial Guarantee Details
  const initialGuar = (op.guarantees || []).find((g: any) => g.type === "INITIAL");
  const initialGuarAmount = initialGuar ? Number(initialGuar.amount) : 10000;

  // Company Selection
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => {
    return savedSettings?.selectedCompanyId || op.companies?.[0]?.companyId || op.companies?.[0]?.id || "";
  });

  const currentCompanyLink = useMemo(() => {
    return (
      op.companies?.find((c: any) => c.companyId === selectedCompanyId || c.id === selectedCompanyId) ||
      op.companies?.[0]
    );
  }, [op.companies, selectedCompanyId]);

  const currentCompany = currentCompanyLink?.company;

  // Smart Outgoing Registration Number (Unified across operation)
  const [registrationNumber, setRegistrationNumber] = useState(() => {
    if (savedSettings?.registrationNumber) return savedSettings.registrationNumber;
    return getUnifiedOperationRegistrationNumber(op, currentCompanyLink?.displayCode);
  });

  // Header & Footer fields
  const [companyOpCode, setCompanyOpCode] = useState(() => savedSettings?.companyOpCode || currentCompanyLink?.displayCode || `AZ-0${op.serialNumber || 1}`);
  const [companyCommercialRegister, setCompanyCommercialRegister] = useState(() => savedSettings?.companyCommercialRegister || currentCompany?.commercialRegister || "110200700036620");
  const [companyTaxCard, setCompanyTaxCard] = useState(() => savedSettings?.companyTaxCard || currentCompany?.taxCard || "658369652");
  const [phoneWhatsapp, setPhoneWhatsapp] = useState(() => savedSettings?.phoneWhatsapp || currentCompany?.phone || "01091708818");
  const [phoneMobile, setPhoneMobile] = useState(() => savedSettings?.phoneMobile || "01557018818");
  const [companyAddress, setCompanyAddress] = useState(() => savedSettings?.companyAddress || currentCompany?.address || "بجوار مستشفى ليدى كير  -  بدمنهور -  البحيره");
  const [companyEmail, setCompanyEmail] = useState(() => savedSettings?.companyEmail || currentCompany?.email || "goldengolden8818@gmail.com");
  const [outgoingDate, setOutgoingDate] = useState(() => savedSettings?.outgoingDate || new Date().toLocaleDateString("en-GB"));

  // Addressee & Operation Fields
  const [recipientPrefix, setRecipientPrefix] = useState(() => savedSettings?.recipientPrefix || "الأستاذ");
  const [recipientTitleAndAuthority, setRecipientTitleAndAuthority] = useState(() => {
    return getOperationRecipientTitle(op, savedSettings?.recipientTitleAndAuthority);
  });
  const [operationRegisteredName, setOperationRegisteredName] = useState(() => savedSettings?.operationRegisteredName || op.name || "");
  const [operationNumber, setOperationNumber] = useState(() => savedSettings?.operationNumber || op.externalNumber || (op.serialNumber ? String(op.serialNumber) : "") || "");
  const [tenderMethod, setTenderMethod] = useState(() => savedSettings?.tenderMethod || getOperationTenderMethod(op));
  const [operationScope, setOperationScope] = useState(() => getSharedOperationScope(op, savedSettings?.operationScope));
  const [fiscalYear, setFiscalYear] = useState(() => getOperationFiscalYear(op, savedSettings?.fiscalYear));
  const [technicalOpeningDate, setTechnicalOpeningDate] = useState(() => {
    return getOperationTechnicalOpeningDate(op, savedSettings?.technicalOpeningDate);
  });

  // مزامنة تلقائية للبيانات إذا تغيرت العملية دون وجود تعديل يدوي محفوظ
  useEffect(() => {
    if (!savedSettings?.operationRegisteredName && op.name) {
      setOperationRegisteredName(op.name);
    }
    if (!savedSettings?.operationScope && (op.name || (op as any).description)) {
      setOperationScope(getSharedOperationScope(op));
    }
    if (!savedSettings?.operationNumber && (op.externalNumber || op.serialNumber)) {
      setOperationNumber(op.externalNumber || String(op.serialNumber));
    }
    if (!savedSettings?.recipientTitleAndAuthority && op.authority) {
      setRecipientTitleAndAuthority(`مدير الادارة العامة للمشتريات والمخازن بـ ${op.authority}`);
    }
    if (!savedSettings?.technicalOpeningDate) {
      const d = op.dates?.find((dt: any) => dt.type === "TECHNICAL_OPENING" || dt.title?.includes("فني"));
      if (d?.dateValue) setTechnicalOpeningDate(formatDate(d.dateValue));
      else if (d?.date) setTechnicalOpeningDate(formatDate(d.date));
    }
  }, [op.name, op.externalNumber, op.serialNumber, op.authority, op.dates, savedSettings]);

  // Guarantee Amounts
  const [amountPaid, setAmountPaid] = useState<string>(() => savedSettings?.amountPaid || String(calculated5Percent));
  const [totalAwardAmount, setTotalAwardAmount] = useState<string>(() => savedSettings?.totalAwardAmount || String(totalAwardPrice));
  const [initialGuaranteeFieldAmount, setInitialGuaranteeFieldAmount] = useState<string>(() => savedSettings?.initialGuaranteeFieldAmount || String(initialGuarAmount));

  // Deduction Fields (for deduction templates)
  const [deductionOperationName, setDeductionOperationName] = useState(() => savedSettings?.deductionOperationName || "توريد مستلزمات مكتبية للجامعة");
  const [deductionMonth, setDeductionMonth] = useState(() => savedSettings?.deductionMonth || "أكتوبر");
  const [deductionYear, setDeductionYear] = useState(() => savedSettings?.deductionYear || "2026");

  // Bank Guarantee Fields (for bank template)
  const [bankRecipientTitle, setBankRecipientTitle] = useState(() => savedSettings?.bankRecipientTitle || "مدير بنك مصر   فرع    دمنهور");
  const [bankTargetAuthority, setBankTargetAuthority] = useState(() => savedSettings?.bankTargetAuthority || (op.authority || "مديرية الصحة بالبحيرة"));
  const [bankTargetAddress, setBankTargetAddress] = useState(() => savedSettings?.bankTargetAddress || "البحيرة – دمنهور - خلف مستشفى الصدر");
  const [bankAccountNumber, setBankAccountNumber] = useState(() => savedSettings?.bankAccountNumber || "2670220000004113");
  const [bankNameAndBranch, setBankNameAndBranch] = useState(() => savedSettings?.bankNameAndBranch || "مصر الاسلامى — فرع دمنهور");
  const [accountHolderName, setAccountHolderName] = useState(() => savedSettings?.accountHolderName || "سحر حسن محمد أحمد عبد السلام جولدن سرفيس");
  const [accountNationalId, setAccountNationalId] = useState(() => savedSettings?.accountNationalId || "28912111802623");
  const [guaranteeDurationText, setGuaranteeDurationText] = useState(() => savedSettings?.guaranteeDurationText || "سنة واحدة");
  const [guaranteeStartDate, setGuaranteeStartDate] = useState(() => savedSettings?.guaranteeStartDate || new Date().toLocaleDateString("en-GB"));
  const [guaranteeEndDate, setGuaranteeEndDate] = useState(() => {
    if (savedSettings?.guaranteeEndDate) return savedSettings.guaranteeEndDate;
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toLocaleDateString("en-GB");
  });

  // Signatures & Notes
  const [specialistTitle, setSpecialistTitle] = useState(() => savedSettings?.specialistTitle || "المختص / المندوب :");
  const [specialistName, setSpecialistName] = useState(() => savedSettings?.specialistName || "أحمد محمد");
  const [financeManagerName, setFinanceManagerName] = useState(() => savedSettings?.financeManagerName || "محمود إبراهيم");
  const [boardChairman, setBoardChairman] = useState(() => {
    if (savedSettings?.boardChairman) return sanitizeChairmanTitle(savedSettings.boardChairman);
    const comp = currentCompanyLink?.company || op.companies?.[0]?.company;
    return sanitizeChairmanTitle(comp?.managerName || "سحر حسن محمد أحمد عبد السلام");
  });
  // Cloud URLs per letter type (Catbox.moe / Tmpfile / Gofile)
  const [cloudUrls, setCloudUrls] = useState<Record<string, string>>(() => {
    const initial = savedSettings?.cloudUrls || {};
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(initial)) {
      if (
        typeof v === "string" &&
        (v.startsWith("http://") || v.startsWith("https://")) &&
        !v.includes("public-doc") &&
        !v.includes("17a9mx.pdf")
      ) {
        cleaned[k] = v;
      }
    }
    return cleaned;
  });
  const [uploadingCloud, setUploadingCloud] = useState(false);
  const [lastGeneratedSnapshot, setLastGeneratedSnapshot] = useState<string | null>(null);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewDocxBlob, setPreviewDocxBlob] = useState<Blob | null>(null);
  const [previewPdfBlob, setPreviewPdfBlob] = useState<Blob | null>(null);
  const [renderingDocx, setRenderingDocx] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [printingDocx, setPrintingDocx] = useState(false);
  const [savingState, setSavingState] = useState(false);

  // Step 2: Guarantee Receipt Submission State
  const [addingReceipt, setAddingReceipt] = useState(false);
  const [receiptPaymentMethod, setReceiptPaymentMethod] = useState<"CASH" | "BANK_GUARANTEE" | "DEDUCTION" | "TRANSFER">("CASH");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [receiptAmount, setReceiptAmount] = useState(String(calculated5Percent));
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split("T")[0]);
  const [bankName, setBankName] = useState("بنك مصر");
  const [validUntilDate, setValidUntilDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  });
  const [receiptNotes, setReceiptNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [savingReceipt, setSavingReceipt] = useState(false);

  // مزامنة طريقة السداد في الخطوة 2 تلقائياً مع نموذج الخطاب المختار في الخطوة 1
  useEffect(() => {
    if (activeLetterType === "CASH") setReceiptPaymentMethod("CASH");
    else if (activeLetterType === "BANK_GUARANTEE") setReceiptPaymentMethod("BANK_GUARANTEE");
    else if (activeLetterType === "DEDUCTION") setReceiptPaymentMethod("DEDUCTION");
    else if (activeLetterType === "INITIAL_TRANSFER" || activeLetterType === "DEDUCTION_AND_INITIAL") setReceiptPaymentMethod("TRANSFER");
  }, [activeLetterType]);

  // Current Cloud URL
  const currentCloudUrl = cloudUrls[activeLetterType] || "";

  // IsDirty Snapshot Check
  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      activeLetterType,
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
      amountPaid,
      totalAwardAmount,
      initialGuaranteeFieldAmount,
      deductionOperationName,
      deductionMonth,
      deductionYear,
      bankRecipientTitle,
      bankTargetAuthority,
      bankTargetAddress,
      bankAccountNumber,
      bankNameAndBranch,
      accountHolderName,
      accountNationalId,
      guaranteeDurationText,
      guaranteeStartDate,
      guaranteeEndDate,
      specialistTitle,
      specialistName,
      financeManagerName,
      boardChairman,
    });
  }, [
    activeLetterType, selectedCompanyId, registrationNumber, companyOpCode, companyCommercialRegister,
    companyTaxCard, phoneWhatsapp, phoneMobile, companyAddress, companyEmail, outgoingDate,
    recipientPrefix, recipientTitleAndAuthority, operationRegisteredName, operationNumber, tenderMethod,
    operationScope, fiscalYear, technicalOpeningDate, amountPaid, totalAwardAmount,
    initialGuaranteeFieldAmount, deductionOperationName, deductionMonth, deductionYear,
    bankRecipientTitle, bankTargetAuthority, bankTargetAddress, bankAccountNumber, bankNameAndBranch,
    accountHolderName, accountNationalId, guaranteeDurationText, guaranteeStartDate, guaranteeEndDate,
    specialistTitle, specialistName, financeManagerName, boardChairman,
  ]);

  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => currentSnapshot);
  const isDirty = useMemo(() => currentSnapshot !== savedSnapshot, [currentSnapshot, savedSnapshot]);

  const handleCancelEdits = () => {
    try {
      const snap = JSON.parse(savedSnapshot);
      setActiveLetterType(snap.activeLetterType);
      setSelectedCompanyId(snap.selectedCompanyId);
      setRegistrationNumber(snap.registrationNumber);
      setAmountPaid(snap.amountPaid);
      setTotalAwardAmount(snap.totalAwardAmount);
      setSpecialistName(snap.specialistName);
      setFinanceManagerName(snap.financeManagerName);
      if (snap.boardChairman) setBoardChairman(sanitizeChairmanTitle(snap.boardChairman));
      if (snap.deductionOperationName) setDeductionOperationName(snap.deductionOperationName);
      if (snap.deductionMonth) setDeductionMonth(snap.deductionMonth);
      if (snap.deductionYear) setDeductionYear(snap.deductionYear);
      toast.info("تم التراجع عن التعديلات ↺");
    } catch {
      toast.error("تعذر التراجع عن التعديلات");
    }
  };

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

  // ━━━ Word Document Generation Engine (محرك توليد مستندات الوورد المعتمدة بدقة 100%) ━━━
  const generateGuaranteeDocxBlob = async (type: FinalGuaranteeLetterType = activeLetterType): Promise<Blob> => {
    let templateFilename = "final_insurance_cash_template.docx";
    if (type === "DEDUCTION") templateFilename = "final_insurance_deduction_template.docx";
    else if (type === "DEDUCTION_AND_INITIAL") templateFilename = "final_insurance_deduction_and_initial_template.docx";
    else if (type === "INITIAL_TRANSFER") templateFilename = "final_insurance_initial_transfer_template.docx";
    else if (type === "BANK_GUARANTEE") templateFilename = "final_insurance_bank_guarantee_template.docx";

    const response = await fetch(`/templates/${templateFilename}`);
    if (!response.ok) throw new Error(`فشل قراءة قالب التأمين النهائي (${type}) من الخادم`);
    const templateBuffer = await response.arrayBuffer();

    const zip = await JSZip.loadAsync(templateBuffer);

    // QR Code Generation
    let qrDrawingXml = "";
    try {
      const activeCloud = cloudUrls[type];
      const origin = typeof window !== "undefined" ? window.location.origin : "https://goldenerp-tau.vercel.app";
      let targetVerifyUrl = `${origin}/verify-doc?ref=${encodeURIComponent(registrationNumber)}&opId=${op.id}&type=guarantee_final_${type}&printedBy=${encodeURIComponent(getCurrentUserName())}&printedAt=${Date.now()}`;
      if (activeCloud && (activeCloud.startsWith("http://") || activeCloud.startsWith("https://")) && !activeCloud.includes("public-doc")) {
        targetVerifyUrl = activeCloud;
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

    let docXml = await zip.file("word/document.xml")!.async("text");
    docXml = injectSingleQrIntoDocXml(docXml, qrDrawingXml, escapeXml(registrationNumber));

    const numPaid = Number(amountPaid) || calculated5Percent;
    const tafqeetPaid = tafqeetArabic(numPaid);
    const numTotal = Number(totalAwardAmount) || totalAwardPrice;
    const tafqeetTotal = tafqeetArabic(numTotal);
    const numInitial = Number(initialGuaranteeFieldAmount) || initialGuarAmount;
    const tafqeetInitial = tafqeetArabic(numInitial);

    // 1. استبدال السيد / الموجه إليه بدقة 100%
    if (type === "BANK_GUARANTEE") {
      const recipientRegex = /(<w:t[^>]*>\s*\/\s*<\/w:t><\/w:r>)([\s\S]*?)(<\/w:p>)/;
      docXml = docXml.replace(recipientRegex, `$1<w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="56"/><w:szCs w:val="56"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ${escapeXml(bankRecipientTitle)}</w:t></w:r>$3`);

      // الجهة المستفيدة من خطاب الضمان وعنوانها
      const bankAuthRegex = /(<w:t[^>]*>[^<]*الجهه[^<]*<\/w:t><\/w:r>)([\s\S]*?)(<\/w:p>)/;
      docXml = docXml.replace(bankAuthRegex, `$1<w:r><w:rPr><w:rFonts w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ${escapeXml(bankTargetAuthority)} وعنوانها : ${escapeXml(bankTargetAddress)}</w:t></w:r>$3`);

      // مدة الارتباط بالتأمين
      const durationRegex = /(<w:t[^>]*>[^<]*ومدة\s*الارتباط\s*بالتأمين[^<]*<\/w:t><\/w:r>)([\s\S]*?)(<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:t[^>]*>[^<]*تبدأ\s*من[^<]*<\/w:t>[\s\S]*?<\/w:r>)/;
      docXml = docXml.replace(durationRegex, `$1<w:r><w:rPr><w:rFonts w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ${escapeXml(guaranteeDurationText)} </w:t></w:r>$3`);

      docXml = docXml.replace(/12\/12\/2027/g, escapeXml(guaranteeStartDate));
      docXml = docXml.replace(/12\/12\s*\/2028/g, escapeXml(guaranteeEndDate));
      docXml = docXml.replace(/2670220000004113/g, escapeXml(bankAccountNumber));
      docXml = docXml.replace(/مصر الاسلامى\s+فرع\s+:\s+دمنهور/g, escapeXml(bankNameAndBranch));
      docXml = docXml.replace(/مصر الاسلامى/g, escapeXml(bankNameAndBranch));
      docXml = docXml.replace(/ســـحر حسن محمد أحمد عبد السلام(?:\s+جولدن سرفيس)?/g, escapeXml(accountHolderName));
      docXml = docXml.replace(/سحر حسن محمد أحمد عبد السلام/g, escapeXml(accountHolderName));
      docXml = docXml.replace(/28912111802623/g, escapeXml(accountNationalId));
    } else {
      const recipientRegex = /(<w:t[^>]*>\s*\/\s*<\/w:t><\/w:r>)([\s\S]*?)(<\/w:p>)/;
      docXml = docXml.replace(recipientRegex, `$1<w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="56"/><w:szCs w:val="56"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ${escapeXml(recipientTitleAndAuthority)}</w:t></w:r>$3`);
    }

    // لقب المخاطب (السيد الأستاذ / المهندس / الدكتور)
    const prefixRegex = /(<w:t[^>]*>السيد<\/w:t><\/w:r>)([\s\S]*?)(<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:t[^>]*>\s*\/\s*<\/w:t>[\s\S]*?<\/w:r>)/;
    docXml = docXml.replace(prefixRegex, `$1<w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="56"/><w:szCs w:val="56"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ${escapeXml(recipientPrefix)} </w:t></w:r>$3`);

    // 2. أسلوب الطرح الرسمي (بالمناقصة العامة / المحدودة / الممارسة)
    const tenderRegex = /(<w:t[^>]*>[^<]*والخاص[^<]*<\/w:t><\/w:r>)([\s\S]*?)(<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:t[^>]*>[^<]*لزوم[^<]*<\/w:t>[\s\S]*?<\/w:r>)/;
    const methodWithBa = tenderMethod.startsWith("ب") ? tenderMethod : `بـ ${tenderMethod}`;
    docXml = docXml.replace(tenderRegex, `$1<w:r><w:rPr><w:rFonts w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ${escapeXml(methodWithBa)} </w:t></w:r>$3`);

    // 3. نطاق وموضوع التوريد لزوم العملية (بدون أقواس)
    docXml = replaceDocxScope(docXml, operationScope);

    // 4. السنة المالية وموعد جلسة فتح المظاريف
    docXml = replaceDocxFiscalAndDate(docXml, fiscalYear, technicalOpeningDate);

    // 5. بيانات العملية العامة
    docXml = docXml.replace(/اسم العملية المسجله[\s\.]*/g, escapeXml(operationRegisteredName) + " ");
    docXml = docXml.replace(/365/g, escapeXml(operationNumber));

    // 6. المبالغ والتفقيط
    docXml = docXml.replace(/37547/g, String(numPaid));
    docXml = docXml.replace(/سبعة وثلاثون ألفا وخمسمائة وسبعه وأربعون/g, tafqeetPaid);
    docXml = docXml.replace(/47547/g, String(numTotal));
    docXml = docXml.replace(/سبعه وأربعون ألفا وخمسمائة وسبعه وأربعون/g, tafqeetTotal);

    // 7. بيانات الخصم من مستحقات عملية أخرى
    if (type === "DEDUCTION" || type === "DEDUCTION_AND_INITIAL") {
      const deductionRegex = /(<w:t[^>]*>[^<]*مستحقات\s*الشركة\s*لديكم\s*في\s*عملية[^<]*<\/w:t><\/w:r>)([\s\S]*?)(<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:t[^>]*>[^<]*والتي\s*تستحق[^<]*<\/w:t>[\s\S]*?<\/w:r>)/;
      docXml = docXml.replace(deductionRegex, `$1<w:r><w:rPr><w:rFonts w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ${escapeXml(deductionOperationName)} عن شهر ${escapeXml(deductionMonth)} سنة ${escapeXml(deductionYear)} </w:t></w:r>$3`);
      // إزالة أي نقاط استبدال متبقية لضمان نظافة المستند 100%
      docXml = docXml.replace(/\.{4,}/g, "");
    }

    // 8. تحويل التأمين الابتدائي
    if (type === "DEDUCTION_AND_INITIAL" || type === "INITIAL_TRANSFER") {
      const initialRegex = /(<w:t[^>]*>[^<]*وتحويل\s*مبلغ\s*التأمين\s*ال[أا]بتدائ[ىي]\s*وقدره[^<]*<\/w:t><\/w:r>)([\s\S]*?)(<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:t[^>]*>[^<]*جنيه\s*لا\s*غير\s*ال[ىي]\s*تأمين\s*نهائي[^<]*<\/w:t>[\s\S]*?<\/w:r>)/;
      docXml = docXml.replace(initialRegex, `$1<w:r><w:rPr><w:rFonts w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve"> ${String(numInitial)} فقط وقدره : ${tafqeetInitial} </w:t></w:r>$3`);
    }

    // 9. التوقيعات واعتماد رئيس مجلس الإدارة
    docXml = docXml.replace(/المختص\s*\/\s*المندوب\s*:/g, escapeXml(specialistTitle));
    docXml = docXml.replace(/المختص\s*:/g, escapeXml(specialistTitle));
    docXml = docXml.replace(/أحمد محمد/g, escapeXml(specialistName));
    docXml = docXml.replace(/توقيع صورة أو اسم/g, escapeXml(financeManagerName || " "));
    docXml = docXml.replace(/توقيع صورة/g, escapeXml(financeManagerName || " "));
    docXml = replaceDocxChairman(docXml, boardChairman);

    // إزالة خانة الملاحظات تماماً من أسفل الخطاب كما طلب المستخدم
    docXml = docXml.replace(/<w:p\b[^>]*>(?:(?!<w:p\b)[\s\S])*?خان[ةه]\s*خالي[ةه]\s*للملاحظات[\s\S]*?<\/w:p>/g, "");
    docXml = docXml.replace(/<w:t[^>]*>[^<]*خان[ةه]\s*خالي[ةه]\s*للملاحظات[^<]*<\/w:t>/g, "<w:t></w:t>");
    docXml = docXml.replace(/خان[ةه]\s*خالي[ةه]\s*للملاحظات/g, "");

    // 10. إزالة كافة علامات التمييز والألوان الحمراء
    docXml = docXml.replace(/<w:highlight\s+[^>]*\/>/g, "");
    docXml = docXml.replace(/<w:color\s+w:val=\"(red|FF0000)\"[^>]*\/>/g, "");

    // 11. الترويسة والتذييل
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
      ftrXml = ftrXml.replace(/goldengolden8818@gmail.com/g, escapeXml(companyEmail));
      ftrXml = ftrXml.replace(/<w:highlight\s+[^>]*\/>/g, "");
      ftrXml = ftrXml.replace(/<w:color\s+w:val=\"(red|FF0000)\"[^>]*\/>/g, "");
      zip.file("word/footer1.xml", ftrXml);
    }

    // 12. حفظ مستند Word الأساسي بعد تطبيق كافة التعديلات والمتغيرات والباركود
    zip.file("word/document.xml", docXml);

    // إزالة أي علامات حمراء في كافة ملفات القالب
    await cleanAllDocxXml(zip);

    return await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  };

  const generateGuaranteePdfBlob = async (type: FinalGuaranteeLetterType = activeLetterType): Promise<Blob> => {
    const docxBlob = await generateGuaranteeDocxBlob(type);
    setPreviewDocxBlob(docxBlob);
    const pdf = await getPdfBlobFromDocx(docxBlob, `final_guarantee_${type}_${registrationNumber || op.serialNumber}.docx`);
    setPreviewPdfBlob(pdf);
    setLastGeneratedSnapshot(currentSnapshot);
    return pdf;
  };

  const loadOfficialPreview = async (type: FinalGuaranteeLetterType = activeLetterType) => {
    if (previewPdfBlob && lastGeneratedSnapshot === currentSnapshot && previewDocxBlob) {
      setPreviewModalOpen(true);
      return;
    }
    setRenderingDocx(true);
    setPreviewModalOpen(true);
    try {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
        setPreviewPdfUrl(null);
      }
      const docx = await generateGuaranteeDocxBlob(type);
      setPreviewDocxBlob(docx);

      const pdf = await getPdfBlobFromDocx(
        docx,
        `final_guarantee_${type}_${registrationNumber || op.serialNumber}.docx`
      );
      setPreviewPdfBlob(pdf);
      const url = URL.createObjectURL(pdf);
      setPreviewPdfUrl(url);
      setLastGeneratedSnapshot(currentSnapshot);

      if (!cloudUrls[type] || cloudUrls[type]?.includes("tmpfiles") || cloudUrls[type]?.includes("tmpfile") || cloudUrls[type]?.includes("catbox")) {
        handleUploadToCloud(type, false, pdf);
      }
    } catch (err: any) {
      console.error("Preview preparation failed:", err);
      toast.error("تعذر تجهيز المعاينة: " + (err?.message || ""));
    } finally {
      setRenderingDocx(false);
    }
  };

  const handleOpenDirectPdfPreview = async () => {
    // توحيد المعاينة الرسمية لتفتح النافذة المعتمدة نفسها دائماً
    await loadOfficialPreview(activeLetterType);
  };

  const handleUploadToCloud = async (
    type: FinalGuaranteeLetterType = activeLetterType,
    forceReupload = false,
    existingBlob?: Blob
  ) => {
    if (cloudUrls[type] && !cloudUrls[type].includes("tmpfiles") && !cloudUrls[type].includes("tmpfile") && !cloudUrls[type].includes("catbox") && !forceReupload) {
      return;
    }
    setUploadingCloud(true);
    try {
      let pdfBlob: Blob;
      if (existingBlob) {
        pdfBlob = existingBlob;
      } else if (previewPdfBlob && lastGeneratedSnapshot === currentSnapshot) {
        pdfBlob = previewPdfBlob;
      } else {
        pdfBlob = await generateGuaranteePdfBlob(type);
      }

      const fileName = `final_guarantee_${type}_${registrationNumber || op.serialNumber}.pdf`;
      const cloudRes = await uploadPdfToFreeCloud(pdfBlob, fileName);

      if (cloudRes?.url) {
        const updatedUrls = { ...cloudUrls, [type]: cloudRes.url };
        setCloudUrls(updatedUrls);

        try {
          let existingNotes: any = {};
          if (op.notes && op.notes.startsWith("{")) existingNotes = JSON.parse(op.notes);
          if (!existingNotes.finalGuaranteeLetter) existingNotes.finalGuaranteeLetter = {};
          existingNotes.finalGuaranteeLetter.cloudUrls = updatedUrls;
          await api.patch(`/operations/${op.id}`, { notes: JSON.stringify(existingNotes) });
        } catch {}
      }
    } catch (err: any) {
      console.warn("Cloud upload background note:", err?.message);
    } finally {
      setUploadingCloud(false);
    }
  };

  // ━━━ سجل الطباعة وتنبيه إعادة الطباعة ━━━
  const [printHistory, setPrintHistory] = useState<Record<string, PrintHistoryEntry>>(() => {
    let notesObj: any = {};
    if (op.notes && op.notes.startsWith("{")) {
      try { notesObj = JSON.parse(op.notes); } catch (e) {}
    }
    return notesObj.finalGuaranteeLetter?.printHistory || {};
  });
  const [reprintWarningOpen, setReprintWarningOpen] = useState(false);

  // ━━━ دالة تنفيذ الطباعة وتحديث سجل الطباعة الرسمي ━━━
  const executePrintDoc = async () => {
    setPrintingDocx(true);
    try {
      toast.info("جاري تجهيز مستند التأمين النهائي للطباعة بأعلى دقة...");
      let pdfUrl: string;
      let pdfBlob: Blob;
      try {
        pdfBlob = previewPdfBlob || (await generateGuaranteePdfBlob(activeLetterType));
        pdfUrl = URL.createObjectURL(pdfBlob);
      } catch {
        window.print();
        return;
      }

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
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
      const prev = printHistory[activeLetterType] || { printCount: 0 };
      const updatedHistory = {
        ...printHistory,
        [activeLetterType]: {
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
        const existingLetter = notesObj.finalGuaranteeLetter || {};
        existingLetter.printHistory = updatedHistory;
        notesObj.finalGuaranteeLetter = existingLetter;
        await api.patch(`/operations/${op.id}`, { notes: JSON.stringify(notesObj) });
        onRefresh();
      } catch (e) {
        console.warn("Could not persist print history:", e);
      }

      if (!cloudUrls[activeLetterType] || cloudUrls[activeLetterType]?.includes("tmpfiles") || cloudUrls[activeLetterType]?.includes("tmpfile") || cloudUrls[activeLetterType]?.includes("catbox")) {
        handleUploadToCloud(activeLetterType, false).catch(() => {});
      }

      toast.success("تم إرسال المستند للطباعة وتحديث سجل الطباعة بنجاح ✓");
    } catch (err: any) {
      window.print();
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
    const currentInfo = printHistory[activeLetterType];
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
    const activeCloud = cloudUrls[activeLetterType];
    if (activeCloud) {
      window.open(activeCloud, "_blank");
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
        d.type?.toLowerCase().includes("guarantee") ||
        d.name?.toLowerCase().includes("guarantee") ||
        d.name?.includes("ضمان") ||
        d.name?.includes("تأمين")
    );
    if (archivedDoc?.fileUrl) {
      window.open(archivedDoc.fileUrl, "_blank");
      return;
    }
    // 4. فتح المعاينة
    setPreviewModalOpen(true);
  };

  const handleDownloadDocx = async (type: FinalGuaranteeLetterType = activeLetterType) => {
    setDownloadingDocx(true);
    try {
      let blob = previewDocxBlob;
      if (!blob || lastGeneratedSnapshot !== currentSnapshot) {
        blob = await generateGuaranteeDocxBlob(type);
        setPreviewDocxBlob(blob);
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `خطاب_سداد_التأمين_النهائي_${type}_${op.serialNumber || "365"}.docx`;
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

  const handleDownloadPdf = async (type: FinalGuaranteeLetterType = activeLetterType) => {
    // 0ms instant download if already generated in preview and no inputs changed
    if (previewPdfBlob && lastGeneratedSnapshot === currentSnapshot) {
      const url = URL.createObjectURL(previewPdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `خطاب_سداد_التأمين_النهائي_${type}_${op.serialNumber || "365"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل ملف الـ PDF الرسمي فوراً! 📑✨");
      return;
    }

    setDownloadingPdf(true);
    try {
      toast.info("جاري تصدير مستند التأمين بصيغة PDF...");
      const pdfBlob = await generateGuaranteePdfBlob(type);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `خطاب_سداد_التأمين_النهائي_${type}_${op.serialNumber || "365"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تحميل مستند PDF بنجاح!");
    } catch (err: any) {
      console.error("PDF export failed:", err);
      toast.error("فشل تصدير ملف PDF: " + (err?.message || ""));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSaveToSystem = async () => {
    const snapToSave = currentSnapshot;
    setSavedSnapshot(snapToSave);
    setSavingState(true);
    toast.success("تم حفظ إعدادات وبيانات التأمين النهائي بنجاح! 💾✨");

    try {
      let existingNotes: any = {};
      if (op.notes && op.notes.startsWith("{")) existingNotes = JSON.parse(op.notes);
      else if (op.notes) existingNotes = { textNotes: op.notes };

      existingNotes.finalGuaranteeLetter = {
        ...(existingNotes.finalGuaranteeLetter || {}),
        ...JSON.parse(snapToSave),
        cloudUrls,
        printHistory,
      };
      existingNotes.operationScope = operationScope;
      existingNotes.fiscalYear = fiscalYear;

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(existingNotes),
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل الحفظ في السيرفر");
    } finally {
      setSavingState(false);
    }
  };

  // Step 2: Save Receipt / Guarantee Handler
  const handleSaveReceipt = async () => {
    if (!receiptNumber.trim()) {
      toast.error("يرجى إدخال رقم الإيصال أو خطاب الضمان");
      return;
    }
    if (!receiptAmount || isNaN(Number(receiptAmount))) {
      toast.error("يرجى إدخال قيمة التأمين بشكل صحيح");
      return;
    }
    setSavingReceipt(true);
    try {
      const methodLabel =
        receiptPaymentMethod === "CASH"
          ? "خزينة نقداً"
          : receiptPaymentMethod === "BANK_GUARANTEE"
          ? `خطاب ضمان بنكي (${bankName})`
          : receiptPaymentMethod === "DEDUCTION"
          ? "خصم من مستحقات عملية أخرى"
          : "تحويل ابتدائي لنهائي وسداد الفارق";

      await api.post(`/operations/${op.id}/guarantees`, {
        type: "FINAL",
        amount: Number(receiptAmount),
        percentage: 5,
        paymentMethod: methodLabel,
        receiptNumber,
        issueDate: receiptDate,
        validUntil: validUntilDate,
        bankName: receiptPaymentMethod === "BANK_GUARANTEE" ? bankName : undefined,
        notes: receiptNotes,
      });

      if (receiptFile) {
        try {
          const formData = new FormData();
          formData.append("file", receiptFile);
          formData.append("type", "GUARANTEE_RECEIPT");
          formData.append("fileName", `إيصال التأمين النهائي رقم ${receiptNumber} (${formatCurrency(Number(receiptAmount))})`);
          await api.post(`/operations/${op.id}/documents`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch {}
      }

      toast.success("تم تسجيل إيصال التأمين النهائي (5%) بنجاح! 🛡️✓");
      setAddingReceipt(false);
      setReceiptFile(null);
      setReceiptNumber("");
      onRefresh();
    } catch {
      toast.error("فشل حفظ إيصال التأمين النهائي");
    } finally {
      setSavingReceipt(false);
    }
  };

  const handleDeleteGuarantee = async (guarId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا السجل؟")) return;
    try {
      await api.delete(`/operations/${op.id}/guarantees/${guarId}`);
      toast.success("تم الحذف بنجاح");
      onRefresh();
    } catch {
      toast.error("فشل الحذف");
    }
  };

  // Filter Final Guarantees & Docs
  const finalGuarantees = useMemo(() => {
    return (op.guarantees || []).filter((g: any) => g.type === "FINAL");
  }, [op.guarantees]);

  const finalDocs = useMemo(() => {
    return (op.documents || []).filter(
      (d: any) =>
        d.type === "GUARANTEE_RECEIPT" ||
        d.fileName?.includes("نهائي") ||
        d.fileName?.includes("ضمان") ||
        d.fileName?.includes("سداد")
    );
  }, [op.documents]);

  return (
    <div className="space-y-6 animate-fade-in text-foreground">




      {/* ━━━ Summary Cards Strip ━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <span className="text-xs text-muted-foreground block mb-1">قيمة العقد / الترسية</span>
          <span className="text-lg font-black text-foreground block font-mono">{formatCurrency(totalAwardPrice)}</span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">{tafqeetArabic(totalAwardPrice)}</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <span className="text-xs text-muted-foreground block mb-1">قيمة التأمين النهائي (5%)</span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 block font-mono">{formatCurrency(calculated5Percent)}</span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">5% ملزمة قانونياً خلال 10 أيام</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <span className="text-xs text-muted-foreground block mb-1">التأمين الابتدائي المحجوز</span>
          <span className="text-lg font-black text-blue-600 dark:text-blue-400 block font-mono">{formatCurrency(initialGuarAmount)}</span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">متاح تحويله كجزء من النهائي</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <span className="text-xs text-muted-foreground block mb-1">الفارق الواجب سداده نقداً</span>
          <span className="text-lg font-black text-amber-600 dark:text-amber-400 block font-mono">
            {formatCurrency(Math.max(0, calculated5Percent - initialGuarAmount))}
          </span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">عند اختيار تحويل الابتدائي</span>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         STEP 1: اختيار وتخصيص قوالب خطابات سداد التأمين النهائي الـ 5
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <SectionCard
        title="الخطوة 1: اختيار وتوليد خطابات سداد التأمين النهائي المعتمدة (قوالب الوورد الرسمية)"
        icon={FileText}
        iconColor="text-emerald-600"
        badge={
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold">
            5 نماذج معتمدة رسمياً
          </Badge>
        }
      >
        <div className="space-y-5">
          {/* Five Letter Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {[
              {
                id: "CASH",
                label: "سداد نقدي / خزينة",
                desc: "سداد كامل الـ 5% نقداً بخزينة الجهة",
                icon: Receipt,
                color: "emerald",
              },
              {
                id: "DEDUCTION",
                label: "خصم من مستحقات",
                desc: "خصم من مستحقات عملية أخرى طرف الجهة",
                icon: Landmark,
                color: "amber",
              },
              {
                id: "DEDUCTION_AND_INITIAL",
                label: "خصم + تحويل ابتدائي",
                desc: "خصم مستحقات وتحويل الابتدائي لنهائي",
                icon: RefreshCw,
                color: "teal",
              },
              {
                id: "INITIAL_TRANSFER",
                label: "تحويل ابتدائي لنهائي",
                desc: "تحويل الابتدائي وسداد الفارق نقداً",
                icon: ArrowRight,
                color: "blue",
              },
              {
                id: "BANK_GUARANTEE",
                label: "خطاب ضمان بنكي",
                desc: "خطاب رسمي موجه للبنك لإصدار الضمان",
                icon: ShieldCheck,
                color: "indigo",
              },
            ].map((tmpl) => {
              const isSelected = activeLetterType === tmpl.id;
              const TIcon = tmpl.icon;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setActiveLetterType(tmpl.id as FinalGuaranteeLetterType)}
                  className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between h-32 relative ${
                    isSelected
                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/30 shadow-sm"
                      : "bg-card border-border hover:bg-muted/60 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <TIcon className={`h-5 w-5 ${isSelected ? "text-emerald-600" : "text-muted-foreground"}`} />
                    {cloudUrls[tmpl.id] && (
                      <Badge className="bg-emerald-600 text-white text-[9px] py-0 px-1">سحابي ✓</Badge>
                    )}
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs leading-tight mb-1">{tmpl.label}</h5>
                    <p className="text-[10px] text-muted-foreground leading-snug">{tmpl.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* بيانات الشركة والترويسة ورقم القيد الصادر الذكي وتاريخ الخطاب */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4.5 w-4.5 text-blue-600" />
                <h4 className="font-extrabold text-sm text-foreground">
                  بيانات الشركة والترويسة ورقم القيد الصادر الذكي
                </h4>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRegenerateRef}
                className="h-7 text-[11px] font-bold rounded-lg border-dashed hover:bg-muted"
              >
                <RefreshCw className="h-3.5 w-3.5 ml-1.5" />
                <span>تحديث رقم القيد</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">الشركة المشاركة بالعملية *</Label>
                <Select
                  value={selectedCompanyId}
                  onValueChange={(val) => {
                    setSelectedCompanyId(val || "");
                    const link = op.companies?.find((c: any) => (c.companyId || c.id) === val);
                    if (link?.company) {
                      setCompanyCommercialRegister(link.company.commercialRegister || "");
                      setCompanyTaxCard(link.company.taxCard || "");
                      setCompanyAddress(link.company.address || "");
                      setCompanyEmail(link.company.email || "");
                      if (link.company.phone) setPhoneWhatsapp(link.company.phone);
                      if (link.company.managerName) setBoardChairman(sanitizeChairmanTitle(link.company.managerName));
                    }
                    if (link?.displayCode) {
                      setCompanyOpCode(link.displayCode);
                      setRegistrationNumber(getUnifiedOperationRegistrationNumber(op, link.displayCode));
                    }
                  }}
                >
                  <SelectTrigger className="h-9.5 text-xs font-bold rounded-xl bg-background">
                    <SelectValue placeholder="اختر الشركة">
                      {currentCompanyLink?.company?.name
                        ? `${currentCompanyLink.company.name} (${currentCompanyLink.displayCode || "A"})`
                        : "اختر الشركة"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(op.companies || []).map((c: any) => {
                      const val = c.companyId || c.id;
                      return (
                        <SelectItem key={val} value={val} className="text-xs font-bold">
                          {c.company?.name || "الشركة"} ({c.displayCode})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">كود العملية بالشركة (الترويسة) *</Label>
                <Input
                  value={companyOpCode}
                  onChange={(e) => setCompanyOpCode(e.target.value)}
                  placeholder="( AZ-01 )"
                  className="h-9.5 text-xs font-bold font-mono text-blue-700 dark:text-blue-300 rounded-xl text-center bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">رقم القيد الصادر الذكي *</Label>
                <Input
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  className="h-9.5 text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 rounded-xl text-center bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">تاريخ الصادر (التذييل) *</Label>
                <Input
                  value={outgoingDate}
                  onChange={(e) => setOutgoingDate(e.target.value)}
                  placeholder="15/10/2026"
                  className="h-9.5 text-xs font-mono rounded-xl text-center font-bold bg-background"
                />
              </div>
            </div>

            {/* السجل التجاري والبطاقة الضريبية والهواتف */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">السجل التجاري (س . ت بالترويسة) *</Label>
                <Input
                  value={companyCommercialRegister}
                  onChange={(e) => setCompanyCommercialRegister(e.target.value)}
                  placeholder="110200700036620"
                  className="h-9.5 text-xs font-mono rounded-xl text-center font-bold bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">البطاقة الضريبية (ب . ض بالترويسة) *</Label>
                <Input
                  value={companyTaxCard}
                  onChange={(e) => setCompanyTaxCard(e.target.value)}
                  placeholder="658369652"
                  className="h-9.5 text-xs font-mono rounded-xl text-center font-bold bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">هاتف الواتساب (التذييل) *</Label>
                <Input
                  value={phoneWhatsapp}
                  onChange={(e) => setPhoneWhatsapp(e.target.value)}
                  placeholder="01091708818"
                  className="h-9.5 text-xs font-mono rounded-xl text-center font-bold bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">هاتف الموبايل (التذييل) *</Label>
                <Input
                  value={phoneMobile}
                  onChange={(e) => setPhoneMobile(e.target.value)}
                  placeholder="01557018818"
                  className="h-9.5 text-xs font-mono rounded-xl text-center font-bold bg-background"
                />
              </div>
            </div>
          </div>

          {/* Conditional Template Fields */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border space-y-4">
            <h4 className="font-extrabold text-sm text-foreground flex items-center gap-2 pb-2 border-b border-border">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span>تخصيص بيانات ومتغيرات خطاب: {activeLetterType}</span>
            </h4>

            {/* If Bank Guarantee */}
            {activeLetterType === "BANK_GUARANTEE" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-bold text-foreground">السيد الأستاذ / الموجه إليه بالبنك *</Label>
                    <Input
                      value={bankRecipientTitle}
                      onChange={(e) => setBankRecipientTitle(e.target.value)}
                      placeholder="مدير بنك مصر   فرع    دمنهور"
                      className="h-9.5 text-xs font-bold rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">الجهة المستفيدة من الضمان *</Label>
                    <Input
                      value={bankTargetAuthority}
                      onChange={(e) => setBankTargetAuthority(e.target.value)}
                      className="h-9.5 text-xs font-bold rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">عنوان جهة الإسناد *</Label>
                    <Input
                      value={bankTargetAddress}
                      onChange={(e) => setBankTargetAddress(e.target.value)}
                      className="h-9.5 text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">رقم الحساب المسجل طرفكم *</Label>
                    <Input
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      className="h-9.5 text-xs font-mono font-bold rounded-xl text-center"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">اسم البنك والفرع *</Label>
                    <Input
                      value={bankNameAndBranch}
                      onChange={(e) => setBankNameAndBranch(e.target.value)}
                      className="h-9.5 text-xs font-bold rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">اسم صاحب الحساب بالبنك *</Label>
                    <Input
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      className="h-9.5 text-xs font-bold rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">الرقم القومي لصاحب الحساب *</Label>
                    <Input
                      value={accountNationalId}
                      onChange={(e) => setAccountNationalId(e.target.value)}
                      className="h-9.5 text-xs font-mono font-bold rounded-xl text-center"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">مدة الارتباط بالتأمين *</Label>
                    <Input
                      value={guaranteeDurationText}
                      onChange={(e) => setGuaranteeDurationText(e.target.value)}
                      placeholder="سنة واحدة / ستة أشهر"
                      className="h-9.5 text-xs font-bold rounded-xl text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">تبدأ من تاريخ *</Label>
                    <Input
                      value={guaranteeStartDate}
                      onChange={(e) => setGuaranteeStartDate(e.target.value)}
                      className="h-9.5 text-xs font-mono rounded-xl text-center"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">وتنتهي في تاريخ *</Label>
                    <Input
                      value={guaranteeEndDate}
                      onChange={(e) => setGuaranteeEndDate(e.target.value)}
                      className="h-9.5 text-xs font-mono rounded-xl text-center"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* If Authority Letters (Cash, Deduction, Transfer) */
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

                {/* Deduction Fields */}
                {(activeLetterType === "DEDUCTION" || activeLetterType === "DEDUCTION_AND_INITIAL") && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                    <Label className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                      بيانات العملية الأخرى المخصوم منها مستحقات الشركة:
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <span className="text-[11px] text-muted-foreground block">اسم العملية لديكم</span>
                        <Input
                          value={deductionOperationName}
                          onChange={(e) => setDeductionOperationName(e.target.value)}
                          placeholder="اسم العملية الأخرى"
                          className="h-9 text-xs rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-muted-foreground block">عن شهر</span>
                        <Input
                          value={deductionMonth}
                          onChange={(e) => setDeductionMonth(e.target.value)}
                          placeholder="مثلاً: أكتوبر"
                          className="h-9 text-xs rounded-xl text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-muted-foreground block">سنة</span>
                        <Input
                          value={deductionYear}
                          onChange={(e) => setDeductionYear(e.target.value)}
                          placeholder="2026"
                          className="h-9 text-xs rounded-xl text-center font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Transfer Initial to Final Fields */}
                {(activeLetterType === "INITIAL_TRANSFER" || activeLetterType === "DEDUCTION_AND_INITIAL") && (
                  <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-2">
                    <Label className="text-xs font-bold text-blue-900 dark:text-blue-200 block">
                      مبلغ التأمين الابتدائي المحول إلى تأمين نهائي:
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        value={initialGuaranteeFieldAmount}
                        onChange={(e) => setInitialGuaranteeFieldAmount(e.target.value)}
                        className="h-9 text-xs font-mono font-bold rounded-xl w-48 text-center"
                      />
                      <span className="text-xs text-muted-foreground">
                        {tafqeetArabic(Number(initialGuaranteeFieldAmount))}
                      </span>
                    </div>
                  </div>
                )}

                {/* Amounts Configuration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground">مبلغ السداد المطلوب بالخطاب (ج.م) *</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{tafqeetArabic(Number(amountPaid))}</span>
                    </div>
                    <Input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="h-9.5 text-xs font-mono font-bold rounded-xl text-center"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground">قيمة الترسية الإجمالية 100% *</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{tafqeetArabic(Number(totalAwardAmount))}</span>
                    </div>
                    <Input
                      type="number"
                      value={totalAwardAmount}
                      onChange={(e) => setTotalAwardAmount(e.target.value)}
                      className="h-9.5 text-xs font-mono font-bold rounded-xl text-center"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Signatures & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-border">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">اسم المندوب / المختص</Label>
                <Input
                  value={specialistName}
                  onChange={(e) => setSpecialistName(e.target.value)}
                  className="h-9.5 text-xs font-bold rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">المدير المالي (توقيع صورة أو اسم)</Label>
                <Input
                  value={financeManagerName}
                  onChange={(e) => setFinanceManagerName(e.target.value)}
                  className="h-9.5 text-xs font-bold rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  رئيس مجلس الإدارة (الاعتماد النهائي)
                </Label>
                <Input
                  value={boardChairman}
                  onChange={(e) => setBoardChairman(e.target.value)}
                  className="h-9.5 text-xs font-bold rounded-xl border-emerald-500/30 focus-visible:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         STEP 2: تسجيل بيانات وإيصالات سداد التأمين النهائي
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <SectionCard
        title="الخطوة 2: تسجيل بيانات وإيصالات سداد التأمين النهائي في النظام"
        icon={Receipt}
        iconColor="text-blue-600"
        badge={
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs font-bold">
            {finalGuarantees.length} إيصال مسجل
          </Badge>
        }
        actions={
          <Button
            size="sm"
            onClick={() => setAddingReceipt(!addingReceipt)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8.5 px-3.5 rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>{addingReceipt ? "إلغاء النموذج" : "تسجيل إيصال سداد جديد"}</span>
          </Button>
        }
      >
        {addingReceipt ? (
          <div className="p-5 rounded-2xl bg-card border-2 border-blue-500/30 space-y-4 animate-fade-in shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4 text-blue-600" />
                <span>تسجيل إيصال أو خطاب ضمان التأمين النهائي (5%)</span>
              </h4>
              <Badge variant="outline" className="text-[10px] font-mono">سجل رسمي</Badge>
            </div>

            {/* بطاقة طريقة السداد التلقائية المبنية على الخطوة 1 والمدد القانونية */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-indigo-500/10 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 text-white font-bold text-xs px-3 py-1 rounded-lg">
                    مبنية على الخطوة 1 تلقائياً
                  </Badge>
                  <span className="text-xs font-bold text-foreground">
                    طريقة السداد المعتمدة:
                  </span>
                  <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                    {activeLetterType === "CASH" && "💵 سداد نقدي بخزينة الجهة الإدارية"}
                    {activeLetterType === "BANK_GUARANTEE" && "🏦 خطاب ضمان بنكي نهائي معتمد (5%)"}
                    {activeLetterType === "DEDUCTION" && "📋 خصم من مستحقات عملية أخرى مستحقة"}
                    {activeLetterType === "INITIAL_TRANSFER" && "🔄 تحويل التأمين الابتدائي لنهائي وسداد الفارق"}
                    {activeLetterType === "DEDUCTION_AND_INITIAL" && "📑 خصم من مستحقات + تحويل التأمين الابتدائي"}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">
                  لتغيير الطريقة، قم باختيار النموذج المطلوب من الخطوة 1 أعلاه ☝️
                </span>
              </div>

              {/* بطاقة المدد القانونية للتأمين النهائي (القانون 182 لسنة 2018) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-500/20">
                <div className="p-3 rounded-xl bg-background/80 border border-border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      <span>مهلة سداد التأمين النهائي القانونية</span>
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                      10 أيام عمل
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    طبقاً للمادة (37) من القانون 182 لسنة 2018: يتم السداد خلال 10 أيام عمل من اليوم التالي لإخطار الترسية.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-background/80 border border-border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                      <span>مدة سريان التأمين النهائي</span>
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                      حتى الاستلام النهائي
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    يظل ساري المفعول طوال مدة تنفيذ العملية وحتى انتهاء فترة الضمان وصدور محضر الاستلام النهائي المعتمد.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  {receiptPaymentMethod === "BANK_GUARANTEE"
                    ? "رقم خطاب الضمان البنكي المعتمد *"
                    : receiptPaymentMethod === "DEDUCTION"
                    ? "رقم إفادة الخصم المعتمدة *"
                    : "رقم إيصال السداد / التوريد بخزينة الجهة *"}
                </Label>
                <Input
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder={receiptPaymentMethod === "BANK_GUARANTEE" ? "مثال: LG-2026-99" : "مثال: REC-54910"}
                  className="h-10 text-xs font-mono font-bold rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">مبلغ التأمين النهائي (ج.م) *</Label>
                <Input
                  type="number"
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(e.target.value)}
                  className="h-10 text-xs font-mono font-bold rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">تاريخ السداد / الإصدار *</Label>
                <Input
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            {receiptPaymentMethod === "BANK_GUARANTEE" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">اسم البنك المصدر للضمان *</Label>
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="مثال: بنك مصر - فرع دمنهور الإسلامي"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">تاريخ انتهاء سريان خطاب الضمان (الاستلام النهائي) *</Label>
                  <Input
                    type="date"
                    value={validUntilDate}
                    onChange={(e) => setValidUntilDate(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>
            )}

            {(receiptPaymentMethod === "DEDUCTION" || activeLetterType === "DEDUCTION_AND_INITIAL") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">اسم العملية المخصوم من مستحقاتها *</Label>
                  <Input
                    value={deductionOperationName}
                    onChange={(e) => setDeductionOperationName(e.target.value)}
                    placeholder="مثال: عملية توريد أجهزة مستشفى كفر الدوار"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">المستحقات عن شهر / سنة *</Label>
                  <Input
                    value={`${deductionMonth} / ${deductionYear}`}
                    readOnly
                    className="h-10 text-xs rounded-xl bg-muted/40 font-bold"
                  />
                </div>
              </div>
            )}

            {/* Custom Styled Upload Zone */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-blue-600" />
                <span>مرفق صورة أو PDF لإيصال السداد أو خطاب الضمان البنكي</span>
              </Label>
              <div className="p-4 rounded-2xl border-2 border-dashed border-border hover:border-blue-500 bg-muted/20 text-center space-y-2 transition-all">
                <input
                  type="file"
                  id="final-guar-file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.docx"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                />
                <label
                  htmlFor="final-guar-file"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shadow-sm transition-all"
                >
                  <Paperclip className="h-4 w-4" />
                  <span>{receiptFile ? receiptFile.name : "اختر ملف إيصال التأمين أو خطاب الضمان"}</span>
                </label>
                {receiptFile && (
                  <p className="text-xs text-emerald-600 font-bold block mt-1">
                    الملف المحدد: {receiptFile.name} ({Math.round(receiptFile.size / 1024)} KB)
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">ملاحظات إضافية</Label>
              <Textarea
                rows={2}
                value={receiptNotes}
                onChange={(e) => setReceiptNotes(e.target.value)}
                placeholder="أي ملاحظات تخص شروط الاسترداد أو رقم التوريد..."
                className="text-xs rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button size="sm" variant="outline" onClick={() => setAddingReceipt(false)} className="rounded-xl text-xs">
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={handleSaveReceipt}
                disabled={savingReceipt}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 rounded-xl shadow-xs"
              >
                {savingReceipt ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Check className="h-4 w-4 ml-1" />}
                <span>حفظ إيصال التأمين النهائي</span>
              </Button>
            </div>
          </div>
        ) : null}

        {/* Existing Guarantees List */}
        {finalGuarantees.length > 0 ? (
          <div className="space-y-3">
            {finalGuarantees.map((g: any) => (
              <div
                key={g.id}
                className="p-4 sm:p-5 rounded-2xl bg-card border border-emerald-500/30 bg-emerald-500/5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-foreground text-sm font-mono">
                        {g.receiptNumber || g.letterNumber ? `رقم الإيصال: ${g.receiptNumber || g.letterNumber}` : "إيصال تأمين نهائي"}
                      </h4>
                      <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                        {g.paymentMethod || "سداد معتمد"}
                      </Badge>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                        {formatCurrency(Number(g.amount))}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      تاريخ السداد: {formatDate(g.issueDate || g.createdAt)} {g.validUntil ? `• ساري حتى: ${formatDate(g.validUntil)}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteGuarantee(g.id)}
                    className="h-8.5 w-8.5 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
                    title="حذف هذا السجل"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : !addingReceipt && (
          <EmptyState
            icon={ShieldCheck}
            text="لم يتم تسجيل إيصال سداد التأمين النهائي بعد"
            subtext="سجّل إيصال التوريد النقدي بالخزينة أو خطاب الضمان البنكي لتثبيت سداد الـ 5% في النظام"
          />
        )}
      </SectionCard>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         STEP 3: أرشيف مستندات وخطابات التأمين النهائي
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {finalDocs.length > 0 && (
        <SectionCard
          title="الخطوة 3: أرشيف مستندات وإيصالات التأمين النهائي المرفوعة"
          icon={FolderOpen}
          iconColor="text-indigo-600"
          badge={
            <Badge variant="outline" className="text-xs font-mono">
              {finalDocs.length} مستند مؤرشف
            </Badge>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {finalDocs.map((doc: any) => (
              <div
                key={doc.id}
                className="p-3.5 rounded-2xl bg-card border border-border flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div className="truncate">
                    <p className="font-bold text-foreground truncate">{doc.fileName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDocFileSize(doc.fileSize)} • {formatDate(doc.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {onPreviewDoc && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onPreviewDoc(doc)}
                      className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                      title="معاينة الملف"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onDownloadDoc && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDownloadDoc(doc)}
                      className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                      title="تحميل الملف"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ━━━ Authentic Word Preview Modal ━━━ */}
      {previewModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl h-[94vh] max-h-[94vh] flex flex-col overflow-hidden text-foreground">
              <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-foreground text-base">
                        معاينة قالب الوورد المعتمد: خطاب سداد التأمين النهائي.docx
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
                    documentTitle={`تأمين_نهائي_${activeLetterType}_${op.externalNumber || op.serialNumber}_${registrationNumber}.docx`}
                    docxBlob={previewDocxBlob}
                    pdfBlob={previewPdfBlob}
                    onDownloadDocx={() => handleDownloadDocx(activeLetterType)}
                    onDownloadPdf={() => handleDownloadPdf(activeLetterType)}
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
        cloudPdfUrl={currentCloudUrl}
        registrationNumber={registrationNumber}
        opId={op.id}
        docType={`final_guarantee_${activeLetterType}`}
        uploadingCloud={uploadingCloud}
        onUploadToCloud={(force) => handleUploadToCloud(activeLetterType, force)}
        title="الباركود الذكي ورمز QR الرقمي المعتمد (PDF)"
        subtitle="عند مسح الباركود بكاميرا الموبايل يتم فتح النسخة الرقمية المعتمدة لخطاب التأمين النهائي فوراً بدون الحاجة لأي تسجيل دخول."
        badgeText="مدمج بموضع كلمة (الباركود) بالأعلى ورقم القيد بالتذييل"
        gradientClass="from-emerald-500/10 via-teal-500/10 to-transparent border-emerald-500/25"
        isModifiedAfterUpload={isDirty}
      />

      {/* ━━━ BOTTOM ACTION BAR: التوليد والطباعة والمعاينة بأسفل مرحلة التأمين النهائي ━━━ */}
      <LetterBottomActionWidget
        title={
          activeLetterType === "CASH"
            ? "خطاب سداد التأمين النهائي نقداً بالخزينة"
            : activeLetterType === "BANK_GUARANTEE"
            ? "خطاب إصدار خطاب ضمان بنكي للتأمين النهائي"
            : activeLetterType === "DEDUCTION"
            ? "خطاب خصم التأمين النهائي من مستحقات عملية أخرى"
            : activeLetterType === "INITIAL_TRANSFER"
            ? "خطاب تحويل التأمين الابتدائي إلى نهائي"
            : "خطاب خصم التأمين النهائي وتحويل التأمين الابتدائي"
        }
        registrationNumber={registrationNumber}
        isDirty={isDirty}
        printInfo={printHistory[activeLetterType]}
        onPreview={() => loadOfficialPreview(activeLetterType)}
        onPreviewPdfDirect={handleOpenDirectPdfPreview}
        onSave={handleSaveToSystem}
        onCancelEdits={handleCancelEdits}
        saving={savingState}
        onViewArchive={handleViewArchive}
        icon={ShieldCheck}
        iconColor="text-emerald-700 dark:text-emerald-400"
        iconBg="bg-emerald-500/15 border-emerald-500/30"
        customSubtitle="وفقاً للمادة (37) من القانون 182 لسنة 2018 وقوالب الوورد الرسمية. اضغط على زر المعاينة للاطلاع على المستند وتنزيله أو طباعته."
      />

      {/* ━━━ نافذة التنبيه عند إعادة طباعة مستند مطبوع مسبقاً ━━━ */}
      <ReprintConfirmModal
        open={reprintWarningOpen}
        onClose={() => setReprintWarningOpen(false)}
        printInfo={printHistory[activeLetterType]}
        onConfirmReprint={handleConfirmReprint}
        onViewArchive={() => {
          setReprintWarningOpen(false);
          handleViewArchive();
        }}
      />

      {/* ━━━ نافذة التحميل العائمة المبتكرة عند تنزيل PDF ━━━ */}
      <PdfExportLoadingModal open={downloadingPdf} />

      {/* ━━━ Footer Navigation ━━━ */}
      <StepFooterNav
        currentTabId="guarantee_final"
        onNavigate={onNavigate}
        nextLabel="الانتقال إلى: #15 التوريد والاستلام والفحص ➔"
        prevLabel="← أمر التوريد والتعاقد الرسمي"
      />
    </div>
  );
}
