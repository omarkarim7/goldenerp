"use client";

import React, { useState } from "react";
import { Calculator, Plus, Loader2 } from "lucide-react";
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

export function TabCertificates({
  op,
  onRefresh,
  onNavigate,
}: {
  op: Operation;
  onRefresh: () => void;
  onNavigate?: (tabId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [certificateNo, setCertificateNo] = useState((op.certificates?.length || 0) + 1);
  const [grossAmount, setGrossAmount] = useState("500000");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const gross = Number(grossAmount) || 0;
  const tax = Math.round(gross * 0.01 * 100) / 100; // 1% أ.ت.ص
  const vat = Math.round(gross * 0.14 * 100) / 100; // 14% ضريبة
  const bond = Math.round(gross * 0.05 * 100) / 100; // 5% ضمان أعمال
  const net = Math.round((gross - tax - vat - bond) * 100) / 100;

  const handleSaveCertificate = async () => {
    setSaving(true);
    try {
      await api.post(`/operations/${op.id}/certificates`, {
        certificateNo: Number(certificateNo),
        grossAmount: gross,
        taxDeduction: tax,
        vatAmount: vat,
        performanceBond: bond,
        netAmount: net,
        notes,
      });
      toast.success("تم تسجيل المستخلص وحساب الاستقطاعات تلقائياً 🧾");
      setAdding(false);
      onRefresh();
    } catch {
      toast.error("فشل تسجيل المستخلص");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionCard
        title="المستخلصات والشهادات المالية"
        icon={Calculator}
        iconColor="text-teal-600"
        badge={<Badge className="badge-teal text-[10px] font-bold">{op.certificates?.length || 0} مستخلص</Badge>}
        actions={
          <Button
            size="sm"
            onClick={() => setAdding(!adding)}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-8 rounded-xl cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 ml-1" />
            <span>تسجيل مستخلص جديد</span>
          </Button>
        }
      >
        <div className="p-3.5 rounded-xl bg-teal-500/5 border border-teal-500/20 text-xs text-foreground mb-2">
          <strong>حساب الاستقطاعات القانونية:</strong> يحسب النظام أوتوماتيكياً: خصم 1% أ.ت.ص + 14% ضريبة القيمة المضافة + 5% ضمان أعمال، ويحدد صافي المبلغ المستحق للصرف.
        </div>

        {adding && (
          <div className="p-4 rounded-xl bg-card border border-teal-500/30 space-y-3 animate-fade-in shadow-lg">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calculator className="h-4 w-4 text-teal-600" />
              <span>تحرير مستخلص مالي</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">رقم المستخلص</Label>
                <Input type="number" value={certificateNo} onChange={e => setCertificateNo(Number(e.target.value))} className="h-10 text-sm font-mono font-bold" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">إجمالي قيمة المستخلص (Gross Amount)</Label>
                <Input type="number" value={grossAmount} onChange={e => setGrossAmount(e.target.value)} className="h-10 text-sm font-mono font-bold" />
              </div>
            </div>

            {/* Live Deductions Box */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1.5 text-xs">
              <DataRow label="إجمالي المستخلص" value={formatCurrency(gross)} mono />
              <DataRow label="ضريبة أ.ت.ص (1%)" value={<span className="text-rose-600 font-mono">- {formatCurrency(tax)}</span>} />
              <DataRow label="ضريبة القيمة المضافة (14%)" value={<span className="text-rose-600 font-mono">- {formatCurrency(vat)}</span>} />
              <DataRow label="ضمان أعمال محتجز (5%)" value={<span className="text-rose-600 font-mono">- {formatCurrency(bond)}</span>} />
              <div className="flex justify-between items-center pt-2 border-t border-border font-bold">
                <span className="text-foreground">صافي المستحق للصرف (Net Amount)</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(net)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">ملاحظات المستخلص</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="مثلاً: مستخلص جاري رقم 1 عن توريدات شهر أكتوبر" className="h-10 text-sm" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setAdding(false)} className="rounded-xl">إلغاء</Button>
              <Button size="sm" onClick={handleSaveCertificate} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ المستخلص"}
              </Button>
            </div>
          </div>
        )}

        {op.certificates?.length > 0 ? (
          <div className="space-y-3">
            {op.certificates.map((cert: any) => (
              <div key={cert.id} className="p-4 rounded-xl bg-card border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">مستخلص رقم {cert.certificateNo}</span>
                  {cert.certificateDate && <span className="text-xs font-mono text-muted-foreground">{formatDate(cert.certificateDate)}</span>}
                </div>
                <DataRow label="إجمالي المستخلص" value={formatCurrency(Number(cert.grossAmount))} mono />
                <DataRow label="ضريبة أ.ت.ص (1%)" value={`- ${formatCurrency(Number(cert.taxDeduction))}`} mono />
                <DataRow label="ضريبة القيمة المضافة (14%)" value={`- ${formatCurrency(Number(cert.vatAmount))}`} mono />
                <DataRow label="ضمان أعمال (5%)" value={`- ${formatCurrency(Number(cert.performanceBond))}`} mono />
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-sm font-bold text-foreground">صافي المستحق</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(Number(cert.netAmount))}</span>
                </div>
              </div>
            ))}
          </div>
        ) : !adding && (
          <EmptyState icon={Calculator} text="لا توجد مستخلصات مسجلة حتى الآن" subtext="سجّل المستخلصات وسيتم تطبيق نسب الاستقطاع القانونية أوتوماتيكياً" />
        )}
      </SectionCard>

      {/* Continuity Action Footer (التسجيل 1 & 2) */}
      <StepFooterNav
        currentTabId="certificates"
        onNavigate={onNavigate}
      />
    </div>
  );
}
