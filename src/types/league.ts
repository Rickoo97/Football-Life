export interface LeagueClub {
  id: string;
  name: string;
  reputation: number; // 1-100
  squadStrength: number; // 1-100
  baseBudget: number; // in euros
  country: string;
}

export interface League {
  id: string;
  name: string;
  country: string;
  tier: number;
  clubs: LeagueClub[];
}

export interface LeaguesData {
  leagues: League[];
}
