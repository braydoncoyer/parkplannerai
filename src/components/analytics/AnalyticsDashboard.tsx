import { useState, useEffect } from 'react';
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

// Sample historical data (simulated - will be replaced with real data)
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
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
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
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '13px',
            }}
          />
          <Bar dataKey="avgWait" name="Avg Wait" fill="#0284c7" radius={[4, 4, 0, 0]} />
          <Bar dataKey="maxWait" name="Max Wait" fill="#0891b2" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function WeeklyTrendChart() {
  return (
    <div className="chart-container">
      <h3>
        Weekly Crowd Patterns
        <span className="chart-badge">Sample Data</span>
      </h3>
      <p className="chart-subtitle">
        Average wait times by day of week (collecting real data...)
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={sampleWeeklyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '13px',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="disney"
            name="Disney Parks"
            stroke="#1e40af"
            strokeWidth={2}
            dot={{ fill: '#1e40af', strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="universal"
            name="Universal Parks"
            stroke="#15803d"
            strokeWidth={2}
            dot={{ fill: '#15803d', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function HourlyPatternChart() {
  return (
    <div className="chart-container">
      <h3>
        Typical Daily Pattern
        <span className="chart-badge">Sample Data</span>
      </h3>
      <p className="chart-subtitle">
        When crowds peak throughout the day (collecting real data...)
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={sampleHourlyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '13px',
            }}
          />
          <Bar
            dataKey="wait"
            name="Avg Wait (min)"
            fill="#0284c7"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<ParksResponse | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Determine best day recommendation (simulated)
  const today = new Date().getDay();
  const bestDays = ['Tuesday', 'Wednesday', 'Monday'];
  const worstDays = ['Saturday', 'Sunday', 'Friday'];

  return (
    <div className="analytics-dashboard">
      {/* Data Collection Notice */}
      <div className="collection-notice">
        <div className="notice-icon">📊</div>
        <div className="notice-content">
          <strong>Building Historical Database</strong>
          <p>
            We're collecting data every 10 minutes to build crowd predictions. Historical
            insights will become more accurate over time. Currently showing live data and
            sample patterns.
          </p>
        </div>
      </div>

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
            title="Best Days to Visit"
            value={bestDays[0]}
            description="Based on typical patterns"
            trend="down"
          />
        </div>
      </section>

      {/* Current Park Comparison */}
      {data && data.parks.length > 0 && (
        <section className="chart-section">
          <ParkComparisonChart parks={data.parks} />
        </section>
      )}

      {/* Weekly and Hourly Patterns */}
      <section className="chart-section charts-row">
        <WeeklyTrendChart />
        <HourlyPatternChart />
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
            <p>We update every 5 minutes. Check current wait times before heading to your next ride.</p>
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
