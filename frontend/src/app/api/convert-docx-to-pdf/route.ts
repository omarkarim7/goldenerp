import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60; // 60 seconds max for Vercel Serverless
export const dynamic = "force-dynamic";

/**
 * محرك تحويل مستندات Word (.docx) إلى PDF سحابياً عبر Adobe PDF Services API الرسمي
 * مدمج مباشرة في Next.js ليعمل أونلاين على Vercel و Hostinger وفي كل مكان
 * بدون الحاجة لأي خوادم وسيطة وبدقة 100% مطابقة لـ Microsoft Word
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "ملف Word (.docx) مطلوب للتحويل" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const docxBuffer = Buffer.from(arrayBuffer);

    const clientId = process.env.ADOBE_CLIENT_ID;
    const clientSecret = process.env.ADOBE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "بيانات اعتماد Adobe PDF Services غير مهيأة في متغيرات البيئة (ADOBE_CLIENT_ID, ADOBE_CLIENT_SECRET)" },
        { status: 503 }
      );
    }

    // 1. استخراج رمز الوصول Access Token من Adobe
    const tokenParams = new URLSearchParams();
    tokenParams.append("client_id", clientId);
    tokenParams.append("client_secret", clientSecret);

    const tokenRes = await fetch("https://pdf-services.adobe.io/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
      cache: "no-store",
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`فشل الحصول على Access Token من Adobe: ${tokenRes.status} ${errText}`);
    }

    const tokenData = (await tokenRes.json()) as any;
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new Error("لم يتم استلام access_token من Adobe");
    }

    // 2. طلب رابط رفع مشفر مسبقاً Presigned Upload URI
    const assetRes = await fetch("https://pdf-services.adobe.io/assets", {
      method: "POST",
      headers: {
        "X-API-Key": clientId,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mediaType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
      cache: "no-store",
    });

    if (!assetRes.ok) {
      const errText = await assetRes.text();
      throw new Error(`فشل إنشاء الأصل Asset في Adobe: ${assetRes.status} ${errText}`);
    }

    const assetData = (await assetRes.json()) as any;
    const assetID = assetData.assetID;
    const uploadUri = assetData.uploadUri;
    if (!assetID || !uploadUri) {
      throw new Error("لم يتم استلام assetID أو uploadUri من Adobe");
    }

    // 3. رفع ملف الوورد الثنائي مباشرة إلى Adobe S3
    const uploadRes = await fetch(uploadUri, {
      method: "PUT",
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      body: docxBuffer,
      cache: "no-store",
    });

    if (!uploadRes.ok) {
      throw new Error(`فشل رفع المستند إلى خادم تخزين Adobe: ${uploadRes.status}`);
    }

    // 4. إرسال أمر إنشاء مهمة التحويل Create PDF Job
    const jobRes = await fetch("https://pdf-services.adobe.io/operation/createpdf", {
      method: "POST",
      headers: {
        "X-API-Key": clientId,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ assetID }),
      cache: "no-store",
    });

    if (jobRes.status !== 201 && jobRes.status !== 200) {
      const errText = await jobRes.text();
      throw new Error(`فشل إرسال مهمة Create PDF في Adobe: ${jobRes.status} ${errText}`);
    }

    const location = jobRes.headers.get("location");
    if (!location) {
      throw new Error("لم يتم استلام رابط تتبع المهمة location header من Adobe");
    }

    // 5. متابعة حالة المهمة Polling حتى تكتمل
    let downloadUri = "";
    const maxPollAttempts = 30;
    for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, 1000));

      const statusRes = await fetch(location, {
        headers: {
          "X-API-Key": clientId,
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      if (!statusRes.ok) continue;

      const statusJson = (await statusRes.json()) as any;
      if (statusJson.status === "done") {
        downloadUri = statusJson.asset?.downloadUri || statusJson.downloadUri;
        break;
      } else if (statusJson.status === "failed") {
        throw new Error(`فشلت مهمة تحويل Adobe: ${JSON.stringify(statusJson.error || statusJson)}`);
      }
    }

    if (!downloadUri) {
      throw new Error("انتهت مهلة انتظار تحويل المستند في Adobe PDF Services");
    }

    // 6. تحميل ملف الـ PDF الناتج
    const downloadRes = await fetch(downloadUri, { cache: "no-store" });
    if (!downloadRes.ok) {
      throw new Error(`فشل تنزيل ملف الـ PDF من Adobe S3: ${downloadRes.status}`);
    }

    const pdfBuffer = await downloadRes.arrayBuffer();

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="letter.pdf"',
        "Content-Length": pdfBuffer.byteLength.toString(),
      },
    });
  } catch (err: any) {
    console.error("خطأ تحويل DOCX إلى PDF في Next.js Route:", err);
    return NextResponse.json(
      { error: err?.message || "فشل تحويل المستند إلى PDF عبر Adobe" },
      { status: 500 }
    );
  }
}
