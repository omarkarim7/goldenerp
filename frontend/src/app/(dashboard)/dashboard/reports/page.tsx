"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  BarChart3, Building2, TrendingUp, Shield, Wallet, FileText,
  CheckCircle2, Clock, ArrowUpRight, Search, Filter, Sparkles,
  RefreshCw, Layers, Award, AlertTriangle, Calendar, X,
  ExternalLink, ChevronLeft, ChevronRight, PieChart, Activity,
  Briefcase, Landmark, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// التعاريف والكيانات
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type ReportType = "CONSOLIDATED" | "COMPANY_SPECIFIC";
export type TimePeriod = "MONTH" | "QUARTER" | "YEAR" | "ALL";
export type CompanyKey = "A" | "B" | "C" | "D";

interface CompanyMeta {
  code: CompanyKey;
  arabicLetter: string;
  name: string;
  fullName: string;
  commercialRegister: string;
  taxCard: string;
  manager: string;
  bankName: string;
  color: string;
  gradient: string;
  badgeBg: string;
  borderColor: string;
  description: string;
}

const COMPANIES: Record<CompanyKey, CompanyMeta> = {
  A: {
    code: "A",
    arabicLetter: "أ",
    name: "جولدن",
    fullName: "المجموعة الذهبية للتوريدات والمقاولات",
    commercialRegister: "148920 — استثمار القاهرة",
    taxCard: "624-918-350",
    manager: "أ/ محمد إبراهيم — المدير التنفيذي",
    bankName: "البنك الأهلي المصري — فرع العروبة",
    color: "blue",
    gradient: "from-blue-600 via-blue-700 to-indigo-800",
    badgeBg: "badge-blue",
    borderColor: "border-blue-500/30",
    description: "الكيان الرائد في التوريدات والمناقصات الحكومية والخدمات التخصصية",
  },
  B: {
    code: "B",
    arabicLetter: "ب",
    name: "إكسلنت",
    fullName: "العالمية للتوريدات والتجارة العمومية",
    commercialRegister: "172044 — جنوب الجيزة",
    taxCard: "731-802-441",
    manager: "م/ أحمد عبد الرحمن — مدير قطاع التوريدات",
    bankName: "بنك مصر — فرع الدقي",
    color: "cyan",
    gradient: "from-cyan-600 via-teal-700 to-blue-800",
    badgeBg: "badge-blue",
    borderColor: "border-cyan-500/30",
    description: "متخصصة في مناقصات التوريدات والأجهزة الفنية ومهمات الوقاية والتجهيزات",
  },
  C: {
    code: "C",
    arabicLetter: "ج",
    name: "العهد",
    fullName: "المتحدة للمقاولات العامة والتجارة",
    commercialRegister: "198310 — شمال القاهرة",
    taxCard: "842-195-630",
    manager: "م/ حسام الدين عثمان — مدير المشروعات",
    bankName: "بنك QNB الأهلي — فرع المهندسين",
    color: "purple",
    gradient: "from-purple-600 via-indigo-700 to-blue-800",
    badgeBg: "badge-purple",
    borderColor: "border-purple-500/30",
    description: "متخصصة في أوامر الإسناد والمقاولات العامة والأعمال الكهروميكانيكية المتكاملة",
  },
  D: {
    code: "D",
    arabicLetter: "د",
    name: "الحديثة",
    fullName: "الحديثة للتجارة العامة والتوريدات",
    commercialRegister: "210560 — استثمار 6 أكتوبر",
    taxCard: "915-304-772",
    manager: "أ/ شريف عبد القادر — مدير العمليات السريعة",
    bankName: "بنك الإسكندرية — فرع التحرير",
    color: "emerald",
    gradient: "from-emerald-600 via-teal-700 to-indigo-800",
    badgeBg: "badge-emerald",
    borderColor: "border-emerald-500/30",
    description: "شريك التوريدات السريعة وعمليات الشراء المباشر والممارسات والاتفاقات الإطارية",
  },
};

interface RawOperation {
  id: string;
  serialNumber: number;
  externalNumber?: string | null;
  name: string;
  authority: string;
  tenderType: string;
  status: string;
  createdAt: string;
  estimatedBudget?: number | null;
  companies?: Array<{
    displayCode: string;
    isWinner?: boolean;
    company?: { code: string; name: string };
  }>;
  guarantees?: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    isRecovered: boolean;
  }>;
  awards?: Array<{
    id: string;
    finalAmount: number;
    awardDate?: string;
  }>;
}

