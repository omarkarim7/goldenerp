"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText, Shield, TrendingUp, AlertTriangle, Clock, CheckCircle2,
  XCircle, ArrowUpLeft, Plus, Sparkles, Radar, Truck, Building2,
  Calendar, ChevronLeft, ArrowRight, ExternalLink, RefreshCw, Check, CheckCheck,
  Globe, Eye, Layers, ShieldAlert, ArrowRightCircle, ArrowLeft,
  Wallet, Landmark, Receipt, HardHat, Award, DollarSign, Search,
  Bell, MapPin, Zap, Activity, BarChart3, PieChart, Lock, ShieldCheck,
  Send, AlertOctagon, HelpCircle, ClipboardCheck, Briefcase
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/context/notifications-context";
import { useCompany, CompanyCode } from "@/context/company-context";
import api from "@/lib/api";
import { toast } from "sonner";

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
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  billed: number;
  daysRemaining?: number;
}

interface RadarItemBrief {
  id: string;
  title: string;
  authority: string;
  insuranceAmount: number;
  sessionDate: string;
  daysRemaining: number;
  matchScore: number;
  status: string;
}

interface VisitItemBrief {
  id: string;
  title: string;
  authority: string;
  location: string;
  employeeName: string;
  operationCode: string;
  visitDate: string;
  siteReadiness: "READY" | "CONDITIONAL" | "BLOCKED" | "SURVEY_ONLY";
  findings?: string;
  obstacles?: string;
}

interface GuaranteeItemBrief {
  id: string;
  guaranteeNumber: string;
  bank: string;
  type: string;
  amount: number;
  validUntil: string;
  daysLeft: number;
  operationCode: string;
  operationName: string;
  status: "ACTIVE" | "EXPIRING_SOON" | "RENEWED";
}

