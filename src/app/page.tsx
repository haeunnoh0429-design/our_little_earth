"use client";

import Image from "next/image";
import { type FormEvent, useEffect, useEffectEvent, useMemo, useState } from "react";
import {
  createMapActionKey,
  KakaoMapSection,
  type MapActionCompletion,
} from "@/components/map/kakao-map-section";
import { loadKakaoMap } from "@/lib/load-kakao-map";
import type { DailyMission } from "@/types/mission";

type MissionApiResponse = {
  mission: DailyMission;
  source: "ai" | "mock";
  reason: string;
};

type TabId = "home" | "map" | "mission" | "challenge" | "ranking" | "mypage";
type AuthMode = "login" | "signup";
type LocationStatus = "idle" | "loading" | "granted" | "denied" | "unsupported";
type ChallengeProofMethod = "photo" | "gps" | "review";
type ChallengeDifficulty = "easy" | "medium" | "hard";

type LoginForm = {
  grade: string;
  classRoom: string;
  name: string;
};

type SignupAnswers = {
  transport: number | null;
  delivery: number | null;
  tumbler: number | null;
  recycle: number | null;
  plastic: number | null;
  unplug: number | null;
};

type RegisteredUser = LoginForm & {
  initialDebt: number;
};

type SignupQuestion = {
  key: keyof SignupAnswers;
  question: string;
  options: Array<{ label: string; value: number }>;
};

type ChallengeReview = {
  id: string;
  author: string;
  text: string;
  rating: number;
  likes: number;
};

type ChallengeDayProof = {
  day: number;
  photoName: string;
  review: string;
  rating: number;
  submitted: boolean;
  open: boolean;
  latitude: number | null;
  longitude: number | null;
  address: string;
  locationStatus: LocationStatus;
  errorMessage: string;
};

type Challenge = {
  id: string;
  title: string;
  creator: string;
  creatorKey: string | null;
  description: string;
  location: string;
  difficulty: ChallengeDifficulty;
  proofMethods: ChallengeProofMethod[];
  participants: number;
  reward: number;
  durationDays: number;
  creatorBonusRate: number;
  creatorBonusAwarded: boolean;
  hotReviews: ChallengeReview[];
  joined: boolean;
  joinedAt: string;
  completed: boolean;
  progressOpen: boolean;
  proofDays: ChallengeDayProof[];
};

type ChallengeDraft = {
  title: string;
  description: string;
  location: string;
  difficulty: ChallengeDifficulty;
  proofMethods: ChallengeProofMethod[];
  durationDays: string;
};

type MissionVerificationState = {
  photoName: string;
  latitude: number | null;
  longitude: number | null;
  address: string;
  locationStatus: LocationStatus;
  errorMessage: string;
};

type DailyCheckinDraft = {
  date: string;
  showerMinutes: string;
  petBottleCount: string;
  carMinutes: string;
  responded: boolean;
};

type UserProfile = {
  name: string;
  school: string;
  ecoDebt: number;
  ecoMoney: number;
  clearedDebt: number;
};

type CompletedMissionRecord = {
  id: string;
  title: string;
  category: string;
  reward: number;
  completedAt: string;
};

type CompletedChallengeRecord = {
  id: string;
  title: string;
  reward: number;
  creatorBonus: number;
  completedAt: string;
};

type CompletedMapActionRecord = MapActionCompletion & {
  completedAt: string;
};

const DEFAULT_PROFILE: UserProfile = {
  name: "지구 탐험가",
  school: "우리반 초록 지구단",
  ecoDebt: 3200,
  ecoMoney: 0,
  clearedDebt: 0,
};

const TAB_ITEMS: Array<{ id: TabId; label: string }> = [
  { id: "home", label: "홈" },
  { id: "map", label: "지도" },
  { id: "mission", label: "미션" },
  { id: "challenge", label: "챌린지" },
  { id: "ranking", label: "랭킹" },
  { id: "mypage", label: "마이" },
];

const gradeOptions = [1, 2, 3];
const classOptions = Array.from({ length: 10 }, (_, index) => index + 1);
const registeredUsersStorageKey = "ole-registered-users";
const globalChallengesStorageKey = "ole-challenges";
const creatorBonusRate = 0.1;

const signupQuestions: SignupQuestion[] = [
  {
    key: "transport",
    question: "1. 가까운 거리를 이동할 때 주로 무엇을 이용하나요?",
    options: [
      { label: "자전거/도보 (+0)", value: 0 },
      { label: "대중교통 (+300)", value: 300 },
      { label: "자가용 (+500)", value: 500 },
    ],
  },
  {
    key: "delivery",
    question: "2. 일주일에 배달 음식이나 포장 음식을 얼마나 이용하나요?",
    options: [
      { label: "거의 이용하지 않음 (+0)", value: 0 },
      { label: "1~2회 (+300)", value: 300 },
      { label: "3회 이상 (+500)", value: 500 },
    ],
  },
  {
    key: "tumbler",
    question: "3. 외출할 때 텀블러나 다회용기를 챙기나요?",
    options: [
      { label: "자주 챙김 (+0)", value: 0 },
      { label: "가끔 챙김 (+300)", value: 300 },
      { label: "거의 안 챙김 (+500)", value: 500 },
    ],
  },
  {
    key: "recycle",
    question: "4. 분리수거를 얼마나 실천하나요?",
    options: [
      { label: "기준에 맞춰 잘함 (+0)", value: 0 },
      { label: "가끔 헷갈리거나 놓침 (+300)", value: 300 },
      { label: "거의 하지 않음 (+500)", value: 500 },
    ],
  },
  {
    key: "plastic",
    question: "5. 하루에 일회용 플라스틱/페트병을 얼마나 사용하나요?",
    options: [
      { label: "거의 사용하지 않음 (+0)", value: 0 },
      { label: "1~2개 (+300)", value: 300 },
      { label: "3개 이상 (+500)", value: 500 },
    ],
  },
  {
    key: "unplug",
    question: "6. 사용하지 않는 전등, 충전기, 플러그를 잘 끄거나 뽑나요?",
    options: [
      { label: "자주 실천함 (+0)", value: 0 },
      { label: "가끔 함 (+300)", value: 300 },
      { label: "거의 안 함 (+500)", value: 500 },
    ],
  },
];

const challengeDifficultyLabels: Record<ChallengeDifficulty, string> = {
  easy: "쉬움",
  medium: "보통",
  hard: "어려움",
};

const challengeProofMethodLabels: Record<ChallengeProofMethod, string> = {
  photo: "사진",
  gps: "GPS",
  review: "후기",
};

function createProofDays(durationDays: number): ChallengeDayProof[] {
  return Array.from({ length: durationDays }, (_, index) => ({
    day: index + 1,
    photoName: "",
    review: "",
    rating: 0,
    submitted: false,
    open: false,
    latitude: null,
    longitude: null,
    address: "",
    locationStatus: "idle",
    errorMessage: "",
  }));
}

function createEmptyMissionVerification(): MissionVerificationState {
  return {
    photoName: "",
    latitude: null,
    longitude: null,
    address: "",
    locationStatus: "idle",
    errorMessage: "",
  };
}

function requiresGpsProof(mission: DailyMission | null) {
  return mission?.space === "outdoor";
}

function getTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

function formatDateLabel(date: string) {
  const [year, month, day] = date.split("-");
  return `${year}.${month}.${day}`;
}

