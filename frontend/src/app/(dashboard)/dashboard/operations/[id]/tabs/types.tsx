"use client";

import React, { useState, useRef } from "react";
import {
  FileText, Calendar, TrendingUp, BookOpen, HelpCircle,
  ClipboardCheck, Coins, Package, FolderOpen, DollarSign,
  Trophy, ShieldCheck, Truck, Calculator, BarChart3, Archive,
  Upload, Check, Copy, Globe, Gavel, MapPin, Scale, CheckCircle2, Circle, FileCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   OPERATION & TAB TYPES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export interface Operation {
  id: string;
  serialNumber: number;
  externalNumber: string | null;
  name: string;
  title?: string;
  authority: string;
  governorate: string | null;
  tenderType: string;
  status: string;
  isCodeLocked: boolean;
  isArchived: boolean;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  companies: any[];
  dates: any[];
  contacts: any[];
  documents: any[];
  technicalOffers: any[];
  financialOffers: any[];
  guarantees: any[];
  submissions: any[];
  technicalOpenings: any[];
  financialOpenings: any[];
  grievances: any[];
  awards: any[];
  supplyOrders: any[];
  purchases: any[];
  certificates: any[];
  operationFinance: any;
  portalDetails?: any;
  radarItem?: any;
}

export interface TabDef {
  id: string;
  label: string;
  shortLabel: string;
  icon: any;
  order: number;
  color: string;
  description: string;
}

export const LIFECYCLE_TABS: TabDef[] = [
  { id: "overview", label: "البيانات الأساسية والشركات", shortLabel: "الأساسية", icon: FileText, order: 1, color: "slate", description: "بيانات العملية، جهة الإسناد، والشركات المشاركة بأكوادها المستقلة" },
  { id: "dates", label: "التواريخ والتنبيهات", shortLabel: "التواريخ", icon: Calendar, order: 2, color: "indigo", description: "المواعيد الرسمية، جلسات الفتح، والعد التنازلي للإنذارات الحرجة" },
  { id: "market_study", label: "دراسة السوق والجدوى", shortLabel: "دراسة السوق", icon: TrendingUp, order: 3, color: "blue", description: "أرشيف ملفات دراسة السوق، جدول بنود وعروض أسعار الموردين، ومقارنة التكاليف" },
  { id: "booklet", label: "الكراسة والتأمين الابتدائي", shortLabel: "الكراسة والتأمين", icon: BookOpen, order: 4, color: "cyan", description: "طباعة خطابات السحب والتأمين، إيصالات السداد، رفع كراسة الشروط، وأرشيف صور المواصفات" },
  { id: "clarification", label: "خطاب التوضيح والاستفسارات", shortLabel: "خطاب التوضيح", icon: HelpCircle, order: 5, color: "amber", description: "توليد وطباعة خطاب الاستفسارات الموجه لجهة الإسناد قبل تقديم العطاء الفني" },
  { id: "technical", label: "العرض الفني والمواصفات", shortLabel: "الفني", icon: ClipboardCheck, order: 6, color: "purple", description: "تجهيز المظروف الفني، الكتالوجات، والغلاف الذكي المعتمد" },
  { id: "financial", label: "العرض المالي وجدول الكميات", shortLabel: "المالي", icon: Coins, order: 7, color: "teal", description: "تسعير البنود، احتساب الهوامش، وتقديم العطاء رسمياً" },
  { id: "declarations", label: "الإقرارات والخطابات الرسمية", shortLabel: "الإقرارات والخطابات", icon: FileCheck, order: 8, color: "emerald", description: "توليد وطباعة إقرار الالتزام بكراسة الشروط وإقرار التأمينات والعمالة والخطاب العام مطابقة لقوالب Word الرسمية" },
  { id: "submission_package", label: "تجهيز وطباعة ملفات التقديم", shortLabel: "ملفات التقديم", icon: Package, order: 9, color: "blue", description: "تجميع وطباعة حزمة ملفات العطاء للمظروفين الفني والمالي وتحميلها بمجلد مضغوط ZIP" },
  { id: "tech_opening", label: "نتيجة البت الفني والطعون", shortLabel: "البت الفني", icon: FolderOpen, order: 10, color: "indigo", description: "قرارات لجنة الفحص الفني، الاستيفاء، القبول، التظلم، واسترداد التأمين" },
  { id: "fin_opening", label: "نتيجة البت المالي والترتيب", shortLabel: "البت المالي", icon: DollarSign, order: 11, color: "cyan", description: "جلسة الفتح المالي، الشراء، الترسية الجزئية، التظلم، واسترداد التأمين" },
  { id: "award", label: "قرار الترسية الرسمي", shortLabel: "الترسية", icon: Trophy, order: 12, color: "amber", description: "إخطار الترسية الرسمي، اسم الشركة الفائزة، وقيمة الترسية المعتمدة" },
  { id: "supply_order", label: "أمر التوريد والتعاقد الرسمي", shortLabel: "أمر التوريد", icon: Truck, order: 13, color: "blue", description: "تسجيل رقم وتاريخ أمر التوريد الصادر من الجهة، مدة التنفيذ، وشروط التوريد" },
  { id: "guarantee_final", label: "التأمين النهائي (5%)", shortLabel: "التأمين النهائي", icon: ShieldCheck, order: 14, color: "emerald", description: "خطابات سداد التأمين النهائي، الخصم من المستحقات، الضمان البنكي، والباركود" },
  { id: "supply", label: "التوريد والاستلام والفحص", shortLabel: "التوريد", icon: Truck, order: 15, color: "blue", description: "توريد الشحنات، أذون الإضافة بالمخازن، ومحاضر الفحص والاستلام" },
  { id: "certificates", label: "المستخلصات والدفعات", shortLabel: "المستخلصات", icon: Calculator, order: 16, color: "teal", description: "أوامر الصرف، المستخلصات المالية، واستقطاعات الضرائب والتأمينات" },
  { id: "finance", label: "الحسابات والمالية والأرباح", shortLabel: "المالية", icon: BarChart3, order: 17, color: "emerald", description: "التكلفة الإجمالية الفعلية، التدفقات النقدية، وصافي أرباح العملية" },
  { id: "close", label: "إغلاق العملية والأرشيف", shortLabel: "الإغلاق والأرشيف", icon: Archive, order: 18, color: "slate", description: "استرداد خطابات الضمان، الأرشيف الرقمي للمستندات، والإغلاق النهائي" },
];

export const STATUS_LABELS: Record<string, { label: string; badgeBg: string }> = {
  DRAFT: { label: "مسودة أولية", badgeBg: "bg-muted text-muted-foreground border-border" },
  BOOKLET_WITHDRAWN: { label: "تم سحب الكراسة وقفل الكود", badgeBg: "badge-blue" },
  SUBMITTED: { label: "تم تقديم العطاء", badgeBg: "badge-purple" },
  TECHNICAL_OPENED: { label: "جلسة فتح فني", badgeBg: "badge-purple" },
  TECHNICAL_ACCEPTED: { label: "مقبول فنياً 🟢", badgeBg: "badge-emerald" },
  TECHNICAL_REJECTED: { label: "مرفوض فنياً 🔴", badgeBg: "badge-rose" },
  GRIEVANCE_FILED: { label: "تظلم قيد النظر ⚖️", badgeBg: "badge-amber" },
  FINANCIAL_OPENED: { label: "جلسة فتح مالي 💵", badgeBg: "badge-blue" },
  AWARDED: { label: "تمت الترسية والفوز 🏆", badgeBg: "badge-amber" },
  SUPPLY_IN_PROGRESS: { label: "جاري التوريد والتنفيذ 📦", badgeBg: "badge-blue" },
  COMPLETED: { label: "مكتمل — استلام نهائي ✅", badgeBg: "badge-emerald" },
  CLOSED: { label: "مغلقة رسمياً 🔒", badgeBg: "bg-muted text-muted-foreground border-border" },
  CANCELLED: { label: "ملغاة", badgeBg: "badge-rose" },
  ARCHIVED: { label: "مؤرشفة 🗄️", badgeBg: "bg-muted text-muted-foreground border-border" },
};

export const TENDER_TYPE_LABELS: Record<string, string> = {
  TENDER: "مناقصة عامة",
  LIMITED_TENDER: "مناقصة محدودة",
  PRACTICE: "ممارسة عامة",
  LIMITED_PRACTICE: "ممارسة محدودة",
  AUCTION: "مزايدة علنية",
  DIRECT_ORDER: "أمر إسناد مباشر",
};

export const DATE_TYPE_LABELS: Record<string, string> = {
  PUBLICATION: "تاريخ النشر والإعلان",
  INQUIRIES_START: "تاريخ بدء الاستفسارات",
  INQUIRIES_DEADLINE: "آخر موعد لتلقي الاستفسارات",
  INQUIRIES_SESSION: "جلسة الرد على الاستفسارات",
  BOOKLET_DEADLINE: "آخر موعد لسحب الكراسة وتقديم العطاءات",
  TECHNICAL_OPENING: "موعد فتح المظاريف الفنية",
  AUCTION_SESSION: "موعد جلسة المزاد العلني",
  TECHNICAL_DECISION: "تاريخ قرار البت الفني",
  FINANCIAL_OPENING: "موعد فتح المظاريف المالية",
  FINANCIAL_DECISION: "تاريخ قرار البت المالي",
  AWARD_SESSION: "تاريخ جلسة / إخطار الترسية",
  SITE_HANDOVER: "تاريخ تسليم الموقع",
  EXECUTION_START: "تاريخ بداية التنفيذ",
  EXECUTION_END: "تاريخ نهاية التنفيذ",
  OTHER: "جلسة أو موعد آخر",
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   FORMATTING & TAFQEET HELPERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function formatCurrency(n: number) {
  return new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP" }).format(n);
}

export function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

export function formatDateTime(d: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return d;
  }
}

export function getCountdown(dateStr: string) {
  if (!dateStr) return { text: "غير محدد", urgent: false, days: 0, hours: 0, expired: false };
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return { text: "انتهى الموعد", urgent: true, days: 0, hours: 0, expired: true };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return { text: `${days} يوم و ${hours} ساعة`, urgent: days <= 2, days, hours, expired: false };
}

export function formatDocFileSize(bytes?: number | null): string {
  if (!bytes || isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} م.ب`;
}

export function tafqeetArabic(num: number): string {
  if (!num || isNaN(num)) return "";
  num = Math.round(num);
  if (num === 0) return "صفر جنيه مصري";

  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"];
  const teens = ["أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مائة", "مئتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعون", "ثمانمائة", "تسعمائة"];

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
  if (billions > 0) parts.push(billions === 1 ? "مليار" : billions === 2 ? "ملياران" : convertGroup(billions) + " مليار");
  if (millions > 0) parts.push(millions === 1 ? "مليون" : millions === 2 ? "مليونان" : convertGroup(millions) + " مليون");
  if (thousands > 0) parts.push(thousands === 1 ? "ألف" : thousands === 2 ? "ألفان" : convertGroup(thousands) + " ألف");
  if (remainder > 0) parts.push(convertGroup(remainder));

  return `فقط وقدره ${parts.join(" و ")} جنيه مصري لا غير`;
}

export function getTabCompletionStatus(tab: TabDef, op: Operation, manualOverrides?: Record<string, boolean>): "done" | "pending" {
  if (manualOverrides && manualOverrides[tab.id] !== undefined) {
    return manualOverrides[tab.id] ? "done" : "pending";
  }

  switch (tab.id) {
    case "overview": return op.companies?.length > 0 ? "done" : "pending";
    case "dates": return op.dates?.length > 0 ? "done" : "pending";
    case "market_study": {
      const hasDocs = op.documents?.some((d: any) => d.type === "MARKET_STUDY");
      return hasDocs || ["BOOKLET_WITHDRAWN", "SUBMITTED", "TECHNICAL_OPENED", "TECHNICAL_ACCEPTED", "FINANCIAL_OPENED", "AWARDED", "SUPPLY_IN_PROGRESS", "COMPLETED", "CLOSED"].includes(op.status) ? "done" : "pending";
    }
    case "booklet": {
      const hasBooklet = op.documents?.some((d: any) => d.type === "BOOKLET");
      const hasReceipt = op.documents?.some((d: any) => d.type === "RECEIPT");
      const hasInitialG = op.guarantees?.some((g: any) => g.type === "INITIAL");
      return hasBooklet || hasReceipt || hasInitialG || op.isCodeLocked || op.status !== "DRAFT" ? "done" : "pending";
    }
    case "clarification": {
      const hasCl = op.documents?.some((d: any) => d.type === "CLARIFICATION" || d.fileName?.includes("توضيح") || d.fileName?.includes("استفسار"));
      return hasCl ? "done" : "pending";
    }
    case "technical": return op.technicalOffers?.length > 0 ? "done" : "pending";
    case "financial": return (op.financialOffers?.length > 0 || op.submissions?.length > 0) ? "done" : "pending";
    case "declarations": return op.notes?.includes("declarationsDocx") ? "done" : "pending";
    case "submission_package": {
      return ["SUBMITTED", "TECHNICAL_OPENED", "TECHNICAL_ACCEPTED", "FINANCIAL_OPENED", "AWARDED", "SUPPLY_IN_PROGRESS", "COMPLETED", "CLOSED"].includes(op.status) ? "done" : "pending";
    }
    case "tech_opening": return op.technicalOpenings?.length > 0 ? "done" : "pending";
    case "fin_opening": return op.financialOpenings?.length > 0 ? "done" : "pending";
    case "award": return op.awards?.length > 0 ? "done" : "pending";
    case "supply_order": return op.supplyOrders?.length > 0 ? "done" : "pending";
    case "guarantee_final": return op.guarantees?.some((g: any) => g.type === "FINAL") ? "done" : "pending";
    case "supply": {
      const receipts = op.supplyOrders?.flatMap((so: any) => so.goodsReceipts || []);
      return receipts?.length > 0 ? "done" : "pending";
    }
    case "certificates": return op.certificates?.length > 0 ? "done" : "pending";
    case "finance": return op.operationFinance ? "done" : "pending";
    case "close": return ["COMPLETED", "CLOSED", "ARCHIVED"].includes(op.status) ? "done" : "pending";
    default: return "pending";
  }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   COMMON SHARED UI COMPONENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function SectionCard({
  title,
  icon: Icon,
  iconColor = "text-blue-600",
  badge,
  children,
  actions
}: {
  title: string;
  icon: any;
  iconColor?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6 border border-border shadow-xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl bg-current/10 ${iconColor} flex items-center justify-center`}>
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

export function CopyButton({ text, label }: { text?: string | null; label: string }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success(`تم نسخ ${label}`);
        setTimeout(() => setCopied(false), 2000);
      }}
      title={`نسخ ${label}`}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

