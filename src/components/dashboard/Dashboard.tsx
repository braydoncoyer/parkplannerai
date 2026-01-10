import { useState, useEffect } from 'react';
import { Clock, Users, TrendingUp, MapPin, ChevronRight, RefreshCw } from 'lucide-react';
import './Dashboard.css';

interface ParkStats {
  avgWaitTime: number;
  maxWaitTime: number;
  ridesOpen: number;
  totalRides: number;
  crowdLevel: 'low' | 'moderate' | 'high' | 'very-high';
}

interface Park {
  id: number;
  name: string;
  operator: string;
  country: string;
  stats: ParkStats;
  lastUpdated: string;
}

interface ParksResponse {
  parks: Park[];
  meta: {
    totalParks: number;
    avgWaitTimeAcrossParks: number;
    totalRidesOpen: number;
    fetchedAt: string;
  };
}

type FilterType = 'all' | 'disney' | 'universal';

// Theme park images from Pexels (free to use, no attribution required)
const PARK_IMAGES: Record<number, string> = {
  // Walt Disney World
  6: 'https://images.pexels.com/photos/8183994/pexels-photo-8183994.jpeg?auto=compress&cs=tinysrgb&w=800', // Magic Kingdom - Cinderella Castle
  5: 'https://images.pexels.com/photos/3617464/pexels-photo-3617464.jpeg?auto=compress&cs=tinysrgb&w=800', // EPCOT - Spaceship Earth
  8: 'https://images.pexels.com/photos/14243455/pexels-photo-14243455.jpeg?auto=compress&cs=tinysrgb&w=800', // Hollywood Studios - Tower of Terror
  7: 'https://images.pexels.com/photos/3617464/pexels-photo-3617464.jpeg?auto=compress&cs=tinysrgb&w=800', // Animal Kingdom (using EPCOT as fallback)
  // Disneyland Resort
  16: 'https://images.pexels.com/photos/17892641/pexels-photo-17892641.jpeg?auto=compress&cs=tinysrgb&w=800', // Disneyland - Sleeping Beauty Castle
  17: 'https://images.pexels.com/photos/17892641/pexels-photo-17892641.jpeg?auto=compress&cs=tinysrgb&w=800', // California Adventure (using Disneyland as fallback)
  // Universal Orlando
  64: 'https://images.pexels.com/photos/5246036/pexels-photo-5246036.jpeg?auto=compress&cs=tinysrgb&w=800', // Universal Studios FL - Globe
  65: 'https://images.pexels.com/photos/9400905/pexels-photo-9400905.jpeg?auto=compress&cs=tinysrgb&w=800', // Islands of Adventure
  66: 'https://images.pexels.com/photos/9400905/pexels-photo-9400905.jpeg?auto=compress&cs=tinysrgb&w=800', // Volcano Bay
  // Universal Hollywood
  68: 'https://images.pexels.com/photos/5246036/pexels-photo-5246036.jpeg?auto=compress&cs=tinysrgb&w=800', // Universal Hollywood - Globe
};

const DEFAULT_IMAGE = 'https://images.pexels.com/photos/8183994/pexels-photo-8183994.jpeg?auto=compress&cs=tinysrgb&w=800';

