/**
 * Types for the local save/load system: named save slots stored in
 * LocalStorage, and the JSON envelope used to export/import a save.
 */

import type { GameState } from "@/types/game";

/** Lightweight info about a save slot, cheap to list without loading the full state. */
export interface SaveSlotMetadata {
  id: string;
  label: string;
  /** ISO-8601 timestamp of when this slot was last written. */
  savedAt: string;
  season: number;
  week: number;
  playerName: string;
  clubName: string;
  balance: number;
}

/** What is actually stored in LocalStorage for a save slot. */
export interface SaveSlotPayload {
  formatVersion: number;
  metadata: SaveSlotMetadata;
  state: GameState;
}

/** The JSON envelope produced by "export as JSON" / consumed by "import". */
export interface GameExportPayload {
  formatVersion: number;
  exportedAt: string;
  label: string;
  state: GameState;
}
