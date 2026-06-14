export const missionCategories = [
  "일회용품 줄이기",
  "분리배출",
  "에너지 절약",
  "물 절약",
  "음식물 쓰레기 줄이기",
  "친환경 이동",
  "환경 공유",
  "업사이클",
  "줍깅",
] as const;

export type MissionCategory = (typeof missionCategories)[number];

export type MissionSpace = "indoor" | "outdoor";
export type MissionDifficulty = "low" | "medium" | "high";
export type SupplyLevel = "none" | "minimal";
export type WeatherSensitivity = "low" | "medium" | "high";
export type WeekAvailability = "any" | "weekday" | "weekend";
export type ProofMethod = "photo" | "checklist" | "text" | "before-after";
export type WeatherCondition = "sunny" | "cloudy" | "rainy" | "snowy";

export type DailyMission = {
  id: string;
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

export type MissionHistoryEntry = {
  date: string;
  missionId: string;
  category: MissionCategory;
  actionDifficulty: MissionDifficulty;
  space: MissionSpace;
  tags: string[];
};

export type MissionSelectionContext = {
  date: string;
  weather: WeatherCondition;
  isWeekend: boolean;
  recentHistory: MissionHistoryEntry[];
};
