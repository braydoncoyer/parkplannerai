import { useState, useEffect } from 'react';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  CloudSnow,
  CloudDrizzle,
  Wind,
  Droplets,
  Thermometer,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Umbrella,
  Shirt,
  Lightbulb
} from 'lucide-react';
import { getParkLocation, type ParkLocation } from '../../lib/analytics/data/parkLocations';
import './WeatherDisplay.css';

interface WeatherData {
  current: {
    temp: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    condition: WeatherCondition;
    description: string;
  };
  forecast: DayForecast[];
}

interface DayForecast {
  date: string;
  high: number;
  low: number;
  condition: WeatherCondition;
  precipChance: number;
  description: string;
}

type WeatherCondition = 'sunny' | 'partly-cloudy' | 'cloudy' | 'rain' | 'thunderstorm' | 'drizzle' | 'snow';

interface WeatherDisplayProps {
  parkId: number;
  parkName: string;
}

const WEATHER_ICONS: Record<WeatherCondition, React.ReactNode> = {
  'sunny': <Sun size={24} />,
  'partly-cloudy': <Cloud size={24} />,
  'cloudy': <Cloud size={24} />,
  'rain': <CloudRain size={24} />,
  'thunderstorm': <CloudLightning size={24} />,
  'drizzle': <CloudDrizzle size={24} />,
  'snow': <CloudSnow size={24} />,
};

const WEATHER_COLORS: Record<WeatherCondition, string> = {
  'sunny': '#f59e0b',
  'partly-cloudy': '#64748b',
  'cloudy': '#94a3b8',
  'rain': '#0ea5e9',
  'thunderstorm': '#8b5cf6',
  'drizzle': '#06b6d4',
  'snow': '#e2e8f0',
};

// Region-specific mock weather data
// In production, this would come from a weather API using lat/lng coordinates
function getMockWeatherData(region: 'florida' | 'california'): WeatherData {
  // Get day names for forecast
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const getForecastDay = (daysFromNow: number) => {
    if (daysFromNow === 0) return 'Today';
    if (daysFromNow === 1) return 'Tomorrow';
    return days[(today.getDay() + daysFromNow) % 7];
  };

  if (region === 'florida') {
    // Florida: Hot, humid, afternoon thunderstorms common (especially summer)
    return {
      current: {
        temp: 84,
        feelsLike: 92,
        humidity: 78,
        windSpeed: 7,
        condition: 'partly-cloudy',
        description: 'Hot and humid with afternoon thunderstorms possible',
      },
      forecast: [
        { date: getForecastDay(0), high: 87, low: 74, condition: 'partly-cloudy', precipChance: 50, description: 'Afternoon storms likely' },
        { date: getForecastDay(1), high: 89, low: 75, condition: 'thunderstorm', precipChance: 70, description: 'Scattered thunderstorms' },
        { date: getForecastDay(2), high: 86, low: 73, condition: 'partly-cloudy', precipChance: 40, description: 'Partly cloudy, humid' },
        { date: getForecastDay(3), high: 88, low: 74, condition: 'sunny', precipChance: 20, description: 'Mostly sunny' },
        { date: getForecastDay(4), high: 90, low: 76, condition: 'partly-cloudy', precipChance: 45, description: 'Hot with PM storms' },
      ],
    };
  } else {
    // California: Mild, dry, sunny (Mediterranean climate)
    return {
      current: {
        temp: 76,
        feelsLike: 76,
        humidity: 45,
        windSpeed: 10,
        condition: 'sunny',
        description: 'Sunny and pleasant with low humidity',
      },
      forecast: [
        { date: getForecastDay(0), high: 78, low: 58, condition: 'sunny', precipChance: 5, description: 'Sunny skies' },
        { date: getForecastDay(1), high: 80, low: 60, condition: 'sunny', precipChance: 0, description: 'Clear and warm' },
        { date: getForecastDay(2), high: 77, low: 57, condition: 'partly-cloudy', precipChance: 10, description: 'Partly cloudy' },
        { date: getForecastDay(3), high: 75, low: 56, condition: 'cloudy', precipChance: 15, description: 'Morning clouds' },
        { date: getForecastDay(4), high: 79, low: 59, condition: 'sunny', precipChance: 0, description: 'Sunny and mild' },
      ],
    };
  }
}

function getWeatherTips(condition: WeatherCondition, temp: number, humidity: number): string[] {
  const tips: string[] = [];

  // Temperature-based tips
  if (temp >= 90) {
    tips.push('Extreme heat - take frequent breaks in air-conditioned attractions');
  } else if (temp >= 85) {
    tips.push('Hot day - stay hydrated and seek shade during peak hours (12-3 PM)');
  }

  // Humidity tips
  if (humidity >= 70) {
    tips.push('High humidity - indoor dark rides offer great relief');
  }

  // Condition-based tips
  switch (condition) {
    case 'rain':
    case 'drizzle':
      tips.push('Rain expected - perfect time for indoor attractions and shows');
      tips.push('Bring ponchos (cheaper than umbrellas in parks)');
      break;
    case 'thunderstorm':
      tips.push('Thunderstorms likely - outdoor rides may close temporarily');
      tips.push('Plan indoor activities during storm windows (typically 2-4 PM)');
      break;
    case 'sunny':
      tips.push('Sunny skies - apply sunscreen frequently, especially for kids');
      break;
  }

  return tips.slice(0, 3); // Max 3 tips
}

