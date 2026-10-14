"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useCompany, CompanyCode } from "./company-context";
import { API_BASE_URL } from "@/lib/api";

export interface SystemNotification {
  id: string;
  companyCode: "A" | "B" | "C" | "D" | "ALL";
  type: "warning" | "info" | "success" | "danger";
  title: string;
  message: string;
  details?: string;
  time: string;
  link: string;
  actionLabel?: string;
  isRead: boolean;
}

export const initialCompanyNotifications: SystemNotification[] = [
  // --- Company A: المجموعة الذهبية (جولدن) ---
  {
    id: "notif-a1",
    companyCode: "A",
    type: "warning",
    title: "انتهاء خطاب ضمان ابتدائي (عملية شبكات الألياف A15)",
    message: "خطاب ضمان عملية A15 قارب على موعد الانتهاء (4 أيام متبقية) لدى بنك مصر فرع مدينة نصر.",
    details: "الجهة: هيئة الأبنية التعليمية • القيمة: 120,000 ج.م",
    time: "متبقي 4 أيام",
    link: "/dashboard/operations",
    actionLabel: "طلب تمديد أو استرداد",
    isRead: false,
  },
  {
    id: "notif-a2",
    companyCode: "A",
    type: "info",
    title: "جلسة فتح المظاريف الفنية — مناقصة خوادم التعليم العالي (A18)",
    message: "جلسة فتح المظاريف الفنية محددة غداً الساعة 10:00 صباحاً في مقر الوزارة.",
    details: "الجهة: وزارة التعليم العالي والبحث العلمي • عطاء شركة جولدن",
    time: "غداً 10:00 ص",
    link: "/dashboard/operations",
    actionLabel: "تفاصيل الجلسة",
    isRead: false,
  },
  {
    id: "notif-a3",
    companyCode: "A",
    type: "danger",
    title: "طلب اعتماد طباعة تظلم قانوني (A15) بانتظار قرار الإدارة",
    message: "تم رفع طلب اعتماد طباعة خطاب التظلم القانوني لعملية A15 ومطلوب اعتماد الإدارة لتوليد الهاش الأمني.",
    details: "مقدم الطلب: أحمد محمود • وثيقة تظلم استبعاد فني",
    time: "منذ ساعتين",
    link: "/dashboard/approvals?company=A",
    actionLabel: "مراجعة طلب الاعتماد",
    isRead: false,
  },
  {
    id: "notif-a4",
    companyCode: "A",
    type: "success",
    title: "تمت الترسية الرسمية — مناقصة الألياف الضوئية (A15)",
    message: "ورد إخطار الترسية المعتمد لشركة جولدن. يرجى البدء في إصدار خطاب الضمان النهائي 5% وتوقيع العقد.",
    details: "قيمة التعاقد: 2,400,000 ج.م",
    time: "أمس",
    link: "/dashboard/operations",
    actionLabel: "سجل العملية",
    isRead: true,
  },

  // --- Company B: إكسلنت (العالمية) ---
  {
    id: "notif-b1",
    companyCode: "B",
    type: "info",
    title: "استرداد خطاب ضمان نهائي — عملية خوادم جامعة حلوان (B03)",
    message: "تم صدور محضر الاستلام النهائي لمعدات الخوادم. يرجى توجيه خطاب الاسترداد للبنك (180,000 ج.م).",
    details: "الجهة: جامعة حلوان • بنك QNB الأهلي",
    time: "خلال 5 أيام",
    link: "/dashboard/operations",
    actionLabel: "إجراءات الاسترداد",
    isRead: false,
  },
  {
    id: "notif-b2",
    companyCode: "B",
    type: "warning",
    title: "جلسة الاستفسارات الفنية — مناقصة أجهزة الرصد البيئي (B04)",
    message: "موعد جلسة الاستفسارات الفنية والإجابة على الملاحظات الثلاثاء القادم 11:00 ص بمقر جهاز شؤون البيئة.",
    details: "الجهة: وزارة البيئة • رقم المناقصة: 19/2026",
    time: "الثلاثاء 11:00 ص",
    link: "/dashboard/operations",
    actionLabel: "متابعة الاستفسارات",
    isRead: false,
  },
  {
    id: "notif-b3",
    companyCode: "B",
    type: "danger",
    title: "طلب اعتماد طباعة خطاب ضمان نهائي (B03) بانتظار الاعتماد",
    message: "طلب اعتماد طباعة مستند رسمي موجه للبنك لإصدار خطاب الضمان النهائي للعملية B03.",
    details: "مقدم الطلب: كريم عبد الله • مبلغ الضمان: 180,000 ج.م",
    time: "اليوم 09:15 ص",
    link: "/dashboard/approvals?company=B",
    actionLabel: "مراجعة الاعتماد",
    isRead: false,
  },

  // --- Company C: العهد (المتحدة) ---
  {
    id: "notif-c1",
    companyCode: "C",
    type: "success",
    title: "جلسة الفتح المالي — ممارسة لوحات التوزيع والتحكم (C02)",
    message: "تم اجتياز الفحص الفني وقبول العرض بنجاح وتحديد جلسة فض المظاريف المالية بالهيئة.",
    details: "الجهة: الهيئة القومية لسكك حديد مصر • موعد الجلسة: الأربعاء 12:00 م",
    time: "الأربعاء 12:00 م",
    link: "/dashboard/operations",
    actionLabel: "بيانات الجلسة",
    isRead: false,
  },
  {
    id: "notif-c2",
    companyCode: "C",
    type: "warning",
    title: "سداد التأمين الابتدائي بخزينة الجهة — محولات كهرباء (C08)",
    message: "مطلوب إرفاق إيصال سداد التأمين الابتدائي بخزينة شركة توزيع كهرباء شمال القاهرة قبل انتهاء المهلة.",
    details: "المبلغ المطلوب: 210,000 ج.م • بنك الإسكندرية",
    time: "خلال 48 ساعة",
    link: "/dashboard/operations",
    actionLabel: "تسجيل إيصال السداد",
    isRead: false,
  },
  {
    id: "notif-c3",
    companyCode: "C",
    type: "danger",
    title: "طلب اعتماد طباعة العرض الفني النهائي (C11) قيد الانتظار",
    message: "تم تجهيز بنود كراسة الشروط لمستشفيات عين شمس وتنتظر موافقة الإدارة قبل الإرسال للطباعة المعتمدة.",
    details: "المستند: المظروف الفني المتكامل وجداول الكميات",
    time: "منذ 4 ساعات",
    link: "/dashboard/approvals?company=C",
    actionLabel: "مراجعة طلب الطباعة",
    isRead: true,
  },

  // --- Company D: الشركة الرابعة (الحديثة) ---
  {
    id: "notif-d1",
    companyCode: "D",
    type: "info",
    title: "فتح المظاريف الفنية — أنظمة الحماية بمجمع المحاكم (D02)",
    message: "انعقدت جلسة فتح المظاريف الفنية بمجمع محاكم العباسية، وجاري فحص كتالوجات ومواصفات الأجهزة المقدمة.",
    details: "الجهة: وزارة العدل • مناقصة الأقفال الذكية وأنظمة المراقبة",
    time: "اليوم 11:30 ص",
    link: "/dashboard/operations",
    actionLabel: "تقرير الفتح الفني",
    isRead: false,
  },
  {
    id: "notif-d2",
    companyCode: "D",
    type: "warning",
    title: "تجهيز عينات الفحص والمطابقة — هيئة الطاقة الذرية (D04)",
    message: "مطلوب تسليم عينات الكابلات والموصلات المعتمدة بمعامل الجودة بالهيئة خلال 3 أيام عمل رسمية.",
    details: "موقع التسليم: مقر الهيئة بمدينة نصر • إذن فحص رسمي",
    time: "متبقي 3 أيام",
    link: "/dashboard/operations",
    actionLabel: "بيانات العينات",
    isRead: false,
  },
];

