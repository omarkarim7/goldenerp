"use client";

import React, { useState, useMemo } from "react";
import { AlertTriangle, AlertCircle, ArrowLeft, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp, Sparkles, Scale, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Operation, formatCurrency } from "./tabs/types";

interface ConsistencyConflict {
  id: string;
  title: string;
  message: string;
  severity: "danger" | "warning" | "info";
  relevantTabs: string[];
  actionTab?: string;
  actionLabel?: string;
  currentValue?: number | string;
  previousValue?: number | string;
}

export function CrossStageConsistencyAlert({
  op,
  activeTab,
  onNavigate,
}: {
  op: Operation;
  activeTab: string;
  onNavigate: (tabId: string) => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // استخراج القيم المسجلة من ملاحظات العملية والموديلات المرتبطة
  const savedNotes = useMemo(() => {
    try {
      if (op.notes && op.notes.startsWith("{")) {
        return JSON.parse(op.notes);
      }
    } catch {}
    return null;
  }, [op.notes]);

  const conflicts: ConsistencyConflict[] = useMemo(() => {
    const list: ConsistencyConflict[] = [];

    // ─────────────────────────────────────────────────────────────
    // 1. فحص إجمالي العرض المالي مقابل دراسة السوق / القيمة التقديرية
    // ─────────────────────────────────────────────────────────────
    const marketStudyVal = Number(
      savedNotes?.marketStudy?.totalEstimatedValue ||
      savedNotes?.marketStudyDocx?.total ||
      op.radarItem?.estimatedValue ||
      0
    );

    const financialOfferVal = Number(
      savedNotes?.financialOfferDocx?.total ||
      op.financialOffers?.[0]?.totalValue ||
      0
    );

    if (marketStudyVal > 0 && financialOfferVal > 0) {
      if (financialOfferVal > marketStudyVal) {
        const diff = financialOfferVal - marketStudyVal;
        list.push({
          id: "fin-exceeds-market-study",
          title: "تناقض السعر بين العرض المالي ودراسة السوق",
          message: `إجمالي العرض المالي المدخل (${formatCurrency(financialOfferVal)}) يتجاوز القيمة التقديرية المحددة بدراسة السوق (${formatCurrency(marketStudyVal)}) بزيادة قدرها ${formatCurrency(diff)}. هذا الاختلاف قد يؤدي لرفض العرض بسبب تجاوز الميزانية التقديرية.`,
          severity: "warning",
          relevantTabs: ["market_study", "financial"],
          actionTab: "market_study",
          actionLabel: "مراجعة دراسة السوق والأسعار",
          currentValue: financialOfferVal,
          previousValue: marketStudyVal,
        });
      } else if (financialOfferVal < marketStudyVal * 0.65) {
        list.push({
          id: "fin-too-low",
          title: "تنبيه انخفاض سعر العرض المالي عن دراسة السوق",
          message: `إجمالي العرض المالي (${formatCurrency(financialOfferVal)}) أقل بنسبة تتجاوز 35% من دراسة السوق التقديرية (${formatCurrency(marketStudyVal)}). يُرجى التحقق من عدم وجود خطأ حسابي أو تسعير بنود بأقل من التكلفة لتجنب شبهة العطاء المنخفض بشكل غير مبرر (المادة 40).`,
          severity: "info",
          relevantTabs: ["market_study", "financial"],
          actionTab: "financial",
          actionLabel: "تدقيق جدول الأسعار المالي",
          currentValue: financialOfferVal,
          previousValue: marketStudyVal,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. فحص إيصال التأمين الابتدائي المسدد مقابل المطلوب بالكراسة
    // ─────────────────────────────────────────────────────────────
    const bookletInsuranceRequired = Number(
      savedNotes?.bookletInsuranceRequired ||
      op.guarantees?.find((g: any) => g.type === "BID_BOND")?.amount ||
      0
    );

    const paidReceiptAmount = Number(
      savedNotes?.bookletReceiptAmount ||
      (op.documents || []).filter((d: any) => d.type === "RECEIPT").reduce((sum: number, d: any) => {
        // فحص ما إذا كان اسم الملف يحتوي على مبلغ
        const match = (d.fileName || "").match(/([\d,]+(?:\.\d+)?)\s*ج\.م/);
        if (match) {
          const parsed = parseFloat(match[1].replace(/,/g, ""));
          if (!isNaN(parsed)) return Math.max(sum, parsed);
        }
        return sum;
      }, 0)
    );

    if (bookletInsuranceRequired > 0 && paidReceiptAmount > 0) {
      if (paidReceiptAmount < bookletInsuranceRequired) {
        const diff = bookletInsuranceRequired - paidReceiptAmount;
        list.push({
          id: "insurance-insufficient",
          title: "تنبيه قانوني حرج: عجز في سداد التأمين الابتدائي",
          message: `قيمة إيصال التأمين الابتدائي المسددة (${formatCurrency(paidReceiptAmount)}) أقل من قيمة التأمين الابتدائي المطلوبة بكراسة الشروط (${formatCurrency(bookletInsuranceRequired)}) بعجز قدره ${formatCurrency(diff)}. عدم سداد كامل التأمين الابتدائي يوجب الاستبعاد الفني فوراً طبقاً للمادة 33 من القانون 182 لسنة 2018.`,
          severity: "danger",
          relevantTabs: ["booklet", "tech_opening"],
          actionTab: "booklet",
          actionLabel: "تعديل إيصال سداد التأمين",
          currentValue: paidReceiptAmount,
          previousValue: bookletInsuranceRequired,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. فحص قيمة الترسية المعتمدة مقابل العرض المالي الأصلي
    // ─────────────────────────────────────────────────────────────
    const awardedVal = Number(op.awards?.[0]?.awardedValue || 0);
    if (awardedVal > 0 && financialOfferVal > 0 && Math.abs(awardedVal - financialOfferVal) > 5) {
      const diff = awardedVal - financialOfferVal;
      list.push({
        id: "award-vs-financial-offer",
        title: "اختلاف بين قيمة الترسية وإجمالي العرض المالي",
        message: `قيمة الترسية الرسمية المعتمدة (${formatCurrency(awardedVal)}) تختلف عن إجمالي العرض المالي الأصلي (${formatCurrency(financialOfferVal)}) بفارق ${formatCurrency(Math.abs(diff))}. يرجى التأكد من مطابقة ذلك مع محاضر التفاوض أو الترسية الجزئية المعتمدة.`,
        severity: "info",
        relevantTabs: ["financial", "award", "supply_order"],
        actionTab: "award",
        actionLabel: "مطابقة قرار الترسية",
        currentValue: awardedVal,
        previousValue: financialOfferVal,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 4. فحص التأمين النهائي (5% إلزامي قانوناً) مقابل قيمة الترسية
    // ─────────────────────────────────────────────────────────────
    if (awardedVal > 0) {
      const minLegalGuarantee = awardedVal * 0.05;
      const registeredFinalGuarantee = Number(
        savedNotes?.finalGuarantee?.amount ||
        op.guarantees?.find((g: any) => g.type === "PERFORMANCE_BOND")?.amount ||
        0
      );

      if (registeredFinalGuarantee > 0 && registeredFinalGuarantee < minLegalGuarantee - 1) {
        list.push({
          id: "final-guarantee-below-legal-min",
          title: "مخالفة قانونية: التأمين النهائي أقل من النسبة القانونية (5%)",
          message: `قيمة التأمين النهائي المسجلة (${formatCurrency(registeredFinalGuarantee)}) تقل عن الحد الأدنى القانوني الإلزامي (5% = ${formatCurrency(minLegalGuarantee)}) المحسوب من قيمة الترسية الإجمالية (${formatCurrency(awardedVal)}) وفقاً للمادة 34 من القانون 182/2018.`,
          severity: "danger",
          relevantTabs: ["award", "guarantee_final", "supply_order"],
          actionTab: "guarantee_final",
          actionLabel: "تصحيح خطاب التأمين النهائي (5%)",
          currentValue: registeredFinalGuarantee,
          previousValue: minLegalGuarantee,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 5. فحص أمر التوريد مقابل قيمة الترسية
    // ─────────────────────────────────────────────────────────────
    const supplyOrderTotal = Number(op.supplyOrders?.[0]?.totalValue || 0);
    if (awardedVal > 0 && supplyOrderTotal > 0 && supplyOrderTotal > awardedVal + 1) {
      list.push({
        id: "supply-order-exceeds-award",
        title: "تناقض تعاقدي: أمر التوريد يتجاوز قيمة الترسية",
        message: `إجمالي أمر التوريد المسجل (${formatCurrency(supplyOrderTotal)}) يتجاوز قيمة قرار الترسية المعتمد (${formatCurrency(awardedVal)}) بفارق ${formatCurrency(supplyOrderTotal - awardedVal)}. لا يجوز لأمر التوريد تجاوز قيمة الترسية دون ملحق عقد أو تفويض تعديل كميات (المادة 78).`,
        severity: "warning",
        relevantTabs: ["award", "supply_order", "supply"],
        actionTab: "supply_order",
        actionLabel: "مطابقة أمر التوريد",
        currentValue: supplyOrderTotal,
        previousValue: awardedVal,
      });
    }

    return list;
  }, [op, savedNotes]);

  // تصفية التنبيهات المرتبطة بالمرحلة الحالية أو عرض كافة التنبيهات إذا كانت مهمة
  const relevantConflicts = useMemo(() => {
    return conflicts.filter((c) => c.relevantTabs.includes(activeTab));
  }, [conflicts, activeTab]);

  if (conflicts.length === 0) return null;

  const hasRelevant = relevantConflicts.length > 0;
  const displayList = hasRelevant ? relevantConflicts : conflicts;

  const hasDanger = displayList.some((c) => c.severity === "danger");
  const hasWarning = displayList.some((c) => c.severity === "warning");

  const borderClass = hasDanger
    ? "border-rose-500/50 bg-rose-500/10 dark:bg-rose-950/20"
    : hasWarning
    ? "border-amber-500/50 bg-amber-500/10 dark:bg-amber-950/20"
    : "border-blue-500/40 bg-blue-500/10 dark:bg-blue-950/20";

  return (
    <div className="mb-5 animate-fade-in">
      <div className={`p-4 rounded-3xl border-2 ${borderClass} shadow-lg transition-all`}>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-white shadow-md ${
              hasDanger ? "bg-rose-600 animate-pulse" : hasWarning ? "bg-amber-600" : "bg-blue-600"
            }`}>
              {hasDanger ? <ShieldAlert className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-black text-foreground">
                  تنبيهات ترابط وتناسق البيانات بين المراحل المتتالية
                </h4>
                <Badge className={`text-[10px] font-bold ${
                  hasDanger
                    ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40"
                    : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40"
                }`}>
                  {displayList.length} {displayList.length === 1 ? "تنبيه تعارض" : "تنبيهات تعارض"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {hasRelevant
                  ? "تم رصد تعارض أو عدم تطابق بين البيانات المدخلة في هذه المرحلة والمراحل السابقة"
                  : "تنبيهات عامة حول تناسق البيانات بين مراحل العملية المختلفة"}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 px-2 text-xs font-bold rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {isCollapsed ? (
              <span className="flex items-center gap-1">عرض التفاصيل <ChevronDown className="h-3.5 w-3.5" /></span>
            ) : (
              <span className="flex items-center gap-1">طي <ChevronUp className="h-3.5 w-3.5" /></span>
            )}
          </Button>
        </div>

        {/* Conflicts List */}
        {!isCollapsed && (
          <div className="pt-3 space-y-2.5">
            {displayList.map((conflict) => {
              const itemBg = conflict.severity === "danger"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200"
                : conflict.severity === "warning"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200"
                : "bg-blue-500/10 border-blue-500/30 text-blue-950 dark:text-blue-200";

              return (
                <div
                  key={conflict.id}
                  className={`p-3.5 rounded-2xl border ${itemBg} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs`}
                >
                  <div className="space-y-1 max-w-3xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold flex items-center gap-1.5">
                        {conflict.severity === "danger" ? (
                          <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        )}
                        <span>{conflict.title}</span>
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed opacity-90 font-medium">
                      {conflict.message}
                    </p>
                  </div>

                  {conflict.actionTab && (
                    <Button
                      size="sm"
                      onClick={() => onNavigate(conflict.actionTab!)}
                      className={`h-8 px-3 rounded-xl text-xs font-bold cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5 ${
                        conflict.severity === "danger"
                          ? "bg-rose-600 hover:bg-rose-700 text-white"
                          : conflict.severity === "warning"
                          ? "bg-amber-600 hover:bg-amber-700 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      <span>{conflict.actionLabel || "الانتقال للمرحلة"}</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
