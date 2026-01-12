import { useState, useEffect } from 'react';
import { Clock, TrendingUp, MapPin, ChevronRight, RefreshCw, Moon, Activity, Database, BarChart3, Zap, Target, LineChart } from 'lucide-react';
import './LandingPage.css';
import parkImagesData from '../../lib/analytics/data/parkImages.json';

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
  isOpen: boolean;
  hours: {
    openingTime: string;
    closingTime: string;
  } | null;
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

// Build a flat map of park ID to image URL from the JSON
const PARK_IMAGES: Record<number, string> = {};
for (const resortParks of Object.values(parkImagesData)) {
  for (const [parkId, parkData] of Object.entries(resortParks)) {
    const data = parkData as { name: string; image: string };
    if (data.image) {
      PARK_IMAGES[Number(parkId)] = data.image;
    }
  }
}

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

function ParkCard({ park, index }: { park: Park; index: number }) {
  const imageUrl = PARK_IMAGES[park.id] || DEFAULT_IMAGE;
  const crowdLabel = CROWD_LABELS[park.stats.crowdLevel];
  const isClosed = !park.isOpen;

  return (
    <a
      href={`/parks/${park.id}`}
      className="park-card"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div
        className="park-card-image"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
      <div className="park-card-overlay" />

      <div className="park-card-content">
        <div className="park-card-header">
          <h3 className="park-name">{park.name}</h3>
          {isClosed ? (
            <span className="crowd-badge closed">
              <Moon size={12} />
              Closed
            </span>
          ) : (
            <span className={`crowd-badge ${park.stats.crowdLevel}`}>
              {crowdLabel}
            </span>
          )}
        </div>

        {isClosed ? (
          <div className="park-closed-message">
            Park is currently closed
          </div>
        ) : (
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
        )}

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

function HeroSection() {
  return (
    <section className="hero">
      <div className="hero-background">
        <div className="hero-grid" />
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />
      </div>

      <div className="hero-content">
        <div className="hero-badge">
          <Activity size={14} />
          <span>Powered by real-time data</span>
        </div>

        <h1 className="hero-title">
          Know the <span className="gradient-text">perfect moment</span> to ride
        </h1>

        <p className="hero-subtitle">
          Stop guessing, start planning. Our AI analyzes millions of data points to predict wait times with remarkable accuracy, so you can spend more time on rides and less time in line.
        </p>

        <div className="hero-actions">
          <a href="/plan" className="hero-cta primary">
            <Target size={18} />
            Plan Your Visit
          </a>
          <a href="#methodology" className="hero-cta secondary">
            See How It Works
          </a>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-value">94%</span>
            <span className="hero-stat-label">Prediction Accuracy</span>
          </div>
          <div className="hero-stat-divider" />
          <div className="hero-stat">
            <span className="hero-stat-value">2M+</span>
            <span className="hero-stat-label">Data Points Daily</span>
          </div>
          <div className="hero-stat-divider" />
          <div className="hero-stat">
            <span className="hero-stat-value">12</span>
            <span className="hero-stat-label">Parks Covered</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function MethodologySection() {
  const features = [
    {
      icon: Database,
      title: 'Historic Wait Times',
      description: 'Years of historical data reveal patterns others miss. We track seasonal trends, holiday impacts, and day-of-week variations.',
      accent: 'blue',
    },
    {
      icon: Activity,
      title: 'Live Queue Data',
      description: 'Real-time wait times updated every 5 minutes. See actual conditions and how they compare to predictions.',
      accent: 'emerald',
    },
    {
      icon: BarChart3,
      title: 'Ride Weighting',
      description: 'Not all rides are equal. Popular attractions get weighted algorithms that factor in capacity, throughput, and guest behavior.',
      accent: 'amber',
    },
    {
      icon: Zap,
      title: 'Event Intelligence',
      description: 'Holidays, special events, and park-specific occasions are factored into every prediction we make.',
      accent: 'rose',
    },
  ];

  return (
    <section className="methodology" id="methodology">
      <div className="methodology-container">
        <div className="methodology-header">
          <span className="section-label">Our Methodology</span>
          <h2 className="methodology-title">
            Predictions backed by <span className="underline-accent">data science</span>
          </h2>
          <p className="methodology-subtitle">
            We combine multiple data sources and machine learning models to deliver predictions you can trust.
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`feature-card feature-${feature.accent}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="feature-icon">
                <feature.icon size={24} />
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="methodology-visual">
          <div className="data-flow">
            <div className="data-node input">
              <Database size={20} />
              <span>Historical Data</span>
            </div>
            <div className="data-line" />
            <div className="data-node input">
              <Activity size={20} />
              <span>Live Feeds</span>
            </div>
            <div className="data-line" />
            <div className="data-node process">
              <LineChart size={20} />
              <span>ML Models</span>
            </div>
            <div className="data-line" />
            <div className="data-node output">
              <Target size={20} />
              <span>Predictions</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="parks-section">
      <div className="parks-container">
        <div className="parks-header">
          <div className="skeleton-title" />
        </div>
        <div className="parks-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="park-card skeleton" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
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

  const parks = data?.parks || [];

  const filteredParks = parks.filter((park) => {
    if (filter === 'all') return true;
    return park.operator.toLowerCase() === filter;
  });

  const counts = {
    all: parks.length,
    disney: parks.filter((p) => p.operator.toLowerCase() === 'disney').length,
    universal: parks.filter((p) => p.operator.toLowerCase() === 'universal').length,
  };

  return (
    <div className="landing-page">
      <HeroSection />
      <MethodologySection />

      <section className="parks-section">
        <div className="parks-container">
          <div className="parks-header">
            <div className="parks-header-content">
              <span className="section-label">Live Data</span>
              <h2 className="parks-title">Current Wait Times</h2>
              <p className="parks-subtitle">Real-time updates from parks around the world</p>
            </div>
            <div className="parks-header-meta">
              <div className="live-indicator">
                <span className="live-dot" />
                <span>Updated {formatTimeAgo(lastRefresh.toISOString())}</span>
                <button onClick={fetchData} className="refresh-btn" title="Refresh">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="toolbar">
            <FilterBar activeFilter={filter} onChange={setFilter} counts={counts} />
          </div>

          {loading ? (
            <div className="parks-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="park-card skeleton" />
              ))}
            </div>
          ) : error ? (
            <div className="parks-error">
              <h3>Unable to load park data</h3>
              <p>{error}</p>
              <button onClick={fetchData} className="retry-btn">
                Try Again
              </button>
            </div>
          ) : filter === 'all' ? (
            <>
              <div className="park-section">
                <h3 className="section-title">Disney Parks</h3>
                <div className="parks-grid">
                  {parks
                    .filter((p) => p.operator.toLowerCase() === 'disney')
                    .map((park, index) => (
                      <ParkCard key={park.id} park={park} index={index} />
                    ))}
                </div>
              </div>

              <div className="park-section">
                <h3 className="section-title">Universal Parks</h3>
                <div className="parks-grid">
                  {parks
                    .filter((p) => p.operator.toLowerCase() === 'universal')
                    .map((park, index) => (
                      <ParkCard key={park.id} park={park} index={index} />
                    ))}
                </div>
              </div>
            </>
          ) : (
            <div className="parks-grid">
              {filteredParks.map((park, index) => (
                <ParkCard key={park.id} park={park} index={index} />
              ))}
            </div>
          )}

          {filteredParks.length === 0 && !loading && filter !== 'all' && (
            <div className="empty-state">
              <p>No parks found.</p>
            </div>
          )}
        </div>
      </section>

      <footer className="landing-footer">
        <p className="copyright">© {new Date().getFullYear()} ParkPulse</p>
        <p>
          Data from{' '}
          <a href="https://queue-times.com" target="_blank" rel="noopener noreferrer">
            Queue-Times.com
          </a>
        </p>
        <p>
          Crafted by{' '}
          <a href="https://braydoncoyer.dev" target="_blank" rel="noopener noreferrer">
            Braydon Coyer
          </a>
        </p>
      </footer>
    </div>
  );
}
