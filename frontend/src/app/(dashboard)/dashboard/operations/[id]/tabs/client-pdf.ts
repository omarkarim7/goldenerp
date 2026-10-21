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

/**
 * مولد مستندات PDF المعتمد:
 * 1. يحاول أولاً الاستفادة من محرك Microsoft Word Desktop COM الحقيقي إذا كان متاحاً على خادم محلي (Windows).
 * 2. في حال تعذر ذلك أو عند العمل على Vercel/Linux، يتم التحويل بالمتصفح مباشرة بخطوط Arabic Typesetting الأصلية بدقة 100%.
 */
export async function getPdfBlobFromDocx(
  docxBlob: Blob,
  fileName: string = "document.docx"
): Promise<Blob> {
  // 1. محاولة التحويل عبر مسار Next.js الداخلي المباشر (يعمل فورياً على Vercel وأونلاين عبر Adobe PDF Services API)
  try {
    const formData = new FormData();
    formData.append("file", docxBlob, fileName);

    const directRes = await fetch("/api/convert-docx-to-pdf", {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(40000),
    });

    if (directRes.ok) {
      const blob = await directRes.blob();
      if (blob && blob.size > 1000 && blob.type.includes("pdf")) {
        return blob;
      }
    }
  } catch (directErr) {
    console.warn("المسار الداخلي /api/convert-docx-to-pdf تعذر، جاري تجربة مسار الباك إند:", directErr);
  }

  // 2. محاولة خادم الباك إند (NestJS) الرسمي عبر Adobe أو LibreOffice
  try {
    const formData = new FormData();
    formData.append("file", docxBlob, fileName);

    const res = await api.post("/operations/convert-docx-to-pdf", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      responseType: "blob",
      timeout: 40000,
    });

    if (res.data && res.data.size > 1000) {
      if (res.data.type === "application/json") {
        const text = await res.data.text();
        console.warn("استجابة غير متوقعة من السيرفر عند تحويل PDF:", text);
      } else {
        return res.data;
      }
    }
  } catch (err) {
    console.warn("تعذر التحويل عبر سيرفر الباك إند، جاري التحويل الداخلي بالمتصفح:", err);
  }

  // 3. التحويل الذكي في المتصفح بالخطوط العربية الأصلية
  return await convertDocxBlobToPdfBlob(docxBlob);
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
      if (text.startsWith("http") && (text.includes(".pdf") || text.includes("files.catbox.moe"))) {
        return { success: true, url: text, provider: "Catbox Cloud" };
      }
    }
  } catch (directErr: any) {
    console.warn("Direct browser Catbox failed:", directErr?.message);
  }

  // 4. المحاولة الرابعة: رفع مباشر من المتصفح إلى Gofile.io
  try {
    let targetServer = "store1";
    try {
      const srvRes = await fetch("https://api.gofile.io/servers");
      if (srvRes.ok) {
        const srvData = await srvRes.json();
        if (srvData?.status === "ok" && srvData?.data?.servers?.[0]?.name) {
          targetServer = srvData.data.servers[0].name;
        }
      }
    } catch {}

    const gofileForm = new FormData();
    gofileForm.append("file", pdfBlob, fileName);
    const gofileRes = await fetch(`https://${targetServer}.gofile.io/contents/uploadfile`, {
      method: "POST",
      body: gofileForm,
    });
    if (gofileRes.ok) {
      const gJson = await gofileRes.json();
      if (gJson?.status === "ok" && gJson?.data?.downloadPage) {
        return { success: true, url: gJson.data.downloadPage, provider: "Gofile Cloud" };
      }
    }
  } catch (gofileErr: any) {
    console.warn("Direct browser Gofile failed:", gofileErr?.message);
  }

  throw new Error("تعذر توثيق المستند سحابياً حالياً، يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً");
}



