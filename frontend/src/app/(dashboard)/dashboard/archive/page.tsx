"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Archive, Search, Filter, RotateCcw, FileText, Building2,
  Calendar, CheckCircle2, XCircle, ChevronLeft, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ArchivedOperation {
  id: string;
  code: string;
  name: string;
  authority: string;
  companyName: string;
  closureReason: string;
  closureDate: string;
  tenderValue: number;
}

export default function ArchivePage() {
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState("ALL");

  const [archivedItems, setArchivedItems] = useState<ArchivedOperation[]>([
    {
      id: "arch-1",
      code: "A04",
      name: "مناقصة توريد خوادم وشبكات التخزين السحابي",
      authority: "وزارة الإسكان والمرافق",
      companyName: "المجموعة الذهبية (أ)",
      closureReason: "تم التوريد واستلام شهادة الإنجاز النهائي واسترداد التأمين",
      closureDate: "2025-11-20",
      tenderValue: 850000,
    },
    {
      id: "arch-2",
      code: "B02",
      name: "ممارسة توريد وتركيب أجهزة إنذار حريق ومراقبة",
      authority: "الهيئة العامة للأبنية التعليمية",
      companyName: "العالمية للتوريدات (ب)",
      closureReason: "اكتمال فترة الضمان والصيانة السنوية بنجاح",
      closureDate: "2025-08-14",
      tenderValue: 420000,
    },
    {
      id: "arch-3",
      code: "C01",
      name: "أمر مباشر صيانة محطات الطاقة الاحتياطية",
      authority: "مستشفى القصر العيني",
      companyName: "المتحدة للمقاولات (ج)",
      closureReason: "إغلاق مالي وسداد كافة مستحقات الموردين",
      closureDate: "2025-05-30",
      tenderValue: 195000,
    },
  ]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP" }).format(n);

  const handleRestore = (id: string, name: string) => {
    toast.success(`تم استرجاع العملية "${name}" بنجاح إلى قائمة العمليات النشطة`);
    setArchivedItems(archivedItems.filter((i) => i.id !== id));
  };

  const filtered = archivedItems.filter(
    (item) =>
      item.name.includes(search) ||
      item.authority.includes(search) ||
      item.code.includes(search) ||
      item.companyName.includes(search)
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">الأرشيف العام وسجل العمليات المغلقة</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            سجل العمليات المنتهية والمسترد تأميناتها وسوابق الأعمال التاريخية
          </p>
        </div>

        <Badge variant="outline" className="border-border text-foreground text-xs px-3 py-1.5 self-start sm:self-auto">
          {archivedItems.length} عملية مؤرشفة
        </Badge>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card rounded-2xl p-4 border border-border flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالكود، اسم العملية، جهة الإسناد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-amber-500 rounded-xl text-sm h-10"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          {["ALL", "2026", "2025", "2024"].map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-3 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
                selectedYear === y
                  ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              {y === "ALL" ? "كل الأعوام" : y}
            </button>
          ))}
        </div>
      </div>

      {/* Archived Cards */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-border space-y-3">
          <Archive className="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold text-foreground">لا توجد عمليات مؤرشفة تطابق البحث</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="glass-card-interactive rounded-2xl p-5 border border-border hover:border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="flex items-start gap-4">
                <span className="w-11 h-11 rounded-xl bg-muted text-amber-600 dark:text-amber-400 border border-border font-mono font-bold text-sm flex items-center justify-center shrink-0">
                  {item.code}
                </span>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground text-base group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {item.name}
                    </span>
                    <Badge className="bg-muted border border-border text-muted-foreground text-xs">
                      مغلقة ومؤرشفة
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {item.authority}
                    </span>
                    <span>الشركة المنفذة: <strong className="text-foreground">{item.companyName}</strong></span>
                    <span>تاريخ الإغلاق: {item.closureDate}</span>
                  </div>

                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    سبب الإغلاق: {item.closureReason}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                <div className="text-right sm:text-left">
                  <span className="text-xs text-muted-foreground block">قيمة الترسية</span>
                  <span className="text-base font-bold text-foreground font-mono">
                    {formatCurrency(item.tenderValue)}
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRestore(item.id, item.name)}
                  className="h-9 text-xs border-border text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>استرجاع</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
