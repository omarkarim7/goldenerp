"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  ClipboardCheck, Plus, Search, MapPin, Calendar, User,
  CheckCircle2, Clock, AlertTriangle, Building2, ChevronLeft,
  X, Edit, Trash2, Eye, Printer, Download, Check, DollarSign,
  FileText, Shield, Sparkles, Navigation, Layers, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";

export interface SiteVisitRecord {
  id: string;
  title: string;
  authority: string;
  location: string;
  employeeName: string;
  employeeId?: string;
  operationCode: string;
  visitDate: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  purpose?: string;
  findings?: string;
  expenses: number;
  isPaid: boolean;
  notes?: string;
  reportNumber?: string;
}

const INITIAL_VISITS: SiteVisitRecord[] = [
  {
    id: "v1",
    title: "معاينة موقع تنفيذ شبكة الألياف الضوئية وغرف التحكم",
    authority: "هيئة المجتمعات العمرانية الجديدة",
    location: "العاصمة الإدارية الجديدة — الحي الحكومي مبنى B4",
    employeeName: "م. أحمد الشريف",
    operationCode: "A15",
    visitDate: "2026-10-03",
    status: "SCHEDULED",
    purpose: "فحص مسارات الكابلات الأرضية ومطابقتها مع المخططات وكراسة الشروط",
    findings: "الموقع جاهز لمد المسارات، يلزم التنسيق مع مقاول الأعمال المدنية.",
    expenses: 450,
    isPaid: true,
    reportNumber: "VIS-2026-081",
    notes: "تم استلام تصاريح الدخول الأمنية للموقع",
  },
  {
    id: "v2",
    title: "حضور جلسة الاستفسارات والمظاريف الفنية التمهيدية",
    authority: "وزارة الاتصالات وتكنولوجيا المعلومات",
    location: "القرية الذكية — مبنى الوزارة الرئيسي B12",
    employeeName: "أ. محمود عبد الرحمن",
    operationCode: "B08",
    visitDate: "2026-10-02",
    status: "IN_PROGRESS",
    purpose: "تسليم خطاب الاستفسارات الرسمي وحضور جلسة الإيضاحات طبقاً للمادة 20",
    findings: "أفادت اللجنة بأنه سيتم نشر ملحق تعديل بنود المواصفات غداً.",
    expenses: 250,
    isPaid: false,
    reportNumber: "VIS-2026-080",
    notes: "بانتظار رد الجهة الإدارية المكتوب",
  },
  {
    id: "v3",
    title: "فحص واختبار عينات الكابلات والمحولات بمستودعات الهيئة",
    authority: "الهيئة العامة للأبنية التعليمية",
    location: "مخازن الهيئة المركزية — مدينة نصر",
    employeeName: "م. كريم صلاح",
    operationCode: "C04",
    visitDate: "2026-09-29",
    status: "COMPLETED",
    purpose: "سحب عينات الفحص المعملي ومطابقة شهادات الاختبار والمواصفات الفنية",
    findings: "تم اجتياز اختبارات العزل والجهد بنجاح واعتماد محضر الفحص الفني.",
    expenses: 600,
    isPaid: true,
    reportNumber: "VIS-2026-079",
    notes: "تم توقيع محضر الفحص الفني بحضور أعضاء لجنة البت الفني",
  },
  {
    id: "v4",
    title: "معاينة مباني المدارس ومسارات شبكات الإطفاء والإنذار",
    authority: "مديرية التربية والتعليم بالجيزة",
    location: "إدارة 6 أكتوبر التعليمية — مجمع المدارس التجريبية",
    employeeName: "م. حسام الدين نبيل",
    operationCode: "A12",
    visitDate: "2026-09-22",
    status: "COMPLETED",
    purpose: "رفع المقاسات الواقعية لمواقع لوحات الإنذار وخطوط الإطفاء",
    findings: "وجود اختلاف طفيف بالمقاسات وتم تدوين التعديل لتقديمه بالعرض الفني.",
    expenses: 350,
    isPaid: true,
    reportNumber: "VIS-2026-078",
    notes: "معاينة نافية للجهالة طبقاً لكراسة الشروط",
  },
];

