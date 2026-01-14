import { ConvexClientProvider } from '../../lib/convex/ConvexClientProvider';
import AnalyticsDashboard from './AnalyticsDashboard';

/**
 * Analytics Dashboard wrapped with ConvexClientProvider
 * Use this component in Astro pages with client:load directive
 */
export default function AnalyticsDashboardWithProvider() {
  return (
    <ConvexClientProvider>
      <AnalyticsDashboard />
    </ConvexClientProvider>
  );
}
