// Google Maps API type declarations

declare global {
  interface Window {
    google: typeof google;
  }
}

declare namespace google {
  namespace maps {
    namespace places {
      interface AutocompleteOptions {
        types?: string[];
        fields?: string[];
        bounds?: LatLngBounds;
        componentRestrictions?: ComponentRestrictions;
        strictBounds?: boolean;
      }

      interface ComponentRestrictions {
        country?: string | string[];
      }

      interface PlaceResult {
        name?: string;
        formatted_address?: string;
        geometry?: {
          location: LatLng;
          viewport?: LatLngBounds;
        };
        place_id?: string;
        [key: string]: any;
      }

      class Autocomplete {
        constructor(inputField: HTMLInputElement, opts?: AutocompleteOptions);
        getPlace(): PlaceResult;
        addListener(event: string, callback: () => void): void;
      }
    }

    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }

    class LatLngBounds {
      constructor(sw?: LatLng, ne?: LatLng);
    }

    namespace event {
      function clearInstanceListeners(instance: any): void;
    }
  }
}

export {};

