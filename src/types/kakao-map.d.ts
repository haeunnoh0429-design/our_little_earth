declare global {
  namespace kakao.maps {
    class LatLng {
      constructor(latitude: number, longitude: number);
    }

    class Map {
      constructor(container: HTMLElement, options: MapOptions);
      setCenter(latlng: LatLng): void;
      setLevel(level: number): void;
      relayout(): void;
    }

    class Marker {
      constructor(options: MarkerOptions);
      setMap(map: Map | null): void;
    }

    class InfoWindow {
      constructor(options: InfoWindowOptions);
      open(map: Map, marker: Marker): void;
    }

    namespace event {
      function addListener(
        target: Marker,
        type: string,
        handler: () => void,
      ): void;
    }

    namespace services {
      class Geocoder {
        addressSearch(
          address: string,
          callback: (
            result: AddressSearchResult[],
            status: Status,
          ) => void,
        ): void;
      }

      interface AddressSearchResult {
        address_name: string;
        x: string;
        y: string;
      }

      enum Status {
        OK = "OK",
        ZERO_RESULT = "ZERO_RESULT",
        ERROR = "ERROR",
      }
    }

    interface MapOptions {
      center: LatLng;
      level: number;
    }

    interface MarkerOptions {
      position: LatLng;
      map?: Map;
    }

    interface InfoWindowOptions {
      content: string;
    }

    function load(callback: () => void): void;
  }

  interface Window {
    kakao: {
      maps: typeof kakao.maps;
    };
  }
}

export {};
