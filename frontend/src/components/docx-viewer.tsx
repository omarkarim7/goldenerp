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
  ZoomIn,
  ZoomOut,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { renderAsync } from "docx-preview";
import mammoth from "mammoth";

interface DocxViewerProps {
  blob: Blob | null;
  fileName?: string;
  className?: string;
  onDownload?: () => void;
  onDownloadWord?: () => void;
  onDownloadPdf?: () => void;
  hideHeaderTitle?: boolean;
}

/**
 * عارض مستندات الوورد المباشر الأصيل (Native Word DOM Viewer)
 * - يعرض ملفات الوورد (.docx / .doc) مباشرة عبر docx-preview بدون أي تحويل إلى PDF
 * - دعم التحكم الكامل: تكبير وتصغير (Zoom)، ملء الشاشة، طباعة، وتحميل الملف الأصلي مباشرة
 * - دعم عرض ملفات الـ PDF مباشرة داخل نفس العارض
 */
export function DocxViewer({
  blob,
  fileName = "مستند_Word.docx",
  className = "",
  onDownload,
  onDownloadWord,
  hideHeaderTitle = false,
}: DocxViewerProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [renderedWith, setRenderedWith] = useState<"docx-preview" | "mammoth" | "pdf" | null>(null);
  const [mammothHtml, setMammothHtml] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const cleanBaseName = fileName
    .replace(/\.pdf$/i, "")
    .replace(/\.docx$/i, "")
    .replace(/\.doc$/i, "")
    .trim() || "مستند";

  const isPdf = Boolean(
    (blob && blob.type.includes("pdf")) ||
    fileName.toLowerCase().endsWith(".pdf")
  );

  useEffect(() => {
    let isCancelled = false;

    if (!blob) {
      setLoading(false);
      setError("لم يتم توفير ملف صالح للمعاينة.");
      return;
    }

    setLoading(true);
    setError(null);
    setMammothHtml(null);

    // 1. إذا كان الملف PDF
    if (isPdf) {
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setRenderedWith("pdf");
      setLoading(false);
      return () => {
        URL.revokeObjectURL(url);
      };
    }

    // 2. إذا كان ملف Word (.docx / .doc) - عرض مباشر 100% بدون تحويل PDF
    async function renderWordDocument() {
      try {
        if (!containerRef.current || !blob) return;
        // Verify that the blob is actually a valid ZIP (DOCX) file before feeding it to docx-preview/JSZip
        const headerBytes = await blob.slice(0, 4).arrayBuffer().catch(() => new ArrayBuffer(0));
        const uint8 = new Uint8Array(headerBytes);
        const isZip = uint8[0] === 0x50 && uint8[1] === 0x4b; // 'P', 'K' magic bytes

        if (!isZip) {
          const sampleText = await blob.slice(0, 500).text().catch(() => "");
          if (sampleText.includes("statusCode") || sampleText.includes("Forbidden") || sampleText.includes("403")) {
            setError("تعذر فتح معاينة المستند: حدث خطأ في الخادم أو الصلاحيات أثناء تحميل الملف. يمكنك تجربة إعادة المحاولة أو تنزيل الملف.");
          } else {
            setError("الملف المحدد ليس مستند Word (.docx) صالح أو قد يكون تالفاً أو بصيغة أخرى. يمكنك تحميل الملف لفتحه على جهازك.");
          }
          setLoading(false);
          return;
        }

        await renderAsync(blob, containerRef.current, undefined, {
          className: "docx",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          experimental: true,
          useBase64URL: true,
        } as any);

        if (containerRef.current) {
          const sections = containerRef.current.querySelectorAll("section, article, .docx, [class*='docx']");
          sections.forEach((s) => {
            (s as HTMLElement).style.setProperty("background-color", "#ffffff", "important");
            (s as HTMLElement).style.setProperty("color", "#0f172a", "important");
          });
        }

        if (isCancelled) return;
        setRenderedWith("docx-preview");
        setLoading(false);
      } catch (docxErr) {
        if (isCancelled) return;
        console.info("docx-preview fallback to high-fidelity Mammoth HTML engine:", (docxErr as any)?.message || docxErr);

        try {
          const arrayBuffer = await blob!.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          if (isCancelled) return;
          setMammothHtml(result.value);
          setRenderedWith("mammoth");
          setLoading(false);
        } catch (mammothErr) {
          if (isCancelled) return;
          console.error("Mammoth fallback failed:", mammothErr);
          setError("تعذر فتح معاينة مستند Word داخل المتصفح. يمكنك تحميل الملف لفتحه في Microsoft Word مباشرة.");
          setLoading(false);
        }
      }
    }

    // إتاحة وقت كافي لتهيئة الـ DOM
    const timer = setTimeout(() => {
      renderWordDocument();
    }, 40);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [blob, isPdf]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 60));
  const handleZoomReset = () => setZoom(100);

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
      a.download = isPdf ? `${cleanBaseName}.pdf` : `${cleanBaseName}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleDirectPrint = () => {
    if (pdfUrl) {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.src = pdfUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.open(pdfUrl, "_blank")?.print();
        }
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        }, 3000);
      };
      return;
    }

    const printEl = containerRef.current;
    if (printEl) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html dir="rtl">
          <head>
            <title>${cleanBaseName}</title>
            <style>
              @page { size: A4; margin: 15mm; }
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; margin: 0; padding: 10px; color: #000; }
              table { width: 100%; border-collapse: collapse; margin: 10px 0; }
              th, td { border: 1px solid #333; padding: 6px 8px; text-align: right; }
              th { background: #f0f0f0; }
              img { max-width: 100%; }
            </style>
          </head>
          <body>${printEl.innerHTML}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
        return;
      }
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
      <div className={`flex items-center justify-between gap-3 px-4 ${hideHeaderTitle ? "py-1.5 bg-slate-900 border-b border-slate-800/80" : "py-2.5 bg-gradient-to-r from-slate-900 via-[#1e293b] to-slate-900 border-b border-slate-800"} text-xs shrink-0 flex-wrap`}>
        {!hideHeaderTitle ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-200 text-sm truncate max-w-xs sm:max-w-md">
                  {cleanBaseName}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold text-[10px] shadow-xs">
                  {isPdf ? "معاينة PDF مباشرة" : "معاينة Word مباشرة (بدون تحويل) ✓"}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                {isPdf
                  ? "عرض ملف الـ PDF الأصلي بكافة الأدوات والطباعة"
                  : "عرض صفحات وتنسيق مستند الوورد الأصلي مباشرة في المتصفح"}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-blue-400" />
              <span>أدوات تحكم المستند (Word DOM)</span>
            </span>
          </div>
        )}

        {/* أدوات التحكم بالمعاينة والتحميل */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {!isPdf && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={loading || !!error || zoom <= 60}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                title="تصغير (-15%)"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>

              <button
                type="button"
                onClick={handleZoomReset}
                disabled={loading || !!error}
                className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono font-bold cursor-pointer transition-colors"
                title="إعادة التعيين إلى 100%"
              >
                {zoom}%
              </button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={loading || !!error || zoom >= 200}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                title="تكبير (+15%)"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>

              <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />
            </>
          )}

          {!hideHeaderTitle && (
            <>
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

              {/* تحميل الملف بصيغته الأصلية */}
              <Button
                type="button"
                size="sm"
                onClick={handleDownloadWordFile}
                className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer flex items-center gap-1.5 font-bold shadow transition-all active:scale-95"
                title={isPdf ? "تحميل ملف PDF" : "تحميل ملف Word (.docx)"}
              >
                {isPdf ? <Download className="h-3.5 w-3.5" /> : <FileDown className="h-3.5 w-3.5" />}
                <span>{isPdf ? "تحميل PDF" : "تحميل Word (.docx)"}</span>
              </Button>
            </>
          )}

          {/* طباعة مباشرة */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDirectPrint}
            className="h-7 sm:h-8 px-2.5 sm:px-3 text-xs bg-amber-600/20 border-amber-500/40 hover:bg-amber-600/30 text-amber-300 rounded-lg sm:rounded-xl cursor-pointer flex items-center gap-1.5 font-bold transition-all active:scale-95"
            title="طباعة محتوى المستند مباشرة"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">طباعة</span>
          </Button>
        </div>
      </div>

      {/* ━━━ مساحة العرض الرئيسية ━━━ */}
      <div className="flex-1 w-full bg-slate-900/90 overflow-auto relative p-3 sm:p-6 flex justify-center items-start custom-scrollbar">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 z-20 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shadow-lg">
              <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">جاري تحضير المستند للعرض المباشر...</h4>
              <p className="text-xs text-slate-400">تنسيق الصفحات والخطوط والجداول بدقة تامة</p>
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
                تحميل المستند مباشرة إلى جهازك
              </Button>
            </div>
          </div>
        )}

        {isPdf && pdfUrl ? (
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=0&view=FitH`}
            className="w-full h-full min-h-[700px] border-0 bg-slate-900 rounded-xl"
            title={cleanBaseName}
          />
        ) : (
          <div
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top center",
              transition: "transform 0.15s ease-out",
            }}
            className={`w-full max-w-4xl transition-all ${loading || error ? "invisible h-0" : "visible"}`}
          >
            {mammothHtml ? (
              <div
                dir="rtl"
                className="bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-2xl border border-slate-300 min-h-[800px] w-full docx-mammoth-body"
                dangerouslySetInnerHTML={{ __html: mammothHtml }}
              />
            ) : (
              <div
                ref={containerRef}
                dir="rtl"
                className="docx-preview-root w-full flex flex-col items-center"
              />
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        .docx-wrapper {
          background: transparent !important;
          padding: 20px 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 24px !important;
          width: 100% !important;
        }
        .docx-wrapper > section.docx,
        .docx-wrapper section,
        section.docx,
        article.docx,
        .docx-preview-root section,
        .docx-preview-root article,
        .docx-preview-root .docx {
          background: #ffffff !important;
          background-color: #ffffff !important;
          color: #0f172a !important;
          box-shadow: 0 10px 35px -5px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.1) !important;
          border-radius: 4px !important;
          margin-bottom: 24px !important;
          direction: rtl !important;
          text-align: right !important;
          min-height: 800px !important;
        }
        /* لا يتم فرض أي ألوان أو حدود إجبارية على محتوى الوورد لضمان عرضه الأصيل كما هو مصمم تماماً داخل Microsoft Word */
        .docx-mammoth-body {
          background: #ffffff !important;
          background-color: #ffffff !important;
          color: #0f172a;
        }

        .docx-mammoth-body table {
          border-collapse: collapse;
          width: 100%;
          margin: 16px 0;
          background-color: #ffffff;
        }
        .docx-mammoth-body td,
        .docx-mammoth-body th {
          border: 1px solid #475569;
          padding: 8px 12px;
          text-align: right;
          color: #0f172a;
        }
        .docx-mammoth-body th {
          background-color: #f8fafc;
          font-weight: bold;
        }
        .docx-mammoth-body p {
          line-height: 1.8;
          margin-bottom: 12px;
        }
        .docx-preview-root mark,
        .docx-mammoth-body mark,
        .docx-wrapper mark,
        section.docx mark,
        .docx-preview-root [style*="background-color: red"],
        .docx-preview-root [style*="background-color: #ff0000"],
        .docx-preview-root [style*="background-color: rgb(255, 0, 0)"],
        .docx-wrapper [style*="background-color: red"],
        .docx-wrapper [style*="background-color: #ff0000"],
        .docx-wrapper [style*="background-color: rgb(255, 0, 0)"],
        section.docx [style*="background-color: red"],
        section.docx [style*="background-color: #ff0000"],
        section.docx [style*="background-color: rgb(255, 0, 0)"],
        .docx-mammoth-body [style*="background-color: red"],
        .docx-mammoth-body [style*="background-color: #ff0000"],
        .docx-mammoth-body [style*="background-color: rgb(255, 0, 0)"] {
          background-color: transparent !important;
          color: inherit !important;
        }
      `}</style>
    </div>
  );
}
