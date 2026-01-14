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
import { PredictionConfidenceBadge } from './PredictionConfidenceBadge';
import './AnalyticsDashboard.css';

interface Park {
  id: number;
  name: string;
  operator: string;
  stats: {
    avgWaitTime: number;
    maxWaitTime: number;
    ridesOpen: number;
    totalRides: number;
    crowdLevel: string;
  };
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
  const chartData = parks.slice(0, 8).map((park) => ({
    name: park.name.replace('Disneyland', 'DL').replace('Disney', 'D').replace('Universal', 'U').split(' ').slice(0, 2).join(' '),
    avgWait: park.stats.avgWaitTime,
    maxWait: park.stats.maxWaitTime,
    operator: park.operator,
  }));

  return (
    <div className="chart-container">
      <h3>Current Wait Times by Park</h3>
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
  isRealData
}: {
  data: { hour: string; wait: number }[];
  isRealData: boolean;
}) {
  return (
    <div className="chart-container">
      <h3>
        Typical Daily Pattern
        {isRealData ? (
          <span className="chart-badge live">Historical Data</span>
        ) : (
          <span className="chart-badge">Sample Data</span>
        )}
      </h3>
      <p className="chart-subtitle">
        {isRealData
          ? 'When crowds peak throughout the day based on collected data'
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
  parks: { externalId: string; name: string }[];
  selectedPark: string | undefined;
  onParkChange: (parkId: string | undefined) => void;
}) {
  // Calculate dynamic height based on number of items
  const chartHeight = Math.max(200, data.length * 32 + 40);

  // Shorten park name for display
  const shortenParkName = (name: string) => {
    return name
      .replace('Disneyland Resort - ', '')
      .replace('Walt Disney World - ', '')
      .replace('Disneyland Paris - ', '')
      .replace(' Theme Park', '')
      .replace(' Park', '');
  };

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
            value={selectedPark || ''}
            onChange={(e) => onParkChange(e.target.value || undefined)}
          >
            <option value="">All Disney Parks</option>
            {parks.map((park) => (
              <option key={park.externalId} value={park.externalId}>
                {shortenParkName(park.name)}
              </option>
            ))}
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
  const [selectedLandPark, setSelectedLandPark] = useState<string | undefined>(undefined);

  // Convex queries for historical data
  const weeklyPatterns = useQuery(api.queries.analytics.getWeeklyPatterns, { weeks: 4 });
  const hourlyPatterns = useQuery(api.queries.analytics.getHourlyPatterns, { days: 14 });
  const insights = useQuery(api.queries.analytics.getAnalyticsInsights);
  const collectionStatus = useQuery(api.queries.analytics.getDataCollectionStatus);
  const historicalTrend = useQuery(api.queries.analytics.getHistoricalTrend, { days: 30 });
  const allParks = useQuery(api.queries.parks.getAllParks);
  const landComparison = useQuery(
    api.queries.analytics.getLandComparison,
    selectedLandPark ? { days: 14, parkExternalId: selectedLandPark } : { days: 14 }
  );
  const parkHours = useQuery(api.queries.analytics.getParkHoursAnalysis, { days: 30 });

  // Filter to Disney parks for land comparison dropdown
  const disneyParks = allParks?.filter(p => p.operator === 'Disney') ?? [];

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
  const bestPark = data?.parks.reduce((best, park) =>
    park.stats.avgWaitTime < best.stats.avgWaitTime ? park : best
  , data.parks[0]);

  const busiestPark = data?.parks.reduce((busiest, park) =>
    park.stats.avgWaitTime > busiest.stats.avgWaitTime ? park : busiest
  , data.parks[0]);

  const lowCrowdParks = data?.parks.filter((p) => p.stats.crowdLevel === 'low').length || 0;

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

      {/* Current Insights */}
      <section className="insights-section">
        <h2>Live Insights</h2>
        <div className="insights-grid">
          <InsightCard
            icon="🎯"
            title="Best Park Right Now"
            value={bestPark?.name.split(' ').slice(0, 2).join(' ') || 'Loading...'}
            description={`${bestPark?.stats.avgWaitTime || 0} min average wait`}
            trend="down"
          />
          <InsightCard
            icon="🔥"
            title="Busiest Park"
            value={busiestPark?.name.split(' ').slice(0, 2).join(' ') || 'Loading...'}
            description={`${busiestPark?.stats.avgWaitTime || 0} min average wait`}
            trend="up"
          />
          <InsightCard
            icon="✨"
            title="Low Crowd Parks"
            value={`${lowCrowdParks} parks`}
            description="Under 20 min average wait"
            trend="neutral"
          />
          <InsightCard
            icon="📅"
            title="Best Day to Visit"
            value={bestDayValue}
            description={bestDayDescription}
            trend="down"
          />
        </div>
      </section>

      {/* Historical Insights (when available) */}
      {insights?.hasEnoughData && (
        <section className="insights-section historical-insights">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ margin: 0 }}>Historical Insights</h2>
            <PredictionConfidenceBadge
              confidence={
                collectionStatus?.milestones.fourWeeks ? 'high' :
                collectionStatus?.milestones.twoWeeks ? 'medium' : 'low'
              }
              source="convex"
              showSource
            />
          </div>
          <div className="insights-grid">
            <InsightCard
              icon="📈"
              title="Best Time to Visit"
              value={insights.bestHour?.time || 'Morning'}
              description={`${insights.bestHour?.avgWait || 0} min avg wait`}
              trend="down"
            />
            <InsightCard
              icon="⏰"
              title="Busiest Time"
              value={insights.worstHour?.time || 'Afternoon'}
              description={`${insights.worstHour?.avgWait || 0} min avg wait`}
              trend="up"
            />
            <InsightCard
              icon="📊"
              title="Worst Day to Visit"
              value={insights.worstDay?.name || 'Saturday'}
              description={`${insights.worstDay?.avgWait || 0} min avg wait`}
              trend="up"
            />
            {insights.weekOverWeekTrend && (
              <InsightCard
                icon="📉"
                title="Week-over-Week"
                value={`${insights.weekOverWeekTrend.percentChange > 0 ? '+' : ''}${insights.weekOverWeekTrend.percentChange}%`}
                description={`Crowds are ${insights.weekOverWeekTrend.direction}`}
                trend={insights.weekOverWeekTrend.direction === 'up' ? 'up' : insights.weekOverWeekTrend.direction === 'down' ? 'down' : 'neutral'}
              />
            )}
          </div>
        </section>
      )}

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
          parks={disneyParks}
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
