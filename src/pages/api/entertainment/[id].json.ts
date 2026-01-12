import type { APIRoute } from 'astro';
import { fetchParkEntertainment, getDefaultEntertainment } from '../../../lib/api/entertainment';

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
    // Try to fetch live entertainment data
    const entertainment = await fetchParkEntertainment(Number(id), new Date());

    if (entertainment) {
      return new Response(
        JSON.stringify(entertainment),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=1800', // Cache for 30 minutes
          },
        }
      );
    }

    // Fall back to default entertainment
    const defaults = getDefaultEntertainment(Number(id));

    return new Response(
      JSON.stringify({
        parkId: Number(id),
        date: new Date().toISOString().split('T')[0],
        entertainment: [],
        nighttimeSpectacular: defaults.nighttimeSpectacular || null,
        parade: defaults.parade || null,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=1800',
        },
      }
    );
  } catch (error) {
    console.error(`Error fetching entertainment for park ID ${id}:`, error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch entertainment data',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
