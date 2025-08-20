// Google Maps TypeScript declarations
declare global {
  namespace google {
    namespace maps {
      class Map {
        constructor(mapDiv: HTMLElement, opts?: MapOptions);
      }
      
      class Marker {
        constructor(opts?: MarkerOptions);
        setMap(map: Map | null): void;
        addListener(eventName: string, handler: () => void): void;
      }
      
      class InfoWindow {
        constructor(opts?: InfoWindowOptions);
        open(map: Map, anchor?: Marker): void;
        close(): void;
      }
      
      interface MapOptions {
        center: LatLng | LatLngLiteral;
        zoom: number;
        styles?: MapTypeStyle[];
        mapTypeControl?: boolean;
        mapTypeControlOptions?: MapTypeControlOptions;
        zoomControl?: boolean;
        zoomControlOptions?: ZoomControlOptions;
        scaleControl?: boolean;
        streetViewControl?: boolean;
        streetViewControlOptions?: StreetViewControlOptions;
        fullscreenControl?: boolean;
      }
      
      interface MarkerOptions {
        position: LatLng | LatLngLiteral;
        map: Map;
        icon?: Icon | Symbol | string;
        title?: string;
        animation?: Animation;
      }
      
      interface InfoWindowOptions {
        content?: string | HTMLElement;
      }
      
      interface LatLngLiteral {
        lat: number;
        lng: number;
      }
      
      interface LatLng {
        lat(): number;
        lng(): number;
      }
      
      interface Icon {
        url: string;
        size?: Size;
        origin?: Point;
        anchor?: Point;
        scaledSize?: Size;
      }
      
      interface Symbol {
        path: SymbolPath | string;
        fillColor?: string;
        fillOpacity?: number;
        strokeColor?: string;
        strokeWeight?: number;
        scale?: number;
      }
      
      interface Size {
        width: number;
        height: number;
      }
      
      interface Point {
        x: number;
        y: number;
      }
      
      enum SymbolPath {
        CIRCLE = 0,
        FORWARD_CLOSED_ARROW = 1,
        FORWARD_OPEN_ARROW = 2,
        BACKWARD_CLOSED_ARROW = 3,
        BACKWARD_OPEN_ARROW = 4
      }
      
      enum Animation {
        BOUNCE = 1,
        DROP = 2
      }
      
      enum ControlPosition {
        BOTTOM_CENTER = 11,
        BOTTOM_LEFT = 10,
        BOTTOM_RIGHT = 12,
        LEFT_BOTTOM = 6,
        LEFT_CENTER = 4,
        LEFT_TOP = 5,
        RIGHT_BOTTOM = 9,
        RIGHT_CENTER = 8,
        RIGHT_TOP = 7,
        TOP_CENTER = 2,
        TOP_LEFT = 1,
        TOP_RIGHT = 3
      }
      
      interface MapTypeControlOptions {
        mapTypeIds?: (MapTypeId | string)[];
        position?: ControlPosition;
        style?: MapTypeControlStyle;
      }
      
      interface ZoomControlOptions {
        position?: ControlPosition;
      }
      
      interface StreetViewControlOptions {
        position?: ControlPosition;
      }
      
      enum MapTypeControlStyle {
        DEFAULT = 0,
        DROPDOWN_MENU = 2,
        HORIZONTAL_BAR = 1
      }
      
      enum MapTypeId {
        HYBRID = "hybrid",
        ROADMAP = "roadmap",
        SATELLITE = "satellite",
        TERRAIN = "terrain"
      }
      
      interface MapTypeStyle {
        elementType?: string;
        featureType?: string;
        stylers: MapTypeStyler[];
      }
      
      interface MapTypeStyler {
        color?: string;
        gamma?: number;
        hue?: string;
        invert_lightness?: boolean;
        lightness?: number;
        saturation?: number;
        visibility?: string;
        weight?: number;
      }
    }
  }
}

export {};
