"use client";

import React, { useState } from "react";
import { BarChart3, Edit, Loader2 } from "lucide-react";
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
} from "./types";
import { StepFooterNav } from "./StepFooterNav";

export function TabFinance({
  op,
  onRefresh,
  onNavigate,
}: {
  op: Operation;
  onRefresh: () => void;
  onNavigate?: (tabId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const fin = op.operationFinance;
  const [revenue, setRevenue] = useState(fin?.totalRevenue?.toString() || "850000");
  const [cost, setCost] = useState(fin?.totalCost?.toString() || "620000");
  const [notes, setNotes] = useState(fin?.notes || "");
  const [saving, setSaving] = useState(false);

  const profit = Number(revenue) - Number(cost);
  const margin = Number(revenue) > 0 ? Math.round((profit / Number(revenue)) * 100) : 0;

  const handleSaveFinance = async () => {
    setSaving(true);
    try {
      await api.post(`/operations/${op.id}/finance`, {
        totalRevenue: Number(revenue),
        totalCost: Number(cost),
        netProfit: profit,
        notes,
      });
      toast.success("تم تحديث وحفظ الحساب المالي وصافي الربح 📊");
      setEditing(false);
      onRefresh();
    } catch {
      toast.error("فشل حفظ البيانات المالية");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionCard
        title="حساب التكلفة الفعلية وصافي الربح"
        icon={BarChart3}
        iconColor="text-emerald-600"
        actions={
          <Button
            size="sm"
            onClick={() => setEditing(!editing)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 rounded-xl cursor-pointer"
          >
            <Edit className="h-3.5 w-3.5 ml-1" />
            <span>{fin ? "تعديل الحسابات" : "تسجيل المالية"}</span>
          </Button>
        }
      >
        {editing && (
          <div className="p-4 rounded-xl bg-card border border-emerald-500/30 space-y-3 animate-fade-in shadow-lg mb-3">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              <span>تسجيل الإيرادات والتكاليف الفعلية</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">إجمالي الإيرادات (قيمة العقد / المستخلصات)</Label>
                <Input type="number" value={revenue} onChange={e => setRevenue(e.target.value)} className="h-10 text-sm font-mono font-bold" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">إجمالي التكاليف الفعلية (المشتريات والمصروفات)</Label>
                <Input type="number" value={cost} onChange={e => setCost(e.target.value)} className="h-10 text-sm font-mono font-bold text-rose-600" />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 text-xs flex justify-between items-center font-bold">
              <span>صافي الربح المتوقع:</span>
              <span className={`text-base font-mono ${profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {formatCurrency(profit)} (هامش ربح {margin}%)
              </span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ملاحظات مالية</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="تفاصيل تسوية التكاليف..." className="h-10 text-sm" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="rounded-xl">إلغاء</Button>
              <Button size="sm" onClick={handleSaveFinance} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ التحليل المالي"}
              </Button>
            </div>
          </div>
        )}

        {fin ? (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-blue-500/5 to-transparent border border-emerald-500/20 space-y-4">
            <DataRow label="إجمالي الإيرادات التعاقدية (Revenue)" value={<span className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono">{formatCurrency(Number(fin.totalRevenue))}</span>} />
            <DataRow label="إجمالي التكاليف والمشتريات (Cost)" value={<span className="text-xl font-black text-rose-600 font-mono">- {formatCurrency(Number(fin.totalCost))}</span>} />
            <div className="flex justify-between items-center pt-3 border-t border-emerald-500/20">
              <div>
                <span className="text-base font-black text-foreground block">صافي الربح الفعلي (Net Profit)</span>
                <span className="text-xs text-muted-foreground font-semibold">هامش الربح: {Math.round((Number(fin.netProfit) / Number(fin.totalRevenue || 1)) * 100)}%</span>
              </div>
              <span className={`text-2xl sm:text-3xl font-black font-mono ${Number(fin.netProfit) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
                {formatCurrency(Number(fin.netProfit))}
              </span>
            </div>
            {fin.isClosed && <Badge className="badge-emerald">تم إغلاق الملف المالي للعملية نهائياً ✓</Badge>}
          </div>
        ) : !editing && (
          <EmptyState icon={BarChart3} text="لم يتم تسجيل الحسابات المالية وصافي الربح بعد" subtext="اضغط على زر تسجيل المالية لإدخال الإيرادات والتكاليف واحتساب صافي الأرباح" />
        )}
      </SectionCard>

      {/* Continuity Action Footer (التسجيل 1 & 2) */}
      <StepFooterNav
        currentTabId="finance"
        onNavigate={onNavigate}
      />
    </div>
  );
}
