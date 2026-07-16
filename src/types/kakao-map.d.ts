declare global {
  namespace kakao.maps {
    class LatLng {
      constructor(latitude: number, longitude: number);
      getLat(): number;
      getLng(): number;
    }

    class Size {
      constructor(width: number, height: number);
    }

    class Point {
      constructor(x: number, y: number);
    }

    class MarkerImage {
      constructor(src: string, size: Size, options?: MarkerImageOptions);
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
        target: Marker | Map,
        type: string,
        handler: (event?: { latLng: LatLng }) => void,
      ): void;
      function removeListener(
        target: Marker | Map,
        type: string,
        handler: (event?: { latLng: LatLng }) => void,
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
        coord2Address(
          longitude: number,
          latitude: number,
          callback: (
            result: CoordinateAddressResult[],
            status: Status,
          ) => void,
        ): void;
      }

      interface AddressSearchResult {
        address_name: string;
        x: string;
        y: string;
      }

      interface CoordinateAddressResult {
        address?: {
          address_name?: string;
        };
        road_address?: {
          address_name?: string;
        };
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

    interface MarkerImageOptions {
      offset?: Point;
    }

    interface MarkerOptions {
      position: LatLng;
      image?: MarkerImage;
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
