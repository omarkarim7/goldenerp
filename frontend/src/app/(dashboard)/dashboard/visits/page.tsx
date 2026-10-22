"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  ClipboardCheck, Plus, Search, MapPin, Calendar, User,
  CheckCircle2, Clock, AlertTriangle, Building2, ChevronLeft,
  X, Edit, Trash2, Eye, Download, Check, DollarSign,
  FileText, Shield, Sparkles, Navigation, Layers, RefreshCw,
  HardHat, Users, CheckCircle, AlertOctagon, Ruler, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";
import { useCompany } from "@/context/company-context";

export interface SiteVisitRecord {
  id: string;
  title: string;
  authority: string;
  location: string;
  employeeName: string;
  employeeId?: string;
  operationCode: string;
  operationName?: string;
  visitDate: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  siteReadiness: "READY" | "CONDITIONAL" | "BLOCKED" | "SURVEY_ONLY";
  committeeMembers?: string;
  purpose?: string;
  findings?: string;
  obstacles?: string;
  safetyPermits?: string;
  expenses: number;
  isPaid: boolean;
  notes?: string;
  reportNumber: string;
}

const INITIAL_VISITS: SiteVisitRecord[] = [
  {
    id: "v1",
    title: "معاينة مسارات شبكة كابلات الجهد المتوسط وغرف المحولات",
    authority: "هيئة المجتمعات العمرانية الجديدة",
    location: "العاصمة الإدارية الجديدة — الحي الحكومي، مبنى B4 ومحيط محطة التوزيع",
    employeeName: "م. أحمد الشريف",
    operationCode: "A15",
    operationName: "توريد وتركيب شبكة كابلات محولات الجهد المتوسط",
    visitDate: "2026-10-03",
    status: "SCHEDULED",
    siteReadiness: "READY",
    committeeMembers: "م. أحمد الشريف (مهندس الموقع)، م. سامح فوزي (استشاري الكهرباء)، فني المساحة",
    purpose: "فحص مسارات الحفر ومد الكابلات ومطابقتها مع المخططات المعتمدة وكراسة الشروط",
    findings: "الموقع جاهز تماماً لبدء مد المسارات، غرف المحولات خالية من أي مخلفات وجاهزة للأعمال الكهروميكانيكية.",
    obstacles: "لا توجد معوقات جوهرية، يلزم فقط التنسيق المسبق مع مقاول الأعمال المدنية قبل الدخول بالمعدات الثقيلة.",
    safetyPermits: "تم استخراج تصاريح الدخول الأمنية وتصاريح العمل الساخن وتوفير مهمات الوقاية PPE.",
    expenses: 450,
    isPaid: true,
    reportNumber: "VIS-2026-081",
    notes: "تم استلام مفاتيح غرف الكهرباء وإشعار جهة الإشراف بالبدء",
  },
  {
    id: "v2",
    title: "حضور جلسة الاستفسارات وفحص غرف السنترالات ومسارات الفايبر",
    authority: "وزارة الاتصالات وتكنولوجيا المعلومات",
    location: "القرية الذكية — مبنى الوزارة الرئيسي B12 وقاعة المؤتمرات",
    employeeName: "أ. محمود عبد الرحمن",
    operationCode: "B08",
    operationName: "إحلال وتجديد كابلات الفايبر والسنترالات",
    visitDate: "2026-10-02",
    status: "IN_PROGRESS",
    siteReadiness: "CONDITIONAL",
    committeeMembers: "أ. محمود عبد الرحمن (مسؤول المناقصات)، م. خالد وجدي (مهندس شبكات)، مندوب الشؤون الإدارية",
    purpose: "تسليم خطاب الاستفسارات الرسمي ومعاينة غرف تجميع كابلات الألياف الضوئية",
    findings: "تمت المعاينة وملاحظة وجود كابلات قديمة تحتاج إزالة سريعة، وأفادت اللجنة بنشر ملحق فني لتعديل أطوال الكابلات.",
    obstacles: "وجود كابلات شبكات قديمة تعيق مد المسارات الجديدة، بانتظار كتاب الإخلاء من الوزارة.",
    safetyPermits: "تصاريح دخول القرية الذكية سارية المفعول حتى نهاية شهر أكتوبر.",
    expenses: 250,
    isPaid: false,
    reportNumber: "VIS-2026-080",
    notes: "بانتظار رد الجهة الإدارية المكتوب والمحضر المعتمد",
  },
  {
    id: "v3",
    title: "فحص واختبار عينات معامل الحاسب ومطابقة قاعات التدريب",
    authority: "الهيئة العامة للأبنية التعليمية",
    location: "مخازن ومعامل الهيئة المركزية — مجمع مدينة نصر",
    employeeName: "م. كريم صلاح",
    operationCode: "C04",
    operationName: "تجهيز وتأثيث معامل الحاسب الآلي وغرف الخوادم",
    visitDate: "2026-09-29",
    status: "COMPLETED",
    siteReadiness: "READY",
    committeeMembers: "م. كريم صلاح (مهندس نظم)، رئيس لجنة الفحص والبت الفني بالهيئة، ومسؤول التوريدات",
    purpose: "سحب عينات الفحص المعملي ومطابقة أجهزة الخوادم والشاشات مع كراسة المواصفات",
    findings: "اجتازت جميع العينات اختبارات الجهد والأداء بنجاح، وتم اعتماد محضر الفحص الفني الأولي بدون أي تحفظات.",
    obstacles: "لا توجد معوقات، القاعات مجهزة ومكيفة وجاهزة لاستقبال الشحنة الأولى.",
    safetyPermits: "مستوفاة بالكامل ومعتمدة من قطاع السلامة والصحة المهنية بالهيئة.",
    expenses: 600,
    isPaid: true,
    reportNumber: "VIS-2026-079",
    notes: "تم توقيع محضر الفحص الفني الرسمي من كافة أعضاء اللجنة",
  },
  {
    id: "v4",
    title: "معاينة مباني المدارس ورفع مقاسات لوحات وشبكات الإنذار",
    authority: "مديرية التربية والتعليم بالجيزة",
    location: "إدارة 6 أكتوبر التعليمية — مجمع المدارس التجريبية المتميزة",
    employeeName: "م. حسام الدين نبيل",
    operationCode: "A12",
    operationName: "توريد وتركيب منظومة كاميرات المراقبة وغرفة التحكم",
    visitDate: "2026-09-22",
    status: "COMPLETED",
    siteReadiness: "CONDITIONAL",
    committeeMembers: "م. حسام الدين نبيل (مهندس إلكترونيات)، مدير الصيانة بالإدارة التعليمية، أخصائي السلامة",
    purpose: "رفع المقاسات الواقعية لمواقع كاميرات المراقبة ولوحات التحكم وخطوط التغذية",
    findings: "وجود اختلاف طفيف في مسافات الأسلاك بين المخطط والواقع الميداني، وتم تدوين التعديل لإدراجه بالعرض الفني.",
    obstacles: "بعض الحوائط تتطلب أعمال تكسير وتثبيت مجارٍ خاصة بالكابلات لحمايتها من العبث.",
    safetyPermits: "تم التنسيق مع إدارة أمن المنشآت التعليمية والحصول على إذن العمل الميداني.",
    expenses: 350,
    isPaid: true,
    reportNumber: "VIS-2026-078",
    notes: "معاينة نافية للجهالة وموقعة من مندوب الإدارة التعليمية",
  },
  {
    id: "v5",
    title: "معاينة أسطح مباني المجمع وقياس مناسيب العزل",
    authority: "جهاز مدينة 6 أكتوبر",
    location: "مباني مجمع الخدمات المركزية — المحور المركزي",
    employeeName: "م. تامر الشاذلي",
    operationCode: "D05",
    operationName: "أعمال العزل الحراري والمائي لمباني الخدمات المركزية",
    visitDate: "2026-10-10",
    status: "IN_PROGRESS",
    siteReadiness: "BLOCKED",
    committeeMembers: "م. تامر الشاذلي (مهندس مدني)، مهندس جهاز المدينة المشرف، مقاول الأعمال السابقة",
    purpose: "معاينة نظافة الأسطح ومناسيب ميول صرف مياه الأمطار قبل بدء تطبيق طبقات العزل",
    findings: "لوحظ وجود ركود في مياه الأمطار وعدم اكتمال مزاريب الصرف المنفذة من المقاول السابق، مما يمنع فرد العزل حالياً.",
    obstacles: "وجود تراكم مياه ورواسب خرسانية تستوجب كشط السطح وضبط الميول أولاً قبل تنفيذ بنود العزل.",
    safetyPermits: "سقالات الموقع تحتاج تثبيت إضافي طبقاً لاشتراطات السلامة للعمل على ارتفاعات.",
    expenses: 300,
    isPaid: false,
    reportNumber: "VIS-2026-082",
    notes: "تم إخطار جهاز المدينة رسمياً بضرورة إزالة المعوقات قبل بدء توريد الخامات",
  },
  {
    id: "v6",
    title: "معاينة محطة رفع الصرف الصحي وتحديد مواقع الطلمبات البديلة",
    authority: "شركة مياه الشرب والصرف الصحي بالجيزة",
    location: "محطة رفع الصرف الصحي الرئيسية — الحوامدية",
    employeeName: "م. أحمد الشريف",
    operationCode: "A09",
    operationName: "أعمال الإحلال والتجديد لمحطات الرفع والضخ",
    visitDate: "2026-10-14",
    status: "COMPLETED",
    siteReadiness: "READY",
    committeeMembers: "م. أحمد الشريف (مهندس ميكانيكا)، مدير تشغيل المحطة، ومسؤول السلامة والصحة المهنية",
    purpose: "معاينة قواعد الطلمبات القديمة وفحص خطوط الطرد والمحابس",
    findings: "القواعد الخرسانية بحالة جيدة جداً، وتم اعتماد نقاط التثبيت للطلمبات الجديدة ومطابقتها مع المخططات.",
    obstacles: "لا توجد معوقات جوهرية، يتطلب التنسيق أثناء التركيب لتشغيل الخط التبادلي دون انقطاع الخدمة.",
    safetyPermits: "تصريح دخول موقع المحطة مستوفى مع اعتماد شهادات أجهزة قياس الغازات السامة.",
    expenses: 400,
    isPaid: true,
    reportNumber: "VIS-2026-083",
    notes: "تم تسليم محضر المعاينة لإدارة المشروعات بالشركة",
  },
];

