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

    // Cloudflare R2 المعتمد للشركة (goldenerp-storage) حصرياً بدون أي بدائل
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

    const safeKeySuffix = `${Buffer.from(finalFileName).toString("hex").slice(0, 24)}.pdf`;
    const key = `official_docs/${safeKeySuffix}`;
    const contentDisposition = `inline; filename="official_document.pdf"; filename*=UTF-8''${encodeURIComponent(finalFileName)}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: "application/pdf",
        ContentDisposition: contentDisposition,
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
          ResponseContentDisposition: contentDisposition,
        }),
        { expiresIn: 604800 }
      );
    }

    return NextResponse.json({
      success: true,
      url: directUrl,
      provider: "Cloudflare R2 Storage (حساب الشركة المعتمد)",
    });
  } catch (err: any) {
    console.error("خطأ في رفع الملف إلى Cloudflare R2:", err);
    return NextResponse.json(
      { error: `تعذر الرفع إلى سحابة Cloudflare R2: ${err?.message || "خطأ غير متوقع"}` },
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

    const safeKeySuffix = `${Buffer.from(finalFileName).toString("hex").slice(0, 24)}.pdf`;
    const key = `official_docs/${safeKeySuffix}`;
    const contentDisposition = `inline; filename="official_document.pdf"; filename*=UTF-8''${encodeURIComponent(finalFileName)}`;
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
          ResponseContentDisposition: contentDisposition,
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

