import React, { useMemo } from 'react';
import { Sunrise, Clock, TrendingDown, Sparkles, Check } from 'lucide-react';
import './RopeDropTargetSelector.css';

// =============================================================================
// TYPES
// =============================================================================

export interface RopeDropTarget {
  rideName: string;
  typicalRopeDropWait: number;
  typicalMiddayWait: number;
  priority: number;
}

interface RopeDropTargetSelectorProps {
  ropeDropData: RopeDropTarget[];
  selectedTargets: string[];
  onTargetsChange: (targets: string[]) => void;
  maxTargets?: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function RopeDropTargetSelector({
  ropeDropData,
  selectedTargets,
  onTargetsChange,
  maxTargets = 3,
}: RopeDropTargetSelectorProps) {
  // Sort by savings (highest delta first) for display
  const sortedTargets = useMemo(() => {
    return [...ropeDropData].sort((a, b) => {
      const savingsA = a.typicalMiddayWait - a.typicalRopeDropWait;
      const savingsB = b.typicalMiddayWait - b.typicalRopeDropWait;
      return savingsB - savingsA;
    });
  }, [ropeDropData]);

  const handleToggle = (rideName: string) => {
    const isSelected = selectedTargets.includes(rideName);

    if (isSelected) {
      // Remove from selection
      onTargetsChange(selectedTargets.filter(t => t !== rideName));
    } else if (selectedTargets.length < maxTargets) {
      // Add to selection
      onTargetsChange([...selectedTargets, rideName]);
    }
  };

  const getSelectionIndex = (rideName: string): number => {
    return selectedTargets.indexOf(rideName);
  };

  if (ropeDropData.length === 0) {
    return (
      <div className="rope-drop-selector">
        <div className="rds-empty-state">
          <Sunrise size={32} className="rds-empty-icon" />
          <p>No rope drop data available for this park.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rope-drop-selector">
      {/* Header */}
      <div className="rds-header">
        <h3 className="rds-title">
          <Sunrise size={20} className="rds-title-icon" />
          Your Rope Drop Picks
        </h3>
        <p className="rds-subtitle">
          Select up to {maxTargets} rides to prioritize when gates open.
          We'll automatically order them for maximum time savings.
        </p>

        {/* Selection Counter */}
        <div className="rds-selection-count">
          <Sparkles size={14} />
          {selectedTargets.length} of {maxTargets} selected
        </div>
      </div>

      {/* Target Grid */}
      <div className="rds-grid">
        {sortedTargets.map((target) => {
          const isSelected = selectedTargets.includes(target.rideName);
          const selectionIndex = getSelectionIndex(target.rideName);
          const savings = target.typicalMiddayWait - target.typicalRopeDropWait;
          const isDisabled = !isSelected && selectedTargets.length >= maxTargets;

          const cardClasses = [
            'rds-card',
            isSelected && 'selected',
            isDisabled && 'disabled',
          ].filter(Boolean).join(' ');

          return (
            <div
              key={target.rideName}
              onClick={() => !isDisabled && handleToggle(target.rideName)}
              className={cardClasses}
              role="button"
              aria-pressed={isSelected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (!isDisabled) handleToggle(target.rideName);
                }
              }}
            >
              {/* Selection Badge */}
              {isSelected && (
                <div className="rds-selection-badge">
                  {selectionIndex + 1}
                </div>
              )}

              {/* Card Header */}
              <div className="rds-card-header">
                <h4 className="rds-ride-name">{target.rideName}</h4>
              </div>

              {/* Stats */}
              <div className="rds-stats-row">
                <div className="rds-stat">
                  <span className="rds-stat-label">At Rope Drop</span>
                  <span className="rds-stat-value">
                    <Clock size={14} className="rds-stat-icon-primary" />
                    ~{target.typicalRopeDropWait} min
                  </span>
                </div>
                <div className="rds-stat">
                  <span className="rds-stat-label">Midday Peak</span>
                  <span className="rds-stat-value">
                    <Clock size={14} className="rds-stat-icon-muted" />
                    ~{target.typicalMiddayWait} min
                  </span>
                </div>
              </div>

              {/* Savings Chip */}
              <div className="rds-savings-chip">
                <TrendingDown size={16} className="rds-savings-icon" />
                <span className="rds-savings-text">
                  Save {savings}+ minutes
                </span>
              </div>

              {/* Check indicator */}
              <div className={`rds-check-indicator ${isSelected ? 'visible' : ''}`}>
                <Check size={14} strokeWidth={3} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tip */}
      <div className="rds-tip">
        <Sparkles size={18} className="rds-tip-icon" />
        <p className="rds-tip-text">
          <strong>Pro tip:</strong> The algorithm automatically orders your picks
          based on which rides save the most time at rope drop. Just select your
          favorites and we'll handle the rest!
        </p>
      </div>
    </div>
  );
}

export default RopeDropTargetSelector;
