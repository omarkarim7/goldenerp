"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Truck, Plus, Search, Phone, Mail, Wallet, Building2,
  CheckCircle2, ChevronLeft, MapPin, X, Edit, Trash2,
  Eye, Download, Printer, Filter, Star, ShieldCheck, AlertCircle,
  FileSpreadsheet, Copy, ExternalLink, MessageSquare, LayoutGrid,
  Table as TableIcon, ArrowUpDown, RefreshCw, Briefcase, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";

export interface SupplierMetadata {
  category?: string;
  contactPerson?: string;
  commercialRegister?: string;
  taxCard?: string;
  paymentTerms?: string;
  rating?: number;
  status?: "ACTIVE" | "PENDING" | "SUSPENDED";
  governorate?: string;
  actualNotes?: string;
}

export interface SupplierRecord {
  id: string;
  name: string;
  phone: string | null;
  telegram?: string | null;
  email: string | null;
  address?: string | null;
  notes?: string | null;
  _count?: { purchases: number };
  createdAt?: string;
  // Parsed metadata:
  meta: SupplierMetadata;
}

const SUPPLY_CATEGORIES = [
  "أدوات كتابية ومكتبية",
  "أجهزة ومعدات إلكترونية وشبكات",
  "مستلزمات طبية ومعملية",
  "مقاولات وأعمال كهروميكانيكية",
  "أثاث وتجهيزات إدارية",
  "كابلات ومهمات كهربائية",
  "أنظمة أمن ومراقبة",
  "مواد كيميائية وخامات",
  "صيانة وتشغيل وخدمات لوجستية",
  "توريدات عامة متنوعة"
];

const EGYPT_GOVERNORATES = [
  "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "الشرقية", "القليوبية",
  "كفر الشيخ", "الغربية", "المنوفية", "البحيرة", "الإسماعيلية", "بورسعيد",
  "السويس", "شمال سيناء", "جنوب سيناء", "بني سويف", "المنيا", "أسيوط",
  "سوهاج", "قنا", "الأقصر", "أسوان", "البحر الأحمر", "الوادي الجديد",
  "مطروح", "الفيوم", "دمياط"
];

const PAYMENT_TERMS_OPTIONS = [
  "نقدي فوري عند الاستلام",
  "آجل 30 يوم من تاريخ الفاتورة",
  "آجل 60 يوم من تاريخ الفاتورة",
  "دفعة مقدمة 50% والباقي عند التوريد",
  "شيك مصرفي بعد الفحص والاستلام الفني",
  "تسهيلات ائتمانية مفتوحة"
];

// Helper to parse notes safely
function parseSupplierNotes(rawNotes?: string | null): SupplierMetadata {
  if (!rawNotes) {
    return {
      category: "توريدات عامة متنوعة",
      status: "ACTIVE",
      rating: 5,
      paymentTerms: "نقدي فوري عند الاستلام",
      actualNotes: ""
    };
  }

  try {
    if (rawNotes.startsWith("{") && rawNotes.endsWith("}")) {
      const parsed = JSON.parse(rawNotes);
      return {
        category: parsed.category || "توريدات عامة متنوعة",
        contactPerson: parsed.contactPerson || "",
        commercialRegister: parsed.commercialRegister || "",
        taxCard: parsed.taxCard || "",
        paymentTerms: parsed.paymentTerms || "نقدي فوري عند الاستلام",
        rating: typeof parsed.rating === "number" ? parsed.rating : 5,
        status: parsed.status || "ACTIVE",
        governorate: parsed.governorate || "القاهرة",
        actualNotes: parsed.actualNotes || ""
      };
    }
  } catch {
    // If not JSON, treat raw string as actualNotes
  }

  return {
    category: "توريدات عامة متنوعة",
    status: "ACTIVE",
    rating: 5,
    paymentTerms: "نقدي فوري عند الاستلام",
    actualNotes: rawNotes
  };
}

