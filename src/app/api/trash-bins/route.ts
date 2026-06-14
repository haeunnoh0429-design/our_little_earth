import { NextResponse } from "next/server";
import type { TrashBin } from "@/types/trash-bin";

export const dynamic = "force-dynamic";

const TRASH_BIN_API_URL =
  "https://api.odcloud.kr/api/15149274/v1/uddi:e57109ed-829a-487a-8e13-da157116f1cb";

type RawTrashBinRecord = Record<string, unknown>;

type OdcloudResponse = {
  data?: RawTrashBinRecord[];
};

function pickString(record: RawTrashBinRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }

  return "";
}

function normalizeTrashBin(record: RawTrashBinRecord, index: number): TrashBin {
  const district = pickString(record, ["자치구명", "자치구"]);
  const roadAddress = pickString(record, [
    "설치위치(도로명 주소)",
    "설치위치",
    "도로명주소",
    "주소",
  ]);
  const locationType = pickString(record, [
    "설치 장소 유형",
    "설치장소유형",
    "설치장소",
  ]);
  const binType = pickString(record, ["쓰레기통 형태", "쓰레기통형태"]);
  const wasteType = pickString(record, [
    "수거 쓰레기 종류",
    "수거쓰레기종류",
    "수거 종류",
  ]);
  const sequence = pickString(record, ["연번", "순번", "번호"]);

  return {
    id: sequence || `trash-bin-${index + 1}`,
    district,
    roadAddress,
    locationType,
    binType,
    wasteType,
  };
}

export async function GET() {
  const serviceKey = process.env.ODCLOUD_TRASH_BIN_API_KEY;

  if (!serviceKey) {
    return NextResponse.json(
      {
        error:
          "ODCLOUD_TRASH_BIN_API_KEY is missing. Add the public data portal service key to the server environment.",
      },
      { status: 500 },
    );
  }

  const searchParams = new URLSearchParams({
    page: "1",
    perPage: "100",
    serviceKey,
    returnType: "JSON",
  });

  const response = await fetch(`${TRASH_BIN_API_URL}?${searchParams.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      {
        error: `Trash bin API request failed with status ${response.status}.`,
      },
      { status: response.status },
    );
  }

  const payload = (await response.json()) as OdcloudResponse;
  const trashBins = (payload.data ?? [])
    .map(normalizeTrashBin)
    .filter((trashBin) => trashBin.roadAddress !== "");

  return NextResponse.json({
    trashBins,
  });
}
