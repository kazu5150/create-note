import { randomUUID } from "crypto";
import type { Article } from "./generate-article";

export type NoteUploadResult = {
  draftUrl: string;
  noteKey: string;
};

async function uploadBase64Image(
  base64: string,
  cookie: string
): Promise<string> {
  // Step A: presigned POST URLを取得
  const preForm = new FormData();
  preForm.append("filename", "image.png");

  const presignedRes = await fetch(
    "https://note.com/api/v3/images/upload/presigned_post",
    {
      method: "POST",
      headers: {
        Cookie: `_note_session_v5=${cookie}`,
        "X-Requested-With": "XMLHttpRequest",
        Origin: "https://editor.note.com",
        Referer: "https://editor.note.com/",
      },
      body: preForm,
    }
  );

  if (!presignedRes.ok) {
    const txt = await presignedRes.text();
    throw new Error(`presigned_post エラー (${presignedRes.status}): ${txt}`);
  }

  const presignedJson = (await presignedRes.json()) as {
    data: {
      url: string;
      action: string;
      post: Record<string, string>;
    };
  };
  const { url: finalUrl, action: s3Url, post } = presignedJson.data;

  // Step B: base64 → Buffer
  const pngBuffer = Buffer.from(base64, "base64");

  // Step C: S3 にアップロード（post の各フィールドを FormData に追加、file は最後）
  const s3Form = new FormData();
  for (const [k, v] of Object.entries(post)) {
    s3Form.append(k, v);
  }
  s3Form.append(
    "file",
    new Blob([new Uint8Array(pngBuffer)], { type: "image/png" }),
    "image.png"
  );

  const s3Res = await fetch(s3Url, { method: "POST", body: s3Form });
  if (!s3Res.ok && s3Res.status !== 204) {
    const txt = await s3Res.text();
    throw new Error(`S3アップロードエラー (${s3Res.status}): ${txt}`);
  }

  return finalUrl;
}

async function buildNoteBody(article: Article, cookie: string): Promise<string> {
  const parts: string[] = [];

  const hookId = randomUUID();
  parts.push(`<p name="${hookId}" id="${hookId}"><em>${article.hook}</em></p>`);

  for (const section of article.sections) {
    const hId = randomUUID();
    parts.push(`<h2 name="${hId}" id="${hId}">${section.heading}</h2>`);

    for (const line of section.body.split("\n").filter((l) => l.trim())) {
      const pId = randomUUID();
      parts.push(`<p name="${pId}" id="${pId}">${line}</p>`);
    }

    if (section.imageData) {
      try {
        const imageUrl = await uploadBase64Image(section.imageData, cookie);
        const figId = randomUUID();
        const capId = randomUUID();
        parts.push(
          `<figure name="${figId}" id="${figId}" contenteditable="false">` +
            `<img src="${imageUrl}">` +
            `<figcaption name="${capId}" id="${capId}"></figcaption>` +
            `</figure>`
        );
      } catch (e) {
        console.warn("[note-client] 画像アップロードをスキップ:", (e as Error).message);
      }
    }
  }

  for (const line of article.conclusion.split("\n").filter((l) => l.trim())) {
    const cId = randomUUID();
    parts.push(`<p name="${cId}" id="${cId}">${line}</p>`);
  }

  return parts.join("");
}

export async function uploadToNote(article: Article): Promise<NoteUploadResult> {
  const cookie = process.env.NOTE_SESSION_COOKIE;
  if (!cookie) throw new Error("NOTE_SESSION_COOKIE が設定されていません");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Cookie: `_note_session_v5=${cookie}`,
    "X-Requested-With": "XMLHttpRequest",
    Origin: "https://editor.note.com",
    Referer: "https://editor.note.com/",
  };

  // Step 1: 新規ノート作成
  const createRes = await fetch("https://note.com/api/v1/text_notes", {
    method: "POST",
    headers,
    body: JSON.stringify({ name: article.title }),
  });
  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`note 新規作成エラー (${createRes.status}): ${text}`);
  }
  const createJson = (await createRes.json()) as {
    data?: { id?: number; key?: string };
  };
  const noteId = createJson?.data?.id;
  const noteKey = createJson?.data?.key ?? "";
  if (!noteId) throw new Error("note から ID が取得できませんでした");

  // Step 2: SVGをアップロードしながら本文を構築
  const body = await buildNoteBody(article, cookie);

  // Step 3: 下書き保存
  const saveRes = await fetch(
    `https://note.com/api/v1/text_notes/draft_save?id=${noteId}&is_temp_saved=true`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: article.title,
        body,
        body_length: body.replace(/<[^>]+>/g, "").length,
        index: false,
        is_lead_form: false,
      }),
    }
  );
  if (!saveRes.ok) {
    const text = await saveRes.text();
    throw new Error(`note 下書き保存エラー (${saveRes.status}): ${text}`);
  }

  return {
    draftUrl: noteKey ? `https://note.com/drafts/${noteKey}` : "https://note.com/drafts",
    noteKey,
  };
}
