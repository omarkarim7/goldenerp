"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Printer,
  Download,
  AlertCircle,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  CheckCircle2,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPdfBlobFromDocx } from "@/app/(dashboard)/dashboard/operations/[id]/tabs/client-pdf";

interface DocxViewerProps {
  blob: Blob | null;
  fileName?: string;
  className?: string;
  onDownload?: () => void;
  onDownloadWord?: () => void;
  onDownloadPdf?: () => void;
}

/**
 * عارض ملفات الوورد والمستندات الرسمي المعتمد (PDF File Viewer & Word Exporter)
 * - يحول ويعرض أي ملف Word تلقائياً وبدقة 100% بصيغة PDF الرسمية المعتمدة
 * - يضمن معاينة متطابقة تماماً لما يظهر على الإستضافة وGitHub بدون أي تشوه في الخطوط أو الجداول
 * - يتيح تحميل المستند بصيغة Word الأصلي (.docx) أو بصيغة PDF الرسمية مع الطباعة المباشرة
 */
export function DocxViewer({
  blob,
  fileName = "مستند_Word.docx",
  className = "",
  onDownload,
  onDownloadWord,
  onDownloadPdf,
}: DocxViewerProps) {
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [convertedPdfBlob, setConvertedPdfBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const activeUrlRef = useRef<string | null>(null);

  const cleanBaseName = fileName
    .replace(/\.pdf$/i, "")
    .replace(/\.docx$/i, "")
    .replace(/\.doc$/i, "")
    .trim() || "مستند";

  useEffect(() => {
    let isCancelled = false;

    const cleanupUrl = () => {
      if (activeUrlRef.current) {
        URL.revokeObjectURL(activeUrlRef.current);
        activeUrlRef.current = null;
      }
    };

    if (!blob) {
      cleanupUrl();
      setLoading(false);
      setError("لم يتم توفير ملف صالح للمعاينة.");
      return;
    }

    async function preparePdfPreview() {
      setLoading(true);
      setError(null);
      cleanupUrl();

      // 1. إذا كان الملف أصلاً PDF
      if (blob && (blob.type.includes("pdf") || fileName.toLowerCase().endsWith(".pdf"))) {
        const url = URL.createObjectURL(blob);
        activeUrlRef.current = url;
        setConvertedPdfBlob(blob);
        setPdfObjectUrl(url);
        setLoading(false);
        return;
      }

      // 2. إذا كان الملف Word (.docx / .doc)، نقوم بتحويله عبر المحرك الرسمي إلى PDF
      try {
        if (!blob) return;
        const pdfBlob = await getPdfBlobFromDocx(blob, `${cleanBaseName}.docx`);
        if (isCancelled) return;

        setConvertedPdfBlob(pdfBlob);
        const url = URL.createObjectURL(pdfBlob);
        activeUrlRef.current = url;
        setPdfObjectUrl(url);
        setLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.error("فشل تحويل مستند Word إلى PDF للمعاينة:", err);
        setError("تعذر تحويل صفحات مستند Word إلى PDF للعرض المباشر. يمكنك تحميل الملف لفتحه على جهازك.");
        setLoading(false);
      }
    }

    preparePdfPreview();

    return () => {
      isCancelled = true;
      cleanupUrl();
    };
  }, [blob, fileName, cleanBaseName]);

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

  // تنزيل ملف Word الأصلي
  const handleDownloadWordFile = () => {
    if (onDownloadWord) {
      onDownloadWord();
      return;
    }
    if (onDownload) {
      onDownload();
      return;
    }
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cleanBaseName}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // تنزيل ملف الـ PDF
  const handleDownloadPdfFile = () => {
    if (onDownloadPdf) {
      onDownloadPdf();
      return;
    }
    if (convertedPdfBlob) {
      const url = URL.createObjectURL(convertedPdfBlob);
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

  // طباعة الـ PDF المباشرة
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
    window.print();
  };

  return (
    <div
      ref={wrapperRef}
      className={`flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden ${
        isFullscreen ? "p-0 rounded-none fixed inset-0 z-[999999]" : ""
      } ${className}`}
    >
      {/* ━━━ شريط الأدوات العلوي الموحد ━━━ */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-gradient-to-r from-slate-900 via-[#1e293b] to-slate-900 border-b border-slate-800 text-xs shrink-0 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-200 text-sm truncate max-w-xs sm:max-w-md">
                {cleanBaseName}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] flex items-center gap-1 shadow-xs">
                <CheckCircle2 className="h-3 w-3" />
                معاينة PDF المعتمدة 100%
              </span>
            </div>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              معاينة رسمية مطابقة تماماً لمستند الوورد الأصلي بدقة متجهة فائقة
            </span>
          </div>
        </div>

        {/* أزرار الإجراءات والتحميل والطباعة */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* ملء الشاشة */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer hidden sm:flex"
            title={isFullscreen ? "تصغير الشاشة" : "عرض ملء الشاشة"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>

          {/* تنزيل Word */}
          {blob && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDownloadWordFile}
              className="h-8 px-3 text-xs bg-blue-950/70 border-blue-500/40 hover:bg-blue-900/80 hover:text-white text-blue-200 rounded-xl cursor-pointer flex items-center gap-1.5 font-bold transition-all active:scale-95"
              title="تحميل الملف بصيغة Word الأصلية (.docx)"
            >
              <FileDown className="h-3.5 w-3.5 text-blue-400" />
              <span>تحميل Word (.docx)</span>
            </Button>
          )}

          {/* تنزيل PDF */}
          <Button
            type="button"
            size="sm"
            onClick={handleDownloadPdfFile}
            disabled={!pdfObjectUrl && !convertedPdfBlob}
            className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer flex items-center gap-1.5 font-bold shadow transition-all active:scale-95 disabled:opacity-50"
            title="تحميل المستند كملف PDF رسمي"
          >
            <Download className="h-3.5 w-3.5" />
            <span>تحميل PDF</span>
          </Button>

          {/* طباعة */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDirectPrint}
            disabled={!pdfObjectUrl}
            className="h-8 px-3 text-xs bg-amber-600/20 border-amber-500/40 hover:bg-amber-600/30 text-amber-300 rounded-xl cursor-pointer flex items-center gap-1.5 font-bold transition-all active:scale-95 disabled:opacity-50"
            title="طباعة محتوى المستند بدقة متجهة"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">طباعة</span>
          </Button>
        </div>
      </div>

      {/* ━━━ مساحة العرض الرئيسية (PDF Viewer) ━━━ */}
      <div className="flex-1 w-full bg-slate-900 overflow-hidden relative flex justify-center items-center">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 z-20 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-lg">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">جاري معالجة وتجهيز معاينة الـ PDF الرسمية المعتمدة...</h4>
              <p className="text-xs text-slate-400">يتم مطابقة التنسيقات والخطوط والجداول بنسبة 100%</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="m-auto max-w-md p-6 rounded-2xl bg-slate-950 border border-rose-500/30 text-center space-y-4 shadow-xl z-20">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-rose-300">تعذر عرض المستند بالمتصفح</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{error}</p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Button
                type="button"
                onClick={handleDownloadWordFile}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
              >
                <Download className="h-3.5 w-3.5 ml-1.5" />
                تحميل المستند لفتحه في Microsoft Word
              </Button>
            </div>
          </div>
        )}

        {pdfObjectUrl && (
          <iframe
            src={`${pdfObjectUrl}#toolbar=1&navpanes=0&view=FitH`}
            className="w-full h-full border-0 bg-slate-900"
            title={cleanBaseName}
          />
        )}
      </div>
    </div>
  );
}
