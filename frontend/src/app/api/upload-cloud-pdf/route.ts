import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const maxDuration = 45;
export const dynamic = "force-dynamic";

/**
 * محرك رفع وتوثيق ملفات الـ PDF سحابياً لمسح الباركود
 * يعتمد حصرياً على:
 * 1. Cloudflare R2 المعتمد للشركة (goldenerp-storage) كرابط أساسي دائم ومباشر 100%
 * 2. Gofile.io كخيار احتياطي ثانٍ
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
    const buffer = Buffer.from(arrayBuffer);

    // 1. المحاولة الأولى والأساسية: Cloudflare R2 المعتمد للشركة (goldenerp-storage)
    try {
      const accountId = process.env.R2_ACCOUNT_ID || "e955866121f5a31f17c8cd21f8c09d19";
      const bucketName = process.env.R2_BUCKET_NAME || "goldenerp-storage";
      const accessKeyId = process.env.R2_ACCESS_KEY_ID || "87f6a410e812d016695a39cb23c6c4ce";
      const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "717642f36c3f9d7f8af1b0d57999b724ad504becd460b826ba7aa9a7dede42c3";
      const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

      const s3 = new S3Client({
        region: "auto",
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
      });

      const key = `official_docs/${finalFileName}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: "application/pdf",
          ContentDisposition: `inline; filename="${finalFileName}"`,
        })
      );

      const publicDomain = process.env.R2_PUBLIC_DOMAIN;
      let directUrl: string;
      if (publicDomain && publicDomain.startsWith("http")) {
        directUrl = `${publicDomain.replace(/\/+$/, "")}/${key}`;
      } else {
        // توليد رابط موقع رسمي مباشر يفتح ملف الـ PDF مباشرة بدون أي شاشة وسيطة
        directUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
            ResponseContentType: "application/pdf",
            ResponseContentDisposition: `inline; filename="${finalFileName}"`,
          }),
          { expiresIn: 604800 }
        );
      }

      return NextResponse.json({
        success: true,
        url: directUrl,
        provider: "Cloudflare R2 Storage (حساب الشركة المعتمد)",
      });
    } catch (r2Err: any) {
      console.warn("Cloudflare R2 upload failed, switching to Gofile fallback:", r2Err?.message);
    }

    // 2. المحاولة الثانية (الاحتياطي): Gofile.io
    try {
      const srvRes = await fetch("https://api.gofile.io/servers", {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (srvRes.ok) {
        const srvData = await srvRes.json();
        const serverName = srvData?.data?.servers?.[0]?.name || "store1";

        const gofileForm = new FormData();
        const pdfBlob = new Blob([buffer], { type: "application/pdf" });
        gofileForm.append("file", pdfBlob, finalFileName);

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
              provider: "Gofile Cloud (تخزين سحابي)",
            });
          }
        }
      }
    } catch (gofileErr: any) {
      console.warn("Gofile upload failed in Next.js route:", gofileErr?.message);
    }

    return NextResponse.json(
      { error: "تعذر الرفع إلى مراكز التخزين السحابي (Cloudflare R2 / Gofile). يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً." },
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

/**
 * توليد الرابط السحابي المعتمد المباشر مسبقاً (Pre-signed direct URL)
 * ليتم دمجه فورياً داخل رمز QR بالخطاب قبل اكتمال الرفع لضمان مطابقة الرمز 100%
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get("fileName") || `official_document_${Date.now()}.pdf`;
    const finalFileName = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;

    const accountId = process.env.R2_ACCOUNT_ID || "e955866121f5a31f17c8cd21f8c09d19";
    const bucketName = process.env.R2_BUCKET_NAME || "goldenerp-storage";
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || "87f6a410e812d016695a39cb23c6c4ce";
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "717642f36c3f9d7f8af1b0d57999b724ad504becd460b826ba7aa9a7dede42c3";
    const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

    const s3 = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });

    const key = `official_docs/${finalFileName}`;
    const publicDomain = process.env.R2_PUBLIC_DOMAIN;
    let directUrl: string;

    if (publicDomain && publicDomain.startsWith("http")) {
      directUrl = `${publicDomain.replace(/\/+$/, "")}/${key}`;
    } else {
      directUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
          ResponseContentType: "application/pdf",
          ResponseContentDisposition: `inline; filename="${finalFileName}"`,
        }),
        { expiresIn: 604800 }
      );
    }

    return NextResponse.json({
      success: true,
      url: directUrl,
      fileName: finalFileName,
      provider: "Cloudflare R2 Storage (حساب الشركة المعتمد)",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "فشل توليد الرابط السحابي المسبق" },
      { status: 500 }
    );
  }
}

