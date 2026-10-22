"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  BookOpen, ShieldCheck, Upload, FileText, Check, AlertCircle,
  Download, Eye, Printer, X, Loader2, Calendar, Building2,
  UserCheck, Shield, HelpCircle, CheckCircle2, Sparkles,
  RefreshCw, Cloud, Save, RotateCcw, Landmark, CreditCard,
  ChevronRight, CheckCircle, FileCheck, Lock, QrCode, Copy,
  ExternalLink, Paperclip, ArrowRight, Trash2
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
import {
  Operation, SectionCard, formatCurrency, formatDate,
  formatDocFileSize, tafqeetArabic
} from "./types";
import { StepFooterNav } from "./StepFooterNav";
import {
  generateSmartOutgoingRef, cleanAllDocxXml, buildQrAnchorXml, injectSingleQrIntoDocXml,
  LetterBottomActionWidget, ReprintConfirmModal, getCurrentUserName, FISCAL_YEAR_OPTIONS,
  LetterQrCloudCard, PdfExportLoadingModal, PrintHistoryEntry,
  getUnifiedOperationRegistrationNumber, regenerateUnifiedRegistrationNumber,
  FiscalYearSelect, OperationDocArchiveCard,
  getSharedOperationScope, replaceDocxScope, replaceDocxFiscalAndDate,
  replaceDocxChairman, sanitizeChairmanTitle,
  getOperationRecipientTitle, getOperationFiscalYear, getOperationTechnicalOpeningDate, getOperationTenderMethod,
  isValidCloudDocUrl
} from "./letter-utils";
import JSZip from "jszip";
import QRCode from "qrcode";
import { getPdfBlobFromDocx, uploadPdfToFreeCloud, getExpectedCloudPdfUrl } from "./client-pdf";
import { OnlyOfficeDocViewer } from "@/components/OnlyOfficeDocViewer";

export type BookletLetterType =
  | "booklet_withdrawal"
  | "insurance_payment"
  | "booklet_and_insurance"
  | "bank_guarantee_letter";

export interface BookletLetterTemplateDef {
  id: BookletLetterType;
  title: string;
  shortName: string;
  templateFile: string;
  arabicFileName: string;
  desc: string;
  badge: string;
  color: string;
}

export const BOOKLET_LETTER_TEMPLATES: BookletLetterTemplateDef[] = [
  {
    id: "booklet_withdrawal",
    title: "خطاب سحب كراسة الشروط والمواصفات",
    shortName: "سحب كراسة",
    templateFile: "booklet_withdrawal_template.docx",
    arabicFileName: "سحب كراسة سيستم جولدن.docx",
    desc: "طلب رسمي موجه لجهة الإسناد لسحب كراسة الشروط والمواصفات وتفويض المندوب رسمياً بكافة الصلاحيات",
    badge: "كراسة الشروط",
    color: "cyan",
  },
  {
    id: "insurance_payment",
    title: "خطاب سداد التأمين الابتدائي القانوني",
    shortName: "سداد تأمين ابتدائي",
    templateFile: "insurance_payment_template.docx",
    arabicFileName: "خطاب سداد التامين الابتدائى سيستم جولدن.docx",
    desc: "طلب رسمي موجه للجهة لسداد وتقديم التأمين الابتدائي وتفويض المندوب بالسداد واستلام الإيصال",
    badge: "تأمين ابتدائي",
    color: "emerald",
  },
  {
    id: "booklet_and_insurance",
    title: "خطاب سحب الكراسة وسداد التأمين معاً",
    shortName: "سحب وتأمين (مجمع)",
    templateFile: "booklet_and_insurance_template.docx",
    arabicFileName: "سحب كراسة وسداد التامين الابتدائى سيستم جولدن - Copy.docx",
    desc: "طلب مجمع رسمي لسحب كراسة الشروط والمواصفات وسداد التأمين الابتدائي وتفويض المندوب في إجراء واحد",
    badge: "كراسة + تأمين",
    color: "blue",
  },
  {
    id: "bank_guarantee_letter",
    title: "خطاب موجه للبنك لإصدار خطاب ضمان بنكي",
    shortName: "ضمان بنكي للبنك",
    templateFile: "bank_guarantee_letter_template.docx",
    arabicFileName: "خطاب ضمان بنكى موجه للبنك سداد التامين الإبتدائي سيستم جولدن.docx",
    desc: "خطاب رسمي موجه لمدير البنك لإصدار خطاب ضمان بنكي ابتدائي لصالح جهة الإسناد مع كافة بيانات الحساب والعملية",
    badge: "خطاب ضمان للبنك",
    color: "purple",
  },
];

const CURRENT_FILE_ARABIC_NAME: Record<BookletLetterType, string> = {
  booklet_withdrawal: "سحب كراسة سيستم جولدن.docx",
  insurance_payment: "خطاب سداد التامين الابتدائى سيستم جولدن.docx",
  booklet_and_insurance: "سحب كراسة وسداد التامين الابتدائى سيستم جولدن - Copy.docx",
  bank_guarantee_letter: "خطاب ضمان بنكى موجه للبنك سداد التامين الإبتدائي سيستم جولدن.docx",
};

