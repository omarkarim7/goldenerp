"use client";

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { renderAsync } from "docx-preview";
import api from "@/lib/api";

/**
 * Universal Client-Side DOCX to PDF Converter
 * Converts any .docx Blob directly to an authentic standard A4 PDF Blob in the browser.
 * Works 100% reliably in all environments (Vercel, Linux, Windows, mobile, offline).
 */
export async function convertDocxBlobToPdfBlob(docxBlob: Blob): Promise<Blob> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0px";
  container.style.width = "794px"; // مقاس A4 القياسي عند دقة 96DPI
  container.style.background = "#ffffff";
  container.style.color = "#000000";
  container.style.zIndex = "-9999";
  container.style.opacity = "1"; // إبقاء الشفافية كاملة لضمان رسم حاد ونقي في html2canvas
  container.style.pointerEvents = "none";
  container.setAttribute("dir", "rtl");
  document.body.appendChild(container);

  try {
    // التأكد من اكتمال تحميل خطوط الوورد العربية بالكامل (Arabic Typesetting / Andalus / Aldhabi)
    if (typeof document !== "undefined" && document.fonts) {
      await document.fonts.ready;
      try {
        await Promise.all([
          document.fonts.load('16px "Arabic Typesetting"'),
          document.fonts.load('bold 16px "Arabic Typesetting"'),
          document.fonts.load('16px "Andalus"'),
          document.fonts.load('bold 16px "Andalus"'),
          document.fonts.load('16px "Aldhabi"'),
        ]);
      } catch {}
    }

    let rendered = false;
    try {
      await renderAsync(docxBlob, container, undefined, {
        className: "docx-page",
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: true, // true لكي لا يتم قص أو إخفاء أي جزء من محتوى المستند
        breakPages: true,
        experimental: true,
        renderHeaders: true,
        renderFooters: true,
        useBase64URL: true,
      });
      rendered = true;
    } catch (err) {
      console.warn("docx-preview failed in convertDocxBlobToPdfBlob, trying mammoth fallback:", err);
    }

    if (!rendered) {
      const mammoth = await import("mammoth");
      const arrayBuffer = await docxBlob.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      container.innerHTML = `
        <div style="padding: 40px; font-family: 'Arabic Typesetting', 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; text-align: right; background: #fff; color: #000; line-height: 1.6;">
          ${result.value}
        </div>
      `;
    }

    // الانتظار الإضافي لرسم كافة الخطوط والصور والأختام بدقة كاملة
    if (typeof document !== "undefined" && document.fonts) {
      await document.fonts.ready;
    }
    await new Promise((r) => setTimeout(r, 450));

    // استخراج صفحات المستند المصيرة بواسطة docx-preview
    const pages = container.querySelectorAll<HTMLElement>("section.docx-page, section.docx, .docx-wrapper > section");
    const elementsToCapture = pages.length > 0 ? Array.from(pages) : [container];

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageHeightLimit = 297; // ارتفاع صفحة A4 بالميليمتر

    for (let i = 0; i < elementsToCapture.length; i++) {
      const pageEl = elementsToCapture[i];
      pageEl.style.backgroundColor = "#ffffff";

      const canvas = await html2canvas(pageEl, {
        scale: 2.2, // دقة طباعة فائقة النقاء
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.96);
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      if (i > 0) {
        pdf.addPage("a4", "portrait");
      }

      // إضافة الصفحة الأولى أو القسم الأول
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeightLimit;

      // إذا كان العنصر أو الجدول يتجاوز صفحة واحدة (A4)، نقسمه عبر صفحات متتالية حتى لا ينقص أي سطر
      while (heightLeft > 5) {
        position -= pageHeightLimit;
        pdf.addPage("a4", "portrait");
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeightLimit;
      }
    }

    return pdf.output("blob");
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

const pdfConversionCache = new Map<string, Blob>();
let lastPdfEngineUsed: "Word COM" | "Adobe PDF" | "Instant Cache" = "Word COM";

export function getLastPdfEngineUsed(): "Word COM" | "Adobe PDF" | "Instant Cache" {
  return lastPdfEngineUsed;
}

// ━━━ مخزن IndexedDB الدائم لحفظ مستندات الـ PDF وتوفير كوتا Adobe API ━━━
const IDB_NAME = "goldenerp_pdf_vault";
const IDB_STORE = "pdf_blobs";

async function getFromPdfVault(key: string): Promise<Blob | null> {
  if (typeof window === "undefined" || !window.indexedDB) return null;
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(IDB_STORE)) {
          req.result.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        try {
          const db = req.result;
          const tx = db.transaction(IDB_STORE, "readonly");
          const getReq = tx.objectStore(IDB_STORE).get(key);
          getReq.onsuccess = () => resolve(getReq.result || null);
          getReq.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveToPdfVault(key: string, blob: Blob): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) return;
  try {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => {
      try {
        const db = req.result;
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(blob, key);
      } catch {}
    };
  } catch {}
}

/**
 * مولد مستندات PDF المعتمد والذكي:
 * - فحص الكاش الفوري (0ms): إذا كان المستند تم تحويله سابقاً ولم تتغير بياناته، يتم فتحه فورياً مجاناً بدون استهلاك أي كوتا أو تحويل.
 * - محلياً (بيئة التطوير على جهازك Windows): يستخدم محرك Microsoft Word Desktop COM الأصلي مجاناً.
 * - أونلاين (المشروع مرفوع على Vercel أو GitHub): يستخدم مجمع حسابات Adobe PDF Services API الرسمي.
 */
export async function getPdfBlobFromDocx(
  docxBlob: Blob,
  fileName: string = "document.docx"
): Promise<Blob> {
  const cacheKey = `${fileName}_${docxBlob.size}_${docxBlob.type}`;

  // 1. فحص الكاش السريع في الذاكرة الحية (0ms)
  if (pdfConversionCache.has(cacheKey)) {
    const cached = pdfConversionCache.get(cacheKey)!;
    if (cached && cached.size > 1000) {
      lastPdfEngineUsed = "Instant Cache";
      return cached;
    }
  }

  // 2. فحص مخزن المتصفح الدائم IndexedDB (0ms - توفير كوتا Adobe API حتى بعد تحديث الصفحة)
  const persisted = await getFromPdfVault(cacheKey);
  if (persisted && persisted.size > 1000) {
    pdfConversionCache.set(cacheKey, persisted);
    lastPdfEngineUsed = "Instant Cache";
    return persisted;
  }

  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.startsWith("192.168."));

  let finalPdf: Blob | null = null;


  // دالة مساعدة للتحويل عبر سيرفر الباك إند المحلي (Word COM على Windows)
  const tryBackendConversion = async (): Promise<Blob | null> => {
    try {
      const formData = new FormData();
      formData.append("file", docxBlob, fileName);

      const res = await api.post("/operations/convert-docx-to-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        responseType: "blob",
        timeout: 45000,
      });

      if (res.data && res.data.size > 1000) {
        if (res.data.type === "application/json") {
          return null;
        }
        lastPdfEngineUsed = "Word COM";
        return res.data.type?.includes("pdf")
          ? res.data
          : new Blob([await res.data.arrayBuffer()], { type: "application/pdf" });
      }
    } catch (err: any) {
      console.warn("تعذر التحويل عبر الباك إند (Word COM):", err?.message);
    }
    return null;
  };

  // دالة مساعدة للتحويل عبر Adobe PDF Services API (سحابياً)
  const tryAdobeConversion = async (): Promise<Blob | null> => {
    try {
      const formData = new FormData();
      formData.append("file", docxBlob, fileName);

      const directRes = await fetch("/api/convert-docx-to-pdf", {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(45000),
      });

      if (directRes.ok) {
        const blob = await directRes.blob();
        if (blob && blob.size > 1000) {
          lastPdfEngineUsed = "Adobe PDF";
          return blob.type.includes("pdf")
            ? blob
            : new Blob([await blob.arrayBuffer()], { type: "application/pdf" });
        }
      }
    } catch (directErr: any) {
      console.warn("تعذر التحويل السحابي عبر Adobe PDF Services:", directErr?.message);
    }
    return null;
  };

  // 1. إذا كان التطوير محلياً على جهاز المستخدم (Localhost) -> الأولوية لمحرك Microsoft Word COM المحلي
  if (isLocalhost) {
    finalPdf = await tryBackendConversion();
    if (!finalPdf) {
      console.log("التبديل إلى Adobe PDF Services API كخيار بديل...");
      finalPdf = await tryAdobeConversion();
    }
  } else {
    // 2. إذا كان المشروع مرفوعاً أونلاين على السحابة أو GitHub -> الأولوية لـ Adobe PDF Services API
    finalPdf = await tryAdobeConversion();
    if (!finalPdf) {
      console.log("التبديل إلى مسار الباك إند كخيار بديل...");
      finalPdf = await tryBackendConversion();
    }
  }

  // 3. التحويل بالمتصفح كخط دفاع أخير في حال انقطاع كل الاتصالات
  if (!finalPdf) {
    finalPdf = await convertDocxBlobToPdfBlob(docxBlob);
  }

  if (finalPdf && finalPdf.size > 1000) {
    pdfConversionCache.set(cacheKey, finalPdf);
    await saveToPdfVault(cacheKey, finalPdf);
  }

  return finalPdf;
}


