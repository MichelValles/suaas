import type { Profile } from "@/lib/profiles";

export type Range = [number, number];

export type ProfileFilters = {
  text: string; // palabras separadas por espacio = AND, "contiene" insensible a mayúsculas/acentos
  age: Range;
  openness: Range;
  conscientiousness: Range;
  extraversion: Range;
  agreeableness: Range;
  neuroticism: Range;
};

export const DEFAULT_FILTERS: ProfileFilters = {
  text: "",
  age: [0, 120],
  openness: [0, 1],
  conscientiousness: [0, 1],
  extraversion: [0, 1],
  agreeableness: [0, 1],
  neuroticism: [0, 1],
};

export function isDefaultFilters(f: ProfileFilters): boolean {
  return (
    f.text.trim() === "" &&
    eq(f.age, [0, 120]) &&
    eq(f.openness, [0, 1]) &&
    eq(f.conscientiousness, [0, 1]) &&
    eq(f.extraversion, [0, 1]) &&
    eq(f.agreeableness, [0, 1]) &&
    eq(f.neuroticism, [0, 1])
  );
}
function eq(a: Range, b: Range): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function filterProfiles(profiles: Profile[], f: ProfileFilters): Profile[] {
  const words = normalize(f.text)
    .split(" ")
    .filter((w) => w.length > 0);

  return profiles.filter((p) => {
    const age = p.demographics.age;
    if (age < f.age[0] || age > f.age[1]) return false;
    if (p.big_five.openness < f.openness[0] || p.big_five.openness > f.openness[1]) return false;
    if (
      p.big_five.conscientiousness < f.conscientiousness[0] ||
      p.big_five.conscientiousness > f.conscientiousness[1]
    )
      return false;
    if (
      p.big_five.extraversion < f.extraversion[0] ||
      p.big_five.extraversion > f.extraversion[1]
    )
      return false;
    if (
      p.big_five.agreeableness < f.agreeableness[0] ||
      p.big_five.agreeableness > f.agreeableness[1]
    )
      return false;
    if (
      p.big_five.neuroticism < f.neuroticism[0] ||
      p.big_five.neuroticism > f.neuroticism[1]
    )
      return false;

    if (words.length > 0) {
      // texto buscable: name, occupation, gender, income_band, geo, barreras COM-B,
      // source. NO incluye backstory.
      const haystack = normalize(
        [
          p.name,
          p.demographics.occupation,
          p.demographics.gender,
          p.demographics.income_band ?? "",
          p.demographics.geo ?? "",
          (p.com_b_barriers.capability ?? []).join(" "),
          (p.com_b_barriers.opportunity ?? []).join(" "),
          (p.com_b_barriers.motivation ?? []).join(" "),
          p.source ?? "",
        ]
          .filter(Boolean)
          .join(" "),
      );
      for (const w of words) {
        if (!haystack.includes(w)) return false;
      }
    }
    return true;
  });
}
