import {
  mockDailyMissions,
  mockRecentMissionHistory,
} from "@/lib/mock-daily-missions";
import { selectTodayMission } from "@/lib/daily-mission-selector";
import type {
  DailyMission,
  MissionCategory,
  MissionDifficulty,
  MissionSelectionContext,
  MissionSpace,
  ProofMethod,
  SupplyLevel,
  WeatherSensitivity,
  WeekAvailability,
} from "@/types/mission";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MISSION_MODEL ?? "gpt-4.1-mini";

export type MissionApiResult = {
  mission: DailyMission;
  source: "ai" | "mock";
  reason: string;
};

type AiMissionPayload = {
  title: string;
  category: MissionCategory;
  summary: string;
  ecoMoney: number;
  actionDifficulty: MissionDifficulty;
  proofDifficulty: MissionDifficulty;
  space: MissionSpace;
  durationMinutes: number;
  location: string;
  supplyLevel: SupplyLevel;
  supplyNote: string;
  weatherSensitivity: WeatherSensitivity;
  weekAvailability: WeekAvailability;
  proofMethod: ProofMethod;
  proofGuide: string;
  safetyNote: string;
  directImpact: string;
  exclusions: string[];
  tags: string[];
};

const categoryValues: MissionCategory[] = [
  "일회용품 줄이기",
  "분리배출",
  "에너지 절약",
  "물 절약",
  "음식물 쓰레기 줄이기",
  "친환경 이동",
  "환경 공유",
  "업사이클",
  "줍깅",
];

const difficultyValues: MissionDifficulty[] = ["low", "medium", "high"];
const spaceValues: MissionSpace[] = ["indoor", "outdoor"];
const supplyValues: SupplyLevel[] = ["none", "minimal"];
const weatherValues: WeatherSensitivity[] = ["low", "medium", "high"];
const weekValues: WeekAvailability[] = ["any", "weekday", "weekend"];
const proofValues: ProofMethod[] = ["photo", "checklist", "text", "before-after"];

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isEnumValue<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function isAiMissionPayload(value: unknown): value is AiMissionPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const mission = value as Record<string, unknown>;

  return (
    typeof mission.title === "string" &&
    isEnumValue(mission.category, categoryValues) &&
    typeof mission.summary === "string" &&
    typeof mission.ecoMoney === "number" &&
    isEnumValue(mission.actionDifficulty, difficultyValues) &&
    isEnumValue(mission.proofDifficulty, difficultyValues) &&
    isEnumValue(mission.space, spaceValues) &&
    typeof mission.durationMinutes === "number" &&
    typeof mission.location === "string" &&
    isEnumValue(mission.supplyLevel, supplyValues) &&
    typeof mission.supplyNote === "string" &&
    isEnumValue(mission.weatherSensitivity, weatherValues) &&
    isEnumValue(mission.weekAvailability, weekValues) &&
    isEnumValue(mission.proofMethod, proofValues) &&
    typeof mission.proofGuide === "string" &&
    typeof mission.safetyNote === "string" &&
    typeof mission.directImpact === "string" &&
    isStringArray(mission.exclusions) &&
    isStringArray(mission.tags)
  );
}

function buildMissionFromAi(payload: AiMissionPayload): DailyMission {
  return {
    ...payload,
    id: `ai-${payload.category}-${payload.title}`
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\u3131-\u318e\uac00-\ud7a3-]/g, ""),
  };
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

