"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bot, User, Send, Sparkles, ShoppingCart, RefreshCw, CheckCircle2,
  AlertCircle, Package, ShieldCheck, X, FileText
} from "lucide-react";
import { Product, Order, RefundRequest, ChatMessage } from "@/lib/types";

// Simple markdown renderer for chat messages
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+?)\*/g, "<em>$1</em>")
    .replace(/_((?:[^_]|(?<=\\)_)+?)_/g, "<em>$1</em>")
    .replace(/^\d+\.\s(.+)$/gm, "<li style='margin: 2px 0; padding-left: 4px;'>$1</li>")
    .replace(/^[•\-]\s(.+)$/gm, "<li style='margin: 2px 0; padding-left: 4px;'>$1</li>")
    .replace(/(<li[^>]*>.*<\/li>)/g, "<ul style='list-style:none;padding:0;margin:6px 0'>$1</ul>")
    .replace(/\n/g, "<br/>");
}

const SUGGESTED_PROMPTS = [
  "What laptops are available?",
  "How much is the Apple MacBook Air M3?",
  "Do you have any current discounts?",
  "I want to buy the Apple MacBook Air M3",
  "Where is my order TM-1001?",
  "Can I request a refund for TM-1001?",
  "What is your return policy?"
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState("John Doe");
  const [customerEmail, setCustomerEmail] = useState("john@example.com");
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);

  // Modals / Quick Actions
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackOrderId, setTrackOrderId] = useState("");
  const [trackEmail, setTrackEmail] = useState("");
  const [trackResult, setTrackResult] = useState<Order | null>(null);
  const [trackError, setTrackError] = useState("");

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundOrderId, setRefundOrderId] = useState("");
  const [refundEmail, setRefundEmail] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundResult, setRefundResult] = useState<any | null>(null);
  const [refundError, setRefundError] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Initial welcome message from Alpha
    const welcomeMessage: ChatMessage = {
      id: "welcome",
      sender: "alpha",
      text: "Hello! I am **Alpha**, TechMart's AI customer-support assistant. I'm connected to our live inventory and company policy documents. I can help you find products, check discounts and stock, track orders, place new orders, or evaluate refund requests. How can I assist you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([welcomeMessage]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          sessionId: `session-${customerEmail}`,
          customerEmail,
          customerName
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        const data = json.data;
        const alphaMsg: ChatMessage = {
          id: `alpha-${Date.now()}`,
          sender: "alpha",
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          productCards: data.productCards,
          orderSummary: data.orderSummary,
          orderCard: data.orderCard,
          policyCitation: data.policyCitation
        };
        setMessages(prev => [...prev, alphaMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          sender: "alpha",
          text: json.error || "I encountered an issue retrieving verified data. Please try again or contact support@techmart.com.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: "alpha",
        text: "Network connection error. Please ensure the local service is running.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Confirm order execution
  const handleConfirmOrder = async (summary: any) => {
    setOrderSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: summary.productId,
          quantity: summary.quantity,
          customerName: summary.customerName || customerName,
          customerEmail: summary.customerEmail || customerEmail,
          idempotencyKey: `order-${Date.now()}`
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        const order: Order = json.data;
        const confirmMsg: ChatMessage = {
          id: `order-conf-${Date.now()}`,
          sender: "alpha",
          text: `Your order has been created successfully!\n\n**Order ID:** ${order.Order_ID}\n**Product:** ${order.Product_Name}\n**Quantity:** ${order.Quantity}\n**Total:** $${order.Total_Amount.toFixed(2)}\n**Status:** ${order.Order_Status}\n**Payment Status:** ${order.Payment_Status}\n\nPlease keep your Order ID for future reference. A confirmation email has been logged to ${order.Customer_Email}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          orderCard: order
        };
        setMessages(prev => [...prev, confirmMsg]);
      } else {
        alert(json.error || "Order creation could not be completed.");
      }
    } catch (err: any) {
      alert("Error committing order. Please check network.");
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Track Order Modal Submission
  const handleTrackOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError("");
    setTrackResult(null);

    try {
      const res = await fetch(`/api/orders/${trackOrderId.trim().toUpperCase()}?email=${encodeURIComponent(trackEmail.trim())}`);
      const json = await res.json();
      if (json.success && json.data) {
        setTrackResult(json.data);
      } else {
        setTrackError(json.error || "Order not found or authorization failed.");
      }
    } catch (err) {
      setTrackError("Failed to fetch order.");
    }
  };

  // Refund Modal Submission
  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRefundError("");
    setRefundResult(null);
    setRefundSubmitting(true);

    try {
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: refundOrderId.trim().toUpperCase(),
          customerEmail: refundEmail.trim(),
          refundReason: refundReason.trim()
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        setRefundResult(json.data);
      } else {
        setRefundError(json.error || "Refund evaluation failed.");
      }
    } catch (err) {
      setRefundError("Failed to submit refund evaluation.");
    } finally {
      setRefundSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 h-[calc(100vh-4rem)]">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center p-0.5 shadow-md shadow-sky-500/20">
              <div className="h-full w-full bg-slate-900 rounded-full flex items-center justify-center">
                <Bot className="h-6 w-6 text-sky-400" />
              </div>
            </div>
            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-slate-950"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">Alpha Support Agent</h1>
              <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full font-semibold">
                RAG Grounded
              </span>
            </div>
            <p className="text-xs text-slate-400">Google Sheets Sync & DOCX Policy Knowledge</p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowTrackModal(true); setTrackError(""); setTrackResult(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs font-medium text-slate-200 transition-all shadow-sm"
          >
            <Package className="h-3.5 w-3.5 text-sky-400" />
            <span>Track Order</span>
          </button>

          <button
            onClick={() => { setShowRefundModal(true); setRefundError(""); setRefundResult(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs font-medium text-slate-200 transition-all shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
            <span>Request Refund</span>
          </button>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto py-6 space-y-5 pr-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar */}
            <div className={`h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
              msg.sender === "user"
                ? "bg-sky-600 text-white"
                : "bg-slate-800 border border-slate-700 text-sky-400 shadow-sm"
            }`}>
              {msg.sender === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>

            {/* Bubble Content */}
            <div className={`max-w-[85%] sm:max-w-[75%] space-y-3 ${msg.sender === "user" ? "items-end" : "items-start"}`}>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-md ${
                msg.sender === "user"
                  ? "bg-sky-600 text-white rounded-tr-none"
                  : "bg-slate-900/90 text-slate-200 border border-slate-800/90 rounded-tl-none backdrop-blur-sm"
              }`}>
                <div
                  className="markdown-body"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
                />

                {/* Policy Citation Badge */}
                {msg.policyCitation && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center gap-1.5 text-xs text-sky-400/90 font-medium">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Policy Reference: {msg.policyCitation}</span>
                  </div>
                )}
              </div>

              {/* Product Cards Carousel */}
              {msg.productCards && msg.productCards.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {msg.productCards.map((prod) => (
                    <div
                      key={prod.Product_ID}
                      className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between shadow-sm"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
                            {prod.Category}
                          </span>
                          <span className={`text-[11px] font-semibold ${prod.Stock_Quantity > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {prod.Stock_Quantity > 0 ? `${prod.Stock_Quantity} in stock` : "Out of Stock"}
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm text-white mt-2 tracking-tight">{prod.Product_Name}</h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{prod.Description}</p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        <div>
                          <div className="text-base font-bold text-white">${prod.Unit_Price.toFixed(2)}</div>
                          {prod.Discount !== "0%" && (
                            <div className="text-[10px] text-emerald-400 font-medium">Save {prod.Discount}</div>
                          )}
                        </div>

                        <button
                          disabled={prod.Stock_Quantity === 0}
                          onClick={() => handleSendMessage(`I want to buy the ${prod.Product_Name}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs flex items-center gap-1 transition-all"
                        >
                          <ShoppingCart className="h-3 w-3" />
                          <span>Buy Now</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Order Summary Confirmation Card */}
              {msg.orderSummary && (
                <div className="p-4 rounded-xl bg-slate-900/95 border border-sky-500/30 shadow-lg shadow-sky-500/5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4" />
                      Verified Order Summary
                    </span>
                    <span className="text-xs text-slate-400">Step 4 of 5</span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Product:</span>
                      <span className="font-semibold text-white">{msg.orderSummary.productName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Quantity:</span>
                      <span>{msg.orderSummary.quantity} unit(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Unit Price:</span>
                      <span>${msg.orderSummary.unitPrice.toFixed(2)}</span>
                    </div>
                    {msg.orderSummary.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Discount:</span>
                        <span>-${msg.orderSummary.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Shipping:</span>
                      <span>{(msg.orderSummary.totalAmount - (msg.orderSummary.unitPrice * msg.orderSummary.quantity - msg.orderSummary.discountAmount)) > 0 ? "$4.99" : "FREE ($0.00)"}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-800 text-sm font-bold text-white">
                      <span>Total Amount:</span>
                      <span className="text-sky-400">${msg.orderSummary.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Customer details verification input */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">Customer Name</label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full mt-0.5 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-sky-500"
                        placeholder="Your Full Name"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">Delivery Email</label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full mt-0.5 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-sky-500"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      disabled={orderSubmitting}
                      onClick={() => handleConfirmOrder({
                        ...msg.orderSummary,
                        customerName,
                        customerEmail
                      })}
                      className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
                    >
                      {orderSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      <span>{orderSubmitting ? "Committing Order..." : "Confirm & Place Order"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Order Card Result */}
              {msg.orderCard && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-bold text-white text-sm">Order #{msg.orderCard.Order_ID}</span>
                    <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-semibold border border-sky-500/20">
                      {msg.orderCard.Order_Status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div><span className="text-slate-400">Date:</span> {msg.orderCard.Order_Date}</div>
                    <div><span className="text-slate-400">Total:</span> ${msg.orderCard.Total_Amount.toFixed(2)}</div>
                    <div><span className="text-slate-400">Payment:</span> {msg.orderCard.Payment_Status}</div>
                    <div><span className="text-slate-400">Refund:</span> {msg.orderCard.Refund_Status}</div>
                  </div>
                </div>
              )}

              <span className="text-[10px] text-slate-400 px-1">{msg.timestamp}</span>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-2">
              <span className="typing-dot h-2 w-2 rounded-full bg-sky-400 inline-block"></span>
              <span className="typing-dot h-2 w-2 rounded-full bg-sky-400 inline-block"></span>
              <span className="typing-dot h-2 w-2 rounded-full bg-sky-400 inline-block"></span>
              <span className="ml-1.5 text-xs text-slate-400">Alpha is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts Pills */}
      <div className="py-2 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
        <Sparkles className="h-3.5 w-3.5 text-sky-400 flex-shrink-0 ml-1 mr-1" />
        {SUGGESTED_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(prompt)}
            className="flex-shrink-0 px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition-all whitespace-nowrap"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="pt-2">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Alpha about products, discounts, orders, or return policies..."
            className="w-full bg-slate-900/95 border border-slate-800 rounded-xl px-4 py-3.5 pr-14 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-lg"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2.5 h-9 w-9 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-400 text-slate-950 flex items-center justify-center transition-all shadow-md shadow-sky-500/20"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="text-[11px] text-slate-400 text-center mt-2">
          Responses grounded with real-time Google Sheets database & official company DOCX policies.
        </p>
      </div>

      {/* Track Order Modal */}
      {showTrackModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowTrackModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400 border border-sky-500/20">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Track Existing Order</h3>
                <p className="text-xs text-slate-400">Requires Order ID and customer email verification</p>
              </div>
            </div>

            <form onSubmit={handleTrackOrderSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Order ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TM-1001"
                  value={trackOrderId}
                  onChange={(e) => setTrackOrderId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500 uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Associated Customer Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@example.com"
                  value={trackEmail}
                  onChange={(e) => setTrackEmail(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {trackError && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/40 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{trackError}</span>
                </div>
              )}

              {trackResult && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800 font-bold text-white">
                    <span>{trackResult.Order_ID}</span>
                    <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">{trackResult.Order_Status}</span>
                  </div>
                  <div className="space-y-1 text-slate-300">
                    <p><strong>Product:</strong> {trackResult.Product_Name} (x{trackResult.Quantity})</p>
                    <p><strong>Order Date:</strong> {trackResult.Order_Date}</p>
                    <p><strong>Total Amount:</strong> ${trackResult.Total_Amount.toFixed(2)}</p>
                    <p><strong>Payment Status:</strong> {trackResult.Payment_Status}</p>
                    <p><strong>Refund Status:</strong> {trackResult.Refund_Status}</p>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTrackModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-sky-500 text-slate-950 text-xs font-bold hover:bg-sky-400"
                >
                  Verify & Track
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowRefundModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Evaluate Refund Request</h3>
                <p className="text-xs text-slate-400">Grounded in verified orders and DOCX company policy</p>
              </div>
            </div>

            <form onSubmit={handleRefundSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Order ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TM-1001"
                  value={refundOrderId}
                  onChange={(e) => setRefundOrderId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500 uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Customer Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@example.com"
                  value={refundEmail}
                  onChange={(e) => setRefundEmail(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Reason for Return / Refund</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Device returned in original packaging within return window"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {refundError && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/40 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{refundError}</span>
                </div>
              )}

              {refundResult && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800 font-bold text-white">
                    <span>Reference #{refundResult.refundRequestId}</span>
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      refundResult.decision === "APPROVED" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                      refundResult.decision === "REJECTED" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                      "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}>
                      {refundResult.decision}
                    </span>
                  </div>
                  <div className="space-y-1 text-slate-300">
                    <p><strong>Order:</strong> {refundResult.orderId}</p>
                    <p><strong>Amount:</strong> ${refundResult.refundAmount?.toFixed(2)}</p>
                    <p><strong>Policy Rationale:</strong> {refundResult.reasonExplanation}</p>
                    <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                      <strong>Policy Reference:</strong> {refundResult.policyReference}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={refundSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {refundSubmitting && <RefreshCw className="h-3 w-3 animate-spin" />}
                  <span>Evaluate Eligibility</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
