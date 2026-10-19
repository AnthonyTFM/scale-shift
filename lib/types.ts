import type { Feature, MultiPolygon, Polygon } from "geojson";

/** t = territory/country, r = realm (a power plus everything it claimed), s = state/province, k = continent */
export type EntityKind = "t" | "r" | "s" | "k";

export interface Entity {
  /** stable id (slug) */
  i: string;
  /** display name */
  n: string;
  k: EntityKind;
  /** indexes into DataIndex.years where this entity is mapped */
  y: number[];
  /** true area in km², aligned with y */
  a: number[];
  /** border precision 1 (approximate) … 3 (precise) */
  q: number;
  /** population estimate (today only) */
  p?: number;
  py?: number;
  iso?: string;
  /** state/province type */
  st?: string;
  /** alternate names */
  al?: string[];
}

export interface DataIndex {
  v: number;
  years: number[];
  today: number;
  entities: Entity[];
}

export type Shape = Feature<Polygon | MultiPolygon>;

export interface Overlay {
  uid: string;
  id: string;
  /** year of the shape currently drawn */
  year: number;
  /** follow the timeline when the entity exists in the selected year */
  follow: boolean;
  /** current centre [lon, lat]; null = still at its real location */
  pos: [number, number] | null;
  /** extra rotation in degrees */
  rot: number;
  color: number;
}

export interface MapState {
  year: number;
  overlays: Overlay[];
}
