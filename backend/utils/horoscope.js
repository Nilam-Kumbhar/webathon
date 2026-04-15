/**
 * Horoscope Utility — zodiac sign derivation and compatibility scoring.
 *
 * Compatibility is based on classical element groupings:
 *   Fire  (Aries, Leo, Sagittarius)
 *   Earth (Taurus, Virgo, Capricorn)
 *   Air   (Gemini, Libra, Aquarius)
 *   Water (Cancer, Scorpio, Pisces)
 *
 * Same element    → 90
 * Compatible pair → 75  (Fire↔Air, Earth↔Water)
 * Neutral         → 50
 */

// ─── Zodiac sign from date ──────────────────────────────

const ZODIAC_RANGES = [
  { sign: 'Capricorn',  start: [1, 1],   end: [1, 19] },
  { sign: 'Aquarius',   start: [1, 20],  end: [2, 18] },
  { sign: 'Pisces',     start: [2, 19],  end: [3, 20] },
  { sign: 'Aries',      start: [3, 21],  end: [4, 19] },
  { sign: 'Taurus',     start: [4, 20],  end: [5, 20] },
  { sign: 'Gemini',     start: [5, 21],  end: [6, 20] },
  { sign: 'Cancer',     start: [6, 21],  end: [7, 22] },
  { sign: 'Leo',        start: [7, 23],  end: [8, 22] },
  { sign: 'Virgo',      start: [8, 23],  end: [9, 22] },
  { sign: 'Libra',      start: [9, 23],  end: [10, 22] },
  { sign: 'Scorpio',    start: [10, 23], end: [11, 21] },
  { sign: 'Sagittarius',start: [11, 22], end: [12, 21] },
  { sign: 'Capricorn',  start: [12, 22], end: [12, 31] },
];

export function getZodiacSign(dateOfBirth) {
  const dob = new Date(dateOfBirth);
  const month = dob.getMonth() + 1; // 1-indexed
  const day = dob.getDate();

  for (const range of ZODIAC_RANGES) {
    const [sm, sd] = range.start;
    const [em, ed] = range.end;

    // Check if date falls within range
    const afterStart = month > sm || (month === sm && day >= sd);
    const beforeEnd = month < em || (month === em && day <= ed);

    if (afterStart && beforeEnd) return range.sign;
  }

  return 'Unknown';
}

// ─── Element mapping ────────────────────────────────────

const ELEMENTS = {
  Fire:  ['Aries', 'Leo', 'Sagittarius'],
  Earth: ['Taurus', 'Virgo', 'Capricorn'],
  Air:   ['Gemini', 'Libra', 'Aquarius'],
  Water: ['Cancer', 'Scorpio', 'Pisces'],
};

function getElement(sign) {
  for (const [element, signs] of Object.entries(ELEMENTS)) {
    if (signs.includes(sign)) return element;
  }
  return null;
}

// Compatible element pairs
const COMPATIBLE_PAIRS = new Set(['Fire-Air', 'Air-Fire', 'Earth-Water', 'Water-Earth']);

// ─── Compatibility scoring ──────────────────────────────

export function calculateHoroscopeCompatibility(dob1, dob2) {
  const sign1 = getZodiacSign(dob1);
  const sign2 = getZodiacSign(dob2);
  const element1 = getElement(sign1);
  const element2 = getElement(sign2);

  let score;
  let description;

  if (sign1 === sign2) {
    score = 85;
    description = `Both are ${sign1} — you share the same outlook on life!`;
  } else if (element1 === element2) {
    score = 90;
    description = `${sign1} and ${sign2} belong to the ${element1} element — a naturally harmonious pairing.`;
  } else if (COMPATIBLE_PAIRS.has(`${element1}-${element2}`)) {
    score = 75;
    description = `${sign1} (${element1}) and ${sign2} (${element2}) are complementary elements — great chemistry!`;
  } else {
    score = 50;
    description = `${sign1} and ${sign2} have a neutral compatibility — differences can spark growth.`;
  }

  return {
    sign1,
    sign2,
    element1,
    element2,
    score,
    description,
  };
}
