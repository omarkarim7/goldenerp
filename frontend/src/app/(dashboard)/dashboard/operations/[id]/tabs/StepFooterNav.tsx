"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Sparkles, CheckCircle2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LIFECYCLE_TABS, TabDef } from "./types";
import { useStageLock } from "../StageLockContext";

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

  const handleGo = (targetId: string) => {
    if (onNavigate) {
      onNavigate(targetId);
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const { isStageLocked, lockStage, unlockStage } = useStageLock();
  const isLocked = isStageLocked(currentTabId);

  return (
    <div className="pt-6 pb-2">
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

        {/* Actions: Stage Lock Button + Next Step Button */}
        <div className="w-full sm:w-auto flex flex-wrap items-center justify-end gap-2.5">
          {/* زر قفل / فتح المرحلة */}
          {isLocked ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => unlockStage(currentTabId, currentTab.label)}
              className="w-full sm:w-auto h-11 px-4 sm:px-5 rounded-2xl border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/25 font-bold text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
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
              className="w-full sm:w-auto h-11 px-4 sm:px-5 rounded-2xl border-border bg-card hover:bg-amber-500/10 hover:border-amber-500/40 text-foreground font-bold text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 group"
              title="قفل المرحلة وتثبيت كافة بياناتها لمنع التعديل"
            >
              <Lock className="h-4 w-4 text-muted-foreground group-hover:text-amber-600 transition-colors" />
              <span>قفل المرحلة 🔒</span>
            </Button>
          )}

          {nextTab ? (
            <Button
              type="button"
              onClick={() => handleGo(nextTab.id)}
              className="w-full sm:w-auto h-11 px-5 sm:px-7 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-700 hover:via-indigo-700 hover:to-emerald-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-500/25 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2 group shrink-0"
            >
              <span>{nextLabel || `الانتقال إلى: #${nextTab.order} ${nextTab.shortLabel}`}</span>
              <ChevronLeft className="h-4.5 w-4.5 transition-transform group-hover:-translate-x-1.5 text-white" />
            </Button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>المرحلة النهائية للعملية</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
