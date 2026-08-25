import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WEEKS_PER_SEASON } from "@/lib/game/constants";
import { useGameStore } from "./game-store";

beforeEach(() => {
  useGameStore.getState().resetGame();
});

describe("playNextWeek", () => {
  it("advances the calendar, refills action points and pays the salary", () => {
    const before = useGameStore.getState();
    before.spendActionPoints(2);

    before.playNextWeek();
    const after = useGameStore.getState();

    expect(after.currentWeek).toBe(before.currentWeek + 1);
    expect(after.actionPoints).toBe(after.maxActionPointsPerWeek);
    expect(after.balance).toBe(before.balance + before.player.weeklySalary);
    expect(after.eventLog.length).toBe(before.eventLog.length + 1);
  });

  it("tracks season stats across matches", () => {
    useGameStore.getState().playNextWeek();
    useGameStore.getState().playNextWeek();

    const { seasonStats } = useGameStore.getState();
    expect(seasonStats.matchesPlayed).toBe(2);
  });

  it("triggers a season transition after week 38 and resets season stats", () => {
    for (let i = 0; i < WEEKS_PER_SEASON; i += 1) {
      useGameStore.getState().playNextWeek();
    }

    const state = useGameStore.getState();
    expect(state.currentWeek).toBe(1);
    expect(state.season).toBe(2027);
    expect(state.pendingSeasonTransition).not.toBeNull();
    expect(state.pendingSeasonTransition?.summary.matchesPlayed).toBe(
      WEEKS_PER_SEASON
    );
    expect(state.seasonStats.matchesPlayed).toBe(0);
    expect(state.seasonStats.startingMarketValue).toBe(state.player.marketValue);
  });
});

describe("resolveSeasonTransition", () => {
  beforeEach(() => {
    for (let i = 0; i < WEEKS_PER_SEASON; i += 1) {
      useGameStore.getState().playNextWeek();
    }
  });

  it("renews the contract at the offered salary and clears the pending transition", () => {
    const offer = useGameStore.getState().pendingSeasonTransition?.contractOffer;
    expect(offer).toBeDefined();

    useGameStore.getState().resolveSeasonTransition({ type: "renew-contract" });

    const state = useGameStore.getState();
    expect(state.pendingSeasonTransition).toBeNull();
    expect(state.player.weeklySalary).toBe(offer!.weeklySalary);
  });

  it("accepts a transfer offer and moves the player to the new club", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);

    // Regenerate the transition with the stubbed RNG so there is guaranteed
    // to be at least one transfer offer to accept.
    useGameStore.getState().resolveSeasonTransition({ type: "reject-all" });
    useGameStore.getState().playNextWeek();
    for (let i = 0; i < WEEKS_PER_SEASON - 1; i += 1) {
      useGameStore.getState().playNextWeek();
    }

    const transition = useGameStore.getState().pendingSeasonTransition;
    expect(transition?.transferOffers.length).toBeGreaterThan(0);
    const offer = transition!.transferOffers[0];

    useGameStore
      .getState()
      .resolveSeasonTransition({ type: "accept-transfer", clubId: offer.clubId });

    const state = useGameStore.getState();
    expect(state.pendingSeasonTransition).toBeNull();
    expect(state.club.id).toBe(offer.clubId);
    expect(state.player.clubId).toBe(offer.clubId);
    expect(state.player.weeklySalary).toBe(offer.weeklySalary);

    randomSpy.mockRestore();
  });

  it("does nothing when there is no pending transition", () => {
    useGameStore.getState().resolveSeasonTransition({ type: "renew-contract" });
    const before = useGameStore.getState();

    useGameStore.getState().resolveSeasonTransition({ type: "renew-contract" });
    const after = useGameStore.getState();

    expect(after).toEqual(before);
  });
});

describe("save slots", () => {
  it("saves, lists, loads and deletes a slot", () => {
    useGameStore.getState().playNextWeek();
    const snapshotWeek = useGameStore.getState().currentWeek;

    const metadata = useGameStore.getState().saveToSlot("Test save");
    expect(metadata).not.toBeNull();
    expect(useGameStore.getState().listSlots().some((slot) => slot.id === metadata!.id)).toBe(
      true
    );

    useGameStore.getState().resetGame();
    expect(useGameStore.getState().currentWeek).toBe(1);

    const success = useGameStore.getState().loadFromSlot(metadata!.id);
    expect(success).toBe(true);
    expect(useGameStore.getState().currentWeek).toBe(snapshotWeek);

    useGameStore.getState().deleteSlot(metadata!.id);
    expect(useGameStore.getState().listSlots().some((slot) => slot.id === metadata!.id)).toBe(
      false
    );
  });

  it("fails to load an unknown slot without throwing", () => {
    expect(useGameStore.getState().loadFromSlot("does-not-exist")).toBe(false);
  });
});

describe("export / import", () => {
  it("round-trips the current state through exportSave/importSave", () => {
    useGameStore.getState().playNextWeek();
    const snapshot = useGameStore.getState();
    const json = snapshot.exportSave();

    useGameStore.getState().resetGame();
    expect(useGameStore.getState().currentWeek).toBe(1);

    const success = useGameStore.getState().importSave(json);
    expect(success).toBe(true);
    expect(useGameStore.getState().currentWeek).toBe(snapshot.currentWeek);
    expect(useGameStore.getState().balance).toBe(snapshot.balance);
  });

  it("rejects garbage input without crashing", () => {
    expect(useGameStore.getState().importSave("not json")).toBe(false);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
