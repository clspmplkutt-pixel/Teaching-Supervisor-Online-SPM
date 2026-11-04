/**
 * Centralized Scoring, Quality Badge & YouTube ID Utilities
 * Ensures 100% consistency across InfoTeacher, InfoDirectorSchool, ViewScoring, SendClip, and CertificateModal
 */

/**
 * Extracts a clean 11-character YouTube video ID from any valid YouTube URL or direct ID.
 * Supports: watch?v=, youtu.be/, youtube.com/shorts/, youtube.com/live/, youtube.com/embed/, or raw 11-char ID.
 * Returns '' if invalid (never returns arbitrary non-YouTube URLs).
 */
export const extractYouTubeId = (input) => {
  if (!input) return '';
  const str = String(input).trim();
  if (!str) return '';

  // Direct 11-character YouTube ID
  if (/^[A-Za-z0-9_-]{11}$/.test(str)) {
    return str;
  }

  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([A-Za-z0-9_-]{11})/,
  ];

  for (const regex of patterns) {
    const match = str.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  return '';
};

/**
 * Builds a canonical watch URL from either a stored 11-char ID or full YouTube URL
 */
export const getYouTubeWatchUrl = (clipValue) => {
  if (!clipValue) return '';
  const id = extractYouTubeId(clipValue);
  if (id) return `https://www.youtube.com/watch?v=${id}`;
  if (String(clipValue).startsWith('http')) return String(clipValue).trim();
  return '';
};

/**
 * Builds a canonical embed URL from either a stored 11-char ID or full YouTube URL
 */
export const getYouTubeEmbedUrl = (clipValue) => {
  const id = extractYouTubeId(clipValue);
  return id ? `https://www.youtube.com/embed/${id}` : '';
};

/**
 * Calculates standardized percentage score (0 - 100, 1 decimal place) from tbl_sendplan_score rows for a plan.
 * Respects score_weight when present (> 0), otherwise defaults to max 4 per rubric item.
 * Averages strictly across evaluators who have actually submitted scores (never penalizes with 0 for pending evaluators).
 */
export const calculatePlanScoreFromRows = (scoreRows = []) => {
  if (!Array.isArray(scoreRows) || scoreRows.length === 0) {
    return { percentage: 0, evaluatorCount: 0, byEvaluator: {} };
  }

  const byEval = {};
  scoreRows.forEach((row) => {
    const evalId = String(row.supervision || 'default');
    if (!byEval[evalId]) {
      byEval[evalId] = { totalScore: 0, totalMax: 0, count: 0 };
    }
    const s = Number(row.score) || 0;
    const w = Number(row.score_weight);
    // In tbl_sendplan_score: if score_weight > 0 and represents max possible points (or weight),
    // check whether score is raw (1-4 or 1-5) or already weighted
    byEval[evalId].totalScore += s;
    byEval[evalId].totalMax += w > 0 && w >= s ? w : 4;
    byEval[evalId].count += 1;
  });

  const evalPercentages = [];
  const evaluatorMap = {};

  Object.entries(byEval).forEach(([evalId, data]) => {
    if (data.count > 0 && data.totalMax > 0) {
      const pct = Math.min(100, Math.round(((data.totalScore / data.totalMax) * 100) * 10) / 10);
      evaluatorMap[evalId] = pct;
      evalPercentages.push(pct);
    }
  });

  if (evalPercentages.length === 0) {
    return { percentage: 0, evaluatorCount: 0, byEvaluator: evaluatorMap };
  }

  const avg = evalPercentages.reduce((sum, v) => sum + v, 0) / evalPercentages.length;
  return {
    percentage: Math.min(100, Math.round(avg * 10) / 10),
    evaluatorCount: evalPercentages.length,
    byEvaluator: evaluatorMap,
  };
};

/**
 * Returns quality badge metadata for a 0-100 score
 */
export const getQualityBadge = (score) => {
  const num = Number(score) || 0;
  if (num >= 90) {
    return {
      label: 'ดีเยี่ยม',
      fullLabel: 'ดีเยี่ยม (Excellent)',
      eng: 'Excellent',
      color: '#059669',
      bg: '#ecfdf5',
      textClass: 'text-success',
      badgeClass: 'badge-success',
      icon: 'fa-trophy',
    };
  }
  if (num >= 80) {
    return {
      label: 'ดีมาก',
      fullLabel: 'ดีมาก (Very Good)',
      eng: 'Very Good',
      color: '#2563eb',
      bg: '#eff6ff',
      textClass: 'text-primary',
      badgeClass: 'badge-primary',
      icon: 'fa-star',
    };
  }
  if (num >= 70) {
    return {
      label: 'ดี',
      fullLabel: 'ดี (Good)',
      eng: 'Good',
      color: '#0891b2',
      bg: '#ecfeff',
      textClass: 'text-info',
      badgeClass: 'badge-info',
      icon: 'fa-thumbs-up',
    };
  }
  if (num >= 60) {
    return {
      label: 'พอใช้',
      fullLabel: 'พอใช้ (Fair)',
      eng: 'Fair',
      color: '#d97706',
      bg: '#fffbeb',
      textClass: 'text-warning',
      badgeClass: 'badge-warning',
      icon: 'fa-check',
    };
  }
  if (num > 0) {
    return {
      label: 'ควรปรับปรุง',
      fullLabel: 'ควรปรับปรุง (Needs Improvement)',
      eng: 'Needs Improvement',
      color: '#dc2626',
      bg: '#fef2f2',
      textClass: 'text-danger',
      badgeClass: 'badge-danger',
      icon: 'fa-triangle-exclamation',
    };
  }
  return null;
};

/**
 * Masks a 13-digit Thai ID for privacy in tables (e.g., 1-6599-xxxxx-12-3)
 */
export const maskThaiId = (id) => {
  const digits = String(id || '').replace(/\D/g, '');
  if (digits.length !== 13) return id || '-';
  return `${digits[0]}-${digits.slice(1, 5)}-xxxxx-${digits.slice(10, 12)}-${digits[12]}`;
};
