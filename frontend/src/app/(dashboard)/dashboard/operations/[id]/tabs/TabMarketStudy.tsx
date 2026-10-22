"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  FolderOpen, FileCheck, Image as ImageIcon, FileText, Upload,
  Plus, ChevronLeft, LayoutGrid, LayoutList, Eye, Download,
  Edit, Trash2, X, AlertTriangle, Loader2, Sparkles, FileSpreadsheet,
  Coins, Check, Printer, Save, RefreshCw, Calculator, ArrowRight, BookOpen,
  Maximize2, Minimize2, Copy, Search, Building2, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Portal } from "@/components/ui/portal";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  Operation, SectionCard, formatCurrency, formatDate,
  formatDocFileSize, tafqeetArabic
} from "./types";
import { StepFooterNav } from "./StepFooterNav";

export interface SupplierQuoteItem {
  id: string;
  itemCode?: string;
  itemName: string;
  unit: string;
  quantity: number;
  supplierName: string;
  unitPrice: number;
  totalPrice: number;
  leadTime?: string;
  specsMatch?: string; // "مطابق تماماً" | "بديل معتمد" | "قيد المراجعة"
  notes?: string;
}

function getDocCategoryBadge(doc: any) {
  const ft = (doc.fileType || "").toLowerCase();
  const fn = (doc.fileName || "").toLowerCase();
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ft) || fn.match(/\.(png|jpe?g|webp|gif)$/i)) {
    return { type: "image", label: "صورة / عينة", badgeBg: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30", color: "purple" };
  }
  if (["docx", "doc"].includes(ft) || fn.match(/\.(docx|doc)$/i)) {
    return { type: "word", label: "مستند Word", badgeBg: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30", color: "blue" };
  }
  if (["xlsx", "xls", "csv"].includes(ft) || fn.match(/\.(xlsx|xls|csv)$/i)) {
    return { type: "excel", label: "جدول Excel", badgeBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", color: "emerald" };
  }
  return { type: "pdf", label: "ملف PDF", badgeBg: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30", color: "rose" };
}

export function TabMarketStudy({
  op,
  onRefresh,
  onNavigate,
  onPreviewDoc,
  onDownloadDoc,
}: {
  op: Operation;
  onRefresh: () => void;
  onNavigate: (tabId: string) => void;
  onPreviewDoc?: (doc: any) => void;
  onDownloadDoc?: (doc: any) => void;
}) {
  // Active view: files archive or supplier quotes table
  const [subView, setSubView] = useState<"quotes_table" | "documents_archive">("quotes_table");

  // Documents from DB
  const marketDocs = useMemo(() => {
    return (op.documents || []).filter((d: any) => d.type === "MARKET_STUDY");
  }, [op.documents]);

  // ━━━ INTERACTIVE SUPPLIER QUOTES TABLE STATE (مربوط بقاعدة البيانات والباك إند) ━━━
  const storageKey = `goldenerp_market_quotes_${op.id}`;
  const [quoteItems, setQuoteItems] = useState<SupplierQuoteItem[]>(() => {
    // 1. القراءة الأولى: من قاعدة البيانات (notes) إن وجدت
    if (op.notes) {
      try {
        const parsed = JSON.parse(op.notes);
        if (parsed?.marketQuotes && Array.isArray(parsed.marketQuotes) && parsed.marketQuotes.length > 0) {
          return parsed.marketQuotes;
        }
      } catch {}
    }
    // 2. القراءة الثانية: من التخزين المحلي للمتصفح
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    // Default initial mock rows if empty
    return [
      {
        id: "1",
        itemCode: "01",
        itemName: "توريد مواسير بولي إيثيلين قطر 110 مم ضغط 10 بار",
        unit: "متر طولي",
        quantity: 500,
        supplierName: "شركة الأهرام للبلاستيك والنظم",
        unitPrice: 285,
        totalPrice: 142500,
        leadTime: "خلال 7 أيام",
        specsMatch: "مطابق تماماً",
        notes: "شامل النقل حتى موقع العملية",
      },
      {
        id: "2",
        itemCode: "02",
        itemName: "محبس هواء كروي تفريغ مزدوج 2 بوصة معتمد",
        unit: "عدد",
        quantity: 12,
        supplierName: "المصرية لصمامات المياه والمهمات",
        unitPrice: 4200,
        totalPrice: 50400,
        leadTime: "تسليم فوري من المخزن",
        specsMatch: "معتمد من الجهة",
        notes: "شهادة اختبار وضمان سنتين",
      },
    ];
  });

  const [savingQuotes, setSavingQuotes] = useState(false);

  // ━━━ ADMIN TOOLS STATE (المعاينة بالعين، التعديل الموسع، وضع ملء الشاشة والبحث) ━━━
  const [viewingQuoteItem, setViewingQuoteItem] = useState<SupplierQuoteItem | null>(null);
  const [editingQuoteItem, setEditingQuoteItem] = useState<SupplierQuoteItem | null>(null);
  const [isTableExpanded, setIsTableExpanded] = useState<boolean>(false);
  const [quoteSearchQuery, setQuoteSearchQuery] = useState<string>("");
  const [quoteSpecsFilter, setQuoteSpecsFilter] = useState<string>("ALL");

  // Auto-save quotes to localStorage for offline access
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(quoteItems));
    } catch {
      // ignore
    }
  }, [quoteItems, storageKey]);

  // Handle Escape key to close modals or fullscreen expanded table
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (viewingQuoteItem) setViewingQuoteItem(null);
        else if (editingQuoteItem) setEditingQuoteItem(null);
        else if (isTableExpanded) setIsTableExpanded(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTableExpanded, viewingQuoteItem, editingQuoteItem]);

  // Calculations for quotes table
  const quotesStats = useMemo(() => {
    const totalCost = quoteItems.reduce((acc, it) => acc + (Number(it.totalPrice) || 0), 0);
    const uniqueSuppliers = Array.from(new Set(quoteItems.map((it) => it.supplierName).filter(Boolean)));
    return {
      totalCost,
      itemsCount: quoteItems.length,
      suppliersCount: uniqueSuppliers.length,
      tafqeet: tafqeetArabic(totalCost),
    };
  }, [quoteItems]);

  // Filtered quotes based on search and spec match
  const filteredQuoteItems = useMemo(() => {
    return quoteItems.filter((item) => {
      const q = quoteSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.itemName || "").toLowerCase().includes(q) ||
        (item.supplierName || "").toLowerCase().includes(q) ||
        (item.notes || "").toLowerCase().includes(q) ||
        (item.itemCode || "").toLowerCase().includes(q);

      const matchesSpecs =
        quoteSpecsFilter === "ALL" ||
        item.specsMatch === quoteSpecsFilter;

      return matchesSearch && matchesSpecs;
    });
  }, [quoteItems, quoteSearchQuery, quoteSpecsFilter]);

  const handleAddQuoteItem = () => {
    const newItem: SupplierQuoteItem = {
      id: Date.now().toString(),
      itemCode: String(quoteItems.length + 1).padStart(2, "0"),
      itemName: "",
      unit: "قطعة",
      quantity: 1,
      supplierName: "",
      unitPrice: 0,
      totalPrice: 0,
      leadTime: "فور التعاقد",
      specsMatch: "مطابق تماماً",
      notes: "",
    };
    setQuoteItems([...quoteItems, newItem]);
  };

  const handleDuplicateQuoteItem = (item: SupplierQuoteItem) => {
    const newItem: SupplierQuoteItem = {
      ...item,
      id: Date.now().toString(),
      itemCode: `${item.itemCode || ""}-مقارنة`,
      supplierName: "", // تفريغ اسم المورد لمقارنة مورد جديد لنفس المواصفة فوراً
    };
    setQuoteItems([...quoteItems, newItem]);
    toast.success(`تم نسخ البند "${item.itemName.slice(0, 25)}..." لمقارنة مورد بديل 📋`);
  };

  const handleUpdateQuoteItem = (id: string, field: keyof SupplierQuoteItem, value: any) => {
    setQuoteItems(
      quoteItems.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: value };
        if (field === "quantity" || field === "unitPrice") {
          const q = field === "quantity" ? Number(value) || 0 : it.quantity;
          const p = field === "unitPrice" ? Number(value) || 0 : it.unitPrice;
          updated.totalPrice = Math.round(q * p * 100) / 100;
        }
        return updated;
      })
    );
  };

  const handleRemoveQuoteItem = (id: string) => {
    setQuoteItems(quoteItems.filter((it) => it.id !== id));
  };

  // ━━━ حفظ عروض أسعار الموردين في الباك إند وقاعدة البيانات السحابية ━━━
  const handleSaveQuotes = async () => {
    setSavingQuotes(true);
    try {
      localStorage.setItem(storageKey, JSON.stringify(quoteItems));

      let existingNotesObj: Record<string, any> = {};
      try {
        if (op.notes && op.notes.startsWith("{")) {
          existingNotesObj = JSON.parse(op.notes);
        } else if (op.notes) {
          existingNotesObj = { textNotes: op.notes };
        }
      } catch {}
      existingNotesObj.marketQuotes = quoteItems;

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(existingNotesObj),
      });

      toast.success("تم حفظ عروض أسعار الموردين بقاعدة البيانات والباك إند بنجاح! 💾☁️");
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل الحفظ في قاعدة البيانات");
    } finally {
      setSavingQuotes(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ["م", "اسم البند والمواصفة", "الوحدة", "الكمية", "اسم المورد", "سعر الوحدة", "إجمالي السعر", "مدة التوريد", "مطابقة المواصفة", "ملاحظات"];
    const rows = quoteItems.map((it, idx) => [
      idx + 1,
      `"${it.itemName.replace(/"/g, '""')}"`,
      `"${it.unit}"`,
      it.quantity,
      `"${it.supplierName.replace(/"/g, '""')}"`,
      it.unitPrice,
      it.totalPrice,
      `"${it.leadTime || ""}"`,
      `"${it.specsMatch || ""}"`,
      `"${(it.notes || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `دراسة_أسعار_الموردين_${op.externalNumber || op.serialNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير جدول دراسة الأسعار بصيغة Excel/CSV 📊");
  };

  // ━━━ RENDER REUSABLE QUOTES TABLE UI (مشترك بين العرض العادي ووضع ملء الشاشة للأدمن) ━━━
  const renderQuotesTableUI = (isExpandedMode: boolean) => (
    <div className={`space-y-3 ${isExpandedMode ? "flex-1 flex flex-col overflow-hidden" : ""}`}>
      {/* Note & Context Strip */}
      <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
          <p className="leading-relaxed">
            أدخل هنا <strong>عروض أسعار الموردين والشركات كبنود منفصلة</strong> للمقارنة ودراسة تكلفة كل صنف بدقة قبل تحضير العطاء المالي.
            استخدم زر <strong>العين 👁️</strong> لعرض المواصفة بالكامل دون اقتصاص، وزر <strong>القلم ✏️</strong> للتعديل الموسع، وزر <strong>النسخ 📋</strong> لمقارنة مورد بديل.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar for Quotes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-muted/40 border border-border shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ابحث في بنود المقايسة، المواصفات الفنية، أو أسماء الموردين..."
            value={quoteSearchQuery}
            onChange={(e) => setQuoteSearchQuery(e.target.value)}
            className="h-9 pr-9 text-xs rounded-xl bg-background border-border"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
            <Filter className="h-3.5 w-3.5" />
            <span>مطابقة المواصفة:</span>
          </div>
          <select
            value={quoteSpecsFilter}
            onChange={(e) => setQuoteSpecsFilter(e.target.value)}
            className="h-9 text-xs rounded-xl bg-background border border-border px-3 font-medium cursor-pointer"
          >
            <option value="ALL">الكل (جميع البنود)</option>
            <option value="مطابق تماماً">مطابق تماماً</option>
            <option value="معتمد من الجهة">معتمد من الجهة</option>
            <option value="بديل مكافئ">بديل مكافئ</option>
            <option value="قيد المراجعة">قيد المراجعة</option>
          </select>

          <span className="text-xs text-muted-foreground px-1 font-mono">
            عرض {filteredQuoteItems.length} من أصل {quoteItems.length}
          </span>
        </div>
      </div>

      {/* Live Table */}
      <div className={`overflow-x-auto rounded-2xl border border-border shadow-xs bg-card ${isExpandedMode ? "flex-1 overflow-y-auto" : ""}`}>
        <table className="min-w-[1360px] w-full text-right text-xs">
          <thead className="bg-muted text-muted-foreground border-b border-border sticky top-0 z-10 shadow-xs">
            <tr>
              <th className="px-3 py-3 w-12 text-center font-bold">م</th>
              <th className="px-3 py-3 min-w-[280px] lg:min-w-[320px] font-bold">اسم الصنف / البند والمواصفة الفنية</th>
              <th className="px-2 py-3 w-28 min-w-[95px] text-center font-bold">الوحدة</th>
              <th className="px-2 py-3 w-28 min-w-[110px] text-center font-bold">الكمية</th>
              <th className="px-3 py-3 min-w-[200px] lg:min-w-[240px] font-bold">اسم المورد / الشركة المسعرة</th>
              <th className="px-2 py-3 w-32 min-w-[125px] text-center font-bold">سعر الوحدة</th>
              <th className="px-3 py-3 w-40 min-w-[150px] text-left font-bold whitespace-nowrap">إجمالي البند</th>
              <th className="px-2 py-3 w-32 min-w-[120px] text-center font-bold">مدة التوريد</th>
              <th className="px-2 py-3 w-36 min-w-[135px] text-center font-bold">المطابقة</th>
              <th className="px-2 py-3 min-w-[190px] font-bold">ملاحظات وشروط الدفع</th>
              <th className="px-3 py-3 w-36 min-w-[140px] text-center font-bold">أدوات الأدمن</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredQuoteItems.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-muted-foreground space-y-2">
                  <p className="font-semibold text-sm">لا توجد بنود تطابق نتائج البحث أو الفلترة</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setQuoteSearchQuery(""); setQuoteSpecsFilter("ALL"); }}
                    className="text-xs rounded-xl"
                  >
                    إعادة تعيين الفلترة
                  </Button>
                </td>
              </tr>
            ) : (
              filteredQuoteItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-3 py-2 text-center font-mono font-bold text-muted-foreground">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2">
                    <div className="relative flex items-center">
                      <Input
                        placeholder="مثلاً: توريد مواسير بولي إيثيلين قطر 110 مم..."
                        value={item.itemName}
                        onChange={(e) => handleUpdateQuoteItem(item.id, "itemName", e.target.value)}
                        className="h-9 text-xs font-semibold rounded-lg bg-background pl-8"
                        title={item.itemName}
                      />
                      <button
                        type="button"
                        onClick={() => setViewingQuoteItem(item)}
                        className="absolute left-2 text-muted-foreground hover:text-blue-600 transition-colors p-1"
                        title="عرض المواصفة كاملة (Eye)"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      placeholder="متر، طن.."
                      value={item.unit}
                      onChange={(e) => handleUpdateQuoteItem(item.id, "unit", e.target.value)}
                      className="h-9 text-xs rounded-lg bg-background text-center font-medium"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      placeholder="الكمية"
                      value={item.quantity || ""}
                      onChange={(e) => handleUpdateQuoteItem(item.id, "quantity", Number(e.target.value))}
                      className="h-9 text-xs font-mono rounded-lg bg-background text-center font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-2"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      placeholder="اسم المورد أو التاجر..."
                      value={item.supplierName}
                      onChange={(e) => handleUpdateQuoteItem(item.id, "supplierName", e.target.value)}
                      className="h-9 text-xs rounded-lg bg-background font-medium text-emerald-800 dark:text-emerald-300"
                      title={item.supplierName}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      placeholder="السعر"
                      value={item.unitPrice || ""}
                      onChange={(e) => handleUpdateQuoteItem(item.id, "unitPrice", Number(e.target.value))}
                      className="h-9 text-xs font-mono font-bold rounded-lg bg-background text-center text-blue-600 dark:text-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-2"
                    />
                  </td>
                  <td className="px-3 py-2 font-mono font-black text-emerald-700 dark:text-emerald-400 text-xs text-left whitespace-nowrap">
                    {formatCurrency(item.totalPrice)}
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      placeholder="مثلاً: 5 أيام"
                      value={item.leadTime || ""}
                      onChange={(e) => handleUpdateQuoteItem(item.id, "leadTime", e.target.value)}
                      className="h-9 text-xs rounded-lg bg-background text-center"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={item.specsMatch || "مطابق تماماً"}
                      onChange={(e) => handleUpdateQuoteItem(item.id, "specsMatch", e.target.value)}
                      className="h-9 w-full text-xs rounded-lg bg-background border border-border px-1.5 font-medium cursor-pointer"
                    >
                      <option value="مطابق تماماً">مطابق تماماً</option>
                      <option value="معتمد من الجهة">معتمد من الجهة</option>
                      <option value="بديل مكافئ">بديل مكافئ</option>
                      <option value="قيد المراجعة">قيد المراجعة</option>
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      placeholder="شروط الدفع / التوريد..."
                      value={item.notes || ""}
                      onChange={(e) => handleUpdateQuoteItem(item.id, "notes", e.target.value)}
                      className="h-9 text-xs rounded-lg bg-background"
                      title={item.notes}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* 👁️ زر العين: عرض كامل للمواصفة والبيانات بدون أي قطع */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setViewingQuoteItem(item)}
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-500/10 rounded-lg cursor-pointer"
                        title="عرض كامل للمواصفة الفنية (Eye)"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {/* ✏️ زر التعديل الموسع */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingQuoteItem(item)}
                        className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 rounded-lg cursor-pointer"
                        title="تعديل تفصيلي للبند (Edit)"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>

                      {/* 📋 زر النسخ لمقارنة مورد آخر */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDuplicateQuoteItem(item)}
                        className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                        title="نسخ البند لمقارنة مورد بديل"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>

                      {/* 🗑️ زر الحذف */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveQuoteItem(item.id)}
                        className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                        title="حذف البند"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Add & Totals Summary Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddQuoteItem}
          className="text-xs h-9 font-bold rounded-xl border-dashed border-emerald-500/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 ml-1" />
          <span>إضافة بند مقايسة جديد</span>
        </Button>

        <div className="flex items-center gap-4 text-xs flex-wrap justify-end">
          <div className="text-muted-foreground font-semibold">
            إجمالي عروض الأسعار المقدرة ({filteredQuoteItems.length} بند):
          </div>
          <div className="text-xl font-mono font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(quotesStats.totalCost)}
          </div>
          <div className="text-[11px] text-muted-foreground border-r border-border pr-3">
            {quotesStats.tafqeet}
          </div>
        </div>
      </div>
    </div>
  );

  // ━━━ DOCUMENTS UPLOAD & MANAGEMENT STATE ━━━
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState("");
  const [docCategory, setDocCategory] = useState("عرض أسعار مورد");
  const [selectedCompanyId, setSelectedCompanyId] = useState(op.companies?.[0]?.companyId || "");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const [renamingDoc, setRenamingDoc] = useState<any | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  const [deletingDoc, setDeletingDoc] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return marketDocs;
    const q = searchQuery.toLowerCase();
    return marketDocs.filter((d: any) =>
      (d.fileName || "").toLowerCase().includes(q) ||
      (d.uploadedBy || "").toLowerCase().includes(q) ||
      (d.fileType || "").toLowerCase().includes(q)
    );
  }, [marketDocs, searchQuery]);

  const imageDocsCount = useMemo(() => {
    return marketDocs.filter((d: any) => {
      const ft = (d.fileType || "").toLowerCase();
      const fn = (d.fileName || "").toLowerCase();
      return ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ft) || Boolean(fn.match(/\.(png|jpe?g|webp|gif)$/i));
    }).length;
  }, [marketDocs]);

  const pdfDocsCount = useMemo(() => {
    return marketDocs.filter((d: any) => {
      const ft = (d.fileType || "").toLowerCase();
      const fn = (d.fileName || "").toLowerCase();
      return ft === "pdf" || Boolean(fn.match(/\.pdf$/i));
    }).length;
  }, [marketDocs]);

  const vendorQuotesCount = useMemo(() => {
    return marketDocs.filter((d: any) => {
      const fn = (d.fileName || "").toLowerCase();
      return fn.includes("عرض أسعار") || fn.includes("مورد") || fn.includes("quote") || fn.includes("أسعار");
    }).length + quoteItems.length;
  }, [marketDocs, quoteItems.length]);

  const handleSelectFile = (file: File | null) => {
    setSelectedFile(file);
    if (file) {
      if (!customFileName.trim()) {
        const clean = file.name.replace(/\.[^/.]+$/, "");
        setCustomFileName(clean);
      }
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setFilePreviewUrl(url);
      } else {
        setFilePreviewUrl(null);
      }
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("يرجى اختيار ملف أو صورة لرفعها أولاً");
      return;
    }
    if (!customFileName.trim()) {
      toast.error("يرجى كتابة تسمية للملف عند الرفع لتسهيل تنظيمه");
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", selectedFile);
      const taggedName = docCategory && docCategory !== "أخرى"
        ? `[${docCategory}] ${customFileName.trim()}`
        : customFileName.trim();
      formData.append("fileName", taggedName);
      formData.append("type", "MARKET_STUDY");
      if (selectedCompanyId) {
        formData.append("companyId", selectedCompanyId);
      }
      await api.post(`/operations/${op.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`تم رفع وحفظ "${customFileName}" بنجاح في دراسة السوق! 📁`);
      setSelectedFile(null);
      setCustomFileName("");
      setFilePreviewUrl(null);
      setUploadModalOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل رفع الملف إلى الخادم");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async () => {
    if (!deletingDoc) return;
    try {
      setDeleting(true);
      await api.delete(`/operations/${op.id}/documents/${deletingDoc.id}`);
      toast.success("تم حذف الملف بنجاح");
      setDeletingDoc(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل حذف الملف");
    } finally {
      setDeleting(false);
    }
  };

  const handleRenameSubmit = async () => {
    if (!renamingDoc || !renameValue.trim()) {
      toast.error("يرجى إدخال التسمية الجديدة للملف");
      return;
    }
    try {
      setRenaming(true);
      await api.patch(`/operations/${op.id}/documents/${renamingDoc.id}`, {
        fileName: renameValue.trim(),
      });
      toast.success("تم تحديث تسمية الملف بنجاح");
      setRenamingDoc(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل تعديل التسمية");
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ━━━ Market Study KPI Cards Row (الـ 4 كروت التي أشار لها العميل في تسجيل 10) ━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => setSubView("documents_archive")}
          className={`p-4 rounded-2xl glass-card border space-y-1 relative overflow-hidden group cursor-pointer transition-all ${
            subView === "documents_archive" ? "border-blue-500 shadow-md ring-2 ring-blue-500/20" : "border-border hover:border-blue-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">إجمالي ملفات دراسة السوق</span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FolderOpen className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black font-mono text-foreground">{marketDocs.length} <span className="text-xs font-normal text-muted-foreground">مستند</span></p>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>أرشيف دراسة السوق الرقمي</span>
            <span className="text-blue-600 font-bold">عرض الأرشيف ←</span>
          </div>
        </div>

        <div
          onClick={() => setSubView("quotes_table")}
          className={`p-4 rounded-2xl glass-card border space-y-1 relative overflow-hidden group cursor-pointer transition-all ${
            subView === "quotes_table" ? "border-emerald-500 shadow-md ring-2 ring-emerald-500/20" : "border-border hover:border-emerald-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">عروض أسعار الموردين</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileCheck className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {quoteItems.length} <span className="text-xs font-normal text-muted-foreground">بند مدروس ({formatCurrency(quotesStats.totalCost)})</span>
          </p>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>جدول بنود الموردين النشط</span>
            <span className="text-emerald-600 font-bold">فتح الجدول 📋</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-border space-y-1 relative overflow-hidden group hover:border-purple-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">صور العينات والمطابقة</span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ImageIcon className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">{imageDocsCount} <span className="text-xs font-normal text-muted-foreground">صورة / عينة</span></p>
          <span className="text-[11px] text-muted-foreground">صور بصرية للأصناف والمهمات</span>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-border space-y-1 relative overflow-hidden group hover:border-rose-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">ملفات ومستندات PDF</span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <FileText className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">{pdfDocsCount} <span className="text-xs font-normal text-muted-foreground">ملف PDF</span></p>
          <span className="text-[11px] text-muted-foreground">كتالوجات ومواصفات فنية رسمية</span>
        </div>
      </div>

      {/* ━━━ SUB-TAB SELECTOR STRIP: TABLE VS FILES ARCHIVE ━━━ */}
      <div className="flex items-center justify-between p-1.5 rounded-2xl bg-muted/60 border border-border flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubView("quotes_table")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all ${
              subView === "quotes_table"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Calculator className="h-4 w-4" />
            <span>جدول عروض أسعار الموردين والبنود ({quoteItems.length})</span>
            <Badge className="bg-emerald-700/80 text-white text-[10px] px-1.5 py-0.2">مباشر</Badge>
          </button>

          <button
            type="button"
            onClick={() => setSubView("documents_archive")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all ${
              subView === "documents_archive"
                ? "bg-blue-600 text-white shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            <span>أرشيف المستندات والملفات المرفوعة ({marketDocs.length})</span>
          </button>
        </div>

        {subView === "quotes_table" && (
          <div className="flex items-center gap-2 px-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              className="h-8.5 text-xs font-bold rounded-xl border-border hover:bg-muted"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 ml-1 text-emerald-600" />
              <span>تصدير Excel/CSV</span>
            </Button>
            <Button
              size="sm"
              onClick={handleSaveQuotes}
              disabled={savingQuotes}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8.5 text-xs font-bold rounded-xl shadow-xs"
            >
              <Save className="h-3.5 w-3.5 ml-1" />
              <span>حفظ التعديلات</span>
            </Button>
          </div>
        )}
      </div>

      {/* ━━━ VIEW 1: INTERACTIVE SUPPLIER QUOTES TABLE (العرض العادي داخل الصفحة) ━━━ */}
      {subView === "quotes_table" && (
        <SectionCard
          title="جدول دراسة أسعار الموردين ومقارنة بنود المقايسة"
          icon={Coins}
          iconColor="text-emerald-600"
          badge={
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[11px] font-bold">
              {quoteItems.length} بنود مدروسة
            </Badge>
          }
          actions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsTableExpanded(true)}
                className="h-9 px-3 text-xs font-bold rounded-xl border-border hover:bg-muted transition-all cursor-pointer flex items-center gap-1.5"
                title="توسيع الجدول بملء الشاشة للأدمن"
              >
                <Maximize2 className="h-4 w-4 text-blue-600" />
                <span>توسيع الجدول ⛶</span>
              </Button>
              <Button
                size="sm"
                onClick={handleAddQuoteItem}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>إضافة بند تسعير جديد</span>
              </Button>
            </div>
          }
        >
          {renderQuotesTableUI(false)}
        </SectionCard>
      )}

      {/* ━━━ MODAL: EXPANDED TABLE FULLSCREEN FOR ADMIN (وضع ملء الشاشة للأدمن النظيف تماماً بمعزل عن الصفحة) ━━━ */}
      {isTableExpanded && (
        <Portal>
          <div className="fixed inset-0 z-[99990] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-950 text-foreground border-2 border-emerald-500/50 rounded-3xl w-full h-full max-w-[99vw] max-h-[97vh] p-4 sm:p-6 shadow-2xl flex flex-col overflow-hidden">
              {/* Fullscreen Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border gap-2 flex-wrap shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                    <Coins className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-black text-foreground">
                        لوحة دراسة أسعار الموردين الموسعة (وضع ملء الشاشة للأدمن)
                      </h2>
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[11px] font-bold">
                        وضع التوسيع الكامل للأدمن ⛶
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">عرض موسع وشامل لجميع البنود والمواصفات بدون أي ضغط أو تداخل مع الصفحة</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportCSV}
                    className="h-9 text-xs font-bold rounded-xl border-border hover:bg-muted"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 ml-1 text-emerald-600" />
                    <span>تصدير Excel/CSV</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveQuotes}
                    disabled={savingQuotes}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs font-bold rounded-xl shadow-xs"
                  >
                    <Save className="h-3.5 w-3.5 ml-1" />
                    <span>حفظ التعديلات</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddQuoteItem}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span>إضافة بند جديد</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsTableExpanded(false)}
                    className="h-9 px-3.5 text-xs font-bold rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40 hover:bg-amber-500/25 cursor-pointer flex items-center gap-1.5"
                    title="إغلاق وضع التوسيع (Esc)"
                  >
                    <Minimize2 className="h-4 w-4 text-amber-600" />
                    <span>تصغير العرض (Esc)</span>
                  </Button>
                </div>
              </div>

              {/* The Table UI inside expanded container */}
              <div className="flex-1 flex flex-col overflow-hidden pt-3">
                {renderQuotesTableUI(true)}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ━━━ VIEW 2: MASTER UPLOAD & DOCUMENTS GALLERY (القسم الأصلي للملفات) ━━━ */}
      {subView === "documents_archive" && (
        <SectionCard
          title="أرشيف ملفات وصور دراسة السوق والجدوى"
          icon={FolderOpen}
          iconColor="text-blue-600"
          badge={
            <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-bold text-[11px]">
              {marketDocs.length} ملفات ومستندات مرفوعة
            </Badge>
          }
          actions={
            <Button
              size="sm"
              onClick={() => {
                setSelectedFile(null);
                setCustomFileName("");
                setFilePreviewUrl(null);
                setUploadModalOpen(true);
              }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Upload className="h-4 w-4" />
              <span>رفع ملف أو صورة جديدة</span>
            </Button>
          }
        >
          <div className="space-y-4">
            {/* Explanation Strip */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-500/20 text-xs text-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
                <p className="leading-relaxed">
                  ارفع هنا جميع <strong>عروض أسعار الموردين الرسمية</strong>، <strong>صور عينات الأصناف</strong>، <strong>شيتات الإكسيل</strong>، أو <strong>كتالوجات المواصفات</strong> مع <strong>تسمية تعريفيّة خاصة</strong> لكل ملف لتسهيل المعاينة والتحميل والرجوع إليه لاحقاً.
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                  title="عرض شبكي (كروت مع معاينة)"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                  title="عرض جدولي مفصل"
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search Toolbar */}
            {marketDocs.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                <div className="relative flex-1 max-w-md">
                  <Input
                    placeholder="ابحث في تسمية الملفات، أسماء الموردين، أو صيغ المستندات..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 text-xs pr-3 rounded-xl bg-background border-border"
                  />
                </div>
                <span className="text-[11px] text-muted-foreground self-center">
                  يتم عرض {filteredDocs.length} من أصل {marketDocs.length} مستند
                </span>
              </div>
            )}

            {/* Grid Mode */}
            {filteredDocs.length > 0 && viewMode === "grid" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                {filteredDocs.map((doc: any) => {
                  const badgeInfo = getDocCategoryBadge(doc);
                  const isImage = badgeInfo.type === "image";
                  const isWord = badgeInfo.type === "word";
                  const isPdf = badgeInfo.type === "pdf";

                  return (
                    <div
                      key={doc.id}
                      className="p-4 rounded-2xl border border-border bg-card hover:border-blue-500/40 hover:shadow-lg transition-all duration-200 flex flex-col justify-between space-y-3.5 group relative"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge className={`${badgeInfo.badgeBg} text-[10px] font-bold px-2 py-0.5 rounded-lg`}>
                          {badgeInfo.label}
                        </Badge>
                        <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                          {doc.fileType || "ملف"}
                        </span>
                      </div>

                      {isImage ? (
                        <div
                          onClick={() => onPreviewDoc?.(doc)}
                          className="h-36 w-full rounded-xl bg-slate-950/80 border border-border overflow-hidden relative group/thumb cursor-pointer flex items-center justify-center shadow-inner"
                          title="انقر للمعاينة بحجم الشاشة الكامل"
                        >
                          <img
                            src={`http://localhost:4000/api/operations/${op.id}/documents/${doc.id}/file`}
                            alt={doc.fileName}
                            className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold backdrop-blur-xs">
                            <Eye className="h-4 w-4" />
                            <span>معاينة الصورة</span>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => onPreviewDoc?.(doc)}
                          className={`h-28 w-full rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 shadow-inner group/box ${
                            isPdf
                              ? "bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                              : isWord
                              ? "bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                              : "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          }`}
                          title="انقر لمعاينة المستند"
                        >
                          <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-xs group-hover/box:scale-110 transition-transform">
                            {isPdf ? (
                              <FileText className="h-7 w-7 text-rose-500" />
                            ) : isWord ? (
                              <BookOpen className="h-7 w-7 text-blue-500" />
                            ) : (
                              <FileSpreadsheet className="h-7 w-7 text-emerald-500" />
                            )}
                          </div>
                          <span className="text-[11px] font-bold flex items-center gap-1 text-muted-foreground group-hover/box:text-foreground">
                            <Eye className="h-3.5 w-3.5" />
                            معاينة مباشرة في النظام
                          </span>
                        </div>
                      )}

                      <div className="space-y-1">
                        <h4
                          className="text-xs sm:text-sm font-extrabold text-foreground leading-snug line-clamp-2 hover:text-blue-600 transition-colors"
                          title={doc.fileName}
                        >
                          {doc.fileName}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono flex-wrap">
                          <span>{formatDocFileSize(doc.fileSize)}</span>
                          <span>•</span>
                          <span>{formatDate(doc.createdAt)}</span>
                          {doc.uploadedBy && (
                            <>
                              <span>•</span>
                              <span className="text-foreground font-medium">{doc.uploadedBy}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-border">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onPreviewDoc?.(doc)}
                            className="h-8 px-2.5 text-[11px] font-bold rounded-lg border-border hover:border-blue-500 hover:text-blue-600 cursor-pointer flex items-center gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>معاينة</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDownloadDoc?.(doc)}
                            className="h-8 px-2.5 text-[11px] font-bold rounded-lg border-border hover:border-emerald-500 hover:text-emerald-600 cursor-pointer flex items-center gap-1"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>تحميل</span>
                          </Button>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setRenamingDoc(doc);
                              setRenameValue(doc.fileName || "");
                            }}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                            title="تعديل تسمية الملف"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeletingDoc(doc)}
                            className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                            title="حذف الملف"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* List Mode */}
            {filteredDocs.length > 0 && viewMode === "list" && (
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-right text-xs">
                  <thead className="bg-muted/70 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3">تسمية الملف التعريفي</th>
                      <th className="px-3.5 py-3">التصنيف والنوع</th>
                      <th className="px-3.5 py-3">الحجم</th>
                      <th className="px-3.5 py-3">تاريخ الرفع</th>
                      <th className="px-3.5 py-3">بواسطة</th>
                      <th className="px-3.5 py-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredDocs.map((doc: any) => {
                      const badgeInfo = getDocCategoryBadge(doc);
                      return (
                        <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-lg bg-card border border-border shrink-0">
                                {badgeInfo.type === "image" ? (
                                  <ImageIcon className="h-4 w-4 text-purple-500" />
                                ) : badgeInfo.type === "word" ? (
                                  <BookOpen className="h-4 w-4 text-blue-500" />
                                ) : badgeInfo.type === "excel" ? (
                                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <FileText className="h-4 w-4 text-rose-500" />
                                )}
                              </div>
                              <span className="font-bold text-foreground text-xs leading-normal">
                                {doc.fileName}
                              </span>
                            </div>
                          </td>
                          <td className="px-3.5 py-3">
                            <Badge className={`${badgeInfo.badgeBg} text-[10px]`}>
                              {badgeInfo.label}
                            </Badge>
                          </td>
                          <td className="px-3.5 py-3 font-mono text-muted-foreground text-[11px]">
                            {formatDocFileSize(doc.fileSize)}
                          </td>
                          <td className="px-3.5 py-3 text-muted-foreground text-[11px]">
                            {formatDate(doc.createdAt)}
                          </td>
                          <td className="px-3.5 py-3 text-foreground font-medium text-[11px]">
                            {doc.uploadedBy || "المدير العام"}
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onPreviewDoc?.(doc)}
                                className="h-7 px-2 text-[10px] font-bold rounded-lg border-border hover:text-blue-600 cursor-pointer"
                              >
                                <Eye className="h-3 w-3 ml-1" />
                                معاينة
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onDownloadDoc?.(doc)}
                                className="h-7 px-2 text-[10px] font-bold rounded-lg border-border hover:text-emerald-600 cursor-pointer"
                              >
                                <Download className="h-3 w-3 ml-1" />
                                تحميل
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setRenamingDoc(doc);
                                  setRenameValue(doc.fileName || "");
                                }}
                                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                title="تعديل التسمية"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setDeletingDoc(doc)}
                                className="h-7 w-7 text-rose-500 hover:text-rose-700 cursor-pointer"
                                title="حذف"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Empty State */}
            {marketDocs.length === 0 && (
              <div className="p-8 sm:p-12 rounded-3xl border-2 border-dashed border-border/80 bg-muted/20 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-lg">
                  <Upload className="h-8 w-8 stroke-[1.8]" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h4 className="text-base font-extrabold text-foreground">
                    لم يتم رفع أي ملفات أو صور لدراسة السوق حتى الآن
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    ابدأ الآن برفع عروض أسعار الموردين، صور العينات المطابقة، أو الكتالوجات الفنية مع إمكانية تسمية كل ملف لسهولة تنظيمه واستعراضه.
                  </p>
                </div>
                <Button
                  size="default"
                  onClick={() => {
                    setSelectedFile(null);
                    setCustomFileName("");
                    setFilePreviewUrl(null);
                    setUploadModalOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 px-6 rounded-xl cursor-pointer shadow-md flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>رفع أول ملف أو صورة الآن</span>
                </Button>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* ━━━ MODAL: UPLOAD FILE WITH CUSTOM NAME & PREVIEW ━━━ */}
      {uploadModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto scrollbar-thin">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-foreground text-sm sm:text-base leading-tight">
                      رفع وتسمية ملف / صورة لدراسة السوق
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      العملية: {op.companies?.[0]?.displayCode || `#${op.serialNumber}`} • {op.name}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setUploadModalOpen(false)}
                  className="rounded-full h-8 w-8 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleSelectFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => {
                    const input = document.getElementById("market-file-picker") as HTMLInputElement;
                    input?.click();
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
                    dragActive
                      ? "border-blue-500 bg-blue-500/10 scale-[1.01]"
                      : selectedFile
                      ? "border-emerald-500/60 bg-emerald-500/5"
                      : "border-border hover:border-blue-500/50 hover:bg-muted/40"
                  }`}
                >
                  <input
                    id="market-file-picker"
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleSelectFile(e.target.files[0]);
                      }
                    }}
                  />

                  {selectedFile ? (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                        <Check className="h-6 w-6" />
                      </div>
                      <p className="text-xs font-bold text-foreground truncate max-w-xs mx-auto">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {formatDocFileSize(selectedFile.size)}
                      </p>
                      <span className="inline-block text-[10px] text-blue-600 font-bold hover:underline pt-1">
                        انقر لاختيار ملف آخر
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto">
                        <Upload className="h-6 w-6" />
                      </div>
                      <p className="text-xs font-bold text-foreground">
                        اسحب وأفلت الملف أو الصورة هنا
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        يدعم: عروض الأسعار (PDF / Word / Excel) وصور عينات الأصناف (JPG, PNG) حتى 35 ميجابايت
                      </p>
                    </div>
                  )}
                </div>

                {filePreviewUrl && (
                  <div className="relative rounded-2xl overflow-hidden border border-border h-36 bg-slate-950 flex items-center justify-center">
                    <img
                      src={filePreviewUrl}
                      alt="معاينة"
                      className="max-h-full max-w-full object-contain"
                    />
                    <span className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded bg-black/60 text-white font-mono">
                      معاينة بصرية مباشرة
                    </span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    تسمية مخصصة ومعبرة للملف (Friendly Title) *
                  </Label>
                  <Input
                    placeholder="مثال: عرض أسعار كابلات شركة السويدي، عينة طلمبات مياه..."
                    value={customFileName}
                    onChange={(e) => setCustomFileName(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">تصنيف المستند</Label>
                    <Select value={docCategory} onValueChange={(val) => setDocCategory(val || "")}>
                      <SelectTrigger className="h-10 text-xs rounded-xl">
                        <SelectValue placeholder="اختر التصنيف" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="عرض أسعار مورد">عرض أسعار مورد</SelectItem>
                        <SelectItem value="صورة عينة مطابقة">صورة عينة مطابقة</SelectItem>
                        <SelectItem value="كتالوج مواصفات فنية">كتالوج مواصفات فنية</SelectItem>
                        <SelectItem value="مقايسة أسعار إكسيل">مقايسة أسعار إكسيل</SelectItem>
                        <SelectItem value="شهادة اختبار جودة">شهادة اختبار جودة</SelectItem>
                        <SelectItem value="مستند دراسة جدوى">مستند دراسة جدوى</SelectItem>
                        <SelectItem value="أخرى">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">الشركة المعنية</Label>
                    <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                      <SelectTrigger className="h-10 text-xs rounded-xl">
                        <SelectValue placeholder="الشركة">
                          {(() => {
                            const sel = (op.companies || []).find((c: any) => (c.companyId || c.id) === selectedCompanyId);
                            return sel ? `${sel.company?.name || `شركة (${sel.displayCode})`} (${sel.displayCode})` : "الشركة";
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(op.companies || []).map((oc: any) => (
                          <SelectItem key={oc.companyId || oc.id} value={oc.companyId || oc.id}>
                            {oc.company?.name || `شركة (${oc.displayCode})`} ({oc.displayCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setUploadModalOpen(false)}
                  disabled={uploading}
                  className="rounded-xl h-9.5 text-xs font-bold"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9.5 px-5 text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>جاري الرفع والحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span>حفظ ورفع الملف للأرشيف</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ━━━ MODAL: RENAME DOCUMENT ━━━ */}
      {renamingDoc && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="font-extrabold text-foreground text-sm">تعديل تسمية الملف</h3>
                <Button size="icon" variant="ghost" onClick={() => setRenamingDoc(null)} className="rounded-full h-7 w-7">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">التسمية التعريفية الجديدة</Label>
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setRenamingDoc(null)} disabled={renaming}>إلغاء</Button>
                <Button size="sm" onClick={handleRenameSubmit} disabled={renaming} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  {renaming ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ التعديل"}
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ━━━ MODAL: DELETE DOCUMENT CONFIRMATION ━━━ */}
      {deletingDoc && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-2.5 text-rose-600">
                <AlertTriangle className="h-6 w-6 shrink-0" />
                <h3 className="font-extrabold text-foreground text-sm">تأكيد حذف الملف من دراسة السوق</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                هل أنت متأكد من حذف الملف <strong>&quot;{deletingDoc.fileName}&quot;</strong> نهائياً من دراسة السوق والخادم؟
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setDeletingDoc(null)} disabled={deleting}>إلغاء</Button>
                <Button
                  size="sm"
                  onClick={handleDeleteDoc}
                  disabled={deleting}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "نعم، حذف الملف"}
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ━━━ MODAL: VIEW QUOTE ITEM FULL DETAILS (العين - المعاينة الكاملة للمواصفات والأسعار) ━━━ */}
      {viewingQuoteItem && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Eye className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-foreground text-base">بطاقة مواصفات البند وعرض السعر الكامل</h3>
                    <p className="text-xs text-muted-foreground">تفاصيل الصنف والمورد والمواصفة دون أي اقتطاع أو ضغط</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-muted text-foreground font-mono text-xs">
                    بند {viewingQuoteItem.itemCode || "—"}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setViewingQuoteItem(null)}
                    className="rounded-full h-8 w-8 hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Full Technical Specification Box */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                  <span>اسم الصنف والمواصفة الفنية المعتمدة الكاملة:</span>
                </span>
                <div className="p-4 rounded-2xl bg-muted/40 border border-border text-foreground font-semibold text-sm leading-relaxed select-text whitespace-pre-wrap">
                  {viewingQuoteItem.itemName || "لم يتم إدخال اسم الصنف بعد"}
                </div>
              </div>

              {/* 4 Primary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>اسم المورد / الشركة المسعرة</span>
                  </span>
                  <p className="text-sm font-black text-emerald-900 dark:text-emerald-100">
                    {viewingQuoteItem.supplierName || "غير محدد"}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-1">
                  <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300">الكمية والوحدة</span>
                  <p className="text-sm font-black text-blue-900 dark:text-blue-100 font-mono">
                    {viewingQuoteItem.quantity} {viewingQuoteItem.unit}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted/50 border border-border space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground">سعر الوحدة المقدر</span>
                  <p className="text-base font-black text-foreground font-mono">
                    {formatCurrency(viewingQuoteItem.unitPrice)}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 space-y-1">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">إجمالي قيمة البند</span>
                  <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">
                    {formatCurrency(viewingQuoteItem.totalPrice)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {tafqeetArabic(viewingQuoteItem.totalPrice)}
                  </p>
                </div>
              </div>

              {/* Secondary Details Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-semibold">مدة التوريد والتسليم:</span>
                  <span className="text-xs font-bold text-foreground">{viewingQuoteItem.leadTime || "غير محدد"}</span>
                </div>

                <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-semibold">مطابقة المواصفة:</span>
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold">
                    {viewingQuoteItem.specsMatch || "مطابق تماماً"}
                  </Badge>
                </div>
              </div>

              {/* Notes */}
              {viewingQuoteItem.notes && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-muted-foreground">ملاحظات وشروط التوريد والدفع:</span>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                    {viewingQuoteItem.notes}
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-border flex-wrap">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const it = viewingQuoteItem;
                      setViewingQuoteItem(null);
                      handleDuplicateQuoteItem(it);
                    }}
                    className="h-9 text-xs font-bold rounded-xl"
                  >
                    <Copy className="h-3.5 w-3.5 ml-1 text-emerald-600" />
                    <span>نسخ لمورد بديل</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const it = viewingQuoteItem;
                      setViewingQuoteItem(null);
                      setEditingQuoteItem(it);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white h-9 text-xs font-bold rounded-xl"
                  >
                    <Edit className="h-3.5 w-3.5 ml-1" />
                    <span>تعديل هذا البند</span>
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingQuoteItem(null)}
                  className="h-9 px-5 text-xs font-bold rounded-xl"
                >
                  إغلاق
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ━━━ MODAL: EDIT QUOTE ITEM (التعديل الموسع والمريح للبند والمواصفة) ━━━ */}
      {editingQuoteItem && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Edit className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-foreground text-base">تعديل مواصفات وبيانات البند</h3>
                    <p className="text-xs text-muted-foreground">مساحة واسعة لكتابة المواصفات الفنية والشروط براحة كاملة</p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditingQuoteItem(null)}
                  className="rounded-full h-8 w-8 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Item Name / Specs Textarea */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  اسم الصنف / المواصفة الفنية التفصيلية للبند *
                </Label>
                <Textarea
                  rows={3}
                  placeholder="اكتب هنا المواصفات الفنية المعتمدة الكاملة، القطر، الضغط، الماركة المطلوبة..."
                  value={editingQuoteItem.itemName}
                  onChange={(e) => setEditingQuoteItem({ ...editingQuoteItem, itemName: e.target.value })}
                  className="text-xs rounded-xl leading-relaxed"
                />
              </div>

              {/* Grid 1: Supplier & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-bold text-foreground">اسم المورد / الشركة المسعرة</Label>
                  <Input
                    placeholder="اسم الشركة أو التاجر..."
                    value={editingQuoteItem.supplierName}
                    onChange={(e) => setEditingQuoteItem({ ...editingQuoteItem, supplierName: e.target.value })}
                    className="h-9 text-xs rounded-xl font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">كود البند</Label>
                  <Input
                    placeholder="01, 02..."
                    value={editingQuoteItem.itemCode || ""}
                    onChange={(e) => setEditingQuoteItem({ ...editingQuoteItem, itemCode: e.target.value })}
                    className="h-9 text-xs rounded-xl font-mono text-center"
                  />
                </div>
              </div>

              {/* Grid 2: Quantity, Unit, Price, Total */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">الوحدة</Label>
                  <Input
                    placeholder="متر، طن، عدد.."
                    value={editingQuoteItem.unit}
                    onChange={(e) => setEditingQuoteItem({ ...editingQuoteItem, unit: e.target.value })}
                    className="h-9 text-xs rounded-xl text-center"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">الكمية</Label>
                  <Input
                    type="number"
                    placeholder="الكمية"
                    value={editingQuoteItem.quantity || ""}
                    onChange={(e) => {
                      const q = Number(e.target.value) || 0;
                      const tot = Math.round(q * (editingQuoteItem.unitPrice || 0) * 100) / 100;
                      setEditingQuoteItem({ ...editingQuoteItem, quantity: q, totalPrice: tot });
                    }}
                    className="h-9 text-xs font-mono font-bold rounded-xl text-center"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">سعر الوحدة</Label>
                  <Input
                    type="number"
                    placeholder="السعر"
                    value={editingQuoteItem.unitPrice || ""}
                    onChange={(e) => {
                      const p = Number(e.target.value) || 0;
                      const tot = Math.round((editingQuoteItem.quantity || 0) * p * 100) / 100;
                      setEditingQuoteItem({ ...editingQuoteItem, unitPrice: p, totalPrice: tot });
                    }}
                    className="h-9 text-xs font-mono font-bold rounded-xl text-center text-blue-600 dark:text-blue-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">إجمالي البند (تلقائي)</Label>
                  <div className="h-9 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs">
                    {formatCurrency(editingQuoteItem.totalPrice)}
                  </div>
                </div>
              </div>

              {/* Grid 3: Lead time & Specs match */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">مدة التوريد والتسليم</Label>
                  <Input
                    placeholder="مثال: تسليم فوري، خلال 10 أيام..."
                    value={editingQuoteItem.leadTime || ""}
                    onChange={(e) => setEditingQuoteItem({ ...editingQuoteItem, leadTime: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">مطابقة المواصفة الفنية</Label>
                  <select
                    value={editingQuoteItem.specsMatch || "مطابق تماماً"}
                    onChange={(e) => setEditingQuoteItem({ ...editingQuoteItem, specsMatch: e.target.value })}
                    className="h-9 w-full text-xs rounded-xl bg-background border border-border px-3 font-medium cursor-pointer"
                  >
                    <option value="مطابق تماماً">مطابق تماماً</option>
                    <option value="معتمد من الجهة">معتمد من الجهة</option>
                    <option value="بديل مكافئ">بديل مكافئ</option>
                    <option value="قيد المراجعة">قيد المراجعة</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">شروط الدفع والضمان وملاحظات إضافية</Label>
                <Textarea
                  rows={2}
                  placeholder="شامل النقل والتشوين، دفعة مقدمة 25%، ضمان سنة من تاريخ الاستلام..."
                  value={editingQuoteItem.notes || ""}
                  onChange={(e) => setEditingQuoteItem({ ...editingQuoteItem, notes: e.target.value })}
                  className="text-xs rounded-xl leading-relaxed"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setEditingQuoteItem(null)}
                  className="rounded-xl h-9.5 text-xs font-bold"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={() => {
                    setQuoteItems(
                      quoteItems.map((it) => (it.id === editingQuoteItem.id ? editingQuoteItem : it))
                    );
                    setEditingQuoteItem(null);
                    toast.success("تم تحديث بيانات البند والمواصفة بنجاح! 💾");
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9.5 px-5 text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>تأكيد وحفظ التعديلات</span>
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ━━━ STEP FOOTER NAVIGATION (الانتقال للخطوة التالية بأسفل الصفحة - التسجيل 1 & 2) ━━━ */}
      <StepFooterNav
        currentTabId="market_study"
        onNavigate={onNavigate}
        nextLabel="المتابعة لسحب الكراسة والتأمين ➔"
        prevLabel="← العودة للمواعيد والتواريخ"
      />
    </div>
  );
}
