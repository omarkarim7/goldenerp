"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, User, Eye, EyeOff, Loader2, Sparkles, Shield, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error("الرجاء إدخال اسم المستخدم وكلمة المرور");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "خطأ في تسجيل الدخول");
        return;
      }

      // Store tokens
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.removeItem("selectedCompany");

      toast.success(`أهلاً بك، ${data.user.fullName}`);
      router.push("/select-company");
    } catch {
      toast.error("تعذر الاتصال بالسيرفر. يرجى التأكد من تشغيل الباك اند");
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden ambient-mesh">
      {/* Ambient background glow orbs */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 glass-card rounded-3xl p-6 sm:p-8 border border-border shadow-2xl animate-scale-up">
        {/* Header Logo */}
        <div className="text-center pb-3">
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 flex items-center justify-center mb-3 shadow-xl shadow-blue-600/30 royal-glow animate-float">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-wider">G</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/25 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>نظام إدارة العمليات والمناقصات V1.0</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Golden<span className="text-blue-600 dark:text-blue-400">ERP</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            إدارة دورة حياة المناقصات والتأمينات للشركات الأربعة
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-xs font-semibold text-foreground">
              اسم المستخدم
            </Label>
            <div className="relative">
              <User className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                type="text"
                placeholder="أدخل اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pr-10 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-11 text-sm"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-foreground">
              كلمة المرور
            </Label>
            <div className="relative">
              <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="أدخل كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10 pl-10 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 rounded-xl h-11 text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 hover:from-blue-800 hover:to-blue-700 text-white font-bold h-11 rounded-xl text-sm shadow-lg shadow-blue-500/25 royal-glow transition-all active:scale-95 duration-150 mt-2 cursor-pointer"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "تسجيل الدخول للنظام"}
          </Button>
        </form>

        {/* Quick Demo Access Pills */}
        <div className="mt-6 pt-4 border-t border-border space-y-2">
          <p className="text-[11px] text-muted-foreground font-semibold text-center">
            تسجيل دخول سريع للتجربة (اضغط للملء التلقائي):
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => quickFill("admin", "admin123")}
              className="p-2 rounded-xl bg-muted/40 hover:bg-blue-500/15 hover:border-blue-500/40 border border-border text-muted-foreground hover:text-foreground text-center transition-all cursor-pointer"
            >
              <span className="block font-bold text-[11px] text-foreground">مدير عام</span>
              <span className="text-[10px] text-muted-foreground font-mono">admin</span>
            </button>
            <button
              type="button"
              onClick={() => quickFill("deputy", "deputy123")}
              className="p-2 rounded-xl bg-muted/40 hover:bg-blue-500/15 hover:border-blue-500/40 border border-border text-muted-foreground hover:text-foreground text-center transition-all cursor-pointer"
            >
              <span className="block font-bold text-[11px] text-foreground">نائب مدير</span>
              <span className="text-[10px] text-muted-foreground font-mono">deputy</span>
            </button>
            <button
              type="button"
              onClick={() => quickFill("employee", "emp123")}
              className="p-2 rounded-xl bg-muted/40 hover:bg-blue-500/15 hover:border-blue-500/40 border border-border text-muted-foreground hover:text-foreground text-center transition-all cursor-pointer"
            >
              <span className="block font-bold text-[11px] text-foreground">موظف</span>
              <span className="text-[10px] text-muted-foreground font-mono">employee</span>
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-5">
          GoldenERP V1.0 — جميع الحقوق محفوظة © 2026
        </p>
      </div>
    </div>
  );
}
