"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DocumentsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/companies");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-3xl bg-blue-600/15 text-blue-600 dark:text-blue-400 flex items-center justify-center animate-pulse shadow-lg">
        <Building2 className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-black text-foreground">
        تم دمج وإدارة مستندات الشركات في صفحة بيانات الشركة الرسمية
      </h2>
      <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
        بناءً على توجيهات الإدارة، تم نقل وإدارة كافة المستندات الرسمية، الرفع، التعديل، الحذف، والمعاينة داخل صفحة بيانات الشركة الرسمية.
      </p>
      <Link href="/dashboard/companies">
        <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-10 px-5 flex items-center gap-2 cursor-pointer shadow-md shadow-blue-600/20">
          <span>الانتقال إلى أرشيف وبيانات الشركة الآن</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
