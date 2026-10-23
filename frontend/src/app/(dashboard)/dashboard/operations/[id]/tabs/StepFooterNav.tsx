"use client";

import React, { useState } from "react";
import {
  ChevronLeft, ChevronRight, Sparkles, CheckCircle2,
  Lock, Unlock, Clock, Send, RotateCcw, Check, ShieldCheck, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LIFECYCLE_TABS, TabDef } from "./types";
import { useStageLock } from "../StageLockContext";
import { Portal } from "@/components/ui/portal";
import { toast } from "sonner";

interface StepFooterNavProps {
  currentTabId: string;
  onNavigate?: (tabId: string) => void;
  nextLabel?: string;
  prevLabel?: string;
  extraActions?: React.ReactNode;
}

export function StepFooterNav({
  currentTabId,
  onNavigate,
  nextLabel,
  prevLabel,
  extraActions,
}: StepFooterNavProps) {
  const currentIndex = LIFECYCLE_TABS.findIndex((t) => t.id === currentTabId);
  const currentTab = LIFECYCLE_TABS[currentIndex] || LIFECYCLE_TABS[0];
  const prevTab: TabDef | undefined = currentIndex > 0 ? LIFECYCLE_TABS[currentIndex - 1] : undefined;
  const nextTab: TabDef | undefined = currentIndex < LIFECYCLE_TABS.length - 1 ? LIFECYCLE_TABS[currentIndex + 1] : undefined;

  const [advanceModalTarget, setAdvanceModalTarget] = useState<string | null>(null);

  const {
    isStageLocked,
    lockStage,
    unlockStage,
    getStageStatus,
    submitStageForReview,
    approveStage,
    returnStageForRevision,
    isManagerOrDeputy,
    canAccessNextStage,
  } = useStageLock();

  const isLocked = isStageLocked(currentTabId);
  const stageStatus = getStageStatus(currentTabId);
  const isApproved = stageStatus === "APPROVED";
  const isPendingReview = stageStatus === "PENDING_REVIEW";
  const canGoNext = canAccessNextStage(currentTabId);

  const handleGo = (targetId: string) => {
    if (onNavigate) {
      onNavigate(targetId);
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleNextClick = (targetId: string) => {
    if (isApproved) {
      handleGo(targetId);
      return;
    }

    if (!isManagerOrDeputy) {
      toast.warning(
        `المرحلة الحالية "${currentTab.label}" لم تعتمد بعد من الإدارة العليا. يرجى إرسالها للمراجعة وانتظار الاعتماد.`
      );
      return;
    }

    // للمدير والنائب: إظهار تنبيه التأكيد بوضوح قبل الانتقال إذا كانت المرحلة غير معتمدة أو تمت إعادتها للتعديل
    setAdvanceModalTarget(targetId);
  };

  return (
    <div className="pt-6 pb-2 space-y-3">
      {/* ━━━ شريط حالة الاعتماد والتنبيه للموظف والإدارة ━━━ */}
      {!isManagerOrDeputy && isPendingReview && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <Clock className="h-5 w-5 text-amber-600 shrink-0 animate-pulse" />
            <div>
              <span className="font-extrabold text-sm block">المرحلة قيد مراجعة واعتماد الإدارة العليا</span>
              <span className="text-[11px] opacity-90">
                تم حفظ بياناتك بنجاح — بانتظار موافقة المدير العام أو النائب عليها لتصريح الانتقال للمرحلة التالية.
              </span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono font-black shrink-0">
            قيد المراجعة ⏳
          </span>
        </div>
      )}

      {isManagerOrDeputy && isPendingReview && (
        <div className="p-3.5 rounded-2xl bg-blue-500/10 border-2 border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-900 dark:text-blue-200 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <span className="font-extrabold text-sm block">تتطلب قرار واعتماد الإدارة (المدير / النائب)</span>
              <span className="text-[11px] opacity-90">
                قام الموظف بإدخال بيانات المرحلة وإرسالها لمراجعتك. يمكنك فحصها واعتمادها أو إعادتها للتعديل.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => returnStageForRevision(currentTabId, currentTab.label)}
              className="border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>إعادة للتعديل</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => approveStage(currentTabId, currentTab.label)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Check className="h-4 w-4" />
              <span>اعتماد المرحلة وتصريح المتابعة ✓</span>
            </Button>
          </div>
        </div>
      )}

      {stageStatus === "DRAFT" && (
        <div className="p-3.5 rounded-2xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-between gap-3 text-xs text-foreground animate-fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <RotateCcw className="h-4 w-4 text-blue-600 shrink-0" />
            <div>
              <span className="font-extrabold text-xs sm:text-sm block">المرحلة في وضع التعديل والتحرير ✏️</span>
              <span className="text-[11px] text-muted-foreground">
                يمكن إدخال وتعديل البيانات وحفظها، وعند الانتهاء يتم إرسالها لمراجعة واعتماد الإدارة أو اعتمادها مباشرة.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-muted text-muted-foreground font-mono font-bold text-[11px] shrink-0">
            وضع التحرير
          </span>
        </div>
      )}

      {/* ━━━ شريط التنقل السفلي ━━━ */}
      <div className="p-4 sm:p-5 rounded-3xl glass-card border-2 border-border/80 shadow-2xl bg-gradient-to-r from-card via-muted/30 to-card flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Previous Step Button */}
        <div className="w-full sm:w-auto flex items-center justify-start">
          {prevTab ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleGo(prevTab.id)}
              className="w-full sm:w-auto h-11 px-4 sm:px-5 rounded-2xl border-border hover:bg-muted font-bold text-xs sm:text-sm text-foreground shadow-sm cursor-pointer flex items-center gap-2 group transition-all"
            >
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              <span>{prevLabel || `السابق: #${prevTab.order} ${prevTab.shortLabel}`}</span>
            </Button>
          ) : (
            <div className="hidden sm:block text-xs text-muted-foreground font-semibold px-2">
              بداية مسار العملية 🏁
            </div>
          )}
        </div>

        {/* Center: Stage Indicator Badge & Extra actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>مرحلة {currentTab.order} من {LIFECYCLE_TABS.length}: {currentTab.label}</span>
          </div>
          {extraActions}
        </div>

        {/* Actions: Role-based Stage Approvals + Stage Lock + Next Step Button */}
        <div className="w-full sm:w-auto flex items-center justify-end gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          {/* للموظف: زر حفظ وإرسال للمراجعة إذا كانت المرحلة DRAFT */}
          {!isManagerOrDeputy && !isApproved && !isPendingReview && (
            <Button
              type="button"
              onClick={() => submitStageForReview(currentTabId, currentTab.label)}
              className="h-11 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs cursor-pointer flex items-center gap-2 shadow-md shrink-0"
              title="حفظ بيانات المرحلة وإرسالها للمدير العام أو النائب للمراجعة والاعتماد"
            >
              <Send className="h-4 w-4" />
              <span>حفظ وإرسال للمراجعة 📤</span>
            </Button>
          )}

          {/* للمدير والنائب: زر اعتماد المرحلة المباشر */}
          {isManagerOrDeputy && !isApproved && (
            <Button
              type="button"
              onClick={() => approveStage(currentTabId, currentTab.label)}
              className="h-11 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-md shrink-0"
              title="اعتماد المرحلة وتصريح الموظف بالمتابعة"
            >
              <Check className="h-4 w-4" />
              <span>اعتماد المرحلة ✓</span>
            </Button>
          )}

          {/* زر قفل / فتح المرحلة (للمدير والنائب فقط) */}
          {isManagerOrDeputy && (
            isLocked ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => unlockStage(currentTabId, currentTab.label)}
                className="h-11 px-3 sm:px-4 rounded-2xl border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/25 font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0 whitespace-nowrap"
                title="المرحلة مقفولة — انقر لفتح التعديلات"
              >
                <Unlock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>المرحلة مقفولة (فتح التعديلات 🔓)</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => lockStage(currentTabId, currentTab.label)}
                className="h-11 px-3.5 sm:px-4 rounded-2xl border-border bg-card hover:bg-amber-500/10 hover:border-amber-500/40 text-foreground font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 group shrink-0 whitespace-nowrap"
                title="قفل المرحلة وتثبيت كافة بياناتها لمنع التعديل"
              >
                <Lock className="h-4 w-4 text-muted-foreground group-hover:text-amber-600 transition-colors" />
                <span>قفل المرحلة 🔒</span>
              </Button>
            )
          )}

          {/* زر الانتقال للمرحلة التالية مع فحص الصلاحية وحالة الاعتماد والتأكيد السلس */}
          {nextTab ? (
            <Button
              type="button"
              onClick={() => handleNextClick(nextTab.id)}
              disabled={!isManagerOrDeputy && !canGoNext}
              title={
                !isManagerOrDeputy && !canGoNext
                  ? "يجب اعتماد هذه المرحلة من المدير العام أو النائب أولاً"
                  : undefined
              }
              className={`h-11 px-4 sm:px-6 rounded-2xl font-black text-xs sm:text-sm shadow-lg cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2 group shrink-0 whitespace-nowrap ${
                isApproved
                  ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-700 hover:via-indigo-700 hover:to-emerald-700 text-white shadow-blue-500/25"
                  : isManagerOrDeputy
                  ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-amber-500/20"
                  : "bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60"
              }`}
            >
              <span>{nextLabel || `الانتقال إلى: #${nextTab.order} ${nextTab.shortLabel}`}</span>
              <ChevronLeft className="h-4.5 w-4.5 transition-transform group-hover:-translate-x-1.5" />
            </Button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold shrink-0 whitespace-nowrap">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>المرحلة النهائية للعملية</span>
            </div>
          )}
        </div>
      </div>

      {/* ━━━ نافذة تأكيد الانتقال قبل الاعتماد (للمدير والنائب) ━━━ */}
      {advanceModalTarget && (
        <Portal>
          <div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-card border-2 border-border/80 shadow-2xl rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-5 animate-scale-up text-right">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-foreground">
                    تنبيه: مرحلة "{currentTab.label}" لم تُعتمد بعد
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stageStatus === "DRAFT"
                      ? "المرحلة حالياً في وضع التحرير والتعديل المفتوح (تمت إعادتها للتعديل أو لم تُعتمد بعد)."
                      : "المرحلة ما زالت قيد المراجعة وبانتظار قرارك الإداري."}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 text-xs leading-relaxed text-foreground space-y-2">
                <p className="font-bold text-amber-700 dark:text-amber-400">
                  هل ترغب في اعتماد هذه المرحلة الآن وتصريح المتابعة للمرحلة التالية؟
                </p>
                <p className="text-muted-foreground text-[11px]">
                  • الضغط على "اعتماد وتصريح المتابعة" يغلق المرحلة ويعتمدها رسمياً وينقلك للمرحلة التالية.
                  <br />
                  • الضغط على "المتابعة للمعاينة فقط" ينقلك للمرحلة التالية مع إبقاء هذه المرحلة في وضع التعديل.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    approveStage(currentTabId, currentTab.label);
                    const target = advanceModalTarget;
                    setAdvanceModalTarget(null);
                    handleGo(target);
                  }}
                  className="w-full sm:flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  <span>اعتماد المرحلة وتصريح المتابعة ✓</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const target = advanceModalTarget;
                    setAdvanceModalTarget(null);
                    handleGo(target);
                  }}
                  className="w-full sm:w-auto h-11 px-4 border-border font-bold text-xs rounded-xl cursor-pointer"
                >
                  <span>المتابعة للمعاينة فقط &larr;</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAdvanceModalTarget(null)}
                  className="w-full sm:w-auto h-11 px-3 text-muted-foreground hover:text-foreground font-semibold text-xs cursor-pointer"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
