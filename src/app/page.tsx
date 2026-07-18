"use client";

import Image from "next/image";
import { type FormEvent, useCallback, useEffect, useEffectEvent, useMemo, useState } from "react";
import {
  createMapActionKey,
  KakaoMapSection,
  type MapActionCompletion,
} from "@/components/map/kakao-map-section";
import { calculateChallengeRewardDetails } from "@/lib/challenge-reward-rules";
import { auth, db } from "@/lib/firebase";
import { loadKakaoMap } from "@/lib/load-kakao-map";
import type { DailyMission } from "@/types/mission";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";

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
  studentNumber: string;
  name: string;
  password: string;
};

type SignupAnswers = {
  transport: number | null;
  delivery: number | null;
  tumbler: number | null;
  recycle: number | null;
  plastic: number | null;
  unplug: number | null;
};

type StudentIdentity = Omit<LoginForm, "password">;

type RegisteredUser = StudentIdentity & {
  uid: string;
  initialDebt: number;
  profile?: Partial<UserProfile>;
};

type StoredUserDocument = RegisteredUser & {
  profile?: Partial<UserProfile>;
};

type StoredAppState = {
  selectedMission: DailyMission | null;
  selectedMissionDate: string;
  missionDrawDate: string;
  completedMissionHistory: CompletedMissionRecord[];
  dailyCheckinDraft: DailyCheckinDraft;
  lastCheckinDate: string;
  challenges: Challenge[];
  completedChallengeHistory: CompletedChallengeRecord[];
  completedMapActionHistory: CompletedMapActionRecord[];
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
  likedBy: string[];
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
  likes: number;
  likedBy: string[];
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
  checklist: string[];
  location: string;
  difficulty: ChallengeDifficulty | "";
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
  accessibilityRating?: number;
  recommendationRating?: number;
  difficultyRating?: number;
};

type ChallengeCompletionRating = {
  accessibility: number;
  recommendation: number;
  difficulty: number;
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
  { id: "challenge", label: "챌린지" },
  { id: "ranking", label: "랭킹" },
  { id: "mypage", label: "마이" },
];

const gradeOptions = [1, 2, 3];
const classOptions = Array.from({ length: 6 }, (_, index) => index + 1);
const showerMinuteOptions = ["0", "5", "10", "15", "20", "25", "30", "40", "50", "60"];
const petBottleCountOptions = ["0", "1", "2", "3", "4", "5"];
const carMinuteOptions = ["0", "10", "20", "30", "40", "50", "60", "90", "120"];
const registeredUsersStorageKey = "ole-registered-users";
const globalChallengesStorageKey = "ole-challenges";
const rememberedLoginStorageKey = "ole-remembered-login";
const creatorBonusRate = 0.1;
const minimumCurrentUserClearedDebt = 300;
const excludedRankingUserNames = new Set(["강교빈"]);
const mockChallengeCreators: Record<string, string> = {
  "challenge-1": "3학년 6반 김지효",
  "challenge-2": "3학년 5반 백현서",
  "challenge-3": "3학년 2반 장은서",
};

// 랭킹 화면 시연용 샘플 사용자입니다. 회원가입 및 Firestore 사용자 데이터에는 포함되지 않습니다.
const MOCK_RANKING_USERS: RegisteredUser[] = [
  {
    uid: "mock-ranking-3-6-kim-jihyo",
    grade: "3",
    classRoom: "6",
    studentNumber: "1",
    name: "김지효",
    initialDebt: 3200,
    profile: { clearedDebt: 268, ecoDebt: 2932 },
  },
  {
    uid: "mock-ranking-3-5-baek-hyeonseo",
    grade: "3",
    classRoom: "5",
    studentNumber: "1",
    name: "백현서",
    initialDebt: 3200,
    profile: { clearedDebt: 251, ecoDebt: 2949 },
  },
  {
    uid: "mock-ranking-3-2-jang-eunseo",
    grade: "3",
    classRoom: "2",
    studentNumber: "1",
    name: "장은서",
    initialDebt: 3200,
    profile: { clearedDebt: 239, ecoDebt: 2961 },
  },
  {
    uid: "mock-ranking-3-1-heo-jeongin",
    grade: "3",
    classRoom: "1",
    studentNumber: "1",
    name: "허정인",
    initialDebt: 3200,
    profile: { clearedDebt: 224, ecoDebt: 2976 },
  },
  {
    uid: "mock-ranking-3-2-kim-jiyul",
    grade: "3",
    classRoom: "2",
    studentNumber: "2",
    name: "김지율",
    initialDebt: 3200,
    profile: { clearedDebt: 213, ecoDebt: 2987 },
  },
  {
    uid: "mock-ranking-3-2-park-haeun",
    grade: "3",
    classRoom: "2",
    studentNumber: "3",
    name: "박하은",
    initialDebt: 3200,
    profile: { clearedDebt: 198, ecoDebt: 3002 },
  },
];

