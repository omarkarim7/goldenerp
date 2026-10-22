"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Wallet, Plus, Search, Filter, CheckCircle2, Clock,
  ArrowUpRight, ArrowDownLeft, Building2, Calendar, FileText,
  CreditCard, Landmark, X, Edit, Trash2, Printer, Download,
  Eye, Check, AlertCircle, RefreshCw, Layers, DollarSign,
  TrendingUp, TrendingDown, Receipt, ArrowRight, ShieldCheck,
  Briefcase, BarChart3, PieChart, ShieldAlert, ChevronLeft,
  SlidersHorizontal, CheckSquare, Sparkles, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";
import { useCompany } from "@/context/company-context";

export interface OperationFinancialRecord {
  id: string;
  code: string;
  name: string;
  authority: string;
  companyName: string;
  companyCode: string;
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  profitMargin: number;
  certificatesCount: number;
  certificatesTotal: number;
  guaranteesCount: number;
  guaranteesTotal: number;
  purchasesCount: number;
  purchasesTotal: number;
  status: "ACTIVE" | "COMPLETED" | "UNDER_REVIEW" | "DEFICIT";
  lastUpdated?: string;
  notes?: string;
}

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

const INITIAL_DEMO_OPERATIONS: OperationFinancialRecord[] = [
  {
    id: "op-1",
    code: "A15",
    name: "توريد وتركيب شبكة كابلات محولات الجهد المتوسط",
    authority: "هيئة المجتمعات العمرانية الجديدة",
    companyName: "المجموعة الذهبية للتوريدات والمقاولات (A)",
    companyCode: "A",
    totalRevenue: 2850000,
    totalCost: 1980000,
    netProfit: 870000,
    profitMargin: 30.5,
    certificatesCount: 3,
    certificatesTotal: 1720000,
    guaranteesCount: 2,
    guaranteesTotal: 142500,
    purchasesCount: 6,
    purchasesTotal: 840000,
    status: "ACTIVE",
    lastUpdated: "2026-10-18",
    notes: "نسبة الإنجاز المالي 60.3%، تم صرف الدفعة المقدمة وجاري تحصيل المستخلص الثاني",
  },
  {
    id: "op-2",
    code: "B08",
    name: "إحلال وتجديد كابلات الفايبر والسنترالات المركزية",
    authority: "وزارة الاتصالات وتكنولوجيا المعلومات",
    companyName: "العالمية للتوريدات والتجارة العمومية (B)",
    companyCode: "B",
    totalRevenue: 1450000,
    totalCost: 1120000,
    netProfit: 330000,
    profitMargin: 22.8,
    certificatesCount: 2,
    certificatesTotal: 980000,
    guaranteesCount: 1,
    guaranteesTotal: 72500,
    purchasesCount: 4,
    purchasesTotal: 510000,
    status: "ACTIVE",
    lastUpdated: "2026-10-12",
    notes: "التوريدات مكتملة بنسبة 85%، جاهز لتقديم المستخلص الختامي",
  },
  {
    id: "op-3",
    code: "C04",
    name: "تجهيز وتأثيث معامل الحاسب الآلي وغرف الخوادم",
    authority: "الهيئة العامة للأبنية التعليمية",
    companyName: "المتحدة للمقاولات العامة والتجارة (C)",
    companyCode: "C",
    totalRevenue: 920000,
    totalCost: 680000,
    netProfit: 240000,
    profitMargin: 26.1,
    certificatesCount: 2,
    certificatesTotal: 920000,
    guaranteesCount: 1,
    guaranteesTotal: 46000,
    purchasesCount: 3,
    purchasesTotal: 420000,
    status: "COMPLETED",
    lastUpdated: "2026-09-30",
    notes: "تم استلام الموقع ابتدائي واكتمال تحصيل 100% من المستخلصات المعتمدة",
  },
  {
    id: "op-4",
    code: "A12",
    name: "توريد وتركيب منظومة كاميرات المراقبة وغرفة التحكم",
    authority: "مديرية أمن الجيزة",
    companyName: "المجموعة الذهبية للتوريدات والمقاولات (A)",
    companyCode: "A",
    totalRevenue: 1800000,
    totalCost: 1490000,
    netProfit: 310000,
    profitMargin: 17.2,
    certificatesCount: 1,
    certificatesTotal: 650000,
    guaranteesCount: 2,
    guaranteesTotal: 90000,
    purchasesCount: 5,
    purchasesTotal: 890000,
    status: "ACTIVE",
    lastUpdated: "2026-10-05",
    notes: "توريد الأجهزة بنجاح، جاري إنهاء الأعمال التخصصية وبرمجة السيرفرات",
  },
  {
    id: "op-5",
    code: "D05",
    name: "أعمال العزل الحراري والمائي لمباني الخدمات المركزية",
    authority: "جهاز مدينة 6 أكتوبر",
    companyName: "الحديثة للتجارة العامة والتوريدات (D)",
    companyCode: "D",
    totalRevenue: 640000,
    totalCost: 690000,
    netProfit: -50000,
    profitMargin: -7.8,
    certificatesCount: 1,
    certificatesTotal: 300000,
    guaranteesCount: 1,
    guaranteesTotal: 32000,
    purchasesCount: 4,
    purchasesTotal: 480000,
    status: "DEFICIT",
    lastUpdated: "2026-10-15",
    notes: "تجاوز طفيف في ميزانية بنود الخامات نتيجة تغير أسعار التوريد، يلزم مراجعة ملحق العقد",
  },
  {
    id: "op-6",
    code: "A09",
    name: "أعمال الإحلال والتجديد لمحطات الرفع والضخ",
    authority: "شركة مياه الشرب والصرف الصحي بالجيزة",
    companyName: "المجموعة الذهبية للتوريدات والمقاولات (A)",
    companyCode: "A",
    totalRevenue: 1250000,
    totalCost: 910000,
    netProfit: 340000,
    profitMargin: 27.2,
    certificatesCount: 2,
    certificatesTotal: 850000,
    guaranteesCount: 1,
    guaranteesTotal: 62500,
    purchasesCount: 3,
    purchasesTotal: 430000,
    status: "ACTIVE",
    lastUpdated: "2026-10-08",
    notes: "تم توريد الطلمبات والمحابس وجاري تنفيذ التركيبات الميدانية",
  },
];

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
    operationCode: "C04",
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
  {
    id: "p6",
    referenceNumber: "PAY-8416",
    supplierName: "السويدي للكابلات والأنظمة المتكاملة",
    operationCode: "A15",
    operationName: "توريد وتركيب شبكة كابلات محولات الجهد المتوسط",
    amount: 240000,
    paymentMethod: "BANK_TRANSFER",
    bankName: "البنك الأهلي المصري",
    status: "COMPLETED",
    date: "2026-09-18",
    dueDate: "2026-09-18",
    notes: "سداد قيمة شحنة الكابلات النحاسية 3×150 مم2 المعتمدة بالموقع",
    approvedBy: "الشؤون المالية",
    receiptNumber: "BNK-SW-4412",
  },
];

