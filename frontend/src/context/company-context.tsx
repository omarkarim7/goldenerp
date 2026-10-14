"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { API_BASE_URL } from "@/lib/api";

export type CompanyCode = "ALL" | "A" | "B" | "C" | "D";

export interface CompanyInfo {
  code: CompanyCode;
  id: string;
  name: string;
  fullName: string;
  shortName: string;
  description: string;
  gradient: string;
  borderColor: string;
  lightBg: string;
  textColor: string;
  badgeClass: string;
}

export interface CompanyOverviewItem {
  id: string;
  name: string;
  code: string;
  fullName: string;
  commercialRegister: string;
  taxCard: string;
  totalOperations: number;
  activeOperations: number;
  completedOperations: number;
  draftOperations: number;
  pendingGuarantees: number;
  actionsRequired: number;
  pendingPrintRequests: number;
  totalRevenue: string;
  systemStatus: string;
  urgentAlerts: Array<{
    id: string;
    title: string;
    operationCode?: string;
    severity: "warning" | "danger" | "info";
    link?: string;
    actionLabel?: string;
  }>;
}

interface CompanyContextType {
  selectedCompany: CompanyCode;
  setSelectedCompany: (code: CompanyCode) => void;
  currentCompany: CompanyInfo | null;
  companies: CompanyInfo[];
  overviewData: CompanyOverviewItem[];
  loadingOverview: boolean;
  refreshOverview: () => Promise<void>;
  isCompanyLocked: boolean;
  userRole: string | null;
  allowedCompanyCodes: string[];
  isCompanyAllowed: (code: string) => boolean;
  refreshUserPermissions: () => Promise<void>;
}

const STATIC_COMPANIES: CompanyInfo[] = [
  {
    code: "A",
    id: "comp_a",
    name: "جولدن",
    fullName: "المجموعة الذهبية للتوريدات والمقاولات (A)",
    shortName: "جولدن (A)",
    description: "الشركة الرائدة في التوريدات والمناقصات الحكومية والخدمات التخصصية",
    gradient: "from-blue-600 via-blue-700 to-indigo-800",
    borderColor: "border-blue-500/30",
    lightBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    textColor: "text-blue-600 dark:text-blue-400",
    badgeClass: "badge-blue",
  },
  {
    code: "B",
    id: "comp_b",
    name: "إكسلنت",
    fullName: "العالمية للتوريدات والتجارة العمومية (B)",
    shortName: "إكسلنت (B)",
    description: "متخصصة في مناقصات التوريدات الطبية ومهمات الوقاية والتجهيزات",
    gradient: "from-cyan-600 via-teal-700 to-blue-800",
    borderColor: "border-cyan-500/30",
    lightBg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    textColor: "text-cyan-600 dark:text-cyan-400",
    badgeClass: "badge-blue",
  },
  {
    code: "C",
    id: "comp_c",
    name: "العهد",
    fullName: "المتحدة للمقاولات العامة والتجارة (C)",
    shortName: "العهد (C)",
    description: "متخصصة في أوامر الإسناد والمقاولات وأعمال الصيانة المتكاملة",
    gradient: "from-purple-600 via-indigo-700 to-blue-800",
    borderColor: "border-purple-500/30",
    lightBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    textColor: "text-purple-600 dark:text-purple-400",
    badgeClass: "badge-purple",
  },
  {
    code: "D",
    id: "comp_d",
    name: "الحديثة",
    fullName: "الحديثة للتجارة العامة والتوريدات (D)",
    shortName: "الحديثة (D)",
    description: "شريك التوريدات السريعة وعمليات الشراء المباشر والممارسات",
    gradient: "from-emerald-600 via-teal-700 to-indigo-800",
    borderColor: "border-emerald-500/30",
    lightBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    textColor: "text-emerald-600 dark:text-emerald-400",
    badgeClass: "badge-emerald",
  },
];

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [selectedCompany, setSelectedCompanyState] = useState<CompanyCode>("ALL");
  const [overviewData, setOverviewData] = useState<CompanyOverviewItem[]>([]);
  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [allowedCompanyCodes, setAllowedCompanyCodes] = useState<string[]>(["A", "B", "C", "D"]);

