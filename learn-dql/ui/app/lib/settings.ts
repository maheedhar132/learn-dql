// App-wide settings persisted to localStorage.
// Accessed via useSettings() hook from any component.

import type { DQLRecord } from "./types/dql";

const SETTINGS_KEY = "learn-dql.settings.v1";

export interface AppSettings {
  // When true, the app will attempt to pull the schema of real logs from the connected
  // DT environment and re-shape seeded sample data to match actual field names/types.
  liveSeedEnabled: boolean;
  // Cached schema snapshot from the last live-seed pull. Null if never fetched.
  liveSeedSchema: LiveSeedSchema | null;
  // ISO timestamp of the last successful live-seed fetch.
  liveSeedFetchedAt: string | null;
  // 1000 synthetically-generated records derived from the live field scan.
  liveSeedRecords: DQLRecord[] | null;
  // User-supplied DQL override for the Sandbox "My environment" dataset.
  customSeedQuery: string | null;
  // Raw records returned by the custom query (≤10).
  customSeedRecords: DQLRecord[] | null;
  // ISO timestamp of the last successful custom-seed fetch.
  customSeedFetchedAt: string | null;
}

export interface LiveSeedField {
  name: string;
  type: "string" | "long" | "double" | "boolean" | "timestamp";
  sampleValues: (string | number | boolean)[];
}

export interface LiveSeedSchema {
  // Fields discovered from the live environment's logs
  logFields: LiveSeedField[];
  // Fields discovered from spans
  spanFields: LiveSeedField[];
  // Total records sampled (used for display)
  recordsSampled: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  liveSeedEnabled: false,
  liveSeedSchema: null,
  liveSeedFetchedAt: null,
  liveSeedRecords: null,
  customSeedQuery: null,
  customSeedRecords: null,
  customSeedFetchedAt: null,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    throw new Error(`Failed to save settings: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const current = loadSettings();
  const updated = { ...current, ...patch };
  saveSettings(updated);
  return updated;
}
