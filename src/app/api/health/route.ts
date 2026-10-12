import { NextResponse } from "next/server";
import { GoogleSheetsService } from "@/lib/googleSheets";
import { RagService } from "@/lib/rag";

export async function GET() {
  const sheets = await GoogleSheetsService.checkConnection();
  const policy = RagService.getIngestionMeta();

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "TechMart RAG AI Agent",
    integrations: {
      googleSheets: {
        configured: Boolean(GoogleSheetsService.getSpreadsheetId()),
        connected: sheets.connected,
        serviceAccount: sheets.serviceAccountEmail,
        spreadsheetId: sheets.spreadsheetId
      },
      ragPolicy: {
        status: policy.status,
        version: policy.version,
        totalChunks: policy.totalChunks
      },
      geminiAi: {
        configured: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
      },
      resendEmail: {
        configured: Boolean(process.env.RESEND_API_KEY)
      }
    }
  });
}
