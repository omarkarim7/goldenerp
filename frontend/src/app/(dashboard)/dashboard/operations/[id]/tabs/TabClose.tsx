"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Archive,
  Check,
  Eye,
  Edit,
  X,
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
  Upload,
  Paperclip,
  CreditCard,
  ExternalLink,
  ShieldAlert,
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
import { SmartArabicDatePicker } from "@/components/ui/arabic-date-picker";

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

export interface WarrantyCardRecord {
  id: string;
  title: string;
  warrantyMonths: number;
  startDate: string;
  endDate: string;
  visitsCount: number;
  visits: MonthlyVisit[];
  status: "ACTIVE" | "EXPIRED";
  notes?: string;
  createdAt: string;
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

  // Warranty Saved Cards List State
  const [warrantyCards, setWarrantyCards] = useState<WarrantyCardRecord[]>(() => {
    if (existingNotes.warrantyCardsList && Array.isArray(existingNotes.warrantyCardsList)) {
      return existingNotes.warrantyCardsList;
    }
    if (warrantyData.warrantyMonths || warrantyData.warrantyStartDate) {
      const isExp = warrantyData.warrantyEndDate && new Date(warrantyData.warrantyEndDate).getTime() <= Date.now();
      return [
        {
          id: "w-card-1",
          title: `وثيقة وسجل فترة الضمان والصيانة التعاقدية (${warrantyData.warrantyMonths || 12} شهر)`,
          warrantyMonths: Number(warrantyData.warrantyMonths) || 12,
          startDate: warrantyData.warrantyStartDate || new Date().toISOString().split("T")[0],
          endDate: warrantyData.warrantyEndDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split("T")[0],
          visitsCount: (warrantyData.visits || []).length || 1,
          visits: warrantyData.visits || [
            {
              id: "1",
              visitNumber: 1,
              visitDate: new Date().toISOString().split("T")[0],
              engineerName: "م. إسلام المحمدي",
              actionsDone: "الفحص الدوري والتشغيل التجريبي ومعاينة كفاءة العمل",
              clientSignatureStatus: "SIGNED",
              notes: "تم التوقيع من المشرف الفني بالجهة ومطابقة كافة المعايير",
            },
          ],
          status: isExp ? "EXPIRED" : "ACTIVE",
          notes: warrantyData.warrantyNotes || "ضمان شامل الصيانة وقطع الغيار الأصلية طبقاً للشروط التعاقدية",
          createdAt: new Date().toISOString(),
        },
      ];
    }
    return [];
  });

  const [viewingWarrantyCard, setViewingWarrantyCard] = useState<WarrantyCardRecord | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

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
      const cardId = editingCardId || `w-card-${Date.now()}`;
      const newCard: WarrantyCardRecord = {
        id: cardId,
        title: `وثيقة وسجل فترة الضمان والصيانة التعاقدية (${warrantyMonths} شهر)`,
        warrantyMonths: Number(warrantyMonths),
        startDate: warrantyStartDate,
        endDate: warrantyEndDate,
        visitsCount: visits.length,
        visits,
        status: countdown.expired ? "EXPIRED" : "ACTIVE",
        notes: warrantyNotes,
        createdAt: new Date().toISOString(),
      };

      const updatedCards = editingCardId
        ? warrantyCards.map((c) => (c.id === editingCardId ? newCard : c))
        : [newCard, ...warrantyCards.filter((c) => c.id !== cardId)];

