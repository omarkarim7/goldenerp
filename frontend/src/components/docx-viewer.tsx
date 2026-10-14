"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Printer,
  Download,
  AlertCircle,
  FileText,
  Loader2,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocxViewerProps {
  blob: Blob | null;
  fileName?: string;
  className?: string;
  onDownload?: () => void;
}

export function DocxViewer({ blob, fileName = "مستند_Word.docx", className = "", onDownload }: DocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const printIframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [renderedWith, setRenderedWith] = useState<"docx-preview" | "mammoth" | null>(null);
  const [mammothHtml, setMammothHtml] = useState<string | null>(null);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 15, 200));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 15, 60));
  const handleZoomReset = () => setZoom(100);

  const handlePrint = useCallback(() => {
    if (!containerRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    const contentHtml = containerRef.current.innerHTML;
    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>${fileName}</title>
          <style>
            @page { size: auto; margin: 15mm; }
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; margin: 0; padding: 20px; color: #000; background: #fff; }
            table { border-collapse: collapse; width: 100%; margin: 12px 0; }
            table, th, td { border: 1px solid #444; padding: 6px 8px; text-align: right; }
            th { background-color: #f1f5f9; font-weight: bold; }
            p { line-height: 1.6; margin: 6px 0; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <div class="docx-print-content">${contentHtml}</div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [fileName]);

  useEffect(() => {
    let isCancelled = false;

    if (!blob) {
      setLoading(false);
      setError("لم يتم توفير ملف صالح للمعاينة.");
      return;
    }

    async function renderDoc() {
      setLoading(true);
      setError(null);
      setMammothHtml(null);
      setRenderedWith(null);

      // 1. Try docx-preview first for authentic page layouts
      try {
        const { renderAsync } = await import("docx-preview");
        if (isCancelled || !containerRef.current) return;

        // Clear previous content
        containerRef.current.innerHTML = "";

        await renderAsync(blob, containerRef.current, undefined, {
          className: "docx-page",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          experimental: true,
        });

        if (isCancelled) return;
        setRenderedWith("docx-preview");
        setLoading(false);
        return;
      } catch (err) {
        console.warn("docx-preview failed, falling back to mammoth:", err);
      }

      // 2. Fallback to mammoth for HTML conversion
      try {
        const mammoth = await import("mammoth");
        if (isCancelled || !blob) return;

        const arrayBuffer = await blob.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });

        if (isCancelled) return;

        if (result.value && result.value.trim().length > 0) {
          setMammothHtml(result.value);
          setRenderedWith("mammoth");
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("mammoth also failed:", err);
      }

      if (!isCancelled) {
        setError("تعذر استخراج المحتوى الداخلي لمستند Word للعرض المباشر. يمكنك تحميل الملف وفتحه على جهازك.");
        setLoading(false);
      }
    }

    renderDoc();

    return () => {
      isCancelled = true;
    };
  }, [blob]);

  return (
    <div className={`flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden ${className}`}>
      {/* Viewer Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold text-[11px] flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>معاينة مستند Word</span>
          </span>
          {renderedWith && (
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              محرك العرض: {renderedWith === "docx-preview" ? "عالي الدقة (صفحات طبق الأصل)" : "محول HTML"}
            </span>
          )}
        </div>

        {/* Zoom & Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={loading || !!error || zoom <= 60}
            className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
            title="تصغير (-15%)"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>

          <button
            type="button"
            onClick={handleZoomReset}
            disabled={loading || !!error}
            className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono font-bold cursor-pointer transition-colors"
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
            className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
            title="تكبير (+15%)"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={loading || !!error}
            className="h-7 px-2.5 text-xs bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer flex items-center gap-1"
            title="طباعة محتوى مستند Word"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">طباعة</span>
          </Button>

          {onDownload && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDownload}
              className="h-7 px-2.5 text-xs bg-blue-600/20 border-blue-500/30 hover:bg-blue-600 hover:text-white text-blue-300 rounded-lg cursor-pointer flex items-center gap-1"
              title="تحميل الملف للجهاز"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">تحميل</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full overflow-auto bg-slate-900/90 relative p-3 sm:p-6 flex justify-center items-start custom-scrollbar">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 backdrop-blur-xs z-20">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <p className="text-sm font-bold text-slate-300">جاري معالجة صفحات مستند Word للعرض المباشر...</p>
            <span className="text-xs text-slate-500">يتم تنسيق الجداول والخطوط بدقة فائقة</span>
          </div>
        )}

        {error && !loading && (
          <div className="m-auto max-w-md p-6 rounded-2xl bg-slate-950 border border-rose-500/30 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-rose-300">تعذر عرض المستند بالمتصفح</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{error}</p>
            </div>
            {onDownload && (
              <Button
                type="button"
                onClick={onDownload}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
              >
                <Download className="h-3.5 w-3.5 ml-1.5" />
                تحميل المستند لفتحه في Microsoft Word
              </Button>
            )}
          </div>
        )}

        {/* docx-preview DOM Container */}
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
              className="bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-2xl border border-slate-300 min-h-[800px] docx-mammoth-body"
              dangerouslySetInnerHTML={{ __html: mammothHtml }}
            />
          ) : (
            <div
              ref={containerRef}
              dir="rtl"
              className="docx-preview-root w-full"
            />
          )}
        </div>
      </div>

      {/* Scoped CSS for Word layout rendering */}
      <style jsx global>{`
        .docx-preview-root .docx-wrapper {
          background: transparent !important;
          padding: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 24px !important;
        }
        .docx-preview-root section.docx {
          background: #ffffff !important;
          color: #0f172a !important;
          box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3) !important;
          border-radius: 6px !important;
          margin-bottom: 24px !important;
          direction: rtl !important;
          text-align: right !important;
          padding: 40px !important;
          min-height: 800px !important;
        }
        .docx-preview-root section.docx table {
          border-collapse: collapse !important;
          width: 100% !important;
          margin: 14px 0 !important;
        }
        .docx-preview-root section.docx td,
        .docx-preview-root section.docx th {
          border: 1px solid #94a3b8 !important;
          padding: 8px 10px !important;
          text-align: right !important;
        }
        .docx-preview-root section.docx th {
          background-color: #f1f5f9 !important;
          font-weight: bold !important;
        }
        .docx-mammoth-body table {
          border-collapse: collapse;
          width: 100%;
          margin: 16px 0;
        }
        .docx-mammoth-body td,
        .docx-mammoth-body th {
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
          text-align: right;
        }
        .docx-mammoth-body th {
          background-color: #f8fafc;
          font-weight: bold;
        }
        .docx-mammoth-body p {
          line-height: 1.8;
          margin-bottom: 12px;
        }
        .docx-mammoth-body h1,
        .docx-mammoth-body h2,
        .docx-mammoth-body h3 {
          font-weight: bold;
          margin-top: 20px;
          margin-bottom: 10px;
          color: #1e293b;
        }
      `}</style>
    </div>
  );
}
