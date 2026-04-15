/**
 * Fake Profile Detection — simple heuristic-based checks.
 *
 * Each check returns a flag (true/false) and a reason string.
 * The caller decides what to do with the aggregate risk score.
 *
 * Heuristics:
 *  1. No profile photo                       → suspicious
 *  2. Bio is empty or too short (< 10 chars) → suspicious
 *  3. Zero interests listed                  → suspicious
 *  4. Name contains numbers or special chars  → suspicious
 *  5. Account created < 1 minute ago + already reported → suspicious
 */

export function detectFakeProfile(user, reportCount = 0) {
  const flags = [];

  // 1. No profile photo
  if (!user.profilePhoto) {
    flags.push({ check: 'no_photo', message: 'No profile photo uploaded' });
  }

  // 2. Empty / very short bio
  if (!user.bio || user.bio.trim().length < 10) {
    flags.push({ check: 'short_bio', message: 'Bio is missing or too short' });
  }

  // 3. No interests
  if (!user.interests || user.interests.length === 0) {
    flags.push({ check: 'no_interests', message: 'No interests listed' });
  }

  // 4. Suspicious name
  const nameRegex = /[^a-zA-Z\s.'-]/;
  if (user.name && nameRegex.test(user.name)) {
    flags.push({ check: 'suspicious_name', message: 'Name contains unusual characters' });
  }

  // 5. New account with reports
  if (reportCount > 0) {
    const ageMs = Date.now() - new Date(user.createdAt).getTime();
    const ageMinutes = ageMs / 1000 / 60;
    if (ageMinutes < 60) {
      flags.push({
        check: 'new_account_reported',
        message: 'New account already reported by others',
      });
    }
  }

  // Risk score: percentage of checks that flagged
  const totalChecks = 5;
  const riskScore = Math.round((flags.length / totalChecks) * 100);

  return {
    isSuspicious: flags.length >= 3, // threshold: 3+ flags → suspicious
    riskScore,
    flags,
  };
}
