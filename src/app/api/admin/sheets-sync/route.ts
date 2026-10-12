import { NextRequest, NextResponse } from "next/server";
import { GoogleSheetsService } from "@/lib/googleSheets";
import { LocalStore } from "@/lib/localStore";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "test";

    if (action === "update_id") {
      const spreadsheetId = (body.spreadsheetId || "").trim();
      if (!spreadsheetId) {
        return NextResponse.json({ success: false, error: "Please provide a valid Spreadsheet ID." }, { status: 400 });
      }

      // Update in memory
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID = spreadsheetId;

      // Update .env.local file
      const envPath = path.join(process.cwd(), ".env.local");
      let envContent = "";
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf-8");
      }
      if (envContent.includes("GOOGLE_SHEETS_SPREADSHEET_ID=")) {
        envContent = envContent.replace(/GOOGLE_SHEETS_SPREADSHEET_ID=.*/, `GOOGLE_SHEETS_SPREADSHEET_ID=${spreadsheetId}`);
      } else {
        envContent += `\nGOOGLE_SHEETS_SPREADSHEET_ID=${spreadsheetId}\n`;
      }
      fs.writeFileSync(envPath, envContent, "utf-8");

      // Initialize headers and check connection
      await GoogleSheetsService.initializeSheetHeadersIfMissing(spreadsheetId);
      const diagnostic = await GoogleSheetsService.checkConnection();

      // If connected, push products to sheet so it's populated immediately
      if (diagnostic.connected) {
        const products = LocalStore.getProducts();
        await GoogleSheetsService.syncProductsToSheet(products);
      }

      return NextResponse.json({
        success: true,
        message: diagnostic.connected 
          ? `Successfully connected to Google Sheet and synced catalog!` 
          : `Saved Spreadsheet ID. Note: ${diagnostic.message}`,
        data: diagnostic
      });
    }

    if (action === "test") {
      const diagnostic = await GoogleSheetsService.checkConnection();
      return NextResponse.json({ success: true, data: diagnostic });
    }

    if (action === "init_headers") {
      const spreadsheetId = GoogleSheetsService.getSpreadsheetId();
      if (!spreadsheetId) {
        return NextResponse.json({ success: false, error: "No Google Sheets ID configured." }, { status: 400 });
      }
      await GoogleSheetsService.initializeSheetHeadersIfMissing(spreadsheetId);
      const diagnostic = await GoogleSheetsService.checkConnection();
      return NextResponse.json({ success: true, message: "Headers and worksheets initialized in Google Sheet.", data: diagnostic });
    }

    if (action === "push_catalog") {
      const products = LocalStore.getProducts();
      await GoogleSheetsService.syncProductsToSheet(products);
      return NextResponse.json({ success: true, message: `Synced ${products.length} products to Google Sheet.` });
    }

    if (action === "pull_catalog") {
      const products = await GoogleSheetsService.getProducts();
      return NextResponse.json({ success: true, message: `Fetched ${products.length} live products directly from Google Sheet.` });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("Sheets sync error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to sync with Google Sheets" }, { status: 500 });
  }
}
