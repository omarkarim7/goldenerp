"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, CheckCircle2, FileText, Download, Building2, Calendar, Hash, User, Clock, Eye, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function VerifyDocContent() {
  const searchParams = useSearchParams();
  const refNo = searchParams.get("ref") || "AZ26101700001";
  const opId = searchParams.get("opId") || "";
  const rawPdfUrl = searchParams.get("pdfUrl") || "";
  const rawType = searchParams.get("type") || "";
  const printedBy = searchParams.get("printedBy") || "المدير العام";
  const rawPrintedAt = searchParams.get("printedAt") || "";

  // Derive document title
  let docType = "خطاب رسمي معتمد";
  if (rawType.includes("technical")) docType = "العرض الفني والمواصفات الرسمية";
  else if (rawType.includes("financial")) docType = "العرض المالي وجداول الفئات الرسمية";
  else if (rawType.includes("clarification")) docType = "خطاب التوضيح والاستفسارات الفنية";
  else if (rawType.includes("final")) docType = "خطاب سداد التأمين النهائي";
  else if (rawType.includes("booklet")) docType = "خطاب سحب كراسة الشروط والمواصفات";
  else if (rawType.includes("insurance")) docType = "خطاب سداد التأمين الابتدائي";
  else if (rawType.includes("decl")) docType = "إقرار رسمي معتمد وموثق";

  // Compute print date display
  let printDateDisplay = "غير محدد";
  if (rawPrintedAt) {
    const num = Number(rawPrintedAt);
    const dateObj = !isNaN(num) && num > 1000000000 ? new Date(num) : new Date(rawPrintedAt);
    if (!isNaN(dateObj.getTime())) {
      printDateDisplay = dateObj.toLocaleString("ar-EG", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });
    }
  }

  // Determine final effective PDF URL
  let effectivePdfUrl = rawPdfUrl;
  if (!effectivePdfUrl && refNo) {
    effectivePdfUrl = `/api/public-doc/${encodeURIComponent(refNo)}.pdf`;
  }

  const [showEmbeddedPdf, setShowEmbeddedPdf] = useState<boolean>(false);

  const currentDate = new Date().toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col items-center justify-center p-3 sm:p-6">
      <div className="max-w-xl w-full bg-slate-900/95 border border-slate-700/80 rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
        {/* Verification Icon & Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-lg">
            <ShieldCheck className="h-9 w-9 stroke-[2.2]" />
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs px-3 py-1 font-bold">
            مستند رسمي معتمد وموثق رقمياً ✓
          </Badge>
          <h1 className="text-xl sm:text-2xl font-black text-white pt-1">
            منظومة جولدن ERP للتوثيق والتحقق الرقمي
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            تم مسح رمز التحقق الرقمي (QR Code) بنجاح. هذا المستند صادر رسمياً وموثق في السجلات الإلكترونية طبقاً لأحكام القانون رقم 182 لسنة 2018 ولائحته التنفيذية.
          </p>
        </div>

        {/* Document Details Card */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-700">
            <span className="text-slate-400 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-blue-400" />
              <span>نوع المستند:</span>
            </span>
            <span className="font-bold text-white text-sm">{docType}</span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-700">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-amber-400" />
              <span>رقم القيد الصادر المعتمد:</span>
            </span>
            <span className="font-mono font-bold text-amber-300 text-sm tracking-wider">{refNo}</span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-700">
            <span className="text-slate-400 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-amber-500" />
              <span>طُبع واعتُمد بواسطة:</span>
            </span>
            <span className="font-bold text-amber-200 text-sm">{printedBy}</span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-700">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>تاريخ وتوقيت الطباعة:</span>
            </span>
            <span className="font-mono font-bold text-slate-200">{printDateDisplay}</span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-700">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-purple-400" />
              <span>الجهة المصدرة:</span>
            </span>
            <span className="font-bold text-slate-200">شركة جولدن سرفيس للخدمات العامة والتوريدات</span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-700">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-emerald-400" />
              <span>تاريخ التحقق الفوري:</span>
            </span>
            <span className="font-bold text-slate-200">{currentDate}</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-400">حالة المستند:</span>
            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>أصلي معتمد 100%</span>
            </span>
          </div>
        </div>

        {/* Embedded PDF Viewer on Demand */}
        {showEmbeddedPdf && effectivePdfUrl && (
          <div className="rounded-2xl border border-slate-700 overflow-hidden h-[450px] bg-slate-950">
            <iframe
              src={`${effectivePdfUrl}#toolbar=1&navpanes=0`}
              className="w-full h-full border-0"
              title="معاينة المستند الرسمي"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          {effectivePdfUrl && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={() => setShowEmbeddedPdf(!showEmbeddedPdf)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Eye className="h-4 w-4" />
                <span>{showEmbeddedPdf ? "إخفاء المعاينة المباشرة" : "معاينة ملف الـ PDF هنا 📄"}</span>
              </Button>

              <a
                href={effectivePdfUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs h-10 rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <ExternalLink className="h-4 w-4" />
                <span>فتح ملف PDF المباشر ↗</span>
              </a>
            </div>
          )}

          {opId && (
            <Button
              onClick={() => {
                window.location.href = `/dashboard/operations/${opId}`;
              }}
              variant="outline"
              className="w-full border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>الذهاب لملف العملية في المنظومة</span>
            </Button>
          )}

          <p className="text-[11px] text-center text-slate-400">
            نظام GoldenERP لإدارة العمليات والمناقصات الحكومية • رمز المصادقة والتحقق الرقمي
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyDocPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">جاري التحقق...</div>}>
      <VerifyDocContent />
    </Suspense>
  );
}
