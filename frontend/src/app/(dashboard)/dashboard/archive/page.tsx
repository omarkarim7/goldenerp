"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Archive, Search, Filter, RotateCcw, FileText, Building2,
  Calendar, CheckCircle2, ChevronLeft, ShieldCheck, Eye, Download,
  ExternalLink, FolderArchive, RefreshCw, X, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";
import { useCompany } from "@/context/company-context";
import { Portal } from "@/components/ui/portal";

interface OperationDoc {
  id: string;
  fileName: string;
  filePath: string;
  fileType?: string;
  fileSize?: number;
  type?: string;
  createdAt?: string;
}

interface OperationItem {
  id: string;
  code?: string;
  name: string;
  authority: string;
  status: string;
  isArchived: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  companies?: Array<{
    isMain: boolean;
    company: {
      id: string;
      code: string;
      name: string;
    };
  }>;
  documents?: OperationDoc[];
  _count?: {
    documents: number;
    guarantees: number;
    submissions: number;
  };
}

export default function ArchivePage() {
  const { currentCompany, selectedCompany, companies } = useCompany();
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [operations, setOperations] = useState<OperationItem[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // مستندات العملية المحددة للتصفح والمعاينة
  const [inspectingOp, setInspectingOp] = useState<OperationItem | null>(null);
  const [inspectingDocs, setInspectingDocs] = useState<OperationDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const fetchArchivedOperations = async () => {
    setLoading(true);
    try {
      // جلب العمليات من السيرفر
      const res = await api.get("/operations", {
        params: { limit: 150 },
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setOperations(data);
    } catch (err: any) {
      console.error("Error fetching operations for archive:", err);
      toast.error("تعذر تحميل سجل العمليات المؤرشفة من الخادم");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedOperations();
  }, []);

  // تصفية العمليات المنتهية أو المغلقة التابعة للشركة النشطة فقط
  const filteredOperations = useMemo(() => {
    return operations.filter((op) => {
      // 1. يجب أن تكون العملية مغلقة أو مكتملة أو مؤرشفة
      const isClosed =
        op.status === "CLOSED" ||
        op.status === "COMPLETED" ||
        Boolean(op.isArchived);

      if (!isClosed) return false;

      // 2. الفلترة الصارمة بالشركة النشطة المحددة (جولدن A، إكسلنت B، العهد C، الحديثة D)
      if (selectedCompany && selectedCompany !== "ALL") {
        const opCode = (op.code || "").toUpperCase();
        const mainComp = op.companies?.find((c) => c.isMain) || op.companies?.[0];
        const compCode = (mainComp?.company?.code || "").toUpperCase();

        const belongsToSelected =
          opCode.startsWith(selectedCompany) ||
          compCode === selectedCompany;

        if (!belongsToSelected) return false;
      }

      // 3. فلتر البحث النصي (الاسم، الكود، جهة الإسناد)
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = op.name.toLowerCase().includes(q);
        const matchAuth = (op.authority || "").toLowerCase().includes(q);
        const matchCode = (op.code || "").toLowerCase().includes(q);
        if (!matchName && !matchAuth && !matchCode) return false;
      }

      // 4. فلتر السنة المالية / تاريخ الإغلاق
      if (selectedYear !== "ALL") {
        const year = new Date(op.updatedAt || op.createdAt).getFullYear().toString();
        if (year !== selectedYear) return false;
      }

      return true;
    });
  }, [operations, selectedCompany, search, selectedYear]);

  // استرجاع العملية إلى قائمة العمليات النشطة الجارية
  const handleRestore = async (op: OperationItem) => {
    if (!confirm(`هل أنت متأكد من رغبتك في استرجاع العملية "${op.name}" إلى قائمة العمليات النشطة؟`)) {
      return;
    }
    setRestoringId(op.id);
    try {
      await api.patch(`/operations/${op.id}/status`, { status: "IN_PROGRESS" });
      toast.success(`تم استرجاع العملية (${op.code || op.name}) بنجاح إلى العمليات الجارية! ↺`);
      setOperations((prev) =>
        prev.map((item) => (item.id === op.id ? { ...item, status: "IN_PROGRESS" } : item))
      );
    } catch {
      toast.error("فشل استرجاع العملية");
    } finally {
      setRestoringId(null);
    }
  };

  // فتح درج / نافذة تصفح مستندات الأرشيف الفعلي للعملية
  const handleOpenDocsArchive = async (op: OperationItem) => {
    setInspectingOp(op);
    setLoadingDocs(true);
    try {
      const res = await api.get(`/operations/${op.id}`);
      const fullOp = res.data;
      // استبعاد الملفات الوهمية التي لا وجود لها
      const cleanDocs = (fullOp.documents || []).filter((d: any) => {
        if (
          d.filePath &&
          typeof d.filePath === "string" &&
          d.filePath.includes("/uploads/supply-orders/") &&
          (!d.fileSize || d.fileSize <= 0)
        ) {
          return false;
        }
        return true;
      });
      setInspectingDocs(cleanDocs);
    } catch {
      toast.error("تعذر جلب قائمة المستندات لهذه العملية");
    } finally {
      setLoadingDocs(false);
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              الأرشيف العام وسجل العمليات المغلقة
            </h1>
            {selectedCompany !== "ALL" && currentCompany && (
              <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs font-black">
                {currentCompany.name} ({selectedCompany})
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            سجل العمليات المنتهية والمسترد تأميناتها وسوابق الأعمال التاريخية الموثقة بملفاتها ومستنداتها الفعلية
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchArchivedOperations}
            disabled={loading}
            className="border-border text-xs h-9 rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span>تحديث السجل</span>
          </Button>
          <Badge variant="outline" className="border-border text-foreground text-xs px-3 py-1.5 h-9 font-bold font-mono">
            {filteredOperations.length} عملية مؤرشفة
          </Badge>
        </div>
      </div>

      {/* Legal Retention Compliance Banner (الحد الأدنى لحفظ السجلات 5 سنوات) */}
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 p-3.5 px-4 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-blue-800 dark:text-blue-300">
          <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold">
            ⚖️ <b>الالتزام بالأرشفة القانونية:</b> تحفظ ملفات ومستندات كافة العمليات المنتهية والمغلقة لمدة إلزامية قدرها <b>5 سنوات</b> وفقاً لقواعد الحفظ المقررة بالمادة (78) من قانون التعاقدات الحكومية رقم 182 لسنة 2018.
          </span>
        </div>
        <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] shrink-0 font-bold hidden sm:inline-flex">
          محصن أمنياً 🛡️
        </Badge>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card rounded-2xl p-4 border border-border flex flex-col sm:flex-row gap-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              selectedCompany !== "ALL"
                ? `بحث في أرشيف شركة ${currentCompany?.name || selectedCompany}...`
                : "بحث بالكود، اسم العملية، جهة الإسناد..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10 bg-muted/30 border-border text-foreground placeholder:text-muted-foreground focus:border-amber-500 rounded-xl text-sm h-10"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "2026", "2025", "2024"].map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap text-xs ${
                selectedYear === y
                  ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              {y === "ALL" ? "كل الأعوام" : y}
            </button>
          ))}
        </div>
      </div>

      {/* Operations List */}
      {loading ? (
        <div className="glass-card rounded-2xl p-16 text-center border border-border space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-sm font-bold text-foreground">جاري فحص وتحميل سجل العمليات المؤرشفة...</p>
        </div>
      ) : filteredOperations.length === 0 ? (
        <div className="glass-card rounded-2xl p-14 text-center border border-border space-y-3.5">
          <div className="w-14 h-14 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
            <Archive className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-foreground">
              لا توجد عمليات مغلقة أو مؤرشفة {selectedCompany !== "ALL" ? `لشركة ${currentCompany?.name || selectedCompany}` : ""} حالياً
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              عند إتمام الدورة التعاقدية الكاملة للعملية واسترداد التأمين النهائي وإغلاقها من تبويب الإغلاق والأرشيف، ستظهر العملية بملفاتها ومستنداتها الرسمية هنا تلقائياً.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredOperations.map((item) => {
            const mainComp = item.companies?.find((c) => c.isMain) || item.companies?.[0];
            const compName = mainComp?.company?.name || "المجموعة الذهبية (أ)";
            const compCode = mainComp?.company?.code || item.code?.[0] || "A";
            const closeDate = new Date(item.updatedAt || item.createdAt).toLocaleDateString("ar-EG", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            const docsCount = item._count?.documents || item.documents?.length || 0;

            return (
              <div
                key={item.id}
                className="glass-card-interactive rounded-2xl p-5 border border-border hover:border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group transition-all"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <span className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/15 to-blue-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                    {item.code || `#${item.id.slice(-4)}`}
                  </span>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/dashboard/operations/${item.id}`}
                        className="font-black text-foreground text-base hover:text-amber-600 dark:hover:text-amber-400 transition-colors truncate block"
                      >
                        {item.name}
                      </Link>
                      <Badge className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                        مغلقة ومؤرشفة بنجاح ✓
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {item.authority || "جهة إسناد حكومية"}
                      </span>
                      <span>الشركة المنفذة: <strong className="text-foreground">{compName} ({compCode})</strong></span>
                      <span>تاريخ الإغلاق: {closeDate}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-0.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenDocsArchive(item)}
                        className="h-7 px-2.5 rounded-lg text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-500/10 flex items-center gap-1.5 cursor-pointer"
                      >
                        <FolderArchive className="h-3.5 w-3.5" />
                        <span>تصفح مستندات الأرشيف الفعلي ({docsCount} ملف)</span>
                      </Button>
                      <Link
                        href={`/dashboard/operations/${item.id}`}
                        className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 underline"
                      >
                        <span>فتح سجل العملية</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-border shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={restoringId === item.id}
                    onClick={() => handleRestore(item)}
                    className="h-9 px-3.5 text-xs border-border text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-xl flex items-center gap-1.5 cursor-pointer font-bold transition-all"
                  >
                    {restoringId === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    <span>استرجاع للعمليات النشطة</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* نافذة / مودال تصفح ملفات الأرشيف الفعلي للعملية */}
      {inspectingOp && (
        <Portal>
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
            <div className="bg-card border border-border rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-up my-auto max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center shrink-0">
                    <FolderArchive className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-foreground">
                      أرشيف مستندات العملية: {inspectingOp.code}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{inspectingOp.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectingOp(null)}
                  className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Documents List */}
              <div className="overflow-y-auto max-h-[60vh] space-y-2 pr-1">
                {loadingDocs ? (
                  <div className="py-12 text-center text-muted-foreground space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                    <p className="text-xs">جاري تحميل وثائق ومستندات الأرشيف...</p>
                  </div>
                ) : inspectingDocs.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground space-y-2">
                    <Archive className="h-8 w-8 mx-auto opacity-50" />
                    <p className="text-xs font-bold">لا توجد ملفات مرفوعة حالياً في أرشيف هذه العملية</p>
                  </div>
                ) : (
                  inspectingDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 rounded-xl bg-muted/30 border border-border flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-red-500/15 text-red-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                          PDF
                        </div>
                        <div className="truncate">
                          <span className="font-bold text-foreground truncate block font-mono">
                            {doc.fileName}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : "مستند موثق"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link
                          href={`/dashboard/operations/${inspectingOp.id}?tab=archive`}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          <span>معاينة في العملية</span>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-border flex justify-between items-center text-xs">
                <Link
                  href={`/dashboard/operations/${inspectingOp.id}`}
                  className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span>الانتقال للعملية بالكامل</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setInspectingOp(null)}
                  className="rounded-xl text-xs h-8"
                >
                  إغلاق
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
