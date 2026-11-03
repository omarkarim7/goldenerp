"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  FileCheck, ShieldCheck, CheckCircle2, Eye, Printer, Download,
  RefreshCw, Building2, Calendar, Hash, FileText, Check, AlertCircle,
  Copy, ExternalLink, QrCode, Cloud, ArrowRight, X, Sparkles, SlidersHorizontal,
  RotateCcw, Save, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Portal } from "@/components/ui/portal";
import { toast } from "sonner";
import api from "@/lib/api";
import { Operation, SectionCard, formatDate } from "./types";
import { StepFooterNav } from "./StepFooterNav";
import { getArchivedLetterInfo, saveLetterToArchiveWithVersion, loadArchivedPdfBlob } from "./archive-utils";
import {
  generateSmartOutgoingRef,
  cleanAllDocxXml,
  buildQrAnchorXml,
  injectSingleQrIntoDocXml,
  LetterBottomActionWidget,
  ReprintConfirmModal,
  getCurrentUserName,
  PrintHistoryEntry,
  FISCAL_YEAR_OPTIONS,
  LetterQrCloudCard,
  PdfExportLoadingModal,
  getUnifiedOperationRegistrationNumber,
  regenerateUnifiedRegistrationNumber,
  getLetterSpecificRegistrationNumber,
  regenerateLetterSpecificRegistrationNumber,
  FiscalYearSelect,
  getSharedOperationScope,
  replaceDocxScope,
  replaceDocxFiscalAndDate,
  replaceDocxChairman,
  sanitizeChairmanTitle,
  getOperationRecipientTitle,
  getOperationFiscalYear,
  getOperationTechnicalOpeningDate,
  getOperationTenderMethod,
  isValidCloudDocUrl,
  generateHighResDocQrBuffer,
  getStandardDocQrPayload,
  buildOfficialSignaturesTableXml,
  replaceDocxRecipient,
  replaceDocxSignatures,
  replaceDocxAdditionalNotes,
  fetchDocxTemplateArrayBuffer,
  replaceDocxStandardHeaderFooter,
} from "./letter-utils";
import {
  isExellentCompany,
  generateExellentDeclarationSpecsDocx,
  generateExellentDeclarationInsuranceDocx,
} from "./exellent-letter-engine";
import JSZip from "jszip";
import QRCode from "qrcode";
import { getPdfBlobFromDocx, uploadPdfToFreeCloud, getExpectedCloudPdfUrl } from "./client-pdf";
import { OnlyOfficeDocViewer } from "@/components/OnlyOfficeDocViewer";
import { SmartArabicDatePicker } from "@/components/ui/arabic-date-picker";

export type DeclarationType = "specs" | "insurance";

