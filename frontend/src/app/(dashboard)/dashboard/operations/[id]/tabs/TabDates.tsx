"use client";

import React, { useState } from "react";
import {
  Calendar, Clock, Plus, Edit, Trash2, X, CheckCircle2,
  LayoutGrid, LayoutList, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/lib/api";
import { ArabicDateTimePicker } from "@/components/ui/arabic-date-picker";
import {
  Operation, SectionCard, EmptyState, formatDate, formatDateTime,
  getCountdown, DATE_TYPE_LABELS
} from "./types";
import { StepFooterNav } from "./StepFooterNav";

export function TabDates({
  op,
  onRefresh,
  onNavigate,
}: {
  op: Operation;
  onRefresh: () => void;
  onNavigate: (tabId: string) => void;
}) {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [adding, setAdding] = useState(false);
  const [dateType, setDateType] = useState("PUBLICATION");
  const [dateValue, setDateValue] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDateType, setEditDateType] = useState("TECHNICAL_OPENING");
  const [editDateValue, setEditDateValue] = useState("");
  const [editDateLabel, setEditDateLabel] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirmation
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

    setTimeout(() => {
      const el = document.getElementById("date-edit-panel");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDateType("TECHNICAL_OPENING");
    setEditDateValue("");
    setEditDateLabel("");
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
    <div className="space-y-6 animate-fade-in">
      <SectionCard
        title="التواريخ الحرجة والتنبيهات الرسمية"
        icon={Calendar}
        iconColor="text-indigo-600"
        badge={<Badge className="bg-blue-600/10 text-blue-700 dark:text-blue-300 border-blue-500/20 text-xs">{op.dates?.length || 0} مواعيد مسجلة</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-border shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                  viewMode === "table" ? "bg-blue-600 text-white shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
                title="عرض كجدول رسمي"
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                  viewMode === "grid" ? "bg-blue-600 text-white shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
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
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 px-3 rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{adding ? "إغلاق النموذج" : "إضافة موعد جديد"}</span>
            </Button>
          </div>
        }
      >
        {/* Add date form */}
        {adding && (
          <div id="date-add-panel" className="p-4 sm:p-5 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-4 mb-4 animate-fade-in shadow-sm scroll-mt-28">
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>تسجيل موعد وجلسة رسمية للعملية</span>
              </h4>
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

        {/* Edit date panel */}
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

        {/* Dates list */}
        {op.dates?.length > 0 ? (
          viewMode === "grid" ? (
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
                        ? "bg-rose-500/10 dark:bg-rose-950/25 border-rose-500/40 hover:border-rose-500/60 shadow-xs"
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
                          <Badge className="bg-rose-600 text-white font-bold text-[10px] px-2.5 py-0.5">
                            انتهى الموعد ⌛
                          </Badge>
                        ) : cd.urgent ? (
                          <Badge className="badge-amber text-[10px] animate-pulse">عاجل ⚠️</Badge>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-bold px-2.5 py-1.5 rounded-lg border font-mono bg-muted text-foreground border-border">
                          {formatDateTime(d.dateValue || d.date)}
                        </span>
                        <span className={`text-xs font-bold flex items-center gap-1 ${
                          isExpired ? "text-rose-600" : cd.urgent ? "text-amber-600" : "text-blue-600"
                        }`}>
                          <Clock className="h-3.5 w-3.5 inline ml-1" />
                          <span>{cd.text}</span>
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/70 flex items-center justify-between gap-2">
                      {isConfirmingDelete ? (
                        <div className="flex items-center justify-between w-full bg-rose-500/15 p-2 rounded-xl">
                          <span className="text-xs font-bold text-rose-700">تأكيد حذف الموعد؟</span>
                          <div className="flex items-center gap-1.5">
                            <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)} className="h-7 px-2 text-xs">إلغاء</Button>
                            <Button size="sm" onClick={() => handleDeleteDate(d.id)} disabled={isDeleting} className="h-7 px-3 bg-rose-600 text-white font-bold text-xs">
                              {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "حذف"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end w-full gap-1.5">
                          <Button variant="outline" size="sm" onClick={() => handleStartEdit(d)} className="h-7.5 px-2.5 text-xs font-bold rounded-lg border-border">
                            <Edit className="h-3 w-3 text-blue-600 ml-1" />
                            <span>تعديل</span>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(d.id)} className="h-7.5 px-2 text-xs font-bold rounded-lg text-rose-600">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border shadow-xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-muted text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-3 px-4 font-bold">مسمى الموعد / الجلسة</th>
                    <th className="py-3 px-4 font-bold">التاريخ والتوقيت</th>
                    <th className="py-3 px-4 font-bold">المتبقي / الموقف</th>
                    <th className="py-3 px-4 text-center font-bold">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {op.dates.map((d: any) => {
                    const cd = getCountdown(d.dateValue || d.date);
                    return (
                      <tr key={d.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-bold text-foreground">{d.label || DATE_TYPE_LABELS[d.dateType || d.type]}</td>
                        <td className="py-3 px-4 font-mono">{formatDateTime(d.dateValue || d.date)}</td>
                        <td className="py-3 px-4 font-bold">{cd.text}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleStartEdit(d)} className="h-7 w-7 p-0">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteDate(d.id)} className="h-7 w-7 p-0 text-rose-500">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

      {/* ━━━ STEP FOOTER NAVIGATION ━━━ */}
      <StepFooterNav
        currentTabId="dates"
        onNavigate={onNavigate}
        nextLabel="الانتقال إلى: #3 دراسة السوق والجدوى ➔"
        prevLabel="← العودة للبيانات الأساسية"
      />
    </div>
  );
}
