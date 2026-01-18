import React, { useMemo } from 'react';
import { Sunrise, Clock, TrendingDown, Sparkles, Check } from 'lucide-react';

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
// STYLES
// =============================================================================

const styles = {
  container: {
    fontFamily: '"DM Sans", sans-serif',
    maxWidth: '100%',
  } as React.CSSProperties,

  header: {
    marginBottom: '20px',
  } as React.CSSProperties,

  title: {
    fontFamily: '"Fraunces", Georgia, serif',
    fontSize: '1.25rem',
    fontWeight: 500,
    color: '#44403c',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  } as React.CSSProperties,

  subtitle: {
    fontSize: '0.875rem',
    color: '#78716c',
    marginTop: '6px',
    lineHeight: 1.5,
  } as React.CSSProperties,

  selectionCount: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#92400e',
    marginTop: '12px',
    border: '1px solid #fcd34d',
  } as React.CSSProperties,

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px',
  } as React.CSSProperties,

  card: (isSelected: boolean, selectionIndex: number) => ({
    position: 'relative' as const,
    background: isSelected
      ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
      : '#ffffff',
    border: isSelected
      ? '2px solid #c2410c'
      : '2px solid transparent',
    borderRadius: '16px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: isSelected
      ? '0 4px 20px rgba(194, 65, 12, 0.15), 0 0 0 4px rgba(194, 65, 12, 0.05)'
      : '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
  }),

  cardHover: {
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
    transform: 'scale(1.01)',
  } as React.CSSProperties,

  selectionBadge: (index: number) => ({
    position: 'absolute' as const,
    top: '-8px',
    right: '-8px',
    width: '32px',
    height: '32px',
    background: 'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '0.875rem',
    boxShadow: '0 4px 12px rgba(194, 65, 12, 0.4)',
    border: '3px solid #fdfbf7',
    animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  }),

  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '12px',
  } as React.CSSProperties,

  rideName: {
    fontFamily: '"Fraunces", Georgia, serif',
    fontSize: '1rem',
    fontWeight: 500,
    color: '#292524',
    margin: 0,
    lineHeight: 1.3,
    paddingRight: '24px',
  } as React.CSSProperties,

  statsRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '12px',
  } as React.CSSProperties,

  stat: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  } as React.CSSProperties,

  statLabel: {
    fontSize: '0.7rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: '#a8a29e',
    fontWeight: 500,
  } as React.CSSProperties,

  statValue: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#57534e',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  } as React.CSSProperties,

  savingsChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
    borderRadius: '10px',
    border: '1px solid #a7f3d0',
  } as React.CSSProperties,

  savingsText: {
    fontSize: '0.8rem',
    fontWeight: 700,
    color: '#047857',
    letterSpacing: '-0.01em',
  } as React.CSSProperties,

  savingsIcon: {
    color: '#10b981',
  } as React.CSSProperties,

  checkIndicator: {
    position: 'absolute' as const,
    bottom: '12px',
    right: '12px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: '#c2410c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    opacity: 0,
    transform: 'scale(0.8)',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,

  checkIndicatorVisible: {
    opacity: 1,
    transform: 'scale(1)',
  } as React.CSSProperties,

  tip: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    marginTop: '20px',
    padding: '14px 16px',
    background: 'linear-gradient(135deg, #f5f5f4 0%, #e7e5e4 100%)',
    borderRadius: '12px',
    border: '1px solid #d6d3d1',
  } as React.CSSProperties,

  tipIcon: {
    color: '#c2410c',
    flexShrink: 0,
    marginTop: '2px',
  } as React.CSSProperties,

  tipText: {
    fontSize: '0.8rem',
    color: '#57534e',
    lineHeight: 1.5,
    margin: 0,
  } as React.CSSProperties,

  emptyState: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    color: '#78716c',
    fontSize: '0.9rem',
  } as React.CSSProperties,
};

// Keyframes for animations (injected once)
const keyframesStyle = `
  @keyframes popIn {
    0% { transform: scale(0); opacity: 0; }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); opacity: 1; }
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

// =============================================================================
// COMPONENT
// =============================================================================

export function RopeDropTargetSelector({
  ropeDropData,
  selectedTargets,
  onTargetsChange,
  maxTargets = 3,
}: RopeDropTargetSelectorProps) {
  // Inject keyframes once
  React.useEffect(() => {
    const styleId = 'rope-drop-selector-keyframes';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = keyframesStyle;
      document.head.appendChild(style);
    }
  }, []);

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
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <Sunrise size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p>No rope drop data available for this park.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>
          <Sunrise size={20} style={{ color: '#c2410c' }} />
          Your Rope Drop Picks
        </h3>
        <p style={styles.subtitle}>
          Select up to {maxTargets} rides to prioritize when gates open.
          We'll automatically order them for maximum time savings.
        </p>

        {/* Selection Counter */}
        <div style={styles.selectionCount}>
          <Sparkles size={14} />
          {selectedTargets.length} of {maxTargets} selected
        </div>
      </div>

      {/* Target Grid */}
      <div style={styles.grid}>
        {sortedTargets.map((target) => {
          const isSelected = selectedTargets.includes(target.rideName);
          const selectionIndex = getSelectionIndex(target.rideName);
          const savings = target.typicalMiddayWait - target.typicalRopeDropWait;
          const isDisabled = !isSelected && selectedTargets.length >= maxTargets;

          return (
            <div
              key={target.rideName}
              onClick={() => !isDisabled && handleToggle(target.rideName)}
              style={{
                ...styles.card(isSelected, selectionIndex),
                opacity: isDisabled ? 0.5 : 1,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!isDisabled && !isSelected) {
                  Object.assign(e.currentTarget.style, styles.cardHover);
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
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
                <div style={styles.selectionBadge(selectionIndex)}>
                  {selectionIndex + 1}
                </div>
              )}

              {/* Card Header */}
              <div style={styles.cardHeader}>
                <h4 style={styles.rideName}>{target.rideName}</h4>
              </div>

              {/* Stats */}
              <div style={styles.statsRow}>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>At Rope Drop</span>
                  <span style={styles.statValue}>
                    <Clock size={14} style={{ color: '#c2410c' }} />
                    ~{target.typicalRopeDropWait} min
                  </span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>Midday Peak</span>
                  <span style={styles.statValue}>
                    <Clock size={14} style={{ color: '#a8a29e' }} />
                    ~{target.typicalMiddayWait} min
                  </span>
                </div>
              </div>

              {/* Savings Chip */}
              <div style={styles.savingsChip}>
                <TrendingDown size={16} style={styles.savingsIcon} />
                <span style={styles.savingsText}>
                  Save {savings}+ minutes
                </span>
              </div>

              {/* Check indicator */}
              <div
                style={{
                  ...styles.checkIndicator,
                  ...(isSelected ? styles.checkIndicatorVisible : {}),
                }}
              >
                <Check size={14} strokeWidth={3} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tip */}
      <div style={styles.tip}>
        <Sparkles size={18} style={styles.tipIcon} />
        <p style={styles.tipText}>
          <strong>Pro tip:</strong> The algorithm automatically orders your picks
          based on which rides save the most time at rope drop. Just select your
          favorites and we'll handle the rest!
        </p>
      </div>
    </div>
  );
}

export default RopeDropTargetSelector;
