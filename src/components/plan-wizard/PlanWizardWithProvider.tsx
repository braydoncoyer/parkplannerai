import { ConvexClientProvider } from '../../lib/convex/ConvexClientProvider';
import PlanWizard from './PlanWizard';

/**
 * PlanWizard wrapped with ConvexClientProvider
 * Use this component in Astro pages with client:only="react" directive
 * to enable Convex-powered historical predictions
 */
export default function PlanWizardWithProvider() {
  return (
    <ConvexClientProvider>
      <PlanWizard />
    </ConvexClientProvider>
  );
}
