"use client";

import { useEffect, useRef, useState } from "react";
import { loadKakaoMap } from "@/lib/load-kakao-map";

const DEFAULT_CENTER = {
  lat: 37.5665,
  lng: 126.978,
};

type MapStatus = "loading" | "ready" | "error";
type LocationStatus =
  | "idle"
  | "loading"
  | "granted"
  | "denied"
  | "unsupported";

type Coordinates = {
  lat: number;
  lng: number;
};

export function KakaoMapSection() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const kakaoRef = useRef<typeof window.kakao | null>(null);
  const mapInstanceRef = useRef<kakao.maps.Map | null>(null);
  const markerRef = useRef<kakao.maps.Marker | null>(null);

  const [mapStatus, setMapStatus] = useState<MapStatus>("loading");
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);

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
          level: 4,
        });

        map.relayout();
        mapInstanceRef.current = map;
        setMapStatus("ready");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMapStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "알 수 없는 카카오 맵 로딩 오류가 발생했어요.",
        );
      }
    }

    void initializeMap();

    return () => {
      isMounted = false;
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

        markerRef.current?.setMap(null);
        markerRef.current = new kakao.maps.Marker({
          map,
          position: currentCenter,
        });

        map.setCenter(currentCenter);
        setCoordinates(nextCoordinates);
        setLocationStatus("granted");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus("denied");
          return;
        }

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
            우리 동네 친환경 스팟
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#6f7c69]">
            카카오 맵 위에 미션 장소, 줍깅 포인트, 학교 챌린지 위치를 차근차근
            연결할 수 있어요.
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
          <p className="font-bold">카카오 맵을 불러오지 못했어요.</p>
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
            기본 중심 좌표는 서울시청 근처예요. 아래 버튼을 눌러 내 위치로 다시
            이동해 보세요.
          </div>

          <button
            onClick={moveToCurrentLocation}
            className="w-full rounded-[1.1rem] bg-[#295c3a] px-4 py-3 text-sm font-black text-white shadow-[0_10px_22px_rgba(41,92,58,0.16)]"
          >
            내 위치로 이동하기
          </button>

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
                브라우저 위치 권한이 차단되어 있거나 정확한 위치를 아직 받지 못한
                상태예요.
              </p>
              <p className="mt-1">
                주소창 왼쪽의 자물쇠 아이콘에서 위치 권한을 허용한 뒤 다시 눌러
                주세요.
              </p>
              {errorMessage ? <p className="mt-2 break-words">{errorMessage}</p> : null}
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
