"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Clock,
  ArrowRight,
  ArrowLeft,
  FileText,
  Printer,
  Download,
  Upload,
  Eye,
  RefreshCw,
  FileCheck,
  Scale,
  DollarSign,
  Layers,
  GitBranch,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Building2,
  Sparkles,
  ShieldAlert,
  HelpCircle,
  Send,
  Check,
  X,
  FileSpreadsheet,
  PackageCheck,
  FolderArchive,
  ExternalLink,
  ArrowDown,
  CornerDownLeft,
  Edit,
  Receipt,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Portal } from "@/components/ui/portal";
import { toast } from "sonner";
import api from "@/lib/api";
import { StepFooterNav } from "./tabs/StepFooterNav";
import { FinalInsuranceRefundSection } from "./tabs/FinalInsuranceRefundSection";
import { GrievanceLetterSection } from "./tabs/GrievanceLetterSection";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   HELPERS & FORMATTERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function tafqeetArabic(num: number): string {
  if (!num || isNaN(num) || num === 0) return "صفر جنيه مصري لا غير";
  num = Math.floor(Math.abs(num));

  const ones = [
    "",
    "واحد",
    "اثنان",
    "ثلاثة",
    "أربعة",
    "خمسة",
    "ستة",
    "سبعة",
    "ثمانية",
    "تسعة",
    "عشرة",
  ];
  const teens = [
    "أحد عشر",
    "اثنا عشر",
    "ثلاثة عشر",
    "أربعة عشر",
    "خمسة عشر",
    "ستة عشر",
    "سبعة عشر",
    "ثمانية عشر",
    "تسعة عشر",
  ];
  const tens = [
    "",
    "عشرة",
    "عشرون",
    "ثلاثون",
    "أربعون",
    "خمسون",
    "ستون",
    "سبعون",
    "ثمانون",
    "تسعون",
  ];
  const hundreds = [
    "",
    "مائة",
    "مئتان",
    "ثلاثمائة",
    "أربعمائة",
    "خمسمائة",
    "ستمائة",
    "سبعمائة",
    "ثمانمائة",
    "تسعمائة",
  ];

  function convertGroup(n: number): string {
    let res = "";
    const h = Math.floor(n / 100);
    const r = n % 100;
    if (h > 0) res += hundreds[h];
    if (r > 0) {
      if (res) res += " و ";
      if (r <= 10) res += ones[r];
      else if (r < 20) res += teens[r - 11];
      else {
        const u = r % 10;
        const t = Math.floor(r / 10);
        if (u > 0) res += ones[u] + " و " + tens[t];
        else res += tens[t];
      }
    }
    return res;
  }

  const billions = Math.floor(num / 1000000000);
  num %= 1000000000;
  const millions = Math.floor(num / 1000000);
  num %= 1000000;
  const thousands = Math.floor(num / 1000);
  const remainder = num % 1000;

  const parts: string[] = [];
  if (billions > 0)
    parts.push(
      billions === 1 ? "مليار" : billions === 2 ? "ملياران" : convertGroup(billions) + " مليار"
    );
  if (millions > 0)
    parts.push(
      millions === 1 ? "مليون" : millions === 2 ? "مليونان" : convertGroup(millions) + " مليون"
    );
  if (thousands > 0)
    parts.push(
      thousands === 1 ? "ألف" : thousands === 2 ? "ألفان" : convertGroup(thousands) + " ألف"
    );
  if (remainder > 0) parts.push(convertGroup(remainder));

  return `فقط وقدره ${parts.join(" و ")} جنيه مصري لا غير`;
}

