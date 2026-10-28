"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Plus, Search, FileText, Filter, ArrowUpDown, LayoutGrid, List,
  Building2, Calendar, ChevronLeft, Shield, Clock, CheckCircle2,
  Sparkles, X, Eye, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { useCompany } from "@/context/company-context";
import { OperationLifecycleTimeline } from "@/components/operations/operation-timeline";
import { EGYPT_GOVERNORATES } from "@/lib/governorates";

interface OperationCompany {
  displayCode: string;
  company: { id: string; name: string; code: string };
}

interface Operation {
  id: string;
  serialNumber: number;
  externalNumber: string | null;
  name: string;
  authority: string;
  tenderType: string;
  governorate?: string | null;
  status: string;
  companies: OperationCompany[];
  createdAt: string;
}

const statusLabels: Record<string, { label: string; color: string; badgeBg: string }> = {
  DRAFT: { label: "مسودة", color: "text-muted-foreground", badgeBg: "bg-muted text-muted-foreground border-border" },
  BOOKLET_WITHDRAWN: { label: "تم سحب الكراسة", color: "text-blue-500", badgeBg: "badge-blue" },
  SUBMITTED: { label: "تم التقديم", color: "text-purple-500", badgeBg: "badge-purple" },
  TECHNICAL_OPENED: { label: "فتح فني", color: "text-purple-500", badgeBg: "badge-purple" },
  TECHNICAL_ACCEPTED: { label: "مقبول فنياً", color: "text-emerald-500", badgeBg: "badge-emerald" },
  TECHNICAL_REJECTED: { label: "مرفوض فنياً", color: "text-rose-500", badgeBg: "badge-rose" },
  GRIEVANCE_FILED: { label: "تظلم", color: "text-amber-500", badgeBg: "badge-amber" },
  FINANCIAL_OPENED: { label: "فتح مالي", color: "text-blue-500", badgeBg: "badge-blue" },
  FINANCIAL_REJECTED: { label: "مرفوض مالياً", color: "text-rose-500", badgeBg: "badge-rose" },
  AWARDED: { label: "ترسية وفوز", color: "text-amber-500", badgeBg: "badge-amber" },
  SUPPLY_IN_PROGRESS: { label: "جاري التوريد", color: "text-blue-500", badgeBg: "badge-blue" },
  COMPLETED: { label: "مكتمل", color: "text-emerald-500", badgeBg: "badge-emerald" },
  CLOSED: { label: "مغلقة", color: "text-muted-foreground", badgeBg: "bg-muted text-muted-foreground border-border" },
  CANCELLED: { label: "ملغاة", color: "text-rose-500", badgeBg: "badge-rose" },
  ARCHIVED: { label: "أرشيف", color: "text-muted-foreground", badgeBg: "bg-muted text-muted-foreground border-border" },
};

const tenderTypeLabels: Record<string, string> = {
  TENDER: "مناقصة عامة",
  LIMITED_TENDER: "مناقصة محدودة",
  PRACTICE: "ممارسة عامة",
  LIMITED_PRACTICE: "ممارسة محدودة",
  AUCTION: "مزايدة علنية",
  DIRECT_ORDER: "أمر إسناد مباشر",
};

