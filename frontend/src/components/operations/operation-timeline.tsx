"use client";

import React, { useState } from "react";
import {
  FileText, BookOpen, Send, FolderOpen, CheckCircle2,
  Coins, Trophy, Truck, ClipboardCheck, ShieldCheck,
  ChevronLeft, ArrowLeft, Sparkles, AlertTriangle, Clock,
  Check, ArrowRight, ShieldAlert, Layers
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TimelineStage {
  id: string;
  order: number;
  statusCode: string;
  name: string;
  shortName: string;
  description: string;
  actionHint: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const LIFECYCLE_STAGES: TimelineStage[] = [
  {
    id: "draft",
    order: 1,
    statusCode: "DRAFT",
    name: "مسودة وتسجيل مبدئي",
    shortName: "مسودة",
    description: "تسجيل العملية المبدئي ودراسة الشروط والمواصفات",
    actionHint: "يلزم استكمال بيانات العملية وتحديد الشركة المقدمة",
    icon: FileText,
    color: "slate",
  },
  {
    id: "booklet",
    order: 2,
    statusCode: "BOOKLET_WITHDRAWN",
    name: "شراء وسحب الكراسة",
    shortName: "سحب الكراسة",
    description: "سداد الرسوم وسحب كراسة الشروط والمواصفات بالخزينة",
    actionHint: "تم سحب الكراسة، يلزم دراسة التكاليف والأسعار",
    icon: BookOpen,
    color: "blue",
  },
  {
    id: "submitted",
    order: 3,
    statusCode: "SUBMITTED",
    name: "تقديم المظاريف والتأمين",
    shortName: "تقديم العطاء",
    description: "تسليم المظروفين الفني والمالي والتأمين الابتدائي للجهة",
    actionHint: "تم التقديم رسمياً وبانتظار موعد جلسة الفتح الفني",
    icon: Send,
    color: "purple",
  },
  {
    id: "tech_opened",
    order: 4,
    statusCode: "TECHNICAL_OPENED",
    name: "جلسة الفتح الفني",
    shortName: "فتح فني",
    description: "انعقاد جلسة فض المظاريف الفنية بمقر جهة الإسناد",
    actionHint: "المظاريف الفنية قيد الدراسة من اللجنة الهندسية",
    icon: FolderOpen,
    color: "indigo",
  },
  {
    id: "tech_accepted",
    order: 5,
    statusCode: "TECHNICAL_ACCEPTED",
    name: "البت والقبول الفني",
    shortName: "مقبول فنياً",
    description: "اجتياز المطابقة الفنية وإعلان القبول رسمياً",
    actionHint: "العرض مقبول فنياً ومؤهل لدخول جلسة الفتح المالي",
    icon: CheckCircle2,
    color: "teal",
  },
  {
    id: "fin_opened",
    order: 6,
    statusCode: "FINANCIAL_OPENED",
    name: "جلسة الفتح المالي",
    shortName: "فتح مالي",
    description: "فض المظاريف المالية ومقارنة الأسعار والعطاءات",
    actionHint: "تم فتح الأسعار وبانتظار الترتيب وقرار لجنة البت",
    icon: Coins,
    color: "cyan",
  },
  {
    id: "awarded",
    order: 7,
    statusCode: "AWARDED",
    name: "الترسية والفوز بالعطاء",
    shortName: "ترسية وفوز",
    description: "إخطار الترسية الرسمي من السلطة المختصة واعتماد الفوز",
    actionHint: "مطلوب إصدار خطاب الضمان النهائي 5% وتوقيع العقد",
    icon: Trophy,
    color: "amber",
  },
  {
    id: "supply",
    order: 8,
    statusCode: "SUPPLY_IN_PROGRESS",
    name: "حالة التوريد والتنفيذ",
    shortName: "حالة التوريد",
    description: "حصر وتجهيز الأصناف المقبولة ومقارنة الأسعار مع دراسة السوق والتوريد بالمخازن",
    actionHint: "جاري حظر وتجهيز الأصناف وإصدار أذونات الإضافة والفحص المبدئي",
    icon: Truck,
    color: "blue",
  },
  {
    id: "completed",
    order: 9,
    statusCode: "COMPLETED",
    name: "الاستلام والفحص النهائي",
    shortName: "استلام نهائي",
    description: "فحص الشحنات واعتماد محضر الاستلام النهائي ومستخلص الختامي",
    actionHint: "تم الاستلام النهائي بنجاح وبانتظار استرداد التأمينات",
    icon: ClipboardCheck,
    color: "emerald",
  },
  {
    id: "closed",
    order: 10,
    statusCode: "CLOSED",
    name: "إغلاق واسترداد التأمينات",
    shortName: "إغلاق تام",
    description: "صرف كامل المستحقات واسترداد خطابات الضمان البنكية بالكامل",
    actionHint: "العملية مكتملة ومغلقة محاسبياً وقانونياً",
    icon: ShieldCheck,
    color: "slate",
  },
];

export function getStageIndex(status: string): number {
  if (status === "TECHNICAL_REJECTED" || status === "GRIEVANCE_FILED") {
    return 4; // associated with technical acceptance stage
  }
  if (status === "FINANCIAL_REJECTED") {
    return 5; // associated with financial opening stage
  }
  if (status === "CANCELLED" || status === "ARCHIVED") {
    return 9;
  }
  const idx = LIFECYCLE_STAGES.findIndex((s) => s.statusCode === status);
  return idx >= 0 ? idx : 0;
}

interface OperationLifecycleTimelineProps {
  currentStatus: string;
  onStatusChange?: (newStatus: string) => Promise<void> | void;
  isInteractive?: boolean;
  variant?: "full" | "compact" | "preview";
  operationDates?: Array<{ id: string; type: string; date: string; notes?: string | null }>;
}

export function OperationLifecycleTimeline({
  currentStatus,
  onStatusChange,
  isInteractive = true,
  variant = "full",
  operationDates = [],
}: OperationLifecycleTimelineProps) {
  const currentIndex = getStageIndex(currentStatus);
  const currentStage = LIFECYCLE_STAGES[currentIndex] || LIFECYCLE_STAGES[0];
  const [updating, setUpdating] = useState(false);
  const [selectedStageIndex, setSelectedStageIndex] = useState<number>(currentIndex);

  const activeStageDetails = LIFECYCLE_STAGES[selectedStageIndex] || currentStage;
  const progressPercent = Math.round(((currentIndex + 1) / LIFECYCLE_STAGES.length) * 100);

  const handleAdvance = async (newStatusCode: string) => {
    if (!onStatusChange || updating) return;
    setUpdating(true);
    try {
      await onStatusChange(newStatusCode);
    } finally {
      setUpdating(false);
    }
  };

  // Preview Mode: for new operation creation screen
  if (variant === "preview") {
    return (
      <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-blue-600/10 via-indigo-500/5 to-purple-600/10 border border-blue-500/25 space-y-4 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between flex-wrap gap-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-black text-foreground">
                المسار الزمني لمراحل المناقصة ودورة حياتها الرسمية (Tender Lifecycle Roadmap)
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                تتدرج المناقصة عبر 10 مراحل نظامية تبدأ بالمسودة وسحب الكراسة وحتى الترسية والتوريد والإغلاق التام
              </p>
            </div>
          </div>
          <Badge className="bg-blue-600/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-bold text-xs px-3 py-1">
            دورة حياة قياسية (10 مراحل)
          </Badge>
        </div>

        {/* 10 graphic stages grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 relative z-10">
          {LIFECYCLE_STAGES.map((s, idx) => {
            const StageIcon = s.icon;
            const isInitial = idx === 0;
            return (
              <div
                key={s.id}
                className={cn(
                  "p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 group relative overflow-hidden",
                  isInitial
                    ? "bg-blue-600/15 border-blue-500/50 text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-blue-500/30"
                    : "bg-card/70 border-border hover:border-blue-400/40 text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center justify-between w-full text-[10px] font-mono px-1">
                  <span
                    className={cn(
                      "font-bold px-1.5 py-0.5 rounded-md",
                      isInitial ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"
                    )}
                  >
                    #{s.order}
                  </span>
                  {isInitial && (
                    <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">نقطة البداية</span>
                  )}
                </div>

                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                    isInitial
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                      : "bg-muted text-foreground"
                  )}
                >
                  <StageIcon className="h-4 w-4" />
                </div>

                <div className="space-y-0.5">
                  <span className="text-xs font-bold block text-foreground truncate max-w-[130px]">
                    {s.shortName}
                  </span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1 block leading-tight">
                    {s.description.split(" ")[0]} {s.description.split(" ")[1]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Compact Mode: for cards in operations list
  if (variant === "compact") {
    return (
      <div className="space-y-2 py-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground font-semibold flex items-center gap-1">
            <Clock className="h-3 w-3 text-blue-500" />
            <span>المرحلة:</span>
            <span className="font-bold text-foreground">{currentStage.shortName}</span>
          </span>
          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
            {currentIndex + 1} من {LIFECYCLE_STAGES.length} ({progressPercent}%)
          </span>
        </div>

        {/* Multi-step progress bar */}
        <div className="w-full h-2 rounded-full bg-muted/80 overflow-hidden flex gap-0.5 p-0.5 border border-border/50">
          {LIFECYCLE_STAGES.map((s, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            return (
              <div
                key={s.id}
                className={cn(
                  "flex-1 h-full rounded-sm transition-all",
                  isCompleted
                    ? "bg-emerald-500"
                    : isCurrent
                    ? "bg-blue-600 animate-pulse"
                    : "bg-muted-foreground/20"
                )}
                title={`مرحلة ${idx + 1}: ${s.name}`}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Full Graphical Timeline Mode: for Operation Detail Page (/dashboard/operations/[id])
  return (
    <div className="rounded-3xl glass-card p-5 sm:p-6 border border-border shadow-xl space-y-5 relative overflow-hidden">
      {/* Background glow decoration */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header of Timeline */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>المسار الزمني المعتمد للمناقصة (Tender Lifecycle Timeline)</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <h3 className="text-xl sm:text-2xl font-black text-foreground">
              المرحلة الحالية: <span className="text-blue-600 dark:text-blue-400">{currentStage.name}</span>
            </h3>
            <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-mono font-bold text-xs px-2.5 py-0.5 shadow-xs">
              مرحلة {currentIndex + 1} من {LIFECYCLE_STAGES.length} • {progressPercent}%
            </Badge>
          </div>
        </div>

        {/* Quick Stage Transition Actions */}
        {isInteractive && onStatusChange && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {currentIndex < LIFECYCLE_STAGES.length - 1 && (
              <Button
                onClick={() => handleAdvance(LIFECYCLE_STAGES[currentIndex + 1].statusCode)}
                disabled={updating}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <span>نقل للمرحلة التالية ({LIFECYCLE_STAGES[currentIndex + 1].shortName})</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}

            {currentIndex > 0 && (
              <Button
                onClick={() => handleAdvance(LIFECYCLE_STAGES[currentIndex - 1].statusCode)}
                disabled={updating}
                variant="outline"
                className="border-border text-muted-foreground hover:text-foreground text-xs h-9 px-3 rounded-xl cursor-pointer"
              >
                <span>رجوع للمرحلة السابقة</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Progress Line Bar Overview */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
          <span>نسبة إنجاز دورة حياة العملية</span>
          <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{progressPercent}% مكتمل</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-muted/80 p-0.5 border border-border/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 transition-all duration-500 shadow-sm"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Graphical Stepper: 10 Panoramic Interactive Nodes */}
      <div className="relative overflow-x-auto pb-4 pt-2 -mx-2 px-2 scrollbar-thin">
        <div className="flex items-start min-w-[920px] justify-between relative">
          {/* Continuous Connecting Line Behind Nodes */}
          <div className="absolute top-5 right-8 left-8 h-1 bg-border/80 -z-0" />
          <div
            className="absolute top-5 right-8 h-1 bg-emerald-500 transition-all duration-500 -z-0"
            style={{
              width: `${(Math.min(currentIndex, LIFECYCLE_STAGES.length - 1) / (LIFECYCLE_STAGES.length - 1)) * 95}%`,
            }}
          />

          {LIFECYCLE_STAGES.map((stage, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const isSelected = idx === selectedStageIndex;
            const StageIcon = stage.icon;

            return (
              <div
                key={stage.id}
                onClick={() => setSelectedStageIndex(idx)}
                className="flex flex-col items-center text-center cursor-pointer group relative z-10 w-24 shrink-0 transition-transform select-none"
              >
                {/* Node Circle */}
                <div
                  className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xs transition-all duration-200 border-2 shadow-sm",
                    isCompleted
                      ? "bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20 group-hover:scale-110"
                      : isCurrent
                      ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-white ring-4 ring-blue-500/30 shadow-lg shadow-blue-500/40 scale-110 animate-bounce-subtle"
                      : "bg-card text-muted-foreground border-border group-hover:border-blue-400 group-hover:scale-105"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5 stroke-[2.5]" />
                  ) : (
                    <StageIcon className="h-5 w-5" />
                  )}
                </div>

                {/* Step Order Badge */}
                <span
                  className={cn(
                    "mt-2 text-[10px] font-mono font-black px-1.5 py-0.2 rounded-md",
                    isCurrent
                      ? "bg-blue-600 text-white font-extrabold"
                      : isCompleted
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  #{stage.order}
                </span>

                {/* Stage Title */}
                <p
                  className={cn(
                    "mt-1 text-xs font-bold leading-tight line-clamp-2 px-1 transition-colors",
                    isCurrent
                      ? "text-blue-600 dark:text-blue-400 font-black"
                      : isCompleted
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  {stage.shortName}
                </p>

                {/* Current Stage Indicator Tag */}
                {isCurrent && (
                  <span className="mt-1 px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 font-black text-[9px] border border-blue-500/30 whitespace-nowrap animate-pulse">
                    الآن
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Stage Detail Insight Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all animate-fade-in">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30 font-black text-lg">
            {activeStageDetails.order}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base font-extrabold text-foreground">
                المرحلة {activeStageDetails.order}: {activeStageDetails.name}
              </h4>
              {selectedStageIndex === currentIndex ? (
                <Badge className="bg-blue-600 text-white text-[10px] font-bold">
                  المرحلة النشطة الحالية
                </Badge>
              ) : selectedStageIndex < currentIndex ? (
                <Badge className="badge-emerald text-[10px] font-bold">
                  تم اجتيازها بنجاح ✓
                </Badge>
              ) : (
                <Badge className="bg-muted text-muted-foreground text-[10px]">
                  مرحلة مستقبلية قادمة
                </Badge>
              )}
            </div>
            <p className="text-xs text-foreground font-medium leading-relaxed">
              {activeStageDetails.description}
            </p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
              <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>الإجراء المطلوب: {activeStageDetails.actionHint}</span>
            </p>
          </div>
        </div>

        {/* Action Button to switch to this stage directly */}
        {isInteractive && onStatusChange && selectedStageIndex !== currentIndex && (
          <Button
            onClick={() => handleAdvance(activeStageDetails.statusCode)}
            disabled={updating}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs shrink-0 cursor-pointer"
          >
            <span>تعيين العملية لهذه المرحلة</span>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
