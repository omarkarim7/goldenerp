"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Radar, Sparkles, Filter, Search, Building2, Calendar, Shield,
  ArrowUpRight, CheckCircle2, AlertCircle, AlertTriangle, RefreshCw, Zap,
  ExternalLink, ChevronLeft, Plus, Check, MapPin, DollarSign,
  FileText, Clock, Layers, Download, X, Eye, HelpCircle, ArrowRight,
  TrendingUp, Activity, CheckCircle, FilePlus2, Timer, Globe2,
  FileSearch, Maximize2, Minimize2, Gavel, Handshake, ArrowRightLeft, Info,
  LayoutGrid, LayoutList, Archive, Trash2, ChevronRight, ChevronsLeft, ChevronsRight,
  ShieldCheck, Target, Crosshair
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";
import { useCompany, CompanyCode } from "@/context/company-context";
import { DocxViewer } from "@/components/docx-viewer";
import { Portal } from "@/components/ui/portal";

interface RadarItem {
  id: string;
  sourceId: string;
  externalId: string;
  referenceNumber: string | null;
  title: string;
  authority: string | null;
  tenderType: string | null;
  governorate: string | null;
  category: string | null;
  temporaryInsurance: number | null;
  bookletPrice: number | null;
  publicationDate: string | null;
  deadline: string | null;
  sourceUrl: string | null;
  matchedCompanyCode: string | null;
  matchScore: number | null;
  isImported: boolean;
  operationId: string | null;
  createdAt: string;
  rawDetails?: {
    refNo?: string;
    title?: string;
    titleEn?: string;
    authority?: string;
    governorate?: string;
    tenderMethod?: string;
    tenderKind?: string;
    temporaryInsurance?: number;
    finalInsuranceRate?: number;
    bookletPrice?: number;
    currency?: string;
    fiscalYear?: string;
    biddingType?: string;
    divisible?: string;
    publishingDays?: number;
    deliveryDuration?: string;
    evaluationType?: string;
    tenderNature?: string;
    activities?: string;
    conditions?: string;
    notes?: string;
    email?: string;
    tags?: string[];
    parts?: Array<{ serial: number; name: string }>;
    items?: Array<{ serial: number; name: string; partName?: string; type?: string; quantity?: number }>;
    timeline?: {
      announcementDate?: string;
      techEnvelopeOpenDate?: string;
      techDecisionDate?: string;
      finEnvelopeOpenDate?: string;
      finDecisionDate?: string;
      awardDate?: string;
      inquiriesSessionDate?: string;
      inquiriesReplyDate?: string;
      auctionSessionDate?: string;
      stages?: Array<{ label: string; date: string }>;
    };
    attachments?: Array<{ serial: number; name: string; docId?: string; downloadUrl: string }>;
  };
}

interface RadarStats {
  totalCount: number;
  pendingCount: number;
  importedCount: number;
  highMatchCount: number;
  lastScanTime: string | null;
  sourceName: string;
}

const ALL_COMPANIES = [
  { code: "A", name: "المجموعة الذهبية (A)", shortName: "جولدن (A)", desc: "شبكات وتكنولوجيا وتوريدات كبرى" },
  { code: "B", name: "العالمية للتوريدات (B)", shortName: "إكسلنت (B)", desc: "مستلزمات وتجهيزات طبية ومهمات وقاية" },
  { code: "C", name: "المتحدة للمقاولات (C)", shortName: "العهد (C)", desc: "مقاولات وصيانة بنية ومحطات مياه وصرف" },
  { code: "D", name: "الحديثة للتجارة (D)", shortName: "الحديثة (D)", desc: "توريدات عامة، أدوات ومزادات سريعة" },
];