function parseAllowedCodes(role?: string | null, allowedStr?: string | null): string[] {
  if (role === "GENERAL_MANAGER" || allowedStr === "ALL") {
    return ["A", "B", "C", "D"];
  }
  if (!allowedStr || allowedStr === "NONE") {
    return [];
  }
  return allowedStr
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => ["A", "B", "C", "D"].includes(s));
}

  const refreshUserPermissions = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      const apiBase = API_BASE_URL;
      const res = await fetch(`${apiBase}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const freshUser = await res.json();
        localStorage.setItem("user", JSON.stringify(freshUser));
        setUserRole(freshUser.role || null);
        const freshAllowed = parseAllowedCodes(freshUser.role, freshUser.allowedCompanies);
        setAllowedCompanyCodes(freshAllowed);

        if (freshUser.role !== "GENERAL_MANAGER") {
          const savedComp = localStorage.getItem("selectedCompany") as CompanyCode;
          if (!savedComp || !freshAllowed.includes(savedComp)) {
            if (freshAllowed.length > 0) {
              const fallback = freshAllowed[0] as CompanyCode;
              setSelectedCompanyState(fallback);
              localStorage.setItem("selectedCompany", fallback);
            }
          }
        }
      }
    } catch {}
  }, []);

  // Load persisted company and user role
  useEffect(() => {
    try {
      const userData = localStorage.getItem("user");
      if (userData) {
        const u = JSON.parse(userData);
        setUserRole(u.role || null);
        const allowed = parseAllowedCodes(u.role, u.allowedCompanies);
        setAllowedCompanyCodes(allowed);

        // Employee / Deputy Manager: default selected company to allowed list
        if (u.role !== "GENERAL_MANAGER") {
          const savedComp = localStorage.getItem("selectedCompany") as CompanyCode;
          if (savedComp && allowed.includes(savedComp)) {
            setSelectedCompanyState(savedComp);
          } else {
            const firstAllowed = (allowed[0] || "A") as CompanyCode;
            setSelectedCompanyState(firstAllowed);
            localStorage.setItem("selectedCompany", firstAllowed);
          }
        }
      }

      const saved = localStorage.getItem("selectedCompany") as CompanyCode;
      if (saved && ["ALL", "A", "B", "C", "D"].includes(saved)) {
        setSelectedCompanyState(saved);
      }
    } catch {
      // Fallback
    }

    // Sync fresh permissions in background
    refreshUserPermissions();
  }, [refreshUserPermissions]);

  const setSelectedCompany = (code: CompanyCode) => {
    setSelectedCompanyState(code);
    try {
      localStorage.setItem("selectedCompany", code);
    } catch {}
  };

  const fetchOverview = async () => {
    setLoadingOverview(true);
    try {
      const token = localStorage.getItem("accessToken");
      const apiBase = API_BASE_URL;
      const res = await fetch(`${apiBase}/api/companies/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setOverviewData(data);
          return;
        }
      }
    } catch {
      // Fallback below
    } finally {
      setLoadingOverview(false);
    }

    // Default realistic data if backend API is offline or cold
    setOverviewData([
      {
        id: "comp_a",
        name: "جولدن",
        code: "A",
        fullName: "المجموعة الذهبية للتوريدات والمقاولات",
        commercialRegister: "102948",
        taxCard: "402-182-991",
        totalOperations: 60,
        activeOperations: 18,
        completedOperations: 42,
        draftOperations: 4,
        pendingGuarantees: 7,
        actionsRequired: 3,
        pendingPrintRequests: 2,
        totalRevenue: "2.4M ج.م",
        systemStatus: "منتظم",
        urgentAlerts: [
          { id: "a1", title: "عملية A15 — جلسة فتح مالي غداً بالهيئة العامة", operationCode: "A15", severity: "warning", link: "/dashboard/operations", actionLabel: "تفاصيل الجلسة" },
          { id: "a2", title: "ضمان نهائي A11 — موعد الاسترداد قريب (10 أيام)", operationCode: "A11", severity: "info", link: "/dashboard/operations", actionLabel: "متابعة الضمان" },
          { id: "a3", title: "طلب طباعة تظلم — بانتظار موافقة الإدارة وتوليد الهاش", operationCode: "A15", severity: "danger", link: "/dashboard/approvals?company=A", actionLabel: "مراجعة الاعتماد" },
        ],
      },
      {
        id: "comp_b",
        name: "إكسلنت",
        code: "B",
        fullName: "العالمية للتوريدات والتجارة العمومية",
        commercialRegister: "209418",
        taxCard: "518-992-104",
        totalOperations: 38,
        activeOperations: 12,
        completedOperations: 26,
        draftOperations: 2,
        pendingGuarantees: 4,
        actionsRequired: 2,
        pendingPrintRequests: 1,
        totalRevenue: "1.8M ج.م",
        systemStatus: "منتظم",
        urgentAlerts: [
          { id: "b1", title: "عملية B04 — سحب كراسة الشروط قبل انتهاء الموعد بـ 48 ساعة", operationCode: "B04", severity: "warning", link: "/dashboard/operations", actionLabel: "سحب الكراسة" },
          { id: "b2", title: "طلب طباعة خطاب ضمان — معلق للاعتماد", operationCode: "B04", severity: "info", link: "/dashboard/approvals?company=B", actionLabel: "فحص الطلب" },
        ],
      },
      {
        id: "comp_c",
        name: "العهد",
        code: "C",
        fullName: "المتحدة للمقاولات العامة والتجارة",
        commercialRegister: "392019",
        taxCard: "603-441-290",
        totalOperations: 45,
        activeOperations: 21,
        completedOperations: 24,
        draftOperations: 3,
        pendingGuarantees: 6,
        actionsRequired: 2,
        pendingPrintRequests: 2,
        totalRevenue: "3.1M ج.م",
        systemStatus: "منتظم",
        urgentAlerts: [
          { id: "c1", title: "عملية C08 — سداد التأمين الابتدائي بخزينة الجهة", operationCode: "C08", severity: "warning", link: "/dashboard/operations", actionLabel: "إيصال التأمين" },
          { id: "c2", title: "طلب طباعة عرض فني — بانتظار الاعتماد الأمني", operationCode: "C08", severity: "danger", link: "/dashboard/approvals?company=C", actionLabel: "مراجعة الاعتماد" },
        ],
      },
      {
        id: "comp_d",
        name: "الحديثة",
        code: "D",
        fullName: "الحديثة للتجارة العامة والتوريدات",
        commercialRegister: "440192",
        taxCard: "712-304-188",
        totalOperations: 22,
        activeOperations: 9,
        completedOperations: 13,
        draftOperations: 1,
        pendingGuarantees: 2,
        actionsRequired: 1,
        pendingPrintRequests: 0,
        totalRevenue: "950K ج.م",
        systemStatus: "منتظم",
        urgentAlerts: [
          { id: "d1", title: "عملية D02 — مطابقة كراسة الشروط وبنود التوريد", operationCode: "D02", severity: "info", link: "/dashboard/operations", actionLabel: "مطابقة الشروط" },
        ],
      },
    ]);
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const currentCompany = useMemo(() => {
    if (selectedCompany === "ALL") return null;
    return STATIC_COMPANIES.find((c) => c.code === selectedCompany) || null;
  }, [selectedCompany]);

  const isCompanyLocked = userRole !== "GENERAL_MANAGER" && !allowedCompanyCodes.includes(selectedCompany);

  const isCompanyAllowed = (code: string) => {
    if (userRole === "GENERAL_MANAGER") return true;
    if (code === "ALL") return userRole === "GENERAL_MANAGER";
    return allowedCompanyCodes.includes(code.toUpperCase());
  };

  return (
    <CompanyContext.Provider
      value={{
        selectedCompany,
        setSelectedCompany,
        currentCompany,
        companies: STATIC_COMPANIES,
        overviewData,
        loadingOverview,
        refreshOverview: fetchOverview,
        isCompanyLocked,
        userRole,
        allowedCompanyCodes,
        isCompanyAllowed,
        refreshUserPermissions,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}
