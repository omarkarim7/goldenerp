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
  Edit,
  ExternalLink,
  Printer,
  X,
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
import { Portal } from "@/components/ui/portal";
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
import { SmartArabicDatePicker } from "@/components/ui/arabic-date-picker";

export interface InvoiceItem {
  id: string;
  itemCode?: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  vatRate: number; // e.g. 14
}

export interface SavedInvoiceRecord {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceType: "ELECTRONIC" | "PAPER";
  electronicUuid?: string;
  companyId: string;
  companyName: string;
  deliveryReceiptNumber: string;
  deliveryDate: string;
  deliveryLocation: string;
  recipientName: string;
  recipientRole: string;
  deliveryNotes: string;
  invoiceFilePath?: string;
  deliveryFilePath?: string;
  items: InvoiceItem[];
  subtotal: number;
  totalVat: number;
  grandTotal: number;
  createdAt: string;
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
  const existingNotes = useMemo(() => {
    if (!op.notes) return {};
    try {
      return JSON.parse(op.notes);
    } catch {
      return {};
    }
  }, [op.notes]);

  const existingData = existingNotes.invoicingData || {};
  const defaultCompany = op.companies?.[0]?.company || null;

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState(
    () => existingData.invoiceNumber || `فاتورة-${op.serialNumber || "1"}-${new Date().getFullYear()}`
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
    () => existingData.deliveryReceiptNumber || `إذن-تسليم-${op.serialNumber || "1"}`
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
    const foItems = op.financialOffers?.[0]?.items || [];
    if (foItems.length > 0) {
      return foItems.map((fi: any, idx: number) => ({
        id: String(idx + 1),
        itemCode: `بند-${idx + 1}`,
        itemName: fi.itemName || "صنف توريد معتمد",
        unit: fi.unit || "وحدة",
        quantity: Number(fi.quantity) || 1,
        unitPrice: Number(fi.unitPrice) || 0,
        vatRate: 14,
      }));
    }
    return [
      {
        id: "1",
        itemCode: "بند-1",
        itemName: op.name || "توريد أصناف ومهمات مطابقة للمواصفات",
        unit: "دفعة",
        quantity: 1,
        unitPrice: 50000,
        vatRate: 14,
      },
    ];
  });

  // Saved Invoices Cards list
  const [invoicesList, setInvoicesList] = useState<SavedInvoiceRecord[]>(() => {
    if (existingNotes.invoicesList && Array.isArray(existingNotes.invoicesList) && existingNotes.invoicesList.length > 0) {
      return existingNotes.invoicesList;
    }
    if (existingData.invoiceNumber && existingData.grandTotal) {
      return [
        {
          id: "inv-1",
          invoiceNumber: existingData.invoiceNumber,
          invoiceDate: existingData.invoiceDate || new Date().toISOString().split("T")[0],
          invoiceType: existingData.invoiceType || "ELECTRONIC",
          electronicUuid: existingData.electronicUuid,
          companyId: existingData.companyId || defaultCompany?.id || "",
          companyName: defaultCompany?.name || "الشركة المنفذة",
          deliveryReceiptNumber: existingData.deliveryReceiptNumber || `إذن-تسليم-${op.serialNumber || "1"}`,
          deliveryDate: existingData.deliveryDate || new Date().toISOString().split("T")[0],
          deliveryLocation: existingData.deliveryLocation || "مخازن الجهة",
          recipientName: existingData.recipientName || "لجنة الاستلام",
          recipientRole: existingData.recipientRole || "رئيس لجنة الفحص",
          deliveryNotes: existingData.deliveryNotes || "",
          invoiceFilePath: existingData.invoiceFilePath,
          deliveryFilePath: existingData.deliveryFilePath,
          items: existingData.items || [],
          subtotal: existingData.subtotal || 0,
          totalVat: existingData.totalVat || 0,
          grandTotal: existingData.grandTotal || 0,
          createdAt: existingData.updatedAt || new Date().toISOString(),
        },
      ];
    }
    return [];
  });

  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<SavedInvoiceRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.quantity || 0) * (it.unitPrice || 0), 0);
  }, [items]);

  const totalVat = useMemo(() => {
    return items.reduce((acc, it) => {
      const lineBase = (it.quantity || 0) * (it.unitPrice || 0);
      const vat = lineBase * ((it.vatRate || 0) / 100);
      return acc + vat;
    }, 0);
  }, [items]);

  const grandTotal = useMemo(() => subtotal + totalVat, [subtotal, totalVat]);

  // Item Actions
  const handleAddItem = () => {
    const nextId = String(items.length + 1);
    setItems([
      ...items,
      {
        id: nextId,
        itemCode: `بند-${nextId}`,
        itemName: "صنف توريد جديد",
        unit: "عدد",
        quantity: 1,
        unitPrice: 1000,
        vatRate: 14,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(
      items.map((it) => {
        if (it.id === id) {
          return { ...it, [field]: value };
        }
        return it;
      })
    );
  };

  const handleImportFromFinancial = () => {
    const foItems = op.financialOffers?.[0]?.items || [];
    if (foItems.length === 0) {
      toast.error("لا توجد أصناف مسجلة في العرض المالي للاستيراد");
      return;
    }
    const imported = foItems.map((fi: any, idx: number) => ({
      id: String(idx + 1),
      itemCode: `بند-${idx + 1}`,
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

  // Save to Operation Notes & Add to Cards List
  const handleSaveInvoiceData = async () => {
    setSaving(true);
    try {
      const selectedCompany = (op.companies || []).find(
        (c: any) => c.companyId === selectedCompanyId || c.id === selectedCompanyId || c.company?.id === selectedCompanyId
      )?.company || defaultCompany;

      const recordId = activeInvoiceId || `inv-${Date.now()}`;
      const newInvoiceCard: SavedInvoiceRecord = {
        id: recordId,
        invoiceNumber,
        invoiceDate,
        invoiceType,
        electronicUuid,
        companyId: selectedCompanyId,
        companyName: selectedCompany?.name || "الشركة المنفذة",
        deliveryReceiptNumber,
        deliveryDate,
        deliveryLocation,
        recipientName,
        recipientRole,
        deliveryNotes,
        invoiceFilePath,
        deliveryFilePath,
        items,
        subtotal,
        totalVat,
        grandTotal,
        createdAt: new Date().toISOString(),
      };

      const updatedList = activeInvoiceId
        ? invoicesList.map((inv) => (inv.id === activeInvoiceId ? newInvoiceCard : inv))
        : [newInvoiceCard, ...invoicesList];

      setInvoicesList(updatedList);

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
      existingNotesObj.invoicesList = updatedList;

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(existingNotesObj),
      });

      toast.success("تم حفظ الفاتورة وتوثيق البطاقة بالسجلات بنجاح! 💾✨");
      setActiveInvoiceId(null);
      onRefresh();
    } catch (err: any) {
      toast.error("فشل حفظ بيانات الفاتورة: " + (err?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const handleEditInvoice = (inv: SavedInvoiceRecord) => {
    setActiveInvoiceId(inv.id);
    setInvoiceNumber(inv.invoiceNumber);
    setInvoiceDate(inv.invoiceDate);
    setInvoiceType(inv.invoiceType);
    setElectronicUuid(inv.electronicUuid || "");
    setSelectedCompanyId(inv.companyId);
    setDeliveryReceiptNumber(inv.deliveryReceiptNumber);
    setDeliveryDate(inv.deliveryDate);
    setDeliveryLocation(inv.deliveryLocation);
    setRecipientName(inv.recipientName);
    setRecipientRole(inv.recipientRole);
    setDeliveryNotes(inv.deliveryNotes);
    setInvoiceFilePath(inv.invoiceFilePath || "");
    setDeliveryFilePath(inv.deliveryFilePath || "");
    setItems(inv.items || []);
    toast.info(`تم تحميل بيانات "${inv.invoiceNumber}" في النموذج للتعديل ✏️`);
  };

  const handleDeleteInvoice = async (invId: string) => {
    if (!confirm("هل أنت متأكد من حذف بطاقة الفاتورة هذه؟")) return;
    try {
      const updatedList = invoicesList.filter((inv) => inv.id !== invId);
      setInvoicesList(updatedList);
      let existingNotesObj: Record<string, any> = {};
      if (op.notes) {
        try {
          existingNotesObj = JSON.parse(op.notes);
        } catch {}
      }
      existingNotesObj.invoicesList = updatedList;
      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(existingNotesObj),
      });
      toast.success("تم حذف بطاقة الفاتورة بنجاح 🗑️");
      if (activeInvoiceId === invId) {
        setActiveInvoiceId(null);
      }
      onRefresh();
    } catch {
      toast.error("فشل حذف الفاتورة");
    }
  };

  const selectedCompany = (op.companies || []).find(
    (c: any) => c.companyId === selectedCompanyId || c.id === selectedCompanyId || c.company?.id === selectedCompanyId
  )?.company || defaultCompany;

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      {/* ━━━ SECTION 1: بيانات الفاتورة الرسمية والمنظومة الإلكترونية ━━━ */}
      <SectionCard
        title={activeInvoiceId ? "تعديل بيانات الفاتورة ومنظومة الفاتورة الإلكترونية" : "1. بيانات الفاتورة الرسمية ومنظومة الفاتورة الإلكترونية"}
        icon={Receipt}
        iconColor="text-indigo-600"
        badge={
          activeInvoiceId ? (
            <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-bold">
              وضع التعديل النشط ✏️
            </Badge>
          ) : (
            <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-xs font-bold">
              {invoiceType === "ELECTRONIC" ? "منظومة الضرائب المصرية (ETA) ✓" : "فاتورة ورقية معتمدة"}
            </Badge>
          )
        }
        actions={
          <Button
            size="sm"
            onClick={handleImportFromFinancial}
            variant="outline"
            className="border-indigo-500/40 text-indigo-600 hover:bg-indigo-50 text-xs font-bold h-8 rounded-xl cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 ml-1" />
            <span>استيراد من العرض المالي</span>
          </Button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">رقم الفاتورة الرسمية *</Label>
            <Input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="h-9.5 text-xs font-mono font-bold rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <SmartArabicDatePicker
              label="تاريخ إصدار الفاتورة"
              required
              value={invoiceDate}
              onChange={(val) => setInvoiceDate(val)}
              outputFormat="iso"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">نوع الفاتورة *</Label>
            <Select
              value={invoiceType}
              onValueChange={(val: any) => setInvoiceType(val)}
            >
              <SelectTrigger className="h-9.5 text-xs font-bold rounded-xl">
                <SelectValue>
                  {invoiceType === "ELECTRONIC" ? "فاتورة إلكترونية معتمدة (منظومة ETA)" : "فاتورة ورقية رسمية مختومة"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="text-xs font-medium">
                <SelectItem value="ELECTRONIC">فاتورة إلكترونية معتمدة (منظومة ETA)</SelectItem>
                <SelectItem value="PAPER">فاتورة ورقية رسمية مختومة</SelectItem>
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
                {(op.companies || []).map((c: any) => (
                  <SelectItem key={c.companyId || c.id} value={c.companyId || c.id}>
                    {c.company?.name || "شركة غير محددة"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {invoiceType === "ELECTRONIC" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-bold">
                الرقم التعريفي الفريد للفاتورة الإلكترونية (UUID / ETA Reference) *
              </Label>
              <Input
                value={electronicUuid}
                onChange={(e) => setElectronicUuid(e.target.value)}
                placeholder="مثال: 7B9B42A4-F29D-4BC7-8AE0-1F0D5369A891"
                className="h-9.5 text-xs font-mono rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">حالة الفاتورة بمنظومة الضرائب</Label>
              <div className="h-9.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center px-3 gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>صحيحة وموقعة إلكترونياً ✓</span>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ━━━ SECTION 2: جدول بنود وتفاصيل الفاتورة وحساب ضريبة القيمة المضافة ━━━ */}
      <SectionCard
        title="2. جدول بنود الفاتورة وحساب ضريبة القيمة المضافة (14%)"
        icon={DollarSign}
        iconColor="text-emerald-600"
        badge={
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold">
            {items.length} بنود مدرجة
          </Badge>
        }
        actions={
          <Button
            size="sm"
            onClick={handleAddItem}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 rounded-xl cursor-pointer shadow-xs"
          >
            <Plus className="h-3.5 w-3.5 ml-1" />
            <span>إضافة بند جديد للفاتورة</span>
          </Button>
        }
      >
        <div className="overflow-x-auto border border-border rounded-2xl shadow-xs">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/60 text-muted-foreground font-bold border-b border-border">
              <tr>
                <th className="p-3 text-center w-12">#</th>
                <th className="p-3 w-28 text-center">كود البند</th>
                <th className="p-3 min-w-[220px]">بيان الصنف والمواصفات</th>
                <th className="p-3 w-24 text-center">الوحدة</th>
                <th className="p-3 w-24 text-center">الكمية</th>
                <th className="p-3 w-28 text-center">سعر الوحدة</th>
                <th className="p-3 w-32 text-center">الإجمالي قبل الضريبة</th>
                <th className="p-3 w-24 text-center">نسبة الضريبة %</th>
                <th className="p-3 w-16 text-center">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.map((item, idx) => {
                const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
                return (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-2.5 text-center font-mono font-bold text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="p-2.5">
                      <Input
                        value={item.itemCode || `بند-${idx + 1}`}
                        onChange={(e) => handleUpdateItem(item.id, "itemCode", e.target.value)}
                        className="h-8.5 text-xs text-center font-mono rounded-lg"
                      />
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
            <SmartArabicDatePicker
              label="تاريخ الاستلام والتسليم"
              required
              value={deliveryDate}
              onChange={(val) => setDeliveryDate(val)}
              outputFormat="iso"
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
          <div className="p-4 rounded-2xl bg-card border-2 border-border/80 hover:border-indigo-500/40 space-y-3 shadow-xs transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                ملف الفاتورة المعتمدة (PDF / صورة)
              </span>
              {invoiceFilePath && (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                  مرفقة ومحفوظة ✓
                </Badge>
              )}
            </div>

            {invoiceFilePath ? (
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-600 border border-indigo-500/30 flex items-center justify-center font-black text-xs shrink-0">
                    PDF
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-bold truncate block">{`فاتورة_معتمدة_${invoiceNumber}.pdf`}</span>
                    <span className="text-[10px] text-muted-foreground block">مستند رسمي معتمد بالأرشيف</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onPreviewDoc?.({
                        fileName: `فاتورة_معتمدة_${invoiceNumber}.pdf`,
                        filePath: invoiceFilePath,
                        title: `فاتورة معتمدة رقم ${invoiceNumber}`,
                      })
                    }
                    className="h-8 px-2.5 text-xs font-bold rounded-xl border-indigo-500/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-1 cursor-pointer shadow-xs"
                    title="معاينة الفاتورة كما هي"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>معاينة</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(invoiceFilePath, "_blank")}
                    className="h-8 px-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                    title="فتح الفاتورة في نافذة مستقلة"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>

                  <a
                    href={invoiceFilePath}
                    download={`فاتورة_${invoiceNumber}.pdf`}
                    className="p-2 rounded-xl text-blue-600 hover:bg-blue-500/10 cursor-pointer"
                    title="تحميل للجهاز"
                  >
                    <Download className="h-4 w-4" />
                  </a>

                  <button
                    onClick={() => setInvoiceFilePath("")}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/15 cursor-pointer text-xs"
                    title="حذف المستند"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="border-2 border-dashed border-border hover:border-indigo-500/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-muted/10 hover:bg-indigo-500/5">
                  <Upload className="h-5 w-5 text-indigo-500" />
                  <span className="text-xs font-bold text-muted-foreground">اضغط لرفع ملف الفاتورة المعتمدة</span>
                  <input
                    type="file"
                    onChange={(e) => handleFileUpload(e, "INVOICE")}
                    disabled={uploadingInvoice}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* File 2: Stamped Delivery Handover */}
          <div className="p-4 rounded-2xl bg-card border-2 border-border/80 hover:border-blue-500/40 space-y-3 shadow-xs transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-600" />
                ملف إذن ومحضر التسليم المعتمد
              </span>
              {deliveryFilePath && (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                  مرفق ومحفوظ ✓
                </Badge>
              )}
            </div>

            {deliveryFilePath ? (
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 border border-blue-500/30 flex items-center justify-center font-black text-xs shrink-0">
                    PDF
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-bold truncate block">{`إذن_تسليم_${deliveryReceiptNumber}.pdf`}</span>
                    <span className="text-[10px] text-muted-foreground block">مستند استلام رسمي بالأرشيف</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onPreviewDoc?.({
                        fileName: `إذن_تسليم_${deliveryReceiptNumber}.pdf`,
                        filePath: deliveryFilePath,
                        title: `إذن ومحضر تسليم رقم ${deliveryReceiptNumber}`,
                      })
                    }
                    className="h-8 px-2.5 text-xs font-bold rounded-xl border-blue-500/40 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-1 cursor-pointer shadow-xs"
                    title="معاينة إذن التسليم كما هو"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>معاينة</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(deliveryFilePath, "_blank")}
                    className="h-8 px-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                    title="فتح إذن التسليم في نافذة مستقلة"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>

                  <a
                    href={deliveryFilePath}
                    download={`إذن_تسليم_${deliveryReceiptNumber}.pdf`}
                    className="p-2 rounded-xl text-blue-600 hover:bg-blue-500/10 cursor-pointer"
                    title="تحميل للجهاز"
                  >
                    <Download className="h-4 w-4" />
                  </a>

                  <button
                    onClick={() => setDeliveryFilePath("")}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/15 cursor-pointer text-xs"
                    title="حذف المستند"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="border-2 border-dashed border-border hover:border-blue-500/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-muted/10 hover:bg-blue-500/5">
                  <Upload className="h-5 w-5 text-blue-500" />
                  <span className="text-xs font-bold text-muted-foreground">اضغط لرفع إذن ومحضر التسليم المختوم</span>
                  <input
                    type="file"
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
        <div className="flex items-center justify-between pt-3 border-t border-border flex-wrap gap-2">
          {activeInvoiceId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveInvoiceId(null)}
              className="text-xs font-bold rounded-xl h-9"
            >
              إلغاء وضع التعديل
            </Button>
          ) : <div />}

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
                <span>{activeInvoiceId ? "تحديث بطاقة الفاتورة الحالية 💾" : "حفظ بيانات الفاتورة وإصدار بطاقة السجل 💾"}</span>
              </>
            )}
          </Button>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 5: بطاقات الفواتير الصادرة ومحاضر التسليم المعتمدة (Cards) ━━━ */}
      <SectionCard
        title="بطاقات الفواتير الصادرة ومحاضر التسليم المعتمدة"
        icon={Receipt}
        iconColor="text-indigo-600"
        badge={
          <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-xs font-bold">
            {invoicesList.length} فاتورة مسجلة
          </Badge>
        }
      >
        {invoicesList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invoicesList.map((inv, index) => (
              <div
                key={inv.id || index}
                className="p-4 rounded-3xl border-2 border-border/80 hover:border-indigo-500/50 bg-card hover:bg-muted/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
                        <Receipt className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {inv.invoiceNumber}
                        </h4>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {formatDate(inv.invoiceDate)}
                        </span>
                      </div>
                    </div>

                    <Badge
                      className={
                        inv.invoiceType === "ELECTRONIC"
                          ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-[10px] font-bold"
                          : "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30 text-[10px] font-bold"
                      }
                    >
                      {inv.invoiceType === "ELECTRONIC" ? "إلكترونية ETA ✓" : "ورقية رسمية"}
                    </Badge>
                  </div>

                  <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الشركة المصدرة:</span>
                      <span className="font-bold text-foreground truncate max-w-[170px]">{inv.companyName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">عدد الأصناف:</span>
                      <span className="font-bold text-foreground">{(inv.items || []).length} صنف</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الإجمالي شامل الضريبة:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatCurrency(inv.grandTotal || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">إذن التسليم:</span>
                      <span className="font-mono font-bold text-foreground">{inv.deliveryReceiptNumber}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {inv.invoiceFilePath && (
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[9px] font-bold">
                        فاتورة مرفقة ✓
                      </Badge>
                    )}
                    {inv.deliveryFilePath && (
                      <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-[9px] font-bold">
                        إذن تسليم مرفق ✓
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Card Action Tools */}
                <div className="pt-2 border-t border-border/70 flex items-center justify-between gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewingInvoice(inv)}
                    className="h-8 px-3 text-xs font-bold rounded-xl border-indigo-500/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="عرض تفاصيل الفاتورة ومحضر التسليم"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>عرض التفاصيل</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditInvoice(inv)}
                      className="h-8 w-8 p-0 rounded-xl hover:bg-muted text-muted-foreground hover:text-blue-600 cursor-pointer"
                      title="تعديل الفاتورة"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteInvoice(inv.id)}
                      className="h-8 w-8 p-0 rounded-xl hover:bg-rose-500/15 text-muted-foreground hover:text-rose-600 cursor-pointer"
                      title="حذف الفاتورة"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-muted/20 border border-dashed border-border text-center space-y-1.5">
            <Receipt className="h-8 w-8 mx-auto text-muted-foreground/60" />
            <p className="text-xs font-bold text-foreground">لم يتم إصدار بطاقات فواتير حتى الآن</p>
            <p className="text-[11px] text-muted-foreground">عند الضغط على (حفظ بيانات الفاتورة) سيتم توثيقها هنا كبطاقة معتمدة كاملة مع أدوات العرض والتعديل والحذف.</p>
          </div>
        )}
      </SectionCard>

      {/* ━━━ MODAL: عرض تفاصيل بطاقة الفاتورة المعتمدة ━━━ */}
      {viewingInvoice && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in">
            <div className="bg-card border border-border rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden text-foreground">
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-border gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 text-indigo-600 flex items-center justify-center font-bold">
                    <Receipt className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-foreground text-base sm:text-lg">
                      {viewingInvoice.invoiceNumber}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      تاريخ الإصدار: {formatDate(viewingInvoice.invoiceDate)} • النوع:{" "}
                      {viewingInvoice.invoiceType === "ELECTRONIC" ? "إلكترونية ETA" : "ورقية رسمية"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setViewingInvoice(null)}
                    className="h-8.5 w-8.5 rounded-full hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 text-xs">
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">الشركة المصدرة:</span>
                      <strong className="text-foreground text-xs">{viewingInvoice.companyName}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">إذن ومحضر التسليم:</span>
                      <strong className="text-foreground text-xs font-mono">{viewingInvoice.deliveryReceiptNumber}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">موقع ومقر التسليم:</span>
                      <strong className="text-foreground text-xs">{viewingInvoice.deliveryLocation}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">المستلم بالجهة:</span>
                      <strong className="text-foreground text-xs">{viewingInvoice.recipientName} ({viewingInvoice.recipientRole})</strong>
                    </div>
                    {viewingInvoice.electronicUuid && (
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground block text-[11px]">الرقم التعريفي الفريد (UUID):</span>
                        <strong className="text-foreground text-xs font-mono">{viewingInvoice.electronicUuid}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border border-border rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-muted/70 text-muted-foreground font-bold border-b border-border">
                      <tr>
                        <th className="p-2.5 text-center w-12">#</th>
                        <th className="p-2.5">بيان الصنف</th>
                        <th className="p-2.5 text-center">الوحدة</th>
                        <th className="p-2.5 text-center">الكمية</th>
                        <th className="p-2.5 text-center">سعر الوحدة</th>
                        <th className="p-2.5 text-center">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {(viewingInvoice.items || []).map((it, i) => (
                        <tr key={it.id || i} className="hover:bg-muted/20">
                          <td className="p-2.5 text-center font-mono font-bold text-muted-foreground">{i + 1}</td>
                          <td className="p-2.5 font-bold text-foreground">{it.itemName}</td>
                          <td className="p-2.5 text-center text-muted-foreground">{it.unit}</td>
                          <td className="p-2.5 text-center font-mono font-bold">{it.quantity}</td>
                          <td className="p-2.5 text-center font-mono font-bold">{formatCurrency(it.unitPrice)}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-emerald-600">{formatCurrency((it.quantity || 0) * (it.unitPrice || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/50 font-bold border-t border-border">
                      <tr>
                        <td colSpan={4} className="p-2.5 text-left">المجموع قبل الضريبة:</td>
                        <td colSpan={2} className="p-2.5 text-center font-mono text-foreground font-black">{formatCurrency(viewingInvoice.subtotal)}</td>
                      </tr>
                      <tr>
                        <td colSpan={4} className="p-2.5 text-left">ضريبة القيمة المضافة (14%):</td>
                        <td colSpan={2} className="p-2.5 text-center font-mono text-indigo-600 font-black">+{formatCurrency(viewingInvoice.totalVat)}</td>
                      </tr>
                      <tr className="bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                        <td colSpan={4} className="p-3 text-left font-black">الإجمالي النهائي:</td>
                        <td colSpan={2} className="p-3 text-center font-mono font-black text-sm">{formatCurrency(viewingInvoice.grandTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="p-3 rounded-2xl bg-muted/30 border border-border text-xs font-bold text-foreground">
                  التفقيط المعتمد: {tafqeetArabic(viewingInvoice.grandTotal)}
                </div>

                {/* Attachments Actions */}
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  {viewingInvoice.invoiceFilePath && (
                    <Button
                      size="sm"
                      onClick={() =>
                        onPreviewDoc?.({
                          fileName: `فاتورة_معتمدة_${viewingInvoice.invoiceNumber}.pdf`,
                          filePath: viewingInvoice.invoiceFilePath,
                          title: `فاتورة ${viewingInvoice.invoiceNumber}`,
                        })
                      }
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8.5 px-3 rounded-xl flex items-center gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>معاينة ملف الفاتورة المعتمدة</span>
                    </Button>
                  )}
                  {viewingInvoice.deliveryFilePath && (
                    <Button
                      size="sm"
                      onClick={() =>
                        onPreviewDoc?.({
                          fileName: `إذن_تسليم_${viewingInvoice.deliveryReceiptNumber}.pdf`,
                          filePath: viewingInvoice.deliveryFilePath,
                          title: `إذن تسليم ${viewingInvoice.deliveryReceiptNumber}`,
                        })
                      }
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8.5 px-3 rounded-xl flex items-center gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>معاينة إذن التسليم المعتمد</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-border flex justify-end">
                <Button
                  size="sm"
                  onClick={() => setViewingInvoice(null)}
                  className="rounded-xl font-bold px-5"
                >
                  إغلاق النافذة
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Continuity Action Footer */}
      <StepFooterNav currentTabId="invoicing" onNavigate={onNavigate} />
    </div>
  );
}
