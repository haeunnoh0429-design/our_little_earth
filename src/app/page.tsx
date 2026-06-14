"use client";

import Image from "next/image";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { KakaoMapSection } from "@/components/map/kakao-map-section";
import { mockDailyMissions } from "@/lib/mock-daily-missions";
import type { DailyMission } from "@/types/mission";

type TabId = "home" | "map" | "mission" | "challenge" | "ranking" | "mypage";
type AuthMode = "login" | "signup";

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
  likes: number;
};

type ChallengeDayProof = {
  day: number;
  photoName: string;
  review: string;
  submitted: boolean;
  open: boolean;
};

type Challenge = {
  id: string;
  title: string;
  creator: string;
  description: string;
  participants: number;
  reward: number;
  durationDays: number;
  hotReviews: ChallengeReview[];
  joined: boolean;
  completed: boolean;
  progressOpen: boolean;
  proofDays: ChallengeDayProof[];
};

type ChallengeDraft = {
  title: string;
  description: string;
  durationDays: string;
  reward: string;
};

type UserProfile = {
  name: string;
  school: string;
  ecoDebt: number;
  clearedDebt: number;
};

const DEFAULT_PROFILE: UserProfile = {
  name: "지구 탐험가",
  school: "우리반 초록 지구단",
  ecoDebt: 3200,
  clearedDebt: 0,
};

const TAB_ITEMS: Array<{ id: Exclude<TabId, "home">; label: string }> = [
  { id: "map", label: "지도" },
  { id: "mission", label: "미션" },
  { id: "challenge", label: "챌린지" },
  { id: "ranking", label: "랭킹" },
  { id: "mypage", label: "마이" },
];

const gradeOptions = [1, 2, 3];
const classOptions = Array.from({ length: 10 }, (_, index) => index + 1);
const registeredUsersStorageKey = "ole-registered-users";
const maxDailyMissionCount = 3;
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

function createProofDays(durationDays: number): ChallengeDayProof[] {
  return Array.from({ length: durationDays }, (_, index) => ({
    day: index + 1,
    photoName: "",
    review: "",
    submitted: false,
    open: false,
  }));
}

function createFreshChallengeState(challenge: Challenge): Challenge {
  return {
    ...challenge,
    joined: false,
    completed: false,
    progressOpen: false,
    proofDays: createProofDays(challenge.durationDays),
  };
}

const initialChallenges: Challenge[] = [
  {
    id: "challenge-1",
    title: "우리 학교 플로깅 챌린지",
    creator: "2학년 3반 박지우",
    description: "등교나 하교 길에 쓰레기 3개 이상 줍고 사진과 후기를 남기는 챌린지예요.",
    participants: 18,
    reward: 120,
    durationDays: 1,
    hotReviews: [
      { id: "review-1", author: "이서준", text: "운동도 되고 길이 깨끗해져서 좋았어요.", likes: 14 },
      { id: "review-2", author: "최서연", text: "하교길 친구랑 같이 해서 더 재밌었어요.", likes: 9 },
    ],
    joined: false,
    completed: false,
    progressOpen: false,
    proofDays: createProofDays(1),
  },
  {
    id: "challenge-2",
    title: "일주일 물 절약 챌린지",
    creator: "3학년 2반 김하늘",
    description: "7일 동안 매일 물 절약 사진과 후기를 인증하면서 습관을 만드는 챌린지예요.",
    participants: 24,
    reward: 150,
    durationDays: 7,
    hotReviews: [
      { id: "review-3", author: "김하늘", text: "일주일 하니까 진짜 습관이 생기기 시작했어요.", likes: 22 },
      { id: "review-4", author: "박지우", text: "매일 인증하니까 친구들이랑 서로 응원하게 돼요.", likes: 17 },
    ],
    joined: false,
    completed: false,
    progressOpen: false,
    proofDays: [
      { day: 1, photoName: "day1-water.jpg", review: "양치컵을 사용했어요.", submitted: true, open: false },
      { day: 2, photoName: "day2-water.jpg", review: "샤워 시간을 5분으로 줄였어요.", submitted: true, open: false },
      { day: 3, photoName: "", review: "", submitted: false, open: true },
      { day: 4, photoName: "", review: "", submitted: false, open: false },
      { day: 5, photoName: "", review: "", submitted: false, open: false },
      { day: 6, photoName: "", review: "", submitted: false, open: false },
      { day: 7, photoName: "", review: "", submitted: false, open: false },
    ],
  },
  {
    id: "challenge-3",
    title: "우리 반 분리배출 인증전",
    creator: "1학년 5반 최서연",
    description: "분리배출을 올바르게 한 사진과 짧은 후기를 올려 함께 점수를 쌓아요.",
    participants: 11,
    reward: 90,
    durationDays: 1,
    hotReviews: [
      { id: "review-5", author: "김도윤", text: "생각보다 헷갈렸는데 해보니 금방 익숙해졌어요.", likes: 11 },
      { id: "review-6", author: "정유나", text: "사진을 찍어 올리니 더 꼼꼼하게 하게 돼요.", likes: 8 },
    ],
    joined: false,
    completed: false,
    progressOpen: false,
    proofDays: createProofDays(1),
  },
];

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
    return JSON.parse(savedProfile) as UserProfile;
  } catch {
    return DEFAULT_PROFILE;
  }
}

