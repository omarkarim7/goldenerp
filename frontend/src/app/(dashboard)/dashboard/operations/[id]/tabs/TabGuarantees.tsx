"use client";

import React, { useState } from "react";
import {
  Shield,
  ShieldCheck,
  Plus,
  Edit,
  Trash2,
  Printer,
  Archive,
  Receipt,
  Upload,
  Loader2,
  CheckCircle2,
  FileText,
  Eye,
  Download,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Portal } from "@/components/ui/portal";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  Operation,
  SectionCard,
  DataRow,
  EmptyState,
  FileUploadZone,
  formatCurrency,
  formatDate,
  formatDocFileSize,
  getCountdown,
  tafqeetArabic,
} from "./types";
import { StepFooterNav } from "./StepFooterNav";

export function TabGuarantees({
  op,
  type,
  title,
  onRefresh,
  onNavigate,
  onPreviewDoc,
  onDownloadDoc,
}: {
  op: Operation;
  type: "INITIAL" | "FINAL";
  title: string;
  onRefresh: () => void;
  onNavigate?: (tabId: string) => void;
  onPreviewDoc?: (doc: any) => void;
  onDownloadDoc?: (doc: any) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [companyId, setCompanyId] = useState(op.companies?.[0]?.companyId || "");
  const [paymentMethod, setPaymentMethod] = useState("BANK_GUARANTEE");

  // Auto calculate 5% if final guarantee based on award price
  const awardedPrice = Number(op.awards?.[0]?.winnerPrice) || 850000;
  const defaultAmount = type === "FINAL" ? String(Math.round(awardedPrice * 0.05)) : "15000";

  const [amount, setAmount] = useState(defaultAmount);
  const [percentage, setPercentage] = useState(type === "INITIAL" ? "1.5" : "5");
  const [bankName, setBankName] = useState("البنك الأهلي المصري");
  const [bankBranch, setBankBranch] = useState("الفرع الرئيسي");
  const [guaranteeNumber, setGuaranteeNumber] = useState(`LG-${Date.now().toString().slice(-6)}`);
  const [paymentDeadlineDays, setPaymentDeadlineDays] = useState("10");
  const [validityDurationMonths, setValidityDurationMonths] = useState(type === "FINAL" ? "12" : "3");
  const [duesReference, setDuesReference] = useState("مستحقات العملية السابقة رقم 24/2024 ومستخلص جاري الصرف");
  const [finalLetterModalOpen, setFinalLetterModalOpen] = useState(false);
  const [savingFinalLetter, setSavingFinalLetter] = useState(false);
  const [saving, setSaving] = useState(false);

  // Receipt Upload for Final Guarantee
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptNumberInput, setReceiptNumberInput] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");

  const handleUploadGuaranteeReceipt = async () => {
    if (!receiptFile) {
      toast.error("يرجى اختيار ملف وصل سداد التأمين النهائي أولاً");
      return;
    }
    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append("file", receiptFile);
      formData.append("type", "RECEIPT");
      formData.append("companyId", op.companies?.[0]?.companyId || "");
      const fileNameStr = receiptNumberInput
        ? `وصل سداد التأمين النهائي 5% رقم (${receiptNumberInput})`
        : `وصل سداد التأمين النهائي 5% - ${op.serialNumber}`;
      formData.append("fileName", fileNameStr);

      await api.post(`/operations/${op.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("تم رفع وتوثيق وصل سداد التأمين النهائي بنجاح! 🧾✓");
      setReceiptFile(null);
      setReceiptNumberInput("");
      setReceiptNotes("");
      onRefresh();
    } catch {
      toast.error("فشل رفع وصل سداد التأمين");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const finalGuaranteeDocs = (op.documents || []).filter(
    (d: any) =>
      d.fileName?.includes("التأمين النهائي") ||
      d.fileName?.includes("سداد التأمين") ||
      d.fileName?.includes("خطاب الضمان النهائي") ||
      (d.type === "RECEIPT" && (d.fileName?.includes("ضمان") || d.fileName?.includes("نهائي") || d.fileName?.includes("وصل")))
  );

  // Edit & Delete Guarantee State
  const [editingG, setEditingG] = useState<any | null>(null);
  const [savingEditG, setSavingEditG] = useState(false);

  const handleUpdateGuarantee = async () => {
    if (!editingG) return;
    setSavingEditG(true);
    try {
      await api.patch(`/operations/${op.id}/guarantees/${editingG.id}`, {
        amount: Number(editingG.amount),
        paymentMethod: editingG.paymentMethod,
        bankName: editingG.bankName,
        bankBranch: editingG.bankBranch,
        guaranteeNumber: editingG.guaranteeNumber,
        receiptNumber: editingG.receiptNumber,
        percentage: editingG.percentage ? Number(editingG.percentage) : undefined,
        startDate: editingG.startDate,
        endDate: editingG.endDate,
        duration: editingG.duration ? Number(editingG.duration) : undefined,
        notes: editingG.notes,
      });
      toast.success("تم تعديل بيانات الضمان والتأمين بنجاح! ✓");
      setEditingG(null);
      onRefresh();
    } catch {
      toast.error("فشل حفظ تعديلات التأمين");
    } finally {
      setSavingEditG(false);
    }
  };

  const handleDeleteGuarantee = async (gId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا التأمين/الضمان؟")) return;
    try {
      await api.delete(`/operations/${op.id}/guarantees/${gId}`);
      toast.success("تم حذف التأمين بنجاح 🗑️");
      onRefresh();
    } catch {
      toast.error("فشل حذف التأمين");
    }
  };

  const guarantees = op.guarantees?.filter((g: any) => g.type === type) || [];
  const gStatusMap: Record<string, string> = {
    ACTIVE: "ساري ونشط ✓",
    EXPIRING_SOON: "قارب على الانتهاء ⚠️",
    EXPIRED: "منتهي 🔴",
    RECOVERY_REQUESTED: "قيد الاسترداد ⏳",
    RECOVERED: "تم الاسترداد بنجاح 🟢",
  };
  const currentCompany = op.companies?.[0]?.company;

  const handleSaveGuarantee = async () => {
    setSaving(true);
    try {
      const validityDays = Number(validityDurationMonths || 12) * 30;
      await api.post(`/operations/${op.id}/guarantees`, {
        companyId,
        type,
        paymentMethod,
        amount: Number(amount),
        percentage: Number(percentage),
        bankName: paymentMethod === "BANK_GUARANTEE" ? bankName : undefined,
        bankBranch: paymentMethod === "BANK_GUARANTEE" ? bankBranch : undefined,
        guaranteeNumber: paymentMethod === "BANK_GUARANTEE" ? guaranteeNumber : undefined,
        notes: paymentMethod === "DEDUCTION_FROM_DUES" ? `خصم من المستحقات: ${duesReference}` : undefined,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + validityDays * 86400000).toISOString(),
      });

      if (type === "FINAL") {
        try {
          const deadlineDate = new Date(Date.now() + Number(paymentDeadlineDays || 10) * 86400000).toISOString();
          await api.post(`/operations/${op.id}/dates`, {
            title: "مهلة سداد التأمين النهائي (5%)",
            type: "FINAL_GUARANTEE_DEADLINE",
            date: deadlineDate,
            notes: "محددة بـ 10 أيام عمل من إخطار الترسية طبقاً للمادة 44 من قانون 182 لسنة 2018",
          });
        } catch {}
      }

      toast.success(`تم تسجيل ${title} وتحديث السريان والمواعيد بنجاح! 🛡️`);
      setAdding(false);
      onRefresh();
    } catch {
      toast.error("فشل تسجيل التأمين");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFinalLetterToDocs = async () => {
    setSavingFinalLetter(true);
    try {
      const html = generateFinalGuaranteeLetterHtml();
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const file = new File([blob], `خطاب_تقديم_التأمين_النهائي_${op.serialNumber}.html`, { type: "text/html" });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "RECEIPT");
      formData.append("companyId", op.companies?.[0]?.companyId || "");
      formData.append("fileName", `خطاب سداد وتقديم التأمين النهائي 5% (${formatCurrency(Number(amount))})`);

      await api.post(`/operations/${op.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("تم حفظ وتوثيق خطاب سداد التأمين النهائي بأرشيف العملية بنجاح! 🔒");
      setFinalLetterModalOpen(false);
      onRefresh();
    } catch {
      toast.error("فشل حفظ نسخة الخطاب بالأرشيف");
    } finally {
      setSavingFinalLetter(false);
    }
  };

  const generateFinalGuaranteeLetterHtml = () => {
    const methodDesc =
      paymentMethod === "BANK_GUARANTEE"
        ? `أصل خطاب ضمان بنكي نهائي غير مشروط رقم (${guaranteeNumber}) صادر عن ${bankName} (${bankBranch}) سارٍ لمدة (${validityDurationMonths}) شهراً`
        : paymentMethod === "CASH"
        ? "أصل إيصال توريد نقدي مسدد بخزينة الجهة الإدارية الموقرة"
        : `إشعار خصم رسمي معتمد من مستحقات شركتنا القائمة لديكم عن: ${duesReference}`;

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8"/>
        <title>خطاب سداد التأمين النهائي - ${op.serialNumber}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; color: #0f172a; margin: 0; padding: 20px; line-height: 1.7; }
          .header-box { display: flex; justify-content: space-between; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px; }
          .co-title { font-size: 18px; font-weight: 900; color: #047857; }
          .salute { font-size: 14px; font-weight: bold; margin-bottom: 15px; }
          .subject-box { background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 10px 14px; font-weight: bold; margin-bottom: 15px; border-radius: 6px; }
          .content { font-size: 13px; text-align: justify; margin-bottom: 20px; line-height: 1.9; }
          .data-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px; }
          .data-table th, .data-table td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: right; }
          .data-table th { background-color: #f1f5f9; font-weight: bold; }
          .sign-area { display: flex; justify-content: space-between; margin-top: 45px; }
          .sign-col { text-align: center; width: 45%; }
          .stamp-box { border: 2px dashed #94a3b8; height: 90px; border-radius: 8px; margin-top: 10px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div class="co-title">${currentCompany?.name || "اسم الشركة"}</div>
            <div style="font-size:11px;color:#475569;">سجل تجاري: ${currentCompany?.commercialRegister || "—"} | بطاقة ضريبية: ${currentCompany?.taxCard || "—"}</div>
          </div>
          <div style="font-size:12px;font-weight:bold;text-align:left;">
            <div>التاريخ: ${new Date().toLocaleDateString("ar-EG")}</div>
            <div>رقم الإشارة: LG-FIN-${Date.now().toString().slice(-4)}</div>
            <div>رقم العملية: ${op.externalNumber || op.serialNumber}</div>
          </div>
        </div>

        <div class="salute">
          <div>السيد الأستاذ / رئيس الإدارة المركزية للشؤون المالية والإدارية والتعاقدات</div>
          <div>${op.authority || "جهة الإسناد الموقرة"}</div>
          <div style="margin-top: 8px;">تحية طيبة وبعد ،،،</div>
        </div>

        <div class="subject-box">
          الموضوع: سداد وتقديم التأمين النهائي بنسبة (5%) للعملية رقم (${op.externalNumber || op.serialNumber}) بعنوان: "${op.name}"
        </div>

        <div class="content">
          بالإشارة إلى إخطار قبول العطاء والترسية الصادر من جهتكم الموقرة بشأن العملية المذكورة أعلاه؛
          <br/><br/>
          وطبقاً لأحكام القانون رقم 182 لسنة 2018 بشأن تنظيم التعاقدات التي تبرمها الجهات العامة ولائحته التنفيذية، وإعمالاً للمادة (44) بشأن وجوب أداء التأمين النهائي بنسبة 5% خلال المهلة القانونية المقررة؛
          <br/><br/>
          نتشرف بأن نرفق لسيادتكم طيه التأمين النهائي بمبلغ وقدره <strong>${formatCurrency(Number(amount))}</strong> (${tafqeetArabic(Number(amount))})، وبيانه كالتالي:
        </div>

        <table class="data-table">
          <tr>
            <th style="width: 35%;">القيمة الإجمالية للعقد الفائز</th>
            <td style="font-family: monospace; font-weight: bold;">${formatCurrency(awardedPrice)}</td>
          </tr>
          <tr>
            <th>نسبة التأمين النهائي</th>
            <td style="font-weight: bold; color: #047857;">5% (خمسة بالمائة)</td>
          </tr>
          <tr>
            <th>قيمة التأمين النهائي المسدد</th>
            <td style="font-weight: bold; font-family: monospace; color: #047857;">${formatCurrency(Number(amount))}</td>
          </tr>
          <tr>
            <th>طريقة وأداة السداد المرفقة</th>
            <td>${methodDesc}</td>
          </tr>
          <tr>
            <th>مدة سريان التأمين</th>
            <td>${validityDurationMonths} شهراً (حتى إتمام التوريد والاستلام النهائي للعملية)</td>
          </tr>
        </table>

        <div style="font-size: 13px; font-weight: bold; margin-bottom: 25px;">
          برجاء التكرم بالإحاطة واعتماد الاستلام تمهيداً لتوقيع العقد وإصدار أمر التوريد ،،،
        </div>

        <div class="sign-area">
          <div class="sign-col">
            <div><strong>المفوض بالتعاقدات والتوريدات</strong></div>
            <div style="margin-top: 5px;">أحمد محمد إبراهيم</div>
            <div style="font-size: 11px; color: #475569;">مدير إدارة المشتريات والعقود</div>
            <div style="margin-top: 15px; font-size: 11px;">التوقيع: ............................</div>
          </div>
          <div class="sign-col">
            <div><strong>خاتم الشركة الرسمي</strong></div>
            <div class="stamp-box">بصمة خاتم الشركة المعتمد</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionCard
        title={title}
        icon={type === "INITIAL" ? Shield : ShieldCheck}
        iconColor="text-emerald-600"
        badge={
          <div className="flex items-center gap-2">
            <Badge className="badge-emerald text-[10px] font-bold">
              {guarantees.length} تأمين مسجل
            </Badge>
            {type === "FINAL" && (
              <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                القيمة المقررة: 5% من العقد ({formatCurrency(Number(amount))})
              </Badge>
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {type === "FINAL" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setFinalLetterModalOpen(true)}
                className="text-xs font-bold h-8 rounded-xl border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>معاينة وطباعة خطاب سداد التأمين 5%</span>
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => setAdding(!adding)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>تسجيل {type === "INITIAL" ? "تأمين ابتدائي" : "تأمين نهائي 5%"}</span>
            </Button>
          </div>
        }
      >
        <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-foreground mb-2 flex items-center justify-between flex-wrap gap-2">
          <span>
            {type === "INITIAL"
              ? "التأمين الابتدائي يمثل 1% إلى 2% من القيمة التقديرية لكراسة الشروط ويسري لمدة 90 يوماً."
              : "التأمين النهائي يمثل 5% من القيمة الإجمالية للعقد الفائز، ويلزم سداده خلال 10 أيام عمل من إخطار الترسية طبقاً للمادة (44) من قانون 182 لسنة 2018."}
          </span>
          {type === "FINAL" && (
            <Badge className="bg-emerald-600 text-white text-[10px] font-mono">
              5% = {formatCurrency(Number(amount))}
            </Badge>
          )}
        </div>

        {adding && (
          <div className="p-4 rounded-xl bg-card border border-emerald-500/30 space-y-3 animate-fade-in shadow-lg">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              تسجيل بيانات الضمان والتأمين {type === "FINAL" ? "النهائي (5%)" : "الابتدائي"}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">الشركة المقدمة</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger className="h-10 text-sm font-medium">
                    <span>
                      {(() => {
                        const c = (op.companies || []).find((x: any) => x.companyId === companyId);
                        return c ? `${c.company.name} (${c.displayCode})` : "اختر الشركة";
                      })()}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {(op.companies || []).map((c: any) => (
                      <SelectItem key={c.companyId} value={c.companyId}>{c.company.name} ({c.displayCode})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">طريقة السداد المعتمدة</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v ?? "")}>
                  <SelectTrigger className="h-10 text-sm font-medium">
                    <span>
                      {paymentMethod === "BANK_GUARANTEE"
                        ? "أصل خطاب ضمان بنكي نهائي"
                        : paymentMethod === "CASH"
                        ? "سداد نقدي / إيصال توريد خزينة"
                        : "خصم رسمي من مستحقات قائمة"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK_GUARANTEE">أصل خطاب ضمان بنكي نهائي</SelectItem>
                    <SelectItem value="CASH">سداد نقدي / إيصال توريد خزينة</SelectItem>
                    <SelectItem value="DEDUCTION_FROM_DUES">خصم رسمي من مستحقات قائمة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">قيمة التأمين (ج.م) *</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="h-10 text-sm font-mono font-bold" />
              </div>
            </div>

            {type === "FINAL" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 bg-muted/20 p-3 rounded-xl border border-border">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">مهلة سداد التأمين (أيام عمل)</Label>
                  <Input
                    type="number"
                    value={paymentDeadlineDays}
                    onChange={(e) => setPaymentDeadlineDays(e.target.value)}
                    placeholder="10"
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">مدة سريان التأمين (شهور)</Label>
                  <Input
                    type="number"
                    value={validityDurationMonths}
                    onChange={(e) => setValidityDurationMonths(e.target.value)}
                    placeholder="12"
                    className="h-9 text-xs font-mono"
                  />
                </div>
                {paymentMethod === "DEDUCTION_FROM_DUES" && (
                  <div className="space-y-1 sm:col-span-3">
                    <Label className="text-xs font-bold">بيان ومستند المستحقات المطلوب الخصم منها</Label>
                    <Input
                      value={duesReference}
                      onChange={(e) => setDuesReference(e.target.value)}
                      placeholder="رقم العملية السابقة أو المستخلص الجاري"
                      className="h-9 text-xs"
                    />
                  </div>
                )}
              </div>
            )}

            {paymentMethod === "BANK_GUARANTEE" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs">اسم البنك</Label>
                  <Input value={bankName} onChange={e => setBankName(e.target.value)} className="h-10 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">الفرع</Label>
                  <Input value={bankBranch} onChange={e => setBankBranch(e.target.value)} className="h-10 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">رقم خطاب الضمان</Label>
                  <Input value={guaranteeNumber} onChange={e => setGuaranteeNumber(e.target.value)} className="h-10 text-sm font-mono" />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setAdding(false)} className="rounded-xl">إلغاء</Button>
              <Button size="sm" onClick={handleSaveGuarantee} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ بيانات الضمان"}
              </Button>
            </div>
          </div>
        )}

        {guarantees.length > 0 ? (
          <div className="space-y-3">
            {guarantees.map((g: any) => (
              <div key={g.id} className="p-4 rounded-xl bg-card border border-border space-y-2 hover:border-emerald-500/40 transition-colors">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">
                      {g.paymentMethod === "BANK_GUARANTEE" ? "خطاب ضمان بنكي" : g.paymentMethod === "CASH" ? "تأمين نقدي" : "خصم من المستحقات"}
                    </span>
                    <Badge className="badge-emerald text-[10px]">{gStatusMap[g.status] || g.status}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(Number(g.amount))}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingG(g)}
                      className="h-8 w-8 p-0 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl"
                      title="تعديل بيانات الضمان"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteGuarantee(g.id)}
                      className="h-8 w-8 p-0 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
                      title="حذف هذا الضمان"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {g.bankName && <DataRow label="البنك" value={`${g.bankName} — فرع ${g.bankBranch || "—"}`} />}
                {g.guaranteeNumber && <DataRow label="رقم خطاب الضمان" value={g.guaranteeNumber} mono />}
                {g.percentage && <DataRow label="النسبة" value={`${Number(g.percentage)}%`} />}
                {g.startDate && <DataRow label="تاريخ البداية" value={formatDate(g.startDate)} />}
                {g.endDate && (
                  <DataRow label="تاريخ النهاية" value={
                    <span className="flex items-center gap-2">
                      {formatDate(g.endDate)}
                      <span className={`text-[10px] font-bold ${getCountdown(g.endDate).urgent ? "text-rose-600" : "text-muted-foreground"}`}>
                        ({getCountdown(g.endDate).text})
                      </span>
                    </span>
                  } />
                )}
              </div>
            ))}
          </div>
        ) : !adding && (
          <EmptyState icon={Shield} text={`لا يوجد ${title} مسجل حتى الآن`} subtext={type === "INITIAL" ? "سجّل التأمين الابتدائي (1% أو 2%) قبل التقديم الرسمي" : "سجّل التأمين النهائي (5% من قيمة العقد) بعد صدور قرار الترسية"} />
        )}

        {/* FINAL GUARANTEE PAYMENT RECEIPT UPLOAD & ARCHIVE */}
        {type === "FINAL" && (
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-emerald-500/30 space-y-4 shadow-sm mt-4 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-border flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs sm:text-sm text-foreground">
                    رفع وتوثيق وصل سداد التأمين النهائي (خزينة الجهة أو البنك)
                  </h5>
                  <p className="text-[11px] text-muted-foreground">
                    إثبات سداد نسبة الـ 5% القانونية طبقاً للمادة 44 من قانون 182 لسنة 2018
                  </p>
                </div>
              </div>
              <Badge className="badge-emerald text-[10px]">
                {finalGuaranteeDocs.length} مستند موثق
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 bg-muted/20 p-3.5 rounded-xl border border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-xs font-semibold">رقم إيصال السداد / رقم الحوالة</Label>
                    <Input
                      value={receiptNumberInput}
                      onChange={(e) => setReceiptNumberInput(e.target.value)}
                      placeholder="مثال: REC-54921"
                      className="h-9 text-xs font-mono mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">ملاحظات السداد</Label>
                    <Input
                      value={receiptNotes}
                      onChange={(e) => setReceiptNotes(e.target.value)}
                      placeholder="خزينة الإدارة المركزية / تحويل بنكي"
                      className="h-9 text-xs mt-1"
                    />
                  </div>
                </div>

                <FileUploadZone
                  file={receiptFile}
                  onFileSelect={setReceiptFile}
                  placeholder="اسحب أو اختر صورة أو PDF لوصل سداد التأمين النهائي"
                  badgeText="إيصال رسمي"
                />

                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    onClick={handleUploadGuaranteeReceipt}
                    disabled={!receiptFile || uploadingReceipt}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-4 rounded-xl cursor-pointer"
                  >
                    {uploadingReceipt ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 ml-1" />
                    )}
                    أرشفة وحفظ وصل السداد
                  </Button>
                </div>
              </div>

              <div className="space-y-2 bg-muted/20 p-3.5 rounded-xl border border-border flex flex-col justify-between">
                <div>
                  <h6 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>الإيصالات والوثائق المسجلة بالأرشيف ({finalGuaranteeDocs.length})</span>
                  </h6>

                  {finalGuaranteeDocs.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {finalGuaranteeDocs.map((doc: any) => (
                        <div
                          key={doc.id}
                          className="p-2.5 rounded-xl bg-card border border-border flex items-center justify-between gap-2 text-xs hover:border-emerald-500/40 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
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
                                title="معاينة الإيصال"
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
                                title="تحميل الإيصال"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-xs">
                      لم يتم رفع صورة أو وصل سداد التأمين النهائي بعد
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/60">
                  🔒 يتم ربط إيصال السداد مباشرة بالملف الرقمي للعملية وإتاحته في حزمة المراجعة المالية.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EDIT GUARANTEE MODAL */}
        {editingG && (
          <Portal>
            <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
              <div className="bg-card text-card-foreground border border-border rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                      <Edit className="h-4 w-4" />
                    </div>
                    <h4 className="font-bold text-foreground text-sm">تعديل بيانات الضمان والتأمين</h4>
                  </div>
                  <button onClick={() => setEditingG(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">المبلغ (ج.م)</label>
                      <input
                        type="number"
                        value={editingG.amount}
                        onChange={(e) => setEditingG({ ...editingG, amount: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">النسبة (%)</label>
                      <input
                        type="number"
                        value={editingG.percentage || ""}
                        onChange={(e) => setEditingG({ ...editingG, percentage: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">طريقة السداد</label>
                    <select
                      value={editingG.paymentMethod}
                      onChange={(e) => setEditingG({ ...editingG, paymentMethod: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                    >
                      <option value="BANK_GUARANTEE">أصل خطاب ضمان بنكي</option>
                      <option value="CASH">سداد نقدي / إيصال توريد خزينة</option>
                      <option value="DEDUCTION_FROM_DUES">خصم رسمي من مستحقات قائمة</option>
                    </select>
                  </div>

                  {editingG.paymentMethod === "BANK_GUARANTEE" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">اسم البنك</label>
                        <input
                          type="text"
                          value={editingG.bankName || ""}
                          onChange={(e) => setEditingG({ ...editingG, bankName: e.target.value })}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">رقم خطاب الضمان</label>
                        <input
                          type="text"
                          value={editingG.guaranteeNumber || ""}
                          onChange={(e) => setEditingG({ ...editingG, guaranteeNumber: e.target.value })}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">تاريخ البداية</label>
                      <input
                        type="date"
                        value={editingG.startDate ? editingG.startDate.split("T")[0] : ""}
                        onChange={(e) => setEditingG({ ...editingG, startDate: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">تاريخ النهاية</label>
                      <input
                        type="date"
                        value={editingG.endDate ? editingG.endDate.split("T")[0] : ""}
                        onChange={(e) => setEditingG({ ...editingG, endDate: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">ملاحظات</label>
                    <textarea
                      rows={2}
                      value={editingG.notes || ""}
                      onChange={(e) => setEditingG({ ...editingG, notes: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingG(null)} className="text-xs">
                    إلغاء
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleUpdateGuarantee}
                    disabled={savingEditG}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 rounded-xl"
                  >
                    {savingEditG ? "جاري الحفظ..." : "حفظ التعديلات"}
                  </Button>
                </div>
              </div>
            </div>
          </Portal>
        )}

        {/* PRINTABLE FINAL GUARANTEE ISSUANCE LETTER MODAL */}
        {finalLetterModalOpen && (
          <Portal>
            <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
              <div className="bg-background border border-border w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
                  <div className="flex items-center gap-2">
                    <Printer className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-sm font-extrabold text-foreground">
                      معاينة وطباعة خطاب سداد وتقديم التأمين النهائي 5%
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => window.print()}
                      className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5 ml-1" />
                      <span>طباعة</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveFinalLetterToDocs}
                      disabled={savingFinalLetter}
                      className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      {savingFinalLetter ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5 ml-1" />}
                      <span>حفظ بالأرشيف</span>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setFinalLetterModalOpen(false)}
                      className="h-8 w-8 rounded-xl"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white text-slate-900 font-sans" dir="rtl">
                  <div className="border-b-2 border-emerald-800 pb-3 mb-5 flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-black text-emerald-900">{currentCompany?.name || "اسم الشركة"}</h2>
                      <p className="text-xs text-slate-600">
                        سجل تجاري: {currentCompany?.commercialRegister || "—"} • بطاقة ضريبية: {currentCompany?.taxCard || "—"}
                      </p>
                    </div>
                    <div className="text-left text-xs font-mono">
                      <div>التاريخ: {new Date().toLocaleDateString("ar-EG")}</div>
                      <div>كود العملية: {op.externalNumber || op.serialNumber}</div>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm font-bold text-slate-900 mb-4">
                    <div>السيد الأستاذ / رئيس الإدارة المركزية للشؤون المالية والإدارية</div>
                    <div>{op.authority || "جهة الإسناد الموقرة"}</div>
                    <div className="pt-2">تحية طيبة وبعد ،،،</div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-lg text-xs font-bold text-emerald-950 mb-4">
                    الموضوع: سداد وتقديم التأمين النهائي بنسبة (5%) للعملية رقم ({op.externalNumber || op.serialNumber}) بعنوان: &quot;{op.name}&quot;
                  </div>

                  <div className="text-xs leading-relaxed text-slate-800 mb-4 space-y-2 text-justify">
                    <p>
                      بالإشارة إلى إخطار قبول العطاء والترسية الصادر من جهتكم الموقرة؛ وإعمالاً للمادة (44) من القانون رقم 182 لسنة 2018 ولائحته التنفيذية بشأن تنظيم التعاقدات العامة؛
                    </p>
                    <p>
                      نتشرف بأن نرفق لسيادتكم التأمين النهائي المقرر بنسبة (5%) بمبلغ وقدره <strong>{formatCurrency(Number(amount))}</strong> ({tafqeetArabic(Number(amount))})، بأداة السداد: {paymentMethod === "BANK_GUARANTEE" ? `خطاب ضمان بنكي رقم (${guaranteeNumber}) بنك ${bankName}` : paymentMethod === "CASH" ? "سداد نقدي بخزينة الجهة" : `خصم من مستحقات: ${duesReference}`}.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-400 text-xs">
                    <div>
                      <strong>المفوض بالتعاقدات والتوريدات:</strong><br/><br/>
                      التوقيع: ............................................
                    </div>
                    <div className="text-center">
                      <strong>خاتم الشركة الرسمي:</strong><br/><br/>
                      [ بصمة الخاتم المعتمد ]
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        )}
      </SectionCard>

      {/* Continuity Action Footer (التسجيل 1 & 2) */}
      <StepFooterNav
        currentTabId="guarantee_final"
        onNavigate={onNavigate}
      />
    </div>
  );
}
