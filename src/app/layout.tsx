import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Admin Portal - UMKM Cabai Berkah",
  description: "Sistem Agentic AI & Dashboard Pemesanan UMKM Komoditas Cabai",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased font-sans bg-slate-50 text-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
