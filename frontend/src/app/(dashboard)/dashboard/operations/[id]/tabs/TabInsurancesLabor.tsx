"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Eye,
  Edit,
  Plus,
  X,
  ExternalLink,
  ShieldCheck,
  Building2,
  Calendar,
  CreditCard,
  FileCheck,
  CheckCircle2,
  Clock,
  Upload,
  UserCheck,
  Loader2,
  Download,
  Trash2,
  Check,
  Sparkles,
  AlertCircle,
  Landmark,
  Coins,
  FileText,
  DollarSign,
  Layers,
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
  formatCurrency,
  formatDate,
  tafqeetArabic,
  EmptyState,
} from "./types";
import { StepFooterNav } from "./StepFooterNav";
import { SmartArabicDatePicker } from "@/components/ui/arabic-date-picker";

export interface InsuranceRecord {
  id: string;
  type: "SOCIAL" | "LABOR" | "HANDOVER";
  title: string;
  receiptNo: string;
  amount: number;
  date: string;
  entityName: string;
  status: "PAID" | "PENDING";
  recipientName?: string;
  recipientRole?: string;
  attachmentName?: string;
  notes?: string;
  createdAt: string;
}

export function TabInsurancesLabor({
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
  // Parse existing data from op.notes
  const existingNotesObj = useMemo(() => {
    if (!op.notes) return {};
    try {
      return JSON.parse(op.notes);
    } catch {
      return {};
    }
  }, [op.notes]);

  const existingData = existingNotesObj.insurancesLaborData || {};

  // Initialize records cards list
  const defaultCards: InsuranceRecord[] = useMemo(() => {
    if (existingNotesObj.insurancesRecordsList && Array.isArray(existingNotesObj.insurancesRecordsList)) {
      return existingNotesObj.insurancesRecordsList;
    }
    // Seed with existing single-record data or initial defaults
    return [
      {
        id: "ins-1",
        type: "SOCIAL",
        title: "سداد التأمينات الاجتماعية (مقاولات)",
        receiptNo: existingData.socialInsuranceReceiptNo || "INS-55412",
        amount: Number(existingData.socialInsuranceAmount) || 1850,
        date: existingData.socialInsuranceDate || "2026-10-15",
        entityName: existingData.socialInsuranceOffice || "مكتب تأمينات مقاولات دمنهور",
        status: (existingData.socialInsuranceStatus as any) || "PAID",
        notes: "تم سداد اشتراك المقاولة واستخراج شهادة البراءة التأمينية قبل صرف المستخلص",
        createdAt: new Date().toISOString(),
      },
      {
        id: "ins-2",
        type: "LABOR",
        title: "سداد رسوم وتراخيص القوى العاملة",
        receiptNo: existingData.laborReceiptNo || "LAB-8890",
        amount: Number(existingData.laborAmount) || 750,
        date: existingData.laborDate || "2026-10-16",
        entityName: existingData.laborDirectorate || "مديرية القوى العاملة والهجرة بالبحيرة",
        status: (existingData.laborStatus as any) || "PAID",
        notes: "سداد طوابع وتراخيص تشغيل العمالة غير المنتظمة للعملية",
        createdAt: new Date().toISOString(),
      },
      {
        id: "ins-3",
        type: "HANDOVER",
        title: "تسليم أصول الشهادات والبراءة للجهة",
        receiptNo: existingData.handoverReceiptNumber || `DOC-REC-${op.serialNumber || "01"}`,
        amount: 0,
        date: existingData.certificatesHandoverDate || "2026-10-18",
        entityName: "إدارة الحسابات والعقود بالجهة الحكومية",
        recipientName: existingData.authorityRecipientName || "أحمد عبد الله مصطفى",
        recipientRole: existingData.authorityRecipientRole || "رئيس قسم الحسابات ومراجعة العقود",
        status: "PAID",
        notes: existingData.handoverNotes || "تم تسليم أصل شهادة التأمينات الاجتماعية وأصل إيصال القوى العاملة للمطابقة والصرف",
        createdAt: new Date().toISOString(),
      },
    ];
  }, [existingNotesObj, existingData, op.serialNumber]);

  const [cards, setCards] = useState<InsuranceRecord[]>(defaultCards);

  useEffect(() => {
    if (existingNotesObj.insurancesRecordsList && Array.isArray(existingNotesObj.insurancesRecordsList)) {
      setCards(existingNotesObj.insurancesRecordsList);
    }
  }, [existingNotesObj]);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<InsuranceRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<InsuranceRecord | null>(null);
  const [savingRecord, setSavingRecord] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State for Adding / Editing Card
  const [formData, setFormData] = useState<{
    type: "SOCIAL" | "LABOR" | "HANDOVER";
    title: string;
    receiptNo: string;
    amount: string;
    date: string;
    entityName: string;
    status: "PAID" | "PENDING";
    recipientName: string;
    recipientRole: string;
    notes: string;
  }>({
    type: "SOCIAL",
    title: "",
    receiptNo: "",
    amount: "1500",
    date: new Date().toISOString().split("T")[0],
    entityName: "",
    status: "PAID",
    recipientName: "",
    recipientRole: "",
    notes: "",
  });

  // Payment Order Tracking State
  const [paymentOrderStatus, setPaymentOrderStatus] = useState<"AUDITING" | "SIGNED" | "ISSUED">(
    () => existingData.paymentOrderStatus || "ISSUED"
  );
  const [paymentOrderNumber, setPaymentOrderNumber] = useState(
    () => existingData.paymentOrderNumber || `PO-EG-${op.serialNumber || "101"}-2026`
  );
  const [paymentOrderDate, setPaymentOrderDate] = useState(
    () => existingData.paymentOrderDate || new Date().toISOString().split("T")[0]
  );
  const [disbursingBank, setDisbursingBank] = useState(
    () => existingData.disbursingBank || "البنك المركزي المصري - الوحدة الحسابية المركزية"
  );
  const [paymentOrderAmount, setPaymentOrderAmount] = useState(
    () => existingData.paymentOrderAmount || "55000"
  );
  const [savingPaymentOrder, setSavingPaymentOrder] = useState(false);

  // Calculations
  const totalSocial = useMemo(() => {
    return cards
      .filter((c) => c.type === "SOCIAL")
      .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  }, [cards]);

  const totalLabor = useMemo(() => {
    return cards
      .filter((c) => c.type === "LABOR")
      .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  }, [cards]);

  const totalInsurances = totalSocial + totalLabor;
  const isHandoverComplete = cards.some((c) => c.type === "HANDOVER" && c.status === "PAID");

  // Save changes to backend
  const persistCardsToBackend = async (newCardsList: InsuranceRecord[]) => {
    let notesObj: Record<string, any> = {};
    if (op.notes) {
      try {
        notesObj = JSON.parse(op.notes);
      } catch {
        notesObj = {};
      }
    }

    const calculatedSocial = newCardsList
      .filter((c) => c.type === "SOCIAL")
      .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

    const calculatedLabor = newCardsList
      .filter((c) => c.type === "LABOR")
      .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

    notesObj.insurancesRecordsList = newCardsList;
    notesObj.insurancesLaborData = {
      ...(notesObj.insurancesLaborData || {}),
      socialInsuranceAmount: calculatedSocial,
      laborAmount: calculatedLabor,
      socialInsuranceStatus: calculatedSocial > 0 ? "PAID" : "PENDING",
      laborStatus: calculatedLabor > 0 ? "PAID" : "PENDING",
      paymentOrderStatus,
      paymentOrderNumber,
      paymentOrderDate,
      disbursingBank,
      paymentOrderAmount,
      updatedAt: new Date().toISOString(),
    };

    await api.patch(`/operations/${op.id}`, {
      notes: JSON.stringify(notesObj),
    });

    onRefresh();
  };

  // Add Card Action
  const handleOpenAddModal = (defaultType?: "SOCIAL" | "LABOR" | "HANDOVER") => {
    const t = defaultType || "SOCIAL";
    setFormData({
      type: t,
      title:
        t === "SOCIAL"
          ? "سداد التأمينات الاجتماعية (مقاولات)"
          : t === "LABOR"
          ? "سداد رسوم القوى العاملة والتشغيل"
          : "تسليم أصول الشهادات للجهة الحكومية",
      receiptNo:
        t === "SOCIAL"
          ? `INS-${Math.floor(10000 + Math.random() * 90000)}`
          : t === "LABOR"
          ? `LAB-${Math.floor(1000 + Math.random() * 9000)}`
          : `DOC-REC-${op.serialNumber || "01"}`,
      amount: t === "HANDOVER" ? "0" : t === "SOCIAL" ? "1850" : "750",
      date: new Date().toISOString().split("T")[0],
      entityName:
        t === "SOCIAL"
          ? "مكتب تأمينات مقاولات دمنهور"
          : t === "LABOR"
          ? "مديرية القوى العاملة والهجرة بالبحيرة"
          : "قسم الحسابات والعقود بالجهة",
      status: "PAID",
      recipientName: t === "HANDOVER" ? "أحمد عبد الله مصطفى" : "",
      recipientRole: t === "HANDOVER" ? "رئيس قسم الحسابات ومراجعة العقود" : "",
      notes:
        t === "SOCIAL"
          ? "تم سداد التأمين واستخراج براءة المقاولات"
          : t === "LABOR"
          ? "سداد قسيمة القوى العاملة وتصاريح التشغيل"
          : "تم تسليم أصل شهادة التأمينات وأصل إيصال القوى العاملة للمطابقة والصرف",
    });
    setAddModalOpen(true);
  };

  const handleSaveNewCard = async () => {
    setSavingRecord(true);
    try {
      const newCard: InsuranceRecord = {
        id: `ins-${Date.now()}`,
        type: formData.type,
        title: formData.title || (formData.type === "SOCIAL" ? "سداد التأمينات الاجتماعية" : formData.type === "LABOR" ? "سداد القوى العاملة" : "تسليم الشهادات للجهة"),
        receiptNo: formData.receiptNo || `REC-${Date.now().toString().slice(-4)}`,
        amount: Number(formData.amount) || 0,
        date: formData.date || new Date().toISOString().split("T")[0],
        entityName: formData.entityName || "الجهة المختصة",
        status: formData.status,
        recipientName: formData.recipientName,
        recipientRole: formData.recipientRole,
        notes: formData.notes,
        createdAt: new Date().toISOString(),
      };

      const updated = [newCard, ...cards];
      setCards(updated);
      await persistCardsToBackend(updated);

      toast.success("تم تسجيل وحفظ بطاقة التأمينات / السداد بنجاح! 💳✨");
      setAddModalOpen(false);
    } catch (err: any) {
      toast.error("فشل حفظ البطاقة: " + (err?.message || ""));
    } finally {
      setSavingRecord(false);
    }
  };

  // Edit Card Action
  const handleOpenEditModal = (rec: InsuranceRecord) => {
    setEditingRecord(rec);
    setFormData({
      type: rec.type,
      title: rec.title,
      receiptNo: rec.receiptNo,
      amount: rec.amount.toString(),
      date: rec.date,
      entityName: rec.entityName,
      status: rec.status,
      recipientName: rec.recipientName || "",
      recipientRole: rec.recipientRole || "",
      notes: rec.notes || "",
    });
    setEditModalOpen(true);
  };

  const handleSaveEditCard = async () => {
    if (!editingRecord) return;
    setSavingRecord(true);
    try {
      const updated = cards.map((c) =>
        c.id === editingRecord.id
          ? {
              ...c,
              type: formData.type,
              title: formData.title,
              receiptNo: formData.receiptNo,
              amount: Number(formData.amount) || 0,
              date: formData.date,
              entityName: formData.entityName,
              status: formData.status,
              recipientName: formData.recipientName,
              recipientRole: formData.recipientRole,
              notes: formData.notes,
            }
          : c
      );
      setCards(updated);
      await persistCardsToBackend(updated);

      toast.success("تم تحديث بيانات البطاقة وحفظ التعديلات بنجاح! 💾✨");
      setEditModalOpen(false);
      setEditingRecord(null);
    } catch (err: any) {
      toast.error("فشل تعديل البطاقة: " + (err?.message || ""));
    } finally {
      setSavingRecord(false);
    }
  };

  // Delete Card Action
  const handleDeleteCard = async (rec: InsuranceRecord) => {
    if (!confirm(`هل أنت متأكد من حذف بطاقة "${rec.title}" رقم (${rec.receiptNo})؟`)) return;
    setDeletingId(rec.id);
    try {
      const updated = cards.filter((c) => c.id !== rec.id);
      setCards(updated);
      await persistCardsToBackend(updated);
      toast.success("تم حذف البطاقة بنجاح! 🗑️");
    } catch (err: any) {
      toast.error("فشل حذف البطاقة: " + (err?.message || ""));
    } finally {
      setDeletingId(null);
    }
  };

  // Save Payment Order Section
  const handleSavePaymentOrder = async () => {
    setSavingPaymentOrder(true);
    try {
      await persistCardsToBackend(cards);
      toast.success("تم حفظ وتحديث بيانات تتبع أمر الدفع الإلكتروني بنجاح! 🏦✨");
    } catch (err: any) {
      toast.error("فشل حفظ بيانات أمر الدفع: " + (err?.message || ""));
    } finally {
      setSavingPaymentOrder(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      {/* ━━━ TOP 4 KPI CARDS ━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: إجمالي التأمينات الاجتماعية */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-blue-500/30 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground pb-2">
            <span>سداد التأمينات الاجتماعية</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
            {formatCurrency(totalSocial)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
            <span>تأمينات المقاولات</span>
            <span className="font-semibold text-emerald-600">براءة معتمدة ✓</span>
          </div>
        </div>

        {/* KPI 2: رسوم القوى العاملة */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-amber-500/30 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground pb-2">
            <span>رسوم القوى العاملة والتشغيل</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
            {formatCurrency(totalLabor)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
            <span>تصاريح العمالة غير المنتظمة</span>
            <span className="font-semibold text-foreground">مسدد بالكامل</span>
          </div>
        </div>

        {/* KPI 3: إجمالي التأمينات والرسوم */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-emerald-500/30 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground pb-2">
            <span>إجمالي سداد البراءة والعمالة</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalInsurances)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
            <span>مجموع مراكز التأمينات</span>
            <span className="font-semibold text-foreground">{cards.length} سجلات مسجلة</span>
          </div>
        </div>

        {/* KPI 4: تسليم الشهادات للجهة */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-purple-500/30 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground pb-2">
            <span>تسليم الشهادات والمطابقة</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-purple-700 dark:text-purple-300 mt-1">
            {isHandoverComplete ? "تم التسليم والمطابقة ✓" : "قيد المتابعة والتسليم"}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 flex items-center justify-between">
            <span>جاهزية صرف المستخلص</span>
            <Badge className="badge-purple text-[10px] font-bold">
              استيفاء قانوني 100%
            </Badge>
          </div>
        </div>
      </div>

      {/* ━━━ SECTION: بطاقات سجلات التأمينات والقوى العاملة وتسليم البراءة ━━━ */}
      <SectionCard
        title="سجلات وبطاقات سداد التأمينات الاجتماعية وتصاريح القوى العاملة"
        icon={Layers}
        iconColor="text-blue-600"
        badge={
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs font-bold font-mono">
            {cards.length} بطاقات مسجلة
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => handleOpenAddModal("SOCIAL")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8.5 rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>إضافة إيصال / براءة جديدة ➕</span>
            </Button>
          </div>
        }
      >
        <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-foreground mb-3 leading-relaxed">
          <strong>إدارة براءة التأمينات وتصاريح العمل الحكومية:</strong> يتم حفظ ومتابعة إيصالات سداد التأمينات الاجتماعية ورسوم القوى العاملة، ومحاضر تسليم أصول الشهادات للجهات الحكومية لضمان عدم تعليق صرف المستخلصات الرسمية.
        </div>

        {cards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => {
              const isSocial = card.type === "SOCIAL";
              const isLabor = card.type === "LABOR";
              const isHandover = card.type === "HANDOVER";

              return (
                <div
                  key={card.id}
                  className={`rounded-2xl border p-4 sm:p-5 space-y-3.5 transition-all duration-300 hover:shadow-lg relative overflow-hidden group flex flex-col justify-between ${
                    isSocial
                      ? "bg-card border-blue-500/30 hover:border-blue-500/60"
                      : isLabor
                      ? "bg-card border-amber-500/30 hover:border-amber-500/60"
                      : "bg-card border-purple-500/30 hover:border-purple-500/60"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Card Header: Type Badge + Receipt No + Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isSocial ? (
                            <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[11px] font-bold flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              <span>تأمينات اجتماعية (مقاولات)</span>
                            </Badge>
                          ) : isLabor ? (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[11px] font-bold flex items-center gap-1">
                              <UserCheck className="h-3 w-3" />
                              <span>قوى عاملة وتصاريح تشغيل</span>
                            </Badge>
                          ) : (
                            <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 text-[11px] font-bold flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              <span>تسليم شهادات ومطابقة</span>
                            </Badge>
                          )}

                          <Badge
                            className={`text-[10px] font-bold ${
                              card.status === "PAID"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                            }`}
                          >
                            {card.status === "PAID" ? "معتمد ومسدد ✓" : "قيد المتابعة"}
                          </Badge>
                        </div>

                        <h4 className="font-black text-foreground text-sm leading-tight pt-1">
                          {card.title}
                        </h4>
                      </div>

                      {/* Top Action Icons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setViewingRecord(card)}
                          className="h-8 w-8 rounded-xl text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/40 cursor-pointer"
                          title="عرض تفاصيل البطاقة"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleOpenEditModal(card)}
                          className="h-8 w-8 rounded-xl text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                          title="تعديل البطاقة"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={deletingId === card.id}
                          onClick={() => handleDeleteCard(card)}
                          className="h-8 w-8 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          title="حذف البطاقة"
                        >
                          {deletingId === card.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Card Body Data */}
                    <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2 text-xs">
                      {card.amount > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">المبلغ المسدد:</span>
                          <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(card.amount)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-semibold">رقم الإيصال / السند:</span>
                        <span className="font-mono font-bold text-foreground">
                          {card.receiptNo}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-semibold">الجهة / المكتب:</span>
                        <span className="font-bold text-foreground truncate max-w-[170px]" title={card.entityName}>
                          {card.entityName}
                        </span>
                      </div>

                      {card.recipientName && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">المستلم بالجهة:</span>
                          <span className="font-bold text-purple-700 dark:text-purple-300 truncate max-w-[170px]">
                            {card.recipientName}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-semibold">تاريخ السداد:</span>
                        <span className="font-mono text-muted-foreground">
                          {formatDate(card.date)}
                        </span>
                      </div>
                    </div>

                    {/* Notes Snippet */}
                    {card.notes && (
                      <p className="text-[11px] text-muted-foreground bg-muted/20 p-2.5 rounded-xl border border-border/40 line-clamp-2 leading-relaxed">
                        {card.notes}
                      </p>
                    )}
                  </div>

                  {/* Card Footer Action */}
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">شهادة معتمدة ورسمية</span>
                    <button
                      onClick={() => setViewingRecord(card)}
                      className="font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                    >
                      <span>عرض كامل البيانات</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={ShieldCheck}
            text="لا توجد بطاقات تأمينات أو قوى عاملة مسجلة حتى الآن"
            subtext="اضغط على زر (إضافة إيصال / براءة جديدة) لتسجيل بطاقات سداد اشتراكات التأمينات والعمالة"
          />
        )}
      </SectionCard>

      {/* ━━━ SECTION: تتبع أمر الدفع الإلكتروني الرسمي (PAYMENT ORDER) ━━━ */}
      <SectionCard
        title="تتبع ومطابقة أمر الدفع الإلكتروني الحكومي (Payment Order)"
        icon={Landmark}
        iconColor="text-emerald-600"
        badge={
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold">
            {paymentOrderStatus === "ISSUED" ? "أمر دفع صادر ومنصرف ✓" : "قيد المراجعة بالوحدة الحسابية"}
          </Badge>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">حالة أمر الدفع الإلكتروني *</Label>
            <Select
              value={paymentOrderStatus}
              onValueChange={(val: any) => setPaymentOrderStatus(val)}
            >
              <SelectTrigger className="h-10 text-xs rounded-xl font-bold">
                <SelectValue placeholder="اختر حالة أمر الدفع">
                  {paymentOrderStatus === "ISSUED"
                    ? "أمر دفع صادر ومنصرف بنكياً"
                    : paymentOrderStatus === "SIGNED"
                    ? "تم التوقيع الإلكتروني الأول والثاني"
                    : "قيد المراجعة بالوحدة الحسابية"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AUDITING">قيد المراجعة بالوحدة الحسابية</SelectItem>
                <SelectItem value="SIGNED">تم التوقيع الإلكتروني الأول والثاني</SelectItem>
                <SelectItem value="ISSUED">أمر دفع صادر ومنصرف بنكياً</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">رقم أمر الدفع الإلكتروني *</Label>
            <Input
              value={paymentOrderNumber}
              onChange={(e) => setPaymentOrderNumber(e.target.value)}
              className="h-10 text-xs font-mono font-bold rounded-xl"
              placeholder="PO-EG-XXXX-2026"
            />
          </div>

          <div className="space-y-1.5">
            <SmartArabicDatePicker
              label="تاريخ إصدار أمر الدفع"
              value={paymentOrderDate}
              onChange={(val) => setPaymentOrderDate(val)}
              outputFormat="iso"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">صافي المبلغ المنصرف (ج.م) *</Label>
            <Input
              type="number"
              value={paymentOrderAmount}
              onChange={(e) => setPaymentOrderAmount(e.target.value)}
              className="h-10 text-xs font-mono font-black text-emerald-600 rounded-xl"
            />
          </div>

          <div className="sm:col-span-2 md:col-span-3 space-y-1.5">
            <Label className="text-xs font-bold">البنك والوحدة الحسابية المصدرة</Label>
            <Input
              value={disbursingBank}
              onChange={(e) => setDisbursingBank(e.target.value)}
              className="h-10 text-xs rounded-xl"
              placeholder="البنك المركزي المصري - الوحدة الحسابية المركزية"
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={handleSavePaymentOrder}
              disabled={savingPaymentOrder}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              {savingPaymentOrder ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-1" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 ml-1" />
                  <span>حفظ بيانات أمر الدفع 💾</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* ━━━ MODAL: إضافة بطاقة جديدة ━━━ */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-card text-card-foreground border border-border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center font-bold text-sm">
                  <Plus className="h-4 w-4" />
                </div>
                <h3 className="font-black text-sm sm:text-base text-foreground">
                  تسجيل بطاقة تأمينات / سداد جديدة
                </h3>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">نوع السجل / البطاقة *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(val: any) =>
                      setFormData((prev) => ({
                        ...prev,
                        type: val,
                        title:
                          val === "SOCIAL"
                            ? "سداد التأمينات الاجتماعية (مقاولات)"
                            : val === "LABOR"
                            ? "سداد رسوم القوى العاملة والتشغيل"
                            : "تسليم أصول الشهادات للجهة الحكومية",
                      }))
                    }
                  >
                    <SelectTrigger className="h-10 text-xs rounded-xl font-bold">
                      <SelectValue placeholder="اختر نوع البطاقة">
                        {formData.type === "SOCIAL"
                          ? "تأمينات اجتماعية (مقاولات)"
                          : formData.type === "LABOR"
                          ? "قوى عاملة وتصاريح تشغيل"
                          : "تسليم شهادات ومطابقة براءة"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SOCIAL">تأمينات اجتماعية (مقاولات)</SelectItem>
                      <SelectItem value="LABOR">قوى عاملة وتصاريح تشغيل</SelectItem>
                      <SelectItem value="HANDOVER">تسليم شهادات ومطابقة براءة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">حالة السداد والاعتماد *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val: any) =>
                      setFormData((prev) => ({ ...prev, status: val }))
                    }
                  >
                    <SelectTrigger className="h-10 text-xs rounded-xl font-bold">
                      <SelectValue placeholder="حالة السداد">
                        {formData.status === "PAID"
                          ? "تم السداد واستخراج الشهادة ✓"
                          : "قيد المتابعة والسداد"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAID">تم السداد واستخراج الشهادة ✓</SelectItem>
                      <SelectItem value="PENDING">قيد المتابعة والسداد</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">عنوان أو بيان السجل *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="h-10 text-xs rounded-xl font-bold"
                  placeholder="مثال: سداد اشتراك تأمينات مقاولات العملية"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">رقم الإيصال / السند *</Label>
                  <Input
                    value={formData.receiptNo}
                    onChange={(e) => setFormData((prev) => ({ ...prev, receiptNo: e.target.value }))}
                    className="h-10 text-xs font-mono font-bold rounded-xl"
                    placeholder="INS-XXXX / LAB-XXXX"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">المبلغ المسدد (ج.م) *</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                    className="h-10 text-xs font-mono font-bold rounded-xl text-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">الجهة / المكتب الصادر منه *</Label>
                  <Input
                    value={formData.entityName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, entityName: e.target.value }))}
                    className="h-10 text-xs rounded-xl"
                    placeholder="مكتب تأمينات المقاولات / مديرية القوى العاملة"
                  />
                </div>

                <div className="space-y-1.5">
                  <SmartArabicDatePicker
                    label="تاريخ السداد"
                    required
                    value={formData.date}
                    onChange={(val) => setFormData((prev) => ({ ...prev, date: val }))}
                    outputFormat="iso"
                  />
                </div>
              </div>

              {formData.type === "HANDOVER" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-purple-800 dark:text-purple-300">اسم المستلم بالجهة</Label>
                    <Input
                      value={formData.recipientName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, recipientName: e.target.value }))}
                      className="h-9 text-xs rounded-xl"
                      placeholder="اسم الموظف أو رئيس قسم الحسابات"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-purple-800 dark:text-purple-300">صفة أو وظيفة المستلم</Label>
                    <Input
                      value={formData.recipientRole}
                      onChange={(e) => setFormData((prev) => ({ ...prev, recipientRole: e.target.value }))}
                      className="h-9 text-xs rounded-xl"
                      placeholder="رئيس قسم الحسابات ومراجعة العقود"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">ملاحظات واعتماد الشهادة</Label>
                <Textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="text-xs rounded-xl"
                  placeholder="تدوين أية تفاصيل خاصة برقم الخطاب أو المرفقات..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddModalOpen(false)}
                className="rounded-xl px-4 text-xs cursor-pointer"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={handleSaveNewCard}
                disabled={savingRecord}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 text-xs font-bold cursor-pointer"
              >
                {savingRecord ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <span>حفظ البطاقة بالسجل 💾</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━ MODAL: تعديل بطاقة مسجلة ━━━ */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-card text-card-foreground border border-border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center font-bold text-sm">
                  <Edit className="h-4 w-4" />
                </div>
                <h3 className="font-black text-sm sm:text-base text-foreground">
                  تعديل بطاقة تأمينات / سداد
                </h3>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">عنوان أو بيان السجل *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="h-10 text-xs rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">رقم الإيصال / السند *</Label>
                  <Input
                    value={formData.receiptNo}
                    onChange={(e) => setFormData((prev) => ({ ...prev, receiptNo: e.target.value }))}
                    className="h-10 text-xs font-mono font-bold rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">المبلغ المسدد (ج.م) *</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                    className="h-10 text-xs font-mono font-bold rounded-xl text-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">الجهة / المكتب الصادر منه *</Label>
                  <Input
                    value={formData.entityName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, entityName: e.target.value }))}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <SmartArabicDatePicker
                    label="تاريخ السداد"
                    required
                    value={formData.date}
                    onChange={(val) => setFormData((prev) => ({ ...prev, date: val }))}
                    outputFormat="iso"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">حالة السداد والاعتماد</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: any) =>
                    setFormData((prev) => ({ ...prev, status: val }))
                  }
                >
                  <SelectTrigger className="h-10 text-xs rounded-xl font-bold">
                    <SelectValue placeholder="حالة السداد">
                      {formData.status === "PAID"
                        ? "تم السداد واستخراج الشهادة ✓"
                        : "قيد المتابعة والسداد"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAID">تم السداد واستخراج الشهادة ✓</SelectItem>
                    <SelectItem value="PENDING">قيد المتابعة والسداد</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">ملاحظات واعتماد الشهادة</Label>
                <Textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(false)}
                className="rounded-xl px-4 text-xs cursor-pointer"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEditCard}
                disabled={savingRecord}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 text-xs font-bold cursor-pointer"
              >
                {savingRecord ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <span>حفظ التعديلات 💾</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━ MODAL: معاينة تفاصيل البطاقة (STRICTLY NO PRINT BUTTON) ━━━ */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-card text-card-foreground border border-border rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 flex items-center justify-center font-bold text-sm">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-foreground">
                    تفاصيل بطاقة السداد والشهادة
                  </h3>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    رقم السند: {viewingRecord.receiptNo}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingRecord(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-muted-foreground block font-bold">المبلغ المسدد بالجنيه:</span>
                  <span className="text-2xl font-black font-mono text-teal-600 dark:text-teal-400">
                    {formatCurrency(viewingRecord.amount)}
                  </span>
                  {viewingRecord.amount > 0 && (
                    <span className="text-[11px] text-foreground block font-semibold mt-0.5">
                      {tafqeetArabic(viewingRecord.amount)}
                    </span>
                  )}
                </div>
                <Badge className="badge-teal text-xs font-bold">
                  {viewingRecord.status === "PAID" ? "مسدد ومعتمد ✓" : "قيد المراجعة"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-muted/40 border border-border">
                <div>
                  <span className="text-muted-foreground block text-[11px]">البيان:</span>
                  <span className="font-bold text-foreground">{viewingRecord.title}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">الجهة / المكتب:</span>
                  <span className="font-bold text-foreground">{viewingRecord.entityName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">رقم الإيصال:</span>
                  <span className="font-mono font-bold text-foreground">{viewingRecord.receiptNo}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">تاريخ السداد / التسليم:</span>
                  <span className="font-mono font-bold text-foreground">{formatDate(viewingRecord.date)}</span>
                </div>
              </div>

              {viewingRecord.recipientName && (
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
                  <span className="font-bold text-purple-800 dark:text-purple-300 block mb-0.5">بيانات المستلم بالجهة:</span>
                  <p className="text-foreground">
                    {viewingRecord.recipientName} {viewingRecord.recipientRole ? `— (${viewingRecord.recipientRole})` : ""}
                  </p>
                </div>
              )}

              {viewingRecord.notes && (
                <div className="p-3 rounded-xl bg-muted/30 border border-border text-xs space-y-1">
                  <span className="font-bold text-muted-foreground block">ملاحظات البراءة والاعتماد:</span>
                  <p className="text-foreground leading-relaxed">{viewingRecord.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingRecord(null)}
                className="rounded-xl px-5 text-xs cursor-pointer"
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Continuity Action Footer */}
      <StepFooterNav currentTabId="insurances_labor" onNavigate={onNavigate} />
    </div>
  );
}
