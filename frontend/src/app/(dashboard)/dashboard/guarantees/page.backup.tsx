"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield, Clock, CheckCircle2, AlertTriangle, Plus, Search,
  Building2, Landmark, Calendar, ArrowRight, RefreshCw, X,
  ChevronLeft, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

interface Guarantee {
  id: string;
  type: string;
  paymentMethod: string;
  amount: number;
  startDate: string;
  endDate: string;
  status: string;
  bankName: string | null;
  guaranteeNumber: string | null;
  isRecovered: boolean;
  operation: { id: string; name: string; authority: string };
}

const statusMap: Record<string, { label: string; color: string; badgeBg: string }> = {
  ACTIVE: { label: "ساري ونشط", color: "text-emerald-500", badgeBg: "badge-emerald" },
  EXPIRING_SOON: { label: "قارب على الانتهاء", color: "text-amber-500", badgeBg: "badge-amber" },
  EXPIRED: { label: "منتهي الصلاحية", color: "text-rose-500", badgeBg: "badge-rose" },
  RECOVERY_REQUESTED: { label: "قيد الاسترداد", color: "text-blue-500", badgeBg: "badge-blue" },
  RECOVERED: { label: "تم الاسترداد", color: "text-muted-foreground", badgeBg: "bg-muted text-muted-foreground border border-border" },
};

export default function GuaranteesPageBackup() {
  const [guarantees, setGuarantees] = useState<Guarantee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    const fetchGuarantees = async () => {
      try {
        const res = await api.get("/guarantees");
        setGuarantees(res.data);
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };
    fetchGuarantees();
  }, []);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP" }).format(n);

  const filteredGuarantees = guarantees.filter((g) => {
    const matchesSearch =
      g.operation?.name?.includes(searchQuery) ||
      g.operation?.authority?.includes(searchQuery) ||
      (g.bankName && g.bankName.includes(searchQuery)) ||
      (g.guaranteeNumber && g.guaranteeNumber.includes(searchQuery));

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && g.status === "ACTIVE") ||
      (statusFilter === "EXPIRING" && g.status === "EXPIRING_SOON") ||
      (statusFilter === "RECOVERED" && g.isRecovered);

    return matchesSearch && matchesStatus;
  });

  const totalAmount = guarantees.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const activeCount = guarantees.filter((g) => g.status === "ACTIVE" || g.status === "EXPIRING_SOON").length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header with Title and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">خطابات الضمان والتأمينات (نسخة أرشيفية)</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            إدارة التأمينات الابتدائية والنهائية مع البنوك وتتبع تواريخ الصلاحية والاسترداد
          </p>
        </div>

        <Button className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 hover:from-blue-800 hover:to-blue-700 text-white font-bold px-4 py-2 rounded-xl shadow-lg shadow-blue-500/20 royal-glow flex items-center gap-2 text-xs sm:text-sm active:scale-95 transition-all cursor-pointer">
          <Plus className="h-4 w-4" />
          <span>تسجيل خطاب ضمان</span>
        </Button>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-bold">إجمالي مبالغ التأمينات</span>
            <div className="w-8 h-8 rounded-lg bg-blue-600/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Shield className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-700 dark:text-blue-300 font-mono">
            {formatCurrency(totalAmount)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">محجوزة كضمانات بنكية ونقدية</span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-bold">التأمينات السارية</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground font-mono">{activeCount} خطاب</p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">نشطة في المناقصات الحالية</span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-bold">تنبيهات الاسترداد</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground font-mono">
            {guarantees.filter((g) => g.status === "EXPIRING_SOON").length} خطاب
          </p>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 block">تحتاج تمديد أو طلب استرداد فوري</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card rounded-2xl p-4 border border-border flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث باسم العملية، جهة الإسناد، البنك المصدر، أو رقم الخطاب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl text-sm h-10"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { id: "ALL", label: "الكل" },
            { id: "ACTIVE", label: "السارية" },
            { id: "EXPIRING", label: "قاربت على الانتهاء" },
            { id: "RECOVERED", label: "المستردة" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-2 rounded-xl whitespace-nowrap transition-colors font-medium cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Guarantees List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-5 border border-border animate-pulse h-28" />
          ))}
        </div>
      ) : filteredGuarantees.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-border space-y-3">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold text-foreground">لا توجد خطابات ضمان مسجلة</h3>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-sm mx-auto">
            سجل خطابات الضمان الابتدائية والنهائية الصادرة من البنوك لتتبع مواعيد استردادها آلياً
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGuarantees.map((g) => {
            const st = statusMap[g.status] || statusMap.ACTIVE;
            const isInitial = g.type === "INITIAL";

            return (
              <div
                key={g.id}
                className="glass-card-interactive rounded-2xl p-5 border border-border hover:border-blue-500/50 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isInitial ? "badge-blue" : "badge-emerald"
                  }`}>
                    <Shield className="h-5 w-5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {g.operation?.name || "عملية مناقصة عامة"}
                      </span>
                      <Badge className={`${st.badgeBg} text-xs`}>
                        {st.label}
                      </Badge>
                      <Badge variant="outline" className="border-border text-muted-foreground text-xs">
                        {isInitial ? "تأمين ابتدائي" : "تأمين نهائي"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {g.operation?.authority || "جهة غير محددة"}
                      </span>
                      {g.bankName && (
                        <span className="flex items-center gap-1">
                          <Landmark className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          البنك: {g.bankName}
                        </span>
                      )}
                      {g.guaranteeNumber && (
                        <span className="font-mono text-foreground font-semibold">
                          رقم الخطاب: {g.guaranteeNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                  <div className="text-right md:text-left">
                    <p className="text-xl font-black text-blue-700 dark:text-blue-300 font-mono">
                      {formatCurrency(g.amount)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      الصلاحية: {new Date(g.endDate).toLocaleDateString("ar-EG")}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/operations/${g.operation?.id || ""}`}>
                      <Button size="sm" variant="outline" className="h-9 text-xs border-border text-foreground hover:bg-muted rounded-xl cursor-pointer">
                        عرض العملية
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
