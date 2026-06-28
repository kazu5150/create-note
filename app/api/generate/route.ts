import { NextRequest, NextResponse } from "next/server";
import { generateArticle } from "@/lib/generate-article";

export async function POST(req: NextRequest) {
  try {
    const { inputText } = await req.json() as { inputText: string };
    if (!inputText?.trim()) {
      return NextResponse.json({ error: "inputText が空です" }, { status: 400 });
    }
    const result = await generateArticle(inputText.trim());
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
