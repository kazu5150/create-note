import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "note 記事ジェネレーター",
  description: "学習メモをnote記事に変換するツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen antialiased">
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
          <a href="/" className="font-bold text-blue-600 hover:text-blue-700">
            記事ジェネレーター
          </a>
          <a href="/history" className="text-sm text-gray-600 hover:text-gray-900">
            過去の記事
          </a>
        </nav>
        <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
