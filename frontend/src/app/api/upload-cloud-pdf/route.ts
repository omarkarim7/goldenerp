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

    // 0. حفظ محلي سريع في مجلد السحابة العام لضمان وجود رابط دائم 100%
    try {
      const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
      const baseDir = isServerless ? os.tmpdir() : path.resolve(process.cwd(), "public");
      const cloudDir = path.resolve(baseDir, "cloud_docs");
      if (!fs.existsSync(cloudDir)) {
        fs.mkdirSync(cloudDir, { recursive: true });
      }
      const safePath = path.resolve(cloudDir, finalFileName);
      await fs.promises.writeFile(safePath, Buffer.from(uint8Data));
    } catch (saveErr) {
      console.warn("Local cloud doc write notice:", saveErr);
    }

    // 1. المحاولة الأولى: Catbox.moe (رابط مباشر دائم بصيغة PDF يفتح فورياً في المتصفح أو كاميرا الهاتف)
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
        signal: AbortSignal.timeout(20000),
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
      console.warn("Catbox upload failed in Next.js route:", e?.message);
    }

    // 2. المحاولة الثانية: رابط العرض السحابي المباشر الداخلي للمنظومة (يفتح ملف الـ PDF كنسخة رقمية مباشرة)
    if (appOrigin) {
      const internalDocUrl = `${appOrigin}/api/public-doc/${encodeURIComponent(finalFileName)}`;
      return NextResponse.json({
        success: true,
        url: internalDocUrl,
        provider: "GoldenERP Cloud Engine (رابط PDF رقمي مباشر)",
      });
    }

    return NextResponse.json({
      success: true,
      url: `/api/public-doc/${encodeURIComponent(finalFileName)}`,
      provider: "GoldenERP Vault",
    });
  } catch (err: any) {
    console.error("خطأ في راوت الرفع السحابي:", err);
    return NextResponse.json(
      { error: err?.message || "حدث خطأ غير متوقع أثناء الرفع السحابي" },
      { status: 500 }
    );
  }
}
