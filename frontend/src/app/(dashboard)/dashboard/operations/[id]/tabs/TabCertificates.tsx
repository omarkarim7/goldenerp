"use client";

import React, { useState, useMemo } from "react";
import {
  Calculator,
  Plus,
  Loader2,
  DollarSign,
  TrendingUp,
  Receipt,
  CheckCircle2,
  Percent,
  FileText,
  Building2,
  Trash2,
  Download,
  Check,
  Landmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

  // Detailed Deductions State
  const [vatRate, setVatRate] = useState("14");
  const [profitTaxRate, setProfitTaxRate] = useState("1"); // 1% أ.ت.ص
  const [socialInsuranceDeduction, setSocialInsuranceDeduction] = useState("0");
  const [laborDeduction, setLaborDeduction] = useState("0");
  const [retentionRate, setRetentionRate] = useState("5"); // 5% ضمان أعمال
  const [penaltyDeduction, setPenaltyDeduction] = useState("0"); // غرامات تأخير
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Calculations
  const gross = Number(grossAmount) || 0;
  const vat = Math.round((gross * (Number(vatRate) || 0)) / 100 * 100) / 100;
  const profitTax = Math.round((gross * (Number(profitTaxRate) || 0)) / 100 * 100) / 100;
  const retention = Math.round((gross * (Number(retentionRate) || 0)) / 100 * 100) / 100;
  const socialIns = Number(socialInsuranceDeduction) || 0;
  const labor = Number(laborDeduction) || 0;
  const penalty = Number(penaltyDeduction) || 0;

  const totalDeductions = profitTax + retention + socialIns + labor + penalty;
  // Net payment is: Gross + VAT - Deductions
  const net = Math.round((gross + vat - totalDeductions) * 100) / 100;

  // Expected Total Contract Value
  const expectedTotalContract = useMemo(() => {
    const fo = op.financialOffers?.[0];
    if (fo?.grandTotal) return Number(fo.grandTotal);
    const award = op.awards?.find((a: any) => a.isOurCompany);
    if (award?.winnerPrice) return Number(award.winnerPrice);
    return gross;
  }, [op, gross]);

  const totalCertificatesPaid = useMemo(() => {
    return (op.certificates || []).reduce((acc: number, c: any) => acc + (Number(c.grossAmount) || 0), 0);
  }, [op.certificates]);

  const remainingBalance = Math.max(0, expectedTotalContract - totalCertificatesPaid);

  const handleSaveCertificate = async () => {
    setSaving(true);
    try {
      const notesPayload = JSON.stringify({
        vatRate: Number(vatRate),
        vatAmount: vat,
        profitTaxRate: Number(profitTaxRate),
        profitTaxAmount: profitTax,
        socialInsuranceDeduction: socialIns,
        laborDeduction: labor,
        retentionRate: Number(retentionRate),
        retentionAmount: retention,
        penaltyDeduction: penalty,
        userNotes: notes,
      });

      await api.post(`/operations/${op.id}/certificates`, {
        certificateNo: Number(certificateNo),
        grossAmount: gross,
        taxDeduction: profitTax,
        vatAmount: vat,
        performanceBond: retention,
        netAmount: net,
        notes: notesPayload,
      });

      toast.success("تم تسجيل المستخلص المالي وحساب الاستقطاعات الرسمية بنجاح! 🧾✓");
      setAdding(false);
      onRefresh();
    } catch {
      toast.error("فشل تسجيل المستخلص");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      {/* ━━━ SECTION 1: ملخص السعر المتوقع والمصروف والمتبقي ━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl glass-card border border-border shadow-sm space-y-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-bold">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            السعر المتوقع (قيمة التعاقد)
          </span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono block">
            {formatCurrency(expectedTotalContract)}
          </span>
          <span className="text-[10px] text-muted-foreground block">إجمالي أمر التوريد / العرض المالي</span>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-border shadow-sm space-y-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-bold">
            <Receipt className="h-4 w-4 text-blue-600" />
            إجمالي المستخلصات المصروفة
          </span>
          <span className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono block">
            {formatCurrency(totalCertificatesPaid)}
          </span>
          <span className="text-[10px] text-muted-foreground block">{op.certificates?.length || 0} مستخلصات معتمدة</span>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-border shadow-sm space-y-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-bold">
            <TrendingUp className="h-4 w-4 text-amber-600" />
            الرصيد المتبقي للصرف
          </span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono block">
            {formatCurrency(remainingBalance)}
          </span>
          <span className="text-[10px] text-muted-foreground block">مستحقات قيد الفحص والتوريد</span>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-border shadow-sm space-y-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-bold">
            <Landmark className="h-4 w-4 text-indigo-600" />
            نسبة الصرف والتحصيل
          </span>
          <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono block">
            {expectedTotalContract > 0 ? `${((totalCertificatesPaid / expectedTotalContract) * 100).toFixed(1)}%` : "0%"}
          </span>
          <span className="text-[10px] text-muted-foreground block">من إجمالي مستحقات العملية</span>
        </div>
      </div>

      {/* ━━━ SECTION 2: كارت المستخلصات وحاسبة الاستقطاعات ━━━ */}
      <SectionCard
        title="المستخلصات المالية والاستقطاعات والضرائب الرسمية"
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
            <span>تسجيل مستخلص واستقطاعات جديدة</span>
          </Button>
        }
      >
        <div className="p-3.5 rounded-xl bg-teal-500/5 border border-teal-500/20 text-xs text-foreground mb-2 leading-relaxed">
          <strong>حساب الاستقطاعات وأوامر الصرف الحكومية:</strong> يحسب النظام أوتوماتيكياً: ضريبة القيمة المضافة 14% + خصم 1% أرباح تجارية وصناعية (أ.ت.ص) + استقطاعات التأمينات والعمالة + 5% ضمان أعمال وحسن تنفيذ، ويحدد صافي المبلغ المعتمد بأمر الدفع الإلكتروني.
        </div>

        {adding && (
          <div className="p-5 rounded-2xl bg-card border-2 border-teal-500/40 space-y-4 animate-fade-in shadow-xl">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calculator className="h-4.5 w-4.5 text-teal-600" />
              <span>تحرير مستخلص مالي وبيان الاستقطاعات</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">رقم المستخلص *</Label>
                <Input
                  type="number"
                  value={certificateNo}
                  onChange={(e) => setCertificateNo(Number(e.target.value))}
                  className="h-10 text-sm font-mono font-bold rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">قيمة الأعمال المنفذة قبل الضرائب والاستقطاعات (Gross) *</Label>
                <Input
                  type="number"
                  value={grossAmount}
                  onChange={(e) => setGrossAmount(e.target.value)}
                  className="h-10 text-sm font-mono font-bold rounded-xl"
                />
              </div>
            </div>

            {/* Deductions Inputs Grid */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
              <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Percent className="h-4 w-4 text-teal-600" />
                بيان الضرائب والاستقطاعات القانونية:
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">ضريبة القيمة المضافة (14% VAT)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={vatRate}
                      onChange={(e) => setVatRate(e.target.value)}
                      className="h-9 text-xs font-mono font-bold w-20 text-center"
                    />
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(vat)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">ضريبة أرباح تجارية وصناعية (1% أ.ت.ص)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={profitTaxRate}
                      onChange={(e) => setProfitTaxRate(e.target.value)}
                      className="h-9 text-xs font-mono font-bold w-20 text-center"
                    />
                    <span className="text-xs font-mono font-bold text-rose-500">
                      -{formatCurrency(profitTax)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">ضمان الأعمال وحسن التنفيذ (5%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={retentionRate}
                      onChange={(e) => setRetentionRate(e.target.value)}
                      className="h-9 text-xs font-mono font-bold w-20 text-center"
                    />
                    <span className="text-xs font-mono font-bold text-rose-500">
                      -{formatCurrency(retention)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">استقطاع التأمينات الاجتماعية (ج.م)</Label>
                  <Input
                    type="number"
                    value={socialInsuranceDeduction}
                    onChange={(e) => setSocialInsuranceDeduction(e.target.value)}
                    className="h-9 text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">استقطاع القوى العاملة (ج.م)</Label>
                  <Input
                    type="number"
                    value={laborDeduction}
                    onChange={(e) => setLaborDeduction(e.target.value)}
                    className="h-9 text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">غرامات تأخير / استقطاعات أخرى</Label>
                  <Input
                    type="number"
                    value={penaltyDeduction}
                    onChange={(e) => setPenaltyDeduction(e.target.value)}
                    className="h-9 text-xs font-mono font-bold text-rose-500"
                  />
                </div>
              </div>
            </div>

            {/* Calculations Summary Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent border border-teal-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs text-muted-foreground block font-bold">
                  صافي أمر الدفع المنصرف للشركة:
                </span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatCurrency(net)}
                </span>
                <span className="text-xs text-foreground block font-bold mt-1">
                  {tafqeetArabic(net)}
                </span>
              </div>
              <div className="text-left text-xs font-mono space-y-1">
                <div>إجمالي الأعمال: {formatCurrency(gross)}</div>
                <div className="text-emerald-600">+ ضريبة القيمة المضافة: {formatCurrency(vat)}</div>
                <div className="text-rose-500">- إجمالي الاستقطاعات: {formatCurrency(totalDeductions)}</div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">ملاحظات المستخلص وأمر الدفع</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: مستخلص دفعة توريد نهائية - تم استيفاء الفحص الفني"
                className="text-xs rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAdding(false)}
                className="rounded-xl"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={handleSaveCertificate}
                disabled={saving}
                className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold px-5"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Check className="h-4 w-4 ml-1" />}
                <span>حفظ المستخلص والاستقطاعات</span>
              </Button>
            </div>
          </div>
        )}

        {/* Existing Certificates List */}
        {op.certificates && op.certificates.length > 0 ? (
          <div className="space-y-3">
            {op.certificates.map((c: any) => {
              let parsedNotes: any = null;
              try {
                if (c.notes && c.notes.startsWith("{")) parsedNotes = JSON.parse(c.notes);
              } catch {}

              return (
                <div
                  key={c.id}
                  className="p-4 sm:p-5 rounded-2xl bg-card border border-border space-y-3 hover:border-teal-500/40 transition-colors shadow-xs"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 flex items-center justify-center font-bold text-xs">
                        #{c.certificateNo}
                      </div>
                      <span className="font-bold text-foreground text-sm">مستخلص مالي رقم {c.certificateNo}</span>
                      <Badge className="badge-teal text-[10px] font-mono">
                        صافي المنصرف: {formatCurrency(Number(c.netAmount))}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      تاريخ التسجيل: {formatDate(c.createdAt)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">إجمالي الأعمال (Gross):</span>
                      <span className="font-mono font-bold text-foreground">{formatCurrency(Number(c.grossAmount))}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">ضريبة القيمة المضافة (14%):</span>
                      <span className="font-mono font-bold text-emerald-600">+{formatCurrency(Number(c.vatAmount))}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">خصم أ.ت.ص (1%):</span>
                      <span className="font-mono font-bold text-rose-500">-{formatCurrency(Number(c.taxDeduction))}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">ضمان الأعمال (5%):</span>
                      <span className="font-mono font-bold text-rose-500">-{formatCurrency(Number(c.performanceBond))}</span>
                    </div>
                  </div>

                  {parsedNotes?.userNotes && (
                    <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-border/50">
                      <strong>ملاحظات:</strong> {parsedNotes.userNotes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          !adding && (
            <EmptyState
              icon={Calculator}
              text="لا توجد مستخلصات مسجلة حتى الآن"
              subtext="سجّل مستخلصات العملية لحساب الاستقطاعات الرسمية وصافي أوامر الصرف المعتمدة"
            />
          )
        )}
      </SectionCard>

      {/* Continuity Action Footer */}
      <StepFooterNav currentTabId="certificates" onNavigate={onNavigate} />
    </div>
  );
}