export default function OperationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedCompany, setSelectedCompany, currentCompany } = useCompany();
  const companyQuery = searchParams.get("company");
  const activeCompanyFilter = companyQuery || (selectedCompany !== "ALL" ? selectedCompany : null);

  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [governorateFilter, setGovernorateFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [user, setUser] = useState<{ role: string; fullName: string } | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {}
    }
  }, []);

  const displayedOperations = useMemo(() => {
    if (!activeCompanyFilter) return operations;
    return operations.filter((op) =>
      op.companies?.some(
        (c) =>
          c.company?.code === activeCompanyFilter ||
          c.displayCode?.startsWith(activeCompanyFilter)
      )
    );
  }, [operations, activeCompanyFilter]);

  useEffect(() => {
    const fetchOperations = async () => {
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set("search", searchQuery);
        if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
        if (governorateFilter && governorateFilter !== "all") params.set("governorate", governorateFilter);

        const res = await api.get(`/operations?${params.toString()}`);
        setOperations(res.data);
        if (typeof window !== "undefined" && Array.isArray(res.data)) {
          for (const item of res.data) {
            try {
              sessionStorage.setItem(`cached_op_${item.id}`, JSON.stringify(item));
            } catch {}
          }
        }
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    };
    fetchOperations();
  }, [searchQuery, statusFilter, governorateFilter]);

  const filterTabs = [
    { id: "all", label: "الكل" },
    { id: "BOOKLET_WITHDRAWN", label: "تم سحب الكراسة" },
    { id: "TECHNICAL_ACCEPTED", label: "مقبول فنياً" },
    { id: "AWARDED", label: "ترسية" },
    { id: "SUPPLY_IN_PROGRESS", label: "جاري التوريد" },
    { id: "COMPLETED", label: "مكتمل" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Title & Stats summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {currentCompany ? `عمليات شركة ${currentCompany.name} (${currentCompany.code})` : "العمليات والمناقصات"}
            </h1>
            <Badge className="bg-blue-600/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs font-bold">
              {displayedOperations.length} عملية مسجلة
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            إدارة وتتبع دورة حياة المناقصات من سحب الكراسة وحتى الترسية والإغلاق التام
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View toggle (Grid / Table) */}
          <div className="hidden sm:flex items-center bg-muted/60 border border-border rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "grid" ? "bg-blue-600 text-white font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              title="عرض كبطاقات"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "table" ? "bg-blue-600 text-white font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              title="عرض كجدول"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {user?.role === "DEPUTY_MANAGER" ? (
            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs">
              <Eye className="h-4 w-4" />
              <span>وضع الاطلاع الرسمي (مشاهدة فقط)</span>
            </Badge>
          ) : (
            <Link href="/dashboard/operations/new">
              <Button className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 hover:from-blue-800 hover:to-blue-700 text-white font-bold px-4 py-2 rounded-xl shadow-lg shadow-blue-500/20 royal-glow flex items-center gap-2 text-xs sm:text-sm active:scale-95 transition-all">
                <Plus className="h-4 w-4" />
                <span>عملية جديدة</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card rounded-2xl p-3 sm:p-4 border border-border space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالكود (مثل A15)، اسم العملية، جهة الإسناد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 pl-9 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-sm h-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Governorate Dropdown */}
          <Select value={governorateFilter} onValueChange={(v) => setGovernorateFilter(v ?? "all")}>
            <SelectTrigger className="w-full sm:w-[190px] bg-muted/40 border-border text-foreground rounded-xl h-10 text-xs sm:text-sm">
              <MapPin className="h-4 w-4 ml-2 text-blue-600 dark:text-blue-400" />
              <SelectValue placeholder="تصفية بالمحافظة">
                {governorateFilter === "all" ? "كل المحافظات (27)" : governorateFilter}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground solid-dropdown max-h-[300px]">
              <SelectItem value="all">كل المحافظات (27)</SelectItem>
              {EGYPT_GOVERNORATES.map((gov) => (
                <SelectItem key={gov} value={gov}>
                  {gov}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Dropdown */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger className="w-full sm:w-[200px] bg-muted/40 border-border text-foreground rounded-xl h-10 text-xs sm:text-sm">
              <Filter className="h-4 w-4 ml-2 text-blue-600 dark:text-blue-400" />
              <SelectValue placeholder="تصفية حسب الحالة">
                {statusFilter === "all" ? "كل الحالات المسجلة" : statusLabels[statusFilter]?.label || "تصفية حسب الحالة"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground solid-dropdown">
              <SelectItem value="all">كل الحالات المسجلة</SelectItem>
              {Object.entries(statusLabels).map(([key, val]) => (
                <SelectItem key={key} value={key}>
                  {val.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quick Filter Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all duration-150 font-medium cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-blue-600 text-white font-bold shadow-xs"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Rendering: Loading / Empty / Data */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-5 border border-border animate-pulse space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-6 w-16 bg-muted rounded-lg" />
                <div className="h-5 w-24 bg-muted rounded-full" />
              </div>
              <div className="h-5 w-3/4 bg-muted rounded" />
              <div className="h-4 w-1/2 bg-muted rounded" />
              <div className="pt-3 border-t border-border flex justify-between">
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : displayedOperations.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-border space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto mb-2">
            <FileText className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground">لم يتم العثور على أي عمليات</h3>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-md mx-auto">
            لا توجد عمليات تطابق معايير البحث المحددة. يمكنك إضافة عملية جديدة أو إعادة تعيين عوامل التصفية.
          </p>
          <div className="pt-3 flex justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setGovernorateFilter("all");
              }}
              className="border-border text-foreground hover:bg-muted"
            >
              إعادة ضبط الفلاتر
            </Button>
            <Link href="/dashboard/operations/new">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm">
                <Plus className="h-4 w-4 ml-1.5" />
                إضافة عملية جديدة
              </Button>
            </Link>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID / CARDS VIEW (Ideal for mobile & modern desktop) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedOperations.map((op) => {
            const status = statusLabels[op.status] || {
              label: op.status,
              badgeBg: "badge-blue",
            };

            return (
              <Link key={op.id} href={`/dashboard/operations/${op.id}`}>
                <div className="glass-card-interactive rounded-2xl p-5 border border-border hover:border-blue-500/50 flex flex-col justify-between h-full group relative overflow-hidden transition-all duration-200 hover:shadow-lg">
                  <div className="space-y-3">
                    {/* Top Row: Code Badge + Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {op.companies.map((oc) => (
                          <span
                            key={oc.displayCode}
                            className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs flex items-center gap-1.5"
                          >
                            <Building2 className="h-3 w-3" />
                            <span>{oc.company?.name || `شركة ${oc.displayCode.charAt(0)}`}</span>
                            <span className="font-mono font-black">({oc.displayCode})</span>
                          </span>
                        ))}
                      </div>
                      <Badge className={`${status.badgeBg} border text-[11px] font-semibold`}>
                        {status.label}
                      </Badge>
                    </div>

                    {/* Operation Title */}
                    <h3 className="font-bold text-foreground text-base group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                      {op.name}
                    </h3>

                    {/* Authority & Governorate & External Number */}
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{op.authority}</span>
                        </div>
                        {op.governorate && (
                          <span className="shrink-0 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-[11px] font-bold flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            <span>{op.governorate}</span>
                          </span>
                        )}
                      </div>
                      {op.externalNumber && (
                        <div className="text-[11px] text-muted-foreground font-mono">
                          رقم الجهة: {op.externalNumber}
                        </div>
                      )}
                    </div>

                    {/* 🚀 Graphical Stage Progress Bar (Compact Lifecycle Stepper) */}
                    <div className="pt-2 pb-1 border-t border-border/60">
                      <OperationLifecycleTimeline
                        currentStatus={op.status}
                        variant="compact"
                        isInteractive={false}
                      />
                    </div>
                  </div>

                  {/* Bottom Footer: Type + Explicit 'عرض تفاصيل العملية' Button */}
                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2 mt-3 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground border border-border text-[11px] font-semibold">
                      {tenderTypeLabels[op.tenderType] || op.tenderType}
                    </span>

                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:text-white group-hover:bg-blue-600 bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/25 transition-all shadow-xs">
                      <span>عرض تفاصيل العملية</span>
                      <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW (Desktop Detailed View) */
        <div className="glass-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-muted/60 text-muted-foreground border-b border-border uppercase text-[11px] font-bold">
                <tr>
                  <th className="px-4 py-3">الكود</th>
                  <th className="px-4 py-3">اسم العملية والمناقصة</th>
                  <th className="px-4 py-3">جهة الإسناد</th>
                  <th className="px-4 py-3">النوع</th>
                  <th className="px-4 py-3">الشركات المشاركة</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3 text-left">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedOperations.map((op) => {
                  const status = statusLabels[op.status] || {
                    label: op.status,
                    badgeBg: "badge-blue",
                  };

                  return (
                    <tr
                      key={op.id}
                      className="hover:bg-muted/40 transition-colors group cursor-pointer"
                      onClick={() => (window.location.href = `/dashboard/operations/${op.id}`)}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-blue-700 dark:text-blue-300 whitespace-nowrap">
                        {op.companies.map((c) => c.displayCode).join(", ")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground group-hover:text-blue-600 transition-colors">
                          {op.name}
                        </div>
                        {op.externalNumber && (
                          <div className="text-[11px] text-muted-foreground font-mono">
                            رقم: {op.externalNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        <div className="font-medium text-foreground">{op.authority}</div>
                        {op.governorate && (
                          <div className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                            <MapPin className="h-3 w-3" />
                            <span>{op.governorate}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outline" className="border-border text-foreground text-xs">
                          {tenderTypeLabels[op.tenderType] || op.tenderType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {op.companies.map((c) => c.company.name).join(" • ")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge className={`${status.badgeBg} border text-xs`}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-left whitespace-nowrap">
                        <Link href={`/dashboard/operations/${op.id}`}>
                          <Button size="sm" className="h-8 bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white dark:text-blue-400 text-xs font-bold rounded-xl border border-blue-500/25 cursor-pointer">
                            <span>عرض تفاصيل العملية</span>
                            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
