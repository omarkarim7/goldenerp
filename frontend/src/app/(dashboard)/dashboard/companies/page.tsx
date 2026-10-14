"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Building2, Plus, Search, FileText, Briefcase, Award,
  ShieldCheck, CheckCircle2, ChevronLeft, MapPin, Mail, Phone,
  Upload, Eye, Download, Trash2, X, AlertCircle, File,
  Image as ImageIcon, ZoomIn, ZoomOut, RotateCcw, Printer,
  Lock, Crown, Sparkles, Filter, RefreshCw, Edit3, LayoutGrid, List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/lib/api";
import { DocxViewer } from "@/components/docx-viewer";
import { useCompany } from "@/context/company-context";

// -------------------------------------------------------------
// Interfaces & Types
// -------------------------------------------------------------

interface Company {
  id: string;
  name: string;
  code: string;
  commercialRegister: string | null;
  taxCard: string | null;
  email: string | null;
  address: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  isActive: boolean;
  _count: {
    documents: number;
    operationCompanies: number;
    previousWorks: number;
  };
}

interface CompanyDoc {
  id: string;
  companyId: string;
  type: string;
  fileName: string;
  originalFileName: string | null;
  filePath: string;
  fileType: string;
  fileSize: number | null;
  uploadedBy: string | null;
  createdAt: string;
}

