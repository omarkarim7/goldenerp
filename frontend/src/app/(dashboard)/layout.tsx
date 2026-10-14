"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  LayoutDashboard, Building2, FileText, Radar, Shield, Package, Users,
  BarChart3, Archive, Settings, LogOut, Search, Bell, ChevronLeft, ChevronDown,
  Truck, Wallet, ClipboardCheck, Menu, X, Plus, Sparkles, CheckCircle2,
  AlertTriangle, Sun, Moon, Laptop, ChevronsUpDown, Check, CheckCheck, ShieldAlert, Globe, RefreshCw, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNotifications } from "@/context/notifications-context";
import { useCompany } from "@/context/company-context";
import { API_BASE_URL } from "@/lib/api";

function getPageTitle(pathname: string): string {
  if (pathname === "/dashboard") return "لوحة التحكم";
  if (pathname.startsWith("/dashboard/approvals")) return "الاعتمادات";
  if (pathname.startsWith("/dashboard/operations/new")) return "إضافة عملية";
  if (pathname.startsWith("/dashboard/operations/")) return "تفاصيل العملية";
  if (pathname.startsWith("/dashboard/operations")) return "العمليات";
  if (pathname.startsWith("/dashboard/guarantees")) return "خطابات الضمان";
  if (pathname.startsWith("/dashboard/suppliers")) return "الموردين";
  if (pathname.startsWith("/dashboard/coding-guide")) return "التكويد";
  if (pathname.startsWith("/dashboard/inventory")) return "أرشيف المخازن";
  if (pathname.startsWith("/dashboard/payments")) return "المالية";
  if (pathname.startsWith("/dashboard/employees")) return "الموظفين";
  if (pathname.startsWith("/dashboard/visits")) return "المعاينات";
  if (pathname.startsWith("/dashboard/radar")) return "الرادار";
  if (pathname.startsWith("/dashboard/reports")) return "التقارير";
  if (pathname.startsWith("/dashboard/documents")) return "المستندات";
  if (pathname.startsWith("/dashboard/companies")) return "بيانات الشركة";
  if (pathname.startsWith("/dashboard/archive")) return "الأرشيف";
  if (pathname.startsWith("/dashboard/settings")) return "الإعدادات";
  return "العمليات";
}

function getPageBreadcrumb(pathname: string): string {
  if (pathname === "/dashboard") return "الرئيسية";
  if (pathname.startsWith("/dashboard/approvals")) return "الاعتمادات";
  if (pathname.startsWith("/dashboard/coding-guide")) return "التكويد";
  if (pathname.startsWith("/dashboard/operations")) return "العمليات";
  if (pathname.startsWith("/dashboard/guarantees")) return "خطابات الضمان";
  if (pathname.startsWith("/dashboard/suppliers")) return "الموردين";
  if (pathname.startsWith("/dashboard/inventory")) return "أرشيف المخازن";
  if (pathname.startsWith("/dashboard/payments")) return "المالية";
  if (pathname.startsWith("/dashboard/employees")) return "الموظفين";
  if (pathname.startsWith("/dashboard/visits")) return "المعاينات";
  if (pathname.startsWith("/dashboard/radar")) return "الرادار";
  if (pathname.startsWith("/dashboard/reports")) return "التقارير";
  if (pathname.startsWith("/dashboard/documents")) return "المستندات";
  if (pathname.startsWith("/dashboard/companies")) return "بيانات الشركة";
  if (pathname.startsWith("/dashboard/archive")) return "الأرشيف";
  if (pathname.startsWith("/dashboard/settings")) return "الإعدادات";
  return "الرئيسية";
}

interface UserData {
  id: string;
  fullName: string;
  username: string;
  role: string;
}

interface SidebarItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
  badgeClass?: string;
}

interface SidebarSection {
  id: string;
  title: string;
  icon: any;
  iconColor: string;
  bgLight: string;
  items: SidebarItem[];
}

