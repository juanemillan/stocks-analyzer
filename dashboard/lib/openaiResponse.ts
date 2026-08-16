type ResponseContent = { type?: unknown; text?: unknown };
type ResponseOutput = { type?: unknown; content?: unknown };

/** Extract text from a raw Responses API JSON body (not the SDK convenience field). */
export function responseOutputText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const shortcut = (data as { output_text?: unknown }).output_text;
  if (typeof shortcut === "string") return shortcut.trim();
  const output = (data as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";
  return output.flatMap((item: ResponseOutput) => {
    if (item.type !== "message" || !Array.isArray(item.content)) return [];
    return item.content.flatMap((content: ResponseContent) => content.type === "output_text" && typeof content.text === "string" ? [content.text] : []);
  }).join("\n").trim();
}
