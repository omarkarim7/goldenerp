"use client";

import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Archive,
  Check,
  Eye,
  Download,
  Loader2,
  ShieldCheck,
  Calendar,
  Clock,
  Wrench,
  Plus,
  Trash2,
  Star,
  FileCheck,
  Building2,
  FileText,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  Operation,
  SectionCard,
  EmptyState,
  formatCurrency,
  formatDate,
} from "./types";
import { StepFooterNav } from "./StepFooterNav";
import { FinalInsuranceRefundSection } from "./FinalInsuranceRefundSection";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   1. WARRANTY & MAINTENANCE PERIOD (فترة الضمان والصيانة)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export interface MonthlyVisit {
  id: string;
  visitNumber: number;
  visitDate: string;
  engineerName: string;
  actionsDone: string;
  clientSignatureStatus: "SIGNED" | "PENDING";
  notes?: string;
}

export function TabWarrantyAndVisits({
  op,
  onRefresh,
}: {
  op: Operation;
  onRefresh: () => void;
}) {
  const existingNotes = useMemo(() => {
    if (!op.notes) return {};
    try {
      return JSON.parse(op.notes);
    } catch {
      return {};
    }
  }, [op.notes]);

  const warrantyData = existingNotes.warrantyData || {};

  const [warrantyMonths, setWarrantyMonths] = useState(
    () => warrantyData.warrantyMonths || "12"
  );
  const [warrantyStartDate, setWarrantyStartDate] = useState(
    () => warrantyData.warrantyStartDate || new Date().toISOString().split("T")[0]
  );
  const [warrantyEndDate, setWarrantyEndDate] = useState(() => {
    if (warrantyData.warrantyEndDate) return warrantyData.warrantyEndDate;
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  });
  const [warrantyNotes, setWarrantyNotes] = useState(
    () => warrantyData.warrantyNotes || "ضمان شامل الصيانة وقطع الغيار الأصلية طبقاً للشروط التعاقدية"
  );

  // Visits State
  const [visits, setVisits] = useState<MonthlyVisit[]>(() => {
    if (warrantyData.visits && Array.isArray(warrantyData.visits) && warrantyData.visits.length > 0) {
      return warrantyData.visits;
    }
    return [
      {
        id: "1",
        visitNumber: 1,
        visitDate: new Date().toISOString().split("T")[0],
        engineerName: "م. إسلام المحمدي",
        actionsDone: "الفحص الدوري والتشغيل التجريبي ومعاينة كفاءة العمل",
        clientSignatureStatus: "SIGNED",
        notes: "تم التوقيع من المشرف الفني بالجهة ومطابقة كافة المعايير",
      },
    ];
  });

  const [addingVisit, setAddingVisit] = useState(false);
  const [newVisitDate, setNewVisitDate] = useState(new Date().toISOString().split("T")[0]);
  const [newEngineer, setNewEngineer] = useState("م. إسلام المحمدي");
  const [newActions, setNewActions] = useState("زيارة صيانة وقائية واختبار دوري للتشغيل");
  const [savingWarranty, setSavingWarranty] = useState(false);

  // Countdown Calculation
  const countdown = useMemo(() => {
    if (!warrantyEndDate) return { days: 0, expired: false };
    const diff = new Date(warrantyEndDate).getTime() - Date.now();
    if (diff <= 0) return { days: 0, expired: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return { days, expired: false };
  }, [warrantyEndDate]);

  const handleAddVisit = () => {
    const newV: MonthlyVisit = {
      id: String(Date.now()),
      visitNumber: visits.length + 1,
      visitDate: newVisitDate,
      engineerName: newEngineer,
      actionsDone: newActions,
      clientSignatureStatus: "SIGNED",
    };
    setVisits([...visits, newV]);
    setAddingVisit(false);
    toast.success("تم تسجيل الزيارة الشهرية بنجاح 🛠️✓");
  };

  const handleRemoveVisit = (id: string) => {
    setVisits(visits.filter((v) => v.id !== id));
  };

  const handleSaveWarrantyData = async () => {
    setSavingWarranty(true);
    try {
      const updatedNotes = {
        ...existingNotes,
        warrantyData: {
          warrantyMonths: Number(warrantyMonths),
          warrantyStartDate,
          warrantyEndDate,
          warrantyNotes,
          visits,
          updatedAt: new Date().toISOString(),
        },
      };

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(updatedNotes),
      });

      toast.success("تم حفظ بيانات الضمان والزيارات الشهرية بنجاح! 🛡️✨");
      onRefresh();
    } catch {
      toast.error("فشل حفظ بيانات الضمان");
    } finally {
      setSavingWarranty(false);
    }
  };

  return (
    <SectionCard
      title="فترة الضمان والصيانة وسجل الزيارات الدورية"
      icon={Wrench}
      iconColor="text-amber-600"
      badge={
        <Badge
          className={
            countdown.expired
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold"
              : "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs font-bold"
          }
        >
          {countdown.expired ? "انتهت فترة الضمان بنجاح ✓" : `الضمان ساري — متبقي ${countdown.days} يوم`}
        </Badge>
      }
      actions={
        <Button
          size="sm"
          onClick={() => setAddingVisit(!addingVisit)}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 rounded-xl cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 ml-1" />
          <span>تسجيل زيارة صيانة شهرية</span>
        </Button>
      }
    >
      {/* Warranty Period Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-4 rounded-2xl bg-muted/30 border border-border">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">مدة الضمان التعاقدية (بالشهور) *</Label>
          <Input
            type="number"
            value={warrantyMonths}
            onChange={(e) => {
              setWarrantyMonths(e.target.value);
              const m = Number(e.target.value) || 12;
              const start = new Date(warrantyStartDate);
              start.setMonth(start.getMonth() + m);
              setWarrantyEndDate(start.toISOString().split("T")[0]);
            }}
            className="h-9 text-xs font-mono font-bold rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold">تاريخ بدء سريان الضمان *</Label>
          <Input
            type="date"
            value={warrantyStartDate}
            onChange={(e) => setWarrantyStartDate(e.target.value)}
            className="h-9 text-xs font-medium rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold">تاريخ انتهاء فترة الضمان *</Label>
          <Input
            type="date"
            value={warrantyEndDate}
            onChange={(e) => setWarrantyEndDate(e.target.value)}
            className="h-9 text-xs font-mono font-bold rounded-xl"
          />
        </div>
      </div>

      {/* Monthly Visits Tracker */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span>سجل الزيارات الشهرية المنفذة خلال فترة الضمان ({visits.length} زيارات):</span>
          </h4>
        </div>

        {addingVisit && (
          <div className="p-4 rounded-xl bg-card border-2 border-amber-500/40 space-y-3 animate-fade-in shadow-md">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">تاريخ الزيارة</Label>
                <Input
                  type="date"
                  value={newVisitDate}
                  onChange={(e) => setNewVisitDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">المهندس / الفني القائم بالزيارة</Label>
                <Input
                  value={newEngineer}
                  onChange={(e) => setNewEngineer(e.target.value)}
                  className="h-9 text-xs font-bold"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">الأعمال المنفذة والفحص الدوري</Label>
              <Input
                value={newActions}
                onChange={(e) => setNewActions(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddingVisit(false)}
                className="rounded-xl"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={handleAddVisit}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold"
              >
                إضافة الزيارة
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          {visits.map((v) => (
            <div
              key={v.id}
              className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold font-mono">
                  #{v.visitNumber}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{v.actionsDone}</span>
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px]">
                      موقع ومعتمد ✓
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-[11px] mt-0.5">
                    القائم بالزيارة: {v.engineerName} • التاريخ: {formatDate(v.visitDate)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveVisit(v.id)}
                className="text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg cursor-pointer"
                title="حذف"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <Button
            size="sm"
            onClick={handleSaveWarrantyData}
            disabled={savingWarranty}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer"
          >
            {savingWarranty ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Check className="h-4 w-4 ml-1" />}
            <span>حفظ بيانات الضمان والزيارات</span>
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   2. FINAL HANDOVER CERTIFICATE (محضر الاستلام النهائي)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function TabFinalHandover({ op, onRefresh }: { op: Operation; onRefresh: () => void }) {
  const existingNotes = useMemo(() => {
    if (!op.notes) return {};
    try {
      return JSON.parse(op.notes);
    } catch {
      return {};
    }
  }, [op.notes]);

  const handoverData = existingNotes.finalHandoverData || {};

  const [handoverNumber, setHandoverNumber] = useState(
    () => handoverData.handoverNumber || `FINAL-HO-${op.serialNumber || "1"}`
  );
  const [handoverDate, setHandoverDate] = useState(
    () => handoverData.handoverDate || new Date().toISOString().split("T")[0]
  );
  const [committeeDecision, setCommitteeDecision] = useState(
    () => handoverData.committeeDecision || "اجتياز فترة الضمان بنجاح تام وتوصية بصرف كافة المستحقات ورد التأمين النهائي"
  );
  const [isHandoverApproved, setIsHandoverApproved] = useState(
    () => handoverData.isHandoverApproved ?? true
  );
  const [savingHandover, setSavingHandover] = useState(false);

  const handleSaveHandover = async () => {
    setSavingHandover(true);
    try {
      const updatedNotes = {
        ...existingNotes,
        finalHandoverData: {
          handoverNumber,
          handoverDate,
          committeeDecision,
          isHandoverApproved,
          updatedAt: new Date().toISOString(),
        },
      };

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(updatedNotes),
      });

      toast.success("تم اعتماد وتوثيق محضر الاستلام النهائي بنجاح! 📜✓");
      onRefresh();
    } catch {
      toast.error("فشل حفظ محضر الاستلام النهائي");
    } finally {
      setSavingHandover(false);
    }
  };

  return (
    <SectionCard
      title="محضر الاستلام النهائي بعد انتهاء فترة الضمان"
      icon={FileCheck}
      iconColor="text-emerald-600"
      badge={
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold">
          {isHandoverApproved ? "تم اعتماد الاستلام النهائي بنجاح ✓" : "قيد المراجعة"}
        </Badge>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">رقم محضر الاستلام النهائي *</Label>
          <Input
            value={handoverNumber}
            onChange={(e) => setHandoverNumber(e.target.value)}
            className="h-9.5 text-xs font-mono font-bold rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold">تاريخ توقيع محضر الاستلام النهائي *</Label>
          <Input
            type="date"
            value={handoverDate}
            onChange={(e) => setHandoverDate(e.target.value)}
            className="h-9.5 text-xs font-medium rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-1.5 pt-1">
        <Label className="text-xs font-bold">قرار وتوصية لجنة الفحص والاستلام النهائي</Label>
        <Textarea
          rows={2}
          value={committeeDecision}
          onChange={(e) => setCommitteeDecision(e.target.value)}
          className="text-xs rounded-xl"
        />
      </div>

      <div className="flex justify-end pt-2 border-t border-border">
        <Button
          size="sm"
          onClick={handleSaveHandover}
          disabled={savingHandover}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer"
        >
          {savingHandover ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Check className="h-4 w-4 ml-1" />}
          <span>توثيق محضر الاستلام النهائي 📜</span>
        </Button>
      </div>
    </SectionCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   3. RECOVERY TAB (استرداد التأمين النهائي + فتح الخطاب الرسمي)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function TabRecovery({ op, onRefresh }: { op: Operation; onRefresh: () => void }) {
  const finalG = op.guarantees?.find((g: any) => g.type === "FINAL");
  const [actingStep, setActingStep] = useState<number | null>(null);
  const [actionDate, setActionDate] = useState(new Date().toISOString().split("T")[0]);
  const [deliveredTo, setDeliveredTo] = useState("الإدارة المالية - الحسابات المركزية");
  const [saving, setSaving] = useState(false);
  const [showRefundSection, setShowRefundSection] = useState(false);

  const steps = [
    {
      num: 1,
      title: "1. خطاب طلب الاسترداد المعتمد",
      desc: "تجهيز وتقديم طلب استرداد التأمين النهائي موجه للجهة مع شهادة الاستلام النهائي",
      dateKey: "recoveryLetterDate",
      done: !!finalG?.recoveryLetterDate,
    },
    {
      num: 2,
      title: "2. صدور أمر الدفع",
      desc: "موافقة الجهة الإدارية وإصدار أمر الدفع أو خطاب الإفراج البنكي عن التأمين",
      dateKey: "paymentOrderDate",
      done: !!finalG?.paymentOrderDate,
    },
    {
      num: 3,
      title: "3. الاسترداد الفعلي للمبلغ",
      desc: "دخول المبلغ فعلياً لحساب الشركة بالبنك أو استلام الشيك وتسجيل المستلم",
      dateKey: "actualRecoveryDate",
      done: !!finalG?.actualRecoveryDate,
    },
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
      toast.success(
        stepNum === 3
          ? "تم تأكيد الاسترداد الفعلي للتأمين وإغلاق الملف! 🟢"
          : "تم تسجيل المرحلة بنجاح ✓"
      );
      setActingStep(null);
      onRefresh();
    } catch {
      toast.error("فشل تسجيل مرحلة الاسترداد");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="استرداد التأمين النهائي والإفراج عن الضمانات الرسمية"
      icon={RefreshCw}
      iconColor="text-blue-600"
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowRefundSection(!showRefundSection)}
          className="border-blue-500/40 text-blue-600 hover:bg-blue-50 text-xs font-bold h-8 rounded-xl cursor-pointer"
        >
          <FileText className="h-3.5 w-3.5 ml-1" />
          <span>{showRefundSection ? "إخفاء نموذج الخطاب" : "فتح نموذج خطاب استرداد التأمين المعتمد"}</span>
        </Button>
      }
    >
      {/* Embedded Final Insurance Refund Letter Section if toggled */}
      {showRefundSection && (
        <div className="p-2 border border-blue-500/30 rounded-2xl bg-card animate-fade-in mb-4">
          <FinalInsuranceRefundSection
            op={op}
            onRefresh={onRefresh}
            onClose={() => setShowRefundSection(false)}
          />
        </div>
      )}

      {finalG ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs text-muted-foreground block">قيمة التأمين النهائي المستحق للاسترداد</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatCurrency(Number(finalG.amount))}
              </span>
            </div>
            <Badge
              className={
                finalG.isRecovered
                  ? "badge-emerald"
                  : finalG.status === "RECOVERY_REQUESTED"
                  ? "badge-blue"
                  : "badge-amber"
              }
            >
              {finalG.isRecovered
                ? "تم الاسترداد بالكامل ✓"
                : finalG.status === "RECOVERY_REQUESTED"
                ? "قيد إجراءات الاسترداد"
                : "ساري — لم يبدأ الاسترداد"}
            </Badge>
          </div>

          {/* Stepper Display */}
          <div className="space-y-3">
            {steps.map((st) => (
              <div
                key={st.num}
                className={`p-4 rounded-xl border transition-all ${
                  st.done ? "bg-emerald-500/5 border-emerald-500/30" : "bg-card border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        st.done ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {st.done ? <Check className="h-4 w-4" /> : st.num}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{st.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{st.desc}</p>
                      {st.done && finalG[st.dateKey] && (
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                          تاريخ التنفيذ: {formatDate(finalG[st.dateKey])}
                        </p>
                      )}
                    </div>
                  </div>

                  {!st.done && (
                    <Button
                      size="sm"
                      onClick={() => setActingStep(actingStep === st.num ? null : st.num)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 rounded-xl font-bold"
                    >
                      تسجيل الإجراء
                    </Button>
                  )}
                </div>

                {actingStep === st.num && (
                  <div className="mt-3 pt-3 border-t border-border space-y-3 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">تاريخ الإجراء</Label>
                        <Input
                          type="date"
                          value={actionDate}
                          onChange={(e) => setActionDate(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                      {st.num === 3 && (
                        <div className="space-y-1">
                          <Label className="text-xs">تم التسليم / الإيداع إلى</Label>
                          <Input
                            value={deliveredTo}
                            onChange={(e) => setDeliveredTo(e.target.value)}
                            className="h-9 text-xs font-bold"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActingStep(null)}
                        className="h-8 text-xs rounded-xl"
                      >
                        إلغاء
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleExecuteStep(st.num)}
                        disabled={saving}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs rounded-xl font-bold"
                      >
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
        <EmptyState
          icon={RefreshCw}
          text="لا يوجد تأمين نهائي مسجل للاسترداد"
          subtext="سجّل التأمين النهائي أولاً في تبويب التأمين النهائي بمجرد صدور أمر التوريد"
        />
      )}
    </SectionCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   4. SUPPLIER PERFORMANCE EVALUATION (تقييم أداء المورد)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function TabSupplierEvaluation({ op, onRefresh }: { op: Operation; onRefresh: () => void }) {
  const existingNotes = useMemo(() => {
    if (!op.notes) return {};
    try {
      return JSON.parse(op.notes);
    } catch {
      return {};
    }
  }, [op.notes]);

  const evalData = existingNotes.supplierEvaluation || {};

  const [deliverySpeed, setDeliverySpeed] = useState(evalData.deliverySpeed || 5);
  const [qualityMatch, setQualityMatch] = useState(evalData.qualityMatch || 5);
  const [communication, setCommunication] = useState(evalData.communication || 5);
  const [evaluationNotes, setEvaluationNotes] = useState(
    evalData.evaluationNotes || "التزام تام بالجدول الزمني والمواصفات المعتمدة بدون أي غرامات تأخير"
  );
  const [savingEval, setSavingEval] = useState(false);

  const overallScore = useMemo(() => {
    return ((deliverySpeed + qualityMatch + communication) / 3).toFixed(1);
  }, [deliverySpeed, qualityMatch, communication]);

  const handleSaveEval = async () => {
    setSavingEval(true);
    try {
      const updatedNotes = {
        ...existingNotes,
        supplierEvaluation: {
          deliverySpeed,
          qualityMatch,
          communication,
          overallScore: Number(overallScore),
          evaluationNotes,
          updatedAt: new Date().toISOString(),
        },
      };

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(updatedNotes),
      });

      toast.success("تم حفظ وتوثيق تقييم أداء المورد بنجاح! ⭐✓");
      onRefresh();
    } catch {
      toast.error("فشل حفظ التقييم");
    } finally {
      setSavingEval(false);
    }
  };

  return (
    <SectionCard
      title="تقييم أداء المورد وسجل الجودة للمناقصات المستقبلية"
      icon={Star}
      iconColor="text-amber-500"
      badge={
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-bold font-mono">
          التقييم العام: {overallScore} / 5 ⭐
        </Badge>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-3.5 rounded-xl bg-card border border-border space-y-2 text-center">
          <Label className="text-xs font-bold text-foreground block">سرعة التوريد والالتزام بالموعد</Label>
          <div className="flex justify-center gap-1 text-amber-500">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setDeliverySpeed(star)}
                className="cursor-pointer"
              >
                <Star
                  className={`h-5 w-5 ${
                    star <= deliverySpeed ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40"
                  }`}
                />
              </button>
            ))}
          </div>
          <span className="text-xs font-mono font-bold text-muted-foreground block">{deliverySpeed} من 5</span>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border space-y-2 text-center">
          <Label className="text-xs font-bold text-foreground block">جودة المواد والمطابقة للمواصفات</Label>
          <div className="flex justify-center gap-1 text-amber-500">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setQualityMatch(star)}
                className="cursor-pointer"
              >
                <Star
                  className={`h-5 w-5 ${
                    star <= qualityMatch ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40"
                  }`}
                />
              </button>
            ))}
          </div>
          <span className="text-xs font-mono font-bold text-muted-foreground block">{qualityMatch} من 5</span>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border space-y-2 text-center">
          <Label className="text-xs font-bold text-foreground block">خدمة ما بعد البيع والدعم الفني</Label>
          <div className="flex justify-center gap-1 text-amber-500">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setCommunication(star)}
                className="cursor-pointer"
              >
                <Star
                  className={`h-5 w-5 ${
                    star <= communication ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40"
                  }`}
                />
              </button>
            ))}
          </div>
          <span className="text-xs font-mono font-bold text-muted-foreground block">{communication} من 5</span>
        </div>
      </div>

      <div className="space-y-1.5 pt-2">
        <Label className="text-xs font-bold">تقرير التقييم العام وسجل الأداء</Label>
        <Input
          value={evaluationNotes}
          onChange={(e) => setEvaluationNotes(e.target.value)}
          className="h-9.5 text-xs rounded-xl"
        />
      </div>

      <div className="flex justify-end pt-2 border-t border-border">
        <Button
          size="sm"
          onClick={handleSaveEval}
          disabled={savingEval}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer"
        >
          {savingEval ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Check className="h-4 w-4 ml-1" />}
          <span>حفظ تقييم الأداء ⭐</span>
        </Button>
      </div>
    </SectionCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   5. ARCHIVE TAB (الأرشيف الرقمي الشامل)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function TabArchive({
  op,
  onPreviewDoc,
  onDownloadDoc,
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

  const filtered = filterCategory === "ALL" ? allDocs : allDocs.filter((d) => d.category === filterCategory);

  return (
    <SectionCard
      title="أرشيف العملية الرقمي الشامل"
      icon={Archive}
      iconColor="text-blue-600"
      badge={<Badge className="bg-muted text-foreground border-border text-[10px] font-bold">{allDocs.length} مستند محفوظ</Badge>}
    >
      <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-foreground mb-3">
        <p>
          <strong>فهرسة المستندات الرقمية:</strong> تُحفظ جميع المستندات الرقمية تلقائياً وفق النسق:{" "}
          <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">نوع_المستند_رقم_العملية_التاريخ.pdf</span>
        </p>
      </div>

      {bookletDoc && (
        <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-transparent border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center font-bold text-xs shrink-0">
              PDF
            </div>
            <div>
              <h4 className="font-bold text-foreground text-sm">{bookletDoc.fileName}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">كراسة الشروط الرسمية للعملية</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => onPreviewDoc?.(bookletDoc)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 rounded-xl cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5 ml-1" />
              <span>معاينة</span>
            </Button>
            <Button
              size="sm"
              onClick={() => onDownloadDoc?.(bookletDoc)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 px-3 rounded-xl cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 ml-1" />
              <span>تحميل</span>
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
        <div className="space-y-2">
          {filtered.map((doc: any) => (
            <div
              key={doc.id}
              className="p-3 rounded-xl bg-card border border-border flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className="font-bold text-foreground font-mono truncate">{doc.fileName}</span>
                <Badge className="bg-muted text-[10px] text-muted-foreground shrink-0">{doc.category}</Badge>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  onClick={() => onPreviewDoc?.(doc)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-7.5 px-2.5 rounded-lg cursor-pointer"
                >
                  <Eye className="h-3 w-3 ml-1" />
                  <span>معاينة</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDownloadDoc?.(doc)}
                  className="border-border text-xs h-7.5 px-2.5 rounded-lg cursor-pointer"
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Archive} text="لا توجد مستندات في هذا التصنيف" />
      )}
    </SectionCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   6. MAIN TAB CLOSE COMPONENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function TabClose({
  op,
  onRefresh,
  onNavigate,
  onPreviewDoc,
  onDownloadDoc,
}: {
  op: Operation;
  onRefresh: () => void;
  onNavigate?: (tabId: string) => void;
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
    <div className="space-y-6 animate-fade-in text-foreground">
      {/* 1. فترة الضمان والزيارات الشهرية للصيانة */}
      <TabWarrantyAndVisits op={op} onRefresh={onRefresh} />

      {/* 2. محضر الاستلام النهائي */}
      <TabFinalHandover op={op} onRefresh={onRefresh} />

      {/* 3. استرداد التأمين النهائي والإفراج عن الضمانات */}
      <TabRecovery op={op} onRefresh={onRefresh} />

      {/* 4. تقييم أداء المورد وسجل الجودة */}
      <TabSupplierEvaluation op={op} onRefresh={onRefresh} />

      {/* 5. الأرشيف الرقمي الشامل للعملية */}
      <TabArchive op={op} onPreviewDoc={onPreviewDoc} onDownloadDoc={onDownloadDoc} />

      {/* 6. إغلاق العملية واستيفاء كافة الالتزامات */}
      <SectionCard
        title="تأكيد إغلاق العملية والأرشفة النهائية"
        icon={CheckCircle2}
        iconColor="text-emerald-600"
      >
        {isClosed ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-black text-foreground">العملية مغلقة رسمياً ومؤرشفة بالكامل ✓</h3>
            <p className="text-xs text-muted-foreground">
              تم الانتهاء من جميع مراحل التوريد والتحصيل المالي واسترداد التأمينات وأرشفة الملفات بنجاح.
            </p>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-foreground">تأكيد إغلاق العملية نهائياً</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                تأكد من إتمام التوريد بنسبة 100%، وتحصيل جميع المستخلصات، واسترداد خطابات الضمان والتأمينات قبل الإغلاق.
              </p>
            </div>
            <Button
              onClick={handleClose}
              disabled={closing}
              className="bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg cursor-pointer"
            >
              {closing ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 ml-2" />
              )}
              <span>تأكيد إغلاق العملية نهائياً</span>
            </Button>
          </div>
        )}
      </SectionCard>

      {/* Continuity Action Footer */}
      <StepFooterNav currentTabId="close" onNavigate={onNavigate} />
    </div>
  );
}
