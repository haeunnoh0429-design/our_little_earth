"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadKakaoMap } from "@/lib/load-kakao-map";
import { mockCafes } from "@/lib/mock-cafes";
import type { Cafe } from "@/types/cafe";
import type { TrashBin } from "@/types/trash-bin";

const DEFAULT_CENTER = {
  lat: 37.5301,
  lng: 127.1238,
};

const CHECK_IN_RADIUS_METERS = 50;
const DEPOSIT_MARKER_COLOR = "#2f855a";
const DISCOUNT_MARKER_COLOR = "#2563eb";
const TRASH_BIN_MARKER_COLOR = "#f59e0b";

type MapStatus = "loading" | "ready" | "error";
type LocationStatus = "idle" | "loading" | "granted" | "denied" | "unsupported";
type MarkerLayerStatus = "idle" | "loading" | "ready" | "error";
export type DestinationKind = "trash-bin" | "personal-cup" | "deposit-cup";

export type MapActionCompletion = {
  placeId: string;
  placeName: string;
  action: DestinationKind;
  reward: number;
};

type Coordinates = {
  lat: number;
  lng: number;
};

type SelectedPlace = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  availableActions: DestinationKind[];
};

type TrashBinApiResponse = {
  trashBins: TrashBin[];
};

type KakaoMapSectionProps = {
  completedTodayActionKeys: string[];
  onCompleteAction: (completion: MapActionCompletion) => void;
};

const MAP_ACTION_REWARDS: Record<DestinationKind, number> = {
  "deposit-cup": 80,
  "personal-cup": 60,
  "trash-bin": 70,
};

export function createMapActionKey(placeId: string, action: DestinationKind) {
  return `${placeId}:${action}`;
}

function buildMarkerImage(
  kakao: typeof window.kakao,
  color: string,
  label: string,
) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42" fill="none">
      <path d="M17 1C8.16344 1 1 8.16344 1 17C1 29 17 41 17 41C17 41 33 29 33 17C33 8.16344 25.8366 1 17 1Z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="17" cy="17" r="7" fill="#ffffff"/>
      <text x="17" y="20.5" text-anchor="middle" font-size="10" font-family="Arial, sans-serif" font-weight="700" fill="${color}">${label}</text>
    </svg>
  `.trim();

  const imageSrc = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

  return new kakao.maps.MarkerImage(
    imageSrc,
    new kakao.maps.Size(34, 42),
    {
      offset: new kakao.maps.Point(17, 42),
    },
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getStoreMarkerColor(store: Cafe) {
  return store.depositCupSupported ? DEPOSIT_MARKER_COLOR : DISCOUNT_MARKER_COLOR;
}

function getStoreMarkerLabel(store: Cafe) {
  return store.depositCupSupported ? "보" : "컵";
}

function buildStoreInfoWindowContent(store: Cafe) {
  const benefitBadges = [
    store.depositCupSupported
      ? `<span style="display:inline-block; margin:4px 6px 0 0; padding:2px 8px; border-radius:999px; background:${DEPOSIT_MARKER_COLOR}; color:#ffffff; font-size:11px; font-weight:700;">다회용컵 보증금제</span>`
      : "",
    store.personalCupDiscountSupported
      ? `<span style="display:inline-block; margin:4px 6px 0 0; padding:2px 8px; border-radius:999px; background:${DISCOUNT_MARKER_COLOR}; color:#ffffff; font-size:11px; font-weight:700;">개인컵 사용</span>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const sourceLine =
    store.sourceLabel && store.sourceUrl
      ? `<div style="margin-top:6px; color:#6b7280;">출처: <a href="${escapeHtml(store.sourceUrl)}" target="_blank" rel="noreferrer" style="color:#2563eb;">${escapeHtml(store.sourceLabel)}</a></div>`
      : "";

  return `
    <div style="padding:10px 12px; min-width:220px; font-size:12px; line-height:1.5;">
      <strong>${escapeHtml(store.name)}</strong><br />
      <span>${escapeHtml(store.brand)}</span><br />
      <span>${escapeHtml(store.address)}</span><br />
      <div style="margin-top:4px;">${benefitBadges}</div>
      ${sourceLine}
    </div>
  `;
}

