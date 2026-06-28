import OpenAI from "openai";

const client = new OpenAI();

export async function generateImage(prompt: string): Promise<string> {
  const response = await client.images.generate({
    model: "gpt-image-2",
    prompt,
    n: 1,
    size: "1024x1024",
  });

  const item = response.data?.[0];
  if (!item) return "";

  // b64_json で返ってくる場合
  if (item.b64_json) return item.b64_json;

  // URL で返ってくる場合は取得して base64 に変換
  if (item.url) {
    const res = await fetch(item.url);
    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  }

  return "";
}
