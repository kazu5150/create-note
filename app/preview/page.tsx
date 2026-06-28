"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ArticleWithScore } from "@/lib/generate-article";

type StoredData = ArticleWithScore & { inputText: string };

function ScoreBadge({ score, details }: { score: number; details: Record<string, number> }) {
  const color = score >= 40 ? "text-green-700 bg-green-50 border-green-200" : score >= 35 ? "text-yellow-700 bg-yellow-50 border-yellow-200" : "text-red-700 bg-red-50 border-red-200";
  return (
    <div className={`border rounded-lg px-4 py-3 ${color}`}>
      <p className="font-bold text-lg">{score} / 50点</p>
      <div className="mt-1 flex flex-wrap gap-3 text-xs">
        {Object.entries(details).map(([k, v]) => (
          <span key={k}>{k}: {v}</span>
        ))}
      </div>
    </div>
  );
}

export default function PreviewPage() {
  const router = useRouter();
  const [data, setData] = useState<StoredData | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [noteUrl, setNoteUrl] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("generatedArticle");
    if (!raw) {
      router.push("/");
      return;
    }
    setData(JSON.parse(raw) as StoredData);
  }, [router]);

  if (!data) return null;

  const { article, score, scoreDetails, inputText } = data;

  async function handleSaveToDb() {
    if (!data) return;
    setSaving(true);
    setStatusMsg("");
    try {
      // imageData / eyecatchData は容量が大きいため DB には保存しない
      const articleForDb = {
        ...article,
        eyecatchData: undefined,
        sections: article.sections.map((s) => ({
          heading: s.heading,
          body: s.body,
          ...(s.imagePrompt ? { imagePrompt: s.imagePrompt } : {}),
        })),
      };
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputText,
          title: article.title,
          bodyJson: JSON.stringify(articleForDb),
          score,
        }),
      });
      const saved = await res.json() as { id?: string; error?: string };
      if (!res.ok) throw new Error(saved.error ?? "保存に失敗しました");
      setSavedId(saved.id ?? null);
      setStatusMsg("DBに保存しました");
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadToNote() {
    if (!data) return;
    setUploading(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleJson: JSON.stringify(data.article),
          articleId: savedId,
        }),
      });
      const result = await res.json() as { draftUrl?: string; error?: string };
      if (!res.ok) throw new Error(result.error ?? "アップロードに失敗しました");
      setNoteUrl(result.draftUrl ?? "");
      setStatusMsg("noteに下書き保存しました");
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">プレビュー</h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 入力に戻る
        </button>
      </div>

      <ScoreBadge score={score} details={scoreDetails} />

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        {article.eyecatchData && (
          <img
            src={`data:image/png;base64,${article.eyecatchData}`}
            alt="アイキャッチ画像"
            className="w-full rounded-lg object-cover"
          />
        )}
        <h2 className="text-xl font-bold text-gray-900">{article.title}</h2>
        <p className="text-gray-700 border-l-4 border-blue-400 pl-4 italic">{article.hook}</p>

        {article.sections.map((section, i) => (
          <div key={i} className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800">{section.heading}</h3>
            <div className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{section.body}</div>
            {section.imageData && (
              <img
                src={`data:image/png;base64,${section.imageData}`}
                alt={section.imagePrompt ?? "生成された画像"}
                className="w-full rounded-lg"
              />
            )}
          </div>
        ))}

        <div className="border-t border-gray-100 pt-4">
          <p className="text-gray-700 text-sm whitespace-pre-wrap">{article.conclusion}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSaveToDb}
          disabled={saving || !!savedId}
          className="flex-1 py-3 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "保存中..." : savedId ? "保存済み" : "DBに保存"}
        </button>
        <button
          onClick={handleUploadToNote}
          disabled={uploading}
          className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? "アップロード中..." : "noteに下書き保存"}
        </button>
      </div>

      {statusMsg && (
        <div className="text-sm text-center text-gray-600">{statusMsg}</div>
      )}

      {noteUrl && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm">
          <p className="text-blue-800 font-medium">note 下書き保存が完了しました</p>
          <a
            href={noteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {noteUrl}
          </a>
        </div>
      )}
    </div>
  );
}

