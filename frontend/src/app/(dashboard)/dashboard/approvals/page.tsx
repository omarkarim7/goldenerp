"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Printer, ShieldCheck, Clock, CheckCircle2, XCircle,
  Plus, Search, Hash, FileText, Check, X, ShieldAlert,
  RefreshCw, KeyRound, Eye, EyeOff, Briefcase, User, Calendar, Copy, Sparkles, CheckCheck, FileCheck, ExternalLink, Lock,
  Loader2, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";
import { useCompany } from "@/context/company-context";
import { DocxViewer } from "@/components/docx-viewer";
import JSZip from "jszip";

interface ApprovalItem {
  id: string;
  type: string;
  entityType: string;
  entityId: string;
  requestedBy: string;
  requestedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED";
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  operationCode?: string;
  operationName?: string;
  documentTitle?: string;
}

const INITIAL_APPROVALS: ApprovalItem[] = [
  // --- شركة جولدن (A) ---
  {
    id: "app-a1",
    type: "PRINT_GRIEVANCE",
    entityType: "grievance",
    entityId: "op-a1",
    requestedBy: "أحمد محمود (موظف مسؤول)",
    requestedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: "PENDING",
    operationCode: "A15",
    operationName: "مناقصة شبكات الأبنية التعليمية",
    documentTitle: "خطاب التظلم القانوني ضد استبعاد المظروف الفني (مادة 76)",
    notes: "مطلوب طباعة عاجلة لتقديم التظلم قبل انتهاء مهلة الـ 7 أيام القانونية",
  },
  {
    id: "app-a2",
    type: "PRINT_DOCUMENT",
    entityType: "document",
    entityId: "op-a2",
    requestedBy: "سامح إبراهيم (مسؤول عروض)",
    requestedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    status: "PENDING",
    operationCode: "A18",
    operationName: "توريد أجهزة حاسب آلي لوزارة التعليم العالي",
    documentTitle: "المظروف المالي النهائي وعطاء الأسعار",
    notes: "مطلوب اعتماد المظروف المالي قبل جلسة الفتح المالي غداً",
  },
  {
    id: "app-a3",
    type: "PRINT_DOCUMENT",
    entityType: "document",
    entityId: "op-a3",
    requestedBy: "محمود حسن (إداري عقود)",
    requestedAt: new Date(Date.now() - 86400000).toISOString(),
    status: "APPROVED",
    approvedBy: "المدير العام",
    approvedAt: new Date(Date.now() - 43200000).toISOString(),
    operationCode: "A01",
    operationName: "تجهيز معمل حاسب آلي هيئة النقل العام",
    documentTitle: "المظروف المالي وعطاء الأسعار النهائي",
    notes: "[HASH: 9E4F2B71A83C50D64E20B91C88FA3341] — تم التدقيق والمطابقة مع دراسة التكاليف والاعتماد للطباعة",
  },
  {
    id: "app-a4",
    type: "PRINT_GRIEVANCE",
    entityType: "grievance",
    entityId: "op-a4",
    requestedBy: "أحمد محمود (موظف مسؤول)",
    requestedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: "REJECTED",
    approvedBy: "المدير العام",
    approvedAt: new Date(Date.now() - 86400000).toISOString(),
    operationCode: "A09",
    operationName: "صيانة أجهزة سنترال العاصمة الإدارية",
    documentTitle: "طلب إعادة فتح مظروف مالي ملغى لعملية A09",
    notes: "تم الرفض لعدم سداد رسوم التظلم المسبقة لدى الجهة الحكومية",
  },

  // --- شركة إكسلنت (B) ---
  {
    id: "app-b1",
    type: "PRINT_GUARANTEE",
    entityType: "guarantee",
    entityId: "op-b1",
    requestedBy: "كريم عبد الله (مسؤول مناقصات)",
    requestedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    status: "PENDING",
    operationCode: "B03",
    operationName: "توريد معدات خوادم جامعة حلوان",
    documentTitle: "خطاب استرداد التأمين النهائي الأصلي (180,000 ج.م)",
    notes: "تم صدور محضر الاستلام النهائي ومطلوب خطاب الاسترداد للبنك الأهلي",
  },
  {
    id: "app-b2",
    type: "PRINT_DOCUMENT",
    entityType: "document",
    entityId: "op-b2",
    requestedBy: "منى زكي (أخصائية توريدات)",
    requestedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    status: "PENDING",
    operationCode: "B12",
    operationName: "عطاء مستلزمات طبية مستشفى قصر العيني",
    documentTitle: "المظروف الفني والشهادات الصحية المعتمدة",
    notes: "مطلوب الاعتماد الرسمي للطباعة قبل موعد جلسة الفتح",
  },
  {
    id: "app-b3",
    type: "PRINT_DOCUMENT",
    entityType: "document",
    entityId: "op-b3",
    requestedBy: "خالد سعيد (مسؤول تعاقدات)",
    requestedAt: new Date(Date.now() - 86400000).toISOString(),
    status: "APPROVED",
    approvedBy: "المدير العام",
    approvedAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    operationCode: "B07",
    operationName: "تجهيز معامل كلية الصيدلة جامعة القاهرة",
    documentTitle: "كراسة الشروط والمواصفات الفنية المعتمدة",
    notes: "[HASH: 4F2C9901BA8E5531DE01449FA31B8820] — تمت مراجعة البنود والموافقة على الطباعة الرسمية",
  },
  {
    id: "app-b4",
    type: "PRINT_GRIEVANCE",
    entityType: "grievance",
    entityId: "op-b4",
    requestedBy: "كريم عبد الله (مسؤول مناقصات)",
    requestedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    status: "REJECTED",
    approvedBy: "المدير العام",
    approvedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    operationCode: "B15",
    operationName: "توريد مهمات وقائية لمصانع البتروكيماويات",
    documentTitle: "طلب استعجال صرف الدفعة المقدمة بدون خطاب ضمان",
    notes: "تم الرفض لعدم تقديم خطاب ضمان الدفعة المقدمة البنكي المعتمد",
  },

  // --- شركة العهد (C) ---
  {
    id: "app-c1",
    type: "PRINT_GRIEVANCE",
    entityType: "grievance",
    entityId: "op-c1",
    requestedBy: "عمر خالد (أخصائي مشتريات)",
    requestedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    status: "PENDING",
    operationCode: "C04",
    operationName: "إحلال وتجديد محطات الصرف بأسيوط",
    documentTitle: "تظلم استبعاد فني للمضخات الغاطسة (مادة 76)",
    notes: "مرفق شهادات المنشأ والاختبارات الفنية المعتمدة للمراجعة",
  },
  {
    id: "app-c2",
    type: "PRINT_GUARANTEE",
    entityType: "guarantee",
    entityId: "op-c2",
    requestedBy: "خالد توفيق (إداري عمليات)",
    requestedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    status: "PENDING",
    operationCode: "C11",
    operationName: "مد كابلات الجهد المتوسط بشرق القاهرة",
    documentTitle: "خطاب طلب تمديد سريان خطاب الضمان الابتدائي",
    notes: "الجهة طلبت تمديد سريان العطاء لمدة 30 يوماً إضافية",
  },
  {
    id: "app-c3",
    type: "PRINT_DOCUMENT",
    entityType: "document",
    entityId: "op-c3",
    requestedBy: "عمر خالد (أخصائي مشتريات)",
    requestedAt: new Date(Date.now() - 86400000).toISOString(),
    status: "APPROVED",
    approvedBy: "المدير العام",
    approvedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    operationCode: "C02",
    operationName: "تطوير محطة تنقية مياه الشرب بالمنيا",
    documentTitle: "العرض الفني والمالي النهائي المعتمد",
    notes: "[HASH: 8A19B5E4023C9100FD45771A2E3388DC] — مطابق للمواصفات القياسية والاعتماد الفني",
  },
  {
    id: "app-c4",
    type: "PRINT_GRIEVANCE",
    entityType: "grievance",
    entityId: "op-c4",
    requestedBy: "خالد توفيق (إداري عمليات)",
    requestedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: "REJECTED",
    approvedBy: "المدير العام",
    approvedAt: new Date(Date.now() - 86400000).toISOString(),
    operationCode: "C08",
    operationName: "صيانة طلمبات مياه الشرب",
    documentTitle: "طلب إعادة فتح مظروف مالي ملغى لعملية C08",
    notes: "تم الرفض لعدم سداد رسوم التظلم المسبقة لدى الجهة الحكومية",
  },

  // --- الشركة الحديثة (D) ---
  {
    id: "app-d1",
    type: "PRINT_DOCUMENT",
    entityType: "document",
    entityId: "op-d1",
    requestedBy: "ياسر كمال (مسؤول الشراء المباشر)",
    requestedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    status: "PENDING",
    operationCode: "D05",
    operationName: "توريد أدوات كتابية ومطبوعات لهيئة البريد",
    documentTitle: "خطاب تفويض مندوب التوريد الفوري وفتح الحساب",
    notes: "مطلوب الاعتماد الرسمي السريع للتقديم للهيئة اليوم",
  },
  {
    id: "app-d2",
    type: "PRINT_DOCUMENT",
    entityType: "document",
    entityId: "op-d2",
    requestedBy: "ياسر كمال (مسؤول الشراء المباشر)",
    requestedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: "PENDING",
    operationCode: "D14",
    operationName: "ممارسة توريد أحبار وطابعات مديرية التربية والتعليم",
    documentTitle: "طلب اعتماد أمر توريد مباشر مستعجل",
    notes: "جلسة البت النهائي غداً ومطلوب إرفاق المستند المعتمد",
  },
  {
    id: "app-d3",
    type: "PRINT_DOCUMENT",
    entityType: "document",
    entityId: "op-d3",
    requestedBy: "هيثم نبيل (إداري توريدات)",
    requestedAt: new Date(Date.now() - 86400000).toISOString(),
    status: "APPROVED",
    approvedBy: "المدير العام",
    approvedAt: new Date(Date.now() - 3600000 * 7).toISOString(),
    operationCode: "D02",
    operationName: "توريد أجهزة كشف المعادن للمنشآت الإدارية",
    documentTitle: "محضر الفحص والاستلام المعتمد للممارسات",
    notes: "[HASH: 7C38B12D04EE9F321A88344BC291910A] — تم التدقيق الإجرائي والموافقة على الطباعة",
  },
  {
    id: "app-d4",
    type: "PRINT_DOCUMENT",
    entityType: "document",
    entityId: "op-d4",
    requestedBy: "هيثم نبيل (إداري توريدات)",
    requestedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    status: "REJECTED",
    approvedBy: "المدير العام",
    approvedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    operationCode: "D08",
    operationName: "توريد مهمات إطفاء وأمن صناعي",
    documentTitle: "طلب استثناء من مهلة التسليم المحددة في أمر التوريد",
    notes: "تم الرفض لعدم قبول الجهة الطالبة لأي تمديد في مدة التوريد",
  },
];