export default function VisitsPage() {
  const { selectedCompany, setSelectedCompany, currentCompany, companies } = useCompany();
  const [mounted, setMounted] = useState(false);
  const [visits, setVisits] = useState<SiteVisitRecord[]>(INITIAL_VISITS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterReadiness, setFilterReadiness] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [viewMode, setViewMode] = useState<"CARDS" | "TABLE">("CARDS");

  // Modals state
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
  const [formOpName, setFormOpName] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formStatus, setFormStatus] = useState<"SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED">("SCHEDULED");
  const [formSiteReadiness, setFormSiteReadiness] = useState<"READY" | "CONDITIONAL" | "BLOCKED" | "SURVEY_ONLY">("READY");
  const [formCommittee, setFormCommittee] = useState("");
  const [formPurpose, setFormPurpose] = useState("");
  const [formFindings, setFormFindings] = useState("");
  const [formObstacles, setFormObstacles] = useState("");
  const [formSafetyPermits, setFormSafetyPermits] = useState("");
  const [formExpenses, setFormExpenses] = useState("0");
  const [formIsPaid, setFormIsPaid] = useState(false);
  const [formNotes, setFormNotes] = useState("");
  const [formReportNumber, setFormReportNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch from backend (scoped to selected company)
  const fetchVisits = async () => {
    try {
      setLoading(true);
      const compParam = selectedCompany && selectedCompany !== "ALL" ? `?company=${selectedCompany}` : "";
      const res = await api.get(`/employees/visits${compParam}`);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: SiteVisitRecord[] = res.data.map((v: any) => {
          let extra: any = {};
          if (v.notes && v.notes.includes("{")) {
            try {
              extra = JSON.parse(v.notes);
            } catch {}
          }

          return {
            id: v.id,
            title: v.purpose || "معاينة وزيارة موقع",
            authority: extra.authority || (v.notes?.includes("authority:") ? v.notes.split("authority:")[1]?.split(";")[0] : "الجهة الحكومية"),
            location: v.location || "الموقع الميداني",
            employeeName: v.employee?.name || "الموظف المسؤول",
            employeeId: v.employeeId,
            operationCode: v.operationId || "A15",
            operationName: extra.operationName || undefined,
            visitDate: v.visitDate ? v.visitDate.split("T")[0] : new Date().toISOString().split("T")[0],
            status: "COMPLETED",
            siteReadiness: extra.siteReadiness || "READY",
            committeeMembers: extra.committeeMembers || undefined,
            purpose: v.purpose || "",
            findings: extra.findings || "",
            obstacles: extra.obstacles || undefined,
            safetyPermits: extra.safetyPermits || undefined,
            expenses: Number(v.expenses) || 0,
            isPaid: v.isPaid || false,
            notes: v.notes || "",
            reportNumber: `VIS-${new Date().getFullYear()}-${v.id.substring(0, 4)}`,
          };
        });
        setVisits(mapped);
      }
    } catch {
      // Keep rich demo visits
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, [selectedCompany]);

  // Format currency
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(n);

  // 1. Strict Company Scoping for Site Visits
  const companyScopedVisits = useMemo(() => {
    if (!selectedCompany || selectedCompany === "ALL") return visits;
    return visits.filter(
      (v) => v.operationCode.toUpperCase().startsWith(selectedCompany)
    );
  }, [visits, selectedCompany]);

  // 2. KPIs calculated strictly on companyScopedVisits
  const stats = useMemo(() => {
    const total = companyScopedVisits.length;
    const ready = companyScopedVisits.filter((v) => v.siteReadiness === "READY").length;
    const readyPercent = total > 0 ? Math.round((ready / total) * 100) : 0;
    const scheduled = companyScopedVisits.filter((v) => v.status === "SCHEDULED" || v.status === "IN_PROGRESS").length;
    const totalExpenses = companyScopedVisits.reduce((acc, v) => acc + (v.expenses || 0), 0);
    const paidExpenses = companyScopedVisits.filter((v) => v.isPaid).reduce((acc, v) => acc + (v.expenses || 0), 0);

    return { total, ready, readyPercent, scheduled, totalExpenses, paidExpenses };
  }, [companyScopedVisits]);

  // 3. Filtered visits
  const filtered = useMemo(() => {
    return companyScopedVisits.filter((v) => {
      const matchSearch =
        v.title.toLowerCase().includes(search.toLowerCase()) ||
        v.authority.toLowerCase().includes(search.toLowerCase()) ||
        v.location.toLowerCase().includes(search.toLowerCase()) ||
        v.employeeName.toLowerCase().includes(search.toLowerCase()) ||
        v.operationCode.toLowerCase().includes(search.toLowerCase()) ||
        v.reportNumber.toLowerCase().includes(search.toLowerCase());

      const matchStatus = filterStatus === "ALL" || v.status === filterStatus;
      const matchReadiness = filterReadiness === "ALL" || v.siteReadiness === filterReadiness;

      return matchSearch && matchStatus && matchReadiness;
    });
  }, [companyScopedVisits, search, filterStatus, filterReadiness]);

  // Reset form
  const resetForm = () => {
    const defaultOp = selectedCompany !== "ALL" ? `${selectedCompany}15` : "A15";
    setFormTitle("");
    setFormAuthority("");
    setFormLocation("");
    setFormEmployee("");
    setFormOpCode(defaultOp);
    setFormOpName("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormStatus("SCHEDULED");
    setFormSiteReadiness("READY");
    setFormCommittee("");
    setFormPurpose("");
    setFormFindings("");
    setFormObstacles("");
    setFormSafetyPermits("");
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
    setFormOpName(v.operationName || "");
    setFormDate(v.visitDate);
    setFormStatus(v.status);
    setFormSiteReadiness(v.siteReadiness);
    setFormCommittee(v.committeeMembers || "");
    setFormPurpose(v.purpose || "");
    setFormFindings(v.findings || "");
    setFormObstacles(v.obstacles || "");
    setFormSafetyPermits(v.safetyPermits || "");
    setFormExpenses(String(v.expenses || 0));
    setFormIsPaid(v.isPaid);
    setFormNotes(v.notes || "");
    setFormReportNumber(v.reportNumber);
    setEditModalOpen(true);
  };

  // Open Dossier / View Details (STRICTLY NO PRINT BUTTON)
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
    if (!formTitle.trim() || !formAuthority.trim() || !formLocation.trim()) {
      toast.error("يرجى ملء جميع الحقول الإلزامية");
      return;
    }

    setSubmitting(true);
    const newVisit: SiteVisitRecord = {
      id: "v-" + Date.now(),
      title: formTitle.trim(),
      authority: formAuthority.trim(),
      location: formLocation.trim(),
      employeeName: formEmployee.trim() || "مهندس الموقع",
      operationCode: formOpCode.trim(),
      operationName: formOpName.trim() || undefined,
      visitDate: formDate,
      status: formStatus,
      siteReadiness: formSiteReadiness,
      committeeMembers: formCommittee.trim() || undefined,
      purpose: formPurpose.trim() || undefined,
      findings: formFindings.trim() || undefined,
      obstacles: formObstacles.trim() || undefined,
      safetyPermits: formSafetyPermits.trim() || undefined,
      expenses: Number(formExpenses) || 0,
      isPaid: formIsPaid,
      notes: formNotes.trim() || undefined,
      reportNumber: formReportNumber || ("VIS-" + new Date().getFullYear() + "-" + Math.floor(100 + Math.random() * 900)),
    };

    setVisits([newVisit, ...visits]);
    toast.success("تم تسجيل المعاينة الميدانية ومحضر الموقع بنجاح");
    setCreateModalOpen(false);
    resetForm();
    setSubmitting(false);
  };

  // Submit Update
  const handleUpdateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVisit) return;
    if (!formTitle.trim() || !formAuthority.trim() || !formLocation.trim()) {
      toast.error("يرجى ملء جميع الحقول الإلزامية");
      return;
    }

    setSubmitting(true);
    const updated = visits.map((v) => {
      if (v.id === activeVisit.id) {
        return {
          ...v,
          title: formTitle.trim(),
          authority: formAuthority.trim(),
          location: formLocation.trim(),
          employeeName: formEmployee.trim(),
          operationCode: formOpCode.trim(),
          operationName: formOpName.trim() || undefined,
          visitDate: formDate,
          status: formStatus,
          siteReadiness: formSiteReadiness,
          committeeMembers: formCommittee.trim() || undefined,
          purpose: formPurpose.trim() || undefined,
          findings: formFindings.trim() || undefined,
          obstacles: formObstacles.trim() || undefined,
          safetyPermits: formSafetyPermits.trim() || undefined,
          expenses: Number(formExpenses) || 0,
          isPaid: formIsPaid,
          notes: formNotes.trim() || undefined,
          reportNumber: formReportNumber,
        };
      }
      return v;
    });

    setVisits(updated);
    toast.success("تم تحديث بيانات محضر المعاينة بنجاح");
    setEditModalOpen(false);
    resetForm();
    setSubmitting(false);
  };

  // Delete Visit
  const handleDeleteVisit = async () => {
    if (!activeVisit) return;
    setSubmitting(true);
    setVisits(visits.filter((v) => v.id !== activeVisit.id));
    toast.success(`تم حذف محضر المعاينة ${activeVisit.reportNumber}`);
    setDeleteConfirmOpen(false);
    setActiveVisit(null);
    setSubmitting(false);
  };

  // Helper for Site Readiness Badge
  const getReadinessBadge = (readiness: SiteVisitRecord["siteReadiness"]) => {
    switch (readiness) {
      case "READY":
        return {
          label: "جاهز للتنفيذ 100% 🟢",
          color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
        };
      case "CONDITIONAL":
        return {
          label: "جاهز بشروط وملاحظات 🟡",
          color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
        };
      case "BLOCKED":
        return {
          label: "معوقات تعيق البدء 🔴",
          color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30",
        };
      case "SURVEY_ONLY":
      default:
        return {
          label: "معاينة ورفع مقاسات 🔵",
          color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30",
        };
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16">
      {/* ━━━ Header ━━━ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 royal-glow">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  المعاينات الميدانية ومحاضر المواقع
                </h1>
                <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs px-2.5 py-0.5 font-bold">
                  {selectedCompany === "ALL" ? "شامل كافة الشركات 🏗️" : `شركة ${currentCompany?.name || selectedCompany} فقط`}
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                متابعة لجان المعاينة، فحص جاهزية المواقع، المطابقة مع كراسة الشروط، وبدلات الانتقال
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchVisits}
            disabled={loading}
            className="border-border text-foreground hover:bg-muted text-xs h-9 px-3 rounded-xl cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ml-1.5 text-blue-600 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>

          <Button
            onClick={handleOpenCreate}
            className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 hover:from-blue-700 hover:to-blue-600 text-white font-bold px-4 h-9 rounded-xl shadow-lg shadow-blue-500/20 royal-glow flex items-center gap-2 text-xs sm:text-sm active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>تسجيل معاينة موقع جديدة</span>
          </Button>
        </div>
      </div>

      {/* ━━━ Active Company Scope Banner & Immediate Switcher ━━━ */}
      <div className="p-4 sm:p-5 rounded-3xl glass-card border border-border shadow-md space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-mono font-black text-xl text-white shadow-md shrink-0 ${
                currentCompany ? `bg-gradient-to-br ${currentCompany.gradient}` : "bg-gradient-to-br from-blue-600 to-indigo-700"
              }`}
            >
              {selectedCompany === "ALL" ? "🏗️" : selectedCompany}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-foreground">
                  {selectedCompany === "ALL"
                    ? "سجل المعاينات الموحد — بوابة الـ 4 شركات"
                    : `المعاينات الميدانية لـ ${currentCompany?.fullName || `شركة ${selectedCompany}`}`}
                </h2>
                <Badge
                  className={`text-[10px] font-bold ${
                    selectedCompany === "ALL"
                      ? "bg-purple-500/15 text-purple-600 border border-purple-500/30"
                      : "bg-blue-500/15 text-blue-600 border border-blue-500/30"
                  }`}
                >
                  {selectedCompany === "ALL" ? "كافة الشركات" : `نطاق شركة ${selectedCompany} حصراً`}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedCompany === "ALL"
                  ? "عرض مجمع لكافة المعاينات الميدانية ولجان الفحص وجاهزية المواقع المسجلة عبر منظومة الشركات الأربعة."
                  : `جميع محاضر المعاينات ولجان المهندسين وبدلات الفحص المعروضة أدناه تخص عمليات شركة (${currentCompany?.name}) حصراً وبشكل مستقل تماماً.`}
              </p>
            </div>
          </div>
        </div>

        {/* Company Switcher Tabs */}
        <div className="pt-3 border-t border-border flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground ml-1">التبديل الفوري لنطاق الشركة:</span>
          {companies.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setSelectedCompany(c.code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCompany === c.code
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
              }`}
            >
              <span className="font-mono">{c.code}</span>
              <span>شركة {c.name}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedCompany("ALL")}
            className={`mr-auto px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedCompany === "ALL"
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>بوابة الـ 4 شركات (عرض مجمع)</span>
          </button>
        </div>
      </div>

      {/* ━━━ KPI Cards (Scoped to selected company) ━━━ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-border hover:border-blue-500/40 transition-all shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>إجمالي المعاينات</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <ClipboardCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-2 font-mono">
            {stats.total}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block font-mono">
            محاضر فحص {selectedCompany !== "ALL" ? `لشركة ${selectedCompany}` : "معتمدة"}
          </span>
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-border hover:border-emerald-500/40 transition-all shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>مواقع جاهزة للتنفيذ</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            {stats.ready} <span className="text-xs font-bold">({stats.readyPercent}%)</span>
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            مستوفاة للاشتراطات الفنية
          </span>
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-border hover:border-amber-500/40 transition-all shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>مجدولة وقيد التنفيذ</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 font-mono">
            {stats.scheduled}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            زيارات جارية ومستمرة
          </span>
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-border hover:border-purple-500/40 transition-all shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>بدلات ومصروفات الفحص</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-2 font-mono">
            {formatCurrency(stats.totalExpenses)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block font-mono">
            المسدد: {formatCurrency(stats.paidExpenses)}
          </span>
        </div>
      </div>

      {/* ━━━ Search and Filter Toolbar ━━━ */}
      <div className="glass-card rounded-2xl p-4 border border-border flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بموضوع المعاينة، الجهة، كود العملية A15، المهندس المسؤول، أو الموقع..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-xs sm:text-sm h-10 w-full"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <select
            value={filterReadiness}
            onChange={(e) => setFilterReadiness(e.target.value)}
            className="h-10 px-3 bg-muted/40 border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-hidden focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">كافة حالات الجاهزية</option>
            <option value="READY">جاهز للتنفيذ 100% 🟢</option>
            <option value="CONDITIONAL">بشروط وملاحظات 🟡</option>
            <option value="BLOCKED">معوقات تعيق البدء 🔴</option>
            <option value="SURVEY_ONLY">رفع مقاسات 🔵</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-10 px-3 bg-muted/40 border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-hidden focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">كافة الحالات</option>
            <option value="SCHEDULED">مجدولة 📅</option>
            <option value="IN_PROGRESS">جارية ⚡</option>
            <option value="COMPLETED">مكتملة معتمدة ✅</option>
          </select>

          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setViewMode("CARDS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "CARDS" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              الكروت 🗂️
            </button>
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "TABLE" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              الجدول 📊
            </button>
          </div>
        </div>
      </div>

      {/* ━━━ Cards View ━━━ */}
      {viewMode === "CARDS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full glass-card rounded-2xl p-12 text-center text-muted-foreground border border-border">
              <ClipboardCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p>لا توجد معاينات ميدانية مسجلة لشركة ({currentCompany?.name || selectedCompany}) مطابقة لمعايير البحث.</p>
            </div>
          ) : (
            filtered.map((v) => {
              const readiness = getReadinessBadge(v.siteReadiness);

              return (
                <div
                  key={v.id}
                  className="glass-card rounded-2xl border border-border hover:border-blue-500/50 transition-all p-5 flex flex-col justify-between space-y-4 hover:shadow-lg group"
                >
                  {/* Top Bar: Code, Authority, Status */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-extrabold px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                          {v.operationCode}
                        </span>
                        <span className="font-mono text-xs font-bold text-muted-foreground">
                          {v.reportNumber}
                        </span>
                      </div>

                      <Badge className={`text-[10px] font-bold px-2 py-0.5 ${readiness.color}`}>
                        {readiness.label}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-foreground text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {v.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{v.authority}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Info: Location & Engineers */}
                  <div className="space-y-2 p-3 bg-muted/30 rounded-xl border border-border/60 text-xs">
                    <div className="flex items-start gap-1.5 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 text-foreground font-medium">{v.location}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                      <span className="flex items-center gap-1 font-bold text-foreground">
                        <HardHat className="h-3.5 w-3.5 text-amber-500" />
                        <span>{v.employeeName}</span>
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground font-mono">
                        <Calendar className="h-3 w-3" />
                        <span>{v.visitDate}</span>
                      </span>
                    </div>
                  </div>

                  {/* Findings Snippet */}
                  {v.findings && (
                    <div className="text-xs text-muted-foreground line-clamp-2 bg-blue-500/5 p-2.5 rounded-xl border border-blue-500/15">
                      <strong className="text-blue-600 block mb-0.5 font-bold">النتائج الفنية:</strong>
                      {v.findings}
                    </div>
                  )}

                  {/* Card Bottom: Expenses & Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    <div className="text-xs">
                      <span className="text-[10px] text-muted-foreground block font-bold">بدل الانتقال:</span>
                      <span className="font-mono font-black text-foreground">
                        {formatCurrency(v.expenses)}
                      </span>
                      {v.isPaid ? (
                        <span className="text-[10px] text-emerald-600 font-bold mr-1">تم الصرف ✓</span>
                      ) : (
                        <span className="text-[10px] text-amber-600 font-bold mr-1">قيد الصرف</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDossier(v)}
                        className="h-8 w-8 rounded-lg hover:bg-blue-500/10 text-muted-foreground hover:text-blue-600 cursor-pointer"
                        title="عرض محضر المعاينة الفني"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(v)}
                        className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-amber-600 cursor-pointer"
                        title="تعديل"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDelete(v)}
                        className="h-8 w-8 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ━━━ Table View ━━━ */}
      {viewMode === "TABLE" && (
        <div className="glass-card rounded-2xl border border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold">
                <tr>
                  <th className="p-3.5">الرقم المرجعي</th>
                  <th className="p-3.5">العملية والجهة</th>
                  <th className="p-3.5">الموقع الفعلي</th>
                  <th className="p-3.5">مهندس الموقع</th>
                  <th className="p-3.5">تاريخ الزيارة</th>
                  <th className="p-3.5">جاهزية الموقع</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5">المصروفات</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-muted-foreground">
                      لا توجد محاضر معاينات مسجلة لشركة ({currentCompany?.name || selectedCompany}) مطابقة لمعايير البحث.
                    </td>
                  </tr>
                ) : (
                  filtered.map((v) => {
                    const readiness = getReadinessBadge(v.siteReadiness);
                    return (
                      <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-blue-600">
                          {v.reportNumber}
                        </td>
                        <td className="p-3.5 max-w-[220px]">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Badge variant="outline" className="font-mono text-[10px] text-blue-600">
                              {v.operationCode}
                            </Badge>
                            <span className="font-extrabold text-foreground truncate">{v.title}</span>
                          </div>
                          <span className="text-[11px] text-muted-foreground truncate block">{v.authority}</span>
                        </td>
                        <td className="p-3.5 max-w-[200px] text-muted-foreground font-medium truncate">
                          {v.location}
                        </td>
                        <td className="p-3.5 font-bold text-foreground">
                          {v.employeeName}
                        </td>
                        <td className="p-3.5 font-mono text-muted-foreground">
                          {v.visitDate}
                        </td>
                        <td className="p-3.5">
                          <Badge className={`text-[10px] font-bold px-2 py-0.5 ${readiness.color}`}>
                            {readiness.label}
                          </Badge>
                        </td>
                        <td className="p-3.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              v.status === "COMPLETED"
                                ? "border-emerald-500/30 text-emerald-600"
                                : v.status === "IN_PROGRESS"
                                ? "border-blue-500/30 text-blue-600"
                                : "border-amber-500/30 text-amber-600"
                            }`}
                          >
                            {v.status === "COMPLETED"
                              ? "مكتملة"
                              : v.status === "IN_PROGRESS"
                              ? "جارية"
                              : "مجدولة"}
                          </Badge>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-foreground">
                          {formatCurrency(v.expenses)}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDossier(v)}
                              className="h-8 w-8 rounded-lg hover:bg-blue-500/10 text-muted-foreground hover:text-blue-600 cursor-pointer"
                              title="عرض تفاصيل المحضر"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(v)}
                              className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-amber-600 cursor-pointer"
                              title="تعديل"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDelete(v)}
                              className="h-8 w-8 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: عرض محضر المعاينة الفني المعتمد (View Details — STRICTLY NO PRINT BUTTON)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {mounted && dossierModalOpen && activeVisit && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="relative w-full max-w-2xl bg-card dark:bg-[#0c1427] rounded-3xl border border-border shadow-2xl flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden animate-scale-up my-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border bg-card dark:bg-[#0c1427] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-foreground">
                      محضر إثبات حالة ومعاينة موقع معتمد
                    </h3>
                    <Badge variant="outline" className="font-mono text-blue-600 border-blue-500/30">
                      {activeVisit.reportNumber}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">كود العملية: {activeVisit.operationCode}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDossierModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded-xl hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4 text-xs">
              {/* Site Readiness Banner */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-muted-foreground">تقييم جاهزية الموقع الفنية:</span>
                  <Badge className={`text-xs font-bold px-3 py-1 ${getReadinessBadge(activeVisit.siteReadiness).color}`}>
                    {getReadinessBadge(activeVisit.siteReadiness).label}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
                  <div>
                    <span className="text-muted-foreground font-bold block">جهة الإسناد والمالك:</span>
                    <span className="font-extrabold text-foreground">{activeVisit.authority}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-bold block">تاريخ إجراء المعاينة:</span>
                    <span className="font-mono font-bold text-foreground">{activeVisit.visitDate}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50">
                  <span className="text-muted-foreground font-bold block">الموقع الميداني الدقيق:</span>
                  <div className="flex items-start gap-1.5 mt-0.5 text-foreground font-semibold">
                    <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>{activeVisit.location}</span>
                  </div>
                </div>
              </div>

              {/* Committee & Engineers */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span>اللجنة الهندسية والقائمون بالمعاينة</span>
                </div>
                <div className="space-y-1.5 text-muted-foreground pr-5">
                  <div>
                    <strong className="text-foreground">مهندس الموقع المسؤول: </strong>
                    <span>{activeVisit.employeeName}</span>
                  </div>
                  {activeVisit.committeeMembers && (
                    <div>
                      <strong className="text-foreground">أعضاء اللجنة وممثلو الجهة: </strong>
                      <span>{activeVisit.committeeMembers}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Scope & Purpose */}
              {activeVisit.purpose && (
                <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-1">
                  <span className="font-bold text-foreground block">موضوع ونطاق المعاينة:</span>
                  <p className="text-muted-foreground leading-relaxed">{activeVisit.purpose}</p>
                </div>
              )}

              {/* Technical Findings */}
              {activeVisit.findings && (
                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-1">
                  <span className="font-bold text-blue-600 block flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" />
                    <span>الملاحظات الفنية والمطابقة الواقعية</span>
                  </span>
                  <p className="text-foreground leading-relaxed">{activeVisit.findings}</p>
                </div>
              )}

              {/* Obstacles & Recommendations */}
              {activeVisit.obstacles && (
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                  <span className="font-bold text-amber-600 block flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    <span>المعوقات والملاحظات الحرجة</span>
                  </span>
                  <p className="text-foreground leading-relaxed">{activeVisit.obstacles}</p>
                </div>
              )}

              {/* Safety & Logistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeVisit.safetyPermits && (
                  <div className="p-3.5 bg-muted/30 rounded-xl border border-border space-y-1">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-emerald-600" />
                      <span>السلامة وتصاريح الدخول</span>
                    </span>
                    <p className="text-[11px] text-muted-foreground">{activeVisit.safetyPermits}</p>
                  </div>
                )}

                <div className="p-3.5 bg-muted/30 rounded-xl border border-border space-y-1">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-purple-600" />
                    <span>بدلات المعاينة الميدانية</span>
                  </span>
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-foreground">
                    <span>القيمة: {formatCurrency(activeVisit.expenses)}</span>
                    <span className={activeVisit.isPaid ? "text-emerald-600" : "text-amber-600"}>
                      {activeVisit.isPaid ? "تم الصرف" : "قيد الصرف"}
                    </span>
                  </div>
                </div>
              </div>

              {activeVisit.notes && (
                <div className="p-3 rounded-xl bg-muted/20 border border-border/50 text-muted-foreground text-[11px]">
                  <strong className="text-foreground block mb-0.5">ملاحظات تكميلية:</strong>
                  <p>{activeVisit.notes}</p>
                </div>
              )}
            </div>

            {/* Footer — STRICTLY NO PRINT BUTTON! */}
            <div className="px-5 sm:px-6 py-3.5 border-t border-border bg-muted/40 flex items-center justify-end gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDossierModalOpen(false)}
                className="text-xs border-border px-5 rounded-xl cursor-pointer"
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: تسجيل محضر معاينة وزيارة موقع جديدة (Create Visit)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {mounted && createModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="relative w-full max-w-xl bg-card dark:bg-[#0c1427] rounded-3xl border border-border shadow-2xl flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden animate-scale-up my-auto">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border bg-card dark:bg-[#0c1427] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">تسجيل محضر معاينة موقع جديدة</h3>
                  <p className="text-xs text-muted-foreground">توثيق الزيارة الميدانية وفحص جاهزية الموقع</p>
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
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-foreground mb-1">عنوان وموضوع المعاينة *</label>
                    <Input
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="مثال: معاينة مسارات شبكة كابلات الجهد المتوسط ومحيط المحطة..."
                      className="bg-muted/40 border-border text-foreground focus:border-blue-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">كود العملية المرتبطة *</label>
                    <Input
                      required
                      value={formOpCode}
                      onChange={(e) => setFormOpCode(e.target.value)}
                      placeholder="مثال: A15"
                      className="bg-muted/40 border-border text-foreground font-mono focus:border-blue-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">الجهة المالكة للطرح *</label>
                    <Input
                      required
                      value={formAuthority}
                      onChange={(e) => setFormAuthority(e.target.value)}
                      placeholder="مثال: هيئة المجتمعات العمرانية"
                      className="bg-muted/40 border-border text-foreground focus:border-blue-500 rounded-xl h-9"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-foreground mb-1">موقع المعاينة الميداني الدقيق *</label>
                    <Input
                      required
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder="المدينة، الحي، رقم المبنى أو القطعة..."
                      className="bg-muted/40 border-border text-foreground focus:border-blue-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">مهندس الموقع المسؤول *</label>
                    <Input
                      required
                      value={formEmployee}
                      onChange={(e) => setFormEmployee(e.target.value)}
                      placeholder="م. أحمد الشريف"
                      className="bg-muted/40 border-border text-foreground focus:border-blue-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">تاريخ المعاينة *</label>
                    <Input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="bg-muted/40 border-border text-foreground font-mono focus:border-blue-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">تقييم جاهزية الموقع الفنية</label>
                    <select
                      value={formSiteReadiness}
                      onChange={(e) => setFormSiteReadiness(e.target.value as any)}
                      className="w-full h-9 px-3 bg-muted/40 border border-border rounded-xl text-foreground font-semibold focus:outline-hidden focus:border-blue-500 cursor-pointer"
                    >
                      <option value="READY">جاهز للتنفيذ الفوري 100% 🟢</option>
                      <option value="CONDITIONAL">جاهز بشروط وملاحظات 🟡</option>
                      <option value="BLOCKED">معوقات تعيق البدء 🔴</option>
                      <option value="SURVEY_ONLY">معاينة ورفع مقاسات 🔵</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">حالة المعاينة</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full h-9 px-3 bg-muted/40 border border-border rounded-xl text-foreground font-semibold focus:outline-hidden focus:border-blue-500 cursor-pointer"
                    >
                      <option value="SCHEDULED">مجدولة 📅</option>
                      <option value="IN_PROGRESS">جارية ⚡</option>
                      <option value="COMPLETED">مكتملة معتمدة ✅</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-foreground mb-1">أعضاء لجنة المعاينة وممثلو الجهة</label>
                    <Input
                      value={formCommittee}
                      onChange={(e) => setFormCommittee(e.target.value)}
                      placeholder="مهندس الاستشاري، فني المساحة، مندوب إدارة الصيانة..."
                      className="bg-muted/40 border-border text-foreground focus:border-blue-500 rounded-xl h-9"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-foreground mb-1">الغرض الفني ومحاور الفحص</label>
                    <Input
                      value={formPurpose}
                      onChange={(e) => setFormPurpose(e.target.value)}
                      placeholder="مطابقة مسارات الحفر مع كراسة الشروط ورفع الإحداثيات..."
                      className="bg-muted/40 border-border text-foreground focus:border-blue-500 rounded-xl h-9"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-foreground mb-1">النتائج الفنية الواقعية</label>
                    <textarea
                      rows={2}
                      value={formFindings}
                      onChange={(e) => setFormFindings(e.target.value)}
                      placeholder="تفاصيل ما تم رصده في الموقع الميداني..."
                      className="w-full p-2.5 bg-muted/40 border border-border text-foreground focus:border-blue-500 rounded-xl focus:outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-foreground mb-1">المعوقات والملاحظات الحرجة (إن وجدت)</label>
                    <Input
                      value={formObstacles}
                      onChange={(e) => setFormObstacles(e.target.value)}
                      placeholder="تراكم مياه، كابلات قديمة، عوائق تحتاج تنسيق..."
                      className="bg-muted/40 border-border text-foreground focus:border-blue-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">بدل ومصروفات المعاينة (ج.م)</label>
                    <Input
                      type="number"
                      value={formExpenses}
                      onChange={(e) => setFormExpenses(e.target.value)}
                      placeholder="0"
                      className="bg-muted/40 border-border text-foreground font-mono focus:border-blue-500 rounded-xl h-9"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="createPaid"
                      checked={formIsPaid}
                      onChange={(e) => setFormIsPaid(e.target.checked)}
                      className="rounded border-border text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                    />
                    <label htmlFor="createPaid" className="font-bold text-foreground cursor-pointer select-none">
                      تم صرف بدلات الانتقال للمهندس
                    </label>
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
                  {submitting ? "جاري الحفظ..." : "حفظ محضر المعاينة"}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: تعديل بيانات المعاينة (Edit Visit)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {mounted && editModalOpen && activeVisit && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="relative w-full max-w-xl bg-card dark:bg-[#0c1427] rounded-3xl border border-border shadow-2xl flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden animate-scale-up my-auto">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border bg-card dark:bg-[#0c1427] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Edit className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">تعديل محضر المعاينة</h3>
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
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-foreground mb-1">عنوان وموضوع المعاينة *</label>
                    <Input
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="bg-muted/40 border-border text-foreground focus:border-amber-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">كود العملية المرتبطة *</label>
                    <Input
                      required
                      value={formOpCode}
                      onChange={(e) => setFormOpCode(e.target.value)}
                      className="bg-muted/40 border-border text-foreground font-mono focus:border-amber-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">الجهة المالكة للطرح *</label>
                    <Input
                      required
                      value={formAuthority}
                      onChange={(e) => setFormAuthority(e.target.value)}
                      className="bg-muted/40 border-border text-foreground focus:border-amber-500 rounded-xl h-9"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-foreground mb-1">موقع المعاينة الميداني الدقيق *</label>
                    <Input
                      required
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      className="bg-muted/40 border-border text-foreground focus:border-amber-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">مهندس الموقع المسؤول *</label>
                    <Input
                      required
                      value={formEmployee}
                      onChange={(e) => setFormEmployee(e.target.value)}
                      className="bg-muted/40 border-border text-foreground focus:border-amber-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">تاريخ المعاينة *</label>
                    <Input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="bg-muted/40 border-border text-foreground font-mono focus:border-amber-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">تقييم جاهزية الموقع الفنية</label>
                    <select
                      value={formSiteReadiness}
                      onChange={(e) => setFormSiteReadiness(e.target.value as any)}
                      className="w-full h-9 px-3 bg-muted/40 border border-border rounded-xl text-foreground font-semibold focus:outline-hidden focus:border-amber-500 cursor-pointer"
                    >
                      <option value="READY">جاهز للتنفيذ الفوري 100% 🟢</option>
                      <option value="CONDITIONAL">جاهز بشروط وملاحظات 🟡</option>
                      <option value="BLOCKED">معوقات تعيق البدء 🔴</option>
                      <option value="SURVEY_ONLY">معاينة ورفع مقاسات 🔵</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">حالة المعاينة</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full h-9 px-3 bg-muted/40 border border-border rounded-xl text-foreground font-semibold focus:outline-hidden focus:border-amber-500 cursor-pointer"
                    >
                      <option value="SCHEDULED">مجدولة 📅</option>
                      <option value="IN_PROGRESS">جارية ⚡</option>
                      <option value="COMPLETED">مكتملة معتمدة ✅</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-foreground mb-1">أعضاء لجنة المعاينة</label>
                    <Input
                      value={formCommittee}
                      onChange={(e) => setFormCommittee(e.target.value)}
                      className="bg-muted/40 border-border text-foreground focus:border-amber-500 rounded-xl h-9"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-foreground mb-1">النتائج الفنية الواقعية</label>
                    <textarea
                      rows={2}
                      value={formFindings}
                      onChange={(e) => setFormFindings(e.target.value)}
                      className="w-full p-2.5 bg-muted/40 border border-border text-foreground focus:border-amber-500 rounded-xl focus:outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-foreground mb-1">المعوقات والملاحظات الحرجة</label>
                    <Input
                      value={formObstacles}
                      onChange={(e) => setFormObstacles(e.target.value)}
                      className="bg-muted/40 border-border text-foreground focus:border-amber-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">بدل ومصروفات المعاينة (ج.م)</label>
                    <Input
                      type="number"
                      value={formExpenses}
                      onChange={(e) => setFormExpenses(e.target.value)}
                      className="bg-muted/40 border-border text-foreground font-mono focus:border-amber-500 rounded-xl h-9"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="editPaid"
                      checked={formIsPaid}
                      onChange={(e) => setFormIsPaid(e.target.checked)}
                      className="rounded border-border text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                    />
                    <label htmlFor="editPaid" className="font-bold text-foreground cursor-pointer select-none">
                      تم صرف بدلات الانتقال
                    </label>
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
                  {submitting ? "جاري التحديث..." : "تحديث محضر المعاينة"}
                </Button>
              </div>
            </form>
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
                هل أنت متأكد من حذف محضر المعاينة رقم{" "}
                <strong className="text-foreground">{activeVisit.reportNumber}</strong> للعملية{" "}
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
