"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Archive,
  Check,
  Eye,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   RECOVERY TAB (استرداد التأمين النهائي - Stepper 3 مراحل)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function TabRecovery({ op, onRefresh }: { op: Operation; onRefresh: () => void }) {
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
   ARCHIVE TAB (الأرشيف الذكي لكامل العملية)
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
   MAIN TAB CLOSE COMPONENT
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
    <div className="space-y-6 animate-fade-in">
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

      {/* Continuity Action Footer (التسجيل 1 & 2) */}
      <StepFooterNav
        currentTabId="close"
        onNavigate={onNavigate}
      />
    </div>
  );
}
