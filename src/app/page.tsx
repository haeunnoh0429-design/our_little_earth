"use client";

import Image from "next/image";
import { type FormEvent, useEffect, useMemo, useState } from "react";

const gradeOptions = [1, 2, 3];
const classOptions = Array.from({ length: 10 }, (_, index) => index + 1);
const defaultTotalDebt = 3200;
const totalDebt = defaultTotalDebt;
const baseRepaidDebt = 1250;
const maxMissionCount = 5;
const registeredUsersStorageKey = "our-little-earth-registered-users";

const normalizeIdentity = (form: LoginForm) => ({
  grade: form.grade,
  classRoom: form.classRoom,
  name: form.name.trim(),
});

const isSameIdentity = (left: LoginForm, right: LoginForm) => {
  const normalizedLeft = normalizeIdentity(left);
  const normalizedRight = normalizeIdentity(right);

  return (
    normalizedLeft.grade === normalizedRight.grade &&
    normalizedLeft.classRoom === normalizedRight.classRoom &&
    normalizedLeft.name === normalizedRight.name
  );
};

function readRegisteredUsers(): RegisteredUser[] {
  if (typeof window === "undefined") {
    return [];
  }

  const storedValue = window.localStorage.getItem(registeredUsersStorageKey);

  if (!storedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(storedValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter((user): user is RegisteredUser => {
      if (typeof user !== "object" || user === null) {
        return false;
      }

      const record = user as Partial<RegisteredUser>;

      return (
        typeof record.grade === "string" &&
        typeof record.classRoom === "string" &&
        typeof record.name === "string" &&
        typeof record.initialDebt === "number" &&
        typeof record.createdAt === "string"
      );
    });
  } catch {
    return [];
  }
}

function saveRegisteredUsers(users: RegisteredUser[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(registeredUsersStorageKey, JSON.stringify(users));
  } catch {
    // Ignore storage errors so auth still works in restricted browsers.
  }
}

type LoginForm = {
  grade: string;
  classRoom: string;
  name: string;
};

type AuthMode = "login" | "signup";

type RegisteredUser = LoginForm & {
  initialDebt: number;
  createdAt: string;
};

type AuthNotice = {
  type: "error" | "success";
  message: string;
} | null;

type SignupAnswers = {
  transport: number | null;
  delivery: number | null;
  tumbler: number | null;
  recycle: number | null;
  plastic: number | null;
  unplug: number | null;
};

type DailyCheckin = {
  showerMinutes: string;
  petBottleCount: string;
  carMinutes: string;
  open: boolean;
  submitted: boolean;
  submittedDate: string;
  addedDebt: number;
};

type BottomTab = "home" | "mission" | "challenge" | "ranking" | "mypage";

type Mission = {
  id: string;
  title: string;
  description: string;
  ecoReward: number;
  debtReduction: number;
  difficulty: string;
  completed: boolean;
  proofOpen: boolean;
  photoName: string;
  review: string;
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

type SignupQuestion = {
  key: keyof SignupAnswers;
  question: string;
  options: { label: string; value: number }[];
};

const initialMissions: Mission[] = [
  {
    id: "mission-1",
    title: "텀블러 사용하기",
    description: "오늘 음료를 마실 때 일회용 컵 대신 텀블러를 사용해보세요.",
    ecoReward: 40,
    debtReduction: 120,
    difficulty: "쉬움",
    completed: false,
    proofOpen: false,
    photoName: "",
    review: "",
  },
  {
    id: "mission-2",
    title: "급식 잔반 남기지 않기",
    description: "먹을 만큼만 받고 식판을 깨끗하게 비워보세요.",
    ecoReward: 80,
    debtReduction: 180,
    difficulty: "보통",
    completed: false,
    proofOpen: false,
    photoName: "",
    review: "",
  },
  {
    id: "mission-3",
    title: "교실 불 끄기 확인",
    description: "쉬는 시간이나 하교 전에 불과 전자기기를 다시 확인해보세요.",
    ecoReward: 50,
    debtReduction: 140,
    difficulty: "쉬움",
    completed: true,
    proofOpen: false,
    photoName: "lights-check.jpg",
    review: "하교 전에 교실 불과 화면을 모두 끄고 사진을 남겼어요.",
  },
];

const missionPool: Mission[] = [
  ...initialMissions,
  {
    id: "mission-4",
    title: "급식 잔반 줄이기",
    description: "먹을 만큼만 받고 남기지 않은 식판 사진과 후기를 남겨보세요.",
    ecoReward: 60,
    debtReduction: 150,
    difficulty: "보통",
    completed: false,
    proofOpen: false,
    photoName: "",
    review: "",
  },
  {
    id: "mission-5",
    title: "교실 종이 재사용",
    description: "이면지나 메모지를 다시 쓴 모습을 사진으로 인증해보세요.",
    ecoReward: 40,
    debtReduction: 110,
    difficulty: "쉬움",
    completed: false,
    proofOpen: false,
    photoName: "",
    review: "",
  },
  {
    id: "mission-6",
    title: "불필요한 전등 끄기",
    description: "사용하지 않는 조명이나 전자기기를 끄고 인증 사진을 남겨보세요.",
    ecoReward: 70,
    debtReduction: 160,
    difficulty: "보통",
    completed: false,
    proofOpen: false,
    photoName: "",
    review: "",
  },
  {
    id: "mission-7",
    title: "손수건 사용하기",
    description: "휴지 대신 손수건이나 개인 수건을 사용한 뒤 사진과 후기를 올려보세요.",
    ecoReward: 50,
    debtReduction: 130,
    difficulty: "쉬움",
    completed: false,
    proofOpen: false,
    photoName: "",
    review: "",
  },
];

const createProofDays = (durationDays: number): ChallengeDayProof[] =>
  Array.from({ length: durationDays }, (_, index) => ({
    day: index + 1,
    photoName: "",
    review: "",
    submitted: false,
    open: false,
  }));

const initialChallenges: Challenge[] = [
  {
    id: "challenge-1",
    title: "우리 학교 플로깅 챌린지",
    creator: "2학년 3반 박지우",
    description: "등교나 하교 길에 쓰레기 3개 이상 줍고 사진과 후기를 남기는 챌린지예요.",
    participants: 18,
    reward: 120,
    durationDays: 1,
    joined: false,
    completed: false,
    progressOpen: false,
    proofDays: createProofDays(1),
    hotReviews: [
      { id: "review-1", author: "이서준", text: "운동도 되고 길이 깨끗해져서 좋았어요.", likes: 14 },
      { id: "review-2", author: "최서연", text: "하교길 친구랑 같이 해서 더 재밌었어요.", likes: 9 },
    ],
  },
  {
    id: "challenge-2",
    title: "일주일 물 절약 챌린지",
    creator: "3학년 2반 김하늘",
    description: "7일 동안 매일 물 절약 사진과 후기를 인증하면서 습관을 만드는 챌린지예요.",
    participants: 24,
    reward: 150,
    durationDays: 7,
    joined: true,
    completed: false,
    progressOpen: true,
    proofDays: [
      { day: 1, photoName: "day1-water.jpg", review: "양치컵을 사용했어요.", submitted: true, open: false },
      { day: 2, photoName: "day2-water.jpg", review: "샤워 시간을 5분으로 줄였어요.", submitted: true, open: false },
      { day: 3, photoName: "", review: "", submitted: false, open: true },
      { day: 4, photoName: "", review: "", submitted: false, open: false },
      { day: 5, photoName: "", review: "", submitted: false, open: false },
      { day: 6, photoName: "", review: "", submitted: false, open: false },
      { day: 7, photoName: "", review: "", submitted: false, open: false },
    ],
    hotReviews: [
      { id: "review-3", author: "김하늘", text: "일주일 하니까 진짜 습관이 생기기 시작했어요.", likes: 22 },
      { id: "review-4", author: "박지우", text: "매일 인증하니까 친구들이랑 서로 응원하게 돼요.", likes: 17 },
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
    joined: false,
    completed: false,
    progressOpen: false,
    proofDays: createProofDays(1),
    hotReviews: [
      { id: "review-5", author: "김도윤", text: "생각보다 헷갈렸는데 해보니 금방 익숙해졌어요.", likes: 11 },
      { id: "review-6", author: "정유나", text: "사진을 찍어 올리니 더 꼼꼼하게 하게 돼요.", likes: 8 },
    ],
  },
];

const createFreshMissions = (missions: Mission[]): Mission[] =>
  missions.map((mission) => ({
    ...mission,
    completed: false,
    proofOpen: false,
    photoName: "",
    review: "",
  }));

const createFreshChallenges = (challenges: Challenge[]): Challenge[] =>
  challenges.map((challenge) => ({
    ...challenge,
    joined: false,
    completed: false,
    progressOpen: false,
    proofDays: challenge.proofDays.map((proofDay) => ({
      ...proofDay,
      photoName: "",
      review: "",
      submitted: false,
      open: false,
    })),
  }));

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

const classRankingBase = [
  { className: "3학년 2반", score: 1320 },
  { className: "3학년 4반", score: 1280 },
  { className: "3학년 1반", score: 1210 },
  { className: "2학년 3반", score: 1180 },
  { className: "1학년 5반", score: 1140 },
];

const studentRankingBase = [
  { name: "김하늘", score: 420 },
  { name: "박지우", score: 390 },
  { name: "이서준", score: 360 },
  { name: "최서연", score: 330 },
];

function LeafBadge() {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-white/85 shadow-[0_10px_30px_rgba(38,93,56,0.14)]">
      <div className="relative h-8 w-8">
        <div className="absolute left-1/2 top-1 h-6 w-4 -translate-x-1/2 rotate-[-14deg] rounded-full bg-[#6ccf7c]" />
        <div className="absolute left-[42%] top-2 h-6 w-4 rotate-[18deg] rounded-full bg-[#9be15d]" />
        <div className="absolute left-1/2 top-3 h-4 w-[2px] -translate-x-1/2 rounded-full bg-[#2f7b4d]" />
      </div>
    </div>
  );
}

function AngryEarthCharacter() {
  return (
    <div className="relative h-36 w-36 shrink-0">
      <Image
        src="/earth-character.svg"
        alt="화난 지구 캐릭터"
        fill
        sizes="144px"
        className="object-contain drop-shadow-[0_16px_28px_rgba(35,56,92,0.18)]"
      />
    </div>
  );
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
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

function calculateInitialDebt(answers: SignupAnswers): number {
  return Object.values(answers).reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

function drawMissionSet() {
  const shuffled = [...missionPool]
    .sort(() => Math.random() - 0.5)
    .slice(0, maxMissionCount);

  return createFreshMissions(shuffled);
}

function SelectField({
  id,
  label,
  placeholder,
  options,
  value,
  onChange,
}: {
  id: keyof LoginForm;
  label: string;
  placeholder: string;
  options: number[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-bold text-[#2b5a3b]">{label}</span>
      <div className="relative">
        <select
          id={id}
          name={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-2xl border border-[#d5e5c9] bg-white px-4 py-3.5 text-base font-medium text-[#1f3828] outline-none transition focus:border-[#69a85c] focus:ring-4 focus:ring-[#dff1d4]"
          required
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option} value={String(option)}>
              {option}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#5d7b62]">
          ▼
        </span>
      </div>
    </label>
  );
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: SignupQuestion;
  value: number | null;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold leading-6 text-[#2b5a3b]">
        {question.question}
      </span>
      <div className="relative">
        <select
          value={value === null ? "" : String(value)}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full appearance-none rounded-2xl border border-[#d5e5c9] bg-white px-4 py-3.5 text-sm font-medium text-[#1f3828] outline-none transition focus:border-[#69a85c] focus:ring-4 focus:ring-[#dff1d4]"
          required
        >
          <option value="" disabled>
            선택해 주세요
          </option>
          {question.options.map((option) => (
            <option key={`${question.key}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

function LoginScreen({
  mode,
  form,
  signupAnswers,
  onChange,
  onSignupAnswerChange,
  onSubmit,
  onSwitchMode,
}: {
  mode: AuthMode;
  form: LoginForm;
  signupAnswers: SignupAnswers;
  onChange: (field: keyof LoginForm, value: string) => void;
  onSignupAnswerChange: (field: keyof SignupAnswers, value: number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSwitchMode: (mode: AuthMode) => void;
}) {
  void mode;
  void signupAnswers;
  void onSignupAnswerChange;
  void onSwitchMode;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/78 shadow-[0_24px_60px_rgba(62,104,57,0.16)] backdrop-blur">
      <div className="bg-[linear-gradient(135deg,#dff6b9_0%,#bdebc2_45%,#c7efff_100%)] px-6 pb-8 pt-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#4d7b50]">
              Our Little Earth
            </p>
            <h1 className="mt-3 text-[2rem] font-black leading-[1.08] tracking-[-0.05em] text-[#21452f]">
              우리 반 지구 영웅,
              <br />
              함께 시작해요
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#456754]">
              학년, 반, 이름을 입력하고 오늘의 친환경 활동을 시작해보세요.
            </p>
          </div>
          <LeafBadge />
        </div>
      </div>

      <div className="px-6 py-6">
        <form className="space-y-4" onSubmit={onSubmit}>
          <SelectField
            id="grade"
            label="학년"
            placeholder="학년을 선택하세요"
            options={gradeOptions}
            value={form.grade}
            onChange={(value) => onChange("grade", value)}
          />

          <SelectField
            id="classRoom"
            label="반"
            placeholder="반을 선택하세요"
            options={classOptions}
            value={form.classRoom}
            onChange={(value) => onChange("classRoom", value)}
          />

          <label htmlFor="name" className="block">
            <span className="mb-2 block text-sm font-bold text-[#2b5a3b]">이름</span>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={(event) => onChange("name", event.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full rounded-2xl border border-[#d5e5c9] bg-white px-4 py-3.5 text-base font-medium text-[#1f3828] outline-none transition placeholder:text-[#8ca08f] focus:border-[#69a85c] focus:ring-4 focus:ring-[#dff1d4]"
              required
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-2xl bg-[#2c6a41] px-4 py-3.5 text-base font-black text-white shadow-[0_14px_32px_rgba(44,106,65,0.26)]"
          >
            로그인하고 시작하기
          </button>
        </form>
      </div>
    </section>
  );
}

void LoginScreen;

function AuthScreen({
  mode,
  form,
  signupAnswers,
  notice,
  onChange,
  onSignupAnswerChange,
  onSubmit,
  onSwitchMode,
}: {
  mode: AuthMode;
  form: LoginForm;
  signupAnswers: SignupAnswers;
  notice: AuthNotice;
  onChange: (field: keyof LoginForm, value: string) => void;
  onSignupAnswerChange: (field: keyof SignupAnswers, value: number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSwitchMode: (mode: AuthMode) => void;
}) {
  const isSignup = mode === "signup";

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/78 shadow-[0_24px_60px_rgba(62,104,57,0.16)] backdrop-blur">
      <div className="bg-[linear-gradient(135deg,#dff6b9_0%,#bdebc2_45%,#c7efff_100%)] px-6 pb-8 pt-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#4d7b50]">
              Our Little Earth
            </p>
            <h1 className="mt-3 text-[2rem] font-black leading-[1.08] tracking-[-0.05em] text-[#21452f]">
              우리 반 지구 빚,
              <br />
              함께 줄여요
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#456754]">
              {isSignup
                ? "가입할 때 생활 습관을 설정하면 초기 지구 빚이 바로 정해져요."
                : "학년, 반, 이름을 입력하고 오늘의 환경 미션을 시작해보세요."}
            </p>
          </div>
          <LeafBadge />
        </div>
      </div>

      <div className="px-6 py-6">
        <form className="space-y-4" onSubmit={onSubmit}>
          <SelectField
            id="grade"
            label="학년"
            placeholder="학년을 선택해 주세요"
            options={gradeOptions}
            value={form.grade}
            onChange={(value) => onChange("grade", value)}
          />

          <SelectField
            id="classRoom"
            label="반"
            placeholder="반을 선택해 주세요"
            options={classOptions}
            value={form.classRoom}
            onChange={(value) => onChange("classRoom", value)}
          />

          <label htmlFor="name" className="block">
            <span className="mb-2 block text-sm font-bold text-[#2b5a3b]">이름</span>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={(event) => onChange("name", event.target.value)}
              placeholder="이름을 입력해 주세요"
              className="w-full rounded-2xl border border-[#d5e5c9] bg-white px-4 py-3.5 text-base font-medium text-[#1f3828] outline-none transition placeholder:text-[#8ca08f] focus:border-[#69a85c] focus:ring-4 focus:ring-[#dff1d4]"
              required
            />
          </label>

          {isSignup ? (
            <div className="space-y-4 rounded-[1.6rem] bg-[#f7fbef] p-4">
              <div>
                <p className="text-sm font-black text-[#21452f]">초기 빚 설정</p>
                <p className="mt-1 text-xs leading-5 text-[#5d725e]">
                  아래 질문에 답하면 시작할 때의 지구 빚이 계산돼요.
                </p>
              </div>

              {signupQuestions.map((question) => (
                <QuestionField
                  key={question.key}
                  question={question}
                  value={signupAnswers[question.key]}
                  onChange={(value) => onSignupAnswerChange(question.key, value)}
                />
              ))}

              <div className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#2c6a41]">
                현재 설정된 초기 빚: {calculateInitialDebt(signupAnswers).toLocaleString()} 에코머니
              </div>
            </div>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-2xl bg-[#2c6a41] px-4 py-3.5 text-base font-black text-white shadow-[0_14px_32px_rgba(44,106,65,0.26)]"
          >
            {isSignup ? "가입하고 시작하기" : "로그인하고 시작하기"}
          </button>

          {notice ? (
            <p
              className={`rounded-2xl px-4 py-3 text-sm font-bold ${
                notice.type === "error"
                  ? "bg-[#fff1f1] text-[#b13a3a]"
                  : "bg-[#edf8e8] text-[#2c6a41]"
              }`}
            >
              {notice.message}
            </p>
          ) : null}

          {isSignup ? (
            <button
              type="button"
              onClick={() => onSwitchMode("login")}
              className="w-full rounded-2xl border border-[#d6e3cd] bg-white px-4 py-3.5 text-base font-black text-[#5d725e]"
            >
              로그인으로 돌아가기
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSwitchMode("signup")}
              className="w-full rounded-2xl border border-[#d6e3cd] bg-white px-4 py-3.5 text-base font-black text-[#2c6a41]"
            >
              가입하기
            </button>
          )}
        </form>
      </div>
    </section>
  );
}

function BottomBar({
  activeTab,
  onChange,
}: {
  activeTab: BottomTab;
  onChange: (tab: BottomTab) => void;
}) {
  const tabs: { key: BottomTab; label: string }[] = [
    { key: "home", label: "홈" },
    { key: "mission", label: "미션" },
    { key: "challenge", label: "챌린지" },
    { key: "ranking", label: "랭킹" },
    { key: "mypage", label: "내 정보" },
  ];

  return (
    <div className="sticky bottom-0 mt-5 rounded-[1.8rem] border border-white/70 bg-white/85 p-2 shadow-[0_18px_36px_rgba(48,83,50,0.12)] backdrop-blur">
      <div className="grid grid-cols-5 gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`rounded-[1.1rem] px-2 py-3 text-[11px] font-black transition ${
              activeTab === tab.key
                ? "bg-[#2c6a41] text-white"
                : "bg-transparent text-[#65806a]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
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
            {dayProof.submitted ? "사진과 후기가 제출되었어요." : "오늘 인증을 제출해보세요."}
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
            인증 열기
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

          {dayProof.photoName ? (
            <p className="mt-2 text-xs font-bold text-[#5d725e]">선택한 사진: {dayProof.photoName}</p>
          ) : null}

          <label className="mt-4 block">
            <span className="mb-2 block text-xs font-black text-[#47614d]">간단한 후기</span>
            <textarea
              value={dayProof.review}
              onChange={(event) => onReviewChange(event.target.value)}
              placeholder="오늘 어떻게 실천했는지 적어주세요."
              className="min-h-24 w-full rounded-2xl border border-[#d5e5c9] bg-white px-4 py-3 text-sm text-[#1f3828] outline-none transition placeholder:text-[#8ca08f] focus:border-[#69a85c] focus:ring-4 focus:ring-[#dff1d4]"
            />
          </label>

          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="mt-4 w-full rounded-2xl bg-[#2c6a41] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-[#a9bea9]"
          >
            오늘 인증 제출하기
          </button>
        </div>
      ) : null}
    </div>
  );
}

function HomeScreen({
  form,
  remainingDebt,
  debtProgress,
  completedMissionCount,
  totalMissionCount,
  completedChallengeCount,
  repaidEcoMoney,
  checkin,
  activeTab,
  onChangeTab,
  onToggleCheckin,
  onCheckinChange,
  onSubmitCheckin,
}: {
  form: LoginForm;
  remainingDebt: number;
  debtProgress: number;
  completedMissionCount: number;
  totalMissionCount: number;
  completedChallengeCount: number;
  repaidEcoMoney: number;
  checkin: DailyCheckin;
  activeTab: BottomTab;
  onChangeTab: (tab: BottomTab) => void;
  onToggleCheckin: () => void;
  onCheckinChange: (
    field: "showerMinutes" | "petBottleCount" | "carMinutes",
    value: string,
  ) => void;
  onSubmitCheckin: () => void;
}) {
  const hasCheckedInToday = checkin.submittedDate === getTodayKey();
  const missionProgress =
    totalMissionCount === 0
      ? 0
      : Math.round((completedMissionCount / totalMissionCount) * 100);

  return (
    <>
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_24px_60px_rgba(62,104,57,0.16)] backdrop-blur">
        <div className="bg-[linear-gradient(135deg,#d8f6b5_0%,#c6f0cb_45%,#eefbd8_100%)] px-6 pb-8 pt-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#4d7b50]">
                Home
              </p>
              <h1 className="mt-3 text-[2rem] font-black leading-[1.08] tracking-[-0.05em] text-[#21452f]">
                {form.name}님,
                <br />
                화난 지구를 달래줘요
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#456754]">
                여기서 갚은 에코머니와 갚은 빚은 같은 뜻이에요. 미션과 챌린지를 완료할수록
                화난 지구의 빚을 같이 갚게 됩니다.
              </p>
            </div>
            <AngryEarthCharacter />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[1.4rem] bg-white/65 p-4">
              <p className="text-xs font-bold text-[#5d725e]">내 학급</p>
              <p className="mt-2 text-2xl font-black text-[#21452f]">
                {form.grade}학년 {form.classRoom}반
              </p>
            </div>
            <div className="rounded-[1.4rem] bg-white/65 p-4">
              <p className="text-xs font-bold text-[#5d725e]">누적 갚은 빚 = 갚은 에코머니</p>
              <p className="mt-2 text-2xl font-black text-[#21452f]">
                {repaidEcoMoney.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-6">
          <section className="rounded-[1.7rem] bg-[#295c3a] p-5 text-white shadow-[0_14px_32px_rgba(41,92,58,0.2)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white/75">남은 지구 빚</p>
                <p className="mt-2 text-4xl font-black">{remainingDebt.toLocaleString()}</p>
              </div>
              <div className="rounded-full bg-white/16 px-3 py-2 text-xs font-black text-white">
                {debtProgress}% 상환
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-white/75">
                <span>전체 빚 {totalDebt.toLocaleString()}</span>
                <span>갚은 빚(=갚은 에코머니) {repaidEcoMoney.toLocaleString()}</span>
              </div>
              <div className="h-3 rounded-full bg-white/20">
                <div
                  className="h-3 rounded-full bg-[linear-gradient(90deg,#f9d65b_0%,#7fe27f_100%)]"
                  style={{ width: `${Math.min(debtProgress, 100)}%` }}
                />
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-white/80">
              미션과 챌린지는 사진과 후기를 제출해야만 빚 상환으로 인정돼요.
            </p>
          </section>

          <section className="rounded-[1.5rem] bg-[#f3f8ea] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#5d725e]">오늘의 진행 바</p>
                <h2 className="mt-1 text-xl font-black text-[#21452f]">
                  오늘 목표 {totalMissionCount}개 중 {completedMissionCount}개 완료
                </h2>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#2c6a41]">
                {missionProgress}%
              </span>
            </div>

            <div className="mt-4 h-3 rounded-full bg-[#dbe8cf]">
              <div
                className="h-3 rounded-full bg-[linear-gradient(90deg,#7fd55a_0%,#2c6a41_100%)]"
                style={{ width: `${missionProgress}%` }}
              />
            </div>

            <p className="mt-3 text-sm leading-6 text-[#5d725e]">
              완료한 챌린지 {completedChallengeCount}개가 랭킹 점수와 빚 상환에 반영됩니다.
            </p>
          </section>

          <section className="rounded-[1.5rem] bg-[#eef6ff] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#5f6f83]">오늘 체크인</p>
                <h2 className="mt-1 text-xl font-black text-[#21452f]">
                  오늘 생활로 다시 쌓인 빚 확인하기
                </h2>
              </div>
              <button
                type="button"
                onClick={onToggleCheckin}
                disabled={checkin.submitted}
                className="rounded-full bg-[#2c6a41] px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-[#9bb1a0]"
              >
                {checkin.submitted ? "오늘 체크인 완료" : checkin.open ? "닫기" : "체크인"}
              </button>
            </div>

            <p className="mt-3 text-sm leading-6 text-[#5f6f83]">
              샤워는 10분을 넘긴 시간만 1분당 3, 페트병은 1병당 5, 차는 1분당 2 에코머니의
              빚이 다시 쌓여요.
            </p>

            {hasCheckedInToday ? (
              <p className="mt-3 text-xs font-black text-[#21452f]">
                오늘 체크인은 이미 제출했어요. 내일 다시 체크인할 수 있어요.
              </p>
            ) : null}

            {checkin.submitted ? (
              <div className="mt-4 rounded-[1.2rem] bg-white px-4 py-3 text-sm text-[#516277]">
                <p>샤워 {checkin.showerMinutes || "0"}분</p>
                <p className="mt-1">페트병 {checkin.petBottleCount || "0"}병</p>
                <p className="mt-1">차 {checkin.carMinutes || "0"}분</p>
                <p className="mt-2 font-black text-[#21452f]">
                  오늘 다시 쌓인 빚: {checkin.addedDebt.toLocaleString()}
                </p>
              </div>
            ) : null}

            {hasCheckedInToday ? (
              <p className="mt-3 text-xs font-black text-[#21452f]">
                오늘 체크인은 이미 제출했어요. 내일 다시 체크인할 수 있어요.
              </p>
            ) : null}

            {checkin.open && !hasCheckedInToday ? (
              <div className="mt-4 grid gap-3">
                <input
                  value={checkin.showerMinutes}
                  onChange={(event) => onCheckinChange("showerMinutes", event.target.value)}
                  inputMode="numeric"
                  placeholder="오늘 샤워한 시간(분)"
                  className="rounded-2xl border border-[#d5e5c9] bg-white px-4 py-3 text-sm text-[#1f3828] outline-none transition placeholder:text-[#8ca08f] focus:border-[#69a85c] focus:ring-4 focus:ring-[#dff1d4]"
                />
                <input
                  value={checkin.petBottleCount}
                  onChange={(event) => onCheckinChange("petBottleCount", event.target.value)}
                  inputMode="numeric"
                  placeholder="오늘 사용한 페트병 수"
                  className="rounded-2xl border border-[#d5e5c9] bg-white px-4 py-3 text-sm text-[#1f3828] outline-none transition placeholder:text-[#8ca08f] focus:border-[#69a85c] focus:ring-4 focus:ring-[#dff1d4]"
                />
                <input
                  value={checkin.carMinutes}
                  onChange={(event) => onCheckinChange("carMinutes", event.target.value)}
                  inputMode="numeric"
                  placeholder="오늘 차를 탄 시간(분)"
                  className="rounded-2xl border border-[#d5e5c9] bg-white px-4 py-3 text-sm text-[#1f3828] outline-none transition placeholder:text-[#8ca08f] focus:border-[#69a85c] focus:ring-4 focus:ring-[#dff1d4]"
                />
                <button
                  type="button"
                  onClick={onSubmitCheckin}
                  className="rounded-2xl bg-[#214f73] px-4 py-3 text-sm font-black text-white"
                >
                  오늘 체크인 제출하기
                </button>
              </div>
            ) : null}
          </section>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onChangeTab("mission")}
              className="rounded-[1.4rem] bg-[#fff8e3] px-4 py-4 text-left"
            >
              <p className="text-xs font-bold text-[#7d6731]">미션 인증</p>
              <p className="mt-2 text-lg font-black text-[#46391a]">사진과 후기로 제출하기</p>
            </button>

            <button
              type="button"
              onClick={() => onChangeTab("challenge")}
              className="rounded-[1.4rem] bg-[#eef6ff] px-4 py-4 text-left"
            >
              <p className="text-xs font-bold text-[#5f6f83]">핫한 챌린지</p>
              <p className="mt-2 text-lg font-black text-[#21452f]">후기 보고 바로 참여하기</p>
            </button>
          </div>
        </div>
      </section>

      <BottomBar activeTab={activeTab} onChange={onChangeTab} />
    </>
  );
}

void HomeScreen;

function SimpleHomeScreen({
  form,
  remainingDebt,
  debtProgress,
  completedMissionCount,
  totalMissionCount,
  repaidEcoMoney,
  checkin,
  activeTab,
  onChangeTab,
  onToggleCheckin,
  onCheckinChange,
  onSubmitCheckin,
}: {
  form: LoginForm;
  remainingDebt: number;
  debtProgress: number;
  completedMissionCount: number;
  totalMissionCount: number;
  completedChallengeCount: number;
  repaidEcoMoney: number;
  checkin: DailyCheckin;
  activeTab: BottomTab;
  onChangeTab: (tab: BottomTab) => void;
  onToggleCheckin: () => void;
  onCheckinChange: (
    field: "showerMinutes" | "petBottleCount" | "carMinutes",
    value: string,
  ) => void;
  onSubmitCheckin: () => void;
}) {
  const hasCheckedInToday = checkin.submittedDate === getTodayKey();
  const missionProgress =
    totalMissionCount === 0
      ? 0
      : Math.round((completedMissionCount / totalMissionCount) * 100);

  return (
    <>
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_24px_60px_rgba(62,104,57,0.16)] backdrop-blur">
        <div className="bg-[linear-gradient(135deg,#d8f6b5_0%,#c6f0cb_45%,#eefbd8_100%)] px-6 pb-8 pt-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#4d7b50]">
                Home
              </p>
              <h1 className="mt-3 text-[2rem] font-black leading-[1.08] tracking-[-0.05em] text-[#21452f]">
                {form.name}님,
                <br />
                안녕하세요
              </h1>
            </div>
            <AngryEarthCharacter />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[1.4rem] bg-white/65 p-4">
              <p className="text-xs font-bold text-[#5d725e]">학급</p>
              <p className="mt-2 text-2xl font-black text-[#21452f]">
                {form.grade}학년 {form.classRoom}반
              </p>
            </div>
            <div className="rounded-[1.4rem] bg-white/65 p-4">
              <p className="text-xs font-bold text-[#5d725e]">누적 에코머니</p>
              <p className="mt-2 text-2xl font-black text-[#21452f]">
                {repaidEcoMoney.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-6">
          <section className="rounded-[1.7rem] bg-[#295c3a] p-5 text-white shadow-[0_14px_32px_rgba(41,92,58,0.2)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white/75">남은 지구 빚</p>
                <p className="mt-2 text-4xl font-black">{remainingDebt.toLocaleString()}</p>
              </div>
              <div className="rounded-full bg-white/16 px-3 py-2 text-xs font-black text-white">
                {debtProgress}% 상환
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-white/75">
                <span>전체 빚 {totalDebt.toLocaleString()}</span>
                <span>상환 {repaidEcoMoney.toLocaleString()}</span>
              </div>
              <div className="h-3 rounded-full bg-white/20">
                <div
                  className="h-3 rounded-full bg-[linear-gradient(90deg,#f9d65b_0%,#7fe27f_100%)]"
                  style={{ width: `${Math.min(debtProgress, 100)}%` }}
                />
              </div>
            </div>
          </section>

          <section className="rounded-[1.5rem] bg-[#f3f8ea] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#5d725e]">오늘 진행</p>
                <h2 className="mt-1 text-xl font-black text-[#21452f]">
                  {completedMissionCount}/{totalMissionCount} 완료
                </h2>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#2c6a41]">
                {missionProgress}%
              </span>
            </div>

            <div className="mt-4 h-3 rounded-full bg-[#dbe8cf]">
              <div
                className="h-3 rounded-full bg-[linear-gradient(90deg,#7fd55a_0%,#2c6a41_100%)]"
                style={{ width: `${missionProgress}%` }}
              />
            </div>
          </section>

          <section className="rounded-[1.5rem] bg-[#eef6ff] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#5f6f83]">오늘 체크인</p>
                <h2 className="mt-1 text-xl font-black text-[#21452f]">다시 쌓인 빚 확인</h2>
              </div>
              <button
                type="button"
                onClick={onToggleCheckin}
                disabled={hasCheckedInToday}
                className="rounded-full bg-[#2c6a41] px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-[#9bb1a0]"
              >
                {checkin.open ? "닫기" : "체크인"}
              </button>
            </div>

            {checkin.submitted ? (
              <div className="mt-4 rounded-[1.2rem] bg-white px-4 py-3 text-sm text-[#516277]">
                <p>샤워 {checkin.showerMinutes || "0"}분</p>
                <p className="mt-1">페트병 {checkin.petBottleCount || "0"}개</p>
                <p className="mt-1">차 {checkin.carMinutes || "0"}분</p>
                <p className="mt-2 font-black text-[#21452f]">
                  오늘 다시 쌓인 빚 {checkin.addedDebt.toLocaleString()}
                </p>
              </div>
            ) : null}

            {checkin.open ? (
              <div className="mt-4 grid gap-3">
                <input
                  value={checkin.showerMinutes}
                  onChange={(event) => onCheckinChange("showerMinutes", event.target.value)}
                  inputMode="numeric"
                  placeholder="오늘 샤워한 시간(분)"
                  className="rounded-2xl border border-[#d5e5c9] bg-white px-4 py-3 text-sm text-[#1f3828] outline-none transition placeholder:text-[#8ca08f] focus:border-[#69a85c] focus:ring-4 focus:ring-[#dff1d4]"
                />
                <input
                  value={checkin.petBottleCount}
                  onChange={(event) => onCheckinChange("petBottleCount", event.target.value)}
                  inputMode="numeric"
                  placeholder="오늘 사용한 페트병 수"
                  className="rounded-2xl border border-[#d5e5c9] bg-white px-4 py-3 text-sm text-[#1f3828] outline-none transition placeholder:text-[#8ca08f] focus:border-[#69a85c] focus:ring-4 focus:ring-[#dff1d4]"
                />
                <input
                  value={checkin.carMinutes}
                  onChange={(event) => onCheckinChange("carMinutes", event.target.value)}
                  inputMode="numeric"
                  placeholder="오늘 차를 탄 시간(분)"
                  className="rounded-2xl border border-[#d5e5c9] bg-white px-4 py-3 text-sm text-[#1f3828] outline-none transition placeholder:text-[#8ca08f] focus:border-[#69a85c] focus:ring-4 focus:ring-[#dff1d4]"
                />
                <button
                  type="button"
                  onClick={onSubmitCheckin}
                  className="rounded-2xl bg-[#214f73] px-4 py-3 text-sm font-black text-white"
                >
                  오늘 체크인 제출하기
                </button>
              </div>
            ) : null}
          </section>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onChangeTab("mission")}
              className="rounded-[1.4rem] bg-[#fff8e3] px-4 py-4 text-left"
            >
              <p className="text-xs font-bold text-[#7d6731]">미션</p>
              <p className="mt-2 text-lg font-black text-[#46391a]">인증하러 가기</p>
            </button>

            <button
              type="button"
              onClick={() => onChangeTab("challenge")}
              className="rounded-[1.4rem] bg-[#eef6ff] px-4 py-4 text-left"
            >
              <p className="text-xs font-bold text-[#5f6f83]">챌린지</p>
              <p className="mt-2 text-lg font-black text-[#21452f]">참여하러 가기</p>
            </button>
          </div>
        </div>
      </section>

      <BottomBar activeTab={activeTab} onChange={onChangeTab} />
    </>
  );
}

void SimpleHomeScreen;

function TrimmedHomeScreen({
  form,
  remainingDebt,
  totalDebtAmount,
  debtProgress,
  completedMissionCount,
  totalMissionCount,
  repaidEcoMoney,
  checkin,
  activeTab,
  onChangeTab,
  onToggleCheckin,
  onCheckinChange,
  onSubmitCheckin,
}: {
  form: LoginForm;
  remainingDebt: number;
  totalDebtAmount: number;
  debtProgress: number;
  completedMissionCount: number;
  totalMissionCount: number;
  completedChallengeCount: number;
  repaidEcoMoney: number;
  checkin: DailyCheckin;
  activeTab: BottomTab;
  onChangeTab: (tab: BottomTab) => void;
  onToggleCheckin: () => void;
  onCheckinChange: (
    field: "showerMinutes" | "petBottleCount" | "carMinutes",
    value: string,
  ) => void;
  onSubmitCheckin: () => void;
}) {
  void totalDebtAmount;

  const hasCheckedInToday = checkin.submittedDate === getTodayKey();
  const missionProgress =
    totalMissionCount === 0
      ? 0
      : Math.round((completedMissionCount / totalMissionCount) * 100);

  return (
    <>
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_24px_60px_rgba(62,104,57,0.16)] backdrop-blur">
        <div className="bg-[linear-gradient(135deg,#d8f6b5_0%,#c6f0cb_45%,#eefbd8_100%)] px-6 pb-8 pt-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#4d7b50]">
                Home
              </p>
              <h1 className="mt-3 text-[2rem] font-black leading-[1.08] tracking-[-0.05em] text-[#21452f]">
                {form.name}님,
                <br />
                안녕하세요
              </h1>
            </div>
            <AngryEarthCharacter />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[1.4rem] bg-white/65 p-4">
              <p className="text-xs font-bold text-[#5d725e]">학급</p>
              <p className="mt-2 text-2xl font-black text-[#21452f]">
                {form.grade}학년 {form.classRoom}반
              </p>
            </div>
            <div className="rounded-[1.4rem] bg-white/65 p-4">
              <p className="text-xs font-bold text-[#5d725e]">누적 에코머니</p>
              <p className="mt-2 text-2xl font-black text-[#21452f]">
                {repaidEcoMoney.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-6">
          <section className="rounded-[1.7rem] bg-[#295c3a] p-5 text-white shadow-[0_14px_32px_rgba(41,92,58,0.2)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white/75">남은 지구 빚</p>
                <p className="mt-2 text-4xl font-black">{remainingDebt.toLocaleString()}</p>
              </div>
              <div className="rounded-full bg-white/16 px-3 py-2 text-xs font-black text-white">
                {debtProgress}% 상환
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-white/75">
                <span>전체 빚 {totalDebt.toLocaleString()}</span>
                <span>상환 {repaidEcoMoney.toLocaleString()}</span>
              </div>
              <div className="h-3 rounded-full bg-white/20">
                <div
                  className="h-3 rounded-full bg-[linear-gradient(90deg,#f9d65b_0%,#7fe27f_100%)]"
                  style={{ width: `${Math.min(debtProgress, 100)}%` }}
                />
              </div>
            </div>
          </section>

          <section className="rounded-[1.5rem] bg-[#f3f8ea] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#5d725e]">오늘 진행</p>
                <h2 className="mt-1 text-xl font-black text-[#21452f]">
                  {completedMissionCount}/{totalMissionCount} 완료
                </h2>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#2c6a41]">
                {missionProgress}%
              </span>
            </div>

            <div className="mt-4 h-3 rounded-full bg-[#dbe8cf]">
              <div
                className="h-3 rounded-full bg-[linear-gradient(90deg,#7fd55a_0%,#2c6a41_100%)]"
                style={{ width: `${missionProgress}%` }}
              />
            </div>
          </section>

          <section className="rounded-[1.5rem] bg-[#eef6ff] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#5f6f83]">오늘 체크인</p>
                <h2 className="mt-1 text-xl font-black text-[#21452f]">다시 쌓인 빚 확인</h2>
              </div>
              <button
                type="button"
                onClick={onToggleCheckin}
                disabled={hasCheckedInToday}
                className="rounded-full bg-[#2c6a41] px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-[#9bb1a0]"
              >
                {checkin.open ? "닫기" : "체크인"}
              </button>
            </div>

            {checkin.submitted ? (
              <div className="mt-4 rounded-[1.2rem] bg-white px-4 py-3 text-sm text-[#516277]">
                <p>샤워 {checkin.showerMinutes || "0"}분</p>
                <p className="mt-1">페트병 {checkin.petBottleCount || "0"}개</p>
                <p className="mt-1">차 {checkin.carMinutes || "0"}분</p>
                <p className="mt-2 font-black text-[#21452f]">
                  오늘 다시 쌓인 빚 {checkin.addedDebt.toLocaleString()}
                </p>
              </div>
            ) : null}

            {checkin.open ? (
              <div className="mt-4 grid gap-3">
                <input
                  value={checkin.showerMinutes}
                  onChange={(event) => onCheckinChange("showerMinutes", event.target.value)}
                  inputMode="numeric"
                  placeholder="오늘 샤워한 시간(분)"
                  className="rounded-2xl border border-[#d5e5c9] bg-white px-4 py-3 text-sm text-[#1f3828] outline-none transition placeholder:text-[#8ca08f] focus:border-[#69a85c] focus:ring-4 focus:ring-[#dff1d4]"
                />
                <input
                  value={checkin.petBottleCount}
                  onChange={(event) => onCheckinChange("petBottleCount", event.target.value)}
                  inputMode="numeric"
                  placeholder="오늘 사용한 페트병 수"
                  className="rounded-2xl border border-[#d5e5c9] bg-white px-4 py-3 text-sm text-[#1f3828] outline-none transition placeholder:text-[#8ca08f] focus:border-[#69a85c] focus:ring-4 focus:ring-[#dff1d4]"
                />
                <input
                  value={checkin.carMinutes}
                  onChange={(event) => onCheckinChange("carMinutes", event.target.value)}
                  inputMode="numeric"
                  placeholder="오늘 차를 탄 시간(분)"
                  className="rounded-2xl border border-[#d5e5c9] bg-white px-4 py-3 text-sm text-[#1f3828] outline-none transition placeholder:text-[#8ca08f] focus:border-[#69a85c] focus:ring-4 focus:ring-[#dff1d4]"
                />
                <button
                  type="button"
                  onClick={onSubmitCheckin}
                  className="rounded-2xl bg-[#214f73] px-4 py-3 text-sm font-black text-white"
                >
                  오늘 체크인 제출하기
                </button>
              </div>
            ) : null}
          </section>
        </div>
      </section>

      <BottomBar activeTab={activeTab} onChange={onChangeTab} />
    </>
  );
}

function MissionScreen({
  missions,
  activeTab,
  onChangeTab,
  onToggleProof,
  onPhotoChange,
  onReviewChange,
  onSubmitProof,
  onRedrawMissions,
}: {
  missions: Mission[];
  activeTab: BottomTab;
  onChangeTab: (tab: BottomTab) => void;
  onToggleProof: (missionId: string) => void;
  onPhotoChange: (missionId: string, photoName: string) => void;
  onReviewChange: (missionId: string, review: string) => void;
  onSubmitProof: (missionId: string) => void;
  onRedrawMissions: () => void;
}) {
  const completedCount = missions.filter((mission) => mission.completed).length;

  return (
    <>
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_24px_60px_rgba(62,104,57,0.16)] backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#4d7b50]">
              Mission
            </p>
            <h1 className="mt-3 text-[2rem] font-black tracking-[-0.05em] text-[#21452f]">
              오늘의 미션
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#456754]">
              사진과 간단한 후기를 올려야만 완료 표시가 뜹니다.
            </p>
          </div>
          <div className="rounded-full bg-[#eef7df] px-4 py-2 text-sm font-black text-[#2c6a41]">
            {completedCount}/{missions.length} 완료
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onRedrawMissions}
            aria-label="미션 새로 뽑기"
            className="relative rounded-full border border-[#d6e3cd] bg-white px-4 py-2 text-xs font-black text-transparent"
          >
            <span className="absolute inset-0 flex items-center justify-center text-[#5d725e]">
              미션 새로 뽑기
            </span>
            초기화
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {missions.map((mission) => {
            const canSubmit = mission.photoName.trim() !== "" && mission.review.trim() !== "";

            return (
              <article
                key={mission.id}
                className={`rounded-[1.5rem] p-4 ${
                  mission.completed ? "bg-[#edf8e5]" : "bg-[#f8faf2]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black text-[#21452f]">{mission.title}</h2>
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-[#6a7f69]">
                        {mission.difficulty}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#5d725e]">{mission.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                      <span className="rounded-full bg-white px-3 py-1 text-[#2c6a41]">
                        빚 상환 {mission.debtReduction}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-[#82611f]">
                        빚 상환 후 +{mission.ecoReward} 에코머니
                      </span>
                    </div>
                  </div>

                  {mission.completed ? (
                    <span className="rounded-full bg-[#2c6a41] px-3 py-2 text-xs font-black text-white">
                      인증 완료
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onToggleProof(mission.id)}
                      className="rounded-full bg-[#2c6a41] px-4 py-2 text-xs font-black text-white"
                    >
                      인증하기
                    </button>
                  )}
                </div>

                {mission.completed ? (
                  <div className="mt-4 rounded-[1.2rem] bg-white px-4 py-3 text-sm text-[#5d725e]">
                    <p>사진: {mission.photoName}</p>
                    <p className="mt-1">후기: {mission.review}</p>
                  </div>
                ) : null}

                {mission.proofOpen && !mission.completed ? (
                  <div className="mt-4 rounded-[1.2rem] bg-white p-4 ring-1 ring-[#dbe7d1]">
                    <label className="block">
                      <span className="mb-2 block text-xs font-black text-[#47614d]">사진 올리기</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          onPhotoChange(mission.id, event.target.files?.[0]?.name ?? "")
                        }
                        className="block w-full text-sm text-[#47614d] file:mr-3 file:rounded-full file:border-0 file:bg-[#e8f4dc] file:px-3 file:py-2 file:text-xs file:font-black file:text-[#2c6a41]"
                      />
                    </label>

                    {mission.photoName ? (
                      <p className="mt-2 text-xs font-bold text-[#5d725e]">
                        선택한 사진: {mission.photoName}
                      </p>
                    ) : null}

                    <label className="mt-4 block">
                      <span className="mb-2 block text-xs font-black text-[#47614d]">간단한 후기</span>
                      <textarea
                        value={mission.review}
                        onChange={(event) => onReviewChange(mission.id, event.target.value)}
                        placeholder="어떻게 실천했는지 짧게 적어주세요."
                        className="min-h-24 w-full rounded-2xl border border-[#d5e5c9] bg-[#fcfdf8] px-4 py-3 text-sm text-[#1f3828] outline-none transition placeholder:text-[#8ca08f] focus:border-[#69a85c] focus:ring-4 focus:ring-[#dff1d4]"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => onSubmitProof(mission.id)}
                      disabled={!canSubmit}
                      className="mt-4 w-full rounded-2xl bg-[#2c6a41] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-[#a9bea9]"
                    >
                      사진과 후기 제출하고 완료하기
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <BottomBar activeTab={activeTab} onChange={onChangeTab} />
    </>
  );
}

function ChallengeScreen({
  challenges,
  draft,
  activeTab,
  onChangeTab,
  onDraftChange,
  onCreateChallenge,
  onToggleProgress,
  onLikeReview,
  onOpenDayProof,
  onDayPhotoChange,
  onDayReviewChange,
  onSubmitDayProof,
}: {
  challenges: Challenge[];
  draft: ChallengeDraft;
  activeTab: BottomTab;
  onChangeTab: (tab: BottomTab) => void;
  onDraftChange: (field: keyof ChallengeDraft, value: string) => void;
  onCreateChallenge: () => void;
  onToggleProgress: (challengeId: string) => void;
  onLikeReview: (challengeId: string, reviewId: string) => void;
  onOpenDayProof: (challengeId: string, day: number) => void;
  onDayPhotoChange: (challengeId: string, day: number, photoName: string) => void;
  onDayReviewChange: (challengeId: string, day: number, review: string) => void;
  onSubmitDayProof: (challengeId: string, day: number) => void;
}) {
  const activeChallenges = challenges.filter((challenge) => challenge.joined && !challenge.completed);
  const otherChallenges = challenges.filter((challenge) => !challenge.completed || challenge.joined);

  return (
    <>
      <section className="space-y-4 rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_24px_60px_rgba(62,104,57,0.16)] backdrop-blur">
        <section className="rounded-[1.6rem] bg-[linear-gradient(135deg,#e5f7c7_0%,#d8efff_100%)] p-5">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#4d7b50]">
            Challenge
          </p>
          <h1 className="mt-3 text-[2rem] font-black tracking-[-0.05em] text-[#21452f]">
            챌린지
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#456754]">
            후기와 좋아요를 보고 바로 참여할 수 있고, 장기 챌린지는 매일 사진과 후기를 인증해야
            합니다.
          </p>
        </section>

        <section className="rounded-[1.5rem] bg-white p-5 shadow-[0_10px_24px_rgba(48,83,50,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#5d725e]">새 챌린지 만들기</p>
              <h2 className="mt-1 text-xl font-black text-[#21452f]">친구들이 참여할 활동 제안하기</h2>
            </div>
            <button
              type="button"
              onClick={onCreateChallenge}
              className="rounded-full bg-[#2c6a41] px-4 py-2 text-sm font-black text-white"
            >
              챌린지 만들기
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            <input
              value={draft.title}
              onChange={(event) => onDraftChange("title", event.target.value)}
              placeholder="챌린지 이름"
              className="rounded-2xl border border-[#d5e5c9] bg-[#fcfdf8] px-4 py-3 text-sm text-[#1f3828] outline-none transition placeholder:text-[#8ca08f] focus:border-[#69a85c] focus:ring-4 focus:ring-[#dff1d4]"
            />
            <textarea
              value={draft.description}
              onChange={(event) => onDraftChange("description", event.target.value)}
              placeholder="챌린지 설명"
              className="min-h-24 rounded-2xl border border-[#d5e5c9] bg-[#fcfdf8] px-4 py-3 text-sm text-[#1f3828] outline-none transition placeholder:text-[#8ca08f] focus:border-[#69a85c] focus:ring-4 focus:ring-[#dff1d4]"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={draft.durationDays}
                onChange={(event) => onDraftChange("durationDays", event.target.value)}
                placeholder="기간(일)"
                inputMode="numeric"
                className="rounded-2xl border border-[#d5e5c9] bg-[#fcfdf8] px-4 py-3 text-sm text-[#1f3828] outline-none transition placeholder:text-[#8ca08f] focus:border-[#69a85c] focus:ring-4 focus:ring-[#dff1d4]"
              />
              <input
                value={draft.reward}
                onChange={(event) => onDraftChange("reward", event.target.value)}
                placeholder="갚을 에코머니"
                inputMode="numeric"
                className="rounded-2xl border border-[#d5e5c9] bg-[#fcfdf8] px-4 py-3 text-sm text-[#1f3828] outline-none transition placeholder:text-[#8ca08f] focus:border-[#69a85c] focus:ring-4 focus:ring-[#dff1d4]"
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
                        onClick={() => onToggleProgress(challenge.id)}
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
                            onOpen={() => onOpenDayProof(challenge.id, dayProof.day)}
                            onPhotoChange={(photoName) =>
                              onDayPhotoChange(challenge.id, dayProof.day, photoName)
                            }
                            onReviewChange={(review) =>
                              onDayReviewChange(challenge.id, dayProof.day, review)
                            }
                            onSubmit={() => onSubmitDayProof(challenge.id, dayProof.day)}
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

        <section className="space-y-3">
          {otherChallenges.map((challenge) => {
            const completedDays = challenge.proofDays.filter((day) => day.submitted).length;

            return (
              <article key={challenge.id} className="rounded-[1.5rem] bg-[#f9fbf3] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-[#21452f]">{challenge.title}</p>
                    <p className="mt-1 text-xs font-bold text-[#6b7d6b]">만든 사람: {challenge.creator}</p>
                    <p className="mt-2 text-sm leading-6 text-[#5d725e]">{challenge.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                      <span className="rounded-full bg-white px-3 py-1 text-[#2c6a41]">
                        참가자 {challenge.participants}명
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-[#8b6422]">
                        {challenge.durationDays}일 챌린지
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-[#8b6422]">
                        완료 보상 {challenge.reward}
                      </span>
                    </div>
                  </div>

                  {challenge.completed ? (
                    <span className="rounded-full bg-[#2c6a41] px-3 py-2 text-xs font-black text-white">
                      완료
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onToggleProgress(challenge.id)}
                      className="rounded-full bg-[#2c6a41] px-4 py-2 text-xs font-black text-white"
                    >
                      {challenge.joined ? "참여 중" : "참여하기"}
                    </button>
                  )}
                </div>

                <div className="mt-4 rounded-[1.2rem] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-[#21452f]">핫한 후기</p>
                    <button
                      type="button"
                      onClick={() => onToggleProgress(challenge.id)}
                      className="text-xs font-black text-[#2c6a41]"
                    >
                      여기서 바로 참여
                    </button>
                  </div>

                  <div className="mt-3 space-y-3">
                    {challenge.hotReviews.map((review) => (
                      <div key={review.id} className="rounded-[1rem] bg-[#f8faf2] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-[#21452f]">{review.author}</p>
                          <button
                            type="button"
                            onClick={() => onLikeReview(challenge.id, review.id)}
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

                {challenge.progressOpen ? (
                  <div className="mt-4 rounded-[1.2rem] bg-white p-4 ring-1 ring-[#dbe7d1]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[#21452f]">챌린지 진행 현황</p>
                        <p className="mt-1 text-xs text-[#5d725e]">
                          {completedDays}/{challenge.durationDays}일 인증 완료
                        </p>
                      </div>
                      {challenge.completed ? (
                        <span className="rounded-full bg-[#2c6a41] px-3 py-1 text-xs font-black text-white">
                          완료됨
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 space-y-3">
                      {challenge.proofDays.map((dayProof) => (
                        <ProofDayCard
                          key={dayProof.day}
                          dayProof={dayProof}
                          onOpen={() => onOpenDayProof(challenge.id, dayProof.day)}
                          onPhotoChange={(photoName) =>
                            onDayPhotoChange(challenge.id, dayProof.day, photoName)
                          }
                          onReviewChange={(review) =>
                            onDayReviewChange(challenge.id, dayProof.day, review)
                          }
                          onSubmit={() => onSubmitDayProof(challenge.id, dayProof.day)}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      </section>

      <BottomBar activeTab={activeTab} onChange={onChangeTab} />
    </>
  );
}

function RankingScreen({
  form,
  repaidEcoMoney,
  activeTab,
  onChangeTab,
}: {
  form: LoginForm;
  repaidEcoMoney: number;
  activeTab: BottomTab;
  onChangeTab: (tab: BottomTab) => void;
}) {
  const myClassName = `${form.grade}학년 ${form.classRoom}반`;

  const classRanking = useMemo(() => {
    const others = classRankingBase.filter((item) => item.className !== myClassName);
    const mine = {
      className: myClassName,
      score: 1210 + repaidEcoMoney,
    };

    return [...others, mine].sort((a, b) => b.score - a.score);
  }, [myClassName, repaidEcoMoney]);

  const myClassRank =
    classRanking.findIndex((item) => item.className === myClassName) + 1;

  const studentRanking = useMemo(() => {
    const others = studentRankingBase.filter((item) => item.name !== form.name);
    const mine = {
      name: form.name,
      score: repaidEcoMoney,
    };

    return [...others, mine].sort((a, b) => b.score - a.score);
  }, [form.name, repaidEcoMoney]);

  const myStudentRank =
    studentRanking.findIndex((item) => item.name === form.name) + 1;

  return (
    <>
      <section className="space-y-4 rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_24px_60px_rgba(62,104,57,0.16)] backdrop-blur">
        <section className="rounded-[1.7rem] bg-[linear-gradient(145deg,#205f3d_0%,#2f7b4d_48%,#9ad36f_100%)] p-5 text-white">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-white/70">
            Ranking
          </p>
          <h1 className="mt-3 text-[2rem] font-black tracking-[-0.05em]">
            우리 반과 내 순위
          </h1>
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
                  item.name === form.name ? "bg-[#fff0bf]" : "bg-white"
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

      <BottomBar activeTab={activeTab} onChange={onChangeTab} />
    </>
  );
}

function MyPageScreen({
  form,
  repaidEcoMoney,
  remainingDebt,
  completedMissionCount,
  completedChallengeCount,
  activeTab,
  onChangeTab,
  onLogout,
}: {
  form: LoginForm;
  repaidEcoMoney: number;
  remainingDebt: number;
  completedMissionCount: number;
  completedChallengeCount: number;
  activeTab: BottomTab;
  onChangeTab: (tab: BottomTab) => void;
  onLogout: () => void;
}) {
  return (
    <>
      <section className="space-y-4 rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_24px_60px_rgba(62,104,57,0.16)] backdrop-blur">
        <section className="rounded-[1.7rem] bg-[linear-gradient(135deg,#dff6b9_0%,#d3eef7_100%)] p-5">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#4d7b50]">
            My Page
          </p>
          <h1 className="mt-3 text-[2rem] font-black tracking-[-0.05em] text-[#21452f]">
            {form.name}님의 정보
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#456754]">
            {form.grade}학년 {form.classRoom}반에서 미션과 챌린지를 사진 인증으로 이어가고 있어요.
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-[1.4rem] bg-[#f3f8ea] p-4">
            <p className="text-xs font-bold text-[#5d725e]">누적 갚은 빚 = 갚은 에코머니</p>
            <p className="mt-2 text-2xl font-black text-[#21452f]">
              {repaidEcoMoney.toLocaleString()}
            </p>
          </div>
          <div className="rounded-[1.4rem] bg-[#eef6ff] p-4">
            <p className="text-xs font-bold text-[#5f6f83]">남은 빚</p>
            <p className="mt-2 text-2xl font-black text-[#21452f]">
              {remainingDebt.toLocaleString()}
            </p>
          </div>
        </section>

        <section className="rounded-[1.5rem] bg-[#fff8e3] p-5">
          <p className="text-xs font-bold text-[#7d6731]">오늘 활동 요약</p>
          <p className="mt-2 text-lg font-black text-[#46391a]">
            사진과 후기 제출로 완료한 미션 {completedMissionCount}개
          </p>
          <p className="mt-1 text-lg font-black text-[#46391a]">
            일별 인증까지 끝낸 챌린지 {completedChallengeCount}개
          </p>
        </section>

        <button
          type="button"
          onClick={() => onChangeTab("challenge")}
          className="w-full rounded-2xl bg-[#295c3a] px-4 py-3 text-sm font-black text-white"
        >
          챌린지 계속하기
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="w-full rounded-2xl border border-[#d6e3cd] bg-white px-4 py-3 text-sm font-black text-[#5d725e]"
        >
          로그아웃
        </button>
      </section>

      <BottomBar activeTab={activeTab} onChange={onChangeTab} />
    </>
  );
}

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authNotice, setAuthNotice] = useState<AuthNotice>(null);
  const [activeTab, setActiveTab] = useState<BottomTab>("home");
  const [form, setForm] = useState<LoginForm>({
    grade: "",
    classRoom: "",
    name: "",
  });
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>(() =>
    readRegisteredUsers(),
  );
  const [signupAnswers, setSignupAnswers] = useState<SignupAnswers>(createEmptySignupAnswers());
  const [initialDebtAmount, setInitialDebtAmount] = useState(defaultTotalDebt);
  const [missions, setMissions] = useState<Mission[]>(drawMissionSet());
  const [challenges, setChallenges] = useState<Challenge[]>(initialChallenges);
  const [challengeDraft, setChallengeDraft] = useState<ChallengeDraft>({
    title: "",
    description: "",
    durationDays: "",
    reward: "",
  });
  const [dailyCheckin, setDailyCheckin] = useState<DailyCheckin>({
    showerMinutes: "",
    petBottleCount: "",
    carMinutes: "",
    open: false,
    submitted: false,
    submittedDate: "",
    addedDebt: 0,
  });

  const completedMissions = missions.filter((mission) => mission.completed);
  const completedChallenges = challenges.filter((challenge) => challenge.completed);

  const totalContribution =
    completedMissions.reduce(
      (sum, mission) => sum + mission.debtReduction + mission.ecoReward,
      0,
    ) +
    completedChallenges.reduce((sum, challenge) => sum + challenge.reward + 100, 0);

  const grossRepaidDebt = baseRepaidDebt + totalContribution;
  const repaidDebt = Math.max(0, grossRepaidDebt - dailyCheckin.addedDebt);
  const remainingDebt = Math.max(0, initialDebtAmount - repaidDebt);
  const repaidEcoMoney = Math.max(0, totalContribution - dailyCheckin.addedDebt);
  const debtProgress = Math.max(
    0,
    Math.round((Math.min(repaidDebt, initialDebtAmount) / Math.max(initialDebtAmount, 1)) * 100),
  );

  useEffect(() => {
    saveRegisteredUsers(registeredUsers);
  }, [registeredUsers]);

  const handleChange = (field: keyof LoginForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setAuthNotice(null);
  };

  const handleSignupAnswerChange = (field: keyof SignupAnswers, value: number) => {
    setSignupAnswers((current) => ({
      ...current,
      [field]: value,
    }));
    setAuthNotice(null);
  };

  const handleSwitchAuthMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthNotice(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const currentUser = normalizeIdentity(form);
    const isSeedUser =
      form.grade === "3" && form.classRoom === "2" && currentUser.name === "노하은";

    if (authMode === "login") {
      const matchedUser = registeredUsers.find((user) => isSameIdentity(user, currentUser));

      if (!matchedUser) {
        setAuthNotice({
          type: "error",
          message: "가입된 계정이 없어서 로그인할 수 없어요. 먼저 가입해 주세요.",
        });
        return;
      }

      setInitialDebtAmount(matchedUser.initialDebt);
      setAuthNotice(null);
    } else {
      const existingUser = registeredUsers.find((user) => isSameIdentity(user, currentUser));

      if (existingUser) {
        setAuthNotice({
          type: "error",
          message: "이미 가입된 계정이에요. 로그인으로 들어가 주세요.",
        });
        return;
      }

      const nextInitialDebt = calculateInitialDebt(signupAnswers);
      const nextUser: RegisteredUser = {
        ...currentUser,
        initialDebt: nextInitialDebt,
        createdAt: new Date().toISOString(),
      };

      setRegisteredUsers((current) => [...current, nextUser]);
      setInitialDebtAmount(nextInitialDebt);
      setAuthNotice({
        type: "success",
        message: "가입이 완료됐어요. 이제 같은 정보로 로그인할 수 있어요.",
      });
    }

    setMissions(isSeedUser ? initialMissions.slice(0, maxMissionCount) : drawMissionSet());
    setChallenges(isSeedUser ? initialChallenges : createFreshChallenges(initialChallenges));
    setDailyCheckin({
      showerMinutes: "",
      petBottleCount: "",
      carMinutes: "",
      open: false,
      submitted: false,
      submittedDate: "",
      addedDebt: 0,
    });
    setIsLoggedIn(true);
    setActiveTab("home");
  };

  const handleDraftChange = (field: keyof ChallengeDraft, value: string) => {
    setChallengeDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleToggleCheckin = () => {
    if (dailyCheckin.submittedDate === getTodayKey()) {
      return;
    }

    setDailyCheckin((current) => ({
      ...current,
      open: !current.open,
    }));
  };

  const handleCheckinChange = (
    field: "showerMinutes" | "petBottleCount" | "carMinutes",
    value: string,
  ) => {
    setDailyCheckin((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmitCheckin = () => {
    if (dailyCheckin.submittedDate === getTodayKey()) {
      return;
    }

    const showerMinutes = Number(dailyCheckin.showerMinutes) || 0;
    const petBottleCount = Number(dailyCheckin.petBottleCount) || 0;
    const carMinutes = Number(dailyCheckin.carMinutes) || 0;
    const showerDebt = Math.max(0, showerMinutes - 10) * 3;
    const bottleDebt = petBottleCount * 5;
    const carDebt = carMinutes * 2;

    setDailyCheckin((current) => ({
      ...current,
      submitted: true,
      submittedDate: getTodayKey(),
      open: false,
      addedDebt: showerDebt + bottleDebt + carDebt,
    }));
  };

  const toggleMissionProof = (missionId: string) => {
    setMissions((current) =>
      current.map((mission) =>
        mission.id === missionId
          ? { ...mission, proofOpen: !mission.proofOpen }
          : { ...mission, proofOpen: false },
      ),
    );
  };

  const updateMissionPhoto = (missionId: string, photoName: string) => {
    setMissions((current) =>
      current.map((mission) =>
        mission.id === missionId ? { ...mission, photoName } : mission,
      ),
    );
  };

  const updateMissionReview = (missionId: string, review: string) => {
    setMissions((current) =>
      current.map((mission) => (mission.id === missionId ? { ...mission, review } : mission)),
    );
  };

  const submitMissionProof = (missionId: string) => {
    setMissions((current) =>
      current.map((mission) =>
        mission.id === missionId &&
        mission.photoName.trim() !== "" &&
        mission.review.trim() !== ""
          ? { ...mission, completed: true, proofOpen: false }
          : mission,
      ),
    );
  };

  const redrawMissions = () => {
    setMissions(drawMissionSet());
  };

  const toggleChallengeProgress = (challengeId: string) => {
    setChallenges((current) =>
      current.map((challenge) =>
        challenge.id === challengeId
          ? { ...challenge, joined: true, progressOpen: !challenge.progressOpen }
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
          proofDay.day === day &&
          proofDay.photoName.trim() !== "" &&
          proofDay.review.trim() !== ""
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

    const newChallenge: Challenge = {
      id: `challenge-${Date.now()}`,
      title: challengeDraft.title.trim(),
      creator: `${form.grade}학년 ${form.classRoom}반 ${form.name}`,
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

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAuthMode("login");
    setAuthNotice(null);
    setActiveTab("home");
    setForm({
      grade: "",
      classRoom: "",
      name: "",
    });
    setSignupAnswers(createEmptySignupAnswers());
    setInitialDebtAmount(defaultTotalDebt);
    setMissions(drawMissionSet());
    setChallenges(createFreshChallenges(initialChallenges));
    setDailyCheckin({
      showerMinutes: "",
      petBottleCount: "",
      carMinutes: "",
      open: false,
      submitted: false,
      submittedDate: "",
      addedDebt: 0,
    });
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f6ffd5_0%,#ebf7d8_26%,#eef4ff_62%,#f9fbf2_100%)] px-5 py-8 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[430px] flex-col justify-center">
        {!isLoggedIn ? (
          <AuthScreen
            mode={authMode}
            form={form}
            signupAnswers={signupAnswers}
            notice={authNotice}
            onChange={handleChange}
            onSignupAnswerChange={handleSignupAnswerChange}
            onSubmit={handleSubmit}
            onSwitchMode={handleSwitchAuthMode}
          />
        ) : null}

        {isLoggedIn && activeTab === "home" ? (
          <TrimmedHomeScreen
            form={form}
            remainingDebt={remainingDebt}
            totalDebtAmount={initialDebtAmount}
            debtProgress={debtProgress}
            completedMissionCount={completedMissions.length}
            totalMissionCount={missions.length}
            completedChallengeCount={completedChallenges.length}
            repaidEcoMoney={repaidEcoMoney}
            checkin={dailyCheckin}
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            onToggleCheckin={handleToggleCheckin}
            onCheckinChange={handleCheckinChange}
            onSubmitCheckin={handleSubmitCheckin}
          />
        ) : null}

        {isLoggedIn && activeTab === "mission" ? (
          <MissionScreen
            missions={missions}
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            onToggleProof={toggleMissionProof}
            onPhotoChange={updateMissionPhoto}
            onReviewChange={updateMissionReview}
            onSubmitProof={submitMissionProof}
            onRedrawMissions={redrawMissions}
          />
        ) : null}

        {isLoggedIn && activeTab === "challenge" ? (
          <ChallengeScreen
            challenges={challenges}
            draft={challengeDraft}
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            onDraftChange={handleDraftChange}
            onCreateChallenge={handleCreateChallenge}
            onToggleProgress={toggleChallengeProgress}
            onLikeReview={likeChallengeReview}
            onOpenDayProof={openChallengeDayProof}
            onDayPhotoChange={updateChallengeDayPhoto}
            onDayReviewChange={updateChallengeDayReview}
            onSubmitDayProof={submitChallengeDayProof}
          />
        ) : null}

        {isLoggedIn && activeTab === "ranking" ? (
          <RankingScreen
            form={form}
            repaidEcoMoney={repaidEcoMoney}
            activeTab={activeTab}
            onChangeTab={setActiveTab}
          />
        ) : null}

        {isLoggedIn && activeTab === "mypage" ? (
          <MyPageScreen
            form={form}
            repaidEcoMoney={repaidEcoMoney}
            remainingDebt={remainingDebt}
            completedMissionCount={completedMissions.length}
            completedChallengeCount={completedChallenges.length}
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            onLogout={handleLogout}
          />
        ) : null}
      </div>
    </main>
  );
}
