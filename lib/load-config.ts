import fs from "fs/promises";
import path from "path";

async function readConfig(filename: string): Promise<string> {
  try {
    return await fs.readFile(
      path.join(process.cwd(), "config", filename),
      "utf-8"
    );
  } catch {
    return `（${filename} が見つかりません）`;
  }
}

export async function loadConfigPrompt(): Promise<string> {
  const [persona, tone, audience] = await Promise.all([
    readConfig("persona.md"),
    readConfig("author-tone.md"),
    readConfig("target-audience.md"),
  ]);

  return `あなたは以下のプロフィールを持つ書き手として記事を書いてください。

【書き手ペルソナ】
${persona}

【発信トーン】
${tone}

【ターゲット読者】
${audience}`;
}