function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function TabBooklet({
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
  // تتبع الخطوة الحالية: 1 (الخطابات الرسمية المعتمدة)، 2 (الإيصالات وقفل الكود)، 3 (الكراسة وأرشيف الصور)
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // ━━━ قراءة البيانات المحفوظة مسبقاً ━━━
  const savedData = useMemo(() => {
    try {
      if (op.notes && op.notes.startsWith("{")) {
        const parsed = JSON.parse(op.notes);
        return parsed.bookletLettersDocx || null;
      }
    } catch {}
    return null;
  }, [op.notes]);

  // نوع الخطاب النشط من القوالب الأربعة
  const [activeLetterType, setActiveLetterType] = useState<BookletLetterType>(() => {
    return savedData?.activeLetterType || "booklet_withdrawal";
  });

  // ━━━ 1. بيانات الشركة المصدرة والترويسة والتذييل ━━━
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => {
    return savedData?.selectedCompanyId || op.companies?.[0]?.companyId || op.companies?.[0]?.id || "";
  });

  const currentCompanyLink = useMemo(() => {
    return (
      (op.companies || []).find(
        (c: any) => c.companyId === selectedCompanyId || c.id === selectedCompanyId
      ) || op.companies?.[0]
    );
  }, [op.companies, selectedCompanyId]);

  const currentCompany = currentCompanyLink?.company;

  // رقم القيد الصادر الذكي الموحد للعملية
  const [registrationNumber, setRegistrationNumber] = useState<string>(() => {
    if (savedData?.registrationNumber) return savedData.registrationNumber;
    return getUnifiedOperationRegistrationNumber(op, currentCompanyLink?.displayCode);
  });

  // كود العملية بالشركة
  const [companyOpCode, setCompanyOpCode] = useState<string>(() => {
    return (
      savedData?.companyOpCode ||
      currentCompanyLink?.displayCode ||
      `AZ-0${op.serialNumber || 1}`
    );
  });

  const [companyCommercialRegister, setCompanyCommercialRegister] = useState<string>(() => {
    return savedData?.companyCommercialRegister || currentCompany?.commercialRegister || "110200700036620";
  });
  const [companyTaxCard, setCompanyTaxCard] = useState<string>(() => {
    return savedData?.companyTaxCard || currentCompany?.taxCard || "658369652";
  });
  const [phoneWhatsapp, setPhoneWhatsapp] = useState<string>(() => {
    return savedData?.phoneWhatsapp || currentCompany?.phone || "01091708818";
  });
  const [phoneMobile, setPhoneMobile] = useState<string>(() => {
    return savedData?.phoneMobile || "01557018818";
  });
  const [companyAddress, setCompanyAddress] = useState<string>(() => {
    return savedData?.companyAddress || currentCompany?.address || "بجوار مستشفى ليدى كير  -  بدمنهور -  البحيره";
  });
  const [companyEmail, setCompanyEmail] = useState<string>(() => {
    return savedData?.companyEmail || currentCompany?.email || "goldengolden8818@gmail.com";
  });
  const [outgoingDate, setOutgoingDate] = useState<string>(() => {
    return savedData?.outgoingDate || new Date().toLocaleDateString("en-GB");
  });

  // طريقة الطرح الافتراضية من العملية
  const defaultTenderMethod = useMemo(() => {
    const map: Record<string, string> = {
      TENDER: "المناقصة العامة",
      LIMITED_TENDER: "المناقصة المحدودة",
      PRACTICE: "الممارسة العامة",
      LIMITED_PRACTICE: "الممارسة المحدودة",
      AUCTION: "المزايدة العلنية",
      DIRECT_ORDER: "الاتفاق المباشر",
    };
    return map[op.tenderType] || "المناقصة المحدودة";
  }, [op.tenderType]);

  // سجل طباعة الخطابات وتتبع النسخ (استجابة للتسجيلين 4 و 5)
  const [printHistory, setPrintHistory] = useState<Record<string, PrintHistoryEntry>>(() => {
    return savedData?.printHistory || {};
  });
  const [reprintWarningOpen, setReprintWarningOpen] = useState(false);

  // ━━━ 2. جهة الإسناد وبيانات العملية الرسمية ━━━
  const [recipientPrefix, setRecipientPrefix] = useState<string>(() => {
    return savedData?.recipientPrefix || "الأستاذ";
  });
  const [recipientTitleAndAuthority, setRecipientTitleAndAuthority] = useState<string>(() => {
    return getOperationRecipientTitle(op, savedData?.recipientTitleAndAuthority);
  });

  const [operationRegisteredName, setOperationRegisteredName] = useState<string>(() => {
    return savedData?.operationRegisteredName || op.name || "";
  });
  const [operationNumber, setOperationNumber] = useState<string>(() => {
    return savedData?.operationNumber || op.externalNumber || (op.serialNumber ? String(op.serialNumber) : "") || "";
  });
  const [tenderMethod, setTenderMethod] = useState<string>(() => {
    return savedData?.tenderMethod || getOperationTenderMethod(op);
  });
  const [operationScope, setOperationScope] = useState<string>(() => {
    return getSharedOperationScope(op, savedData?.operationScope);
  });
  const [fiscalYear, setFiscalYear] = useState<string>(() => {
    return getOperationFiscalYear(op, savedData?.fiscalYear);
  });
  const [technicalOpeningDate, setTechnicalOpeningDate] = useState<string>(() => {
    return getOperationTechnicalOpeningDate(op, savedData?.technicalOpeningDate);
  });

  // مزامنة تلقائية للبيانات إذا تغيرت العملية الأصلية دون وجود تعديل يدوي مخصص محفوظ
  useEffect(() => {
    if (!savedData?.operationRegisteredName && op.name) {
      setOperationRegisteredName(op.name);
    }
    if (!savedData?.operationScope && (op.name || (op as any).description)) {
      setOperationScope(getSharedOperationScope(op));
    }
    if (!savedData?.operationNumber && (op.externalNumber || op.serialNumber)) {
      setOperationNumber(op.externalNumber || String(op.serialNumber));
    }
    if (!savedData?.recipientTitleAndAuthority && op.authority) {
      setRecipientTitleAndAuthority(`مدير الادارة العامة للمشتريات والمخازن بـ ${op.authority}`);
    }
    if (!savedData?.technicalOpeningDate) {
      const d = op.dates?.find((dt: any) => dt.type === "TECHNICAL_OPENING" || dt.title?.includes("فني"));
      if (d?.dateValue) setTechnicalOpeningDate(formatDate(d.dateValue));
      else if (d?.date) setTechnicalOpeningDate(formatDate(d.date));
    }
  }, [op.name, op.externalNumber, op.serialNumber, op.authority, op.dates, savedData]);

  // ━━━ 3. بيانات تفويض المندوب القانوني ━━━
  const [delegateName, setDelegateName] = useState<string>(() => {
    return savedData?.delegateName || "أحمد محمد أحمد";
  });
  const [delegateTitle, setDelegateTitle] = useState<string>(() => {
    return savedData?.delegateTitle || "مندوب التعاقدات المفوض";
  });
  const [delegateNationalId, setDelegateNationalId] = useState<string>(() => {
    return savedData?.delegateNationalId || "23056289523202";
  });
  const [delegatePowers, setDelegatePowers] = useState<string>(() => {
    return (
      savedData?.delegatePowers ||
      "والتوقيع على العقود واستلام الخطابات والمكاتبات الرسميه"
    );
  });

  // ━━━ 4. بيانات التأمين الابتدائي (للخطابات الخاصة بالتأمين أو المجمعة) ━━━
  const defaultInitialAmount = useMemo(() => {
    const initG = op.guarantees?.find((g: any) => g.type === "INITIAL");
    if (initG?.amount) return String(initG.amount);
    return savedData?.insuranceAmount || "10000";
  }, [op.guarantees, savedData?.insuranceAmount]);

  const [insuranceAmount, setInsuranceAmount] = useState<string>(() => {
    return defaultInitialAmount;
  });

  const [insuranceTafqeet, setInsuranceTafqeet] = useState<string>(() => {
    if (savedData?.insuranceTafqeet) return savedData.insuranceTafqeet;
    const clean = tafqeetArabic(Number(defaultInitialAmount || 10000))
      .replace(/^فقط\s*وقدره\s*:?\s*/i, "")
      .replace(/\s*لا\s*غير\s*$/i, "")
      .trim();
    return clean || "عشرة ألاف جنيه";
  });

  const handleInsuranceAmountChange = (val: string) => {
    setInsuranceAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const clean = tafqeetArabic(num)
        .replace(/^فقط\s*وقدره\s*:?\s*/i, "")
        .replace(/\s*لا\s*غير\s*$/i, "")
        .trim();
      setInsuranceTafqeet(clean);
    }
  };

  // ━━━ 5. بيانات خطاب الضمان البنكي الموجه للبنك (الخطاب الرابع) ━━━
  const [bankName, setBankName] = useState<string>(() => {
    return savedData?.bankName || "مصر";
  });
  const [bankBranch, setBankBranch] = useState<string>(() => {
    return savedData?.bankBranch || "دمنهور";
  });
  const [bankManagerTitle, setBankManagerTitle] = useState<string>(() => {
    return savedData?.bankManagerTitle || `مدير بنك ${savedData?.bankName || "مصر"} فرع ${savedData?.bankBranch || "دمنهور"}`;
  });
  const [bankGuaranteeType, setBankGuaranteeType] = useState<string>(() => {
    return savedData?.bankGuaranteeType || "ابتدائي";
  });
  const [authorityName, setAuthorityName] = useState<string>(() => {
    return savedData?.authorityName || op.authority || "مديرية الصحة بالبحيرة";
  });
  const [authorityAddress, setAuthorityAddress] = useState<string>(() => {
    return savedData?.authorityAddress || "البحيرة – دمنهور - خلف مستشفى الصدر";
  });
  const [bankGuaranteeAmount, setBankGuaranteeAmount] = useState<string>(() => {
    return savedData?.bankGuaranteeAmount || "37547";
  });
  const [bankGuaranteeTafqeet, setBankGuaranteeTafqeet] = useState<string>(() => {
    return savedData?.bankGuaranteeTafqeet || "سبعة وثلاثون ألفا وخمسمائة وسبعه وأربعون";
  });
  const [guaranteePercentage, setGuaranteePercentage] = useState<string>(() => {
    return savedData?.guaranteePercentage || "5 %";
  });
  const [operationTotalAmount, setOperationTotalAmount] = useState<string>(() => {
    return savedData?.operationTotalAmount || "47547";
  });
  const [operationTotalTafqeet, setOperationTotalTafqeet] = useState<string>(() => {
    return savedData?.operationTotalTafqeet || "سبعه وأربعون ألفا وخمسمائة وسبعه وأربعون";
  });
  const [guaranteeDurationText, setGuaranteeDurationText] = useState<string>(() => {
    return savedData?.guaranteeDurationText || "سنة";
  });
  const [guaranteeStartDate, setGuaranteeStartDate] = useState<string>(() => {
    return savedData?.guaranteeStartDate || "12/12/2027";
  });
  const [guaranteeEndDate, setGuaranteeEndDate] = useState<string>(() => {
    return savedData?.guaranteeEndDate || "12/12/2028";
  });

  const [bankAccountNumber, setBankAccountNumber] = useState<string>(() => {
    return savedData?.bankAccountNumber || "2670220000004113";
  });
  const [accountBankName, setAccountBankName] = useState<string>(() => {
    return savedData?.accountBankName || "مصر الاسلامى";
  });
  const [accountBankBranch, setAccountBankBranch] = useState<string>(() => {
    return savedData?.accountBankBranch || "دمنهور";
  });
  const [accountOwnerName, setAccountOwnerName] = useState<string>(() => {
    return savedData?.accountOwnerName || "ســـحر حسن محمد أحمد عبد السلام جولدن سرفيس";
  });
  const [accountOwnerNationalId, setAccountOwnerNationalId] = useState<string>(() => {
    return savedData?.accountOwnerNationalId || "28912111802623";
  });

  // ━━━ 6. التوقيعات والاعتمادات والملاحظات ━━━
  const [specialistTitle, setSpecialistTitle] = useState<string>(() => {
    return savedData?.specialistTitle || "المختص / المندوب :";
  });
  const [specialistName, setSpecialistName] = useState<string>(() => {
    return savedData?.specialistName || "أحمد محمد";
  });
  const [financeManagerName, setFinanceManagerName] = useState<string>(() => {
    return savedData?.financeManagerName || "محمود إبراهيم";
  });
  const [boardChairman, setBoardChairman] = useState<string>(() => {
    return sanitizeChairmanTitle(savedData?.boardChairman);
  });
  const [additionalNotes, setAdditionalNotes] = useState<string>(() => {
    return savedData?.additionalNotes || "";
  });

  // ━━━ 7. الروابط السحابية للنسخ الرقمية المعتمدة (Cloudflare R2 / Gofile.io) ━━━
  const [cloudUrls, setCloudUrls] = useState<{ [key in BookletLetterType]?: string }>(() => {
    const raw = savedData?.cloudUrls || {};
    const cleaned: { [key in BookletLetterType]?: string } = {};
    for (const [k, v] of Object.entries(raw)) {
      if (isValidCloudDocUrl(v as string)) {
        cleaned[k as BookletLetterType] = v as string;
      }
    }
    return cleaned;
  });
  const [uploadingCloud, setUploadingCloud] = useState<boolean>(false);
  const [lastGeneratedSnapshot, setLastGeneratedSnapshot] = useState<string | null>(null);

  // ━━━ 8. تتبع حالة التعديل والحفظ (isDirty control) ━━━
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
      delegateName,
      delegateTitle,
      delegateNationalId,
      delegatePowers,
      insuranceAmount,
      insuranceTafqeet,
      bankName,
      bankBranch,
      bankManagerTitle,
      bankGuaranteeType,
      authorityName,
      authorityAddress,
      bankGuaranteeAmount,
      bankGuaranteeTafqeet,
      guaranteePercentage,
      operationTotalAmount,
      operationTotalTafqeet,
      guaranteeDurationText,
      guaranteeStartDate,
      guaranteeEndDate,
      bankAccountNumber,
      accountBankName,
      accountBankBranch,
      accountOwnerName,
      accountOwnerNationalId,
      specialistTitle,
      specialistName,
      financeManagerName,
      boardChairman,
      additionalNotes,
    });
  }, [
    activeLetterType, selectedCompanyId, registrationNumber, companyOpCode,
    companyCommercialRegister, companyTaxCard, phoneWhatsapp, phoneMobile,
    companyAddress, companyEmail, outgoingDate, recipientPrefix,
    recipientTitleAndAuthority, operationRegisteredName, operationNumber,
    tenderMethod, operationScope, fiscalYear, technicalOpeningDate,
    delegateName, delegateTitle, delegateNationalId, delegatePowers,
    insuranceAmount, insuranceTafqeet, bankName, bankBranch, bankManagerTitle, bankGuaranteeType,
    authorityName, authorityAddress, bankGuaranteeAmount, bankGuaranteeTafqeet,
    guaranteePercentage, operationTotalAmount, operationTotalTafqeet,
    guaranteeDurationText, guaranteeStartDate, guaranteeEndDate,
    bankAccountNumber, accountBankName, accountBankBranch, accountOwnerName,
    accountOwnerNationalId, specialistTitle, specialistName, financeManagerName,
    boardChairman, additionalNotes,
  ]);

  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => currentSnapshot);
  const isDirty = useMemo(() => currentSnapshot !== savedSnapshot, [currentSnapshot, savedSnapshot]);
  const [savingChanges, setSavingChanges] = useState<boolean>(false);

  const handleSaveAll = async () => {
    // تحديث فوري مباشر (Optimistic UI) بدون أي تأخير
    const snapshotToSave = currentSnapshot;
    setSavedSnapshot(snapshotToSave);
    setSavingChanges(true);
    toast.success("تم حفظ بيانات خطابات الكراسة والتأمين بنجاح! 💾✨");

    try {
      let notesObj: any = {};
      try {
        if (op.notes && op.notes.startsWith("{")) {
          notesObj = JSON.parse(op.notes);
        }
      } catch {}

      notesObj.bookletLettersDocx = {
        ...(notesObj.bookletLettersDocx || {}),
        ...JSON.parse(snapshotToSave),
        cloudUrls,
        printHistory,
      };
      notesObj.operationScope = operationScope;
      notesObj.fiscalYear = fiscalYear;

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(notesObj),
      });
    } catch {
      toast.error("فشل حفظ التعديلات في السيرفر");
    } finally {
      setSavingChanges(false);
    }
  };

  const handleCancelEdits = () => {
    try {
      const snap = JSON.parse(savedSnapshot);
      setActiveLetterType(snap.activeLetterType);
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
      setDelegateName(snap.delegateName);
      setDelegateTitle(snap.delegateTitle);
      setDelegateNationalId(snap.delegateNationalId);
      setDelegatePowers(snap.delegatePowers);
      setInsuranceAmount(snap.insuranceAmount);
      setInsuranceTafqeet(snap.insuranceTafqeet);
      setBankName(snap.bankName);
      setBankBranch(snap.bankBranch);
      if (snap.bankManagerTitle) setBankManagerTitle(snap.bankManagerTitle);
      setBankGuaranteeType(snap.bankGuaranteeType);
      setAuthorityName(snap.authorityName);
      setAuthorityAddress(snap.authorityAddress);
      setBankGuaranteeAmount(snap.bankGuaranteeAmount);
      setBankGuaranteeTafqeet(snap.bankGuaranteeTafqeet);
      setGuaranteePercentage(snap.guaranteePercentage);
      setOperationTotalAmount(snap.operationTotalAmount);
      setOperationTotalTafqeet(snap.operationTotalTafqeet);
      setGuaranteeDurationText(snap.guaranteeDurationText);
      setGuaranteeStartDate(snap.guaranteeStartDate);
      setGuaranteeEndDate(snap.guaranteeEndDate);
      setBankAccountNumber(snap.bankAccountNumber);
      setAccountBankName(snap.accountBankName);
      setAccountBankBranch(snap.accountBankBranch);
      setAccountOwnerName(snap.accountOwnerName);
      setAccountOwnerNationalId(snap.accountOwnerNationalId);
      setSpecialistTitle(snap.specialistTitle);
      setSpecialistName(snap.specialistName);
      setFinanceManagerName(snap.financeManagerName);
      setBoardChairman(sanitizeChairmanTitle(snap.boardChairman));
      setAdditionalNotes(snap.additionalNotes);
      setCloudUrls(snap.cloudUrls || {});
      toast.info("تم التراجع عن التعديلات وإعادة الخطابات للحالة السابقة ↺");
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

  // ━━━ محرك استبدال المتغيرات وتوليد ملف Word (.docx) ━━━
  const generateBookletDocxBlob = async (type: BookletLetterType = activeLetterType): Promise<Blob> => {
    const tplDef = BOOKLET_LETTER_TEMPLATES.find((t) => t.id === type) || BOOKLET_LETTER_TEMPLATES[0];
    const response = await fetch(`/templates/${tplDef.templateFile}`);
    if (!response.ok) throw new Error(`فشل قراءة قالب الخطاب (${type}) من الخادم`);
    const templateBuffer = await response.arrayBuffer();

    const zip = await JSZip.loadAsync(templateBuffer);

    let qrDrawingXml = "";
    try {
      const activeCloud = cloudUrls[type];
      // يولد رمز QR بدقة فائقة فقط إذا تم رفع المستند مسبقاً على السحابة
      // وفي حالة عدم الرفع يعرض المستند بدون باركود تماماً
      if (isValidCloudDocUrl(activeCloud)) {
        const qrDataUrl = await QRCode.toDataURL(activeCloud!, {
          width: 600,
          margin: 2,
          errorCorrectionLevel: "M",
        });
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
      }
    } catch (e) {
      console.warn("QR generation failed:", e);
    }

    let docXml = await zip.file("word/document.xml")!.async("text");
    docXml = injectSingleQrIntoDocXml(docXml, qrDrawingXml, escapeXml(registrationNumber));

    // إعداد صيغة أسلوب الطرح بحرف الباء وبدون حرف الباء لضمان عدم حدوث أي تكرار
    const cleanMethod = (tenderMethod || "").trim();
    let methodWithBa = cleanMethod.startsWith("ب")
      ? cleanMethod
      : cleanMethod.startsWith("ال")
      ? `ب${cleanMethod}`
      : `بـ${cleanMethod}`;

    if (cleanMethod === "العامة") {
      methodWithBa = "بالمناقصة العامة";
    } else if (cleanMethod === "المحدودة") {
      methodWithBa = "بالمناقصة المحدودة";
    } else if (
      !cleanMethod.includes("مناقص") &&
      !cleanMethod.includes("ممارس") &&
      !cleanMethod.includes("مزايد") &&
      !cleanMethod.includes("إسناد") &&
      !cleanMethod.includes("طرح")
    ) {
      methodWithBa = `بالمناقصة ${cleanMethod}`;
    }

    if (type === "bank_guarantee_letter") {
      docXml = docXml.replace(/الأستاذ/g, escapeXml(recipientPrefix));
      docXml = docXml.replace(/مدير بنك[\s\S]*?(?:دمنهو[\s\S]*?ر|دمنهور)/g, escapeXml(bankManagerTitle));
      docXml = docXml.replace(/مصر /g, escapeXml(bankName) + " ");
      docXml = docXml.replace(/ دمنهو[\s\S]*?ر|دمنهور/g, `  ${escapeXml(bankBranch)}`);

      docXml = docXml.replace(/(ال)?نهائي/g, (_m, hasAl) => {
        const isInitial = bankGuaranteeType === "ابتدائي";
        if (hasAl) return escapeXml(isInitial ? "الابتدائي" : "النهائي");
        return escapeXml(isInitial ? "ابتدائي" : "نهائي");
      });

      docXml = docXml.replace(/اسم العملية المسجله[\s\.]*/g, escapeXml(operationRegisteredName) + " ");
      docXml = docXml.replace(/365/g, escapeXml(operationNumber));
      docXml = docXml.replace(/مديرية الصحة بالبحيرة/g, escapeXml(authorityName));
      docXml = docXml.replace(/البحيرة – دمنهور - خلف مستشفى الصدر/g, escapeXml(authorityAddress));

      docXml = docXml.replace(/37547/g, escapeXml(bankGuaranteeAmount));
      docXml = docXml.replace(/سبعة وثلاثون ألفا وخمسمائة وسبعه وأربعون/g, escapeXml(bankGuaranteeTafqeet));

      // استبدال أسلوب الطرح بمرور واحد يمنع تكرار الكلمة نهائياً
      docXml = docXml.replace(/(ب)?(?:المناقصة\s+ال[\s\S]*?محدود[\s\S]*?ة|المناقصة\s+المحدودة)/g, (_m, hasB) => {
        return hasB ? escapeXml(methodWithBa) : escapeXml(cleanMethod || "المناقصة العامة");
      });

      // نطاق وموضوع التوريد لزوم العملية ("لزوم كذا")
      docXml = replaceDocxScope(docXml, operationScope);

      // السنة المالية وموعد جلسة فتح المظروف
      docXml = replaceDocxFiscalAndDate(docXml, fiscalYear, technicalOpeningDate);

      docXml = docXml.replace(/5 %/g, escapeXml(guaranteePercentage));
      docXml = docXml.replace(/47547/g, escapeXml(operationTotalAmount));
      docXml = docXml.replace(/سبعه وأربعون ألفا وخمسمائة وسبعه وأربعون/g, escapeXml(operationTotalTafqeet));

      docXml = docXml.replace(/سنتين - سنة – ستة أشهر -أربعة أشهر – ثلاثة أشهر/g, escapeXml(guaranteeDurationText));
      docXml = docXml.replace(/12\/12\/2027/g, escapeXml(guaranteeStartDate));
      docXml = docXml.replace(/12\/12 \/2028/g, escapeXml(guaranteeEndDate));

      docXml = docXml.replace(/2670220000004113/g, escapeXml(bankAccountNumber));
      docXml = docXml.replace(/مصر الاسلامى/g, escapeXml(accountBankName));
      docXml = docXml.replace(/سـ*حر حسن محمد أحمد عبد السلام(?:\s+جولدن سرفيس)?/g, escapeXml(accountOwnerName));
      docXml = docXml.replace(/28912111802623/g, escapeXml(accountOwnerNationalId));
    } else {
      docXml = docXml.replace(/الأستاذ/g, escapeXml(recipientPrefix));
      docXml = docXml.replace(
        /مدير الادارة العامة للمشتريات والمخازن بجامعة دمنهور/g,
        escapeXml(recipientTitleAndAuthority)
      );

      docXml = docXml.replace(/اسم العملية المسجله[\s\.]*/g, escapeXml(operationRegisteredName) + " ");
      docXml = docXml.replace(/365/g, escapeXml(operationNumber));

      // استبدال أسلوب الطرح بمرور واحد يمنع تكرار الكلمة نهائياً
      docXml = docXml.replace(/(ب)?(?:المناقصة\s+ال[\s\S]*?محدود[\s\S]*?ة|المناقصة\s+المحدودة)/g, (_m, hasB) => {
        return hasB ? escapeXml(methodWithBa) : escapeXml(cleanMethod || "المناقصة العامة");
      });

      // نطاق وموضوع التوريد لزوم العملية ("لزوم كذا")
      docXml = replaceDocxScope(docXml, operationScope);

      // السنة المالية وموعد جلسة فتح المظروف
      docXml = replaceDocxFiscalAndDate(docXml, fiscalYear, technicalOpeningDate);

      docXml = docXml.replace(/أحمد محمد أحمد/g, escapeXml(delegateName));
      docXml = docXml.replace(/مندوب التعاقدات المفوض/g, escapeXml(delegateTitle));
      docXml = docXml.replace(/23056289523202/g, escapeXml(delegateNationalId));
      docXml = docXml.replace(/والتوقيع على العقود واستلام الخطابات والمكاتبات الرسميه/g, escapeXml(delegatePowers));

      if (type === "insurance_payment" || type === "booklet_and_insurance") {
        docXml = docXml.replace(/10000/g, escapeXml(insuranceAmount));
        docXml = docXml.replace(/عشرة ألاف(?:\s+جنيه)?/g, escapeXml(insuranceTafqeet));
      }

      docXml = docXml.replace(/أحمد محمد/g, escapeXml(specialistName));
      docXml = docXml.replace(/توقيع صورة/g, escapeXml(financeManagerName || " "));
      docXml = docXml.replace(/أو اسم/g, escapeXml(financeManagerName || " "));

      // اعتماد رئيس مجلس الإدارة (الاعتماد النهائي) مع الحفاظ التام على "يعتمد ،،،،،،" في سطرها المستقل
      docXml = replaceDocxChairman(docXml, boardChairman);

      if (additionalNotes.trim()) {
        docXml = docXml.replace(/خان[ةه] (?:خالي[ةه] للملاحظات|معلومات وملاحظات|ملاحظات)/g, escapeXml(additionalNotes));
      } else {
        docXml = docXml.replace(/خان[ةه] (?:خالي[ةه] للملاحظات|معلومات وملاحظات|ملاحظات)/g, "");
      }
    }

    docXml = docXml.replace(/<w:highlight\s+[^>]*\/>/g, "");
    docXml = docXml.replace(/<w:color\s+w:val=\"(red|FF0000)\"[^>]*\/>/g, "");

    zip.file("word/document.xml", docXml);

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
      ftrXml = ftrXml.replace(/01091708818/g, escapeXml(phoneWhatsapp));
      ftrXml = ftrXml.replace(/01557018818/g, escapeXml(phoneMobile));
      ftrXml = ftrXml.replace(/بجوار مستشفى ليدى كير\s*-\s*بدمنهور\s*-\s*البح\s*يره/g, escapeXml(companyAddress));
      ftrXml = ftrXml.replace(/بجوار مستشفى ليدى كير\s*-\s*بدمنهور\s*-\s*البحيره/g, escapeXml(companyAddress));
      ftrXml = ftrXml.replace(/goldengolden8818@gmail.com/g, escapeXml(companyEmail));
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
  const generateBookletPdfBlob = async (type: BookletLetterType = activeLetterType): Promise<Blob> => {
    const docxBlob = await generateBookletDocxBlob(type);
    setPreviewDocxBlob(docxBlob);
    const pdf = await getPdfBlobFromDocx(docxBlob, `booklet_letter_${type}_${registrationNumber}.docx`);
    setPreviewPdfBlob(pdf);
    setLastGeneratedSnapshot(currentSnapshot);
    return pdf;
  };

  // ━━━ رفع وتوثيق النسخة الرقمية سحابياً (Catbox.moe / Gofile.io) ━━━
  const handleUploadToCloud = async (type: BookletLetterType = activeLetterType, forceReupload = false) => {
    const existingUrl = cloudUrls[type];
    if (existingUrl && !existingUrl.includes("tmpfiles") && !existingUrl.includes("tmpfile") && !existingUrl.includes("catbox") && !forceReupload) {
      toast.info("تم رفع وتوثيق هذا الخطاب سحابياً مسبقاً وهو نشط بالفعل ✓");
      return;
    }

    setUploadingCloud(true);
    try {
      toast.info("جاري تحويل الخطاب لـ PDF ورفعه سحابياً...");
      let pdfBlob: Blob;
      if (previewPdfBlob && lastGeneratedSnapshot === currentSnapshot) {
        pdfBlob = previewPdfBlob;
      } else {
        pdfBlob = await generateBookletPdfBlob(type);
      }

      const fileName = `official_letter_${type}_${registrationNumber}.pdf`;
      const cloudRes = await uploadPdfToFreeCloud(pdfBlob, fileName);

      const publicUrl = cloudRes.url;
      if (!publicUrl) throw new Error("لم يتم استلام رابط التحميل السحابي");

      const newUrls = { ...cloudUrls, [type]: publicUrl };
      setCloudUrls(newUrls);

      let notesObj: any = {};
      try {
        if (op.notes && op.notes.startsWith("{")) {
          notesObj = JSON.parse(op.notes);
        }
      } catch {}
      notesObj.bookletLettersDocx = {
        ...(notesObj.bookletLettersDocx || JSON.parse(currentSnapshot)),
        cloudUrls: newUrls,
      };

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(notesObj),
      });

      toast.success(`تم رفع وتوثيق الخطاب سحابياً عبر (${cloudRes.provider}) بنجاح! 🚀`);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || "فشل الرفع السحابي");
    } finally {
      setUploadingCloud(false);
    }
  };

  // ━━━ تنزيل ملف الوورد المخصص (.docx) ━━━
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const handleDownloadDocx = async (type: BookletLetterType = activeLetterType) => {
    setDownloadingDocx(true);
    try {
      let blob = previewDocxBlob;
      if (!blob || lastGeneratedSnapshot !== currentSnapshot) {
        blob = await generateBookletDocxBlob(type);
        setPreviewDocxBlob(blob);
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const tplDef = BOOKLET_LETTER_TEMPLATES.find((t) => t.id === type);
      a.download = `${tplDef?.shortName || "خطاب"}_${op.externalNumber || op.serialNumber}_${registrationNumber}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم توليد وتحميل ملف الوورد الرسمي بنجاح! 📄✨");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "فشل توليد ملف الوورد");
    } finally {
      setDownloadingDocx(false);
    }
  };

  // ━━━ تحميل وتصدير PDF عبر محرك Word الرسمي ━━━
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const handleDownloadPdf = async (type: BookletLetterType = activeLetterType) => {
    // 0ms instant download if already generated in preview and no inputs changed
    if (previewPdfBlob && lastGeneratedSnapshot === currentSnapshot) {
      const url = URL.createObjectURL(previewPdfBlob);
      const a = document.createElement("a");
      a.href = url;
      const tplDef = BOOKLET_LETTER_TEMPLATES.find((t) => t.id === type);
      a.download = `${tplDef?.shortName || "خطاب"}_${op.externalNumber || op.serialNumber}_${registrationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل ملف الـ PDF الرسمي فوراً! 📑✨");
      return;
    }

    setDownloadingPdf(true);
    try {
      toast.info("جاري تحويل مستند الوورد الأصلي إلى PDF بأعلى دقة رسمية...");
      const pdfBlob = await generateBookletPdfBlob(type);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      const tplDef = BOOKLET_LETTER_TEMPLATES.find((t) => t.id === type);
      a.download = `${tplDef?.shortName || "خطاب"}_${op.externalNumber || op.serialNumber}_${registrationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تحويل وتنزيل ملف الـ PDF الرسمي بنجاح مطابقاً للوورد 100%! 📑✨");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "فشل تحويل الملف إلى PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // ━━━ المعاينة الحية المطابقة لمحرك Microsoft Word ━━━
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDocxBlob, setPreviewDocxBlob] = useState<Blob | null>(null);
  const [previewPdfBlob, setPreviewPdfBlob] = useState<Blob | null>(null);
  const [renderingDocx, setRenderingDocx] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [printingDocx, setPrintingDocx] = useState(false);

  const loadOfficialPreview = async (forceRefresh = false) => {
    if (!forceRefresh && previewPdfBlob && lastGeneratedSnapshot === currentSnapshot) {
      return;
    }
    setRenderingDocx(true);
    if (forceRefresh) {
      toast.info("جاري تحديث المعاينة الرسمية...");
    }
    try {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
        setPreviewPdfUrl(null);
      }
      const docx = await generateBookletDocxBlob(activeLetterType);
      setPreviewDocxBlob(docx);

      const pdf = await generateBookletPdfBlob(activeLetterType);
      setPreviewPdfBlob(pdf);
      setLastGeneratedSnapshot(currentSnapshot);
      if (forceRefresh) {
        toast.success("تم تحديث المعاينة بنجاح ✓");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("فشل تجهيز معاينة المستند: " + (err?.message || ""));
    } finally {
      setRenderingDocx(false);
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
  }, [previewModalOpen, activeLetterType]);

  // ━━━ تنفيذ الطباعة المباشرة وحفظ السجل الرسمي (استجابة للتسجيلين 4 و 5) ━━━
  const executePrintDoc = async () => {
    setPrintingDocx(true);
    try {
      // إعادة استخدام ملف الـ PDF المعروض للمعاينة فوراً بدون إعادة تحويل
      const pdfBlob = previewPdfBlob || (await generateBookletPdfBlob(activeLetterType));
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

      // تحديث سجل الطباعة وحفظه تلقائياً
      const currentUser = getCurrentUserName();
      const prev = printHistory[activeLetterType] || { printCount: 0 };
      const newHistoryItem = {
        printedAt: new Date().toISOString(),
        printedBy: currentUser,
        registrationNumber: registrationNumber,
      };
      const updatedHistory = {
        ...printHistory,
        [activeLetterType]: {
          printCount: (prev.printCount || 0) + 1,
          firstPrintedAt: prev.firstPrintedAt || new Date().toISOString(),
          lastPrintedAt: new Date().toISOString(),
          printedBy: currentUser,
          registrationNumber: prev.registrationNumber || registrationNumber,
          items: [...(prev.items || []), newHistoryItem],
        },
      };
      setPrintHistory(updatedHistory);

      try {
        let notesObj: any = {};
        if (op.notes && op.notes.startsWith("{")) {
          notesObj = JSON.parse(op.notes);
        }
        const existingDocx = notesObj.bookletLettersDocx || {};
        existingDocx.printHistory = updatedHistory;
        existingDocx.registrationNumber = registrationNumber;
        notesObj.bookletLettersDocx = existingDocx;
        await api.patch(`/operations/${op.id}`, {
          notes: JSON.stringify(notesObj),
        });
        onRefresh();
      } catch (saveErr) {
        console.warn("Could not persist print history:", saveErr);
      }

      // رفع المستند سحابياً في الخلفية لضمان تفعيل رابط التحقق من الباركود فورياً
      if (!cloudUrls[activeLetterType] || cloudUrls[activeLetterType]?.includes("tmpfiles") || cloudUrls[activeLetterType]?.includes("tmpfile") || cloudUrls[activeLetterType]?.includes("catbox")) {
        handleUploadToCloud(activeLetterType, false).catch(() => {});
      }

      toast.success("تم إرسال المستند للطباعة وتحديث سجل الطباعة الرسمي بنجاح ✓");
    } catch (err: any) {
      console.warn("فشل تجهيز الطباعة:", err);
      toast.error("فشل تجهيز الطباعة: " + (err?.message || ""));
    } finally {
      setPrintingDocx(false);
    }
  };

  // التحقق من تكرار الطباعة وعرض تنبيه عند إعادة الطباعة
  const handlePrintWordDocument = async () => {
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
        d.type?.toLowerCase().includes("booklet") ||
        d.name?.toLowerCase().includes("booklet") ||
        d.name?.includes("كراسة") ||
        d.name?.includes("ابتدائي")
    );
    if (archivedDoc?.fileUrl) {
      window.open(archivedDoc.fileUrl, "_blank");
      return;
    }
    // 4. فتح المعاينة
    setPreviewModalOpen(true);
  };

  // ━━━ حالة وإجراء الإضافة المباشرة للأرشيف ━━━
  const [addingToArchive, setAddingToArchive] = useState(false);
  const isArchived = useMemo(() => {
    try {
      if (op.notes && op.notes.startsWith("{")) {
        const parsed = JSON.parse(op.notes);
        const list = parsed.archivedDocIds || [];
        return (
          list.includes(`letter-booklet-${activeLetterType}`) ||
          list.includes("letter-booklet") ||
          list.includes("letter-booklet-insurance")
        );
      }
    } catch {}
    return false;
  }, [op.notes, activeLetterType]);

  const handleToggleArchive = async () => {
    setAddingToArchive(true);
    let notesObj: any = {};
    try {
      if (op.notes && op.notes.startsWith("{")) {
        notesObj = JSON.parse(op.notes);
      }
    } catch {}

    const docKey = `letter-booklet-${activeLetterType}`;
    const current: string[] = notesObj.archivedDocIds || [];
    const exists = current.includes(docKey) || current.includes("letter-booklet") || current.includes("letter-booklet-insurance");
    const updated = exists
      ? current.filter((id: string) => id !== docKey && id !== "letter-booklet" && id !== "letter-booklet-insurance")
      : [...current, docKey];

    notesObj.archivedDocIds = updated;

    try {
      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(notesObj),
      });
      toast.success(
        exists
          ? `تمت إزالة ${currentTpl.title} من مستندات الأرشيف وحزمة التقديم 📂`
          : `تمت إضافة ${currentTpl.title} إلى مستندات الأرشيف وحزمة التقديم بنجاح! 📦✨`
      );
      onRefresh();
    } catch (err: any) {
      toast.error("فشل تحديث حالة الأرشيف: " + (err?.message || ""));
    } finally {
      setAddingToArchive(false);
    }
  };

  // طباعة مباشرة من داخل نافذة المعاينة
  const handlePrintFromModal = () => {
    try {
      const iframeEl = document.querySelector('iframe[title="معاينة مستند الوورد الأصلي المعتمد"]') as HTMLIFrameElement;
      if (iframeEl && iframeEl.contentWindow) {
        iframeEl.contentWindow.focus();
        iframeEl.contentWindow.print();
        return;
      }
    } catch {}
    handlePrintWordDocument();
  };

  // ━━━ الخطوة 2 و 3: إيصالات السداد وكراسة الشروط وأرشيف الصور ━━━
  const bookletFileInputRef = useRef<HTMLInputElement>(null);
  const insuranceFileInputRef = useRef<HTMLInputElement>(null);
  const singleBookletInputRef = useRef<HTMLInputElement>(null);

  const [bookletReceiptNo, setBookletReceiptNo] = useState("");
  const [bookletReceiptAmount, setBookletReceiptAmount] = useState("1500");
  const [bookletReceiptFile, setBookletReceiptFile] = useState<File | null>(null);
  const [uploadingBookletReceipt, setUploadingBookletReceipt] = useState(false);

  const [insuranceReceiptType, setInsuranceReceiptType] = useState<"CASH" | "DEDUCTION_FROM_DUES" | "BANK_GUARANTEE">("CASH");
  const [insuranceReceiptNo, setInsuranceReceiptNo] = useState("");
  const [insuranceReceiptAmountVal, setInsuranceReceiptAmountVal] = useState(insuranceAmount || "10000");
  const [insuranceReceiptFile, setInsuranceReceiptFile] = useState<File | null>(null);
  const [uploadingInsuranceReceipt, setUploadingInsuranceReceipt] = useState(false);

  // حقول مخصصة لطرق سداد التأمين الابتدائي:
  // 1. خصم من مستحقات
  const [deductionEntityName, setDeductionEntityName] = useState(() => op.authority || "مديرية الشئون الصحية بالبحيرة");
  const [deductionOrderNo, setDeductionOrderNo] = useState(() => op.externalNumber || "أمر توريد / إسناد رقم 102");
  const [deductionDate, setDeductionDate] = useState(() => new Date().toLocaleDateString("en-GB"));

  // 2. خطاب ضمان بنكي
  const [insuranceBankName, setInsuranceBankName] = useState(() => bankName || "بنك مصر الإسلامي");
  const [insuranceBankBranch, setInsuranceBankBranch] = useState(() => bankBranch || "فرع دمنهور");
  const [insuranceGuaranteeNo, setInsuranceGuaranteeNo] = useState(() => "LG-849201");
  const [insuranceGuaranteeStartDate, setInsuranceGuaranteeStartDate] = useState(() => new Date().toLocaleDateString("en-GB"));
  const [insuranceGuaranteeEndDate, setInsuranceGuaranteeEndDate] = useState(() => "12/12/2027");

  // 3. توريد نقدي / خزينة
  const [treasuryName, setTreasuryName] = useState(() => (op.authority ? `خزينة ${op.authority}` : "خزينة الجهة"));
  const [paymentDate, setPaymentDate] = useState(() => new Date().toLocaleDateString("en-GB"));

  const [singleBookletFile, setSingleBookletFile] = useState<File | null>(null);
  const [singleBookletName, setSingleBookletName] = useState(`كراسة_شروط_${op.externalNumber || op.serialNumber}.pdf`);
  const [uploadingSingleBooklet, setUploadingSingleBooklet] = useState(false);

  const allBookletDocs = (op.documents || []).filter((d: any) => d.type === "BOOKLET");
  const receiptDocs = (op.documents || []).filter((d: any) => d.type === "RECEIPT");

  const handleUploadBookletReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookletReceiptFile) {
      toast.error("يرجى اختيار صورة أو ملف إيصال سداد كراسة الشروط أولاً");
      return;
    }
    setUploadingBookletReceipt(true);
    try {
      const formData = new FormData();
      formData.append("file", bookletReceiptFile);
      formData.append("type", "RECEIPT");
      formData.append("companyId", selectedCompanyId || "");
      formData.append(
        "fileName",
        `إيصال سداد كراسة الشروط (رقم ${bookletReceiptNo || "خزينة"} - ${formatCurrency(Number(bookletReceiptAmount || 0))})`
      );

      await api.post(`/operations/${op.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!op.isCodeLocked) {
        try {
          await api.post(`/operations/${op.id}/booklet`, {
            fileName: `كراسة_شروط_${op.externalNumber || op.serialNumber}.pdf`,
            companyId: selectedCompanyId,
          });
        } catch {}
      }

      toast.success("تم رفع واعتماد إيصال سداد كراسة الشروط وقفل الكود بنجاح! 🔒");
      setBookletReceiptFile(null);
      setBookletReceiptNo("");
      onRefresh();
    } catch {
      toast.error("فشل رفع إيصال سداد كراسة الشروط");
    } finally {
      setUploadingBookletReceipt(false);
    }
  };

  const handleUploadInsuranceReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!insuranceReceiptFile) {
      toast.error("يرجى اختيار ملف أو صورة إيصال التأمين الابتدائي");
      return;
    }

    setUploadingInsuranceReceipt(true);
    try {
      let methodLabel = "إيصال توريد نقدي";
      let receiptDocNumber = insuranceReceiptNo;
      let guaranteeNotes = `سداد تأمين ابتدائي معتمد بتاريخ ${outgoingDate}`;

      if (insuranceReceiptType === "DEDUCTION_FROM_DUES") {
        methodLabel = "إشعار خصم مستحقات";
        receiptDocNumber = deductionOrderNo || insuranceReceiptNo || "أمر إسناد";
        guaranteeNotes = `خصم من مستحقات طرف: ${deductionEntityName} - رقم أمر الإسناد: ${deductionOrderNo} - بتاريخ ${deductionDate}`;
      } else if (insuranceReceiptType === "BANK_GUARANTEE") {
        methodLabel = "أصل خطاب ضمان بنكي";
        receiptDocNumber = insuranceGuaranteeNo || insuranceReceiptNo || "LG";
        guaranteeNotes = `خطاب ضمان بنكي صادر من بنك ${insuranceBankName} فرع ${insuranceBankBranch} برقم ${insuranceGuaranteeNo} - سارٍ حتى ${insuranceGuaranteeEndDate}`;
      } else {
        receiptDocNumber = insuranceReceiptNo || "خزينة";
        guaranteeNotes = `سداد نقدي بخزينة ${treasuryName} بموجب إيصال رقم ${insuranceReceiptNo} بتاريخ ${paymentDate}`;
      }

      const formData = new FormData();
      formData.append("file", insuranceReceiptFile);
      formData.append("type", "RECEIPT");
      formData.append("companyId", selectedCompanyId || "");
      formData.append(
        "fileName",
        `إيصال التأمين الابتدائي (${methodLabel} - رقم ${receiptDocNumber} - ${formatCurrency(Number(insuranceReceiptAmountVal || 0))})`
      );

      await api.post(`/operations/${op.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      try {
        const guaranteePayload: any = {
          type: "INITIAL",
          companyId: selectedCompanyId,
          paymentMethod: insuranceReceiptType,
          amount: Number(insuranceReceiptAmountVal) || 0,
          receiptNumber: receiptDocNumber,
          notes: guaranteeNotes,
        };

        if (insuranceReceiptType === "BANK_GUARANTEE") {
          guaranteePayload.bankName = insuranceBankName;
          guaranteePayload.bankBranch = insuranceBankBranch;
          guaranteePayload.guaranteeNumber = insuranceGuaranteeNo || receiptDocNumber;
          guaranteePayload.startDate = insuranceGuaranteeStartDate;
          guaranteePayload.endDate = insuranceGuaranteeEndDate;
        } else if (insuranceReceiptType === "DEDUCTION_FROM_DUES") {
          guaranteePayload.treasury = deductionEntityName;
        } else {
          guaranteePayload.treasury = treasuryName;
          guaranteePayload.paymentDate = paymentDate;
        }

        await api.post(`/operations/${op.id}/guarantees`, guaranteePayload);
      } catch {}

      toast.success("تم رفع إيصال التأمين الابتدائي وتسجيل بيانات الضمان بنجاح! ✓");
      setInsuranceReceiptFile(null);
      setInsuranceReceiptNo("");
      onRefresh();
    } catch {
      toast.error("فشل حفظ إيصال التأمين الابتدائي");
    } finally {
      setUploadingInsuranceReceipt(false);
    }
  };

  const handleUploadSingleBooklet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleBookletFile) {
      toast.error("يرجى اختيار ملف كراسة الشروط أولاً");
      return;
    }

    setUploadingSingleBooklet(true);
    try {
      const formData = new FormData();
      formData.append("file", singleBookletFile);
      formData.append("type", "BOOKLET");
      formData.append("companyId", selectedCompanyId || "");
      formData.append("fileName", singleBookletName.trim() || singleBookletFile.name);

      await api.post(`/operations/${op.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!op.isCodeLocked) {
        try {
          await api.post(`/operations/${op.id}/booklet`, {
            fileName: singleBookletName,
            companyId: selectedCompanyId,
          });
        } catch {}
      }

      toast.success("تم رفع كراسة الشروط الرسمية بنجاح! ✓");
      setSingleBookletFile(null);
      onRefresh();
    } catch {
      toast.error("فشل رفع كراسة الشروط");
    } finally {
      setUploadingSingleBooklet(false);
    }
  };

  // ━━━ حذف مستند من الأرشيف الرسمي ━━━
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const handleDeleteDoc = async (docId: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا المستند من أرشيف العملية؟")) return;
    setDeletingDocId(docId);
    try {
      await api.delete(`/operations/${op.id}/documents/${docId}`);
      toast.success("تم حذف المستند بنجاح من أرشيف العملية 🗑️");
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل حذف المستند");
    } finally {
      setDeletingDocId(null);
    }
  };

  // ━━━ حفظ كراسة الشروط المرصودة من الرادار في الأرشيف ━━━
  const [savingRadarBooklet, setSavingRadarBooklet] = useState(false);
  const handleSaveRadarBookletToArchive = async () => {
    setSavingRadarBooklet(true);
    try {
      await api.post(`/operations/${op.id}/booklet`, {
        fileName: `كراسة_شروط_${op.externalNumber || op.serialNumber}_(الرادار).pdf`,
        companyId: selectedCompanyId,
      });
      toast.success("تم تحميل وتخزين كراسة الشروط الرسمية من بوابة المناقصات بنجاح في أرشيف العملية! 📥🔒");
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل حفظ كراسة الشروط من الرادار");
    } finally {
      setSavingRadarBooklet(false);
    }
  };

  // ━━━ عرض نسخة الـ PDF الرسمية فقط (بدون وورد) ━━━
  const [directPdfModalOpen, setDirectPdfModalOpen] = useState(false);
  const [directPdfUrl, setDirectPdfUrl] = useState<string | null>(null);

  const handleOpenDirectPdfPreview = async () => {
    try {
      toast.info("جاري تجهيز نسخة الـ PDF الرسمية للعرض المباشر...");
      let blob = previewPdfBlob;
      if (!blob || lastGeneratedSnapshot !== currentSnapshot) {
        blob = await generateBookletPdfBlob(activeLetterType);
      }
      const url = URL.createObjectURL(blob);
      setDirectPdfUrl(url);
      setDirectPdfModalOpen(true);
    } catch (err: any) {
      toast.error(err?.message || "فشل فتح ملف PDF");
    }
  };

  const currentTpl = BOOKLET_LETTER_TEMPLATES.find((t) => t.id === activeLetterType) || BOOKLET_LETTER_TEMPLATES[0];

  return (
    <div className="space-y-6 animate-fade-in print:m-0 print:p-0">




      {/* ━━━ شريط الخطوات الثلاثة الرئيسي ━━━ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setActiveStep(1)}
          className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between group ${
            activeStep === 1
              ? "bg-amber-500/10 border-amber-500 shadow-md ring-2 ring-amber-500/20"
              : "glass-card border-border hover:border-amber-500/40"
          }`}
        >
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 block">
              الخطوة 1 من 3
            </span>
            <h4 className="text-sm font-black text-foreground">
              طباعة خطابات السحب والتأمين والضمان
            </h4>
            <p className="text-[11px] text-muted-foreground">
              4 قوالب Word رسمية معتمدة مع المعاينة والطباعة
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
            <FileText className="h-5 w-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveStep(2)}
          className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between group ${
            activeStep === 2
              ? "bg-emerald-500/10 border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
              : "glass-card border-border hover:border-emerald-500/40"
          }`}
        >
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
              الخطوة 2 من 3
            </span>
            <h4 className="text-sm font-black text-foreground">
              رفع إيصالات السداد وقفل الكود
            </h4>
            <p className="text-[11px] text-muted-foreground">
              إيصال سحب الكراسة والتأمين الابتدائي
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveStep(3)}
          className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between group ${
            activeStep === 3
              ? "bg-purple-500/10 border-purple-500 shadow-md ring-2 ring-purple-500/20"
              : "glass-card border-border hover:border-purple-500/40"
          }`}
        >
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 block">
              الخطوة 3 من 3
            </span>
            <h4 className="text-sm font-black text-foreground">
              كراسة الشروط وأرشيف المستندات
            </h4>
            <p className="text-[11px] text-muted-foreground">
              {allBookletDocs.length} مستند وصورة محفوظة
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
        </button>
      </div>

      {/* ━━━ الخطوة 1: قوالب الوورد الرسمية الأربعة للخطابات ━━━ */}
      {activeStep === 1 && (
        <div className="space-y-6">
          {/* اختيار الخطاب من البطاقات الأربعة */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {BOOKLET_LETTER_TEMPLATES.map((tpl) => {
              const isSelected = activeLetterType === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setActiveLetterType(tpl.id)}
                  className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                    isSelected
                      ? "bg-amber-500/15 border-amber-500 shadow-md ring-2 ring-amber-500/30"
                      : "bg-card border-border hover:border-amber-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Badge className={isSelected ? "bg-amber-600 text-white font-bold" : "bg-muted text-muted-foreground"}>
                      {tpl.badge}
                    </Badge>
                    {isSelected ? (
                      <CheckCircle2 className="h-4 w-4 text-amber-600" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-mono">Word .docx</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-foreground">{tpl.title}</h4>
                    <p className="text-[10.5px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                      {tpl.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* إشعار الرابط السحابي ورمز QR إن وجد */}
          {cloudUrls[activeLetterType] && (
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span className="font-bold">
                  النسخة الرقمية موثقة سحابياً ونشطة عبر رمز QR المعتمد داخل ملف الوورد.
                </span>
              </div>
              <a
                href={cloudUrls[activeLetterType]}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-black text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>فتح النسخة السحابية</span>
              </a>
            </div>
          )}

          {/* ━━━ SECTION 1: الترويسة التعريفية ورقم القيد والصادر وبيانات الشركة ━━━ */}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">الشركة المشاركة بالعملية *</Label>
                  <Select value={selectedCompanyId} onValueChange={(val) => setSelectedCompanyId(val || "")}>
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
                  <Label className="text-xs font-bold text-foreground">رقم الواتساب الرسمي (التذييل)</Label>
                  <Input
                    value={phoneWhatsapp}
                    onChange={(e) => setPhoneWhatsapp(e.target.value)}
                    placeholder="01091708818"
                    className="h-9.5 text-xs font-mono rounded-xl text-center bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">رقم المحمول الرسمي (التذييل)</Label>
                  <Input
                    value={phoneMobile}
                    onChange={(e) => setPhoneMobile(e.target.value)}
                    placeholder="01557018818"
                    className="h-9.5 text-xs font-mono rounded-xl text-center bg-background"
                  />
                </div>
              </div>

              {/* العنوان والإيميل */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-bold text-foreground">عنوان مقر الشركة (المطبوع بالتذييل)</Label>
                  <Input
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="بجوار مستشفى ليدى كير - بدمنهور - البحيره"
                    className="h-9.5 text-xs rounded-xl bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">البريد الإلكتروني للشركة (التذييل)</Label>
                  <Input
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="goldengolden8818@gmail.com"
                    className="h-9.5 text-xs font-mono rounded-xl bg-background"
                  />
                </div>
              </div>

            </div>
          </SectionCard>

          {/* ━━━ SECTION 2: جهة الإسناد وبيانات المناقصة / العملية الرسمية ━━━ */}
          <SectionCard
            title="2. جهة الإسناد وبيانات المناقصة / العملية الرسمية"
            icon={Landmark}
            iconColor="text-amber-600"
            badge={<Badge className="bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700 text-[11px] font-black">بيانات المناقصة والجهة</Badge>}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">لقب المرسل إليه *</Label>
                  <Input
                    value={recipientPrefix}
                    onChange={(e) => setRecipientPrefix(e.target.value)}
                    className="h-9.5 text-xs font-bold bg-background rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    {activeLetterType === "bank_guarantee_letter"
                      ? "اسم وصفة مدير البنك الموجه له الخطاب *"
                      : "صفة وجهة الإسناد بالترويسة *"}
                  </Label>
                  <Input
                    value={
                      activeLetterType === "bank_guarantee_letter"
                        ? bankManagerTitle
                        : recipientTitleAndAuthority
                    }
                    onChange={(e) => {
                      if (activeLetterType === "bank_guarantee_letter") {
                        setBankManagerTitle(e.target.value);
                      } else {
                        setRecipientTitleAndAuthority(e.target.value);
                      }
                    }}
                    placeholder={
                      activeLetterType === "bank_guarantee_letter"
                        ? "مدير بنك مصر فرع دمنهور"
                        : "صفة وجهة الإسناد"
                    }
                    className="h-9.5 text-xs font-bold bg-background rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">اسم العملية المسجلة بالخطاب *</Label>
                  <Input
                    value={operationRegisteredName}
                    onChange={(e) => setOperationRegisteredName(e.target.value)}
                    className="h-9.5 text-xs font-bold bg-background rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">رقم العملية / المناقصة *</Label>
                  <Input
                    value={operationNumber}
                    onChange={(e) => setOperationNumber(e.target.value)}
                    className="h-9.5 text-xs font-mono font-bold bg-background rounded-xl text-center"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">أسلوب الطرح التعاقدي *</Label>
                    <span className="text-[10px] text-muted-foreground font-semibold">اختر سريعاً أو اكتب</span>
                  </div>
                  <Input
                    value={tenderMethod}
                    onChange={(e) => setTenderMethod(e.target.value)}
                    placeholder="المناقصة العامة / المحدودة / الممارسة"
                    className="h-9.5 text-xs font-bold bg-background rounded-xl"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {[
                      "المناقصة العامة",
                      "المناقصة المحدودة",
                      "الممارسة العامة",
                      "الممارسة المحدودة",
                      "المزايدة العلنية",
                      "المزايدة المحلية",
                      "الاتفاق المباشر",
                    ].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setTenderMethod(m)}
                        className={`text-[10px] px-2.5 py-0.5 rounded-lg border transition-all cursor-pointer font-bold ${
                          tenderMethod === m
                            ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                            : "bg-muted/60 text-foreground border-border hover:bg-amber-500/15 hover:text-amber-800 dark:hover:text-amber-300"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <FiscalYearSelect
                  value={fiscalYear}
                  onChange={setFiscalYear}
                  label="السنة المالية *"
                />

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">موعد جلسة فتح المظروف الفني *</Label>
                  <Input
                    value={technicalOpeningDate}
                    onChange={(e) => setTechnicalOpeningDate(e.target.value)}
                    className="h-9.5 text-xs font-mono bg-background rounded-xl text-center"
                  />
                </div>

                <div className="sm:col-span-3 space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">نطاق وموضوع التوريد لزوم العملية *</Label>
                  <Input
                    value={operationScope}
                    onChange={(e) => setOperationScope(e.target.value)}
                    className="h-9.5 text-xs bg-background rounded-xl"
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ━━━ SECTION 3: تفويض المندوب القانوني (للخطابات الثلاثة الأولى) ━━━ */}
          {activeLetterType !== "bank_guarantee_letter" && (
            <SectionCard
              title="3. تفويض المندوب القانوني وصلاحيات السداد والاستلام"
              icon={UserCheck}
              iconColor="text-cyan-600"
              badge={<Badge className="bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-700 text-[11px] font-black">تفويض المندوب القانوني</Badge>}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">اسم المندوب المفوض *</Label>
                  <Input
                    value={delegateName}
                    onChange={(e) => setDelegateName(e.target.value)}
                    className="h-9.5 text-xs font-bold bg-background rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">صفة / مسمى المندوب *</Label>
                  <Input
                    value={delegateTitle}
                    onChange={(e) => setDelegateTitle(e.target.value)}
                    className="h-9.5 text-xs font-bold bg-background rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">الرقم القومي للمندوب (14 رقم) *</Label>
                  <Input
                    value={delegateNationalId}
                    onChange={(e) => setDelegateNationalId(e.target.value)}
                    className="h-9.5 text-xs font-mono font-bold bg-background rounded-xl text-center"
                  />
                </div>

                <div className="sm:col-span-3 space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">صلاحيات المندوب المفوض بالخطاب *</Label>
                  <Input
                    value={delegatePowers}
                    onChange={(e) => setDelegatePowers(e.target.value)}
                    className="h-9.5 text-xs bg-background rounded-xl"
                  />
                </div>
              </div>
            </SectionCard>
          )}

          {/* ━━━ SECTION 4: مبالغ التأمين الابتدائي (للخطاب الثاني والثالث) ━━━ */}
          {(activeLetterType === "insurance_payment" || activeLetterType === "booklet_and_insurance") && (
            <SectionCard
              title="4. مبالغ التأمين الابتدائي القانوني والتفقيط الرسمي"
              icon={Shield}
              iconColor="text-emerald-600"
              badge={<Badge className="bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700 text-[11px] font-black">بيانات التأمين الابتدائي</Badge>}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">مبلغ التأمين الابتدائي بالأرقام (ج.م) *</Label>
                  <Input
                    type="number"
                    value={insuranceAmount}
                    onChange={(e) => handleInsuranceAmountChange(e.target.value)}
                    className="h-9.5 text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 bg-background rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">تفقيط مبلغ التأمين بالحروف *</Label>
                  <Input
                    value={insuranceTafqeet}
                    onChange={(e) => setInsuranceTafqeet(e.target.value)}
                    className="h-9.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-background rounded-xl"
                  />
                </div>
              </div>
            </SectionCard>
          )}

          {/* ━━━ SECTION 5: بيانات خطاب الضمان البنكي الموجه للبنك (الخطاب الرابع) ━━━ */}
          {activeLetterType === "bank_guarantee_letter" && (
            <SectionCard
              title="القسم الخاص بخطاب الضمان البنكي: بيانات البنك والحساب وجهة الإسناد"
              icon={CreditCard}
              iconColor="text-purple-600"
              badge={<Badge className="bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-700 text-[11px] font-black">خطاب الضمان البنكي</Badge>}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">اسم البنك الموجه إليه *</Label>
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="h-9.5 text-xs font-bold bg-background rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">فرع البنك الموجه إليه *</Label>
                  <Input
                    value={bankBranch}
                    onChange={(e) => setBankBranch(e.target.value)}
                    className="h-9.5 text-xs font-bold bg-background rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">نوع التأمين المطلوب *</Label>
                  <Select value={bankGuaranteeType} onValueChange={(val) => setBankGuaranteeType(val || "ابتدائي")}>
                    <SelectTrigger className="h-9.5 text-xs font-bold bg-background rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ابتدائي">تأمين ابتدائي لدخول العطاء</SelectItem>
                      <SelectItem value="نهائي">تأمين نهائي للترسية (5%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">جهة الإسناد المستفيدة *</Label>
                  <Input
                    value={authorityName}
                    onChange={(e) => setAuthorityName(e.target.value)}
                    className="h-9.5 text-xs font-bold bg-background rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">عنوان جهة الإسناد بالكامل *</Label>
                  <Input
                    value={authorityAddress}
                    onChange={(e) => setAuthorityAddress(e.target.value)}
                    className="h-9.5 text-xs bg-background rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">مبلغ خطاب الضمان (ج.م) *</Label>
                  <Input
                    value={bankGuaranteeAmount}
                    onChange={(e) => setBankGuaranteeAmount(e.target.value)}
                    className="h-9.5 text-xs font-mono font-black text-purple-600 dark:text-purple-400 bg-background rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">تفقيط مبلغ خطاب الضمان *</Label>
                  <Input
                    value={bankGuaranteeTafqeet}
                    onChange={(e) => setBankGuaranteeTafqeet(e.target.value)}
                    className="h-9.5 text-xs font-bold text-purple-700 dark:text-purple-300 bg-background rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">نسبة التأمين من العملية *</Label>
                  <Input
                    value={guaranteePercentage}
                    onChange={(e) => setGuaranteePercentage(e.target.value)}
                    className="h-9.5 text-xs font-mono font-bold bg-background rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">إجمالي قيمة العملية (ج.م) *</Label>
                  <Input
                    value={operationTotalAmount}
                    onChange={(e) => setOperationTotalAmount(e.target.value)}
                    className="h-9.5 text-xs font-mono font-bold bg-background rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">تفقيط إجمالي العملية *</Label>
                  <Input
                    value={operationTotalTafqeet}
                    onChange={(e) => setOperationTotalTafqeet(e.target.value)}
                    className="h-9.5 text-xs font-bold bg-background rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">مدة الارتباط بالضمان *</Label>
                  <Input
                    value={guaranteeDurationText}
                    onChange={(e) => setGuaranteeDurationText(e.target.value)}
                    className="h-9.5 text-xs font-bold bg-background rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">تاريخ بدء سريان الضمان *</Label>
                  <Input
                    value={guaranteeStartDate}
                    onChange={(e) => setGuaranteeStartDate(e.target.value)}
                    className="h-9.5 text-xs font-mono bg-background rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">تاريخ انتهاء سريان الضمان *</Label>
                  <Input
                    value={guaranteeEndDate}
                    onChange={(e) => setGuaranteeEndDate(e.target.value)}
                    className="h-9.5 text-xs font-mono bg-background rounded-xl"
                  />
                </div>

                {/* بيانات الحساب البنكي */}
                <div className="sm:col-span-3 pt-2 border-t border-purple-500/20">
                  <h5 className="text-xs font-black text-purple-700 dark:text-purple-300 mb-2">
                    بيانات الحساب البنكي المراد الخصم منه:
                  </h5>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">رقم الحساب البنكي المسجل *</Label>
                  <Input
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    className="h-9.5 text-xs font-mono font-black bg-background rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">اسم بنك الحساب *</Label>
                  <Input
                    value={accountBankName}
                    onChange={(e) => setAccountBankName(e.target.value)}
                    className="h-9.5 text-xs font-bold bg-background rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">فرع بنك الحساب *</Label>
                  <Input
                    value={accountBankBranch}
                    onChange={(e) => setAccountBankBranch(e.target.value)}
                    className="h-9.5 text-xs font-bold bg-background rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">اسم صاحب الحساب بالبنك *</Label>
                  <Input
                    value={accountOwnerName}
                    onChange={(e) => setAccountOwnerName(e.target.value)}
                    className="h-9.5 text-xs font-bold bg-background rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">الرقم القومي لصاحب الحساب *</Label>
                  <Input
                    value={accountOwnerNationalId}
                    onChange={(e) => setAccountOwnerNationalId(e.target.value)}
                    className="h-9.5 text-xs font-mono font-bold bg-background rounded-xl"
                  />
                </div>
              </div>
            </SectionCard>
          )}

          {/* ━━━ SECTION 6: التوقيعات والاعتمادات الرسمية والملاحظات ━━━ */}
          <SectionCard
            title="التوقيعات والاعتمادات الرسمية وخانة الملاحظات"
            icon={FileCheck}
            iconColor="text-cyan-600"
            badge={<Badge className="bg-cyan-100 text-cyan-900 border border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-200 dark:border-cyan-700 text-[11px] font-black">التوقيعات والاعتماد الرسمي</Badge>}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">اسم المختص / المندوب الموقع *</Label>
                <Input
                  value={specialistName}
                  onChange={(e) => setSpecialistName(e.target.value)}
                  className="h-9.5 text-xs font-bold bg-background rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">اسم المدير المالي *</Label>
                <Input
                  value={financeManagerName}
                  onChange={(e) => setFinanceManagerName(e.target.value)}
                  className="h-9.5 text-xs font-bold bg-background rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">اعتماد رئيس مجلس الإدارة *</Label>
                <Input
                  value={boardChairman}
                  onChange={(e) => setBoardChairman(e.target.value)}
                  placeholder="رئيس مجلس الإدارة"
                  className="h-9.5 text-xs font-bold bg-background rounded-xl"
                />
              </div>

              <div className="sm:col-span-3 space-y-1.5">
                <Label className="text-xs font-bold text-foreground">ملاحظات وإيضاحات إضافية بأسفل الخطاب</Label>
                <Textarea
                  placeholder="اكتب أي شروط أو ملاحظات خاصة ليتم إدراجها في خانة الملاحظات الرسمية..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={2}
                  className="text-xs bg-background resize-none rounded-xl"
                />
              </div>
            </div>
          </SectionCard>

          {/* ━━━ الباركود الذكي ورمز QR والرفع السحابي المجاني للنسخة الرقمية بأسفل الصفحة ━━━ */}
          <LetterQrCloudCard
            cloudPdfUrl={cloudUrls[activeLetterType] || ""}
            registrationNumber={registrationNumber}
            opId={op.id}
            docType={`booklet_${activeLetterType}`}
            uploadingCloud={uploadingCloud}
            onUploadToCloud={(force) => handleUploadToCloud(activeLetterType, force)}
            title="الباركود الذكي ورمز QR الرقمي المعتمد (PDF)"
            subtitle={`عند مسح الباركود بكاميرا الموبايل يتم فتح النسخة الرسمية المعتمدة لخطاب (${currentTpl.shortName}) فوراً بدون الحاجة لأي تسجيل دخول.`}
            badgeText="مدمج بموضع كلمة (الباركود) بالأعلى ورقم القيد بالتذييل"
            gradientClass="from-amber-500/10 via-orange-500/10 to-transparent border-amber-500/25"
            isModifiedAfterUpload={isDirty}
          />

          {/* ━━━ BOTTOM ACTION BAR: التوليد والطباعة والمعاينة بأسفل الخطوة الأولى ━━━ */}
          <LetterBottomActionWidget
            title={currentTpl.title}
            registrationNumber={registrationNumber}
            isDirty={isDirty}
            printInfo={printHistory[activeLetterType]}
            onPreview={() => setPreviewModalOpen(true)}
            onPreviewPdfDirect={handleOpenDirectPdfPreview}
            onSave={handleSaveAll}
            onCancelEdits={handleCancelEdits}
            saving={savingChanges}
            onViewArchive={handleViewArchive}
            onAddToArchive={handleToggleArchive}
            isArchived={isArchived}
            addingToArchive={addingToArchive}
            customSubtitle="مطابق 100% لقالب الوورد المعتمد للشركة. اضغط على زر المعاينة للاطلاع على المستند وتنزيله أو طباعته."
          />

          {/* ━━━ شريط الانتقال للخطوة التالية بأسفل الخطوة الأولى ━━━ */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-transparent border border-blue-500/25 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="space-y-0.5 text-center sm:text-right">
              <h4 className="text-xs font-black text-foreground">
                الخطوة التالية (2): رفع إيصالات السداد والتأمين وقفل الكود
              </h4>
              <p className="text-[11px] text-muted-foreground">
                بعد مراجعة وطباعة الخطاب المعتمد، انتقل لرفع إيصال سداد ثمن الكراسة وإيصال أو خطاب الضمان للتأمين الابتدائي.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setActiveStep(2)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black h-10 px-5 rounded-xl cursor-pointer shadow-md flex items-center gap-2 shrink-0"
            >
              <span>الانتقال للخطوة (2): رفع إيصالات السداد والتأمين ⬅️</span>
            </Button>
          </div>
        </div>
      )}

      {/* ━━━ الخطوة 2: رفع إيصالات السداد والخزينة وقفل الكود ━━━ */}
      {activeStep === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SectionCard
            title="إيصال سداد ثمن كراسة الشروط بالخزينة"
            icon={FileText}
            iconColor="text-blue-600"
            badge={<Badge className="bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 text-[10px] font-bold">خزينة الجهة</Badge>}
          >
            <form onSubmit={handleUploadBookletReceipt} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">رقم إيصال الخزينة *</Label>
                  <Input
                    placeholder="مثال: 849201"
                    value={bookletReceiptNo}
                    onChange={(e) => setBookletReceiptNo(e.target.value)}
                    className="h-9 text-xs font-mono bg-background rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">قيمة الكراسة (ج.م)</Label>
                  <Input
                    type="number"
                    value={bookletReceiptAmount}
                    onChange={(e) => setBookletReceiptAmount(e.target.value)}
                    className="h-9 text-xs font-mono bg-background rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* اختيار وتصفح ملف إيصال الكراسة بشكل أنيق ومتناسق */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">ملف أو صورة إيصال السداد *</Label>
                <input
                  type="file"
                  ref={bookletFileInputRef}
                  onChange={(e) => setBookletReceiptFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <div
                  onClick={() => bookletFileInputRef.current?.click()}
                  className={`p-3 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    bookletReceiptFile
                      ? "bg-blue-500/10 border-blue-500 text-blue-900 dark:text-blue-200"
                      : "bg-muted/30 border-blue-400/50 hover:bg-blue-500/5 hover:border-blue-500"
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      {bookletReceiptFile ? <FileCheck className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
                    </div>
                    <div className="overflow-hidden">
                      {bookletReceiptFile ? (
                        <>
                          <p className="text-xs font-bold truncate text-foreground">{bookletReceiptFile.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{formatDocFileSize(bookletReceiptFile.size)}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-bold text-foreground">اضغط لاختيار صورة أو ملف الإيصال</p>
                          <p className="text-[10.5px] text-muted-foreground">صورة (JPG, PNG) أو مستند PDF</p>
                        </>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-8 px-3 rounded-xl shrink-0 cursor-pointer shadow-xs"
                  >
                    <Upload className="h-3.5 w-3.5 ml-1" />
                    <span>{bookletReceiptFile ? "تغيير الملف" : "استعراض ملف 📁"}</span>
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={uploadingBookletReceipt || !bookletReceiptFile}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9.5 rounded-xl cursor-pointer shadow-sm"
              >
                {uploadingBookletReceipt ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Upload className="h-4 w-4 ml-1" />}
                <span>اعتماد إيصال الكراسة وقفل الكود</span>
              </Button>
            </form>
          </SectionCard>

          <SectionCard
            title="إيصال أو خطاب التأمين الابتدائي (نقدي / خصم / ضمان)"
            icon={ShieldCheck}
            iconColor="text-emerald-600"
            badge={<Badge className="bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 text-[10px] font-bold">تأمين ابتدائي</Badge>}
          >
            <form onSubmit={handleUploadInsuranceReceipt} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">طريقة السداد</Label>
                  <Select value={insuranceReceiptType} onValueChange={(val: any) => setInsuranceReceiptType(val)}>
                    <SelectTrigger className="h-9 text-xs font-bold bg-background rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">سداد نقدي / خزينة</SelectItem>
                      <SelectItem value="DEDUCTION_FROM_DUES">خصم من مستحقات</SelectItem>
                      <SelectItem value="BANK_GUARANTEE">خطاب ضمان بنكي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">قيمة التأمين (ج.م)</Label>
                  <Input
                    type="number"
                    value={insuranceReceiptAmountVal}
                    onChange={(e) => setInsuranceReceiptAmountVal(e.target.value)}
                    className="h-9 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-background rounded-xl"
                  />
                </div>
              </div>

              {/* ━━━ حقول ديناميكية عند اختيار "خصم من مستحقات" ━━━ */}
              {insuranceReceiptType === "DEDUCTION_FROM_DUES" && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2.5 animate-fade-in">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-200">
                    <Building2 className="h-4 w-4 text-amber-600" />
                    <span>بيانات الخصم من المستحقات لدى الجهة:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-foreground">اسم الجهة المستحق منها *</Label>
                      <Input
                        placeholder="مثال: مديرية الشئون الصحية بالبحيرة"
                        value={deductionEntityName}
                        onChange={(e) => setDeductionEntityName(e.target.value)}
                        className="h-8.5 text-xs bg-background rounded-xl font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-foreground">رقم أمر الإسناد / العملية *</Label>
                      <Input
                        placeholder="مثال: أمر إسناد رقم 102 لسنة 2024"
                        value={deductionOrderNo}
                        onChange={(e) => setDeductionOrderNo(e.target.value)}
                        className="h-8.5 text-xs bg-background rounded-xl font-bold"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-[11px] font-bold text-foreground">تاريخ طلب / إقرار الخصم *</Label>
                      <Input
                        value={deductionDate}
                        onChange={(e) => setDeductionDate(e.target.value)}
                        className="h-8.5 text-xs font-mono bg-background rounded-xl text-center font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ━━━ حقول ديناميكية عند اختيار "خطاب ضمان بنكي" ━━━ */}
              {insuranceReceiptType === "BANK_GUARANTEE" && (
                <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/25 space-y-2.5 animate-fade-in">
                  <div className="flex items-center gap-1.5 text-xs font-black text-purple-900 dark:text-purple-200">
                    <Landmark className="h-4 w-4 text-purple-600" />
                    <span>بيانات خطاب الضمان البنكي الصادر:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-foreground">اسم البنك المصدر *</Label>
                      <Input
                        placeholder="مثال: بنك مصر الإسلامي"
                        value={insuranceBankName}
                        onChange={(e) => setInsuranceBankName(e.target.value)}
                        className="h-8.5 text-xs bg-background rounded-xl font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-foreground">فرع البنك *</Label>
                      <Input
                        placeholder="مثال: فرع دمنهور"
                        value={insuranceBankBranch}
                        onChange={(e) => setInsuranceBankBranch(e.target.value)}
                        className="h-8.5 text-xs bg-background rounded-xl font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-foreground">رقم خطاب الضمان *</Label>
                      <Input
                        placeholder="مثال: LG-849201"
                        value={insuranceGuaranteeNo}
                        onChange={(e) => {
                          setInsuranceGuaranteeNo(e.target.value);
                          setInsuranceReceiptNo(e.target.value);
                        }}
                        className="h-8.5 text-xs font-mono bg-background rounded-xl font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-foreground">تاريخ الانتهاء والسريان *</Label>
                      <Input
                        value={insuranceGuaranteeEndDate}
                        onChange={(e) => setInsuranceGuaranteeEndDate(e.target.value)}
                        className="h-8.5 text-xs font-mono bg-background rounded-xl text-center font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ━━━ حقول ديناميكية عند اختيار "سداد نقدي / خزينة" ━━━ */}
              {insuranceReceiptType === "CASH" && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-foreground">اسم الخزينة المسدد بها</Label>
                    <Input
                      placeholder="خزينة الجهة"
                      value={treasuryName}
                      onChange={(e) => setTreasuryName(e.target.value)}
                      className="h-9 text-xs bg-background rounded-xl font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-foreground">رقم إيصال التوريد *</Label>
                    <Input
                      placeholder="رقم إيصال التوريد"
                      value={insuranceReceiptNo}
                      onChange={(e) => setInsuranceReceiptNo(e.target.value)}
                      className="h-9 text-xs font-mono bg-background rounded-xl font-bold"
                    />
                  </div>
                </div>
              )}

              {/* اختيار وتصفح ملف التأمين الابتدائي بشكل أنيق ومتناسق */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">صورة أو ملف الإيصال / الضمان *</Label>
                <input
                  type="file"
                  ref={insuranceFileInputRef}
                  onChange={(e) => setInsuranceReceiptFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <div
                  onClick={() => insuranceFileInputRef.current?.click()}
                  className={`p-3 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    insuranceReceiptFile
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-200"
                      : "bg-muted/30 border-emerald-400/50 hover:bg-emerald-500/5 hover:border-emerald-500"
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      {insuranceReceiptFile ? <FileCheck className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
                    </div>
                    <div className="overflow-hidden">
                      {insuranceReceiptFile ? (
                        <>
                          <p className="text-xs font-bold truncate text-foreground">{insuranceReceiptFile.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{formatDocFileSize(insuranceReceiptFile.size)}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-bold text-foreground">اضغط لاختيار صورة إيصال السداد أو خطاب الضمان</p>
                          <p className="text-[10.5px] text-muted-foreground">صورة (JPG, PNG) أو ملف PDF</p>
                        </>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 px-3 rounded-xl shrink-0 cursor-pointer shadow-xs"
                  >
                    <Upload className="h-3.5 w-3.5 ml-1" />
                    <span>{insuranceReceiptFile ? "تغيير الملف" : "استعراض ملف 📁"}</span>
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={uploadingInsuranceReceipt || !insuranceReceiptFile}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9.5 rounded-xl cursor-pointer shadow-sm"
              >
                {uploadingInsuranceReceipt ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <ShieldCheck className="h-4 w-4 ml-1" />}
                <span>حفظ واعتماد التأمين الابتدائي</span>
              </Button>
            </form>
          </SectionCard>
        </div>

        {/* ━━━ أرشيف إيصالات ومستندات السداد المعتمدة للمرحلة الحالية ━━━ */}
        <OperationDocArchiveCard
          title="أرشيف إيصالات ومستندات السداد المعتمدة"
          description="عرض ومطالعة وتعديل واستبدال إيصالات سداد الكراسة وخطابات التأمين الابتدائي المرفوعة"
          docs={receiptDocs}
          opId={op.id}
          onRefresh={onRefresh}
          onPreviewDoc={onPreviewDoc}
          onDownloadDoc={onDownloadDoc}
        />

        {/* ━━━ شريط التنقل السفلي للخطوة 2 ━━━ */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-transparent border border-emerald-500/25 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <Button
            type="button"
            variant="outline"
            onClick={() => setActiveStep(1)}
            className="border-border text-foreground hover:bg-muted text-xs font-bold h-10 px-4 rounded-xl cursor-pointer flex items-center gap-1.5"
          >
            <span>➡️ العودة للخطوة (1): الخطابات الرسمية</span>
          </Button>

          <div className="text-center sm:text-right hidden sm:block">
            <h4 className="text-xs font-black text-foreground">
              الخطوة التالية (3): كراسة الشروط الرسمية وأرشيف المستندات
            </h4>
            <p className="text-[11px] text-muted-foreground">
              استعراض كراسة الشروط المرصودة من الرادار الحكومي وتخزينها بالأرشيف أو رفع نسخة بديلة.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => setActiveStep(3)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black h-10 px-5 rounded-xl cursor-pointer shadow-md flex items-center gap-2"
          >
            <span>الانتقال للخطوة (3): كراسة الشروط ⬅️</span>
          </Button>
        </div>
      </div>
    )}

      {/* ━━━ الخطوة 3: كراسة الشروط الرسمية وأرشيف المستندات ━━━ */}
      {activeStep === 3 && (
        <div className="space-y-6">
          {/* تنبيه ذكي: رصد وإيجاد كراسة الشروط الأصلية من بوابة المناقصات والرادار */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border-2 border-purple-500/30 space-y-3.5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-600/15 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <Sparkles className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-black text-foreground">
                      تنبيه ذكي: تم رصد كراسة الشروط الأصلية من بوابة التعاقدات الحكومية (الرادار)
                    </h4>
                    <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30 text-[10px] font-bold">
                      مسحوبة تلقائياً مع العملية ✓
                    </Badge>
                  </div>
                  <p className="text-[11.5px] text-muted-foreground mt-0.5">
                    كراسة الشروط والمواصفات الرسمية للعملية رقم ({op.externalNumber || op.serialNumber}) متوفرة بالبوابة الحكومية، ويمكنك تخزينها مباشرة داخل أرشيف الصفحة أو رفع نسخة بديلة.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
                {allBookletDocs.length > 0 ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold px-3 py-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>الكراسة محفوظة بالأرشيف أدناه ✓</span>
                  </Badge>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveRadarBookletToArchive}
                    disabled={savingRadarBooklet}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9.5 px-4 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    {savingRadarBooklet ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    <span>تحميل وتخزين الكراسة في الأرشيف 📥</span>
                  </Button>
                )}

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => singleBookletInputRef.current?.click()}
                  className="border-purple-500/40 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 font-bold text-xs h-9.5 px-3.5 rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <Upload className="h-4 w-4" />
                  <span>رفع كراسة بديلة أو ملحق 📤</span>
                </Button>
              </div>
            </div>
          </div>

          <SectionCard
            title="كراسة الشروط الرسمية وأرشيف المستندات"
            icon={BookOpen}
            iconColor="text-purple-600"
            badge={<Badge className="bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 text-[10px] font-bold">{allBookletDocs.length} مستند وصورة</Badge>}
          >
            <div className="space-y-4">
              <form onSubmit={handleUploadSingleBooklet} className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                <h5 className="text-xs font-black text-foreground">رفع ملف كراسة الشروط الرسمي (Word أو PDF)</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <input
                    type="file"
                    ref={singleBookletInputRef}
                    onChange={(e) => setSingleBookletFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <div
                    onClick={() => singleBookletInputRef.current?.click()}
                    className={`sm:col-span-2 p-3 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      singleBookletFile
                        ? "bg-purple-500/10 border-purple-500 text-purple-900 dark:text-purple-200"
                        : "bg-background border-purple-400/50 hover:bg-purple-500/5 hover:border-purple-500"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        {singleBookletFile ? <FileCheck className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
                      </div>
                      <div className="overflow-hidden">
                        {singleBookletFile ? (
                          <>
                            <p className="text-xs font-bold truncate text-foreground">{singleBookletFile.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{formatDocFileSize(singleBookletFile.size)}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs font-bold text-foreground">اضغط لتحديد ملف كراسة الشروط الرسمي</p>
                            <p className="text-[10.5px] text-muted-foreground">ملف PDF أو مستند Word (.docx)</p>
                          </>
                        )}
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold h-8 px-3.5 rounded-xl shrink-0 cursor-pointer shadow-xs"
                    >
                      <Upload className="h-3.5 w-3.5 ml-1" />
                      <span>{singleBookletFile ? "تغيير الملف" : "استعراض ملف الكراسة 📁"}</span>
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    disabled={uploadingSingleBooklet || !singleBookletFile}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold h-11 rounded-2xl cursor-pointer shadow-sm w-full"
                  >
                    {uploadingSingleBooklet ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Upload className="h-4 w-4 ml-1" />}
                    <span>رفع وتأكيد الكراسة</span>
                  </Button>
                </div>
              </form>

              {allBookletDocs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {allBookletDocs.map((doc: any) => {
                    const ext = (doc.fileName || "").split(".").pop()?.toLowerCase() || "";
                    const isPdf = ext === "pdf";
                    const isWord = ext === "docx" || ext === "doc";
                    const isImg = ["png", "jpg", "jpeg", "webp"].includes(ext);

                    return (
                      <div
                        key={doc.id}
                        className="p-4 rounded-2xl border-2 border-border/80 hover:border-purple-500/50 bg-card hover:bg-muted/10 flex flex-col justify-between gap-3 shadow-sm hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs border ${
                              isPdf
                                ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
                                : isWord
                                ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                : isImg
                                ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30"
                                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            }`}
                          >
                            {isPdf ? "PDF" : isWord ? "DOCX" : isImg ? "IMG" : "ملف"}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h5
                              className="text-xs sm:text-sm font-black text-foreground truncate block leading-snug group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors"
                              title={doc.fileName}
                            >
                              {doc.fileName}
                            </h5>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap font-mono">
                              <span className="font-bold text-foreground/80">{formatDocFileSize(doc.fileSize)}</span>
                              <span>•</span>
                              <span>{formatDate(doc.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        {/* شريط الأدوات الكامل للملف: معاينة أصيلة دون تعديل، نافذة مستقلة، تنزيل، حذف */}
                        <div className="pt-2 border-t border-border/70 flex items-center justify-between gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onPreviewDoc?.(doc)}
                              className="h-8 px-2.5 text-xs font-bold rounded-xl border-purple-500/40 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center gap-1 cursor-pointer shadow-xs"
                              title="معاينة الملف كما هو داخل المتصفح"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>معاينة</span>
                            </Button>

                            {doc.filePath && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const url = doc.filePath.startsWith("http")
                                    ? doc.filePath
                                    : `/api/operations/${op.id}/documents/${doc.id}/file`;
                                  window.open(url, "_blank");
                                }}
                                className="h-8 px-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                                title="فتح الملف الأصلي كما هو في نافذة مستقلة (بدون أي تعديل)"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">نافذة جديدة</span>
                              </Button>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDownloadDoc?.(doc)}
                              className="h-8 w-8 p-0 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                              title="تنزيل الملف للجهاز"
                            >
                              <Download className="h-4 w-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteDoc(doc.id)}
                              disabled={deletingDocId === doc.id}
                              className="h-8 w-8 p-0 rounded-xl hover:bg-red-500/15 text-muted-foreground hover:text-red-600 cursor-pointer"
                              title="حذف هذا الملف نهائياً من الأرشيف"
                            >
                              {deletingDocId === doc.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">
                  لم يتم رفع كراسة الشروط بعد. يمكنك رفعها الآن كملف PDF أو Word.
                </p>
              )}
            </div>
          </SectionCard>

          {/* ━━━ شريط التنقل السفلي للخطوة 3 ━━━ */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-600/10 via-indigo-600/10 to-transparent border border-purple-500/25 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveStep(2)}
              className="border-border text-foreground hover:bg-muted text-xs font-bold h-10 px-4 rounded-xl cursor-pointer flex items-center gap-1.5"
            >
              <span>➡️ العودة للخطوة (2): إيصالات السداد والتأمين</span>
            </Button>

            <div className="text-center sm:text-right">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <h4 className="text-xs font-black text-foreground">
                  اكتملت متطلبات مرحلة سحب الكراسة والتأمين الابتدائي بنجاح ✓
                </h4>
              </div>
              <p className="text-[11px] text-muted-foreground">
                تم اعتماد الخطابات، إيصالات السداد، وتوثيق كراسة الشروط الرسمية في الأرشيف.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => onNavigate("technical")}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-black h-10 px-5 rounded-xl cursor-pointer shadow-md flex items-center gap-2"
            >
              <span>الانتقال للمرحلة التالية: المظروف الفني ⬅️</span>
            </Button>
          </div>
        </div>
      )}

      {/* ━━━ MODAL: عرض نسخة الـ PDF الرسمية فقط المطبوعة (بدون وورد) ━━━ */}
      {directPdfModalOpen && directPdfUrl && (
        <Portal>
          <div className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-3xl max-w-5xl w-full h-[92vh] flex flex-col overflow-hidden shadow-2xl text-foreground">
              <div className="flex items-center justify-between p-4 border-b border-border bg-card">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-500/15 text-red-600 flex items-center justify-center font-black">
                    PDF
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-foreground">
                      عرض مستند PDF الرسمي المعتمد: {CURRENT_FILE_ARABIC_NAME[activeLetterType]}
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      رقم القيد: {registrationNumber} • نسخة رسمية للقراءة والطباعة
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={directPdfUrl}
                    download={`${CURRENT_FILE_ARABIC_NAME[activeLetterType]}_${op.externalNumber || op.serialNumber}_${registrationNumber}.pdf`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-xs cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>تنزيل PDF</span>
                  </a>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setDirectPdfModalOpen(false);
                      if (directPdfUrl) URL.revokeObjectURL(directPdfUrl);
                      setDirectPdfUrl(null);
                    }}
                    className="h-8 w-8 rounded-full hover:bg-muted cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 w-full h-full bg-slate-900">
                <iframe
                  src={`${directPdfUrl}#toolbar=1`}
                  className="w-full h-full border-0"
                  title="عرض مستند PDF الرسمي"
                />
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ━━━ MODAL: معاينة قالب الوورد المعتمد (مطابق لخطاب التوضيح تماماً) ━━━ */}
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
                        معاينة قالب الوورد المعتمد: {CURRENT_FILE_ARABIC_NAME[activeLetterType]}
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

              {/* Authentic Word & OnlyOffice Document Viewer */}
              <div className="flex-1 min-h-0 overflow-hidden pt-3 flex flex-col">
                {renderingDocx ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 text-center bg-slate-950 rounded-2xl">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-lg">
                      <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white">
                        جاري فتح وتجهيز مستند الوورد الأصلي للمعاينة الفورية...
                      </h4>
                      <p className="text-xs text-slate-400">
                        معاينة تفاعلية فورية لقالب الوورد ({CURRENT_FILE_ARABIC_NAME[activeLetterType]}) بدقة 100%
                      </p>
                    </div>
                  </div>
                ) : (
                  <OnlyOfficeDocViewer
                    documentTitle={`${CURRENT_FILE_ARABIC_NAME[activeLetterType]}_${op.externalNumber || op.serialNumber}_${registrationNumber}.docx`}
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

      {/* ━━━ MODAL: تنبيه إعادة طباعة الخطاب المعتمد (استجابة للتسجيلين 4 و 5) ━━━ */}
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

      {/* شريط التنقل السفلي بين التبويبات */}
      <StepFooterNav
        currentTabId="booklet"
        onNavigate={onNavigate}
      />
    </div>
  );
}
