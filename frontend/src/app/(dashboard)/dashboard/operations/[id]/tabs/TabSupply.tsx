"use client";

import React, { useState, useMemo } from "react";
import {
  Truck,
  Package,
  Plus,
  Loader2,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  ClipboardCheck,
  FileText,
  Boxes,
  Check,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  X,
  Printer,
  Calendar,
  Building2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Portal } from "@/components/ui/portal";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  Operation,
  SectionCard,
  DataRow,
  EmptyState,
  formatCurrency,
  formatDate,
  tafqeetArabic,
} from "./types";
import { StepFooterNav } from "./StepFooterNav";

export interface SupplyItemRow {
  id: string;
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: number;
  costPrice: number; // سعر التكلفة من دراسة السوق
  supplyPrice: number; // سعر التوريد من البت المالي
  prepStatus: "PENDING" | "PREPARING" | "SHIPPED" | "DELIVERED";
  inspectionStatus: "MATCHED" | "CONDITIONAL" | "REJECTED";
  notes?: string;
}

export interface SupplyBatchRecord {
  id: string;
  batchNumber: string;
  inspectionNumber: string;
  inspectionDate: string;
  committeeMembers: string;
  inspectionResult: "PASSED" | "NOTES";
  inspectionNotes: string;
  items: SupplyItemRow[];
  totalCost: number;
  totalSupply: number;
  totalMargin: number;
  createdAt: string;
}

export interface SavedGoodsReceiptRecord {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string;
  notes?: string;
  createdAt: string;
}