function getSidebarSections(role?: string): SidebarSection[] {
  if (role === "DEPUTY_MANAGER") {
    return [
      {
        id: "approvals_hub",
        title: "الاعتمادات",
        icon: CheckCircle2,
        iconColor: "text-amber-500",
        bgLight: "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400",
        items: [
          { label: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard },
          { label: "الاعتمادات", href: "/dashboard/approvals", icon: CheckCircle2, badge: "مهامك", badgeClass: "badge-amber" },
        ],
      },
      {
        id: "operations_view",
        title: "العمليات",
        icon: FileText,
        iconColor: "text-blue-500",
        bgLight: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400",
        items: [
          { label: "العمليات", href: "/dashboard/operations", icon: FileText, badge: "اطلاع", badgeClass: "badge-blue" },
          { label: "المستندات", href: "/dashboard/documents", icon: FileText },
        ],
      },
      {
        id: "reports_archive",
        title: "التقارير",
        icon: BarChart3,
        iconColor: "text-purple-500",
        bgLight: "bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400",
        items: [
          { label: "التقارير", href: "/dashboard/reports", icon: BarChart3 },
          { label: "الأرشيف", href: "/dashboard/archive", icon: Archive },
        ],
      },
    ];
  }

  if (role === "EMPLOYEE") {
    return [
      {
        id: "monitoring",
        title: "الرئيسية",
        icon: LayoutDashboard,
        iconColor: "text-blue-500",
        bgLight: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400",
        items: [
          { label: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard },
          { label: "الرادار", href: "/dashboard/radar", icon: Radar, badge: "ذكي", badgeClass: "badge-blue" },
          { label: "الاعتمادات", href: "/dashboard/approvals", icon: CheckCircle2, badge: "طلباتي", badgeClass: "badge-amber" },
        ],
      },
      {
        id: "operations",
        title: "العمليات",
        icon: FileText,
        iconColor: "text-amber-500",
        bgLight: "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400",
        items: [
          { label: "العمليات", href: "/dashboard/operations", icon: FileText },
        ],
      },
      {
        id: "logistics",
        title: "الموردين والمعاينات",
        icon: Truck,
        iconColor: "text-emerald-500",
        bgLight: "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        items: [
          { label: "الموردين", href: "/dashboard/suppliers", icon: Truck },
          { label: "المعاينات", href: "/dashboard/visits", icon: ClipboardCheck },
        ],
      },
      {
        id: "docs",
        title: "المستندات والأرشيف",
        icon: FileText,
        iconColor: "text-purple-500",
        bgLight: "bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400",
        items: [
          { label: "المستندات", href: "/dashboard/documents", icon: FileText },
          { label: "الأرشيف", href: "/dashboard/archive", icon: Archive },
          { label: "التكويد", href: "/dashboard/coding-guide", icon: BookOpen },
        ],
      },
    ];
  }

  // GENERAL_MANAGER: Full sections
  return [
    {
      id: "monitoring",
      title: "الرئيسية",
      icon: LayoutDashboard,
      iconColor: "text-blue-500",
      bgLight: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400",
      items: [
        { label: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard },
        { label: "الاعتمادات", href: "/dashboard/approvals", icon: CheckCircle2, badge: "اعتماد", badgeClass: "badge-amber" },
        { label: "الرادار", href: "/dashboard/radar", icon: Radar, badge: "ذكي", badgeClass: "badge-blue" },
      ],
    },
    {
      id: "operations",
      title: "العمليات",
      icon: FileText,
      iconColor: "text-amber-500",
      bgLight: "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400",
      items: [
        { label: "العمليات", href: "/dashboard/operations", icon: FileText },
      ],
    },
    {
      id: "finance",
      title: "المالية والموردين",
      icon: Wallet,
      iconColor: "text-emerald-500",
      bgLight: "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
      items: [
        { label: "الموردين", href: "/dashboard/suppliers", icon: Truck },
        { label: "المالية", href: "/dashboard/payments", icon: Wallet },
      ],
    },
    {
      id: "hr",
      title: "الموارد البشرية",
      icon: Users,
      iconColor: "text-purple-500",
      bgLight: "bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400",
      items: [
        { label: "الموظفين", href: "/dashboard/employees", icon: Users },
        { label: "المعاينات", href: "/dashboard/visits", icon: ClipboardCheck },
      ],
    },
    {
      id: "system",
      title: "النظام والأرشيف",
      icon: Settings,
      iconColor: "text-rose-500",
      bgLight: "bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400",
      items: [
        { label: "بيانات الشركة", href: "/dashboard/companies", icon: Building2 },
        { label: "المستندات", href: "/dashboard/documents", icon: FileText },
        { label: "التقارير", href: "/dashboard/reports", icon: BarChart3 },
        { label: "الأرشيف", href: "/dashboard/archive", icon: Archive },
        { label: "التكويد", href: "/dashboard/coding-guide", icon: BookOpen },
        { label: "الإعدادات", href: "/dashboard/settings", icon: Settings },
      ],
    },
  ];
}

function isRouteAllowed(role: string | undefined, pathname: string): boolean {
  if (!role) return true;
  if (role === "GENERAL_MANAGER") return true;

  if (pathname === "/dashboard") return true;

  if (role === "DEPUTY_MANAGER") {
    // Blocked from creating new operations and operational editing
    if (pathname.startsWith("/dashboard/operations/new")) return false;
    if (pathname.startsWith("/dashboard/settings")) return false;
    if (pathname.startsWith("/dashboard/companies")) return false;
    if (pathname.startsWith("/dashboard/payments")) return false;
    if (pathname.startsWith("/dashboard/inventory")) return false;
    if (pathname.startsWith("/dashboard/suppliers")) return false;
    if (pathname.startsWith("/dashboard/employees")) return false;
    if (pathname.startsWith("/dashboard/guarantees")) return false;
    if (pathname.startsWith("/dashboard/visits")) return false;
    if (pathname.startsWith("/dashboard/radar")) return false;

    // Allowed for Deputy Manager:
    if (pathname.startsWith("/dashboard/approvals")) return true;
    if (pathname.startsWith("/dashboard/operations")) return true;
    if (pathname.startsWith("/dashboard/reports")) return true;
    if (pathname.startsWith("/dashboard/documents")) return true;
    if (pathname.startsWith("/dashboard/archive")) return true;
    return false;
  }

  if (role === "EMPLOYEE") {
    // Blocked from admin settings, companies management, finance margins, and managerial HR
    if (pathname.startsWith("/dashboard/settings")) return false;
    if (pathname.startsWith("/dashboard/companies")) return false;
    if (pathname.startsWith("/dashboard/payments")) return false;
    if (pathname.startsWith("/dashboard/employees")) return false;
    if (pathname.startsWith("/dashboard/reports")) return false;
    return true;
  }

  return true;
}

