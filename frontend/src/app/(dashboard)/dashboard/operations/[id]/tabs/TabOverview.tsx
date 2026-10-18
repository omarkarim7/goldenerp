"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  FileText, Calendar, Building2, Clock, Edit, CheckCircle2,
  AlertTriangle, Plus, Sparkles, FolderOpen, BookOpen, Coins,
  Scale, Package, Layers, X, Check, Landmark, MapPin, Mail,
  Loader2, ShieldCheck, Globe, ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Portal } from "@/components/ui/portal";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  Operation, SectionCard, DataRow, EmptyState, formatCurrency,
  formatDate, formatDateTime, getCountdown, tafqeetArabic,
  getStageIcon, TENDER_TYPE_LABELS, DATE_TYPE_LABELS
} from "./types";
import { StepFooterNav } from "./StepFooterNav";

export function TabCompanies({ op }: { op: Operation }) {
  return (
    <SectionCard
      title="الشركات المشاركة بالعطاء"
      icon={Building2}
      iconColor="text-blue-600"
      badge={<Badge className="badge-blue text-[10px] font-bold">{op.companies?.length || 0} شركة</Badge>}
    >
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

export function TabOverview({
  op,
  onRefresh,
  onSelectTab,
  onNavigate,
}: {
  op: Operation;
  onRefresh: () => void;
  onSelectTab?: (tabId: string) => void;
  onNavigate?: (tabId: string) => void;
}) {
  const navigateFn = onNavigate || onSelectTab || (() => {});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSection, setEditSection] = useState<'basic' | 'legal' | 'financial' | 'durations' | 'conditions'>('basic');
  const [savingAll, setSavingAll] = useState(false);

  // ━━━ تنقية الملاحظات لمنع ظهور كود JSON الداخلي للمستخدم ━━━
  const cleanDisplayNotes = useMemo(() => {
    if (!op.notes) return "";
    const trimmed = op.notes.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        return parsed.textNotes || parsed.adminNotes || parsed.userNotes || "";
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }, [op.notes]);

  const [editingNotes, setEditingNotes] = useState(false);
  const [standaloneNotes, setStandaloneNotes] = useState(cleanDisplayNotes);
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setStandaloneNotes(cleanDisplayNotes);
  }, [cleanDisplayNotes]);

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

  // Edit fields
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
    setNotes(cleanDisplayNotes);

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
        notes: (() => {
          let notesPayload: any = notes || null;
          const trimmed = (op.notes || "").trim();
          if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            try {
              const parsed = JSON.parse(trimmed);
              parsed.textNotes = notes || "";
              notesPayload = JSON.stringify(parsed);
            } catch {}
          }
          return notesPayload;
        })(),
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
      let notesPayload: any = standaloneNotes;
      const trimmed = (op.notes || "").trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          const parsed = JSON.parse(trimmed);
          parsed.textNotes = standaloneNotes;
          notesPayload = JSON.stringify(parsed);
        } catch {
          notesPayload = standaloneNotes;
        }
      }
      await api.patch(`/operations/${op.id}`, { notes: notesPayload });
      toast.success("تم حفظ الملاحظات والشروط الخاصة في قاعدة البيانات بنجاح! 📝");
      setEditingNotes(false);
      onRefresh();
    } catch {
      toast.error("فشل حفظ الملاحظات في قاعدة البيانات");
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ━━━ نافذة عائمة شاملة لتعديل كافة بيانات العملية ━━━ */}
      {editModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-4xl max-h-[92vh] bg-card text-card-foreground border border-border/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-border bg-muted/40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center border border-blue-600/20">
                    <Edit className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-foreground">
                      تعديل بيانات العملية الشاملة
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      تعديل وتحديث كافة البيانات في قاعدة البيانات ومزامنتها فوراً
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal tabs */}
              <div className="px-4 py-2 border-b border-border bg-muted/20 flex items-center gap-1.5 overflow-x-auto shrink-0">
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
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                        isActive ? "bg-blue-600 text-white shadow-xs" : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
                {editSection === "basic" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs font-bold">اسم العملية الرسمي *</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} className="text-sm h-10" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">جهة الإسناد / الطرح *</Label>
                      <Input value={authority} onChange={(e) => setAuthority(e.target.value)} className="text-sm h-10" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">رقم العملية لدى الجهة</Label>
                      <Input value={externalNumber} onChange={(e) => setExternalNumber(e.target.value)} className="text-sm h-10 font-mono" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">المحافظة</Label>
                      <Input value={governorate} onChange={(e) => setGovernorate(e.target.value)} className="text-sm h-10" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">العام المالي</Label>
                      <Input value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)} className="text-sm h-10 font-mono" />
                    </div>
                  </div>
                )}

                {editSection === "legal" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">طريقة التعاقد</Label>
                      <Input value={tenderMethod} onChange={(e) => setTenderMethod(e.target.value)} className="text-sm h-10" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">طبيعة العملية</Label>
                      <Input value={tenderKind} onChange={(e) => setTenderKind(e.target.value)} className="text-sm h-10" />
                    </div>
                  </div>
                )}

                {editSection === "financial" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">قيمة التأمين المؤقت (ج.م)</Label>
                      <Input type="number" value={temporaryInsurance} onChange={(e) => setTemporaryInsurance(e.target.value)} className="text-sm h-10 font-mono" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">ثمن كراسة الشروط (ج.م)</Label>
                      <Input type="number" value={bookletPrice} onChange={(e) => setBookletPrice(e.target.value)} className="text-sm h-10 font-mono" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">نسبة التأمين النهائي %</Label>
                      <Input type="number" value={finalInsuranceRate} onChange={(e) => setFinalInsuranceRate(e.target.value)} className="text-sm h-10 font-mono" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">العملة الرسمية</Label>
                      <Input value={currency} onChange={(e) => setCurrency(e.target.value)} className="text-sm h-10" />
                    </div>
                  </div>
                )}

                {editSection === "durations" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">مدة النشر بالبوابة (بالأيام)</Label>
                      <Input type="number" value={publishingDays} onChange={(e) => setPublishingDays(e.target.value)} className="text-sm h-10 font-mono" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">مدة التوريد / التنفيذ</Label>
                      <Input value={deliveryDuration} onChange={(e) => setDeliveryDuration(e.target.value)} className="text-sm h-10" />
                    </div>
                  </div>
                )}

                {editSection === "conditions" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">الشروط والمواصفات الخاصة</Label>
                      <Textarea value={conditions} onChange={(e) => setConditions(e.target.value)} rows={3} className="text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">ملاحظات وشروط إدارية داخلية</Label>
                      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="text-sm" />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal footer */}
              <div className="p-4 border-t border-border bg-muted/40 flex items-center justify-between shrink-0">
                <Button variant="outline" onClick={() => setEditModalOpen(false)}>إلغاء</Button>
                <Button onClick={handleSaveAll} disabled={savingAll} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  {savingAll ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <CheckCircle2 className="h-4 w-4 ml-1" />}
                  <span>حفظ التعديلات في قاعدة البيانات</span>
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ━━━ PORTAL DATA BANNER (IF AVAILABLE) ━━━ */}
      {hasPortalData && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-amber-500/10 border border-blue-500/20 shadow-md space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <Globe className="h-4 w-4" />
              </div>
              <span className="text-xs font-black text-foreground">بيانات موثقة من بوابة التعاقدات الحكومية المصرية</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => openEditModal('basic')} className="text-xs h-7 rounded-xl">
              <Edit className="h-3 w-3 ml-1" />تعديل شامل
            </Button>
          </div>
        </div>
      )}

      {/* ━━━ MASTER OVERVIEW DETAILS GRID ━━━ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SectionCard
          title="معلومات العملية والجهة الإدارية"
          icon={FileText}
          iconColor="text-blue-600"
          actions={
            <Button size="sm" variant="outline" onClick={() => openEditModal('basic')} className="text-xs h-8 rounded-xl">
              <Edit className="h-3 w-3 ml-1" />تعديل
            </Button>
          }
        >
          <DataRow label="اسم العملية الرسمي" value={op.name} copyable />
          <DataRow label="جهة الإسناد / الطرح" value={op.authority} copyable />
          <DataRow label="المحافظة" value={op.governorate || "غير محددة"} />
          <DataRow label="رقم العملية لدى الجهة" value={op.externalNumber || p.refNo || "—"} mono copyable />
          <DataRow label="الرقم التسلسلي بالنظام" value={`#${op.serialNumber}`} mono />
          <DataRow label="العام المالي" value={p.fiscalYear || "2026/2027"} mono />
        </SectionCard>

        <SectionCard
          title="الإطار القانوني وأسلوب التعاقد"
          icon={Landmark}
          iconColor="text-indigo-600"
          actions={
            <Button size="sm" variant="outline" onClick={() => openEditModal('legal')} className="text-xs h-8 rounded-xl">
              <Edit className="h-3 w-3 ml-1" />تعديل
            </Button>
          }
        >
          <DataRow label="طريقة التعاقد" value={p.tenderMethod || TENDER_TYPE_LABELS[op.tenderType] || op.tenderType} />
          <DataRow label="نوع الطرح القانوني" value={TENDER_TYPE_LABELS[op.tenderType] || op.tenderType} />
          <DataRow label="طبيعة العملية" value={p.tenderKind || "خدمات وتوريدات"} />
          <DataRow label="نوع التقديم" value={p.biddingType || "إعلانات"} />
        </SectionCard>

        <SectionCard
          title="الشروط المالية والبنكية والضمانات"
          icon={Coins}
          iconColor="text-emerald-600"
          actions={
            <Button size="sm" variant="outline" onClick={() => openEditModal('financial')} className="text-xs h-8 rounded-xl">
              <Edit className="h-3 w-3 ml-1" />تعديل
            </Button>
          }
        >
          <DataRow
            label="قيمة التأمين المؤقت"
            value={formatCurrency(Number(p.temporaryInsurance ?? op.guarantees?.[0]?.amount ?? 0))}
            mono
          />
          <DataRow
            label="ثمن كراسة الشروط"
            value={p.bookletPrice ? formatCurrency(Number(p.bookletPrice)) : "—"}
            mono
          />
          <DataRow label="نسبة التأمين النهائي" value={`${p.finalInsuranceRate || 5}% من إجمالي التعاقد`} />
          <DataRow label="العملة الرسمية" value={p.currency || "جنيه مصري"} />
        </SectionCard>

        <SectionCard
          title="مدد التنفيذ والنشر والتسليم"
          icon={Clock}
          iconColor="text-amber-600"
          actions={
            <Button size="sm" variant="outline" onClick={() => openEditModal('durations')} className="text-xs h-8 rounded-xl">
              <Edit className="h-3 w-3 ml-1" />تعديل
            </Button>
          }
        >
          <DataRow label="مدة النشر بالبوابة" value={p.publishingDays ? `${p.publishingDays} يوماً` : "—"} mono />
          <DataRow label="مدة الاستلام والتوريد" value={p.deliveryDuration || "شهر"} />
          <DataRow label="تاريخ تسجيل العملية" value={formatDate(op.createdAt)} />
          <DataRow label="المستندات وكراسة الشروط" value={`${op.documents?.length || 0} ملفات مؤرشفة`} />
        </SectionCard>
      </div>

      {/* ━━━ شروط وملاحظات إدارية ━━━ */}
      <SectionCard
        title="ملاحظات وشروط إدارية خاصة"
        icon={Edit}
        iconColor="text-amber-500"
        actions={
          !editingNotes && (
            <Button size="sm" variant="outline" onClick={() => setEditingNotes(true)} className="text-xs h-8 rounded-xl">
              <Plus className="h-3.5 w-3.5 ml-1" />
              <span>{cleanDisplayNotes ? "تعديل الملاحظات" : "إضافة ملاحظة"}</span>
            </Button>
          )
        }
      >
        {editingNotes ? (
          <div className="space-y-3">
            <Textarea
              value={standaloneNotes}
              onChange={(e) => setStandaloneNotes(e.target.value)}
              rows={3}
              className="text-xs bg-background"
              placeholder="اكتب ملاحظاتك وشروطك الإدارية هنا..."
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditingNotes(false)}>إلغاء</Button>
              <Button size="sm" onClick={handleSaveStandaloneNotes} disabled={savingNotes} className="bg-amber-600 text-white font-bold">
                {savingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" /> : null}
                <span>حفظ الملاحظة</span>
              </Button>
            </div>
          </div>
        ) : cleanDisplayNotes ? (
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{cleanDisplayNotes}</p>
        ) : (
          <EmptyState
            icon={Edit}
            text="لا توجد ملاحظات خاصة مسجلة حتى الآن"
            subtext="يمكنك تدوين الشروط الخاصة أو المواصفات الفنية أو شروط الدفع والتوريد للعملية"
          />
        )}
      </SectionCard>

      {/* ━━━ الشركات المشاركة بالعطاء ━━━ */}
      <TabCompanies op={op} />

      {/* ━━━ STEP FOOTER NAVIGATION (الانتقال للخطوة التالية بأسفل الصفحة - التسجيل 1 & 2) ━━━ */}
      <StepFooterNav
        currentTabId="overview"
        onNavigate={navigateFn}
        nextLabel="الانتقال إلى: #2 التواريخ والتنبيهات ➔"
      />
    </div>
  );
}
