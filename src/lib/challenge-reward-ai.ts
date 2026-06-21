const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL =
  process.env.OPENAI_CHALLENGE_MODEL ??
  process.env.OPENAI_MISSION_MODEL ??
  "gpt-4.1-mini";

export type ChallengeRewardRequest = {
  title: string;
  description: string;
  location: string;
  durationDays: number;
  difficulty: "easy" | "medium" | "hard";
  proofMethods: Array<"photo" | "gps" | "review">;
};

export type ChallengeRewardResult = {
  reward: number;
  reason: string;
};

type ChallengeRewardPayload = {
  reward: number;
  reason: string;
};

function isChallengeRewardPayload(value: unknown): value is ChallengeRewardPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return typeof payload.reward === "number" && typeof payload.reason === "string";
}

function extractOutputText(responseBody: unknown) {
  if (!responseBody || typeof responseBody !== "object") {
    return "";
  }

  const response = responseBody as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  if (!Array.isArray(response.output)) {
    return "";
  }

  return response.output
    .flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text" && typeof content.text === "string")
    .map((content) => content.text)
    .join("");
}

function createChallengeRewardPrompt(input: ChallengeRewardRequest) {
  return [
    "학생용 친환경 챌린지의 보상 에코머니를 정해주세요.",
    "반드시 30 이상 70 이하의 정수만 선택하세요.",
    "난이도, 기간, 장소, 인증 방식이 많을수록 보상이 커질 수 있습니다.",
    "보상은 과도하게 높지 않게 현실적으로 정해 주세요.",
    "사유는 한국어 한두 문장으로 짧게 적어 주세요.",
    `제목: ${input.title}`,
    `설명: ${input.description}`,
    `장소: ${input.location}`,
    `기간(일): ${input.durationDays}`,
    `난이도: ${input.difficulty}`,
    `인증 방식: ${input.proofMethods.join(", ")}`,
  ].join("\n");
}

export async function suggestChallengeReward(
  input: ChallengeRewardRequest,
): Promise<ChallengeRewardResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_OPENAI_MODEL,
      instructions:
        "당신은 학생용 친환경 챌린지의 적절한 보상 에코머니를 정하는 도우미입니다. 안전하고 현실적인 범위로만 점수를 제안하세요.",
      input: createChallengeRewardPrompt(input),
      text: {
        format: {
          type: "json_schema",
          name: "challenge_reward",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              reward: {
                type: "integer",
                minimum: 30,
                maximum: 70,
              },
              reason: {
                type: "string",
              },
            },
            required: ["reward", "reason"],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed with status ${response.status}: ${errorText}`);
  }

  const responseBody = (await response.json()) as unknown;
  const outputText = extractOutputText(responseBody);

  if (!outputText) {
    throw new Error("OpenAI returned an empty reward response.");
  }

  const parsed = JSON.parse(outputText) as unknown;

  if (!isChallengeRewardPayload(parsed)) {
    throw new Error("OpenAI returned an invalid reward payload.");
  }

  return {
    reward: Math.max(30, Math.min(70, Math.round(parsed.reward))),
    reason: parsed.reason,
  };
}
