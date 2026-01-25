import { useState, useEffect, useMemo } from 'react';
import { getRideMinHeight, formatHeight, meetsHeightRequirement } from '../../lib/analytics/data/rideMetadata';
import './RideList.css';

interface Ride {
  id: number;
  name: string;
  land: string;
  isOpen: boolean;
  waitTime: number | null;
  lastUpdated: string;
  status: 'open' | 'closed' | 'down';
  minHeight?: number; // Height requirement in inches
}

interface ParkData {
  parkId: string;
  rides: Ride[];
  lands: { name: string; rideCount: number }[];
  stats: {
    totalRides: number;
    ridesOpen: number;
    ridesClosed: number;
    ridesDown: number;
    avgWaitTime: number;
    maxWaitTime: number;
    minWaitTime: number;
  };
  fetchedAt: string;
}

type SortOption = 'wait-desc' | 'wait-asc' | 'name' | 'land';
type FilterOption = 'all' | 'open' | 'closed';

const STATUS_CONFIG = {
  open: { label: 'Open', color: '#10b981', bg: '#d1fae5' },
  closed: { label: 'Closed', color: '#64748b', bg: '#f1f5f9' },
  down: { label: 'Temporarily Closed', color: '#f59e0b', bg: '#fef3c7' },
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

function getWaitTimeColor(waitTime: number): string {
  if (waitTime < 20) return '#10b981';
  if (waitTime < 40) return '#f59e0b';
  if (waitTime < 60) return '#f97316';
  return '#f43f5e';
}

function RideCard({ ride, childHeight }: { ride: Ride; childHeight: number | null }) {
  const statusConfig = STATUS_CONFIG[ride.status];
  const minHeight = getRideMinHeight(ride.name);
  const meetsHeight = childHeight === null || minHeight === undefined || meetsHeightRequirement(ride.name, childHeight);

  return (
    <div className={`ride-card ${ride.status} ${!meetsHeight ? 'height-restricted' : ''}`}>
      <div className="ride-main">
        <div className="ride-info">
          <h4 className="ride-name">{ride.name}</h4>
          <div className="ride-meta">
            <span className="ride-land">{ride.land}</span>
            {minHeight !== undefined && (
              <span className={`ride-height ${!meetsHeight ? 'not-met' : 'met'}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M2 12h4m12 0h4M7 7l-2-2m14 2l2-2M7 17l-2 2m14-2l2 2"/>
                </svg>
                {formatHeight(minHeight)}
              </span>
            )}
          </div>
        </div>

        {ride.status === 'open' && ride.waitTime !== null ? (
          <div className="ride-wait" style={{ color: getWaitTimeColor(ride.waitTime) }}>
            <span className="wait-value">{ride.waitTime}</span>
            <span className="wait-unit">min</span>
          </div>
        ) : (
          <div
            className="ride-status-badge"
            style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
          >
            {statusConfig.label}
          </div>
        )}
      </div>

      <div className="ride-footer">
        <span className="ride-updated">Updated {formatTimeAgo(ride.lastUpdated)}</span>
        {!meetsHeight && childHeight !== null && (
          <span className="height-warning">Below height requirement</span>
        )}
      </div>
    </div>
  );
}

function StatsBar({ stats }: { stats: ParkData['stats'] }) {
  return (
    <div className="stats-bar">
      <div className="stat-item highlight">
        <span className="stat-value">{stats.avgWaitTime}</span>
        <span className="stat-label">Avg Wait (min)</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{stats.maxWaitTime}</span>
        <span className="stat-label">Max Wait</span>
      </div>
      <div className="stat-item">
        <span className="stat-value success">{stats.ridesOpen}</span>
        <span className="stat-label">Open</span>
      </div>
      <div className="stat-item">
        <span className="stat-value muted">{stats.ridesClosed}</span>
        <span className="stat-label">Closed</span>
      </div>
    </div>
  );
}

// Common child height presets in inches
const HEIGHT_PRESETS = [
  { label: 'Any Height', value: null },
  { label: '32" (Toddler)', value: 32 },
  { label: '36" (3-4 yrs)', value: 36 },
  { label: '38" (4-5 yrs)', value: 38 },
  { label: '40" (5-6 yrs)', value: 40 },
  { label: '42" (6-7 yrs)', value: 42 },
  { label: '44" (7-8 yrs)', value: 44 },
  { label: '48" (8-10 yrs)', value: 48 },
  { label: '51" (10-12 yrs)', value: 51 },
  { label: '54"+ (Teen/Adult)', value: 54 },
];

function FilterBar({
  filter,
  setFilter,
  sort,
  setSort,
  searchQuery,
  setSearchQuery,
  lands,
  selectedLand,
  setSelectedLand,
  childHeight,
  setChildHeight,
  showHeightRestricted,
  setShowHeightRestricted,
}: {
  filter: FilterOption;
  setFilter: (f: FilterOption) => void;
  sort: SortOption;
  setSort: (s: SortOption) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  lands: { name: string; rideCount: number }[];
  selectedLand: string;
  setSelectedLand: (l: string) => void;
  childHeight: number | null;
  setChildHeight: (h: number | null) => void;
  showHeightRestricted: boolean;
  setShowHeightRestricted: (show: boolean) => void;
}) {
  return (
    <div className="filter-bar">
      <div className="filter-row">
        <div className="search-box">
          <svg
            className="search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search rides..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <select
            value={selectedLand}
            onChange={(e) => setSelectedLand(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Lands</option>
            {lands.map((land) => (
              <option key={land.name} value={land.name}>
                {land.name} ({land.rideCount})
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="filter-select"
          >
            <option value="wait-desc">Longest Wait</option>
            <option value="wait-asc">Shortest Wait</option>
            <option value="name">A-Z</option>
            <option value="land">By Land</option>
          </select>
        </div>
      </div>

      {/* Height Filter Row */}
      <div className="height-filter-row">
        <div className="height-filter-label">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M2 12h4m12 0h4M7 7l-2-2m14 2l2-2M7 17l-2 2m14-2l2 2"/>
          </svg>
          <span>Child's Height:</span>
        </div>
        <select
          value={childHeight === null ? '' : childHeight}
          onChange={(e) => setChildHeight(e.target.value === '' ? null : parseInt(e.target.value))}
          className="filter-select height-select"
        >
          {HEIGHT_PRESETS.map((preset) => (
            <option key={preset.label} value={preset.value === null ? '' : preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
        {childHeight !== null && (
          <label className="show-restricted-toggle">
            <input
              type="checkbox"
              checked={showHeightRestricted}
              onChange={(e) => setShowHeightRestricted(e.target.checked)}
            />
            <span>Show rides below requirement</span>
          </label>
        )}
      </div>

      <div className="filter-tabs">
        {(['all', 'open', 'closed'] as FilterOption[]).map((f) => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All Rides' : f === 'open' ? 'Open' : 'Closed'}
          </button>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="ride-list-container">
      <div className="stats-bar">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-item skeleton">
            <div className="skeleton-value" />
            <div className="skeleton-label" />
          </div>
        ))}
      </div>
      <div className="rides-grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="ride-card skeleton">
            <div className="skeleton-header" />
            <div className="skeleton-footer" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RideList({ parkId, parkName }: { parkId: string; parkName: string }) {
  const [data, setData] = useState<ParkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterOption>('all');
  const [sort, setSort] = useState<SortOption>('wait-desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLand, setSelectedLand] = useState('all');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [childHeight, setChildHeight] = useState<number | null>(null);
  const [showHeightRestricted, setShowHeightRestricted] = useState(true);

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/parks/${parkId}.json`);
      if (!response.ok) throw new Error('Failed to fetch ride data');
      const json = await response.json();
      setData(json);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [parkId]);

  const filteredRides = useMemo(() => {
    if (!data) return [];

    let rides = [...data.rides];

    // Filter by status
    if (filter === 'open') {
      rides = rides.filter((r) => r.status === 'open');
    } else if (filter === 'closed') {
      rides = rides.filter((r) => r.status !== 'open');
    }

    // Filter by land
    if (selectedLand !== 'all') {
      rides = rides.filter((r) => r.land === selectedLand);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      rides = rides.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.land.toLowerCase().includes(query)
      );
    }

    // Filter by height requirement
    if (childHeight !== null && !showHeightRestricted) {
      rides = rides.filter((r) => meetsHeightRequirement(r.name, childHeight));
    }

    // Sort
    switch (sort) {
      case 'wait-desc':
        rides.sort((a, b) => {
          if (a.status !== 'open' && b.status === 'open') return 1;
          if (a.status === 'open' && b.status !== 'open') return -1;
          return (b.waitTime || 0) - (a.waitTime || 0);
        });
        break;
      case 'wait-asc':
        rides.sort((a, b) => {
          if (a.status !== 'open' && b.status === 'open') return 1;
          if (a.status === 'open' && b.status !== 'open') return -1;
          return (a.waitTime || 0) - (b.waitTime || 0);
        });
        break;
      case 'name':
        rides.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'land':
        rides.sort((a, b) => a.land.localeCompare(b.land) || a.name.localeCompare(b.name));
        break;
    }

    return rides;
  }, [data, filter, sort, searchQuery, selectedLand, childHeight, showHeightRestricted]);

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="error-state">
        <div className="error-icon">⚠️</div>
        <h3>Unable to load ride data</h3>
        <p>{error}</p>
        <button onClick={fetchData} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="ride-list-container">
      {/* Live Status */}
      <div className="live-status">
        <span className="live-dot" />
        <span>Live Data</span>
        <span className="refresh-time">
          Refreshed {formatTimeAgo(lastRefresh.toISOString())}
        </span>
      </div>

      {/* Stats */}
      <StatsBar stats={data.stats} />

      {/* Filters */}
      <FilterBar
        filter={filter}
        setFilter={setFilter}
        sort={sort}
        setSort={setSort}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        lands={data.lands}
        selectedLand={selectedLand}
        setSelectedLand={setSelectedLand}
        childHeight={childHeight}
        setChildHeight={setChildHeight}
        showHeightRestricted={showHeightRestricted}
        setShowHeightRestricted={setShowHeightRestricted}
      />

      {/* Results count */}
      <div className="results-count">
        Showing {filteredRides.length} of {data.rides.length} rides
      </div>

      {/* Rides Grid */}
      <div className="rides-grid">
        {filteredRides.map((ride, index) => (
          <div
            key={ride.id}
            className="ride-card-wrapper"
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <RideCard ride={ride} childHeight={childHeight} />
          </div>
        ))}
      </div>

      {filteredRides.length === 0 && (
        <div className="no-results">
          <p>No rides match your filters</p>
          <button onClick={() => { setFilter('all'); setSearchQuery(''); setSelectedLand('all'); }}>
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}
