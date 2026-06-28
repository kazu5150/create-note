# note 記事ジェネレーター

学習メモやXで得た情報をテキストで貼り付けると、Claude AIがnote記事の下書きを自動生成し、図解付きでnote.comに直接アップロードするWebアプリケーション。

---

## 何ができるか

1. **記事生成** — 学習メモを入力すると、Claude APIがnote向けの構成（タイトル・冒頭フック・セクション・まとめ）を自動生成する
2. **図解自動生成** — 各セクションに必要に応じてSVGフローチャート・概念マップ・比較表を生成する
3. **AI臭チェック（stop-ai-slop-jp）** — 生成した記事を5軸50点満点で自動採点し、35点未満なら再生成する（最大2回）
4. **DB保存** — 生成した記事をSQLiteに保存し、後から一覧・削除できる
5. **note下書き投稿** — 記事をnote.com非公式APIで下書きとして直接投稿する（図解はPNG変換してS3にアップロード）

---

## 技術スタック

| 役割 | 技術 |
|------|------|
| フレームワーク | Next.js 14 (App Router) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) |
| DB | SQLite + Prisma |
| SVG→PNG変換 | `@resvg/resvg-js`（WASMベース、ネイティブ依存なし） |
| note連携 | note.com 非公式API（Cookie認証） |

---

## ディレクトリ構成

```
create-note/
├── .env.local                        # 環境変数（APIキー等）
├── .env.local.example                # 環境変数のテンプレート
├── prisma/
│   ├── schema.prisma                 # DBスキーマ定義
│   ├── migrations/                   # マイグレーション履歴
│   └── dev.db                        # SQLiteデータベース本体
├── config/
│   ├── author-tone.md                # 発信トーン（文体・口調）
│   ├── persona.md                    # 書き手ペルソナ（誰として書くか）
│   └── target-audience.md           # ターゲット読者（誰に向けて書くか）
├── app/
│   ├── layout.tsx                    # 共通レイアウト（ナビゲーション）
│   ├── page.tsx                      # トップ：入力フォーム
│   ├── preview/
│   │   └── page.tsx                  # プレビュー・DB保存・note投稿
│   ├── history/
│   │   └── page.tsx                  # 過去記事一覧
│   └── api/
│       ├── generate/route.ts         # POST: Claude APIで記事生成
│       ├── upload/route.ts           # POST: noteに下書き保存
│       └── articles/
│           ├── route.ts              # GET: 一覧取得 / POST: DB保存
│           └── [id]/route.ts         # GET: 個別取得 / DELETE: 削除
└── lib/
    ├── generate-article.ts           # 記事生成・採点ロジック
    ├── generate-svg.ts               # SVGフローチャート生成
    ├── load-config.ts                # config/*.md の読み込み
    ├── note-client.ts                # note API呼び出し・画像アップロード
    └── db.ts                         # Prisma Clientシングルトン
```

---

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. DBの初期化

```bash
npx prisma migrate dev
```

`prisma/dev.db` が作成される。

### 3. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を開いて以下を設定する。

```env
# Anthropic API キー（必須）
ANTHROPIC_API_KEY=sk-ant-...

# 使用するモデル（省略時は claude-haiku-4-5）
ANTHROPIC_MODEL=claude-haiku-4-5

# note セッションクッキー（必須）
NOTE_SESSION_COOKIE=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### NOTE_SESSION_COOKIE の取得方法

1. ブラウザで note.com にログイン
2. DevTools（F12 / Command+Option+I）を開く
3. 「ネットワーク」タブ → Fetch/XHR でフィルタ
4. note.com の API リクエストをクリック
5. 「リクエストヘッダー」の `cookie` 欄を探す
6. `_note_session_v5=` の後ろの値（`;` の手前まで）をコピー
7. `.env.local` の `NOTE_SESSION_COOKIE=` に貼り付ける

この値は発行から約3ヶ月有効。期限切れ後は同じ手順で再取得する。

### 4. 起動

```bash
npm run dev
```

`http://localhost:3000` でアクセスできる。

---

## 使い方

### 記事を生成する

1. トップページ（`/`）に学習メモやXの情報を貼り付ける
2. 「記事を生成する」ボタンを押す
3. Claude が記事を生成し、stop-ai-slop-jp で採点する（35点未満なら自動再生成）
4. プレビュー画面（`/preview`）に遷移する

### プレビュー画面でできること

- **採点スコアの確認** — 5軸（立場・リズム・主体性・具体性・削減）の点数を確認
- **DBに保存** — SQLiteに保存。`/history` で後から確認できる
- **noteに下書き保存** — note.comの下書きとして直接投稿する

### 過去記事の確認

`/history` で保存した記事の一覧、採点スコア、note下書きリンクを確認できる。

---

## 設定ファイル（config/）

