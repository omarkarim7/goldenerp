"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  FileText,
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { renderAsync } from "docx-preview";
import mammoth from "mammoth";

export interface ClientDocxViewerProps {
  docxBlob?: Blob | null;
  documentTitle: string;
  onDownload?: () => void;
}

export const ClientDocxViewer: React.FC<ClientDocxViewerProps> = ({
  docxBlob,
  documentTitle,
  onDownload,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [fallbackHtml, setFallbackHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    if (!docxBlob) {
      setLoading(false);
      setError("لم يتم تمرير ملف الوورد المطلوب للعرض");
      return;
    }

    setLoading(true);
    setError(null);
    setFallbackHtml(null);

    const renderDocx = async () => {
      try {
        if (!containerRef.current) return;
        containerRef.current.innerHTML = "";

        // 1. المحاولة الأولى: استخدام docx-preview للعرض الدقيق المطابق للصفحات والتنسيقات
        await renderAsync(docxBlob, containerRef.current, undefined, {
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          experimental: true,
          trimXmlDeclaration: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          useBase64URL: true,
        });

        if (active) {
          setLoading(false);
        }
      } catch (err: any) {
        console.warn("docx-preview failed, falling back to mammoth:", err);
        // 2. المحاولة البديلة: تحويل مباشر عبر mammoth
        try {
          const arrayBuffer = await docxBlob.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          if (active) {
            setFallbackHtml(result.value);
            setLoading(false);
          }
        } catch (mErr: any) {
          console.error("All client docx parsers failed:", mErr);
          if (active) {
            setError("تعذر قراءة ملف الوورد مباشرة داخل المتصفح. يمكنك تنزيل الملف وفتحه على جهازك.");
            setLoading(false);
          }
        }
      }
    };

    renderDocx();

    return () => {
      active = false;
    };
  }, [docxBlob]);

  const handlePrint = () => {
    if (!containerRef.current && !fallbackHtml) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    const content = fallbackHtml || containerRef.current?.innerHTML || "";
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <title>${documentTitle}</title>
          <style>
            body { font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; margin: 20px; direction: rtl; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: right; }
            img { max-width: 100%; height: auto; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  const handleCopyText = () => {
    const text = containerRef.current?.innerText || "";
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("تم نسخ نص المستند كاملاً بنجاح 📋");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 select-text overflow-hidden">
      {/* ━━━ شريط الأدوات العلوي لمعاينة الوورد ━━━ */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
            <FileText className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-200 truncate max-w-xs sm:max-w-md" title={documentTitle}>
            {documentTitle}
          </span>
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30">
            معاينة وورد أصلية 100%
          </span>
        </div>

        {/* أزرار التكبير والطباعة والتنزيل */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700 text-slate-300">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
              className="h-7 w-7 p-0 hover:bg-slate-700 text-slate-300"
              title="تصغير (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-[11px] font-mono px-2 font-bold min-w-[45px] text-center">
              {zoom}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setZoom((z) => Math.min(200, z + 10))}
              className="h-7 w-7 p-0 hover:bg-slate-700 text-slate-300"
              title="تكبير (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            {zoom !== 100 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setZoom(100)}
                className="h-7 px-1.5 hover:bg-slate-700 text-[10px] text-slate-400"
                title="إعادة التعيين"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyText}
            className="h-8 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
            title="نسخ محتوى المستند كنص"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? "تم النسخ" : "نسخ النص"}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 px-3 rounded-xl bg-amber-600/20 border-amber-500/40 text-amber-300 hover:bg-amber-600/30 text-xs font-bold cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
            title="طباعة المستند"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة</span>
          </Button>

          {onDownload && (
            <Button
              type="button"
              size="sm"
              onClick={onDownload}
              className="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
              title="تنزيل ملف الوورد الأصلي"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل Word</span>
            </Button>
          )}
        </div>
      </div>

      {/* ━━━ مساحة عرض مستند الوورد الحقيقي ━━━ */}
      <div className="flex-1 w-full overflow-auto bg-slate-900/90 p-4 sm:p-8 flex justify-center custom-scrollbar">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 my-auto text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-xs font-bold">جاري فتح وقراءة مستند الوورد الأصلي فورياً...</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center gap-3 my-auto max-w-md text-center p-6 bg-slate-900 rounded-2xl border border-slate-800">
            <AlertCircle className="w-10 h-10 text-rose-500" />
            <h4 className="text-sm font-bold text-white">تعذر العرض المباشر</h4>
            <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
            {onDownload && (
              <Button onClick={onDownload} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold mt-2">
                <Download className="w-3.5 h-3.5 ml-1.5" />
                <span>تحميل الملف وفتحه على جهازك</span>
              </Button>
            )}
          </div>
        )}

        {/* الحاوية الأساسية لمعاينة الوورد بدون تحويل */}
        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
            transition: "transform 0.15s ease",
            display: loading || error ? "none" : "block",
          }}
          className="w-full max-w-4xl"
        >
          {fallbackHtml ? (
            <div
              dir="auto"
              className="bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-2xl min-h-[800px] leading-relaxed select-text font-serif text-sm border border-slate-300"
              dangerouslySetInnerHTML={{ __html: fallbackHtml }}
            />
          ) : (
            <div
              ref={containerRef}
              dir="auto"
              className="client-docx-container bg-white text-slate-900 rounded-xl shadow-2xl overflow-hidden min-h-[800px] select-text border border-slate-300 [&_.docx-wrapper]:bg-transparent [&_.docx]:shadow-none [&_.docx]:p-8 sm:[&_.docx]:p-12 [&_.docx]:max-w-full"
            />
          )}
        </div>
      </div>
    </div>
  );
};
