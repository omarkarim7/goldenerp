"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  BookOpen, ShieldCheck, Upload, FileText, Check, AlertCircle,
  Download, Eye, Printer, X, Loader2, Calendar, Building2,
  UserCheck, Shield, HelpCircle, CheckCircle2, Sparkles,
  RefreshCw, Cloud, Save, RotateCcw, Landmark, CreditCard,
  ChevronRight, CheckCircle, FileCheck, Lock, QrCode, Copy,
  ExternalLink, Paperclip, ArrowRight
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
import { DocxViewer } from "@/components/docx-viewer";
import { generateSmartOutgoingRef, cleanAllDocxXml, buildQrAnchorXml, injectSingleQrIntoDocXml, LetterBottomActionWidget, ReprintConfirmModal, getCurrentUserName, FISCAL_YEAR_OPTIONS, FreeConvertersQuickLinks } from "./letter-utils";
import JSZip from "jszip";
import QRCode from "qrcode";
import { getPdfBlobFromDocx } from "./client-pdf";

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

  // رقم القيد الصادر الذكي
  const [registrationNumber, setRegistrationNumber] = useState<string>(() => {
    if (savedData?.registrationNumber) return savedData.registrationNumber;
    return generateSmartOutgoingRef({
      companyCode: currentCompanyLink?.displayCode || "AZ",
      tenderType: op.tenderType || "LIMITED_TENDER",
      dateStr: new Date().toISOString(),
      sequenceNumber: op.serialNumber || 1,
    });
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
  const [printHistory, setPrintHistory] = useState<Record<string, { printCount: number; firstPrintedAt?: string; lastPrintedAt?: string; printedBy?: string; registrationNumber?: string }>>(() => {
    return savedData?.printHistory || {};
  });
  const [reprintWarningOpen, setReprintWarningOpen] = useState(false);

  // ━━━ 2. جهة الإسناد وبيانات العملية الرسمية ━━━
  const [recipientPrefix, setRecipientPrefix] = useState<string>(() => {
    return savedData?.recipientPrefix || "الأستاذ";
  });
  const [recipientTitleAndAuthority, setRecipientTitleAndAuthority] = useState<string>(() => {
    if (savedData?.recipientTitleAndAuthority) return savedData.recipientTitleAndAuthority;
    if (op.authority) return `مدير الادارة العامة للمشتريات والمخازن بـ ${op.authority}`;
    return "مدير الادارة العامة للمشتريات والمخازن";
  });

  const [operationRegisteredName, setOperationRegisteredName] = useState<string>(() => {
    return op.name || savedData?.operationRegisteredName || "";
  });
  const [operationNumber, setOperationNumber] = useState<string>(() => {
    return op.externalNumber || (op.serialNumber ? String(op.serialNumber) : "") || savedData?.operationNumber || "";
  });
  const [tenderMethod, setTenderMethod] = useState<string>(() => {
    return savedData?.tenderMethod || defaultTenderMethod;
  });
  const [operationScope, setOperationScope] = useState<string>(() => {
    return op.name || savedData?.operationScope || "";
  });
  const [fiscalYear, setFiscalYear] = useState<string>(() => {
    try {
      if (op.notes && op.notes.includes("fiscalYear")) {
        const parsed = JSON.parse(op.notes);
        if (parsed.portalDetails?.fiscalYear) return parsed.portalDetails.fiscalYear;
        if (parsed.radarItem?.fiscalYear) return parsed.radarItem.fiscalYear;
      }
    } catch {}
    return savedData?.fiscalYear || "2024 / 2025";
  });
  const [technicalOpeningDate, setTechnicalOpeningDate] = useState<string>(() => {
    const d = op.dates?.find((dt: any) => dt.type === "TECHNICAL_OPENING" || dt.title?.includes("فني"));
    if (d?.dateValue) return formatDate(d.dateValue);
    if (savedData?.technicalOpeningDate) return savedData.technicalOpeningDate;
    return "";
  });

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
    return savedData?.boardChairman || "يعتمد ،،،،،، رئيس مجلس الادارة";
  });
  const [additionalNotes, setAdditionalNotes] = useState<string>(() => {
    return savedData?.additionalNotes || "";
  });

  // ━━━ 7. الروابط السحابية للنسخ الرقمية المعتمدة ━━━
  const [cloudUrls, setCloudUrls] = useState<{ [key in BookletLetterType]?: string }>(() => {
    return savedData?.cloudUrls || {};
  });
  const [uploadingCloud, setUploadingCloud] = useState<boolean>(false);

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
      cloudUrls,
      printHistory,
    });
  }, [
    activeLetterType, selectedCompanyId, registrationNumber, companyOpCode,
    companyCommercialRegister, companyTaxCard, phoneWhatsapp, phoneMobile,
    companyAddress, companyEmail, outgoingDate, recipientPrefix,
    recipientTitleAndAuthority, operationRegisteredName, operationNumber,
    tenderMethod, operationScope, fiscalYear, technicalOpeningDate,
    delegateName, delegateTitle, delegateNationalId, delegatePowers,
    insuranceAmount, insuranceTafqeet, bankName, bankBranch, bankGuaranteeType,
    authorityName, authorityAddress, bankGuaranteeAmount, bankGuaranteeTafqeet,
    guaranteePercentage, operationTotalAmount, operationTotalTafqeet,
    guaranteeDurationText, guaranteeStartDate, guaranteeEndDate,
    bankAccountNumber, accountBankName, accountBankBranch, accountOwnerName,
    accountOwnerNationalId, specialistTitle, specialistName, financeManagerName,
    boardChairman, additionalNotes, cloudUrls, printHistory,
  ]);

  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => currentSnapshot);
  const isDirty = useMemo(() => currentSnapshot !== savedSnapshot, [currentSnapshot, savedSnapshot]);
  const [savingChanges, setSavingChanges] = useState<boolean>(false);

  const handleSaveAll = async () => {
    setSavingChanges(true);
    try {
      let notesObj: any = {};
      try {
        if (op.notes && op.notes.startsWith("{")) {
          notesObj = JSON.parse(op.notes);
        }
      } catch {}

      notesObj.bookletLettersDocx = JSON.parse(currentSnapshot);

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(notesObj),
      });

      setSavedSnapshot(currentSnapshot);
      toast.success("تم حفظ بيانات خطابات الكراسة والتأمين في قاعدة البيانات بنجاح! 💾☁️");
      onRefresh();
    } catch {
      toast.error("فشل حفظ التعديلات");
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
      setBoardChairman(snap.boardChairman);
      setAdditionalNotes(snap.additionalNotes);
      setCloudUrls(snap.cloudUrls || {});
      toast.info("تم التراجع عن التعديلات وإعادة الخطابات للحالة السابقة ↺");
    } catch {
      toast.error("تعذر التراجع عن التعديلات");
    }
  };

  const handleRegenerateRef = () => {
    const fresh = generateSmartOutgoingRef({
      companyCode: currentCompanyLink?.displayCode || "AZ",
      tenderType: op.tenderType || "LIMITED_TENDER",
      dateStr: new Date().toISOString(),
      sequenceNumber: op.serialNumber || 1,
    });
    setRegistrationNumber(fresh);
    toast.success(`تم تحديث رقم القيد الصادر إلى: ${fresh}`);
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
      const targetVerifyUrl =
        activeCloud ||
        `${typeof window !== "undefined" ? window.location.origin : ""}/verify-doc?ref=${encodeURIComponent(registrationNumber)}&opId=${op.id}&type=booklet_${type}`;
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

      docXml = docXml.replace(/توريد كاوتش وبطاريات للسيارات للجامعه/g, escapeXml(operationScope));

      docXml = docXml.replace(/2024\s*\/\s*2025/g, escapeXml(fiscalYear));
      docXml = docXml.replace(/14\/\s*1\s*\/2024/g, escapeXml(technicalOpeningDate));

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

      docXml = docXml.replace(/توريد كاوتش وبطاريات للسيارات للجامعه/g, escapeXml(operationScope));

      docXml = docXml.replace(/2024\s*\/\s*2025/g, escapeXml(fiscalYear));
      docXml = docXml.replace(/14\/\s*1\s*\/2024/g, escapeXml(technicalOpeningDate));

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
    return await getPdfBlobFromDocx(docxBlob, `booklet_letter_${type}_${registrationNumber}.docx`);
  };

  // ━━━ رفع وتوثيق النسخة الرقمية سحابياً ━━━
  const handleUploadToCloud = async (type: BookletLetterType = activeLetterType, forceReupload = false) => {
    const existingUrl = cloudUrls[type];
    if (existingUrl && !forceReupload) {
      toast.info("تم رفع وتوثيق هذا الخطاب سحابياً مسبقاً وهو نشط بالفعل ✓");
      return;
    }

    setUploadingCloud(true);
    try {
      toast.info("جاري تحويل الخطاب لـ PDF ورفعه سحابياً...");
      const pdfBlob = await generateBookletPdfBlob(type);
      const formData = new FormData();
      formData.append("file", pdfBlob, `official_letter_${type}_${registrationNumber}.pdf`);

      const res = await api.post("/operations/upload-cloud-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const publicUrl = res.data?.url || res.data?.cloudUrl;
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

      toast.success("تم رفع وتوثيق الخطاب سحابياً ودمج رمز التحقق الرقمي QR بنجاح! 🚀");
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
      toast.info("جاري تجهيز وتنزيل مستند الوورد المعتمد...");
      const blob = await generateBookletDocxBlob(type);
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

  // ━━━ المعاينة الحية الفورية لمستند Word ━━━
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [renderingDocx, setRenderingDocx] = useState(false);
  const [previewDocxBlob, setPreviewDocxBlob] = useState<Blob | null>(null);
  const [printingDocx, setPrintingDocx] = useState(false);

  const loadOfficialPreview = async () => {
    setRenderingDocx(true);
    try {
      const docxBlob = await generateBookletDocxBlob(activeLetterType);
      setPreviewDocxBlob(docxBlob);
    } catch (err: any) {
      console.error(err);
      toast.error("فشل تجهيز معاينة الوورد: " + (err?.message || ""));
    } finally {
      setRenderingDocx(false);
    }
  };

  useEffect(() => {
    if (previewModalOpen) {
      loadOfficialPreview();
    }
  }, [previewModalOpen, activeLetterType]);

  // ━━━ تنفيذ الطباعة المباشرة وحفظ السجل الرسمي (استجابة للتسجيلين 4 و 5) ━━━
  const executePrintDoc = async () => {
    setPrintingDocx(true);
    try {
      toast.info("جاري تجهيز مستند الوورد الأصلي للطباعة بأعلى دقة...");
      const pdfBlob = await generateBookletPdfBlob(activeLetterType);
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
      const updatedHistory = {
        ...printHistory,
        [activeLetterType]: {
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
        const existingDocx = notesObj.bookletLettersDocx || {};
        existingDocx.printHistory = updatedHistory;
        existingDocx.registrationNumber = registrationNumber;
        notesObj.bookletLettersDocx = existingDocx;
        await api.patch(`/operations/${op.id}`, {
          notes: JSON.stringify(notesObj),
        });
      } catch (saveErr) {
        console.warn("Could not persist print history:", saveErr);
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

              {/* الباركود الذكي ورمز QR المدمج والرفع السحابي المجاني للنسخة الرقمية (مطابق لخطاب التوضيح) */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/25 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
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
                        {cloudUrls[activeLetterType] && (
                          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-bold flex items-center gap-1">
                            <Cloud className="h-3 w-3" />
                            <span>رابط سحابي دائم متاح لأي هاتف ✓</span>
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        عند مسح الباركود بكاميرا الموبايل يتم فتح النسخة الرسمية المعتمدة لخطاب ({currentTpl.shortName}) فوراً بدون الحاجة لأي تسجيل دخول.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center flex-wrap justify-end">
                    {cloudUrls[activeLetterType] ? (
                      <>
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-1.5 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>تم الرفع والتوثيق السحابي مسبقاً ✓</span>
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleUploadToCloud(activeLetterType, true)}
                          disabled={uploadingCloud}
                          className="border-border text-foreground hover:bg-muted text-xs font-bold h-9 px-3 rounded-xl cursor-pointer flex items-center gap-1"
                          title="تحديث وإعادة رفع النسخة السحابية لخطاب الكراسة والتأمين"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${uploadingCloud ? "animate-spin" : ""}`} />
                          <span>إعادة الرفع والتحديث ↻</span>
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleUploadToCloud(activeLetterType, false)}
                        disabled={uploadingCloud}
                        className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                      >
                        <Cloud className={`h-4 w-4 ${uploadingCloud ? "animate-spin" : ""}`} />
                        <span>{uploadingCloud ? "جاري الرفع السحابي..." : "رفع وتوثيق النسخة الرقمية سحابياً لرمز QR ☁️"}</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* تفاصيل الرابط السحابي والمعاينة المباشرة */}
                <div className="pt-2 border-t border-amber-500/20 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    <span className="text-muted-foreground shrink-0 font-medium text-[11px]">الرابط المشفر في الرمز:</span>
                    {cloudUrls[activeLetterType] ? (
                      <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <span className="font-mono text-xs text-blue-600 dark:text-blue-400 truncate bg-white/60 dark:bg-slate-900/60 px-2 py-1 rounded-lg border border-border">
                          {cloudUrls[activeLetterType]}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(cloudUrls[activeLetterType] || "");
                            toast.success("تم نسخ الرابط السحابي المباشر بنجاح! 📋");
                          }}
                          className="text-muted-foreground hover:text-foreground text-xs p-1 cursor-pointer"
                          title="نسخ الرابط"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <a
                          href={cloudUrls[activeLetterType]}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 font-bold text-[11px] shrink-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>فتح النسخة السحابية المباشرة</span>
                        </a>
                      </div>
                    ) : (
                      <span className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                        الرمز الحالي مرتبط بمنظومة التحقق المحلية. اضغط على زر الرفع السحابي أعلاه للحصول على رابط مباشر دائم لأي هاتف محمول مجاناً.
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <a
                      href={`/verify-doc?ref=${encodeURIComponent(registrationNumber)}&opId=${op.id}&type=booklet_${activeLetterType}${cloudUrls[activeLetterType] ? `&pdfUrl=${encodeURIComponent(cloudUrls[activeLetterType] || "")}` : ""}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800"
                    >
                      <span>تجربة الفحص الرقمي</span>
                      <ArrowRight className="h-3 w-3 rtl:rotate-180" />
                    </a>
                  </div>
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
                        ? `مدير بنك ${bankName} فرع ${bankBranch}`
                        : recipientTitleAndAuthority
                    }
                    onChange={(e) => {
                      if (activeLetterType !== "bank_guarantee_letter") {
                        setRecipientTitleAndAuthority(e.target.value);
                      }
                    }}
                    disabled={activeLetterType === "bank_guarantee_letter"}
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

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">السنة المالية *</Label>
                    <span className="text-[10px] text-muted-foreground font-mono">اختر من القائمة أو حدد أخرى</span>
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
                      <SelectValue placeholder="اختر السنة المالية" />
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
                      placeholder="اكتب السنة المالية مثلاً: 2026 / 2027"
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

          {/* ━━━ BOTTOM ACTION BAR: التوليد والطباعة والمعاينة بأسفل الخطوة الأولى ━━━ */}
          <LetterBottomActionWidget
            title={currentTpl.title}
            registrationNumber={registrationNumber}
            isDirty={isDirty}
            printInfo={printHistory[activeLetterType]}
            onPreview={() => setPreviewModalOpen(true)}
            onSave={handleSaveAll}
            onCancelEdits={handleCancelEdits}
            saving={savingChanges}
            onViewArchive={() => setPreviewModalOpen(true)}
            customSubtitle="مطابق 100% لقالب الوورد المعتمد للشركة. اضغط على زر المعاينة للاطلاع على المستند وتنزيله أو طباعته."
          />
        </div>
      )}

      {/* ━━━ الخطوة 2: رفع إيصالات السداد والخزينة وقفل الكود ━━━ */}
      {activeStep === 2 && (
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
                  accept="image/*,.pdf"
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
                  accept="image/*,.pdf"
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
      )}

      {/* ━━━ الخطوة 3: كراسة الشروط الرسمية وأرشيف المستندات ━━━ */}
      {activeStep === 3 && (
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
                  accept=".pdf,.docx,.doc"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {allBookletDocs.map((doc: any) => (
                  <div key={doc.id} className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between gap-2 shadow-xs">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{doc.fileName}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{formatDocFileSize(doc.fileSize)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => onPreviewDoc?.(doc)} className="h-7 w-7 p-0">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onDownloadDoc?.(doc)} className="h-7 w-7 p-0">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">
                لم يتم رفع كراسة الشروط بعد. يمكنك رفعها الآن كملف PDF أو Word.
              </p>
            )}
          </div>
        </SectionCard>
      )}

      {/* ━━━ MODAL: معاينة قالب الوورد المعتمد (مطابق لخطاب التوضيح تماماً) ━━━ */}
      {previewModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in overflow-y-auto">
            <div className="bg-card border border-border rounded-3xl max-w-5xl w-full p-4 sm:p-6 space-y-4 shadow-2xl my-auto max-h-[96vh] flex flex-col overflow-hidden text-foreground">
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
                        استبدال حي من ملف الوورد الأصلي ✓
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      يتم العمل مباشرة على ملف Word المرسل منك واستبدال المتغيرات الحمراء وبيانات الجدول والختم بدقة 100%
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <FreeConvertersQuickLinks />

                  <Button
                    size="sm"
                    onClick={handlePrintFromModal}
                    disabled={printingDocx}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-9 px-4 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className={`h-4 w-4 ${printingDocx ? "animate-spin" : ""}`} />
                    <span>{printingDocx ? "جاري التجهيز..." : "طباعة المستند المعتمد"}</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleDownloadPdf(activeLetterType)}
                    disabled={downloadingPdf}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-9 px-3.5 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <FileText className={`h-4 w-4 ${downloadingPdf ? "animate-spin" : ""}`} />
                    <span>{downloadingPdf ? "جاري التحويل..." : "تحميل PDF"}</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadDocx(activeLetterType)}
                    disabled={downloadingDocx}
                    className="text-xs font-bold h-9 rounded-xl border-border hover:bg-muted cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="h-4 w-4 text-blue-600" />
                    <span>{downloadingDocx ? "جاري التوليد..." : "تنزيل Word (.docx)"}</span>
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

              {/* Authentic Word Document Rendered via Microsoft Word Engine */}
              <div className="flex-1 overflow-hidden p-2 sm:p-4 bg-slate-900/90 rounded-2xl flex flex-col items-center justify-start min-h-[640px]">
                <div className="mb-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 self-stretch">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    معاينة أصلية معتمدة من محرك Microsoft Word: تم تطبيق كافة المتغيرات وإزالة علامات التمييز الحمراء لإنتاج مستند رسمي 100%.
                  </span>
                </div>

                {renderingDocx ? (
                  <div className="my-auto py-28 flex flex-col items-center justify-center gap-4 text-center">
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
                ) : previewDocxBlob ? (
                  <div className="w-full max-w-[950px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-300 dark:border-slate-800 overflow-hidden flex flex-col my-auto p-4">
                    <DocxViewer
                      blob={previewDocxBlob}
                      fileName={`${CURRENT_FILE_ARABIC_NAME[activeLetterType]}_${registrationNumber}.docx`}
                    />
                  </div>
                ) : (
                  <div className="my-auto py-20 text-center">
                    <Button onClick={loadOfficialPreview} className="font-bold">
                      <Eye className="h-4 w-4 ml-2" />
                      عرض المعاينة الأصلية
                    </Button>
                  </div>
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
          setPreviewModalOpen(true);
        }}
      />

      {/* شريط التنقل السفلي بين التبويبات */}
      <StepFooterNav
        currentTabId="booklet"
        onNavigate={onNavigate}
      />
    </div>
  );
}
