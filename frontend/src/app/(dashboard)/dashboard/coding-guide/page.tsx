"use client";

import { useState } from "react";
import {
  Hash, Building2, FileText, Check, Copy, Sparkles,
  Info, ArrowRight, Layers, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Table 1 Data: Company Codes
const COMPANY_CODES_DATA = [
  {
    letter: "A",
    code: "A",
    name: "جولدن سيرفيس (الشركة 1)",
    notes: "الحرف الأول من الكود",
    badgeColor: "bg-blue-600/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  {
    letter: "B",
    code: "B",
    name: "إكسلنت (الشركة 2)",
    notes: "الحرف الأول من الكود",
    badgeColor: "bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  {
    letter: "C",
    code: "C",
    name: "العهد (الشركة 3)",
    notes: "الحرف الأول من الكود",
    badgeColor: "bg-purple-600/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
  {
    letter: "D",
    code: "D",
    name: "الشركة الرابعة (الشركة 4)",
    notes: "الحرف الأول من الكود",
    badgeColor: "bg-amber-600/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
];

// Table 2 Data: Operation Types & Letters
const OPERATION_TYPES_DATA = [
  {
    id: 1,
    typeName: "مناقصة عامة",
    letter: "M",
    description: "Monaqasa (مناقصة عامة — مثال العميل الصريح)",
    exampleA: "AM01",
    exampleB: "BM01",
  },
  {
    id: 2,
    typeName: "مناقصة محدودة",
    letter: "L",
    description: "Limited Tender (مناقصة محدودة)",
    exampleA: "AL01",
    exampleB: "BL01",
  },
  {
    id: 3,
    typeName: "ممارسة عامة",
    letter: "P",
    description: "Practice (ممارسة عامة)",
    exampleA: "AP01",
    exampleB: "BP01",
  },
  {
    id: 4,
    typeName: "ممارسة محدودة",
    letter: "R",
    description: "Restricted Practice (ممارسة محدودة)",
    exampleA: "AR01",
    exampleB: "BR01",
  },
  {
    id: 5,
    typeName: "مزايدة علنية",
    letter: "Z",
    description: "MoZayada (مزايدة علنية)",
    exampleA: "AZ01",
    exampleB: "BZ01",
  },
  {
    id: 6,
    typeName: "أمر إسناد مباشر",
    letter: "D",
    description: "Direct Order (إسناد / أمر مباشر)",
    exampleA: "AD01",
    exampleB: "BD01",
  },
];

export default function CodingGuidePage() {
  // Live Simulator state
  const [selectedCompany, setSelectedCompany] = useState("A");
  const [selectedType, setSelectedType] = useState("M");
  const [serialNum, setSerialNum] = useState(1);

  const formattedSerial = String(serialNum).padStart(2, "0");
  const generatedCode = `${selectedCompany}${selectedType}${formattedSerial}`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`تم نسخ الكود: ${text}`);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* ━━━ Header ━━━ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shadow-xs">
              <Hash className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                التكويد
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                دليل ترميز وتكويد العمليات والشركات المعتمدة بالنظام
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-border text-foreground font-mono text-xs px-3 py-1">
            صيغة الكود: [الشركة][النوع][المسلسل]
          </Badge>
          <Badge className="badge-emerald text-xs px-3 py-1 font-mono">
            مثال: AM01
          </Badge>
        </div>
      </div>

      {/* ━━━ Interactive Code Simulator ━━━ */}
      <div className="glass-card rounded-3xl p-6 sm:p-7 border border-border shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              محاكي تكويد العملية المباشر
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">اختبر توليد الكود وفق القواعد الرسمية</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-bold text-muted-foreground mb-1">1. الشركة (الحرف الأول):</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl font-bold text-foreground focus:outline-hidden focus:border-blue-500"
            >
              {COMPANY_CODES_DATA.map((c) => (
                <option key={c.code} value={c.code}>
                  [{c.code}] {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-muted-foreground mb-1">2. نوع الطرح (الحرف الثاني):</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl font-bold text-foreground focus:outline-hidden focus:border-blue-500"
            >
              {OPERATION_TYPES_DATA.map((t) => (
                <option key={t.letter} value={t.letter}>
                  [{t.letter}] {t.typeName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-muted-foreground mb-1">3. رقم المسلسل (خانتي أرقام):</label>
            <Input
              type="number"
              min={1}
              max={99}
              value={serialNum}
              onChange={(e) => setSerialNum(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
              className="h-10 bg-muted/40 border-border text-foreground font-mono font-bold text-center"
            />
          </div>
        </div>

        {/* Generated Code Result */}
        <div className="p-4 bg-muted/30 border border-border rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground">الكود المُولد:</span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-blue-600 dark:text-blue-400 tracking-wider">
              {generatedCode}
            </div>
            <span className="text-xs text-muted-foreground">
              ({COMPANY_CODES_DATA.find((c) => c.code === selectedCompany)?.name.split(" ")[0]} +{" "}
              {OPERATION_TYPES_DATA.find((t) => t.letter === selectedType)?.typeName} + {formattedSerial})
            </span>
          </div>

          <Button
            onClick={() => handleCopy(generatedCode)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer shadow-sm"
          >
            <Copy className="h-3.5 w-3.5 ml-1.5" />
            <span>نسخ الكود</span>
          </Button>
        </div>
      </div>

      {/* ━━━ TABLE 1: جدول الشركات المعتمدة بالنظام (Company Codes) ━━━ */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-border shadow-md space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              1. جدول الشركات المعتمدة بالنظام (Company Codes)
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold">
              <tr>
                <th className="p-3.5 w-24 text-center">الحرف</th>
                <th className="p-3.5 w-32 text-center">كود الشركة</th>
                <th className="p-3.5">اسم الشركة في المنظومة</th>
                <th className="p-3.5">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {COMPANY_CODES_DATA.map((item) => (
                <tr key={item.code} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3.5 font-bold font-mono text-center text-foreground text-sm">
                    {item.letter}
                  </td>
                  <td className="p-3.5 text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded-xl font-mono font-black text-xs border ${item.badgeColor}`}
                    >
                      {item.code}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-foreground">
                    {item.name}
                  </td>
                  <td className="p-3.5 text-muted-foreground">
                    {item.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ━━━ TABLE 2: جدول أنواع العمليات القانونية ورموزها (Operation Types & Letters) ━━━ */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-border shadow-md space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2.5">
            <FileText className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              2. جدول أنواع العمليات القانونية ورموزها (Operation Types & Letters)
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold">
              <tr>
                <th className="p-3.5 w-12 text-center">م</th>
                <th className="p-3.5 font-bold">نوع الطرح القانوني</th>
                <th className="p-3.5 w-28 text-center">الرمز (الحرف)</th>
                <th className="p-3.5">التوصيف والاختصار</th>
                <th className="p-3.5 text-center">مثال لشركة A</th>
                <th className="p-3.5 text-center">مثال لشركة B</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {OPERATION_TYPES_DATA.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3.5 text-center text-muted-foreground font-mono">
                    {row.id}
                  </td>
                  <td className="p-3.5 font-bold text-foreground">
                    {row.typeName}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="inline-block px-3 py-1 rounded-xl bg-muted border border-border font-mono font-black text-xs text-foreground">
                      {row.letter}
                    </span>
                  </td>
                  <td className="p-3.5 text-muted-foreground font-mono text-xs">
                    {row.description}
                  </td>
                  <td className="p-3.5 text-center">
                    <span
                      onClick={() => handleCopy(row.exampleA)}
                      className="cursor-pointer px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-bold text-xs hover:bg-blue-500/20 transition-colors inline-block"
                      title="اضغط لنسخ المثال"
                    >
                      {row.exampleA}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <span
                      onClick={() => handleCopy(row.exampleB)}
                      className="cursor-pointer px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs hover:bg-emerald-500/20 transition-colors inline-block"
                      title="اضغط لنسخ المثال"
                    >
                      {row.exampleB}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
