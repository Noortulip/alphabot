import type { Metadata } from "next";
import Link from "next/link";
import { Bot, ShieldCheck, Database, FileText, ShoppingBag, Sparkles } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "TechMart — AI Customer Support & Order Management",
  description: "Official TechMart customer support agent Alpha powered by RAG, Google Sheets API, and automated workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-slate-100 antialiased flex flex-col min-h-screen selection:bg-sky-500/30 selection:text-sky-200">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-400 p-0.5 shadow-lg shadow-sky-500/20 group-hover:shadow-sky-500/40 transition-all">
                  <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <ShoppingBag className="h-5 w-5 text-sky-400 group-hover:scale-110 transition-transform" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-sky-300 bg-clip-text text-transparent">TechMart</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">AI</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">Customer Support & Orders</p>
                </div>
              </Link>
            </div>

            {/* Nav links */}
            <nav className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60 transition-all"
              >
                <Bot className="h-4 w-4 text-sky-400" />
                <span>Chat with Alpha</span>
              </Link>

              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60 transition-all"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Admin Dashboard</span>
              </Link>

              <div className="hidden md:flex items-center gap-2 pl-3 ml-2 border-l border-slate-800">
                <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Google Sheets Ready</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-medium text-sky-400 bg-sky-950/40 border border-sky-800/40 px-2 py-0.5 rounded-full">
                  <FileText className="h-3 w-3" />
                  <span>DOCX RAG Active</span>
                </div>
              </div>
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/60 bg-slate-950 py-4 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© {new Date().getFullYear()} TechMart Electronics Store. All rights reserved.</p>
            <div className="flex items-center gap-4 text-slate-400">
              <span className="flex items-center gap-1"><Database className="h-3 w-3 text-sky-400" /> Service Account: proposal@sunlit-standard-461916-b4.iam.gserviceaccount.com</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
