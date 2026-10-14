"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Settings, Save, Loader2, Shield, Bell, Percent, Scale,
  Lock, CheckCircle2, Sliders, RefreshCw, Building2,
  Globe2, Check, AlertCircle, Info, Sparkles, Search,
  X, Landmark, FileText, Phone, Mail, MapPin, Hash,
  Clock, ShieldCheck, ChevronRight, ChevronLeft, RotateCcw, ArrowRight,
  Calendar, AlertTriangle, Timer, Hourglass, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";
import { useCompany } from "@/context/company-context";

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  label: string | null;
  type: string;
  group: string | null;
  updatedAt?: string;
}

interface CompanyItem {
  id: string;
  name: string;
  code: string;
  commercialRegister: string | null;
  taxCard: string | null;
  license: string | null;
  address: string | null;
  email: string | null;
  fax: string | null;
  bankName: string | null;
  bankBranch: string | null;
  bankAccountNumber: string | null;
  isActive: boolean;
}

// Detailed Arabic explanations and units for each setting key
const SETTING_DETAILS: Record<
  string,
  { label: string; description: string; unit?: string; type: "number" | "string" | "boolean" | "list"; group: string }
> = {
  // 1. الإعدادات العامة
  system_name: {
    label: "اسم المنظومة الرسمي",
    description: "الاسم المعتمد الذي يظهر في ترويسة التقارير، مذكرات العطاءات، والمستندات الرسمية الصادرة.",
    type: "string",
    group: "general",
  },
  default_currency: {
    label: "العملة الرسمية المعتمدة بالمنظومة",
    description: "عملة التسعير واحتساب الضرائب وخطابات الضمان والمستخلصات في كافة العمليات المالية.",
    type: "string",
    group: "general",
  },
  fiscal_year_start: {
    label: "تاريخ بداية السنة المالية الرسمية",
    description: "تاريخ بدء الدورة المحاسبية السنوية لاعتماد الموازنات وإقفال الحسابات (شهر-يوم).",
    type: "string",
    group: "general",
  },

  // 2. الضرائب والرسوم المالية
  vat_rate: {
    label: "نسبة ضريبة القيمة المضافة",
    description: "تطبق آلياً على كراسات الشروط، فواتير المشتريات، وتوريدات العقود وفقاً للقانون 67 لسنة 2016.",
    unit: "٪",
    type: "number",
    group: "tax",
  },
  tax_deduction_rate: {
    label: "نسبة الخصم والتحصيل من المنبع (أ.ت.ص)",
    description: "نسبة الأرباح التجارية والصناعية المستقطعة نظامياً من مستحقات الموردين ومقاولي الباطن.",
    unit: "٪",
    type: "number",
    group: "tax",
  },
  performance_bond_rate: {
    label: "نسبة ضمان الأعمال المحتجزة من المستخلصات",
    description: "النسبة المحتجزة قانونياً من كل مستخلص جاري لحين إتمام الاستلام النهائي للمشروع.",
    unit: "٪",
    type: "number",
    group: "tax",
  },

  // 3. خطابات الضمان والتأمينات البنكية
  initial_guarantee_rate: {
    label: "نسبة التأمين الابتدائي لدخول المناقصات",
    description: "النسبة التقديرية المعتمدة لاحتساب قيمة خطاب الضمان الابتدائي المطلوب تقديمه بالعطاء الفني.",
    unit: "٪",
    type: "number",
    group: "guarantees",
  },
  initial_guarantee_duration: {
    label: "المدة القياسية لسريان التأمين الابتدائي",
    description: "مدة صلاحية خطاب الضمان البنكي الصادر لدخول العملية لحين انتهاء البت الفني والمالي.",
    unit: "يوم",
    type: "number",
    group: "guarantees",
  },
  final_guarantee_rate: {
    label: "نسبة التأمين النهائي وحسن التنفيذ",
    description: "النسبة المطلوبة عند الترسية لإصدار خطاب ضمان حسن التنفيذ لضمان إتمام بنود العقد.",
    unit: "٪",
    type: "number",
    group: "guarantees",
  },
  insurance_recovery_days: {
    label: "المدة النظامية لاسترداد التأمين بعد الاستلام",
    description: "المهلة المحددة لمخاطبة الجهة الإدارية واسترداد أصل خطاب الضمان بعد محضر الاستلام الابتدائي.",
    unit: "يوم",
    type: "number",
    group: "guarantees",
  },

  // 4. رادار المناقصات والربط الذكي
  "radar.daily_scan_enabled": {
    label: "تفعيل الفحص اليومي التلقائي لرادار المناقصات",
    description: "تشغيل محرك الرادار آلياً في موعد ثابت يومياً لسحب أحدث المناقصات المطروحة بالبوابة الحكومية.",
    type: "boolean",
    group: "radar",
  },
  "radar.daily_scan_time": {
    label: "التوقيت اليومي المجدول للفحص التلقائي",
    description: "الميعاد الرسمي اليومي الذي يبدأ فيه خادم الرادار فحص بوابة العمليات الحكومية ومزامنتها.",
    type: "string",
    group: "radar",
  },
  "radar.incremental_mode": {
    label: "نظام الفحص التراكمي الذكي (منع التكرار)",
    description: "فحص العمليات الجديدة فقط وتجاهل المناقصات المسحوبة مسبقاً لتوفير الموارد ومنع التكرار.",
    type: "boolean",
    group: "radar",
  },

  // 5. التنبيهات والإشعارات الذكية
  guarantee_reminder_days: {
    label: "مراحل وأيام التنبيه قبل انتهاء خطاب الضمان",
    description: "جدول الإشعارات الدورية الاستباقية لإدارة الحسابات لتجديد أو استرداد خطابات الضمان قبل مصادرتها.",
    unit: "يوم",
    type: "list",
    group: "notifications",
  },
  deadline_reminder_hours: {
    label: "ساعات التنبيه الاستباقي قبل موعد فتح المظاريف",
    description: "مواعيد الإشعارات العاجلة لفريق العطاءات لتسليم المظاريف الفنية والمالية قبل غلق الباب رسمياً.",
    unit: "ساعة",
    type: "list",
    group: "notifications",
  },
  system_notifications_enabled: {
    label: "تفعيل نظام التنبيهات والإشعارات الفورية بالمنظومة",
    description: "إظهار جرس التنبيهات المباشرة والتنبيهات المنبثقة لمديري المشروعات والحسابات.",
    type: "boolean",
    group: "notifications",
  },

  // 6. المدد القانونية والتظلمات الرسمية
  grievance_authority_days: {
    label: "مهلة التظلم للسلطة المختصة بالجهة الإدارية",
    description: "المدة القانونية لتقديم التظلم المباشر للوزير أو رئيس الجهة ضد قرارات الاستبعاد الفني والمالي.",
    unit: "يوم",
    type: "number",
    group: "legal",
  },
  grievance_tribunal_days: {
    label: "مهلة التقدم للجنة ترجيح التظلمات بالهيئة",
    description: "المهلة المحددة للجوء لمكتب ترجيح التظلمات بالهيئة العامة للخدمات الحكومية وفق القانون 182.",
    unit: "يوم",
    type: "number",
    group: "legal",
  },

  // 7. الأمان وحماية الجلسات والسرية
  account_lock_attempts: {
    label: "محاولات تسجيل الدخول الخاطئة قبل قفل الحساب",
    description: "حماية المنظومة من محاولات التخمين والاختراق بقفل الحساب مؤقتاً عند تجاوز هذا العدد.",
    unit: "محاولات",
    type: "number",
    group: "security",
  },
  session_timeout_minutes: {
    label: "مهلة إنهاء الجلسة التلقائية عند الخمول",
    description: "تسجيل الخروج التلقائي لحماية سرية البيانات في حال ترك الجهاز مفتوحاً دون نشاط.",
    unit: "دقيقة",
    type: "number",
    group: "security",
  },
  records_retention_years: {
    label: "الحد الأدنى لحفظ وأرشفة سجلات العمليات",
    description: "مدة الاحتفاظ الإلزامي بالسجلات المالية والتعاقدية لأغراض التدقيق الرقابي والمحاسبي.",
    unit: "سنوات",
    type: "number",
    group: "security",
  },
  after_hours_start: {
    label: "بداية ساعات الحظر المسائي للعمليات الحساسة",
    description: "توقيت بداية التحذير والتدقيق المشدد على الإجراءات المالية الكبرى المنفذة ليلاً.",
    unit: "ساعة (24h)",
    type: "number",
    group: "security",
  },
  after_hours_end: {
    label: "نهاية ساعات الحظر الصباحي للعمليات الحساسة",
    description: "توقيت انتهاء القيود المسائية وبدء ساعات العمل المعتمدة بالمنظومة.",
    unit: "ساعة (24h)",
    type: "number",
    group: "security",
  },
};

