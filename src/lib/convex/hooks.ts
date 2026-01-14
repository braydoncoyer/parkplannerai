/**
 * Re-export Convex React hooks for convenience
 *
 * Usage:
 * ```tsx
 * import { useQuery, useMutation } from '@/lib/convex/hooks';
 * import { api } from '../../../convex/_generated/api';
 *
 * function MyComponent() {
 *   const parks = useQuery(api.queries.parks.getAllParks);
 *   const rideHistory = useQuery(api.queries.history.getRideHistory, {
 *     rideExternalId: '123',
 *     days: 7,
 *   });
 *   return <div>...</div>;
 * }
 * ```
 */
export { useQuery, useMutation, useAction } from "convex/react";
