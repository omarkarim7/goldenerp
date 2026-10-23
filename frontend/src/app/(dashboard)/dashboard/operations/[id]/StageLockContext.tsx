"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { toast } from "sonner";

export type StageApprovalStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED";

interface StageLockContextType {
  lockedStages: Record<string, boolean>;
  stageStatuses: Record<string, StageApprovalStatus>;
  isStageLocked: (stageId: string) => boolean;
  getStageStatus: (stageId: string) => StageApprovalStatus;
  toggleStageLock: (stageId: string, stageName?: string) => void;
  lockStage: (stageId: string, stageName?: string) => void;
  unlockStage: (stageId: string, stageName?: string) => void;
  submitStageForReview: (stageId: string, stageName?: string) => void;
  approveStage: (stageId: string, stageName?: string) => void;
  returnStageForRevision: (stageId: string, stageName?: string, reason?: string) => void;
  currentUserRole: "GENERAL_MANAGER" | "DEPUTY_MANAGER" | "EMPLOYEE";
  isManagerOrDeputy: boolean;
  canAccessNextStage: (currentStageId: string) => boolean;
}

const StageLockContext = createContext<StageLockContextType | null>(null);

export function StageLockProvider({
  opId,
  children,
}: {
  opId: string;
  children: React.ReactNode;
}) {
  const [lockedStages, setLockedStages] = useState<Record<string, boolean>>({});
  const [stageStatuses, setStageStatuses] = useState<Record<string, StageApprovalStatus>>({});
  const [currentUserRole, setCurrentUserRole] = useState<"GENERAL_MANAGER" | "DEPUTY_MANAGER" | "EMPLOYEE">("GENERAL_MANAGER");

  useEffect(() => {
    // Load current user role
    try {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.role === "DEPUTY_MANAGER") setCurrentUserRole("DEPUTY_MANAGER");
        else if (u.role === "EMPLOYEE") setCurrentUserRole("EMPLOYEE");
        else setCurrentUserRole("GENERAL_MANAGER");
      }
    } catch {}
  }, []);

  const isManagerOrDeputy = useMemo(() => {
    return currentUserRole === "GENERAL_MANAGER" || currentUserRole === "DEPUTY_MANAGER";
  }, [currentUserRole]);

  useEffect(() => {
    if (!opId) return;
    try {
      const savedLocks = localStorage.getItem(`op_locked_stages_${opId}`);
      if (savedLocks) {
        setLockedStages(JSON.parse(savedLocks));
      }
      const savedStatuses = localStorage.getItem(`op_stage_statuses_${opId}`);
      if (savedStatuses) {
        setStageStatuses(JSON.parse(savedStatuses));
      }
    } catch (err) {
      console.error("Error loading stage locks and statuses:", err);
    }
  }, [opId]);

  const persistLocks = (updated: Record<string, boolean>) => {
    setLockedStages(updated);
    if (opId) {
      try {
        localStorage.setItem(`op_locked_stages_${opId}`, JSON.stringify(updated));
        window.dispatchEvent(
          new CustomEvent("stage-lock-updated", { detail: { opId, lockedStages: updated } })
        );
      } catch (err) {
        console.error("Error saving locked stages:", err);
      }
    }
  };

  const persistStatuses = (updated: Record<string, StageApprovalStatus>) => {
    setStageStatuses(updated);
    if (opId) {
      try {
        localStorage.setItem(`op_stage_statuses_${opId}`, JSON.stringify(updated));
        window.dispatchEvent(
          new CustomEvent("stage-status-updated", { detail: { opId, stageStatuses: updated } })
        );
      } catch (err) {
        console.error("Error saving stage statuses:", err);
      }
    }
  };

  const isStageLocked = (stageId: string): boolean => {
    return !!lockedStages[stageId];
  };

  const getStageStatus = (stageId: string): StageApprovalStatus => {
    return stageStatuses[stageId] || (lockedStages[stageId] ? "APPROVED" : "DRAFT");
  };

  const lockStage = (stageId: string, stageName?: string) => {
    if (!isManagerOrDeputy) {
      toast.error("عذراً، قفل المراحل وتثبيتها مقتصر حصرياً على المدير العام ونائب المدير.");
      return;
    }
    const updated = { ...lockedStages, [stageId]: true };
    persistLocks(updated);
    toast.success(
      `تم قفل مرحلة "${stageName || stageId}" واعتمادها 🔒 — تم تفعيل الحماية وتجميد البيانات لمنع أي تعديل بالخطأ.`
    );
  };

  const unlockStage = (stageId: string, stageName?: string) => {
    if (!isManagerOrDeputy) {
      toast.error("عذراً، فتح التعديلات للمراحل المقفولة والمعتمدة مقتصر حصرياً على المدير العام ونائب المدير.");
      return;
    }
    const updated = { ...lockedStages, [stageId]: false };
    persistLocks(updated);
    toast.info(
      `تم فتح التعديلات لمرحلة "${stageName || stageId}" 🔓 — يمكنك الآن تحرير وتعديل البيانات بكل حرية.`
    );
  };

  const toggleStageLock = (stageId: string, stageName?: string) => {
    if (!isManagerOrDeputy) {
      toast.error("عذراً، التحكم في قفل أو فتح المراحل مقتصر حصرياً على الإدارة العليا.");
      return;
    }
    if (isStageLocked(stageId)) {
      unlockStage(stageId, stageName);
    } else {
      lockStage(stageId, stageName);
    }
  };

  // الموظف: يحفظ البيانات ويرسلها لمراجعة واعتماد الإدارة
  const submitStageForReview = (stageId: string, stageName?: string) => {
    const updated = { ...stageStatuses, [stageId]: "PENDING_REVIEW" as StageApprovalStatus };
    persistStatuses(updated);
    toast.success(
      `تم حفظ بيانات مرحلة "${stageName || stageId}" بنجاح! 📥 — جاري المراجعة من المدير العام أو النائب للموافقة عليها قبل الانتقال للمرحلة التالية.`
    );
  };

  // المدير أو النائب: اعتماد المرحلة وقفلها وتصريح الانتقال
  const approveStage = (stageId: string, stageName?: string) => {
    const updatedStatuses = { ...stageStatuses, [stageId]: "APPROVED" as StageApprovalStatus };
    const updatedLocks = { ...lockedStages, [stageId]: true };
    persistStatuses(updatedStatuses);
    persistLocks(updatedLocks);
    toast.success(
      `تم اعتماد مرحلة "${stageName || stageId}" رسمياً بواسطة الإدارة! ✅ تم قفل المرحلة وتصريح الانتقال للمرحلة التالية.`
    );
  };

  // المدير أو النائب: إعادة المرحلة للتعديل
  const returnStageForRevision = (stageId: string, stageName?: string, reason?: string) => {
    const updatedStatuses = { ...stageStatuses, [stageId]: "DRAFT" as StageApprovalStatus };
    const updatedLocks = { ...lockedStages, [stageId]: false };
    persistStatuses(updatedStatuses);
    persistLocks(updatedLocks);
    toast.warning(
      `تمت إعادة مرحلة "${stageName || stageId}" للتعديل ↺ — ${reason || "يرجى استيفاء الملاحظات والبيانات المطلوبة قبل إعادة الإرسال."}`
    );
  };

  // التحقق من إمكانية الانتقال للمرحلة التالية:
  // المدير والنائب: مسموح لهم دائماً
  // الموظف: مسموح له فقط إذا كانت المرحلة الحالية APPROVED
  const canAccessNextStage = (currentStageId: string): boolean => {
    if (isManagerOrDeputy) return true;
    const status = getStageStatus(currentStageId);
    return status === "APPROVED";
  };

  return (
    <StageLockContext.Provider
      value={{
        lockedStages,
        stageStatuses,
        isStageLocked,
        getStageStatus,
        toggleStageLock,
        lockStage,
        unlockStage,
        submitStageForReview,
        approveStage,
        returnStageForRevision,
        currentUserRole,
        isManagerOrDeputy,
        canAccessNextStage,
      }}
    >
      {children}
    </StageLockContext.Provider>
  );
}

export function useStageLock() {
  const ctx = useContext(StageLockContext);
  if (!ctx) {
    return {
      lockedStages: {},
      stageStatuses: {},
      isStageLocked: () => false,
      getStageStatus: () => "DRAFT" as StageApprovalStatus,
      toggleStageLock: () => {},
      lockStage: () => {},
      unlockStage: () => {},
      submitStageForReview: () => {},
      approveStage: () => {},
      returnStageForRevision: () => {},
      currentUserRole: "GENERAL_MANAGER" as const,
      isManagerOrDeputy: true,
      canAccessNextStage: () => true,
    };
  }
  return ctx;
}
