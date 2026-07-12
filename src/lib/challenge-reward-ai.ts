import {
  calculateChallengeRewardDetails,
  formatChallengeRewardReason,
} from "@/lib/challenge-reward-rules";

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
  const details = calculateChallengeRewardDetails(input);

  return [
    "학생용 친환경 챌린지의 보상 에코머니를 정해주세요.",
    `보상 점수는 아래 기준표로 이미 ${details.reward} EM으로 확정되었습니다.`,
    "응답의 reward는 반드시 확정 점수와 같은 정수로 보내세요.",
    "사유는 한국어로 기준별 가산점과 왜 그 점수인지 학생이 이해할 수 있게 자세히 적어 주세요.",
    `계산 요약: ${formatChallengeRewardReason(details)}`,
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
  const details = calculateChallengeRewardDetails(input);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      reward: details.reward,
      reason: formatChallengeRewardReason(details),
    };
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
        "당신은 학생용 친환경 챌린지 보상 기준을 설명하는 도우미입니다. 점수는 제공된 기준표의 확정 점수에서 바꾸지 말고, 이유를 명확하고 현실적으로 설명하세요.",
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
    reward: details.reward,
    reason: parsed.reason || formatChallengeRewardReason(details),
  };
}
