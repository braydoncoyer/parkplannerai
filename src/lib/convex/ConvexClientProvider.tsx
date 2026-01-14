import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

// Create the Convex client
// Note: PUBLIC_CONVEX_URL must be set in .env for Astro
const convexUrl = import.meta.env.PUBLIC_CONVEX_URL;

if (!convexUrl) {
  console.warn(
    "PUBLIC_CONVEX_URL is not set. Convex features will not work."
  );
}

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

interface ConvexClientProviderProps {
  children: ReactNode;
}

/**
 * Convex provider wrapper for React components
 *
 * Usage in Astro:
 * ```tsx
 * import { ConvexClientProvider } from '@/lib/convex/ConvexClientProvider';
 *
 * <ConvexClientProvider client:load>
 *   <YourReactComponent />
 * </ConvexClientProvider>
 * ```
 */
export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  if (!convex) {
    // Return children without provider if Convex is not configured
    // This allows the app to work without Convex during development
    return <>{children}</>;
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

export default ConvexClientProvider;