export function TabSupply({
  op,
  onRefresh,
  onNavigate,
}: {
  op: Operation;
  onRefresh: () => void;
  onNavigate?: (tabId: string) => void;
}) {
  // Parse existing data from op.notes
  const existingNotes = useMemo(() => {
    if (!op.notes) return {};
    try {
      return JSON.parse(op.notes);
    } catch {
      return {};
    }
  }, [op.notes]);

  const supplyData = existingNotes.supplyPreparationData || {};
  const marketQuotes = existingNotes.marketQuotes || [];

  // Initialize Supply Items from Financial Offer or Market Quotes
  const [supplyItems, setSupplyItems] = useState<SupplyItemRow[]>(() => {
    if (supplyData.items && Array.isArray(supplyData.items) && supplyData.items.length > 0) {
      return supplyData.items;
    }
    // Pull from financial offer items
    const foItems = op.financialOffers?.[0]?.items || [];
    if (foItems.length > 0) {
      return foItems.map((fi: any, idx: number) => {
        const matchedMarket = marketQuotes.find(
          (mq: any) => mq.itemName?.trim().toLowerCase() === fi.itemName?.trim().toLowerCase()
        );
        const costPrice = matchedMarket ? Number(matchedMarket.unitPrice) : Math.round(Number(fi.unitPrice) * 0.75);
        return {
          id: fi.id || String(idx + 1),
          itemCode: `بند-${idx + 1}`,
          itemName: fi.itemName || "صنف توريد معتمد",
          unit: fi.unit || "وحدة",
          quantity: Number(fi.quantity) || 1,
          costPrice,
          supplyPrice: Number(fi.unitPrice) || 0,
          prepStatus: "PREPARING",
          inspectionStatus: "MATCHED",
          notes: fi.description || "",
        };
      });
    }

    // Default mock items if none found
    return [
      {
        id: "1",
        itemCode: "بند-1",
        itemName: op.name || "توريد أصناف ومهمات مطابقة للمواصفات",
        unit: "دفعة",
        quantity: 1,
        costPrice: 42000,
        supplyPrice: 58000,
        prepStatus: "PREPARING",
        inspectionStatus: "MATCHED",
        notes: "تم الاتفاق مع المورد وجاري التجهيز",
      },
    ];
  });

  // Initial Inspection Report State
  const [initialInspectionNumber, setInitialInspectionNumber] = useState(
    () => supplyData.initialInspectionNumber || `محضر-فحص-مبدئي-${op.serialNumber || "1"}`
  );
  const [initialInspectionDate, setInitialInspectionDate] = useState(
    () => supplyData.initialInspectionDate || new Date().toISOString().split("T")[0]
  );
  const [committeeMembers, setCommitteeMembers] = useState(
    () => supplyData.committeeMembers || "لجنة الفحص والاستلام المشكلة بالقرار الإداري من الجهة"
  );
  const [inspectionResult, setInspectionResult] = useState<"PASSED" | "NOTES">(
    () => supplyData.inspectionResult || "PASSED"
  );
  const [inspectionNotes, setInspectionNotes] = useState(
    () => supplyData.inspectionNotes || "تم الفحص الظاهري والمطابقة المبدئية للشحنة مع كراسة الشروط والمواصفات المعتمدة"
  );

  // Supply Batches (Cards list)
  const [supplyBatches, setSupplyBatches] = useState<SupplyBatchRecord[]>(() => {
    if (existingNotes.supplyBatches && Array.isArray(existingNotes.supplyBatches) && existingNotes.supplyBatches.length > 0) {
      return existingNotes.supplyBatches;
    }
    if (supplyData.items && Array.isArray(supplyData.items) && supplyData.items.length > 0) {
      return [
        {
          id: "batch-1",
          batchNumber: "سجل التوريد والفحص المبدئي الأول",
          inspectionNumber: supplyData.initialInspectionNumber || `محضر-فحص-مبدئي-${op.serialNumber || "1"}`,
          inspectionDate: supplyData.initialInspectionDate || new Date().toISOString().split("T")[0],
          committeeMembers: supplyData.committeeMembers || "لجنة الفحص والاستلام المشكلة بالقرار الإداري من الجهة",
          inspectionResult: supplyData.inspectionResult || "PASSED",
          inspectionNotes: supplyData.inspectionNotes || "تم الفحص الظاهري والمطابقة المبدئية للشحنة مع كراسة الشروط والمواصفات المعتمدة",
          items: supplyData.items,
          totalCost: supplyData.totalCost || 0,
          totalSupply: supplyData.totalSupply || 0,
          totalMargin: supplyData.totalMargin || 0,
          createdAt: supplyData.updatedAt || new Date().toISOString(),
        },
      ];
    }
    return [];
  });

  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [viewingBatch, setViewingBatch] = useState<SupplyBatchRecord | null>(null);

  // Goods Receipts (Cards & DB)
  const [goodsReceiptsList, setGoodsReceiptsList] = useState<SavedGoodsReceiptRecord[]>(() => {
    if (existingNotes.goodsReceiptsList && Array.isArray(existingNotes.goodsReceiptsList) && existingNotes.goodsReceiptsList.length > 0) {
      return existingNotes.goodsReceiptsList;
    }
    const dbReceipts =
      op.supplyOrders?.flatMap((so: any) =>
        (so.goodsReceipts || []).map((r: any) => ({
          id: r.id,
          receiptNumber: r.receiptNumber,
          receiptDate: r.receiptDate?.split("T")[0] || new Date().toISOString().split("T")[0],
          itemName: r.items?.[0]?.itemName || "توريد دفعة من الأصناف المطلوبة",
          quantity: Number(r.items?.[0]?.quantity || 1),
          unitPrice: Number(r.items?.[0]?.unitPrice || 0),
          totalPrice: Number(r.items?.[0]?.totalPrice || 0),
          unit: r.items?.[0]?.unit || "وحدة",
          notes: r.notes || "",
          createdAt: r.createdAt || new Date().toISOString(),
        }))
      ) || [];
    return dbReceipts;
  });

  const [activeReceiptId, setActiveReceiptId] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<SavedGoodsReceiptRecord | null>(null);
  const [addingReceipt, setAddingReceipt] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState(`إذن-إضافة-${Date.now().toString().slice(-4)}`);
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split("T")[0]);
  const [receiptItemName, setReceiptItemName] = useState("توريد دفعة من الأصناف المطلوبة");
  const [receiptQuantity, setReceiptQuantity] = useState("100");
  const [receiptUnitPrice, setReceiptUnitPrice] = useState("5000");
  const [receiptUnit, setReceiptUnit] = useState("وحدة");
  const [receiptNotes, setReceiptNotes] = useState("");
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [savingPrep, setSavingPrep] = useState(false);

  // Summary Metrics
  const totalCost = useMemo(() => {
    return supplyItems.reduce((acc, it) => acc + (it.quantity || 0) * (it.costPrice || 0), 0);
  }, [supplyItems]);

  const totalSupply = useMemo(() => {
    return supplyItems.reduce((acc, it) => acc + (it.quantity || 0) * (it.supplyPrice || 0), 0);
  }, [supplyItems]);

  const totalMargin = useMemo(() => totalSupply - totalCost, [totalSupply, totalCost]);
  const marginPercent = useMemo(
    () => (totalSupply > 0 ? ((totalMargin / totalSupply) * 100).toFixed(1) : "0"),
    [totalMargin, totalSupply]
  );

  const preparedCount = useMemo(
    () => supplyItems.filter((it) => it.prepStatus === "DELIVERED" || it.prepStatus === "SHIPPED").length,
    [supplyItems]
  );

  // Update item status
  const handleUpdateItemStatus = (id: string, field: "prepStatus" | "inspectionStatus", value: any) => {
    setSupplyItems(supplyItems.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  };

  // Save Supply Prep Data into op.notes and record as Card
  const handleSaveSupplyPrep = async () => {
    setSavingPrep(true);
    try {
      const recordId = activeBatchId || `batch-${Date.now()}`;
      const newRecord: SupplyBatchRecord = {
        id: recordId,
        batchNumber: `سجل توريد (${initialInspectionNumber})`,
        inspectionNumber: initialInspectionNumber,
        inspectionDate: initialInspectionDate,
        committeeMembers,
        inspectionResult,
        inspectionNotes,
        items: supplyItems,
        totalCost,
        totalSupply,
        totalMargin,
        createdAt: new Date().toISOString(),
      };

      const updatedBatches = activeBatchId
        ? supplyBatches.map((b) => (b.id === activeBatchId ? newRecord : b))
        : [newRecord, ...supplyBatches];

      setSupplyBatches(updatedBatches);

      const updatedNotes = {
        ...existingNotes,
        supplyPreparationData: {
          items: supplyItems,
          initialInspectionNumber,
          initialInspectionDate,
          committeeMembers,
          inspectionResult,
          inspectionNotes,
          totalCost,
          totalSupply,
          totalMargin,
          updatedAt: new Date().toISOString(),
        },
        supplyBatches: updatedBatches,
        supplyItemsPrepared: true,
      };

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(updatedNotes),
      });

      toast.success("تم حفظ حالة التوريد وتوثيق البطاقة بالسجلات بنجاح! 📦✨");
      setActiveBatchId(null);
      onRefresh();
    } catch (err: any) {
      toast.error("فشل حفظ حالة التوريد: " + (err?.message || ""));
    } finally {
      setSavingPrep(false);
    }
  };

  const handleEditBatch = (batch: SupplyBatchRecord) => {
    setActiveBatchId(batch.id);
    setSupplyItems(batch.items || []);
    setInitialInspectionNumber(batch.inspectionNumber);
    setInitialInspectionDate(batch.inspectionDate);
    setCommitteeMembers(batch.committeeMembers);
    setInspectionResult(batch.inspectionResult);
    setInspectionNotes(batch.inspectionNotes);
    toast.info(`تم تحميل بيانات "${batch.batchNumber}" في الجدول للتعديل ✏️`);
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm("هل أنت متأكد من حذف بطاقة سجل التوريد هذه؟")) return;
    try {
      const updatedBatches = supplyBatches.filter((b) => b.id !== batchId);
      setSupplyBatches(updatedBatches);
      const updatedNotes = {
        ...existingNotes,
        supplyBatches: updatedBatches,
      };
      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(updatedNotes),
      });
      toast.success("تم حذف بطاقة سجل التوريد بنجاح 🗑️");
      if (activeBatchId === batchId) {
        setActiveBatchId(null);
      }
      onRefresh();
    } catch {
      toast.error("فشل حذف بطاقة التوريد");
    }
  };

  // Save Goods Receipt to DB API and as structured Card
  const handleSaveReceipt = async () => {
    if (!receiptNumber.trim()) {
      toast.error("يرجى إدخال رقم إذن الإضافة");
      return;
    }
    const qty = Number(receiptQuantity) || 1;
    const price = Number(receiptUnitPrice) || 0;
    const total = qty * price;

    setSavingReceipt(true);
    try {
      const newRecord: SavedGoodsReceiptRecord = {
        id: activeReceiptId || `gr-${Date.now()}`,
        receiptNumber,
        receiptDate,
        itemName: receiptItemName,
        quantity: qty,
        unitPrice: price,
        totalPrice: total,
        unit: receiptUnit || "وحدة",
        notes: receiptNotes,
        createdAt: new Date().toISOString(),
      };

      let updatedList = [...goodsReceiptsList];
      if (activeReceiptId) {
        updatedList = updatedList.map((r) => (r.id === activeReceiptId ? newRecord : r));
      } else {
        updatedList.unshift(newRecord);
      }

      setGoodsReceiptsList(updatedList);

      const updatedNotes = {
        ...existingNotes,
        goodsReceiptsList: updatedList,
      };

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(updatedNotes),
      });

      try {
        await api.post(`/operations/${op.id}/supply-receipts`, {
          receiptNumber,
          receiptDate,
          notes: receiptNotes,
          items: [
            {
              itemName: receiptItemName,
              unit: receiptUnit || "وحدة",
              quantity: qty,
              unitPrice: price,
              totalPrice: total,
            },
          ],
        });
      } catch (err) {
        console.warn("Backend supply-receipts optional sync", err);
      }

      toast.success(
        activeReceiptId
          ? "تم تحديث بطاقة إذن الإضافة بنجاح! 📦✓"
          : "تم تسجيل وإصدار بطاقة إذن الإضافة بنجاح! 📦✓"
      );
      setAddingReceipt(false);
      setActiveReceiptId(null);
      setReceiptNumber(`إذن-إضافة-${Date.now().toString().slice(-4)}`);
      setReceiptNotes("");
      onRefresh();
    } catch {
      toast.error("فشل حفظ إذن الإضافة");
    } finally {
      setSavingReceipt(false);
    }
  };

  const handleEditReceipt = (r: SavedGoodsReceiptRecord) => {
    setActiveReceiptId(r.id);
    setReceiptNumber(r.receiptNumber);
    setReceiptDate(r.receiptDate);
    setReceiptItemName(r.itemName);
    setReceiptQuantity(r.quantity.toString());
    setReceiptUnitPrice(r.unitPrice.toString());
    setReceiptUnit(r.unit);
    setReceiptNotes(r.notes || "");
    setAddingReceipt(true);
    toast.info(`تم تحميل بيانات إذن الإضافة "${r.receiptNumber}" للتعديل ✏️`);
  };

  const handleDeleteReceipt = async (rId: string) => {
    if (!confirm("هل أنت متأكد من حذف بطاقة إذن الإضافة هذه؟")) return;
    try {
      const updatedList = goodsReceiptsList.filter((r) => r.id !== rId);
      setGoodsReceiptsList(updatedList);
      const updatedNotes = {
        ...existingNotes,
        goodsReceiptsList: updatedList,
      };
      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(updatedNotes),
      });
      toast.success("تم حذف بطاقة إذن الإضافة بنجاح 🗑️");
      onRefresh();
    } catch {
      toast.error("فشل حذف إذن الإضافة");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      {/* ━━━ SECTION 1: كروت المؤشرات المالية وهوامش الربح للأصناف ━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl glass-card border border-border shadow-sm space-y-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-bold">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            إجمالي التوريد (البت المالي)
          </span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono block">
            {formatCurrency(totalSupply)}
          </span>
          <span className="text-[10px] text-muted-foreground block">سعر التوريد المعتمد للجهة</span>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-border shadow-sm space-y-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-bold">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            إجمالي التكلفة (دراسة السوق)
          </span>
          <span className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono block">
            {formatCurrency(totalCost)}
          </span>
          <span className="text-[10px] text-muted-foreground block">عروض أسعار الموردين والمصانع</span>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-border shadow-sm space-y-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-bold">
            <Sparkles className="h-4 w-4 text-amber-600" />
            هامش الربح المتوقع
          </span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono block">
            {formatCurrency(totalMargin)}
          </span>
          <span className="text-[10px] text-amber-600 font-bold block">نسبة الربح: {marginPercent}%</span>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-border shadow-sm space-y-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-bold">
            <Boxes className="h-4 w-4 text-indigo-600" />
            حالة تجهيز الأصناف
          </span>
          <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono block">
            {preparedCount} من {supplyItems.length}
          </span>
          <span className="text-[10px] text-muted-foreground block">أصناف تم تجهيزها وشحنها</span>
        </div>
      </div>

      {/* ━━━ SECTION 2: جدول حصر وتجهيز الأصناف ومقارنة الأسعار ━━━ */}
      <SectionCard
        title="حالة التوريد والتجهيز الفعلي للأصناف وبيان مقارنة الأسعار"
        icon={Boxes}
        iconColor="text-blue-600"
        badge={
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs font-bold">
            {supplyItems.length} أصناف بالعملية
          </Badge>
        }
      >
        <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-foreground mb-1 leading-relaxed">
          <strong>الربط بين دراسة السوق والبت المالي:</strong> يوضح هذا البيان تكلفة كل صنف وفق عروض دراسة السوق المعتمدة مقارنة بسعر التوريد المتفق عليه في البت المالي لحساب الربحية ومتابعة مراحل التحضير والشحن والاستلام المبدئي.
        </div>

        <div className="overflow-x-auto border border-border rounded-2xl shadow-xs">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/60 text-muted-foreground font-bold border-b border-border">
              <tr>
                <th className="p-3 text-center w-12">#</th>
                <th className="p-3 min-w-[200px]">الصنف والمواصفات</th>
                <th className="p-3 w-20 text-center">الكمية</th>
                <th className="p-3 w-24 text-center">الوحدة</th>
                <th className="p-3 w-28 text-center text-blue-600 dark:text-blue-400">سعر دراسة السوق</th>
                <th className="p-3 w-28 text-center text-emerald-600 dark:text-emerald-400">سعر البت المالي</th>
                <th className="p-3 w-28 text-center text-amber-600 dark:text-amber-400">إجمالي الهامش</th>
                <th className="p-3 min-w-[200px] text-center">حالة التجهيز</th>
                <th className="p-3 min-w-[210px] text-center">الفحص المبدئي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {supplyItems.map((item, idx) => {
                const itemMargin = (item.supplyPrice - item.costPrice) * item.quantity;
                return (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-2.5 text-center font-mono font-bold text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="p-2.5">
                      <div className="font-bold text-foreground">{item.itemName}</div>
                      {item.notes && <div className="text-[11px] text-muted-foreground mt-0.5">{item.notes}</div>}
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold">
                      {item.quantity}
                    </td>
                    <td className="p-2.5 text-center text-muted-foreground font-semibold">
                      {item.unit}
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(item.costPrice)}
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(item.supplyPrice)}
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                      {formatCurrency(itemMargin)}
                    </td>
                    <td className="p-2.5 text-center min-w-[200px]">
                      <Select
                        value={item.prepStatus}
                        onValueChange={(val: any) => handleUpdateItemStatus(item.id, "prepStatus", val)}
                      >
                        <SelectTrigger className="h-9 w-full text-xs font-bold rounded-xl bg-background border-border shadow-2xs px-3">
                          <SelectValue>
                            {item.prepStatus === "PENDING"
                              ? "1. قيد الحظر والتجهيز"
                              : item.prepStatus === "PREPARING"
                              ? "2. جاري التصنيع 🏭"
                              : item.prepStatus === "SHIPPED"
                              ? "3. جاري الشحن 🚚"
                              : item.prepStatus === "DELIVERED"
                              ? "4. تم التوريد بالمخزن ✓"
                              : item.prepStatus}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="text-xs font-medium">
                          <SelectItem value="PENDING">1. قيد الحظر والتجهيز</SelectItem>
                          <SelectItem value="PREPARING">2. جاري التصنيع 🏭</SelectItem>
                          <SelectItem value="SHIPPED">3. جاري الشحن 🚚</SelectItem>
                          <SelectItem value="DELIVERED">4. تم التوريد بالمخزن ✓</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2.5 text-center min-w-[210px]">
                      <Select
                        value={item.inspectionStatus}
                        onValueChange={(val: any) => handleUpdateItemStatus(item.id, "inspectionStatus", val)}
                      >
                        <SelectTrigger className="h-9 w-full text-xs font-bold rounded-xl bg-background border-border shadow-2xs px-3">
                          <SelectValue>
                            {item.inspectionStatus === "MATCHED"
                              ? "مطابق للمواصفات ✓"
                              : item.inspectionStatus === "CONDITIONAL"
                              ? "ملاحظات قيد الاستيفاء ⚠️"
                              : item.inspectionStatus === "REJECTED"
                              ? "مرفوض للاستبدال ✕"
                              : item.inspectionStatus}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="text-xs font-medium">
                          <SelectItem value="MATCHED">مطابق للمواصفات ✓</SelectItem>
                          <SelectItem value="CONDITIONAL">ملاحظات قيد الاستيفاء ⚠️</SelectItem>
                          <SelectItem value="REJECTED">مرفوض للاستبدال ✕</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 3: محضر الفحص والاستلام المبدئي ━━━ */}
      <SectionCard
        title={activeBatchId ? "تعديل محضر الفحص والاستلام المبدئي للشحنات" : "محضر الفحص الظاهري والاستلام المبدئي للشحنات"}
        icon={ClipboardCheck}
        iconColor="text-emerald-600"
        badge={
          activeBatchId ? (
            <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-bold">
              وضع التعديل النشط ✏️
            </Badge>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">رقم محضر الفحص المبدئي *</Label>
            <Input
              value={initialInspectionNumber}
              onChange={(e) => setInitialInspectionNumber(e.target.value)}
              className="h-9.5 text-xs font-mono font-bold rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">تاريخ الفحص والاستلام المبدئي *</Label>
            <Input
              type="date"
              value={initialInspectionDate}
              onChange={(e) => setInitialInspectionDate(e.target.value)}
              className="h-9.5 text-xs font-medium rounded-xl"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-bold">أعضاء لجنة الفحص والاستلام بالجهة *</Label>
            <Input
              value={committeeMembers}
              onChange={(e) => setCommitteeMembers(e.target.value)}
              className="h-9.5 text-xs font-medium rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">قرار لجنة الفحص *</Label>
            <Select
              value={inspectionResult}
              onValueChange={(val: any) => setInspectionResult(val)}
            >
              <SelectTrigger className="h-9.5 text-xs font-bold rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs font-medium">
                <SelectItem value="PASSED">مقبول ومطابق للمواصفات بنسبة 100% ✓</SelectItem>
                <SelectItem value="NOTES">مقبول مع استيفاء بعض الملاحظات البسيطة ⚠️</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-bold">بيان وملاحظات لجنة الفحص</Label>
            <Input
              value={inspectionNotes}
              onChange={(e) => setInspectionNotes(e.target.value)}
              className="h-9.5 text-xs rounded-xl"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border flex-wrap gap-2">
          {activeBatchId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveBatchId(null)}
              className="text-xs font-bold rounded-xl h-9"
            >
              إلغاء وضع التعديل
            </Button>
          ) : <div />}

          <Button
            size="lg"
            onClick={handleSaveSupplyPrep}
            disabled={savingPrep}
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-700 text-white font-black text-xs sm:text-sm px-6 h-11 rounded-2xl shadow-lg cursor-pointer"
          >
            {savingPrep ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                <span>جاري حفظ حالة التوريد...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4 ml-2" />
                <span>{activeBatchId ? "تحديث بطاقة حالة التوريد 💾" : "حفظ حالة التوريد وإصدار بطاقة السجل 💾"}</span>
              </>
            )}
          </Button>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 4: بطاقات سجلات التوريد والفحص المعتمدة (Cards) ━━━ */}
      <SectionCard
        title="بطاقات سجلات التوريد والفحص المعتمدة"
        icon={ClipboardCheck}
        iconColor="text-emerald-600"
        badge={
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold">
            {supplyBatches.length} بطاقة مسجلة
          </Badge>
        }
      >
        {supplyBatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {supplyBatches.map((batch, index) => (
              <div
                key={batch.id || index}
                className="p-4 rounded-3xl border-2 border-border/80 hover:border-emerald-500/50 bg-card hover:bg-muted/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {batch.inspectionNumber}
                        </h4>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {formatDate(batch.inspectionDate)}
                        </span>
                      </div>
                    </div>

                    <Badge
                      className={
                        batch.inspectionResult === "PASSED"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold"
                      }
                    >
                      {batch.inspectionResult === "PASSED" ? "مطابق 100% ✓" : "بملاحظات ⚠️"}
                    </Badge>
                  </div>

                  <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">عدد الأصناف:</span>
                      <span className="font-bold text-foreground">{(batch.items || []).length} أصناف</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">إجمالي التوريد:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatCurrency(batch.totalSupply || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">صافي الهامش المتوقع:</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {formatCurrency(batch.totalMargin || 0)}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    <strong>اللجنة:</strong> {batch.committeeMembers}
                  </p>
                </div>

                {/* Card Action Tools */}
                <div className="pt-2 border-t border-border/70 flex items-center justify-between gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewingBatch(batch)}
                    className="h-8 px-3 text-xs font-bold rounded-xl border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="عرض تفاصيل محضر الفحص والأصناف"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>عرض التفاصيل</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditBatch(batch)}
                      className="h-8 w-8 p-0 rounded-xl hover:bg-muted text-muted-foreground hover:text-blue-600 cursor-pointer"
                      title="تعديل هذا السجل"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteBatch(batch.id)}
                      className="h-8 w-8 p-0 rounded-xl hover:bg-rose-500/15 text-muted-foreground hover:text-rose-600 cursor-pointer"
                      title="حذف هذا السجل"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Package}
            text="لم يتم توثيق أي بطاقة سجل توريد بعد"
            subtext="عند الضغط على (حفظ حالة التوريد) بالأعلى سيتم حفظ السجل هنا كبطاقة معتمدة مع أدوات العرض والتعديل والحذف."
          />
        )}
      </SectionCard>

      {/* ━━━ SECTION 5: أذون الإضافة المخزنية (Goods Receipts) ━━━ */}
      <SectionCard
        title="أذون الإضافة المخزنية وحركة المخازن"
        icon={Truck}
        iconColor="text-indigo-600"
        badge={<Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-[10px] font-bold">{goodsReceiptsList.length} إذن إضافة</Badge>}
        actions={
          <Button
            size="sm"
            onClick={() => setAddingReceipt(!addingReceipt)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 rounded-xl cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 ml-1" />
            <span>تسجيل إذن إضافة جديد</span>
          </Button>
        }
      >
        {addingReceipt && (
          <div className="p-4 rounded-xl bg-card border border-indigo-500/30 space-y-3 animate-fade-in shadow-lg">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-600" />
              {activeReceiptId ? "تعديل بيانات إذن إضافة التوريد للمخازن" : "بيانات إذن إضافة التوريد للمخازن"}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">رقم إذن الإضافة / الفاتورة</Label>
                <Input
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  className="h-10 text-sm font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">تاريخ الاستلام الفعلي بالمخزن</Label>
                <Input
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">الصنف المستلم</Label>
                <Input
                  value={receiptItemName}
                  onChange={(e) => setReceiptItemName(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">الكمية المستلمة</Label>
                <Input
                  type="number"
                  value={receiptQuantity}
                  onChange={(e) => setReceiptQuantity(e.target.value)}
                  className="h-10 text-sm font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">سعر الوحدة</Label>
                <Input
                  type="number"
                  value={receiptUnitPrice}
                  onChange={(e) => setReceiptUnitPrice(e.target.value)}
                  className="h-10 text-sm font-mono"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ملاحظات أمين المخزن ولجنة الفحص</Label>
              <Input
                value={receiptNotes}
                onChange={(e) => setReceiptNotes(e.target.value)}
                placeholder="مثلاً: تم الفحص الفني والمطابقة بنسبة 100%"
                className="h-10 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAddingReceipt(false);
                  setActiveReceiptId(null);
                }}
                className="rounded-xl"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={handleSaveReceipt}
                disabled={savingReceipt}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer"
              >
                {savingReceipt ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-1" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <span>{activeReceiptId ? "تحديث إذن الإضافة 💾" : "حفظ إذن الإضافة 💾"}</span>
                )}
              </Button>
            </div>
          </div>
        )}

        {goodsReceiptsList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goodsReceiptsList.map((r, index) => (
              <div
                key={r.id || index}
                className="p-4 rounded-3xl border-2 border-border/80 hover:border-indigo-500/50 bg-card hover:bg-muted/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {r.receiptNumber}
                        </h4>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {formatDate(r.receiptDate)}
                        </span>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                      تم الاستلام بالمخزن ✓
                    </Badge>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-muted/40 border border-border text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-[11px]">الصنف:</span>
                      <strong className="text-foreground truncate max-w-[150px]">{r.itemName}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-[11px]">الكمية المستلمة:</span>
                      <strong className="font-mono text-foreground font-bold">{r.quantity} {r.unit}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-[11px]">إجمالي القيمة:</span>
                      <strong className="font-mono text-indigo-600 dark:text-indigo-400 font-black">{formatCurrency(r.totalPrice)}</strong>
                    </div>
                    {r.notes && (
                      <div className="text-[10px] text-muted-foreground truncate pt-0.5 border-t border-border/40">
                        {r.notes}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewingReceipt(r)}
                    className="h-8 px-2.5 text-xs font-bold rounded-xl border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-1 cursor-pointer"
                    title="معاينة تفاصيل إذن الإضافة"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>عرض التفاصيل</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditReceipt(r)}
                    className="h-8 px-2 text-xs font-bold rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                    title="تعديل هذا الإذن"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteReceipt(r.id)}
                    className="h-8 px-2 text-xs font-bold rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    title="حذف هذا الإذن"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !addingReceipt && (
            <EmptyState
              icon={Package}
              text="لم يتم تسجيل أذون إضافة حتى الآن"
              subtext="سجّل كل إذن توريد لتوثيق التسليمات والمتبقي ومتابعة المستخلصات"
            />
          )
        )}
      </SectionCard>

      {/* ━━━ MODAL: عرض تفاصيل بطاقة سجل التوريد المعتمدة ━━━ */}
      {viewingBatch && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in">
            <div className="bg-card border border-border rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden text-foreground">
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-border gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
                    <ClipboardCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-foreground text-base sm:text-lg">
                      {viewingBatch.batchNumber}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      تاريخ الفحص: {formatDate(viewingBatch.inspectionDate)} • النتيجة:{" "}
                      {viewingBatch.inspectionResult === "PASSED" ? "مطابق ومقبول 100% ✓" : "مقبول بملاحظات ⚠️"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setViewingBatch(null)}
                    className="h-8.5 w-8.5 rounded-full hover:bg-muted cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 text-xs">
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">أعضاء لجنة الفحص والاستلام:</span>
                      <strong className="text-foreground text-xs">{viewingBatch.committeeMembers}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">ملاحظات الفحص الظاهري:</span>
                      <strong className="text-foreground text-xs">{viewingBatch.inspectionNotes}</strong>
                    </div>
                  </div>
                </div>

                <div className="border border-border rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-muted/70 text-muted-foreground font-bold border-b border-border">
                      <tr>
                        <th className="p-2.5 text-center w-12">#</th>
                        <th className="p-2.5">بيان الصنف</th>
                        <th className="p-2.5 text-center">الكمية</th>
                        <th className="p-2.5 text-center">الوحدة</th>
                        <th className="p-2.5 text-center text-blue-600">سعر التكلفة</th>
                        <th className="p-2.5 text-center text-emerald-600">سعر التوريد</th>
                        <th className="p-2.5 text-center text-amber-600">الهامش</th>
                        <th className="p-2.5 text-center">حالة التجهيز</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {(viewingBatch.items || []).map((it, i) => (
                        <tr key={it.id || i} className="hover:bg-muted/20">
                          <td className="p-2.5 text-center font-mono font-bold text-muted-foreground">{i + 1}</td>
                          <td className="p-2.5 font-bold text-foreground">{it.itemName}</td>
                          <td className="p-2.5 text-center font-mono font-bold">{it.quantity}</td>
                          <td className="p-2.5 text-center text-muted-foreground">{it.unit}</td>
                          <td className="p-2.5 text-center font-mono text-blue-600 font-bold">{formatCurrency(it.costPrice)}</td>
                          <td className="p-2.5 text-center font-mono text-emerald-600 font-bold">{formatCurrency(it.supplyPrice)}</td>
                          <td className="p-2.5 text-center font-mono text-amber-600 font-bold">{formatCurrency((it.supplyPrice - it.costPrice) * it.quantity)}</td>
                          <td className="p-2.5 text-center">
                            <Badge variant="outline" className="text-[10px] font-bold">
                              {it.prepStatus === "DELIVERED"
                                ? "تم التوريد بالمخزن ✓"
                                : it.prepStatus === "SHIPPED"
                                ? "جاري الشحن 🚚"
                                : it.prepStatus === "PREPARING"
                                ? "جاري التصنيع 🏭"
                                : "قيد التجهيز"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/50 font-bold border-t border-border">
                      <tr>
                        <td colSpan={4} className="p-3 text-left">الإجماليات:</td>
                        <td className="p-3 text-center font-mono text-blue-600 font-black">{formatCurrency(viewingBatch.totalCost)}</td>
                        <td className="p-3 text-center font-mono text-emerald-600 font-black">{formatCurrency(viewingBatch.totalSupply)}</td>
                        <td className="p-3 text-center font-mono text-amber-600 font-black">{formatCurrency(viewingBatch.totalMargin)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-border flex justify-end">
                <Button
                  size="sm"
                  onClick={() => setViewingBatch(null)}
                  className="rounded-xl font-bold px-5 cursor-pointer"
                >
                  إغلاق النافذة
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ━━━ MODAL: عرض تفاصيل إذن الإضافة المعتمد ━━━ */}
      {viewingReceipt && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in">
            <div className="bg-card border border-border rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden text-foreground">
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-border gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold shrink-0">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-foreground">
                      إذن إضافة مخزني رقم ({viewingReceipt.receiptNumber})
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      تاريخ الاستلام: {formatDate(viewingReceipt.receiptDate)} • الحالة: تم الاستلام المعتمد بالمخزن ✓
                    </p>
                  </div>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setViewingReceipt(null)}
                  className="h-8.5 w-8.5 rounded-full hover:bg-muted cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 text-xs">
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">الصنف المستلم:</span>
                      <strong className="text-foreground text-xs">{viewingReceipt.itemName}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">ملاحظات أمين المخزن:</span>
                      <strong className="text-foreground text-xs">{viewingReceipt.notes || "تم الفحص الفني والمطابقة بنسبة 100%"}</strong>
                    </div>
                  </div>
                </div>

                <div className="border border-border rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-muted/70 text-muted-foreground font-bold border-b border-border">
                      <tr>
                        <th className="p-2.5">بيان الصنف</th>
                        <th className="p-2.5 text-center">الكمية</th>
                        <th className="p-2.5 text-center">الوحدة</th>
                        <th className="p-2.5 text-center">سعر الوحدة</th>
                        <th className="p-2.5 text-center text-indigo-600">إجمالي القيمة</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-muted/20">
                        <td className="p-2.5 font-bold text-foreground">{viewingReceipt.itemName}</td>
                        <td className="p-2.5 text-center font-mono font-bold">{viewingReceipt.quantity}</td>
                        <td className="p-2.5 text-center text-muted-foreground">{viewingReceipt.unit}</td>
                        <td className="p-2.5 text-center font-mono font-bold">{formatCurrency(viewingReceipt.unitPrice)}</td>
                        <td className="p-2.5 text-center font-mono text-indigo-600 font-bold">{formatCurrency(viewingReceipt.totalPrice)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 text-xs font-bold text-foreground">
                  التفقيط المعتمد: {tafqeetArabic(viewingReceipt.totalPrice)}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-border flex justify-end">
                <Button
                  size="sm"
                  onClick={() => setViewingReceipt(null)}
                  className="rounded-xl font-bold px-5 cursor-pointer"
                >
                  إغلاق النافذة
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Continuity Action Footer */}
      <StepFooterNav currentTabId="supply" onNavigate={onNavigate} />
    </div>
  );
}
