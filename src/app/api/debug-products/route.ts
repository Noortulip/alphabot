import { NextRequest, NextResponse } from "next/server";
import { GoogleSheetsService } from "@/lib/googleSheets";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const spreadsheetIdOverride = url.searchParams.get("spreadsheetId") || url.searchParams.get("sheetId") || undefined;
    const requestedSheet = url.searchParams.get("sheet") || undefined;

    const result = await GoogleSheetsService.getRawSheetData(spreadsheetIdOverride, requestedSheet, 5);

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("Error in /api/debug-products:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Failed to load raw sheet rows",
      serviceAccountEmail: GoogleSheetsService.getServiceAccountEmail(),
      spreadsheetId: GoogleSheetsService.getSpreadsheetId()
    }, { status: 500 });
  }
}
