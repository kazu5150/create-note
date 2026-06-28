import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      title: true,
      score: true,
      noteUrl: true,
    },
  });
  return NextResponse.json(articles);
}

export async function POST(req: NextRequest) {
  try {
    const { inputText, title, bodyJson, score } = await req.json() as {
      inputText: string;
      title: string;
      bodyJson: string;
      score: number;
    };

    const article = await prisma.article.create({
      data: { inputText, title, bodyJson, score },
    });

    return NextResponse.json(article, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
