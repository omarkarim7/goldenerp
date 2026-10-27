"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, X, Loader2, FileText, Building2,
  Radar, BarChart3, Settings, CheckCircle2, Truck,
  Sparkles, Clock, AlertCircle, ArrowLeft, ArrowUp,
  ArrowDown, CornerDownLeft, ShieldCheck, ChevronRight,
  Filter, Trash2, ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Portal } from "@/components/ui/portal";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface OperationSearchResult {
  id: string;
  name: string;
  authority: string;
  externalNumber?: string;
  tenderType?: string;
  status: string;
  budget?: number;
  companies?: Array<{
    displayCode: string;
    company?: {
      code: string;
      name: string;
    };
  }>;
}

interface QuickNavMatch {
  title: string;
  description: string;
  href: string;
  icon: any;
  badge: string;
  badgeClass: string;
  category: "operations" | "finance" | "system" | "radar";
}

const SYSTEM_PAGES: QuickNavMatch[] = [
  {
    title: "العمليات والمناقصات",
    description: "استعراض كافة العمليات والمناقصات الجارية والمكتملة",
    href: "/dashboard/operations",
    icon: FileText,
    badge: "العمليات",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    category: "operations",
  },
  {
    title: "إضافة عملية جديدة",
    description: "تسجيل مناقصة أو ممارسة أو أمر إسناد جديد",
    href: "/dashboard/operations/new",
    icon: Sparkles,
    badge: "إجراء سريع",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    category: "operations",
  },
  {
    title: "رادار المناقصات الحكومية",
    description: "محرك الذكاء الاصطناعي لفحص بوابة العمليات الحكومية",
    href: "/dashboard/radar",
    icon: Radar,
    badge: "ذكي AI",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    category: "radar",
  },
  {
    title: "المعاينات الميدانية",
    description: "جدول وفحوصات معاينات المواقع وسجلات الجاهزية",
    href: "/dashboard/visits",
    icon: Building2,
    badge: "معاينات",
    badgeClass: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20",
    category: "operations",
  },
  {
    title: "اعتمادات الطباعة والأمان",
    description: "سجل طلبات الاعتماد وتوليد الهاش التشفيري للمستندات",
    href: "/dashboard/approvals",
    icon: ShieldCheck,
    badge: "اعتمادات",
    badgeClass: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
    category: "system",
  },
  {
    title: "التقارير والمؤشرات المالية",
    description: "التقارير التحليلية والتدفقات النقدية والأرباح",
    href: "/dashboard/reports",
    icon: BarChart3,
    badge: "تقارير",
    badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
    category: "finance",
  },
  {
    title: "الموردين ومقاولي الباطن",
    description: "سجل الموردين المعتمدين والمشتريات والفواتير",
    href: "/dashboard/suppliers",
    icon: Truck,
    badge: "موردين",
    badgeClass: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
    category: "finance",
  },
  {
    title: "أرشيف وسجلات العمليات",
    description: "الأرشيف الرقمي المعتمد لملفات العمليات والمناقصات",
    href: "/dashboard/archive",
    icon: FileText,
    badge: "أرشيف",
    badgeClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
    category: "system",
  },
  {
    title: "إعدادات وقواعد النظام",
    description: "تخصيص أسماء الشركات الأربعة والضرائب وقواعد الرادار",
    href: "/dashboard/settings",
    icon: Settings,
    badge: "الإعدادات",
    badgeClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
    category: "system",
  },
];

