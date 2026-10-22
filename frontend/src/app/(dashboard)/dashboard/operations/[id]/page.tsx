"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Building2,
  Sparkles,
  RefreshCw,
  Printer,
  CheckCircle2,
  Ban,
  History,
  ShieldCheck,
  ChevronLeft,
  SlidersHorizontal,
  RotateCcw,
  Check,
  Circle,
  X,
  Download,
  ExternalLink,
  Minimize2,
  Maximize2,
  KeyRound,
  Loader2,
  Lock,
  Unlock,
  Copy,
  FileCode,
  WrapText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/lib/api";
import { useCompany, CompanyCode } from "@/context/company-context";
import { DocxViewer } from "@/components/docx-viewer";
import { Portal } from "@/components/ui/portal";
import { StageLockProvider, useStageLock } from "./StageLockContext";
import { CrossStageConsistencyAlert } from "./CrossStageConsistencyAlert";
import {
  LIFECYCLE_STAGES,
  getStageIndex,
} from "@/components/operations/operation-timeline";

// Modular Types and Shared Constants
import {
  Operation,
  LIFECYCLE_TABS,
  STATUS_LABELS,
  TENDER_TYPE_LABELS,
  formatDate,
  getTabCompletionStatus,
} from "./tabs/types";

// Modular Tabs per Lifecycle Stage
import { TabOverview } from "./tabs/TabOverview";
import { TabDates } from "./tabs/TabDates";
import { TabMarketStudy } from "./tabs/TabMarketStudy";
import { TabBooklet } from "./tabs/TabBooklet";
import { TabClarification } from "./tabs/TabClarification";
import { TabTechnical } from "./tabs/TabTechnical";
import { TabFinancial } from "./tabs/TabFinancial";
import { TabDeclarations } from "./tabs/TabDeclarations";
import { TabSubmissionPackage } from "./tabs/TabSubmissionPackage";
import { TabTechOpening, TabFinOpening } from "./OpeningWorkflows";
import { TabAward } from "./tabs/TabAward";
import { TabSupplyOrder } from "./tabs/TabSupplyOrder";
import { TabFinalGuarantee } from "./tabs/TabFinalGuarantee";
import { TabGuarantees } from "./tabs/TabGuarantees";
import { TabSupply } from "./tabs/TabSupply";
import { TabInvoicing } from "./tabs/TabInvoicing";
import { TabInsurancesLabor } from "./tabs/TabInsurancesLabor";
import { TabCertificates } from "./tabs/TabCertificates";
import { TabFinance } from "./tabs/TabFinance";
import { TabClose } from "./tabs/TabClose";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SMART COVER MODAL (الغلاف الذكي للعطاء)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SmartCoverModal({ op, onClose }: { op: Operation; onClose: () => void }) {
  const mainCompany = op.companies?.[0]?.company || { name: "شركة جولدن إيجل للتوريدات", code: "A" };
  const displayCode = op.companies?.[0]?.displayCode || "A15";

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-card border border-border rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-foreground text-base">معاينة الغلاف الذكي (Smart Cover)</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Printable Official Cover Preview */}
        <div className="p-8 rounded-2xl bg-white text-slate-900 border-2 border-slate-300 space-y-6 text-center shadow-md">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-center text-xs font-bold">
            <div className="text-right">
              <p>جمهورية مصر العربية</p>
              <p>{op.authority}</p>
            </div>
            <div className="text-center font-mono text-base font-black px-3 py-1 bg-slate-100 border border-slate-300 rounded-lg">
              {displayCode}
            </div>
            <div className="text-left">
              <p>{TENDER_TYPE_LABELS[op.tenderType] || op.tenderType}</p>
              <p>رقم: {op.externalNumber || `#${op.serialNumber}`}</p>
            </div>
          </div>

          {/* Tender Title */}
          <div className="py-6 space-y-3">
            <Badge className="bg-slate-900 text-white text-xs px-3 py-1 font-bold">مظروف العرض الفني والمالي</Badge>
            <h2 className="text-2xl font-black text-slate-900 leading-snug">{op.name}</h2>
            <p className="text-sm font-semibold text-slate-700">جهة الطرح: {op.authority}</p>
          </div>

          {/* Company Details */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 text-right">
            <div className="flex justify-between">
              <span className="text-slate-500">مقدم من:</span>
              <span className="font-bold text-slate-900">{mainCompany.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">كود العملية بالنظام:</span>
              <span className="font-mono font-bold text-blue-700">{displayCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">تاريخ التقديم:</span>
              <span className="font-mono text-slate-800">{new Date().toLocaleDateString("ar-EG")}</span>
            </div>
          </div>

          {/* Stamp & Signature Footer */}
          <div className="pt-6 border-t-2 border-slate-900 flex justify-between text-xs font-bold text-slate-800 px-4">
            <div>
              <p>توقيع المفوض القانوني</p>
              <p className="mt-8 text-slate-400">.................................</p>
            </div>
            <div>
              <p>خاتم الشركة</p>
              <div className="mt-4 w-16 h-16 rounded-full border-2 border-dashed border-slate-400 mx-auto flex items-center justify-center text-[10px] text-slate-400">
                بصمة الختم
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl">إلغاء</Button>
          <Button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold">
            <Printer className="h-4 w-4 ml-1.5" />طباعة الغلاف الرسمي
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN PAGE COMPONENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function OperationDetailPage() {
  const { id } = useParams();
  const opId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";

  return (
    <StageLockProvider opId={opId}>
      <OperationDetailContent id={opId} />
    </StageLockProvider>
  );
}

function OperationDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const { userRole, selectedCompany, setSelectedCompany } = useCompany();
  const { isStageLocked, lockStage, unlockStage } = useStageLock();

  // تحميل فوري مباشر من الذاكرة المؤقتة (SWR Pattern) لتفادي أي انتظار أو بطء
  const [op, setOp] = useState<Operation | null>(() => {
    if (typeof window !== "undefined" && id) {
      try {
        const cached = sessionStorage.getItem(`cached_op_${id}`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined" && id) {
      try {
        const cached = sessionStorage.getItem(`cached_op_${id}`);
        if (cached) return false; // تحميل فوري فائق السرعة بدون أي شاشة انتظار
      } catch {}
    }
    return true;
  });

  const [activeTab, setActiveTab] = useState("overview");
  const isCurrentStageLocked = isStageLocked(activeTab);
  const [smartCoverOpen, setSmartCoverOpen] = useState(false);

  // حالة التحكم في المسار الزمني والمراحل
  const [statusActionModal, setStatusActionModal] = useState<null | {
    type: "ADVANCE" | "ROLLBACK" | "CANCEL" | "REOPEN" | "MANUAL";
    targetStatus: string;
    targetLabel: string;
    description: string;
  }>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // معاينة وتحميل مستندات العملية وكراسة الشروط ودراسة السوق (يدعم PDF و Word والصور والنصوص والويب)
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocBlob, setPreviewDocBlob] = useState<Blob | null>(null);
  const [previewDocType, setPreviewDocType] = useState<"pdf" | "docx" | "image" | "text" | "html" | "other" | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>("");
  const [previewTextContent, setPreviewTextContent] = useState<string>("");
  const [isTextWrap, setIsTextWrap] = useState<boolean>(true);
  const [previewDocItem, setPreviewDocItem] = useState<any>(null);
  const [isFullscreenDoc, setIsFullscreenDoc] = useState<boolean>(false);
  const [, setIsProcessingDoc] = useState<boolean>(false);

  const handlePreviewDocument = async (doc: { id?: string; fileName?: string; filePath?: string; title?: string; fileType?: string; size?: number }) => {
    try {
      setIsProcessingDoc(true);
      setPreviewDocItem(doc);
      const title = doc.fileName || doc.title || "مستند العملية";
      setPreviewDocTitle(title);
      toast.info("جاري تحضير المستند للعرض المباشر...");

      let blobData: Blob | null = (doc as any).blob || null;
      let contentType = blobData?.type || "";
      const currentOpId = op?.id;

      // Tier 0: Direct Data URI decoding if saved internally in DB
      const targetFilePath = doc.filePath || "";
      if (!blobData && targetFilePath.startsWith("data:")) {
        try {
          const commaIdx = targetFilePath.indexOf(",");
          if (commaIdx !== -1) {
            const header = targetFilePath.substring(0, commaIdx);
            const base64Data = targetFilePath.substring(commaIdx + 1);
            const mimeMatch = header.match(/data:([^;]+)/);
            const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
            const byteChars = atob(base64Data);
            const byteNumbers = new Uint8Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) {
              byteNumbers[i] = byteChars.charCodeAt(i);
            }
            blobData = new Blob([byteNumbers], { type: mime });
            contentType = mime;
          }
        } catch (e) {
          console.warn("Direct base64 decode failed:", e);
        }
      }

      // Tier 1: Try fetching via operation documents endpoint (with Bearer token via api client)
      if (!blobData && doc.id && currentOpId) {
        try {
          const res = await api.get(`/operations/${currentOpId}/documents/${doc.id}/file`, { responseType: "blob" });
          blobData = res.data;
          contentType = String(res.headers?.["content-type"] || "").toLowerCase();
        } catch (opErr) {
          console.warn("Direct document stream failed, trying fallback URL:", opErr);
        }
      }

      // Tier 2: If Tier 1 failed or no doc.id, try direct filePath
      if (!blobData && targetFilePath) {
        if (targetFilePath.startsWith("http://") || targetFilePath.startsWith("https://")) {
          try {
            const res = await fetch(targetFilePath);
            if (res.ok) {
              blobData = await res.blob();
              contentType = blobData.type || "";
            }
          } catch (netErr) {
            console.warn("Direct cloud fetch failed:", netErr);
          }
        } else {
          try {
            const cleanUrl = targetFilePath.startsWith("/") ? targetFilePath : `/${targetFilePath}`;
            const res = await api.get(cleanUrl, { responseType: "blob" });
            blobData = res.data;
            contentType = String(res.headers?.["content-type"] || "").toLowerCase();
          } catch (urlErr) {
            console.warn("Target URL fetch failed:", urlErr);
          }
        }
      }

      // Tier 3: If still no blob, try radar download doc as last resort
      if (!blobData) {
        try {
          const res = await api.get(`/radar/download-doc?docId=booklet`, { responseType: "blob" });
          blobData = res.data;
          contentType = String(res.headers?.["content-type"] || "").toLowerCase();
        } catch {}
      }

      if (!blobData) {
        throw new Error("لم يتم استلام محتوى صالح للمستند");
      }

      const fileExt = (doc.fileType || "").toLowerCase() || (title.split(".").pop() || "").toLowerCase();
      const firstBytes = await blobData.slice(0, 512).text().catch(() => "");
      const isPkZip = firstBytes.startsWith("PK");
      const isPdfHeader = firstBytes.startsWith("%PDF");

      // 1. Text & Code extensions and formats
      const textExtensions = ["txt", "log", "csv", "tsv", "json", "xml", "md", "markdown", "sql", "ini", "conf", "env", "yml", "yaml", "sh", "bat"];
      const isTextByExt = textExtensions.includes(fileExt) || Boolean(title.match(/\.(txt|log|csv|tsv|json|xml|md|sql|ini|conf|env|ya?ml)$/i));
      const isTextByMime =
        contentType.startsWith("text/plain") ||
        contentType.startsWith("text/csv") ||
        contentType.startsWith("application/json") ||
        contentType.startsWith("application/xml") ||
        contentType.startsWith("text/markdown") ||
        contentType.startsWith("text/tab-separated-values");

      const isPrintableText =
        !isPkZip &&
        !isPdfHeader &&
        !contentType.includes("pdf") &&
        !contentType.includes("image") &&
        !contentType.includes("word") &&
        !contentType.includes("officedocument") &&
        (isTextByExt || isTextByMime || (firstBytes.length > 0 && !/[\x00-\x08\x0E-\x1F]/.test(firstBytes.slice(0, 64))));

      // 2. Images
      const isImage =
        ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico"].includes(fileExt) ||
        Boolean(title.match(/\.(png|jpe?g|webp|gif|svg|bmp|ico)$/i)) ||
        Boolean(blobData.type?.startsWith("image/")) ||
        Boolean(contentType.startsWith("image/"));

      // 3. Word documents (.docx / .doc)
      const isWordName =
        title.toLowerCase().endsWith(".docx") ||
        title.toLowerCase().endsWith(".doc") ||
        fileExt === "docx" ||
        fileExt === "doc";

      const isWordType =
        blobData.type?.includes("word") ||
        blobData.type?.includes("officedocument.wordprocessingml") ||
        contentType.includes("word") ||
        contentType.includes("officedocument.wordprocessingml") ||
        (isPkZip && !isPdfHeader && (isWordName || fileExt === "docx" || fileExt === "doc"));

      // 4. HTML
      const isHtml =
        blobData.type?.includes("html") ||
        contentType.includes("html") ||
        fileExt === "html" ||
        fileExt === "htm" ||
        title.toLowerCase().endsWith(".html") ||
        title.toLowerCase().endsWith(".htm") ||
        firstBytes.toLowerCase().includes("<!doctype html") ||
        firstBytes.toLowerCase().includes("<html");

      // 5. PDF
      const isPdf =
        fileExt === "pdf" ||
        title.toLowerCase().endsWith(".pdf") ||
        blobData.type?.includes("pdf") ||
        contentType.includes("pdf") ||
        isPdfHeader;

      // 1. Image preview
      if (isImage) {
        const imageBlob = new Blob([blobData], { type: blobData.type || contentType || "image/png" });
        const blobUrl = URL.createObjectURL(imageBlob);
        setPreviewDocBlob(imageBlob);
        setPreviewDocType("image");
        setPreviewDocUrl(blobUrl);
        toast.success("تم فتح الصورة للمعاينة المباشرة! 🖼️");
        return;
      }

      // 2. Word preview (.docx / .doc)
      if (isWordName || isWordType) {
        setPreviewDocBlob(blobData);
        setPreviewDocType("docx");
        setPreviewDocUrl("docx_viewer_active");
        toast.success("تم فتح مستند Word للمعاينة المباشرة! 📄");
        return;
      }

      // 3. HTML preview (synthesized official specifications & web pages)
      if (isHtml) {
        const htmlBlob = new Blob([blobData], { type: "text/html;charset=utf-8" });
        const blobUrl = URL.createObjectURL(htmlBlob);
        setPreviewDocBlob(htmlBlob);
        setPreviewDocType("html");
        setPreviewDocUrl(blobUrl);
        toast.success("تم فتح كراسة الشروط والمواصفات الرسمية للمعاينة! 📜");
        return;
      }

      // 4. Text preview (.txt, .log, .csv, .json, .xml, .md, etc.)
      if (isTextByExt || (isPrintableText && !isPdf)) {
        const text = await blobData.text();
        setPreviewTextContent(text);
        setPreviewDocBlob(blobData);
        setPreviewDocType("text");
        setPreviewDocUrl("text_viewer_active");
        toast.success("تم فتح المستند النصي للمعاينة المباشرة! 📝");
        return;
      }

      // 5. PDF preview
      if (isPdf) {
        const pdfBlob = new Blob([blobData], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(pdfBlob);
        setPreviewDocBlob(pdfBlob);
        setPreviewDocType("pdf");
        setPreviewDocUrl(blobUrl);
        toast.success("تم فتح ملف PDF للمعاينة المباشرة! 📄");
        return;
      }

      // 6. Other / binary fallback
      const fallbackBlob = new Blob([blobData], { type: blobData.type || "application/octet-stream" });
      const blobUrl = URL.createObjectURL(fallbackBlob);
      setPreviewDocBlob(fallbackBlob);
      setPreviewDocType("other");
      setPreviewDocUrl(blobUrl);
      toast.info("تم تحضير الملف — يمكنك استعراض تفاصيله وتحميله مباشرة");
    } catch (err: any) {
      console.error("Preview error:", err);
      toast.error("تعذر فتح معاينة الملف — جاري المحاولة بتحميله مباشرة إلى جهازك...");
      try {
        await handleDownloadDocument(doc);
      } catch {}
    } finally {
      setIsProcessingDoc(false);
    }
  };

  const handleDownloadDocument = async (doc: { id?: string; fileName?: string; filePath?: string; title?: string; fileType?: string }) => {
    try {
      toast.info("جاري تحميل الملف إلى جهازك...");
      const title = doc.fileName || doc.title || "مستند_العملية";
      let blobData: Blob | null = null;
      let contentType = "";
      let ext = (doc.fileType || "").toLowerCase();
      const currentOpId = op?.id;

      // Tier 1: Try operation document download endpoint
      if (doc.id && currentOpId) {
        try {
          const res = await api.get(`/operations/${currentOpId}/documents/${doc.id}/download`, { responseType: "blob" });
          blobData = res.data;
          contentType = String(res.headers?.["content-type"] || "").toLowerCase();
        } catch (opErr) {
          console.warn("Direct download failed, trying fallback:", opErr);
        }
      }

      // Tier 2: Try direct filePath
      if (!blobData) {
        const targetUrl = doc.filePath || "";
        if (targetUrl) {
          try {
            const cleanUrl = targetUrl.startsWith("/") ? targetUrl : `/${targetUrl}`;
            const res = await api.get(cleanUrl, { responseType: "blob" });
            blobData = res.data;
            contentType = String(res.headers?.["content-type"] || "").toLowerCase();
          } catch {}
        }
      }

      // Tier 3: Radar download fallback
      if (!blobData) {
        const res = await api.get(`/radar/download-doc?docId=booklet&download=true`, { responseType: "blob" });
        blobData = res.data;
        contentType = String(res.headers?.["content-type"] || "").toLowerCase();
      }

      if (!blobData) {
        throw new Error("تعذر تحميل الملف");
      }

      // Determine proper file extension
      let downloadName = title;
      if (contentType.includes("word") || contentType.includes("officedocument") || blobData.type?.includes("word")) {
        ext = "docx";
      } else if (contentType.includes("image/png") || blobData.type?.includes("image/png")) {
        ext = "png";
      } else if (contentType.includes("image/jpeg") || blobData.type?.includes("image/jpeg")) {
        ext = "jpg";
      } else if (contentType.includes("html") || blobData.type?.includes("html")) {
        ext = "html";
      } else if (!ext) {
        ext = "pdf";
      }

      if (!downloadName.toLowerCase().endsWith(`.${ext}`)) {
        downloadName = `${downloadName}.${ext}`;
      }

      const blobUrl = URL.createObjectURL(blobData);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", downloadName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success(`تم تحميل الملف (${downloadName}) بنجاح! 📥`);
    } catch {
      toast.error("فشل تحميل الملف إلى الجهاز");
    }
  };

  const closeDocViewer = () => {
    if (previewDocUrl && previewDocUrl !== "docx_viewer_active" && previewDocUrl !== "text_viewer_active") {
      URL.revokeObjectURL(previewDocUrl);
    }
    setPreviewDocUrl(null);
    setPreviewDocBlob(null);
    setPreviewDocType(null);
    setPreviewDocTitle("");
    setPreviewTextContent("");
    setPreviewDocItem(null);
    setIsFullscreenDoc(false);
  };

  const fetchOp = async () => {
    try {
      const res = await api.get(`/operations/${id}`);
      setOp(res.data);
      if (typeof window !== "undefined" && id) {
        try {
          sessionStorage.setItem(`cached_op_${id}`, JSON.stringify(res.data));
        } catch {}
      }

      let opCompanyCode: string | null = null;
      if (res.data?.companies && res.data.companies.length > 0) {
        for (const compRel of res.data.companies) {
          const code = compRel.company?.code || (compRel.displayCode ? compRel.displayCode.charAt(0) : null);
          if (code && ["A", "B", "C", "D"].includes(code.toUpperCase())) {
            opCompanyCode = code.toUpperCase();
            break;
          }
        }
      }

      if (opCompanyCode && ["A", "B", "C", "D"].includes(opCompanyCode)) {
        if (selectedCompany !== opCompanyCode) {
          setSelectedCompany(opCompanyCode as CompanyCode);
        }
      }
    } catch {
      if (!op) {
        router.push("/dashboard/operations");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOp(); }, [id]);

  const handleStatusChange = async (newStatus: string, unlockCode = false) => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/operations/${id}/status`, {
        status: newStatus,
        isCodeLocked: unlockCode ? false : undefined,
      });
      if (res.data && Array.isArray(res.data.companies)) {
        setOp(res.data);
      } else {
        await fetchOp();
      }
      toast.success(`تم تحديث مرحلة العملية بنجاح إلى: ${STATUS_LABELS[newStatus]?.label || newStatus}`);
      setStatusActionModal(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل في تحديث مرحلة العملية");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleCodeLock = async () => {
    try {
      const res = await api.patch(`/operations/${id}/toggle-lock`);
      if (res.data && Array.isArray(res.data.companies)) {
        setOp(res.data);
      } else {
        setOp((prev) => (prev ? { ...prev, isCodeLocked: res.data.isCodeLocked } : null));
      }
      if (res.data.isCodeLocked) {
        toast.success("تم قفل كود العملية 🔒");
      } else {
        toast.success("تم فك قفل كود العملية — أصبح التعديل متاحاً الآن 🔓");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل في تغيير حالة قفل الكود");
    }
  };

  // ━━━ حالة التحكم اليدوي في اكتمال المراحل (منتهية ✓ أو لسة مكتملتش) ━━━
  const [manualStageOverrides, setManualStageOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (id) {
      try {
        const saved = localStorage.getItem(`op_stage_overrides_${id}`);
        if (saved) {
          setManualStageOverrides(JSON.parse(saved));
        }
      } catch (err) {
        console.error("Error loading stage overrides:", err);
      }
    }
  }, [id]);

  const handleToggleStageCompletion = (tabId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const tab = LIFECYCLE_TABS.find((t) => t.id === tabId);
    if (!tab || !op) return;

    const currentStatus = getTabCompletionStatus(tab, op, manualStageOverrides);
    const willBeDone = currentStatus !== "done";

    const updated = {
      ...manualStageOverrides,
      [tabId]: willBeDone,
    };
    setManualStageOverrides(updated);
    if (id) {
      try {
        localStorage.setItem(`op_stage_overrides_${id}`, JSON.stringify(updated));
      } catch (err) {
        console.error("Error saving stage overrides:", err);
      }
    }

    if (willBeDone) {
      lockStage(tabId, tab.label);
      toast.success(`تم تحديد مرحلة "${tab.label}" كمنتهية ومكتملة ✓ وتم قفلها تلقائياً لحماية البيانات 🔒`);
    } else {
      unlockStage(tabId, tab.label);
      toast.info(`تم إرجاع مرحلة "${tab.label}" إلى قيد التنفيذ وفتح التعديل 🔓`);
    }
  };

  const handleResetStageOverrides = () => {
    setManualStageOverrides({});
    if (id) {
      localStorage.removeItem(`op_stage_overrides_${id}`);
    }
    toast.success("تم إعادة ضبط المراحل للحساب التلقائي");
  };

  if (loading && !op) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto py-6 animate-fade-in">
        <div className="p-8 sm:p-12 rounded-3xl glass-card border border-border/80 shadow-2xl bg-gradient-to-br from-card via-card/90 to-blue-500/5 text-center space-y-6">
          <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-blue-500/20 animate-ping opacity-30" />
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 p-0.5 shadow-xl flex items-center justify-center">
              <div className="w-full h-full bg-card rounded-[22px] flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-blue-600 animate-pulse" />
              </div>
            </div>
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-lg sm:text-xl font-black text-foreground">
              منظومة العمليات وإدارة دورة الحياة
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium flex items-center justify-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
              جاري مزامنة بيانات العملية ومراحل العطاءات والمستندات...
            </p>
          </div>

          <div className="w-full max-w-sm mx-auto bg-muted/60 h-2 rounded-full overflow-hidden p-0.5 border border-border/50">
            <div className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Shimmer Outlines */}
        <div className="space-y-4 animate-pulse">
          <div className="h-28 bg-muted/40 rounded-3xl border border-border/40" />
          <div className="h-16 bg-muted/30 rounded-2xl border border-border/40" />
          <div className="h-64 bg-muted/20 rounded-2xl border border-border/40" />
        </div>
      </div>
    );
  }

  if (!op) return null;

  const currentStageIndex = getStageIndex(op.status);
  const currentStage = LIFECYCLE_STAGES[currentStageIndex] || LIFECYCLE_STAGES[0];
  const nextStage = currentStageIndex < LIFECYCLE_STAGES.length - 1 ? LIFECYCLE_STAGES[currentStageIndex + 1] : null;
  const previousStages = LIFECYCLE_STAGES.filter((_, idx) => idx < currentStageIndex);

  const status = STATUS_LABELS[op.status] || { label: op.status, badgeBg: "bg-muted text-muted-foreground" };
  const mainCompany = op.companies?.[0];
  const completedCount = LIFECYCLE_TABS.filter(t => getTabCompletionStatus(t, op, manualStageOverrides) === "done").length;
  const progressPercent = Math.round((completedCount / LIFECYCLE_TABS.length) * 100);

  const currentTabDef = LIFECYCLE_TABS.find((t) => t.id === activeTab) || LIFECYCLE_TABS[0];
  const currentTabOrder = currentTabDef.order;
  const nextTabDef = LIFECYCLE_TABS.find((t) => t.order === currentTabOrder + 1);
  const prevTabDef = LIFECYCLE_TABS.find((t) => t.order === currentTabOrder - 1);

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <TabOverview op={op} onRefresh={fetchOp} onSelectTab={setActiveTab} onNavigate={setActiveTab} />;
      case "dates":
        return <TabDates op={op} onRefresh={fetchOp} onNavigate={setActiveTab} />;
      case "market_study":
        return (
          <TabMarketStudy
            op={op}
            onRefresh={fetchOp}
            onNavigate={setActiveTab}
            onPreviewDoc={handlePreviewDocument}
            onDownloadDoc={handleDownloadDocument}
          />
        );
      case "booklet":
      case "guarantee_initial":
        return (
          <TabBooklet
            op={op}
            onRefresh={fetchOp}
            onNavigate={setActiveTab}
            onPreviewDoc={handlePreviewDocument}
            onDownloadDoc={handleDownloadDocument}
          />
        );
      case "clarification":
        return (
          <TabClarification
            op={op}
            onRefresh={fetchOp}
            onNavigate={setActiveTab}
            onPreviewDoc={handlePreviewDocument}
            onDownloadDoc={handleDownloadDocument}
          />
        );
      case "technical":
        return (
          <TabTechnical
            op={op}
            onRefresh={fetchOp}
            onNavigate={setActiveTab}
            onOpenSmartCover={() => setSmartCoverOpen(true)}
          />
        );
      case "financial":
        return <TabFinancial op={op} onRefresh={fetchOp} onNavigate={setActiveTab} />;
      case "declarations":
        return (
          <TabDeclarations
            op={op}
            onRefresh={fetchOp}
            onNavigate={setActiveTab}
            onPreviewDoc={handlePreviewDocument}
            onDownloadDoc={handleDownloadDocument}
          />
        );
      case "submission_package":
      case "submission":
        return (
          <TabSubmissionPackage
            op={op}
            onRefresh={fetchOp}
            onNavigate={setActiveTab}
            onPreviewDoc={handlePreviewDocument}
            onDownloadDoc={handleDownloadDocument}
          />
        );
      case "tech_opening":
      case "grievance":
        return (
          <TabTechOpening
            op={op}
            onRefresh={fetchOp}
            onNavigate={setActiveTab}
            onGoGrievance={() => setActiveTab("grievance")}
            onGoFinancial={() => setActiveTab("fin_opening")}
          />
        );
      case "fin_opening":
        return (
          <TabFinOpening
            op={op}
            onRefresh={fetchOp}
            onNavigate={setActiveTab}
            onGoAward={() => setActiveTab("award")}
            onPreviewDoc={handlePreviewDocument}
            onDownloadDoc={handleDownloadDocument}
          />
        );
      case "award":
        return (
          <TabAward
            op={op}
            onRefresh={fetchOp}
            onNavigate={setActiveTab}
            onGoGuarantee={() => setActiveTab("guarantee_final")}
            onPreviewDoc={handlePreviewDocument}
            onDownloadDoc={handleDownloadDocument}
          />
        );
      case "supply_order":
        return (
          <TabSupplyOrder
            op={op}
            onRefresh={fetchOp}
            onNavigate={setActiveTab}
          />
        );
      case "guarantee_final":
        return (
          <TabFinalGuarantee
            op={op}
            onRefresh={fetchOp}
            onNavigate={setActiveTab}
            onPreviewDoc={handlePreviewDocument}
            onDownloadDoc={handleDownloadDocument}
          />
        );
      case "supply":
        return <TabSupply op={op} onRefresh={fetchOp} onNavigate={setActiveTab} />;
      case "invoicing":
        return (
          <TabInvoicing
            op={op}
            onRefresh={fetchOp}
            onNavigate={setActiveTab}
            onPreviewDoc={handlePreviewDocument}
            onDownloadDoc={handleDownloadDocument}
          />
        );
      case "insurances_labor":
        return (
          <TabInsurancesLabor
            op={op}
            onRefresh={fetchOp}
            onNavigate={setActiveTab}
            onPreviewDoc={handlePreviewDocument}
            onDownloadDoc={handleDownloadDocument}
          />
        );
      case "certificates":
        return <TabCertificates op={op} onRefresh={fetchOp} onNavigate={setActiveTab} />;
      case "finance":
        return <TabFinance op={op} onRefresh={fetchOp} onNavigate={setActiveTab} />;
      case "close":
      case "recovery":
      case "archive":
        return (
          <TabClose
            op={op}
            onRefresh={fetchOp}
            onNavigate={setActiveTab}
            onPreviewDoc={handlePreviewDocument}
            onDownloadDoc={handleDownloadDocument}
          />
        );
      case "companies":
        return <TabOverview op={op} onRefresh={fetchOp} onSelectTab={setActiveTab} onNavigate={setActiveTab} />;
      default:
        return <TabOverview op={op} onRefresh={fetchOp} onSelectTab={setActiveTab} onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto animate-fade-in pb-16">
      {/* ━━━ TOP BREADCRUMB NAV ━━━ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/operations">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border bg-muted/40 text-foreground hover:bg-muted cursor-pointer">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link href="/dashboard" className="hover:text-blue-600">الرئيسية</Link>
              <span>/</span>
              <Link href="/dashboard/operations" className="hover:text-blue-600">العمليات والمناقصات</Link>
              <span>/</span>
              <span className="text-foreground font-mono font-bold">{mainCompany?.displayCode || `#${op.serialNumber}`}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ━━━ OPERATION HEADER CARD ━━━ */}
      <div className="relative overflow-hidden rounded-3xl glass-card p-5 sm:p-7 border border-border shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {(op.companies || []).map((oc: any) => (
                <span key={oc.displayCode} className="px-3 py-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-mono font-black text-sm shadow-sm">
                  {oc.displayCode}
                </span>
              ))}
              <Badge className={`${status.badgeBg} border text-xs px-3 py-1 font-bold`}>{status.label}</Badge>
              <span className="px-2.5 py-1 rounded-lg bg-muted text-foreground border border-border text-xs font-semibold">
                {TENDER_TYPE_LABELS[op.tenderType] || op.tenderType}
              </span>
              {op.isCodeLocked ? (
                <button
                  onClick={handleToggleCodeLock}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-500/25 cursor-pointer transition-colors"
                  title="انقر لتمكين تعديل الكود"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>كود محمي ومعتمد</span>
                </button>
              ) : (
                <button
                  onClick={handleToggleCodeLock}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-500/25 cursor-pointer transition-colors"
                  title="انقر لحماية واعتماد الكود"
                >
                  <KeyRound className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>تعديل الكود متاح</span>
                </button>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground leading-tight">{op.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="font-bold text-foreground">{op.authority}</span>
              </div>
              {op.externalNumber && (
                <div className="text-muted-foreground font-mono">
                  رقم الجهة: <span className="text-foreground font-bold">{op.externalNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Summary Card */}
          <div className="shrink-0 p-4 rounded-2xl bg-muted/40 border border-border w-full md:w-56 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-semibold">نسبة إنجاز الملف</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{progressPercent}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-muted/80 p-0.5 border border-border/60 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="text-[11px] text-muted-foreground text-center">{completedCount} من {LIFECYCLE_TABS.length} مرحلة مكتملة</div>
          </div>
        </div>
      </div>

      {/* ━━━ تنبيهات الحالة الاستثنائية (ملغاة أو مغلقة) ━━━ */}
      {op.status === "CANCELLED" && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shrink-0">
              <Ban className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-rose-800 dark:text-rose-200">العملية ملغاة حالياً (CANCELLED)</h4>
              <p className="text-xs text-rose-700/90 dark:text-rose-300/90">
                جميع بيانات ومستندات وتفاصيل العملية محفوظة بأمان. يمكنك إعادة تفعيلها وفتحها في أي وقت بنقرة زر واحدة.
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleStatusChange("DRAFT", true)}
            disabled={actionLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer shrink-0 shadow-sm flex items-center gap-1.5"
          >
            <History className="h-4 w-4" />
            <span>إعادة تفعيل العملية</span>
          </Button>
        </div>
      )}

      {op.status === "CLOSED" && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-500/10 border-2 border-slate-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-700 text-white shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-foreground">العملية مغلقة رسمياً ومكتملة بالكامل</h4>
              <p className="text-xs text-muted-foreground">
                تم استيفاء كامل بنود التوريد والفحص النهائي وصرف المستخلصات واسترداد التأمينات. يمكنك إرجاعها أو إعادة فتحها لأي سبب متى شئت.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setStatusActionModal({
                type: "ROLLBACK",
                targetStatus: "COMPLETED",
                targetLabel: "الاستلام والفحص النهائي",
                description: "سيتم إرجاع العملية للخلف وفك قفل الكود لإتاحة تعديل أي بيانات محاسبية أو تنفيذية.",
              });
            }}
            className="border-border text-foreground hover:bg-muted text-xs h-9 rounded-xl font-bold cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            <span>الرجوع لمرحلة سابقة</span>
          </Button>
        </div>
      )}

      {/* ━━━ المسار الزمني والمرحلي الموحد للمناقصة ━━━ */}
      <div className="rounded-3xl glass-card p-5 sm:p-7 border border-border shadow-xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Master Header: Stage Name, Order, Progress & Advance Control */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-600/10 border border-blue-500/25 text-blue-700 dark:text-blue-300 text-xs font-bold whitespace-nowrap w-fit">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>المسار الزمني لمراحل المناقصة (Tender Lifecycle Roadmap)</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground tracking-tight">
                المرحلة الحالية: <span className="text-blue-600 dark:text-blue-400">#{currentTabDef.order} {currentTabDef.label}</span>
              </h2>
              <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-mono font-bold text-xs px-3 py-1 rounded-xl shadow-xs whitespace-nowrap">
                مرحلة {currentTabDef.order} من {LIFECYCLE_TABS.length} • {progressPercent}% مكتمل
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
              {currentTabDef.description}
            </p>
          </div>

          {/* Primary Advance Button */}
          {nextTabDef && (
            <div className="shrink-0 self-start lg:self-center pt-1 lg:pt-0">
              <Button
                onClick={() => setActiveTab(nextTabDef.id)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm h-11 px-5 rounded-2xl shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer active:scale-95 transition-all shrink-0 whitespace-nowrap group"
              >
                <span>الانتقال للمرحلة التالية ({nextTabDef.shortLabel})</span>
                <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </Button>
            </div>
          )}
        </div>

        {/* Action Controls Toolbar Strip */}
        <div className="relative z-10 p-3 sm:p-3.5 rounded-2xl bg-muted/40 dark:bg-muted/20 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* 1. Rollback Stage */}
            {currentTabOrder > 1 && (
              <Select
                value=""
                onValueChange={(val) => {
                  if (val) setActiveTab(val);
                }}
              >
                <SelectTrigger className="bg-background border-border hover:bg-muted text-foreground rounded-xl text-xs h-9 font-bold w-auto min-w-[155px] cursor-pointer shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>الرجوع لمرحلة سابقة</span>
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground border-b border-border">
                    اختر المرحلة للرجوع إليها:
                  </div>
                  {LIFECYCLE_TABS.filter((t) => t.order < currentTabOrder).map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-right font-medium text-xs">
                      #{t.order} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* 2. Direct Toggle Current Stage Completion */}
            {(() => {
              const isCurrentDone = getTabCompletionStatus(currentTabDef, op, manualStageOverrides) === "done";
              return (
                <Button
                  variant="outline"
                  onClick={() => handleToggleStageCompletion(currentTabDef.id)}
                  className={`h-9 text-xs font-bold rounded-xl border cursor-pointer flex items-center gap-1.5 shadow-xs transition-all active:scale-95 ${
                    isCurrentDone
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25"
                      : "bg-background border-dashed border-blue-500/50 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10"
                  }`}
                  title={
                    isCurrentDone
                      ? "المرحلة محددة كمنتهية ومكتملة ✓ — انقر هنا لإرجاعها كغير مكتملة"
                      : "المرحلة غير مكتملة — انقر هنا لتحديدها كمنتهية ومكتملة (علامة الصح الخضراء ✓)"
                  }
                >
                  {isCurrentDone ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>المرحلة الحالية: منتهية ✓ (انقر للإرجاع)</span>
                    </>
                  ) : (
                    <>
                      <Circle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span>تحديد المرحلة الحالية: منتهية ✓</span>
                    </>
                  )}
                </Button>
              );
            })()}

            {/* 2.5. Stage Lock / Unlock Toggle (فتح التعديلات / قفل المرحلة) */}
            {isCurrentStageLocked ? (
              <Button
                variant="outline"
                onClick={() => unlockStage(currentTabDef.id, currentTabDef.label)}
                className="h-9 text-xs font-black rounded-xl border border-amber-500/60 bg-amber-500/20 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 cursor-pointer flex items-center gap-1.5 shadow-sm transition-all active:scale-95 animate-pulse"
                title="المرحلة مقفولة ومحمية — انقر هنا لفتح التعديلات"
              >
                <Unlock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>فتح التعديلات (المرحلة مقفولة 🔒)</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => lockStage(currentTabDef.id, currentTabDef.label)}
                className="h-9 text-xs font-bold rounded-xl border border-border bg-background hover:bg-amber-500/10 hover:border-amber-500/40 text-foreground cursor-pointer flex items-center gap-1.5 shadow-xs transition-all active:scale-95 group"
                title="انقر لقفل المرحلة وتثبيت كافة بياناتها لمنع التعديل"
              >
                <Lock className="h-3.5 w-3.5 text-muted-foreground group-hover:text-amber-600 transition-colors" />
                <span>قفل المرحلة 🔒</span>
              </Button>
            )}

            {/* 3. Code Lock Toggle */}
            <Button
              variant="outline"
              onClick={handleToggleCodeLock}
              className={`h-9 text-xs font-bold rounded-xl border cursor-pointer flex items-center gap-1.5 shadow-xs transition-all ${
                op.isCodeLocked
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                  : "bg-background border-border text-foreground hover:bg-muted"
              }`}
            >
              {op.isCodeLocked ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>كود محمي ومعتمد</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>تمكين تعديل الكود</span>
                </>
              )}
            </Button>

            {/* 4. Status Selector */}
            <Select
              value={op.status}
              onValueChange={(val) => {
                if (val === op.status || !val) return;
                setStatusActionModal({
                  type: "MANUAL",
                  targetStatus: val,
                  targetLabel: STATUS_LABELS[val]?.label || val,
                  description: `هل ترغب بتعيين حالة العملية رسمياً إلى (${STATUS_LABELS[val]?.label || val})؟`,
                });
              }}
            >
              <SelectTrigger className="bg-background border-border rounded-xl text-xs h-9 font-bold w-auto min-w-[160px] cursor-pointer shadow-xs">
                <div className="flex items-center gap-1.5 text-foreground truncate">
                  <SlidersHorizontal className="h-3 w-3 text-blue-600" />
                  <span className="truncate">الحالة: {STATUS_LABELS[op.status]?.label || op.status}</span>
                </div>
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground max-h-72">
                <div className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground border-b border-border">
                  تعيين الحالة بقاعدة البيانات:
                </div>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-right font-medium text-xs">
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Reset overrides button if any stage was manually customized */}
            {Object.keys(manualStageOverrides).length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetStageOverrides}
                className="h-8 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer px-2"
                title="إلغاء التعديلات اليدوية وإعادة حساب اكتمال المراحل تلقائياً"
              >
                <RotateCcw className="h-3 w-3 ml-1" />
                <span>إعادة الحساب التلقائي</span>
              </Button>
            )}
          </div>

          {/* 5. Cancellation / Reactivation Action */}
          <div className="shrink-0 self-end sm:self-center">
            {op.status !== "CANCELLED" ? (
              <Button
                variant="outline"
                onClick={() => {
                  setStatusActionModal({
                    type: "CANCEL",
                    targetStatus: "CANCELLED",
                    targetLabel: "إلغاء العملية",
                    description: "سيتم تحويل حالة العملية إلى (ملغاة)، مع الاحتفاظ بكافة البيانات والمستندات ويمكنك إعادة تفعيلها لاحقاً.",
                  });
                }}
                className="border-rose-500/40 text-rose-600 hover:bg-rose-500/10 hover:border-rose-500/60 hover:text-rose-700 text-xs font-bold h-9 px-3.5 rounded-xl cursor-pointer shadow-xs active:scale-95 transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                <Ban className="h-3.5 w-3.5 text-rose-500" />
                <span>إلغاء العملية</span>
              </Button>
            ) : (
              <Button
                onClick={() => handleStatusChange("DRAFT", true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer shadow-sm active:scale-95 transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                <History className="h-3.5 w-3.5" />
                <span>إعادة تفعيل العملية</span>
              </Button>
            )}
          </div>
        </div>

        {/* Overall Progress Bar Track */}
        <div className="space-y-2 px-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>نسبة إنجاز دورة حياة العملية الشاملة</span>
            <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
              {completedCount} من {LIFECYCLE_TABS.length} مراحل مكتملة ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted/80 overflow-hidden border border-border/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Single Master 16-Stage Interactive Stepper Track */}
        <div className="relative overflow-x-auto pb-3 pt-2 -mx-2 px-2 scrollbar-thin">
          <div className="flex items-start min-w-[1360px] justify-between relative py-2">
            <div className="absolute top-8 right-6 left-6 h-0.5 bg-border/80 -z-0" />
            <div
              className="absolute top-8 right-6 h-0.5 bg-gradient-to-l from-emerald-500 to-blue-600 transition-all duration-500 -z-0"
              style={{ width: `${Math.min(96, (completedCount / LIFECYCLE_TABS.length) * 100)}%` }}
            />

            {LIFECYCLE_TABS.map((tab) => {
              const tabStatus = getTabCompletionStatus(tab, op, manualStageOverrides);
              const isActive = activeTab === tab.id;
              const TabIcon = tab.icon;
              const isDone = tabStatus === "done";
              const isLocked = isStageLocked(tab.id);
              return (
                <div
                  key={tab.id}
                  className="flex flex-col items-center text-center group relative z-10 w-20 shrink-0 select-none"
                >
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md mb-1 border transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : isDone
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    #{tab.order}
                  </span>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xs transition-all duration-200 border-2 shadow-sm cursor-pointer ${
                        isActive
                          ? "scale-110 ring-4 ring-blue-500/30 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-white shadow-lg"
                          : isDone
                          ? "bg-emerald-500 text-white border-emerald-400 hover:scale-110"
                          : "bg-card text-muted-foreground border-border hover:border-blue-400 hover:scale-105"
                      }`}
                      title={`انتقال لمرحلة #${tab.order} ${tab.label}`}
                    >
                      {isDone && !isActive ? (
                        <Check className="h-4.5 w-4.5 stroke-[2.5]" />
                      ) : (
                        <TabIcon className="h-4.5 w-4.5" />
                      )}
                    </button>

                    {/* علامة القفل للمرحلة إذا كانت مقفولة */}
                    {isLocked && (
                      <div
                        className="absolute -top-1.5 -left-1.5 z-20 w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-md border border-white dark:border-slate-800"
                        title={`المرحلة #${tab.order} (${tab.label}) مقفولة ومعتمدة 🔒`}
                      >
                        <Lock className="h-2.5 w-2.5 stroke-[2.5]" />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleToggleStageCompletion(tab.id, e)}
                      className={`absolute -top-1.5 -right-1.5 z-20 w-5 h-5 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer ${
                        isDone
                          ? "bg-emerald-600 text-white hover:bg-rose-600 hover:scale-125 border border-white dark:border-slate-800"
                          : "bg-background border border-border text-muted-foreground hover:bg-emerald-500 hover:text-white hover:border-emerald-600 hover:scale-125"
                      }`}
                      title={
                        isDone
                          ? `المرحلة منتهية ومكتملة ✓ — انقر هنا لإرجاعها كغير مكتملة`
                          : `المرحلة غير مكتملة — انقر هنا لتحديدها كمنتهية ومكتملة ✓`
                      }
                    >
                      {isDone ? (
                        <Check className="h-3 w-3 stroke-[3]" />
                      ) : (
                        <Circle className="h-2.5 w-2.5 stroke-[2]" />
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`mt-1.5 text-[11px] font-bold leading-tight line-clamp-2 px-0.5 transition-colors cursor-pointer hover:underline ${
                      isActive
                        ? "text-blue-600 dark:text-blue-400 font-black"
                        : isDone
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.shortLabel}
                  </button>

                  {isActive && (
                    <span className="mt-1 w-2 h-2 rounded-full bg-blue-600 animate-pulse shadow-xs" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ━━━ نافذة تأكيد الإجراء وتغيير/إرجاع/إلغاء المرحلة ━━━ */}
      {statusActionModal && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  {statusActionModal.type === "CANCEL" ? (
                    <Ban className="h-5 w-5 text-rose-600" />
                  ) : statusActionModal.type === "ROLLBACK" ? (
                    <History className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  )}
                  <h3 className="font-extrabold text-foreground text-base">
                    {statusActionModal.type === "CANCEL"
                      ? "تأكيد إلغاء العملية"
                      : statusActionModal.type === "ROLLBACK"
                      ? "تأكيد إرجاع المرحلة"
                      : statusActionModal.type === "ADVANCE"
                      ? "تأكيد إتمام المرحلة والانتقال"
                      : "تأكيد تغيير المرحلة"}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setStatusActionModal(null)}
                  className="rounded-full h-8 w-8 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">المرحلة الحالية:</span>
                  <span className="font-bold text-foreground">{STATUS_LABELS[op.status]?.label || op.status}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-border/60 pt-2">
                  <span className="text-muted-foreground">المرحلة المستهدفة:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{statusActionModal.targetLabel}</span>
                </div>
              </div>

              <p className="text-xs text-foreground leading-relaxed">
                {statusActionModal.description}
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setStatusActionModal(null)}
                  className="h-10 text-xs rounded-xl border-border text-foreground hover:bg-muted cursor-pointer"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={() => handleStatusChange(statusActionModal.targetStatus, statusActionModal.type === "ROLLBACK")}
                  disabled={actionLoading}
                  className={`font-bold text-xs h-10 px-5 rounded-xl cursor-pointer shadow-md flex items-center gap-1.5 text-white ${
                    statusActionModal.type === "CANCEL"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : statusActionModal.type === "ROLLBACK"
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>تأكيد الإجراء وحفظ التغيير</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ━━━ ACTIVE TAB CONTENT & READ-ONLY OVERLAY ━━━ */}
      <div className="relative animate-fade-in space-y-4">
        {/* شريط تنبيه قفل المرحلة الحالية - محلي داخل المرحلة فقط ولا يحجب شريط المراحل أو باقي الصفحة */}
        {isCurrentStageLocked && (
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-600/15 border-2 border-amber-500/40 shadow-lg shadow-amber-500/5 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shrink-0 shadow-sm animate-pulse">
                <Lock className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="space-y-1 text-right">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    مرحلة #{currentTabDef.order}: {currentTabDef.label}
                  </span>
                  <h4 className="text-sm sm:text-base font-black text-amber-800 dark:text-amber-300">
                    المرحلة مقفولة ومعتمدة رسمياً 🔒
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                  تم قفل هذه المرحلة وتثبيت جميع بياناتها وخاناتها منعاً للتعديل غير المقصود.
                  يمكنك التنقل بحرية بين باقي المراحل عبر المسار الزمني أعلاه، ولتعديل أي خانة في هذه المرحلة اضغط على زر &quot;فتح التعديلات&quot;.
                </p>
              </div>
            </div>
            <Button
              onClick={() => unlockStage(currentTabDef.id, currentTabDef.label)}
              className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs sm:text-sm h-11 px-6 rounded-2xl shadow-md shadow-amber-500/20 cursor-pointer flex items-center gap-2 shrink-0 active:scale-95 transition-all"
            >
              <Unlock className="w-4 h-4 stroke-[2.5] text-slate-950" />
              <span>فتح التعديلات على المرحلة 🔓</span>
            </Button>
          </div>
        )}

        <div
          className={`transition-all duration-300 ${
            isCurrentStageLocked
              ? "pointer-events-none select-none opacity-60 filter contrast-95"
              : ""
          }`}
        >
          {/* ━━━ فحص وتنبيهات ترابط وتناسق البيانات بين المراحل المتتالية ━━━ */}
          <CrossStageConsistencyAlert
            op={op}
            activeTab={activeTab}
            onNavigate={setActiveTab}
          />

          {renderTabContent()}
        </div>
      </div>

      {/* ━━━ SMART COVER MODAL ━━━ */}
      {smartCoverOpen && (
        <Portal>
          <SmartCoverModal op={op} onClose={() => setSmartCoverOpen(false)} />
        </Portal>
      )}

      {/* ━━━ IN-APP BUILT-IN PDF VIEWER MODAL ━━━ */}
      {previewDocUrl && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-0 sm:p-2 md:p-4 animate-fade-in">
            <div
              className={`transition-all duration-200 bg-slate-950 border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden ${
                isFullscreenDoc
                  ? "fixed inset-0 z-[110] w-screen h-screen rounded-none"
                  : "w-full h-full sm:w-[98vw] sm:max-w-7xl sm:h-[95vh] rounded-none sm:rounded-3xl"
              }`}
            >
              {/* Responsive Header */}
              <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between gap-2 sm:gap-4 bg-slate-900/95 text-white flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2.5 min-w-0 max-w-full sm:max-w-[60%]">
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                      previewDocType === "docx"
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30 font-black font-mono"
                        : previewDocType === "image"
                        ? "bg-purple-500/20 text-purple-400 border-purple-500/30 font-black font-mono"
                        : previewDocType === "text"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-black font-mono"
                        : previewDocType === "html"
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/30 font-black font-mono"
                        : previewDocType === "pdf"
                        ? "bg-red-500/20 text-red-400 border-red-500/30 font-black font-mono"
                        : "bg-slate-500/20 text-slate-300 border-slate-500/30 font-black font-mono"
                    }`}
                  >
                    {previewDocType === "docx"
                      ? "DOCX"
                      : previewDocType === "image"
                      ? "IMG"
                      : previewDocType === "text"
                      ? "TXT"
                      : previewDocType === "html"
                      ? "HTML"
                      : previewDocType === "pdf"
                      ? "PDF"
                      : "FILE"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-white text-xs sm:text-sm leading-tight truncate" title={previewDocTitle}>
                        {previewDocTitle}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                        العملية {mainCompany?.displayCode || `#${op.serialNumber}`}
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">
                      {op.authority} • {op.name}
                    </span>
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <Button
                    size="sm"
                    onClick={() => handleDownloadDocument(previewDocItem || { fileName: previewDocTitle, filePath: previewDocUrl || undefined })}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition-all"
                    title="تحميل الملف مباشرة إلى جهازك"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>تحميل للجهاز</span>
                  </Button>

                  {(previewDocType === "pdf" || previewDocType === "image" || previewDocType === "html") &&
                    previewDocUrl &&
                    previewDocUrl.startsWith("blob:") && (
                      <a
                        href={previewDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 sm:h-9 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-all"
                        title="فتح في علامة تبويب مستقلة"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">نافذة مستقلة</span>
                      </a>
                    )}

                  <button
                    type="button"
                    onClick={() => setIsFullscreenDoc(!isFullscreenDoc)}
                    className="p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer transition-all"
                    title={isFullscreenDoc ? "تصغير الحجم" : "ملء الشاشة بالكامل"}
                  >
                    {isFullscreenDoc ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={closeDocViewer}
                    className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-rose-500/20 hover:text-rose-400 cursor-pointer transition-all"
                    title="إغلاق المعاينة"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Embedded Viewer */}
              <div className="flex-1 w-full bg-slate-900 overflow-hidden relative flex flex-col">
                {previewDocType === "docx" ? (
                  <DocxViewer
                    blob={previewDocBlob}
                    fileName={previewDocTitle}
                    hideHeaderTitle={true}
                    onDownload={() => handleDownloadDocument(previewDocItem || { fileName: previewDocTitle, filePath: previewDocUrl || undefined })}
                  />
                ) : previewDocType === "image" ? (
                  <div className="w-full h-full flex items-center justify-center p-4 bg-slate-950 overflow-auto">
                    <img
                      src={previewDocUrl!}
                      alt={previewDocTitle}
                      className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-slate-800"
                    />
                  </div>
                ) : previewDocType === "text" ? (
                  <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
                    {/* شريط أدوات معاينة النصوص */}
                    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs shrink-0 flex-wrap">
                      <div className="flex items-center gap-3 text-slate-400 text-[11px] font-mono">
                        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                          <FileCode className="h-3.5 w-3.5" />
                          <span>معاينة نصية مباشرة</span>
                        </span>
                        <span className="text-slate-600">•</span>
                        <span>{previewTextContent.split("\n").length.toLocaleString("ar-EG")} سطر</span>
                        <span className="text-slate-600">•</span>
                        <span>{previewTextContent.length.toLocaleString("ar-EG")} حرف</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsTextWrap(!isTextWrap)}
                          className={`h-7 px-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                            isTextWrap ? "bg-slate-800 text-blue-300" : "text-slate-400 hover:text-white"
                          }`}
                          title="تبديل التفاف الأسطر"
                        >
                          <WrapText className="h-3.5 w-3.5 ml-1" />
                          <span>التفاف الأسطر</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (typeof navigator !== "undefined" && navigator.clipboard) {
                              navigator.clipboard.writeText(previewTextContent);
                              toast.success("تم نسخ محتوى النص كاملاً بنجاح! 📋");
                            }
                          }}
                          className="h-7 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
                          title="نسخ محتوى النص كاملاً"
                        >
                          <Copy className="h-3.5 w-3.5 ml-1" />
                          <span>نسخ النص</span>
                        </Button>
                      </div>
                    </div>

                    {/* مساحة النص المحمي مع ترقيم وتنسيق الخط */}
                    <div className="flex-1 overflow-auto p-4 sm:p-6 font-mono text-xs sm:text-[13px] text-slate-200 bg-slate-950 select-text leading-relaxed custom-scrollbar">
                      <pre
                        dir="auto"
                        className={`font-mono text-xs sm:text-[13px] leading-6 text-slate-200 ${
                          isTextWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto"
                        }`}
                      >
                        {previewTextContent || "(ملف نصي فارغ)"}
                      </pre>
                    </div>
                  </div>
                ) : previewDocType === "html" ? (
                  <iframe
                    src={previewDocUrl!}
                    className="w-full h-full border-0 bg-white"
                    title={previewDocTitle}
                  />
                ) : previewDocType === "pdf" ? (
                  <iframe
                    src={`${previewDocUrl}#toolbar=1&navpanes=1&view=FitH`}
                    className="w-full h-full border-0"
                    title={previewDocTitle}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-950 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mb-4 shadow-xl">
                      <FileText className="h-8 w-8" />
                    </div>
                    <h4 className="text-base font-bold text-white mb-1.5">{previewDocTitle}</h4>
                    <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                      هذا الملف لا يتوفر له محرك عرض رسومي مباشر داخل المتصفح، ولكن يمكنك تنزيله فوراً وفتحه عبر البرنامج المخصص على جهازك.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleDownloadDocument(previewDocItem || { fileName: previewDocTitle, filePath: previewDocUrl || undefined })}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all"
                    >
                      <Download className="h-4 w-4" />
                      <span>تحميل الملف إلى جهازك</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Mobile Helper Strip */}
              <div className="sm:hidden px-3 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>للتحكم الأفضل على شاشة هاتفك:</span>
                <button
                  onClick={() => handleDownloadDocument({ fileName: previewDocTitle, filePath: previewDocUrl || undefined })}
                  className="text-blue-400 font-bold underline cursor-pointer"
                >
                  تنزيل كملف للجهاز
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
