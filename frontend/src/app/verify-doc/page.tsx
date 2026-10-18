"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, CheckCircle2, FileText, Download, Building2, Calendar, Hash, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function VerifyDocContent() {
  const searchParams = useSearchParams();
  const refNo = searchParams.get("ref") || "AZ26101700001";
  const opId = searchParams.get("opId") || "";
  const pdfUrl = searchParams.get("pdfUrl") || "";
  const docType = searchParams.get("type") === "technical" ? "العرض الفني والمواصفات" : "خطاب التوضيح والاستفسار";

  const currentDate = new Date().toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
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
            تم مسح رمز التحقق الرقمي (QR Code) بنجاح. هذا المستند صادر رسمياً وموثق في السجلات الإلكترونية طبقاً لأحكام القانون رقم 182 لسنة 2018.
          </p>
        </div>

        {/* Document Details Card */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 space-y-3 text-xs">
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

        {/* Action Button */}
        <div className="space-y-2 pt-2">
          {pdfUrl ? (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm h-11 rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Download className="h-4 w-4" />
              <span>عرض وتحميل النسخة السحابية الرسمية المعتمدة (PDF)</span>
            </a>
          ) : opId ? (
            <Button
              onClick={() => {
                window.location.href = `/dashboard/operations/${opId}`;
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm h-11 rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              <span>فتح ملف العملية وعرض النسخة الرقمية (PDF)</span>
            </Button>
          ) : null}

          <p className="text-[11px] text-center text-slate-500">
            نظام GoldenERP لإدارة العمليات والمناقصات الحكومية • رمز المصادقة المشفر
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
