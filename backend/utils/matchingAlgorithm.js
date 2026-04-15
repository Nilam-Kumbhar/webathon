/**
 * Matching Algorithm — scores compatibility between two user profiles.
 *
 * Scoring weights (total = 100):
 *   Age compatibility   → 25 pts
 *   Location proximity  → 30 pts
 *   Interests overlap   → 25 pts
 *   Education match     → 20 pts
 *
 * Each sub-scorer returns a value between 0 and 1 which is then multiplied
 * by the weight.  The final score is rounded to the nearest integer.
 */

const WEIGHTS = {
  age: 25,
  location: 30,
  interests: 25,
  education: 20,
};

// ─── Sub-scorers ─────────────────────────────────────────

/**
 * Age compatibility.
 * Perfect score when the other user's age falls within the user's
 * preferred range.  Score degrades linearly up to a 10-year deviation.
 */
function scoreAge(user, candidate) {
  const prefMin = user.preferredAgeMin || 18;
  const prefMax = user.preferredAgeMax || 60;
  const candidateAge = candidate.age;

  if (!candidateAge) return 0;

  // Inside preferred range → 1.0
  if (candidateAge >= prefMin && candidateAge <= prefMax) return 1;

  // Outside range — score decays linearly over a 10-year window
  const deviation =
    candidateAge < prefMin ? prefMin - candidateAge : candidateAge - prefMax;
  return Math.max(0, 1 - deviation / 10);
}

/**
 * Location proximity.
 * Same city  → 1.0
 * Same state → 0.6
 * Same country → 0.3
 * Different  → 0.0
 */
function scoreLocation(user, candidate) {
  const uCity = (user.city || '').toLowerCase().trim();
  const cCity = (candidate.city || '').toLowerCase().trim();
  const uState = (user.state || '').toLowerCase().trim();
  const cState = (candidate.state || '').toLowerCase().trim();
  const uCountry = (user.country || '').toLowerCase().trim();
  const cCountry = (candidate.country || '').toLowerCase().trim();

  if (uCity && cCity && uCity === cCity) return 1;
  if (uState && cState && uState === cState) return 0.6;
  if (uCountry && cCountry && uCountry === cCountry) return 0.3;
  return 0;
}

/**
 * Interests similarity — Jaccard index.
 * |A ∩ B| / |A ∪ B|
 */
function scoreInterests(user, candidate) {
  const a = new Set((user.interests || []).map((i) => i.toLowerCase()));
  const b = new Set((candidate.interests || []).map((i) => i.toLowerCase()));

  if (a.size === 0 && b.size === 0) return 0.5; // no data — neutral
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

/**
 * Education match.
 * Exact match → 1.0,  partial (contains) → 0.6,  else → 0.0
 */
function scoreEducation(user, candidate) {
  const uEdu = (user.preferredEducation || user.education || '').toLowerCase().trim();
  const cEdu = (candidate.education || '').toLowerCase().trim();

  if (!uEdu || !cEdu) return 0.3; // unknown — give small benefit of doubt
  if (uEdu === cEdu) return 1;
  if (cEdu.includes(uEdu) || uEdu.includes(cEdu)) return 0.6;
  return 0;
}

// ─── Explanation builder ────────────────────────────────

function buildExplanation(breakdown) {
  const parts = [];

  if (breakdown.locationScore >= 25) parts.push('You are both from the same city');
  else if (breakdown.locationScore >= 15) parts.push('You are from the same state');

  if (breakdown.interestsScore >= 20) parts.push('You share many common interests');
  else if (breakdown.interestsScore >= 10) parts.push('You have some overlapping interests');

  if (breakdown.ageScore >= 20) parts.push('Age is within preferred range');

  if (breakdown.educationScore >= 15) parts.push('Education background is a strong match');

  if (parts.length === 0) parts.push('There are a few areas of compatibility');

  return parts.join('. ') + '.';
}

// ─── Public API ─────────────────────────────────────────

/**
 * calculateMatchScore — returns { score, breakdown, explanation }
 */
export function calculateMatchScore(user, candidate) {
  const rawAge = scoreAge(user, candidate);
  const rawLocation = scoreLocation(user, candidate);
  const rawInterests = scoreInterests(user, candidate);
  const rawEducation = scoreEducation(user, candidate);

  const breakdown = {
    ageScore: Math.round(rawAge * WEIGHTS.age),
    locationScore: Math.round(rawLocation * WEIGHTS.location),
    interestsScore: Math.round(rawInterests * WEIGHTS.interests),
    educationScore: Math.round(rawEducation * WEIGHTS.education),
  };

  const score =
    breakdown.ageScore +
    breakdown.locationScore +
    breakdown.interestsScore +
    breakdown.educationScore;

  const explanation = buildExplanation(breakdown);

  return { score, breakdown, explanation };
}
