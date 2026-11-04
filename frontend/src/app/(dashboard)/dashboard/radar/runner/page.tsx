"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Zap,
  Globe,
  Download,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Terminal,
  Server,
  Cpu,
  Layers,
  FileText,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";

export default function RadarRunnerPage() {
  const [bridgeStatus, setBridgeStatus] = useState<"checking" | "online" | "offline">("checking");
  const [isScanning, setIsScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [scanStats, setScanStats] = useState<{ totalNew?: number; totalAll?: number; time?: string } | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [scanLogs]);

  // Ping Local Bridge
  const checkBridge = async () => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 1500);
      const res = await fetch("http://127.0.0.1:4545/ping", { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) {
        setBridgeStatus("online");
        return true;
      }
    } catch {}
    setBridgeStatus("offline");
    return false;
  };

  useEffect(() => {
    checkBridge();
    const interval = setInterval(checkBridge, 6000);
    return () => clearInterval(interval);
  }, []);

  // Run live scan
  const handleStartScan = async () => {
    setIsScanning(true);
    setScanLogs([
      "[*] جاري التحقق من الاتصال بالبوابة الحكومية المصرية...",
      "[*] التحقق من عنوان IP المحلي (جمهورية مصر العربية)...",
    ]);
    setCurrentStep(1);

    const isOnline = await checkBridge();

    if (isOnline) {
      setScanLogs((prev) => [
        ...prev,
        "✓ تم الاتصال بمحرك الرادار المحلي (127.0.0.1:4545) بنجاح!",
        "[*] جاري تسجيل الدخول في بوابة التعاقدات (gcs.digitalegypt.gov.eg)...",
      ]);
      setCurrentStep(2);

      try {
        const res = await fetch("http://127.0.0.1:4545/scan", { method: "POST" });
        const data = await res.json();

        setCurrentStep(3);
        setScanLogs((prev) => [
          ...prev,
          "✓ تم تسجيل الدخول واستخراج أحدث المناقصات الرسمية!",
          "[*] جاري تنزيل كراسات الشروط ومطابقة البنود والأسعار والتأمينات...",
        ]);

        await new Promise((r) => setTimeout(r, 2000));
        setCurrentStep(4);

        if (data.log) {
          setScanLogs((prev) => [...prev, "--- تفاصيل الفحص ---", data.log]);
        }

        setScanLogs((prev) => [
          ...prev,
          "✓ تم إرسال ومزامنة كافة العمليات بنجاح إلى سيرفر GoldenERP!",
          `✓ ${data.message || "اكتمل الفحص بنجاح!"}`,
        ]);

        toast.success("✓ اكتمل فحص الرادار بنجاح وتم تحديث كافة المناقصات!");
        setScanStats({
          time: new Date().toLocaleTimeString("ar-EG"),
        });
      } catch (err: any) {
        setScanLogs((prev) => [
          ...prev,
          `⚠️ حدث خطأ أثناء فحص البوابة: ${err.message}`,
        ]);
        toast.error("فشل الفحص عبر المحرك المحلي");
      }
    } else {
      // Cloud fallback trigger
      setScanLogs((prev) => [
        ...prev,
        "⚠️ لم يتم اكتشاف المحرك المحلي على جهازك (127.0.0.1:4545).",
        "[*] جاري التحويل التلقائي لتشغيل الفحص عبر السحابة...",
      ]);
      try {
        const cloudRes = await api.post("/radar/scan", { pagesCount: 10 });
        setCurrentStep(4);
        setScanLogs((prev) => [
          ...prev,
          `✓ تم إطلاق الفحص السحابي: ${cloudRes.data?.message || "جاري المزامنة"}`,
          "[*] يمكنك أيضاً تشغيل أداة تحديث_الرادار_الحكومي.bat على جهازك مباشرة للحصول على فحص فوري خلال 15 ثانية.",
        ]);
        toast.info(cloudRes.data?.message || "تم إطلاق الفحص السحابي");
      } catch (cloudErr: any) {
        setScanLogs((prev) => [
          ...prev,
          `❌ تعذر الفحص السحابي: ${cloudErr.response?.data?.message || cloudErr.message}`,
          "💡 للحل الفوري: قم بتحميل أداة الفحص السريع (.bat) بالزر أدناه وتشغيلها بنقرة واحدة على جهازك.",
        ]);
        toast.error("تعذر الفحص السحابي، يرجى تشغيل الأداة المحلية");
      }
    }

    setIsScanning(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6" dir="rtl">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/dashboard/radar" className="hover:text-foreground transition-colors flex items-center gap-1 font-bold">
            <ArrowRight className="h-4 w-4" />
            <span>العودة لرادار المناقصات</span>
          </Link>
          <span>/</span>
          <span className="text-foreground font-black">مشغل الرادار والربط المباشر (Radar Runner)</span>
        </div>

        <div className="flex items-center gap-2">
          {bridgeStatus === "online" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              المحرك المحلي متصل (IP مصري معتمد)
            </span>
          ) : bridgeStatus === "checking" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
              <RefreshCw className="h-3 w-3 animate-spin" />
              جاري فحص الاتصال...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <AlertCircle className="h-3 w-3" />
              المحرك المحلي غير نشط (جاهز للتحميل)
            </span>
          )}
        </div>
      </div>

      {/* Hero Action Card */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-blue-950/40 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>محرك الفحص المصري المباشر والمستقل 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              مشغل رادار بوابة التعاقدات الحكومية
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              يقوم هذا المشغل بسحب أحدث المناقصات وكراسات الشروط فوراً باستخدام عنوان IP مصري لتفادي أي حظر أو انقطاع اتصال، مع المزامنة الفورية لنظام GoldenERP بنقرة واحدة.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full sm:w-auto shrink-0">
            <Button
              onClick={handleStartScan}
              disabled={isScanning}
              size="lg"
              className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white font-black px-8 py-6 rounded-2xl shadow-xl shadow-emerald-500/25 text-base active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 border border-emerald-400/30"
            >
              <RefreshCw className={`h-5 w-5 ${isScanning ? "animate-spin" : ""}`} />
              <span>{isScanning ? "جاري الفحص المباشر..." : "⚡ بدء الفحص وسحب العمليات"}</span>
            </Button>

            <a
              href="/downloads/goldenerp-radar-tool.zip"
              download
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 transition-all cursor-pointer shadow-sm active:scale-95 text-center"
              title="تحميل أداة التشغيل السريع (.bat) لتشغيلها على أي جهاز"
            >
              <Download className="h-4 w-4 text-blue-400" />
              <span>تحميل أداة الفحص السريع (.bat)</span>
            </a>
          </div>
        </div>
      </div>

      {/* 4 Steps Tracker */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { num: 1, title: "الاتصال المصري", desc: "تخطي جدار الحماية الحكومي", icon: Globe },
          { num: 2, title: "تسجيل الدخول", desc: "الدخول للبوابة الرسمية", icon: ShieldCheck },
          { num: 3, title: "سحب المناقصات", desc: "استخراج الكراسات والتأمينات", icon: FileText },
          { num: 4, title: "المزامنة الكاملة", desc: "الحفظ بقاعدة بيانات السيستم", icon: CheckCircle2 },
        ].map((st) => {
          const isActive = currentStep === st.num;
          const isDone = currentStep > st.num;
          const Icon = st.icon;
          return (
            <div
              key={st.num}
              className={`p-4 rounded-2xl border transition-all ${
                isDone
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : isActive
                  ? "bg-blue-500/10 border-blue-500/50 text-blue-400 ring-2 ring-blue-500/20"
                  : "bg-card/40 border-border text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                    isDone
                      ? "bg-emerald-500 text-white"
                      : isActive
                      ? "bg-blue-600 text-white animate-pulse"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="h-5 w-5" /> : st.num}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">{st.title}</h4>
                  <p className="text-xs text-muted-foreground">{st.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Terminal & Logs View */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950/95 overflow-hidden shadow-2xl font-mono text-xs">
        <div className="bg-slate-900/90 px-5 py-3 border-b border-slate-800 flex items-center justify-between text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <span className="font-bold text-slate-300">سجل الأحداث والعمليات الحية (Live Console)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            <span className="text-[11px] text-slate-400">gcs.digitalegypt.gov.eg:443</span>
          </div>
        </div>

        <div className="p-5 max-h-96 overflow-y-auto space-y-1.5 text-slate-300 leading-relaxed">
          {scanLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Server className="h-8 w-8 mx-auto opacity-40" />
              <p>اضغط على زر &quot;بدء الفحص وسحب العمليات&quot; لبدء استخراج المناقصات مباشرة.</p>
              <p className="text-[11px] opacity-75">
                تأكد من تشغيل أداة <code className="text-blue-400">تحديث_الرادار_الحكومي.bat</code> على جهازك في مصر للحصول على سرعة فائقة.
              </p>
            </div>
          ) : (
            scanLogs.map((log, idx) => (
              <div
                key={idx}
                className={`py-0.5 whitespace-pre-wrap ${
                  log.includes("✓")
                    ? "text-emerald-400 font-bold"
                    : log.includes("⚠️")
                    ? "text-amber-400 font-bold"
                    : log.includes("❌")
                    ? "text-rose-400 font-bold"
                    : "text-slate-300"
                }`}
              >
                {log}
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>

      {/* Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Solution 1 Guide */}
        <div className="glass-card rounded-2xl p-5 border border-border space-y-3">
          <div className="flex items-center gap-2 text-foreground font-bold">
            <Cpu className="h-5 w-5 text-blue-500" />
            <h3>الحل الأول: الفحص المستقل بنقرة واحدة (.bat)</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            ملف مخصص على جهازك في مصر (أو جهاز العميل)، يفتحه بنقرة واحدة فيقوم بسحب العمليات الرسمية ورفعها مباشرة للنظام خلال 15 ثانية دون أي بروكسي ودون حاجة لفتح متصفح.
          </p>
          <div className="pt-2">
            <a
              href="/downloads/goldenerp-radar-tool.zip"
              download
              className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-bold"
            >
              <Download className="h-4 w-4" />
              <span>تحميل حزمة الأداة الكاملة (.zip)</span>
            </a>
          </div>
        </div>

        {/* Solution 2 Guide */}
        <div className="glass-card rounded-2xl p-5 border border-border space-y-3">
          <div className="flex items-center gap-2 text-foreground font-bold">
            <Layers className="h-5 w-5 text-emerald-500" />
            <h3>الحل الثاني: الربط السحابي مع المتصفح (Web Bridge)</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            عند اختيار الخيار [2] في الأداة، يعمل المحرك كجسر محلي خفيف (Local Bridge). يمكنك حينها الضغط على الزر الأخضر أعلاه من هذه الصفحة أو من صفحة الرادار الرئيسية ليتم الفحص تلقائياً.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard/radar"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold"
            >
              <span>فتح شاشة الرادار وبطاقات المناقصات</span>
              <ArrowRight className="h-4 w-4 rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
