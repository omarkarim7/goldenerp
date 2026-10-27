"use client";

import api from "@/lib/api";
import { Operation } from "./types";

export interface ArchivedDocVersion {
  version: number;
  docId: string;
  fileName: string;
  date: string;
  snapshot?: string;
  registrationNumber?: string;
  fileUrl?: string;
}

export interface ArchiveInfo {
  isArchived: boolean;
  currentVersion: number;
  latestEntry: ArchivedDocVersion | null;
  versionsList: ArchivedDocVersion[];
}

/**
 * دالة قراءة تفاصيل الأرشيف والنسخة الحالية لمستند محدد
 */
export function getArchivedLetterInfo(op: Operation, docKey: string): ArchiveInfo {
  let notesObj: any = {};
  try {
    if (op.notes && op.notes.startsWith("{")) {
      notesObj = JSON.parse(op.notes);
    }
  } catch {}

  const archivedIds: string[] = notesObj.archivedDocIds || [];
  const versionsMap: Record<string, ArchivedDocVersion[]> = notesObj.archivedDocVersions || {};
  const pdfsMap: Record<string, ArchivedDocVersion> = notesObj.archivedDocPdfs || {};

  const versionsList = versionsMap[docKey] || [];
  const latestEntry = pdfsMap[docKey] || (versionsList.length > 0 ? versionsList[versionsList.length - 1] : null);

  const isArchived = archivedIds.includes(docKey) || !!latestEntry;
  const currentVersion = latestEntry?.version || (versionsList.length > 0 ? versionsList[versionsList.length - 1].version : isArchived ? 1 : 0);

  return {
    isArchived,
    currentVersion,
    latestEntry,
    versionsList,
  };
}

/**
 * دالة حفظ المستند في أرشيف العملية مع الترقيم التلقائي للإصدارات (نسخة رقم 1، نسخة رقم 2، إلخ)
 */
export async function saveLetterToArchiveWithVersion({
  op,
  docKey,
  title,
  pdfBlob,
  currentSnapshot,
  docType = "LETTER",
  companyId,
  registrationNumber,
}: {
  op: Operation;
  docKey: string;
  title: string;
  pdfBlob: Blob;
  currentSnapshot?: string;
  docType?: string;
  companyId?: string;
  registrationNumber?: string;
}): Promise<{ version: number; versionName: string; docId: string }> {
  let notesObj: any = {};
  try {
    if (op.notes && op.notes.startsWith("{")) {
      notesObj = JSON.parse(op.notes);
    }
  } catch {}

  if (!notesObj.archivedDocIds) notesObj.archivedDocIds = [];
  if (!notesObj.archivedDocVersions) notesObj.archivedDocVersions = {};
  if (!notesObj.archivedDocPdfs) notesObj.archivedDocPdfs = {};

  const existingVersions: ArchivedDocVersion[] = notesObj.archivedDocVersions[docKey] || [];
  const nextVersion = existingVersions.length + 1;

  // تسمية النسخة: إذا كانت أول مرة -> اسم الخطاب، وإذا تكررت -> اسم الخطاب - نسخة رقم N
  const versionName =
    nextVersion === 1 ? `${title}.pdf` : `${title} - نسخة رقم ${nextVersion}.pdf`;

  const cleanTitleWithoutPdf = versionName.replace(/\.pdf$/i, "");

  // رفع الملف كوثيقة رسمية بالأرشيف
  const formData = new FormData();
  formData.append("file", pdfBlob, versionName);
  formData.append("fileName", cleanTitleWithoutPdf);
  formData.append("type", docType);
  if (companyId) {
    formData.append("companyId", companyId);
  }

  let savedDocId = "";
  try {
    const res = await api.post(`/operations/${op.id}/documents`, formData);
    savedDocId = res.data?.id || "";
  } catch (err: any) {
    console.warn("Could not upload to documents endpoint:", err);
  }

  const versionEntry: ArchivedDocVersion = {
    version: nextVersion,
    docId: savedDocId,
    fileName: versionName,
    date: new Date().toISOString(),
    snapshot: currentSnapshot,
    registrationNumber,
  };

  // تسجيل وحفظ النسخة في سجل النسخ وتحديث النسخة النشطة
  notesObj.archivedDocVersions[docKey] = [...existingVersions, versionEntry];
  notesObj.archivedDocPdfs[docKey] = versionEntry;

  if (!notesObj.archivedDocIds.includes(docKey)) {
    notesObj.archivedDocIds.push(docKey);
  }

  await api.patch(`/operations/${op.id}`, {
    notes: JSON.stringify(notesObj),
  });

  return {
    version: nextVersion,
    versionName,
    docId: savedDocId,
  };
}

/**
 * دالة التحميل الفوري للمستند المؤرشف بدون أي إعادة توليد (0ms Instant Load)
 */
export async function loadArchivedPdfBlob(
  op: Operation,
  docKey: string
): Promise<{ blob: Blob; version: number; fileName: string } | null> {
  const info = getArchivedLetterInfo(op, docKey);
  if (!info.isArchived) {
    return null;
  }

  const latestDocId = info.latestEntry?.docId;
  const matchDoc = latestDocId
    ? (op.documents || []).find((d: any) => d.id === latestDocId)
    : (op.documents || []).find((d: any) => d.fileName?.includes(docKey) || d.type === "BOOKLET" || d.type === "LETTER");

  // 1. إذا كان الملف مخزناً كـ base64 داخل filePath في قاعدة البيانات
  if (matchDoc?.filePath && matchDoc.filePath.startsWith("data:application/pdf;base64,")) {
    try {
      const base64Data = matchDoc.filePath.split(",")[1];
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      return {
        blob,
        version: info.currentVersion || 1,
        fileName: matchDoc.fileName || info.latestEntry?.fileName || "document.pdf",
      };
    } catch {}
  }

  // 2. إذا كان لدينا docId، نقوم بجلبه عبر الرابط المباشر
  const docIdToFetch = matchDoc?.id || latestDocId;
  if (docIdToFetch) {
    try {
      const res = await api.get(`/operations/${op.id}/documents/${docIdToFetch}/file`, {
        responseType: "blob",
      });
      if (res.data && res.data.size > 0) {
        return {
          blob: res.data,
          version: info.currentVersion || 1,
          fileName: matchDoc?.fileName || info.latestEntry?.fileName || "document.pdf",
        };
      }
    } catch {}
  }

  return null;
}
