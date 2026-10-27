"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Package,
  Printer,
  Download,
  Eye,
  Send,
  Loader2,
  CheckCircle2,
  FileText,
  FileArchive,
  Square,
  CheckSquare,
  X,
  Building2,
  FileCheck,
  ShieldCheck,
  Coins,
  FileSpreadsheet,
  Layers,
  ArrowDownToLine,
  ExternalLink,
  Sparkles,
  Edit3,
  Trash2,
  RefreshCw,
  File,
  Image as ImageIcon,
  Check,
  Receipt,
  HelpCircle,
  TrendingUp,
  Archive,
} from "lucide-react";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Portal } from "@/components/ui/portal";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  Operation,
  SectionCard,
  DataRow,
  EmptyState,
  formatCurrency,
  formatDate,
  formatDocFileSize,
} from "./types";
import { StepFooterNav } from "./StepFooterNav";
import { SmartArabicDatePicker } from "@/components/ui/arabic-date-picker";
import { generateUniversalLetterPdfBlob } from "./universal-letter-generator";

export type FileCategory =
  | "ALL"
  | "ARCHIVE_ONLY"
  | "BOOKLET_INSURANCE"
  | "CLARIFICATIONS"
  | "COMPANY_DOCS"
  | "MARKET_STUDY"
  | "LETTERS"
  | "TECH_ENVELOPE"
  | "FIN_ENVELOPE";

export interface DossierItem {
  id: string;
  name: string;
  description: string;
  category: "LETTERS" | "COMPANY_DOCS" | "BOOKLET_INSURANCE" | "CLARIFICATIONS" | "MARKET_STUDY" | "RECEIPTS" | "FINANCIAL" | "TECHNICAL";
  sourceTab: "كراسة الشروط والتأمين" | "ردود الاستفسارات والتوضيحات" | "مستندات الشركة الرسمية" | "دراسة السوق" | "خطابات ومخرجات العطاء";
  envelope: "المظروف الفني" | "المظروف المالي" | "مستندات عامة مشتركة";
  fileType: "pdf" | "docx" | "xlsx" | "image" | "doc" | "other";
  templatePath?: string;
  templateKey?: "clarification" | "technical" | "financial" | "specs" | "insurance";
  cloudUrl?: string;
  docRef?: any;
  companyDocRef?: any;
  size?: number;
  uploadedAt?: string;
  isArchived?: boolean;
}

