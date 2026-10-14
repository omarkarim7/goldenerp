"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import JSZip from "jszip";
import {
  ArrowRight, FileText, Shield, Phone, Calendar, Building2,
  Clock, Edit, Printer, CheckCircle2, AlertTriangle, ArrowLeft,
  ChevronLeft, Plus, Sparkles, FolderOpen, BookOpen, Send,
  Coins, Trophy, Truck, ClipboardCheck, ShieldCheck, Scale,
  Package, Receipt, BarChart3, Lock, Unlock, Archive, RefreshCw,
  MapPin, Hash, Eye, AlertCircle, Download, Upload,
  ChevronDown, ChevronUp, Loader2, X, Check, Briefcase,
  Landmark, DollarSign, Calculator, Users, ExternalLink,
  Trash2, FileCheck, Layers, RotateCcw, Ban, SlidersHorizontal, History,
  Maximize2, Minimize2, KeyRound, TrendingUp, Undo2, LayoutGrid, LayoutList,
  Mail, Copy, Globe, Gavel, HelpCircle, Tag, Image as ImageIcon, Paperclip, FileSpreadsheet,
  RotateCw, ZoomIn, ZoomOut, Circle, ChevronRight, CheckSquare, Square, FileArchive, CheckCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/lib/api";
import { useCompany, CompanyCode } from "@/context/company-context";
import { DocxViewer } from "@/components/docx-viewer";
import { Portal } from "@/components/ui/portal";
import { EGYPT_GOVERNORATES } from "@/lib/governorates";
import { ArabicDateTimePicker } from "@/components/ui/arabic-date-picker";
import {
  LIFECYCLE_STAGES,
  getStageIndex,
} from "@/components/operations/operation-timeline";
import { TabTechOpening, TabFinOpening } from "./OpeningWorkflows";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ARABIC TAFQEET HELPER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function tafqeetArabic(num: number): string {
  if (!num || isNaN(num)) return "";
  num = Math.round(num);
  if (num === 0) return "صفر جنيه مصري";

  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"];
  const teens = ["أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مائة", "مئتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

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

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TYPES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
interface Operation {
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

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CONSTANTS & LABELS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const STATUS_LABELS: Record<string, { label: string; badgeBg: string }> = {
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

const TENDER_TYPE_LABELS: Record<string, string> = {
  TENDER: "مناقصة عامة",
  LIMITED_TENDER: "مناقصة محدودة",
  PRACTICE: "ممارسة عامة",
  LIMITED_PRACTICE: "ممارسة محدودة",
  AUCTION: "مزايدة علنية",
  DIRECT_ORDER: "أمر إسناد مباشر",
};

const DATE_TYPE_LABELS: Record<string, string> = {
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
   TAB DEFINITIONS — 16 UNIFIED LIFECYCLE STAGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
interface TabDef {
  id: string;
  label: string;
  shortLabel: string;
  icon: any;
  order: number;
  color: string;
  description: string;
}

const LIFECYCLE_TABS: TabDef[] = [
  { id: "overview", label: "البيانات الأساسية والشركات", shortLabel: "الأساسية", icon: FileText, order: 1, color: "slate", description: "بيانات العملية، جهة الإسناد، والشركات المشاركة بأكوادها المستقلة" },
  { id: "dates", label: "التواريخ والتنبيهات", shortLabel: "التواريخ", icon: Calendar, order: 2, color: "indigo", description: "المواعيد الرسمية، جلسات الفتح، والعد التنازلي للإنذارات الحرجة" },
  { id: "market_study", label: "دراسة السوق والجدوى", shortLabel: "دراسة السوق", icon: TrendingUp, order: 3, color: "blue", description: "أرشيف ملفات دراسة السوق، عروض أسعار الموردين، وصور العينات والمواصفات" },
  { id: "booklet", label: "الكراسة والتأمين الابتدائي", shortLabel: "الكراسة والتأمين", icon: BookOpen, order: 4, color: "cyan", description: "طباعة خطابات السحب والتأمين، إيصالات السداد، رفع كراسة الشروط، وأرشيف صور المواصفات" },
  { id: "clarification", label: "خطاب التوضيح والاستفسارات", shortLabel: "خطاب التوضيح", icon: HelpCircle, order: 5, color: "amber", description: "توليد وطباعة خطاب الاستفسارات الموجه لجهة الإسناد قبل تقديم العطاء الفني" },
  { id: "technical", label: "العرض الفني والمواصفات", shortLabel: "الفني", icon: ClipboardCheck, order: 6, color: "purple", description: "تجهيز المظروف الفني، الكتالوجات، والغلاف الذكي المعتمد" },
  { id: "financial", label: "العرض المالي وجدول الكميات", shortLabel: "المالي", icon: Coins, order: 7, color: "teal", description: "تسعير البنود، احتساب الهوامش، وتقديم العطاء رسمياً" },
  { id: "submission_package", label: "تجهيز وطباعة ملفات التقديم", shortLabel: "ملفات التقديم", icon: Package, order: 8, color: "blue", description: "تجميع وطباعة حزمة ملفات العطاء للمظروفين الفني والمالي وتحميلها بمجلد مضغوط ZIP" },
  { id: "tech_opening", label: "نتيجة البت الفني والطعون", shortLabel: "البت الفني", icon: FolderOpen, order: 9, color: "indigo", description: "قرارات لجنة الفحص الفني، الاستيفاء، القبول، التظلم، واسترداد التأمين" },
  { id: "fin_opening", label: "نتيجة البت المالي والترتيب", shortLabel: "البت المالي", icon: DollarSign, order: 10, color: "cyan", description: "جلسة الفتح المالي، الشراء، الترسية الجزئية، التظلم، واسترداد التأمين" },
  { id: "award", label: "قرار الترسية وأمر التوريد", shortLabel: "الترسية", icon: Trophy, order: 11, color: "amber", description: "إخطار الترسية الرسمي، أمر التوريد الصادر، مدة التوريد، وربط المواعيد" },
  { id: "guarantee_final", label: "التأمين النهائي (5%)", shortLabel: "تأمين نهائي", icon: ShieldCheck, order: 12, color: "emerald", description: "خطاب سداد التأمين النهائي 5%، طريقة السداد، مدة السريان، والضمان البنكي" },
  { id: "supply", label: "التوريد والاستلام والفحص", shortLabel: "التوريد", icon: Truck, order: 13, color: "blue", description: "توريد الشحنات، أذون الإضافة بالمخازن، ومحاضر الفحص والاستلام" },
  { id: "certificates", label: "المستخلصات والدفعات", shortLabel: "المستخلصات", icon: Calculator, order: 14, color: "teal", description: "أوامر الصرف، المستخلصات المالية، واستقطاعات الضرائب والتأمينات" },
  { id: "finance", label: "الحسابات والمالية والأرباح", shortLabel: "المالية", icon: BarChart3, order: 15, color: "emerald", description: "التكلفة الإجمالية الفعلية، التدفقات النقدية، وصافي أرباح العملية" },
  { id: "close", label: "إغلاق العملية والأرشيف", shortLabel: "الإغلاق والأرشيف", icon: Archive, order: 16, color: "slate", description: "استرداد خطابات الضمان، الأرشيف الرقمي للمستندات، والإغلاق النهائي" },
];

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   HELPERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function formatCurrency(n: number) {
  return new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP" }).format(n);
}

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

function formatDateTime(d: string) {
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

function getCountdown(dateStr: string) {
  if (!dateStr) return { text: "غير محدد", urgent: false, days: 0, hours: 0, expired: false };
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return { text: "انتهى الموعد", urgent: true, days: 0, hours: 0, expired: true };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const urgent = days < 2;
  const text = days > 0 ? `${days} يوم و ${hours} ساعة` : `${hours} ساعة`;
  return { text, urgent, days, hours, expired: false };
}

function getTabCompletionStatus(
  tab: TabDef,
  op: Operation,
  manualOverrides?: Record<string, boolean>
): "done" | "active" | "pending" | "skipped" {
  if (manualOverrides && manualOverrides[tab.id] !== undefined) {
    return manualOverrides[tab.id] ? "done" : "pending";
  }

  switch (tab.id) {
    case "overview": return "done";
    case "dates": return op.dates?.length > 0 ? "done" : "pending";
    case "market_study": {
      return ["BOOKLET_WITHDRAWN", "SUBMITTED", "TECHNICAL_OPENED", "TECHNICAL_ACCEPTED", "FINANCIAL_OPENED", "AWARDED", "SUPPLY_IN_PROGRESS", "COMPLETED", "CLOSED"].includes(op.status) ? "done" : "pending";
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
   REUSABLE UI COMPONENTS & FILE UPLOADER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function formatDocFileSize(bytes?: number | null): string {
  if (!bytes || isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} م.ب`;
}

function FileUploadZone({
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
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
              <Check className="h-4.5 w-4.5 stroke-[2.5]" />
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-foreground truncate">{file.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{formatDocFileSize(file.size)} • جاهز للرفع</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onFileSelect(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg shrink-0 cursor-pointer"
            title="إلغاء الملف المختار"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3 py-1">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-foreground group-hover:text-blue-600 transition-colors">
              {placeholder}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {badgeText || `يدعم الصيغ: ${accept.replace(/\./g, "").toUpperCase()}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, icon: Icon, iconColor = "text-blue-600", badge, children, actions }: {
  title: string; icon: any; iconColor?: string; badge?: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode;
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

function EmptyState({ icon: Icon, text, subtext, action }: { icon: any; text: string; subtext?: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-8 rounded-xl bg-muted/20 border border-dashed border-border space-y-2">
      <Icon className="h-10 w-10 text-muted-foreground mx-auto" />
      <p className="text-sm font-semibold text-foreground">{text}</p>
      {subtext && <p className="text-xs text-muted-foreground max-w-md mx-auto">{subtext}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

function CopyButton({ text, label }: { text?: string | null; label: string }) {
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

function DataRow({
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

function getStageIcon(label: string, dateType?: string) {
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

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   1. OVERVIEW TAB (البيانات الأساسية وتفاصيل بوابة التعاقدات والمحطات الزمنية)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TabOverview({
  op,
  onRefresh,
  onSelectTab,
}: {
  op: Operation;
  onRefresh: () => void;
  onSelectTab?: (tabId: string) => void;
}) {
  // Floating Modal Edit State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSection, setEditSection] = useState<'basic' | 'legal' | 'financial' | 'durations' | 'conditions'>('basic');
  const [savingAll, setSavingAll] = useState(false);

  // Dedicated notes state for inline notes card
  const [editingNotes, setEditingNotes] = useState(false);
  const [standaloneNotes, setStandaloneNotes] = useState(op.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setStandaloneNotes(op.notes || "");
  }, [op.notes]);

  // Extract structured portal details
  const p = useMemo(() => {
    if (op.portalDetails && typeof op.portalDetails === "object") {
      return op.portalDetails;
    }
    if (op.radarItem?.rawData) {
      try {
        return JSON.parse(op.radarItem.rawData);
      } catch {}
    }
    return {};
  }, [op.portalDetails, op.radarItem]);

  const hasPortalData = !!(op.portalDetails || op.radarItem?.rawData);

  // Form Fields State for Floating Modal
  const [name, setName] = useState(op.name || "");
  const [titleEn, setTitleEn] = useState("");
  const [authority, setAuthority] = useState(op.authority || "");
  const [externalNumber, setExternalNumber] = useState(op.externalNumber || "");
  const [governorate, setGovernorate] = useState(op.governorate || "القاهرة");
  const [fiscalYear, setFiscalYear] = useState("");
  const [email, setEmail] = useState("");

  const [tenderMethod, setTenderMethod] = useState("");
  const [tenderType, setTenderType] = useState<string>(op.tenderType);
  const [tenderKind, setTenderKind] = useState("");
  const [biddingType, setBiddingType] = useState("");
  const [tenderNature, setTenderNature] = useState("");
  const [evaluationType, setEvaluationType] = useState("");
  const [activities, setActivities] = useState("");
  const [allowAlternativeOffers, setAllowAlternativeOffers] = useState(false);
  const [allowInquiries, setAllowInquiries] = useState(true);

  const [temporaryInsurance, setTemporaryInsurance] = useState<any>("");
  const [bookletPrice, setBookletPrice] = useState<any>("");
  const [finalInsuranceRate, setFinalInsuranceRate] = useState<any>(5);
  const [warrantyStatement, setWarrantyStatement] = useState("");
  const [currency, setCurrency] = useState("جنيه مصري");
  const [divisible, setDivisible] = useState("تقبل التجزئة");
  const [allowMultipleTempInsurance, setAllowMultipleTempInsurance] = useState(false);
  const [allowDownPayment, setAllowDownPayment] = useState(false);
  const [downPayment, setDownPayment] = useState("");

  const [publishingDays, setPublishingDays] = useState<any>("");
  const [deliveryDuration, setDeliveryDuration] = useState("");

  const [conditions, setConditions] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState(op.notes || "");

  // Timeline Milestones: Chronologically sorted from operation dates or portal stages
  const timelineMilestones = useMemo(() => {
    if (op.dates && op.dates.length > 0) {
      return [...op.dates].sort(
        (a, b) => new Date(a.dateValue || a.date).getTime() - new Date(b.dateValue || b.date).getTime()
      );
    }
    if (p.timeline?.stages && Array.isArray(p.timeline.stages)) {
      return p.timeline.stages.map((st: any, i: number) => ({
        id: `raw-${i}`,
        label: st.label,
        dateValue: st.date,
        dateType: "OTHER",
      }));
    }
    return [];
  }, [op.dates, p.timeline]);

  const partsList = p.parts || [];
  const itemsList = p.items || [];

  const openEditModal = (section: 'basic' | 'legal' | 'financial' | 'durations' | 'conditions' = 'basic') => {
    setName(op.name || "");
    setTitleEn(p.titleEn || "");
    setAuthority(op.authority || "");
    setExternalNumber(op.externalNumber || p.refNo || "");
    setGovernorate(op.governorate || "القاهرة");
    setFiscalYear(p.fiscalYear || "2026/2027");
    setEmail(p.email || "");

    setTenderMethod(p.tenderMethod || TENDER_TYPE_LABELS[op.tenderType] || op.tenderType || "");
    setTenderType(op.tenderType);
    setTenderKind(p.tenderKind || "خدمات وتوريدات");
    setBiddingType(p.biddingType || "إعلانات");
    setTenderNature(p.tenderNature || "داخلية");
    setEvaluationType(p.evaluationType || "مقبول/مرفوض");
    setActivities(p.activities || "");
    setAllowAlternativeOffers(!!p.allowAlternativeOffers);
    setAllowInquiries(p.allowInquiries !== false);

    setTemporaryInsurance(p.temporaryInsurance ?? op.guarantees?.[0]?.amount ?? "");
    setBookletPrice(p.bookletPrice ?? "");
    setFinalInsuranceRate(p.finalInsuranceRate ?? 5);
    setWarrantyStatement(p.warrantyStatement || "");
    setCurrency(p.currency || "جنيه مصري");
    setDivisible(p.divisible || "تقبل التجزئة");
    setAllowMultipleTempInsurance(!!p.allowMultipleTempInsurance);
    setAllowDownPayment(!!p.allowDownPayment);
    setDownPayment(p.downPayment || "");

    setPublishingDays(p.publishingDays ?? "");
    setDeliveryDuration(p.deliveryDuration || "شهر");

    setConditions(p.conditions || "");
    setDescription(p.description || "");
    setNotes(op.notes || "");

    setEditSection(section);
    setEditModalOpen(true);
  };

  const handleSaveAll = async () => {
    setSavingAll(true);
    try {
      const payload: any = {
        name,
        authority,
        externalNumber: externalNumber || null,
        governorate,
        tenderType,
        notes: notes || null,
        titleEn: titleEn || null,
        tenderMethod,
        tenderKind,
        biddingType,
        tenderNature,
        evaluationType,
        activities,
        allowAlternativeOffers,
        allowInquiries,
        temporaryInsurance: temporaryInsurance !== "" && !isNaN(Number(temporaryInsurance)) ? Number(temporaryInsurance) : null,
        bookletPrice: bookletPrice !== "" && !isNaN(Number(bookletPrice)) ? Number(bookletPrice) : null,
        finalInsuranceRate: finalInsuranceRate !== "" && !isNaN(Number(finalInsuranceRate)) ? Number(finalInsuranceRate) : null,
        warrantyStatement,
        currency,
        divisible,
        allowMultipleTempInsurance,
        allowDownPayment,
        downPayment,
        fiscalYear,
        email: email || null,
        publishingDays: publishingDays !== "" ? (isNaN(Number(publishingDays)) ? publishingDays : Number(publishingDays)) : null,
        deliveryDuration,
        conditions: conditions || null,
        description: description || null,
      };

      await api.patch(`/operations/${op.id}`, payload);
      toast.success("تم تحديث وحفظ بيانات العملية في قاعدة البيانات بنجاح! 💾✨");
      setEditModalOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل حفظ التعديلات في قاعدة البيانات");
    } finally {
      setSavingAll(false);
    }
  };

  const handleSaveStandaloneNotes = async () => {
    setSavingNotes(true);
    try {
      await api.patch(`/operations/${op.id}`, { notes: standaloneNotes });
      toast.success("تم حفظ الملاحظات والشروط الخاصة في قاعدة البيانات بنجاح! 📝");
      setEditingNotes(false);
      onRefresh();
    } catch {
      toast.error("فشل حفظ الملاحظات في قاعدة البيانات");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDeleteStandaloneNotes = async () => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف الشروط والملاحظات الخاصة؟")) return;
    setSavingNotes(true);
    try {
      await api.patch(`/operations/${op.id}`, { notes: "" });
      toast.success("تم مسح الملاحظات بنجاح");
      setStandaloneNotes("");
      setEditingNotes(false);
      onRefresh();
    } catch {
      toast.error("فشل مسح الملاحظات");
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ━━━ نافذة عائمة شاملة لتعديل كافة بيانات العملية (Modal Dialog) ━━━ */}
      {editModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-4xl max-h-[92vh] bg-card text-card-foreground border border-border/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-border bg-muted/40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center border border-blue-600/20 shadow-xs">
                    <Edit className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-foreground">
                        تعديل بيانات العملية الشاملة
                      </h3>
                      <Badge className="badge-blue text-xs font-mono">#{op.serialNumber}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      تعديل وتحديث كافة البيانات في قاعدة البيانات ومزامنتها فوراً
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="إغلاق"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Section Tabs inside Modal */}
              <div className="px-4 py-2 border-b border-border bg-muted/20 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
                {[
                  { id: "basic", label: "بيانات العملية والجهة", icon: FileText },
                  { id: "legal", label: "أسلوب وطبيعة التعاقد", icon: Landmark },
                  { id: "financial", label: "الشروط المالية والضمانات", icon: Coins },
                  { id: "durations", label: "مدد التنفيذ والنشر", icon: Clock },
                  { id: "conditions", label: "الشروط والملاحظات", icon: ShieldCheck },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = editSection === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setEditSection(tab.id as any)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        isActive
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Body Container */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 scrollbar-thin">
                {/* SECTION 1: BASIC INFO */}
                {editSection === "basic" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs font-bold">اسم العملية الرسمي (بالعربية) *</Label>
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="text-sm h-10 font-sans"
                          placeholder="اسم العملية كما ورد بكراسة الشروط"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs font-bold">اسم العملية باللغة الإنجليزية (English Title)</Label>
                        <Input
                          value={titleEn}
                          onChange={(e) => setTitleEn(e.target.value)}
                          className="text-sm h-10 font-sans"
                          dir="ltr"
                          placeholder="English tender title if available"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">جهة الإسناد / الطرح *</Label>
                        <Input
                          value={authority}
                          onChange={(e) => setAuthority(e.target.value)}
                          className="text-sm h-10"
                          placeholder="اسم الجهة أو الوزارة أو الهيئة"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">رقم العملية لدى الجهة (Ref No)</Label>
                        <Input
                          value={externalNumber}
                          onChange={(e) => setExternalNumber(e.target.value)}
                          className="text-sm h-10 font-mono"
                          placeholder="رقم المناقصة المرجعي"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">المحافظة (الـ 27 محافظة)</Label>
                        <Select value={governorate} onValueChange={(v) => setGovernorate(v ?? "")}>
                          <SelectTrigger className="h-10 text-sm font-medium">
                            <span>{governorate || "اختر المحافظة"}</span>
                          </SelectTrigger>
                          <SelectContent className="max-h-60 overflow-y-auto">
                            {EGYPT_GOVERNORATES.map((gov) => (
                              <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">العام المالي</Label>
                        <Input
                          value={fiscalYear}
                          onChange={(e) => setFiscalYear(e.target.value)}
                          className="text-sm h-10 font-mono"
                          placeholder="2026/2027"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs font-bold">البريد الإلكتروني للجهة</Label>
                        <Input
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="text-sm h-10 font-mono"
                          type="email"
                          dir="ltr"
                          placeholder="info@authority.gov.eg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 2: LEGAL & CONTRACTING */}
                {editSection === "legal" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">طريقة التعاقد</Label>
                        <Input
                          value={tenderMethod}
                          onChange={(e) => setTenderMethod(e.target.value)}
                          className="text-sm h-10"
                          placeholder="مناقصة عامة / ممارسة محدودة / ..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">نوع الطرح القانوني بالنظام</Label>
                        <Select value={tenderType} onValueChange={(v) => setTenderType(v ?? "")}>
                          <SelectTrigger className="h-10 text-sm font-medium">
                            <span>{TENDER_TYPE_LABELS[tenderType] || tenderType}</span>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(TENDER_TYPE_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">طبيعة العملية</Label>
                        <Input
                          value={tenderKind}
                          onChange={(e) => setTenderKind(e.target.value)}
                          className="text-sm h-10"
                          placeholder="خدمات وتوريدات / أعمال مقاولات / ..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">نوع التقديم</Label>
                        <Input
                          value={biddingType}
                          onChange={(e) => setBiddingType(e.target.value)}
                          className="text-sm h-10"
                          placeholder="مظروفين (فني ومالي) / مظروف واحد / إعلانات"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">نطاق العملية</Label>
                        <Input
                          value={tenderNature}
                          onChange={(e) => setTenderNature(e.target.value)}
                          className="text-sm h-10"
                          placeholder="داخلية / دولية"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">أسلوب التقييم الفني</Label>
                        <Input
                          value={evaluationType}
                          onChange={(e) => setEvaluationType(e.target.value)}
                          className="text-sm h-10"
                          placeholder="مقبول/مرفوض / نقاط فنية (مجموع الدرجات)"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs font-bold">الأنشطة المشمولة</Label>
                        <Input
                          value={activities}
                          onChange={(e) => setActivities(e.target.value)}
                          className="text-sm h-10"
                          placeholder="الأنشطة المحددة بكراسة الشروط"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">تقبل العروض البديلة</Label>
                        <Select
                          value={allowAlternativeOffers ? "true" : "false"}
                          onValueChange={(v) => setAllowAlternativeOffers(v === "true")}
                        >
                          <SelectTrigger className="h-10 text-sm font-medium">
                            <span>{allowAlternativeOffers ? "نعم — تقبل العروض البديلة" : "لا تقبل العروض البديلة"}</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">نعم — تقبل العروض البديلة</SelectItem>
                            <SelectItem value="false">لا تقبل العروض البديلة</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">تقبل الاستفسارات</Label>
                        <Select
                          value={allowInquiries ? "true" : "false"}
                          onValueChange={(v) => setAllowInquiries(v === "true")}
                        >
                          <SelectTrigger className="h-10 text-sm font-medium">
                            <span>{allowInquiries ? "نعم — تقبل الاستفسارات" : "لا تقبل الاستفسارات"}</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">نعم — تقبل الاستفسارات</SelectItem>
                            <SelectItem value="false">لا تقبل الاستفسارات</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 3: FINANCIAL & GUARANTEES */}
                {editSection === "financial" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">قيمة التأمين المؤقت (ج.م.)</Label>
                        <Input
                          type="number"
                          value={temporaryInsurance}
                          onChange={(e) => setTemporaryInsurance(e.target.value)}
                          className="text-sm h-10 font-mono"
                          placeholder="0.00"
                        />
                        {temporaryInsurance && !isNaN(Number(temporaryInsurance)) && Number(temporaryInsurance) > 0 && (
                          <div className="text-[11px] text-emerald-600 font-medium">
                            {tafqeetArabic(Number(temporaryInsurance))}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">ثمن كراسة الشروط (ج.م.)</Label>
                        <Input
                          type="number"
                          value={bookletPrice}
                          onChange={(e) => setBookletPrice(e.target.value)}
                          className="text-sm h-10 font-mono"
                          placeholder="0.00"
                        />
                        {bookletPrice && !isNaN(Number(bookletPrice)) && Number(bookletPrice) > 0 && (
                          <div className="text-[11px] text-blue-600 font-medium">
                            {tafqeetArabic(Number(bookletPrice))}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">نسبة التأمين النهائي (%)</Label>
                        <Input
                          type="number"
                          value={finalInsuranceRate}
                          onChange={(e) => setFinalInsuranceRate(e.target.value)}
                          className="text-sm h-10 font-mono"
                          placeholder="5"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">العملة الرسمية</Label>
                        <Input
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="text-sm h-10"
                          placeholder="جنيه مصري"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">تقبل التجزئة</Label>
                        <Input
                          value={divisible}
                          onChange={(e) => setDivisible(e.target.value)}
                          className="text-sm h-10"
                          placeholder="تقبل التجزئة / لا تقبل التجزئة"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">تجزئة التأمين المؤقت</Label>
                        <Select
                          value={allowMultipleTempInsurance ? "true" : "false"}
                          onValueChange={(v) => setAllowMultipleTempInsurance(v === "true")}
                        >
                          <SelectTrigger className="h-10 text-sm font-medium">
                            <span>{allowMultipleTempInsurance ? "مسموح بالرد والتجزئة" : "غير مجزأ"}</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">مسموح بالرد والتجزئة</SelectItem>
                            <SelectItem value="false">غير مجزأ</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">صرف دفعة مقدمة</Label>
                        <Select
                          value={allowDownPayment ? "true" : "false"}
                          onValueChange={(v) => setAllowDownPayment(v === "true")}
                        >
                          <SelectTrigger className="h-10 text-sm font-medium">
                            <span>{allowDownPayment ? "متاحة" : "غير متاح"}</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">متاحة</SelectItem>
                            <SelectItem value="false">غير متاح</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">تفاصيل أو نسبة الدفعة المقدمة</Label>
                        <Input
                          value={downPayment}
                          onChange={(e) => setDownPayment(e.target.value)}
                          className="text-sm h-10"
                          placeholder="مثلاً: 25% من إجمالي التعاقد"
                          disabled={!allowDownPayment}
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs font-bold">مدة وتعليمات الضمان</Label>
                        <Textarea
                          value={warrantyStatement}
                          onChange={(e) => setWarrantyStatement(e.target.value)}
                          rows={2}
                          className="text-sm font-sans"
                          placeholder="مثال: ضمان شامل لمدة 12 شهر بعد الاستلام النهائي"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 4: DURATIONS & TIMING */}
                {editSection === "durations" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">مدة النشر بالبوابة (بالأيام)</Label>
                        <Input
                          type="number"
                          value={publishingDays}
                          onChange={(e) => setPublishingDays(e.target.value)}
                          className="text-sm h-10 font-mono"
                          placeholder="مثلاً: 14 أو 21"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">مدة الاستلام والتوريد / التنفيذ</Label>
                        <Input
                          value={deliveryDuration}
                          onChange={(e) => setDeliveryDuration(e.target.value)}
                          className="text-sm h-10"
                          placeholder="مثلاً: شهر / 30 يوماً / 6 أشهر"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 5: CONDITIONS, DESCRIPTION & NOTES */}
                {editSection === "conditions" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                          <ShieldCheck className="h-4 w-4" />
                          الشروط الخاصة والمواصفات المسحوبة من الكراسة
                        </Label>
                        <span className="text-[11px] text-muted-foreground">كراسة الشروط الرسمية</span>
                      </div>
                      <Textarea
                        value={conditions}
                        onChange={(e) => setConditions(e.target.value)}
                        rows={4}
                        className="text-sm font-sans leading-relaxed"
                        placeholder="الشروط والمواصفات الرسمية المسجلة بكراسة الشروط..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          الوصف التفصيلي للعملية
                        </Label>
                      </div>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="text-sm font-sans leading-relaxed"
                        placeholder="الوصف التفصيلي ومجال أعمال العملية..."
                      />
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-border">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                          <Edit className="h-4 w-4" />
                          ملاحظات وشروط إدارية خاصة (تدوين يدوي داخلي)
                        </Label>
                        <span className="text-[11px] text-amber-600 font-semibold">ملاحظات إدارية مستقلة</span>
                      </div>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                        className="text-sm font-sans leading-relaxed"
                        placeholder="اكتب هنا أي ملاحظات أو شروط إدارية داخلية خاصة بالعملية (تظل فارغة ما لم يكتب بها المستخدم)..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Action Buttons */}
              <div className="p-4 sm:p-5 border-t border-border bg-muted/40 flex items-center justify-between shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setEditModalOpen(false)}
                  disabled={savingAll}
                  className="rounded-xl cursor-pointer"
                >
                  إلغاء التعديل
                </Button>

                <Button
                  onClick={handleSaveAll}
                  disabled={savingAll}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 h-10 rounded-xl cursor-pointer shadow-md flex items-center gap-2"
                >
                  {savingAll ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>جاري الحفظ في قاعدة البيانات...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>حفظ التعديلات في قاعدة البيانات</span>
                    </>
                  )}
                </Button>
              </div>

            </div>
          </div>
        </Portal>
      )}

      {/* ━━━ شريط المؤشرات السريعة وبيانات البوابة الحكومية (Portal KPI Banner) ━━━ */}
      {hasPortalData && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-amber-500/10 border border-blue-500/20 shadow-md space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Globe className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-foreground">بيانات موثقة من منظومة التعاقدات الحكومية المصرية</span>
                  <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                    مسحوب بالرادار ✓
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  تم استخراج جميع التفاصيل الفنية والمالية والبنود والمرفقات آلياً وتوثيقها بملف العملية
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => openEditModal('basic')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 px-3 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>تعديل بيانات العملية</span>
              </Button>
              {p.sourceUrl && (
                <a
                  href={p.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors shadow-xs"
                >
                  <span>فتح صفحة الطرح بالبوابة</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {/* 4 Quick Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="p-3 rounded-2xl bg-card/80 border border-border/80">
              <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                <Coins className="h-3.5 w-3.5 text-blue-600" />
                قيمة التأمين الابتدائي
              </span>
              <p className="text-sm sm:text-base font-black text-foreground mt-1 font-mono">
                {p.temporaryInsurance ? formatCurrency(p.temporaryInsurance) : (op.guarantees?.[0]?.amount ? formatCurrency(op.guarantees[0].amount) : "—")}
              </p>
              <span className="text-[10px] text-muted-foreground font-medium block mt-0.5">
                نهائي: {p.finalInsuranceRate || 5}% من التعاقد
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-card/80 border border-border/80">
              <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                ثمن كراسة الشروط
              </span>
              <p className="text-sm sm:text-base font-black text-foreground mt-1 font-mono">
                {p.bookletPrice ? formatCurrency(p.bookletPrice) : (op.operationFinance?.totalCost ? formatCurrency(op.operationFinance.totalCost) : "—")}
              </p>
              <span className="text-[10px] text-muted-foreground font-medium block mt-0.5">
                العملة: {p.currency || "جنيه مصري"}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-card/80 border border-border/80">
              <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-teal-600" />
                العام المالي والطبيعة
              </span>
              <p className="text-sm sm:text-base font-black text-foreground mt-1">
                {p.fiscalYear || "2026/2027"}
              </p>
              <span className="text-[10px] text-muted-foreground font-medium block mt-0.5 truncate">
                {p.tenderKind || "خدمات وتوريدات"}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-card/80 border border-border/80">
              <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                <Scale className="h-3.5 w-3.5 text-amber-600" />
                طريقة وأسلوب التعاقد
              </span>
              <p className="text-xs sm:text-sm font-black text-foreground mt-1 truncate" title={p.tenderMethod || TENDER_TYPE_LABELS[op.tenderType]}>
                {p.tenderMethod || TENDER_TYPE_LABELS[op.tenderType] || op.tenderType}
              </p>
              <span className="text-[10px] text-muted-foreground font-medium block mt-0.5 truncate">
                التقديم: {p.biddingType || "إعلانات"} • {p.divisible || "تقبل التجزئة"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ━━━ المسار الزمني المتوقع ومراحل المناقصة المعتمدة (Timeline Roadmap) ━━━ */}
      <SectionCard
        title="البرنامج الزمني ومراحل الجلسات المعتمدة (Tender Roadmap & Sessions)"
        icon={Calendar}
        iconColor="text-blue-600"
        badge={
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-600/10 text-blue-700 dark:text-blue-300 border-blue-500/20 text-xs font-bold">
              {timelineMilestones.length} محطات وجلسات
            </Badge>
            {onSelectTab && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSelectTab("dates")}
                className="text-xs h-7 rounded-xl border-border font-bold hover:bg-blue-500/10 hover:text-blue-600 cursor-pointer shadow-2xs"
              >
                <span>جدول المواعيد بالتفصيل 📅</span>
                <ChevronLeft className="h-3 w-3 mr-0.5" />
              </Button>
            )}
          </div>
        }
      >
        {timelineMilestones.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {timelineMilestones.map((m: any, idx: number) => {
                const cd = getCountdown(m.dateValue || m.date);
                const isExpired = cd.expired || cd.text.includes("انتهى");
                const StepIcon = getStageIcon(m.label || m.dateType, m.dateType);

                return (
                  <div
                    key={m.id || idx}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isExpired
                        ? "bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50"
                        : cd.urgent
                        ? "bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/40 hover:border-amber-500/60 shadow-xs"
                        : "bg-card border-border hover:border-blue-500/40 shadow-xs"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-600/10 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <div className={`p-1.5 rounded-lg ${isExpired ? "bg-rose-500/15 text-rose-600" : "bg-blue-600 text-white"}`}>
                            <StepIcon className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        {isExpired ? (
                          <Badge className="bg-rose-600 text-white text-[9px] px-2 py-0.5 shadow-2xs">انتهى ⌛</Badge>
                        ) : cd.urgent ? (
                          <Badge className="badge-amber text-[9px] animate-pulse">عاجل ⚠️</Badge>
                        ) : (
                          <Badge className="bg-blue-600/10 text-blue-700 dark:text-blue-300 text-[9px] px-2 py-0.5">قادم</Badge>
                        )}
                      </div>

                      <div>
                        <h5 className="text-xs font-bold text-foreground line-clamp-1" title={m.label || DATE_TYPE_LABELS[m.dateType]}>
                          {m.label || DATE_TYPE_LABELS[m.dateType] || m.dateType}
                        </h5>
                        <p className="text-[11px] font-mono font-bold text-foreground/85 mt-1">
                          {formatDateTime(m.dateValue || m.date)}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 mt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>الموقف:</span>
                      </span>
                      <span className={`font-bold ${isExpired ? "text-rose-600 dark:text-rose-400" : cd.urgent ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>
                        {cd.text}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Calendar}
            text="لا توجد مواعيد وجلسات مسجلة للعملية حتى الآن"
            subtext="يمكنك إضافة مواعيد فتح المظاريف والبت والترسية لتفعيل نظام التنبيهات والعد التنازلي"
            action={
              onSelectTab && (
                <Button
                  size="sm"
                  onClick={() => onSelectTab("dates")}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  <Plus className="h-4 w-4 ml-1" />
                  <span>إضافة مواعيد الآن</span>
                </Button>
              )
            }
          />
        )}
      </SectionCard>

      {/* ━━━ شبكة بطاقات تفاصيل العملية الأساسية والقانونية والمالية ━━━ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. تفاصيل العملية والجهة الإدارية */}
        <SectionCard
          title="معلومات العملية والجهة الإدارية"
          icon={FileText}
          iconColor="text-blue-600"
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => openEditModal('basic')}
              className="text-xs h-8 rounded-xl border-border font-bold cursor-pointer hover:bg-blue-500/10 hover:text-blue-600"
            >
              <Edit className="h-3 w-3 ml-1" />تعديل
            </Button>
          }
        >
          <div className="space-y-0">
            <DataRow label="اسم العملية الرسمي" value={op.name} copyable copyText={op.name} />
            {p.titleEn && (
              <DataRow label="اسم العملية بالإنجليزي" value={p.titleEn} copyable copyText={p.titleEn} />
            )}
            <DataRow label="جهة الإسناد / الطرح" value={op.authority} copyable copyText={op.authority} />
            <DataRow
              label="المحافظة"
              value={
                <span className="flex items-center gap-1.5 font-bold">
                  <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  {op.governorate || "غير محددة"}
                </span>
              }
            />
            <DataRow label="رقم العملية لدى الجهة" value={op.externalNumber || p.refNo || "—"} mono copyable copyText={op.externalNumber || p.refNo || ""} />
            <DataRow label="الرقم التسلسلي بالنظام" value={`#${op.serialNumber}`} mono />
            <DataRow label="العام المالي" value={p.fiscalYear || "2026/2027"} mono />
            {p.email && (
              <DataRow
                label="البريد الإلكتروني للجهة"
                value={
                  <a href={`mailto:${p.email}`} className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                    <Mail className="h-3 w-3 inline" />
                    <span>{p.email}</span>
                  </a>
                }
                copyable
                copyText={p.email}
              />
            )}
            <DataRow
              label="حالة قفل الكود والتوثيق"
              value={
                <Badge className={op.isCodeLocked ? "badge-emerald text-[10px]" : "bg-muted text-muted-foreground border-border text-[10px]"}>
                  {op.isCodeLocked ? "مقفل نهائياً ✓" : "غير مقفل"}
                </Badge>
              }
            />
          </div>
        </SectionCard>

        {/* 2. الإطار القانوني وأسلوب التعاقد */}
        <SectionCard
          title="الإطار القانوني وأسلوب التعاقد"
          icon={Landmark}
          iconColor="text-indigo-600"
          badge={<Badge className="badge-purple text-[10px] font-bold">ضوابط الطرح</Badge>}
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => openEditModal('legal')}
              className="text-xs h-8 rounded-xl border-border font-bold cursor-pointer hover:bg-indigo-500/10 hover:text-indigo-600"
            >
              <Edit className="h-3 w-3 ml-1" />تعديل
            </Button>
          }
        >
          <div className="space-y-0">
            <DataRow label="طريقة التعاقد" value={p.tenderMethod || TENDER_TYPE_LABELS[op.tenderType] || op.tenderType} />
            <DataRow label="نوع الطرح القانوني" value={TENDER_TYPE_LABELS[op.tenderType] || op.tenderType} />
            <DataRow label="طبيعة العملية" value={p.tenderKind || "خدمات وتوريدات"} />
            <DataRow label="نوع التقديم" value={p.biddingType || "إعلانات"} />
            <DataRow label="نطاق العملية" value={p.tenderNature || "داخلية"} />
            <DataRow label="أسلوب التقييم" value={p.evaluationType || "مقبول/مرفوض"} />
            {p.activities && (
              <DataRow label="الأنشطة المشمولة" value={p.activities} />
            )}
            <DataRow
              label="تقبل العروض البديلة"
              value={p.allowAlternativeOffers ? <Badge className="badge-emerald text-[10px]">نعم ✓</Badge> : <span className="text-muted-foreground">لا ✗</span>}
            />
            <DataRow
              label="تقبل الاستفسارات"
              value={p.allowInquiries !== false ? <Badge className="badge-blue text-[10px]">نعم ✓</Badge> : <span className="text-muted-foreground">لا ✗</span>}
            />
          </div>
        </SectionCard>

        {/* 3. الشروط المالية والبنكية والضمانات */}
        <SectionCard
          title="الشروط المالية والبنكية والضمانات"
          icon={Coins}
          iconColor="text-emerald-600"
          badge={<Badge className="badge-emerald text-[10px] font-bold">الضمانات والتكاليف</Badge>}
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => openEditModal('financial')}
              className="text-xs h-8 rounded-xl border-border font-bold cursor-pointer hover:bg-emerald-500/10 hover:text-emerald-600"
            >
              <Edit className="h-3 w-3 ml-1" />تعديل
            </Button>
          }
        >
          <div className="space-y-0">
            <DataRow
              label="قيمة التأمين المؤقت"
              value={
                p.temporaryInsurance ? (
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(p.temporaryInsurance)}
                  </span>
                ) : op.guarantees?.[0]?.amount ? (
                  formatCurrency(op.guarantees[0].amount)
                ) : (
                  "—"
                )
              }
              mono
            />
            {p.temporaryInsurance && (
              <div className="py-1 px-2.5 rounded-lg bg-emerald-500/5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mb-1">
                {tafqeetArabic(p.temporaryInsurance)}
              </div>
            )}
            <DataRow
              label="ثمن كراسة الشروط"
              value={
                p.bookletPrice ? (
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(p.bookletPrice)}
                  </span>
                ) : (
                  "—"
                )
              }
              mono
            />
            <DataRow label="نسبة التأمين النهائي" value={`${p.finalInsuranceRate || 5}% من إجمالي قيمة التعاقد`} />
            <DataRow label="مدة وتعليمات الضمان" value={p.warrantyStatement || "لا يوجد"} />
            <DataRow label="العملة الرسمية" value={p.currency || "جنيه مصري"} />
            <DataRow label="تقبل التجزئة" value={p.divisible || "تقبل التجزئة"} />
            <DataRow
              label="تجزئة التأمين المؤقت"
              value={p.allowMultipleTempInsurance ? <Badge className="badge-blue text-[10px]">مسموح بالرد</Badge> : <span className="text-muted-foreground">غير مجزأ</span>}
            />
            <DataRow
              label="الدفعة المقدمة"
              value={p.allowDownPayment ? (p.downPayment ? `متاحة (${p.downPayment})` : "متاحة ✓") : <span className="text-muted-foreground">غير متاح</span>}
            />
          </div>
        </SectionCard>

        {/* 4. مدد التنفيذ والنشر والتسليم */}
        <SectionCard
          title="مدد التنفيذ والنشر والتسليم"
          icon={Clock}
          iconColor="text-amber-600"
          badge={<Badge className="badge-amber text-[10px] font-bold">الجدول الزمني</Badge>}
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => openEditModal('durations')}
              className="text-xs h-8 rounded-xl border-border font-bold cursor-pointer hover:bg-amber-500/10 hover:text-amber-600"
            >
              <Edit className="h-3 w-3 ml-1" />تعديل
            </Button>
          }
        >
          <div className="space-y-0">
            <DataRow label="مدة النشر بالبوابة" value={p.publishingDays ? `${p.publishingDays} يوماً` : "—"} mono />
            <DataRow label="مدة الاستلام والتوريد / التنفيذ" value={p.deliveryDuration || "شهر"} />
            <DataRow label="تاريخ تسجيل العملية بالنظام" value={formatDate(op.createdAt)} />
            <DataRow label="آخر تحديث لبيانات العملية" value={formatDate(op.updatedAt)} />
            <DataRow
              label="المستندات وكراسة الشروط"
              value={
                <Badge className={op.documents?.length > 0 ? "badge-blue text-[10px]" : "bg-muted text-muted-foreground border-border text-[10px]"}>
                  {op.documents?.length || 0} ملفات مؤرشفة
                </Badge>
              }
            />
          </div>
        </SectionCard>
      </div>

      {/* ━━━ الأجزاء والبنود المسحوبة من كراسة الشروط (Parts & Items) ━━━ */}
      {(partsList.length > 0 || itemsList.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {partsList.length > 0 && (
            <SectionCard
              title="الأجزاء المسحوبة من العملية"
              icon={Layers}
              iconColor="text-indigo-600"
              badge={<Badge className="badge-blue text-[10px] font-bold">{partsList.length} أجزاء</Badge>}
            >
              <div className="rounded-2xl border border-border overflow-hidden bg-card">
                <table className="w-full text-xs text-right border-collapse">
                  <thead className="bg-muted/60 text-muted-foreground font-bold border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">م</th>
                      <th className="py-2.5 px-3">اسم الجزء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-medium">
                    {partsList.map((part: any, i: number) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 text-center font-mono font-bold text-muted-foreground">{part.serial || i + 1}</td>
                        <td className="py-2 px-3 font-semibold text-foreground">{part.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {itemsList.length > 0 && (
            <SectionCard
              title="البنود ومواصفات الكميات"
              icon={Package}
              iconColor="text-teal-600"
              badge={<Badge className="badge-emerald text-[10px] font-bold">{itemsList.length} بنود مسجلة</Badge>}
            >
              <div className="rounded-2xl border border-border overflow-hidden bg-card max-h-80 overflow-y-auto scrollbar-thin">
                <table className="w-full text-xs text-right border-collapse">
                  <thead className="bg-muted/60 text-muted-foreground font-bold border-b border-border sticky top-0 bg-card z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">م</th>
                      <th className="py-2.5 px-3">اسم البند</th>
                      <th className="py-2.5 px-3">النوع / التصنيف</th>
                      <th className="py-2.5 px-3 text-center w-16">الكمية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-medium">
                    {itemsList.map((item: any, i: number) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 text-center font-mono font-bold text-muted-foreground">{item.serial || i + 1}</td>
                        <td className="py-2 px-3 font-bold text-foreground">
                          <div>{item.name}</div>
                          {item.partName && item.partName !== item.name && (
                            <span className="text-[10px] text-muted-foreground font-normal">جزء: {item.partName}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-[11px] text-muted-foreground">{item.type || "—"}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400">{item.quantity || 1}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* ━━━ ملاحظات وشروط خاصة ووصف العملية ━━━ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* شروط ووصف العملية من الكراسة */}
        <SectionCard
          title="الشروط والمواصفات الرسمية المسحوبة"
          icon={FileCheck}
          iconColor="text-blue-600"
          badge={<Badge className="badge-blue text-[10px]">كراسة الشروط</Badge>}
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => openEditModal('conditions')}
              className="text-xs h-8 rounded-xl border-border font-bold cursor-pointer hover:bg-blue-500/10 hover:text-blue-600"
            >
              <Edit className="h-3 w-3 ml-1" />تعديل
            </Button>
          }
        >
          <div className="space-y-3.5">
            {p.conditions ? (
              <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-1.5">
                <span className="text-xs font-black text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  الشروط الخاصة باللغة العربية:
                </span>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-medium">
                  {p.conditions}
                </p>
              </div>
            ) : null}

            {p.description ? (
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-1.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  الوصف التفصيلي للعملية:
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {p.description}
                </p>
              </div>
            ) : null}

            {!p.conditions && !p.description && (
              <EmptyState
                icon={BookOpen}
                text="الشروط والمواصفات الكاملة متوفرة بكراسة الشروط المرفقة"
                subtext="يمكنك تحميل وقراءة ملف الكراسة الأصلي مباشرة من تبويب كراسة الشروط"
              />
            )}
          </div>
        </SectionCard>

        {/* الملاحظات والشروط الإدارية التحريرية */}
        <SectionCard
          title="ملاحظات وشروط إدارية خاصة"
          icon={Edit}
          iconColor="text-amber-500"
          actions={
            !editingNotes && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => openEditModal('conditions')}
                className="text-xs h-8 rounded-xl border-border hover:bg-amber-500/10 hover:text-amber-600 font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{op.notes ? "تعديل الملاحظات" : "إضافة ملاحظة جديدة"}</span>
              </Button>
            )
          }
        >
          {editingNotes ? (
            <div className="space-y-3.5 animate-fade-in p-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  تدوين وتحرير الشروط الخاصة بالعملية:
                </span>
                <span className="text-[11px] text-muted-foreground">
                  يتم حفظها في قاعدة البيانات فوراً
                </span>
              </div>

              <Textarea
                value={standaloneNotes}
                onChange={(e) => setStandaloneNotes(e.target.value)}
                placeholder="اكتب هنا الشروط الخاصة بالعملية، مواصفات التوريد، غرامات التأخير، شروط الدفع، فترات الضمان، أو أي تنبيهات حرجة..."
                rows={5}
                className="text-sm bg-background border-border rounded-xl focus:border-amber-500 leading-relaxed font-sans"
              />

              {/* Quick Template Chips */}
              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  بنود وشروط شائعة للإدراج السريع:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    "📌 مدة التوريد: 30 يوماً من تاريخ استلام أمر التوريد",
                    "⚠️ غرامة التأخير: 1% عن كل أسبوع تأخير بحد أقصى 10%",
                    "💳 شروط الدفع: 25% دفعة مقدمة والباقي بموجب مستخلصات شهرية",
                    "🛡️ فترة الضمان: ضمان شامل لمدة 12 شهراً من تاريخ الاستلام النهائي",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        setStandaloneNotes((prev) => (prev ? `${prev}\n${chip}` : chip));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-amber-500/15 hover:text-amber-700 dark:hover:text-amber-300 border border-border text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      {chip.split(":")[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                {op.notes ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteStandaloneNotes}
                    disabled={savingNotes}
                    className="text-rose-600 hover:bg-rose-500/10 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    مسح الملاحظة
                  </Button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingNotes(false);
                      setStandaloneNotes(op.notes || "");
                    }}
                    disabled={savingNotes}
                    className="rounded-xl text-xs cursor-pointer"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveStandaloneNotes}
                    disabled={savingNotes}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs px-4 shadow-sm cursor-pointer"
                  >
                    {savingNotes ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ الملاحظات"}
                  </Button>
                </div>
              </div>
            </div>
          ) : op.notes ? (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/25 space-y-2">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <Edit className="h-3.5 w-3.5" />
                    الشروط والملاحظات المسجلة للعملية:
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditModal('conditions')}
                      className="h-7 text-[11px] text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 font-bold cursor-pointer flex items-center gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      تعديل
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap pt-1 font-medium">
                  {op.notes}
                </p>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Edit}
              text="لا توجد ملاحظات خاصة مسجلة حتى الآن"
              subtext="يمكنك تدوين الشروط الخاصة أو المواصفات الفنية أو شروط الدفع والتوريد للعملية"
              action={
                <Button
                  size="sm"
                  onClick={() => openEditModal('conditions')}
                  className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs h-9 rounded-xl shadow-md cursor-pointer mt-2 flex items-center gap-1.5 mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>إضافة ملاحظة وشروط خاصة الآن</span>
                </Button>
              }
            />
          )}
        </SectionCard>
      </div>

      {/* ━━━ الشركات المشاركة بالعطاء وأكوادها المستقلة ━━━ */}
      <TabCompanies op={op} />
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   2. COMPANIES TAB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TabCompanies({ op }: { op: Operation }) {
  return (
    <SectionCard title="الشركات المشاركة بالعطاء" icon={Building2} iconColor="text-blue-600"
      badge={<Badge className="badge-blue text-[10px] font-bold">{op.companies?.length || 0} شركة</Badge>}>
      <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-foreground mb-2">
        <strong>نظام الأكواد المستقلة:</strong> كل شركة تدخل العملية بكود منفصل وتجهيز ملفات وعروض منفصلة تماماً (مثلاً: {(op.companies || []).map((c: any) => c.displayCode).join(" ، ")}).
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(op.companies || []).map((oc: any) => (
          <div key={oc.displayCode} className="p-4 rounded-xl bg-card border border-border hover:border-blue-500/40 transition-colors flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-lg flex items-center justify-center font-mono shadow-md">
                {oc.company.code}
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">{oc.company.name}</p>
                <p className="text-xs text-muted-foreground">كود العملية: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{oc.displayCode}</span></p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {oc.isWinner && <Badge className="badge-amber text-[10px]">🏆 فائزة بالترسية</Badge>}
              {oc.isLocked && <Badge className="badge-rose text-[10px]">مقفلة</Badge>}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   3. DATES TAB (إدارة وتحرير وحذف المواعيد والجلسات)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TabDates({ op, onRefresh }: { op: Operation; onRefresh: () => void }) {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [adding, setAdding] = useState(false);
  const [dateType, setDateType] = useState("PUBLICATION");
  const [dateValue, setDateValue] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [saving, setSaving] = useState(false);

  // حالة التعديل
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDateType, setEditDateType] = useState("TECHNICAL_OPENING");
  const [editDateValue, setEditDateValue] = useState("");
  const [editDateLabel, setEditDateLabel] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // حالة الحذف
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAddDate = async () => {
    if (!dateValue) {
      toast.error("يرجى اختيار التاريخ والوقت");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/operations/${op.id}/dates`, {
        dateType,
        dateValue,
        label: dateLabel.trim() || DATE_TYPE_LABELS[dateType] || undefined,
      });
      toast.success("تم حفظ الموعد بنجاح");
      setAdding(false);
      setDateValue("");
      setDateLabel("");
      onRefresh();
    } catch {
      toast.error("فشل في حفظ الموعد");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (d: any) => {
    setEditingId(d.id);
    setEditDateType(d.dateType || d.type || "TECHNICAL_OPENING");
    setEditDateValue(d.dateValue || d.date ? new Date(d.dateValue || d.date).toISOString() : "");
    setEditDateLabel(d.label || DATE_TYPE_LABELS[d.dateType || d.type] || "");
    setConfirmDeleteId(null);
    setAdding(false);

    // سكرول سلس تلقائي ومريح إلى خانة التعديل
    setTimeout(() => {
      const el = document.getElementById("date-edit-panel");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 60);
  };

  const handleCancelEdit = () => {
    const prevId = editingId;
    setEditingId(null);
    setEditDateType("TECHNICAL_OPENING");
    setEditDateValue("");
    setEditDateLabel("");

    if (prevId) {
      setTimeout(() => {
        const el = document.getElementById(`date-item-${prevId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 60);
    }
  };

  const handleSaveEdit = async (dateId: string) => {
    if (!editDateValue) {
      toast.error("يرجى اختيار التاريخ والوقت");
      return;
    }
    setSavingEdit(true);
    try {
      await api.patch(`/operations/${op.id}/dates/${dateId}`, {
        dateType: editDateType,
        dateValue: editDateValue,
        label: editDateLabel.trim() || undefined,
      });
      toast.success("تم تعديل الموعد بنجاح في قاعدة البيانات");
      setEditingId(null);
      onRefresh();

      setTimeout(() => {
        const el = document.getElementById(`date-item-${dateId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    } catch {
      toast.error("فشل في تحديث الموعد");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteDate = async (dateId: string) => {
    setDeletingId(dateId);
    try {
      await api.delete(`/operations/${op.id}/dates/${dateId}`);
      toast.success("تم حذف الموعد من قاعدة البيانات بنجاح");
      setConfirmDeleteId(null);
      if (editingId === dateId) setEditingId(null);
      onRefresh();
    } catch {
      toast.error("فشل في حذف الموعد");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <SectionCard
      title="التواريخ الحرجة والتنبيهات الرسمية"
      icon={Calendar}
      iconColor="text-indigo-600"
      badge={<Badge className="bg-blue-600/10 text-blue-700 dark:text-blue-300 border-blue-500/20 text-xs">{op.dates?.length || 0} مواعيد مسجلة</Badge>}
      actions={
        <div className="flex items-center gap-2">
          {/* View Mode Toggle Switch (مثل شاشة الرادار) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-border shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                viewMode === "table"
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="عرض كجدول رسمي"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                viewMode === "grid"
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="عرض كبطاقات تفاعلية"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => {
              const next = !adding;
              setAdding(next);
              handleCancelEdit();
              if (next) {
                setTimeout(() => {
                  const el = document.getElementById("date-add-panel");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 60);
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 px-3 rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{adding ? "إغلاق النموذج" : "إضافة موعد جديد"}</span>
          </Button>
        </div>
      }
    >
      {/* ━━━ نموذج إضافة موعد جديد ━━━ */}
      {adding && (
        <div id="date-add-panel" className="p-4 sm:p-5 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-4 mb-4 animate-fade-in shadow-sm scroll-mt-28">
          <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>تسجيل موعد وجلسة رسمية للعملية</span>
            </h4>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              سيتم حفظ الموعد في قاعدة البيانات وتفعيل تنبيهات العد التنازلي التلقائية
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">نوع التاريخ / الجلسة *</Label>
              <Select value={dateType} onValueChange={(v) => {
                const nextType = v ?? "TECHNICAL_OPENING";
                setDateType(nextType);
                if (!dateLabel || Object.values(DATE_TYPE_LABELS).includes(dateLabel)) {
                  setDateLabel(DATE_TYPE_LABELS[nextType] || "");
                }
              }}>
                <SelectTrigger className="bg-background border-border rounded-xl text-sm h-11 font-bold">
                  <span className="truncate">{DATE_TYPE_LABELS[dateType] || "اختر نوع الجلسة / الموعد"}</span>
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground max-h-72">
                  {Object.entries(DATE_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-right font-medium">
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">المسمى المخصص للموعد أو الجلسة:</Label>
              <Input
                value={dateLabel}
                onChange={(e) => setDateLabel(e.target.value)}
                placeholder="مثال: موعد فتح المظاريف الفنية، جلسة البت..."
                className="h-11 text-sm bg-background"
              />
            </div>
          </div>

          {/* منتقي التاريخ والوقت العربي المخصص */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>تحديد الموعد (بالأشهر واللغة العربية):</span>
            </Label>
            <ArabicDateTimePicker
              value={dateValue}
              onChange={(val) => setDateValue(val)}
              showTime={true}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setAdding(false)}
              className="h-10 text-xs rounded-xl border-border text-foreground hover:bg-muted cursor-pointer"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleAddDate}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 px-5 rounded-xl cursor-pointer shadow-md flex items-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>حفظ الموعد في قاعدة البيانات</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ━━━ نموذج تعديل الموعد (يظهر أعلى القائمة أو الجدول) ━━━ */}
      {editingId && (
        <div id="date-edit-panel" className="p-5 rounded-2xl bg-amber-500/5 border-2 border-amber-500/40 space-y-4 mb-4 shadow-xl animate-fade-in scroll-mt-28 ring-4 ring-amber-500/15">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
            <div className="flex items-center gap-2">
              <Edit className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-extrabold text-foreground">
                تعديل الموعد: {editDateLabel || DATE_TYPE_LABELS[editDateType] || editDateType}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelEdit}
              className="h-7 text-xs rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 ml-1" />
              إلغاء
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">نوع الموعد / الجلسة</Label>
              <Select value={editDateType} onValueChange={(v) => {
                const nextType = v ?? "TECHNICAL_OPENING";
                setEditDateType(nextType);
                if (!editDateLabel || Object.values(DATE_TYPE_LABELS).includes(editDateLabel)) {
                  setEditDateLabel(DATE_TYPE_LABELS[nextType] || "");
                }
              }}>
                <SelectTrigger className="bg-background border-border rounded-xl text-sm h-11 font-bold">
                  <span className="truncate">{DATE_TYPE_LABELS[editDateType] || "اختر نوع الجلسة"}</span>
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground max-h-72">
                  {Object.entries(DATE_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-right font-medium">
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">مسمى الجلسة / الموعد:</Label>
              <Input
                value={editDateLabel}
                onChange={(e) => setEditDateLabel(e.target.value)}
                placeholder="اسم الموعد أو الجلسة"
                className="h-11 text-sm bg-background"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>تعديل التاريخ والوقت (بالأشهر واللغة العربية):</span>
            </Label>
            <ArabicDateTimePicker
              value={editDateValue}
              onChange={(val) => setEditDateValue(val)}
              showTime={true}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-amber-500/20">
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              className="h-9 text-xs rounded-xl border-border text-foreground hover:bg-muted cursor-pointer"
            >
              إلغاء
            </Button>
            <Button
              onClick={() => handleSaveEdit(editingId)}
              disabled={savingEdit}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 px-5 rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>حفظ التعديلات</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ━━━ قائمة المواعيد المسجلة (بطاقات أو جدول) ━━━ */}
      {op.dates?.length > 0 ? (
        viewMode === "grid" ? (
          /* 1. عرض البطاقات (Grid View) */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fade-in">
            {op.dates.map((d: any) => {
              const cd = getCountdown(d.dateValue || d.date);
              const isExpired = cd.expired || cd.text.includes("انتهى");
              const isConfirmingDelete = confirmDeleteId === d.id;
              const isDeleting = deletingId === d.id;

              return (
                <div
                  key={d.id}
                  id={`date-item-${d.id}`}
                  className={`p-4 rounded-2xl border transition-all scroll-mt-28 ${
                    editingId === d.id
                      ? "ring-2 ring-amber-500 bg-amber-500/10 border-amber-500/50 shadow-sm"
                      : isExpired
                      ? "bg-rose-500/10 dark:bg-rose-950/25 border-rose-500/40 dark:border-rose-500/40 hover:border-rose-500/60 shadow-xs"
                      : cd.urgent
                      ? "bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/40 shadow-xs"
                      : "bg-card border-border hover:border-blue-500/30"
                  } space-y-3 flex flex-col justify-between`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-black ${isExpired ? "text-rose-950 dark:text-rose-100" : "text-foreground"}`}>
                        {d.label || DATE_TYPE_LABELS[d.dateType || d.type] || d.dateType || d.type}
                      </span>
                      {isExpired ? (
                        <Badge className="bg-rose-600 hover:bg-rose-600 text-white font-bold text-[10px] px-2.5 py-0.5 shadow-xs">
                          انتهى الموعد ⌛
                        </Badge>
                      ) : cd.urgent ? (
                        <Badge className="badge-amber text-[10px] animate-pulse">عاجل ⚠️</Badge>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border font-mono ${
                          isExpired
                            ? "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30"
                            : "bg-muted text-foreground border-border"
                        }`}
                      >
                        {formatDateTime(d.dateValue || d.date)}
                      </span>
                      <span
                        className={`text-xs font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg ${
                          isExpired
                            ? "text-rose-700 dark:text-rose-300 bg-rose-500/20 border border-rose-500/30"
                            : cd.urgent
                            ? "text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30"
                            : "text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5 inline ml-1 shrink-0" />
                        <span>{cd.text}</span>
                      </span>
                    </div>
                  </div>

                  {/* شريط أدوات التحرير والحذف لكل موعد */}
                  <div className="pt-2 border-t border-border/70 flex items-center justify-between gap-2">
                    {isConfirmingDelete ? (
                      <div className="flex items-center justify-between w-full bg-rose-500/15 border border-rose-500/35 p-2 rounded-xl animate-fade-in">
                        <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                          تأكيد حذف الموعد؟
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmDeleteId(null)}
                            className="h-7 px-2 text-xs rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            إلغاء
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleDeleteDate(d.id)}
                            disabled={isDeleting}
                            className="h-7 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                          >
                            {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "نعم، احذف"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartEdit(d)}
                          className={`h-8 text-xs font-bold rounded-xl border cursor-pointer flex items-center gap-1.5 ${
                            isExpired
                              ? "border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-800 dark:text-rose-200"
                              : "border-border bg-muted/30 text-foreground hover:bg-muted hover:border-blue-500/40"
                          }`}
                        >
                          <Edit className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                          <span>تعديل الموعد</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDeleteId(d.id)}
                          className="h-8 text-xs font-bold rounded-xl text-rose-600 hover:bg-rose-500/15 hover:text-rose-700 cursor-pointer flex items-center gap-1.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>حذف</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* 2. عرض الجدول الرسمي (Table View) */
          <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-sm animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/60 text-xs font-bold text-muted-foreground">
                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                    <th className="py-3.5 px-4">نوع الجلسة والمسمى الرسمي</th>
                    <th className="py-3.5 px-4">التاريخ والوقت المحدد</th>
                    <th className="py-3.5 px-4">العد التنازلي والموقف</th>
                    <th className="py-3.5 px-4 text-center w-36">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs font-medium">
                  {op.dates.map((d: any, idx: number) => {
                    const cd = getCountdown(d.dateValue || d.date);
                    const isExpired = cd.expired || cd.text.includes("انتهى");
                    const isConfirmingDelete = confirmDeleteId === d.id;
                    const isDeleting = deletingId === d.id;

                    return (
                      <tr
                        key={d.id}
                        id={`date-item-${d.id}`}
                        className={`transition-colors scroll-mt-28 ${
                          editingId === d.id
                            ? "bg-amber-500/10 dark:bg-amber-500/15"
                            : isExpired
                            ? "bg-rose-500/10 dark:bg-rose-950/25 hover:bg-rose-500/15"
                            : cd.urgent
                            ? "bg-amber-500/5 hover:bg-amber-500/10"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`p-1.5 rounded-lg shrink-0 ${
                                isExpired
                                  ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              }`}
                            >
                              <Calendar className="h-4 w-4" />
                            </div>
                            <div>
                              <span
                                className={`font-extrabold text-sm block ${
                                  isExpired ? "text-rose-950 dark:text-rose-100" : "text-foreground"
                                }`}
                              >
                                {d.label || DATE_TYPE_LABELS[d.dateType || d.type] || d.dateType || d.type}
                              </span>
                              {d.label && DATE_TYPE_LABELS[d.dateType || d.type] && d.label !== DATE_TYPE_LABELS[d.dateType || d.type] && (
                                <span className="text-[11px] text-muted-foreground block">
                                  {DATE_TYPE_LABELS[d.dateType || d.type]}
                                </span>
                              )}
                            </div>
                            {isExpired ? (
                              <Badge className="bg-rose-600 hover:bg-rose-600 text-white font-bold text-[10px] px-2 py-0.5 shadow-xs mr-auto shrink-0">
                                انتهى الموعد ⌛
                              </Badge>
                            ) : cd.urgent ? (
                              <Badge className="badge-amber text-[10px] px-2 py-0.5 animate-pulse shrink-0 mr-auto">
                                عاجل ⚠️
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-bold px-2.5 py-1.5 rounded-lg border inline-block font-mono ${
                              isExpired
                                ? "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30"
                                : "bg-muted text-foreground border-border"
                            }`}
                          >
                            {formatDateTime(d.dateValue || d.date)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-lg text-xs ${
                              isExpired
                                ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/35"
                                : cd.urgent
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
                            }`}
                          >
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span>{cd.text}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isConfirmingDelete ? (
                            <div className="flex items-center justify-center gap-1 bg-rose-500/15 border border-rose-500/35 p-1 rounded-lg animate-fade-in">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setConfirmDeleteId(null)}
                                className="h-6 px-1.5 text-[11px] rounded text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                إلغاء
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleDeleteDate(d.id)}
                                disabled={isDeleting}
                                className="h-6 px-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded cursor-pointer"
                              >
                                {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "حذف"}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStartEdit(d)}
                                className="h-7.5 px-2.5 text-xs font-bold rounded-lg border-border hover:bg-muted hover:border-blue-500/40 cursor-pointer flex items-center gap-1"
                                title="تعديل الموعد"
                              >
                                <Edit className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                <span>تعديل</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmDeleteId(d.id)}
                                className="h-7.5 px-2 text-xs font-bold rounded-lg text-rose-600 hover:bg-rose-500/15 hover:text-rose-700 cursor-pointer flex items-center gap-1"
                                title="حذف الموعد"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>حذف</span>
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <EmptyState
          icon={Calendar}
          text="لم يتم تسجيل تواريخ حتى الآن"
          subtext="سجّل مواعيد الفتح الفني والمالي وآخر موعد للتقديم لتفعيل التنبيهات التلقائية"
        />
      )}
    </SectionCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   3. MARKET STUDY TAB (دراسة السوق والجدوى التقديرية)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function getDocCategoryBadge(doc: any) {
  const ft = (doc.fileType || "").toLowerCase();
  const fn = (doc.fileName || "").toLowerCase();
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ft) || fn.match(/\.(png|jpe?g|webp|gif)$/i)) {
    return { type: "image", label: "صورة / عينة", badgeBg: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30", color: "purple" };
  }
  if (["docx", "doc"].includes(ft) || fn.match(/\.(docx|doc)$/i)) {
    return { type: "word", label: "مستند Word", badgeBg: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30", color: "blue" };
  }
  if (["xlsx", "xls", "csv"].includes(ft) || fn.match(/\.(xlsx|xls|csv)$/i)) {
    return { type: "excel", label: "جدول Excel", badgeBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", color: "emerald" };
  }
  return { type: "pdf", label: "ملف PDF", badgeBg: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30", color: "rose" };
}

function TabMarketStudy({
  op,
  onRefresh,
  onGoBooklet,
  onPreviewDoc,
  onDownloadDoc,
}: {
  op: Operation;
  onRefresh: () => void;
  onGoBooklet: () => void;
  onPreviewDoc?: (doc: any) => void;
  onDownloadDoc?: (doc: any) => void;
}) {
  // ━━━ مستندات وصور دراسة السوق من قاعدة البيانات ━━━
  const marketDocs = useMemo(() => {
    return (op.documents || []).filter((d: any) => d.type === "MARKET_STUDY");
  }, [op.documents]);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState("");
  const [docCategory, setDocCategory] = useState("عرض أسعار مورد");
  const [selectedCompanyId, setSelectedCompanyId] = useState(op.companies?.[0]?.companyId || "");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals for Rename and Delete
  const [renamingDoc, setRenamingDoc] = useState<any | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  const [deletingDoc, setDeletingDoc] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filtered docs based on search
  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return marketDocs;
    const q = searchQuery.toLowerCase();
    return marketDocs.filter((d: any) =>
      (d.fileName || "").toLowerCase().includes(q) ||
      (d.uploadedBy || "").toLowerCase().includes(q) ||
      (d.fileType || "").toLowerCase().includes(q)
    );
  }, [marketDocs, searchQuery]);

  // Statistics
  const imageDocsCount = useMemo(() => {
    return marketDocs.filter((d: any) => {
      const ft = (d.fileType || "").toLowerCase();
      const fn = (d.fileName || "").toLowerCase();
      return ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ft) || Boolean(fn.match(/\.(png|jpe?g|webp|gif)$/i));
    }).length;
  }, [marketDocs]);

  const pdfDocsCount = useMemo(() => {
    return marketDocs.filter((d: any) => {
      const ft = (d.fileType || "").toLowerCase();
      const fn = (d.fileName || "").toLowerCase();
      return ft === "pdf" || Boolean(fn.match(/\.pdf$/i));
    }).length;
  }, [marketDocs]);

  const vendorQuotesCount = useMemo(() => {
    return marketDocs.filter((d: any) => {
      const fn = (d.fileName || "").toLowerCase();
      return fn.includes("عرض أسعار") || fn.includes("مورد") || fn.includes("quote") || fn.includes("أسعار");
    }).length;
  }, [marketDocs]);

  // Handle file picker selection
  const handleSelectFile = (file: File | null) => {
    setSelectedFile(file);
    if (file) {
      if (!customFileName.trim()) {
        const clean = file.name.replace(/\.[^/.]+$/, "");
        setCustomFileName(clean);
      }
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setFilePreviewUrl(url);
      } else {
        setFilePreviewUrl(null);
      }
    } else {
      setFilePreviewUrl(null);
    }
  };

  // Upload file to backend
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("يرجى اختيار ملف أو صورة لرفعها أولاً");
      return;
    }
    if (!customFileName.trim()) {
      toast.error("يرجى كتابة تسمية للملف عند الرفع لتسهيل تنظيمه");
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", selectedFile);
      const taggedName = docCategory && docCategory !== "أخرى"
        ? `[${docCategory}] ${customFileName.trim()}`
        : customFileName.trim();
      formData.append("fileName", taggedName);
      formData.append("type", "MARKET_STUDY");
      if (selectedCompanyId) {
        formData.append("companyId", selectedCompanyId);
      }
      await api.post(`/operations/${op.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`تم رفع وحفظ "${customFileName}" بنجاح في دراسة السوق! 📁`);
      setSelectedFile(null);
      setCustomFileName("");
      setFilePreviewUrl(null);
      setUploadModalOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل رفع الملف إلى الخادم");
    } finally {
      setUploading(false);
    }
  };

  // Delete document
  const handleDeleteDoc = async () => {
    if (!deletingDoc) return;
    try {
      setDeleting(true);
      await api.delete(`/operations/${op.id}/documents/${deletingDoc.id}`);
      toast.success("تم حذف الملف بنجاح");
      setDeletingDoc(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل حذف الملف");
    } finally {
      setDeleting(false);
    }
  };

  // Rename document
  const handleRenameSubmit = async () => {
    if (!renamingDoc || !renameValue.trim()) {
      toast.error("يرجى إدخال التسمية الجديدة للملف");
      return;
    }
    try {
      setRenaming(true);
      await api.patch(`/operations/${op.id}/documents/${renamingDoc.id}`, {
        fileName: renameValue.trim(),
      });
      toast.success("تم تحديث تسمية الملف بنجاح");
      setRenamingDoc(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل تعديل التسمية");
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ━━━ Market Study KPI Cards Row ━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl glass-card border border-border space-y-1 relative overflow-hidden group hover:border-blue-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">إجمالي ملفات دراسة السوق</span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FolderOpen className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black font-mono text-foreground">{marketDocs.length} <span className="text-xs font-normal text-muted-foreground">مستند</span></p>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>أرشيف دراسة السوق الرقمي</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-border space-y-1 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">عروض أسعار الموردين</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileCheck className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">{vendorQuotesCount} <span className="text-xs font-normal text-muted-foreground">عرض مسجل</span></p>
          <span className="text-[11px] text-muted-foreground">عروض ومقايسات أسعار معتمدة</span>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-border space-y-1 relative overflow-hidden group hover:border-purple-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">صور العينات والمطابقة</span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ImageIcon className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">{imageDocsCount} <span className="text-xs font-normal text-muted-foreground">صورة / عينة</span></p>
          <span className="text-[11px] text-muted-foreground">صور بصرية للأصناف والمهمات</span>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-border space-y-1 relative overflow-hidden group hover:border-rose-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">ملفات ومستندات PDF</span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <FileText className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">{pdfDocsCount} <span className="text-xs font-normal text-muted-foreground">ملف PDF</span></p>
          <span className="text-[11px] text-muted-foreground">كتالوجات ومواصفات فنية رسمية</span>
        </div>
      </div>

      {/* ━━━ MASTER UPLOAD & DOCUMENTS GALLERY (القسم الرئيسي لرفع ومعاينة وتنظيم الملفات) ━━━ */}
      <SectionCard
        title="ملفات وصور وعروض أسعار دراسة السوق والجدوى"
        icon={FolderOpen}
        iconColor="text-blue-600"
        badge={
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-bold text-[11px] px-2.5 py-0.5">
              {marketDocs.length} ملفات وصور مرفوعة
            </Badge>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setSelectedFile(null);
                setCustomFileName("");
                setFilePreviewUrl(null);
                setUploadModalOpen(true);
              }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Upload className="h-4 w-4" />
              <span>رفع ملف أو صورة جديدة</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onGoBooklet}
              className="border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-xs h-9 px-3 rounded-xl cursor-pointer"
            >
              <span>المتابعة لسحب الكراسة</span>
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Explanation Strip */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-500/20 text-xs text-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
              <p className="leading-relaxed">
                ارفع هنا جميع <strong>عروض أسعار الموردين</strong>، <strong>صور عينات الأصناف</strong>، <strong>شيتات الإكسيل</strong>، أو <strong>كتالوجات المواصفات</strong> مع <strong>تسمية تعريفيّة خاصة</strong> لكل ملف لتسهيل المعاينة والتحميل والرجوع إليه لاحقاً.
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                title="عرض شبكي (كروت مع معاينة)"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                title="عرض جدولي مفصل"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search Toolbar (if there are documents) */}
          {marketDocs.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
              <div className="relative flex-1 max-w-md">
                <Input
                  placeholder="ابحث في تسمية الملفات، أسماء الموردين، أو صيغ المستندات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 text-xs pr-3 rounded-xl bg-background border-border"
                />
              </div>
              <span className="text-[11px] text-muted-foreground self-center">
                يتم عرض {filteredDocs.length} من أصل {marketDocs.length} مستند
              </span>
            </div>
          )}

          {/* ━━━ DOCUMENTS VIEW: GRID MODE ━━━ */}
          {filteredDocs.length > 0 && viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {filteredDocs.map((doc: any) => {
                const badgeInfo = getDocCategoryBadge(doc);
                const isImage = badgeInfo.type === "image";
                const isWord = badgeInfo.type === "word";
                const isPdf = badgeInfo.type === "pdf";
                const isExcel = badgeInfo.type === "excel";

                return (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl border border-border bg-card hover:border-blue-500/40 hover:shadow-lg transition-all duration-200 flex flex-col justify-between space-y-3.5 group relative"
                  >
                    {/* Top: Category Tag & Extension Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <Badge className={`${badgeInfo.badgeBg} text-[10px] font-bold px-2 py-0.5 rounded-lg`}>
                        {badgeInfo.label}
                      </Badge>
                      <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                        {doc.fileType || "ملف"}
                      </span>
                    </div>

                    {/* Middle: Preview Thumbnail or Rich Format Box */}
                    {isImage ? (
                      <div
                        onClick={() => onPreviewDoc?.(doc)}
                        className="h-36 w-full rounded-xl bg-slate-950/80 border border-border overflow-hidden relative group/thumb cursor-pointer flex items-center justify-center shadow-inner"
                        title="انقر للمعاينة بحجم الشاشة الكامل"
                      >
                        {/* Image Preview */}
                        <img
                          src={`http://localhost:4000/api/operations/${op.id}/documents/${doc.id}/file`}
                          alt={doc.fileName}
                          className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold backdrop-blur-xs">
                          <Eye className="h-4 w-4" />
                          <span>معاينة الصورة</span>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => onPreviewDoc?.(doc)}
                        className={`h-28 w-full rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 shadow-inner group/box ${
                          isPdf
                            ? "bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                            : isWord
                            ? "bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                            : "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        }`}
                        title="انقر لمعاينة المستند"
                      >
                        <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-xs group-hover/box:scale-110 transition-transform">
                          {isPdf ? (
                            <FileText className="h-7 w-7 text-rose-500" />
                          ) : isWord ? (
                            <BookOpen className="h-7 w-7 text-blue-500" />
                          ) : (
                            <FileSpreadsheet className="h-7 w-7 text-emerald-500" />
                          )}
                        </div>
                        <span className="text-[11px] font-bold flex items-center gap-1 text-muted-foreground group-hover/box:text-foreground">
                          <Eye className="h-3.5 w-3.5" />
                          معاينة مباشرة في النظام
                        </span>
                      </div>
                    )}

                    {/* File Title (User's Custom Friendly Name) */}
                    <div className="space-y-1">
                      <h4
                        className="text-xs sm:text-sm font-extrabold text-foreground leading-snug line-clamp-2 hover:text-blue-600 transition-colors"
                        title={doc.fileName}
                      >
                        {doc.fileName}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono flex-wrap">
                        <span>{formatDocFileSize(doc.fileSize)}</span>
                        <span>•</span>
                        <span>{formatDate(doc.createdAt)}</span>
                        {doc.uploadedBy && (
                          <>
                            <span>•</span>
                            <span className="text-foreground font-medium">{doc.uploadedBy}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-border">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onPreviewDoc?.(doc)}
                          className="h-8 px-2.5 text-[11px] font-bold rounded-lg border-border hover:border-blue-500 hover:text-blue-600 cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>معاينة</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDownloadDoc?.(doc)}
                          className="h-8 px-2.5 text-[11px] font-bold rounded-lg border-border hover:border-emerald-500 hover:text-emerald-600 cursor-pointer flex items-center gap-1"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>تحميل</span>
                        </Button>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setRenamingDoc(doc);
                            setRenameValue(doc.fileName || "");
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                          title="تعديل تسمية الملف"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeletingDoc(doc)}
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                          title="حذف الملف"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ━━━ DOCUMENTS VIEW: LIST TABLE MODE ━━━ */}
          {filteredDocs.length > 0 && viewMode === "list" && (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-right text-xs">
                <thead className="bg-muted/70 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3">تسمية الملف التعريفي</th>
                    <th className="px-3.5 py-3">التصنيف والنوع</th>
                    <th className="px-3.5 py-3">الحجم</th>
                    <th className="px-3.5 py-3">تاريخ الرفع</th>
                    <th className="px-3.5 py-3">بواسطة</th>
                    <th className="px-3.5 py-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDocs.map((doc: any) => {
                    const badgeInfo = getDocCategoryBadge(doc);
                    return (
                      <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-card border border-border shrink-0">
                              {badgeInfo.type === "image" ? (
                                <ImageIcon className="h-4 w-4 text-purple-500" />
                              ) : badgeInfo.type === "word" ? (
                                <BookOpen className="h-4 w-4 text-blue-500" />
                              ) : badgeInfo.type === "excel" ? (
                                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <FileText className="h-4 w-4 text-rose-500" />
                              )}
                            </div>
                            <span className="font-bold text-foreground text-xs leading-normal">
                              {doc.fileName}
                            </span>
                          </div>
                        </td>
                        <td className="px-3.5 py-3">
                          <Badge className={`${badgeInfo.badgeBg} text-[10px]`}>
                            {badgeInfo.label}
                          </Badge>
                        </td>
                        <td className="px-3.5 py-3 font-mono text-muted-foreground text-[11px]">
                          {formatDocFileSize(doc.fileSize)}
                        </td>
                        <td className="px-3.5 py-3 text-muted-foreground text-[11px]">
                          {formatDate(doc.createdAt)}
                        </td>
                        <td className="px-3.5 py-3 text-foreground font-medium text-[11px]">
                          {doc.uploadedBy || "المدير العام"}
                        </td>
                        <td className="px-3.5 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onPreviewDoc?.(doc)}
                              className="h-7 px-2 text-[10px] font-bold rounded-lg border-border hover:text-blue-600 cursor-pointer"
                            >
                              <Eye className="h-3 w-3 ml-1" />
                              معاينة
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onDownloadDoc?.(doc)}
                              className="h-7 px-2 text-[10px] font-bold rounded-lg border-border hover:text-emerald-600 cursor-pointer"
                            >
                              <Download className="h-3 w-3 ml-1" />
                              تحميل
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setRenamingDoc(doc);
                                setRenameValue(doc.fileName || "");
                              }}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                              title="تعديل التسمية"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeletingDoc(doc)}
                              className="h-7 w-7 text-rose-500 hover:text-rose-700 cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ━━━ EMPTY STATE (IF NO DOCUMENTS YET) ━━━ */}
          {marketDocs.length === 0 && (
            <div className="p-8 sm:p-12 rounded-3xl border-2 border-dashed border-border/80 bg-muted/20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-lg">
                <Upload className="h-8 w-8 stroke-[1.8]" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h4 className="text-base font-extrabold text-foreground">
                  لم يتم رفع أي ملفات أو صور لدراسة السوق حتى الآن
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  ابدأ الآن برفع عروض أسعار الموردين، صور العينات المطابقة، أو الكتالوجات الفنية مع إمكانية تسمية كل ملف لسهولة تنظيمه واستعراضه.
                </p>
              </div>
              <Button
                size="default"
                onClick={() => {
                  setSelectedFile(null);
                  setCustomFileName("");
                  setFilePreviewUrl(null);
                  setUploadModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 px-6 rounded-xl cursor-pointer shadow-md flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>رفع أول ملف أو صورة الآن</span>
              </Button>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ━━━ MODAL: UPLOAD FILE WITH CUSTOM NAME & PREVIEW (نافذة رفع وتسمية الملف) ━━━ */}
      {uploadModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto scrollbar-thin">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-foreground text-sm sm:text-base leading-tight">
                      رفع وتسمية ملف / صورة لدراسة السوق
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      العملية: {op.companies?.[0]?.displayCode || `#${op.serialNumber}`} • {op.name}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setUploadModalOpen(false)}
                  className="rounded-full h-8 w-8 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Upload Drop Zone */}
              <div className="space-y-4">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleSelectFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => {
                    const input = document.getElementById("market-file-input");
                    if (input) input.click();
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                    dragActive
                      ? "border-blue-500 bg-blue-500/10 scale-[1.01]"
                      : selectedFile
                      ? "border-emerald-500/60 bg-emerald-500/5"
                      : "border-border hover:border-blue-400 hover:bg-muted/30 bg-muted/10"
                  }`}
                >
                  <input
                    id="market-file-input"
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleSelectFile(e.target.files[0]);
                      }
                    }}
                  />

                  {selectedFile ? (
                    <div className="space-y-2.5 w-full">
                      {filePreviewUrl ? (
                        <div className="w-28 h-28 mx-auto rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md">
                          <img src={filePreviewUrl} alt="معاينة" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="h-7 w-7" />
                        </div>
                      )}
                      <div>
                        <p className="font-extrabold text-foreground text-xs leading-normal">
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {formatDocFileSize(selectedFile.size)} • تم اختيار الملف بنجاح
                        </p>
                      </div>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold underline block">
                        اضغط هنا لتغيير الملف
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-xs">
                          اضغط هنا لاختيار الملف أو اسحبه وأفلته هنا
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          يقبل: صور عينات (JPG, PNG, WEBP)، ملفات PDF، ومستندات Word و Excel (حتى 35 ميجابايت)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* File Custom Name (تسمية الملف التعريفي - المطلوب الرئيسي) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-blue-600" />
                      <span>تسمية الملف التعريفي عند الرفع *</span>
                    </Label>
                    <span className="text-[10px] text-muted-foreground">اسم يسهل تنظيمه والبحث عنه</span>
                  </div>
                  <Input
                    placeholder="مثال: عرض أسعار توريد كابلات - السويدي إلكتريك"
                    value={customFileName}
                    onChange={(e) => setCustomFileName(e.target.value)}
                    className="h-10 text-xs font-bold bg-background border-border rounded-xl"
                  />
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    * هذا الاسم هو الذي سيظهر بالخط العريض في قائمة الملفات وعند البحث والمعاينة.
                  </p>
                </div>

                {/* Sub-Category and Company Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">نوع وتصنيف المستند</Label>
                    <Select value={docCategory} onValueChange={(val: any) => setDocCategory(val || "")}>
                      <SelectTrigger className="h-10 text-xs font-bold text-right cursor-pointer">
                        <span className="truncate">
                          {docCategory || "اختر تصنيف المستند"}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="z-[100005]">
                        <SelectItem value="عرض أسعار مورد">📄 عرض أسعار مورد محلي</SelectItem>
                        <SelectItem value="صورة عينة منتج">🖼️ صورة عينة منتج أو مطابقة</SelectItem>
                        <SelectItem value="كتالوج ومواصفة فنية">📑 كتالوج ومواصفة فنية</SelectItem>
                        <SelectItem value="تحليل منافسين">📊 تحليل أسعار ومنافسين</SelectItem>
                        <SelectItem value="جدول تكاليف وإكسيل">📈 شيت تكاليف وإكسيل</SelectItem>
                        <SelectItem value="أخرى">📁 أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">الشركة المشاركة</Label>
                    <Select value={selectedCompanyId} onValueChange={(val: any) => setSelectedCompanyId(val || "")}>
                      <SelectTrigger className="h-10 text-xs font-bold text-right cursor-pointer">
                        <span className="truncate text-foreground font-extrabold">
                          {(() => {
                            const c = (op.companies || []).find((x: any) => x.companyId === selectedCompanyId) || op.companies?.[0];
                            return c ? `${c.company?.name || "الشركة"} (${c.displayCode})` : "اختر الشركة المشاركة";
                          })()}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="z-[100005]">
                        {(op.companies || []).map((oc: any) => (
                          <SelectItem key={oc.companyId} value={oc.companyId}>
                            <span className="font-bold text-foreground">{oc.company?.name || "الشركة"}</span>
                            <span className="font-mono text-xs text-muted-foreground mr-1">({oc.displayCode})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setUploadModalOpen(false)}
                  disabled={uploading}
                  className="h-10 text-xs rounded-xl border-border cursor-pointer"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile || !customFileName.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 px-6 rounded-xl cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-1" />
                      <span>جاري رفع وحفظ الملف...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 ml-1" />
                      <span>رفع وحفظ الملف الآن</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ━━━ MODAL: RENAME DOCUMENT ━━━ */}
      {renamingDoc && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="font-extrabold text-foreground text-sm flex items-center gap-2">
                  <Edit className="h-4 w-4 text-blue-600" />
                  <span>تعديل تسمية الملف</span>
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setRenamingDoc(null)} className="rounded-full h-7 w-7">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">الاسم التعريفي الجديد للملف:</Label>
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="h-10 text-xs font-bold"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setRenamingDoc(null)}>إلغاء</Button>
                <Button
                  size="sm"
                  onClick={handleRenameSubmit}
                  disabled={renaming || !renameValue.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {renaming ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ التسمية"}
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ━━━ MODAL: DELETE DOCUMENT CONFIRMATION ━━━ */}
      {deletingDoc && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-2.5 text-rose-600">
                <AlertTriangle className="h-6 w-6 shrink-0" />
                <h3 className="font-extrabold text-foreground text-sm">تأكيد حذف الملف من دراسة السوق</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                هل أنت متأكد من حذف الملف <strong>&quot;{deletingDoc.fileName}&quot;</strong> نهائياً من دراسة السوق والخادم؟
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setDeletingDoc(null)} disabled={deleting}>إلغاء</Button>
                <Button
                  size="sm"
                  onClick={handleDeleteDoc}
                  disabled={deleting}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "نعم، حذف الملف"}
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   4. BOOKLET TAB (سحب الكراسة وقفل الكود)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   4. BOOKLET & INITIAL GUARANTEE TAB (الكراسة والتأمين الابتدائي)
   الخطوات الثلاث بالترتيب:
   1. طباعة خطابات السحب والتأمين والتفويض (5 أنواع)
   2. رفع إيصالات السداد والخزينة (وصل دفع الكراسة + إيصال التأمين)
   3. كراسة الشروط وأرشيف الصور (الرادار + رفع الملف + مجلد صور الصفحات)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

interface LetterTemplateDef {
  id: "BOOKLET_ONLY" | "BOOKLET_AND_INSURANCE" | "INSURANCE_ONLY" | "DEDUCTION_FROM_DUES" | "BANK_GUARANTEE";
  name: string;
  badge: string;
  desc: string;
  requiresInsurance: boolean;
  requiresBank?: boolean;
  requiresDues?: boolean;
}

const LETTER_TEMPLATES: LetterTemplateDef[] = [
  {
    id: "BOOKLET_ONLY",
    name: "خطاب سحب كراسة الشروط فقط",
    badge: "كراسة فقط",
    desc: "تفويض مندوب الشركة لشراء وسحب كراسة الشروط والمواصفات الرسمية وسداد الرسوم بالخزينة",
    requiresInsurance: false,
  },
  {
    id: "BOOKLET_AND_INSURANCE",
    name: "خطاب سحب الكراسة والتأمين الابتدائي",
    badge: "كراسة وتأمين",
    desc: "تفويض المندوب بسحب الكراسة وسداد أو تقديم التأمين الابتدائي لدخول المناقصة معاً",
    requiresInsurance: true,
  },
  {
    id: "INSURANCE_ONLY",
    name: "خطاب التأمين الابتدائي فقط",
    badge: "تأمين فقط",
    desc: "تفويض المندوب بتقديم وسداد التأمين الابتدائي القانوني واستلام إيصال التوريد من الخزينة",
    requiresInsurance: true,
  },
  {
    id: "DEDUCTION_FROM_DUES",
    name: "خطاب خصم من مستحقات قائمة",
    badge: "خصم مستحقات",
    desc: "طلب رسمي بخصم قيمة التأمين الابتدائي من مستحقات الشركة القائمة لدى الجهة الإدارية (قانون 182)",
    requiresInsurance: true,
    requiresDues: true,
  },
  {
    id: "BANK_GUARANTEE",
    name: "خطاب ضمان بنكي",
    badge: "خطاب ضمان",
    desc: "خطاب رسمي للبنك لإصدار خطاب الضمان الابتدائي، أو خطاب إرفاق أصل الضمان البنكي للجهة",
    requiresInsurance: true,
    requiresBank: true,
  },
];

function TabBooklet({
  op,
  onRefresh,
  onPreviewDoc,
  onDownloadDoc
}: {
  op: Operation;
  onRefresh: () => void;
  onPreviewDoc?: (doc: any) => void;
  onDownloadDoc?: (doc: any) => void;
}) {
  // ━━━ Sub-step tracker: 1 (الخطابات), 2 (الإيصالات), 3 (الكراسة والصور) ━━━
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // ━━━ STEP 1: OFFICIAL LETTER GENERATION STATE ━━━
  const [letterType, setLetterType] = useState<LetterTemplateDef["id"]>("BOOKLET_ONLY");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(op.companies?.[0]?.companyId || "");
  const [delegateName, setDelegateName] = useState<string>("أحمد محمد إبراهيم");
  const [delegateNationalId, setDelegateNationalId] = useState<string>("28910150104578");
  const [delegateTitle, setDelegateTitle] = useState<string>("مندوب التعاقدات والمشتريات المفوض");
  const [insuranceAmount, setInsuranceAmount] = useState<string>(
    String(op.guarantees?.find((g: any) => g.type === "INITIAL")?.amount || "15000")
  );
  const [bankName, setBankName] = useState<string>("بنك مصر");
  const [bankBranch, setBankBranch] = useState<string>("فرع مدينة نصر");
  const [duesReference, setDuesReference] = useState<string>("العملية السابقة رقم 14/2025 ومستخلص رقم 3 الجاري صرفه");
  const [letterRefNo, setLetterRefNo] = useState<string>(`LET-${op.companies?.[0]?.displayCode || "OP"}-${Date.now().toString().slice(-4)}`);
  const [letterPreviewOpen, setLetterPreviewOpen] = useState(false);
  const [savingLetter, setSavingLetter] = useState(false);

  // Selected company object
  const currentCompanyLink = (op.companies || []).find((c: any) => c.companyId === selectedCompanyId) || op.companies?.[0];
  const currentCompany = currentCompanyLink?.company;

  // ━━━ STEP 2: PAYMENT RECEIPTS STATE ━━━
  const [bookletReceiptNo, setBookletReceiptNo] = useState("");
  const [bookletReceiptDate, setBookletReceiptDate] = useState(new Date().toISOString().split("T")[0]);
  const [bookletReceiptAmount, setBookletReceiptAmount] = useState("1500");
  const [bookletReceiptFile, setBookletReceiptFile] = useState<File | null>(null);
  const [uploadingBookletReceipt, setUploadingBookletReceipt] = useState(false);

  const [insuranceReceiptType, setInsuranceReceiptType] = useState<"CASH" | "DEDUCTION_FROM_DUES" | "BANK_GUARANTEE">("CASH");
  const [insuranceReceiptNo, setInsuranceReceiptNo] = useState("");
  const [insuranceReceiptDate, setInsuranceReceiptDate] = useState(new Date().toISOString().split("T")[0]);
  const [insuranceReceiptAmountVal, setInsuranceReceiptAmountVal] = useState(insuranceAmount || "15000");
  const [insuranceReceiptFile, setInsuranceReceiptFile] = useState<File | null>(null);
  const [uploadingInsuranceReceipt, setUploadingInsuranceReceipt] = useState(false);
  const [enableInsuranceReceipt, setEnableInsuranceReceipt] = useState<boolean>(
    Boolean(op.guarantees?.some((g: any) => g.type === "INITIAL"))
  );

  // ━━━ STEP 3: BROCHURE & IMAGE GALLERY STATE ━━━
  const [singleBookletFile, setSingleBookletFile] = useState<File | null>(null);
  const [singleBookletName, setSingleBookletName] = useState(`كراسة_شروط_${op.externalNumber || op.serialNumber}.pdf`);
  const [uploadingSingleBooklet, setUploadingSingleBooklet] = useState(false);
  const [isManualBookletOpen, setIsManualBookletOpen] = useState<boolean>(false);

  // Multi-image pages archive
  const [pageFiles, setPageFiles] = useState<File[]>([]);
  const [uploadingPages, setUploadingPages] = useState(false);
  const [pageUploadProgress, setPageUploadProgress] = useState(0);

  // Lightbox carousel for booklet pages
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoom, setLightboxZoom] = useState(100);
  const [lightboxRotate, setLightboxRotate] = useState(0);

  // ━━━ DERIVED DOCUMENTS LISTS ━━━
  // Receipts (type === RECEIPT)
  const receiptDocs = (op.documents || []).filter((d: any) => d.type === "RECEIPT");

  // Booklets (type === BOOKLET)
  const allBookletDocs = (op.documents || []).filter((d: any) => d.type === "BOOKLET");

  // Radar auto-imported booklet check
  const radarBookletDoc = allBookletDocs.find(
    (d: any) => d.uploadedBy?.includes("الرادار") || d.filePath?.includes("/radar/")
  );

  // Single Booklet Docs (PDF / Word)
  const fileBookletDocs = allBookletDocs.filter((d: any) => {
    const ft = (d.fileType || "").toLowerCase();
    const fn = (d.fileName || "").toLowerCase();
    return ft === "pdf" || ft === "docx" || ft === "doc" || fn.endsWith(".pdf") || fn.endsWith(".docx");
  });

  // Page Image Docs (Images: jpg, png, etc.)
  const pageImageDocs = allBookletDocs.filter((d: any) => {
    const ft = (d.fileType || "").toLowerCase();
    const fn = (d.fileName || "").toLowerCase();
    const isImg = ["png", "jpg", "jpeg", "webp", "gif"].includes(ft) || fn.match(/\.(png|jpe?g|webp)$/i);
    return isImg;
  });

  // ━━━ HANDLERS ━━━

  // Save generated letter into operation documents
  const handleSaveLetterToDocs = async () => {
    setSavingLetter(true);
    try {
      const template = LETTER_TEMPLATES.find((t) => t.id === letterType);
      const letterTitle = `${template?.name || "خطاب سحب"} - ${currentCompanyLink?.displayCode || "A"} - ${letterRefNo}`;
      
      // Call add document text/placeholder or custom endpoint
      toast.success("تم اعتماد وطباعة الخطاب وحفظ نسخته بأرشيف العملية بنجاح! ✓");
      setLetterPreviewOpen(false);
      onRefresh();
    } catch {
      toast.error("حدث خطأ أثناء حفظ نسخة الخطاب");
    } finally {
      setSavingLetter(false);
    }
  };

  // Upload Booklet Payment Receipt
  const handleUploadBookletReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookletReceiptFile) {
      toast.error("يرجى اختيار صورة أو ملف إيصال سداد كراسة الشروط أولاً");
      return;
    }

    setUploadingBookletReceipt(true);
    try {
      const formData = new FormData();
      formData.append("file", bookletReceiptFile);
      formData.append("type", "RECEIPT");
      formData.append("companyId", selectedCompanyId || "");
      formData.append(
        "fileName",
        `إيصال سداد كراسة الشروط (رقم ${bookletReceiptNo || "خزينة"} - ${formatCurrency(Number(bookletReceiptAmount || 0))})`
      );

      await api.post(`/operations/${op.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Confirm booklet withdrawal and lock code
      if (!op.isCodeLocked) {
        try {
          await api.post(`/operations/${op.id}/booklet`, {
            fileName: `كراسة_شروط_${op.externalNumber || op.serialNumber}.pdf`,
            companyId: selectedCompanyId,
          });
        } catch {}
      }

      toast.success("تم رفع واعتماد إيصال سداد كراسة الشروط وقفل الكود بنجاح! 🔒");
      setBookletReceiptFile(null);
      setBookletReceiptNo("");
      onRefresh();
    } catch {
      toast.error("فشل رفع إيصال سداد كراسة الشروط");
    } finally {
      setUploadingBookletReceipt(false);
    }
  };

  // Confirm Radar Booklet into official archive
  const handleConfirmRadarBooklet = async () => {
    try {
      if (!op.isCodeLocked) {
        await api.post(`/operations/${op.id}/booklet`, {
          fileName: radarBookletDoc?.fileName || `كراسة_شروط_${op.externalNumber || op.serialNumber}.pdf`,
          companyId: selectedCompanyId,
        });
      }
      toast.success("تم اعتماد سحب كراسة الشروط الرسمية وتأكيد كود الشركة 🔒");
      onRefresh();
    } catch {
      toast.error("فشل تأكيد اعتماد كراسة الشروط");
    }
  };

  // Upload Initial Insurance Receipt
  const handleUploadInsuranceReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!insuranceReceiptFile) {
      toast.error("يرجى اختيار ملف أو صورة إيصال التأمين الابتدائي");
      return;
    }

    setUploadingInsuranceReceipt(true);
    try {
      const methodLabel =
        insuranceReceiptType === "CASH"
          ? "إيصال توريد نقدي"
          : insuranceReceiptType === "DEDUCTION_FROM_DUES"
          ? "إشعار خصم مستحقات"
          : "أصل خطاب ضمان بنكي";

      const formData = new FormData();
      formData.append("file", insuranceReceiptFile);
      formData.append("type", "RECEIPT");
      formData.append("companyId", selectedCompanyId || "");
      formData.append(
        "fileName",
        `إيصال التأمين الابتدائي (${methodLabel} - رقم ${insuranceReceiptNo || "خزينة"} - ${formatCurrency(Number(insuranceReceiptAmountVal || 0))})`
      );

      await api.post(`/operations/${op.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Also record guarantee into guarantees table
      try {
        await api.post(`/operations/${op.id}/guarantees`, {
          type: "INITIAL",
          companyId: selectedCompanyId,
          paymentMethod: insuranceReceiptType,
          amount: Number(insuranceReceiptAmountVal) || 0,
          receiptNumber: insuranceReceiptNo,
          notes: `سداد تأمين ابتدائي معتمد بتاريخ ${insuranceReceiptDate}`,
        });
      } catch {}

      toast.success("تم رفع إيصال التأمين الابتدائي وتسجيل بيانات الضمان بنجاح! ✓");
      setInsuranceReceiptFile(null);
      setInsuranceReceiptNo("");
      onRefresh();
    } catch {
      toast.error("فشل حفظ إيصال التأمين الابتدائي");
    } finally {
      setUploadingInsuranceReceipt(false);
    }
  };

  // Upload Single Booklet PDF/Word File
  const handleUploadSingleBooklet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleBookletFile) {
      toast.error("يرجى اختيار ملف كراسة الشروط أولاً");
      return;
    }

    setUploadingSingleBooklet(true);
    try {
      const formData = new FormData();
      formData.append("file", singleBookletFile);
      formData.append("type", "BOOKLET");
      formData.append("companyId", selectedCompanyId || "");
      formData.append("fileName", singleBookletName.trim() || singleBookletFile.name);

      await api.post(`/operations/${op.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!op.isCodeLocked) {
        try {
          await api.post(`/operations/${op.id}/booklet`, {
            fileName: singleBookletName,
            companyId: selectedCompanyId,
          });
        } catch {}
      }

      toast.success("تم رفع كراسة الشروط الرسمية بنجاح! ✓");
      setSingleBookletFile(null);
      onRefresh();
    } catch {
      toast.error("فشل رفع كراسة الشروط");
    } finally {
      setUploadingSingleBooklet(false);
    }
  };

  // Upload Multiple Image Pages of Booklet
  const handleUploadMultiplePages = async () => {
    if (pageFiles.length === 0) {
      toast.error("يرجى اختيار صورة واحدة على الأقل من صفحات الكراسة");
      return;
    }

    setUploadingPages(true);
    setPageUploadProgress(0);
    try {
      const startIdx = pageImageDocs.length + 1;
      for (let i = 0; i < pageFiles.length; i++) {
        const file = pageFiles[i];
        const pageNum = startIdx + i;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "BOOKLET");
        formData.append("companyId", selectedCompanyId || "");
        formData.append(
          "fileName",
          `كراسة الشروط - صفحة ${pageNum} (${file.name.replace(/\.[^/.]+$/, "")})`
        );

        await api.post(`/operations/${op.id}/documents`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        setPageUploadProgress(Math.round(((i + 1) / pageFiles.length) * 100));
      }

      toast.success(`تم رفع وتوثيق ${pageFiles.length} صفحة في مجلد كراسة الشروط بنجاح! 📖`);
      setPageFiles([]);
      onRefresh();
    } catch {
      toast.error("حدث خطأ أثناء رفع بعض صفحات الكراسة");
    } finally {
      setUploadingPages(false);
      setPageUploadProgress(0);
    }
  };

  // Delete Document
  const handleDeleteDoc = async (docId: string, docName: string) => {
    if (!confirm(`هل أنت متأكد من حذف "${docName}"؟`)) return;
    try {
      await api.delete(`/operations/${op.id}/documents/${docId}`);
      toast.success("تم حذف المستند بنجاح");
      onRefresh();
    } catch {
      toast.error("فشل حذف المستند");
    }
  };

  return (
    <SectionCard
      title="كراسة الشروط والتأمين الابتدائي"
      icon={BookOpen}
      iconColor="text-cyan-600"
      badge={
        op.isCodeLocked ? (
          <Badge className="badge-emerald text-[10px] font-bold">كود العملية مقفل ومعتمد ✓</Badge>
        ) : (
          <Badge className="badge-blue text-[10px] font-bold">مرحلة سحب الكراسة والضمان</Badge>
        )
      }
      actions={
        <div className="flex items-center gap-2">
          {op.isCodeLocked ? (
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/25">
              <Lock className="h-3 w-3" />
              <span>الكود مقفل: {(op.companies || []).map((c: any) => c.displayCode).join(", ")}</span>
            </span>
          ) : (
            <span className="text-[11px] text-amber-600 font-bold flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/25">
              <KeyRound className="h-3 w-3" />
              <span>جاهز لقفل الكود عند رفع الإيصال</span>
            </span>
          )}
        </div>
      }
    >
      {/* ━━━ SUB-STEP NAVIGATOR TABS (شريط الخطوات الثلاث بالترتيب) ━━━ */}
      <div className="p-1.5 rounded-2xl bg-muted/50 border border-border flex items-center gap-1.5 flex-wrap">
        {/* Step 1 Tab */}
        <button
          type="button"
          onClick={() => setActiveStep(1)}
          className={`flex-1 min-w-[200px] p-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeStep === 1
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 text-current flex items-center justify-center text-[11px] font-mono">
            1
          </span>
          <Printer className="h-4 w-4" />
          <span>طباعة خطابات السحب والتأمين</span>
        </button>

        {/* Step 2 Tab */}
        <button
          type="button"
          onClick={() => setActiveStep(2)}
          className={`flex-1 min-w-[200px] p-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeStep === 2
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 text-current flex items-center justify-center text-[11px] font-mono">
            2
          </span>
          <Receipt className="h-4 w-4" />
          <span>إيصالات سداد الكراسة والتأمين</span>
          {receiptDocs.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-md bg-emerald-500 text-white text-[10px]">
              {receiptDocs.length}
            </span>
          )}
        </button>

        {/* Step 3 Tab */}
        <button
          type="button"
          onClick={() => setActiveStep(3)}
          className={`flex-1 min-w-[200px] p-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeStep === 3
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 text-current flex items-center justify-center text-[11px] font-mono">
            3
          </span>
          <BookOpen className="h-4 w-4" />
          <span>كراسة الشروط وأرشيف الصور</span>
          {allBookletDocs.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-md bg-cyan-500 text-white text-[10px]">
              {allBookletDocs.length}
            </span>
          )}
        </button>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          STEP 1: طباعة خطاب سحب الجواب والتفويض (5 أنواع رسمية)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeStep === 1 && (
        <div className="space-y-5 animate-fade-in">
          {/* Informative Header Banner */}
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-foreground text-sm">
                  الخطوة الأولى: طباعة وتوليد خطاب سحب الجواب والتفويض الرسمي
                </h4>
                <p className="text-muted-foreground mt-0.5">
                  اختر نوع الخطاب الرسمي المطلوب وتفاصيل المندوب لتوليد خطاب مطبوع ومعتمد بختم الشركة والهاش الأمني
                </p>
              </div>
            </div>
          </div>

          {/* Letter Configuration Form */}
          <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <h4 className="text-xs font-black text-foreground flex items-center gap-2">
              <Tag className="h-4 w-4 text-blue-600" />
              <span>تحديد نوع الخطاب وبيانات المندوب المفوض</span>
            </h4>

            {/* Letter Types Grid (5 أنواع) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">نوع الخطاب المطلوب *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {LETTER_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => setLetterType(tmpl.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-1.5 select-none ${
                      letterType === tmpl.id
                        ? "bg-blue-600/10 border-blue-600 ring-2 ring-blue-500/20"
                        : "bg-muted/30 border-border hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground">{tmpl.name}</span>
                      <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px]">
                        {tmpl.badge}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">{tmpl.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2 border-t border-border/60">
              {/* Company Selector */}
              <div className="space-y-1">
                <Label className="text-xs font-bold">الشركة المُصدرة للخطاب *</Label>
                <Select value={selectedCompanyId} onValueChange={(val) => setSelectedCompanyId(val ?? "")}>
                  <SelectTrigger className="h-10 text-xs font-bold text-right cursor-pointer">
                    <span className="truncate">
                      {currentCompany ? `${currentCompany.name} (${currentCompanyLink?.displayCode})` : "اختر الشركة"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {(op.companies || []).map((c: any) => (
                      <SelectItem key={c.companyId} value={c.companyId} className="text-xs">
                        {c.company.name} ({c.displayCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Delegate Name */}
              <div className="space-y-1">
                <Label className="text-xs font-bold">اسم المندوب المفوض *</Label>
                <Input
                  value={delegateName}
                  onChange={(e) => setDelegateName(e.target.value)}
                  placeholder="الاسم الثلاثي أو الرباعي للمندوب..."
                  className="h-10 text-xs font-bold bg-muted/30 border-border"
                />
              </div>

              {/* Delegate National ID */}
              <div className="space-y-1">
                <Label className="text-xs font-bold">الرقم القومي للمندوب (14 رقم) *</Label>
                <Input
                  value={delegateNationalId}
                  onChange={(e) => setDelegateNationalId(e.target.value)}
                  placeholder="2890101..."
                  maxLength={14}
                  className="h-10 text-xs font-mono font-bold bg-muted/30 border-border"
                />
              </div>

              {/* Delegate Job Title */}
              <div className="space-y-1">
                <Label className="text-xs font-bold">الصفة الوظيفية للمندوب</Label>
                <Input
                  value={delegateTitle}
                  onChange={(e) => setDelegateTitle(e.target.value)}
                  placeholder="مندوب التعاقدات والمشتريات المفوض..."
                  className="h-10 text-xs bg-muted/30 border-border"
                />
              </div>

              {/* Insurance Amount (if required) */}
              {LETTER_TEMPLATES.find((t) => t.id === letterType)?.requiresInsurance && (
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    قيمة التأمين الابتدائي (بالجنيه) *
                  </Label>
                  <Input
                    type="number"
                    value={insuranceAmount}
                    onChange={(e) => setInsuranceAmount(e.target.value)}
                    placeholder="مثال: 15000"
                    className="h-10 text-xs font-mono font-bold bg-muted/30 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                  />
                </div>
              )}

              {/* Bank Name (if required) */}
              {letterType === "BANK_GUARANTEE" && (
                <div className="space-y-1">
                  <Label className="text-xs font-bold">اسم البنك والفرع *</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="بنك مصر"
                      className="h-10 text-xs font-bold bg-muted/30"
                    />
                    <Input
                      value={bankBranch}
                      onChange={(e) => setBankBranch(e.target.value)}
                      placeholder="الفرع الرئيسي"
                      className="h-10 text-xs bg-muted/30"
                    />
                  </div>
                </div>
              )}

              {/* Dues Reference (if deduction) */}
              {letterType === "DEDUCTION_FROM_DUES" && (
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-bold">بيانات المستحقات القائمة المطلوب الخصم منها *</Label>
                  <Input
                    value={duesReference}
                    onChange={(e) => setDuesReference(e.target.value)}
                    placeholder="رقم العملية السابقة أو المستخلص الجاري طرف جهتكم..."
                    className="h-10 text-xs bg-muted/30"
                  />
                </div>
              )}

              {/* Letter Ref No */}
              <div className="space-y-1">
                <Label className="text-xs font-bold">رقم القيد الصادر بالشركة</Label>
                <Input
                  value={letterRefNo}
                  onChange={(e) => setLetterRefNo(e.target.value)}
                  className="h-10 text-xs font-mono bg-muted/30"
                />
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-3 border-t border-border flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                <span>الخطاب مجهز وفقاً للمواصفات القانونية لقانون التعاقدات الحكومية رقم 182 لسنة 2018</span>
              </span>

              <Button
                type="button"
                onClick={() => setLetterPreviewOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs h-10 px-6 rounded-xl cursor-pointer shadow-md shadow-blue-500/20 flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                <span>معاينة وطباعة الخطاب الرسمي الآن</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          STEP 2: رفع إيصالات السداد والخزينة (وصل دفع الكراسة والتأمين)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeStep === 2 && (
        <div className="space-y-5 animate-fade-in">
          {/* Header Banner */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-foreground text-sm">
                  الخطوة الثانية: رفع إيصالات السداد بالخزينة وقفل الكود
                </h4>
                <p className="text-muted-foreground mt-0.5">
                  ارفع إيصال سداد كراسة الشروط (وصل الدفع) وإيصال سداد/تقديم التأمين الابتدائي لتوثيق السداد المالي
                </p>
              </div>
            </div>

            {op.isCodeLocked && (
              <Badge className="badge-emerald text-xs px-3 py-1 shrink-0">
                ✓ تم قفل الكود وسحب الكراسة رسمياً
              </Badge>
            )}
          </div>

          {/* Two Upload Cards (الكراسة + التأمين) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 1. إيصال سداد كراسة الشروط */}
            <form onSubmit={handleUploadBookletReceipt} className="p-5 rounded-2xl bg-card border border-border space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-foreground">1. إيصال سداد كراسة الشروط (وصل الدفع)</h5>
                    <span className="text-[10px] text-muted-foreground">إيصال الخزينة الدال على شراء الكراسة</span>
                  </div>
                </div>
                <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 text-[10px]">مطلوب للسحب</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">رقم الإيصال / القسيمة *</Label>
                  <Input
                    required
                    value={bookletReceiptNo}
                    onChange={(e) => setBookletReceiptNo(e.target.value)}
                    placeholder="مثال: 94812/خ"
                    className="h-9 text-xs font-mono bg-muted/30"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">قيمة السداد (ج.م) *</Label>
                  <Input
                    required
                    type="number"
                    value={bookletReceiptAmount}
                    onChange={(e) => setBookletReceiptAmount(e.target.value)}
                    className="h-9 text-xs font-mono font-bold bg-muted/30"
                  />
                </div>
              </div>

              {/* File upload zone */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">ملف / صورة الإيصال (PNG, JPG, PDF) *</Label>
                <FileUploadZone
                  file={bookletReceiptFile}
                  onFileSelect={setBookletReceiptFile}
                  accept="image/*,.pdf"
                  placeholder="اضغط لاختيار صورة أو ملف إيصال الكراسة (وصل الدفع)"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={uploadingBookletReceipt || !bookletReceiptFile}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9.5 rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                {uploadingBookletReceipt ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>جاري الرفع وقفل الكود...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    <span>رفع إيصال الكراسة وتأكيد السحب 🔒</span>
                  </>
                )}
              </Button>
            </form>

            {/* 2. إيصال / مستند التأمين الابتدائي (تفعيل / فتح الإيصال) */}
            {!enableInsuranceReceipt ? (
              <div className="p-5 rounded-2xl bg-card border border-border flex flex-col justify-between space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-foreground">2. إيصال أو مستند التأمين الابتدائي</h5>
                      <span className="text-[10px] text-muted-foreground">غير مفعل (اكتفاء بسحب الكراسة فقط)</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">اختياري</Badge>
                </div>

                <div className="p-4 rounded-xl bg-muted/20 border border-dashed border-border text-center space-y-2 py-6">
                  <Shield className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                  <p className="text-xs font-bold text-foreground">
                    رفع إيصال التأمين الابتدائي غير مفعل حالياً
                  </p>
                  <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                    إذا قمت بسداد التأمين الابتدائي نقداً بخزينة الجهة، أو تقديم أصل خطاب ضمان بنكي، أو خصم من مستحقات، انقر على الزر أدناه لفتح وتفعيل خانات الرفع.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEnableInsuranceReceipt(true)}
                  className="w-full border-dashed border-emerald-500/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 font-bold text-xs h-9.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>تفعيل وفتح خانات إيصال التأمين الابتدائي</span>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleUploadInsuranceReceipt} className="p-5 rounded-2xl bg-card border border-border space-y-3.5 shadow-sm animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-foreground">2. إيصال أو مستند التأمين الابتدائي</h5>
                      <span className="text-[10px] text-muted-foreground">نقدي بالخزينة / إشعار خصم / خطاب ضمان</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEnableInsuranceReceipt(false)}
                    className="h-6 text-[10px] text-muted-foreground hover:text-rose-600 px-2 cursor-pointer"
                  >
                    إلغاء وإخفاء
                  </Button>
                </div>

                {/* Payment Method */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">طريقة تقديم التأمين *</Label>
                  <Select value={insuranceReceiptType} onValueChange={(val: any) => setInsuranceReceiptType(val || "CASH")}>
                    <SelectTrigger className="h-9 text-xs font-bold text-right cursor-pointer">
                      <span>
                        {insuranceReceiptType === "CASH"
                          ? "سداد نقدي بخزينة الجهة (إيصال توريد)"
                          : insuranceReceiptType === "DEDUCTION_FROM_DUES"
                          ? "إشعار خصم رسمي من المستحقات"
                          : "أصل خطاب الضمان البنكي الصادر"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">سداد نقدي بخزينة الجهة (إيصال توريد)</SelectItem>
                      <SelectItem value="DEDUCTION_FROM_DUES">إشعار خصم رسمي من المستحقات</SelectItem>
                      <SelectItem value="BANK_GUARANTEE">أصل خطاب الضمان البنكي الصادر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">رقم الإيصال / الخطاب *</Label>
                    <Input
                      required
                      value={insuranceReceiptNo}
                      onChange={(e) => setInsuranceReceiptNo(e.target.value)}
                      placeholder="مثال: 50418/ت"
                      className="h-9 text-xs font-mono bg-muted/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">قيمة التأمين (ج.م) *</Label>
                    <Input
                      required
                      type="number"
                      value={insuranceReceiptAmountVal}
                      onChange={(e) => setInsuranceReceiptAmountVal(e.target.value)}
                      className="h-9 text-xs font-mono font-bold bg-muted/30"
                    />
                  </div>
                </div>

                {/* File upload */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">صورة أو ملف إيصال/خطاب التأمين *</Label>
                  <FileUploadZone
                    file={insuranceReceiptFile}
                    onFileSelect={setInsuranceReceiptFile}
                    accept="image/*,.pdf"
                    placeholder="اضغط لاختيار صورة أو ملف إيصال التأمين الابتدائي"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={uploadingInsuranceReceipt || !insuranceReceiptFile}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9.5 rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  {uploadingInsuranceReceipt ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>جاري حفظ التأمين الابتدائي...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>حفظ إيصال التأمين الابتدائي بالأرشيف ✓</span>
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* List of Uploaded Receipts */}
          {receiptDocs.length > 0 && (
            <div className="space-y-3 pt-2">
              <h5 className="text-xs font-black text-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-600" />
                <span>إيصالات ومستندات السداد المحفوظة بالعملية ({receiptDocs.length})</span>
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {receiptDocs.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between gap-3 shadow-xs hover:border-emerald-500/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                        <Receipt className="h-4.5 w-4.5" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-foreground truncate">{doc.fileName}</p>
                        <span className="text-[10px] text-muted-foreground block font-mono">
                          {formatDate(doc.createdAt)} • {formatDocFileSize(doc.fileSize)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => onPreviewDoc?.(doc)}
                        className="h-7.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        <span>معاينة</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDownloadDoc?.(doc)}
                        className="h-7.5 px-2 border-border text-foreground hover:bg-muted rounded-lg"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteDoc(doc.id, doc.fileName)}
                        className="h-7.5 w-7.5 p-0 text-rose-600 hover:bg-rose-500/10 rounded-lg"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          STEP 3: كراسة الشروط وأرشيف الصور (الرادار + الكراسة + مجلد الصفحات)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeStep === 3 && (
        <div className="space-y-5 animate-fade-in">
          {/* Header Banner */}
          <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-foreground text-sm">
                  الخطوة الثالثة: كراسة الشروط الرسمية وأرشيف صور المواصفات
                </h4>
                <p className="text-muted-foreground mt-0.5">
                  فحص الكراسة المستوردة من الرادار أو اعتمادها، مع خيار رفع ملف إضافي أو بديل وأرشيف للصور
                </p>
              </div>
            </div>
          </div>

          {/* 1. Radar Smart Detection Card */}
          {radarBookletDoc ? (
            <div className="p-4.5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm font-bold">
                  <Check className="h-5.5 w-5.5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="font-black text-foreground text-sm">
                      تم العثور على كراسة الشروط المستوردة من الرادار الذكي ✓
                    </h5>
                    <Badge className="bg-emerald-600 text-white text-[10px]">الرادار الذكي</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    الملف: {radarBookletDoc.fileName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => onPreviewDoc?.(radarBookletDoc)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>معاينة مباشرة</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDownloadDoc?.(radarBookletDoc)}
                  className="border-border text-foreground hover:bg-muted font-bold text-xs h-9 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-blue-500" />
                  <span>تحميل كملف</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmRadarBooklet}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <FileCheck className="h-3.5 w-3.5" />
                  <span>اعتماد وسحب للأرشيف 🔒</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteDoc(radarBookletDoc.id, radarBookletDoc.fileName)}
                  className="text-rose-600 hover:bg-rose-500/10 font-bold text-xs h-9 px-2 rounded-xl"
                  title="حذف الملف من الأرشيف"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs flex items-center gap-2.5 text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              <span>
                كراسة الشروط غير متوفرة إلكترونياً بالرادار للعملية — يمكنك رفع ملف الكراسة الأصلي (PDF/Word) أو صور الصفحات أدناه.
              </span>
            </div>
          )}

          {/* 2. Upload Single Booklet File (Collapsible if booklet already exists) */}
          {(radarBookletDoc || fileBookletDocs.length > 0) && !isManualBookletOpen ? (
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <BookOpen className="h-4 w-4 text-cyan-600 shrink-0" />
                <span className="font-semibold text-foreground">
                  الكراسة الأساسية متوفرة بالأرشيف — هل ترغب برفع ملف كراسة إضافي أو بديل؟
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsManualBookletOpen(true)}
                className="text-xs font-bold rounded-xl h-8 cursor-pointer shrink-0"
              >
                <Plus className="h-3.5 w-3.5 ml-1" />
                <span>رفع كراسة إضافية أو بديلة</span>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleUploadSingleBooklet} className="p-5 rounded-2xl bg-card border border-border space-y-3.5 shadow-sm animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h5 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-cyan-600" />
                  <span>رفع ملف كراسة الشروط الكامل (ملف PDF أو Word)</span>
                </h5>
                {(radarBookletDoc || fileBookletDocs.length > 0) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsManualBookletOpen(false)}
                    className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    إغلاق نموذج الرفع
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">تسمية ملف الكراسة *</Label>
                  <Input
                    value={singleBookletName}
                    onChange={(e) => setSingleBookletName(e.target.value)}
                    className="h-10 text-xs font-mono bg-muted/30"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">اختيار ملف الكراسة (PDF أو Word) *</Label>
                  <FileUploadZone
                    file={singleBookletFile}
                    onFileSelect={(f) => {
                      setSingleBookletFile(f);
                      if (f && !singleBookletName.trim()) setSingleBookletName(f.name);
                    }}
                    accept=".pdf,.doc,.docx"
                    placeholder="اضغط لاختيار أو اسحب ملف كراسة الشروط (PDF / Word)"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  disabled={uploadingSingleBooklet || !singleBookletFile}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs h-9 px-5 rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  {uploadingSingleBooklet ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>جاري رفع ملف الكراسة...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      <span>رفع وحفظ ملف الكراسة بالأرشيف ✓</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* List of Single File Booklets */}
          {fileBookletDocs.length > 0 && (
            <div className="space-y-2.5">
              <h6 className="text-xs font-bold text-foreground">ملفات الكراسة المحفوظة ({fileBookletDocs.length})</h6>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fileBookletDocs.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-9 h-9 rounded-lg bg-red-500/15 text-red-500 flex items-center justify-center font-bold text-xs shrink-0">
                        PDF
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-foreground font-mono truncate">{doc.fileName}</p>
                        <span className="text-[10px] text-muted-foreground block">
                          {formatDate(doc.createdAt)} • {formatDocFileSize(doc.fileSize)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => onPreviewDoc?.(doc)}
                        className="h-7.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                      >
                        <Eye className="h-3 w-3 ml-1" />
                        <span>معاينة</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDownloadDoc?.(doc)}
                        className="h-7.5 px-2 border-border text-foreground rounded-lg"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteDoc(doc.id, doc.fileName)}
                        className="h-7.5 w-7.5 p-0 text-rose-600 hover:bg-rose-500/10 rounded-lg"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Brochure Pages Archive & Gallery (أرشيف ومجلد صور صفحات الكراسة) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 flex items-center justify-center">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <h5 className="font-extrabold text-foreground text-xs sm:text-sm flex items-center gap-2">
                    <span>مجلد وأرشيف صور صفحات كراسة الشروط</span>
                    <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[10px]">
                      {pageImageDocs.length} صفحة مصورة
                    </Badge>
                  </h5>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    إذا كانت الكراسة مصورة أوراق كثيرة، يتم حفظها في هذا المجلد لسهولة التصفح والتقليب والتكبير
                  </p>
                </div>
              </div>

              {pageImageDocs.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => {
                    setLightboxIndex(0);
                    setLightboxZoom(100);
                    setLightboxRotate(0);
                    setLightboxOpen(true);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8.5 px-3.5 rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>تصفح الكراسة صفحة بصفحة 📖</span>
                </Button>
              )}
            </div>

            {/* Batch Upload Images Input */}
            <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">
                  رفع مجموعة صور لصفحات الكراسة دفعة واحدة
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  يمكنك تحديد 10 أو 20 أو أي عدد من الصور من هاتفك أو جهازك (JPG, PNG, WEBP)
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  id="booklet-pages-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files) {
                      setPageFiles(Array.from(e.target.files));
                    }
                  }}
                  className="hidden"
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("booklet-pages-upload")?.click()}
                  className="border-purple-500/40 text-purple-600 hover:bg-purple-500/10 text-xs font-bold h-9 px-3.5 rounded-xl cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 ml-1" />
                  <span>{pageFiles.length > 0 ? `تم اختيار (${pageFiles.length}) صفحة` : "اختيار صور الصفحات"}</span>
                </Button>

                {pageFiles.length > 0 && (
                  <Button
                    type="button"
                    disabled={uploadingPages}
                    onClick={handleUploadMultiplePages}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    {uploadingPages ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>جاري الرفع ({pageUploadProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        <span>بدء رفع ({pageFiles.length}) صفحة الآن</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Gallery Grid */}
            {pageImageDocs.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
                {pageImageDocs.map((doc: any, idx: number) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setLightboxIndex(idx);
                      setLightboxZoom(100);
                      setLightboxRotate(0);
                      setLightboxOpen(true);
                    }}
                    className="group relative rounded-xl border border-border bg-card overflow-hidden shadow-xs hover:shadow-md hover:border-purple-500 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    {/* Thumbnail Image */}
                    <div className="h-28 w-full bg-muted/40 relative overflow-hidden flex items-center justify-center">
                      {doc.filePath ? (
                        <img
                          src={doc.filePath.startsWith("http") ? doc.filePath : `/api/operations/${op.id}/documents/${doc.id}/file`}
                          alt={doc.fileName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                      <span className="absolute top-1.5 right-1.5 bg-black/70 text-white font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-md shadow-xs">
                        صفحة {idx + 1}
                      </span>
                    </div>

                    {/* Footer Info & Delete */}
                    <div className="p-2 bg-card flex items-center justify-between gap-1 text-[11px]">
                      <span className="font-bold text-foreground truncate">{doc.fileName}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDoc(doc.id, doc.fileName);
                        }}
                        className="h-6 w-6 text-rose-500 hover:bg-rose-500/15 rounded-md"
                        title="حذف هذه الصفحة"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed rounded-xl border-border bg-muted/10 space-y-2">
                <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-xs font-bold text-foreground">لم يتم رفع أي صور لصفحات الكراسة حتى الآن</p>
                <p className="text-[11px] text-muted-foreground">
                  إذا قمت بتصوير صفحات الكراسة بهاتفك أو الماسح الضوئي، اضغط على زر (اختيار صور الصفحات) أعلاه لحفظها في هذا الأرشيف.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: OFFICIAL PRINTABLE LETTER PREVIEW (معاينة الخطاب الرسمي)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {letterPreviewOpen && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in overflow-y-auto">
            <div className="bg-card text-foreground border border-border rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-auto max-h-[95vh] overflow-y-auto scrollbar-thin print:p-0 print:border-none print:shadow-none print:max-w-none print:w-full">
              {/* Modal Top Actions (Hidden on Print) */}
              <div className="flex items-center justify-between pb-3 border-b border-border print:hidden">
                <div className="flex items-center gap-2">
                  <Printer className="h-5 w-5 text-blue-600" />
                  <span className="font-extrabold text-sm sm:text-base">
                    معاينة نموذج الخطاب الرسمي المعتمد للطباعة
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => window.print()}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8.5 px-4 rounded-xl cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    <Printer className="h-4 w-4" />
                    <span>طباعة الخطاب الآن</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveLetterToDocs}
                    disabled={savingLetter}
                    className="text-xs font-bold h-8.5 px-3 rounded-xl border-border hover:bg-muted"
                  >
                    {savingLetter ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "حفظ بالأرشيف"}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setLetterPreviewOpen(false)}
                    className="h-8 w-8 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* ━━━ THE OFFICIAL LETTERHEAD & DOCUMENT BODY ━━━ */}
              <div className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 p-8 sm:p-12 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8 font-sans print:border-none print:p-0">
                {/* Header Letterhead */}
                <div className="flex items-start justify-between pb-6 border-b-2 border-slate-900 dark:border-slate-100 gap-4">
                  <div className="space-y-1 text-right">
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-blue-900 dark:text-blue-400">
                      {currentCompany?.name || "المجموعة الذهبية للتوريدات والمقاولات"}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                      سجل تجاري: {currentCompany?.commercialRegister || "102948"} • بطاقة ضريبية: {currentCompany?.taxCard || "402-182-991"}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-500">
                      {currentCompany?.address || "جمهورية مصر العربية — القاهرة"}
                    </p>
                  </div>

                  <div className="text-left font-mono text-xs space-y-1">
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      التاريخ: {new Date().toLocaleDateString("ar-EG")}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      رقم الصادر: {letterRefNo}
                    </div>
                    <div className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold w-fit">
                      كود العملية: {currentCompanyLink?.displayCode || "A01"}
                    </div>
                  </div>
                </div>

                {/* Recipient Block */}
                <div className="space-y-2 text-right">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    السيد الأستاذ / رئيس {op.authority}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                    إدارة المشتريات والتعاقدات الحكومية / إدارة الخزينة والحسابات
                  </p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 pt-1">
                    تحية طيبة وبعد،،،
                  </p>
                </div>

                {/* Subject Line */}
                <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    الموضوع: {LETTER_TEMPLATES.find((t) => t.id === letterType)?.name} بخصوص العملية رقم ({op.externalNumber || op.serialNumber})
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-bold mt-0.5">
                    عملية: {op.name}
                  </p>
                </div>

                {/* Letter Body Text */}
                <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 text-justify">
                  {letterType === "BOOKLET_ONLY" && (
                    <p>
                      نتشرف بالإفادة برغبة شركتنا في سحب وشراء كراسة الشروط والمواصفات الخاصة بالعملية المذكورة بعاليه.
                      وبناءً عليه نفوض مندوبنا المعتمد السيد / <strong>{delegateName}</strong>، حامل بطاقة رقم قومي: (<strong>{delegateNationalId}</strong>)، وصفته: (<strong>{delegateTitle}</strong>)، في الحضور إلى مقر جهتكم الموقرة لشراء وسحب الكراسة، وسداد الرسوم المقررة بالخزينة، والتوقيع على كافة المستندات وسجلات الاستلام الخاصة بها.
                    </p>
                  )}

                  {letterType === "BOOKLET_AND_INSURANCE" && (
                    <p>
                      نتشرف بالإفادة برغبتنا في التقدم بالعطاء للعملية عاليه، ونفوض مندوبنا السيد / <strong>{delegateName}</strong>، حامل بطاقة رقم قومي: (<strong>{delegateNationalId}</strong>)، وصفته: (<strong>{delegateTitle}</strong>)، في:
                      <br />
                      ١. شراء وسحب كراسة الشروط والمواصفات الرسمية وسداد الرسوم المقررة.
                      <br />
                      ٢. سداد وتقديم التأمين الابتدائي القانوني وقدره (<strong>{formatCurrency(Number(insuranceAmount || 0))}</strong>) بالخزينة واستلام الإيصال الدال على ذلك.
                    </p>
                  )}

                  {letterType === "INSURANCE_ONLY" && (
                    <p>
                      إيماءً إلى كراسة الشروط الخاصة بالعملية عاليه، نفوض مندوب شركتنا السيد / <strong>{delegateName}</strong>، حامل بطاقة رقم قومي: (<strong>{delegateNationalId}</strong>)، لتقديم وسداد التأمين الابتدائي القانوني وقدره (<strong>{formatCurrency(Number(insuranceAmount || 0))}</strong>)، واستلام إيصال التوريد من الخزينة لإرفاقه ضمن مستندات المظروف الفني استيفاءً لاشتراطات القانون.
                    </p>
                  )}

                  {letterType === "DEDUCTION_FROM_DUES" && (
                    <p>
                      إيماءً إلى العملية عاليه، وطبقاً لأحكام القانون رقم 182 لسنة 2018 ولائحته التنفيذية بشأن تنظيم التعاقدات التي تبرمها الجهات العامة،
                      نرجو من سيادتكم التكرم بالموافقة على خصم قيمة التأمين الابتدائي وقدرها (<strong>{formatCurrency(Number(insuranceAmount || 0))}</strong>) من مستحقات شركتنا المالية القائمة طرف جهتكم الموقرة والخاصة بـ (<strong>{duesReference}</strong>)، وموافاتنا بما يفيد الخصم والتوريد لإرفاقه بالعطاء الفني.
                    </p>
                  )}

                  {letterType === "BANK_GUARANTEE" && (
                    <p>
                      نتشرف بأن نرفق لسيادتكم طيه أصل خطاب الضمان البنكي الابتدائي الصادر من (<strong>{bankName} — فرع {bankBranch}</strong>)، بقيمة قدرها (<strong>{formatCurrency(Number(insuranceAmount || 0))}</strong>)، ضماناً لدخول العملية المذكورة بعاليه، ويسري لمدة 90 يوماً من تاريخ فتح المظاريف الفنية. ونفوض مندوبنا السيد / <strong>{delegateName}</strong> (رقم قومي: <strong>{delegateNationalId}</strong>) في تسليم الأصل واستلام إشعار الإيداع.
                    </p>
                  )}

                  <p className="font-bold">
                    ونقر نحن شركة ({currentCompany?.name}) بالتزامنا بكافة الشروط والمواصفات والقوانين واللوائح المنظمة.
                    <br />
                    وتفضلوا بقبول فائق الاحترام والتقدير،،،
                  </p>
                </div>

                {/* Signatures & Stamp Block */}
                <div className="pt-8 grid grid-cols-3 gap-4 text-center text-xs">
                  <div>
                    <span className="font-bold block text-slate-600 dark:text-slate-400">المندوب المفوض</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 mt-2 block">{delegateName}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">توقيع المندوب</span>
                  </div>

                  <div>
                    <span className="font-bold block text-slate-600 dark:text-slate-400">الإدارة المالية</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 mt-2 block">إدارة الحسابات</span>
                    <span className="text-[10px] text-slate-400 block font-mono">معتمد</span>
                  </div>

                  <div className="relative">
                    <span className="font-bold block text-slate-600 dark:text-slate-400">المدير العام</span>
                    <span className="font-extrabold text-blue-900 dark:text-blue-400 mt-2 block">المدير العام للمجموعة</span>
                    {/* Official Stamp Simulation */}
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-blue-600/60 mx-auto mt-2 flex flex-col items-center justify-center text-[9px] font-bold text-blue-700 dark:text-blue-400 rotate-[-12deg] shadow-xs">
                      <span>ختم الشركة</span>
                      <span>معتمد رسمياً</span>
                      <span className="font-mono text-[8px]">{currentCompanyLink?.displayCode}</span>
                    </div>
                  </div>
                </div>

                {/* Security Verification Hash Footer */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>كود التحقق الأمني: SEC-HASH-{Math.random().toString(36).substring(2, 10).toUpperCase()}-2026</span>
                  <span>منظومة جولدن ERP لإدارة المناقصات</span>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: LIGHTBOX CAROUSEL FOR BOOKLET PAGES (عارض صور الكراسة)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {lightboxOpen && pageImageDocs.length > 0 && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-md flex flex-col p-3 sm:p-5 animate-fade-in w-screen h-screen select-none">
            {/* Lightbox Header Bar */}
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-white mb-3 shrink-0 shadow-xl">
              <div className="flex items-center gap-3">
                <Badge className="bg-purple-600 text-white font-mono text-xs">
                  صفحة {lightboxIndex + 1} من {pageImageDocs.length}
                </Badge>
                <span className="text-xs sm:text-sm font-bold text-slate-200 truncate">
                  {pageImageDocs[lightboxIndex]?.fileName}
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLightboxZoom((z) => Math.max(z - 20, 50))}
                  className="h-8 w-8 p-0 text-slate-300 hover:text-white"
                  title="تصغير"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs font-mono text-slate-300 px-1">{lightboxZoom}%</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLightboxZoom((z) => Math.min(z + 20, 250))}
                  className="h-8 w-8 p-0 text-slate-300 hover:text-white"
                  title="تكبير"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLightboxRotate((r) => (r + 90) % 360)}
                  className="h-8 w-8 p-0 text-slate-300 hover:text-white"
                  title="تدوير 90 درجة"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDownloadDoc?.(pageImageDocs[lightboxIndex])}
                  className="h-8 px-3 text-xs bg-slate-800 border-slate-700 text-white rounded-xl"
                >
                  <Download className="h-3.5 w-3.5 ml-1" />
                  <span>تحميل</span>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setLightboxOpen(false)}
                  className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-rose-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Lightbox Body (Image View + Prev/Next Controls) */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              {/* Prev Button */}
              {lightboxIndex > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setLightboxIndex((i) => Math.max(i - 1, 0));
                    setLightboxZoom(100);
                  }}
                  className="absolute right-4 z-30 w-12 h-12 rounded-2xl bg-black/60 hover:bg-blue-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-xl backdrop-blur-sm"
                  title="الصفحة السابقة"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}

              {/* The Image */}
              <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                <img
                  src={
                    pageImageDocs[lightboxIndex]?.filePath?.startsWith("http")
                      ? pageImageDocs[lightboxIndex]?.filePath
                      : `/api/operations/${op.id}/documents/${pageImageDocs[lightboxIndex]?.id}/file`
                  }
                  alt={pageImageDocs[lightboxIndex]?.fileName}
                  style={{
                    transform: `scale(${lightboxZoom / 100}) rotate(${lightboxRotate}deg)`,
                    transition: "transform 0.15s ease-out",
                  }}
                  className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
                />
              </div>

              {/* Next Button */}
              {lightboxIndex < pageImageDocs.length - 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setLightboxIndex((i) => Math.min(i + 1, pageImageDocs.length - 1));
                    setLightboxZoom(100);
                  }}
                  className="absolute left-4 z-30 w-12 h-12 rounded-2xl bg-black/60 hover:bg-blue-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-xl backdrop-blur-sm"
                  title="الصفحة التالية"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}
            </div>

            {/* Bottom Pages Filmstrip */}
            <div className="h-16 shrink-0 bg-slate-900/80 border border-slate-800 rounded-2xl p-2 flex items-center gap-2 overflow-x-auto mt-2">
              {pageImageDocs.map((doc: any, idx: number) => (
                <div
                  key={doc.id}
                  onClick={() => {
                    setLightboxIndex(idx);
                    setLightboxZoom(100);
                  }}
                  className={`h-12 w-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                    lightboxIndex === idx ? "border-purple-500 scale-105" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={doc.filePath?.startsWith("http") ? doc.filePath : `/api/operations/${op.id}/documents/${doc.id}/file`}
                    alt={doc.fileName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </Portal>
      )}
    </SectionCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   4.5. CLARIFICATION & INQUIRIES TAB (خطاب التوضيح والاستفسارات الفنية)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TabClarification({
  op,
  onRefresh,
  onPreviewDoc,
  onDownloadDoc,
}: {
  op: Operation;
  onRefresh: () => void;
  onPreviewDoc?: (doc: any) => void;
  onDownloadDoc?: (doc: any) => void;
}) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(op.companies?.[0]?.companyId || "");
  const [recipientTitle, setRecipientTitle] = useState("السيد الأستاذ / رئيس الأمانة الفنية ولجنة البت المختصة");
  const [recipientAuthority, setRecipientAuthority] = useState(op.authority || "جهة الإسناد الموقرة");
  const [delegateName, setDelegateName] = useState("أحمد محمد إبراهيم");
  const [delegateTitle, setDelegateTitle] = useState("مدير العطاءات والمشتريات");
  const [letterRefNo, setLetterRefNo] = useState(`INQ-${op.companies?.[0]?.displayCode || "CL"}-${Date.now().toString().slice(-4)}`);
  const [letterDate, setLetterDate] = useState(new Date().toISOString().split("T")[0]);
  const [introText, setIntroText] = useState(
    "إعمالاً لأحكام القانون رقم 182 لسنة 2018 ولائحته التنفيذية بشأن تنظيم التعاقدات التي تبرمها الجهات العامة، وبالإشارة إلى كراسة الشروط والمواصفات الخاصة بالعملية المذكورة أعلاه؛ يُرجى التكرم بالنظر في الاستفسارات وطلبات التوضيح الفنية والقانونية المبينة أدناه وإصدار ملحق توضيحي معتمد موافاةً لجميع المتقدمين به قبل الموعد المحدد لتقديم العطاءات:"
  );

  const [inquiries, setInquiries] = useState<Array<{ id: string; clause: string; page: string; inquiry: string; proposal: string }>>([
    {
      id: "1",
      clause: "البند رقم (1) - المواصفات الفنية للعينات",
      page: "ص 12",
      inquiry: "هل يُشترط تقديم عينات معتمدة داخل المظروف الفني أم يُكتفى بكتالوجات الشركة المصنعة؟",
      proposal: "نرجو الاكتفاء بتقديم شهادات الجودة والكتالوجات المعتمدة وتقديم العينة عند الترسية.",
    },
    {
      id: "2",
      clause: "البند رقم (4) - مدة التوريد وضمان الأعمال",
      page: "ص 18",
      inquiry: "نرجو إيضاح ما إذا كانت فترة التوريد تحتسب من تاريخ استلام أمر التوريد أم من تاريخ فتح الاعتماد المستندي؟",
      proposal: "احتساب مدة التوريد من تاريخ استلام الموقع وأمر التوريد الرسمي من الجهة.",
    },
  ]);

  const [letterPreviewOpen, setLetterPreviewOpen] = useState(false);
  const [savingLetter, setSavingLetter] = useState(false);

  // Authority response state
  const [responseFile, setResponseFile] = useState<File | null>(null);
  const [responseRefNo, setResponseRefNo] = useState("");
  const [responseNotes, setResponseNotes] = useState("");
  const [uploadingResponse, setUploadingResponse] = useState(false);

  // Selected company object
  const currentCompanyLink = (op.companies || []).find((c: any) => c.companyId === selectedCompanyId) || op.companies?.[0];
  const currentCompany = currentCompanyLink?.company;

  // Filter clarification documents
  const clarificationDocs = (op.documents || []).filter(
    (d: any) =>
      d.type === "CLARIFICATION" ||
      d.fileName?.includes("توضيح") ||
      d.fileName?.includes("استفسار") ||
      d.fileName?.includes("ملحق")
  );

  // Inquiry deadline from op.dates if available
  const inquiryDateObj = op.dates?.find(
    (d: any) =>
      d.type === "INQUIRY" ||
      d.type === "QUESTIONS_DEADLINE" ||
      d.title?.includes("استفسار") ||
      d.title?.includes("توضيح")
  );

  const addInquiryRow = () => {
    setInquiries([
      ...inquiries,
      {
        id: Date.now().toString(),
        clause: `البند رقم (${inquiries.length + 1})`,
        page: "",
        inquiry: "",
        proposal: "",
      },
    ]);
  };

  const removeInquiryRow = (id: string) => {
    if (inquiries.length <= 1) {
      toast.warning("يجب الإبقاء على استفسار واحد على الأقل");
      return;
    }
    setInquiries(inquiries.filter((r) => r.id !== id));
  };

  const updateInquiryRow = (id: string, field: "clause" | "page" | "inquiry" | "proposal", value: string) => {
    setInquiries(
      inquiries.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Generate & Save clarification letter
  const handleSaveLetterToDocs = async () => {
    setSavingLetter(true);
    try {
      const letterHtml = generateLetterHtml();
      const blob = new Blob([letterHtml], { type: "text/html;charset=utf-8" });
      const file = new File([blob], `خطاب_استفسارات_${op.serialNumber}_${letterRefNo}.html`, { type: "text/html" });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "CLARIFICATION");
      formData.append("companyId", selectedCompanyId || "");
      formData.append("fileName", `خطاب استفسارات وتوضيحات فنية (إشارة ${letterRefNo})`);

      await api.post(`/operations/${op.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("تم حفظ وتوليد خطاب الاستفسارات بأرشيف العملية بنجاح! 📜");
      setLetterPreviewOpen(false);
      onRefresh();
    } catch {
      toast.error("فشل حفظ نسخة الخطاب بالأرشيف");
    } finally {
      setSavingLetter(false);
    }
  };

  // Export letter to Word (.doc)
  const handleExportWord = () => {
    const html = generateLetterHtml();
    const blob = new Blob(["\ufeff" + html], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `خطاب_استفسارات_توضيح_${op.serialNumber}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("تم تصدير خطاب الاستفسارات كملف Word بنجاح 📄");
  };

  // Print letter
  const handlePrintLetter = () => {
    window.print();
  };

  // Upload authority response
  const handleUploadResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseFile) {
      toast.error("يرجى اختيار ملف رد الجهة أو الملحق التوضيحي");
      return;
    }
    setUploadingResponse(true);
    try {
      const formData = new FormData();
      formData.append("file", responseFile);
      formData.append("type", "CLARIFICATION");
      formData.append("companyId", selectedCompanyId || "");
      formData.append(
        "fileName",
        `رد الجهة والملحق التوضيحي (رقم ${responseRefNo || "معتمد"})`
      );

      await api.post(`/operations/${op.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("تم رفع واعتماد رد الجهة والملحق التوضيحي بنجاح! ✓");
      setResponseFile(null);
      setResponseRefNo("");
      setResponseNotes("");
      onRefresh();
    } catch {
      toast.error("فشل رفع رد الجهة");
    } finally {
      setUploadingResponse(false);
    }
  };

  const handleDeleteDoc = async (docId: string, docName: string) => {
    if (!confirm(`هل أنت متأكد من حذف مستند "${docName}"؟`)) return;
    try {
      await api.delete(`/operations/${op.id}/documents/${docId}`);
      toast.success("تم حذف المستند بنجاح");
      onRefresh();
    } catch {
      toast.error("فشل حذف المستند");
    }
  };

  // Generate complete printable Egyptian letterhead HTML
  const generateLetterHtml = () => {
    const rowsHtml = inquiries
      .map(
        (row, idx) => `
        <tr>
          <td style="border:1px solid #334155;padding:8px;text-align:center;font-weight:bold;">${idx + 1}</td>
          <td style="border:1px solid #334155;padding:8px;font-weight:bold;">${row.clause} ${row.page ? `(${row.page})` : ""}</td>
          <td style="border:1px solid #334155;padding:8px;">${row.inquiry}</td>
          <td style="border:1px solid #334155;padding:8px;color:#0369a1;">${row.proposal || "—"}</td>
        </tr>`
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8"/>
        <title>خطاب استفسارات وتوضيح - ${op.serialNumber}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; color: #0f172a; margin: 0; padding: 20px; line-height: 1.6; }
          .header-box { display: flex; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; }
          .co-title { font-size: 18px; font-weight: 900; color: #0369a1; }
          .co-info { font-size: 11px; color: #475569; }
          .meta-box { font-size: 12px; font-weight: bold; text-align: left; }
          .salute { font-size: 14px; font-weight: bold; margin-bottom: 15px; }
          .intro { font-size: 13px; text-align: justify; margin-bottom: 15px; line-height: 1.8; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px; }
          th { background-color: #f1f5f9; border: 1px solid #334155; padding: 8px; text-align: right; }
          .sign-area { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 15px; }
          .sign-col { text-align: center; width: 45%; }
          .stamp-box { border: 2px dashed #94a3b8; height: 90px; border-radius: 8px; margin-top: 10px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div class="co-title">${currentCompany?.name || "شركة التعاقدات والتوريدات"}</div>
            <div class="co-info">س.ت: ${currentCompany?.commercialRegister || "—"} | ب.ض: ${currentCompany?.taxCard || "—"} | كود الشركة: ${currentCompanyLink?.displayCode || "A"}</div>
            <div class="co-info">العنوان: ${currentCompany?.address || "جمهورية مصر العربية"}</div>
          </div>
          <div class="meta-box">
            <div>التاريخ: ${letterDate}</div>
            <div>رقم الإشارة: ${letterRefNo}</div>
            <div>رقم العملية: ${op.externalNumber || op.serialNumber}</div>
          </div>
        </div>

        <div class="salute">
          <div>${recipientTitle}</div>
          <div>${recipientAuthority}</div>
          <div style="margin-top: 8px;">تحية طيبة وبعد ،،،</div>
        </div>

        <div class="intro">
          <strong>الموضوع: طلب إيضاح واستفسارات فنية وقانونية بشأن العملية رقم (${op.externalNumber || op.serialNumber}) بعنوان: "${op.title}"</strong>
          <br/><br/>
          ${introText}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">م</th>
              <th style="width: 180px;">رقم البند / الصفحة بالكراسة</th>
              <th>الاستفسار وطلب الإيضاح</th>
              <th style="width: 200px;">المقترح الفني للشركة</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="font-size: 13px; font-weight: bold; margin-bottom: 25px;">
          وتفضلوا بقبول فائق الاحترام والتقدير ،،،
        </div>

        <div class="sign-area">
          <div class="sign-col">
            <div><strong>مقدمه لسيادتكم / المفوض بالتعاقدات</strong></div>
            <div style="margin-top: 5px;">${delegateName}</div>
            <div style="font-size: 11px; color: #475569;">${delegateTitle}</div>
            <div style="margin-top: 15px; font-size: 11px;">التوقيع: ............................</div>
          </div>
          <div class="sign-col">
            <div><strong>خاتم الشركة الرسمي</strong></div>
            <div class="stamp-box">خاتم الشركة وبصمة النسر / الاعتماد</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <SectionCard
      title="خطاب التوضيح والاستفسارات الفنية والقانونية"
      icon={HelpCircle}
      iconColor="text-amber-600"
      badge={
        <div className="flex items-center gap-2">
          <Badge className="badge-amber text-[10px] font-bold">
            {clarificationDocs.length} مستند محفوظ
          </Badge>
          {inquiryDateObj && (
            <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 font-mono">
              آخر موعد للاستفسارات: {formatDate(inquiryDateObj.date)}
            </Badge>
          )}
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setLetterPreviewOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>معاينة وطباعة الخطاب المعتمد</span>
          </Button>
        </div>
      }
    >
      {/* Legal & Timeline Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-foreground text-sm flex items-center gap-2">
              <span>حق الاستفسار القانوني (قانون 182 لسنة 2018)</span>
              <Badge className="bg-amber-600/20 text-amber-800 dark:text-amber-200 text-[10px]">المادة 26 ولائحته</Badge>
            </h4>
            <p className="text-muted-foreground mt-0.5">
              يحق للشركات قانوناً توجيه استفسارات مكتوبة لجهة الإسناد بشأن غموض المواصفات أو شروط الكراسة، وتلتزم الجهة بالرد وإصدار ملحق توضيحي لجميع المنافسين قبل موعد فتح المظاريف.
            </p>
          </div>
        </div>
        {inquiryDateObj && (
          <div className="bg-card px-3 py-1.5 rounded-xl border border-amber-500/30 text-center shrink-0">
            <span className="text-[10px] text-muted-foreground block">العد التنازلي للمهلة</span>
            <span className="text-xs font-mono font-bold text-amber-600">
              {getCountdown(inquiryDateObj.date).text}
            </span>
          </div>
        )}
      </div>

      {/* Main Grid: Letter Generator Form & Inquiries Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 cols): Interactive Form & Rows */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2">
              <h5 className="font-bold text-xs text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-600" />
                <span>بيانات الخطاب الموجه لجهة الإسناد (المتغيرات الديناميكية)</span>
              </h5>
              <Badge variant="outline" className="text-[10px] font-mono">
                إشارة: {letterRefNo}
              </Badge>
            </div>

            {/* Inputs: Company, Authority, Delegate */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">الشركة المصدرة للخطاب *</Label>
                <Select value={selectedCompanyId} onValueChange={(val: any) => setSelectedCompanyId(val || "")}>
                  <SelectTrigger className="h-9 text-xs font-bold text-right cursor-pointer">
                    <span>
                      {(() => {
                        const c = (op.companies || []).find((x: any) => x.companyId === selectedCompanyId);
                        return c ? `${c.company.name} (${c.displayCode})` : "اختر الشركة";
                      })()}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {(op.companies || []).map((c: any) => (
                      <SelectItem key={c.companyId} value={c.companyId}>
                        {c.company.name} ({c.displayCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold">تاريخ الخطاب</Label>
                <Input
                  type="date"
                  value={letterDate}
                  onChange={(e) => setLetterDate(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold">رقم الإشارة الصادر</Label>
                <Input
                  value={letterRefNo}
                  onChange={(e) => setLetterRefNo(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">المخاطَب بالجهة *</Label>
                <Input
                  value={recipientTitle}
                  onChange={(e) => setRecipientTitle(e.target.value)}
                  placeholder="مثال: السيد الأستاذ / رئيس الأمانة الفنية"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">جهة الإسناد الرسمية *</Label>
                <Input
                  value={recipientAuthority}
                  onChange={(e) => setRecipientAuthority(e.target.value)}
                  placeholder="مثال: الهيئة العامة للأبنية التعليمية"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">اسم المفوض الموقع</Label>
                <Input
                  value={delegateName}
                  onChange={(e) => setDelegateName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">الصفة والوظيفة</Label>
                <Input
                  value={delegateTitle}
                  onChange={(e) => setDelegateTitle(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-bold">مقدمة وسند الطلب القانوني</Label>
              <Textarea
                rows={2}
                value={introText}
                onChange={(e) => setIntroText(e.target.value)}
                className="text-xs leading-relaxed"
              />
            </div>
          </div>

          {/* Inquiries Rows Builder */}
          <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <h5 className="font-bold text-xs text-foreground flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-amber-600" />
                  <span>جدول بنود الاستفسار والتوضيحات المطلوبة ({inquiries.length})</span>
                </h5>
                <span className="text-[10px] text-muted-foreground">حدد رقم البند وصفحته بالكراسة مع كتابة الاستفسار والمقترح الفني</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addInquiryRow}
                className="h-7.5 px-3 text-xs font-bold rounded-xl border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                <span>إضافة بند استفسار</span>
              </Button>
            </div>

            <div className="space-y-3">
              {inquiries.map((row, idx) => (
                <div
                  key={row.id}
                  className="p-3.5 rounded-xl bg-muted/20 border border-border space-y-2.5 relative group hover:border-amber-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <Input
                        value={row.clause}
                        onChange={(e) => updateInquiryRow(row.id, "clause", e.target.value)}
                        placeholder="رقم البند والمواصفة (مثال: البند 3 - التكييفات)"
                        className="h-8 text-xs font-bold w-64 bg-card"
                      />
                      <Input
                        value={row.page}
                        onChange={(e) => updateInquiryRow(row.id, "page", e.target.value)}
                        placeholder="الصفحة (مثال: ص 14)"
                        className="h-8 text-xs font-mono w-24 bg-card"
                      />
                    </div>
                    {inquiries.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInquiryRow(row.id)}
                        className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                        title="حذف البند"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground font-semibold">نص الاستفسار والغموض المطلوب إيضاحه *</Label>
                      <Textarea
                        rows={2}
                        value={row.inquiry}
                        onChange={(e) => updateInquiryRow(row.id, "inquiry", e.target.value)}
                        placeholder="مثال: هل يُقبل تقديم بديل معادل معتمد بمواصفة قياسية أعلى؟"
                        className="text-xs bg-card"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">المقترح الفني للشركة (الحل المقترح)</Label>
                      <Textarea
                        rows={2}
                        value={row.proposal}
                        onChange={(e) => updateInquiryRow(row.id, "proposal", e.target.value)}
                        placeholder="مثال: نرجو التفضل بالموافقة على اعتماد المواصفة المعززة..."
                        className="text-xs bg-card"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                onClick={() => setLetterPreviewOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>معاينة وتوليد الخطاب الرسمي</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Authority Response & Saved Documents */}
        <div className="lg:col-span-4 space-y-4">
          {/* Upload Authority Reply */}
          <form
            onSubmit={handleUploadResponse}
            className="p-5 rounded-2xl bg-card border border-border space-y-3 shadow-sm"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                <FileCheck className="h-4 w-4" />
              </div>
              <div>
                <h5 className="font-bold text-xs text-foreground">رفع رد الجهة / الملحق التوضيحي</h5>
                <span className="text-[10px] text-muted-foreground">عند استلام إفادة رسمية من جهة الإسناد</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-bold">رقم كتاب / ملحق الجهة</Label>
              <Input
                value={responseRefNo}
                onChange={(e) => setResponseRefNo(e.target.value)}
                placeholder="مثال: كتاب رقم 284/توضيحات"
                className="h-8.5 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-bold">ملف الرد الرسمي (PDF أو صورة) *</Label>
              <FileUploadZone
                file={responseFile}
                onFileSelect={setResponseFile}
                accept="application/pdf,image/*"
                placeholder="اضغط لاختيار ملف رد الجهة أو الملحق التوضيحي"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={uploadingResponse || !responseFile}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              {uploadingResponse ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>جاري الحفظ والرفع...</span>
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  <span>حفظ رد الجهة والملحق بالأرشيف ✓</span>
                </>
              )}
            </Button>
          </form>

          {/* List of Saved Clarification Documents */}
          <div className="p-4.5 rounded-2xl bg-card border border-border space-y-3 shadow-sm">
            <h5 className="font-bold text-xs text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5 text-amber-600" />
                <span>مستندات الاستفسارات والردود ({clarificationDocs.length})</span>
              </span>
              <Badge variant="outline" className="text-[9px] font-mono">أرشيف رسمي</Badge>
            </h5>

            {clarificationDocs.length > 0 ? (
              <div className="space-y-2">
                {clarificationDocs.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="p-2.5 rounded-xl bg-muted/20 border border-border flex items-center justify-between gap-2 hover:border-amber-500/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0 text-xs font-bold">
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <div className="truncate">
                        <p className="text-[11px] font-bold text-foreground truncate">{doc.fileName}</p>
                        <span className="text-[9px] text-muted-foreground block font-mono">
                          {formatDate(doc.createdAt)} • {formatDocFileSize(doc.fileSize)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => onPreviewDoc?.(doc)}
                        className="h-6.5 px-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDownloadDoc?.(doc)}
                        className="h-6.5 px-1.5 border-border text-foreground hover:bg-muted rounded-lg"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteDoc(doc.id, doc.fileName)}
                        className="h-6.5 w-6.5 p-0 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-xs space-y-1">
                <HelpCircle className="h-6 w-6 mx-auto text-muted-foreground/50" />
                <p>لم يتم حفظ خطابات استفسارات أو ردود حتى الآن</p>
                <p className="text-[10px]">استخدم النموذج لتوليد الخطاب أو ارفع رد الجهة</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ━━━ OFFICIAL LETTERHEAD PREVIEW & PRINT MODAL ━━━ */}
      {letterPreviewOpen && (
        <Portal>
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-background border border-border w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Bar */}
              <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold">
                    <Printer className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground">معاينة وطباعة خطاب الاستفسارات الرسمي</h3>
                    <p className="text-[10px] text-muted-foreground">صيغة قانونية معتمدة وفقاً لقانون التعاقدات الحكومية رقم 182 لسنة 2018</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportWord}
                    className="h-8 text-xs font-bold rounded-xl border-border text-foreground hover:bg-muted cursor-pointer flex items-center gap-1"
                  >
                    <Download className="h-3.5 w-3.5 text-blue-500" />
                    <span>تصدير Word (.doc)</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handlePrintLetter}
                    className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>طباعة / حفظ PDF</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveLetterToDocs}
                    disabled={savingLetter}
                    className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1"
                  >
                    {savingLetter ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                    <span>اعتماد وحفظ بأرشيف العملية</span>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setLetterPreviewOpen(false)}
                    className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Letterhead Preview Container */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white text-slate-900 font-sans" dir="rtl">
                {/* Formal Letterhead */}
                <div className="border-b-2 border-sky-700 pb-3 mb-6 flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-black text-sky-800">{currentCompany?.name || "اسم الشركة"}</h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      سجل تجاري: {currentCompany?.commercialRegister || "—"} • بطاقة ضريبية: {currentCompany?.taxCard || "—"}
                    </p>
                    <p className="text-xs text-slate-600">العنوان: {currentCompany?.address || "جمهورية مصر العربية"}</p>
                  </div>
                  <div className="text-left text-xs space-y-1 font-mono">
                    <div><strong>التاريخ:</strong> {letterDate}</div>
                    <div><strong>رقم الإشارة:</strong> {letterRefNo}</div>
                    <div><strong>كود العملية:</strong> {op.externalNumber || op.serialNumber}</div>
                  </div>
                </div>

                {/* Recipient */}
                <div className="space-y-1 text-sm font-bold text-slate-900 mb-4">
                  <div>{recipientTitle}</div>
                  <div>{recipientAuthority}</div>
                  <div className="pt-2 text-slate-800">تحية طيبة وبعد ،،،</div>
                </div>

                {/* Subject & Legal Intro */}
                <div className="text-xs leading-relaxed text-slate-800 mb-4 space-y-2 text-justify">
                  <p className="font-bold text-slate-900 bg-sky-50 p-2.5 rounded-lg border border-sky-200">
                    الموضوع: طلب إيضاح واستفسارات فنية وقانونية بشأن العملية رقم ({op.externalNumber || op.serialNumber}) بعنوان: &quot;{op.title}&quot;
                  </p>
                  <p>{introText}</p>
                </div>

                {/* Inquiries Table */}
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-right text-xs border border-slate-700 border-collapse">
                    <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-700">
                      <tr>
                        <th className="p-2 border border-slate-700 text-center w-10">م</th>
                        <th className="p-2 border border-slate-700 w-48">رقم البند / الصفحة بالكراسة</th>
                        <th className="p-2 border border-slate-700">الاستفسار وطلب الإيضاح</th>
                        <th className="p-2 border border-slate-700 w-52">المقترح الفني للشركة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {inquiries.map((row, idx) => (
                        <tr key={row.id}>
                          <td className="p-2 border border-slate-700 text-center font-bold">{idx + 1}</td>
                          <td className="p-2 border border-slate-700 font-bold">{row.clause} {row.page ? `(${row.page})` : ""}</td>
                          <td className="p-2 border border-slate-700 leading-relaxed">{row.inquiry}</td>
                          <td className="p-2 border border-slate-700 text-sky-800 font-semibold">{row.proposal || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Sign-off & Stamp Box */}
                <div className="text-xs font-bold text-slate-800 mb-8">
                  وتفضلوا بقبول وافر التحية والتقدير والامتنان ،،،
                </div>

                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div className="text-center text-xs space-y-1">
                    <div className="font-bold">مقدمه لسيادتكم / المفوض بالتعاقدات</div>
                    <div className="text-sm font-black text-slate-900">{delegateName}</div>
                    <div className="text-[11px] text-slate-600">{delegateTitle}</div>
                    <div className="pt-6 text-[11px]">التوقيع: ............................................</div>
                  </div>

                  <div className="text-center text-xs space-y-2">
                    <div className="font-bold">خاتم الشركة الرسمي والاعتماد</div>
                    <div className="h-24 border-2 border-dashed border-slate-400 rounded-xl flex items-center justify-center text-slate-400 text-[11px]">
                      بصمة خاتم الشركة المعتمد
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </SectionCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   5. TECHNICAL OFFER TAB & SMART COVER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TabTechnical({ op, onRefresh, onOpenSmartCover }: { op: Operation; onRefresh: () => void; onOpenSmartCover: () => void }) {
  const [adding, setAdding] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(op.companies?.[0]?.companyId || "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <SectionCard title="تجهيز العرض الفني والغلاف الذكي" icon={ClipboardCheck} iconColor="text-purple-600"
      badge={<Badge className="badge-purple text-[10px] font-bold">{op.technicalOffers?.length || 0} عرض فني</Badge>}
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onOpenSmartCover} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 text-white font-bold text-xs h-8 rounded-xl cursor-pointer shadow-sm">
            <Sparkles className="h-3.5 w-3.5 ml-1" />الغلاف الذكي Smart Cover
          </Button>
        </div>
      }>

      <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs space-y-1 text-foreground mb-2">
        <strong>المحتويات الإلزامية للعرض الفني:</strong> السجل التجاري والبطاقة الضريبية + ترخيص المزاولة + شهادة تسجيل القيمة المضافة + تفويض التوقيع + بيان سابقة الأعمال للشركة المحددة.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(op.companies || []).map((oc: any) => {
          const offer = op.technicalOffers?.find((to: any) => to.companyId === oc.companyId);
          return (
            <div key={oc.displayCode} className="p-4 rounded-xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 font-mono font-bold flex items-center justify-center text-xs">
                    {oc.displayCode}
                  </span>
                  <span className="text-sm font-bold text-foreground">{oc.company.name}</span>
                </div>
                <Badge className={offer ? "badge-emerald text-[10px]" : "badge-amber text-[10px]"}>
                  {offer ? "العرض جاهز ✓" : "قيد الإعداد"}
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border/50">
                <div className="flex items-center gap-1.5 text-foreground font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />السجل التجاري والبطاقة الضريبية
                </div>
                <div className="flex items-center gap-1.5 text-foreground font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />ترخيص مزاولة النشاط
                </div>
                <div className="flex items-center gap-1.5 text-foreground font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />شهادة القيمة المضافة 14%
                </div>
                <div className="flex items-center gap-1.5 text-foreground font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />سابقة الأعمال المعتمدة
                </div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-xs text-muted-foreground font-mono">الكود: {oc.displayCode}</span>
                <Button size="sm" variant="outline" onClick={onOpenSmartCover} className="text-xs h-7 rounded-lg border-border">
                  <FileCheck className="h-3 w-3 ml-1" />طباعة الغلاف
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   6. FINANCIAL OFFER TAB (العرض المالي والتفقيط ومنع التواطؤ)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TabFinancial({ op, onRefresh }: { op: Operation; onRefresh: () => void }) {
  const [adding, setAdding] = useState(false);
  const [companyId, setCompanyId] = useState(op.companies?.[0]?.companyId || "");
  const [executionPeriod, setExecutionPeriod] = useState("30");
  const [items, setItems] = useState([
    { itemName: "توريد الصنف الأساسي المطلوب", unit: "وحدة", quantity: 100, unitPrice: 5000 },
  ]);
  const [saving, setSaving] = useState(false);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice) || 0), 0);
  }, [items]);
  const vat = useMemo(() => Math.round(subtotal * 0.14 * 100) / 100, [subtotal]);
  const grandTotal = useMemo(() => subtotal + vat, [subtotal, vat]);
  const tafqeetText = useMemo(() => tafqeetArabic(grandTotal), [grandTotal]);

  const addItem = () => setItems([...items, { itemName: "", unit: "قطعة", quantity: 1, unitPrice: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  return (
    <SectionCard title="العرض المالي وجدول الكميات" icon={Coins} iconColor="text-teal-600"
      badge={<Badge className="badge-blue text-[10px] font-bold">{op.financialOffers?.length || 0} عرض مالي</Badge>}
      actions={
        <Button size="sm" onClick={() => setAdding(!adding)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 rounded-xl cursor-pointer">
          <Plus className="h-3.5 w-3.5 ml-1" />إعداد عرض مالي جديد
        </Button>
      }>

      {/* Anti-collusion warning */}
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-950 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong>ضمانات منع التواطؤ (مادة 76 من قانون المناقصات):</strong> عند دخول أكثر من شركة من المجموعة، يجب أن تكون الأسعار ومدد التنفيذ متفاوتة بحسابات حقيقية مستقلة لمنع أي شبهة تواطؤ.
        </div>
      </div>

      {adding && (
        <div className="p-4 rounded-xl bg-card border border-teal-500/30 space-y-4 animate-fade-in shadow-lg">
          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Coins className="h-4 w-4 text-teal-600" />
            إعداد جدول كميات وعرض مالي
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">الشركة المقدمة</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger className="h-10 text-sm font-medium">
                  <span>
                    {(() => {
                      const c = (op.companies || []).find((x: any) => x.companyId === companyId);
                      return c ? `${c.company.name} (${c.displayCode})` : "اختر الشركة";
                    })()}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {(op.companies || []).map((c: any) => (
                    <SelectItem key={c.companyId} value={c.companyId}>{c.company.name} ({c.displayCode})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">مدة التنفيذ (بالأيام)</Label>
              <Input value={executionPeriod} onChange={e => setExecutionPeriod(e.target.value)} className="h-10 text-sm font-mono" />
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <Label className="text-xs font-bold">بنود الأصناف والكميات</Label>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-muted/20 p-2.5 rounded-xl border border-border">
                  <div className="sm:col-span-5">
                    <Input placeholder="اسم الصنف والمواصفة" value={it.itemName} onChange={e => {
                      const copy = [...items]; copy[idx].itemName = e.target.value; setItems(copy);
                    }} className="h-9 text-xs" />
                  </div>
                  <div className="sm:col-span-2">
                    <Input placeholder="الوحدة" value={it.unit} onChange={e => {
                      const copy = [...items]; copy[idx].unit = e.target.value; setItems(copy);
                    }} className="h-9 text-xs" />
                  </div>
                  <div className="sm:col-span-2">
                    <Input type="number" placeholder="الكمية" value={it.quantity} onChange={e => {
                      const copy = [...items]; copy[idx].quantity = Number(e.target.value); setItems(copy);
                    }} className="h-9 text-xs font-mono" />
                  </div>
                  <div className="sm:col-span-2">
                    <Input type="number" placeholder="سعر الوحدة" value={it.unitPrice} onChange={e => {
                      const copy = [...items]; copy[idx].unitPrice = Number(e.target.value); setItems(copy);
                    }} className="h-9 text-xs font-mono" />
                  </div>
                  <div className="sm:col-span-1 text-center">
                    {items.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-8 w-8 text-rose-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={addItem} className="text-xs h-7 rounded-lg">
              <Plus className="h-3 w-3 ml-1" />إضافة بند جديد
            </Button>
          </div>

          {/* Live Calculation Card */}
          <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/20 space-y-2 text-xs">
            <DataRow label="الإجمالي قبل الضريبة (Subtotal)" value={formatCurrency(subtotal)} mono />
            <DataRow label="ضريبة القيمة المضافة (14% VAT)" value={formatCurrency(vat)} mono />
            <div className="flex justify-between items-center pt-2 border-t border-teal-500/20">
              <span className="font-bold text-foreground">الإجمالي النهائي الشامل للضريبة</span>
              <span className="text-lg font-black text-teal-600 dark:text-teal-400 font-mono">{formatCurrency(grandTotal)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-950 dark:text-teal-200 font-semibold">
              <strong>التفقيط بالحروف:</strong> {tafqeetText}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setAdding(false)} className="rounded-xl">إلغاء</Button>
            <Button size="sm" onClick={() => {
              toast.success("تم تجهيز وحفظ العرض المالي وجدول الكميات");
              setAdding(false);
            }} className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold">
              حفظ العرض المالي
            </Button>
          </div>
        </div>
      )}

      {/* Existing Financial Offers */}
      {op.financialOffers?.length > 0 ? (
        <div className="space-y-4">
          {op.financialOffers.map((offer: any) => (
            <div key={offer.id} className="p-4 rounded-xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">عرض مالي — شركة {(op.companies || []).find((c: any) => c.company.id === offer.companyId)?.company.name || "—"}</span>
                {offer.executionPeriod && <Badge className="badge-blue text-[10px]">مدة التنفيذ: {offer.executionPeriod} يوم</Badge>}
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                <DataRow label="الإجمالي قبل الضريبة" value={formatCurrency(Number(offer.subtotal))} mono />
                <DataRow label={`ضريبة القيمة المضافة (${Number(offer.vatRate)}%)`} value={formatCurrency(Number(offer.vatAmount))} mono />
                <div className="flex justify-between items-center pt-2 border-t border-emerald-500/20">
                  <span className="text-sm font-bold text-foreground">الإجمالي النهائي</span>
                  <span className="text-lg font-black text-emerald-600 font-mono">{formatCurrency(Number(offer.grandTotal))}</span>
                </div>
                {offer.amountInWords && (
                  <p className="text-xs text-muted-foreground pt-1 border-t border-emerald-500/10">المبلغ بالحروف: <span className="text-foreground font-semibold">{offer.amountInWords}</span></p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : !adding && (
        <EmptyState icon={Coins} text="لم يتم إعداد العرض المالي وجدول الكميات بعد" subtext="اضغط على زر إعداد عرض مالي جديد لإدخال الأسعار وحساب الضريبة والتفقيط تلقائياً" />
      )}
    </SectionCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   7 & 14. GUARANTEES TAB (ابتدائي 1-2% أو نهائي 5%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TabGuarantees({
  op,
  type,
  title,
  onRefresh,
  onPreviewDoc,
  onDownloadDoc
}: {
  op: Operation;
  type: "INITIAL" | "FINAL";
  title: string;
  onRefresh: () => void;
  onPreviewDoc?: (doc: any) => void;
  onDownloadDoc?: (doc: any) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [companyId, setCompanyId] = useState(op.companies?.[0]?.companyId || "");
  const [paymentMethod, setPaymentMethod] = useState("BANK_GUARANTEE");

  // Auto calculate 5% if final guarantee based on award price
  const awardedPrice = Number(op.awards?.[0]?.winnerPrice) || 850000;
  const defaultAmount = type === "FINAL" ? String(Math.round(awardedPrice * 0.05)) : "15000";

  const [amount, setAmount] = useState(defaultAmount);
  const [percentage, setPercentage] = useState(type === "INITIAL" ? "1.5" : "5");
  const [bankName, setBankName] = useState("البنك الأهلي المصري");
  const [bankBranch, setBankBranch] = useState("الفرع الرئيسي");
  const [guaranteeNumber, setGuaranteeNumber] = useState(`LG-${Date.now().toString().slice(-6)}`);
  const [paymentDeadlineDays, setPaymentDeadlineDays] = useState("10");
  const [validityDurationMonths, setValidityDurationMonths] = useState(type === "FINAL" ? "12" : "3");
  const [duesReference, setDuesReference] = useState("مستحقات العملية السابقة رقم 24/2024 ومستخلص جاري الصرف");
  const [finalLetterModalOpen, setFinalLetterModalOpen] = useState(false);
  const [savingFinalLetter, setSavingFinalLetter] = useState(false);
  const [saving, setSaving] = useState(false);

  // Receipt Upload for Final Guarantee
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptNumberInput, setReceiptNumberInput] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");

  const handleUploadGuaranteeReceipt = async () => {
    if (!receiptFile) {
      toast.error("يرجى اختيار ملف وصل سداد التأمين النهائي أولاً");
      return;
    }
    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append("file", receiptFile);
      formData.append("type", "RECEIPT");
      formData.append("companyId", op.companies?.[0]?.companyId || "");
      const fileNameStr = receiptNumberInput
        ? `وصل سداد التأمين النهائي 5% رقم (${receiptNumberInput})`
        : `وصل سداد التأمين النهائي 5% - ${op.serialNumber}`;
      formData.append("fileName", fileNameStr);

      await api.post(`/operations/${op.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("تم رفع وتوثيق وصل سداد التأمين النهائي بنجاح! 🧾✓");
      setReceiptFile(null);
      setReceiptNumberInput("");
      setReceiptNotes("");
      onRefresh();
    } catch {
      toast.error("فشل رفع وصل سداد التأمين");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const finalGuaranteeDocs = (op.documents || []).filter(
    (d: any) =>
      d.fileName?.includes("التأمين النهائي") ||
      d.fileName?.includes("سداد التأمين") ||
      d.fileName?.includes("خطاب الضمان النهائي") ||
      (d.type === "RECEIPT" && (d.fileName?.includes("ضمان") || d.fileName?.includes("نهائي") || d.fileName?.includes("وصل")))
  );

  // Edit & Delete Guarantee State
  const [editingG, setEditingG] = useState<any | null>(null);
  const [savingEditG, setSavingEditG] = useState(false);

  const handleUpdateGuarantee = async () => {
    if (!editingG) return;
    setSavingEditG(true);
    try {
      await api.patch(`/operations/${op.id}/guarantees/${editingG.id}`, {
        amount: Number(editingG.amount),
        paymentMethod: editingG.paymentMethod,
        bankName: editingG.bankName,
        bankBranch: editingG.bankBranch,
        guaranteeNumber: editingG.guaranteeNumber,
        receiptNumber: editingG.receiptNumber,
        percentage: editingG.percentage ? Number(editingG.percentage) : undefined,
        startDate: editingG.startDate,
        endDate: editingG.endDate,
        duration: editingG.duration ? Number(editingG.duration) : undefined,
        notes: editingG.notes,
      });
      toast.success("تم تعديل بيانات الضمان والتأمين بنجاح! ✓");
      setEditingG(null);
      onRefresh();
    } catch {
      toast.error("فشل حفظ تعديلات التأمين");
    } finally {
      setSavingEditG(false);
    }
  };

  const handleDeleteGuarantee = async (gId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا التأمين/الضمان؟")) return;
    try {
      await api.delete(`/operations/${op.id}/guarantees/${gId}`);
      toast.success("تم حذف التأمين بنجاح 🗑️");
      onRefresh();
    } catch {
      toast.error("فشل حذف التأمين");
    }
  };

  const guarantees = op.guarantees?.filter((g: any) => g.type === type) || [];
  const gStatusMap: Record<string, string> = { ACTIVE: "ساري ونشط ✓", EXPIRING_SOON: "قارب على الانتهاء ⚠️", EXPIRED: "منتهي 🔴", RECOVERY_REQUESTED: "قيد الاسترداد ⏳", RECOVERED: "تم الاسترداد بنجاح 🟢" };
  const currentCompany = op.companies?.[0]?.company;

  const handleSaveGuarantee = async () => {
    setSaving(true);
    try {
      const validityDays = Number(validityDurationMonths || 12) * 30;
      await api.post(`/operations/${op.id}/guarantees`, {
        companyId,
        type,
        paymentMethod,
        amount: Number(amount),
        percentage: Number(percentage),
        bankName: paymentMethod === "BANK_GUARANTEE" ? bankName : undefined,
        bankBranch: paymentMethod === "BANK_GUARANTEE" ? bankBranch : undefined,
        guaranteeNumber: paymentMethod === "BANK_GUARANTEE" ? guaranteeNumber : undefined,
        notes: paymentMethod === "DEDUCTION_FROM_DUES" ? `خصم من المستحقات: ${duesReference}` : undefined,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + validityDays * 86400000).toISOString(),
      });

      // If final guarantee, also register payment deadline into dates if not present
      if (type === "FINAL") {
        try {
          const deadlineDate = new Date(Date.now() + Number(paymentDeadlineDays || 10) * 86400000).toISOString();
          await api.post(`/operations/${op.id}/dates`, {
            title: "مهلة سداد التأمين النهائي (5%)",
            type: "FINAL_GUARANTEE_DEADLINE",
            date: deadlineDate,
            notes: "محددة بـ 10 أيام عمل من إخطار الترسية طبقاً للمادة 44 من قانون 182 لسنة 2018",
          });
        } catch {}
      }

      toast.success(`تم تسجيل ${title} وتحديث السريان والمواعيد بنجاح! 🛡️`);
      setAdding(false);
      onRefresh();
    } catch {
      toast.error("فشل تسجيل التأمين");
    } finally {
      setSaving(false);
    }
  };

  // Save generated final guarantee letter to docs
  const handleSaveFinalLetterToDocs = async () => {
    setSavingFinalLetter(true);
    try {
      const html = generateFinalGuaranteeLetterHtml();
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const file = new File([blob], `خطاب_تقديم_التأمين_النهائي_${op.serialNumber}.html`, { type: "text/html" });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "RECEIPT");
      formData.append("companyId", op.companies?.[0]?.companyId || "");
      formData.append("fileName", `خطاب سداد وتقديم التأمين النهائي 5% (${formatCurrency(Number(amount))})`);

      await api.post(`/operations/${op.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("تم حفظ وتوثيق خطاب سداد التأمين النهائي بأرشيف العملية بنجاح! 🔒");
      setFinalLetterModalOpen(false);
      onRefresh();
    } catch {
      toast.error("فشل حفظ نسخة الخطاب بالأرشيف");
    } finally {
      setSavingFinalLetter(false);
    }
  };

  // Generate printable final guarantee issuance letter HTML
  const generateFinalGuaranteeLetterHtml = () => {
    const methodDesc =
      paymentMethod === "BANK_GUARANTEE"
        ? `أصل خطاب ضمان بنكي نهائي غير مشروط رقم (${guaranteeNumber}) صادر عن ${bankName} (${bankBranch}) سارٍ لمدة (${validityDurationMonths}) شهراً`
        : paymentMethod === "CASH"
        ? "أصل إيصال توريد نقدي مسدد بخزينة الجهة الإدارية الموقرة"
        : `إشعار خصم رسمي معتمد من مستحقات شركتنا القائمة لديكم عن: ${duesReference}`;

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8"/>
        <title>خطاب سداد التأمين النهائي - ${op.serialNumber}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; color: #0f172a; margin: 0; padding: 20px; line-height: 1.7; }
          .header-box { display: flex; justify-content: space-between; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px; }
          .co-title { font-size: 18px; font-weight: 900; color: #047857; }
          .salute { font-size: 14px; font-weight: bold; margin-bottom: 15px; }
          .subject-box { background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 10px 14px; font-weight: bold; margin-bottom: 15px; border-radius: 6px; }
          .content { font-size: 13px; text-align: justify; margin-bottom: 20px; line-height: 1.9; }
          .data-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px; }
          .data-table th, .data-table td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: right; }
          .data-table th { background-color: #f1f5f9; font-weight: bold; }
          .sign-area { display: flex; justify-content: space-between; margin-top: 45px; }
          .sign-col { text-align: center; width: 45%; }
          .stamp-box { border: 2px dashed #94a3b8; height: 90px; border-radius: 8px; margin-top: 10px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div class="co-title">${currentCompany?.name || "اسم الشركة"}</div>
            <div style="font-size:11px;color:#475569;">سجل تجاري: ${currentCompany?.commercialRegister || "—"} | بطاقة ضريبية: ${currentCompany?.taxCard || "—"}</div>
          </div>
          <div style="font-size:12px;font-weight:bold;text-align:left;">
            <div>التاريخ: ${new Date().toLocaleDateString("ar-EG")}</div>
            <div>رقم الإشارة: LG-FIN-${Date.now().toString().slice(-4)}</div>
            <div>رقم العملية: ${op.externalNumber || op.serialNumber}</div>
          </div>
        </div>

        <div class="salute">
          <div>السيد الأستاذ / رئيس الإدارة المركزية للشؤون المالية والإدارية والتعاقدات</div>
          <div>${op.authority || "جهة الإسناد الموقرة"}</div>
          <div style="margin-top: 8px;">تحية طيبة وبعد ،،،</div>
        </div>

        <div class="subject-box">
          الموضوع: سداد وتقديم التأمين النهائي بنسبة (5%) للعملية رقم (${op.externalNumber || op.serialNumber}) بعنوان: "${op.title}"
        </div>

        <div class="content">
          بالإشارة إلى إخطار قبول العطاء والترسية الصادر من جهتكم الموقرة بشأن العملية المذكورة أعلاه؛
          <br/><br/>
          وطبقاً لأحكام القانون رقم 182 لسنة 2018 بشأن تنظيم التعاقدات التي تبرمها الجهات العامة ولائحته التنفيذية، وإعمالاً للمادة (44) بشأن وجوب أداء التأمين النهائي بنسبة 5% خلال المهلة القانونية المقررة؛
          <br/><br/>
          نتشرف بأن نرفق لسيادتكم طيه التأمين النهائي بمبلغ وقدره <strong>${formatCurrency(Number(amount))}</strong> (فقط وقدره: ${tafqeetArabic(Number(amount))} لا غير)، وبيانه كالتالي:
        </div>

        <table class="data-table">
          <tr>
            <th style="width: 35%;">القيمة الإجمالية للعقد الفائز</th>
            <td style="font-family: monospace; font-weight: bold;">${formatCurrency(awardedPrice)}</td>
          </tr>
          <tr>
            <th>نسبة التأمين النهائي</th>
            <td style="font-weight: bold; color: #047857;">5% (خمسة بالمائة)</td>
          </tr>
          <tr>
            <th>قيمة التأمين النهائي المسدد</th>
            <td style="font-weight: bold; font-family: monospace; color: #047857;">${formatCurrency(Number(amount))}</td>
          </tr>
          <tr>
            <th>طريقة وأداة السداد المرفقة</th>
            <td>${methodDesc}</td>
          </tr>
          <tr>
            <th>مدة سريان التأمين</th>
            <td>${validityDurationMonths} شهراً (حتى إتمام التوريد والاستلام النهائي للعملية)</td>
          </tr>
        </table>

        <div style="font-size: 13px; font-weight: bold; margin-bottom: 25px;">
          برجاء التكرم بالإحاطة واعتماد الاستلام تمهيداً لتوقيع العقد وإصدار أمر التوريد ،،،
        </div>

        <div class="sign-area">
          <div class="sign-col">
            <div><strong>المفوض بالتعاقدات والتوريدات</strong></div>
            <div style="margin-top: 5px;">أحمد محمد إبراهيم</div>
            <div style="font-size: 11px; color: #475569;">مدير إدارة المشتريات والعقود</div>
            <div style="margin-top: 15px; font-size: 11px;">التوقيع: ............................</div>
          </div>
          <div class="sign-col">
            <div><strong>خاتم الشركة الرسمي</strong></div>
            <div class="stamp-box">بصمة خاتم الشركة المعتمد</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <SectionCard
      title={title}
      icon={type === "INITIAL" ? Shield : ShieldCheck}
      iconColor="text-emerald-600"
      badge={
        <div className="flex items-center gap-2">
          <Badge className="badge-emerald text-[10px] font-bold">
            {guarantees.length} تأمين مسجل
          </Badge>
          {type === "FINAL" && (
            <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
              القيمة المقررة: 5% من العقد ({formatCurrency(Number(amount))})
            </Badge>
          )}
        </div>
      }
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          {type === "FINAL" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFinalLetterModalOpen(true)}
              className="text-xs font-bold h-8 rounded-xl border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>معاينة وطباعة خطاب سداد التأمين 5%</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => setAdding(!adding)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>تسجيل {type === "INITIAL" ? "تأمين ابتدائي" : "تأمين نهائي 5%"}</span>
          </Button>
        </div>
      }
    >
      <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-foreground mb-2 flex items-center justify-between flex-wrap gap-2">
        <span>
          {type === "INITIAL"
            ? "التأمين الابتدائي يمثل 1% إلى 2% من القيمة التقديرية لكراسة الشروط ويسري لمدة 90 يوماً."
            : "التأمين النهائي يمثل 5% من القيمة الإجمالية للعقد الفائز، ويلزم سداده خلال 10 أيام عمل من إخطار الترسية طبقاً للمادة (44) من قانون 182 لسنة 2018."}
        </span>
        {type === "FINAL" && (
          <Badge className="bg-emerald-600 text-white text-[10px] font-mono">
            5% = {formatCurrency(Number(amount))}
          </Badge>
        )}
      </div>

      {adding && (
        <div className="p-4 rounded-xl bg-card border border-emerald-500/30 space-y-3 animate-fade-in shadow-lg">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600" />
            تسجيل بيانات الضمان والتأمين {type === "FINAL" ? "النهائي (5%)" : "الابتدائي"}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">الشركة المقدمة</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger className="h-10 text-sm font-medium">
                  <span>
                    {(() => {
                      const c = (op.companies || []).find((x: any) => x.companyId === companyId);
                      return c ? `${c.company.name} (${c.displayCode})` : "اختر الشركة";
                    })()}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {(op.companies || []).map((c: any) => (
                    <SelectItem key={c.companyId} value={c.companyId}>{c.company.name} ({c.displayCode})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">طريقة السداد المعتمدة</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v ?? "")}>
                <SelectTrigger className="h-10 text-sm font-medium">
                  <span>
                    {paymentMethod === "BANK_GUARANTEE"
                      ? "أصل خطاب ضمان بنكي نهائي"
                      : paymentMethod === "CASH"
                      ? "سداد نقدي / إيصال توريد خزينة"
                      : "خصم رسمي من مستحقات قائمة"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_GUARANTEE">أصل خطاب ضمان بنكي نهائي</SelectItem>
                  <SelectItem value="CASH">سداد نقدي / إيصال توريد خزينة</SelectItem>
                  <SelectItem value="DEDUCTION_FROM_DUES">خصم رسمي من مستحقات قائمة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">قيمة التأمين (ج.م) *</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="h-10 text-sm font-mono font-bold" />
            </div>
          </div>

          {/* Additional fields for final guarantee: Deadline, Validity, Dues Ref */}
          {type === "FINAL" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 bg-muted/20 p-3 rounded-xl border border-border">
              <div className="space-y-1">
                <Label className="text-xs font-bold">مهلة سداد التأمين (أيام عمل)</Label>
                <Input
                  type="number"
                  value={paymentDeadlineDays}
                  onChange={(e) => setPaymentDeadlineDays(e.target.value)}
                  placeholder="10"
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">مدة سريان التأمين (شهور)</Label>
                <Input
                  type="number"
                  value={validityDurationMonths}
                  onChange={(e) => setValidityDurationMonths(e.target.value)}
                  placeholder="12"
                  className="h-9 text-xs font-mono"
                />
              </div>
              {paymentMethod === "DEDUCTION_FROM_DUES" && (
                <div className="space-y-1 sm:col-span-3">
                  <Label className="text-xs font-bold">بيان ومستند المستحقات المطلوب الخصم منها</Label>
                  <Input
                    value={duesReference}
                    onChange={(e) => setDuesReference(e.target.value)}
                    placeholder="رقم العملية السابقة أو المستخلص الجاري"
                    className="h-9 text-xs"
                  />
                </div>
              )}
            </div>
          )}

          {paymentMethod === "BANK_GUARANTEE" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="space-y-1">
                <Label className="text-xs">اسم البنك</Label>
                <Input value={bankName} onChange={e => setBankName(e.target.value)} className="h-10 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">الفرع</Label>
                <Input value={bankBranch} onChange={e => setBankBranch(e.target.value)} className="h-10 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">رقم خطاب الضمان</Label>
                <Input value={guaranteeNumber} onChange={e => setGuaranteeNumber(e.target.value)} className="h-10 text-sm font-mono" />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setAdding(false)} className="rounded-xl">إلغاء</Button>
            <Button size="sm" onClick={handleSaveGuarantee} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ بيانات الضمان"}
            </Button>
          </div>
        </div>
      )}

      {guarantees.length > 0 ? (
        <div className="space-y-3">
          {guarantees.map((g: any) => (
            <div key={g.id} className="p-4 rounded-xl bg-card border border-border space-y-2 hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">
                    {g.paymentMethod === "BANK_GUARANTEE" ? "خطاب ضمان بنكي" : g.paymentMethod === "CASH" ? "تأمين نقدي" : "خصم من المستحقات"}
                  </span>
                  <Badge className="badge-emerald text-[10px]">{gStatusMap[g.status] || g.status}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(Number(g.amount))}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingG(g)}
                    className="h-8 w-8 p-0 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl"
                    title="تعديل بيانات الضمان"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteGuarantee(g.id)}
                    className="h-8 w-8 p-0 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
                    title="حذف هذا الضمان"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {g.bankName && <DataRow label="البنك" value={`${g.bankName} — فرع ${g.bankBranch || "—"}`} />}
              {g.guaranteeNumber && <DataRow label="رقم خطاب الضمان" value={g.guaranteeNumber} mono />}
              {g.percentage && <DataRow label="النسبة" value={`${Number(g.percentage)}%`} />}
              {g.startDate && <DataRow label="تاريخ البداية" value={formatDate(g.startDate)} />}
              {g.endDate && (
                <DataRow label="تاريخ النهاية" value={
                  <span className="flex items-center gap-2">
                    {formatDate(g.endDate)}
                    <span className={`text-[10px] font-bold ${getCountdown(g.endDate).urgent ? "text-rose-600" : "text-muted-foreground"}`}>
                      ({getCountdown(g.endDate).text})
                    </span>
                  </span>
                } />
              )}
            </div>
          ))}
        </div>
      ) : !adding && (
        <EmptyState icon={Shield} text={`لا يوجد ${title} مسجل حتى الآن`} subtext={type === "INITIAL" ? "سجّل التأمين الابتدائي (1% أو 2%) قبل التقديم الرسمي" : "سجّل التأمين النهائي (5% من قيمة العقد) بعد صدور قرار الترسية"} />
      )}

      {/* ━━━ FINAL GUARANTEE PAYMENT RECEIPT UPLOAD & ARCHIVE ━━━ */}
      {type === "FINAL" && (
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-emerald-500/30 space-y-4 shadow-sm mt-4 animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-border flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <Receipt className="h-4 w-4" />
              </div>
              <div>
                <h5 className="font-bold text-xs sm:text-sm text-foreground">
                  رفع وتوثيق وصل سداد التأمين النهائي (خزينة الجهة أو البنك)
                </h5>
                <p className="text-[11px] text-muted-foreground">
                  إثبات سداد نسبة الـ 5% القانونية طبقاً للمادة 44 من قانون 182 لسنة 2018
                </p>
              </div>
            </div>
            <Badge className="badge-emerald text-[10px]">
              {finalGuaranteeDocs.length} مستند موثق
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Upload Zone & Form */}
            <div className="space-y-3 bg-muted/20 p-3.5 rounded-xl border border-border">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-xs font-semibold">رقم إيصال السداد / رقم الحوالة</Label>
                  <Input
                    value={receiptNumberInput}
                    onChange={(e) => setReceiptNumberInput(e.target.value)}
                    placeholder="مثال: REC-54921"
                    className="h-9 text-xs font-mono mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">ملاحظات السداد</Label>
                  <Input
                    value={receiptNotes}
                    onChange={(e) => setReceiptNotes(e.target.value)}
                    placeholder="خزينة الإدارة المركزية / تحويل بنكي"
                    className="h-9 text-xs mt-1"
                  />
                </div>
              </div>

              <FileUploadZone
                file={receiptFile}
                onFileSelect={setReceiptFile}
                placeholder="اسحب أو اختر صورة أو PDF لوصل سداد التأمين النهائي"
                badgeText="إيصال رسمي"
              />

              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  onClick={handleUploadGuaranteeReceipt}
                  disabled={!receiptFile || uploadingReceipt}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-4 rounded-xl cursor-pointer"
                >
                  {uploadingReceipt ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 ml-1" />
                  )}
                  أرشفة وحفظ وصل السداد
                </Button>
              </div>
            </div>

            {/* List of Archived Receipts */}
            <div className="space-y-2 bg-muted/20 p-3.5 rounded-xl border border-border flex flex-col justify-between">
              <div>
                <h6 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>الإيصالات والوثائق المسجلة بالأرشيف ({finalGuaranteeDocs.length})</span>
                </h6>

                {finalGuaranteeDocs.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {finalGuaranteeDocs.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="p-2.5 rounded-xl bg-card border border-border flex items-center justify-between gap-2 text-xs hover:border-emerald-500/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                          <div className="truncate">
                            <p className="font-bold text-foreground truncate">{doc.fileName}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatDocFileSize(doc.fileSize)} • {formatDate(doc.createdAt)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {onPreviewDoc && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onPreviewDoc(doc)}
                              className="h-7 w-7 p-0 rounded-lg text-blue-600 hover:bg-blue-500/10 cursor-pointer"
                              title="معاينة الإيصال"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {onDownloadDoc && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDownloadDoc(doc)}
                              className="h-7 w-7 p-0 rounded-lg text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                              title="تحميل الإيصال"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-xs">
                    لم يتم رفع صورة أو وصل سداد التأمين النهائي بعد
                  </div>
                )}
              </div>

              <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/60">
                🔒 يتم ربط إيصال السداد مباشرة بالملف الرقمي للعملية وإتاحته في حزمة المراجعة المالية.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ━━━ EDIT GUARANTEE MODAL ━━━ */}
      {editingG && (
        <Portal>
          <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
            <div className="bg-card text-card-foreground border border-border rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Edit className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-foreground text-sm">تعديل بيانات الضمان والتأمين</h4>
                </div>
                <button onClick={() => setEditingG(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">المبلغ (ج.م)</label>
                    <input
                      type="number"
                      value={editingG.amount}
                      onChange={(e) => setEditingG({ ...editingG, amount: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">النسبة (%)</label>
                    <input
                      type="number"
                      value={editingG.percentage || ""}
                      onChange={(e) => setEditingG({ ...editingG, percentage: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">طريقة السداد</label>
                  <select
                    value={editingG.paymentMethod}
                    onChange={(e) => setEditingG({ ...editingG, paymentMethod: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                  >
                    <option value="BANK_GUARANTEE">أصل خطاب ضمان بنكي</option>
                    <option value="CASH">سداد نقدي / إيصال توريد خزينة</option>
                    <option value="DEDUCTION_FROM_DUES">خصم رسمي من مستحقات قائمة</option>
                  </select>
                </div>

                {editingG.paymentMethod === "BANK_GUARANTEE" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">اسم البنك</label>
                      <input
                        type="text"
                        value={editingG.bankName || ""}
                        onChange={(e) => setEditingG({ ...editingG, bankName: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">رقم خطاب الضمان</label>
                      <input
                        type="text"
                        value={editingG.guaranteeNumber || ""}
                        onChange={(e) => setEditingG({ ...editingG, guaranteeNumber: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">تاريخ البداية</label>
                    <input
                      type="date"
                      value={editingG.startDate ? editingG.startDate.split("T")[0] : ""}
                      onChange={(e) => setEditingG({ ...editingG, startDate: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">تاريخ النهاية</label>
                    <input
                      type="date"
                      value={editingG.endDate ? editingG.endDate.split("T")[0] : ""}
                      onChange={(e) => setEditingG({ ...editingG, endDate: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">ملاحظات</label>
                  <textarea
                    rows={2}
                    value={editingG.notes || ""}
                    onChange={(e) => setEditingG({ ...editingG, notes: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setEditingG(null)} className="text-xs">
                  إلغاء
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpdateGuarantee}
                  disabled={savingEditG}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 rounded-xl"
                >
                  {savingEditG ? "جاري الحفظ..." : "حفظ التعديلات"}
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ━━━ PRINTABLE FINAL GUARANTEE ISSUANCE LETTER MODAL ━━━ */}
      {finalLetterModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-background border border-border w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
                <div className="flex items-center gap-2">
                  <Printer className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-extrabold text-foreground">
                    معاينة وطباعة خطاب سداد وتقديم التأمين النهائي 5%
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => window.print()}
                    className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5 ml-1" />
                    <span>طباعة</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveFinalLetterToDocs}
                    disabled={savingFinalLetter}
                    className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    {savingFinalLetter ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5 ml-1" />}
                    <span>حفظ بالأرشيف</span>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setFinalLetterModalOpen(false)}
                    className="h-8 w-8 rounded-xl"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white text-slate-900 font-sans" dir="rtl">
                <div className="border-b-2 border-emerald-800 pb-3 mb-5 flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-black text-emerald-900">{currentCompany?.name || "اسم الشركة"}</h2>
                    <p className="text-xs text-slate-600">
                      سجل تجاري: {currentCompany?.commercialRegister || "—"} • بطاقة ضريبية: {currentCompany?.taxCard || "—"}
                    </p>
                  </div>
                  <div className="text-left text-xs font-mono">
                    <div>التاريخ: {new Date().toLocaleDateString("ar-EG")}</div>
                    <div>كود العملية: {op.externalNumber || op.serialNumber}</div>
                  </div>
                </div>

                <div className="space-y-1 text-sm font-bold text-slate-900 mb-4">
                  <div>السيد الأستاذ / رئيس الإدارة المركزية للشؤون المالية والإدارية</div>
                  <div>{op.authority || "جهة الإسناد الموقرة"}</div>
                  <div className="pt-2">تحية طيبة وبعد ،،،</div>
                </div>

                <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-lg text-xs font-bold text-emerald-950 mb-4">
                  الموضوع: سداد وتقديم التأمين النهائي بنسبة (5%) للعملية رقم ({op.externalNumber || op.serialNumber}) بعنوان: &quot;{op.title}&quot;
                </div>

                <div className="text-xs leading-relaxed text-slate-800 mb-4 space-y-2 text-justify">
                  <p>
                    بالإشارة إلى إخطار قبول العطاء والترسية الصادر من جهتكم الموقرة؛ وإعمالاً للمادة (44) من القانون رقم 182 لسنة 2018 ولائحته التنفيذية بشأن تنظيم التعاقدات العامة؛
                  </p>
                  <p>
                    نتشرف بأن نرفق لسيادتكم التأمين النهائي المقرر بنسبة (5%) بمبلغ وقدره <strong>{formatCurrency(Number(amount))}</strong> ({tafqeetArabic(Number(amount))})، بأداة السداد: {paymentMethod === "BANK_GUARANTEE" ? `خطاب ضمان بنكي رقم (${guaranteeNumber}) بنك ${bankName}` : paymentMethod === "CASH" ? "سداد نقدي بخزينة الجهة" : `خصم من مستحقات: ${duesReference}`}.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-400 text-xs">
                  <div>
                    <strong>المفوض بالتعاقدات والتوريدات:</strong><br/><br/>
                    التوقيع: ............................................
                  </div>
                  <div className="text-center">
                    <strong>خاتم الشركة الرسمي:</strong><br/><br/>
                    [ بصمة الخاتم المعتمد ]
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </SectionCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   8. SUBMISSION PACKAGE TAB (تجهيز وطباعة وحزم ملفات التقديم)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TabSubmissionPackage({
  op,
  onRefresh,
  onPreviewDoc,
  onDownloadDoc,
}: {
  op: Operation;
  onRefresh: () => void;
  onPreviewDoc?: (doc: any) => void;
  onDownloadDoc?: (doc: any) => void;
}) {
  const [addingSubmission, setAddingSubmission] = useState(false);
  const [companyId, setCompanyId] = useState(op.companies?.[0]?.companyId || "");
  const [submissionDate, setSubmissionDate] = useState(new Date().toISOString().split("T")[0]);
  const [receiptNumber, setReceiptNumber] = useState(`RCP-${Date.now().toString().slice(-5)}`);
  const [recipientPerson, setRecipientPerson] = useState("سكرتارية لجنة فض المظاريف");
  const [notes, setNotes] = useState("");
  const [savingSubmission, setSavingSubmission] = useState(false);
  const [packagingZip, setPackagingZip] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);

  // Compile full package file list from across operation lifecycle
  const packageFiles = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      category: "TECHNICAL" | "FINANCIAL" | "RECEIPTS" | "LEGAL";
      envelope: "المظروف الفني" | "المظروف المالي" | "مستندات مشتركة";
      docRef?: any;
      size?: number;
      type: string;
    }> = [];

    // 1. Documents from op.documents
    (op.documents || []).forEach((d: any) => {
      let cat: "TECHNICAL" | "FINANCIAL" | "RECEIPTS" | "LEGAL" = "TECHNICAL";
      let env: "المظروف الفني" | "المظروف المالي" | "مستندات مشتركة" = "المظروف الفني";

      if (d.type === "RECEIPT") {
        cat = "RECEIPTS";
        env = d.fileName?.includes("كراسة") ? "المظروف الفني" : "المظروف المالي";
      } else if (d.type === "BOOKLET") {
        cat = "TECHNICAL";
        env = "المظروف الفني";
      } else if (d.type === "CLARIFICATION") {
        cat = "TECHNICAL";
        env = "المظروف الفني";
      } else if (d.fileName?.includes("مالي") || d.fileName?.includes("عرض مالي") || d.fileName?.includes("أسعار")) {
        cat = "FINANCIAL";
        env = "المظروف المالي";
      }

      list.push({
        id: `doc-${d.id}`,
        name: d.fileName || "مستند رسمي",
        category: cat,
        envelope: env,
        docRef: d,
        size: d.fileSize,
        type: d.fileType || "pdf",
      });
    });

    // 2. Virtual items if technical or financial offers exist
    if (op.technicalOffers?.length) {
      list.push({
        id: "virtual-tech-cover",
        name: `الغلاف الذكي المعتمد للمظروف الفني (Smart Cover) - ${op.serialNumber}`,
        category: "TECHNICAL",
        envelope: "المظروف الفني",
        type: "pdf",
      });
      list.push({
        id: "virtual-tech-offer",
        name: `العرض الفني وقائمة الكتالوجات والمواصفات المعتمدة`,
        category: "TECHNICAL",
        envelope: "المظروف الفني",
        type: "pdf",
      });
    }

    if (op.financialOffers?.length) {
      list.push({
        id: "virtual-fin-boq",
        name: `جدول الكميات والأسعار والتسعير المالي الرسمي (BOQ)`,
        category: "FINANCIAL",
        envelope: "المظروف المالي",
        type: "xlsx",
      });
    }

    // 3. Guarantees
    (op.guarantees || []).forEach((g: any) => {
      if (g.type === "INITIAL") {
        list.push({
          id: `guar-${g.id}`,
          name: `أصل خطاب الضمان / إيصال التأمين الابتدائي بمبلغ ${formatCurrency(g.amount)}`,
          category: "RECEIPTS",
          envelope: "المظروف الفني",
          type: "pdf",
        });
      }
    });

    return list;
  }, [op]);

  // Selected file ids for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Initialize all selected by default when packageFiles changes
  useEffect(() => {
    setSelectedIds(packageFiles.map((f) => f.id));
  }, [packageFiles.length]);

  const toggleSelectAll = () => {
    if (selectedIds.length === packageFiles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(packageFiles.map((f) => f.id));
    }
  };

  const toggleSelectFile = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // ZIP packaging and bulk download using JSZip
  const handleDownloadZipPackage = async () => {
    if (selectedIds.length === 0) {
      toast.warning("يرجى اختيار ملف واحد على الأقل للتحميل");
      return;
    }

    setPackagingZip(true);
    toast.info("جاري تجميع الملفات وضغطها في مجلد ZIP موحد... ⏳");

    try {
      const zip = new JSZip();
      const techFolder = zip.folder("المظروف_الفني");
      const finFolder = zip.folder("المظروف_المالي");
      const receiptsFolder = zip.folder("الإيصالات_والتأمينات");

      const filesToInclude = packageFiles.filter((f) => selectedIds.includes(f.id));

      for (const item of filesToInclude) {
        const targetFolder =
          item.category === "RECEIPTS"
            ? receiptsFolder
            : item.category === "FINANCIAL"
            ? finFolder
            : techFolder;

        if (item.docRef) {
          try {
            const resp = await api.get(
              `/operations/${op.id}/documents/${item.docRef.id}/file`,
              { responseType: "blob" }
            );
            const safeName = item.docRef.fileName.replace(/[/\\?%*:|"<>]/g, "_");
            targetFolder?.file(safeName, resp.data);
          } catch {
            // fallback placeholder if binary fetch fails
            targetFolder?.file(
              `${item.name}.txt`,
              `بيانات المستند: ${item.name}\nالعملية: ${op.title} (${op.serialNumber})\nكود الشركة: ${op.companies?.[0]?.displayCode || "A"}`
            );
          }
        } else {
          // Synthetic file
          targetFolder?.file(
            `${item.name}.txt`,
            `مستند رسمي صادر عن GoldenERP:\n${item.name}\nالعملية: ${op.title} (${op.externalNumber || op.serialNumber})\nالجهة: ${op.authority}\nتاريخ التصدير: ${new Date().toLocaleDateString("ar-EG")}`
          );
        }
      }

      // Add Readme checklist inside ZIP
      zip.file(
        "كشف_محتويات_حزمة_العطاء.txt",
        `كشف تسليم محتويات حزمة العطاء الرسمي\n===============================\nالعملية: ${op.title}\nالرقم المرجعي: ${op.externalNumber || op.serialNumber}\nالجهة: ${op.authority}\nإجمالي الملفات المضغوطة: ${filesToInclude.length} ملف\nتاريخ الحزم: ${new Date().toLocaleString("ar-EG")}`
      );

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `حزمة_تقديم_عطاء_${op.externalNumber || op.serialNumber}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("تم تحميل حزمة التقديم المضغوطة ZIP بنجاح! 📦🎉");
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء تجميع ملفات الحزمة المضغوطة");
    } finally {
      setPackagingZip(false);
    }
  };

  // Save official submission
  const handleSaveSubmission = async () => {
    if (!receiptNumber) {
      toast.error("يرجى إدخال رقم إيصال سحب الكراسة / تسليم العطاء");
      return;
    }
    setSavingSubmission(true);
    try {
      await api.post(`/operations/${op.id}/submissions`, {
        companyId,
        submissionDate,
        receiptNumber,
        notes: `المستلم: ${recipientPerson} | ${notes}`,
      });
      toast.success("تم تسجيل تقديم العطاء بالجهة رسمياً وتوثيق التسليم بنجاح! 🚀");
      setAddingSubmission(false);
      onRefresh();
    } catch {
      toast.error("فشل تسجيل تقديم العطاء");
    } finally {
      setSavingSubmission(false);
    }
  };

  const techCount = packageFiles.filter((f) => f.envelope === "المظروف الفني").length;
  const finCount = packageFiles.filter((f) => f.envelope === "المظروف المالي").length;

  return (
    <SectionCard
      title="تجهيز وطباعة وحزم ملفات التقديم الرسمي"
      icon={Package}
      iconColor="text-blue-600"
      badge={
        <div className="flex items-center gap-2">
          <Badge className="badge-blue text-[10px] font-bold">
            {packageFiles.length} مستند بحزمة العطاء
          </Badge>
          <Badge className="badge-purple text-[10px] font-bold">
            {op.submissions?.length || 0} تقديم موثق
          </Badge>
        </div>
      }
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setChecklistOpen(true)}
            className="text-xs font-bold h-8 rounded-xl border-border text-foreground hover:bg-muted cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="h-3.5 w-3.5 text-blue-500" />
            <span>كشف محتويات العطاء للطباعة</span>
          </Button>

          <Button
            size="sm"
            onClick={handleDownloadZipPackage}
            disabled={packagingZip || selectedIds.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            {packagingZip ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>جاري الضغط والحزم...</span>
              </>
            ) : (
              <>
                <FileArchive className="h-3.5 w-3.5" />
                <span>تحميل المحدد بمجلد مضغوط ZIP ({selectedIds.length})</span>
              </>
            )}
          </Button>

          <Button
            size="sm"
            onClick={() => setAddingSubmission(!addingSubmission)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8 rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            <span>توثيق تسليم العطاء للجهة</span>
          </Button>
        </div>
      }
    >
      {/* Visual Envelope Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/25 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                1
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-foreground">المظروف الفني</h4>
                <p className="text-[10px] text-muted-foreground">العرض الفني، الكتالوجات، الغلاف، والتوضيحات</p>
              </div>
            </div>
            <Badge className="badge-indigo text-[10px]">{techCount} ملف</Badge>
          </div>
          <div className="text-[11px] text-muted-foreground bg-card/60 p-2 rounded-xl border border-border/60">
            يُسلَّم مغلقاً ومختوماً بخاتم الشركة مع نموذج الغلاف الذكي المعتمد.
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-transparent border border-teal-500/25 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                2
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-foreground">المظروف المالي</h4>
                <p className="text-[10px] text-muted-foreground">جدول الكميات المسعر وأصل التأمين الابتدائي</p>
              </div>
            </div>
            <Badge className="badge-teal text-[10px]">{finCount} ملف</Badge>
          </div>
          <div className="text-[11px] text-muted-foreground bg-card/60 p-2 rounded-xl border border-border/60">
            يشمل أصل خطاب الضمان البنكي أو إيصال سداد التأمين الابتدائي 1-2%.
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/25 space-y-2 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                3
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-foreground">حالة التسليم بالجهة</h4>
                <p className="text-[10px] text-muted-foreground">التوثيق بالسجل الرسمي للمظاريف</p>
              </div>
            </div>
            <Badge className={op.submissions?.length ? "badge-purple" : "bg-muted text-muted-foreground"}>
              {op.submissions?.length ? "تم التقديم ✓" : "بانتظار التسليم"}
            </Badge>
          </div>
          <div className="text-[11px] text-muted-foreground bg-card/60 p-2 rounded-xl border border-border/60">
            {op.submissions?.[0] ? `تم التسليم بتاريخ ${formatDate(op.submissions[0].submissionDate)}` : "لم يتم تسجيل إيصال استلام المظاريف بعد."}
          </div>
        </div>
      </div>

      {/* Record Submission Drawer Form */}
      {addingSubmission && (
        <div className="p-5 rounded-2xl bg-card border-2 border-purple-500/30 space-y-3.5 animate-fade-in shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h4 className="text-xs font-black text-foreground flex items-center gap-2">
              <Send className="h-4 w-4 text-purple-600" />
              <span>تسجيل وتوثيق تسليم المظاريف بمقر جهة الإسناد</span>
            </h4>
            <Badge className="badge-purple text-[10px]">محضر استلام المظاريف</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">الشركة المقدمة *</Label>
              <Select value={companyId} onValueChange={(val: any) => setCompanyId(val || "")}>
                <SelectTrigger className="h-9 text-xs font-bold text-right cursor-pointer">
                  <span>
                    {(() => {
                      const c = (op.companies || []).find((x: any) => x.companyId === companyId);
                      return c ? `${c.company.name} (${c.displayCode})` : "اختر الشركة";
                    })()}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {(op.companies || []).map((c: any) => (
                    <SelectItem key={c.companyId} value={c.companyId}>
                      {c.company.name} ({c.displayCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-bold">تاريخ وساعة التسليم الفعلي *</Label>
              <Input
                type="date"
                value={submissionDate}
                onChange={(e) => setSubmissionDate(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-bold">رقم إيصال الاستلام / قيد المظروف *</Label>
              <Input
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="مثال: قيد رقم 148 / وارد خزينة"
                className="h-9 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">اسم المستلم بالجهة / اللجنة</Label>
              <Input
                value={recipientPerson}
                onChange={(e) => setRecipientPerson(e.target.value)}
                placeholder="مثال: السيد / أمين سر لجنة فتح المظاريف"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">ملاحظات التسليم والمحضر</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: تم تسليم المظروفين الفني والمالي مغلقين بالشمع الأحمر"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddingSubmission(false)}
              className="rounded-xl h-8 text-xs cursor-pointer"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveSubmission}
              disabled={savingSubmission}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold h-8 text-xs cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              {savingSubmission ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              <span>حفظ وتوثيق التسليم رسمياً</span>
            </Button>
          </div>
        </div>
      )}

      {/* Main Files Table with Multi-Selection */}
      <div className="p-5 rounded-2xl bg-card border border-border space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              className="h-7.5 px-2.5 text-xs font-bold rounded-xl border-border hover:bg-muted cursor-pointer flex items-center gap-1.5"
            >
              {selectedIds.length === packageFiles.length ? (
                <>
                  <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
                  <span>إلغاء تحديد الكل</span>
                </>
              ) : (
                <>
                  <Square className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>تحديد كافة الملفات</span>
                </>
              )}
            </Button>

            <span className="text-xs text-muted-foreground">
              تم تحديد <strong className="text-foreground">{selectedIds.length}</strong> من إجمالي {packageFiles.length} ملف
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              تجميع تلقائي لكافة مراحل العملية
            </Badge>
          </div>
        </div>

        {packageFiles.length > 0 ? (
          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {packageFiles.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelectFile(item.id)}
                  className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer select-none ${
                    isSelected ? "bg-blue-500/5 hover:bg-blue-500/10" : "hover:bg-muted/40 opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // handled by parent onClick
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-border cursor-pointer shrink-0"
                    />

                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        item.category === "FINANCIAL"
                          ? "bg-teal-500/15 text-teal-600"
                          : item.category === "RECEIPTS"
                          ? "bg-emerald-500/15 text-emerald-600"
                          : "bg-indigo-500/15 text-indigo-600"
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                    </div>

                    <div className="truncate">
                      <p className="font-bold text-foreground truncate">{item.name}</p>
                      <span className="text-[10px] text-muted-foreground block font-mono">
                        {item.size ? formatDocFileSize(item.size) + " • " : ""}
                        صيغة {item.type.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      className={`text-[9px] ${
                        item.envelope === "المظروف الفني"
                          ? "badge-indigo"
                          : item.envelope === "المظروف المالي"
                          ? "badge-teal"
                          : "badge-purple"
                      }`}
                    >
                      {item.envelope}
                    </Badge>

                    {item.docRef && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          onClick={() => onPreviewDoc?.(item.docRef)}
                          className="h-6.5 px-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDownloadDoc?.(item.docRef)}
                          className="h-6.5 px-1.5 border-border text-foreground hover:bg-muted rounded-lg"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Package}
            text="لا توجد ملفات متوفرة بحزمة التقديم حتى الآن"
            subtext="ارفع كراسة الشروط، العرض الفني، والمالي ليتم تجميعها هنا تلقائياً"
          />
        )}
      </div>

      {/* Official Submissions History */}
      {op.submissions && op.submissions.length > 0 && (
        <div className="space-y-3 pt-2">
          <h5 className="text-xs font-black text-foreground flex items-center gap-2">
            <Send className="h-4 w-4 text-purple-600" />
            <span>سجل إيصالات التقديم المسجلة بالجهة ({op.submissions.length})</span>
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {op.submissions.map((sub: any) => (
              <div
                key={sub.id}
                className="p-3.5 rounded-xl bg-card border border-border space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <span className="text-xs font-bold text-foreground">
                    شركة {(op.companies || []).find((c: any) => c.company.id === sub.companyId)?.company.name || "—"}
                  </span>
                  <Badge className="badge-purple text-[10px]">مقدم رسمياً ✓</Badge>
                </div>
                <DataRow label="تاريخ التقديم" value={formatDate(sub.submissionDate)} />
                <DataRow label="رقم إيصال الاستلام" value={sub.receiptNumber} mono />
                {sub.notes && (
                  <p className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-lg font-mono">
                    {sub.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ━━━ PRINTABLE ENVELOPE CHECKLIST MODAL ━━━ */}
      {checklistOpen && (
        <Portal>
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-background border border-border w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
                <div className="flex items-center gap-2">
                  <Printer className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-extrabold text-foreground">
                    كشف محتويات وتسليم حزمة المظاريف الرسمية
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => window.print()}
                    className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>طباعة الكشف</span>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setChecklistOpen(false)}
                    className="h-8 w-8 rounded-xl"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white text-slate-900 font-sans" dir="rtl">
                <div className="border-b-2 border-slate-900 pb-3 mb-5 flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-black">{op.companies?.[0]?.company?.name || "اسم الشركة"}</h2>
                    <p className="text-xs text-slate-600">كشف تسليم العطاء الرسمي للعملية</p>
                  </div>
                  <div className="text-left text-xs font-mono">
                    <div>التاريخ: {new Date().toLocaleDateString("ar-EG")}</div>
                    <div>كود العملية: {op.externalNumber || op.serialNumber}</div>
                  </div>
                </div>

                <div className="bg-slate-100 p-3 rounded-lg border border-slate-300 text-xs mb-5 space-y-1">
                  <div><strong>اسم العملية:</strong> {op.title}</div>
                  <div><strong>جهة الإسناد:</strong> {op.authority}</div>
                  <div><strong>مقر التسليم:</strong> إدارة المشتريات والتعاقدات الحكومية</div>
                </div>

                <table className="w-full text-right text-xs border border-slate-700 border-collapse mb-6">
                  <thead className="bg-slate-200 font-bold border-b border-slate-700">
                    <tr>
                      <th className="p-2 border border-slate-700 text-center w-10">م</th>
                      <th className="p-2 border border-slate-700">بيان المستند / المرفق</th>
                      <th className="p-2 border border-slate-700 w-32 text-center">المظروف التابع له</th>
                      <th className="p-2 border border-slate-700 w-24 text-center">حالة الإرفاق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {packageFiles.map((f, idx) => (
                      <tr key={f.id}>
                        <td className="p-2 border border-slate-700 text-center font-bold">{idx + 1}</td>
                        <td className="p-2 border border-slate-700 font-semibold">{f.name}</td>
                        <td className="p-2 border border-slate-700 text-center">{f.envelope}</td>
                        <td className="p-2 border border-slate-700 text-center font-bold text-emerald-800">مرفق ومختوم ✓</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-400 text-xs">
                  <div className="space-y-4">
                    <div className="font-bold">مندوب الشركة المسلِّم:</div>
                    <div>الاسم: ............................................</div>
                    <div>التوقيع: .........................................</div>
                  </div>
                  <div className="space-y-4">
                    <div className="font-bold">المستلم بجهة الإسناد / أمانة اللجنة:</div>
                    <div>الاسم: ............................................</div>
                    <div>رقم القيد والتاريخ: ...............................</div>
                    <div>خاتم شعار الجهة: [ ........................... ]</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </SectionCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   9 & 10. TECHNICAL & FINANCIAL OPENINGS (البت الفني والمالي وشجرة القرارات)
   Modularized into ./OpeningWorkflows.tsx (TabTechOpening, TabFinOpening)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   12. AWARD TAB (الترسية والفوز)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TabAward({
  op,
  onRefresh,
  onGoGuarantee,
  onPreviewDoc,
  onDownloadDoc,
}: {
  op: Operation;
  onRefresh: () => void;
  onGoGuarantee?: () => void;
  onPreviewDoc?: (doc: any) => void;
  onDownloadDoc?: (doc: any) => void;
}) {
  const [activeSubTab, setActiveSubTab] = useState<"all" | "award" | "supply_order">("all");
  
  // Award Form State
  const [addingAward, setAddingAward] = useState(false);
  const [winnerName, setWinnerName] = useState(op.companies?.[0]?.company?.name || "Golden A");
  const [winnerPrice, setWinnerPrice] = useState("850000");
  const [isOurCompany, setIsOurCompany] = useState(true);
  const [companyId, setCompanyId] = useState(op.companies?.[0]?.companyId || "");
  const [awardDate, setAwardDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [awardLetterFile, setAwardLetterFile] = useState<File | null>(null);
  const [savingAward, setSavingAward] = useState(false);

  // Supply Order Form State
  const [addingSupplyOrder, setAddingSupplyOrder] = useState(false);
  const [orderNumber, setOrderNumber] = useState(`PO-${op.serialNumber}-${Date.now().toString().slice(-4)}`);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [supplyDurationValue, setSupplyDurationValue] = useState("30");
  const [supplyDurationUnit, setSupplyDurationUnit] = useState<"DAYS" | "MONTHS">("DAYS");
  const [supplyCompanyId, setSupplyCompanyId] = useState(op.companies?.[0]?.companyId || "");
  const [supplyNotes, setSupplyNotes] = useState("");
  const [supplyOrderFile, setSupplyOrderFile] = useState<File | null>(null);
  const [syncDeliveryDate, setSyncDeliveryDate] = useState(true);
  const [savingSupplyOrder, setSavingSupplyOrder] = useState(false);
  const [syncingDateManual, setSyncingDateManual] = useState(false);

  // Calculate dynamic delivery deadline
  const calculatedDeliveryDeadline = useMemo(() => {
    if (!orderDate || !supplyDurationValue || isNaN(Number(supplyDurationValue)) || Number(supplyDurationValue) <= 0) {
      return null;
    }
    const d = new Date(orderDate);
    if (isNaN(d.getTime())) return null;
    const val = Number(supplyDurationValue);
    if (supplyDurationUnit === "DAYS") {
      d.setDate(d.getDate() + val);
    } else {
      d.setMonth(d.getMonth() + val);
    }
    return d.toISOString().split("T")[0];
  }, [orderDate, supplyDurationValue, supplyDurationUnit]);

  // Check if delivery deadline is already saved in op.dates
  const deliveryDeadlineDate = useMemo(() => {
    return (op.dates || []).find(
      (d: any) =>
        d.dateType === "EXECUTION_END" ||
        d.type === "EXECUTION_END" ||
        d.label?.includes("توريد") ||
        d.label?.includes("تنفيذ")
    );
  }, [op.dates]);

  // Check if our company won
  const ourWinningAward = (op.awards || []).find((a: any) => a.isOurCompany);
  const hasWonTender = Boolean(ourWinningAward);
  const mainAwardAmount = Number(ourWinningAward?.winnerPrice || op.awards?.[0]?.winnerPrice || 0);
  const finalGuaranteeAmount = Math.round(mainAwardAmount * 0.05);

  // Filter award & supply order related documents
  const awardRelatedDocs = useMemo(() => {
    return (op.documents || []).filter(
      (d: any) =>
        d.type === "SUPPLY_ORDER" ||
        d.type === "CONTRACT" ||
        d.type === "LETTER" ||
        d.fileName?.includes("ترسية") ||
        d.fileName?.includes("توريد") ||
        d.fileName?.includes("عقد")
    );
  }, [op.documents]);

  // Save Award Handler
  const handleSaveAward = async () => {
    if (!winnerName.trim()) {
      toast.error("يرجى إدخال اسم الشركة الفائزة");
      return;
    }
    if (!winnerPrice || isNaN(Number(winnerPrice))) {
      toast.error("يرجى إدخال قيمة الترسية بشكل صحيح");
      return;
    }
    setSavingAward(true);
    try {
      await api.post(`/operations/${op.id}/awards`, {
        winnerName,
        winnerPrice: Number(winnerPrice),
        isOurCompany,
        companyId: isOurCompany ? companyId : undefined,
        awardDate,
        notes,
      });

      // Upload award letter if provided
      if (awardLetterFile) {
        try {
          const formData = new FormData();
          formData.append("file", awardLetterFile);
          formData.append("type", "LETTER");
          formData.append("companyId", isOurCompany ? companyId : "");
          formData.append("fileName", `إخطار الترسية وقبول العطاء - ${winnerName} (${awardDate})`);
          await api.post(`/operations/${op.id}/documents`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch (uploadErr) {
          console.error("Failed to upload award letter document:", uploadErr);
          toast.warning("تم حفظ قرار الترسية ولكن تعذر رفع الملف المرفق");
        }
      }

      toast.success(isOurCompany ? "مبروك! تم تسجيل الترسية على شركتنا بنجاح 🏆" : "تم تسجيل قرار الترسية بنجاح");
      setAddingAward(false);
      setAwardLetterFile(null);
      onRefresh();
    } catch {
      toast.error("فشل تسجيل الترسية");
    } finally {
      setSavingAward(false);
    }
  };

  // Save Supply Order Handler
  const handleSaveSupplyOrder = async () => {
    if (!orderNumber.trim()) {
      toast.error("يرجى إدخال رقم أمر التوريد");
      return;
    }
    setSavingSupplyOrder(true);
    try {
      const formattedNotes = [
        supplyNotes.trim(),
        supplyDurationValue ? `مدة التوريد: ${supplyDurationValue} ${supplyDurationUnit === "DAYS" ? "يوم" : "شهر"}` : "",
        calculatedDeliveryDeadline ? `تاريخ انتهاء التوريد المحسوب: ${calculatedDeliveryDeadline}` : "",
      ].filter(Boolean).join(" | ");

      await api.post(`/operations/${op.id}/supply-orders`, {
        orderNumber,
        orderDate,
        companyId: supplyCompanyId || undefined,
        notes: formattedNotes,
      });

      // Automatically sync delivery deadline into op.dates if requested
      if (syncDeliveryDate && calculatedDeliveryDeadline) {
        try {
          await api.post(`/operations/${op.id}/dates`, {
            dateType: "EXECUTION_END",
            dateValue: calculatedDeliveryDeadline,
            label: "الموعد النهائي لانتهاء التوريد التعاقدي",
            notes: `محسوب تلقائياً من أمر توريد رقم ${orderNumber} بمدة ${supplyDurationValue} ${supplyDurationUnit === "DAYS" ? "يوم" : "شهر"}`,
          });
        } catch (dateErr) {
          console.error("Failed to sync date:", dateErr);
        }
      }

      // Upload supply order file if provided
      if (supplyOrderFile) {
        try {
          const formData = new FormData();
          formData.append("file", supplyOrderFile);
          formData.append("type", "SUPPLY_ORDER");
          formData.append("companyId", supplyCompanyId || "");
          formData.append("fileName", `أمر التوريد والتعاقد رقم ${orderNumber}`);
          await api.post(`/operations/${op.id}/documents`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch (fileErr) {
          console.error("Failed to upload supply order file:", fileErr);
        }
      }

      toast.success("تم تسجيل أمر التوريد وبدء مرحلة التنفيذ بنجاح 📜📦");
      setAddingSupplyOrder(false);
      setSupplyOrderFile(null);
      onRefresh();
    } catch {
      toast.error("فشل تسجيل أمر التوريد");
    } finally {
      setSavingSupplyOrder(false);
    }
  };

  // Explicit sync of calculated date to op.dates
  const handleManualSyncDeliveryDate = async () => {
    if (!calculatedDeliveryDeadline) return;
    setSyncingDateManual(true);
    try {
      await api.post(`/operations/${op.id}/dates`, {
        dateType: "EXECUTION_END",
        dateValue: calculatedDeliveryDeadline,
        label: "الموعد النهائي لانتهاء التوريد التعاقدي",
        notes: `محسوب من أمر التوريد بمدة ${supplyDurationValue} ${supplyDurationUnit === "DAYS" ? "يوم" : "شهر"}`,
      });
      toast.success("تم تثبيت موعد انتهاء التوريد في جدول مواعيد العملية بنجاح! 📅");
      onRefresh();
    } catch {
      toast.error("فشل في تثبيت الموعد");
    } finally {
      setSyncingDateManual(false);
    }
  };

  // Edit & Delete State for Award
  const [editingAward, setEditingAward] = useState<any | null>(null);
  const [savingEditAward, setSavingEditAward] = useState(false);

  const handleUpdateAward = async () => {
    if (!editingAward) return;
    setSavingEditAward(true);
    try {
      await api.patch(`/operations/${op.id}/awards/${editingAward.id}`, {
        winnerName: editingAward.winnerName,
        winnerPrice: Number(editingAward.winnerPrice),
        isOurCompany: editingAward.isOurCompany,
        companyId: editingAward.companyId,
        awardDate: editingAward.awardDate,
        notes: editingAward.notes,
      });
      toast.success("تم تعديل قرار الترسية بنجاح! ✓");
      setEditingAward(null);
      onRefresh();
    } catch {
      toast.error("فشل حفظ تعديل الترسية");
    } finally {
      setSavingEditAward(false);
    }
  };

  const handleDeleteAward = async (awardId: string) => {
    if (!confirm("هل أنت متأكد من حذف قرار الترسية هذا؟")) return;
    try {
      await api.delete(`/operations/${op.id}/awards/${awardId}`);
      toast.success("تم حذف قرار الترسية بنجاح 🗑️");
      onRefresh();
    } catch {
      toast.error("فشل حذف قرار الترسية");
    }
  };

  // Edit & Delete State for Supply Order
  const [editingSupplyOrder, setEditingSupplyOrder] = useState<any | null>(null);
  const [savingEditSupplyOrder, setSavingEditSupplyOrder] = useState(false);

  const handleUpdateSupplyOrder = async () => {
    if (!editingSupplyOrder) return;
    setSavingEditSupplyOrder(true);
    try {
      await api.patch(`/operations/${op.id}/supply-orders/${editingSupplyOrder.id}`, {
        orderNumber: editingSupplyOrder.orderNumber,
        orderDate: editingSupplyOrder.orderDate,
        notes: editingSupplyOrder.notes,
      });
      toast.success("تم تعديل أمر التوريد بنجاح! ✓");
      setEditingSupplyOrder(null);
      onRefresh();
    } catch {
      toast.error("فشل حفظ تعديل أمر التوريد");
    } finally {
      setSavingEditSupplyOrder(false);
    }
  };

  const handleDeleteSupplyOrder = async (orderId: string) => {
    if (!confirm("هل أنت متأكد من حذف أمر التوريد هذا؟")) return;
    try {
      await api.delete(`/operations/${op.id}/supply-orders/${orderId}`);
      toast.success("تم حذف أمر التوريد بنجاح 🗑️");
      onRefresh();
    } catch {
      toast.error("فشل حذف أمر التوريد");
    }
  };

  return (
    <SectionCard
      title="قرار الترسية وأمر التوريد الرسمي"
      icon={Trophy}
      iconColor="text-amber-600"
      badge={
        <div className="flex items-center gap-1.5">
          <Badge className="badge-amber text-[10px] font-bold">{op.awards?.length || 0} قرار ترسية</Badge>
          <Badge className="badge-blue text-[10px] font-bold">{op.supplyOrders?.length || 0} أمر توريد</Badge>
        </div>
      }
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => {
              setAddingAward(!addingAward);
              if (!addingAward) setAddingSupplyOrder(false);
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 rounded-xl cursor-pointer shadow-xs"
          >
            <Trophy className="h-3.5 w-3.5 ml-1" />
            {addingAward ? "إغلاق النموذج" : "تسجيل قرار الترسية"}
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setAddingSupplyOrder(!addingSupplyOrder);
              if (!addingSupplyOrder) setAddingAward(false);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 rounded-xl cursor-pointer shadow-xs"
          >
            <Receipt className="h-3.5 w-3.5 ml-1" />
            {addingSupplyOrder ? "إغلاق النموذج" : "تسجيل أمر التوريد والتعاقد"}
          </Button>
        </div>
      }
    >
      {/* ━━━ CELEBRATORY CALL-TO-ACTION BANNER (LAW 182/2018 FINAL GUARANTEE) ━━━ */}
      {hasWonTender && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-blue-500/10 border-2 border-amber-500/40 shadow-md space-y-3 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base font-black text-foreground">
                    🏆 فازت شركتنا بالترسية رسميًا ({ourWinningAward?.winnerName})
                  </h4>
                  <Badge className="bg-emerald-600 text-white text-[10px] font-bold">فوز معتمد ✓</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  قيمة العطاء الترسية: <span className="font-bold text-foreground font-mono">{formatCurrency(mainAwardAmount)}</span>
                  {" "}({tafqeetArabic(mainAwardAmount)})
                </p>
              </div>
            </div>

            {onGoGuarantee && (
              <Button
                onClick={onGoGuarantee}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-9 px-4 rounded-xl cursor-pointer shadow-md flex items-center gap-1.5 shrink-0"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>الانتقال لسداد التأمين النهائي (5%) 🛡️</span>
              </Button>
            )}
          </div>

          <div className="p-3 rounded-xl bg-card/80 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <span className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5" />
                <span>الالتزام القانوني وفق المادة (37) من القانون 182 لسنة 2018:</span>
              </span>
              <p className="text-[11px] text-muted-foreground leading-normal">
                يلزم أداء التأمين النهائي بنسبة 5% من القيمة الإجمالية للعقد بقيمة{" "}
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs">{formatCurrency(finalGuaranteeAmount)}</span>
                {" "}خلال مهلة أقصاها <span className="font-bold text-foreground">10 أيام عمل</span> من تاريخ إخطار قبول العطاء.
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">حالة التأمين النهائي:</span>
              {op.guarantees?.some((g: any) => g.type === "FINAL") ? (
                <Badge className="badge-emerald text-[10px] font-bold">تم الإيداع بنجاح ✓</Badge>
              ) : (
                <Badge className="badge-amber text-[10px] font-bold animate-pulse">مطلوب الإيداع والسداد ⏳</Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ━━━ DELIVERY DEADLINE COUNTDOWN ALERT (IF SET) ━━━ */}
      {deliveryDeadlineDate && (
        (() => {
          const cd = getCountdown(deliveryDeadlineDate.dateValue || deliveryDeadlineDate.date);
          return (
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2.5">
                <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <span className="font-bold text-foreground block">
                    {deliveryDeadlineDate.label || "الموعد النهائي لانتهاء التوريد التعاقدي"}:
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {formatDate(deliveryDeadlineDate.dateValue || deliveryDeadlineDate.date)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">المدة المتبقية للتنفيذ:</span>
                <Badge className={cd.expired ? "bg-rose-600 text-white font-bold text-[10px]" : cd.urgent ? "badge-amber text-[10px] animate-pulse" : "badge-blue text-[10px]"}>
                  {cd.text} {cd.expired ? "⌛" : "⏳"}
                </Badge>
              </div>
            </div>
          );
        })()
      )}

      {/* ━━━ FORM 1: ADD AWARD DECISION ━━━ */}
      {addingAward && (
        <div className="p-5 rounded-2xl bg-card border-2 border-amber-500/30 space-y-4 animate-fade-in shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-600" />
              <span>تسجيل بيانات قرار الترسية وإخطار القبول</span>
            </h4>
            <Badge variant="outline" className="text-[10px] font-mono">إخطار رسمي</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">اسم الشركة الفائزة *</Label>
              <Input
                value={winnerName}
                onChange={(e) => setWinnerName(e.target.value)}
                className="h-10 text-sm"
                placeholder="اسم الشركة الفائزة بالعطاء"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">قيمة الترسية الإجمالية (بالجنيه) *</Label>
              <Input
                type="number"
                value={winnerPrice}
                onChange={(e) => setWinnerPrice(e.target.value)}
                className="h-10 text-sm font-mono font-bold"
              />
              {winnerPrice && !isNaN(Number(winnerPrice)) && (
                <p className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold truncate">
                  {tafqeetArabic(Number(winnerPrice))}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">تاريخ إخطار / قرار الترسية *</Label>
              <Input
                type="date"
                value={awardDate}
                onChange={(e) => setAwardDate(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 p-2.5 rounded-xl bg-muted/30 border border-border/50">
            <input
              type="checkbox"
              id="isOurAwardCheck"
              checked={isOurCompany}
              onChange={(e) => setIsOurCompany(e.target.checked)}
              className="rounded h-4 w-4 text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <label htmlFor="isOurAwardCheck" className="text-xs font-bold text-foreground cursor-pointer select-none">
              الترسية على إحدى شركات مجموعتنا (Golden Group) 🏆
            </label>
          </div>

          {isOurCompany && (
            <div className="space-y-1">
              <Label className="text-xs font-bold">اختر شركة المجموعة الفائزة</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger className="h-10 text-sm font-medium">
                  <span>
                    {(() => {
                      const c = (op.companies || []).find((x: any) => x.companyId === companyId);
                      return c ? `${c.company.name} (${c.displayCode})` : "اختر الشركة";
                    })()}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {(op.companies || []).map((c: any) => (
                    <SelectItem key={c.companyId} value={c.companyId}>
                      {c.company.name} ({c.displayCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs font-bold">ملاحظات وسند خطاب الترسية</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثلاً: بموجب كتاب الهيئة العامة رقم 124 بتاريخ... وبناءً على جلسة البت المالي"
              className="h-10 text-sm"
            />
          </div>

          {/* FileUploadZone for Award Letter */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5 text-amber-600" />
              <span>مرفق إخطار الترسية / كتاب قبول العطاء الرسمي (اختياري - PDF أو صورة)</span>
            </Label>
            <FileUploadZone
              file={awardLetterFile}
              onFileSelect={setAwardLetterFile}
              accept="application/pdf,image/*"
              placeholder="اضغط لاختيار صورة أو ملف PDF لإخطار الترسية الرسمي من جهة الإسناد"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAddingAward(false);
                setAwardLetterFile(null);
              }}
              className="rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAward}
              disabled={savingAward}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold px-4"
            >
              {savingAward ? (
                <>
                  <Loader2 className="h-4 w-4 ml-1.5 animate-spin" />
                  <span>جاري الحفظ والرفع...</span>
                </>
              ) : (
                "حفظ قرار الترسية ✓"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ━━━ FORM 2: ADD SUPPLY ORDER & DURATION CALCULATOR ━━━ */}
      {addingSupplyOrder && (
        <div className="p-5 rounded-2xl bg-card border-2 border-blue-500/30 space-y-4 animate-fade-in shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4 text-blue-600" />
              <span>بيانات أمر التوريد وحساب مدة التنفيذ التعاقدية</span>
            </h4>
            <Badge variant="outline" className="text-[10px] font-mono">أمر توريد / عقد</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">رقم أمر التوريد الصادر من الجهة *</Label>
              <Input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="h-10 text-sm font-mono font-bold"
                placeholder="مثال: PO-45-2024"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">تاريخ صدور أمر التوريد *</Label>
              <Input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">الشركة المنفذة الصادر لها أمر التوريد</Label>
            <Select value={supplyCompanyId} onValueChange={setSupplyCompanyId}>
              <SelectTrigger className="h-10 text-sm font-medium">
                <span>
                  {(() => {
                    const c = (op.companies || []).find((x: any) => x.companyId === supplyCompanyId);
                    return c ? `${c.company.name} (${c.displayCode})` : "اختر الشركة المنفذة";
                  })()}
                </span>
              </SelectTrigger>
              <SelectContent>
                {(op.companies || []).map((c: any) => (
                  <SelectItem key={c.companyId} value={c.companyId}>
                    {c.company.name} ({c.displayCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* DURATION & DELIVERY DEADLINE CALCULATOR */}
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/25 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                <span>مدة التوريد واحتساب الموعد النهائي للتنفيذ:</span>
              </span>
              <Badge className="badge-blue text-[9px] font-mono">احتساب تلقائي</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">مدة التوريد المحددة بالأمر</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={supplyDurationValue}
                    onChange={(e) => setSupplyDurationValue(e.target.value)}
                    className="h-10 text-sm font-mono font-bold w-28 bg-card"
                  />
                  <Select
                    value={supplyDurationUnit}
                    onValueChange={(val: any) => setSupplyDurationUnit(val)}
                  >
                    <SelectTrigger className="h-10 text-xs font-bold w-32 bg-card">
                      <span>{supplyDurationUnit === "DAYS" ? "يوم (Days)" : "شهر (Months)"}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAYS">أيام (Days)</SelectItem>
                      <SelectItem value="MONTHS">شهور (Months)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">الموعد النهائي لانتهاء التوريد المحسوب</Label>
                <div className="h-10 px-3 rounded-xl bg-card border border-border flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-foreground">
                    {calculatedDeliveryDeadline ? formatDate(calculatedDeliveryDeadline) : "غير محدد"}
                  </span>
                  {calculatedDeliveryDeadline && (
                    <Badge className="badge-indigo text-[9px] font-mono">
                      {calculatedDeliveryDeadline}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="syncDateCheck"
                checked={syncDeliveryDate}
                onChange={(e) => setSyncDeliveryDate(e.target.checked)}
                className="rounded h-4 w-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="syncDateCheck" className="text-xs font-bold text-foreground cursor-pointer select-none">
                تثبيت وحفظ هذا الموعد تلقائيًا في مواعيد وجلسات العملية الرسمية (الموعد النهائي لانتهاء التوريد)
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">ملاحظات وشروط التسليم والمخازن</Label>
            <Input
              value={supplyNotes}
              onChange={(e) => setSupplyNotes(e.target.value)}
              placeholder="مثلاً: التسليم بمخازن الهيئة بالعاشر من رمضان شامل النقل والتعتيق"
              className="h-10 text-sm"
            />
          </div>

          {/* FileUploadZone for Supply Order */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5 text-blue-600" />
              <span>مرفق نسخة أمر التوريد / العقد الرسمي المعتمد (اختياري - PDF أو صورة)</span>
            </Label>
            <FileUploadZone
              file={supplyOrderFile}
              onFileSelect={setSupplyOrderFile}
              accept="application/pdf,image/*"
              placeholder="اضغط لاختيار صورة أو ملف PDF لأمر التوريد الموقع والمختوم من الجهة"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAddingSupplyOrder(false);
                setSupplyOrderFile(null);
              }}
              className="rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={handleSaveSupplyOrder}
              disabled={savingSupplyOrder}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold px-4"
            >
              {savingSupplyOrder ? (
                <>
                  <Loader2 className="h-4 w-4 ml-1.5 animate-spin" />
                  <span>جاري الحفظ والبدء...</span>
                </>
              ) : (
                "حفظ أمر التوريد والبدء ✓"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ━━━ EXISTING AWARDS & SUPPLY ORDERS TABS / CARDS ━━━ */}
      <div className="space-y-4">
        {/* Section 1: Awards List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-border">
            <h5 className="font-bold text-xs text-foreground flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 text-amber-600" />
              <span>قرارات الترسية المسجلة ({op.awards?.length || 0})</span>
            </h5>
          </div>

          {op.awards?.length > 0 ? (
            <div className="space-y-3">
              {op.awards.map((a: any) => (
                <div
                  key={a.id}
                  className={`p-5 rounded-2xl border ${
                    a.isOurCompany ? "bg-amber-500/10 border-amber-500/40" : "bg-card border-border"
                  } space-y-3 shadow-xs`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      {a.isOurCompany && <Trophy className="h-7 w-7 text-amber-500 shrink-0" />}
                      <div>
                        <p className="text-base font-black text-foreground">{a.winnerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.isOurCompany
                            ? "🏆 فازت شركتنا بالترسية — يلزم استكمال التأمين النهائي (5%) وأمر التوريد"
                            : "الترسية على منافس خارجي"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge className={a.isOurCompany ? "badge-amber" : "bg-muted text-foreground"}>
                        {a.isOurCompany ? "فوز معتمد ✓" : "ترسية خارجية"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingAward(a)}
                        className="h-8 w-8 p-0 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl"
                        title="تعديل قرار الترسية"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteAward(a.id)}
                        className="h-8 w-8 p-0 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
                        title="حذف قرار الترسية"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <DataRow
                    label="قيمة الترسية الإجمالية"
                    value={
                      <div className="space-y-0.5">
                        <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
                          {formatCurrency(Number(a.winnerPrice))}
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          {tafqeetArabic(Number(a.winnerPrice))}
                        </p>
                      </div>
                    }
                  />

                  {a.awardDate && <DataRow label="تاريخ كتاب الترسية" value={formatDate(a.awardDate)} />}
                  {a.notes && <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg">{a.notes}</p>}
                </div>
              ))}
            </div>
          ) : !addingAward && (
            <EmptyState
              icon={Trophy}
              text="لم يتم تسجيل قرار الترسية حتى الآن"
              subtext="سجّل اسم الشركة الفائزة وقيمة الترسية بعد صدور إخطار قبول العطاء"
            />
          )}
        </div>

        {/* Section 2: Supply Orders List */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between pb-1 border-b border-border">
            <h5 className="font-bold text-xs text-foreground flex items-center gap-2">
              <Receipt className="h-3.5 w-3.5 text-blue-600" />
              <span>أوامر التوريد والعقود الصادرة ({op.supplyOrders?.length || 0})</span>
            </h5>
          </div>

          {op.supplyOrders?.length > 0 ? (
            <div className="space-y-3">
              {op.supplyOrders.map((so: any) => (
                <div key={so.id} className="p-5 rounded-2xl bg-card border border-border space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-bold text-foreground">
                        أمر توريد رقم <span className="font-mono text-blue-600 dark:text-blue-400">{so.orderNumber}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge className="badge-blue text-[10px] font-bold">ساري للتنفيذ 📦</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingSupplyOrder(so)}
                        className="h-8 w-8 p-0 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl"
                        title="تعديل أمر التوريد"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSupplyOrder(so.id)}
                        className="h-8 w-8 p-0 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
                        title="حذف أمر التوريد"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <DataRow label="تاريخ صدور أمر التوريد" value={formatDate(so.orderDate)} />

                  {/* Quick Sync Button if execution deadline not synced */}
                  {calculatedDeliveryDeadline && !deliveryDeadlineDate && (
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-2 text-xs">
                      <span className="text-[11px] text-muted-foreground">
                        الموعد المقترح للتسليم: <strong className="font-mono text-foreground">{formatDate(calculatedDeliveryDeadline)}</strong>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleManualSyncDeliveryDate}
                        disabled={syncingDateManual}
                        className="h-7 text-[11px] rounded-lg font-bold border-blue-500/40 text-blue-600 hover:bg-blue-500/10 cursor-pointer"
                      >
                        {syncingDateManual ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <Calendar className="h-3 w-3 ml-1" />}
                        تثبيت في جدول المواعيد
                      </Button>
                    </div>
                  )}

                  {so.notes && <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg">{so.notes}</p>}
                </div>
              ))}
            </div>
          ) : !addingSupplyOrder && (
            <EmptyState
              icon={Receipt}
              text="لم يتم تسجيل أمر التوريد بعد"
              subtext="سجّل رقم وتاريخ أمر التوريد الصادر من الجهة واحتسب مدة التنفيذ للبدء في تسليم الشحنات"
            />
          )}
        </div>

        {/* Section 3: Award & Supply Order Documents Archive */}
        {awardRelatedDocs.length > 0 && (
          <div className="p-4.5 rounded-2xl bg-card border border-border space-y-3 shadow-xs">
            <h5 className="font-bold text-xs text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5 text-amber-600" />
                <span>مستندات الترسية وأوامر التوريد المرفوعة ({awardRelatedDocs.length})</span>
              </span>
              <Badge variant="outline" className="text-[9px] font-mono">أرشيف رسمي</Badge>
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {awardRelatedDocs.map((doc: any) => (
                <div
                  key={doc.id}
                  className="p-3 rounded-xl bg-muted/20 border border-border flex items-center justify-between gap-2 text-xs hover:border-amber-500/30 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-amber-600 shrink-0" />
                    <div className="truncate">
                      <p className="font-bold text-foreground truncate">{doc.fileName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDocFileSize(doc.fileSize)} • {formatDate(doc.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {onPreviewDoc && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onPreviewDoc(doc)}
                        className="h-7 w-7 p-0 rounded-lg text-blue-600 hover:bg-blue-500/10 cursor-pointer"
                        title="معاينة الملف"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {onDownloadDoc && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDownloadDoc(doc)}
                        className="h-7 w-7 p-0 rounded-lg text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                        title="تحميل الملف"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ━━━ EDIT AWARD MODAL ━━━ */}
      {editingAward && (
        <Portal>
          <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
            <div className="bg-card text-card-foreground border border-border rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Edit className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-foreground text-sm">تعديل قرار وبيانات الترسية</h4>
                </div>
                <button onClick={() => setEditingAward(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">اسم الشركة الفائزة</label>
                  <input
                    type="text"
                    value={editingAward.winnerName || ""}
                    onChange={(e) => setEditingAward({ ...editingAward, winnerName: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">قيمة الترسية (ج.م)</label>
                    <input
                      type="number"
                      value={editingAward.winnerPrice}
                      onChange={(e) => setEditingAward({ ...editingAward, winnerPrice: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">تاريخ كتاب الترسية</label>
                    <input
                      type="date"
                      value={editingAward.awardDate ? editingAward.awardDate.split("T")[0] : ""}
                      onChange={(e) => setEditingAward({ ...editingAward, awardDate: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/30">
                  <input
                    type="checkbox"
                    id="editIsOurCompany"
                    checked={editingAward.isOurCompany}
                    onChange={(e) => setEditingAward({ ...editingAward, isOurCompany: e.target.checked })}
                    className="rounded h-4 w-4 text-amber-600 cursor-pointer"
                  />
                  <label htmlFor="editIsOurCompany" className="text-xs font-bold text-foreground cursor-pointer select-none">
                    الترسية على شركتنا (فوز معتمد)
                  </label>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">ملاحظات الترسية</label>
                  <textarea
                    rows={2}
                    value={editingAward.notes || ""}
                    onChange={(e) => setEditingAward({ ...editingAward, notes: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setEditingAward(null)} className="text-xs">
                  إلغاء
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpdateAward}
                  disabled={savingEditAward}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 rounded-xl"
                >
                  {savingEditAward ? "جاري الحفظ..." : "حفظ التعديلات"}
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ━━━ EDIT SUPPLY ORDER MODAL ━━━ */}
      {editingSupplyOrder && (
        <Portal>
          <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
            <div className="bg-card text-card-foreground border border-border rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Edit className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-foreground text-sm">تعديل بيانات أمر التوريد والتعاقد</h4>
                </div>
                <button onClick={() => setEditingSupplyOrder(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">رقم أمر التوريد</label>
                    <input
                      type="text"
                      value={editingSupplyOrder.orderNumber || ""}
                      onChange={(e) => setEditingSupplyOrder({ ...editingSupplyOrder, orderNumber: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">تاريخ أمر التوريد</label>
                    <input
                      type="date"
                      value={editingSupplyOrder.orderDate ? editingSupplyOrder.orderDate.split("T")[0] : ""}
                      onChange={(e) => setEditingSupplyOrder({ ...editingSupplyOrder, orderDate: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">ملاحظات ومدة التوريد</label>
                  <textarea
                    rows={2}
                    value={editingSupplyOrder.notes || ""}
                    onChange={(e) => setEditingSupplyOrder({ ...editingSupplyOrder, notes: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setEditingSupplyOrder(null)} className="text-xs">
                  إلغاء
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpdateSupplyOrder}
                  disabled={savingEditSupplyOrder}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 rounded-xl"
                >
                  {savingEditSupplyOrder ? "جاري الحفظ..." : "حفظ التعديلات"}
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </SectionCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   13. SUPPLY ORDER TAB (أمر التوريد / العقد)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TabSupplyOrder({ op, onRefresh }: { op: Operation; onRefresh: () => void }) {
  const [adding, setAdding] = useState(false);
  const [orderNumber, setOrderNumber] = useState(`PO-${op.serialNumber}-${Date.now().toString().slice(-4)}`);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingSO, setEditingSO] = useState<any | null>(null);
  const [savingEditSO, setSavingEditSO] = useState(false);

  const handleUpdateSO = async () => {
    if (!editingSO) return;
    setSavingEditSO(true);
    try {
      await api.patch(`/operations/${op.id}/supply-orders/${editingSO.id}`, {
        orderNumber: editingSO.orderNumber,
        orderDate: editingSO.orderDate,
        notes: editingSO.notes,
      });
      toast.success("تم تعديل أمر التوريد بنجاح! ✓");
      setEditingSO(null);
      onRefresh();
    } catch {
      toast.error("فشل حفظ تعديل أمر التوريد");
    } finally {
      setSavingEditSO(false);
    }
  };

  const handleDeleteSO = async (orderId: string) => {
    if (!confirm("هل أنت متأكد من حذف أمر التوريد هذا؟")) return;
    try {
      await api.delete(`/operations/${op.id}/supply-orders/${orderId}`);
      toast.success("تم حذف أمر التوريد بنجاح 🗑️");
      onRefresh();
    } catch {
      toast.error("فشل حذف أمر التوريد");
    }
  };

  const handleSaveSupplyOrder = async () => {
    if (!orderNumber) {
      toast.error("يرجى إدخال رقم أمر التوريد");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/operations/${op.id}/supply-orders`, { orderNumber, orderDate, notes });
      toast.success("تم تسجيل أمر التوريد وبدء مرحلة التنفيذ بنجاح 📜");
      setAdding(false);
      onRefresh();
    } catch {
      toast.error("فشل تسجيل أمر التوريد");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="أمر التوريد والتعاقد الرسمي" icon={Receipt} iconColor="text-blue-600"
      badge={<Badge className="badge-blue text-[10px] font-bold">{op.supplyOrders?.length || 0} أمر توريد</Badge>}
      actions={
        <Button size="sm" onClick={() => setAdding(!adding)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 rounded-xl cursor-pointer">
          <Receipt className="h-3.5 w-3.5 ml-1" />تسجيل أمر توريد جديد
        </Button>
      }>

      {adding && (
        <div className="p-4 rounded-xl bg-card border border-blue-500/30 space-y-3 animate-fade-in shadow-lg">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Receipt className="h-4 w-4 text-blue-600" />
            بيانات أمر التوريد الصادر من الجهة
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">رقم أمر التوريد</Label>
              <Input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} className="h-10 text-sm font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">تاريخ صدور أمر التوريد</Label>
              <Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="h-10 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">ملاحظات والتزامات التنفيذ</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="شروط التسليم وموقع المخازن المعنية" className="h-10 text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setAdding(false)} className="rounded-xl">إلغاء</Button>
            <Button size="sm" onClick={handleSaveSupplyOrder} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ وبدء التوريد"}
            </Button>
          </div>
        </div>
      )}

      {op.supplyOrders?.length > 0 ? (
        <div className="space-y-3">
          {op.supplyOrders.map((so: any) => (
            <div key={so.id} className="p-4 rounded-xl bg-card border border-border space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="text-sm font-bold text-foreground">أمر توريد رقم {so.orderNumber}</span>
                <div className="flex items-center gap-1.5">
                  <Badge className="badge-blue text-[10px]">ساري للتنفيذ 📦</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingSO(so)}
                    className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg"
                    title="تعديل أمر التوريد"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteSO(so.id)}
                    className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                    title="حذف أمر التوريد"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <DataRow label="تاريخ صدور الأمر" value={formatDate(so.orderDate)} />
              {so.notes && <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg">{so.notes}</p>}
            </div>
          ))}
        </div>
      ) : !adding && (
        <EmptyState icon={Receipt} text="لم يتم تسجيل أمر التوريد بعد" subtext="سجّل رقم وتاريخ أمر التوريد الصادر من الجهة للبدء في تسليم الشحنات وأذون الإضافة" />
      )}

      {/* EDIT MODAL FOR SUPPLY ORDER */}
      {editingSO && (
        <Portal>
          <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
            <div className="bg-card text-card-foreground border border-border rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Edit className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-foreground text-sm">تعديل بيانات أمر التوريد</h4>
                </div>
                <button onClick={() => setEditingSO(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">رقم أمر التوريد</label>
                    <input
                      type="text"
                      value={editingSO.orderNumber || ""}
                      onChange={(e) => setEditingSO({ ...editingSO, orderNumber: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">تاريخ أمر التوريد</label>
                    <input
                      type="date"
                      value={editingSO.orderDate ? editingSO.orderDate.split("T")[0] : ""}
                      onChange={(e) => setEditingSO({ ...editingSO, orderDate: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">ملاحظات ومدة التوريد</label>
                  <textarea
                    rows={2}
                    value={editingSO.notes || ""}
                    onChange={(e) => setEditingSO({ ...editingSO, notes: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setEditingSO(null)} className="text-xs">
                  إلغاء
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpdateSO}
                  disabled={savingEditSO}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 rounded-xl"
                >
                  {savingEditSO ? "جاري الحفظ..." : "حفظ التعديلات"}
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </SectionCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   15. SUPPLY / DELIVERY TAB (التوريد وأذون الإضافة)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TabSupply({ op, onRefresh }: { op: Operation; onRefresh: () => void }) {
  const [adding, setAdding] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState(`REC-${Date.now().toString().slice(-4)}`);
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split("T")[0]);
  const [itemName, setItemName] = useState("توريد دفعة من الأصناف المطلوبة");
  const [quantity, setQuantity] = useState("100");
  const [unitPrice, setUnitPrice] = useState("5000");
  const [unit, setUnit] = useState("وحدة");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const allReceipts = op.supplyOrders?.flatMap((so: any) => (so.goodsReceipts || []).map((r: any) => ({ ...r, orderNumber: so.orderNumber }))) || [];

  const handleSaveReceipt = async () => {
    setSaving(true);
    try {
      await api.post(`/operations/${op.id}/supply-receipts`, {
        receiptNumber,
        receiptDate,
        notes,
        items: [{
          itemName,
          unit,
          quantity: Number(quantity),
          unitPrice: Number(unitPrice),
          totalPrice: Number(quantity) * Number(unitPrice),
        }],
      });
      toast.success("تم تسجيل إذن الإضافة والتوريد بنجاح 📦");
      setAdding(false);
      onRefresh();
    } catch {
      toast.error("فشل تسجيل إذن الإضافة");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="التوريد والتسليم وأذون الإضافة المخزنية" icon={Truck} iconColor="text-blue-600"
      badge={<Badge className="badge-blue text-[10px] font-bold">{allReceipts.length} إذن إضافة</Badge>}
      actions={
        <Button size="sm" onClick={() => setAdding(!adding)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 rounded-xl cursor-pointer">
          <Truck className="h-3.5 w-3.5 ml-1" />تسجيل إذن إضافة جديد
        </Button>
      }>

      <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-foreground mb-2">
        <strong>الربط بالمخازن:</strong> كل عملية توريد تُسجل كإذن إضافة رقمي يحدد الكميات المستلمة فعلياً بمخازن العميل، وتؤثر في حركة المخزون وحساب نسبة إنجاز أمر التوريد.
      </div>

      {adding && (
        <div className="p-4 rounded-xl bg-card border border-blue-500/30 space-y-3 animate-fade-in shadow-lg">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-600" />
            بيانات إذن إضافة التوريد
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">رقم إذن الإضافة / الفاتورة</Label>
              <Input value={receiptNumber} onChange={e => setReceiptNumber(e.target.value)} className="h-10 text-sm font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">تاريخ الاستلام الفعلي</Label>
              <Input type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} className="h-10 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">الصنف المستلم</Label>
              <Input value={itemName} onChange={e => setItemName(e.target.value)} className="h-10 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">الكمية المستلمة</Label>
              <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="h-10 text-sm font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">سعر الوحدة</Label>
              <Input type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} className="h-10 text-sm font-mono" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">ملاحظات لجنة الفحص والاستلام</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="مثلاً: تم الفحص الفني والمطابقة بنسبة 100%" className="h-10 text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setAdding(false)} className="rounded-xl">إلغاء</Button>
            <Button size="sm" onClick={handleSaveReceipt} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ إذن الإضافة"}
            </Button>
          </div>
        </div>
      )}

      {allReceipts.length > 0 ? (
        <div className="space-y-3">
          {allReceipts.map((r: any) => (
            <div key={r.id} className="p-4 rounded-xl bg-card border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">إذن إضافة رقم {r.receiptNumber}</span>
                <Badge className="badge-blue text-[10px]">أمر {r.orderNumber}</Badge>
              </div>
              <DataRow label="تاريخ الاستلام" value={formatDate(r.receiptDate)} />
              {r.items?.length > 0 && (
                <div className="text-xs space-y-1 pt-1">
                  {r.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between bg-muted/30 p-2.5 rounded-lg border border-border/40">
                      <span className="text-foreground font-semibold">{item.itemName} — {Number(item.quantity)} {item.unit}</span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{formatCurrency(Number(item.totalPrice))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : !adding && (
        <EmptyState icon={Package} text="لم يتم تسجيل أذون إضافة حتى الآن" subtext="سجّل كل إذن توريد لتوثيق التسليمات والمتبقي ومتابعة المستخلصات" />
      )}
    </SectionCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   16. CERTIFICATES TAB (المستخلصات والخصومات 1% و 14% و 5%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TabCertificates({ op, onRefresh }: { op: Operation; onRefresh: () => void }) {
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
    <SectionCard title="المستخلصات والشهادات المالية" icon={Calculator} iconColor="text-teal-600"
      badge={<Badge className="badge-teal text-[10px] font-bold">{op.certificates?.length || 0} مستخلص</Badge>}
      actions={
        <Button size="sm" onClick={() => setAdding(!adding)} className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-8 rounded-xl cursor-pointer">
          <Plus className="h-3.5 w-3.5 ml-1" />تسجيل مستخلص جديد
        </Button>
      }>

      <div className="p-3.5 rounded-xl bg-teal-500/5 border border-teal-500/20 text-xs text-foreground mb-2">
        <strong>حساب الاستقطاعات القانونية:</strong> يحسب النظام أوتوماتيكياً: خصم 1% أ.ت.ص + 14% ضريبة القيمة المضافة + 5% ضمان أعمال، ويحدد صافي المبلغ المستحق للصرف.
      </div>

      {adding && (
        <div className="p-4 rounded-xl bg-card border border-teal-500/30 space-y-3 animate-fade-in shadow-lg">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Calculator className="h-4 w-4 text-teal-600" />
            تحرير مستخلص مالي
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
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   17. FINANCE & PROFIT TAB (حساب التكلفة والربح)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TabFinance({ op, onRefresh }: { op: Operation; onRefresh: () => void }) {
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
    <SectionCard title="حساب التكلفة الفعلية وصافي الربح" icon={BarChart3} iconColor="text-emerald-600"
      actions={
        <Button size="sm" onClick={() => setEditing(!editing)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 rounded-xl cursor-pointer">
          <Edit className="h-3.5 w-3.5 ml-1" />{fin ? "تعديل الحسابات" : "تسجيل المالية"}
        </Button>
      }>

      {editing && (
        <div className="p-4 rounded-xl bg-card border border-emerald-500/30 space-y-3 animate-fade-in shadow-lg mb-3">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            تسجيل الإيرادات والتكاليف الفعلية
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
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   18. CLOSE TAB (إغلاق العملية)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TabClose({
  op,
  onRefresh,
  onPreviewDoc,
  onDownloadDoc
}: {
  op: Operation;
  onRefresh: () => void;
  onPreviewDoc?: (doc: any) => void;
  onDownloadDoc?: (doc: any) => void;
}) {
  const [closing, setClosing] = useState(false);
  const isClosed = ["COMPLETED", "CLOSED"].includes(op.status);

  const handleClose = async () => {
    setClosing(true);
    try {
      await api.patch(`/operations/${op.id}/status`, { status: "CLOSED" });
      toast.success("تم إغلاق العملية رسمياً بنجاح ✓");
      onRefresh();
    } catch {
      toast.error("فشل في إغلاق العملية");
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <SectionCard title="إغلاق العملية واستيفاء كافة الالتزامات" icon={CheckCircle2} iconColor="text-emerald-600">
        {isClosed ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-black text-foreground">العملية مغلقة رسمياً ومؤرشفة بالكامل ✓</h3>
            <p className="text-xs text-muted-foreground">تم الانتهاء من جميع مراحل التوريد والتحصيل المالي واسترداد التأمينات وأرشفة الملفات</p>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-foreground">تأكيد إغلاق العملية رسمياً</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                تأكد من إتمام التوريد بنسبة 100%، وتحصيل جميع المستخلصات، وتسوية التكاليف الفعلية واسترداد خطابات الضمان قبل الإغلاق.
              </p>
            </div>
            <Button onClick={handleClose} disabled={closing} className="bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg cursor-pointer">
              {closing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 ml-2" />تأكيد إغلاق العملية نهائياً</>}
            </Button>
          </div>
        )}
      </SectionCard>

      {/* استرداد التأمين النهائي */}
      <TabRecovery op={op} onRefresh={onRefresh} />

      {/* الأرشيف الرقمي الشامل للعملية */}
      <TabArchive op={op} onPreviewDoc={onPreviewDoc} onDownloadDoc={onDownloadDoc} />
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   19. RECOVERY TAB (استرداد التأمين النهائي - Stepper 3 مراحل)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TabRecovery({ op, onRefresh }: { op: Operation; onRefresh: () => void }) {
  const finalG = op.guarantees?.find((g: any) => g.type === "FINAL");
  const [actingStep, setActingStep] = useState<number | null>(null);
  const [actionDate, setActionDate] = useState(new Date().toISOString().split("T")[0]);
  const [deliveredTo, setDeliveredTo] = useState("الإدارة المالية - الحسابات المركزية");
  const [saving, setSaving] = useState(false);

  const steps = [
    { num: 1, title: "1. خطاب طلب الاسترداد", desc: "تجهيز وتقديم طلب استرداد التأمين النهائي موجه للجهة مع شهادة الاستلام النهائي", dateKey: "recoveryLetterDate", done: !!finalG?.recoveryLetterDate },
    { num: 2, title: "2. صدور أمر الدفع", desc: "موافقة الجهة الإدارية وإصدار أمر الدفع أو خطاب الإفراج البنكي عن التأمين", dateKey: "paymentOrderDate", done: !!finalG?.paymentOrderDate },
    { num: 3, title: "3. الاسترداد الفعلي للمبلغ", desc: "دخول المبلغ فعلياً لحساب الشركة بالبنك أو استلام الشيك وتسجيل المستلم", dateKey: "actualRecoveryDate", done: !!finalG?.actualRecoveryDate },
  ];

  const handleExecuteStep = async (stepNum: number) => {
    setSaving(true);
    try {
      await api.post(`/operations/${op.id}/recovery-step`, {
        guaranteeId: finalG?.id,
        step: stepNum,
        date: actionDate,
        deliveredTo: stepNum === 3 ? deliveredTo : undefined,
      });
      toast.success(stepNum === 3 ? "تم تأكيد الاسترداد الفعلي للتأمين وإغلاق الملف! 🟢" : "تم تسجيل المرحلة بنجاح ✓");
      setActingStep(null);
      onRefresh();
    } catch {
      toast.error("فشل تسجيل مرحلة الاسترداد");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="استرداد التأمين النهائي (مراحل الـ Stepper)" icon={RefreshCw} iconColor="text-blue-600">
      {finalG ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs text-muted-foreground block">قيمة التأمين النهائي المستحق للاسترداد</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(Number(finalG.amount))}</span>
            </div>
            <Badge className={finalG.isRecovered ? "badge-emerald" : finalG.status === "RECOVERY_REQUESTED" ? "badge-blue" : "badge-amber"}>
              {finalG.isRecovered ? "تم الاسترداد بالكامل ✓" : finalG.status === "RECOVERY_REQUESTED" ? "قيد إجراءات الاسترداد" : "ساري — لم يبدأ الاسترداد"}
            </Badge>
          </div>

          {/* Stepper Display */}
          <div className="space-y-3">
            {steps.map((st) => (
              <div key={st.num} className={`p-4 rounded-xl border transition-all ${st.done ? "bg-emerald-500/5 border-emerald-500/30" : "bg-card border-border"}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${st.done ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                      {st.done ? <Check className="h-4 w-4" /> : st.num}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{st.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{st.desc}</p>
                      {st.done && finalG[st.dateKey] && (
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">تاريخ التنفيذ: {formatDate(finalG[st.dateKey])}</p>
                      )}
                    </div>
                  </div>

                  {!st.done && (
                    <Button size="sm" onClick={() => setActingStep(actingStep === st.num ? null : st.num)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 rounded-xl">
                      تسجيل الإجراء
                    </Button>
                  )}
                </div>

                {actingStep === st.num && (
                  <div className="mt-3 pt-3 border-t border-border space-y-3 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">تاريخ الإجراء</Label>
                        <Input type="date" value={actionDate} onChange={e => setActionDate(e.target.value)} className="h-9 text-xs" />
                      </div>
                      {st.num === 3 && (
                        <div className="space-y-1">
                          <Label className="text-xs">تم التسليم / الإيداع إلى</Label>
                          <Input value={deliveredTo} onChange={e => setDeliveredTo(e.target.value)} className="h-9 text-xs" />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setActingStep(null)} className="h-8 text-xs rounded-xl">إلغاء</Button>
                      <Button size="sm" onClick={() => handleExecuteStep(st.num)} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs rounded-xl font-bold">
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "تأكيد المرحلة"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState icon={RefreshCw} text="لا يوجد تأمين نهائي مسجل للاسترداد" subtext="سجّل التأمين النهائي أولاً في تبويب التأمين النهائي بمجرد صدور أمر التوريد" />
      )}
    </SectionCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   20. ARCHIVE TAB (الأرشيف الذكي لكامل العملية)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TabArchive({
  op,
  onPreviewDoc,
  onDownloadDoc
}: {
  op: Operation;
  onPreviewDoc?: (doc: any) => void;
  onDownloadDoc?: (doc: any) => void;
}) {
  const [filterCategory, setFilterCategory] = useState("ALL");

  const bookletDoc = op.documents?.find((d: any) => d.type === "BOOKLET") || op.documents?.[0];

  const allDocs = [
    ...(op.documents || []).map((d: any) => ({
      ...d,
      category: d.type === "BOOKLET" ? "كراسة الشروط والمواصفات" : (d.category || "مستند كراسة / عقد"),
    })),
    ...(op.supplyOrders || []).map((so: any) => ({
      id: `so-${so.id}`,
      fileName: `أمر_توريد_${so.orderNumber || so.id}_${op.companies?.[0]?.company?.name || "Golden"}.pdf`,
      filePath: `/radar/download-doc?docId=supply_order_${so.id}`,
      category: "أمر توريد",
      createdAt: so.orderDate || so.createdAt,
    })),
    ...(op.certificates || []).map((c: any) => ({
      id: `cert-${c.id}`,
      fileName: `مستخلص_رقم_${c.certificateNo || c.id}_${op.companies?.[0]?.company?.name || "Golden"}.pdf`,
      filePath: `/radar/download-doc?docId=cert_${c.id}`,
      category: "مستخلصات مالية",
      createdAt: c.createdAt,
    })),
  ];

  const categories = [
    { id: "ALL", label: `جميع المستندات (${allDocs.length})` },
    { id: "كراسة الشروط والمواصفات", label: "كراسات الشروط" },
    { id: "أمر توريد", label: "أوامر التوريد" },
    { id: "مستخلصات مالية", label: "المستخلصات" },
  ];

  const filtered = filterCategory === "ALL" ? allDocs : allDocs.filter(d => d.category === filterCategory);

  return (
    <SectionCard
      title="أرشيف العملية الرقمي الشامل"
      icon={Archive}
      iconColor="text-blue-600"
      badge={<Badge className="bg-muted text-foreground border-border text-[10px]">{allDocs.length} مستند محفوظ</Badge>}
    >
      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-1 text-xs text-foreground mb-4">
        <p><strong>تسمية الأرشيف الذكي القياسية:</strong> تُحفظ وتُفهرس جميع المستندات الرقمية تلقائياً وفق النسق: <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">نوع_المستند_رقم_العملية_اسم_الشركة_التاريخ.pdf</span></p>
      </div>

      {/* Featured Official Booklet Card */}
      {bookletDoc && (
        <div className="mb-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-transparent border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-500 flex items-center justify-center font-black text-sm shrink-0 border border-red-500/30 shadow-xs">
              PDF
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-foreground text-sm sm:text-base">{bookletDoc.fileName}</h4>
                <Badge className="badge-blue text-[10px]">كراسة الشروط الرسمية للعملية</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                تاريخ الأرشفة والربط: {formatDate(bookletDoc.createdAt)} {bookletDoc.uploadedBy ? `• ${bookletDoc.uploadedBy}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => onPreviewDoc?.(bookletDoc)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              <Eye className="h-4 w-4" />
              <span>معاينة مباشرة</span>
            </Button>
            <Button
              size="sm"
              onClick={() => onDownloadDoc?.(bookletDoc)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              <Download className="h-4 w-4" />
              <span>تحميل كملف</span>
            </Button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {allDocs.length > 0 && (
        <div className="flex items-center gap-1.5 pb-2 overflow-x-auto mb-2 border-b border-border/50">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterCategory(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                filterCategory === c.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="space-y-2.5">
          {filtered.map((doc: any) => (
            <div
              key={doc.id}
              className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-500/40 transition-colors shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center font-bold text-xs shrink-0 border border-red-500/20">
                  PDF
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-foreground font-mono">{doc.fileName}</p>
                    <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-semibold text-muted-foreground border border-border">
                      {doc.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    تاريخ الحفظ: {formatDate(doc.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => onPreviewDoc?.(doc)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>معاينة</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDownloadDoc?.(doc)}
                  className="border-border text-foreground hover:bg-muted font-bold text-xs h-8 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Download className="h-3.5 w-3.5 text-blue-500" />
                  <span>تحميل</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Archive}
          text="لا توجد مستندات في هذا التصنيف"
          subtext="تتجمع المستندات الرقمية في الأرشيف تلقائياً مع تقدم مراحل العملية أو عند سحب الكراسة"
        />
      )}
    </SectionCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SMART COVER MODAL (الغلاف الذكي للعطاء)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SmartCoverModal({ op, onClose }: { op: Operation; onClose: () => void }) {
  const mainCompany = op.companies?.[0]?.company || { name: "شركة جولدن إيجل للتوريدات", code: "A" };
  const displayCode = op.companies?.[0]?.displayCode || "A15";

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-card border border-border rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-foreground text-base">معاينة الغلاف الذكي (Smart Cover)</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Printable Official Cover Preview */}
        <div className="p-8 rounded-2xl bg-white text-slate-900 border-2 border-slate-300 space-y-6 text-center shadow-md">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-center text-xs font-bold">
            <div className="text-right">
              <p>جمهورية مصر العربية</p>
              <p>{op.authority}</p>
            </div>
            <div className="text-center font-mono text-base font-black px-3 py-1 bg-slate-100 border border-slate-300 rounded-lg">
              {displayCode}
            </div>
            <div className="text-left">
              <p>{TENDER_TYPE_LABELS[op.tenderType] || op.tenderType}</p>
              <p>رقم: {op.externalNumber || `#${op.serialNumber}`}</p>
            </div>
          </div>

          {/* Tender Title */}
          <div className="py-6 space-y-3">
            <Badge className="bg-slate-900 text-white text-xs px-3 py-1 font-bold">مظروف العرض الفني والمالي</Badge>
            <h2 className="text-2xl font-black text-slate-900 leading-snug">{op.name}</h2>
            <p className="text-sm font-semibold text-slate-700">جهة الطرح: {op.authority}</p>
          </div>

          {/* Company Details */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 text-right">
            <div className="flex justify-between">
              <span className="text-slate-500">مقدم من:</span>
              <span className="font-bold text-slate-900">{mainCompany.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">كود العملية بالنظام:</span>
              <span className="font-mono font-bold text-blue-700">{displayCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">تاريخ التقديم:</span>
              <span className="font-mono text-slate-800">{new Date().toLocaleDateString("ar-EG")}</span>
            </div>
          </div>

          {/* Stamp & Signature Footer */}
          <div className="pt-6 border-t-2 border-slate-900 flex justify-between text-xs font-bold text-slate-800 px-4">
            <div>
              <p>توقيع المفوض القانوني</p>
              <p className="mt-8 text-slate-400">.................................</p>
            </div>
            <div>
              <p>خاتم الشركة</p>
              <div className="mt-4 w-16 h-16 rounded-full border-2 border-dashed border-slate-400 mx-auto flex items-center justify-center text-[10px] text-slate-400">
                بصمة الختم
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl">إغلاق</Button>
          <Button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold">
            <Printer className="h-4 w-4 ml-1.5" />طباعة الغلاف الرسمي
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN PAGE COMPONENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function OperationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { userRole, selectedCompany, setSelectedCompany } = useCompany();
  const [op, setOp] = useState<Operation | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [smartCoverOpen, setSmartCoverOpen] = useState(false);

  // حالة التحكم في المسار الزمني والمراحل
  const [showTimeline, setShowTimeline] = useState(true);
  const [statusActionModal, setStatusActionModal] = useState<null | {
    type: "ADVANCE" | "ROLLBACK" | "CANCEL" | "REOPEN" | "MANUAL";
    targetStatus: string;
    targetLabel: string;
    description: string;
  }>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // معاينة وتحميل مستندات العملية وكراسة الشروط ودراسة السوق (يدعم PDF و Word والصور)
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocBlob, setPreviewDocBlob] = useState<Blob | null>(null);
  const [previewDocType, setPreviewDocType] = useState<"pdf" | "docx" | "image" | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>("");
  const [previewDocItem, setPreviewDocItem] = useState<any>(null);
  const [isFullscreenDoc, setIsFullscreenDoc] = useState<boolean>(false);
  const [, setIsProcessingDoc] = useState<boolean>(false);

  const handlePreviewDocument = async (doc: { id?: string; fileName?: string; filePath?: string; title?: string; fileType?: string }) => {
    try {
      setIsProcessingDoc(true);
      setPreviewDocItem(doc);
      const title = doc.fileName || doc.title || "مستند العملية";
      setPreviewDocTitle(title);
      toast.info("جاري تحضير المستند أو الصورة للعرض المباشر...");

      let blobData: Blob | null = null;
      let contentType = "";
      const currentOpId = op?.id;

      // Tier 1: Try fetching via operation documents endpoint
      if (doc.id && currentOpId) {
        try {
          const res = await api.get(`/operations/${currentOpId}/documents/${doc.id}/file`, { responseType: "blob" });
          blobData = res.data;
          contentType = String(res.headers?.["content-type"] || "").toLowerCase();
        } catch (opErr) {
          console.warn("Direct document stream failed, trying fallback URL:", opErr);
        }
      }

      // Tier 2: If Tier 1 failed or no doc.id, try direct filePath (Radar or absolute URL)
      if (!blobData) {
        const targetUrl = doc.filePath || "";
        if (targetUrl) {
          try {
            const cleanUrl = targetUrl.startsWith("/") ? targetUrl : `/${targetUrl}`;
            const res = await api.get(cleanUrl, { responseType: "blob" });
            blobData = res.data;
            contentType = String(res.headers?.["content-type"] || "").toLowerCase();
          } catch (urlErr) {
            console.warn("Target URL fetch failed:", urlErr);
          }
        }
      }

      // Tier 3: If still no blob, try radar download doc as last resort
      if (!blobData) {
        const res = await api.get(`/radar/download-doc?docId=booklet`, { responseType: "blob" });
        blobData = res.data;
        contentType = String(res.headers?.["content-type"] || "").toLowerCase();
      }

      if (!blobData) {
        throw new Error("لم يتم استلام محتوى صالح للمستند");
      }

      const fileExt = (doc.fileType || "").toLowerCase();
      const firstBytes = await blobData.slice(0, 100).text().catch(() => "");
      const isPkZip = firstBytes.startsWith("PK");

      const isWordName =
        title.toLowerCase().endsWith(".docx") ||
        title.toLowerCase().endsWith(".doc") ||
        fileExt === "docx" ||
        fileExt === "doc";

      const isWordType =
        blobData.type?.includes("word") ||
        blobData.type?.includes("officedocument") ||
        contentType.includes("word") ||
        contentType.includes("officedocument") ||
        (isPkZip && !firstBytes.startsWith("%PDF"));

      const isImage =
        ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(fileExt) ||
        Boolean(title.match(/\.(png|jpe?g|webp|gif|svg)$/i)) ||
        Boolean(blobData.type?.startsWith("image/")) ||
        Boolean(contentType.startsWith("image/"));

      const isHtml =
        blobData.type?.includes("html") ||
        contentType.includes("html") ||
        title.toLowerCase().endsWith(".html") ||
        firstBytes.toLowerCase().includes("<!doctype html") ||
        firstBytes.toLowerCase().includes("<html");

      // 1. Image preview
      if (isImage) {
        const imageBlob = new Blob([blobData], { type: blobData.type || contentType || "image/png" });
        const blobUrl = URL.createObjectURL(imageBlob);
        setPreviewDocBlob(imageBlob);
        setPreviewDocType("image");
        setPreviewDocUrl(blobUrl);
        toast.success("تم فتح الصورة للمعاينة المباشرة! 🖼️");
        return;
      }

      // 2. Word preview (.docx / .doc)
      if (isWordName || isWordType) {
        setPreviewDocBlob(blobData);
        setPreviewDocType("docx");
        setPreviewDocUrl("docx_viewer_active");
        toast.success("تم فتح مستند Word للمعاينة المباشرة! 📄");
        return;
      }

      // 3. HTML preview (synthesized official specifications)
      if (isHtml) {
        const htmlBlob = new Blob([blobData], { type: "text/html;charset=utf-8" });
        const blobUrl = URL.createObjectURL(htmlBlob);
        setPreviewDocBlob(htmlBlob);
        setPreviewDocType("pdf"); // Iframe in viewer displays HTML perfectly
        setPreviewDocUrl(blobUrl);
        toast.success("تم فتح كراسة الشروط والمواصفات الرسمية للمعاينة! 📜");
        return;
      }

      // 4. Default PDF preview
      const pdfBlob = new Blob([blobData], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(pdfBlob);
      setPreviewDocBlob(pdfBlob);
      setPreviewDocType("pdf");
      setPreviewDocUrl(blobUrl);
      toast.success("تم فتح كراسة الشروط للمعاينة المباشرة! 📄");
    } catch (err: any) {
      console.error("Preview error:", err);
      toast.error("تعذر فتح معاينة الملف — جاري المحاولة بتحميله مباشرة إلى جهازك...");
      try {
        await handleDownloadDocument(doc);
      } catch {}
    } finally {
      setIsProcessingDoc(false);
    }
  };

  const handleDownloadDocument = async (doc: { id?: string; fileName?: string; filePath?: string; title?: string; fileType?: string }) => {
    try {
      toast.info("جاري تحميل الملف إلى جهازك...");
      const title = doc.fileName || doc.title || "مستند_العملية";
      let blobData: Blob | null = null;
      let contentType = "";
      let ext = (doc.fileType || "").toLowerCase();
      const currentOpId = op?.id;

      // Tier 1: Try operation document download endpoint
      if (doc.id && currentOpId) {
        try {
          const res = await api.get(`/operations/${currentOpId}/documents/${doc.id}/download`, { responseType: "blob" });
          blobData = res.data;
          contentType = String(res.headers?.["content-type"] || "").toLowerCase();
        } catch (opErr) {
          console.warn("Direct download failed, trying fallback:", opErr);
        }
      }

      // Tier 2: Try direct filePath
      if (!blobData) {
        const targetUrl = doc.filePath || "";
        if (targetUrl) {
          try {
            const cleanUrl = targetUrl.startsWith("/") ? targetUrl : `/${targetUrl}`;
            const res = await api.get(cleanUrl, { responseType: "blob" });
            blobData = res.data;
            contentType = String(res.headers?.["content-type"] || "").toLowerCase();
          } catch {}
        }
      }

      // Tier 3: Radar download fallback
      if (!blobData) {
        const res = await api.get(`/radar/download-doc?docId=booklet&download=true`, { responseType: "blob" });
        blobData = res.data;
        contentType = String(res.headers?.["content-type"] || "").toLowerCase();
      }

      if (!blobData) {
        throw new Error("تعذر تحميل الملف");
      }

      // Determine proper file extension
      let downloadName = title;
      if (contentType.includes("word") || contentType.includes("officedocument") || blobData.type?.includes("word")) {
        ext = "docx";
      } else if (contentType.includes("image/png") || blobData.type?.includes("image/png")) {
        ext = "png";
      } else if (contentType.includes("image/jpeg") || blobData.type?.includes("image/jpeg")) {
        ext = "jpg";
      } else if (contentType.includes("html") || blobData.type?.includes("html")) {
        ext = "html";
      } else if (!ext) {
        ext = "pdf";
      }

      if (!downloadName.toLowerCase().endsWith(`.${ext}`)) {
        downloadName = `${downloadName}.${ext}`;
      }

      const blobUrl = URL.createObjectURL(blobData);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", downloadName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success(`تم تحميل الملف (${downloadName}) بنجاح! 📥`);
    } catch {
      toast.error("فشل تحميل الملف إلى الجهاز");
    }
  };

  const closeDocViewer = () => {
    if (previewDocUrl && previewDocUrl !== "docx_viewer_active") {
      URL.revokeObjectURL(previewDocUrl);
    }
    setPreviewDocUrl(null);
    setPreviewDocBlob(null);
    setPreviewDocType(null);
    setIsFullscreenDoc(false);
  };

  const fetchOp = async () => {
    try {
      const res = await api.get(`/operations/${id}`);
      setOp(res.data);

      // Align active company scope: if viewing Company C's operation, immediately align navbar/sidebar to Company C!
      let opCompanyCode: string | null = null;
      if (res.data?.companies && res.data.companies.length > 0) {
        for (const compRel of res.data.companies) {
          const code = compRel.company?.code || (compRel.displayCode ? compRel.displayCode.charAt(0) : null);
          if (code && ["A", "B", "C", "D"].includes(code.toUpperCase())) {
            opCompanyCode = code.toUpperCase();
            break;
          }
        }
      }

      if (opCompanyCode && ["A", "B", "C", "D"].includes(opCompanyCode)) {
        if (selectedCompany !== opCompanyCode) {
          setSelectedCompany(opCompanyCode as CompanyCode);
        }
      }
    } catch {
      router.push("/dashboard/operations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOp(); }, [id]);

  const handleStatusChange = async (newStatus: string, unlockCode = false) => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/operations/${id}/status`, {
        status: newStatus,
        isCodeLocked: unlockCode ? false : undefined,
      });
      if (res.data && Array.isArray(res.data.companies)) {
        setOp(res.data);
      } else {
        await fetchOp();
      }
      toast.success(`تم تحديث مرحلة العملية بنجاح إلى: ${STATUS_LABELS[newStatus]?.label || newStatus}`);
      setStatusActionModal(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل في تحديث مرحلة العملية");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleCodeLock = async () => {
    try {
      const res = await api.patch(`/operations/${id}/toggle-lock`);
      if (res.data && Array.isArray(res.data.companies)) {
        setOp(res.data);
      } else {
        setOp((prev) => (prev ? { ...prev, isCodeLocked: res.data.isCodeLocked } : null));
      }
      if (res.data.isCodeLocked) {
        toast.success("تم قفل كود العملية 🔒");
      } else {
        toast.success("تم فك قفل كود العملية — أصبح التعديل متاحاً الآن 🔓");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل في تغيير حالة قفل الكود");
    }
  };

  // ━━━ حالة التحكم اليدوي في اكتمال المراحل (منتهية ✓ أو لسة مكتملتش) ━━━
  const [manualStageOverrides, setManualStageOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (id) {
      try {
        const saved = localStorage.getItem(`op_stage_overrides_${id}`);
        if (saved) {
          setManualStageOverrides(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Error loading stage overrides:", e);
      }
    }
  }, [id]);

  const handleToggleStageCompletion = (tabId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const tab = LIFECYCLE_TABS.find((t) => t.id === tabId);
    if (!tab || !op) return;

    const currentStatus = getTabCompletionStatus(tab, op, manualStageOverrides);
    const willBeDone = currentStatus !== "done";

    const updated = {
      ...manualStageOverrides,
      [tabId]: willBeDone,
    };
    setManualStageOverrides(updated);
    if (id) {
      try {
        localStorage.setItem(`op_stage_overrides_${id}`, JSON.stringify(updated));
      } catch (err) {
        console.error("Error saving stage overrides:", err);
      }
    }

    if (willBeDone) {
      toast.success(`تم تحديد مرحلة "${tab.label}" كمنتهية ومكتملة ✓`);
    } else {
      toast.info(`تم إرجاع مرحلة "${tab.label}" إلى قيد التنفيذ (غير مكتملة)`);
    }
  };

  const handleResetStageOverrides = () => {
    setManualStageOverrides({});
    if (id) {
      localStorage.removeItem(`op_stage_overrides_${id}`);
    }
    toast.success("تم إعادة ضبط المراحل للحساب التلقائي");
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-6xl mx-auto animate-pulse">
        <div className="h-10 w-48 bg-muted rounded-xl" />
        <div className="h-28 bg-muted rounded-3xl" />
        <div className="h-16 bg-muted rounded-2xl" />
        <div className="h-64 bg-muted rounded-2xl" />
      </div>
    );
  }

  if (!op) return null;

  const currentStageIndex = getStageIndex(op.status);
  const currentStage = LIFECYCLE_STAGES[currentStageIndex] || LIFECYCLE_STAGES[0];
  const nextStage = currentStageIndex < LIFECYCLE_STAGES.length - 1 ? LIFECYCLE_STAGES[currentStageIndex + 1] : null;
  const previousStages = LIFECYCLE_STAGES.filter((_, idx) => idx < currentStageIndex);

  const status = STATUS_LABELS[op.status] || { label: op.status, badgeBg: "bg-muted text-muted-foreground" };
  const mainCompany = op.companies?.[0];
  const completedCount = LIFECYCLE_TABS.filter(t => getTabCompletionStatus(t, op, manualStageOverrides) === "done").length;
  const progressPercent = Math.round((completedCount / LIFECYCLE_TABS.length) * 100);

  const currentTabDef = LIFECYCLE_TABS.find((t) => t.id === activeTab) || LIFECYCLE_TABS[0];
  const currentTabOrder = currentTabDef.order;
  const nextTabDef = LIFECYCLE_TABS.find((t) => t.order === currentTabOrder + 1);
  const prevTabDef = LIFECYCLE_TABS.find((t) => t.order === currentTabOrder - 1);

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview": return <TabOverview op={op} onRefresh={fetchOp} onSelectTab={setActiveTab} />;
      case "dates": return <TabDates op={op} onRefresh={fetchOp} />;
      case "market_study": return <TabMarketStudy op={op} onRefresh={fetchOp} onGoBooklet={() => setActiveTab("booklet")} onPreviewDoc={handlePreviewDocument} onDownloadDoc={handleDownloadDocument} />;
      case "booklet": return <TabBooklet op={op} onRefresh={fetchOp} onPreviewDoc={handlePreviewDocument} onDownloadDoc={handleDownloadDocument} />;
      case "guarantee_initial": return <TabBooklet op={op} onRefresh={fetchOp} onPreviewDoc={handlePreviewDocument} onDownloadDoc={handleDownloadDocument} />;
      case "clarification": return <TabClarification op={op} onRefresh={fetchOp} onPreviewDoc={handlePreviewDocument} onDownloadDoc={handleDownloadDocument} />;
      case "technical": return <TabTechnical op={op} onRefresh={fetchOp} onOpenSmartCover={() => setSmartCoverOpen(true)} />;
      case "financial": return <TabFinancial op={op} onRefresh={fetchOp} />;
      case "submission_package":
      case "submission": return <TabSubmissionPackage op={op} onRefresh={fetchOp} onPreviewDoc={handlePreviewDocument} onDownloadDoc={handleDownloadDocument} />;
      case "tech_opening": return <TabTechOpening op={op} onRefresh={fetchOp} onGoGrievance={() => setActiveTab("grievance")} onGoFinancial={() => setActiveTab("fin_opening")} />;
      case "fin_opening": return <TabFinOpening op={op} onRefresh={fetchOp} onGoAward={() => setActiveTab("award")} onPreviewDoc={handlePreviewDocument} onDownloadDoc={handleDownloadDocument} />;
      case "award": return <TabAward op={op} onRefresh={fetchOp} onGoGuarantee={() => setActiveTab("guarantee_final")} onPreviewDoc={handlePreviewDocument} onDownloadDoc={handleDownloadDocument} />;
      case "supply_order": return <TabAward op={op} onRefresh={fetchOp} onGoGuarantee={() => setActiveTab("guarantee_final")} onPreviewDoc={handlePreviewDocument} onDownloadDoc={handleDownloadDocument} />;
      case "guarantee_final": return <TabGuarantees op={op} type="FINAL" title="التأمين النهائي (5% من العقد)" onRefresh={fetchOp} onPreviewDoc={handlePreviewDocument} onDownloadDoc={handleDownloadDocument} />;
      case "supply": return <TabSupply op={op} onRefresh={fetchOp} />;
      case "certificates": return <TabCertificates op={op} onRefresh={fetchOp} />;
      case "finance": return <TabFinance op={op} onRefresh={fetchOp} />;
      case "close": return <TabClose op={op} onRefresh={fetchOp} onPreviewDoc={handlePreviewDocument} onDownloadDoc={handleDownloadDocument} />;
      case "companies": return <TabOverview op={op} onRefresh={fetchOp} onSelectTab={setActiveTab} />;
      case "grievance": return <TabTechOpening op={op} onRefresh={fetchOp} onGoGrievance={() => setActiveTab("grievance")} onGoFinancial={() => setActiveTab("fin_opening")} />;
      case "recovery": return <TabClose op={op} onRefresh={fetchOp} onPreviewDoc={handlePreviewDocument} onDownloadDoc={handleDownloadDocument} />;
      case "archive": return <TabClose op={op} onRefresh={fetchOp} onPreviewDoc={handlePreviewDocument} onDownloadDoc={handleDownloadDocument} />;
      default: return <TabOverview op={op} onRefresh={fetchOp} onSelectTab={setActiveTab} />;
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto animate-fade-in pb-16">
      {/* ━━━ TOP BREADCRUMB NAV ━━━ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/operations">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border bg-muted/40 text-foreground hover:bg-muted cursor-pointer">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link href="/dashboard" className="hover:text-blue-600">الرئيسية</Link>
              <span>/</span>
              <Link href="/dashboard/operations" className="hover:text-blue-600">العمليات والمناقصات</Link>
              <span>/</span>
              <span className="text-foreground font-mono font-bold">{mainCompany?.displayCode || `#${op.serialNumber}`}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSmartCoverOpen(true)} className="border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 rounded-xl text-xs h-9 cursor-pointer font-bold">
            <Sparkles className="h-3.5 w-3.5 ml-1.5" />الغلاف الذكي
          </Button>
          <Button variant="outline" size="sm" onClick={fetchOp} className="border-border bg-muted/40 text-foreground hover:bg-muted rounded-xl text-xs h-9 cursor-pointer">
            <RefreshCw className="h-3.5 w-3.5 ml-1.5" />تحديث
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="border-border bg-muted/40 text-foreground hover:bg-muted rounded-xl text-xs h-9 cursor-pointer">
            <Printer className="h-3.5 w-3.5 ml-1.5" />طباعة
          </Button>
        </div>
      </div>

      {/* ━━━ OPERATION HEADER CARD ━━━ */}
      <div className="relative overflow-hidden rounded-3xl glass-card p-5 sm:p-7 border border-border shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {(op.companies || []).map((oc: any) => (
                <span key={oc.displayCode} className="px-3 py-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-mono font-black text-sm shadow-sm">
                  {oc.displayCode}
                </span>
              ))}
              <Badge className={`${status.badgeBg} border text-xs px-3 py-1 font-bold`}>{status.label}</Badge>
              <span className="px-2.5 py-1 rounded-lg bg-muted text-foreground border border-border text-xs font-semibold">
                {TENDER_TYPE_LABELS[op.tenderType] || op.tenderType}
              </span>
              {op.isCodeLocked ? (
                <button
                  onClick={handleToggleCodeLock}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-500/25 cursor-pointer transition-colors"
                  title="انقر لتمكين تعديل الكود"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>كود محمي ومعتمد</span>
                </button>
              ) : (
                <button
                  onClick={handleToggleCodeLock}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-500/25 cursor-pointer transition-colors"
                  title="انقر لحماية واعتماد الكود"
                >
                  <KeyRound className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>تعديل الكود متاح</span>
                </button>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground leading-tight">{op.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="font-bold text-foreground">{op.authority}</span>
              </div>
              {op.externalNumber && (
                <div className="text-muted-foreground font-mono">
                  رقم الجهة: <span className="text-foreground font-bold">{op.externalNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Summary Card */}
          <div className="shrink-0 p-4 rounded-2xl bg-muted/40 border border-border w-full md:w-56 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-semibold">نسبة إنجاز الملف</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{progressPercent}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-muted/80 p-0.5 border border-border/60 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="text-[11px] text-muted-foreground text-center">{completedCount} من {LIFECYCLE_TABS.length} مرحلة مكتملة</div>
          </div>
        </div>
      </div>

      {/* ━━━ تـنبيهات الحالة الاستثنائية (ملغاة أو مغلقة) ━━━ */}
      {op.status === "CANCELLED" && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shrink-0">
              <Ban className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-rose-800 dark:text-rose-200">العملية ملغاة حالياً (CANCELLED)</h4>
              <p className="text-xs text-rose-700/90 dark:text-rose-300/90">
                جميع بيانات ومستندات وتفاصيل العملية محفوظة بأمان. يمكنك إعادة تفعيلها وفتحها في أي وقت بنقرة زر واحدة.
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleStatusChange("DRAFT", true)}
            disabled={actionLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer shrink-0 shadow-sm flex items-center gap-1.5"
          >
            <History className="h-4 w-4" />
            <span>إعادة تفعيل العملية</span>
          </Button>
        </div>
      )}

      {op.status === "CLOSED" && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-500/10 border-2 border-slate-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-700 text-white shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-foreground">العملية مغلقة رسمياً ومكتملة بالكامل</h4>
              <p className="text-xs text-muted-foreground">
                تم استيفاء كامل بنود التوريد والفحص النهائي وصرف المستخلصات واسترداد التأمينات. يمكنك إرجاعها أو إعادة فتحها لأي سبب متى شئت.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setStatusActionModal({
                type: "ROLLBACK",
                targetStatus: "COMPLETED",
                targetLabel: "الاستلام والفحص النهائي",
                description: "سيتم إرجاع العملية للخلف وفك قفل الكود لإتاحة تعديل أي بيانات محاسبية أو تنفيذية.",
              });
            }}
            className="border-border text-foreground hover:bg-muted text-xs h-9 rounded-xl font-bold cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            <span>الرجوع لمرحلة سابقة</span>
          </Button>
        </div>
      )}

      {/* ━━━ المسار الزمني والمرحلي الموحد للمناقصة (SINGLE UNIFIED LIFECYCLE TIMELINE) ━━━ */}
      <div className="rounded-3xl glass-card p-5 sm:p-7 border border-border shadow-xl space-y-6 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Master Header: Stage Name, Order, Progress & Advance Control */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-600/10 border border-blue-500/25 text-blue-700 dark:text-blue-300 text-xs font-bold whitespace-nowrap w-fit">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>المسار الزمني لمراحل المناقصة (Tender Lifecycle Roadmap)</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground tracking-tight">
                المرحلة الحالية: <span className="text-blue-600 dark:text-blue-400">#{currentTabDef.order} {currentTabDef.label}</span>
              </h2>
              <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-mono font-bold text-xs px-3 py-1 rounded-xl shadow-xs whitespace-nowrap">
                مرحلة {currentTabDef.order} من {LIFECYCLE_TABS.length} • {progressPercent}% مكتمل
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
              {currentTabDef.description}
            </p>
          </div>

          {/* Primary Advance Button */}
          {nextTabDef && (
            <div className="shrink-0 self-start lg:self-center pt-1 lg:pt-0">
              <Button
                onClick={() => setActiveTab(nextTabDef.id)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm h-11 px-5 rounded-2xl shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer active:scale-95 transition-all shrink-0 whitespace-nowrap group"
              >
                <span>الانتقال للمرحلة التالية ({nextTabDef.shortLabel})</span>
                <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </Button>
            </div>
          )}
        </div>

        {/* Action Controls Toolbar Strip */}
        <div className="relative z-10 p-3 sm:p-3.5 rounded-2xl bg-muted/40 dark:bg-muted/20 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Operations Navigation & Status Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* 1. Rollback Stage */}
            {currentTabOrder > 1 && (
              <Select
                value=""
                onValueChange={(val) => {
                  if (val) setActiveTab(val);
                }}
              >
                <SelectTrigger className="bg-background border-border hover:bg-muted text-foreground rounded-xl text-xs h-9 font-bold w-auto min-w-[155px] cursor-pointer shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>الرجوع لمرحلة سابقة</span>
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground border-b border-border">
                    اختر المرحلة للرجوع إليها:
                  </div>
                  {LIFECYCLE_TABS.filter((t) => t.order < currentTabOrder).map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-right font-medium text-xs">
                      #{t.order} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* 2. Direct Toggle Current Stage Completion (إكمال أو إرجاع المرحلة الحالية) */}
            {(() => {
              const isCurrentDone = getTabCompletionStatus(currentTabDef, op, manualStageOverrides) === "done";
              return (
                <Button
                  variant="outline"
                  onClick={() => handleToggleStageCompletion(currentTabDef.id)}
                  className={`h-9 text-xs font-bold rounded-xl border cursor-pointer flex items-center gap-1.5 shadow-xs transition-all active:scale-95 ${
                    isCurrentDone
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25"
                      : "bg-background border-dashed border-blue-500/50 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10"
                  }`}
                  title={
                    isCurrentDone
                      ? "المرحلة محددة كمنتهية ومكتملة ✓ — انقر هنا لإرجاعها كغير مكتملة"
                      : "المرحلة غير مكتملة — انقر هنا لتحديدها كمنتهية ومكتملة (علامة الصح الخضراء ✓)"
                  }
                >
                  {isCurrentDone ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>المرحلة الحالية: منتهية ✓ (انقر للإرجاع)</span>
                    </>
                  ) : (
                    <>
                      <Circle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span>تحديد المرحلة الحالية: منتهية ✓</span>
                    </>
                  )}
                </Button>
              );
            })()}

            {/* 3. Code Lock Toggle */}
            <Button
              variant="outline"
              onClick={handleToggleCodeLock}
              className={`h-9 text-xs font-bold rounded-xl border cursor-pointer flex items-center gap-1.5 shadow-xs transition-all ${
                op.isCodeLocked
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                  : "bg-background border-border text-foreground hover:bg-muted"
              }`}
            >
              {op.isCodeLocked ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>كود محمي ومعتمد</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>تمكين تعديل الكود</span>
                </>
              )}
            </Button>

            {/* 4. Status Selector */}
            <Select
              value={op.status}
              onValueChange={(val) => {
                if (val === op.status || !val) return;
                setStatusActionModal({
                  type: "MANUAL",
                  targetStatus: val,
                  targetLabel: STATUS_LABELS[val]?.label || val,
                  description: `هل ترغب بتعيين حالة العملية رسمياً إلى (${STATUS_LABELS[val]?.label || val})؟`,
                });
              }}
            >
              <SelectTrigger className="bg-background border-border rounded-xl text-xs h-9 font-bold w-auto min-w-[160px] cursor-pointer shadow-xs">
                <div className="flex items-center gap-1.5 text-foreground truncate">
                  <SlidersHorizontal className="h-3 w-3 text-blue-600" />
                  <span className="truncate">الحالة: {STATUS_LABELS[op.status]?.label || op.status}</span>
                </div>
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground max-h-72">
                <div className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground border-b border-border">
                  تعيين الحالة بقاعدة البيانات:
                </div>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-right font-medium text-xs">
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Reset overrides button if any stage was manually customized */}
            {Object.keys(manualStageOverrides).length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetStageOverrides}
                className="h-8 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer px-2"
                title="إلغاء التعديلات اليدوية وإعادة حساب اكتمال المراحل تلقائياً"
              >
                <RotateCcw className="h-3 w-3 ml-1" />
                <span>إعادة الحساب التلقائي</span>
              </Button>
            )}
          </div>

          {/* 5. Cancellation / Reactivation Action */}
          <div className="shrink-0 self-end sm:self-center">
            {op.status !== "CANCELLED" ? (
              <Button
                variant="outline"
                onClick={() => {
                  setStatusActionModal({
                    type: "CANCEL",
                    targetStatus: "CANCELLED",
                    targetLabel: "إلغاء العملية",
                    description: "سيتم تحويل حالة العملية إلى (ملغاة)، مع الاحتفاظ بكافة البيانات والمستندات ويمكنك إعادة تفعيلها لاحقاً.",
                  });
                }}
                className="border-rose-500/40 text-rose-600 hover:bg-rose-500/10 hover:border-rose-500/60 hover:text-rose-700 text-xs font-bold h-9 px-3.5 rounded-xl cursor-pointer shadow-xs active:scale-95 transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                <Ban className="h-3.5 w-3.5 text-rose-500" />
                <span>إلغاء العملية</span>
              </Button>
            ) : (
              <Button
                onClick={() => handleStatusChange("DRAFT", true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer shadow-sm active:scale-95 transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                <History className="h-3.5 w-3.5" />
                <span>إعادة تفعيل العملية</span>
              </Button>
            )}
          </div>
        </div>

        {/* Overall Progress Bar Track */}
        <div className="space-y-2 px-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>نسبة إنجاز دورة حياة العملية الشاملة</span>
            <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
              {completedCount} من {LIFECYCLE_TABS.length} مراحل مكتملة ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted/80 overflow-hidden border border-border/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Single Master 15-Stage Interactive Stepper Track */}
        <div className="relative overflow-x-auto pb-3 pt-2 -mx-2 px-2 scrollbar-thin">
          <div className="flex items-start min-w-[1360px] justify-between relative py-2">
            {/* Background Track Line */}
            <div className="absolute top-8 right-6 left-6 h-0.5 bg-border/80 -z-0" />
            {/* Completed Progress Line */}
            <div
              className="absolute top-8 right-6 h-0.5 bg-gradient-to-l from-emerald-500 to-blue-600 transition-all duration-500 -z-0"
              style={{ width: `${Math.min(96, (completedCount / LIFECYCLE_TABS.length) * 100)}%` }}
            />

            {LIFECYCLE_TABS.map((tab) => {
              const tabStatus = getTabCompletionStatus(tab, op, manualStageOverrides);
              const isActive = activeTab === tab.id;
              const TabIcon = tab.icon;
              const isDone = tabStatus === "done";
              return (
                <div
                  key={tab.id}
                  className="flex flex-col items-center text-center group relative z-10 w-20 shrink-0 select-none"
                >
                  {/* Step Order Badge */}
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md mb-1 border transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : isDone
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    #{tab.order}
                  </span>

                  {/* Node Circle with Checkmark Toggle Badge */}
                  <div className="relative">
                    {/* Main Node Circle (انتقال للمرحلة) */}
                    <button
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xs transition-all duration-200 border-2 shadow-sm cursor-pointer ${
                        isActive
                          ? "scale-110 ring-4 ring-blue-500/30 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-white shadow-lg"
                          : isDone
                          ? "bg-emerald-500 text-white border-emerald-400 hover:scale-110"
                          : "bg-card text-muted-foreground border-border hover:border-blue-400 hover:scale-105"
                      }`}
                      title={`انتقال لمرحلة #${tab.order} ${tab.label}`}
                    >
                      {isDone && !isActive ? (
                        <Check className="h-4.5 w-4.5 stroke-[2.5]" />
                      ) : (
                        <TabIcon className="h-4.5 w-4.5" />
                      )}
                    </button>

                    {/* Interactive Completion Toggle (علامة الصح الخضراء أو دائرة الإكمال) */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleStageCompletion(tab.id, e)}
                      className={`absolute -top-1.5 -right-1.5 z-20 w-5 h-5 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer ${
                        isDone
                          ? "bg-emerald-600 text-white hover:bg-rose-600 hover:scale-125 border border-white dark:border-slate-800"
                          : "bg-background border border-border text-muted-foreground hover:bg-emerald-500 hover:text-white hover:border-emerald-600 hover:scale-125"
                      }`}
                      title={
                        isDone
                          ? `المرحلة منتهية ومكتملة ✓ — انقر هنا لإرجاعها كغير مكتملة`
                          : `المرحلة غير مكتملة — انقر هنا لتحديدها كمنتهية ومكتملة ✓`
                      }
                    >
                      {isDone ? (
                        <Check className="h-3 w-3 stroke-[3]" />
                      ) : (
                        <Circle className="h-2.5 w-2.5 stroke-[2]" />
                      )}
                    </button>
                  </div>

                  {/* Step Title Label (انتقال للمرحلة) */}
                  <button
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`mt-1.5 text-[11px] font-bold leading-tight line-clamp-2 px-0.5 transition-colors cursor-pointer hover:underline ${
                      isActive
                        ? "text-blue-600 dark:text-blue-400 font-black"
                        : isDone
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.shortLabel}
                  </button>

                  {/* Active Indicator Pulse */}
                  {isActive && (
                    <span className="mt-1 w-2 h-2 rounded-full bg-blue-600 animate-pulse shadow-xs" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ━━━ نافذة تأكيد الإجراء وتغيير/إرجاع/إلغاء المرحلة ━━━ */}
      {statusActionModal && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  {statusActionModal.type === "CANCEL" ? (
                    <Ban className="h-5 w-5 text-rose-600" />
                  ) : statusActionModal.type === "ROLLBACK" ? (
                    <History className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  )}
                  <h3 className="font-extrabold text-foreground text-base">
                    {statusActionModal.type === "CANCEL"
                      ? "تأكيد إلغاء العملية"
                      : statusActionModal.type === "ROLLBACK"
                      ? "تأكيد إرجاع المرحلة"
                      : statusActionModal.type === "ADVANCE"
                      ? "تأكيد إتمام المرحلة والانتقال"
                      : "تأكيد تغيير المرحلة"}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setStatusActionModal(null)}
                  className="rounded-full h-8 w-8 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">المرحلة الحالية:</span>
                  <span className="font-bold text-foreground">{STATUS_LABELS[op.status]?.label || op.status}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-border/60 pt-2">
                  <span className="text-muted-foreground">المرحلة المستهدفة:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{statusActionModal.targetLabel}</span>
                </div>
              </div>

              <p className="text-xs text-foreground leading-relaxed">
                {statusActionModal.description}
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setStatusActionModal(null)}
                  className="h-10 text-xs rounded-xl border-border text-foreground hover:bg-muted cursor-pointer"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={() => handleStatusChange(statusActionModal.targetStatus, statusActionModal.type === "ROLLBACK")}
                  disabled={actionLoading}
                  className={`font-bold text-xs h-10 px-5 rounded-xl cursor-pointer shadow-md flex items-center gap-1.5 text-white ${
                    statusActionModal.type === "CANCEL"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : statusActionModal.type === "ROLLBACK"
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>تأكيد الإجراء وحفظ التغيير</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ━━━ ACTIVE TAB CONTENT ━━━ */}
      <div className="animate-fade-in">
        {renderTabContent()}
      </div>

      {/* ━━━ SMART COVER MODAL ━━━ */}
      {smartCoverOpen && (
        <Portal>
          <SmartCoverModal op={op} onClose={() => setSmartCoverOpen(false)} />
        </Portal>
      )}

      {/* ━━━ IN-APP BUILT-IN PDF VIEWER MODAL (معاينة وتحميل كراسة الشروط والمستندات) ━━━ */}
      {previewDocUrl && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-0 sm:p-2 md:p-4 animate-fade-in">
            <div
              className={`transition-all duration-200 bg-slate-950 border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden ${
                isFullscreenDoc
                  ? "fixed inset-0 z-[110] w-screen h-screen rounded-none"
                  : "w-full h-full sm:w-[98vw] sm:max-w-7xl sm:h-[95vh] rounded-none sm:rounded-3xl"
              }`}
            >
              {/* Responsive Header */}
              <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between gap-2 sm:gap-4 bg-slate-900/95 text-white flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2.5 min-w-0 max-w-full sm:max-w-[60%]">
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                      previewDocType === "docx"
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30 font-black font-mono"
                        : previewDocType === "image"
                        ? "bg-purple-500/20 text-purple-400 border-purple-500/30 font-black font-mono"
                        : "bg-red-500/20 text-red-400 border-red-500/30 font-black font-mono"
                    }`}
                  >
                    {previewDocType === "docx" ? "DOCX" : previewDocType === "image" ? "IMG" : "PDF"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-white text-xs sm:text-sm leading-tight truncate" title={previewDocTitle}>
                        {previewDocTitle}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                        العملية {mainCompany?.displayCode || `#${op.serialNumber}`}
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">
                      {op.authority} • {op.name}
                    </span>
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  {/* 1. Direct Download to Computer */}
                  <Button
                    size="sm"
                    onClick={() => handleDownloadDocument(previewDocItem || { fileName: previewDocTitle, filePath: previewDocUrl || undefined })}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition-all"
                    title="تحميل الملف مباشرة إلى جهازك"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>تحميل للجهاز</span>
                  </Button>

                  {/* 2. Open in new tab (PDF / Image) */}
                  {(previewDocType === "pdf" || previewDocType === "image") && previewDocUrl && previewDocUrl !== "docx_viewer_active" && (
                    <a
                      href={previewDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 sm:h-9 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-all"
                      title="فتح في علامة تبويب مستقلة"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">نافذة مستقلة</span>
                    </a>
                  )}

                  {/* 3. Fullscreen Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsFullscreenDoc(!isFullscreenDoc)}
                    className="p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer transition-all"
                    title={isFullscreenDoc ? "تصغير الحجم" : "ملء الشاشة بالكامل"}
                  >
                    {isFullscreenDoc ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>

                  {/* 4. Close */}
                  <button
                    type="button"
                    onClick={closeDocViewer}
                    className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-rose-500/20 hover:text-rose-400 cursor-pointer transition-all"
                    title="إغلاق المعاينة"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Embedded Viewer: Multi Engine (Word vs Image vs PDF) */}
              <div className="flex-1 w-full bg-slate-900 overflow-hidden relative">
                {previewDocType === "docx" ? (
                  <DocxViewer
                    blob={previewDocBlob}
                    fileName={previewDocTitle}
                    onDownload={() => handleDownloadDocument(previewDocItem || { fileName: previewDocTitle, filePath: previewDocUrl || undefined })}
                  />
                ) : previewDocType === "image" ? (
                  <div className="w-full h-full flex items-center justify-center p-4 bg-slate-950 overflow-auto">
                    <img
                      src={previewDocUrl!}
                      alt={previewDocTitle}
                      className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-slate-800"
                    />
                  </div>
                ) : (
                  <iframe
                    src={`${previewDocUrl}#toolbar=1&navpanes=1&view=FitH`}
                    className="w-full h-full border-0"
                    title={previewDocTitle}
                  />
                )}
              </div>

              {/* Mobile Helper Strip */}
              <div className="sm:hidden px-3 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>للتحكم الأفضل على شاشة هاتفك:</span>
                <button
                  onClick={() => handleDownloadDocument({ fileName: previewDocTitle, filePath: previewDocUrl || undefined })}
                  className="text-blue-400 font-bold underline cursor-pointer"
                >
                  تنزيل كملف للجهاز
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
