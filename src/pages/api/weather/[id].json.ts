import type { APIRoute } from 'astro';
import { getParkLocation } from '../../../lib/analytics/data/parkLocations';
import { transformOpenWeatherResponse } from '../../../lib/api/weather';

// Disable prerendering for dynamic API route
export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const parkId = parseInt(params.id || '');

  if (isNaN(parkId)) {
    return new Response(
      JSON.stringify({ error: 'Invalid park ID' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const location = getParkLocation(parkId);

  if (!location) {
    return new Response(
      JSON.stringify({ error: 'Park not found' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const apiKey = import.meta.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    console.error('OPENWEATHER_API_KEY is not configured');
    return new Response(
      JSON.stringify({ error: 'Weather service not configured' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${location.latitude}&lon=${location.longitude}&units=imperial&exclude=minutely,hourly,alerts&appid=${apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenWeatherMap API error: ${response.status} - ${errorText}`);
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    const weather = transformOpenWeatherResponse(data, location);

    return new Response(JSON.stringify(weather), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5-minute cache
      },
    });
  } catch (error) {
    console.error(`Error fetching weather for park ${parkId}:`, error);
    return new Response(
      JSON.stringify({
        error: 'Weather unavailable',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
