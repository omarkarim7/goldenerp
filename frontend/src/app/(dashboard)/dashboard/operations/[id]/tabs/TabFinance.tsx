"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart3,
  Edit,
  Loader2,
  Coins,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  FileText,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Lock,
  Unlock,
  Calendar,
  DollarSign,
  Building2,
  Sparkles,
  RefreshCw,
  Receipt,
  Wallet,
  Percent,
  Landmark,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  X,
  FileCheck,
  Info,
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

export function TabFinance({
  op,
  onRefresh,
  onNavigate,
}: {
  op: Operation;
  onRefresh: () => void;
  onNavigate?: (tabId: string) => void;
}) {
  const fin = op.operationFinance;

  // Parse notes data
  const existingNotes = useMemo(() => {
    if (!op.notes) return {};
    try {
      return JSON.parse(op.notes);
    } catch {
      return {};
    }
  }, [op.notes]);

  const existingDetailed = existingNotes.detailedFinanceData || {};

  // Auto-derived figures from other tabs
  const autoSocialAmount = Number(existingNotes.insurancesLaborData?.socialInsuranceAmount || 0);
  const autoLaborAmount = Number(existingNotes.insurancesLaborData?.laborAmount || 0);
  const autoInsurancesTotal = autoSocialAmount + autoLaborAmount;

  const autoInvoicesList: any[] = existingNotes.invoicesList || [];
  const autoInvoicesTotal = autoInvoicesList.reduce(
    (acc: number, inv: any) => acc + Number(inv.grandTotal || 0),
    0
  );

  const autoPaymentOrderAmount = Number(
    existingNotes.insurancesLaborData?.paymentOrderAmount || 0
  );

  // Guarantees calculations
  const initialGuarantees = (op.guarantees || []).filter(
    (g: any) => g.type === "INITIAL"
  );
  const finalGuarantees = (op.guarantees || []).filter(
    (g: any) => g.type === "FINAL"
  );
  const totalInitialGuarAmount = initialGuarantees.reduce(
    (acc: number, g: any) => acc + Number(g.amount || 0),
    0
  );
  const totalFinalGuarAmount = finalGuarantees.reduce(
    (acc: number, g: any) => acc + Number(g.amount || 0),
    0
  );
  const totalBlockedGuarantees = totalInitialGuarAmount + totalFinalGuarAmount;

  // Baseline defaults
  const defaultRevenue =
    fin?.totalRevenue ??
    (op.awards?.[0]?.awardedAmount || autoInvoicesTotal || 850000);

  const [editing, setEditing] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [revenue, setRevenue] = useState<string>(() =>
    (fin?.totalRevenue ?? defaultRevenue).toString()
  );
  const [directSupplyCost, setDirectSupplyCost] = useState<string>(() =>
    (existingDetailed.directSupplyCost ?? (fin ? Number(fin.totalCost) * 0.78 : 540000)).toString()
  );
  const [laborSocialCost, setLaborSocialCost] = useState<string>(() =>
    (existingDetailed.laborSocialCost ?? (autoInsurancesTotal || 2600)).toString()
  );
  const [guaranteeFees, setGuaranteeFees] = useState<string>(() =>
    (existingDetailed.guaranteeFees ?? 3500).toString()
  );
  const [taxDeductionAmount, setTaxDeductionAmount] = useState<string>(() =>
    (existingDetailed.taxDeductionAmount ?? Math.round(Number(defaultRevenue) * 0.01)).toString()
  );
  const [adminLogisticsCost, setAdminLogisticsCost] = useState<string>(() =>
    (existingDetailed.adminLogisticsCost ?? 14500).toString()
  );
  const [extraExpenses, setExtraExpenses] = useState<string>(() =>
    (existingDetailed.extraExpenses ?? 4500).toString()
  );
  const [collectedTotal, setCollectedTotal] = useState<string>(() =>
    (existingDetailed.collectedTotal ?? (autoPaymentOrderAmount || 0)).toString()
  );
  const [financialNotes, setFinancialNotes] = useState<string>(() =>
    fin?.notes || existingDetailed.financialNotes || "تم تسوية حسابات التوريد والمصروفات والتأمينات ومطابقة أوامر الدفع"
  );
  const [isFinClosed, setIsFinClosed] = useState<boolean>(() => !!fin?.isClosed);

  // Computed Financial Aggregates
  const numRevenue = Number(revenue) || 0;
  const numDirectSupply = Number(directSupplyCost) || 0;
  const numLaborSocial = Number(laborSocialCost) || 0;
  const numGuaranteeFees = Number(guaranteeFees) || 0;
  const numTaxes = Number(taxDeductionAmount) || 0;
  const numAdminLogistics = Number(adminLogisticsCost) || 0;
  const numExtra = Number(extraExpenses) || 0;

  const totalCalculatedCost =
    numDirectSupply +
    numLaborSocial +
    numGuaranteeFees +
    numTaxes +
    numAdminLogistics +
    numExtra;

  const netProfit = numRevenue - totalCalculatedCost;
  const marginPercent =
    numRevenue > 0 ? ((netProfit / numRevenue) * 100).toFixed(1) : "0.0";
  const numMargin = Number(marginPercent);

  // Percentages of revenue for stacked breakdown
  const supplyPct = numRevenue > 0 ? Math.min(100, Math.round((numDirectSupply / numRevenue) * 100)) : 0;
  const laborPct = numRevenue > 0 ? Math.min(100, Math.round((numLaborSocial / numRevenue) * 100)) : 0;
  const feesTaxesPct = numRevenue > 0 ? Math.min(100, Math.round(((numGuaranteeFees + numTaxes + numAdminLogistics + numExtra) / numRevenue) * 100)) : 0;
  const profitPct = numRevenue > 0 ? Math.max(0, Math.round((netProfit / numRevenue) * 100)) : 0;

  // Collection progress
  const numCollected = Number(collectedTotal) || 0;
  const outstandingBalance = Math.max(0, numRevenue - numCollected);
  const collectionRate =
    numRevenue > 0 ? Math.min(100, Math.round((numCollected / numRevenue) * 100)) : 0;

  // Save Finance Action
  const handleSaveFinance = async () => {
    setSaving(true);
    try {
      // 1. Update backend finance record
      await api.post(`/operations/${op.id}/finance`, {
        totalRevenue: numRevenue,
        totalCost: totalCalculatedCost,
        netProfit,
        notes: financialNotes,
      });

      // 2. Persist detailed cost breakdown into op.notes
      let existingNotesObj: Record<string, any> = {};
      if (op.notes) {
        try {
          existingNotesObj = JSON.parse(op.notes);
        } catch {
          existingNotesObj = {};
        }
      }

      existingNotesObj.detailedFinanceData = {
        directSupplyCost: numDirectSupply,
        laborSocialCost: numLaborSocial,
        guaranteeFees: numGuaranteeFees,
        taxDeductionAmount: numTaxes,
        adminLogisticsCost: numAdminLogistics,
        extraExpenses: numExtra,
        collectedTotal: numCollected,
        financialNotes,
        isFinClosed,
        updatedAt: new Date().toISOString(),
      };

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(existingNotesObj),
      });

      toast.success("تم تحديث وحفظ لوحة الحسابات والمالية وصافي الربح بنجاح! 📊✨");
      setEditing(false);
      onRefresh();
    } catch (err: any) {
      toast.error("فشل حفظ الحسابات المالية: " + (err?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      {/* ━━━ EXECUTIVE TOP BAR ━━━ */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-card via-card/95 to-emerald-500/5 border border-border shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 flex items-center justify-center font-black text-sm">
                💰
              </span>
              <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                لوحة القيادة المالية التنفيذية وحساب الأرباح
              </h2>
              {isFinClosed ? (
                <Badge className="bg-muted text-muted-foreground border-border text-xs font-bold flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  الملف المالي مغلق رسمياً
                </Badge>
              ) : (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  حسابات جارية ومباشرة
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              تحليل التكاليف الفعلية، مراكز المصروفات، التدفق النقدي، احتجازات الضمانات، وصافي الهامش الربحي للعملية
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReportModalOpen(true)}
              className="h-9 px-3.5 rounded-xl border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="h-4 w-4" />
              <span>التقرير المالي التنفيذي 📜</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setEditing(!editing)}
              className="h-9 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>{editing ? "إغلاق نافذة التعديل" : "تسجيل وتعديل الحسابات ✏️"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ━━━ TOP 4 FINANCIAL KPI CARDS ━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: إجمالي الإيرادات التعاقدية */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-blue-500/30 shadow-lg relative overflow-hidden group hover:border-blue-500/50 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground pb-2">
            <span>إجمالي الإيرادات التعاقدية</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
            {formatCurrency(numRevenue)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
            <span>قيمة العقد المعتمد</span>
            <span className="font-semibold text-foreground">100% أساس</span>
          </div>
        </div>

        {/* KPI 2: إجمالي التكاليف والمصروفات */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-rose-500/30 shadow-lg relative overflow-hidden group hover:border-rose-500/50 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground pb-2">
            <span>التكاليف والمصروفات الفعلية</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
            - {formatCurrency(totalCalculatedCost)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
            <span>تشمل التوريد والعمالة والرسوم</span>
            <span className="font-semibold text-rose-600 font-mono">
              {numRevenue > 0 ? ((totalCalculatedCost / numRevenue) * 100).toFixed(1) : 0}% من الإيراد
            </span>
          </div>
        </div>

        {/* KPI 3: صافي الربح التشغيلي */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-emerald-500/30 shadow-lg relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground pb-2">
            <span>صافي الربح الفعلي للعملية</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div
            className={`text-xl sm:text-2xl font-black font-mono ${
              netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"
            }`}
          >
            {formatCurrency(netProfit)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
            <span>صافي السيولة النقدية المتوقعة</span>
            <span
              className={`font-bold ${
                netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {netProfit >= 0 ? "أرباح محققة ✓" : "عجز أو خسارة ⚠️"}
            </span>
          </div>
        </div>

        {/* KPI 4: هامش الربحية الصافي */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-amber-500/30 shadow-lg relative overflow-hidden group hover:border-amber-500/50 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground pb-2">
            <span>هامش الربحية الصافي (Margin)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
            {marginPercent}%
          </div>
          <div className="text-[11px] mt-1 flex items-center justify-between">
            <span className="text-muted-foreground">تقييم الأداء التجاري</span>
            <Badge
              className={`text-[10px] font-bold ${
                numMargin >= 22
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : numMargin >= 12
                  ? "bg-blue-500/20 text-blue-700 dark:text-blue-300"
                  : numMargin >= 5
                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                  : "bg-rose-500/20 text-rose-700 dark:text-rose-300"
              }`}
            >
              {numMargin >= 22
                ? "أداء ممتاز 🚀"
                : numMargin >= 12
                ? "أداء جيد جدًا 📈"
                : numMargin >= 5
                ? "هامش مقبول ⚖️"
                : "هامش حرج ⚠️"}
            </Badge>
          </div>
        </div>
      </div>

      {/* ━━━ FINANCIAL BREAKDOWN STACKED BAR ━━━ */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-md space-y-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-600" />
            شريط التوزيع والمسار المالي للعملية (% من إجمالي الإيراد التعاقدي):
          </span>
          <span className="text-muted-foreground font-mono">
            المتبقي كصافي أرباح: {profitPct}%
          </span>
        </div>

        {/* Multi-segment Bar */}
        <div className="w-full h-4 bg-muted/60 rounded-full overflow-hidden flex border border-border/50">
          <div
            style={{ width: `${supplyPct}%` }}
            className="bg-blue-600 transition-all"
            title={`تكاليف التوريد والمشتريات: ${supplyPct}%`}
          />
          <div
            style={{ width: `${laborPct}%` }}
            className="bg-amber-500 transition-all"
            title={`التأمينات والعمالة: ${laborPct}%`}
          />
          <div
            style={{ width: `${feesTaxesPct}%` }}
            className="bg-purple-600 transition-all"
            title={`الرسوم والضرائب والإداريات: ${feesTaxesPct}%`}
          />
          <div
            style={{ width: `${profitPct}%` }}
            className="bg-emerald-500 transition-all"
            title={`صافي الأرباح: ${profitPct}%`}
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
            <span>المشتريات والتوريد: <strong>{supplyPct}%</strong> ({formatCurrency(numDirectSupply)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            <span>التأمينات والعمالة: <strong>{laborPct}%</strong> ({formatCurrency(numLaborSocial)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0" />
            <span>الرسوم والمصاريف: <strong>{feesTaxesPct}%</strong> ({formatCurrency(numGuaranteeFees + numTaxes + numAdminLogistics + numExtra)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span>صافي الربح: <strong>{profitPct}%</strong> ({formatCurrency(netProfit)})</span>
          </div>
        </div>
      </div>

      {/* ━━━ EDITING FORM PANEL (IF ACTIVE) ━━━ */}
      {editing && (
        <div className="p-5 sm:p-6 rounded-3xl bg-card border-2 border-emerald-500/40 shadow-2xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
                <Edit className="h-4 w-4" />
              </div>
              <h3 className="text-sm sm:text-base font-black text-foreground">
                تعديل وتسجيل تفاصيل الحساب المالي ومراكز التكلفة
              </h3>
            </div>
            <button
              onClick={() => setEditing(false)}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Revenue Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-blue-600 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                إجمالي الإيرادات التعاقدية (ج.م) *
              </Label>
              <Input
                type="number"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                className="h-10 text-xs font-mono font-black rounded-xl border-blue-500/30"
              />
            </div>

            {/* Direct Supply Cost */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                <Truck className="h-3.5 w-3.5 text-blue-600" />
                تكلفة المشتريات والتوريد المباشر (ج.م) *
              </Label>
              <Input
                type="number"
                value={directSupplyCost}
                onChange={(e) => setDirectSupplyCost(e.target.value)}
                className="h-10 text-xs font-mono font-bold rounded-xl text-rose-600"
              />
            </div>

            {/* Labor & Social Insurance Cost */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                سداد التأمينات والعمالة (ج.م)
              </Label>
              <Input
                type="number"
                value={laborSocialCost}
                onChange={(e) => setLaborSocialCost(e.target.value)}
                className="h-10 text-xs font-mono font-bold rounded-xl text-rose-600"
              />
            </div>

            {/* Guarantee Fees */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                <Landmark className="h-3.5 w-3.5 text-purple-600" />
                عمولات ومصاريف خطابات الضمان (ج.م)
              </Label>
              <Input
                type="number"
                value={guaranteeFees}
                onChange={(e) => setGuaranteeFees(e.target.value)}
                className="h-10 text-xs font-mono font-bold rounded-xl text-rose-600"
              />
            </div>

            {/* Taxes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                <Receipt className="h-3.5 w-3.5 text-teal-600" />
                استقطاع ضريبة الخصم والإضافة (1% أ.ت.ص)
              </Label>
              <Input
                type="number"
                value={taxDeductionAmount}
                onChange={(e) => setTaxDeductionAmount(e.target.value)}
                className="h-10 text-xs font-mono font-bold rounded-xl text-rose-600"
              />
            </div>

            {/* Admin & Logistics */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                مصروفات إدارية ونقل ومشال (ج.م)
              </Label>
              <Input
                type="number"
                value={adminLogisticsCost}
                onChange={(e) => setAdminLogisticsCost(e.target.value)}
                className="h-10 text-xs font-mono font-bold rounded-xl text-rose-600"
              />
            </div>

            {/* Extra Expenses */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                مصروفات إضافية ونثريات (ج.م)
              </Label>
              <Input
                type="number"
                value={extraExpenses}
                onChange={(e) => setExtraExpenses(e.target.value)}
                className="h-10 text-xs font-mono font-bold rounded-xl text-rose-600"
              />
            </div>

            {/* Collected Total */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <Wallet className="h-3.5 w-3.5" />
                المتحصلات النقدية الفعلية المسددة (ج.م)
              </Label>
              <Input
                type="number"
                value={collectedTotal}
                onChange={(e) => setCollectedTotal(e.target.value)}
                className="h-10 text-xs font-mono font-bold rounded-xl text-emerald-600"
              />
            </div>

            {/* Close Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                حالة الإغلاق المالي للعملية
              </Label>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="finClosedCheck"
                  checked={isFinClosed}
                  onChange={(e) => setIsFinClosed(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                />
                <label
                  htmlFor="finClosedCheck"
                  className="text-xs font-bold text-foreground cursor-pointer select-none"
                >
                  إغلاق الملف المالي للعملية نهائياً 🔒
                </label>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">ملاحظات واعتماد التسوية المالية</Label>
            <Textarea
              rows={2}
              value={financialNotes}
              onChange={(e) => setFinancialNotes(e.target.value)}
              placeholder="تسجيل أية تسويات خاصة، أوامر دفع، أو خصومات معتمدة..."
              className="text-xs rounded-xl"
            />
          </div>

          {/* Live Preview Box */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold block">إجمالي التكلفة التقديرية الحالية:</span>
              <span className="font-mono text-rose-600 font-bold text-sm">
                {formatCurrency(totalCalculatedCost)}
              </span>
            </div>
            <div>
              <span className="font-bold block">صافي الربح المتوقع:</span>
              <span className={`font-mono font-black text-sm ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {formatCurrency(netProfit)} (هامش ربح {marginPercent}%)
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(false)}
                className="rounded-xl h-9 text-xs"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={handleSaveFinance}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 text-xs font-bold px-4 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <span>حفظ التعديلات المالية 💾</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━ DETAILED COST CENTERS & STREAMS ━━━ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Center 1: المشتريات والتوريدات المباشرة */}
        <SectionCard
          title="1. مركز تكاليف التوريدات والمشتريات المباشرة"
          icon={Truck}
          iconColor="text-blue-600"
          badge={
            <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs font-bold font-mono">
              {formatCurrency(numDirectSupply)}
            </Badge>
          }
        >
          <div className="space-y-2">
            <DataRow
              label="تكلفة الأصناف والمعدات الموردة:"
              value={<span className="font-mono font-bold text-foreground">{formatCurrency(numDirectSupply)}</span>}
            />
            <DataRow
              label="نسبة التوريد من إجمالي الإيراد:"
              value={<span className="font-mono text-blue-600 font-bold">{supplyPct}%</span>}
            />
            <DataRow
              label="حالة فواتير الشراء وإذن الإضافة:"
              value={<span className="text-emerald-600 font-bold">مطابقة ومقيدة مخزنياً ✓</span>}
            />
            <div className="p-3 rounded-xl bg-muted/20 border border-border text-[11px] text-muted-foreground flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500 shrink-0" />
              <span>
                تتضمن قيمة فواتير الموردين المسددة، وتكلفة الخامات ومطابقتها مع دراسة السوق للعملية.
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Cost Center 2: التأمينات الاجتماعية ورسوم العمالة */}
        <SectionCard
          title="2. مركز سداد التأمينات الاجتماعية وتصاريح العمالة"
          icon={ShieldCheck}
          iconColor="text-amber-600"
          badge={
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-bold font-mono">
              {formatCurrency(numLaborSocial)}
            </Badge>
          }
        >
          <div className="space-y-2">
            <DataRow
              label="سداد التأمينات الاجتماعية (مقاولات):"
              value={
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(autoSocialAmount || Number(laborSocialCost) * 0.7)}
                </span>
              }
            />
            <DataRow
              label="رسوم القوى العاملة وتصاريح التشغيل:"
              value={
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(autoLaborAmount || Number(laborSocialCost) * 0.3)}
                </span>
              }
            />
            <DataRow
              label="شهادات البراءة المسلمة للجهة:"
              value={
                <span className="text-emerald-600 font-bold">
                  {existingNotes.insurancesLaborData?.handoverReceiptNumber
                    ? `مسلمة برقم (${existingNotes.insurancesLaborData.handoverReceiptNumber}) ✓`
                    : "معتمدة ومسجلة"}
                </span>
              }
            />
            <div className="p-3 rounded-xl bg-muted/20 border border-border text-[11px] text-muted-foreground flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-500 shrink-0" />
              <span>
                تم استيفاء وتوريد اشتراكات العمالة غير المنتظمة وبراءة مكتب التأمينات قبل صرف المستخلص.
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Cost Center 3: محفظة خطابات الضمان والسيولة المجمدة */}
        <SectionCard
          title="3. محفظة خطابات الضمان والسيولة البنكية المحتجزة"
          icon={Landmark}
          iconColor="text-purple-600"
          badge={
            <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 text-xs font-bold font-mono">
              احتجاز: {formatCurrency(totalBlockedGuarantees)}
            </Badge>
          }
        >
          <div className="space-y-2">
            <DataRow
              label="التأمين الابتدائي (Initial LG):"
              value={
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(totalInitialGuarAmount)} (
                  {initialGuarantees?.[0]?.isReturned ? "تم الاسترداد ✓" : "ساري بالبنك"}
                  )
                </span>
              }
            />
            <DataRow
              label="التأمين النهائي 5% (Final LG):"
              value={
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(totalFinalGuarAmount)} (
                  {finalGuarantees?.[0]?.isReturned ? "مفرج عنه ✓" : "محتجز لحين الاستلام النهائي"}
                  )
                </span>
              }
            />
            <DataRow
              label="إجمالي عمولات ومصاريف إصدار الخطابات:"
              value={<span className="font-mono font-bold text-rose-600">{formatCurrency(numGuaranteeFees)}</span>}
            />
            <div className="p-3 rounded-xl bg-muted/20 border border-border text-[11px] text-muted-foreground flex items-center gap-2">
              <Info className="h-4 w-4 text-purple-500 shrink-0" />
              <span>
                السيولة المجمدة يتم تحريرها وإعادتها لحساب الشركة فور انتهاء فترة الضمان والاستلام النهائي.
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Cost Center 4: الضرائب والمصروفات الإدارية والتشغيلية */}
        <SectionCard
          title="4. الضرائب والاستقطاعات والمصروفات الإدارية"
          icon={Receipt}
          iconColor="text-teal-600"
          badge={
            <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30 text-xs font-bold font-mono">
              {formatCurrency(numTaxes + numAdminLogistics + numExtra)}
            </Badge>
          }
        >
          <div className="space-y-2">
            <DataRow
              label="ضريبة الخصم والإضافة (1% أ.ت.ص):"
              value={<span className="font-mono font-bold text-foreground">{formatCurrency(numTaxes)}</span>}
            />
            <DataRow
              label="مصروفات إدارية ونقل ومواصلات:"
              value={<span className="font-mono font-bold text-foreground">{formatCurrency(numAdminLogistics)}</span>}
            />
            <DataRow
              label="نثريات ومصروفات تشغيل غير مباشرة:"
              value={<span className="font-mono font-bold text-foreground">{formatCurrency(numExtra)}</span>}
            />
            <div className="p-3 rounded-xl bg-muted/20 border border-border text-[11px] text-muted-foreground flex items-center gap-2">
              <Info className="h-4 w-4 text-teal-500 shrink-0" />
              <span>
                تخضع العملية للإقرار الضريبي الدوري، مع إمكانية استرداد أو تسوية إشعار الخصم والإضافة.
              </span>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ━━━ CASHFLOW & INVOICING RECOVERY TRACKER ━━━ */}
      <SectionCard
        title="موقف إصدار الفواتير والتحصيل النقدي الفعلي (Cashflow Tracker)"
        icon={Wallet}
        iconColor="text-emerald-600"
        badge={
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold font-mono">
            تم تحصيل {collectionRate}%
          </Badge>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center">
              <span className="text-[11px] text-muted-foreground font-bold block">إجمالي الفواتير الصادرة</span>
              <span className="text-lg font-black font-mono text-blue-600">
                {formatCurrency(autoInvoicesTotal || numRevenue)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
              <span className="text-[11px] text-muted-foreground font-bold block">المتحصلات النقدية الفعلية</span>
              <span className="text-lg font-black font-mono text-emerald-600">
                {formatCurrency(numCollected)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
              <span className="text-[11px] text-muted-foreground font-bold block">المستحق المتبقي لدى الجهة</span>
              <span className="text-lg font-black font-mono text-amber-600">
                {formatCurrency(outstandingBalance)}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-muted-foreground">
              <span>نسبة إنجاز التحصيل الفعلي:</span>
              <span className="font-mono text-emerald-600">{collectionRate}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-muted overflow-hidden border border-border">
              <div
                style={{ width: `${collectionRate}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/20 border border-border text-xs flex justify-between items-center flex-wrap gap-2">
            <span className="text-muted-foreground font-semibold">
              ملاحظة التسوية المالية المسجلة:
            </span>
            <span className="font-bold text-foreground">{financialNotes}</span>
          </div>
        </div>
      </SectionCard>

      {/* ━━━ PRINTABLE EXECUTIVE SETTLEMENT REPORT MODAL ━━━ */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 relative my-auto animate-fade-in print:p-0 print:m-0 print:border-0 print:shadow-none">
            {/* Modal Actions Bar (Hidden on print) */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  📜
                </span>
                <span className="font-black text-base text-slate-800">
                  معاينة التقرير المالي التنفيذي الرسمي للطباعة
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="h-4 w-4" />
                  <span>طباعة فورية 🖨️</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setReportModalOpen(false)}
                  className="h-9 px-3 text-xs rounded-xl border-slate-300"
                >
                  إغلاق ✕
                </Button>
              </div>
            </div>

            {/* Official Report Content (Visible and printable) */}
            <div className="space-y-6 text-slate-800 text-sm leading-relaxed" id="official-financial-report">
              {/* Report Letterhead */}
              <div className="flex justify-between items-center pb-4 border-b-2 border-slate-800 text-xs">
                <div>
                  <h3 className="font-black text-base text-slate-900">جمهورية مصر العربية</h3>
                  <p className="font-semibold text-slate-600">شركة الأعمال والتوريدات الهندسية — GoldenERP</p>
                  <p className="text-[11px] text-slate-500">قطاع الشئون المالية والمراجعة الحسابية</p>
                </div>
                <div className="text-left font-mono">
                  <p className="font-black">كود العملية: {op.serialNumber || "—"}</p>
                  <p className="text-slate-600">تاريخ الإصدار: {formatDate(new Date().toISOString())}</p>
                  <p className="text-[11px] text-slate-500">حالة الملف: معتمد نهائياً</p>
                </div>
              </div>

              {/* Title */}
              <div className="text-center py-2 bg-slate-50 rounded-xl border border-slate-200">
                <h1 className="text-lg sm:text-xl font-black text-slate-900">
                  تقرير التسوية والموقف المالي النهائي لعملية التوريد
                </h1>
                <p className="text-xs font-bold text-slate-600 mt-1">
                  العملية: {op.name || op.title} — جهة الإسناد: {op.authority}
                </p>
              </div>

              {/* Summary KPIs Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-slate-300 rounded-xl overflow-hidden text-right">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2.5">البيان المالي الأساسي</th>
                      <th className="p-2.5 text-center">المبلغ بالجنيه المصري (EGP)</th>
                      <th className="p-2.5 text-center">النسبة المئوية</th>
                      <th className="p-2.5">ملاحظات الاعتماد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="font-bold text-slate-900">
                      <td className="p-2.5 text-blue-700">1. إجمالي الإيرادات التعاقدية (Revenue)</td>
                      <td className="p-2.5 text-center font-mono font-black text-blue-700">{formatCurrency(numRevenue)}</td>
                      <td className="p-2.5 text-center font-mono">100.0%</td>
                      <td className="p-2.5 text-slate-600">قيمة أمر التوريد والترسية الرسمية</td>
                    </tr>
                    <tr>
                      <td className="p-2.5">2. تكاليف التوريد والمشتريات المباشرة</td>
                      <td className="p-2.5 text-center font-mono font-bold text-rose-700">{formatCurrency(numDirectSupply)}</td>
                      <td className="p-2.5 text-center font-mono">{supplyPct}%</td>
                      <td className="p-2.5 text-slate-600">فواتير شراء الأصناف والخامات المعتمدة</td>
                    </tr>
                    <tr>
                      <td className="p-2.5">3. سداد التأمينات الاجتماعية والعمالة</td>
                      <td className="p-2.5 text-center font-mono font-bold text-rose-700">{formatCurrency(numLaborSocial)}</td>
                      <td className="p-2.5 text-center font-mono">{laborPct}%</td>
                      <td className="p-2.5 text-slate-600">براءة التأمينات ومكتب القوى العاملة</td>
                    </tr>
                    <tr>
                      <td className="p-2.5">4. استقطاع ضريبة الخصم والإضافة (1%)</td>
                      <td className="p-2.5 text-center font-mono font-bold text-rose-700">{formatCurrency(numTaxes)}</td>
                      <td className="p-2.5 text-center font-mono">1.0%</td>
                      <td className="p-2.5 text-slate-600">إشعار الخصم تحت حساب الضريبة (أ.ت.ص)</td>
                    </tr>
                    <tr>
                      <td className="p-2.5">5. عمولات خطابات الضمان والبنك</td>
                      <td className="p-2.5 text-center font-mono font-bold text-rose-700">{formatCurrency(numGuaranteeFees)}</td>
                      <td className="p-2.5 text-center font-mono font-bold">{(numGuaranteeFees / (numRevenue || 1) * 100).toFixed(1)}%</td>
                      <td className="p-2.5 text-slate-600">رسوم إصدار التأمين الابتدائي والنهائي</td>
                    </tr>
                    <tr>
                      <td className="p-2.5">6. المصروفات الإدارية والنقل والنثريات</td>
                      <td className="p-2.5 text-center font-mono font-bold text-rose-700">{formatCurrency(numAdminLogistics + numExtra)}</td>
                      <td className="p-2.5 text-center font-mono font-bold">{((numAdminLogistics + numExtra) / (numRevenue || 1) * 100).toFixed(1)}%</td>
                      <td className="p-2.5 text-slate-600">نقل ومشال ومصروفات تشغيل</td>
                    </tr>
                    <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-400">
                      <td className="p-2.5">إجمالي التكاليف والمصروفات الفعلية</td>
                      <td className="p-2.5 text-center font-mono font-black text-rose-700">{formatCurrency(totalCalculatedCost)}</td>
                      <td className="p-2.5 text-center font-mono">{numRevenue > 0 ? ((totalCalculatedCost / numRevenue) * 100).toFixed(1) : 0}%</td>
                      <td className="p-2.5 text-slate-700">مجموع المصروفات المباشرة وغير المباشرة</td>
                    </tr>
                    <tr className="bg-emerald-50 font-black text-emerald-900 border-t-2 border-emerald-400">
                      <td className="p-3 text-sm">صافي الأرباح المحققة (Net Profit)</td>
                      <td className="p-3 text-center font-mono font-black text-base text-emerald-700">{formatCurrency(netProfit)}</td>
                      <td className="p-3 text-center font-mono text-sm">{marginPercent}%</td>
                      <td className="p-3 text-emerald-800 font-bold">هامش صافي معتمد للشركة</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tafqeet & Statement */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 leading-relaxed">
                <span className="font-bold text-slate-900 block mb-1">الإقرار المالي المعتمد:</span>
                تشهد الإدارة المالية بأن الأرقام الواردة أعلاه مطابقة لدفاتر الحسابات الرسمية وفواتير الموردين وأذون الصرف والتسليم، وقد بلغ صافي الربح الفعلي المحقق <strong>{formatCurrency(netProfit)}</strong> ({tafqeetArabic(netProfit)}).
              </div>

              {/* Guarantees & Cash Position */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-slate-200">
                  <span className="font-bold block text-slate-900 mb-1">موقف خطابات الضمان المحتجزة:</span>
                  <p className="text-slate-600">التأمين النهائي 5%: <strong>{formatCurrency(totalFinalGuarAmount)}</strong></p>
                  <p className="text-slate-500 text-[11px] mt-0.5">يتم الإفراج عنه فور الاستلام النهائي وانتهاء مدة الضمان التعاقدية.</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200">
                  <span className="font-bold block text-slate-900 mb-1">موقف التحصيل وأوامر الدفع:</span>
                  <p className="text-slate-600">المحصل فعلياً: <strong>{formatCurrency(numCollected)}</strong> ({collectionRate}%)</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">المتبقي للصرف: <strong>{formatCurrency(outstandingBalance)}</strong></p>
                </div>
              </div>

              {/* Signatures Block */}
              <div className="pt-6 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-xs">
                <div className="space-y-8">
                  <span className="font-bold text-slate-900 block">المحاسب المالي المختص</span>
                  <span className="block border-b border-dashed border-slate-400 w-32 mx-auto" />
                </div>
                <div className="space-y-8">
                  <span className="font-bold text-slate-900 block">المراجع المالي</span>
                  <span className="block border-b border-dashed border-slate-400 w-32 mx-auto" />
                </div>
                <div className="space-y-8">
                  <span className="font-bold text-slate-900 block">اعتماد المدير المالي / رئيس مجلس الإدارة</span>
                  <span className="block border-b border-dashed border-slate-400 w-32 mx-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Continuity Action Footer */}
      <StepFooterNav currentTabId="finance" onNavigate={onNavigate} />
    </div>
  );
}
