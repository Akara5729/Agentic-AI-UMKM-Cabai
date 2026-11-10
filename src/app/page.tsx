import Link from "next/link";
import { Flame, Bot, ShieldCheck, Database, LayoutDashboard, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-gradient-to-b from-red-50 via-white to-slate-50">
      <div className="max-w-4xl w-full text-center space-y-8">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 text-red-700 text-sm font-semibold tracking-wide border border-red-200 shadow-sm">
          <Flame className="w-4 h-4 text-red-600 animate-pulse" />
          <span>Sistem Agentic AI Toko Cabai Ibu Umi • Live Produksi</span>
        </div>

        {/* Hero Title */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight">
            Otomasi Pemesanan & Customer Service{" "}
            <span className="text-red-600">Toko Cabai Ibu Umi</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-slate-600 leading-relaxed">
            Didukung oleh Agentic AI Cloudflare Workers AI Llama 3.1, Telegram Bot interaktif 24/7, dan Dashboard Antrean Realtime berbasis Supabase PostgreSQL.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 text-left">
          
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">Telegram Bot CS</h3>
            <p className="text-sm text-slate-600">
              Menjawab tanya harga, cek stok realtime, dan menerima pesanan cabai kustom secara otomatis.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">Anti-Prompt Injection</h3>
            <p className="text-sm text-slate-600">
              Multi-layer guardrail XML sandboxing dan validasi harga mutlak di sisi backend server.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">Admin Kanban</h3>
            <p className="text-sm text-slate-600">
              Pantau antrean pesanan real-time, suara bel notifikasi otomatis, dan bulk update harga tiap pagi.
            </p>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm hover:shadow transition-all"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Buka Dashboard Admin</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
          
          <div className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-100 text-slate-700 font-medium border border-slate-200">
            <Database className="w-5 h-5 text-slate-500" />
            <span>Status: Fase 1 Selesai</span>
          </div>
        </div>

      </div>
    </main>
  );
}