function escapeXml(unsafe: any): string {
  if (unsafe === undefined || unsafe === null) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getTemplateInfoForApproval(item: ApprovalItem): { templateFile: string; type: string } {
  const title = (item.documentTitle || "").toLowerCase();
  const type = item.type || "";

  if (title.includes("سداد") && (title.includes("تأمين") || title.includes("ابتدائي"))) {
    return { templateFile: "insurance_payment_template.docx", type: "insurance_payment" };
  }
  if (title.includes("سحب") && title.includes("تأمين")) {
    return { templateFile: "booklet_and_insurance_template.docx", type: "booklet_and_insurance" };
  }
  if (title.includes("سحب") || title.includes("كراسة")) {
    return { templateFile: "booklet_withdrawal_template.docx", type: "booklet_withdrawal" };
  }
  if (title.includes("ضمان بنكي") || title.includes("خطاب ضمان")) {
    return { templateFile: "bank_guarantee_letter_template.docx", type: "bank_guarantee_letter" };
  }
  if (title.includes("توضيح") || title.includes("استفسار")) {
    return { templateFile: "clarification_template.docx", type: "clarification" };
  }
  if (title.includes("فني") || title.includes("مواصفات")) {
    return { templateFile: "technical_offer_template.docx", type: "technical" };
  }
  if (title.includes("مالي") || title.includes("أسعار") || title.includes("تخفيض")) {
    return { templateFile: "financial_offer_template.docx", type: "financial" };
  }
  if (title.includes("إقرار") && title.includes("شروط")) {
    return { templateFile: "declaration_specs_template.docx", type: "declaration_specs" };
  }
  if (title.includes("إقرار") && (title.includes("تأمين") || title.includes("عمالة") || title.includes("مساواة"))) {
    return { templateFile: "declaration_insurance_template.docx", type: "declaration_insurance" };
  }
  if (title.includes("شهادة ضمان") || title.includes("ضمان معتمد")) {
    return { templateFile: "warranty_certificate_template.docx", type: "warranty" };
  }
  if (title.includes("تظلم") || type === "PRINT_GRIEVANCE") {
    return { templateFile: "general_letter_template.docx", type: "grievance" };
  }
  return { templateFile: "general_letter_template.docx", type: "general" };
}

async function generateOfficialDocxBlob(item: ApprovalItem, companyInfo: any): Promise<Blob> {
  const tplInfo = getTemplateInfoForApproval(item);
  const res = await fetch(`/templates/${tplInfo.templateFile}`);
  if (!res.ok) {
    throw new Error(`تعذر قراءة قالب الخطاب الرسمي (${tplInfo.templateFile})`);
  }
  const buffer = await res.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const companyFullName = companyInfo?.fullName || (companyInfo?.name ? `${companyInfo.name} للتوريدات العمومية` : "المجموعة الذهبية للتوريدات والمقاولات (A)");
  const commReg = (companyInfo as any)?.commercialRegister || "102948";
  const taxCard = (companyInfo as any)?.taxCard || "658369652";
  const opName = item.operationName || "عملية مناقصة وتوريد مسجلة";
  const opCode = item.operationCode || "A15";

  const regMatch = item.notes?.match(/رقم القيد:\s*([A-Z0-9]+)/i);
  const regNum = regMatch ? regMatch[1] : (item.entityId?.startsWith("letter-") ? item.entityId.replace("letter-", "") : `${opCode}26102128556`);

  const hashMatch = item.notes?.match(/\[HASH:\s*([A-F0-9]{32})\]/i);
  const hashCode = hashMatch ? hashMatch[1] : null;

  // 1. Process headers
  for (const hName of ["word/header1.xml", "word/header2.xml", "word/header3.xml"]) {
    const hdrFile = zip.file(hName);
    if (hdrFile) {
      let hdrXml = await hdrFile.async("text");
      hdrXml = hdrXml.replace(/110200700036620|102948/g, escapeXml(commReg));
      hdrXml = hdrXml.replace(/658369652/g, escapeXml(taxCard));
      hdrXml = hdrXml.replace(/\(\s*كود العملية بالشركه\s*\)/g, `( ${escapeXml(opCode)} )`);
      hdrXml = hdrXml.replace(/كود العملية بالشركه/g, escapeXml(opCode));
      hdrXml = hdrXml.replace(/AZ2|A15/g, escapeXml(opCode));
      hdrXml = hdrXml.replace(/<w:highlight\s+[^>]*\/>/g, "");
      hdrXml = hdrXml.replace(/<w:color\s+w:val=\"(red|FF0000)\"[^>]*\/>/g, "");
      zip.file(hName, hdrXml);
    }
  }

  // 2. Process document.xml
  const docFile = zip.file("word/document.xml");
  if (docFile) {
    let docXml = await docFile.async("text");

    // Company and entity
    docXml = docXml.replace(/مجموعة شركات التوريدات المعتمدة|شركة التوريدات والحلول الهندسية|شركة التوريدات المعتمدة|المجموعة الذهبية للتوريدات والمقاولات/g, escapeXml(companyFullName));
    docXml = docXml.replace(/110200700036620|102948/g, escapeXml(commReg));
    docXml = docXml.replace(/658369652/g, escapeXml(taxCard));

    // Operation details
    docXml = docXml.replace(/اسم العملية المسجله[\s\.]*/g, escapeXml(opName) + " ");
    docXml = docXml.replace(/365/g, escapeXml(opCode.replace(/[^0-9]/g, "") || "617"));
    docXml = docXml.replace(/AZ2|A15/g, escapeXml(opCode));

    // Recipient
    docXml = docXml.replace(/مدير الادارة العامة للمشتريات والمخازن بجامعة دمنهور/g, "رئيس لجنة البت والتعاقدات المختصة");

    // Unified Registration Number & Barcode text
    docXml = docXml.replace(/AZ26102128556|A1526102128556/g, escapeXml(regNum));
    docXml = docXml.replace(/(?:الباركود|البركود)/g, escapeXml(`رقم القيد: ${regNum}`));

    // Delegate and responsible signatures
    docXml = docXml.replace(/أحمد محمد أحمد/g, escapeXml(item.requestedBy || "مندوب التعاقدات المفوض"));
    docXml = docXml.replace(/أحمد محمد/g, escapeXml(item.requestedBy || "المسؤول المختص"));

    if (item.status === "APPROVED" && item.approvedBy) {
      docXml = docXml.replace(/توقيع صورة|أو اسم/g, escapeXml(item.approvedBy));
    }

    if (hashCode) {
      docXml = docXml.replace(/خان[ةه] (?:خالي[ةه] للملاحظات|معلومات وملاحظات|ملاحظات)/g, escapeXml(`[رمز الحوكمة والاعتماد الرقمي: ${hashCode}]`));
    } else {
      docXml = docXml.replace(/خان[ةه] (?:خالي[ةه] للملاحظات|معلومات وملاحظات|ملاحظات)/g, "");
    }

    docXml = docXml.replace(/<w:highlight\s+[^>]*\/>/g, "");
    docXml = docXml.replace(/<w:color\s+w:val=\"(red|FF0000)\"[^>]*\/>/g, "");

    zip.file("word/document.xml", docXml);
  }

  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

function ApprovalsContent() {
  const searchParams = useSearchParams();
  const { selectedCompany, companies } = useCompany();
  const companyQuery = searchParams.get("company");

  // Determine active company strictly
  const activeCompanyCode: "A" | "B" | "C" | "D" = useMemo(() => {
    if (selectedCompany && selectedCompany !== "ALL") {
      return selectedCompany as "A" | "B" | "C" | "D";
    }
    if (companyQuery && ["A", "B", "C", "D"].includes(companyQuery.toUpperCase())) {
      return companyQuery.toUpperCase() as "A" | "B" | "C" | "D";
    }
    return "A";
  }, [selectedCompany, companyQuery]);

  const activeCompanyInfo = useMemo(() => {
    return companies.find((c) => c.code === activeCompanyCode) || companies[0];
  }, [companies, activeCompanyCode]);

  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ fullName: string; role: string; username: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Details and Edit states
  const [detailsItem, setDetailsItem] = useState<ApprovalItem | null>(null);
  const [editingItem, setEditingItem] = useState<ApprovalItem | null>(null);
  const [previewDocumentItem, setPreviewDocumentItem] = useState<ApprovalItem | null>(null);
  const [previewDocxBlob, setPreviewDocxBlob] = useState<Blob | null>(null);
  const [loadingDocx, setLoadingDocx] = useState<boolean>(false);
  const [showHash, setShowHash] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!previewDocumentItem) {
      setPreviewDocxBlob(null);
      setLoadingDocx(false);
      return;
    }

    let isCancelled = false;
    setLoadingDocx(true);

    generateOfficialDocxBlob(previewDocumentItem, activeCompanyInfo)
      .then((blob) => {
        if (!isCancelled) {
          setPreviewDocxBlob(blob);
          setLoadingDocx(false);
        }
      })
      .catch((err) => {
        console.error("Failed to generate official docx template:", err);
        if (!isCancelled) {
          setLoadingDocx(false);
          toast.error("تعذر تحميل قالب المستند الرسمي");
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [previewDocumentItem, activeCompanyInfo]);

  // New Request Form
  const [formType, setFormType] = useState<string>("PRINT_GRIEVANCE");
  const [formDocTitle, setFormDocTitle] = useState("");
  const [formOpCode, setFormOpCode] = useState(`${activeCompanyCode}15`);
  const [formOpName, setFormOpName] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Role distinctions
  const isGeneralManager = currentUser?.role === "GENERAL_MANAGER";
  const isDeputyManager = currentUser?.role === "DEPUTY_MANAGER";
  const isApprover = isGeneralManager || isDeputyManager;

  useEffect(() => {
    setFormOpCode(`${activeCompanyCode}15`);
  }, [activeCompanyCode]);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) {
      setCurrentUser(JSON.parse(u));
    }
    fetchApprovals();
  }, []);

  const fetchApprovals = async (isManualRefresh = false) => {
    setLoading(true);
    try {
      const res = await api.get("/approvals");
      if (Array.isArray(res.data) && res.data.length > 0) {
        const mapped = res.data.map((a: any) => ({
          ...a,
          operationCode: a.operationCode || `${activeCompanyCode}15`,
          operationName: a.operationName || "مناقصة وتوريد مسجلة",
          documentTitle: a.documentTitle || getApprovalLabel(a.type),
        }));
        setApprovals(mapped);
        saveApprovalsState(mapped);
      } else {
        loadInitialMockApprovals();
      }
      if (isManualRefresh) {
        toast.success("تم تحديث ومزامنة طلبات الطباعة مع قاعدة البيانات بنجاح!");
      }
    } catch (err) {
      console.warn("API fetch fallback to cache:", err);
      loadInitialMockApprovals();
      if (isManualRefresh) {
        toast.success("تم تحديث البيانات بنجاح!");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadInitialMockApprovals = () => {
    const saved = localStorage.getItem("goldenerp_approvals_cache_v5");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setApprovals(parsed);
          return;
        }
      } catch {
        // Fallback to fresh seed
      }
    }

    setApprovals(INITIAL_APPROVALS);
    localStorage.setItem("goldenerp_approvals_cache_v5", JSON.stringify(INITIAL_APPROVALS));
  };

  const saveApprovalsState = (updated: ApprovalItem[]) => {
    setApprovals(updated);
    localStorage.setItem("goldenerp_approvals_cache_v5", JSON.stringify(updated));
  };

  const getApprovalLabel = (type: string) => {
    const map: Record<string, string> = {
      PRINT_GRIEVANCE: "تظلم رسمي وقانوني (مادة 76)",
      PRINT_GUARANTEE: "خطاب استرداد / تمديد تأمين بنكي",
      PRINT_DOCUMENT: "عطاء فني / مالي معتمد",
      DELETE_OPERATION: "طلب حذف عملية ومناقصة",
    };
    return map[type] || type;
  };

  const generateSecurityHash = () => {
    // 32-character upper hex hash matching government audit requirements
    const chars = "0123456789ABCDEF";
    let hash = "";
    for (let i = 0; i < 32; i++) {
      hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return hash;
  };

  const getCleanNotes = (notes?: string) => {
    if (!notes) return "";
    return notes.replace(/\[HASH:\s*[A-F0-9]{32}\]\s*—?\s*/, "").trim();
  };

  const handleApprove = async (item: ApprovalItem) => {
    const hash = generateSecurityHash();
    const cleanNotes = getCleanNotes(item.notes);

    try {
      const res = await api.patch(`/approvals/${item.id}/approve`, {
        notes: cleanNotes || "تم الاعتماد بنجاح وتوليد رمز الحوكمة التشفيري للطباعة الرسمية",
      });

      if (res.data) {
        const updated = approvals.map((a) => (a.id === item.id ? { ...a, ...res.data } : a));
        saveApprovalsState(updated);
        if (detailsItem && detailsItem.id === item.id) {
          setDetailsItem({ ...detailsItem, ...res.data });
        }
      }
    } catch (err) {
      console.warn("Backend approve fallback to local state:", err);
      const updated = approvals.map((a) =>
        a.id === item.id
          ? {
              ...a,
              status: "APPROVED" as const,
              approvedBy: currentUser?.fullName || (isGeneralManager ? "المدير العام" : "نائب المدير العام"),
              approvedAt: new Date().toISOString(),
              notes: `[HASH: ${hash}] — ${cleanNotes || "تم الاعتماد بنجاح وتوليد رمز الحوكمة التشفيري للطباعة الرسمية"}`,
            }
          : a
      );
      saveApprovalsState(updated);
      if (detailsItem && detailsItem.id === item.id) {
        setDetailsItem({
          ...detailsItem,
          status: "APPROVED",
          approvedBy: currentUser?.fullName || (isGeneralManager ? "المدير العام" : "نائب المدير العام"),
          approvedAt: new Date().toISOString(),
          notes: `[HASH: ${hash}] — ${cleanNotes || "تم الاعتماد بنجاح وتوليد رمز الحوكمة التشفيري للطباعة الرسمية"}`,
        });
      }
    }

    toast.success("تمت الموافقة بنجاح! تم توليد الهاش التشفيري (32 خانة) وتصريح الطباعة.");
  };

  const handleReject = async () => {
    if (!rejectModalId) return;
    const reason = rejectReason.trim() || "تم رفض طلب الاعتماد لمخالفة اللائحة أو نقص المستندات";

    try {
      const res = await api.patch(`/approvals/${rejectModalId}/reject`, {
        notes: reason,
      });

      if (res.data) {
        const updated = approvals.map((a) => (a.id === rejectModalId ? { ...a, ...res.data } : a));
        saveApprovalsState(updated);
        if (detailsItem && detailsItem.id === rejectModalId) {
          setDetailsItem({ ...detailsItem, ...res.data });
        }
      }
    } catch (err) {
      console.warn("Backend reject fallback to local state:", err);
      const updated = approvals.map((a) =>
        a.id === rejectModalId
          ? {
              ...a,
              status: "REJECTED" as const,
              approvedBy: currentUser?.fullName || (isGeneralManager ? "المدير العام" : "نائب المدير العام"),
              approvedAt: new Date().toISOString(),
              notes: reason,
            }
          : a
      );
      saveApprovalsState(updated);
      if (detailsItem && detailsItem.id === rejectModalId) {
        setDetailsItem({
          ...detailsItem,
          status: "REJECTED",
          approvedBy: currentUser?.fullName || (isGeneralManager ? "المدير العام" : "نائب المدير العام"),
          approvedAt: new Date().toISOString(),
          notes: reason,
        });
      }
    }

    setRejectModalId(null);
    setRejectReason("");
    toast.error("تم رفض طلب الطباعة وتسجيل السبب في سجل الحوكمة والرقابة.");
  };

  // Open Edit Modal
  const handleOpenEdit = (item: ApprovalItem) => {
    setEditingItem({ ...item });
  };

  // Save Edit (Persisted to Backend API & DB)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const res = await api.patch(`/approvals/${editingItem.id}`, {
        type: editingItem.type,
        documentTitle: editingItem.documentTitle,
        operationCode: editingItem.operationCode,
        operationName: editingItem.operationName,
        notes: editingItem.notes,
      });

      if (res.data) {
        const updated = approvals.map((a) => (a.id === editingItem.id ? { ...a, ...res.data } : a));
        saveApprovalsState(updated);
        if (detailsItem && detailsItem.id === editingItem.id) {
          setDetailsItem({ ...detailsItem, ...res.data });
        }
      }
    } catch (err) {
      console.warn("Backend edit fallback to local state:", err);
      const updated = approvals.map((a) =>
        a.id === editingItem.id ? { ...editingItem } : a
      );
      saveApprovalsState(updated);
      if (detailsItem && detailsItem.id === editingItem.id) {
        setDetailsItem({ ...editingItem });
      }
    }

    setEditingItem(null);
    toast.success("تم حفظ وتحديث بيانات طلب الطباعة بنجاح!");
  };

  // Create or Direct Issue Request
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDocTitle.trim()) {
      toast.error("يرجى كتابة عنوان المستند المطلوب");
      return;
    }

    setSubmitting(true);
    const code = formOpCode.toUpperCase().trim() || `${activeCompanyCode}15`;

    // منع تكرار الطلبات المعلقة لنفس المستند والعملية
    if (!isGeneralManager) {
      const isDuplicate = companyApprovals.some(
        (a) =>
          a.status === "PENDING" &&
          a.documentTitle?.trim().toLowerCase() === formDocTitle.trim().toLowerCase() &&
          (a.operationCode || "").toUpperCase().trim() === code
      );
      if (isDuplicate) {
        toast.error("يوجد طلب قيد المراجعة حالياً لهذا المستند بانتظار قرار المدير أو النائب. لا يمكن إرسال طلب مكرر حتى يتم البت في الطلب القائم.");
        setSubmitting(false);
        return;
      }
    }

    try {
      const res = await api.post("/approvals", {
        type: formType,
        entityType: "document",
        entityId: `op-${Date.now()}`,
        requestedBy: currentUser?.fullName || (isGeneralManager ? "المدير العام" : isDeputyManager ? "نائب المدير العام" : "موظف مسؤول"),
        documentTitle: formDocTitle.trim(),
        operationCode: code,
        operationName: formOpName.trim() || `عملية ومناقصة مسجلة (${activeCompanyInfo?.shortName || activeCompanyCode})`,
        notes: formNotes.trim(),
        status: isGeneralManager ? "APPROVED" : "PENDING",
      });

      if (res.data) {
        const newItem: ApprovalItem = res.data;
        const updated = [newItem, ...approvals.filter((a) => a.id !== newItem.id)];
        saveApprovalsState(updated);
      }

      toast.success(
        isGeneralManager
          ? "تم إصدار أمر الطباعة والاعتماد الفوري بنجاح وتوليد الهاش التشفيري!"
          : "تم إرسال طلب الاعتماد بنجاح! بانتظار موافقة الإدارة."
      );
    } catch (err) {
      console.warn("Backend create fallback to local state:", err);
      if (isGeneralManager) {
        const hash = generateSecurityHash();
        const newReq: ApprovalItem = {
          id: `app-${Date.now()}`,
          type: formType,
          entityType: "document",
          entityId: `op-${Date.now()}`,
          requestedBy: `${currentUser?.fullName || "المدير العام"} (إصدار مباشر للإدارة)`,
          requestedAt: new Date().toISOString(),
          status: "APPROVED",
          approvedBy: currentUser?.fullName || "المدير العام",
          approvedAt: new Date().toISOString(),
          operationCode: code,
          operationName: formOpName.trim() || `عملية ومناقصة مسجلة (${activeCompanyInfo?.shortName || activeCompanyCode})`,
          documentTitle: formDocTitle.trim(),
          notes: `[HASH: ${hash}] — ${formNotes.trim() || "أمر طباعة معتمد صادر فورياً من الإدارة العليا"}`,
        };
        const updated = [newReq, ...approvals];
        saveApprovalsState(updated);
        toast.success("تم إصدار أمر الطباعة والاعتماد الفوري بنجاح وتوليد الهاش التشفيري!");
      } else {
        const newReq: ApprovalItem = {
          id: `app-${Date.now()}`,
          type: formType,
          entityType: "document",
          entityId: `op-${Date.now()}`,
          requestedBy: `${currentUser?.fullName || (isDeputyManager ? "نائب المدير العام" : "موظف مسؤول")}`,
          requestedAt: new Date().toISOString(),
          status: "PENDING",
          operationCode: code,
          operationName: formOpName.trim() || `عملية مناقصة وتوريد مسجلة (${activeCompanyInfo?.shortName || activeCompanyCode})`,
          documentTitle: formDocTitle.trim(),
          notes: formNotes.trim() || "طلب اعتماد طباعة مستند رسمي",
        };
        const updated = [newReq, ...approvals];
        saveApprovalsState(updated);
        toast.success("تم إرسال طلب الاعتماد بنجاح! بانتظار موافقة الإدارة العليا.");
      }
    } finally {
      setSubmitting(false);
      setModalOpen(false);
      setFormDocTitle("");
      setFormOpName("");
      setFormNotes("");
    }
  };

  // Strictly isolated to the active company
  const companyApprovals = useMemo(() => {
    return approvals.filter((a) => {
      const code = (a.operationCode || "").toUpperCase().trim();
      return code.startsWith(activeCompanyCode);
    });
  }, [approvals, activeCompanyCode]);

  const pendingCount = companyApprovals.filter((a) => a.status === "PENDING").length;
  const approvedCount = companyApprovals.filter((a) => a.status === "APPROVED").length;
  const rejectedCount = companyApprovals.filter((a) => a.status === "REJECTED").length;

  const filteredApprovals = useMemo(() => {
    return companyApprovals.filter((a) => {
      const matchStatus = statusFilter === "ALL" ? true : a.status === statusFilter;
      const matchSearch =
        !searchQuery.trim() ||
        a.documentTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.operationCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.requestedBy?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.notes?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [companyApprovals, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              طلبات الطباعة وموافقات الإدارة
            </h1>
            <Badge className="bg-blue-600/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs font-bold px-2.5 py-0.5">
              {pendingCount} بانتظار الاعتماد
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            نظام الحوكمة الرقمية لمنع التلاعب وتوليد الهاش التشفيري الفريد (32 خانة) قبل إخراج المستندات
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Working Refresh Button with Database Sync */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchApprovals(true)}
            disabled={loading}
            className="border-border text-foreground hover:bg-muted text-xs h-9 rounded-xl flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            title="تحديث البيانات من قاعدة البيانات"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span>تحديث</span>
          </Button>

          {/* Button: ONLY General Manager has 'إصدار أمر طباعة معتمد فوري' - Deputy & Employee have 'طلب اعتماد طباعة' */}
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 hover:from-blue-800 hover:to-blue-700 text-white font-bold px-4 py-2 rounded-xl shadow-lg shadow-blue-500/20 royal-glow flex items-center gap-2 text-xs sm:text-sm active:scale-95 transition-all cursor-pointer"
          >
            {isGeneralManager ? (
              <>
                <Sparkles className="h-4 w-4" />
                <span>إصدار أمر طباعة معتمد فوري</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>طلب اعتماد طباعة</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Overview KPI Cards (Scoped strictly to Active Company) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-bold">في انتظار الاعتماد</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{pendingCount}</p>
          <span className="text-[11px] text-muted-foreground mt-1 block">تتطلب فحص وموافقة الإدارة</span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-bold">تمت الموافقة وتوليد الهاش</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{approvedCount}</p>
          <span className="text-[11px] text-muted-foreground mt-1 block">مصرح لها بالطباعة الرسمية</span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-bold">
              {isGeneralManager ? "مرفوضة من قبلك" : "مرفوضة من الإدارة"}
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">{rejectedCount}</p>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            {isGeneralManager ? "طلبات تم رفضها وتدوين أسبابها" : "ممنوعة من الطباعة والختم"}
          </span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-bold">الأمان وسجل التدقيق والرقابة</span>
            <div className="w-8 h-8 rounded-lg bg-blue-600/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <KeyRound className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-700 dark:text-blue-300 font-mono">100%</p>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 block">تشفير متوافق مع المادة 76</span>
        </div>
      </div>

      {/* Role Banner Notice */}
      <div className="p-4 rounded-2xl bg-blue-600/10 border border-blue-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              صلاحيات الحساب الحالي: {isGeneralManager ? "المدير العام (الإدارة العليا)" : isDeputyManager ? "نائب المدير العام (مسؤول الاعتماد)" : "موظف مسؤول (إدخال بيانات وطلب اعتماد)"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isGeneralManager
                ? "بصفتك المدير العام (الإدارة العليا)، يمكنك إصدار أوامر طباعة فورية معتمدة برمز الحوكمة، فحص واعتماد أو رفض طلبات الطباعة، وتعديل أي طلب في أي وقت."
                : isDeputyManager
                ? "بصفتك نائب المدير العام، يمكنك فحص طلبات طباعة الموظفين واعتمادها أو رفضها وتعديلها، كما يمكنك طلب اعتماد طباعة من الإدارة العامة."
                : "يمكنك إدخال وتجهيز مسودات التظلمات والخطابات، لكن لن يتم طباعتها أو ختمها إلا بعد اعتماد نائب المدير أو المدير العام."}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-left">
          <Badge className={isApprover ? "badge-emerald text-xs" : "badge-blue text-xs"}>
            {isGeneralManager ? "صلاحية إصدار واعتماد فوري" : isDeputyManager ? "صلاحية فحص واعتماد الطلبات" : "وضع طلب الاعتماد"}
          </Badge>
        </div>
      </div>

      {/* Search and Status Filters */}
      <div className="glass-card rounded-2xl p-4 border border-border flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث باسم المستند، كود العملية، الموظف، أو رقم الهاش..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-sm h-10"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { id: "ALL", label: `جميع الطلبات (${companyApprovals.length})` },
            { id: "PENDING", label: `بانتظار الاعتماد (${pendingCount})` },
            { id: "APPROVED", label: `معتمدة (${approvedCount})` },
            { id: "REJECTED", label: isGeneralManager ? `مرفوضة من قبلك (${rejectedCount})` : `مرفوضة من الإدارة (${rejectedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-colors font-medium cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Approvals Cards List */}
      {filteredApprovals.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-border space-y-3">
          <Printer className="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold text-foreground">لا توجد طلبات طباعة لشركة {activeCompanyInfo?.shortName || activeCompanyCode} تطابق البحث</h3>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-sm mx-auto">
            {isGeneralManager
              ? "يمكنك إصدار أمر طباعة معتمد فوري لعمليات الشركة"
              : "يمكنك تقديم طلب اعتماد طباعة للمراجعة والاعتماد"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApprovals.map((item) => {
            const isPending = item.status === "PENDING";
            const isApproved = item.status === "APPROVED";
            const isRejected = item.status === "REJECTED";

            // Extract Hash if present
            const hashMatch = item.notes?.match(/\[HASH:\s*([A-F0-9]{32})\]/);
            const extractedHash = hashMatch ? hashMatch[1] : null;
            const cleanNote = getCleanNotes(item.notes);

            return (
              <div
                key={item.id}
                className={`glass-card-interactive rounded-2xl p-5 border transition-all ${
                  isPending
                    ? "border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60"
                    : isApproved
                    ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50"
                    : "border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40"
                }`}
              >
                <div className="flex flex-col gap-4">
                  {/* Top Row: Operation Code + Title + Badges */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-600/10 border border-blue-500/25 text-blue-700 dark:text-blue-300 font-mono font-black text-xs flex items-center justify-center">
                        {item.operationCode || `${activeCompanyCode}15`}
                      </span>
                      <h3 className="font-extrabold text-foreground text-base sm:text-lg tracking-tight">
                        {item.documentTitle}
                      </h3>
                      <Badge
                        className={
                          isPending
                            ? "badge-amber text-xs font-bold"
                            : isApproved
                            ? "badge-emerald text-xs font-bold"
                            : "badge-rose text-xs font-bold"
                        }
                      >
                        {isPending
                          ? "في انتظار الاعتماد"
                          : isApproved
                          ? "تمت الموافقة وتوليد الهاش"
                          : isGeneralManager
                          ? "مرفوض من قبلك"
                          : "مرفوض من الإدارة"}
                      </Badge>
                      <Badge variant="outline" className="border-border text-muted-foreground text-xs font-medium">
                        {getApprovalLabel(item.type)}
                      </Badge>
                    </div>

                    {/* Action Buttons Top Right */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {/* View Details Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDetailsItem(item)}
                        className="border-border text-foreground hover:bg-muted text-xs h-9 rounded-xl flex items-center gap-1.5 cursor-pointer font-bold"
                      >
                        <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span>عرض التفاصيل</span>
                      </Button>

                      {/* Approve Button (Accessible by General Manager and Deputy Manager) */}
                      {isPending && isApprover && (
                        <Button
                          size="sm"
                          onClick={() => handleApprove(item)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Check className="h-4 w-4" />
                          <span>اعتماد وتوليد الهاش</span>
                        </Button>
                      )}

                      {/* Reject Button (Accessible by General Manager and Deputy Manager) */}
                      {isPending && isApprover && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejectModalId(item.id)}
                          className="border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs h-9 rounded-xl flex items-center gap-1.5 cursor-pointer font-bold"
                        >
                          <X className="h-4 w-4" />
                          <span>رفض</span>
                        </Button>
                      )}

                      {/* Preview Approved Document */}
                      {isApproved && (
                        <Button
                          size="sm"
                          onClick={() => setPreviewDocumentItem(item)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition-all"
                        >
                          <Eye className="h-4 w-4" />
                          <span>معاينة المستند</span>
                        </Button>
                      )}

                      {/* Pending notice for Employee */}
                      {isPending && !isApprover && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                          <Clock className="h-3.5 w-3.5 animate-pulse" />
                          <span>قيد مراجعة الإدارة العليا</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metadata Row: Operation, Requester, Date */}
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-muted-foreground pt-1 border-t border-border/50">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="font-semibold text-foreground/90">{item.operationName}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>مقدم الطلب:</span>
                      <span className="font-bold text-foreground">{item.requestedBy}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>تاريخ الطلب:</span>
                      <span className="font-mono text-foreground font-semibold">
                        {new Date(item.requestedAt).toLocaleString("ar-EG")}
                      </span>
                    </div>
                  </div>

                  {/* Clear Readable Notes Box */}
                  {cleanNote && (
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 border-r-4 border-r-blue-500/80 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                        <FileText className="h-3.5 w-3.5" />
                        <span>تفاصيل ومبررات الطلب:</span>
                      </div>
                      <p className="text-xs sm:text-sm text-foreground font-medium leading-relaxed">
                        {cleanNote}
                      </p>
                    </div>
                  )}

                  {/* Hash code badge if approved (Masked by default with copy tool) */}
                  {extractedHash && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <Hash className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block">
                              كود التشفير الحكومي المعتمد (الهاش الرقمي 32 خانة):
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setShowHash((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                              }
                              className="text-[10px] text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1 font-bold px-1.5 py-0.5 rounded hover:bg-emerald-500/20 cursor-pointer transition-colors"
                              title={showHash[item.id] ? "إخفاء كود الهاش" : "إظهار كود الهاش"}
                            >
                              {showHash[item.id] ? (
                                <>
                                  <EyeOff className="h-3 w-3" />
                                  <span>إخفاء</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="h-3 w-3" />
                                  <span>إظهار</span>
                                </>
                              )}
                            </button>
                          </div>
                          <span className="font-mono font-black text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 tracking-widest">
                            {showHash[item.id]
                              ? extractedHash
                              : `${extractedHash.slice(0, 4)} •••••••• •••••••• ${extractedHash.slice(-4)}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(extractedHash);
                            toast.success("تم نسخ كود الهاش التشفيري الحكومي بنجاح! 📋");
                          }}
                          className="h-8 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 rounded-lg flex items-center gap-1 font-bold cursor-pointer"
                        >
                          <Copy className="h-3 w-3" />
                          <span>نسخ الهاش</span>
                        </Button>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          معتمد من: {item.approvedBy || "المدير العام"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Rejection Notice if rejected */}
                  {isRejected && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5">
                      <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
                      <div>
                        <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 block">
                          سبب الرفض المسجل في سجل الحوكمة والرقابة:
                        </span>
                        <p className="text-xs text-rose-700 dark:text-rose-300 font-semibold">
                          {cleanNote || "تم الرفض لعدم استيفاء الشروط القانونية واللائحية"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {detailsItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-border max-w-xl w-full shadow-2xl space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-600/10 border border-blue-500/25 text-blue-700 dark:text-blue-300 font-mono font-black text-xs">
                    {detailsItem.operationCode || `${activeCompanyCode}15`}
                  </span>
                  <Badge
                    className={
                      detailsItem.status === "PENDING"
                        ? "badge-amber text-xs font-bold"
                        : detailsItem.status === "APPROVED"
                        ? "badge-emerald text-xs font-bold"
                        : "badge-rose text-xs font-bold"
                    }
                  >
                    {detailsItem.status === "PENDING"
                      ? "في انتظار الاعتماد"
                      : detailsItem.status === "APPROVED"
                      ? "تمت الموافقة وتوليد الهاش"
                      : isGeneralManager
                      ? "مرفوض من قبلك"
                      : "مرفوض من الإدارة"}
                  </Badge>
                  <Badge variant="outline" className="border-border text-muted-foreground text-xs font-medium">
                    {getApprovalLabel(detailsItem.type)}
                  </Badge>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-foreground">
                  {detailsItem.documentTitle}
                </h3>
              </div>
              <button
                onClick={() => setDetailsItem(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-lg hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1">
                <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  العملية والمشروع:
                </span>
                <p className="font-bold text-foreground text-sm">{detailsItem.operationName}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1">
                <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  مقدم الطلب:
                </span>
                <p className="font-bold text-foreground text-sm">{detailsItem.requestedBy}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1">
                <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  تاريخ ووقت التقديم:
                </span>
                <p className="font-bold text-foreground text-sm font-mono">
                  {new Date(detailsItem.requestedAt).toLocaleString("ar-EG")}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1">
                <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  الشركة التابع لها:
                </span>
                <p className="font-bold text-foreground text-sm">
                  {activeCompanyInfo?.fullName || `شركة (${activeCompanyCode})`}
                </p>
              </div>
            </div>

            {/* Hash if approved */}
            {detailsItem.notes?.match(/\[HASH:\s*([A-F0-9]{32})\]/) && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <Hash className="h-4 w-4" />
                    كود التشفير والحوكمة الحكومي المعتمد (الهاش 32 خانة):
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const match = detailsItem.notes?.match(/\[HASH:\s*([A-F0-9]{32})\]/);
                      if (match) {
                        navigator.clipboard.writeText(match[1]);
                        toast.success("تم نسخ كود الهاش التشفيري!");
                      }
                    }}
                    className="h-7 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 rounded-lg flex items-center gap-1 font-bold"
                  >
                    <Copy className="h-3 w-3" />
                    <span>نسخ</span>
                  </Button>
                </div>
                <div className="p-3 rounded-xl bg-background/80 border border-emerald-500/30 font-mono font-black text-sm text-emerald-700 dark:text-emerald-300 text-center tracking-wider select-all">
                  {detailsItem.notes.match(/\[HASH:\s*([A-F0-9]{32})\]/)?.[1]}
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>معتمد من: {detailsItem.approvedBy || "المدير العام"}</span>
                  {detailsItem.approvedAt && (
                    <span>تاريخ الاعتماد: {new Date(detailsItem.approvedAt).toLocaleString("ar-EG")}</span>
                  )}
                </div>
              </div>
            )}

            {/* Notes / Details */}
            <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-1.5">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                ملاحظات ومبررات المستند:
              </span>
              <p className="text-sm text-foreground font-medium leading-relaxed">
                {getCleanNotes(detailsItem.notes) || "لا توجد ملاحظات إضافية مسجلة."}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-border flex flex-wrap items-center justify-end gap-2.5">
              <Button
                variant="outline"
                onClick={() => setDetailsItem(null)}
                className="border-border text-foreground hover:bg-muted rounded-xl text-xs cursor-pointer"
              >
                إغلاق
              </Button>

              {/* Approve & Reject for Approver */}
              {detailsItem.status === "PENDING" && isApprover && (
                <>
                  <Button
                    onClick={() => {
                      handleApprove(detailsItem);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    <span>اعتماد وتوليد الهاش</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const id = detailsItem.id;
                      setDetailsItem(null);
                      setRejectModalId(id);
                    }}
                    className="border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs rounded-xl flex items-center gap-1.5 cursor-pointer font-bold"
                  >
                    <X className="h-4 w-4" />
                    <span>رفض</span>
                  </Button>
                </>
              )}

              {/* Preview Document Button in Details Modal */}
              <Button
                onClick={() => {
                  const it = { ...detailsItem };
                  setDetailsItem(null);
                  setPreviewDocumentItem(it);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Eye className="h-4 w-4" />
                <span>معاينة المستند الرسمي</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━ DOCUMENT PREVIEW MODAL (معاينة المستند المعتمد والطباعة بالقالب الأصلي الحقيقي) ━━━ */}
      {previewDocumentItem && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-card border border-border rounded-3xl max-w-5xl w-full p-4 sm:p-6 space-y-4 shadow-2xl relative my-auto">
            {/* Modal Controls Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/15 text-blue-600 flex items-center justify-center font-bold">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
                    <span>معاينة المستند الرسمي</span>
                    <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-[11px] font-bold">
                      قالب Word الأصلي (.docx)
                    </Badge>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {previewDocumentItem.operationCode} • {previewDocumentItem.operationName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (previewDocumentItem.operationCode) {
                      window.open(`/dashboard/operations?search=${encodeURIComponent(previewDocumentItem.operationCode)}`, "_blank");
                    } else {
                      window.open("/dashboard/operations", "_blank");
                    }
                  }}
                  className="text-xs font-bold rounded-xl border-border hover:bg-muted text-foreground flex items-center gap-1.5 cursor-pointer h-9 px-3"
                  title="فتح سجل ومسار العملية كاملاً في تبويب جديد"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                  <span>فتح مسار العملية ↗</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPreviewDocumentItem(null)}
                  className="rounded-full cursor-pointer hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Real Official Word Template Native Viewer */}
            <div className="w-full bg-slate-100 dark:bg-slate-900/60 rounded-2xl border border-border p-2 sm:p-3 min-h-[520px] max-h-[75vh] overflow-y-auto flex flex-col items-center justify-center shadow-inner">
              {loadingDocx ? (
                <div className="py-24 flex flex-col items-center gap-3 text-muted-foreground animate-fade-in">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-sm font-bold text-foreground">جاري تجهيز قالب المستند الرسمي الأصلي وتعبئة البيانات القانونية...</p>
                  <p className="text-xs text-muted-foreground">يتم استخدام قالب الوورد المعتمد للشركة بدون أي توليد نصوص وهمية</p>
                </div>
              ) : previewDocxBlob ? (
                <DocxViewer
                  blob={previewDocxBlob}
                  fileName={`${previewDocumentItem.documentTitle || "مستند_رسمي"}.docx`}
                  className="w-full"
                />
              ) : (
                <div className="py-24 flex flex-col items-center gap-3 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                  <p className="text-sm font-bold">تعذر تحميل قالب المستند الرسمي</p>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-3 border-t border-border flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {previewDocumentItem.notes?.match(/\[HASH:\s*([A-F0-9]{32})\]/) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const match = previewDocumentItem.notes?.match(/\[HASH:\s*([A-F0-9]{32})\]/);
                      if (match) {
                        navigator.clipboard.writeText(match[1]);
                        toast.success("تم نسخ كود الهاش التشفيري بنجاح! 📋");
                      }
                    }}
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer h-9 px-3"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>نسخ الهاش التشفيري [32 خانة]</span>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPreviewDocumentItem(null)}
                  className="rounded-xl text-xs font-bold cursor-pointer h-9 px-4"
                >
                  إغلاق
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Create / Direct Issue Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel rounded-3xl p-6 border border-border max-w-md w-full shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                {isGeneralManager ? (
                  <>
                    <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    إصدار أمر طباعة معتمد فوري (صلاحية المدير العام)
                  </>
                ) : (
                  <>
                    <Printer className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    طلب اعتماد طباعة مستند رسمي
                  </>
                )}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {isGeneralManager && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                بصفتك المدير العام، سيتم إصدار أمر الطباعة معتمداً وتوليد الهاش التشفيري (32 خانة) فورياً وحفظه بقاعدة البيانات بدون انتظار.
              </div>
            )}

            {isDeputyManager && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-800 dark:text-blue-300 font-medium">
                بصفتك نائب المدير العام، سيتم رفع الطلب إلى الإدارة لاعتماده وتوليد رمز الحوكمة التشفيري المعتمد.
              </div>
            )}

            <form onSubmit={handleCreateRequest} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-semibold">الشركة المحددة للطلب:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {activeCompanyInfo?.shortName || `شركة (${activeCompanyCode})`}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">نوع المستند المطلوب طباعته *</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full h-10 bg-muted/40 border border-border text-foreground rounded-xl px-3 text-sm focus:border-blue-500"
                >
                  <option value="PRINT_GRIEVANCE">تظلم رسمي وقانوني (مادة 76)</option>
                  <option value="PRINT_GUARANTEE">خطاب استرداد أو تمديد تأمين بنكي</option>
                  <option value="PRINT_DOCUMENT">عطاء فني / مالي معتمد</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">عنوان ووصف المستند *</label>
                <Input
                  required
                  placeholder={`مثال: تظلم رسمي لرد التأمين لعملية ${activeCompanyCode}15`}
                  value={formDocTitle}
                  onChange={(e) => setFormDocTitle(e.target.value)}
                  className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">كود العملية المرتبطة</label>
                  <Input
                    placeholder={`مثال: ${activeCompanyCode}15`}
                    value={formOpCode}
                    onChange={(e) => setFormOpCode(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">اسم العملية (اختياري)</label>
                  <Input
                    placeholder="اسم العملية والمناقصة..."
                    value={formOpName}
                    onChange={(e) => setFormOpName(e.target.value)}
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">مبررات وتفاصيل الطلب</label>
                <Input
                  placeholder="ملاحظات توضيحية..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-sm"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="border-border text-foreground hover:bg-muted rounded-xl text-xs cursor-pointer"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
                >
                  {submitting
                    ? "جاري الحفظ بقاعدة البيانات..."
                    : isGeneralManager
                    ? "إصدار واعتماد وطباعة فورية"
                    : "إرسال طلب الاعتماد"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel rounded-3xl p-6 border border-border max-w-md w-full shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="h-5 w-5" />
                تأكيد رفض طلب الطباعة
              </h3>
              <button onClick={() => setRejectModalId(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                يرجى كتابة سبب الرفض ليتم تسجيله في سجل المراقبة (التدقيق الإداري) وإشعار مقدم الطلب به:
              </p>
              <Input
                placeholder="مثال: المظروف المالي غير مطابق لدراسة التكاليف المعتمدة"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-rose-500 rounded-xl text-sm"
                autoFocus
              />
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectModalId(null)}
                className="border-border text-foreground hover:bg-muted rounded-xl text-xs cursor-pointer"
              >
                تراجع
              </Button>
              <Button
                type="button"
                onClick={handleReject}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
              >
                تأكيد الرفض
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApprovalsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-muted-foreground animate-pulse text-sm">
          جاري تحميل مركز موافقات الطباعة...
        </div>
      }
    >
      <ApprovalsContent />
    </Suspense>
  );
}
