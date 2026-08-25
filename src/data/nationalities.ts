/**
 * Nationalities offered in the "New Game" onboarding form. Deliberately a
 * short list of well-known football countries rather than every ISO country,
 * so the dropdown stays scannable.
 */

export interface Nationality {
  /** ISO 3166-1 alpha-2 country code, stored on the player. */
  code: string;
  /** Dutch country name shown in the dropdown. */
  label: string;
  flag: string;
}

export const NATIONALITIES: readonly Nationality[] = [
  { code: "NL", label: "Nederland", flag: "🇳🇱" },
  { code: "BE", label: "België", flag: "🇧🇪" },
  { code: "DE", label: "Duitsland", flag: "🇩🇪" },
  { code: "EN", label: "Engeland", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { code: "FR", label: "Frankrijk", flag: "🇫🇷" },
  { code: "ES", label: "Spanje", flag: "🇪🇸" },
  { code: "PT", label: "Portugal", flag: "🇵🇹" },
  { code: "IT", label: "Italië", flag: "🇮🇹" },
  { code: "BR", label: "Brazilië", flag: "🇧🇷" },
  { code: "AR", label: "Argentinië", flag: "🇦🇷" },
  { code: "HR", label: "Kroatië", flag: "🇭🇷" },
  { code: "MA", label: "Marokko", flag: "🇲🇦" },
  { code: "SN", label: "Senegal", flag: "🇸🇳" },
  { code: "JP", label: "Japan", flag: "🇯🇵" },
  { code: "US", label: "Verenigde Staten", flag: "🇺🇸" },
] as const;

export const NATIONALITY_CODES = NATIONALITIES.map(
  (nationality) => nationality.code
);

export function findNationality(code: string): Nationality | undefined {
  return NATIONALITIES.find((nationality) => nationality.code === code);
}

/** Country name for a code, falling back to the raw code for old saves. */
export function getNationalityLabel(code: string): string {
  return findNationality(code)?.label ?? code;
}
