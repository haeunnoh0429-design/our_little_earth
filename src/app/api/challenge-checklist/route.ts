import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = process.env.OPENAI_CHALLENGE_MODEL ?? "gpt-4.1-mini";

function fallbackChecklist(description: string) {
  const items = description
    .split(/[\n,.!?·]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);

  return items.length > 0 ? items : ["친환경 행동을 실천해요", "완료 여부를 확인해요"];
}

function fallbackDifficulty(description: string) {
  const text = description.toLowerCase();
  if (/(매일|30일|한 달|장거리|어려운|모두 완료)/.test(text)) return "hard";
  if (/(일주일|7일|반복|사진|gps|인증)/.test(text)) return "medium";
  return "easy";
}

function extractOutputText(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const response = body as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  if (typeof response.output_text === "string") return response.output_text;
  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text ?? "")
    .join("");
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { title?: string; description?: string };
  const title = body.title?.trim() ?? "";
  const description = body.description?.trim() ?? "";

  if (!title || !description) {
    return NextResponse.json({ error: "제목과 해야 할 일이 필요해요." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      checklist: fallbackChecklist(description),
      difficulty: fallbackDifficulty(description),
      source: "fallback",
    });
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions:
          "학생용 친환경 챌린지의 해야 할 일을 짧고 구체적인 한국어 체크리스트로 정리하고, 시간·반복 횟수·행동 부담을 기준으로 난이도를 easy, medium, hard 중 하나로 결정하세요. 각 항목은 행동 하나만 담고 5개를 넘지 마세요.",
        input: `제목: ${title}\n해야 할 일: ${description}`,
        text: {
          format: {
            type: "json_schema",
            name: "challenge_checklist",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                checklist: {
                  type: "array",
                  minItems: 2,
                  maxItems: 5,
                  items: { type: "string" },
                },
                difficulty: {
                  type: "string",
                  enum: ["easy", "medium", "hard"],
                },
              },
              required: ["checklist", "difficulty"],
            },
          },
        },
      }),
    });
    if (!response.ok) throw new Error("request failed");
    const parsed = JSON.parse(extractOutputText(await response.json())) as {
      checklist?: unknown;
      difficulty?: unknown;
    };
    if (
      !Array.isArray(parsed.checklist) ||
      !["easy", "medium", "hard"].includes(String(parsed.difficulty))
    ) {
      throw new Error("invalid response");
    }
    return NextResponse.json({
      checklist: parsed.checklist.filter((item): item is string => typeof item === "string"),
      difficulty: parsed.difficulty,
      source: "ai",
    });
  } catch {
    return NextResponse.json({
      checklist: fallbackChecklist(description),
      difficulty: fallbackDifficulty(description),
      source: "fallback",
    });
  }
}
