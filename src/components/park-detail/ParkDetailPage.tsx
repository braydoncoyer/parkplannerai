import { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Clock,
  Users,
  MapPin,
  Calendar,
  Sparkles,
  Flag,
  Search,
  ChevronDown,
  ChevronUp,
  Star,
  BarChart3,
  Moon,
  Compass,
} from 'lucide-react';
import { supportsParkHopper } from '../../lib/analytics/data/resortPairings';
import { getParkStatus } from '../../lib/utils/parkStatus';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import './ParkDetailPage.css';
import parkImagesData from '../../lib/analytics/data/parkImages.json';

// ============================================
// Types
// ============================================

interface RideWithLand {
  id: number;
  name: string;
  land: string;
  isOpen: boolean;
  waitTime: number | null;
  lastUpdated: string;
  status: 'open' | 'closed' | 'down';
}

interface ParkStats {
  totalRides: number;
  ridesOpen: number;
  ridesClosed: number;
  ridesDown: number;
  avgWaitTime: number;
  maxWaitTime: number;
  minWaitTime: number;
}

interface ParkData {
  parkId: string;
  rides: RideWithLand[];
  lands: { name: string; rideCount: number }[];
  stats: ParkStats;
  fetchedAt: string;
}

interface ParkHours {
  timezone: string;
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
  openingTimeFormatted: string;
  closingTimeFormatted: string;
}

interface Entertainment {
  id: string;
  name: string;
  showTimes: { startTime: string }[];
  isNighttime: boolean;
  isParade: boolean;
  isFireworks: boolean;
  priority: 'must-see' | 'recommended' | 'optional';
}

interface ParkEntertainment {
  entertainment: Entertainment[];
  nighttimeSpectacular: Entertainment | null;
  parade: Entertainment | null;
}

interface HourlyData {
  hour: number;
  avgWaitTime: number;
  crowdLevel: 'low' | 'moderate' | 'high' | 'very-high';
}

interface HistoricalCrowdData {
  today: HourlyData[];
  lastWeek: HourlyData[] | null;
  lastMonth: HourlyData[] | null;
  lastYear: HourlyData[] | null;
  dataCollectionStarted: string;
  daysUntilWeeklyData: number;
}

type SortOption = 'wait-desc' | 'wait-asc' | 'name-asc' | 'name-desc';
type StatusFilter = 'all' | 'open' | 'closed';

// ============================================
// Constants
// ============================================

const PARK_IMAGES: Record<number, string> = {};
for (const resortParks of Object.values(parkImagesData)) {
  for (const [parkId, parkData] of Object.entries(resortParks)) {
    const data = parkData as { name: string; image: string };
    if (data.image) {
      PARK_IMAGES[Number(parkId)] = data.image;
    }
  }
}

const DEFAULT_IMAGE = 'https://images.pexels.com/photos/8183994/pexels-photo-8183994.jpeg';

const CROWD_LABELS: Record<string, string> = {
  low: 'Low Crowds',
  moderate: 'Moderate',
  high: 'Busy',
  'very-high': 'Very Busy',
};

const HEADLINER_RIDES = [
  'rise of the resistance', 'flight of passage', 'guardians of the galaxy',
  'tron', 'hagrid', 'velocicoaster', 'forbidden journey', 'hagrid\'s',
  'radiator springs', 'web slingers', 'incredicoaster', 'cosmic rewind',
  'expedition everest', 'slinky dog', 'rock \'n\' roller', 'tower of terror',
  'space mountain', 'splash mountain', 'big thunder', 'pirates',
  'haunted mansion', 'jungle cruise', 'matterhorn', 'indiana jones',
  'millennium falcon', 'remy', 'test track', 'frozen ever after',
];

// ============================================
// Helper Functions
// ============================================

function getCrowdLevel(avgWaitTime: number): 'low' | 'moderate' | 'high' | 'very-high' {
  if (avgWaitTime < 20) return 'low';
  if (avgWaitTime < 40) return 'moderate';
  if (avgWaitTime < 60) return 'high';
  return 'very-high';
}

