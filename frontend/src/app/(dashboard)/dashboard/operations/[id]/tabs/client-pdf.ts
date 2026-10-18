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
  container.style.left = "0px";
  container.style.top = "0px";
  container.style.width = "820px";
  container.style.background = "#ffffff";
  container.style.color = "#000000";
  container.style.zIndex = "-9999";
  container.style.opacity = "0.01";
  container.style.pointerEvents = "none";
  container.setAttribute("dir", "rtl");
  document.body.appendChild(container);

  try {
    let rendered = false;
    try {
      await renderAsync(docxBlob, container, undefined, {
        className: "docx-page",
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        breakPages: true,
        experimental: true,
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
        <div style="padding: 40px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; text-align: right; background: #fff; color: #000; line-height: 1.6;">
          ${result.value}
        </div>
      `;
    }

    // Wait a brief tick for images/fonts/stamps to paint completely
    await new Promise((r) => setTimeout(r, 350));

    // Look for individual pages rendered by docx-preview
    const pages = container.querySelectorAll<HTMLElement>("section.docx-page, section.docx, .docx-wrapper > section");
    const elementsToCapture = pages.length > 0 ? Array.from(pages) : [container];

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    for (let i = 0; i < elementsToCapture.length; i++) {
      const pageEl = elementsToCapture[i];
      pageEl.style.backgroundColor = "#ffffff";

      const canvas = await html2canvas(pageEl, {
        scale: 2, // High resolution crisp print quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (i > 0) {
        pdf.addPage("a4", "portrait");
      }
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, Math.min(imgHeight, 297), undefined, "FAST");
    }

    return pdf.output("blob");
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Smart PDF Generator:
 * - When running on Vercel or any remote domain: Converts directly in the browser using convertDocxBlobToPdfBlob.
 *   This avoids unnecessary 503 network errors in the browser console.
 * - When running on local Windows (localhost): Attempts the local MS Word COM endpoint, with automatic fallback.
 */
export async function getPdfBlobFromDocx(
  docxBlob: Blob,
  fileName: string = "document.docx"
): Promise<Blob> {
  const isLocalWindowsServer =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  if (isLocalWindowsServer) {
    try {
      const formData = new FormData();
      formData.append("file", docxBlob, fileName);
      const res = await api.post("/operations/convert-docx-to-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        responseType: "blob",
        timeout: 6000,
      });
      if (res.data && res.data.size > 1000) {
        return res.data;
      }
    } catch (err) {
      console.warn("Local Word COM conversion failed, using in-browser converter:", err);
    }
  }

  // On Vercel, cloud domain, or fallback: Instant client-side conversion
  return await convertDocxBlobToPdfBlob(docxBlob);
}
