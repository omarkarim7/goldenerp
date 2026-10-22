"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";

interface StageLockContextType {
  lockedStages: Record<string, boolean>;
  isStageLocked: (stageId: string) => boolean;
  toggleStageLock: (stageId: string, stageName?: string) => void;
  lockStage: (stageId: string, stageName?: string) => void;
  unlockStage: (stageId: string, stageName?: string) => void;
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

  useEffect(() => {
    if (!opId) return;
    try {
      const saved = localStorage.getItem(`op_locked_stages_${opId}`);
      if (saved) {
        setLockedStages(JSON.parse(saved));
      }
    } catch (err) {
      console.error("Error loading locked stages:", err);
    }
  }, [opId]);

  const persist = (updated: Record<string, boolean>) => {
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

  const isStageLocked = (stageId: string): boolean => {
    return !!lockedStages[stageId];
  };

  const lockStage = (stageId: string, stageName?: string) => {
    const updated = { ...lockedStages, [stageId]: true };
    persist(updated);
    toast.success(
      `تم قفل مرحلة "${stageName || stageId}" واعتمادها 🔒 — تم تفعيل الحماية وتجميد البيانات لمنع أي تعديل بالخطأ.`
    );
  };

  const unlockStage = (stageId: string, stageName?: string) => {
    const updated = { ...lockedStages, [stageId]: false };
    persist(updated);
    toast.info(
      `تم فتح التعديلات لمرحلة "${stageName || stageId}" 🔓 — يمكنك الآن تحرير وتعديل البيانات بكل حرية.`
    );
  };

  const toggleStageLock = (stageId: string, stageName?: string) => {
    if (isStageLocked(stageId)) {
      unlockStage(stageId, stageName);
    } else {
      lockStage(stageId, stageName);
    }
  };

  return (
    <StageLockContext.Provider
      value={{
        lockedStages,
        isStageLocked,
        toggleStageLock,
        lockStage,
        unlockStage,
      }}
    >
      {children}
    </StageLockContext.Provider>
  );
}

export function useStageLock() {
  const ctx = useContext(StageLockContext);
  if (!ctx) {
    // Return safe fallback if used outside of provider
    return {
      lockedStages: {},
      isStageLocked: () => false,
      toggleStageLock: () => {},
      lockStage: () => {},
      unlockStage: () => {},
    };
  }
  return ctx;
}
