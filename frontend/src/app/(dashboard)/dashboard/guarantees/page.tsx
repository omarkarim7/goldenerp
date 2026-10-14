"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GuaranteesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to operations lifecycle where guarantees are now managed
    router.replace("/dashboard/operations");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 space-y-4 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
        <Shield className="h-8 w-8" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h2 className="text-xl font-bold text-foreground">تم دمج إدارة الضمانات داخل دورة حياة العمليات</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          يتم الآن تتبع وإصدار خطابات الضمان والتأمينات الابتدائية والنهائية مباشرة داخل ملف كل عملية بمراحلها المعتمدة. جاري تحويلك إلى سجل العمليات...
        </p>
      </div>
      <Link href="/dashboard/operations">
        <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl px-5 h-9 cursor-pointer">
          <span>الانتقال إلى العمليات الآن</span>
          <ArrowRight className="h-4 w-4 mr-1.5" />
        </Button>
      </Link>
    </div>
  );
}
