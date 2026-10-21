import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileName: string }> }
) {
  try {
    const { fileName } = await params;
    if (!fileName) {
      return new NextResponse("File name required", { status: 400 });
    }

    const safeName = decodeURIComponent(fileName).replace(/[^a-zA-Z0-9_\-\.]/g, "");
    
    // Look in possible cloud doc directories
    const searchDirs = [
      path.join(process.cwd(), "public", "cloud_docs"),
      path.join(os.tmpdir(), "cloud_docs"),
    ];

    let foundBuffer: Buffer | null = null;

    for (const dir of searchDirs) {
      const p = path.join(dir, safeName);
      if (fs.existsSync(p)) {
        foundBuffer = await fs.promises.readFile(p);
        break;
      }
    }

    if (!foundBuffer) {
      // Try querying the backend server if running
      try {
        const backendRes = await fetch(`http://localhost:4000/api/operations/public-doc/${encodeURIComponent(safeName)}`, {
          signal: AbortSignal.timeout(3000),
        });
        if (backendRes.ok) {
          const ab = await backendRes.arrayBuffer();
          if (ab && ab.byteLength > 100) {
            foundBuffer = Buffer.from(ab);
          }
        }
      } catch {}
    }

    if (!foundBuffer) {
      // Redirect to verification page if file not found
      const host = req.headers.get("host") || "";
      const proto = req.headers.get("x-forwarded-proto") || "https";
      return NextResponse.redirect(`${proto}://${host}/verify-doc?ref=${encodeURIComponent(safeName)}`);
    }

    return new NextResponse(new Uint8Array(foundBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err: any) {
    return new NextResponse(err?.message || "Server Error", { status: 500 });
  }
}
