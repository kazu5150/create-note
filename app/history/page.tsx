"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type ArticleSummary = {
  id: string;
  createdAt: string;
  title: string;
  score: number;
  noteUrl: string | null;
};

export default function HistoryPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchArticles = useCallback(async () => {
    const res = await fetch("/api/articles");
    const data = await res.json() as ArticleSummary[];
    setArticles(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  async function handleDelete(id: string) {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/articles/${id}`, { method: "DELETE" });
    setArticles((prev) => prev.filter((a) => a.id !== id));
  }

  if (loading) return <p className="text-gray-500 text-sm">読み込み中...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">過去の記事</h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          + 新しく生成する
        </button>
      </div>

      {articles.length === 0 ? (
        <p className="text-gray-500 text-sm">まだ保存された記事がありません。</p>
      ) : (
        <ul className="space-y-3">
          {articles.map((a) => (
            <li
              key={a.id}
              className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-start justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 truncate">{a.title}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                  <span>{new Date(a.createdAt).toLocaleString("ja-JP")}</span>
                  <span
                    className={`font-medium ${a.score >= 40 ? "text-green-600" : a.score >= 35 ? "text-yellow-600" : "text-red-500"}`}
                  >
                    {a.score}点
                  </span>
                  {a.noteUrl && (
                    <a
                      href={a.noteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      note下書き
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(a.id)}
                className="text-xs text-red-400 hover:text-red-600 shrink-0"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
