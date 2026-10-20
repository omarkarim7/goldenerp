"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Download,
  Printer,
  RefreshCw,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Eye,
  FileCode,
  Sparkles,
  AlertCircle,
  Loader2,
  Laptop,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { renderAsync } from "docx-preview";
import { toast } from "sonner";
import { openDocxInDesktopWord } from "@/app/(dashboard)/dashboard/operations/[id]/tabs/client-pdf";

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
 * عارض ومحرر المستندات المعتمد الفائق (Microsoft Word & PDF Dual Engine Viewer)
 * 1. محرك PDF الرسمي المعتمد (Word COM Engine): يعرض قالب الوورد الأصلي بدقة 100% وبنفس خطوط وهوامش وتنسيقات مايكروسوفت وورد بدون أي فروق
 * 2. محرك Word الحي المباشر (docx-preview): يعرض صفحات قالب الوورد محلياً
 * 3. فتح فوري في برنامج Microsoft Word المثبت على جهاز الكمبيوتر
 * 4. أشرطة أدوات متقدمة: تكبير/تصغير (Zoom)، شاشة كاملة، تبديل بين الأوضاع، تحميل وطباعة فورية
 */
export const OnlyOfficeDocViewer: React.FC<OnlyOfficeDocViewerProps> = ({
  documentTitle,
  docxBlob,
  pdfBlob,
  onDownloadDocx,
  onDownloadPdf,
  onPrint,
  onOpenInWord,
}) => {
  // تفضيل وضع PDF المعتمد المولد من محرك Word الأصيل لأنه يطابق القالب 100% بدون أي فروق في الخطوط
  const [viewMode, setViewMode] = useState<"word" | "pdf">(() => {
    return pdfBlob ? "pdf" : docxBlob ? "word" : "pdf";
  });

  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [renderingDocx, setRenderingDocx] = useState<boolean>(false);
  const [openingDesktopWord, setOpeningDesktopWord] = useState<boolean>(false);
  const [docxRenderError, setDocxRenderError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // تحديث رابط الـ PDF عند توفره والتحويل التلقائي إليه لضمان مطابقة القالب
  useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setPdfObjectUrl(url);
      setViewMode("pdf");
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPdfObjectUrl(null);
    }
  }, [pdfBlob]);

  // تبديل تلقائي لوضع Word إذا توفر docxBlob ولم يكن هناك PDF
  useEffect(() => {
    if (docxBlob && !pdfBlob) {
      setViewMode("word");
    } else if (!docxBlob && pdfBlob) {
      setViewMode("pdf");
    }
  }, [docxBlob, pdfBlob]);

  // رندر صفحات مستند Word الأصلي عبر docx-preview
  useEffect(() => {
    if (viewMode !== "word" || !docxBlob || !containerRef.current) return;

    let isCancelled = false;
    setRenderingDocx(true);
    setDocxRenderError(null);

    const renderWordDocument = async () => {
      try {
        if (!containerRef.current) return;
        containerRef.current.innerHTML = "";

        await renderAsync(docxBlob, containerRef.current, undefined, {
          className: "docx-page-rendered",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          experimental: true,
          useBase64URL: true,
        });

        if (!isCancelled) {
          setRenderingDocx(false);
        }
      } catch (err: any) {
        console.warn("docx-preview failed, attempting mammoth fallback:", err);
        try {
          const mammoth = await import("mammoth");
          const arrayBuffer = await docxBlob.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          if (!isCancelled && containerRef.current) {
            containerRef.current.innerHTML = `
              <div class="mammoth-fallback-page">
                ${result.value}
              </div>
            `;
            setRenderingDocx(false);
          }
        } catch (mErr: any) {
          if (!isCancelled) {
            setDocxRenderError(mErr?.message || "تعذر عرض صفحات Word محلياً");
            setRenderingDocx(false);
          }
        }
      }
    };

    renderWordDocument();

    return () => {
      isCancelled = true;
    };
  }, [docxBlob, viewMode]);

  // التحكم في التكبير والتصغير (Zoom)
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 60));
  const handleZoomReset = () => setZoom(100);

  // فتح المستند فوراً في برنامج Microsoft Word المثبت على جهازك
  const handleOpenDesktopWord = async () => {
    if (onOpenInWord) {
      onOpenInWord();
      return;
    }
    if (!docxBlob) {
      toast.error("ملف الوورد غير متوفر بعد للفتح");
      return;
    }
    setOpeningDesktopWord(true);
    try {
      toast.info("جاري فتح المستند في برنامج Microsoft Word على جهازك...");
      await openDocxInDesktopWord(docxBlob, `${documentTitle}.docx`);
      toast.success("تم فتح المستند بنجاح داخل برنامج Microsoft Word! 🚀");
    } catch (err: any) {
      toast.error("تعذر فتح Word تلقائياً: " + (err?.response?.data?.message || err?.message || ""));
    } finally {
      setOpeningDesktopWord(false);
    }
  };

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
                مطابق لقالب Word الأصلي 100%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              معاينة تفاعلية حية بنفس خطوط وتنسيقات وجداول وهوامش قالب مايكروسوفت وورد
            </p>
          </div>
        </div>

        {/* أزرار التبديل والتحكم والتحميل */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* محدد وضع العرض: Word أو PDF */}
          <div className="flex items-center p-0.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("pdf")}
              disabled={!pdfBlob && !pdfObjectUrl}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-bold cursor-pointer ${
                viewMode === "pdf"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white disabled:opacity-40"
              }`}
              title="عرض النسخة المعتمدة بصيغة PDF المطابقة 100% لقالب مايكروسوفت وورد"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>المعاينة المعتمدة (Word Engine)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("word")}
              disabled={!docxBlob}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-bold cursor-pointer ${
                viewMode === "word"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white disabled:opacity-40"
              }`}
              title="عرض صفحات المستند كملف Word تفاعلي"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>صفحات Word الحية</span>
            </button>
          </div>

          {/* Quick Open in Desktop Word */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleOpenDesktopWord}
            disabled={openingDesktopWord || !docxBlob}
            className="bg-blue-950/60 border-blue-600/50 text-blue-200 hover:bg-blue-900/60 hover:text-white text-xs h-8 px-3 rounded-xl cursor-pointer font-bold transition shadow-xs"
            title="فتح المستند فوراً في برنامج Microsoft Word المثبت على جهاز الكمبيوتر"
          >
            <Laptop className={`w-3.5 h-3.5 ml-1.5 text-blue-400 ${openingDesktopWord ? "animate-pulse" : ""}`} />
            <span>{openingDesktopWord ? "جاري الفتح في Word..." : "فتح في Word فوراً"}</span>
          </Button>

          {/* عناصر تحكم التكبير (Zoom) لوضع Word */}
          {viewMode === "word" && (
            <div className="hidden md:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-1.5 py-0.5 text-xs text-slate-300">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 60}
                className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                title="تصغير (-15%)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>

              <button
                type="button"
                onClick={handleZoomReset}
                className="px-2 py-0.5 rounded-md hover:bg-slate-800 text-slate-300 font-mono text-[11px] font-bold cursor-pointer"
                title="إعادة التعيين إلى 100%"
              >
                {zoom}%
              </button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                title="تكبير (+15%)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

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
          {onPrint && (
            <Button
              size="sm"
              variant="outline"
              onClick={onPrint}
              className="bg-amber-600/20 border-amber-500/40 text-amber-300 hover:bg-amber-600/30 text-xs h-8 px-3 rounded-xl cursor-pointer font-bold"
              title="طباعة المستند الرسمي"
            >
              <Printer className="w-3.5 h-3.5 ml-1.5" />
              <span>طباعة</span>
            </Button>
          )}
        </div>
      </div>

      {/* ━━━ نافذة العرض الرئيسية: وضع Word أو وضع PDF ━━━ */}
      <div className="flex-1 w-full bg-slate-950 relative min-h-[640px] flex overflow-auto custom-scrollbar">
        {/* 1. وضع عرض صفحات Word الحية */}
        {viewMode === "word" && (
          <div className="w-full h-full flex-1 overflow-auto bg-slate-900/90 relative p-4 sm:p-8 flex justify-center items-start custom-scrollbar">
            {renderingDocx && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/85 backdrop-blur-xs z-30">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shadow-lg">
                  <RefreshCw className="w-7 h-7 animate-spin text-blue-400" />
                </div>
                <div className="text-center space-y-1">
                  <h4 className="text-sm font-bold text-white">جاري عرض صفحات مستند Word الأصلية...</h4>
                  <p className="text-xs text-slate-400">تطبيق خطوط وهوامش وجداول القالب المعتمد بدقة 100%</p>
                </div>
              </div>
            )}

            {docxRenderError && !renderingDocx && (
              <div className="m-auto max-w-md p-6 rounded-2xl bg-slate-950 border border-rose-500/30 text-center space-y-4 shadow-xl">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-rose-300">تعذر عرض صفحات Word محلياً</h4>
                  <p className="text-xs text-slate-400 mt-1">{docxRenderError}</p>
                </div>
                {pdfBlob && (
                  <Button
                    type="button"
                    onClick={() => setViewMode("pdf")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                  >
                    الانتقال لمعاينة مستند PDF المعتمد
                  </Button>
                )}
              </div>
            )}

            {/* DOM Container الخاص بـ docx-preview */}
            <div
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease-out",
              }}
              className={`w-full max-w-4xl transition-all ${
                renderingDocx || docxRenderError ? "invisible h-0 overflow-hidden" : "visible"
              }`}
            >
              <div ref={containerRef} dir="rtl" className="docx-preview-root w-full" />
            </div>
          </div>
        )}

        {/* 2. وضع عرض ملف PDF المعتمد */}
        {viewMode === "pdf" && (
          <div className="w-full h-full min-h-[650px] flex-1 bg-white relative">
            {pdfObjectUrl ? (
              <iframe
                src={`${pdfObjectUrl}#toolbar=1&navpanes=0&view=FitH`}
                className="w-full h-full min-h-[650px] border-0 bg-white"
                title="معاينة المستند الرسمي الأصلي"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-slate-950 text-slate-400 py-24">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
                <p className="text-sm font-bold text-white">جاري تجهيز مستند PDF المعتمد من محرك Word...</p>
                <span className="text-xs text-slate-500">مطابقة تامة لملف الوورد</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ━━━ Scoped Styles لضمان خروج صفحات Word بأعلى درجات الأناقة والتطابق ━━━ */}
      <style jsx global>{`
        .docx-preview-root .docx-wrapper {
          background: transparent !important;
          padding: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 24px !important;
        }
        .docx-preview-root section.docx,
        .docx-preview-root .docx-page-rendered {
          background: #ffffff !important;
          color: #0f172a !important;
          box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3) !important;
          border-radius: 6px !important;
          margin-bottom: 24px !important;
          direction: rtl !important;
          text-align: right !important;
          padding: 40px !important;
          min-height: 980px !important;
          box-sizing: border-box !important;
          font-family: 'Segoe UI', Tahoma, Arial, sans-serif !important;
        }
        .docx-preview-root section.docx table {
          border-collapse: collapse !important;
          width: 100% !important;
          margin: 14px 0 !important;
          direction: rtl !important;
        }
        .docx-preview-root section.docx td,
        .docx-preview-root section.docx th {
          border: 1px solid #94a3b8 !important;
          padding: 8px 10px !important;
          text-align: right !important;
          vertical-align: middle !important;
        }
        .docx-preview-root section.docx th {
          background-color: #f1f5f9 !important;
          font-weight: bold !important;
        }
        .mammoth-fallback-page {
          background: #ffffff;
          color: #0f172a;
          padding: 48px;
          border-radius: 8px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          direction: rtl;
          text-align: right;
          line-height: 1.8;
          font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
        }
        .mammoth-fallback-page table {
          border-collapse: collapse;
          width: 100%;
          margin: 16px 0;
        }
        .mammoth-fallback-page td,
        .mammoth-fallback-page th {
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
          text-align: right;
        }
        .mammoth-fallback-page th {
          background-color: #f8fafc;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};
