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
import { toast } from "sonner";
import api from "@/lib/api";
import {
  Operation,
  SectionCard,
  DataRow,
  EmptyState,
  formatCurrency,
  formatDate,
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
        // match with market study quote if available
        const matchedMarket = marketQuotes.find(
          (mq: any) => mq.itemName?.trim().toLowerCase() === fi.itemName?.trim().toLowerCase()
        );
        const costPrice = matchedMarket ? Number(matchedMarket.unitPrice) : Math.round(Number(fi.unitPrice) * 0.75);
        return {
          id: fi.id || String(idx + 1),
          itemCode: `ITM-0${idx + 1}`,
          itemName: fi.itemName || "صنف توريد",
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
        itemCode: "ITM-01",
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
    () => supplyData.initialInspectionNumber || `INSP-INIT-${op.serialNumber || "1"}`
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

  // Goods Receipts (Existing DB entity)
  const [addingReceipt, setAddingReceipt] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState(`REC-${Date.now().toString().slice(-4)}`);
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split("T")[0]);
  const [receiptItemName, setReceiptItemName] = useState("توريد دفعة من الأصناف المطلوبة");
  const [receiptQuantity, setReceiptQuantity] = useState("100");
  const [receiptUnitPrice, setReceiptUnitPrice] = useState("5000");
  const [receiptUnit, setReceiptUnit] = useState("وحدة");
  const [receiptNotes, setReceiptNotes] = useState("");
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [savingPrep, setSavingPrep] = useState(false);

  const allReceipts =
    op.supplyOrders?.flatMap((so: any) =>
      (so.goodsReceipts || []).map((r: any) => ({ ...r, orderNumber: so.orderNumber }))
    ) || [];

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

  // Save Supply Prep Data into op.notes
  const handleSaveSupplyPrep = async () => {
    setSavingPrep(true);
    try {
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
        supplyItemsPrepared: true,
      };

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(updatedNotes),
      });

      toast.success("تم حفظ حالة التوريد وتجهيز الأصناف بنجاح! 📦✨");
      onRefresh();
    } catch (err: any) {
      toast.error("فشل حفظ حالة التوريد: " + (err?.message || ""));
    } finally {
      setSavingPrep(false);
    }
  };

  // Save Goods Receipt to DB API
  const handleSaveReceipt = async () => {
    setSavingReceipt(true);
    try {
      await api.post(`/operations/${op.id}/supply-receipts`, {
        receiptNumber,
        receiptDate,
        notes: receiptNotes,
        items: [
          {
            itemName: receiptItemName,
            unit: receiptUnit,
            quantity: Number(receiptQuantity),
            unitPrice: Number(receiptUnitPrice),
            totalPrice: Number(receiptQuantity) * Number(receiptUnitPrice),
          },
        ],
      });
      toast.success("تم تسجيل إذن الإضافة والتوريد بنجاح بالمخازن 📦");
      setAddingReceipt(false);
      onRefresh();
    } catch {
      toast.error("فشل تسجيل إذن الإضافة");
    } finally {
      setSavingReceipt(false);
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
                <th className="p-3 w-36 text-center">حالة التجهيز</th>
                <th className="p-3 w-36 text-center">الفحص المبدئي</th>
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
                    <td className="p-2.5 text-center">
                      <Select
                        value={item.prepStatus}
                        onValueChange={(val: any) => handleUpdateItemStatus(item.id, "prepStatus", val)}
                      >
                        <SelectTrigger className="h-8 text-[11px] font-bold rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="text-xs font-medium">
                          <SelectItem value="PENDING">1. قيد الحظر والتجهيز</SelectItem>
                          <SelectItem value="PREPARING">2. جاري التصنيع 🏭</SelectItem>
                          <SelectItem value="SHIPPED">3. جاري الشحن 🚚</SelectItem>
                          <SelectItem value="DELIVERED">4. تم التوريد بالمخزن ✓</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2.5 text-center">
                      <Select
                        value={item.inspectionStatus}
                        onValueChange={(val: any) => handleUpdateItemStatus(item.id, "inspectionStatus", val)}
                      >
                        <SelectTrigger className="h-8 text-[11px] font-bold rounded-lg">
                          <SelectValue />
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
        title="محضر الفحص الظاهري والاستلام المبدئي للشحنات"
        icon={ClipboardCheck}
        iconColor="text-emerald-600"
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

        <div className="flex justify-end pt-3 border-t border-border">
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
                <span>حفظ حالة التوريد ومحضر الفحص المبدئي 💾</span>
              </>
            )}
          </Button>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 4: أذون الإضافة المخزنية (Goods Receipts) ━━━ */}
      <SectionCard
        title="أذون الإضافة المخزنية وحركة المخازن"
        icon={Truck}
        iconColor="text-indigo-600"
        badge={<Badge className="badge-blue text-[10px] font-bold">{allReceipts.length} إذن إضافة</Badge>}
        actions={
          <Button
            size="sm"
            onClick={() => setAddingReceipt(!addingReceipt)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 rounded-xl cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 ml-1" />
            <span>تسجيل إذن إضافة جديد</span>
          </Button>
        }
      >
        {addingReceipt && (
          <div className="p-4 rounded-xl bg-card border border-blue-500/30 space-y-3 animate-fade-in shadow-lg">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              بيانات إذن إضافة التوريد للمخازن
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
                onClick={() => setAddingReceipt(false)}
                className="rounded-xl"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={handleSaveReceipt}
                disabled={savingReceipt}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
              >
                {savingReceipt ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ إذن الإضافة"}
              </Button>
            </div>
          </div>
        )}

        {allReceipts.length > 0 ? (
          <div className="space-y-3">
            {allReceipts.map((r: any) => (
              <div key={r.id} className="p-4 rounded-xl bg-card border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">إذن إضافة رقم {r.receiptNumber}</span>
                  <Badge className="badge-blue text-[10px]">أمر توريد {r.orderNumber}</Badge>
                </div>
                <DataRow label="تاريخ الاستلام" value={formatDate(r.receiptDate)} />
                {r.items?.length > 0 && (
                  <div className="text-xs space-y-1 pt-1">
                    {r.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex justify-between bg-muted/30 p-2.5 rounded-lg border border-border/40"
                      >
                        <span className="text-foreground font-semibold">
                          {item.itemName} — {Number(item.quantity)} {item.unit}
                        </span>
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(Number(item.totalPrice))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
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

      {/* Continuity Action Footer */}
      <StepFooterNav currentTabId="supply" onNavigate={onNavigate} />
    </div>
  );
}