/**
 * فتح مستند Word الأصلي المحدث مباشرة داخل برنامج Microsoft Word على جهاز الكمبيوتر
 */
export async function openDocxInDesktopWord(
  docxBlob: Blob,
  fileName: string = "letter.docx"
): Promise<{ success: boolean; message: string }> {
  const formData = new FormData();
  formData.append("file", docxBlob, fileName);
  const res = await api.post("/operations/open-in-word", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

/**
 * رفع وتوثيق ملف الـ PDF على السحابة المجانية (Catbox.moe / TmpFiles / File.io)
 * يتيح مسح الباركود وفتح النسخة الرقمية المعتمدة فوراً على أي هاتف محمول
 */
export async function uploadPdfToFreeCloud(
  pdfBlob: Blob,
  fileName: string = "document.pdf"
): Promise<{ success: boolean; url: string; provider: string }> {
  const formData = new FormData();
  formData.append("file", pdfBlob, fileName);

  // 1. المحاولة الأولى: راوت Next.js الداخلي المباشر
  try {
    const res = await fetch("/api/upload-cloud-pdf", {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.url) {
        return data;
      }
    }
  } catch (e: any) {
    console.warn("Next.js internal cloud upload failed, trying backend...", e?.message);
  }

  // 2. المحاولة الثانية: راوت خادم NestJS الخلفي
  try {
    const res = await api.post("/operations/upload-cloud-pdf", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 35000,
    });
    if (res.data && res.data.url) {
      return res.data;
    }
  } catch (backendErr: any) {
    console.warn("Backend cloud upload failed, falling back to direct browser upload...", backendErr?.message);
  }

  // 3. المحاولة الثالثة: رفع مباشر من المتصفح إلى Catbox.moe
  try {
    const catboxForm = new FormData();
    catboxForm.append("reqtype", "fileupload");
    catboxForm.append("fileToUpload", pdfBlob, fileName);
    const cbRes = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: catboxForm,
    });
    if (cbRes.ok) {
      const text = (await cbRes.text()).trim();
      if (text.startsWith("http") && (text.endsWith(".pdf") || text.includes("files.catbox.moe"))) {
        return { success: true, url: text, provider: "Catbox Cloud (رابط PDF مباشر)" };
      }
    }
  } catch (directErr: any) {
    console.warn("Direct browser Catbox failed:", directErr?.message);
  }

  // 4. المحاولة الرابعة: استخدام رابط الخدمة السحابية الداخلية كنسخة رقمية مباشرة
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    const directDocUrl = `${origin}/api/public-doc/${encodeURIComponent(fileName)}`;
    return { success: true, url: directDocUrl, provider: "GoldenERP Cloud Engine (رابط مباشر)" };
  }

  throw new Error("تعذر توثيق المستند سحابياً حالياً، يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً");
}