function createMissionPrompt(context: MissionSelectionContext) {
  const yesterdayMission = context.recentHistory.at(-1);

  return [
    "학생용 친환경 오늘의 미션 1개를 JSON으로 생성해 주세요.",
    "설명 문장은 모두 자연스러운 한국어로 작성해 주세요.",
    "오늘 안에 완료 가능해야 합니다.",
    "대부분의 학생이 무리 없이 실천할 수 있어야 합니다.",
    "인증 방식은 반드시 포함해 주세요.",
    "위험하지 않아야 합니다.",
    "환경 행동과 직접 관련 있어야 합니다.",
    "준비물은 없거나 최소만 허용합니다.",
    "비용이 드는 활동은 제외해 주세요.",
    "같은 카테고리가 연속으로 나오지 않게 해 주세요.",
    `오늘 날짜: ${context.date}`,
    `날씨: ${context.weather}`,
    `주말 여부: ${context.isWeekend ? "weekend" : "weekday"}`,
    `어제 카테고리: ${yesterdayMission?.category ?? "없음"}`,
    `최근 7일 기록: ${JSON.stringify(context.recentHistory)}`,
    "카테고리 후보:",
    categoryValues.join(", "),
    "에코머니 규칙:",
    "- low: 50~70",
    "- medium: 80~100",
    "- high: 110~130",
    "반드시 순수 JSON 객체만 반환해 주세요.",
  ].join("\n");
}

async function requestAiMission(context: MissionSelectionContext) {
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
        "당신은 학생용 친환경 미션 추천기입니다. 항상 안전하고 검증 가능한 미션만 제안해 주세요.",
      input: createMissionPrompt(context),
      text: {
        format: {
          type: "json_schema",
          name: "daily_mission",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              category: { type: "string", enum: categoryValues },
              summary: { type: "string" },
              ecoMoney: { type: "number" },
              actionDifficulty: { type: "string", enum: difficultyValues },
              proofDifficulty: { type: "string", enum: difficultyValues },
              space: { type: "string", enum: spaceValues },
              durationMinutes: { type: "number" },
              location: { type: "string" },
              supplyLevel: { type: "string", enum: supplyValues },
              supplyNote: { type: "string" },
              weatherSensitivity: { type: "string", enum: weatherValues },
              weekAvailability: { type: "string", enum: weekValues },
              proofMethod: { type: "string", enum: proofValues },
              proofGuide: { type: "string" },
              safetyNote: { type: "string" },
              directImpact: { type: "string" },
              exclusions: {
                type: "array",
                items: { type: "string" },
              },
              tags: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: [
              "title",
              "category",
              "summary",
              "ecoMoney",
              "actionDifficulty",
              "proofDifficulty",
              "space",
              "durationMinutes",
              "location",
              "supplyLevel",
              "supplyNote",
              "weatherSensitivity",
              "weekAvailability",
              "proofMethod",
              "proofGuide",
              "safetyNote",
              "directImpact",
              "exclusions",
              "tags",
            ],
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
    throw new Error("OpenAI response did not include output_text.");
  }

  const parsed = JSON.parse(outputText) as unknown;

  if (!isAiMissionPayload(parsed)) {
    throw new Error("AI mission payload did not match the expected format.");
  }

  return buildMissionFromAi(parsed);
}

export function getDefaultMissionContext(): MissionSelectionContext {
  return {
    date: "2026-06-21",
    weather: "cloudy",
    isWeekend: true,
    recentHistory: mockRecentMissionHistory,
  };
}

function getFallbackMission(context: MissionSelectionContext): MissionApiResult {
  const selected = selectTodayMission(context, mockDailyMissions);

  return {
    mission: selected.mission ?? mockDailyMissions[0],
    source: "mock",
    reason: "오늘의 미션을 준비했어요.",
  };
}

export async function generateTodayMission(
  context: MissionSelectionContext = getDefaultMissionContext(),
): Promise<MissionApiResult> {
  try {
    const aiMission = await requestAiMission(context);
    const selected = selectTodayMission(context, [aiMission, ...mockDailyMissions]);

    if (!selected.mission) {
      return getFallbackMission(context);
    }

    return {
      mission: selected.mission,
      source: selected.mission.id === aiMission.id ? "ai" : "mock",
      reason: "오늘 실천하기 좋은 미션을 골라 왔어요.",
    };
  } catch {
    return getFallbackMission(context);
  }
}
