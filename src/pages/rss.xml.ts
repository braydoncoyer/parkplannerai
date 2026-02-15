import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

export async function GET(context: APIContext) {
  const posts = (await getCollection('blog'))
    .filter((post) => post.data.pubDate <= new Date())
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  const blogItems = posts.map((post) => ({
    title: post.data.title,
    description: post.data.description,
    link: `/blog/${post.id}`,
    pubDate: post.data.pubDate,
  }));

  return rss({
    title: 'ParkPlannerAI',
    description:
      'AI-powered theme park wait time predictions, crowd analytics, and personalized visit planning for Walt Disney World, Disneyland, and Universal Orlando Resort.',
    site: context.site!.toString(),
    items: [
      ...blogItems,
      {
        title: 'Real-Time Wait Times',
        description:
          'Live wait time data for rides and attractions across Walt Disney World and Universal Orlando Resort, updated every 15 minutes.',
        link: '/',
        pubDate: new Date('2025-01-01'),
      },
      {
        title: 'Analytics & Crowd Predictions',
        description:
          'Interactive charts, heatmaps, and AI-driven crowd level forecasts based on historical wait time patterns and seasonal trends.',
        link: '/analytics',
        pubDate: new Date('2025-01-01'),
      },
      {
        title: 'Plan My Visit',
        description:
          'Personalized itinerary generator that builds optimized ride schedules based on crowd predictions, park hours, and your preferences.',
        link: '/plan',
        pubDate: new Date('2025-01-01'),
      },
    ],
  });
}
