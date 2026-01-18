/**
 * Strategy Comparison Component
 * Displays 2-3 rope drop strategies side-by-side for comparison
 */

import { Zap, Users, Clock, ArrowRight, Sparkles } from 'lucide-react';
import type { Strategy } from '../../lib/analytics/optimization/strategyGenerator';

interface StrategyComparisonProps {
  strategies: Strategy[];
  selectedStrategy: string | null;
  onSelect: (strategyId: string) => void;
  onSkip: () => void;
  parkName: string;
  isUsingFallbackData?: boolean;
}

function getBadgeIcon(badge: Strategy['badge']) {
  switch (badge) {
    case 'recommended':
      return <Zap size={12} />;
    case 'family':
      return <Users size={12} />;
    case 'efficient':
      return <Clock size={12} />;
    default:
      return null;
  }
}

function StrategyCard({
  strategy,
  isSelected,
  onSelect,
  index,
}: {
  strategy: Strategy;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}) {
  return (
    <div
      className={`pw-strategy-card ${isSelected ? 'selected' : ''}`}
      style={{ animationDelay: `${index * 0.1}s` }}
      onClick={onSelect}
    >
      {/* Badge */}
      {strategy.badge && strategy.badgeText && (
        <div className={`pw-strategy-badge ${strategy.badge}`}>
          {getBadgeIcon(strategy.badge)}
          <span>{strategy.badgeText}</span>
        </div>
      )}

      {/* Strategy Name & Description */}
      <h3 className="pw-strategy-name">{strategy.name}</h3>
      <p className="pw-strategy-desc">{strategy.description}</p>

      {/* Ride List */}
      <div className="pw-strategy-rides">
        {strategy.rides.map((ride, idx) => (
          <div key={ride.name} className="pw-strategy-ride">
            <div className="pw-strategy-ride-number">{idx + 1}</div>
            <span className="pw-strategy-ride-name">{ride.name}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="pw-strategy-stats">
        <span className="pw-strategy-wait">~{strategy.totalWaitTime} min total wait</span>
        {strategy.totalTimeSaved > 0 && (
          <span className="pw-strategy-savings">
            <Sparkles size={12} />
            Saves {strategy.totalTimeSaved} min
          </span>
        )}
      </div>

      {/* Select Button */}
      <button
        className="pw-strategy-select"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {isSelected ? 'Selected' : 'Select This Strategy'}
      </button>
    </div>
  );
}

export default function StrategyComparison({
  strategies,
  selectedStrategy,
  onSelect,
  onSkip,
  parkName,
  isUsingFallbackData,
}: StrategyComparisonProps) {
  if (strategies.length === 0) {
    return (
      <div className="pw-strategy-step">
        <div className="pw-strategy-header">
          <h2>No Strategy Data Available</h2>
          <p>Strategy comparison is not available for this park yet.</p>
        </div>
        <div className="pw-strategy-skip">
          <button onClick={onSkip}>
            Continue with default strategy
            <ArrowRight size={14} style={{ marginLeft: 6 }} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pw-strategy-step">
      <div className="pw-strategy-header">
        <h2>Compare Strategies</h2>
        <p>Pick the morning approach that matches your priorities at {parkName}</p>
      </div>

      <div className="pw-strategy-grid">
        {strategies.map((strategy, index) => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            isSelected={selectedStrategy === strategy.id}
            onSelect={() => onSelect(strategy.id)}
            index={index}
          />
        ))}
      </div>

      <div className="pw-strategy-skip">
        <button onClick={onSkip}>
          Not sure? Use our recommendation
        </button>
      </div>

      {isUsingFallbackData && (
        <p className="pw-strategy-fallback-note">
          Wait time estimates based on typical patterns. As we collect more data, these predictions will become more accurate.
        </p>
      )}
    </div>
  );
}
