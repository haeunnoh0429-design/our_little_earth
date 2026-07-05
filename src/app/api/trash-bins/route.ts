import { NextResponse } from "next/server";
import type { TrashBin } from "@/types/trash-bin";

export const dynamic = "force-dynamic";

const TRASH_BIN_API_URL =
  "https://api.odcloud.kr/api/15149274/v1/uddi:e57109ed-829a-487a-8e13-da157116f1cb";

type RawTrashBinRecord = Record<string, unknown>;

type OdcloudResponse = {
  data?: RawTrashBinRecord[];
};

function repairMojibake(value: string) {
  const trimmed = value.trim();

  if (!/[ÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/.test(trimmed)) {
    return trimmed;
  }

  const bytes = Uint8Array.from(
    Array.from(trimmed, (character) => character.charCodeAt(0) & 0xff),
  );
  const repaired = new TextDecoder("utf-8").decode(bytes).trim();

  return repaired.includes("�") ? trimmed : repaired;
}

function pickString(record: RawTrashBinRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim() !== "") {
      return repairMojibake(value);
    }
  }

  return "";
}

function pickIdentifier(record: RawTrashBinRecord, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim() !== "") {
      return repairMojibake(value);
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return fallback;
}

function normalizeTrashBin(record: RawTrashBinRecord, index: number): TrashBin {
  const district = pickString(record, ["자치구명"]);
  const roadAddress = pickString(record, [
    "설치위치(도로명 주소)",
    "설치위치",
    "주소",
  ]);
  const locationType = pickString(record, ["설치 장소 유형"]);
  const binType = pickString(record, ["쓰레기통 형태"]);
  const wasteType = pickString(record, ["수거 쓰레기 종류"]);
  const sequence = pickIdentifier(record, ["연번", "순번", "번호"], `trash-bin-${index + 1}`);

  return {
    id: sequence,
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
  const uniqueAddressMap = new Map<string, TrashBin>();
  const trashBins = (payload.data ?? [])
    .map(normalizeTrashBin)
    .filter((trashBin) => trashBin.roadAddress !== "")
    .filter((trashBin) => {
      const key = `${trashBin.district}-${trashBin.roadAddress}-${trashBin.locationType}`;

      if (uniqueAddressMap.has(key)) {
        return false;
      }

      uniqueAddressMap.set(key, trashBin);
      return true;
    });

  return NextResponse.json({
    trashBins,
  });
}
