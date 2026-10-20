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
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
 * - يعرض النسخة الرسمية المعتمدة المجمعة والمطابقة 100% لقالب مايكروسوفت وورد الأصلي
 * - يدعم ملء الشاشة، وتحميل ملف Word المحدث، وتحميل الـ PDF عالي الدقة، والطباعة المباشرة
 */
export const OnlyOfficeDocViewer: React.FC<OnlyOfficeDocViewerProps> = ({
  documentTitle,
  docxBlob,
  pdfBlob,
  onDownloadDocx,
  onDownloadPdf,
  onPrint,
}) => {
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

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
              معاينة رسمية حية بنفس خطوط وتنسيقات وجداول وهوامش قالب مايكروسوفت وورد
            </p>
          </div>
        </div>

        {/* أزرار التحكم والتحميل والطباعة */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* شارة المعاينة المعتمدة فقط */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm">
            <Eye className="w-3.5 h-3.5" />
            <span>المعاينة المعتمدة (Word Engine)</span>
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

      {/* ━━━ نافذة العرض الرئيسية للمستند الرسمي المعتمد ━━━ */}
      <div className="flex-1 w-full bg-slate-950 relative min-h-[660px] flex overflow-hidden">
        {pdfObjectUrl ? (
          <iframe
            src={`${pdfObjectUrl}#toolbar=1&navpanes=0&view=FitH`}
            className="w-full h-full min-h-[660px] border-0 bg-white"
            title="المعاينة المعتمدة لمستند الوورد الأصلي"
          />
        ) : (
          <div className="w-full h-full min-h-[660px] flex flex-col items-center justify-center gap-4 bg-slate-950 text-slate-300 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-lg">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">جاري معالجة وتجهيز المعاينة الرسمية من محرك Word الأصيل...</h4>
              <p className="text-xs text-slate-400">تطبيق خطوط وهوامش وجداول القالب الأصلي بدقة 100%</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
