"use client";

import { useState } from "react";
import {
  FileText, Upload, Search, Filter, Download, Eye,
  Building2, Shield, Calendar, CheckCircle2, FileCheck,
  FolderOpen, X, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface DocItem {
  id: string;
  title: string;
  companyCode: string;
  category: "LEGAL" | "PREVIOUS_WORK" | "BOOKLET" | "GUARANTEE";
  fileType: "PDF" | "DOCX" | "IMAGE";
  fileSize: string;
  uploadDate: string;
  expiryDate?: string;
  operationCode?: string;
}

export default function DocumentsPage() {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("ALL");
  const [selectedComp, setSelectedComp] = useState("ALL");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const [docs, setDocs] = useState<DocItem[]>([
    {
      id: "doc-1",
      title: "السجل التجاري المعتمد — المجموعة الذهبية (شركة أ)",
      companyCode: "أ",
      category: "LEGAL",
      fileType: "PDF",
      fileSize: "2.4 MB",
      uploadDate: "2026-09-15",
      expiryDate: "2027-09-15",
    },
    {
      id: "doc-2",
      title: "البطاقة الضريبية وشهادة القيمة المضافة — شركة ب",
      companyCode: "ب",
      category: "LEGAL",
      fileType: "PDF",
      fileSize: "1.8 MB",
      uploadDate: "2026-08-20",
      expiryDate: "2027-08-20",
    },
    {
      id: "doc-3",
      title: "شهادة سابقة أعمال — توريد خوادم هيئة قناة السويس",
      companyCode: "أ",
      category: "PREVIOUS_WORK",
      fileType: "PDF",
      fileSize: "4.1 MB",
      uploadDate: "2026-07-10",
    },
    {
      id: "doc-4",
      title: "كراسة الشروط والمواصفات الفنية — مناقصة شبكات A15",
      companyCode: "أ",
      category: "BOOKLET",
      fileType: "PDF",
      fileSize: "8.5 MB",
      uploadDate: "2026-09-28",
      operationCode: "A15",
    },
    {
      id: "doc-5",
      title: "صورة خطاب الضمان الابتدائي الصادر من بنك مصر",
      companyCode: "ب",
      category: "GUARANTEE",
      fileType: "IMAGE",
      fileSize: "1.2 MB",
      uploadDate: "2026-09-30",
      operationCode: "B08",
    },
  ]);

  const filtered = docs.filter((d) => {
    const matchSearch = d.title.includes(search);
    const matchCat = selectedCat === "ALL" || d.category === selectedCat;
    const matchComp = selectedComp === "ALL" || d.companyCode === selectedComp;
    return matchSearch && matchCat && matchComp;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">المستندات والأرشيف الإلكتروني</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            إدارة السجلات القانونية، كراسات الشروط، سوابق الأعمال، والشهادات الضريبية
          </p>
        </div>

        <Button
          onClick={() => setUploadModalOpen(true)}
          className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 hover:from-blue-800 hover:to-blue-700 text-white font-bold px-4 py-2 rounded-xl shadow-lg shadow-blue-500/20 royal-glow flex items-center gap-2 text-xs sm:text-sm active:scale-95 transition-all cursor-pointer"
        >
          <Upload className="h-4 w-4" />
          <span>رفع مستند جديد</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-border">
          <span className="text-xs text-muted-foreground font-bold">إجمالي الوثائق المفهرسة</span>
          <p className="text-2xl font-black text-foreground mt-1 font-mono">{docs.length} وثيقة</p>
          <span className="text-[11px] text-muted-foreground mt-1 block">محمية ومؤمنة في النظام</span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-border">
          <span className="text-xs text-muted-foreground font-bold">سوابق أعمال معتمدة</span>
          <p className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1 font-mono">
            {docs.filter((d) => d.category === "PREVIOUS_WORK").length} سابقة
          </p>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 block">جاهزة لضمها في المظاريف الفنية</span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-border">
          <span className="text-xs text-muted-foreground font-bold">كراسات شروط مسحوبة</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {docs.filter((d) => d.category === "BOOKLET").length} كراسة
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">مرفقة مع العمليات الجارية</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card rounded-2xl p-4 border border-border space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث في المستندات والوثائق..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-sm h-10"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-semibold ml-1">الشركة:</span>
            {["ALL", "أ", "ب", "ج", "د"].map((c) => (
              <button
                key={c}
                onClick={() => setSelectedComp(c)}
                className={`w-8 h-8 rounded-xl font-bold transition-colors cursor-pointer ${
                  selectedComp === c
                    ? "bg-blue-600 text-white font-black shadow-md shadow-blue-500/20"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                {c === "ALL" ? "الكل" : c}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { id: "ALL", label: "جميع المستندات" },
            { id: "LEGAL", label: "السجلات والبطاقات الضريبية" },
            { id: "PREVIOUS_WORK", label: "سوابق الأعمال" },
            { id: "BOOKLET", label: "كراسات الشروط" },
            { id: "GUARANTEE", label: "خطابات الضمان" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCat(tab.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium cursor-pointer ${
                selectedCat === tab.id
                  ? "bg-blue-600 text-white font-bold"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((doc) => (
          <div
            key={doc.id}
            className="glass-card-interactive rounded-2xl p-5 border border-border hover:border-blue-500/50 flex flex-col justify-between space-y-3 group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                  {doc.companyCode}
                </span>

                <div className="flex items-center gap-1.5">
                  {doc.operationCode && (
                    <Badge variant="outline" className="border-blue-500/30 text-blue-700 dark:text-blue-300 font-mono text-[11px]">
                      {doc.operationCode}
                    </Badge>
                  )}
                  <Badge className="bg-muted text-muted-foreground border-border text-[10px]">
                    {doc.fileType}
                  </Badge>
                </div>
              </div>

              <h3 className="font-bold text-foreground text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                {doc.title}
              </h3>

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>الحجم: {doc.fileSize}</span>
                <span>تاريخ الرفع: {doc.uploadDate}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toast.info(`فتح مستند: ${doc.title}`)}
                className="h-8 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>معاينة</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.success("جاري تحميل الملف...")}
                className="h-8 text-xs border-border text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 flex items-center gap-1 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>تحميل</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel rounded-3xl p-6 border border-border max-w-md w-full shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                رفع مستند جديد
              </h3>
              <button onClick={() => setUploadModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-border hover:border-blue-500/60 rounded-2xl p-6 text-center transition-colors cursor-pointer bg-muted/30">
                <FolderOpen className="h-10 w-10 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <p className="text-xs sm:text-sm text-foreground font-semibold">اسحب الملف هنا أو اضغط للاختيار</p>
                <p className="text-[11px] text-muted-foreground mt-1">يدعم PDF, Word, JPG حتى 25 ميجابايت</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">عنوان أو وصف المستند</label>
                <Input placeholder="مثال: شهادة تسجيل ضريبة القيمة المضافة" className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-sm" />
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-border">
                <Button variant="outline" onClick={() => setUploadModalOpen(false)} className="border-border text-foreground hover:bg-muted rounded-xl text-xs cursor-pointer">
                  إلغاء
                </Button>
                <Button
                  onClick={() => {
                    toast.success("تم رفع وتوثيق المستند بنجاح");
                    setUploadModalOpen(false);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
                >
                  تأكيد الرفع
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
