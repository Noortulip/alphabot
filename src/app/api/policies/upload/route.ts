import { NextRequest, NextResponse } from "next/server";
import { RagService } from "@/lib/rag";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided." }, { status: 400 });
    }

    if (!file.name.endsWith(".docx") && !file.name.endsWith(".txt")) {
      return NextResponse.json({ success: false, error: "Only .docx or .txt policy files are supported." }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "File exceeds maximum size limit of 10MB." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let meta;
    if (file.name.endsWith(".docx")) {
      meta = await RagService.ingestDocxBuffer(buffer, file.name);
    } else {
      const text = buffer.toString("utf-8");
      meta = await RagService.ingestRawText(text, file.name);
    }

    return NextResponse.json({
      success: true,
      data: meta
    });
  } catch (err: any) {
    console.error("Policy upload error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to parse and ingest document." }, { status: 500 });
  }
}
