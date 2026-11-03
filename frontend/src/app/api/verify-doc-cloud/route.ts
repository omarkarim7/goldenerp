import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const opId = searchParams.get("opId") || "";
    const ref = searchParams.get("ref") || "";

    if (!ref && !opId) {
      return NextResponse.json({ error: "Reference or operation ID required" }, { status: 400 });
    }

    const cleanRef = ref.replace(/[^a-zA-Z0-9_\-]/g, "");

    // 1. Look for the local archived file in Hostinger disk storage (uploads/operations)
    const searchDirs = [
      path.resolve(process.cwd(), "uploads", "operations"),
      path.resolve(process.cwd(), "..", "uploads", "operations"),
      path.resolve(process.cwd(), "..", "backend", "uploads", "operations"),
      path.resolve(process.cwd(), "backend", "uploads", "operations"),
      path.resolve(process.cwd(), "uploads"),
      path.resolve(process.cwd(), "..", "uploads"),
      "/var/www/goldenerp/backend/uploads/operations",
      "/var/www/goldenerp/uploads/operations",
      path.join(os.tmpdir(), "goldenerp-uploads", "operations"),
    ];

    let foundFilePath: string | null = null;
    let foundFileName = `official_doc_${cleanRef || opId}.pdf`;
    let fileBuffer: Buffer | null = null;

    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const files = fs.readdirSync(dir);
        for (const f of files) {
          if (cleanRef && f.includes(cleanRef) && f.endsWith(".pdf")) {
            foundFilePath = path.join(dir, f);
            foundFileName = f;
            break;
          }
        }
      } catch {}
      if (foundFilePath) break;
    }

    // If not found by ref, look by opId in files
    if (!foundFilePath && opId) {
      for (const dir of searchDirs) {
        if (!fs.existsSync(dir)) continue;
        try {
          const files = fs.readdirSync(dir);
          for (const f of files) {
            if (f.includes(opId) && f.endsWith(".pdf")) {
              foundFilePath = path.join(dir, f);
              foundFileName = f;
              break;
            }
          }
        } catch {}
        if (foundFilePath) break;
      }
    }

    if (foundFilePath && fs.existsSync(foundFilePath)) {
      fileBuffer = fs.readFileSync(foundFilePath);
    }

    // Fallback: If not found on local disk but opId is provided, fetch document directly from Backend API
    if (!fileBuffer && opId) {
      try {
        const apiBases = [
          "http://127.0.0.1:3001/api",
          "http://localhost:3001/api",
          process.env.NEXT_PUBLIC_API_URL || "https://api.ahdahd.eu/api",
        ];

        for (const base of apiBases) {
          try {
            const listRes = await fetch(`${base}/operations/${opId}/documents`, { cache: "no-store" });
            if (listRes.ok) {
              const docs = await listRes.json();
              if (Array.isArray(docs) && docs.length > 0) {
                const targetDoc =
                  docs.find((d: any) => cleanRef && d.fileName?.includes(cleanRef) && d.fileType === "pdf") ||
                  docs.find((d: any) => d.fileType === "pdf" || d.fileName?.toLowerCase().endsWith(".pdf")) ||
                  docs[0];

                if (targetDoc) {
                  const fileRes = await fetch(`${base}/operations/${opId}/documents/${targetDoc.id}/file`, {
                    cache: "no-store",
                  });
                  if (fileRes.ok) {
                    const ab = await fileRes.arrayBuffer();
                    fileBuffer = Buffer.from(ab);
                    foundFileName = `${targetDoc.fileName || "document"}.pdf`;
                    break;
                  }
                }
              }
            }
          } catch {}
          if (fileBuffer) break;
        }
      } catch {}
    }

    // 2. If file buffer obtained from Hostinger storage or backend, upload it to Cloudflare R2 on-demand for QR scanner!
    if (fileBuffer && fileBuffer.length > 0) {

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

      const key = `official_docs/${cleanRef || "doc"}_${Date.now()}.pdf`;
      const contentDisposition = `inline; filename="official_document.pdf"; filename*=UTF-8''${encodeURIComponent(foundFileName)}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: fileBuffer,
          ContentType: "application/pdf",
          ContentDisposition: contentDisposition,
          CacheControl: "no-cache, no-store, must-revalidate, max-age=0",
        })
      );

      const directUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
          ResponseContentType: "application/pdf",
          ResponseContentDisposition: contentDisposition,
        }),
        { expiresIn: 604800 }
      );

      return NextResponse.json({
        success: true,
        url: directUrl,
        provider: "Cloudflare R2 (Sync from Hostinger Storage)",
      });
    }

    return NextResponse.json({ success: false, message: "File not archived yet in local storage" });
  } catch (err: any) {
    console.warn("Could not sync doc to Cloudflare on demand:", err?.message);
    return NextResponse.json({ success: false, message: err?.message }, { status: 500 });
  }
}
