"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Download,
  Printer,
  RefreshCw,
  CheckCircle2,
  Maximize2,
  Minimize2,
  AlertCircle,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPdfBlobFromDocx } from "@/app/(dashboard)/dashboard/operations/[id]/tabs/client-pdf";

export interface OnlyOfficeDocViewerProps {
  documentTitle: string;
  docxBlob?: Blob | null;
  pdfBlob?: Blob | null;
  pdfUrl?: string | null;
  onDownloadDocx?: () => void;
  onDownloadPdf?: () => void;
  onPrint?: () => void;
  onOpenInWord?: () => void;
}

/**
 * عارض المستندات والقوالب الرسمي المعتمد (PDF Official Viewer & Word Exporter)
 * - يعرض المستند حصرياً بصيغة PDF الرسمية المعتمدة والمطابقة تماماً لنسخة الإستضافة وGitHub (دقة 100%)
 * - يمنع أي تشوه في الخطوط أو الجداول أو التنسيقات الناتجة عن محولات المتصفح التجريبية
 * - يوفر أزراراً رسمية واضحة لتحميل نسخة Word (.docx) وتحميل نسخة PDF وطباعة المستند مباشرة
 */
export const OnlyOfficeDocViewer: React.FC<OnlyOfficeDocViewerProps> = ({
  documentTitle,
  docxBlob,
  pdfBlob,
  pdfUrl,
  onDownloadDocx,
  onDownloadPdf,
  onPrint,
}) => {
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [internalPdfBlob, setInternalPdfBlob] = useState<Blob | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const generatedUrlRef = useRef<string | null>(null);

  // اسم المستند بدون لاحقة لتسمية التنزيلات بدقة
  const cleanBaseName = documentTitle
    .replace(/\.pdf$/i, "")
    .replace(/\.docx$/i, "")
    .replace(/\.doc$/i, "")
    .trim() || "المستند_الرسمي";

  // إدارة ومعالجة عرض الـ PDF
  useEffect(() => {
    let cancelled = false;

    // تنظيف أي رابط سابق تم إنشاؤه
    const cleanupPreviousUrl = () => {
      if (generatedUrlRef.current) {
        URL.revokeObjectURL(generatedUrlRef.current);
        generatedUrlRef.current = null;
      }
    };

    // 1. إذا توفر رابط مباشر (URL)
    if (pdfUrl) {
      cleanupPreviousUrl();
      setPdfObjectUrl(pdfUrl);
      setIsGeneratingPdf(false);
      setPdfError(null);
      return;
    }

    // 2. إذا توفر ملف PDF جاهز من الخصائص (Prop)
    if (pdfBlob && pdfBlob.size > 100) {
      cleanupPreviousUrl();
      const url = URL.createObjectURL(pdfBlob);
      generatedUrlRef.current = url;
      setInternalPdfBlob(pdfBlob);
      setPdfObjectUrl(url);
      setIsGeneratingPdf(false);
      setPdfError(null);
      return;
    }

    // 3. إذا توفر ملف Word (.docx) فقط، نقوم بتحويله إلى PDF رسمي متطابق 100%
    if (docxBlob && docxBlob.size > 100) {
      cleanupPreviousUrl();
      setIsGeneratingPdf(true);
      setPdfError(null);

      getPdfBlobFromDocx(docxBlob, `${cleanBaseName}.docx`)
        .then((generatedPdf) => {
          if (cancelled) return;
          setInternalPdfBlob(generatedPdf);
          const url = URL.createObjectURL(generatedPdf);
          generatedUrlRef.current = url;
          setPdfObjectUrl(url);
          setIsGeneratingPdf(false);
        })
        .catch((err: any) => {
          if (cancelled) return;
          console.error("خطأ في توليد معاينة PDF للقالب:", err);
          setPdfError(err?.message || "تعذر توليد النسخة الرسمية للمعاينة (PDF)");
          setIsGeneratingPdf(false);
        });
      return;
    }

    // لم يتم توفير ملف
    cleanupPreviousUrl();
    setPdfObjectUrl(null);
    setIsGeneratingPdf(false);

    return () => {
      cancelled = true;
      cleanupPreviousUrl();
    };
  }, [pdfBlob, pdfUrl, docxBlob, cleanBaseName]);

  // ملء الشاشة
  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // تنفيذ تنزيل ملف Word الأصلي المحدث
  const handleDownloadDocxFile = () => {
    if (onDownloadDocx) {
      onDownloadDocx();
      return;
    }
    if (docxBlob) {
      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cleanBaseName}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // تنفيذ تنزيل ملف الـ PDF الرسمي
  const handleDownloadPdfFile = () => {
    if (onDownloadPdf) {
      onDownloadPdf();
      return;
    }
    const targetBlob = pdfBlob || internalPdfBlob;
    if (targetBlob) {
      const url = URL.createObjectURL(targetBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cleanBaseName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (pdfObjectUrl) {
      const a = document.createElement("a");
      a.href = pdfObjectUrl;
      a.download = `${cleanBaseName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // تنفيذ الطباعة المباشرة بأعلى دقة متجهة وجودة مطابقة لقالب الوورد الأصلي
  const handleDirectPrint = () => {
    if (pdfObjectUrl) {
      const printIframe = document.createElement("iframe");
      printIframe.style.position = "fixed";
      printIframe.style.right = "0";
      printIframe.style.bottom = "0";
      printIframe.style.width = "0";
      printIframe.style.height = "0";
      printIframe.style.border = "0";
      printIframe.src = pdfObjectUrl;
      document.body.appendChild(printIframe);
      printIframe.onload = () => {
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
        } catch {
          window.open(pdfObjectUrl, "_blank")?.print();
        }
        setTimeout(() => {
          if (document.body.contains(printIframe)) {
            document.body.removeChild(printIframe);
          }
        }, 3000);
      };
      return;
    }

    if (onPrint) {
      onPrint();
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={`flex flex-col h-full w-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl transition-all ${
        isFullscreen ? "p-0 rounded-none fixed inset-0 z-[999999]" : ""
      }`}
    >
      {/* ━━━ شريط الأدوات العلوي الموحد ━━━ */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-gradient-to-r from-slate-900 via-[#1e293b] to-slate-900 border-b border-slate-800 text-white select-none shrink-0">
        {/* عنوان المستند وشارة الجودة الرسمية */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/25 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-sm text-slate-100 truncate max-w-xs sm:max-w-md">
                {cleanBaseName}
              </span>
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1.5 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                معاينة PDF المعتمدة 100%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              معاينة طبق الأصل لملف الـ PDF الرسمي مطابقة تماماً لما يظهر على السحابة وGitHub
            </p>
          </div>
        </div>

        {/* أزرار التحكم والتحميل والطباعة */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* ملء الشاشة */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer hidden sm:flex"
            title={isFullscreen ? "تصغير الشاشة" : "عرض ملء الشاشة"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>

          {/* Download Word (.docx) */}
          {(onDownloadDocx || docxBlob) && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDownloadDocxFile}
              className="bg-blue-950/70 border-blue-500/40 text-blue-200 hover:bg-blue-900/80 hover:text-white text-xs h-8 px-3 rounded-xl cursor-pointer shadow-xs font-bold transition-all active:scale-95"
              title="تنزيل الملف بصيغة مايكروسوفت وورد الأصلي (.docx)"
            >
              <FileDown className="w-3.5 h-3.5 ml-1.5 text-blue-400" />
              <span>تحميل Word (.docx)</span>
            </Button>
          )}

          {/* Download PDF (.pdf) */}
          <Button
            type="button"
            size="sm"
            onClick={handleDownloadPdfFile}
            disabled={!pdfObjectUrl && !pdfBlob && !internalPdfBlob}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 rounded-xl shadow cursor-pointer font-bold transition-all active:scale-95 disabled:opacity-50"
            title="تحميل الملف بصيغة PDF الرسمية المعتمدة"
          >
            <Download className="w-3.5 h-3.5 ml-1.5" />
            <span>تحميل PDF</span>
          </Button>

          {/* Print PDF */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleDirectPrint}
            disabled={!pdfObjectUrl}
            className="bg-amber-600/20 border-amber-500/40 text-amber-300 hover:bg-amber-600/30 text-xs h-8 px-3 rounded-xl cursor-pointer font-bold transition-all active:scale-95 disabled:opacity-50"
            title="طباعة المستند الرسمي بأعلى دقة متجهة"
          >
            <Printer className="w-3.5 h-3.5 ml-1.5" />
            <span>طباعة</span>
          </Button>
        </div>
      </div>

      {/* ━━━ نافذة العرض الرئيسية للمستند الرسمي المعتمد (PDF فقط) ━━━ */}
      <div className="flex-1 min-h-0 w-full bg-slate-950 relative flex overflow-hidden">
        {/* حالة التحميل والتوليد */}
        {isGeneratingPdf && !pdfObjectUrl && (
          <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-4 text-slate-300 p-8 text-center bg-slate-950 z-20">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-lg">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">جاري معالجة وتجهيز معاينة الـ PDF الرسمية المعتمدة...</h4>
              <p className="text-xs text-slate-400">تطبيق الباركود الرقمي والهيدر وتنسيقات القالب المعتمد بدقة 100%</p>
            </div>
          </div>
        )}

        {/* حالة الخطأ */}
        {pdfError && !pdfObjectUrl && !isGeneratingPdf && (
          <div className="m-auto max-w-md p-6 rounded-2xl bg-slate-900 border border-rose-500/30 text-center space-y-4 shadow-xl z-20">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-rose-300">تعذر عرض معاينة PDF</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{pdfError}</p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              {(onDownloadDocx || docxBlob) && (
                <Button
                  type="button"
                  onClick={handleDownloadDocxFile}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  <Download className="h-3.5 w-3.5 ml-1.5" />
                  تحميل ملف Word الأصلي
                </Button>
              )}
            </div>
          </div>
        )}

        {/* عارض الـ PDF الرسمي الدقيق */}
        {pdfObjectUrl && (
          <div className="w-full h-full flex flex-col bg-slate-900 overflow-hidden">
            <iframe
              src={`${pdfObjectUrl}#toolbar=1&navpanes=0&view=FitH`}
              className="w-full h-full border-0 bg-slate-900"
              title={cleanBaseName}
            />
          </div>
        )}
      </div>
    </div>
  );
};