function getMobileBottomNavItems(role?: string) {
  if (role === "DEPUTY_MANAGER") {
    return [
      { label: "الرئيسية", href: "/dashboard", icon: LayoutDashboard },
      { label: "الاعتمادات", href: "/dashboard/approvals", icon: CheckCircle2 },
      { label: "العمليات", href: "/dashboard/operations", icon: FileText },
      { label: "التقارير", href: "/dashboard/reports", icon: BarChart3 },
    ];
  }
  if (role === "EMPLOYEE") {
    return [
      { label: "الرئيسية", href: "/dashboard", icon: LayoutDashboard },
      { label: "العمليات", href: "/dashboard/operations", icon: FileText },
      { label: "الرادار", href: "/dashboard/radar", icon: Radar },
      { label: "الطباعة", href: "/dashboard/approvals", icon: CheckCircle2 },
    ];
  }
  return [
    { label: "الرئيسية", href: "/dashboard", icon: LayoutDashboard },
    { label: "العمليات", href: "/dashboard/operations", icon: FileText },
    { label: "الاعتمادات", href: "/dashboard/approvals", icon: CheckCircle2 },
    { label: "المالية", href: "/dashboard/payments", icon: Wallet },
  ];
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Global Company Scope Context
  const { selectedCompany, setSelectedCompany, currentCompany, isCompanyLocked } = useCompany();

  // Shared Notification state from context
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [notifFilter, setNotifFilter] = useState<"all" | "unread">("all");
  const displayedNotifications =
    notifFilter === "unread" ? notifications.filter((n) => !n.isRead) : notifications;

  // Dropdown refs for click-outside detection
  const quickActionRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (quickActionRef.current && !quickActionRef.current.contains(target)) {
        setQuickActionOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Accordion state: which sections are expanded
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    monitoring: true,
    operations: true,
    finance: true,
    hr: true,
    system: true,
    approvals_hub: true,
    operations_view: true,
    reports_archive: true,
    logistics: true,
    docs: true,
  });

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAllSections = () => {
    setOpenSections({
      monitoring: true,
      operations: true,
      finance: true,
      hr: true,
      system: true,
      approvals_hub: true,
      operations_view: true,
      reports_archive: true,
      logistics: true,
      docs: true,
    });
  };

  const collapseAllSections = () => {
    setOpenSections({
      monitoring: false,
      operations: false,
      finance: false,
      hr: false,
      system: false,
      approvals_hub: false,
      operations_view: false,
      reports_archive: false,
      logistics: false,
      docs: false,
    });
  };

  useEffect(() => {
    setMounted(true);
    const userData = localStorage.getItem("user");
    const token = localStorage.getItem("accessToken");
    if (!userData) {
      router.push("/login");
      return;
    }
    
    let parsedUser: any = null;
    try {
      parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    } catch {
      router.push("/login");
      return;
    }

    // Enforce Company Selection & Authorization
    const savedComp = localStorage.getItem("selectedCompany");
    if (!savedComp || savedComp === "ALL" || !["A", "B", "C", "D"].includes(savedComp)) {
      router.push("/select-company");
      return;
    }

    // If not General Manager, ensure selected company is in user's allowed list
    if (parsedUser && parsedUser.role !== "GENERAL_MANAGER") {
      const allowed = parsedUser.allowedCompanies;
      if (!allowed || allowed === "NONE") {
        router.push("/select-company");
        return;
      }
      if (allowed !== "ALL") {
        const allowedList = allowed.split(",").map((c: string) => c.trim().toUpperCase());
        if (!allowedList.includes(savedComp)) {
          router.push("/select-company");
          return;
        }
      }
    }

    // Fetch fresh profile in background to keep permissions synced
    if (token) {
      const apiBase = API_BASE_URL;
      fetch(`${apiBase}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((freshUser) => {
          if (freshUser && freshUser.id) {
            setUser(freshUser);
            localStorage.setItem("user", JSON.stringify(freshUser));
          }
        })
        .catch(() => {});
    }
  }, [router]);

  const sidebarSections = getSidebarSections(user?.role);
  const mobileBottomNavItems = getMobileBottomNavItems(user?.role);

  // Keep section active when user navigates
  useEffect(() => {
    const sections = getSidebarSections(user?.role);
    for (const sec of sections) {
      if (sec.items.some((it) => it.href === pathname || (it.href !== "/dashboard" && pathname.startsWith(it.href)))) {
        setOpenSections((prev) => ({ ...prev, [sec.id]: true }));
        break;
      }
    }
  }, [pathname, user?.role]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/operations?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const roleLabels: Record<string, string> = {
    GENERAL_MANAGER: "مدير عام",
    DEPUTY_MANAGER: "نائب المدير",
    EMPLOYEE: "موظف",
  };

  // Close popups on route change
  useEffect(() => {
    setNotificationsOpen(false);
    setQuickActionOpen(false);
    setUserMenuOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  if (!user) return null;

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="min-h-screen w-full max-w-full bg-background text-foreground flex overflow-x-hidden relative ambient-mesh">
      {/* 1. Mobile Drawer Overlay (Non-overflowing, completely hidden when closed) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden overflow-hidden">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-sidebar border-l border-sidebar-border shadow-2xl flex flex-col z-50 animate-slide-up">
            {/* Mobile Drawer Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border shrink-0">
              <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25 border border-white/20">
                  <span className="text-base font-black text-white">G</span>
                </div>
                <div>
                  <h1 className="font-black text-lg tracking-tight text-foreground">
                    Golden<span className="text-blue-600 dark:text-blue-400">ERP</span>
                  </h1>
                  <p className="text-xs text-muted-foreground font-bold -mt-0.5">منظومة إدارة العمليات</p>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Mobile Drawer Navigation Items with Collapsible Accordions */}
            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-2.5">
              <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                <span className="font-extrabold text-[12px] text-foreground">أقسام القائمة</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={expandAllSections}
                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-[12px] font-bold"
                  >
                    توسيع الكل
                  </button>
                  <span>•</span>
                  <button
                    onClick={collapseAllSections}
                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-[12px] font-bold"
                  >
                    طي الكل
                  </button>
                </div>
              </div>

              {sidebarSections.map((section) => {
                const isOpen = openSections[section.id];
                const hasActiveChild = section.items.some(
                  (item) =>
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href))
                );

                return (
                  <div
                    key={section.id}
                    className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden transition-all shadow-xs"
                  >
                    {/* Section Header Accordion Trigger */}
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 text-[13.5px] font-black transition-colors select-none cursor-pointer",
                        hasActiveChild ? "text-blue-600 dark:text-blue-400 bg-blue-500/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn("p-1.5 rounded-lg shrink-0", section.bgLight)}>
                          <section.icon className="h-4.5 w-4.5" />
                        </div>
                        <span className="truncate text-[13.5px] font-black">{section.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono font-bold">
                          {section.items.length}
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform duration-200",
                            isOpen ? "rotate-0" : "-rotate-90"
                          )}
                        />
                      </div>
                    </button>

                    {/* Section Items */}
                    {isOpen && (
                      <div className="p-1.5 space-y-1 bg-background/50 border-t border-border/40 animate-fade-in">
                        {section.items.map((item) => {
                          const isActive =
                            pathname === item.href ||
                            (item.href !== "/dashboard" && pathname.startsWith(item.href));

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMobileOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-extrabold transition-all",
                                isActive
                                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black shadow-md shadow-blue-500/25"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                            >
                              <item.icon className={cn("h-4.5 w-4.5 shrink-0", isActive ? "text-white scale-110" : "")} />
                              <span className="flex-1 truncate">{item.label}</span>
                              {item.badge && (
                                <span
                                  className={cn(
                                    "text-[11px] px-2 py-0.5 rounded-full font-bold",
                                    isActive
                                      ? "bg-white/20 text-white"
                                      : item.badgeClass || "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                  )}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile Drawer Footer User */}
            <div className="p-3 border-t border-sidebar-border shrink-0 bg-muted/40">
              <div className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                  <Avatar className="h-10 w-10 ring-2 ring-blue-500/20">
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-xs font-black">
                      {user.fullName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-black text-foreground truncate">{user.fullName}</p>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{roleLabels[user.role] || user.role}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-500 cursor-pointer"
                  onClick={handleLogout}
                  title="تسجيل الخروج"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* 2. Desktop Fixed Sidebar (Rock-solid, pinned top to bottom, 100% full viewport height, never cut off) */}
      <aside
        className={cn(
          "hidden lg:flex fixed top-0 bottom-0 right-0 h-screen shrink-0 border-l border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#0c1427]/95 backdrop-blur-xl transition-all duration-300 ease-in-out flex-col z-30 shadow-[0_4px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)]",
          collapsed ? "w-[76px]" : "w-72"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-3.5 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 group w-full">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25 group-hover:scale-105 transition-all border border-white/20">
              <span className="text-lg font-black text-white">G</span>
            </div>
            {!collapsed && (
              <div className="animate-fade-in flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h1 className="font-black text-lg tracking-tight text-slate-900 dark:text-white">
                    Golden<span className="text-blue-600 dark:text-blue-400">ERP</span>
                  </h1>
                  <span className="px-1.5 py-0.2 text-[9px] font-black rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    PRO
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-bold -mt-0.5 truncate">منظومة إدارة العمليات</p>
              </div>
            )}
          </Link>
        </div>

        {/* Active Company Badge in Desktop Sidebar */}
        {!collapsed ? (
          <div className="mx-3 mt-3 p-2.5 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between shadow-2xs hover:border-blue-400/40 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-mono font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                {selectedCompany}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-muted-foreground font-bold block leading-tight">الشركة الحالية</span>
                <span className="font-black text-slate-900 dark:text-slate-100 text-[13.5px] truncate block">
                  {currentCompany?.name || `شركة ${selectedCompany}`}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedCompany("ALL");
                localStorage.removeItem("selectedCompany");
                router.push("/select-company");
              }}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold cursor-pointer transition-all shadow-2xs shrink-0 active:scale-95"
              title="العودة لاختيار شركة أخرى"
            >
              تبديل
            </button>
          </div>
        ) : (
          <div className="mt-2.5 flex justify-center">
            <button
              onClick={() => {
                setSelectedCompany("ALL");
                localStorage.removeItem("selectedCompany");
                router.push("/select-company");
              }}
              className="w-9 h-9 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/25 font-mono font-black text-xs flex items-center justify-center transition-all cursor-pointer shadow-2xs"
              title={`الشركة الحالية: ${currentCompany?.name || selectedCompany} (اضغط للتبديل)`}
            >
              {selectedCompany}
            </button>
          </div>
        )}

        {/* Expand/Collapse All Toolbar (Only visible when desktop sidebar is expanded) */}
        {!collapsed && (
          <div className="flex items-center justify-between px-4 mt-3 mb-1 text-xs text-muted-foreground">
            <span className="font-extrabold text-foreground/80 tracking-wider text-[12px]">أقسام القائمة</span>
            <div className="flex items-center gap-2 font-bold text-[12px]">
              <button
                type="button"
                onClick={expandAllSections}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                title="توسيع كافة الأقسام"
              >
                توسيع الكل
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={collapseAllSections}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                title="طي كافة الأقسام"
              >
                طي الكل
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Nav Items with Collapsible Accordion Sections */}
        <div className="flex-1 min-h-0 overflow-y-auto py-2 px-3 space-y-2">
          {sidebarSections.map((section) => {
            const isOpen = openSections[section.id];
            const hasActiveChild = section.items.some(
              (item) =>
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href))
            );

            // In collapsed mode: render icon pills
            if (collapsed) {
              return (
                <div key={section.id} className="space-y-1.5 py-1.5 border-b border-border/30 last:border-b-0">
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        className={cn(
                          "relative flex items-center justify-center h-10 w-10 mx-auto rounded-xl transition-all duration-150 group",
                          isActive
                            ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-4.5 w-4.5 group-hover:scale-110 transition-transform" />
                        {isActive && (
                          <div className="absolute right-0 top-2 bottom-2 w-1 rounded-l-full bg-amber-400" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            }

            // In full expanded mode: Accordion with header toggle
            return (
              <div key={section.id} className="rounded-2xl overflow-hidden transition-all">
                {/* Section Accordion Trigger */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13.5px] font-black transition-all select-none group cursor-pointer",
                    hasActiveChild
                      ? "text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/15 font-black"
                      : "text-muted-foreground hover:text-foreground hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                  )}
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn("p-1.5 rounded-lg shrink-0 transition-transform group-hover:scale-105 shadow-2xs", section.bgLight)}>
                      <section.icon className="h-4.5 w-4.5" />
                    </div>
                    <span className="truncate text-[13.5px] font-black group-hover:text-foreground">
                      {section.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-muted-foreground font-mono">
                      {section.items.length}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground/80 transition-transform duration-200",
                        isOpen ? "rotate-0" : "-rotate-90"
                      )}
                    />
                  </div>
                </button>

                {/* Section Items (Collapsible body) */}
                {isOpen && (
                  <div className="mt-1 space-y-1 pr-2.5 mr-2.5 border-r-2 border-slate-100 dark:border-slate-800/80 animate-fade-in">
                    {section.items.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/dashboard" && pathname.startsWith(item.href));

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] sm:text-[14.5px] font-extrabold transition-all duration-150",
                            isActive
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black shadow-md shadow-blue-500/25 translate-x-[-2px]"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 hover:text-slate-950 dark:hover:text-white"
                          )}
                        >
                          {isActive && (
                            <div className="absolute right-0 top-1.5 bottom-1.5 w-1 rounded-l-full bg-amber-300" />
                          )}

                          <item.icon
                            className={cn(
                              "h-4.5 w-4.5 shrink-0 transition-transform duration-150",
                              isActive ? "text-white scale-110" : "text-slate-400 dark:text-slate-500 group-hover:text-foreground group-hover:scale-105"
                            )}
                          />

                          <div className="flex-1 flex items-center justify-between min-w-0">
                            <span className="truncate">{item.label}</span>
                            {item.badge && (
                              <span
                                className={cn(
                                  "text-[11px] px-2 py-0.5 rounded-full font-bold",
                                  isActive
                                    ? "bg-white/20 text-white backdrop-blur-xs"
                                    : item.badgeClass || "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                )}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* User Card & Collapse Button Firmly Pinned at Bottom */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 shrink-0 bg-white/95 dark:bg-[#0c1427]/95 backdrop-blur-md">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 shadow-2xs">
              <div className="relative shrink-0">
                <Avatar className="h-10 w-10 ring-2 ring-blue-500/20 shadow-xs">
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-xs font-black">
                    {user.fullName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-black text-foreground truncate">{user.fullName}</p>
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block -mt-0.5">
                  {roleLabels[user.role] || user.role}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl cursor-pointer transition-colors"
                onClick={handleLogout}
                title="تسجيل الخروج"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <Avatar className="h-9 w-9 ring-2 ring-blue-500/20">
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-xs font-black">
                    {user.fullName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl cursor-pointer"
                onClick={handleLogout}
                title="تسجيل الخروج"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Prominent Colored Collapse/Expand Button */}
          {!collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="w-full mt-2.5 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-[13.5px] flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-[0.98] cursor-pointer group border border-white/20"
              title="تصغير القائمة الجانبية"
            >
              <ChevronLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1 stroke-[2.5]" />
              <span>تصغير القائمة</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="w-11 h-10 mx-auto mt-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/25 transition-all cursor-pointer hover:scale-105 active:scale-95 group border border-white/20"
              title="توسيع القائمة الجانبية (انقر هنا)"
            >
              <ChevronLeft className="h-5 w-5 rotate-180 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      </aside>

      {/* 3. Main Body Container (Offset with margin-right in RTL so content never overlaps fixed sidebar) */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen min-w-0 max-w-full overflow-x-hidden transition-all duration-300",
          collapsed ? "lg:mr-[76px]" : "lg:mr-72"
        )}
      >
        {/* Top Header Bar (Prestigious Royal Blue Gradient Style) */}
        <header className="h-16 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 dark:from-blue-900 dark:via-blue-800 dark:to-indigo-950 text-white border-b border-white/20 flex items-center justify-between gap-3 px-3 sm:px-6 sticky top-0 z-20 shadow-lg backdrop-blur-md">
          {/* Left section: Hamburger (mobile) + Search */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 max-w-xs xl:max-w-md 2xl:max-w-xl">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white hover:text-white bg-white/15 hover:bg-white/25 border border-white/25 rounded-xl h-9 w-9 shrink-0 cursor-pointer transition-all shadow-2xs"
              onClick={() => setMobileOpen(true)}
              aria-label="القائمة"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Mobile Logo mark */}
            <div className="lg:hidden flex items-center gap-1.5 shrink-0">
              <span className="font-black text-sm sm:text-base tracking-tight text-white">
                Golden<span className="text-amber-300">ERP</span>
              </span>
            </div>

            {/* Global Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 hidden md:block min-w-0">
              <div className="relative group">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/90 group-focus-within:text-white transition-colors" />
                <Input
                  type="text"
                  placeholder="بحث سريع في العمليات (AM01، جهة الإسناد)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 bg-white/15 hover:bg-white/20 focus:bg-white/25 border-white/25 focus:border-white text-white placeholder:text-blue-100/90 rounded-xl h-9 sm:h-10 text-xs w-full transition-all shadow-2xs"
                />
              </div>
            </form>
          </div>

          {/* Right section: Theme Toggle + Quick Action + Notifications + Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Active Company Indicator */}
            {mounted && (
              <Link
                href="/select-company"
                onClick={() => {
                  setSelectedCompany("ALL");
                  localStorage.removeItem("selectedCompany");
                }}
                title="اضغط للانتقال لبوابة اختيار الشركات"
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-bold shadow-sm transition-all cursor-pointer group backdrop-blur-md shrink-0"
              >
                <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-emerald-400 group-hover:scale-125 animate-pulse shadow-xs transition-transform ring-2 ring-emerald-300/40 shrink-0" />
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                  <Building2 className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-amber-300 group-hover:text-white shrink-0 transition-colors" />
                  <span className="text-white font-black truncate max-w-[75px] xs:max-w-[110px] md:max-w-[140px] xl:max-w-none">
                    {currentCompany?.name || `شركة ${selectedCompany}`}
                  </span>
                  <Badge className="bg-white text-blue-700 font-mono text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-4 font-black border-0 shadow-2xs shrink-0">
                    {selectedCompany}
                  </Badge>
                </div>
              </Link>
            )}

            {/* Theme Toggle Button (Light / Dark) */}
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-xl h-9 w-9 bg-white/15 hover:bg-white/25 border border-white/25 text-white transition-all cursor-pointer shadow-2xs"
                title={theme === "dark" ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الليلي"}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 text-amber-300 animate-scale-up" />
                ) : (
                  <Moon className="h-4 w-4 text-amber-200 animate-scale-up" />
                )}
              </Button>
            )}

            {/* Quick Action Button */}
            <div className="relative" ref={quickActionRef}>
              <Button
                onClick={() => {
                  setQuickActionOpen(!quickActionOpen);
                  setNotificationsOpen(false);
                  setUserMenuOpen(false);
                }}
                className="bg-white hover:bg-blue-50 text-blue-700 font-black text-xs h-9 px-3.5 rounded-xl shadow-md border border-white/40 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-blue-700 stroke-[2.5]" />
                <span className="hidden sm:inline">إجراء سريع</span>
              </Button>

              {/* Quick Actions Dropdown (100% Solid Non-Transparent) */}
              {quickActionOpen && (
                <div className="absolute left-0 mt-2 w-64 rounded-2xl solid-dropdown p-2.5 shadow-2xl z-50 animate-scale-up">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50 pb-2 mb-1.5">
                    إجراء سريع ({roleLabels[user.role] || user.role})
                  </div>
                  {user.role === "DEPUTY_MANAGER" ? (
                    <>
                      <Link
                        href="/dashboard/approvals"
                        onClick={() => setQuickActionOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-foreground hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                      >
                        <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-500">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <span>اعتماد الطباعة</span>
                      </Link>
                      <Link
                        href="/dashboard/operations"
                        onClick={() => setQuickActionOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-foreground hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                      >
                        <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-500">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span>سجل العمليات</span>
                      </Link>
                      <Link
                        href="/dashboard/reports"
                        onClick={() => setQuickActionOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-foreground hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
                      >
                        <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-500">
                          <BarChart3 className="h-4 w-4" />
                        </div>
                        <span>التقارير</span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/dashboard/operations/new"
                        onClick={() => setQuickActionOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-foreground hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                      >
                        <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-500">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span>إضافة عملية</span>
                      </Link>
                      <Link
                        href="/dashboard/approvals"
                        onClick={() => setQuickActionOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-foreground hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                      >
                        <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-500">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <span>{user.role === "GENERAL_MANAGER" ? "اعتماد الطباعة" : "طلب الاعتماد"}</span>
                      </Link>
                      <Link
                        href="/dashboard/operations"
                        onClick={() => setQuickActionOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-foreground hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                      >
                        <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-500">
                          <Shield className="h-4 w-4" />
                        </div>
                        <span>متابعة العمليات والضمانات</span>
                      </Link>
                      <Link
                        href="/dashboard/suppliers"
                        onClick={() => setQuickActionOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-foreground hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
                      >
                        <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-500">
                          <Truck className="h-4 w-4" />
                        </div>
                        <span>إضافة مورد</span>
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Notifications Button */}
            <div className="relative" ref={notificationsRef}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setQuickActionOpen(false);
                  setUserMenuOpen(false);
                }}
                className="relative text-white hover:text-white bg-white/15 hover:bg-white/25 border border-white/25 rounded-xl h-9 w-9 cursor-pointer transition-all shadow-2xs"
                aria-label="التنبيهات"
              >
                <Bell className="h-4 w-4 text-white" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -left-1 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] font-black bg-amber-400 text-slate-950 border-0 animate-scale-up shadow-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Button>

              {/* Notifications Dropdown (100% Solid Non-Transparent, Opaque Cards with Mark-As-Read) */}
              {notificationsOpen && (
                <div className="absolute left-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-96 max-w-sm rounded-2xl solid-dropdown p-3.5 shadow-2xl z-50 animate-scale-up">
                  {/* Notifications Header */}
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border/60">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                        <Bell className="h-4 w-4 text-amber-500" />
                        إشعارات {currentCompany?.name ? `شركة ${currentCompany.name}` : "المنظومة"}
                      </span>
                      <Badge className="bg-blue-600 text-white font-mono text-[9px] px-1.5 py-0 h-4 font-black">
                        {selectedCompany}
                      </Badge>
                      {unreadCount > 0 ? (
                        <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10">
                          {unreadCount} غير مقروء
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10">
                          جميعها مقروءة
                        </Badge>
                      )}
                    </div>

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-amber-500/10"
                        title="تعيين كل التنبيهات كمقروءة"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span>تعيين الكل كمقروء</span>
                      </button>
                    )}
                  </div>

                  {/* Filter tabs: الكل / غير المقروءة */}
                  <div className="flex items-center gap-1.5 mb-2.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setNotifFilter("all")}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        notifFilter === "all"
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      الكل ({notifications.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotifFilter("unread")}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        notifFilter === "unread"
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      غير المقروءة ({unreadCount})
                    </button>
                  </div>

                  {/* Notification Items List */}
                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-0.5">
                    {displayedNotifications.length === 0 ? (
                      <div className="py-8 text-center space-y-2">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                        <p className="text-xs font-bold text-foreground">لا توجد تنبيهات جديدة</p>
                        <p className="text-[11px] text-muted-foreground">جميع الإشعارات تم الاطلاع عليها</p>
                      </div>
                    ) : (
                      displayedNotifications.map((notif) => {
                        const isWarning = notif.type === "warning";
                        const isInfo = notif.type === "info";

                        return (
                          <div
                            key={notif.id}
                            className={`p-3 rounded-xl border transition-all cursor-pointer group relative ${
                              !notif.isRead
                                ? isWarning
                                ? "bg-amber-500/10 dark:bg-amber-950/40 border-amber-500/30 hover:border-amber-500/50"
                                : isInfo
                                ? "bg-blue-500/10 dark:bg-blue-950/40 border-blue-500/30 hover:border-blue-500/50"
                                : "bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/30 hover:border-emerald-500/50"
                                : "bg-muted/30 border-border opacity-70 hover:opacity-100"
                            }`}
                            onClick={() => {
                              markAsRead(notif.id);
                              setNotificationsOpen(false);
                              router.push(notif.link);
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 font-bold text-xs">
                                {!notif.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                                )}
                                <span
                                  className={
                                    !notif.isRead
                                      ? isWarning
                                        ? "text-amber-600 dark:text-amber-300"
                                        : isInfo
                                        ? "text-blue-600 dark:text-blue-300"
                                        : "text-emerald-600 dark:text-emerald-300"
                                      : "text-foreground"
                                  }
                                >
                                  {notif.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  {notif.time}
                                </span>
                                {!notif.isRead ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(notif.id);
                                    }}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                                    title="وضع هذا التنبيه كمقروء"
                                  >
                                    <Check className="h-3 w-3" />
                                    <span>كمقروء</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    <CheckCheck className="h-3 w-3 text-emerald-500" />
                                    مقروء
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-foreground mt-1 text-[11px] leading-relaxed">
                              {notif.message}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Notifications Footer */}
                  <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                    <Link
                      href="/dashboard/reports"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-amber-500 hover:underline font-bold cursor-pointer"
                    >
                      عرض التقارير والسجلات
                    </Link>
                    <button
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                    >
                      إغلاق
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => {
                  setUserMenuOpen(!userMenuOpen);
                  setQuickActionOpen(false);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2 p-1.5 sm:px-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white transition-all cursor-pointer shadow-2xs"
              >
                <Avatar className="h-8 w-8 ring-2 ring-amber-400 shadow-xs">
                  <AvatarFallback className="bg-amber-400 text-slate-950 text-xs font-black">
                    {user.fullName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-black text-white hidden md:inline truncate max-w-[110px]">
                  {user.fullName}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-white/70 hidden sm:inline" />
              </button>

              {userMenuOpen && (
                <div className="absolute left-0 mt-2 w-56 rounded-2xl solid-dropdown p-2.5 shadow-2xl z-50 animate-scale-up">
                  <div className="px-3 py-2 border-b border-border/60">
                    <p className="text-xs font-black text-foreground truncate">{user.fullName}</p>
                    <p className="text-[11px] text-amber-500 font-bold">{roleLabels[user.role] || user.role}</p>
                  </div>
                  <Link
                    href="/select-company"
                    onClick={() => {
                      setUserMenuOpen(false);
                      setSelectedCompany("ALL");
                      localStorage.removeItem("selectedCompany");
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors mt-1 cursor-pointer"
                  >
                    <Building2 className="h-4 w-4" />
                    <span>بوابة اختيار الشركات</span>
                  </Link>
                  {user.role === "GENERAL_MANAGER" && (
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-foreground hover:bg-muted rounded-xl transition-colors mt-1 cursor-pointer"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span>إعدادات النظام</span>
                    </Link>
                  )}
                  <Link
                    href="/dashboard/approvals"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-foreground hover:bg-muted rounded-xl transition-colors mt-1 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4 text-amber-500" />
                    <span>{user.role === "DEPUTY_MANAGER" ? "اعتماد الطباعة" : "طلبات الطباعة"}</span>
                  </Link>
                  <div className="my-1 border-t border-border/60" />
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Viewport for Page Contents - Enforces Frontend Route Guard */}
        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 pb-20 lg:pb-6 w-full max-w-full">
          {isRouteAllowed(user.role, pathname) ? (
            children
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 sm:p-8 text-center animate-fade-in">
              <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mb-6 shadow-xl shadow-amber-500/10">
                <ShieldAlert className="w-10 h-10 text-amber-500" />
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black mb-3">
                <span>غير مصرح بالوصول (403 Forbidden)</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground mb-2">
                عفواً، هذه الصفحة غير مصرح بالدخول إليها بحسابك الحالي
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm max-w-lg mb-6 leading-relaxed">
                {user.role === "EMPLOYEE"
                  ? "حسابك مخصص بصلاحية (موظف مسؤول). الصلاحيات المتاحة لك تشمل إدارة العمليات والمناقصات، الرادار الذكي، خطابات الضمان، المخازن والموردين، وطلب اعتمادات الطباعة. إعدادات النظام، الشركات، المستخلصات المالية وإدارة الصلاحيات مقتصرة على الإدارة العليا."
                  : user.role === "DEPUTY_MANAGER"
                  ? "حسابك مخصص بصلاحية (نائب المدير). دورك الأساسي والمباشر هو مراجعة واعتماد طلبات الطباعة الرسمية وتوليد الهاش التشفيري (32 خانة)، والاطلاع المشاهداتي على العمليات والتقارير والأرشيف دون التعديل الإداري."
                  : "ليس لديك الصلاحية اللازمة للوصول إلى هذا الرابط المباشر في المنظومة."}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 text-xs sm:text-sm cursor-pointer"
                >
                  العودة إلى لوحة التحكم
                </Button>

                {user.role === "DEPUTY_MANAGER" ? (
                  <Button
                    onClick={() => router.push("/dashboard/approvals")}
                    variant="outline"
                    className="border-border text-foreground font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer"
                  >
                    مركز طلبات واعتماد الطباعة
                  </Button>
                ) : (
                  <Button
                    onClick={() => router.push("/dashboard/operations")}
                    variant="outline"
                    className="border-border text-foreground font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer"
                  >
                    إدارة العمليات والمناقصات
                  </Button>
                )}
              </div>
            </div>
          )}
        </main>

        {/* 4. Mobile Bottom Navigation Bar (Very clean on mobile, hidden on desktop) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border px-2 py-1.5 flex items-center justify-around shadow-xl">
          {mobileBottomNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[55px]",
                  isActive ? "text-amber-500 font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4 mb-0.5", isActive ? "scale-110" : "")} />
                <span className="text-[11px] font-bold">{item.label}</span>
              </Link>
            );
          })}

          <button
            onClick={() => setMobileOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-muted-foreground hover:text-foreground transition-all min-w-[55px] cursor-pointer"
          >
            <Menu className="h-4 w-4 mb-0.5" />
            <span className="text-[11px] font-bold">المزيد</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
