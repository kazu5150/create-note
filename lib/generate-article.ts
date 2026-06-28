import Anthropic from "@anthropic-ai/sdk";
import { generateImage } from "./generate-image";
import { loadConfigPrompt } from "./load-config";

const client = new Anthropic();

export type Section = {
  heading: string;
  body: string;
  imagePrompt?: string;
  imageData?: string;
};

export type Article = {
  title: string;
  hook: string;
  sections: Section[];
  conclusion: string;
};

export type ArticleWithScore = {
  article: Article;
  score: number;
  scoreDetails: Record<string, number>;
};

const STOP_AI_SLOP_RULES = `
【stop-ai-slop-jp ルール（厳守）】
1. false agencyを潰す: モノを主語にしない。「データが示す」→「自分が調べたら〜だった」
2. 反証可能な主張を持つ: 「重要だ」で終わらせず、誰かが反論できる具体まで降りる
3. 命題型H2を避ける: 見出しは名詞句（「〜は〜だ」型にしない）
4. 偏愛語・横文字メタファー・装飾絵文字を使わない（「手触り」「解像度」「思考のOS」「🚀」など禁止）
5. 伝聞口調を混ぜる: 調べた事実には「らしい」「ようだ」「と聞いた」を使う
6. 中間温度を入れる: 「悪くない」「まあまあ」「微妙」など両極でない表現を使う
7. 遠くから語らない: 「人々は〜」ではなく「自分は〜」「あなたは〜」で書く
8. 毒・自虐・皮肉を削らない: 必要な箇所では残す
9. ムラを入れる: 段落の長さ・トーン・結論の有無をバラけさせる
10. 3項目並列を疑う: できれば2つか1つに削る
`;

const SCORE_PROMPT = `
以下の記事を5軸で採点してください（各軸1〜10点、合計50点満点）。
採点軸:
- 立場（反証可能な具体的主張があるか）
- リズム（長さ・トーン・結論にムラがあるか）
- 主体性（誰が何をしたかが明示されているか、false agencyがないか）
- 具体性（抽象語で終わらず、固有の文脈に降りているか）
- 削減（削れる箇所はないか）

以下のJSON形式のみで返してください:
{"立場": 数値, "リズム": 数値, "主体性": 数値, "具体性": 数値, "削減": 数値}
`;

async function generateOnce(inputText: string, configPrompt: string): Promise<Article> {
  const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";

  const systemPrompt = `${configPrompt}

${STOP_AI_SLOP_RULES}

以下のJSON形式のみで返してください。説明文やマークダウンコードブロックは不要です:
{
  "title": "記事タイトル",
  "hook": "冒頭の読者を惹きつける一文（stop-ai-slop-jpルールを適用）",
  "sections": [
    {
      "heading": "セクション見出し（名詞句）",
      "body": "本文（Markdown形式。stop-ai-slop-jpルールを厳守）",
      "imagePrompt": "このセクションの内容を表すイラストの説明（日本語で記述）"
    }
  ],
  "conclusion": "まとめ（stop-ai-slop-jpルールを適用）"
}
imagePromptは全セクションには付与しないでください。記事全体で2〜3セクションのみ、視覚的に補完が最も有効なセクションだけに日本語で記述してください。imagePromptがないセクションはフィールド自体を省略してください。`;

  const message = await client.messages.create({
    model,
    max_tokens: 4000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `以下の内容をもとにnote記事を作成してください:\n\n${inputText}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("記事JSONの生成に失敗しました");

  const raw = JSON.parse(jsonMatch[0]) as Article;

  const sections: Section[] = await Promise.all(
    raw.sections.map(async (s) => {
      if (s.imagePrompt) {
        try {
          const imageData = await generateImage(s.imagePrompt);
          return { ...s, imageData };
        } catch (e) {
          console.warn("[generate-article] 画像生成をスキップ:", (e as Error).message);
          return s;
        }
      }
      return s;
    })
  );

  return { ...raw, sections };
}

async function scoreArticle(
  article: Article
): Promise<{ score: number; details: Record<string, number> }> {
  const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";
  const articleText = `タイトル: ${article.title}\n\n${article.hook}\n\n${article.sections.map((s) => `## ${s.heading}\n${s.body}`).join("\n\n")}\n\n${article.conclusion}`;

  const message = await client.messages.create({
    model,
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `${SCORE_PROMPT}\n\n--- 記事 ---\n${articleText}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const details: Record<string, number> = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  const score = Object.values(details).reduce((a, b) => a + b, 0);
  return { score, details };
}

export async function generateArticle(inputText: string): Promise<ArticleWithScore> {
  const configPrompt = await loadConfigPrompt();
  const MAX_RETRIES = 2;
  const THRESHOLD = 35;

  let article = await generateOnce(inputText, configPrompt);
  let { score, details } = await scoreArticle(article);

  for (let i = 0; i < MAX_RETRIES && score < THRESHOLD; i++) {
    article = await generateOnce(inputText, configPrompt);
    ({ score, details } = await scoreArticle(article));
  }

  return { article, score, scoreDetails: details };
}
