"use client";

import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { rewind } from "./geo";
import type { DataIndex, Entity, Shape } from "./types";

export interface YearData {
  year: number;
  /** territories only, for the land and borders layers */
  territories: Shape[];
  /** any drawable shape in this snapshot (territory, realm, state, continent) */
  get: (id: string) => Shape | undefined;
}

let indexPromise: Promise<DataIndex> | null = null;
const yearPromises = new Map<number, Promise<YearData>>();

export function loadIndex(): Promise<DataIndex> {
  if (!indexPromise) {
    indexPromise = fetch("/data/index.json").then((r) => {
      if (!r.ok) throw new Error(`Map index failed to load (${r.status})`);
      return r.json() as Promise<DataIndex>;
    });
    indexPromise.catch(() => {
      indexPromise = null;
    });
  }
  return indexPromise;
}

function decode(topo: Topology, key: string): Shape[] {
  const obj = topo.objects[key];
  if (!obj) return [];
  const fc = feature(topo, obj as GeometryCollection);
  if (fc.type !== "FeatureCollection") return [];
  return fc.features
    .filter((f) => f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"))
    .map((f) => rewind(f as Shape));
}

/**
 * Territories are decoded right away (they are drawn immediately).
 * Realms, states and continents are decoded the first time one is asked for.
 */
function makeYearData(year: number, topo: Topology): YearData {
  const territories = decode(topo, "t");
  const byId = new Map<string, Shape>(territories.map((s) => [String(s.id), s]));
  const lazyKeys = Object.keys(topo.objects).filter((k) => k !== "t");
  let lazyDone = false;
  return {
    year,
    territories,
    get(id) {
      const hit = byId.get(id);
      if (hit || lazyDone) return hit;
      for (const k of lazyKeys) for (const s of decode(topo, k)) byId.set(String(s.id), s);
      lazyDone = true;
      return byId.get(id);
    },
  };
}

export function loadYear(year: number): Promise<YearData> {
  let p = yearPromises.get(year);
  if (!p) {
    p = fetch(`/data/years/${year}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Map for ${year} failed to load (${r.status})`);
        return r.json() as Promise<Topology>;
      })
      .then((topo) => makeYearData(year, topo));
    yearPromises.set(year, p);
    p.catch(() => yearPromises.delete(year));
  }
  return p;
}

export function entityMap(index: DataIndex): Map<string, Entity> {
  return new Map(index.entities.map((e) => [e.i, e]));
}
