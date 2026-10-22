import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60; // 60 seconds max for Vercel Serverless
export const dynamic = "force-dynamic";

interface AdobeCredential {
  name: string;
  clientId: string;
  clientSecret: string;
}

/**
 * استخراج قائمة حسابات Adobe المتاحة في النظام لتمكين التبديل التلقائي ومضاعفة الحصص الشهرية
 */
function getAdobeAccounts(): AdobeCredential[] {
  const accounts: AdobeCredential[] = [];

  // الحساب الأول (500 تحويل شهرياً)
  if (process.env.ADOBE_CLIENT_ID && process.env.ADOBE_CLIENT_SECRET) {
    accounts.push({
      name: "الحساب الأول (Account 1)",
      clientId: process.env.ADOBE_CLIENT_ID.trim(),
      clientSecret: process.env.ADOBE_CLIENT_SECRET.trim(),
    });
  }

  // الحساب الثاني (500 تحويل إضافي = 1000 تحويل شهرياً)
  if (process.env.ADOBE_CLIENT_ID_2 && process.env.ADOBE_CLIENT_SECRET_2) {
    accounts.push({
      name: "الحساب الثاني (Account 2)",
      clientId: process.env.ADOBE_CLIENT_ID_2.trim(),
      clientSecret: process.env.ADOBE_CLIENT_SECRET_2.trim(),
    });
  }

  // الحساب الثالث (إن وُجد مستقبلاً)
  if (process.env.ADOBE_CLIENT_ID_3 && process.env.ADOBE_CLIENT_SECRET_3) {
    accounts.push({
      name: "الحساب الثالث (Account 3)",
      clientId: process.env.ADOBE_CLIENT_ID_3.trim(),
      clientSecret: process.env.ADOBE_CLIENT_SECRET_3.trim(),
    });
  }

  return accounts;
}

/**
 * تنفيذ عملية التحويل الفعلية عبر حساب Adobe محدد
 */
async function convertViaAdobe(docxBuffer: Buffer, account: AdobeCredential): Promise<ArrayBuffer> {
  const { clientId, clientSecret, name } = account;

  // 1. استخراج رمز الوصول Access Token من Adobe
  const tokenParams = new URLSearchParams();
  tokenParams.append("client_id", clientId);
  tokenParams.append("client_secret", clientSecret);

  const tokenRes = await fetch("https://pdf-services.adobe.io/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`[${name}] فشل الحصول على Access Token: ${tokenRes.status} ${errText}`);
  }

  const tokenData = (await tokenRes.json()) as any;
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    throw new Error(`[${name}] لم يتم استلام access_token من Adobe`);
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
    signal: AbortSignal.timeout(15000),
  });

  if (!assetRes.ok) {
    const errText = await assetRes.text();
    throw new Error(`[${name}] فشل إنشاء الأصل Asset في Adobe: ${assetRes.status} ${errText}`);
  }

  const assetData = (await assetRes.json()) as any;
  const assetID = assetData.assetID;
  const uploadUri = assetData.uploadUri;
  if (!assetID || !uploadUri) {
    throw new Error(`[${name}] لم يتم استلام assetID أو uploadUri`);
  }

  // 3. رفع ملف الوورد الثنائي مباشرة إلى Adobe S3
  const uploadRes = await fetch(uploadUri, {
    method: "PUT",
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    body: new Uint8Array(docxBuffer),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });

  if (!uploadRes.ok) {
    throw new Error(`[${name}] فشل رفع المستند إلى خادم تخزين Adobe: ${uploadRes.status}`);
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
    signal: AbortSignal.timeout(15000),
  });

  if (jobRes.status !== 201 && jobRes.status !== 200) {
    const errText = await jobRes.text();
    throw new Error(`[${name}] فشل إرسال مهمة Create PDF: ${jobRes.status} ${errText}`);
  }

  const location = jobRes.headers.get("location");
  if (!location) {
    throw new Error(`[${name}] لم يتم استلام رابط تتبع المهمة location header`);
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
      signal: AbortSignal.timeout(10000),
    });

    if (!statusRes.ok) continue;

    const statusJson = (await statusRes.json()) as any;
    if (statusJson.status === "done") {
      downloadUri = statusJson.asset?.downloadUri || statusJson.downloadUri;
      break;
    } else if (statusJson.status === "failed") {
      throw new Error(`[${name}] فشلت مهمة تحويل Adobe: ${JSON.stringify(statusJson.error || statusJson)}`);
    }
  }

  if (!downloadUri) {
    throw new Error(`[${name}] انتهت مهلة انتظار تحويل المستند`);
  }

  // 6. تحميل ملف الـ PDF الناتج
  const downloadRes = await fetch(downloadUri, {
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!downloadRes.ok) {
    throw new Error(`[${name}] فشل تنزيل ملف الـ PDF: ${downloadRes.status}`);
  }

  return await downloadRes.arrayBuffer();
}

