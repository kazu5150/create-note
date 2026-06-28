"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ArticleWithScore } from "@/lib/generate-article";

export default function HomePage() {
  const router = useRouter();
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (!inputText.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputText }),
      });

      const data = await res.json() as ArticleWithScore & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "生成に失敗しました");

      sessionStorage.setItem("generatedArticle", JSON.stringify({ ...data, inputText }));
      router.push("/preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">記事を生成する</h1>
        <p className="mt-1 text-sm text-gray-500">
          学習メモやXで知った情報を貼り付けると、note記事の下書きを生成します。
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          学習メモ・情報
        </label>
        <textarea
          className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          placeholder="例: 今日はMCPについて調べた。MCPはModel Context Protocolの略で..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading || !inputText.trim()}
        className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "生成中..." : "記事を生成する"}
      </button>

      {loading && (
        <p className="text-center text-sm text-gray-500">
          Claude が記事を生成しています。採点が35点未満の場合は自動で再生成します（最大2回）。
        </p>
      )}
    </div>
  );
}
