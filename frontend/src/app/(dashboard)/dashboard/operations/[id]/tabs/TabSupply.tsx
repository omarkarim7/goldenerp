"use client";

import React, { useState } from "react";
import { Truck, Package, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function TabSupply({
  op,
  onRefresh,
  onNavigate,
}: {
  op: Operation;
  onRefresh: () => void;
  onNavigate?: (tabId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState(`REC-${Date.now().toString().slice(-4)}`);
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split("T")[0]);
  const [itemName, setItemName] = useState("توريد دفعة من الأصناف المطلوبة");
  const [quantity, setQuantity] = useState("100");
  const [unitPrice, setUnitPrice] = useState("5000");
  const [unit, setUnit] = useState("وحدة");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const allReceipts = op.supplyOrders?.flatMap((so: any) => (so.goodsReceipts || []).map((r: any) => ({ ...r, orderNumber: so.orderNumber }))) || [];

  const handleSaveReceipt = async () => {
    setSaving(true);
    try {
      await api.post(`/operations/${op.id}/supply-receipts`, {
        receiptNumber,
        receiptDate,
        notes,
        items: [{
          itemName,
          unit,
          quantity: Number(quantity),
          unitPrice: Number(unitPrice),
          totalPrice: Number(quantity) * Number(unitPrice),
        }],
      });
      toast.success("تم تسجيل إذن الإضافة والتوريد بنجاح 📦");
      setAdding(false);
      onRefresh();
    } catch {
      toast.error("فشل تسجيل إذن الإضافة");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionCard
        title="التوريد والتسليم وأذون الإضافة المخزنية"
        icon={Truck}
        iconColor="text-blue-600"
        badge={<Badge className="badge-blue text-[10px] font-bold">{allReceipts.length} إذن إضافة</Badge>}
        actions={
          <Button
            size="sm"
            onClick={() => setAdding(!adding)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 rounded-xl cursor-pointer"
          >
            <Truck className="h-3.5 w-3.5 ml-1" />
            <span>تسجيل إذن إضافة جديد</span>
          </Button>
        }
      >
        <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-foreground mb-2">
          <strong>الربط بالمخازن:</strong> كل عملية توريد تُسجل كإذن إضافة رقمي يحدد الكميات المستلمة فعلياً بمخازن العميل، وتؤثر في حركة المخزون وحساب نسبة إنجاز أمر التوريد.
        </div>

        {adding && (
          <div className="p-4 rounded-xl bg-card border border-blue-500/30 space-y-3 animate-fade-in shadow-lg">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              بيانات إذن إضافة التوريد
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">رقم إذن الإضافة / الفاتورة</Label>
                <Input value={receiptNumber} onChange={e => setReceiptNumber(e.target.value)} className="h-10 text-sm font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">تاريخ الاستلام الفعلي</Label>
                <Input type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} className="h-10 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">الصنف المستلم</Label>
                <Input value={itemName} onChange={e => setItemName(e.target.value)} className="h-10 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">الكمية المستلمة</Label>
                <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="h-10 text-sm font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">سعر الوحدة</Label>
                <Input type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} className="h-10 text-sm font-mono" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ملاحظات لجنة الفحص والاستلام</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="مثلاً: تم الفحص الفني والمطابقة بنسبة 100%" className="h-10 text-sm" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setAdding(false)} className="rounded-xl">إلغاء</Button>
              <Button size="sm" onClick={handleSaveReceipt} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ إذن الإضافة"}
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
                  <Badge className="badge-blue text-[10px]">أمر {r.orderNumber}</Badge>
                </div>
                <DataRow label="تاريخ الاستلام" value={formatDate(r.receiptDate)} />
                {r.items?.length > 0 && (
                  <div className="text-xs space-y-1 pt-1">
                    {r.items.map((item: any) => (
                      <div key={item.id} className="flex justify-between bg-muted/30 p-2.5 rounded-lg border border-border/40">
                        <span className="text-foreground font-semibold">{item.itemName} — {Number(item.quantity)} {item.unit}</span>
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{formatCurrency(Number(item.totalPrice))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : !adding && (
          <EmptyState icon={Package} text="لم يتم تسجيل أذون إضافة حتى الآن" subtext="سجّل كل إذن توريد لتوثيق التسليمات والمتبقي ومتابعة المستخلصات" />
        )}
      </SectionCard>

      {/* Continuity Action Footer (التسجيل 1 & 2) */}
      <StepFooterNav
        currentTabId="supply"
        onNavigate={onNavigate}
      />
    </div>
  );
}
