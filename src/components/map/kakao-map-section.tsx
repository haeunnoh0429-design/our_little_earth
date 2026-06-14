"use client";

import { useEffect, useRef, useState } from "react";
import { loadKakaoMap } from "@/lib/load-kakao-map";
import { mockCafes } from "@/lib/mock-cafes";
import type { TrashBin } from "@/types/trash-bin";

const DEFAULT_CENTER = {
  lat: 37.5301,
  lng: 127.1238,
};

const CAFE_MARKER_COLOR = "#2f855a";
const TRASH_BIN_MARKER_COLOR = "#f59e0b";

type MapStatus = "loading" | "ready" | "error";
type LocationStatus = "idle" | "loading" | "granted" | "denied" | "unsupported";
type MarkerLayerStatus = "idle" | "loading" | "ready" | "error";

type Coordinates = {
  lat: number;
  lng: number;
};

type TrashBinApiResponse = {
  trashBins: TrashBin[];
};

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

export function KakaoMapSection() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const kakaoRef = useRef<typeof window.kakao | null>(null);
  const mapInstanceRef = useRef<kakao.maps.Map | null>(null);
  const currentLocationMarkerRef = useRef<kakao.maps.Marker | null>(null);
  const cafeMarkersRef = useRef<kakao.maps.Marker[]>([]);
  const trashBinMarkersRef = useRef<kakao.maps.Marker[]>([]);

  const [mapStatus, setMapStatus] = useState<MapStatus>("loading");
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [cafeStatus, setCafeStatus] = useState<MarkerLayerStatus>("idle");
  const [trashBinStatus, setTrashBinStatus] =
    useState<MarkerLayerStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [cafeCount, setCafeCount] = useState(0);
  const [trashBinCount, setTrashBinCount] = useState(0);

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

        await Promise.all([loadCafes(), loadTrashBins()]);
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

    async function loadCafes() {
      const kakao = kakaoRef.current;
      const map = mapInstanceRef.current;

      if (!kakao || !map) {
        return;
      }

      setCafeStatus("loading");

      try {
        const geocoder = new kakao.maps.services.Geocoder();
        const cafeMarkerImage = buildMarkerImage(kakao, CAFE_MARKER_COLOR, "컵");

        cafeMarkersRef.current.forEach((marker) => marker.setMap(null));
        cafeMarkersRef.current = [];

        const results = await Promise.all(
          mockCafes.map(
            (cafe) =>
              new Promise<kakao.maps.Marker | null>((resolve) => {
                geocoder.addressSearch(cafe.address, (result, status) => {
                  if (
                    status !== kakao.maps.services.Status.OK ||
                    result.length === 0
                  ) {
                    resolve(null);
                    return;
                  }

                  const position = new kakao.maps.LatLng(
                    Number(result[0].y),
                    Number(result[0].x),
                  );

                  const marker = new kakao.maps.Marker({
                    map,
                    position,
                    image: cafeMarkerImage,
                  });

                  const infoWindow = new kakao.maps.InfoWindow({
                    content: `
                      <div style="padding:10px 12px; min-width:190px; font-size:12px; line-height:1.5;">
                        <strong>${escapeHtml(cafe.name)}</strong><br />
                        <span>${escapeHtml(cafe.address)}</span><br />
                        <span style="color:${CAFE_MARKER_COLOR}; font-weight:700;">다회용컵 보증금제 매장</span>
                      </div>
                    `,
                  });

                  kakao.maps.event.addListener(marker, "click", () => {
                    infoWindow.open(map, marker);
                  });

                  resolve(marker);
                });
              }),
          ),
        );

        if (!isMounted) {
          return;
        }

        cafeMarkersRef.current = results.filter(
          (marker): marker is kakao.maps.Marker => marker !== null,
        );
        setCafeCount(cafeMarkersRef.current.length);
        setCafeStatus("ready");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setCafeStatus("error");
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
          "분",
        );

        trashBinMarkersRef.current.forEach((marker) => marker.setMap(null));
        trashBinMarkersRef.current = [];

        const results = await Promise.all(
          payload.trashBins.map(
            (trashBin) =>
              new Promise<kakao.maps.Marker | null>((resolve) => {
                geocoder.addressSearch(
                  getTrashBinSearchAddress(trashBin),
                  (result, status) => {
                    if (
                      status !== kakao.maps.services.Status.OK ||
                      result.length === 0
                    ) {
                      resolve(null);
                      return;
                    }

                    const position = new kakao.maps.LatLng(
                      Number(result[0].y),
                      Number(result[0].x),
                    );

                    const marker = new kakao.maps.Marker({
                      map,
                      position,
                      image: trashBinMarkerImage,
                    });

                    const infoWindow = new kakao.maps.InfoWindow({
                      content: `
                        <div style="padding:10px 12px; min-width:190px; font-size:12px; line-height:1.5;">
                          <strong>${escapeHtml(trashBin.district)} 분리수거함</strong><br />
                          <span>${escapeHtml(getTrashBinSearchAddress(trashBin))}</span><br />
                          <span>${escapeHtml(trashBin.locationType || "설치 장소 정보 없음")}</span><br />
                          <span style="color:${TRASH_BIN_MARKER_COLOR}; font-weight:700;">${escapeHtml(trashBin.wasteType || "수거 종류 정보 없음")}</span>
                        </div>
                      `,
                    });

                    kakao.maps.event.addListener(marker, "click", () => {
                      infoWindow.open(map, marker);
                    });

                    resolve(marker);
                  },
                );
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
      cafeMarkersRef.current.forEach((marker) => marker.setMap(null));
      trashBinMarkersRef.current.forEach((marker) => marker.setMap(null));
    };
  }, []);

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

  return (
    <section className="rounded-[1.9rem] bg-white p-4 shadow-[0_10px_30px_rgba(69,95,63,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#6f806d]">지도</p>
          <h2 className="mt-1 text-[1.7rem] font-black tracking-[-0.04em] text-[#24382a]">
            분리수거함과 다회용컵 보증금제 매장
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#6f7c69]">
            강동구 기준 분리수거함 위치와 다회용컵 보증금제를 운영하는 매장 9곳을
            한눈에 볼 수 있어요.
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
            JavaScript SDK 허용 도메인을 확인해 주세요.
          </p>
          <p className="mt-2">현재 접속 주소: {origin}</p>
        </div>
      ) : null}

      {mapStatus === "ready" ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-[1rem] bg-[#f4f8ee] px-4 py-3 text-sm text-[#5d6f60]">
            기본 중심 좌표는 강동구 근처예요. 아래 버튼으로 현재 위치로 이동할 수 있고,
            마커를 누르면 매장과 분리수거함 상세 정보를 확인할 수 있어요.
          </div>

          <div className="grid gap-2 text-sm text-[#415540] sm:grid-cols-2">
            <div className="rounded-[1rem] bg-[#eef7ea] px-4 py-3">
              <span
                className="mr-2 inline-block h-3 w-3 rounded-full align-middle"
                style={{ backgroundColor: CAFE_MARKER_COLOR }}
              />
              다회용컵 보증금제 매장
            </div>
            <div className="rounded-[1rem] bg-[#fff5df] px-4 py-3">
              <span
                className="mr-2 inline-block h-3 w-3 rounded-full align-middle"
                style={{ backgroundColor: TRASH_BIN_MARKER_COLOR }}
              />
              분리수거함 위치
            </div>
          </div>

          <button
            onClick={moveToCurrentLocation}
            className="w-full rounded-[1.1rem] bg-[#295c3a] px-4 py-3 text-sm font-black text-white shadow-[0_10px_22px_rgba(41,92,58,0.16)]"
          >
            현재 위치로 이동하기
          </button>

          {cafeStatus === "loading" || trashBinStatus === "loading" ? (
            <p className="text-sm text-[#6f7c69]">
              매장과 분리수거함 위치 데이터를 불러오는 중이에요...
            </p>
          ) : null}

          {cafeStatus === "ready" && trashBinStatus === "ready" ? (
            <p className="text-sm text-[#2c6540]">
              지도에 다회용컵 보증금제 매장 {cafeCount}곳과 분리수거함 {trashBinCount}곳을
              표시했어요.
            </p>
          ) : null}

          {cafeStatus === "error" || trashBinStatus === "error" ? (
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
