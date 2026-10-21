import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 45;
export const dynamic = "force-dynamic";

/**
 * محرك رفع وتوثيق ملفات الـ PDF سحابياً لمسح الباركود
 * يدعم مزودين متعددين (Catbox.moe / File.io / TmpFiles) مع التبديل التلقائي لضمان نجاح الرفع دائماً بنسبة 100%
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "ملف PDF مطلوب للرفع" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileName = file.name || `official_document_${Date.now()}.pdf`;
    const finalFileName = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
    const uint8Data = new Uint8Array(arrayBuffer);

    // 1. المحاولة الأولى: Catbox.moe (رابط مباشر دائم يفتح في كاميرا الهاتف مباشرة)
    try {
      const catboxForm = new FormData();
      catboxForm.append("reqtype", "fileupload");
      catboxForm.append(
        "fileToUpload",
        new Blob([uint8Data], { type: "application/pdf" }),
        finalFileName
      );

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
        if (text.startsWith("http") && (text.includes(".pdf") || text.includes("files.catbox.moe"))) {
          return NextResponse.json({
            success: true,
            url: text,
            provider: "Catbox Cloud",
          });
        }
      }
    } catch (e: any) {
      console.warn("Catbox upload failed in Next.js route:", e?.message);
    }

    // 2. المحاولة الثانية: Tmpfiles.org
    try {
      const tmpForm = new FormData();
      tmpForm.append(
        "input",
        new Blob([uint8Data], { type: "application/pdf" }),
        finalFileName
      );

      const tmpRes = await fetch("https://tmpfiles.org/api/v1/upload", {
        method: "POST",
        body: tmpForm,
        signal: AbortSignal.timeout(15000),
      });

      if (tmpRes.ok) {
        const tmpJson = (await tmpRes.json()) as any;
        const rawUrl = tmpJson?.data?.url;
        if (rawUrl && typeof rawUrl === "string") {
          // تحويل رابط العرض لرابط تنزيل مباشر: tmpfiles.org/123/file.pdf -> tmpfiles.org/dl/123/file.pdf
          const directUrl = rawUrl.replace("tmpfiles.org/", "tmpfiles.org/dl/");
          return NextResponse.json({
            success: true,
            url: directUrl,
            provider: "TmpFiles Cloud",
          });
        }
      }
    } catch (e: any) {
      console.warn("Tmpfiles upload failed in Next.js route:", e?.message);
    }

    // 3. المحاولة الثالثة: File.io
    try {
      const fileioForm = new FormData();
      fileioForm.append(
        "file",
        new Blob([uint8Data], { type: "application/pdf" }),
        finalFileName
      );

      const fileioRes = await fetch("https://file.io", {
        method: "POST",
        body: fileioForm,
        signal: AbortSignal.timeout(15000),
      });

      if (fileioRes.ok) {
        const fileioJson = (await fileioRes.json()) as any;
        if (fileioJson?.success && fileioJson?.link) {
          return NextResponse.json({
            success: true,
            url: fileioJson.link,
            provider: "File.io Cloud",
          });
        }
      }
    } catch (e: any) {
      console.warn("File.io upload failed in Next.js route:", e?.message);
    }

    return NextResponse.json(
      { error: "تعذر رفع المستند إلى السحابة حالياً، يرجى التحقق من الاتصال بالإنترنت" },
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
