"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, Loader2, Plus, Building2, FileText, CheckCircle2,
  Sparkles, Shield, AlertCircle, MapPin, Lock, ShieldCheck,
  Landmark, Coins, Clock, Calendar, Mail, FileCheck, Check,
  ChevronLeft, HelpCircle, Layers, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/lib/api";
import { useCompany } from "@/context/company-context";
import { EGYPT_GOVERNORATES } from "@/lib/governorates";

interface Company {
  id: string;
  name: string;
  code: string;
}

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
        const o = r % 10;
        const t = Math.floor(r / 10);
        if (o > 0) res += ones[o] + " و " + tens[t];
        else res += tens[t];
      }
    }
    return res;
  }

  const billions = Math.floor(num / 1000000000);
  const millions = Math.floor((num % 1000000000) / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;

  const parts: string[] = [];
  if (billions > 0) parts.push(convertGroup(billions) + " مليار");
  if (millions > 0) parts.push(convertGroup(millions) + " مليون");
  if (thousands > 0) {
    if (thousands === 1) parts.push("ألف");
    else if (thousands === 2) parts.push("ألفان");
    else if (thousands >= 3 && thousands <= 10) parts.push(convertGroup(thousands) + " آلاف");
    else parts.push(convertGroup(thousands) + " ألف");
  }
  if (remainder > 0) parts.push(convertGroup(remainder));

  return parts.join(" و ") + " جنيه مصري فقط لا غير";
}

const TENDER_TYPES = [
  { value: "TENDER", label: "مناقصة عامة", letter: "M", desc: "طرح عام مفتوح لكافة الشركات المؤهلة" },
  { value: "LIMITED_TENDER", label: "مناقصة محدودة", letter: "L", desc: "دعوة لشركات محددة مسجلة بسجل الموردين" },
  { value: "PRACTICE", label: "ممارسة عامة", letter: "P", desc: "جلسة تفاوض علنية على الأسعار" },
  { value: "LIMITED_PRACTICE", label: "ممارسة محدودة", letter: "R", desc: "تفاوض بين موردين محددين" },
  { value: "AUCTION", label: "مزايدة علنية", letter: "Z", desc: "بيع أو تأجير بأعلى سعر معلن" },
  { value: "DIRECT_ORDER", label: "أمر إسناد مباشر", letter: "D", desc: "تكليف مباشر وفقاً للقانون واللوائح" },
];