function serializeSupplierNotes(meta: SupplierMetadata): string {
  return JSON.stringify(meta);
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("GRID");

  // Modals state
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [activeSupplier, setActiveSupplier] = useState<SupplierRecord | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formTelegram, setFormTelegram] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCategory, setFormCategory] = useState(SUPPLY_CATEGORIES[0]);
  const [formContactPerson, setFormContactPerson] = useState("");
  const [formCommercialRegister, setFormCommercialRegister] = useState("");
  const [formTaxCard, setFormTaxCard] = useState("");
  const [formGovernorate, setFormGovernorate] = useState("القاهرة");
  const [formPaymentTerms, setFormPaymentTerms] = useState(PAYMENT_TERMS_OPTIONS[0]);
  const [formRating, setFormRating] = useState(5);
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "PENDING" | "SUSPENDED">("ACTIVE");
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch suppliers from backend
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/suppliers?search=${encodeURIComponent(search)}`);
      const mapped: SupplierRecord[] = (res.data || []).map((s: any) => ({
        ...s,
        meta: parseSupplierNotes(s.notes)
      }));
      setSuppliers(mapped);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
      toast.error("فشل تحميل قائمة الموردين");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  // Reset form
  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormTelegram("");
    setFormEmail("");
    setFormAddress("");
    setFormCategory(SUPPLY_CATEGORIES[0]);
    setFormContactPerson("");
    setFormCommercialRegister("");
    setFormTaxCard("");
    setFormGovernorate("القاهرة");
    setFormPaymentTerms(PAYMENT_TERMS_OPTIONS[0]);
    setFormRating(5);
    setFormStatus("ACTIVE");
    setFormNotes("");
    setActiveSupplier(null);
  };

  // Open Create
  const handleOpenCreate = () => {
    resetForm();
    setCreateModalOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (supplier: SupplierRecord) => {
    setActiveSupplier(supplier);
    setFormName(supplier.name);
    setFormPhone(supplier.phone || "");
    setFormTelegram(supplier.telegram || "");
    setFormEmail(supplier.email || "");
    setFormAddress(supplier.address || "");
    setFormCategory(supplier.meta.category || SUPPLY_CATEGORIES[0]);
    setFormContactPerson(supplier.meta.contactPerson || "");
    setFormCommercialRegister(supplier.meta.commercialRegister || "");
    setFormTaxCard(supplier.meta.taxCard || "");
    setFormGovernorate(supplier.meta.governorate || "القاهرة");
    setFormPaymentTerms(supplier.meta.paymentTerms || PAYMENT_TERMS_OPTIONS[0]);
    setFormRating(supplier.meta.rating || 5);
    setFormStatus(supplier.meta.status || "ACTIVE");
    setFormNotes(supplier.meta.actualNotes || "");
    setEditModalOpen(true);
  };

  // Open View Dossier
  const handleOpenView = (supplier: SupplierRecord) => {
    setActiveSupplier(supplier);
    setViewModalOpen(true);
  };

  // Open Delete
  const handleOpenDelete = (supplier: SupplierRecord) => {
    setActiveSupplier(supplier);
    setDeleteConfirmOpen(true);
  };

  // Submit Create
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("يرجى إدخال اسم المورد أو الشركة");
      return;
    }

    setSubmitting(true);
    try {
      const meta: SupplierMetadata = {
        category: formCategory,
        contactPerson: formContactPerson,
        commercialRegister: formCommercialRegister,
        taxCard: formTaxCard,
        paymentTerms: formPaymentTerms,
        rating: formRating,
        status: formStatus,
        governorate: formGovernorate,
        actualNotes: formNotes
      };

      await api.post("/suppliers", {
        name: formName.trim(),
        phone: formPhone.trim() || undefined,
        telegram: formTelegram.trim() || undefined,
        email: formEmail.trim() || undefined,
        address: formAddress.trim() || undefined,
        notes: serializeSupplierNotes(meta)
      });

      toast.success("تم تسجيل المورد الجديد بنجاح في قاعدة البيانات");
      setCreateModalOpen(false);
      resetForm();
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "حدث خطأ أثناء حفظ بيانات المورد");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit
  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupplier) return;
    if (!formName.trim()) {
      toast.error("اسم المورد مطلوب");
      return;
    }

    setSubmitting(true);
    try {
      const meta: SupplierMetadata = {
        category: formCategory,
        contactPerson: formContactPerson,
        commercialRegister: formCommercialRegister,
        taxCard: formTaxCard,
        paymentTerms: formPaymentTerms,
        rating: formRating,
        status: formStatus,
        governorate: formGovernorate,
        actualNotes: formNotes
      };

      await api.patch(`/suppliers/${activeSupplier.id}`, {
        name: formName.trim(),
        phone: formPhone.trim() || undefined,
        telegram: formTelegram.trim() || undefined,
        email: formEmail.trim() || undefined,
        address: formAddress.trim() || undefined,
        notes: serializeSupplierNotes(meta)
      });

      toast.success("تم تحديث بيانات المورد بنجاح");
      setEditModalOpen(false);
      resetForm();
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "حدث خطأ أثناء تعديل بيانات المورد");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Delete
  const handleDeleteSupplier = async () => {
    if (!activeSupplier) return;
    setSubmitting(true);
    try {
      await api.delete(`/suppliers/${activeSupplier.id}`);
      toast.success(`تم حذف المورد "${activeSupplier.name}" من قاعدة البيانات`);
      setDeleteConfirmOpen(false);
      setActiveSupplier(null);
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "تعذر حذف المورد — قد يكون مرتبطاً بأوامر شراء سابقة");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchCategory = selectedCategory === "ALL" || s.meta.category === selectedCategory;
      const matchStatus = selectedStatus === "ALL" || s.meta.status === selectedStatus;
      return matchCategory && matchStatus;
    });
  }, [suppliers, selectedCategory, selectedStatus]);

  // Statistics
  const totalCount = suppliers.length;
  const activeCount = suppliers.filter((s) => s.meta.status === "ACTIVE").length;
  const pendingCount = suppliers.filter((s) => s.meta.status === "PENDING").length;
  const suspendedCount = suppliers.filter((s) => s.meta.status === "SUSPENDED").length;

  // Export to CSV
  const handleExportCSV = () => {
    if (suppliers.length === 0) {
      toast.info("لا توجد بيانات لتصديرها");
      return;
    }

    const headers = [
      "اسم المورد",
      "مجال التوريد",
      "الشخص المسؤول",
      "رقم الهاتف",
      "واتساب/تليجرام",
      "البريد الإلكتروني",
      "المحافظة والعنوان",
      "السجل التجاري",
      "البطاقة الضريبية",
      "شروط الدفع",
      "التقييم",
      "الحالة",
      "الملاحظات"
    ];

    const rows = filteredSuppliers.map((s) => [
      `"${s.name.replace(/"/g, '""')}"`,
      `"${(s.meta.category || "").replace(/"/g, '""')}"`,
      `"${(s.meta.contactPerson || "").replace(/"/g, '""')}"`,
      `"${(s.phone || "").replace(/"/g, '""')}"`,
      `"${(s.telegram || "").replace(/"/g, '""')}"`,
      `"${(s.email || "").replace(/"/g, '""')}"`,
      `"${((s.meta.governorate ? s.meta.governorate + " - " : "") + (s.address || "")).replace(/"/g, '""')}"`,
      `"${(s.meta.commercialRegister || "").replace(/"/g, '""')}"`,
      `"${(s.meta.taxCard || "").replace(/"/g, '""')}"`,
      `"${(s.meta.paymentTerms || "").replace(/"/g, '""')}"`,
      s.meta.rating || 5,
      s.meta.status === "ACTIVE" ? "معتمد ونشط" : s.meta.status === "PENDING" ? "قيد المراجعة" : "موقوف",
      `"${(s.meta.actualNotes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `سجل_الموردين_المعتمدين_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير ملف سجل الموردين بنجاح (CSV)");
  };

  // Quick Copy
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`تم نسخ ${label}: ${text}`);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* ━━━ Header & Quick Controls ━━━ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shadow-xs">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                سجل وقاعدة بيانات الموردين
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                المرجع المركزي لتسجيل وإدارة بيانات الموردين، جهات الاتصال، والبيانات الضريبية والتجارية
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={fetchSuppliers}
            className="border-border text-foreground hover:bg-muted text-xs h-9 px-3 rounded-xl cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline mr-1.5">تحديث</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="border-border text-foreground hover:bg-muted text-xs h-9 px-3 rounded-xl cursor-pointer"
            title="تصدير السجل إلى Excel/CSV"
          >
            <Download className="h-3.5 w-3.5 ml-1.5 text-emerald-600 dark:text-emerald-400" />
            <span>تصدير السجل</span>
          </Button>

          <Button
            onClick={handleOpenCreate}
            className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 hover:from-blue-800 hover:to-blue-700 text-white font-bold px-4 h-9 rounded-xl shadow-lg shadow-blue-500/20 royal-glow flex items-center gap-2 text-xs sm:text-sm active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>تسجيل مورد جديد</span>
          </Button>
        </div>
      </div>

      {/* ━━━ Statistics KPI Cards ━━━ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-bold">إجمالي الموردين</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center text-xs font-bold">
              #
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground mt-2 font-mono">{totalCount}</p>
          <span className="text-[11px] text-muted-foreground mt-1 block">مورد في الدليل الموحد</span>
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-bold">الموردين المعتمدين</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            {activeCount}
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">نشط وجاهز لأوامر التوريد</span>
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-bold">قيد التدقيق والاعتماد</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-2 font-mono">
            {pendingCount}
          </p>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 block">بانتظار استيفاء المستندات</span>
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-bold">موقوف مؤقتاً</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <X className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-2 font-mono">
            {suspendedCount}
          </p>
          <span className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 block">مستبعد من عروض الأسعار</span>
        </div>
      </div>

      {/* ━━━ Search & Advanced Filter Toolbar ━━━ */}
      <div className="glass-card rounded-2xl p-4 border border-border space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث باسم المورد، الهاتف، المسؤول، السجل التجاري، أو البطاقة الضريبية..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-xs sm:text-sm h-10 w-full"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 px-3 bg-muted/40 border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-hidden focus:border-blue-500"
            >
              <option value="ALL">جميع مجالات التوريد ({SUPPLY_CATEGORIES.length})</option>
              {SUPPLY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-10 px-3 bg-muted/40 border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-hidden focus:border-blue-500"
            >
              <option value="ALL">كافة الحالات</option>
              <option value="ACTIVE">معتمد ونشط</option>
              <option value="PENDING">قيد المراجعة</option>
              <option value="SUSPENDED">موقوف</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("GRID")}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "GRID"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="عرض بطاقات شبكية"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("TABLE")}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "TABLE"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="عرض جدول تفصيلي"
              >
                <TableIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ━━━ Main Content: Grid vs Table ━━━ */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-5 border border-border animate-pulse h-48" />
          ))}
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-border space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-muted/50 border border-border text-muted-foreground mx-auto flex items-center justify-center">
            <Truck className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-foreground">لا توجد نتائج مطابقة في سجل الموردين</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              لم نتمكن من العثور على أي موردين مسجلين يطابقون معايير البحث والتصفية المحددة.
            </p>
          </div>
          <Button
            onClick={handleOpenCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 ml-1" />
            <span>تسجيل مورد الآن</span>
          </Button>
        </div>
      ) : viewMode === "GRID" ? (
        /* ━━━ Grid View ━━━ */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((s) => (
            <div
              key={s.id}
              className="glass-card-interactive rounded-2xl p-5 border border-border hover:border-blue-500/50 flex flex-col justify-between space-y-4 group transition-all"
            >
              <div className="space-y-3">
                {/* Header of Card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                        {s.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge
                          variant="outline"
                          className="border-border text-muted-foreground text-[10px] font-semibold px-1.5 py-0"
                        >
                          {s.meta.category || "عام"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <Badge
                    className={
                      s.meta.status === "ACTIVE"
                        ? "badge-emerald text-[10px]"
                        : s.meta.status === "PENDING"
                        ? "badge-amber text-[10px]"
                        : "badge-rose text-[10px]"
                    }
                  >
                    {s.meta.status === "ACTIVE"
                      ? "معتمد"
                      : s.meta.status === "PENDING"
                      ? "قيد المراجعة"
                      : "موقوف"}
                  </Badge>
                </div>

                {/* Rating & Contact Person */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Briefcase className="h-3 w-3 text-muted-foreground" />
                    {s.meta.contactPerson ? s.meta.contactPerson : "المسؤول غير محدد"}
                  </span>
                  <div className="flex items-center text-amber-500 gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3 w-3 ${
                          star <= (s.meta.rating || 5)
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Contact info list */}
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {s.phone && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <a
                          href={`tel:${s.phone}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400 font-mono"
                        >
                          {s.phone}
                        </a>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(s.phone!, "رقم الهاتف")}
                        className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                        title="نسخ الهاتف"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {s.email && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{s.email}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(s.email!, "البريد الإلكتروني")}
                        className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                        title="نسخ البريد"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {(s.meta.governorate || s.address) && (
                    <div className="flex items-center gap-1.5 text-[11px] truncate">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {s.meta.governorate ? s.meta.governorate + " — " : ""}
                        {s.address || "العنوان غير مسجل"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Tax & Commercial badges if available */}
                {(s.meta.commercialRegister || s.meta.taxCard) && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border/60 text-[10px] text-muted-foreground">
                    {s.meta.commercialRegister && (
                      <span className="bg-muted px-2 py-0.5 rounded-md font-mono">
                        س.ت: {s.meta.commercialRegister}
                      </span>
                    )}
                    {s.meta.taxCard && (
                      <span className="bg-muted px-2 py-0.5 rounded-md font-mono">
                        ب.ض: {s.meta.taxCard}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Card Controls */}
              <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleOpenView(s)}
                  className="h-8 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-lg cursor-pointer px-2"
                >
                  <Eye className="h-3.5 w-3.5 ml-1" />
                  <span>معاينة البطاقة</span>
                </Button>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenEdit(s)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg cursor-pointer"
                    title="تعديل بيانات المورد"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenDelete(s)}
                    className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                    title="حذف المورد"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ━━━ Data Table View ━━━ */
        <div className="glass-card rounded-2xl border border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold">
                <tr>
                  <th className="p-3.5">اسم المورد / الشركة</th>
                  <th className="p-3.5">التصنيف</th>
                  <th className="p-3.5">المسؤول</th>
                  <th className="p-3.5">الهاتف والتواصل</th>
                  <th className="p-3.5">المحافظة</th>
                  <th className="p-3.5">السجل والضرائب</th>
                  <th className="p-3.5">شروط الدفع</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3.5 font-bold text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {s.name.charAt(0)}
                        </div>
                        <span className="truncate max-w-[180px]">{s.name}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <Badge variant="outline" className="border-border text-foreground text-[10px]">
                        {s.meta.category || "عام"}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {s.meta.contactPerson || "—"}
                    </td>
                    <td className="p-3.5 font-mono text-[11px]">
                      {s.phone ? (
                        <a href={`tel:${s.phone}`} className="hover:underline text-foreground">
                          {s.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {s.meta.governorate || "—"}
                    </td>
                    <td className="p-3.5 font-mono text-[10px] text-muted-foreground">
                      {s.meta.commercialRegister || s.meta.taxCard ? (
                        <div>
                          {s.meta.commercialRegister && <div>س.ت: {s.meta.commercialRegister}</div>}
                          {s.meta.taxCard && <div>ب.ض: {s.meta.taxCard}</div>}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3.5 text-muted-foreground text-[11px] truncate max-w-[140px]">
                      {s.meta.paymentTerms || "نقدي"}
                    </td>
                    <td className="p-3.5">
                      <Badge
                        className={
                          s.meta.status === "ACTIVE"
                            ? "badge-emerald text-[10px]"
                            : s.meta.status === "PENDING"
                            ? "badge-amber text-[10px]"
                            : "badge-rose text-[10px]"
                        }
                      >
                        {s.meta.status === "ACTIVE"
                          ? "معتمد"
                          : s.meta.status === "PENDING"
                          ? "قيد المراجعة"
                          : "موقوف"}
                      </Badge>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenView(s)}
                          className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-500/10 rounded-md cursor-pointer"
                          title="معاينة"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(s)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md cursor-pointer"
                          title="تعديل"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDelete(s)}
                          className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-md cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: إضافة مورد جديد (Create Supplier)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {mounted && createModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="relative w-full max-w-2xl bg-card dark:bg-[#0c1427] rounded-3xl border border-border shadow-2xl flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden animate-scale-up my-auto">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border bg-card dark:bg-[#0c1427] shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">تسجيل مورد جديد في المنظومة</h3>
                  <p className="text-xs text-muted-foreground">إدخال البيانات الأساسية والمالية للمورد المعتمد</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-foreground mb-1">
                    اسم المورد أو الشركة الرسمية *
                  </label>
                  <Input
                    required
                    placeholder="مثال: شركة النيل الحديثة للتوريدات الكهربائية"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-9"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">مجال وتصنيف التوريد *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-9 px-3 bg-muted/40 border border-border rounded-xl text-foreground font-semibold focus:outline-hidden focus:border-blue-500"
                  >
                    {SUPPLY_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">المسؤول / مندوب المبيعات</label>
                  <Input
                    placeholder="اسم المهندس أو مسؤول الحسابات"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-9"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">رقم الهاتف الأساسي</label>
                  <Input
                    placeholder="010XXXXXXXX"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-9 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">رقم واتساب / تليجرام</label>
                  <Input
                    placeholder="011XXXXXXXX"
                    value={formTelegram}
                    onChange={(e) => setFormTelegram(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-9 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">البريد الإلكتروني</label>
                  <Input
                    type="email"
                    placeholder="sales@supplier.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-9"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">المحافظة</label>
                  <select
                    value={formGovernorate}
                    onChange={(e) => setFormGovernorate(e.target.value)}
                    className="w-full h-9 px-3 bg-muted/40 border border-border rounded-xl text-foreground font-semibold focus:outline-hidden focus:border-blue-500"
                  >
                    {EGYPT_GOVERNORATES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-foreground mb-1">العنوان والمقر الرئيسي</label>
                  <Input
                    placeholder="المنطقة الصناعية — المبنى الإداري"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-9"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">رقم السجل التجاري</label>
                  <Input
                    placeholder="123456"
                    value={formCommercialRegister}
                    onChange={(e) => setFormCommercialRegister(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-9 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">رقم البطاقة الضريبية</label>
                  <Input
                    placeholder="789-456-123"
                    value={formTaxCard}
                    onChange={(e) => setFormTaxCard(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-9 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">شروط الدفع والائتمان</label>
                  <select
                    value={formPaymentTerms}
                    onChange={(e) => setFormPaymentTerms(e.target.value)}
                    className="w-full h-9 px-3 bg-muted/40 border border-border rounded-xl text-foreground font-semibold focus:outline-hidden focus:border-blue-500"
                  >
                    {PAYMENT_TERMS_OPTIONS.map((term) => (
                      <option key={term} value={term}>
                        {term}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">حالة المورد في النظام</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full h-9 px-3 bg-muted/40 border border-border rounded-xl text-foreground font-semibold focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="ACTIVE">معتمد ونشط</option>
                    <option value="PENDING">قيد المراجعة والتدقيق</option>
                    <option value="SUSPENDED">موقوف مؤقتاً</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-foreground mb-1">ملاحظات إضافية وتوصيات التوريد</label>
                  <Input
                    placeholder="أي شروط خاصة أو أوقات الاستلام أو تفاصيل الحساب البنكي..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-9"
                  />
                </div>
              </div>
            </div>

              <div className="px-5 sm:px-6 py-3.5 border-t border-border bg-muted/40 flex items-center justify-end gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateModalOpen(false)}
                  className="border-border text-foreground hover:bg-muted rounded-xl text-xs h-9 cursor-pointer"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-5 cursor-pointer shadow-sm"
                >
                  {submitting ? "جاري الحفظ..." : "حفظ المورد في السجل"}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: تعديل بيانات المورد (Edit Supplier)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {mounted && editModalOpen && activeSupplier && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="relative w-full max-w-2xl bg-card dark:bg-[#0c1427] rounded-3xl border border-border shadow-2xl flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden animate-scale-up my-auto">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border bg-card dark:bg-[#0c1427] shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Edit className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">تعديل بيانات المورد</h3>
                  <p className="text-xs text-muted-foreground">تحديث بيانات السجل والاتصال والاشتراطات</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded-xl hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSupplier} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-foreground mb-1">اسم المورد أو الشركة *</label>
                  <Input
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-9"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">مجال وتصنيف التوريد *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-9 px-3 bg-muted/40 border border-border rounded-xl text-foreground font-semibold focus:outline-hidden focus:border-blue-500"
                  >
                    {SUPPLY_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">المسؤول / مندوب المبيعات</label>
                  <Input
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-9"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">رقم الهاتف الأساسي</label>
                  <Input
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-9 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">واتساب / تليجرام</label>
                  <Input
                    value={formTelegram}
                    onChange={(e) => setFormTelegram(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-9 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">البريد الإلكتروني</label>
                  <Input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-9"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">المحافظة</label>
                  <select
                    value={formGovernorate}
                    onChange={(e) => setFormGovernorate(e.target.value)}
                    className="w-full h-9 px-3 bg-muted/40 border border-border rounded-xl text-foreground font-semibold focus:outline-hidden focus:border-blue-500"
                  >
                    {EGYPT_GOVERNORATES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-foreground mb-1">العنوان والمقر</label>
                  <Input
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-9"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">رقم السجل التجاري</label>
                  <Input
                    value={formCommercialRegister}
                    onChange={(e) => setFormCommercialRegister(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-9 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">رقم البطاقة الضريبية</label>
                  <Input
                    value={formTaxCard}
                    onChange={(e) => setFormTaxCard(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-9 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">شروط الدفع والائتمان</label>
                  <select
                    value={formPaymentTerms}
                    onChange={(e) => setFormPaymentTerms(e.target.value)}
                    className="w-full h-9 px-3 bg-muted/40 border border-border rounded-xl text-foreground font-semibold focus:outline-hidden focus:border-blue-500"
                  >
                    {PAYMENT_TERMS_OPTIONS.map((term) => (
                      <option key={term} value={term}>
                        {term}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">حالة المورد</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full h-9 px-3 bg-muted/40 border border-border rounded-xl text-foreground font-semibold focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="ACTIVE">معتمد ونشط</option>
                    <option value="PENDING">قيد المراجعة</option>
                    <option value="SUSPENDED">موقوف مؤقتاً</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-foreground mb-1">ملاحظات إضافية</label>
                  <Input
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-9"
                  />
                </div>
              </div>
            </div>

              <div className="px-5 sm:px-6 py-3.5 border-t border-border bg-muted/40 flex items-center justify-end gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditModalOpen(false)}
                  className="border-border text-foreground hover:bg-muted rounded-xl text-xs h-9 cursor-pointer"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs h-9 px-5 cursor-pointer shadow-sm"
                >
                  {submitting ? "جاري التحديث..." : "تحديث بيانات المورد"}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: بطاقة المورد التفصيلية (View Supplier Dossier)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {mounted && viewModalOpen && activeSupplier && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="relative w-full max-w-lg bg-card dark:bg-[#0c1427] rounded-3xl border border-border shadow-2xl flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden animate-scale-up my-auto">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border bg-card dark:bg-[#0c1427] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold text-base shrink-0">
                  {activeSupplier.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">{activeSupplier.name}</h3>
                  <p className="text-xs text-muted-foreground">{activeSupplier.meta.category || "توريدات عامة"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded-xl hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-muted/40 p-3 rounded-2xl border border-border">
                <div>
                  <span className="text-muted-foreground block text-[11px]">حالة الاعتماد:</span>
                  <Badge
                    className={`mt-1 text-[11px] ${
                      activeSupplier.meta.status === "ACTIVE"
                        ? "badge-emerald"
                        : activeSupplier.meta.status === "PENDING"
                        ? "badge-amber"
                        : "badge-rose"
                    }`}
                  >
                    {activeSupplier.meta.status === "ACTIVE"
                      ? "معتمد ونشط"
                      : activeSupplier.meta.status === "PENDING"
                      ? "قيد المراجعة"
                      : "موقوف"}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">تقييم الأداء:</span>
                  <div className="flex items-center text-amber-500 gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3.5 w-3.5 ${
                          star <= (activeSupplier.meta.rating || 5)
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground">الشخص المسؤول:</span>
                  <span className="font-bold text-foreground">{activeSupplier.meta.contactPerson || "غير محدد"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground">الهاتف:</span>
                  <span className="font-mono font-bold text-foreground">{activeSupplier.phone || "—"}</span>
                </div>
                {activeSupplier.telegram && (
                  <div className="flex justify-between py-1.5 border-b border-border/60">
                    <span className="text-muted-foreground">واتساب / تليجرام:</span>
                    <span className="font-mono text-foreground">{activeSupplier.telegram}</span>
                  </div>
                )}
                {activeSupplier.email && (
                  <div className="flex justify-between py-1.5 border-b border-border/60">
                    <span className="text-muted-foreground">البريد الإلكتروني:</span>
                    <span className="font-mono text-foreground">{activeSupplier.email}</span>
                  </div>
                )}
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground">المحافظة والمقر:</span>
                  <span className="text-foreground">
                    {activeSupplier.meta.governorate ? activeSupplier.meta.governorate + " — " : ""}
                    {activeSupplier.address || "غير مسجل"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground">السجل التجاري:</span>
                  <span className="font-mono font-bold text-foreground">
                    {activeSupplier.meta.commercialRegister || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground">البطاقة الضريبية:</span>
                  <span className="font-mono font-bold text-foreground">{activeSupplier.meta.taxCard || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground">شروط الدفع المعتمدة:</span>
                  <span className="font-bold text-foreground">{activeSupplier.meta.paymentTerms || "نقدي"}</span>
                </div>
                {activeSupplier.meta.actualNotes && (
                  <div className="py-2 bg-muted/30 p-2.5 rounded-xl border border-border">
                    <span className="text-muted-foreground block text-[11px] font-bold mb-1">ملاحظات إضافية:</span>
                    <p className="text-foreground leading-relaxed">{activeSupplier.meta.actualNotes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 sm:px-6 py-3.5 border-t border-border bg-muted/40 flex items-center justify-between shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setViewModalOpen(false);
                  handleOpenEdit(activeSupplier);
                }}
                className="text-xs border-border cursor-pointer"
              >
                <Edit className="h-3.5 w-3.5 ml-1" />
                <span>تعديل البيانات</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setViewModalOpen(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 rounded-xl cursor-pointer"
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: تأكيد حذف المورد (Delete Confirmation)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {mounted && deleteConfirmOpen && activeSupplier && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="relative w-full max-w-md bg-card dark:bg-[#0c1427] rounded-3xl border border-border shadow-2xl p-6 space-y-4 animate-scale-up text-center my-auto">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-foreground">تأكيد حذف المورد نهائياً</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                هل أنت متأكد من رغبتك في حذف المورد{" "}
                <strong className="text-foreground">"{activeSupplier.name}"</strong> من قاعدة البيانات؟
              </p>
            </div>

            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 text-xs text-right">
              ⚠️ تنبيه: لا يمكن التراجع عن هذا الإجراء، وسيتم إزالة المورد من كافة سجلات البحث.
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
                className="border-border text-foreground hover:bg-muted rounded-xl text-xs h-9 px-4 cursor-pointer"
              >
                إلغاء
              </Button>
              <Button
                type="button"
                onClick={handleDeleteSupplier}
                disabled={submitting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs h-9 px-5 cursor-pointer shadow-sm"
              >
                {submitting ? "جاري الحذف..." : "نعم، تأكيد الحذف"}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