function SectionCard({
  title,
  icon: Icon,
  iconColor = "text-blue-600 dark:text-blue-400",
  badge,
  children,
  actions,
}: {
  title: string;
  icon: any;
  iconColor?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="bg-card text-card-foreground rounded-2xl p-5 sm:p-6 border border-border shadow-xs dark:shadow-md space-y-4 transition-all">
      <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl bg-primary/10 ${iconColor} flex items-center justify-center`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
          <h3 className="font-bold text-foreground text-base">{title}</h3>
          {badge}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PRINTABLE EGYPTIAN OFFICIAL LETTERHEAD MODAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function EgyptianOfficialLetterModal({
  isOpen,
  onClose,
  title,
  subTitle,
  op,
  company,
  contentHtml,
  onSaveToArchive,
  onSyncFinancialOffer,
  syncingOffer,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subTitle: string;
  op: any;
  company?: any;
  contentHtml: string;
  onSaveToArchive?: () => Promise<void>;
  onSyncFinancialOffer?: () => Promise<void>;
  syncingOffer?: boolean;
}) {
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadWord = () => {
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${title}</title>
      <style>
        body { font-family: 'Cairo', Arial, sans-serif; direction: rtl; text-align: right; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #000; padding: 6px; }
      </style>
      </head><body>
    `;
    const footer = "</body></html>";
    const fullHtml = header + contentHtml + footer;
    const blob = new Blob(["\ufeff" + fullHtml], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("تم تنزيل المستند بصيغة Word بنجاح! 📄");
  };

  const handleArchive = async () => {
    if (!onSaveToArchive) return;
    setSaving(true);
    try {
      await onSaveToArchive();
      toast.success("تم اعتماد وسحب المستند إلى أرشيف العملية الرقمي بنجاح! 🏛️");
      onClose();
    } catch {
      toast.error("فشل حفظ المستند في الأرشيف");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[99999] bg-black/75 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
        <div className="bg-card text-card-foreground border border-border rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
          {/* Header Bar */}
          <div className="p-4 bg-muted/40 border-b border-border flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm sm:text-base">{title}</h3>
                <p className="text-xs text-muted-foreground">{subTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handlePrint}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>طباعة رسمية</span>
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadWord}
                variant="outline"
                className="text-xs h-8 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Word (.doc)</span>
              </Button>
              {onSyncFinancialOffer && (
                <Button
                  size="sm"
                  onClick={onSyncFinancialOffer}
                  disabled={syncingOffer}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-8 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="تحديث بنود العرض المالي في مرحلة العرض المالي لتطابق البنود المقبولة فقط"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{syncingOffer ? "جاري التحديث..." : "تحديث العرض المالي بالبنود المقبولة 💾"}</span>
                </Button>
              )}
              {onSaveToArchive && (
                <Button
                  size="sm"
                  onClick={handleArchive}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <FolderArchive className="h-3.5 w-3.5" />
                  <span>{saving ? "جاري الحفظ..." : "إضافة للأرشيف 📥"}</span>
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground h-8 w-8 p-0 rounded-xl"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Printable Letterhead Paper */}
          <div className="p-6 sm:p-10 bg-muted/30 overflow-y-auto flex justify-center">
            <div className="print-area bg-white text-slate-900 rounded-xl shadow-xl p-8 sm:p-12 w-full max-w-[800px] border border-slate-300 min-h-[900px] flex flex-col justify-between leading-relaxed font-sans text-sm">
              {/* Formal Egyptian Header */}
              <div>
                <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-start justify-between">
                  <div className="text-right space-y-1">
                    <h4 className="font-black text-base text-slate-900">
                      {company?.name || "شركة التعاقدات والتوريدات العامة (GoldenERP)"}
                    </h4>
                    <p className="text-xs text-slate-600">
                      س.ت: {company?.crNumber || "10293847"} • ب.ض: {company?.taxNumber || "987-654-321"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      العنوان: {company?.address || "جمهورية مصر العربية — القاهرة"}
                    </p>
                  </div>
                  <div className="text-center px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50">
                    <span className="text-[10px] text-slate-500 block font-bold">الرقم المرجعي الرسمي</span>
                    <span className="font-mono font-bold text-xs text-blue-700">
                      {op?.externalNumber || `#OP-${op?.serialNumber || "2026"}`}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      التاريخ: {new Date().toLocaleDateString("ar-EG")}
                    </span>
                  </div>
                </div>

                {/* Authority Addressee */}
                <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p className="font-bold text-sm text-slate-800">
                    السيد الأستاذ / رئيس جهة الإسناد — {op?.authority || "الجهة الحكومية المختصة"}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    تحية طيبة وبعد ،،،
                  </p>
                  <p className="text-xs font-semibold text-blue-900 mt-2">
                    الموضوع: {title} بشأن عملية ({op?.name || "المناقصة العامة"})
                  </p>
                </div>

                {/* Custom Body Content */}
                <div
                  className="prose prose-sm max-w-none text-slate-800 leading-relaxed text-justify space-y-3"
                  dangerouslySetInnerHTML={{ __html: contentHtml }}
                />
              </div>

              {/* Official Egyptian Signatures & Stamp */}
              <div className="pt-8 border-t border-slate-300 mt-8">
                <div className="grid grid-cols-2 gap-8 text-center text-xs">
                  <div>
                    <p className="font-bold text-slate-700">المسؤول القانوني / الفني</p>
                    <p className="text-[11px] text-slate-500 mt-1">التوقيع: ................................</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">الممثل القانوني للشركة / المدير العام</p>
                    <p className="text-[11px] text-slate-500 mt-1">خاتم الشركة وتفويض التوقيع</p>
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-400 mx-auto mt-3 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                      بصمة الخاتم
                    </div>
                  </div>
                </div>
                <div className="mt-6 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-2 font-mono">
                  حرر هذا المستند وفقاً لأحكام القانون رقم 182 لسنة 2018 بشأن تنظيم التعاقدات العامة ولائحته التنفيذية
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   INTERACTIVE GRAPHIC DECISION TREE COMPONENT (Downward Cascading Timeline)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function OpeningDecisionTree({
  stage,
  activeBranch,
  onSelectBranch,
  statusLabel,
  grievanceOutcome,
  onSelectGrievanceOutcome,
  isLocked,
}: {
  stage: "tech" | "fin";
  activeBranch: string;
  onSelectBranch: (branch: string) => void;
  statusLabel?: string;
  grievanceOutcome?: string | null;
  onSelectGrievanceOutcome?: (outcome: string) => void;
  isLocked?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (stage === "tech") {
    return (
      <div className="rounded-3xl border border-blue-200/80 dark:border-blue-900/50 bg-gradient-to-b from-blue-50/80 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 p-5 sm:p-6 shadow-xs dark:shadow-xl transition-all">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-blue-100 dark:border-slate-800 mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                  مخطط وشجرة مسارات وقرارات البت الفني
                </h4>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 font-bold">
                  قانون 182/2018
                </span>
                {isLocked && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                    مسجل ومعتمد 🔒
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                المسار الحالي: <strong className="text-blue-600 dark:text-blue-400">{statusLabel || "جلسة البت الفني"}</strong>
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs h-8 px-3 rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            {isExpanded ? (
              <span className="flex items-center gap-1.5 font-bold">طي الشجرة <ChevronUp className="h-3.5 w-3.5" /></span>
            ) : (
              <span className="flex items-center gap-1.5 font-bold">عرض الشجرة التفاعلية <ChevronDown className="h-3.5 w-3.5" /></span>
            )}
          </Button>
        </div>

        {isExpanded && (
          <div className="pt-2 overflow-x-auto">
            {/* Visual Tree Layout */}
            <div className="min-w-[760px] flex flex-col items-center gap-3 py-2">
              {/* Root Node */}
              <div className="relative z-10 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border-2 border-blue-400/60 dark:border-blue-500/50 text-center shadow-md shadow-blue-500/10 flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
                </span>
                <div className="text-right">
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold block">نقطة الانطلاق الرسمية</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Scale className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    جلسة البت الفني وفحص المظاريف
                  </span>
                </div>
              </div>

              {/* Connecting Trunk & Arms */}
              <div className="w-full flex justify-center items-center relative h-7">
                <div className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-slate-300 dark:to-slate-700" />
                <div className="absolute top-1/2 w-3/5 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
              </div>

              {/* Level 1: Two Decision Branches */}
              <div className="w-full grid grid-cols-2 gap-6 relative">
                {/* Branch A: Accepted */}
                <div className="flex flex-col items-center gap-2.5">
                  <div className="w-0.5 h-3 bg-emerald-400 dark:bg-emerald-600" />

                  {/* Accept Node Button */}
                  <button
                    type="button"
                    onClick={() => onSelectBranch("ACCEPTED")}
                    className={`w-full p-4 rounded-2xl border-2 transition-all text-right cursor-pointer relative ${
                      activeBranch === "ACCEPTED"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-4 ring-emerald-500/15 shadow-md shadow-emerald-500/10"
                        : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                        المسار 1: قبول العطاء فنياً ✓
                      </span>
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-600/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 text-[10px] font-bold">
                        مستوفي الشروط
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 font-medium leading-relaxed">
                      اجتياز التقييم الفني والمطابقة الكاملة للمواصفات
                    </p>
                  </button>

                  {/* Downward Arrow */}
                  <div className="flex items-center justify-center text-emerald-500">
                    <ArrowDown className="h-4 w-4" />
                  </div>

                  {/* Sub Node: Schedule Financial Opening */}
                  <div className="w-full p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-right space-y-1 shadow-xs">
                    <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                      الخطوة التالية: تحديد موعد جلسة الفتح المالي
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 block font-medium">
                      جدولة التاريخ والوقت في المواعيد ثم الانتقال المباشر للبت المالي ➡️
                    </span>
                  </div>
                </div>

                {/* Branch B: Rejected */}
                <div className="flex flex-col items-center gap-2.5">
                  <div className="w-0.5 h-3 bg-rose-400 dark:bg-rose-600" />

                  {/* Reject Node Button */}
                  <button
                    type="button"
                    onClick={() => onSelectBranch("REJECTED")}
                    className={`w-full p-4 rounded-2xl border-2 transition-all text-right cursor-pointer relative ${
                      activeBranch === "REJECTED"
                        ? "bg-rose-50 dark:bg-rose-950/40 border-rose-500 ring-4 ring-rose-500/15 shadow-md shadow-rose-500/10"
                        : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-rose-400 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-rose-700 dark:text-rose-400 flex items-center gap-2">
                        <XCircle className="h-4.5 w-4.5 text-rose-600 dark:text-rose-400" />
                        المسار 2: استبعاد / رفض فني ✗
                      </span>
                      <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-600/20 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 text-[10px] font-bold">
                        غير مطابق
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 font-medium leading-relaxed">
                      استبعاد العطاء وفتح مسار التظلم القانوني (مادة 42)
                    </p>
                  </button>

                  {/* Downward Arrow to Grievance */}
                  <div className="flex items-center justify-center text-rose-500">
                    <ArrowDown className="h-4 w-4" />
                  </div>

                  {/* Sub Node 1: Grievance Submission */}
                  <div className="w-full p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-right space-y-1 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-amber-700 dark:text-amber-400 font-black flex items-center gap-1.5">
                        <Scale className="h-3.5 w-3.5 text-amber-600" />
                        تقديم تظلم قانوني رسمي (خلال 7 أيام عمل)
                      </span>
                      <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] font-mono font-bold">
                        مادة 42
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 block font-medium">
                      توليد كود التظلم المشفر وإخطار السلطة المختصة رسمياً
                    </span>
                  </div>

                  {/* Downward Arrow to Waiting for Reply */}
                  <div className="flex items-center justify-center text-amber-500">
                    <ArrowDown className="h-4 w-4" />
                  </div>

                  {/* Sub Node 2: Waiting for entity reply */}
                  <div className="w-full p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-center shadow-xs">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center justify-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 animate-spin text-blue-600" />
                      في انتظار نتيجة التظلم من الجهة الإدارية ⏳
                    </span>
                  </div>

                  {/* Downward Trunk for Grievance 3 Outcomes */}
                  <div className="w-full flex justify-center items-center relative h-5">
                    <div className="absolute top-0 bottom-0 w-0.5 bg-blue-400" />
                    <div className="absolute top-1/2 w-5/6 h-0.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
                  </div>

                  {/* 3 Cascading Downward Grievance Branches */}
                  <div className="w-full grid grid-cols-3 gap-2">
                    {/* Outcome 1: Accept All */}
                    <div
                      onClick={() => onSelectGrievanceOutcome?.("ACCEPTED")}
                      className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                        grievanceOutcome === "ACCEPTED"
                          ? "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/30"
                          : "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400"
                      }`}
                    >
                      <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 block">
                        1. قبول كلي 🟢
                      </span>
                      <span className="text-[9px] text-emerald-700 dark:text-emerald-400 block mt-0.5 leading-tight">
                        كافة الأصناف وعودة للفتح المالي
                      </span>
                    </div>

                    {/* Outcome 2: Accept Partial */}
                    <div
                      onClick={() => onSelectGrievanceOutcome?.("PARTIALLY_ACCEPTED")}
                      className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                        grievanceOutcome === "PARTIALLY_ACCEPTED"
                          ? "bg-amber-100 dark:bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/30"
                          : "bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 hover:border-amber-400"
                      }`}
                    >
                      <span className="text-[11px] font-black text-amber-800 dark:text-amber-300 block">
                        2. قبول جزئي 🟡
                      </span>
                      <span className="text-[9px] text-amber-700 dark:text-amber-400 block mt-0.5 leading-tight">
                        بعض الأصناف واستمرار المنافسة
                      </span>
                    </div>

                    {/* Outcome 3: Reject */}
                    <div
                      onClick={() => onSelectGrievanceOutcome?.("REJECTED")}
                      className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                        grievanceOutcome === "REJECTED"
                          ? "bg-rose-100 dark:bg-rose-950/60 border-rose-500 ring-2 ring-rose-500/30"
                          : "bg-rose-50/80 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 hover:border-rose-400"
                      }`}
                    >
                      <span className="text-[11px] font-black text-rose-800 dark:text-rose-300 block">
                        3. رفض التظلم 🔴
                      </span>
                      <span className="text-[9px] text-rose-700 dark:text-rose-400 block mt-0.5 leading-tight">
                        استرداد التأمين الابتدائي فوراً
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Financial Stage Tree
  return (
    <div className="rounded-3xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-b from-indigo-50/80 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 p-5 sm:p-6 shadow-xs dark:shadow-xl transition-all">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-indigo-100 dark:border-slate-800 mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                مخطط وشجرة مسارات وقرارات البت المالي والترسية
              </h4>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 font-bold">
                الترسية والتوريد
              </span>
              {isLocked && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                  مسجل ومعتمد 🔒
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              المسار الحالي: <strong className="text-indigo-600 dark:text-indigo-400">{statusLabel || "جلسة البت المالي"}</strong>
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs h-8 px-3 rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          {isExpanded ? (
            <span className="flex items-center gap-1.5 font-bold">طي الشجرة <ChevronUp className="h-3.5 w-3.5" /></span>
          ) : (
            <span className="flex items-center gap-1.5 font-bold">عرض الشجرة التفاعلية <ChevronDown className="h-3.5 w-3.5" /></span>
          )}
        </Button>
      </div>

      {isExpanded && (
        <div className="pt-2 overflow-x-auto">
          <div className="min-w-[860px] flex flex-col items-center gap-4 py-2">
            {/* Root Node */}
            <div className="relative z-10 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border-2 border-indigo-400/50 dark:border-indigo-500/40 text-center shadow-md shadow-indigo-500/10 flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-600"></span>
              </span>
              <div className="text-right">
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold block">جلسة فتح المظاريف المالية</span>
                <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  فض المظاريف المالية وترتيب الأسعار
                </span>
              </div>
            </div>

            {/* Connecting Trunk & Arms */}
            <div className="w-full flex justify-center items-center relative h-8">
              <div className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-slate-300 dark:to-slate-700" />
              <div className="absolute top-1/2 w-4/5 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
            </div>

            {/* 3 Outcome Branches */}
            <div className="w-full grid grid-cols-3 gap-5">
              {/* Branch 1: Accept All */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-0.5 h-3 bg-emerald-400 dark:bg-emerald-600" />
                <button
                  type="button"
                  onClick={() => onSelectBranch("ACCEPT_ALL")}
                  className={`w-full p-4 rounded-2xl border-2 transition-all text-right cursor-pointer ${
                    activeBranch === "ACCEPT_ALL"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-4 ring-emerald-500/15 shadow-md shadow-emerald-500/10"
                      : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      1. قبول كل الأصناف ✓
                    </span>
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-600/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 text-[9px] font-bold">
                      ترسية كاملة
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 font-medium leading-relaxed">
                    أقل سعر مطابق لكافة بنود العطاء
                  </p>
                </button>
                <div className="flex items-center justify-center text-emerald-500">
                  <ArrowDown className="h-4 w-4" />
                </div>
                <div className="w-full p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-right text-xs shadow-xs">
                  <strong className="text-emerald-800 dark:text-emerald-300 block flex items-center gap-1.5 font-bold">
                    <PackageCheck className="h-3.5 w-3.5 text-emerald-600" /> الاستعداد للترسية والشراء
                  </strong>
                  <span className="text-slate-600 dark:text-slate-300 mt-1 block font-medium">
                    الانتقال لمرحلة قرار الترسية وأمر التوريد 🏆
                  </span>
                </div>
              </div>

              {/* Branch 2: Accept Partial */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-0.5 h-3 bg-amber-400 dark:bg-amber-600" />
                <button
                  type="button"
                  onClick={() => onSelectBranch("ACCEPT_PARTIAL")}
                  className={`w-full p-4 rounded-2xl border-2 transition-all text-right cursor-pointer ${
                    activeBranch === "ACCEPT_PARTIAL"
                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-4 ring-amber-500/15 shadow-md shadow-amber-500/10"
                      : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs sm:text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <FileSpreadsheet className="h-4 w-4 text-amber-600" />
                      2. قبول بعض الأصناف ⚠️
                    </span>
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-600/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 text-[9px] font-bold">
                      ترسية جزئية
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 font-medium leading-relaxed">
                    قبول بنود واستبعاد بنود أخرى
                  </p>
                </button>
                <div className="flex items-center justify-center text-amber-500">
                  <ArrowDown className="h-4 w-4" />
                </div>
                <div className="w-full p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-right text-xs shadow-xs">
                  <strong className="text-amber-800 dark:text-amber-300 block flex items-center gap-1.5 font-bold">
                    <Layers className="h-3.5 w-3.5 text-amber-600" /> جدول BOQ تفاعلي
                  </strong>
                  <span className="text-slate-600 dark:text-slate-300 mt-1 block font-medium">
                    تعديل الكميات والأسعار وتوليد بيان الترسية الجزئية 📜
                  </span>
                </div>
              </div>

              {/* Branch 3: Rejected */}
              <div className="flex flex-col items-center gap-2.5">
                <div className="w-0.5 h-3 bg-rose-400 dark:bg-rose-600" />
                <button
                  type="button"
                  onClick={() => onSelectBranch("REJECTED")}
                  className={`w-full p-4 rounded-2xl border-2 transition-all text-right cursor-pointer ${
                    activeBranch === "REJECTED"
                      ? "bg-rose-50 dark:bg-rose-950/40 border-rose-500 ring-4 ring-rose-500/15 shadow-md shadow-rose-500/10"
                      : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-rose-400 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs sm:text-sm text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <XCircle className="h-4 w-4 text-rose-600" />
                      3. استبعاد / رفض مالي ✗
                    </span>
                    <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-600/20 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 text-[9px] font-bold">
                      استبعاد
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 font-medium leading-relaxed">
                    ارتفاع الأسعار أو عدم مطابقة العرض
                  </p>
                </button>

                <div className="flex items-center justify-center text-rose-500">
                  <ArrowDown className="h-4 w-4" />
                </div>

                <div className="w-full p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-right space-y-1 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-700 dark:text-amber-400 font-black flex items-center gap-1.5">
                      <Scale className="h-3.5 w-3.5 text-amber-600" />
                      تظلم مالي ومحاسبي رسمي
                    </span>
                    <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] font-mono font-bold">
                      مادة 42
                    </Badge>
                  </div>
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 block font-medium">
                    مطابقة الأسعار مع القيمة التقديرية ودراسات السوق
                  </span>
                </div>

                <div className="flex items-center justify-center text-amber-500">
                  <ArrowDown className="h-4 w-4" />
                </div>

                <div className="w-full p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-center shadow-xs">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center justify-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 animate-spin text-blue-600" />
                    في انتظار رد السلطة المختصة ⏳
                  </span>
                </div>

                <div className="w-full flex justify-center items-center relative h-5">
                  <div className="absolute top-0 bottom-0 w-0.5 bg-blue-400" />
                  <div className="absolute top-1/2 w-5/6 h-0.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
                </div>

                <div className="w-full grid grid-cols-3 gap-2">
                  <div
                    onClick={() => onSelectGrievanceOutcome?.("ACCEPTED")}
                    className={`p-2 rounded-xl border text-right transition-all cursor-pointer ${
                      grievanceOutcome === "ACCEPTED"
                        ? "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/30"
                        : "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400"
                    }`}
                  >
                    <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 block">
                      1. قبول كلي 🟢
                    </span>
                    <span className="text-[8px] text-emerald-700 dark:text-emerald-400 block mt-0.5 leading-tight">
                      عودة للترسية
                    </span>
                  </div>

                  <div
                    onClick={() => onSelectGrievanceOutcome?.("PARTIALLY_ACCEPTED")}
                    className={`p-2 rounded-xl border text-right transition-all cursor-pointer ${
                      grievanceOutcome === "PARTIALLY_ACCEPTED"
                        ? "bg-amber-100 dark:bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/30"
                        : "bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 hover:border-amber-400"
                    }`}
                  >
                    <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 block">
                      2. قبول جزئي 🟡
                    </span>
                    <span className="text-[8px] text-amber-700 dark:text-amber-400 block mt-0.5 leading-tight">
                      ترسية جزئية
                    </span>
                  </div>

                  <div
                    onClick={() => onSelectGrievanceOutcome?.("REJECTED")}
                    className={`p-2 rounded-xl border text-right transition-all cursor-pointer ${
                      grievanceOutcome === "REJECTED"
                        ? "bg-rose-100 dark:bg-rose-950/60 border-rose-500 ring-2 ring-rose-500/30"
                        : "bg-rose-50/80 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 hover:border-rose-400"
                    }`}
                  >
                    <span className="text-[10px] font-black text-rose-800 dark:text-rose-300 block">
                      3. تأكيد الرفض 🔴
                    </span>
                    <span className="text-[8px] text-rose-700 dark:text-rose-400 block mt-0.5 leading-tight">
                      استرداد التأمين
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   EXPORTABLE TAB: TECHNICAL OPENING (البت الفني المتطور)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function TabTechOpening({
  op,
  onRefresh,
  onNavigate,
  onGoGrievance,
  onGoFinancial,
}: {
  op: any;
  onRefresh: () => void;
  onNavigate?: (tabId: string) => void;
  onGoGrievance?: () => void;
  onGoFinancial?: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [companyId, setCompanyId] = useState(op.companies?.[0]?.companyId || "");
  const [result, setResult] = useState<"ACCEPTED" | "PARTIALLY_ACCEPTED" | "REJECTED">("ACCEPTED");
  const [reason, setReason] = useState("");
  const [openingDate, setOpeningDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Saved Technical Opening & Grievance from DB
  const savedTo = useMemo(() => {
    if (op.technicalOpenings && op.technicalOpenings.length > 0) {
      return op.technicalOpenings[op.technicalOpenings.length - 1];
    }
    return null;
  }, [op.technicalOpenings]);

  const savedGrievance = useMemo(() => {
    if (op.grievances && op.grievances.length > 0) {
      const techG = op.grievances.find(
        (g: any) =>
          (g.notes || "").includes("تظلم فني") ||
          (g.notes || "").includes("فني") ||
          (!g.notes?.includes("مالي") && (g.grievanceType === "AUTHORITY" || g.grievanceType === "TRIBUNAL"))
      );
      return techG || op.grievances[op.grievances.length - 1];
    }
    return null;
  }, [op.grievances]);

  const savedFinDate = useMemo(() => {
    return (op.dates || []).find((d: any) => d.dateType === "FINANCIAL_OPENING");
  }, [op.dates]);

  // Locked State: If a technical opening is already recorded, it cannot be changed unless explicitly edited
  const isDecisionLocked = !!savedTo;
  const effectiveResult: "ACCEPTED" | "PARTIALLY_ACCEPTED" | "REJECTED" = useMemo(() => {
    if (savedTo) {
      if (savedTo.notes?.includes("قبول جزئي") || savedTo.notes?.includes("PARTIALLY_ACCEPTED")) {
        return "PARTIALLY_ACCEPTED";
      }
      return savedTo.result as any;
    }
    return result;
  }, [savedTo, result]);

  // Scheduling Financial Opening upon acceptance
  const [finSessionDate, setFinSessionDate] = useState("");
  const [finSessionTime, setFinSessionTime] = useState("12:00");
  const [finSessionLocation, setFinSessionLocation] = useState("مقر جهة الإسناد — قاعة فتح المظاريف");
  const [savingFinDate, setSavingFinDate] = useState(false);

  // Grievance filing state if rejected
  const [grievanceType, setGrievanceType] = useState<"AUTHORITY" | "TRIBUNAL">("AUTHORITY");
  const [grievanceReason, setGrievanceReason] = useState("");
  const [savingGrievance, setSavingGrievance] = useState(false);
  const [isEditingGrievance, setIsEditingGrievance] = useState(false);
  const [showRefundAfterGrievanceReject, setShowRefundAfterGrievanceReject] = useState(false);

  // Grievance status outcome (PENDING / ACCEPTED / PARTIALLY_ACCEPTED / REJECTED)
  const grievanceOutcome = useMemo(() => {
    if (!savedGrievance) return null;
    if (savedGrievance.status === "ACCEPTED" || savedGrievance.status === "APPROVED" || savedGrievance.notes?.includes("كلياً")) return "ACCEPTED";
    if (savedGrievance.status === "PARTIALLY_ACCEPTED" || savedGrievance.status === "RESOLVED" || savedGrievance.notes?.includes("جزئياً") || savedGrievance.notes?.includes("قبول بعض")) return "PARTIALLY_ACCEPTED";
    if (savedGrievance.status === "REJECTED") return "REJECTED";
    return "PENDING";
  }, [savedGrievance]);

  // Refund Letter state
  const [showFinalRefundSection, setShowFinalRefundSection] = useState(false);

  // Optional Fulfillment
  const [fulfillmentOpen, setFulfillmentOpen] = useState(false);
  const [fulfillmentNotes, setFulfillmentNotes] = useState("");

  const initialGuar = op.guarantees?.find((g: any) => g.type === "INITIAL");
  const initialGuarAmount = initialGuar ? Number(initialGuar.amount) : 15000;
  const currentCompanyLink = (op.companies || []).find((c: any) => c.companyId === companyId) || op.companies?.[0];
  const currentCompany = currentCompanyLink?.company;

  // Active status label
  const statusLabel = useMemo(() => {
    if (effectiveResult === "ACCEPTED" || grievanceOutcome === "ACCEPTED") {
      if (savedFinDate) return "تم القبول كلياً وجدولة موعد الفتح المالي ✓";
      return "مقبول فنياً — بانتظار تحديد موعد الفتح المالي 📅";
    }
    if (effectiveResult === "PARTIALLY_ACCEPTED" || grievanceOutcome === "PARTIALLY_ACCEPTED") {
      if (savedFinDate) return "تم القبول جزئياً لبعض الأصناف وجدولة موعد الفتح المالي 📅";
      return "مقبول فنياً جزئياً (بعض الأصناف) — بانتظار تحديد موعد الفتح المالي 🟡";
    }
    if (savedGrievance) {
      if (grievanceOutcome === "REJECTED") return "تم رفض التظلم وتأكيد الاستبعاد — جاري استرداد التأمين الابتدائي 📄";
      return "في انتظار نتيجة التظلم من الجهة الإدارية ⏳";
    }
    return "مستبعد فنياً — بانتظار قيد التظلم القانوني";
  }, [effectiveResult, savedFinDate, savedGrievance, grievanceOutcome]);

  // Edit / Delete State for Technical Opening
  const [editingTo, setEditingTo] = useState<any | null>(null);
  const [savingEditTo, setSavingEditTo] = useState(false);

  // Save Technical Opening Decision
  const handleSaveOpening = async () => {
    setSaving(true);
    try {
      const isPartial = result === "PARTIALLY_ACCEPTED";
      await api.post(`/operations/${op.id}/technical-openings`, {
        companyId: companyId || op.companies?.[0]?.companyId,
        result: isPartial ? "ACCEPTED" : result,
        reason: result === "REJECTED" ? reason : undefined,
        openingDate,
        notes: isPartial
          ? (notes ? `[قبول جزئي لبعض الأصناف]: ${notes}` : "قبول فني جزئي لبعض الأصناف واستبعاد أصناف أخرى")
          : notes,
      });

      if (result === "ACCEPTED") {
        toast.success("تم تسجيل قبول الشركة فنياً وتثبيت القرار رسمياً! 🟢");
      } else if (result === "PARTIALLY_ACCEPTED") {
        toast.success("تم تسجيل قبول الشركة جزئياً لبعض الأصناف 🟡 — سيتم تقييد الفتح المالي على البنود المقبولة فقط!");
      } else {
        toast.error("تم تسجيل استبعاد الشركة فنياً 🔴 — تم فتح مسار التظلم القانوني");
      }
      setAdding(false);
      onRefresh();
    } catch {
      toast.error("فشل تسجيل نتيجة الفتح الفني");
    } finally {
      setSaving(false);
    }
  };

  // Update Technical Opening Decision
  const handleUpdateTechOpening = async () => {
    if (!editingTo) return;
    setSavingEditTo(true);
    try {
      const isPartial = editingTo.result === "PARTIALLY_ACCEPTED";
      await api.patch(`/operations/${op.id}/technical-openings/${editingTo.id}`, {
        companyId: editingTo.companyId,
        result: isPartial ? "ACCEPTED" : editingTo.result,
        reason: editingTo.result === "REJECTED" ? editingTo.reason : undefined,
        openingDate: editingTo.openingDate,
        notes: isPartial
          ? (editingTo.notes?.includes("قبول جزئي") ? editingTo.notes : `[قبول جزئي لبعض الأصناف]: ${editingTo.notes || "استبعاد بعض الأصناف"}`)
          : editingTo.notes?.replace(/\[قبول جزئي لبعض الأصناف\]:?\s*/g, ""),
      });
      toast.success("تم تعديل قرار الفتح الفني بنجاح! ✓");
      setEditingTo(null);
      onRefresh();
    } catch {
      toast.error("فشل حفظ تعديل قرار الفتح الفني");
    } finally {
      setSavingEditTo(false);
    }
  };

  // Delete Technical Opening Decision
  const handleDeleteTechOpening = async (toId: string) => {
    if (!confirm("هل أنت متأكد من حذف قرار الفتح الفني هذا؟ سيتم فتح إمكانية التسجيل من جديد.")) return;
    try {
      await api.delete(`/operations/${op.id}/technical-openings/${toId}`);
      toast.success("تم حذف قرار الفتح الفني بنجاح 🗑️");
      onRefresh();
    } catch {
      toast.error("فشل حذف قرار الفتح الفني");
    }
  };

  // Delete Grievance
  const handleDeleteGrievance = async (grievanceId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا التظلم القانوني؟")) return;
    try {
      await api.delete(`/operations/${op.id}/grievances/${grievanceId}`);
      toast.success("تم حذف التظلم بنجاح 🗑️");
      onRefresh();
    } catch {
      toast.error("فشل حذف التظلم");
    }
  };

  // Schedule Financial Opening Date
  const handleScheduleFinDate = async () => {
    if (!finSessionDate) {
      toast.error("يرجى اختيار تاريخ جلسة الفتح المالي");
      return;
    }
    setSavingFinDate(true);
    try {
      await api.post(`/operations/${op.id}/dates`, {
        dateType: "FINANCIAL_OPENING",
        label: `جلسة فتح المظاريف المالية (${finSessionLocation})`,
        dateValue: `${finSessionDate}T${finSessionTime || "12:00"}:00`,
        notifyBeforeDays: 3,
        notes: `تم تحديد الموعد عقب اجتياز مرحلة البت الفني بنجاح — الموعد الساعة ${finSessionTime}`,
      });

      await api.patch(`/operations/${op.id}/status`, {
        status: "TECHNICAL_OPENED",
      });

      toast.success("تم تثبيت موعد جلسة الفتح المالي في مواعيد العملية بنجاح! 📅");
      onRefresh();
    } catch {
      toast.error("فشل حفظ موعد جلسة الفتح المالي");
    } finally {
      setSavingFinDate(false);
    }
  };

  // Register and submit technical grievance officially
  const handleRegisterGrievanceOfficial = async () => {
    setSavingGrievance(true);
    try {
      let noteReason = "استيفاء العطاء الفني لكافة الاشتراطات الفنية ومطابقة العينات والكتالوجات طبقاً للمادة 42 من القانون 182 لسنة 2018";
      if (op.notes && op.notes.startsWith("{")) {
        try {
          const parsed = JSON.parse(op.notes);
          if (parsed.technicalGrievanceLetterDocx?.reason) {
            noteReason = parsed.technicalGrievanceLetterDocx.reason;
          }
        } catch {}
      }

      await api.post(`/operations/${op.id}/grievances`, {
        companyId: currentCompanyLink?.companyId || op.companies?.[0]?.companyId,
        grievanceType: "AUTHORITY",
        reason: noteReason,
        notes: `تظلم فني رسمي ضد قرار استبعاد البت الفني لعملية: ${op.name}`,
      });

      toast.success("تم تسجيل واعتماد التظلم القانوني رسمياً بنجاح! ⚖️ الحالة الآن: في انتظار نتيجة التظلم ⏳");
      setIsEditingGrievance(false);
      onRefresh();
    } catch {
      toast.error("فشل تسجيل التظلم");
    } finally {
      setSavingGrievance(false);
    }
  };

  // Handle Recording Entity's Response to Grievance
  const handleUpdateGrievanceStatus = async (outcomeStatus: "ACCEPTED" | "PARTIALLY_ACCEPTED" | "REJECTED") => {
    if (!savedGrievance) {
      toast.error("لا يوجد تظلم مسجل لتحديث نتيجته");
      return;
    }
    const backendStatus =
      outcomeStatus === "ACCEPTED"
        ? "APPROVED"
        : outcomeStatus === "PARTIALLY_ACCEPTED"
        ? "RESOLVED"
        : "REJECTED";

    try {
      await api.patch(`/operations/${op.id}/grievances/${savedGrievance.id}`, {
        status: backendStatus,
        notes:
          outcomeStatus === "ACCEPTED"
            ? "تم قبول التظلم كلياً لكافة الأصناف وإلغاء الاستبعاد"
            : outcomeStatus === "PARTIALLY_ACCEPTED"
            ? "تم قبول التظلم جزئياً لبعض الأصناف والموافقة على استمرار المنافسة"
            : "تم تأكيد قرار الاستبعاد ورفض التظلم",
      });

      if (outcomeStatus === "ACCEPTED") {
        await api.patch(`/operations/${op.id}/status`, {
          status: "TECHNICAL_ACCEPTED",
        });
        toast.success("تم تسجيل رد الجهة: قبول التظلم كلياً وعودة الشركة للمنافسة! 🟢");
      } else if (outcomeStatus === "PARTIALLY_ACCEPTED") {
        await api.patch(`/operations/${op.id}/status`, {
          status: "TECHNICAL_ACCEPTED",
        });
        toast.success("تم تسجيل رد الجهة: قبول التظلم جزئياً لبعض الأصناف! 🟡");
      } else {
        await api.patch(`/operations/${op.id}/status`, {
          status: "TECHNICAL_REJECTED",
        });
        toast.error("تم تسجيل رد الجهة: رفض التظلم وتأكيد الاستبعاد 🔴 — يرجى استرداد التأمين الابتدائي");
      }
      onRefresh();
    } catch {
      toast.error("فشل حفظ نتيجة التظلم");
    }
  };

  // Generate Letter HTML for Grievance
  const grievanceLetterHtml = useMemo(() => {
    return `
      <p><strong>بشأن:</strong> التظلم القانوني من قرار استبعاد العطاء الفني المقدم منا في العملية رقم (<strong>${op?.externalNumber || op?.serialNumber}</strong>) بعنوان "<strong>${op?.name}</strong>".</p>
      
      <p>بالإشارة إلى جلسة البت الفني المنعقدة بتاريخ <strong>${formatDate(savedTo?.openingDate || openingDate)}</strong>، وإخطارنا بقرار استبعاد عطائنا الفني؛</p>
      
      <p>نحيط سيادتكم علماً بأن قرار الاستبعاد قد شابه الإجحاف للأسباب الآتية:</p>
      <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:12px; border-radius:8px; margin: 10px 0;">
        <strong>أسباب التظلم القانونية والموضوعية:</strong><br/>
        ${savedGrievance?.reason || grievanceReason || savedTo?.reason || reason || "استيفاء العطاء لكافة الاشتراطات الفنية الواردة بكراسة الشروط والمواصفات ومطابقة العينات المقدمة."}
      </div>

      <p>وحيث إن المادة (42) من قانون تنظيم التعاقدات التي تبرمها الجهات العامة رقم 182 لسنة 2018 تكفل لمقدم العطاء الحق في التظلم وإعادة فحص العطاء ومطابقته الفنية قبل الانتقال لفتح المظاريف المالية؛</p>
      
      <p><strong>لذلك نلتمس من سيادتكم:</strong></p>
      <ol style="margin-right:20px;">
        <li>قبول هذا التظلم شكلاً لتقديمه في الميعاد القانوني المقرر (خلال 7 أيام).</li>
        <li>إعادة فحص المظروف الفني بمعرفة لجنة البت المختصة وإلغاء قرار الاستبعاد.</li>
        <li>إدراج شركتنا ضمن الشركات المقبولة فنياً والمصرح لها بحضور جلسة الفتح المالي.</li>
      </ol>
      <p style="text-align:center; margin-top:20px; font-weight:bold;">وتفضلوا بقبول فائق الاحترام والتقدير ،،،</p>
    `;
  }, [op, savedTo, openingDate, savedGrievance, grievanceReason, reason]);

  // Generate Letter HTML for Initial Guarantee Refund
  const refundLetterHtml = useMemo(() => {
    return `
      <p><strong>الموضوع:</strong> طلب استرداد التأمين الابتدائي المودع لعملية: <strong>${op?.name}</strong> (رقم: <strong>${op?.externalNumber || op?.serialNumber}</strong>).</p>
      
      <p>بالإشارة إلى نتائج البت الفني وانتهاء فحص التظلمات الخاصة بالعملية المشار إليها بعاليه، وحيث إنه لم يتم قبول العطاء الفني المقدم منا في المناقصة؛</p>
      
      <p>واستناداً إلى <strong>أحكام المادة (42) من قانون تنظيم التعاقدات العامة رقم 182 لسنة 2018</strong> ولائحته التنفيذية، والتي تنص على التزام الجهة الإدارية برد التأمين الابتدائي فور انتهاء البت أو البت في التظلمات دون تأخير؛</p>
      
      <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:12px; border-radius:8px; margin: 12px 0;">
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <tr>
            <td style="padding:6px; font-weight:bold; width:35%;">قيمة التأمين الابتدائي:</td>
            <td style="padding:6px; color:#1d4ed8; font-weight:bold;">${formatCurrency(initialGuarAmount)} (${tafqeetArabic(initialGuarAmount)})</td>
          </tr>
          <tr>
            <td style="padding:6px; font-weight:bold;">طريقة السداد:</td>
            <td style="padding:6px;">${initialGuar?.paymentMethod || "إيصال توريد نقدي / خطاب ضمان بنكي"}</td>
          </tr>
          <tr>
            <td style="padding:6px; font-weight:bold;">رقم إيصال / خطاب السداد:</td>
            <td style="padding:6px; font-family:monospace;">${initialGuar?.receiptNumber || initialGuar?.letterNumber || "مرفق أصل الإيصال"}</td>
          </tr>
          <tr>
            <td style="padding:6px; font-weight:bold;">الحساب البنكي للرد (IBAN):</td>
            <td style="padding:6px; font-family:monospace;">${currentCompany?.iban || "EG380002000100000000001234567"} - ${currentCompany?.bankName || "البنك الأهلي المصري"}</td>
          </tr>
        </table>
      </div>

      <p>لذا يرجى التكرم بالموافقة على اتخاذ إجراءات استرداد التأمين الابتدائي وتحويل المبلغ المستحق لحساب شركتنا أو تسليم أصل خطاب الضمان المودع طرفكم.</p>
      <p style="text-align:center; margin-top:20px; font-weight:bold;">وتفضلوا بقبول فائق الاحترام والتقدير ،،،</p>
    `;
  }, [op, initialGuar, initialGuarAmount, currentCompany]);

  return (
    <div className="space-y-6">
      {/* شريط خطوات مسار البت الفني المتسلسل والواضح */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-foreground">
              مسار جلسة البت الفني وفحص المظاريف (قانون 182/2018)
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              الحالة الحالية: <strong className={effectiveResult === "ACCEPTED" || grievanceOutcome === "ACCEPTED" ? "text-emerald-600 font-bold" : effectiveResult === "REJECTED" ? "text-rose-600 font-bold" : "text-blue-600 font-bold"}>{statusLabel || "بانتظار تسجيل محضر الجلسة"}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold flex-wrap">
          <Badge className={isDecisionLocked ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"}>
            1. محضر وقرار الجلسة {isDecisionLocked ? "✓" : "✍️"}
          </Badge>
          <span className="text-muted-foreground">⬅️</span>
          <Badge variant="outline" className={effectiveResult === "ACCEPTED" || grievanceOutcome === "ACCEPTED" ? "border-emerald-500 text-emerald-700 bg-emerald-500/10" : "border-muted-foreground/30 text-muted-foreground"}>
            2. الفتح المالي
          </Badge>
          <span className="text-muted-foreground">أو</span>
          <Badge variant="outline" className={effectiveResult === "REJECTED" ? "border-rose-500 text-rose-700 bg-rose-500/10" : "border-muted-foreground/30 text-muted-foreground"}>
            التظلم والاسترداد
          </Badge>
          {savedGrievance && (
            <>
              <span className="text-muted-foreground">⬅️</span>
              <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-500/10">
                3. نتيجة التظلم
              </Badge>
            </>
          )}
        </div>
      </div>

      {/* الخطوة 1: تسجيل أو عرض محضر وقرار لجنة البت الفني */}
      {!savedTo ? (
        <SectionCard
          title="الخطوة 1: تسجيل محضر وقرار لجنة البت الفني"
          icon={Scale}
          iconColor="text-blue-600 dark:text-blue-400"
          badge={<Badge className="bg-amber-500 text-white font-bold">بانتظار التسجيل ✍️</Badge>}
        >
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
            <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
              <Scale className="h-4 w-4 text-blue-500" />
              تسجيل محضر وقرار لجنة البت الفني رسمياً بالمنظومة
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">الشركة المتقدمة</label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-blue-500"
                >
                  {(op.companies || []).map((c: any) => (
                    <option key={c.companyId} value={c.companyId}>
                      {c.company?.name || `شركة (${c.displayCode})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">قرار اللجنة الفنية</label>
                <select
                  value={result}
                  onChange={(e) => setResult(e.target.value as any)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACCEPTED">قبول فني كلي (مطابق لكافة البنود والمواصفات) ✓</option>
                  <option value="PARTIALLY_ACCEPTED">قبول فني جزئي (قبول بعض الأصناف واستبعاد أخرى) 🟡</option>
                  <option value="REJECTED">استبعاد فني كلي (غير مطابق أو ناقص مستندات) ✗</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">تاريخ الجلسة</label>
                <input
                  type="date"
                  value={openingDate}
                  onChange={(e) => setOpeningDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                />
              </div>
            </div>

            {result === "PARTIALLY_ACCEPTED" && (
              <div className="animate-fade-in">
                <label className="text-xs font-semibold text-amber-600 dark:text-amber-400 block mb-1">
                  بيان الأصناف المقبولة والأصناف المستبعدة بمحضر الجلسة 🟡
                </label>
                <input
                  type="text"
                  placeholder="مثال: تم قبول بنود الأدوات الكتابية والكراسات واستبعاد بنود الأجهزة الكهربائية لعدم مطابقة الكتالوج"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-background border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}

            {result === "REJECTED" && (
              <div>
                <label className="text-xs font-semibold text-rose-500 block mb-1">سبب الاستبعاد الفني المكتوب بالمحضر</label>
                <input
                  type="text"
                  placeholder="مثال: عدم تقديم سابقة أعمال مماثلة معتمدة أو عدم مطابقة كتالوجات العينات"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-background border border-rose-500/40 rounded-xl px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-rose-500"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">ملاحظات وقرارات إضافية للجنة</label>
              <textarea
                rows={2}
                placeholder="أي ملاحظات تخص استيفاء المستندات أو العينات..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                size="sm"
                onClick={handleSaveOpening}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 rounded-xl shadow-md cursor-pointer"
              >
                {saving ? "جاري الحفظ والتثبيت..." : "حفظ وتثبيت القرار رسمياً 💾"}
              </Button>
            </div>
          </div>
        </SectionCard>
      ) : (
        <SectionCard
          title="الخطوة 1: محضر وقرار لجنة البت الفني"
          icon={Scale}
          iconColor="text-blue-600 dark:text-blue-400"
          badge={
            <Badge
              className={
                effectiveResult === "ACCEPTED"
                  ? "bg-emerald-600 text-white font-bold"
                  : effectiveResult === "PARTIALLY_ACCEPTED"
                  ? "bg-amber-600 text-white font-bold"
                  : "bg-rose-600 text-white font-bold"
              }
            >
              {effectiveResult === "ACCEPTED"
                ? "القرار: قبول فني كلي ✓ 🔒"
                : effectiveResult === "PARTIALLY_ACCEPTED"
                ? "القرار: قبول فني جزئي (بعض الأصناف) 🟡 🔒"
                : "القرار: استبعاد فني كلي ✗ 🔒"}
            </Badge>
          }
          actions={
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setEditingTo({
                    ...savedTo,
                    result:
                      savedTo.notes?.includes("قبول جزئي") || savedTo.notes?.includes("PARTIALLY_ACCEPTED")
                        ? "PARTIALLY_ACCEPTED"
                        : savedTo.result,
                  })
                }
                className="text-xs h-8 px-3 rounded-xl border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-1.5 cursor-pointer font-bold shadow-2xs"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>تعديل القرار ✏️</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteTechOpening(savedTo.id)}
                className="text-xs h-8 px-2.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1 cursor-pointer"
                title="حذف هذا القرار بالكامل"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          }
        >
          <div
            className={`p-5 rounded-2xl border-2 space-y-3 transition-all ${
              effectiveResult === "ACCEPTED"
                ? "bg-emerald-500/10 border-emerald-500/40"
                : effectiveResult === "PARTIALLY_ACCEPTED"
                ? "bg-amber-500/10 border-amber-500/40"
                : "bg-rose-500/10 border-rose-500/40"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shrink-0 shadow-md ${
                    effectiveResult === "ACCEPTED"
                      ? "bg-emerald-600"
                      : effectiveResult === "PARTIALLY_ACCEPTED"
                      ? "bg-amber-600"
                      : "bg-rose-600"
                  }`}
                >
                  {effectiveResult === "ACCEPTED" ? (
                    <Check className="h-6 w-6" />
                  ) : effectiveResult === "PARTIALLY_ACCEPTED" ? (
                    <AlertCircle className="h-6 w-6" />
                  ) : (
                    <X className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-foreground text-base">
                      {effectiveResult === "ACCEPTED"
                        ? "تم قبول العطاء الفني للشركة واجتياز التقييم كلياً ✓"
                        : effectiveResult === "PARTIALLY_ACCEPTED"
                        ? "تم قبول العطاء الفني جزئياً (قبول بعض الأصناف واستبعاد أخرى) 🟡"
                        : "تم استبعاد العطاء الفني للشركة ✗"}
                    </h4>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-white dark:bg-slate-900 border shadow-2xs">
                      قرار معتمد ومسجل في المنظومة 🔒
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    تاريخ انعقاد الجلسة: <strong className="text-foreground">{formatDate(savedTo.openingDate)}</strong>
                    {savedTo.reason && (
                      <span className="mr-2 text-rose-600 font-semibold">
                        • سبب الاستبعاد: {savedTo.reason}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {(effectiveResult === "ACCEPTED" || effectiveResult === "PARTIALLY_ACCEPTED") && onGoFinancial && (
                  <Button
                    size="sm"
                    onClick={onGoFinancial}
                    className={`text-white font-bold text-xs h-8.5 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs ${
                      effectiveResult === "PARTIALLY_ACCEPTED"
                        ? "bg-amber-600 hover:bg-amber-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    <span>{effectiveResult === "PARTIALLY_ACCEPTED" ? "الانتقال للبت المالي (للبنود المقبولة)" : "الانتقال للبت المالي"}</span>
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {savedTo.notes && (
              <div className="p-3 rounded-xl bg-background/80 border border-border/60 text-xs text-foreground/90">
                <strong>ملاحظات المحضر:</strong> {savedTo.notes}
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Edit Technical Opening Modal */}
      {editingTo && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
            <div className="bg-card text-card-foreground border border-border rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Edit className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-foreground text-sm">تعديل محضر وقرار الفتح الفني</h4>
                </div>
                <button onClick={() => setEditingTo(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">الشركة المتقدمة</label>
                  <select
                    value={editingTo.companyId}
                    onChange={(e) => setEditingTo({ ...editingTo, companyId: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                  >
                    {(op.companies || []).map((c: any) => (
                      <option key={c.companyId} value={c.companyId}>
                        {c.company?.name || `شركة (${c.displayCode})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">قرار اللجنة الفنية</label>
                  <select
                    value={editingTo.result}
                    onChange={(e) => setEditingTo({ ...editingTo, result: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground"
                  >
                    <option value="ACCEPTED">قبول فني كلي (مطابق لكافة البنود والمواصفات) ✓</option>
                    <option value="PARTIALLY_ACCEPTED">قبول فني جزئي (قبول بعض الأصناف) 🟡</option>
                    <option value="REJECTED">استبعاد فني كلي (غير مطابق أو ناقص مستندات) ✗</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">تاريخ الجلسة</label>
                  <input
                    type="date"
                    value={editingTo.openingDate ? editingTo.openingDate.split("T")[0] : ""}
                    onChange={(e) => setEditingTo({ ...editingTo, openingDate: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                  />
                </div>

                {editingTo.result === "REJECTED" && (
                  <div>
                    <label className="text-xs font-semibold text-rose-500 block mb-1">أسباب الاستبعاد الفني</label>
                    <input
                      type="text"
                      value={editingTo.reason || ""}
                      onChange={(e) => setEditingTo({ ...editingTo, reason: e.target.value })}
                      className="w-full bg-background border border-rose-500/40 rounded-xl px-3 py-2 text-xs text-foreground"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">ملاحظات إضافية</label>
                  <textarea
                    rows={2}
                    value={editingTo.notes || ""}
                    onChange={(e) => setEditingTo({ ...editingTo, notes: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setEditingTo(null)} className="text-xs">
                  إلغاء
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpdateTechOpening}
                  disabled={savingEditTo}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 rounded-xl"
                >
                  {savingEditTo ? "جاري الحفظ..." : "حفظ التعديلات"}
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* الخطوات المتسلسلة التالية: تظهر فقط بعد تثبيت قرار الخطوة 1 */}
      {savedTo && (
        <>
          {/* الحالة أ: في حالة القبول (كلي أو جزئي) -> الخطوة 2: جدولة الفتح المالي */}
          {(effectiveResult === "ACCEPTED" || effectiveResult === "PARTIALLY_ACCEPTED" || grievanceOutcome === "ACCEPTED" || grievanceOutcome === "PARTIALLY_ACCEPTED") && (
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-50 via-white to-emerald-50/50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-950 border-2 border-emerald-300 dark:border-emerald-600/50 shadow-xs dark:shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-200 dark:border-emerald-800/60 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                      الخطوة 2: تحديد وجدولة موعد جلسة الفتح المالي
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                      وفقاً للقانون 182/2018، يتم إخطار العطاءات المقبولة بموعد ومكان جلسة فتح المظاريف المالية
                    </p>
                  </div>
                </div>
                {onGoFinancial && (
                  <Button
                    size="sm"
                    onClick={onGoFinancial}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    <span>الانتقال لمرحلة البت المالي</span>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {savedFinDate ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between flex-wrap gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      تم تثبيت موعد جلسة الفتح المالي في مواعيد العملية بنجاح 📅
                    </span>
                    <p className="text-xs text-muted-foreground">
                      الموعد: <strong>{formatDate(savedFinDate.dateValue)}</strong> • {savedFinDate.label || "قاعة المشتريات المركزية"}
                    </p>
                  </div>
                  {onGoFinancial && (
                    <Button
                      size="sm"
                      onClick={onGoFinancial}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8.5 px-4 rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      <span>فتح جلسة البت المالي</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">تاريخ جلسة الفتح المالي 📅</label>
                      <input
                        type="date"
                        value={finSessionDate}
                        onChange={(e) => setFinSessionDate(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-emerald-500/40 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">توقيت انعقاد الجلسة ⏰</label>
                      <input
                        type="time"
                        value={finSessionTime}
                        onChange={(e) => setFinSessionTime(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-emerald-500/40 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">قاعة / مقر الانعقاد 🏛️</label>
                      <input
                        type="text"
                        placeholder="مقر جهة الإسناد — قاعة المشتريات"
                        value={finSessionLocation}
                        onChange={(e) => setFinSessionLocation(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-emerald-500/40 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      سيتم حفظ التاريخ تلقائياً في جدول مواعيد العملية وتنبيه مسؤولي الشركة
                    </span>
                    <Button
                      size="sm"
                      onClick={handleScheduleFinDate}
                      disabled={savingFinDate || !finSessionDate}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{savingFinDate ? "جاري الحفظ والجدولة..." : "حفظ الموعد وجدولة الفتح المالي"}</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* الحالة ب: في حالة الاستبعاد الفني -> مسار التظلم أو الاسترداد المباشر */}
          {effectiveResult === "REJECTED" && (
            <div className="space-y-4 animate-fade-in">
              {/* إذا كان المستخدم في وضع تحرير/معاينة التظلم الفني الرسمي المعتمد */}
              {isEditingGrievance ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                      <Scale className="h-4 w-4 text-indigo-600" />
                      {savedGrievance
                        ? "معاينة وتعديل بيانات ومحرر خطاب التظلم الفني المعتمد (قالب الوورد الرسمي)"
                        : "إعداد وتجهيز خطاب التظلم الفني الرسمي وفقاً للقانون 182 لسنة 2018"}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingGrievance(false)}
                      className="text-xs text-muted-foreground hover:text-foreground h-8 px-3 rounded-xl"
                    >
                      {savedGrievance ? "الرجوع لمتابعة حالة التظلم ↩️" : "إلغاء والرجوع للخيارات ✕"}
                    </Button>
                  </div>

                  {/* تضمين قسم خطاب التظلم الحقيقي بالقالب المعتمد والخانات الأصلية */}
                  <GrievanceLetterSection
                    op={op}
                    stage="technical"
                    onRefresh={onRefresh}
                    onClose={() => setIsEditingGrievance(false)}
                  />

                  {/* شريط الإجراءات والاعتماد أسفل الخطاب */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border-2 border-indigo-500/30 flex items-center justify-between flex-wrap gap-3 shadow-md">
                    <div>
                      <h5 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                        <Scale className="h-5 w-5 text-indigo-600" />
                        <span>{savedGrievance ? "بيانات التظلم الفني مسجلة بالمنظومة" : "تسجيل واعتماد التظلم الفني رسمياً"}</span>
                      </h5>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {savedGrievance
                          ? "تم حفظ كافة التعديلات على بنود وأسباب التظلم بالقالب أعلاه ومزامنتها بنجاح."
                          : "بعد الانتهاء من مراجعة وضبط بنود وأسباب التظلم بالقالب المعتمد أعلاه، اضغط لتسجيل التظلم رسمياً وبدء مهلة الـ 7 أيام."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingGrievance(false)}
                        className="text-xs h-9 px-4 rounded-xl"
                      >
                        {savedGrievance ? "الرجوع لمتابعة حالة التظلم ↩️" : "إغلاق محرر التظلم ✕"}
                      </Button>
                      {!savedGrievance && (
                        <Button
                          size="sm"
                          onClick={handleRegisterGrievanceOfficial}
                          disabled={savingGrievance}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs h-9 px-5 rounded-xl flex items-center gap-2 shadow-md cursor-pointer"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{savingGrievance ? "جاري التسجيل والاعتماد..." : "تسجيل التظلم رسمياً واعتماده ⚖️"}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : !savedGrievance ? (
                /* إذا لم يتم قيد تظلم حتى الآن */
                !showFinalRefundSection ? (
                  <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-rose-50 via-white to-rose-50/50 dark:from-rose-950/40 dark:via-slate-900 dark:to-slate-950 border-2 border-rose-300 dark:border-rose-600/50 shadow-xs space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
                        <Scale className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-foreground text-base">
                          الخطوة 2: قرار الاستبعاد الفني — الخيارات القانونية المتاحة (قانون 182 لسنة 2018)
                        </h4>
                        <p className="text-xs text-rose-700 dark:text-rose-400 font-medium mt-0.5">
                          المهلة القانونية لتقديم التظلم: 7 أيام عمل من تاريخ الإخطار بالاستبعاد (المادة 42)
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-foreground space-y-1">
                      <p className="font-bold text-rose-800 dark:text-rose-300">
                        سبب الاستبعاد بالمحضر: {savedTo.reason || "عدم استيفاء بعض الشروط الفنية أو نقص بالمستندات"}
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        يحق للشركة التقدم بتظلم قانوني رسمي لإعادة فحص العطاء الفني وإلغاء الاستبعاد، أو تخطي التظلم والانتقال فوراً للمطالبة باسترداد التأمين الابتدائي.
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowFinalRefundSection(true)}
                        className="text-xs h-9 px-4 rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-bold"
                      >
                        تخطي التظلم واسترداد التأمين فوراً 📄
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => setIsEditingGrievance(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs h-9 px-5 rounded-xl flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-500/20"
                      >
                        <Scale className="h-4 w-4" />
                        <span>عمل وتجهيز خطاب التظلم الفني الرسمي (قالب الوورد المعتمد) ⚖️</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* اختار المستخدم تخطي التظلم -> إظهار نموذج استرداد التأمين مباشرة */
                  <div className="space-y-3 animate-fade-in">
                    <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-border flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        تم اختيار: تخطي التظلم والمطالبة باسترداد التأمين الابتدائي مباشرة 📄
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowFinalRefundSection(false)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        الرجوع لخيارات التظلم ↩️
                      </Button>
                    </div>
                    <FinalInsuranceRefundSection
                      op={op}
                      onRefresh={onRefresh}
                      triggerContext="GRIEVANCE_REJECTED"
                      onClose={() => setShowFinalRefundSection(false)}
                    />
                  </div>
                )
              ) : (
                /* تم تقديم التظلم بالفعل -> الخطوة 3: في انتظار النتيجة وتسجيل رد الجهة (مطابق تماماً لما في الصورة المرفقة) */
                <div className="space-y-4 animate-fade-in">
                  <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-50 via-white to-amber-50/50 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-950 border-2 border-amber-300 dark:border-amber-600/50 shadow-xs space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-amber-200 dark:border-amber-800/60">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
                          <Clock className="h-5 w-5 animate-spin" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-foreground text-base">
                            الخطوة 3: التظلم القانوني المقدم — في انتظار نتيجة التظلم ⏳
                          </h4>
                          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                            كود التظلم: {savedGrievance.hashCode || "GRV-AUTH-2026"} • مهلة الرد الرسمية: 7 أيام
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsEditingGrievance(true)}
                          className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-bold text-xs h-8 px-3 rounded-xl flex items-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>معاينة / تعديل التظلم</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteGrievance(savedGrievance.id)}
                          className="text-xs text-rose-600 hover:bg-rose-50 h-8 px-2.5 rounded-xl flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>إلغاء التظلم</span>
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-white/70 dark:bg-slate-950/70 p-3 rounded-xl border border-border">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">تاريخ التقديم:</span>
                        <strong className="text-foreground">{formatDate(savedGrievance.filingDate)}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">أقصى مهلة للرد (7 أيام):</span>
                        <strong className="text-rose-600">{formatDate(savedGrievance.deadlineDate)}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">الجهة الموجه إليها:</span>
                        <strong className="text-foreground">
                          {savedGrievance.grievanceType === "AUTHORITY" ? "السلطة المختصة مباشرة" : "لجنة التوفيق وفض المنازعات"}
                        </strong>
                      </div>
                    </div>

                    <p className="text-xs text-foreground/90 bg-muted/40 p-2.5 rounded-xl">
                      <strong>الأسانيد القانونية:</strong> {savedGrievance.reason}
                    </p>

                    {/* تسجيل رد السلطة المختصة على التظلم (المحدد بالدائرة الحمراء في الصورة) */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h5 className="font-extrabold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                          تسجيل رد وقرار السلطة المختصة على التظلم:
                        </h5>
                        <span className="text-[11px] text-muted-foreground">اختر رد الجهة لتوجيه مسار العملية تلقائياً</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        {/* 1. قبول كلي */}
                        <button
                          type="button"
                          onClick={() => handleUpdateGrievanceStatus("ACCEPTED")}
                          className={`p-3.5 rounded-2xl border-2 text-right transition-all cursor-pointer ${
                            grievanceOutcome === "ACCEPTED"
                              ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 ring-4 ring-emerald-500/20 shadow-md shadow-emerald-500/10"
                              : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400 hover:bg-emerald-50/50"
                          }`}
                        >
                          <span className="font-black text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            1. قبول التظلم كلياً 🟢
                          </span>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed font-medium">
                            قبول كافة الأصناف، إلغاء الاستبعاد، وعودة الشركة للمنافسة والفتح المالي
                          </p>
                        </button>

                        {/* 2. قبول جزئي */}
                        <button
                          type="button"
                          onClick={() => handleUpdateGrievanceStatus("PARTIALLY_ACCEPTED")}
                          className={`p-3.5 rounded-2xl border-2 text-right transition-all cursor-pointer ${
                            grievanceOutcome === "PARTIALLY_ACCEPTED"
                              ? "bg-amber-50 dark:bg-amber-950/60 border-amber-500 ring-4 ring-amber-500/20 shadow-md shadow-amber-500/10"
                              : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400 hover:bg-amber-50/50"
                          }`}
                        >
                          <span className="font-black text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                            <FileSpreadsheet className="h-4 w-4 text-amber-600" />
                            2. قبول التظلم جزئياً 🟡
                          </span>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed font-medium">
                            قبول بعض الأصناف واستمرار التنافس في الفتح المالي على البنود المقبولة
                          </p>
                        </button>

                        {/* 3. رفض */}
                        <button
                          type="button"
                          onClick={() => handleUpdateGrievanceStatus("REJECTED")}
                          className={`p-3.5 rounded-2xl border-2 text-right transition-all cursor-pointer ${
                            grievanceOutcome === "REJECTED"
                              ? "bg-rose-50 dark:bg-rose-950/60 border-rose-500 ring-4 ring-rose-500/20 shadow-md shadow-rose-500/10"
                              : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-400 hover:bg-rose-50/50"
                          }`}
                        >
                          <span className="font-black text-xs text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                            <XCircle className="h-4 w-4 text-rose-600" />
                            3. رفض التظلم 🔴
                          </span>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed font-medium">
                            تأكيد قرار الاستبعاد، وفتح مسار استرداد التأمين الابتدائي فوراً
                          </p>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* الخطوة 4: إذا رُفض التظلم -> زر ومسار استرداد التأمين الابتدائي المعتمد */}
                  {grievanceOutcome === "REJECTED" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <h5 className="font-extrabold text-sm text-rose-800 dark:text-rose-300 flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-rose-600" />
                            <span>الخطوة 4: تم رفض التظلم وتأكيد الاستبعاد نهائياً — استرداد التأمين الابتدائي</span>
                          </h5>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            طبقاً للمادة (38) و(42) من القانون 182/2018، تلتزم جهة الإسناد برد التأمين الابتدائي فوراً دون أي خصم.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setShowRefundAfterGrievanceReject((prev) => !prev)}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs h-9 px-4 rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
                        >
                          <Receipt className="h-4 w-4" />
                          <span>{showRefundAfterGrievanceReject ? "إخفاء نموذج وقالب استرداد التأمين ✕" : "فتح نموذج وقالب استرداد التأمين الابتدائي 📄"}</span>
                        </Button>
                      </div>

                      {showRefundAfterGrievanceReject && (
                        <div className="animate-fade-in">
                          <FinalInsuranceRefundSection
                            op={op}
                            onRefresh={onRefresh}
                            triggerContext="GRIEVANCE_REJECTED"
                            onClose={() => setShowRefundAfterGrievanceReject(false)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* استيفاء الملاحظات والمستندات الفنية التكميلية (اختياري) */}
      <div className="border border-border rounded-2xl p-4 bg-card text-card-foreground shadow-xs">
        <button
          onClick={() => setFulfillmentOpen(!fulfillmentOpen)}
          className="w-full flex items-center justify-between text-right cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h5 className="font-bold text-xs text-foreground">
              استيفاء الملاحظات والمستندات الفنية التكميلية (اختياري)
            </h5>
          </div>
          {fulfillmentOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {fulfillmentOpen && (
          <div className="pt-3 mt-3 border-t border-border space-y-3 animate-fade-in">
            <p className="text-[11px] text-muted-foreground">
              إذا طلبت اللجنة الفنية مستندات إيضاحية تكميلية أو عينات إضافية قبل إعلان النتيجة النهائية:
            </p>
            <textarea
              rows={2}
              placeholder="بيان المستندات التي تم استيفاؤها وتسليمها للجنة..."
              value={fulfillmentNotes}
              onChange={(e) => setFulfillmentNotes(e.target.value)}
              className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  toast.success("تم حفظ مذكرة الاستيفاء الفني بنجاح! ✓");
                  setFulfillmentOpen(false);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3 rounded-xl shadow-xs"
              >
                حفظ الاستيفاء
              </Button>
            </div>
          </div>
        )}
      </div>


      {/* Continuity Action Footer */}
      <StepFooterNav
        currentTabId="tech_opening"
        onNavigate={onNavigate || ((tabId) => { if (tabId === "fin_opening") onGoFinancial?.(); })}
      />
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   EXPORTABLE TAB: FINANCIAL OPENING (البت المالي المتطور والترسية الجزئية)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function TabFinOpening({
  op,
  onRefresh,
  onNavigate,
  onGoAward,
  onPreviewDoc,
  onDownloadDoc,
}: {
  op: any;
  onRefresh: () => void;
  onNavigate?: (tabId: string) => void;
  onGoAward?: () => void;
  onPreviewDoc?: (doc: any) => void;
  onDownloadDoc?: (doc: any) => void;
}) {
  // ━━━ فحص نتيجة مرحلة البت الفني والتظلمات للربط المنطقي الإلزامي ━━━
  const savedTo = (op.technicalOpenings || [])[op.technicalOpenings.length - 1];
  const savedTechGrievance = (op.grievances || []).find(
    (g: any) =>
      g.notes?.includes("فني") ||
      g.reason?.includes("فني") ||
      g.grievanceType === "TECHNICAL" ||
      (g.notes && !g.notes.includes("مالي") && (op.status === "TECHNICAL_REJECTED" || savedTo?.result === "REJECTED"))
  );

  const isTechPartiallyAccepted = useMemo(() => {
    if (savedTo?.notes?.includes("قبول جزئي") || savedTo?.notes?.includes("PARTIALLY_ACCEPTED")) return true;
    if (
      savedTechGrievance?.status === "RESOLVED" ||
      savedTechGrievance?.status === "PARTIALLY_ACCEPTED" ||
      savedTechGrievance?.notes?.includes("جزئياً") ||
      savedTechGrievance?.notes?.includes("قبول بعض") ||
      savedTechGrievance?.notes?.includes("جزئي")
    ) {
      return true;
    }
    return false;
  }, [savedTo, savedTechGrievance]);

  const isTechRejected = useMemo(() => {
    if (
      savedTo?.result === "REJECTED" &&
      (!savedTechGrievance || savedTechGrievance.status === "REJECTED")
    ) {
      return true;
    }
    return false;
  }, [savedTo, savedTechGrievance]);

  const savedFo = (op.financialOpenings || [])[op.financialOpenings.length - 1];
  const isSessionLocked = !!savedFo;

  const [evalOutcome, setEvalOutcome] = useState<"ACCEPT_ALL" | "ACCEPT_PARTIAL" | "REJECTED">(() => {
    if (op.status === "FINANCIAL_REJECTED") return "REJECTED";
    const lastFo = (op.financialOpenings || [])[op.financialOpenings.length - 1];
    if (lastFo?.notes?.includes("REJECTED")) return "REJECTED";
    if (lastFo?.notes?.includes("ACCEPT_PARTIAL")) return "ACCEPT_PARTIAL";
    if (isTechPartiallyAccepted) return "ACCEPT_PARTIAL";
    if (isTechRejected) return "REJECTED";
    return "ACCEPT_ALL";
  });

  // الربط التلقائي والإلزامي لمرحلة البت المالي بنتيجة البت الفني
  useEffect(() => {
    if (isTechPartiallyAccepted && evalOutcome === "ACCEPT_ALL") {
      setEvalOutcome("ACCEPT_PARTIAL");
    } else if (isTechRejected && evalOutcome !== "REJECTED") {
      setEvalOutcome("REJECTED");
    }
  }, [isTechPartiallyAccepted, isTechRejected, evalOutcome]);

  const currentCompanyLink = op.companies?.[0];
  const currentCompany = currentCompanyLink?.company;

  const savedFinGrievance = (op.grievances || []).find(
    (g: any) =>
      g.notes?.includes("مالي") ||
      g.reason?.includes("مالي") ||
      g.grievanceType === "FINANCIAL" ||
      (g.notes && !g.notes.includes("فني") && (op.status === "FINANCIAL_REJECTED" || evalOutcome === "REJECTED"))
  );
  const finGrievanceOutcome = useMemo(() => {
    if (!savedFinGrievance) return "PENDING";
    if (savedFinGrievance.status === "ACCEPTED" || savedFinGrievance.status === "APPROVED" || savedFinGrievance.notes?.includes("كلياً")) return "ACCEPTED";
    if (savedFinGrievance.status === "PARTIALLY_ACCEPTED" || savedFinGrievance.status === "RESOLVED" || savedFinGrievance.notes?.includes("جزئياً")) return "PARTIALLY_ACCEPTED";
    if (savedFinGrievance.status === "REJECTED") return "REJECTED";
    return "PENDING";
  }, [savedFinGrievance]);

  const [showFinalRefundSection, setShowFinalRefundSection] = useState(false);
  const [showFinOfficialGrievanceDoc, setShowFinOfficialGrievanceDoc] = useState(false);

  // Competitors registration
  const [adding, setAdding] = useState(false);
  const [openingDate, setOpeningDate] = useState(new Date().toISOString().split("T")[0]);
  const [competitors, setCompetitors] = useState([
    { competitorName: currentCompany?.name || "شركتنا (Golden)", price: 850000, isOwnCompany: true, companyId: currentCompanyLink?.companyId },
    { competitorName: "شركة الأهرام للتجارة والمقاولات", price: 920000, isOwnCompany: false },
    { competitorName: "الشركة الهندسية للتوريدات العامة", price: 890000, isOwnCompany: false },
  ]);
  const [savingOpening, setSavingOpening] = useState(false);

  interface BoqItem {
    id: string;
    name: string;
    unit: string;
    origQty: number;
    acceptedQty: number;
    unitPrice: number;
    isAccepted: boolean;
  }

  // Partial BOQ Editable Items state
  const rawOfferItems = op.financialOffers?.[0]?.items || [];
  const initialPartialItems: BoqItem[] = useMemo(() => {
    if (rawOfferItems.length > 0) {
      return rawOfferItems.map((item: any, idx: number): BoqItem => ({
        id: item.id || String(idx + 1),
        name: item.itemName || `بند رقم ${idx + 1}`,
        unit: item.unit || "قطعة",
        origQty: Number(item.quantity) || 10,
        acceptedQty: Number(item.quantity) || 10,
        unitPrice: Number(item.unitPrice) || 1000,
        isAccepted: true,
      }));
    }
    return [
      { id: "1", name: "توريد وتركيب أجهزة حاسب آلي وشاشات متطورة", unit: "جهاز", origQty: 50, acceptedQty: 35, unitPrice: 12500, isAccepted: true },
      { id: "2", name: "طابعات ليزر شبكية ملونة متعددة المهام", unit: "طابعة", origQty: 15, acceptedQty: 15, unitPrice: 8200, isAccepted: true },
      { id: "3", name: "خوادم بيانات وسيرفرات مركزية مجهزة (Rack 42U)", unit: "سيرفر", origQty: 4, acceptedQty: 0, unitPrice: 75000, isAccepted: false },
      { id: "4", name: "محولات شبكة وسويتشات إدارة Cisco 48 Port", unit: "سويتش", origQty: 10, acceptedQty: 8, unitPrice: 14000, isAccepted: true },
    ];
  }, [rawOfferItems]);

  const [partialItems, setPartialItems] = useState<BoqItem[]>(initialPartialItems);
  const [includeVat, setIncludeVat] = useState(true);
  const [partialModalOpen, setPartialModalOpen] = useState(false);

  // Selected Market Study Documents for Bulk Procurement
  const [selectedMarketDocs, setSelectedMarketDocs] = useState<Record<string, boolean>>({});

  // Financial Grievance State
  const [finGrievanceReason, setFinGrievanceReason] = useState("");
  const [savingFinGrievance, setSavingFinGrievance] = useState(false);
  const [finGrievanceModalOpen, setFinGrievanceModalOpen] = useState(false);
  const [isEditingFinGrievance, setIsEditingFinGrievance] = useState(false);
  const [showRefundAfterFinGrievanceReject, setShowRefundAfterFinGrievanceReject] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);

  const initialGuar = op.guarantees?.find((g: any) => g.type === "INITIAL");
  const initialGuarAmount = initialGuar ? Number(initialGuar.amount) : 15000;

  // Filter Market study docs from Stage 3
  const marketStudyDocs = useMemo(() => {
    return (op.documents || []).filter(
      (d: any) =>
        d.type === "MARKET_STUDY" ||
        d.fileName?.includes("سوق") ||
        d.fileName?.includes("مورد") ||
        d.fileName?.includes("عرض سعر") ||
        d.fileName?.includes("دراسة")
    );
  }, [op.documents]);

  // Recalculate partial total
  const partialSubtotal = useMemo(() => {
    return partialItems
      .filter((item: BoqItem) => item.isAccepted)
      .reduce((acc: number, item: BoqItem) => acc + item.acceptedQty * item.unitPrice, 0);
  }, [partialItems]);

  const vatAmount = useMemo(() => (includeVat ? partialSubtotal * 0.14 : 0), [partialSubtotal, includeVat]);
  const partialGrandTotal = useMemo(() => partialSubtotal + vatAmount, [partialSubtotal, vatAmount]);

  // Status label
  const statusLabel = useMemo(() => {
    if (evalOutcome === "ACCEPT_ALL") return "قبول كل الأصناف — جاهز للترسية وأوامر الشراء 🟢";
    if (evalOutcome === "ACCEPT_PARTIAL") return `ترسية جزئية — إجمالي القيمة: ${formatCurrency(partialGrandTotal)} 🟡`;
    if (finGrievanceOutcome === "ACCEPTED") return "تم قبول التظلم المالي كلياً وعودة الترسية 🟢";
    if (finGrievanceOutcome === "PARTIALLY_ACCEPTED") return "تم قبول التظلم المالي جزئياً واستمرار المنافسة 🟡";
    if (finGrievanceOutcome === "REJECTED") return "تم رفض التظلم المالي — استرداد التأمين الابتدائي 📄";
    if (savedFinGrievance) return "في انتظار نتيجة التظلم المالي من الجهة الإدارية ⏳";
    return "استبعاد مالي — التظلم المالي قيد الإجراء";
  }, [evalOutcome, partialGrandTotal, savedFinGrievance, finGrievanceOutcome]);

  // Toggle item in partial BOQ
  const handleToggleItem = (id: string) => {
    setPartialItems((prev: BoqItem[]) =>
      prev.map((item: BoqItem) => (item.id === id ? { ...item, isAccepted: !item.isAccepted } : item))
    );
  };

  // Update Item in partial BOQ
  const handleUpdateItem = (id: string, field: "acceptedQty" | "unitPrice", val: number) => {
    setPartialItems((prev: BoqItem[]) =>
      prev.map((item: BoqItem) => (item.id === id ? { ...item, [field]: Math.max(0, val) } : item))
    );
  };

  // Add new row to BOQ
  const handleAddNewItem = () => {
    const newId = String(Date.now());
    setPartialItems((prev: BoqItem[]) => [
      ...prev,
      {
        id: newId,
        name: "بند إضافي معتمد",
        unit: "وحدة",
        origQty: 1,
        acceptedQty: 1,
        unitPrice: 1000,
        isAccepted: true,
      },
    ]);
  };

  // Remove row from BOQ
  const handleRemoveItem = (id: string) => {
    setPartialItems((prev: BoqItem[]) => prev.filter((item: BoqItem) => item.id !== id));
  };

  // Register and submit financial grievance officially
  const handleRegisterFinGrievanceOfficial = async () => {
    setSavingFinGrievance(true);
    try {
      let noteReason = "مطابقة الأسعار للقيمة التقديرية ودراسات السوق الرسمية وخلو العرض المالي من أي خطأ حسابي طبقاً للمادة 42 من القانون 182 لسنة 2018";
      if (op.notes && op.notes.startsWith("{")) {
        try {
          const parsed = JSON.parse(op.notes);
          if (parsed.financialGrievanceLetterDocx?.reason) {
            noteReason = parsed.financialGrievanceLetterDocx.reason;
          }
        } catch {}
      }

      await api.post(`/operations/${op.id}/grievances`, {
        companyId: currentCompanyLink?.companyId || op.companies?.[0]?.companyId,
        grievanceType: "AUTHORITY",
        reason: noteReason,
        notes: `تظلم مالي رسمي ضد قرار استبعاد العطاء المالي لعملية: ${op.name}`,
        status: "PENDING",
      });

      toast.success("تم تسجيل واعتماد التظلم المالي رسمياً بنجاح! ⚖️ الحالة الآن: في انتظار نتيجة التظلم ⏳");
      setIsEditingFinGrievance(false);
      onRefresh();
    } catch {
      toast.error("فشل تسجيل التظلم المالي");
    } finally {
      setSavingFinGrievance(false);
    }
  };

  // Handle Recording Entity's Response to Financial Grievance
  const handleUpdateFinGrievanceStatus = async (outcomeStatus: "ACCEPTED" | "PARTIALLY_ACCEPTED" | "REJECTED") => {
    if (!savedFinGrievance) {
      toast.error("لا يوجد تظلم مالي مسجل لتحديث نتيجته");
      return;
    }
    const backendStatus =
      outcomeStatus === "ACCEPTED"
        ? "APPROVED"
        : outcomeStatus === "PARTIALLY_ACCEPTED"
        ? "RESOLVED"
        : "REJECTED";

    try {
      await api.patch(`/operations/${op.id}/grievances/${savedFinGrievance.id}`, {
        status: backendStatus,
        notes:
          outcomeStatus === "ACCEPTED"
            ? "تم قبول التظلم المالي كلياً لكافة الأصناف وإلغاء الاستبعاد المالي"
            : outcomeStatus === "PARTIALLY_ACCEPTED"
            ? "تم قبول التظلم المالي جزئياً لبعض الأصناف والموافقة على استمرار الترسية الجزئية"
            : "تم تأكيد قرار الاستبعاد المالي ورفض التظلم",
      });

      if (outcomeStatus === "ACCEPTED") {
        await api.patch(`/operations/${op.id}/status`, {
          status: "FINANCIAL_OPENED",
        });
        setEvalOutcome("ACCEPT_ALL");
        toast.success("تم تسجيل رد الجهة: قبول التظلم كلياً وعودة الترسية! 🟢");
      } else if (outcomeStatus === "PARTIALLY_ACCEPTED") {
        await api.patch(`/operations/${op.id}/status`, {
          status: "FINANCIAL_OPENED",
        });
        setEvalOutcome("ACCEPT_PARTIAL");
        toast.success("تم تسجيل رد الجهة: قبول التظلم جزئياً لبعض الأصناف! 🟡");
      } else {
        await api.patch(`/operations/${op.id}/status`, {
          status: "FINANCIAL_REJECTED",
        });
        toast.error("تم تسجيل رد الجهة: رفض التظلم وتأكيد الاستبعاد 🔴 — يرجى استرداد التأمين الابتدائي");
      }
      onRefresh();
    } catch {
      toast.error("فشل حفظ نتيجة التظلم المالي");
    }
  };

  // Delete Financial Grievance
  const handleDeleteFinGrievance = async (gId: string) => {
    if (!confirm("هل أنت متأكد من إلغاء وحذف هذا التظلم المالي؟")) return;
    try {
      await api.delete(`/operations/${op.id}/grievances/${gId}`);
      toast.success("تم إلغاء وحذف التظلم بنجاح ✓");
      onRefresh();
    } catch {
      toast.error("فشل حذف التظلم");
    }
  };

  // Save Financial Opening session
  const handleSaveFinOpening = async () => {
    setSavingOpening(true);
    try {
      await api.post(`/operations/${op.id}/financial-openings`, {
        openingDate,
        notes: `قرار البت المالي: ${evalOutcome}`,
        competitors,
      });

      await api.patch(`/operations/${op.id}/status`, {
        status: evalOutcome === "REJECTED" ? "FINANCIAL_REJECTED" : "FINANCIAL_OPENED",
      });

      toast.success("تم تسجيل محضر جلسة الفتح المالي بنجاح! 💰");
      setAdding(false);
      onRefresh();
    } catch {
      toast.error("فشل حفظ محضر الفتح المالي");
    } finally {
      setSavingOpening(false);
    }
  };

  // Edit & Delete state & handlers for Financial Openings
  const [editingFo, setEditingFo] = useState<any | null>(null);
  const [savingEditFo, setSavingEditFo] = useState(false);

  const handleUpdateFinOpening = async () => {
    if (!editingFo) return;
    setSavingEditFo(true);
    try {
      await api.patch(`/operations/${op.id}/financial-openings/${editingFo.id}`, {
        openingDate: editingFo.openingDate,
        notes: editingFo.notes,
        competitors: editingFo.competitors,
      });
      toast.success("تم تعديل محضر الفتح المالي بنجاح! ✓");
      setEditingFo(null);
      onRefresh();
    } catch {
      toast.error("فشل حفظ تعديلات الفتح المالي");
    } finally {
      setSavingEditFo(false);
    }
  };

  const handleDeleteFinOpening = async (foId: string) => {
    if (!confirm("هل أنت متأكد من حذف محضر الفتح المالي هذا بالكامل؟")) return;
    try {
      await api.delete(`/operations/${op.id}/financial-openings/${foId}`);
      toast.success("تم حذف محضر الفتح المالي بنجاح 🗑️");
      onRefresh();
    } catch {
      toast.error("فشل حذف محضر الفتح المالي");
    }
  };

  // ━━━ مزامنة وتحديث العرض المالي الأصلي بالبنود المقبولة فقط ━━━
  const [syncingOffer, setSyncingOffer] = useState(false);
  const handleSyncFinancialOfferWithAcceptedItems = async () => {
    setSyncingOffer(true);
    try {
      let currentNotesObj: any = {};
      try {
        if (op.notes && op.notes.startsWith("{")) {
          currentNotesObj = JSON.parse(op.notes);
        }
      } catch {}

      const acceptedList = partialItems.filter((i: BoqItem) => i.isAccepted);
      const acceptedItemsList = acceptedList.map((i: BoqItem, idx: number) => ({
        id: `item-${idx + 1}`,
        itemNumber: idx + 1,
        itemName: i.name,
        unit: i.unit,
        quantity: String(i.acceptedQty),
        variants: [
          {
            id: `v-${idx + 1}-1`,
            variantType: "basic",
            variantLabel: "أساسى",
            description: i.name,
            subDescription: "بند معتمد بقرار البت المالي والترسية الجزئية",
            branch1: "مطابق للمواصفات",
            unitPrice: i.unitPrice,
            totalPrice: i.acceptedQty * i.unitPrice,
            notes: "معتمد ومطابق للبت المالي",
          },
        ],
      }));

      currentNotesObj.financialOfferDocx = {
        ...(currentNotesObj.financialOfferDocx || {}),
        items: acceptedItemsList,
        vatRate: includeVat ? 14 : 0,
        taxCondition: includeVat ? "الأسعار غير شاملة ضريبة القيمة المضافة (14%)" : "الأسعار شاملة ضريبة القيمة المضافة",
        updatedAt: new Date().toISOString(),
        adjudicationDecision: "ACCEPT_PARTIAL",
      };

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(currentNotesObj),
      });

      toast.success("تم تحديث وحفظ العرض المالي بالبنود المقبولة في المنظومة بنجاح! 💾✨");
      onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error("فشل تحديث العرض المالي في المنظومة");
    } finally {
      setSyncingOffer(false);
    }
  };

  const handleAwardAndAdvance = async () => {
    await handleSyncFinancialOfferWithAcceptedItems();
    onGoAward?.();
  };

  // ━━━ إنشاء قالب العرض المالي الرسمي المعتمد (المعدل بالبنود المقبولة فقط) ━━━
  const partialAwardStatementHtml = useMemo(() => {
    const acceptedList = partialItems.filter((i: BoqItem) => i.isAccepted);
    const acceptedRows = acceptedList
      .map((i: BoqItem, index: number) => {
        const itemTotal = i.acceptedQty * i.unitPrice;
        const uPounds = Math.floor(i.unitPrice);
        const uPiasters = Math.round((i.unitPrice - uPounds) * 100);
        const tPounds = Math.floor(itemTotal);
        const tPiasters = Math.round((itemTotal - tPounds) * 100);

        return `
        <tr style="border-bottom: 1px solid #cbd5e1;">
          <td style="text-align:center; padding:8px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc;">${index + 1}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:right;">
            <div style="font-weight:bold; color:#0f172a; font-size:12px;">${i.name}</div>
            <div style="font-size:10px; color:#64748b; margin-top:2px;">مطابق لكراسة الشروط والمواصفات الفنية المعتمدة للعملية</div>
          </td>
          <td style="text-align:center; padding:8px; border:1px solid #cbd5e1; font-size:11px;">${i.unit}</td>
          <td style="text-align:center; padding:8px; border:1px solid #cbd5e1; font-weight:bold; font-size:13px; color:#0f172a;">${i.acceptedQty}</td>
          <td style="text-align:center; padding:6px; border:1px solid #cbd5e1; font-family:monospace; background:#fafafa;">
            <div style="display:flex; justify-content:space-around; font-size:11px;">
              <span style="color:#0369a1; font-weight:bold;">${uPounds.toLocaleString("ar-EG")} ج</span>
              <span style="color:#64748b;">${uPiasters > 0 ? (uPiasters < 10 ? '0' + uPiasters : uPiasters) : '00'} ق</span>
            </div>
          </td>
          <td style="text-align:center; padding:6px; border:1px solid #cbd5e1; font-family:monospace; font-weight:bold; background:#f0fdf4;">
            <div style="display:flex; justify-content:space-around; font-size:12px;">
              <span style="color:#15803d; font-weight:bold;">${tPounds.toLocaleString("ar-EG")} ج</span>
              <span style="color:#64748b;">${tPiasters > 0 ? (tPiasters < 10 ? '0' + tPiasters : tPiasters) : '00'} ق</span>
            </div>
          </td>
          <td style="text-align:center; padding:8px; border:1px solid #cbd5e1; font-size:11px;">
            <span style="display:inline-block; padding:3px 8px; border-radius:6px; background:#dcfce7; color:#15803d; font-weight:bold;">
              مقبول بالترسية ✓
            </span>
          </td>
        </tr>
      `;
      })
      .join("");

    return `
      <!-- المقدمة الرسمية للعرض المالي المعدل -->
      <div style="margin-bottom:14px; font-size:13px; line-height:1.7; color:#1e293b;">
        <p style="margin:0 0 6px 0;"><strong>السيد الأستاذ /</strong> مدير الإدارة العامة للمشتريات والمخازن بـ <strong>${op?.authority || "جهة الإسناد المختصة"}</strong></p>
        <p style="margin:0 0 8px 0;"><strong>تحية طيبة وبعد ،،،</strong></p>
        <p style="margin:0 0 8px 0; text-align:justify;">
          بشأن تقديم العرض المالي وجدول الفئات والأسعار (المعدل) لعملية: <strong>(${op?.name})</strong> — رقم: <strong>(${op?.externalNumber || op?.serialNumber})</strong> — العام المالي: <strong>2025/2026</strong>.
        </p>
        <p style="margin:0 0 10px 0; text-align:justify; color:#334155;">
          نتشرف بأن نرفق لسيادتكم طيه جدول الفئات والأسعار المعتمد لعطائنا المالي المعدل لعملية المذكورة بعاليه، وفقاً لما أسفرت عنه جلسة البت المالي وفض المظاريف والترسية للأصناف المقبولة، وذلك بعد استبعاد الأصناف غير المقبولة، طبقاً للجدول التالي:
        </p>
      </div>

      <!-- الجدول الرسمي للعرض المالي المعدل -->
      <table style="width:100%; border-collapse:collapse; margin:10px 0; font-size:12px; border:1px solid #cbd5e1;">
        <thead>
          <tr style="background:#0f172a; color:#ffffff; font-weight:bold; text-align:center;">
            <th style="padding:10px 6px; border:1px solid #334155; width:4%;">م</th>
            <th style="padding:10px 8px; border:1px solid #334155; text-align:right;">بيان الصنف والمواصفات الفنية</th>
            <th style="padding:10px 6px; border:1px solid #334155; width:8%;">الوحدة</th>
            <th style="padding:10px 6px; border:1px solid #334155; width:9%;">الكمية المقبولة</th>
            <th style="padding:10px 6px; border:1px solid #334155; width:17%;">سعر الوحدة (فئة)</th>
            <th style="padding:10px 6px; border:1px solid #334155; width:19%;">إجمالي القيمة</th>
            <th style="padding:10px 6px; border:1px solid #334155; width:12%;">قرار البت</th>
          </tr>
        </thead>
        <tbody>
          ${acceptedRows}
        </tbody>
        <tfoot>
          <tr style="background:#f8fafc; font-weight:bold;">
            <td colspan="5" style="padding:8px 12px; text-align:left; border:1px solid #cbd5e1;">المجموع قبل الضريبة:</td>
            <td colspan="2" style="padding:8px 12px; font-family:monospace; border:1px solid #cbd5e1; font-size:13px; color:#0f172a;">${formatCurrency(partialSubtotal)}</td>
          </tr>
          ${
            includeVat
              ? `
          <tr style="background:#f8fafc;">
            <td colspan="5" style="padding:8px 12px; text-align:left; border:1px solid #cbd5e1;">ضريبة القيمة المضافة (14%):</td>
            <td colspan="2" style="padding:8px 12px; font-family:monospace; border:1px solid #cbd5e1; color:#0f172a;">${formatCurrency(vatAmount)}</td>
          </tr>`
              : ""
          }
          <tr style="background:#eff6ff; font-weight:bold; color:#1e40af; font-size:14px; border-top:2px solid #2563eb;">
            <td colspan="5" style="padding:10px 12px; text-align:left; border:1px solid #cbd5e1;">الإجمالي العام للعرض المالي المعدل (شامل الضريبة):</td>
            <td colspan="2" style="padding:10px 12px; font-family:monospace; border:1px solid #cbd5e1; color:#1d4ed8; font-size:15px;">${formatCurrency(partialGrandTotal)}</td>
          </tr>
        </tfoot>
      </table>

      <!-- التفقيط المعتمد -->
      <div style="background:#f1f5f9; padding:10px 14px; border-radius:8px; margin: 10px 0; border:1px solid #e2e8f0; font-weight:bold; color:#0f172a; font-size:12px;">
        📌 <strong>التفقيط المعتمد:</strong> فقط وقدره ${tafqeetArabic(partialGrandTotal)} لا غير.
      </div>

      <!-- الشروط العامة والأحكام -->
      <div style="background:#fafafa; border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; margin: 12px 0; font-size:11px; line-height:1.8; color:#334155;">
        <strong style="color:#0f172a; display:block; margin-bottom:4px; font-size:11.5px;">الشروط العامة والمحددات الرسمية للعرض المالي المعدل:</strong>
        <ol style="margin:0; padding-right:18px;">
          <li>الأسعار الموضحة بالجدول سارية حتى موعد انتهاء العطاءات وإصدار أمر التوريد والترسية النهائي.</li>
          <li>التوريد والفحص والاستلام مطابق للشروط والمواصفات الفنية المعتمدة بكراسة الشروط وفترة الضمان المقررة.</li>
          <li>الأسعار المقدمة تشمل كافة مصاريف النقل والشحن والتوريد والتسليم لمخازن جهة الإسناد.</li>
          <li>يخضع هذا العرض لأحكام قانون تنظيم التعاقدات العامة رقم 182 لسنة 2018 ولائحته التنفيذية.</li>
        </ol>
      </div>

      <!-- جدول التوقيعات والاعتماد الرسمي -->
      <div style="margin-top:16px; padding-top:12px; border-top:1px dashed #cbd5e1;">
        <table style="width:100%; border:none; text-align:center; font-size:11.5px;">
          <tr>
            <td style="width:33%; border:none;">
              <strong>المختص الفني / إعداد العرض</strong><br/><br/>
              <span>مهندس التكاليف والمناقصات</span><br/>
              <span style="font-size:10px; color:#94a3b8;">...................................</span>
            </td>
            <td style="width:33%; border:none;">
              <strong>المدير المالي</strong><br/><br/>
              <span>إدارة الحسابات العامة</span><br/>
              <span style="font-size:10px; color:#94a3b8;">...................................</span>
            </td>
            <td style="width:33%; border:none;">
              <strong>رئيس مجلس الإدارة</strong><br/><br/>
              <span>المفوض بالتعاقد والاعتماد</span><br/>
              <span style="font-size:10px; color:#94a3b8;">...................................</span>
            </td>
          </tr>
        </table>
      </div>
    `;
  }, [op, openingDate, partialItems, partialSubtotal, vatAmount, partialGrandTotal, includeVat]);

  // Financial Grievance HTML
  const finGrievanceLetterHtml = useMemo(() => {
    return `
      <p><strong>الموضوع:</strong> تظلم قانوني ومحاسبي من قرار البت المالي لعملية: <strong>${op?.name}</strong> (رقم: <strong>${op?.externalNumber || op?.serialNumber}</strong>).</p>
      
      <p>بالإشارة إلى جلسة البت المالي المنعقدة بتاريخ <strong>${formatDate(openingDate)}</strong>، وإلى قرار اللجنة باستبعاد العطاء المالي المقدم منا؛</p>
      
      <p>نحيط سيادتكم علماً بأن الأسعار المقدمة في عطائنا المالي هي أسعار عادلة ومطابقة لدراسات السوق التقديرية وتلبي شروط الجودة الفنية المطلوبة، وأن الاستبعاد شابه عيب التقدير للأسباب التالية:</p>

      <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:12px; border-radius:8px; margin: 12px 0;">
        <strong>أسباب التظلم المالي:</strong><br/>
        ${finGrievanceReason || "مطابقة الأسعار للقيمة التقديرية للعملية، ومراعاة فروق الأسعار الحالية وخلو العرض من أي خطأ حسابي أو مادي."}
      </div>

      <p>واستناداً إلى المادة 42 من القانون 182 لسنة 2018، نلتمس قبول التظلم وإعادة مراجعة الأسعار وقبول عطائنا أو تجزئة الترسية وفق ما يقتضيه الصالح العام وترشيد الإنفاق الحكومي.</p>
    `;
  }, [op, openingDate, finGrievanceReason]);

  // Initial Guarantee Refund HTML
  const refundLetterHtml = useMemo(() => {
    return `
      <p><strong>الموضوع:</strong> طلب استرداد خطاب / إيصال التأمين الابتدائي لعملية: <strong>${op?.name}</strong> (رقم: <strong>${op?.externalNumber || op?.serialNumber}</strong>).</p>
      <p>نظراً لانتهاء البت المالي والفصل في التظلمات وعدم الترسية على شركتنا، وطبقاً للمادة 42 من القانون 182 لسنة 2018، نرجو التكرم برد مبلغ التأمين الابتدائي البالغ <strong>${formatCurrency(initialGuarAmount)}</strong> (${tafqeetArabic(initialGuarAmount)}) لحسابنا البنكي المعتمد.</p>
    `;
  }, [op, initialGuarAmount]);

  return (
    <div className="space-y-6">
      {/* شريط خطوات مسار البت المالي المتسلسل والواضح */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-foreground">
              مسار جلسة البت المالي وفض المظاريف المالية (قانون 182/2018)
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              الحالة الحالية: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{statusLabel || "بانتظار تقييم الأسعار ومحضر الجلسة"}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold flex-wrap">
          <Badge className={isSessionLocked ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"}>
            1. تقييم الأسعار ومحضر الجلسة {isSessionLocked ? "✓" : "✍️"}
          </Badge>
          <span className="text-muted-foreground">⬅️</span>
          <Badge variant="outline" className={evalOutcome === "ACCEPT_ALL" ? "border-emerald-500 text-emerald-700 bg-emerald-500/10" : evalOutcome === "ACCEPT_PARTIAL" ? "border-amber-500 text-amber-700 bg-amber-500/10" : "border-muted-foreground/30 text-muted-foreground"}>
            2. الترسية والتوريد
          </Badge>
          <span className="text-muted-foreground">أو</span>
          <Badge variant="outline" className={evalOutcome === "REJECTED" ? "border-rose-500 text-rose-700 bg-rose-500/10" : "border-muted-foreground/30 text-muted-foreground"}>
            التظلم والاسترداد
          </Badge>
          {savedFinGrievance && (
            <>
              <span className="text-muted-foreground">⬅️</span>
              <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-500/10">
                3. نتيجة التظلم
              </Badge>
            </>
          )}
        </div>
      </div>

      {/* ━━━ التنبيه المنطقي الإلزامي المرتبط بمرحلة البت الفني ━━━ */}
      {isTechPartiallyAccepted && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-2 border-amber-500/30 flex items-start sm:items-center gap-3 shadow-xs animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-extrabold text-sm text-foreground">
                ربط مسار منطقي تلقائي مع البت الفني: (قبول بعض الأصناف فقط)
              </h4>
              <Badge className="bg-amber-600 text-white text-[10px] font-bold">
                🔒 مسار مقيد قانونياً
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              نظراً لانتهاء مرحلة البت الفني على <strong>(قبول بعض الأصناف واستبعاد أخرى)</strong>، تم حصر مسار التقييم المالي على <strong>(قبول بعض الأصناف / ترسية جزئية)</strong> مع إغلاق خيار القبول الكامل، لضمان المنطقية وصحة الإجراءات قانونياً ومحاسبياً طبقاً لأحكام القانون 182 لسنة 2018.
            </p>
          </div>
        </div>
      )}

      {isTechRejected && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/15 via-rose-500/5 to-transparent border-2 border-rose-500/30 flex items-start sm:items-center gap-3 shadow-xs animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
            <XCircle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-extrabold text-sm text-foreground">
                العطاء مستبعد نهائياً في مرحلة البت الفني:
              </h4>
              <Badge className="bg-rose-600 text-white text-[10px] font-bold">
                🔒 محظور الفتح المالي
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              تم استبعاد هذا العطاء فنياً ولم يُقبل عنه أي تظلم، لذلك لا يجوز فتح مظروفه المالي أو قبوله طبقاً للمادة (42) من قانون تنظيم التعاقدات رقم 182 لسنة 2018.
            </p>
          </div>
        </div>
      )}

      {/* الخطوة 1: تسجيل أو عرض محضر جلسة فض المظاريف المالية وترتيب الأسعار */}
      {!isSessionLocked ? (
        <SectionCard
          title="الخطوة 1: تسجيل محضر جلسة فض المظاريف المالية وترتيب الأسعار"
          icon={Receipt}
          iconColor="text-blue-600 dark:text-blue-400"
          badge={<Badge className="bg-amber-500 text-white font-bold">بانتظار التسجيل ✍️</Badge>}
        >
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4 animate-fade-in">
            <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
              <Receipt className="h-4 w-4 text-blue-500" />
              تسجيل محضر وقرار جلسة فض المظاريف المالية لأول مرة
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">تاريخ انعقاد الجلسة</label>
                <input
                  type="date"
                  value={openingDate}
                  onChange={(e) => setOpeningDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">قرار البت المالي والترسية</label>
                <select
                  value={evalOutcome}
                  disabled={isTechPartiallyAccepted || isTechRejected}
                  onChange={(e) => setEvalOutcome(e.target.value as any)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-bold focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ACCEPT_ALL" disabled={isTechPartiallyAccepted || isTechRejected}>
                    قبول كل الأصناف (ترسية كاملة 100%) ✓
                  </option>
                  <option value="ACCEPT_PARTIAL" disabled={isTechRejected}>
                    قبول بعض الأصناف (ترسية جزئية وتعديل BOQ) 🟡
                  </option>
                  <option value="REJECTED">
                    استبعاد / رفض مالي (عدم الترسية لارتفاع السعر) ✗
                  </option>
                </select>
              </div>
            </div>

            {/* Competitors List Inputs */}
            <div className="space-y-2 pt-2 border-t border-border">
              <label className="text-xs font-bold text-foreground block">
                أسعار الشركات المتنافسة بالجلسة (تلقائي الترتيب):
              </label>
              {competitors.map((comp, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={comp.competitorName}
                    onChange={(e) => {
                      const updated = [...competitors];
                      updated[idx].competitorName = e.target.value;
                      setCompetitors(updated);
                    }}
                    className={`border rounded-xl px-3 py-1.5 text-xs text-foreground ${
                      comp.isOwnCompany ? "bg-blue-500/10 border-blue-500/40 font-bold" : "bg-background border-border"
                    }`}
                    placeholder="اسم الشركة"
                  />
                  <input
                    type="number"
                    value={comp.price}
                    onChange={(e) => {
                      const updated = [...competitors];
                      updated[idx].price = Number(e.target.value);
                      setCompetitors(updated);
                    }}
                    className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-mono font-bold"
                    placeholder="السعر الإجمالي (ج.م)"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                size="sm"
                onClick={handleSaveFinOpening}
                disabled={savingOpening}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 rounded-xl shadow-md cursor-pointer"
              >
                {savingOpening ? "جاري الحفظ والتثبيت..." : "حفظ وتثبيت محضر الجلسة والقرار 💾"}
              </Button>
            </div>
          </div>
        </SectionCard>
      ) : (
        <SectionCard
          title="الخطوة 1: محضر وقرار جلسة فض المظاريف المالية وترتيب الأسعار"
          icon={Receipt}
          iconColor="text-blue-600 dark:text-blue-400"
          badge={
            <Badge
              className={
                evalOutcome === "ACCEPT_ALL"
                  ? "bg-emerald-600 text-white font-bold text-xs"
                  : evalOutcome === "ACCEPT_PARTIAL"
                  ? "bg-amber-600 text-white font-bold text-xs"
                  : "bg-rose-600 text-white font-bold text-xs"
              }
            >
              {evalOutcome === "ACCEPT_ALL"
                ? "القرار: قبول كل الأصناف (ترسية كاملة) ✓ 🔒"
                : evalOutcome === "ACCEPT_PARTIAL"
                ? "القرار: قبول بعض الأصناف (ترسية جزئية) 🟡 🔒"
                : "القرار: استبعاد مالي ✗ 🔒"}
            </Badge>
          }
          actions={
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingFo(savedFo)}
                className="text-xs h-8 px-3 rounded-xl border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-1.5 cursor-pointer font-bold shadow-2xs"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>تعديل محضر الجلسة ✏️</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteFinOpening(savedFo.id)}
                className="text-xs h-8 px-2.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1 cursor-pointer"
                title="حذف هذا المحضر بالكامل"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          }
        >
          <div className="p-5 rounded-2xl bg-blue-500/10 border-2 border-blue-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
                  <Receipt className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-foreground text-base">
                      محضر جلسة فض المظاريف المالية وترتيب الأسعار
                    </h4>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-white dark:bg-slate-900 border shadow-2xs">
                      مسجل ومعتمد في المنظومة 🔒
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    تاريخ انعقاد الجلسة: <strong className="text-foreground">{formatDate(savedFo.openingDate)}</strong>
                    {savedFo.notes && <span className="mr-2 text-foreground font-semibold">• {savedFo.notes}</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Competitor list */}
            <div className="space-y-2 pt-2 border-t border-blue-200 dark:border-blue-900/50">
              <span className="text-xs font-bold text-foreground block">
                ترتيب أسعار العطاءات المنافسة بالجلسة:
              </span>
              {(savedFo.competitors || []).map((c: any) => (
                <div
                  key={c.id || c.competitorName}
                  className={`flex items-center justify-between p-3 rounded-xl text-xs transition-all ${
                    c.isOwnCompany
                      ? "bg-blue-600 text-white font-black shadow-xs ring-2 ring-blue-400/30"
                      : "bg-card border border-border text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] ${
                      c.isOwnCompany ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      {c.rank || "—"}
                    </span>
                    <span>
                      {c.competitorName} {c.isOwnCompany ? "(عطاؤنا المعتمد ⭐)" : ""}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-sm">{formatCurrency(c.price)}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      )}

      {/* Edit Financial Opening Modal */}
      {editingFo && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
            <div className="bg-card text-card-foreground border border-border rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Edit className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-foreground text-sm">تعديل محضر الفتح المالي</h4>
                </div>
                <button onClick={() => setEditingFo(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">تاريخ الجلسة</label>
                  <input
                    type="date"
                    value={editingFo.openingDate ? editingFo.openingDate.split("T")[0] : ""}
                    onChange={(e) => setEditingFo({ ...editingFo, openingDate: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">ملاحظات المحضر</label>
                  <input
                    type="text"
                    value={editingFo.notes || ""}
                    onChange={(e) => setEditingFo({ ...editingFo, notes: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground block">تعديل أسعار المتنافسين</label>
                  {(editingFo.competitors || []).map((comp: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={comp.competitorName}
                        onChange={(e) => {
                          const updated = [...editingFo.competitors];
                          updated[idx] = { ...updated[idx], competitorName: e.target.value };
                          setEditingFo({ ...editingFo, competitors: updated });
                        }}
                        className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground"
                      />
                      <input
                        type="number"
                        value={comp.price}
                        onChange={(e) => {
                          const updated = [...editingFo.competitors];
                          updated[idx] = { ...updated[idx], price: Number(e.target.value) };
                          setEditingFo({ ...editingFo, competitors: updated });
                        }}
                        className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-mono font-bold"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setEditingFo(null)} className="text-xs">
                  إلغاء
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpdateFinOpening}
                  disabled={savingEditFo}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 rounded-xl"
                >
                  {savingEditFo ? "جاري الحفظ..." : "حفظ التعديلات"}
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* الخطوات المتسلسلة التالية: تظهر فقط بعد تثبيت محضر الجلسة بالخطوة 1 */}
      {isSessionLocked && (
        <>
          {/* المسار 1: في حالة القبول الكلي -> الخطوة 2: تصفح دراسة السوق والاستعداد للتوريد */}
          {evalOutcome === "ACCEPT_ALL" && (
            <div className="space-y-4 animate-fade-in">
              <SectionCard
                title="الخطوة 2: الاستعداد للشراء وتوريد الأصناف — ملفات دراسة السوق المعتمدة"
                icon={PackageCheck}
                iconColor="text-emerald-600 dark:text-emerald-400"
                badge={<Badge className="bg-emerald-600 text-white text-[10px] font-bold">ترسية كاملة لكافة الأصناف ✓</Badge>}
                actions={
                  onGoAward && (
                    <Button
                      size="sm"
                      onClick={onGoAward}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8.5 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
                    >
                      <span>الانتقال لمرحلة الترسية وأمر التوريد</span>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  )
                }
              >
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-1">
                  <p className="font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    جاهز للبدء في إجراءات الشراء والتوريد:
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 font-medium">
                    يمكنك هنا تصفح واختيار عروض أسعار الموردين التي تم رفعها في المرحلة 3 (دراسة السوق) لطباعتها أو تحميلها لبدء إصدار أوامر الشراء فوراً.
                  </p>
                </div>

                {/* Market Study Documents Browser */}
                {marketStudyDocs.length > 0 ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <span className="text-xs font-bold text-foreground">
                        عروض أسعار الموردين ومستندات دراسة السوق ({marketStudyDocs.length} ملف)
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const all: Record<string, boolean> = {};
                            marketStudyDocs.forEach((d: any) => (all[d.id] = true));
                            setSelectedMarketDocs(all);
                            toast.success("تم تحديد كافة الملفات للتحميل والطباعة ✓");
                          }}
                          className="text-[11px] h-7 px-2.5 rounded-lg"
                        >
                          تحديد الكل
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedMarketDocs({})}
                          className="text-[11px] h-7 px-2.5 rounded-lg"
                        >
                          إلغاء التحديد
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {marketStudyDocs.map((doc: any) => {
                        const isSelected = !!selectedMarketDocs[doc.id];
                        return (
                          <div
                            key={doc.id}
                            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                              isSelected
                                ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-400 dark:border-blue-600 shadow-xs"
                                : "bg-card border-border hover:border-blue-300 dark:hover:border-blue-800"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) =>
                                  setSelectedMarketDocs((prev) => ({
                                    ...prev,
                                    [doc.id]: e.target.checked,
                                  }))
                                }
                                className="rounded h-4 w-4 text-blue-600 cursor-pointer"
                              />
                              <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-[10px] shrink-0 border border-red-500/20">
                                PDF
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate" title={doc.fileName}>
                                  {doc.fileName}
                                </p>
                                <span className="text-[10px] text-muted-foreground block">
                                  {formatDate(doc.createdAt)} • دراسة السوق
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onPreviewDoc?.(doc)}
                                className="h-7 w-7 p-0 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                                title="معاينة المستند"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  if (!confirm(`هل أنت متأكد من حذف مستند "${doc.fileName}"؟`)) return;
                                  try {
                                    await api.delete(`/operations/${op.id}/documents/${doc.id}`);
                                    toast.success("تم حذف المستند بنجاح 🗑️");
                                    onRefresh();
                                  } catch {
                                    toast.error("فشل حذف المستند");
                                  }
                                }}
                                className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                                title="حذف المستند"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-muted/40 border border-dashed border-border text-center text-xs text-muted-foreground">
                    لم يتم رفع مستندات في مرحلة دراسة السوق بعد. يمكنك متابعة التوريد مباشرة.
                  </div>
                )}
              </SectionCard>
            </div>
          )}

          {/* المسار 2: في حالة القبول الجزئي -> الخطوة 2: جدول BOQ التفاعلي وإعادة الاحتساب */}
          {evalOutcome === "ACCEPT_PARTIAL" && (
            <div className="space-y-4 animate-fade-in">
              <SectionCard
                title="الخطوة 2: جدول الكميات التفاعلي BOQ — تعديل وتثبيت الترسية الجزئية"
                icon={FileSpreadsheet}
                iconColor="text-amber-600 dark:text-amber-400"
                badge={
                  <Badge className="bg-amber-600 text-white text-[10px] font-bold">
                    {partialItems.filter((i: BoqItem) => i.isAccepted).length} من {partialItems.length} بند مقبول
                  </Badge>
                }
                actions={
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleAddNewItem}
                      variant="outline"
                      className="text-xs h-8 px-2.5 rounded-xl border-border flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>إضافة بند</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setPartialModalOpen(true)}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>معاينة وطباعة محضر الترسية الجزئية</span>
                    </Button>
                  </div>
                }
              >
                {/* Interactive Editable BOQ Table */}
                <div className="overflow-x-auto border border-border rounded-2xl bg-card">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-muted/70 text-muted-foreground font-bold border-b border-border">
                      <tr>
                        <th className="p-3 text-center w-12">قبول</th>
                        <th className="p-3">بيان الصنف والمواصفات</th>
                        <th className="p-3 text-center w-20">الوحدة</th>
                        <th className="p-3 text-center w-28">الكمية المقبولة</th>
                        <th className="p-3 text-center w-32">سعر الوحدة (ج.م)</th>
                        <th className="p-3 text-left w-36">إجمالي البند</th>
                        <th className="p-3 text-center w-12">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {partialItems.map((item: BoqItem) => (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            item.isAccepted ? "bg-card hover:bg-muted/30" : "bg-muted/20 opacity-50"
                          }`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={item.isAccepted}
                              onChange={() => handleToggleItem(item.id)}
                              className="h-4 w-4 rounded text-amber-600 cursor-pointer"
                            />
                          </td>

                          <td className="p-3 font-medium text-foreground">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPartialItems((prev: BoqItem[]) =>
                                  prev.map((i: BoqItem) => (i.id === item.id ? { ...i, name: val } : i))
                                );
                              }}
                              className="w-full bg-transparent border-0 font-bold focus:ring-1 focus:ring-amber-500 rounded px-1.5 py-0.5 text-xs text-foreground"
                            />
                          </td>

                          <td className="p-3 text-center text-muted-foreground">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPartialItems((prev: BoqItem[]) =>
                                  prev.map((i: BoqItem) => (i.id === item.id ? { ...i, unit: val } : i))
                                );
                              }}
                              className="w-full bg-transparent border-0 text-center focus:ring-1 focus:ring-amber-500 rounded px-1 text-xs"
                            />
                          </td>

                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.acceptedQty}
                              disabled={!item.isAccepted}
                              onChange={(e) => handleUpdateItem(item.id, "acceptedQty", Number(e.target.value))}
                              className="w-20 bg-background border border-border rounded-lg px-2 py-1 text-center font-bold text-xs"
                            />
                          </td>

                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              disabled={!item.isAccepted}
                              onChange={(e) => handleUpdateItem(item.id, "unitPrice", Number(e.target.value))}
                              className="w-24 bg-background border border-border rounded-lg px-2 py-1 text-center font-bold font-mono text-xs"
                            />
                          </td>

                          <td className="p-3 text-left font-mono font-bold text-foreground">
                            {formatCurrency(item.isAccepted ? item.acceptedQty * item.unitPrice : 0)}
                          </td>

                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-muted-foreground hover:text-rose-500 cursor-pointer p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Real-time Recalculation Summary Card */}
                <div className="p-4 sm:p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-slate-600 dark:text-slate-400">المجموع قبل الضريبة:</span>
                      <span className="font-mono font-bold text-sm text-foreground">{formatCurrency(partialSubtotal)}</span>
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 mr-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeVat}
                          onChange={(e) => setIncludeVat(e.target.checked)}
                          className="rounded h-3.5 w-3.5 text-amber-600"
                        />
                        <span>إضافة ضريبة القيمة المضافة (14%)</span>
                      </label>
                    </div>
                    <div className="text-xs text-amber-800 dark:text-amber-300 font-bold">
                      التفقيط المعتمد: {tafqeetArabic(partialGrandTotal)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 flex-wrap">
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block font-bold">إجمالي الترسية الجزئية</span>
                      <span className="text-xl font-black text-amber-700 dark:text-amber-400 font-mono">
                        {formatCurrency(partialGrandTotal)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPartialModalOpen(true)}
                      className="border-2 border-amber-500/60 hover:bg-amber-500/10 text-amber-900 dark:text-amber-200 font-bold text-xs h-9 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="معاينة قالب العرض المالي بالبيانات الجديدة والبنود المقبولة"
                    >
                      <Eye className="h-4 w-4 text-amber-600" />
                      <span>معاينة الخطاب الجديد (البنود المقبولة) 📜</span>
                    </Button>
                    {onGoAward && (
                      <Button
                        size="sm"
                        onClick={handleAwardAndAdvance}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
                      >
                        <span>اعتماد والانتقال للترسية</span>
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* المسار 3: في حالة الاستبعاد المالي -> مسار التظلم المالي أو الاسترداد المباشر */}
          {evalOutcome === "REJECTED" && (
            <div className="space-y-4 animate-fade-in">
              {/* إذا كان المستخدم في وضع تحرير/معاينة التظلم المالي الرسمي المعتمد */}
              {isEditingFinGrievance ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                      <Scale className="h-4 w-4 text-indigo-600" />
                      {savedFinGrievance
                        ? "معاينة وتعديل بيانات ومحرر خطاب التظلم المالي المعتمد (قالب الوورد الرسمي)"
                        : "إعداد وتجهيز خطاب التظلم المالي والمحاسبي وفقاً للقانون 182 لسنة 2018"}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingFinGrievance(false)}
                      className="text-xs text-muted-foreground hover:text-foreground h-8 px-3 rounded-xl"
                    >
                      {savedFinGrievance ? "الرجوع لمتابعة حالة التظلم ↩️" : "إلغاء والرجوع للخيارات ✕"}
                    </Button>
                  </div>

                  {/* تضمين قسم خطاب التظلم المالي الحقيقي بالقالب المعتمد والخانات الأصلية */}
                  <GrievanceLetterSection
                    op={op}
                    stage="financial"
                    onRefresh={onRefresh}
                    onClose={() => setIsEditingFinGrievance(false)}
                  />

                  {/* شريط الإجراءات والاعتماد أسفل الخطاب */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border-2 border-indigo-500/30 flex items-center justify-between flex-wrap gap-3 shadow-md">
                    <div>
                      <h5 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                        <Scale className="h-5 w-5 text-indigo-600" />
                        <span>{savedFinGrievance ? "بيانات التظلم المالي مسجلة بالمنظومة" : "تسجيل واعتماد التظلم المالي رسمياً"}</span>
                      </h5>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {savedFinGrievance
                          ? "تم حفظ كافة التعديلات على بنود وأسباب التظلم بالقالب أعلاه ومزامنتها بنجاح."
                          : "بعد الانتهاء من مراجعة وضبط بنود وأسعار التظلم بالقالب المعتمد أعلاه، اضغط لتسجيل التظلم رسمياً وبدء مهلة الـ 7 أيام."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingFinGrievance(false)}
                        className="text-xs h-9 px-4 rounded-xl"
                      >
                        {savedFinGrievance ? "الرجوع لمتابعة حالة التظلم ↩️" : "إغلاق محرر التظلم ✕"}
                      </Button>
                      {!savedFinGrievance && (
                        <Button
                          size="sm"
                          onClick={handleRegisterFinGrievanceOfficial}
                          disabled={savingFinGrievance}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs h-9 px-5 rounded-xl flex items-center gap-2 shadow-md cursor-pointer"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{savingFinGrievance ? "جاري التسجيل والاعتماد..." : "تسجيل التظلم المالي رسمياً واعتماده ⚖️"}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : !savedFinGrievance ? (
                !showFinalRefundSection ? (
                  <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-rose-50 via-white to-rose-50/50 dark:from-rose-950/40 dark:via-slate-900 dark:to-slate-950 border-2 border-rose-300 dark:border-rose-600/50 shadow-xs space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
                        <Scale className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-foreground text-base">
                          الخطوة 2: قرار الاستبعاد المالي — الخيارات القانونية المتاحة (قانون 182 لسنة 2018)
                        </h4>
                        <p className="text-xs text-rose-700 dark:text-rose-400 font-medium mt-0.5">
                          المهلة القانونية لتقديم التظلم المالي: 7 أيام عمل أمام السلطة المختصة (المادة 42)
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-foreground space-y-1">
                      <p className="font-bold text-rose-800 dark:text-rose-300">
                        تم استبعاد العطاء المالي في جلسة فض المظاريف المالية لارتفاع السعر أو عدم الترسية.
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        يحق للشركة قانوناً تقديم تظلم مالي ومحاسبي لإعادة مراجعة الأسعار طبقاً لدراسات السوق، أو تخطي التظلم والانتقال فوراً للمطالبة باسترداد التأمين الابتدائي.
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowFinalRefundSection(true)}
                        className="text-xs h-9 px-4 rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-bold"
                      >
                        تخطي التظلم واسترداد التأمين فوراً 📄
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => setIsEditingFinGrievance(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs h-9 px-5 rounded-xl flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-500/20"
                      >
                        <Scale className="h-4 w-4" />
                        <span>عمل وتجهيز خطاب التظلم المالي الرسمي (قالب الوورد المعتمد) ⚖️</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* اختار المستخدم تخطي التظلم المالي -> إظهار نموذج استرداد التأمين مباشرة */
                  <div className="space-y-3 animate-fade-in">
                    <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-border flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        تم اختيار: تخطي التظلم والمطالبة باسترداد التأمين الابتدائي مباشرة 📄
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowFinalRefundSection(false)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        الرجوع لخيارات التظلم ↩️
                      </Button>
                    </div>
                    <FinalInsuranceRefundSection
                      op={op}
                      onRefresh={onRefresh}
                      triggerContext="GRIEVANCE_REJECTED"
                      onClose={() => setShowFinalRefundSection(false)}
                    />
                  </div>
                )
              ) : (
                /* تم تقديم التظلم المالي بالفعل -> الخطوة 3: في انتظار النتيجة وتسجيل رد الجهة */
                <div className="space-y-4 animate-fade-in">
                  <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-50 via-white to-amber-50/50 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-950 border-2 border-amber-300 dark:border-amber-600/50 shadow-xs space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-amber-200 dark:border-amber-800/60">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
                          <Clock className="h-5 w-5 animate-spin" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-foreground text-base">
                            الخطوة 3: التظلم المالي المقدم — في انتظار نتيجة التظلم ⏳
                          </h4>
                          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                            كود التظلم: {savedFinGrievance.hashCode || "GRV-FIN-2026"} • مهلة الرد الرسمية: 7 أيام
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsEditingFinGrievance(true)}
                          className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-bold text-xs h-8 px-3 rounded-xl flex items-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>معاينة / تعديل التظلم</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteFinGrievance(savedFinGrievance.id)}
                          className="text-xs text-rose-600 hover:bg-rose-50 h-8 px-2.5 rounded-xl flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>إلغاء التظلم</span>
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-white/70 dark:bg-slate-950/70 p-3 rounded-xl border border-border">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">تاريخ التقديم:</span>
                        <strong className="text-foreground">{formatDate(savedFinGrievance.filingDate || savedFinGrievance.createdAt)}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">أقصى مهلة للرد (7 أيام):</span>
                        <strong className="text-rose-600">{formatDate(savedFinGrievance.deadlineDate)}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">الجهة الموجه إليها:</span>
                        <strong className="text-foreground">السلطة المختصة مباشرة (قانون 182)</strong>
                      </div>
                    </div>

                    <p className="text-xs text-foreground/90 bg-muted/40 p-2.5 rounded-xl">
                      <strong>أسباب وأسانيد التظلم المالي:</strong> {savedFinGrievance.reason}
                    </p>

                    {/* تسجيل رد السلطة المختصة على التظلم المالي */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h5 className="font-extrabold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                          تسجيل رد وقرار السلطة المختصة على التظلم المالي:
                        </h5>
                        <span className="text-[11px] text-muted-foreground">اختر رد الجهة لتوجيه مسار العملية تلقائياً</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        {/* 1. قبول كلي */}
                        <button
                          type="button"
                          onClick={() => handleUpdateFinGrievanceStatus("ACCEPTED")}
                          className={`p-3.5 rounded-2xl border-2 text-right transition-all cursor-pointer ${
                            finGrievanceOutcome === "ACCEPTED"
                              ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 ring-4 ring-emerald-500/20 shadow-md shadow-emerald-500/10"
                              : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400 hover:bg-emerald-50/50"
                          }`}
                        >
                          <span className="font-black text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            1. قبول التظلم كلياً 🟢
                          </span>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed font-medium">
                            قبول كافة الأصناف، إلغاء الاستبعاد، وعودة الترسية الكاملة وأوامر الشراء
                          </p>
                        </button>

                        {/* 2. قبول جزئي */}
                        <button
                          type="button"
                          onClick={() => handleUpdateFinGrievanceStatus("PARTIALLY_ACCEPTED")}
                          className={`p-3.5 rounded-2xl border-2 text-right transition-all cursor-pointer ${
                            finGrievanceOutcome === "PARTIALLY_ACCEPTED"
                              ? "bg-amber-50 dark:bg-amber-950/60 border-amber-500 ring-4 ring-amber-500/20 shadow-md shadow-amber-500/10"
                              : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400 hover:bg-amber-50/50"
                          }`}
                        >
                          <span className="font-black text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                            <FileSpreadsheet className="h-4 w-4 text-amber-600" />
                            2. قبول التظلم جزئياً 🟡
                          </span>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed font-medium">
                            قبول الترسية لبعض الأصناف واستمرار التنافس على البنود المقبولة في جدول BOQ
                          </p>
                        </button>

                        {/* 3. رفض */}
                        <button
                          type="button"
                          onClick={() => handleUpdateFinGrievanceStatus("REJECTED")}
                          className={`p-3.5 rounded-2xl border-2 text-right transition-all cursor-pointer ${
                            finGrievanceOutcome === "REJECTED"
                              ? "bg-rose-50 dark:bg-rose-950/60 border-rose-500 ring-4 ring-rose-500/20 shadow-md shadow-rose-500/10"
                              : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-400 hover:bg-rose-50/50"
                          }`}
                        >
                          <span className="font-black text-xs text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                            <XCircle className="h-4 w-4 text-rose-600" />
                            3. رفض التظلم 🔴
                          </span>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed font-medium">
                            تأكيد قرار الاستبعاد، وفتح مسار استرداد التأمين الابتدائي فوراً
                          </p>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* الخطوة 4: إذا رُفض التظلم المالي -> زر ومسار استرداد التأمين الابتدائي المعتمد */}
                  {finGrievanceOutcome === "REJECTED" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <h5 className="font-extrabold text-sm text-rose-800 dark:text-rose-300 flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-rose-600" />
                            <span>الخطوة 4: تم رفض التظلم المالي وتأكيد الاستبعاد نهائياً — استرداد التأمين الابتدائي</span>
                          </h5>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            طبقاً للمادة (38) و(42) من القانون 182/2018، تلتزم جهة الإسناد برد التأمين الابتدائي فوراً دون أي خصم.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setShowRefundAfterFinGrievanceReject((prev) => !prev)}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs h-9 px-4 rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
                        >
                          <Receipt className="h-4 w-4" />
                          <span>{showRefundAfterFinGrievanceReject ? "إخفاء نموذج وقالب استرداد التأمين ✕" : "فتح نموذج وقالب استرداد التأمين الابتدائي 📄"}</span>
                        </Button>
                      </div>

                      {showRefundAfterFinGrievanceReject && (
                        <div className="animate-fade-in">
                          <FinalInsuranceRefundSection
                            op={op}
                            onRefresh={onRefresh}
                            triggerContext="GRIEVANCE_REJECTED"
                            onClose={() => setShowRefundAfterFinGrievanceReject(false)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modals: Partial Award Modal (قالب العرض المالي المعدل) */}
      <EgyptianOfficialLetterModal
        isOpen={partialModalOpen}
        onClose={() => setPartialModalOpen(false)}
        title="العرض المالي وجدول الفئات والأسعار المعتمد (المعدل)"
        subTitle="صادر وموثق طبقاً لقرارات لجنة البت المالي للبنود المقبولة واستبعاد البنود المرفوضة"
        op={op}
        company={currentCompany}
        contentHtml={partialAwardStatementHtml}
        onSyncFinancialOffer={handleSyncFinancialOfferWithAcceptedItems}
        syncingOffer={syncingOffer}
        onSaveToArchive={async () => {
          await api.post(`/operations/${op.id}/documents`, {
            fileName: `العرض_المالي_المعدل_${op.name.replace(/\s+/g, "_")}.pdf`,
            type: "TECH_SPECS",
          }).catch(() => {});
        }}
      />



      {/* Continuity Action Footer (التسجيل 1 & 2) */}
      <StepFooterNav
        currentTabId="fin_opening"
        onNavigate={onNavigate || ((tabId) => { if (tabId === "award") onGoAward?.(); })}
      />
    </div>
  );
}
