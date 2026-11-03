"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Settings, Save, Loader2, Shield, Bell, Percent, Scale,
  Lock, CheckCircle2, Sliders, RefreshCw, Building2,
  Globe2, Check, AlertCircle, Info, Sparkles, Search,
  X, Landmark, FileText, Phone, Mail, MapPin, Hash,
  Clock, ShieldCheck, ChevronRight, ChevronLeft, RotateCcw, ArrowRight,
  Calendar, AlertTriangle, Timer, Hourglass, Trash2,
  Send, Smartphone, MessageSquare, KeyRound, ExternalLink, ShieldAlert, CheckCheck, Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";
import { useCompany } from "@/context/company-context";

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  label: string | null;
  type: string;
  group: string | null;
  updatedAt?: string;
}

interface CompanyItem {
  id: string;
  name: string;
  code: string;
  commercialRegister: string | null;
  taxCard: string | null;
  license: string | null;
  address: string | null;
  email: string | null;
  fax: string | null;
  bankName: string | null;
  bankBranch: string | null;
  bankAccountNumber: string | null;
  isActive: boolean;
}

// Detailed Arabic explanations and units for each setting key
const SETTING_DETAILS: Record<
  string,
  { label: string; description: string; unit?: string; type: "number" | "string" | "boolean" | "list"; group: string }
> = {
  // 1. الإعدادات العامة
  system_name: {
    label: "اسم المنظومة الرسمي",
    description: "الاسم المعتمد الذي يظهر في ترويسة التقارير، مذكرات العطاءات، والمستندات الرسمية الصادرة.",
    type: "string",
    group: "general",
  },
  default_currency: {
    label: "العملة الرسمية المعتمدة بالمنظومة",
    description: "عملة التسعير واحتساب الضرائب وخطابات الضمان والمستخلصات في كافة العمليات المالية.",
    type: "string",
    group: "general",
  },
  fiscal_year_start: {
    label: "تاريخ بداية السنة المالية الرسمية",
    description: "تاريخ بدء الدورة المحاسبية السنوية لاعتماد الموازنات وإقفال الحسابات (شهر-يوم).",
    type: "string",
    group: "general",
  },

  // 2. الضرائب والرسوم المالية
  vat_rate: {
    label: "نسبة ضريبة القيمة المضافة",
    description: "تطبق آلياً على كراسات الشروط، فواتير المشتريات، وتوريدات العقود وفقاً للقانون 67 لسنة 2016.",
    unit: "٪",
    type: "number",
    group: "tax",
  },
  tax_deduction_rate: {
    label: "نسبة الخصم والتحصيل من المنبع (أ.ت.ص)",
    description: "نسبة الأرباح التجارية والصناعية المستقطعة نظامياً من مستحقات الموردين ومقاولي الباطن.",
    unit: "٪",
    type: "number",
    group: "tax",
  },
  performance_bond_rate: {
    label: "نسبة ضمان الأعمال المحتجزة من المستخلصات",
    description: "النسبة المحتجزة قانونياً من كل مستخلص جاري لحين إتمام الاستلام النهائي للمشروع.",
    unit: "٪",
    type: "number",
    group: "tax",
  },

  // 3. خطابات الضمان والتأمينات البنكية
  initial_guarantee_rate: {
    label: "نسبة التأمين الابتدائي لدخول المناقصات",
    description: "النسبة التقديرية المعتمدة لاحتساب قيمة خطاب الضمان الابتدائي المطلوب تقديمه بالعطاء الفني.",
    unit: "٪",
    type: "number",
    group: "guarantees",
  },
  initial_guarantee_duration: {
    label: "المدة القياسية لسريان التأمين الابتدائي",
    description: "مدة صلاحية خطاب الضمان البنكي الصادر لدخول العملية لحين انتهاء البت الفني والمالي.",
    unit: "يوم",
    type: "number",
    group: "guarantees",
  },
  final_guarantee_rate: {
    label: "نسبة التأمين النهائي وحسن التنفيذ",
    description: "النسبة المطلوبة عند الترسية لإصدار خطاب ضمان حسن التنفيذ لضمان إتمام بنود العقد.",
    unit: "٪",
    type: "number",
    group: "guarantees",
  },
  insurance_recovery_days: {
    label: "المدة النظامية لاسترداد التأمين بعد الاستلام",
    description: "المهلة المحددة لمخاطبة الجهة الإدارية واسترداد أصل خطاب الضمان بعد محضر الاستلام الابتدائي.",
    unit: "يوم",
    type: "number",
    group: "guarantees",
  },

  // 4. رادار المناقصات والربط الذكي
  "radar.daily_scan_enabled": {
    label: "تفعيل الفحص اليومي التلقائي لرادار المناقصات",
    description: "تشغيل محرك الرادار آلياً في موعد ثابت يومياً لسحب أحدث المناقصات المطروحة بالبوابة الحكومية.",
    type: "boolean",
    group: "radar",
  },
  "radar.daily_scan_time": {
    label: "التوقيت اليومي المجدول للفحص التلقائي",
    description: "الميعاد الرسمي اليومي الذي يبدأ فيه خادم الرادار فحص بوابة العمليات الحكومية ومزامنتها.",
    type: "string",
    group: "radar",
  },
  "radar.incremental_mode": {
    label: "نظام الفحص التراكمي الذكي (منع التكرار)",
    description: "فحص العمليات الجديدة فقط وتجاهل المناقصات المسحوبة مسبقاً لتوفير الموارد ومنع التكرار.",
    type: "boolean",
    group: "radar",
  },

  // 5. التنبيهات والإشعارات الذكية
  guarantee_reminder_days: {
    label: "مراحل وأيام التنبيه قبل انتهاء خطاب الضمان",
    description: "جدول الإشعارات الدورية الاستباقية لإدارة الحسابات لتجديد أو استرداد خطابات الضمان قبل مصادرتها.",
    unit: "يوم",
    type: "list",
    group: "notifications",
  },
  deadline_reminder_hours: {
    label: "ساعات التنبيه الاستباقي قبل موعد فتح المظاريف",
    description: "مواعيد الإشعارات العاجلة لفريق العطاءات لتسليم المظاريف الفنية والمالية قبل غلق الباب رسمياً.",
    unit: "ساعة",
    type: "list",
    group: "notifications",
  },
  system_notifications_enabled: {
    label: "تفعيل نظام التنبيهات والإشعارات الفورية بالمنظومة",
    description: "إظهار جرس التنبيهات المباشرة والتنبيهات المنبثقة لمديري المشروعات والحسابات.",
    type: "boolean",
    group: "notifications",
  },

  // 6. المدد القانونية والتظلمات الرسمية
  grievance_authority_days: {
    label: "مهلة التظلم للسلطة المختصة بالجهة الإدارية",
    description: "المدة القانونية لتقديم التظلم المباشر للوزير أو رئيس الجهة ضد قرارات الاستبعاد الفني والمالي.",
    unit: "يوم",
    type: "number",
    group: "legal",
  },
  grievance_tribunal_days: {
    label: "مهلة التقدم للجنة ترجيح التظلمات بالهيئة",
    description: "المهلة المحددة للجوء لمكتب ترجيح التظلمات بالهيئة العامة للخدمات الحكومية وفق القانون 182.",
    unit: "يوم",
    type: "number",
    group: "legal",
  },

  // 7. الأمان وحماية الجلسات والسرية
  account_lock_attempts: {
    label: "محاولات تسجيل الدخول الخاطئة قبل قفل الحساب",
    description: "حماية المنظومة من محاولات التخمين والاختراق بقفل الحساب مؤقتاً عند تجاوز هذا العدد.",
    unit: "محاولات",
    type: "number",
    group: "security",
  },
  session_timeout_minutes: {
    label: "مهلة إنهاء الجلسة التلقائية عند الخمول",
    description: "تسجيل الخروج التلقائي لحماية سرية البيانات في حال ترك الجهاز مفتوحاً دون نشاط.",
    unit: "دقيقة",
    type: "number",
    group: "security",
  },
  records_retention_years: {
    label: "الحد الأدنى لحفظ وأرشفة سجلات العمليات",
    description: "مدة الاحتفاظ الإلزامي بالسجلات المالية والتعاقدية لأغراض التدقيق الرقابي والمحاسبي.",
    unit: "سنوات",
    type: "number",
    group: "security",
  },
  after_hours_start: {
    label: "بداية ساعات الحظر المسائي للعمليات الحساسة",
    description: "توقيت بداية التحذير والتدقيق المشدد على الإجراءات المالية الكبرى المنفذة ليلاً.",
    unit: "ساعة (24h)",
    type: "number",
    group: "security",
  },
  after_hours_end: {
    label: "نهاية ساعات الحظر الصباحي للعمليات الحساسة",
    description: "توقيت انتهاء القيود المسائية وبدء ساعات العمل المعتمدة بالمنظومة.",
    unit: "ساعة (24h)",
    type: "number",
    group: "security",
  },

  // 8. المساعد التنفيذي وإشعارات تليجرام
  telegram_bot_token: {
    label: "رمز التوكن الرسمي للبوت (BotFather Token)",
    description: "مفتاح الربط البرمجي المشفر لبوت تليجرام المعتمد الصادر من BotFather.",
    unit: "API Token",
    type: "string",
    group: "telegram",
  },
  telegram_admin_chat_id: {
    label: "معرف شات تليجرام المعتمد للسيد المدير العام (Chat ID)",
    description: "المعرف الرقمي المقترن حصرياً بهاتف المدير العام لاستقبال طلبات الاعتماد وإصدار القرارات.",
    unit: "Chat ID",
    type: "string",
    group: "telegram",
  },
  telegram_notifications_enabled: {
    label: "تفعيل إرسال التنبيهات الفورية عبر تليجرام",
    description: "المفتاح العام لتشغيل أو إيقاف توجيه الإشعارات التنفيذية الحية إلى هاتف المدير العام.",
    unit: "تفعيل",
    type: "boolean",
    group: "telegram",
  },
  telegram_alert_print_approvals: {
    label: "إرسال طلبات اعتماد الطباعة والتنزيل فوراً للبوت",
    description: "إرسال رسالة فورية مع زر اعتماد ورفض عند محاولة أي موظف طباعة أو تنزيل مستند.",
    unit: "تفعيل",
    type: "boolean",
    group: "telegram",
  },
  telegram_alert_sessions: {
    label: "إرسال تنبيهات اقتراب مواعيد فتح المظاريف وجلسات اليوم",
    description: "تنبيه المدير العام استباقياً بجلسات فتح المظاريف الفنية والمالية ومواعيد الاستفسارات.",
    unit: "تفعيل",
    type: "boolean",
    group: "telegram",
  },
};

