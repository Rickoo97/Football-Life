/**
 * Zaakwaarnemer-reacties tijdens contractonderhandelingen.
 *
 * Tone-of-voice: professioneel, licht sarcastisch, zoals een topmakelaar
 * (Raiola / Mendes) die de tafel bewaakt — nooit luidruchtig, wel scherp.
 *
 * `{club}` wordt vervangen door de clubnaam van de lopende onderhandeling.
 */

export const AGENT_DIALOGUE_CATEGORIES = [
  "greedy",
  "lowball",
  "success",
  "collapsed",
] as const;

export type AgentDialogueCategory = (typeof AGENT_DIALOGUE_CATEGORIES)[number];

export interface AgentDialogueVars {
  club?: string;
}

/**
 * Greedy: de speler vraagt veel te veel.
 * Lowball: de club opent met een belachelijk laag bod.
 * Success: droomtransfer rond.
 * Collapsed: gesprek stukgelopen door treuzelen of te hoge eisen.
 */
export const agentDialogues: Record<AgentDialogueCategory, readonly string[]> = {
  greedy: [
    "Luister even. Jij vraagt een salaris waar {club} hun hele middenveld van kan betalen. Ik verkoop dromen, geen sprookjes.",
    "Ik heb respect voor zelfvertrouwen, maar dit is geen onderhandeling meer — dit is een gijzeling. Zet het bij.",
    "De directeur van {club} keek me aan of ik een grapje maakte. Ik lachte niet. Jij ook niet, hoop ik.",
    "Mooi dat je jezelf zo waardeert. De markt waardeert je iets nuchterder. Dit bedrag krijgt zelfs ik niet door hun raad van bestuur.",
    "Ik doe dit werk al lang genoeg om te weten wanneer een eis de tafel laat kantelen. Je bent er nu.",
    "Jij bent geen uitzondering op de begroting. {club} betaalt prestaties, geen ego. Haal een nul van dat weekloon.",
    "Als je zo blijft inzetten, hang ik op vóór zij het doen. Dat is geen dreigement, dat is hygiëne.",
    "Ik kan veel, maar ik kan geen wonderen factureren. Dit verzoek is een belediging voor hun rekenmachine — en voor mijn reputatie.",
    "We spelen poker, geen roulette. Met deze inzet loop je de kluis leeg voordat de eerste chip valt.",
    "Ik heb clubs grotere namen zien weigeren voor minder. Jij bent goed. Je bent niet ónbetaalbaar. Onthoud het verschil.",
  ],
  lowball: [
    "Dit bod van {club} is geen opening, het is een belediging met briefhoofd. Ik heb gevraagd of ze per ongeluk het jeugdcontract hebben meegestuurd.",
    "Ze bieden je een fooi en verwachten dankbaarheid. Zeg maar dat ik lachte. Kort.",
    "Ik ken hun begroting. Dit is geen zuinigheid, dit is een test of jij naïef bent. Spoiler: zolang ik erbij zit, ben je dat niet.",
    "Serieus? {club} durft dit over de tafel te schuiven? Ik heb hun directeur laten weten dat we niet voor kleingeld komen opdagen.",
    "Dit salaris is een rondleiding door hun trainingsterrein, geen contract. Ze mogen het opnieuw proberen — serieus, dit keer.",
    "Ik heb ergere lowballs gezien, maar niet bij een club die zichzelf serieus neemt. {club} moet beter weten.",
    "Ze openen alsof je nog in de beloften speelt. Charmant. Ik heb het bod teruggestuurd met een vraagteken erop.",
    "Als dit hun eerste zet is, spelen ze poker met knikkers. Laat ze maar zweten; wij blijven zitten.",
    "Ik vertel je dit omdat je het verdient te horen: dit bod is belachelijk. Mijn advies is kort: niet tekenen, niet knipperen, niet bedanken.",
    "{club} probeert te kijken hoe ver ze kunnen gaan. Antwoord: niet zo ver. Ik heb al gezegd dat we dit gesprek pas voortzetten met echte cijfers.",
  ],
  success: [
    "Getekend. Welkom bij {club}. Ik heb het contract drie keer laten nalopen — het enige wat jij nog moet doen, is scoren.",
    "Dit is de transfer waar we naartoe hebben gewerkt. Champagne later. Eerst de medische keuring, dan de foto's, dan het werk.",
    "Ik zei je dat het ging lukken. {club} heeft betaald, jij hebt status, en ik heb weer een verhaal voor het diner.",
    "Handtekening gezet, telefoon uit. Dit is geen toeval, dit is vakwerk. Geniet er kort van — maandag begint de druk.",
    "Droomtransfer afgerond. Ik heb hun laatste twijfel de deur uit gewerkt. Jij loopt straks die kleedkamer in als iemand die erbij hoort.",
    "Mooi. {club} wilde je, wij hebben de prijs laten kloppen. Dat is hoe dit vak werkt: geduld, druk, en op het juiste moment ja zeggen.",
    "De deal is rond. Geen asterisk, geen kleine letter die ik heb laten liggen. Ga daar presteren, dan bel ik volgend jaar opnieuw.",
    "Ik hou niet van grote woorden, maar dit is er een: gelukt. {club} heeft getekend, jij ook. De markt heeft het gezien.",
    "Van openingsbelediging tot handtekening. Onthoud hoe dat voelt — en onthoud wie de tafel overeind hield.",
    "Gefeliciteerd. Niet omdat het makkelijk was, maar omdat we niet zijn weggegaan toen het lastig werd. {club} is nu jouw club.",
  ],
  collapsed: [
    "Het is klaar. {club} heeft opgehangen. Volgende keer niet drie weken nadenken over een komma in je weekloon.",
    "Gefeliciteerd: je hebt een serieuze club weggejaagd met een eis die zelfs ik niet durfde te herhalen.",
    "De tafel is leeg. Niet omdat {club} geen geld had — omdat jij te lang deed alsof de wereld op jou wachtte.",
    "Ik kan veel redden. Een opgeblazen ego en een dode lijn, dat niet. Dit gesprek is voorbij.",
    "Ze zijn klaar met ons. Ik ook, even. Treuzelen is geen strategie, het is een manier om deuren te laten dichtvallen.",
    "{club} trekt het bod in. Ik had je gewaarschuwd: te hoge eisen, te weinig beweging. De markt onthoudt dit soort avonden.",
    "Einde oefening. Jij wilde alles, zij wilden een speler die ja kan zeggen. Raad eens wie er nu zonder contract zit.",
    "Ik heb hun directeur nog één keer gebeld. Hij nam niet op. Dat is het antwoord. Pak je tas, we gaan door.",
    "Dit had een transfer kunnen zijn. In plaats daarvan is het een les: timing is geld, en jij hebt te lang geteld.",
    "Onderhandelingen stukgelopen. Niet dramatisch, gewoon onnodig. Volgende club, scherper, sneller — of ik ga alleen.",
  ],
};

/** Overreach at or above this is treated as a greedy ask in the negotiation engine. */
export const GREEDY_OVERREACH_THRESHOLD = 0.6;

export function fillAgentDialogue(
  template: string,
  vars: AgentDialogueVars = {}
): string {
  return template.replace(/\{club\}/g, vars.club ?? "de club");
}

export function pickAgentDialogue(
  category: AgentDialogueCategory,
  random: () => number = Math.random,
  vars: AgentDialogueVars = {}
): string {
  const lines = agentDialogues[category];
  const index = Math.min(lines.length - 1, Math.floor(random() * lines.length));
  return fillAgentDialogue(lines[index], vars);
}

export function isAgentDialogue(
  category: AgentDialogueCategory,
  message: string,
  vars: AgentDialogueVars = {}
): boolean {
  return agentDialogues[category].some(
    (line) => fillAgentDialogue(line, vars) === message
  );
}
