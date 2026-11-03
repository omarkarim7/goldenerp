"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useCompany, CompanyCode } from "./company-context";
import api from "@/lib/api";

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

// Zero mock notifications - completely clean and real
export const initialCompanyNotifications: SystemNotification[] = [];

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
  const { selectedCompany, userRole } = useCompany();
  const [allNotifications, setAllNotifications] = useState<SystemNotification[]>([]);

  // Purge any legacy dummy mock notifications from browser storage permanently
  useEffect(() => {
    try {
      localStorage.removeItem("goldenerp_company_notifications");
      sessionStorage.removeItem("goldenerp_company_notifications");
    } catch {}
  }, []);

  const saveToStorage = (updated: SystemNotification[]) => {
    setAllNotifications(updated);
  };

  // Sync strictly with Real Backend API notifications
  const refreshNotifications = useCallback(async () => {
    try {
      const compParam = selectedCompany && selectedCompany !== "ALL" ? `?company=${selectedCompany}` : "";
      const res = await api.get(`/notifications${compParam}`);

      if (res.data) {
        const serverData = res.data;
        if (Array.isArray(serverData)) {
          const mappedServer: SystemNotification[] = serverData.map((sn: any) => {
            let compCode: "A" | "B" | "C" | "D" | "ALL" = "ALL";
            if (sn.companyCode && ["A", "B", "C", "D", "ALL"].includes(sn.companyCode)) {
              compCode = sn.companyCode;
            } else if (sn.entityId && ["A", "B", "C", "D"].includes(sn.entityId)) {
              compCode = sn.entityId;
            } else if (sn.entityType?.startsWith("COMPANY_")) {
              compCode = sn.entityType.replace("COMPANY_", "") as any;
            }

            const mappedType: SystemNotification["type"] =
              sn.type === "GUARANTEE_EXPIRY"
                ? "warning"
                : sn.type === "APPROVAL_REQUEST" || sn.type === "SECURITY_ALERT"
                ? "danger"
                : sn.type === "OPERATION_UPDATE"
                ? "success"
                : "info";

            const formattedTime = sn.createdAt
              ? new Date(sn.createdAt).toLocaleDateString("ar-EG", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "numeric",
                  month: "numeric",
                })
              : "الآن";

            return {
              id: String(sn.id),
              companyCode: compCode,
              type: mappedType,
              title: sn.title || "تنبيه نظام جديد",
              message: sn.message || "",
              details: sn.details || (sn.entityType && sn.entityType !== "APPROVAL" && sn.entityType !== "GUARANTEE" ? `التصنيف: ${sn.entityType}` : undefined),
              time: formattedTime,
              link: sn.link || (sn.type === "APPROVAL_REQUEST" ? `/dashboard/approvals?company=${compCode === "ALL" ? "" : compCode}` : "/dashboard/operations"),
              actionLabel: sn.actionLabel || (sn.type === "APPROVAL_REQUEST" ? "مراجعة الاعتماد" : sn.type === "GUARANTEE_EXPIRY" ? "متابعة الضمان" : "عرض التفاصيل"),
              isRead: Boolean(sn.isRead),
            };
          });

          // Replace completely with server records — no lingering mock items!
          setAllNotifications(mappedServer);
        }
      }
    } catch {
      // Graceful fallback without re-injecting fake mock data
    }
  }, [selectedCompany]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // Periodic background check every 45 seconds for real live updates
  useEffect(() => {
    const timer = setInterval(() => {
      refreshNotifications();
    }, 45000);
    return () => clearInterval(timer);
  }, [refreshNotifications]);

  // Filter notifications strictly for active company and user role
  const notifications = useMemo(() => {
    const isManagerOrDeputy = userRole === "GENERAL_MANAGER" || userRole === "DEPUTY_MANAGER";
    let list = allNotifications;

    if (selectedCompany && selectedCompany !== "ALL") {
      list = list.filter(
        (n) => n.companyCode === selectedCompany || n.companyCode === "ALL"
      );
    }

    // Regular employees should not see manager approval action alerts
    if (!isManagerOrDeputy) {
      list = list.filter(
        (n) =>
          !n.title.includes("اعتماد الإدارة") &&
          !n.title.includes("قرار واعتماد") &&
          !n.actionLabel?.includes("مراجعة الاعتماد")
      );
    }

    return list;
  }, [allNotifications, selectedCompany, userRole]);

  // Unread count strictly for active view
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const markAsRead = async (id: string) => {
    const updated = allNotifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    saveToStorage(updated);
    toast.success("تم تعيين التنبيه كمقروء");

    // Patch to server asynchronously
    try {
      await api.patch(`/notifications/${id}/read`);
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
    toast.success(targetComp ? `تم تعيين إشعارات شركة ${selectedCompany} كمقروءة` : "تم تعيين كافة الإشعارات كمقروءة");

    // Patch to server
    try {
      const query = targetComp ? `?company=${targetComp}` : "";
      await api.patch(`/notifications/read-all${query}`);
    } catch {}
  };

  const resetAll = () => {
    localStorage.removeItem("goldenerp_company_notifications");
    setAllNotifications([]);
    refreshNotifications();
    toast.info("تم تحديث ومزامنة الإشعارات الفعلية من الخادم");
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