function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function TabDeclarations({
  op,
  onRefresh,
  onNavigate,
  onPreviewDoc,
  onDownloadDoc,
}: {
  op: Operation;
  onRefresh: () => void;
  onNavigate: (tabId: string) => void;
  onPreviewDoc?: (doc: any) => void;
  onDownloadDoc?: (doc: any) => void;
}) {
  // ━━━ قراءة البيانات المحفوظة مسبقاً ━━━
  const savedDec = useMemo(() => {
    try {
      if (op.notes && op.notes.startsWith("{")) {
        const parsed = JSON.parse(op.notes);
        return parsed.declarationsDocx || null;
      }
    } catch {}
    return null;
  }, [op.notes]);

  // التبويب النشط بين الإقرارين
  const [activeDeclType, setActiveDeclType] = useState<DeclarationType>("specs");

  // ━━━ 1. الشركة المصدرة والترويسة والتذييل ━━━
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => {
    return savedDec?.selectedCompanyId || op.companies?.[0]?.companyId || op.companies?.[0]?.id || "";
  });

  const currentCompanyLink = useMemo(() => {
    return (
      op.companies?.find(
        (c: any) => c.companyId === selectedCompanyId || c.id === selectedCompanyId
      ) || op.companies?.[0]
    );
  }, [op.companies, selectedCompanyId]);

  const currentCompany = currentCompanyLink?.company;
  const isEx = isExellentCompany(currentCompanyLink || currentCompany || op);

  // رقم القيد الصادر الذكي الخاص بكل إقرار على حدة
  const [letterRegNumbers, setLetterRegNumbers] = useState<Record<DeclarationType, string>>(() => {
    const saved = savedDec?.letterRegNumbers || {};
    return {
      specs: saved.specs || getLetterSpecificRegistrationNumber(op, "decl_specs", currentCompanyLink?.displayCode, savedDec?.registrationNumber),
      insurance: saved.insurance || getLetterSpecificRegistrationNumber(op, "decl_insurance", currentCompanyLink?.displayCode),
    };
  });

  const registrationNumber = letterRegNumbers[activeDeclType] || getLetterSpecificRegistrationNumber(
    op,
    activeDeclType === "specs" ? "decl_specs" : "decl_insurance",
    currentCompanyLink?.displayCode
  );

  const setRegistrationNumber = (val: string) => {
    setLetterRegNumbers((prev) => ({
      ...prev,
      [activeDeclType]: val,
    }));
  };

  // كود العملية بالشركة
  const [companyOpCode, setCompanyOpCode] = useState(() => {
    return (
      savedDec?.companyOpCode ||
      currentCompanyLink?.displayCode ||
      `AZ-0${op.serialNumber || 1}`
    );
  });

  const [companyCommercialRegister, setCompanyCommercialRegister] = useState(() => {
    return savedDec?.companyCommercialRegister || currentCompany?.commercialRegister || "110200700036620";
  });
  const [companyTaxCard, setCompanyTaxCard] = useState(() => {
    return savedDec?.companyTaxCard || currentCompany?.taxCard || "658369652";
  });
  const [phoneWhatsapp, setPhoneWhatsapp] = useState(() => {
    return savedDec?.phoneWhatsapp || currentCompany?.phone || "01091708818";
  });
  const [phoneMobile, setPhoneMobile] = useState(() => {
    return savedDec?.phoneMobile || "01557018818";
  });
  const [companyAddress, setCompanyAddress] = useState(() => {
    return savedDec?.companyAddress || currentCompany?.address || "بجوار مستشفى ليدى كير  -  بدمنهور -  البحيره";
  });
  const [companyEmail, setCompanyEmail] = useState(() => {
    if (savedDec?.companyEmail) return savedDec.companyEmail;
    if (currentCompany?.email) return currentCompany.email;
    const isEx = isExellentCompany(currentCompanyLink || currentCompany || op);
    return isEx ? "exellentservice@gmail.com" : "goldengolden8818@gmail.com";
  });
  const [companyOtherDetails, setCompanyOtherDetails] = useState(() => {
    return savedDec?.companyOtherDetails || "";
  });
  const [outgoingDate, setOutgoingDate] = useState(() => {
    return savedDec?.outgoingDate || new Date().toLocaleDateString("en-GB");
  });

  // ━━━ 2. جهة الإسناد وبيانات العملية ━━━
  const [recipientPrefix, setRecipientPrefix] = useState(() => {
    return savedDec?.recipientPrefix || "الأستاذ";
  });
  const [recipientTitleAndAuthority, setRecipientTitleAndAuthority] = useState(() => {
    return getOperationRecipientTitle(op, savedDec?.recipientTitleAndAuthority);
  });

  const [operationRegisteredName, setOperationRegisteredName] = useState(() => {
    return savedDec?.operationRegisteredName || op.name || "";
  });
  const [operationNumber, setOperationNumber] = useState(() => {
    return savedDec?.operationNumber || op.externalNumber || (op.serialNumber ? String(op.serialNumber) : "") || "";
  });
  const [tenderMethod, setTenderMethod] = useState(() => {
    return savedDec?.tenderMethod || getOperationTenderMethod(op);
  });
  const [operationScope, setOperationScope] = useState(() => {
    return getSharedOperationScope(op, savedDec?.operationScope);
  });
  const [fiscalYear, setFiscalYear] = useState(() => {
    return getOperationFiscalYear(op, savedDec?.fiscalYear);
  });
  const [technicalOpeningDate, setTechnicalOpeningDate] = useState(() => {
    return getOperationTechnicalOpeningDate(op, savedDec?.technicalOpeningDate);
  });

  // اسم الشركة المقرة بصدر الإقرار
  const [declaringCompanyName, setDeclaringCompanyName] = useState(() => {
    if (savedDec?.declaringCompanyName) return savedDec.declaringCompanyName;
    return isEx
      ? "اكسلانت سرفيس للنظافه والصيانه والنقل والخدمات والتوريدات"
      : (currentCompany?.name || "شركة جولدن سرفيس");
  });

  // نصوص وصيغ الالتزام وعناوين التمهيد بالإقرارات
  const [specsCommitment, setSpecsCommitment] = useState(() => {
    return (
      savedDec?.specsCommitment ||
      "بكل ما جاء بكراسة الشروط والمواصفات وتوضح"
    );
  });
  const [insuranceCommitment, setInsuranceCommitment] = useState(() => {
    return (
      savedDec?.insuranceCommitment ||
      "بسداد نسبة التأمينات على المقاولات والعماله الغير منتظمه وحسن التعامل مع العاملين بالشركة وعدم التفرقه بينهم"
    );
  });
  const [specsPreambleTitle, setSpecsPreambleTitle] = useState(() => {
    return (
      savedDec?.specsPreambleTitle ||
      "إقرار الإلتزام بكراسة الشروط والمواصفات"
    );
  });
  const [insurancePreambleTitle, setInsurancePreambleTitle] = useState(() => {
    return (
      savedDec?.insurancePreambleTitle ||
      "إقرار الإلتزام بالتأمينات والعماله الغير منتظمه والمساواه بين العاملين"
    );
  });

  // مزامنة تلقائية للبيانات إذا تغيرت العملية دون وجود تعديل يدوي محفوظ
  useEffect(() => {
    if (!savedDec?.operationRegisteredName && op.name) {
      setOperationRegisteredName(op.name);
    }
    if (!savedDec?.operationScope && (op.name || (op as any).description)) {
      setOperationScope(getSharedOperationScope(op));
    }
    if (!savedDec?.operationNumber && (op.externalNumber || op.serialNumber)) {
      setOperationNumber(op.externalNumber || String(op.serialNumber));
    }
    if (!savedDec?.recipientTitleAndAuthority && op.authority) {
      setRecipientTitleAndAuthority(`مدير الادارة العامة للمشتريات والمخازن بـ ${op.authority}`);
    }
    if (!savedDec?.technicalOpeningDate) {
      setTechnicalOpeningDate(getOperationTechnicalOpeningDate(op));
    }
  }, [op.name, op.externalNumber, op.serialNumber, op.authority, op.dates, savedDec]);

  // مزامنة تلقائية لبيانات الشركة (السجل التجاري والبطاقة الضريبية والكود) عند اختيارها
  useEffect(() => {
    if (currentCompanyLink || currentCompany) {
      if (currentCompany?.commercialRegister) {
        setCompanyCommercialRegister(currentCompany.commercialRegister);
      }
      if (currentCompany?.taxCard) {
        setCompanyTaxCard(currentCompany.taxCard);
      }
      if (currentCompany?.phone) {
        setPhoneWhatsapp(currentCompany.phone);
      }
      if (currentCompany?.mobile) {
        setPhoneMobile(currentCompany.mobile);
      }
      if (currentCompany?.address) {
        setCompanyAddress(currentCompany.address);
      }
      if (currentCompany?.email) {
        setCompanyEmail(currentCompany.email);
      }
      if (currentCompanyLink?.displayCode) {
        setCompanyOpCode(currentCompanyLink.displayCode);
      }
      if (isEx && (!savedDec?.declaringCompanyName || declaringCompanyName.includes("جولدن"))) {
        setDeclaringCompanyName("اكسلانت سرفيس للنظافه والصيانه والنقل والخدمات والتوريدات");
      }
    }
  }, [currentCompany, currentCompanyLink, isEx]);

  // ━━━ 3. التوقيعات والاعتمادات والملاحظات ━━━
  const [specialistTitle, setSpecialistTitle] = useState(() => {
    return savedDec?.specialistTitle || "المختص :";
  });
  const [specialistName, setSpecialistName] = useState(() => {
    return savedDec?.specialistName || "";
  });
  const [financeManagerName, setFinanceManagerName] = useState(() => {
    return savedDec?.financeManagerName || "";
  });
  const [boardChairman, setBoardChairman] = useState(() => {
    return sanitizeChairmanTitle(savedDec?.boardChairman);
  });
  const [additionalNotes, setAdditionalNotes] = useState(() => {
    return savedDec?.additionalNotes || "";
  });

  // ━━━ 4. الروابط السحابية لرمز QR (Cloudflare R2 / Gofile) ━━━
  const cleanCloudUrl = (u?: string) => {
    return isValidCloudDocUrl(u) ? (u || "") : "";
  };
  const [cloudPdfUrlSpecs, setCloudPdfUrlSpecs] = useState<string>(() => cleanCloudUrl(savedDec?.cloudPdfUrlSpecs));
  const [cloudPdfUrlInsurance, setCloudPdfUrlInsurance] = useState<string>(() => cleanCloudUrl(savedDec?.cloudPdfUrlInsurance));
  const [uploadingCloud, setUploadingCloud] = useState(false);
  const [lastGeneratedSnapshot, setLastGeneratedSnapshot] = useState<string | null>(null);
  const [lastUploadedSnapshotSpecs, setLastUploadedSnapshotSpecs] = useState<string | null>(() => {
    return savedDec?.lastUploadedSnapshotSpecs || (savedDec?.cloudPdfUrlSpecs ? "uploaded_initial" : null);
  });
  const [lastUploadedSnapshotInsurance, setLastUploadedSnapshotInsurance] = useState<string | null>(() => {
    return savedDec?.lastUploadedSnapshotInsurance || (savedDec?.cloudPdfUrlInsurance ? "uploaded_initial" : null);
  });

  // Modals & Document state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDocxBlob, setPreviewDocxBlob] = useState<Blob | null>(null);
  const [previewPdfBlob, setPreviewPdfBlob] = useState<Blob | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [renderingDocx, setRenderingDocx] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [printingDocx, setPrintingDocx] = useState(false);
  const [savingState, setSavingState] = useState(false);

  // ━━━ تتبع حالة التعديل والحفظ (isDirty control) ━━━
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
      companyEmail,
      companyOtherDetails,
      outgoingDate,
      recipientPrefix,
      recipientTitleAndAuthority,
      operationRegisteredName,
      operationNumber,
      tenderMethod,
      operationScope,
      fiscalYear,
      technicalOpeningDate,
      declaringCompanyName,
      specsCommitment,
      insuranceCommitment,
      specsPreambleTitle,
      insurancePreambleTitle,
      specialistTitle,
      specialistName,
      financeManagerName,
      boardChairman,
      additionalNotes,
      cloudPdfUrlSpecs,
      cloudPdfUrlInsurance,
    });
  }, [
    selectedCompanyId, registrationNumber, companyOpCode, companyCommercialRegister,
    companyTaxCard, phoneWhatsapp, phoneMobile, companyAddress, companyEmail, companyOtherDetails,
    outgoingDate, recipientPrefix, recipientTitleAndAuthority, operationRegisteredName,
    operationNumber, tenderMethod, operationScope, fiscalYear, technicalOpeningDate,
    declaringCompanyName, specsCommitment, insuranceCommitment, specsPreambleTitle, insurancePreambleTitle,
    specialistTitle, specialistName, financeManagerName, boardChairman, additionalNotes,
    cloudPdfUrlSpecs, cloudPdfUrlInsurance,
  ]);

  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => currentSnapshot);
  const isDirty = useMemo(() => currentSnapshot !== savedSnapshot, [currentSnapshot, savedSnapshot]);

  const handleCancelEdits = () => {
    try {
      const snap = JSON.parse(savedSnapshot);
      setSelectedCompanyId(snap.selectedCompanyId);
      setRegistrationNumber(snap.registrationNumber);
      setCompanyOpCode(snap.companyOpCode);
      setCompanyCommercialRegister(snap.companyCommercialRegister);
      setCompanyTaxCard(snap.companyTaxCard);
      setPhoneWhatsapp(snap.phoneWhatsapp);
      setPhoneMobile(snap.phoneMobile);
      setCompanyAddress(snap.companyAddress);
      setCompanyEmail(snap.companyEmail);
      setCompanyOtherDetails(snap.companyOtherDetails || "");
      setOutgoingDate(snap.outgoingDate);
      setRecipientPrefix(snap.recipientPrefix);
      setRecipientTitleAndAuthority(snap.recipientTitleAndAuthority);
      setOperationRegisteredName(snap.operationRegisteredName);
      setOperationNumber(snap.operationNumber);
      setTenderMethod(snap.tenderMethod);
      setOperationScope(snap.operationScope);
      setFiscalYear(snap.fiscalYear);
      setTechnicalOpeningDate(snap.technicalOpeningDate);
      if (snap.declaringCompanyName) setDeclaringCompanyName(snap.declaringCompanyName);
      if (snap.specsCommitment) setSpecsCommitment(snap.specsCommitment);
      if (snap.insuranceCommitment) setInsuranceCommitment(snap.insuranceCommitment);
      if (snap.specsPreambleTitle) setSpecsPreambleTitle(snap.specsPreambleTitle);
      if (snap.insurancePreambleTitle) setInsurancePreambleTitle(snap.insurancePreambleTitle);
      setSpecialistTitle(snap.specialistTitle);
      setSpecialistName(snap.specialistName);
      setFinanceManagerName(snap.financeManagerName);
      setBoardChairman(sanitizeChairmanTitle(snap.boardChairman));
      setAdditionalNotes(snap.additionalNotes);
      setCloudPdfUrlSpecs(snap.cloudPdfUrlSpecs);
      setCloudPdfUrlInsurance(snap.cloudPdfUrlInsurance);
      toast.info("تم التراجع عن التعديلات وإعادة الإقرارات للحالة السابقة ↺");
    } catch {
      toast.error("تعذر التراجع عن التعديلات");
    }
  };

  const handleDirectPrint = () => {
    if (isDirty) {
      toast.warning("يجب حفظ التعديلات أولاً قبل الطباعة!");
      return;
    }
    window.print();
  };

  // الرابط السحابي النشط بحسب الإقرار المختار
  const currentCloudUrl =
    activeDeclType === "specs"
      ? cloudPdfUrlSpecs
      : cloudPdfUrlInsurance;

  const activeUploadedSnapshot = activeDeclType === "specs" ? lastUploadedSnapshotSpecs : lastUploadedSnapshotInsurance;
  const isCloudStale = useMemo(() => {
    if (!currentCloudUrl) return false;
    if (!activeUploadedSnapshot) return false;
    if (activeUploadedSnapshot === "uploaded_initial") return false;
    return activeUploadedSnapshot !== currentSnapshot;
  }, [currentCloudUrl, activeUploadedSnapshot, currentSnapshot]);

  // إعادة توليد رقم القيد الخاص بالإقرار المختار
  const handleRegenerateRef = async () => {
    const letterKey = activeDeclType === "specs" ? "decl_specs" : "decl_insurance";
    await regenerateLetterSpecificRegistrationNumber({
      op,
      letterKey,
      companyCode: currentCompanyLink?.displayCode || "AZ",
      onSuccess: (fresh) => {
        setRegistrationNumber(fresh);
        onRefresh();
      },
    });
  };

  // ━━━ محرك استبدال المتغيرات في قوالب الإقرارات الرسمية ━━━
  const generateDeclarationDocxBlob = async (type: DeclarationType = activeDeclType): Promise<Blob> => {
    // ━━━ المسار المخصص المستقل لشركة إكسلنت (B) ━━━
    const isB = isExellentCompany(currentCompanyLink || currentCompany || op);
    if (isB) {
      let qrBinary: Uint8Array | undefined = undefined;
      try {
        const activeCloud = type === "specs" ? cloudPdfUrlSpecs : cloudPdfUrlInsurance;
        const docTitle = type === "specs" ? "إقرار المواصفات الفنية والشروط" : "إقرار الالتزام بالتأمينات والعمالة والمساواة";
        const filename = `declaration_${type}_${registrationNumber || op.serialNumber || "doc"}.pdf`;
        const qrPayload = await getStandardDocQrPayload(
          activeCloud,
          registrationNumber,
          docTitle,
          currentCompany?.name || "إكسلنت سرفيس",
          filename
        );
        qrBinary = await generateHighResDocQrBuffer(qrPayload);
      } catch (e) {
        console.warn("QR generation failed for Exellent declaration:", e);
      }

      if (type === "specs") {
        return await generateExellentDeclarationSpecsDocx({
          recipientPrefix,
          recipientTitleAndAuthority,
          preambleTitle: specsPreambleTitle,
          operationRegisteredName,
          operationNumber,
          companyName: declaringCompanyName || "اكسلانت سرفيس للنظافه والصيانه والنقل والخدمات والتوريدات",
          commitmentDetails: specsCommitment,
          tenderMethod,
          operationScope,
          fiscalYear,
          technicalOpeningDate,
          additionalNotes,
          specialistName,
          financeManagerName,
          boardChairman,
          companyCommercialRegister,
          companyTaxCard,
          companyOpCode,
          outgoingDate,
          registrationNumber,
          companyAddress,
          phoneWhatsapp,
          phoneMobile,
          companyEmail: companyEmail || currentCompany?.email,
          companyOtherDetails: companyOtherDetails || "",
          qrBinary,
        });
      } else {
        return await generateExellentDeclarationInsuranceDocx({
          recipientPrefix,
          recipientTitleAndAuthority,
          preambleTitle: insurancePreambleTitle,
          operationRegisteredName,
          operationNumber,
          companyName: declaringCompanyName || "اكسلانت سرفيس للنظافه والصيانه والنقل والخدمات والتوريدات",
          commitmentDetails: insuranceCommitment,
          tenderMethod,
          operationScope,
          fiscalYear,
          technicalOpeningDate,
          additionalNotes,
          specialistName,
          financeManagerName,
          boardChairman,
          companyCommercialRegister,
          companyTaxCard,
          companyOpCode,
          outgoingDate,
          registrationNumber,
          companyAddress,
          phoneWhatsapp,
          phoneMobile,
          companyEmail: companyEmail || currentCompany?.email,
          companyOtherDetails: companyOtherDetails || "",
          qrBinary,
        });
      }
    }

    // ━━━ المسار المعتمد الأصلي لشركة جولدن (A) ━━━
    const templateFile =
      type === "specs"
        ? "declaration_specs_template.docx"
        : "declaration_insurance_template.docx";

    const templateBuffer = await fetchDocxTemplateArrayBuffer(templateFile, currentCompanyLink || currentCompany || op);
    const zip = await JSZip.loadAsync(templateBuffer);

    let qrDrawingXml = "";
    let qrBinary: Uint8Array | undefined = undefined;
    try {
      let activeCloud =
        type === "specs"
          ? cloudPdfUrlSpecs
          : cloudPdfUrlInsurance;

      const docTitle =
        type === "specs"
          ? "إقرار المواصفات الفنية والشروط"
          : "إقرار سداد وقيمة التأمين الابتدائي";

      const filename = `declaration_${type}_${registrationNumber || op.serialNumber || "doc"}.pdf`;
      const qrPayload = await getStandardDocQrPayload(
        activeCloud,
        registrationNumber,
        docTitle,
        currentCompany?.name || "المجموعة الذهبية",
        filename
      );
      qrBinary = await generateHighResDocQrBuffer(qrPayload);

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
      console.warn("QR generation failed in TabDeclarations:", e);
    }


    // 1. استبدال كافة المتغيرات في word/document.xml
    let docXml = await zip.file("word/document.xml")!.async("text");
    docXml = injectSingleQrIntoDocXml(docXml, qrDrawingXml, escapeXml(registrationNumber));

    // لقب وصفة المرسل إليه
    docXml = replaceDocxRecipient(docXml, recipientPrefix, recipientTitleAndAuthority);

    // ━━━ استبدال فقرة الموضوع / التمهيد لقالب جولدن ━━━
    const goldenPreamble = (type === "specs" ? specsPreambleTitle : insurancePreambleTitle) || (type === "specs" ? "إقرار الالتزام بكراسة الشروط والمواصفات" : "إقرار الالتزام بالتأمينات والعمالة والمساواة");
    const goldenSubjPattern = /<w:p\b(?:(?!<\/w:p>)[\s\S])*?الموضوع\s*بخصوص[\s\S]*?<\/w:p>/;
    if (goldenSubjPattern.test(docXml)) {
      const subjectXml = `<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="both"/><w:rPr><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">الموضوع بخصوص : ${escapeXml(goldenPreamble)}  لعملية  ${escapeXml(operationRegisteredName)}  رقم ${escapeXml(operationNumber)}</w:t></w:r></w:p>`;
      docXml = docXml.replace(goldenSubjPattern, subjectXml);
    } else {
      docXml = docXml.replace(/اسم العملية المسجله[\s\.]*/g, escapeXml(operationRegisteredName) + " ");
      docXml = docXml.replace(/365/g, escapeXml(operationNumber));
    }

    // ━━━ استبدال متن الإقرار الرئيسي لبقاء كافة الجمل والكلمات بدقة 100% ━━━
    const goldenCompany = declaringCompanyName || currentCompany?.name || "شركة جولدن سرفيس للخدمات العامة والتوريدات";
    const goldenCommitment = type === "specs"
      ? (specsCommitment || "بكل ما جاء بكراسة الشروط والمواصفات")
      : (insuranceCommitment || "بسداد نسبة التأمينات على المقاولات والعماله الغير منتظمه وحسن التعامل مع العاملين بالشركة وعدم التفرقه بينهم");
    const goldenDeclPattern = /<w:p\b(?:(?!<\/w:p>)[\s\S])*?تقر[\s\S]*?<\/w:p>/;
    if (goldenDeclPattern.test(docXml)) {
      const goldenDeclXml =
        `<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="both"/><w:rPr><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr></w:pPr>` +
        `<w:r><w:rPr><w:rFonts w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/><w:lang w:bidi="ar-EG"/></w:rPr><w:t xml:space="preserve">  تقر ${escapeXml(goldenCompany)} بأنها ملتزمه ${escapeXml(goldenCommitment)} وذلك في ${escapeXml(tenderMethod)} وطبيعتها  ${escapeXml(operationScope)} طرفكم للعام المالى  ${escapeXml(fiscalYear)}   والمحدد  لها جلسة ${escapeXml(technicalOpeningDate)} لفتح المظروف الفنى .</w:t></w:r></w:p>`;
      docXml = docXml.replace(goldenDeclPattern, goldenDeclXml);
    } else {
      if (declaringCompanyName) {
        docXml = docXml.replace(/شركة\s+جولدن\s+سرفيس/g, escapeXml(declaringCompanyName));
      }
      docXml = replaceDocxScope(docXml, operationScope);
      docXml = replaceDocxFiscalAndDate(docXml, fiscalYear, technicalOpeningDate);
    }

    // التوقيعات والاعتمادات بأسفل الصفحة لكلا الشركتين
    docXml = replaceDocxSignatures(docXml, {
      specialistTitle: specialistTitle || "المختص :",
      specialistName: specialistName || " ",
      financeManagerTitle: "المدير العام",
      financeManagerName: financeManagerName || " ",
      chairmanTitle: "يعتمد ،،،،،،",
      chairmanName: boardChairman || "رئيس مجلس الإدارة",
    });

    // خانة الملاحظات الإضافية (حذف تام عند الفراغ لمنع ظهور نقاط وهمية)
    docXml = replaceDocxAdditionalNotes(docXml, additionalNotes);

    // إزالة علامات التمييز والألوان الحمراء
    docXml = docXml.replace(/<w:highlight\s+[^>]*\/>/g, "");
    docXml = docXml.replace(/<w:color\s+w:val=\"(red|FF0000)\"[^>]*\/>/g, "");

    zip.file("word/document.xml", docXml);

    // 2. ترويسات وتذييلات الصفحة (للشركتين جولدن وإكسلنت وحقن الباركود في الهيدر)
    await replaceDocxStandardHeaderFooter(zip, {
      companyCommercialRegister,
      companyTaxCard,
      companyOpCode,
      outgoingDate,
      registrationNumber,
      companyAddress,
      phoneWhatsapp,
      phoneMobile,
      companyEmail,
      qrBinary,
    });

    // تفريغ كافة التحديدات الحمراء في سائر ملفات القالب
    // إزالة كافة علامات التحديد الأحمر والعلامات المائية والصور التالفة
    await cleanAllDocxXml(zip);

    return await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  };

  // ━━━ تحويل المستند الأصلي إلى PDF ذكي وفوري ━━━
  const generateDeclarationPdfBlob = async (type: DeclarationType = activeDeclType): Promise<Blob> => {
    const docxBlob = await generateDeclarationDocxBlob(type);
    setPreviewDocxBlob(docxBlob);
    const pdf = await getPdfBlobFromDocx(docxBlob, `declaration_${type}_${registrationNumber}.docx`);
    setPreviewPdfBlob(pdf);
    return pdf;
  };

  // ━━━ رفع وتوثيق النسخة الرقمية المعتمدة سحابياً (Catbox.moe / Gofile.io) ━━━
  const handleUploadToCloud = async (type: DeclarationType = activeDeclType, forceReupload = false, existingBlob?: Blob) => {
    const existingUrl =
      type === "specs"
        ? cloudPdfUrlSpecs
        : cloudPdfUrlInsurance;
    if (existingUrl && !existingUrl.includes("tmpfiles") && !existingUrl.includes("tmpfile") && !existingUrl.includes("catbox") && !forceReupload) {
      toast.info("تم رفع وتوثيق هذا المستند سحابياً مسبقاً وهو نشط بالفعل ✓");
      return;
    }

    setUploadingCloud(true);
    try {
      toast.info("جاري توثيق ورفع الإقرار سحابياً (رابط PDF مباشر)...");
      let pdfBlob = existingBlob;
      if (!pdfBlob || forceReupload) {
        pdfBlob = await generateDeclarationPdfBlob(type);
      }

      const res = await uploadPdfToFreeCloud(
        pdfBlob,
        `declaration_${type}_${registrationNumber || op.serialNumber}.pdf`
      );

      if (res?.url) {
        const nextSpecs = type === "specs" ? res.url : cloudPdfUrlSpecs;
        const nextIns = type === "insurance" ? res.url : cloudPdfUrlInsurance;

        if (type === "specs") {
          setCloudPdfUrlSpecs(res.url);
          setLastUploadedSnapshotSpecs(currentSnapshot);
        } else {
          setCloudPdfUrlInsurance(res.url);
          setLastUploadedSnapshotInsurance(currentSnapshot);
        }

        // مزامنة المعاينة في الذاكرة فوراً لفتحها بـ 0ms بدون أي إعادة توليد
        setPreviewPdfBlob(pdfBlob);
        if (previewPdfUrl) {
          URL.revokeObjectURL(previewPdfUrl);
        }
        setPreviewPdfUrl(URL.createObjectURL(pdfBlob));

        const syncedSnapshot = JSON.stringify({
          selectedCompanyId,
          registrationNumber,
          companyOpCode,
          companyCommercialRegister,
          companyTaxCard,
          phoneWhatsapp,
          phoneMobile,
          companyAddress,
          companyEmail,
          outgoingDate,
          recipientPrefix,
          recipientTitleAndAuthority,
          operationRegisteredName,
          operationNumber,
          tenderMethod,
          operationScope,
          fiscalYear,
          technicalOpeningDate,
          specialistTitle,
          specialistName,
          financeManagerName,
          boardChairman,
          additionalNotes,
          cloudPdfUrlSpecs: nextSpecs,
          cloudPdfUrlInsurance: nextIns,
        });
        setLastGeneratedSnapshot(syncedSnapshot);

        toast.success("تم توثيق ورفع الإقرار وتحديث المعاينة بنجاح! جاهز للمعاينة الفورية 🚀");

        // حفظ في notes العملية تلقائياً
        try {
          let existingNotesObj: any = {};
          if (op.notes && op.notes.startsWith("{")) existingNotesObj = JSON.parse(op.notes);
          else if (op.notes) existingNotesObj = { textNotes: op.notes };
          if (!existingNotesObj.declarationsDocx) existingNotesObj.declarationsDocx = {};
          if (type === "specs") {
            existingNotesObj.declarationsDocx.cloudPdfUrlSpecs = res.url;
            existingNotesObj.declarationsDocx.lastUploadedSnapshotSpecs = currentSnapshot;
          } else {
            existingNotesObj.declarationsDocx.cloudPdfUrlInsurance = res.url;
            existingNotesObj.declarationsDocx.lastUploadedSnapshotInsurance = currentSnapshot;
          }
          await api.patch(`/operations/${op.id}`, { notes: JSON.stringify(existingNotesObj) });
        } catch (e) {
          console.warn("Failed to auto-save cloud url:", e);
        }
      }
    } catch (err: any) {
      if (forceReupload) {
        toast.error("فشل الرفع السحابي: " + (err?.response?.data?.message || err?.message || ""));
      }
    } finally {
      setUploadingCloud(false);
    }
  };

  // تحميل المعاينة الرسمية من محرك Word الأصيل
  const loadOfficialPreview = async (forceRefresh = false) => {
    // 1. فتح نافذة المعاينة فوراً للمستخدم
    setPreviewModalOpen(true);

    // 2. إذا كان المستند مولداً ومطابقاً لآخر تعديل بدون أي تغيير -> فتح فوري بـ 0ms
    if (!forceRefresh && previewPdfBlob && currentSnapshot === lastGeneratedSnapshot) {
      return;
    }

    // 2.1 إذا كان المستند محفوظاً ومؤرشفاً بالعملية ولم يتم تعديل الحقول -> تحميل فوري ومباشر من الأرشيف (فقط قبل أي توليد أو حفظ حديث)
    const docKey = activeDeclType === "specs" ? "decl-specs" : activeDeclType === "insurance" ? "decl-insurance" : "decl-general";
    if (!forceRefresh && !isDirty && !previewPdfBlob && !lastGeneratedSnapshot) {
      try {
        const cached = await loadArchivedPdfBlob(op, docKey);
        if (cached?.blob) {
          setPreviewPdfBlob(cached.blob);
          setLastGeneratedSnapshot(currentSnapshot);
          toast.success(`تم فتح النسخة المؤرشفة مباشرة (نسخة رقم ${cached.version}) ⚡`);
          return;
        }
      } catch (err) {
        console.warn("Could not load cached archive pdf:", err);
      }
    }

    // منع أي تحويل مزدوج متزامن
    if (renderingDocx) {
      return;
    }

    setRenderingDocx(true);
    if (forceRefresh) {
      toast.info("جاري تحديث المعاينة الرسمية...");
    }
    try {
      const docx = await generateDeclarationDocxBlob(activeDeclType);
      setPreviewDocxBlob(docx);

      const pdfBlob = await getPdfBlobFromDocx(docx, `declaration_${activeDeclType}_${registrationNumber}.docx`);
      setPreviewPdfBlob(pdfBlob);
      const url = URL.createObjectURL(pdfBlob);
      setPreviewPdfUrl(url);

      setLastGeneratedSnapshot(currentSnapshot);

      // رفع تلقائي فوري لسحابة Cloudflare R2 حصرياً لضمان توفر الملف دائماً عند مسح الباركود
      const cloudFilename = `declaration_${activeDeclType}_${registrationNumber || op.serialNumber || "doc"}.pdf`;
      uploadPdfToFreeCloud(pdfBlob, cloudFilename).then(async (res) => {
        if (res?.url) {
          if (activeDeclType === "specs") {
            setCloudPdfUrlSpecs(res.url);
            setLastUploadedSnapshotSpecs(currentSnapshot);
          } else {
            setCloudPdfUrlInsurance(res.url);
            setLastUploadedSnapshotInsurance(currentSnapshot);
          }
          try {
            let nObj: any = {};
            if (op.notes && op.notes.startsWith("{")) nObj = JSON.parse(op.notes);
            if (!nObj.declarationsLetter) nObj.declarationsLetter = {};
            nObj.declarationsLetter[`cloudPdfUrl_${activeDeclType}`] = res.url;
            await api.patch(`/operations/${op.id}`, { notes: JSON.stringify(nObj) });
          } catch (e) {}
        }
      }).catch((e) => console.warn("Background upload failed:", e));

      if (forceRefresh) {
        toast.success("تم تحديث المعاينة بنجاح ✓");
      }
    } catch (err: any) {
      console.error("فشل تجهيز المعاينة:", err);
      toast.error("تعذر تجهيز المعاينة: " + (err?.message || ""));
    } finally {
      setRenderingDocx(false);
    }
  };

  // ━━━ سجل الطباعة وتنبيه إعادة الطباعة ━━━
  const [printHistory, setPrintHistory] = useState<Record<string, PrintHistoryEntry>>(() => {
    let notesObj: any = {};
    if (op.notes && op.notes.startsWith("{")) {
      try { notesObj = JSON.parse(op.notes); } catch (e) {}
    }
    return notesObj.declarationsDocx?.printHistory || notesObj.declarationsLetter?.printHistory || {};
  });
  const [reprintWarningOpen, setReprintWarningOpen] = useState(false);

  // ━━━ دالة تنفيذ الطباعة وتحديث سجل الطباعة الرسمي ━━━
  const executePrintDoc = async () => {
    setPrintingDocx(true);
    try {
      toast.info("جاري تجهيز مستند الإقرار للطباعة بأعلى دقة...");
      const pdfBlob = previewPdfBlob || (await generateDeclarationPdfBlob(activeDeclType));
      const pdfUrl = URL.createObjectURL(pdfBlob);

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.src = pdfUrl;
      document.body.appendChild(iframe);

      const triggerPrint = () => {
        iframe.focus();
        try {
          iframe.contentWindow?.print();
        } catch {
          window.open(pdfUrl, "_blank")?.print();
        }
      };

      iframe.onload = () => setTimeout(triggerPrint, 350);
      setTimeout(triggerPrint, 1500);

      const currentUser = getCurrentUserName();
      const prev = printHistory[activeDeclType] || { printCount: 0 };
      const updatedHistory = {
        ...printHistory,
        [activeDeclType]: {
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
        },
      };
      setPrintHistory(updatedHistory);

      // رفع فوري سحابياً في الخلفية لضمان عمل رمز الـ QR فور طباعته ومنع خطأ NoSuchKey نهائياً
      // رفع فوري سحابياً دائماً بدون شروط
      uploadPdfToFreeCloud(
          pdfBlob,
          `declaration_${activeDeclType}_${registrationNumber || op.serialNumber}.pdf`
        ).then(async (res) => {
          if (res?.url) {
            if (activeDeclType === "specs") {
              setCloudPdfUrlSpecs(res.url);
              setLastUploadedSnapshotSpecs(currentSnapshot);
            } else {
              setCloudPdfUrlInsurance(res.url);
              setLastUploadedSnapshotInsurance(currentSnapshot);
            }
            try {
              let nObj: any = {};
              if (op.notes && op.notes.startsWith("{")) nObj = JSON.parse(op.notes);
              if (!nObj.declarationsDocx) nObj.declarationsDocx = {};
              if (activeDeclType === "specs") {
                nObj.declarationsDocx.cloudPdfUrlSpecs = res.url;
                nObj.declarationsDocx.lastUploadedSnapshotSpecs = currentSnapshot;
              } else {
                nObj.declarationsDocx.cloudPdfUrlInsurance = res.url;
                nObj.declarationsDocx.lastUploadedSnapshotInsurance = currentSnapshot;
              }
              await api.patch(`/operations/${op.id}`, { notes: JSON.stringify(nObj) });
            } catch (e) {}
          }
        }).catch((e) => console.warn("Auto background upload on print:", e));

      try {
        let notesObj: any = {};
        if (op.notes && op.notes.startsWith("{")) {
          notesObj = JSON.parse(op.notes);
        }
        const existingDec = notesObj.declarationsDocx || {};
        existingDec.printHistory = updatedHistory;
        notesObj.declarationsDocx = existingDec;
        await api.patch(`/operations/${op.id}`, { notes: JSON.stringify(notesObj) });
        onRefresh();
      } catch (e) {
        console.warn("Could not persist print history:", e);
      }

      if (!currentCloudUrl || currentCloudUrl.includes("tmpfiles") || currentCloudUrl.includes("tmpfile") || currentCloudUrl.includes("catbox")) {
        handleUploadToCloud(activeDeclType, false, pdfBlob).catch(() => {});
      }

      toast.success("تم إرسال المستند للطباعة وتحديث سجل الطباعة بنجاح ✓");
    } catch (err: any) {
      toast.error("فشل تجهيز الطباعة: " + (err?.message || ""));
    } finally {
      setPrintingDocx(false);
    }
  };

  // ━━━ طباعة مستند الوورد الأصلي مع التحقق من الطباعة السابقة ━━━
  const handlePrintWordDocument = async () => {
    if (isDirty) {
      toast.warning("يجب حفظ التعديلات أولاً قبل الطباعة!");
      return;
    }
    const currentInfo = printHistory[activeDeclType];
    if (currentInfo && currentInfo.printCount > 0) {
      setReprintWarningOpen(true);
      return;
    }
    await executePrintDoc();
  };

  const handleConfirmReprint = async () => {
    setReprintWarningOpen(false);
    await executePrintDoc();
  };

  // ━━━ دالة عرض الملف المؤرشف فوراً (0ms) بدون إعادة تحويل ━━━
  const handleViewArchive = () => {
    setPreviewModalOpen(true);
    loadOfficialPreview(false);
  };

  // تنزيل ملف Word (.docx)
  const handleDownloadDocx = async (type: DeclarationType = activeDeclType) => {
    const declName =
      type === "specs"
        ? "إقرار_الالتزام_بكراسة_الشروط"
        : type === "insurance"
        ? "إقرار_التأمينات_والعمالة"
        : "خطاب_عام_رسمي";

    if (previewDocxBlob && currentSnapshot === lastGeneratedSnapshot && type === activeDeclType) {
      const url = URL.createObjectURL(previewDocxBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${declName}_${op.serialNumber || "365"}_${registrationNumber}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل ملف الوورد فوراً! 📄✨");
      return;
    }

    setDownloadingDocx(true);
    try {
      const blob = await generateDeclarationDocxBlob(type);
      setPreviewDocxBlob(blob);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${declName}_${op.serialNumber || "365"}_${registrationNumber}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل ملف الوورد الأصلي المعتمد بنجاح! 📄✨");
    } catch (err: any) {
      toast.error("فشل تنزيل ملف الوورد: " + (err?.message || ""));
    } finally {
      setDownloadingDocx(false);
    }
  };

  // تنزيل ملف PDF
  const handleDownloadPdf = async (type: DeclarationType = activeDeclType) => {
    const declName =
      type === "specs"
        ? "إقرار_الالتزام_بكراسة_الشروط"
        : type === "insurance"
        ? "إقرار_التأمينات_والعمالة"
        : "خطاب_عام_رسمي";

    if (previewPdfBlob && currentSnapshot === lastGeneratedSnapshot && type === activeDeclType) {
      const url = URL.createObjectURL(previewPdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${declName}_${op.serialNumber || "365"}_${registrationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تحميل مستند PDF فوراً! 📑✨");

      if (!currentCloudUrl || currentCloudUrl.includes("tmpfiles") || currentCloudUrl.includes("tmpfile") || currentCloudUrl.includes("catbox")) {
        handleUploadToCloud(type, false, previewPdfBlob);
      }
      return;
    }

    setDownloadingPdf(true);
    try {
      toast.info("جاري تصدير المستند بصيغة PDF الرسمية عبر محرك Word...");
      const docx = await generateDeclarationDocxBlob(type);
      const pdfBlob = await getPdfBlobFromDocx(docx, `declaration_${type}_${registrationNumber}.docx`);
      setPreviewDocxBlob(docx);
      setPreviewPdfBlob(pdfBlob);
      setLastGeneratedSnapshot(currentSnapshot);

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${declName}_${op.serialNumber || "365"}_${registrationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تحميل مستند PDF بنجاح! 📑✨");

      if (!currentCloudUrl || currentCloudUrl.includes("tmpfiles") || currentCloudUrl.includes("tmpfile") || currentCloudUrl.includes("catbox")) {
        handleUploadToCloud(type, false, pdfBlob);
      }
    } catch (err: any) {
      toast.error("فشل تصدير ملف PDF: " + (err?.message || ""));
    } finally {
      setDownloadingPdf(false);
    }
  };

  // ━━━ حالة إضافة الإقرار إلى مستندات الأرشيف ━━━
  const [addingToArchive, setAddingToArchive] = useState(false);
  const currentArchiveDocId = useMemo(() => {
    return activeDeclType === "specs"
      ? "decl-specs"
      : activeDeclType === "insurance"
      ? "decl-insurance"
      : "decl-general";
  }, [activeDeclType]);

  const archiveInfo = useMemo(() => {
    return getArchivedLetterInfo(op, currentArchiveDocId);
  }, [op, currentArchiveDocId]);

  const isCurrentArchived = useMemo(() => {
    if (isDirty) return false;
    return archiveInfo.isArchived;
  }, [archiveInfo, isDirty]);

  const handleToggleArchive = async () => {
    setAddingToArchive(true);
    try {
      if (isDirty) {
        const snapToSave = currentSnapshot;
        setSavedSnapshot(snapToSave);
      }

      const docTitle =
        activeDeclType === "specs"
          ? "إقرار الالتزام بكراسة الشروط والمواصفات"
          : "إقرار الالتزام بالتأمينات والعمالة والمساواة";
      toast.info(`جاري تجهيز وتوثيق نسخة PDF الرسمية لـ ${docTitle}...`);

      const pdfBlob = previewPdfBlob || (await generateDeclarationPdfBlob(activeDeclType));

      const { version, versionName } = await saveLetterToArchiveWithVersion({
        op,
        docKey: currentArchiveDocId,
        title: docTitle,
        pdfBlob,
        currentSnapshot,
        docType: "DECLARATION",
        companyId: selectedCompanyId,
        registrationNumber,
      });

      toast.success(`تم حفظ وأرشفة الإقرار بنجاح في أرشيف العملية (تخزين Hostinger المحلي) (${versionName})! 📦🔒`);
      onRefresh();
    } catch (err: any) {
      toast.error("فشل تحديث حالة الأرشيف للإقرار: " + (err?.message || ""));
    } finally {
      setAddingToArchive(false);
    }
  };

  useEffect(() => {
    if (previewModalOpen) {
      loadOfficialPreview();
    }
  }, [previewModalOpen, activeDeclType]);

  // حفظ الإقرارات في قاعدة بيانات النظام
  const handleSaveToSystem = async () => {
    const snapToSave = currentSnapshot;
    setSavedSnapshot(snapToSave);
    setSavingState(true);
    setLastGeneratedSnapshot(null);
    setPreviewPdfBlob(null);
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl(null);
    }
    toast.success("تم حفظ بيانات الإقرارات بنجاح! 💾✨");

    try {
      let existingNotesObj: Record<string, any> = {};
      try {
        if (op.notes && op.notes.startsWith("{")) {
          existingNotesObj = JSON.parse(op.notes);
        } else if (op.notes) {
          existingNotesObj = { textNotes: op.notes };
        }
      } catch {}

      existingNotesObj.declarationsDocx = {
        ...(existingNotesObj.declarationsDocx || {}),
        ...JSON.parse(snapToSave),
        letterRegNumbers,
        cloudPdfUrlSpecs,
        cloudPdfUrlInsurance,
        lastUploadedSnapshotSpecs,
        lastUploadedSnapshotInsurance,
      };

      if (!existingNotesObj.letterRegistrationNumbers) {
        existingNotesObj.letterRegistrationNumbers = {};
      }
      existingNotesObj.letterRegistrationNumbers["decl_specs"] = letterRegNumbers.specs;
      existingNotesObj.letterRegistrationNumbers["decl_insurance"] = letterRegNumbers.insurance;

      existingNotesObj.operationScope = operationScope;
      existingNotesObj.fiscalYear = fiscalYear;

      await api.patch(`/operations/${op.id}`, {
        notes: JSON.stringify(existingNotesObj),
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل الحفظ في السيرفر");
    } finally {
      setSavingState(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-foreground print:m-0 print:p-0">




      {/* ━━━ SUB-TAB SWITCHER (اختيار نوع الإقرار) ━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setActiveDeclType("specs")}
          className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
            activeDeclType === "specs"
              ? "bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-sm"
              : "bg-card border-border hover:bg-muted/60 text-muted-foreground"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm">1. إقرار الالتزام بكراسة الشروط</span>
              {cloudPdfUrlSpecs && (
                <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-1.5">سحابي ✓</Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              تعهد والتزام كامل بجميع شروط ومواصفات العملية
            </p>
          </div>
          <FileCheck className={`h-6 w-6 shrink-0 ${activeDeclType === "specs" ? "text-emerald-600" : "text-muted-foreground"}`} />
        </button>

        <button
          type="button"
          onClick={() => setActiveDeclType("insurance")}
          className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
            activeDeclType === "insurance"
              ? "bg-teal-500/15 border-teal-500 text-teal-900 dark:text-teal-200 shadow-sm"
              : "bg-card border-border hover:bg-muted/60 text-muted-foreground"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm">2. إقرار التأمينات والعمالة</span>
              {cloudPdfUrlInsurance && (
                <Badge className="bg-teal-600 text-white text-[10px] py-0 px-1.5">سحابي ✓</Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              سداد التأمينات على المقاولات والعمالة غير المنتظمة
            </p>
          </div>
          <ShieldCheck className={`h-6 w-6 shrink-0 ${activeDeclType === "insurance" ? "text-teal-600" : "text-muted-foreground"}`} />
        </button>
      </div>

      {/* ━━━ SECTION 1: بيانات الشركة المصدرة ورقم القيد والباركود السحابي ━━━ */}
      <SectionCard
        title="1. بيانات الشركة المصدرة وكود العملية ورقم القيد والباركود السحابي"
        icon={Building2}
        iconColor="text-emerald-600"
        badge={
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
            الشركة: {currentCompanyLink?.displayCode || "A1"}
          </Badge>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* اختيار الشركة المصدرة */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold text-foreground">الشركة المصدرة للإقرار *</Label>
              <Select
                value={selectedCompanyId}
                onValueChange={(val) => {
                  setSelectedCompanyId(val);
                  const matched = op.companies?.find(
                    (c: any) => c.companyId === val || c.id === val
                  );
                  if (matched) {
                    if (matched.company?.commercialRegister) {
                      setCompanyCommercialRegister(matched.company.commercialRegister);
                    }
                    if (matched.company?.taxCard) {
                      setCompanyTaxCard(matched.company.taxCard);
                    }
                    setCompanyOpCode(matched.displayCode || `AZ-0${op.serialNumber || 1}`);
                  }
                }}
              >
                <SelectTrigger className="h-9.5 text-xs font-bold rounded-xl">
                  <SelectValue placeholder="اختر الشركة">
                    {currentCompanyLink?.company?.name
                      ? `${currentCompanyLink.company.name} (${currentCompanyLink.displayCode || ""})`
                      : "اختر الشركة"}
                  </SelectValue>
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

            {/* رقم القيد الصادر */}
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">رقم القيد الصادر بالإقرار *</Label>
                <button
                  type="button"
                  onClick={handleRegenerateRef}
                  className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
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
            {/* كود العملية بالشركة */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">كود العملية بالشركة (Header) *</Label>
              <Input
                value={companyOpCode}
                onChange={(e) => setCompanyOpCode(e.target.value)}
                placeholder="مثلاً: AZ-01"
                className="h-9.5 text-xs font-mono font-bold rounded-xl"
              />
            </div>

            {/* السجل التجاري */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">السجل التجاري (س . ت) *</Label>
              <Input
                value={companyCommercialRegister}
                onChange={(e) => setCompanyCommercialRegister(e.target.value)}
                className="h-9.5 text-xs font-mono rounded-xl"
              />
            </div>

            {/* البطاقة الضريبية */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">البطاقة الضريبية (ب . ض) *</Label>
              <Input
                value={companyTaxCard}
                onChange={(e) => setCompanyTaxCard(e.target.value)}
                className="h-9.5 text-xs font-mono rounded-xl"
              />
            </div>

            {/* تاريخ الصادر */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">التاريخ الصادر (Footer) *</Label>
              <SmartArabicDatePicker
                value={outgoingDate}
                onChange={setOutgoingDate}
                className="h-9.5 text-xs font-mono rounded-xl"
              />
            </div>
          </div>

          {/* العنوان ووسائل الاتصال بالتذييل */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">هاتف الواتساب (Footer)</Label>
              <Input
                value={phoneWhatsapp}
                onChange={(e) => setPhoneWhatsapp(e.target.value)}
                className="h-9.5 text-xs font-mono rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">هاتف الموبايل (Footer)</Label>
              <Input
                value={phoneMobile}
                onChange={(e) => setPhoneMobile(e.target.value)}
                className="h-9.5 text-xs font-mono rounded-xl"
              />
            </div>
                        <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold text-foreground">البريد الإلكتروني / تفاصيل أخرى بالتذييل (Footer)</Label>
              <Input
                value={companyEmail}
                onChange={(e) => {
                  setCompanyEmail(e.target.value);
                  setCompanyOtherDetails(e.target.value);
                }}
                placeholder="exellentservice@gmail.com أو تفاصيل أخرى..."
                className="h-9.5 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">العنوان المطبوع بالتذييل</Label>
            <Input
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              className="h-9.5 text-xs rounded-xl"
            />
          </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 2: جهة الإسناد وبيانات العملية في موضوع ومتن الإقرار الرسمي ━━━ */}
      <SectionCard
        title="2. جهة الإسناد وبيانات العملية في موضوع ومتن الإقرار الرسمي"
        icon={FileText}
        iconColor="text-teal-600"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">لقب المرسل إليه *</Label>
              <Input
                value={recipientPrefix}
                onChange={(e) => setRecipientPrefix(e.target.value)}
                className="h-9.5 text-xs font-bold rounded-xl text-center"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label className="text-xs font-bold text-foreground">صفة وجهة الإسناد الإدارية *</Label>
              <Input
                value={recipientTitleAndAuthority}
                onChange={(e) => setRecipientTitleAndAuthority(e.target.value)}
                className="h-9.5 text-xs font-bold rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">اسم العملية المسجلة *</Label>
              <Input
                value={operationRegisteredName}
                onChange={(e) => setOperationRegisteredName(e.target.value)}
                className="h-9.5 text-xs font-bold rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">رقم العملية / المناقصة *</Label>
              <Input
                value={operationNumber}
                onChange={(e) => setOperationNumber(e.target.value)}
                className="h-9.5 text-xs font-mono font-bold rounded-xl text-center"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">طريقة الطرح والتعاقد *</Label>
              <Input
                value={tenderMethod}
                onChange={(e) => setTenderMethod(e.target.value)}
                className="h-9.5 text-xs font-bold rounded-xl text-center"
              />
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                {["بالمناقصة العامة", "بالمناقصة المحدودة", "بالممارسة العامة", "بالمزايدة العلنية", "بالاتفاق المباشر"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTenderMethod(preset)}
                    className={`px-1.5 py-0.5 text-[9.5px] font-bold rounded-md border transition-all ${
                      tenderMethod === preset
                        ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/40"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground border-border"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* اسم الشركة المقرة في صدر الإقرار */}
          <div className="space-y-1.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>اسم الشركة المقرة في صدر الإقرار (تقر ... بأنها) *</span>
              <span className="text-[10px] text-muted-foreground font-normal">يظهر مباشرة بعد جملة "بعد التحية"</span>
            </Label>
            <Input
              value={declaringCompanyName}
              onChange={(e) => setDeclaringCompanyName(e.target.value)}
              placeholder={isEx ? "اكسلانت سرفيس للنظافه والصيانه والنقل والخدمات والتوريدات" : "شركة جولدن سرفيس للخدمات العامة والتوريدات"}
              className="h-9.5 text-xs font-bold rounded-xl bg-background"
            />
          </div>

          {/* حقول نص وصيغة الالتزام المحددة للإقرار النشط */}
          {activeDeclType === "specs" ? (
            <div className="space-y-3 p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  عنوان التمهيد في إقرار الكراسة (تمهيد : ...) *
                </Label>
                <Input
                  value={specsPreambleTitle}
                  onChange={(e) => setSpecsPreambleTitle(e.target.value)}
                  placeholder="إقرار الإلتزام بكراسة الشروط والمواصفات"
                  className="h-9.5 text-xs font-bold rounded-xl bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  صيغة التزام الشركة بكراسة الشروط (المتن الرئيسي للإقرار) *
                </Label>
                <Textarea
                  rows={2}
                  value={specsCommitment}
                  onChange={(e) => setSpecsCommitment(e.target.value)}
                  placeholder="بكل ما جاء بكراسة الشروط والمواصفات وتوضح"
                  className="text-xs font-bold rounded-xl bg-background leading-relaxed"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  عنوان التمهيد في إقرار التأمينات (تمهيد : ...) *
                </Label>
                <Input
                  value={insurancePreambleTitle}
                  onChange={(e) => setInsurancePreambleTitle(e.target.value)}
                  placeholder="إقرار الإلتزام بالتأمينات والعماله الغير منتظمه والمساواه بين العاملين"
                  className="h-9.5 text-xs font-bold rounded-xl bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  صيغة التزام الشركة بالتأمينات والعمالة والمساواة (المتن الرئيسي) *
                </Label>
                <Textarea
                  rows={2}
                  value={insuranceCommitment}
                  onChange={(e) => setInsuranceCommitment(e.target.value)}
                  placeholder="بسداد نسبة التأمينات على المقاولات والعماله الغير منتظمه وحسن التعامل مع العاملين بالشركة وعدم التفرقه بينهم"
                  className="text-xs font-bold rounded-xl bg-background leading-relaxed"
                />
              </div>
            </div>
          )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">طبيعة ونطاق التوريد بالعملية *</Label>
                  <Input
                    value={operationScope}
                    onChange={(e) => setOperationScope(e.target.value)}
                    className="h-9.5 text-xs rounded-xl"
                  />
                </div>

                <FiscalYearSelect
                  value={fiscalYear}
                  onChange={setFiscalYear}
                  label="العام المالي للعملية *"
                />

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">موعد جلسة فتح المظروف الفني *</Label>
                  <SmartArabicDatePicker
                    value={technicalOpeningDate}
                    onChange={setTechnicalOpeningDate}
                    className="h-9.5 text-xs font-mono rounded-xl text-center font-bold"
                  />
                </div>
              </div>
        </div>
      </SectionCard>

      {/* ━━━ SECTION 3: الاعتمادات والتوقيعات والملاحظات ━━━ */}
      <SectionCard
        title="3. الاعتمادات والتوقيعات الرسمية والملاحظات الإضافية"
        icon={ShieldCheck}
        iconColor="text-indigo-600"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">صفة المختص</Label>
              <Input
                value={specialistTitle}
                onChange={(e) => setSpecialistTitle(e.target.value)}
                className="h-9.5 text-xs font-bold rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">اسم المختص</Label>
              <Input
                value={specialistName}
                onChange={(e) => setSpecialistName(e.target.value)}
                className="h-9.5 text-xs font-bold rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">المدير المالي (اسم أو توقيع)</Label>
              <Input
                value={financeManagerName}
                onChange={(e) => setFinanceManagerName(e.target.value)}
                className="h-9.5 text-xs font-bold rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">اعتماد رئيس مجلس الإدارة (الاعتماد النهائي) *</Label>
              <Input
                value={boardChairman}
                onChange={(e) => setBoardChairman(e.target.value)}
                placeholder="رئيس مجلس الإدارة"
                className="h-9.5 text-xs font-bold rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">ملاحظات إضافية بالإقرار (اختياري)</Label>
            <Textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="اكتب هنا أي ملاحظات إضافية ترغب في طباعتها بالإقرار (سيتم وضعها في خانة الملاحظات)، أو اتركها فارغة لتفريغها تماماً."
              className="text-xs rounded-xl min-h-[70px]"
            />
          </div>
        </div>
      </SectionCard>

      {/* ━━━ MODAL: معاينة مستند الوورد الأصلي المعتمد ━━━ */}
      {previewModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl h-[94vh] max-h-[94vh] flex flex-col overflow-hidden text-foreground">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-foreground text-base">
                        معاينة قالب الوورد المعتمد: {isEx ? (activeDeclType === "specs" ? "اقرارات الالتزام بكراسة الشروط سيستم اكسلانت.docx" : "اقرارات سيستم اكسلانت.docx") : (activeDeclType === "specs" ? "إقرار كراسة الشروط.docx" : activeDeclType === "insurance" ? "إقرار التأمينات والعمالة.docx" : "خطاب عام رسمي.docx")}
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
                    <RefreshCw className={`h-3.5 w-3.5 ${renderingDocx ? "animate-spin text-emerald-600" : ""}`} />
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

              {/* View: OnlyOffice & Authentic Word Document Viewer */}
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
                    documentTitle={`${activeDeclType === "specs" ? "إقرار_شروط" : activeDeclType === "insurance" ? "إقرار_تأمينات" : "خطاب_عام"}_${op.externalNumber || op.serialNumber}_${registrationNumber}.docx`}
                    docxBlob={previewDocxBlob}
                    pdfBlob={previewPdfBlob}
                    pdfUrl={previewPdfUrl}
                    onDownloadDocx={() => handleDownloadDocx(activeDeclType)}
                    onDownloadPdf={() => handleDownloadPdf(activeDeclType)}
                    onPrint={handlePrintWordDocument}
                    onAddToArchive={handleToggleArchive}
                    isArchived={isCurrentArchived}
                    addingToArchive={addingToArchive}
                    cloudUploadWarning={
                      isCloudStale
                        ? "⚠️ تنبيه ذكي: تم تعديل بيانات هذا الإقرار بعد رفعه سحابياً — يرجى الضغط على 'إعادة الرفع والتحديث السحابي 🔄' لتحديث النسخة السحابية ومطابقة الباركود مع أحدث بيانات!"
                        : null
                    }
                    onUploadCloud={() => handleUploadToCloud(activeDeclType, true)}
                    isUploadingCloud={uploadingCloud}
                  />
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ━━━ BOTTOM ACTION BAR: التوليد والطباعة والمعاينة بأسفل مرحلة الإقرارات ━━━ */}
      <LetterBottomActionWidget
        title={
          activeDeclType === "specs"
            ? "إقرار الالتزام بكراسة الشروط والمواصفات الفنية"
            : "إقرار سداد التأمينات الاجتماعية والعمالة غير المنتظمة"
        }
        registrationNumber={registrationNumber}
        isDirty={isDirty}
        printInfo={printHistory[activeDeclType]}
        onPreview={() => {
          loadOfficialPreview();
        }}
        onSave={handleSaveToSystem}
        onCancelEdits={handleCancelEdits}
        saving={savingState}
        onViewArchive={handleViewArchive}
        onAddToArchive={handleToggleArchive}
        isArchived={isCurrentArchived}
        addingToArchive={addingToArchive}
        archivedVersion={archiveInfo.currentVersion}
        icon={ShieldCheck}
        iconColor="text-emerald-700 dark:text-emerald-400"
        iconBg="bg-emerald-500/15 border-emerald-500/30"
        customSubtitle="مطابقة 100% لقوالب الوورد الرسمية المعتمدة للشركة. اضغط على زر المعاينة للاطلاع على المستند وتنزيله أو طباعته."
      />

      {/* ━━━ نافذة التنبيه عند إعادة طباعة مستند مطبوع مسبقاً ━━━ */}
      <ReprintConfirmModal
        open={reprintWarningOpen}
        onClose={() => setReprintWarningOpen(false)}
        printInfo={printHistory[activeDeclType]}
        onConfirmReprint={handleConfirmReprint}
        onViewArchive={() => {
          setReprintWarningOpen(false);
          handleViewArchive();
        }}
      />

      {/* ━━━ نافذة التحميل العائمة المبتكرة عند تنزيل PDF ━━━ */}
      <PdfExportLoadingModal open={downloadingPdf} />

      {/* ━━━ STEP FOOTER NAVIGATION ━━━ */}
      <StepFooterNav
        currentTabId="declarations"
        onNavigate={onNavigate}
        nextLabel="الانتقال إلى: #10 نتيجة البت الفني والطعون ➔"
        prevLabel="← العرض المالي وجدول الكميات"
      />
    </div>
  );
}