export function TabSubmissionPackage({
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
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    op.companies?.[0]?.companyId || op.companies?.[0]?.id || ""
  );

  const selectedCompanyRel = useMemo(() => {
    return (
      (op.companies || []).find(
        (c: any) => c.companyId === selectedCompanyId || c.id === selectedCompanyId
      ) || op.companies?.[0]
    );
  }, [op.companies, selectedCompanyId]);

  const [activeCategory, setActiveCategory] = useState<FileCategory>("ALL");
  const [packagingZip, setPackagingZip] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [checklistOpen, setChecklistOpen] = useState(false);

  // أدوات إدارة وتعديل واستبدال وحذف المستندات في أرشيف العملية
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [savingRename, setSavingRename] = useState(false);

  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);
  const [replacingLoading, setReplacingLoading] = useState(false);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // حالة تسجيل تسليم العطاء
  const [addingSubmission, setAddingSubmission] = useState(false);
  const [submissionDate, setSubmissionDate] = useState(new Date().toISOString().split("T")[0]);
  const [receiptNumber, setReceiptNumber] = useState(`RCP-${Date.now().toString().slice(-5)}`);
  const [recipientPerson, setRecipientPerson] = useState("سكرتارية لجنة فض المظاريف");
  const [notes, setNotes] = useState("");
  const [savingSubmission, setSavingSubmission] = useState(false);

  // حالة استعراض تفاصيل إيصال التقديم في نافذة عائمة
  const [viewingSubmission, setViewingSubmission] = useState<any | null>(null);
  const [, setTogglingArchiveId] = useState<string | null>(null);

  // استخراج الروابط السحابية وقائمة مستندات الأرشيف
  const savedNotes = useMemo(() => {
    try {
      if (op.notes && op.notes.startsWith("{")) {
        return JSON.parse(op.notes);
      }
    } catch {}
    return null;
  }, [op.notes]);

  const archivedDocIds: string[] = useMemo(() => {
    return savedNotes?.archivedDocIds || [];
  }, [savedNotes]);

  const handleToggleDocArchive = async (itemId: string) => {
    setTogglingArchiveId(itemId);
    let notesObj: any = {};
    try {
      if (op.notes && op.notes.startsWith("{")) {
        notesObj = JSON.parse(op.notes);
      }
    } catch {}

    const current: string[] = notesObj.archivedDocIds || [];
    const exists = current.includes(itemId);
    const updated = exists ? current.filter((id: string) => id !== itemId) : [...current, itemId];

    notesObj.archivedDocIds = updated;

    try {
      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(notesObj),
      });
      toast.success(exists ? "تم إزالة المستند من قائمة الأرشيف 📂" : "تمت إضافة المستند إلى مستندات الأرشيف بنجاح! 📦");
      onRefresh();
    } catch {
      toast.error("فشل تحديث حالة الأرشيف للمستند");
    } finally {
      setTogglingArchiveId(null);
    }
  };

  const techCloudUrl = savedNotes?.technicalOfferDocx?.cloudPdfUrl || "";
  const clrCloudUrl = savedNotes?.clarificationLetterDocx?.cloudPdfUrl || "";
  const specsCloudUrl = savedNotes?.declarationsDocx?.cloudPdfUrlSpecs || "";
  const insCloudUrl = savedNotes?.declarationsDocx?.cloudPdfUrlInsurance || "";
  const finCloudUrl = savedNotes?.financialOfferDocx?.cloudPdfUrl || "";
  const warrantyCloudUrl = savedNotes?.warrantyCertificate?.cloudPdfUrl || "";
  const generalCloudUrl = savedNotes?.declarationsDocx?.cloudPdfUrlGeneral || savedNotes?.generalLetterDocx?.cloudPdfUrl || "";
  const bookletCloudUrls = savedNotes?.bookletLettersDocx?.cloudUrls || {};
  const guaranteeCloudUrls = savedNotes?.finalGuaranteeLetter?.cloudUrls || {};
  const refundCloudUrl = savedNotes?.finalInsuranceRefund?.cloudPdfUrl || "";
  const grievanceTechCloudUrl = savedNotes?.grievanceLetterTech?.cloudPdfUrl || "";
  const grievanceFinCloudUrl = savedNotes?.grievanceLetterFin?.cloudPdfUrl || "";

  // ━━━ جلب مستندات الشركة القانونية المعتمدة تلقائياً لضمان المزامنة 100% ━━━
  const [fetchedCompDocs, setFetchedCompDocs] = useState<any[]>([]);

  useEffect(() => {
    const compId = selectedCompanyRel?.companyId || selectedCompanyRel?.company?.id || selectedCompanyId;
    if (!compId) return;

    api.get(`/companies/${compId}/documents`)
      .then((res) => {
        if (Array.isArray(res.data)) {
          setFetchedCompDocs(res.data);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch company documents:", err);
      });
  }, [selectedCompanyId, selectedCompanyRel]);

  // ━━━ قائمة الملفات الفعلية المتاحة بالعملية (الملفات الحقيقية فقط بدون عناصر وهمية) ━━━
  const packageFiles: DossierItem[] = useMemo(() => {
    const list: DossierItem[] = [];

    // ─────────────────────────────────────────────────────────────
    // 1. المستندات المرفوعة فعلياً بالعملية (op.documents)
    // ─────────────────────────────────────────────────────────────
    (op.documents || []).forEach((d: any) => {
      const fileNameLower = (d.fileName || "").toLowerCase();
      const rawExt = (d.fileType || "").toLowerCase();
      const isImg = ["png", "jpg", "jpeg", "webp", "gif"].includes(rawExt);
      const isDocx = ["docx", "doc"].includes(rawExt);
      const isXls = ["xlsx", "xls", "csv"].includes(rawExt);
      const fType: DossierItem["fileType"] = isDocx ? "docx" : isXls ? "xlsx" : isImg ? "image" : "pdf";

      let cat: DossierItem["category"] = "BOOKLET_INSURANCE";
      let sourceTab: DossierItem["sourceTab"] = "كراسة الشروط والتأمين";
      let env: DossierItem["envelope"] = "المظروف الفني";

      if (
        fileNameLower.includes("توضيح") ||
        fileNameLower.includes("ملحق") ||
        fileNameLower.includes("استفسار") ||
        fileNameLower.includes("رد الجهة")
      ) {
        cat = "CLARIFICATIONS";
        sourceTab = "ردود الاستفسارات والتوضيحات";
        env = "المظروف الفني";
      } else if (d.type === "MARKET_STUDY" || fileNameLower.includes("دراسة") || fileNameLower.includes("عرض سعر")) {
        cat = "MARKET_STUDY";
        sourceTab = "دراسة السوق";
        env = "مستندات عامة مشتركة";
      } else if (d.type === "BOOKLET" || fileNameLower.includes("كراسة")) {
        cat = "BOOKLET_INSURANCE";
        sourceTab = "كراسة الشروط والتأمين";
        env = "المظروف الفني";
      } else if (d.type === "RECEIPT" || fileNameLower.includes("إيصال") || fileNameLower.includes("سداد") || fileNameLower.includes("تأمين")) {
        cat = "BOOKLET_INSURANCE";
        sourceTab = "كراسة الشروط والتأمين";
        env = fileNameLower.includes("كراسة") ? "المظروف الفني" : "المظروف المالي";
      }

      list.push({
        id: `op-doc-${d.id}`,
        name: d.fileName || "مستند عملية رسمي",
        description: `مستند مرفوع بحجم ${d.fileSize ? formatDocFileSize(d.fileSize) : "غير محدد"} • ${d.uploadedBy || "مسؤول العملية"}`,
        category: cat,
        sourceTab,
        envelope: env,
        fileType: fType,
        docRef: d,
        size: d.fileSize,
        uploadedAt: d.createdAt,
        isArchived: archivedDocIds.includes(d.id) || archivedDocIds.includes(`op-doc-${d.id}`),
      });
    });

    // ─────────────────────────────────────────────────────────────
    // 2. مستندات الشركة المشاركة المعتمدة من صفحة بيانات الشركة (compDocs)
    // ─────────────────────────────────────────────────────────────
    const initialCompDocs = selectedCompanyRel?.company?.documents || [];
    const compDocsMap = new Map<string, any>();
    initialCompDocs.forEach((d: any) => compDocsMap.set(d.id, d));
    fetchedCompDocs.forEach((d: any) => compDocsMap.set(d.id, d));
    const allCompDocs = Array.from(compDocsMap.values());

    allCompDocs.forEach((cd: any) => {
      // استبعاد أي مستند يخص عمليات أو مناقصات أخرى لضمان عرض ملفات هذه العملية حصرياً
      const fnLower = `${cd.fileName || ""} ${cd.originalFileName || ""}`.toLowerCase();
      const isOtherOpDoc =
        fnLower.includes("كراسة") ||
        fnLower.includes("مزايدة") ||
        fnLower.includes("مناقصة") ||
        fnLower.includes("ممارسة") ||
        fnLower.includes("بوفيه") ||
        fnLower.includes("الكهنة") ||
        fnLower.includes("أمر توريد") ||
        (cd.notes && cd.notes.toLowerCase().includes("عملية"));

      if (isOtherOpDoc) {
        return;
      }

      const rawExt = (cd.fileType || "").toLowerCase();
      const isImg = ["png", "jpg", "jpeg", "webp", "gif"].includes(rawExt);
      const isDocx = ["docx", "doc"].includes(rawExt);
      const isXls = ["xlsx", "xls", "csv"].includes(rawExt);
      const fType: DossierItem["fileType"] = isDocx ? "docx" : isXls ? "xlsx" : isImg ? "image" : "pdf";

      const docTypeLabel =
        cd.type === "COMMERCIAL_REGISTER"
          ? "السجل التجاري المعتمد"
          : cd.type === "TAX_CARD"
          ? "البطاقة الضريبية الرسمية"
          : cd.type === "LICENSE"
          ? "رخصة مزاولة النشاط"
          : cd.type === "CERTIFICATE"
          ? "شهادة التسجيل والقيمة المضافة"
          : cd.type === "CONTRACT"
          ? "عقد التأسيس والاتفاقية"
          : cd.type === "TAX_EXEMPTION"
          ? "شهادة الإعفاء الضريبي"
          : cd.type === "STAMP"
          ? "خاتم الشركة المعتمد"
          : cd.type === "SIGNATURE"
          ? "نموذج التوقيع البنكي المعتمد"
          : "مستند رسمي للشركة";

      const displayName = cd.fileName || docTypeLabel || cd.originalFileName || "مستند رسمي للشركة";

      list.push({
        id: `comp-doc-${cd.id}`,
        name: displayName,
        description: `مستند قانوني معتمد (${docTypeLabel}) لشركة ${selectedCompanyRel?.company?.name || "المشاركة"} • ${cd.fileSize ? formatDocFileSize(cd.fileSize) : ""}`,
        category: "COMPANY_DOCS",
        sourceTab: "مستندات الشركة الرسمية",
        envelope: "المظروف الفني",
        fileType: fType,
        companyDocRef: cd,
        size: cd.fileSize,
        uploadedAt: cd.createdAt,
        isArchived: archivedDocIds.includes(cd.id) || archivedDocIds.includes(`comp-doc-${cd.id}`),
      });
    });

    // ─────────────────────────────────────────────────────────────
    // 3. نماذج وخطابات العطاء الرسمية المعتمدة (فقط الملفات الموجودة فعلياً أو المحفوظة بالأرشيف)
    // ─────────────────────────────────────────────────────────────
    if (clrCloudUrl || archivedDocIds.includes("letter-clarification")) {
      list.push({
        id: "letter-clarification",
        name: "خطاب التوضيح والاستفسارات الرسمي",
        description: "النسخة الرقمية المعتمدة لخطاب التوضيح مع رمز QR الموثق",
        category: "LETTERS",
        sourceTab: "خطابات ومخرجات العطاء",
        envelope: "المظروف الفني",
        fileType: "pdf",
        templateKey: "clarification",
        cloudUrl: clrCloudUrl,
        isArchived: archivedDocIds.includes("letter-clarification"),
      });
    }

    if (techCloudUrl || archivedDocIds.includes("letter-technical")) {
      list.push({
        id: "letter-technical",
        name: "العرض الفني والمواصفات الفنية والبدائل",
        description: "النسخة الرقمية المعتمدة للعرض الفني بالجدول المدمج والبدائل الفنية مع رمز QR",
        category: "LETTERS",
        sourceTab: "خطابات ومخرجات العطاء",
        envelope: "المظروف الفني",
        fileType: "pdf",
        templateKey: "technical",
        cloudUrl: techCloudUrl,
        isArchived: archivedDocIds.includes("letter-technical"),
      });
    }

    if (warrantyCloudUrl || archivedDocIds.includes("letter-warranty")) {
      list.push({
        id: "letter-warranty",
        name: "شهادة الضمان المعتمدة للأصناف الموردة",
        description: "النسخة الرقمية المعتمدة لشهادة الضمان للأصناف مع رمز QR والبنود المستثناة وفترة السريان",
        category: "LETTERS",
        sourceTab: "خطابات ومخرجات العطاء",
        envelope: "المظروف الفني",
        fileType: "pdf",
        templateKey: "technical",
        cloudUrl: warrantyCloudUrl,
        isArchived: archivedDocIds.includes("letter-warranty"),
      });
    }

    if (finCloudUrl || archivedDocIds.includes("letter-financial")) {
      list.push({
        id: "letter-financial",
        name: "العرض المالي وجدول الأسعار والتفقيط",
        description: "النسخة الرقمية المعتمدة للعرض المالي الرسمي بأعمدة سعر الوحدة والإجمالي والتفقيط مع رمز QR",
        category: "LETTERS",
        sourceTab: "خطابات ومخرجات العطاء",
        envelope: "المظروف المالي",
        fileType: "pdf",
        templateKey: "financial",
        cloudUrl: finCloudUrl,
        isArchived: archivedDocIds.includes("letter-financial"),
      });
    }

    if (specsCloudUrl || archivedDocIds.includes("decl-specs")) {
      list.push({
        id: "decl-specs",
        name: "إقرار الالتزام بكراسة الشروط والمواصفات",
        description: "النسخة الرقمية المعتمدة لإقرار الالتزام بالشروط والمواصفات مع رمز QR",
        category: "LETTERS",
        sourceTab: "خطابات ومخرجات العطاء",
        envelope: "المظروف الفني",
        fileType: "pdf",
        templateKey: "specs",
        cloudUrl: specsCloudUrl,
        isArchived: archivedDocIds.includes("decl-specs"),
      });
    }

    if (insCloudUrl || archivedDocIds.includes("decl-insurance")) {
      list.push({
        id: "decl-insurance",
        name: "إقرار الالتزام بالتأمينات والعمالة والمساواة",
        description: "النسخة الرقمية المعتمدة لإقرار التأمينات وحسن معاملة الموظفين مع رمز QR",
        category: "LETTERS",
        sourceTab: "خطابات ومخرجات العطاء",
        envelope: "المظروف الفني",
        fileType: "pdf",
        templateKey: "insurance",
        cloudUrl: insCloudUrl,
        isArchived: archivedDocIds.includes("decl-insurance"),
      });
    }

    if (generalCloudUrl || archivedDocIds.includes("decl-general")) {
      list.push({
        id: "decl-general",
        name: "الخطاب الرسمي العام الموجه لجهة الإسناد",
        description: "النسخة الرقمية المعتمدة للخطاب العام مع رمز QR الموثق",
        category: "LETTERS",
        sourceTab: "خطابات ومخرجات العطاء",
        envelope: "المظروف الفني",
        fileType: "pdf",
        templateKey: "clarification",
        cloudUrl: generalCloudUrl,
        isArchived: archivedDocIds.includes("decl-general"),
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 4. خطابات كراسة الشروط والتأمين الابتدائي المؤرشفة
    // ─────────────────────────────────────────────────────────────
    const bookletLettersMeta = [
      {
        id: "letter-booklet-booklet_withdrawal",
        name: "خطاب سحب كراسة الشروط والمواصفات",
        cloudUrl: bookletCloudUrls["booklet_withdrawal"] || "",
        envelope: "المظروف الفني" as const,
        matchIds: ["letter-booklet-booklet_withdrawal", "letter-booklet"],
      },
      {
        id: "letter-booklet-insurance_payment",
        name: "خطاب سداد التأمين الابتدائي القانوني",
        cloudUrl: bookletCloudUrls["insurance_payment"] || "",
        envelope: "المظروف المالي" as const,
        matchIds: ["letter-booklet-insurance_payment", "letter-booklet-insurance"],
      },
      {
        id: "letter-booklet-booklet_and_insurance",
        name: "خطاب سحب الكراسة وسداد التأمين معاً",
        cloudUrl: bookletCloudUrls["booklet_and_insurance"] || "",
        envelope: "المظروف الفني" as const,
        matchIds: ["letter-booklet-booklet_and_insurance"],
      },
      {
        id: "letter-booklet-bank_guarantee_letter",
        name: "خطاب موجه للبنك لإصدار خطاب ضمان بنكي",
        cloudUrl: bookletCloudUrls["bank_guarantee_letter"] || "",
        envelope: "المظروف المالي" as const,
        matchIds: ["letter-booklet-bank_guarantee_letter"],
      },
    ];

    bookletLettersMeta.forEach((bl) => {
      const isArchived = bl.matchIds.some((mid) => archivedDocIds.includes(mid));
      if (bl.cloudUrl || isArchived) {
        list.push({
          id: bl.id,
          name: bl.name,
          description: `النسخة الرقمية المعتمدة لـ ${bl.name} مع رمز QR الموثق`,
          category: "BOOKLET_INSURANCE",
          sourceTab: "كراسة الشروط والتأمين",
          envelope: bl.envelope,
          fileType: "pdf",
          cloudUrl: bl.cloudUrl,
          isArchived,
        });
      }
    });

    // ─────────────────────────────────────────────────────────────
    // 5. خطابات التأمين النهائي المؤرشفة
    // ─────────────────────────────────────────────────────────────
    const guarTypes = [
      { key: "CASH", label: "خطاب سداد التأمين النهائي نقداً بالخزينة" },
      { key: "BANK_GUARANTEE", label: "خطاب إصدار خطاب ضمان بنكي للتأمين النهائي" },
      { key: "DEDUCTION", label: "خطاب خصم التأمين النهائي من مستحقات عملية أخرى" },
      { key: "INITIAL_TRANSFER", label: "خطاب تحويل التأمين الابتدائي إلى نهائي" },
      { key: "DEDUCTION_AND_TRANSFER", label: "خطاب خصم التأمين النهائي وتحويل التأمين الابتدائي" },
    ];
    guarTypes.forEach((gt) => {
      const gId = `letter-final-guarantee-${gt.key}`;
      const gCloud = guaranteeCloudUrls[gt.key] || "";
      const isArch =
        archivedDocIds.includes(gId) ||
        archivedDocIds.includes("letter-final-guarantee") ||
        archivedDocIds.includes("letter-guarantee");
      if (gCloud || isArch) {
        list.push({
          id: gId,
          name: gt.label,
          description: "النسخة الرقمية المعتمدة لخطاب التأمين النهائي مع رمز QR",
          category: "LETTERS",
          sourceTab: "خطابات ومخرجات العطاء",
          envelope: "المظروف المالي",
          fileType: "pdf",
          cloudUrl: gCloud,
          isArchived: isArch,
        });
      }
    });

    // ─────────────────────────────────────────────────────────────
    // 6. خطابات التظلم واسترداد التأمين المؤرشفة
    // ─────────────────────────────────────────────────────────────
    if (grievanceTechCloudUrl || archivedDocIds.includes("grievance-tech") || archivedDocIds.includes("letter-grievance-tech")) {
      list.push({
        id: "grievance-tech",
        name: "خطاب التظلم الفني الرسمي",
        description: "مذكرة التظلم القانوني من قرارات لجنة البت الفني مع رمز QR",
        category: "LETTERS",
        sourceTab: "خطابات ومخرجات العطاء",
        envelope: "المظروف الفني",
        fileType: "pdf",
        cloudUrl: grievanceTechCloudUrl,
        isArchived: archivedDocIds.includes("grievance-tech") || archivedDocIds.includes("letter-grievance-tech"),
      });
    }

    if (grievanceFinCloudUrl || archivedDocIds.includes("grievance-fin") || archivedDocIds.includes("letter-grievance-fin")) {
      list.push({
        id: "grievance-fin",
        name: "خطاب التظلم المالي الرسمي",
        description: "مذكرة التظلم القانوني من قرارات لجنة البت المالي مع رمز QR",
        category: "LETTERS",
        sourceTab: "خطابات ومخرجات العطاء",
        envelope: "المظروف المالي",
        fileType: "pdf",
        cloudUrl: grievanceFinCloudUrl,
        isArchived: archivedDocIds.includes("grievance-fin") || archivedDocIds.includes("letter-grievance-fin"),
      });
    }

    if (refundCloudUrl || archivedDocIds.includes("letter-refund")) {
      list.push({
        id: "letter-refund",
        name: "خطاب استرداد التأمين النهائي المعتمد",
        description: "النسخة الرسمية لخطاب استرداد التأمين النهائي مع رمز QR",
        category: "LETTERS",
        sourceTab: "خطابات ومخرجات العطاء",
        envelope: "مستندات عامة مشتركة",
        fileType: "pdf",
        cloudUrl: refundCloudUrl,
        isArchived: archivedDocIds.includes("letter-refund"),
      });
    }

    return list;
  }, [
    op.documents,
    selectedCompanyRel?.company?.documents,
    fetchedCompDocs,
    selectedCompanyRel?.company?.name,
    techCloudUrl,
    clrCloudUrl,
    specsCloudUrl,
    insCloudUrl,
    finCloudUrl,
    warrantyCloudUrl,
    generalCloudUrl,
    bookletCloudUrls,
    guaranteeCloudUrls,
    refundCloudUrl,
    grievanceTechCloudUrl,
    grievanceFinCloudUrl,
    archivedDocIds,
  ]);

  // حالة تحديد الملفات للـ ZIP
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds(packageFiles.map((f) => f.id));
  }, [packageFiles.length]);

  // إحصائيات الفئات الذكية
  const bookletInsuranceCount = useMemo(
    () => packageFiles.filter((f) => f.category === "BOOKLET_INSURANCE" || f.category === "RECEIPTS").length,
    [packageFiles]
  );
  const clarificationsCount = useMemo(
    () => packageFiles.filter((f) => f.category === "CLARIFICATIONS").length,
    [packageFiles]
  );
  const companyDocsCount = useMemo(
    () => packageFiles.filter((f) => f.category === "COMPANY_DOCS").length,
    [packageFiles]
  );
  const marketStudyCount = useMemo(
    () => packageFiles.filter((f) => f.category === "MARKET_STUDY").length,
    [packageFiles]
  );
  const lettersCount = useMemo(
    () => packageFiles.filter((f) => f.category === "LETTERS").length,
    [packageFiles]
  );
  const techCount = useMemo(
    () => packageFiles.filter((f) => f.envelope === "المظروف الفني").length,
    [packageFiles]
  );
  const archiveDocsCount = useMemo(
    () => packageFiles.filter((f) => f.isArchived).length,
    [packageFiles]
  );
  const finCount = useMemo(
    () => packageFiles.filter((f) => f.envelope === "المظروف المالي").length,
    [packageFiles]
  );

  // تصفية الملفات بحسب الفئة النشطة
  const filteredFiles = useMemo(() => {
    if (activeCategory === "ALL") return packageFiles;
    if (activeCategory === "ARCHIVE_ONLY") {
      return packageFiles.filter((f) => f.isArchived);
    }
    if (activeCategory === "BOOKLET_INSURANCE") {
      return packageFiles.filter((f) => f.category === "BOOKLET_INSURANCE" || f.category === "RECEIPTS");
    }
    if (activeCategory === "CLARIFICATIONS") {
      return packageFiles.filter((f) => f.category === "CLARIFICATIONS");
    }
    if (activeCategory === "COMPANY_DOCS") {
      return packageFiles.filter((f) => f.category === "COMPANY_DOCS");
    }
    if (activeCategory === "MARKET_STUDY") {
      return packageFiles.filter((f) => f.category === "MARKET_STUDY");
    }
    if (activeCategory === "LETTERS") {
      return packageFiles.filter((f) => f.category === "LETTERS");
    }
    if (activeCategory === "TECH_ENVELOPE") {
      return packageFiles.filter((f) => f.envelope === "المظروف الفني");
    }
    if (activeCategory === "FIN_ENVELOPE") {
      return packageFiles.filter((f) => f.envelope === "المظروف المالي");
    }
    return packageFiles;
  }, [packageFiles, activeCategory]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredFiles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredFiles.map((f) => f.id));
    }
  };

  const toggleSelectFile = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // ━━━ دالة جلب محتوى المستند الفعلي كـ Blob بالصيغة الأصلية بدون تحويل ━━━
  const fetchFileBlob = async (item: DossierItem): Promise<{ blob: Blob; fileName: string }> => {
    const safeTitle = item.name.replace(/[/\\?%*:|"<>]/g, "_");

    // 1. إذا كان مستند عملية مرفوع
    if (item.docRef) {
      const res = await api.get(`/operations/${op.id}/documents/${item.docRef.id}/file`, {
        responseType: "blob",
      });
      let finalName = item.docRef.fileName || safeTitle;
      const rawExt = (item.docRef.fileType || item.fileType || "").toLowerCase();
      if (rawExt && !finalName.toLowerCase().endsWith(`.${rawExt}`)) {
        finalName = `${finalName}.${rawExt}`;
      }
      return { blob: res.data, fileName: finalName };
    }

    // 2. إذا كان مستند شركة مرفوع
    if (item.companyDocRef) {
      const compId = selectedCompanyRel?.companyId || selectedCompanyRel?.company?.id;
      const res = await api.get(`/companies/${compId}/documents/${item.companyDocRef.id}/file`, {
        responseType: "blob",
      });
      let finalName = item.companyDocRef.originalFileName || item.companyDocRef.fileName || safeTitle;
      const rawExt = (item.companyDocRef.fileType || item.fileType || "").toLowerCase();
      if (rawExt && !finalName.toLowerCase().endsWith(`.${rawExt}`)) {
        finalName = `${finalName}.${rawExt}`;
      }
      return {
        blob: res.data,
        fileName: finalName,
      };
    }

    // 3. إذا كان رابط سحابي معتمد (PDF)
    if (item.cloudUrl) {
      try {
        const res = await api.get("/operations/download-remote-file", {
          params: { url: item.cloudUrl, fileName: `${safeTitle}.pdf` },
          responseType: "blob",
        });
        if (res.data) {
          return { blob: res.data, fileName: `${safeTitle}.pdf` };
        }
      } catch (proxyErr) {
        console.warn("Backend proxy download failed, trying direct fetch:", proxyErr);
        try {
          const res = await fetch(item.cloudUrl);
          if (res.ok) {
            const blob = await res.blob();
            return { blob, fileName: `${safeTitle}.pdf` };
          }
        } catch {}
      }
    }

    // 4. إذا كان الخطاب من خطابات العطاء المؤرشفة، قم بتوليد مستند PDF الرسمي فورياً
    try {
      const generated = await generateUniversalLetterPdfBlob(item.id, op, selectedCompanyRel);
      if (generated && generated.blob && generated.blob.size > 500) {
        return {
          blob: generated.blob,
          fileName: `${safeTitle}.pdf`,
        };
      }
    } catch (genErr) {
      console.warn("Universal letter generation in fetchFileBlob failed:", genErr);
    }

    throw new Error(`تعذر استخراج أو توليد ملف الـ PDF الرسمي للمستند (${item.name})`);
  };

  // ━━━ دالة المعاينة الفورية الشاملة للمستند ━━━
  const handlePreviewItem = async (item: DossierItem) => {
    try {
      toast.info(`جاري فتح ومعاينة المستند الرسمي (${item.name})...`);
      const { blob, fileName } = await fetchFileBlob(item);
      const isPdf =
        fileName.toLowerCase().endsWith(".pdf") ||
        item.fileType === "pdf" ||
        blob.type === "application/pdf";

      onPreviewDoc?.({
        id: item.docRef?.id || item.companyDocRef?.id || item.id,
        blob,
        fileName: fileName || `${item.name}.pdf`,
        filePath: item.cloudUrl || item.companyDocRef?.filePath || item.docRef?.filePath,
        fileType: isPdf ? "pdf" : item.fileType,
      });
    } catch (err: any) {
      console.warn("handlePreviewItem direct fetch failed, attempting emergency universal generation:", err);
      try {
        const generated = await generateUniversalLetterPdfBlob(item.id, op, selectedCompanyRel);
        if (generated && generated.blob && generated.blob.size > 500) {
          onPreviewDoc?.({
            id: item.id,
            blob: generated.blob,
            fileName: `${item.name}.pdf`,
            fileType: "pdf",
          });
          return;
        }
      } catch {}

      toast.error(err?.message || "تعذر معاينة المستند");
    }
  };

  // ━━━ تعديل اسم المستند وحفظه بالباك إند ━━━
  const startRename = (doc: any) => {
    setRenamingDocId(doc.id);
    setRenameValue(doc.fileName || "");
  };

  const handleSaveRename = async (docId: string) => {
    if (!renameValue.trim()) {
      toast.error("اسم المستند لا يمكن أن يكون فارغاً");
      return;
    }
    setSavingRename(true);
    try {
      await api.patch(`/operations/${op.id}/documents/${docId}`, {
        fileName: renameValue.trim(),
      });
      toast.success("تم تعديل اسم المستند بنجاح! ✏️");
      setRenamingDocId(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل تعديل اسم المستند");
    } finally {
      setSavingRename(false);
    }
  };

  // ━━━ استبدال وتحديث الملف بالباك إند ━━━
  const triggerFileReplace = (docId: string) => {
    setReplacingDocId(docId);
    replaceFileInputRef.current?.click();
  };

  const handleFileReplaced = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingDocId) return;

    setReplacingLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name.replace(/\.[^/.]+$/, ""));

      await api.put(`/operations/${op.id}/documents/${replacingDocId}/file`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("تم استبدال وتحديث الملف بنجاح! 🔄");
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل استبدال الملف");
    } finally {
      setReplacingLoading(false);
      setReplacingDocId(null);
      if (replaceFileInputRef.current) replaceFileInputRef.current.value = "";
    }
  };

  // ━━━ حذف المستند من أرشيف العملية ━━━
  const handleDeleteDoc = async (docId: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا المستند من أرشيف العملية؟")) return;
    setDeletingDocId(docId);
    try {
      await api.delete(`/operations/${op.id}/documents/${docId}`);
      toast.success("تم حذف المستند بنجاح 🗑️");
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل حذف المستند");
    } finally {
      setDeletingDocId(null);
    }
  };

  // ━━━ تحميل مستند منفرد مباشرة إلى جهاز المستخدم ━━━
  const handleDownloadSingleItem = async (item: DossierItem) => {
    setDownloadingId(item.id);
    toast.info(`جاري تحميل ملف "${item.name}" مباشرة... ⏳`);

    try {
      const { blob, fileName } = await fetchFileBlob(item);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`تم تحميل الملف (${fileName}) بنجاح! 📥`);
    } catch (err: any) {
      console.error("Download error:", err);
      // في حالة فشل التحميل المباشر للرابط السحابي بسبب CORS افتح الرابط بنافذة جديدة
      if (item.cloudUrl) {
        window.open(item.cloudUrl, "_blank");
        toast.success("تم فتح النسخة السحابية المعتمدة للمستند! 🚀");
      } else {
        toast.error("حدث خطأ أثناء تحميل الملف");
      }
    } finally {
      setDownloadingId(null);
    }
  };

  // ━━━ تجميع وتحميل الملفات المحددة في ملف ZIP مضغوط ━━━
  const handleDownloadZipPackage = async () => {
    if (selectedIds.length === 0) {
      toast.warning("يرجى اختيار ملف واحد على الأقل للتحميل");
      return;
    }

    setPackagingZip(true);
    toast.info(`جاري تجميع وحزم (${selectedIds.length}) ملف في مجلد ZIP منظم... ⏳`);

    try {
      const zip = new JSZip();

      // المجلدات الداخلية للحزمة
      const lettersFolder = zip.folder("01_خطابات_وقوالب_العطاء_المعتمدة");
      const techFolder = zip.folder("02_المظروف_الفني");
      const finFolder = zip.folder("03_المظروف_المالي");
      const compFolder = zip.folder("04_مستندات_الشركة_القانونية_والإدارية");
      const receiptsFolder = zip.folder("05_الإيصالات_والضمانات_البنكية");

      const filesToInclude = packageFiles.filter((f) => selectedIds.includes(f.id));

      for (const item of filesToInclude) {
        let targetFolder = techFolder;
        if (item.category === "LETTERS") targetFolder = lettersFolder;
        else if (item.category === "COMPANY_DOCS") targetFolder = compFolder;
        else if (item.category === "FINANCIAL" || item.envelope === "المظروف المالي") targetFolder = finFolder;
        else if (item.category === "RECEIPTS") targetFolder = receiptsFolder;

        try {
          const { blob, fileName } = await fetchFileBlob(item);
          targetFolder?.file(fileName, blob);
        } catch (e) {
          console.warn(`Failed to include file ${item.name}:`, e);
        }
      }

      // إضافة كشف محتويات العطاء الرسمي
      const manifest =
        `=========================================================================\n` +
        `كشف تسليم محتويات حزمة المظاريف والعطاء الرسمي\n` +
        `=========================================================================\n` +
        `العملية: ${op.name}\n` +
        `رقم العملية لدى الجهة: ${op.externalNumber || op.serialNumber}\n` +
        `جهة الإسناد: ${op.authority}\n` +
        `الشركة المتقدمة: ${selectedCompanyRel?.company?.name || "شركة مسجلة"}\n` +
        `كود الشركة المسجل: ${selectedCompanyRel?.displayCode || "A1"}\n` +
        `إجمالي الملفات المتضمنة بالحزمة: ${filesToInclude.length} ملف\n` +
        `تاريخ ووقت استخراج الحزمة: ${new Date().toLocaleString("ar-EG")}\n` +
        `=========================================================================\n\n` +
        `قائمة الملفات المرفقة بالحزمة:\n` +
        filesToInclude.map((f, i) => `${i + 1}. [${f.envelope}] - ${f.name} (${f.description})`).join("\n");

      zip.file("00_كشف_محتويات_حزمة_العطاء_الرسمي.txt", manifest);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `حزمة_عطاء_${selectedCompanyRel?.displayCode || "A"}_${op.externalNumber || op.serialNumber}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`تم تحميل حزمة العطاء الكاملة ZIP (${filesToInclude.length} ملف) بنجاح! 📦🎉`);
    } catch (err) {
      console.error("ZIP packaging error:", err);
      toast.error("حدث خطأ أثناء تجميع ملفات الحزمة المضغوطة");
    } finally {
      setPackagingZip(false);
    }
  };

  // ━━━ توثيق تقديم العطاء رسمياً ━━━
  const handleSaveSubmission = async () => {
    if (!receiptNumber) {
      toast.error("يرجى إدخال رقم إيصال سحب الكراسة / تسليم العطاء");
      return;
    }
    setSavingSubmission(true);
    try {
      await api.post(`/operations/${op.id}/submissions`, {
        companyId: selectedCompanyId,
        submissionDate,
        receiptNumber,
        notes: `المستلم: ${recipientPerson} | ${notes}`,
      });
      toast.success("تم تسجيل تقديم العطاء بالجهة رسمياً وتوثيق التسليم بنجاح! 🚀");
      setAddingSubmission(false);
      onRefresh();
    } catch {
      toast.error("فشل تسجيل تقديم العطاء");
    } finally {
      setSavingSubmission(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hidden file input for document replacement */}
      <input
        ref={replaceFileInputRef}
        type="file"
        onChange={handleFileReplaced}
        className="hidden"
      />

      <SectionCard
        title="تجهيز وطباعة وحزم ملفات التقديم الرسمي"
        icon={Package}
        iconColor="text-blue-600"
        badge={
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-[10px] font-bold">
              {packageFiles.length} مستند متاح بالحزمة
            </Badge>
            <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[10px] font-bold">
              {op.submissions?.length || 0} تقديم موثق
            </Badge>
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={handleDownloadZipPackage}
              disabled={packagingZip || selectedIds.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer shadow-md flex items-center gap-1.5"
            >
              {packagingZip ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>جاري الضغط والحزم...</span>
                </>
              ) : (
                <>
                  <FileArchive className="h-3.5 w-3.5" />
                  <span>تحميل الملفات المحددة في ZIP ({selectedIds.length})</span>
                </>
              )}
            </Button>

            <Button
              size="sm"
              onClick={() => setAddingSubmission(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 rounded-xl cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              <span>توثيق تسليم العطاء للجهة</span>
            </Button>
          </div>
        }
      >
        {/* اختيار الشركة الحالية لتخصيص المستندات */}
        <div className="p-4 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-black text-foreground block">
                الشركة المشاركة بالعطاء وحزمة التقديم:
              </span>
              <span className="text-[11px] text-muted-foreground">
                اختر الشركة ليتم جلب وتضمين مستنداتها القانونية الخاصة بها تلقائياً ضمن الحزمة
              </span>
            </div>
          </div>

          <div className="w-full sm:w-72">
            <Select value={selectedCompanyId} onValueChange={(val) => setSelectedCompanyId(val || "")}>
              <SelectTrigger className="h-9.5 text-xs font-bold text-right cursor-pointer bg-card rounded-xl">
                <SelectValue placeholder="اختر الشركة">
                  {selectedCompanyRel?.company?.name
                    ? `${selectedCompanyRel.company.name} (${selectedCompanyRel.displayCode || "A"})`
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
        </div>

        {/* نافذة عائمة: تسجيل وتوثيق تسليم العطاء بمقر الجهة */}
        {addingSubmission && (
          <Portal>
            <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
              <div className="bg-background border border-border w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
                <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md">
                      <Send className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-foreground">
                        توثيق تسليم العطاء رسمياً بمقر جهة الإسناد
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        تسجيل محضر وإيصال استلام المظاريف الفنية والمالية طبقاً للقانون 182 لسنة 2018
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAddingSubmission(false)}
                    className="h-8 w-8 rounded-full hover:bg-muted cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="p-5 sm:p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold">الشركة المقدمة *</Label>
                      <Input
                        value={`${selectedCompanyRel?.company?.name || "الشركة"} (${selectedCompanyRel?.displayCode || "A1"})`}
                        disabled
                        className="h-9 text-xs font-bold bg-muted/40 cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1">
                      <SmartArabicDatePicker
                        label="تاريخ وساعة التسليم الفعلي"
                        required
                        value={submissionDate}
                        onChange={(val) => setSubmissionDate(val)}
                        outputFormat="iso"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold">رقم إيصال الاستلام / قيد المظروف *</Label>
                      <Input
                        value={receiptNumber}
                        onChange={(e) => setReceiptNumber(e.target.value)}
                        placeholder="مثال: قيد رقم 148 / وارد خزينة"
                        className="h-9 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold">اسم المستلم بالجهة / أمانة سر اللجنة</Label>
                      <Input
                        value={recipientPerson}
                        onChange={(e) => setRecipientPerson(e.target.value)}
                        placeholder="مثال: السيد / أمين سر لجنة فتح المظاريف"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold">ملاحظات التسليم والمحضر</Label>
                      <Input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="مثال: تم تسليم المظروفين الفني والمالي مغلقين بالشمع ومختومين"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-800 dark:text-purple-300 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
                    <span>يتم توثيق محضر الاستلام وحفظه بالسجلات الرسمية للعملية مع ربطه بالشركة المتقدمة.</span>
                  </div>
                </div>

                <div className="p-4 bg-muted/30 border-t border-border flex justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddingSubmission(false)}
                    className="rounded-xl h-9 text-xs cursor-pointer"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveSubmission}
                    disabled={savingSubmission}
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold h-9 text-xs cursor-pointer shadow-md flex items-center gap-1.5 px-4"
                  >
                    {savingSubmission ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    <span>حفظ وتوثيق التسليم رسمياً ✓</span>
                  </Button>
                </div>
              </div>
            </div>
          </Portal>
        )}

        {/* ━━━ جدول ملفات التقديم مع أزرار الفلترة والتحديد والتحميل المباشر ━━━ */}
        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border space-y-4 shadow-sm">
          {/* شريط الفلاتر والتصنيفات */}
          <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: "ALL", label: `كافة الملفات (${packageFiles.length})`, icon: Layers },
                { id: "ARCHIVE_ONLY", label: `مستندات الأرشيف (${archiveDocsCount})`, icon: Archive },
                { id: "BOOKLET_INSURANCE", label: `الكراسة والتأمين (${bookletInsuranceCount})`, icon: Receipt },
                { id: "CLARIFICATIONS", label: `الاستفسارات والملاحق (${clarificationsCount})`, icon: HelpCircle },
                { id: "MARKET_STUDY", label: `دراسة السوق (${marketStudyCount})`, icon: TrendingUp },
                { id: "COMPANY_DOCS", label: `مستندات الشركة الرسمية (${companyDocsCount})`, icon: Building2 },
                { id: "LETTERS", label: `نماذج ومخرجات العطاء (${lettersCount})`, icon: FileText },
                { id: "TECH_ENVELOPE", label: `المظروف الفني (${techCount})`, icon: FileCheck },
                { id: "FIN_ENVELOPE", label: `المظروف المالي (${finCount})`, icon: Coins },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategory(tab.id as FileCategory)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                className="h-8 px-3 text-xs font-bold rounded-xl border-border hover:bg-muted cursor-pointer flex items-center gap-1.5"
              >
                {selectedIds.length === filteredFiles.length && filteredFiles.length > 0 ? (
                  <>
                    <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
                    <span>إلغاء التحديد</span>
                  </>
                ) : (
                  <>
                    <Square className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>تحديد الكل ({filteredFiles.length})</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* شريط مؤشر التحديد مع زر التحميل السريع */}
          <div className="flex items-center justify-between px-2 text-xs text-muted-foreground flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span>تم اختيار:</span>
              <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs font-bold">
                {selectedIds.length} من أصل {packageFiles.length} ملف
              </Badge>
            </div>

            <div className="text-[11px] text-muted-foreground">
              يمكنك معاينة أي ملف أو تحميله مباشرة، واستخدام أزرار التعديل والاستبدال والحذف لإدارة المستندات المرفوعة
            </div>
          </div>

          {/* قائمة الملفات */}
          {filteredFiles.length > 0 ? (
            <div className="divide-y divide-border/80 rounded-2xl border border-border overflow-hidden bg-background/50">
              {filteredFiles.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const isDownloadingThis = downloadingId === item.id;
                const isRenamingThis = renamingDocId === item.docRef?.id;
                const isReplacingThis = replacingLoading && replacingDocId === item.docRef?.id;
                const isDeletingThis = deletingDocId === item.docRef?.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelectFile(item.id)}
                    className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 text-xs transition-all cursor-pointer select-none ${
                      isSelected
                        ? "bg-blue-500/5 hover:bg-blue-500/10 border-r-4 border-r-blue-600"
                        : "hover:bg-muted/40 opacity-85"
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectFile(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-border cursor-pointer shrink-0"
                      />

                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                          item.fileType === "docx"
                            ? "bg-blue-500/15 text-blue-600 border border-blue-500/30 font-mono"
                            : item.fileType === "pdf"
                            ? "bg-rose-500/15 text-rose-600 border border-rose-500/30 font-mono"
                            : item.fileType === "xlsx"
                            ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 font-mono"
                            : item.fileType === "image"
                            ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                            : "bg-indigo-500/15 text-indigo-600 border border-indigo-500/30"
                        }`}
                      >
                        {item.fileType === "docx" ? (
                          "DOC"
                        ) : item.fileType === "pdf" ? (
                          "PDF"
                        ) : item.fileType === "xlsx" ? (
                          "XLS"
                        ) : item.fileType === "image" ? (
                          <ImageIcon className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </div>

                      <div className="min-w-0 truncate space-y-1 flex-1">
                        {isRenamingThis ? (
                          <div className="flex items-center gap-2 py-0.5" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              className="h-7 text-xs font-bold w-60 sm:w-80 bg-background"
                              autoFocus
                              placeholder="اسم المستند الجديد"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveRename(item.docRef.id);
                                if (e.key === "Escape") setRenamingDocId(null);
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSaveRename(item.docRef.id)}
                              disabled={savingRename}
                              className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg cursor-pointer"
                              title="حفظ الاسم الجديد"
                            >
                              {savingRename ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRenamingDocId(null)}
                              className="h-7 px-2 text-xs rounded-lg cursor-pointer"
                              title="إلغاء"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-extrabold text-foreground truncate text-xs sm:text-sm">
                              {item.name}
                            </p>
                            <Badge
                              className={`text-[9px] font-bold ${
                                item.envelope === "المظروف الفني"
                                  ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30"
                                  : item.envelope === "المظروف المالي"
                                  ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30"
                                  : "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30"
                              }`}
                            >
                              {item.envelope}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] font-medium text-muted-foreground border-border">
                              {item.sourceTab}
                            </Badge>
                            {item.cloudUrl && (
                              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[9px] font-bold">
                                سحابي موثق ✓
                              </Badge>
                            )}
                            {item.isArchived && (
                              <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[9px] font-bold">
                                مضاف للأرشيف 📦
                              </Badge>
                            )}
                          </div>
                        )}
                        <span className="text-[11px] text-muted-foreground block truncate">
                          {item.description}
                          {item.size ? ` • ${formatDocFileSize(item.size)}` : ""}
                          {` • صيغة ${item.fileType.toUpperCase()}`}
                          {item.uploadedAt ? ` • تم الرفع: ${new Date(item.uploadedAt).toLocaleDateString("ar-EG")}` : ""}
                        </span>
                      </div>
                    </div>

                    {/* أزرار الإجراءات والتحكم للمستند */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* زر الإضافة إلى مستندات الأرشيف */}
                      <Button
                        size="sm"
                        variant={item.isArchived ? "secondary" : "outline"}
                        onClick={() => handleToggleDocArchive(item.id)}
                        className={`h-8.5 px-2 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1 transition-all ${
                          item.isArchived
                            ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-500/25"
                            : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                        title={item.isArchived ? "المستند مضاف للأرشيف (انقر للإزالة من الأرشيف)" : "انقر لإضافة هذا المستند إلى مستندات الأرشيف"}
                      >
                        <Archive className="h-3.5 w-3.5 text-purple-600" />
                        <span className="hidden sm:inline">{item.isArchived ? "بالأرشيف ✓" : "إضافة للأرشيف"}</span>
                      </Button>

                      {/* زر المعاينة */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreviewItem(item)}
                        className="h-8.5 px-2.5 text-xs font-bold rounded-xl border-border hover:bg-muted cursor-pointer flex items-center gap-1"
                        title="معاينة المستند"
                      >
                        <Eye className="h-3.5 w-3.5 text-blue-600" />
                        <span className="hidden sm:inline">معاينة</span>
                      </Button>

                      {/* زر التحميل الفوري */}
                      <Button
                        size="sm"
                        onClick={() => handleDownloadSingleItem(item)}
                        disabled={isDownloadingThis}
                        className="h-8.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5 transition-all"
                        title="تحميل الملف مباشرة إلى جهازك"
                      >
                        {isDownloadingThis ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ArrowDownToLine className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline">تحميل مباشر</span>
                      </Button>

                      {/* أدوات إضافية لمستندات العملية القابلة للتعديل */}
                      {item.docRef && (
                        <div className="flex items-center gap-0.5 border-r border-border pr-1 mr-1">
                          {/* تعديل الاسم */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startRename(item.docRef)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-xl cursor-pointer"
                            title="تعديل اسم المستند"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-amber-600" />
                          </Button>

                          {/* استبدال الملف */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => triggerFileReplace(item.docRef.id)}
                            disabled={isReplacingThis}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-xl cursor-pointer"
                            title="استبدال وتحديث الملف بملف جديد"
                          >
                            {isReplacingThis ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                            )}
                          </Button>

                          {/* حذف المستند */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteDoc(item.docRef.id)}
                            disabled={isDeletingThis}
                            className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 rounded-xl cursor-pointer"
                            title="حذف المستند من أرشيف العملية"
                          >
                            {isDeletingThis ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Package}
              text="لا توجد ملفات ضمن هذه الفئة المختارة"
              subtext="اختر فئة أخرى أو اعرض كافة الملفات"
            />
          )}
        </div>

        {/* سجل إيصالات التقديم المسجلة */}
        {op.submissions && op.submissions.length > 0 && (
          <div className="space-y-3 pt-2">
            <h5 className="text-xs font-black text-foreground flex items-center gap-2">
              <Send className="h-4 w-4 text-purple-600" />
              <span>سجل إيصالات التقديم الرسمية الموثقة ({op.submissions.length})</span>
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {op.submissions.map((sub: any) => (
                <div
                  key={sub.id}
                  className="p-3.5 rounded-2xl bg-card border border-border space-y-2 shadow-xs hover:border-purple-500/30 transition-all"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <span className="text-xs font-bold text-foreground">
                      شركة {(op.companies || []).find((c: any) => c.company.id === sub.companyId || c.companyId === sub.companyId)?.company?.name || "—"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                        مقدم رسمياً ✓
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setViewingSubmission(sub)}
                        className="h-7 w-7 p-0 rounded-lg text-purple-600 hover:bg-purple-500/10 cursor-pointer"
                        title="عرض تفاصيل الإيصال في نافذة عائمة"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <DataRow label="تاريخ التقديم" value={formatDate(sub.submissionDate)} />
                  <DataRow label="رقم إيصال الاستلام" value={sub.receiptNumber} mono />
                  {sub.notes && (
                    <p className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-lg font-mono truncate">
                      {sub.notes}
                    </p>
                  )}
                  <div className="pt-1 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewingSubmission(sub)}
                      className="h-7 px-2.5 text-[11px] font-bold rounded-xl border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>عرض كامل التفاصيل</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ━━━ نافذة عائمة: استعراض تفاصيل إيصال ومحضر التسليم الرسمي ━━━ */}
        {viewingSubmission && (
          <Portal>
            <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
              <div className="bg-background border border-border w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
                <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md">
                      <Eye className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-foreground">
                        تفاصيل إيصال ومحضر استلام العطاء الموثق
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        بيانات استلام المظاريف الرسمية لدى لجنة فض المظاريف
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewingSubmission(null)}
                    className="h-8 w-8 rounded-full hover:bg-muted cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="p-5 sm:p-6 space-y-3.5">
                  <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-purple-700 dark:text-purple-300 font-bold block">
                        الشركة المتقدمة بالعطاء:
                      </span>
                      <span className="text-sm font-extrabold text-foreground">
                        شركة {(op.companies || []).find((c: any) => c.company.id === viewingSubmission.companyId || c.companyId === viewingSubmission.companyId)?.company?.name || "جولدن"}
                      </span>
                    </div>
                    <Badge className="bg-purple-600 text-white text-xs font-bold px-3 py-1">
                      مقدم رسمياً ✓
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-card border border-border">
                      <span className="text-[11px] text-muted-foreground block">رقم إيصال الاستلام / القيد:</span>
                      <span className="text-sm font-mono font-bold text-foreground">{viewingSubmission.receiptNumber || "—"}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border">
                      <span className="text-[11px] text-muted-foreground block">تاريخ وساعة التقديم:</span>
                      <span className="text-sm font-bold text-foreground">{formatDate(viewingSubmission.submissionDate)}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                    <span className="text-[11px] text-muted-foreground block">المستلم بجهة الإسناد / أمانة سر اللجنة:</span>
                    <span className="text-xs font-bold text-foreground">
                      {viewingSubmission.notes?.includes("|") 
                        ? viewingSubmission.notes.split("|")[0].replace("المستلم:", "").trim()
                        : "سكرتارية لجنة فض المظاريف بالجهة الإدارية"}
                    </span>
                  </div>

                  {viewingSubmission.notes && (
                    <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                      <span className="text-[11px] text-muted-foreground block">ملاحظات ومحضر الاستلام:</span>
                      <p className="text-xs font-mono text-foreground leading-relaxed whitespace-pre-wrap">
                        {viewingSubmission.notes}
                      </p>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>تم توثيق هذا الإيصال واعتماده وفقاً لأحكام القانون رقم 182 لسنة 2018 ولائحته التنفيذية.</span>
                  </div>
                </div>

                <div className="p-4 bg-muted/30 border-t border-border flex justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.print()}
                    className="rounded-xl h-9 text-xs font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="h-3.5 w-3.5 text-blue-600" />
                    <span>طباعة الإيصال</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setViewingSubmission(null)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold h-9 text-xs cursor-pointer shadow-md px-4"
                  >
                    إغلاق النافذة
                  </Button>
                </div>
              </div>
            </div>
          </Portal>
        )}

        {/* ━━━ نافذة كشف تسليم محتويات المظاريف القابل للطباعة ━━━ */}
        {checklistOpen && (
          <Portal>
            <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
              <div className="bg-background border border-border w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                      <Printer className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">
                        كشف استلام ومحتويات حزمة المظاريف الرسمية
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        كشف رسمي بمحتويات العطاء لتسليمه للجنة فض المظاريف والاعتماد
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => window.print()}
                      className="h-8.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>طباعة الكشف</span>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setChecklistOpen(false)}
                      className="h-8.5 w-8.5 rounded-xl cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white text-slate-900 font-sans" dir="rtl">
                  <div className="border-b-2 border-slate-900 pb-3 mb-5 flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-black text-slate-900">
                        {selectedCompanyRel?.company?.name || "شركة جولدن إيجل للتوريدات العامة"}
                      </h2>
                      <p className="text-xs text-slate-600">
                        كشف رسمي بتسليم محتويات حزمة المظاريف والعطاء الحكومي
                      </p>
                    </div>
                    <div className="text-left text-xs font-mono space-y-0.5">
                      <div>التاريخ: {new Date().toLocaleDateString("ar-EG")}</div>
                      <div>كود العملية: {selectedCompanyRel?.displayCode || op.externalNumber || op.serialNumber}</div>
                      <div>رقم القيد: AZ26101700001</div>
                    </div>
                  </div>

                  <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-300 text-xs mb-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div><strong>اسم العملية:</strong> {op.name}</div>
                    <div><strong>جهة الإسناد:</strong> {op.authority}</div>
                    <div><strong>رقم كراسة العملية:</strong> {op.externalNumber || op.serialNumber}</div>
                    <div><strong>مقر التسليم:</strong> إدارة المشتريات والتعاقدات الحكومية</div>
                  </div>

                  <table className="w-full text-right text-xs border border-slate-700 border-collapse mb-6">
                    <thead className="bg-slate-200 font-bold border-b border-slate-700">
                      <tr>
                        <th className="p-2 border border-slate-700 text-center w-10">م</th>
                        <th className="p-2 border border-slate-700">بيان المستند / المرفق الرسمي</th>
                        <th className="p-2 border border-slate-700 w-32 text-center">المظروف التابع له</th>
                        <th className="p-2 border border-slate-700 w-28 text-center">حالة الإرفاق</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {packageFiles
                        .filter((f) => selectedIds.includes(f.id))
                        .map((f, idx) => (
                          <tr key={f.id}>
                            <td className="p-2 border border-slate-700 text-center font-bold">{idx + 1}</td>
                            <td className="p-2 border border-slate-700 font-semibold">{f.name}</td>
                            <td className="p-2 border border-slate-700 text-center">{f.envelope}</td>
                            <td className="p-2 border border-slate-700 text-center font-bold text-emerald-800">
                              مرفق ومختوم ✓
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>

                  <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-400 text-xs">
                    <div className="space-y-4">
                      <div className="font-bold">مندوب الشركة المسلِّم:</div>
                      <div>الاسم: ............................................</div>
                      <div>الرقم القومي: ....................................</div>
                      <div>التوقيع: .........................................</div>
                    </div>
                    <div className="space-y-4">
                      <div className="font-bold">المستلم بجهة الإسناد / أمانة لجنة فض المظاريف:</div>
                      <div>الاسم: ............................................</div>
                      <div>رقم قيد المظروف والتاريخ: ........................</div>
                      <div>خاتم شعار الجمهورية / جهة الإسناد: [ ............ ]</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        )}
      </SectionCard>

      {/* شريط التنقل السفلي */}
      <StepFooterNav
        currentTabId="submission_package"
        onNavigate={onNavigate}
        prevLabel="← #8 الإقرارات والتعهدات الرسمية"
        nextLabel="الانتقال إلى: #10 نتيجة البت الفني والطعون ➔"
      />
    </div>
  );
}
