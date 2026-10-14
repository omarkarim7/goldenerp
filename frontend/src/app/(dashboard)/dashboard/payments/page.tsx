"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Wallet, Plus, Search, Filter, CheckCircle2, Clock,
  ArrowUpRight, ArrowDownLeft, Building2, Calendar, FileText,
  CreditCard, Landmark, X, Edit, Trash2, Printer, Download,
  Eye, Check, AlertCircle, RefreshCw, Layers, DollarSign,
  TrendingUp, TrendingDown, Receipt, ArrowRight, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export interface PaymentRecord {
  id: string;
  referenceNumber: string;
  supplierName: string;
  operationCode: string;
  operationName?: string;
  amount: number;
  paymentMethod: "BANK_TRANSFER" | "CHECK" | "CASH" | "ELECTRONIC";
  bankName?: string;
  checkNumber?: string;
  status: "COMPLETED" | "PENDING" | "PROCESSING";
  date: string;
  dueDate?: string;
  notes?: string;
  approvedBy?: string;
  receiptNumber?: string;
}

const INITIAL_PAYMENTS: PaymentRecord[] = [
  {
    id: "p1",
    referenceNumber: "PAY-8421",
    supplierName: "شركة النيل للتوريدات الكهربائية",
    operationCode: "A15",
    operationName: "توريد وتركيب شبكة كابلات محولات الجهد المتوسط",
    amount: 185000,
    paymentMethod: "BANK_TRANSFER",
    bankName: "البنك الأهلي المصري",
    status: "COMPLETED",
    date: "2026-10-01",
    dueDate: "2026-10-01",
    notes: "دفعة مقدمة 50% طبقاً لكراسة الشروط وأمر التوريد رقم 12",
    approvedBy: "مدير الشؤون المالية",
    receiptNumber: "BNK-EG-99321",
  },
  {
    id: "p2",
    referenceNumber: "PAY-8420",
    supplierName: "المتحدة للشبكات والألياف الضوئية",
    operationCode: "B08",
    operationName: "إحلال وتجديد كابلات الفايبر والسنترالات",
    amount: 92400,
    paymentMethod: "CHECK",
    bankName: "بنك مصر",
    checkNumber: "CHK-0049281",
    status: "COMPLETED",
    date: "2026-09-28",
    dueDate: "2026-09-28",
    notes: "سداد قيمة خامات كابلات الألياف بموجب محضر فحص فني معتمد",
    approvedBy: "المدير العام",
    receiptNumber: "CHK-REC-482",
  },
  {
    id: "p3",
    referenceNumber: "PAY-8419",
    supplierName: "العالمية للأنظمة الأمنية والمراقبة",
    operationCode: "A12",
    operationName: "كاميرات المراقبة وغرفة التحكم المركزية",
    amount: 45000,
    paymentMethod: "BANK_TRANSFER",
    bankName: "البنك التجاري الدولي CIB",
    status: "PROCESSING",
    date: "2026-10-01",
    dueDate: "2026-10-15",
    notes: "قيد المراجعة وإصدار إشعار التحويل البنكي الإلكتروني",
    approvedBy: "مسؤول المشتريات",
  },
  {
    id: "p4",
    referenceNumber: "PAY-8418",
    supplierName: "المصرية للأجهزة والحلول المكتبية",
    operationCode: "C03",
    operationName: "تجهيز وتأثيث معامل الحاسب الآلي",
    amount: 16500,
    paymentMethod: "CASH",
    status: "COMPLETED",
    date: "2026-09-25",
    dueDate: "2026-09-25",
    notes: "سداد نقدي من الخزينة الرئيسية بإيصال استلام رسمي",
    approvedBy: "أمين الخزينة",
    receiptNumber: "CSH-0081",
  },
  {
    id: "p5",
    referenceNumber: "PAY-8417",
    supplierName: "الأهرام للمقاولات والمواد العازلة",
    operationCode: "D05",
    operationName: "أعمال العزل الحراري والمائي لمباني التعليم",
    amount: 67200,
    paymentMethod: "CHECK",
    bankName: "بنك القاهرة",
    checkNumber: "CHK-77401",
    status: "PENDING",
    date: "2026-10-08",
    dueDate: "2026-10-20",
    notes: "بانتظار اعتماد محضر الاستلام الميداني للموقع من الاستشاري",
    approvedBy: "قيد الاعتماد",
  },
];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>(INITIAL_PAYMENTS);
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "ANALYTICS">("ALL");

  // Modals state
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);

  // Form states
  const [formRef, setFormRef] = useState("");
  const [formSupplier, setFormSupplier] = useState("");
  const [formOpCode, setFormOpCode] = useState("A15");
  const [formOpName, setFormOpName] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formMethod, setFormMethod] = useState<"BANK_TRANSFER" | "CHECK" | "CASH" | "ELECTRONIC">("BANK_TRANSFER");
  const [formBankName, setFormBankName] = useState("البنك الأهلي المصري");
  const [formCheckNumber, setFormCheckNumber] = useState("");
  const [formStatus, setFormStatus] = useState<"COMPLETED" | "PENDING" | "PROCESSING">("COMPLETED");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formDueDate, setFormDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [formNotes, setFormNotes] = useState("");
  const [formReceiptNumber, setFormReceiptNumber] = useState("");

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP" }).format(n);

  // Filtered payments
  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const matchSearch =
        p.supplierName.includes(search) ||
        p.referenceNumber.includes(search) ||
        p.operationCode.includes(search) ||
        (p.operationName && p.operationName.includes(search)) ||
        (p.checkNumber && p.checkNumber.includes(search));

      const matchMethod = filterMethod === "ALL" || p.paymentMethod === filterMethod;
      const matchStatus = filterStatus === "ALL" || p.status === filterStatus;

      const matchTab =
        activeTab === "ALL"
          ? true
          : activeTab === "PENDING"
          ? p.status === "PENDING" || p.status === "PROCESSING"
          : true;

      return matchSearch && matchMethod && matchStatus && matchTab;
    });
  }, [payments, search, filterMethod, filterStatus, activeTab]);

  // Statistics
  const totalPaid = payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((acc, p) => acc + p.amount, 0);

  const totalPending = payments
    .filter((p) => p.status === "PENDING" || p.status === "PROCESSING")
    .reduce((acc, p) => acc + p.amount, 0);

  const completedCount = payments.filter((p) => p.status === "COMPLETED").length;
  const pendingCount = payments.filter((p) => p.status === "PENDING").length;
  const processingCount = payments.filter((p) => p.status === "PROCESSING").length;

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormRef("PAY-" + Math.floor(1000 + Math.random() * 9000));
    setFormSupplier("");
    setFormOpCode("A15");
    setFormOpName("");
    setFormAmount("");
    setFormMethod("BANK_TRANSFER");
    setFormBankName("البنك الأهلي المصري");
    setFormCheckNumber("");
    setFormStatus("COMPLETED");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormDueDate(new Date().toISOString().split("T")[0]);
    setFormNotes("");
    setFormReceiptNumber("REC-" + Math.floor(10000 + Math.random() * 90000));
    setCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (p: PaymentRecord) => {
    setSelectedPayment(p);
    setFormRef(p.referenceNumber);
    setFormSupplier(p.supplierName);
    setFormOpCode(p.operationCode);
    setFormOpName(p.operationName || "");
    setFormAmount(String(p.amount));
    setFormMethod(p.paymentMethod);
    setFormBankName(p.bankName || "البنك الأهلي المصري");
    setFormCheckNumber(p.checkNumber || "");
    setFormStatus(p.status);
    setFormDate(p.date);
    setFormDueDate(p.dueDate || p.date);
    setFormNotes(p.notes || "");
    setFormReceiptNumber(p.receiptNumber || "");
    setEditModalOpen(true);
  };

  // Open Voucher Modal
  const handleOpenVoucher = (p: PaymentRecord) => {
    setSelectedPayment(p);
    setVoucherModalOpen(true);
  };

  // Open Delete Confirm
  const handleOpenDelete = (p: PaymentRecord) => {
    setSelectedPayment(p);
    setDeleteConfirmOpen(true);
  };

  // Submit Create
  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSupplier.trim() || !formAmount || Number(formAmount) <= 0) {
      toast.error("يرجى إدخال اسم المورد ومبلغ الدفعة بشكل صحيح");
      return;
    }

    const newPayment: PaymentRecord = {
      id: "p-" + Date.now(),
      referenceNumber: formRef || ("PAY-" + Math.floor(1000 + Math.random() * 9000)),
      supplierName: formSupplier.trim(),
      operationCode: formOpCode.trim(),
      operationName: formOpName.trim() || undefined,
      amount: Number(formAmount),
      paymentMethod: formMethod,
      bankName: formMethod === "BANK_TRANSFER" || formMethod === "CHECK" ? formBankName : undefined,
      checkNumber: formMethod === "CHECK" ? formCheckNumber : undefined,
      status: formStatus,
      date: formDate,
      dueDate: formDueDate,
      notes: formNotes.trim() || undefined,
      approvedBy: formStatus === "COMPLETED" ? "الشؤون المالية" : "قيد الاعتماد",
      receiptNumber: formReceiptNumber.trim() || undefined,
    };

    setPayments([newPayment, ...payments]);
    toast.success("تم تسجيل المعاملة المالية وسند الصرف بنجاح");
    setCreateModalOpen(false);
  };

  // Submit Update
  const handleUpdatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    if (!formSupplier.trim() || !formAmount || Number(formAmount) <= 0) {
      toast.error("يرجى التأكد من البيانات والمبلغ");
      return;
    }

    const updated = payments.map((p) => {
      if (p.id === selectedPayment.id) {
        return {
          ...p,
          referenceNumber: formRef,
          supplierName: formSupplier.trim(),
          operationCode: formOpCode.trim(),
          operationName: formOpName.trim() || undefined,
          amount: Number(formAmount),
          paymentMethod: formMethod,
          bankName: formMethod === "BANK_TRANSFER" || formMethod === "CHECK" ? formBankName : undefined,
          checkNumber: formMethod === "CHECK" ? formCheckNumber : undefined,
          status: formStatus,
          date: formDate,
          dueDate: formDueDate,
          notes: formNotes.trim() || undefined,
          receiptNumber: formReceiptNumber.trim() || undefined,
        };
      }
      return p;
    });

    setPayments(updated);
    toast.success("تم تحديث بيانات المعاملة المالية بنجاح");
    setEditModalOpen(false);
  };

  // Quick Toggle Status
  const handleQuickStatusChange = (id: string, newStatus: "COMPLETED" | "PENDING" | "PROCESSING") => {
    setPayments(
      payments.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );
    toast.success("تم تحديث حالة السداد بنجاح");
  };

  // Delete Payment
  const handleDeletePayment = () => {
    if (!selectedPayment) return;
    setPayments(payments.filter((p) => p.id !== selectedPayment.id));
    toast.success(`تم حذف السند المالي ${selectedPayment.referenceNumber}`);
    setDeleteConfirmOpen(false);
    setSelectedPayment(null);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "الرقم المرجعي",
      "المورد المستحق",
      "كود العملية",
      "المبلغ (ج.م)",
      "طريقة الدفع",
      "البنك / الشيك",
      "تاريخ السداد",
      "الحالة",
      "الملاحظات",
    ];

    const rows = filtered.map((p) => [
      p.referenceNumber,
      `"${p.supplierName.replace(/"/g, '""')}"`,
      p.operationCode,
      p.amount,
      p.paymentMethod,
      `"${(p.bankName ? p.bankName + " " : "") + (p.checkNumber || "")}"`,
      p.date,
      p.status,
      `"${(p.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `كشف_المدفوعات_المالية_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير سجل المدفوعات بنجاح (CSV)");
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* ━━━ Header ━━━ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-xs">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                المدفوعات والمستحقات المالية
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                إدارة مستحقات الموردين، التدفقات النقدية، الشيكات البنكية، وسندات الصرف الرسمية
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="border-border text-foreground hover:bg-muted text-xs h-9 px-3 rounded-xl cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 ml-1.5 text-emerald-600" />
            <span>تصدير الكشف</span>
          </Button>

          <Button
            onClick={handleOpenCreate}
            className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold px-4 h-9 rounded-xl shadow-lg shadow-emerald-500/20 royal-glow flex items-center gap-2 text-xs sm:text-sm active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>تسجيل سند صرف جديد</span>
          </Button>
        </div>
      </div>

      {/* ━━━ KPI Stats Cards ━━━ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-border">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>إجمالي المسدد فعلياً</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            {formatCurrency(totalPaid)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block font-mono">
            {completedCount} سندات مسددة
          </span>
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-border">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>التزامات ومستحقات معلقة</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 font-mono">
            {formatCurrency(totalPending)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block font-mono">
            {pendingCount + processingCount} سندات قيد الصرف
          </span>
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-border">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>التحويلات البنكية والشيكات</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Landmark className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-2 font-mono">
            {payments.filter((p) => p.paymentMethod === "BANK_TRANSFER" || p.paymentMethod === "CHECK").length}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">معاملات بنكية معتمدة</span>
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-border">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>متوسط قيمة السند</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-2 font-mono">
            {formatCurrency(payments.length > 0 ? Math.round((totalPaid + totalPending) / payments.length) : 0)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">لكل أمر توريد</span>
        </div>
      </div>

      {/* ━━━ Nav Tabs ━━━ */}
      <div className="flex items-center gap-2 border-b border-border pb-2 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("ALL")}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === "ALL"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          سجل المدفوعات الكامل ({payments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("PENDING")}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === "PENDING"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          المستحقات المعلقة والتزامات التوريد ({pendingCount + processingCount})
        </button>
      </div>

      {/* ━━━ Search and Filter Toolbar ━━━ */}
      <div className="glass-card rounded-2xl p-4 border border-border flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث برقم السند PAY-XXXX، اسم المورد، كود العملية، أو رقم الشيك..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-emerald-500 rounded-xl text-xs sm:text-sm h-10 w-full"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Method Filter */}
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="h-10 px-3 bg-muted/40 border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-hidden focus:border-emerald-500"
          >
            <option value="ALL">كافة طرق السداد</option>
            <option value="BANK_TRANSFER">تحويل بنكي</option>
            <option value="CHECK">شيك مصرفي</option>
            <option value="CASH">نقدي من الخزينة</option>
            <option value="ELECTRONIC">سداد إلكتروني</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-10 px-3 bg-muted/40 border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-hidden focus:border-emerald-500"
          >
            <option value="ALL">كافة الحالات</option>
            <option value="COMPLETED">مسدد ومكتمل</option>
            <option value="PROCESSING">قيد المراجعة والتحويل</option>
            <option value="PENDING">معلق بانتظار الاعتماد</option>
          </select>
        </div>
      </div>

      {/* ━━━ Table of Payments ━━━ */}
      <div className="glass-card rounded-2xl border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold">
              <tr>
                <th className="p-3.5">الرقم المرجعي</th>
                <th className="p-3.5">المورد المستحق</th>
                <th className="p-3.5">العملية المرتبطة</th>
                <th className="p-3.5">المبلغ</th>
                <th className="p-3.5">طريقة السداد</th>
                <th className="p-3.5">تاريخ الاستحقاق</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    لا توجد سندات أو معاملات مالية مطابقة لمعايير البحث.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-foreground">
                      <div className="flex items-center gap-1.5">
                        <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{p.referenceNumber}</span>
                      </div>
                    </td>

                    <td className="p-3.5 font-bold text-foreground">
                      <div className="truncate max-w-[200px]" title={p.supplierName}>
                        {p.supplierName}
                      </div>
                      {p.notes && (
                        <p className="text-[10px] text-muted-foreground font-normal truncate max-w-[200px]">
                          {p.notes}
                        </p>
                      )}
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="border-blue-500/30 text-blue-600 dark:text-blue-400 font-mono text-[11px]"
                        >
                          {p.operationCode}
                        </Badge>
                        {p.operationName && (
                          <span className="text-[11px] text-muted-foreground truncate max-w-[150px] hidden sm:inline">
                            {p.operationName}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 font-mono font-black text-foreground text-sm">
                      {formatCurrency(p.amount)}
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                        {p.paymentMethod === "BANK_TRANSFER" ? (
                          <>
                            <Landmark className="h-3.5 w-3.5 text-blue-600" />
                            <span>تحويل ({p.bankName || "بنكي"})</span>
                          </>
                        ) : p.paymentMethod === "CHECK" ? (
                          <>
                            <FileText className="h-3.5 w-3.5 text-purple-600" />
                            <span>شيك {p.checkNumber ? `#${p.checkNumber}` : ""}</span>
                          </>
                        ) : (
                          <>
                            <Wallet className="h-3.5 w-3.5 text-amber-600" />
                            <span>نقدي (خزينة)</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 font-mono text-[11px] text-muted-foreground">
                      <div>{p.date}</div>
                      {p.dueDate && p.dueDate !== p.date && (
                        <div className="text-[10px] text-amber-600">مهلة: {p.dueDate}</div>
                      )}
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          className={
                            p.status === "COMPLETED"
                              ? "badge-emerald text-[10px]"
                              : p.status === "PROCESSING"
                              ? "badge-blue text-[10px]"
                              : "badge-amber text-[10px]"
                          }
                        >
                          {p.status === "COMPLETED"
                            ? "مسدد ✓"
                            : p.status === "PROCESSING"
                            ? "قيد التحويل"
                            : "معلق"}
                        </Badge>

                        {/* Quick Action Button to Complete */}
                        {p.status !== "COMPLETED" && (
                          <button
                            type="button"
                            onClick={() => handleQuickStatusChange(p.id, "COMPLETED")}
                            className="p-1 rounded-md text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                            title="تحديد كمسدد ومكتمل"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenVoucher(p)}
                          className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-500/10 rounded-md cursor-pointer"
                          title="عرض وطباعة سند الصرف"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(p)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md cursor-pointer"
                          title="تعديل"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDelete(p)}
                          className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-md cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: تسجيل سند صرف جديد (Create Payment)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {mounted && createModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="relative w-full max-w-xl bg-card dark:bg-[#0c1427] rounded-3xl border border-border shadow-2xl flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden animate-scale-up my-auto">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border bg-card dark:bg-[#0c1427] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">تسجيل سند صرف مالي جديد</h3>
                  <p className="text-xs text-muted-foreground">توثيق دفعة للموردين أو مقاولي الباطن</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded-xl hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-foreground mb-1">الرقم المرجعي للسند</label>
                    <Input
                      required
                      value={formRef}
                      onChange={(e) => setFormRef(e.target.value)}
                      className="bg-muted/40 border-border text-foreground font-mono focus:border-emerald-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">كود العملية المرتبطة *</label>
                    <Input
                      required
                      placeholder="مثال: A15 أو B08"
                      value={formOpCode}
                      onChange={(e) => setFormOpCode(e.target.value)}
                      className="bg-muted/40 border-border text-foreground font-mono focus:border-emerald-500 rounded-xl h-9"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-foreground mb-1">اسم المورد أو المستفيد *</label>
                    <Input
                      required
                      placeholder="مثال: شركة النيل للتوريدات الكهربائية"
                      value={formSupplier}
                      onChange={(e) => setFormSupplier(e.target.value)}
                      className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-emerald-500 rounded-xl h-9"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-foreground mb-1">اسم العملية / موضوع المناقصة</label>
                    <Input
                      placeholder="مثال: توريد وتركيب كابلات ومحولات الجهد المتوسط"
                      value={formOpName}
                      onChange={(e) => setFormOpName(e.target.value)}
                      className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-emerald-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">قيمة المبلغ المصروف (ج.م) *</label>
                    <Input
                      type="number"
                      required
                      placeholder="150000"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="bg-muted/40 border-border text-foreground font-mono font-bold text-sm focus:border-emerald-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">طريقة السداد *</label>
                    <select
                      value={formMethod}
                      onChange={(e) => setFormMethod(e.target.value as any)}
                      className="w-full h-9 px-3 bg-muted/40 border border-border rounded-xl text-foreground font-semibold focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="BANK_TRANSFER">تحويل بنكي</option>
                      <option value="CHECK">شيك بنكي</option>
                      <option value="CASH">سداد نقدي من الخزينة</option>
                      <option value="ELECTRONIC">سداد إلكتروني</option>
                    </select>
                  </div>

                  {(formMethod === "BANK_TRANSFER" || formMethod === "CHECK") && (
                    <div>
                      <label className="block font-bold text-foreground mb-1">اسم البنك المصدر</label>
                      <Input
                        placeholder="البنك الأهلي المصري"
                        value={formBankName}
                        onChange={(e) => setFormBankName(e.target.value)}
                        className="bg-muted/40 border-border text-foreground focus:border-emerald-500 rounded-xl h-9"
                      />
                    </div>
                  )}

                  {formMethod === "CHECK" && (
                    <div>
                      <label className="block font-bold text-foreground mb-1">رقم الشيك المصرفي</label>
                      <Input
                        placeholder="CHK-009842"
                        value={formCheckNumber}
                        onChange={(e) => setFormCheckNumber(e.target.value)}
                        className="bg-muted/40 border-border text-foreground font-mono focus:border-emerald-500 rounded-xl h-9"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-foreground mb-1">تاريخ السند / الصرف</label>
                    <Input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="bg-muted/40 border-border text-foreground font-mono focus:border-emerald-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">حالة السداد</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full h-9 px-3 bg-muted/40 border border-border rounded-xl text-foreground font-semibold focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="COMPLETED">مسدد ومكتمل</option>
                      <option value="PROCESSING">قيد المراجعة والتحويل</option>
                      <option value="PENDING">معلق بانتظار الاعتماد</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-foreground mb-1">رقم الإيصال / إشعار التحويل البنكي</label>
                    <Input
                      placeholder="BNK-EG-99321"
                      value={formReceiptNumber}
                      onChange={(e) => setFormReceiptNumber(e.target.value)}
                      className="bg-muted/40 border-border text-foreground font-mono focus:border-emerald-500 rounded-xl h-9"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-foreground mb-1">ملاحظات السند المالي</label>
                    <Input
                      placeholder="دفعة مقدمة 50% أو مستخلص نهائي..."
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      className="bg-muted/40 border-border text-foreground focus:border-emerald-500 rounded-xl h-9"
                    />
                  </div>
                </div>
              </div>

              <div className="px-5 sm:px-6 py-3.5 border-t border-border bg-muted/40 flex items-center justify-end gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateModalOpen(false)}
                  className="border-border text-foreground hover:bg-muted rounded-xl text-xs h-9 cursor-pointer"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-9 px-5 cursor-pointer shadow-sm"
                >
                  حفظ السند المالي
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: تعديل السند المالي (Edit Payment)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {mounted && editModalOpen && selectedPayment && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="relative w-full max-w-xl bg-card dark:bg-[#0c1427] rounded-3xl border border-border shadow-2xl flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden animate-scale-up my-auto">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border bg-card dark:bg-[#0c1427] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Edit className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">تعديل السند المالي</h3>
                  <p className="text-xs text-muted-foreground">{selectedPayment.referenceNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded-xl hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePayment} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-foreground mb-1">الرقم المرجعي</label>
                    <Input
                      required
                      value={formRef}
                      onChange={(e) => setFormRef(e.target.value)}
                      className="bg-muted/40 border-border text-foreground font-mono focus:border-amber-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">كود العملية *</label>
                    <Input
                      required
                      value={formOpCode}
                      onChange={(e) => setFormOpCode(e.target.value)}
                      className="bg-muted/40 border-border text-foreground font-mono focus:border-amber-500 rounded-xl h-9"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-foreground mb-1">اسم المورد / المستفيد *</label>
                    <Input
                      required
                      value={formSupplier}
                      onChange={(e) => setFormSupplier(e.target.value)}
                      className="bg-muted/40 border-border text-foreground focus:border-amber-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">المبلغ (ج.م) *</label>
                    <Input
                      type="number"
                      required
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="bg-muted/40 border-border text-foreground font-mono font-bold text-sm focus:border-amber-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">طريقة السداد</label>
                    <select
                      value={formMethod}
                      onChange={(e) => setFormMethod(e.target.value as any)}
                      className="w-full h-9 px-3 bg-muted/40 border border-border rounded-xl text-foreground font-semibold focus:outline-hidden focus:border-amber-500"
                    >
                      <option value="BANK_TRANSFER">تحويل بنكي</option>
                      <option value="CHECK">شيك بنكي</option>
                      <option value="CASH">سداد نقدي</option>
                      <option value="ELECTRONIC">سداد إلكتروني</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">تاريخ السند</label>
                    <Input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="bg-muted/40 border-border text-foreground font-mono focus:border-amber-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">الحالة</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full h-9 px-3 bg-muted/40 border border-border rounded-xl text-foreground font-semibold focus:outline-hidden focus:border-amber-500"
                    >
                      <option value="COMPLETED">مسدد ومكتمل</option>
                      <option value="PROCESSING">قيد المراجعة والتحويل</option>
                      <option value="PENDING">معلق بانتظار الاعتماد</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-foreground mb-1">ملاحظات السند</label>
                    <Input
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      className="bg-muted/40 border-border text-foreground focus:border-amber-500 rounded-xl h-9"
                    />
                  </div>
                </div>
              </div>

              <div className="px-5 sm:px-6 py-3.5 border-t border-border bg-muted/40 flex items-center justify-end gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditModalOpen(false)}
                  className="border-border text-foreground hover:bg-muted rounded-xl text-xs h-9 cursor-pointer"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs h-9 px-5 cursor-pointer shadow-sm"
                >
                  تحديث السند
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: سند صرف مالي رسمي للطباعة (Printable Voucher)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {mounted && voucherModalOpen && selectedPayment && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="relative w-full max-w-2xl bg-card dark:bg-[#0c1427] rounded-3xl border border-border shadow-2xl flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden animate-scale-up my-auto">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border bg-card dark:bg-[#0c1427] shrink-0">
              <div className="flex items-center gap-2 text-emerald-600">
                <Printer className="h-5 w-5" />
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  سند صرف مالي رسمي (إذن صرف نقدية / بنكي)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVoucherModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded-xl hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
              {/* Official Printable Layout */}
              <div className="p-6 bg-card border-2 border-border/80 rounded-2xl space-y-5 text-foreground print:m-0 print:border-none shadow-sm">
                <div className="flex items-start justify-between border-b pb-4">
                  <div>
                    <h4 className="font-extrabold text-base">شركة المنظومة الموحدة للتوريدات والمقاولات</h4>
                    <p className="text-xs text-muted-foreground">الإدارة المالية والحسابات العامة — الخزينة المركزية</p>
                  </div>
                  <div className="text-left font-mono text-xs">
                    <div className="font-bold text-sm text-emerald-600">{selectedPayment.referenceNumber}</div>
                    <div className="text-muted-foreground">التاريخ: {selectedPayment.date}</div>
                  </div>
                </div>

                <div className="text-center py-2">
                  <span className="text-lg font-black tracking-wide underline underline-offset-8">
                    إذن صرف مالي معتمد
                  </span>
                </div>

                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="flex justify-between py-1.5 border-b border-border/40">
                    <span className="font-bold text-muted-foreground">يصرف إلى السيد / السادة:</span>
                    <span className="font-extrabold text-sm text-foreground">{selectedPayment.supplierName}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-border/40">
                    <span className="font-bold text-muted-foreground">مبلغ وقدره:</span>
                    <span className="font-mono font-black text-base text-emerald-600">
                      {formatCurrency(selectedPayment.amount)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-border/40">
                    <span className="font-bold text-muted-foreground">العملية المخصوم عليها:</span>
                    <span className="font-bold font-mono">
                      كود [{selectedPayment.operationCode}] {selectedPayment.operationName ? `— ${selectedPayment.operationName}` : ""}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-border/40">
                    <span className="font-bold text-muted-foreground">طريقة الصرف:</span>
                    <span className="font-bold">
                      {selectedPayment.paymentMethod === "BANK_TRANSFER"
                        ? `تحويل بنكي عبر ${selectedPayment.bankName || "البنك الأهلي"}`
                        : selectedPayment.paymentMethod === "CHECK"
                        ? `شيك بنكي رقم (${selectedPayment.checkNumber || "—"}) مسحوب على ${selectedPayment.bankName || "البنك"}`
                        : "سداد نقدي من خزينة الشركة الرئيسية"}
                    </span>
                  </div>

                  {selectedPayment.notes && (
                    <div className="p-3 bg-muted/40 rounded-xl border border-border/60">
                      <span className="font-bold block mb-1">البيان / الغرض:</span>
                      <p>{selectedPayment.notes}</p>
                    </div>
                  )}
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t text-center text-xs">
                  <div>
                    <span className="text-muted-foreground block mb-8">إعداد الحسابات</span>
                    <span className="font-bold border-t border-border pt-1 block">محاسب الخزينة</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-8">المراجعة والتدقيق</span>
                    <span className="font-bold border-t border-border pt-1 block">رئيس قسم المالية</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-8">اعتماد الصرف</span>
                    <span className="font-bold border-t border-border pt-1 block">المدير العام / المفوض</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-t border-border bg-muted/40 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVoucherModalOpen(false)}
                className="text-xs border-border cursor-pointer"
              >
                إغلاق
              </Button>
              <Button
                size="sm"
                onClick={() => window.print()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 rounded-xl cursor-pointer shadow-md"
              >
                <Printer className="h-4 w-4 ml-1.5" />
                <span>طباعة السند الرسمي A4</span>
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: تأكيد حذف السند (Delete Confirmation)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {mounted && deleteConfirmOpen && selectedPayment && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="relative w-full max-w-md bg-card dark:bg-[#0c1427] rounded-3xl border border-border shadow-2xl p-6 space-y-4 animate-scale-up text-center my-auto">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-foreground">تأكيد حذف السند المالي</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                هل أنت متأكد من حذف السند المالي رقم{" "}
                <strong className="text-foreground">{selectedPayment.referenceNumber}</strong> بقيمة{" "}
                <strong className="text-emerald-600 font-mono">{formatCurrency(selectedPayment.amount)}</strong>؟
              </p>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
                className="border-border text-foreground hover:bg-muted rounded-xl text-xs h-9 px-4 cursor-pointer"
              >
                إلغاء
              </Button>
              <Button
                type="button"
                onClick={handleDeletePayment}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs h-9 px-5 cursor-pointer shadow-sm"
              >
                تأكيد الحذف
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
