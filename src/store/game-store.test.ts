import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WEEKS_PER_SEASON } from "@/lib/game/constants";
import { computeWageCeiling } from "@/lib/game/negotiation";
import { useGameStore } from "./game-store";
import type { NegotiatingClub } from "@/types/negotiation";

const NEGOTIATION_CLUB: NegotiatingClub = {
  id: "club-negotiation-test",
  name: "FC Negotiation Test",
  division: "premier_league",
  country: "England",
  reputation: 85,
  squadStrength: 84,
  baseBudget: 150_000_000,
};

beforeEach(() => {
  useGameStore.getState().resetGame();
});

describe("createCareer", () => {
  it("stores the player from the onboarding form and marks the career as started", () => {
    useGameStore.getState().createCareer({
      firstName: "Sem",
      lastName: "de Vries",
      nationality: "NL",
      position: "attacker",
    });

    const state = useGameStore.getState();
    expect(state.careerStarted).toBe(true);
    expect(state.player.name).toBe("Sem de Vries");
    expect(state.player.nationality).toBe("NL");
    expect(state.player.position).toBe("ST");
    expect(state.player.attributes.shooting).toBeGreaterThan(
      state.player.attributes.defending
    );
    expect(state.player.clubId).toBe(state.club.id);
  });

  it("generates opposite profiles for a defender and an attacker", () => {
    useGameStore.getState().createCareer({
      firstName: "Ruud",
      lastName: "Bakker",
      nationality: "NL",
      position: "defender",
    });
    const defender = useGameStore.getState().player;

    useGameStore.getState().createCareer({
      firstName: "Ruud",
      lastName: "Bakker",
      nationality: "NL",
      position: "attacker",
    });
    const attacker = useGameStore.getState().player;

    expect(defender.attributes.defending).toBeGreaterThan(
      attacker.attributes.defending
    );
    expect(attacker.attributes.shooting).toBeGreaterThan(
      defender.attributes.shooting
    );
  });

  it("wipes the previous save instead of continuing it", () => {
    useGameStore.getState().playNextWeek();
    useGameStore.getState().playNextWeek();

    useGameStore.getState().createCareer({
      firstName: "Nieuwe",
      lastName: "Start",
      nationality: "BE",
      position: "midfielder",
    });

    const state = useGameStore.getState();
    expect(state.currentWeek).toBe(1);
    expect(state.seasonStats.matchesPlayed).toBe(0);
    expect(state.lastMatchReport).toBeNull();
    expect(state.eventLog).toHaveLength(1);
    expect(state.seasonStats.startingMarketValue).toBe(state.player.marketValue);
  });
});

describe("resetGame", () => {
  it("sends the player back to onboarding", () => {
    useGameStore.getState().createCareer({
      firstName: "Sem",
      lastName: "de Vries",
      nationality: "NL",
      position: "attacker",
    });

    useGameStore.getState().resetGame();
    expect(useGameStore.getState().careerStarted).toBe(false);
  });
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

describe("negotiation", () => {
  it("starts a negotiation with the club's opening bid", () => {
    useGameStore.getState().startNegotiation(NEGOTIATION_CLUB);

    const { activeNegotiation } = useGameStore.getState();
    expect(activeNegotiation).not.toBeNull();
    expect(activeNegotiation?.club.id).toBe(NEGOTIATION_CLUB.id);
    expect(activeNegotiation?.patience).toBe(100);
    expect(activeNegotiation?.history).toHaveLength(1);
  });

  it("lowers patience more for a wildly unrealistic counter-offer", () => {
    useGameStore.getState().startNegotiation(NEGOTIATION_CLUB);
    const ceiling = computeWageCeiling(NEGOTIATION_CLUB);

    useGameStore.getState().submitCounterOffer({
      weeklySalary: ceiling * 10,
      contractDurationYears: 5,
      signingBonus: ceiling * 50,
      goalBonus: ceiling * 2,
    });

    const state = useGameStore.getState();
    expect(state.activeNegotiation?.patience).toBeLessThan(100);
  });

  it("collapses the deal once patience hits zero after repeated overreach", () => {
    useGameStore.getState().startNegotiation(NEGOTIATION_CLUB);
    const ceiling = computeWageCeiling(NEGOTIATION_CLUB);
    const outrageousAsk = {
      weeklySalary: ceiling * 20,
      contractDurationYears: 5,
      signingBonus: ceiling * 100,
      goalBonus: ceiling * 5,
    };

    for (let round = 0; round < 10; round += 1) {
      if (useGameStore.getState().activeNegotiation?.outcome !== "in_progress") {
        break;
      }
      useGameStore.getState().submitCounterOffer(outrageousAsk);
    }

    const state = useGameStore.getState();
    expect(state.activeNegotiation?.outcome).toBe("walked_away");
    expect(state.activeNegotiation?.patience).toBe(0);
  });

  it("switches the player to the new club immediately when a deal is accepted", () => {
    useGameStore.getState().startNegotiation(NEGOTIATION_CLUB);
    const offer = useGameStore.getState().activeNegotiation?.history[0].terms;
    expect(offer).toBeDefined();

    const balanceBefore = useGameStore.getState().balance;
    useGameStore.getState().acceptNegotiation();

    const state = useGameStore.getState();
    expect(state.club.id).toBe(NEGOTIATION_CLUB.id);
    expect(state.player.clubId).toBe(NEGOTIATION_CLUB.id);
    expect(state.player.weeklySalary).toBe(offer!.weeklySalary);
    expect(state.balance).toBe(balanceBefore + offer!.signingBonus);
    expect(state.activeNegotiation?.outcome).toBe("accepted");

    useGameStore.getState().dismissNegotiation();
    expect(useGameStore.getState().activeNegotiation).toBeNull();
  });

  it("leaves the player at their current club after walking away", () => {
    useGameStore.getState().startNegotiation(NEGOTIATION_CLUB);
    const clubBefore = useGameStore.getState().club.id;

    useGameStore.getState().walkAwayFromNegotiation();

    const state = useGameStore.getState();
    expect(state.club.id).toBe(clubBefore);
    expect(state.activeNegotiation?.outcome).toBe("walked_away");

    useGameStore.getState().dismissNegotiation();
    expect(useGameStore.getState().activeNegotiation).toBeNull();
  });

  it("scouts a random interested club from the leagues database", () => {
    const found = useGameStore.getState().startRandomNegotiation();

    expect(found).toBe(true);
    const { activeNegotiation } = useGameStore.getState();
    expect(activeNegotiation).not.toBeNull();
    expect(activeNegotiation?.club.id).not.toBe(useGameStore.getState().club.id);
  });

  it("does nothing when submitting a counter-offer without an active negotiation", () => {
    const before = useGameStore.getState();
    useGameStore.getState().submitCounterOffer({
      weeklySalary: 1000,
      contractDurationYears: 1,
      signingBonus: 0,
      goalBonus: 0,
    });
    const after = useGameStore.getState();

    expect(after).toEqual(before);
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
