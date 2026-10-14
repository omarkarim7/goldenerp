"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Sparkles, Shield, FileText, CheckCircle2, ArrowLeft,
  Lock, LogOut, Sun, Moon, RefreshCw, Printer, AlertTriangle, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useCompany, CompanyCode } from "@/context/company-context";

interface UserData {
  id: string;
  fullName: string;
  username: string;
  role: string;
  allowedCompanies?: string | null;
}

export default function SelectCompanyPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { companies, overviewData, setSelectedCompany, refreshOverview, loadingOverview } = useCompany();
  const [user, setUser] = useState<UserData | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectingCode, setSelectingCode] = useState<CompanyCode | null>(null);

  useEffect(() => {
    setMounted(true);
    const userData = localStorage.getItem("user");
    const token = localStorage.getItem("accessToken");

    if (!token && !userData) {
      router.push("/login");
      return;
    }

    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {
        router.push("/login");
        return;
      }
    }

    // Always fetch fresh profile from backend so updated allowedCompanies take immediate effect
    if (token) {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      fetch(`${apiBase}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Failed to fetch user");
        })
        .then((freshUser) => {
          if (freshUser && freshUser.id) {
            setUser(freshUser);
            localStorage.setItem("user", JSON.stringify(freshUser));
          }
        })
        .catch(() => {});
    }
  }, [router]);

  // Check if a specific company is locked for this user based on their role and permissions
  const isCompanyLockedForUser = (code: string): boolean => {
    if (!user) return false;
    if (user.role === "GENERAL_MANAGER") return false;

    const allowed = user.allowedCompanies;
    if (!allowed || allowed === "NONE") return true;
    if (allowed === "ALL") return false;

    const allowedList = allowed
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter((c) => ["A", "B", "C", "D"].includes(c));

    return !allowedList.includes(code.toUpperCase());
  };

  const getAuthorizedCompanyCodes = (): string[] => {
    if (!user) return ["A", "B", "C", "D"];
    if (user.role === "GENERAL_MANAGER" || user.allowedCompanies === "ALL") {
      return ["A", "B", "C", "D"];
    }
    if (!user.allowedCompanies || user.allowedCompanies === "NONE") {
      return [];
    }
    return user.allowedCompanies
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter((c) => ["A", "B", "C", "D"].includes(c));
  };

  const handleSelectCompany = (code: CompanyCode) => {
    if (isCompanyLockedForUser(code)) {
      toast.error("عذراً، هذا الحساب غير مصرح له بالدخول لهذه الشركة وفق صلاحيات الإدارة.");
      return;
    }

    setSelectingCode(code);
    setSelectedCompany(code);
    const targetComp = companies.find((c) => c.code === code);
    toast.success(`تم اختيار بيئة عمل: ${targetComp?.fullName || `شركة ${code}`}`);
    
    setTimeout(() => {
      router.push("/dashboard");
    }, 250);
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedCompany");
    toast.info("تم تسجيل الخروج بنجاح");
    router.push("/login");
  };

  if (!mounted || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-500 flex items-center justify-center animate-spin">
            <RefreshCw className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-muted-foreground">جاري تحميل مركز الشركات...</p>
        </div>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    GENERAL_MANAGER: "المدير العام (الإدارة العليا)",
    DEPUTY_MANAGER: "نائب المدير العام",
    EMPLOYEE: "موظف مسؤول",
  };

  // Static company branding metadata
  const companyCardsMeta = [
    {
      code: "A" as CompanyCode,
      name: "شركة جولدن",
      formalName: "المجموعة الذهبية للتوريدات والمقاولات",
      codeBadge: "الشركة A",
      accentColor: "from-blue-600 to-indigo-700",
      badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30",
      cardBorder: "hover:border-blue-500/60 dark:hover:border-blue-400/60",
      regNo: "102948",
      taxNo: "402-182-991",
      activeOps: 18,
      guarantees: 7,
      completedOps: 42,
      totalOps: 60,
      pendingPrint: 2,
      description: "الشركة الأم للعمليات والمناقصات الحكومية الكبرى وعقود التوريد المتخصصة",
    },
    {
      code: "B" as CompanyCode,
      name: "شركة إكسلنت",
      formalName: "العالمية للتوريدات والتجارة العمومية",
      codeBadge: "الشركة B",
      accentColor: "from-cyan-600 to-blue-700",
      badgeColor: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/30",
      cardBorder: "hover:border-cyan-500/60 dark:hover:border-cyan-400/60",
      regNo: "219402",
      taxNo: "512-984-331",
      activeOps: 12,
      guarantees: 4,
      completedOps: 23,
      totalOps: 35,
      pendingPrint: 1,
      description: "متخصصة في مناقصات التجهيزات الفنية والتوريدات الطبية ومهمات الحماية",
    },
    {
      code: "C" as CompanyCode,
      name: "شركة العهد",
      formalName: "المتحدة للمقاولات العامة والتجارة",
      codeBadge: "الشركة C",
      accentColor: "from-purple-600 to-indigo-700",
      badgeColor: "bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30",
      cardBorder: "hover:border-purple-500/60 dark:hover:border-purple-400/60",
      regNo: "339182",
      taxNo: "618-204-118",
      activeOps: 21,
      guarantees: 9,
      completedOps: 27,
      totalOps: 48,
      pendingPrint: 2,
      description: "المقاولات العامة وأوامر الإسناد المباشر وأعمال الصيانة والبنية التحتية",
    },
    {
      code: "D" as CompanyCode,
      name: "الشركة الحديثة",
      formalName: "الحديثة للتجارة العامة والتوريدات",
      codeBadge: "الشركة D",
      accentColor: "from-emerald-600 to-teal-700",
      badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
      cardBorder: "hover:border-emerald-500/60 dark:hover:border-emerald-400/60",
      regNo: "440192",
      taxNo: "729-115-442",
      activeOps: 9,
      guarantees: 2,
      completedOps: 9,
      totalOps: 18,
      pendingPrint: 0,
      description: "شريك التوريدات السريعة والشراء المباشر والممارسات المحدودة",
    },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Background Ambient Glow Orbs */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mt-40" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -mb-32" />

      {/* Top Portal Navbar (Clean, Independent, No Sidebar) */}
      <header className="relative z-20 border-b border-border bg-card/60 backdrop-blur-xl px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 flex items-center justify-center shadow-lg shadow-blue-600/25 royal-glow">
            <span className="text-xl font-black text-white">G</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                Golden<span className="text-blue-600 dark:text-blue-400">ERP</span>
              </h1>
              <Badge className="bg-blue-600/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-bold">
                بوابة الشركات المركزية
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              المنظومة الموحدة لإدارة دورة حياة المناقصات والعمليات للشركات الأربعة
            </p>
          </div>
        </div>

        {/* User Badge, Theme Switcher & Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-muted/50 border border-border">
            <Avatar className="h-7 w-7 ring-1 ring-blue-500/40">
              <AvatarFallback className="bg-blue-600 text-white text-xs font-black">
                {user.fullName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="text-right">
              <p className="text-xs font-bold text-foreground leading-tight">{user.fullName}</p>
              <p className="text-[10px] text-muted-foreground font-semibold">
                {roleLabels[user.role] || user.role}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-xl h-9 w-9 text-muted-foreground hover:text-foreground bg-muted/40 cursor-pointer"
            title="تبديل المظهر"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="rounded-xl h-9 text-xs font-bold border-border text-red-500 hover:bg-red-500/10 hover:text-red-600 flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">تسجيل الخروج</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area: 4 Isolated Company Cards */}
      <main className="relative z-10 flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col justify-center">
        {/* Welcome & Instructions Title */}
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-10 space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-600/10 border border-blue-500/25 text-blue-700 dark:text-blue-300 text-xs font-bold shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>مرحباً بك، أ/ {user.fullName} 👋</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight">
            اختر الشركة لبدء العمل في بيئتها المستقلة
          </h2>

          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed max-w-xl mx-auto">
            كل شركة تمثل كياناً تجارياً مستقلاً ببياناته ومناقصاته ودفاتره وإعداداته. بمجرد اختيار الشركة ستنتقل مباشرة إلى لوحة التحكم والعمليات المخصصة لها.
          </p>

          {user.role !== "GENERAL_MANAGER" && (
            <div className="mt-4 p-3.5 rounded-2xl bg-blue-600/10 border border-blue-500/25 text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center justify-center gap-2 max-w-xl mx-auto">
              <Shield className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>
                {(() => {
                  const authorizedCodes = getAuthorizedCompanyCodes();
                  if (user.allowedCompanies === "ALL") {
                    return "حسابك مصرح له بالوصول لكافة الشركات الأربعة وفق توجيه الإدارة.";
                  }
                  if (authorizedCodes.length === 0) {
                    return "⚠️ لم يتم تعيين أي شركة مصرحة لحسابك حتى الآن من قبل الإدارة العامة. يرجى مراجعة المدير العام لتفعيل الصلاحيات.";
                  }
                  const names = authorizedCodes.map(
                    (c) => companyCardsMeta.find((meta) => meta.code === c)?.name || `شركة (${c})`
                  );
                  return `الشركات المصرح لك بالدخول إليها وإدارتها حالياً: ${names.join(" ، ")}`;
                })()}
              </span>
            </div>
          )}
        </div>

        {/* The 4 Isolated Company Cards Grid - Responsive: 1 col on mobile, 2 col on tablet/laptop, 4 col on wide desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6">
          {companyCardsMeta.map((comp) => {
            const isCompanyLocked = isCompanyLockedForUser(comp.code);
            const isSelecting = selectingCode === comp.code;
            
            // Match with live overview data if available
            const liveData = overviewData.find((o) => o.code === comp.code);
            const activeOps = liveData ? liveData.activeOperations : comp.activeOps;
            const completedOps = liveData ? liveData.completedOperations : comp.completedOps;
            const guarantees = liveData ? liveData.pendingGuarantees : comp.guarantees;
            const totalOps = liveData ? liveData.totalOperations : comp.totalOps;
            const pendingPrint = liveData ? liveData.pendingPrintRequests : comp.pendingPrint;

            return (
              <div
                key={comp.code}
                className={`relative rounded-3xl p-5 sm:p-6 transition-all duration-300 flex flex-col justify-between border bg-card/85 dark:bg-card/45 backdrop-blur-xl shadow-xl hover:shadow-2xl ${
                  isCompanyLocked
                    ? "opacity-55 border-border cursor-not-allowed bg-muted/20"
                    : `${comp.cardBorder} hover:-translate-y-1.5 cursor-pointer group`
                }`}
                onClick={() => {
                  if (!isCompanyLocked && !isSelecting) {
                    handleSelectCompany(comp.code);
                  }
                }}
              >
                {/* Top Section */}
                <div className="space-y-4">
                  {/* Row 1: Code Badge + Independent Status Indicator */}
                  <div className="flex items-center justify-between gap-2">
                    <Badge className={`${comp.badgeColor} font-bold text-xs px-2.5 py-0.5 rounded-full border`}>
                      {comp.codeBadge}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground shrink-0">
                      {isCompanyLocked ? (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                          <Lock className="w-3 h-3 text-amber-500" />
                          <span>غير مصرح</span>
                        </span>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>مصرح ومتاح للدخول</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Avatar + Title & Subtitle (Zero Wrap Guarantee) */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${comp.accentColor} text-white flex items-center justify-center font-black text-xl shadow-md shrink-0`}
                    >
                      {comp.code}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg sm:text-xl font-black text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors whitespace-nowrap truncate">
                        {comp.name}
                      </h3>
                      <p className="text-xs text-muted-foreground font-semibold truncate" title={comp.formalName}>
                        {comp.formalName}
                      </p>
                    </div>
                  </div>

                  {/* Row 3: Commercial & Tax Registration Grid Box */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-muted/40 dark:bg-muted/20 border border-border/60 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground font-medium block">سجل تجاري:</span>
                      <span className="font-mono font-bold text-foreground tracking-wide text-xs">
                        {isCompanyLocked ? "••••••" : comp.regNo}
                      </span>
                    </div>
                    <div className="space-y-0.5 border-r border-border/60 pr-2.5">
                      <span className="text-[10px] text-muted-foreground font-medium block">بطاقة ضريبية:</span>
                      <span className="font-mono font-bold text-foreground tracking-wide text-xs">
                        {isCompanyLocked ? "••••••••••" : comp.taxNo}
                      </span>
                    </div>
                  </div>

                  {/* Row 4: 4 Isolated KPIs for this company (Secured / Hidden for unauthorized employee) */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 text-center transition-all group-hover:bg-muted/50">
                      <span className="text-[10px] text-muted-foreground font-bold block mb-0.5">النشطة</span>
                      {isCompanyLocked ? (
                        <span className="text-xl font-bold text-muted-foreground/40 font-mono flex items-center justify-center gap-1">
                          <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
                          <span>—</span>
                        </span>
                      ) : (
                        <span className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono">
                          {activeOps}
                        </span>
                      )}
                    </div>
                    <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 text-center transition-all group-hover:bg-muted/50">
                      <span className="text-[10px] text-muted-foreground font-bold block mb-0.5">الضمانات</span>
                      {isCompanyLocked ? (
                        <span className="text-xl font-bold text-muted-foreground/40 font-mono flex items-center justify-center gap-1">
                          <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
                          <span>—</span>
                        </span>
                      ) : (
                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          {guarantees}
                        </span>
                      )}
                    </div>
                    <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 text-center transition-all group-hover:bg-muted/50">
                      <span className="text-[10px] text-muted-foreground font-bold block mb-0.5">المكتملة</span>
                      {isCompanyLocked ? (
                        <span className="text-xl font-bold text-muted-foreground/40 font-mono flex items-center justify-center gap-1">
                          <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
                          <span>—</span>
                        </span>
                      ) : (
                        <span className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono">
                          {completedOps}
                        </span>
                      )}
                    </div>
                    <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 text-center transition-all group-hover:bg-muted/50">
                      <span className="text-[10px] text-muted-foreground font-bold block mb-0.5">الإجمالي</span>
                      {isCompanyLocked ? (
                        <span className="text-xl font-bold text-muted-foreground/40 font-mono flex items-center justify-center gap-1">
                          <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
                          <span>—</span>
                        </span>
                      ) : (
                        <span className="text-xl font-black text-foreground font-mono">
                          {totalOps}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Role-specific alert / indicator (only for authorized users) */}
                  {!isCompanyLocked && user.role === "DEPUTY_MANAGER" && pendingPrint > 0 && (
                    <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs font-bold">
                      <Printer className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{pendingPrint} طلب اعتماد طباعة بانتظارك</span>
                    </div>
                  )}
                </div>

                {/* Bottom of Card: Action Button */}
                <div className="pt-5 mt-4 border-t border-border/80">
                  {isCompanyLocked ? (
                    <div className="w-full py-3 px-3 rounded-2xl bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center gap-2">
                      <Lock className="h-3.5 w-3.5" />
                      <span>غير مصرح بحسابك</span>
                    </div>
                  ) : (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCompany(comp.code);
                      }}
                      disabled={isSelecting}
                      className={`w-full py-5 rounded-2xl font-black text-xs sm:text-sm text-white shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] bg-gradient-to-r ${comp.accentColor} hover:brightness-110 whitespace-nowrap`}
                    >
                      {isSelecting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>جاري الدخول...</span>
                        </>
                      ) : (
                        <>
                          <span>دخول بيئة {comp.name}</span>
                          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1.5 transition-transform shrink-0" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border bg-card/30 backdrop-blur-md px-4 sm:px-8 py-4 text-center">
        <p className="text-[11px] sm:text-xs text-muted-foreground font-medium">
          نظام GoldenERP لإدارة العمليات والمناقصات الحكومية والتأمينات • منظومة معتمدة وفق اللائحة التنفيذية للقانون 182
        </p>
      </footer>
    </div>
  );
}
