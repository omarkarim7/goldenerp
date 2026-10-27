"use client";

import React, { useState, useMemo } from "react";
import {
  Truck, Receipt, Clock, Calendar, ShieldCheck, Scale,
  FolderOpen, FileText, Paperclip, Loader2, Edit, Trash2, X, Eye, Download, Plus, Check, ArrowRight, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Portal } from "@/components/ui/portal";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  Operation, SectionCard, DataRow, EmptyState, FileUploadZone,
  formatCurrency, formatDate, formatDocFileSize, tafqeetArabic, getCountdown
} from "./types";
import { StepFooterNav } from "./StepFooterNav";
import { SmartArabicDatePicker } from "@/components/ui/arabic-date-picker";

export function TabSupplyOrder({
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

  // Edit State
  const [editingSupplyOrder, setEditingSupplyOrder] = useState<any | null>(null);
  const [savingEditSupplyOrder, setSavingEditSupplyOrder] = useState(false);

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

  // Check award info
  const winningAward = (op.awards || []).find((a: any) => a.isOurCompany) || op.awards?.[0];
  const awardAmount = Number(winningAward?.winnerPrice || 0);

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
    <div className="space-y-6">
      {/* ━━━ Hero Banner ━━━ */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-700 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-white/20 text-white border-white/30 text-xs font-bold px-2.5 py-0.5 backdrop-blur-md">
              المرحلة #13: أمر التوريد والتعاقد الرسمي
            </Badge>
            <span className="text-xs text-white/80">
              {(op.supplyOrders || []).length} أمر توريد مسجل
            </span>
            {deliveryDeadlineDate && (
              <Badge className="bg-emerald-400 text-emerald-950 font-bold text-xs px-2 py-0.5">
                موعد التسليم مثبت: {formatDate(deliveryDeadlineDate.dateValue || deliveryDeadlineDate.date)}
              </Badge>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight">
            أمر التوريد والتعاقد الصادر من جهة الإسناد
          </h2>
          <p className="text-xs text-white/90 max-w-2xl leading-relaxed">
            تسجيل رقم وتاريخ أمر التوريد، احتساب مدة التوريد القانونية تلقائياً، تثبيت الموعد النهائي للتنفيذ، ورفع المستندات الرسمية المعتمدة.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          <Button
            size="sm"
            onClick={() => setAddingSupplyOrder(!addingSupplyOrder)}
            className="bg-white hover:bg-white/90 text-blue-900 font-bold text-xs h-9 px-4 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>{addingSupplyOrder ? "إلغاء النموذج" : "تسجيل أمر توريد جديد"}</span>
          </Button>

          {onNavigate && (
            <Button
              size="sm"
              onClick={() => onNavigate("guarantee_final")}
              className="bg-slate-900 hover:bg-black text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <span>مرحلة التأمين النهائي (5%)</span>
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* ━━━ Summary Stats Strip ━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <span className="text-xs text-muted-foreground block mb-1 font-medium">قيمة الترسية المعتمدة</span>
          <span className="text-lg font-black text-foreground block">
            {formatCurrency(awardAmount)}
          </span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">
            {winningAward ? `الفائز: ${winningAward.winnerName}` : "في انتظار تسجيل الترسية"}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <span className="text-xs text-muted-foreground block mb-1 font-medium">أوامر التوريد الصادرة</span>
          <span className="text-lg font-black text-blue-600 dark:text-blue-400 block">
            {(op.supplyOrders || []).length} أمر رسمي
          </span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">
            {op.supplyOrders?.[0] ? `أحدث أمر: ${op.supplyOrders[0].orderNumber}` : "لم يتم تسجيل أوامر بعد"}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <span className="text-xs text-muted-foreground block mb-1 font-medium">الموعد النهائي لانتهاء التوريد</span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 block">
            {deliveryDeadlineDate ? formatDate(deliveryDeadlineDate.dateValue || deliveryDeadlineDate.date) : "غير محدد بعد"}
          </span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">
            {deliveryDeadlineDate ? getCountdown(deliveryDeadlineDate.dateValue || deliveryDeadlineDate.date).text : "يتم حسابه عند إدخال مدة التوريد"}
          </span>
        </div>
      </div>

      {/* ━━━ Supply Order Registration Form ━━━ */}
      {addingSupplyOrder && (
        <div className="p-5 rounded-3xl bg-card border-2 border-blue-500/30 shadow-xl space-y-5 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center font-bold">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-foreground text-base">تسجيل أمر توريد وتعاقد رسمي جديد</h3>
                <p className="text-xs text-muted-foreground">أدخل تفاصيل أمر التوريد الصادر من جهة الإسناد لتثبيت المواعيد وبدء التوريد</p>
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setAddingSupplyOrder(false)} className="rounded-full h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">رقم أمر التوريد الرسمي *</Label>
              <Input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="مثال: PO-2026-089"
                className="h-10 text-xs font-mono font-bold rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <SmartArabicDatePicker
                label="تاريخ صدور أمر التوريد"
                required
                value={orderDate}
                onChange={(val) => setOrderDate(val)}
                outputFormat="iso"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">الشركة المنفذة للتوريد</Label>
              <Select value={supplyCompanyId} onValueChange={setSupplyCompanyId}>
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue placeholder="اختر الشركة">
                    {(() => {
                      const sel = (op.companies || []).find((c: any) => (c.companyId || c.id) === supplyCompanyId);
                      return sel ? `${sel.company?.name || `شركة (${sel.displayCode})`} (${sel.displayCode})` : "اختر الشركة";
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {(op.companies || []).map((c: any) => (
                    <SelectItem key={c.companyId || c.id} value={c.companyId || c.id}>
                      {c.company?.name || `شركة (${c.displayCode})`} ({c.displayCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>مدة التوريد المحددة بأمر التوريد واحتساب الموعد النهائي تلقائياً</span>
              </Label>
              {calculatedDeliveryDeadline && (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                  تاريخ الانتهاء المحسوب: {formatDate(calculatedDeliveryDeadline)} ({getCountdown(calculatedDeliveryDeadline).text})
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  value={supplyDurationValue}
                  onChange={(e) => setSupplyDurationValue(e.target.value)}
                  placeholder="المدة"
                  className="h-10 text-xs font-bold rounded-xl w-32"
                />
                <Select value={supplyDurationUnit} onValueChange={(val: any) => setSupplyDurationUnit(val)}>
                  <SelectTrigger className="h-10 text-xs rounded-xl w-28">
                    <SelectValue>
                      {supplyDurationUnit === "DAYS" ? "أيام" : "شهور"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="DAYS">أيام</SelectItem>
                    <SelectItem value="MONTHS">شهور</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="syncDeliveryDate"
                  checked={syncDeliveryDate}
                  onChange={(e) => setSyncDeliveryDate(e.target.checked)}
                  className="rounded h-4 w-4 text-blue-600 cursor-pointer"
                />
                <label htmlFor="syncDeliveryDate" className="text-xs font-medium text-foreground cursor-pointer select-none">
                  تثبيت الموعد المحسوب تلقائياً في جدول مواعيد العملية وتفعيل التنبيهات الذكية
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">رفع مستند أمر التوريد الرسمي (PDF أو صورة)</Label>
              <div className="p-3 border-2 border-dashed border-border hover:border-blue-500 rounded-2xl text-center space-y-2 transition-all">
                <input
                  type="file"
                  id="supply-file-input"
                  className="hidden"
                  onChange={(e) => setSupplyOrderFile(e.target.files?.[0] || null)}
                />
                <label
                  htmlFor="supply-file-input"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  <span>{supplyOrderFile ? supplyOrderFile.name : "اختر ملف أمر التوريد"}</span>
                </label>
                {supplyOrderFile && (
                  <p className="text-[11px] text-emerald-600 font-bold block">
                    تم اختيار الملف: {supplyOrderFile.name} ({Math.round(supplyOrderFile.size / 1024)} KB)
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">ملاحظات وشروط التوريد</Label>
              <Textarea
                rows={3}
                value={supplyNotes}
                onChange={(e) => setSupplyNotes(e.target.value)}
                placeholder="مكان التسليم، شروط الشحن، طريقة الفحص، أو أي بنود خاصة..."
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button variant="outline" onClick={() => setAddingSupplyOrder(false)} className="h-9.5 text-xs rounded-xl">
              إلغاء
            </Button>
            <Button
              onClick={handleSaveSupplyOrder}
              disabled={savingSupplyOrder}
              className="h-9.5 px-5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
            >
              {savingSupplyOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>حفظ أمر التوريد وتثبيت المواعيد</span>
            </Button>
          </div>
        </div>
      )}

      {/* ━━━ Recorded Supply Orders List ━━━ */}
      <SectionCard
        title="أوامر التوريد والعقود المسجلة للعملية"
        icon={Receipt}
        iconColor="text-blue-600"
        badge={
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs font-bold">
            {(op.supplyOrders || []).length} أمر مسجل
          </Badge>
        }
      >
        {op.supplyOrders && op.supplyOrders.length > 0 ? (
          <div className="space-y-3">
            {op.supplyOrders.map((so: any) => (
              <div
                key={so.id}
                className="p-4 sm:p-5 rounded-2xl bg-card border border-border hover:border-blue-400/50 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-500/15 text-blue-600 flex items-center justify-center font-bold shrink-0">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-foreground text-sm font-mono">
                        أمر توريد رقم: {so.orderNumber}
                      </h4>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-bold">
                        تاريخ الصدور: {formatDate(so.orderDate)}
                      </Badge>
                    </div>
                    {so.notes && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {so.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingSupplyOrder(so)}
                    className="h-8.5 w-8.5 p-0 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    title="تعديل أمر التوريد"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteSupplyOrder(so.id)}
                    className="h-8.5 w-8.5 p-0 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="حذف أمر التوريد"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Truck}
            text="لم يتم تسجيل أمر التوريد بعد"
            subtext="سجّل رقم وتاريخ أمر التوريد الصادر من الجهة واحتسب مدة التنفيذ للبدء في تسليم الشحنات ومتابعة الفحص"
          />
        )}
      </SectionCard>

      {/* ━━━ Edit Modal ━━━ */}
      {editingSupplyOrder && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
            <div className="bg-card text-card-foreground border border-border rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Edit className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-foreground text-sm">تعديل بيانات أمر التوريد</h4>
                </div>
                <button onClick={() => setEditingSupplyOrder(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">رقم أمر التوريد</Label>
                  <Input
                    value={editingSupplyOrder.orderNumber}
                    onChange={(e) => setEditingSupplyOrder({ ...editingSupplyOrder, orderNumber: e.target.value })}
                    className="h-9.5 text-xs font-mono font-bold rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <SmartArabicDatePicker
                    label="تاريخ أمر التوريد"
                    value={editingSupplyOrder.orderDate ? editingSupplyOrder.orderDate.split("T")[0] : ""}
                    onChange={(val) => setEditingSupplyOrder({ ...editingSupplyOrder, orderDate: val })}
                    outputFormat="iso"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">ملاحظات وشروط إضافية</Label>
                  <Textarea
                    rows={3}
                    value={editingSupplyOrder.notes || ""}
                    onChange={(e) => setEditingSupplyOrder({ ...editingSupplyOrder, notes: e.target.value })}
                    className="text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button size="sm" variant="outline" onClick={() => setEditingSupplyOrder(null)} className="text-xs rounded-xl">
                  إلغاء
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpdateSupplyOrder}
                  disabled={savingEditSupplyOrder}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 rounded-xl shadow-xs"
                >
                  {savingEditSupplyOrder ? "جاري الحفظ..." : "حفظ التعديلات"}
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ━━━ Footer Navigation ━━━ */}
      <StepFooterNav
        currentTabId="supply_order"
        onNavigate={onNavigate}
        nextLabel="الانتقال إلى: #14 التأمين النهائي (5%) ➔"
        prevLabel="← قرار الترسية الرسمي"
      />
    </div>
  );
}