`config/` 内の3ファイルを編集するだけで、コードを触らずに記事のトーンや視点を変更できる。変更はサーバー再起動なしで次回生成から即反映される。

| ファイル | 役割 | 設定例 |
|----------|------|--------|
| `author-tone.md` | 文体・口調・スタンス | 砕けた敬語、疑問形を交える、失敗談を混ぜる |
| `persona.md` | 書き手のプロフィール | プログラミング歴1年の非エンジニア、本業別にAIを独学 |
| `target-audience.md` | 想定読者 | プログラミングに興味がある30代社会人、技術用語不要 |

これらの内容はリクエストごとに読み込まれ、Claudeのシステムプロンプトに注入される（`lib/load-config.ts`）。

---

## モデルの切り替え

`.env.local` の `ANTHROPIC_MODEL` を変更するだけでモデルを切り替えられる。コード変更不要。

```env
# 検証・低コスト（デフォルト）
ANTHROPIC_MODEL=claude-haiku-4-5

# 品質重視
ANTHROPIC_MODEL=claude-sonnet-4-6

# 最高品質
ANTHROPIC_MODEL=claude-opus-4-8
```

---

## 内部実装の詳細

### 記事生成フロー（`lib/generate-article.ts`）

```
入力テキスト
  ↓
config/*.md を読み込んでシステムプロンプトを構築（lib/load-config.ts）
  ↓
Claude API に記事生成を依頼
  ↓ JSON形式で返却
  {
    title, hook,
    sections: [{ heading, body, diagram? }],
    conclusion
  }
  ↓
diagram があれば lib/generate-svg.ts で SVG 文字列を生成
  ↓
生成した記事を Claude API で採点（5軸・50点満点）
  ↓
35点未満なら再生成（最大2回）
  ↓
ArticleWithScore を返却
```

### SVG図解生成（`lib/generate-svg.ts`）

Claude が返した `diagram` スペック（type・nodes・edges）を元に、外部ライブラリなしで SVG 文字列を生成する。

| タイプ | 説明 |
|--------|------|
| `flowchart` | ノードと矢印を上から下に並べる |
| `concept-map` | 中心ノードから放射状に展開 |
| `comparison` | 左右2列の比較テーブル |

幅600px固定のインラインSVGとして出力される。

### stop-ai-slop-jp採点（`lib/generate-article.ts`内）

生成した記事を再度 Claude API に渡し、以下の5軸で採点する。

| 軸 | 評価内容 |
|----|----------|
| 立場 | 反証可能な具体的主張があるか |
| リズム | 段落の長さ・トーン・結論にムラがあるか |
| 主体性 | 誰が何をしたか明示されているか（false agencyなし） |
| 具体性 | 抽象語で終わらず固有の文脈に降りているか |
| 削減 | 削れる箇所がないか |

合計35点未満なら `generateOnce()` を再実行する（最大2回まで）。

### note投稿フロー（`lib/note-client.ts`）

```
1. POST https://note.com/api/v1/text_notes
   → 新規テキストノートを作成してIDとkeyを取得

2. 各セクションのSVGをPNGに変換してアップロード
   a. POST https://note.com/api/v3/images/upload/presigned_post
      → S3署名付きアップロードURL（action）と最終CDN URL（url）を取得
   b. @resvg/resvg-js で SVG → PNG（幅600px）に変換
   c. POST {action} に FormData（S3署名フィールド + PNGファイル）を送信
      → https://assets.st-note.com/img/... の画像URLを取得

3. 本文を note.com のエディタ形式に変換
   各要素にUUID（name/id属性）を付与:
   <p name="UUID" id="UUID">テキスト</p>
   <h2 name="UUID" id="UUID">見出し</h2>
   <figure name="UUID" id="UUID"><img src="画像URL">...</figure>

4. POST https://note.com/api/v1/text_notes/draft_save?id={noteId}&is_temp_saved=true
   → 下書き保存完了

5. https://note.com/drafts/{noteKey} のURLを返却
```

### DBスキーマ（`prisma/schema.prisma`）

```prisma
model Article {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  inputText String   // ユーザーが入力した元テキスト
  title     String
  bodyJson  String   // 生成記事全体をJSON文字列で保存（SVG含む）
  score     Int      // stop-ai-slop採点（50点満点）
  noteUrl   String?  // note下書きURL（投稿後に追記）
}
```

---

## 注意事項

- **note.com非公式APIの利用** — このアプリはnote.comの公式APIを使用していない。利用規約の変化や仕様変更によって動作しなくなる可能性がある。
- **NOTE_SESSION_COOKIE の管理** — ログイン情報に相当する値のため、`.env.local` はGitにコミットしないこと（デフォルトで `.gitignore` に含まれている）。
- **セッションの有効期限** — `_note_session_v5` は約3ヶ月で失効する。失効後は再取得が必要。
