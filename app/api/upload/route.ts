import { NextRequest, NextResponse } from "next/server";
import { uploadToNote } from "@/lib/note-client";
import { prisma } from "@/lib/db";
import type { Article } from "@/lib/generate-article";

export async function POST(req: NextRequest) {
  try {
    const { articleJson, articleId } = (await req.json()) as {
      articleJson: string;
      articleId?: string;
    };

    if (!articleJson) {
      return NextResponse.json({ error: "articleJson が必要です" }, { status: 400 });
    }

    const article = JSON.parse(articleJson) as Article;
    const { draftUrl, noteKey } = await uploadToNote(article);

    if (articleId) {
      await prisma.article.update({
        where: { id: articleId },
        data: { noteUrl: draftUrl },
      });
    }

    return NextResponse.json({ draftUrl, noteKey });
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
