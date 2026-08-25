import { describe, expect, it } from "vitest";

import {
  AGENT_DIALOGUE_CATEGORIES,
  agentDialogues,
  fillAgentDialogue,
  isAgentDialogue,
  pickAgentDialogue,
} from "./agentDialogues";

describe("agentDialogues", () => {
  it("has the four negotiation categories, each with several lines", () => {
    expect(AGENT_DIALOGUE_CATEGORIES).toEqual([
      "greedy",
      "lowball",
      "success",
      "collapsed",
    ]);

    for (const category of AGENT_DIALOGUE_CATEGORIES) {
      expect(agentDialogues[category].length).toBeGreaterThanOrEqual(8);
      for (const line of agentDialogues[category]) {
        expect(line.trim().length).toBeGreaterThan(20);
      }
    }
  });

  it("fills the club placeholder", () => {
    const filled = fillAgentDialogue("Welkom bij {club}.", { club: "London Athletic" });
    expect(filled).toBe("Welkom bij London Athletic.");
  });

  it("picks a line from the requested category, reproducibly", () => {
    const first = pickAgentDialogue("lowball", () => 0, { club: "SC Veendam" });
    const second = pickAgentDialogue("lowball", () => 0, { club: "SC Veendam" });

    expect(first).toBe(second);
    expect(isAgentDialogue("lowball", first, { club: "SC Veendam" })).toBe(true);
    expect(isAgentDialogue("greedy", first, { club: "SC Veendam" })).toBe(false);
    expect(first).toContain("SC Veendam");
  });

  it("never returns an empty line for any category", () => {
    for (const category of AGENT_DIALOGUE_CATEGORIES) {
      const line = pickAgentDialogue(category, () => 0.99, { club: "Test FC" });
      expect(line.length).toBeGreaterThan(0);
      expect(isAgentDialogue(category, line, { club: "Test FC" })).toBe(true);
    }
  });
});
