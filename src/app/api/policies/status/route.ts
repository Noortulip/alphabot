import { NextResponse } from "next/server";
import { RagService } from "@/lib/rag";

export async function GET() {
  try {
    const meta = RagService.getIngestionMeta();
    const chunks = RagService.getChunks();
    const sections = Array.from(new Set(chunks.map(c => c.section)));

    return NextResponse.json({
      success: true,
      data: {
        meta,
        totalChunks: chunks.length,
        sections,
        previewChunks: chunks.slice(0, 5).map(c => ({
          id: c.id,
          section: c.section,
          snippet: c.content.slice(0, 150) + "..."
        }))
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: "Failed to read policy status" }, { status: 500 });
  }
}
