import { beforeEach, describe, expect, it } from "vitest";

import {
  deleteSaveSlot,
  exportGameStateToJson,
  importGameStateFromJson,
  listSaveSlots,
  readSaveSlot,
  writeSaveSlot,
  type StorageLike,
} from "./save-slots";
import { createInitialGameState } from "@/lib/mock-data";
import { createMemoryStorage } from "@/test/memory-storage";

let storage: StorageLike;

beforeEach(() => {
  storage = createMemoryStorage();
});

describe("writeSaveSlot / readSaveSlot", () => {
  it("round-trips a game state through a save slot", () => {
    const state = createInitialGameState();
    const metadata = writeSaveSlot(state, "Voor de derby", { storage });

    expect(metadata).not.toBeNull();
    expect(metadata?.label).toBe("Voor de derby");
    expect(metadata?.playerName).toBe(state.player.name);
    expect(metadata?.clubName).toBe(state.club.name);

    const loaded = readSaveSlot(metadata!.id, storage);
    expect(loaded).not.toBeNull();
    expect(loaded?.player.name).toBe(state.player.name);
    expect(loaded?.currentWeek).toBe(state.currentWeek);
  });

  it("trims an empty label to a fallback", () => {
    const metadata = writeSaveSlot(createInitialGameState(), "   ", { storage });
    expect(metadata?.label).toBe("Naamloze save");
  });

  it("repairs a legacy save missing newer fields", () => {
    const legacyState = {
      ...createInitialGameState(),
      player: {
        id: "player-you",
        name: "Legacy Speler",
        age: 20,
        position: "ST",
        energy: 80,
        morale: 60,
        attributes: { shooting: 50, passing: 50, physical: 50, pace: 50 },
        marketValue: 500_000,
        weeklySalary: 3_000,
        clubId: "club-fc-utopia",
      },
    };
    delete (legacyState as Record<string, unknown>).seasonStats;

    storage.setItem(
      "football-life-sim:slot:legacy",
      JSON.stringify({
        formatVersion: 1,
        metadata: {
          id: "legacy",
          label: "Oude save",
          savedAt: new Date().toISOString(),
          season: 2025,
          week: 10,
          playerName: "Legacy Speler",
          clubName: "FC Utopia",
          balance: 1000,
        },
        state: legacyState,
      })
    );

    const loaded = readSaveSlot("legacy", storage);
    expect(loaded).not.toBeNull();
    expect(Number.isFinite(loaded?.player.attributes.technique)).toBe(true);
    expect(Number.isFinite(loaded?.player.attributes.stamina)).toBe(true);
    expect(loaded?.seasonStats.matchesPlayed).toBe(0);
  });

  it("returns null for a missing slot or corrupted JSON", () => {
    expect(readSaveSlot("does-not-exist", storage)).toBeNull();

    storage.setItem("football-life-sim:slot:broken", "{not json");
    expect(readSaveSlot("broken", storage)).toBeNull();
  });

  it("returns null and [] when there is no storage available (e.g. during SSR)", () => {
    expect(writeSaveSlot(createInitialGameState(), "x", { storage: null })).toBeNull();
    expect(listSaveSlots(null)).toEqual([]);
    expect(readSaveSlot("anything", null)).toBeNull();
  });
});

describe("listSaveSlots", () => {
  it("lists every slot, most recently saved first", () => {
    const state = createInitialGameState();
    writeSaveSlot(state, "Oudste save", {
      id: "slot-old",
      storage,
    });
    // Force a distinguishable savedAt by writing the payload directly.
    const raw = storage.getItem("football-life-sim:slot:slot-old");
    const parsed = JSON.parse(raw!);
    parsed.metadata.savedAt = "2020-01-01T00:00:00.000Z";
    storage.setItem("football-life-sim:slot:slot-old", JSON.stringify(parsed));

    writeSaveSlot(state, "Nieuwste save", { id: "slot-new", storage });
    const rawNew = storage.getItem("football-life-sim:slot:slot-new");
    const parsedNew = JSON.parse(rawNew!);
    parsedNew.metadata.savedAt = "2030-01-01T00:00:00.000Z";
    storage.setItem("football-life-sim:slot:slot-new", JSON.stringify(parsedNew));

    const slots = listSaveSlots(storage);
    expect(slots.map((slot) => slot.id)).toEqual(["slot-new", "slot-old"]);
  });

  it("ignores unrelated keys and corrupted entries", () => {
    storage.setItem("some-other-app:key", "value");
    storage.setItem("football-life-sim:slot:broken", "not-json");
    expect(listSaveSlots(storage)).toEqual([]);
  });
});

describe("deleteSaveSlot", () => {
  it("removes a slot so it no longer appears or loads", () => {
    const metadata = writeSaveSlot(createInitialGameState(), "Te verwijderen", {
      storage,
    });

    deleteSaveSlot(metadata!.id, storage);

    expect(readSaveSlot(metadata!.id, storage)).toBeNull();
    expect(listSaveSlots(storage)).toEqual([]);
  });
});

describe("exportGameStateToJson / importGameStateFromJson", () => {
  it("round-trips a state through the export/import envelope", () => {
    const state = createInitialGameState();
    const json = exportGameStateToJson(state, "Mijn export");

    const imported = importGameStateFromJson(json);
    expect(imported.player.name).toBe(state.player.name);
    expect(imported.club.name).toBe(state.club.name);
    expect(imported.currentWeek).toBe(state.currentWeek);
    expect(imported.seasonStats).toEqual(state.seasonStats);
  });

  it("also accepts a bare GameState without the export envelope", () => {
    const state = createInitialGameState();
    const imported = importGameStateFromJson(JSON.stringify(state));
    expect(imported.player.name).toBe(state.player.name);
  });

  it("throws a descriptive error for invalid JSON", () => {
    expect(() => importGameStateFromJson("{not valid")).toThrow(/Ongeldig JSON/);
  });

  it("throws a descriptive error when player data is missing", () => {
    expect(() => importGameStateFromJson(JSON.stringify({ foo: "bar" }))).toThrow(
      /spelerdata ontbreekt/
    );
  });
});
