"use client";

import React, { useState, useMemo } from "react";
import {
  FileText,
  Building2,
  Calendar,
  DollarSign,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  Sparkles,
  Truck,
  Hash,
  ShieldCheck,
  Check,
  Receipt,
  FileCheck,
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
} from "./types";
import { StepFooterNav } from "./StepFooterNav";

export interface InvoiceItem {
  id: string;
  itemCode?: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  vatRate: number; // e.g. 14
}

export function TabInvoicing({
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
      return parsed.invoicingData || {};
    } catch {
      return {};
    }
  }, [op.notes]);

  const defaultCompany = op.companies?.[0]?.company || null;

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState(
    () => existingData.invoiceNumber || `INV-${op.serialNumber || "1"}-${new Date().getFullYear()}`
  );
  const [invoiceDate, setInvoiceDate] = useState(
    () => existingData.invoiceDate || new Date().toISOString().split("T")[0]
  );
  const [invoiceType, setInvoiceType] = useState<"ELECTRONIC" | "PAPER">(
    () => existingData.invoiceType || "ELECTRONIC"
  );
  const [electronicUuid, setElectronicUuid] = useState(
    () => existingData.electronicUuid || ""
  );
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    () => existingData.companyId || defaultCompany?.id || ""
  );

  // Delivery Handover State
  const [deliveryReceiptNumber, setDeliveryReceiptNumber] = useState(
    () => existingData.deliveryReceiptNumber || `DEL-${op.serialNumber || "1"}`
  );
  const [deliveryDate, setDeliveryDate] = useState(
    () => existingData.deliveryDate || new Date().toISOString().split("T")[0]
  );
  const [deliveryLocation, setDeliveryLocation] = useState(
    () => existingData.deliveryLocation || op.authority || "مقر ومخازن الجهة الإدارية"
  );
  const [recipientName, setRecipientName] = useState(
    () => existingData.recipientName || "لجنة الاستلام والفحص"
  );
  const [recipientRole, setRecipientRole] = useState(
    () => existingData.recipientRole || "مدير إدارة المخازن / عضو لجنة الفحص"
  );
  const [deliveryNotes, setDeliveryNotes] = useState(
    () => existingData.deliveryNotes || "تم تسليم وفحص جميع الأصناف الموضحة بالفاتورة ومطابقتها للمواصفات الفنية المعتمدة"
  );

  // File Uploads
  const [invoiceFilePath, setInvoiceFilePath] = useState(
    () => existingData.invoiceFilePath || ""
  );
  const [deliveryFilePath, setDeliveryFilePath] = useState(
    () => existingData.deliveryFilePath || ""
  );
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [uploadingDelivery, setUploadingDelivery] = useState(false);

  // Items State (Extract from financial offers if empty)
  const [items, setItems] = useState<InvoiceItem[]>(() => {
    if (existingData.items && Array.isArray(existingData.items) && existingData.items.length > 0) {
      return existingData.items;
    }
    // Pull from financial offer items if available
    const foItems = op.financialOffers?.[0]?.items || [];
    if (foItems.length > 0) {
      return foItems.map((fi: any, idx: number) => ({
        id: String(idx + 1),
        itemCode: `ITM-0${idx + 1}`,
        itemName: fi.itemName || "صنف توريد معتمد",
        unit: fi.unit || "وحدة",
        quantity: Number(fi.quantity) || 1,
        unitPrice: Number(fi.unitPrice) || 0,
        vatRate: 14,
      }));
    }
    // Default mock row
    return [
      {
        id: "1",
        itemCode: "ITM-01",
        itemName: op.name || "توريد أصناف ومهمات مطابقة للمواصفات",
        unit: "دفعة",
        quantity: 1,
        unitPrice: 50000,
        vatRate: 14,
      },
    ];
  });

  const [saving, setSaving] = useState(false);

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  }, [items]);

  const totalVat = useMemo(() => {
    return items.reduce((acc, it) => {
      const lineTotal = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
      return acc + (lineTotal * (Number(it.vatRate) || 0)) / 100;
    }, 0);
  }, [items]);

  const grandTotal = useMemo(() => subtotal + totalVat, [subtotal, totalVat]);

  // Handlers for Items
  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: String(Date.now()),
      itemCode: `ITM-0${items.length + 1}`,
      itemName: "بند توريد جديد",
      unit: "عدد",
      quantity: 1,
      unitPrice: 1000,
      vatRate: 14,
    };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      toast.warning("يجب أن تحتوي الفاتورة على بند واحد على الأقل");
      return;
    }
    setItems(items.filter((it) => it.id !== id));
  };

  const handleImportFromFinancial = () => {
    const foItems = op.financialOffers?.[0]?.items || [];
    if (!foItems.length) {
      toast.error("لا توجد بنود مسجلة في العرض المالي للاستيراد");
      return;
    }
    const imported: InvoiceItem[] = foItems.map((fi: any, idx: number) => ({
      id: String(Date.now() + idx),
      itemCode: `ITM-0${idx + 1}`,
      itemName: fi.itemName || "صنف توريد",
      unit: fi.unit || "وحدة",
      quantity: Number(fi.quantity) || 1,
      unitPrice: Number(fi.unitPrice) || 0,
      vatRate: 14,
    }));
    setItems(imported);
    toast.success(`تم استيراد ${imported.length} صنف من العرض المالي بنجاح! 📦`);
  };

  // Mock File Upload (stores in localStorage / base64 or backend)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "INVOICE" | "DELIVERY") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === "INVOICE") setUploadingInvoice(true);
    else setUploadingDelivery(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const fileDataUrl = reader.result as string;
        if (type === "INVOICE") {
          setInvoiceFilePath(fileDataUrl);
          toast.success("تم رفع وأرشفة ملف الفاتورة المعتمدة بنجاح! 📄✓");
        } else {
          setDeliveryFilePath(fileDataUrl);
          toast.success("تم رفع وأرشفة إذن ومحضر التسليم الفعلي بنجاح! 🚚✓");
        }
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("فشل رفع الملف");
    } finally {
      if (type === "INVOICE") setUploadingInvoice(false);
      else setUploadingDelivery(false);
    }
  };

  // Save to Operation Notes
  const handleSaveInvoiceData = async () => {
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

      existingNotesObj.invoicingData = {
        invoiceNumber,
        invoiceDate,
        invoiceType,
        electronicUuid,
        companyId: selectedCompanyId,
        subtotal,
        totalVat,
        grandTotal,
        items,
        deliveryReceiptNumber,
        deliveryDate,
        deliveryLocation,
        recipientName,
        recipientRole,
        deliveryNotes,
        invoiceFilePath,
        deliveryFilePath,
        updatedAt: new Date().toISOString(),
      };

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(existingNotesObj),
      });

      toast.success("تم حفظ بيانات الفاتورة وإذن التسليم بنجاح! 💾✨");
      onRefresh();
    } catch (err: any) {
      toast.error("فشل حفظ بيانات الفاتورة: " + (err?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const selectedCompany = (op.companies || []).find(
    (c: any) => c.companyId === selectedCompanyId || c.id === selectedCompanyId || c.company?.id === selectedCompanyId
  )?.company || defaultCompany;

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      {/* ━━━ SECTION 1: بيانات الفاتورة الرسمية والمنظومة الإلكترونية ━━━ */}
      <SectionCard
        title="1. بيانات الفاتورة الرسمية ومنظومة الفاتورة الإلكترونية"
        icon={Receipt}
        iconColor="text-indigo-600"
        badge={
          <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-xs font-bold">
            {invoiceType === "ELECTRONIC" ? "منظومة الضرائب المصرية (ETA) ✓" : "فاتورة ورقية معتمدة"}
          </Badge>
        }
        actions={
          <Button
            size="sm"
            onClick={handleImportFromFinancial}
            variant="outline"
            className="border-indigo-500/40 text-indigo-600 hover:bg-indigo-50 text-xs font-bold h-8 rounded-xl cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 ml-1 text-indigo-600" />
            <span>استيراد الأصناف من العرض المالي</span>
          </Button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">رقم الفاتورة الرسمية *</Label>
            <Input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="مثال: INV-2026-001"
              className="h-9.5 text-xs font-mono font-bold rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">تاريخ تحرير الفاتورة *</Label>
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="h-9.5 text-xs font-medium rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">نوع الفاتورة المصدرة *</Label>
            <Select
              value={invoiceType}
              onValueChange={(val: any) => setInvoiceType(val)}
            >
              <SelectTrigger className="h-9.5 text-xs font-bold rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs font-medium">
                <SelectItem value="ELECTRONIC">فاتورة إلكترونية (منظومة ETA)</SelectItem>
                <SelectItem value="PAPER">فاتورة ضريبية ورقية رسمية</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">الشركة المصدرة للفاتورة *</Label>
            <Select
              value={selectedCompanyId}
              onValueChange={(val) => setSelectedCompanyId(val)}
            >
              <SelectTrigger className="h-9.5 text-xs font-bold rounded-xl">
                <SelectValue placeholder="اختر الشركة" />
              </SelectTrigger>
              <SelectContent className="text-xs font-medium">
                {(op.companies || []).map((oc: any) => {
                  const compVal = oc.companyId || oc.id;
                  const compName = oc.company?.name || "الشركة";
                  return (
                    <SelectItem key={compVal} value={compVal}>
                      {compName} ({oc.displayCode})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Electronic Invoice UUID */}
        {invoiceType === "ELECTRONIC" && (
          <div className="p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-indigo-600" />
              <Label className="text-xs font-bold text-foreground">
                الرقم المرجعي الموحد للفاتورة الإلكترونية (UUID)
              </Label>
              <span className="text-[10px] text-muted-foreground">(الرمز الصادر من مصلحة الضرائب المصرية)</span>
            </div>
            <Input
              value={electronicUuid}
              onChange={(e) => setElectronicUuid(e.target.value)}
              placeholder="مثال: 5Q7P98K1-9876-4321-ABCD-1234567890EF"
              className="h-9 text-xs font-mono rounded-xl bg-card"
            />
          </div>
        )}

        {/* Company and Client Snapshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
            <span className="text-[10px] text-muted-foreground block font-bold">الشركة المصدرة (المورد):</span>
            <p className="font-bold text-foreground">{selectedCompany?.name || "جولدن سرفيس للتوريدات"}</p>
            <p className="text-muted-foreground font-mono text-[11px]">
              س.ت: {selectedCompany?.commercialRegister || "110200700036620"} • ب.ض: {selectedCompany?.taxCard || "658369652"}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
            <span className="text-[10px] text-muted-foreground block font-bold">الجهة المستفيدة (العميل):</span>
            <p className="font-bold text-foreground">{op.authority || "جهة الإسناد الرسمية"}</p>
            <p className="text-muted-foreground text-[11px]">
              عملية: {op.name} • رقم: {op.externalNumber || op.serialNumber}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 2: بنود الفاتورة واحتساب القيمة المضافة ━━━ */}
      <SectionCard
        title="2. بنود وأصناف الفاتورة واحتساب الضريبة (14% VAT)"
        icon={DollarSign}
        iconColor="text-emerald-600"
        badge={
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold">
            {items.length} أصناف
          </Badge>
        }
        actions={
          <Button
            size="sm"
            onClick={handleAddItem}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 rounded-xl cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 ml-1" />
            <span>إضافة بند جديد</span>
          </Button>
        }
      >
        <div className="overflow-x-auto border border-border rounded-2xl shadow-xs">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/60 text-muted-foreground font-bold border-b border-border">
              <tr>
                <th className="p-3 text-center w-12">#</th>
                <th className="p-3 min-w-[200px]">الصنف والبيان التفصيلي</th>
                <th className="p-3 w-24">الوحدة</th>
                <th className="p-3 w-24 text-center">الكمية</th>
                <th className="p-3 w-32 text-center">سعر الوحدة</th>
                <th className="p-3 w-32 text-center">الإجمالي</th>
                <th className="p-3 w-20 text-center">الضريبة %</th>
                <th className="p-3 w-16 text-center">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.map((item, idx) => {
                const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                return (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-2.5 text-center font-mono font-bold text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="p-2.5">
                      <Input
                        value={item.itemName}
                        onChange={(e) => handleUpdateItem(item.id, "itemName", e.target.value)}
                        className="h-8.5 text-xs font-medium rounded-lg"
                      />
                    </td>
                    <td className="p-2.5">
                      <Input
                        value={item.unit}
                        onChange={(e) => handleUpdateItem(item.id, "unit", e.target.value)}
                        className="h-8.5 text-xs text-center rounded-lg"
                      />
                    </td>
                    <td className="p-2.5">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(item.id, "quantity", Number(e.target.value))}
                        className="h-8.5 text-xs text-center font-mono font-bold rounded-lg"
                      />
                    </td>
                    <td className="p-2.5">
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItem(item.id, "unitPrice", Number(e.target.value))}
                        className="h-8.5 text-xs text-center font-mono font-bold rounded-lg"
                      />
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold text-foreground">
                      {formatCurrency(lineTotal)}
                    </td>
                    <td className="p-2.5">
                      <Input
                        type="number"
                        value={item.vatRate}
                        onChange={(e) => handleUpdateItem(item.id, "vatRate", Number(e.target.value))}
                        className="h-8.5 text-xs text-center font-mono rounded-lg"
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15 cursor-pointer transition-colors"
                        title="حذف البند"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Invoice Summary Totals Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-muted/30 via-card to-muted/30 border-2 border-border/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-right flex-1">
            <span className="text-xs text-muted-foreground block font-bold">
              المبلغ الإجمالي كتابةً بالتفقيط العربي المعتمد:
            </span>
            <p className="text-sm font-bold text-foreground leading-relaxed">
              {tafqeetArabic(grandTotal)}
            </p>
          </div>

          <div className="flex items-center gap-4 text-left font-mono shrink-0">
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground block">قبل الضريبة:</span>
              <span className="text-sm font-bold text-foreground">{formatCurrency(subtotal)}</span>
            </div>
            <div className="text-right border-r border-border/80 pr-4">
              <span className="text-[11px] text-muted-foreground block">ضريبة القيمة المضافة (14%):</span>
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">+{formatCurrency(totalVat)}</span>
            </div>
            <div className="text-right border-r-2 border-emerald-500/40 pr-4">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block">الإجمالي النهائي:</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 3: إذن ومحضر التسليم الفعلي المرفق بالفاتورة ━━━ */}
      <SectionCard
        title="3. محضر وإذن التسليم الفعلي المرفق بالفاتورة"
        icon={Truck}
        iconColor="text-blue-600"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">رقم إذن / محضر التسليم *</Label>
            <Input
              value={deliveryReceiptNumber}
              onChange={(e) => setDeliveryReceiptNumber(e.target.value)}
              className="h-9.5 text-xs font-mono font-bold rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">تاريخ الاستلام والتسليم *</Label>
            <Input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="h-9.5 text-xs font-medium rounded-xl"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-bold">موقع ومقر التسليم *</Label>
            <Input
              value={deliveryLocation}
              onChange={(e) => setDeliveryLocation(e.target.value)}
              className="h-9.5 text-xs font-medium rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">اسم الموظف / رئيس لجنة الاستلام *</Label>
            <Input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="h-9.5 text-xs font-bold rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">صفته ووظيفته بالجهة *</Label>
            <Input
              value={recipientRole}
              onChange={(e) => setRecipientRole(e.target.value)}
              className="h-9.5 text-xs font-medium rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <Label className="text-xs font-bold">ملاحظات وشهادة الفحص والتسليم</Label>
          <Textarea
            rows={2}
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            className="text-xs rounded-xl"
          />
        </div>
      </SectionCard>

      {/* ━━━ SECTION 4: المرفقات الرقمية وتوثيق المستندات ━━━ */}
      <SectionCard
        title="4. أرشفة ملف الفاتورة المعتمدة ومحضر التسليم الرسمي"
        icon={FileCheck}
        iconColor="text-teal-600"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* File 1: Stamped Invoice */}
          <div className="p-4 rounded-2xl bg-card border border-border space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                ملف الفاتورة المعتمدة (PDF / صورة)
              </span>
              {invoiceFilePath && (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                  مرفقة ومحفوظة ✓
                </Badge>
              )}
            </div>

            {invoiceFilePath ? (
              <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                    PDF
                  </div>
                  <span className="text-xs font-mono font-bold truncate">فاتورة_معتمدة_{invoiceNumber}.pdf</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={invoiceFilePath}
                    download={`فاتورة_${invoiceNumber}.pdf`}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-500/10 cursor-pointer"
                    title="تحميل"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => setInvoiceFilePath("")}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer text-xs"
                    title="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="border-2 border-dashed border-border hover:border-indigo-500/50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-muted/10 hover:bg-indigo-500/5">
                  <Upload className="h-5 w-5 text-indigo-500" />
                  <span className="text-xs font-bold text-muted-foreground">اضغط لرفع ملف الفاتورة المعتمدة</span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => handleFileUpload(e, "INVOICE")}
                    disabled={uploadingInvoice}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* File 2: Stamped Delivery Handover */}
          <div className="p-4 rounded-2xl bg-card border border-border space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-600" />
                ملف إذن ومحضر التسليم المعتمد
              </span>
              {deliveryFilePath && (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                  مرفق ومحفوظ ✓
                </Badge>
              )}
            </div>

            {deliveryFilePath ? (
              <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                    PDF
                  </div>
                  <span className="text-xs font-mono font-bold truncate">إذن_تسليم_{deliveryReceiptNumber}.pdf</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={deliveryFilePath}
                    download={`إذن_تسليم_${deliveryReceiptNumber}.pdf`}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-500/10 cursor-pointer"
                    title="تحميل"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => setDeliveryFilePath("")}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer text-xs"
                    title="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="border-2 border-dashed border-border hover:border-blue-500/50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-muted/10 hover:bg-blue-500/5">
                  <Upload className="h-5 w-5 text-blue-500" />
                  <span className="text-xs font-bold text-muted-foreground">اضغط لرفع إذن ومحضر التسليم المختوم</span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => handleFileUpload(e, "DELIVERY")}
                    disabled={uploadingDelivery}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-3 border-t border-border">
          <Button
            size="lg"
            onClick={handleSaveInvoiceData}
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-700 text-white font-black text-xs sm:text-sm px-6 h-11 rounded-2xl shadow-lg cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                <span>جاري حفظ الفاتورة...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4 ml-2" />
                <span>حفظ بيانات الفاتورة ومحضر التسليم 💾</span>
              </>
            )}
          </Button>
        </div>
      </SectionCard>

      {/* Continuity Action Footer */}
      <StepFooterNav currentTabId="invoicing" onNavigate={onNavigate} />
    </div>
  );
}