function getWaitColor(waitTime: number): 'green' | 'amber' | 'orange' | 'red' {
  if (waitTime < 20) return 'green';
  if (waitTime < 40) return 'amber';
  if (waitTime < 60) return 'orange';
  return 'red';
}

function isHeadliner(rideName: string): boolean {
  const lower = rideName.toLowerCase();
  return HEADLINER_RIDES.some(h => lower.includes(h));
}

function formatShowTime(isoString: string): string {
  // Extract time from ISO string directly to avoid timezone issues
  const timeMatch = isoString.match(/T(\d{2}):(\d{2})/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2];
    const period = hours >= 12 ? 'PM' : 'AM';
    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;
    return `${hours}:${minutes} ${period}`;
  }
  return isoString;
}


/**
 * Generate mock historical data based on current ride wait times
 * Creates realistic-looking curves for today, last week, last month, and last year
 */
function generateMockHistoricalData(avgWaitTime: number): HistoricalCrowdData {
  const hours = Array.from({ length: 14 }, (_, i) => 9 + i); // 9am to 10pm
  const currentHour = new Date().getHours();

  // Crowd pattern multipliers for different times of day
  // Peak hours: 11am-2pm and 6pm-8pm
  const hourlyPattern = [
    0.4,  // 9am - low
    0.6,  // 10am - building
    0.85, // 11am - busy
    1.0,  // 12pm - peak
    0.95, // 1pm - peak
    0.8,  // 2pm - moderate
    0.65, // 3pm - moderate
    0.55, // 4pm - lower
    0.7,  // 5pm - building
    0.9,  // 6pm - dinner rush
    1.0,  // 7pm - peak
    0.85, // 8pm - busy
    0.6,  // 9pm - winding down
    0.4,  // 10pm - low
  ];

  // Generate "today" data up to current hour
  const today: HourlyData[] = hours
    .filter(h => h <= currentHour)
    .map((hour, i) => {
      const multiplier = hourlyPattern[i] || 0.5;
      const variation = (Math.random() - 0.5) * 10; // +/- 5 min random variation
      const waitTime = Math.max(5, Math.round(avgWaitTime * multiplier + variation));
      return {
        hour,
        avgWaitTime: waitTime,
        crowdLevel: getCrowdLevel(waitTime),
      };
    });

  // Generate "last week" - slightly different pattern (maybe 10-20% busier or quieter)
  const lastWeekMultiplier = 0.85 + Math.random() * 0.3; // 0.85 to 1.15
  const lastWeek: HourlyData[] = hours.map((hour, i) => {
    const multiplier = hourlyPattern[i] || 0.5;
    const variation = (Math.random() - 0.5) * 8;
    const waitTime = Math.max(5, Math.round(avgWaitTime * multiplier * lastWeekMultiplier + variation));
    return {
      hour,
      avgWaitTime: waitTime,
      crowdLevel: getCrowdLevel(waitTime),
    };
  });

  // Generate "last month" - more variation
  const lastMonthMultiplier = 0.7 + Math.random() * 0.5; // 0.7 to 1.2
  const lastMonth: HourlyData[] = hours.map((hour, i) => {
    const multiplier = hourlyPattern[i] || 0.5;
    const variation = (Math.random() - 0.5) * 12;
    const waitTime = Math.max(5, Math.round(avgWaitTime * multiplier * lastMonthMultiplier + variation));
    return {
      hour,
      avgWaitTime: waitTime,
      crowdLevel: getCrowdLevel(waitTime),
    };
  });

  // Generate "last year" - even more variation, maybe busier (pre-price-increase)
  const lastYearMultiplier = 0.9 + Math.random() * 0.4; // 0.9 to 1.3
  const lastYear: HourlyData[] = hours.map((hour, i) => {
    const multiplier = hourlyPattern[i] || 0.5;
    const variation = (Math.random() - 0.5) * 15;
    const waitTime = Math.max(5, Math.round(avgWaitTime * multiplier * lastYearMultiplier + variation));
    return {
      hour,
      avgWaitTime: waitTime,
      crowdLevel: getCrowdLevel(waitTime),
    };
  });

  return {
    today,
    lastWeek,
    lastMonth,
    lastYear,
    dataCollectionStarted: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    daysUntilWeeklyData: 0,
  };
}