      setWarrantyCards(updatedCards);
      setEditingCardId(null);

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
        warrantyCardsList: updatedCards,
      };

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(updatedNotes),
      });

      toast.success("تم حفظ وتوثيق بطاقة الضمان والزيارات بنجاح! 🛡️✨");
      onRefresh();
    } catch {
      toast.error("فشل حفظ بيانات الضمان");
    } finally {
      setSavingWarranty(false);
    }
  };

  const handleDeleteWarrantyCard = async (card: WarrantyCardRecord) => {
    if (!confirm(`هل أنت متأكد من حذف بطاقة "${card.title}"؟`)) return;
    try {
      const updated = warrantyCards.filter((c) => c.id !== card.id);
      setWarrantyCards(updated);
      const updatedNotes = {
        ...existingNotes,
        warrantyCardsList: updated,
      };
      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(updatedNotes),
      });
      toast.success("تم حذف بطاقة الضمان بنجاح! 🗑️");
      onRefresh();
    } catch {
      toast.error("فشل حذف بطاقة الضمان");
    }
  };

  const handleEditWarrantyCard = (card: WarrantyCardRecord) => {
    setEditingCardId(card.id);
    setWarrantyMonths(String(card.warrantyMonths));
    setWarrantyStartDate(card.startDate);
    setWarrantyEndDate(card.endDate);
    setVisits(card.visits || []);
    if (card.notes) setWarrantyNotes(card.notes);
    toast.info("تم تحميل بيانات البطاقة في النموذج للتعديل ✏️");
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
          <SmartArabicDatePicker
            label="تاريخ بدء سريان الضمان"
            required
            value={warrantyStartDate}
            onChange={(val) => setWarrantyStartDate(val)}
            outputFormat="iso"
          />
        </div>

        <div className="space-y-1.5">
          <SmartArabicDatePicker
            label="تاريخ انتهاء فترة الضمان"
            required
            value={warrantyEndDate}
            onChange={(val) => setWarrantyEndDate(val)}
            outputFormat="iso"
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
                <SmartArabicDatePicker
                  label="تاريخ الزيارة"
                  value={newVisitDate}
                  onChange={(val) => setNewVisitDate(val)}
                  outputFormat="iso"
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

        {/* ━━━ بطاقات وسجلات الضمان المعتمدة المسجلة ━━━ */}
        {warrantyCards.length > 0 && (
          <div className="pt-5 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
                <span>سجلات وبطاقات الضمان والصيانة الدورية المعتمدة ({warrantyCards.length} بطاقات):</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {warrantyCards.map((card) => {
                const isCardExpired = card.status === "EXPIRED" || new Date(card.endDate).getTime() <= Date.now();
                return (
                  <div
                    key={card.id}
                    className="p-4 rounded-2xl bg-card border border-amber-500/30 hover:border-amber-500/60 transition-all duration-200 shadow-sm space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[11px] font-bold flex items-center gap-1">
                          <Wrench className="h-3 w-3" />
                          <span>ضمان تعاقدي ({card.warrantyMonths} شهر)</span>
                        </Badge>
                        <Badge
                          className={`text-[10px] font-bold ${
                            isCardExpired
                              ? "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30"
                              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          }`}
                        >
                          {isCardExpired ? "انتهت فترة الضمان" : "ساري ومعتمد ✓"}
                        </Badge>
                      </div>

                      <h4 className="font-black text-foreground text-sm leading-tight">
                        {card.title}
                      </h4>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1">
                        <div>
                          <span className="block font-medium">تاريخ البدء:</span>
                          <span className="font-mono font-bold text-foreground">{formatDate(card.startDate)}</span>
                        </div>
                        <div>
                          <span className="block font-medium">تاريخ الانتهاء:</span>
                          <span className="font-mono font-bold text-foreground">{formatDate(card.endDate)}</span>
                        </div>
                        <div className="col-span-2 flex items-center gap-1.5 pt-1 border-t border-border/50">
                          <Clock className="h-3.5 w-3.5 text-blue-600" />
                          <span className="text-foreground font-semibold">
                            تم توثيق {card.visitsCount || card.visits?.length || 0} زيارات دورية معتمدة
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewingWarrantyCard(card)}
                        className="h-8 px-3 rounded-xl border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        title="معاينة تفاصيل سجل الضمان والزيارات"
                      >
                        <Eye className="h-3.5 w-3.5 text-amber-600" />
                        <span>عرض</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditWarrantyCard(card)}
                        className="h-8 px-3 rounded-xl border-blue-500/40 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        title="تعديل بيانات الضمان"
                      >
                        <Edit className="h-3.5 w-3.5 text-blue-600" />
                        <span>تعديل</span>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteWarrantyCard(card)}
                        className="h-8 w-8 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="حذف البطاقة"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ━━━ MODAL: معاينة تفاصيل بطاقة الضمان والصيانة ━━━ */}
      {viewingWarrantyCard && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-card text-card-foreground border border-border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold text-sm">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-foreground">
                    تفاصيل وثيقة الضمان والصيانة
                  </h3>
                  <span className="text-[11px] text-muted-foreground">
                    المدة: {viewingWarrantyCard.warrantyMonths} شهر تعاقدي
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingWarrantyCard(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground block font-medium">تاريخ بدء الضمان:</span>
                  <span className="font-mono font-bold text-foreground text-sm">
                    {formatDate(viewingWarrantyCard.startDate)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">تاريخ انتهاء الضمان:</span>
                  <span className="font-mono font-bold text-foreground text-sm">
                    {formatDate(viewingWarrantyCard.endDate)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-600" />
                  <span>الزيارات الدورية المعتمدة خلال فترة الضمان ({viewingWarrantyCard.visits?.length || 0}):</span>
                </h5>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(viewingWarrantyCard.visits || []).map((v) => (
                    <div key={v.id} className="p-2.5 rounded-xl bg-muted/40 border border-border text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">
                          #{v.visitNumber} - {v.actionsDone}
                        </span>
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px]">
                          معتمد ✓
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                        <span>القائم بالزيارة: {v.engineerName}</span>
                        <span>{formatDate(v.visitDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {viewingWarrantyCard.notes && (
                <div className="p-3 rounded-xl bg-muted/30 border border-border text-xs">
                  <span className="font-bold text-foreground block mb-0.5">ملاحظات وشروط الضمان:</span>
                  <p className="text-muted-foreground leading-relaxed">{viewingWarrantyCard.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingWarrantyCard(null)}
                className="rounded-xl px-4 text-xs cursor-pointer"
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   2. FINAL HANDOVER CERTIFICATE (محضر الاستلام النهائي)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export interface HandoverCardRecord {
  id: string;
  handoverNumber: string;
  handoverDate: string;
  committeeDecision: string;
  isHandoverApproved: boolean;
  createdAt: string;
}

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

  // Handover Cards State
  const [handoverCards, setHandoverCards] = useState<HandoverCardRecord[]>(() => {
    if (existingNotes.finalHandoverCardsList && Array.isArray(existingNotes.finalHandoverCardsList)) {
      return existingNotes.finalHandoverCardsList;
    }
    if (handoverData.handoverNumber) {
      return [
        {
          id: "ho-card-1",
          handoverNumber: handoverData.handoverNumber,
          handoverDate: handoverData.handoverDate || new Date().toISOString().split("T")[0],
          committeeDecision: handoverData.committeeDecision || "اجتياز فترة الضمان بنجاح تام وتوصية بصرف كافة المستحقات ورد التأمين النهائي",
          isHandoverApproved: handoverData.isHandoverApproved ?? true,
          createdAt: new Date().toISOString(),
        },
      ];
    }
    return [];
  });

  const [viewingHandoverCard, setViewingHandoverCard] = useState<HandoverCardRecord | null>(null);
  const [editingHoId, setEditingHoId] = useState<string | null>(null);

  const handleSaveHandover = async () => {
    setSavingHandover(true);
    try {
      const cardId = editingHoId || `ho-card-${Date.now()}`;
      const newCard: HandoverCardRecord = {
        id: cardId,
        handoverNumber,
        handoverDate,
        committeeDecision,
        isHandoverApproved,
        createdAt: new Date().toISOString(),
      };

      const updatedCards = editingHoId
        ? handoverCards.map((c) => (c.id === editingHoId ? newCard : c))
        : [newCard, ...handoverCards.filter((c) => c.id !== cardId)];

      setHandoverCards(updatedCards);
      setEditingHoId(null);

      const updatedNotes = {
        ...existingNotes,
        finalHandoverData: {
          handoverNumber,
          handoverDate,
          committeeDecision,
          isHandoverApproved,
          updatedAt: new Date().toISOString(),
        },
        finalHandoverCardsList: updatedCards,
      };

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(updatedNotes),
      });

      toast.success("تم توثيق وحفظ بطاقة محضر الاستلام النهائي بنجاح! 📜✨");
      onRefresh();
    } catch {
      toast.error("فشل حفظ محضر الاستلام النهائي");
    } finally {
      setSavingHandover(false);
    }
  };

  const handleDeleteHandoverCard = async (card: HandoverCardRecord) => {
    if (!confirm(`هل أنت متأكد من حذف محضر الاستلام النهائي رقم (${card.handoverNumber})؟`)) return;
    try {
      const updated = handoverCards.filter((c) => c.id !== card.id);
      setHandoverCards(updated);
      const updatedNotes = {
        ...existingNotes,
        finalHandoverCardsList: updated,
      };
      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(updatedNotes),
      });
      toast.success("تم حذف بطاقة محضر الاستلام النهائي بنجاح! 🗑️");
      onRefresh();
    } catch {
      toast.error("فشل حذف البطاقة");
    }
  };

  const handleEditHandoverCard = (card: HandoverCardRecord) => {
    setEditingHoId(card.id);
    setHandoverNumber(card.handoverNumber);
    setHandoverDate(card.handoverDate);
    setCommitteeDecision(card.committeeDecision);
    setIsHandoverApproved(card.isHandoverApproved);
    toast.info("تم تحميل بيانات محضر الاستلام في النموذج للتعديل ✏️");
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
          <SmartArabicDatePicker
            label="تاريخ توقيع محضر الاستلام النهائي"
            required
            value={handoverDate}
            onChange={(val) => setHandoverDate(val)}
            outputFormat="iso"
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

      {/* ━━━ بطاقات محاضر الاستلام النهائي المعتمدة ━━━ */}
      {handoverCards.length > 0 && (
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FileCheck className="h-4 w-4 text-emerald-600" />
              <span>بطاقات محاضر الاستلام النهائي المعتمدة ({handoverCards.length}):</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {handoverCards.map((card) => (
              <div
                key={card.id}
                className="p-4 rounded-2xl bg-card border border-emerald-500/30 hover:border-emerald-500/60 transition-all duration-200 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[11px] font-bold flex items-center gap-1">
                      <FileCheck className="h-3 w-3" />
                      <span>محضر استلام نهائي رسمي</span>
                    </Badge>
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                      {card.isHandoverApproved ? "معتمد رسمياً ✓" : "قيد المراجعة"}
                    </Badge>
                  </div>

                  <div>
                    <span className="font-mono font-black text-sm text-foreground block">
                      رقم المحضر: {card.handoverNumber}
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      تاريخ التوقيع: {formatDate(card.handoverDate)}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/30 p-2 rounded-xl">
                    {card.committeeDecision}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewingHandoverCard(card)}
                    className="h-8 px-3 rounded-xl border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    title="معاينة تفاصيل المحضر"
                  >
                    <Eye className="h-3.5 w-3.5 text-emerald-600" />
                    <span>عرض</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditHandoverCard(card)}
                    className="h-8 px-3 rounded-xl border-blue-500/40 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    title="تعديل المحضر"
                  >
                    <Edit className="h-3.5 w-3.5 text-blue-600" />
                    <span>تعديل</span>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteHandoverCard(card)}
                    className="h-8 w-8 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    title="حذف المحضر"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ━━━ MODAL: معاينة تفاصيل محضر الاستلام النهائي ━━━ */}
      {viewingHandoverCard && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-card text-card-foreground border border-border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold text-sm">
                  <FileCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-foreground">
                    تفاصيل محضر الاستلام النهائي
                  </h3>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {viewingHandoverCard.handoverNumber}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingHandoverCard(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground block font-medium">تاريخ الاعتماد والتوقيع:</span>
                  <span className="font-mono font-bold text-foreground text-sm">
                    {formatDate(viewingHandoverCard.handoverDate)}
                  </span>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                  {viewingHandoverCard.isHandoverApproved ? "معتمد وموثق رسمياً ✓" : "قيد المراجعة"}
                </Badge>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-2xl bg-muted/40 border border-border">
                <span className="font-bold text-foreground block">قرار وتوصية لجنة الفحص والاستلام النهائي:</span>
                <p className="text-foreground leading-relaxed font-semibold">
                  {viewingHandoverCard.committeeDecision}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingHandoverCard(null)}
                className="rounded-xl px-4 text-xs cursor-pointer"
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   3. RECOVERY TAB (استرداد التأمين النهائي + بطاقات الاسترداد المعتمدة)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export interface RefundCardRecord {
  id: string;
  registrationNumber?: string;
  refundAmount: number;
  paymentMethod: "DEDUCTION" | "CASH_RECEIPT";
  receiptNumber?: string;
  receiptDate?: string;
  deductionOperationName?: string;
  deductionMonth?: string;
  deductionYear?: string;
  tenderMethod?: string;
  operationScope?: string;
  fiscalYear?: string;
  technicalOpeningDate?: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankBranch?: string;
  accountHolderName?: string;
  status: "APPROVED" | "PENDING" | "RECOVERED";
  isArchived?: boolean;
  version?: number;
  versionName?: string;
  docId?: string;
  createdAt: string;
}

export function TabRecovery({
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
  const finalG = op.guarantees?.find((g: any) => g.type === "FINAL");
  const [actingStep, setActingStep] = useState<number | null>(null);
  const [actionDate, setActionDate] = useState(new Date().toISOString().split("T")[0]);
  const [deliveredTo, setDeliveredTo] = useState("الإدارة المالية - الحسابات المركزية");
  const [saving, setSaving] = useState(false);
  const [showRefundSection, setShowRefundSection] = useState(false);

  const existingNotes = useMemo(() => {
    if (!op.notes) return {};
    try {
      return JSON.parse(op.notes);
    } catch {
      return {};
    }
  }, [op.notes]);

  // بطاقات طلب واسترداد التأمين النهائي المسجلة
  const [refundCards, setRefundCards] = useState<RefundCardRecord[]>(() => {
    if (
      existingNotes.finalInsuranceRefundCardsList &&
      Array.isArray(existingNotes.finalInsuranceRefundCardsList) &&
      existingNotes.finalInsuranceRefundCardsList.length > 0
    ) {
      return existingNotes.finalInsuranceRefundCardsList;
    }
    const letter = existingNotes.finalInsuranceRefundLetter;
    if (letter || existingNotes.letterRegistrationNumbers?.["final_insurance_refund"] || existingNotes.archivedDocPdfs?.["letter-final-refund"]) {
      const reg =
        existingNotes.letterRegistrationNumbers?.["final_insurance_refund"] ||
        letter.registrationNumber ||
        `AZ${op.serialNumber || ""}`;
      const arcInfo = existingNotes.archivedDocPdfs?.["letter-final-refund"];
      return [
        {
          id: `refund-${reg}`,
          registrationNumber: reg,
          refundAmount: Number(letter.refundAmount) || (finalG?.amount ? Number(finalG.amount) : 0),
          paymentMethod: letter.paymentMethod || "CASH_RECEIPT",
          receiptNumber: letter.receiptNumber,
          receiptDate: letter.receiptDate,
          deductionOperationName: letter.deductionOperationName,
          deductionMonth: letter.deductionMonth,
          deductionYear: letter.deductionYear,
          tenderMethod: letter.tenderMethod,
          operationScope: letter.operationScope || op.name,
          fiscalYear: letter.fiscalYear,
          technicalOpeningDate: letter.technicalOpeningDate,
          bankAccountNumber: letter.bankAccountNumber,
          bankName: letter.bankName,
          bankBranch: letter.bankBranch,
          accountHolderName: letter.accountHolderName,
          status: "APPROVED",
          isArchived: !!arcInfo,
          version: arcInfo?.version || 1,
          versionName: arcInfo?.fileName || `خطاب استرداد التأمين النهائي - ${reg}.pdf`,
          docId: arcInfo?.docId || "",
          createdAt: letter.updatedAt || new Date().toISOString(),
        },
      ];
    }
    return [];
  });

  const [viewingRefundCard, setViewingRefundCard] = useState<RefundCardRecord | null>(null);

  // تحديث البطاقات عند تغير notes للعملية
  useEffect(() => {
    if (
      existingNotes.finalInsuranceRefundCardsList &&
      Array.isArray(existingNotes.finalInsuranceRefundCardsList) &&
      existingNotes.finalInsuranceRefundCardsList.length > 0
    ) {
      setRefundCards(existingNotes.finalInsuranceRefundCardsList);
    } else {
      const letter = existingNotes.finalInsuranceRefundLetter;
      if (letter || existingNotes.letterRegistrationNumbers?.["final_insurance_refund"] || existingNotes.archivedDocPdfs?.["letter-final-refund"]) {
        const reg =
          existingNotes.letterRegistrationNumbers?.["final_insurance_refund"] ||
          letter.registrationNumber ||
          `AZ${op.serialNumber || ""}`;
        const arcInfo = existingNotes.archivedDocPdfs?.["letter-final-refund"];
        setRefundCards([
          {
            id: `refund-${reg}`,
            registrationNumber: reg,
            refundAmount: Number(letter.refundAmount) || (finalG?.amount ? Number(finalG.amount) : 0),
            paymentMethod: letter.paymentMethod || "CASH_RECEIPT",
            receiptNumber: letter.receiptNumber,
            receiptDate: letter.receiptDate,
            deductionOperationName: letter.deductionOperationName,
            deductionMonth: letter.deductionMonth,
            deductionYear: letter.deductionYear,
            tenderMethod: letter.tenderMethod,
            operationScope: letter.operationScope || op.name,
            fiscalYear: letter.fiscalYear,
            technicalOpeningDate: letter.technicalOpeningDate,
            bankAccountNumber: letter.bankAccountNumber,
            bankName: letter.bankName,
            bankBranch: letter.bankBranch,
            accountHolderName: letter.accountHolderName,
            status: "APPROVED",
            isArchived: !!arcInfo,
            version: arcInfo?.version || 1,
            versionName: arcInfo?.fileName || `خطاب استرداد التأمين النهائي - ${reg}.pdf`,
            docId: arcInfo?.docId || "",
            createdAt: letter.updatedAt || new Date().toISOString(),
          },
        ]);
      }
    }
  }, [existingNotes, finalG, op]);

  const handleDeleteRefundCard = async (cardToDelete: RefundCardRecord) => {
    if (!confirm("هل أنت متأكد من حذف بطاقة طلب استرداد التأمين النهائي؟")) return;
    const remaining = refundCards.filter((c) => c.id !== cardToDelete.id);
    setRefundCards(remaining);
    try {
      const updatedNotes = {
        ...existingNotes,
        finalInsuranceRefundCardsList: remaining,
      };
      await api.patch(`/operations/${op.id}`, { notes: JSON.stringify(updatedNotes) });
      toast.success("تم حذف بطاقة الاسترداد بنجاح");
      onRefresh();
    } catch {
      toast.error("فشل حذف بطاقة الاسترداد");
    }
  };

  const handlePreviewRefundDoc = (card: RefundCardRecord) => {
    // محاولة إيجاد المستند الفعلي في مستندات العملية
    const matchedDoc = (op.documents || []).find(
      (d: any) =>
        (card.docId && d.id === card.docId) ||
        (card.versionName && d.fileName === card.versionName.replace(/\.pdf$/i, "")) ||
        (d.fileName || "").includes("استرداد التأمين")
    );

    if (matchedDoc) {
      onPreviewDoc?.(matchedDoc);
    } else {
      // إرسال كائن مستند مرجعي للمعاينة
      onPreviewDoc?.({
        id: card.docId,
        fileName: card.versionName || `خطاب استرداد التأمين النهائي - ${card.registrationNumber}.pdf`,
        type: "LETTER",
        fileType: "pdf",
      });
    }
  };

  const handleDownloadRefundDoc = (card: RefundCardRecord) => {
    const matchedDoc = (op.documents || []).find(
      (d: any) =>
        (card.docId && d.id === card.docId) ||
        (card.versionName && d.fileName === card.versionName.replace(/\.pdf$/i, "")) ||
        (d.fileName || "").includes("استرداد التأمين")
    );
    if (matchedDoc) {
      onDownloadDoc?.(matchedDoc);
    } else {
      onDownloadDoc?.({
        id: card.docId,
        fileName: card.versionName || `خطاب استرداد التأمين النهائي - ${card.registrationNumber}.pdf`,
        type: "LETTER",
        fileType: "pdf",
      });
    }
  };

  const steps = [
    {
      num: 1,
      title: "1. خطاب طلب الاسترداد المعتمد",
      desc: "تجهيز وتقديم طلب استرداد التأمين النهائي موجه للجهة مع شهادة الاستلام النهائي",
      dateKey: "recoveryLetterDate",
      done: !!finalG?.recoveryLetterDate || refundCards.length > 0,
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

      {/* ━━━ بطاقات طلب واسترداد التأمين النهائي المعتمدة ━━━ */}
      {refundCards.length > 0 && (
        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <span>بطاقات طلب استرداد التأمين النهائي المعتمدة ({refundCards.length}):</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {refundCards.map((card) => (
              <div
                key={card.id}
                className="p-4 rounded-2xl bg-card border border-blue-500/30 hover:border-blue-500/60 transition-all duration-200 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[11px] font-bold flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-blue-600" />
                      <span>طلب استرداد تأمين نهائي</span>
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      {card.registrationNumber && (
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-[10px] font-bold border border-amber-500/20">
                          قيد: {card.registrationNumber}
                        </Badge>
                      )}
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                        {card.status === "RECOVERED" ? "تم الاسترداد ✓" : "معتمد وموثق ✓"}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">قيمة التأمين المراد استرداده:</span>
                    <span className="font-mono font-black text-lg text-emerald-600 dark:text-emerald-400 block">
                      {formatCurrency(Number(card.refundAmount))}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-1 text-xs">
                    <div className="flex items-start gap-1">
                      <span className="text-muted-foreground font-medium shrink-0">طريقة السداد:</span>
                      <span className="font-semibold text-foreground">
                        {card.paymentMethod === "DEDUCTION"
                          ? `خصم من مستحقات: ${card.deductionOperationName || "العملية"} (${card.deductionMonth || ""} ${card.deductionYear || ""})`
                          : `إيصال سداد نقدي رقم (${card.receiptNumber || "—"}) بتاريخ (${card.receiptDate || "—"})`}
                      </span>
                    </div>

                    {card.bankAccountNumber && (
                      <div className="flex items-start gap-1 text-[11px] pt-0.5">
                        <span className="text-muted-foreground font-medium shrink-0">الحساب البنكي:</span>
                        <span className="font-mono text-foreground font-semibold">
                          {card.bankName || "البنك"} ({card.bankAccountNumber})
                        </span>
                      </div>
                    )}

                    {card.versionName && (
                      <div className="flex items-center gap-1.5 pt-1 text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                        <FileText className="h-3 w-3 text-red-500 shrink-0" />
                        <span className="truncate">{card.versionName}</span>
                        {card.version && <Badge className="text-[9px] px-1 py-0 h-4">نسخة {card.version}</Badge>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePreviewRefundDoc(card)}
                    className="h-8 px-3 rounded-xl border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    title="معاينة الملف المعتمد"
                  >
                    <Eye className="h-3.5 w-3.5 text-emerald-600" />
                    <span>معاينة الملف</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadRefundDoc(card)}
                    className="h-8 px-2.5 rounded-xl border-border text-xs font-bold cursor-pointer"
                    title="تحميل المستند"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewingRefundCard(card)}
                    className="h-8 px-2.5 rounded-xl border-blue-500/40 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 text-xs font-bold cursor-pointer"
                    title="تفاصيل البطاقة"
                  >
                    <span>تفاصيل</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRefundSection(true)}
                    className="h-8 px-2.5 rounded-xl border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 text-xs font-bold cursor-pointer"
                    title="تعديل الخطاب"
                  >
                    <Edit className="h-3.5 w-3.5 text-amber-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteRefundCard(card)}
                    className="h-8 w-8 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    title="حذف البطاقة"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stepper Display إذا كان التأمين مسجلاً بالضمانات أو توجد بطاقة استرداد */}
      {finalG || refundCards.length > 0 ? (
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs text-muted-foreground block">قيمة التأمين النهائي المستحق للاسترداد</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatCurrency(Number(finalG?.amount || refundCards[0]?.refundAmount || 0))}
              </span>
            </div>
            <Badge
              className={
                finalG?.isRecovered
                  ? "badge-emerald"
                  : finalG?.status === "RECOVERY_REQUESTED"
                  ? "badge-blue"
                  : "badge-amber"
              }
            >
              {finalG?.isRecovered
                ? "تم الاسترداد بالكامل ✓"
                : finalG?.status === "RECOVERY_REQUESTED"
                ? "قيد إجراءات الاسترداد"
                : "ساري — قيد إجراءات الاسترداد"}
            </Badge>
          </div>

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
                      {st.done && finalG && finalG[st.dateKey] && (
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
                        <SmartArabicDatePicker
                          label="تاريخ الإجراء"
                          value={actionDate}
                          onChange={(val) => setActionDate(val)}
                          outputFormat="iso"
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
      ) : refundCards.length === 0 ? (
        <div className="space-y-4 py-3">
          <EmptyState
            icon={RefreshCw}
            text="لا يوجد تأمين نهائي مسجل للاسترداد"
            subtext="يمكنك الآن تسجيل طلب الاسترداد وحفظ الخطاب كبطاقة رسمية معتمدة مباشرة من هنا"
          />
          <div className="flex justify-center">
            <Button
              size="sm"
              onClick={() => setShowRefundSection(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-5 rounded-xl cursor-pointer shadow-sm"
            >
              <FileText className="h-4 w-4 ml-1.5" />
              <span>تسجيل وتوثيق خطاب استرداد التأمين النهائي 🛡️</span>
            </Button>
          </div>
        </div>
      ) : null}

      {/* ━━━ MODAL: معاينة تفاصيل بطاقة استرداد التأمين ━━━ */}
      {viewingRefundCard && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-card text-card-foreground border border-border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center font-bold text-sm">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-foreground">
                    تفاصيل بطاقة استرداد التأمين النهائي
                  </h3>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {viewingRefundCard.registrationNumber || viewingRefundCard.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingRefundCard(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground block font-medium">مبلغ التأمين المسترد:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base">
                    {formatCurrency(Number(viewingRefundCard.refundAmount))}
                  </span>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                  معتمد رسمياً ✓
                </Badge>
              </div>

              <div className="space-y-2 p-3.5 rounded-2xl bg-muted/40 border border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">طريقة السداد الأصلية:</span>
                  <span className="font-bold text-foreground">
                    {viewingRefundCard.paymentMethod === "DEDUCTION" ? "خصم من مستحقات" : "إيصال سداد نقدي"}
                  </span>
                </div>
                {viewingRefundCard.receiptNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">رقم وتاريخ الإيصال:</span>
                    <span className="font-mono font-bold text-foreground">
                      {viewingRefundCard.receiptNumber} ({viewingRefundCard.receiptDate || "—"})
                    </span>
                  </div>
                )}
                {viewingRefundCard.deductionOperationName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">العملية المخصوم منها:</span>
                    <span className="font-bold text-foreground">
                      {viewingRefundCard.deductionOperationName} ({viewingRefundCard.deductionMonth}{" "}
                      {viewingRefundCard.deductionYear})
                    </span>
                  </div>
                )}
                {viewingRefundCard.bankAccountNumber && (
                  <div className="flex justify-between pt-1 border-t border-border/50">
                    <span className="text-muted-foreground">الحساب البنكي المحول إليه:</span>
                    <span className="font-mono font-bold text-foreground">
                      {viewingRefundCard.bankName} - {viewingRefundCard.bankBranch} ({viewingRefundCard.bankAccountNumber})
                    </span>
                  </div>
                )}
                {viewingRefundCard.versionName && (
                  <div className="flex justify-between pt-1 border-t border-border/50">
                    <span className="text-muted-foreground">الملف الرسمي بالأرشيف:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {viewingRefundCard.versionName}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                size="sm"
                onClick={() => {
                  handlePreviewRefundDoc(viewingRefundCard);
                  setViewingRefundCard(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 text-xs font-bold cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5 ml-1.5" />
                <span>معاينة الملف المعتمد</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingRefundCard(null)}
                className="rounded-xl px-4 text-xs cursor-pointer"
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   4. SUPPLIER PERFORMANCE EVALUATION (تقييم أداء المورد وسجل الجودة)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export interface SupplierEvaluationRecord {
  id: string;
  evaluationNumber: string;
  evaluationDate: string;
  deliverySpeed: number;
  qualityMatch: number;
  communication: number;
  overallScore: number;
  evaluationNotes: string;
  status: "APPROVED" | "DRAFT";
  createdAt: string;
}

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

  // بطاقات تقييم الأداء المعتمدة
  const [evalCards, setEvalCards] = useState<SupplierEvaluationRecord[]>(() => {
    if (
      existingNotes.supplierEvaluationCardsList &&
      Array.isArray(existingNotes.supplierEvaluationCardsList) &&
      existingNotes.supplierEvaluationCardsList.length > 0
    ) {
      return existingNotes.supplierEvaluationCardsList;
    }
    if (evalData.evaluationNotes || evalData.overallScore) {
      return [
        {
          id: "eval-card-1",
          evaluationNumber: `EVAL-${op.serialNumber || "1"}`,
          evaluationDate: evalData.updatedAt || new Date().toISOString().split("T")[0],
          deliverySpeed: evalData.deliverySpeed || 5,
          qualityMatch: evalData.qualityMatch || 5,
          communication: evalData.communication || 5,
          overallScore: Number(evalData.overallScore) || 5.0,
          evaluationNotes:
            evalData.evaluationNotes || "التزام تام بالجدول الزمني والمواصفات المعتمدة بدون أي غرامات تأخير",
          status: "APPROVED",
          createdAt: evalData.updatedAt || new Date().toISOString(),
        },
      ];
    }
    return [];
  });

  const [viewingEvalCard, setViewingEvalCard] = useState<SupplierEvaluationRecord | null>(null);
  const [editingEvalId, setEditingEvalId] = useState<string | null>(null);

  // مزامنة بطاقات التقييم تلقائياً عند تحديث العملية
  useEffect(() => {
    if (
      existingNotes.supplierEvaluationCardsList &&
      Array.isArray(existingNotes.supplierEvaluationCardsList) &&
      existingNotes.supplierEvaluationCardsList.length > 0
    ) {
      setEvalCards(existingNotes.supplierEvaluationCardsList);
    } else if (evalData.evaluationNotes || evalData.overallScore) {
      setEvalCards([
        {
          id: "eval-card-1",
          evaluationNumber: `EVAL-${op.serialNumber || "1"}`,
          evaluationDate: evalData.updatedAt || new Date().toISOString().split("T")[0],
          deliverySpeed: evalData.deliverySpeed || 5,
          qualityMatch: evalData.qualityMatch || 5,
          communication: evalData.communication || 5,
          overallScore: Number(evalData.overallScore) || 5.0,
          evaluationNotes:
            evalData.evaluationNotes || "التزام تام بالجدول الزمني والمواصفات المعتمدة بدون أي غرامات تأخير",
          status: "APPROVED",
          createdAt: evalData.updatedAt || new Date().toISOString(),
        },
      ]);
    }
  }, [existingNotes, evalData, op.serialNumber]);

  const overallScore = useMemo(() => {
    return ((deliverySpeed + qualityMatch + communication) / 3).toFixed(1);
  }, [deliverySpeed, qualityMatch, communication]);

  const handleSaveEval = async () => {
    setSavingEval(true);
    try {
      const cardId = editingEvalId || `eval-card-${Date.now()}`;
      const newCard: SupplierEvaluationRecord = {
        id: cardId,
        evaluationNumber: `EVAL-${op.serialNumber || "1"}`,
        evaluationDate: new Date().toISOString().split("T")[0],
        deliverySpeed,
        qualityMatch,
        communication,
        overallScore: Number(overallScore),
        evaluationNotes,
        status: "APPROVED",
        createdAt: new Date().toISOString(),
      };

      const updatedCards = editingEvalId
        ? evalCards.map((c) => (c.id === editingEvalId ? newCard : c))
        : [newCard, ...evalCards];

      setEvalCards(updatedCards);

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
        supplierEvaluationCardsList: updatedCards,
      };

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(updatedNotes),
      });

      toast.success("تم حفظ وتوثيق تقييم أداء المورد وتسجيل البطاقة بنجاح! ⭐✓");
      setEditingEvalId(null);
      onRefresh();
    } catch {
      toast.error("فشل حفظ التقييم");
    } finally {
      setSavingEval(false);
    }
  };

  const handleEditEvalCard = (card: SupplierEvaluationRecord) => {
    setEditingEvalId(card.id);
    setDeliverySpeed(card.deliverySpeed);
    setQualityMatch(card.qualityMatch);
    setCommunication(card.communication);
    setEvaluationNotes(card.evaluationNotes);
    toast.info("تم تحميل بيانات بطاقة التقييم في النموذج للتعديل");
  };

  const handleDeleteEvalCard = async (cardToDelete: SupplierEvaluationRecord) => {
    if (!confirm("هل أنت متأكد من حذف بطاقة تقييم الأداء هذه؟")) return;
    const remaining = evalCards.filter((c) => c.id !== cardToDelete.id);
    setEvalCards(remaining);
    try {
      const updatedNotes = {
        ...existingNotes,
        supplierEvaluationCardsList: remaining,
      };
      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(updatedNotes),
      });
      toast.success("تم حذف بطاقة التقييم بنجاح");
      onRefresh();
    } catch {
      toast.error("فشل حذف البطاقة");
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

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        {editingEvalId && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditingEvalId(null)}
            className="text-xs h-9 px-3 rounded-xl cursor-pointer"
          >
            إلغاء التعديل
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleSaveEval}
          disabled={savingEval}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer"
        >
          {savingEval ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Check className="h-4 w-4 ml-1" />}
          <span>{editingEvalId ? "تحديث تقييم الأداء ⭐" : "حفظ تقييم الأداء ⭐"}</span>
        </Button>
      </div>

      {/* ━━━ بطاقات تقييم أداء المورد وسجل الجودة المعتمدة ━━━ */}
      {evalCards.length > 0 && (
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span>بطاقات تقييم أداء المورد وسجل الجودة المعتمدة ({evalCards.length}):</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {evalCards.map((card) => (
              <div
                key={card.id}
                className="p-4 rounded-2xl bg-card border border-amber-500/30 hover:border-amber-500/60 transition-all duration-200 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[11px] font-bold flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      <span>تقييم أداء مورد معتمد</span>
                    </Badge>
                    <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono text-[11px] font-black border border-amber-500/30">
                      {card.overallScore} / 5 ⭐
                    </Badge>
                  </div>

                  <div>
                    <span className="font-mono font-bold text-sm text-foreground block">
                      {card.evaluationNumber}
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      تاريخ التقييم: {formatDate(card.evaluationDate)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 py-1.5 text-center bg-muted/30 p-2 rounded-xl text-[11px]">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">السرعة</span>
                      <span className="font-bold font-mono text-amber-600 dark:text-amber-400">
                        {card.deliverySpeed} / 5
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">الجودة</span>
                      <span className="font-bold font-mono text-amber-600 dark:text-amber-400">
                        {card.qualityMatch} / 5
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">الدعم</span>
                      <span className="font-bold font-mono text-amber-600 dark:text-amber-400">
                        {card.communication} / 5
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/20 p-2 rounded-xl">
                    {card.evaluationNotes}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewingEvalCard(card)}
                    className="h-8 px-3 rounded-xl border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    title="معاينة تفاصيل التقييم"
                  >
                    <Eye className="h-3.5 w-3.5 text-amber-600" />
                    <span>عرض</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditEvalCard(card)}
                    className="h-8 px-3 rounded-xl border-blue-500/40 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    title="تعديل التقييم"
                  >
                    <Edit className="h-3.5 w-3.5 text-blue-600" />
                    <span>تعديل</span>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteEvalCard(card)}
                    className="h-8 w-8 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    title="حذف بطاقة التقييم"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ━━━ MODAL: معاينة تفاصيل بطاقة تقييم الأداء ━━━ */}
      {viewingEvalCard && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-card text-card-foreground border border-border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold text-sm">
                  <Star className="h-4 w-4 fill-amber-500" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-foreground">
                    تفاصيل تقييم أداء المورد
                  </h3>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {viewingEvalCard.evaluationNumber}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingEvalCard(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground block font-medium">التقييم العام المعتمد:</span>
                  <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-lg">
                    {viewingEvalCard.overallScore} / 5 ⭐
                  </span>
                </div>
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-xs">
                  معتمد وموثق رسمياً ✓
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <span className="text-muted-foreground block text-[10px]">السرعة والالتزام</span>
                  <span className="font-bold font-mono text-foreground text-sm">
                    {viewingEvalCard.deliverySpeed} / 5
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <span className="text-muted-foreground block text-[10px]">جودة المواصفات</span>
                  <span className="font-bold font-mono text-foreground text-sm">
                    {viewingEvalCard.qualityMatch} / 5
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <span className="text-muted-foreground block text-[10px]">الدعم الفني</span>
                  <span className="font-bold font-mono text-foreground text-sm">
                    {viewingEvalCard.communication} / 5
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-2xl bg-muted/40 border border-border">
                <span className="font-bold text-foreground block">تقرير وسجل الأداء:</span>
                <p className="text-foreground leading-relaxed font-semibold">
                  {viewingEvalCard.evaluationNotes}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingEvalCard(null)}
                className="rounded-xl px-4 text-xs cursor-pointer"
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   5. ARCHIVE TAB (الأرشيف الرقمي الشامل — المستندات والملفات الفعلية فقط)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function categorizeRealDoc(doc: any): { category: string; iconType: "pdf" | "image" | "word" | "other" } {
  const name = (doc.fileName || doc.title || "").toLowerCase();
  const type = (doc.type || "").toUpperCase();

  const ext = (doc.fileType || name.split(".").pop() || "").toLowerCase();
  let iconType: "pdf" | "image" | "word" | "other" = "other";
  if (ext === "pdf" || name.endsWith(".pdf")) iconType = "pdf";
  else if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) iconType = "image";
  else if (["doc", "docx"].includes(ext)) iconType = "word";

  if (
    type === "BOOKLET" ||
    ((name.includes("كراسة") || name.includes("شروط") || name.includes("مواصفات")) &&
      !name.includes("أمر") &&
      !name.includes("امر") &&
      !name.includes("توريد"))
  ) {
    return { category: "كراسات الشروط والمواصفات", iconType };
  }
  if (
    type === "RECEIPT" ||
    name.includes("إيصال") ||
    name.includes("ايصال") ||
    name.includes("سداد") ||
    name.includes("تأمين") ||
    name.includes("تامين") ||
    name.includes("ضمان") ||
    name.includes("خزينة")
  ) {
    return { category: "إيصالات وضمانات مالية", iconType };
  }
  if (
    type === "SUPPLY_ORDER" ||
    name.includes("أمر توريد") ||
    name.includes("امر توريد") ||
    name.includes("أمر_توريد") ||
    name.includes("عقد") ||
    name.includes("اتفاق")
  ) {
    return { category: "أوامر التوريد والعقود الرسمية", iconType };
  }
  if (name.includes("فحص") || name.includes("استلام") || name.includes("محضر")) {
    return { category: "محاضر الفحص والاستلام النهائي", iconType };
  }
  if (name.includes("مستخلص") || name.includes("فاتورة") || name.includes("مطالبة")) {
    return { category: "مستخلصات وفواتير معتمدة", iconType };
  }
  if (
    type === "LETTER" ||
    name.includes("خطاب") ||
    name.includes("إخطار") ||
    name.includes("اخطار") ||
    name.includes("عرض") ||
    name.includes("استفسار") ||
    name.includes("إقرار") ||
    name.includes("اقرار") ||
    name.includes("تفويض")
  ) {
    return { category: "خطابات وعروض ومكاتبات رسمية", iconType };
  }
  return { category: "مستندات وملفات رسمية", iconType };
}

function formatDocSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function TabArchive({
  op,
  onRefresh,
  onPreviewDoc,
  onDownloadDoc,
}: {
  op: Operation;
  onRefresh?: () => void;
  onPreviewDoc?: (doc: any) => void;
  onDownloadDoc?: (doc: any) => void;
}) {
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // المستندات الحقيقية الفعلية فقط المسجلة بالنظام داخل العملية (استبعاد أي ملفات وهمية لا وجود فعلي لها)
  const realDocs = useMemo(() => {
    return (op.documents || [])
      .filter((d: any) => {
        // استبعاد صارم لأي أمر توريد وهمي أو مستند فارغ غير موجود فعلياً
        if (
          (!d.fileSize || d.fileSize <= 0) &&
          (String(d.filePath || "").includes("/uploads/supply-orders/") ||
            String(d.fileName || "").includes("PO-") ||
            String(d.fileName || "").includes("أمر_توريد"))
        ) {
          return false;
        }
        return true;
      })
      .map((d: any) => {
        const { category, iconType } = categorizeRealDoc(d);
        return {
          ...d,
          category,
          iconType,
        };
      });
  }, [op.documents]);

  const bookletDoc = realDocs.find(
    (d: any) =>
      (d.type === "BOOKLET" || d.category === "كراسات الشروط والمواصفات") &&
      !d.fileName?.includes("أمر") &&
      !d.fileName?.includes("توريد") &&
      !d.fileName?.includes("PO-")
  );

  const categories = useMemo(() => {
    const cats = new Set<string>();
    realDocs.forEach((d: any) => {
      if (d.category) cats.add(d.category);
    });
    return [
      { id: "ALL", label: `جميع المستندات الفعلية (${realDocs.length})` },
      ...Array.from(cats).map((c) => ({
        id: c,
        label: `${c} (${realDocs.filter((d: any) => d.category === c).length})`,
      })),
    ];
  }, [realDocs]);

  const filtered = filterCategory === "ALL" ? realDocs : realDocs.filter((d) => d.category === filterCategory);

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name.replace(/\.[^/.]+$/, ""));
      formData.append("type", "OTHER");
      await api.post(`/operations/${op.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`تم رفع المستند الفعلي (${file.name}) بنجاح إلى أرشيف العملية! 📦✨`);
      onRefresh?.();
    } catch (err: any) {
      toast.error("فشل رفع المستند: " + (err?.response?.data?.message || err?.message || ""));
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteDoc = async (doc: any) => {
    if (!confirm(`هل أنت متأكد من حذف المستند (${doc.fileName}) من أرشيف العملية؟`)) return;
    try {
      await api.delete(`/operations/${op.id}/documents/${doc.id}`);
      toast.success("تم حذف المستند بنجاح من الأرشيف");
      onRefresh?.();
    } catch {
      toast.error("فشل حذف المستند");
    }
  };

  return (
    <SectionCard
      title="أرشيف العملية الرقمي الشامل (الملفات الفعلية)"
      icon={Archive}
      iconColor="text-blue-600"
      badge={
        <Badge className="bg-muted text-foreground border-border text-[10px] font-bold font-mono">
          {realDocs.length} ملف فعلي محفوظ
        </Badge>
      }
      actions={
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleDirectUpload}
            accept=".pdf,.png,.jpg,.jpeg,.docx"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingDoc}
            className="border-blue-500/40 text-blue-700 dark:text-blue-300 hover:bg-blue-50 text-xs font-bold h-8 rounded-xl cursor-pointer"
          >
            {uploadingDoc ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />
            ) : (
              <Upload className="h-3.5 w-3.5 ml-1" />
            )}
            <span>رفع ملف للأرشيف 📤</span>
          </Button>
        </div>
      }
    >
      <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-foreground mb-3">
        <p>
          <strong>الأرشيف الرقمي الموثق:</strong> يعرض هذا السجل الملفات والمستندات الفعلية المحفوظة داخل النظام في مجلد العملية، سواء تم رفعها أو توليدها واعتمادها عبر أزرار الإضافة للأرشيف من المراحل السابقة.
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
              <p className="text-xs text-muted-foreground mt-0.5">
                كراسة الشروط الرسمية للعملية{" "}
                {bookletDoc.fileSize ? `(${formatDocSize(bookletDoc.fileSize)})` : ""}
              </p>
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
      {categories.length > 1 && (
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
              className="p-3 rounded-xl bg-card border border-border flex items-center justify-between gap-3 text-xs hover:border-border/80 transition-all"
            >
              <div className="flex items-center gap-2.5 truncate min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${
                    doc.iconType === "pdf"
                      ? "bg-red-500/15 text-red-600"
                      : doc.iconType === "image"
                      ? "bg-blue-500/15 text-blue-600"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {doc.iconType === "pdf" ? "PDF" : doc.iconType === "image" ? "IMG" : "DOC"}
                </div>
                <div className="truncate min-w-0">
                  <span className="font-bold text-foreground font-mono truncate block">
                    {doc.fileName}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <span>{formatDate(doc.createdAt)}</span>
                    {doc.fileSize && <span>• {formatDocSize(doc.fileSize)}</span>}
                  </div>
                </div>
                <Badge className="bg-muted text-[10px] text-muted-foreground shrink-0 hidden sm:inline-flex">
                  {doc.category}
                </Badge>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  onClick={() => onPreviewDoc?.(doc)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-7.5 px-2.5 rounded-lg cursor-pointer"
                  title="معاينة المستند"
                >
                  <Eye className="h-3 w-3 ml-1" />
                  <span>معاينة</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDownloadDoc?.(doc)}
                  className="border-border text-xs h-7.5 px-2.5 rounded-lg cursor-pointer"
                  title="تحميل الملف"
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDeleteDoc(doc)}
                  className="h-7.5 w-7.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                  title="حذف المستند"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Archive}
          text="لا توجد ملفات فعلية في هذا التصنيف"
          subtext="الملفات التي تحفظها في الأرشيف أو ترفعها تظهر هنا تلقائياً وتُخزن في مجلد العملية."
        />
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
      <TabRecovery
        op={op}
        onRefresh={onRefresh}
        onPreviewDoc={onPreviewDoc}
        onDownloadDoc={onDownloadDoc}
      />

      {/* 4. تقييم أداء المورد وسجل الجودة */}
      <TabSupplierEvaluation op={op} onRefresh={onRefresh} />

      {/* 5. الأرشيف الرقمي الشامل للعملية */}
      <TabArchive
        op={op}
        onRefresh={onRefresh}
        onPreviewDoc={onPreviewDoc}
        onDownloadDoc={onDownloadDoc}
      />

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