export default function NewOperationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userRole, allowedCompanyCodes } = useCompany();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("basic");

  const initialTitle = searchParams.get("title") || "";
  const initialAuthority = searchParams.get("authority") || "";

  // ━━━ Complete Form State ━━━
  const [form, setForm] = useState({
    // 1. Basic details
    name: initialTitle,
    titleEn: "",
    authority: initialAuthority,
    externalNumber: "",
    governorate: "القاهرة",
    fiscalYear: "2026/2027",
    email: "",

    // 2. Companies & Legal
    companyIds: [] as string[],
    tenderType: "TENDER",
    tenderMethod: "مناقصة عامة",
    tenderKind: "خدمات وتوريدات",
    biddingType: "مظروفين (فني ومالي)",
    tenderNature: "داخلية",
    evaluationType: "مقبول/مرفوض",
    activities: "",
    allowAlternativeOffers: false,
    allowInquiries: true,

    // 3. Financials & Guarantees
    temporaryInsurance: "",
    bookletPrice: "",
    finalInsuranceRate: "5",
    currency: "جنيه مصري",
    divisible: "تقبل التجزئة",
    allowMultipleTempInsurance: false,
    allowDownPayment: false,
    downPayment: "",
    warrantyStatement: "",

    // 4. Durations & Critical Dates
    publishingDays: "",
    deliveryDuration: "شهر",
    publicationDate: "",
    bookletDeadline: "",
    technicalOpeningDate: "",
    financialOpeningDate: "",
    inquiriesSessionDate: "",

    // 5. Conditions & Notes
    conditions: "",
    description: "",
    notes: "",
  });

  // Filter companies: Manager sees all, Employee sees allowed only
  const availableCompanies = useMemo(() => {
    if (userRole === "GENERAL_MANAGER") return companies;
    if (!allowedCompanyCodes || allowedCompanyCodes.length === 0) return companies;
    return companies.filter((c) =>
      allowedCompanyCodes.includes(c.code.toUpperCase())
    );
  }, [companies, userRole, allowedCompanyCodes]);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await api.get("/companies");
        setCompanies(res.data);
      } catch {}
    };
    fetchCompanies();
  }, []);

  // When available companies load, select first if none selected
  useEffect(() => {
    if (availableCompanies.length > 0 && form.companyIds.length === 0) {
      setForm((f) => ({ ...f, companyIds: [availableCompanies[0].id] }));
    }
  }, [availableCompanies]);

  const toggleCompany = (id: string) => {
    setForm((prev) => ({
      ...prev,
      companyIds: prev.companyIds.includes(id)
        ? prev.companyIds.filter((c) => c !== id)
        : [...prev.companyIds, id],
    }));
  };

  const [expectedCodes, setExpectedCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (form.companyIds.length === 0 || !form.tenderType) return;
    const fetchCodes = async () => {
      const codes: Record<string, string> = {};
      for (const compId of form.companyIds) {
        const comp = companies.find((c) => c.id === compId);
        if (comp) {
          try {
            const res = await api.get(`/operations/next-code?companyCode=${comp.code}&tenderType=${form.tenderType}`);
            if (res.data?.displayCode) {
              codes[comp.id] = res.data.displayCode;
            }
          } catch {}
        }
      }
      setExpectedCodes(codes);
    };
    fetchCodes();
  }, [form.companyIds, form.tenderType, companies]);

  // Update tenderMethod label when tenderType changes
  const handleTenderTypeChange = (typeVal: string) => {
    const matched = TENDER_TYPES.find(t => t.value === typeVal);
    setForm((f) => ({
      ...f,
      tenderType: typeVal,
      tenderMethod: matched ? matched.label : f.tenderMethod,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("اسم العملية أو المناقصة مطلوب");
      setActiveSection("basic");
      return;
    }
    if (!form.authority.trim()) {
      toast.error("اسم جهة الإسناد مطلوب");
      setActiveSection("basic");
      return;
    }
    if (form.companyIds.length === 0) {
      toast.error("يجب اختيار شركة واحدة على الأقل للدخول بها في المناقصة");
      setActiveSection("companies");
      return;
    }

    setLoading(true);
    try {
      // Build dates array
      const dates: Array<{ dateType: string; dateValue: string; label?: string }> = [];
      if (form.publicationDate) {
        dates.push({ dateType: "PUBLICATION", dateValue: form.publicationDate, label: "تاريخ النشر والإعلان" });
      }
      if (form.bookletDeadline) {
        dates.push({ dateType: "BOOKLET_DEADLINE", dateValue: form.bookletDeadline, label: "آخر موعد لسحب الكراسة وتقديم العطاءات" });
      }
      if (form.technicalOpeningDate) {
        dates.push({ dateType: "TECHNICAL_OPENING", dateValue: form.technicalOpeningDate, label: "موعد جلسة فتح المظاريف الفنية" });
      }
      if (form.financialOpeningDate) {
        dates.push({ dateType: "FINANCIAL_OPENING", dateValue: form.financialOpeningDate, label: "موعد جلسة فتح المظاريف المالية" });
      }
      if (form.inquiriesSessionDate) {
        dates.push({ dateType: "INQUIRIES_SESSION", dateValue: form.inquiriesSessionDate, label: "جلسة الاستفسارات" });
      }

      const payload = {
        name: form.name.trim(),
        authority: form.authority.trim(),
        externalNumber: form.externalNumber.trim() || undefined,
        governorate: form.governorate,
        tenderType: form.tenderType as any,
        companyIds: form.companyIds,
        notes: form.notes?.trim() || undefined,

        // Extended portal details
        titleEn: form.titleEn?.trim() || undefined,
        tenderMethod: form.tenderMethod?.trim() || undefined,
        tenderKind: form.tenderKind?.trim() || undefined,
        biddingType: form.biddingType?.trim() || undefined,
        tenderNature: form.tenderNature?.trim() || undefined,
        evaluationType: form.evaluationType?.trim() || undefined,
        activities: form.activities?.trim() || undefined,
        allowAlternativeOffers: form.allowAlternativeOffers,
        allowInquiries: form.allowInquiries,

        temporaryInsurance: form.temporaryInsurance !== "" && !isNaN(Number(form.temporaryInsurance)) ? Number(form.temporaryInsurance) : undefined,
        bookletPrice: form.bookletPrice !== "" && !isNaN(Number(form.bookletPrice)) ? Number(form.bookletPrice) : undefined,
        finalInsuranceRate: form.finalInsuranceRate !== "" && !isNaN(Number(form.finalInsuranceRate)) ? Number(form.finalInsuranceRate) : undefined,
        warrantyStatement: form.warrantyStatement?.trim() || undefined,
        currency: form.currency?.trim() || undefined,
        divisible: form.divisible?.trim() || undefined,
        allowMultipleTempInsurance: form.allowMultipleTempInsurance,
        allowDownPayment: form.allowDownPayment,
        downPayment: form.downPayment?.trim() || undefined,

        fiscalYear: form.fiscalYear?.trim() || undefined,
        email: form.email?.trim() || undefined,
        publishingDays: form.publishingDays !== "" ? (isNaN(Number(form.publishingDays)) ? form.publishingDays : Number(form.publishingDays)) : undefined,
        deliveryDuration: form.deliveryDuration?.trim() || undefined,

        conditions: form.conditions?.trim() || undefined,
        description: form.description?.trim() || undefined,

        dates: dates.length > 0 ? dates : undefined,
      };

      const res = await api.post("/operations", payload);
      toast.success("تم إنشاء وتسجيل العملية الشاملة بنجاح! 🚀");
      router.push(`/dashboard/operations/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل في إنشاء العملية");
    } finally {
      setLoading(false);
    }
  };

  const SECTIONS = [
    { id: "basic", label: "بيانات العملية والجهة", icon: FileText, required: true },
    { id: "companies", label: "الشركات والأكواد", icon: Building2, required: true },
    { id: "legal", label: "أسلوب التعاقد", icon: Landmark },
    { id: "financial", label: "الشروط المالية والضمانات", icon: Coins },
    { id: "dates", label: "المواعيد والبرنامج الزمني", icon: Clock },
    { id: "conditions", label: "الشروط والملاحظات", icon: ShieldCheck },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* ━━━ Header Banner ━━━ */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/20 to-card border border-blue-500/20 shadow-xl flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3.5">
          <Link href="/dashboard/operations">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-2xl border-border bg-card/60 text-foreground hover:bg-muted cursor-pointer shadow-xs"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-foreground">
                إضافة عملية ومناقصة جديدة
              </h1>
              <Badge className="badge-blue text-[10px] font-bold">تسجيل يدوي متكامل</Badge>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
              تسجيل عملية رسمية جديدة، ربط الشركات المشاركة، توليد الأكواد وحساب الضمانات والشروط
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || availableCompanies.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-5 rounded-xl text-xs sm:text-sm shadow-md cursor-pointer flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span>حفظ وإنشاء العملية</span>
          </Button>
        </div>
      </div>

      {/* ━━━ Section Navigator Tabs ━━━ */}
      <div className="p-1.5 rounded-2xl bg-card border border-border shadow-xs flex items-center gap-1 overflow-x-auto scrollbar-none">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                isActive
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{sec.label}</span>
              {sec.required && (
                <span className={`text-[10px] ${isActive ? "text-blue-200" : "text-rose-500 font-black"}`}>*</span>
              )}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ━━━ SECTION 1: BASIC DETAILS ━━━ */}
        {activeSection === "basic" && (
          <div className="rounded-3xl p-5 sm:p-7 border border-border bg-card shadow-sm space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="font-black text-foreground text-sm sm:text-base">بيانات العملية والجهة الإدارية</h3>
              </div>
              <span className="text-xs text-muted-foreground">الخطوة 1 من 6</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold text-foreground">اسم العملية والمناقصة الرسمي *</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="مثال: توريد إطارات سيارات ومستلزمات صيانة للمستشفيات العامة"
                  className="rounded-xl text-sm h-11"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold text-foreground">اسم العملية باللغة الإنجليزية (English Title)</Label>
                <Input
                  value={form.titleEn}
                  onChange={(e) => setForm((f) => ({ ...f, titleEn: e.target.value }))}
                  placeholder="Supply of automobile tires and maintenance equipment"
                  dir="ltr"
                  className="rounded-xl text-sm h-11 font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">جهة الإسناد / الطرح *</Label>
                <Input
                  required
                  value={form.authority}
                  onChange={(e) => setForm((f) => ({ ...f, authority: e.target.value }))}
                  placeholder="مثال: الهيئة العامة للخدمات الحكومية"
                  className="rounded-xl text-sm h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">رقم المناقصة لدى الجهة (Ref No)</Label>
                <Input
                  value={form.externalNumber}
                  onChange={(e) => setForm((f) => ({ ...f, externalNumber: e.target.value }))}
                  placeholder="مثال: GOV-2026-145"
                  className="rounded-xl text-sm h-11 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>المحافظة * (محافظات جمهورية مصر العربية)</span>
                </Label>
                <Select
                  value={form.governorate}
                  onValueChange={(v) => setForm((f) => ({ ...f, governorate: v ?? "القاهرة" }))}
                >
                  <SelectTrigger className="w-full rounded-xl text-sm h-11">
                    <SelectValue placeholder="اختر المحافظة">
                      {form.governorate || "القاهرة"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {EGYPT_GOVERNORATES.map((gov) => (
                      <SelectItem key={gov} value={gov}>
                        {gov}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">العام المالي</Label>
                <Input
                  value={form.fiscalYear}
                  onChange={(e) => setForm((f) => ({ ...f, fiscalYear: e.target.value }))}
                  placeholder="2026/2027"
                  className="rounded-xl text-sm h-11 font-mono"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-blue-600" />
                  <span>البريد الإلكتروني للجهة</span>
                </Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="tenders@authority.gov.eg"
                  type="email"
                  dir="ltr"
                  className="rounded-xl text-sm h-11 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <Button
                type="button"
                onClick={() => setActiveSection("companies")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-5 rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>المتابعة إلى الشركات والأكواد</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ━━━ SECTION 2: PARTICIPATING COMPANIES ━━━ */}
        {activeSection === "companies" && (
          <div className="rounded-3xl p-5 sm:p-7 border border-border bg-card shadow-sm space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                <h3 className="font-black text-foreground text-sm sm:text-base">الشركات المقدمة للعطاء وتوليد الكود</h3>
              </div>
              {userRole === "GENERAL_MANAGER" ? (
                <Badge className="badge-blue text-[11px] font-bold">
                  <ShieldCheck className="h-3 w-3 ml-1" />
                  صلاحية المدير العام — جميع الشركات متاحة ({companies.length})
                </Badge>
              ) : (
                <Badge className="badge-amber text-[11px] font-bold">
                  <Lock className="h-3 w-3 ml-1" />
                  الشركات المصرح لك بها فقط ({availableCompanies.length} من {companies.length})
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              حدد الشركة أو الشركات التي سيتم الدخول بها في العملية. يتم توليد الكود التسلسلي الموحد (مثل AM01, BP02) تلقائياً بناءً على كود الشركة ونوع الطرح.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {availableCompanies.map((c) => {
                const isChecked = form.companyIds.includes(c.id);

                return (
                  <div
                    key={c.id}
                    onClick={() => toggleCompany(c.id)}
                    className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-150 select-none ${
                      isChecked
                        ? "border-blue-500/60 bg-blue-500/10 shadow-xs ring-1 ring-blue-500/30"
                        : "border-border bg-muted/30 hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {c.code}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                          {c.name}
                        </span>
                        {isChecked && expectedCodes[c.id] && (
                          <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            كود العملية المقترح: {expectedCodes[c.id]}
                          </span>
                        )}
                      </div>
                    </div>

                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleCompany(c.id)}
                      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 text-white pointer-events-none"
                    />
                  </div>
                );
              })}
            </div>

            {availableCompanies.length === 0 && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 text-center font-medium">
                لا توجد شركات مصرح لك بها حالياً. تواصل مع المدير العام لمنحك صلاحيات الشركات.
              </div>
            )}

            <div className="flex justify-between pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveSection("basic")}
                className="rounded-xl text-xs cursor-pointer"
              >
                السابق
              </Button>
              <Button
                type="button"
                onClick={() => setActiveSection("legal")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-5 rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>المتابعة إلى أسلوب التعاقد</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ━━━ SECTION 3: LEGAL & CONTRACTING ━━━ */}
        {activeSection === "legal" && (
          <div className="rounded-3xl p-5 sm:p-7 border border-border bg-card shadow-sm space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-indigo-600" />
                <h3 className="font-black text-foreground text-sm sm:text-base">الإطار القانوني وأسلوب التعاقد</h3>
              </div>
              <span className="text-xs text-muted-foreground">الخطوة 3 من 6</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold text-foreground">نوع الطرح القانوني بالنظام *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  {TENDER_TYPES.map((t) => {
                    const isSelected = form.tenderType === t.value;
                    return (
                      <div
                        key={t.value}
                        onClick={() => handleTenderTypeChange(t.value)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-blue-600/10 border-blue-500 shadow-xs ring-1 ring-blue-500/30"
                            : "bg-muted/30 border-border hover:bg-muted/60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-foreground">{t.label}</span>
                          <span className="font-mono text-xs font-bold text-blue-600">({t.letter})</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{t.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">طريقة التعاقد (نص الكراسة)</Label>
                <Input
                  value={form.tenderMethod}
                  onChange={(e) => setForm((f) => ({ ...f, tenderMethod: e.target.value }))}
                  placeholder="مناقصة عامة / ممارسة محدودة"
                  className="rounded-xl text-sm h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">طبيعة العملية</Label>
                <Input
                  value={form.tenderKind}
                  onChange={(e) => setForm((f) => ({ ...f, tenderKind: e.target.value }))}
                  placeholder="خدمات وتوريدات / أعمال مقاولات"
                  className="rounded-xl text-sm h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">نوع التقديم</Label>
                <Input
                  value={form.biddingType}
                  onChange={(e) => setForm((f) => ({ ...f, biddingType: e.target.value }))}
                  placeholder="مظروفين (فني ومالي) / مظروف واحد"
                  className="rounded-xl text-sm h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">نطاق العملية</Label>
                <Input
                  value={form.tenderNature}
                  onChange={(e) => setForm((f) => ({ ...f, tenderNature: e.target.value }))}
                  placeholder="داخلية / دولية"
                  className="rounded-xl text-sm h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">أسلوب التقييم الفني</Label>
                <Input
                  value={form.evaluationType}
                  onChange={(e) => setForm((f) => ({ ...f, evaluationType: e.target.value }))}
                  placeholder="مقبول/مرفوض / نقاط فنية ومجموع درجات"
                  className="rounded-xl text-sm h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">الأنشطة المشمولة</Label>
                <Input
                  value={form.activities}
                  onChange={(e) => setForm((f) => ({ ...f, activities: e.target.value }))}
                  placeholder="توريدات طبية / إطارات ومعدات"
                  className="rounded-xl text-sm h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">تقبل العروض البديلة</Label>
                <Select
                  value={form.allowAlternativeOffers ? "true" : "false"}
                  onValueChange={(v) => setForm((f) => ({ ...f, allowAlternativeOffers: v === "true" }))}
                >
                  <SelectTrigger className="w-full rounded-xl text-sm h-11">
                    <SelectValue>
                      {form.allowAlternativeOffers ? "نعم — تقبل العروض البديلة" : "لا تقبل العروض البديلة"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">نعم — تقبل العروض البديلة</SelectItem>
                    <SelectItem value="false">لا تقبل العروض البديلة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">تقبل الاستفسارات</Label>
                <Select
                  value={form.allowInquiries ? "true" : "false"}
                  onValueChange={(v) => setForm((f) => ({ ...f, allowInquiries: v === "true" }))}
                >
                  <SelectTrigger className="w-full rounded-xl text-sm h-11">
                    <SelectValue>
                      {form.allowInquiries ? "نعم — تقبل الاستفسارات" : "لا تقبل الاستفسارات"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">نعم — تقبل الاستفسارات</SelectItem>
                    <SelectItem value="false">لا تقبل الاستفسارات</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveSection("companies")}
                className="rounded-xl text-xs cursor-pointer"
              >
                السابق
              </Button>
              <Button
                type="button"
                onClick={() => setActiveSection("financial")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-5 rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>المتابعة إلى الشروط المالية والضمانات</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ━━━ SECTION 4: FINANCIALS & GUARANTEES ━━━ */}
        {activeSection === "financial" && (
          <div className="rounded-3xl p-5 sm:p-7 border border-border bg-card shadow-sm space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-emerald-600" />
                <h3 className="font-black text-foreground text-sm sm:text-base">الشروط المالية والبنكية والضمانات</h3>
              </div>
              <span className="text-xs text-muted-foreground">الخطوة 4 من 6</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">قيمة التأمين المؤقت الابتدائي (ج.م.)</Label>
                <Input
                  type="number"
                  value={form.temporaryInsurance}
                  onChange={(e) => setForm((f) => ({ ...f, temporaryInsurance: e.target.value }))}
                  placeholder="0.00"
                  className="rounded-xl text-sm h-11 font-mono"
                />
                {form.temporaryInsurance && !isNaN(Number(form.temporaryInsurance)) && Number(form.temporaryInsurance) > 0 && (
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                    {tafqeetArabic(Number(form.temporaryInsurance))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">ثمن كراسة الشروط (ج.م.)</Label>
                <Input
                  type="number"
                  value={form.bookletPrice}
                  onChange={(e) => setForm((f) => ({ ...f, bookletPrice: e.target.value }))}
                  placeholder="0.00"
                  className="rounded-xl text-sm h-11 font-mono"
                />
                {form.bookletPrice && !isNaN(Number(form.bookletPrice)) && Number(form.bookletPrice) > 0 && (
                  <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-400 font-bold">
                    {tafqeetArabic(Number(form.bookletPrice))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">نسبة التأمين النهائي (%)</Label>
                <Input
                  type="number"
                  value={form.finalInsuranceRate}
                  onChange={(e) => setForm((f) => ({ ...f, finalInsuranceRate: e.target.value }))}
                  placeholder="5"
                  className="rounded-xl text-sm h-11 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">العملة الرسمية</Label>
                <Input
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  placeholder="جنيه مصري"
                  className="rounded-xl text-sm h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">تقبل التجزئة</Label>
                <Input
                  value={form.divisible}
                  onChange={(e) => setForm((f) => ({ ...f, divisible: e.target.value }))}
                  placeholder="تقبل التجزئة / لا تقبل التجزئة"
                  className="rounded-xl text-sm h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">تجزئة التأمين المؤقت</Label>
                <Select
                  value={form.allowMultipleTempInsurance ? "true" : "false"}
                  onValueChange={(v) => setForm((f) => ({ ...f, allowMultipleTempInsurance: v === "true" }))}
                >
                  <SelectTrigger className="w-full rounded-xl text-sm h-11">
                    <SelectValue>
                      {form.allowMultipleTempInsurance ? "مسموح بالرد والتجزئة" : "غير مجزأ"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">مسموح بالرد والتجزئة</SelectItem>
                    <SelectItem value="false">غير مجزأ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">صرف دفعة مقدمة</Label>
                <Select
                  value={form.allowDownPayment ? "true" : "false"}
                  onValueChange={(v) => setForm((f) => ({ ...f, allowDownPayment: v === "true" }))}
                >
                  <SelectTrigger className="w-full rounded-xl text-sm h-11">
                    <SelectValue>
                      {form.allowDownPayment ? "متاحة" : "غير متاح"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">متاحة</SelectItem>
                    <SelectItem value="false">غير متاح</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">تفاصيل أو نسبة الدفعة المقدمة</Label>
                <Input
                  value={form.downPayment}
                  onChange={(e) => setForm((f) => ({ ...f, downPayment: e.target.value }))}
                  placeholder="مثلاً: 25% من إجمالي التعاقد مقابل خطاب ضمان"
                  disabled={!form.allowDownPayment}
                  className="rounded-xl text-sm h-11"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold text-foreground">مدة وتعليمات الضمان</Label>
                <Input
                  value={form.warrantyStatement}
                  onChange={(e) => setForm((f) => ({ ...f, warrantyStatement: e.target.value }))}
                  placeholder="ضمان شامل للأعمال لمدة 12 شهراً تبدأ من تاريخ الاستلام النهائي"
                  className="rounded-xl text-sm h-11"
                />
              </div>
            </div>

            <div className="flex justify-between pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveSection("legal")}
                className="rounded-xl text-xs cursor-pointer"
              >
                السابق
              </Button>
              <Button
                type="button"
                onClick={() => setActiveSection("dates")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-5 rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>المتابعة إلى المواعيد والمدد</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ━━━ SECTION 5: DATES & DURATIONS ━━━ */}
        {activeSection === "dates" && (
          <div className="rounded-3xl p-5 sm:p-7 border border-border bg-card shadow-sm space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                <h3 className="font-black text-foreground text-sm sm:text-base">المواعيد الحرجة والبرنامج الزمني</h3>
              </div>
              <span className="text-xs text-muted-foreground">الخطوة 5 من 6</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">تاريخ النشر والإعلان</Label>
                <Input
                  type="date"
                  value={form.publicationDate}
                  onChange={(e) => setForm((f) => ({ ...f, publicationDate: e.target.value }))}
                  className="rounded-xl text-sm h-11 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground text-rose-600 dark:text-rose-400">آخر موعد لسحب الكراسة وتقديم العطاءات (موعد الإغلاق)</Label>
                <Input
                  type="date"
                  value={form.bookletDeadline}
                  onChange={(e) => setForm((f) => ({ ...f, bookletDeadline: e.target.value }))}
                  className="rounded-xl text-sm h-11 font-mono border-rose-500/40"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">موعد جلسة فتح المظاريف الفنية</Label>
                <Input
                  type="date"
                  value={form.technicalOpeningDate}
                  onChange={(e) => setForm((f) => ({ ...f, technicalOpeningDate: e.target.value }))}
                  className="rounded-xl text-sm h-11 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">موعد جلسة فتح المظاريف المالية</Label>
                <Input
                  type="date"
                  value={form.financialOpeningDate}
                  onChange={(e) => setForm((f) => ({ ...f, financialOpeningDate: e.target.value }))}
                  className="rounded-xl text-sm h-11 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">تاريخ جلسة الاستفسارات</Label>
                <Input
                  type="date"
                  value={form.inquiriesSessionDate}
                  onChange={(e) => setForm((f) => ({ ...f, inquiriesSessionDate: e.target.value }))}
                  className="rounded-xl text-sm h-11 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">مدة النشر بالبوابة (بالأيام)</Label>
                <Input
                  type="number"
                  value={form.publishingDays}
                  onChange={(e) => setForm((f) => ({ ...f, publishingDays: e.target.value }))}
                  placeholder="14 أو 21 يوماً"
                  className="rounded-xl text-sm h-11 font-mono"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold text-foreground">مدة التوريد والاستلام / مدة التنفيذ</Label>
                <Input
                  value={form.deliveryDuration}
                  onChange={(e) => setForm((f) => ({ ...f, deliveryDuration: e.target.value }))}
                  placeholder="30 يوماً من تاريخ استلام أمر التوريد"
                  className="rounded-xl text-sm h-11"
                />
              </div>
            </div>

            <div className="flex justify-between pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveSection("financial")}
                className="rounded-xl text-xs cursor-pointer"
              >
                السابق
              </Button>
              <Button
                type="button"
                onClick={() => setActiveSection("conditions")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-5 rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>المتابعة إلى الشروط والملاحظات</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ━━━ SECTION 6: CONDITIONS & NOTES ━━━ */}
        {activeSection === "conditions" && (
          <div className="rounded-3xl p-5 sm:p-7 border border-border bg-card shadow-sm space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <h3 className="font-black text-foreground text-sm sm:text-base">الشروط والمواصفات والملاحظات الإدارية</h3>
              </div>
              <span className="text-xs text-muted-foreground">الخطوة 6 من 6</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                  <FileCheck className="h-4 w-4" />
                  <span>الشروط الخاصة والمواصفات المسجلة بكراسة الشروط</span>
                </Label>
                <Textarea
                  value={form.conditions}
                  onChange={(e) => setForm((f) => ({ ...f, conditions: e.target.value }))}
                  placeholder="الشروط والمواصفات الفنية أو شروط السداد الواردة بكراسة الشروط..."
                  rows={4}
                  className="rounded-xl text-sm font-sans leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>الوصف التفصيلي ومجال أعمال العملية</span>
                </Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="الوصف التفصيلي لمجال التوريدات أو الأعمال المطلوبة..."
                  rows={3}
                  className="rounded-xl text-sm font-sans leading-relaxed"
                />
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    <span>ملاحظات وشروط إدارية خاصة (تدوين يدوي داخلي اختياري)</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">تظل فارغة ما لم يكتب بها المستخدم</span>
                </div>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="ملاحظات إدارية داخلية خاصة بالشركة، متابعة سحب الكراسة، أو توجيهات للموظفين..."
                  rows={3}
                  className="rounded-xl text-sm font-sans leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-between pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveSection("dates")}
                className="rounded-xl text-xs cursor-pointer"
              >
                السابق
              </Button>
              <Button
                type="submit"
                disabled={loading || availableCompanies.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-11 px-8 rounded-xl text-sm shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                <span>اعتماد وإنشاء العملية الآن</span>
              </Button>
            </div>
          </div>
        )}

        {/* ━━━ Bottom Sticky Action Bar ━━━ */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-md flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
            <span>الشركات المحددة للدخول:</span>
            <Badge className="badge-blue text-xs font-mono font-bold">
              {form.companyIds.length} شركات
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard/operations">
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                className="rounded-xl text-xs cursor-pointer"
              >
                إلغاء
              </Button>
            </Link>

            <Button
              type="submit"
              disabled={loading || availableCompanies.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black h-10 px-6 rounded-xl text-xs sm:text-sm shadow-md cursor-pointer flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري التسجيل بالنظام...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>إنشاء وتسجيل العملية في النظام</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
