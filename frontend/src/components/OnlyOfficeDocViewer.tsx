"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Printer,
  ExternalLink,
  Laptop,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { openDocxInDesktopWord } from "@/app/(dashboard)/dashboard/operations/[id]/tabs/client-pdf";

interface OnlyOfficeDocViewerProps {
  documentTitle: string;
  docxBlob?: Blob | null;
  pdfBlob?: Blob | null;
  onDownloadDocx?: () => void;
  onDownloadPdf?: () => void;
  onPrint?: () => void;
}

export const OnlyOfficeDocViewer: React.FC<OnlyOfficeDocViewerProps> = ({
  documentTitle,
  docxBlob,
  pdfBlob,
  onDownloadDocx,
  onDownloadPdf,
  onPrint,
}) => {
  const [activeTab, setActiveTab] = useState<"native" | "onlyoffice">("native");
  const [openingWord, setOpeningWord] = useState(false);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [onlyofficeServerUrl, setOnlyofficeServerUrl] = useState<string>("http://localhost:8080");
  const [isOnlyofficeConnected, setIsOnlyofficeConnected] = useState<boolean>(false);
  const [checkingOnlyOffice, setCheckingOnlyOffice] = useState<boolean>(false);

  useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setPdfObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [pdfBlob]);

  // Check ONLYOFFICE Document Server availability
  const checkOnlyOfficeServer = async () => {
    setCheckingOnlyOffice(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${onlyofficeServerUrl}/web-apps/apps/api/documents/api.js`, {
        method: "HEAD",
        mode: "no-cors",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      setIsOnlyofficeConnected(true);
    } catch {
      setIsOnlyofficeConnected(false);
    } finally {
      setCheckingOnlyOffice(false);
    }
  };

  useEffect(() => {
    checkOnlyOfficeServer();
  }, [onlyofficeServerUrl]);

  // Open in Microsoft Word Desktop
  const handleOpenDesktopWord = async () => {
    if (!docxBlob) {
      toast.error("ملف الوورد غير جاهز بعد");
      return;
    }
    setOpeningWord(true);
    try {
      toast.info("جاري فتح المستند في برنامج Microsoft Word على جهازك...");
      await openDocxInDesktopWord(docxBlob, `${documentTitle}.docx`);
      toast.success("تم فتح المستند بنجاح داخل Microsoft Word! 🚀");
    } catch (err: any) {
      toast.error("تعذر فتح Word تلقائياً: " + (err?.message || "يرجى استخدام خيار التنزيل"));
    } finally {
      setOpeningWord(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 border border-border rounded-xl overflow-hidden shadow-2xl">
      {/* ━━━ ONLYOFFICE / WORD TOP TOOLBAR ━━━ */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100">{documentTitle}</span>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                Word Engine 100%
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              معاينة مطابقة للأصل بنسبة 100% تدعم خطوط وتنسيقات قوالب الوورد الرسمية
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Mode Tabs */}
          <div className="flex items-center p-0.5 bg-slate-800/80 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setActiveTab("native")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition font-medium ${
                activeTab === "native"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              المعاينة الأصلية المعتمدة
            </button>
            <button
              onClick={() => setActiveTab("onlyoffice")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition font-medium ${
                activeTab === "onlyoffice"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              محرر ONLYOFFICE Docs
            </button>
          </div>

          {/* Quick Open in Desktop Word */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenDesktopWord}
            disabled={openingWord || !docxBlob}
            className="bg-blue-950/40 border-blue-700/60 text-blue-200 hover:bg-blue-900/60 text-xs h-8"
            title="فتح المستند فوراً في برنامج Microsoft Word المثبت على جهازك"
          >
            <Laptop className="w-3.5 h-3.5 ml-1.5 text-blue-400" />
            {openingWord ? "جاري الفتح..." : "فتح في Word فوراً"}
          </Button>

          {/* Download Word */}
          {onDownloadDocx && (
            <Button
              size="sm"
              variant="outline"
              onClick={onDownloadDocx}
              className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs h-8"
            >
              <Download className="w-3.5 h-3.5 ml-1.5 text-blue-400" />
              Word (.docx)
            </Button>
          )}

          {/* Download PDF */}
          {onDownloadPdf && (
            <Button
              size="sm"
              onClick={onDownloadPdf}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 shadow"
            >
              <Download className="w-3.5 h-3.5 ml-1.5" />
              PDF رسمي
            </Button>
          )}

          {/* Print */}
          {onPrint && (
            <Button
              size="sm"
              variant="outline"
              onClick={onPrint}
              className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs h-8"
            >
              <Printer className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* ━━━ VIEWER CONTENT BODY ━━━ */}
      <div className="flex-1 w-full bg-slate-950 relative min-h-[600px] flex items-center justify-center">
        {activeTab === "native" ? (
          pdfObjectUrl ? (
            <iframe
              src={`${pdfObjectUrl}#toolbar=1&navpanes=0&view=FitH`}
              className="w-full h-full min-h-[650px] border-0 bg-white"
              title="معاينة المستند الرسمي الأصلي"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-400 py-16">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm">جاري معالجة وتوليد المعاينة الأصلية لمستند الوورد...</p>
            </div>
          )
        ) : (
          /* ONLYOFFICE DOCS TAB */
          <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-900 text-slate-200">
            {isOnlyofficeConnected ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl mb-4 text-emerald-300 text-sm flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  خادم ONLYOFFICE Docs متصل بنجاح وجاهز لعرض المستندات والتحويل
                </div>
                <iframe
                  src={`${onlyofficeServerUrl}/web-apps/apps/documenteditor/main/index.html`}
                  className="w-full h-[650px] border-0 rounded-lg shadow-xl"
                  title="ONLYOFFICE Document Server"
                />
              </div>
            ) : (
              <div className="max-w-xl bg-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-2xl text-right">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Laptop className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">تكامل عارض ومحرر ONLYOFFICE Docs</h3>
                    <p className="text-xs text-slate-400">
                      نظام التحرير والعرض السحابي المتكامل لمستندات Office
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-3 mb-6">
                  <div className="flex items-start gap-2 text-slate-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>الوضع الحالي للمنظومة:</strong> يتم استبدال وحقن كافة بيانات القالب
                      (الترويسة، الباركود، الجداول، التوقيعات) آلياً بنقرة زر وتصدير المستند بدقة 100%.
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-300">
                    <CheckCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>ربط خادم ONLYOFFICE Docs:</strong> لتشغيل عارض ONLYOFFICE داخل الشاشة،
                      شغّل حاوية Docker الرسمية بأمر واحد:
                    </span>
                  </div>
                  <div className="p-3 bg-black/60 rounded-lg font-mono text-[11px] text-emerald-400 dir-ltr text-left border border-slate-800 select-all">
                    docker run -i -t -d -p 8080:80 --restart=always onlyoffice/documentserver
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={checkOnlyOfficeServer}
                    disabled={checkingOnlyOffice}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ml-1.5 ${checkingOnlyOffice ? "animate-spin" : ""}`} />
                    إعادة فحص الاتصال بخادم ONLYOFFICE
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab("native")}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  >
                    <Eye className="w-3.5 h-3.5 ml-1.5" />
                    الرجوع للمعاينة الرسمية المعتمدة (Word Engine)
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
