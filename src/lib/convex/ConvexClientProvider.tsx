import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useState, useEffect, type ReactNode } from "react";

interface ConvexClientProviderProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Convex provider wrapper for React components
 *
 * The client is created lazily on mount to avoid SSR issues.
 *
 * Usage in Astro:
 * ```tsx
 * import { ConvexClientProvider } from '@/lib/convex/ConvexClientProvider';
 *
 * <ConvexClientProvider client:only="react">
 *   <YourReactComponent />
 * </ConvexClientProvider>
 * ```
 */
export function ConvexClientProvider({ children, fallback }: ConvexClientProviderProps) {
  const [convex, setConvex] = useState<ConvexReactClient | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    // Only create the client on the client-side
    const convexUrl = import.meta.env.PUBLIC_CONVEX_URL;

    if (!convexUrl) {
      console.warn(
        "PUBLIC_CONVEX_URL is not set. Convex features will not work."
      );
      setIsConfigured(false);
      return;
    }

    const client = new ConvexReactClient(convexUrl);
    setConvex(client);

    return () => {
      client.close();
    };
  }, []);

  // If Convex is not configured, render children without provider
  // Components should handle the case where Convex hooks return undefined
  if (!isConfigured) {
    return <>{children}</>;
  }

  // Show fallback while client is initializing
  if (!convex) {
    return <>{fallback ?? <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>}</>;
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

export default ConvexClientProvider;