// ============================================
// Subcomponents
// ============================================

function ParkHero({
  parkId,
  parkName,
  operator,
}: {
  parkId: number;
  parkName: string;
  operator: string;
}) {
  const imageUrl = PARK_IMAGES[parkId] || DEFAULT_IMAGE;
  const canParkHop = supportsParkHopper(parkId);

  const handleBack = () => {
    window.location.href = '/';
  };

  const handleCreatePlan = () => {
    window.location.href = `/plan?park=${parkId}`;
  };

  return (
    <div className="pd-hero">
      <div
        className="pd-hero-image"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
      <div className="pd-hero-overlay" />

      <button onClick={handleBack} className="pd-back-link">
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="pd-hero-content">
        <div className="pd-hero-badges">
          <span className="pd-operator-badge">{operator}</span>
          <span className="pd-live-badge">
            <span className="pd-live-dot" />
            Live Data
          </span>
        </div>
        <h1 className="pd-hero-title">{parkName}</h1>

        {canParkHop && (
          <button onClick={handleCreatePlan} className="pd-create-plan-btn">
            <span className="pd-plan-btn-icon">
              <Compass size={18} />
            </span>
            <span className="pd-plan-btn-text">
              <span className="pd-plan-btn-label">Create Your Day</span>
              <span className="pd-plan-btn-sublabel">Start planning from {parkName.split(' ')[0]}</span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

function ParkClosedBanner({
  currentTime,
  opensAt,
  timezone,
}: {
  currentTime: string;
  opensAt: string;
  timezone: string;
}) {
  // Get friendly timezone name
  const getTimezoneAbbr = (tz: string) => {
    if (tz.includes('New_York')) return 'ET';
    if (tz.includes('Los_Angeles')) return 'PT';
    if (tz.includes('Chicago')) return 'CT';
    return tz.split('/')[1]?.replace('_', ' ') || tz;
  };

  return (
    <div className="pd-closed-banner">
      <div className="pd-closed-icon">
        <Moon size={24} />
      </div>
      <div className="pd-closed-content">
        <h3 className="pd-closed-title">Park Currently Closed</h3>
        <p className="pd-closed-text">
          It's {currentTime} {getTimezoneAbbr(timezone)} at the park.
          Opens at {opensAt}.
        </p>
      </div>
    </div>
  );
}

function QuickStats({
  stats,
  hours,
  crowdLevel,
}: {
  stats: ParkStats;
  hours: ParkHours | null;
  crowdLevel: 'low' | 'moderate' | 'high' | 'very-high';
}) {
  const ridesOpenPercent = stats.totalRides > 0
    ? Math.round((stats.ridesOpen / stats.totalRides) * 100)
    : 0;

  return (
    <div className="pd-stats-grid">
      <div className={`pd-stat-card crowd-${crowdLevel}`}>
        <div className="pd-stat-header">
          <div className="pd-stat-icon">
            <Users size={18} />
          </div>
          <span className="pd-stat-label">Crowd Level</span>
        </div>
        <div className="pd-stat-value">{CROWD_LABELS[crowdLevel]}</div>
        <div className="pd-stat-sublabel">Based on current wait times</div>
      </div>

      <div className="pd-stat-card">
        <div className="pd-stat-header">
          <div className="pd-stat-icon">
            <Clock size={18} />
          </div>
          <span className="pd-stat-label">Avg Wait</span>
        </div>
        <div className="pd-stat-value">{stats.avgWaitTime} min</div>
        <div className="pd-stat-sublabel">Peak: {stats.maxWaitTime} min</div>
      </div>

      <div className="pd-stat-card">
        <div className="pd-stat-header">
          <div className="pd-stat-icon">
            <MapPin size={18} />
          </div>
          <span className="pd-stat-label">Rides Open</span>
        </div>
        <div className="pd-stat-value">
          {stats.ridesOpen} / {stats.totalRides}
        </div>
        <div className="pd-stat-progress">
          <div
            className="pd-stat-progress-bar"
            style={{ width: `${ridesOpenPercent}%` }}
          />
        </div>
      </div>

      <div className="pd-stat-card">
        <div className="pd-stat-header">
          <div className="pd-stat-icon">
            <Calendar size={18} />
          </div>
          <span className="pd-stat-label">Park Hours</span>
        </div>
        <div className="pd-stat-value">
          {hours?.openingTimeFormatted || '9:00 AM'}
        </div>
        <div className="pd-stat-sublabel">
          Closes {hours?.closingTimeFormatted || '9:00 PM'}
        </div>
      </div>
    </div>
  );
}

function CrowdTimeline({
  historicalData,
}: {
  historicalData: HistoricalCrowdData | null;
}) {
  const [visibleLines, setVisibleLines] = useState({
    today: true,
    lastWeek: true,
    lastMonth: true,
    lastYear: true,
  });

  const currentHour = new Date().getHours();

  // If no historical data or only today's data
  const hasHistoricalData = historicalData && (
    historicalData.lastWeek ||
    historicalData.lastMonth ||
    historicalData.lastYear
  );

  const toggleLine = (line: keyof typeof visibleLines) => {
    setVisibleLines(prev => ({ ...prev, [line]: !prev[line] }));
  };

  if (!hasHistoricalData) {
    // Empty state
    const daysRemaining = historicalData?.daysUntilWeeklyData ?? 7;
    const progressPercent = Math.max(0, ((7 - daysRemaining) / 7) * 100);

    return (
      <div className="pd-timeline-section pd-section">
        <div className="pd-timeline-header">
          <h2 className="pd-timeline-title">Crowd Comparison</h2>
        </div>

        <div className="pd-timeline-empty">
          <BarChart3 className="pd-timeline-empty-icon" size={48} />
          <h3 className="pd-timeline-empty-title">Collecting Historical Data</h3>
          <p className="pd-timeline-empty-text">
            We're gathering crowd patterns for this park. Check back soon for comparisons to last week, month, and year.
          </p>
          <div className="pd-timeline-empty-progress">
            <div className="pd-timeline-empty-progress-bar">
              <div
                className="pd-timeline-empty-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="pd-timeline-empty-progress-text">
              {daysRemaining} days until weekly data
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Merge all data into a single array for Recharts
  const hours = Array.from({ length: 14 }, (_, i) => 9 + i);
  const chartData = hours.map(hour => {
    const formatHour = (h: number) => h > 12 ? `${h - 12}pm` : h === 12 ? '12pm' : `${h}am`;

    const todayPoint = historicalData?.today?.find(d => d.hour === hour);
    const lastWeekPoint = historicalData?.lastWeek?.find(d => d.hour === hour);
    const lastMonthPoint = historicalData?.lastMonth?.find(d => d.hour === hour);
    const lastYearPoint = historicalData?.lastYear?.find(d => d.hour === hour);

    return {
      hour,
      label: formatHour(hour),
      today: todayPoint?.avgWaitTime ?? null,
      lastWeek: lastWeekPoint?.avgWaitTime ?? null,
      lastMonth: lastMonthPoint?.avgWaitTime ?? null,
      lastYear: lastYearPoint?.avgWaitTime ?? null,
    };
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="pd-chart-tooltip">
        <p className="pd-chart-tooltip-label">{label}</p>
        {payload.map((entry, i) => (
          entry.value !== null && (
            <p key={i} style={{ color: entry.color }} className="pd-chart-tooltip-value">
              {entry.name}: {entry.value} min
            </p>
          )
        ))}
      </div>
    );
  };

  return (
    <div className="pd-timeline-section pd-section">
      <div className="pd-timeline-header">
        <h2 className="pd-timeline-title">Crowd Comparison</h2>

        <div className="pd-timeline-legend">
          <button
            className={`pd-legend-item ${!visibleLines.today ? 'disabled' : ''}`}
            onClick={() => toggleLine('today')}
          >
            <span className="pd-legend-line today" />
            Today
          </button>
          <button
            className={`pd-legend-item ${!visibleLines.lastWeek ? 'disabled' : ''}`}
            onClick={() => toggleLine('lastWeek')}
          >
            <span className="pd-legend-line last-week" />
            Last Week
          </button>
          <button
            className={`pd-legend-item ${!visibleLines.lastMonth ? 'disabled' : ''}`}
            onClick={() => toggleLine('lastMonth')}
          >
            <span className="pd-legend-line last-month" />
            Last Month
          </button>
          <button
            className={`pd-legend-item ${!visibleLines.lastYear ? 'disabled' : ''}`}
            onClick={() => toggleLine('lastYear')}
          >
            <span className="pd-legend-line last-year" />
            Last Year
          </button>
        </div>
      </div>

      <div className="pd-timeline-chart">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              interval={1}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(val) => `${val}m`}
              domain={[0, 'auto']}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Current time reference line */}
            {currentHour >= 9 && currentHour <= 22 && (
              <ReferenceLine
                x={currentHour > 12 ? `${currentHour - 12}pm` : currentHour === 12 ? '12pm' : `${currentHour}am`}
                stroke="#c2410c"
                strokeDasharray="4 4"
                label={{ value: 'Now', position: 'top', fill: '#c2410c', fontSize: 11 }}
              />
            )}

            {visibleLines.lastYear && (
              <Line
                type="monotone"
                dataKey="lastYear"
                name="Last Year"
                stroke="#e2e8f0"
                strokeWidth={2}
                strokeDasharray="2 4"
                dot={false}
                connectNulls
              />
            )}
            {visibleLines.lastMonth && (
              <Line
                type="monotone"
                dataKey="lastMonth"
                name="Last Month"
                stroke="#cbd5e1"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                connectNulls
              />
            )}
            {visibleLines.lastWeek && (
              <Line
                type="monotone"
                dataKey="lastWeek"
                name="Last Week"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                connectNulls
              />
            )}
            {visibleLines.today && (
              <Line
                type="monotone"
                dataKey="today"
                name="Today"
                stroke="#c2410c"
                strokeWidth={3}
                dot={{ fill: '#c2410c', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: '#c2410c' }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function EntertainmentHighlights({
  entertainment,
}: {
  entertainment: ParkEntertainment | null;
}) {
  if (!entertainment) return null;

  const { nighttimeSpectacular, parade } = entertainment;

  if (!nighttimeSpectacular && !parade) return null;

  return (
    <div className="pd-section">
      <h2 className="pd-section-title">Entertainment Highlights</h2>

      <div className="pd-entertainment-grid">
        {nighttimeSpectacular && (
          <div className="pd-entertainment-card">
            <div className="pd-entertainment-header">
              <div className="pd-entertainment-icon">
                <Sparkles size={20} />
              </div>
              <div className="pd-entertainment-info">
                <span className="pd-entertainment-type">
                  {nighttimeSpectacular.isFireworks ? 'Fireworks' : 'Nighttime Show'}
                </span>
                <h3 className="pd-entertainment-name">
                  {nighttimeSpectacular.name}
                </h3>
              </div>
            </div>
            <div className="pd-entertainment-times">
              {nighttimeSpectacular.showTimes.slice(0, 3).map((st, i) => (
                <span
                  key={i}
                  className={`pd-entertainment-time ${i === 0 ? 'next' : ''}`}
                >
                  {formatShowTime(st.startTime)}
                  {i === 0 && <span className="pd-today-badge">Next</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {parade && (
          <div className="pd-entertainment-card">
            <div className="pd-entertainment-header">
              <div className="pd-entertainment-icon">
                <Flag size={20} />
              </div>
              <div className="pd-entertainment-info">
                <span className="pd-entertainment-type">Parade</span>
                <h3 className="pd-entertainment-name">{parade.name}</h3>
              </div>
            </div>
            <div className="pd-entertainment-times">
              {parade.showTimes.slice(0, 3).map((st, i) => (
                <span
                  key={i}
                  className={`pd-entertainment-time ${i === 0 ? 'next' : ''}`}
                >
                  {formatShowTime(st.startTime)}
                  {i === 0 && <span className="pd-today-badge">Next</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RideCard({ ride }: { ride: RideWithLand }) {
  const headliner = isHeadliner(ride.name);
  const waitColor = ride.waitTime !== null ? getWaitColor(ride.waitTime) : null;

  return (
    <div className="pd-ride-card">
      <div className="pd-ride-info">
        <h4 className="pd-ride-name">
          {ride.name}
          {headliner && (
            <span className="pd-headliner-badge">
              <Star size={10} />
              Headliner
            </span>
          )}
        </h4>
      </div>

      {ride.status === 'open' && ride.waitTime !== null ? (
        <span className={`pd-ride-wait ${waitColor}`}>
          {ride.waitTime} min
        </span>
      ) : (
        <span className="pd-ride-wait closed">
          {ride.status === 'down' ? 'Down' : 'Closed'}
        </span>
      )}
    </div>
  );
}

function LandGroup({
  landName,
  rides,
  defaultExpanded = true,
}: {
  landName: string;
  rides: RideWithLand[];
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const openCount = rides.filter(r => r.status === 'open').length;

  return (
    <div className={`pd-land-group ${!expanded ? 'collapsed' : ''}`}>
      <button
        className="pd-land-header"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <h3 className="pd-land-name">{landName}</h3>
          <span className="pd-land-count">
            {openCount} of {rides.length} open
          </span>
        </div>
        <span className="pd-land-toggle">
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </span>
      </button>

      <div className="pd-land-rides">
        {rides.map(ride => (
          <RideCard key={ride.id} ride={ride} />
        ))}
      </div>
    </div>
  );
}

function LiveWaitTimes({ rides, lands }: { rides: RideWithLand[]; lands: { name: string }[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('wait-desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredRides = useMemo(() => {
    let result = [...rides];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        r => r.name.toLowerCase().includes(query) ||
             r.land.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter === 'open') {
      result = result.filter(r => r.status === 'open');
    } else if (statusFilter === 'closed') {
      result = result.filter(r => r.status !== 'open');
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'wait-desc':
          return (b.waitTime || 0) - (a.waitTime || 0);
        case 'wait-asc':
          return (a.waitTime || 0) - (b.waitTime || 0);
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return result;
  }, [rides, searchQuery, sortBy, statusFilter]);

  // Group filtered rides by land
  const ridesByLand = useMemo(() => {
    const grouped: Record<string, RideWithLand[]> = {};
    for (const land of lands) {
      grouped[land.name] = filteredRides.filter(r => r.land === land.name);
    }
    return grouped;
  }, [filteredRides, lands]);

  const openCount = rides.filter(r => r.status === 'open').length;
  const closedCount = rides.length - openCount;

  return (
    <div className="pd-waits-section pd-section">
      <div className="pd-waits-header">
        <h2 className="pd-waits-title">Live Wait Times</h2>

        <div className="pd-filter-bar">
          <div className="pd-search-wrapper">
            <Search size={18} className="pd-search-icon" />
            <input
              type="text"
              className="pd-search-input"
              placeholder="Search rides..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="pd-sort-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortOption)}
          >
            <option value="wait-desc">Longest Wait</option>
            <option value="wait-asc">Shortest Wait</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
          </select>

          <div className="pd-status-tabs">
            <button
              className={`pd-status-tab ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              className={`pd-status-tab ${statusFilter === 'open' ? 'active' : ''}`}
              onClick={() => setStatusFilter('open')}
            >
              Open ({openCount})
            </button>
            <button
              className={`pd-status-tab ${statusFilter === 'closed' ? 'active' : ''}`}
              onClick={() => setStatusFilter('closed')}
            >
              Closed ({closedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Rides grouped by land */}
      {lands.map(land => {
        const landRides = ridesByLand[land.name];
        if (!landRides || landRides.length === 0) return null;

        return (
          <LandGroup
            key={land.name}
            landName={land.name}
            rides={landRides}
            defaultExpanded={true}
          />
        );
      })}

      {filteredRides.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          No rides found matching your search.
        </div>
      )}
    </div>
  );
}

function WaitTimeDistribution({ rides }: { rides: RideWithLand[] }) {
  const openRides = rides.filter(r => r.status === 'open' && r.waitTime !== null);

  const buckets = [
    { label: '< 20 min', color: 'green', count: 0 },
    { label: '20-40', color: 'amber', count: 0 },
    { label: '40-60', color: 'orange', count: 0 },
    { label: '60+ min', color: 'red', count: 0 },
  ];

  for (const ride of openRides) {
    const wait = ride.waitTime || 0;
    if (wait < 20) buckets[0].count++;
    else if (wait < 40) buckets[1].count++;
    else if (wait < 60) buckets[2].count++;
    else buckets[3].count++;
  }

  const maxCount = Math.max(...buckets.map(b => b.count), 1);

  return (
    <div className="pd-distribution-section pd-section">
      <h2 className="pd-distribution-title">Wait Time Distribution</h2>

      <div className="pd-distribution-chart">
        {buckets.map((bucket, i) => (
          <div key={i} className="pd-distribution-bar">
            <span className="pd-distribution-count">{bucket.count}</span>
            <div
              className={`pd-distribution-bar-fill ${bucket.color}`}
              style={{ height: `${(bucket.count / maxCount) * 100}%` }}
            />
            <span className="pd-distribution-label">{bucket.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="pd-container">
      <div className="pd-skeleton pd-skeleton-hero" />
      <div className="pd-content">
        <div className="pd-stats-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="pd-skeleton pd-skeleton-stat" />
          ))}
        </div>
        <div className="pd-waits-section">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="pd-skeleton pd-skeleton-ride" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

interface ParkDetailPageProps {
  parkId: string;
  parkName: string;
  operator: string;
}

export default function ParkDetailPage({
  parkId,
  parkName,
  operator,
}: ParkDetailPageProps) {
  const [data, setData] = useState<ParkData | null>(null);
  const [hours, setHours] = useState<ParkHours | null>(null);
  const [entertainment, setEntertainment] = useState<ParkEntertainment | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalCrowdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);

      try {
        // Fetch park data and hours in parallel
        const [parkResponse, hoursResponse, entertainmentResponse] = await Promise.all([
          fetch(`/api/parks/${parkId}.json`),
          fetch(`/api/park-hours/${parkId}.json`).catch(() => null),
          fetch(`/api/entertainment/${parkId}.json`).catch(() => null),
        ]);

        if (!parkResponse.ok) {
          throw new Error('Failed to fetch park data');
        }

        const parkData = await parkResponse.json();
        setData(parkData);

        if (hoursResponse?.ok) {
          const hoursData = await hoursResponse.json();
          setHours(hoursData);
        }

        if (entertainmentResponse?.ok) {
          const entertainmentData = await entertainmentResponse.json();
          setEntertainment(entertainmentData);
        }

        // Generate mock historical data based on current average wait time
        // This will be replaced with real Supabase data later
        const mockHistorical = generateMockHistoricalData(parkData.stats.avgWaitTime);
        setHistoricalData(mockHistorical);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchAll();

    // Refresh every 5 minutes
    const interval = setInterval(fetchAll, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [parkId]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="pd-container">
        <div className="pd-content" style={{ textAlign: 'center', padding: '80px 20px' }}>
          <h2 style={{ marginBottom: '16px', color: '#1e293b' }}>Unable to load park data</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              background: '#c2410c',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const crowdLevel = getCrowdLevel(data.stats.avgWaitTime);
  const parkStatus = getParkStatus(hours, Number(parkId), data.stats.ridesOpen);

  return (
    <div className="pd-container">
      <ParkHero
        parkId={Number(parkId)}
        parkName={parkName}
        operator={operator}
      />

      <div className="pd-content">
        {parkStatus.isClosed && (
          <ParkClosedBanner
            currentTime={parkStatus.currentTime}
            opensAt={parkStatus.opensAt}
            timezone={parkStatus.timezone}
          />
        )}

        <QuickStats
          stats={data.stats}
          hours={hours}
          crowdLevel={crowdLevel}
        />

        <CrowdTimeline historicalData={historicalData} />

        <EntertainmentHighlights entertainment={entertainment} />

        <LiveWaitTimes rides={data.rides} lands={data.lands} />

        <WaitTimeDistribution rides={data.rides} />
      </div>
    </div>
  );
}
