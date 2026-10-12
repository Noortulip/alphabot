import https from "https";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { Product, Order, Customer, RefundRequest, InteractionLog } from "./types";
import { LocalStore } from "./localStore";

const SERVICE_ACCOUNT_FILE = path.join(process.cwd(), "sunlit-standard-461916-b4-d0dd91cd2ee1.json");

// Define schema headers
export const SHEET_NAMES = {
  PRODUCTS: "Products",
  ORDERS: "Orders",
  CUSTOMERS: "Customers",
  REFUNDS: "Refund Requests",
  LOGS: "Interaction Logs"
};

export const HEADERS = {
  [SHEET_NAMES.PRODUCTS]: [
    "Product_ID", "Product_Name", "Description", "Category", 
    "Unit_Price", "Discount", "Promotion", "Stock_Quantity", "Product_Status"
  ],
  [SHEET_NAMES.ORDERS]: [
    "Order_ID", "Customer_ID", "Customer_Name", "Customer_Email",
    "Product_ID", "Product_Name", "Quantity", "Unit_Price", 
    "Discount_Amount", "Total_Amount", "Order_Date", "Order_Status", 
    "Payment_Status", "Refund_Status"
  ],
  [SHEET_NAMES.CUSTOMERS]: [
    "Customer_ID", "Customer_Name", "Customer_Email", "Contact_Information"
  ],
  [SHEET_NAMES.REFUNDS]: [
    "Refund_Request_ID", "Order_ID", "Customer_ID", "Request_Date",
    "Refund_Reason", "Refund_Amount", "Eligibility_Decision", "Policy_Reference",
    "Approval_Status", "Payment_Reversal_Status", "Email_Status", "Last_Updated"
  ],
  [SHEET_NAMES.LOGS]: [
    "Interaction_ID", "Timestamp", "Session_ID", "Customer_ID",
    "Intent", "Customer_Query", "Retrieved_Data_Sources", "AI_Response",
    "Order_ID", "Refund_Request_ID", "Action_Status", "Error_Details"
  ]
};

export interface SheetsDiagnostic {
  connected: boolean;
  serviceAccountEmail: string;
  spreadsheetId: string | null;
  message: string;
  lastChecked: string;
  sheetsFound: string[];
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

export class GoogleSheetsService {
  private static cachedToken: CachedToken | null = null;

  public static getSpreadsheetId(): string | null {
    return process.env.GOOGLE_SHEETS_SPREADSHEET_ID || process.env.SPREADSHEET_ID || null;
  }

  public static getServiceAccountEmail(): string {
    try {
      if (fs.existsSync(SERVICE_ACCOUNT_FILE)) {
        const raw = fs.readFileSync(SERVICE_ACCOUNT_FILE, "utf-8");
        const json = JSON.parse(raw);
        return json.client_email || "proposal@sunlit-standard-461916-b4.iam.gserviceaccount.com";
      }
    } catch (e) {
      // ignore
    }
    return "proposal@sunlit-standard-461916-b4.iam.gserviceaccount.com";
  }

  /**
   * Acquire a fresh OAuth2 Bearer token using RS256 JWT via native HTTPS.
   * Completely immune to Windows undici/gaxios socket issues.
   */
  private static async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.cachedToken && this.cachedToken.expiresAt > now + 60) {
      return this.cachedToken.token;
    }