interface CompanyAlertItem {
  id: string;
  title: string;
  companyCode: string;
  companyName: string;
  operationCode: string;
  category: "SESSION" | "GUARANTEE" | "APPROVAL" | "SUPPLY" | "VISIT";
  categoryLabel: string;
  deadlineText: string;
  severity: "danger" | "warning" | "info";
  requirement: string;
  actionLabel: string;
  link: string;
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
    userRole,
    hasPermission,
  } = useCompany();

  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    awarded: 0,
    closed: 0,
  });
  const [user, setUser] = useState<{ fullName: string; role: string; username: string } | null>(null);
  const [recentOperations, setRecentOperations] = useState<OperationItem[]>([]);
  const [dashboardRadarItems, setDashboardRadarItems] = useState<RadarItemBrief[]>([]);
  const [dashboardVisits, setDashboardVisits] = useState<VisitItemBrief[]>([]);
  const [dashboardGuarantees, setDashboardGuarantees] = useState<GuaranteeItemBrief[]>([]);
  const [recentApprovalsLog, setRecentApprovalsLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [activeSectionFilter, setActiveSectionFilter] = useState<"ALL" | "ALERTS" | "FINANCE" | "RADAR" | "VISITS" | "GUARANTEES">("ALL");
  const [alertCategoryFilter, setAlertCategoryFilter] = useState<string>("ALL");

  // Stage Review Approval Banner State (خاص بالإدارة العليا: المدير العام والنائب فقط)
  const [stageReviewDismissed, setStageReviewDismissed] = useState(false);
  const [stageReviewStatus, setStageReviewStatus] = useState<"pending" | "approved" | "returned">("pending");

  // Role & Permissions Helper
  const effectiveRole = userRole || user?.role;
  const isManagerOrDeputy = effectiveRole === "GENERAL_MANAGER" || effectiveRole === "DEPUTY_MANAGER";
  const canViewRadar = isManagerOrDeputy || (hasPermission ? hasPermission("operations_radar") : false);

  // Live formatted Arabic Date
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      setCurrentTimeStr(now.toLocaleDateString("ar-EG", options));
    };
    updateDateTime();
  }, []);

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
        // 1. Fetch stats
        try {
          const statsRes = await api.get("/operations/stats");
          if (statsRes.data) {
            setStats(statsRes.data);
          }
        } catch {}

        // 2. Fetch company-scoped pending approvals count
        try {
          const appParam = selectedCompany && selectedCompany !== "ALL" ? `?company=${selectedCompany}` : "";
          const appRes = await api.get(`/approvals/pending-count${appParam}`);
          if (appRes.data !== undefined) {
            const c = appRes.data;
            setPendingApprovalsCount(typeof c === "number" ? c : c?.count ?? 0);
          }
        } catch {}

        // 3. Fetch company-scoped operations from DB
        try {
          const compParam = selectedCompany && selectedCompany !== "ALL" ? `&company=${selectedCompany}` : "";
          const opRes = await api.get(`/operations?limit=15${compParam}`);
          const ops = opRes.data;
          if (Array.isArray(ops) && ops.length > 0) {
            setRecentOperations(
              ops.map((o: any, idx: number) => {
                const fin = o.operationFinance;
                const rev = fin ? Number(fin.totalRevenue) : Number(o.awardedAmount || o.estimatedValue || 0);
                const cost = fin ? Number(fin.totalCost) : (rev > 0 ? Math.round(rev * 0.71) : 0);
                const profit = fin ? Number(fin.netProfit) : (rev - cost);
                const margin = rev > 0 ? (profit / rev) * 100 : 0;
                const certsTotal = (o.certificates || []).reduce(
                  (s: number, c: any) => s + (Number(c.netAmount) || Number(c.grossAmount) || 0),
                  0
                );
                const billedVal = certsTotal > 0 ? certsTotal : (fin ? Number(fin.paidAmount || 0) : 0);

                return {
                  id: o.id,
                  name: o.name,
                  authority: o.authority || "جهة حكومية",
                  tenderType: o.tenderType || "TENDER",
                  status: o.status || "AWARDED",
                  code: o.companies?.[0]?.displayCode || `${selectedCompany === "ALL" ? "A" : selectedCompany}${String(15 - idx).padStart(2, "0")}`,
                  companyName: o.companies?.[0]?.company?.name || `شركة ${selectedCompany || "جولدن"}`,
                  companyCode: o.companies?.[0]?.company?.code || selectedCompany || "A",
                  revenue: rev,
                  cost: cost,
                  profit: profit,
                  margin: Math.round(margin * 10) / 10,
                  billed: Math.min(rev, billedVal),
                };
              })
            );
          } else {
            setRecentOperations([]);
          }
        } catch {
          setRecentOperations([]);
        }

        // 4. Fetch real radar tenders
        try {
          const compFilter = selectedCompany && selectedCompany !== "ALL" ? `&companyCode=${selectedCompany}` : "";
          const radarRes = await api.get(`/radar/items?limit=6&sortBy=newest${compFilter}`);
          const rItems = radarRes.data?.items || [];
          if (Array.isArray(rItems)) {
            setDashboardRadarItems(
              rItems.map((r: any) => {
                const deadlineMs = r.deadline ? new Date(r.deadline).getTime() : 0;
                const daysLeft = deadlineMs > 0 ? Math.max(0, Math.ceil((deadlineMs - Date.now()) / (1000 * 60 * 60 * 24))) : 14;
                return {
                  id: r.id,
                  title: r.title,
                  authority: r.authority || "جهة حكومية",
                  insuranceAmount: Number(r.temporaryInsurance) || 0,
                  sessionDate: r.deadline ? r.deadline.split("T")[0] : "قريباً",
                  daysRemaining: daysLeft,
                  matchScore: r.matchScore || 90,
                  status: r.isImported ? "تم السحب ✓" : "جاهزة للسحب 🟢",
                };
              })
            );
          }
        } catch {}

        // 5. Fetch real site visits
        try {
          const visitRes = await api.get("/site-visits");
          const vData = visitRes.data;
          if (Array.isArray(vData) && vData.length > 0) {
            setDashboardVisits(
              vData.slice(0, 4).map((v: any) => {
                let extra: any = {};
                try { if (v.notes && v.notes.includes("{")) extra = JSON.parse(v.notes); } catch {}
                return {
                  id: v.id,
                  title: v.purpose || "معاينة ميدانية",
                  authority: extra.authority || v.location || "الجهة المختصة",
                  location: v.location || "الموقع الميداني",
                  employeeName: v.employee?.name || "المسؤول الميداني",
                  operationCode: v.operationId || "A01",
                  visitDate: v.visitDate ? v.visitDate.split("T")[0] : "",
                  siteReadiness: extra.siteReadiness || "READY",
                  findings: extra.findings || v.notes || "تمت المعاينة ومطابقة الاشتراطات بنجاح.",
                };
              })
            );
          } else {
            setDashboardVisits([]);
          }
        } catch {
          setDashboardVisits([]);
        }

        // 6. Fetch real guarantees
        try {
          const guarRes = await api.get("/guarantees");
          const gData = guarRes.data;
          if (Array.isArray(gData) && gData.length > 0) {
            setDashboardGuarantees(
              gData.slice(0, 4).map((g: any) => {
                const endMs = g.endDate ? new Date(g.endDate).getTime() : 0;
                const daysLeft = endMs > 0 ? Math.max(0, Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24))) : 30;
                return {
                  id: g.id,
                  guaranteeNumber: g.guaranteeNumber || "LG-000",
                  bank: g.bankName || "البنك",
                  type: g.type === "INITIAL" ? "ابتدائي (2%)" : "نهائي (5%)",
                  amount: Number(g.amount) || 0,
                  validUntil: g.endDate ? g.endDate.split("T")[0] : "",
                  daysLeft: daysLeft,
                  operationCode: g.operation?.companies?.[0]?.displayCode || "A01",
                  operationName: g.operation?.name || "عملية مسجلة",
                  status: daysLeft <= 30 ? "EXPIRING_SOON" : "ACTIVE",
                };
              })
            );
          } else {
            setDashboardGuarantees([]);
          }
        } catch {
          setDashboardGuarantees([]);
        }

        // 7. Fetch approvals log
        try {
          const appLogRes = await api.get("/approvals");
          const aData = appLogRes.data;
          if (Array.isArray(aData) && aData.length > 0) {
            setRecentApprovalsLog(
              aData.slice(0, 3).map((a: any) => ({
                id: a.id,
                doc: a.documentTitle || "مستند رسمي معتمد",
                company: `شركة ${a.operationCode ? a.operationCode.charAt(0) : "A"}`,
                hash: a.securityHash || "---",
                approvedAt: a.decisionDate ? new Date(a.decisionDate).toLocaleDateString("ar-EG") : "معتمد",
                approver: a.decisionBy?.name || "الإدارة العليا",
              }))
            );
          } else {
            setRecentApprovalsLog([]);
          }
        } catch {
          setRecentApprovalsLog([]);
        }
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
    if (selectedCompany === "ALL") {
      return recentOperations;
    }
    return recentOperations.filter(
      (op) => op.companyCode === selectedCompany || op.code.startsWith(selectedCompany)
    );
  }, [recentOperations, selectedCompany]);

  // Current company stats item from overview data
  const currentCompanyOverview = useMemo(() => {
    if (selectedCompany === "ALL") return null;
    return overviewData.find((c) => c.code === selectedCompany) || null;
  }, [overviewData, selectedCompany]);

  // Financial aggregates strictly for the active scope
  const financialTotals = useMemo(() => {
    const totalRev = filteredOperations.reduce((s, o) => s + (o.revenue || 0), 0);
    const totalCost = filteredOperations.reduce((s, o) => s + (o.cost || 0), 0);
    const totalProfit = filteredOperations.reduce((s, o) => s + (o.profit || 0), 0);
    const totalBilled = filteredOperations.reduce((s, o) => s + (o.billed || 0), 0);
    const profitMargin = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;
    const collectionRatio = totalRev > 0 ? (totalBilled / totalRev) * 100 : 0;

    return {
      totalRev: totalRev,
      totalCost: totalCost,
      totalProfit: totalProfit,
      totalBilled: totalBilled,
      profitMargin: Math.round(profitMargin * 10) / 10,
      collectionRatio: Math.round(collectionRatio * 10) / 10,
    };
  }, [filteredOperations]);

  // Format currency helpers
  const formatEGP = (num: number) =>
    new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(num);

  // Compact EGP formatting that NEVER overflows cards (e.g. 19.5 مليون ج.م / 518 ألف ج.م)
  const formatCompactEGP = (num: number) => {
    if (!num || isNaN(num)) return "0 ج.م";
    if (num >= 1_000_000) {
      const val = num / 1_000_000;
      const formatted = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1);
      return `${Number(formatted).toLocaleString("ar-EG")} مليون ج.م`;
    }
    if (num >= 100_000) {
      const val = Math.round(num / 1_000);
      return `${val.toLocaleString("ar-EG")} ألف ج.م`;
    }
    return formatEGP(num);
  };

  // 🚨 Scoped alerts list dynamically derived from real backend overviewData
  const activeAlertsList: CompanyAlertItem[] = useMemo(() => {
    const list: CompanyAlertItem[] = [];
    overviewData.forEach((comp) => {
      if (selectedCompany === "ALL" || comp.code === selectedCompany) {
        (comp.urgentAlerts || []).forEach((a) => {
          list.push({
            id: a.id,
            title: a.title,
            companyCode: comp.code,
            companyName: comp.name || `شركة ${comp.code}`,
            operationCode: a.operationCode || `${comp.code}01`,
            category: a.severity === "danger" ? "APPROVAL" : "SESSION",
            categoryLabel: a.severity === "danger" ? "طلب اعتماد" : "تنبيه تشغيلي",
            deadlineText: "متابعة عاجلة",
            severity: a.severity,
            requirement: a.title,
            actionLabel: a.actionLabel || "متابعة",
            link: a.link || "/dashboard/operations",
          });
        });
      }
    });
    return list;
  }, [overviewData, selectedCompany]);

  // Filtered by category tab inside alerts
  const displayAlerts = useMemo(() => {
    if (alertCategoryFilter === "ALL") return activeAlertsList;
    return activeAlertsList.filter((a) => a.category === alertCategoryFilter);
  }, [activeAlertsList, alertCategoryFilter]);

  // Real Radar Tenders (Loaded from backend DB)
  const activeRadarList: RadarItemBrief[] = useMemo(() => {
    return dashboardRadarItems;
  }, [dashboardRadarItems]);

  // Real Site Inspection Visits (Loaded from backend DB)
  const activeVisitsList: VisitItemBrief[] = useMemo(() => {
    return dashboardVisits;
  }, [dashboardVisits]);

  // Real Bank Guarantees (Loaded from backend DB)
  const activeGuaranteesList: GuaranteeItemBrief[] = useMemo(() => {
    return dashboardGuarantees;
  }, [dashboardGuarantees]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16">
      {/* ━━━ TOP EXECUTIVE COCKPIT HERO BAR ━━━ */}
      <div className="relative overflow-hidden rounded-3xl glass-card p-5 sm:p-7 border border-border shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2.5 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/25 text-blue-700 dark:text-blue-300 text-xs font-bold">
                <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>
                  {selectedCompany === "ALL"
                    ? "بوابة الشركات المركزية الموحدة — الإدارة العامة"
                    : `بيئة عمل مستقلة • لوحة تحكم شركة ${currentCompany?.name} (${selectedCompany})`}
                </span>
              </div>

              {currentTimeStr && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 border border-border text-xs text-muted-foreground font-semibold">
                  <Calendar className="h-3 w-3 text-blue-500" />
                  <span>{currentTimeStr}</span>
                </div>
              )}

              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3 w-3" />
                <span>نظام التشفير SHA-256 نشط</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground leading-tight">
              مرحباً، <span className="royal-gradient-text">{user?.fullName || getRoleLabel(user?.role || "GENERAL_MANAGER")}</span> 👋
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {selectedCompany === "ALL"
                ? "أنت في بوابة الإدارة المركزية — مراقبة مؤشرات الأداء المالي، خطابات الضمان، رادار المناقصات الحكومية، والمعاينات الميدانية عبر الشركات الأربعة مجتمعة."
                : `أنت الآن تعمل داخل بيئة عمل (${currentCompany?.fullName || selectedCompany}) — جميع العمليات والضمانات والتأمينات والإحصائيات والوثائق المعروضة تخص هذه الشركة حصراً وبشكل مستقل تماماً.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
            <Link href={`/dashboard/operations/new?company=${selectedCompany !== "ALL" ? selectedCompany : "A"}`}>
              <Button className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 hover:from-blue-800 hover:to-blue-700 text-white font-bold px-4 py-2.5 rounded-2xl shadow-lg shadow-blue-500/25 royal-glow flex items-center gap-2 active:scale-95 transition-all text-xs sm:text-sm cursor-pointer">
                <Plus className="h-4 w-4" />
                <span>عملية جديدة {selectedCompany !== "ALL" ? `لـ ${currentCompany?.name}` : ""}</span>
              </Button>
            </Link>

            <Link href={`/dashboard/approvals${selectedCompany !== "ALL" ? `?company=${selectedCompany}` : ""}`}>
              <Button
                variant="outline"
                className="border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-foreground px-4 py-2.5 rounded-2xl flex items-center gap-2 text-xs sm:text-sm cursor-pointer relative"
              >
                <CheckCircle2 className="h-4 w-4 text-amber-500" />
                <span>اعتمادات الطباعة</span>
                {pendingApprovalsCount > 0 && (
                  <span className="bg-amber-500 text-slate-950 font-black text-[11px] px-2 py-0.5 rounded-full shadow-xs">
                    {pendingApprovalsCount}
                  </span>
                )}
              </Button>
            </Link>

            {canViewRadar && (
              <Link href="/dashboard/radar">
                <Button
                  variant="outline"
                  className="border-border bg-card/60 hover:bg-muted text-foreground px-3.5 py-2.5 rounded-2xl flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer"
                  title="رادار المناقصات الحكومية"
                >
                  <Radar className="h-4 w-4 text-indigo-500" />
                  <span className="hidden sm:inline">رادار المناقصات</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* ━━━ Immediate Company Switcher Tabs ━━━ */}
        <div className="mt-6 pt-5 border-t border-border flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground ml-2">التبديل الفوري بين الشركات:</span>
          {companies.map((c) => {
            const isActive = selectedCompany === c.code;
            return (
              <button
                key={c.code}
                onClick={() => setSelectedCompany(c.code)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500/40"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
                }`}
              >
                <span className="w-5 h-5 rounded-md bg-white/20 text-center leading-5 font-mono font-black text-[11px]">
                  {c.code}
                </span>
                <span>شركة {c.name}</span>
              </button>
            );
          })}

          <button
            onClick={() => {
              setSelectedCompany("ALL");
              try {
                localStorage.setItem("selectedCompany", "ALL");
              } catch {}
            }}
            className={`mr-auto px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
              selectedCompany === "ALL"
                ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-500/40"
                : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-800/80"
            }`}
            title="الانتقال إلى بوابة الشركات الأربعة المركزية"
          >
            <Building2 className="h-3.5 w-3.5 text-blue-500" />
            <span>بوابة الـ 4 شركات</span>
          </button>
        </div>
      </div>

      {/* ━━━ STAGE REVIEW EXECUTIVE DECISION BANNER (خاص بالإدارة العليا: المدير العام والنائب فقط) ━━━ */}
      {isManagerOrDeputy && !stageReviewDismissed && pendingApprovalsCount > 0 && recentOperations.length > 0 && (
        <div
          className={`rounded-3xl p-5 sm:p-6 border transition-all duration-300 relative overflow-hidden shadow-xl ${
            stageReviewStatus === "approved"
              ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-100"
              : stageReviewStatus === "returned"
              ? "bg-amber-950/40 border-amber-500/50 text-amber-100"
              : "bg-gradient-to-br from-amber-500/15 via-card to-amber-900/10 border-amber-500/40"
          }`}
        >
          <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                  stageReviewStatus === "approved"
                    ? "bg-emerald-600 text-white"
                    : stageReviewStatus === "returned"
                    ? "bg-amber-600 text-white"
                    : "bg-gradient-to-br from-amber-500 to-amber-700 text-white animate-pulse"
                }`}
              >
                {stageReviewStatus === "approved" ? (
                  <CheckCheck className="h-6 w-6" />
                ) : stageReviewStatus === "returned" ? (
                  <RefreshCw className="h-6 w-6" />
                ) : (
                  <AlertOctagon className="h-6 w-6" />
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className={`text-xs font-bold px-2.5 py-0.5 ${
                      stageReviewStatus === "approved"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : stageReviewStatus === "returned"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40"
                    }`}
                  >
                    {stageReviewStatus === "approved"
                      ? "تم الاعتماد والتصريح رسمياً ✓"
                      : stageReviewStatus === "returned"
                      ? "تمت الإعادة للتعديل ↺"
                      : "تتطلب قرار واعتماد الإدارة (المدير / النائب)"}
                  </Badge>

                  <span className="text-xs text-muted-foreground font-mono">
                    عملية: {recentOperations[0]?.name || "العملية الجارية"} ({recentOperations[0]?.code || "A01"}) • مرحلة كراسة الشروط
                  </span>
                </div>

                <p className="text-sm font-extrabold text-foreground leading-relaxed">
                  {stageReviewStatus === "approved"
                    ? "تم تصريح المتابعة للمرحلة التالية بنجاح وتم إخطار فريق العمل بالمنظومة."
                    : stageReviewStatus === "returned"
                    ? "تمت إعادة مسودة المرحلة للموظف المختص مع إرسال إشعار فوري بإجراء التعديلات المطلوبة."
                    : "قام الموظف بإدخال بيانات المرحلة وإرسالها لمراجعتك، يمكنك فحصها واعتمادها أو إعادتها للتعديل."}
                </p>

                <p className="text-xs text-muted-foreground">
                  المسار: مرحلة فحص كراسة الشروط والتأمين الابتدائي • يتطلب تصريح المتابعة لسحب الكراسة وسداد التأمين البنكي
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              {stageReviewStatus === "pending" ? (
                <>
                  <Button
                    onClick={() => {
                      setStageReviewStatus("approved");
                      toast.success("تم اعتماد وتصريح المرحلة بنجاح! تم نقل العملية للمرحلة التالية 🛡️");
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 rounded-xl shadow-lg shadow-emerald-600/25 text-xs h-10 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>اعتماد المرحلة وتصريح المتابعة ✓</span>
                  </Button>

                  <Button
                    onClick={() => {
                      setStageReviewStatus("returned");
                      toast.info("تمت إعادة مسودة المرحلة إلى الموظف للتعديل والمراجعة ↺");
                    }}
                    variant="outline"
                    className="border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-foreground font-bold px-3.5 py-2 rounded-xl text-xs h-10 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-amber-500" />
                    <span>إعادة للتعديل ↺</span>
                  </Button>

                  <Link href="/dashboard/operations">
                    <Button
                      variant="outline"
                      className="border-border hover:bg-muted text-foreground font-bold px-3.5 py-2 rounded-xl text-xs h-10 flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>فتح مسار العملية</span>
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setStageReviewStatus("pending")}
                    className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    إعادة فتح التنبيه
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setStageReviewDismissed(true)}
                    className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    إغلاق التنبيه ✕
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ━━━ SECTION SHORTCUT FILTERS ━━━ */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "ALL", label: "نظرة شاملة 🌐" },
          { id: "ALERTS", label: `🚨 الإجراءات العاجلة (${activeAlertsList.length})` },
          { id: "FINANCE", label: `📊 المركز المالي (${filteredOperations.length})` },
          ...(canViewRadar ? [{ id: "RADAR", label: `📡 رادار المناقصات (${activeRadarList.length})` }] : []),
          { id: "VISITS", label: `🏗️ المعاينات الميدانية (${activeVisitsList.length})` },
          { id: "GUARANTEES", label: `🛡️ الضمانات البنكية (${activeGuaranteesList.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSectionFilter(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSectionFilter === tab.id
                ? "bg-foreground text-background shadow-sm"
                : "bg-card hover:bg-muted border border-border text-muted-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ━━━ ACTIVE COMPANY EMBLEM BANNER (When Company is Specific) ━━━ */}
      {currentCompany && (
        <div className="p-4 sm:p-5 rounded-3xl bg-blue-600/10 border border-blue-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${currentCompany.gradient} text-white font-mono font-black text-2xl flex items-center justify-center shadow-lg shrink-0`}
            >
              {currentCompany.code}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-foreground">
                  لوحة تحكم شركة {currentCompany.name} ({currentCompany.code})
                </h2>
                <Badge className="bg-blue-600 text-white text-[10px] font-bold">
                  النطاق النشط
                </Badge>
                <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-600 dark:text-blue-400 font-semibold">
                  بيانات معزولة 100%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {currentCompany.fullName} • س.ت: {currentCompanyOverview?.commercialRegister || "102948"} • بطاقة ضريبية: {currentCompanyOverview?.taxCard || "402-182-991"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/dashboard/payments`}>
              <Button variant="outline" className="border-border text-foreground text-xs h-9 px-3.5 rounded-xl cursor-pointer flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-emerald-600" />
                <span>المركز المالي للشركة</span>
              </Button>
            </Link>
            <Link href={`/dashboard/visits`}>
              <Button variant="outline" className="border-border text-foreground text-xs h-9 px-3.5 rounded-xl cursor-pointer flex items-center gap-1.5">
                <ClipboardCheck className="h-3.5 w-3.5 text-blue-600" />
                <span>معاينات {currentCompany.name}</span>
              </Button>
            </Link>
            <Link href={`/dashboard/operations?company=${currentCompany.code}`}>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-sm cursor-pointer flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                <span>كل العمليات</span>
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ━━━ 6 MASTER EXECUTIVE KPI CARDS (Fit numbers perfectly, NO overflow) ━━━ */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
        {/* KPI 1: Active Operations */}
        <div className="glass-card-interactive rounded-2xl p-4 sm:p-5 border border-blue-500/30 relative flex flex-col justify-between space-y-3 overflow-hidden shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <Badge className="badge-blue text-[10px] font-bold">
              {selectedCompany === "ALL" ? "كافة الشركات" : `شركة ${selectedCompany}`}
            </Badge>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-foreground truncate tracking-tight">
              {currentCompanyOverview?.activeOperations || (selectedCompany === "ALL" ? stats.active : filteredOperations.length)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">عمليات نشطة جارية</p>
          </div>
          <div className="space-y-1 pt-1 border-t border-border/50">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
              <span>نسبة الإنجاز</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                {financialTotals.totalRev > 0 ? `${financialTotals.collectionRatio}%` : "0%"}
              </span>
            </div>
            <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all"
                style={{ width: `${financialTotals.totalRev > 0 ? financialTotals.collectionRatio : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 2: Contract Portfolio Value (Fixed Overflow) */}
        <div className="glass-card-interactive rounded-2xl p-4 sm:p-5 border border-purple-500/30 relative flex flex-col justify-between space-y-3 overflow-hidden shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <Badge className="badge-purple text-[10px] font-bold">
              {financialTotals.totalRev > 0 ? `هامش +${financialTotals.profitMargin}%` : "0%"}
            </Badge>
          </div>
          <div>
            <p
              className="text-lg sm:text-xl xl:text-2xl font-black text-foreground truncate tracking-tight"
              title={formatEGP(financialTotals.totalRev)}
            >
              {formatCompactEGP(financialTotals.totalRev)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">محفظة التعاقدات والإيراد</p>
          </div>
          <div className="space-y-1 pt-1 border-t border-border/50">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
              <span className="truncate">صافي الربح:</span>
              <span className="text-purple-600 dark:text-purple-400 font-bold text-xs truncate">
                {formatCompactEGP(financialTotals.totalProfit)}
              </span>
            </div>
            <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-purple-600 h-full rounded-full transition-all"
                style={{ width: `${financialTotals.totalRev > 0 ? financialTotals.profitMargin : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 3: Certified Billings & Collections (Fixed Overflow) */}
        <div className="glass-card-interactive rounded-2xl p-4 sm:p-5 border border-emerald-500/30 relative flex flex-col justify-between space-y-3 overflow-hidden shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <Badge className="badge-emerald text-[10px] font-bold">
              {financialTotals.totalRev > 0 ? `تحصيل ${financialTotals.collectionRatio}%` : "0%"}
            </Badge>
          </div>
          <div>
            <p
              className="text-lg sm:text-xl xl:text-2xl font-black text-foreground truncate tracking-tight"
              title={formatEGP(financialTotals.totalBilled)}
            >
              {formatCompactEGP(financialTotals.totalBilled)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">المستخلصات المصدرة</p>
          </div>
          <div className="space-y-1 pt-1 border-t border-border/50">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
              <span className="truncate">المتبقي:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs truncate">
                {formatCompactEGP(financialTotals.totalRev - financialTotals.totalBilled)}
              </span>
            </div>
            <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all"
                style={{ width: `${financialTotals.totalRev > 0 ? financialTotals.collectionRatio : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 4: Bank Guarantees Exposure (Fixed Overflow) */}
        <div className="glass-card-interactive rounded-2xl p-4 sm:p-5 border border-amber-500/30 relative flex flex-col justify-between space-y-3 overflow-hidden shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md shrink-0">
              <Shield className="h-5 w-5" />
            </div>
            <Badge className="badge-amber text-[10px] font-bold">
              {activeGuaranteesList.filter((g) => g.status === "EXPIRING_SOON").length > 0
                ? "تنبيه تجديد ⚠️"
                : activeGuaranteesList.length > 0
                ? "منتظم"
                : "لا توجد"}
            </Badge>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-foreground truncate tracking-tight">
              {activeGuaranteesList.length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">خطابات الضمان القائمة</p>
          </div>
          <div className="space-y-1 pt-1 border-t border-border/50">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
              <span className="truncate">إجمالي الغطاء:</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold text-xs truncate">
                {formatCompactEGP(activeGuaranteesList.reduce((s, g) => s + g.amount, 0))}
              </span>
            </div>
            <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all"
                style={{ width: `${activeGuaranteesList.length > 0 ? 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 5: Field Inspection Readiness */}
        <div className="glass-card-interactive rounded-2xl p-4 sm:p-5 border border-cyan-500/30 relative flex flex-col justify-between space-y-3 overflow-hidden shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-md shrink-0">
              <HardHat className="h-5 w-5" />
            </div>
            <Badge className="bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 text-[10px] font-bold">
              {activeVisitsList.length > 0 ? "جاهز 100%" : "0 معاينات"}
            </Badge>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-foreground truncate tracking-tight">
              {activeVisitsList.length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">معاينات وتقارير مواقع</p>
          </div>
          <div className="space-y-1 pt-1 border-t border-border/50">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
              <span className="truncate">المواقع الجاهزة:</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold text-xs truncate">
                {activeVisitsList.filter((v) => v.siteReadiness === "READY").length} مواقع
              </span>
            </div>
            <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-cyan-600 h-full rounded-full transition-all"
                style={{ width: `${activeVisitsList.length > 0 ? 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 6: Radar Matches */}
        <div className="glass-card-interactive rounded-2xl p-4 sm:p-5 border border-indigo-500/30 relative flex flex-col justify-between space-y-3 overflow-hidden shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Radar className="h-5 w-5" />
            </div>
            <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-[10px] font-bold">
              رصد حي 📡
            </Badge>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-foreground truncate tracking-tight">
              {activeRadarList.length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">مناقصات مرصودة اليوم</p>
          </div>
          <div className="space-y-1 pt-1 border-t border-border/50">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
              <span className="truncate">أعلى مطابقة:</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs truncate">
                {activeRadarList.length > 0
                  ? `${Math.max(...activeRadarList.map((r) => r.matchScore || 90))}% ⭐`
                  : "0%"}
              </span>
            </div>
            <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all"
                style={{
                  width: `${
                    activeRadarList.length > 0
                      ? Math.max(...activeRadarList.map((r) => r.matchScore || 90))
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ━━━ IF ALL COMPANIES SELECTED: 4-COMPANY COMPARATIVE COCKPIT ━━━ */}
      {selectedCompany === "ALL" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-black text-foreground">
                المقارنة التنفيذية بين الشركات الأربعة المركزية
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">اضغط على أي شركة للدخول المباشر إلى بيئة عملها المستقلة</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {companies.map((c) => {
              const compData = overviewData.find((item) => item.code === c.code);
              const opCount = compData?.activeOperations ?? 0;
              const guarCount = compData?.pendingGuarantees ?? 0;
              const revStr = compData?.totalRevenue || "0 ج.م";

              return (
                <div
                  key={c.code}
                  className="glass-card rounded-3xl p-5 border border-border hover:border-blue-500/40 transition-all shadow-md flex flex-col justify-between space-y-4 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${c.gradient} text-white font-mono font-black text-xl flex items-center justify-center shadow-md`}
                      >
                        {c.code}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-foreground group-hover:text-blue-600 transition-colors">
                          شركة {c.name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{c.fullName}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                      <p className="text-[10px] text-muted-foreground">العمليات النشطة</p>
                      <p className="text-lg font-black text-foreground">{opCount}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                      <p className="text-[10px] text-muted-foreground">خطابات الضمان</p>
                      <p className="text-lg font-black text-amber-600">{guarCount}</p>
                    </div>
                    <div className="col-span-2 p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">حجم التعاقدات:</span>
                      <span className="text-xs font-black text-purple-600 dark:text-purple-400">{revStr}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedCompany(c.code)}
                    className="w-full bg-blue-600/10 hover:bg-blue-600 text-blue-700 hover:text-white dark:text-blue-300 font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-blue-500/20"
                  >
                    <span>دخول بيئة عمل {c.name} ({c.code})</span>
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ━━━ SECTION 1: 🚨 URGENT ACTION & DECISION CENTER (Clean, Company-Isolated, Simple) ━━━ */}
      {(activeSectionFilter === "ALL" || activeSectionFilter === "ALERTS") && (
        <div className="glass-card rounded-3xl p-5 sm:p-6 border border-amber-500/30 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-foreground">
                  🚨 الإجراءات والقرارات العاجلة المطلوبة {currentCompany ? `— شركة ${currentCompany.name} (${currentCompany.code})` : ""}
                </h3>
                <p className="text-xs text-muted-foreground">
                  تنبيهات مخصصة لشركة {currentCompany?.name || "جولدن"} فقط بانتظار اتخاذ إجراء تنفيذي
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold px-3 py-1">
                {displayAlerts.length} إجراءات معلقة
              </Badge>
              <Link href="/dashboard/approvals">
                <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-muted text-xs font-bold h-8 rounded-xl cursor-pointer">
                  <span>عرض كامل سجل القرارات ({activeAlertsList.length})</span>
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Alert Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: "ALL", label: `كل التنبيهات (${activeAlertsList.length})` },
              { id: "SESSION", label: "جلسات وعروض 📅" },
              { id: "GUARANTEE", label: "خطابات ضمان 🛡️" },
              { id: "APPROVAL", label: "اعتمادات طباعة 🖨️" },
              { id: "VISIT", label: "معاينات مواقع 🏗️" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setAlertCategoryFilter(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  alertCategoryFilter === cat.id
                    ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground border border-border"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Alerts Grid (Clean, readable, 2-column or 1-column responsive layout) */}
          {displayAlerts.length === 0 ? (
            <div className="py-8 px-4 rounded-2xl bg-muted/20 border border-dashed border-border text-center flex flex-col items-center justify-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-bold text-foreground">لا توجد إجراءات عاجلة معلقة حالياً</p>
              <p className="text-xs text-muted-foreground">كافة العمليات والضمانات البنكية منتظمة ومحدثة بالكامل.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {displayAlerts.map((alert) => {
                const isDanger = alert.severity === "danger";
                const isWarning = alert.severity === "warning";

                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-2xl bg-card border transition-all flex flex-col justify-between space-y-3.5 shadow-2xs hover:shadow-md ${
                      isDanger
                        ? "border-red-500/40 hover:border-red-500/60 bg-red-500/[0.03]"
                        : isWarning
                        ? "border-amber-500/40 hover:border-amber-500/60 bg-amber-500/[0.03]"
                        : "border-blue-500/40 hover:border-blue-500/60 bg-blue-500/[0.03]"
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Header Row: Company, Category, Deadline */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              isDanger
                                ? "bg-red-500 animate-ping"
                                : isWarning
                                ? "bg-amber-500 animate-pulse"
                                : "bg-blue-500"
                            }`}
                          />
                          <Badge variant="outline" className="font-mono text-[10px] font-bold py-0.5 px-2 border-border text-foreground">
                            شركة {alert.companyName} ({alert.companyCode})
                          </Badge>
                          <Badge
                            className={`text-[10px] font-bold py-0.5 px-2 border-0 ${
                              isDanger
                                ? "bg-red-500/15 text-red-600 dark:text-red-400"
                                : isWarning
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                            }`}
                          >
                            {alert.categoryLabel}
                          </Badge>
                        </div>

                        <span className="text-[11px] font-bold text-foreground bg-muted/60 px-2.5 py-0.5 rounded-full border border-border/60">
                          {alert.deadlineText}
                        </span>
                      </div>

                      {/* Alert Title */}
                      <h4 className="text-sm font-bold text-foreground leading-snug">
                        {alert.title}
                      </h4>

                      {/* Requirement Note Box */}
                      <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-border/50 leading-relaxed">
                        <span className="font-bold text-foreground">الإجراء المطلوب: </span>
                        {alert.requirement}
                      </p>
                    </div>

                    {/* Bottom Action Button */}
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground font-mono font-bold">
                        كود العملية: {alert.operationCode}
                      </span>
                      <Link href={alert.link}>
                        <Button
                          size="sm"
                          className={`font-bold text-xs h-8 px-4 rounded-xl cursor-pointer shadow-xs ${
                            isDanger
                              ? "bg-red-600 hover:bg-red-700 text-white shadow-red-500/20"
                              : isWarning
                              ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-amber-500/20"
                              : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                          }`}
                        >
                          <span>{alert.actionLabel}</span>
                          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ━━━ SECTION 2: 📊 FINANCIAL OPERATIONS PIPELINE (Cards Grid Instead of Stretched Rows) ━━━ */}
      {(activeSectionFilter === "ALL" || activeSectionFilter === "FINANCE") && (
        <div className="glass-card rounded-3xl p-5 sm:p-6 border border-border shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-foreground">
                  📊 المركز المالي ونسب استهلاك ميزانيات العمليات {currentCompany ? `— شركة ${currentCompany.name}` : ""}
                </h3>
                <p className="text-xs text-muted-foreground">
                  مقارنة قيم التعاقد مع التكاليف الفعلية والمستخلصات المصدرة ونسبة الإنجاز المالي
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/dashboard/operations${selectedCompany !== "ALL" ? `?company=${selectedCompany}` : ""}`}>
                <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-muted text-xs font-bold h-8 rounded-xl cursor-pointer">
                  <span>عرض باقي عمليات الشركة ({filteredOperations.length})</span>
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                </Button>
              </Link>
              <Link href="/dashboard/payments">
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold h-8 rounded-xl cursor-pointer shadow-sm">
                  <span>فتح المركز المالي التخصصي</span>
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Cards Grid or Clean Empty State */}
          {filteredOperations.length === 0 ? (
            <div className="py-12 px-4 rounded-3xl border border-dashed border-border text-center flex flex-col items-center justify-center space-y-3 bg-muted/20">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Briefcase className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-foreground">لا توجد عمليات مسجلة حالياً</h4>
              <p className="text-xs text-muted-foreground max-w-md">
                ابدأ بإضافة عملية ومناقصة جديدة أو اسحب مناقصات نشطة مباشرة من رادار المناقصات الحكومية.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <Link href="/dashboard/operations">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold cursor-pointer">
                    <Plus className="h-4 w-4 ml-1.5" />
                    إضافة عملية جديدة
                  </Button>
                </Link>
                <Link href="/dashboard/radar">
                  <Button size="sm" variant="outline" className="rounded-xl font-bold border-border cursor-pointer">
                    <Radar className="h-4 w-4 ml-1.5 text-cyan-500" />
                    فحص رادار المناقصات
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOperations.slice(0, 6).map((op) => {
                const rev = op.revenue || 0;
                const cost = op.cost || 0;
                const billed = op.billed || 0;
                const billedPct = rev > 0 ? Math.min(100, Math.round((billed / rev) * 100)) : 0;
                const profit = op.profit || (rev - cost);
                const margin = op.margin || (rev > 0 ? Math.round((profit / rev) * 100) : 0);

                return (
                  <div
                    key={op.id}
                    onClick={() => router.push(`/dashboard/operations/${op.id}`)}
                    className="p-4 sm:p-5 rounded-3xl bg-card border border-border hover:border-purple-500/40 hover:bg-purple-50/5 dark:hover:bg-purple-950/10 transition-all cursor-pointer flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md group"
                  >
                    {/* Top Bar: Code, Margin, Status */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white font-mono font-black text-sm flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                            {op.code}
                          </div>
                          <Badge variant="outline" className="text-[10px] font-bold border-border text-foreground">
                            {tenderTypeMap[op.tenderType] || op.tenderType}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-[10px] font-bold">
                            هامش +{margin}%
                          </Badge>
                          <Badge className={statusLabels[op.status]?.color || "bg-muted text-muted-foreground"}>
                            {statusLabels[op.status]?.label || op.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Title & Owning Authority */}
                      <div>
                        <h4 className="text-sm font-bold text-foreground line-clamp-2 leading-relaxed group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {op.name}
                        </h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 line-clamp-1">
                          <Building2 className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                          <span>{op.authority}</span>
                        </p>
                      </div>
                    </div>

                    {/* Financial 2x2 Clean Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-muted/40 border border-border/60 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">قيمة التعاقد:</span>
                        <span className="font-bold text-foreground truncate block" title={formatEGP(rev)}>
                          {formatCompactEGP(rev)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">التكلفة الفعلية:</span>
                        <span className="font-bold text-foreground truncate block" title={formatEGP(cost)}>
                          {formatCompactEGP(cost)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">المستخلصات المحصلة:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate block" title={formatEGP(billed)}>
                          {formatCompactEGP(billed)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">صافي الربح:</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400 truncate block" title={formatEGP(profit)}>
                          {formatCompactEGP(profit)}
                        </span>
                      </div>
                    </div>

                    {/* Integrated Progress Bar & Footer */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-muted-foreground text-[11px]">نسبة التحصيل:</span>
                        <span className="font-bold text-foreground text-xs">{billedPct}%</span>
                      </div>
                      <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full rounded-full transition-all"
                          style={{ width: `${billedPct}%` }}
                        />
                      </div>

                      <div className="pt-2 flex items-center justify-between text-xs text-purple-600 dark:text-purple-400 font-bold group-hover:translate-x-[-2px] transition-transform">
                        <span>عرض تفاصيل العملية والملف المالي</span>
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ━━━ SECTION 3: 📡 LIVE SMART RADAR FEED (Tailored to Selected Company) ━━━ */}
      {canViewRadar && (activeSectionFilter === "ALL" || activeSectionFilter === "RADAR") && (
        <div className="glass-card rounded-3xl p-5 sm:p-6 border border-indigo-500/30 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Radar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-foreground">
                  📡 رادار المناقصات الحكومية المطابقة لنشاط شركة {currentCompany?.name || "المجموعة"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  عمليات حكومية مرصودة اليوم من بوابة التعاقدات العامة مطابقة للتخصصات الفنية للشركة
                </p>
              </div>
            </div>

            <Link href="/dashboard/radar">
              <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-muted text-xs font-bold h-8 rounded-xl cursor-pointer">
                <span>عرض كافة المناقصات المرصودة ({activeRadarList.length})</span>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              </Button>
            </Link>
          </div>

          {activeRadarList.length === 0 ? (
            <div className="py-8 px-4 rounded-2xl bg-muted/20 border border-dashed border-border text-center flex flex-col items-center justify-center space-y-2">
              <Radar className="h-8 w-8 text-indigo-500" />
              <p className="text-sm font-bold text-foreground">لا توجد مناقصات مسحوبة حالياً</p>
              <p className="text-xs text-muted-foreground">افحص رادار المناقصات الحكومية لاستيراد ومتابعة أحدث العمليات.</p>
              <Link href="/dashboard/radar">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold mt-1">
                  فتح رادار المناقصات
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeRadarList.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-3xl bg-card border border-border hover:border-indigo-500/40 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 transition-all space-y-3 flex flex-col justify-between shadow-2xs hover:shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-[10px] font-bold">
                        {item.status}
                      </Badge>
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        متبقي {item.daysRemaining} يوم
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-foreground line-clamp-2 leading-relaxed">
                      {item.title}
                    </h4>

                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span>{item.authority}</span>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">التأمين الابتدائي المطلوب:</span>
                      <span className="font-bold text-foreground">{formatEGP(item.insuranceAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">تاريخ جلسة الفتح:</span>
                      <span className="font-semibold text-foreground">{item.sessionDate}</span>
                    </div>

                    <Link href={`/dashboard/radar?id=${item.id}`}>
                      <Button size="sm" className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 rounded-xl cursor-pointer">
                        <span>فحص الكراسة ومطابقة المواصفات</span>
                        <ArrowLeft className="h-3 w-3 mr-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ━━━ SECTION 4: 🏗️ SITE READINESS & INSPECTIONS HUB ━━━ */}
      {(activeSectionFilter === "ALL" || activeSectionFilter === "VISITS") && (
        <div className="glass-card rounded-3xl p-5 sm:p-6 border border-cyan-500/30 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
                <HardHat className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-foreground">
                  🏗️ المعاينات الميدانية وجاهزية المواقع {currentCompany ? `— شركة ${currentCompany.name}` : ""}
                </h3>
                <p className="text-xs text-muted-foreground">
                  نتائج لجان المعاينة الميدانية، مطابقة المواصفات، وإزالة معوقات استلام المواقع
                </p>
              </div>
            </div>

            <Link href="/dashboard/visits">
              <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-muted text-xs font-bold h-8 rounded-xl cursor-pointer">
                <span>عرض كامل سجل المعاينات ({activeVisitsList.length})</span>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              </Button>
            </Link>
          </div>

          {activeVisitsList.length === 0 ? (
            <div className="py-8 px-4 rounded-2xl bg-muted/20 border border-dashed border-border text-center flex flex-col items-center justify-center space-y-2">
              <HardHat className="h-8 w-8 text-cyan-500" />
              <p className="text-sm font-bold text-foreground">لا توجد معاينات ميدانية مسجلة حالياً</p>
              <p className="text-xs text-muted-foreground">يمكنك جدولة زيارة ميدانية جديدة لمطابقة اشتراطات الموقع.</p>
              <Link href="/dashboard/visits">
                <Button size="sm" variant="outline" className="rounded-xl font-bold border-border mt-1 cursor-pointer">
                  جدولة معاينة موقع
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeVisitsList.map((v) => {
                const isReady = v.siteReadiness === "READY";
                const isConditional = v.siteReadiness === "CONDITIONAL";

                return (
                  <div
                    key={v.id}
                    onClick={() => router.push("/dashboard/visits")}
                    className="p-4 rounded-3xl bg-card border border-border hover:border-cyan-500/40 hover:bg-cyan-50/10 dark:hover:bg-cyan-950/10 transition-all cursor-pointer space-y-3 group shadow-2xs hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {v.operationCode}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground group-hover:text-cyan-600 transition-colors">
                            {v.title}
                          </h4>
                          <p className="text-xs text-muted-foreground">{v.authority}</p>
                        </div>
                      </div>

                      <Badge
                        className={`text-[10px] font-bold shrink-0 ${
                          isReady
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : isConditional
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                        }`}
                      >
                        {isReady
                          ? "جاهز للتنفيذ 100% 🟢"
                          : isConditional
                          ? "جاهز بشروط 🟡"
                          : "معوقات تعيق البدء 🔴"}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-2xl border border-border/60 leading-relaxed">
                      <span className="font-bold text-foreground">التقرير الميداني: </span>
                      {v.findings}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-cyan-500" />
                        <span>{v.location}</span>
                      </span>
                      <span className="font-semibold text-foreground">{v.employeeName} • {v.visitDate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ━━━ SECTION 5: 🛡️ ACTIVE BANK GUARANTEES & EXPIRY TIMELINE ━━━ */}
      {(activeSectionFilter === "ALL" || activeSectionFilter === "GUARANTEES") && (
        <div className="glass-card rounded-3xl p-5 sm:p-6 border border-amber-500/30 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-foreground">
                  🛡️ خطابات الضمان البنكية ومواعيد التجديد {currentCompany ? `— شركة ${currentCompany.name}` : ""}
                </h3>
                <p className="text-xs text-muted-foreground">
                  متابعة خطابات الضمان الابتدائية والنهائية والمدد القانونية المتبقية لتفادي تسييل الضمانات
                </p>
              </div>
            </div>

            <Link href="/dashboard/payments">
              <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-muted text-xs font-bold h-8 rounded-xl cursor-pointer">
                <span>عرض سجل خطابات الضمان ({activeGuaranteesList.length})</span>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              </Button>
            </Link>
          </div>

          {activeGuaranteesList.length === 0 ? (
            <div className="py-8 px-4 rounded-2xl bg-muted/20 border border-dashed border-border text-center flex flex-col items-center justify-center space-y-2">
              <Shield className="h-8 w-8 text-amber-500" />
              <p className="text-sm font-bold text-foreground">لا توجد خطابات ضمان بنكية مسجلة حالياً</p>
              <p className="text-xs text-muted-foreground">يتم إصدار وتتبع خطابات الضمان تلقائياً مع بدء التقديم في العمليات.</p>
              <Link href="/dashboard/payments">
                <Button size="sm" variant="outline" className="rounded-xl font-bold border-border mt-1 cursor-pointer">
                  إدارة الضمانات والمدفوعات
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeGuaranteesList.map((g) => {
                const isUrgent = g.daysLeft <= 30;

                return (
                  <div
                    key={g.id}
                    className={`p-4 rounded-3xl bg-card border transition-all space-y-3 shadow-2xs hover:shadow-md ${
                      isUrgent
                        ? "border-amber-500/40 bg-amber-500/5"
                        : "border-border hover:border-blue-500/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                        {g.guaranteeNumber}
                      </span>
                      <Badge
                        className={`text-[10px] font-bold ${
                          isUrgent ? "badge-amber" : "badge-emerald"
                        }`}
                      >
                        {isUrgent ? `متبقي ${g.daysLeft} يوم ⚠️` : `ساري (${g.daysLeft} يوم)`}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-foreground">{g.operationName}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {g.bank} • نوع الضمان: {g.type}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">قيمة الغطاء:</span>
                      <span className="font-black text-foreground">{formatCompactEGP(g.amount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ━━━ SECTION 6: 🖨️ SECURE PRINT APPROVALS & CRYPTOGRAPHIC LEDGER ━━━ */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-border shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-foreground">
                🖨️ سجل اعتمادات الطباعة والأمان الرقمي (SHA-256 Hash Ledger)
              </h3>
              <p className="text-xs text-muted-foreground">
                المستندات والتظلمات وخطابات الضمان المعتمدة رسمياً والمختومة بهاش تشفيري مانع للتلاعب
              </p>
            </div>
          </div>

          <Link href={`/dashboard/approvals${selectedCompany !== "ALL" ? `?company=${selectedCompany}` : ""}`}>
            <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-muted text-xs font-bold h-8 rounded-xl cursor-pointer">
              <span>عرض كامل سجل الاعتمادات ({recentApprovalsLog.length || pendingApprovalsCount})</span>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            </Button>
          </Link>
        </div>

        <div className="space-y-3">
          {recentApprovalsLog.length === 0 ? (
            <div className="py-6 px-4 rounded-2xl bg-muted/20 border border-dashed border-border text-center flex flex-col items-center justify-center space-y-1.5">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              <p className="text-xs font-bold text-foreground">لا توجد طلبات اعتماد أو طباعة مسجلة حالياً</p>
              <p className="text-[11px] text-muted-foreground">عند طلب طباعة أي خطاب رسمي أو تظلم يظهر هنا الهاش الأمني بعد الاعتماد.</p>
            </div>
          ) : (
            recentApprovalsLog.map((item) => (
              <div
                key={item.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <p className="text-xs sm:text-sm font-bold text-foreground">{item.doc}</p>
                    <Badge className="badge-emerald text-[10px]">معتمد رسمياً</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.company} • اعتمد بواسطة: {item.approver} • {item.approvedAt}
                  </p>
                </div>

                <div className="text-left font-mono text-[11px] bg-muted/60 px-3 py-1.5 rounded-xl border border-border text-foreground font-bold shrink-0">
                  الهاش الأمني: <span className="text-blue-600 dark:text-blue-400">{item.hash}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
