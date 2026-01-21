export type CrowdLevel = 'low' | 'moderate' | 'high' | 'very-high';

export const CROWD_LABELS: Record<CrowdLevel, string> = {
  low: 'Low Crowds',
  moderate: 'Moderate',
  high: 'Busy',
  'very-high': 'Very Busy',
};

export function getCrowdLevel(avgWaitTime: number): CrowdLevel {
  if (avgWaitTime < 20) return 'low';
  if (avgWaitTime < 40) return 'moderate';
  if (avgWaitTime < 60) return 'high';
  return 'very-high';
}