const signupQuestions: SignupQuestion[] = [
  {
    key: "transport",
    question: "1. 가까운 거리를 이동할 때 주로 무엇을 이용하나요?",
    options: [
      { label: "자전거/도보", value: 300 },
      { label: "대중교통", value: 400 },
      { label: "자가용", value: 500 },
    ],
  },
  {
    key: "delivery",
    question: "2. 일주일에 배달 음식이나 포장 음식을 얼마나 이용하나요?",
    options: [
      { label: "거의 이용하지 않음", value: 300 },
      { label: "1~2회", value: 400 },
      { label: "3회 이상", value: 500 },
    ],
  },
  {
    key: "tumbler",
    question: "3. 외출할 때 텀블러나 다회용기를 챙기나요?",
    options: [
      { label: "자주 챙김", value: 300 },
      { label: "가끔 챙김", value: 400 },
      { label: "거의 안 챙김", value: 500 },
    ],
  },
  {
    key: "recycle",
    question: "4. 분리수거를 얼마나 실천하나요?",
    options: [
      { label: "기준에 맞춰 잘함", value: 300 },
      { label: "가끔 헷갈리거나 놓침", value: 400 },
      { label: "거의 하지 않음", value: 500 },
    ],
  },
  {
    key: "plastic",
    question: "5. 하루에 일회용 플라스틱/페트병을 얼마나 사용하나요?",
    options: [
      { label: "거의 사용하지 않음", value: 300 },
      { label: "1~2개", value: 400 },
      { label: "3개 이상", value: 500 },
    ],
  },
  {
    key: "unplug",
    question: "6. 사용하지 않는 전등, 충전기, 플러그를 잘 끄거나 뽑나요?",
    options: [
      { label: "자주 실천함", value: 300 },
      { label: "가끔 함", value: 400 },
      { label: "거의 안 함", value: 500 },
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
  review: "선택 평가",
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

function normalizeIdentity(form: StudentIdentity) {
  return {
    grade: form.grade,
    classRoom: form.classRoom,
    studentNumber: form.studentNumber.trim(),
    name: form.name.trim(),
  };
}

function getIdentityKey(form: StudentIdentity) {
  const normalized = normalizeIdentity(form);
  return `${normalized.grade}-${normalized.classRoom}-${normalized.studentNumber}`;
}

function buildStudentAuthEmail(form: StudentIdentity) {
  const normalized = normalizeIdentity(form);
  return `ole-${normalized.grade}-${normalized.classRoom}-${normalized.studentNumber}@our-little-earth.local`;
}

function createEmptyLoginForm(): LoginForm {
  return {
    grade: "",
    classRoom: "",
    studentNumber: "",
    name: "",
    password: "",
  };
}

function readRememberedLoginForm() {
  if (typeof window === "undefined") {
    return createEmptyLoginForm();
  }

  const saved = window.localStorage.getItem(rememberedLoginStorageKey);

  if (!saved) {
    return createEmptyLoginForm();
  }

  try {
    const parsed = JSON.parse(saved) as Partial<StudentIdentity>;

    return {
      grade: typeof parsed.grade === "string" ? parsed.grade : "",
      classRoom: typeof parsed.classRoom === "string" ? parsed.classRoom : "",
      studentNumber: typeof parsed.studentNumber === "string" ? parsed.studentNumber : "",
      name: typeof parsed.name === "string" ? parsed.name : "",
      password: "",
    };
  } catch {
    return createEmptyLoginForm();
  }
}

function saveRememberedLoginForm(form: StudentIdentity) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(rememberedLoginStorageKey, JSON.stringify(normalizeIdentity(form)));
}

function hasRememberedLoginForm(form: LoginForm) {
  return form.grade !== "" || form.classRoom !== "" || form.studentNumber !== "" || form.name !== "";
}

function hasBrokenText(value: string | undefined) {
  return typeof value === "string" && /[�吏諛媛]/.test(value);
}

function getDisplayName(user: StudentIdentity, profileName?: string) {
  if (profileName && !hasBrokenText(profileName)) {
    return profileName;
  }

  return hasBrokenText(user.name) || user.name.trim() === "" ? DEFAULT_PROFILE.name : user.name;
}

function getDisplaySchool(user: StudentIdentity, profileSchool?: string) {
  if (profileSchool && profileSchool !== DEFAULT_PROFILE.school && !hasBrokenText(profileSchool)) {
    return profileSchool;
  }

  return `${user.grade}학년 ${user.classRoom}반`;
}

function getFirebaseErrorCode(error: unknown) {
  if (error instanceof FirebaseError) {
    return error.code;
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : "";
  }

  return "";
}

function getSignupErrorMessage(error: unknown) {
  const code = getFirebaseErrorCode(error);

  if (code === "auth/email-already-in-use") {
    return "이미 가입된 번호예요. 로그인으로 들어가 주세요.";
  }

  if (code === "auth/operation-not-allowed") {
    return "Firebase Authentication에서 Email/Password 로그인을 켜 주세요.";
  }

  if (code === "auth/configuration-not-found") {
    return "Firebase Authentication 설정을 찾지 못했어요. Firebase 콘솔에서 Authentication을 시작하고 Email/Password를 켜 주세요.";
  }

  if (code === "auth/invalid-api-key" || code === "auth/api-key-not-valid.-please-pass-a-valid-api-key.") {
    return "Firebase API 키 설정이 잘못됐어요. Vercel 환경변수를 확인해 주세요.";
  }

  if (code === "auth/network-request-failed") {
    return "Firebase에 연결하지 못했어요. 네트워크나 배포 환경변수를 확인해 주세요.";
  }

  if (code === "permission-denied") {
    return "Firestore 권한 때문에 학생 정보를 저장하지 못했어요. Firestore Rules를 확인해 주세요.";
  }

  if (code === "not-found" || code === "failed-precondition") {
    return "Firestore 데이터베이스가 아직 준비되지 않았어요. Firebase에서 Firestore Database를 만들어 주세요.";
  }

  return code ? `회원가입에 실패했어요. Firebase 오류: ${code}` : "회원가입에 실패했어요. Firebase 설정을 확인해 주세요.";
}

function getLoginErrorMessage(error: unknown) {
  const code = getFirebaseErrorCode(error);

  if (
    code === "auth/invalid-credential" ||
    code === "auth/user-not-found" ||
    code === "auth/wrong-password"
  ) {
    return "비밀번호가 맞지 않아요. 학년, 반, 번호, 이름이 맞다면 비밀번호를 다시 확인해 주세요.";
  }

  if (code === "permission-denied") {
    return "Firestore 권한 때문에 학생 정보를 읽지 못했어요. Firestore Rules를 확인해 주세요.";
  }

  if (code === "auth/configuration-not-found") {
    return "Firebase Authentication 설정을 찾지 못했어요. Firebase 콘솔에서 Authentication을 시작하고 Email/Password를 켜 주세요.";
  }

  return code ? `로그인에 실패했어요. Firebase 오류: ${code}` : "로그인에 실패했어요. 잠시 후 다시 시도해 주세요.";
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
        typeof record.uid === "string" &&
        typeof record.grade === "string" &&
        typeof record.classRoom === "string" &&
        typeof record.studentNumber === "string" &&
        typeof record.name === "string" &&
        typeof record.initialDebt === "number"
      );
    });
  } catch {
    return [] as RegisteredUser[];
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

function parseStoredUserDocument(data: unknown, uid: string) {
  if (typeof data !== "object" || data === null) {
    return null as StoredUserDocument | null;
  }

  const record = data as Partial<StoredUserDocument>;

  if (
    typeof record.grade !== "string" ||
    typeof record.classRoom !== "string" ||
    typeof record.studentNumber !== "string" ||
    typeof record.name !== "string" ||
    typeof record.initialDebt !== "number"
  ) {
    return null as StoredUserDocument | null;
  }

  return {
    uid,
    grade: record.grade,
    classRoom: record.classRoom,
    studentNumber: record.studentNumber,
    name: record.name,
    initialDebt: record.initialDebt,
    profile: record.profile,
  };
}

function getRankingProfile(user: RegisteredUser) {
  const fallback = readStoredProfile(getIdentityKey(user));
  return {
    ...fallback,
    ...user.profile,
    name: user.name,
    school:
      user.profile?.school ??
      (fallback.school === DEFAULT_PROFILE.school ? `${user.grade}학년 ${user.classRoom}반` : fallback.school),
    ecoDebt: user.profile?.ecoDebt ?? fallback.ecoDebt ?? user.initialDebt,
    ecoMoney: user.profile?.ecoMoney ?? fallback.ecoMoney ?? 0,
    clearedDebt: user.profile?.clearedDebt ?? fallback.clearedDebt ?? 0,
  };
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
    likes: challenge.likes,
    likedBy: challenge.likedBy,
    hotReviews: challenge.hotReviews.map(normalizeChallengeReview),
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
    creator: mockChallengeCreators["challenge-1"],
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
    likes: 32,
    likedBy: [],
    hotReviews: [
      { id: "review-1", author: "이서준", text: "운동도 되고 길이 깨끗해져서 좋았어요.", rating: 5, likes: 14, likedBy: [] },
      { id: "review-2", author: "최서연", text: "하교길 친구랑 같이 해서 더 재밌었어요.", rating: 4, likes: 9, likedBy: [] },
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
    creator: mockChallengeCreators["challenge-2"],
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
    likes: 41,
    likedBy: [],
    hotReviews: [
      { id: "review-3", author: "김하늘", text: "일주일 넘게 하니까 진짜 습관이 생기기 시작했어요.", rating: 5, likes: 22, likedBy: [] },
      { id: "review-4", author: "박지우", text: "매일 인증하니까 친구들이랑 서로 응원하게 돼요.", rating: 4, likes: 17, likedBy: [] },
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
    creator: mockChallengeCreators["challenge-3"],
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
    likes: 19,
    likedBy: [],
    hotReviews: [
      { id: "review-5", author: "김도윤", text: "생각보다 헷갈렸는데 해보니 금방 익숙해졌어요.", rating: 4, likes: 11, likedBy: [] },
      { id: "review-6", author: "정유나", text: "사진을 찍어 올리니 더 꼼꼼하게 하게 돼요.", rating: 5, likes: 8, likedBy: [] },
    ],
    joined: false,
    joinedAt: "",
    completed: false,
    progressOpen: false,
    proofDays: createProofDays(1),
  },
];

function normalizeChallengeReview(review: Partial<ChallengeReview>): ChallengeReview {
  return {
    id: typeof review.id === "string" ? review.id : `review-${Date.now()}`,
    author: typeof review.author === "string" ? review.author : "익명",
    text: typeof review.text === "string" ? review.text : "",
    rating: typeof review.rating === "number" ? review.rating : 0,
    likes: typeof review.likes === "number" ? review.likes : 0,
    likedBy: Array.isArray(review.likedBy) ? review.likedBy.filter((userKey) => typeof userKey === "string") : [],
  };
}

function normalizeStoredChallenge(challenge: Partial<Challenge>): Challenge {
  const durationDays = typeof challenge.durationDays === "number" && challenge.durationDays > 0 ? challenge.durationDays : 1;
  const challengeId = typeof challenge.id === "string" ? challenge.id : `challenge-${Date.now()}`;
  const storedCreator = typeof challenge.creator === "string" ? challenge.creator : "알 수 없음";

  return {
    id: challengeId,
    title: typeof challenge.title === "string" ? challenge.title : "이름 없는 챌린지",
    creator: mockChallengeCreators[challengeId] ?? (storedCreator.includes("강교빈") ? "3학년 2반 김지율" : storedCreator),
    creatorKey: typeof challenge.creatorKey === "string" ? challenge.creatorKey : null,
    description: typeof challenge.description === "string" ? challenge.description : "",
    location: typeof challenge.location === "string" ? challenge.location : "",
    difficulty: challenge.difficulty ?? "easy",
    proofMethods: Array.isArray(challenge.proofMethods) ? challenge.proofMethods : ["photo", "review"],
    participants: typeof challenge.participants === "number" ? challenge.participants : 0,
    reward: typeof challenge.reward === "number" ? challenge.reward : 0,
    durationDays,
    creatorBonusRate: typeof challenge.creatorBonusRate === "number" ? challenge.creatorBonusRate : creatorBonusRate,
    creatorBonusAwarded: Boolean(challenge.creatorBonusAwarded),
    likes: typeof challenge.likes === "number" ? challenge.likes : 0,
    likedBy: Array.isArray(challenge.likedBy) ? challenge.likedBy.filter((userKey) => typeof userKey === "string") : [],
    hotReviews: Array.isArray(challenge.hotReviews) ? challenge.hotReviews.map(normalizeChallengeReview) : [],
    joined: Boolean(challenge.joined),
    joinedAt: typeof challenge.joinedAt === "string" && challenge.joinedAt ? challenge.joinedAt : challenge.joined ? getTodayKey() : "",
    completed: Boolean(challenge.completed),
    progressOpen: Boolean(challenge.progressOpen),
    proofDays: Array.isArray(challenge.proofDays) ? challenge.proofDays : createProofDays(durationDays),
  };
}

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
      ? (parsed as Array<Partial<Challenge>>).map(normalizeStoredChallenge)
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

function createLocalAppState(userKey: string): StoredAppState {
  const selectedMission = readStoredMission(userKey);

  return {
    selectedMission,
    selectedMissionDate: selectedMission ? getTodayKey() : "",
    missionDrawDate: readStoredMissionDrawDate(userKey),
    completedMissionHistory: readStoredCompletedMissions(userKey),
    dailyCheckinDraft: readStoredDailyCheckinDraft(userKey),
    lastCheckinDate: readStoredCheckinDate(userKey),
    challenges: readStoredChallenges(),
    completedChallengeHistory: readStoredCompletedChallenges(userKey),
    completedMapActionHistory: readStoredCompletedMapActions(userKey),
  };
}

function parseStoredAppState(data: unknown): StoredAppState | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const record = data as Partial<StoredAppState>;
  const dailyCheckinDraft =
    record.dailyCheckinDraft &&
    typeof record.dailyCheckinDraft.date === "string" &&
    typeof record.dailyCheckinDraft.showerMinutes === "string" &&
    typeof record.dailyCheckinDraft.petBottleCount === "string" &&
    typeof record.dailyCheckinDraft.carMinutes === "string" &&
    typeof record.dailyCheckinDraft.responded === "boolean"
      ? record.dailyCheckinDraft
      : createEmptyDailyCheckinDraft();

  return {
    selectedMission:
      record.selectedMission && typeof record.selectedMission === "object"
        ? (record.selectedMission as DailyMission)
        : null,
    selectedMissionDate: typeof record.selectedMissionDate === "string" ? record.selectedMissionDate : "",
    missionDrawDate: typeof record.missionDrawDate === "string" ? record.missionDrawDate : "",
    completedMissionHistory: Array.isArray(record.completedMissionHistory)
      ? record.completedMissionHistory
      : [],
    dailyCheckinDraft,
    lastCheckinDate: typeof record.lastCheckinDate === "string" ? record.lastCheckinDate : "",
    challenges: Array.isArray(record.challenges)
      ? (record.challenges as Array<Partial<Challenge>>).map(normalizeStoredChallenge)
      : initialChallenges.map(createFreshChallengeState),
    completedChallengeHistory: Array.isArray(record.completedChallengeHistory)
      ? record.completedChallengeHistory
      : [],
    completedMapActionHistory: Array.isArray(record.completedMapActionHistory)
      ? record.completedMapActionHistory
      : [],
  };
}

async function readUserAppState(uid: string, userKey: string) {
  const appStateRef = doc(db, "users", uid, "appState", "main");
  const appStateSnapshot = await getDoc(appStateRef);
  const firestoreState = parseStoredAppState(appStateSnapshot.data());

  if (firestoreState) {
    return firestoreState;
  }

  const localState = createLocalAppState(userKey);
  const now = new Date().toISOString();

  await setDoc(
    appStateRef,
    {
      ...localState,
      migratedFromLocalStorageAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  return localState;
}

function renderStars(rating: number) {
  return "★".repeat(clampRating(rating)) + "☆".repeat(5 - clampRating(rating));
}

function maskCreatorName(value: string) {
  const parts = value.split(" ");
  const name = parts.at(-1) ?? value;
  const maskedName = name.length <= 1 ? "●" : `${name[0]}${"●".repeat(name.length - 1)}`;
  return [...parts.slice(0, -1), maskedName].join(" ");
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

function getChallengeChecklist(description: string) {
  return description
    .split("\n")
    .map((item) => item.replace(/^\s*(?:□|☐|[-*•])\s*/, "").trim())
    .filter(Boolean);
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

function applyMinimumClearedDebt(profile: UserProfile): UserProfile {
  const additionalPayment = Math.min(
    profile.ecoDebt,
    Math.max(0, minimumCurrentUserClearedDebt - profile.clearedDebt),
  );

  return {
    ...profile,
    ecoDebt: profile.ecoDebt - additionalPayment,
    clearedDebt: profile.clearedDebt + additionalPayment,
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

function updateChallengeCreatorBonus(challenge: Challenge, currentUserKey: string | null) {
  const bonus = Math.round(challenge.reward * challenge.creatorBonusRate);

  if (!challenge.creatorKey || !currentUserKey || challenge.creatorKey === currentUserKey || bonus <= 0) {
    return bonus;
  }

  return bonus;
}

function AuthScreen({
  mode,
  form,
  signupAnswers,
  notice,
  rememberLogin,
  onChange,
  onRememberLoginChange,
  onSignupAnswerChange,
  onSwitchMode,
  onSubmit,
}: {
  mode: AuthMode;
  form: LoginForm;
  signupAnswers: SignupAnswers;
  notice: string;
  rememberLogin: boolean;
  onChange: (field: keyof LoginForm, value: string) => void;
  onRememberLoginChange: (value: boolean) => void;
  onSignupAnswerChange: (field: keyof SignupAnswers, value: number) => void;
  onSwitchMode: (mode: AuthMode) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="ole-card overflow-hidden">
      <div className="ole-sticker p-4 sm:p-6">
        <div className="flex flex-col items-start justify-between gap-3 min-[390px]:flex-row min-[390px]:items-center">
          <div className="max-w-[20rem]">
            <p className="text-sm font-bold text-[#55735d]">Our Little Earth</p>
            <h1 className="mt-1 text-[1.55rem] font-black leading-tight tracking-normal text-[#183522] min-[390px]:text-[1.8rem]">
              {mode === "signup" ? "회원가입하고 시작하기" : "로그인하고 이어가기"}
            </h1>
          </div>
          <div className="relative h-24 w-24 shrink-0 self-center rounded-[1rem] bg-white/70 p-2.5 shadow-[0_8px_0_rgba(64,119,71,0.10)] min-[390px]:h-28 min-[390px]:w-28">
            <Image
              src="/earth-mood-start.png"
              alt="화난 표정의 지구 캐릭터"
              fill
              sizes="8rem"
              className="object-contain p-2"
              priority
            />
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 p-4 sm:p-6">
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-[#26412d]">학년</span>
          <select
            value={form.grade}
            onChange={(event) => onChange("grade", event.target.value)}
            className="ole-field w-full px-4 py-3 text-base text-[#1f3526]"
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
          <span className="mb-1.5 block text-sm font-bold text-[#26412d]">반</span>
          <select
            value={form.classRoom}
            onChange={(event) => onChange("classRoom", event.target.value)}
            className="ole-field w-full px-4 py-3 text-base text-[#1f3526]"
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
          <span className="mb-1.5 block text-sm font-bold text-[#26412d]">이름</span>
          <input
            type="text"
            value={form.name}
            onChange={(event) => onChange("name", event.target.value)}
            placeholder="이름 입력"
            className="ole-field w-full px-4 py-3 text-base text-[#1f3526]"
            required
          />
        </label>

        <label className="flex items-start gap-3 rounded-[0.8rem] border border-[#dbe7d7] bg-[#fffef8] px-4 py-2.5">
          <input
            type="checkbox"
            checked={rememberLogin}
            onChange={(event) => onRememberLoginChange(event.target.checked)}
            className="mt-1 h-4 w-4 accent-[#2a5d3b]"
          />
          <span>
            <span className="block text-sm font-black text-[#26412d]">내 로그인 정보 기억하기</span>
            <span className="mt-1 block text-xs leading-5 text-[#6b7d6b]">학년, 반, 번호, 이름만 저장해요. 비밀번호는 저장하지 않아요.</span>
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-[#26412d]">출석번호</span>
          <input
            type="number"
            min="1"
            inputMode="numeric"
            value={form.studentNumber}
            onChange={(event) => onChange("studentNumber", event.target.value)}
            placeholder="예: 12"
            className="ole-field w-full px-4 py-3 text-base text-[#1f3526]"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-[#26412d]">비밀번호</span>
          <input
            type="password"
            minLength={6}
            value={form.password}
            onChange={(event) => onChange("password", event.target.value)}
            placeholder="6자리 이상"
            className="ole-field w-full px-4 py-3 text-base text-[#1f3526]"
            required
          />
        </label>

        {mode === "signup" ? (
          <div className="ole-soft space-y-3 p-4">
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
                  className="ole-field w-full px-4 py-3 text-sm text-[#1f3526]"
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
          </div>
        ) : null}

        {notice ? (
          <p className="ole-soft px-4 py-3 text-base font-bold text-[#2a5d3b]">
            {notice}
          </p>
        ) : null}

        <button type="submit" className="w-full rounded-[0.8rem] bg-[#2a5d3b] px-5 py-3 text-base font-black text-white transition hover:bg-[#214b30]">
          {mode === "signup" ? "회원가입" : "로그인"}
        </button>

        <button
          type="button"
          onClick={() => onSwitchMode(mode === "signup" ? "login" : "signup")}
          className="w-full rounded-[0.8rem] border border-[#dbe7d7] bg-[#fffef8] px-5 py-3 text-base font-black text-[#24482f]"
        >
          {mode === "signup" ? "로그인으로 돌아가기" : "회원가입하기"}
        </button>
      </form>
    </section>
  );
}

function MissionCompleteCelebration() {
  return (
    <div className="relative overflow-hidden rounded-[1rem] border border-[#f2d78a] bg-[#f7f8dc] p-5 shadow-[0_8px_0_rgba(204,151,38,0.14)]">
      <div className="pointer-events-none absolute left-5 top-5 h-3 w-3 rounded-full bg-[#ff7a59]" />
      <div className="pointer-events-none absolute right-10 top-7 h-4 w-4 rotate-45 bg-[#ffd23f]" />
      <div className="pointer-events-none absolute bottom-7 left-10 h-3 w-8 -rotate-12 rounded-full bg-[#4db6ff]" />
      <div className="pointer-events-none absolute bottom-10 right-7 h-3 w-3 rounded-full bg-[#8bdc65]" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-sm">
          <p className="inline-flex rounded-full bg-white/85 px-3 py-1 text-xs font-black text-[#8a5b18] shadow-[0_3px_0_rgba(138,91,24,0.12)]">
            Mission Clear
          </p>
          <h3 className="mt-3 text-[1.6rem] font-black leading-tight text-[#21452f]">
            오늘의 미션 완료!
          </h3>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
            <span className="rounded-full bg-white/85 px-3 py-2 text-[#2c6a41]">에코 행동 저장 완료</span>
            <span className="rounded-full bg-white/85 px-3 py-2 text-[#94612b]">내일 다시 도전</span>
          </div>
        </div>

        <div className="relative h-32 min-w-36 sm:h-40 sm:min-w-48">
          <div className="absolute bottom-0 right-0 h-32 w-32 rotate-[10deg] sm:h-40 sm:w-40">
            <Image
              src="/mission-confetti-popper.png"
              alt="색종이가 터지는 축하 폭죽"
              fill
              sizes="10rem"
              className="object-contain"
            />
          </div>
        </div>
      </div>
    </div>
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
    <div className="ole-card-flat p-5">
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
        <div className="mt-4 space-y-4 border-t border-[#d9e6c8] pt-4">
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
            <div className="ole-soft p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#47614d]">위치 인증</p>
                  <p className="mt-1 text-xs leading-5 text-[#6c816f]">위도, 경도 대신 도로명 주소로 보여줘요.</p>
                </div>
                <button type="button" onClick={onVerifyLocation} className="shrink-0 whitespace-nowrap rounded-full bg-[#e8f4dc] px-4 py-2 text-sm font-black text-[#2c6a41]">
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
            <div className="ole-soft space-y-3 p-4">
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
                  className="ole-field min-h-24 w-full px-4 py-3 text-sm text-[#21452f]"
                />
              </label>
            </div>
          ) : null}

          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="ole-button w-full px-5 py-4 text-base font-black text-white disabled:cursor-not-allowed disabled:bg-[#a9bea9]"
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
  const [loginForm, setLoginForm] = useState<LoginForm>(readRememberedLoginForm);
  const [rememberLogin, setRememberLogin] = useState(() => hasRememberedLoginForm(readRememberedLoginForm()));
  const [signupAnswers, setSignupAnswers] = useState<SignupAnswers>(createEmptySignupAnswers());
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [currentUser, setCurrentUser] = useState<RegisteredUser | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [selectedMission, setSelectedMission] = useState<DailyMission | null>(null);
  const [missionDrawDate, setMissionDrawDate] = useState("");
  const [missionReason, setMissionReason] = useState("");
  const [isMissionLoading, setIsMissionLoading] = useState(false);
  const [isMissionDetailOpen, setIsMissionDetailOpen] = useState(true);
  const [missionVerification, setMissionVerification] = useState<MissionVerificationState>(createEmptyMissionVerification);
  const [completedMissionHistory, setCompletedMissionHistory] = useState<CompletedMissionRecord[]>([]);
  const [dailyCheckinDraft, setDailyCheckinDraft] = useState<DailyCheckinDraft>(createEmptyDailyCheckinDraft);
  const [lastCheckinDate, setLastCheckinDate] = useState("");
  const [challenges, setChallenges] = useState<Challenge[]>(() => initialChallenges.map(createFreshChallengeState));
  const [completedChallengeHistory, setCompletedChallengeHistory] = useState<CompletedChallengeRecord[]>([]);
  const [completedMapActionHistory, setCompletedMapActionHistory] = useState<CompletedMapActionRecord[]>([]);
  const [challengeDraft, setChallengeDraft] = useState<ChallengeDraft>({
    title: "",
    description: "",
    checklist: [],
    location: "",
    difficulty: "",
    proofMethods: [],
    durationDays: "",
  });
  const [challengeRewardSuggestion, setChallengeRewardSuggestion] = useState<number | null>(null);
  const [challengeRewardReason, setChallengeRewardReason] = useState("");
  const [isChallengeRewardLoading, setIsChallengeRewardLoading] = useState(false);
  const [isChallengeChecklistLoading, setIsChallengeChecklistLoading] = useState(false);
  const [isChallengeRewardDetailsOpen, setIsChallengeRewardDetailsOpen] = useState(false);
  const [isChallengeLocationSelectionMode, setIsChallengeLocationSelectionMode] = useState(false);
  const [ratingChallengeId, setRatingChallengeId] = useState<string | null>(null);
  const [challengeCompletionRating, setChallengeCompletionRating] = useState<ChallengeCompletionRating>({
    accessibility: 0,
    recommendation: 0,
    difficulty: 0,
  });
  const [challengeRewardError, setChallengeRewardError] = useState("");
  const [isChallengeComposerOpen, setIsChallengeComposerOpen] = useState(false);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [openChallengeDetailIds, setOpenChallengeDetailIds] = useState<string[]>([]);
  const [expandedChallengeReviewIds, setExpandedChallengeReviewIds] = useState<string[]>([]);
  const [openChallengeWeekKeys, setOpenChallengeWeekKeys] = useState<string[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);

  const isLoggedIn = currentUser !== null;
  const currentUserKey = currentUser ? getIdentityKey(currentUser) : null;
  const todayKey = getTodayKey();

  const loadUserState = useCallback((user: RegisteredUser, firebaseProfile?: Partial<UserProfile>, appState?: StoredAppState) => {
    const userKey = getIdentityKey(user);
    const storedAppState = appState ?? createLocalAppState(userKey);
    const storedProfile = {
      ...readStoredProfile(userKey),
      ...firebaseProfile,
    };
    const selectedMission =
      storedAppState.selectedMission && storedAppState.selectedMissionDate === getTodayKey()
        ? storedAppState.selectedMission
        : null;

    setCurrentUser(user);
    setProfile(applyMinimumClearedDebt({
      ...storedProfile,
      name: getDisplayName(user, storedProfile.name),
      ecoDebt: storedProfile.ecoDebt ?? user.initialDebt,
      ecoMoney: storedProfile.ecoMoney ?? 0,
      school: getDisplaySchool(user, storedProfile.school),
    }));
    setSelectedMission(selectedMission);
    setMissionDrawDate(storedAppState.missionDrawDate);
    setMissionReason("");
    setMissionVerification(createEmptyMissionVerification());
    setCompletedMissionHistory(storedAppState.completedMissionHistory);
    setDailyCheckinDraft(storedAppState.dailyCheckinDraft);
    setLastCheckinDate(storedAppState.lastCheckinDate);
    setCompletedChallengeHistory(storedAppState.completedChallengeHistory);
    setCompletedMapActionHistory(storedAppState.completedMapActionHistory);
    setChallenges(storedAppState.challenges);
    setActiveTab("home");
  }, []);

  useEffect(() => {
    let isActive = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const storedUsers = readRegisteredUsers();

      setRegisteredUsers(storedUsers);
      setChallenges(initialChallenges.map(createFreshChallengeState));

      if (!firebaseUser) {
        if (isActive) {
          setHasHydrated(true);
        }
        return;
      }

      try {
        const userSnapshot = await getDoc(doc(db, "users", firebaseUser.uid));
        const storedUser = parseStoredUserDocument(userSnapshot.data(), firebaseUser.uid);

        if (!isActive) {
          return;
        }

        if (!storedUser) {
          setAuthNotice("학생 프로필을 찾지 못했어요. 다시 로그인해 주세요.");
          await signOut(auth);
          return;
        }

        const appState = await readUserAppState(firebaseUser.uid, getIdentityKey(storedUser));

        if (!isActive) {
          return;
        }

        loadUserState(storedUser, storedUser.profile, appState);
      } catch {
        if (isActive) {
          setAuthNotice("로그인 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
        }
      } finally {
        if (isActive) {
          setHasHydrated(true);
        }
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [loadUserState]);

  useEffect(() => {
    if (!hasHydrated || !currentUser) {
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const firestoreUsers = snapshot.docs
          .map((userDocument) => parseStoredUserDocument(userDocument.data(), userDocument.id))
          .filter((user): user is RegisteredUser => user !== null);

        setRegisteredUsers(firestoreUsers);
      },
      () => {
        setAuthNotice("랭킹 정보를 불러오지 못했어요. Firestore 읽기 권한을 확인해 주세요.");
      },
    );

    return unsubscribe;
  }, [currentUser, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated || !currentUser) {
      return;
    }

    void setDoc(
      doc(db, "users", currentUser.uid),
      {
        profile,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }, [currentUser, hasHydrated, profile]);

  useEffect(() => {
    if (!hasHydrated || !currentUser) {
      return;
    }

    void setDoc(
      doc(db, "users", currentUser.uid, "appState", "main"),
      {
        selectedMission,
        selectedMissionDate: selectedMission ? todayKey : "",
        missionDrawDate,
        completedMissionHistory,
        dailyCheckinDraft,
        lastCheckinDate,
        challenges,
        completedChallengeHistory,
        completedMapActionHistory,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }, [
    challenges,
    completedChallengeHistory,
    completedMapActionHistory,
    completedMissionHistory,
    currentUser,
    dailyCheckinDraft,
    hasHydrated,
    lastCheckinDate,
    missionDrawDate,
    selectedMission,
    todayKey,
  ]);

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
    if (!hasHydrated || !currentUser) {
      return;
    }

    const timeoutId = window.setTimeout(reconcileDailyCheckin, 0);
    const intervalId = window.setInterval(reconcileDailyCheckin, 60 * 1000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [currentUser, dailyCheckinDraft, hasHydrated]);

  const completionRate = Math.min(100, Math.round((profile.clearedDebt / Math.max(1, profile.clearedDebt + profile.ecoDebt)) * 100));
  const carbonFootprintSavedKg = (profile.clearedDebt / 100).toFixed(1);
  const hasEcoDebt = profile.ecoDebt > 0;
  const hasCheckedInToday = dailyCheckinDraft.responded && dailyCheckinDraft.date === todayKey;
  const rewardActionLabel = hasEcoDebt ? "빚 청산하기" : "에코머니 받기";
  const rewardAmountLabel = hasEcoDebt ? "청산 금액" : "받을 에코머니";
  const rewardBadgeLabel = hasEcoDebt ? "복구" : "받기";
  const missionTitle = hasEcoDebt ? "에코머니 빚 청산하기" : "에코머니 받기";
  const missionCompletedToday = completedMissionHistory.some((record) => record.completedAt === todayKey);
  const completedChallengeToday = completedChallengeHistory.some((record) => record.completedAt === todayKey);
  const completedTodayMapActionKeys = completedMapActionHistory
    .filter((record) => record.completedAt === todayKey)
    .map((record) => createMapActionKey(record.placeId, record.action));
  const canDrawMissionToday = missionDrawDate !== todayKey && !missionCompletedToday && !selectedMission;
  const activeChallenges = challenges.filter((challenge) => challenge.joined && !challenge.completed);
  const availableChallenges = challenges.filter((challenge) => !challenge.completed && !challenge.joined);
  const completedChallengeIds = new Set(completedChallengeHistory.map((record) => record.id));
  const completedChallenges = challenges.filter((challenge) => challenge.completed || completedChallengeIds.has(challenge.id));

  useEffect(() => {
    if (hasHydrated && isLoggedIn && activeTab === "home" && !hasCheckedInToday) {
      const openTimer = window.setTimeout(() => setIsCheckinModalOpen(true), 0);
      return () => window.clearTimeout(openTimer);
    }
  }, [activeTab, hasCheckedInToday, hasHydrated, isLoggedIn]);

  const earthMoodImage =
    hasCheckedInToday && completedChallengeToday && missionCompletedToday
      ? "/earth-mood-complete.png"
      : missionCompletedToday
        ? "/earth-mood-mission.png"
        : "/earth-mood-start.png";
  const challengeDraftDurationDays = Number(challengeDraft.durationDays);
  const challengeRewardDetails =
    Number.isFinite(challengeDraftDurationDays) &&
    challengeDraftDurationDays >= 1 &&
    challengeDraft.difficulty !== "" &&
    challengeDraft.proofMethods.length > 0
      ? calculateChallengeRewardDetails({
          location: challengeDraft.location,
          durationDays: challengeDraftDurationDays,
          difficulty: challengeDraft.difficulty,
          proofMethods: challengeDraft.proofMethods,
        })
      : null;

  const rankingUsers = useMemo(() => {
    const visibleRegisteredUsers = registeredUsers.filter((user) => !excludedRankingUserNames.has(user.name.trim()));
    const registeredUserKeys = new Set(visibleRegisteredUsers.map(getIdentityKey));
    const rankingSourceUsers = [
      ...visibleRegisteredUsers,
      ...MOCK_RANKING_USERS.filter((user) => !registeredUserKeys.has(getIdentityKey(user))),
    ];

    return rankingSourceUsers.map((user) => {
      const userKey = getIdentityKey(user);
      const rankingProfile = getRankingProfile(user);
      const isCurrentUser = currentUserKey === userKey;

      return {
        ...user,
        className: `${user.grade}학년 ${user.classRoom}반`,
        clearedDebt: isCurrentUser ? profile.clearedDebt : rankingProfile.clearedDebt,
        ecoDebt: isCurrentUser ? profile.ecoDebt : rankingProfile.ecoDebt,
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

  const handleRememberLoginChange = (value: boolean) => {
    setRememberLogin(value);

    if (!value && typeof window !== "undefined") {
      window.localStorage.removeItem(rememberedLoginStorageKey);
    }
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedUser = normalizeIdentity(loginForm);
    const studentEmail = buildStudentAuthEmail(normalizedUser);
    const password = loginForm.password.trim();

    if (password.length < 6) {
      setAuthNotice("비밀번호는 6자리 이상으로 정해 주세요.");
      return;
    }

    if (authMode === "signup") {
      let createdUserCredential: Awaited<ReturnType<typeof createUserWithEmailAndPassword>> | null = null;

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, studentEmail, password);
        createdUserCredential = userCredential;
        const initialDebt = calculateInitialDebt(signupAnswers);
        const nextProfile: UserProfile = {
          name: normalizedUser.name,
          school: `${normalizedUser.grade}학년 ${normalizedUser.classRoom}반`,
          ecoDebt: initialDebt,
          ecoMoney: 0,
          clearedDebt: 0,
        };
        const nextUser: RegisteredUser = {
          ...normalizedUser,
          uid: userCredential.user.uid,
          initialDebt,
          profile: nextProfile,
        };

        await setDoc(doc(db, "users", nextUser.uid), {
          ...nextUser,
          profile: nextProfile,
          createdAt: new Date().toISOString(),
        });
        await setDoc(doc(db, "users", nextUser.uid, "appState", "main"), {
          selectedMission: null,
          selectedMissionDate: "",
          missionDrawDate: "",
          completedMissionHistory: [],
          dailyCheckinDraft: createEmptyDailyCheckinDraft(),
          lastCheckinDate: "",
          challenges: initialChallenges.map(createFreshChallengeState),
          completedChallengeHistory: [],
          completedMapActionHistory: [],
          updatedAt: new Date().toISOString(),
        });

        setRegisteredUsers((current) => {
          const nextUsers = current.filter((user) => getIdentityKey(user) !== getIdentityKey(nextUser));
          return [...nextUsers, nextUser];
        });
        setCurrentUser(nextUser);
        setProfile(nextProfile);
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
        if (rememberLogin) {
          saveRememberedLoginForm(normalizedUser);
        }
        setAuthNotice("회원가입이 완료됐어요.");
      } catch (error) {
        if (createdUserCredential) {
          try {
            await deleteUser(createdUserCredential.user);
          } catch {
            // If cleanup fails, keep the original Firebase error visible to the user.
          }
        }

        setAuthNotice(getSignupErrorMessage(error));
      }
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, studentEmail, password);
      const userSnapshot = await getDoc(doc(db, "users", userCredential.user.uid));
      const storedUser = parseStoredUserDocument(userSnapshot.data(), userCredential.user.uid);

      if (!storedUser) {
        setAuthNotice("로그인은 되었지만 학생 프로필을 찾지 못했어요. 관리자에게 계정 연결을 확인해 달라고 해 주세요.");
        return;
      }

      setRegisteredUsers((current) => {
        const nextUsers = current.filter((user) => getIdentityKey(user) !== getIdentityKey(storedUser));
        return [...nextUsers, storedUser];
      });
      const appState = await readUserAppState(userCredential.user.uid, getIdentityKey(storedUser));

      loadUserState(storedUser, storedUser.profile, appState);
      if (rememberLogin) {
        saveRememberedLoginForm(normalizedUser);
      }
      setAuthNotice("");
    } catch (error) {
      setAuthNotice(getLoginErrorMessage(error));
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
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
    setLoginForm(rememberLogin ? readRememberedLoginForm() : createEmptyLoginForm());
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
    setIsCheckinModalOpen(false);
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
      setIsMissionDetailOpen(true);
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
    setIsMissionDetailOpen(true);
    setMissionVerification(createEmptyMissionVerification());
    setMissionReason("오늘의 미션을 완료했어요.");
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
    setChallengeDraft((current) => ({
      ...current,
      [field]: value,
      checklist: field === "title" || field === "description" ? [] : current.checklist,
    }));
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

  const requestChallengeChecklist = async () => {
    if (!challengeDraft.title.trim() || !challengeDraft.description.trim()) {
      setChallengeRewardError("챌린지 제목과 해야 할 일을 먼저 입력해 주세요.");
      return;
    }

    setIsChallengeChecklistLoading(true);
    setChallengeRewardError("");

    try {
      const response = await fetch("/api/challenge-checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: challengeDraft.title.trim(),
          description: challengeDraft.description.trim(),
        }),
      });
      const payload = (await response.json()) as {
        checklist?: string[];
        difficulty?: ChallengeDifficulty;
        error?: string;
      };
      if (
        !response.ok ||
        !Array.isArray(payload.checklist) ||
        !payload.difficulty ||
        !["easy", "medium", "hard"].includes(payload.difficulty)
      ) {
        throw new Error(payload.error ?? "체크리스트를 만들지 못했어요.");
      }
      setChallengeDraft((current) => ({
        ...current,
        checklist: payload.checklist ?? [],
        difficulty: payload.difficulty ?? "",
      }));
    } catch (error) {
      setChallengeRewardError(error instanceof Error ? error.message : "체크리스트 생성 중 오류가 발생했어요.");
    } finally {
      setIsChallengeChecklistLoading(false);
    }
  };

  const toggleAvailableChallengeDetail = (challengeId: string) => {
    setOpenChallengeDetailIds((current) =>
      current.includes(challengeId) ? current.filter((id) => id !== challengeId) : [...current, challengeId],
    );
  };

  const toggleChallengeReviews = (challengeId: string) => {
    setExpandedChallengeReviewIds((current) =>
      current.includes(challengeId) ? current.filter((id) => id !== challengeId) : [...current, challengeId],
    );
  };

  const toggleChallengeWeek = (challengeId: string, weekLabel: string) => {
    const weekKey = `${challengeId}:${weekLabel}`;

    setOpenChallengeWeekKeys((current) =>
      current.includes(weekKey) ? current.filter((key) => key !== weekKey) : [...current, weekKey],
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
    setOpenChallengeDetailIds((current) => current.filter((id) => id !== challengeId));
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
    setOpenChallengeWeekKeys((current) => current.filter((key) => !key.startsWith(`${challengeId}:`)));
  };

  const hasCompletedChallenge = (challengeId: string) =>
    completedChallengeHistory.some((record) => record.id === challengeId) ||
    challenges.some((challenge) => challenge.id === challengeId && challenge.completed);

  const toggleChallengeLike = (challengeId: string) => {
    if (!currentUserKey) {
      return;
    }

    setChallenges((current) =>
      current.map((challenge) => {
        if (challenge.id !== challengeId) {
          return challenge;
        }

        const liked = challenge.likedBy.includes(currentUserKey);
        const likedBy = liked
          ? challenge.likedBy.filter((userKey) => userKey !== currentUserKey)
          : [...challenge.likedBy, currentUserKey];

        return {
          ...challenge,
          likes: Math.max(0, challenge.likes + (liked ? -1 : 1)),
          likedBy,
        };
      }),
    );
  };

  const toggleChallengeReviewLike = (challengeId: string, reviewId: string) => {
    if (!currentUserKey || !hasCompletedChallenge(challengeId)) {
      return;
    }

    setChallenges((current) =>
      current.map((challenge) => {
        if (challenge.id !== challengeId) {
          return challenge;
        }

        return {
          ...challenge,
          hotReviews: challenge.hotReviews.map((review) => {
            if (review.id !== reviewId) {
              return review;
            }

            const liked = review.likedBy.includes(currentUserKey);
            const likedBy = liked
              ? review.likedBy.filter((userKey) => userKey !== currentUserKey)
              : [...review.likedBy, currentUserKey];

            return {
              ...review,
              likes: Math.max(0, review.likes + (liked ? -1 : 1)),
              likedBy,
            };
          }),
        };
      }),
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
    const selectedDifficulty = challengeDraft.difficulty;

    if (
      challengeDraft.title.trim() === "" ||
      challengeDraft.description.trim() === "" ||
      challengeDraft.location.trim() === "" ||
      selectedDifficulty === "" ||
      !Number.isFinite(durationDays) ||
      durationDays < 1 ||
      challengeDraft.proofMethods.length === 0
    ) {
      setChallengeRewardError("AI 체크리스트와 난이도, 장소, 기간, 인증 방식을 먼저 정해 주세요.");
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
          difficulty: selectedDifficulty,
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
      const selectedDifficulty = challengeDraft.difficulty;

      if (
        challengeDraft.title.trim() === "" ||
        challengeDraft.description.trim() === "" ||
        challengeDraft.location.trim() === "" ||
        selectedDifficulty === "" ||
        !Number.isFinite(durationDays) ||
        durationDays < 1 ||
        challengeDraft.proofMethods.length === 0
      ) {
        setChallengeRewardError("AI 체크리스트와 난이도, 장소, 기간, 인증 방식을 모두 정해 주세요.");
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
        description:
          challengeDraft.checklist.length > 0
            ? challengeDraft.checklist.map((item) => `□ ${item}`).join("\n")
            : challengeDraft.description.trim(),
        location: challengeDraft.location.trim(),
        difficulty: selectedDifficulty,
        proofMethods: challengeDraft.proofMethods,
        participants: 0,
        reward,
        durationDays,
        creatorBonusRate,
        creatorBonusAwarded: false,
        likes: 0,
        likedBy: [],
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
        checklist: [],
        location: "",
        difficulty: "",
        proofMethods: [],
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
                likedBy: [],
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
      setChallengeCompletionRating({ accessibility: 0, recommendation: 0, difficulty: 0 });
      setRatingChallengeId(challengeId);
    }
  };

  const submitChallengeCompletionRating = () => {
    if (
      !ratingChallengeId ||
      challengeCompletionRating.accessibility === 0 ||
      challengeCompletionRating.recommendation === 0 ||
      challengeCompletionRating.difficulty === 0
    ) {
      return;
    }

    setCompletedChallengeHistory((current) =>
      current.map((record) =>
        record.id === ratingChallengeId
          ? {
              ...record,
              accessibilityRating: challengeCompletionRating.accessibility,
              recommendationRating: challengeCompletionRating.recommendation,
              difficultyRating: challengeCompletionRating.difficulty,
            }
          : record,
      ),
    );
    setRatingChallengeId(null);
  };

  const renderMapSection = () => (
    <KakaoMapSection
      completedTodayActionKeys={completedTodayMapActionKeys}
      rewardActionLabel={rewardActionLabel}
      rewardAmountLabel={rewardAmountLabel}
      onCompleteAction={completeMapAction}
      challengeLocationSelectionMode={isChallengeLocationSelectionMode}
      onChallengeLocationSelect={(address) => {
        setChallengeDraft((current) => ({ ...current, location: address }));
        setIsChallengeLocationSelectionMode(false);
        setActiveTab("challenge");
        setIsChallengeComposerOpen(true);
      }}
    />
  );

  const renderMissionSection = () => {
    const needsGpsProof = requiresGpsProof(selectedMission);
    const canCompleteMission =
      selectedMission !== null &&
      missionVerification.photoName.trim() !== "" &&
      (!needsGpsProof || missionVerification.locationStatus === "granted");

    return (
      <section className="ole-card space-y-5 p-6">
        <div>
          <p className="text-base font-bold text-[#66806b]">오늘의 미션</p>
          <h2 className="mt-1 text-[1.9rem] font-black tracking-normal text-[#203826]">{missionTitle}</h2>
        </div>

        {selectedMission ? (
          <article className={`ole-soft ${isMissionDetailOpen ? "p-5" : "p-3.5"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className={isMissionDetailOpen ? "mt-2 break-keep text-[1.6rem] font-black tracking-normal text-[#1f3f27]" : "mt-1 break-keep text-[1.05rem] font-black tracking-normal text-[#1f3f27]"}>{selectedMission.title}</h3>
                {isMissionDetailOpen ? <p className="mt-2 break-keep text-base leading-6 text-[#627563]">{selectedMission.summary}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => setIsMissionDetailOpen((current) => !current)}
                className="shrink-0 self-start px-0 py-0 text-[0.72rem] font-bold text-[#6a7f6d] underline underline-offset-2 [font-family:'Apple_SD_Gothic_Neo','Malgun_Gothic',Arial,sans-serif]"
              >
                {isMissionDetailOpen ? "접기" : "펼치기"}
              </button>
            </div>

            <div className={isMissionDetailOpen ? "mt-3 grid gap-2 sm:grid-cols-2" : "hidden"}>
              <div className="border-l-4 border-[#8fcf66] bg-[#fffef8] px-4 py-3 text-base text-[#46604c]">{rewardAmountLabel} {selectedMission.ecoMoney} EM</div>
              <div className="border-l-4 border-[#8fcf66] bg-[#fffef8] px-4 py-3 text-base text-[#46604c]">예상 시간 {selectedMission.durationMinutes}분</div>
            </div>

            <div className={isMissionDetailOpen ? "mt-3 border-t border-[#d9e6c8] pt-3" : "hidden"}>
              <label className="block">
                <span className="mb-2 block text-base font-black text-[#47614d]">사진 인증</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleMissionPhotoChange(event.target.files?.[0]?.name ?? "")}
                  className="block w-full text-sm text-[#47614d] file:mr-3 file:rounded-full file:border-0 file:bg-[#e8f4dc] file:px-4 file:py-2 file:text-sm file:font-black file:text-[#2c6a41]"
                />
              </label>

              {missionVerification.photoName ? <p className="mt-3 text-sm text-[#5d725e]">선택한 사진: {missionVerification.photoName}</p> : null}

              {needsGpsProof ? (
                <div className="mt-3 ole-card-flat p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-black text-[#47614d]">위치 인증</p>
                    </div>
                    <button type="button" onClick={verifyMissionLocation} className="shrink-0 whitespace-nowrap rounded-full bg-[#e8f4dc] px-4 py-2 text-sm font-black text-[#2c6a41]">
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
              className={`${isMissionDetailOpen ? "mt-4 w-full rounded-[0.8rem] bg-[#2a5d3b] px-5 py-3 text-base font-black text-white transition hover:bg-[#214b30]" : "hidden"} disabled:cursor-not-allowed disabled:bg-[#a9bea9]`}
            >
              인증 완료하고 {rewardActionLabel}
            </button>
          </article>
        ) : missionCompletedToday ? (
          <MissionCompleteCelebration />
        ) : (
          <div className="ole-soft border border-[#d9e6c8] p-5 text-base leading-7 text-[#667d6b]">
            아직 뽑은 미션이 없어요. 아래 버튼으로 오늘의 미션을 받아보세요.
          </div>
        )}

        {missionReason && !missionCompletedToday ? <div className="border-l-4 border-[#ffd76a] bg-[#fff8de] px-4 py-4 text-sm leading-6 text-[#7a5a1d]">{missionReason}</div> : null}

        {!missionCompletedToday ? (
          <button
            onClick={drawMission}
            disabled={!canDrawMissionToday || isMissionLoading}
            className="w-full rounded-[0.8rem] bg-[#d8eece] px-5 py-4 text-base font-black text-[#23442b] shadow-[0_4px_0_rgba(73,122,64,0.16)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          >
            {isMissionLoading
              ? "미션 불러오는 중..."
              : selectedMission
                ? "현재 미션 진행 중"
                : missionDrawDate === todayKey
                  ? "오늘은 이미 미션을 뽑았어요"
                  : "오늘의 미션 뽑기"}
          </button>
        ) : null}
      </section>
    );
  };

  const renderContent = () => {
    if (activeTab === "home") {
      return (
        <div className="space-y-4 sm:space-y-6">
          <section className="ole-sticker relative overflow-hidden p-5 sm:p-6">
            <div className="relative min-h-28 pr-28 min-[390px]:pr-32 sm:min-h-32 sm:pr-40">
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#55735d]">{profile.school}</p>
                <h1 className="mt-2 text-[1.75rem] font-black leading-tight tracking-normal text-[#183522] min-[390px]:text-[2rem]">
                  {profile.name}님의 지구
                </h1>
                <p className="mt-3 text-[0.95rem] leading-6 text-[#5a7460]">
                  오늘도 우리의 지구를 지켜요!
                </p>
              </div>
              <div className="absolute right-0 top-0 h-24 w-24 min-[390px]:h-28 min-[390px]:w-28 sm:h-32 sm:w-32">
                <Image
                  src={earthMoodImage}
                  alt="오늘 활동 상태를 보여주는 지구 캐릭터"
                  fill
                  sizes="(min-width: 640px) 8rem, 7rem"
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            <div className="mt-4 grid w-full grid-cols-2 gap-3">
              <div className="min-w-0 overflow-hidden rounded-[0.95rem] bg-white/70 p-3.5 ring-1 ring-[#d8e8c9]">
                <p className="text-xs font-bold text-[#66806b] sm:text-sm">{hasEcoDebt ? "남은 빚" : "보유 EM"}</p>
                <p className="mt-1 text-[1.18rem] font-black leading-tight tracking-normal text-[#1d3f28] min-[390px]:text-[1.35rem] sm:text-[1.55rem]">
                  {(hasEcoDebt ? profile.ecoDebt : profile.ecoMoney).toLocaleString()} EM
                </p>
              </div>

              <div className="min-w-0 overflow-hidden rounded-[0.95rem] bg-white/70 p-3.5 ring-1 ring-[#d8e8c9]">
                <p className="text-xs font-bold text-[#66806b] sm:text-sm">차감한 빚</p>
                <p className="mt-1 text-[1.18rem] font-black leading-tight tracking-normal text-[#1d3f28] min-[390px]:text-[1.35rem] sm:text-[1.55rem]">{profile.clearedDebt.toLocaleString()} EM</p>
              </div>

              <div className="min-w-0 overflow-hidden rounded-[0.95rem] bg-white/70 p-3.5 ring-1 ring-[#d8e8c9]">
                <div className="flex items-center justify-between gap-2 text-xs font-black text-[#66806b]">
                  <span>청산률</span>
                  <span className="shrink-0">{completionRate}%</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#dcead3] shadow-[inset_0_1px_2px_rgba(44,106,65,0.12)]">
                  <div
                    className="h-full rounded-full bg-[#79c85b]"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>

              <div className="min-w-0 overflow-hidden rounded-[0.95rem] bg-white/70 p-3.5 ring-1 ring-[#d8e8c9]">
                <p className="text-xs font-bold text-[#66806b] sm:text-sm">탄소 절감</p>
                <p className="mt-1 text-[1.18rem] font-black leading-tight tracking-normal text-[#1d3f28] min-[390px]:text-[1.35rem] sm:text-[1.55rem]">{carbonFootprintSavedKg} kg</p>
              </div>
            </div>
          </section>

          <section className="ole-card border-2 border-[#d0e3bd] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[#66806b]">오늘 체크인</p>
                <h2 className="mt-1 text-[1.45rem] font-black tracking-normal text-[#1e3826] min-[390px]:text-[1.7rem]">
                  {hasCheckedInToday ? "오늘 기록을 저장했어요" : "오늘 사용량을 기록해요"}
                </h2>
              </div>
              <button type="button" onClick={() => setIsCheckinModalOpen(true)} className="w-full rounded-[0.8rem] bg-[#2a5d3b] px-5 py-4 text-base font-black text-white transition hover:bg-[#214b30] sm:w-auto sm:shrink-0">
                {hasCheckedInToday ? "체크아웃" : "체크인"}
              </button>
            </div>

            <div className="mt-4 border-l-4 border-[#8fcf66] bg-[#fffef8] px-4 py-3 text-sm leading-6 text-[#64806a]">
              체크인은 하루 동안 쓴 물, 플라스틱, 차량 이동을 기록하는 출석이에요. 응답하지 않으면 다음날 40 EM이 추가돼요.
            </div>
          </section>

          {isCheckinModalOpen ? (
            <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#183522]/35 p-4 sm:items-center">
              <div className="ole-card w-full max-w-lg p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[#5d725e]">오늘 체크인</p>
                    <h3 className="mt-1 text-[1.6rem] font-black text-[#21452f]">단위를 보고 기록해요</h3>
                  </div>
                  {hasCheckedInToday ? (
                    <button type="button" onClick={() => setIsCheckinModalOpen(false)} className="rounded-full bg-[#eef5e8] px-4 py-2 text-sm font-black text-[#2c6a41]">
                      닫기
                    </button>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-3">
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[#47614d]">샤워 시간</span>
                    <select
                      value={dailyCheckinDraft.showerMinutes}
                      onChange={(event) => handleCheckinDraftChange("showerMinutes", event.target.value)}
                      aria-label="샤워 시간, 분 단위"
                      className="ole-field w-full px-4 py-4 text-base text-[#1f3526]"
                    >
                      <option value="">선택해 주세요</option>
                      {showerMinuteOptions.map((minute, index) => (
                        <option key={`shower-${minute}`} value={minute}>
                          {minute}분{index === showerMinuteOptions.length - 1 ? " 이상" : ""}
                        </option>
                      ))}
                    </select>
                    <span className="mt-1 block text-xs font-bold text-[#7b8f7b]">분 단위로 입력해요.</span>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[#47614d]">페트병 사용</span>
                    <select
                      value={dailyCheckinDraft.petBottleCount}
                      onChange={(event) => handleCheckinDraftChange("petBottleCount", event.target.value)}
                      aria-label="페트병 사용 개수"
                      className="ole-field w-full px-4 py-4 text-base text-[#1f3526]"
                    >
                      <option value="">선택해 주세요</option>
                      {petBottleCountOptions.map((count, index) => (
                        <option key={`pet-bottle-${count}`} value={count}>
                          {count}개{index === petBottleCountOptions.length - 1 ? " 이상" : ""}
                        </option>
                      ))}
                    </select>
                    <span className="mt-1 block text-xs font-bold text-[#7b8f7b]">개수로 입력해요.</span>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[#47614d]">차 이용 시간</span>
                    <select
                      value={dailyCheckinDraft.carMinutes}
                      onChange={(event) => handleCheckinDraftChange("carMinutes", event.target.value)}
                      aria-label="차 이용 시간, 분 단위"
                      className="ole-field w-full px-4 py-4 text-base text-[#1f3526]"
                    >
                      <option value="">선택해 주세요</option>
                      {carMinuteOptions.map((minute, index) => (
                        <option key={`car-${minute}`} value={minute}>
                          {minute}분{index === carMinuteOptions.length - 1 ? " 이상" : ""}
                        </option>
                      ))}
                    </select>
                    <span className="mt-1 block text-xs font-bold text-[#7b8f7b]">분 단위로 입력해요.</span>
                  </label>
                </div>

                <div className="mt-4 border-t border-[#d9e6c8] pt-4 text-sm leading-6 text-[#64806a]">
                  샤워는 10분 초과분만 계산돼요. 다음날 입력값 기준으로 빚이 반영됩니다.
                </div>

                <button type="button" onClick={handleCheckinSave} className="mt-5 w-full rounded-[0.8rem] bg-[#2a5d3b] px-5 py-4 text-base font-black text-white transition hover:bg-[#214b30]">
                  {hasCheckedInToday ? "다시 저장" : "체크인 저장"}
                </button>
              </div>
            </div>
          ) : null}

          {renderMissionSection()}
        </div>
      );
    }

    if (activeTab === "map") {
      return renderMapSection();
    }

    if (activeTab === "mission") {
      const needsGpsProof = requiresGpsProof(selectedMission);
      const canCompleteMission =
        selectedMission !== null &&
        missionVerification.photoName.trim() !== "" &&
        (!needsGpsProof || missionVerification.locationStatus === "granted");

      return (
        <section className="ole-card space-y-5 p-6">
          <div>
            <p className="text-base font-bold text-[#66806b]">오늘의 미션</p>
            <h2 className="mt-1 text-[1.9rem] font-black tracking-normal text-[#203826]">{missionTitle}</h2>
            </div>

          {selectedMission ? (
            <article className={`ole-soft ${isMissionDetailOpen ? "p-5" : "p-3.5"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className={isMissionDetailOpen ? "mt-2 break-keep text-[1.6rem] font-black tracking-normal text-[#1f3f27]" : "mt-1 break-keep text-[1.05rem] font-black tracking-normal text-[#1f3f27]"}>{selectedMission.title}</h3>
                  {isMissionDetailOpen ? <p className="mt-2 break-keep text-base leading-6 text-[#627563]">{selectedMission.summary}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => setIsMissionDetailOpen((current) => !current)}
                  className="shrink-0 self-start px-0 py-0 text-[0.72rem] font-bold text-[#6a7f6d] underline underline-offset-2 [font-family:'Apple_SD_Gothic_Neo','Malgun_Gothic',Arial,sans-serif]"
                >
                  {isMissionDetailOpen ? "접기" : "펼치기"}
                </button>
              </div>

              <div className={isMissionDetailOpen ? "mt-3 grid gap-2 sm:grid-cols-2" : "hidden"}>
                <div className="border-l-4 border-[#8fcf66] bg-[#fffef8] px-4 py-3 text-base text-[#46604c]">{rewardAmountLabel} {selectedMission.ecoMoney} EM</div>
                <div className="border-l-4 border-[#8fcf66] bg-[#fffef8] px-4 py-3 text-base text-[#46604c]">예상 시간 {selectedMission.durationMinutes}분</div>
              </div>

              <div className={isMissionDetailOpen ? "mt-3 border-t border-[#d9e6c8] pt-3" : "hidden"}>
                <label className="block">
                  <span className="mb-2 block text-base font-black text-[#47614d]">사진 인증</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleMissionPhotoChange(event.target.files?.[0]?.name ?? "")}
                    className="block w-full text-sm text-[#47614d] file:mr-3 file:rounded-full file:border-0 file:bg-[#e8f4dc] file:px-4 file:py-2 file:text-sm file:font-black file:text-[#2c6a41]"
                  />
                </label>

                {missionVerification.photoName ? <p className="mt-3 text-sm text-[#5d725e]">선택한 사진: {missionVerification.photoName}</p> : null}

                {needsGpsProof ? (
                  <div className="mt-3 ole-card-flat p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-black text-[#47614d]">위치 인증</p>
                      </div>
                      <button type="button" onClick={verifyMissionLocation} className="shrink-0 whitespace-nowrap rounded-full bg-[#e8f4dc] px-4 py-2 text-sm font-black text-[#2c6a41]">
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
                className={`${isMissionDetailOpen ? "mt-4 w-full rounded-[0.8rem] bg-[#2a5d3b] px-5 py-3 text-base font-black text-white transition hover:bg-[#214b30]" : "hidden"} disabled:cursor-not-allowed disabled:bg-[#a9bea9]`}
              >
                인증 완료하고 {rewardActionLabel}
              </button>
            </article>
          ) : missionCompletedToday ? (
            <MissionCompleteCelebration />
          ) : (
            <div className="ole-soft border border-[#d9e6c8] p-5 text-base leading-7 text-[#667d6b]">
              아직 뽑은 미션이 없어요. 아래 버튼으로 오늘의 미션을 받아보세요.
            </div>
          )}

          {missionReason && !missionCompletedToday ? <div className="border-l-4 border-[#ffd76a] bg-[#fff8de] px-4 py-4 text-sm leading-6 text-[#7a5a1d]">{missionReason}</div> : null}

          {!missionCompletedToday ? (
            <button
              onClick={drawMission}
              disabled={!canDrawMissionToday || isMissionLoading}
              className="w-full rounded-[0.8rem] bg-[#d8eece] px-5 py-4 text-base font-black text-[#23442b] shadow-[0_4px_0_rgba(73,122,64,0.16)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
            >
              {isMissionLoading
                ? "미션 불러오는 중..."
                : selectedMission
                  ? "현재 미션 진행 중"
                  : missionDrawDate === todayKey
                    ? "오늘은 이미 미션을 뽑았어요"
                    : "오늘의 미션 뽑기"}
            </button>
          ) : null}
        </section>
      );
    }

    if (activeTab === "challenge") {
      return (
        <section className="ole-card space-y-5 p-6">
          <section className="ole-sticker p-6">
            <p className="text-sm font-black uppercase tracking-normal text-[#4d7b50]">Challenge</p>
            <h2 className="mt-3 text-[2rem] font-black tracking-normal text-[#21452f]">챌린지</h2>
            <p className="mt-3 text-base leading-7 text-[#456754]">
              기간, 장소, 인증 기준이 정해진 활동만 만들 수 있어요. 참여한 친구는 하루에 한 번 인증해요.
            </p>
          </section>

          <section className="ole-card-flat p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#5d725e]">새 챌린지 만들기</p>
                <h3 className="mt-1 text-[1.45rem] font-black text-[#21452f]">친구들이 참여할 활동 제안하기</h3>
              </div>
              <button type="button" onClick={() => setIsChallengeComposerOpen(true)} className="min-w-[6.5rem] rounded-[0.8rem] bg-[#2c6a41] px-5 py-3 text-base font-black leading-tight text-white">
                <span className="block whitespace-nowrap">챌린지</span>
                <span className="block whitespace-nowrap">만들기</span>
              </button>
            </div>
          </section>

          {activeChallenges.length > 0 ? (
            <section className="ole-soft p-5">
              <p className="text-sm font-bold text-[#5d725e]">참여 중인 챌린지</p>
              <div className="mt-4 space-y-4">
                {activeChallenges.map((challenge) => {
                  const completedDays = challenge.proofDays.filter((day) => day.submitted).length;
                  const activeDay = getChallengeActiveDay(challenge, todayKey);
                  const activeWeekIndex = Math.floor((activeDay - 1) / 7);
                  const proofDayGroups = groupProofDays(challenge.proofDays);
                  const challengeChecklist = getChallengeChecklist(challenge.description);

                  return (
                    <article key={challenge.id} className="ole-card-flat p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[1.25rem] font-black text-[#21452f]">{challenge.title}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-sm font-black">
                            <span className="rounded-full bg-[#f3f8ea] px-3 py-2 text-[#2c6a41]">
                              {completedDays}/{challenge.durationDays}일 인증 완료
                            </span>
                            <span className="rounded-full bg-[#fff4cf] px-3 py-2 text-[#8b6422]">{rewardBadgeLabel} {challenge.reward} EM</span>
                            <button
                              type="button"
                              onClick={() => toggleChallengeLike(challenge.id)}
                              className={`rounded-full px-3 py-2 ${
                                currentUserKey && challenge.likedBy.includes(currentUserKey)
                                  ? "bg-[#ffd9df] text-[#a23951]"
                                  : "bg-white text-[#6b7d6b]"
                              }`}
                            >
                              {currentUserKey && challenge.likedBy.includes(currentUserKey) ? "♥" : "♡"} {challenge.likes}
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => toggleChallengeProgress(challenge.id)} className="rounded-[0.8rem] bg-[#245c37] px-4 py-2.5 text-sm font-black text-white shadow-[0_3px_0_rgba(31,67,42,0.20)]">
                            {challenge.progressOpen ? "접기" : "열기"}
                          </button>
                          <button type="button" onClick={() => handleGiveUpChallenge(challenge.id)} className="rounded-[0.8rem] border border-[#f0b79f] bg-white px-4 py-2.5 text-sm font-black text-[#9a4d2d]">
                            그만하기
                          </button>
                        </div>
                      </div>

                      {challenge.progressOpen ? (
                        <div className="mt-5 space-y-5">
                          <div className="rounded-[1rem] border border-[#cfe3bd] bg-[#f6fbea] p-4">
                            <p className="text-sm font-black text-[#21452f]">해야 할 일 체크리스트</p>
                            <ul className="mt-3 space-y-2">
                              {challengeChecklist.map((item, index) => (
                                <li key={`${challenge.id}-checklist-${index}`} className="flex items-start gap-3 text-sm font-bold leading-6 text-[#47614d]">
                                  <span aria-hidden="true" className="mt-0.5 text-lg leading-5 text-[#5c9f45]">☐</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {proofDayGroups.map((group, groupIndex) => {
                            const weekKey = `${challenge.id}:${group.label}`;
                            const isCurrentWeek = groupIndex === activeWeekIndex;
                            const isWeekOpen = isCurrentWeek || openChallengeWeekKeys.includes(weekKey);
                            const dayRangeLabel =
                              group.days.length > 1
                                ? `Day ${group.days[0].day}-${group.days[group.days.length - 1].day}`
                                : `Day ${group.days[0].day}`;

                            return (
                              <div key={weekKey} className="space-y-3">
                                <div className="flex items-center justify-between gap-3 border-b border-[#d9e6c8] pb-2">
                                  <p className="text-sm font-black text-[#47614d]">
                                    {isCurrentWeek ? "이번 주" : group.label} · {dayRangeLabel}
                                  </p>
                                  {!isCurrentWeek ? (
                                    <button
                                      type="button"
                                      onClick={() => toggleChallengeWeek(challenge.id, group.label)}
                                      className="rounded-full bg-[#fff8cf] px-3 py-1 text-xs font-black text-[#7c5a1d]"
                                      aria-label={`${group.label} ${isWeekOpen ? "접기" : "펼치기"}`}
                                    >
                                      {isWeekOpen ? "^" : "v"}
                                    </button>
                                  ) : null}
                                </div>

                                {isWeekOpen ? (
                                  <div className="space-y-3">
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
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className="ole-soft p-5">
              <p className="text-sm font-bold text-[#5d725e]">참여 중인 챌린지</p>
              <div className="mt-4 border-t border-[#d9e6c8] pt-4 text-base text-[#5d725e]">아직 참여한 챌린지가 없어요.</div>
            </section>
          )}

          {completedChallenges.length > 0 ? (
            <section className="ole-soft p-5">
              <p className="text-sm font-bold text-[#5d725e]">완료한 챌린지</p>
              <div className="mt-4 space-y-4">
                {completedChallenges.map((challenge) => {
                  const likedChallenge = currentUserKey ? challenge.likedBy.includes(currentUserKey) : false;

                  return (
                    <article key={`completed-${challenge.id}`} className="ole-card-flat p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-[1.25rem] font-black text-[#21452f]">{challenge.title}</p>
                          <p className="mt-2 text-sm font-bold text-[#5d725e]">{challenge.durationDays}일 인증을 완료했어요.</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-sm font-black">
                            <span className="rounded-full bg-[#f3f8ea] px-3 py-2 text-[#2c6a41]">👍 추천 높음</span>
                            <span className="rounded-full bg-[#fff4cf] px-3 py-2 text-[#8b6422]">{rewardBadgeLabel} {challenge.reward} EM</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleChallengeLike(challenge.id)}
                          className={`shrink-0 whitespace-nowrap rounded-[0.8rem] font-black shadow-[0_3px_0_rgba(31,67,42,0.16)] ${
                            likedChallenge
                              ? "bg-[#f8d765] px-2.5 py-2 text-xs text-[#5d4513]"
                              : "bg-[#245c37] px-4 py-2.5 text-sm text-white"
                          }`}
                        >
                          {likedChallenge ? "좋아요 취소" : "챌린지 좋아요"}
                        </button>
                      </div>

                      <div className="hidden">
                        <p className="text-sm font-black text-[#5d725e]">후기</p>
                        {challenge.hotReviews.length > 0 ? (
                          <>
                            {(expandedChallengeReviewIds.includes(challenge.id)
                              ? challenge.hotReviews
                              : challenge.hotReviews.slice(0, 3)
                            ).map((review) => {
                              const likedReview = currentUserKey ? review.likedBy.includes(currentUserKey) : false;

                              return (
                                <div key={review.id} className="border-l-4 border-[#d9e6c8] bg-[#fffef8] p-4">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-black text-[#21452f]">{review.author}</p>
                                      <p className="mt-1 text-xs font-bold text-[#8c6c20]">{renderStars(review.rating)}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => toggleChallengeReviewLike(challenge.id, review.id)}
                                      className={`rounded-full px-3 py-1 text-xs font-black ${
                                        likedReview ? "bg-[#f8d765] text-[#5d4513]" : "bg-[#eef7ea] text-[#2c6a41]"
                                      }`}
                                    >
                                      좋아요 {review.likes}
                                    </button>
                                  </div>
                                  <p className="mt-2 text-sm leading-6 text-[#5d725e]">{review.text}</p>
                                </div>
                              );
                            })}
                            {challenge.hotReviews.length > 3 ? (
                              <button
                                type="button"
                                onClick={() => toggleChallengeReviews(challenge.id)}
                                className="w-full rounded-[0.75rem] border border-[#c9dec2] bg-white px-4 py-3 text-sm font-black text-[#2c6a41]"
                              >
                                {expandedChallengeReviewIds.includes(challenge.id)
                                  ? "후기 접기"
                                  : `후기 ${challenge.hotReviews.length - 3}개 더보기`}
                              </button>
                            ) : null}
                          </>
                        ) : (
                          <div className="border-l-4 border-[#d9e6c8] bg-[#fffef8] p-4 text-sm text-[#5d725e]">
                            아직 등록된 후기가 없어요.
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="max-h-[42rem] space-y-4 overflow-y-auto pr-1">
            {availableChallenges.map((challenge) => (
              <article key={challenge.id} className="ole-card-flat border-l-4 border-[#79c85b] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="mb-2 inline-flex rounded-full bg-[#eef7ea] px-3 py-1 text-xs font-black text-[#2c6a41]">
                      완료 보상 {challenge.reward} EM
                    </p>
                    <p className="text-[1.3rem] font-black text-[#21452f]">{challenge.title}</p>
                    <p className="mt-1 text-sm font-bold text-[#6b7d6b]">만든 사람: {maskCreatorName(challenge.creator)}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm font-black">
                      <span className="rounded-full bg-white px-3 py-2 text-[#2c6a41]">👥 {challenge.participants}명</span>
                      <span className="rounded-full bg-white px-3 py-2 text-[#8b6422]">📅 {challenge.durationDays}일</span>
                      <span className="rounded-full bg-white px-3 py-2 text-[#2c6a41]">🎁 {challenge.reward} EM</span>
                      <span className="rounded-full bg-white px-3 py-2 text-[#a23951]">♥ {challenge.likes}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-stretch">
                    <button
                      type="button"
                      onClick={() => toggleAvailableChallengeDetail(challenge.id)}
                      className="rounded-[0.75rem] border border-[#c9dec2] bg-white px-4 py-2.5 text-sm font-black text-[#2c6a41]"
                    >
                      {openChallengeDetailIds.includes(challenge.id) ? "간략히" : "자세히 보기"}
                    </button>
                    <button type="button" onClick={() => handleJoinChallenge(challenge.id)} className="rounded-[0.8rem] bg-[#245c37] px-5 py-4 text-base font-black text-white shadow-[0_4px_0_rgba(31,67,42,0.22)]">
                      참여하기
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleChallengeLike(challenge.id)}
                      className={`shrink-0 whitespace-nowrap rounded-[0.75rem] font-black ${
                        currentUserKey && challenge.likedBy.includes(currentUserKey)
                          ? "bg-[#ffd9df] px-2.5 py-2 text-xs text-[#a23951]"
                          : "border border-[#efc8d0] bg-white px-4 py-2.5 text-sm text-[#a23951]"
                      }`}
                    >
                      {currentUserKey && challenge.likedBy.includes(currentUserKey) ? "♥ 좋아요 취소" : "♡ 좋아요"}
                    </button>
                  </div>
                </div>

                {openChallengeDetailIds.includes(challenge.id) ? (
                  <div className="mt-4 border-t border-[#d9e6c8] pt-4">
                    <p className="text-base leading-7 text-[#5d725e]">{challenge.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2 text-sm font-black">
                      <span className="rounded-full bg-[#f3f8ea] px-3 py-2 text-[#2c6a41]">장소 {challenge.location}</span>
                      <span className="rounded-full bg-[#f3f8ea] px-3 py-2 text-[#2c6a41]">난이도 {challengeDifficultyLabels[challenge.difficulty]}</span>
                      <span className="rounded-full bg-[#f3f8ea] px-3 py-2 text-[#2c6a41]">
                        인증 {challenge.proofMethods.map((method) => challengeProofMethodLabels[method]).join(", ")}
                      </span>
                    </div>

                    <div className="mt-5">
                      <p className="text-sm font-black text-[#5d725e]">참여 정보</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-sm font-black">
                        <span className="rounded-full bg-[#eef7ea] px-3 py-2 text-[#2c6a41]">♿ 접근성 좋음</span>
                        <span className="rounded-full bg-[#fff4cf] px-3 py-2 text-[#8b6422]">👍 추천</span>
                        <span className="rounded-full bg-[#eef7ea] px-3 py-2 text-[#2c6a41]">난이도 {challengeDifficultyLabels[challenge.difficulty]}</span>
                      </div>
                      <div className="hidden">
                      {challenge.hotReviews.length > 0 ? (
                        <>
                          {(expandedChallengeReviewIds.includes(challenge.id)
                            ? challenge.hotReviews
                            : challenge.hotReviews.slice(0, 3)
                          ).map((review) => (
                            <div key={review.id} className="border-l-4 border-[#d9e6c8] bg-[#fffef8] p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-black text-[#21452f]">{review.author}</p>
                                  <p className="mt-1 text-xs font-bold text-[#8c6c20]">{renderStars(review.rating)}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleChallengeReviewLike(challenge.id, review.id)}
                                  disabled={!hasCompletedChallenge(challenge.id)}
                                  className="rounded-full bg-[#eef7ea] px-3 py-1 text-xs font-black text-[#2c6a41] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  좋아요 {review.likes}
                                </button>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-[#5d725e]">{review.text}</p>
                            </div>
                          ))}
                          {challenge.hotReviews.length > 3 ? (
                            <button
                              type="button"
                              onClick={() => toggleChallengeReviews(challenge.id)}
                              className="w-full rounded-[0.75rem] border border-[#c9dec2] bg-white px-4 py-3 text-sm font-black text-[#2c6a41]"
                            >
                              {expandedChallengeReviewIds.includes(challenge.id)
                                ? "후기 접기"
                                : `후기 ${challenge.hotReviews.length - 3}개 더보기`}
                            </button>
                          ) : null}
                        </>
                      ) : (
                        <div className="border-l-4 border-[#d9e6c8] bg-[#fffef8] p-4 text-sm text-[#5d725e]">
                          아직 등록된 후기가 없어요.
                        </div>
                      )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </section>

          {isChallengeComposerOpen ? (
            <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#183522]/35 p-4 sm:items-center">
              <div className="ole-card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
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
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[#47614d]">챌린지 이름</span>
                    <input
                      value={challengeDraft.title}
                      onChange={(event) => handleDraftChange("title", event.target.value)}
                      placeholder="예: 점심시간 잔반 줄이기"
                      className="ole-field w-full px-4 py-4 text-base text-[#1f3828]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[#47614d]">참여자가 해야 할 일</span>
                    <textarea
                      value={challengeDraft.description}
                      onChange={(event) => handleDraftChange("description", event.target.value)}
                      placeholder="예: 급식 후 잔반 없이 먹고 식판 사진을 남겨요."
                      className="ole-field min-h-28 w-full px-4 py-4 text-base text-[#1f3828]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void requestChallengeChecklist()}
                    disabled={isChallengeChecklistLoading}
                    className="rounded-[0.8rem] bg-[#eef7ea] px-4 py-3 text-sm font-black text-[#2c6a41] disabled:opacity-60"
                  >
                    {isChallengeChecklistLoading ? "AI가 정리하는 중..." : "AI로 체크리스트 만들기"}
                  </button>
                  {challengeDraft.checklist.length > 0 ? (
                    <div className="rounded-[0.85rem] border border-[#d9e6c8] bg-[#fffef8] p-4">
                      <p className="text-sm font-black text-[#21452f]">해야 할 일 체크리스트</p>
                      <ul className="mt-2 space-y-2 text-sm text-[#526a56]">
                        {challengeDraft.checklist.map((item, index) => (
                          <li key={`${item}-${index}`} className="flex gap-2">
                            <span aria-hidden="true">□</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="rounded-[0.85rem] border border-[#d9e6c8] bg-[#fffef8] p-4">
                    <p className="text-sm font-black text-[#47614d]">실천 장소</p>
                    <p className="mt-2 text-sm leading-6 text-[#647866]">
                      {challengeDraft.location || "지도에서 위치를 선택하거나 장소 없음을 눌러 주세요."}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsChallengeComposerOpen(false);
                          setIsChallengeLocationSelectionMode(true);
                          setActiveTab("map");
                        }}
                        className="rounded-[0.8rem] bg-[#fff1d6] px-4 py-3 text-sm font-black text-[#9a5b16]"
                      >
                        지도에서 선택
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDraftChange("location", "장소 없음")}
                        className="rounded-[0.8rem] bg-[#eef7ea] px-4 py-3 text-sm font-black text-[#2c6a41]"
                      >
                        장소 없음
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[0.85rem] bg-[#eef7ea] px-4 py-3 text-sm text-[#47614d]">
                    <span className="font-black">AI 결정 난이도: </span>
                    {challengeDraft.difficulty
                      ? challengeDifficultyLabels[challengeDraft.difficulty]
                      : "체크리스트를 만들면 자동으로 정해져요."}
                  </div>

                  <div className="grid gap-3">
                    <p className="text-sm font-black text-[#47614d]">인증 방식</p>
                    <p className="text-xs leading-5 text-[#6c816f]">참여자가 제출할 사진, GPS, 접근성·추천·난이도 선택 평가 중 최소 1개를 고르세요.</p>
                    <div className="grid grid-cols-2 gap-3">
                      {(["photo", "gps"] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => toggleChallengeProofMethod(method)}
                          className={`rounded-[0.8rem] px-4 py-4 text-base font-black ${
                            challengeDraft.proofMethods.includes(method) ? "bg-[#2c6a41] text-white" : "bg-white text-[#47614d] ring-1 ring-[#d5e5c9]"
                          }`}
                        >
                          {challengeProofMethodLabels[method]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-black text-[#47614d]">진행 기간</span>
                      <select
                        value={challengeDraft.durationDays}
                        onChange={(event) => handleDraftChange("durationDays", event.target.value)}
                        className="ole-field w-full px-4 py-4 text-base text-[#1f3828]"
                      >
                        <option value="">기간 선택</option>
                        {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                          <option key={day} value={day}>
                            {day}일
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="ole-soft px-4 py-4 text-sm text-[#1f3828]">
                      {isChallengeRewardLoading ? (
                        <span className="font-black text-[#2c6a41]">추천 보상 계산 중...</span>
                      ) : challengeRewardSuggestion !== null ? (
                        <>
                          <p className="font-black text-[#2c6a41]">추천 보상 {challengeRewardSuggestion} EM</p>
                          {challengeRewardReason ? <p className="mt-1 leading-6 text-[#5d725e]">{challengeRewardReason}</p> : null}
                        </>
                      ) : challengeRewardDetails !== null ? (
                        <>
                          <p className="font-black text-[#2c6a41]">예상 보상 {challengeRewardDetails.reward} EM</p>
                          <p className="mt-1 leading-6 text-[#5d725e]">{challengeRewardDetails.summary}</p>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-[0.9rem] border border-[#d9e6c8] bg-[#fffef8] p-4 text-sm text-[#4c654f]">
                    <button
                      type="button"
                      onClick={() => setIsChallengeRewardDetailsOpen((current) => !current)}
                      className="flex w-full items-center justify-between font-black text-[#21452f]"
                    >
                      <span>보상 기준</span>
                      <span>{isChallengeRewardDetailsOpen ? "접기" : "자세히"}</span>
                    </button>
                    {isChallengeRewardDetailsOpen ? (
                    <>
                    <p className="mt-1 leading-6">기본 30 EM에서 시작하고, 난이도·진행 기간·인증 방식·장소 구체성을 더해요. 기간이 길수록 매일 인증해야 하는 부담이 커서 기간 보상을 가장 크게 반영해요.</p>
                    {challengeRewardDetails !== null ? (
                      <div className="mt-3 grid gap-2">
                        {challengeRewardDetails.items.map((item) => (
                          <div key={item.label} className="rounded-[0.75rem] bg-white px-3 py-3 ring-1 ring-[#e0ead7]">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-black text-[#2c6a41]">{item.label}</span>
                              <span className="font-black text-[#8b6422]">+{item.points} EM</span>
                            </div>
                            <p className="mt-1 leading-6 text-[#5d725e]">{item.reason}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <ul className="mt-3 space-y-1.5 leading-6">
                        <li>기본 보상: +30 EM</li>
                        <li>난이도: 쉬움 +0, 보통 +8, 어려움 +16 EM</li>
                        <li>기간: 1~3일 +8, 4~7일 +25, 8~14일 +55, 15~30일 +90, 31일 이상 +140 EM</li>
                        <li>인증: 사진 +4, GPS +6, 후기 +4 EM</li>
                        <li>장소 구체성: 구체적인 장소 입력 시 +4 EM</li>
                      </ul>
                    )}
                    </>
                    ) : null}
                  </div>

                  {challengeRewardError ? <p className="text-sm font-bold text-[#b13a3a]">{challengeRewardError}</p> : null}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button type="button" onClick={() => void requestChallengeRewardSuggestion()} className="flex-1 rounded-[0.8rem] bg-[#fff8cf] px-5 py-4 text-base font-black text-[#2c6a41] shadow-[0_4px_0_rgba(139,100,34,0.14)]">
                      추천 보상 보기
                    </button>
                    <button type="button" onClick={handleCreateChallenge} disabled={isChallengeRewardLoading} className="ole-button flex-1 px-5 py-4 text-base font-black text-white disabled:bg-[#9fbea5]">
                      챌린지 만들기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {ratingChallengeId ? (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#183522]/40 p-4 sm:items-center">
              <div className="ole-card w-full max-w-md p-6">
                <p className="text-sm font-bold text-[#5d725e]">챌린지 완료</p>
                <h3 className="mt-1 text-[1.55rem] font-black text-[#21452f]">별점 평가를 남겨 주세요</h3>
                <p className="mt-2 text-sm leading-6 text-[#647866]">
                  오늘의 미션이 아닌, 방금 완료한 챌린지에 대한 평가예요.
                </p>

                <div className="mt-5 space-y-5">
                  <div>
                    <p className="text-sm font-black text-[#47614d]">접근성</p>
                    <p className="mt-1 text-xs text-[#718274]">쉽게 참여하고 실천할 수 있었나요?</p>
                    <div className="mt-2">
                      <RatingPicker
                        value={challengeCompletionRating.accessibility}
                        onChange={(accessibility) =>
                          setChallengeCompletionRating((current) => ({ ...current, accessibility }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#47614d]">추천 정도</p>
                    <p className="mt-1 text-xs text-[#718274]">친구에게 추천하고 싶은 정도예요.</p>
                    <div className="mt-2">
                      <RatingPicker
                        value={challengeCompletionRating.recommendation}
                        onChange={(recommendation) =>
                          setChallengeCompletionRating((current) => ({ ...current, recommendation }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#47614d]">체감 난이도</p>
                    <p className="mt-1 text-xs text-[#718274]">별이 많을수록 어렵게 느낀 챌린지예요.</p>
                    <div className="mt-2">
                      <RatingPicker
                        value={challengeCompletionRating.difficulty}
                        onChange={(difficulty) =>
                          setChallengeCompletionRating((current) => ({ ...current, difficulty }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={submitChallengeCompletionRating}
                  disabled={
                    challengeCompletionRating.accessibility === 0 ||
                    challengeCompletionRating.recommendation === 0 ||
                    challengeCompletionRating.difficulty === 0
                  }
                  className="mt-6 w-full rounded-[0.8rem] bg-[#2a5d3b] px-5 py-4 text-base font-black text-white disabled:cursor-not-allowed disabled:bg-[#a9bea9]"
                >
                  평가 저장하기
                </button>
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
      const studentRanking = [...rankingUsers]
        .map((user) => ({ uid: user.uid, name: user.name, score: user.clearedDebt }))
        .sort((a, b) => b.score - a.score);
      const myClassRank = classRanking.findIndex((item) => item.className === myClassName) + 1;
      const myStudentRank = currentUser ? studentRanking.findIndex((item) => item.uid === currentUser.uid) + 1 : 0;

      return (
        <section className="ole-card space-y-4 p-6">
          <section className="rounded-[1rem] bg-[#245c37] p-6 text-white shadow-[0_8px_0_rgba(23,73,44,0.18)]">
            <h2 className="text-[2rem] font-black tracking-normal">랭킹</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[0.8rem] bg-white/12 p-4 ring-1 ring-white/20">
                <p className="text-sm font-bold text-white/75">반 순위</p>
                <p className="mt-2 text-3xl font-black text-white">#{myClassRank}</p>
              </div>
              <div className="rounded-[0.8rem] bg-white/12 p-4 ring-1 ring-white/20">
                <p className="text-sm font-bold text-white/75">개인 순위</p>
                <p className="mt-2 text-3xl font-black text-white">#{myStudentRank}</p>
              </div>
            </div>
          </section>

          <section className="ole-soft p-5">
            <p className="text-sm font-bold text-[#5d725e]">반 랭킹</p>
            <div className="mt-4 space-y-2">
              {classRanking.map((item, index) => (
                <div key={item.className} className={`flex items-center justify-between border-l-4 px-4 py-4 ${item.className === myClassName ? "border-[#2c6a41] bg-[#dff3cf]" : "border-[#d9e6c8] bg-[#fffef8]"}`}>
                  <p className="text-base font-black text-[#21452f]">{index + 1}. {item.className}</p>
                  <p className="text-base font-black text-[#2c6a41]">{item.score}점</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[0.95rem] bg-[#fff8e7] p-5">
            <p className="text-sm font-bold text-[#7d6731]">개인 랭킹</p>
            <div className="mt-4 space-y-2">
              {studentRanking.map((item, index) => (
                <div key={item.uid} className={`flex items-center justify-between border-l-4 px-4 py-4 ${item.uid === currentUser?.uid ? "border-[#94612b] bg-[#fff0bf]" : "border-[#ead99f] bg-[#fffef8]"}`}>
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
      <section className="ole-card space-y-5 p-6">
        <div>
          <p className="text-base font-bold text-[#66806b]">마이페이지</p>
          <h2 className="mt-1 text-[1.9rem] font-black tracking-normal text-[#203826]">내 활동 요약</h2>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[0.95rem] bg-[#f5faef] p-5">
            <p className="text-sm font-bold text-[#5f745f]">{hasEcoDebt ? "남은 빚" : "보유 EM"}</p>
            <p className="mt-2 text-[1.9rem] font-black text-[#21452f]">
              {(hasEcoDebt ? profile.ecoDebt : profile.ecoMoney).toLocaleString()} <span className="text-sm">EM</span>
            </p>
          </div>
          <div className="rounded-[0.95rem] bg-[#eef7ea] p-5">
            <p className="text-sm font-bold text-[#5f745f]">차감한 빚</p>
            <p className="mt-2 text-[1.9rem] font-black text-[#21452f]">
              {profile.clearedDebt.toLocaleString()} <span className="text-sm">EM</span>
            </p>
          </div>
          <div className="rounded-[0.95rem] bg-[#edf4ff] p-5">
            <p className="text-sm font-bold text-[#5f745f]">예상 탄소발자국 절감</p>
            <p className="mt-2 text-[1.9rem] font-black text-[#21452f]">
              {carbonFootprintSavedKg} <span className="text-sm">kg</span>
            </p>
          </div>
        </section>

        <section className="ole-card-flat p-5">
          <p className="text-sm font-bold text-[#5d725e]">기본 정보</p>
          <div className="mt-4 space-y-2 text-base text-[#627665]">
            <p>이름: {profile.name}</p>
            <p>학교/팀: {profile.school}</p>
            <p>완료한 미션 수: {completedMissionHistory.length}개</p>
            <p>완료한 챌린지 수: {completedChallengeHistory.length}개</p>
            <p>완료한 지도 활동 수: {completedMapActionHistory.length}개</p>
          </div>
        </section>

        <section className="ole-card-flat p-5">
          <p className="text-sm font-bold text-[#5d725e]">완료한 미션</p>
          <div className="mt-4 space-y-3">
            {completedMissionHistory.length > 0 ? (
              completedMissionHistory.map((mission) => (
                <div key={`${mission.id}-${mission.completedAt}`} className="border-l-4 border-[#8fcf66] bg-[#fffef8] px-4 py-4">
                  <p className="text-base font-black text-[#21452f]">{mission.title}</p>
                  <p className="mt-1 text-sm text-[#5d725e]">{mission.category} · {mission.reward} EM · {formatDateLabel(mission.completedAt)}</p>
                </div>
              ))
            ) : (
              <div className="border-l-4 border-[#d9e6c8] bg-[#fffef8] px-4 py-4 text-base text-[#5d725e]">아직 완료한 미션이 없어요.</div>
            )}
          </div>
        </section>

        <section className="ole-card-flat p-5">
          <p className="text-sm font-bold text-[#5d725e]">완료한 지도 활동</p>
          <div className="mt-4 space-y-3">
            {completedMapActionHistory.length > 0 ? (
              completedMapActionHistory.map((action) => (
                <div
                  key={`${action.placeId}-${action.action}-${action.completedAt}`}
                  className="border-l-4 border-[#8fcf66] bg-[#fffef8] px-4 py-4"
                >
                  <p className="text-base font-black text-[#21452f]">{action.placeName}</p>
                  <p className="mt-1 text-sm text-[#5d725e]">
                    {getMapActionLabel(action.action)} · {action.reward} EM · {formatDateLabel(action.completedAt)}
                  </p>
                </div>
              ))
            ) : (
              <div className="border-l-4 border-[#d9e6c8] bg-[#fffef8] px-4 py-4 text-base text-[#5d725e]">
                아직 완료한 지도 활동이 없어요.
              </div>
            )}
          </div>
        </section>

        <section className="ole-card-flat p-5">
          <p className="text-sm font-bold text-[#5d725e]">완료한 챌린지</p>
          <div className="mt-4 space-y-3">
            {completedChallengeHistory.length > 0 ? (
              completedChallengeHistory.map((challenge) => (
                <div key={`${challenge.id}-${challenge.completedAt}`} className="border-l-4 border-[#8fcf66] bg-[#fffef8] px-4 py-4">
                  <p className="text-base font-black text-[#21452f]">{challenge.title}</p>
                  <p className="mt-1 text-sm text-[#5d725e]">{challenge.reward} EM · {formatDateLabel(challenge.completedAt)}</p>
                </div>
              ))
            ) : (
              <div className="border-l-4 border-[#d9e6c8] bg-[#fffef8] px-4 py-4 text-base text-[#5d725e]">아직 완료한 챌린지가 없어요.</div>
            )}
          </div>
        </section>
      </section>
    );
  };

  if (!hasHydrated) {
    return (
      <main className="min-h-dvh w-full overflow-x-hidden px-3 py-4 text-[#1f3526] sm:px-4 sm:py-6">
        <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-[430px] items-center sm:min-h-[calc(100dvh-3rem)]">
          <section className="ole-card w-full overflow-hidden p-5 sm:p-8">
            <p className="text-base font-bold text-[#55735d]">Our Little Earth</p>
            <h1 className="mt-2 text-[2rem] font-black leading-tight text-[#183522]">불러오는 중</h1>
            <p className="mt-3 text-base leading-7 text-[#5a7460]">저장된 활동을 확인하고 있어요.</p>
          </section>
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="min-h-dvh w-full overflow-x-hidden px-3 py-4 text-[#1f3526] sm:px-4 sm:py-6">
        <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-[430px] items-center sm:min-h-[calc(100dvh-3rem)]">
        <AuthScreen
            mode={authMode}
            form={loginForm}
            signupAnswers={signupAnswers}
            notice={authNotice}
            rememberLogin={rememberLogin}
            onChange={handleAuthChange}
            onRememberLoginChange={handleRememberLoginChange}
            onSignupAnswerChange={handleSignupAnswerChange}
            onSwitchMode={setAuthMode}
            onSubmit={handleAuthSubmit}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh w-full overflow-x-hidden px-3 pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-4 text-[#1f3526] sm:px-4 sm:pt-6">
      <div className="mx-auto max-w-[430px]">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-base font-bold text-[#68806d]">Our Little Earth</p>
          <button onClick={handleLogout} className="rounded-full bg-white px-5 py-3 text-sm font-black text-[#6a7f6d] shadow-[0_8px_24px_rgba(65,91,62,0.10)]">
            로그아웃
          </button>
        </div>

        {renderContent()}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-5 rounded-[0.9rem] border border-[#deead7] bg-[#fffef8]/95 p-1.5 shadow-[0_8px_0_rgba(44,106,65,0.10),0_14px_36px_rgba(45,79,56,0.14)] backdrop-blur">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-12 rounded-[0.85rem] px-1 py-3 text-[0.78rem] font-black transition min-[390px]:text-sm ${
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
