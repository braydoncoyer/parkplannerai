import type { APIRoute } from 'astro';
import { getParkHours } from '../../../lib/api/parkHours';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response(
      JSON.stringify({ error: 'Park ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const hours = await getParkHours(Number(id), new Date());

    return new Response(
      JSON.stringify(hours),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
      }
    );
  } catch (error) {
    console.error(`Error fetching park hours for ID ${id}:`, error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch park hours',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
