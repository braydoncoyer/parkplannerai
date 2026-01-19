import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import './AnalyticsDashboard.css';

interface Park {
  id: number;
  name: string;
  operator: string;
  isOpen?: boolean;
  stats: {
    avgWaitTime: number;
    maxWaitTime: number;
    ridesOpen: number;
    totalRides: number;
    crowdLevel: string;
  };
}

function getBusynessLevel(avgWait: number, crowdLevel: string): { level: 'low' | 'moderate' | 'busy' | 'very-busy' | 'closed'; label: string; color: string } {
  if (avgWait === 0) {
    return { level: 'closed', label: 'Closed', color: '#94a3b8' };
  }
  if (crowdLevel === 'low' || avgWait < 20) {
    return { level: 'low', label: 'Low Crowds', color: '#65a30d' };
  }
  if (crowdLevel === 'moderate' || avgWait < 35) {
    return { level: 'moderate', label: 'Moderate', color: '#d97706' };
  }
  if (crowdLevel === 'busy' || avgWait < 50) {
    return { level: 'busy', label: 'Busy', color: '#ea580c' };
  }
  return { level: 'very-busy', label: 'Very Busy', color: '#dc2626' };
}

type SortKey = 'name' | 'operator' | 'avgWait' | 'ridesOpen' | 'status';
type SortDirection = 'asc' | 'desc';

