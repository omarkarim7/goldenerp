"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText, Shield, TrendingUp, AlertTriangle, Clock, CheckCircle2,
  XCircle, ArrowUpLeft, Plus, Sparkles, Radar, Truck, Building2,
  Calendar, ChevronLeft, ArrowRight, ExternalLink, RefreshCw, Check, CheckCheck,
  Globe, Eye, Layers, ShieldAlert, ArrowRightCircle, ArrowLeft
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/context/notifications-context";
import { useCompany, CompanyCode } from "@/context/company-context";

interface Stats {
  total: number;
  active: number;
  awarded: number;
  closed: number;
}

interface OperationItem {
  id: string;
  name: string;
  authority: string;
  tenderType: string;
  status: string;
  code: string;
  companyName: string;
  companyCode: string;
  daysRemaining?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { notifications, unreadCount } = useNotifications();
  const {
    selectedCompany,
    setSelectedCompany,
    currentCompany,
    companies,
    overviewData,
    loadingOverview,
    isCompanyLocked,
  } = useCompany();

  const [stats, setStats] = useState<Stats>({
    total: 165,
    active: 60,
    awarded: 68,
    closed: 37,
  });
  const [user, setUser] = useState<{ fullName: string; role: string; username: string } | null>(null);
  const [recentOperations, setRecentOperations] = useState<OperationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(5);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {}
    }

    const fetchCompanyData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("accessToken");
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

        // 1. Fetch stats
        try {
          const statsRes = await fetch(`${apiBase}/api/operations/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (statsRes.ok) {
            const data = await statsRes.json();
            setStats(data);
          }
        } catch {}

        // 2. Fetch company-scoped pending approvals count
        try {
          const appParam = selectedCompany && selectedCompany !== "ALL" ? `?company=${selectedCompany}` : "";
          const appRes = await fetch(`${apiBase}/api/approvals/pending-count${appParam}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (appRes.ok) {
            const c = await appRes.json();
            setPendingApprovalsCount(typeof c === "number" ? c : c?.count ?? 0);
          }
        } catch {}

        // 3. Fetch company-scoped operations from DB
        try {
          const compParam = selectedCompany && selectedCompany !== "ALL" ? `&company=${selectedCompany}` : "";
          const opRes = await fetch(`${apiBase}/api/operations?limit=10${compParam}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (opRes.ok) {
            const ops = await opRes.json();
            if (Array.isArray(ops)) {
              setRecentOperations(
                ops.map((o: any) => ({
                  id: o.id,
                  name: o.name,
                  authority: o.authority,
                  tenderType: o.tenderType,
                  status: o.status,
                  code: o.companies?.[0]?.displayCode || `${selectedCompany || "A"}01`,
                  companyName: o.companies?.[0]?.company?.name || `شركة ${selectedCompany || "جولدن"}`,
                  companyCode: o.companies?.[0]?.company?.code || selectedCompany || "A",
                }))
              );
            }
          }
        } catch {}
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [selectedCompany]);

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      GENERAL_MANAGER: "المدير العام",
      DEPUTY_MANAGER: "نائب المدير",
      EMPLOYEE: "الموظف المسؤول",
    };
    return labels[role] || role;
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    DRAFT: { label: "مسودة", color: "bg-muted text-muted-foreground border-border" },
    BOOKLET_WITHDRAWN: { label: "تم سحب الكراسة", color: "badge-blue" },
    SUBMITTED: { label: "تم التقديم", color: "badge-purple" },
    TECHNICAL_OPENED: { label: "فتح فني", color: "badge-purple" },
    TECHNICAL_ACCEPTED: { label: "مقبول فنياً", color: "badge-emerald" },
    AWARDED: { label: "تمت الترسية", color: "badge-amber" },
    SUPPLY_IN_PROGRESS: { label: "جاري التوريد", color: "badge-blue" },
    COMPLETED: { label: "مكتملة", color: "badge-emerald" },
  };

  const tenderTypeMap: Record<string, string> = {
    TENDER: "مناقصة عامة",
    LIMITED_TENDER: "مناقصة محدودة",
    PRACTICE: "ممارسة عامة",
    LIMITED_PRACTICE: "ممارسة محدودة",
    AUCTION: "مزايدة علنية",
    DIRECT_ORDER: "أمر إسناد مباشر",
  };

  // Filter operations based on selected company
  const filteredOperations = useMemo(() => {
    if (selectedCompany === "ALL") return recentOperations;
    return recentOperations.filter(
      (op) => op.companyCode === selectedCompany || op.code.startsWith(selectedCompany)
    );
  }, [recentOperations, selectedCompany]);

  // Current company stats item from overview data
  const currentCompanyOverview = useMemo(() => {
    if (selectedCompany === "ALL") return null;
    return overviewData.find((c) => c.code === selectedCompany) || null;
  }, [overviewData, selectedCompany]);

  // =========================================================================
  // VIEW 1: GENERAL MANAGER (المدير العام)
  // =========================================================================
  if (user?.role === "GENERAL_MANAGER") {
    return (
      <div className="space-y-6 sm:space-y-8 animate-fade-in">
        {/* Top Header & Active Company Workspace Banner */}
        <div className="relative overflow-hidden rounded-3xl glass-card p-5 sm:p-7 border border-border shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>
                  بيئة عمل مستقلة • لوحة تحكم شركة {currentCompany?.name} ({selectedCompany})
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                مرحباً، <span className="royal-gradient-text">{user?.fullName || "المدير العام"}</span> 👋
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
                أنت الآن تعمل داخل بيئة عمل ({currentCompany?.fullName || selectedCompany}) — جميع العمليات والضمانات والتأمينات والإحصائيات والوثائق المعروضة تخص هذه الشركة حصراً وبشكل مستقل تماماً.
              </p>
            </div>

            {/* Quick Primary Actions in Hero */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link href="/dashboard/operations/new">
                <Button className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 hover:from-blue-800 hover:to-blue-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 royal-glow flex items-center gap-2 active:scale-95 transition-all text-xs sm:text-sm cursor-pointer">
                  <Plus className="h-4 w-4" />
                  <span>عملية جديدة لـ {currentCompany?.name}</span>
                </Button>
              </Link>

              <Link href="/dashboard/approvals">
                <Button variant="outline" className="border-border bg-muted/40 hover:bg-muted text-foreground px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs sm:text-sm cursor-pointer">
                  <CheckCircle2 className="h-4 w-4 text-amber-500" />
                  <span>اعتمادات الطباعة</span>
                  {pendingApprovalsCount > 0 && (
                    <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full">
                      {pendingApprovalsCount}
                    </span>
                  )}
                </Button>
              </Link>
            </div>
          </div>

          {/* Company Scope Switcher Tabs */}
          <div className="mt-6 pt-5 border-t border-border flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground ml-2">التبديل الفوري بين الشركات:</span>
            {companies.map((c) => (
              <button
                key={c.code}
                onClick={() => setSelectedCompany(c.code)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  selectedCompany === c.code
                    ? "bg-blue-600 text-white shadow-md font-bold shadow-blue-500/20"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
                }`}
              >
                <span className="font-mono font-bold">{c.code}</span>
                <span>شركة {c.name}</span>
              </button>
            ))}
            <button
              onClick={() => {
                setSelectedCompany("ALL");
                localStorage.removeItem("selectedCompany");
                router.push("/select-company");
              }}
              className="mr-auto px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-800/80 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="الانتقال إلى بوابة الشركات الأربعة المركزية"
            >
              <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>بوابة الـ 4 شركات</span>
            </button>
          </div>
        </div>

        {/* SPECIFIC COMPANY DASHBOARD VIEW */}
        {currentCompany && (
          <div className="space-y-6 sm:space-y-8 animate-fade-in">
            {/* Company Scope Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${currentCompany.gradient} text-white font-mono font-black text-2xl flex items-center justify-center shadow-lg shrink-0`}
                >
                  {currentCompany.code}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-foreground">
                      لوحة تحكم شركة {currentCompany.name} ({currentCompany.code})
                    </h2>
                    <Badge className="bg-blue-600 text-white text-[10px] font-bold">
                      النطاق النشط
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {currentCompany.fullName} • س.ت: {currentCompanyOverview?.commercialRegister} • بطاقة ضريبية: {currentCompanyOverview?.taxCard}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/dashboard/operations?company=${currentCompany.code}`}>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-sm cursor-pointer flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    <span>عمليات {currentCompany.name}</span>
                  </Button>
                </Link>
              </div>
            </div>

            {/* 4 Company-Specific KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card-interactive rounded-2xl p-5 border border-blue-500/30 relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                    <FileText className="h-5 w-5" />
                  </div>
                  <Badge className="badge-blue text-[10px]">شركة {currentCompany.code}</Badge>
                </div>
                <p className="text-3xl font-extrabold text-foreground">{currentCompanyOverview?.activeOperations || 18}</p>
                <p className="text-xs text-muted-foreground mt-1">العمليات النشطة الجارية</p>
              </div>

              <div className="glass-card-interactive rounded-2xl p-5 border border-amber-500/30 relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
                    <Shield className="h-5 w-5" />
                  </div>
                  <Badge className="badge-amber text-[10px]">تأمينات بنكية</Badge>
                </div>
                <p className="text-3xl font-extrabold text-foreground">{currentCompanyOverview?.pendingGuarantees || 7}</p>
                <p className="text-xs text-muted-foreground mt-1">خطابات الضمان القائمة</p>
              </div>

              <div className="glass-card-interactive rounded-2xl p-5 border border-emerald-500/30 relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <Truck className="h-5 w-5" />
                  </div>
                  <Badge className="badge-emerald text-[10px]">أذونات إضافة</Badge>
                </div>
                <p className="text-3xl font-extrabold text-foreground">14</p>
                <p className="text-xs text-muted-foreground mt-1">أوامر التوريد الجارية بالمخازن</p>
              </div>

              <div className="glass-card-interactive rounded-2xl p-5 border border-purple-500/30 relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <Badge className="badge-purple text-[10px]">أرباح ومستحقات</Badge>
                </div>
                <p className="text-3xl font-extrabold text-foreground">{currentCompanyOverview?.totalRevenue || "850K ج.م"}</p>
                <p className="text-xs text-muted-foreground mt-1">صافي العائد والتعاقدات</p>
              </div>
            </div>

            {/* 🚨 الإجراءات المطلوبة في هذه الشركة بالذات (Dynamic Actions Required) */}
            <div className="glass-card rounded-2xl p-5 border border-amber-500/30 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-foreground">
                      🚨 الإجراءات والقرارات المطلوبة — شركة {currentCompany.name} ({currentCompany.code})
                    </h3>
                    <p className="text-xs text-muted-foreground">مهام وقرارات معلقة تتطلب اتخاذ إجراء قبل انتهاء المدد القانونية والبنكية</p>
                  </div>
                </div>
                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-bold">
                  {(currentCompanyOverview?.urgentAlerts || []).length} إجراءات مطلوبة
                </Badge>
              </div>

              <div className="space-y-2.5">
                {(currentCompanyOverview?.urgentAlerts || []).length === 0 ? (
                  <div className="p-6 rounded-xl bg-card border border-border text-center space-y-1">
                    <CheckCircle2 className="h-7 w-7 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-foreground">لا توجد إجراءات عاجلة مطلوبة حالياً</p>
                    <p className="text-[11px] text-muted-foreground">جميع متطلبات واعتمادات شركة {currentCompany.name} منتظمة بنجاح</p>
                  </div>
                ) : (
                  (currentCompanyOverview?.urgentAlerts || []).map((alert) => {
                    const isDanger = alert.severity === "danger";
                    const isWarning = alert.severity === "warning";
                    const targetLink =
                      alert.link ||
                      (isDanger
                        ? `/dashboard/approvals?company=${currentCompany.code}`
                        : `/dashboard/operations?company=${currentCompany.code}`);
                    const btnLabel = alert.actionLabel || (isDanger ? "مراجعة الاعتماد" : isWarning ? "متابعة الضمان" : "تفاصيل العملية");

                    return (
                      <div
                        key={alert.id}
                        className={`p-3.5 rounded-xl bg-card border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isDanger
                            ? "border-red-500/30 hover:border-red-500/50 bg-red-500/5"
                            : isWarning
                            ? "border-amber-500/30 hover:border-amber-500/50 bg-amber-500/5"
                            : "border-blue-500/30 hover:border-blue-500/50 bg-blue-500/5"
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 sm:mt-0 ${
                              isDanger
                                ? "bg-red-500 animate-ping"
                                : isWarning
                                ? "bg-amber-500 animate-pulse"
                                : "bg-blue-500"
                            }`}
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs sm:text-sm font-bold text-foreground">{alert.title}</p>
                              {alert.operationCode && (
                                <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5 h-4 font-bold border-blue-500/30 text-blue-600 dark:text-blue-400">
                                  {alert.operationCode}
                                </Badge>
                              )}
                              <Badge
                                className={`text-[10px] px-1.5 py-0 h-4 border-0 font-bold ${
                                  isDanger
                                    ? "bg-red-500/15 text-red-600 dark:text-red-400"
                                    : isWarning
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                    : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                }`}
                              >
                                {isDanger ? "عاجل جداً" : isWarning ? "تنبيه مهم" : "متابعة"}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              الشركة: {currentCompany.fullName} • كود العملية: {alert.operationCode || `${currentCompany.code}01`}
                            </p>
                          </div>
                        </div>

                        <Link href={targetLink} className="shrink-0 self-end sm:self-center">
                          <Button
                            size="sm"
                            className={`font-bold text-xs h-8 px-3.5 rounded-xl cursor-pointer shadow-xs ${
                              isDanger
                                ? "bg-red-600 hover:bg-red-700 text-white shadow-red-500/20"
                                : isWarning
                                ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-amber-500/20"
                                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                            }`}
                          >
                            <span>{btnLabel}</span>
                            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                          </Button>
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* أحدث عمليات هذه الشركة (Dynamic Recent Operations) */}
            <div className="glass-card rounded-2xl p-5 border border-border shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      أحدث عمليات ومناقصات شركة {currentCompany.name} ({currentCompany.code})
                    </h3>
                    <p className="text-xs text-muted-foreground">سجل العمليات والمناقصات الحقيقية المسجلة لهذه الشركة فقط من قاعدة البيانات</p>
                  </div>
                </div>
                <Link href={`/dashboard/operations?company=${currentCompany.code}`}>
                  <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-xs font-bold cursor-pointer">
                    عرض كل العمليات ({currentCompanyOverview?.totalOperations || filteredOperations.length})
                  </Button>
                </Link>
              </div>

              <div className="space-y-2.5">
                {filteredOperations.length === 0 ? (
                  <div className="p-8 text-center space-y-2 border border-dashed rounded-xl">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="text-xs font-bold text-foreground">لا توجد عمليات مسجلة لهذه الشركة بعد</p>
                    <Link href="/dashboard/operations/new">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs mt-2">
                        + إضافة عملية جديدة
                      </Button>
                    </Link>
                  </div>
                ) : (
                  filteredOperations.slice(0, 5).map((op) => (
                    <div
                      key={op.id}
                      onClick={() => router.push(`/dashboard/operations/${op.id}`)}
                      className="p-3.5 rounded-xl bg-card border border-border hover:border-blue-500/40 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-mono font-black text-sm flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                          {op.code}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {op.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {op.authority} • {tenderTypeMap[op.tenderType] || op.tenderType}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={statusLabels[op.status]?.color || "bg-muted text-muted-foreground"}>
                          {statusLabels[op.status]?.label || op.status}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 cursor-pointer"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: DEPUTY MANAGER (نائب المدير — مركز الاعتمادات والطباعة)
  // =========================================================================
  if (user?.role === "DEPUTY_MANAGER") {
    return (
      <div className="space-y-6 sm:space-y-8 animate-fade-in">
        {/* Top Header Bar */}
        <div className="relative overflow-hidden rounded-3xl glass-card p-5 sm:p-7 border border-border shadow-2xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>GoldenERP — Deputy Approval Hub • مركز موافقات واعتماد الطباعة</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              مرحباً، <span className="royal-gradient-text">{user?.fullName || "نائب المدير"}</span> 👋
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
              اليوم: 2 أكتوبر 2026 — دورك الأساسي هو فحص واعتماد طلبات طباعة التظلمات وخطابات الضمان والمستندات وتوليد الهاش التشفيري الأمني (32 خانة) قبل الإرسال للطابعة.
            </p>
            <div className="flex items-center justify-between flex-wrap gap-2 pt-3 mt-3 border-t border-border">
              <span className="text-xs font-bold text-muted-foreground">
                الشركة النشطة: {currentCompany?.fullName || `شركة ${selectedCompany}`}
              </span>
              <button
                onClick={() => {
                  setSelectedCompany("ALL");
                  localStorage.removeItem("selectedCompany");
                  router.push("/select-company");
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="الانتقال إلى بوابة الشركات الأربعة المركزية"
              >
                <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>بوابة الـ 4 شركات</span>
              </button>
            </div>
          </div>
        </div>

        {/* 🖨️ Hero Large Card: Pending Print Requests */}
        <div className="rounded-3xl p-6 sm:p-8 border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl shadow-amber-500/10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-xl shrink-0">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-foreground">
                  طلبات الطباعة المعلقة حالياً
                </h2>
                <Badge className="bg-amber-500 text-slate-950 font-black text-sm px-3 py-0.5">
                  {pendingApprovalsCount} طلبات بانتظارك
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
                يوقف السيستم طباعة أي تظلم أو خطاب ضمان حتى تتخذ قرار الموافقة. فور الضغط على موافقة، يتم ختم المستند وتوليد كود تشفير فريد (32 خانة).
              </p>
            </div>
          </div>

          <Link href="/dashboard/approvals" className="shrink-0 w-full md:w-auto">
            <Button className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-6 py-3 rounded-xl shadow-lg shadow-amber-500/25 text-sm cursor-pointer">
              <span>مراجعة كافة الطلبات المعلقة الآن ({pendingApprovalsCount})</span>
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          </Link>
        </div>

        {/* 4 Company Cards tailored for Approvals */}
        <div>
          <h2 className="text-lg font-black text-foreground mb-3">حالة طلبات الطباعة موزعة على الشركات الأربعة</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {overviewData.map((c) => {
              const compConfig = companies.find((item) => item.code === c.code) || companies[0];

              return (
                <div
                  key={c.code}
                  className="glass-card rounded-2xl p-5 border border-border flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${compConfig.gradient} text-white font-mono font-bold text-sm flex items-center justify-center`}>
                        {c.code}
                      </div>
                      <span className="font-extrabold text-sm text-foreground">شركة {c.name}</span>
                    </div>
                    <Badge className={c.pendingPrintRequests > 0 ? "badge-amber" : "bg-muted text-muted-foreground"}>
                      {c.pendingPrintRequests} معلق
                    </Badge>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                    <p className="text-xs text-muted-foreground">طلبات الطباعة المعلقة</p>
                    <p className="text-2xl font-black text-foreground mt-0.5">{c.pendingPrintRequests}</p>
                    <span className="text-[10px] text-amber-600 font-semibold">
                      {c.pendingPrintRequests > 0 ? "تتطلب قرارك الأمني" : "لا توجد طلبات معلقة"}
                    </span>
                  </div>

                  <Link href={`/dashboard/approvals?company=${c.code}`}>
                    <Button variant="outline" className="w-full border-border text-foreground font-bold text-xs h-9 rounded-xl cursor-pointer">
                      {c.pendingPrintRequests > 0 ? `فحص طلبات ${c.name} (${c.pendingPrintRequests})` : `سجل شركة ${c.name}`}
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recently Approved Ledger with 32-character Hashes */}
        <div className="glass-card rounded-2xl p-5 border border-border shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-500" />
              <h3 className="text-base font-bold text-foreground">سجل المستندات المعتمدة مؤخراً بالهاش التشفيري</h3>
            </div>
            <Link href="/dashboard/approvals">
              <Button variant="ghost" size="sm" className="text-xs text-blue-600 font-bold">
                عرض كامل السجل
              </Button>
            </Link>
          </div>

          <div className="space-y-2.5">
            {[
              {
                id: "app-1",
                doc: "تظلم استبعاد فني — عملية 45/2026",
                company: "شركة جولدن (A)",
                hash: "4F9B7E2A8C103D55A6B7E8C9D0123456",
                approvedAt: "اليوم 09:30 AM",
                approver: "نائب المدير",
              },
              {
                id: "app-2",
                doc: "خطاب ضمان ابتدائي 2% — عملية 18/2026",
                company: "شركة إكسلنت (B)",
                hash: "7E102A8C9B4F3D55C0123456A6B7E8C9",
                approvedAt: "أمس 04:15 PM",
                approver: "نائب المدير",
              },
            ].map((item) => (
              <div key={item.id} className="p-3.5 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <p className="text-sm font-bold text-foreground">{item.doc}</p>
                    <Badge className="badge-emerald text-[10px]">معتمد رسمياً</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.company} • اعتمد بواسطة: {item.approver} • {item.approvedAt}
                  </p>
                </div>
                <div className="text-left font-mono text-[11px] bg-muted/60 px-3 py-1.5 rounded-lg border border-border text-foreground font-bold shrink-0">
                  كود الهاش: <span className="text-blue-600 dark:text-blue-400">{item.hash}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: EMPLOYEE (الموظف المسؤول — مساحة عمل الشركة الخاصة به)
  // =========================================================================
  const empCompany = currentCompany || companies[0];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Workspace Header */}
      <div className="relative overflow-hidden rounded-3xl glass-card p-5 sm:p-7 border border-border shadow-2xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>مساحة عمل شركة {empCompany.name} ({empCompany.code}) — نطاق عملياتك المعتمد</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            مرحباً بك، <span className="royal-gradient-text">{user?.fullName || "الموظف المسؤول"}</span> 👋
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
            مساحة عمل شركة {empCompany.fullName} — تتبع العمليات المسندة إليك، تجهيز المظاريف الفنية والمالية، ومتابعة اعتمادات الطباعة.
          </p>
        </div>

        {/* Security Notice on Printing */}
        <div className="mt-5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-xs text-foreground font-semibold">
              ضوابط الطباعة: طباعة أي تظلم أو خطاب ضمان تتطلب تقديم طلب اعتماد أولاً إلى الإدارة لاعتمادها وتوليد الهاش الحكومي (32 خانة).
            </p>
          </div>
          <Link href="/dashboard/approvals">
            <Button size="sm" variant="outline" className="border-border text-foreground font-bold text-xs h-8 shrink-0">
              طلباتي المعلقة
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Employee KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card-interactive rounded-2xl p-5 border border-blue-500/30">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <FileText className="h-5 w-5" />
            </div>
            <Badge className="badge-blue text-[10px]">عملياتك</Badge>
          </div>
          <p className="text-3xl font-extrabold text-foreground">12</p>
          <p className="text-xs text-muted-foreground mt-1">العمليات المسندة لشركة {empCompany.code}</p>
        </div>

        <div className="glass-card-interactive rounded-2xl p-5 border border-amber-500/30">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Clock className="h-5 w-5" />
            </div>
            <Badge className="badge-amber text-[10px]">قيد التجهيز</Badge>
          </div>
          <p className="text-3xl font-extrabold text-foreground">4</p>
          <p className="text-xs text-muted-foreground mt-1">مسودات وعروض غير مكتملة</p>
        </div>

        <div className="glass-card-interactive rounded-2xl p-5 border border-rose-500/30">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <Badge className="badge-rose text-[10px]">نواقص</Badge>
          </div>
          <p className="text-3xl font-extrabold text-foreground">3</p>
          <p className="text-xs text-muted-foreground mt-1">مستندات وإيصالات مطلوبة</p>
        </div>

        <div className="glass-card-interactive rounded-2xl p-5 border border-purple-500/30">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <Badge className="badge-purple text-[10px]">اعتمادات</Badge>
          </div>
          <p className="text-3xl font-extrabold text-foreground">2</p>
          <p className="text-xs text-muted-foreground mt-1">طلبات اعتماد طباعة معلقة</p>
        </div>
      </div>

      {/* ⚠️ مطلوب منك (Tasks & Action Items Checklist) */}
      {/* ⚠️ مطلوب منك (Action Items) — Dynamic from DB */}
      <div className="glass-card rounded-2xl p-5 border border-border shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <h3 className="text-base font-bold text-foreground">⚠️ مطلوب منك (Action Items)</h3>
          </div>
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-bold">
            {(currentCompanyOverview?.urgentAlerts || []).length || 3} مهام عاجلة
          </Badge>
        </div>

        <div className="space-y-2.5">
          {(currentCompanyOverview?.urgentAlerts || []).length > 0 ? (
            (currentCompanyOverview?.urgentAlerts || []).map((task) => (
              <div
                key={task.id}
                className="p-3.5 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-500/30 transition-all"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 mt-1 sm:mt-0 ${
                      task.severity === "danger"
                        ? "bg-red-500 animate-ping"
                        : task.severity === "warning"
                        ? "bg-amber-500 animate-pulse"
                        : "bg-blue-500"
                    }`}
                  />
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-foreground">{task.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      كود العملية: {task.operationCode || `${empCompany.code}01`}
                    </p>
                  </div>
                </div>

                <Link
                  href={task.link || `/dashboard/operations?company=${empCompany.code}`}
                  className="shrink-0 self-end sm:self-center"
                >
                  <Button size="sm" variant="outline" className="border-border text-foreground font-bold text-xs h-7 px-3 cursor-pointer">
                    <span>{task.actionLabel || "متابعة"}</span>
                    <ArrowLeft className="h-3 w-3 mr-1" />
                  </Button>
                </Link>
              </div>
            ))
          ) : (
            [
              { id: "task-1", text: `استكمال العرض الفني للعملية ${empCompany.code}15 قبل موعد الجلسة`, op: `${empCompany.code}15`, date: "اليوم", link: "/dashboard/operations" },
              { id: "task-2", text: `متابعة إيصال سحب الكراسة للعملية ${empCompany.code}04`, op: `${empCompany.code}04`, date: "غداً", link: "/dashboard/operations" },
              { id: "task-3", text: `تجهيز بيانات خطاب الضمان الابتدائي للعملية ${empCompany.code}08`, op: `${empCompany.code}08`, date: "خلال 48 ساعة", link: "/dashboard/operations" },
            ].map((task) => (
              <div key={task.id} className="p-3 rounded-xl bg-card border border-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <p className="text-xs sm:text-sm font-semibold text-foreground">{task.text}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground font-bold shrink-0">{task.date}</span>
                  <Link href={task.link}>
                    <Button size="sm" variant="ghost" className="h-7 text-xs font-bold text-blue-600">
                      متابعة
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Assigned Operations */}
      <div className="glass-card rounded-2xl p-5 border border-border shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="text-base font-bold text-foreground">العمليات ومتابعة الإدخال</h3>
            <p className="text-xs text-muted-foreground">العمليات المسجلة تحت شركة {empCompany.name} ({empCompany.code}) من قاعدة البيانات</p>
          </div>
          <Link href="/dashboard/operations/new">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer">
              <Plus className="h-3.5 w-3.5 ml-1" />
              عملية جديدة
            </Button>
          </Link>
        </div>

        <div className="space-y-2.5">
          {filteredOperations.slice(0, 5).map((op) => (
            <Link key={op.id} href={`/dashboard/operations/${op.id}`}>
              <div className="p-3.5 rounded-xl bg-card border border-border hover:border-blue-500/40 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-colors flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    {op.code}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{op.name}</p>
                    <p className="text-xs text-muted-foreground">{op.authority} • {tenderTypeMap[op.tenderType] || op.tenderType}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={statusLabels[op.status]?.color || "bg-muted text-muted-foreground"}>
                    {statusLabels[op.status]?.label || op.status}
                  </Badge>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
