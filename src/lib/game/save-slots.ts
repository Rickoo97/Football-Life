import { mergePersistedGameState } from "@/lib/game/persistence";
import { createInitialGameState } from "@/lib/mock-data";
import type { GameState } from "@/types/game";
import type {
  GameExportPayload,
  SaveSlotMetadata,
  SaveSlotPayload,
} from "@/types/save";

const SAVE_FORMAT_VERSION = 1;

/** Prefix every save-slot key in LocalStorage so they can be listed by scanning. */
export const SAVE_SLOT_PREFIX = "football-life-sim:slot:";

/**
 * Minimal Web Storage-shaped interface. Functions in this module accept an
 * explicit `storage` so they stay pure and testable without a DOM/jsdom
 * environment; the default falls back to the real browser LocalStorage.
 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  readonly length: number;
  key(index: number): string | null;
}

/**
 * Resolves the real LocalStorage when running in a browser. Returns `null`
 * during SSR, in environments without storage, or when access throws (e.g.
 * some browsers in private mode).
 */
export function getBrowserStorage(): StorageLike | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    return localStorage;
  } catch {
    return null;
  }
}

function generateSlotId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `slot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildMetadata(state: GameState, id: string, label: string): SaveSlotMetadata {
  return {
    id,
    label,
    savedAt: new Date().toISOString(),
    season: state.season,
    week: state.currentWeek,
    playerName: state.player.name,
    clubName: state.club.name,
    balance: state.balance,
  };
}

/** Writes the given state to a named save slot, creating a new one if `id` is omitted. */
export function writeSaveSlot(
  state: GameState,
  label: string,
  options: { id?: string; storage?: StorageLike | null } = {}
): SaveSlotMetadata | null {
  const storage =
    "storage" in options ? options.storage : getBrowserStorage();
  if (!storage) {
    return null;
  }

  const id = options.id ?? generateSlotId();
  const metadata = buildMetadata(state, id, label.trim() || "Naamloze save");
  const payload: SaveSlotPayload = {
    formatVersion: SAVE_FORMAT_VERSION,
    metadata,
    state,
  };

  try {
    storage.setItem(`${SAVE_SLOT_PREFIX}${id}`, JSON.stringify(payload));
    return metadata;
  } catch {
    return null;
  }
}

/** Lists every save slot's metadata, most recently saved first. */
export function listSaveSlots(
  storage: StorageLike | null = getBrowserStorage()
): SaveSlotMetadata[] {
  if (!storage) {
    return [];
  }

  const slots: SaveSlotMetadata[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || !key.startsWith(SAVE_SLOT_PREFIX)) {
      continue;
    }

    const raw = storage.getItem(key);
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<SaveSlotPayload>;
      if (parsed?.metadata) {
        slots.push(parsed.metadata);
      }
    } catch {
      // Corrupted entry, skip it rather than crashing the whole list.
    }
  }

  return slots.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}

/** Reads and repairs a save slot's state. Returns `null` if it doesn't exist or is corrupted. */
export function readSaveSlot(
  id: string,
  storage: StorageLike | null = getBrowserStorage()
): GameState | null {
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(`${SAVE_SLOT_PREFIX}${id}`);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SaveSlotPayload>;
    if (!parsed?.state) {
      return null;
    }
    return mergePersistedGameState(parsed.state, createInitialGameState());
  } catch {
    return null;
  }
}

export function deleteSaveSlot(
  id: string,
  storage: StorageLike | null = getBrowserStorage()
): void {
  storage?.removeItem(`${SAVE_SLOT_PREFIX}${id}`);
}

/** Serializes a state to a portable JSON string the player can download. */
export function exportGameStateToJson(
  state: GameState,
  label = "Football Life Sim save"
): string {
  const payload: GameExportPayload = {
    formatVersion: SAVE_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    label,
    state,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Parses and repairs an exported save. Accepts both the wrapped export
 * envelope (`{ state: GameState }`) and a bare `GameState` object, so saves
 * exported by this app and hand-edited/legacy files both work.
 */
export function importGameStateFromJson(json: string): GameState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Ongeldig JSON-bestand: het kon niet worden gelezen.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Ongeldig save-bestand: verwacht een JSON-object.");
  }

  const record = parsed as Record<string, unknown>;
  const rawState =
    record.state && typeof record.state === "object" ? record.state : record;

  if (!rawState || typeof rawState !== "object" || !("player" in rawState)) {
    throw new Error("Ongeldig save-bestand: spelerdata ontbreekt.");
  }

  return mergePersistedGameState(rawState, createInitialGameState());
}