function getDayDifference(from: string, to: string) {
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T00:00:00`);
  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  return Math.max(0, Math.floor((toDate.getTime() - fromDate.getTime()) / millisecondsPerDay));
}

function calculateCheckinDebt(draft: Pick<DailyCheckinDraft, "showerMinutes" | "petBottleCount" | "carMinutes">) {
  const showerMinutes = Number(draft.showerMinutes) || 0;
  const petBottleCount = Number(draft.petBottleCount) || 0;
  const carMinutes = Number(draft.carMinutes) || 0;

  return Math.max(0, showerMinutes - 10) * 3 + petBottleCount * 5 + carMinutes * 2;
}

function createEmptyDailyCheckinDraft(date = getTodayKey()): DailyCheckinDraft {
  return {
    date,
    showerMinutes: "",
    petBottleCount: "",
    carMinutes: "",
    responded: false,
  };
}

function normalizeIdentity(form: LoginForm) {
  return {
    grade: form.grade,
    classRoom: form.classRoom,
    name: form.name.trim(),
  };
}

function getIdentityKey(form: LoginForm) {
  const normalized = normalizeIdentity(form);
  return `${normalized.grade}-${normalized.classRoom}-${normalized.name}`;
}

function createEmptySignupAnswers(): SignupAnswers {
  return {
    transport: null,
    delivery: null,
    tumbler: null,
    recycle: null,
    plastic: null,
    unplug: null,
  };
}

function calculateInitialDebt(answers: SignupAnswers) {
  return Object.values(answers).reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

function clampRating(value: number) {
  return Math.max(1, Math.min(5, Math.round(value)));
}

function sanitizeDigits(value: string) {
  return value.replace(/[^\d]/g, "");
}

function buildFallbackAddress(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

async function resolveRoadAddress(latitude: number, longitude: number) {
  try {
    const kakao = await loadKakaoMap();
    const geocoder = new kakao.maps.services.Geocoder();

    return await new Promise<string>((resolve) => {
      geocoder.coord2Address(longitude, latitude, (result, status) => {
        if (status !== kakao.maps.services.Status.OK || result.length === 0) {
          resolve(buildFallbackAddress(latitude, longitude));
          return;
        }

        const roadAddress = result[0].road_address?.address_name;
        const jibunAddress = result[0].address?.address_name;
        resolve(roadAddress ?? jibunAddress ?? buildFallbackAddress(latitude, longitude));
      });
    });
  } catch {
    return buildFallbackAddress(latitude, longitude);
  }
}

function readRegisteredUsers() {
  if (typeof window === "undefined") {
    return [] as RegisteredUser[];
  }

  const savedUsers = window.localStorage.getItem(registeredUsersStorageKey);

  if (!savedUsers) {
    return [] as RegisteredUser[];
  }

  try {
    const parsed = JSON.parse(savedUsers) as unknown;

    if (!Array.isArray(parsed)) {
      return [] as RegisteredUser[];
    }

    return parsed.filter((user): user is RegisteredUser => {
      if (typeof user !== "object" || user === null) {
        return false;
      }

      const record = user as Partial<RegisteredUser>;
      return (
        typeof record.grade === "string" &&
        typeof record.classRoom === "string" &&
        typeof record.name === "string" &&
        typeof record.initialDebt === "number"
      );
    });
  } catch {
    return [] as RegisteredUser[];
  }
}

function readStoredSessionUser() {
  if (typeof window === "undefined") {
    return null as RegisteredUser | null;
  }

  const savedUser = window.localStorage.getItem("ole-session-user");

  if (!savedUser) {
    return null as RegisteredUser | null;
  }

  try {
    return JSON.parse(savedUser) as RegisteredUser;
  } catch {
    return null as RegisteredUser | null;
  }
}

function readStoredProfile(userKey: string | null) {
  if (typeof window === "undefined" || !userKey) {
    return DEFAULT_PROFILE;
  }

  const savedProfile = window.localStorage.getItem(`ole-profile-${userKey}`);

  if (!savedProfile) {
    return DEFAULT_PROFILE;
  }

  try {
    const parsed = JSON.parse(savedProfile) as Partial<UserProfile>;

    const ecoDebt = typeof parsed.ecoDebt === "number" ? parsed.ecoDebt : DEFAULT_PROFILE.ecoDebt;

    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      ecoDebt,
      ecoMoney: ecoDebt > 0 ? 0 : typeof parsed.ecoMoney === "number" ? parsed.ecoMoney : 0,
      clearedDebt: typeof parsed.clearedDebt === "number" ? parsed.clearedDebt : 0,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function readStoredMission(userKey: string | null) {
  if (typeof window === "undefined" || !userKey) {
    return null as DailyMission | null;
  }

  const savedMission = window.localStorage.getItem(`ole-selected-mission-${userKey}`);
  const savedMissionDate = window.localStorage.getItem(`ole-selected-mission-date-${userKey}`);

  if (!savedMission || savedMissionDate !== getTodayKey()) {
    return null as DailyMission | null;
  }

  try {
    return JSON.parse(savedMission) as DailyMission;
  } catch {
    return null as DailyMission | null;
  }
}

function readStoredMissionDrawDate(userKey: string | null) {
  if (typeof window === "undefined" || !userKey) {
    return "";
  }

  return window.localStorage.getItem(`ole-mission-draw-date-${userKey}`) ?? "";
}

function readStoredCompletedMissions(userKey: string | null) {
  if (typeof window === "undefined" || !userKey) {
    return [] as CompletedMissionRecord[];
  }

  const savedCompleted = window.localStorage.getItem(`ole-completed-missions-${userKey}`);

  if (!savedCompleted) {
    return [] as CompletedMissionRecord[];
  }

  try {
    const parsed = JSON.parse(savedCompleted) as unknown;
    return Array.isArray(parsed) ? (parsed as CompletedMissionRecord[]) : [];
  } catch {
    return [] as CompletedMissionRecord[];
  }
}

function readStoredCheckinDate(userKey: string | null) {
  if (typeof window === "undefined" || !userKey) {
    return "";
  }

  return window.localStorage.getItem(`ole-daily-checkin-${userKey}`) ?? "";
}

function readStoredDailyCheckinDraft(userKey: string | null) {
  if (typeof window === "undefined" || !userKey) {
    return createEmptyDailyCheckinDraft();
  }

  const savedDraft = window.localStorage.getItem(`ole-daily-checkin-draft-${userKey}`);

  if (!savedDraft) {
    return createEmptyDailyCheckinDraft();
  }

  try {
    const parsed = JSON.parse(savedDraft) as Partial<DailyCheckinDraft>;

    if (
      typeof parsed.date !== "string" ||
      typeof parsed.showerMinutes !== "string" ||
      typeof parsed.petBottleCount !== "string" ||
      typeof parsed.carMinutes !== "string" ||
      typeof parsed.responded !== "boolean"
    ) {
      return createEmptyDailyCheckinDraft();
    }

    return parsed as DailyCheckinDraft;
  } catch {
    return createEmptyDailyCheckinDraft();
  }
}

function createFreshChallengeState(challenge: Challenge): Challenge {
  return {
    ...challenge,
    joined: false,
    joinedAt: "",
    completed: false,
    progressOpen: false,
    creatorBonusAwarded: false,
    proofDays: createProofDays(challenge.durationDays),
  };
}

const initialChallenges: Challenge[] = [
  {
    id: "challenge-1",
    title: "우리 학교 플로깅 챌린지",
    creator: "2학년 3반 박지우",
    creatorKey: null,
    description: "등교나 하교 길에 쓰레기 3개 이상 줍고 사진과 후기를 남겨 보세요.",
    location: "학교 주변과 등하굣길",
    difficulty: "easy",
    proofMethods: ["photo", "review"],
    participants: 18,
    reward: 120,
    durationDays: 1,
    creatorBonusRate,
    creatorBonusAwarded: false,
    hotReviews: [
      { id: "review-1", author: "이서준", text: "운동도 되고 길이 깨끗해져서 좋았어요.", rating: 5, likes: 14 },
      { id: "review-2", author: "최서연", text: "하교길 친구랑 같이 해서 더 재밌었어요.", rating: 4, likes: 9 },
    ],
    joined: false,
    joinedAt: "",
    completed: false,
    progressOpen: false,
    proofDays: createProofDays(1),
  },
  {
    id: "challenge-2",
    title: "일주일 물 절약 챌린지",
    creator: "3학년 2반 김하늘",
    creatorKey: null,
    description: "7일 동안 매일 물 절약 사진과 후기를 인증하면서 습관을 만드는 챌린지예요.",
    location: "집과 학교 화장실",
    difficulty: "medium",
    proofMethods: ["photo", "review"],
    participants: 24,
    reward: 150,
    durationDays: 14,
    creatorBonusRate,
    creatorBonusAwarded: false,
    hotReviews: [
      { id: "review-3", author: "김하늘", text: "일주일 넘게 하니까 진짜 습관이 생기기 시작했어요.", rating: 5, likes: 22 },
      { id: "review-4", author: "박지우", text: "매일 인증하니까 친구들이랑 서로 응원하게 돼요.", rating: 4, likes: 17 },
    ],
    joined: false,
    joinedAt: "",
    completed: false,
    progressOpen: false,
    proofDays: createProofDays(14),
  },
  {
    id: "challenge-3",
    title: "우리 반 분리배출 인증전",
    creator: "1학년 5반 최서연",
    creatorKey: null,
    description: "분리배출을 올바르게 한 사진과 별점 후기를 올려 함께 점수를 쌓아요.",
    location: "교실, 집, 분리수거장",
    difficulty: "easy",
    proofMethods: ["photo", "review"],
    participants: 11,
    reward: 90,
    durationDays: 1,
    creatorBonusRate,
    creatorBonusAwarded: false,
    hotReviews: [
      { id: "review-5", author: "김도윤", text: "생각보다 헷갈렸는데 해보니 금방 익숙해졌어요.", rating: 4, likes: 11 },
      { id: "review-6", author: "정유나", text: "사진을 찍어 올리니 더 꼼꼼하게 하게 돼요.", rating: 5, likes: 8 },
    ],
    joined: false,
    joinedAt: "",
    completed: false,
    progressOpen: false,
    proofDays: createProofDays(1),
  },
];

function readStoredChallenges() {
  if (typeof window === "undefined") {
    return initialChallenges.map(createFreshChallengeState);
  }

  const saved = window.localStorage.getItem(globalChallengesStorageKey);

  if (!saved) {
    return initialChallenges.map(createFreshChallengeState);
  }

  try {
    const parsed = JSON.parse(saved) as unknown;
    return Array.isArray(parsed)
      ? (parsed as Array<Partial<Challenge>>).map((challenge) => ({
          ...challenge,
          joinedAt: typeof challenge.joinedAt === "string" && challenge.joinedAt ? challenge.joinedAt : challenge.joined ? getTodayKey() : "",
          proofDays: Array.isArray(challenge.proofDays) ? challenge.proofDays : createProofDays(challenge.durationDays ?? 1),
        })) as Challenge[]
      : initialChallenges.map(createFreshChallengeState);
  } catch {
    return initialChallenges.map(createFreshChallengeState);
  }
}

function readStoredCompletedChallenges(userKey: string | null) {
  if (typeof window === "undefined" || !userKey) {
    return [] as CompletedChallengeRecord[];
  }

  const saved = window.localStorage.getItem(`ole-completed-challenges-${userKey}`);

  if (!saved) {
    return [] as CompletedChallengeRecord[];
  }

  try {
    const parsed = JSON.parse(saved) as unknown;
    return Array.isArray(parsed) ? (parsed as CompletedChallengeRecord[]) : [];
  } catch {
    return [] as CompletedChallengeRecord[];
  }
}

function readStoredCompletedMapActions(userKey: string | null) {
  if (typeof window === "undefined" || !userKey) {
    return [] as CompletedMapActionRecord[];
  }

  const saved = window.localStorage.getItem(`ole-completed-map-actions-${userKey}`);

  if (!saved) {
    return [] as CompletedMapActionRecord[];
  }

  try {
    const parsed = JSON.parse(saved) as unknown;
    return Array.isArray(parsed) ? (parsed as CompletedMapActionRecord[]) : [];
  } catch {
    return [] as CompletedMapActionRecord[];
  }
}

function renderStars(rating: number) {
  return "★".repeat(clampRating(rating)) + "☆".repeat(5 - clampRating(rating));
}

function groupProofDays(proofDays: ChallengeDayProof[]) {
  const groups: Array<{ label: string; days: ChallengeDayProof[] }> = [];

  for (let index = 0; index < proofDays.length; index += 7) {
    groups.push({
      label: `${Math.floor(index / 7) + 1}주차`,
      days: proofDays.slice(index, index + 7),
    });
  }

  return groups;
}

function getMapActionLabel(action: MapActionCompletion["action"]) {
  if (action === "deposit-cup") {
    return "다회용컵 보증금제";
  }

  if (action === "personal-cup") {
    return "개인컵 사용";
  }

  return "분리수거함 분리수거";
}

function applyEcoMoneyReward(profile: UserProfile, amount: number): UserProfile {
  const debtPayment = Math.min(profile.ecoDebt, amount);
  const remainingReward = amount - debtPayment;
  const nextEcoDebt = profile.ecoDebt - debtPayment;

  return {
    ...profile,
    ecoDebt: nextEcoDebt,
    ecoMoney: nextEcoDebt > 0 ? 0 : profile.ecoMoney + remainingReward,
    clearedDebt: profile.clearedDebt + debtPayment,
  };
}

function applyEcoDebtCharge(profile: UserProfile, amount: number): UserProfile {
  const moneyPayment = Math.min(profile.ecoMoney, amount);
  const remainingDebt = amount - moneyPayment;

  return {
    ...profile,
    ecoDebt: profile.ecoDebt + remainingDebt,
    ecoMoney: profile.ecoMoney - moneyPayment,
  };
}

function getChallengeActiveDay(challenge: Challenge, todayKey: string) {
  if (!challenge.joinedAt) {
    return 1;
  }

  return getDayDifference(challenge.joinedAt, todayKey) + 1;
}

function canUseChallengeDay(challenge: Challenge, day: number, todayKey: string) {
  return challenge.joined && !challenge.completed && day === getChallengeActiveDay(challenge, todayKey);
}

function awardDebtReduction(userKey: string | null, amount: number) {
  if (typeof window === "undefined" || !userKey || amount <= 0) {
    return;
  }

  const stored = readStoredProfile(userKey);
  const nextProfile = applyEcoMoneyReward(stored, amount);

  window.localStorage.setItem(`ole-profile-${userKey}`, JSON.stringify(nextProfile));
}

function updateChallengeCreatorBonus(challenge: Challenge, currentUserKey: string | null) {
  const bonus = Math.round(challenge.reward * challenge.creatorBonusRate);

  if (!challenge.creatorKey || !currentUserKey || challenge.creatorKey === currentUserKey || bonus <= 0) {
    return bonus;
  }

  awardDebtReduction(challenge.creatorKey, bonus);
  return bonus;
}

function AuthScreen({
  mode,
  form,
  signupAnswers,
  notice,
  onChange,
  onSignupAnswerChange,
  onSwitchMode,
  onSubmit,
}: {
  mode: AuthMode;
  form: LoginForm;
  signupAnswers: SignupAnswers;
  notice: string;
  onChange: (field: keyof LoginForm, value: string) => void;
  onSignupAnswerChange: (field: keyof SignupAnswers, value: number) => void;
  onSwitchMode: (mode: AuthMode) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="overflow-hidden rounded-[2.4rem] bg-white shadow-[0_22px_60px_rgba(60,98,67,0.12)]">
      <div className="bg-[linear-gradient(135deg,#dbf7d7_0%,#f7ffe6_52%,#d6ecff_100%)] p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="max-w-[17rem]">
            <p className="text-base font-bold text-[#55735d]">Our Little Earth</p>
            <h1 className="mt-2 text-[2.2rem] font-black tracking-[-0.05em] text-[#183522]">
              {mode === "signup" ? "회원가입하고 시작하기" : "로그인하고 이어가기"}
            </h1>
            <p className="mt-3 text-base leading-7 text-[#5a7460]">
              학년, 반, 이름으로 가볍게 시작하고 우리 반의 작은 지구를 함께 키워요.
            </p>
          </div>
          <div className="relative h-32 w-32 shrink-0 rounded-full bg-white/60 p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]">
            <Image src="/earth-character.svg" alt="귀여운 지구 캐릭터" fill className="object-contain p-2" priority />
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 p-8">
        <label className="block">
          <span className="mb-2 block text-base font-bold text-[#26412d]">학년</span>
          <select
            value={form.grade}
            onChange={(event) => onChange("grade", event.target.value)}
            className="w-full rounded-[1.4rem] border border-[#dbe7d7] bg-white px-5 py-4 text-base text-[#1f3526]"
            required
          >
            <option value="">학년 선택</option>
            {gradeOptions.map((grade) => (
              <option key={grade} value={String(grade)}>
                {grade}학년
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-base font-bold text-[#26412d]">반</span>
          <select
            value={form.classRoom}
            onChange={(event) => onChange("classRoom", event.target.value)}
            className="w-full rounded-[1.4rem] border border-[#dbe7d7] bg-white px-5 py-4 text-base text-[#1f3526]"
            required
          >
            <option value="">반 선택</option>
            {classOptions.map((classRoom) => (
              <option key={classRoom} value={String(classRoom)}>
                {classRoom}반
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-base font-bold text-[#26412d]">이름</span>
          <input
            type="text"
            value={form.name}
            onChange={(event) => onChange("name", event.target.value)}
            placeholder="이름 입력"
            className="w-full rounded-[1.4rem] border border-[#dbe7d7] bg-white px-5 py-4 text-base text-[#1f3526]"
            required
          />
        </label>

        {mode === "signup" ? (
          <div className="space-y-4 rounded-[1.6rem] bg-[#f7fbf3] p-5">
            <div>
              <p className="text-base font-black text-[#26412d]">초기 빚 설정</p>
              <p className="mt-1 text-sm leading-6 text-[#5a7460]">
                생활 습관 질문으로 시작할 때의 지구 빚을 정해요.
              </p>
            </div>

            {signupQuestions.map((question) => (
              <label key={question.key} className="block">
                <span className="mb-2 block text-sm font-bold leading-6 text-[#26412d]">
                  {question.question}
                </span>
                <select
                  value={signupAnswers[question.key] === null ? "" : String(signupAnswers[question.key])}
                  onChange={(event) => onSignupAnswerChange(question.key, Number(event.target.value))}
                  className="w-full rounded-[1.2rem] border border-[#dbe7d7] bg-white px-4 py-3 text-sm text-[#1f3526]"
                  required
                >
                  <option value="">선택해 주세요</option>
                  {question.options.map((option) => (
                    <option key={`${question.key}-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}

            <div className="rounded-[1.2rem] bg-white px-4 py-3 text-base font-black text-[#2a5d3b]">
              현재 설정된 초기 빚: {calculateInitialDebt(signupAnswers).toLocaleString()} EM
            </div>
          </div>
        ) : null}

        {notice ? (
          <p className="rounded-[1.2rem] bg-[#edf7ea] px-4 py-3 text-base font-bold text-[#2a5d3b]">
            {notice}
          </p>
        ) : null}

        <button type="submit" className="w-full rounded-[1.3rem] bg-[#2a5d3b] px-5 py-4 text-base font-black text-white">
          {mode === "signup" ? "회원가입" : "로그인"}
        </button>

        <button
          type="button"
          onClick={() => onSwitchMode(mode === "signup" ? "login" : "signup")}
          className="w-full rounded-[1.3rem] border border-[#dbe7d7] bg-white px-5 py-4 text-base font-black text-[#24482f]"
        >
          {mode === "signup" ? "로그인으로 돌아가기" : "회원가입하기"}
        </button>
      </form>
    </section>
  );
}

