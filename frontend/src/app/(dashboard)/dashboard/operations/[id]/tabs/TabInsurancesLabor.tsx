"use client";

import React, { useState, useMemo } from "react";
import {
  Eye,
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
} from "./types";
import { StepFooterNav } from "./StepFooterNav";

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
  const existingData = useMemo(() => {
    if (!op.notes) return {};
    try {
      const parsed = JSON.parse(op.notes);
      return parsed.insurancesLaborData || {};
    } catch {
      return {};
    }
  }, [op.notes]);

  // Social Insurance State
  const [socialInsuranceReceiptNo, setSocialInsuranceReceiptNo] = useState(
    () => existingData.socialInsuranceReceiptNo || "INS-55412"
  );
  const [socialInsuranceAmount, setSocialInsuranceAmount] = useState(
    () => existingData.socialInsuranceAmount || "1850"
  );
  const [socialInsuranceDate, setSocialInsuranceDate] = useState(
    () => existingData.socialInsuranceDate || new Date().toISOString().split("T")[0]
  );
  const [socialInsuranceOffice, setSocialInsuranceOffice] = useState(
    () => existingData.socialInsuranceOffice || "مكتب تأمينات مقاولات دمنهور"
  );
  const [socialInsuranceStatus, setSocialInsuranceStatus] = useState<"PAID" | "PENDING">(
    () => existingData.socialInsuranceStatus || "PAID"
  );
  const [socialReceiptFile, setSocialReceiptFile] = useState(
    () => existingData.socialReceiptFile || ""
  );

  // Manpower State
  const [laborReceiptNo, setLaborReceiptNo] = useState(
    () => existingData.laborReceiptNo || "LAB-8890"
  );
  const [laborAmount, setLaborAmount] = useState(
    () => existingData.laborAmount || "750"
  );
  const [laborDate, setLaborDate] = useState(
    () => existingData.laborDate || new Date().toISOString().split("T")[0]
  );
  const [laborDirectorate, setLaborDirectorate] = useState(
    () => existingData.laborDirectorate || "مديرية القوى العاملة والهجرة بالبحيرة"
  );
  const [laborStatus, setLaborStatus] = useState<"PAID" | "PENDING">(
    () => existingData.laborStatus || "PAID"
  );
  const [laborReceiptFile, setLaborReceiptFile] = useState(
    () => existingData.laborReceiptFile || ""
  );

  // Delivery of Certificates to Authority
  const [certificatesHandoverDate, setCertificatesHandoverDate] = useState(
    () => existingData.certificatesHandoverDate || new Date().toISOString().split("T")[0]
  );
  const [authorityRecipientName, setAuthorityRecipientName] = useState(
    () => existingData.authorityRecipientName || "أحمد عبد الله مصطفى"
  );
  const [authorityRecipientRole, setAuthorityRecipientRole] = useState(
    () => existingData.authorityRecipientRole || "رئيس قسم الحسابات ومراجعة العقود"
  );
  const [handoverReceiptNumber, setHandoverReceiptNumber] = useState(
    () => existingData.handoverReceiptNumber || `DOC-REC-${op.serialNumber || "1"}`
  );
  const [handoverNotes, setHandoverNotes] = useState(
    () => existingData.handoverNotes || "تم تسليم أصل شهادة التأمينات الاجتماعية وأصل شهادة القوى العاملة للمطابقة والصرف"
  );
  const [handoverProofFile, setHandoverProofFile] = useState(
    () => existingData.handoverProofFile || ""
  );

  // Government Payment Order Tracking
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

  const [saving, setSaving] = useState(false);

  // File Upload Helper
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: "social" | "labor" | "handover") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (field === "social") {
        setSocialReceiptFile(dataUrl);
        toast.success("تم رفع إيصال سداد التأمينات بنجاح! 📄✓");
      } else if (field === "labor") {
        setLaborReceiptFile(dataUrl);
        toast.success("تم رفع إيصال سداد القوى العاملة بنجاح! 📄✓");
      } else {
        setHandoverProofFile(dataUrl);
        toast.success("تم رفع إيصال تسليم الشهادات للجهة بنجاح! 🏢✓");
      }
    };
    reader.readAsDataURL(file);
  };

  // Save All Data
  const handleSaveData = async () => {
    setSaving(true);
    try {
      let existingNotesObj: Record<string, any> = {};
      if (op.notes) {
        try {
          existingNotesObj = JSON.parse(op.notes);
        } catch {
          existingNotesObj = {};
        }
      }

      existingNotesObj.insurancesLaborData = {
        socialInsuranceReceiptNo,
        socialInsuranceAmount,
        socialInsuranceDate,
        socialInsuranceOffice,
        socialInsuranceStatus,
        socialReceiptFile,
        laborReceiptNo,
        laborAmount,
        laborDate,
        laborDirectorate,
        laborStatus,
        laborReceiptFile,
        certificatesHandoverDate,
        authorityRecipientName,
        authorityRecipientRole,
        handoverReceiptNumber,
        handoverNotes,
        handoverProofFile,
        paymentOrderStatus,
        paymentOrderNumber,
        paymentOrderDate,
        disbursingBank,
        paymentOrderAmount,
        updatedAt: new Date().toISOString(),
      };

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(existingNotesObj),
      });

      toast.success("تم حفظ بيانات التأمينات والقوى العاملة وتتبع أمر الدفع بنجاح! 💾✨");
      onRefresh();
    } catch (err: any) {
      toast.error("فشل حفظ البيانات: " + (err?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      {/* ━━━ SECTION 1: سداد التأمينات الاجتماعية ━━━ */}
      <SectionCard
        title="1. سداد التأمينات الاجتماعية وشهادة البراءة"
        icon={ShieldCheck}
        iconColor="text-blue-600"
        badge={
          <Badge className={socialInsuranceStatus === "PAID" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold" : "bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-bold"}>
            {socialInsuranceStatus === "PAID" ? "تم السداد وإرفاق الشهادة ✓" : "قيد السداد والمتابعة"}
          </Badge>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">رقم إيصال السداد *</Label>
            <Input
              value={socialInsuranceReceiptNo}
              onChange={(e) => setSocialInsuranceReceiptNo(e.target.value)}
              className="h-9.5 text-xs font-mono font-bold rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">المبلغ المسدد (ج.م) *</Label>
            <Input
              type="number"
              value={socialInsuranceAmount}
              onChange={(e) => setSocialInsuranceAmount(e.target.value)}
              className="h-9.5 text-xs font-mono font-bold rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">تاريخ السداد *</Label>
            <Input
              type="date"
              value={socialInsuranceDate}
              onChange={(e) => setSocialInsuranceDate(e.target.value)}
              className="h-9.5 text-xs font-medium rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">حالة السداد *</Label>
            <Select
              value={socialInsuranceStatus}
              onValueChange={(val: any) => setSocialInsuranceStatus(val)}
            >
              <SelectTrigger className="h-9.5 text-xs font-bold rounded-xl">
                <SelectValue>
                  {socialInsuranceStatus === "PAID" ? "تم السداد واستلام الإيصال ✓" : "قيد التوريد والتسديد ⏳"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="text-xs font-medium">
                <SelectItem value="PAID">تم السداد واستلام الإيصال ✓</SelectItem>
                <SelectItem value="PENDING">قيد التوريد والتسديد ⏳</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">مكتب التأمينات المختص بالعملية</Label>
            <Input
              value={socialInsuranceOffice}
              onChange={(e) => setSocialInsuranceOffice(e.target.value)}
              className="h-9.5 text-xs font-medium rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">ملف إيصال السداد / شهادة التأمينات</Label>
            {socialReceiptFile ? (
              <div className="p-3 rounded-2xl bg-muted/40 border border-blue-500/20 flex items-center justify-between gap-2 text-xs hover:border-blue-500/40 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 border border-blue-500/30 flex items-center justify-center font-black text-[11px] shrink-0">
                    PDF
                  </div>
                  <div className="truncate">
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-300 truncate block">إيصال_تأمينات_{socialInsuranceReceiptNo}.pdf</span>
                    <span className="text-[10px] text-muted-foreground block">مستند إيصال سداد التأمينات</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onPreviewDoc?.({
                        fileName: `إيصال_تأمينات_${socialInsuranceReceiptNo}.pdf`,
                        filePath: socialReceiptFile,
                        title: `إيصال سداد التأمينات الاجتماعية رقم ${socialInsuranceReceiptNo}`,
                      })
                    }
                    className="h-8 px-2.5 text-xs font-bold rounded-xl border-blue-500/40 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-1 cursor-pointer shadow-xs"
                    title="معاينة إيصال التأمينات كما هو"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>معاينة</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(socialReceiptFile, "_blank")}
                    className="h-8 px-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                    title="فتح في نافذة مستقلة"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <a
                    href={socialReceiptFile}
                    download={`تأمينات_${socialInsuranceReceiptNo}.pdf`}
                    className="p-1.5 text-blue-600 hover:bg-blue-500/10 rounded-xl cursor-pointer"
                    title="تحميل"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => setSocialReceiptFile("")}
                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-xl cursor-pointer"
                    title="حذف المستند"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <label className="border border-dashed border-border hover:border-blue-500/50 rounded-xl p-2 flex items-center justify-center gap-2 cursor-pointer bg-muted/20 hover:bg-blue-500/5 transition-colors">
                <Upload className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-bold text-muted-foreground">رفع إيصال التأمينات (PDF / صورة)</span>
                <input type="file" onChange={(e) => handleFileUpload(e, "social")} className="hidden" />
              </label>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 2: سداد القوى العاملة ورسوم التشغيل ━━━ */}
      <SectionCard
        title="2. سداد القوى العاملة ورسوم التشغيل وتصاريح العمالة"
        icon={Building2}
        iconColor="text-amber-600"
        badge={
          <Badge className={laborStatus === "PAID" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold" : "bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-bold"}>
            {laborStatus === "PAID" ? "تم السداد للعمالة ✓" : "قيد التسديد"}
          </Badge>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">رقم إيصال القوى العاملة *</Label>
            <Input
              value={laborReceiptNo}
              onChange={(e) => setLaborReceiptNo(e.target.value)}
              className="h-9.5 text-xs font-mono font-bold rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">المبلغ المسدد (ج.م) *</Label>
            <Input
              type="number"
              value={laborAmount}
              onChange={(e) => setLaborAmount(e.target.value)}
              className="h-9.5 text-xs font-mono font-bold rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">تاريخ السداد *</Label>
            <Input
              type="date"
              value={laborDate}
              onChange={(e) => setLaborDate(e.target.value)}
              className="h-9.5 text-xs font-medium rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">حالة السداد *</Label>
            <Select
              value={laborStatus}
              onValueChange={(val: any) => setLaborStatus(val)}
            >
              <SelectTrigger className="h-9.5 text-xs font-bold rounded-xl">
                <SelectValue>
                  {laborStatus === "PAID" ? "تم السداد وإصدار الشهادة ✓" : "قيد التسديد ⏳"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="text-xs font-medium">
                <SelectItem value="PAID">تم السداد وإصدار الشهادة ✓</SelectItem>
                <SelectItem value="PENDING">قيد التسديد ⏳</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">مديرية القوى العاملة المختصة</Label>
            <Input
              value={laborDirectorate}
              onChange={(e) => setLaborDirectorate(e.target.value)}
              className="h-9.5 text-xs font-medium rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">ملف إيصال القوى العاملة</Label>
            {laborReceiptFile ? (
              <div className="p-3 rounded-2xl bg-muted/40 border border-amber-500/20 flex items-center justify-between gap-2 text-xs hover:border-amber-500/40 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 border border-amber-500/30 flex items-center justify-center font-black text-[11px] shrink-0">
                    PDF
                  </div>
                  <div className="truncate">
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-300 truncate block">إيصال_قوى_عاملة_{laborReceiptNo}.pdf</span>
                    <span className="text-[10px] text-muted-foreground block">مستند سداد القوى العاملة</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onPreviewDoc?.({
                        fileName: `إيصال_قوى_عاملة_${laborReceiptNo}.pdf`,
                        filePath: laborReceiptFile,
                        title: `إيصال سداد القوى العاملة رقم ${laborReceiptNo}`,
                      })
                    }
                    className="h-8 px-2.5 text-xs font-bold rounded-xl border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-1 cursor-pointer shadow-xs"
                    title="معاينة إيصال القوى العاملة كما هو"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>معاينة</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(laborReceiptFile, "_blank")}
                    className="h-8 px-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                    title="فتح في نافذة مستقلة"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <a
                    href={laborReceiptFile}
                    download={`قوى_عاملة_${laborReceiptNo}.pdf`}
                    className="p-1.5 text-blue-600 hover:bg-blue-500/10 rounded-xl cursor-pointer"
                    title="تحميل"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => setLaborReceiptFile("")}
                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-xl cursor-pointer"
                    title="حذف المستند"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <label className="border border-dashed border-border hover:border-amber-500/50 rounded-xl p-2 flex items-center justify-center gap-2 cursor-pointer bg-muted/20 hover:bg-amber-500/5 transition-colors">
                <Upload className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-bold text-muted-foreground">رفع إيصال القوى العاملة (PDF / صورة)</span>
                <input type="file" onChange={(e) => handleFileUpload(e, "labor")} className="hidden" />
              </label>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 3: تسليم الشهادات للجهة الإدارية واسم المستلم ━━━ */}
      <SectionCard
        title="3. تسليم الشهادات للجهة الإدارية واسم الموظف المستلم"
        icon={UserCheck}
        iconColor="text-indigo-600"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">تاريخ تسليم الشهادات للجهة *</Label>
            <Input
              type="date"
              value={certificatesHandoverDate}
              onChange={(e) => setCertificatesHandoverDate(e.target.value)}
              className="h-9.5 text-xs font-medium rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">اسم الموظف المستلم بالجهة *</Label>
            <Input
              value={authorityRecipientName}
              onChange={(e) => setAuthorityRecipientName(e.target.value)}
              placeholder="مثال: أحمد عبد الله مصطفى"
              className="h-9.5 text-xs font-bold rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">الصفة والوظيفة بالجهة *</Label>
            <Input
              value={authorityRecipientRole}
              onChange={(e) => setAuthorityRecipientRole(e.target.value)}
              placeholder="مثال: رئيس قسم الحسابات ومراجعة العقود"
              className="h-9.5 text-xs font-medium rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">رقم حافظة التسليم أو الإيصال</Label>
            <Input
              value={handoverReceiptNumber}
              onChange={(e) => setHandoverReceiptNumber(e.target.value)}
              className="h-9.5 text-xs font-mono font-bold rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">صورة حافظة الاستلام الموقعة</Label>
            {handoverProofFile ? (
              <div className="p-3 rounded-2xl bg-muted/40 border border-indigo-500/20 flex items-center justify-between gap-2 text-xs hover:border-indigo-500/40 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 border border-indigo-500/30 flex items-center justify-center font-black text-[11px] shrink-0">
                    PDF
                  </div>
                  <div className="truncate">
                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 truncate block">حافظة_تسليم_{handoverReceiptNumber}.pdf</span>
                    <span className="text-[10px] text-muted-foreground block">مستند حافظة الاستلام المعتمدة</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onPreviewDoc?.({
                        fileName: `حافظة_تسليم_${handoverReceiptNumber}.pdf`,
                        filePath: handoverProofFile,
                        title: `حافظة تسليم الشهادات رقم ${handoverReceiptNumber}`,
                      })
                    }
                    className="h-8 px-2.5 text-xs font-bold rounded-xl border-indigo-500/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-1 cursor-pointer shadow-xs"
                    title="معاينة حافظة التسليم كما هي"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>معاينة</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(handoverProofFile, "_blank")}
                    className="h-8 px-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                    title="فتح في نافذة مستقلة"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <a
                    href={handoverProofFile}
                    download={`حافظة_تسليم_${handoverReceiptNumber}.pdf`}
                    className="p-1.5 text-blue-600 hover:bg-blue-500/10 rounded-xl cursor-pointer"
                    title="تحميل"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => setHandoverProofFile("")}
                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-xl cursor-pointer"
                    title="حذف المستند"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <label className="border border-dashed border-border hover:border-indigo-500/50 rounded-xl p-2 flex items-center justify-center gap-2 cursor-pointer bg-muted/20 hover:bg-indigo-500/5 transition-colors">
                <Upload className="h-4 w-4 text-indigo-500" />
                <span className="text-xs font-bold text-muted-foreground">رفع صورة الحافظة المعتمدة</span>
                <input type="file" onChange={(e) => handleFileUpload(e, "handover")} className="hidden" />
              </label>
            )}
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <Label className="text-xs font-bold">ملاحظات تسليم الشهادات</Label>
          <Textarea
            rows={2}
            value={handoverNotes}
            onChange={(e) => setHandoverNotes(e.target.value)}
            className="text-xs rounded-xl"
          />
        </div>
      </SectionCard>

      {/* ━━━ SECTION 4: تتبع استخراج أمر الدفع الإلكتروني الحكومي ━━━ */}
      <SectionCard
        title="4. متابعة واستخراج أمر الدفع الإلكتروني الحكومي"
        icon={Landmark}
        iconColor="text-emerald-600"
        badge={
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold">
            {paymentOrderStatus === "ISSUED" ? "تم صدور أمر الدفع رسمي ✓" : paymentOrderStatus === "SIGNED" ? "تم توقيع المراقب المالي ✍️" : "بانتظار المراجعة والاعتماد ⏳"}
          </Badge>
        }
      >
        {/* Visual Stepper */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/5 via-blue-500/5 to-transparent border border-emerald-500/20 space-y-3">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            مسار مراجعة واعتماد أمر الدفع الحكومي:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`p-3 rounded-xl border transition-all ${paymentOrderStatus === "AUDITING" ? "bg-amber-500/10 border-amber-500/40 shadow-xs" : "bg-card border-border"}`}>
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">1</span>
                مراجعة المستندات بالحسابات
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">مطابقة الفاتورة والتسليم وإيصالات التأمينات والعمالة</p>
            </div>

            <div className={`p-3 rounded-xl border transition-all ${paymentOrderStatus === "SIGNED" ? "bg-blue-500/10 border-blue-500/40 shadow-xs" : "bg-card border-border"}`}>
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px]">2</span>
                توقيع واعتماد المراقب المالي
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">توقيع ممثل وزارة المالية واعتماد الاستقطاعات الرسمية</p>
            </div>

            <div className={`p-3 rounded-xl border transition-all ${paymentOrderStatus === "ISSUED" ? "bg-emerald-500/10 border-emerald-500/40 shadow-xs" : "bg-card border-border"}`}>
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">3</span>
                صدور أمر الدفع الإلكتروني
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">توليد رقم أمر الدفع والتحويل لحساب الشركة البنكي</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">حالة أمر الدفع *</Label>
            <Select
              value={paymentOrderStatus}
              onValueChange={(val: any) => setPaymentOrderStatus(val)}
            >
              <SelectTrigger className="h-9.5 text-xs font-bold rounded-xl">
                <SelectValue>
                  {paymentOrderStatus === "AUDITING"
                    ? "1. مراجعة بالحسابات ⏳"
                    : paymentOrderStatus === "SIGNED"
                    ? "2. توقيع المراقب المالي ✍️"
                    : "3. تم صدور أمر الدفع رسمي ✓"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="text-xs font-medium">
                <SelectItem value="AUDITING">1. مراجعة بالحسابات ⏳</SelectItem>
                <SelectItem value="SIGNED">2. توقيع المراقب المالي ✍️</SelectItem>
                <SelectItem value="ISSUED">3. تم صدور أمر الدفع رسمي ✓</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">رقم أمر الدفع الحكومي *</Label>
            <Input
              value={paymentOrderNumber}
              onChange={(e) => setPaymentOrderNumber(e.target.value)}
              className="h-9.5 text-xs font-mono font-bold rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">تاريخ صدور أمر الدفع *</Label>
            <Input
              type="date"
              value={paymentOrderDate}
              onChange={(e) => setPaymentOrderDate(e.target.value)}
              className="h-9.5 text-xs font-medium rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">قيمة أمر الدفع المتوقعة (ج.م) *</Label>
            <Input
              type="number"
              value={paymentOrderAmount}
              onChange={(e) => setPaymentOrderAmount(e.target.value)}
              className="h-9.5 text-xs font-mono font-bold rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <Label className="text-xs font-bold">الوحدة الحسابية والبنك المسحوب عليه</Label>
          <Input
            value={disbursingBank}
            onChange={(e) => setDisbursingBank(e.target.value)}
            className="h-9.5 text-xs font-medium rounded-xl"
          />
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-3 border-t border-border">
          <Button
            size="lg"
            onClick={handleSaveData}
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-700 text-white font-black text-xs sm:text-sm px-6 h-11 rounded-2xl shadow-lg cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                <span>جاري حفظ البيانات...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4 ml-2" />
                <span>حفظ بيانات التأمينات والقوى العاملة وأمر الدفع 💾</span>
              </>
            )}
          </Button>
        </div>
      </SectionCard>

      {/* Continuity Action Footer */}
      <StepFooterNav currentTabId="insurances_labor" onNavigate={onNavigate} />
    </div>
  );
}