function LiveParkBusyness({ parks, loading }: { parks: Park[]; loading: boolean }) {
  const [sortKey, setSortKey] = useState<SortKey>('avgWait');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection(key === 'name' ? 'asc' : 'desc');
    }
  };

  if (loading) {
    return (
      <div className="busyness-section">
        <div className="busyness-header">
          <h2>Live Park Busyness</h2>
          <span className="chart-badge live">Real-Time</span>
        </div>
        <div className="busyness-loading">Loading park data...</div>
      </div>
    );
  }

  // Sort parks based on current sort key and direction
  const sortedParks = [...parks].sort((a, b) => {
    const aOpen = a.isOpen !== false && a.stats.avgWaitTime > 0;
    const bOpen = b.isOpen !== false && b.stats.avgWaitTime > 0;

    // Always put closed parks at the bottom
    if (aOpen && !bOpen) return -1;
    if (!aOpen && bOpen) return 1;
    if (!aOpen && !bOpen) return a.name.localeCompare(b.name);

    let comparison = 0;
    switch (sortKey) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'operator':
        comparison = a.operator.localeCompare(b.operator);
        break;
      case 'avgWait':
        comparison = a.stats.avgWaitTime - b.stats.avgWaitTime;
        break;
      case 'ridesOpen':
        comparison = a.stats.ridesOpen - b.stats.ridesOpen;
        break;
      case 'status':
        comparison = a.stats.avgWaitTime - b.stats.avgWaitTime;
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const getSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return <span className="sort-indicator inactive">↕</span>;
    return <span className="sort-indicator active">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  const formatParkName = (park: Park) => {
    return park.name
      .replace('Walt Disney World - ', '')
      .replace('Disneyland Resort - ', '')
      .replace('Disneyland Paris - ', '')
      .replace(' At Universal Orlando', '')
      .replace('Universal ', '');
  };

  return (
    <div className="busyness-section">
      <div className="busyness-header">
        <h2>Live Park Busyness</h2>
        <span className="chart-badge live">Real-Time</span>
      </div>
      <p className="chart-subtitle">Compare wait times across all parks at a glance</p>

      <div className="busyness-table-wrapper">
        <table className="busyness-table">
          <thead>
            <tr>
              <th className="th-park sortable" onClick={() => handleSort('name')}>
                Park {getSortIndicator('name')}
              </th>
              <th className="th-operator sortable" onClick={() => handleSort('operator')}>
                Operator {getSortIndicator('operator')}
              </th>
              <th className="th-wait sortable" onClick={() => handleSort('avgWait')}>
                Avg Wait {getSortIndicator('avgWait')}
              </th>
              <th className="th-rides sortable" onClick={() => handleSort('ridesOpen')}>
                Rides Open {getSortIndicator('ridesOpen')}
              </th>
              <th className="th-status sortable" onClick={() => handleSort('status')}>
                Status {getSortIndicator('status')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedParks.map((park) => {
              const busyness = getBusynessLevel(park.stats.avgWaitTime, park.stats.crowdLevel);
              const isOpen = park.isOpen !== false && park.stats.avgWaitTime > 0;
              return (
                <tr key={park.id} className={!isOpen ? 'park-closed' : ''}>
                  <td className="td-park">
                    <span className="park-name">{formatParkName(park)}</span>
                  </td>
                  <td className="td-operator">
                    <span className={`operator-badge ${park.operator.toLowerCase()}`}>{park.operator}</span>
                  </td>
                  <td className="td-wait">
                    {isOpen ? (
                      <span className="wait-value">{park.stats.avgWaitTime}<span className="wait-unit">min</span></span>
                    ) : (
                      <span className="wait-closed">--</span>
                    )}
                  </td>
                  <td className="td-rides">
                    {isOpen ? (
                      <span className="rides-fraction">
                        <span className="rides-open">{park.stats.ridesOpen}</span>
                        <span className="rides-divider">/</span>
                        <span className="rides-total">{park.stats.totalRides}</span>
                      </span>
                    ) : (
                      <span className="rides-closed">--</span>
                    )}
                  </td>
                  <td className="td-status">
                    <span className={`status-indicator ${busyness.level}`} style={{ '--status-color': busyness.color } as React.CSSProperties}>
                      <span className="status-dot"></span>
                      <span className="status-label">{busyness.label}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
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

// Sample historical data (fallback when Convex data is insufficient)
const sampleWeeklyData = [
  { day: 'Mon', disney: 32, universal: 28 },
  { day: 'Tue', disney: 28, universal: 25 },
  { day: 'Wed', disney: 35, universal: 30 },
  { day: 'Thu', disney: 38, universal: 32 },
  { day: 'Fri', disney: 52, universal: 45 },
  { day: 'Sat', disney: 68, universal: 58 },
  { day: 'Sun', disney: 62, universal: 52 },
];

const sampleHourlyData = [
  { hour: '9am', wait: 15 },
  { hour: '10am', wait: 22 },
  { hour: '11am', wait: 35 },
  { hour: '12pm', wait: 48 },
  { hour: '1pm', wait: 55 },
  { hour: '2pm', wait: 52 },
  { hour: '3pm', wait: 45 },
  { hour: '4pm', wait: 42 },
  { hour: '5pm', wait: 50 },
  { hour: '6pm', wait: 58 },
  { hour: '7pm', wait: 48 },
  { hour: '8pm', wait: 35 },
];

function InsightCard({
  icon,
  title,
  value,
  description,
  trend,
}: {
  icon: string;
  title: string;
  value: string;
  description: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="insight-card">
      <div className="insight-icon">{icon}</div>
      <div className="insight-content">
        <span className="insight-title">{title}</span>
        <span className="insight-value">{value}</span>
        <span className="insight-description">{description}</span>
      </div>
      {trend && (
        <div className={`insight-trend ${trend}`}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
        </div>
      )}
    </div>
  );
}

function ParkComparisonChart({ parks }: { parks: Park[] }) {
  // Sort parks: open parks first (by avgWait desc), then closed parks alphabetically
  const sortedParks = [...parks].sort((a, b) => {
    const aOpen = a.isOpen && a.stats.avgWaitTime > 0;
    const bOpen = b.isOpen && b.stats.avgWaitTime > 0;
    if (aOpen && !bOpen) return -1;
    if (!aOpen && bOpen) return 1;
    if (aOpen && bOpen) return b.stats.avgWaitTime - a.stats.avgWaitTime;
    return a.name.localeCompare(b.name);
  });

  const chartData = sortedParks.map((park) => ({
    name: park.name.replace('Disneyland', 'DL').replace('Disney', 'D').replace('Universal', 'U').split(' ').slice(0, 2).join(' '),
    avgWait: park.stats.avgWaitTime,
    maxWait: park.stats.maxWaitTime,
    operator: park.operator,
    isOpen: park.isOpen && park.stats.avgWaitTime > 0,
  }));

  const closedCount = chartData.filter(p => !p.isOpen).length;

  return (
    <div className="chart-container">
      <h3>Current Wait Times by Park</h3>
      {closedCount > 0 && (
        <p className="chart-subtitle" style={{ fontSize: '12px', color: '#64748b', marginTop: '-8px' }}>
          {closedCount} park{closedCount > 1 ? 's' : ''} currently closed (shown with 0 wait)
        </p>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e0db" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#64748b' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e0db',
              borderRadius: '8px',
              fontSize: '13px',
            }}
          />
          <Bar dataKey="avgWait" name="Avg Wait" fill="#c2410c" radius={[4, 4, 0, 0]} />
          <Bar dataKey="maxWait" name="Max Wait" fill="#ea580c" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function WeeklyTrendChart({
  data,
  isRealData
}: {
  data: { day: string; disney: number; universal: number }[];
  isRealData: boolean;
}) {
  return (
    <div className="chart-container">
      <h3>
        Weekly Crowd Patterns
        {isRealData ? (
          <span className="chart-badge live">Historical Data</span>
        ) : (
          <span className="chart-badge">Sample Data</span>
        )}
      </h3>
      <p className="chart-subtitle">
        {isRealData
          ? 'Average wait times by day of week from collected data'
          : 'Average wait times by day of week (collecting real data...)'
        }
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e0db" />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e0db',
              borderRadius: '8px',
              fontSize: '13px',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="disney"
            name="Disney Parks"
            stroke="#c2410c"
            strokeWidth={2}
            dot={{ fill: '#c2410c', strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="universal"
            name="Universal Parks"
            stroke="#65a30d"
            strokeWidth={2}
            dot={{ fill: '#65a30d', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function HourlyPatternChart({
  data,
  isRealData,
  parks,
  selectedPark,
  onParkChange
}: {
  data: { hour: string; wait: number }[];
  isRealData: boolean;
  parks: Array<{ externalId: string; name: string; operator: string }>;
  selectedPark: string | undefined;
  onParkChange: (parkId: string | undefined) => void;
}) {
  // Find selected park info for subtitle
  const selectedParkInfo = selectedPark
    ? parks.find(p => p.externalId === selectedPark)
    : null;

  return (
    <div className="chart-container">
      <div className="chart-header-row">
        <h3>
          Typical Daily Pattern
          {isRealData ? (
            <span className="chart-badge live">Historical Data</span>
          ) : (
            <span className="chart-badge">Sample Data</span>
          )}
        </h3>
        <select
          className="park-selector"
          value={selectedPark ?? ""}
          onChange={(e) => onParkChange(e.target.value || undefined)}
        >
          <option value="">All Parks</option>
          <optgroup label="Disney Parks">
            {parks.filter(p => p.operator === 'Disney').map(park => (
              <option key={park.externalId} value={park.externalId}>
                {park.name.replace('Disney ', '')}
              </option>
            ))}
          </optgroup>
          <optgroup label="Universal Parks">
            {parks.filter(p => p.operator === 'Universal').map(park => (
              <option key={park.externalId} value={park.externalId}>
                {park.name.replace('Universal ', '').replace(' At Universal Orlando', '')}
              </option>
            ))}
          </optgroup>
        </select>
      </div>
      <p className="chart-subtitle">
        {isRealData
          ? selectedParkInfo
            ? `Hourly wait patterns at ${selectedParkInfo.name}`
            : 'When crowds peak throughout the day (all parks combined)'
          : 'When crowds peak throughout the day (collecting real data...)'
        }
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e0db" />
          <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e0db',
              borderRadius: '8px',
              fontSize: '13px',
            }}
          />
          <Bar
            dataKey="wait"
            name="Avg Wait (min)"
            fill="#c2410c"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function HistoricalTrendChart({
  data,
  isRealData
}: {
  data: { date: string; disney: number | null; universal: number | null }[];
  isRealData: boolean;
}) {
  // Filter to last 14 data points for readability if there's a lot of data
  const displayData = data.length > 14 ? data.slice(-14) : data;

  return (
    <div className="chart-container historical-trend-chart">
      <h3>
        Historical Wait Time Trend
        {isRealData ? (
          <span className="chart-badge live">Historical Data</span>
        ) : (
          <span className="chart-badge">Collecting Data</span>
        )}
      </h3>
      <p className="chart-subtitle">
        {isRealData
          ? `Daily average wait times over the past ${displayData.length} days`
          : 'Gathering historical data to show trends over time...'
        }
      </p>
      {isRealData && displayData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={displayData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e0db" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#64748b' }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#64748b' }}
              label={{ value: 'Avg Wait (min)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#64748b', fontSize: 12 } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e0db',
                borderRadius: '8px',
                fontSize: '13px',
              }}
              formatter={(value) => value != null ? [`${value} min`, ''] : ['No data', '']}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="disney"
              name="Disney Parks"
              stroke="#c2410c"
              strokeWidth={2}
              dot={{ fill: '#c2410c', strokeWidth: 2, r: 3 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="universal"
              name="Universal Parks"
              stroke="#65a30d"
              strokeWidth={2}
              dot={{ fill: '#65a30d', strokeWidth: 2, r: 3 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="chart-placeholder">
          <div className="placeholder-icon">📈</div>
          <p>Historical trend data will appear here once we have 3+ days of data</p>
        </div>
      )}
    </div>
  );
}

function LandComparisonChart({
  data,
  isRealData,
  parks,
  selectedPark,
  onParkChange
}: {
  data: { land: string; fullName: string; avgWait: number; samples: number }[];
  isRealData: boolean;
  parks: { externalId: string; name: string; operator: string }[];
  selectedPark: string;
  onParkChange: (parkId: string) => void;
}) {
  // Calculate dynamic height based on number of items
  const chartHeight = Math.max(200, data.length * 32 + 40);

  // Shorten park name for display
  const shortenParkName = (name: string) => {
    return name
      .replace('Disneyland Resort - ', '')
      .replace('Walt Disney World - ', '')
      .replace('Disneyland Paris - ', '')
      .replace(' At Universal Orlando', '')
      .replace(' Theme Park', '')
      .replace(' Park', '');
  };

  // Group parks by operator
  const disneyParks = parks.filter(p => p.operator === 'Disney');
  const universalParks = parks.filter(p => p.operator === 'Universal');

  return (
    <div className="chart-container">
      <div className="chart-header-row">
        <h3>
          Wait Times by Land
          {isRealData ? (
            <span className="chart-badge live">Historical Data</span>
          ) : (
            <span className="chart-badge">Collecting Data</span>
          )}
        </h3>
        {parks.length > 0 && (
          <select
            className="park-selector"
            value={selectedPark}
            onChange={(e) => onParkChange(e.target.value)}
          >
            <optgroup label="Disney Parks">
              {disneyParks.map((park) => (
                <option key={park.externalId} value={park.externalId}>
                  {shortenParkName(park.name)}
                </option>
              ))}
            </optgroup>
            {universalParks.length > 0 && (
              <optgroup label="Universal Parks">
                {universalParks.map((park) => (
                  <option key={park.externalId} value={park.externalId}>
                    {shortenParkName(park.name)}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        )}
      </div>
      <p className="chart-subtitle">
        {isRealData
          ? 'Shortest wait times across themed areas'
          : 'Gathering land-level data for comparison...'
        }
      </p>
      {isRealData && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e0db" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 12, fill: '#64748b' }}
              domain={[0, 'auto']}
              unit=" min"
            />
            <YAxis
              type="category"
              dataKey="land"
              tick={{ fontSize: 12, fill: '#64748b' }}
              width={110}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e0db',
                borderRadius: '8px',
                fontSize: '13px',
              }}
              formatter={(value, name, props) => {
                const payload = props?.payload as { fullName?: string } | undefined;
                return [`${value} min avg`, payload?.fullName || 'Avg Wait'];
              }}
            />
            <Bar
              dataKey="avgWait"
              name="Avg Wait"
              radius={[0, 4, 4, 0]}
              fill="#c2410c"
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="chart-placeholder">
          <div className="placeholder-icon">🏰</div>
          <p>Land comparison data will appear here once we collect enough themed area data</p>
        </div>
      )}
    </div>
  );
}

function ParkHoursChart({
  data,
  summary,
  isRealData
}: {
  data: { day: string; avgHours: number; extendedDays: number; totalDays: number }[];
  summary: {
    avgHoursPerDay: number;
    longestDay: number;
    shortestDay: number;
    extendedHoursDays: number;
    totalSchedules: number;
    parksTracked: number;
  } | null;
  isRealData: boolean;
}) {
  return (
    <div className="chart-container">
      <h3>
        Park Operating Hours
        {isRealData ? (
          <span className="chart-badge live">Historical Data</span>
        ) : (
          <span className="chart-badge">Collecting Data</span>
        )}
      </h3>
      <p className="chart-subtitle">
        {isRealData && summary
          ? `Average ${summary.avgHoursPerDay}h/day across ${summary.parksTracked} parks`
          : 'Gathering park schedule data...'
        }
      </p>
      {isRealData && data.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e0db" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis
                tick={{ fontSize: 12, fill: '#64748b' }}
                domain={[0, 'auto']}
                label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#64748b', fontSize: 11 } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e0db',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
                formatter={(value) => [`${value} hours`, 'Avg Hours']}
              />
              <Bar
                dataKey="avgHours"
                name="Avg Hours"
                fill="#0891b2"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          {summary && summary.extendedHoursDays > 0 && (
            <div className="hours-summary">
              <span className="hours-badge extended">
                ✨ {summary.extendedHoursDays} days with extended hours
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="chart-placeholder">
          <div className="placeholder-icon">🕐</div>
          <p>Park hours analysis will appear here once we collect schedule data</p>
        </div>
      )}
    </div>
  );
}

function DataCollectionStatus({
  status
}: {
  status: {
    totalSnapshots: number;
    totalRides: number;
    totalParks: number;
    daysOfData: number;
    currentMilestone: string;
    nextMilestone: string;
    milestones: {
      oneWeek: boolean;
      twoWeeks: boolean;
      fourWeeks: boolean;
      threeMonths: boolean;
      oneYear: boolean;
    };
  } | undefined;
}) {
  if (!status) {
    return (
      <div className="collection-notice">
        <div className="notice-icon">📊</div>
        <div className="notice-content">
          <strong>Building Historical Database</strong>
          <p>
            We're collecting data every 15 minutes to build crowd predictions. Historical
            insights will become more accurate over time.
          </p>
        </div>
      </div>
    );
  }

  const milestoneProgress = [
    { label: '1 week', done: status.milestones.oneWeek },
    { label: '2 weeks', done: status.milestones.twoWeeks },
    { label: '1 month', done: status.milestones.fourWeeks },
    { label: '3 months', done: status.milestones.threeMonths },
    { label: '1 year', done: status.milestones.oneYear },
  ];

  return (
    <div className="collection-notice">
      <div className="notice-icon">📊</div>
      <div className="notice-content">
        <strong>{status.currentMilestone}</strong>
        <p>
          {status.totalSnapshots.toLocaleString()} data points collected across {status.totalParks} parks
          and {status.totalRides} rides.
          {status.nextMilestone !== 'Complete!' && (
            <> Next milestone: <strong>{status.nextMilestone}</strong></>
          )}
        </p>
        <div className="milestone-progress">
          {milestoneProgress.map((m) => (
            <span
              key={m.label}
              className={`milestone-dot ${m.done ? 'done' : ''}`}
              title={m.label}
            >
              {m.done ? '✓' : '○'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<ParksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  // Default to Disneyland (external ID "16") for land comparison
  const [selectedLandPark, setSelectedLandPark] = useState<string>('16');
  const [selectedHourlyPark, setSelectedHourlyPark] = useState<string | undefined>(undefined);

  // Convex queries for historical data
  const weeklyPatterns = useQuery(api.queries.analytics.getWeeklyPatterns, { weeks: 4 });
  const hourlyPatterns = useQuery(
    api.queries.analytics.getHourlyPatterns,
    selectedHourlyPark ? { days: 14, parkExternalId: selectedHourlyPark } : { days: 14 }
  );
  const insights = useQuery(api.queries.analytics.getAnalyticsInsights);
  const collectionStatus = useQuery(api.queries.analytics.getDataCollectionStatus);
  const historicalTrend = useQuery(api.queries.analytics.getHistoricalTrend, { days: 30 });
  const allParks = useQuery(api.queries.parks.getAllParks);
  const landComparison = useQuery(
    api.queries.analytics.getLandComparison,
    { days: 14, parkExternalId: selectedLandPark }
  );
  const parkHours = useQuery(api.queries.analytics.getParkHoursAnalysis, { days: 30 });

  // Filter to Disney and Universal parks for land comparison dropdown
  const parksWithLands = allParks?.filter(p => p.operator === 'Disney' || p.operator === 'Universal') ?? [];

  useEffect(() => {
    fetch('/api/parks.json')
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Calculate insights from current data
  const busiestPark = data?.parks.reduce((busiest, park) =>
    park.stats.avgWaitTime > busiest.stats.avgWaitTime ? park : busiest
  , data.parks[0]);

  // Use Convex insights if available, otherwise fallback to hardcoded
  const bestDayValue = insights?.hasEnoughData && insights.bestDay
    ? insights.bestDay.name
    : 'Tuesday';
  const bestDayDescription = insights?.hasEnoughData && insights.bestDay
    ? `${insights.bestDay.avgWait} min avg wait (from data)`
    : 'Based on typical patterns';

  // Use Convex data for charts if available, otherwise use sample data
  const weeklyChartData = weeklyPatterns?.hasEnoughData
    ? weeklyPatterns.data
    : sampleWeeklyData;
  const hourlyChartData = hourlyPatterns?.hasEnoughData
    ? hourlyPatterns.data
    : sampleHourlyData;

  return (
    <div className="analytics-dashboard">
      {/* Data Collection Status */}
      <DataCollectionStatus status={collectionStatus} />

      {/* Historical Insights */}
      <section className="insights-section">
        <h2>Historical Insights</h2>
        <div className="insights-grid">
          <InsightCard
            icon="📅"
            title="Best Day to Visit"
            value={bestDayValue}
            description={bestDayDescription}
            trend="down"
          />
          <InsightCard
            icon="📊"
            title="Worst Day to Visit"
            value={insights?.hasEnoughData && insights.worstDay ? insights.worstDay.name : 'Saturday'}
            description={insights?.hasEnoughData && insights.worstDay ? `${insights.worstDay.avgWait} min avg wait` : 'Based on typical patterns'}
            trend="up"
          />
          <InsightCard
            icon="🔥"
            title="Busiest Park Today"
            value={busiestPark?.name.split(' ').slice(0, 2).join(' ') || 'Loading...'}
            description={`${busiestPark?.stats.avgWaitTime || 0} min average wait`}
            trend="up"
          />
          <InsightCard
            icon="🗓️"
            title="Best Month to Visit"
            value="September"
            description="Historically lowest crowds"
            trend="down"
          />
        </div>
      </section>

      {/* Live Park Busyness Table */}
      <section className="chart-section">
        <LiveParkBusyness parks={data?.parks || []} loading={loading} />
      </section>

      {/* Current Park Comparison */}
      {data && data.parks.length > 0 && (
        <section className="chart-section">
          <ParkComparisonChart parks={data.parks} />
        </section>
      )}

      {/* Historical Trend Chart */}
      <section className="chart-section">
        <HistoricalTrendChart
          data={historicalTrend?.data ?? []}
          isRealData={historicalTrend?.hasEnoughData ?? false}
        />
      </section>

      {/* Land Comparison and Park Hours */}
      <section className="chart-section charts-row">
        <LandComparisonChart
          data={landComparison?.data ?? []}
          isRealData={landComparison?.hasEnoughData ?? false}
          parks={parksWithLands}
          selectedPark={selectedLandPark}
          onParkChange={setSelectedLandPark}
        />
        <ParkHoursChart
          data={parkHours?.data ?? []}
          summary={parkHours?.summary ?? null}
          isRealData={parkHours?.hasEnoughData ?? false}
        />
      </section>

      {/* Weekly and Hourly Patterns */}
      <section className="chart-section charts-row">
        <WeeklyTrendChart
          data={weeklyChartData}
          isRealData={weeklyPatterns?.hasEnoughData ?? false}
        />
        <HourlyPatternChart
          data={hourlyChartData}
          isRealData={hourlyPatterns?.hasEnoughData ?? false}
          parks={allParks ?? []}
          selectedPark={selectedHourlyPark}
          onParkChange={setSelectedHourlyPark}
        />
      </section>

      {/* Tips Section */}
      <section className="tips-section">
        <h2>Pro Tips</h2>
        <div className="tips-grid">
          <div className="tip-card">
            <span className="tip-icon">⏰</span>
            <h4>Arrive Early</h4>
            <p>Gates typically open 15-30 minutes before official opening. The first 2 hours have the shortest waits.</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon">📱</span>
            <h4>Check This Dashboard</h4>
            <p>We update every 15 minutes. Check current wait times before heading to your next ride.</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon">🎢</span>
            <h4>Hit Big Rides First</h4>
            <p>Popular attractions have the longest lines. Prioritize them in the morning or evening.</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon">🗓️</span>
            <h4>Avoid Peak Days</h4>
            <p>Weekends and holidays see 40-60% higher crowds. Tuesday and Wednesday are typically quietest.</p>
          </div>
        </div>
      </section>

    </div>
  );
}
