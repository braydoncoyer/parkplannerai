import type { PredictionConfidence, PredictionSource } from '../../lib/analytics/types';

interface PredictionConfidenceBadgeProps {
  confidence: PredictionConfidence;
  source?: PredictionSource;
  showSource?: boolean;
  compact?: boolean;
}

const CONFIDENCE_CONFIG: Record<PredictionConfidence, {
  label: string;
  icon: string;
  description: string;
}> = {
  high: {
    label: 'High Confidence',
    icon: '🎯',
    description: 'Based on 4+ weeks of data with live adjustments',
  },
  medium: {
    label: 'Medium Confidence',
    icon: '📊',
    description: 'Based on 2-4 weeks of historical data',
  },
  low: {
    label: 'Low Confidence',
    icon: '📈',
    description: 'Limited historical data available',
  },
  fallback: {
    label: 'Pattern-Based',
    icon: '🔮',
    description: 'Using typical patterns while collecting data',
  },
};

const SOURCE_CONFIG: Record<PredictionSource, {
  label: string;
  icon: string;
}> = {
  convex: {
    label: 'Historical Data',
    icon: '📚',
  },
  blended: {
    label: 'Live + Historical',
    icon: '🔄',
  },
  hardcoded: {
    label: 'Pattern-Based',
    icon: '📋',
  },
};

export function PredictionConfidenceBadge({
  confidence,
  source,
  showSource = false,
  compact = false,
}: PredictionConfidenceBadgeProps) {
  const config = CONFIDENCE_CONFIG[confidence];

  if (compact) {
    return (
      <span
        className={`prediction-confidence ${confidence}`}
        title={config.description}
      >
        <span className="prediction-confidence-icon">{config.icon}</span>
        {confidence !== 'fallback' ? confidence.charAt(0).toUpperCase() + confidence.slice(1) : 'Pattern'}
      </span>
    );
  }

  return (
    <div className="prediction-confidence-wrapper">
      <span
        className={`prediction-confidence ${confidence}`}
        title={config.description}
      >
        <span className="prediction-confidence-icon">{config.icon}</span>
        {config.label}
      </span>
      {showSource && source && (
        <span className={`prediction-source-info ${source}`}>
          {SOURCE_CONFIG[source].icon} {SOURCE_CONFIG[source].label}
        </span>
      )}
    </div>
  );
}

/**
 * Hook-friendly function to get confidence display info
 */
export function getConfidenceDisplayInfo(confidence: PredictionConfidence) {
  return CONFIDENCE_CONFIG[confidence];
}

/**
 * Hook-friendly function to get source display info
 */
export function getSourceDisplayInfo(source: PredictionSource) {
  return SOURCE_CONFIG[source];
}

export default PredictionConfidenceBadge;