const STATUS_LABELS: Record<string, { label: string; badgeClass: string }> = {
  DRAFT: { label: "مسودة أولية", badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300/60 dark:border-slate-700" },
  BOOKLET_WITHDRAWN: { label: "تم سحب الكراسة", badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  SUBMITTED: { label: "تم تقديم العطاء", badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
  TECHNICAL_OPENED: { label: "فتح فني", badgeClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" },
  TECHNICAL_ACCEPTED: { label: "مقبول فنياً 🟢", badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
  TECHNICAL_REJECTED: { label: "مرفوض فنياً 🔴", badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800" },
  GRIEVANCE_FILED: { label: "تظلم قيد النظر ⚖️", badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  FINANCIAL_OPENED: { label: "جلسة فتح مالي 💵", badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  AWARDED: { label: "تمت الترسية والفوز 🏆", badgeClass: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  SUPPLY_IN_PROGRESS: { label: "جاري التوريد 📦", badgeClass: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800" },
  COMPLETED: { label: "مكتملة ومستلمة ✅", badgeClass: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
  CLOSED: { label: "مغلقة رسمياً 🔒", badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300/60 dark:border-slate-700" },
  CANCELLED: { label: "ملغاة", badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800" },
  ARCHIVED: { label: "مؤرشفة 🗄️", badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300/60 dark:border-slate-700" },
};

const TENDER_TYPE_LABELS: Record<string, string> = {
  TENDER: "مناقصة عامة",
  LIMITED_TENDER: "مناقصة محدودة",
  PRACTICE: "ممارسة عامة",
  LIMITED_PRACTICE: "ممارسة محدودة",
  AUCTION: "مزايدة علنية",
  DIRECT_ORDER: "أمر إسناد مباشر",
};

type FilterCategory = "all" | "golden" | "excellent" | "united" | "forsan" | "pages";

const FILTER_CHIPS: Array<{ id: FilterCategory; label: string; prefix?: string; color: string }> = [
  { id: "all", label: "الكل", color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200" },
  { id: "golden", label: "جولدن (AM*)", prefix: "AM", color: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  { id: "excellent", label: "إكسلنت (BM*)", prefix: "BM", color: "bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800" },
  { id: "united", label: "المتحدة (CM*)", prefix: "CM", color: "bg-purple-50 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
  { id: "forsan", label: "الفرسان (DM*)", prefix: "DM", color: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
  { id: "pages", label: "صفحات وأقسام النظام", color: "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" },
];

export function SmartSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("all");
  const [loading, setLoading] = useState(false);
  const [operations, setOperations] = useState<OperationSearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Load recent searches on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("goldenerp_recent_searches");
      if (saved) {
        setRecentSearches(JSON.parse(saved).slice(0, 6));
      }
    } catch {}
  }, []);

  const saveRecentSearch = (term: string) => {
    const clean = term.trim();
    if (!clean || clean.length < 2) return;
    try {
      const next = [clean, ...recentSearches.filter((s) => s !== clean)].slice(0, 6);
      setRecentSearches(next);
      localStorage.setItem("goldenerp_recent_searches", JSON.stringify(next));
    } catch {}
  };

  const removeRecentSearch = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = recentSearches.filter((s) => s !== term);
    setRecentSearches(next);
    try {
      localStorage.setItem("goldenerp_recent_searches", JSON.stringify(next));
    } catch {}
  };

  const clearAllRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem("goldenerp_recent_searches");
    } catch {}
  };

  // Global Keyboard shortcut: Ctrl+K or Cmd+K or '/'
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      const isInput = ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "/" && !isInput) {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen]);

  // Focus input whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(-1);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  // Debounced search query
  useEffect(() => {
    if (!isOpen) return;

    let effectiveQuery = query.trim();
    const activeChip = FILTER_CHIPS.find((c) => c.id === activeCategory);
    if (activeChip?.prefix && !effectiveQuery.toUpperCase().includes(activeChip.prefix)) {
      effectiveQuery = `${activeChip.prefix} ${effectiveQuery}`.trim();
    }

    if (!effectiveQuery) {
      setOperations([]);
      setLoading(false);
      setSelectedIndex(-1);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/operations?search=${encodeURIComponent(effectiveQuery)}&limit=8`);
        if (Array.isArray(res.data)) {
          setOperations(res.data);
        } else {
          setOperations([]);
        }
      } catch {
        setOperations([]);
      } finally {
        setLoading(false);
        setSelectedIndex(0); // auto-highlight first result
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, activeCategory, isOpen]);

  // Matching system navigation pages
  const matchingPages = useMemo(() => {
    if (activeCategory !== "all" && activeCategory !== "pages") return [];
    if (!query.trim() && activeCategory !== "pages") return [];

    const q = query.trim().toLowerCase();
    if (!q) return SYSTEM_PAGES.slice(0, 6);

    return SYSTEM_PAGES.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.badge.toLowerCase().includes(q)
    ).slice(0, 4);
  }, [query, activeCategory]);

  // Combined flat items for keyboard arrow navigation
  const flatSelectableItems = useMemo(() => {
    const items: Array<{ type: "op" | "page"; data: any }> = [];
    operations.forEach((op) => items.push({ type: "op", data: op }));
    matchingPages.forEach((p) => items.push({ type: "page", data: p }));
    return items;
  }, [operations, matchingPages]);

  // Handle navigation to an operation
  const handleSelectOperation = (op: OperationSearchResult) => {
    saveRecentSearch(op.name || op.companies?.[0]?.displayCode || query);
    setIsOpen(false);
    router.push(`/dashboard/operations/${op.id}`);
  };

  // Handle navigation to a page
  const handleSelectPage = (href: string, title: string) => {
    saveRecentSearch(title);
    setIsOpen(false);
    router.push(href);
  };

  // Submit all searches to operations page
  const handleSubmitAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedIndex >= 0 && flatSelectableItems[selectedIndex]) {
      const item = flatSelectableItems[selectedIndex];
      if (item.type === "op") handleSelectOperation(item.data);
      else handleSelectPage(item.data.href, item.data.title);
      return;
    }

    if (query.trim()) {
      saveRecentSearch(query.trim());
      setIsOpen(false);
      router.push(`/dashboard/operations?search=${encodeURIComponent(query.trim())}`);
    }
  };

  // Keyboard navigation inside modal
  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = prev + 1 >= flatSelectableItems.length ? 0 : prev + 1;
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = prev - 1 < 0 ? flatSelectableItems.length - 1 : prev - 1;
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSubmitAll();
    }
  };

  // Helper: get company badge color from display code
  const getCompanyCodeBadge = (code?: string) => {
    const clean = (code || "AM").trim().toUpperCase();
    if (clean.startsWith("A")) {
      return {
        bg: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
        name: "جولدن",
      };
    }
    if (clean.startsWith("B")) {
      return {
        bg: "bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30",
        name: "إكسلنت",
      };
    }
    if (clean.startsWith("C")) {
      return {
        bg: "bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30",
        name: "المتحدة",
      };
    }
    return {
      bg: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
      name: "الفرسان",
    };
  };

  return (
    <>
      {/* ━━━ TRIGGER BUTTON IN NAVBAR (Sleek World-Class Bar) ━━━ */}
      <div className="relative flex-1 min-w-0 max-w-xs xl:max-w-md 2xl:max-w-lg">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 border border-white/25 text-white/95 text-xs font-bold transition-all shadow-2xs group cursor-pointer"
          title="اضغط للبحث السريع في العمليات والمناقصات (Ctrl + K)"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Search className="h-4 w-4 text-white/90 group-hover:text-amber-300 group-hover:scale-110 transition-all shrink-0" />
            <span className="truncate text-white/90 font-medium group-hover:text-white">
              بحث ذكي في العمليات (AM01، جهة الإسناد)...
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-black/20 text-white/90 border border-white/20 font-mono text-[10px] font-bold shadow-2xs select-none">
              <span>Ctrl</span>
              <span>+</span>
              <span>K</span>
            </kbd>
          </div>
        </button>
      </div>

      {/* ━━━ FLOATING COMMAND PALETTE / SPOTLIGHT SEARCH MODAL ━━━ */}
      {isOpen && (
        <Portal>
          <div
            className="fixed inset-0 z-[999999] bg-slate-950/50 dark:bg-black/75 backdrop-blur-md flex items-start justify-center p-3 sm:p-6 sm:pt-16 md:pt-20 overflow-y-auto animate-fade-in"
            onClick={() => setIsOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleModalKeyDown}
              className="relative w-full max-w-2xl lg:max-w-3xl bg-white dark:bg-[#0f172a] border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl shadow-slate-900/20 dark:shadow-black/70 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150 text-right"
              dir="rtl"
            >
              {/* ━━━ TOP SEARCH INPUT SECTION ━━━ */}
              <div className="p-3.5 sm:p-4 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 space-y-3 shrink-0">
                <div className="relative flex items-center">
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Search className="h-5 w-5 stroke-[2.5]" />
                    )}
                  </div>

                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="ابحث بكود العملية (AM01)، اسم المناقصة، جهة الإسناد، أو القسم..."
                    className="w-full pr-12 pl-20 py-2.5 sm:py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700/80 focus:border-blue-600 dark:focus:border-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm sm:text-base font-bold rounded-2xl outline-none transition-all shadow-inner"
                  />

                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {query && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuery("");
                          inputRef.current?.focus();
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        title="مسح النص"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-2 py-1 rounded-lg bg-slate-200/70 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer select-none"
                      title="إغلاق النافذة (Escape)"
                    >
                      ESC
                    </button>
                  </div>
                </div>

                {/* ━━━ QUICK FILTER CHIPS (تصنيفات الفحص السريع) ━━━ */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
                  <div className="flex items-center gap-1 text-[11px] font-black text-slate-500 dark:text-slate-400 shrink-0 ml-1">
                    <Filter className="h-3 w-3" />
                    <span>تصفية:</span>
                  </div>

                  {FILTER_CHIPS.map((chip) => {
                    const isSelected = activeCategory === chip.id;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => {
                          setActiveCategory(chip.id);
                          inputRef.current?.focus();
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-xl font-bold text-[11.5px] transition-all cursor-pointer shrink-0 border",
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20 scale-105"
                            : cn(
                                "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/70 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                              )
                        )}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ━━━ RESULTS & CONTENT BODY ━━━ */}
              <div
                ref={resultsContainerRef}
                className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 divide-y divide-slate-100 dark:divide-slate-800/80"
              >
                {/* 1. OPERATIONS SEARCH RESULTS */}
                {operations.length > 0 && (
                  <div className="space-y-2 pt-1 first:pt-0">
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span>العمليات والمناقصات المطابقة ({operations.length})</span>
                      </span>
                      <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hidden sm:inline">
                        انقر أو اضغط Enter للفتح المباشر ↵
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {operations.map((op, idx) => {
                        const isHighlighted = selectedIndex === idx;
                        const primaryCompany = op.companies?.[0];
                        const displayCode = primaryCompany?.displayCode || op.externalNumber || `AZ0${op.id.slice(0, 2)}`;
                        const companyMeta = getCompanyCodeBadge(displayCode);
                        const statusMeta = STATUS_LABELS[op.status] || {
                          label: op.status,
                          badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
                        };
                        const tenderMethodText = op.tenderType ? TENDER_TYPE_LABELS[op.tenderType] : null;

                        return (
                          <div
                            key={op.id}
                            onClick={() => handleSelectOperation(op)}
                            className={cn(
                              "group p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-right select-none",
                              isHighlighted
                                ? "bg-blue-50/90 dark:bg-blue-950/40 border-blue-500 shadow-sm scale-[1.01]"
                                : "bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {/* Company Code Box */}
                              <div
                                className={cn(
                                  "w-12 h-12 rounded-2xl border flex flex-col items-center justify-center font-mono font-black shrink-0 shadow-2xs group-hover:scale-105 transition-transform",
                                  companyMeta.bg
                                )}
                              >
                                <span className="text-xs leading-none">{displayCode}</span>
                                <span className="text-[9px] font-sans font-bold opacity-80 mt-0.5">
                                  {companyMeta.name}
                                </span>
                              </div>

                              {/* Title, Authority & Metadata */}
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                                    {op.name}
                                  </h4>
                                </div>

                                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
                                  <span className="flex items-center gap-1 font-medium truncate max-w-[240px]">
                                    <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{op.authority || "جهة غير محددة"}</span>
                                  </span>

                                  {tenderMethodText && (
                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10.5px] font-bold border border-slate-200/80 dark:border-slate-700">
                                      {tenderMethodText}
                                    </span>
                                  )}

                                  {op.budget ? (
                                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px]">
                                      {Number(op.budget).toLocaleString("ar-EG")} ج.م
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            {/* Status and Action Arrow */}
                            <div className="flex items-center gap-2.5 shrink-0">
                              <span
                                className={cn(
                                  "text-[10.5px] px-2.5 py-1 rounded-xl font-bold border shrink-0 hidden sm:inline-block shadow-2xs",
                                  statusMeta.badgeClass
                                )}
                              >
                                {statusMeta.label}
                              </span>

                              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700/60 group-hover:bg-blue-600 group-hover:text-white text-slate-500 dark:text-slate-400 flex items-center justify-center transition-all shrink-0">
                                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. MATCHING SYSTEM PAGES */}
                {matchingPages.length > 0 && (
                  <div className="space-y-2 pt-3 first:pt-0">
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>أقسام وصفحات المنظومة السريعة</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {matchingPages.map((page, pIdx) => {
                        const actualIdx = operations.length + pIdx;
                        const isHighlighted = selectedIndex === actualIdx;
                        const Icon = page.icon;

                        return (
                          <div
                            key={page.href}
                            onClick={() => handleSelectPage(page.href, page.title)}
                            className={cn(
                              "group p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 text-right select-none",
                              isHighlighted
                                ? "bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-500 shadow-sm"
                                : "bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                <Icon className="h-4.5 w-4.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-black text-xs sm:text-[13px] text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                                  {page.title}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {page.description}
                                </p>
                              </div>
                            </div>

                            <span
                              className={cn(
                                "text-[10px] px-2 py-0.5 rounded-lg font-bold border shrink-0",
                                page.badgeClass
                              )}
                            >
                              {page.badge}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. EMPTY SEARCH OR INITIAL STATE */}
                {!query.trim() && (
                  <div className="space-y-4 pt-1">
                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs px-1">
                          <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span>عمليات تم البحث عنها مؤخراً:</span>
                          </span>
                          <button
                            type="button"
                            onClick={clearAllRecent}
                            className="text-[11px] font-bold text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>مسح السجل</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {recentSearches.map((term, i) => (
                            <div
                              key={i}
                              onClick={() => {
                                setQuery(term);
                                inputRef.current?.focus();
                              }}
                              className="group px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer flex items-center gap-2"
                            >
                              <Search className="h-3 w-3 text-slate-400 group-hover:text-blue-500" />
                              <span>{term}</span>
                              <button
                                type="button"
                                onClick={(e) => removeRecentSearch(term, e)}
                                className="text-slate-400 hover:text-rose-500 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                title="إزالة من السجل"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Jump Shortcuts */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-400 px-1">
                        اختصارات وأكواد مقترحة:
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setQuery("AM");
                            inputRef.current?.focus();
                          }}
                          className="p-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-right transition-all cursor-pointer group"
                        >
                          <span className="block font-mono font-black text-amber-700 dark:text-amber-400 text-xs">
                            AM*
                          </span>
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            شركة جولدن
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setQuery("BM");
                            inputRef.current?.focus();
                          }}
                          className="p-2.5 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 text-right transition-all cursor-pointer group"
                        >
                          <span className="block font-mono font-black text-sky-700 dark:text-sky-400 text-xs">
                            BM*
                          </span>
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            شركة إكسلنت
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setQuery("CM");
                            inputRef.current?.focus();
                          }}
                          className="p-2.5 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-right transition-all cursor-pointer group"
                        >
                          <span className="block font-mono font-black text-purple-700 dark:text-purple-400 text-xs">
                            CM*
                          </span>
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            شركة المتحدة
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setQuery("رادار");
                            inputRef.current?.focus();
                          }}
                          className="p-2.5 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 text-right transition-all cursor-pointer group"
                        >
                          <span className="block font-black text-blue-700 dark:text-blue-400 text-xs">
                            الرادار
                          </span>
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            بوابة العمليات
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Common System Pages Grid */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-400 px-1">
                        صفحات الوصول السريع:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {SYSTEM_PAGES.slice(0, 6).map((page) => {
                          const Icon = page.icon;
                          return (
                            <div
                              key={page.href}
                              onClick={() => handleSelectPage(page.href, page.title)}
                              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 transition-all cursor-pointer flex items-center gap-2 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                                {page.title}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. NO RESULTS FOUND STATE */}
                {query.trim() && !loading && operations.length === 0 && matchingPages.length === 0 && (
                  <div className="p-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-3xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 mx-auto flex items-center justify-center shadow-inner">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">
                        لا توجد نتائج مطابقة لـ &quot;{query}&quot;
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                        تأكد من كود العملية (مثال: AM01، BM04) أو ابحث باسم جهة الإسناد أو المناقصة، أو اضغط أدناه للانتقال للبحث العام.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSubmitAll()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer transition-all"
                    >
                      <span>الانتقال لجدول العمليات وتطبيق البحث</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* ━━━ MODAL FOOTER BAR ━━━ */}
              <div className="p-3 sm:px-4 bg-slate-50/95 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs shrink-0">
                {/* Keyboard Shortcuts Hints */}
                <div className="hidden sm:flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px] shadow-2xs font-bold">
                      ↑
                    </kbd>
                    <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px] shadow-2xs font-bold">
                      ↓
                    </kbd>
                    <span>للتنقل</span>
                  </span>

                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px] shadow-2xs font-bold">
                      Enter ↵
                    </kbd>
                    <span>للاختيار</span>
                  </span>

                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px] shadow-2xs font-bold">
                      ESC
                    </kbd>
                    <span>للإغلاق</span>
                  </span>
                </div>

                {/* Show All Results Button */}
                {query.trim() && (
                  <button
                    type="button"
                    onClick={() => handleSubmitAll()}
                    className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    <span>عرض كافة النتائج في صفحة العمليات</span>
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
