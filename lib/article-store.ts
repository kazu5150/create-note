import type { ArticleWithScore } from "./generate-article";

export type StoredArticle = ArticleWithScore & { inputText: string };

// 同一タブ内のページ遷移ではモジュールレベル変数が保持される
let _stored: StoredArticle | null = null;

export function storeArticle(data: StoredArticle): void {
  _stored = data;
}

export function getStoredArticle(): StoredArticle | null {
  return _stored;
}

export function clearStoredArticle(): void {
  _stored = null;
}
