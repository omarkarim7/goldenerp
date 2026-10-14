import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { NotificationsProvider } from "@/context/notifications-context";
import { CompanyProvider } from "@/context/company-context";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "GoldenERP — نظام إدارة المناقصات والمشتريات",
  description:
    "نظام متكامل لإدارة المناقصات والمشتريات الحكومية والتأمينات والمخازن",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning data-scroll-behavior="smooth" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-cairo)] bg-background text-foreground transition-colors duration-200">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <TooltipProvider>
            <CompanyProvider>
              <NotificationsProvider>
                {children}
                <Toaster position="top-center" richColors />
              </NotificationsProvider>
            </CompanyProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