const STATUS_CONFIG: Record<string, { label: string; badge: string; color: string }> = {
  DRAFT: { label: "مسودة", badge: "bg-muted text-muted-foreground border-border", color: "text-muted-foreground" },
  BOOKLET_WITHDRAWN: { label: "سحب الكراسة", badge: "badge-blue", color: "text-blue-500" },
  SUBMITTED: { label: "تم التقديم", badge: "badge-purple", color: "text-purple-500" },
  TECHNICAL_OPENED: { label: "فتح فني", badge: "badge-purple", color: "text-purple-500" },
  TECHNICAL_ACCEPTED: { label: "مقبول فنياً", badge: "badge-emerald", color: "text-emerald-500" },
  TECHNICAL_REJECTED: { label: "مرفوض فنياً", badge: "badge-rose", color: "text-rose-500" },
  GRIEVANCE_FILED: { label: "تظلم", badge: "badge-amber", color: "text-amber-500" },
  FINANCIAL_OPENED: { label: "فتح مالي", badge: "badge-blue", color: "text-blue-500" },
  AWARDED: { label: "ترسية وفوز", badge: "badge-amber", color: "text-amber-500" },
  SUPPLY_IN_PROGRESS: { label: "جاري التوريد", badge: "badge-blue", color: "text-blue-500" },
  COMPLETED: { label: "مكتملة ومسلمة", badge: "badge-emerald", color: "text-emerald-500" },
  CLOSED: { label: "مغلقة", badge: "bg-muted text-muted-foreground", color: "text-muted-foreground" },
  CANCELLED: { label: "ملغاة", badge: "badge-rose", color: "text-rose-500" },
  ARCHIVED: { label: "أرشيف", badge: "bg-muted text-muted-foreground", color: "text-muted-foreground" },
};