const CROWD_LABELS: Record<string, string> = {
  low: 'Quiet',
  moderate: 'Moderate',
  high: 'Busy',
  'very-high': 'Very Busy',
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

function ParkCard({ park }: { park: Park }) {
  const imageUrl = PARK_IMAGES[park.id] || DEFAULT_IMAGE;
  const crowdLabel = CROWD_LABELS[park.stats.crowdLevel];

  return (
    <a href={`/parks/${park.id}`} className="park-card">
      <div
        className="park-card-image"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
      <div className="park-card-overlay" />

      <div className="park-card-content">
        <div className="park-card-header">
          <h3 className="park-name">{park.name}</h3>
          <span className={`crowd-badge ${park.stats.crowdLevel}`}>
            {crowdLabel}
          </span>
        </div>

        <div className="park-stats">
          <div className="stat">
            <Clock size={16} />
            <span className="stat-value">{park.stats.avgWaitTime}</span>
            <span className="stat-label">avg</span>
          </div>
          <div className="stat">
            <TrendingUp size={16} />
            <span className="stat-value">{park.stats.maxWaitTime}</span>
            <span className="stat-label">peak</span>
          </div>
          <div className="stat">
            <MapPin size={16} />
            <span className="stat-value">{park.stats.ridesOpen}</span>
            <span className="stat-label">open</span>
          </div>
        </div>

        <div className="park-card-footer">
          <span className="view-link">
            View rides <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </a>
  );
}

function FilterBar({
  activeFilter,
  onChange,
  counts,
}: {
  activeFilter: FilterType;
  onChange: (filter: FilterType) => void;
  counts: { all: number; disney: number; universal: number };
}) {
  return (
    <div className="filter-bar">
      <button
        className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
        onClick={() => onChange('all')}
      >
        All <span className="count">{counts.all}</span>
      </button>
      <button
        className={`filter-btn ${activeFilter === 'disney' ? 'active' : ''}`}
        onClick={() => onChange('disney')}
      >
        Disney <span className="count">{counts.disney}</span>
      </button>
      <button
        className={`filter-btn ${activeFilter === 'universal' ? 'active' : ''}`}
        onClick={() => onChange('universal')}
      >
        Universal <span className="count">{counts.universal}</span>
      </button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="skeleton-title" />
      </div>
      <div className="parks-grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="park-card skeleton" />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<ParksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      const response = await fetch('/api/parks.json');
      if (!response.ok) throw new Error('Failed to fetch park data');
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
  }, []);

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="dashboard-error">
        <h3>Unable to load park data</h3>
        <p>{error}</p>
        <button onClick={fetchData} className="retry-btn">
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { parks } = data;

  const filteredParks = parks.filter((park) => {
    if (filter === 'all') return true;
    return park.operator.toLowerCase() === filter;
  });

  const counts = {
    all: parks.length,
    disney: parks.filter((p) => p.operator.toLowerCase() === 'disney').length,
    universal: parks.filter((p) => p.operator.toLowerCase() === 'universal').length,
  };

  // Find best park (lowest wait)
  const bestPark = [...parks].sort(
    (a, b) => a.stats.avgWaitTime - b.stats.avgWaitTime
  )[0];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Live Wait Times</h1>
          <div className="live-indicator">
            <span className="live-dot" />
            <span>Updated {formatTimeAgo(lastRefresh.toISOString())}</span>
            <button onClick={fetchData} className="refresh-btn" title="Refresh">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {bestPark && (
          <div className="best-park-badge">
            <span className="badge-label">Shortest waits</span>
            <span className="badge-value">{bestPark.name.split(' ').slice(0, 2).join(' ')}</span>
            <span className="badge-wait">{bestPark.stats.avgWaitTime} min avg</span>
          </div>
        )}
      </div>

      <div className="toolbar">
        <FilterBar activeFilter={filter} onChange={setFilter} counts={counts} />
      </div>

      {/* Parks by Section */}
      {filter === 'all' ? (
        <>
          {/* Disney Section */}
          <div className="park-section">
            <h3 className="section-title">Disney Parks</h3>
            <div className="parks-grid">
              {parks
                .filter((p) => p.operator.toLowerCase() === 'disney')
                .map((park) => (
                  <ParkCard key={park.id} park={park} />
                ))}
            </div>
          </div>

          {/* Universal Section */}
          <div className="park-section">
            <h3 className="section-title">Universal Parks</h3>
            <div className="parks-grid">
              {parks
                .filter((p) => p.operator.toLowerCase() === 'universal')
                .map((park) => (
                  <ParkCard key={park.id} park={park} />
                ))}
            </div>
          </div>
        </>
      ) : (
        <div className="parks-grid">
          {filteredParks.map((park) => (
            <ParkCard key={park.id} park={park} />
          ))}
        </div>
      )}

      {filteredParks.length === 0 && filter !== 'all' && (
        <div className="empty-state">
          <p>No parks found.</p>
        </div>
      )}

      <footer className="dashboard-footer">
        <p>
          Data from{' '}
          <a href="https://queue-times.com" target="_blank" rel="noopener noreferrer">
            Queue-Times.com
          </a>
        </p>
      </footer>
    </div>
  );
}
