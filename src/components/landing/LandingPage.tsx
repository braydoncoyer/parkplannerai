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

function CastleSilhouette() {
  return (
    <div className="hero-castle">
      <svg
        className="castle-svg"
        viewBox="0 0 1200 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          {/* Radial sunburst gradient - the heart of vintage poster aesthetic */}
          <radialGradient id="sunburstGlow" cx="50%" cy="65%" r="60%" fx="50%" fy="65%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.9" />
            <stop offset="25%" stopColor="#fde68a" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.3" />
            <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
          </radialGradient>

          {/* Atmospheric sky gradient */}
          <linearGradient id="vintagesky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef7ed" stopOpacity="0" />
            <stop offset="40%" stopColor="#fed7aa" stopOpacity="0.2" />
            <stop offset="70%" stopColor="#fdba74" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#fb923c" stopOpacity="0.5" />
          </linearGradient>

          {/* Castle silhouette gradient for depth */}
          <linearGradient id="castleFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#92400e" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          {/* Distant hills gradient */}
          <linearGradient id="hillsFar" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#b45309" stopOpacity="0.4" />
          </linearGradient>

          {/* Near hills/trees gradient */}
          <linearGradient id="hillsNear" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#92400e" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#78350f" stopOpacity="0.6" />
          </linearGradient>

          {/* Noise filter for vintage texture */}
          <filter id="grain" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
            <feColorMatrix type="saturate" values="0" />
            <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
          </filter>

          {/* Soft glow for sparkles */}
          <filter id="sparkleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Layer 1: Atmospheric sky wash */}
        <rect x="0" y="0" width="1200" height="800" fill="url(#vintagesky)" />

        {/* Layer 2: Radial sunburst behind castle */}
        <ellipse cx="600" cy="520" rx="500" ry="400" fill="url(#sunburstGlow)" className="sunburst" />

        {/* Layer 3: Distant rolling hills - furthest */}
        <path
          d="M0 650 Q150 580 300 620 Q450 660 600 600 Q750 540 900 590 Q1050 640 1200 610 L1200 800 L0 800 Z"
          fill="url(#hillsFar)"
          className="hills-far"
        />

        {/* Layer 4: Mid-ground hills with trees */}
        <path
          d="M0 700 Q100 650 200 680 Q350 720 450 670 Q500 650 550 660 Q650 680 750 650 Q850 620 950 660 Q1100 710 1200 680 L1200 800 L0 800 Z"
          fill="url(#hillsNear)"
          className="hills-near"
        />

        {/* Layer 5: Castle Silhouette - Authentic Cinderella Castle */}
        <g className="castle-silhouette" fill="url(#castleFill)">

          {/* === BASE LEVEL - Grand entrance and foundation === */}
          {/* Main base structure with entrance arch */}
          <path d="M420 800 L420 620 L480 620 L480 580 L500 580 L500 620 L700 620 L700 580 L720 580 L720 620 L780 620 L780 800 Z" />
          {/* Entrance archway cutout effect - darker */}
          <path d="M560 800 L560 680 Q600 640 640 680 L640 800 Z" fill="#451a03" fillOpacity="0.5" />

          {/* === SECOND TIER - Wedding cake level === */}
          <path d="M460 620 L460 520 L540 520 L540 480 L560 480 L560 520 L640 520 L640 480 L660 480 L660 520 L740 520 L740 620 Z" />

          {/* === LEFT WING TOWERS === */}
          {/* Far left outer tower - shortest */}
          <rect x="340" y="580" width="35" height="220" />
          <path d="M335 580 L357.5 520 L380 580 Z" className="spire" />
          <path d="M352 520 L357.5 480 L363 520 Z" className="spire-tip" />

          {/* Left secondary tower */}
          <rect x="385" y="520" width="40" height="280" />
          <path d="M380 520 L405 440 L430 520 Z" className="spire" />
          <path d="M398 440 L405 390 L412 440 Z" className="spire-tip" />

          {/* Left cluster turret - small */}
          <rect x="435" y="480" width="25" height="140" />
          <path d="M432 480 L447.5 420 L463 480 Z" className="spire" />

          {/* === CENTRAL TOWER COMPLEX - The iconic centerpiece === */}
          {/* Main central tower body - tiered */}
          <path d="M520 520 L520 380 L540 380 L540 340 L550 340 L550 380 L570 380 L570 320 L580 320 L580 380 L590 380 L590 300 L610 300 L610 380 L620 380 L620 320 L630 320 L630 380 L650 380 L650 340 L660 340 L660 380 L680 380 L680 520 Z" />

          {/* THE GRAND CENTRAL SPIRE - Needle-thin and dramatic */}
          <path d="M592 300 L600 60 L608 300 Z" className="main-spire" />
          {/* Spire finial - the very top */}
          <path d="M597 60 L600 25 L603 60 Z" className="finial" />

          {/* Clustered turrets around main spire - LEFT side */}
          {/* Turret 1 - tallest secondary */}
          <rect x="545" y="340" width="22" height="180" />
          <path d="M542 340 L556 240 L570 340 Z" className="spire" />
          <path d="M552 240 L556 200 L560 240 Z" className="spire-tip" />

          {/* Turret 2 - medium */}
          <rect x="520" y="380" width="18" height="140" />
          <path d="M517 380 L529 310 L541 380 Z" className="spire" />

          {/* Clustered turrets around main spire - RIGHT side */}
          {/* Turret 3 - tallest secondary (asymmetric - slightly shorter than left) */}
          <rect x="633" y="355" width="22" height="165" />
          <path d="M630 355 L644 260 L658 355 Z" className="spire" />
          <path d="M640 260 L644 225 L648 260 Z" className="spire-tip" />

          {/* Turret 4 - medium */}
          <rect x="662" y="380" width="18" height="140" />
          <path d="M659 380 L671 315 L683 380 Z" className="spire" />

          {/* Small decorative turret - left of main */}
          <rect x="573" y="320" width="14" height="60" />
          <path d="M570 320 L580 270 L590 320 Z" className="spire" />

          {/* Small decorative turret - right of main */}
          <rect x="613" y="320" width="14" height="60" />
          <path d="M610 320 L620 275 L630 320 Z" className="spire" />

          {/* === RIGHT WING TOWERS === */}
          {/* Right cluster turret - small */}
          <rect x="740" y="480" width="25" height="140" />
          <path d="M737 480 L752.5 420 L768 480 Z" className="spire" />

          {/* Right secondary tower */}
          <rect x="775" y="520" width="40" height="280" />
          <path d="M770 520 L795 450 L820 520 Z" className="spire" />
          <path d="M788 450 L795 405 L802 450 Z" className="spire-tip" />

          {/* Far right outer tower - matches left for balance */}
          <rect x="825" y="580" width="35" height="220" />
          <path d="M820 580 L842.5 530 L865 580 Z" className="spire" />
          <path d="M837 530 L842.5 495 L848 530 Z" className="spire-tip" />

          {/* === DECORATIVE PENNANT FLAGS === */}
          {/* Flag on main spire */}
          <path d="M600 25 L600 10 M600 10 L620 18 L600 26" stroke="#c2410c" strokeWidth="2" fill="#ea580c" />

          {/* Small flags on secondary spires */}
          <path d="M556 200 L556 188 L568 194 L556 200" fill="#ea580c" fillOpacity="0.8" />
          <path d="M644 225 L644 213 L656 219 L644 225" fill="#ea580c" fillOpacity="0.8" />
        </g>

        {/* Layer 6: Foreground treeline silhouettes */}
        <g className="trees-foreground">
          {/* Left trees */}
          <ellipse cx="-20" cy="780" rx="120" ry="80" fill="#451a03" fillOpacity="0.7" />
          <ellipse cx="80" cy="800" rx="100" ry="60" fill="#78350f" fillOpacity="0.6" />
          <ellipse cx="160" cy="820" rx="80" ry="50" fill="#451a03" fillOpacity="0.5" />

          {/* Right trees */}
          <ellipse cx="1220" cy="780" rx="120" ry="80" fill="#451a03" fillOpacity="0.7" />
          <ellipse cx="1120" cy="800" rx="100" ry="60" fill="#78350f" fillOpacity="0.6" />
          <ellipse cx="1040" cy="820" rx="80" ry="50" fill="#451a03" fillOpacity="0.5" />
        </g>

        {/* Layer 7: Magical sparkles and stars - clustered around spires */}
        <g className="magic-sparkles" filter="url(#sparkleGlow)">
          {/* Hero sparkle - above the main spire */}
          <circle cx="600" cy="50" r="5" fill="#fff" className="sparkle sparkle-3" />

          {/* Sparkles around main spire */}
          <circle cx="580" cy="100" r="3" fill="#fef3c7" className="sparkle sparkle-1" />
          <circle cx="625" cy="90" r="3.5" fill="#fef3c7" className="sparkle sparkle-2" />
          <circle cx="565" cy="150" r="2.5" fill="#fde68a" className="sparkle sparkle-6" />
          <circle cx="640" cy="140" r="2.5" fill="#fde68a" className="sparkle sparkle-7" />

          {/* Sparkles near secondary spires */}
          <circle cx="540" cy="220" r="3" fill="#fef3c7" className="sparkle sparkle-4" />
          <circle cx="665" cy="240" r="3" fill="#fef3c7" className="sparkle sparkle-5" />

          {/* Outer sparkles - framing the castle */}
          <circle cx="480" cy="320" r="2.5" fill="#fde68a" className="sparkle sparkle-8" />
          <circle cx="720" cy="300" r="2.5" fill="#fde68a" className="sparkle sparkle-9" />
          <circle cx="400" cy="400" r="2" fill="#fef3c7" className="sparkle sparkle-10" />
          <circle cx="800" cy="380" r="2" fill="#fef3c7" className="sparkle sparkle-11" />

          {/* Distant sparkles */}
          <circle cx="320" cy="280" r="2" fill="#fde68a" className="sparkle sparkle-12" />
          <circle cx="880" cy="260" r="2" fill="#fde68a" className="sparkle sparkle-13" />

          {/* Extra magic dust near flags */}
          <circle cx="615" cy="30" r="1.5" fill="#fff" className="sparkle sparkle-1" />
          <circle cx="560" cy="195" r="1.5" fill="#fef3c7" className="sparkle sparkle-4" />
          <circle cx="650" cy="220" r="1.5" fill="#fef3c7" className="sparkle sparkle-5" />
        </g>

        {/* Layer 8: Floating dust/firefly particles */}
        <g className="fireflies">
          <circle cx="320" cy="450" r="1.5" fill="#fbbf24" className="firefly firefly-1" />
          <circle cx="880" cy="430" r="1.5" fill="#fbbf24" className="firefly firefly-2" />
          <circle cx="280" cy="550" r="1" fill="#f59e0b" className="firefly firefly-3" />
          <circle cx="920" cy="530" r="1" fill="#f59e0b" className="firefly firefly-4" />
          <circle cx="450" cy="500" r="1.2" fill="#fcd34d" className="firefly firefly-5" />
          <circle cx="750" cy="480" r="1.2" fill="#fcd34d" className="firefly firefly-6" />
        </g>
      </svg>

      {/* Noise texture overlay for vintage print feel */}
      <div className="vintage-grain" />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="hero">
      <div className="hero-background">
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />
      </div>
      <CastleSilhouette />

      <div className="hero-content">
        <div className="hero-badge">
          <Activity size={14} />
          <span>Powered by real-time data</span>
        </div>

        <h1 className="hero-title">
          Know the <span className="gradient-text">perfect time</span> to visit
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
      description: 'Real-time wait times updated every 15 minutes. See actual conditions and how they compare to predictions.',
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
        <p className="copyright">© {new Date().getFullYear()} ParkPlannerAI</p>
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
