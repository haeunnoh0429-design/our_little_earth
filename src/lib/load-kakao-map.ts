const KAKAO_SDK_ID = "kakao-map-sdk";
const KAKAO_SDK_TIMEOUT_MS = 10000;

let kakaoMapPromise: Promise<typeof window.kakao> | null = null;

export function loadKakaoMap() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Kakao Map can only load in the browser."));
  }

  if (window.kakao?.maps) {
    return new Promise<typeof window.kakao>((resolve) => {
      window.kakao.maps.load(() => resolve(window.kakao));
    });
  }

  if (kakaoMapPromise) {
    return kakaoMapPromise;
  }

  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;

  if (!appKey) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_KAKAO_MAP_APP_KEY is missing."),
    );
  }

  kakaoMapPromise = new Promise<typeof window.kakao>((resolve, reject) => {
    const existingScript = document.getElementById(
      KAKAO_SDK_ID,
    ) as HTMLScriptElement | null;
    const origin = window.location.origin;

    let timeoutId: number | null = null;

    const clearTimer = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const initialize = () => {
      clearTimer();

      if (!window.kakao?.maps) {
        reject(
          new Error(
            `Kakao Map SDK did not initialize correctly. Current origin: ${origin}`,
          ),
        );
        return;
      }

      window.kakao.maps.load(() => resolve(window.kakao));
    };

    const handleScriptError = () => {
      clearTimer();
      reject(
        new Error(
          `Failed to load the Kakao Map SDK. Current origin: ${origin}`,
        ),
      );
    };

    timeoutId = window.setTimeout(() => {
      reject(
        new Error(
          `Kakao Map SDK loading timed out. Current origin: ${origin}`,
        ),
      );
    }, KAKAO_SDK_TIMEOUT_MS);

    if (existingScript) {
      if (window.kakao?.maps) {
        initialize();
        return;
      }

      existingScript.addEventListener("load", initialize, { once: true });
      existingScript.addEventListener("error", handleScriptError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = KAKAO_SDK_ID;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
    script.addEventListener("load", initialize, { once: true });
    script.addEventListener("error", handleScriptError, { once: true });

    document.head.appendChild(script);
  }).catch((error) => {
    kakaoMapPromise = null;
    throw error;
  });

  return kakaoMapPromise;
}