interface NotificationsContextType {
  notifications: SystemNotification[];
  allNotifications: SystemNotification[];
  unreadCount: number;
  activeCompanyCode: CompanyCode;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  resetAll: () => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { selectedCompany } = useCompany();
  const [allNotifications, setAllNotifications] = useState<SystemNotification[]>(initialCompanyNotifications);

  // Load persisted read statuses or notifications from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("goldenerp_company_notifications");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAllNotifications(parsed);
        }
      }
    } catch {}
  }, []);

  const saveToStorage = (updated: SystemNotification[]) => {
    setAllNotifications(updated);
    try {
      localStorage.setItem("goldenerp_company_notifications", JSON.stringify(updated));
    } catch {}
  };

  // Sync with Backend API per active company
  const refreshNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      const apiBase = API_BASE_URL;
      const compParam = selectedCompany && selectedCompany !== "ALL" ? `?company=${selectedCompany}` : "";
      const res = await fetch(`${apiBase}/api/notifications${compParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const serverData = await res.json();
        if (Array.isArray(serverData) && serverData.length > 0) {
          // Merge server notifications with current local notifications
          setAllNotifications((prev) => {
            const mappedServer: SystemNotification[] = serverData.map((sn: any) => {
              const compCode = (sn.entityId || sn.entityType?.replace("COMPANY_", "") || selectedCompany || "A") as "A" | "B" | "C" | "D";
              return {
                id: sn.id,
                companyCode: compCode,
                type: sn.type === "GUARANTEE_EXPIRY" ? "warning" : sn.type === "APPROVAL_REQUEST" ? "danger" : sn.type === "OPERATION_UPDATE" ? "success" : "info",
                title: sn.title,
                message: sn.message,
                time: new Date(sn.createdAt).toLocaleDateString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
                link: sn.type === "APPROVAL_REQUEST" ? `/dashboard/approvals?company=${compCode}` : "/dashboard/operations",
                actionLabel: sn.type === "APPROVAL_REQUEST" ? "مراجعة الاعتماد" : sn.type === "GUARANTEE_EXPIRY" ? "متابعة الضمان" : "تفاصيل",
                isRead: sn.isRead,
              };
            });

            // Keep local items that are not in server yet
            const serverIds = new Set(mappedServer.map((m) => m.id));
            const retainedLocal = prev.filter((p) => !serverIds.has(p.id));
            const merged = [...mappedServer, ...retainedLocal];
            try {
              localStorage.setItem("goldenerp_company_notifications", JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      }
    } catch {
      // Graceful fallback to rich local state
    }
  }, [selectedCompany]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // Filter notifications strictly for the active company!
  const notifications = useMemo(() => {
    if (!selectedCompany || selectedCompany === "ALL") {
      return allNotifications;
    }
    return allNotifications.filter(
      (n) => n.companyCode === selectedCompany || n.companyCode === "ALL"
    );
  }, [allNotifications, selectedCompany]);

  // Unread count strictly for active company
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const markAsRead = async (id: string) => {
    const updated = allNotifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    saveToStorage(updated);
    toast.success("تم تعيين التنبيه كمقروء");

    // Patch to server asynchronously
    try {
      const token = localStorage.getItem("accessToken");
      if (token) {
        const apiBase = API_BASE_URL;
        fetch(`${apiBase}/api/notifications/${id}/read`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } catch {}
  };

  const markAllAsRead = async () => {
    const targetComp = selectedCompany && selectedCompany !== "ALL" ? selectedCompany : null;
    const updated = allNotifications.map((n) => {
      if (!targetComp || n.companyCode === targetComp || n.companyCode === "ALL") {
        return { ...n, isRead: true };
      }
      return n;
    });

    saveToStorage(updated);
    toast.success(`تم تعيين إشعارات شركة ${selectedCompany} كمقروءة بالكامل`);

    // Patch to server
    try {
      const token = localStorage.getItem("accessToken");
      if (token) {
        const apiBase = API_BASE_URL;
        const query = targetComp ? `?company=${targetComp}` : "";
        fetch(`${apiBase}/api/notifications/read-all${query}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } catch {}
  };

  const resetAll = () => {
    saveToStorage(initialCompanyNotifications);
    toast.info("تم إعادة تعيين إشعارات الشركات للحالة الأصلية");
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        allNotifications,
        unreadCount,
        activeCompanyCode: selectedCompany,
        markAsRead,
        markAllAsRead,
        resetAll,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}
