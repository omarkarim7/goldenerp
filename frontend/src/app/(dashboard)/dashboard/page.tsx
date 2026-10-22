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
  Send, AlertOctagon, HelpCircle, ClipboardCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/context/notifications-context";
import { useCompany, CompanyCode } from "@/context/company-context";
import { API_BASE_URL } from "@/lib/api";

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
  revenue?: number;
  cost?: number;
  profit?: number;
  margin?: number;
  billed?: number;
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
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(3);
  const [activeSectionFilter, setActiveSectionFilter] = useState<"ALL" | "ALERTS" | "FINANCE" | "RADAR" | "VISITS" | "GUARANTEES">("ALL");

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
        const token = localStorage.getItem("accessToken");
        const apiBase = API_BASE_URL;

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
          const opRes = await fetch(`${apiBase}/api/operations?limit=15${compParam}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (opRes.ok) {
            const ops = await opRes.json();
            if (Array.isArray(ops) && ops.length > 0) {
              setRecentOperations(
                ops.map((o: any) => {
                  const fin = o.operationFinance;
                  const rev = fin ? Number(fin.totalRevenue) : 1500000;
                  const cost = fin ? Number(fin.totalCost) : 1050000;
                  const profit = fin ? Number(fin.netProfit) : (rev - cost);
                  const margin = rev > 0 ? (profit / rev) * 100 : 30;
                  const certsTotal = (o.certificates || []).reduce(
                    (s: number, c: any) => s + (Number(c.netAmount) || Number(c.grossAmount) || 0),
                    0
                  );

                  return {
                    id: o.id,
                    name: o.name,
                    authority: o.authority || "جهة حكومية",
                    tenderType: o.tenderType || "TENDER",
                    status: o.status || "AWARDED",
                    code: o.companies?.[0]?.displayCode || `${selectedCompany === "ALL" ? "A" : selectedCompany}15`,
                    companyName: o.companies?.[0]?.company?.name || `شركة ${selectedCompany || "جولدن"}`,
                    companyCode: o.companies?.[0]?.company?.code || selectedCompany || "A",
                    revenue: rev,
                    cost: cost,
                    profit: profit,
                    margin: Math.round(margin * 10) / 10,
                    billed: certsTotal > 0 ? certsTotal : Math.round(rev * 0.65),
                  };
                })
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

  // Demo fallback operations if DB has few entries
  const companyDemoOperations: Record<string, OperationItem[]> = {
    A: [
      {
        id: "demo-a1",
        code: "A15",
        name: "توريد وتركيب شبكة كابلات محولات الجهد المتوسط",
        authority: "هيئة المجتمعات العمرانية الجديدة",
        tenderType: "TENDER",
        status: "SUPPLY_IN_PROGRESS",
        companyName: "المجموعة الذهبية (A)",
        companyCode: "A",
        revenue: 2850000,
        cost: 1980000,
        profit: 870000,
        margin: 30.5,
        billed: 1720000,
      },
      {
        id: "demo-a2",
        code: "A12",
        name: "توريد وتركيب منظومة كاميرات المراقبة وغرفة التحكم",
        authority: "مديرية أمن الجيزة",
        tenderType: "PRACTICE",
        status: "AWARDED",
        companyName: "المجموعة الذهبية (A)",
        companyCode: "A",
        revenue: 1800000,
        cost: 1490000,
        profit: 310000,
        margin: 17.2,
        billed: 650000,
      },
      {
        id: "demo-a3",
        code: "A09",
        name: "أعمال الإحلال والتجديد لمحطات الرفع والضخ المركزية",
        authority: "شركة مياه الشرب والصرف الصحي بالجيزة",
        tenderType: "TENDER",
        status: "TECHNICAL_ACCEPTED",
        companyName: "المجموعة الذهبية (A)",
        companyCode: "A",
        revenue: 1200000,
        cost: 880000,
        profit: 320000,
        margin: 26.7,
        billed: 0,
      },
    ],
    B: [
      {
        id: "demo-b1",
        code: "B08",
        name: "إحلال وتجديد كابلات الفايبر والسنترالات المركزية",
        authority: "وزارة الاتصالات وتكنولوجيا المعلومات",
        tenderType: "TENDER",
        status: "SUPPLY_IN_PROGRESS",
        companyName: "العالمية للتوريدات (B)",
        companyCode: "B",
        revenue: 1450000,
        cost: 1120000,
        profit: 330000,
        margin: 22.8,
        billed: 980000,
      },
      {
        id: "demo-b2",
        code: "B04",
        name: "توريد مهمات الوقاية وأجهزة الرعاية الطبية الفائقة",
        authority: "الهيئة العامة للتأمين الصحي",
        tenderType: "PRACTICE",
        status: "AWARDED",
        companyName: "العالمية للتوريدات (B)",
        companyCode: "B",
        revenue: 1950000,
        cost: 1430000,
        profit: 520000,
        margin: 26.7,
        billed: 1000000,
      },
    ],
    C: [
      {
        id: "demo-c1",
        code: "C04",
        name: "تجهيز وتأثيث معامل الحاسب الآلي وغرف الخوادم",
        authority: "الهيئة العامة للأبنية التعليمية",
        tenderType: "TENDER",
        status: "COMPLETED",
        companyName: "المتحدة للمقاولات (C)",
        companyCode: "C",
        revenue: 920000,
        cost: 680000,
        profit: 240000,
        margin: 26.1,
        billed: 920000,
      },
      {
        id: "demo-c2",
        code: "C07",
        name: "أعمال الصيانة المتكاملة وتطوير مجمع المدارس التجريبية",
        authority: "مديرية التربية والتعليم بالقاهرة",
        tenderType: "DIRECT_ORDER",
        status: "SUPPLY_IN_PROGRESS",
        companyName: "المتحدة للمقاولات (C)",
        companyCode: "C",
        revenue: 1230000,
        cost: 900000,
        profit: 330000,
        margin: 26.8,
        billed: 530000,
      },
    ],
    D: [
      {
        id: "demo-d1",
        code: "D05",
        name: "أعمال العزل الحراري والمائي لمباني الخدمات المركزية",
        authority: "جهاز تنمية مدينة 6 أكتوبر",
        tenderType: "TENDER",
        status: "TECHNICAL_ACCEPTED",
        companyName: "الحديثة للخدمات الهندسية (D)",
        companyCode: "D",
        revenue: 1100000,
        cost: 820000,
        profit: 280000,
        margin: 25.5,
        billed: 350000,
      },
      {
        id: "demo-d2",
        code: "D03",
        name: "تحديث وتطوير شبكات الإنذار ومكافحة الحريق الآلي",
        authority: "الهيئة العامة للموانئ البرية والجافة",
        tenderType: "LIMITED_TENDER",
        status: "AWARDED",
        companyName: "الحديثة للخدمات الهندسية (D)",
        companyCode: "D",
        revenue: 750000,
        cost: 530000,
        profit: 220000,
        margin: 29.3,
        billed: 750000,
      },
    ],
  };

  // Filter operations based on selected company
  const filteredOperations = useMemo(() => {
    if (selectedCompany === "ALL") {
      if (recentOperations.length > 0) return recentOperations;
      return Object.values(companyDemoOperations).flat();
    }
    const fromApi = recentOperations.filter(
      (op) => op.companyCode === selectedCompany || op.code.startsWith(selectedCompany)
    );
    if (fromApi.length > 0) return fromApi;
    return companyDemoOperations[selectedCompany] || [];
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
    const profitMargin = totalRev > 0 ? (totalProfit / totalRev) * 100 : 28.5;
    const collectionRatio = totalRev > 0 ? (totalBilled / totalRev) * 100 : 65;

    return {
      totalRev: totalRev > 0 ? totalRev : 5850000,
      totalCost: totalCost > 0 ? totalCost : 4120000,
      totalProfit: totalProfit > 0 ? totalProfit : 1730000,
      totalBilled: totalBilled > 0 ? totalBilled : 3520000,
      profitMargin: Math.round(profitMargin * 10) / 10,
      collectionRatio: Math.round(collectionRatio * 10) / 10,
    };
  }, [filteredOperations]);

  // Company-tailored Radar Tenders
  const companyRadarTenders: Record<string, RadarItemBrief[]> = {
    A: [
      {
        id: "rad-a1",
        title: "توريد وتركيب كابلات نحاسية معزولة ومحولات قدرة 1000 ك.ف.أ",
        authority: "جهاز مدينة بدر الجديدة",
        insuranceAmount: 180000,
        sessionDate: "2026-11-05",
        daysRemaining: 13,
        matchScore: 96,
        status: "تم رصدها اليوم 🟢",
      },
      {
        id: "rad-a2",
        title: "توريد كاميرات مراقبة رقمية IP مع منظومة تسجيل شبكي NVR ومغذيات UPS",
        authority: "مديرية الشؤون الصحية بمحافظة القاهرة",
        insuranceAmount: 95000,
        sessionDate: "2026-11-12",
        daysRemaining: 20,
        matchScore: 92,
        status: "مطابقة عالية ⭐",
      },
      {
        id: "rad-a3",
        title: "إحلال وتجديد لوحات الجهد المنخفض والمحركات الكهربائية بمحطة رفع جنوب",
        authority: "شركة مياه الشرب والصرف الصحي بالقليوبية",
        insuranceAmount: 140000,
        sessionDate: "2026-11-18",
        daysRemaining: 26,
        matchScore: 89,
        status: "جلسة قريبة ⏳",
      },
    ],
    B: [
      {
        id: "rad-b1",
        title: "تجهيز وتوريد شبكات ألياف ضوئية FTTH ومسارات كابلات أرضية ذكية",
        authority: "الشركة المصرية للاتصالات",
        insuranceAmount: 120000,
        sessionDate: "2026-11-08",
        daysRemaining: 16,
        matchScore: 95,
        status: "تم رصدها اليوم 🟢",
      },
      {
        id: "rad-b2",
        title: "توريد أجهزة حماية وتنفس صناعي ومهمات وقاية متطورة للمستشفيات",
        authority: "الهيئة المصرية للشراء الموحد",
        insuranceAmount: 85000,
        sessionDate: "2026-11-15",
        daysRemaining: 23,
        matchScore: 91,
        status: "مطابقة عالية ⭐",
      },
    ],
    C: [
      {
        id: "rad-c1",
        title: "توريد معامل حاسب آلي وتحديث خوادم التخزين السحابي للمدارس التكنولوجية",
        authority: "الهيئة العامة للأبنية التعليمية",
        insuranceAmount: 110000,
        sessionDate: "2026-11-09",
        daysRemaining: 17,
        matchScore: 94,
        status: "تم رصدها اليوم 🟢",
      },
      {
        id: "rad-c2",
        title: "أعمال الصيانة الإنشائية والترميمات المتكاملة لمباني القطاع الأوسط",
        authority: "هيئة النقل العام بالقاهرة",
        insuranceAmount: 60000,
        sessionDate: "2026-11-20",
        daysRemaining: 28,
        matchScore: 88,
        status: "مطابقة عالية ⭐",
      },
    ],
    D: [
      {
        id: "rad-d1",
        title: "أعمال العزل المائي والحراري المطور لأسطح المستودعات المركزية",
        authority: "جامعة حلوان — إدارة المشروعات الهندسية",
        insuranceAmount: 75000,
        sessionDate: "2026-11-06",
        daysRemaining: 14,
        matchScore: 97,
        status: "تم رصدها اليوم 🟢",
      },
      {
        id: "rad-d2",
        title: "توريد وتركيب شبكات إطفاء الحريق التلقائي بالغاز FM200 لغرف المحولات",
        authority: "ميناء القاهرة الجوي — مبنى 2",
        insuranceAmount: 90000,
        sessionDate: "2026-11-14",
        daysRemaining: 22,
        matchScore: 93,
        status: "مطابقة عالية ⭐",
      },
    ],
  };

  const activeRadarList: RadarItemBrief[] = useMemo(() => {
    if (selectedCompany === "ALL") {
      return Object.values(companyRadarTenders).flat().slice(0, 5);
    }
    return companyRadarTenders[selectedCompany] || [];
  }, [selectedCompany]);

  // Company-tailored Site Inspection Visits
  const companyVisits: Record<string, VisitItemBrief[]> = {
    A: [
      {
        id: "v-a1",
        title: "معاينة مسارات شبكة كابلات الجهد المتوسط وغرف المحولات",
        authority: "هيئة المجتمعات العمرانية الجديدة",
        location: "العاصمة الإدارية الجديدة — محيط محطة التوزيع المركزية",
        employeeName: "م. أحمد الشريف",
        operationCode: "A15",
        visitDate: "2026-10-24",
        siteReadiness: "READY",
        findings: "الموقع خالي من العوائق ومسارات الحفر مستوفاة للمخططات بنسبة 100%.",
      },
      {
        id: "v-a2",
        title: "معاينة نقاط تركيب كاميرات المراقبة وغرفة التحكم",
        authority: "مديرية أمن الجيزة",
        location: "إدارة 6 أكتوبر التعليمية — مجمع المدارس",
        employeeName: "م. حسام الدين نبيل",
        operationCode: "A12",
        visitDate: "2026-10-28",
        siteReadiness: "CONDITIONAL",
        findings: "الموقع جاهز فنياً مع اشتراط استكمال تصاريح التكسير ومجاري الكابلات.",
      },
      {
        id: "v-a3",
        title: "فحص قواعد الطلمبات وخطوط الطرد بمحطة رفع الصرف",
        authority: "شركة مياه الشرب والصرف الصحي بالجيزة",
        location: "محطة الحوامدية الرئيسية",
        employeeName: "م. أحمد الشريف",
        operationCode: "A09",
        visitDate: "2026-10-18",
        siteReadiness: "READY",
        findings: "تم استلام القواعد واعتماد نقاط التثبيت للطلمبات الجديدة بنجاح.",
      },
    ],
    B: [
      {
        id: "v-b1",
        title: "حضور جلسة الاستفسارات وفحص غرف السنترالات ومسارات الفايبر",
        authority: "وزارة الاتصالات وتكنولوجيا المعلومات",
        location: "القرية الذكية — مبنى B12 الرئيسي",
        employeeName: "أ. محمود عبد الرحمن",
        operationCode: "B08",
        visitDate: "2026-10-26",
        siteReadiness: "CONDITIONAL",
        findings: "الموقع بانتظار إخلاء الكابلات القديمة ونشر الملحق الفني المعتمد.",
      },
      {
        id: "v-b2",
        title: "معاينة مخازن مهمات الوقاية الطبية والفحص الظاهري",
        authority: "التأمين الصحي — مخازن العامرية",
        location: "مخازن الهيئة بالعامرية — الإسكندرية",
        employeeName: "د. إيهاب زكريا",
        operationCode: "B04",
        visitDate: "2026-10-20",
        siteReadiness: "READY",
        findings: "المستودع مكيف ومجهز بالكامل ومستوفٍ لكافة اشتراطات السلامة والجودة.",
      },
    ],
    C: [
      {
        id: "v-c1",
        title: "فحص واختبار عينات معامل الحاسب ومطابقة قاعات التدريب",
        authority: "الهيئة العامة للأبنية التعليمية",
        location: "مجمع مدينة نصر المركزي",
        employeeName: "م. كريم صلاح",
        operationCode: "C04",
        visitDate: "2026-10-22",
        siteReadiness: "READY",
        findings: "اجتازت جميع العينات الفحص الفني وتم توقيع المحضر الرسمي بنجاح.",
      },
      {
        id: "v-c2",
        title: "معاينة أسطح وقاعات التدريس بمجمع المدارس التجريبية",
        authority: "تعليم القاهرة — إدارة النزهة",
        location: "مجمع المدارس التجريبية — النزهة الجديدة",
        employeeName: "م. كريم صلاح",
        operationCode: "C07",
        visitDate: "2026-10-30",
        siteReadiness: "CONDITIONAL",
        findings: "تنسيق مسبق مطلوب مع إدارة المدرسة للعمل خارج أوقات اليوم الدراسي.",
      },
    ],
    D: [
      {
        id: "v-d1",
        title: "معاينة أسطح مباني مجمع الخدمات وقياس مناسيب العزل",
        authority: "جهاز مدينة 6 أكتوبر",
        location: "المحور المركزي — مجمع الخدمات",
        employeeName: "م. تامر الشاذلي",
        operationCode: "D05",
        visitDate: "2026-10-25",
        siteReadiness: "BLOCKED",
        findings: "تراكم مياه أمطار ورواسب تستوجب كشط السطح أولاً قبل فرد العزل.",
      },
      {
        id: "v-d2",
        title: "اختبار ومطابقة مضخات مكافحة الحريق الآلي",
        authority: "الهيئة العامة للموانئ الجافة — ميناء السادس من أكتوبر",
        location: "الميناء الجاف بمدينة السادس من أكتوبر",
        employeeName: "م. تامر الشاذلي",
        operationCode: "D03",
        visitDate: "2026-10-15",
        siteReadiness: "READY",
        findings: "تم تشغيل الخط التبادلي للمضخات بنجاح والضغوط مطابقة للمواصفات.",
      },
    ],
  };

  const activeVisitsList: VisitItemBrief[] = useMemo(() => {
    if (selectedCompany === "ALL") {
      return Object.values(companyVisits).flat().slice(0, 4);
    }
    return companyVisits[selectedCompany] || [];
  }, [selectedCompany]);

  // Company-tailored Bank Guarantees
  const companyGuarantees: Record<string, GuaranteeItemBrief[]> = {
    A: [
      {
        id: "g-a1",
        guaranteeNumber: "LG-NBE-8821",
        bank: "البنك الأهلي المصري",
        type: "ابتدائي (2%)",
        amount: 142500,
        validUntil: "2026-12-15",
        daysLeft: 53,
        operationCode: "A15",
        operationName: "شبكة كابلات محولات الجهد المتوسط",
        status: "ACTIVE",
      },
      {
        id: "g-a2",
        guaranteeNumber: "LG-MISR-4109",
        bank: "بنك مصر",
        type: "نهائي (5%)",
        amount: 90000,
        validUntil: "2026-11-10",
        daysLeft: 18,
        operationCode: "A12",
        operationName: "منظومة كاميرات المراقبة وغرفة التحكم",
        status: "EXPIRING_SOON",
      },
      {
        id: "g-a3",
        guaranteeNumber: "LG-CIB-5520",
        bank: "البنك التجاري الدولي CIB",
        type: "دفعة مقدمة (10%)",
        amount: 285000,
        validUntil: "2027-02-28",
        daysLeft: 128,
        operationCode: "A15",
        operationName: "شبكة كابلات محولات الجهد المتوسط",
        status: "ACTIVE",
      },
    ],
    B: [
      {
        id: "g-b1",
        guaranteeNumber: "LG-CIB-9912",
        bank: "البنك التجاري الدولي CIB",
        type: "ابتدائي (2%)",
        amount: 72500,
        validUntil: "2026-11-20",
        daysLeft: 28,
        operationCode: "B08",
        operationName: "إحلال وتجديد كابلات الفايبر",
        status: "EXPIRING_SOON",
      },
      {
        id: "g-b2",
        guaranteeNumber: "LG-NBE-7714",
        bank: "البنك الأهلي المصري",
        type: "نهائي (5%)",
        amount: 97500,
        validUntil: "2027-01-15",
        daysLeft: 84,
        operationCode: "B04",
        operationName: "توريد مهمات الوقاية الطبية",
        status: "ACTIVE",
      },
    ],
    C: [
      {
        id: "g-c1",
        guaranteeNumber: "LG-CAI-3301",
        bank: "بنك القاهرة",
        type: "ابتدائي (2%)",
        amount: 46000,
        validUntil: "2026-12-01",
        daysLeft: 39,
        operationCode: "C04",
        operationName: "تجهيز معامل الحاسب الآلي",
        status: "ACTIVE",
      },
    ],
    D: [
      {
        id: "g-d1",
        guaranteeNumber: "LG-ALEX-1102",
        bank: "بنك الإسكندرية",
        type: "ابتدائي (2%)",
        amount: 35000,
        validUntil: "2026-11-12",
        daysLeft: 20,
        operationCode: "D05",
        operationName: "أعمال العزل الحراري والمائي",
        status: "EXPIRING_SOON",
      },
    ],
  };

  const activeGuaranteesList: GuaranteeItemBrief[] = useMemo(() => {
    if (selectedCompany === "ALL") {
      return Object.values(companyGuarantees).flat().slice(0, 4);
    }
    return companyGuarantees[selectedCompany] || [];
  }, [selectedCompany]);

  const formatEGP = (num: number) =>
    new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(num);

  const formatNumber = (num: number) =>
    new Intl.NumberFormat("ar-EG").format(num);

  // =========================================================================
  // VIEW 1: GENERAL MANAGER (المدير العام) & UNIFIED MULTI-COMPANY
  // =========================================================================
  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16">
      {/* ━━━ TOP EXECUTIVE COCKPIT HERO BAR ━━━ */}
      <div className="relative overflow-hidden rounded-3xl glass-card p-5 sm:p-7 border border-border shadow-2xl">
        {/* Soft Ambient Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Header Title & Dynamic Company Badge */}
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

              {/* Live Clock / Date Badge */}
              {currentTimeStr && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 border border-border text-xs text-muted-foreground font-semibold">
                  <Calendar className="h-3 w-3 text-blue-500" />
                  <span>{currentTimeStr}</span>
                </div>
              )}

              {/* System Security Badges */}
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

          {/* Quick Primary Actions in Hero */}
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

      {/* ━━━ SECTION SHORTCUT FILTERS ━━━ */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "ALL", label: "نظرة شاملة 🌐" },
          { id: "ALERTS", label: "🚨 الإجراءات العاجلة" },
          { id: "FINANCE", label: "📊 المركز المالي" },
          { id: "RADAR", label: "📡 رادار المناقصات" },
          { id: "VISITS", label: "🏗️ المعاينات الميدانية" },
          { id: "GUARANTEES", label: "🛡️ الضمانات البنكية" },
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

      {/* ━━━ 6 MASTER EXECUTIVE KPI CARDS ━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* KPI 1: Active Operations */}
        <div className="glass-card-interactive rounded-2xl p-4 sm:p-5 border border-blue-500/30 relative flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <FileText className="h-5 w-5" />
            </div>
            <Badge className="badge-blue text-[10px] font-bold">
              {selectedCompany === "ALL" ? "كافة الشركات" : `شركة ${selectedCompany}`}
            </Badge>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-foreground">
              {currentCompanyOverview?.activeOperations || (selectedCompany === "ALL" ? stats.active : filteredOperations.length)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">عمليات نشطة جارية</p>
          </div>
          <div className="space-y-1 pt-1 border-t border-border/50">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
              <span>نسبة الإنجاز</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">72%</span>
            </div>
            <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: "72%" }} />
            </div>
          </div>
        </div>

        {/* KPI 2: Contract Portfolio Value */}
        <div className="glass-card-interactive rounded-2xl p-4 sm:p-5 border border-purple-500/30 relative flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
              <TrendingUp className="h-5 w-5" />
            </div>
            <Badge className="badge-purple text-[10px] font-bold">هامش +{financialTotals.profitMargin}%</Badge>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-foreground">
              {formatEGP(financialTotals.totalRev)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">محفظة التعاقدات والإيراد</p>
          </div>
          <div className="space-y-1 pt-1 border-t border-border/50">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
              <span>صافي الربح التقديري</span>
              <span className="text-purple-600 dark:text-purple-400 font-bold">{formatEGP(financialTotals.totalProfit)}</span>
            </div>
            <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
              <div className="bg-purple-600 h-full rounded-full transition-all" style={{ width: `${financialTotals.profitMargin}%` }} />
            </div>
          </div>
        </div>

        {/* KPI 3: Certified Billings & Collections */}
        <div className="glass-card-interactive rounded-2xl p-4 sm:p-5 border border-emerald-500/30 relative flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Receipt className="h-5 w-5" />
            </div>
            <Badge className="badge-emerald text-[10px] font-bold">تحصيل {financialTotals.collectionRatio}%</Badge>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-foreground">
              {formatEGP(financialTotals.totalBilled)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">المستخلصات المصدرة</p>
          </div>
          <div className="space-y-1 pt-1 border-t border-border/50">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
              <span>المتبقي للتحصيل</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatEGP(financialTotals.totalRev - financialTotals.totalBilled)}</span>
            </div>
            <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-600 h-full rounded-full transition-all" style={{ width: `${financialTotals.collectionRatio}%` }} />
            </div>
          </div>
        </div>

        {/* KPI 4: Bank Guarantees Exposure */}
        <div className="glass-card-interactive rounded-2xl p-4 sm:p-5 border border-amber-500/30 relative flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
              <Shield className="h-5 w-5" />
            </div>
            <Badge className="badge-amber text-[10px] font-bold">
              {activeGuaranteesList.filter((g) => g.status === "EXPIRING_SOON").length > 0 ? "تنبيه تجديد ⚠️" : "منتظم"}
            </Badge>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-foreground">
              {currentCompanyOverview?.pendingGuarantees || activeGuaranteesList.length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">خطابات الضمان القائمة</p>
          </div>
          <div className="space-y-1 pt-1 border-t border-border/50">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
              <span>إجمالي الغطاء البنكي</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                {formatEGP(activeGuaranteesList.reduce((s, g) => s + g.amount, 0))}
              </span>
            </div>
            <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: "85%" }} />
            </div>
          </div>
        </div>

        {/* KPI 5: Field Inspection Readiness */}
        <div className="glass-card-interactive rounded-2xl p-4 sm:p-5 border border-cyan-500/30 relative flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-md">
              <HardHat className="h-5 w-5" />
            </div>
            <Badge className="bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 text-[10px] font-bold">
              مؤشر الجاهزية 83%
            </Badge>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-foreground">
              {activeVisitsList.length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">معاينات وتقارير مواقع</p>
          </div>
          <div className="space-y-1 pt-1 border-t border-border/50">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
              <span>المواقع الجاهزة 100%</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                {activeVisitsList.filter((v) => v.siteReadiness === "READY").length} مواقع
              </span>
            </div>
            <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
              <div className="bg-cyan-600 h-full rounded-full transition-all" style={{ width: "83%" }} />
            </div>
          </div>
        </div>

        {/* KPI 6: Radar Matches */}
        <div className="glass-card-interactive rounded-2xl p-4 sm:p-5 border border-indigo-500/30 relative flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Radar className="h-5 w-5" />
            </div>
            <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-[10px] font-bold">
              رصد حي 📡
            </Badge>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-foreground">
              {activeRadarList.length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">مناقصات مرصودة اليوم</p>
          </div>
          <div className="space-y-1 pt-1 border-t border-border/50">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
              <span>أعلى نسبة مطابقة</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">96% ⭐</span>
            </div>
            <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: "96%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ━━━ IF ALL COMPANIES SELECTED: 4-COMPANY COMPARATIVE COCKPIT ━━━ */}
      {selectedCompany === "ALL" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
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
              const opCount = compData?.activeOperations || (c.code === "A" ? 18 : c.code === "B" ? 14 : c.code === "C" ? 10 : 8);
              const guarCount = compData?.pendingGuarantees || (c.code === "A" ? 7 : c.code === "B" ? 4 : c.code === "C" ? 2 : 2);
              const revStr = compData?.totalRevenue || (c.code === "A" ? "5.85M ج.م" : c.code === "B" ? "3.40M ج.م" : c.code === "C" ? "2.15M ج.م" : "1.85M ج.م");

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

      {/* ━━━ SECTION 1: 🚨 URGENT ACTION & DECISION CENTER ━━━ */}
      {(activeSectionFilter === "ALL" || activeSectionFilter === "ALERTS") && (
        <div className="glass-card rounded-3xl p-5 sm:p-6 border border-amber-500/30 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-foreground">
                  🚨 الإجراءات والقرارات العاجلة المطلوبة {currentCompany ? `— شركة ${currentCompany.name} (${currentCompany.code})` : ""}
                </h3>
                <p className="text-xs text-muted-foreground">
                  مهام وجلسات وضمانات تتطلب اتخاذ قرار سريع قبل انقضاء المواعيد الرسمية
                </p>
              </div>
            </div>
            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold px-3 py-1">
              {(currentCompanyOverview?.urgentAlerts || []).length || 3} إجراءات مطلوبة
            </Badge>
          </div>

          <div className="space-y-3">
            {(currentCompanyOverview?.urgentAlerts || [
              {
                id: "alert-default-1",
                title: `جلسة الفتح المالي للعملية ${selectedCompany !== "ALL" ? selectedCompany : "A"}15 — غداً بمقر الهيئة`,
                operationCode: `${selectedCompany !== "ALL" ? selectedCompany : "A"}15`,
                severity: "danger",
                actionLabel: "تفاصيل الجلسة والأسعار",
                link: "/dashboard/operations",
              },
              {
                id: "alert-default-2",
                title: `خطاب الضمان الابتدائي للعملية ${selectedCompany !== "ALL" ? selectedCompany : "A"}12 ينتهي خلال 18 يوماً`,
                operationCode: `${selectedCompany !== "ALL" ? selectedCompany : "A"}12`,
                severity: "warning",
                actionLabel: "طلب مد صلاحية الضمان",
                link: "/dashboard/operations",
              },
              {
                id: "alert-default-3",
                title: `طلب اعتماد طباعة تظلم استبعاد فني بانتظار توقيع الإدارة وتوليد الهاش`,
                operationCode: `${selectedCompany !== "ALL" ? selectedCompany : "A"}15`,
                severity: "danger",
                actionLabel: "مراجعة واعتماد الطباعة",
                link: `/dashboard/approvals${selectedCompany !== "ALL" ? `?company=${selectedCompany}` : ""}`,
              },
            ]).map((alert) => {
              const isDanger = alert.severity === "danger";
              const isWarning = alert.severity === "warning";
              const targetLink = alert.link || "/dashboard/operations";

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-2xl bg-card border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isDanger
                      ? "border-red-500/40 hover:border-red-500/60 bg-red-500/5 shadow-xs"
                      : isWarning
                      ? "border-amber-500/40 hover:border-amber-500/60 bg-amber-500/5 shadow-xs"
                      : "border-blue-500/40 hover:border-blue-500/60 bg-blue-500/5 shadow-xs"
                  }`}
                >
                  <div className="flex items-start md:items-center gap-3.5">
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 mt-1 md:mt-0 ${
                        isDanger
                          ? "bg-red-500 animate-ping"
                          : isWarning
                          ? "bg-amber-500 animate-pulse"
                          : "bg-blue-500"
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-foreground">{alert.title}</p>
                        {alert.operationCode && (
                          <Badge variant="outline" className="font-mono text-[10px] py-0 px-2 h-4.5 font-bold border-blue-500/30 text-blue-600 dark:text-blue-400">
                            {alert.operationCode}
                          </Badge>
                        )}
                        <Badge
                          className={`text-[10px] px-2 py-0 h-4.5 border-0 font-bold ${
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
                      <p className="text-xs text-muted-foreground mt-1">
                        نطاق العمل: {currentCompany?.fullName || "المجموعة الذهبية"} • كود العملية: {alert.operationCode || "A15"}
                      </p>
                    </div>
                  </div>

                  <Link href={targetLink} className="shrink-0 self-end md:self-center">
                    <Button
                      size="sm"
                      className={`font-bold text-xs h-9 px-4 rounded-xl cursor-pointer shadow-sm ${
                        isDanger
                          ? "bg-red-600 hover:bg-red-700 text-white shadow-red-500/20"
                          : isWarning
                          ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-amber-500/20"
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                      }`}
                    >
                      <span>{alert.actionLabel || "اتخاذ إجراء"}</span>
                      <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ━━━ SECTION 2: 📊 FINANCIAL BREAKDOWN & OPERATIONS BUDGET PIPELINE ━━━ */}
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
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/dashboard/payments">
                <Button variant="outline" size="sm" className="border-border text-foreground text-xs font-bold h-8.5 rounded-xl cursor-pointer">
                  فتح المركز المالي التخصصي
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            {filteredOperations.slice(0, 4).map((op) => {
              const rev = op.revenue || 2850000;
              const cost = op.cost || 1980000;
              const billed = op.billed || 1720000;
              const billedPct = rev > 0 ? Math.min(100, Math.round((billed / rev) * 100)) : 60;
              const profit = op.profit || (rev - cost);
              const margin = op.margin || (rev > 0 ? Math.round((profit / rev) * 100) : 30);

              return (
                <div
                  key={op.id}
                  onClick={() => router.push(`/dashboard/operations/${op.id}`)}
                  className="p-4 rounded-2xl bg-card border border-border hover:border-purple-500/40 hover:bg-purple-50/10 dark:hover:bg-purple-950/10 transition-all cursor-pointer space-y-3 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white font-mono font-black text-sm flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                        {op.code}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground group-hover:text-purple-600 transition-colors">
                          {op.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {op.authority} • {tenderTypeMap[op.tenderType] || op.tenderType}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-[11px] font-bold">
                        هامش +{margin}%
                      </Badge>
                      <Badge className={statusLabels[op.status]?.color || "bg-muted text-muted-foreground"}>
                        {statusLabels[op.status]?.label || op.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Financial Micro-Bar & Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/50 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">قيمة التعاقد</span>
                      <span className="font-bold text-foreground">{formatEGP(rev)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">التكلفة الفعلية</span>
                      <span className="font-bold text-foreground">{formatEGP(cost)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">المستخلصات المحصلة</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatEGP(billed)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">صافي الربح التقديري</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">{formatEGP(profit)}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>نسبة التحصيل وإصدار المستخلصات</span>
                      <span className="font-bold text-foreground">{billedPct}%</span>
                    </div>
                    <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full rounded-full transition-all"
                        style={{ width: `${billedPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ━━━ SECTION 3: 📡 LIVE SMART RADAR FEED (Tailored to Selected Company) ━━━ */}
      {(activeSectionFilter === "ALL" || activeSectionFilter === "RADAR") && (
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
              <Button variant="outline" size="sm" className="border-border text-foreground text-xs font-bold h-8.5 rounded-xl cursor-pointer">
                فتح رادار المناقصات بالكامل
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeRadarList.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-card border border-border hover:border-indigo-500/40 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 transition-all space-y-3 flex flex-col justify-between"
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
              <Button variant="outline" size="sm" className="border-border text-foreground text-xs font-bold h-8.5 rounded-xl cursor-pointer">
                عرض سجل المعاينات كاملاً
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeVisitsList.map((v) => {
              const isReady = v.siteReadiness === "READY";
              const isConditional = v.siteReadiness === "CONDITIONAL";
              const isBlocked = v.siteReadiness === "BLOCKED";

              return (
                <div
                  key={v.id}
                  onClick={() => router.push("/dashboard/visits")}
                  className="p-4 rounded-2xl bg-card border border-border hover:border-cyan-500/40 hover:bg-cyan-50/10 dark:hover:bg-cyan-950/10 transition-all cursor-pointer space-y-3 group"
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

                  <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/60 leading-relaxed">
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
              <Button variant="outline" size="sm" className="border-border text-foreground text-xs font-bold h-8.5 rounded-xl cursor-pointer">
                إدارة الضمانات في المركز المالي
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGuaranteesList.map((g) => {
              const isUrgent = g.daysLeft <= 30;

              return (
                <div
                  key={g.id}
                  className={`p-4 rounded-2xl bg-card border transition-all space-y-3 ${
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
                    <span className="font-black text-foreground">{formatEGP(g.amount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ━━━ SECTION 6: 🖨️ SECURE PRINT APPROVALS & CRYPTOGRAPHIC LEDGER ━━━ */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-border shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
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
            <Button variant="ghost" size="sm" className="text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer">
              عرض سجل الموافقات بالكامل
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            </Button>
          </Link>
        </div>

        <div className="space-y-3">
          {[
            {
              id: "app-log-1",
              doc: "تظلم استبعاد فني — عملية توريد كابلات الجهد المتوسط (A15)",
              company: `شركة ${selectedCompany !== "ALL" ? currentCompany?.name : "جولدن"} (${selectedCompany !== "ALL" ? selectedCompany : "A"})`,
              hash: "4F9B7E2A8C103D55A6B7E8C9D0123456",
              approvedAt: "اليوم 09:30 AM",
              approver: "نائب المدير العام",
            },
            {
              id: "app-log-2",
              doc: "إصدار خطاب ضمان ابتدائي 2% — عملية شبكات الفايبر (B08)",
              company: "شركة إكسلنت (B)",
              hash: "7E102A8C9B4F3D55C0123456A6B7E8C9",
              approvedAt: "أمس 04:15 PM",
              approver: "نائب المدير العام",
            },
          ].map((item) => (
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
          ))}
        </div>
      </div>
    </div>
  );
}