function RatingPicker({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => onChange(rating)}
          className={`rounded-full px-3 py-2 text-sm font-black ${
            value >= rating ? "bg-[#ffe39a] text-[#7f5a17]" : "bg-white text-[#7c8b77] ring-1 ring-[#d9e7d4]"
          }`}
        >
          ★ {rating}
        </button>
      ))}
    </div>
  );
}

function ProofDayCard({
  dayProof,
  requiredProofMethods,
  isActiveDay,
  onOpen,
  onPhotoChange,
  onVerifyLocation,
  onReviewChange,
  onRatingChange,
  onSubmit,
}: {
  dayProof: ChallengeDayProof;
  requiredProofMethods: ChallengeProofMethod[];
  isActiveDay: boolean;
  onOpen: () => void;
  onPhotoChange: (photoName: string) => void;
  onVerifyLocation: () => void;
  onReviewChange: (review: string) => void;
  onRatingChange: (rating: number) => void;
  onSubmit: () => void;
}) {
  const requiresPhoto = requiredProofMethods.includes("photo");
  const requiresGps = requiredProofMethods.includes("gps");
  const requiresReview = requiredProofMethods.includes("review");
  const canSubmit =
    (!requiresPhoto || dayProof.photoName.trim() !== "") &&
    (!requiresGps || dayProof.locationStatus === "granted") &&
    (!requiresReview || (dayProof.review.trim() !== "" && dayProof.rating > 0)) &&
    isActiveDay;

  return (
    <div className="rounded-[1.4rem] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-black text-[#21452f]">Day {dayProof.day}</p>
          <p className="mt-1 text-sm text-[#5d725e]">
            {dayProof.submitted ? "인증이 제출됐어요." : "오늘 인증을 제출해 보세요."}
          </p>
        </div>
        {dayProof.submitted ? (
          <span className="rounded-full bg-[#2c6a41] px-4 py-2 text-sm font-black text-white">완료</span>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            disabled={!isActiveDay}
            className="rounded-full bg-[#e9f4de] px-4 py-2 text-sm font-black text-[#2c6a41] disabled:cursor-not-allowed disabled:bg-[#eef1e8] disabled:text-[#94a194]"
          >
            {dayProof.open ? "닫기" : isActiveDay ? "인증하기" : "오늘 불가"}
          </button>
        )}
      </div>

      {dayProof.submitted ? (
        <div className="mt-4 space-y-2 text-sm text-[#5d725e]">
          {requiresPhoto ? <p>사진: {dayProof.photoName}</p> : null}
          {requiresGps && dayProof.address ? <p>위치 인증 주소: {dayProof.address}</p> : null}
          {requiresReview ? (
            <>
              <p>평점: {renderStars(dayProof.rating)}</p>
              <p>후기: {dayProof.review}</p>
            </>
          ) : null}
        </div>
      ) : null}

      {dayProof.open && !dayProof.submitted ? (
        <div className="mt-4 space-y-4 rounded-[1.2rem] bg-[#f8faf2] p-4">
          {requiresPhoto ? (
            <label className="block">
              <span className="mb-2 block text-sm font-black text-[#47614d]">사진 올리기</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => onPhotoChange(event.target.files?.[0]?.name ?? "")}
                className="block w-full text-sm text-[#47614d] file:mr-3 file:rounded-full file:border-0 file:bg-[#e8f4dc] file:px-4 file:py-3 file:text-sm file:font-black file:text-[#2c6a41]"
              />
            </label>
          ) : null}

          {requiresGps ? (
            <div className="rounded-[1rem] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#47614d]">위치 인증</p>
                  <p className="mt-1 text-xs leading-5 text-[#6c816f]">위도, 경도 대신 도로명 주소로 보여줘요.</p>
                </div>
                <button type="button" onClick={onVerifyLocation} className="rounded-full bg-[#e8f4dc] px-4 py-2 text-sm font-black text-[#2c6a41]">
                  {dayProof.locationStatus === "loading" ? "확인 중..." : "현재 위치 인증"}
                </button>
              </div>

              {dayProof.locationStatus === "granted" && dayProof.address ? (
                <p className="mt-3 text-sm text-[#2c6a41]">위치 인증 완료: {dayProof.address}</p>
              ) : null}

              {dayProof.errorMessage ? <p className="mt-3 text-sm text-[#8a5830]">{dayProof.errorMessage}</p> : null}
            </div>
          ) : null}

          {requiresReview ? (
            <div className="space-y-3 rounded-[1rem] bg-white p-4">
              <div>
                <p className="text-sm font-black text-[#47614d]">별점</p>
                <div className="mt-2">
                  <RatingPicker value={dayProof.rating} onChange={onRatingChange} />
                </div>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-black text-[#47614d]">후기</span>
                <textarea
                  value={dayProof.review}
                  onChange={(event) => onReviewChange(event.target.value)}
                  placeholder="어떤 점이 좋았는지 짧게 적어 주세요."
                  className="min-h-24 w-full rounded-[1rem] border border-[#d7e6d2] bg-[#fcfef9] px-4 py-3 text-sm text-[#21452f]"
                />
              </label>
            </div>
          ) : null}

          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="w-full rounded-[1.2rem] bg-[#2c6a41] px-5 py-4 text-base font-black text-white disabled:cursor-not-allowed disabled:bg-[#a9bea9]"
          >
            오늘 인증 제출하기
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function Home() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authNotice, setAuthNotice] = useState("");
  const [loginForm, setLoginForm] = useState<LoginForm>({ grade: "", classRoom: "", name: "" });
  const [signupAnswers, setSignupAnswers] = useState<SignupAnswers>(createEmptySignupAnswers());
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>(readRegisteredUsers);
  const [currentUser, setCurrentUser] = useState<RegisteredUser | null>(readStoredSessionUser);
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [profile, setProfile] = useState<UserProfile>(() => {
    const user = readStoredSessionUser();
    return readStoredProfile(user ? getIdentityKey(user) : null);
  });
  const [selectedMission, setSelectedMission] = useState<DailyMission | null>(() => {
    const user = readStoredSessionUser();
    return readStoredMission(user ? getIdentityKey(user) : null);
  });
  const [missionDrawDate, setMissionDrawDate] = useState(() => {
    const user = readStoredSessionUser();
    return readStoredMissionDrawDate(user ? getIdentityKey(user) : null);
  });
  const [missionReason, setMissionReason] = useState("");
  const [isMissionLoading, setIsMissionLoading] = useState(false);
  const [missionVerification, setMissionVerification] = useState<MissionVerificationState>(createEmptyMissionVerification);
  const [completedMissionHistory, setCompletedMissionHistory] = useState<CompletedMissionRecord[]>(() => {
    const user = readStoredSessionUser();
    return readStoredCompletedMissions(user ? getIdentityKey(user) : null);
  });
  const [dailyCheckinDraft, setDailyCheckinDraft] = useState<DailyCheckinDraft>(() => {
    const user = readStoredSessionUser();
    return readStoredDailyCheckinDraft(user ? getIdentityKey(user) : null);
  });
  const [lastCheckinDate, setLastCheckinDate] = useState(() => {
    const user = readStoredSessionUser();
    return readStoredCheckinDate(user ? getIdentityKey(user) : null);
  });
  const [challenges, setChallenges] = useState<Challenge[]>(readStoredChallenges);
  const [completedChallengeHistory, setCompletedChallengeHistory] = useState<CompletedChallengeRecord[]>(() => {
    const user = readStoredSessionUser();
    return readStoredCompletedChallenges(user ? getIdentityKey(user) : null);
  });
  const [completedMapActionHistory, setCompletedMapActionHistory] = useState<CompletedMapActionRecord[]>(() => {
    const user = readStoredSessionUser();
    return readStoredCompletedMapActions(user ? getIdentityKey(user) : null);
  });
  const [challengeDraft, setChallengeDraft] = useState<ChallengeDraft>({
    title: "",
    description: "",
    location: "",
    difficulty: "medium",
    proofMethods: ["photo", "review"],
    durationDays: "",
  });
  const [challengeRewardSuggestion, setChallengeRewardSuggestion] = useState<number | null>(null);
  const [challengeRewardReason, setChallengeRewardReason] = useState("");
  const [isChallengeRewardLoading, setIsChallengeRewardLoading] = useState(false);
  const [challengeRewardError, setChallengeRewardError] = useState("");
  const [isChallengeComposerOpen, setIsChallengeComposerOpen] = useState(false);

  const isLoggedIn = currentUser !== null;
  const currentUserKey = currentUser ? getIdentityKey(currentUser) : null;
  const todayKey = getTodayKey();

  useEffect(() => {
    if (!currentUserKey) {
      return;
    }

    window.localStorage.setItem(`ole-profile-${currentUserKey}`, JSON.stringify(profile));
  }, [currentUserKey, profile]);

  useEffect(() => {
    if (!currentUserKey) {
      return;
    }

    if (selectedMission) {
      window.localStorage.setItem(`ole-selected-mission-${currentUserKey}`, JSON.stringify(selectedMission));
      window.localStorage.setItem(`ole-selected-mission-date-${currentUserKey}`, todayKey);
      return;
    }

    window.localStorage.removeItem(`ole-selected-mission-${currentUserKey}`);
    window.localStorage.removeItem(`ole-selected-mission-date-${currentUserKey}`);
  }, [currentUserKey, selectedMission, todayKey]);

  useEffect(() => {
    if (!currentUserKey) {
      return;
    }

    if (missionDrawDate) {
      window.localStorage.setItem(`ole-mission-draw-date-${currentUserKey}`, missionDrawDate);
      return;
    }

    window.localStorage.removeItem(`ole-mission-draw-date-${currentUserKey}`);
  }, [currentUserKey, missionDrawDate]);

  useEffect(() => {
    if (!currentUserKey) {
      return;
    }

    window.localStorage.setItem(`ole-completed-missions-${currentUserKey}`, JSON.stringify(completedMissionHistory));
  }, [completedMissionHistory, currentUserKey]);

  useEffect(() => {
    if (!currentUserKey) {
      return;
    }

    window.localStorage.setItem(`ole-daily-checkin-draft-${currentUserKey}`, JSON.stringify(dailyCheckinDraft));
  }, [currentUserKey, dailyCheckinDraft]);

  useEffect(() => {
    if (!currentUserKey) {
      return;
    }

    if (lastCheckinDate) {
      window.localStorage.setItem(`ole-daily-checkin-${currentUserKey}`, lastCheckinDate);
      return;
    }

    window.localStorage.removeItem(`ole-daily-checkin-${currentUserKey}`);
  }, [currentUserKey, lastCheckinDate]);

  useEffect(() => {
    if (!currentUserKey) {
      return;
    }

    window.localStorage.setItem(`ole-completed-challenges-${currentUserKey}`, JSON.stringify(completedChallengeHistory));
  }, [completedChallengeHistory, currentUserKey]);

  useEffect(() => {
    if (!currentUserKey) {
      return;
    }

    window.localStorage.setItem(`ole-completed-map-actions-${currentUserKey}`, JSON.stringify(completedMapActionHistory));
  }, [completedMapActionHistory, currentUserKey]);

  useEffect(() => {
    window.localStorage.setItem(registeredUsersStorageKey, JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    window.localStorage.setItem(globalChallengesStorageKey, JSON.stringify(challenges));
  }, [challenges]);

  useEffect(() => {
    if (!currentUser) {
      window.localStorage.removeItem("ole-session-user");
      return;
    }

    window.localStorage.setItem("ole-session-user", JSON.stringify(currentUser));
  }, [currentUser]);

  const reconcileDailyCheckin = useEffectEvent(() => {
    if (!currentUser) {
      return;
    }

    const checkinDate = dailyCheckinDraft.date;
    const dayDifference = getDayDifference(checkinDate, todayKey);

    if (dayDifference <= 0) {
      return;
    }

    const appliedDebt = dailyCheckinDraft.responded ? calculateCheckinDebt(dailyCheckinDraft) : 40;
    const missedDebt = dayDifference > 1 ? (dayDifference - 1) * 40 : 0;
    const nextAddedDebt = appliedDebt + missedDebt;

    setProfile((current) => applyEcoDebtCharge(current, nextAddedDebt));
    setLastCheckinDate(checkinDate);
    setDailyCheckinDraft(createEmptyDailyCheckinDraft(todayKey));
  });

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const timeoutId = window.setTimeout(reconcileDailyCheckin, 0);
    const intervalId = window.setInterval(reconcileDailyCheckin, 60 * 1000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [currentUser, dailyCheckinDraft]);

  const completionRate = Math.min(100, Math.round((profile.clearedDebt / Math.max(1, profile.clearedDebt + profile.ecoDebt)) * 100));
  const carbonFootprintSavedKg = (profile.clearedDebt / 100).toFixed(1);
  const hasEcoDebt = profile.ecoDebt > 0;
  const missionCompletedToday = completedMissionHistory.some((record) => record.completedAt === todayKey);
  const completedTodayMapActionKeys = completedMapActionHistory
    .filter((record) => record.completedAt === todayKey)
    .map((record) => createMapActionKey(record.placeId, record.action));
  const canDrawMissionToday = missionDrawDate !== todayKey && !missionCompletedToday && !selectedMission;
  const activeChallenges = challenges.filter((challenge) => challenge.joined && !challenge.completed);
  const availableChallenges = challenges.filter((challenge) => !challenge.completed && !challenge.joined);

  const rankingUsers = useMemo(() => {
    return registeredUsers.map((user) => {
      const userKey = getIdentityKey(user);
      const storedProfile = readStoredProfile(userKey);
      const isCurrentUser = currentUserKey === userKey;

      return {
        ...user,
        className: `${user.grade}학년 ${user.classRoom}반`,
        clearedDebt: isCurrentUser ? profile.clearedDebt : storedProfile.clearedDebt,
        ecoDebt: isCurrentUser ? profile.ecoDebt : storedProfile.ecoDebt,
      };
    });
  }, [currentUserKey, profile.clearedDebt, profile.ecoDebt, registeredUsers]);

  const handleAuthChange = (field: keyof LoginForm, value: string) => {
    setLoginForm((current) => ({ ...current, [field]: value }));
    setAuthNotice("");
  };

  const handleSignupAnswerChange = (field: keyof SignupAnswers, value: number) => {
    setSignupAnswers((current) => ({ ...current, [field]: value }));
    setAuthNotice("");
  };

  const loadUserState = (user: RegisteredUser) => {
    const userKey = getIdentityKey(user);
    const storedProfile = readStoredProfile(userKey);

    setCurrentUser(user);
    setProfile({
      ...storedProfile,
      name: user.name,
      ecoDebt: storedProfile.ecoDebt ?? user.initialDebt,
      ecoMoney: storedProfile.ecoMoney ?? 0,
      school: storedProfile.school === DEFAULT_PROFILE.school ? `${user.grade}학년 ${user.classRoom}반` : storedProfile.school,
    });
    setSelectedMission(readStoredMission(userKey));
    setMissionDrawDate(readStoredMissionDrawDate(userKey));
    setMissionReason("");
    setMissionVerification(createEmptyMissionVerification());
    setCompletedMissionHistory(readStoredCompletedMissions(userKey));
    setDailyCheckinDraft(readStoredDailyCheckinDraft(userKey));
    setLastCheckinDate(readStoredCheckinDate(userKey));
    setCompletedChallengeHistory(readStoredCompletedChallenges(userKey));
    setCompletedMapActionHistory(readStoredCompletedMapActions(userKey));
    setChallenges(readStoredChallenges());
    setActiveTab("home");
  };

  const handleAuthSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedUser = normalizeIdentity(loginForm);
    const existingUser = registeredUsers.find((user) => getIdentityKey(user) === getIdentityKey(normalizedUser));

    if (authMode === "signup") {
      if (existingUser) {
        loadUserState(existingUser);
        setAuthNotice("이미 가입된 사용자라서 바로 로그인했어요.");
        return;
      }

      const initialDebt = calculateInitialDebt(signupAnswers);
      const nextUser: RegisteredUser = { ...normalizedUser, initialDebt };
      setRegisteredUsers((current) => [...current, nextUser]);
      setCurrentUser(nextUser);
      setProfile({
        name: nextUser.name,
        school: `${nextUser.grade}학년 ${nextUser.classRoom}반`,
        ecoDebt: initialDebt,
        ecoMoney: 0,
        clearedDebt: 0,
      });
      setSelectedMission(null);
      setMissionDrawDate("");
      setMissionReason("");
      setMissionVerification(createEmptyMissionVerification());
      setCompletedMissionHistory([]);
      setDailyCheckinDraft(createEmptyDailyCheckinDraft());
      setLastCheckinDate("");
      setCompletedChallengeHistory([]);
      setCompletedMapActionHistory([]);
      setActiveTab("home");
      setAuthNotice("회원가입이 완료됐어요.");
      return;
    }

    if (!existingUser) {
      setAuthNotice("가입된 계정이 없어요. 먼저 회원가입해 주세요.");
      return;
    }

    loadUserState(existingUser);
    setAuthNotice("");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab("home");
    setAuthMode("login");
    setSelectedMission(null);
    setMissionDrawDate("");
    setMissionReason("");
    setMissionVerification(createEmptyMissionVerification());
    setCompletedMissionHistory([]);
    setDailyCheckinDraft(createEmptyDailyCheckinDraft());
    setLastCheckinDate("");
    setCompletedChallengeHistory([]);
    setCompletedMapActionHistory([]);
    setProfile(DEFAULT_PROFILE);
    setLoginForm({ grade: "", classRoom: "", name: "" });
    setSignupAnswers(createEmptySignupAnswers());
    setAuthNotice("로그아웃됐어요. 다시 로그인해 주세요.");
  };

  const handleCheckinDraftChange = (field: "showerMinutes" | "petBottleCount" | "carMinutes", value: string) => {
    setDailyCheckinDraft((current) => ({
      ...current,
      date: todayKey,
      [field]: sanitizeDigits(value),
    }));
  };

  const handleCheckinSave = () => {
    setDailyCheckinDraft((current) => ({ ...current, date: todayKey, responded: true }));
    setLastCheckinDate(todayKey);
  };

  const drawMission = async () => {
    if (!canDrawMissionToday || isMissionLoading) {
      return;
    }

    setIsMissionLoading(true);
    setMissionReason("");

    try {
      const response = await fetch("/api/daily-mission", { method: "GET", cache: "no-store" });

      if (!response.ok) {
        throw new Error(`미션 요청 실패 (${response.status})`);
      }

      const result = (await response.json()) as MissionApiResponse;
      setSelectedMission(result.mission);
      setMissionDrawDate(todayKey);
      setMissionVerification(createEmptyMissionVerification());
      setMissionReason(result.reason);
    } catch (error) {
      setMissionReason(error instanceof Error ? error.message : "미션을 불러오지 못했어요.");
    } finally {
      setIsMissionLoading(false);
    }
  };

  const completeSelectedMission = () => {
    if (!selectedMission) {
      return;
    }

    setCompletedMissionHistory((current) => [
      {
        id: selectedMission.id,
        title: selectedMission.title,
        category: selectedMission.category,
        reward: selectedMission.ecoMoney,
        completedAt: todayKey,
      },
      ...current.filter((record) => record.id !== selectedMission.id || record.completedAt !== todayKey),
    ]);

    setProfile((current) => applyEcoMoneyReward(current, selectedMission.ecoMoney));

    setSelectedMission(null);
    setMissionVerification(createEmptyMissionVerification());
    setMissionReason("오늘의 미션을 완료했어요. 내일 새로운 미션을 받아볼 수 있어요.");
  };

  const completeMapAction = (completion: MapActionCompletion) => {
    const completionKey = createMapActionKey(completion.placeId, completion.action);
    const alreadyCompletedToday = completedMapActionHistory.some(
      (record) =>
        record.completedAt === todayKey &&
        createMapActionKey(record.placeId, record.action) === completionKey,
    );

    if (alreadyCompletedToday) {
      return;
    }

    setCompletedMapActionHistory((current) => [
      {
        ...completion,
        completedAt: todayKey,
      },
      ...current,
    ]);
    setProfile((current) => applyEcoMoneyReward(current, completion.reward));
  };

  const handleDraftChange = (field: keyof ChallengeDraft, value: string | ChallengeDifficulty) => {
    setChallengeDraft((current) => ({ ...current, [field]: value }));
    setChallengeRewardSuggestion(null);
    setChallengeRewardReason("");
    setChallengeRewardError("");
  };

  const toggleChallengeProofMethod = (method: ChallengeProofMethod) => {
    setChallengeDraft((current) => {
      const nextMethods = current.proofMethods.includes(method)
        ? current.proofMethods.filter((item) => item !== method)
        : [...current.proofMethods, method];

      return {
        ...current,
        proofMethods: nextMethods,
      };
    });
    setChallengeRewardSuggestion(null);
    setChallengeRewardReason("");
    setChallengeRewardError("");
  };

  const handleMissionPhotoChange = (photoName: string) => {
    setMissionVerification((current) => ({ ...current, photoName }));
  };

  const verifyMissionLocation = () => {
    if (!navigator.geolocation) {
      setMissionVerification((current) => ({
        ...current,
        locationStatus: "unsupported",
        errorMessage: "이 브라우저에서는 위치 정보를 지원하지 않아요.",
      }));
      return;
    }

    setMissionVerification((current) => ({ ...current, locationStatus: "loading", errorMessage: "" }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const address = await resolveRoadAddress(latitude, longitude);

        setMissionVerification((current) => ({
          ...current,
          latitude,
          longitude,
          address,
          locationStatus: "granted",
          errorMessage: "",
        }));
      },
      (error) => {
        setMissionVerification((current) => ({
          ...current,
          locationStatus: "denied",
          errorMessage: `위치 인증에 실패했어요. 코드: ${error.code}, 메시지: ${error.message}`,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  const toggleChallengeProgress = (challengeId: string) => {
    setChallenges((current) =>
      current.map((challenge) =>
        challenge.id === challengeId ? { ...challenge, progressOpen: !challenge.progressOpen } : challenge,
      ),
    );
  };

  const handleJoinChallenge = (challengeId: string) => {
    setChallenges((current) =>
      current.map((challenge) =>
        challenge.id === challengeId
          ? {
              ...challenge,
              joined: true,
              joinedAt: challenge.joinedAt || todayKey,
              progressOpen: true,
              participants: challenge.joined ? challenge.participants : challenge.participants + 1,
            }
          : challenge,
      ),
    );
  };

  const handleGiveUpChallenge = (challengeId: string) => {
    setChallenges((current) =>
      current.map((challenge) =>
        challenge.id === challengeId
          ? {
              ...challenge,
              joined: false,
              joinedAt: "",
              completed: false,
              progressOpen: false,
              participants: Math.max(0, challenge.participants - 1),
              proofDays: createProofDays(challenge.durationDays),
            }
          : challenge,
      ),
    );
  };

  const likeChallengeReview = (challengeId: string, reviewId: string) => {
    setChallenges((current) =>
      current.map((challenge) =>
        challenge.id === challengeId
          ? {
              ...challenge,
              hotReviews: challenge.hotReviews.map((review) =>
                review.id === reviewId ? { ...review, likes: review.likes + 1 } : review,
              ),
            }
          : challenge,
      ),
    );
  };

  const openChallengeDayProof = (challengeId: string, day: number) => {
    setChallenges((current) =>
      current.map((challenge) =>
        challenge.id === challengeId
          ? {
              ...challenge,
              joined: true,
              joinedAt: challenge.joinedAt || todayKey,
              progressOpen: true,
              proofDays: challenge.proofDays.map((proofDay) => ({
                ...proofDay,
                open: proofDay.day === day && canUseChallengeDay(challenge, day, todayKey) ? !proofDay.open : false,
              })),
            }
          : challenge,
      ),
    );
  };

  const updateChallengeDayPhoto = (challengeId: string, day: number, photoName: string) => {
    setChallenges((current) =>
      current.map((challenge) =>
        challenge.id === challengeId
          ? {
              ...challenge,
              proofDays: challenge.proofDays.map((proofDay) =>
                proofDay.day === day ? { ...proofDay, photoName } : proofDay,
              ),
            }
          : challenge,
      ),
    );
  };

  const updateChallengeDayReview = (challengeId: string, day: number, review: string) => {
    setChallenges((current) =>
      current.map((challenge) =>
        challenge.id === challengeId
          ? {
              ...challenge,
              proofDays: challenge.proofDays.map((proofDay) =>
                proofDay.day === day ? { ...proofDay, review } : proofDay,
              ),
            }
          : challenge,
      ),
    );
  };

  const updateChallengeDayRating = (challengeId: string, day: number, rating: number) => {
    setChallenges((current) =>
      current.map((challenge) =>
        challenge.id === challengeId
          ? {
              ...challenge,
              proofDays: challenge.proofDays.map((proofDay) =>
                proofDay.day === day ? { ...proofDay, rating } : proofDay,
              ),
            }
          : challenge,
      ),
    );
  };

  const verifyChallengeDayLocation = (challengeId: string, day: number) => {
    if (!navigator.geolocation) {
      setChallenges((current) =>
        current.map((challenge) =>
          challenge.id === challengeId
            ? {
                ...challenge,
                proofDays: challenge.proofDays.map((proofDay) =>
                  proofDay.day === day
                    ? { ...proofDay, locationStatus: "unsupported", errorMessage: "이 브라우저에서는 위치 정보를 지원하지 않아요." }
                    : proofDay,
                ),
              }
            : challenge,
        ),
      );
      return;
    }

    setChallenges((current) =>
      current.map((challenge) =>
        challenge.id === challengeId
          ? {
              ...challenge,
              proofDays: challenge.proofDays.map((proofDay) =>
                proofDay.day === day ? { ...proofDay, locationStatus: "loading", errorMessage: "" } : proofDay,
              ),
            }
          : challenge,
      ),
    );

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const address = await resolveRoadAddress(latitude, longitude);

        setChallenges((current) =>
          current.map((challenge) =>
            challenge.id === challengeId
              ? {
                  ...challenge,
                  proofDays: challenge.proofDays.map((proofDay) =>
                    proofDay.day === day
                      ? {
                          ...proofDay,
                          latitude,
                          longitude,
                          address,
                          locationStatus: "granted",
                          errorMessage: "",
                        }
                      : proofDay,
                  ),
                }
              : challenge,
          ),
        );
      },
      (error) => {
        setChallenges((current) =>
          current.map((challenge) =>
            challenge.id === challengeId
              ? {
                  ...challenge,
                  proofDays: challenge.proofDays.map((proofDay) =>
                    proofDay.day === day
                      ? {
                          ...proofDay,
                          locationStatus: "denied",
                          errorMessage: `위치 인증에 실패했어요. 코드: ${error.code}, 메시지: ${error.message}`,
                        }
                      : proofDay,
                  ),
                }
              : challenge,
          ),
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  const requestChallengeRewardSuggestion = async () => {
    const durationDays = Number(challengeDraft.durationDays);

    if (
      challengeDraft.title.trim() === "" ||
      challengeDraft.description.trim() === "" ||
      challengeDraft.location.trim() === "" ||
      !Number.isFinite(durationDays) ||
      durationDays < 1 ||
      challengeDraft.proofMethods.length === 0
    ) {
      setChallengeRewardError("제목, 설명, 장소, 기간, 인증 방식을 먼저 입력해 주세요.");
      return null;
    }

    setIsChallengeRewardLoading(true);
    setChallengeRewardError("");

    try {
      const response = await fetch("/api/challenge-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: challengeDraft.title.trim(),
          description: challengeDraft.description.trim(),
          location: challengeDraft.location.trim(),
          durationDays,
          difficulty: challengeDraft.difficulty,
          proofMethods: challengeDraft.proofMethods,
        }),
      });

      const payload = (await response.json()) as { reward?: number; reason?: string; error?: string } | undefined;

      if (!response.ok || typeof payload?.reward !== "number") {
        throw new Error(payload?.error ?? "보상 계산에 실패했어요.");
      }

      setChallengeRewardSuggestion(payload.reward);
      setChallengeRewardReason(payload.reason ?? "");
      return payload.reward;
    } catch (error) {
      setChallengeRewardError(error instanceof Error ? error.message : "보상 계산 중 오류가 발생했어요.");
      return null;
    } finally {
      setIsChallengeRewardLoading(false);
    }
  };

  const handleCreateChallenge = () => {
    void (async () => {
      const durationDays = Number(challengeDraft.durationDays);

      if (
        challengeDraft.title.trim() === "" ||
        challengeDraft.description.trim() === "" ||
        challengeDraft.location.trim() === "" ||
        !Number.isFinite(durationDays) ||
        durationDays < 1 ||
        challengeDraft.proofMethods.length === 0
      ) {
        setChallengeRewardError("제목, 설명, 장소, 기간, 인증 방식을 모두 입력해 주세요.");
        return;
      }

      const reward = challengeRewardSuggestion ?? (await requestChallengeRewardSuggestion());

      if (reward === null) {
        return;
      }

      const creator = currentUser ? `${currentUser.grade}학년 ${currentUser.classRoom}반 ${currentUser.name}` : profile.name;

      const newChallenge: Challenge = {
        id: `challenge-${Date.now()}`,
        title: challengeDraft.title.trim(),
        creator,
        creatorKey: currentUserKey,
        description: challengeDraft.description.trim(),
        location: challengeDraft.location.trim(),
        difficulty: challengeDraft.difficulty,
        proofMethods: challengeDraft.proofMethods,
        participants: 0,
        reward,
        durationDays,
        creatorBonusRate,
        creatorBonusAwarded: false,
        hotReviews: [],
        joined: false,
        joinedAt: "",
        completed: false,
        progressOpen: false,
        proofDays: createProofDays(durationDays),
      };

      setChallenges((current) => [newChallenge, ...current]);
      setChallengeDraft({
        title: "",
        description: "",
        location: "",
        difficulty: "medium",
        proofMethods: ["photo", "review"],
        durationDays: "",
      });
      setChallengeRewardSuggestion(null);
      setChallengeRewardReason("");
      setChallengeRewardError("");
      setIsChallengeComposerOpen(false);
    })();
  };

  const submitChallengeDayProof = (challengeId: string, day: number) => {
    const challenge = challenges.find((item) => item.id === challengeId);

    if (!challenge || challenge.completed || !canUseChallengeDay(challenge, day, todayKey)) {
      return;
    }

    const requiresPhoto = challenge.proofMethods.includes("photo");
    const requiresGps = challenge.proofMethods.includes("gps");
    const requiresReview = challenge.proofMethods.includes("review");

    const updatedProofDays = challenge.proofDays.map((proofDay) =>
      proofDay.day === day &&
      (!requiresPhoto || proofDay.photoName.trim() !== "") &&
      (!requiresGps || proofDay.locationStatus === "granted") &&
      (!requiresReview || (proofDay.review.trim() !== "" && proofDay.rating > 0))
        ? { ...proofDay, submitted: true, open: false }
        : proofDay,
    );

    const submittedDay = updatedProofDays.find((proofDay) => proofDay.day === day);
    const allSubmitted = updatedProofDays.every((proofDay) => proofDay.submitted);
    const creatorBonus = allSubmitted && !challenge.creatorBonusAwarded ? updateChallengeCreatorBonus(challenge, currentUserKey) : 0;
    const completedRecord: CompletedChallengeRecord | null = allSubmitted
      ? {
          id: challenge.id,
          title: challenge.title,
          reward: challenge.reward,
          creatorBonus,
          completedAt: todayKey,
        }
      : null;

    const updatedChallenge: Challenge = {
      ...challenge,
      joined: true,
      joinedAt: challenge.joinedAt || todayKey,
      completed: allSubmitted,
      progressOpen: !allSubmitted,
      creatorBonusAwarded: challenge.creatorBonusAwarded || allSubmitted,
      participants: challenge.joined ? challenge.participants : challenge.participants + 1,
      proofDays: updatedProofDays,
      hotReviews:
        submittedDay && submittedDay.review.trim() !== "" && submittedDay.rating > 0
          ? [
              {
                id: `${challenge.id}-review-${day}`,
                author: profile.name,
                text: submittedDay.review,
                rating: submittedDay.rating,
                likes: 0,
              },
              ...challenge.hotReviews.filter((review) => review.id !== `${challenge.id}-review-${day}`),
            ]
          : challenge.hotReviews,
    };

    setChallenges((current) => current.map((item) => (item.id === challengeId ? updatedChallenge : item)));

    if (completedRecord) {
      setCompletedChallengeHistory((current) => [
        completedRecord,
        ...current.filter((record) => record.id !== completedRecord.id),
      ]);
      setProfile((current) => applyEcoMoneyReward(current, completedRecord.reward));
    }
  };

  const renderContent = () => {
    if (activeTab === "home") {
      return (
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-[2.3rem] bg-[radial-gradient(circle_at_top_left,#ffffff_0%,#e1f7d8_28%,#d8efff_68%,#f7ffe6_100%)] p-7 shadow-[0_18px_50px_rgba(60,98,67,0.12)]">
            <div className="absolute right-[-2rem] top-[-2rem] h-28 w-28 rounded-full bg-white/45 blur-2xl" />
            <div className="absolute left-[-1rem] bottom-[-2rem] h-24 w-24 rounded-full bg-[#bde4c3]/45 blur-2xl" />
            <div className="relative flex items-center justify-between gap-5">
              <div className="max-w-[16rem]">
                <p className="text-base font-bold text-[#55735d]">{profile.school}</p>
                <h1 className="mt-2 text-[2.2rem] font-black tracking-[-0.05em] text-[#183522]">
                  {profile.name}의 작은 지구
                </h1>
                <p className="mt-3 text-base leading-7 text-[#5a7460]">
                  오늘의 행동으로 빚을 줄이고, 우리 반의 탄소발자국도 함께 가볍게 만들어 봐요.
                </p>
              </div>
              <div className="relative flex h-40 w-40 shrink-0 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_180deg,#92d26b_0%,#4aa35e_42%,#d2efe1_42%,#d2efe1_100%)] opacity-80" />
                <div className="absolute inset-[12px] rounded-full bg-white/80 backdrop-blur" />
                <div className="relative h-28 w-28">
                  <Image src="/earth-character.svg" alt="귀여운 지구 캐릭터" fill className="object-contain" priority />
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-[1.8rem] bg-white p-6 shadow-[0_12px_30px_rgba(65,91,62,0.08)]">
              <p className="text-sm font-bold text-[#66806b]">{hasEcoDebt ? "남은 에코머니 빚" : "보유 EM"}</p>
              <p className="mt-2 text-[2.4rem] font-black tracking-[-0.05em] text-[#1d3f28]">
                {(hasEcoDebt ? profile.ecoDebt : profile.ecoMoney).toLocaleString()} EM
              </p>
            </article>

            <article className="rounded-[1.8rem] bg-white p-6 shadow-[0_12px_30px_rgba(65,91,62,0.08)]">
              <p className="text-sm font-bold text-[#66806b]">지금까지 차감한 빚</p>
              <p className="mt-2 text-[2.4rem] font-black tracking-[-0.05em] text-[#1d3f28]">{profile.clearedDebt.toLocaleString()} EM</p>
              <p className="mt-2 text-sm text-[#70806e]">전체 청산률 {completionRate}%</p>
            </article>

            <article className="rounded-[1.8rem] bg-white p-6 shadow-[0_12px_30px_rgba(65,91,62,0.08)]">
              <p className="text-sm font-bold text-[#66806b]">예상 탄소발자국 절감</p>
              <p className="mt-2 text-[2.4rem] font-black tracking-[-0.05em] text-[#1d3f28]">{carbonFootprintSavedKg} kg</p>
              <p className="mt-2 text-sm text-[#70806e]">청산한 에코머니를 기준으로 계산한 간단한 지표예요.</p>
            </article>
          </section>

          <section className="rounded-[1.8rem] bg-white p-6 shadow-[0_12px_30px_rgba(65,91,62,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[#66806b]">오늘 체크인</p>
                <h2 className="mt-1 text-[1.7rem] font-black tracking-[-0.04em] text-[#1e3826]">단위를 보고 정확하게 기록해요</h2>
                <p className="mt-2 text-sm leading-6 text-[#69806d]">
                  응답하지 않으면 다음날 40 EM이 추가돼요. 같은 날에는 다시 저장할 수 있어요.
                </p>
              </div>
              <button type="button" onClick={handleCheckinSave} className="shrink-0 rounded-[1.2rem] bg-[#2a5d3b] px-5 py-4 text-base font-black text-white">
                {dailyCheckinDraft.responded ? "다시 저장" : "체크인 저장"}
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <input
                inputMode="numeric"
                value={dailyCheckinDraft.showerMinutes}
                onChange={(event) => handleCheckinDraftChange("showerMinutes", event.target.value)}
                placeholder="샤워 시간 (분)"
                className="rounded-[1.2rem] border border-[#d8e7d5] bg-[#f8fcf4] px-4 py-4 text-base text-[#1f3526] placeholder:text-[#8ca08f]"
              />
              <input
                inputMode="numeric"
                value={dailyCheckinDraft.petBottleCount}
                onChange={(event) => handleCheckinDraftChange("petBottleCount", event.target.value)}
                placeholder="페트병 사용 (개)"
                className="rounded-[1.2rem] border border-[#d8e7d5] bg-[#f8fcf4] px-4 py-4 text-base text-[#1f3526] placeholder:text-[#8ca08f]"
              />
              <input
                inputMode="numeric"
                value={dailyCheckinDraft.carMinutes}
                onChange={(event) => handleCheckinDraftChange("carMinutes", event.target.value)}
                placeholder="차 이용 시간 (분)"
                className="rounded-[1.2rem] border border-[#d8e7d5] bg-[#f8fcf4] px-4 py-4 text-base text-[#1f3526] placeholder:text-[#8ca08f]"
              />
            </div>

            <div className="mt-4 rounded-[1.2rem] bg-[#f4faee] px-4 py-4 text-sm leading-6 text-[#64806a]">
              샤워는 10분 초과분만 계산돼요. 다음날 입력값 기준으로 빚이 반영됩니다.
            </div>
          </section>
        </div>
      );
    }

    if (activeTab === "map") {
      return (
        <KakaoMapSection
          completedTodayActionKeys={completedTodayMapActionKeys}
          onCompleteAction={completeMapAction}
        />
      );
    }

    if (activeTab === "mission") {
      const needsGpsProof = requiresGpsProof(selectedMission);
      const canCompleteMission =
        selectedMission !== null &&
        missionVerification.photoName.trim() !== "" &&
        (!needsGpsProof || missionVerification.locationStatus === "granted");

      return (
        <section className="space-y-5 rounded-[1.9rem] bg-white p-6 shadow-[0_12px_30px_rgba(65,91,62,0.08)]">
          <div>
            <p className="text-base font-bold text-[#66806b]">오늘의 미션</p>
            <h2 className="mt-1 text-[1.9rem] font-black tracking-[-0.04em] text-[#203826]">에코머니 빚 청산하기</h2>
            <p className="mt-2 text-base leading-7 text-[#69806d]">하루에 하나만 뽑을 수 있고, 완료하면 내일까지 잠겨요.</p>
          </div>

          {selectedMission ? (
            <article className="rounded-[1.7rem] bg-[#f3f8ee] p-6">
              <p className="text-base font-bold text-[#53735c]">{selectedMission.category}</p>
              <h3 className="mt-2 text-[1.6rem] font-black tracking-[-0.04em] text-[#1f3f27]">{selectedMission.title}</h3>
              <p className="mt-3 text-base leading-7 text-[#627563]">{selectedMission.summary}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.2rem] bg-white px-4 py-4 text-base text-[#46604c]">청산 금액 {selectedMission.ecoMoney} EM</div>
                <div className="rounded-[1.2rem] bg-white px-4 py-4 text-base text-[#46604c]">예상 시간 {selectedMission.durationMinutes}분</div>
              </div>

              <div className="mt-4 rounded-[1.2rem] bg-white px-4 py-4 text-base leading-7 text-[#55735d]">
                <p className="font-black text-[#24482f]">인증 방법</p>
                <p className="mt-2">{selectedMission.proofGuide}</p>
                <p className="mt-2 text-sm text-[#6d816e]">
                  {needsGpsProof ? "사진 인증과 현재 위치 인증이 모두 필요해요." : "사진 인증이 필요해요."}
                </p>
              </div>

              <div className="mt-4 rounded-[1.2rem] bg-white p-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-[#47614d]">사진 인증</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleMissionPhotoChange(event.target.files?.[0]?.name ?? "")}
                    className="block w-full text-sm text-[#47614d] file:mr-3 file:rounded-full file:border-0 file:bg-[#e8f4dc] file:px-4 file:py-3 file:text-sm file:font-black file:text-[#2c6a41]"
                  />
                </label>

                {missionVerification.photoName ? <p className="mt-3 text-sm text-[#5d725e]">선택한 사진: {missionVerification.photoName}</p> : null}

                {needsGpsProof ? (
                  <div className="mt-4 rounded-[1rem] bg-[#f8faf2] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[#47614d]">위치 인증</p>
                        <p className="mt-1 text-xs leading-5 text-[#6c816f]">야외 미션이라 도로명 주소까지 함께 확인해요.</p>
                      </div>
                      <button type="button" onClick={verifyMissionLocation} className="rounded-full bg-[#e8f4dc] px-4 py-2 text-sm font-black text-[#2c6a41]">
                        {missionVerification.locationStatus === "loading" ? "확인 중..." : "현재 위치 인증"}
                      </button>
                    </div>

                    {missionVerification.locationStatus === "granted" && missionVerification.address ? (
                      <p className="mt-3 text-sm text-[#2c6a41]">위치 인증 완료: {missionVerification.address}</p>
                    ) : null}

                    {missionVerification.errorMessage ? <p className="mt-3 text-sm text-[#8a5830]">{missionVerification.errorMessage}</p> : null}
                  </div>
                ) : null}
              </div>

              <button
                onClick={completeSelectedMission}
                disabled={!canCompleteMission}
                className="mt-5 w-full rounded-[1.3rem] bg-[#2a5d3b] px-5 py-4 text-base font-black text-white disabled:cursor-not-allowed disabled:bg-[#a9bea9]"
              >
                인증 완료하고 빚 청산하기
              </button>
            </article>
          ) : (
            <div className="rounded-[1.6rem] bg-[#f7fbf3] p-5 text-base leading-7 text-[#667d6b]">
              {missionCompletedToday ? "오늘 미션은 이미 완료했어요. 내일 다시 뽑을 수 있어요." : "아직 뽑은 미션이 없어요. 아래 버튼으로 오늘의 미션을 받아보세요."}
            </div>
          )}

          {missionReason ? <div className="rounded-[1.2rem] bg-[#fff6e8] px-4 py-4 text-sm leading-6 text-[#7a5a1d]">{missionReason}</div> : null}

          <button
            onClick={drawMission}
            disabled={!canDrawMissionToday || isMissionLoading}
            className="w-full rounded-[1.3rem] bg-[#d8eece] px-5 py-4 text-base font-black text-[#23442b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isMissionLoading
              ? "미션 불러오는 중..."
              : selectedMission
                ? "현재 미션 진행 중"
                : missionCompletedToday
                  ? "오늘 미션 완료"
                  : missionDrawDate === todayKey
                    ? "오늘은 이미 미션을 뽑았어요"
                    : "오늘의 미션 뽑기"}
          </button>
        </section>
      );
    }

    if (activeTab === "challenge") {
      return (
        <section className="space-y-5 rounded-[1.9rem] bg-white p-6 shadow-[0_12px_30px_rgba(65,91,62,0.08)]">
          <section className="rounded-[1.8rem] bg-[linear-gradient(135deg,#e5f7c7_0%,#d8efff_100%)] p-6">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#4d7b50]">Challenge</p>
            <h2 className="mt-3 text-[2rem] font-black tracking-[-0.05em] text-[#21452f]">챌린지</h2>
            <p className="mt-3 text-base leading-7 text-[#456754]">
              후기에는 별점과 내용을 같이 남기고, 다른 사용자가 완료하면 제작자에게 보상의 10%만큼 빚 차감 보너스가 들어가요.
            </p>
          </section>

          <section className="rounded-[1.5rem] bg-[#f8fbf4] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#5d725e]">새 챌린지 만들기</p>
                <h3 className="mt-1 text-[1.45rem] font-black text-[#21452f]">친구들이 참여할 활동 제안하기</h3>
              </div>
              <button type="button" onClick={() => setIsChallengeComposerOpen(true)} className="rounded-[1.2rem] bg-[#2c6a41] px-5 py-4 text-base font-black text-white">
                챌린지 만들기
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#5d725e]">토글 대신 팝업으로 열리고, 기간은 숫자만 입력할 수 있어요.</p>
          </section>

          {activeChallenges.length > 0 ? (
            <section className="rounded-[1.5rem] bg-[#f3f8ea] p-5">
              <p className="text-sm font-bold text-[#5d725e]">참여 중인 챌린지</p>
              <div className="mt-4 space-y-4">
                {activeChallenges.map((challenge) => {
                  const completedDays = challenge.proofDays.filter((day) => day.submitted).length;
                  const activeDay = getChallengeActiveDay(challenge, todayKey);

                  return (
                    <article key={challenge.id} className="rounded-[1.4rem] bg-white p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[1.25rem] font-black text-[#21452f]">{challenge.title}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-sm font-black">
                            <span className="rounded-full bg-[#f3f8ea] px-3 py-2 text-[#2c6a41]">
                              {completedDays}/{challenge.durationDays}일 인증 완료
                            </span>
                            <span className="rounded-full bg-[#fff4cf] px-3 py-2 text-[#8b6422]">복구 {challenge.reward} EM</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => toggleChallengeProgress(challenge.id)} className="rounded-full bg-[#2c6a41] px-4 py-2 text-sm font-black text-white">
                            {challenge.progressOpen ? "접기" : "열기"}
                          </button>
                          <button type="button" onClick={() => handleGiveUpChallenge(challenge.id)} className="rounded-full bg-[#ffe6dd] px-4 py-2 text-sm font-black text-[#9a4d2d]">
                            그만하기
                          </button>
                        </div>
                      </div>

                      {challenge.progressOpen ? (
                        <div className="mt-5 space-y-5">
                          {groupProofDays(challenge.proofDays).map((group) => (
                            <div key={`${challenge.id}-${group.label}`} className="space-y-3">
                              {challenge.durationDays > 7 ? <p className="text-sm font-black text-[#47614d]">{group.label}</p> : null}
                              {group.days.map((dayProof) => (
                                <ProofDayCard
                                  key={dayProof.day}
                                  dayProof={dayProof}
                                  requiredProofMethods={challenge.proofMethods}
                                  isActiveDay={dayProof.day === activeDay}
                                  onOpen={() => openChallengeDayProof(challenge.id, dayProof.day)}
                                  onPhotoChange={(photoName) => updateChallengeDayPhoto(challenge.id, dayProof.day, photoName)}
                                  onVerifyLocation={() => verifyChallengeDayLocation(challenge.id, dayProof.day)}
                                  onReviewChange={(review) => updateChallengeDayReview(challenge.id, dayProof.day, review)}
                                  onRatingChange={(rating) => updateChallengeDayRating(challenge.id, dayProof.day, rating)}
                                  onSubmit={() => submitChallengeDayProof(challenge.id, dayProof.day)}
                                />
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className="rounded-[1.5rem] bg-[#f3f8ea] p-5">
              <p className="text-sm font-bold text-[#5d725e]">참여 중인 챌린지</p>
              <div className="mt-4 rounded-[1.2rem] bg-white p-5 text-base text-[#5d725e]">아직 참여한 챌린지가 없어요.</div>
            </section>
          )}

          <section className="space-y-4">
            {availableChallenges.map((challenge) => (
              <article key={challenge.id} className="rounded-[1.6rem] bg-[#f8fbf4] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[1.3rem] font-black text-[#21452f]">{challenge.title}</p>
                    <p className="mt-1 text-sm font-bold text-[#6b7d6b]">만든 사람: {challenge.creator}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm font-black">
                      <span className="rounded-full bg-white px-3 py-2 text-[#2c6a41]">참여자 {challenge.participants}명</span>
                      <span className="rounded-full bg-white px-3 py-2 text-[#8b6422]">{challenge.durationDays}일 챌린지</span>
                      <span className="rounded-full bg-white px-3 py-2 text-[#8b6422]">완료 보상 {challenge.reward} EM</span>
                      <span className="rounded-full bg-white px-3 py-2 text-[#5d725e]">제작자 보너스 {Math.round(challenge.reward * challenge.creatorBonusRate)} EM</span>
                    </div>
                  </div>

                  <button type="button" onClick={() => handleJoinChallenge(challenge.id)} className="rounded-[1.2rem] bg-white px-5 py-4 text-base font-black text-[#2c6a41]">
                    참여하기
                  </button>
                </div>

                <div className="mt-4 rounded-[1.3rem] bg-white p-5">
                  <p className="text-base leading-7 text-[#5d725e]">{challenge.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-sm font-black">
                    <span className="rounded-full bg-[#f3f8ea] px-3 py-2 text-[#2c6a41]">장소 {challenge.location}</span>
                    <span className="rounded-full bg-[#f3f8ea] px-3 py-2 text-[#2c6a41]">난이도 {challengeDifficultyLabels[challenge.difficulty]}</span>
                    <span className="rounded-full bg-[#f3f8ea] px-3 py-2 text-[#2c6a41]">
                      인증 {challenge.proofMethods.map((method) => challengeProofMethodLabels[method]).join(", ")}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    <p className="text-sm font-black text-[#5d725e]">후기</p>
                    {challenge.hotReviews.length > 0 ? (
                      challenge.hotReviews.slice(0, 3).map((review) => (
                        <div key={review.id} className="rounded-[1rem] bg-[#f8fbf4] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-[#21452f]">{review.author}</p>
                              <p className="mt-1 text-xs font-bold text-[#8c6c20]">{renderStars(review.rating)}</p>
                            </div>
                            <button type="button" onClick={() => likeChallengeReview(challenge.id, review.id)} className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#2c6a41]">
                              좋아요 {review.likes}
                            </button>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[#5d725e]">{review.text}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1rem] bg-[#f8fbf4] p-4 text-sm text-[#5d725e]">아직 등록된 후기가 없어요.</div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </section>

          {isChallengeComposerOpen ? (
            <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#183522]/35 p-4 sm:items-center">
              <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-[0_30px_80px_rgba(24,53,34,0.28)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[#5d725e]">새 챌린지</p>
                    <h3 className="mt-1 text-[1.6rem] font-black text-[#21452f]">챌린지 만들기</h3>
                  </div>
                  <button type="button" onClick={() => setIsChallengeComposerOpen(false)} className="rounded-full bg-[#eef5e8] px-4 py-2 text-sm font-black text-[#2c6a41]">
                    닫기
                  </button>
                </div>

                <div className="mt-5 grid gap-4">
                  <input
                    value={challengeDraft.title}
                    onChange={(event) => handleDraftChange("title", event.target.value)}
                    placeholder="챌린지 이름"
                    className="rounded-[1.2rem] border border-[#d5e5c9] bg-white px-4 py-4 text-base text-[#1f3828]"
                  />
                  <textarea
                    value={challengeDraft.description}
                    onChange={(event) => handleDraftChange("description", event.target.value)}
                    placeholder="챌린지 설명"
                    className="min-h-28 rounded-[1.2rem] border border-[#d5e5c9] bg-white px-4 py-4 text-base text-[#1f3828]"
                  />
                  <input
                    value={challengeDraft.location}
                    onChange={(event) => handleDraftChange("location", event.target.value)}
                    placeholder="실천 장소 예: 운동장, 학교 앞 공원, 교실"
                    className="rounded-[1.2rem] border border-[#d5e5c9] bg-white px-4 py-4 text-base text-[#1f3828]"
                  />

                  <div className="grid gap-2">
                    <p className="text-sm font-black text-[#47614d]">난이도</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(["easy", "medium", "hard"] as const).map((difficulty) => (
                        <button
                          key={difficulty}
                          type="button"
                          onClick={() => handleDraftChange("difficulty", difficulty)}
                          className={`rounded-[1.2rem] px-3 py-4 text-base font-black ${
                            challengeDraft.difficulty === difficulty ? "bg-[#2c6a41] text-white" : "bg-white text-[#47614d] ring-1 ring-[#d5e5c9]"
                          }`}
                        >
                          {challengeDifficultyLabels[difficulty]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <p className="text-sm font-black text-[#47614d]">인증 방식</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(["photo", "gps", "review"] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => toggleChallengeProofMethod(method)}
                          className={`rounded-[1.2rem] px-3 py-4 text-base font-black ${
                            challengeDraft.proofMethods.includes(method) ? "bg-[#2c6a41] text-white" : "bg-white text-[#47614d] ring-1 ring-[#d5e5c9]"
                          }`}
                        >
                          {challengeProofMethodLabels[method]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      value={challengeDraft.durationDays}
                      onChange={(event) => handleDraftChange("durationDays", sanitizeDigits(event.target.value))}
                      placeholder="기간(일)"
                      inputMode="numeric"
                      type="text"
                      className="rounded-[1.2rem] border border-[#d5e5c9] bg-white px-4 py-4 text-base text-[#1f3828]"
                    />
                    <div className="rounded-[1.2rem] border border-[#d5e5c9] bg-[#f8fbf4] px-4 py-4 text-sm text-[#1f3828]">
                      {isChallengeRewardLoading ? (
                        <span className="font-black text-[#2c6a41]">추천 보상 계산 중...</span>
                      ) : challengeRewardSuggestion !== null ? (
                        <>
                          <p className="font-black text-[#2c6a41]">추천 보상 {challengeRewardSuggestion} EM</p>
                          {challengeRewardReason ? <p className="mt-1 leading-6 text-[#5d725e]">{challengeRewardReason}</p> : null}
                        </>
                      ) : (
                        <p className="leading-6 text-[#5d725e]">생성할 때 30~70 EM 안에서 추천 보상을 정해줘요.</p>
                      )}
                    </div>
                  </div>

                  {challengeRewardError ? <p className="text-sm font-bold text-[#b13a3a]">{challengeRewardError}</p> : null}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button type="button" onClick={() => void requestChallengeRewardSuggestion()} className="flex-1 rounded-[1.2rem] bg-[#eef5e8] px-5 py-4 text-base font-black text-[#2c6a41]">
                      추천 보상 보기
                    </button>
                    <button type="button" onClick={handleCreateChallenge} disabled={isChallengeRewardLoading} className="flex-1 rounded-[1.2rem] bg-[#2c6a41] px-5 py-4 text-base font-black text-white disabled:bg-[#9fbea5]">
                      챌린지 만들기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      );
    }

    if (activeTab === "ranking") {
      const myClassName = currentUser ? `${currentUser.grade}학년 ${currentUser.classRoom}반` : profile.school;
      const classScoreMap = rankingUsers.reduce<Record<string, number>>((scores, user) => {
        scores[user.className] = (scores[user.className] ?? 0) + user.clearedDebt;
        return scores;
      }, {});
      const classRanking = Object.entries(classScoreMap).map(([className, score]) => ({ className, score })).sort((a, b) => b.score - a.score);
      const studentRanking = [...rankingUsers].map((user) => ({ name: user.name, score: user.clearedDebt })).sort((a, b) => b.score - a.score);
      const myClassRank = classRanking.findIndex((item) => item.className === myClassName) + 1;
      const myStudentRank = studentRanking.findIndex((item) => item.name === profile.name) + 1;

      return (
        <section className="space-y-4 rounded-[1.9rem] bg-white p-6 shadow-[0_12px_30px_rgba(65,91,62,0.08)]">
          <section className="rounded-[1.7rem] bg-[linear-gradient(145deg,#205f3d_0%,#2f7b4d_48%,#9ad36f_100%)] p-6 text-white">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-white/70">Ranking</p>
            <h2 className="mt-3 text-[2rem] font-black tracking-[-0.05em]">우리 반과 내 순위</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[1.3rem] bg-white/15 p-4">
                <p className="text-sm font-bold text-white/70">반 순위</p>
                <p className="mt-2 text-3xl font-black">#{myClassRank}</p>
              </div>
              <div className="rounded-[1.3rem] bg-white/15 p-4">
                <p className="text-sm font-bold text-white/70">개인 순위</p>
                <p className="mt-2 text-3xl font-black">#{myStudentRank}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[1.5rem] bg-[#f4f9ee] p-5">
            <p className="text-sm font-bold text-[#5d725e]">반 랭킹</p>
            <div className="mt-4 space-y-2">
              {classRanking.map((item, index) => (
                <div key={item.className} className={`flex items-center justify-between rounded-[1.2rem] px-4 py-4 ${item.className === myClassName ? "bg-[#dff3cf]" : "bg-white"}`}>
                  <p className="text-base font-black text-[#21452f]">{index + 1}. {item.className}</p>
                  <p className="text-base font-black text-[#2c6a41]">{item.score}점</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.5rem] bg-[#fff8e7] p-5">
            <p className="text-sm font-bold text-[#7d6731]">개인 랭킹</p>
            <div className="mt-4 space-y-2">
              {studentRanking.map((item, index) => (
                <div key={item.name} className={`flex items-center justify-between rounded-[1.2rem] px-4 py-4 ${item.name === profile.name ? "bg-[#fff0bf]" : "bg-white"}`}>
                  <p className="text-base font-black text-[#46391a]">{index + 1}. {item.name}</p>
                  <p className="text-base font-black text-[#94612b]">{item.score}점</p>
                </div>
              ))}
            </div>
          </section>
        </section>
      );
    }

    return (
      <section className="space-y-5 rounded-[1.9rem] bg-white p-6 shadow-[0_12px_30px_rgba(65,91,62,0.08)]">
        <div>
          <p className="text-base font-bold text-[#66806b]">마이페이지</p>
          <h2 className="mt-1 text-[1.9rem] font-black tracking-[-0.04em] text-[#203826]">내 활동 요약</h2>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] bg-[#f5faef] p-5">
            <p className="text-sm font-bold text-[#5f745f]">{hasEcoDebt ? "남은 빚" : "보유 EM"}</p>
            <p className="mt-2 text-[1.9rem] font-black text-[#21452f]">
              {(hasEcoDebt ? profile.ecoDebt : profile.ecoMoney).toLocaleString()} EM
            </p>
          </div>
          <div className="rounded-[1.5rem] bg-[#eef7ea] p-5">
            <p className="text-sm font-bold text-[#5f745f]">차감한 빚</p>
            <p className="mt-2 text-[1.9rem] font-black text-[#21452f]">{profile.clearedDebt.toLocaleString()} EM</p>
          </div>
          <div className="rounded-[1.5rem] bg-[#edf4ff] p-5">
            <p className="text-sm font-bold text-[#5f745f]">예상 탄소발자국 절감</p>
            <p className="mt-2 text-[1.9rem] font-black text-[#21452f]">{carbonFootprintSavedKg} kg</p>
          </div>
        </section>

        <section className="rounded-[1.5rem] bg-[#f8fbf4] p-5">
          <p className="text-sm font-bold text-[#5d725e]">기본 정보</p>
          <div className="mt-4 space-y-2 text-base text-[#627665]">
            <p>이름: {profile.name}</p>
            <p>학교/팀: {profile.school}</p>
            <p>완료한 미션 수: {completedMissionHistory.length}개</p>
            <p>완료한 챌린지 수: {completedChallengeHistory.length}개</p>
            <p>완료한 지도 활동 수: {completedMapActionHistory.length}개</p>
          </div>
        </section>

        <section className="rounded-[1.5rem] bg-[#f8fbf4] p-5">
          <p className="text-sm font-bold text-[#5d725e]">완료한 미션</p>
          <div className="mt-4 space-y-3">
            {completedMissionHistory.length > 0 ? (
              completedMissionHistory.map((mission) => (
                <div key={`${mission.id}-${mission.completedAt}`} className="rounded-[1.2rem] bg-white px-4 py-4">
                  <p className="text-base font-black text-[#21452f]">{mission.title}</p>
                  <p className="mt-1 text-sm text-[#5d725e]">{mission.category} · {mission.reward} EM · {formatDateLabel(mission.completedAt)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.2rem] bg-white px-4 py-4 text-base text-[#5d725e]">아직 완료한 미션이 없어요.</div>
            )}
          </div>
        </section>

        <section className="rounded-[1.5rem] bg-[#f8fbf4] p-5">
          <p className="text-sm font-bold text-[#5d725e]">완료한 지도 활동</p>
          <div className="mt-4 space-y-3">
            {completedMapActionHistory.length > 0 ? (
              completedMapActionHistory.map((action) => (
                <div
                  key={`${action.placeId}-${action.action}-${action.completedAt}`}
                  className="rounded-[1.2rem] bg-white px-4 py-4"
                >
                  <p className="text-base font-black text-[#21452f]">{action.placeName}</p>
                  <p className="mt-1 text-sm text-[#5d725e]">
                    {getMapActionLabel(action.action)} · {action.reward} EM · {formatDateLabel(action.completedAt)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.2rem] bg-white px-4 py-4 text-base text-[#5d725e]">
                아직 완료한 지도 활동이 없어요.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[1.5rem] bg-[#f8fbf4] p-5">
          <p className="text-sm font-bold text-[#5d725e]">완료한 챌린지</p>
          <div className="mt-4 space-y-3">
            {completedChallengeHistory.length > 0 ? (
              completedChallengeHistory.map((challenge) => (
                <div key={`${challenge.id}-${challenge.completedAt}`} className="rounded-[1.2rem] bg-white px-4 py-4">
                  <p className="text-base font-black text-[#21452f]">{challenge.title}</p>
                  <p className="mt-1 text-sm text-[#5d725e]">{challenge.reward} EM · {formatDateLabel(challenge.completedAt)}</p>
                  {challenge.creatorBonus > 0 ? <p className="mt-1 text-sm text-[#2c6a41]">제작자 보너스 차감: {challenge.creatorBonus} EM</p> : null}
                </div>
              ))
            ) : (
              <div className="rounded-[1.2rem] bg-white px-4 py-4 text-base text-[#5d725e]">아직 완료한 챌린지가 없어요.</div>
            )}
          </div>
        </section>
      </section>
    );
  };

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ef_0%,#edf7ff_100%)] px-4 py-6 text-[#1f3526]">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl items-center">
          <AuthScreen
            mode={authMode}
            form={loginForm}
            signupAnswers={signupAnswers}
            notice={authNotice}
            onChange={handleAuthChange}
            onSignupAnswerChange={handleSignupAnswerChange}
            onSwitchMode={setAuthMode}
            onSubmit={handleAuthSubmit}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ef_0%,#edf7ff_100%)] px-4 pb-32 pt-6 text-[#1f3526]">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-base font-bold text-[#68806d]">Our Little Earth</p>
          <button onClick={handleLogout} className="rounded-full bg-white px-5 py-3 text-sm font-black text-[#6a7f6d] shadow-[0_8px_24px_rgba(65,91,62,0.10)]">
            로그아웃
          </button>
        </div>

        {renderContent()}
      </div>

      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-2xl px-4 pb-5">
        <div className="grid grid-cols-6 rounded-[2rem] border border-[#deead7] bg-white/95 p-2 shadow-[0_18px_45px_rgba(45,79,56,0.14)] backdrop-blur">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-[1.3rem] px-2 py-4 text-sm font-black transition ${
                activeTab === tab.id ? "bg-[#e4f3db] text-[#21422b]" : "text-[#71836f]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