const TENDER_TYPE_MAP: Record<string, string> = {
  TENDER: "مناقصة عامة",
  LIMITED_TENDER: "مناقصة محدودة",
  PRACTICE: "ممارسة عامة",
  LIMITED_PRACTICE: "ممارسة محدودة",
  AUCTION: "مزايدة علنية",
  DIRECT_ORDER: "إسناد مباشر",
};

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("CONSOLIDATED");
  const [selectedCompanyKey, setSelectedCompanyKey] = useState<CompanyKey>("A");
  const [period, setPeriod] = useState<TimePeriod>("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [operations, setOperations] = useState<RawOperation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // جلب البيانات من الـ API
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/operations");
      if (Array.isArray(res.data)) {
        setOperations(res.data);
      }
    } catch {
      // بيانات احتياطية ممثلة
      setOperations([
        {
          id: "op-1",
          serialNumber: 1,
          name: "توريد وتركيب شبكات ألياف ضوئية وخوادم مركزية",
          authority: "الهيئة العامة للأبنية التعليمية",
          tenderType: "TENDER",
          status: "AWARDED",
          createdAt: "2026-10-08",
          estimatedBudget: 4200000,
          companies: [{ displayCode: "A15", isWinner: true, company: { code: "A", name: "جولدن" } }],
          guarantees: [{ id: "g1", type: "FINAL", amount: 210000, status: "ACTIVE", isRecovered: false }],
          awards: [{ id: "aw1", finalAmount: 4150000, awardDate: "2026-10-10" }],
        },
        {
          id: "op-2",
          serialNumber: 2,
          name: "تجهيز معامل الحاسب الآلي والمعدات الرقمية",
          authority: "وزارة التعليم العالي والبحث العلمي",
          tenderType: "LIMITED_TENDER",
          status: "SUPPLY_IN_PROGRESS",
          createdAt: "2026-10-04",
          estimatedBudget: 2850000,
          companies: [{ displayCode: "A18", isWinner: true, company: { code: "A", name: "جولدن" } }],
          guarantees: [{ id: "g2", type: "FINAL", amount: 142500, status: "ACTIVE", isRecovered: false }],
          awards: [{ id: "aw2", finalAmount: 2800000, awardDate: "2026-10-11" }],
        },
        {
          id: "op-3",
          serialNumber: 3,
          name: "توريد أجهزة فحص ومستلزمات وقاية بيئية متخصصة",
          authority: "وزارة البيئة — جهاز شؤون البيئة",
          tenderType: "TENDER",
          status: "TECHNICAL_ACCEPTED",
          createdAt: "2026-08-14",
          estimatedBudget: 1950000,
          companies: [{ displayCode: "B04", isWinner: false, company: { code: "B", name: "إكسلنت" } }],
          guarantees: [{ id: "g3", type: "INITIAL", amount: 50000, status: "ACTIVE", isRecovered: false }],
        },
        {
          id: "op-4",
          serialNumber: 4,
          name: "تحديث مركز بيانات وتوريد وحدات خوادم فائقة السرعة",
          authority: "جامعة حلوان — الإدارة العامة للمشتريات",
          tenderType: "PRACTICE",
          status: "COMPLETED",
          createdAt: "2025-11-20",
          estimatedBudget: 3600000,
          companies: [{ displayCode: "B03", isWinner: true, company: { code: "B", name: "إكسلنت" } }],
          guarantees: [{ id: "g4", type: "FINAL", amount: 180000, status: "ACTIVE", isRecovered: true }],
          awards: [{ id: "aw4", finalAmount: 3550000, awardDate: "2026-01-12" }],
        },
        {
          id: "op-5",
          serialNumber: 5,
          name: "إحلال وتجديد محولات الكهرباء ولوحات التوزيع الرئيسية",
          authority: "شركة توزيع كهرباء شمال القاهرة",
          tenderType: "TENDER",
          status: "SUBMITTED",
          createdAt: "2026-10-12",
          estimatedBudget: 5100000,
          companies: [{ displayCode: "C08", isWinner: false, company: { code: "C", name: "العهد" } }],
          guarantees: [{ id: "g5", type: "INITIAL", amount: 150000, status: "ACTIVE", isRecovered: false }],
        },
        {
          id: "op-6",
          serialNumber: 6,
          name: "أعمال الصيانة والتجهيزات الكهروميكانيكية المتكاملة",
          authority: "مستشفيات جامعة عين شمس",
          tenderType: "DIRECT_ORDER",
          status: "AWARDED",
          createdAt: "2026-05-25",
          estimatedBudget: 3100000,
          companies: [{ displayCode: "C11", isWinner: true, company: { code: "C", name: "العهد" } }],
          guarantees: [{ id: "g6", type: "FINAL", amount: 155000, status: "ACTIVE", isRecovered: false }],
          awards: [{ id: "aw6", finalAmount: 3100000, awardDate: "2026-06-20" }],
        },
        {
          id: "op-7",
          serialNumber: 7,
          name: "توريد مهمات مكتبية وأحبار وطابعات بنكية سريعة",
          authority: "الهيئة العامة للتأمين الصحي الشامل",
          tenderType: "PRACTICE",
          status: "COMPLETED",
          createdAt: "2026-03-10",
          estimatedBudget: 1250000,
          companies: [{ displayCode: "D02", isWinner: true, company: { code: "D", name: "الحديثة" } }],
          guarantees: [{ id: "g7", type: "FINAL", amount: 62500, status: "ACTIVE", isRecovered: true }],
          awards: [{ id: "aw7", finalAmount: 1220000, awardDate: "2026-04-15" }],
        },
        {
          id: "op-8",
          serialNumber: 8,
          name: "توريد وسائل التطهير ومعدات السلامة المهنية",
          authority: "الشركة القابضة لمياه الشرب والصرف الصحي",
          tenderType: "LIMITED_PRACTICE",
          status: "FINANCIAL_OPENED",
          createdAt: "2026-10-06",
          estimatedBudget: 980000,
          companies: [{ displayCode: "D05", isWinner: false, company: { code: "D", name: "الحديثة" } }],
          guarantees: [{ id: "g8", type: "INITIAL", amount: 30000, status: "ACTIVE", isRecovered: false }],
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // دوال التنسيق المالي العربي
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }).format(n || 0);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // كشف كود الشركة للعملية
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const getOpCompanyCode = (op: RawOperation): CompanyKey => {
    if (op.companies && op.companies.length > 0) {
      const code = op.companies[0].company?.code?.toUpperCase() ||
                   op.companies[0].displayCode?.charAt(0)?.toUpperCase();
      if (code === "A" || code === "B" || code === "C" || code === "D") {
        return code as CompanyKey;
      }
    }
    return "A";
  };

  const getOpDisplayCode = (op: RawOperation): string => {
    if (op.companies && op.companies.length > 0 && op.companies[0].displayCode) {
      return op.companies[0].displayCode;
    }
    const letter = getOpCompanyCode(op);
    return `${letter}${String(op.serialNumber).padStart(2, "0")}`;
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // حساب أعداد العمليات لكل نطاق زمني بدقة
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const periodCounts = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3);

    let yearCount = 0;
    let quarterCount = 0;
    let monthCount = 0;

    operations.forEach((op) => {
      const d = new Date(op.createdAt);
      if (!isNaN(d.getTime())) {
        if (d.getFullYear() === currentYear) {
          yearCount++;
          if (Math.floor(d.getMonth() / 3) === currentQuarter) {
            quarterCount++;
          }
          if (d.getMonth() === currentMonth) {
            monthCount++;
          }
        }
      }
    });

    return {
      ALL: operations.length,
      YEAR: yearCount,
      QUARTER: quarterCount,
      MONTH: monthCount,
    };
  }, [operations]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // فلترة العمليات وفق النطاق الزمني المختار
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const periodFilteredOps = useMemo(() => {
    if (period === "ALL") return operations;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3);

    return operations.filter((op) => {
      const d = new Date(op.createdAt);
      if (isNaN(d.getTime())) return true;
      const opYear = d.getFullYear();
      const opMonth = d.getMonth();
      const opQuarter = Math.floor(opMonth / 3);

      if (period === "MONTH") {
        return opYear === currentYear && opMonth === currentMonth;
      }
      if (period === "QUARTER") {
        return opYear === currentYear && opQuarter === currentQuarter;
      }
      if (period === "YEAR") {
        return opYear === currentYear;
      }
      return true;
    });
  }, [operations, period]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // المؤشرات المجمعة للشركات الأربعة
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const consolidatedStats = useMemo(() => {
    const totalOps = periodFilteredOps.length;
    let totalAwardedValue = 0;
    let totalGuaranteesValue = 0;
    let activeGuaranteesCount = 0;
    let awardedOps = 0;
    let activeOps = 0;
    let rejectedOps = 0;
    let inProgressOps = 0;

    periodFilteredOps.forEach((op) => {
      // احتساب قيمة الترسية
      if (op.awards && op.awards.length > 0) {
        totalAwardedValue += op.awards.reduce((acc, curr) => acc + (curr.finalAmount || 0), 0);
      } else if (["AWARDED", "SUPPLY_IN_PROGRESS", "COMPLETED"].includes(op.status)) {
        totalAwardedValue += op.estimatedBudget || 0;
      }

      // الضمانات
      if (op.guarantees && op.guarantees.length > 0) {
        op.guarantees.forEach((g) => {
          if (!g.isRecovered) {
            totalGuaranteesValue += g.amount || 0;
            activeGuaranteesCount++;
          }
        });
      }

      // الحالات
      if (["AWARDED", "SUPPLY_IN_PROGRESS", "COMPLETED"].includes(op.status)) {
        awardedOps++;
      }
      if (["TECHNICAL_REJECTED", "CANCELLED"].includes(op.status)) {
        rejectedOps++;
      }
      if (!["COMPLETED", "CLOSED", "CANCELLED", "ARCHIVED"].includes(op.status)) {
        activeOps++;
      }
      if (["SUBMITTED", "TECHNICAL_OPENED", "TECHNICAL_ACCEPTED", "FINANCIAL_OPENED"].includes(op.status)) {
        inProgressOps++;
      }
    });

    const winRate = totalOps > 0 ? Math.round((awardedOps / totalOps) * 100) : 0;

    return {
      totalOps,
      totalAwardedValue,
      totalGuaranteesValue,
      activeGuaranteesCount,
      awardedOps,
      activeOps,
      rejectedOps,
      inProgressOps,
      winRate,
    };
  }, [periodFilteredOps]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // مصفوفة مقارنة الأداء بين الشركات الأربعة (أ، ب، ج، د)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const companyMatrix = useMemo(() => {
    const matrix: Record<CompanyKey, {
      meta: CompanyMeta;
      total: number;
      awarded: number;
      active: number;
      rejected: number;
      winRate: number;
      revenue: number;
      guaranteesValue: number;
    }> = {
      A: { meta: COMPANIES.A, total: 0, awarded: 0, active: 0, rejected: 0, winRate: 0, revenue: 0, guaranteesValue: 0 },
      B: { meta: COMPANIES.B, total: 0, awarded: 0, active: 0, rejected: 0, winRate: 0, revenue: 0, guaranteesValue: 0 },
      C: { meta: COMPANIES.C, total: 0, awarded: 0, active: 0, rejected: 0, winRate: 0, revenue: 0, guaranteesValue: 0 },
      D: { meta: COMPANIES.D, total: 0, awarded: 0, active: 0, rejected: 0, winRate: 0, revenue: 0, guaranteesValue: 0 },
    };

    periodFilteredOps.forEach((op) => {
      const code = getOpCompanyCode(op);
      const row = matrix[code];
      row.total++;

      if (["AWARDED", "SUPPLY_IN_PROGRESS", "COMPLETED"].includes(op.status)) {
        row.awarded++;
        if (op.awards && op.awards.length > 0) {
          row.revenue += op.awards.reduce((a, b) => a + (b.finalAmount || 0), 0);
        } else {
          row.revenue += op.estimatedBudget || 0;
        }
      }

      if (["TECHNICAL_REJECTED", "CANCELLED"].includes(op.status)) {
        row.rejected++;
      }

      if (!["COMPLETED", "CLOSED", "CANCELLED", "ARCHIVED"].includes(op.status)) {
        row.active++;
      }

      if (op.guarantees) {
        op.guarantees.forEach((g) => {
          if (!g.isRecovered) row.guaranteesValue += g.amount || 0;
        });
      }
    });

    (Object.keys(matrix) as CompanyKey[]).forEach((k) => {
      const row = matrix[k];
      row.winRate = row.total > 0 ? Math.round((row.awarded / row.total) * 100) : 0;
    });

    return matrix;
  }, [periodFilteredOps]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // أكثر الجهات الحكومية إسناداً للعمليات
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const topAuthorities = useMemo(() => {
    const authMap: Record<string, { name: string; count: number; awarded: number; value: number }> = {};
    periodFilteredOps.forEach((op) => {
      const auth = op.authority?.trim() || "جهة غير محددة";
      if (!authMap[auth]) {
        authMap[auth] = { name: auth, count: 0, awarded: 0, value: 0 };
      }
      authMap[auth].count++;
      if (["AWARDED", "SUPPLY_IN_PROGRESS", "COMPLETED"].includes(op.status)) {
        authMap[auth].awarded++;
        authMap[auth].value += (op.awards?.[0]?.finalAmount || op.estimatedBudget || 0);
      }
    });
    return Object.values(authMap).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [periodFilteredOps]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // بيانات ومؤشرات الشركة المحددة فقط
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const singleCompanyOps = useMemo(() => {
    return periodFilteredOps.filter((op) => getOpCompanyCode(op) === selectedCompanyKey);
  }, [periodFilteredOps, selectedCompanyKey]);

  const singleCompanyStats = useMemo(() => {
    return companyMatrix[selectedCompanyKey];
  }, [companyMatrix, selectedCompanyKey]);

  // تصفية جدول عمليات الشركة المحددة
  const filteredSingleCompanyOps = useMemo(() => {
    return singleCompanyOps.filter((op) => {
      const disp = getOpDisplayCode(op);
      const matchesSearch =
        op.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.authority.toLowerCase().includes(searchQuery.toLowerCase()) ||
        disp.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "AWARDED" && ["AWARDED", "SUPPLY_IN_PROGRESS", "COMPLETED"].includes(op.status)) ||
        (statusFilter === "ACTIVE" && !["COMPLETED", "CLOSED", "CANCELLED", "ARCHIVED"].includes(op.status)) ||
        (statusFilter === "REJECTED" && ["TECHNICAL_REJECTED", "CANCELLED"].includes(op.status));

      return matchesSearch && matchesStatus;
    });
  }, [singleCompanyOps, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12" style={{ direction: "rtl" }}>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. الترويسة والأزرار العلوية (باللغة العربية الكاملة)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">
            مركز التقارير التنفيذية ومؤشرات الأداء
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            تحليلات حية متزامنة للشركات الأربعة وسجل العمليات والمناقصات الحكومية (قانون 182 لسنة 2018)
          </p>
        </div>

        {/* شريط الإجراءات: زر التحديث اللحظي فقط */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={refreshing}
            className="border-border bg-muted/40 text-foreground hover:bg-muted rounded-xl text-xs h-9 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ml-1.5 ${refreshing ? "animate-spin text-amber-500" : ""}`} />
            <span>تحديث البيانات لحظياً</span>
          </Button>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. التبديل بين نوعي التقارير وفلاتر النطاق الزمني
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
        {/* التبديل بين التقرير الشامل وتقرير الشركة المنفصلة */}
        <div className="p-1.5 bg-muted/50 rounded-2xl border border-border flex items-center gap-1.5">
          <button
            onClick={() => setReportType("CONSOLIDATED")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              reportType === "CONSOLIDATED"
                ? "bg-card text-foreground shadow-sm border border-border text-blue-600 dark:text-blue-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>التقرير المجمّع الشامل (الـ 4 شركات)</span>
          </button>

          <button
            onClick={() => setReportType("COMPANY_SPECIFIC")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              reportType === "COMPANY_SPECIFIC"
                ? "bg-card text-foreground shadow-sm border border-border text-amber-600 dark:text-amber-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>تقرير تفصيلي (لكل شركة منفصلة)</span>
          </button>
        </div>

        {/* فلاتر النطاق الزمني مع عرض عدد العمليات الفعلي لكل نطاق */}
        <div className="flex items-center justify-end gap-1.5 text-xs flex-wrap">
          <span className="text-muted-foreground font-bold ml-1 text-[11px] hidden sm:inline">النطاق الزمني:</span>
          {[
            { id: "ALL", label: "جميع العمليات", count: periodCounts.ALL },
            { id: "YEAR", label: "السنة المالية 2026", count: periodCounts.YEAR },
            { id: "QUARTER", label: "الربع الحالي", count: periodCounts.QUARTER },
            { id: "MONTH", label: "هذا الشهر", count: periodCounts.MONTH },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setPeriod(t.id as TimePeriod)}
              className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                period === t.id
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground border border-border/80"
              }`}
            >
              <span>{t.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                period === t.id ? "bg-slate-950/20 text-slate-950 font-black" : "bg-muted text-muted-foreground"
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          النوع الأول: التقرير المجمّع الشامل للشركات الأربعة
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {reportType === "CONSOLIDATED" && (
        <div className="space-y-6 animate-fade-in">
          {/* كروت المؤشرات الأربعة الرئيسية */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* إجمالي العمليات */}
            <div className="glass-card rounded-2xl p-5 border border-border relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-bold">إجمالي العمليات المسجلة</span>
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-foreground font-mono">
                {consolidatedStats.totalOps}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span className="text-emerald-600 font-bold">{consolidatedStats.activeOps} جارية</span>
                <span>•</span>
                <span>{consolidatedStats.awardedOps} تمت الترسية</span>
              </div>
            </div>

            {/* إجمالي قيمة الترسيات والعقود */}
            <div className="glass-card rounded-2xl p-5 border border-border relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-bold">إجمالي قيمة الترسيات والعقود</span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Award className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {formatCurrency(consolidatedStats.totalAwardedValue)}
              </p>
              <span className="text-[11px] text-muted-foreground mt-2 block">
                عقود وأوامر توريد نافذة للشركات
              </span>
            </div>

            {/* معدل الفوز العام */}
            <div className="glass-card rounded-2xl p-5 border border-border relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-bold">معدل الفوز بالترسيات</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {consolidatedStats.winRate}%
                </p>
                <span className="text-xs text-muted-foreground">نسبة نجاح العطاءات</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 mt-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${consolidatedStats.winRate}%` }}
                />
              </div>
            </div>

            {/* حجم الضمانات والتأمينات */}
            <div className="glass-card rounded-2xl p-5 border border-border relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-bold">الضمانات والتأمينات القائمة</span>
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Shield className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
                {formatCurrency(consolidatedStats.totalGuaranteesValue)}
              </p>
              <span className="text-[11px] text-muted-foreground mt-2 block">
                محجوزة كـ {consolidatedStats.activeGuaranteesCount} تأمين ساري بالبنوك والخزائن
              </span>
            </div>
          </div>

          {/* مصفوفة مقارنة الأداء بين الكيانات الأربعة */}
          <div className="glass-card rounded-3xl p-6 border border-border shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">
                    مصفوفة مقارنة الأداء بين الشركات الأربعة
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    توزيع حجم العمليات ونسب الفوز والقيمة التعاقدية لكل شركة على حدة
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground font-semibold bg-muted/50 px-2.5 py-1 rounded-lg">
                4 شركات مسجلة
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-border/70 text-muted-foreground">
                    <th className="pb-3 pr-2 font-bold">الشركة والكيان القانوني</th>
                    <th className="pb-3 text-center font-bold">إجمالي العمليات</th>
                    <th className="pb-3 text-center font-bold">ترسية وفوز</th>
                    <th className="pb-3 text-center font-bold">قيد المتابعة</th>
                    <th className="pb-3 text-center font-bold">معدل الفوز %</th>
                    <th className="pb-3 text-left font-bold">قيمة التعاقدات (ج.م)</th>
                    <th className="pb-3 text-left font-bold">الضمانات القائمة</th>
                    <th className="pb-3 text-center font-bold">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {(Object.keys(companyMatrix) as CompanyKey[]).map((k) => {
                    const row = companyMatrix[k];
                    return (
                      <tr key={k} className="hover:bg-muted/30 transition-colors group">
                        <td className="py-3.5 pr-2">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-xs shadow-sm bg-gradient-to-br ${row.meta.gradient}`}>
                              {row.meta.arabicLetter}
                            </span>
                            <div>
                              <span className="font-bold text-foreground text-sm block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {row.meta.name}
                              </span>
                              <span className="text-[11px] text-muted-foreground truncate max-w-[220px] block">
                                {row.meta.fullName}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 text-center font-bold text-foreground font-mono text-sm">
                          {row.total}
                        </td>
                        <td className="py-3.5 text-center font-bold text-amber-600 dark:text-amber-400 font-mono text-sm">
                          {row.awarded}
                        </td>
                        <td className="py-3.5 text-center font-bold text-blue-600 dark:text-blue-400 font-mono">
                          {row.active}
                        </td>
                        <td className="py-3.5 text-center">
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                              {row.winRate}%
                            </span>
                            <div className="w-16 bg-muted rounded-full h-1 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-1 rounded-full"
                                style={{ width: `${row.winRate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 text-left font-black text-foreground font-mono text-sm">
                          {formatCurrency(row.revenue)}
                        </td>
                        <td className="py-3.5 text-left font-semibold text-purple-600 dark:text-purple-400 font-mono">
                          {formatCurrency(row.guaranteesValue)}
                        </td>
                        <td className="py-3.5 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedCompanyKey(k);
                              setReportType("COMPANY_SPECIFIC");
                            }}
                            className="h-8 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-500/10 rounded-xl cursor-pointer"
                          >
                            <span>تفاصيل الشركة</span>
                            <ChevronLeft className="h-3 w-3 mr-1" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* توزيع المراحل والجهات الحكومية */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* توزيع مراحل دورة الحياة */}
            <div className="glass-card rounded-3xl p-6 border border-border shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <div className="flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-purple-500" />
                  <h3 className="font-bold text-foreground text-sm">
                    توزيع العمليات وفق مراحل دورة حياة المناقصة
                  </h3>
                </div>
                <span className="text-[11px] text-muted-foreground font-semibold">قانون 182</span>
              </div>

              <div className="space-y-3">
                {[
                  {
                    label: "مرحلة دراسة وسحب الكراسة",
                    count: periodFilteredOps.filter((o) => ["DRAFT", "BOOKLET_WITHDRAWN"].includes(o.status)).length,
                    color: "bg-blue-500",
                  },
                  {
                    label: "مرحلة إعداد وتقديم المظاريف",
                    count: periodFilteredOps.filter((o) => ["SUBMITTED"].includes(o.status)).length,
                    color: "bg-purple-500",
                  },
                  {
                    label: "جلسات البت الفني والاستيفاء",
                    count: periodFilteredOps.filter((o) => ["TECHNICAL_OPENED", "TECHNICAL_ACCEPTED", "GRIEVANCE_FILED"].includes(o.status)).length,
                    color: "bg-amber-500",
                  },
                  {
                    label: "جلسات البت المالي والممارسات",
                    count: periodFilteredOps.filter((o) => ["FINANCIAL_OPENED"].includes(o.status)).length,
                    color: "bg-cyan-500",
                  },
                  {
                    label: "أوامر التوريد والترسية النافذة",
                    count: periodFilteredOps.filter((o) => ["AWARDED", "SUPPLY_IN_PROGRESS"].includes(o.status)).length,
                    color: "bg-emerald-500",
                  },
                  {
                    label: "عمليات مكتملة ومسلمة نهائياً",
                    count: periodFilteredOps.filter((o) => ["COMPLETED", "CLOSED"].includes(o.status)).length,
                    color: "bg-teal-500",
                  },
                ].map((st, i) => {
                  const pct = consolidatedStats.totalOps > 0 ? Math.round((st.count / consolidatedStats.totalOps) * 100) : 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-foreground">{st.label}</span>
                        <span className="font-mono text-muted-foreground">
                          {st.count} عملية ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`${st.color} h-1.5 rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* أعلى الجهات الحكومية */}
            <div className="glass-card rounded-3xl p-6 border border-border shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-blue-500" />
                  <h3 className="font-bold text-foreground text-sm">
                    الجهات الحكومية الأكثر تعاقداً وطرحاً للعمليات
                  </h3>
                </div>
                <span className="text-[11px] text-muted-foreground font-semibold">أعلى 5 جهات</span>
              </div>

              <div className="space-y-3">
                {topAuthorities.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">لا توجد جهات مسجلة بالنطاق الزمني المحدد</p>
                ) : (
                  topAuthorities.map((auth, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 font-bold text-xs flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-foreground text-xs block truncate max-w-[200px] sm:max-w-[260px]">
                            {auth.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {auth.count} مناقصات • {auth.awarded} فوز بالترسية
                          </span>
                        </div>
                      </div>
                      <div className="text-left font-mono">
                        <span className="font-black text-xs text-foreground block">
                          {formatCurrency(auth.value)}
                        </span>
                        <span className="text-[10px] text-emerald-600">تعاقدات نافذة</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          النوع الثاني: التقرير التفصيلي لكل شركة منفصلة
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {reportType === "COMPANY_SPECIFIC" && (
        <div className="space-y-6 animate-fade-in">
          {/* شريط اختيار الشركة بالأحرف العربية */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(Object.keys(COMPANIES) as CompanyKey[]).map((k) => {
              const comp = COMPANIES[k];
              const isSelected = selectedCompanyKey === k;
              const stats = companyMatrix[k];

              return (
                <button
                  key={k}
                  onClick={() => setSelectedCompanyKey(k)}
                  className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? "bg-card border-amber-500/60 shadow-lg ring-2 ring-amber-500/20"
                      : "bg-muted/30 border-border hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-white text-xs bg-gradient-to-br ${comp.gradient}`}>
                      {comp.arabicLetter}
                    </span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-foreground text-sm block">
                      {comp.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      {stats.total} عملية • {stats.winRate}% فوز
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* بطاقة الهوية الرسمية للشركة المحددة */}
          {(() => {
            const currentMeta = COMPANIES[selectedCompanyKey];
            const currentStats = companyMatrix[selectedCompanyKey];

            return (
              <div className="glass-card rounded-3xl p-6 border border-border shadow-xl space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${currentMeta.gradient} flex items-center justify-center text-white text-2xl font-black shadow-lg`}>
                      {currentMeta.arabicLetter}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-foreground">
                          {currentMeta.fullName}
                        </h2>
                        <Badge className={`${currentMeta.badgeBg} text-xs`}>
                          كود الشركة [{currentMeta.arabicLetter}]
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {currentMeta.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/companies?code=${currentMeta.code}`}>
                      <Button variant="outline" size="sm" className="h-9 text-xs border-border rounded-xl cursor-pointer">
                        <Briefcase className="h-3.5 w-3.5 ml-1.5" />
                        <span>ملف المستندات والتراخيص</span>
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* تفاصيل السجل والضرائب والبنك */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <span className="text-muted-foreground font-semibold block mb-0.5">رقم السجل التجاري</span>
                    <span className="font-mono font-bold text-foreground">{currentMeta.commercialRegister}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <span className="text-muted-foreground font-semibold block mb-0.5">البطاقة الضريبية</span>
                    <span className="font-mono font-bold text-foreground">{currentMeta.taxCard}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <span className="text-muted-foreground font-semibold block mb-0.5">المسؤول المفوض للتوقيع</span>
                    <span className="font-bold text-foreground">{currentMeta.manager}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <span className="text-muted-foreground font-semibold block mb-0.5">البنك المعتمد للضمانات</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{currentMeta.bankName}</span>
                  </div>
                </div>

                {/* كروت المؤشرات الأربعة الخاصة بالشركة */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                  <div className="p-4 rounded-2xl bg-card border border-border">
                    <span className="text-xs text-muted-foreground font-bold">إجمالي العمليات المسجلة</span>
                    <p className="text-2xl font-black text-foreground font-mono mt-1">{currentStats.total}</p>
                    <span className="text-[11px] text-muted-foreground">{currentStats.active} جارية حالياً</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-card border border-border">
                    <span className="text-xs text-muted-foreground font-bold">المناقصات الفائزة (ترسية)</span>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1">{currentStats.awarded}</p>
                    <span className="text-[11px] text-emerald-600 font-bold">معدل نجاح {currentStats.winRate}%</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-card border border-border">
                    <span className="text-xs text-muted-foreground font-bold">إجمالي قيمة الترسيات</span>
                    <p className="text-xl font-black text-foreground font-mono mt-1">{formatCurrency(currentStats.revenue)}</p>
                    <span className="text-[11px] text-muted-foreground">عقود توريد نافذة</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-card border border-border">
                    <span className="text-xs text-muted-foreground font-bold">الضمانات البنكية المحجوزة</span>
                    <p className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono mt-1">{formatCurrency(currentStats.guaranteesValue)}</p>
                    <span className="text-[11px] text-muted-foreground">تأمينات ابتدائية ونهائية</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* سجل عمليات ومناقصات الشركة المحددة */}
          <div className="glass-card rounded-3xl p-6 border border-border shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <h3 className="font-bold text-foreground text-base">
                  سجل عمليات ومناقصات {COMPANIES[selectedCompanyKey].name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  قائمة العمليات المسندة للشركة مع مواقف البت الفني والمالي والتسليم
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-border text-xs">
                  {filteredSingleCompanyOps.length} من أصل {singleCompanyOps.length} عملية
                </Badge>
              </div>
            </div>

            {/* شريط البحث وتصفية الحالة */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث باسم العملية، جهة الطرح، أو كود العملية..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-amber-500 rounded-xl text-xs h-9"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                {[
                  { id: "ALL", label: "الكل" },
                  { id: "AWARDED", label: "الفائزة (ترسية)" },
                  { id: "ACTIVE", label: "سارية وقيد المتابعة" },
                  { id: "REJECTED", label: "المستبعدة" },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setStatusFilter(st.id)}
                    className={`px-3 py-2 rounded-xl whitespace-nowrap transition-colors font-bold cursor-pointer ${
                      statusFilter === st.id
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-muted/30 text-muted-foreground hover:text-foreground border border-border"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* جدول العمليات */}
            {filteredSingleCompanyOps.length === 0 ? (
              <div className="p-10 text-center space-y-2 border border-dashed border-border rounded-2xl">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="font-bold text-foreground text-sm">لا توجد عمليات تطابق البحث بالنطاق الزمني المحدد</p>
                <p className="text-xs text-muted-foreground">قم بتعديل معايير البحث أو اختيار نطاق زمني أوسع لعرض السجلات</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-border/70 text-muted-foreground">
                      <th className="pb-3 pr-2 font-bold">كود العملية</th>
                      <th className="pb-3 font-bold">موضوع واسم المناقصة</th>
                      <th className="pb-3 font-bold">الجهة الطارحة</th>
                      <th className="pb-3 font-bold">نوع الطرح</th>
                      <th className="pb-3 text-center font-bold">الموقف التنفيذي</th>
                      <th className="pb-3 text-left font-bold">القيمة التقديرية / الترسية</th>
                      <th className="pb-3 text-center font-bold">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredSingleCompanyOps.map((op) => {
                      const disp = getOpDisplayCode(op);
                      const st = STATUS_CONFIG[op.status] || STATUS_CONFIG.DRAFT;
                      const tenderLabel = TENDER_TYPE_MAP[op.tenderType] || op.tenderType;
                      const val = op.awards?.[0]?.finalAmount || op.estimatedBudget || 0;

                      return (
                        <tr key={op.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="py-3.5 pr-2 font-mono font-bold text-blue-600 dark:text-blue-400">
                            [{disp}]
                          </td>
                          <td className="py-3.5">
                            <span className="font-bold text-foreground text-xs block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {op.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              رقم الإسناد: {op.externalNumber || `مناقصة رقم ${op.serialNumber}`}
                            </span>
                          </td>
                          <td className="py-3.5 font-semibold text-muted-foreground">
                            {op.authority}
                          </td>
                          <td className="py-3.5 text-muted-foreground">
                            {tenderLabel}
                          </td>
                          <td className="py-3.5 text-center">
                            <Badge className={`${st.badge} text-[11px]`}>
                              {st.label}
                            </Badge>
                          </td>
                          <td className="py-3.5 text-left font-mono font-bold text-foreground">
                            {formatCurrency(val)}
                          </td>
                          <td className="py-3.5 text-center">
                            <Link href={`/dashboard/operations/${op.id}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-border text-foreground hover:bg-muted rounded-xl cursor-pointer"
                              >
                                <span>فتح العملية</span>
                                <ExternalLink className="h-3 w-3 mr-1" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
