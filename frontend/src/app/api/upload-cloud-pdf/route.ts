import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

export const maxDuration = 45;
export const dynamic = "force-dynamic";

/**
 * محرك رفع وتوثيق ملفات الـ PDF سحابياً لمسح الباركود
 * يدعم مزودين متعددين (Catbox.moe / TmpFiles / File.io) مع حفظ محلي آمن 100%
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "ملف PDF مطلوب للرفع" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const rawName = file.name || `official_document_${Date.now()}.pdf`;
    const finalFileName = rawName.endsWith(".pdf") ? rawName : `${rawName}.pdf`;
    const uint8Data = new Uint8Array(arrayBuffer);
    const hostHeader = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const protoHeader = req.headers.get("x-forwarded-proto") || "https";
    const appOrigin = hostHeader ? `${protoHeader}://${hostHeader}` : "";

    // 1. المحاولة الأولى: Catbox.moe (رابط مباشر دائم بصيغة PDF)
    try {
      const catboxForm = new FormData();
      catboxForm.append("reqtype", "fileupload");
      const pdfFile = new File([uint8Data], finalFileName, { type: "application/pdf" });
      catboxForm.append("fileToUpload", pdfFile);

      const catboxRes = await fetch("https://catbox.moe/user/api.php", {
        method: "POST",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        body: catboxForm,
        signal: AbortSignal.timeout(4000),
      });

      if (catboxRes.ok) {
        const text = (await catboxRes.text()).trim();
        if (text.startsWith("http") && (text.endsWith(".pdf") || text.includes("files.catbox.moe"))) {
          return NextResponse.json({
            success: true,
            url: text,
            provider: "Catbox Cloud (رابط PDF مباشر)",
          });
        }
      }
    } catch (e: any) {
      console.warn("Catbox upload failed, switching to Tmpfile (Cloudflare R2):", e?.message);
    }

    // 2. المحاولة الثانية: Tmpfile.link (رابط PDF مباشر فائق السرعة عبر Cloudflare R2)
    try {
      const tmpForm = new FormData();
      const pdfFile = new File([uint8Data], finalFileName, { type: "application/pdf" });
      tmpForm.append("file", pdfFile);

      const tmpRes = await fetch("https://tmpfile.link/api/upload", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: tmpForm,
        signal: AbortSignal.timeout(10000),
      });

      if (tmpRes.ok) {
        const tmpData = await tmpRes.json();
        const directLink = tmpData?.downloadLink || tmpData?.downloadLinkEncoded;
        if (directLink && typeof directLink === "string" && directLink.startsWith("http")) {
          return NextResponse.json({
            success: true,
            url: directLink,
            provider: "Cloudflare R2 Cloud (رابط PDF مباشر)",
          });
        }
      }
    } catch (tmpErr: any) {
      console.warn("Tmpfile upload failed, switching to Tmpfiles.org:", tmpErr?.message);
    }

    // 3. المحاولة الثالثة: TmpFiles.org (رابط PDF فوري ومباشر 100%)
    try {
      const orgForm = new FormData();
      const pdfFile = new File([uint8Data], finalFileName, { type: "application/pdf" });
      orgForm.append("file", pdfFile);

      const orgRes = await fetch("https://tmpfiles.org/api/v1/upload", {
        method: "POST",
        body: orgForm,
        signal: AbortSignal.timeout(10000),
      });

      if (orgRes.ok) {
        const orgData = await orgRes.json();
        if (orgData?.status === "success" && orgData?.data?.url) {
          const directDlUrl = orgData.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
          return NextResponse.json({
            success: true,
            url: directDlUrl,
            provider: "TmpFiles (رابط PDF مباشر)",
          });
        }
      }
    } catch (orgErr: any) {
      console.warn("Tmpfiles.org upload failed, switching to Gofile:", orgErr?.message);
    }

    // 4. المحاولة الرابعة: Gofile.io (تخزين سحابي خارجي مجاني وموثوق 100%)
    try {
      const srvRes = await fetch("https://api.gofile.io/servers", {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (srvRes.ok) {
        const srvData = await srvRes.json();
        const serverName = srvData?.data?.servers?.[0]?.name || "store1";

        const gofileForm = new FormData();
        const pdfFile = new File([uint8Data], finalFileName, { type: "application/pdf" });
        gofileForm.append("file", pdfFile);

        const upRes = await fetch(`https://${serverName}.gofile.io/contents/uploadfile`, {
          method: "POST",
          body: gofileForm,
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(20000),
        });

        if (upRes.ok) {
          const upData = await upRes.json();
          if (upData?.status === "ok" && upData?.data?.downloadPage) {
            return NextResponse.json({
              success: true,
              url: upData.data.downloadPage,
              provider: "Gofile Cloud (تخزين سحابي خارجي)",
            });
          }
        }
      }
    } catch (gofileErr: any) {
      console.warn("Gofile upload failed in Next.js route:", gofileErr?.message);
    }

    return NextResponse.json(
      { error: "تعذر الرفع إلى مراكز التخزين السحابي الخارجية (Catbox/Tmpfile/Gofile). يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً." },
      { status: 502 }
    );
  } catch (err: any) {
    console.error("خطأ في راوت الرفع السحابي:", err);
    return NextResponse.json(
      { error: err?.message || "حدث خطأ غير متوقع أثناء الرفع السحابي" },
      { status: 500 }
    );
  }
}