/**
 * تنفيذ عملية التحويل الاحتياطية عبر Cloudmersive Convert API
 * يوفر 800 عملية تحويل مجانية شهرياً عند نفاد كوتا Adobe أو حدوث خطأ
 */
async function convertViaCloudmersive(docxBuffer: Buffer, apiKey: string): Promise<ArrayBuffer> {
  const form = new FormData();
  const blob = new Blob([new Uint8Array(docxBuffer)], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  form.append("inputFile", blob, "document.docx");

  const res = await fetch("https://api.cloudmersive.com/convert/docx/to/pdf", {
    method: "POST",
    headers: {
      Apikey: apiKey.trim(),
    },
    body: form,
    signal: AbortSignal.timeout(35000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[Cloudmersive API] فشل التحويل: ${res.status} ${errText}`);
  }

  const pdfArrayBuffer = await res.arrayBuffer();
  if (pdfArrayBuffer.byteLength < 500) {
    throw new Error("[Cloudmersive API] تم استلام ملف PDF تالف أو فارغ");
  }

  return pdfArrayBuffer;
}

/**
 * محرك تحويل مستندات Word (.docx) إلى PDF سحابياً عبر:
 * 1. مجمع حسابات Adobe PDF Services API الرسمي (الأولوية الأولى - 1000 تحويل شهرياً)
 * 2. محرك Cloudmersive Convert API الاحتياطي (الأولوية الثانية - 800 تحويل شهرياً)
 * 3. خادم الباك إند المحلي (Word COM على Windows / LibreOffice)
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

    const accounts = getAdobeAccounts();

    let lastError: any = null;
    // ━━━ 1. الأولوية الأولى: مجمع حسابات Adobe PDF Services API (1000 تحويل/شهر) ━━━
    if (accounts.length > 0) {
      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        try {
          const pdfBuffer = await convertViaAdobe(docxBuffer, account);
          return new Response(pdfBuffer, {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": 'inline; filename="letter.pdf"',
              "Content-Length": pdfBuffer.byteLength.toString(),
              "X-PDF-Engine": "adobe",
              "X-Adobe-Account-Used": `account-${i + 1}`,
            },
          });
        } catch (err: any) {
          lastError = err;
          console.warn(`تعذر التحويل عبر ${account.name} (${err?.message})، جاري التبديل التلقائي للحساب التالي...`);
        }
      }
    }

    // ━━━ 2. الأولوية الثانية: محرك Cloudmersive Convert API الاحتياطي (800 تحويل/شهر) ━━━
    const cloudmersiveKey =
      process.env.CLOUDMERSIVE_API_KEY?.trim() || "19e0cab2-c689-4f5c-b3c0-4666d789334c";
    if (cloudmersiveKey) {
      try {
        console.log("التبديل إلى محرك Cloudmersive Convert API السحابي البديل...");
        const pdfBuffer = await convertViaCloudmersive(docxBuffer, cloudmersiveKey);
        return new Response(pdfBuffer, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'inline; filename="letter.pdf"',
            "Content-Length": pdfBuffer.byteLength.toString(),
            "X-PDF-Engine": "cloudmersive",
          },
        });
      } catch (cmErr: any) {
        lastError = cmErr;
        console.warn("فشل التحويل عبر Cloudmersive Convert API:", cmErr?.message);
      }
    }

    // ━━━ 3. الأولوية الثالثة: إرسال الطلب لخادم الباك إند الخلفي (Word COM و LibreOffice) ━━━
    try {
      const rawBackendBase =
        process.env.BACKEND_INTERNAL_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:4000";
      const backendBase = rawBackendBase.replace(/\/api\/?$/, "").replace(/\/+$/, "");
      const forwardForm = new FormData();
      const docxBlob = new Blob([new Uint8Array(docxBuffer)], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      forwardForm.append("file", docxBlob, "document.docx");

      const backendRes = await fetch(`${backendBase}/api/operations/convert-docx-to-pdf`, {
        method: "POST",
        body: forwardForm,
        signal: AbortSignal.timeout(30000),
      });

      if (backendRes.ok) {
        const backendPdf = await backendRes.arrayBuffer();
        if (backendPdf.byteLength > 1000) {
          return new Response(backendPdf, {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": 'inline; filename="letter.pdf"',
              "Content-Length": backendPdf.byteLength.toString(),
              "X-PDF-Engine": "backend-nest-fallback",
            },
          });
        }
      }
    } catch (backendErr: any) {
      console.warn("Backend conversion fallback failed:", backendErr?.message);
    }

    throw lastError || new Error("فشلت جميع محركات تحويل مستند Word إلى PDF المتاحة");
  } catch (err: any) {
    console.error("خطأ تحويل DOCX إلى PDF في Next.js Route:", err);
    return NextResponse.json(
      { error: err?.message || "فشل تحويل المستند إلى PDF عبر مجمع حسابات Adobe و Cloudmersive" },
      { status: 500 }
    );
  }
}