// Preset Scan Times for the Radar Time Picker
const RADAR_TIME_PRESETS = [
  { value: "06:00 ص", label: "06:00 ص (الصباح الباكر)" },
  { value: "08:00 ص", label: "08:00 ص (بداية الدوام)" },
  { value: "09:00 ص", label: "09:00 ص (الميعاد القياسي)" },
  { value: "10:00 ص", label: "10:00 ص (منتصف الصباح)" },
  { value: "12:00 م", label: "12:00 م (ظهراً)" },
  { value: "02:00 م", label: "02:00 م (بعد الظهر)" },
  { value: "05:00 م", label: "05:00 م (نهاية الدوام)" },
  { value: "08:00 م", label: "08:00 م (مساءً)" },
];

// Presets for Deadline Reminders (hours)
const DEADLINE_HOUR_PRESETS = [
  { hours: "72", label: "قبل 72 ساعة (3 أيام)", desc: "تجهيز أولي للعطاء ومراجعة بنود الكراسة" },
  { hours: "48", label: "قبل 48 ساعة (يومين)", desc: "بدء طباعة وتوقيع المظاريف الفنية والمالية" },
  { hours: "24", label: "قبل 24 ساعة (يوم واحد)", desc: "تسليم المظاريف لمقر الجهة الإدارية قبل الغلق" },
  { hours: "12", label: "قبل 12 ساعة (نصف يوم)", desc: "تنبيه طارئ نهائي لحضور جلسة فتح المظاريف" },
];

// Presets for Guarantee Reminders (days)
const GUARANTEE_DAY_PRESETS = [
  { days: "60", label: "قبل 60 يوماً (شهرين)", desc: "إشعار مبكر لمراجعة موقف المستخلصات والعملية" },
  { days: "30", label: "قبل 30 يوماً (شهر)", desc: "مخاطبة البنك والبدء في إجراءات التمديد أو الاسترداد" },
  { days: "15", label: "قبل 15 يوماً (أسبوعين)", desc: "متابعة موافقة الجهة الإدارية الرسمية على تجديد الصلاحية" },
  { days: "10", label: "قبل 10 أيام (تحذيري)", desc: "إشعار للإدارة المالية ومدير المشروعات بقرب الانتهاء" },
  { days: "5", label: "قبل 5 أيام (حرج وطارئ)", desc: "إجراء عاجل وفوري لتفادي مصادرة خطاب الضمان البنكي" },
];

