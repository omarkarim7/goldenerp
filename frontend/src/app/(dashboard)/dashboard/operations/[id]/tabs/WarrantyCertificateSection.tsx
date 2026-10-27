"use client";

import React, { useState, useMemo, useEffect } from "react";
import JSZip from "jszip";
import QRCode from "qrcode";
import {
  Building2,
  FileText,
  ShieldCheck,
  Calendar,
  Layers,
  Plus,
  Trash2,
  RefreshCw,
  X,
  UserCheck,
  CheckCircle2,
  AlertCircle,
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
import { Operation, SectionCard } from "./types";
import { StepFooterNav } from "./StepFooterNav";
import {
  isValidCloudDocUrl,
  escapeXml,
  cleanAllDocxXml,
  buildQrAnchorXml,
  injectSingleQrIntoDocXml,
  getUnifiedOperationRegistrationNumber,
  getLetterSpecificRegistrationNumber,
  regenerateLetterSpecificRegistrationNumber,
  getOperationRecipientTitle,
  LetterQrCloudCard,
  LetterBottomActionWidget,
  ReprintConfirmModal,
  PdfExportLoadingModal,
  PrintHistoryEntry,
  getCurrentUserName,
  sanitizeChairmanTitle,
  generateHighResDocQrBuffer,
  getStandardDocQrPayload,
  buildOfficialSignaturesTableXml,
  replaceDocxRecipient,
} from "./letter-utils";
import { getPdfBlobFromDocx, uploadPdfToFreeCloud, getExpectedCloudPdfUrl } from "./client-pdf";
import {
  getArchivedLetterInfo,
  saveLetterToArchiveWithVersion,
  loadArchivedPdfBlob,
} from "./archive-utils";

export interface WarrantyCertificateItem {
  id: string;
  itemName: string;
  unit: string;
  quantity: string;
  description: string;
  notes: string;
}

interface WarrantyCertificateSectionProps {
  op: Operation;
  onRefresh: () => void;
  initialItems?: Array<{
    itemName: string;
    unit: string;
    quantity: string;
    variants?: Array<{ description?: string; notes?: string }>;
  }>;
  onGoBackToOffer?: () => void;
  onNavigate?: (tabId: string) => void;
}

function buildWarrantyTableRowsXml(items: WarrantyCertificateItem[]): string {
  let rowsXml = "";
  items.forEach((item, idx) => {
    const trPr = `<w:trPr><w:trHeight w:val="330"/></w:trPr>`;
    const makeCell = (w: number, text: string, align: "center" | "right" = "center") => {
      const borderStr =
        '<w:top w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/><w:left w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/><w:bottom w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/><w:right w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/>';
      return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:tcBorders>${borderStr}</w:tcBorders><w:hideMark/></w:tcPr><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="${align}"/><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arabic Typesetting" w:hAnsi="Arabic Typesetting" w:cs="Arabic Typesetting"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>${escapeXml(text)}</w:t></w:r></w:p></w:tc>`;
    };
    const c0 = makeCell(561, String(idx + 1), "center");
    const c1 = makeCell(3593, item.itemName, "right");
    const c2 = makeCell(977, item.unit, "center");
    const c3 = makeCell(977, item.quantity, "center");
    const c4 = makeCell(2798, item.description, "right");
    const c5 = makeCell(1241, item.notes, "right");
    rowsXml += `<w:tr>${trPr}${c0}${c1}${c2}${c3}${c4}${c5}</w:tr>`;
  });
  return rowsXml;
}

export function WarrantyCertificateSection({
  op,
  onRefresh,
  initialItems = [],
  onGoBackToOffer,
  onNavigate,
}: WarrantyCertificateSectionProps) {
  // قراءة بيانات شهادة الضمان المحفوظة مسبقاً
  const savedWarranty = useMemo(() => {
    try {
      if (op.notes && op.notes.startsWith("{")) {
        const parsed = JSON.parse(op.notes);
        return parsed.warrantyCertificate || null;
      }
    } catch {}
    return null;
  }, [op.notes]);

  const savedTechOffer = useMemo(() => {
    try {
      if (op.notes && op.notes.startsWith("{")) {
        const parsed = JSON.parse(op.notes);
        return parsed.technicalOfferDocx || null;
      }
    } catch {}
    return null;
  }, [op.notes]);

  // الشركة وبيانات الترويسة
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => {
    return (
      savedWarranty?.selectedCompanyId ||
      savedTechOffer?.selectedCompanyId ||
      op.companies?.[0]?.companyId ||
      op.companies?.[0]?.id ||
      ""
    );
  });

  const currentCompanyLink = useMemo(() => {
    return (
      op.companies?.find(
        (c: any) =>
          c.companyId === selectedCompanyId ||
          c.id === selectedCompanyId ||
          c.company?.id === selectedCompanyId
      ) || op.companies?.[0]
    );
  }, [op.companies, selectedCompanyId]);

  const currentCompany = currentCompanyLink?.company;

  const [registrationNumber, setRegistrationNumber] = useState(() => {
    return getLetterSpecificRegistrationNumber(
      op,
      "warranty_certificate",
      currentCompanyLink?.displayCode,
      savedWarranty?.registrationNumber || savedTechOffer?.registrationNumber
    );
  });

  const handleRegenerateRef = async () => {
    await regenerateLetterSpecificRegistrationNumber({
      op,
      letterKey: "warranty_certificate",
      companyCode: currentCompanyLink?.displayCode || "AZ",
      onSuccess: (fresh) => {
        setRegistrationNumber(fresh);
        onRefresh();
      },
    });
  };

  const [companyOpCode, setCompanyOpCode] = useState(() => {
    return (
      savedWarranty?.companyOpCode ||
      savedTechOffer?.companyOpCode ||
      currentCompanyLink?.displayCode ||
      `AZ-0${op.serialNumber || 1}`
    );
  });

  const [companyCommercialRegister, setCompanyCommercialRegister] = useState(() => {
    return (
      savedWarranty?.companyCommercialRegister ||
      savedTechOffer?.companyCommercialRegister ||
      currentCompany?.commercialRegister ||
      "110200700036620"
    );
  });

  const [companyTaxCard, setCompanyTaxCard] = useState(() => {
    return (
      savedWarranty?.companyTaxCard ||
      savedTechOffer?.companyTaxCard ||
      currentCompany?.taxCard ||
      "658369652"
    );
  });

  const [phoneWhatsapp, setPhoneWhatsapp] = useState(() => {
    return savedWarranty?.phoneWhatsapp || savedTechOffer?.phoneWhatsapp || currentCompany?.phone || "01091708818";
  });

  const [phoneMobile, setPhoneMobile] = useState(() => {
    return savedWarranty?.phoneMobile || savedTechOffer?.phoneMobile || "01557018818";
  });

  const [companyAddress, setCompanyAddress] = useState(() => {
    return (
      savedWarranty?.companyAddress ||
      savedTechOffer?.companyAddress ||
      currentCompany?.address ||
      "بجوار مستشفى ليدى كير  -  بدمنهور -  البحيره"
    );
  });

  const [issueDate, setIssueDate] = useState(() => {
    return savedWarranty?.issueDate || new Date().toLocaleDateString("en-GB");
  });

  // المرسل إليه والموضوع
  const [recipientPrefix, setRecipientPrefix] = useState(() => {
    return savedWarranty?.recipientPrefix || savedTechOffer?.recipientPrefix || "الأستاذ";
  });

  const [recipientTitleAndAuthority, setRecipientTitleAndAuthority] = useState(() => {
    return (
      savedWarranty?.recipientTitleAndAuthority ||
      savedTechOffer?.recipientTitleAndAuthority ||
      getOperationRecipientTitle(op)
    );
  });

  const [operationRegisteredName, setOperationRegisteredName] = useState(() => {
    return (
      savedWarranty?.operationRegisteredName ||
      savedTechOffer?.operationRegisteredName ||
      op.name ||
      "توريد أصناف ومعدات"
    );
  });

  const [operationNumber, setOperationNumber] = useState(() => {
    return (
      savedWarranty?.operationNumber ||
      savedTechOffer?.operationNumber ||
      op.externalNumber ||
      op.serialNumber ||
      "365"
    );
  });

  const [subjectTarget, setSubjectTarget] = useState(() => {
    return savedWarranty?.subjectTarget || savedTechOffer?.subjectTarget || "للأصناف";
  });

  // بيان الضمان
  const [companyName, setCompanyName] = useState(() => {
    return (
      savedWarranty?.companyName ||
      currentCompany?.name ||
      "جولدن سرفيس للخدمات العامة والتوريدات"
    );
  });

  const [suppliedItemsCategory, setSuppliedItemsCategory] = useState(() => {
    return savedWarranty?.suppliedItemsCategory || "كاوتش وبطاريات";
  });

  const [authorityShort, setAuthorityShort] = useState(() => {
    return savedWarranty?.authorityShort || "الجامعه";
  });

  const [tenderMethod, setTenderMethod] = useState(() => {
    return savedWarranty?.tenderMethod || "بالمناقصة المحدودة";
  });

  const [operationScope, setOperationScope] = useState(() => {
    return savedWarranty?.operationScope || op.name || "توريد كاوتش وبطاريات للسيارات للجامعه";
  });

  const [fiscalYear, setFiscalYear] = useState(() => {
    return savedWarranty?.fiscalYear || savedTechOffer?.fiscalYear || "2024 / 2025";
  });

  const [technicalOpeningDate, setTechnicalOpeningDate] = useState(() => {
    return savedWarranty?.technicalOpeningDate || savedTechOffer?.technicalOpeningDate || "14/ 1 /2024";
  });

  // مدة وشروط الضمان
  const [warrantyDuration, setWarrantyDuration] = useState(() => {
    return savedWarranty?.warrantyDuration || savedTechOffer?.warrantyDuration || "سنة";
  });

  const [warrantyCoverage, setWarrantyCoverage] = useState(() => {
    return savedWarranty?.warrantyCoverage || "ضد عيوب الصناعه في مداس الكاوتش  فقط";
  });

  // الحالات التي لا يسري فيها الضمان
  const [case1, setCase1] = useState(() => {
    return savedWarranty?.case1 || "زيادة ضغط الهواء بالاطارات.";
  });
  const [case2, setCase2] = useState(() => {
    return savedWarranty?.case2 || "التعرض للصدمات أو اى الات حادة.";
  });
  const [case3, setCase3] = useState(() => {
    return savedWarranty?.case3 || "سوء الاستخدام .";
  });
  const [case4, setCase4] = useState(() => {
    return savedWarranty?.case4 || "أي شطب أو تعديل في هذه الشهادة تعتبر لاغيه.";
  });

  // مدة سريان الشهادة
  const [validityDuration, setValidityDuration] = useState(() => {
    return savedWarranty?.validityDuration || "ستة أشهر";
  });

  // التوقيعات
  const [engineerSpecialist, setEngineerSpecialist] = useState(() => {
    return savedWarranty?.engineerSpecialist || "";
  });
  const [financeManager, setFinanceManager] = useState(() => {
    return savedWarranty?.financeManager || "";
  });
  const [boardChairman, setBoardChairman] = useState(() => {
    return sanitizeChairmanTitle(savedWarranty?.boardChairman || "رئيس مجلس الإدارة");
  });

  // الملاحظات
  const [warrantyNotes, setWarrantyNotes] = useState(() => {
    return savedWarranty?.warrantyNotes || "شهادة ضمان رسمية معتمدة ومطابقة لأحكام العقد وأوامر التوريد.";
  });

  // قائمة الأصناف لشهادة الضمان
  const [items, setItems] = useState<WarrantyCertificateItem[]>(() => {
    if (savedWarranty?.items && savedWarranty.items.length > 0) {
      return savedWarranty.items;
    }
    // تهيئة تلقائية من أصناف العرض الفني الأولي
    if (initialItems && initialItems.length > 0) {
      return initialItems.map((item, idx) => ({
        id: `w-item-${idx + 1}`,
        itemName: item.itemName || `صنف #${idx + 1}`,
        unit: item.unit || "عدد",
        quantity: item.quantity || "1",
        description: item.variants?.[0]?.description || item.itemName || "",
        notes: item.variants?.[0]?.notes || "مطابق للمواصفة القياسية",
      }));
    }
    if (savedTechOffer?.items && savedTechOffer.items.length > 0) {
      return savedTechOffer.items.map((item: any, idx: number) => ({
        id: `w-item-${idx + 1}`,
        itemName: item.itemName || `صنف #${idx + 1}`,
        unit: item.unit || "عدد",
        quantity: item.quantity || "1",
        description: item.variants?.[0]?.description || item.itemName || "",
        notes: item.variants?.[0]?.notes || "مطابق للمواصفة القياسية",
      }));
    }
    return [
      {
        id: "w-1",
        itemName: "إطار كاوتش 22.5/80/315",
        unit: "عدد",
        quantity: "12",
        description: "إطارات ماركة ياباني إنتاج حديث",
        notes: "ضمان سنة ضد عيوب الصناعة",
      },
      {
        id: "w-2",
        itemName: "بطارية سيارة جافة 70 أمبير",
        unit: "عدد",
        quantity: "8",
        description: "بطاريات كلورايد جافة أصلية",
        notes: "ضمان 12 شهر استبدال فوري",
      },
    ];
  });

  // الرابط السحابي المعتمد
  const [cloudPdfUrl, setCloudPdfUrl] = useState<string>(() => {
    const url = savedWarranty?.cloudPdfUrl || "";
    return isValidCloudDocUrl(url) ? url : "";
  });
  const [uploadingCloud, setUploadingCloud] = useState(false);

  // سجل الطباعة
  const [printHistory, setPrintHistory] = useState<Record<string, PrintHistoryEntry>>(() => {
    return savedWarranty?.printHistory || {};
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
  const [savingWarranty, setSavingWarranty] = useState(false);

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
      subjectTarget,
      companyName,
      suppliedItemsCategory,
      authorityShort,
      tenderMethod,
      operationScope,
      fiscalYear,
      technicalOpeningDate,
      warrantyDuration,
      warrantyCoverage,
      case1,
      case2,
      case3,
      case4,
      validityDuration,
      engineerSpecialist,
      financeManager,
      boardChairman,
      warrantyNotes,
      items,
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
    subjectTarget,
    companyName,
    suppliedItemsCategory,
    authorityShort,
    tenderMethod,
    operationScope,
    fiscalYear,
    technicalOpeningDate,
    warrantyDuration,
    warrantyCoverage,
    case1,
    case2,
    case3,
    case4,
    validityDuration,
    engineerSpecialist,
    financeManager,
    boardChairman,
    warrantyNotes,
    items,
  ]);

  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => currentSnapshot);
  const isDirty = useMemo(() => currentSnapshot !== savedSnapshot, [currentSnapshot, savedSnapshot]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `w-item-${Date.now()}`,
        itemName: "",
        unit: "عدد",
        quantity: "1",
        description: "",
        notes: "",
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      toast.warning("يجب الإبقاء على صنف واحد على الأقل في شهادة الضمان");
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof WarrantyCertificateItem, val: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: val } : it)));
  };

  // ━━━ محرك توليد مستند الوورد الرسمي لشهادة الضمان ━━━
  const generateWarrantyDocxBlob = async (): Promise<Blob> => {
    const response = await fetch("/templates/warranty_certificate_template.docx");
    if (!response.ok) throw new Error("فشل قراءة قالب شهادة الضمان من الخادم");
    const templateBuffer = await response.arrayBuffer();

    const zip = await JSZip.loadAsync(templateBuffer);

    let qrDrawingXml = "";
    try {
      const activeCloud = cloudPdfUrl;
      const filename = `warranty_${registrationNumber || op.serialNumber || "doc"}.pdf`;
      const qrPayload = await getStandardDocQrPayload(
        activeCloud,
        registrationNumber,
        "شهادة الضمان والصيانة المعتمدة",
        currentCompany?.name || "المجموعة الذهبية",
        filename
      );
      const qrBinary = await generateHighResDocQrBuffer(qrPayload);

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
      console.warn("QR generation failed in WarrantyCertificateSection:", e);
    }

    // 1. استبدال محتوى word/document.xml
    let docXml = await zip.file("word/document.xml")!.async("text");
    docXml = injectSingleQrIntoDocXml(docXml, qrDrawingXml, escapeXml(registrationNumber));

    // المرسل إليه والموضوع
    docXml = replaceDocxRecipient(docXml, recipientPrefix, recipientTitleAndAuthority);
    docXml = docXml.replace(/للأصناف/g, escapeXml(subjectTarget));
    docXml = docXml.replace(/اسم العملية المسجله[\s\.]*/g, escapeXml(operationRegisteredName) + " ");
    docXml = docXml.replace(/365/g, escapeXml(operationNumber));

    // استبدال جدول الأصناف بدقة 100%
    const tableMatch = docXml.match(/<w:tbl[\s\S]*?<\/w:tbl>/);
    if (tableMatch) {
      const originalTable = tableMatch[0];
      const rows = originalTable.match(/<w:tr[\s\S]*?<\/w:tr>/g) || [];
      if (rows.length > 0) {
        const headerRow = rows[0];
        const newRowsXml = buildWarrantyTableRowsXml(items);
        const newTable = originalTable.replace(
          /<w:tr[\s\S]*<\/w:tr>/,
          `${headerRow}${newRowsXml}`
        );
        docXml = docXml.replace(originalTable, newTable);
      }
    } else {
      // حقن الجدول كبديل أمان في حال عدم وجوده بالقالب الأصلي
      const fullTableXml =
        `<w:tbl><w:tblPr><w:bidiVisual/><w:tblW w:w="10147" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders><w:top w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:left w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:bottom w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:right w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:insideH w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/><w:insideV w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="auto"/></w:tblBorders><w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="0"/></w:tblPr><w:tblGrid><w:gridCol w:w="561"/><w:gridCol w:w="3593"/><w:gridCol w:w="977"/><w:gridCol w:w="977"/><w:gridCol w:w="2798"/><w:gridCol w:w="1241"/></w:tblGrid><w:tr><w:trPr><w:trHeight w:val="330"/><w:jc w:val="center"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="561" w:type="dxa"/><w:tcBorders><w:top w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:left w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:bottom w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:right w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/></w:tcBorders></w:tcPr><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/><w:sz w:val="30"/><w:szCs w:val="30"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="30"/><w:szCs w:val="30"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>م</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="3593" w:type="dxa"/><w:tcBorders><w:top w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:left w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:bottom w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:right w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/></w:tcBorders></w:tcPr><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/><w:sz w:val="30"/><w:szCs w:val="30"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="30"/><w:szCs w:val="30"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>إســــم الصــــــنف والمواصفات</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="977" w:type="dxa"/><w:tcBorders><w:top w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:left w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:bottom w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:right w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/></w:tcBorders></w:tcPr><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/><w:sz w:val="30"/><w:szCs w:val="30"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="30"/><w:szCs w:val="30"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>الوحدة</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="977" w:type="dxa"/><w:tcBorders><w:top w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:left w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:bottom w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:right w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/></w:tcBorders></w:tcPr><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/><w:sz w:val="30"/><w:szCs w:val="30"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="30"/><w:szCs w:val="30"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>الكميه</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="2798" w:type="dxa"/><w:tcBorders><w:top w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:left w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:bottom w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:right w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/></w:tcBorders></w:tcPr><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/><w:sz w:val="30"/><w:szCs w:val="30"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="30"/><w:szCs w:val="30"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>بيان وتغطية الضمان</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="1241" w:type="dxa"/><w:tcBorders><w:top w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:left w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:bottom w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/><w:right w:val="thinThickSmallGap" w:sz="24" w:space="0" w:color="auto"/></w:tcBorders></w:tcPr><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/><w:sz w:val="30"/><w:szCs w:val="30"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="30"/><w:szCs w:val="30"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>ملاحظات الضمان</w:t></w:r></w:p></w:tc></w:tr>${buildWarrantyTableRowsXml(items)}</w:tbl><w:p><w:pPr><w:spacing w:before="120" w:after="120" w:line="240" w:lineRule="auto"/></w:pPr></w:p>`;

      const warrantyParaMatch = docXml.match(/<w:p[\s\S]*?مدة الضمان[\s\S]*?<\/w:p>/);
      if (warrantyParaMatch) {
        docXml = docXml.replace(warrantyParaMatch[0], fullTableXml + warrantyParaMatch[0]);
      }
    }

    // فقرة بيان الضمان الشاملة
    docXml = docXml.replace(/جولدن سرفيس/g, escapeXml(companyName));
    docXml = docXml.replace(
      /للعملية المذكورة أعلاه طرفكم/g,
      `للعملية المذكورة أعلاه (${escapeXml(tenderMethod)} - ${escapeXml(operationScope)}) طرفكم`
    );
    docXml = docXml.replace(/2024\s*\/\s*2025/g, escapeXml(fiscalYear));
    docXml = docXml.replace(/14\/\s*1\s*\/2024/g, escapeXml(technicalOpeningDate));

    // مدة الضمان وتغطيته بدقة ومنع التكرار أو الفراغات الزائدة
    let cleanCoverage = (warrantyCoverage || "").trim();
    if (cleanCoverage && !cleanCoverage.startsWith("ضد") && !cleanCoverage.startsWith("شامل")) {
      cleanCoverage = `ضد عيوب الصناعة في ${cleanCoverage}`;
    }
    const safeDuration = (warrantyDuration || "سنة").trim();
    const warrantyReplacementParagraph = `<w:p w14:paraId="5314EBCB" w14:textId="15F624A1" w:rsidR="003776BD" w:rsidRDefault="003776BD" w:rsidP="003776BD"><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="mediumKashida"/><w:rPr><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="36"/><w:szCs w:val="36"/><w:u w:val="single"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>مدة الضمان</w:t></w:r><w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="36"/><w:szCs w:val="36"/><w:u w:val="none"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t>: </w:t></w:r><w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:u w:val="none"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">${escapeXml(safeDuration)} ${escapeXml(cleanCoverage)}</w:t></w:r></w:p>`;

    if (/<w:p[\s\S]*?مدة الضمان[\s\S]*?<\/w:p>/.test(docXml)) {
      docXml = docXml.replace(/<w:p[\s\S]*?مدة الضمان[\s\S]*?<\/w:p>/, warrantyReplacementParagraph);
    } else {
      docXml = docXml.replace(
        /مدة الضمان:\s*سنة ضد عيوب الصناعه في مداس الكاوتش\s*فقط/g,
        `مدة الضمان: ${escapeXml(safeDuration)} ${escapeXml(cleanCoverage)}`
      );
    }

    // الحالات المستثناة
    docXml = docXml.replace(/زيادة ضغط الهواء بالاطارات/g, escapeXml((case1 || "").replace(/\.$/, "")));
    docXml = docXml.replace(/التعرض للصدمات أو اى الات حادة/g, escapeXml((case2 || "").replace(/\.$/, "")));
    docXml = docXml.replace(/سوء الاستخدام/g, escapeXml((case3 || "").replace(/\.$/, "")));
    docXml = docXml.replace(/أي شطب أو تعديل في هذه الشهادة تعتبر لاغيه/g, escapeXml((case4 || "").replace(/\.$/, "")));

    // مدة سريان الشهادة
    docXml = docXml.replace(/ستة أشهر/g, escapeXml(validityDuration));

    // التوقيعات بأسفل الصفحة في جدول ثلاثي منضبط (المختص | المدير المالي | يعتمد رئيس مجلس الإدارة)
    const sigStart = docXml.indexOf("المهندس المختص");
    if (sigStart !== -1) {
      const pStart = docXml.lastIndexOf("<w:p", sigStart);
      const chairmanIdx = docXml.indexOf("رئيس مجلس الإدارة", sigStart);
      if (chairmanIdx !== -1) {
        const pEnd = docXml.indexOf("</w:p>", chairmanIdx);
        if (pStart !== -1 && pEnd !== -1) {
          const sigTableXml = buildOfficialSignaturesTableXml({
            specialistTitle: "المهندس المختص :",
            specialistName: engineerSpecialist || " ",
            financeManagerName: financeManager || " ",
            boardChairman: boardChairman || "رئيس مجلس الإدارة",
          });
          docXml = docXml.substring(0, pStart) + sigTableXml + docXml.substring(pEnd + 6);
        }
      }
    } else {
      docXml = docXml.replace(/رئيس مجلس\s*ا?ل?[إا]دارة/g, escapeXml(boardChairman || "رئيس مجلس الإدارة"));
    }

    // الملاحظات
    docXml = docXml.replace(/خانة لكتابة ملاحظة/g, escapeXml(warrantyNotes));

    zip.file("word/document.xml", docXml);

    // 2. تحديث الترويسة والتذييل
    for (const fileName of Object.keys(zip.files)) {
      if (fileName.startsWith("word/header") && fileName.endsWith(".xml")) {
        let hdr = await zip.file(fileName)!.async("text");
        hdr = hdr.replace(/110200700036620/g, escapeXml(companyCommercialRegister));
        hdr = hdr.replace(/658369652/g, escapeXml(companyTaxCard));
        hdr = hdr.replace(/\(?\s*كود العملية بالشركه\s*\)?/g, escapeXml(companyOpCode));
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
    setPreviewModalOpen(true);
    if (previewPdfBlob && currentSnapshot === lastGeneratedSnapshot && !forceRefresh) {
      return;
    }
    if (renderingDocx) return;
    setRenderingDocx(true);
    try {
      // 0ms instant preview from archive if not dirty and not forcing refresh
      if (!forceRefresh && !isDirty) {
        const archived = await loadArchivedPdfBlob(op, "letter-warranty");
        if (archived?.blob) {
          setPreviewPdfBlob(archived.blob);
          if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
          setPreviewPdfUrl(URL.createObjectURL(archived.blob));
          setLastGeneratedSnapshot(currentSnapshot);
          setRenderingDocx(false);
          return;
        }
      }

      const docx = await generateWarrantyDocxBlob();
      setPreviewDocxBlob(docx);

      const pdf = await getPdfBlobFromDocx(
        docx,
        `warranty_certificate_${registrationNumber || op.serialNumber}.docx`
      );
      setPreviewPdfBlob(pdf);
      if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
      const url = URL.createObjectURL(pdf);
      setPreviewPdfUrl(url);

      setLastGeneratedSnapshot(currentSnapshot);
      if (forceRefresh) {
        toast.success("تم تحديث معاينة شهادة الضمان بنجاح! 🔄✨");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("فشل تجهيز مستند المعاينة: " + (err?.message || ""));
    } finally {
      setRenderingDocx(false);
    }
  };

  // ━━━ دالة الرفع السحابي ━━━
  // ━━━ دالة الرفع السحابي ━━━
  const handleUploadToCloud = async (forceReupload = false) => {
    if (cloudPdfUrl && !forceReupload) {
      toast.info("تم رفع وتوثيق هذه الشهادة سحابياً مسبقاً وهي نشطة بالفعل ✓");
      return;
    }
    setUploadingCloud(true);
    try {
      toast.info("جاري توثيق ورفع شهادة الضمان سحابياً (رابط PDF مباشر)...");
      let docx = previewDocxBlob;
      let pdf = previewPdfBlob;
      if (!docx || !pdf || forceReupload) {
        docx = await generateWarrantyDocxBlob();
        pdf = await getPdfBlobFromDocx(docx, `warranty_${registrationNumber}.docx`);
        setPreviewDocxBlob(docx);
        setPreviewPdfBlob(pdf);
      }

      const fileName = `warranty_certificate_${registrationNumber || op.serialNumber}.pdf`;
      const res = await uploadPdfToFreeCloud(pdf, fileName);

      if (res?.url) {
        setCloudPdfUrl(res.url);

        // مزامنة المعاينة في الذاكرة فوراً لفتحها بـ 0ms بدون أي إعادة توليد
        setPreviewPdfBlob(pdf);
        if (previewPdfUrl) {
          URL.revokeObjectURL(previewPdfUrl);
        }
        setPreviewPdfUrl(URL.createObjectURL(pdf));

        const syncedSnapshot = JSON.stringify({
          ...JSON.parse(currentSnapshot),
          cloudPdfUrl: res.url,
        });
        setLastGeneratedSnapshot(syncedSnapshot);

        toast.success("تم توثيق ورفع شهادة الضمان وتحديث المعاينة بنجاح! جاهز للمعاينة الفورية 🚀");

        let existingNotesObj: Record<string, any> = {};
        try {
          if (op.notes && op.notes.startsWith("{")) existingNotesObj = JSON.parse(op.notes);
        } catch {}
        existingNotesObj.warrantyCertificate = {
          ...(existingNotesObj.warrantyCertificate || {}),
          ...JSON.parse(currentSnapshot),
          cloudPdfUrl: res.url,
          updatedAt: new Date().toISOString(),
        };
        await api.patch(`/operations/${op.id}`, { notes: JSON.stringify(existingNotesObj) });
        onRefresh();
      }
    } catch (err: any) {
      if (forceReupload) {
        toast.error("فشل الرفع السحابي: " + (err?.response?.data?.message || err?.message || ""));
      }
    } finally {
      setUploadingCloud(false);
    }
  };

  // ━━━ حفظ التعديلات ━━━
  const handleSaveToSystem = async () => {
    const snapToSave = currentSnapshot;
    setSavedSnapshot(snapToSave);
    setSavingWarranty(true);
    toast.success("تم حفظ بيانات شهادة الضمان بنجاح! 💾✨");

    try {
      let existingNotesObj: Record<string, any> = {};
      try {
        if (op.notes && op.notes.startsWith("{")) {
          existingNotesObj = JSON.parse(op.notes);
        } else if (op.notes) {
          existingNotesObj = { textNotes: op.notes };
        }
      } catch {}

      existingNotesObj.warrantyCertificate = {
        ...(existingNotesObj.warrantyCertificate || {}),
        ...JSON.parse(snapToSave),
        cloudPdfUrl,
        printHistory,
        updatedAt: new Date().toISOString(),
      };

      if (!existingNotesObj.letterRegistrationNumbers) {
        existingNotesObj.letterRegistrationNumbers = {};
      }
      existingNotesObj.letterRegistrationNumbers["warranty_certificate"] = registrationNumber;

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(existingNotesObj),
      });
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل الحفظ في السيرفر");
    } finally {
      setSavingWarranty(false);
    }
  };

  // ━━━ الطباعة ━━━
  const executePrintDoc = async () => {
    try {
      toast.info("جاري إعداد شهادة الضمان للطباعة المباشرة...");
      const docx = previewDocxBlob || (await generateWarrantyDocxBlob());
      const pdf = previewPdfBlob || (await getPdfBlobFromDocx(docx, `warranty_${registrationNumber}.docx`));
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

      const currentUser = getCurrentUserName();
      const prev = printHistory["warranty"] || { printCount: 0 };
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
      const updated = { ...printHistory, warranty: newEntry };
      setPrintHistory(updated);

      let existingNotesObj: Record<string, any> = {};
      try {
        if (op.notes && op.notes.startsWith("{")) existingNotesObj = JSON.parse(op.notes);
      } catch {}
      existingNotesObj.warrantyCertificate = {
        ...(existingNotesObj.warrantyCertificate || {}),
        printHistory: updated,
      };
      api.patch(`/operations/${op.id}`, { notes: JSON.stringify(existingNotesObj) }).catch(() => {});
    } catch (err: any) {
      toast.error("فشل تنفيذ الطباعة: " + (err?.message || ""));
    }
  };

  const handlePrintWordDocument = () => {
    const info = printHistory["warranty"];
    if (info && info.printCount > 0) {
      setReprintWarningOpen(true);
      return;
    }
    executePrintDoc();
  };

  const handleViewArchive = () => {
    loadOfficialPreview();
  };

  // ━━━ حالة إضافة شهادة الضمان للأرشيف ━━━
  const [addingToArchive, setAddingToArchive] = useState(false);
  const archiveInfo = useMemo(() => getArchivedLetterInfo(op, "letter-warranty"), [op]);
  const isArchived = archiveInfo.isArchived;

  const handleToggleArchive = async () => {
    setAddingToArchive(true);
    try {
      if (isArchived) {
        let notesObj: any = {};
        try {
          if (op.notes && op.notes.startsWith("{")) notesObj = JSON.parse(op.notes);
        } catch {}
        notesObj.archivedDocIds = (notesObj.archivedDocIds || []).filter((id: string) => id !== "letter-warranty");
        await api.patch(`/operations/${op.id}`, { notes: JSON.stringify(notesObj) });
        toast.success("تمت إزالة شهادة الضمان من مستندات الأرشيف وحزمة التقديم 📂");
      } else {
        toast.info("جاري تجهيز وتوثيق نسخة PDF لشهادة الضمان للأرشيف...");
        const docx = previewDocxBlob || (await generateWarrantyDocxBlob());
        const pdf = previewPdfBlob || (await getPdfBlobFromDocx(docx, `warranty_${registrationNumber}.docx`));
        const res = await saveLetterToArchiveWithVersion({
          op,
          docKey: "letter-warranty",
          title: "شهادة الضمان والصيانة المعتمدة",
          pdfBlob: pdf,
          currentSnapshot,
          docType: "LETTER",
          companyId: selectedCompanyId,
          registrationNumber,
        });
        toast.success(`تمت إضافة شهادة الضمان إلى الأرشيف بنجاح (${res.versionName})! 📦✨`);
      }
      onRefresh();
    } catch (err: any) {
      toast.error("فشل تحديث حالة الأرشيف لشهادة الضمان: " + (err?.message || ""));
    } finally {
      setAddingToArchive(false);
    }
  };

  useEffect(() => {
    if (previewModalOpen && !previewPdfBlob && !renderingDocx) {
      loadOfficialPreview();
    }
  }, [previewModalOpen]);

  const handleDownloadDocx = async () => {
    try {
      const blob = previewDocxBlob || (await generateWarrantyDocxBlob());
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `شهادة_ضمان_${registrationNumber || op.serialNumber}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تحميل مستند Word لشهادة الضمان بنجاح! 📥");
    } catch (err: any) {
      toast.error("فشل تحميل ملف Word: " + (err?.message || ""));
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const docx = previewDocxBlob || (await generateWarrantyDocxBlob());
      const pdf = previewPdfBlob || (await getPdfBlobFromDocx(docx, `warranty_${registrationNumber}.docx`));
      const url = URL.createObjectURL(pdf);
      const a = document.createElement("a");
      a.href = url;
      a.download = `شهادة_ضمان_${registrationNumber || op.serialNumber}.pdf`;
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
      {/* ━━━ SECTION 1: بيانات الشركة المصدرة ━━━ */}
      <SectionCard
        title="1. بيانات الشركة المصدرة لشهادة الضمان وكود العملية ورقم القيد"
        icon={Building2}
        iconColor="text-blue-600"
        actions={
          onGoBackToOffer && (
            <Button
              size="sm"
              variant="outline"
              onClick={onGoBackToOffer}
              className="text-xs font-bold rounded-xl border-border hover:bg-muted"
            >
              ← العودة للعرض الفني (الخطوة 1)
            </Button>
          )
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold text-foreground">الشركة المصدرة للشهادة *</Label>
              <Select
                value={selectedCompanyId}
                onValueChange={(val) => {
                  setSelectedCompanyId(val);
                  const matched = op.companies?.find(
                    (c: any) => c.companyId === val || c.id === val || c.company?.id === val
                  );
                  if (matched) {
                    if (matched.company?.commercialRegister) setCompanyCommercialRegister(matched.company.commercialRegister);
                    if (matched.company?.taxCard) setCompanyTaxCard(matched.company.taxCard);
                    if (matched.company?.name) setCompanyName(matched.company.name);
                    setCompanyOpCode(matched.displayCode || `AZ-0${op.serialNumber || 1}`);
                  }
                }}
              >
                <SelectTrigger className="h-9.5 text-xs font-bold rounded-xl">
                  <SelectValue placeholder="اختر الشركة">
                    {currentCompany?.name
                      ? `${currentCompany.name} (${currentCompanyLink?.displayCode || ""})`
                      : (op.companies?.[0]?.company?.name
                          ? `${op.companies[0].company.name} (${op.companies[0].displayCode || ""})`
                          : "اختر الشركة")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="text-xs font-medium">
                  {(op.companies || []).map((oc: any) => {
                    const compVal = oc.companyId || oc.id;
                    const compName = oc.company?.name || "الشركة";
                    return (
                      <SelectItem key={oc.id || compVal} value={compVal} className="text-xs font-bold">
                        {compName} ({oc.displayCode})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">رقم القيد الصادر بالشهادة *</Label>
                <button
                  type="button"
                  onClick={handleRegenerateRef}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>توليد ذكي</span>
                </button>
              </div>
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

      {/* ━━━ SECTION 2: جهة الإسناد والموضوع ━━━ */}
      <SectionCard
        title="2. جهة الإسناد وبيانات العملية وموعد الجلسة"
        icon={Calendar}
        iconColor="text-indigo-600"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs font-bold text-foreground">لقب المرسل إليه *</Label>
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

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs font-bold text-foreground">شهادة ضمان (للأصناف / للأعمال...) *</Label>
              <Input
                value={subjectTarget}
                onChange={(e) => setSubjectTarget(e.target.value)}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold text-foreground">اسم العملية المسجلة *</Label>
              <Input
                value={operationRegisteredName}
                onChange={(e) => setOperationRegisteredName(e.target.value)}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs font-bold text-foreground">رقم العملية / المناقصة *</Label>
              <Input
                value={operationNumber}
                onChange={(e) => setOperationNumber(e.target.value)}
                className="h-9.5 text-xs font-mono font-bold rounded-xl"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 3: جدول الأصناف المشمولة بالضمان ━━━ */}
      <SectionCard
        title="3. جدول الأصناف المشمولة بشهادة الضمان (مطابق لجدول الوورد 6 أعمدة)"
        icon={Layers}
        iconColor="text-emerald-600"
        badge={
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
            {items.length} أصناف بالشهادة
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            {initialItems && initialItems.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setItems(
                    initialItems.map((item, idx) => ({
                      id: `w-item-${idx + 1}`,
                      itemName: item.itemName || `صنف #${idx + 1}`,
                      unit: item.unit || "عدد",
                      quantity: item.quantity || "1",
                      description: item.variants?.[0]?.description || item.itemName || "",
                      notes: item.variants?.[0]?.notes || "مطابق للمواصفة القياسية",
                    }))
                  );
                  toast.success("تم استيراد ومزامنة الأصناف من العرض الفني بنجاح! 🔄✨");
                }}
                className="text-xs font-bold h-8.5 px-3 rounded-xl border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="h-3 w-3" />
                <span>استيراد الأصناف من العرض الفني</span>
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleAddItem}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8.5 px-3 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>إضافة صنف للضمان</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-xs text-right">
              <thead className="bg-muted/80 text-foreground font-bold border-b border-border">
                <tr>
                  <th className="p-3 text-center w-12">م</th>
                  <th className="p-3 min-w-[200px]">إسم الصنف</th>
                  <th className="p-3 text-center w-20">الوحدة</th>
                  <th className="p-3 text-center w-24">الكمية</th>
                  <th className="p-3 min-w-[220px]">الوصف – الملاحظات الفنية</th>
                  <th className="p-3 min-w-[140px]">ملاحظات الضمان</th>
                  <th className="p-3 text-center w-12">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((it, idx) => (
                  <tr key={it.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-2 text-center font-bold text-muted-foreground">{idx + 1}</td>
                    <td className="p-2">
                      <Input
                        value={it.itemName}
                        onChange={(e) => handleUpdateItem(it.id, "itemName", e.target.value)}
                        placeholder="اسم الصنف المضمون..."
                        className="h-8 text-xs font-bold"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={it.unit}
                        onChange={(e) => handleUpdateItem(it.id, "unit", e.target.value)}
                        placeholder="عدد"
                        className="h-8 text-xs text-center"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={it.quantity}
                        onChange={(e) => handleUpdateItem(it.id, "quantity", e.target.value)}
                        placeholder="1"
                        className="h-8 text-xs text-center font-bold font-mono"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={it.description}
                        onChange={(e) => handleUpdateItem(it.id, "description", e.target.value)}
                        placeholder="المواصفات الفنية وماركة الصنف..."
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={it.notes}
                        onChange={(e) => handleUpdateItem(it.id, "notes", e.target.value)}
                        placeholder="ملاحظات الضمان..."
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.id)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                        title="حذف الصنف"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 4: نص الضمان والشروط والاستثناءات ━━━ */}
      <SectionCard
        title="4. صيغة الضمان والمدة وتغطية العيوب والاستثناءات الرسمية"
        icon={ShieldCheck}
        iconColor="text-amber-600"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-foreground space-y-3">
            <h5 className="font-extrabold text-amber-900 dark:text-amber-300">
              صيغة إقرار الضمان الصادر من الشركة:
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">اسم الشركة الضامنة *</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">نوع الأصناف الموردة *</Label>
                <Input
                  value={suppliedItemsCategory}
                  onChange={(e) => setSuppliedItemsCategory(e.target.value)}
                  placeholder="كاوتش وبطاريات"
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">اختصار اسم الجهة الإدارية *</Label>
                <Input
                  value={authorityShort}
                  onChange={(e) => setAuthorityShort(e.target.value)}
                  placeholder="الجامعه"
                  className="h-8 text-xs rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">طريقة الطرح *</Label>
                <Input
                  value={tenderMethod}
                  onChange={(e) => setTenderMethod(e.target.value)}
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[11px] font-bold text-foreground">نطاق وموضوع التوريد *</Label>
                <Input
                  value={operationScope}
                  onChange={(e) => setOperationScope(e.target.value)}
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">العام المالي *</Label>
                <Input
                  value={fiscalYear}
                  onChange={(e) => setFiscalYear(e.target.value)}
                  className="h-8 text-xs font-mono rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">مدة الضمان *</Label>
              <Input
                value={warrantyDuration}
                onChange={(e) => setWarrantyDuration(e.target.value)}
                placeholder="سنة"
                className="h-9.5 text-xs font-bold rounded-xl"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold text-foreground">شروط وتغطية الضمان *</Label>
              <Input
                value={warrantyCoverage}
                onChange={(e) => setWarrantyCoverage(e.target.value)}
                placeholder="ضد عيوب الصناعه في مداس الكاوتش فقط"
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label className="text-xs font-extrabold text-foreground">
              الحالات التي لا يسري فيها الضمان (البنود الأربعة المعتمدة بالقالب):
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">1. الحالة الأولى:</Label>
                <Input
                  value={case1}
                  onChange={(e) => setCase1(e.target.value)}
                  className="h-8.5 text-xs rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">2. الحالة الثانية:</Label>
                <Input
                  value={case2}
                  onChange={(e) => setCase2(e.target.value)}
                  className="h-8.5 text-xs rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">3. الحالة الثالثة:</Label>
                <Input
                  value={case3}
                  onChange={(e) => setCase3(e.target.value)}
                  className="h-8.5 text-xs rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">4. الحالة الرابعة:</Label>
                <Input
                  value={case4}
                  onChange={(e) => setCase4(e.target.value)}
                  className="h-8.5 text-xs rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">مدة سريان الشهادة *</Label>
              <Input
                value={validityDuration}
                onChange={(e) => setValidityDuration(e.target.value)}
                placeholder="ستة أشهر"
                className="h-9.5 text-xs font-bold rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">ملاحظات الشهادة الإضافية</Label>
              <Input
                value={warrantyNotes}
                onChange={(e) => setWarrantyNotes(e.target.value)}
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 5: التوقيعات ━━━ */}
      <SectionCard
        title="5. التوقيعات الرسمية والاعتماد"
        icon={UserCheck}
        iconColor="text-teal-600"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">المهندس المختص *</Label>
            <Input
              value={engineerSpecialist}
              onChange={(e) => setEngineerSpecialist(e.target.value)}
              className="h-9.5 text-xs rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">المدير المالي *</Label>
            <Input
              value={financeManager}
              onChange={(e) => setFinanceManager(e.target.value)}
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
      </SectionCard>

      {/* ━━━ شريط الإجراءات السفلي ━━━ */}
      <LetterBottomActionWidget
        title="شهادة الضمان المعتمدة للأصناف الموردة"
        registrationNumber={registrationNumber}
        isDirty={isDirty}
        printInfo={printHistory["warranty"]}
        onPreview={() => {
          loadOfficialPreview();
        }}
        onSave={handleSaveToSystem}
        onCancelEdits={() => {
          try {
            const snap = JSON.parse(savedSnapshot);
            setItems(snap.items);
            setWarrantyDuration(snap.warrantyDuration);
            toast.info("تم التراجع عن التعديلات ↺");
          } catch {}
        }}
        saving={savingWarranty}
        onViewArchive={handleViewArchive}
        onAddToArchive={handleToggleArchive}
        isArchived={isArchived}
        addingToArchive={addingToArchive}
        customSubtitle="مطابق 100% لقالب الوورد الرسمي لشهادة الضمان. اضغط على زر المعاينة للاطلاع على المستند وتنزيله أو طباعته."
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
                        معاينة قالب الوورد المعتمد: شهادة ضمان.docx
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
                    documentTitle={`شهادة_ضمان_${registrationNumber || op.serialNumber}.docx`}
                    docxBlob={previewDocxBlob}
                    pdfBlob={previewPdfBlob}
                    onDownloadDocx={handleDownloadDocx}
                    onDownloadPdf={handleDownloadPdf}
                    onPrint={handlePrintWordDocument}
                    onAddToArchive={handleToggleArchive}
                    isArchived={isArchived}
                    addingToArchive={addingToArchive}
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
        printInfo={printHistory["warranty"]}
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

      {/* ━━━ STEP FOOTER NAVIGATION ━━━ */}
      {onNavigate && (
        <StepFooterNav
          currentTabId="warranty_certificate"
          onNavigate={onNavigate}
          nextLabel="الانتقال إلى: #16 التأمين النهائي ➔"
          prevLabel="← أمر التوريد والتعاقد الرسمي"
        />
      )}
    </div>
  );
}