export default function MasterFinancePage() {
  const { selectedCompany, setSelectedCompany, currentCompany, companies } = useCompany();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Master View Navigation Tab
  const [masterTab, setMasterTab] = useState<"OPERATIONS" | "PAYMENTS" | "ANALYTICS">("OPERATIONS");

  // Operations Financial Matrix State
  const [operations, setOperations] = useState<OperationFinancialRecord[]>(INITIAL_DEMO_OPERATIONS);
  const [opSearch, setOpSearch] = useState("");
  const [opFilterStatus, setOpFilterStatus] = useState("ALL");
  const [opFilterCompany, setOpFilterCompany] = useState("ALL");
  const [opViewMode, setOpViewMode] = useState<"CARDS" | "TABLE">("CARDS");
  const [selectedOp, setSelectedOp] = useState<OperationFinancialRecord | null>(null);
  const [opDossierModalOpen, setOpDossierModalOpen] = useState(false);

  // Supplier Payments Records State
  const [payments, setPayments] = useState<PaymentRecord[]>(INITIAL_PAYMENTS);
  const [paySearch, setPaySearch] = useState("");
  const [payFilterMethod, setPayFilterMethod] = useState("ALL");
  const [payFilterStatus, setPayFilterStatus] = useState("ALL");
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Payment Form states
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

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Live Data from Backend (Scoped to selected company)
  const fetchOperationsFinance = async () => {
    try {
      setLoading(true);
      const compParam = selectedCompany && selectedCompany !== "ALL" ? `?company=${selectedCompany}` : "";
      const res = await api.get(`/finance/operations-overview${compParam}`);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: OperationFinancialRecord[] = res.data.map((op: any) => {
          const fin = op.operationFinance;
          const rev = fin ? Number(fin.totalRevenue) : 0;
          const cost = fin ? Number(fin.totalCost) : 0;
          const profit = fin ? Number(fin.netProfit) : (rev - cost);
          const margin = rev > 0 ? (profit / rev) * 100 : 0;

          const certs = op.certificates || [];
          const certTotal = certs.reduce((acc: number, c: any) => acc + (Number(c.netAmount) || Number(c.grossAmount) || 0), 0);

          const guar = op.guarantees || [];
          const guarTotal = guar.reduce((acc: number, g: any) => acc + (Number(g.amount) || 0), 0);

          const purch = op.purchases || [];
          const purchTotal = purch.reduce((acc: number, p: any) => acc + (Number(p.totalAmount) || 0), 0);

          const comp = op.companies?.[0]?.company;
          const displayCode = op.companies?.[0]?.displayCode || comp?.code || "A";

          let opStatus: OperationFinancialRecord["status"] = "ACTIVE";
          if (profit < 0) opStatus = "DEFICIT";
          else if (rev > 0 && certTotal >= rev) opStatus = "COMPLETED";
          else if (rev === 0 && cost === 0) opStatus = "UNDER_REVIEW";

          return {
            id: op.id,
            code: displayCode,
            name: op.name,
            authority: op.authority || "جهة غير محددة",
            companyName: comp?.name || "الشركة المنفذة",
            companyCode: comp?.code || displayCode.charAt(0),
            totalRevenue: rev,
            totalCost: cost,
            netProfit: profit,
            profitMargin: Math.round(margin * 10) / 10,
            certificatesCount: certs.length,
            certificatesTotal: certTotal,
            guaranteesCount: guar.length,
            guaranteesTotal: guarTotal,
            purchasesCount: purch.length,
            purchasesTotal: purchTotal,
            status: opStatus,
            lastUpdated: op.updatedAt ? op.updatedAt.split("T")[0] : undefined,
            notes: op.notes || undefined,
          };
        });

        setOperations(mapped);
      }
    } catch {
      // Keep rich demo operations
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperationsFinance();
  }, [selectedCompany]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(n);

  // 1. Strict Company Scoping for Operations
  const companyScopedOperations = useMemo(() => {
    if (!selectedCompany || selectedCompany === "ALL") return operations;
    return operations.filter(
      (op) => op.companyCode === selectedCompany || op.code.toUpperCase().startsWith(selectedCompany)
    );
  }, [operations, selectedCompany]);

  // 2. Strict Company Scoping for Payments
  const companyScopedPayments = useMemo(() => {
    if (!selectedCompany || selectedCompany === "ALL") return payments;
    return payments.filter(
      (p) => p.operationCode.toUpperCase().startsWith(selectedCompany)
    );
  }, [payments, selectedCompany]);

  // 3. Master Portfolio Aggregates (Strictly Scoped to Active Company)
  const portfolioStats = useMemo(() => {
    const totalRev = companyScopedOperations.reduce((s, o) => s + o.totalRevenue, 0);
    const totalCost = companyScopedOperations.reduce((s, o) => s + o.totalCost, 0);
    const totalProfit = companyScopedOperations.reduce((s, o) => s + o.netProfit, 0);
    const overallMargin = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;
    const totalCerts = companyScopedOperations.reduce((s, o) => s + o.certificatesTotal, 0);
    const totalGuarantees = companyScopedOperations.reduce((s, o) => s + o.guaranteesTotal, 0);
    const receivables = Math.max(0, totalRev - totalCerts);

    return {
      totalRev,
      totalCost,
      totalProfit,
      overallMargin: Math.round(overallMargin * 10) / 10,
      totalCerts,
      totalGuarantees,
      receivables,
      operationsCount: companyScopedOperations.length,
    };
  }, [companyScopedOperations]);

  // Filtered Operations
  const filteredOperations = useMemo(() => {
    return companyScopedOperations.filter((op) => {
      const matchSearch =
        op.code.toLowerCase().includes(opSearch.toLowerCase()) ||
        op.name.toLowerCase().includes(opSearch.toLowerCase()) ||
        op.authority.toLowerCase().includes(opSearch.toLowerCase()) ||
        op.companyName.toLowerCase().includes(opSearch.toLowerCase());

      const matchCompany = opFilterCompany === "ALL" || op.companyCode === opFilterCompany;

      let matchStatus = true;
      if (opFilterStatus === "PROFITABLE") matchStatus = op.netProfit > 0;
      else if (opFilterStatus === "DEFICIT") matchStatus = op.netProfit < 0;
      else if (opFilterStatus === "COMPLETED") matchStatus = op.status === "COMPLETED";
      else if (opFilterStatus === "ACTIVE") matchStatus = op.status === "ACTIVE";

      return matchSearch && matchCompany && matchStatus;
    });
  }, [companyScopedOperations, opSearch, opFilterCompany, opFilterStatus]);

  // Filtered Supplier Payments
  const filteredPayments = useMemo(() => {
    return companyScopedPayments.filter((p) => {
      const matchSearch =
        p.supplierName.includes(paySearch) ||
        p.referenceNumber.includes(paySearch) ||
        p.operationCode.includes(paySearch) ||
        (p.operationName && p.operationName.includes(paySearch)) ||
        (p.checkNumber && p.checkNumber.includes(paySearch));

      const matchMethod = payFilterMethod === "ALL" || p.paymentMethod === payFilterMethod;
      const matchStatus = payFilterStatus === "ALL" || p.status === payFilterStatus;

      return matchSearch && matchMethod && matchStatus;
    });
  }, [companyScopedPayments, paySearch, payFilterMethod, payFilterStatus]);

  // Payments aggregates
  const totalPaid = companyScopedPayments
    .filter((p) => p.status === "COMPLETED")
    .reduce((acc, p) => acc + p.amount, 0);

  const totalPending = companyScopedPayments
    .filter((p) => p.status === "PENDING" || p.status === "PROCESSING")
    .reduce((acc, p) => acc + p.amount, 0);

  // Open Create Payment Modal
  const handleOpenCreatePayment = () => {
    const defaultOp = companyScopedOperations[0] || operations[0];
    setFormRef("PAY-" + Math.floor(1000 + Math.random() * 9000));
    setFormSupplier("");
    setFormOpCode(defaultOp?.code || `${selectedCompany === "ALL" ? "A" : selectedCompany}15`);
    setFormOpName(defaultOp?.name || "");
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

  // Open Edit Payment Modal
  const handleOpenEditPayment = (p: PaymentRecord) => {
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

  // Open Delete Payment
  const handleOpenDeletePayment = (p: PaymentRecord) => {
    setSelectedPayment(p);
    setDeleteConfirmOpen(true);
  };

  // Open Operation Dossier Modal
  const handleOpenOpDossier = (op: OperationFinancialRecord) => {
    setSelectedOp(op);
    setOpDossierModalOpen(true);
  };

  // Submit Create Payment
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

  // Submit Update Payment
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

  // Quick Toggle Payment Status
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
    if (masterTab === "OPERATIONS") {
      const headers = [
        "كود العملية",
        "اسم العملية",
        "الجهة المالكة",
        "الشركة التابعة",
        "قيمة التعاقد (ج.م)",
        "التكلفة الفعلية (ج.م)",
        "صافي الربح (ج.م)",
        "هامش الربح %",
        "المستخلصات المصدرة",
        "إجمالي خطابات الضمان",
      ];
      const rows = filteredOperations.map((o) => [
        o.code,
        `"${o.name.replace(/"/g, '""')}"`,
        `"${o.authority.replace(/"/g, '""')}"`,
        `"${o.companyName.replace(/"/g, '""')}"`,
        o.totalRevenue,
        o.totalCost,
        o.netProfit,
        `${o.profitMargin}%`,
        o.certificatesTotal,
        o.guaranteesTotal,
      ]);
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `المركز_المالي_${selectedCompany !== "ALL" ? `شركة_${selectedCompany}_` : ""}${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("تم تصدير المركز المالي بنجاح (CSV)");
    } else {
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
      const rows = filteredPayments.map((p) => [
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
      link.download = `سجل_المدفوعات_${selectedCompany !== "ALL" ? `شركة_${selectedCompany}_` : ""}${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("تم تصدير سجل المدفوعات بنجاح (CSV)");
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16">
      {/* ━━━ Header ━━━ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 royal-glow">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  المركز المالي العام وإدارة المدفوعات
                </h1>
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-0.5 font-bold">
                  {selectedCompany === "ALL" ? "شامل كافة الشركات 🏛️" : `شركة ${currentCompany?.name || selectedCompany} فقط`}
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                متابعة ميزانيات العمليات، الإيرادات المعتمدة، التكاليف الفعلية، مستحقات الموردين، وخطابات الضمان
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOperationsFinance}
            disabled={loading}
            className="border-border text-foreground hover:bg-muted text-xs h-9 px-3 rounded-xl cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ml-1.5 text-emerald-600 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث البيانات</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="border-border text-foreground hover:bg-muted text-xs h-9 px-3 rounded-xl cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 ml-1.5 text-emerald-600" />
            <span>تصدير تقرير (CSV)</span>
          </Button>

          <Button
            onClick={handleOpenCreatePayment}
            className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold px-4 h-9 rounded-xl shadow-lg shadow-emerald-500/20 royal-glow flex items-center gap-2 text-xs sm:text-sm active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>تسجيل سند صرف جديد</span>
          </Button>
        </div>
      </div>

      {/* ━━━ Active Company Scope Banner & Immediate Switcher ━━━ */}
      <div className="p-4 sm:p-5 rounded-3xl glass-card border border-border shadow-md space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-mono font-black text-xl text-white shadow-md shrink-0 ${
                currentCompany ? `bg-gradient-to-br ${currentCompany.gradient}` : "bg-gradient-to-br from-emerald-600 to-teal-700"
              }`}
            >
              {selectedCompany === "ALL" ? "🏛️" : selectedCompany}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-foreground">
                  {selectedCompany === "ALL"
                    ? "المركز المالي الموحد — بوابة الـ 4 شركات"
                    : `المركز المالي لـ ${currentCompany?.fullName || `شركة ${selectedCompany}`}`}
                </h2>
                <Badge
                  className={`text-[10px] font-bold ${
                    selectedCompany === "ALL"
                      ? "bg-purple-500/15 text-purple-600 border border-purple-500/30"
                      : "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                  }`}
                >
                  {selectedCompany === "ALL" ? "كافة الشركات" : `نطاق شركة ${selectedCompany} حصراً`}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedCompany === "ALL"
                  ? "عرض مالي مجمع لكافة العمليات والمدفوعات والمستخلصات المسجلة عبر منظومة الشركات الأربعة."
                  : `جميع أرقام التعاقدات والمصروفات والمستخلصات وسندات الصرف والضمانات المعروضة أدناه تخص شركة (${currentCompany?.name}) حصراً وبشكل مستقل تماماً.`}
              </p>
            </div>
          </div>
        </div>

        {/* Company Switcher Tabs */}
        <div className="pt-3 border-t border-border flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground ml-1">التبديل الفوري لنطاق الشركة:</span>
          {companies.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setSelectedCompany(c.code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCompany === c.code
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
              }`}
            >
              <span className="font-mono">{c.code}</span>
              <span>شركة {c.name}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedCompany("ALL")}
            className={`mr-auto px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedCompany === "ALL"
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>بوابة الـ 4 شركات (عرض مجمع)</span>
          </button>
        </div>
      </div>

      {/* ━━━ Master Enterprise Portfolio KPIs ━━━ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Revenues / Contract Values */}
        <div className="glass-card rounded-2xl p-4 border border-border hover:border-emerald-500/40 transition-all shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>محفظة التعاقدات</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            {formatCurrency(portfolioStats.totalRev)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            {portfolioStats.operationsCount} عمليات {selectedCompany !== "ALL" ? `لشركة ${selectedCompany}` : "معتمدة"}
          </span>
        </div>

        {/* Total Actual Costs */}
        <div className="glass-card rounded-2xl p-4 border border-border hover:border-rose-500/40 transition-all shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>التكاليف الفعلية</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 mt-2 font-mono">
            {formatCurrency(portfolioStats.totalCost)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            مصروفات وتوريدات فعلية
          </span>
        </div>

        {/* Net Profit & Margin */}
        <div className="glass-card rounded-2xl p-4 border border-border hover:border-teal-500/40 transition-all shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>صافي الأرباح</span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 font-bold ${
                portfolioStats.totalProfit >= 0
                  ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                  : "border-rose-500/30 text-rose-600 bg-rose-500/10"
              }`}
            >
              %{portfolioStats.overallMargin}
            </Badge>
          </div>
          <p className="text-lg sm:text-xl font-black text-teal-600 dark:text-teal-400 mt-2 font-mono">
            {formatCurrency(portfolioStats.totalProfit)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            هامش ربح محقق
          </span>
        </div>

        {/* Certified Invoices / Certificates */}
        <div className="glass-card rounded-2xl p-4 border border-border hover:border-blue-500/40 transition-all shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>المستخلصات المعتمدة</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 mt-2 font-mono">
            {formatCurrency(portfolioStats.totalCerts)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            معتمدة من الجهات
          </span>
        </div>

        {/* Outstanding Receivables */}
        <div className="glass-card rounded-2xl p-4 border border-border hover:border-amber-500/40 transition-all shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>مستحقات قيد التحصيل</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 mt-2 font-mono">
            {formatCurrency(portfolioStats.receivables)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            مستحقات لدى جهات الإسناد
          </span>
        </div>

        {/* Blocked Bank Guarantees */}
        <div className="glass-card rounded-2xl p-4 border border-border hover:border-purple-500/40 transition-all shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>خطابات الضمان</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-400 mt-2 font-mono">
            {formatCurrency(portfolioStats.totalGuarantees)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            محتجزة لدى البنوك
          </span>
        </div>
      </div>

      {/* ━━━ Master Tabs Navigation ━━━ */}
      <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMasterTab("OPERATIONS")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              masterTab === "OPERATIONS"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>المركز المالي للعمليات {selectedCompany !== "ALL" ? `(شركة ${selectedCompany})` : ""}</span>
            <Badge className="bg-white/20 text-white text-[11px] px-2 py-0 border-none font-mono">
              {filteredOperations.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setMasterTab("PAYMENTS")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              masterTab === "PAYMENTS"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <Wallet className="h-4 w-4" />
            <span>سندات ومستحقات الموردين {selectedCompany !== "ALL" ? `(${selectedCompany})` : ""}</span>
            <Badge className="bg-white/20 text-white text-[11px] px-2 py-0 border-none font-mono">
              {filteredPayments.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setMasterTab("ANALYTICS")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              masterTab === "ANALYTICS"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>تحليل التدفق النقدي ومراكز التكلفة</span>
          </button>
        </div>

        {masterTab === "OPERATIONS" && (
          <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setOpViewMode("CARDS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                opViewMode === "CARDS" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              عرض الكروت 🗂️
            </button>
            <button
              type="button"
              onClick={() => setOpViewMode("TABLE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                opViewMode === "TABLE" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              عرض الجدول 📊
            </button>
          </div>
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TAB 1: المركز المالي للعمليات (الشركة المحددة أو الكل)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {masterTab === "OPERATIONS" && (
        <div className="space-y-6">
          {/* Operations Search & Filters Bar */}
          <div className="glass-card rounded-2xl p-4 border border-border flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث برمز العملية A15، اسم المناقصة، الجهة الحكومية، أو الشركة..."
                value={opSearch}
                onChange={(e) => setOpSearch(e.target.value)}
                className="pr-10 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-emerald-500 rounded-xl text-xs sm:text-sm h-10 w-full"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              {/* Financial Status Filter */}
              <select
                value={opFilterStatus}
                onChange={(e) => setOpFilterStatus(e.target.value)}
                className="h-10 px-3 bg-muted/40 border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-hidden focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">كافة الحالات المالية</option>
                <option value="PROFITABLE">العمليات الرابحة 🟢</option>
                <option value="ACTIVE">قيد التنفيذ والتشغيل 🔵</option>
                <option value="COMPLETED">مكتملة ومستخلصة 100% ✨</option>
                <option value="DEFICIT">تجاوز في الميزانية 🔴</option>
              </select>
            </div>
          </div>

          {/* Cards View */}
          {opViewMode === "CARDS" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOperations.length === 0 ? (
                <div className="col-span-full glass-card rounded-2xl p-12 text-center text-muted-foreground border border-border">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p>لا توجد عمليات مالية مسجلة لشركة ({currentCompany?.name || selectedCompany}) مطابقة لمعايير البحث.</p>
                </div>
              ) : (
                filteredOperations.map((op) => {
                  const costRatio = op.totalRevenue > 0 ? Math.min(100, (op.totalCost / op.totalRevenue) * 100) : 0;
                  const isProfitable = op.netProfit >= 0;

                  return (
                    <div
                      key={op.id}
                      className="glass-card rounded-2xl border border-border hover:border-emerald-500/50 transition-all p-5 flex flex-col justify-between space-y-4 hover:shadow-lg group"
                    >
                      {/* Card Top: Code, Badges, Title */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-extrabold px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              {op.code}
                            </span>
                            <Badge variant="outline" className="text-[11px] border-border text-muted-foreground font-semibold">
                              {op.companyName}
                            </Badge>
                          </div>

                          <Badge
                            className={`text-[10px] font-bold px-2 py-0.5 ${
                              op.status === "DEFICIT"
                                ? "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                                : op.status === "COMPLETED"
                                ? "bg-blue-500/15 text-blue-600 border border-blue-500/30"
                                : isProfitable
                                ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {op.status === "DEFICIT"
                              ? "عجز مالي 🔴"
                              : op.status === "COMPLETED"
                              ? "مكتملة 100% ✨"
                              : isProfitable
                              ? `ربح +${op.profitMargin}% 🟢`
                              : "قيد التشغيل 🔵"}
                          </Badge>
                        </div>

                        <div>
                          <h3 className="font-extrabold text-foreground text-sm line-clamp-2 group-hover:text-emerald-600 transition-colors">
                            {op.name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{op.authority}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Middle: Key Figures Matrix */}
                      <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-xl border border-border/60 text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground block font-bold">قيمة التعاقد</span>
                          <span className="font-mono font-black text-foreground text-sm">
                            {formatCurrency(op.totalRevenue)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block font-bold">التكلفة الفعلية</span>
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                            {formatCurrency(op.totalCost)}
                          </span>
                        </div>
                        <div className="pt-1 border-t border-border/40">
                          <span className="text-[10px] text-muted-foreground block font-bold">صافي الربح</span>
                          <span className={`font-mono font-black text-sm ${isProfitable ? "text-emerald-600" : "text-rose-600"}`}>
                            {formatCurrency(op.netProfit)}
                          </span>
                        </div>
                        <div className="pt-1 border-t border-border/40">
                          <span className="text-[10px] text-muted-foreground block font-bold">المستخلصات</span>
                          <span className="font-mono font-bold text-blue-600 text-sm">
                            {formatCurrency(op.certificatesTotal)}
                          </span>
                        </div>
                      </div>

                      {/* Financial Health Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                          <span>نسبة استهلاك الميزانية:</span>
                          <span className="font-mono">{Math.round(costRatio)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden border border-border/50">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              costRatio > 95
                                ? "bg-rose-500"
                                : costRatio > 75
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, costRatio)}%` }}
                          />
                        </div>
                      </div>

                      {/* Additional Tags (Guarantees & Invoices) */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3 text-purple-600" />
                          <span>ضمان: {formatCurrency(op.guaranteesTotal)}</span>
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <FileText className="h-3 w-3 text-blue-600" />
                          <span>{op.certificatesCount} مستخلصات</span>
                        </span>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenOpDossier(op)}
                          className="flex-1 text-xs h-8 rounded-xl border-border hover:bg-muted cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 ml-1 text-emerald-600" />
                          <span>الملف المالي</span>
                        </Button>

                        <Link
                          href={`/dashboard/operations/${op.id}?tab=finance`}
                          className="flex items-center justify-center gap-1 px-3 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                        >
                          <span>إدارة</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Table View */}
          {opViewMode === "TABLE" && (
            <div className="glass-card rounded-2xl border border-border overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold">
                    <tr>
                      <th className="p-3.5">الرمز</th>
                      <th className="p-3.5">اسم العملية والجهة</th>
                      <th className="p-3.5">الشركة التابعة</th>
                      <th className="p-3.5">قيمة التعاقد</th>
                      <th className="p-3.5">التكلفة الفعلية</th>
                      <th className="p-3.5">صافي الربح</th>
                      <th className="p-3.5">الهامش %</th>
                      <th className="p-3.5">المستخلصات</th>
                      <th className="p-3.5">خطابات الضمان</th>
                      <th className="p-3.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredOperations.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-10 text-center text-muted-foreground">
                          لا توجد عمليات مطابقة لمعايير البحث في نطاق شركة ({currentCompany?.name || selectedCompany}).
                        </td>
                      </tr>
                    ) : (
                      filteredOperations.map((op) => {
                        const isProfitable = op.netProfit >= 0;
                        return (
                          <tr key={op.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3.5 font-mono font-bold text-emerald-600">
                              {op.code}
                            </td>
                            <td className="p-3.5 max-w-[240px]">
                              <div className="font-extrabold text-foreground truncate">{op.name}</div>
                              <div className="text-[11px] text-muted-foreground truncate">{op.authority}</div>
                            </td>
                            <td className="p-3.5 text-muted-foreground font-semibold">
                              {op.companyName}
                            </td>
                            <td className="p-3.5 font-mono font-black text-foreground">
                              {formatCurrency(op.totalRevenue)}
                            </td>
                            <td className="p-3.5 font-mono font-bold text-rose-600">
                              {formatCurrency(op.totalCost)}
                            </td>
                            <td className={`p-3.5 font-mono font-black ${isProfitable ? "text-emerald-600" : "text-rose-600"}`}>
                              {formatCurrency(op.netProfit)}
                            </td>
                            <td className="p-3.5 font-mono font-bold">
                              <span className={`px-2 py-0.5 rounded-lg text-[11px] ${
                                isProfitable ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                              }`}>
                                %{op.profitMargin}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-blue-600 font-bold">
                              {formatCurrency(op.certificatesTotal)}
                            </td>
                            <td className="p-3.5 font-mono text-purple-600 font-bold">
                              {formatCurrency(op.guaranteesTotal)}
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenOpDossier(op)}
                                  className="h-8 w-8 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600 cursor-pointer"
                                  title="الملف المالي للعملية"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Link
                                  href={`/dashboard/operations/${op.id}?tab=finance`}
                                  className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
                                  title="إدارة شاشة المالية"
                                >
                                  <ArrowRight className="h-4 w-4" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TAB 2: سجل سندات ومستحقات الموردين (للشركة المحددة أو الكل)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {masterTab === "PAYMENTS" && (
        <div className="space-y-6">
          {/* Search and Filter Toolbar */}
          <div className="glass-card rounded-2xl p-4 border border-border flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم السند PAY-XXXX، اسم المورد، كود العملية، أو رقم الشيك..."
                value={paySearch}
                onChange={(e) => setPaySearch(e.target.value)}
                className="pr-10 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-emerald-500 rounded-xl text-xs sm:text-sm h-10 w-full"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={payFilterMethod}
                onChange={(e) => setPayFilterMethod(e.target.value)}
                className="h-10 px-3 bg-muted/40 border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-hidden focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">كافة طرق السداد</option>
                <option value="BANK_TRANSFER">تحويل بنكي</option>
                <option value="CHECK">شيك مصرفي</option>
                <option value="CASH">نقدي من الخزينة</option>
                <option value="ELECTRONIC">سداد إلكتروني</option>
              </select>

              <select
                value={payFilterStatus}
                onChange={(e) => setPayFilterStatus(e.target.value)}
                className="h-10 px-3 bg-muted/40 border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-hidden focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">كافة الحالات</option>
                <option value="COMPLETED">مسدد ومكتمل</option>
                <option value="PROCESSING">قيد المراجعة والتحويل</option>
                <option value="PENDING">معلق بانتظار الاعتماد</option>
              </select>
            </div>
          </div>

          {/* Table of Payments */}
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
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-muted-foreground">
                        لا توجد سندات أو معاملات مالية مسجلة لشركة ({currentCompany?.name || selectedCompany}).
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => (
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
                            ) : p.paymentMethod === "CASH" ? (
                              <>
                                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                                <span>نقدي بالخزينة</span>
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-3.5 w-3.5 text-teal-600" />
                                <span>سداد إلكتروني</span>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5 font-mono text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{p.dueDate || p.date}</span>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              className={`text-[10px] font-bold ${
                                p.status === "COMPLETED"
                                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                  : p.status === "PROCESSING"
                                  ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                                  : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              }`}
                            >
                              {p.status === "COMPLETED"
                                ? "تم السداد"
                                : p.status === "PROCESSING"
                                ? "قيد التحويل"
                                : "معلق"}
                            </Badge>
                          </div>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {p.status !== "COMPLETED" ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleQuickStatusChange(p.id, "COMPLETED")}
                                className="h-8 w-8 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600 cursor-pointer"
                                title="تأكيد الصرف واعتماد السداد"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleQuickStatusChange(p.id, "PENDING")}
                                className="h-8 w-8 rounded-lg hover:bg-amber-500/10 hover:text-amber-600 cursor-pointer"
                                title="إعادة للتعليق"
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenVoucher(p)}
                              className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                              title="عرض وطباعة سند الصرف"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditPayment(p)}
                              className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-amber-600 cursor-pointer"
                              title="تعديل السند"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDeletePayment(p)}
                              className="h-8 w-8 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 cursor-pointer"
                              title="حذف السند"
                            >
                              <Trash2 className="h-4 w-4" />
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
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TAB 3: تحليل التدفق النقدي ومراكز التكلفة
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {masterTab === "ANALYTICS" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cash Flow Distribution */}
            <div className="glass-card rounded-2xl p-5 border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-foreground text-sm flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-emerald-600" />
                  <span>توزيع التدفقات المالية للشركات</span>
                </h3>
                <Badge variant="outline" className="text-xs">
                  {selectedCompany === "ALL" ? "مقارنة الشركات" : `الشركة ${selectedCompany} محددة`}
                </Badge>
              </div>

              <div className="space-y-3">
                {["A", "B", "C", "D"].map((compCode) => {
                  const compOps = operations.filter((o) => o.companyCode === compCode);
                  const rev = compOps.reduce((s, o) => s + o.totalRevenue, 0);
                  const cost = compOps.reduce((s, o) => s + o.totalCost, 0);
                  const profit = rev - cost;
                  const totalEnterpriseRev = operations.reduce((s, o) => s + o.totalRevenue, 0);
                  const ratio = totalEnterpriseRev > 0 ? (rev / totalEnterpriseRev) * 100 : 0;
                  const isCurrentActive = selectedCompany === compCode;

                  return (
                    <div
                      key={compCode}
                      onClick={() => setSelectedCompany(compCode as any)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isCurrentActive
                          ? "bg-emerald-500/10 border-emerald-500/40 shadow-xs"
                          : "bg-muted/30 border-border/50 hover:bg-muted/60"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono ${
                              isCurrentActive
                                ? "bg-emerald-600 text-white font-bold"
                                : "bg-emerald-500/15 text-emerald-600"
                            }`}
                          >
                            {compCode}
                          </span>
                          <span>الشركة {compCode} ({compOps.length} عمليات)</span>
                          {isCurrentActive && (
                            <Badge className="bg-emerald-600 text-white text-[9px] py-0 px-1.5">
                              النشطة حالياً
                            </Badge>
                          )}
                        </span>
                        <span className="font-mono text-emerald-600">{formatCurrency(rev)}</span>
                      </div>

                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden my-2">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, ratio)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                        <span>التكاليف: {formatCurrency(cost)}</span>
                        <span className={profit >= 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                          صافي الربح: {formatCurrency(profit)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial Health Summary */}
            <div className="glass-card rounded-2xl p-5 border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-foreground text-sm flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-teal-600" />
                  <span>مؤشرات السيولة والضمانات البنكية</span>
                </h3>
                <Badge variant="outline" className="text-xs text-teal-600 border-teal-500/30">
                  {selectedCompany !== "ALL" ? `شركة ${selectedCompany}` : "المجموعة بالكامل"}
                </Badge>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 bg-muted/30 rounded-xl border border-border/50 space-y-2">
                  <div className="flex justify-between font-bold">
                    <span>نسبة تحصيل المستخلصات من إجمالي التعاقدات</span>
                    <span className="font-mono text-blue-600">
                      {portfolioStats.totalRev > 0
                        ? Math.round((portfolioStats.totalCerts / portfolioStats.totalRev) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full"
                      style={{
                        width: `${portfolioStats.totalRev > 0 ? (portfolioStats.totalCerts / portfolioStats.totalRev) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    تم إصدار واعتماد مستخلصات بقيمة {formatCurrency(portfolioStats.totalCerts)} من أصل {formatCurrency(portfolioStats.totalRev)}
                  </p>
                </div>

                <div className="p-4 bg-muted/30 rounded-xl border border-border/50 space-y-2">
                  <div className="flex justify-between font-bold">
                    <span>معدل هامش الربح المحقق للعمليات</span>
                    <span className="font-mono text-emerald-600">%{portfolioStats.overallMargin}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, portfolioStats.overallMargin * 2))}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    متوسط الهامش يتجاوز المستهدف المالي المقدر بـ 20%
                  </p>
                </div>

                <div className="p-4 bg-purple-500/5 rounded-xl border border-purple-500/20 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-foreground">إجمالي خطابات الضمان المحتجزة</span>
                    <p className="text-[11px] text-muted-foreground">تغطي الضمانات الابتدائية والنهائية لدى البنوك</p>
                  </div>
                  <span className="font-mono font-black text-purple-600 text-sm">
                    {formatCurrency(portfolioStats.totalGuarantees)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: تفاصيل الملف المالي الكامل للعملية (Operation Financial Dossier)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {mounted && opDossierModalOpen && selectedOp && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="relative w-full max-w-2xl bg-card dark:bg-[#0c1427] rounded-3xl border border-border shadow-2xl flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden animate-scale-up my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border bg-card dark:bg-[#0c1427] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-foreground">الملف المالي للعملية</h3>
                    <Badge variant="outline" className="font-mono text-emerald-600 border-emerald-500/30">
                      {selectedOp.code}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{selectedOp.name}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpDossierModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded-xl hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5 text-xs">
              {/* Operation Details Banner */}
              <div className="p-4 bg-muted/40 rounded-2xl border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-muted-foreground">الجهة المالكة للطرح:</span>
                  <span className="font-extrabold text-foreground">{selectedOp.authority}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-muted-foreground">الشركة المنفذة التابعة:</span>
                  <span className="font-bold text-foreground">{selectedOp.companyName}</span>
                </div>
                {selectedOp.notes && (
                  <div className="pt-2 border-t border-border/50 text-muted-foreground">
                    <span className="font-bold text-foreground block mb-0.5">ملاحظات الإدارة المالية:</span>
                    <p>{selectedOp.notes}</p>
                  </div>
                )}
              </div>

              {/* Financial Matrix Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                  <span className="text-[10px] text-muted-foreground block font-bold">قيمة التعاقد</span>
                  <span className="font-mono font-black text-emerald-600 text-sm mt-1 block">
                    {formatCurrency(selectedOp.totalRevenue)}
                  </span>
                </div>

                <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                  <span className="text-[10px] text-muted-foreground block font-bold">التكلفة الفعلية</span>
                  <span className="font-mono font-black text-rose-600 text-sm mt-1 block">
                    {formatCurrency(selectedOp.totalCost)}
                  </span>
                </div>

                <div className="p-3 bg-teal-500/5 border border-teal-500/20 rounded-xl">
                  <span className="text-[10px] text-muted-foreground block font-bold">صافي الربح</span>
                  <span className={`font-mono font-black text-sm mt-1 block ${selectedOp.netProfit >= 0 ? "text-teal-600" : "text-rose-600"}`}>
                    {formatCurrency(selectedOp.netProfit)}
                  </span>
                </div>

                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                  <span className="text-[10px] text-muted-foreground block font-bold">هامش الربح</span>
                  <span className="font-mono font-black text-blue-600 text-sm mt-1 block">
                    %{selectedOp.profitMargin}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 p-3.5 bg-muted/20 rounded-xl border border-border">
                <div className="flex items-center justify-between font-bold text-[11px]">
                  <span>نسبة استهلاك الميزانية المعتمدة:</span>
                  <span className="font-mono">
                    {selectedOp.totalRevenue > 0
                      ? Math.round((selectedOp.totalCost / selectedOp.totalRevenue) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden border border-border/60">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      selectedOp.totalCost > selectedOp.totalRevenue
                        ? "bg-rose-500"
                        : "bg-emerald-500"
                    }`}
                    style={{
                      width: `${selectedOp.totalRevenue > 0 ? Math.min(100, (selectedOp.totalCost / selectedOp.totalRevenue) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Secondary Details: Certificates & Guarantees */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-muted/30 rounded-xl border border-border space-y-1">
                  <div className="flex items-center justify-between font-bold text-foreground">
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span>المستخلصات المصدرة</span>
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {selectedOp.certificatesCount} مستخلص
                    </Badge>
                  </div>
                  <p className="font-mono font-bold text-blue-600 text-sm">
                    {formatCurrency(selectedOp.certificatesTotal)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    مستحقات قيد التحصيل: {formatCurrency(Math.max(0, selectedOp.totalRevenue - selectedOp.certificatesTotal))}
                  </p>
                </div>

                <div className="p-3.5 bg-muted/30 rounded-xl border border-border space-y-1">
                  <div className="flex items-center justify-between font-bold text-foreground">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-purple-600" />
                      <span>خطابات الضمان البنكية</span>
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {selectedOp.guaranteesCount} خطاب
                    </Badge>
                  </div>
                  <p className="font-mono font-bold text-purple-600 text-sm">
                    {formatCurrency(selectedOp.guaranteesTotal)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">محتجزة بالبنوك حتى انتهاء فترة الضمان والاستلام</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 sm:px-6 py-3.5 border-t border-border bg-muted/40 flex items-center justify-between shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpDossierModalOpen(false)}
                className="text-xs border-border cursor-pointer"
              >
                إغلاق
              </Button>

              <Link
                href={`/dashboard/operations/${selectedOp.id}?tab=finance`}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
              >
                <span>الانتقال لشاشة مالية العملية</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: إضافة سند صرف مالي (Create Payment)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {mounted && createModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="relative w-full max-w-xl bg-card dark:bg-[#0c1427] rounded-3xl border border-border shadow-2xl flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden animate-scale-up my-auto">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border bg-card dark:bg-[#0c1427] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">تسجيل سند صرف مالي جديد</h3>
                  <p className="text-xs text-muted-foreground">إصدار إذن دفع لمورد أو مقاول أو مستحقات عملية</p>
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
                    <label className="block font-bold text-foreground mb-1">كود العملية *</label>
                    <Input
                      required
                      value={formOpCode}
                      onChange={(e) => setFormOpCode(e.target.value)}
                      placeholder="مثال: A15"
                      className="bg-muted/40 border-border text-foreground font-mono focus:border-emerald-500 rounded-xl h-9"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-foreground mb-1">اسم المورد / المستفيد *</label>
                    <Input
                      required
                      value={formSupplier}
                      onChange={(e) => setFormSupplier(e.target.value)}
                      placeholder="اسم المورد أو الشركة المستحقة..."
                      className="bg-muted/40 border-border text-foreground focus:border-emerald-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">المبلغ (ج.م) *</label>
                    <Input
                      type="number"
                      required
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="0.00"
                      className="bg-muted/40 border-border text-foreground font-mono font-bold text-sm focus:border-emerald-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">طريقة السداد</label>
                    <select
                      value={formMethod}
                      onChange={(e) => setFormMethod(e.target.value as any)}
                      className="w-full h-9 px-3 bg-muted/40 border border-border rounded-xl text-foreground font-semibold focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="BANK_TRANSFER">تحويل بنكي</option>
                      <option value="CHECK">شيك بنكي</option>
                      <option value="CASH">سداد نقدي من الخزينة</option>
                      <option value="ELECTRONIC">سداد إلكتروني</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">البنك المسحوب عليه</label>
                    <Input
                      value={formBankName}
                      onChange={(e) => setFormBankName(e.target.value)}
                      placeholder="البنك الأهلي المصري"
                      className="bg-muted/40 border-border text-foreground focus:border-emerald-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">رقم الشيك / التحويل</label>
                    <Input
                      value={formCheckNumber}
                      onChange={(e) => setFormCheckNumber(e.target.value)}
                      placeholder="اختياري"
                      className="bg-muted/40 border-border text-foreground font-mono focus:border-emerald-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">تاريخ السند</label>
                    <Input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="bg-muted/40 border-border text-foreground font-mono focus:border-emerald-500 rounded-xl h-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-foreground mb-1">حالة السند</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full h-9 px-3 bg-muted/40 border border-border rounded-xl text-foreground font-semibold focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="COMPLETED">مسدد ومكتمل</option>
                      <option value="PROCESSING">قيد المراجعة والتحويل</option>
                      <option value="PENDING">معلق بانتظار الاعتماد</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-foreground mb-1">ملاحظات وبيان الصرف</label>
                    <Input
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="دفعة خامات أو مصاريف تشغيل..."
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