export default function RadarPage() {
  const router = useRouter();
  const { selectedCompany, setSelectedCompany } = useCompany();

  // State
  const [items, setItems] = useState<RadarItem[]>([]);
  const [stats, setStats] = useState<RadarStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<{ connected: boolean; message: string } | null>(null);

  // Dynamic Real-time Synchronous Counts (Instantly reactive on items changes)
  const totalCount = items.length;
  const pendingCount = items.filter((i) => !i.isImported).length;
  const importedCount = items.filter((i) => i.isImported).length;

  // View Mode: 'grid' (بطاقات) | 'table' (جداول)
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Track Viewed Tenders (معاينة كراسة الشروط)
  const [viewedTenderIds, setViewedTenderIds] = useState<Set<string>>(new Set());

  // Auto-Scan Daily Config State
  const [autoScanConfig, setAutoScanConfig] = useState<{
    enabled: boolean;
    scheduledTime: string;
    lastAutoScan: string | null;
  }>({
    enabled: true,
    scheduledTime: "09:00 ص",
    lastAutoScan: null,
  });
  const [isUpdatingAutoScan, setIsUpdatingAutoScan] = useState(false);

  // Scanning Overlay & Interactive Animation
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scanResult, setScanResult] = useState<{ success: boolean; total: number; message: string; isNew?: boolean } | null>(null);

  // Document Viewer Modal State (Supports both PDF & Word DOCX in-app)
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewDocBlob, setPreviewDocBlob] = useState<Blob | null>(null);
  const [previewDocType, setPreviewDocType] = useState<"pdf" | "docx" | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>("");
  const [previewTenderItem, setPreviewTenderItem] = useState<RadarItem | null>(null);
  const [previewDocId, setPreviewDocId] = useState<string>("");
  const [isFullscreenPdf, setIsFullscreenPdf] = useState(false);
  const [isArchivingDoc, setIsArchivingDoc] = useState(false);
  const [isLoadingDoc, setIsLoadingDoc] = useState<boolean>(false);

  // Modern UI Delete & Clear Confirmation Modal State (Zero browser alerts/confirms)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "clear_all" | "delete_item";
    item?: RadarItem | null;
    title?: string;
  }>({
    isOpen: false,
    type: "clear_all",
    item: null,
    title: "",
  });
  const [isConfirmActionLoading, setIsConfirmActionLoading] = useState(false);

  // Filters (Default to PENDING so withdrawn items don't crowd the active feed)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [importFilter, setImportFilter] = useState<"ALL" | "PENDING" | "IMPORTED">("PENDING");
  const [recencyFilter, setRecencyFilter] = useState<"ALL" | "TODAY" | "YESTERDAY" | "RECENT">("ALL");
  const [sortOption, setSortOption] = useState<"date" | "deadline">("date");

  // Pagination State (Default 5 rows minimum)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  // Modals
  const [activeDetailsItem, setActiveDetailsItem] = useState<RadarItem | null>(null);
  const [detailsTab, setDetailsTab] = useState<"basic" | "items" | "timeline" | "attachments">("basic");

  const [convertModalItem, setConvertModalItem] = useState<RadarItem | null>(null);
  const [targetCompanyCode, setTargetCompanyCode] = useState<string>("A");
  const [convertNotes, setConvertNotes] = useState<string>("");
  const [isConverting, setIsConverting] = useState(false);

  // Load Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, statsRes, statusRes, autoScanRes] = await Promise.all([
        api.get("/radar/items?limit=100&sortBy=newest"),
        api.get("/radar/stats"),
        api.get("/radar/status").catch(() => ({ data: { connected: false, message: "غير متصل" } })),
        api.get("/radar/auto-scan-config").catch(() => ({ data: { enabled: true, scheduledTime: "09:00 ص", lastAutoScan: null } })),
      ]);

      setItems(itemsRes.data?.items || []);
      setStats(statsRes.data);
      setConnectionStatus(statusRes.data);
      if (autoScanRes?.data) {
        setAutoScanConfig(autoScanRes.data);
      }
    } catch (err: any) {
      toast.error("فشل تحميل بيانات الرادار من السيرفر");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Load viewed tenders from localStorage
    try {
      const saved = localStorage.getItem("goldenerp_viewed_tenders");
      if (saved) {
        setViewedTenderIds(new Set(JSON.parse(saved)));
      }
    } catch {}
  }, []);

  const markTenderAsViewed = (id: string) => {
    setViewedTenderIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem("goldenerp_viewed_tenders", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Toggle Daily Auto-Scan
  const handleToggleAutoScan = async () => {
    try {
      setIsUpdatingAutoScan(true);
      const newEnabled = !autoScanConfig.enabled;
      const res = await api.post("/radar/auto-scan-config", {
        enabled: newEnabled,
        scheduledTime: autoScanConfig.scheduledTime,
      });
      if (res.data) {
        setAutoScanConfig(res.data);
      }
      const activeTime = res.data?.scheduledTime || autoScanConfig.scheduledTime || "09:00 ص";
      toast.success(
        newEnabled
          ? `تم تفعيل الفحص اليومي التلقائي بنجاح (يومياً ${activeTime})`
          : "تم إيقاف الفحص اليومي التلقائي مؤقتاً"
      );
    } catch {
      toast.error("فشل تحديث إعدادات الفحص التلقائي");
    } finally {
      setIsUpdatingAutoScan(false);
    }
  };

  // Trigger Live Scan with High-Tech Animated Radar Overlay (Incremental)
  const handleScan = async () => {
    setIsScanning(true);
    setScanStep(0);
    setScanResult(null);

    // Progressive animation step ticker
    const timer1 = setTimeout(() => setScanStep(1), 1000);
    const timer2 = setTimeout(() => setScanStep(2), 2200);
    const timer3 = setTimeout(() => setScanStep(3), 3600);

    try {
      const res = await api.post("/radar/scan", { pagesCount: 2 });
      if (res.data?.success) {
        setScanStep(4);
        const newCount = res.data.newCount ?? 0;
        const totalScanned = res.data.totalScanned ?? 0;
        const totalItemsCount = totalScanned || items.length;
        const msg = newCount > 0
          ? `تم رصد ${newCount} مناقصة جديدة اليوم وإضافتها للرادار بنجاح!`
          : totalItemsCount > 0
            ? `الرادار محدث بالكامل: تم التحقق وتحديث كافة المناقصات المطروحة (${totalItemsCount} مناقصة).`
            : `الرادار جاهز ومحدث: تم فحص البوابة بنجاح.`;

        setScanResult({
          success: true,
          total: newCount > 0 ? newCount : totalItemsCount,
          isNew: newCount > 0,
          message: msg,
        });
        await fetchData();
        toast.success(msg);
      } else {
        setScanResult({
          success: false,
          total: 0,
          isNew: false,
          message: "تعذر إكمال الفحص التلقائي من البوابة الحكومية. يرجى إعادة المحاولة.",
        });
        toast.error("تعذر إكمال الفحص التلقائي");
      }
    } catch (err: any) {
      setScanResult({
        success: false,
        total: 0,
        isNew: false,
        message: err.response?.data?.message || "حدث خطأ مؤقت أثناء الاتصال ببوابة التعاقدات الحكومية.",
      });
      toast.error(err.response?.data?.message || "حدث خطأ أثناء فحص البوابة الحكومية");
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    }
  };

  const closeScanOverlay = async () => {
    setIsScanning(false);
    setScanResult(null);
    setScanStep(0);
    // Reset filters so that all radar items are unconditionally visible to user
    setSearchQuery("");
    setSelectedMethod("ALL");
    setSelectedCategory("ALL");
    setImportFilter("ALL");
    setSelectedCompany("ALL");
    setCurrentPage(1);
    await fetchData();
    setTimeout(() => {
      document.getElementById("radar-tenders-grid")?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  };

  // Convert to Operation
  const handleConvertToOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertModalItem) return;

    setIsConverting(true);
    try {
      const res = await api.post(`/radar/items/${convertModalItem.id}/convert`, {
        companyCode: targetCompanyCode,
        notes: convertNotes || undefined,
      });

      if (res.data?.success) {
        toast.success(res.data.message || "تم تحويل المناقصة إلى عملية بنجاح!");
        // Isolate company: Immediately switch global company scope so Navbar, Sidebar, and all pages reflect the selected company (e.g. C)!
        if (["A", "B", "C", "D"].includes(targetCompanyCode)) {
          setSelectedCompany(targetCompanyCode as CompanyCode);
        }
        setConvertModalItem(null);
        await fetchData();

        if (res.data.operationId) {
          router.push(`/dashboard/operations/${res.data.operationId}`);
        }
      } else {
        toast.info(res.data?.message || "العملية محولة مسبقاً");
        setConvertModalItem(null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل تحويل المناقصة إلى عملية");
    } finally {
      setIsConverting(false);
    }
  };

  // Open Convert Modal
  const openConvertModal = (item: RadarItem) => {
    setConvertModalItem(item);
    // Align with active company selection if specific company is chosen, otherwise default to A
    const initialComp = (selectedCompany && selectedCompany !== "ALL") ? selectedCompany : "A";
    setTargetCompanyCode(initialComp);
    setConvertNotes("");
  };

  // Document Helpers: Preview in Built-In Responsive Viewer (Supports PDF & Word DOCX in-app)
  const handlePreviewDocument = async (docId: string, tender?: RadarItem | string | null, title?: string) => {
    try {
      setIsLoadingDoc(true);
      toast.info("جاري فحص كراسة الشروط وتحضيرها للعرض...");
      const tenderId = typeof tender === "string" ? tender : tender?.id || tender?.externalId || "";
      if (typeof tender === "object" && tender) {
        setPreviewTenderItem(tender);
      } else if (activeDetailsItem) {
        setPreviewTenderItem(activeDetailsItem);
      }
      setPreviewDocId(docId);

      const res = await api.get(`/radar/download-doc?docId=${docId}&tenderId=${tenderId || ""}`, {
        responseType: "blob",
      });

      // Extract real filename & content type
      let docTitle = title || "كراسة الشروط والمواصفات الرسمية";
      const disposition = res.headers?.["content-disposition"] || "";
      const utf8Match = disposition.match(/filename\*=UTF-8''([^;\r\n]+)/i);
      if (utf8Match) {
        try { docTitle = decodeURIComponent(utf8Match[1]); } catch {}
      } else {
        const normalMatch = disposition.match(/filename="?([^";\r\n]+)"?/i);
        if (normalMatch) docTitle = normalMatch[1];
      }

      const contentType = (res.headers?.["content-type"] || res.data?.type || "").toLowerCase();
      const isWordDoc = docTitle.toLowerCase().endsWith(".docx") || docTitle.toLowerCase().endsWith(".doc") || contentType.includes("word") || contentType.includes("officedocument");
      const isZip = docTitle.toLowerCase().endsWith(".zip") || docTitle.toLowerCase().endsWith(".rar") || contentType.includes("zip");

      if (isZip) {
        // Zip archive cannot be rendered inside viewer, download directly
        const blob = new Blob([res.data], { type: contentType || "application/octet-stream" });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = docTitle.replace(/[\/\\:*?"<>|]/g, "_");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        toast.success(`الملف مضغوط (${docTitle}) تم تنزيله لجهازك مباشرة! 📦`);
        return;
      }

      if (isWordDoc) {
        // Render Word document directly inside the built-in modal!
        const wordBlob = new Blob([res.data], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
        setPreviewDocBlob(wordBlob);
        setPreviewDocType("docx");
        setPreviewDocTitle(docTitle);
        setPreviewPdfUrl("docx_viewer_active");
        toast.success("تم فتح كراسة الشروط بصيغة Word للمعاينة المباشرة! 📄");
        return;
      }

      // Check PDF magic bytes (%PDF-)
      const blob = new Blob([res.data], { type: "application/pdf" });
      const firstSlice = await blob.slice(0, 5).text();
      if (!firstSlice.startsWith("%PDF")) {
        // Check if file is actually a DOCX without extension (starts with PK)
        try {
          const header = await blob.slice(0, 2).text();
          if (header === "PK") {
            setPreviewDocBlob(blob);
            setPreviewDocType("docx");
            setPreviewDocTitle(docTitle.endsWith(".docx") ? docTitle : `${docTitle}.docx`);
            setPreviewPdfUrl("docx_viewer_active");
            toast.success("تم فتح كراسة الشروط بصيغة Word للمعاينة المباشرة! 📄");
            return;
          }
        } catch {}

        // Fallback: If not valid PDF, download directly
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = docTitle.includes(".") ? docTitle : `${docTitle}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        toast.info("تم تنزيل المستند لجهازك مباشرة لعدم إمكانية العرض المباشر داخل المتصفح.");
        return;
      }

      const blobUrl = URL.createObjectURL(blob);
      setPreviewDocBlob(blob);
      setPreviewDocType("pdf");
      setPreviewPdfUrl(blobUrl);
      setPreviewDocTitle(docTitle);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "تعذر جلب ملف كراسة الشروط من البوابة الحكومية");
    } finally {
      setIsLoadingDoc(false);
    }
  };

  const closePdfViewer = () => {
    if (previewPdfUrl && previewPdfUrl !== "docx_viewer_active") {
      URL.revokeObjectURL(previewPdfUrl);
    }
    setPreviewPdfUrl(null);
    setPreviewDocBlob(null);
    setPreviewDocType(null);
    setIsFullscreenPdf(false);
  };

  // Document Helpers: Archive to Operation's Documents Hub
  const handleArchiveDocument = async () => {
    const item = previewTenderItem || activeDetailsItem;
    if (!item) {
      toast.error("بيانات المناقصة غير متوفرة");
      return;
    }

    if (!item.isImported || !item.operationId) {
      toast.info("هذه المناقصة لم تسحب كعملية بعد. يرجى سحبها كعملية أولاً ليتم إدراج كراسة الشروط بأرشيفها الرسمي.");
      openConvertModal(item);
      return;
    }

    try {
      setIsArchivingDoc(true);
      const res = await api.post(`/radar/items/${item.id}/archive`, {
        docId: previewDocId,
        fileName: previewDocTitle,
        operationId: item.operationId,
      });

      if (res.data?.success) {
        toast.success(res.data.message || "تم حفظ وأرشفة كراسة الشروط في ملف العملية بنجاح! 🗄️");
      } else {
        toast.info(res.data?.message || "الكراسة محفوظة مسبقاً في أرشيف العملية");
      }
    } catch {
      toast.error("فشل حفظ المستند في أرشيف العملية");
    } finally {
      setIsArchivingDoc(false);
    }
  };

  // Document Helpers: Direct Download with Automatic Operation Archiving
  const handleDirectDownload = async (docId: string, tender?: RadarItem | string | null, title?: string) => {
    try {
      toast.info("جاري تحميل كراسة الشروط على جهازك...");
      const tenderId = typeof tender === "string" ? tender : tender?.id || tender?.externalId || "";
      const tenderObj = typeof tender === "object" ? tender : activeDetailsItem;

      const res = await api.get(`/radar/download-doc?docId=${docId}&tenderId=${tenderId || ""}&download=true`, {
        responseType: "blob",
      });

      // Extract real filename from response headers if available
      let downloadFileName = title || "كراسة_الشروط";
      const disposition = res.headers?.["content-disposition"] || "";
      const utf8Match = disposition.match(/filename\*=UTF-8''([^;\r\n]+)/i);
      if (utf8Match) {
        try { downloadFileName = decodeURIComponent(utf8Match[1]); } catch {}
      } else {
        const normalMatch = disposition.match(/filename="?([^";\r\n]+)"?/i);
        if (normalMatch) downloadFileName = normalMatch[1];
      }

      // If no extension, infer from content-type
      const contentType = (res.headers?.["content-type"] || res.data?.type || "").toLowerCase();
      if (!downloadFileName.includes(".")) {
        if (contentType.includes("word") || contentType.includes("officedocument")) {
          downloadFileName += ".docx";
        } else if (contentType.includes("zip")) {
          downloadFileName += ".zip";
        } else {
          downloadFileName += ".pdf";
        }
      }

      const blob = new Blob([res.data], { type: contentType || "application/octet-stream" });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = downloadFileName.replace(/[\/\\:*?"<>|]/g, "_");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      // Auto-archive in operation if tender has an operationId
      if (tenderObj && tenderObj.isImported && tenderObj.operationId) {
        api.post(`/radar/items/${tenderObj.id}/archive`, {
          docId,
          fileName: downloadFileName,
          operationId: tenderObj.operationId,
        }).catch(() => {});
        toast.success(`تم بدء تحميل ${downloadFileName} وتوثيقه بأرشيف العملية! ✓`);
      } else {
        toast.success(`تم بدء تحميل ${downloadFileName} بنجاح على جهازك! ✓`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "تعذر تحميل كراسة الشروط");
    }
  };

  // Delete single radar item - opens custom confirmation modal
  const handleDeleteItem = (id?: string, title?: string) => {
    if (!id) return;
    const targetItem = items.find((i) => i.id === id) || null;
    setConfirmModal({
      isOpen: true,
      type: "delete_item",
      item: targetItem,
      title: title || targetItem?.title || "المناقصة",
    });
  };

  // Bulk clean: Clear all pending items - opens custom confirmation modal
  const handleClearAllPending = () => {
    setConfirmModal({
      isOpen: true,
      type: "clear_all",
      item: null,
      title: "مسح كافة الملتقطات",
    });
  };

  // Execute Confirmed Delete or Clear (Zero browser confirm popups!)
  const handleExecuteConfirm = async () => {
    if (confirmModal.type === "clear_all") {
      setIsConfirmActionLoading(true);
      try {
        const res = await api.delete("/radar/clear-pending");
        const remaining = items.filter((i) => i.isImported);
        setItems(remaining);
        setStats((prev) => prev ? {
          ...prev,
          totalCount: remaining.length,
          pendingCount: 0,
          importedCount: remaining.length,
        } : null);
        setConfirmModal({ isOpen: false, type: "clear_all", item: null, title: "" });
        toast.success(res.data?.message || "تم مسح كافة المناقصات الملتقطة بالرادار بنجاح 🗑️");
        // Re-fetch backend stats silently
        api.get("/radar/stats").then((sRes) => setStats(sRes.data)).catch(() => {});
      } catch {
        toast.error("فشل مسح مناقصات الرادار");
      } finally {
        setIsConfirmActionLoading(false);
      }
    } else if (confirmModal.type === "delete_item") {
      if (!confirmModal.item?.id) return;
      const targetId = confirmModal.item.id;
      setIsConfirmActionLoading(true);
      try {
        await api.delete(`/radar/items/${targetId}`);
        const remaining = items.filter((i) => i.id !== targetId);
        setItems(remaining);
        if (activeDetailsItem?.id === targetId) setActiveDetailsItem(null);
        if (previewTenderItem?.id === targetId) closePdfViewer();
        setStats((prev) => prev ? {
          ...prev,
          totalCount: remaining.length,
          pendingCount: remaining.filter((i) => !i.isImported).length,
          importedCount: remaining.filter((i) => i.isImported).length,
        } : null);
        setConfirmModal({ isOpen: false, type: "delete_item", item: null, title: "" });
        toast.success("تم حذف المناقصة من الرادار بنجاح 🗑️");
        // Re-fetch backend stats silently
        api.get("/radar/stats").then((sRes) => setStats(sRes.data)).catch(() => {});
      } catch {
        toast.error("فشل حذف المناقصة من الرادار");
      } finally {
        setIsConfirmActionLoading(false);
      }
    }
  };

  // Bulk clean: Reset company assignments on radar items
  const handleResetCompanyAssignments = async () => {
    try {
      const res = await api.post("/radar/reset-company-assignments");
      setItems((prev) => prev.map((i) => ({ ...i, matchedCompanyCode: null, matchScore: null })));
      toast.success(res.data?.message || "تم إلغاء أي ربط مسبق بالشركات بنجاح");
    } catch {
      toast.error("فشل تصفير ربط الشركات");
    }
  };

  // Helper to extract docId from attachment downloadUrl
  const extractDocId = (att: { docId?: string; downloadUrl: string }) => {
    if (att.docId) return att.docId;
    const match = att.downloadUrl.match(/DocId=([a-zA-Z0-9\-]+)/i);
    return match ? match[1] : "";
  };

  // Currency Formatter
  const formatCurrency = (n?: number | null) => {
    if (n === null || n === undefined) return "غير محدد";
    return new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(n);
  };

  // Arabic Date Formatter
  const formatArabicDate = (dateStr?: string | null) => {
    if (!dateStr) return "غير محدد بالكراسة";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("ar-EG", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Calculate Days Remaining
  const getDaysRemaining = (deadlineStr?: string | null) => {
    if (!deadlineStr) return null;
    const d = new Date(deadlineStr);
    if (isNaN(d.getTime())) return null;
    const now = new Date();
    const diffTime = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Detection Recency Badge Helper (Intelligent Discovery)
  const getDetectionBadge = (createdAtStr?: string | null, pubDateStr?: string | null) => {
    const dateToCheck = createdAtStr || pubDateStr;
    if (!dateToCheck) return null;
    const itemDate = new Date(dateToCheck);
    if (isNaN(itemDate.getTime())) return null;
    const now = new Date();
    const diffMs = now.getTime() - itemDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    const isSameCalendarDay =
      itemDate.getDate() === now.getDate() &&
      itemDate.getMonth() === now.getMonth() &&
      itemDate.getFullYear() === now.getFullYear();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      itemDate.getDate() === yesterday.getDate() &&
      itemDate.getMonth() === yesterday.getMonth() &&
      itemDate.getFullYear() === yesterday.getFullYear();

    if (isSameCalendarDay || diffHours <= 24) {
      return {
        label: "تم رصدها اليوم 🟢",
        className: "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 font-black animate-pulse",
        type: "TODAY" as const,
      };
    }
    if (isYesterday || (diffHours > 24 && diffHours <= 48)) {
      return {
        label: "رُصدت أمس ⚡",
        className: "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 font-bold",
        type: "YESTERDAY" as const,
      };
    }
    if (diffHours <= 72) {
      return {
        label: "مناقصة جديدة 🚀",
        className: "bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border-cyan-500/40 font-bold",
        type: "RECENT" as const,
      };
    }
    return null;
  };

  // Real-time Today Detected Items Count
  const todayDetectedCount = useMemo(() => {
    return items.filter((i) => {
      const b = getDetectionBadge(i.createdAt, i.publicationDate);
      return b?.type === "TODAY";
    }).length;
  }, [items]);

  // Filtered and Sorted Items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = item.title.toLowerCase().includes(q);
          const matchesAuth = (item.authority || "").toLowerCase().includes(q);
          const matchesRef = (item.referenceNumber || "").toLowerCase().includes(q);
          const matchesType = (item.tenderType || "").toLowerCase().includes(q);
          const matchesGov = (item.governorate || "").toLowerCase().includes(q);
          if (!matchesTitle && !matchesAuth && !matchesRef && !matchesType && !matchesGov) return false;
        }

        // Import Status Filter
        if (importFilter === "PENDING" && item.isImported) return false;
        if (importFilter === "IMPORTED" && !item.isImported) return false;

        // Recency Filter
        if (recencyFilter !== "ALL") {
          const badge = getDetectionBadge(item.createdAt, item.publicationDate);
          if (recencyFilter === "TODAY" && badge?.type !== "TODAY") return false;
          if (recencyFilter === "YESTERDAY" && badge?.type !== "YESTERDAY") return false;
          if (recencyFilter === "RECENT" && !badge) return false;
        }

        // Method Filter (طريقة الطرح: مناقصة، ممارسة، مزايدة، إسناد)
        if (selectedMethod !== "ALL") {
          const m = `${item.tenderType || ""} ${item.rawDetails?.tenderMethod || ""}`.toLowerCase();
          if (selectedMethod === "TENDER" && !m.includes("مناقص")) return false;
          if (selectedMethod === "PRACTICE" && !m.includes("ممارس")) return false;
          if (selectedMethod === "AUCTION" && !m.includes("مزايد") && !m.includes("مزاد")) return false;
          if (selectedMethod === "DIRECT" && !m.includes("مباشر") && !m.includes("إسناد")) return false;
        }

        // Category / Scope Filter (طبيعة ومجال العمل)
        if (selectedCategory !== "ALL") {
          const cat = `${item.category || ""} ${item.rawDetails?.tenderKind || ""} ${item.rawDetails?.activities || ""}`.toLowerCase();
          if (selectedCategory === "NETWORKS" && !cat.includes("شبكات") && !cat.includes("حاسب") && !cat.includes("تكنولوج")) return false;
          if (selectedCategory === "MEDICAL" && !cat.includes("طبي") && !cat.includes("مستشف") && !cat.includes("أدوي") && !cat.includes("وقاي")) return false;
          if (selectedCategory === "CONSTRUCTION" && !cat.includes("مقاولات") && !cat.includes("صيان") && !cat.includes("مضخ") && !cat.includes("بنية")) return false;
          if (selectedCategory === "SUPPLIES" && !cat.includes("توريد") && !cat.includes("مستلزمات")) return false;
          if (selectedCategory === "AUCTION_SALES" && !cat.includes("بيع") && !cat.includes("تأجير") && !cat.includes("كهنة") && !cat.includes("خردة") && !cat.includes("عقار")) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === "deadline") {
          const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
          const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
          return da - db;
        }
        // Default: newest publication date first (أحدث طرح أولاً)
        const pa = a.publicationDate ? new Date(a.publicationDate).getTime() : new Date(a.createdAt).getTime();
        const pb = b.publicationDate ? new Date(b.publicationDate).getTime() : new Date(b.createdAt).getTime();
        return pb - pa;
      });
  }, [items, searchQuery, importFilter, recencyFilter, selectedMethod, selectedCategory, sortOption]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, importFilter, recencyFilter, selectedMethod, selectedCategory, sortOption, pageSize]);

  // Pagination calculations
  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedItems = useMemo(() => {
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, startIndex, endIndex]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "ellipsis")[] = [];
    if (safeCurrentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push("ellipsis");
      pages.push(totalPages);
    } else if (safeCurrentPage >= totalPages - 3) {
      pages.push(1);
      pages.push("ellipsis");
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("ellipsis");
      pages.push(safeCurrentPage - 1);
      pages.push(safeCurrentPage);
      pages.push(safeCurrentPage + 1);
      pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  }, [safeCurrentPage, totalPages]);

  // Render Pagination Toolbar Footer
  const renderPaginationToolbar = () => {
    if (totalItems === 0) return null;

    return (
      <div className="p-3.5 sm:p-4 border-t border-border bg-card/70 backdrop-blur-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Right side in RTL: Showing range summary */}
        <div className="flex items-center gap-2.5 text-muted-foreground flex-wrap justify-center sm:justify-start">
          <div className="flex items-center gap-1.5 font-medium">
            <span>عرض</span>
            <span className="font-mono font-bold text-foreground px-1.5 py-0.5 rounded-md bg-muted border border-border">
              {startIndex + 1} - {endIndex}
            </span>
            <span>من أصل</span>
            <span className="font-mono font-bold text-foreground px-1.5 py-0.5 rounded-md bg-muted border border-border">
              {totalItems}
            </span>
            <span>مناقصة</span>
          </div>

          <span className="hidden sm:inline text-border">•</span>

          <span className="text-[11px] font-semibold text-muted-foreground font-mono">
            صفحة {safeCurrentPage} من {totalPages}
          </span>
        </div>

        {/* Center/Left in RTL: Page size selector + Page navigation controls */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {/* Rows per page selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground whitespace-nowrap text-[11px] sm:text-xs font-semibold">
              الصفوف في الصفحة:
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-muted/70 hover:bg-muted border border-border text-foreground font-bold font-mono rounded-xl px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500 cursor-pointer transition-colors"
            >
              <option value={5}>5 صفوف</option>
              <option value={10}>10 صفوف</option>
              <option value={20}>20 صف</option>
              <option value={50}>50 صف</option>
              <option value={100}>100 صف</option>
            </select>
          </div>

          <div className="h-4 w-px bg-border hidden sm:block" />

          {/* Page navigation buttons */}
          <div className="flex items-center gap-1">
            {/* First Page (<<) */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage <= 1}
              className="h-8 w-8 rounded-lg border-border text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="الصفحة الأولى"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>

            {/* Previous Page (<) */}
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              className="h-8 px-2.5 rounded-lg border-border text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center gap-1 font-bold text-xs"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">السابق</span>
            </Button>

            {/* Page number buttons */}
            <div className="flex items-center gap-1">
              {pageNumbers.map((page, idx) => {
                if (page === "ellipsis") {
                  return (
                    <span key={`ell-${idx}`} className="px-1 text-muted-foreground select-none">
                      …
                    </span>
                  );
                }
                const isCurrent = page === safeCurrentPage;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page as number)}
                    className={`h-8 min-w-[32px] px-2 rounded-lg font-mono font-bold text-xs transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-blue-600 text-white shadow-xs scale-105"
                        : "bg-muted/40 hover:bg-muted border border-border text-foreground"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            {/* Next Page (>) */}
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
              className="h-8 px-2.5 rounded-lg border-border text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center gap-1 font-bold text-xs"
            >
              <span className="hidden sm:inline">التالي</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

            {/* Last Page (>>) */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage >= totalPages}
              className="h-8 w-8 rounded-lg border-border text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="الصفحة الأخيرة"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const scanSteps = [
    { label: "المصادقة وتأمين جلسة الاتصال المشفرة", detail: "التحقق من الهوية الرقمية والاعتماد الحكومي المعتمد" },
    { label: "الاتصال المباشر بقاعدة بيانات التعاقدات العامة", detail: "مزامنة البيانات الحية مع بوابة التعاقدات الحكومية المركزية" },
    { label: "مسح وتحليل أحدث العمليات المطروحة اليوم", detail: "سحب أحدث المناقصات وتاريخ الطرح والمواعيد الحساسة" },
    { label: "استخراج كراسات الشروط والبنود التفصيلية", detail: "تجهيز كراسات الشروط والبنود للتحميل والمعاينة المباشرة" },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16">
      {/* ========================================================================= */}
      {/* 1. Header Banner: Standalone Unified Central Radar for all Companies      */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl glass-card p-5 sm:p-7 border border-border dark:border-slate-700/80 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full badge-blue text-xs font-semibold">
              <Globe2 className="h-3.5 w-3.5 text-blue-400" />
              <span>الرادار الحكومي المركزي العام • رصد واستكشاف الفرص والمناقصات الحكومية</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              رادار أحدث المناقصات الحكومية اليوم
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              يقوم الرادار بفحص ورصد العمليات والمناقصات الحكومية وسحب كراسات الشروط والبنود والمواعيد مباشرة دون ربط مسبق بأي شركة، مع إتاحة سحب وتسجيل أي عملية وتحديد الشركة التابعة لها عند السحب.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {/* Auto-Scan Daily Toggle */}
            <div className="flex items-center gap-2.5 bg-muted/60 p-2 px-3 rounded-2xl border border-border">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${autoScanConfig.enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              <div className="text-right">
                <span className="text-[11px] font-bold text-foreground block leading-tight">
                  الفحص اليومي التلقائي
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {autoScanConfig.enabled ? `مفعل (يومياً ${autoScanConfig.scheduledTime})` : "معطل مؤقتاً"}
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleAutoScan}
                disabled={isUpdatingAutoScan}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  autoScanConfig.enabled
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                    : "bg-muted text-muted-foreground border border-border hover:text-foreground"
                }`}
              >
                {autoScanConfig.enabled ? "مفعل" : "تفعيل"}
              </button>
            </div>

            {/* Clear / Clean Radar Button */}
            <Button
              variant="outline"
              onClick={handleClearAllPending}
              className="border-rose-500/30 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-400 font-bold px-4 py-3.5 rounded-2xl text-xs sm:text-sm transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5"
              title="مسح وحذف كافة المناقصات الملتقطة بالرادار غير المسحوبة"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">مسح الملتقطات</span>
            </Button>

            {/* Single Unified Radar Scan Button */}
            <Button
              onClick={handleScan}
              disabled={isScanning}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold px-6 py-3.5 rounded-2xl shadow-xl shadow-blue-500/25 flex items-center gap-2.5 text-xs sm:text-sm active:scale-95 transition-all cursor-pointer border border-blue-400/30"
            >
              <RefreshCw className={`h-4 w-4 ${isScanning ? "animate-spin" : ""}`} />
              <span>{isScanning ? "جاري الفحص المباشر..." : "تشغيل فحص الرادار الآن"}</span>
            </Button>
          </div>
        </div>

        {/* Confidential Live Connection Status Strip (Zero English / Zero Emails) */}
        <div className="mt-6 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-foreground">الرادار متصل ومؤمن بالبوابة الحكومية الرسمية</span>
            <span className="text-muted-foreground">•</span>
            <span>نظام الفحص التراكمي الذكي نشط وجاهز للرصد اليومي</span>
          </div>

          {stats?.lastScanTime && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              <span>آخر فحص: {new Date(stats.lastScanTime).toLocaleTimeString("ar-EG")}</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Key Metric KPI Cards (100% Dynamic & Instantly Reactive)               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: إجمالي العمليات المرصودة */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-border">
          <span className="text-xs text-muted-foreground font-bold">إجمالي العمليات بالرادار</span>
          <p className="text-2xl sm:text-3xl font-black text-foreground mt-1 font-mono">
            {totalCount}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">مسحوبة من البوابة الحكومية</span>
        </div>

        {/* KPI 2: تم رصدها اليوم (الجديدة) */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-emerald-500/40 bg-emerald-500/[0.04] relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span>تم رصدها اليوم</span>
            </span>
            <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
              جديد 🟢
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {todayDetectedCount}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">عمليات ملتقطة خلال آخر 24 ساعة</span>
        </div>

        {/* KPI 3: فرص جديدة بانتظار الإجراء */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-amber-500/30">
          <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">فرص قيد الانتظار</span>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
            {pendingCount}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">جاهزة للسحب والتسجيل</span>
        </div>

        {/* KPI 4: تم تحويلها لعمليات بالمنظومة */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-blue-500/30">
          <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">تم تحويلها لعمليات</span>
          <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-1 font-mono">
            {importedCount}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">مسجلة رسمياً كعمليات</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. Search and Clean Unified Filter Toolbar                                */}
      {/* ========================================================================= */}
      <div className="glass-card rounded-2xl p-3.5 sm:p-4 border border-border shadow-md space-y-3">
        {/* Row 1: Search Input + Status Filter Segmented Control */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Instant Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث فوري في العمليات (اسم المناقصة، الجهة الحكومية، رقم المرجع، المحافظة)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 pl-9 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-xs sm:text-sm h-10"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                title="مسح البحث"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Operation Status Filter (المتاحة للسحب vs المسحوبة vs كافة العمليات) */}
          <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border text-xs shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setImportFilter("PENDING")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                importFilter === "PENDING"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              المتاحة للسحب ({items.filter((i) => !i.isImported).length})
            </button>
            <button
              type="button"
              onClick={() => setImportFilter("IMPORTED")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                importFilter === "IMPORTED"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              المسحوبة بالمنظومة ({items.filter((i) => i.isImported).length})
            </button>
            <button
              type="button"
              onClick={() => setImportFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                importFilter === "ALL"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              كافة العمليات ({items.length})
            </button>
          </div>
        </div>

        {/* Row 1.5: Smart Detection Timing Filter Chips (تم رصدها اليوم 🟢 / رصدت أمس ⚡ / الكل) */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] font-bold text-muted-foreground ml-1">توقيت الرصد الذكي:</span>
          <button
            type="button"
            onClick={() => setRecencyFilter("ALL")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              recencyFilter === "ALL"
                ? "bg-foreground text-background border-foreground shadow-xs"
                : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            الكل ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setRecencyFilter("TODAY")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
              recencyFilter === "TODAY"
                ? "bg-emerald-600 text-white border-emerald-500 shadow-xs"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>تم رصدها اليوم ({todayDetectedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setRecencyFilter("YESTERDAY")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
              recencyFilter === "YESTERDAY"
                ? "bg-amber-600 text-white border-amber-500 shadow-xs"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
            }`}
          >
            <span>⚡ رُصدت أمس ({items.filter((i) => getDetectionBadge(i.createdAt, i.publicationDate)?.type === "YESTERDAY").length})</span>
          </button>
          <button
            type="button"
            onClick={() => setRecencyFilter("RECENT")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
              recencyFilter === "RECENT"
                ? "bg-cyan-600 text-white border-cyan-500 shadow-xs"
                : "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20"
            }`}
          >
            <span>🚀 ملتقطات حديثة (آخر 72 ساعة)</span>
          </button>
        </div>

        {/* Row 2: Method & Category Dropdowns + Reset + Result Count + View Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-border/70 text-xs">
          {/* Dropdown Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tender Method Dropdown */}
            <div className="relative">
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="bg-muted/40 hover:bg-muted/60 border border-border text-foreground font-semibold rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 transition-colors cursor-pointer appearance-none pl-8"
              >
                <option value="ALL">طريقة الطرح: كافة الطرق</option>
                <option value="TENDER">مناقصات عامة ومحدودة</option>
                <option value="PRACTICE">ممارسات عامة ومحدودة</option>
                <option value="AUCTION">مزايدات علنية ومحلية</option>
                <option value="DIRECT">إسناد واتفاق مباشر</option>
              </select>
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>

            {/* Scope / Category Dropdown */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-muted/40 hover:bg-muted/60 border border-border text-foreground font-semibold rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 transition-colors cursor-pointer appearance-none pl-8"
              >
                <option value="ALL">المجال والنشاط: كل المجالات</option>
                <option value="NETWORKS">شبكات وتكنولوجيا الحاسب</option>
                <option value="MEDICAL">توريدات طبية ومستشفيات</option>
                <option value="CONSTRUCTION">مقاولات وصيانة بنية</option>
                <option value="SUPPLIES">توريدات عامة ومستلزمات</option>
                <option value="AUCTION_SALES">مزادات بيع وتأجير عقارات</option>
              </select>
              <Layers className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>

            {/* Reset Filters Button (if active) */}
            {(searchQuery || selectedMethod !== "ALL" || selectedCategory !== "ALL" || importFilter !== "PENDING") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedMethod("ALL");
                  setSelectedCategory("ALL");
                  setImportFilter("PENDING");
                }}
                className="px-2.5 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors text-xs font-bold cursor-pointer flex items-center gap-1 border border-rose-500/20"
              >
                <X className="h-3.5 w-3.5" />
                <span>إعادة ضبط الفلاتر</span>
              </button>
            )}
          </div>

          {/* Left Side in RTL: Result Counter + View Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-medium">
              إجمالي النتائج: <strong className="text-foreground font-bold font-mono">{totalItems}</strong> مناقصة
            </span>

            {/* View Mode Toggle Switch */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                  viewMode === "table"
                    ? "bg-blue-600 text-white shadow-md scale-105"
                    : "text-slate-500 hover:text-foreground"
                }`}
                title="عرض الجداول المفصلة"
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                  viewMode === "grid"
                    ? "bg-blue-600 text-white shadow-md scale-105"
                    : "text-slate-500 hover:text-foreground"
                }`}
                title="عرض البطاقات المرئية"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. Tenders Grid: Clean Cards without Company Banner or Match Score        */}
      {/* ========================================================================= */}
      <div id="radar-tenders-grid"></div>
      {loading ? (
        <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-4 glass-card rounded-3xl border border-border">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping" />
            <div className="w-16 h-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          </div>
          <p className="text-sm font-bold text-foreground">جاري تحميل أحدث المناقصات الحكومية...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-16 text-center glass-card rounded-3xl border border-border space-y-4">
          <Radar className="h-14 w-14 text-blue-500/50 mx-auto animate-pulse" />
          <h3 className="text-lg font-bold text-foreground">رادار المناقصات الحكومية جاهز للفحص</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            قاعدة بيانات الرادار جاهزة حالياً. اضغط على زر &quot;تشغيل فحص الرادار الآن&quot; أعلاه للاتصال المباشر ببوابة التعاقدات الحكومية وسحب أحدث المناقصات المطروحة اليوم.
          </p>
          <Button
            onClick={handleScan}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl px-6 py-3 cursor-pointer shadow-md"
          >
            تشغيل فحص الرادار الآن
          </Button>
        </div>
      ) : viewMode === "table" ? (
        /* ========================================================================= */
        /* Table View: Responsive — Desktop Structured Table + Mobile Native Cards  */
        /* ========================================================================= */
        <div className="space-y-3 animate-fade-in">
          {/* Desktop & Tablet Table (Hidden on mobile < md) */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-border glass-card shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/70 text-slate-700 dark:text-slate-300 font-bold">
                    <th className="py-3.5 px-3 text-center whitespace-nowrap w-20">المرجع</th>
                    <th className="py-3.5 px-4 min-w-[280px]">المناقصة ونوع وطبيعة الطرح</th>
                    <th className="py-3.5 px-4 min-w-[180px]">الجهة الحكومية</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">التأمين الابتدائي</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">ثمن الكراسة</th>
                    <th className="py-3.5 px-4 text-center min-w-[140px]">آخر موعد للعطاءات</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">حالة السحب</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[230px]">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedItems.map((tender) => {
                    const daysRemaining = getDaysRemaining(tender.deadline);
                    const isViewed = viewedTenderIds.has(tender.id);

                    return (
                      <tr
                        key={tender.id}
                        className={`transition-colors hover:bg-muted/40 ${
                          tender.isImported
                            ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                            : isViewed
                            ? "bg-slate-500/5"
                            : ""
                        }`}
                      >
                        {/* Reference Number */}
                        <td className="py-3.5 px-3 font-mono font-bold text-foreground whitespace-nowrap text-center">
                          <span className="px-2 py-0.5 rounded-md bg-muted/60 border border-border inline-block">
                            {tender.referenceNumber ? `#${tender.referenceNumber}` : "-"}
                          </span>
                        </td>

                        {/* Title + Badges */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Tender Method Badge */}
                              {(() => {
                                const m = (tender.tenderType || tender.rawDetails?.tenderMethod || "").toLowerCase();
                                if (m.includes("مزايد") || m.includes("مزاد")) {
                                  return (
                                    <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30 text-[10px] font-bold flex items-center gap-1">
                                      <Gavel className="h-3 w-3" />
                                      <span>{tender.tenderType || "مزايدة علنية"}</span>
                                    </span>
                                  );
                                }
                                if (m.includes("ممارس")) {
                                  return (
                                    <span className="px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30 text-[10px] font-bold flex items-center gap-1">
                                      <ArrowRightLeft className="h-3 w-3" />
                                      <span>{tender.tenderType || "ممارسة عامة"}</span>
                                    </span>
                                  );
                                }
                                if (m.includes("مباشر") || m.includes("إسناد")) {
                                  return (
                                    <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                                      <Handshake className="h-3 w-3" />
                                      <span>{tender.tenderType || "إسناد مباشر"}</span>
                                    </span>
                                  );
                                }
                                return (
                                  <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/30 text-[10px] font-bold flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    <span>{tender.tenderType || "مناقصة عامة"}</span>
                                  </span>
                                );
                              })()}

                              {/* Kind pill */}
                              {tender.rawDetails?.tenderKind && (
                                <span className="px-1.5 py-0.5 rounded bg-muted text-foreground/80 text-[10px] font-semibold border border-border">
                                  {tender.rawDetails.tenderKind}
                                </span>
                              )}

                              {/* Viewed badge */}
                              {isViewed && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center gap-0.5 border border-slate-500/20">
                                  <Eye className="h-2.5 w-2.5" />
                                  <span>تمت المعاينة</span>
                                </span>
                              )}
                              {/* Recency Discovery Badge */}
                              {(() => {
                                const recency = getDetectionBadge(tender.createdAt, tender.publicationDate);
                                if (!recency) return null;
                                return (
                                  <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold flex items-center gap-1 ${recency.className}`}>
                                    <span>{recency.label}</span>
                                  </span>
                                );
                              })()}
                            </div>

                            <div className="font-bold text-foreground text-xs leading-snug line-clamp-2" title={tender.title}>
                              {tender.title}
                            </div>
                          </div>
                        </td>

                        {/* Authority */}
                        <td className="py-3.5 px-4 text-muted-foreground">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-foreground text-xs">{tender.authority || "جهة إدارية حكومية"}</div>
                            {tender.governorate && (
                              <div className="text-[11px] text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{tender.governorate}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Temporary Insurance */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          <span className="px-3.5 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-border font-black text-base sm:text-lg text-foreground inline-block shadow-xs">
                            {formatCurrency(tender.temporaryInsurance)}
                          </span>
                        </td>

                        {/* Booklet Price */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          <span className="px-3.5 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-border font-black text-base sm:text-lg text-foreground inline-block shadow-xs">
                            {formatCurrency(tender.bookletPrice)}
                          </span>
                        </td>

                        {/* Deadline */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          <div className="space-y-1 inline-flex flex-col items-center">
                            <div className="font-mono text-foreground font-semibold text-[11px]">
                              {formatArabicDate(tender.deadline)}
                            </div>
                            {daysRemaining !== null && (
                              <span
                                className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  daysRemaining < 0
                                    ? "bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/25"
                                    : daysRemaining <= 7
                                    ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/25"
                                    : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25"
                                }`}
                              >
                                {daysRemaining < 0 ? "منتهية" : `باقي ${daysRemaining} يوم`}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          <div className="flex justify-center">
                            {tender.isImported ? (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 w-fit">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>مسجلة بالمنظومة</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[11px] font-bold w-fit block">
                                متاحة للسحب
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            {tender.isImported && tender.operationId ? (
                              <Link href={`/dashboard/operations/${tender.operationId}`}>
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 rounded-lg flex items-center gap-1 cursor-pointer shadow-xs">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>فتح العملية</span>
                                </Button>
                              </Link>
                            ) : (
                              <Button
                                onClick={() => {
                                  markTenderAsViewed(tender.id);
                                  openConvertModal(tender);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 px-3 rounded-lg flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-all"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>سحب كعملية</span>
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              onClick={() => {
                                markTenderAsViewed(tender.id);
                                setActiveDetailsItem(tender);
                                setDetailsTab("basic");
                              }}
                              className="border-border text-foreground hover:bg-muted text-xs h-8 px-2.5 rounded-lg flex items-center gap-1 cursor-pointer font-bold active:scale-95 transition-all"
                            >
                              <Eye className="h-3.5 w-3.5 text-blue-500" />
                              <span>التفاصيل والكراسة</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteItem(tender.id, tender.title)}
                              className="border-rose-500/30 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-400 h-8 w-8 rounded-lg cursor-pointer transition-all active:scale-95"
                              title="حذف هذه المناقصة من الرادار"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Desktop Table Pagination Footer */}
            {renderPaginationToolbar()}
          </div>

          {/* Mobile Native Structured Rows (Shown strictly on mobile < md) — Zero Horizontal Scroll */}
          <div className="block md:hidden space-y-3">
            {paginatedItems.map((tender) => {
              const daysRemaining = getDaysRemaining(tender.deadline);
              const isViewed = viewedTenderIds.has(tender.id);

              return (
                <div
                  key={tender.id}
                  className={`rounded-2xl border p-4 space-y-3 shadow-xs transition-all ${
                    tender.isImported
                      ? "bg-emerald-500/[0.04] border-emerald-500/30"
                      : isViewed
                      ? "bg-slate-500/[0.03] border-border"
                      : "bg-card border-border hover:border-blue-500/40"
                  }`}
                >
                  {/* Row 1: Reference Badge + Method Badge + Kind + Status */}
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-bold text-foreground text-xs px-2 py-0.5 rounded-lg bg-muted border border-border">
                        {tender.referenceNumber ? `#${tender.referenceNumber}` : "-"}
                      </span>

                      {/* Method Badge */}
                      {(() => {
                        const m = (tender.tenderType || tender.rawDetails?.tenderMethod || "").toLowerCase();
                        if (m.includes("مزايد") || m.includes("مزاد")) {
                          return (
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30 text-[10px] font-bold flex items-center gap-1">
                              <Gavel className="h-3 w-3" />
                              <span>{tender.tenderType || "مزايدة علنية"}</span>
                            </span>
                          );
                        }
                        if (m.includes("ممارس")) {
                          return (
                            <span className="px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30 text-[10px] font-bold flex items-center gap-1">
                              <ArrowRightLeft className="h-3 w-3" />
                              <span>{tender.tenderType || "ممارسة عامة"}</span>
                            </span>
                          );
                        }
                        if (m.includes("مباشر") || m.includes("إسناد")) {
                          return (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                              <Handshake className="h-3 w-3" />
                              <span>{tender.tenderType || "إسناد مباشر"}</span>
                            </span>
                          );
                        }
                        return (
                          <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/30 text-[10px] font-bold flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span>{tender.tenderType || "مناقصة عامة"}</span>
                          </span>
                        );
                      })()}

                      {tender.rawDetails?.tenderKind && (
                        <span className="px-1.5 py-0.5 rounded bg-muted text-foreground/80 text-[10px] font-semibold border border-border">
                          {tender.rawDetails.tenderKind}
                        </span>
                      )}

                      {isViewed && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center gap-0.5 border border-slate-500/20">
                          <Eye className="h-2.5 w-2.5" />
                          <span>تمت المعاينة</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Recency Discovery Badge */}
                      {(() => {
                        const recency = getDetectionBadge(tender.createdAt, tender.publicationDate);
                        if (!recency) return null;
                        return (
                          <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold flex items-center gap-1 ${recency.className}`}>
                            <span>{recency.label}</span>
                          </span>
                        );
                      })()}

                      {/* Status Badge */}
                      {tender.isImported ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>مسجلة</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          متاحة للسحب
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Tender Title */}
                  <h4 className="font-bold text-foreground text-xs sm:text-sm leading-snug">
                    {tender.title}
                  </h4>

                  {/* Row 3: Authority & Governorate */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground gap-2 pt-1 border-t border-border/50">
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="font-semibold text-foreground truncate">{tender.authority || "جهة إدارية حكومية"}</span>
                    </div>
                    {tender.governorate && (
                      <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold shrink-0 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{tender.governorate}</span>
                      </span>
                    )}
                  </div>

                  {/* Row 4: Financial Metrics & Deadline (3 Compact Columns with Zero Scroll) */}
                  <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div className="bg-muted/50 p-2.5 rounded-xl border border-border">
                      <span className="text-[10px] text-muted-foreground block font-medium">التأمين الابتدائي</span>
                      <span className="font-black text-foreground text-sm sm:text-base block mt-0.5 truncate">
                        {formatCurrency(tender.temporaryInsurance)}
                      </span>
                    </div>

                    <div className="bg-muted/50 p-2.5 rounded-xl border border-border">
                      <span className="text-[10px] text-muted-foreground block font-medium">ثمن الكراسة</span>
                      <span className="font-black text-foreground text-sm sm:text-base block mt-0.5 truncate">
                        {formatCurrency(tender.bookletPrice)}
                      </span>
                    </div>

                    <div className="bg-muted/50 p-2 rounded-xl border border-border">
                      <span className="text-[10px] text-muted-foreground block font-medium">آخر موعد</span>
                      <div className="mt-0.5">
                        {daysRemaining !== null ? (
                          <span
                            className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              daysRemaining < 0
                                ? "bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/25"
                                : daysRemaining <= 7
                                ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/25"
                                : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25"
                            }`}
                          >
                            {daysRemaining < 0 ? "منتهية" : `باقي ${daysRemaining} يوم`}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-semibold">غير محدد</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 5: Action Buttons (Touch Friendly) */}
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2 pt-2 border-t border-border/60">
                    {tender.isImported && tender.operationId ? (
                      <Link href={`/dashboard/operations/${tender.operationId}`} className="w-full">
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>فتح العملية</span>
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        onClick={() => {
                          markTenderAsViewed(tender.id);
                          openConvertModal(tender);
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>سحب كعملية</span>
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => {
                        markTenderAsViewed(tender.id);
                        setActiveDetailsItem(tender);
                        setDetailsTab("basic");
                      }}
                      className="w-full border-border bg-muted/40 hover:bg-muted text-foreground text-xs h-9 rounded-xl flex items-center justify-center gap-1.5 font-bold cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 text-blue-500" />
                      <span>الكراسة</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDeleteItem(tender.id, tender.title)}
                      className="border-rose-500/30 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-400 h-9 w-9 rounded-xl cursor-pointer"
                      title="حذف المناقصة"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Mobile View Pagination Footer */}
            <div className="rounded-2xl border border-border overflow-hidden glass-card shadow-md">
              {renderPaginationToolbar()}
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* Cards View: Grid Cards Mode                                              */
        /* ========================================================================= */
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {paginatedItems.map((tender) => {
            const daysRemaining = getDaysRemaining(tender.deadline);
            const isViewed = viewedTenderIds.has(tender.id);

            return (
              <div
                key={tender.id}
                className={`relative overflow-hidden glass-card rounded-2xl p-5 border shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group space-y-4 ${
                  tender.isImported
                    ? "border-emerald-500/40 bg-emerald-500/[0.03]"
                    : isViewed
                    ? "border-border/70 bg-muted/[0.02]"
                    : "border-border hover:border-blue-500/50"
                }`}
              >
                {/* Card Glow Ambient */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/10 transition-all" />

                <div className="space-y-3 relative z-10">
                  {/* Top Bar: Method Badge + Kind Pill + Stages Count + Reference Number */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Method Badge with Theme Color */}
                      {(() => {
                        const m = (tender.tenderType || tender.rawDetails?.tenderMethod || "").toLowerCase();
                        if (m.includes("مزايد") || m.includes("مزاد")) {
                          return (
                            <span className="px-2.5 py-1 rounded-xl bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1">
                              <Gavel className="h-3.5 w-3.5" />
                              <span>{tender.tenderType || "مزايدة علنية"}</span>
                            </span>
                          );
                        }
                        if (m.includes("ممارس")) {
                          return (
                            <span className="px-2.5 py-1 rounded-xl bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center gap-1">
                              <ArrowRightLeft className="h-3.5 w-3.5" />
                              <span>{tender.tenderType || "ممارسة عامة"}</span>
                            </span>
                          );
                        }
                        if (m.includes("مباشر") || m.includes("إسناد")) {
                          return (
                            <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1">
                              <Handshake className="h-3.5 w-3.5" />
                              <span>{tender.tenderType || "إسناد مباشر"}</span>
                            </span>
                          );
                        }
                        return (
                          <span className="px-2.5 py-1 rounded-xl bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            <span>{tender.tenderType || "مناقصة عامة"}</span>
                          </span>
                        );
                      })()}

                      {/* Kind Pill (تأجير عقارات، بيع منقولات، خدمات، مقاولات...) */}
                      {tender.rawDetails?.tenderKind && (
                        <span className="px-2 py-0.5 rounded-lg bg-muted text-foreground/80 text-[11px] font-semibold border border-border">
                          {tender.rawDetails.tenderKind}
                        </span>
                      )}

                      {/* Viewed Badge */}
                      {isViewed && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-500/15 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center gap-1 border border-slate-500/20">
                          <Eye className="h-3 w-3" />
                          <span>تمت المعاينة</span>
                        </span>
                      )}

                      {/* Imported Badge */}
                      {tender.isImported && (
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>تم سحبها بالمنظومة</span>
                        </span>
                      )}

                      {/* Recency Discovery Badge */}
                      {(() => {
                        const recency = getDetectionBadge(tender.createdAt, tender.publicationDate);
                        if (!recency) return null;
                        return (
                          <span className={`px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1 ${recency.className}`}>
                            <span>{recency.label}</span>
                          </span>
                        );
                      })()}
                    </div>

                    {tender.referenceNumber && (
                      <span className="px-2.5 py-1 rounded-lg bg-muted/60 border border-border text-foreground font-mono text-[11px] font-bold">
                        مرجع: #{tender.referenceNumber}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-foreground text-sm sm:text-base leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {tender.title}
                  </h3>

                  {/* Authority + Governorate + Publication Date */}
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="font-semibold text-foreground">{tender.authority || "جهة إدارية حكومية"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {tender.publicationDate && (
                        <span className="text-[11px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md font-mono flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-blue-500" />
                          <span>طرح: {formatArabicDate(tender.publicationDate)}</span>
                        </span>
                      )}

                      {tender.governorate && (
                        <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{tender.governorate}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Financial & Deadline Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <span className="text-muted-foreground block text-[11px] font-medium">التأمين الابتدائي</span>
                      <span className="text-foreground font-black text-base sm:text-lg block mt-0.5">
                        {formatCurrency(tender.temporaryInsurance)}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <span className="text-muted-foreground block text-[11px] font-medium">ثمن كراسة الشروط</span>
                      <span className="text-foreground font-black text-base sm:text-lg block mt-0.5">
                        {formatCurrency(tender.bookletPrice)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border col-span-2 flex items-center justify-between">
                      <span className="text-muted-foreground text-[11px] flex items-center gap-1 font-medium">
                        <Timer className="h-3.5 w-3.5 text-amber-500" />
                        <span>آخر موعد لتلقي العطاءات:</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-bold font-mono text-xs">
                          {formatArabicDate(tender.deadline)}
                        </span>
                        {daysRemaining !== null && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              daysRemaining < 0
                                ? "bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/25"
                                : daysRemaining <= 7
                                ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/25"
                                : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25"
                            }`}
                          >
                            {daysRemaining < 0 ? "منتهية" : `باقي ${daysRemaining} يوم`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="pt-3 border-t border-border flex items-center justify-between gap-3 relative z-10">
                  {/* Right Button in RTL: Convert/Import (Primary Action) */}
                  {tender.isImported && tender.operationId ? (
                    <Link href={`/dashboard/operations/${tender.operationId}`}>
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95 transition-all">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>فتح العملية بالمنظومة</span>
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      onClick={() => {
                        markTenderAsViewed(tender.id);
                        openConvertModal(tender);
                      }}
                      className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-md shadow-blue-500/25 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer border border-blue-400/30"
                    >
                      <Plus className="h-4 w-4" />
                      <span>سحب وتسجيل كعملية</span>
                    </Button>
                  )}

                  <div className="flex items-center gap-1.5">
                    {/* Left Button in RTL: View Booklet & Details (Secondary Action) */}
                    <Button
                      variant="outline"
                      onClick={() => {
                        markTenderAsViewed(tender.id);
                        setActiveDetailsItem(tender);
                        setDetailsTab("basic");
                      }}
                      className="border-border bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-foreground text-xs h-10 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer font-bold shadow-2xs active:scale-95 transition-all"
                    >
                      <Eye className="h-4 w-4 text-blue-500" />
                      <span>كراسة الشروط</span>
                    </Button>

                    {/* Delete tender button */}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDeleteItem(tender.id, tender.title)}
                      className="border-rose-500/30 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-400 h-10 w-10 rounded-xl cursor-pointer transition-all active:scale-95 shrink-0"
                      title="حذف هذه المناقصة من الرادار"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cards View Pagination Footer */}
        <div className="rounded-2xl border border-border overflow-hidden glass-card shadow-md">
          {renderPaginationToolbar()}
        </div>
      </div>
    )}

      {/* ========================================================================= */}
      {/* HIGH-TECH RADAR SCANNING OVERLAY MODAL (High-Contrast in Light & Dark Mode) */}
      {/* ========================================================================= */}
      {isScanning && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div
              className={`rounded-3xl p-6 sm:p-7 border max-w-lg w-full shadow-2xl space-y-5 text-center animate-scale-up relative overflow-hidden bg-slate-950 text-white transition-colors duration-500 ${
                scanResult?.success && scanResult?.isNew
                  ? "border-emerald-400/60 shadow-[0_0_60px_rgba(16,185,129,0.35)]"
                  : scanResult?.success && !scanResult?.isNew
                  ? "border-teal-400/50 shadow-[0_0_60px_rgba(20,184,166,0.3)]"
                  : scanResult && !scanResult?.success
                  ? "border-rose-500/60 shadow-[0_0_60px_rgba(244,63,94,0.35)]"
                  : "border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.25)]"
              }`}
            >
              {/* Dismiss / Close Button */}
              <button
                type="button"
                onClick={closeScanOverlay}
                className="absolute top-4 left-4 z-20 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700/60"
                title="إغلاق نافذة الرادار"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Ambient Background Glow */}
              <div
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-colors duration-700 ${
                  scanResult?.success && scanResult?.isNew
                    ? "bg-emerald-500/20"
                    : scanResult?.success && !scanResult?.isNew
                    ? "bg-teal-500/20"
                    : scanResult && !scanResult?.success
                    ? "bg-rose-500/20"
                    : "bg-emerald-500/15"
                }`}
              />

              {/* Status Header Chip */}
              <div className="relative z-10 space-y-1.5 pt-2">
                <div
                  className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold font-mono border transition-all ${
                    scanResult?.success && scanResult?.isNew
                      ? "bg-emerald-950/90 border-emerald-400/50 text-emerald-300 shadow-sm"
                      : scanResult?.success && !scanResult?.isNew
                      ? "bg-teal-950/90 border-teal-400/50 text-teal-300 shadow-sm"
                      : scanResult && !scanResult?.success
                      ? "bg-rose-950/90 border-rose-500/50 text-rose-300 shadow-sm"
                      : "bg-emerald-950/90 border-emerald-500/40 text-emerald-300"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      scanResult?.success && scanResult?.isNew
                        ? "bg-emerald-400 animate-ping"
                        : scanResult?.success && !scanResult?.isNew
                        ? "bg-teal-400"
                        : scanResult && !scanResult?.success
                        ? "bg-rose-400 animate-ping"
                        : "bg-emerald-400 animate-ping"
                    }`}
                  />
                  <span>
                    {scanResult?.success && scanResult?.isNew
                      ? "🎯 صيد جديد • تم اكتشاف مناقصات اليوم"
                      : scanResult?.success && !scanResult?.isNew
                      ? "🛡️ درع الرادار النشط • كافة البيانات محدثة"
                      : scanResult && !scanResult?.success
                      ? "⚠️ تنبيه الشبكة • فشل الاتصال بالبوابة"
                      : "فحص مباشر ومؤمن لبوابة التعاقدات الحكومية"}
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-black text-white tracking-wide">
                  {scanResult?.success && scanResult?.isNew
                    ? `✓ تم رصد ${scanResult.total} مناقصة جديدة اليوم!`
                    : scanResult?.success && !scanResult?.isNew
                    ? "✓ اكتمل الفحص: الرادار محدث بالكامل ومحمي!"
                    : scanResult && !scanResult?.success
                    ? "تعذر إكمال الفحص المباشر للبوابة الحكومية"
                    : "جاري تشغيل رادار المناقصات الحكومية..."}
                </h3>
              </div>

              {/* Radar Scope Visual Chassis */}
              <div
                className={`relative mx-auto w-56 h-56 sm:w-64 sm:h-64 rounded-full border-2 bg-slate-900/95 flex items-center justify-center overflow-hidden transition-all duration-700 shadow-2xl ${
                  scanResult?.success && scanResult?.isNew
                    ? "border-emerald-400/60 shadow-[0_0_50px_rgba(16,185,129,0.4)]"
                    : scanResult?.success && !scanResult?.isNew
                    ? "border-teal-400/60 shadow-[0_0_50px_rgba(20,184,166,0.35)]"
                    : scanResult && !scanResult?.success
                    ? "border-rose-500/60 shadow-[0_0_50px_rgba(244,63,94,0.4)]"
                    : "border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.3)]"
                }`}
              >
                {/* Outer Rotating Degree Compass Ring */}
                <div className="absolute inset-1 rounded-full border border-dashed border-emerald-500/25 animate-ring-reverse pointer-events-none flex items-center justify-center">
                  <span className="absolute top-1 text-[8px] font-mono text-emerald-400/60 font-bold">000°</span>
                  <span className="absolute right-1 text-[8px] font-mono text-emerald-400/60 font-bold">090°</span>
                  <span className="absolute bottom-1 text-[8px] font-mono text-emerald-400/60 font-bold">180°</span>
                  <span className="absolute left-1 text-[8px] font-mono text-emerald-400/60 font-bold">270°</span>
                </div>

                {/* Concentric Range Rings */}
                <div className="absolute inset-8 rounded-full border border-emerald-500/20 pointer-events-none" />
                <div className="absolute inset-16 rounded-full border border-emerald-500/25 pointer-events-none" />
                <div className="absolute inset-24 rounded-full border border-emerald-500/30 pointer-events-none" />

                {/* Crosshairs with Measurement Lines */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className={`w-full h-px ${
                      scanResult && !scanResult.success ? "bg-rose-500/30" : "bg-emerald-500/25"
                    }`}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className={`h-full w-px ${
                      scanResult && !scanResult.success ? "bg-rose-500/30" : "bg-emerald-500/25"
                    }`}
                  />
                </div>

                {/* Sonar Expanding Waves (Active while scanning or up-to-date) */}
                {(!scanResult || (scanResult?.success && !scanResult?.isNew)) && (
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-400/80 animate-radar-pulse pointer-events-none" />
                )}

                {/* Rotating Sweep Beam (Active while scanning) */}
                {!scanResult && (
                  <div
                    className="absolute inset-0 rounded-full animate-radar-sweep pointer-events-none"
                    style={{
                      background:
                        "conic-gradient(from 0deg, transparent 0deg, transparent 280deg, rgba(16, 185, 129, 0.55) 360deg)",
                    }}
                  />
                )}

                {/* DYNAMIC SCENARIO VISUALS */}

                {/* SCENARIO 0: Active Scanning Blips */}
                {!scanResult && (
                  <>
                    <div className="absolute top-1/4 right-1/3 w-3 h-3 rounded-full bg-emerald-400 animate-radar-blip shadow-[0_0_10px_#10b981]" />
                    <div className="absolute bottom-1/3 left-1/4 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-radar-blip shadow-[0_0_10px_#06b6d4] [animation-delay:600ms]" />
                    <div className="absolute top-1/2 left-1/4 w-2.5 h-2.5 rounded-full bg-blue-400 animate-radar-blip shadow-[0_0_10px_#3b82f6] [animation-delay:1200ms]" />
                    {/* Center Core */}
                    <div className="relative z-10 w-4 h-4 rounded-full bg-emerald-400 shadow-[0_0_15px_#10b981] animate-pulse" />
                  </>
                )}

                {/* SCENARIO 1: New Tenders Discovered - Target Lock HUD */}
                {scanResult?.success && scanResult?.isNew && (
                  <>
                    {/* Target Lock 1 */}
                    <div className="absolute top-1/4 right-1/4 animate-target-lock z-10 flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-dashed animate-spin flex items-center justify-center [animation-duration:8s]">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 px-1 rounded mt-0.5 shadow">
                        TARGET #1
                      </span>
                    </div>

                    {/* Target Lock 2 */}
                    <div className="absolute bottom-1/4 left-1/4 animate-target-lock [animation-delay:150ms] z-10 flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-dashed animate-spin flex items-center justify-center [animation-duration:8s]">
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#06b6d4]" />
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-500/50 px-1 rounded mt-0.5 shadow">
                        TARGET #2
                      </span>
                    </div>

                    {/* Target Lock 3 if count >= 3 */}
                    {scanResult.total >= 3 && (
                      <div className="absolute top-1/3 left-1/5 animate-target-lock [animation-delay:300ms] z-10 flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full border-2 border-amber-400 border-dashed animate-spin flex items-center justify-center [animation-duration:8s]">
                          <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b]" />
                        </div>
                        <span className="text-[8px] font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-500/50 px-1 rounded mt-0.5 shadow">
                          TARGET #3
                        </span>
                      </div>
                    )}

                    {/* Center Radiant Celebration Burst */}
                    <div className="relative z-20 flex flex-col items-center justify-center animate-celebration-pop">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.8)] border-2 border-emerald-200">
                        <Target className="h-7 w-7 text-slate-950 animate-pulse" />
                      </div>
                      <span className="text-[10px] font-black font-mono tracking-wider text-emerald-300 bg-slate-950/90 border border-emerald-500/60 px-2 py-0.5 rounded-full mt-1.5 shadow">
                        +{scanResult.total} NEW
                      </span>
                    </div>
                  </>
                )}

                {/* SCENARIO 2: Up-to-Date (All Clear) - Harmonic Shield HUD */}
                {scanResult?.success && !scanResult?.isNew && (
                  <div className="relative z-20 flex flex-col items-center justify-center animate-shield-glow">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center shadow-[0_0_30px_rgba(20,184,166,0.8)] border-2 border-teal-200">
                      <ShieldCheck className="h-9 w-9 text-slate-950" />
                    </div>
                    <span className="text-[10px] font-black font-mono tracking-wider text-teal-300 bg-slate-950/90 border border-teal-500/60 px-2.5 py-0.5 rounded-full mt-2 shadow">
                      100% SECURE
                    </span>
                  </div>
                )}

                {/* SCENARIO 3: Error / Failed Connection */}
                {scanResult && !scanResult?.success && (
                  <div className="relative z-20 flex flex-col items-center justify-center animate-alert-glow">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.8)] border-2 border-rose-200">
                      <AlertTriangle className="h-8 w-8 text-white" />
                    </div>
                    <span className="text-[10px] font-black font-mono tracking-wider text-rose-300 bg-slate-950/90 border border-rose-500/60 px-2.5 py-0.5 rounded-full mt-2 shadow">
                      DISCONNECTED
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Telemetry Strip */}
              <div className="text-[10px] font-mono text-slate-400 flex items-center justify-center gap-3">
                <span>FREQ: 9.42 GHz</span>
                <span>•</span>
                <span>
                  {scanResult?.success && scanResult?.isNew
                    ? "TARGETS ACQUIRED"
                    : scanResult?.success && !scanResult?.isNew
                    ? "ALL CLEAR // NO GAPS"
                    : scanResult && !scanResult?.success
                    ? "LINK INTERRUPTED"
                    : "SCANNING RADIAL 360°"}
                </span>
                <span>•</span>
                <span>EGYPT_ETENDERS</span>
              </div>

              {/* BODY SECTION: Dynamic Outcome UI */}

              {/* WHILE SCANNING: Steps tracker & Progress Bar */}
              {!scanResult && (
                <div className="space-y-3 relative z-10">
                  <div className="space-y-2 text-right bg-slate-900/90 p-4 rounded-2xl border border-slate-800 text-xs shadow-inner">
                    {scanSteps.map((step, idx) => {
                      const isDone = scanStep > idx;
                      const isCurrent = scanStep === idx;

                      return (
                        <div
                          key={idx}
                          className={`flex items-start gap-2.5 transition-all ${
                            isDone
                              ? "text-emerald-400"
                              : isCurrent
                              ? "text-cyan-400 font-bold"
                              : "text-slate-400 opacity-60"
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isDone ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            ) : isCurrent ? (
                              <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px] text-slate-400">
                                {idx + 1}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <span className="font-bold block leading-tight text-slate-100">{step.label}</span>
                            <span className="text-[11px] text-slate-400 block mt-0.5">{step.detail}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/60">
                    <div
                      className="bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(95, (scanStep + 1) * 25)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* CASE A: New Tenders Discovered Card */}
              {scanResult?.success && scanResult?.isNew && (
                <div className="p-4 rounded-2xl bg-emerald-950/85 border border-emerald-400/50 text-emerald-100 text-xs space-y-3 shadow-lg">
                  <p className="font-bold text-sm text-white leading-relaxed">
                    {scanResult.message}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-300/90 text-right pt-1">
                    <div className="flex items-center gap-1.5 bg-emerald-900/40 p-2 rounded-xl border border-emerald-700/40">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>سحب كراسات الشروط والبنود</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-900/40 p-2 rounded-xl border border-emerald-700/40">
                      <Clock className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                      <span>تثبيت مواعيد فتح المظاريف</span>
                    </div>
                  </div>
                  <Button
                    onClick={closeScanOverlay}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs py-3 cursor-pointer shadow-lg shadow-emerald-900/40 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <span>عرض واستكشاف كافة المناقصات الجديدة ({scanResult.total})</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* CASE B: All Up to Date Card */}
              {scanResult?.success && !scanResult?.isNew && (
                <div className="p-4 rounded-2xl bg-teal-950/80 border border-teal-400/40 text-teal-100 text-xs space-y-3 shadow-lg">
                  <p className="font-bold text-xs sm:text-sm text-teal-200 leading-relaxed text-right">
                    {scanResult.message}
                  </p>
                  <p className="text-[11px] text-teal-300/80 text-right leading-relaxed">
                    تم التأكد من فحص آخر المناقصات المنشورة وتطابقها دون وجود أي فرص جديدة تفوتك. كافة العمليات المسجلة بالرادار ({scanResult.total}) جاهزة للمتابعة والسحب.
                  </p>
                  <Button
                    onClick={closeScanOverlay}
                    className="w-full bg-teal-600 hover:bg-teal-500 text-white font-black rounded-xl text-xs py-2.5 cursor-pointer shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <span>استعراض كافة المناقصات بالرادار ({scanResult.total})</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* CASE C: Error / Failed Connection Card */}
              {scanResult && !scanResult?.success && (
                <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-100 text-xs space-y-3 shadow-lg">
                  <p className="font-bold text-xs sm:text-sm text-rose-200 leading-relaxed text-right">
                    {scanResult.message}
                  </p>
                  <p className="text-[11px] text-rose-300/80 text-right leading-relaxed">
                    يرجى التحقق من اتصال الإنترنت واستقرار بوابة التعاقدات الحكومية وإعادة المحاولة.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      onClick={handleScan}
                      className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs py-2.5 cursor-pointer shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>إعادة المحاولة الآن</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={closeScanOverlay}
                      className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs py-2.5 cursor-pointer font-bold"
                    >
                      إغلاق
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TENDER FULL DETAILS & BOOKLET BREAKDOWN                           */}
      {/* ========================================================================= */}
      {activeDetailsItem && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="glass-panel rounded-3xl p-6 border border-border max-w-3xl w-full shadow-2xl space-y-4 animate-scale-up my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div className="space-y-1 pr-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="badge-blue text-xs font-bold">
                    رقم المرجع: {activeDetailsItem.referenceNumber || "غير محدد"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {activeDetailsItem.tenderType || "مناقصة عامة"}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                  {activeDetailsItem.title}
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-blue-500" />
                  <span>{activeDetailsItem.authority}</span>
                </p>
              </div>

              <button
                onClick={() => setActiveDetailsItem(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="flex items-center gap-2 border-b border-border pb-2 text-xs overflow-x-auto no-scrollbar">
              {[
                { id: "basic", label: "البيانات والشروط", icon: FileText },
                { id: "items", label: `البنود والكميات (${activeDetailsItem.rawDetails?.items?.length || 0})`, icon: Layers },
                { id: "timeline", label: "البرنامج الزمني", icon: Calendar },
                { id: "attachments", label: `المرفقات والكراسة (${activeDetailsItem.rawDetails?.attachments?.length || 0})`, icon: Download },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDetailsTab(t.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    detailsTab === t.id
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground bg-muted/30"
                  }`}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Tab 1: Basic Details */}
              {detailsTab === "basic" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <span className="text-muted-foreground block text-[11px]">طريقة الطرح</span>
                      <span className="font-bold text-foreground text-xs">
                        {activeDetailsItem.tenderType || activeDetailsItem.rawDetails?.tenderMethod || "مناقصة عامة"}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <span className="text-muted-foreground block text-[11px]">نوع وطبيعة العملية</span>
                      <span className="font-bold text-foreground text-xs">
                        {activeDetailsItem.rawDetails?.tenderKind || "خدمات"}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <span className="text-muted-foreground block text-[11px]">أسلوب ونوع الطرح</span>
                      <span className="font-bold text-foreground text-xs">
                        {activeDetailsItem.rawDetails?.biddingType || "إعلانات"}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <span className="text-muted-foreground block text-[11px]">قيمة التأمين الابتدائي</span>
                      <span className="font-black text-foreground text-base sm:text-lg block mt-0.5">
                        {formatCurrency(activeDetailsItem.temporaryInsurance)}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <span className="text-muted-foreground block text-[11px]">ثمن كراسة الشروط</span>
                      <span className="font-black text-foreground text-base sm:text-lg block mt-0.5">
                        {formatCurrency(activeDetailsItem.bookletPrice)}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <span className="text-muted-foreground block text-[11px]">نسبة التأمين النهائي</span>
                      <span className="font-black text-foreground font-mono text-sm">
                        {activeDetailsItem.rawDetails?.finalInsuranceRate || 5}%
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <span className="text-muted-foreground block text-[11px]">العام المالي</span>
                      <span className="font-black text-foreground font-mono text-sm">
                        {activeDetailsItem.rawDetails?.fiscalYear || "2026/2027"}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <span className="text-muted-foreground block text-[11px]">طبيعة الطرح</span>
                      <span className="font-bold text-foreground text-xs">
                        {activeDetailsItem.rawDetails?.tenderNature || "داخلية"}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <span className="text-muted-foreground block text-[11px]">مدة التوريد / التنفيذ</span>
                      <span className="font-bold text-foreground text-xs">
                        {activeDetailsItem.rawDetails?.deliveryDuration || "حسب كراسة الشروط"}
                      </span>
                    </div>
                  </div>

                  {activeDetailsItem.rawDetails?.activities && (
                    <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                      <span className="text-muted-foreground font-bold block">الأنشطة المطلوبة:</span>
                      <p className="text-foreground leading-relaxed">{activeDetailsItem.rawDetails.activities}</p>
                    </div>
                  )}

                  {activeDetailsItem.rawDetails?.conditions && (
                    <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                      <span className="text-muted-foreground font-bold block">الشروط والمواصفات:</span>
                      <p className="text-foreground leading-relaxed">{activeDetailsItem.rawDetails.conditions}</p>
                    </div>
                  )}

                  {activeDetailsItem.rawDetails?.notes && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 space-y-1">
                      <span className="font-bold block">ملاحظات واستفسارات الجهة الحكومية:</span>
                      <p className="leading-relaxed whitespace-pre-line">{activeDetailsItem.rawDetails.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Items & Specifications */}
              {detailsTab === "items" && (
                <div className="space-y-3">
                  {!activeDetailsItem.rawDetails?.items || activeDetailsItem.rawDetails.items.length === 0 ? (
                    <p className="text-center text-muted-foreground py-6">تفاصيل البنود والكميات متوفرة داخل كراسة الشروط المرفقة.</p>
                  ) : (
                    <div className="border border-border rounded-xl overflow-hidden">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-muted/60 text-muted-foreground font-bold border-b border-border">
                          <tr>
                            <th className="p-2.5 text-center w-12">م</th>
                            <th className="p-2.5">اسم البند / المواصفات</th>
                            <th className="p-2.5">النوع</th>
                            <th className="p-2.5 text-center">الكمية</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {activeDetailsItem.rawDetails.items.map((it, idx) => (
                            <tr key={idx} className="hover:bg-muted/30">
                              <td className="p-2.5 text-center font-mono">{it.serial}</td>
                              <td className="p-2.5 font-bold text-foreground">{it.name}</td>
                              <td className="p-2.5 text-muted-foreground">{it.type || "خدمات"}</td>
                              <td className="p-2.5 text-center font-mono font-bold">{it.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Timeline (Dynamic Stages per Tender Type) */}
              {detailsTab === "timeline" && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-bold text-foreground text-xs block">
                          البرنامج الزمني المعتمد لـ ({activeDetailsItem.tenderType || activeDetailsItem.rawDetails?.tenderMethod || "العملية"})
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {activeDetailsItem.rawDetails?.timeline?.stages?.length
                            ? `يتضمن ${activeDetailsItem.rawDetails.timeline.stages.length} مراحل زمنية رسمية مسجلة بالبوابة`
                            : "المواعيد الحساسة الرسمية المسجلة"}
                        </span>
                      </div>
                    </div>
                    {activeDetailsItem.rawDetails?.tenderNature && (
                      <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold text-[11px] shrink-0 self-start sm:self-auto">
                        طبيعة الطرح: {activeDetailsItem.rawDetails.tenderNature}
                      </span>
                    )}
                  </div>

                  {/* Render Dynamic Stages */}
                  {activeDetailsItem.rawDetails?.timeline?.stages && activeDetailsItem.rawDetails.timeline.stages.length > 0 ? (
                    <div className="space-y-2.5">
                      {activeDetailsItem.rawDetails.timeline.stages.map((stage, idx) => {
                        const isFirst = idx === 0;
                        const isLast = idx === activeDetailsItem.rawDetails!.timeline!.stages!.length - 1;
                        const isInquiries = stage.label.includes("استفسار") || stage.label.includes("إستفسار");
                        const isOpenings = stage.label.includes("فتح") || stage.label.includes("مظاريف");
                        const isAward = stage.label.includes("ترسية") || stage.label.includes("بت");
                        const isAuction = stage.label.includes("مزاد");

                        return (
                          <div
                            key={idx}
                            className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isFirst
                                ? "bg-blue-500/5 border-blue-500/30"
                                : isAward
                                ? "bg-emerald-500/5 border-emerald-500/30"
                                : isInquiries
                                ? "bg-amber-500/5 border-amber-500/30"
                                : "bg-muted/40 border-border"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 font-mono ${
                                  isFirst
                                    ? "bg-blue-600 text-white shadow-xs"
                                    : isAward
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : isInquiries
                                    ? "bg-amber-500 text-slate-950 shadow-xs"
                                    : "bg-muted text-foreground border border-border"
                                }`}
                              >
                                {idx + 1}
                              </div>
                              <div>
                                <span className="font-bold text-foreground text-xs block">
                                  {stage.label}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {isFirst
                                    ? "بداية الإعلان والدعوة لتقديم العطاءات"
                                    : isInquiries
                                    ? "فترة الاستفسارات والردود الفنية الرسمية"
                                    : isOpenings
                                    ? "جلسة فتح المظاريف الفنية / المالية"
                                    : isAward
                                    ? "جلسة البت والترسية النهائية"
                                    : isAuction
                                    ? "جلسة المزايدة العلنية"
                                    : "مرحلة رسمية محددة"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <span className="font-mono font-bold text-xs px-3 py-1.5 rounded-xl bg-background border border-border text-foreground shadow-2xs">
                                {stage.date}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {activeDetailsItem.rawDetails.timeline.stages.length <= 1 && (
                        <div className="p-3 rounded-xl bg-muted/30 border border-border text-[11px] text-muted-foreground flex items-center gap-2">
                          <Info className="h-4 w-4 text-blue-500 shrink-0" />
                          <span>
                            تم إدراج موعد الإعلان/الدعوة فقط لهذه العملية. باقي المواعيد والشروط التفصيلية محددة تفصيلاً بكراسة الشروط الرسمية (PDF المرفق).
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Fallback to legacy fields if stages array is absent, omitting undefined fields */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        { label: "تاريخ الإعلان / الدعوة", val: activeDetailsItem.rawDetails?.timeline?.announcementDate },
                        { label: "تاريخ جلسة الإستفسارات", val: activeDetailsItem.rawDetails?.timeline?.inquiriesSessionDate },
                        { label: "تاريخ الرد علي الإستفسارات", val: activeDetailsItem.rawDetails?.timeline?.inquiriesReplyDate },
                        { label: "تاريخ فتح المظاريف الفنية", val: activeDetailsItem.rawDetails?.timeline?.techEnvelopeOpenDate },
                        { label: "تاريخ البت الفني", val: activeDetailsItem.rawDetails?.timeline?.techDecisionDate },
                        { label: "تاريخ فتح المظاريف المالية", val: activeDetailsItem.rawDetails?.timeline?.finEnvelopeOpenDate },
                        { label: "تاريخ البت المالي", val: activeDetailsItem.rawDetails?.timeline?.finDecisionDate },
                        { label: "تاريخ الترسية", val: activeDetailsItem.rawDetails?.timeline?.awardDate },
                      ]
                        .filter((entry) => Boolean(entry.val))
                        .map((entry, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                            <span className="text-muted-foreground">{entry.label}</span>
                            <span className="font-bold text-foreground font-mono">{entry.val}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Attachments (With In-App PDF Preview & Direct Download) */}
              {detailsTab === "attachments" && (
                <div className="space-y-3">
                  {!activeDetailsItem.rawDetails?.attachments || activeDetailsItem.rawDetails.attachments.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground space-y-3 glass-card rounded-2xl border border-border">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                        <FileText className="h-6 w-6" />
                      </div>
                      <h4 className="text-sm font-bold text-foreground">
                        لم تقم الجهة الحكومية برفع ملف كراسة الشروط على البوابة لهذه العملية
                      </h4>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                        كافة بيانات المناقصة والبنود والكميات والبرنامج الزمني الرسمية مسحوبة ومتاحة في التبويبات المجاورة، أو يمكن مراجعة صفحة المناقصة مباشرة على بوابة التعاقدات الحكومية.
                      </p>
                      {activeDetailsItem.sourceUrl && (
                        <div className="pt-2">
                          <a
                            href={activeDetailsItem.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-bold text-xs"
                          >
                            <span>فتح صفحة المناقصة على بوابة التعاقدات الحكومية الرسمية</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeDetailsItem.rawDetails.attachments.map((att, idx) => {
                        const docId = extractDocId(att);
                        const isWord = att.name.toLowerCase().endsWith(".docx") || att.name.toLowerCase().endsWith(".doc");
                        const isZip = att.name.toLowerCase().endsWith(".zip") || att.name.toLowerCase().endsWith(".rar");

                        return (
                          <div
                            key={idx}
                            className="p-4 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isWord
                                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                                    : isZip
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                    : "bg-red-500/10 text-red-500 border border-red-500/20"
                                }`}
                              >
                                {isWord ? "Word" : isZip ? "ZIP" : "PDF"}
                              </div>
                              <div>
                                <span className="font-bold text-foreground text-sm block leading-snug">{att.name}</span>
                                <span className="text-[11px] text-muted-foreground">
                                  {isWord
                                    ? "مستند كراسة ومواصفات بصيغة Microsoft Word"
                                    : isZip
                                    ? "ملف مضغوط يحتوي على الكراسة والرسومات"
                                    : "كراسة شروط رسمية مسحوبة من البوابة الحكومية"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {/* 1. In-App Preview (Supports Word & PDF directly) */}
                              {isZip ? (
                                <Button
                                  onClick={() => handleDirectDownload(docId, activeDetailsItem, att.name)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  <span>تحميل الملف (ZIP)</span>
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handlePreviewDocument(docId, activeDetailsItem, att.name)}
                                  disabled={isLoadingDoc}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>معاينة الكراسة {isWord ? "(Word)" : "(PDF)"}</span>
                                </Button>
                              )}

                              {/* 2. Direct Download Button */}
                              {!isZip && (
                                <Button
                                  variant="outline"
                                  onClick={() => handleDirectDownload(docId, activeDetailsItem, att.name)}
                                  className="border-border bg-background hover:bg-muted text-foreground font-bold text-xs h-9 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                                >
                                  <Download className="h-3.5 w-3.5 text-blue-500" />
                                  <span>تحميل المرفق</span>
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-border flex items-center justify-between gap-3 flex-wrap">
              {activeDetailsItem.sourceUrl && (
                <a
                  href={activeDetailsItem.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-bold"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>فتح في بوابة التعاقدات المصرية</span>
                </a>
              )}

              <div className="flex items-center gap-2.5">
                <Button
                  variant="outline"
                  onClick={() => handleDeleteItem(activeDetailsItem.id, activeDetailsItem.title)}
                  className="border-rose-500/30 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-400 rounded-xl text-xs cursor-pointer font-bold flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>حذف من الرادار</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setActiveDetailsItem(null)}
                  className="border-border text-foreground rounded-xl text-xs cursor-pointer font-bold"
                >
                  إغلاق
                </Button>

                {!activeDetailsItem.isImported ? (
                  <Button
                    onClick={() => {
                      const item = activeDetailsItem;
                      setActiveDetailsItem(null);
                      openConvertModal(item);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
                  >
                    سحب وتسجيل كعملية الآن
                  </Button>
                ) : activeDetailsItem.operationId ? (
                  <Link href={`/dashboard/operations/${activeDetailsItem.operationId}`}>
                    <Button
                      onClick={() => setActiveDetailsItem(null)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>فتح تفاصيل العملية المسجلة</span>
                    </Button>
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        </Portal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CONVERT RADAR TENDER TO GOLDENERP OPERATION                       */}
      {/* ========================================================================= */}
      {convertModalItem && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel rounded-3xl p-6 border border-border max-w-lg w-full shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <FilePlus2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>سحب المناقصة وتسجيلها كعملية في GoldenERP</span>
              </h3>
              <button
                onClick={() => setConvertModalItem(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConvertToOperation} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-1.5 text-xs">
                <span className="text-muted-foreground block text-[11px]">اسم المناقصة المرصودة:</span>
                <p className="font-bold text-foreground leading-snug">{convertModalItem.title}</p>
                <div className="flex items-center justify-between text-muted-foreground text-[11px] pt-1 border-t border-border/50">
                  <span>الجهة: {convertModalItem.authority}</span>
                  <span className="font-bold font-mono text-foreground">
                    التأمين: {formatCurrency(convertModalItem.temporaryInsurance)}
                  </span>
                </div>
              </div>

              {/* Target Company Selection */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  تحديد الشركة التي ستسجل العملية باسمها في النظام:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_COMPANIES.map((comp) => {
                    const isSelected = targetCompanyCode === comp.code;

                    return (
                      <button
                        type="button"
                        key={comp.code}
                        onClick={() => setTargetCompanyCode(comp.code)}
                        className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                          isSelected
                            ? "bg-blue-600/15 border-blue-600 font-bold shadow-xs text-foreground"
                            : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{comp.shortName}</span>
                          <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                            {comp.code}
                          </span>
                        </div>
                        <span className="text-[10px] opacity-75 block mt-0.5">{comp.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Custom Notes */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  ملاحظات أو توجيهات إدارية أولية (اختياري)
                </label>
                <textarea
                  rows={2}
                  value={convertNotes}
                  onChange={(e) => setConvertNotes(e.target.value)}
                  placeholder="أدخل أي ملاحظات خاصة بالعملية أو فريق التقديم..."
                  className="w-full bg-muted/40 border border-border text-foreground rounded-xl p-2.5 text-xs focus:border-blue-500"
                />
              </div>

              {/* Confirmation Info Box */}
              <div className="p-3 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs space-y-1">
                <p className="font-bold">ما سيتم تنفيذه آلياً عند الضغط على تأكيد:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
                  <li>توليد كود رسمي للعملية تلقائياً للشركة المختارة (مثلاً A16 أو C13).</li>
                  <li>ربط الجهة، المحافظة، ورقم المرجع الخاص ببوابة التعاقدات.</li>
                  <li>تسجيل مواعيد المظاريف والبت في الجدول الزمني للعملية.</li>
                  <li>إنشاء قيد التأمين الابتدائي آلياً في سجل الضمانات المالية.</li>
                </ul>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConvertModalItem(null)}
                  className="border-border text-foreground rounded-xl text-xs cursor-pointer font-bold"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={isConverting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
                >
                  {isConverting ? "جاري الإنشاء والتسجيل..." : "تأكيد السحب وإنشاء العملية في النظام"}
                </Button>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: IN-APP BUILT-IN VIEWER MODAL (معاينة كراسة الشروط PDF و Word)     */}
      {/* ========================================================================= */}
      {previewPdfUrl && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-0 sm:p-2 md:p-4 animate-fade-in">
          <div
            className={`transition-all duration-200 bg-slate-950 border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden ${
              isFullscreenPdf
                ? "fixed inset-0 z-[110] w-screen h-screen rounded-none"
                : "w-full h-full sm:w-[98vw] sm:max-w-7xl sm:h-[95vh] rounded-none sm:rounded-3xl"
            }`}
          >
            {/* Responsive Viewer Header */}
            <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between gap-2 sm:gap-4 bg-slate-900/95 text-white flex-wrap sm:flex-nowrap">
              {/* File Information */}
              <div className="flex items-center gap-2.5 min-w-0 max-w-full sm:max-w-[55%]">
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                    previewDocType === "docx"
                      ? "bg-blue-500/20 text-blue-400 border-blue-500/30 font-black font-mono"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                  }`}
                >
                  {previewDocType === "docx" ? "DOCX" : "PDF"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-white text-xs sm:text-sm leading-tight truncate" title={previewDocTitle}>
                      {previewDocTitle}
                    </h3>
                    {previewTenderItem?.operationId && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                        مرتبطة بعملية 🗄️
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">
                    {previewTenderItem?.authority ? `الجهة: ${previewTenderItem.authority}` : "معاينة مباشرة لكراسة الشروط داخل منظومة GoldenERP"}
                  </span>
                </div>
              </div>

              {/* Actions Toolbar */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                {/* 1. Archive to Operation Hub */}
                <Button
                  size="sm"
                  onClick={handleArchiveDocument}
                  disabled={isArchivingDoc}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
                  title="حفظ وأرشفة كراسة الشروط تلقائياً داخل أرشيف العملية"
                >
                  <Archive className="h-3.5 w-3.5" />
                  <span>
                    {isArchivingDoc ? "جاري الأرشفة..." : "حفظ بالأرشيف"}
                  </span>
                </Button>

                {/* 2. Direct Device Download */}
                <Button
                  size="sm"
                  onClick={() => handleDirectDownload(previewDocId, previewTenderItem, previewDocTitle)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition-all"
                  title="تحميل كراسة الشروط مباشرة إلى جهازك"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>تحميل للجهاز</span>
                </Button>

                {/* 3. Delete Tender from Radar */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteItem(previewTenderItem?.id, previewDocTitle)}
                  className="border-rose-500/40 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-300 font-bold text-xs h-8 sm:h-9 px-2.5 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                  title="حذف هذه المناقصة الملتقطة نهائياً من الرادار"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">حذف المناقصة</span>
                </Button>

                {/* 4. Open in new tab (PDF only) */}
                {previewDocType === "pdf" && previewPdfUrl !== "docx_viewer_active" && (
                  <a
                    href={previewPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 sm:h-9 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-all"
                    title="فتح في علامة تبويب مستقلة"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">نافذة مستقلة</span>
                  </a>
                )}

                {/* 5. Fullscreen Toggle */}
                <button
                  type="button"
                  onClick={() => setIsFullscreenPdf(!isFullscreenPdf)}
                  className="p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer transition-all"
                  title={isFullscreenPdf ? "تصغير الحجم" : "ملء الشاشة بالكامل"}
                >
                  {isFullscreenPdf ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>

                {/* 6. Close */}
                <button
                  type="button"
                  onClick={closePdfViewer}
                  className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-rose-500/20 hover:text-rose-400 cursor-pointer transition-all"
                  title="إغلاق المعاينة"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Embedded Viewer Body: Dual Engine (Word Docx vs PDF) */}
            <div className="flex-1 w-full bg-slate-900 overflow-hidden relative">
              {previewDocType === "docx" ? (
                <DocxViewer
                  blob={previewDocBlob}
                  fileName={previewDocTitle}
                  onDownload={() => handleDirectDownload(previewDocId, previewTenderItem, previewDocTitle)}
                />
              ) : (
                <iframe
                  src={`${previewPdfUrl}#toolbar=1&navpanes=1&view=FitH`}
                  className="w-full h-full border-0"
                  title={previewDocTitle}
                />
              )}
            </div>

            {/* Mobile Fallback Strip (visible on mobile only) */}
            <div className="sm:hidden px-3 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>للتحكم الأفضل على شاشة هاتفك:</span>
              <button
                onClick={() => handleDirectDownload(previewDocId, previewTenderItem, previewDocTitle)}
                className="text-blue-400 font-bold underline cursor-pointer"
              >
                تنزيل كملف للجهاز
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CUSTOM CONFIRMATION MODAL (مسح كافة الملتقطات أو حذف مناقصة)      */}
      {/* ========================================================================= */}
      {confirmModal.isOpen && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-950 border border-rose-500/30 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 text-right relative overflow-hidden animate-scale-up">
              {/* Ambient Background Glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {confirmModal.type === "clear_all" ? "تأكيد مسح الملتقطات بالرادار" : "تأكيد حذف المناقصة"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {confirmModal.type === "clear_all"
                      ? "إجراء لتنظيف رادار المناقصات من الفرص غير المسحوبة"
                      : "حذف هذه المناقصة الملتقطة نهائياً من قائمة الرادار"}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-2 text-slate-300">
                {confirmModal.type === "clear_all" ? (
                  <>
                    <p className="leading-relaxed">
                      هل أنت متأكد من مسح وحذف كافة المناقصات الملتقطة بالرادار التي لم يتم سحبها كعمليات بعد؟
                    </p>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold text-[11px]">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>سيتم إخلاء {pendingCount} مناقصة ملتقطة غير مسحوبة فوراً.</span>
                    </div>
                    <p className="text-[11px] text-emerald-400 font-medium">
                      ✓ العمليات التي تم سحبها وتسجيلها مسبقاً في النظام لن تتأثر إطلاقاً.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="leading-relaxed">
                      هل أنت متأكد من حذف هذه المناقصة من الرادار نهائياً؟
                    </p>
                    <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 font-bold text-white text-xs leading-snug">
                      "{confirmModal.title}"
                    </div>
                    <p className="text-[11px] text-slate-400">
                      يمكن استعادة المناقصة لاحقاً عند تشغيل فحص الرادار إذا كانت ما زالت مطروحة بالبوابة.
                    </p>
                  </>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmModal({ isOpen: false, type: "clear_all", item: null, title: "" })}
                  disabled={isConfirmActionLoading}
                  className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء الأمر
                </Button>
                <Button
                  type="button"
                  onClick={handleExecuteConfirm}
                  disabled={isConfirmActionLoading}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
                >
                  {isConfirmActionLoading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>جاري التنفيذ...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{confirmModal.type === "clear_all" ? "تأكيد مسح الملتقطات" : "تأكيد الحذف"}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