function getTrashBinSearchAddress(trashBin: TrashBin) {
  const address = trashBin.roadAddress.trim();

  if (address.startsWith("서울")) {
    return address;
  }

  if (trashBin.district) {
    return `서울특별시 ${trashBin.district} ${address}`;
  }

  return `서울특별시 ${address}`;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getDistanceMeters(from: Coordinates, to: Coordinates) {
  const earthRadius = 6371000;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

function getActionLabel(kind: DestinationKind) {
  if (kind === "trash-bin") {
    return "분리수거함";
  }

  if (kind === "personal-cup") {
    return "개인컵 사용";
  }

  return "다회용컵 보증금제 매장";
}

function getActionProofGuide(kind: DestinationKind) {
  if (kind === "trash-bin") {
    return "GPS 체크인 + 분리수거 사진";
  }

  if (kind === "personal-cup") {
    return "GPS 체크인 + 개인컵 사용 문구가 보이는 영수증 사진";
  }

  return "GPS 체크인 + 다회용컵 사용 사진";
}

function getAvailableActions(store: Cafe): DestinationKind[] {
  const actions: DestinationKind[] = [];

  if (store.personalCupDiscountSupported) {
    actions.push("personal-cup");
  }

  if (store.depositCupSupported) {
    actions.push("deposit-cup");
  }

  return actions;
}

export function KakaoMapSection({
  completedTodayActionKeys,
  onCompleteAction,
}: KakaoMapSectionProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const kakaoRef = useRef<typeof window.kakao | null>(null);
  const mapInstanceRef = useRef<kakao.maps.Map | null>(null);
  const currentLocationMarkerRef = useRef<kakao.maps.Marker | null>(null);
  const storeMarkersRef = useRef<kakao.maps.Marker[]>([]);
  const trashBinMarkersRef = useRef<kakao.maps.Marker[]>([]);

  const [mapStatus, setMapStatus] = useState<MapStatus>("loading");
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [storeStatus, setStoreStatus] = useState<MarkerLayerStatus>("idle");
  const [trashBinStatus, setTrashBinStatus] = useState<MarkerLayerStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [storeCount, setStoreCount] = useState(0);
  const [trashBinCount, setTrashBinCount] = useState(0);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [selectedAction, setSelectedAction] = useState<DestinationKind | null>(null);
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null);
  const [proofPhotoName, setProofPhotoName] = useState("");

  const depositCupCount = mockCafes.filter((store) => store.depositCupSupported).length;
  const personalCupDiscountCount = mockCafes.filter(
    (store) => store.personalCupDiscountSupported,
  ).length;

  const origin =
    typeof window === "undefined" ? "unknown" : window.location.origin;

  useEffect(() => {
    let isMounted = true;

    async function initializeMap() {
      if (!mapRef.current) {
        return;
      }

      try {
        const kakao = await loadKakaoMap();

        if (!isMounted || !mapRef.current) {
          return;
        }

        kakaoRef.current = kakao;

        const defaultCenter = new kakao.maps.LatLng(
          DEFAULT_CENTER.lat,
          DEFAULT_CENTER.lng,
        );

        const map = new kakao.maps.Map(mapRef.current, {
          center: defaultCenter,
          level: 5,
        });

        map.relayout();
        mapInstanceRef.current = map;
        setMapStatus("ready");

        await Promise.all([loadStores(), loadTrashBins()]);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMapStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "카카오 지도를 불러오는 중 오류가 발생했어요.",
        );
      }
    }

    async function loadStores() {
      const kakao = kakaoRef.current;
      const map = mapInstanceRef.current;

      if (!kakao || !map) {
        return;
      }

      setStoreStatus("loading");

      try {
        const geocoder = new kakao.maps.services.Geocoder();

        storeMarkersRef.current.forEach((marker) => marker.setMap(null));
        storeMarkersRef.current = [];

        const results = await Promise.all(
          mockCafes.map(
            (store) =>
              new Promise<kakao.maps.Marker | null>((resolve) => {
                geocoder.addressSearch(store.address, (result, status) => {
                  if (
                    status !== kakao.maps.services.Status.OK ||
                    result.length === 0
                  ) {
                    resolve(null);
                    return;
                  }

                  const position = {
                    lat: Number(result[0].y),
                    lng: Number(result[0].x),
                  };

                  const marker = new kakao.maps.Marker({
                    map,
                    position: new kakao.maps.LatLng(position.lat, position.lng),
                    image: buildMarkerImage(
                      kakao,
                      getStoreMarkerColor(store),
                      getStoreMarkerLabel(store),
                    ),
                  });

                  const infoWindow = new kakao.maps.InfoWindow({
                    content: buildStoreInfoWindowContent(store),
                  });

                  kakao.maps.event.addListener(marker, "click", () => {
                    infoWindow.open(map, marker);
                    setSelectedPlace({
                      id: store.name,
                      name: store.name,
                      address: store.address,
                      lat: position.lat,
                      lng: position.lng,
                      availableActions: getAvailableActions(store),
                    });
                    setSelectedAction(getAvailableActions(store)[0] ?? null);
                    setActivePlaceId(null);
                    setProofPhotoName("");
                  });

                  resolve(marker);
                });
              }),
          ),
        );

        if (!isMounted) {
          return;
        }

        storeMarkersRef.current = results.filter(
          (marker): marker is kakao.maps.Marker => marker !== null,
        );
        setStoreCount(storeMarkersRef.current.length);
        setStoreStatus("ready");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setStoreStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "매장 위치 데이터를 불러오는 중 오류가 발생했어요.",
        );
      }
    }

    async function loadTrashBins() {
      const kakao = kakaoRef.current;
      const map = mapInstanceRef.current;

      if (!kakao || !map) {
        return;
      }

      setTrashBinStatus("loading");

      try {
        const response = await fetch("/api/trash-bins", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`분리수거함 데이터를 불러오지 못했어요. (${response.status})`);
        }

        const payload = (await response.json()) as TrashBinApiResponse;
        const geocoder = new kakao.maps.services.Geocoder();
        const trashBinMarkerImage = buildMarkerImage(
          kakao,
          TRASH_BIN_MARKER_COLOR,
          "통",
        );

        trashBinMarkersRef.current.forEach((marker) => marker.setMap(null));
        trashBinMarkersRef.current = [];

        const results = await Promise.all(
          payload.trashBins.map(
            (trashBin) =>
              new Promise<kakao.maps.Marker | null>((resolve) => {
                const searchAddress = getTrashBinSearchAddress(trashBin);

                geocoder.addressSearch(searchAddress, (result, status) => {
                  if (
                    status !== kakao.maps.services.Status.OK ||
                    result.length === 0
                  ) {
                    resolve(null);
                    return;
                  }

                  const position = {
                    lat: Number(result[0].y),
                    lng: Number(result[0].x),
                  };

                  const marker = new kakao.maps.Marker({
                    map,
                    position: new kakao.maps.LatLng(position.lat, position.lng),
                    image: trashBinMarkerImage,
                  });

                  const infoWindow = new kakao.maps.InfoWindow({
                    content: `
                      <div style="padding:10px 12px; min-width:190px; font-size:12px; line-height:1.5;">
                        <strong>${escapeHtml(trashBin.district || "분리수거함")}</strong><br />
                        <span>${escapeHtml(searchAddress)}</span><br />
                        <span>${escapeHtml(trashBin.locationType || "설치 장소 정보 없음")}</span>
                      </div>
                    `,
                  });

                  kakao.maps.event.addListener(marker, "click", () => {
                    infoWindow.open(map, marker);
                    setSelectedPlace({
                      id: trashBin.id,
                      name: `${trashBin.district || "분리수거함"} 분리수거함`,
                      address: searchAddress,
                      lat: position.lat,
                      lng: position.lng,
                      availableActions: ["trash-bin"],
                    });
                    setSelectedAction("trash-bin");
                    setActivePlaceId(null);
                    setProofPhotoName("");
                  });

                  resolve(marker);
                });
              }),
          ),
        );

        if (!isMounted) {
          return;
        }

        trashBinMarkersRef.current = results.filter(
          (marker): marker is kakao.maps.Marker => marker !== null,
        );
        setTrashBinCount(trashBinMarkersRef.current.length);
        setTrashBinStatus("ready");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setTrashBinStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "분리수거함 위치 데이터를 불러오는 중 오류가 발생했어요.",
        );
      }
    }

    void initializeMap();

    return () => {
      isMounted = false;
      currentLocationMarkerRef.current?.setMap(null);
      storeMarkersRef.current.forEach((marker) => marker.setMap(null));
      trashBinMarkersRef.current.forEach((marker) => marker.setMap(null));
    };
  }, []);

  const distanceMeters = useMemo(() => {
    if (!selectedPlace || !coordinates || activePlaceId !== selectedPlace.id) {
      return null;
    }

    return getDistanceMeters(coordinates, {
      lat: selectedPlace.lat,
      lng: selectedPlace.lng,
    });
  }, [activePlaceId, coordinates, selectedPlace]);

  const isCheckedIn =
    distanceMeters !== null && distanceMeters <= CHECK_IN_RADIUS_METERS;

  const moveToCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      return;
    }

    const kakao = kakaoRef.current;
    const map = mapInstanceRef.current;

    if (!kakao || !map) {
      return;
    }

    setLocationStatus("loading");
    setErrorMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const currentCenter = new kakao.maps.LatLng(
          nextCoordinates.lat,
          nextCoordinates.lng,
        );

        currentLocationMarkerRef.current?.setMap(null);
        currentLocationMarkerRef.current = new kakao.maps.Marker({
          map,
          position: currentCenter,
        });

        map.setCenter(currentCenter);
        map.setLevel(4);
        setCoordinates(nextCoordinates);
        setLocationStatus("granted");
      },
      (error) => {
        setLocationStatus("denied");
        setErrorMessage(
          `현재 위치를 가져오지 못했어요. 코드: ${error.code}, 메시지: ${error.message}`,
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  const startCheckInFlow = () => {
    if (!selectedPlace) {
      return;
    }

    setActivePlaceId(selectedPlace.id);
    setProofPhotoName("");
  };

  const proofReady = proofPhotoName.trim() !== "";
  const isActivePlaceSelected =
    selectedPlace !== null && activePlaceId === selectedPlace.id;
  const selectedActionReward = selectedAction ? MAP_ACTION_REWARDS[selectedAction] : 0;
  const selectedActionCompletionKey =
    selectedPlace && selectedAction
      ? createMapActionKey(selectedPlace.id, selectedAction)
      : null;
  const selectedActionCompleted =
    selectedActionCompletionKey !== null &&
    completedTodayActionKeys.includes(selectedActionCompletionKey);
  const canCompleteSelectedAction =
    selectedPlace !== null &&
    selectedAction !== null &&
    isActivePlaceSelected &&
    isCheckedIn &&
    proofReady &&
    !selectedActionCompleted;

  const completeSelectedAction = () => {
    if (!selectedPlace || !selectedAction || !canCompleteSelectedAction) {
      return;
    }

    onCompleteAction({
      placeId: selectedPlace.id,
      placeName: selectedPlace.name,
      action: selectedAction,
      reward: MAP_ACTION_REWARDS[selectedAction],
    });
  };

  return (
    <section className="rounded-[1.9rem] bg-white p-4 shadow-[0_10px_30px_rgba(69,95,63,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#6f806d]">지도</p>
          <h2 className="mt-1 text-[1.7rem] font-black tracking-[-0.04em] text-[#24382a]">
            갈 장소를 고르고 체크인하기
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#6f7c69]">
            새 장소를 누르면 그 장소 정보만 보이고, `장소로 이동`을 눌렀을 때부터 체크인과 인증을 시작해요.
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-[#e2eadc] bg-[#eef5e8]">
        <div ref={mapRef} className="h-[320px] w-full" />
      </div>

      {mapStatus === "loading" ? (
        <p className="mt-3 text-sm text-[#6f7c69]">지도를 불러오는 중이에요...</p>
      ) : null}

      {mapStatus === "error" ? (
        <div className="mt-3 rounded-[1rem] bg-[#fff4e8] px-4 py-3 text-sm text-[#8a5830]">
          <p className="font-bold">카카오 지도를 불러오지 못했어요.</p>
          <p className="mt-1 break-words">{errorMessage}</p>
          <p className="mt-2">
            `.env.local`의 `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` 값과 Kakao Developers의
            JavaScript SDK 도메인 등록을 확인해 주세요.
          </p>
          <p className="mt-2">현재 접속 주소: {origin}</p>
        </div>
      ) : null}

      {mapStatus === "ready" ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-[1rem] bg-[#f4f8ee] px-4 py-3 text-sm text-[#5d6f60]">
            현재 위치를 먼저 확인한 뒤, 지도에서 새 장소를 눌러 주세요.
          </div>

          <div className="grid gap-2 text-sm text-[#415540] sm:grid-cols-3">
            <div className="rounded-[1rem] bg-[#eef7ea] px-4 py-3">
              <span
                className="mr-2 inline-block h-3 w-3 rounded-full align-middle"
                style={{ backgroundColor: DEPOSIT_MARKER_COLOR }}
              />
              다회용컵 보증금제 {depositCupCount}곳
            </div>
            <div className="rounded-[1rem] bg-[#edf4ff] px-4 py-3">
              <span
                className="mr-2 inline-block h-3 w-3 rounded-full align-middle"
                style={{ backgroundColor: DISCOUNT_MARKER_COLOR }}
              />
              개인컵 사용 가능 {personalCupDiscountCount}곳
            </div>
            <div className="rounded-[1rem] bg-[#fff5df] px-4 py-3">
              <span
                className="mr-2 inline-block h-3 w-3 rounded-full align-middle"
                style={{ backgroundColor: TRASH_BIN_MARKER_COLOR }}
              />
              분리수거함 {trashBinCount}곳
            </div>
          </div>

          <button
            onClick={moveToCurrentLocation}
            className="w-full rounded-[1.1rem] bg-[#295c3a] px-4 py-3 text-sm font-black text-white shadow-[0_10px_22px_rgba(41,92,58,0.16)]"
          >
            현재 위치 확인하기
          </button>

          {selectedPlace ? (
            <section
              key={selectedPlace.id}
              className="rounded-[1.4rem] bg-[#f8fbf4] p-4"
            >
              <p className="text-xs font-bold text-[#5d725e]">선택한 장소</p>
              <h3 className="mt-1 text-lg font-black text-[#21452f]">{selectedPlace.name}</h3>
              <p className="mt-2 text-sm leading-6 text-[#5d725e]">{selectedPlace.address}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {selectedPlace.availableActions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => setSelectedAction(action)}
                    className={`rounded-full px-4 py-2 text-xs font-black ${
                      selectedAction === action
                        ? "bg-[#2c6a41] text-white"
                        : "bg-white text-[#2c6a41]"
                    }`}
                  >
                    {getActionLabel(action)}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={startCheckInFlow}
                className="mt-4 w-full rounded-[1.1rem] bg-[#2c6a41] px-4 py-3 text-sm font-black text-white"
              >
                장소로 이동
              </button>

              {selectedAction ? (
                <div className="mt-4 rounded-[1.2rem] bg-white p-4 text-sm text-[#46604c]">
                  <p className="font-black text-[#21452f]">필수 인증</p>
                  <p className="mt-2">{getActionProofGuide(selectedAction)}</p>
                  <p className="mt-2 font-black text-[#2c6a41]">
                    완료 보상 {selectedActionReward} EM
                  </p>

                  {!isActivePlaceSelected ? (
                    <p className="mt-3 text-[#6f7c69]">
                      위 버튼을 누르면 이 장소 기준으로 체크인과 사진 인증을 시작해요.
                    </p>
                  ) : null}

                  {isActivePlaceSelected && distanceMeters !== null ? (
                    <p className="mt-3">
                      현재 장소와의 거리: 약 {Math.round(distanceMeters)}m
                    </p>
                  ) : null}

                  {isActivePlaceSelected ? (
                    isCheckedIn ? (
                      <p className="mt-3 font-black text-[#2c6a41]">
                        체크인 완료. 50m 안으로 들어왔어요.
                      </p>
                    ) : (
                      <p className="mt-3 text-[#8a5830]">
                        아직 체크인 전이에요. 장소 반경 50m 안으로 들어와 주세요.
                      </p>
                    )
                  ) : null}

                  {isActivePlaceSelected ? (
                    <label className="mt-4 block">
                      <span className="mb-2 block text-xs font-black text-[#47614d]">
                        인증 사진 올리기
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          setProofPhotoName(event.target.files?.[0]?.name ?? "")
                        }
                        className="block w-full text-sm text-[#47614d] file:mr-3 file:rounded-full file:border-0 file:bg-[#e8f4dc] file:px-3 file:py-2 file:text-xs file:font-black file:text-[#2c6a41]"
                      />
                    </label>
                  ) : null}

                  {isActivePlaceSelected && proofPhotoName ? (
                    <p className="mt-3 text-sm text-[#5d725e]">
                      선택한 파일: {proofPhotoName}
                    </p>
                  ) : null}

                  {isActivePlaceSelected && isCheckedIn && proofReady ? (
                    <p className="mt-3 font-black text-[#2c6a41]">
                      GPS 체크인과 사진 준비가 모두 완료됐어요.
                    </p>
                  ) : null}

                  {selectedActionCompleted ? (
                    <p className="mt-3 rounded-[1rem] bg-[#eef7ea] px-4 py-3 font-black text-[#2c6a41]">
                      오늘 이 장소의 이 행동 보상을 이미 받았어요.
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={completeSelectedAction}
                      disabled={!canCompleteSelectedAction}
                      className="mt-4 w-full rounded-[1.1rem] bg-[#2c6a41] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-[#a9bea9]"
                    >
                      인증 완료하고 {selectedActionReward} EM 받기
                    </button>
                  )}
                </div>
              ) : null}
            </section>
          ) : (
            <div className="rounded-[1.2rem] bg-[#f7fbf3] px-4 py-4 text-sm leading-6 text-[#667d6b]">
              지도의 마커를 눌러 갈 장소를 먼저 선택해 주세요.
            </div>
          )}

          {storeStatus === "loading" || trashBinStatus === "loading" ? (
            <p className="text-sm text-[#6f7c69]">
              매장과 분리수거함 위치 데이터를 불러오는 중이에요...
            </p>
          ) : null}

          {storeStatus === "ready" && trashBinStatus === "ready" ? (
            <p className="text-sm text-[#2c6540]">
              지도에 컵 관련 매장 {storeCount}곳과 분리수거함 {trashBinCount}곳을 표시했어요.
            </p>
          ) : null}

          {storeStatus === "error" || trashBinStatus === "error" ? (
            <div className="rounded-[1rem] bg-[#fff4e8] px-4 py-3 text-sm text-[#8a5830]">
              <p className="font-bold">지도 데이터를 일부 불러오지 못했어요.</p>
              <p className="mt-1 break-words">{errorMessage}</p>
            </div>
          ) : null}

          {locationStatus === "loading" ? (
            <p className="text-sm text-[#6f7c69]">현재 위치를 확인하는 중이에요...</p>
          ) : null}

          {locationStatus === "granted" && coordinates ? (
            <div className="rounded-[1rem] bg-[#eef7ea] px-4 py-3 text-sm text-[#2c6540]">
              <p className="font-bold">현재 위치를 지도에 표시했어요.</p>
              <p className="mt-1">
                위도 {coordinates.lat.toFixed(5)}, 경도 {coordinates.lng.toFixed(5)}
              </p>
            </div>
          ) : null}

          {locationStatus === "denied" ? (
            <div className="rounded-[1rem] bg-[#fff4e8] px-4 py-3 text-sm text-[#8a5830]">
              <p className="font-bold">현재 위치를 가져오지 못했어요.</p>
              <p className="mt-1">
                브라우저 위치 권한이 차단되었거나, 정확한 위치를 아직 받지 못한 상태예요.
              </p>
            </div>
          ) : null}

          {locationStatus === "unsupported" ? (
            <p className="text-sm text-[#8a5830]">
              이 브라우저에서는 위치 정보를 지원하지 않아요.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
