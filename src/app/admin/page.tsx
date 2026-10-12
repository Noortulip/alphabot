"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck, Database, FileText, ShoppingBag, RefreshCw, CheckCircle2,
  AlertTriangle, XCircle, Search, Upload, Mail, ExternalLink, ArrowUpDown,
  Filter, Eye, Clock, Layers, Cpu, Check, AlertCircle
} from "lucide-react";
import { Order, RefundRequest, InteractionLog } from "@/lib/types";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "refunds" | "sheets" | "policy" | "logs">("overview");
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [error, setError] = useState("");

  // Sync & Actions
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [spreadsheetInput, setSpreadsheetInput] = useState("");

  // Search filters
  const [orderSearch, setOrderSearch] = useState("");
  const [refundSearch, setRefundSearch] = useState("");
  const [logSearch, setLogSearch] = useState("");

  // DOCX Upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  // Policy Search Test
  const [testQuery, setTestQuery] = useState("");
  const [testResults, setTestResults] = useState<any[]>([]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/analytics");
      const json = await res.json();
      if (json.success) {
        setAnalytics(json.data);
        if (json.data?.sheetsDiagnostic?.spreadsheetId) {
          setSpreadsheetInput(json.data.sheetsDiagnostic.spreadsheetId);
        }
      } else {
        setError(json.error || "Failed to load admin analytics.");
      }
    } catch (err) {
      setError("Network error fetching analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleSheetsAction = async (action: string, extraData?: any) => {
    setSyncLoading(true);
    setSyncMessage("");
    try {
      const res = await fetch("/api/admin/sheets-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extraData })
      });
      const json = await res.json();
      if (json.success) {
        setSyncMessage(json.message || "Action completed successfully.");
        fetchAnalytics();
      } else {
        setSyncMessage(`Error: ${json.error || "Action failed."}`);
      }
    } catch (err) {
      setSyncMessage("Failed to execute Google Sheets action.");
    } finally {
      setSyncLoading(false);
    }
  };

  const handleDocxUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadStatus("");
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);

      const res = await fetch("/api/policies/upload", {
        method: "POST",
        body: formData
      });
      const json = await res.json();
      if (json.success) {
        setUploadStatus(`Success! Ingested ${json.data.totalChunks} policy chunks from ${uploadFile.name}.`);
        fetchAnalytics();
        setUploadFile(null);
      } else {
        setUploadStatus(`Failed: ${json.error || "Upload error"}`);
      }
    } catch (err: any) {
      setUploadStatus(`Upload error: ${err.message || err}`);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-sky-400 animate-spin" />
          <p className="text-sm text-slate-400">Loading TechMart Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  const summary = analytics?.summary || {};
  const sheets = analytics?.sheetsDiagnostic || {};
  const policy = analytics?.policyMeta || {};
  const orders: Order[] = analytics?.recentOrders || [];
  const refunds: RefundRequest[] = analytics?.recentRefunds || [];
  const logs: InteractionLog[] = analytics?.recentLogs || [];

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">TechMart Administration</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Operations
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time audit records, Google Sheets sync, DOCX RAG management, and customer support logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5 text-sky-400" />
            <span>Refresh Metrics</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 overflow-x-auto pb-1">
        {[
          { id: "overview", label: "Overview", icon: Layers },
          { id: "orders", label: `Orders (${summary.totalOrders || 0})`, icon: ShoppingBag },
          { id: "refunds", label: `Refunds (${summary.totalRefundRequests || 0})`, icon: RefreshCw },
          { id: "sheets", label: "Google Sheets", icon: Database },
          { id: "policy", label: "DOCX Policy RAG", icon: FileText },
          { id: "logs", label: `Audit Logs (${summary.totalInteractions || 0})`, icon: Clock }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/60"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Interactions</span>
                <Clock className="h-4 w-4 text-sky-400" />
              </div>
              <div className="text-3xl font-black text-white">{summary.totalInteractions || 0}</div>
              <p className="text-[11px] text-slate-500">Live Alpha customer inquiries</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Orders</span>
                <ShoppingBag className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-white">{summary.totalOrders || 0}</div>
              <p className="text-[11px] text-emerald-400 font-medium">Revenue: ${(summary.totalRevenue || 0).toFixed(2)}</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Refund Requests</span>
                <RefreshCw className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-3xl font-black text-white">{summary.totalRefundRequests || 0}</div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                <span className="text-emerald-400">{summary.approvedRefunds || 0} Approved</span>
                <span>•</span>
                <span className="text-rose-400">{summary.rejectedRefunds || 0} Rejected</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Products Catalog</span>
                <Cpu className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="text-3xl font-black text-white">{summary.totalProducts || 0}</div>
              <p className="text-[11px] text-slate-400">{summary.inStockProducts || 0} In Stock • {summary.outOfStockProducts || 0} Out of Stock</p>
            </div>
          </div>

          {/* Integration Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Google Sheets Status */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Database className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-bold text-white text-base">Google Sheets Integration</h3>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  sheets.connected ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                }`}>
                  {sheets.connected ? "Live Connected" : "Local Sync Ready"}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <p><strong>Service Account:</strong> <code className="text-sky-300 font-mono text-[11px]">{sheets.serviceAccountEmail}</code></p>
                <p><strong>Spreadsheet ID:</strong> {sheets.spreadsheetId || "<Set in GOOGLE_SHEETS_SPREADSHEET_ID>"}</p>
                <p className="text-slate-400 text-[11px]">{sheets.message}</p>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => handleSheetsAction("test")}
                  disabled={syncLoading}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
                >
                  Test Connection
                </button>
                <button
                  onClick={() => handleSheetsAction("init_headers")}
                  disabled={syncLoading || !sheets.spreadsheetId}
                  className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-semibold border border-sky-500/30 disabled:opacity-50"
                >
                  Initialize Worksheets
                </button>
              </div>
            </div>

            {/* DOCX RAG Policy Status */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-5 w-5 text-sky-400" />
                  <h3 className="font-bold text-white text-base">DOCX Company Policy RAG</h3>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  policy.status === "READY" ? "bg-sky-500/20 text-sky-400 border border-sky-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                }`}>
                  {policy.status || "INDEXING"}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <p><strong>Source Document:</strong> {policy.fileName || "TechMart_Company_Policy.docx"}</p>
                <p><strong>Version:</strong> {policy.version} • <strong>Total Indexed Chunks:</strong> {policy.totalChunks || 0}</p>
                <p><strong>Ingested Timestamp:</strong> {policy.ingestedAt || "Initial Seed"}</p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setActiveTab("policy")}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
                >
                  Manage Policy Documents
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: ORDERS */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search by Order ID, customer, email, or product..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Order Status</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Refund</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {orders
                  .filter(o => 
                    o.Order_ID.toLowerCase().includes(orderSearch.toLowerCase()) ||
                    o.Customer_Name.toLowerCase().includes(orderSearch.toLowerCase()) ||
                    o.Customer_Email.toLowerCase().includes(orderSearch.toLowerCase()) ||
                    o.Product_Name.toLowerCase().includes(orderSearch.toLowerCase())
                  )
                  .map((order) => (
                    <tr key={order.Order_ID} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-bold text-white">{order.Order_ID}</td>
                      <td className="p-3 font-medium">{order.Customer_Name}</td>
                      <td className="p-3 text-slate-400">{order.Customer_Email}</td>
                      <td className="p-3 font-medium text-white">{order.Product_Name}</td>
                      <td className="p-3">{order.Quantity}</td>
                      <td className="p-3 font-bold text-sky-400">${order.Total_Amount.toFixed(2)}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          {order.Order_Status}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          order.Payment_Status === "Paid" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          {order.Payment_Status}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          order.Refund_Status === "Approved" ? "bg-emerald-500/10 text-emerald-400" :
                          order.Refund_Status === "Rejected" ? "bg-rose-500/10 text-rose-400" :
                          "bg-slate-800 text-slate-400"
                        }`}>
                          {order.Refund_Status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: REFUNDS */}
      {activeTab === "refunds" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={refundSearch}
                onChange={(e) => setRefundSearch(e.target.value)}
                placeholder="Search refund reference, order ID, or reason..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Refund ID</th>
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Decision</th>
                  <th className="p-3">Policy Reference</th>
                  <th className="p-3">Approval Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {refunds
                  .filter(r =>
                    r.Refund_Request_ID.toLowerCase().includes(refundSearch.toLowerCase()) ||
                    r.Order_ID.toLowerCase().includes(refundSearch.toLowerCase()) ||
                    r.Refund_Reason.toLowerCase().includes(refundSearch.toLowerCase())
                  )
                  .map((r) => (
                    <tr key={r.Refund_Request_ID} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-bold text-white">{r.Refund_Request_ID}</td>
                      <td className="p-3 font-semibold text-sky-400">{r.Order_ID}</td>
                      <td className="p-3 text-slate-400">{r.Request_Date}</td>
                      <td className="p-3 font-medium text-slate-200">{r.Refund_Reason}</td>
                      <td className="p-3 font-bold">${r.Refund_Amount.toFixed(2)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          r.Eligibility_Decision === "APPROVED" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                          r.Eligibility_Decision === "REJECTED" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                          "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}>
                          {r.Eligibility_Decision}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 text-[11px] max-w-xs truncate" title={r.Policy_Reference}>
                        {r.Policy_Reference}
                      </td>
                      <td className="p-3">{r.Approval_Status}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: GOOGLE SHEETS */}
      {activeTab === "sheets" && (
        <div className="space-y-6">
          {/* Architectural Notice: Real-Time Fetching (Zero Chroma Indexing for Sheets) */}
          <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-800/40 flex items-start gap-3 text-xs text-sky-200">
            <ShieldCheck className="h-5 w-5 text-sky-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Real-Time Data Integration Guarantee</p>
              <p className="text-slate-300 mt-0.5">
                Google Sheets data is retrieved in <strong>real time on every single request</strong>. In strict accordance with the system architecture, Google Sheets data is <strong>never indexed in Chroma DB or vector stores</strong>, guaranteeing zero latency for stock and price updates.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-400" />
              <span>Google Sheets Real-Time Synchronization</span>
            </h3>
            <p className="text-xs text-slate-400">
              Connect your Google Spreadsheet to sync products, orders, refunds, and AI interaction logs live in real time.
            </p>

            {/* Service Account Email Info */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <p className="text-slate-300 font-medium">1. Share your Google Sheet with this Service Account Email as <strong>Editor</strong>:</p>
              <code className="text-sky-300 font-mono block bg-slate-900 p-2.5 rounded border border-slate-800 select-all">
                {sheets.serviceAccountEmail}
              </code>
            </div>

            {/* Spreadsheet ID Input & Connection */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <p className="text-slate-300 font-medium">2. Enter your Google Sheets Spreadsheet ID:</p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={spreadsheetInput}
                  onChange={(e) => setSpreadsheetInput(e.target.value)}
                  placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                />
                <button
                  onClick={() => handleSheetsAction("update_id", { spreadsheetId: spreadsheetInput })}
                  disabled={syncLoading || !spreadsheetInput.trim()}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/10"
                >
                  {syncLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  <span>Save & Connect Sheet</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                You can copy the Spreadsheet ID directly from your Google Sheet URL (the string between <code>/d/</code> and <code>/edit</code>).
              </p>
            </div>

            {/* Connection Status Indicator */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-slate-200">Current Connection Status</p>
                <p className="text-slate-400 text-[11px] mt-0.5">{sheets.message}</p>
                {sheets.sheetsFound && sheets.sheetsFound.length > 0 && (
                  <p className="text-emerald-400 text-[11px] mt-1">
                    Live Tabs Found: {sheets.sheetsFound.join(", ")}
                  </p>
                )}
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                sheets.connected ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}>
                {sheets.connected ? "Live Connected" : "Local Real-Time"}
              </span>
            </div>

            {syncMessage && (
              <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-800 text-xs text-sky-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{syncMessage}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => handleSheetsAction("test")}
                disabled={syncLoading}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5"
              >
                {syncLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
                <span>Test Connection</span>
              </button>

              <button
                onClick={() => handleSheetsAction("init_headers")}
                disabled={syncLoading || !sheets.spreadsheetId}
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-bold flex items-center gap-1.5"
              >
                <span>Initialize 5 Worksheets & Headers</span>
              </button>

              <button
                onClick={() => handleSheetsAction("push_catalog")}
                disabled={syncLoading || !sheets.spreadsheetId}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-bold flex items-center gap-1.5"
              >
                <span>Push Products to Google Sheet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: DOCX POLICY RAG */}
      {activeTab === "policy" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Upload className="h-5 w-5 text-sky-400" />
              <span>Ingest Company Policy Document (.docx)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Upload an updated Word (.docx) document to re-index refund, return, shipping, and warranty policies in the persistent vector store.
            </p>

            <form onSubmit={handleDocxUpload} className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept=".docx,.txt"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700"
              />
              <button
                type="submit"
                disabled={!uploadFile || uploading}
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5"
              >
                {uploading && <RefreshCw className="h-3 w-3 animate-spin" />}
                <span>Ingest & Embed Chunks</span>
              </button>
            </form>

            {uploadStatus && (
              <p className="text-xs text-sky-300 font-medium">{uploadStatus}</p>
            )}
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h4 className="text-sm font-bold text-white">Current Indexed Document Info</h4>
            <div className="text-xs text-slate-300 space-y-1">
              <p><strong>File Name:</strong> {policy.fileName}</p>
              <p><strong>Version:</strong> {policy.version}</p>
              <p><strong>Total Chunks in Vector Store:</strong> {policy.totalChunks}</p>
              <p><strong>Last Ingestion:</strong> {policy.ingestedAt}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB: AUDIT LOGS */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search audit logs by query, customer, or intent..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Log ID</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Intent</th>
                  <th className="p-3">Customer Query</th>
                  <th className="p-3">Data Grounding</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {logs
                  .filter(l =>
                    l.Interaction_ID.toLowerCase().includes(logSearch.toLowerCase()) ||
                    (l.Customer_ID && l.Customer_ID.toLowerCase().includes(logSearch.toLowerCase())) ||
                    l.Customer_Query.toLowerCase().includes(logSearch.toLowerCase()) ||
                    l.Intent.toLowerCase().includes(logSearch.toLowerCase())
                  )
                  .map((l) => (
                    <tr key={l.Interaction_ID} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-bold text-white">{l.Interaction_ID}</td>
                      <td className="p-3 text-slate-400">{new Date(l.Timestamp).toLocaleTimeString()}</td>
                      <td className="p-3">{l.Customer_ID || "Guest"}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {l.Intent}
                        </span>
                      </td>
                      <td className="p-3 text-white max-w-xs truncate" title={l.Customer_Query}>{l.Customer_Query}</td>
                      <td className="p-3 text-slate-400 text-[11px]">{l.Retrieved_Data_Sources}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.Action_Status === "SUCCESS" ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10"
                        }`}>
                          {l.Action_Status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
