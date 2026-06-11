// App-wide settings persisted to localStorage.
// Accessed via useSettings() hook from any component.

const SETTINGS_KEY = "learn-dql.settings.v1";

export interface AppSettings {
  // When true, the app will attempt to pull the schema of real logs from the connected
  // DT environment and re-shape seeded sample data to match actual field names/types.
  liveSeedEnabled: boolean;
  // Cached schema snapshot from the last live-seed pull. Null if never fetched.
  liveSeedSchema: LiveSeedSchema | null;
  // ISO timestamp of the last successful live-seed fetch.
  liveSeedFetchedAt: string | null;
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
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const current = loadSettings();
  const updated = { ...current, ...patch };
  saveSettings(updated);
  return updated;
}
