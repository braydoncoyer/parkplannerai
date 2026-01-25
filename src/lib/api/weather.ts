import type { ParkLocation } from '../analytics/data/parkLocations';

export type WeatherCondition = 'sunny' | 'partly-cloudy' | 'cloudy' | 'rain' | 'thunderstorm' | 'drizzle' | 'snow';

export interface DayForecast {
  date: string;
  high: number;
  low: number;
  condition: WeatherCondition;
  precipChance: number;
  description: string;
}

export interface WeatherData {
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

// OpenWeatherMap condition code to our WeatherCondition type
export function mapWeatherCondition(owmCode: number): WeatherCondition {
  if (owmCode === 800) return 'sunny';
  if (owmCode >= 801 && owmCode <= 802) return 'partly-cloudy';
  if (owmCode >= 803 && owmCode <= 804) return 'cloudy';
  if (owmCode >= 500 && owmCode <= 531) return 'rain';
  if (owmCode >= 300 && owmCode <= 321) return 'drizzle';
  if (owmCode >= 200 && owmCode <= 232) return 'thunderstorm';
  if (owmCode >= 600 && owmCode <= 622) return 'snow';
  return 'cloudy'; // fallback for any other codes
}

// Get human-readable description from OWM weather data
function getWeatherDescription(condition: WeatherCondition, humidity: number, temp: number): string {
  const descriptions: Record<WeatherCondition, string> = {
    'sunny': 'Clear skies',
    'partly-cloudy': 'Partly cloudy',
    'cloudy': 'Overcast',
    'rain': 'Rainy conditions',
    'drizzle': 'Light drizzle',
    'thunderstorm': 'Thunderstorms',
    'snow': 'Snowy conditions',
  };

  let desc = descriptions[condition];

  // Add context based on conditions
  if (humidity >= 70 && temp >= 80) {
    desc += ', hot and humid';
  } else if (temp >= 90) {
    desc += ', very hot';
  } else if (temp <= 50) {
    desc += ', cool temperatures';
  }

  return desc;
}

// Get day name for forecast
function getForecastDayName(timestamp: number, index: number): string {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';

  const date = new Date(timestamp * 1000);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

// Transform OpenWeatherMap API response to our WeatherData interface
export function transformOpenWeatherResponse(data: any, location: ParkLocation): WeatherData {
  // Current weather
  const current = data.current;
  const currentCondition = mapWeatherCondition(current.weather[0].id);

  // Daily forecast (take first 5 days)
  const forecast: DayForecast[] = data.daily.slice(0, 5).map((day: any, index: number) => {
    const condition = mapWeatherCondition(day.weather[0].id);
    const precipChance = Math.round((day.pop || 0) * 100); // pop is probability of precipitation (0-1)

    return {
      date: getForecastDayName(day.dt, index),
      high: Math.round(day.temp.max),
      low: Math.round(day.temp.min),
      condition,
      precipChance,
      description: day.weather[0].description,
    };
  });

  return {
    current: {
      temp: Math.round(current.temp),
      feelsLike: Math.round(current.feels_like),
      humidity: current.humidity,
      windSpeed: Math.round(current.wind_speed),
      condition: currentCondition,
      description: getWeatherDescription(currentCondition, current.humidity, Math.round(current.temp)),
    },
    forecast,
  };
}