export default function SettingsPage() {
  const { currentCompany, selectedCompany } = useCompany();
  const isCompanyScoped = Boolean(selectedCompany && selectedCompany !== "ALL");

  // State
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [initialSettingsMap, setInitialSettingsMap] = useState<Record<string, string>>({});
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [initialCompaniesMap, setInitialCompaniesMap] = useState<Record<string, CompanyItem>>({});
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("companies");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Track Unsaved Changes
  const [dirtySettingKeys, setDirtySettingKeys] = useState<Set<string>>(new Set());
  const [dirtyCompanyIds, setDirtyCompanyIds] = useState<Set<string>>(new Set());

  // Load All Data on Mount
  useEffect(() => {
    loadAllData();
  }, []);

  // Sync selectedCompanyId if company scope changes
  useEffect(() => {
    if (isCompanyScoped && companies.length > 0) {
      const match = companies.find((c) => c.code === selectedCompany);
      if (match && selectedCompanyId !== match.id) {
        setSelectedCompanyId(match.id);
      }
    }
  }, [isCompanyScoped, selectedCompany, companies, selectedCompanyId]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [settingsRes, companiesRes] = await Promise.all([
        api.get("/settings"),
        api.get("/companies").catch(() => ({ data: [] })),
      ]);

      if (Array.isArray(settingsRes.data)) {
        setSettings(settingsRes.data);
        const map: Record<string, string> = {};
        settingsRes.data.forEach((s: SystemSetting) => {
          map[s.key] = s.value;
        });
        setInitialSettingsMap(map);
      }

      if (Array.isArray(companiesRes.data) && companiesRes.data.length > 0) {
        setCompanies(companiesRes.data);
        const matchedScoped = isCompanyScoped
          ? companiesRes.data.find((c: CompanyItem) => c.code === selectedCompany)
          : null;
        setSelectedCompanyId(matchedScoped ? matchedScoped.id : companiesRes.data[0].id);

        const compMap: Record<string, CompanyItem> = {};
        companiesRes.data.forEach((c: CompanyItem) => {
          compMap[c.id] = { ...c };
        });
        setInitialCompaniesMap(compMap);
      }
    } catch (err: any) {
      toast.error("فشل تحميل بيانات الإعدادات من الخادم");
    } finally {
      setLoading(false);
    }
  };

  // Update Setting Value
  const handleSettingChange = (key: string, newValue: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value: newValue } : s))
    );

    setDirtySettingKeys((prev) => {
      const next = new Set(prev);
      if (initialSettingsMap[key] !== newValue) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  // Helper for toggling a number in a comma-separated list
  const handleToggleListValue = (key: string, currentVal: string, targetNum: string) => {
    const list = currentVal
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    let nextList: string[];
    if (list.includes(targetNum)) {
      nextList = list.filter((x) => x !== targetNum);
    } else {
      nextList = [...list, targetNum];
    }

    // Sort numbers descending
    nextList.sort((a, b) => Number(b) - Number(a));
    const nextVal = nextList.join(",");
    handleSettingChange(key, nextVal);
  };

  // Convert 24h Time to Arabic Display Time (e.g. "17:00" -> "05:00 م")
  const convert24ToArabic = (time24: string) => {
    if (!time24) return "09:00 ص";
    const [hStr, mStr] = time24.split(":");
    let h = parseInt(hStr, 10);
    const m = mStr || "00";
    const isPM = h >= 12;
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    const padH = String(h).padStart(2, "0");
    return `${padH}:${m} ${isPM ? "م" : "ص"}`;
  };

  // Convert Arabic Display Time to 24h (e.g. "05:00 م" -> "17:00")
  const convertArabicTo24 = (arabicTime: string) => {
    if (!arabicTime) return "09:00";
    const isPM = arabicTime.includes("م");
    const clean = arabicTime.replace(/[^\d:]/g, "").trim();
    const [hStr, mStr] = clean.split(":");
    let h = parseInt(hStr, 10) || 9;
    const m = mStr || "00";
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${m}`;
  };

  // Update Company Field
  const handleCompanyFieldChange = (companyId: string, field: keyof CompanyItem, value: string) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === companyId ? { ...c, [field]: value } : c))
    );

    setDirtyCompanyIds((prev) => {
      const next = new Set(prev);
      next.add(companyId);
      return next;
    });
  };

  // Save Everything (Settings + Dirty Companies)
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const promises: Promise<any>[] = [];

      // 1. Save Settings if modified
      if (dirtySettingKeys.size > 0) {
        const payload = settings
          .filter((s) => dirtySettingKeys.has(s.key))
          .map((s) => ({
            key: s.key,
            value: s.value,
            label: SETTING_DETAILS[s.key]?.label || s.label || undefined,
            group: SETTING_DETAILS[s.key]?.group || s.group || undefined,
            type: SETTING_DETAILS[s.key]?.type || s.type || undefined,
          }));

        promises.push(api.patch("/settings", payload));
      }

      // 2. Save Companies if modified
      if (dirtyCompanyIds.size > 0) {
        dirtyCompanyIds.forEach((compId) => {
          const comp = companies.find((c) => c.id === compId);
          if (comp) {
            promises.push(
              api.patch(`/companies/${comp.id}`, {
                name: comp.name,
                commercialRegister: comp.commercialRegister,
                taxCard: comp.taxCard,
                license: comp.license,
                address: comp.address,
                email: comp.email,
                fax: comp.fax,
                bankName: comp.bankName,
                bankBranch: comp.bankBranch,
                bankAccountNumber: comp.bankAccountNumber,
              })
            );
          }
        });
      }

      await Promise.all(promises);

      // Re-sync initial maps
      const newSettingsMap: Record<string, string> = {};
      settings.forEach((s) => {
        newSettingsMap[s.key] = s.value;
      });
      setInitialSettingsMap(newSettingsMap);

      const newCompMap: Record<string, CompanyItem> = {};
      companies.forEach((c) => {
        newCompMap[c.id] = { ...c };
      });
      setInitialCompaniesMap(newCompMap);

      setDirtySettingKeys(new Set());
      setDirtyCompanyIds(new Set());

      toast.success("تم حفظ وتحديث إعدادات المنظومة وهوية الشركات بنجاح في قاعدة البيانات!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل حفظ التعديلات في خادم المنظومة");
    } finally {
      setIsSaving(false);
    }
  };

  // Revert All Changes
  const handleRevertChanges = () => {
    setSettings((prev) =>
      prev.map((s) => ({
        ...s,
        value: initialSettingsMap[s.key] !== undefined ? initialSettingsMap[s.key] : s.value,
      }))
    );
    setCompanies((prev) =>
      prev.map((c) =>
        initialCompaniesMap[c.id] ? { ...initialCompaniesMap[c.id] } : c
      )
    );
    setDirtySettingKeys(new Set());
    setDirtyCompanyIds(new Set());
    toast.info("تم التراجع عن كافة التعديلات غير المحفوظة");
  };

  // Categories Metadata
  const categories = [
    { id: "companies", label: "بيانات الشركات الأربعة", icon: Building2, count: companies.length },
    { id: "tax", label: "الضرائب والرسوم المالية", icon: Percent, count: 3 },
    { id: "guarantees", label: "التأمينات وخطابات الضمان", icon: Shield, count: 4 },
    { id: "radar", label: "رادار المناقصات والربط الذكي", icon: Globe2, count: 3 },
    { id: "notifications", label: "التنبيهات والمواعيد الحساسة", icon: Bell, count: 3 },
    { id: "legal", label: "المدد القانونية والتظلمات", icon: Scale, count: 2 },
    { id: "security", label: "الأمان وحماية الجلسات", icon: Lock, count: 5 },
    { id: "all", label: "كافة إعدادات المنظومة", icon: Sliders, count: settings.length },
  ];

  // Filtered Settings List
  const filteredSettings = useMemo(() => {
    return settings.filter((s) => {
      const meta = SETTING_DETAILS[s.key] || {
        label: s.label || s.key,
        description: "",
        group: s.group || "general",
      };

      // Category tab match
      if (activeCategoryTab !== "all" && activeCategoryTab !== "companies") {
        if (meta.group !== activeCategoryTab) return false;
      }

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLabel = (meta.label || "").toLowerCase().includes(q);
        const matchesDesc = (meta.description || "").toLowerCase().includes(q);
        const matchesVal = (s.value || "").toLowerCase().includes(q);
        if (!matchesLabel && !matchesDesc && !matchesVal) return false;
      }

      return true;
    });
  }, [settings, activeCategoryTab, searchQuery]);

  const activeCompany = useMemo(() => {
    return companies.find((c) => c.id === selectedCompanyId) || companies[0];
  }, [companies, selectedCompanyId]);

  const totalUnsavedCount = dirtySettingKeys.size + dirtyCompanyIds.size;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-28 max-w-6xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. Header Banner: Executive Luxury ERP Settings Banner                    */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl glass-card p-6 sm:p-8 border border-slate-700/80 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full badge-blue text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
              <span>لوحة التحكم المركزية • إعدادات المنظومة وهوية الشركات المعتمدة</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              إعدادات وقواعد النظام العامة
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              إدارة وتخصيص نسب الضرائب الرسمية، قواعد خطابات الضمان البنكية، محرك الفحص اليومي للرادار، والبيانات القانونية والبنكية للشركات الأربعة المعتمدة.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <Button
              onClick={handleSaveAll}
              disabled={isSaving || totalUnsavedCount === 0}
              className={`font-bold px-6 py-3.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm active:scale-95 transition-all cursor-pointer ${
                totalUnsavedCount > 0
                  ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-blue-500/25 border border-blue-400/30 scale-102"
                  : "bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60"
              }`}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isSaving ? "جاري الحفظ..." : "حفظ كافة التعديلات"}</span>
            </Button>
          </div>
        </div>

        {/* Quick System Telemetry Strip */}
        <div className="mt-6 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-foreground">قاعدة البيانات متصلة ومشفرة بالكامل</span>
            <span className="text-muted-foreground">•</span>
            <span>الشركات النشطة: {companies.length} شركات رسمية</span>
            <span className="text-muted-foreground">•</span>
            <span>إجمالي الإعدادات التشغيلية: {settings.length} قاعدة معتمدة</span>
          </div>

          {totalUnsavedCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-500 font-bold bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20 animate-pulse">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>يوجد {totalUnsavedCount} تعديلات غير محفوظة حالياً</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Category Navigation Tabs                                               */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategoryTab === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryTab(cat.id)}
              className={`px-4 py-2.5 rounded-2xl font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shadow-xs ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/25 scale-102"
                  : "bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{cat.label}</span>
              {cat.count !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {cat.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. Section Content: TAB 1 - Companies Hub (بيانات الشركات الأربعة)         */}
      {/* ========================================================================= */}
      {activeCategoryTab === "companies" && (
        <div className="space-y-5 animate-fade-in">
          {/* Company Selector Pills: If scoped to a specific company, ONLY show that company */}
          {isCompanyScoped ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-blue-600 text-white font-mono font-black text-lg flex items-center justify-center shadow-md shadow-blue-500/20">
                  {activeCompany?.code || selectedCompany}
                </span>
                <div>
                  <h4 className="font-extrabold text-foreground text-sm flex items-center gap-2">
                    <span>{activeCompany?.name || `شركة (${selectedCompany})`}</span>
                    <Badge className="badge-blue text-xs font-bold">الشركة المحددة</Badge>
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    أنت حالياً داخل نطاق عمل شركة ({selectedCompany}) فقط — تم عزل الإعدادات والوثائق لتقتصر على هذه الشركة
                  </p>
                </div>
              </div>

              <Link href="/dashboard/companies">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs font-bold border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 h-8 gap-1.5 cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>مستندات هذه الشركة</span>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {companies.map((comp) => {
                const isSelected = comp.id === selectedCompanyId;
                const isDirty = dirtyCompanyIds.has(comp.id);

                return (
                  <button
                    key={comp.id}
                    onClick={() => setSelectedCompanyId(comp.id)}
                    className={`p-4 rounded-2xl border text-right transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-3 ${
                      isSelected
                        ? "bg-gradient-to-br from-blue-600/15 via-indigo-600/10 to-transparent border-blue-500 shadow-lg shadow-blue-500/10"
                        : "glass-card hover:bg-muted/40 border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`w-9 h-9 rounded-xl font-mono font-black text-sm flex items-center justify-center ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                            : "bg-muted text-foreground border border-border"
                        }`}
                      >
                        {comp.code}
                      </span>

                      {isDirty && (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" title="تعديلات غير محفوظة" />
                      )}
                    </div>

                    <div>
                      <h4 className="font-extrabold text-foreground text-sm">{comp.name}</h4>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        شركة مستقلة بالمنظومة ({comp.code})
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Company Detailed Form */}
          {activeCompany && (
            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-border space-y-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black font-mono text-xl flex items-center justify-center shadow-md shadow-blue-500/20">
                    {activeCompany.code}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-foreground">
                      بيانات شركة: {activeCompany.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      المعلومات القانونية والبنكية المستخدمة في طباعة العطاءات وتوليد خطابات الضمان
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-border text-foreground text-xs font-mono font-bold">
                    كود: {activeCompany.code}
                  </Badge>
                  {dirtyCompanyIds.has(activeCompany.id) && (
                    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-bold">
                      تعديلات غير محفوظة
                    </Badge>
                  )}
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
                {/* 1. Name */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-blue-500" />
                    <span>اسم الشركة التجاري المعتمد</span>
                  </label>
                  <Input
                    value={activeCompany.name || ""}
                    onChange={(e) => handleCompanyFieldChange(activeCompany.id, "name", e.target.value)}
                    placeholder="مثال: شركة جولدن سرفيس للخدمات"
                    className="bg-muted/30 border-border text-foreground font-semibold rounded-xl text-xs h-10"
                  />
                </div>

                {/* 2. Commercial Register */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-emerald-500" />
                    <span>رقم السجل التجاري</span>
                  </label>
                  <Input
                    value={activeCompany.commercialRegister || ""}
                    onChange={(e) => handleCompanyFieldChange(activeCompany.id, "commercialRegister", e.target.value)}
                    placeholder="مثال: 124589"
                    className="bg-muted/30 border-border text-foreground font-mono font-semibold rounded-xl text-xs h-10"
                  />
                </div>

                {/* 3. Tax Card */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Percent className="h-3.5 w-3.5 text-amber-500" />
                    <span>رقم البطاقة الضريبية</span>
                  </label>
                  <Input
                    value={activeCompany.taxCard || ""}
                    onChange={(e) => handleCompanyFieldChange(activeCompany.id, "taxCard", e.target.value)}
                    placeholder="مثال: 654-321-987"
                    className="bg-muted/30 border-border text-foreground font-mono font-semibold rounded-xl text-xs h-10"
                  />
                </div>

                {/* 4. License */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-purple-500" />
                    <span>رقم رخصة مزاولة النشاط / القيد</span>
                  </label>
                  <Input
                    value={activeCompany.license || ""}
                    onChange={(e) => handleCompanyFieldChange(activeCompany.id, "license", e.target.value)}
                    placeholder="مثال: قيد اتحاد مقاولين رقم 7894"
                    className="bg-muted/30 border-border text-foreground font-semibold rounded-xl text-xs h-10"
                  />
                </div>

                {/* 5. Address */}
                <div className="space-y-1.5 lg:col-span-2">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-rose-500" />
                    <span>المقر الإداري والعنوان الرسمي المسجل</span>
                  </label>
                  <Input
                    value={activeCompany.address || ""}
                    onChange={(e) => handleCompanyFieldChange(activeCompany.id, "address", e.target.value)}
                    placeholder="مثال: القاهرة - التجمع الخامس - الحي الأول - مبنى 45"
                    className="bg-muted/30 border-border text-foreground font-semibold rounded-xl text-xs h-10"
                  />
                </div>

                {/* 6. Email */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-cyan-500" />
                    <span>البريد الإلكتروني الرسمي للمراسلات</span>
                  </label>
                  <Input
                    value={activeCompany.email || ""}
                    onChange={(e) => handleCompanyFieldChange(activeCompany.id, "email", e.target.value)}
                    placeholder="tender@company.com"
                    className="bg-muted/30 border-border text-foreground font-semibold rounded-xl text-xs h-10 text-left"
                    dir="ltr"
                  />
                </div>

                {/* 7. Phone / Fax */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-indigo-500" />
                    <span>رقم الهاتف المعتمد / الفاكس</span>
                  </label>
                  <Input
                    value={activeCompany.fax || ""}
                    onChange={(e) => handleCompanyFieldChange(activeCompany.id, "fax", e.target.value)}
                    placeholder="مثال: 0225896314"
                    className="bg-muted/30 border-border text-foreground font-mono font-semibold rounded-xl text-xs h-10"
                  />
                </div>

                {/* 8. Bank Name */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Landmark className="h-3.5 w-3.5 text-amber-500" />
                    <span>اسم البنك الرئيسي المتعامل معه</span>
                  </label>
                  <Input
                    value={activeCompany.bankName || ""}
                    onChange={(e) => handleCompanyFieldChange(activeCompany.id, "bankName", e.target.value)}
                    placeholder="مثال: البنك الأهلي المصري"
                    className="bg-muted/30 border-border text-foreground font-semibold rounded-xl text-xs h-10"
                  />
                </div>

                {/* 9. Bank Branch */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Landmark className="h-3.5 w-3.5 text-teal-500" />
                    <span>فرع البنك</span>
                  </label>
                  <Input
                    value={activeCompany.bankBranch || ""}
                    onChange={(e) => handleCompanyFieldChange(activeCompany.id, "bankBranch", e.target.value)}
                    placeholder="مثال: فرع المعادي"
                    className="bg-muted/30 border-border text-foreground font-semibold rounded-xl text-xs h-10"
                  />
                </div>

                {/* 10. Bank Account / IBAN */}
                <div className="space-y-1.5 lg:col-span-2">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-blue-500" />
                    <span>رقم الحساب البنكي / رقم الآيبان المعتمد (IBAN)</span>
                  </label>
                  <Input
                    value={activeCompany.bankAccountNumber || ""}
                    onChange={(e) => handleCompanyFieldChange(activeCompany.id, "bankAccountNumber", e.target.value)}
                    placeholder="مثال: EG380002000100000001234567890"
                    className="bg-muted/30 border-border text-foreground font-mono font-semibold rounded-xl text-xs h-10 text-left"
                    dir="ltr"
                  />
                </div>

                {/* 11. Official Company Documents Archive Box (طلب العميل: مستندات الشركة المحددة) */}
                <div className="md:col-span-2 lg:col-span-3 p-4.5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-blue-50/40 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-blue-950/20 border border-blue-200/80 dark:border-blue-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs mt-2">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-foreground flex items-center gap-2">
                        <span>أرشيف الوثائق والمستندات الرسمية لشركة ({activeCompany.name})</span>
                        <Badge className="badge-blue text-[11px] font-bold font-mono">{activeCompany.code}</Badge>
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        رفع ومعاينة السجل التجاري، البطاقة الضريبية، العقود، والتراخيص المعتمدة الخاصة بهذه الشركة حصراً
                      </p>
                    </div>
                  </div>

                  <Link href="/dashboard/companies">
                    <Button
                      type="button"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs h-9 px-4 cursor-pointer shadow-md shadow-blue-600/20 flex items-center gap-1.5 shrink-0"
                    >
                      <FileText className="h-4 w-4" />
                      <span>فتح أرشيف ومستندات الشركة</span>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. Section Content: Settings Cards Grid (الضرائب، الضمان، الرادار، الأمان)  */}
      {/* ========================================================================= */}
      {activeCategoryTab !== "companies" && (
        <div className="space-y-4">
          {/* Search box for Settings */}
          <div className="relative">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث في الإعدادات والقواعد (اسم الإعداد، الوصف، القيمة)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 pl-9 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-xs sm:text-sm h-11"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Cards List */}
          <div className="glass-card rounded-3xl p-5 sm:p-7 border border-border space-y-4 shadow-xl">
            {filteredSettings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-2">
                <Info className="h-10 w-10 text-muted-foreground/60 mx-auto" />
                <p className="font-bold text-sm text-foreground">لا توجد إعدادات مطابقة للبحث</p>
                <p className="text-xs">جرب كتابة مصطلح آخر أو اختر تبويب إعدادات مختلف أعلاه.</p>
              </div>
            ) : (
              filteredSettings.map((setting) => {
                const meta = SETTING_DETAILS[setting.key] || {
                  label: setting.label || setting.key,
                  description: "إعداد تشغيلي معتمد في قاعدة بيانات المنظومة.",
                  type: "string",
                  group: setting.group || "general",
                };

                const isModified = dirtySettingKeys.has(setting.key);
                const isBool = meta.type === "boolean" || setting.value === "true" || setting.value === "false";

                return (
                  <div
                    key={setting.id || setting.key}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col gap-4 ${
                      isModified
                        ? "bg-amber-500/5 border-amber-500/40 shadow-sm"
                        : "bg-muted/30 border-border hover:border-blue-500/30"
                    }`}
                  >
                    {/* Top Row: Title, Description & Main Input */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Setting Title & Explanation */}
                      <div className="space-y-1.5 flex-1 pr-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-foreground">
                            {meta.label}
                          </span>

                          {meta.unit && meta.type !== "list" && (
                            <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-bold font-mono">
                              الوحدة: {meta.unit}
                            </span>
                          )}

                          {isModified && (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                              معدل (غير محفوظ)
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {meta.description}
                        </p>
                      </div>

                      {/* Input Control tailored to Type */}
                      <div className="w-full md:w-64 shrink-0 flex items-center justify-end gap-2">
                        {/* 1. BOOLEAN TOGGLE */}
                        {isBool ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleSettingChange(
                                setting.key,
                                setting.value === "true" ? "false" : "true"
                              )
                            }
                            className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                              setting.value === "true"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                                : "bg-slate-500/10 text-slate-500 border-slate-500/20 hover:bg-slate-500/15"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                setting.value === "true" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                              }`}
                            />
                            <span>{setting.value === "true" ? "مفعل بالمنظومة" : "معطل مؤقتاً"}</span>
                          </button>

                        /* 2. RADAR DAILY SCAN TIME PICKER (Clock & Dropdown) */
                        ) : setting.key === "radar.daily_scan_time" ? (
                          <div className="w-full flex items-center gap-2">
                            {/* Standard Dropdown of Arabic Presets */}
                            <select
                              value={setting.value}
                              onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                              className="w-full bg-background border border-border text-foreground font-bold rounded-xl px-3 py-2 text-xs focus:border-blue-500 outline-none cursor-pointer"
                            >
                              {RADAR_TIME_PRESETS.map((p) => (
                                <option key={p.value} value={p.value}>
                                  {p.label}
                                </option>
                              ))}
                              {!RADAR_TIME_PRESETS.some((p) => p.value === setting.value) && (
                                <option value={setting.value}>
                                  {setting.value} (مخصص)
                                </option>
                              )}
                            </select>

                            {/* Native HTML5 Clock/Time Picker trigger */}
                            <div className="relative shrink-0" title="اختر من التقويم والساعة">
                              <input
                                type="time"
                                value={convertArabicTo24(setting.value)}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleSettingChange(setting.key, convert24ToArabic(e.target.value));
                                  }
                                }}
                                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 px-2.5 rounded-xl border-border bg-muted/40 pointer-events-none"
                              >
                                <Clock className="h-4 w-4 text-blue-500" />
                              </Button>
                            </div>
                          </div>

                        /* 3. FISCAL YEAR START DATE PICKER */
                        ) : setting.key === "fiscal_year_start" ? (
                          <div className="w-full flex items-center gap-2">
                            <select
                              value={setting.value}
                              onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                              className="w-full bg-background border border-border text-foreground font-bold rounded-xl px-3 py-2 text-xs focus:border-blue-500 outline-none cursor-pointer"
                            >
                              <option value="07-01">1 يوليو (بداية السنة المالية الحكومية)</option>
                              <option value="01-01">1 يناير (بداية السنة الميلادية)</option>
                              <option value="04-01">1 أبريل (الربع الثاني)</option>
                              <option value="10-01">1 أكتوبر (الربع الرابع)</option>
                            </select>
                            <Calendar className="h-4 w-4 text-emerald-500 shrink-0" />
                          </div>

                        /* 4. NUMERIC INPUT WITH FIRMLY ATTACHED UNIT BADGE */
                        ) : meta.type === "number" ? (
                          <div className="flex items-center rounded-xl border border-border bg-background focus-within:border-blue-500 shadow-2xs overflow-hidden h-10 w-full transition-all">
                            <input
                              type="number"
                              value={setting.value}
                              onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                              className="w-full h-full bg-transparent text-foreground font-mono font-bold text-center px-3 outline-none text-sm"
                            />
                            {meta.unit && (
                              <span className="px-3 py-2 bg-muted/60 text-muted-foreground font-bold text-xs border-r border-border shrink-0 select-none flex items-center justify-center min-w-[46px]">
                                {meta.unit}
                              </span>
                            )}
                          </div>

                        /* 5. GENERAL TEXT INPUT */
                        ) : (
                          <Input
                            type="text"
                            value={setting.value}
                            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                            className="bg-background border-border text-foreground font-semibold rounded-xl h-10 text-xs focus:border-blue-500 text-center"
                          />
                        )}
                      </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* CUSTOM EXPANDED VIEW: DEADLINE REMINDER HOURS (ساعات المظاريف)            */}
                    {/* ========================================================================= */}
                    {setting.key === "deadline_reminder_hours" && (
                      <div className="mt-2 pt-3 border-t border-border/70 space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            <Timer className="h-3.5 w-3.5 text-blue-500" />
                            <span>مراحل وساعات التنبيه النشطة حالياً (اضغط لاختيار أو إلغاء أي مرحلة):</span>
                          </span>
                          <span className="font-mono text-[11px] bg-muted px-2 py-0.5 rounded-md">
                            القيمة المخزنة: {setting.value} ساعة
                          </span>
                        </div>

                        {/* Interactive Preset Chips */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                          {DEADLINE_HOUR_PRESETS.map((preset) => {
                            const isSelected = setting.value
                              .split(",")
                              .map((x) => x.trim())
                              .includes(preset.hours);

                            return (
                              <button
                                key={preset.hours}
                                type="button"
                                onClick={() =>
                                  handleToggleListValue("deadline_reminder_hours", setting.value, preset.hours)
                                }
                                className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                                  isSelected
                                    ? "bg-blue-500/10 border-blue-500/40 text-foreground shadow-xs"
                                    : "bg-muted/20 border-border/80 text-muted-foreground hover:bg-muted/40"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs">{preset.label}</span>
                                  <span
                                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                                      isSelected
                                        ? "bg-blue-600 text-white"
                                        : "border border-border text-transparent"
                                    }`}
                                  >
                                    ✓
                                  </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground leading-tight">
                                  {preset.desc}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ========================================================================= */}
                    {/* CUSTOM EXPANDED VIEW: GUARANTEE REMINDER DAYS (أيام خطابات الضمان)        */}
                    {/* ========================================================================= */}
                    {setting.key === "guarantee_reminder_days" && (
                      <div className="mt-2 pt-3 border-t border-border/70 space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            <Hourglass className="h-3.5 w-3.5 text-amber-500" />
                            <span>مراحل التنبيه الاستباقي قبل انتهاء خطاب الضمان (اضغط لتفعيل أو إلغاء المرحلة):</span>
                          </span>
                          <span className="font-mono text-[11px] bg-muted px-2 py-0.5 rounded-md">
                            القيمة المخزنة: {setting.value} يوم
                          </span>
                        </div>

                        {/* Interactive Preset Chips */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                          {GUARANTEE_DAY_PRESETS.map((preset) => {
                            const isSelected = setting.value
                              .split(",")
                              .map((x) => x.trim())
                              .includes(preset.days);

                            return (
                              <button
                                key={preset.days}
                                type="button"
                                onClick={() =>
                                  handleToggleListValue("guarantee_reminder_days", setting.value, preset.days)
                                }
                                className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                                  isSelected
                                    ? "bg-amber-500/10 border-amber-500/40 text-foreground shadow-xs"
                                    : "bg-muted/20 border-border/80 text-muted-foreground hover:bg-muted/40"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs">{preset.label}</span>
                                  <span
                                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                                      isSelected
                                        ? "bg-amber-500 text-slate-950 font-black"
                                        : "border border-border text-transparent"
                                    }`}
                                  >
                                    ✓
                                  </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground leading-tight">
                                  {preset.desc}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ========================================================================= */}
          {/* RADAR TENDER DATA MANAGEMENT & CLEANUP ACTIONS                            */}
          {/* ========================================================================= */}
          {activeCategoryTab === "radar" && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.04] p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center font-bold shrink-0 border border-rose-500/25">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">
                      إدارة وحذف المناقصات والعمليات الملتقطة بالرادار
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      تطهير الرادار وحذف المناقصات غير المرغوبة أو مسح كافة العمليات التي تم رصدها ولم تسحب بعد
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Reset Company Assignments */}
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const res = await api.post("/radar/reset-company-assignments");
                        toast.success(res.data?.message || "تم إلغاء أي ربط مسبق بالشركات بنجاح");
                      } catch {
                        toast.error("فشل تصفير ربط الشركات");
                      }
                    }}
                    className="border-blue-500/40 bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-500 text-xs font-bold rounded-xl h-9 px-3.5 cursor-pointer transition-all active:scale-95"
                  >
                    <span>تصفير ربط الشركات بالرادار</span>
                  </Button>

                  {/* Clear all pending */}
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      if (!confirm("تحذير: هل أنت متأكد من مسح وحذف كافة العمليات والمناقصات الملتقطة بالرادار التي لم تُسحب كعمليات بعد؟")) return;
                      try {
                        const res = await api.delete("/radar/clear-pending");
                        toast.success(res.data?.message || "تم مسح كافة المناقصات الملتقطة بالرادار بنجاح");
                      } catch {
                        toast.error("فشل مسح مناقصات الرادار");
                      }
                    }}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl h-9 px-3.5 cursor-pointer shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>مسح كافة الملتقطات بالرادار</span>
                  </Button>
                </div>
              </div>

              {/* Neutral Radar Policy Notice */}
              <div className="p-3.5 rounded-xl bg-card border border-border text-xs leading-relaxed space-y-1 text-muted-foreground">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>طبيعة عمل الرادار الحكومي العام:</span>
                </div>
                <p>
                  كافة المناقصات المرصودة بالرادار هي فرص ومناقصات حكومية عامة محايدة بدون اقتراح أو تعيين مسبق لأي شركة. يتم اختيار وتحديد الشركة المسؤولة يدوياً بمعرفتك حصراً عند الضغط على &quot;سحب كعملية&quot;.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. Sticky Floating Save Action Bar (appears when changes are pending)     */}
      {/* ========================================================================= */}
      {totalUnsavedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[92%] animate-slide-up">
          <div className="rounded-2xl p-4 border border-blue-500/40 shadow-2xl flex items-center justify-between gap-4 bg-slate-950 text-white">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
              <div className="text-right">
                <span className="text-xs font-bold block text-white leading-tight">
                  تعديلات معلقة ({totalUnsavedCount})
                </span>
                <span className="text-[11px] text-slate-400 block">
                  لم يتم حفظ التعديلات في قاعدة البيانات بعد
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevertChanges}
                disabled={isSaving}
                className="border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs h-9 px-3 rounded-xl cursor-pointer font-bold"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>إلغاء</span>
              </Button>

              <Button
                size="sm"
                onClick={handleSaveAll}
                disabled={isSaving}
                className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-lg shadow-blue-500/25 flex items-center gap-1.5 cursor-pointer"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>حفظ الآن</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
