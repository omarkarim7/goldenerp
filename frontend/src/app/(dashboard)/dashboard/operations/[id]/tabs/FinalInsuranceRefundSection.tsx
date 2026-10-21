"use client";

import React, { useState, useMemo, useEffect } from "react";
import JSZip from "jszip";
import QRCode from "qrcode";
import {
  Building2,
  FileText,
  DollarSign,
  CreditCard,
  UserCheck,
  RefreshCw,
  X,
  ShieldAlert,
  Calendar,
  AlertTriangle,
  Receipt,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/lib/api";
import { Portal } from "@/components/ui/portal";
import { OnlyOfficeDocViewer } from "@/components/OnlyOfficeDocViewer";
import { Operation, SectionCard, tafqeetArabic } from "./types";
import {
  isValidCloudDocUrl,
  escapeXml,
  cleanAllDocxXml,
  buildQrAnchorXml,
  injectSingleQrIntoDocXml,
  getUnifiedOperationRegistrationNumber,
  getOperationRecipientTitle,
  LetterQrCloudCard,
  LetterBottomActionWidget,
  ReprintConfirmModal,
  PdfExportLoadingModal,
  PrintHistoryEntry,
  getCurrentUserName,
  sanitizeChairmanTitle,
} from "./letter-utils";
import { getPdfBlobFromDocx, uploadPdfToFreeCloud, getExpectedCloudPdfUrl } from "./client-pdf";

interface FinalInsuranceRefundSectionProps {
  op: Operation;
  onRefresh: () => void;
  triggerContext?: "TECH_OPENING" | "FIN_OPENING" | "GRIEVANCE_REJECTED" | "MANUAL";
  onClose?: () => void;
}

export function FinalInsuranceRefundSection({
  op,
  onRefresh,
  triggerContext = "MANUAL",
  onClose,
}: FinalInsuranceRefundSectionProps) {
  // ━━━ قراءة البيانات المحفوظة مسبقاً من notes العملية إن وجدت ━━━
  const savedLetter = useMemo(() => {
    try {
      if (op.notes && op.notes.startsWith("{")) {
        const parsed = JSON.parse(op.notes);
        return parsed.finalInsuranceRefundLetter || null;
      }
    } catch {}
    return null;
  }, [op.notes]);

  // الشركة وبيانات الترويسة
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => {
    return savedLetter?.selectedCompanyId || op.companies?.[0]?.companyId || op.companies?.[0]?.id || "";
  });

  const currentCompanyLink = useMemo(() => {
    return (
      op.companies?.find(
        (c: any) => c.companyId === selectedCompanyId || c.id === selectedCompanyId
      ) || op.companies?.[0]
    );
  }, [op.companies, selectedCompanyId]);

  const currentCompany = currentCompanyLink?.company;

  const [registrationNumber, setRegistrationNumber] = useState(() => {
    if (savedLetter?.registrationNumber) return savedLetter.registrationNumber;
    return getUnifiedOperationRegistrationNumber(op, currentCompanyLink?.displayCode);
  });

  const [companyOpCode, setCompanyOpCode] = useState(() => {
    return (
      savedLetter?.companyOpCode ||
      currentCompanyLink?.displayCode ||
      `AZ-0${op.serialNumber || 1}`
    );
  });

  const [companyCommercialRegister, setCompanyCommercialRegister] = useState(() => {
    return savedLetter?.companyCommercialRegister || currentCompany?.commercialRegister || "110200700036620";
  });

  const [companyTaxCard, setCompanyTaxCard] = useState(() => {
    return savedLetter?.companyTaxCard || currentCompany?.taxCard || "658369652";
  });

  const [phoneWhatsapp, setPhoneWhatsapp] = useState(() => {
    return savedLetter?.phoneWhatsapp || currentCompany?.phone || "01091708818";
  });

  const [phoneMobile, setPhoneMobile] = useState(() => {
    return savedLetter?.phoneMobile || "01557018818";
  });

  const [companyAddress, setCompanyAddress] = useState(() => {
    return savedLetter?.companyAddress || currentCompany?.address || "بجوار مستشفى ليدى كير  -  بدمنهور -  البحيره";
  });

  const [issueDate, setIssueDate] = useState(() => {
    return savedLetter?.issueDate || new Date().toLocaleDateString("en-GB");
  });

  // المرسل إليه والموضوع
  const [recipientPrefix, setRecipientPrefix] = useState(() => {
    return savedLetter?.recipientPrefix || "الأستاذ";
  });

  const [recipientTitleAndAuthority, setRecipientTitleAndAuthority] = useState(() => {
    return getOperationRecipientTitle(op, savedLetter?.recipientTitleAndAuthority);
  });

  const [operationRegisteredName, setOperationRegisteredName] = useState(() => {
    return savedLetter?.operationRegisteredName || op.name || "توريد أصناف ومعدات رسمية";
  });

  const [operationNumber, setOperationNumber] = useState(() => {
    return savedLetter?.operationNumber || op.externalNumber || op.serialNumber || "365";
  });

  // مبلغ التأمين النهائي المسترد
  const [refundAmount, setRefundAmount] = useState<string>(() => {
    if (savedLetter?.refundAmount) return String(savedLetter.refundAmount);
    // محاولة استخراج مبلغ التأمين النهائي من الضمانات
    const finalGuar = (op.guarantees || []).find((g: any) => g.type === "FINAL");
    if (finalGuar?.amount) return String(finalGuar.amount);
    return "37547";
  });

  // طريقة السداد الأصلية للتأمين
  const [paymentMethod, setPaymentMethod] = useState<"DEDUCTION" | "CASH_RECEIPT">(() => {
    return savedLetter?.paymentMethod || "DEDUCTION";
  });

  // بيانات الخصم من مستحقات
  const [deductionOperationName, setDeductionOperationName] = useState(() => {
    return savedLetter?.deductionOperationName || "توريد مستلزمات طبية للجامعة";
  });
  const [deductionMonth, setDeductionMonth] = useState(() => {
    return savedLetter?.deductionMonth || "سبتمبر";
  });
  const [deductionYear, setDeductionYear] = useState(() => {
    return savedLetter?.deductionYear || "2024";
  });

  // بيانات إيصال السداد النقدي
  const [receiptNumber, setReceiptNumber] = useState(() => {
    return savedLetter?.receiptNumber || "102548";
  });
  const [receiptDate, setReceiptDate] = useState(() => {
    return savedLetter?.receiptDate || "15/ 10 /2024";
  });

  // طريقة الطرح ونطاق العملية والعام المالي وموعد الجلسة
  const [tenderMethod, setTenderMethod] = useState(() => {
    return savedLetter?.tenderMethod || "بالمناقصة المحدودة";
  });

  const [operationScope, setOperationScope] = useState(() => {
    return savedLetter?.operationScope || op.name || "توريد كاوتش وبطاريات للسيارات للجامعه";
  });

  const [fiscalYear, setFiscalYear] = useState(() => {
    return savedLetter?.fiscalYear || "2024 / 2025";
  });

  const [technicalOpeningDate, setTechnicalOpeningDate] = useState(() => {
    return savedLetter?.technicalOpeningDate || "14/ 1 /2024";
  });

  // بيانات الحساب البنكي لاسترداد المبلغ
  const [bankAccountNumber, setBankAccountNumber] = useState(() => {
    return savedLetter?.bankAccountNumber || currentCompany?.bankAccount || "2670220000004113";
  });

  const [bankName, setBankName] = useState(() => {
    return savedLetter?.bankName || currentCompany?.bankName || "مصر الاسلامى";
  });

  const [bankBranch, setBankBranch] = useState(() => {
    return savedLetter?.bankBranch || currentCompany?.bankBranch || "دمنهور";
  });

  const [accountHolderName, setAccountHolderName] = useState(() => {
    return savedLetter?.accountHolderName || currentCompany?.accountHolder || "ســـحر حسن محمد أحمد عبد السلام جولدن سرفيس";
  });

  const [accountNationalId, setAccountNationalId] = useState(() => {
    return savedLetter?.accountNationalId || currentCompany?.nationalId || "28912111802623";
  });

  // التوقيعات والملاحظات
  const [specialistName, setSpecialistName] = useState(() => {
    return savedLetter?.specialistName || "أحمد محمد";
  });

  const [financeManagerName, setFinanceManagerName] = useState(() => {
    return savedLetter?.financeManagerName || "المدير المالي";
  });

  const [boardChairman, setBoardChairman] = useState(() => {
    return sanitizeChairmanTitle(savedLetter?.boardChairman || "رئيس مجلس الإدارة");
  });

  const [attachmentNote, setAttachmentNote] = useState(() => {
    return savedLetter?.attachmentNote || "مرفق صورة – أصل من إيصال السداد";
  });

  const [letterNotes, setLetterNotes] = useState(() => {
    return savedLetter?.letterNotes || "برجاء سرعة رد التأمين النهائي وفقاً لأحكام القانون رقم 182 لسنة 2018 ولائحته التنفيذية.";
  });

  // الرابط السحابي المعتمد
  const [cloudPdfUrl, setCloudPdfUrl] = useState<string>(() => {
    const url = savedLetter?.cloudPdfUrl || "";
    return isValidCloudDocUrl(url) ? url : "";
  });
  const [uploadingCloud, setUploadingCloud] = useState(false);

  // سجل الطباعة
  const [printHistory, setPrintHistory] = useState<Record<string, PrintHistoryEntry>>(() => {
    return savedLetter?.printHistory || {};
  });
  const [reprintWarningOpen, setReprintWarningOpen] = useState(false);

  // حالة المعاينة
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDocxBlob, setPreviewDocxBlob] = useState<Blob | null>(null);
  const [previewPdfBlob, setPreviewPdfBlob] = useState<Blob | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [renderingDocx, setRenderingDocx] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [lastGeneratedSnapshot, setLastGeneratedSnapshot] = useState("");
  const [savingLetter, setSavingLetter] = useState(false);

  const tafqeetAmount = useMemo(() => {
    const num = Number(refundAmount) || 0;
    return tafqeetArabic(num);
  }, [refundAmount]);

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      selectedCompanyId,
      registrationNumber,
      companyOpCode,
      companyCommercialRegister,
      companyTaxCard,
      phoneWhatsapp,
      phoneMobile,
      companyAddress,
      issueDate,
      recipientPrefix,
      recipientTitleAndAuthority,
      operationRegisteredName,
      operationNumber,
      refundAmount,
      paymentMethod,
      deductionOperationName,
      deductionMonth,
      deductionYear,
      receiptNumber,
      receiptDate,
      tenderMethod,
      operationScope,
      fiscalYear,
      technicalOpeningDate,
      bankAccountNumber,
      bankName,
      bankBranch,
      accountHolderName,
      accountNationalId,
      specialistName,
      financeManagerName,
      boardChairman,
      attachmentNote,
      letterNotes,
    });
  }, [
    selectedCompanyId,
    registrationNumber,
    companyOpCode,
    companyCommercialRegister,
    companyTaxCard,
    phoneWhatsapp,
    phoneMobile,
    companyAddress,
    issueDate,
    recipientPrefix,
    recipientTitleAndAuthority,
    operationRegisteredName,
    operationNumber,
    refundAmount,
    paymentMethod,
    deductionOperationName,
    deductionMonth,
    deductionYear,
    receiptNumber,
    receiptDate,
    tenderMethod,
    operationScope,
    fiscalYear,
    technicalOpeningDate,
    bankAccountNumber,
    bankName,
    bankBranch,
    accountHolderName,
    accountNationalId,
    specialistName,
    financeManagerName,
    boardChairman,
    attachmentNote,
    letterNotes,
  ]);

  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => currentSnapshot);
  const isDirty = useMemo(() => currentSnapshot !== savedSnapshot, [currentSnapshot, savedSnapshot]);

  // ━━━ محرك توليد مستند الوورد الرسمي ━━━
  const generateRefundDocxBlob = async (): Promise<Blob> => {
    const response = await fetch("/templates/final_insurance_refund_template.docx");
    if (!response.ok) throw new Error("فشل قراءة قالب استرداد التأمين النهائي من الخادم");
    const templateBuffer = await response.arrayBuffer();

    const zip = await JSZip.loadAsync(templateBuffer);

    // توليد رمز التحقق الرقمي المباشر - فقط في حالة الرفع السحابي الفعلي
    let qrDrawingXml = "";
    const activeCloud = cloudPdfUrl;
    if (isValidCloudDocUrl(activeCloud)) {
      try {
        const qrDataUrl = await QRCode.toDataURL(activeCloud, {
          width: 600,
          margin: 2,
          errorCorrectionLevel: "M",
        });
        const qrBase64 = qrDataUrl.split(",")[1];
        const qrBinary = Uint8Array.from(atob(qrBase64), (c) => c.charCodeAt(0));

        zip.file("word/media/doc_qr.png", qrBinary);

        let relsXml = await zip.file("word/_rels/document.xml.rels")?.async("text");
        if (relsXml && !relsXml.includes("rIdQR")) {
          relsXml = relsXml.replace(
            "</Relationships>",
            '<Relationship Id="rIdQR" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/doc_qr.png"/></Relationships>'
          );
          zip.file("word/_rels/document.xml.rels", relsXml);
        }

        let ctXml = await zip.file("[Content_Types].xml")?.async("text");
        if (ctXml && !ctXml.includes('Extension="png"')) {
          ctXml = ctXml.replace("</Types>", '<Default Extension="png" ContentType="image/png"/></Types>');
          zip.file("[Content_Types].xml", ctXml);
        }

        qrDrawingXml = buildQrAnchorXml();
      } catch (e) {
        console.warn("QR generation failed:", e);
      }
    }

    // 1. استبدال محتوى word/document.xml
    let docXml = await zip.file("word/document.xml")!.async("text");
    docXml = injectSingleQrIntoDocXml(docXml, qrDrawingXml, escapeXml(registrationNumber));

    // المرسل إليه
    docXml = docXml.replace(/الأستاذ/g, escapeXml(recipientPrefix));
    docXml = docXml.replace(
      /مدير الادارة العامة للمشتريات والمخازن بجامعة دمنهور/g,
      escapeXml(recipientTitleAndAuthority)
    );

    // الموضوع وبيانات العملية
    docXml = docXml.replace(/اسم العملية المسجله[\s\.]*/g, escapeXml(operationRegisteredName) + " ");
    docXml = docXml.replace(/365/g, escapeXml(operationNumber));

    // المبلغ والتفقيط
    docXml = docXml.replace(/37547/g, escapeXml(refundAmount));
    docXml = docXml.replace(
      /سبعة وثلاثون ألفا وخمسمائة وسبعه وأربعون/g,
      escapeXml(tafqeetAmount)
    );

    // طريقة السداد الأصلية
    let paymentText = "";
    if (paymentMethod === "DEDUCTION") {
      paymentText = `خصما من مستحقات الشركة لديكم في عملية (${escapeXml(deductionOperationName)}) عن شهر (${escapeXml(deductionMonth)}) سنة (${escapeXml(deductionYear)})`;
    } else {
      paymentText = `بايصال سداد نقدى رقم (${escapeXml(receiptNumber)}) بتاريخ (${escapeXml(receiptDate)})`;
    }

    // استبدال الجزء بين القوسين لطريقة السداد
    docXml = docXml.replace(
      /خصما من مستحقات الشركة لديكم في عملية[\s\S]*?بايصال سداد نقدى/g,
      paymentText
    );

    // طريقة الطرح ونطاق العملية والعام المالي وموعد الجلسة
    docXml = docXml.replace(/المناقصة ال[\s]*محدود[\s]*ة/g, escapeXml(tenderMethod));
    docXml = docXml.replace(/بالمناقصة المحدودة/g, escapeXml(tenderMethod));
    docXml = docXml.replace(/توريد كاوتش وبطاريات للسيارات للجامعه/g, escapeXml(operationScope));
    docXml = docXml.replace(/2024\s*\/\s*2025/g, escapeXml(fiscalYear));
    docXml = docXml.replace(/14\/\s*1\s*\/2024/g, escapeXml(technicalOpeningDate));

    // بيانات الحساب البنكي
    docXml = docXml.replace(/2670220000004113/g, escapeXml(bankAccountNumber));
    docXml = docXml.replace(/مصر الاسلامى/g, escapeXml(bankName));
    docXml = docXml.replace(/دمنهور/g, escapeXml(bankBranch));
    docXml = docXml.replace(
      /ســـحر حسن محمد أحمد عبد السلام جولدن سرفيس/g,
      escapeXml(accountHolderName)
    );
    docXml = docXml.replace(/28912111802623/g, escapeXml(accountNationalId));

    // التوقيعات
    docXml = docXml.replace(/أحمد محمد/g, escapeXml(specialistName));
    docXml = docXml.replace(/توقيع صورة/g, escapeXml(financeManagerName));
    docXml = docXml.replace(/رئيس مجلس الإدارة/g, escapeXml(boardChairman));

    // المرفقات والملاحظات
    docXml = docXml.replace(/مرفق صورة – أصل من إيصال السداد/g, escapeXml(attachmentNote));
    docXml = docXml.replace(/خانه خاليه للملاحظات/g, escapeXml(letterNotes));

    zip.file("word/document.xml", docXml);

    // 2. تحديث الترويسة والتذييل
    for (const fileName of Object.keys(zip.files)) {
      if (fileName.startsWith("word/header") && fileName.endsWith(".xml")) {
        let hdr = await zip.file(fileName)!.async("text");
        hdr = hdr.replace(/110200700036620/g, escapeXml(companyCommercialRegister));
        hdr = hdr.replace(/658369652/g, escapeXml(companyTaxCard));
        hdr = hdr.replace(/كود العملية بالشركه/g, escapeXml(companyOpCode));
        zip.file(fileName, hdr);
      }
      if (fileName.startsWith("word/footer") && fileName.endsWith(".xml")) {
        let ftr = await zip.file(fileName)!.async("text");
        ftr = ftr.replace(/15\/10\/2026/g, escapeXml(issueDate));
        ftr = ftr.replace(/رقم القيد/g, `رقم القيد: ${escapeXml(registrationNumber)}`);
        ftr = ftr.replace(/01091708818/g, escapeXml(phoneWhatsapp));
        ftr = ftr.replace(/01557018818/g, escapeXml(phoneMobile));
        ftr = ftr.replace(/بجوار مستشفى ليدى كير\s*-\s*بدمنهور\s*-\s*البح\s*يره/g, escapeXml(companyAddress));
        zip.file(fileName, ftr);
      }
    }

    // تنظيف كل علامات التحديد الأحمر
    await cleanAllDocxXml(zip);

    return await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  };

  // ━━━ دالة تحميل المعاينة الرسمية ━━━
  const loadOfficialPreview = async (forceRefresh = false) => {
    if (previewPdfBlob && currentSnapshot === lastGeneratedSnapshot && !forceRefresh) {
      setPreviewModalOpen(true);
      return;
    }

    setRenderingDocx(true);
    setPreviewModalOpen(true);
    try {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
        setPreviewPdfUrl(null);
      }
      const docx = await generateRefundDocxBlob();
      setPreviewDocxBlob(docx);

      const pdf = await getPdfBlobFromDocx(
        docx,
        `final_insurance_refund_${registrationNumber || op.serialNumber}.docx`
      );
      setPreviewPdfBlob(pdf);
      const url = URL.createObjectURL(pdf);
      setPreviewPdfUrl(url);

      setLastGeneratedSnapshot(currentSnapshot);
      if (forceRefresh) {
        toast.success("تم تحديث المعاينة الرسمية بنجاح! 🔄✨");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("فشل تجهيز مستند المعاينة: " + (err?.message || ""));
    } finally {
      setRenderingDocx(false);
    }
  };

  // ━━━ دالة الرفع السحابي ━━━
  const handleUploadToCloud = async (forceReupload = false) => {
    if (cloudPdfUrl && !forceReupload) return;
    setUploadingCloud(true);
    try {
      toast.info("جاري رفع وتوثيق خطاب استرداد التأمين النهائي سحابياً...");
      const docx = previewDocxBlob || (await generateRefundDocxBlob());
      const pdf = previewPdfBlob || (await getPdfBlobFromDocx(docx, `final_insurance_refund_${registrationNumber}.docx`));

      const fileName = `final_insurance_refund_${registrationNumber || op.serialNumber}.pdf`;
      const res = await uploadPdfToFreeCloud(pdf, fileName);

      if (res?.url) {
        setCloudPdfUrl(res.url);
        toast.success("تم توثيق الخطاب سحابياً وربط رمز الباركود بنجاح! ☁️✓");

        // حفظ الرابط تلقائياً
        let existingNotesObj: Record<string, any> = {};
        try {
          if (op.notes && op.notes.startsWith("{")) existingNotesObj = JSON.parse(op.notes);
        } catch {}
        existingNotesObj.finalInsuranceRefundLetter = {
          ...(existingNotesObj.finalInsuranceRefundLetter || {}),
          ...JSON.parse(currentSnapshot),
          cloudPdfUrl: res.url,
          updatedAt: new Date().toISOString(),
        };
        await api.patch(`/operations/${op.id}`, { notes: JSON.stringify(existingNotesObj) });
        onRefresh();
      }

    } catch (err: any) {
      toast.error("فشل الرفع السحابي: " + (err?.message || ""));
    } finally {
      setUploadingCloud(false);
    }
  };

  // ━━━ حفظ التعديلات ━━━
  const handleSaveToSystem = async () => {
    const snapToSave = currentSnapshot;
    setSavedSnapshot(snapToSave);
    setSavingLetter(true);
    toast.success("تم حفظ بيانات خطاب استرداد التأمين النهائي بنجاح! 💾✨");

    try {
      let existingNotesObj: Record<string, any> = {};
      try {
        if (op.notes && op.notes.startsWith("{")) {
          existingNotesObj = JSON.parse(op.notes);
        } else if (op.notes) {
          existingNotesObj = { textNotes: op.notes };
        }
      } catch {}

      existingNotesObj.finalInsuranceRefundLetter = {
        ...(existingNotesObj.finalInsuranceRefundLetter || {}),
        ...JSON.parse(snapToSave),
        cloudPdfUrl,
        printHistory,
        updatedAt: new Date().toISOString(),
      };

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(existingNotesObj),
      });
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل الحفظ في السيرفر");
    } finally {
      setSavingLetter(false);
    }
  };

  // ━━━ الطباعة ━━━
  const executePrintDoc = async () => {
    try {
      toast.info("جاري إعداد الخطاب للطباعة المباشرة...");
      const docx = previewDocxBlob || (await generateRefundDocxBlob());
      const pdf = previewPdfBlob || (await getPdfBlobFromDocx(docx, `refund_${registrationNumber}.docx`));
      const url = URL.createObjectURL(pdf);

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.open(url, "_blank")?.print();
        }
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 5000);
      };

      // تسجيل سجل الطباعة
      const currentUser = getCurrentUserName();
      const prev = printHistory["refund"] || { printCount: 0 };
      const newEntry: PrintHistoryEntry = {
        printCount: (prev.printCount || 0) + 1,
        firstPrintedAt: prev.firstPrintedAt || new Date().toISOString(),
        lastPrintedAt: new Date().toISOString(),
        printedBy: currentUser,
        registrationNumber: prev.registrationNumber || registrationNumber,
        items: [
          ...(prev.items || []),
          {
            printedAt: new Date().toISOString(),
            printedBy: currentUser,
            registrationNumber: registrationNumber,
          },
        ],
      };
      const updated = { ...printHistory, refund: newEntry };
      setPrintHistory(updated);

      let existingNotesObj: Record<string, any> = {};
      try {
        if (op.notes && op.notes.startsWith("{")) existingNotesObj = JSON.parse(op.notes);
      } catch {}
      existingNotesObj.finalInsuranceRefundLetter = {
        ...(existingNotesObj.finalInsuranceRefundLetter || {}),
        printHistory: updated,
      };
      api.patch(`/operations/${op.id}`, { notes: JSON.stringify(existingNotesObj) }).catch(() => {});
    } catch (err: any) {
      toast.error("فشل تنفيذ الطباعة: " + (err?.message || ""));
    }
  };

  const handlePrintWordDocument = () => {
    const info = printHistory["refund"];
    if (info && info.printCount > 0) {
      setReprintWarningOpen(true);
      return;
    }
    executePrintDoc();
  };

  const handleViewArchive = () => {
    if (cloudPdfUrl) {
      window.open(cloudPdfUrl, "_blank");
      return;
    }
    if (previewPdfBlob) {
      setPreviewModalOpen(true);
      return;
    }
    setPreviewModalOpen(true);
  };

  const handleDownloadDocx = async () => {
    try {
      const blob = previewDocxBlob || (await generateRefundDocxBlob());
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `خطاب_استرداد_التأمين_النهائي_${registrationNumber || op.serialNumber}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تحميل مستند الوورد بنجاح! 📥");
    } catch (err: any) {
      toast.error("فشل تحميل ملف Word: " + (err?.message || ""));
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const docx = previewDocxBlob || (await generateRefundDocxBlob());
      const pdf = previewPdfBlob || (await getPdfBlobFromDocx(docx, `refund_${registrationNumber}.docx`));
      const url = URL.createObjectURL(pdf);
      const a = document.createElement("a");
      a.href = url;
      a.download = `خطاب_استرداد_التأمين_النهائي_${registrationNumber || op.serialNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تحميل ملف الـ PDF بنجاح! 📥");
    } catch (err: any) {
      toast.error("فشل تحميل ملف PDF: " + (err?.message || ""));
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-foreground print:m-0 print:p-0">
      {/* ━━━ BANNER التنبيه في حالة رفض التظلم ━━━ */}
      {triggerContext === "GRIEVANCE_REJECTED" && (
        <div className="p-4 rounded-3xl bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-foreground text-sm sm:text-base">
                  نتيجة التظلم: رفض نهائي — طلب فتح خطاب استرداد التأمين النهائي
                </h4>
                <Badge className="bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40 text-[10px] font-bold">
                  مادة (38) من القانون 182
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                نظراً لصدور قرار الرفض النهائي للتظلم، يحق للشركة قانوناً استرداد كامل قيمة التأمين النهائي المسدد فوراً بدون أي استقطاعات.
              </p>
            </div>
          </div>

          {onClose && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="text-xs font-bold text-muted-foreground hover:bg-muted rounded-xl"
            >
              إغلاق النموذج ✕
            </Button>
          )}
        </div>
      )}

      {/* ━━━ SECTION 1: بيانات الشركة المصدرة ━━━ */}
      <SectionCard
        title="1. بيانات الشركة المصدرة وكود العملية ورقم القيد"
        icon={Building2}
        iconColor="text-blue-600"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold text-foreground">الشركة المصدرة للخطاب *</Label>
              <Select
                value={selectedCompanyId}
                onValueChange={(val) => {
                  setSelectedCompanyId(val);
                  const matched = op.companies?.find(
                    (c: any) => c.companyId === val || c.id === val
                  );
                  if (matched) {
                    if (matched.company?.commercialRegister) setCompanyCommercialRegister(matched.company.commercialRegister);
                    if (matched.company?.taxCard) setCompanyTaxCard(matched.company.taxCard);
                    setCompanyOpCode(matched.displayCode || `AZ-0${op.serialNumber || 1}`);
                  }
                }}
              >
                <SelectTrigger className="h-9.5 text-xs font-bold rounded-xl">
                  <SelectValue placeholder="اختر الشركة" />
                </SelectTrigger>
                <SelectContent className="text-xs font-medium">
                  {(op.companies || []).map((oc: any) => {
                    const compVal = oc.companyId || oc.id;
                    return (
                      <SelectItem key={oc.id || compVal} value={compVal} className="text-xs font-bold">
                        {oc.company?.name || "الشركة"} ({oc.displayCode})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold text-foreground">رقم القيد الصادر بالخطاب *</Label>
              <Input
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                className="h-9.5 text-xs font-mono font-bold rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">كود العملية (Header) *</Label>
              <Input
                value={companyOpCode}
                onChange={(e) => setCompanyOpCode(e.target.value)}
                className="h-9.5 text-xs font-mono font-bold rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">السجل التجاري (س . ت) *</Label>
              <Input
                value={companyCommercialRegister}
                onChange={(e) => setCompanyCommercialRegister(e.target.value)}
                className="h-9.5 text-xs font-mono rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">البطاقة الضريبية (ب . ض) *</Label>
              <Input
                value={companyTaxCard}
                onChange={(e) => setCompanyTaxCard(e.target.value)}
                className="h-9.5 text-xs font-mono rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">التاريخ الصادر (Footer) *</Label>
              <Input
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="h-9.5 text-xs font-mono rounded-xl"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 2: جهة الإسناد والمبلغ المسترد ━━━ */}
      <SectionCard
        title="2. جهة الإسناد وبيانات العملية ومبلغ التأمين المسترد"
        icon={DollarSign}
        iconColor="text-emerald-600"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs font-bold text-foreground">لقب المرسل إليه (السيد ...) *</Label>
              <Input
                value={recipientPrefix}
                onChange={(e) => setRecipientPrefix(e.target.value)}
                placeholder="الأستاذ"
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label className="text-xs font-bold text-foreground">المنصب والجهة الإدارية المسندة *</Label>
              <Input
                value={recipientTitleAndAuthority}
                onChange={(e) => setRecipientTitleAndAuthority(e.target.value)}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold text-foreground">اسم العملية المسجلة *</Label>
              <Input
                value={operationRegisteredName}
                onChange={(e) => setOperationRegisteredName(e.target.value)}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">رقم العملية / المناقصة *</Label>
              <Input
                value={operationNumber}
                onChange={(e) => setOperationNumber(e.target.value)}
                className="h-9.5 text-xs font-mono font-bold rounded-xl"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="space-y-1.5">
                <Label className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                  مبلغ التأمين النهائي المطلوب استرداده (بالأرقام) *
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="h-10 text-base font-black font-mono pl-14 bg-background rounded-xl text-emerald-700 dark:text-emerald-300"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    ج.م
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-muted-foreground">التفقيط المعتمد التلقائي (بالحروف)</Label>
                <div className="p-2.5 rounded-xl bg-background border border-border text-xs font-bold text-foreground leading-relaxed">
                  فقط وقدره : {tafqeetAmount} جنيهاً لا غير.
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 3: طريقة سداد التأمين الأصلية ━━━ */}
      <SectionCard
        title="3. بيان كيفية سداد التأمين النهائي المراد استرداده"
        icon={Receipt}
        iconColor="text-amber-600"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setPaymentMethod("DEDUCTION")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                paymentMethod === "DEDUCTION"
                  ? "bg-amber-500 text-white border-amber-600 shadow-md"
                  : "bg-muted/40 hover:bg-muted text-foreground border-border"
              }`}
            >
              <span>خصماً من مستحقات الشركة في عملية أخرى</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("CASH_RECEIPT")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                paymentMethod === "CASH_RECEIPT"
                  ? "bg-amber-500 text-white border-amber-600 shadow-md"
                  : "bg-muted/40 hover:bg-muted text-foreground border-border"
              }`}
            >
              <span>بإيصال سداد نقدي بخزينة الجهة</span>
            </button>
          </div>

          {paymentMethod === "DEDUCTION" ? (
            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5 sm:col-span-1">
                  <Label className="text-xs font-bold text-foreground">اسم العملية المخصوم منها *</Label>
                  <Input
                    value={deductionOperationName}
                    onChange={(e) => setDeductionOperationName(e.target.value)}
                    placeholder="توريد مستلزمات..."
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-1">
                  <Label className="text-xs font-bold text-foreground">عن شهر *</Label>
                  <Input
                    value={deductionMonth}
                    onChange={(e) => setDeductionMonth(e.target.value)}
                    placeholder="سبتمبر"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-1">
                  <Label className="text-xs font-bold text-foreground">سنة *</Label>
                  <Input
                    value={deductionYear}
                    onChange={(e) => setDeductionYear(e.target.value)}
                    placeholder="2024"
                    className="h-9 text-xs font-mono rounded-xl"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">رقم إيصال السداد النقدي *</Label>
                  <Input
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="102548"
                    className="h-9 text-xs font-mono rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">تاريخ إيصال السداد *</Label>
                  <Input
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    placeholder="15/ 10 /2024"
                    className="h-9 text-xs font-mono rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">طريقة الطرح التعاقدية *</Label>
              <Input
                value={tenderMethod}
                onChange={(e) => setTenderMethod(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold text-foreground">نطاق وموضوع العملية *</Label>
              <Input
                value={operationScope}
                onChange={(e) => setOperationScope(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">العام المالي *</Label>
              <Input
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                className="h-9 text-xs font-mono rounded-xl"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 4: الحساب البنكي لتحويل المبلغ ━━━ */}
      <SectionCard
        title="4. الحساب البنكي الرسمي للشركة لتحويل مبلغ التأمين المسترد"
        icon={CreditCard}
        iconColor="text-teal-600"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs font-bold text-foreground">رقم الحساب البنكي (IBAN / Account) *</Label>
              <Input
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                className="h-9.5 text-xs font-mono font-bold rounded-xl"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs font-bold text-foreground">اسم البنك *</Label>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs font-bold text-foreground">الفرع *</Label>
              <Input
                value={bankBranch}
                onChange={(e) => setBankBranch(e.target.value)}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">اسم صاحب الحساب الرسمي *</Label>
              <Input
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">الرقم القومي لصاحب الحساب *</Label>
              <Input
                value={accountNationalId}
                onChange={(e) => setAccountNationalId(e.target.value)}
                className="h-9.5 text-xs font-mono rounded-xl"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 5: التوقيعات والمرفقات والملاحظات ━━━ */}
      <SectionCard
        title="5. التوقيعات الرسمية والمرفقات والملاحظات الإضافية"
        icon={UserCheck}
        iconColor="text-indigo-600"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">المختص (إعداد) *</Label>
              <Input
                value={specialistName}
                onChange={(e) => setSpecialistName(e.target.value)}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">المدير المالي (مراجعة) *</Label>
              <Input
                value={financeManagerName}
                onChange={(e) => setFinanceManagerName(e.target.value)}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">يعتمد رئيس مجلس الإدارة *</Label>
              <Input
                value={boardChairman}
                onChange={(e) => setBoardChairman(sanitizeChairmanTitle(e.target.value))}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">بيان المرفقات المطبوع بالخطاب *</Label>
              <Input
                value={attachmentNote}
                onChange={(e) => setAttachmentNote(e.target.value)}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">ملاحظات إضافية (خانة الملاحظات)</Label>
              <Input
                value={letterNotes}
                onChange={(e) => setLetterNotes(e.target.value)}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ━━━ الباركود الذكي ورمز QR والرفع السحابي ━━━ */}
      <LetterQrCloudCard
        cloudPdfUrl={cloudPdfUrl}
        registrationNumber={registrationNumber}
        opId={op.id}
        docType="final_insurance_refund"
        uploadingCloud={uploadingCloud}
        onUploadToCloud={handleUploadToCloud}
        title="الباركود الذكي ورمز QR لخطاب استرداد التأمين النهائي"
        subtitle="عند مسح الباركود بكاميرا الموبايل يتم فتح النسخة الرقمية المعتمدة لخطاب الاسترداد فوراً بدون تسجيل دخول."
        badgeText="مدمج بموضع كلمة (الباركود) بالأعلى ورقم القيد بالتذييل"
        gradientClass="from-emerald-500/10 via-teal-500/10 to-transparent border-emerald-500/25"
        isModifiedAfterUpload={isDirty}
      />

      {/* ━━━ شريط الإجراءات السفلي ━━━ */}
      <LetterBottomActionWidget
        title="خطاب استرداد التأمين النهائي الرسمي المعتمد"
        registrationNumber={registrationNumber}
        isDirty={isDirty}
        printInfo={printHistory["refund"]}
        onPreview={() => setPreviewModalOpen(true)}
        onSave={handleSaveToSystem}
        onCancelEdits={() => {
          try {
            const snap = JSON.parse(savedSnapshot);
            setSelectedCompanyId(snap.selectedCompanyId);
            setRegistrationNumber(snap.registrationNumber);
            setRefundAmount(snap.refundAmount);
            toast.info("تم التراجع عن التعديلات ↺");
          } catch {}
        }}
        saving={savingLetter}
        onViewArchive={handleViewArchive}
        customSubtitle="وفقاً للمادة (38) من القانون 182 لسنة 2018. اضغط على زر المعاينة للاطلاع على المستند وتنزيله أو طباعته."
      />

      {/* ━━━ نافذة المعاينة المباشرة المعتمدة ━━━ */}
      {previewModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-3xl max-w-6xl w-full p-4 sm:p-6 shadow-2xl h-[94vh] max-h-[94vh] flex flex-col overflow-hidden text-foreground">
              <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-foreground text-base">
                        معاينة قالب الوورد المعتمد: خطاب استرداد التأمين النهائي.docx
                      </h3>
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                        معاينة Word COM الرسمية 100% ✓
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      معاينة حية ومطابقة 100% لقالب الوورد الأصلي مع دعم التحميل بصيغة Word أو PDF والطباعة المباشرة
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => loadOfficialPreview(true)}
                    disabled={renderingDocx}
                    className="text-xs font-bold h-9 rounded-xl border border-border hover:bg-muted cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${renderingDocx ? "animate-spin text-amber-600" : ""}`} />
                    <span>تحديث</span>
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setPreviewModalOpen(false)}
                    className="h-8.5 w-8.5 rounded-full hover:bg-muted cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden pt-3 flex flex-col">
                {renderingDocx ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 text-center bg-slate-950 rounded-2xl">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-lg">
                      <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white">جاري معالجة وتوليد المعاينة الأصلية لمستند الوورد...</h4>
                      <p className="text-xs text-slate-400">تطبيق الباركود والمتغيرات وإزالة علامات التمييز الحمراء بدقة 100%</p>
                    </div>
                  </div>
                ) : (
                  <OnlyOfficeDocViewer
                    documentTitle={`خطاب_استرداد_التأمين_النهائي_${registrationNumber || op.serialNumber}.docx`}
                    docxBlob={previewDocxBlob}
                    pdfBlob={previewPdfBlob}
                    onDownloadDocx={handleDownloadDocx}
                    onDownloadPdf={handleDownloadPdf}
                    onPrint={handlePrintWordDocument}
                  />
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ━━━ نافذة التنبيه عند إعادة الطباعة ━━━ */}
      <ReprintConfirmModal
        open={reprintWarningOpen}
        onClose={() => setReprintWarningOpen(false)}
        printInfo={printHistory["refund"]}
        onConfirmReprint={() => {
          setReprintWarningOpen(false);
          executePrintDoc();
        }}
        onViewArchive={() => {
          setReprintWarningOpen(false);
          handleViewArchive();
        }}
      />

      <PdfExportLoadingModal open={downloadingPdf} />
    </div>
  );
}