// Preset Scan Times for the Radar Time Picker
const RADAR_TIME_PRESETS = [
  { value: "06:00 ص", label: "06:00 ص (الصباح الباكر)" },
  { value: "08:00 ص", label: "08:00 ص (بداية الدوام)" },
  { value: "09:00 ص", label: "09:00 ص (الميعاد القياسي)" },
  { value: "10:00 ص", label: "10:00 ص (منتصف الصباح)" },
  { value: "12:00 م", label: "12:00 م (ظهراً)" },
  { value: "02:00 م", label: "02:00 م (بعد الظهر)" },
  { value: "05:00 م", label: "05:00 م (نهاية الدوام)" },
  { value: "08:00 م", label: "08:00 م (مساءً)" },
];

// Presets for Deadline Reminders (hours)
const DEADLINE_HOUR_PRESETS = [
  { hours: "168", label: "قبل 168 ساعة (أسبوع / 7 أيام)", desc: "مراجعة كراسة الشروط وإعداد خطابات الضمان مبكراً" },
  { hours: "120", label: "قبل 120 ساعة (5 أيام)", desc: "متابعة وتجهيز عروض الأسعار والتنسيق مع الموردين" },
  { hours: "72", label: "قبل 72 ساعة (3 أيام)", desc: "تجهيز أولي للعطاء ومراجعة بنود الكراسة" },
  { hours: "48", label: "قبل 48 ساعة (يومين)", desc: "بدء طباعة وتوقيع المظاريف الفنية والمالية" },
  { hours: "24", label: "قبل 24 ساعة (يوم واحد)", desc: "تسليم المظاريف لمقر الجهة الإدارية قبل الغلق" },
  { hours: "12", label: "قبل 12 ساعة (نصف يوم)", desc: "تنبيه طارئ نهائي لحضور جلسة فتح المظاريف" },
];

// Presets for Guarantee Reminders (days)
const GUARANTEE_DAY_PRESETS = [
  { days: "90", label: "قبل 90 يوماً (3 أشهر)", desc: "فحص دوري مبكر لموقف تنفيذ العملية وصلاحية الضمان" },
  { days: "60", label: "قبل 60 يوماً (شهرين)", desc: "إشعار مبكر لمراجعة موقف المستخلصات والعملية" },
  { days: "30", label: "قبل 30 يوماً (شهر)", desc: "مخاطبة البنك والبدء في إجراءات التمديد أو الاسترداد" },
  { days: "21", label: "قبل 21 يوماً (3 أسابيع)", desc: "متابعة موقف الاعتمادات المالية وموقف التوريدات" },
  { days: "15", label: "قبل 15 يوماً (أسبوعين)", desc: "متابعة موافقة الجهة الإدارية الرسمية على تجديد الصلاحية" },
  { days: "10", label: "قبل 10 أيام (تحذيري)", desc: "إشعار للإدارة المالية ومدير المشروعات بقرب الانتهاء" },
  { days: "7", label: "قبل 7 أيام (أسبوع)", desc: "إنذار عاجل لمتابعة استرداد أو تجديد الخطاب" },
  { days: "5", label: "قبل 5 أيام (حرج وطارئ)", desc: "إجراء عاجل وفوري لتفادي مصادرة خطاب الضمان البنكي" },
];

export interface SensitiveStageAlertDef {
  id: string;
  name: string;
  description: string;
  stageOrder: string;
  unit: string;
  defaultLead: string;
  options: { label: string; value: string }[];
}

const SENSITIVE_STAGES_CONFIG: SensitiveStageAlertDef[] = [
  {
    id: "session_opening",
    name: "موعد جلسة فتح المظاريف الفنية والمالية",
    description: "تنبيه استباقي لتسليم المظاريف لمقر الجهة الإدارية وتجهيز كشوف الحضور قبل موعد الجلسة الرسمي",
    stageOrder: "مرحلة #2 / #10",
    unit: "ساعة",
    defaultLead: "48",
    options: [
      { label: "قبل 12 ساعة (طارئ)", value: "12" },
      { label: "قبل 24 ساعة (يوم)", value: "24" },
      { label: "قبل 48 ساعة (يومين)", value: "48" },
      { label: "قبل 72 ساعة (3 أيام)", value: "72" },
      { label: "قبل 120 ساعة (5 أيام)", value: "120" },
      { label: "قبل أسبوع (168 ساعة)", value: "168" },
    ],
  },
  {
    id: "booklet_purchase",
    name: "آخر موعد لشراء كراسة الشروط والمواصفات",
    description: "إشعار تفادي غلق باب شراء الكراسة وسداد الرسوم بخزينة الجهة",
    stageOrder: "مرحلة #2",
    unit: "ساعة",
    defaultLead: "72",
    options: [
      { label: "قبل 24 ساعة (يوم)", value: "24" },
      { label: "قبل 48 ساعة (يومين)", value: "48" },
      { label: "قبل 72 ساعة (3 أيام)", value: "72" },
      { label: "قبل 5 أيام (120 ساعة)", value: "120" },
      { label: "قبل أسبوع (168 ساعة)", value: "168" },
    ],
  },
  {
    id: "inquiries_session",
    name: "موعد جلسة الاستفسارات والرد على الإيضاحات",
    description: "تنبيه بميعاد حضور جلسة استفسارات المناقصة وتجهيز الأسئلة الفنية والقانونية",
    stageOrder: "مرحلة #4",
    unit: "ساعة",
    defaultLead: "48",
    options: [
      { label: "قبل 24 ساعة", value: "24" },
      { label: "قبل 48 ساعة", value: "48" },
      { label: "قبل 3 أيام (72 ساعة)", value: "72" },
      { label: "قبل أسبوع (168 ساعة)", value: "168" },
    ],
  },
  {
    id: "auction_practice",
    name: "موعد جلسة الممارسة أو المزاد العلني والتفاوض",
    description: "إشعار طارئ لحضور جلسة التخفيضات السعرية والمزاد وتفويض المندوب المعتمد",
    stageOrder: "مرحلة #7 / #10",
    unit: "ساعة",
    defaultLead: "24",
    options: [
      { label: "قبل 12 ساعة (طارئ)", value: "12" },
      { label: "قبل 24 ساعة (يوم)", value: "24" },
      { label: "قبل 48 ساعة (يومين)", value: "48" },
      { label: "قبل 3 أيام (72 ساعة)", value: "72" },
    ],
  },
  {
    id: "award_order",
    name: "تاريخ صدور قرار الترسية واستلام أمر التوريد",
    description: "تنبيه لمتابعة إصدار إخطار الترسية ومطابقة أمر التوريد والتعاقد الرسمي",
    stageOrder: "مرحلة #10 / #12",
    unit: "ساعة",
    defaultLead: "24",
    options: [
      { label: "قبل 24 ساعة", value: "24" },
      { label: "قبل 48 ساعة", value: "48" },
      { label: "قبل 3 أيام (72 ساعة)", value: "72" },
      { label: "قبل أسبوع (168 ساعة)", value: "168" },
    ],
  },
  {
    id: "supply_delivery",
    name: "المهلة التعاقدية لتوريد وتسليم الأصناف",
    description: "متابعة الموعد النهائي لتوريد البضائع لمخازن الجهة لتفادي غرامات التأخير",
    stageOrder: "مرحلة #15",
    unit: "يوم",
    defaultLead: "5",
    options: [
      { label: "قبل يومين", value: "2" },
      { label: "قبل 3 أيام", value: "3" },
      { label: "قبل 5 أيام", value: "5" },
      { label: "قبل أسبوع (7 أيام)", value: "7" },
      { label: "قبل 10 أيام", value: "10" },
      { label: "قبل أسبوعين (14 يوماً)", value: "14" },
      { label: "قبل شهر (30 يوماً)", value: "30" },
    ],
  },
  {
    id: "inspection_committee",
    name: "موعد اجتماع لجنة الفحص والاستلام الابتدائي",
    description: "تنبيه بحضور مندوب الشركة لاختبار الأصناف وتوقيع محضر الفحص الفني والاستلام",
    stageOrder: "مرحلة #16",
    unit: "ساعة",
    defaultLead: "48",
    options: [
      { label: "قبل 24 ساعة", value: "24" },
      { label: "قبل 48 ساعة (يومين)", value: "48" },
      { label: "قبل 3 أيام (72 ساعة)", value: "72" },
      { label: "قبل 5 أيام (120 ساعة)", value: "120" },
      { label: "قبل أسبوع (168 ساعة)", value: "168" },
    ],
  },
  {
    id: "guarantee_expiry",
    name: "انتهاء سريان خطابات الضمان والتأمينات البنكية",
    description: "جدول المتابعة الدورية للضمانات الابتدائية والنهائية للتجديد أو الاسترداد قبل المصادرة",
    stageOrder: "مرحلة #8 / #13",
    unit: "يوم",
    defaultLead: "15",
    options: [
      { label: "قبل 5 أيام (حرج)", value: "5" },
      { label: "قبل 10 أيام (تحذيري)", value: "10" },
      { label: "قبل 15 يوماً (أسبوعين)", value: "15" },
      { label: "قبل 21 يوماً (3 أسابيع)", value: "21" },
      { label: "قبل 30 يوماً (شهر)", value: "30" },
      { label: "قبل 60 يوماً (شهرين)", value: "60" },
      { label: "قبل 90 يوماً (3 أشهر)", value: "90" },
    ],
  },
  {
    id: "warranty_visits",
    name: "مواعيد الزيارات الدورية وفترة الضمان والصيانة",
    description: "تنبيه دوري لتنفيذ الزيارات الشهرية المعتمدة للصيانة وخدمة ما بعد البيع",
    stageOrder: "مرحلة #14 / #22",
    unit: "يوم",
    defaultLead: "7",
    options: [
      { label: "قبل 3 أيام", value: "3" },
      { label: "قبل 5 أيام", value: "5" },
      { label: "قبل أسبوع (7 أيام)", value: "7" },
      { label: "قبل 10 أيام", value: "10" },
      { label: "قبل أسبوعين (14 يوماً)", value: "14" },
      { label: "قبل شهر (30 يوماً)", value: "30" },
    ],
  },
  {
    id: "invoice_certificate",
    name: "موعد إعداد ومتابعة صرف المستخلصات والفواتير",
    description: "إشعار لمتابعة توقيع أمر الدفع الإلكتروني واستلام الشيكات وصرف مستحقات الشركة",
    stageOrder: "مرحلة #18 / #20",
    unit: "يوم",
    defaultLead: "5",
    options: [
      { label: "قبل 3 أيام", value: "3" },
      { label: "قبل 5 أيام", value: "5" },
      { label: "قبل أسبوع (7 أيام)", value: "7" },
      { label: "قبل 10 أيام", value: "10" },
      { label: "قبل أسبوعين (14 يوماً)", value: "14" },
    ],
  },
];

