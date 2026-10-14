"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, ShieldAlert, ArrowRight, Truck, LayoutDashboard, Eye, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import InventoryArchivePage from "./InventoryArchivePage";

export default function InventoryPage() {
  const [showArchive, setShowArchive] = useState(false);

  if (showArchive) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span>أنت تستعرض الآن واجهة المخازن المؤرشفة برمجياً (كود مستقل محفوظ).</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowArchive(false)}
            className="h-7 text-xs border-amber-500/30 cursor-pointer"
          >
            إغلاق المعاينة والعودة للإشعار
          </Button>
        </div>
        <InventoryArchivePage />
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 animate-fade-in">
      <div className="max-w-xl w-full text-center space-y-6 glass-card p-8 sm:p-10 rounded-3xl border border-border shadow-2xl relative overflow-hidden">
        {/* Background glow accent */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
          <Package className="h-10 w-10 stroke-[1.75]" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold mb-2">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>وحدة المخازن معلقة حالياً ومحفوظة برمجياً</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground">
            إدارة المخازن غير مفعّلة في مسار العمليات الحالي
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
            بناءً على توجيهات الإدارة، تم إيقاف صفحة المخازن من القائمة الرئيسية والتركيز الكامل على{" "}
            <strong className="text-foreground">سجل وقاعدة بيانات الموردين</strong> لإدارة مشتريات وتوريدات المناقصات الحكومية.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-muted/30 border border-border text-xs text-muted-foreground text-right space-y-1.5">
          <div className="font-bold text-foreground flex items-center gap-1.5">
            <span>ℹ️ ملحوظة برمجية للمطور:</span>
          </div>
          <p>
            تم الاحتفاظ بكامل الكود والواجهة البرمجية في ملف مستقل:
            <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-[11px]">
              InventoryArchivePage.tsx
            </code>
            بحيث لا يتم حذف أي كود ويمكن إعادة تشغيله في أي وقت بنقرة واحدة.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/dashboard/suppliers" className="w-full sm:w-auto">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm h-11 px-6 shadow-md shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-2">
              <Truck className="h-4 w-4" />
              <span>الانتقال إلى سجل الموردين</span>
              <ArrowRight className="h-4 w-4 rotate-180" />
            </Button>
          </Link>

          <Button
            variant="outline"
            onClick={() => setShowArchive(true)}
            className="w-full sm:w-auto border-border text-foreground hover:bg-muted font-bold rounded-xl text-xs sm:text-sm h-11 px-5 cursor-pointer flex items-center justify-center gap-2"
          >
            <Eye className="h-4 w-4" />
            <span>معاينة واجهة المخازن المحفوظة</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