export default function VisitsPage() {
  const [visits, setVisits] = useState<SiteVisitRecord[]>(INITIAL_VISITS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Modals state
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [dossierModalOpen, setDossierModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [activeVisit, setActiveVisit] = useState<SiteVisitRecord | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formAuthority, setFormAuthority] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formEmployee, setFormEmployee] = useState("");
  const [formOpCode, setFormOpCode] = useState("A15");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formStatus, setFormStatus] = useState<"SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED">("SCHEDULED");
  const [formPurpose, setFormPurpose] = useState("");
  const [formFindings, setFormFindings] = useState("");
  const [formExpenses, setFormExpenses] = useState("0");
  const [formIsPaid, setFormIsPaid] = useState(false);
  const [formNotes, setFormNotes] = useState("");
  const [formReportNumber, setFormReportNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch from backend (fallback to initial if empty)
  const fetchVisits = async () => {
    try {
      setLoading(true);
      const res = await api.get("/employees/visits");
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: SiteVisitRecord[] = res.data.map((v: any) => ({
          id: v.id,
          title: v.purpose || "معاينة وزيارة موقع",
          authority: v.notes?.includes("authority:") ? v.notes.split("authority:")[1]?.split(";")[0] : "الجهة الحكومية",
          location: v.location || "الموقع الميداني",
          employeeName: v.employee?.name || "الموظف المسؤول",
          employeeId: v.employeeId,
          operationCode: v.operationId || "A15",
          visitDate: v.visitDate ? v.visitDate.split("T")[0] : new Date().toISOString().split("T")[0],
          status: "COMPLETED",
          purpose: v.purpose || "",
          findings: "",
          expenses: Number(v.expenses) || 0,
          isPaid: v.isPaid || false,
          notes: v.notes || "",
          reportNumber: `VIS-${v.id.substring(0, 6)}`,
        }));
        setVisits(mapped);
      }
    } catch {
      // Keep state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormTitle("");
    setFormAuthority("");
    setFormLocation("");
    setFormEmployee("");
    setFormOpCode("A15");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormStatus("SCHEDULED");
    setFormPurpose("");
    setFormFindings("");
    setFormExpenses("0");
    setFormIsPaid(false);
    setFormNotes("");
    setFormReportNumber("VIS-" + new Date().getFullYear() + "-" + Math.floor(100 + Math.random() * 900));
    setActiveVisit(null);
  };

  // Open Create
  const handleOpenCreate = () => {
    resetForm();
    setCreateModalOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (v: SiteVisitRecord) => {
    setActiveVisit(v);
    setFormTitle(v.title);
    setFormAuthority(v.authority);
    setFormLocation(v.location);
    setFormEmployee(v.employeeName);
    setFormOpCode(v.operationCode);
    setFormDate(v.visitDate);
    setFormStatus(v.status);
    setFormPurpose(v.purpose || "");
    setFormFindings(v.findings || "");
    setFormExpenses(String(v.expenses || 0));
    setFormIsPaid(v.isPaid);
    setFormNotes(v.notes || "");
    setFormReportNumber(v.reportNumber || "");
    setEditModalOpen(true);
  };

  // Open Dossier / Printable Minutes
  const handleOpenDossier = (v: SiteVisitRecord) => {
    setActiveVisit(v);
    setDossierModalOpen(true);
  };

  // Open Delete
  const handleOpenDelete = (v: SiteVisitRecord) => {
    setActiveVisit(v);
    setDeleteConfirmOpen(true);
  };

  // Submit Create
  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAuthority.trim()) {
      toast.error("يرجى ملء جميع الحقول الإلزامية");
      return;
    }

    setSubmitting(true);
    const newVisit: SiteVisitRecord = {
      id: "v-" + Date.now(),
      title: formTitle.trim(),
      authority: formAuthority.trim(),
      location: formLocation.trim() || "مقر جهة الطرح",
      employeeName: formEmployee.trim() || "مهندس الموقع",
      operationCode: formOpCode.trim(),
      visitDate: formDate,
      status: formStatus,
      purpose: formPurpose.trim() || undefined,
      findings: formFindings.trim() || undefined,
      expenses: Number(formExpenses) || 0,
      isPaid: formIsPaid,
      notes: formNotes.trim() || undefined,
      reportNumber: formReportNumber || ("VIS-" + new Date().getFullYear() + "-" + Math.floor(100 + Math.random() * 900)),
    };

    setVisits([newVisit, ...visits]);
    toast.success("تم تسجيل المعاينة الميدانية ومحضر الزيارة بنجاح");
    setCreateModalOpen(false);
    resetForm();
    setSubmitting(false);
  };

  // Submit Update
  const handleUpdateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVisit) return;
    if (!formTitle.trim() || !formAuthority.trim()) {
      toast.error("يرجى ملء الحقول الإلزامية");
      return;
    }

    setSubmitting(true);
    try {
      // Attempt backend patch if real ID
      if (!activeVisit.id.startsWith("v-") && !activeVisit.id.startsWith("v")) {
        await api.patch(`/employees/visits/${activeVisit.id}`, {
          location: formLocation.trim(),
          purpose: formPurpose.trim() || formTitle.trim(),
          visitDate: formDate,
          expenses: Number(formExpenses) || 0,
          isPaid: formIsPaid,
          notes: formNotes.trim(),
        });
      }
    } catch {
      // Local fallback
    }

    const updated = visits.map((v) => {
      if (v.id === activeVisit.id) {
        return {
          ...v,
          title: formTitle.trim(),
          authority: formAuthority.trim(),
          location: formLocation.trim(),
          employeeName: formEmployee.trim(),
          operationCode: formOpCode.trim(),
          visitDate: formDate,
          status: formStatus,
          purpose: formPurpose.trim() || undefined,
          findings: formFindings.trim() || undefined,
          expenses: Number(formExpenses) || 0,
          isPaid: formIsPaid,
          notes: formNotes.trim() || undefined,
          reportNumber: formReportNumber,
        };
      }
      return v;
    });

    setVisits(updated);
    toast.success("تم تحديث بيانات المعاينة الميدانية بنجاح");
    setEditModalOpen(false);
    resetForm();
    setSubmitting(false);
  };

  // Submit Delete
  const handleDeleteVisit = async () => {
    if (!activeVisit) return;
    setSubmitting(true);
    try {
      if (!activeVisit.id.startsWith("v-") && !activeVisit.id.startsWith("v")) {
        await api.delete(`/employees/visits/${activeVisit.id}`);
      }
    } catch {
      // Local fallback
    }

    setVisits(visits.filter((v) => v.id !== activeVisit.id));
    toast.success(`تم حذف المعاينة "${activeVisit.title}"`);
    setDeleteConfirmOpen(false);
    setActiveVisit(null);
    setSubmitting(false);
  };

  // Quick Status Toggle
  const handleQuickStatus = (id: string, newStatus: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED") => {
    setVisits(visits.map((v) => (v.id === id ? { ...v, status: newStatus } : v)));
    toast.success("تم تحديث حالة المعاينة الميدانية");
  };

  // Toggle Expense Paid
  const handleTogglePaid = (id: string) => {
    setVisits(
      visits.map((v) => {
        if (v.id === id) {
          const next = !v.isPaid;
          toast.success(next ? "تم تحديد بدل الانتقال كـ مسدد للمهندس" : "تم إلغاء سداد البدل");
          return { ...v, isPaid: next };
        }
        return v;
      })
    );
  };

  // Filtered visits
  const filtered = useMemo(() => {
    return visits.filter((v) => {
      const matchSearch =
        v.title.includes(search) ||
        v.authority.includes(search) ||
        v.employeeName.includes(search) ||
        v.operationCode.includes(search) ||
        v.location.includes(search) ||
        (v.reportNumber && v.reportNumber.includes(search));

      const matchStatus = filterStatus === "ALL" || v.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [visits, search, filterStatus]);

  // Statistics
  const totalVisits = visits.length;
  const scheduledCount = visits.filter((v) => v.status === "SCHEDULED").length;
  const completedCount = visits.filter((v) => v.status === "COMPLETED").length;
  const inProgressCount = visits.filter((v) => v.status === "IN_PROGRESS").length;
  const totalExpenses = visits.reduce((acc, v) => acc + (v.expenses || 0), 0);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* ━━━ Header ━━━ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shadow-xs">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                الزيارات والمعاينات الميدانية
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                جدولة وتوثيق زيارات فحص المواقع، حضور جلسات الاستفسارات، ومحاضر الفحص الفني الرسمية
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={fetchVisits}
            className="border-border text-foreground hover:bg-muted text-xs h-9 px-3 rounded-xl cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline mr-1.5">تحديث</span>
          </Button>

          <Button
            onClick={handleOpenCreate}
            className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 hover:from-blue-800 hover:to-blue-700 text-white font-bold px-4 h-9 rounded-xl shadow-lg shadow-blue-500/20 royal-glow flex items-center gap-2 text-xs sm:text-sm active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>جدولة معاينة ميدانية</span>
          </Button>
        </div>
      </div>

      {/* ━━━ Statistics Cards ━━━ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-border">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>إجمالي المعاينات</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <ClipboardCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground mt-2 font-mono">{totalVisits}</p>
          <span className="text-[11px] text-muted-foreground mt-1 block">موثقة بمحاضر رسمية</span>
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-border">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>معاينات مكتملة ومعتمدة</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            {completedCount}
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">معاينة نافية للجهالة</span>
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-border">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>معاينات مجدولة وقادمة</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 font-mono">
            {scheduledCount + inProgressCount}
          </p>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 block">بانتظار تنفيذ المهندس</span>
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-border">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>إجمالي مصاريف الانتقال</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2 font-mono">
            {totalExpenses} ج.م
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">بدلات انتقال معتمدة</span>
        </div>
      </div>

      {/* ━━━ Search and Filter ━━━ */}
      <div className="glass-card rounded-2xl p-4 border border-border flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بعنوان المعاينة، جهة الطرح، اسم الموظف، كود العملية، أو الموقع..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-xs sm:text-sm h-10 w-full"
          />
        </div>

        <div className="w-full md:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-10 px-3 bg-muted/40 border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-hidden focus:border-blue-500 w-full"
          >
            <option value="ALL">كافة الحالات</option>
            <option value="SCHEDULED">مجدولة وقادمة</option>
            <option value="IN_PROGRESS">جارية الآن</option>
            <option value="COMPLETED">مكتملة ومعتمدة</option>
            <option value="CANCELLED">ملغاة</option>
          </select>
        </div>
      </div>

      {/* ━━━ Visits Cards List ━━━ */}
      <div className="space-y-3.5">
        {filtered.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center border border-border space-y-3 max-w-md mx-auto">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-base font-bold text-foreground">لا توجد زيارات أو معاينات مطابقة</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              قم بجدولة زيارة ميدانية جديدة لفحص الموقع أو حضور جلسات فتح المظاريف.
            </p>
          </div>
        ) : (
          filtered.map((v) => (
            <div
              key={v.id}
              className="glass-card-interactive rounded-2xl p-5 border border-border hover:border-blue-500/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 group transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-700 dark:text-blue-300 border border-blue-500/25 flex items-center justify-center shrink-0 mt-0.5">
                  <ClipboardCheck className="h-6 w-6" />
                </div>

                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {v.title}
                    </span>
                    <Badge variant="outline" className="border-blue-500/30 text-blue-600 dark:text-blue-400 font-mono text-xs">
                      {v.operationCode}
                    </Badge>
                    {v.reportNumber && (
                      <Badge variant="outline" className="border-border text-muted-foreground font-mono text-[10px]">
                        {v.reportNumber}
                      </Badge>
                    )}
                    <Badge
                      className={
                        v.status === "COMPLETED"
                          ? "badge-emerald text-xs"
                          : v.status === "IN_PROGRESS"
                          ? "badge-blue text-xs"
                          : v.status === "CANCELLED"
                          ? "badge-rose text-xs"
                          : "badge-amber text-xs"
                      }
                    >
                      {v.status === "COMPLETED"
                        ? "مكتملة ✓"
                        : v.status === "IN_PROGRESS"
                        ? "جارية الآن"
                        : v.status === "CANCELLED"
                        ? "ملغاة"
                        : "مجدولة"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Building2 className="h-3.5 w-3.5 text-blue-600" />
                      {v.authority}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {v.location}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <User className="h-3.5 w-3.5 text-blue-600" />
                      المسؤول: {v.employeeName}
                    </span>
                    {v.expenses > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-mono">
                        <DollarSign className="h-3 w-3 text-emerald-600" />
                        بدل الانتقال: <strong>{v.expenses} ج.م</strong>
                        <span
                          onClick={() => handleTogglePaid(v.id)}
                          className={`cursor-pointer px-1.5 py-0.2 rounded text-[10px] ${
                            v.isPaid
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          }`}
                          title="اضغط لتبديل حالة صرف البدل"
                        >
                          {v.isPaid ? "مسدد ✓" : "معلق"}
                        </span>
                      </span>
                    )}
                  </div>

                  {v.purpose && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      <strong className="text-foreground">الغرض الفني: </strong>
                      {v.purpose}
                    </p>
                  )}

                  {v.findings && (
                    <div className="p-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground mt-1">
                      <span className="font-bold text-blue-600 block text-[11px]">نتائج المعاينة:</span>
                      <p className="text-muted-foreground">{v.findings}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex flex-row lg:flex-col items-end justify-between lg:justify-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-border">
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-foreground block">{v.visitDate}</span>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 block mt-0.5">
                    معاينة معتمدة
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenDossier(v)}
                    className="h-8 px-2.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-lg cursor-pointer"
                    title="محضر المعاينة الرسمي للطباعة"
                  >
                    <Printer className="h-3.5 w-3.5 ml-1" />
                    <span>المحضر</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenEdit(v)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg cursor-pointer"
                    title="تعديل المعاينة"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenDelete(v)}
                    className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                    title="حذف المعاينة"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: جدولة معاينة جديدة (Create Visit)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {mounted && createModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="relative w-full max-w-xl bg-card dark:bg-[#0c1427] rounded-3xl border border-border shadow-2xl flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden animate-scale-up my-auto">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border bg-card dark:bg-[#0c1427] shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">جدولة معاينة ميدانية جديدة</h3>
                  <p className="text-xs text-muted-foreground">توثيق موعد ومهمة فحص الموقع أو جلسة الاستفسارات</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded-xl hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVisit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-foreground mb-1">عنوان المعاينة / المهمة *</label>
                  <Input
                    required
                    placeholder="مثال: فحص مسارات كابلات الألياف الضوئية وغرف التحكم"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-9"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">الجهة الحكومية المستفيدة *</label>
                  <Input
                    required
                    placeholder="اسم الوزارة أو الهيئة"
                    value={formAuthority}
                    onChange={(e) => setFormAuthority(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-9"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">كود العملية المرتبطة</label>
                  <Input
                    placeholder="A15 أو B08"
                    value={formOpCode}
                    onChange={(e) => setFormOpCode(e.target.value)}
                    className="bg-muted/40 border-border text-foreground font-mono focus:border-blue-500 rounded-xl h-9"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-foreground mb-1">الموقع والعنوان الميداني</label>
                  <Input
                    placeholder="المحافظة — المنطقة — المبنى"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-9"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">الموظف / المهندس المسؤول</label>
                  <Input
                    placeholder="اسم المهندس أو الفني"
                    value={formEmployee}
                    onChange={(e) => setFormEmployee(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-9"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">تاريخ المعاينة الميدانية</label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="bg-muted/40 border-border text-foreground font-mono focus:border-blue-500 rounded-xl h-9"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">بدل ومصاريف الانتقال (ج.م)</label>
                  <Input
                    type="number"
                    value={formExpenses}
                    onChange={(e) => setFormExpenses(e.target.value)}
                    className="bg-muted/40 border-border text-foreground font-mono focus:border-blue-500 rounded-xl h-9"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">حالة المعاينة</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full h-9 px-3 bg-muted/40 border border-border rounded-xl font-bold text-foreground focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="SCHEDULED">مجدولة وقادمة</option>
                    <option value="IN_PROGRESS">جارية الآن</option>
                    <option value="COMPLETED">مكتملة ومعتمدة</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-foreground mb-1">الغرض الفني من الزيارة</label>
                  <Input
                    placeholder="مطابقة كراسة الشروط، فحص مسارات، حضور جلسة استفسارات..."
                    value={formPurpose}
                    onChange={(e) => setFormPurpose(e.target.value)}
                    className="bg-muted/40 border-border text-foreground focus:border-blue-500 rounded-xl h-9"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-foreground mb-1">ملاحظات ونتائج أولية</label>
                  <Input
                    placeholder="أي تجهيزات مطلوبة أو موافقات أمنية..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="bg-muted/40 border-border text-foreground focus:border-blue-500 rounded-xl h-9"
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
                  حفظ وتأكيد المعاينة
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: تعديل المعاينة (Edit Visit)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {mounted && editModalOpen && activeVisit && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="relative w-full max-w-xl bg-card dark:bg-[#0c1427] rounded-3xl border border-border shadow-2xl flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden animate-scale-up my-auto">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border bg-card dark:bg-[#0c1427] shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Edit className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">تعديل بيانات المعاينة الميدانية</h3>
                  <p className="text-xs text-muted-foreground">{activeVisit.reportNumber}</p>
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

            <form onSubmit={handleUpdateVisit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-foreground mb-1">عنوان المعاينة *</label>
                  <Input
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="bg-muted/40 border-border text-foreground focus:border-amber-500 rounded-xl h-9"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">الجهة الحكومية *</label>
                  <Input
                    required
                    value={formAuthority}
                    onChange={(e) => setFormAuthority(e.target.value)}
                    className="bg-muted/40 border-border text-foreground focus:border-amber-500 rounded-xl h-9"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">كود العملية</label>
                  <Input
                    value={formOpCode}
                    onChange={(e) => setFormOpCode(e.target.value)}
                    className="bg-muted/40 border-border text-foreground font-mono focus:border-amber-500 rounded-xl h-9"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-foreground mb-1">الموقع الميداني</label>
                  <Input
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="bg-muted/40 border-border text-foreground focus:border-amber-500 rounded-xl h-9"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">الموظف المسؤول</label>
                  <Input
                    value={formEmployee}
                    onChange={(e) => setFormEmployee(e.target.value)}
                    className="bg-muted/40 border-border text-foreground focus:border-amber-500 rounded-xl h-9"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">تاريخ المعاينة</label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="bg-muted/40 border-border text-foreground font-mono focus:border-amber-500 rounded-xl h-9"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">الحالة</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full h-9 px-3 bg-muted/40 border border-border rounded-xl font-bold text-foreground focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="SCHEDULED">مجدولة وقادمة</option>
                    <option value="IN_PROGRESS">جارية الآن</option>
                    <option value="COMPLETED">مكتملة ومعتمدة</option>
                    <option value="CANCELLED">ملغاة</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">بدل الانتقال (ج.م)</label>
                  <Input
                    type="number"
                    value={formExpenses}
                    onChange={(e) => setFormExpenses(e.target.value)}
                    className="bg-muted/40 border-border text-foreground font-mono focus:border-amber-500 rounded-xl h-9"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-foreground mb-1">الغرض الفني</label>
                  <Input
                    value={formPurpose}
                    onChange={(e) => setFormPurpose(e.target.value)}
                    className="bg-muted/40 border-border text-foreground focus:border-amber-500 rounded-xl h-9"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-foreground mb-1">نتائج الفحص والمعاينة</label>
                  <Input
                    value={formFindings}
                    onChange={(e) => setFormFindings(e.target.value)}
                    className="bg-muted/40 border-border text-foreground focus:border-amber-500 rounded-xl h-9"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-foreground mb-1">ملاحظات عامة</label>
                  <Input
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="bg-muted/40 border-border text-foreground focus:border-amber-500 rounded-xl h-9"
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
                  تحديث المعاينة
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: محضر معاينة رسمي للطباعة (Printable Inspection Minutes)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {mounted && dossierModalOpen && activeVisit && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="relative w-full max-w-2xl bg-card dark:bg-[#0c1427] rounded-3xl border border-border shadow-2xl flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden animate-scale-up my-auto">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border bg-card dark:bg-[#0c1427] shrink-0">
              <div className="flex items-center gap-2 text-blue-600">
                <Printer className="h-5 w-5" />
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  محضر معاينة موقع رسمي معتمد (A4 Official Minutes)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDossierModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded-xl hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
              {/* Official Report Template */}
              <div className="p-6 bg-card border-2 border-border/80 rounded-2xl space-y-4 text-foreground shadow-sm">
                <div className="flex items-start justify-between border-b pb-3">
                  <div>
                    <h4 className="font-extrabold text-base">جمهورية مصر العربية</h4>
                    <p className="text-xs text-muted-foreground">محضر معاينة ميدانية نافية للجهالة — قانون 182 لسنة 2018</p>
                  </div>
                  <div className="text-left font-mono text-xs">
                    <div className="font-bold text-sm text-blue-600">{activeVisit.reportNumber || "VIS-OFFICIAL"}</div>
                    <div className="text-muted-foreground">التاريخ: {activeVisit.visitDate}</div>
                  </div>
                </div>

                <div className="text-center py-1">
                  <span className="text-base font-black underline underline-offset-6">
                    محضر إثبات حالة ومعاينة موقع العملية
                  </span>
                </div>

                <div className="space-y-2.5 text-xs leading-relaxed">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="font-bold text-muted-foreground">العملية محل المعاينة:</span>
                    <span className="font-mono font-bold text-blue-600">كود [{activeVisit.operationCode}]</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="font-bold text-muted-foreground">جهة الطرح والإسناد:</span>
                    <span className="font-bold">{activeVisit.authority}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="font-bold text-muted-foreground">موقع المعاينة بالتفصيل:</span>
                    <span className="font-semibold">{activeVisit.location}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="font-bold text-muted-foreground">مهندس الموقع القائم بالمعاينة:</span>
                    <span className="font-bold text-foreground">{activeVisit.employeeName}</span>
                  </div>

                  {activeVisit.purpose && (
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                      <span className="font-bold block mb-1">الغرض الفني وموضوع المعاينة:</span>
                      <p>{activeVisit.purpose}</p>
                    </div>
                  )}

                  {activeVisit.findings && (
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <span className="font-bold text-blue-600 block mb-1">النتائج الفنية والمعاينة الواقعية:</span>
                      <p>{activeVisit.findings}</p>
                    </div>
                  )}

                  {activeVisit.notes && (
                    <div className="p-2 rounded-xl bg-muted/30 border border-border/40">
                      <span className="font-bold block mb-0.5 text-muted-foreground">ملاحظات تكميلية:</span>
                      <p>{activeVisit.notes}</p>
                    </div>
                  )}
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-6 pt-5 border-t text-center text-xs">
                  <div>
                    <span className="text-muted-foreground block mb-6">مهندس المعاينة الميدانية</span>
                    <span className="font-bold border-t border-border pt-1 block">{activeVisit.employeeName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-6">اعتماد الإدارة الفنية والمشروعات</span>
                    <span className="font-bold border-t border-border pt-1 block">مدير المشروعات والعقود</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 sm:px-6 py-3.5 border-t border-border bg-muted/40 flex items-center justify-between shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDossierModalOpen(false)}
                className="text-xs border-border cursor-pointer"
              >
                إغلاق
              </Button>
              <Button
                size="sm"
                onClick={() => window.print()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 rounded-xl cursor-pointer shadow-md"
              >
                <Printer className="h-4 w-4 ml-1.5" />
                <span>طباعة المحضر الرسمي A4</span>
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: تأكيد حذف المعاينة (Delete Confirmation)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {mounted && deleteConfirmOpen && activeVisit && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="relative w-full max-w-md bg-card dark:bg-[#0c1427] rounded-3xl border border-border shadow-2xl p-6 space-y-4 animate-scale-up text-center my-auto">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-foreground">تأكيد حذف المعاينة الميدانية</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                هل أنت متأكد من حذف المعاينة{" "}
                <strong className="text-foreground">"{activeVisit.title}"</strong> الخاصة بالعملية{" "}
                <strong className="font-mono text-blue-600">[{activeVisit.operationCode}]</strong>؟
              </p>
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
                onClick={handleDeleteVisit}
                disabled={submitting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs h-9 px-5 cursor-pointer shadow-sm"
              >
                {submitting ? "جاري الحذف..." : "تأكيد الحذف"}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