export default function SettingsPage() {
  const { currentCompany, selectedCompany, updateCompanyName } = useCompany();
  const isCompanyScoped = Boolean(selectedCompany && selectedCompany !== "ALL");

  // State
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [initialSettingsMap, setInitialSettingsMap] = useState<Record<string, string>>({});
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [initialCompaniesMap, setInitialCompaniesMap] = useState<Record<string, CompanyItem>>({});
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("companies");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Track Unsaved Changes
  const [dirtySettingKeys, setDirtySettingKeys] = useState<Set<string>>(new Set());
  const [dirtyCompanyIds, setDirtyCompanyIds] = useState<Set<string>>(new Set());

  // قواعد وتفاصيل تنبيهات جميع مراحل العمليات الحساسة
  const [stageAlertsConfig, setStageAlertsConfig] = useState<
    Record<string, { enabled: boolean; leadValue: string }>
  >(() => {
    const init: Record<string, { enabled: boolean; leadValue: string }> = {};
    SENSITIVE_STAGES_CONFIG.forEach((s) => {
      init[s.id] = { enabled: true, leadValue: s.defaultLead };
    });
    return init;
  });

  const handleUpdateStageAlert = (
    stageId: string,
    updates: Partial<{ enabled: boolean; leadValue: string }>
  ) => {
    setStageAlertsConfig((prev) => {
      const current = prev[stageId] || { enabled: true, leadValue: "24" };
      const nextRule = { ...current, ...updates };
      const nextMap = { ...prev, [stageId]: nextRule };
      handleSettingChange("stage_alerts_config", JSON.stringify(nextMap));
      return nextMap;
    });
  };

  // Telegram Bot Live Status & Actions
  const [telegramStatus, setTelegramStatus] = useState<{
    connected: boolean;
    adminChatId: string | null;
    botUsername: string;
    isPaired: boolean;
  } | null>(null);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [reconnectingTelegram, setReconnectingTelegram] = useState(false);

  const fetchTelegramStatus = async () => {
    try {
      const res = await api.get("/telegram/status");
      setTelegramStatus(res.data);
    } catch {}
  };

  const handleTestTelegramAlert = async () => {
    setTestingTelegram(true);
    try {
      const res = await api.post("/telegram/test-alert", {});
      if (res.data?.success) {
        toast.success(res.data.message || "تم إرسال التنبيه التجريبي إلى تليجرام بنجاح 🚀");
      } else {
        toast.warning(res.data?.message || "لم يتم استلام التنبيه، تأكد من ربط حساب المدير العام أولاً");
      }
      fetchTelegramStatus();
    } catch (err: any) {
      toast.error("فشل إرسال التنبيه التجريبي: " + (err.response?.data?.message || err.message));
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleReconnectTelegram = async () => {
    setReconnectingTelegram(true);
    try {
      const res = await api.post("/telegram/reconnect");
      if (res.data?.success) {
        toast.success("تمت إعادة ربط وتنشيط بوت تليجرام بنجاح 🚀");
        if (res.data.status) setTelegramStatus(res.data.status);
      }
    } catch (err: any) {
      toast.error("فشل إعادة الربط: " + (err.response?.data?.message || err.message));
    } finally {
      setReconnectingTelegram(false);
    }
  };

  // Load All Data on Mount
  useEffect(() => {
    loadAllData();
  }, []);

  // Sync selectedCompanyId if company scope changes
  useEffect(() => {
    if (isCompanyScoped && companies.length > 0) {
      const match = companies.find((c) => c.code === selectedCompany);
      if (match && selectedCompanyId !== match.id) {
        setSelectedCompanyId(match.id);
      }
    }
  }, [isCompanyScoped, selectedCompany, companies, selectedCompanyId]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [settingsRes, companiesRes] = await Promise.all([
        api.get("/settings"),
        api.get("/companies").catch(() => ({ data: [] })),
        fetchTelegramStatus(),
      ]);

      if (Array.isArray(settingsRes.data)) {
        setSettings(settingsRes.data);
        const map: Record<string, string> = {};
        settingsRes.data.forEach((s: SystemSetting) => {
          map[s.key] = s.value;
        });
        setInitialSettingsMap(map);

        const stageAlertsSetting = settingsRes.data.find((s: SystemSetting) => s.key === "stage_alerts_config");
        if (stageAlertsSetting?.value) {
          try {
            const parsed = JSON.parse(stageAlertsSetting.value);
            setStageAlertsConfig((prev) => ({ ...prev, ...parsed }));
          } catch {}
        }
      }

      if (Array.isArray(companiesRes.data) && companiesRes.data.length > 0) {
        setCompanies(companiesRes.data);
        const matchedScoped = isCompanyScoped
          ? companiesRes.data.find((c: CompanyItem) => c.code === selectedCompany)
          : null;
        setSelectedCompanyId(matchedScoped ? matchedScoped.id : companiesRes.data[0].id);

        const compMap: Record<string, CompanyItem> = {};
        companiesRes.data.forEach((c: CompanyItem) => {
          compMap[c.id] = { ...c };
        });
        setInitialCompaniesMap(compMap);
      }
    } catch (err: any) {
      toast.error("فشل تحميل بيانات الإعدادات من الخادم");
    } finally {
      setLoading(false);
    }
  };

  // Update Setting Value
  const handleSettingChange = (key: string, newValue: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value: newValue } : s))
    );

    setDirtySettingKeys((prev) => {
      const next = new Set(prev);
      if (initialSettingsMap[key] !== newValue) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  // Helper for toggling a number in a comma-separated list
  const handleToggleListValue = (key: string, currentVal: string, targetNum: string) => {
    const list = currentVal
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    let nextList: string[];
    if (list.includes(targetNum)) {
      nextList = list.filter((x) => x !== targetNum);
    } else {
      nextList = [...list, targetNum];
    }

    // Sort numbers descending
    nextList.sort((a, b) => Number(b) - Number(a));
    const nextVal = nextList.join(",");
    handleSettingChange(key, nextVal);
  };

  // Convert 24h Time to Arabic Display Time (e.g. "17:00" -> "05:00 م")
  const convert24ToArabic = (time24: string) => {
    if (!time24) return "09:00 ص";
    const [hStr, mStr] = time24.split(":");
    let h = parseInt(hStr, 10);
    const m = mStr || "00";
    const isPM = h >= 12;
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    const padH = String(h).padStart(2, "0");
    return `${padH}:${m} ${isPM ? "م" : "ص"}`;
  };

  // Convert Arabic Display Time to 24h (e.g. "05:00 م" -> "17:00")
  const convertArabicTo24 = (arabicTime: string) => {
    if (!arabicTime) return "09:00";
    const isPM = arabicTime.includes("م");
    const clean = arabicTime.replace(/[^\d:]/g, "").trim();
    const [hStr, mStr] = clean.split(":");
    let h = parseInt(hStr, 10) || 9;
    const m = mStr || "00";
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${m}`;
  };

  // Update Company Field
  const handleCompanyFieldChange = (companyId: string, field: keyof CompanyItem, value: string) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === companyId ? { ...c, [field]: value } : c))
    );

    setDirtyCompanyIds((prev) => {
      const next = new Set(prev);
      next.add(companyId);
      return next;
    });
  };

  // Quick Save Single Company Name
  const handleQuickSaveCompanyName = async (companyId: string) => {
    const comp = companies.find((c) => c.id === companyId);
    if (!comp) return;
    try {
      await api.patch(`/companies/${comp.id}`, { name: comp.name });
      if (updateCompanyName && comp.code) {
        await updateCompanyName(comp.code as any, comp.name);
      }
      setDirtyCompanyIds((prev) => {
        const next = new Set(prev);
        next.delete(comp.id);
        return next;
      });
      setInitialCompaniesMap((prev) => ({
        ...prev,
        [comp.id]: { ...comp },
      }));
      toast.success(`تم تحديث اسم شركة (${comp.code}: ${comp.name}) بنجاح! ✓`);
    } catch {
      toast.error("فشل حفظ اسم الشركة في الخادم");
    }
  };

  // Save Everything (Settings + Dirty Companies)
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const promises: Promise<any>[] = [];

      // 1. Save Settings if modified
      if (dirtySettingKeys.size > 0) {
        const payload = settings
          .filter((s) => dirtySettingKeys.has(s.key))
          .map((s) => ({
            key: s.key,
            value: s.value,
            label: SETTING_DETAILS[s.key]?.label || s.label || undefined,
            group: SETTING_DETAILS[s.key]?.group || s.group || undefined,
            type: SETTING_DETAILS[s.key]?.type || s.type || undefined,
          }));

        promises.push(api.patch("/settings", payload));
      }

      // 2. Save Companies if modified
      if (dirtyCompanyIds.size > 0) {
        dirtyCompanyIds.forEach((compId) => {
          const comp = companies.find((c) => c.id === compId);
          if (comp) {
            promises.push(
              api.patch(`/companies/${comp.id}`, {
                name: comp.name,
                commercialRegister: comp.commercialRegister,
                taxCard: comp.taxCard,
                license: comp.license,
                address: comp.address,
                email: comp.email,
                fax: comp.fax,
                bankName: comp.bankName,
                bankBranch: comp.bankBranch,
                bankAccountNumber: comp.bankAccountNumber,
              })
            );
            if (updateCompanyName && comp.code) {
              updateCompanyName(comp.code as any, comp.name);
            }
          }
        });
      }

      await Promise.all(promises);

      // Re-sync initial maps
      const newSettingsMap: Record<string, string> = {};
      settings.forEach((s) => {
        newSettingsMap[s.key] = s.value;
      });
      setInitialSettingsMap(newSettingsMap);

      const newCompMap: Record<string, CompanyItem> = {};
      companies.forEach((c) => {
        newCompMap[c.id] = { ...c };
      });
      setInitialCompaniesMap(newCompMap);

      setDirtySettingKeys(new Set());
      setDirtyCompanyIds(new Set());

      toast.success("تم حفظ وتحديث إعدادات المنظومة وهوية الشركات بنجاح في قاعدة البيانات!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل حفظ التعديلات في خادم المنظومة");
    } finally {
      setIsSaving(false);
    }
  };

  // Revert All Changes
  const handleRevertChanges = () => {
    setSettings((prev) =>
      prev.map((s) => ({
        ...s,
        value: initialSettingsMap[s.key] !== undefined ? initialSettingsMap[s.key] : s.value,
      }))
    );
    setCompanies((prev) =>
      prev.map((c) =>
        initialCompaniesMap[c.id] ? { ...initialCompaniesMap[c.id] } : c
      )
    );
    setDirtySettingKeys(new Set());
    setDirtyCompanyIds(new Set());
    toast.info("تم التراجع عن كافة التعديلات غير المحفوظة");
  };

  // Categories Metadata
  const categories = [
    { id: "companies", label: "بيانات الشركات الأربعة", icon: Building2, count: companies.length },
    { id: "tax", label: "الضرائب والرسوم المالية", icon: Percent, count: 3 },
    { id: "guarantees", label: "التأمينات وخطابات الضمان", icon: Shield, count: 4 },
    { id: "radar", label: "رادار المناقصات والربط الذكي", icon: Globe2, count: 3 },
    { id: "notifications", label: "التنبيهات والمواعيد الحساسة", icon: Bell, count: 3 },
    { id: "telegram", label: "مساعد تليجرام التنفيذي", icon: Send, count: 7 },
    { id: "legal", label: "المدد القانونية والتظلمات", icon: Scale, count: 2 },
    { id: "security", label: "الأمان وحماية الجلسات", icon: Lock, count: 5 },
    { id: "all", label: "كافة إعدادات المنظومة", icon: Sliders, count: settings.length },
  ];

  // Filtered Settings List
  const filteredSettings = useMemo(() => {
    return settings.filter((s) => {
      const meta = SETTING_DETAILS[s.key] || {
        label: s.label || s.key,
        description: "",
        group: s.group || "general",
      };

      // Category tab match
      if (activeCategoryTab !== "all" && activeCategoryTab !== "companies") {
        if (meta.group !== activeCategoryTab) return false;
      }

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLabel = (meta.label || "").toLowerCase().includes(q);
        const matchesDesc = (meta.description || "").toLowerCase().includes(q);
        const matchesVal = (s.value || "").toLowerCase().includes(q);
        if (!matchesLabel && !matchesDesc && !matchesVal) return false;
      }

      return true;
    });
  }, [settings, activeCategoryTab, searchQuery]);

  const activeCompany = useMemo(() => {
    return companies.find((c) => c.id === selectedCompanyId) || companies[0];
  }, [companies, selectedCompanyId]);

  const totalUnsavedCount = dirtySettingKeys.size + dirtyCompanyIds.size;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-28 max-w-6xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. Header Banner: Executive Luxury ERP Settings Banner                    */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl glass-card p-6 sm:p-8 border border-slate-700/80 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full badge-blue text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
              <span>لوحة التحكم المركزية • إعدادات المنظومة وهوية الشركات المعتمدة</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              إعدادات وقواعد النظام العامة
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              إدارة وتخصيص نسب الضرائب الرسمية، قواعد خطابات الضمان البنكية، محرك الفحص اليومي للرادار، والبيانات القانونية والبنكية للشركات الأربعة المعتمدة.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <Button
              onClick={handleSaveAll}
              disabled={isSaving || totalUnsavedCount === 0}
              className={`font-bold px-6 py-3.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm active:scale-95 transition-all cursor-pointer ${
                totalUnsavedCount > 0
                  ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-blue-500/25 border border-blue-400/30 scale-102"
                  : "bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60"
              }`}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isSaving ? "جاري الحفظ..." : "حفظ كافة التعديلات"}</span>
            </Button>
          </div>
        </div>

        {/* Quick System Telemetry Strip */}
        <div className="mt-6 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-foreground">قاعدة البيانات متصلة ومشفرة بالكامل</span>
            <span className="text-muted-foreground">•</span>
            <span>الشركات النشطة: {companies.length} شركات رسمية</span>
            <span className="text-muted-foreground">•</span>
            <span>إجمالي الإعدادات التشغيلية: {settings.length} قاعدة معتمدة</span>
          </div>

          {totalUnsavedCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-500 font-bold bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20 animate-pulse">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>يوجد {totalUnsavedCount} تعديلات غير محفوظة حالياً</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Category Navigation Tabs                                               */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategoryTab === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryTab(cat.id)}
              className={`px-4 py-2.5 rounded-2xl font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shadow-xs ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/25 scale-102"
                  : "bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{cat.label}</span>
              {cat.count !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {cat.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. Section Content: TAB 1 - Companies Hub (بيانات الشركات الأربعة)         */}
      {/* ========================================================================= */}
      {activeCategoryTab === "companies" && (
        <div className="space-y-5 animate-fade-in">
          {/* Quick Edit Company Names Option (أوبشن تعديل أسماء الشركات الأربعة) */}
          <div className="glass-card rounded-3xl p-5 sm:p-6 border border-blue-500/30 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-transparent space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                    <span>تعديل أسماء الشركات الأربعة بالمنظومة</span>
                    <Badge className="bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[10px] font-bold">
                      أوبشن تعديل اسم الشركة
                    </Badge>
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    يمكنك تعديل وتخصيص المسمى التجاري المعتمد لكل شركة من الشركات الأربعة، ويتم تحديث الاسم تلقائياً في شريط التنقل العلوي والخطابات الرسمية والتقارير.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {companies.map((comp) => {
                const isDirty = dirtyCompanyIds.has(comp.id);
                return (
                  <div
                    key={comp.id}
                    className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                      isDirty
                        ? "bg-amber-500/10 border-amber-500/40 shadow-md"
                        : "bg-muted/20 hover:bg-muted/30 border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-mono font-black text-xs flex items-center justify-center">
                          {comp.code}
                        </span>
                        <span className="text-xs font-bold text-foreground">شركة ({comp.code})</span>
                      </div>
                      {isDirty && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold animate-pulse">
                          معدل
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground block">
                        اسم الشركة المعتمد:
                      </label>
                      <Input
                        value={comp.name || ""}
                        onChange={(e) => handleCompanyFieldChange(comp.id, "name", e.target.value)}
                        placeholder={`اسم شركة ${comp.code}`}
                        className="h-8.5 text-xs font-bold rounded-xl bg-background border-border"
                      />
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleQuickSaveCompanyName(comp.id)}
                      disabled={!isDirty}
                      className={`w-full h-7.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isDirty
                          ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                          : "bg-muted text-muted-foreground border border-border opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <Save className="h-3 w-3" />
                      <span>حفظ الاسم فورياً</span>
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Company Selector Pills: If scoped to a specific company, ONLY show that company */}
          {isCompanyScoped ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-blue-600 text-white font-mono font-black text-lg flex items-center justify-center shadow-md shadow-blue-500/20">
                  {activeCompany?.code || selectedCompany}
                </span>
                <div>
                  <h4 className="font-extrabold text-foreground text-sm flex items-center gap-2">
                    <span>{activeCompany?.name || `شركة (${selectedCompany})`}</span>
                    <Badge className="badge-blue text-xs font-bold">الشركة المحددة</Badge>
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    أنت حالياً داخل نطاق عمل شركة ({selectedCompany}) فقط — تم عزل الإعدادات والوثائق لتقتصر على هذه الشركة
                  </p>
                </div>
              </div>

              <Link href="/dashboard/companies">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs font-bold border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 h-8 gap-1.5 cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>مستندات هذه الشركة</span>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {companies.map((comp) => {
                const isSelected = comp.id === selectedCompanyId;
                const isDirty = dirtyCompanyIds.has(comp.id);

                return (
                  <button
                    key={comp.id}
                    onClick={() => setSelectedCompanyId(comp.id)}
                    className={`p-4 rounded-2xl border text-right transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-3 ${
                      isSelected
                        ? "bg-gradient-to-br from-blue-600/15 via-indigo-600/10 to-transparent border-blue-500 shadow-lg shadow-blue-500/10"
                        : "glass-card hover:bg-muted/40 border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`w-9 h-9 rounded-xl font-mono font-black text-sm flex items-center justify-center ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                            : "bg-muted text-foreground border border-border"
                        }`}
                      >
                        {comp.code}
                      </span>

                      {isDirty && (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" title="تعديلات غير محفوظة" />
                      )}
                    </div>

                    <div>
                      <h4 className="font-extrabold text-foreground text-sm">{comp.name}</h4>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        شركة مستقلة بالمنظومة ({comp.code})
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Company Detailed Form */}
          {activeCompany && (
            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-border space-y-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black font-mono text-xl flex items-center justify-center shadow-md shadow-blue-500/20">
                    {activeCompany.code}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-foreground">
                      بيانات شركة: {activeCompany.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      المعلومات القانونية والبنكية المستخدمة في طباعة العطاءات وتوليد خطابات الضمان
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-border text-foreground text-xs font-mono font-bold">
                    كود: {activeCompany.code}
                  </Badge>
                  {dirtyCompanyIds.has(activeCompany.id) && (
                    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-bold">
                      تعديلات غير محفوظة
                    </Badge>
                  )}
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
                {/* 1. Name */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-blue-500" />
                    <span>اسم الشركة التجاري المعتمد</span>
                  </label>
                  <Input
                    value={activeCompany.name || ""}
                    onChange={(e) => handleCompanyFieldChange(activeCompany.id, "name", e.target.value)}
                    placeholder="مثال: شركة جولدن سرفيس للخدمات"
                    className="bg-muted/30 border-border text-foreground font-semibold rounded-xl text-xs h-10"
                  />
                </div>

                {/* 2. Commercial Register */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-emerald-500" />
                    <span>رقم السجل التجاري</span>
                  </label>
                  <Input
                    value={activeCompany.commercialRegister || ""}
                    onChange={(e) => handleCompanyFieldChange(activeCompany.id, "commercialRegister", e.target.value)}
                    placeholder="مثال: 124589"
                    className="bg-muted/30 border-border text-foreground font-mono font-semibold rounded-xl text-xs h-10"
                  />
                </div>

                {/* 3. Tax Card */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Percent className="h-3.5 w-3.5 text-amber-500" />
                    <span>رقم البطاقة الضريبية</span>
                  </label>
                  <Input
                    value={activeCompany.taxCard || ""}
                    onChange={(e) => handleCompanyFieldChange(activeCompany.id, "taxCard", e.target.value)}
                    placeholder="مثال: 654-321-987"
                    className="bg-muted/30 border-border text-foreground font-mono font-semibold rounded-xl text-xs h-10"
                  />
                </div>

                {/* 4. License */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-purple-500" />
                    <span>رقم رخصة مزاولة النشاط / القيد</span>
                  </label>
                  <Input
                    value={activeCompany.license || ""}
                    onChange={(e) => handleCompanyFieldChange(activeCompany.id, "license", e.target.value)}
                    placeholder="مثال: قيد اتحاد مقاولين رقم 7894"
                    className="bg-muted/30 border-border text-foreground font-semibold rounded-xl text-xs h-10"
                  />
                </div>

                {/* 5. Address */}
                <div className="space-y-1.5 lg:col-span-2">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-rose-500" />
                    <span>المقر الإداري والعنوان الرسمي المسجل</span>
                  </label>
                  <Input
                    value={activeCompany.address || ""}
                    onChange={(e) => handleCompanyFieldChange(activeCompany.id, "address", e.target.value)}
                    placeholder="مثال: القاهرة - التجمع الخامس - الحي الأول - مبنى 45"
                    className="bg-muted/30 border-border text-foreground font-semibold rounded-xl text-xs h-10"
                  />
                </div>

                {/* 6. Email */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-cyan-500" />
                    <span>البريد الإلكتروني الرسمي للمراسلات</span>
                  </label>
                  <Input
                    value={activeCompany.email || ""}
                    onChange={(e) => handleCompanyFieldChange(activeCompany.id, "email", e.target.value)}
                    placeholder="tender@company.com"
                    className="bg-muted/30 border-border text-foreground font-semibold rounded-xl text-xs h-10 text-left"
                    dir="ltr"
                  />
                </div>

                {/* 7. Phone / Fax */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-indigo-500" />
                    <span>رقم الهاتف المعتمد / الفاكس</span>
                  </label>
                  <Input
                    value={activeCompany.fax || ""}
                    onChange={(e) => handleCompanyFieldChange(activeCompany.id, "fax", e.target.value)}
                    placeholder="مثال: 0225896314"
                    className="bg-muted/30 border-border text-foreground font-mono font-semibold rounded-xl text-xs h-10"
                  />
                </div>

                {/* 8. Bank Name */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Landmark className="h-3.5 w-3.5 text-amber-500" />
                    <span>اسم البنك الرئيسي المتعامل معه</span>
                  </label>
                  <Input
                    value={activeCompany.bankName || ""}
                    onChange={(e) => handleCompanyFieldChange(activeCompany.id, "bankName", e.target.value)}
                    placeholder="مثال: البنك الأهلي المصري"
                    className="bg-muted/30 border-border text-foreground font-semibold rounded-xl text-xs h-10"
                  />
                </div>

                {/* 9. Bank Branch */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Landmark className="h-3.5 w-3.5 text-teal-500" />
                    <span>فرع البنك</span>
                  </label>
                  <Input
                    value={activeCompany.bankBranch || ""}
                    onChange={(e) => handleCompanyFieldChange(activeCompany.id, "bankBranch", e.target.value)}
                    placeholder="مثال: فرع المعادي"
                    className="bg-muted/30 border-border text-foreground font-semibold rounded-xl text-xs h-10"
                  />
                </div>

                {/* 10. Bank Account / IBAN */}
                <div className="space-y-1.5 lg:col-span-2">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-blue-500" />
                    <span>رقم الحساب البنكي / رقم الآيبان المعتمد (IBAN)</span>
                  </label>
                  <Input
                    value={activeCompany.bankAccountNumber || ""}
                    onChange={(e) => handleCompanyFieldChange(activeCompany.id, "bankAccountNumber", e.target.value)}
                    placeholder="مثال: EG380002000100000001234567890"
                    className="bg-muted/30 border-border text-foreground font-mono font-semibold rounded-xl text-xs h-10 text-left"
                    dir="ltr"
                  />
                </div>

                {/* 11. Official Company Documents Archive Box (طلب العميل: مستندات الشركة المحددة) */}
                <div className="md:col-span-2 lg:col-span-3 p-4.5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-blue-50/40 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-blue-950/20 border border-blue-200/80 dark:border-blue-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs mt-2">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-foreground flex items-center gap-2">
                        <span>أرشيف الوثائق والمستندات الرسمية لشركة ({activeCompany.name})</span>
                        <Badge className="badge-blue text-[11px] font-bold font-mono">{activeCompany.code}</Badge>
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        رفع ومعاينة السجل التجاري، البطاقة الضريبية، العقود، والتراخيص المعتمدة الخاصة بهذه الشركة حصراً
                      </p>
                    </div>
                  </div>

                  <Link href="/dashboard/companies">
                    <Button
                      type="button"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs h-9 px-4 cursor-pointer shadow-md shadow-blue-600/20 flex items-center gap-1.5 shrink-0"
                    >
                      <FileText className="h-4 w-4" />
                      <span>فتح أرشيف ومستندات الشركة</span>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. Section Content: Settings Cards Grid (الضرائب، الضمان، الرادار، الأمان)  */}
      {/* ========================================================================= */}
      {activeCategoryTab !== "companies" && (
        <div className="space-y-4">
          {/* Search box for Settings */}
          <div className="relative">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث في الإعدادات والقواعد (اسم الإعداد، الوصف، القيمة)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 pl-9 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-xs sm:text-sm h-11"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Cards List */}
          <div className="glass-card rounded-3xl p-5 sm:p-7 border border-border space-y-4 shadow-xl">
            {/* Header with Save Button for the active category */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/80">
              <div className="space-y-0.5">
                <h3 className="font-black text-sm sm:text-base text-foreground flex items-center gap-2">
                  <span>
                    {categories.find((c) => c.id === activeCategoryTab)?.label || "إعدادات المنظومة"}
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground border-border">
                    {filteredSettings.length} قاعدة نشطة
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  تعديل وتطبيق هذه القواعد يسري لحظياً ومباشرة على كافة العمليات المرتبطة والمستخدمين.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSaveAll}
                  disabled={isSaving || totalUnsavedCount === 0}
                  className={`font-black text-xs h-9 px-4 rounded-xl cursor-pointer shadow-md flex items-center gap-1.5 transition-all ${
                    totalUnsavedCount > 0
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 scale-102"
                      : "bg-muted text-muted-foreground border border-border opacity-70 cursor-not-allowed"
                  }`}
                >
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>{totalUnsavedCount > 0 ? `حفظ التعديلات (${totalUnsavedCount}) 💾` : "الإعدادات محفوظة ومفعلة ✓"}</span>
                </Button>
              </div>
            </div>

            {filteredSettings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-2">
                <Info className="h-10 w-10 text-muted-foreground/60 mx-auto" />
                <p className="font-bold text-sm text-foreground">لا توجد إعدادات مطابقة للبحث</p>
                <p className="text-xs">جرب كتابة مصطلح آخر أو اختر تبويب إعدادات مختلف أعلاه.</p>
              </div>
            ) : (
              filteredSettings.map((setting) => {
                const meta = SETTING_DETAILS[setting.key] || {
                  label: setting.label || setting.key,
                  description: "إعداد تشغيلي معتمد في قاعدة بيانات المنظومة.",
                  type: "string",
                  group: setting.group || "general",
                };

                const isModified = dirtySettingKeys.has(setting.key);
                const isBool = meta.type === "boolean" || setting.value === "true" || setting.value === "false";

                return (
                  <div
                    key={setting.id || setting.key}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col gap-4 ${
                      isModified
                        ? "bg-amber-500/5 border-amber-500/40 shadow-sm"
                        : "bg-muted/30 border-border hover:border-blue-500/30"
                    }`}
                  >
                    {/* Top Row: Title, Description & Main Input */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Setting Title & Explanation */}
                      <div className="space-y-1.5 flex-1 pr-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-foreground">
                            {meta.label}
                          </span>

                          {meta.unit && meta.type !== "list" && (
                            <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-bold font-mono">
                              الوحدة: {meta.unit}
                            </span>
                          )}

                          {isModified && (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                              معدل (غير محفوظ)
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {meta.description}
                        </p>
                      </div>

                      {/* Input Control tailored to Type */}
                      <div className="w-full md:w-64 shrink-0 flex items-center justify-end gap-2">
                        {/* 1. BOOLEAN TOGGLE */}
                        {isBool ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleSettingChange(
                                setting.key,
                                setting.value === "true" ? "false" : "true"
                              )
                            }
                            className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                              setting.value === "true"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                                : "bg-slate-500/10 text-slate-500 border-slate-500/20 hover:bg-slate-500/15"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                setting.value === "true" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                              }`}
                            />
                            <span>{setting.value === "true" ? "مفعل بالمنظومة" : "معطل مؤقتاً"}</span>
                          </button>

                        /* 2. RADAR DAILY SCAN TIME PICKER (Clock & Dropdown) */
                        ) : setting.key === "radar.daily_scan_time" ? (
                          <div className="w-full flex items-center gap-2">
                            {/* Standard Dropdown of Arabic Presets */}
                            <select
                              value={setting.value}
                              onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                              className="w-full bg-background border border-border text-foreground font-bold rounded-xl px-3 py-2 text-xs focus:border-blue-500 outline-none cursor-pointer"
                            >
                              {RADAR_TIME_PRESETS.map((p) => (
                                <option key={p.value} value={p.value}>
                                  {p.label}
                                </option>
                              ))}
                              {!RADAR_TIME_PRESETS.some((p) => p.value === setting.value) && (
                                <option value={setting.value}>
                                  {setting.value} (مخصص)
                                </option>
                              )}
                            </select>

                            {/* Native HTML5 Clock/Time Picker trigger */}
                            <div className="relative shrink-0" title="اختر من التقويم والساعة">
                              <input
                                type="time"
                                value={convertArabicTo24(setting.value)}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleSettingChange(setting.key, convert24ToArabic(e.target.value));
                                  }
                                }}
                                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 px-2.5 rounded-xl border-border bg-muted/40 pointer-events-none"
                              >
                                <Clock className="h-4 w-4 text-blue-500" />
                              </Button>
                            </div>
                          </div>

                        /* 3. FISCAL YEAR START DATE PICKER */
                        ) : setting.key === "fiscal_year_start" ? (
                          <div className="w-full flex items-center gap-2">
                            <select
                              value={setting.value}
                              onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                              className="w-full bg-background border border-border text-foreground font-bold rounded-xl px-3 py-2 text-xs focus:border-blue-500 outline-none cursor-pointer"
                            >
                              <option value="07-01">1 يوليو (بداية السنة المالية الحكومية)</option>
                              <option value="01-01">1 يناير (بداية السنة الميلادية)</option>
                              <option value="04-01">1 أبريل (الربع الثاني)</option>
                              <option value="10-01">1 أكتوبر (الربع الرابع)</option>
                            </select>
                            <Calendar className="h-4 w-4 text-emerald-500 shrink-0" />
                          </div>

                        /* 4. NUMERIC INPUT WITH FIRMLY ATTACHED UNIT BADGE */
                        ) : meta.type === "number" ? (
                          <div className="flex items-center rounded-xl border border-border bg-background focus-within:border-blue-500 shadow-2xs overflow-hidden h-10 w-full transition-all">
                            <input
                              type="number"
                              value={setting.value}
                              onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                              className="w-full h-full bg-transparent text-foreground font-mono font-bold text-center px-3 outline-none text-sm"
                            />
                            {meta.unit && (
                              <span className="px-3 py-2 bg-muted/60 text-muted-foreground font-bold text-xs border-r border-border shrink-0 select-none flex items-center justify-center min-w-[46px]">
                                {meta.unit}
                              </span>
                            )}
                          </div>

                        /* 5. GENERAL TEXT INPUT */
                        ) : (
                          <Input
                            type="text"
                            value={setting.value}
                            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                            className="bg-background border-border text-foreground font-semibold rounded-xl h-10 text-xs focus:border-blue-500 text-center"
                          />
                        )}
                      </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* CUSTOM EXPANDED VIEW: DEADLINE REMINDER HOURS (ساعات المظاريف)            */}
                    {/* ========================================================================= */}
                    {setting.key === "deadline_reminder_hours" && (
                      <div className="mt-2 pt-3 border-t border-border/70 space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            <Timer className="h-3.5 w-3.5 text-blue-500" />
                            <span>مراحل وساعات التنبيه النشطة حالياً (اضغط لاختيار أو إلغاء أي مرحلة):</span>
                          </span>
                          <span className="font-mono text-[11px] bg-muted px-2 py-0.5 rounded-md">
                            القيمة المخزنة: {setting.value} ساعة
                          </span>
                        </div>

                        {/* Interactive Preset Chips */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {DEADLINE_HOUR_PRESETS.map((preset) => {
                            const isSelected = setting.value
                              .split(",")
                              .map((x) => x.trim())
                              .includes(preset.hours);

                            return (
                              <button
                                key={preset.hours}
                                type="button"
                                onClick={() =>
                                  handleToggleListValue("deadline_reminder_hours", setting.value, preset.hours)
                                }
                                className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                                  isSelected
                                    ? "bg-blue-500/10 border-blue-500/40 text-foreground shadow-xs"
                                    : "bg-muted/20 border-border/80 text-muted-foreground hover:bg-muted/40"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs">{preset.label}</span>
                                  <span
                                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                                      isSelected
                                        ? "bg-blue-600 text-white"
                                        : "border border-border text-transparent"
                                    }`}
                                  >
                                    ✓
                                  </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground leading-tight">
                                  {preset.desc}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Manual Custom Input */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-2.5 border-t border-border/60 bg-muted/20 p-2.5 rounded-xl">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-blue-500" />
                            <span>إدخال يدوي حر لساعات التنبيه (مثال: 96 أو 120 أو أي مدة مخصصة):</span>
                          </span>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <input
                              type="number"
                              id="custom-hours-input"
                              placeholder="أدخل الساعات..."
                              className="h-8.5 px-3 text-xs rounded-xl bg-background border border-border text-foreground font-mono font-bold w-32 focus:border-blue-500 outline-none"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const val = (e.target as HTMLInputElement).value.trim();
                                  if (val && Number(val) > 0) {
                                    handleToggleListValue("deadline_reminder_hours", setting.value, val);
                                    (e.target as HTMLInputElement).value = "";
                                  }
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              type="button"
                              onClick={() => {
                                const input = document.getElementById("custom-hours-input") as HTMLInputElement;
                                if (input && input.value.trim() && Number(input.value.trim()) > 0) {
                                  handleToggleListValue("deadline_reminder_hours", setting.value, input.value.trim());
                                  input.value = "";
                                }
                              }}
                              className="h-8.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                            >
                              إضافة للمراحل +
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ========================================================================= */}
                    {/* CUSTOM EXPANDED VIEW: GUARANTEE REMINDER DAYS (أيام خطابات الضمان)        */}
                    {/* ========================================================================= */}
                    {setting.key === "guarantee_reminder_days" && (
                      <div className="mt-2 pt-3 border-t border-border/70 space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            <Hourglass className="h-3.5 w-3.5 text-amber-500" />
                            <span>مراحل التنبيه الاستباقي قبل انتهاء خطاب الضمان (اضغط لتفعيل أو إلغاء المرحلة):</span>
                          </span>
                          <span className="font-mono text-[11px] bg-muted px-2 py-0.5 rounded-md">
                            القيمة المخزنة: {setting.value} يوم
                          </span>
                        </div>

                        {/* Interactive Preset Chips */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                          {GUARANTEE_DAY_PRESETS.map((preset) => {
                            const isSelected = setting.value
                              .split(",")
                              .map((x) => x.trim())
                              .includes(preset.days);

                            return (
                              <button
                                key={preset.days}
                                type="button"
                                onClick={() =>
                                  handleToggleListValue("guarantee_reminder_days", setting.value, preset.days)
                                }
                                className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                                  isSelected
                                    ? "bg-amber-500/10 border-amber-500/40 text-foreground shadow-xs"
                                    : "bg-muted/20 border-border/80 text-muted-foreground hover:bg-muted/40"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs">{preset.label}</span>
                                  <span
                                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                                      isSelected
                                        ? "bg-amber-500 text-slate-950 font-black"
                                        : "border border-border text-transparent"
                                    }`}
                                  >
                                    ✓
                                  </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground leading-tight">
                                  {preset.desc}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Manual Custom Input */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-2.5 border-t border-border/60 bg-muted/20 p-2.5 rounded-xl">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Hourglass className="h-3.5 w-3.5 text-amber-500" />
                            <span>إدخال يدوي حر لأيام التنبيه (مثال: 7 أو 21 أو 45 أو أي مدة مخصصة):</span>
                          </span>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <input
                              type="number"
                              id="custom-days-input"
                              placeholder="أدخل الأيام..."
                              className="h-8.5 px-3 text-xs rounded-xl bg-background border border-border text-foreground font-mono font-bold w-32 focus:border-amber-500 outline-none"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const val = (e.target as HTMLInputElement).value.trim();
                                  if (val && Number(val) > 0) {
                                    handleToggleListValue("guarantee_reminder_days", setting.value, val);
                                    (e.target as HTMLInputElement).value = "";
                                  }
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              type="button"
                              onClick={() => {
                                const input = document.getElementById("custom-days-input") as HTMLInputElement;
                                if (input && input.value.trim() && Number(input.value.trim()) > 0) {
                                  handleToggleListValue("guarantee_reminder_days", setting.value, input.value.trim());
                                  input.value = "";
                                }
                              }}
                              className="h-8.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                            >
                              إضافة للمراحل +
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ========================================================================= */}
          {/* GRANULAR STAGE ALERTS & SENSITIVITY CUSTOMIZATION (أدوات تخصيص المراحل)     */}
          {/* ========================================================================= */}
          {activeCategoryTab === "notifications" && (
            <div className="rounded-3xl border-2 border-blue-500/30 bg-card p-5 sm:p-7 space-y-6 shadow-xl animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
                    <Sliders className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-base sm:text-lg text-foreground flex items-center gap-2">
                      <span>تخصيص وتفاصيل تنبيهات مراحل العمليات الحساسة والمواعيد الدقيقة</span>
                      <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs font-mono">
                        10 مراحل تشغيلية
                      </Badge>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      حدد المراحل التي ترغب بتلقي تنبيهات استباقية عنها، واضبط مدة التنبيه الدقيقة لكل مرحلة على حدة مع دعم الإدخال اليدوي الحر.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">
                    التنبيهات المفعلة:{" "}
                    <strong className="text-blue-600 font-mono">
                      {Object.values(stageAlertsConfig).filter((v) => v.enabled).length} من {SENSITIVE_STAGES_CONFIG.length}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Stage Alert Cards Grid */}
              <div className="space-y-3.5">
                {SENSITIVE_STAGES_CONFIG.map((stage) => {
                  const rule = stageAlertsConfig[stage.id] || { enabled: true, leadValue: stage.defaultLead };
                  const isEnabled = rule.enabled;

                  return (
                    <div
                      key={stage.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isEnabled
                          ? "bg-card border-border hover:border-blue-500/40 shadow-xs"
                          : "bg-muted/15 border-border/60 opacity-60"
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => handleUpdateStageAlert(stage.id, { enabled: !isEnabled })}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-all shrink-0 mt-0.5 cursor-pointer ${
                              isEnabled
                                ? "bg-blue-600 text-white shadow-xs"
                                : "border-2 border-border text-transparent hover:border-blue-400"
                            }`}
                            title={isEnabled ? "انقر لتعطيل التنبيه لهذه المرحلة" : "انقر لتفعيل التنبيه لهذه المرحلة"}
                          >
                            ✓
                          </button>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-foreground">{stage.name}</span>
                              <Badge variant="outline" className="text-[10px] font-mono border-border text-muted-foreground">
                                {stage.stageOrder}
                              </Badge>
                              {isEnabled ? (
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                                  تنبيه نشط
                                </Badge>
                              ) : (
                                <Badge className="bg-muted text-muted-foreground text-[10px]">معطل</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                              {stage.description}
                            </p>
                          </div>
                        </div>

                        {/* Controls: Preset chips + Manual Input */}
                        {isEnabled && (
                          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {stage.options.map((opt) => {
                                const isSelected = rule.leadValue === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleUpdateStageAlert(stage.id, { leadValue: opt.value })}
                                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                      isSelected
                                        ? "bg-blue-600 text-white shadow-xs"
                                        : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Manual lead value input */}
                            <div className="flex items-center gap-1 bg-muted/30 border border-border rounded-xl px-2 py-0.5">
                              <span className="text-[11px] text-muted-foreground font-bold">يدوي:</span>
                              <input
                                type="number"
                                value={rule.leadValue}
                                onChange={(e) => handleUpdateStageAlert(stage.id, { leadValue: e.target.value })}
                                className="w-14 bg-transparent text-center font-mono font-bold text-xs text-foreground outline-none"
                              />
                              <span className="text-[10px] text-muted-foreground">{stage.unit}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* RADAR TENDER DATA MANAGEMENT & CLEANUP ACTIONS                            */}
          {/* ========================================================================= */}
          {activeCategoryTab === "radar" && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.04] p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center font-bold shrink-0 border border-rose-500/25">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">
                      إدارة وحذف المناقصات والعمليات الملتقطة بالرادار
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      تطهير الرادار وحذف المناقصات غير المرغوبة أو مسح كافة العمليات التي تم رصدها ولم تسحب بعد
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Reset Company Assignments */}
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const res = await api.post("/radar/reset-company-assignments");
                        toast.success(res.data?.message || "تم إلغاء أي ربط مسبق بالشركات بنجاح");
                      } catch {
                        toast.error("فشل تصفير ربط الشركات");
                      }
                    }}
                    className="border-blue-500/40 bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-500 text-xs font-bold rounded-xl h-9 px-3.5 cursor-pointer transition-all active:scale-95"
                  >
                    <span>تصفير ربط الشركات بالرادار</span>
                  </Button>

                  {/* Clear all pending */}
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      if (!confirm("تحذير: هل أنت متأكد من مسح وحذف كافة العمليات والمناقصات الملتقطة بالرادار التي لم تُسحب كعمليات بعد؟")) return;
                      try {
                        const res = await api.delete("/radar/clear-pending");
                        toast.success(res.data?.message || "تم مسح كافة المناقصات الملتقطة بالرادار بنجاح");
                      } catch {
                        toast.error("فشل مسح مناقصات الرادار");
                      }
                    }}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl h-9 px-3.5 cursor-pointer shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>مسح كافة الملتقطات بالرادار</span>
                  </Button>
                </div>
              </div>

              {/* Neutral Radar Policy Notice */}
              <div className="p-3.5 rounded-xl bg-card border border-border text-xs leading-relaxed space-y-1 text-muted-foreground">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>طبيعة عمل الرادار الحكومي العام:</span>
                </div>
                <p>
                  كافة المناقصات المرصودة بالرادار هي فرص ومناقصات حكومية عامة محايدة بدون اقتراح أو تعيين مسبق لأي شركة. يتم اختيار وتحديد الشركة المسؤولة يدوياً بمعرفتك حصراً عند الضغط على &quot;سحب كعملية&quot;.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TELEGRAM EXECUTIVE BOT & ALERTS CONTROL HUB                               */}
          {/* ========================================================================= */}
          {activeCategoryTab === "telegram" && (
            <div className="rounded-3xl border-2 border-blue-500/30 bg-card p-5 sm:p-7 space-y-6 shadow-xl animate-fade-in">
              {/* Telegram Status Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shrink-0">
                    <Send className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-base sm:text-lg text-foreground">
                        المساعد التنفيذي وبوت تليجرام الرسمي
                      </h3>
                      <Badge className={
                        telegramStatus?.connected
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-mono"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-mono"
                      }>
                        {telegramStatus?.connected ? "متصل ونشط 🟢" : "جاري التهيئة 🟡"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ربط مباشر ومحكم مع هاتف السيد المدير العام لاعتماد المعاملات والطباعة واستقبال التنبيهات الفورية
                    </p>
                  </div>
                </div>

                {/* Instant Actions: Test Alert & Reconnect */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleReconnectTelegram}
                    disabled={reconnectingTelegram}
                    className="h-10 px-3.5 rounded-xl border-border hover:bg-muted font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${reconnectingTelegram ? "animate-spin text-blue-600" : ""}`} />
                    <span>إعادة تنشيط البوت</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleTestTelegramAlert}
                    disabled={testingTelegram}
                    className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs shadow-md shadow-blue-500/25 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                  >
                    {testingTelegram ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    <span>اختبار الاتصال بالبوت 🚀</span>
                  </Button>
                </div>
              </div>

              {/* Bot Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground block">معرف البوت المعتمد:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-blue-600 dark:text-blue-400">
                      @{telegramStatus?.botUsername || "GoldenERP_Bot"}
                    </span>
                    <a
                      href={`https://t.me/${telegramStatus?.botUsername || "GoldenERP_Bot"}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-blue-500 text-xs"
                      title="فتح البوت في تليجرام"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground block">شات المدير العام المقترن:</span>
                  <span className="font-mono font-black text-sm text-foreground">
                    {telegramStatus?.adminChatId || "في انتظار أول رسالة (/start) من المدير"}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground block">حالة الأمان وتوليد الهاش:</span>
                  <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4" />
                    <span>توليد هاش SHA-256 معتمد لحظياً</span>
                  </span>
                </div>
              </div>

              {/* Telegram Bot Capabilities Highlights (مطابقة لطلب وصورة المستخدم) */}
              <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-blue-500/[0.04] to-indigo-500/[0.07] border border-blue-500/25 space-y-3">
                <h4 className="text-xs font-black text-foreground flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>المزايا التنفيذية للبوت وتجربة المستخدم المطورة (UX):</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-card/80 border border-border space-y-1">
                    <div className="font-bold text-foreground flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-blue-500" />
                      <span>اختيار الشركة أولاً 🏢</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      تحديد شركة العمل النشطة (جولدن، إكسلنت، العهد، الحديثة، أو الكل) لتخصيص كافة العمليات والتقارير لها.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-card/80 border border-border space-y-1">
                    <div className="font-bold text-foreground flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-indigo-500" />
                      <span>أزرار سفلية دائمة 📱</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      لوحة أزرار ثابتة أسفل شاشة الهاتف للتنقل السريع بين طلبات الاعتماد، والعمليات، والضمانات دون كتابة.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-card/80 border border-border space-y-1">
                    <div className="font-bold text-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-amber-500" />
                      <span>اعتماد ورفض الطباعة 📑</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      إرسال إشعار فوري عند طلب أي موظف طباعة مستند مع زرين للاعتماد الفوري أو الرفض وتوليد الهاش الرقمي.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-card/80 border border-border space-y-1">
                    <div className="font-bold text-foreground flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-emerald-500" />
                      <span>فحص الضمانات والأداء 📊</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      تقرير مالي دقيق بنسب الترسية، وقيم العقود، ومتابعة تواريخ انتهاء خطابات الضمان البنكية استباقياً.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECURITY & SESSION ENFORCEMENT SHIELD MONITOR                             */}
          {/* ========================================================================= */}
          {activeCategoryTab === "security" && (
            <div className="rounded-3xl border-2 border-emerald-500/30 bg-card p-5 sm:p-7 space-y-5 shadow-xl animate-fade-in">
              <div className="flex items-center gap-3.5 border-b border-border/80 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-lg shrink-0">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base sm:text-lg text-foreground">
                      درع الرقابة والأمان وحماية الجلسات (مفعل ولحظي)
                    </h3>
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-mono">
                      محصن ونشط 🛡️
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    كافة القواعد أدناه مفعلة في خادم المصادقة وقاعدة البيانات وواجهة المستخدم وفقاً لضوابط الأمان الحكومية
                  </p>
                </div>
              </div>

              {/* 4 Security Rules Live Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                {/* 1. Account Lock Rule */}
                <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-foreground flex items-center gap-1.5">
                      <Lock className="h-4 w-4 text-rose-500" />
                      <span>قفل الحساب بعد المحاولات الخاطئة</span>
                    </span>
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                      مفعل بخادم المصادقة
                    </Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    يتم قفل الحساب فوراً عند تجاوز المحاولات الخاطئة وحجب تسجيل الدخول، مع توثيق ذلك في السجل الأمني، وإمكانية فك القفل بضغطة زر من صفحة إدارة الموظفين.
                  </p>
                </div>

                {/* 2. Inactivity Timeout Rule */}
                <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-foreground flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span>إنهاء الجلسة التلقائي عند الخمول</span>
                    </span>
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                      مؤقت نشط بالمتصفح
                    </Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    يتم تتبع نشاط وتفاعل المستخدم باستمرار، ويُسجل خروج الجهاز تلقائياً بعد انقضاء مدة الخمول لحماية سرية البيانات التعاقدية من أي عبث.
                  </p>
                </div>

                {/* 3. Night Curfew Rule */}
                <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-foreground flex items-center gap-1.5">
                      <Moon className="h-4 w-4 text-amber-500" />
                      <span>ساعات الحظر المسائي (20:00 - 06:00)</span>
                    </span>
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                      تدقيق مسائي مشدد
                    </Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    تخضع العمليات والإجراءات الحساسة المنفذة ليلاً لتدقيق مضاعف ويظهر مؤشر التحذير في الشريط العلوي لتنبيه المستخدم بالرقابة المشددة.
                  </p>
                </div>

                {/* 4. Legal Retention Rule */}
                <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-foreground flex items-center gap-1.5">
                      <Scale className="h-4 w-4 text-indigo-500" />
                      <span>الاحتفاظ بالسجلات (5 سنوات)</span>
                    </span>
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                      مادة (78) قانون 182
                    </Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    حفظ وأرشفة إلزامية لكافة العمليات المغلقة ومستنداتها الفعلية لمنع الحذف العشوائي وتلبية متطلبات الجهات الرقابية والمحاسبية.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. Sticky Floating Save Action Bar (appears when changes are pending)     */}
      {/* ========================================================================= */}
      {totalUnsavedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[92%] animate-slide-up">
          <div className="rounded-2xl p-4 border border-blue-500/40 shadow-2xl flex items-center justify-between gap-4 bg-slate-950 text-white">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
              <div className="text-right">
                <span className="text-xs font-bold block text-white leading-tight">
                  تعديلات معلقة ({totalUnsavedCount})
                </span>
                <span className="text-[11px] text-slate-400 block">
                  لم يتم حفظ التعديلات في قاعدة البيانات بعد
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevertChanges}
                disabled={isSaving}
                className="border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs h-9 px-3 rounded-xl cursor-pointer font-bold"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>إلغاء</span>
              </Button>

              <Button
                size="sm"
                onClick={handleSaveAll}
                disabled={isSaving}
                className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-lg shadow-blue-500/25 flex items-center gap-1.5 cursor-pointer"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>حفظ الآن</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