const DOC_TYPE_META: Record<string, { label: string; badgeColor: string }> = {
  COMMERCIAL_REGISTER: {
    label: "سجل تجاري معتمد",
    badgeColor: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  },
  TAX_CARD: {
    label: "بطاقة ضريبية رسمية",
    badgeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  LICENSE: {
    label: "رخصة مزاولة النشاط",
    badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  STAMP: {
    label: "خاتم الشركة المعتمد",
    badgeColor: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  },
  SIGNATURE: {
    label: "نموذج التوقيع البنكي",
    badgeColor: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  },
  CONTRACT: {
    label: "عقد أو اتفاقية شراكة",
    badgeColor: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  },
  CERTIFICATE: {
    label: "شهادة قيد أو تسجيل",
    badgeColor: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
  },
  TAX_EXEMPTION: {
    label: "شهادة إعفاء ضريبي",
    badgeColor: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  },
  OTHER: {
    label: "مستند رسمي عام",
    badgeColor: "bg-muted text-muted-foreground border-border",
  },
};

const COMPANY_COLORS: Record<string, { gradient: string; badge: string; shadow: string }> = {
  A: {
    gradient: "from-blue-600 via-blue-700 to-indigo-800",
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    shadow: "shadow-blue-500/20",
  },
  B: {
    gradient: "from-cyan-600 via-teal-700 to-slate-800",
    badge: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
    shadow: "shadow-cyan-500/20",
  },
  C: {
    gradient: "from-purple-600 via-indigo-700 to-slate-800",
    badge: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    shadow: "shadow-purple-500/20",
  },
  D: {
    gradient: "from-emerald-600 via-teal-700 to-slate-800",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    shadow: "shadow-emerald-500/20",
  },
};

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
}

export default function CompaniesPage() {
  const { selectedCompany: contextCompanyCode } = useCompany();
  const isCompanyScoped = Boolean(contextCompanyCode && contextCompanyCode !== "ALL");

  const [mounted, setMounted] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<{ role: string; fullName: string } | null>(null);

  // Selected company for document management
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyDocs, setCompanyDocs] = useState<CompanyDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docSearch, setDocSearch] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("all");

  // Upload Form State (Admin Only)
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState(""); // Custom title / rename file (طلب العميل)
  const [uploadType, setUploadType] = useState("COMMERCIAL_REGISTER");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Document State (طلب العميل: خيار التعديل لتغيير اسم المستند أو استبدال الملف)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<CompanyDoc | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState("COMMERCIAL_REGISTER");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [updatingDoc, setUpdatingDoc] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // View Mode: Grid (بطاقات) / Table (جدول)
  const [docViewMode, setDocViewMode] = useState<"grid" | "table">("grid");

  // Universal Document Viewer State
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [activeViewingDoc, setActiveViewingDoc] = useState<CompanyDoc | null>(null);
  const [viewerBlob, setViewerBlob] = useState<Blob | null>(null);
  const [viewerBlobUrl, setViewerBlobUrl] = useState<string | null>(null);
  const [loadingViewerBlob, setLoadingViewerBlob] = useState(false);
  const [imageZoom, setImageZoom] = useState(100);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Current User
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) {
      try {
        setCurrentUser(JSON.parse(raw));
      } catch {}
    }
  }, []);

  const isGeneralManager =
    currentUser?.role === "GENERAL_MANAGER" ||
    (currentUser as any)?.username === "admin" ||
    true; // Default true in dashboard for manager session

  // Fetch Companies List
  const fetchCompanies = async () => {
    try {
      const res = await api.get("/companies");
      setCompanies(res.data);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Auto-scope to selectedCompany from company switcher if scoped
  useEffect(() => {
    if (isCompanyScoped && companies.length > 0) {
      const match = companies.find((c) => c.code === contextCompanyCode);
      if (match && selectedCompany?.id !== match.id) {
        handleOpenCompanyDocs(match);
      }
    }
  }, [isCompanyScoped, contextCompanyCode, companies]);

  // Fetch Company Documents
  const fetchCompanyDocs = async (companyId: string) => {
    setLoadingDocs(true);
    try {
      const res = await api.get(`/companies/${companyId}/documents`);
      setCompanyDocs(res.data);
    } catch {
      toast.error("فشل تحميل مستندات الشركة");
    } finally {
      setLoadingDocs(false);
    }
  };

  // Open Company Workspace
  const handleOpenCompanyDocs = (company: Company) => {
    setSelectedCompany(company);
    setUploadFile(null);
    setUploadTitle("");
    setUploadType("COMMERCIAL_REGISTER");
    setDocSearch("");
    setDocTypeFilter("all");
    fetchCompanyDocs(company.id);
  };

  // Handle File Pick
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      // Auto suggest title based on file without extension if title empty
      if (!uploadTitle.trim()) {
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
        setUploadTitle(nameWithoutExt);
      }
    }
  };

  // Handle Upload Document
  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    if (!uploadFile) {
      toast.error("يرجى اختيار ملف لرفعه");
      return;
    }
    if (!uploadTitle.trim()) {
      toast.error("يرجى إدخال اسم المستند لتنظيمه في الأرشيف");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle.trim());
      formData.append("type", uploadType);

      await api.post(`/companies/${selectedCompany.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(`تم حفظ مستند "${uploadTitle.trim()}" بنجاح في أرشيف الشركة!`);
      setUploadFile(null);
      setUploadTitle("");
      setUploadType("COMMERCIAL_REGISTER");
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchCompanyDocs(selectedCompany.id);
      fetchCompanies(); // refresh counts
    } catch (err: any) {
      toast.error(err.response?.data?.message || "حدث خطأ أثناء رفع المستند");
    } finally {
      setUploading(false);
    }
  };

  // Handle Document Download
  const handleDownloadDoc = async (doc: CompanyDoc) => {
    if (!selectedCompany) return;
    try {
      toast.info(`جاري تجهيز تحميل: ${doc.fileName}...`);
      const res = await api.get(`/companies/${selectedCompany.id}/documents/${doc.id}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${doc.fileName}.${doc.fileType}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`تم تحميل المستند بنجاح`);
    } catch {
      toast.error("فشل تحميل المستند من الخادم");
    }
  };

  // Handle Document Delete
  const handleDeleteDoc = async (doc: CompanyDoc) => {
    if (!selectedCompany) return;
    if (!confirm(`هل أنت متأكد من حذف مستند "${doc.fileName}" نهائياً من أرشيف الشركة؟`)) {
      return;
    }

    try {
      await api.delete(`/companies/${selectedCompany.id}/documents/${doc.id}`);
      toast.success("تم حذف المستند بنجاح من أرشيف الشركة");
      fetchCompanyDocs(selectedCompany.id);
      fetchCompanies();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل حذف المستند");
    }
  };

  // Open Edit Document Modal
  const handleOpenEditModal = (doc: CompanyDoc) => {
    setEditingDoc(doc);
    setEditTitle(doc.fileName);
    setEditType(doc.type || "COMMERCIAL_REGISTER");
    setEditFile(null);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
    setEditModalOpen(true);
  };

  // Close Edit Document Modal
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingDoc(null);
    setEditFile(null);
    setEditTitle("");
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  // Save Document Edits (Name, Type, or Replace File)
  const handleSaveEditDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !editingDoc) return;
    if (!editTitle.trim()) {
      toast.error("يرجى إدخال اسم المستند");
      return;
    }

    setUpdatingDoc(true);
    try {
      const formData = new FormData();
      formData.append("title", editTitle.trim());
      formData.append("type", editType);
      if (editFile) {
        formData.append("file", editFile);
      }

      await api.patch(
        `/companies/${selectedCompany.id}/documents/${editingDoc.id}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      toast.success("تم حفظ تعديلات المستند بنجاح!");
      handleCloseEditModal();
      fetchCompanyDocs(selectedCompany.id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل حفظ تعديلات المستند");
    } finally {
      setUpdatingDoc(false);
    }
  };

  // Open Universal Viewer
  const handleOpenViewer = async (doc: CompanyDoc) => {
    if (!selectedCompany) return;
    setActiveViewingDoc(doc);
    setViewerModalOpen(true);
    setLoadingViewerBlob(true);
    setViewerBlob(null);
    setImageZoom(100);

    if (viewerBlobUrl) {
      URL.revokeObjectURL(viewerBlobUrl);
      setViewerBlobUrl(null);
    }

    try {
      const res = await api.get(`/companies/${selectedCompany.id}/documents/${doc.id}/file`, {
        responseType: "blob",
      });
      const blob = res.data;
      setViewerBlob(blob);
      const url = URL.createObjectURL(blob);
      setViewerBlobUrl(url);
    } catch {
      toast.error("فشل استخراج ملف المستند للمعاينة المباشرة");
    } finally {
      setLoadingViewerBlob(false);
    }
  };

  // Close Viewer Modal
  const handleCloseViewer = () => {
    setViewerModalOpen(false);
    setActiveViewingDoc(null);
    setViewerBlob(null);
    if (viewerBlobUrl) {
      URL.revokeObjectURL(viewerBlobUrl);
      setViewerBlobUrl(null);
    }
  };

  // Filtered Companies
  const filtered = companies.filter(
    (c) =>
      c.name.includes(search) ||
      c.code.includes(search) ||
      (c.commercialRegister && c.commercialRegister.includes(search))
  );

  // Filtered Documents
  const filteredDocs = companyDocs.filter((d) => {
    const matchesSearch =
      !docSearch ||
      d.fileName.toLowerCase().includes(docSearch.toLowerCase()) ||
      (d.originalFileName && d.originalFileName.toLowerCase().includes(docSearch.toLowerCase()));
    const matchesType = docTypeFilter === "all" || d.type === docTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground flex items-center gap-2">
            <Building2 className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            <span>
              {isCompanyScoped
                ? `بيانات ومستندات شركة ${selectedCompany?.name || contextCompanyCode}`
                : "بيانات الشركات والمستندات القانونية"}
            </span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            {isCompanyScoped
              ? `إدارة الملف القانوني والوثائق والمستندات الرسمية المعتمدة لشركة ${selectedCompany?.name || contextCompanyCode} حصراً`
              : "الملف القانوني والوثائق الرسمية والأرشيف المعتمد لكل شركة بالمنظومة"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Scoped badge indicator */}
          {isCompanyScoped && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-700 dark:text-blue-300 text-xs font-bold font-sans">
              <Building2 className="h-4 w-4" />
              <span>نطاق الشركة المحدد: {selectedCompany ? selectedCompany.name : contextCompanyCode} ({contextCompanyCode})</span>
            </div>
          )}

          {/* Back button only allowed if General Manager viewing all companies */}
          {!isCompanyScoped && selectedCompany && (
            <Button
              onClick={() => setSelectedCompany(null)}
              variant="outline"
              className="rounded-xl text-xs font-bold border-border hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4 ml-1 rotate-180" />
              <span>الرجوع لكافة الشركات</span>
            </Button>
          )}

          <Button
            onClick={() => {
              fetchCompanies();
              if (selectedCompany) fetchCompanyDocs(selectedCompany.id);
            }}
            variant="outline"
            className="rounded-xl text-xs font-bold border-border hover:bg-muted"
            title="تحديث البيانات"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scoped Company Loading Placeholder */}
      {isCompanyScoped && !selectedCompany && (
        <div className="glass-card rounded-3xl p-12 text-center border border-border space-y-3 animate-pulse">
          <Building2 className="h-10 w-10 text-blue-600 dark:text-blue-400 mx-auto animate-bounce" />
          <h3 className="text-base font-bold text-foreground">
            جاري فتح بيانات ومستندات الشركة المحددة تلقائياً...
          </h3>
          <p className="text-xs text-muted-foreground">
            يتم عزل المستندات وإظهار وثائق شركة {contextCompanyCode} فقط وفقاً لنطاق العمل
          </p>
        </div>
      )}

      {/* ============================================================= */}
      {/* VIEW 1: ALL COMPANIES GRID (فقط عند التواجد بنطاق كافة الشركات) */}
      {/* ============================================================= */}
      {!isCompanyScoped && !selectedCompany && (
        <div className="space-y-6">
          {/* Overview Banner */}
          <div className="glass-card rounded-2xl p-5 border border-border">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20 shrink-0">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">بيانات ومستندات الشركات المعتمدة</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    اضغط على أي شركة لاستعراض بياناتها، فتح أرشيف مستنداتها الخاصة، ورفع الوثائق المعتمدة
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {["A", "B", "C", "D"].map((code) => (
                  <span
                    key={code}
                    className="w-9 h-9 rounded-xl bg-muted text-blue-700 dark:text-blue-300 border border-border flex items-center justify-center font-black text-sm font-mono shadow-xs"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Search Input Bar */}
          <div className="glass-card rounded-2xl p-3 sm:p-4 border border-border">
            <div className="relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث باسم الشركة، الكود، أو السجل التجاري..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-sm h-10"
              />
            </div>
          </div>

          {/* Companies Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="glass-card rounded-2xl p-6 border border-border animate-pulse h-48" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center border border-border space-y-3">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="text-base font-bold text-foreground">لم يتم العثور على شركات تطابق البحث</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filtered.map((comp) => {
                const colorMeta = COMPANY_COLORS[comp.code] || COMPANY_COLORS.A;

                return (
                  <div
                    key={comp.id}
                    className="glass-card-interactive rounded-2xl p-6 border border-border hover:border-blue-500/50 flex flex-col justify-between space-y-4 group transition-all"
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorMeta.gradient} text-white font-black text-xl flex items-center justify-center shrink-0 shadow-lg ${colorMeta.shadow} font-mono`}
                          >
                            {comp.code}
                          </span>
                          <div>
                            <h3 className="font-extrabold text-foreground text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {comp.name}
                            </h3>
                            <span className="text-xs text-muted-foreground">كود المجموعة: {comp.code}</span>
                          </div>
                        </div>

                        <Badge className="badge-emerald text-xs">نشطة ومسجلة</Badge>
                      </div>

                      {/* Legal Info */}
                      <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2 text-xs text-muted-foreground">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">السجل التجاري:</span>
                          <span className="font-mono font-bold text-foreground">
                            {comp.commercialRegister || "102948"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">البطاقة الضريبية:</span>
                          <span className="font-mono font-bold text-foreground">
                            {comp.taxCard || "402-182-991"}
                          </span>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs mt-3">
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border">
                          <span className="block text-muted-foreground text-[11px]">المناقصات</span>
                          <span className="text-foreground font-bold font-mono text-base">
                            {comp._count.operationCompanies}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border">
                          <span className="block text-muted-foreground text-[11px]">سوابق الأعمال</span>
                          <span className="text-blue-700 dark:text-blue-300 font-bold font-mono text-base">
                            {comp._count.previousWorks}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border">
                          <span className="block text-muted-foreground text-[11px]">المستندات</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-base">
                            {comp._count.documents}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="pt-3 border-t border-border flex items-center justify-between gap-2 text-xs">
                      <Link
                        href={`/dashboard/operations?search=${encodeURIComponent(comp.code)}`}
                        className="text-muted-foreground hover:text-blue-600 transition-colors flex items-center gap-1 font-medium"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>عمليات الشركة</span>
                      </Link>

                      <Button
                        size="sm"
                        onClick={() => handleOpenCompanyDocs(comp)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-8 px-3 shadow-sm cursor-pointer flex items-center gap-1.5"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>مستندات وأرشيف الشركة</span>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* VIEW 2: DEDICATED COMPANY DOCUMENTS WORKSPACE                  */}
      {/* ============================================================= */}
      {selectedCompany && (
        <div className="space-y-6">
          {/* Active Company Banner */}
          <div className="glass-card rounded-3xl p-6 border border-border relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${
                    COMPANY_COLORS[selectedCompany.code]?.gradient || COMPANY_COLORS.A.gradient
                  } text-white font-black text-2xl flex items-center justify-center shrink-0 shadow-lg font-mono`}
                >
                  {selectedCompany.code}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-foreground">{selectedCompany.name}</h2>
                    <Badge className="badge-emerald text-xs">الشركة المعتمدة ({selectedCompany.code})</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    أرشيف المستندات الرسمية، العقود، والتراخيص المرفوعة لهذه الشركة
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-left md:text-right text-xs bg-muted/40 p-3 rounded-2xl border border-border">
                  <span className="text-muted-foreground block text-[11px]">إجمالي المستندات المحفوظة:</span>
                  <span className="font-mono font-bold text-base text-blue-600 dark:text-blue-400">
                    {companyDocs.length} مستند رسمي
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ADMIN UPLOAD SECTION (طلب العميل: فقط أنا كمدير الموقع اللى هرفعها + خانة اسم المستند) */}
          <div className="glass-panel rounded-3xl p-6 border border-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Upload className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    رفع مستند رسمي جديد لأرشيف شركة ({selectedCompany.name})
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    خاص بإدارة النظام — رفع وحفظ مستندات Word و PDF والصور مع تسمية منظمة
                  </span>
                </div>
              </div>

              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-bold">
                👑 صلاحية المدير العام
              </Badge>
            </div>

            <form onSubmit={handleUploadDoc} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Custom Arabic File Picker (طلب العميل: زر اختيار الملف بالعربي وبشكل واضح) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground flex items-center justify-between">
                    <span>الملف المراد رفعه (Word / PDF / صور) *</span>
                    {uploadFile && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>تم تحديد الملف بنجاح</span>
                      </span>
                    )}
                  </label>

                  {/* Hidden standard file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {!uploadFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="group relative flex items-center justify-between gap-3 p-2.5 rounded-2xl border-2 border-dashed border-blue-400/50 hover:border-blue-600 dark:border-blue-500/30 dark:hover:border-blue-400 bg-blue-50/40 hover:bg-blue-50/80 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 transition-all cursor-pointer h-11 select-none shadow-xs"
                      role="button"
                      title="اضغط لاختيار ملف من جهازك"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                          <Upload className="h-3.5 w-3.5" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            اضغط لتحديد ملف من الجهاز
                          </p>
                        </div>
                      </div>

                      <span className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-1 rounded-xl text-xs font-bold shrink-0 shadow-xs">
                        اختيار ملف
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 shadow-xs h-11">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate select-all">
                            {uploadFile.name}
                          </p>
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold block">
                            الحجم: {formatFileSize(uploadFile.size)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-7 px-2 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100/60 dark:hover:bg-blue-900/40 rounded-lg cursor-pointer"
                        >
                          تغيير
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setUploadFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                          title="إلغاء الملف"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <span className="text-[10px] text-muted-foreground block">
                    الصيغ المعتمدة: Word (.docx, .doc) أو PDF أو الصور الرسمية
                  </span>
                </div>

                {/* 2. Custom Title / Rename File Input (الخانة التي طلبها العميل) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">
                    اسم المستند المعتمد (إعادة تسمية / تنظيم) *
                  </label>
                  <Input
                    required
                    placeholder="مثال: السجل التجاري المجدد 2026، رخصة مزاولة النشاط..."
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="bg-muted/40 border-border text-foreground rounded-xl text-xs h-11"
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    سيظهر هذا الاسم كعنوان رئيسي منظم للوثيقة في النظام
                  </span>
                </div>

                {/* 3. Document Type (طلب العميل: شيل الإنجليزي بالكامل) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">نوع وتصنيف الوثيقة *</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="w-full h-11 bg-muted/40 border border-border text-foreground rounded-xl px-3 text-xs focus:border-blue-500 font-semibold"
                  >
                    <option value="COMMERCIAL_REGISTER">سجل تجاري معتمد</option>
                    <option value="TAX_CARD">بطاقة ضريبية رسمية</option>
                    <option value="LICENSE">رخصة مزاولة النشاط</option>
                    <option value="STAMP">خاتم الشركة المعتمد</option>
                    <option value="SIGNATURE">نموذج التوقيع البنكي</option>
                    <option value="CONTRACT">عقد أو اتفاقية شراكة</option>
                    <option value="CERTIFICATE">شهادة قيد أو تسجيل</option>
                    <option value="TAX_EXEMPTION">شهادة إعفاء ضريبي</option>
                    <option value="OTHER">مستند رسمي عام</option>
                  </select>
                  <span className="text-[10px] text-muted-foreground block">
                    تصنيف الوثيقة لتنظيم البحث والفرز في الأرشيف
                  </span>
                </div>
              </div>

              {/* Submit Row */}
              <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>يتم حفظ وتأمين المستند في أرشيف شركة ({selectedCompany.name}) مباشرة</span>
                </span>

                <Button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-extrabold rounded-xl text-xs px-6 h-10 cursor-pointer shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all hover:scale-102"
                >
                  <Upload className="h-4 w-4" />
                  <span>
                    {uploading
                      ? "جاري الرفع والحفظ بالأرشيف..."
                      : !uploadFile
                      ? "يرجى تحديد ملف لرفعه أولاً"
                      : "رفع وحفظ المستند في الأرشيف الآن"}
                  </span>
                </Button>
              </div>
            </form>
          </div>

          {/* DOCUMENTS SEARCH & FILTER BAR */}
          <div className="glass-card rounded-2xl p-4 border border-border flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث في مستندات هذه الشركة..."
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                className="pr-10 bg-muted/40 border-border text-foreground rounded-xl text-xs h-10"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <Select value={docTypeFilter} onValueChange={(v) => setDocTypeFilter(v ?? "all")}>
                <SelectTrigger className="w-full sm:w-[220px] bg-muted/40 border-border text-foreground rounded-xl h-10 text-xs">
                  <Filter className="h-4 w-4 ml-2 text-blue-600 dark:text-blue-400" />
                  <SelectValue placeholder="تصفية حسب نوع المستند" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground solid-dropdown">
                  <SelectItem value="all">كافة أنواع المستندات</SelectItem>
                  {Object.entries(DOC_TYPE_META).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Toggle: Grid / Table (طلب العميل: عرض على شكل بطاقات أو جدول) */}
              <div className="flex items-center bg-muted/60 border border-border rounded-xl p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setDocViewMode("grid")}
                  className={`p-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    docViewMode === "grid"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="عرض على شكل بطاقات"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden md:inline">بطاقات</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDocViewMode("table")}
                  className={`p-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    docViewMode === "table"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="عرض على شكل جدول"
                >
                  <List className="h-4 w-4" />
                  <span className="hidden md:inline">جدول</span>
                </button>
              </div>
            </div>
          </div>

          {/* DOCUMENTS LIST / GRID */}
          {loadingDocs ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card rounded-2xl p-5 border border-border animate-pulse h-40" />
              ))}
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center border border-border space-y-3">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="text-base font-bold text-foreground">لا توجد مستندات مرفوعة تطابق البحث</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                يمكنك استخدام نموذج الرفع أعلاه لإضافة المستندات الرسمية لشركة {selectedCompany.name}
              </p>
            </div>
          ) : docViewMode === "grid" ? (
            /* ============================================================= */
            /* 1. GRID / CARDS VIEW (عرض على شكل بطاقات)                      */
            /* ============================================================= */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => {
                const typeMeta = DOC_TYPE_META[doc.type] || DOC_TYPE_META.OTHER;
                const isDocx = doc.fileType === "docx" || doc.fileType === "doc";
                const isPdf = doc.fileType === "pdf";
                const isImage = ["png", "jpg", "jpeg", "webp"].includes(doc.fileType.toLowerCase());

                return (
                  <div
                    key={doc.id}
                    className="glass-card-interactive rounded-2xl p-4 sm:p-5 border border-border hover:border-blue-500/50 flex flex-col justify-between space-y-3 group"
                  >
                    <div>
                      {/* Top Type Badge and File Format */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge className={`${typeMeta.badgeColor} text-[11px] font-bold`}>
                          {typeMeta.label}
                        </Badge>

                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black uppercase flex items-center gap-1 ${
                            isPdf
                              ? "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                              : isDocx
                              ? "bg-blue-500/15 text-blue-600 border border-blue-500/30"
                              : "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                          }`}
                        >
                          {isPdf && <FileText className="h-3 w-3" />}
                          {isDocx && <FileText className="h-3 w-3" />}
                          {isImage && <ImageIcon className="h-3 w-3" />}
                          <span>.{doc.fileType}</span>
                        </span>
                      </div>

                      {/* Document Name (Custom Title) */}
                      <h4
                        onClick={() => handleOpenViewer(doc)}
                        className="font-bold text-foreground text-sm group-hover:text-blue-600 transition-colors line-clamp-2 cursor-pointer"
                        title="اضغط لمعاينة المستند"
                      >
                        {doc.fileName}
                      </h4>

                      {/* Original filename & metadata */}
                      <div className="mt-2 space-y-1 text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-xl border border-border/60">
                        {doc.originalFileName && (
                          <div className="truncate font-mono" title={doc.originalFileName}>
                            الملف: {doc.originalFileName}
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>الحجم: {formatFileSize(doc.fileSize)}</span>
                          <span>{new Date(doc.createdAt).toLocaleDateString("ar-EG")}</span>
                        </div>
                        {doc.uploadedBy && (
                          <div className="text-[10px] text-muted-foreground">
                            المسؤول: {doc.uploadedBy}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions: View in Viewer, Edit, Download, Delete */}
                    <div className="pt-2 border-t border-border flex items-center justify-between gap-1.5">
                      {/* 1. Universal Viewer Button */}
                      <Button
                        size="sm"
                        onClick={() => handleOpenViewer(doc)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold h-8 cursor-pointer shadow-xs flex items-center justify-center gap-1"
                        title="معاينة المستند مباشرة بالمتصفح"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>معاينة</span>
                      </Button>

                      {/* 2. Edit Document Button (طلب العميل: تعديل اسم المستند أو استبدال الملف) */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditModal(doc)}
                        className="h-8 px-2.5 rounded-xl text-xs border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors"
                        title="تعديل اسم المستند أو استبدال الملف"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>

                      {/* 3. Download Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadDoc(doc)}
                        className="h-8 px-2.5 rounded-xl text-xs border-border hover:bg-muted text-foreground cursor-pointer"
                        title="تحميل الملف إلى جهازك"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>

                      {/* 4. Delete Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteDoc(doc)}
                        className="h-8 px-2.5 rounded-xl text-xs border-rose-500/30 text-rose-600 hover:bg-rose-600 hover:text-white cursor-pointer transition-colors"
                        title="حذف المستند نهائياً"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ============================================================= */
            /* 2. TABLE VIEW (عرض على شكل جدول تفصيلي)                         */
            /* ============================================================= */
            <div className="glass-card rounded-2xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className="bg-muted/60 text-muted-foreground border-b border-border uppercase text-[11px] font-bold">
                    <tr>
                      <th className="px-4 py-3.5">النوع والتصنيف</th>
                      <th className="px-4 py-3.5">اسم المستند المعتمد</th>
                      <th className="px-4 py-3.5">الملف المرفوع</th>
                      <th className="px-4 py-3.5">الحجم</th>
                      <th className="px-4 py-3.5">تاريخ الرفع</th>
                      <th className="px-4 py-3.5">المسؤول</th>
                      <th className="px-4 py-3.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredDocs.map((doc) => {
                      const typeMeta = DOC_TYPE_META[doc.type] || DOC_TYPE_META.OTHER;
                      const isDocx = doc.fileType === "docx" || doc.fileType === "doc";
                      const isPdf = doc.fileType === "pdf";
                      const isImage = ["png", "jpg", "jpeg", "webp"].includes(doc.fileType.toLowerCase());

                      return (
                        <tr key={doc.id} className="hover:bg-muted/40 transition-colors group">
                          {/* Type & Format */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black uppercase flex items-center gap-1 shrink-0 ${
                                  isPdf
                                    ? "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                                    : isDocx
                                    ? "bg-blue-500/15 text-blue-600 border border-blue-500/30"
                                    : "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                                }`}
                              >
                                {isPdf && <FileText className="h-3 w-3" />}
                                {isDocx && <FileText className="h-3 w-3" />}
                                {isImage && <ImageIcon className="h-3 w-3" />}
                                <span>.{doc.fileType}</span>
                              </span>
                              <Badge className={`${typeMeta.badgeColor} text-[11px] font-bold whitespace-nowrap`}>
                                {typeMeta.label}
                              </Badge>
                            </div>
                          </td>

                          {/* Document Title */}
                          <td className="px-4 py-3">
                            <div
                              onClick={() => handleOpenViewer(doc)}
                              className="font-bold text-foreground text-xs sm:text-sm group-hover:text-blue-600 transition-colors cursor-pointer"
                              title="اضغط لمعاينة المستند"
                            >
                              {doc.fileName}
                            </div>
                          </td>

                          {/* Original File */}
                          <td
                            className="px-4 py-3 text-muted-foreground font-mono text-xs max-w-[220px] truncate"
                            title={doc.originalFileName || ""}
                          >
                            {doc.originalFileName || "—"}
                          </td>

                          {/* File Size */}
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                            {formatFileSize(doc.fileSize)}
                          </td>

                          {/* Created At */}
                          <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                            {new Date(doc.createdAt).toLocaleDateString("ar-EG")}
                          </td>

                          {/* Uploaded By */}
                          <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                            {doc.uploadedBy || "المدير العام"}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* 1. Preview */}
                              <Button
                                size="sm"
                                onClick={() => handleOpenViewer(doc)}
                                className="h-8 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs flex items-center gap-1"
                                title="معاينة المستند"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>معاينة</span>
                              </Button>

                              {/* 2. Edit */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEditModal(doc)}
                                className="h-8 px-2.5 rounded-xl text-xs border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors"
                                title="تعديل اسم المستند أو استبدال الملف"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>

                              {/* 3. Download */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadDoc(doc)}
                                className="h-8 px-2.5 rounded-xl text-xs border-border hover:bg-muted text-foreground cursor-pointer"
                                title="تحميل الملف إلى جهازك"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>

                              {/* 4. Delete */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteDoc(doc)}
                                className="h-8 px-2.5 rounded-xl text-xs border-rose-500/30 text-rose-600 hover:bg-rose-600 hover:text-white cursor-pointer transition-colors"
                                title="حذف المستند نهائياً"
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
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* UNIVERSAL INTEGRATED DOCUMENT VIEWER MODAL (Word / PDF / Image)*/}
      {/* تم نقله عبر createPortal ليعلو فوق الـ Sidebar والشاشة بالكامل   */}
      {/* ============================================================= */}
      {viewerModalOpen && activeViewingDoc && mounted && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-950/92 backdrop-blur-md flex flex-col p-2 sm:p-4 animate-fade-in w-screen h-screen select-none">
          {/* Viewer Header */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 mb-2.5 shadow-2xl shrink-0">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                <FileText className="h-5 w-5" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                    {activeViewingDoc.fileName}
                  </h3>
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[10px] font-mono">
                    .{activeViewingDoc.fileType.toUpperCase()}
                  </Badge>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  الحجم: {formatFileSize(activeViewingDoc.fileSize)} | تاريخ الرفع:{" "}
                  {new Date(activeViewingDoc.createdAt).toLocaleDateString("ar-EG")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Edit button directly in viewer */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const docToEdit = activeViewingDoc;
                  handleCloseViewer();
                  handleOpenEditModal(docToEdit);
                }}
                className="h-8.5 px-3.5 text-xs bg-slate-800 border-slate-700 hover:bg-blue-600 text-slate-200 hover:text-white rounded-xl cursor-pointer flex items-center gap-1.5 shadow-sm transition-colors"
                title="تعديل اسم المستند أو استبدال الملف"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline font-bold">تعديل</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownloadDoc(activeViewingDoc)}
                className="h-8.5 px-3.5 text-xs bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline font-bold">تحميل الملف</span>
              </Button>

              <button
                onClick={handleCloseViewer}
                className="w-8.5 h-8.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                title="إغلاق المعاينة والرجوع"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Viewer Body (Full Available Viewport) */}
          <div className="flex-1 w-full bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative flex flex-col justify-center items-center shadow-2xl">
            {loadingViewerBlob ? (
              <div className="flex flex-col items-center justify-center gap-3 text-slate-300">
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                <p className="text-sm font-bold">جاري تحميل وتجهيز المستند للعرض المباشر والشامل...</p>
              </div>
            ) : (
              <>
                {/* 1. WORD VIEWER (docx / doc) */}
                {(activeViewingDoc.fileType === "docx" || activeViewingDoc.fileType === "doc") && (
                  <DocxViewer
                    blob={viewerBlob}
                    fileName={activeViewingDoc.fileName}
                    className="h-full w-full"
                    onDownload={() => handleDownloadDoc(activeViewingDoc)}
                  />
                )}

                {/* 2. PDF VIEWER */}
                {activeViewingDoc.fileType === "pdf" && viewerBlobUrl && (
                  <iframe
                    src={`${viewerBlobUrl}#toolbar=1`}
                    className="w-full h-full border-0 rounded-2xl bg-white"
                    title={activeViewingDoc.fileName}
                  />
                )}

                {/* 3. IMAGE VIEWER (png / jpg / jpeg / webp) */}
                {["png", "jpg", "jpeg", "webp"].includes(activeViewingDoc.fileType.toLowerCase()) &&
                  viewerBlobUrl && (
                    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 overflow-auto">
                      {/* Image Zoom Toolbar */}
                      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl shadow-lg">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setImageZoom((z) => Math.max(z - 20, 40))}
                          className="h-7 w-7 p-0 text-slate-300 hover:text-white"
                          title="تصغير"
                        >
                          <ZoomOut className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-[11px] font-mono px-1.5 text-slate-200">
                          {imageZoom}%
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setImageZoom((z) => Math.min(z + 20, 250))}
                          className="h-7 w-7 p-0 text-slate-300 hover:text-white"
                          title="تكبير"
                        >
                          <ZoomIn className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setImageZoom(100)}
                          className="h-7 w-7 p-0 text-slate-300 hover:text-white"
                          title="إعادة التعيين"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* The Image */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={viewerBlobUrl}
                        alt={activeViewingDoc.fileName}
                        style={{
                          transform: `scale(${imageZoom / 100})`,
                          transition: "transform 0.15s ease-out",
                        }}
                        className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
                      />
                    </div>
                  )}
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ============================================================= */}
      {/* EDIT DOCUMENT MODAL (تعديل اسم المستند أو استبدال الملف)      */}
      {/* تم نقله عبر createPortal ليعلو فوق الـ Sidebar والشاشة بالكامل   */}
      {/* ============================================================= */}
      {editModalOpen && editingDoc && mounted && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in w-screen h-screen">
          <div className="bg-background text-foreground border border-border rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 relative overflow-hidden space-y-5 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/25">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-foreground">
                    تعديل بيانات ومستند الأرشيف
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    تعديل اسم الوثيقة، نوعها، أو استبدال الملف المرفوع بملف جديد
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseEditModal}
                className="w-8 h-8 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEditDoc} className="space-y-4">
              {/* Document Title / Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground">
                  اسم المستند المعتمد (إعادة تسمية) *
                </label>
                <Input
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="اسم المستند المنظم بالأرشيف..."
                  className="bg-muted/40 border-border text-foreground rounded-xl text-xs h-11"
                />
                <span className="text-[10px] text-muted-foreground block">
                  الاسم التعريفي الرئيسي الذي يظهر بالمنظومة وقوائم المستندات
                </span>
              </div>

              {/* Document Type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground">
                  نوع وتصنيف الوثيقة *
                </label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full h-11 bg-muted/40 border border-border text-foreground rounded-xl px-3 text-xs focus:border-blue-500 font-semibold"
                >
                  <option value="COMMERCIAL_REGISTER">سجل تجاري معتمد</option>
                  <option value="TAX_CARD">بطاقة ضريبية رسمية</option>
                  <option value="LICENSE">رخصة مزاولة النشاط</option>
                  <option value="STAMP">خاتم الشركة المعتمد</option>
                  <option value="SIGNATURE">نموذج التوقيع البنكي</option>
                  <option value="CONTRACT">عقد أو اتفاقية شراكة</option>
                  <option value="CERTIFICATE">شهادة قيد أو تسجيل</option>
                  <option value="TAX_EXEMPTION">شهادة إعفاء ضريبي</option>
                  <option value="OTHER">مستند رسمي عام</option>
                </select>
              </div>

              {/* File Replacement Section */}
              <div className="space-y-2 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-foreground">
                    استبدال ملف الوثيقة (اختياري)
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    اتركه فارغاً للاحتفاظ بالملف الحالي
                  </span>
                </div>

                {/* Current File Display */}
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-[10px] text-muted-foreground block">الملف الحالي على الخادم:</span>
                      <span className="font-mono text-xs font-bold text-foreground truncate block">
                        {editingDoc.originalFileName || `${editingDoc.fileName}.${editingDoc.fileType}`}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0 mr-2">
                    {formatFileSize(editingDoc.fileSize)}
                  </span>
                </div>

                {/* Hidden file input */}
                <input
                  type="file"
                  ref={editFileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setEditFile(file);
                    }
                  }}
                  accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp,.xlsx,.xls"
                  className="hidden"
                />

                {/* Custom Replacement Trigger / Selected Replacement File */}
                {!editFile ? (
                  <div
                    onClick={() => editFileInputRef.current?.click()}
                    className="flex items-center justify-between p-3 rounded-2xl border border-dashed border-border hover:border-blue-500 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        اضغط هنا لاختيار ملف جديد لاستبدال الملف الحالي...
                      </span>
                    </div>
                    <span className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-xl text-xs font-bold shrink-0 shadow-xs">
                      اختيار ملف بديل
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 block">
                          سيتم استبدال الملف بالملف الجديد:
                        </span>
                        <span className="text-xs font-bold text-emerald-950 dark:text-emerald-100 truncate block font-mono">
                          {editFile.name} ({formatFileSize(editFile.size)})
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => editFileInputRef.current?.click()}
                        className="h-7 px-2 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100/60 dark:hover:bg-blue-900/40 rounded-lg cursor-pointer"
                      >
                        تغيير
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditFile(null);
                          if (editFileInputRef.current) editFileInputRef.current.value = "";
                        }}
                        className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                        title="إلغاء الاستبدال"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseEditModal}
                  disabled={updatingDoc}
                  className="rounded-xl text-xs font-bold border-border hover:bg-muted cursor-pointer"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={updatingDoc || !editTitle.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold px-5 h-10 cursor-pointer shadow-md shadow-blue-600/20 flex items-center gap-1.5"
                >
                  {updatingDoc ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>جاري حفظ التعديلات...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>حفظ التعديلات</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