export function DataRow({
  label,
  value,
  mono = false,
  copyable = false,
  copyText,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  copyable?: boolean;
  copyText?: string;
}) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-border/40 last:border-0 text-xs">
      <span className="text-muted-foreground font-medium shrink-0 ml-2">{label}</span>
      <div className="flex items-center gap-1.5 text-right font-semibold text-foreground overflow-hidden">
        <span className={`text-xs sm:text-sm truncate ${mono ? "font-mono" : ""}`}>{value}</span>
        {copyable && <CopyButton text={copyText || (typeof value === "string" ? value : "")} label={label} />}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  text,
  subtext,
  action
}: {
  icon: any;
  text: string;
  subtext?: string;
  action?: React.ReactNode
}) {
  return (
    <div className="text-center py-8 rounded-xl bg-muted/20 border border-dashed border-border space-y-2">
      <Icon className="h-10 w-10 text-muted-foreground mx-auto" />
      <p className="text-sm font-semibold text-foreground">{text}</p>
      {subtext && <p className="text-xs text-muted-foreground max-w-md mx-auto">{subtext}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function FileUploadZone({
  file,
  onFileSelect,
  accept = "*/*",
  placeholder = "اضغط لاختيار ملف من جهازك أو اسحب الملف هنا",
  icon: Icon = Upload,
  badgeText,
  required = false,
}: {
  file: File | null;
  onFileSelect: (f: File | null) => void;
  accept?: string;
  placeholder?: string;
  icon?: any;
  badgeText?: string;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) onFileSelect(droppedFile);
      }}
      className={`relative group cursor-pointer border-2 border-dashed rounded-2xl p-3.5 sm:p-4 text-center transition-all select-none ${
        isDragOver
          ? "border-blue-500 bg-blue-500/10 scale-[1.01]"
          : file
          ? "border-emerald-500/50 bg-emerald-500/5 hover:border-emerald-500"
          : "border-border/80 bg-muted/20 hover:border-blue-500/60 hover:bg-muted/40 shadow-xs"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        required={required && !file}
        onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
        className="hidden"
      />
      {file ? (
        <div className="flex items-center justify-between gap-3 text-right">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{file.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{formatDocFileSize(file.size)}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onFileSelect(null);
            }}
            className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 h-7 px-2 rounded-lg"
          >
            تغيير الملف
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5 py-1">
          <div className="p-2.5 rounded-2xl bg-muted/60 text-muted-foreground mx-auto w-fit group-hover:scale-110 group-hover:text-blue-600 transition-all">
            <Icon className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-foreground">{placeholder}</p>
          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
            {badgeText && <span className="px-2 py-0.5 rounded bg-muted font-bold">{badgeText}</span>}
            <span>أو اسحب وأفلت هنا</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function getStageIcon(label: string, dateType?: string) {
  const l = (label || "").toLowerCase();
  if (l.includes("إعلان") || l.includes("دعوة") || l.includes("نشر")) return Globe;
  if (l.includes("استفسار")) return HelpCircle;
  if (l.includes("كراسة") || l.includes("عطاء") || l.includes("سحب")) return BookOpen;
  if (l.includes("مزاد")) return Gavel;
  if (l.includes("فتح") && l.includes("فني")) return FolderOpen;
  if (l.includes("بت") && l.includes("فني")) return CheckCircle2;
  if (l.includes("فتح") && l.includes("مالي")) return Coins;
  if (l.includes("بت") && l.includes("مالي")) return Scale;
  if (l.includes("ترسية") || l.includes("فوز")) return Trophy;
  if (l.includes("توريد") || l.includes("تنفيذ")) return Truck;
  if (l.includes("موقع") || l.includes("تسليم")) return MapPin;
  return Calendar;
}