    if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
      throw new Error(`Google service account credentials file not found: ${SERVICE_ACCOUNT_FILE}`);
    }

    const raw = fs.readFileSync(SERVICE_ACCOUNT_FILE, "utf-8");
    const creds = JSON.parse(raw);

    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const claim = Buffer.from(JSON.stringify({
      iss: creds.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now
    })).toString("base64url");

    const sign = crypto.createSign("RSA-SHA256");
    sign.update(`${header}.${claim}`);
    const signature = sign.sign(creds.private_key, "base64url");
    const jwt = `${header}.${claim}.${signature}`;

    const postData = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;

    return new Promise<string>((resolve, reject) => {
      const req = https.request("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(postData)
        },
        timeout: 8000
      }, res => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.access_token) {
              this.cachedToken = {
                token: parsed.access_token,
                expiresAt: now + (parsed.expires_in || 3600)
              };
              resolve(parsed.access_token);
            } else {
              reject(new Error(parsed.error_description || parsed.error || "Token acquisition failed"));
            }
          } catch (e: any) {
            reject(new Error(`Failed to parse auth token response: ${e.message}`));
          }
        });
      });

      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Timeout authenticating with Google OAuth2"));
      });
      req.write(postData);
      req.end();
    });
  }

  /**
   * Helper to make HTTPS requests to the Google Sheets v4 REST API
   */
  private static async requestSheetsApi<T = any>(
    endpointPath: string,
    method: "GET" | "POST" | "PUT" = "GET",
    body: any = null
  ): Promise<{ status: number; data: T }> {
    const token = await this.getAccessToken();
    const bodyStr = body ? JSON.stringify(body) : null;

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: "sheets.googleapis.com",
        path: `/v4/spreadsheets/${endpointPath}`,
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {})
        },
        timeout: 10000
      }, res => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode || 200, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode || 200, data: data as any });
          }
        });
      });

      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Google Sheets API request timed out"));
      });
      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }

  /**
   * Check connection and diagnose Google Sheets configuration
   */
  public static async checkConnection(): Promise<SheetsDiagnostic> {
    const email = this.getServiceAccountEmail();
    const spreadsheetId = this.getSpreadsheetId();

    if (!spreadsheetId) {
      return {
        connected: false,
        serviceAccountEmail: email,
        spreadsheetId: null,
        message: "Spreadsheet ID is not configured in GOOGLE_SHEETS_SPREADSHEET_ID. Real-time store operating locally.",
        lastChecked: new Date().toISOString(),
        sheetsFound: []
      };
    }

    try {
      const res = await this.requestSheetsApi(spreadsheetId, "GET");
      if (res.status === 200 && res.data) {
        const sheetsFound = (res.data.sheets || []).map((s: any) => s.properties?.title || "");
        return {
          connected: true,
          serviceAccountEmail: email,
          spreadsheetId,
          message: `Connected successfully to Google Sheet "${res.data.properties?.title || 'TechMart Database'}"`,
          lastChecked: new Date().toISOString(),
          sheetsFound
        };
      } else {
        const errMsg = (res.data as any)?.error?.message || `HTTP ${res.status}`;
        
        // Check if live CSV export works (e.g. for Office files uploaded to Google Drive)
        const csvRows = await this.fetchSheetAsCsv(spreadsheetId);
        if (csvRows && csvRows.length > 1) {
          return {
            connected: true,
            serviceAccountEmail: email,
            spreadsheetId,
            message: `Connected live to Google Sheet in real time (${csvRows.length - 1} products synced live).`,
            lastChecked: new Date().toISOString(),
            sheetsFound: ["Products (Live Real-Time)"]
          };
        }

        let userMessage = `Google Sheets access error: ${errMsg}. Make sure to share the sheet with "${email}" as Editor.`;
        if (errMsg.includes("must not be an Office file")) {
          userMessage = `This document is currently in Excel (.xlsx) format on Google Drive. The Google Sheets API requires a native Google Sheet. To fix: Open the link, click File > 'Save as Google Sheets', and share the new sheet with "${email}" as Editor.`;
        }
        return {
          connected: false,
          serviceAccountEmail: email,
          spreadsheetId,
          message: userMessage,
          lastChecked: new Date().toISOString(),
          sheetsFound: []
        };
      }
    } catch (err: any) {
      // Check if live CSV export works
      const csvRows = await this.fetchSheetAsCsv(spreadsheetId);
      if (csvRows && csvRows.length > 1) {
        return {
          connected: true,
          serviceAccountEmail: email,
          spreadsheetId,
          message: `Connected live to Google Sheet in real time (${csvRows.length - 1} products synced live).`,
          lastChecked: new Date().toISOString(),
          sheetsFound: ["Products (Live Real-Time)"]
        };
      }

      return {
        connected: false,
        serviceAccountEmail: email,
        spreadsheetId,
        message: `Connection check failed: ${err.message || err}. Share your sheet with "${email}" as Editor.`,
        lastChecked: new Date().toISOString(),
        sheetsFound: []
      };
    }
  }

  /**
   * Helper to fetch and parse Google Sheet as live CSV
   */
  public static async fetchSheetAsCsv(spreadsheetId: string, gid?: string): Promise<string[][] | null> {
    const urls = [
      gid ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}` : null,
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=1097220337`,
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`
    ].filter(Boolean) as string[];

    for (const url of urls) {
      try {
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
        if (res.ok) {
          const text = await res.text();
          if (text && !text.includes("<!DOCTYPE html>")) {
            const parsed = this.parseCsvLines(text);
            if (parsed.length > 1) return parsed;
          }
        }
      } catch (e) {
        // try next url
      }
    }
    return null;
  }

  private static parseCsvLines(csvText: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentVal = "";
    let inQuotes = false;
    for (let i = 0; i < csvText.length; i++) {
      const c = csvText[i];
      const next = csvText[i + 1];
      if (c === '"') {
        if (inQuotes && next === '"') {
          currentVal += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        currentRow.push(currentVal.trim());
        currentVal = "";
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') i++;
        currentRow.push(currentVal.trim());
        currentVal = "";
        if (currentRow.some(val => val.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentVal += c;
      }
    }
    if (currentVal || currentRow.length > 0) {
      currentRow.push(currentVal.trim());
      if (currentRow.some(val => val.length > 0)) rows.push(currentRow);
    }
    return rows;
  }

  public static mapCsvRowsToProducts(rows: string[][]): Product[] {
    if (!rows || rows.length < 2) return [];
    const headers = rows[0].map(h => h.trim().toLowerCase());
    const catIdx = headers.findIndex(h => h.includes("cat"));
    const brandIdx = headers.findIndex(h => h.includes("brand"));
    const nameIdx = headers.findIndex(h => h.includes("model") || h.includes("product_name") || h.includes("name"));
    const descIdx = headers.findIndex(h => h.includes("spec") || h.includes("desc"));
    const bestForIdx = headers.findIndex(h => h.includes("best"));
    const priceIdx = headers.findIndex(h => h.includes("price") || h.includes("unit_price"));
    const stockIdx = headers.findIndex(h => h.includes("stock"));
    const idIdx = headers.findIndex(h => h.includes("product_id") || h.includes("id"));
    const discIdx = headers.findIndex(h => h.includes("discount"));
    const promoIdx = headers.findIndex(h => h.includes("promo"));

    const dataRows = rows.slice(1);
    return dataRows.map((r, i) => {
      const name = nameIdx >= 0 ? r[nameIdx] : "";
      const priceVal = priceIdx >= 0 ? parseFloat(String(r[priceIdx] || "0").replace(/[^0-9.]/g, "")) || 0 : 0;
      const stockVal = stockIdx >= 0 ? parseInt(String(r[stockIdx] || "0").replace(/[^0-9]/g, ""), 10) || 0 : 0;
      const category = catIdx >= 0 ? r[catIdx] : "Electronics";
      const brand = brandIdx >= 0 ? r[brandIdx] : "";
      const specs = descIdx >= 0 ? r[descIdx] : "";
      const bestFor = bestForIdx >= 0 ? r[bestForIdx] : "";
      const desc = bestFor ? `${specs}. Best for: ${bestFor}` : specs;
      const id = idIdx >= 0 && r[idIdx] ? r[idIdx] : `PROD-${String(i + 1).padStart(3, "0")}`;
      const discount = discIdx >= 0 ? r[discIdx] : "0%";
      const promotion = promoIdx >= 0 ? r[promoIdx] : "";

      return {
        Product_ID: id,
        Product_Name: name,
        Brand: brand,
        Description: desc,
        Category: category,
        Unit_Price: priceVal,
        Discount: discount,
        Promotion: promotion,
        Stock_Quantity: stockVal,
        Product_Status: stockVal > 0 ? "Active" : "Out of Stock"
      } as Product;
    }).filter(p => p.Product_Name && p.Product_Name.length > 0);
  }

  /**
   * Real-time Product Fetch
   * Never indexed in Chroma DB — queried live from Google Sheets or real-time local store!
   */
  public static async getProducts(): Promise<Product[]> {
    const spreadsheetId = this.getSpreadsheetId();
    if (!spreadsheetId) {
      return LocalStore.getProducts();
    }

    // 1. Try Google Sheets REST API v4
    try {
      const res = await this.requestSheetsApi(`${spreadsheetId}/values/${encodeURIComponent(SHEET_NAMES.PRODUCTS)}!A2:I`, "GET");
      const rows = res.data?.values;

      if (rows && rows.length > 0) {
        const products: Product[] = rows.map((r: any) => ({
          Product_ID: String(r[0] || "").trim(),
          Product_Name: String(r[1] || "").trim(),
          Description: String(r[2] || "").trim(),
          Category: String(r[3] || "").trim(),
          Unit_Price: parseFloat(String(r[4] || "0").replace(/[^0-9.]/g, "")) || 0,
          Discount: String(r[5] || "0%").trim(),
          Promotion: String(r[6] || "").trim(),
          Stock_Quantity: parseInt(String(r[7] || "0"), 10) || 0,
          Product_Status: (String(r[8] || "Active").trim() as any) || "Active"
        })).filter((p: Product) => p.Product_ID && p.Product_Name);

        LocalStore.setProducts(products);
        return products;
      }
    } catch (err) {
      // Continue to live CSV fallback
    }

    // 2. Try live Google Sheet real-time fetch via cloud link
    try {
      const csvRows = await this.fetchSheetAsCsv(spreadsheetId);
      if (csvRows && csvRows.length > 1) {
        const products = this.mapCsvRowsToProducts(csvRows);
        if (products.length > 0) {
          LocalStore.setProducts(products);
          return products;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch live products via Google Sheet cloud link:", err);
    }

    return LocalStore.getProducts();
  }

  /**
   * Sync initial products to Google Sheet
   */
  public static async syncProductsToSheet(products: Product[]): Promise<void> {
    const spreadsheetId = this.getSpreadsheetId();
    if (!spreadsheetId) return;

    try {
      await this.initializeSheetHeadersIfMissing(spreadsheetId);
      const values = products.map(p => [
        p.Product_ID,
        p.Product_Name,
        p.Description,
        p.Category,
        p.Unit_Price,
        p.Discount,
        p.Promotion,
        p.Stock_Quantity,
        p.Product_Status
      ]);

      await this.requestSheetsApi(
        `${spreadsheetId}/values/${encodeURIComponent(SHEET_NAMES.PRODUCTS)}!A2:I${values.length + 1}?valueInputOption=USER_ENTERED`,
        "PUT",
        { values }
      );
    } catch (err) {
      console.error("Error syncing products to Google Sheets:", err);
    }
  }

  /**
   * Real-time Order Appending
   * Appends to Google Sheet immediately and updates local store
   */
  public static async appendOrder(order: Order): Promise<boolean> {
    // Always store locally first
    LocalStore.createOrder(order);

    const spreadsheetId = this.getSpreadsheetId();
    if (!spreadsheetId) return true;

    try {
      await this.initializeSheetHeadersIfMissing(spreadsheetId);

      const row = [
        order.Order_ID,
        order.Customer_ID,
        order.Customer_Name,
        order.Customer_Email,
        order.Product_ID,
        order.Product_Name,
        order.Quantity,
        order.Unit_Price,
        order.Discount_Amount,
        order.Total_Amount,
        order.Order_Date,
        order.Order_Status,
        order.Payment_Status,
        order.Refund_Status
      ];

      const res = await this.requestSheetsApi(
        `${spreadsheetId}/values/${encodeURIComponent(SHEET_NAMES.ORDERS)}!A:N:append?valueInputOption=USER_ENTERED`,
        "POST",
        { values: [row] }
      );

      return res.status === 200;
    } catch (err) {
      console.error("Error writing live order to Google Sheets:", err);
      return false;
    }
  }

  /**
   * Real-time Refund Appending
   */
  public static async appendRefund(refund: RefundRequest): Promise<boolean> {
    LocalStore.createRefund(refund);

    const spreadsheetId = this.getSpreadsheetId();
    if (!spreadsheetId) return true;

    try {
      await this.initializeSheetHeadersIfMissing(spreadsheetId);

      const row = [
        refund.Refund_Request_ID,
        refund.Order_ID,
        refund.Customer_ID,
        refund.Request_Date,
        refund.Refund_Reason,
        refund.Refund_Amount,
        refund.Eligibility_Decision,
        refund.Policy_Reference,
        refund.Approval_Status,
        refund.Payment_Reversal_Status,
        refund.Email_Status,
        refund.Last_Updated
      ];

      const res = await this.requestSheetsApi(
        `${spreadsheetId}/values/${encodeURIComponent(SHEET_NAMES.REFUNDS)}!A:L:append?valueInputOption=USER_ENTERED`,
        "POST",
        { values: [row] }
      );

      return res.status === 200;
    } catch (err) {
      console.error("Error writing refund to Google Sheets:", err);
      return false;
    }
  }

  /**
   * Real-time Interaction Log Appending
   */
  public static async appendLog(log: InteractionLog): Promise<boolean> {
    LocalStore.addLog(log);

    const spreadsheetId = this.getSpreadsheetId();
    if (!spreadsheetId) return true;

    try {
      const row = [
        log.Interaction_ID,
        log.Timestamp,
        log.Session_ID,
        log.Customer_ID || "",
        log.Intent,
        log.Customer_Query,
        log.Retrieved_Data_Sources,
        log.AI_Response,
        log.Order_ID || "",
        log.Refund_Request_ID || "",
        log.Action_Status,
        log.Error_Details || ""
      ];

      const res = await this.requestSheetsApi(
        `${spreadsheetId}/values/${encodeURIComponent(SHEET_NAMES.LOGS)}!A:L:append?valueInputOption=USER_ENTERED`,
        "POST",
        { values: [row] }
      );

      return res.status === 200;
    } catch (err) {
      console.warn("Error appending log to Google Sheets:", err);
      return false;
    }
  }

  /**
   * Get raw sheet data (first N rows including header) from Google Sheets or real-time local store
   * Used by /api/debug-products to inspect raw rows with column names as JSON
   */
  public static async getRawSheetData(
    spreadsheetIdOverride?: string,
    sheetNameOverride?: string,
    limit: number = 5
  ): Promise<{
    success: boolean;
    source: string;
    connected: boolean;
    spreadsheetId: string | null;
    serviceAccountEmail: string;
    sheetTitle?: string;
    availableSheets?: string[];
    columnNames: string[];
    rowCount: number;
    rows: Record<string, any>[];
    rawValues?: any[][];
    message?: string;
    setupInstructions?: Record<string, string>;
  }> {
    const spreadsheetId = spreadsheetIdOverride || this.getSpreadsheetId();
    const serviceAccountEmail = this.getServiceAccountEmail();

    let lastApiError: string | null = null;
    if (spreadsheetId) {
      try {
        // 1. Fetch metadata to find available sheets
        const meta = await this.requestSheetsApi(spreadsheetId, "GET");
        if (meta.status === 200 && meta.data) {
          const availableSheets: string[] = (meta.data.sheets || []).map((s: any) => s.properties?.title || "");
          const targetSheet = sheetNameOverride || 
            availableSheets.find((t: string) => t.toLowerCase() === "products") || 
            availableSheets[0] || 
            SHEET_NAMES.PRODUCTS;

          // 2. Fetch rows A1:Z(limit+1) to get header + first N rows
          const res = await this.requestSheetsApi(
            `${spreadsheetId}/values/${encodeURIComponent(targetSheet)}!A1:Z${limit + 1}`,
            "GET"
          );

          if (res.status === 200 && res.data && res.data.values && res.data.values.length > 0) {
            const rawValues: any[][] = res.data.values;
            const columnNames: string[] = rawValues[0] || HEADERS[SHEET_NAMES.PRODUCTS];
            const dataRows = rawValues.slice(1, limit + 1);

            const rows = dataRows.map((row: any[]) => {
              const record: Record<string, any> = {};
              columnNames.forEach((col: string, idx: number) => {
                const colKey = col ? col.trim() : `Column_${idx + 1}`;
                record[colKey] = row[idx] !== undefined ? row[idx] : "";
              });
              return record;
            });

            return {
              success: true,
              source: "Google Sheets (Live v4 API)",
              connected: true,
              spreadsheetId,
              serviceAccountEmail,
              sheetTitle: targetSheet,
              availableSheets,
              columnNames,
              rowCount: rows.length,
              rows,
              rawValues: rawValues.slice(0, limit + 1),
              message: `Successfully loaded ${rows.length} raw rows from sheet "${targetSheet}".`
            };
          }
        } else {
          lastApiError = (meta.data as any)?.error?.message || `HTTP ${meta.status}`;
        }
      } catch (err: any) {
        lastApiError = err.message || String(err);
        console.warn("Failed to fetch raw rows from Google Sheets, falling back to local live store:", err);
      }

      // 2. Check live Google Sheet via direct cloud link
      try {
        const csvRows = await this.fetchSheetAsCsv(spreadsheetId);
        if (csvRows && csvRows.length > 1) {
          const columnNames = csvRows[0];
          const dataRows = csvRows.slice(1, limit + 1);
          const rows = dataRows.map(row => {
            const rec: Record<string, any> = {};
            columnNames.forEach((col, idx) => {
              rec[col || `Column_${idx + 1}`] = row[idx] ?? "";
            });
            return rec;
          });

          return {
            success: true,
            source: "Google Sheets (Live Real-Time Sync)",
            connected: true,
            spreadsheetId,
            serviceAccountEmail,
            sheetTitle: "Products",
            availableSheets: ["Products (Live)"],
            columnNames,
            rowCount: rows.length,
            rows,
            rawValues: csvRows.slice(0, limit + 1),
            message: `Successfully loaded ${rows.length} raw rows from Google Sheet in real time.`
          };
        }
      } catch (err) {
        // fallback
      }
    }

    // Fallback: Real-time local store first N rows
    const localProducts = LocalStore.getProducts().slice(0, limit);
    const fallbackColumns = HEADERS[SHEET_NAMES.PRODUCTS];
    const fallbackRows = localProducts.map(p => ({
      Product_ID: p.Product_ID,
      Product_Name: p.Product_Name,
      Description: p.Description,
      Category: p.Category,
      Unit_Price: p.Unit_Price,
      Discount: p.Discount,
      Promotion: p.Promotion,
      Stock_Quantity: p.Stock_Quantity,
      Product_Status: p.Product_Status
    }));

    const rawValues = [
      fallbackColumns,
      ...localProducts.map(p => [
        p.Product_ID,
        p.Product_Name,
        p.Description,
        p.Category,
        p.Unit_Price,
        p.Discount,
        p.Promotion,
        p.Stock_Quantity,
        p.Product_Status
      ])
    ];

    let fallbackMsg = spreadsheetId
      ? `Could not reach Google Sheet with ID "${spreadsheetId}". Please verify it is shared with "${serviceAccountEmail}" as Editor.`
      : "GOOGLE_SHEETS_SPREADSHEET_ID is not configured in .env.local. Returning first 5 rows from real-time local catalog.";

    if (lastApiError && lastApiError.includes("must not be an Office file")) {
      fallbackMsg = `This file is an Excel (.xlsx) file opened in Google Drive. Google Sheets API requires a native Google Sheet. In Google Sheets, click File > 'Save as Google Sheets', then share the new sheet with "${serviceAccountEmail}" as Editor.`;
    }

    return {
      success: !spreadsheetId,
      source: "Real-time Local Store Mirror",
      connected: false,
      spreadsheetId: spreadsheetId || null,
      serviceAccountEmail,
      columnNames: fallbackColumns,
      rowCount: fallbackRows.length,
      rows: fallbackRows,
      rawValues,
      message: fallbackMsg,
      setupInstructions: {
        shareWith: serviceAccountEmail,
        permissionRole: "Editor",
        conversionTip: "If uploaded as .xlsx, click File > 'Save as Google Sheets'",
        envVariable: "GOOGLE_SHEETS_SPREADSHEET_ID"
      }
    };
  }
}

