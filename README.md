# 🤖 AlphaBot — TechMart AI Customer Support

> An intelligent RAG-powered AI chatbot for real-time product support, order management, and policy guidance — built with **Next.js 14**, **Google Gemini**, and **Google Sheets** as a live database.

![TechMart AlphaBot](https://img.shields.io/badge/Next.js-14-black?logo=next.js) ![Google Gemini](https://img.shields.io/badge/Google-Gemini-blue?logo=google) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript) ![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

- 💬 **Conversational AI** — Alpha, powered by Google Gemini 1.5 Flash
- 📊 **Live Google Sheets Integration** — Products, orders, and refunds sync in real time (zero ChromaDB caching for inventory)
- 🔍 **Policy RAG** — Company policies indexed with vector embeddings (Gemini `text-embedding-004`)
- 🛒 **Order Management** — Place, track, and manage orders through chat
- 💸 **Refund Evaluations** — AI-assisted refund eligibility checks grounded in policy documents
- 📧 **Email Notifications** — Automated order/refund confirmation emails via Resend
- 🛠️ **Admin Dashboard** — View live products, orders, customers, and logs
- 🔐 **Secure Architecture** — Service account credentials never committed; all secrets in `.env.local`

---

## 🏗️ Architecture

```
Customer Message
       │
       ▼
  GeminiAgent
       │
       ├── GoogleSheetsService.getProducts()     ← LIVE (no vector cache)
       │         └── CSV Export / Sheets v4 API
       │
       ├── RagService.retrieveRelevantPolicy()   ← ChromaDB (policies only)
       │         └── policy_chunks.json
       │
       └── Gemini 1.5 Flash                      ← LLM response generation
```

**Key design decision:** Product prices and stock quantities are **always fetched live** from Google Sheets — never indexed in any vector database. This ensures the chatbot always reflects the latest prices and inventory.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A Google Cloud project with:
  - Google Sheets API enabled
  - A Service Account with Editor access to your sheet
- A Google Gemini API key ([get one here](https://aistudio.google.com/app/apikey))

### 1. Clone the repo
```bash
git clone https://github.com/Noortulip/alphabot.git
cd alphabot
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

### 3. Add your Google Service Account credentials
Download your service account JSON from Google Cloud Console and place it in the project root. Update the filename reference in `src/lib/googleSheets.ts` if needed.

### 4. Set up your Google Sheet
Create a Google Sheet with these tabs:
- `Products` — columns: `Product_ID, Product_Name, Description, Category, Unit_Price, Discount, Promotion, Stock_Quantity, Product_Status`
- `Orders`
- `Customers`
- `Refund Requests`
- `Interaction Logs`

Share the sheet with your service account email as **Editor**.

### 5. Ingest company policy
Place your policy document (`.docx` or `.txt`) in the project root as `TechMart_Company_Policy.docx`. The system auto-ingests it on first run.

### 6. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🚀

---

## 📁 Project Structure

```
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main chat UI
│   │   ├── admin/               # Admin dashboard
│   │   └── api/
│   │       ├── chat/            # Chat endpoint (Gemini + RAG)
│   │       ├── debug-products/  # Live product data debug route
│   │       ├── orders/          # Order CRUD
│   │       ├── refunds/         # Refund management
│   │       └── policies/        # Policy ingestion
│   └── lib/
│       ├── gemini.ts            # AI agent (intent detection + response)
│       ├── googleSheets.ts      # Live data sync (REAL-TIME, no vector cache)
│       ├── rag.ts               # Policy RAG with vector embeddings
│       ├── localStore.ts        # In-memory runtime store
│       ├── orderManager.ts      # Order calculation & management
│       └── types.ts             # TypeScript types
├── data/
│   ├── policy_chunks.json       # Indexed policy embeddings (safe to commit)
│   └── products.json            # Local mirror (overwritten by live Sheet data)
├── .env.example                 # Environment variable template
└── TechMart_Company_Policy.docx # Company policy document (auto-ingested)
```

---

## 🔒 Security Notes

- ✅ `.env.local` is in `.gitignore` — API keys are never committed
- ✅ Service account JSON is in `.gitignore` — credentials are never committed
- ✅ Customer orders/logs are in `.gitignore` — PII is never committed
- ⚠️ Make sure your Google Sheet is **not publicly accessible** (shared only with the service account)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| AI / LLM | Google Gemini 1.5 Flash |
| Embeddings | Gemini text-embedding-004 |
| Database | Google Sheets (live) + JSON local store |
| Styling | Tailwind CSS |
| Email | Resend |

---

## 📄 License

MIT © 2024 TechMart
