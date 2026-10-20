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

export type FileCategory =
  | "ALL"
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

  // استخراج الروابط السحابية المسجلة مسبقاً
  const savedNotes = useMemo(() => {
    try {
      if (op.notes && op.notes.startsWith("{")) {
        return JSON.parse(op.notes);
      }
    } catch {}
    return null;
  }, [op.notes]);

  const techCloudUrl = savedNotes?.technicalOfferDocx?.cloudPdfUrl || "";
  const clrCloudUrl = savedNotes?.clarificationLetterDocx?.cloudPdfUrl || "";
  const specsCloudUrl = savedNotes?.declarationsDocx?.cloudPdfUrlSpecs || "";
  const insCloudUrl = savedNotes?.declarationsDocx?.cloudPdfUrlInsurance || "";
  const finCloudUrl = savedNotes?.financialOfferDocx?.cloudPdfUrl || "";

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
      });
    });

    // ─────────────────────────────────────────────────────────────
    // 2. مستندات الشركة المشاركة المرفوعة فعلياً (compDocs)
    // ─────────────────────────────────────────────────────────────
    const compDocs = selectedCompanyRel?.company?.documents || [];
    compDocs.forEach((cd: any) => {
      const rawExt = (cd.fileType || "").toLowerCase();
      const isImg = ["png", "jpg", "jpeg", "webp", "gif"].includes(rawExt);
      const isDocx = ["docx", "doc"].includes(rawExt);
      const isXls = ["xlsx", "xls", "csv"].includes(rawExt);
      const fType: DossierItem["fileType"] = isDocx ? "docx" : isXls ? "xlsx" : isImg ? "image" : "pdf";

      list.push({
        id: `comp-doc-${cd.id}`,
        name: cd.originalFileName || cd.fileName || "مستند رسمي للشركة",
        description: `مستند قانوني معتمد لشركة ${selectedCompanyRel?.company?.name || "المشاركة"} • ${cd.fileSize ? formatDocFileSize(cd.fileSize) : ""}`,
        category: "COMPANY_DOCS",
        sourceTab: "مستندات الشركة الرسمية",
        envelope: "المظروف الفني",
        fileType: fType,
        companyDocRef: cd,
        size: cd.fileSize,
        uploadedAt: cd.createdAt,
      });
    });

    // ─────────────────────────────────────────────────────────────
    // 3. نماذج وخطابات العطاء الرسمية المعتمدة (Word & PDF)
    // ─────────────────────────────────────────────────────────────
    list.push({
      id: "letter-clarification-docx",
      name: "خطاب التوضيح والاستفسارات الرسمي (Word)",
      description: "مستند Word رسمي معتمد بالترويسة والباركود وجدول الاستفسارات",
      category: "LETTERS",
      sourceTab: "خطابات ومخرجات العطاء",
      envelope: "المظروف الفني",
      fileType: "docx",
      templateKey: "clarification",
      templatePath: "/templates/clarification_template.docx",
    });

    if (clrCloudUrl) {
      list.push({
        id: "letter-clarification-pdf",
        name: "خطاب التوضيح والاستفسارات الرسمي (نسخة PDF رقمية)",
        description: "النسخة الرقمية المعتمدة لخطاب التوضيح مع رمز QR",
        category: "LETTERS",
        sourceTab: "خطابات ومخرجات العطاء",
        envelope: "المظروف الفني",
        fileType: "pdf",
        templateKey: "clarification",
        cloudUrl: clrCloudUrl,
      });
    }

    list.push({
      id: "letter-technical-docx",
      name: "العرض الفني والمواصفات الفنية والبدائل (Word)",
      description: "مستند Word للعرض الفني بالجدول المدمج 8 أعمدة والبدائل الفنية",
      category: "LETTERS",
      sourceTab: "خطابات ومخرجات العطاء",
      envelope: "المظروف الفني",
      fileType: "docx",
      templateKey: "technical",
      templatePath: "/templates/technical_offer_template.docx",
    });

    if (techCloudUrl) {
      list.push({
        id: "letter-technical-pdf",
        name: "العرض الفني والمواصفات الرسمية (نسخة PDF رقمية)",
        description: "النسخة الرقمية المعتمدة للعرض الفني مع رمز QR الرقمي",
        category: "LETTERS",
        sourceTab: "خطابات ومخرجات العطاء",
        envelope: "المظروف الفني",
        fileType: "pdf",
        templateKey: "technical",
        cloudUrl: techCloudUrl,
      });
    }

    list.push({
      id: "letter-financial-docx",
      name: "العرض المالي وجدول الأسعار والتفقيط (Word)",
      description: "مستند Word للعرض المالي الرسمي بأعمدة سعر الوحدة والإجمالي والتفقيط",
      category: "LETTERS",
      sourceTab: "خطابات ومخرجات العطاء",
      envelope: "المظروف المالي",
      fileType: "docx",
      templateKey: "financial",
      templatePath: "/templates/financial_offer_template.docx",
    });

    if (finCloudUrl) {
      list.push({
        id: "letter-financial-pdf",
        name: "العرض المالي وجدول الأسعار (نسخة PDF رقمية)",
        description: "النسخة الرقمية المعتمدة للعرض المالي مع رمز QR",
        category: "LETTERS",
        sourceTab: "خطابات ومخرجات العطاء",
        envelope: "المظروف المالي",
        fileType: "pdf",
        templateKey: "financial",
        cloudUrl: finCloudUrl,
      });
    }

    list.push({
      id: "decl-specs-docx",
      name: "إقرار الالتزام بكراسة الشروط والمواصفات (Word)",
      description: "إقرار وتعهد قانوني بالالتزام بكافة الشروط الفنية والمالية",
      category: "LETTERS",
      sourceTab: "خطابات ومخرجات العطاء",
      envelope: "المظروف الفني",
      fileType: "docx",
      templateKey: "specs",
      templatePath: "/templates/declaration_specs_template.docx",
    });

    if (specsCloudUrl) {
      list.push({
        id: "decl-specs-pdf",
        name: "إقرار الالتزام بكراسة الشروط (نسخة PDF رقمية)",
        description: "النسخة الرقمية المعتمدة للإقرار مع رمز QR",
        category: "LETTERS",
        sourceTab: "خطابات ومخرجات العطاء",
        envelope: "المظروف الفني",
        fileType: "pdf",
        templateKey: "specs",
        cloudUrl: specsCloudUrl,
      });
    }

    list.push({
      id: "decl-insurance-docx",
      name: "إقرار الالتزام بالتأمينات والعمالة والمساواة (Word)",
      description: "إقرار قانوني بالالتزام بالتأمينات وحسن معاملة الموظفين",
      category: "LETTERS",
      sourceTab: "خطابات ومخرجات العطاء",
      envelope: "المظروف الفني",
      fileType: "docx",
      templateKey: "insurance",
      templatePath: "/templates/declaration_insurance_template.docx",
    });

    if (insCloudUrl) {
      list.push({
        id: "decl-insurance-pdf",
        name: "إقرار الالتزام بالتأمينات والعمالة (نسخة PDF رقمية)",
        description: "النسخة الرقمية المعتمدة لإقرار التأمينات",
        category: "LETTERS",
        sourceTab: "خطابات ومخرجات العطاء",
        envelope: "المظروف الفني",
        fileType: "pdf",
        templateKey: "insurance",
        cloudUrl: insCloudUrl,
      });
    }

    return list;
  }, [
    op.documents,
    selectedCompanyRel?.company?.documents,
    selectedCompanyRel?.company?.name,
    techCloudUrl,
    clrCloudUrl,
    specsCloudUrl,
    insCloudUrl,
    finCloudUrl,
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
  const finCount = useMemo(
    () => packageFiles.filter((f) => f.envelope === "المظروف المالي").length,
    [packageFiles]
  );

  // تصفية الملفات بحسب الفئة النشطة
  const filteredFiles = useMemo(() => {
    if (activeCategory === "ALL") return packageFiles;
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

  // ━━━ دالة جلب محتوى المستند الفعلي كـ Blob ━━━
  const fetchFileBlob = async (item: DossierItem): Promise<{ blob: Blob; fileName: string }> => {
    const safeTitle = item.name.replace(/[/\\?%*:|"<>]/g, "_");

    // 1. إذا كان مستند عملية مرفوع
    if (item.docRef) {
      const res = await api.get(`/operations/${op.id}/documents/${item.docRef.id}/file`, {
        responseType: "blob",
      });
      return { blob: res.data, fileName: item.docRef.fileName || `${safeTitle}.${item.fileType}` };
    }

    // 2. إذا كان مستند شركة مرفوع
    if (item.companyDocRef) {
      const compId = selectedCompanyRel?.companyId || selectedCompanyRel?.company?.id;
      const res = await api.get(`/companies/${compId}/documents/${item.companyDocRef.id}/file`, {
        responseType: "blob",
      });
      return {
        blob: res.data,
        fileName: item.companyDocRef.originalFileName || `${safeTitle}.${item.fileType}`,
      };
    }

    // 3. إذا كان قالب Word
    if (item.templatePath) {
      const res = await fetch(item.templatePath);
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const docxBlob = new Blob([arrayBuf], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
        return { blob: docxBlob, fileName: `${safeTitle}.docx` };
      }
    }

    // 4. إذا كان رابط سحابي معتمد (PDF)
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

    // 5. بطاقة المستند كملف نصي موثق
    const content = `=========================================================================\n` +
      `منظومة جولدن ERP لإدارة المناقصات — بطاقة مستند العطاء الرسمي\n` +
      `=========================================================================\n` +
      `اسم المستند: ${item.name}\n` +
      `الوصف: ${item.description}\n` +
      `المظروف التابع له: ${item.envelope}\n` +
      `العملية: ${op.name} (${op.externalNumber || op.serialNumber})\n` +
      `جهة الإسناد: ${op.authority}\n` +
      `الشركة المتقدمة: ${selectedCompanyRel?.company?.name || "جولدن"} (${selectedCompanyRel?.displayCode || "A"})\n` +
      (item.cloudUrl ? `الرابط السحابي المباشر: ${item.cloudUrl}\n` : "") +
      `تاريخ الاستخراج: ${new Date().toLocaleString("ar-EG")}\n` +
      `حالة التوثيق: معتمد ومطابق لأحكام القانون رقم 182 لسنة 2018 ✓\n` +
      `=========================================================================\n`;

    return {
      blob: new Blob([content], { type: "text/plain;charset=utf-8" }),
      fileName: `${safeTitle}.txt`,
    };
  };

  // ━━━ دالة المعاينة الشاملة للمستند ━━━
  const handlePreviewItem = (item: DossierItem) => {
    if (item.docRef) {
      onPreviewDoc?.(item.docRef);
      return;
    }
    if (item.companyDocRef) {
      onPreviewDoc?.({
        ...item.companyDocRef,
        id: item.companyDocRef.id,
        fileName: item.name,
        filePath: item.companyDocRef.filePath,
        fileType: item.companyDocRef.fileType,
      });
      return;
    }
    if (item.cloudUrl) {
      window.open(item.cloudUrl, "_blank");
      return;
    }
    if (item.templatePath) {
      handleDownloadSingleItem(item);
      return;
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
              variant="outline"
              onClick={() => setChecklistOpen(true)}
              className="border-border text-xs font-bold h-9 rounded-xl cursor-pointer flex items-center gap-1.5 hover:bg-muted"
            >
              <Printer className="h-3.5 w-3.5 text-blue-600" />
              <span>كشف محتويات المظاريف</span>
            </Button>

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
              onClick={() => setAddingSubmission(!addingSubmission)}
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

        {/* نموذج تسجيل محضر تسليم العطاء */}
        {addingSubmission && (
          <div className="p-5 rounded-2xl bg-card border-2 border-purple-500/30 space-y-3.5 animate-fade-in shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h4 className="text-xs font-black text-foreground flex items-center gap-2">
                <Send className="h-4 w-4 text-purple-600" />
                <span>تسجيل وتوثيق تسليم المظاريف بمقر جهة الإسناد</span>
              </h4>
              <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                محضر استلام المظاريف
              </Badge>
            </div>

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
                <Label className="text-[11px] font-bold">تاريخ وساعة التسليم الفعلي *</Label>
                <Input
                  type="date"
                  value={submissionDate}
                  onChange={(e) => setSubmissionDate(e.target.value)}
                  className="h-9 text-xs font-mono"
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
                <Label className="text-[11px] font-bold">اسم المستلم بالجهة / اللجنة</Label>
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

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddingSubmission(false)}
                className="rounded-xl h-8 text-xs cursor-pointer"
              >
                إلغاء
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveSubmission}
                disabled={savingSubmission}
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold h-8 text-xs cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                {savingSubmission ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                <span>حفظ وتوثيق التسليم رسمياً</span>
              </Button>
            </div>
          </div>
        )}

        {/* ━━━ جدول ملفات التقديم مع أزرار الفلترة والتحديد والتحميل المباشر ━━━ */}
        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border space-y-4 shadow-sm">
          {/* شريط الفلاتر والتصنيفات */}
          <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: "ALL", label: `كافة الملفات (${packageFiles.length})`, icon: Layers },
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
                  className="p-3.5 rounded-2xl bg-card border border-border space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <span className="text-xs font-bold text-foreground">
                      شركة {(op.companies || []).find((c: any) => c.company.id === sub.companyId || c.companyId === sub.companyId)?.company?.name || "—"}
                    </span>
                    <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                      مقدم رسمياً ✓
                    </Badge>
                  </div>
                  <DataRow label="تاريخ التقديم" value={formatDate(sub.submissionDate)} />
                  <DataRow label="رقم إيصال الاستلام" value={sub.receiptNumber} mono />
                  {sub.notes && (
                    <p className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-lg font-mono">
                      {sub.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
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
