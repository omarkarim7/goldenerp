"use client";

import React, { useState, useMemo } from "react";
import {
  Trophy, Receipt, Clock, Calendar, ShieldCheck, Scale,
  FolderOpen, FileText, Paperclip, Loader2, Edit, Trash2, X, Eye, Download, Plus, Check, ArrowLeft, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Portal } from "@/components/ui/portal";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  Operation, SectionCard, DataRow, EmptyState, FileUploadZone,
  formatCurrency, formatDate, formatDocFileSize, tafqeetArabic
} from "./types";
import { StepFooterNav } from "./StepFooterNav";

export function TabAward({
  op,
  onRefresh,
  onNavigate,
  onGoGuarantee,
  onPreviewDoc,
  onDownloadDoc,
}: {
  op: Operation;
  onRefresh: () => void;
  onNavigate?: (tabId: string) => void;
  onGoGuarantee?: () => void;
  onPreviewDoc?: (doc: any) => void;
  onDownloadDoc?: (doc: any) => void;
}) {
  // Award Form State
  const [addingAward, setAddingAward] = useState(false);
  const [winnerName, setWinnerName] = useState(op.companies?.[0]?.company?.name || "شركة جولدن");
  const [winnerPrice, setWinnerPrice] = useState("850000");
  const [isOurCompany, setIsOurCompany] = useState(true);
  const [companyId, setCompanyId] = useState(op.companies?.[0]?.companyId || "");
  const [awardDate, setAwardDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [awardLetterFile, setAwardLetterFile] = useState<File | null>(null);
  const [savingAward, setSavingAward] = useState(false);

  // Edit State
  const [editingAward, setEditingAward] = useState<any | null>(null);
  const [savingEditAward, setSavingEditAward] = useState(false);

  // Check if our company won
  const ourWinningAward = (op.awards || []).find((a: any) => a.isOurCompany);
  const hasWonTender = Boolean(ourWinningAward);
  const mainAwardAmount = Number(ourWinningAward?.winnerPrice || op.awards?.[0]?.winnerPrice || 0);
  const finalGuaranteeAmount = Math.round(mainAwardAmount * 0.05);

  // Filter award documents
  const awardDocs = useMemo(() => {
    return (op.documents || []).filter(
      (d: any) =>
        d.type === "LETTER" ||
        d.type === "AWARD" ||
        d.fileName?.includes("ترسية") ||
        d.fileName?.includes("قبول") ||
        d.fileName?.includes("إخطار")
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ━━━ Hero Banner ━━━ */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-white/20 text-white border-white/30 text-xs font-bold px-2.5 py-0.5 backdrop-blur-md">
              المرحلة #12: قرار الترسية الرسمي وإخطار القبول
            </Badge>
            <span className="text-xs text-white/80">
              {(op.awards || []).length} قرار ترسية مسجل
            </span>
            {hasWonTender && (
              <Badge className="bg-emerald-400 text-emerald-950 font-black text-xs px-2 py-0.5">
                فازت شركتنا بالترسية 🏆
              </Badge>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight">
            قرار الترسية وإخطار قبول العطاء الرسمي
          </h2>
          <p className="text-xs text-white/90 max-w-2xl leading-relaxed">
            تسجيل قرار لجنة البت الرسمي، اسم الشركة الفائزة، وقيمة الترسية الإجمالية، ثم الانتقال لمرحلة أمر التوريد والتعاقد.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          <Button
            size="sm"
            onClick={() => setAddingAward(!addingAward)}
            className="bg-white hover:bg-white/90 text-amber-950 font-bold text-xs h-9 px-4 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <Trophy className="h-4 w-4" />
            <span>{addingAward ? "إلغاء النموذج" : "تسجيل قرار الترسية"}</span>
          </Button>

          {onNavigate && (
            <Button
              size="sm"
              onClick={() => onNavigate("supply_order")}
              className="bg-slate-900 hover:bg-black text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <span>مرحلة أمر التوريد والتعاقد ➔</span>
            </Button>
          )}
        </div>
      </div>

      {/* ━━━ Summary / Celebration Card ━━━ */}
      {hasWonTender && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-blue-500/10 border-2 border-amber-500/40 shadow-md space-y-3">
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

            <div className="flex items-center gap-2 shrink-0">
              {onNavigate && (
                <Button
                  onClick={() => onNavigate("supply_order")}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Receipt className="h-4 w-4" />
                  <span>الانتقال لأمر التوريد</span>
                </Button>
              )}
              {onGoGuarantee && (
                <Button
                  onClick={onGoGuarantee}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>سداد التأمين النهائي (5%)</span>
                </Button>
              )}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-card/80 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
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
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold">تم الإيداع بنجاح ✓</Badge>
              ) : (
                <Badge className="bg-amber-600 text-white text-[10px] font-bold animate-pulse">مطلوب الإيداع والسداد ⏳</Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ━━━ Add Award Decision Form ━━━ */}
      {addingAward && (
        <div className="p-5 rounded-3xl bg-card border-2 border-amber-500/30 space-y-4 animate-fade-in shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-600" />
              <span>تسجيل بيانات قرار الترسية وإخطار القبول الرسمي</span>
            </h4>
            <Button size="icon" variant="ghost" onClick={() => setAddingAward(false)} className="rounded-full h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">اسم الشركة الفائزة *</Label>
              <Input
                value={winnerName}
                onChange={(e) => setWinnerName(e.target.value)}
                className="h-10 text-sm font-bold"
                placeholder="اسم الشركة الفائزة بالعطاء"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">قيمة الترسية الإجمالية (بالجنيه) *</Label>
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
              <Label className="text-xs font-bold text-foreground">تاريخ إخطار / قرار الترسية *</Label>
              <Input
                type="date"
                value={awardDate}
                onChange={(e) => setAwardDate(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 p-2.5 rounded-xl bg-muted/40 border border-border">
            <input
              type="checkbox"
              id="isOurAwardCheck"
              checked={isOurCompany}
              onChange={(e) => setIsOurCompany(e.target.checked)}
              className="rounded h-4 w-4 text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <label htmlFor="isOurAwardCheck" className="text-xs font-bold text-foreground cursor-pointer select-none">
              الترسية على إحدى شركات مجموعتنا (مجموعة جولدن) 🏆
            </label>
          </div>

          {isOurCompany && (
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">اختر شركة المجموعة الفائزة</Label>
              <Select
                value={companyId}
                onValueChange={(val) => {
                  setCompanyId(val);
                  const selected = (op.companies || []).find((c: any) => (c.companyId || c.id) === val);
                  if (selected?.company?.name) {
                    setWinnerName(selected.company.name);
                  }
                }}
              >
                <SelectTrigger className="h-10 text-sm font-medium">
                  <SelectValue placeholder="اختر الشركة">
                    {(() => {
                      const sel = (op.companies || []).find((c: any) => (c.companyId || c.id) === companyId);
                      return sel ? `${sel.company?.name || `شركة (${sel.displayCode})`} (${sel.displayCode})` : "اختر الشركة";
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(op.companies || []).map((c: any) => (
                    <SelectItem key={c.companyId || c.id} value={c.companyId || c.id}>
                      {c.company?.name || `شركة (${c.displayCode})`} ({c.displayCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs font-bold text-foreground">ملاحظات وسند خطاب الترسية</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثلاً: بموجب كتاب الهيئة العامة رقم 124 وبناءً على جلسة البت المالي"
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
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
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold px-5"
            >
              {savingAward ? (
                <>
                  <Loader2 className="h-4 w-4 ml-1.5 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                "حفظ قرار الترسية ✓"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ━━━ Recorded Awards List ━━━ */}
      <SectionCard
        title="قرارات الترسية المسجلة للعملية"
        icon={Trophy}
        iconColor="text-amber-600"
        badge={
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-bold">
            {(op.awards || []).length} قرار ترسية
          </Badge>
        }
      >
        {op.awards && op.awards.length > 0 ? (
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
                          ? "🏆 فازت شركتنا بالترسية — يلزم الانتقال لأمر التوريد واستكمال التأمين النهائي (5%)"
                          : "الترسية على شركة منافسة خارجية"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge className={a.isOurCompany ? "bg-amber-600 text-white text-[10px] font-bold" : "bg-muted text-foreground"}>
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

        {/* Award Documents Archive */}
        {awardDocs.length > 0 && (
          <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-3 mt-4">
            <h5 className="font-bold text-xs text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5 text-amber-600" />
                <span>مستندات الترسية المرفوعة ({awardDocs.length})</span>
              </span>
              <Badge variant="outline" className="text-[9px] font-mono">أرشيف رسمي</Badge>
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {awardDocs.map((doc: any) => (
                <div
                  key={doc.id}
                  className="p-3 rounded-xl bg-card border border-border flex items-center justify-between gap-2 text-xs"
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
      </SectionCard>

      {/* ━━━ Edit Award Modal ━━━ */}
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

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">ملاحظات وسند الترسية</label>
                  <input
                    type="text"
                    value={editingAward.notes || ""}
                    onChange={(e) => setEditingAward({ ...editingAward, notes: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
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

      {/* ━━━ Footer Navigation ━━━ */}
      <StepFooterNav
        currentTabId="award"
        onNavigate={onNavigate}
        nextLabel="الانتقال إلى: #13 أمر التوريد والتعاقد ➔"
        prevLabel="← نتيجة البت المالي والترتيب"
      />
    </div>
  );
}
