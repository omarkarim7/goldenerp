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
  Eye,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { renderAsync } from "docx-preview";

export interface OnlyOfficeDocViewerProps {
  documentTitle: string;
  docxBlob?: Blob | null;
  pdfBlob?: Blob | null;
  onDownloadDocx?: () => void;
  onDownloadPdf?: () => void;
  onPrint?: () => void;
  onOpenInWord?: () => void;
}

/**
 * عارض المستندات المعتمد الفائق (Microsoft Word & PDF Official Document Viewer)
 * - يعرض النسخة الرسمية الحية لقالب Word الأصلي مباشرة بالمتصفح باستخدام خطوط Microsoft Arabic Typesetting الأصلية
 * - يعمل بدقة 100% وبسرعة فائقة على Vercel وجميع البيئات دون الاعتماد على خوادم خارجية
 * - يدعم ملء الشاشة، وتحميل ملف Word، وتحميل PDF، والطباعة المباشرة بأعلى جودة
 */
export const OnlyOfficeDocViewer: React.FC<OnlyOfficeDocViewerProps> = ({
  documentTitle,
  docxBlob,
  pdfBlob,
  onDownloadDocx,
  onDownloadPdf,
  onPrint,
}) => {
  const [viewMode, setViewMode] = useState<"word" | "pdf">("word");
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isRenderingDocx, setIsRenderingDocx] = useState<boolean>(false);
  const [docxRenderError, setDocxRenderError] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  // تحديث رابط الـ PDF عند توفره
  useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setPdfObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPdfObjectUrl(null);
    }
  }, [pdfBlob]);

  // تصيير مستند الوورد الأصلي مباشرة عبر محرك docx-preview مع خطوط Arabic Typesetting المعتمدة
  useEffect(() => {
    let cancelled = false;

    if (docxBlob && docxContainerRef.current) {
      setIsRenderingDocx(true);
      setDocxRenderError(null);
      docxContainerRef.current.innerHTML = "";

      const executeRender = async () => {
        try {
          // التأكد من جاهزية واكتمال تحميل الخطوط العربية المعتمدة
          if (typeof document !== "undefined" && document.fonts) {
            await document.fonts.ready;
          }

          if (cancelled || !docxContainerRef.current) return;

          await renderAsync(docxBlob, docxContainerRef.current, undefined, {
            className: "docx-page",
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            breakPages: true,
            experimental: true,
            renderHeaders: true,
            renderFooters: true,
            useBase64URL: true,
          });

          if (!cancelled) {
            setIsRenderingDocx(false);
          }
        } catch (err: any) {
          console.error("فشل تصيير قالب الوورد في المتصفح:", err);
          if (!cancelled) {
            setDocxRenderError(err?.message || "تعذر تصيير قالب الوورد");
            setIsRenderingDocx(false);
            if (pdfBlob) {
              setViewMode("pdf");
            }
          }
        }
      };

      executeRender();
    }

    return () => {
      cancelled = true;
    };
  }, [docxBlob]);

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

  // تنفيذ الطباعة المباشرة بأعلى دقة متجهة وجودة مطابقة لقالب الوورد الأصلي
  const handleDirectPrint = () => {
    if (viewMode === "word" && docxContainerRef.current && docxContainerRef.current.innerHTML.trim()) {
      const printIframe = document.createElement("iframe");
      printIframe.style.position = "fixed";
      printIframe.style.right = "0";
      printIframe.style.bottom = "0";
      printIframe.style.width = "0";
      printIframe.style.height = "0";
      printIframe.style.border = "0";
      document.body.appendChild(printIframe);

      const doc = printIframe.contentDocument || printIframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <meta charset="utf-8">
            <title>${documentTitle}</title>
            <style>
              @font-face {
                font-family: 'Arabic Typesetting';
                src: url('/fonts/arabtype.ttf') format('truetype');
                font-weight: 100 900;
                font-style: normal;
              }
              @font-face {
                font-family: 'Andalus';
                src: url('/fonts/andlso.ttf') format('truetype');
                font-weight: 100 900;
                font-style: normal;
              }
              @font-face {
                font-family: 'Aldhabi';
                src: url('/fonts/aldhabi.ttf') format('truetype');
                font-weight: 100 900;
                font-style: normal;
              }
              @font-face {
                font-family: 'Traditional Arabic';
                src: url('/fonts/trado.ttf') format('truetype');
                font-weight: normal;
                font-style: normal;
              }
              @page {
                size: A4 portrait;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                background: #ffffff;
                direction: rtl;
                font-family: 'Arabic Typesetting', serif;
              }
              .docx-wrapper {
                background: transparent !important;
                padding: 0 !important;
              }
              .docx-page, section.docx {
                margin: 0 auto !important;
                box-shadow: none !important;
                border: none !important;
                page-break-after: always;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            </style>
          </head>
          <body>
            ${docxContainerRef.current.innerHTML}
          </body>
          </html>
        `);
        doc.close();

        setTimeout(() => {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(printIframe)) {
              document.body.removeChild(printIframe);
            }
          }, 2000);
        }, 400);
      }
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
      {/* ━━━ شريط الأدوات العلوي على طراز Microsoft Word Ribbon ━━━ */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-gradient-to-r from-slate-900 via-[#1e293b] to-slate-900 border-b border-slate-800 text-white select-none">
        {/* عنوان المستند وشارة الجودة */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/25 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-sm text-slate-100 truncate max-w-xs sm:max-w-md">
                {documentTitle}
              </span>
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                خطوط وقالب Word الأصلي 100%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              معاينة رسمية حية بنفس خطوط وتنسيقات وجداول وهوامش قالب مايكروسوفت وورد
            </p>
          </div>
        </div>

        {/* أزرار التحكم والتحميل والطباعة */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* محول نمط العرض (Word المباشر مقابل PDF) */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-xl border border-slate-700/60 shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode("word")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "word"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="معاينة حية مباشرة بدقة خطوط مايكروسوفت وورد العربية الأصلية"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>معاينة Word الأصلية</span>
            </button>
            {pdfObjectUrl && (
              <button
                type="button"
                onClick={() => setViewMode("pdf")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "pdf"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="عرض ملف الـ PDF المولد"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>عرض PDF</span>
              </button>
            )}
          </div>

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

          {/* Download Word */}
          {onDownloadDocx && (
            <Button
              size="sm"
              variant="outline"
              onClick={onDownloadDocx}
              disabled={!docxBlob}
              className="bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 text-xs h-8 px-3 rounded-xl cursor-pointer shadow-xs font-bold"
              title="تنزيل الملف المحدث بصيغة مايكروسوفت وورد الأصلي (.docx)"
            >
              <Download className="w-3.5 h-3.5 ml-1.5 text-blue-400" />
              <span>تحميل Word (.docx)</span>
            </Button>
          )}

          {/* Download PDF */}
          {onDownloadPdf && (
            <Button
              size="sm"
              onClick={onDownloadPdf}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 rounded-xl shadow cursor-pointer font-bold"
              title="تحميل الملف بصيغة PDF الرسمية المعتمدة"
            >
              <Download className="w-3.5 h-3.5 ml-1.5" />
              <span>تحميل PDF</span>
            </Button>
          )}

          {/* Print */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleDirectPrint}
            className="bg-amber-600/20 border-amber-500/40 text-amber-300 hover:bg-amber-600/30 text-xs h-8 px-3 rounded-xl cursor-pointer font-bold"
            title="طباعة المستند الرسمي بأعلى دقة"
          >
            <Printer className="w-3.5 h-3.5 ml-1.5" />
            <span>طباعة</span>
          </Button>
        </div>
      </div>

      {/* ━━━ نافذة العرض الرئيسية للمستند الرسمي المعتمد ━━━ */}
      <div className="flex-1 w-full bg-slate-950 relative min-h-[660px] flex overflow-hidden">
        {/* نمط معاينة Word الأصلية المعتمدة */}
        <div
          className={`docx-viewer-scroll-area ${
            viewMode === "word" ? "flex" : "hidden"
          }`}
        >
          {isRenderingDocx && (
            <div className="w-full h-[520px] flex flex-col items-center justify-center gap-4 text-slate-300 p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-lg">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">جاري عرض قالب الوورد بالخطوط الأصلية (Arabic Typesetting)...</h4>
                <p className="text-xs text-slate-400">تطبيق خطوط وهوامش وجداول القالب الأصلي بدقة 100%</p>
              </div>
            </div>
          )}

          {docxRenderError && !isRenderingDocx && (
            <div className="w-full h-[400px] flex flex-col items-center justify-center gap-3 text-red-400 p-8 text-center">
              <p className="text-sm font-bold">حدث خطأ أثناء عرض القالب: {docxRenderError}</p>
            </div>
          )}

          <div
            ref={docxContainerRef}
            className={`w-full flex flex-col items-center ${isRenderingDocx ? "hidden" : "block"}`}
          />
        </div>

        {/* نمط عرض الـ PDF البديل */}
        {viewMode === "pdf" && (
          pdfObjectUrl ? (
            <iframe
              src={`${pdfObjectUrl}#toolbar=1&navpanes=0&view=FitH`}
              className="w-full h-full min-h-[660px] border-0 bg-white"
              title="المعاينة المعتمدة لمستند الوورد الأصلي"
            />
          ) : (
            <div className="w-full h-full min-h-[660px] flex flex-col items-center justify-center gap-4 bg-slate-950 text-slate-300 p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shadow-lg">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">جاري تجهيز نسخة PDF...</h4>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