function readStoredMission(userKey: string | null) {
  if (typeof window === "undefined" || !userKey) {
    return [] as DailyMission[];
  }

  const savedMission = window.localStorage.getItem(`ole-selected-mission-${userKey}`);

  if (!savedMission) {
    return [] as DailyMission[];
  }

  try {
    const parsed = JSON.parse(savedMission) as DailyMission | DailyMission[];

    if (Array.isArray(parsed)) {
      return parsed.slice(0, maxDailyMissionCount);
    }

    return parsed ? [parsed] : [];
  } catch {
    return [] as DailyMission[];
  }
}

function readStoredCompletedMissionIds(userKey: string | null) {
  if (typeof window === "undefined" || !userKey) {
    return [] as string[];
  }

  const savedCompletedMissionIds = window.localStorage.getItem(
    `ole-completed-mission-ids-${userKey}`,
  );

  if (!savedCompletedMissionIds) {
    return [] as string[];
  }

  try {
    return JSON.parse(savedCompletedMissionIds) as string[];
  } catch {
    return [] as string[];
  }
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
    <section className="overflow-hidden rounded-[2rem] bg-white shadow-[0_18px_50px_rgba(60,98,67,0.12)]">
      <div className="bg-[linear-gradient(135deg,#dff6df_0%,#f6ffe8_52%,#d9f0ff_100%)] p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="max-w-[15rem]">
            <p className="text-sm font-bold text-[#55735d]">Our Little Earth</p>
            <h1 className="mt-2 text-[2rem] font-black tracking-[-0.05em] text-[#183522]">
              {mode === "signup" ? "회원가입하고 시작하기" : "로그인하고 이어가기"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#5a7460]">
              학년, 반, 이름으로 계정을 구분해요. 학생 팀 프로젝트용으로 가볍게
              시작할 수 있게 만들었어요.
            </p>
          </div>
          <div className="relative h-28 w-28 shrink-0">
            <Image
              src="/earth-character.svg"
              alt="귀여운 지구 캐릭터"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 p-6">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-[#26412d]">학년</span>
          <select
            value={form.grade}
            onChange={(event) => onChange("grade", event.target.value)}
            className="w-full rounded-[1.2rem] border border-[#dbe7d7] bg-white px-4 py-3 text-sm text-[#1f3526]"
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
          <span className="mb-2 block text-sm font-bold text-[#26412d]">반</span>
          <select
            value={form.classRoom}
            onChange={(event) => onChange("classRoom", event.target.value)}
            className="w-full rounded-[1.2rem] border border-[#dbe7d7] bg-white px-4 py-3 text-sm text-[#1f3526]"
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
          <span className="mb-2 block text-sm font-bold text-[#26412d]">이름</span>
          <input
            type="text"
            value={form.name}
            onChange={(event) => onChange("name", event.target.value)}
            placeholder="이름 입력"
            className="w-full rounded-[1.2rem] border border-[#dbe7d7] bg-white px-4 py-3 text-sm text-[#1f3526]"
            required
          />
        </label>

        {mode === "signup" ? (
          <div className="space-y-4 rounded-[1.4rem] bg-[#f7fbf3] p-4">
            <div>
              <p className="text-sm font-black text-[#26412d]">초기 빚 설정</p>
              <p className="mt-1 text-sm leading-6 text-[#5a7460]">
                아래 생활 습관 질문으로 시작할 때의 지구 빚을 정해요.
              </p>
            </div>

            {signupQuestions.map((question) => (
              <label key={question.key} className="block">
                <span className="mb-2 block text-sm font-bold leading-6 text-[#26412d]">
                  {question.question}
                </span>
                <select
                  value={signupAnswers[question.key] === null ? "" : String(signupAnswers[question.key])}
                  onChange={(event) =>
                    onSignupAnswerChange(question.key, Number(event.target.value))
                  }
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

            <div className="rounded-[1.2rem] bg-white px-4 py-3 text-sm font-black text-[#2a5d3b]">
              현재 설정된 초기 빚: {calculateInitialDebt(signupAnswers).toLocaleString()} 에코머니
            </div>
          </div>
        ) : null}

        {notice ? (
          <p className="rounded-[1.2rem] bg-[#edf7ea] px-4 py-3 text-sm font-bold text-[#2a5d3b]">
            {notice}
          </p>
        ) : null}

        <button
          type="submit"
          className="w-full rounded-[1.2rem] bg-[#2a5d3b] px-4 py-3 text-sm font-black text-white"
        >
          {mode === "signup" ? "회원가입" : "로그인"}
        </button>

        <button
          type="button"
          onClick={() => onSwitchMode(mode === "signup" ? "login" : "signup")}
          className="w-full rounded-[1.2rem] border border-[#dbe7d7] bg-white px-4 py-3 text-sm font-black text-[#24482f]"
        >
          {mode === "signup" ? "로그인으로 돌아가기" : "회원가입하기"}
        </button>
      </form>
    </section>
  );
}

function ProofDayCard({
  dayProof,
  onOpen,
  onPhotoChange,
  onReviewChange,
  onSubmit,
}: {
  dayProof: ChallengeDayProof;
  onOpen: () => void;
  onPhotoChange: (photoName: string) => void;
  onReviewChange: (review: string) => void;
  onSubmit: () => void;
}) {
  const canSubmit = dayProof.photoName.trim() !== "" && dayProof.review.trim() !== "";

  return (
    <div className="rounded-[1.2rem] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#21452f]">Day {dayProof.day}</p>
          <p className="mt-1 text-xs text-[#5d725e]">
            {dayProof.submitted ? "사진과 후기가 제출됐어요." : "오늘 인증을 제출해 보세요."}
          </p>
        </div>
        {dayProof.submitted ? (
          <span className="rounded-full bg-[#2c6a41] px-3 py-1 text-xs font-black text-white">
            완료
          </span>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            className="rounded-full bg-[#e9f4de] px-3 py-1 text-xs font-black text-[#2c6a41]"
          >
            인증하기
          </button>
        )}
      </div>

      {dayProof.submitted ? (
        <div className="mt-3 text-sm text-[#5d725e]">
          <p>사진: {dayProof.photoName}</p>
          <p className="mt-1">후기: {dayProof.review}</p>
        </div>
      ) : null}

      {dayProof.open && !dayProof.submitted ? (
        <div className="mt-4 rounded-[1.2rem] bg-[#f8faf2] p-4">
          <label className="block">
            <span className="mb-2 block text-xs font-black text-[#47614d]">사진 올리기</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => onPhotoChange(event.target.files?.[0]?.name ?? "")}
              className="block w-full text-sm text-[#47614d] file:mr-3 file:rounded-full file:border-0 file:bg-[#e8f4dc] file:px-3 file:py-2 file:text-xs file:font-black file:text-[#2c6a41]"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-xs font-black text-[#47614d]">간단한 후기</span>
            <textarea
              value={dayProof.review}
              onChange={(event) => onReviewChange(event.target.value)}
              placeholder="오늘 실천한 내용을 짧게 적어 보세요."
              className="min-h-24 w-full rounded-2xl border border-[#d5e5c9] bg-white px-4 py-3 text-sm text-[#1f3828] outline-none transition placeholder:text-[#8ca08f] focus:border-[#69a85c] focus:ring-4 focus:ring-[#dff1d4]"
            />
          </label>

          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="mt-4 w-full rounded-2xl bg-[#2c6a41] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-[#a9bea9]"
          >
            사진과 후기 제출하고 완료하기
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function HomePage() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authNotice, setAuthNotice] = useState("");
  const [loginForm, setLoginForm] = useState<LoginForm>({
    grade: "",
    classRoom: "",
    name: "",
  });
  const [signupAnswers, setSignupAnswers] = useState<SignupAnswers>(createEmptySignupAnswers());
  const [registeredUsers, setRegisteredUsers] =
    useState<RegisteredUser[]>(readRegisteredUsers);
  const [currentUser, setCurrentUser] =
    useState<RegisteredUser | null>(readStoredSessionUser);
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [profile, setProfile] = useState<UserProfile>(() => {
    const user = readStoredSessionUser();
    return readStoredProfile(user ? getIdentityKey(user) : null);
  });
  const [selectedMissions, setSelectedMissions] = useState<DailyMission[]>(() => {
    const user = readStoredSessionUser();
    return readStoredMission(user ? getIdentityKey(user) : null);
  });
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>(() => {
    const user = readStoredSessionUser();
    return readStoredCompletedMissionIds(user ? getIdentityKey(user) : null);
  });
  const [challenges, setChallenges] = useState<Challenge[]>(() =>
    initialChallenges.map(createFreshChallengeState),
  );
  const [challengeDraft, setChallengeDraft] = useState<ChallengeDraft>({
    title: "",
    description: "",
    durationDays: "",
    reward: "",
  });

  const isLoggedIn = currentUser !== null;
  const currentUserKey = currentUser ? getIdentityKey(currentUser) : null;

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

    if (selectedMissions.length > 0) {
      window.localStorage.setItem(
        `ole-selected-mission-${currentUserKey}`,
        JSON.stringify(selectedMissions),
      );
      return;
    }

    window.localStorage.removeItem(`ole-selected-mission-${currentUserKey}`);
  }, [currentUserKey, selectedMissions]);

  useEffect(() => {
    if (!currentUserKey) {
      return;
    }

    window.localStorage.setItem(
      `ole-completed-mission-ids-${currentUserKey}`,
      JSON.stringify(completedMissionIds),
    );
  }, [completedMissionIds, currentUserKey]);

  useEffect(() => {
    window.localStorage.setItem(registeredUsersStorageKey, JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    if (!currentUser) {
      window.localStorage.removeItem("ole-session-user");
      return;
    }

    window.localStorage.setItem("ole-session-user", JSON.stringify(currentUser));
  }, [currentUser]);

  const availableMissions = useMemo(
    () =>
      mockDailyMissions.filter(
        (mission) =>
          !completedMissionIds.includes(mission.id) &&
          !selectedMissions.some((selectedMission) => selectedMission.id === mission.id),
      ),
    [completedMissionIds, selectedMissions],
  );
  const selectedMission = selectedMissions[0] ?? null;

  const completionRate = Math.min(
    100,
    Math.round((profile.clearedDebt / DEFAULT_PROFILE.ecoDebt) * 100),
  );
  const completedChallenges = challenges.filter((challenge) => challenge.completed).length;
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
    setLoginForm((current) => ({
      ...current,
      [field]: value,
    }));
    setAuthNotice("");
  };

  const handleSignupAnswerChange = (field: keyof SignupAnswers, value: number) => {
    setSignupAnswers((current) => ({
      ...current,
      [field]: value,
    }));
    setAuthNotice("");
  };

  const loadUserState = (user: RegisteredUser) => {
    const userKey = getIdentityKey(user);
    const storedProfile = readStoredProfile(userKey);

    setCurrentUser(user);
    setProfile({
      ...storedProfile,
      name: user.name,
      ecoDebt: storedProfile.ecoDebt || user.initialDebt,
      school:
        storedProfile.school === DEFAULT_PROFILE.school
          ? `${user.grade}학년 ${user.classRoom}반`
          : storedProfile.school,
    });
    setSelectedMissions(readStoredMission(userKey));
    setCompletedMissionIds(readStoredCompletedMissionIds(userKey));
    setActiveTab("home");
  };

  const handleAuthSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedUser = normalizeIdentity(loginForm);
    const existingUser = registeredUsers.find(
      (user) => getIdentityKey(user) === getIdentityKey(normalizedUser),
    );

    if (authMode === "signup") {
      if (existingUser) {
        loadUserState(existingUser);
        setAuthNotice("이미 가입된 사용자라서 바로 로그인했어요.");
        return;
      }

      const initialDebt = calculateInitialDebt(signupAnswers);
      const nextUser: RegisteredUser = {
        ...normalizedUser,
        initialDebt,
      };
      setRegisteredUsers((current) => [...current, nextUser]);
      setCurrentUser(nextUser);
      setProfile({
        name: nextUser.name,
        school: `${nextUser.grade}학년 ${nextUser.classRoom}반`,
        ecoDebt: initialDebt,
        clearedDebt: 0,
      });
      setSelectedMissions([]);
      setCompletedMissionIds([]);
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
    setSelectedMissions([]);
    setCompletedMissionIds([]);
    setProfile(DEFAULT_PROFILE);
    setLoginForm({
      grade: "",
      classRoom: "",
      name: "",
    });
    setSignupAnswers(createEmptySignupAnswers());
    setAuthNotice("로그아웃됐어요. 다시 로그인해 주세요.");
  };

  const drawMission = () => {
    if (selectedMissions.length >= maxDailyMissionCount || availableMissions.length === 0) {
      return;
    }

    const nextMission =
      availableMissions[Math.floor(Math.random() * availableMissions.length)];
    setSelectedMissions((current) => [...current, nextMission]);
  };

  const completeMission = (missionId: string) => {
    const completedMission = selectedMissions.find((mission) => mission.id === missionId);

    if (!completedMission) {
      return;
    }

    setCompletedMissionIds((current) =>
      current.includes(completedMission.id) ? current : [...current, completedMission.id],
    );

    setProfile((current) => {
      const nextClearedDebt = Math.min(
        DEFAULT_PROFILE.ecoDebt,
        current.clearedDebt + completedMission.ecoMoney,
      );

      return {
        ...current,
        clearedDebt: nextClearedDebt,
        ecoDebt: Math.max(0, DEFAULT_PROFILE.ecoDebt - nextClearedDebt),
      };
    });

    setSelectedMissions((current) => current.filter((mission) => mission.id !== missionId));
  };

  const completeSelectedMission = () => {
    if (!selectedMission) {
      return;
    }

    completeMission(selectedMission.id);
  };

  const handleDraftChange = (field: keyof ChallengeDraft, value: string) => {
    setChallengeDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleChallengeProgress = (challengeId: string) => {
    setChallenges((current) =>
      current.map((challenge) =>
        challenge.id === challengeId
          ? { ...challenge, progressOpen: !challenge.progressOpen }
          : challenge,
      ),
    );
  };

  const handleJoinChallenge = (challengeId: string) => {
    setChallenges((current) =>
      current.map((challenge) =>
        challenge.id === challengeId
          ? { ...challenge, joined: true, progressOpen: true, participants: challenge.participants + 1 }
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
              progressOpen: true,
              proofDays: challenge.proofDays.map((proofDay) => ({
                ...proofDay,
                open: proofDay.day === day ? !proofDay.open : false,
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

  const submitChallengeDayProof = (challengeId: string, day: number) => {
    setChallenges((current) =>
      current.map((challenge) => {
        if (challenge.id !== challengeId) {
          return challenge;
        }

        const updatedProofDays = challenge.proofDays.map((proofDay) =>
          proofDay.day === day && proofDay.photoName.trim() !== "" && proofDay.review.trim() !== ""
            ? { ...proofDay, submitted: true, open: false }
            : proofDay,
        );

        const allSubmitted = updatedProofDays.every((proofDay) => proofDay.submitted);

        return {
          ...challenge,
          joined: true,
          completed: allSubmitted,
          participants: challenge.joined ? challenge.participants : challenge.participants + 1,
          proofDays: updatedProofDays,
        };
      }),
    );
  };

  const handleCreateChallenge = () => {
    const durationDays = Number(challengeDraft.durationDays);
    const reward = Number(challengeDraft.reward);

    if (
      challengeDraft.title.trim() === "" ||
      challengeDraft.description.trim() === "" ||
      !Number.isFinite(durationDays) ||
      durationDays < 1 ||
      !Number.isFinite(reward) ||
      reward < 1
    ) {
      return;
    }

    const creator = currentUser
      ? `${currentUser.grade}학년 ${currentUser.classRoom}반 ${currentUser.name}`
      : profile.name;

    const newChallenge: Challenge = {
      id: `challenge-${Date.now()}`,
      title: challengeDraft.title.trim(),
      creator,
      description: challengeDraft.description.trim(),
      participants: 1,
      reward,
      durationDays,
      hotReviews: [],
      joined: false,
      completed: false,
      progressOpen: false,
      proofDays: createProofDays(durationDays),
    };

    setChallenges((current) => [newChallenge, ...current]);
    setChallengeDraft({
      title: "",
      description: "",
      durationDays: "",
      reward: "",
    });
  };

  const renderContent = () => {
    if (activeTab === "home") {
      return (
        <div className="space-y-5">
          <section className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#dff6df_0%,#f6ffe8_52%,#d9f0ff_100%)] p-6 shadow-[0_18px_50px_rgba(60,98,67,0.12)]">
            <div className="flex items-center justify-between gap-4">
              <div className="max-w-[15rem]">
                <p className="text-sm font-bold text-[#55735d]">{profile.school}</p>
                <h1 className="mt-2 text-[2rem] font-black tracking-[-0.05em] text-[#183522]">
                  {profile.name}의 작은 지구
                </h1>
                <p className="mt-3 text-sm leading-6 text-[#5a7460]">
                  오늘의 행동으로 남은 에코머니 빚을 조금씩 청산해 봐요.
                </p>
              </div>
              <div className="relative h-36 w-36 shrink-0">
                <Image
                  src="/earth-character.svg"
                  alt="귀여운 지구 캐릭터"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-[1.8rem] bg-white p-5 shadow-[0_12px_30px_rgba(65,91,62,0.08)]">
              <p className="text-sm font-bold text-[#66806b]">남은 에코머니 빚</p>
              <p className="mt-2 text-[2.4rem] font-black tracking-[-0.05em] text-[#1d3f28]">
                {profile.ecoDebt.toLocaleString()} EM
              </p>
              <p className="mt-2 text-sm text-[#70806e]">
                미션을 성공하면 포인트가 쌓이는 대신 빚이 줄어들어요.
              </p>
            </article>

            <article className="rounded-[1.8rem] bg-white p-5 shadow-[0_12px_30px_rgba(65,91,62,0.08)]">
              <p className="text-sm font-bold text-[#66806b]">청산한 에코머니</p>
              <p className="mt-2 text-[2.4rem] font-black tracking-[-0.05em] text-[#1d3f28]">
                {profile.clearedDebt.toLocaleString()} EM
              </p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#e5f0df]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#4aa35e_0%,#8fd36f_100%)]"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-[#70806e]">전체 청산률 {completionRate}%</p>
            </article>
          </section>

          <section className="rounded-[1.8rem] bg-white p-5 shadow-[0_12px_30px_rgba(65,91,62,0.08)]">
            <p className="text-sm font-bold text-[#66806b]">빠른 이동</p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-[#1e3826]">
              오늘은 어디부터 시작할까요?
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <button
                onClick={() => setActiveTab("map")}
                className="rounded-[1.4rem] bg-[#edf7ea] px-4 py-4 text-left"
              >
                <p className="text-base font-black text-[#24482f]">지도 보기</p>
                <p className="mt-1 text-sm text-[#64806a]">가까운 친환경 장소 찾기</p>
              </button>
              <button
                onClick={() => setActiveTab("mission")}
                className="rounded-[1.4rem] bg-[#f8f6e8] px-4 py-4 text-left"
              >
                <p className="text-base font-black text-[#4f4723]">미션 확인</p>
                <p className="mt-1 text-sm text-[#7e7651]">오늘의 빚 청산 행동 뽑기</p>
              </button>
              <button
                onClick={() => setActiveTab("ranking")}
                className="rounded-[1.4rem] bg-[#edf4ff] px-4 py-4 text-left"
              >
                <p className="text-base font-black text-[#23425f]">랭킹 보기</p>
                <p className="mt-1 text-sm text-[#5f7690]">우리 반 순위 확인하기</p>
              </button>
            </div>
          </section>
        </div>
      );
    }

    if (activeTab === "map") {
      return <KakaoMapSection />;
    }

    if (activeTab === "mission") {
      return (
        <section className="space-y-4 rounded-[1.9rem] bg-white p-5 shadow-[0_12px_30px_rgba(65,91,62,0.08)]">
          <div>
            <p className="text-sm font-bold text-[#66806b]">오늘의 미션</p>
            <h2 className="mt-1 text-[1.8rem] font-black tracking-[-0.04em] text-[#203826]">
              에코머니 빚 청산하기
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#69806d]">
              미션을 완료하면 그만큼 남은 빚이 줄어들어요.
            </p>
          </div>

          {selectedMission ? (
            <article className="rounded-[1.6rem] bg-[#f3f8ee] p-5">
              <p className="text-sm font-bold text-[#53735c]">{selectedMission.category}</p>
              <h3 className="mt-2 text-xl font-black tracking-[-0.04em] text-[#1f3f27]">
                {selectedMission.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#627563]">
                {selectedMission.summary}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.2rem] bg-white px-4 py-3 text-sm text-[#46604c]">
                  청산 금액 {selectedMission.ecoMoney} EM
                </div>
                <div className="rounded-[1.2rem] bg-white px-4 py-3 text-sm text-[#46604c]">
                  예상 시간 {selectedMission.durationMinutes}분
                </div>
              </div>
              <button
                onClick={completeSelectedMission}
                className="mt-4 w-full rounded-[1.2rem] bg-[#2a5d3b] px-4 py-3 text-sm font-black text-white"
              >
                미션 완료하고 빚 청산하기
              </button>
            </article>
          ) : (
            <div className="rounded-[1.6rem] bg-[#f7fbf3] p-5 text-sm leading-6 text-[#667d6b]">
              아직 뽑은 미션이 없어요. 아래 버튼으로 오늘의 미션을 받아보세요.
            </div>
          )}

          <button
            onClick={drawMission}
            disabled={selectedMissions.length >= maxDailyMissionCount || availableMissions.length === 0}
            className="w-full rounded-[1.2rem] bg-[#d8eece] px-4 py-3 text-sm font-black text-[#23442b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {availableMissions.length === 0
              ? "완료 가능한 미션이 없어요"
              : selectedMission
                ? "현재 미션 진행 중"
                : "오늘의 미션 뽑기"}
          </button>
        </section>
      );
    }

    if (activeTab === "challenge") {
      const activeChallenges = challenges.filter((challenge) => challenge.joined && !challenge.completed);
      const otherChallenges = challenges.filter((challenge) => !challenge.completed && !challenge.joined);

      return (
        <section className="space-y-4 rounded-[1.9rem] bg-white p-5 shadow-[0_12px_30px_rgba(65,91,62,0.08)]">
          <section className="rounded-[1.6rem] bg-[linear-gradient(135deg,#e5f7c7_0%,#d8efff_100%)] p-5">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#4d7b50]">
              Challenge
            </p>
            <h2 className="mt-3 text-[2rem] font-black tracking-[-0.05em] text-[#21452f]">
              챌린지
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#456754]">
              후기와 좋아요를 보고 바로 참여할 수 있고, 장기 챌린지는 매일 사진과 후기를 인증해야 합니다.
            </p>
          </section>

          <section className="rounded-[1.5rem] bg-[#f8fbf4] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#5d725e]">새 챌린지 만들기</p>
                <h3 className="mt-1 text-xl font-black text-[#21452f]">친구들이 참여할 활동 제안하기</h3>
              </div>
              <button
                type="button"
                onClick={handleCreateChallenge}
                className="rounded-full bg-[#2c6a41] px-4 py-2 text-sm font-black text-white"
              >
                챌린지 만들기
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <input
                value={challengeDraft.title}
                onChange={(event) => handleDraftChange("title", event.target.value)}
                placeholder="챌린지 이름"
                className="rounded-2xl border border-[#d5e5c9] bg-white px-4 py-3 text-sm text-[#1f3828]"
              />
              <textarea
                value={challengeDraft.description}
                onChange={(event) => handleDraftChange("description", event.target.value)}
                placeholder="챌린지 설명"
                className="min-h-24 rounded-2xl border border-[#d5e5c9] bg-white px-4 py-3 text-sm text-[#1f3828]"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={challengeDraft.durationDays}
                  onChange={(event) => handleDraftChange("durationDays", event.target.value)}
                  placeholder="기간(일)"
                  inputMode="numeric"
                  className="rounded-2xl border border-[#d5e5c9] bg-white px-4 py-3 text-sm text-[#1f3828]"
                />
                <input
                  value={challengeDraft.reward}
                  onChange={(event) => handleDraftChange("reward", event.target.value)}
                  placeholder="갚을 에코머니"
                  inputMode="numeric"
                  className="rounded-2xl border border-[#d5e5c9] bg-white px-4 py-3 text-sm text-[#1f3828]"
                />
              </div>
            </div>
          </section>

          {activeChallenges.length > 0 ? (
            <section className="rounded-[1.5rem] bg-[#f3f8ea] p-5">
              <p className="text-xs font-bold text-[#5d725e]">참여 중인 챌린지</p>
              <div className="mt-4 space-y-3">
                {activeChallenges.map((challenge) => {
                  const completedDays = challenge.proofDays.filter((day) => day.submitted).length;

                  return (
                    <article key={challenge.id} className="rounded-[1.3rem] bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-black text-[#21452f]">{challenge.title}</p>
                          <p className="mt-1 text-sm text-[#5d725e]">
                            {completedDays}/{challenge.durationDays}일 인증 완료
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleChallengeProgress(challenge.id)}
                          className="rounded-full bg-[#2c6a41] px-3 py-2 text-xs font-black text-white"
                        >
                          {challenge.progressOpen ? "접기" : "열기"}
                        </button>
                      </div>

                      {challenge.progressOpen ? (
                        <div className="mt-4 space-y-3">
                          {challenge.proofDays.map((dayProof) => (
                            <ProofDayCard
                              key={dayProof.day}
                              dayProof={dayProof}
                              onOpen={() => openChallengeDayProof(challenge.id, dayProof.day)}
                              onPhotoChange={(photoName) =>
                                updateChallengeDayPhoto(challenge.id, dayProof.day, photoName)
                              }
                              onReviewChange={(review) =>
                                updateChallengeDayReview(challenge.id, dayProof.day, review)
                              }
                              onSubmit={() => submitChallengeDayProof(challenge.id, dayProof.day)}
                            />
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          {activeChallenges.length === 0 ? (
            <section className="rounded-[1.5rem] bg-[#f3f8ea] p-5">
              <p className="text-xs font-bold text-[#5d725e]">李몄뿬 以묒씤 梨뚮┛吏</p>
              <div className="mt-4 rounded-[1.2rem] bg-white p-4 text-sm text-[#5d725e]">
                아직 참여한 챌린지가 없어요.
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            {otherChallenges.map((challenge) => (
              <article key={challenge.id} className="rounded-[1.6rem] bg-[#f8fbf4] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-black text-[#21452f]">{challenge.title}</p>
                    <p className="mt-1 text-xs font-bold text-[#6b7d6b]">만든 사람: {challenge.creator}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                      <span className="rounded-full bg-white px-3 py-1 text-[#2c6a41]">
                        참여자 {challenge.participants}명
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-[#8b6422]">
                        {challenge.durationDays}일 챌린지
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-[#8b6422]">
                        완료 보상 {challenge.reward}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleChallengeProgress(challenge.id)}
                    className="rounded-full bg-white px-4 py-2 text-xs font-black text-[#2c6a41]"
                  >
                    {challenge.progressOpen ? "접기" : "자세히 보기"}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleChallengeProgress(challenge.id)}
                    className="hidden rounded-full bg-[#2c6a41] px-4 py-2 text-xs font-black text-white"
                  >
                    {challenge.joined ? "계속하기" : "참여하기"}
                  </button>
                </div>

                {challenge.progressOpen ? (
                <div className="mt-4 rounded-[1.2rem] bg-white p-4">
                  <p className="text-sm leading-6 text-[#5d725e]">{challenge.description}</p>
                  <button
                    type="button"
                    onClick={() => handleJoinChallenge(challenge.id)}
                    className="mt-4 rounded-full bg-[#2c6a41] px-4 py-2 text-xs font-black text-white"
                  >
                    참여하기
                  </button>
                  <p className="text-xs font-black text-[#5d725e]">핫한 후기</p>
                  <div className="mt-3 space-y-3">
                    {challenge.hotReviews.map((review) => (
                      <div key={review.id} className="rounded-[1rem] bg-[#f8fbf4] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-[#21452f]">{review.author}</p>
                          <button
                            type="button"
                            onClick={() => likeChallengeReview(challenge.id, review.id)}
                            className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#2c6a41]"
                          >
                            좋아요 {review.likes}
                          </button>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[#5d725e]">{review.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
                ) : null}
              </article>
            ))}
          </section>
        </section>
      );
    }

    if (activeTab === "ranking") {
      const myClassName = currentUser
        ? `${currentUser.grade}학년 ${currentUser.classRoom}반`
        : profile.school;
      const classScoreMap = rankingUsers.reduce<Record<string, number>>((scores, user) => {
        scores[user.className] = (scores[user.className] ?? 0) + user.clearedDebt;
        return scores;
      }, {});
      const classRanking = Object.entries(classScoreMap)
        .map(([className, score]) => ({ className, score }))
        .sort((a, b) => b.score - a.score);
      const studentRanking = [...rankingUsers]
        .map((user) => ({ name: user.name, score: user.clearedDebt }))
        .sort((a, b) => b.score - a.score);
      const myClassRank = classRanking.findIndex((item) => item.className === myClassName) + 1;
      const myStudentRank = studentRanking.findIndex((item) => item.name === profile.name) + 1;

      return (
        <section className="space-y-4 rounded-[1.9rem] bg-white p-5 shadow-[0_12px_30px_rgba(65,91,62,0.08)]">
          <section className="rounded-[1.7rem] bg-[linear-gradient(145deg,#205f3d_0%,#2f7b4d_48%,#9ad36f_100%)] p-5 text-white">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-white/70">
              Ranking
            </p>
            <h2 className="mt-3 text-[2rem] font-black tracking-[-0.05em]">
              우리 반과 내 순위
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[1.3rem] bg-white/15 p-4">
                <p className="text-xs font-bold text-white/70">반 순위</p>
                <p className="mt-2 text-3xl font-black">#{myClassRank}</p>
              </div>
              <div className="rounded-[1.3rem] bg-white/15 p-4">
                <p className="text-xs font-bold text-white/70">개인 순위</p>
                <p className="mt-2 text-3xl font-black">#{myStudentRank}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[1.5rem] bg-[#f4f9ee] p-5">
            <p className="text-xs font-bold text-[#5d725e]">반 랭킹</p>
            <div className="mt-4 space-y-2">
              {classRanking.map((item, index) => (
                <div
                  key={item.className}
                  className={`flex items-center justify-between rounded-[1.2rem] px-4 py-3 ${
                    item.className === myClassName ? "bg-[#dff3cf]" : "bg-white"
                  }`}
                >
                  <p className="font-black text-[#21452f]">
                    {index + 1}. {item.className}
                  </p>
                  <p className="text-sm font-black text-[#2c6a41]">{item.score}점</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.5rem] bg-[#fff8e7] p-5">
            <p className="text-xs font-bold text-[#7d6731]">개인 랭킹</p>
            <div className="mt-4 space-y-2">
              {studentRanking.map((item, index) => (
                <div
                  key={item.name}
                  className={`flex items-center justify-between rounded-[1.2rem] px-4 py-3 ${
                    item.name === profile.name ? "bg-[#fff0bf]" : "bg-white"
                  }`}
                >
                  <p className="font-black text-[#46391a]">
                    {index + 1}. {item.name}
                  </p>
                  <p className="text-sm font-black text-[#94612b]">{item.score}점</p>
                </div>
              ))}
            </div>
          </section>
        </section>
      );
    }

    return (
      <section className="rounded-[1.9rem] bg-white p-5 shadow-[0_12px_30px_rgba(65,91,62,0.08)]">
        <p className="text-sm font-bold text-[#66806b]">마이페이지</p>
        <h2 className="mt-1 text-[1.8rem] font-black tracking-[-0.04em] text-[#203826]">
          내 활동 요약
        </h2>
        <div className="mt-4 space-y-3 text-sm text-[#627665]">
          <p>이름: {profile.name}</p>
          <p>학교/팀: {profile.school}</p>
          <p>완료한 미션 수: {completedMissionIds.length}개</p>
          <p>완료한 챌린지 수: {completedChallenges}개</p>
          <p>남은 빚: {profile.ecoDebt.toLocaleString()} EM</p>
        </div>
      </section>
    );
  };

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ef_0%,#edf7ff_100%)] px-4 py-6 text-[#1f3526]">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl items-center">
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ef_0%,#edf7ff_100%)] px-4 pb-28 pt-6 text-[#1f3526]">
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-bold text-[#68806d]">Our Little Earth</p>
          <div className="flex items-center gap-2">
            {activeTab !== "home" ? (
              <button
                onClick={() => setActiveTab("home")}
                className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#23432c] shadow-[0_8px_24px_rgba(65,91,62,0.10)]"
              >
                홈
              </button>
            ) : null}
            <button
              onClick={handleLogout}
              className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#6a7f6d] shadow-[0_8px_24px_rgba(65,91,62,0.10)]"
            >
              로그아웃
            </button>
          </div>
        </div>

        {renderContent()}
      </div>

      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-xl px-4 pb-5">
        <div className="grid grid-cols-5 rounded-[1.8rem] border border-[#deead7] bg-white/95 p-2 shadow-[0_18px_45px_rgba(45,79,56,0.14)] backdrop-blur">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-[1.2rem] px-2 py-3 text-sm font-bold transition ${
                activeTab === tab.id
                  ? "bg-[#e4f3db] text-[#21422b]"
                  : "text-[#71836f]"
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
