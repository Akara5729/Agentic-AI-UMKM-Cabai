"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Flame,
  LayoutDashboard,
  Tag,
  History,
  Store,
  ExternalLink,
} from "lucide-react";

const navigation = [
  { name: "Antrean Pesanan", href: "/dashboard", icon: LayoutDashboard },
  { name: "Katalog & Edit Harga", href: "/products", icon: Tag },
  { name: "Riwayat Transaksi", href: "/history", icon: History },
  { name: "Pengaturan Toko", href: "/settings", icon: Store },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col justify-between hidden md:flex shrink-0">
        <div>
          {/* Logo & UMKM Brand */}
          <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/30">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide text-white">
                Toko Cabai Ibu Umi
              </h1>
              <p className="text-xs text-slate-400">Portal Admin UMKM</p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="p-4 space-y-1.5">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>Bot Telegram</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                Online
              </span>
            </div>
            <a
              href="https://t.me/CabaiUmiBot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-400 hover:text-red-300 font-medium inline-flex items-center gap-1"
            >
              @CabaiUmiBot
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-slate-200 py-2"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header Nav */}
        <header className="h-14 bg-slate-900 text-white flex items-center justify-between px-4 md:hidden border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm">Toko Cabai Ibu Umi</span>
          </div>
          <div className="flex items-center gap-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`p-2 rounded-lg text-xs ${
                  pathname === item.href
                    ? "bg-red-600 text-white"
                    : "text-slate-400"
                }`}
                title={item.name}
              >
                <item.icon className="w-4 h-4" />
              </Link>
            ))}
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