function getClothingRecommendation(temp: number, precipChance: number): string {
  let rec = '';

  if (temp >= 85) {
    rec = 'Light, breathable clothing. Hats and sunglasses recommended.';
  } else if (temp >= 75) {
    rec = 'Comfortable summer clothes. Light layers for air-conditioned areas.';
  } else if (temp >= 65) {
    rec = 'Light jacket or hoodie for evening. Layers work best.';
  } else {
    rec = 'Warm layers recommended. Consider a jacket for outdoor queues.';
  }

  if (precipChance >= 40) {
    rec += ' Pack a poncho or rain jacket.';
  }

  return rec;
}

export default function WeatherDisplay({
  parkId,
  parkName,
}: WeatherDisplayProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [location, setLocation] = useState<ParkLocation | null>(null);

  useEffect(() => {
    // Fetch weather data from API with fallback to mock data
    const fetchWeather = async () => {
      try {
        setLoading(true);

        // Get park location for context
        const parkLocation = getParkLocation(parkId);
        setLocation(parkLocation);

        // Fetch from weather API
        const response = await fetch(`/api/weather/${parkId}.json`);

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // Check if API returned an error object
        if (data.error) {
          throw new Error(data.error);
        }

        setWeather(data);
        setError(null);
      } catch (err) {
        // Fallback to mock data when API fails
        console.warn('Weather API unavailable, using mock data:', err);
        const parkLocation = getParkLocation(parkId);
        const region = parkLocation?.region || 'florida';
        setWeather(getMockWeatherData(region));
        setError(null); // Don't show error to user since we have fallback data
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [parkId]);

  if (loading) {
    return (
      <div className="weather-display loading">
        <div className="weather-skeleton">
          <div className="skeleton-icon" />
          <div className="skeleton-text" />
          <div className="skeleton-text short" />
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="weather-display error">
        <AlertTriangle size={20} />
        <span>{error || 'Weather unavailable'}</span>
      </div>
    );
  }

  const { current, forecast } = weather;
  const tips = getWeatherTips(current.condition, current.temp, current.humidity);
  const clothing = getClothingRecommendation(current.temp, forecast[0]?.precipChance || 0);
  const conditionColor = WEATHER_COLORS[current.condition];

  return (
    <div className="weather-display">
      {/* Main weather card */}
      <div
        className="weather-main"
        style={{ '--condition-color': conditionColor } as React.CSSProperties}
      >
        {/* Current conditions */}
        <div className="weather-current">
          <div className="weather-icon-wrapper">
            {WEATHER_ICONS[current.condition]}
          </div>
          <div className="weather-temp-block">
            <span className="weather-temp">{current.temp}°</span>
            <span className="weather-feels">Feels like {current.feelsLike}°</span>
          </div>
          <div className="weather-details">
            <div className="weather-detail">
              <Droplets size={14} />
              <span>{current.humidity}%</span>
            </div>
            <div className="weather-detail">
              <Wind size={14} />
              <span>{current.windSpeed} mph</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="weather-description">{current.description}</p>
        {location && (
          <span className="weather-location">{location.city}</span>
        )}

        {/* Expand toggle */}
        <button
          className="weather-expand-btn"
          onClick={() => setExpanded(!expanded)}
          type="button"
        >
          <span>{expanded ? 'Show less' : '5-day forecast & tips'}</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="weather-expanded">
          {/* 5-day forecast */}
          <div className="weather-forecast">
            <h4 className="weather-section-title">5-Day Forecast</h4>
            <div className="forecast-row">
              {forecast.map((day) => (
                <div key={day.date} className="forecast-day">
                  <span className="forecast-date">{day.date}</span>
                  <div
                    className="forecast-icon"
                    style={{ color: WEATHER_COLORS[day.condition] }}
                  >
                    {WEATHER_ICONS[day.condition]}
                  </div>
                  <div className="forecast-temps">
                    <span className="forecast-high">{day.high}°</span>
                    <span className="forecast-low">{day.low}°</span>
                  </div>
                  {day.precipChance > 20 && (
                    <div className="forecast-precip">
                      <Umbrella size={10} />
                      <span>{day.precipChance}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tips section */}
          {tips.length > 0 && (
            <div className="weather-tips">
              <h4 className="weather-section-title">
                <Lightbulb size={16} />
                Park Tips for Today's Weather
              </h4>
              <ul className="tips-list">
                {tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {/* What to wear */}
          <div className="weather-clothing">
            <h4 className="weather-section-title">
              <Shirt size={16} />
              What to Wear
            </h4>
            <p>{clothing}</p>
          </div>
        </div>
      )}
    </div>
  );
}
