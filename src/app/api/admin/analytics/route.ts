import { NextResponse } from "next/server";
import { LocalStore } from "@/lib/localStore";
import { GoogleSheetsService } from "@/lib/googleSheets";
import { RagService } from "@/lib/rag";

export async function GET() {
  try {
    const products = LocalStore.getProducts();
    const orders = LocalStore.getOrders();
    const refunds = LocalStore.getRefunds();
    const logs = LocalStore.getLogs();
    const policyMeta = RagService.getIngestionMeta();

    // Wrap Sheets connection check with a 3-second timeout so admin loads fast
    const sheetsCheckPromise = GoogleSheetsService.checkConnection();
    const timeoutPromise = new Promise<any>((resolve) =>
      setTimeout(() => resolve({
        connected: false,
        serviceAccountEmail: GoogleSheetsService.getServiceAccountEmail(),
        spreadsheetId: GoogleSheetsService.getSpreadsheetId(),
        message: "Spreadsheet ID not configured. Using local data store.",
        lastChecked: new Date().toISOString(),
        sheetsFound: []
      }), 3000)
    );
    const sheetsDiagnostic = await Promise.race([sheetsCheckPromise, timeoutPromise]);

    // Compute real metrics
    const totalInteractions = logs.length;
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.Order_Status !== "Cancelled" ? o.Total_Amount : 0), 0);

    const approvedRefunds = refunds.filter(r => r.Eligibility_Decision === "APPROVED").length;
    const rejectedRefunds = refunds.filter(r => r.Eligibility_Decision === "REJECTED").length;
    const pendingRefunds = refunds.filter(r => r.Eligibility_Decision === "PENDING_REVIEW").length;

    const inStockProducts = products.filter(p => p.Stock_Quantity > 0).length;
    const outOfStockProducts = products.filter(p => p.Stock_Quantity === 0).length;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalInteractions,
          totalOrders,
          totalRevenue,
          totalRefundRequests: refunds.length,
          approvedRefunds,
          rejectedRefunds,
          pendingRefunds,
          totalProducts: products.length,
          inStockProducts,
          outOfStockProducts
        },
        sheetsDiagnostic,
        policyMeta,
        recentOrders: orders.slice(0, 10),
        recentRefunds: refunds.slice(0, 10),
        recentLogs: logs.slice(0, 20)
      }
    });
  } catch (err: any) {
    console.error("Admin analytics error:", err);
    return NextResponse.json({ success: false, error: "Failed to generate analytics" }, { status: 500 });
  }
}

