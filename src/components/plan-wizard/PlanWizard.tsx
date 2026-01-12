import { useState, useEffect, useMemo } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  MapPin,
  Star,
  Calendar,
  Sparkles,
  Save,
  Trash2,
  Clock,
  Download,
  Lightbulb,
  Sun,
  Sunset,
  TrendingDown,
  Award,
  Route,
  Zap,
  Coffee,
  ArrowRight,
  Utensils,
  ShoppingBag,
  Pause,
  Target,
  Timer,
  RefreshCw,
} from 'lucide-react';
import './PlanWizard.css';
import {
  optimizeSchedule,
  optimizeMultiDaySchedule,
  classifyDayType,
  getDayTypeDescription,
  getPredictedWaitForHour,
  predictRideWaitTimes,
  type OptimizedSchedule,
  type MultiDaySchedule,
  type DayType,
} from '../../lib/analytics';
import {
  formatBreakSuggestion,
  getLandActivities,
} from '../../lib/analytics/data/landActivities';
import { getWalkTimeBetweenLands } from '../../lib/analytics/optimization/rideOrderer';
import { getRideWeight, type RideCategory as WeightCategory } from '../../lib/analytics/data/rideWeights';
import headlinerImages from '../../lib/analytics/data/headlinerImages.json';
import parkImagesData from '../../lib/analytics/data/parkImages.json';
import {
  getParkHours,
  type ParkHours,
} from '../../lib/api/parkHours';
import {
  fetchParkEntertainment,
  getDefaultEntertainment,
  formatShowTime,
  type ParkEntertainment,
} from '../../lib/api/entertainment';
import {
  getRopeDropStrategy,
} from '../../lib/analytics/data/ropeDropStrategy';
import {
  getResortForPark,
  getOtherParksInResort,
  supportsParkHopper,
  getParkShortName,
  getTransitionTime,
  TRANSITION_TIME_OPTIONS,
  type ResortPark,
} from '../../lib/analytics/data/resortPairings';

// ============================================================================
// HEADLINER IMAGE LOOKUP
// ============================================================================

const DEFAULT_HEADLINER_IMAGE = 'https://cdn1.parksmedia.wdprapps.disney.com/resize/mwImage/1/630/354/75/dam/disney-world/destinations/hollywood-studios/star-wars-galaxys-edge/rise-resistance-16x9.jpg?1703167709482';

/**
 * Normalize a ride name for matching - removes special characters, trademarks, etc.
 */
function normalizeRideName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[™®©]/g, '') // Remove trademark symbols
    .replace(/['']/g, "'") // Normalize apostrophes
    .replace(/[–—]/g, '-') // Normalize dashes
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim();
}

/**
 * Get the headliner image URL for a ride by name
 * Uses fuzzy matching to find the best match across all parks
 * Prioritizes non-empty URLs over empty ones
 */
function getHeadlinerImage(rideName: string): string {
  const normalizedName = normalizeRideName(rideName);

  // Search through all parks for a matching ride with a non-empty URL
  for (const parkRides of Object.values(headlinerImages)) {
    for (const [rideKey, imageUrl] of Object.entries(parkRides)) {
      const normalizedKey = normalizeRideName(rideKey);

      // Exact match
      if (normalizedKey === normalizedName) {
        if (imageUrl) return imageUrl;
        continue;
      }

      // Partial match (ride name contains key or key contains ride name)
      if (normalizedName.includes(normalizedKey) || normalizedKey.includes(normalizedName)) {
        if (imageUrl) return imageUrl;
        continue;
      }

      // Word-based matching for multi-word names (need at least 2 significant words to match)
      const keyWords = normalizedKey.split(/\s+/).filter(w => w.length > 3 && !['the', 'and', 'of'].includes(w));
      const nameWords = normalizedName.split(/\s+/).filter(w => w.length > 3 && !['the', 'and', 'of'].includes(w));
      const matchingWords = keyWords.filter(kw => nameWords.some(nw => nw.includes(kw) || kw.includes(nw)));

      if (matchingWords.length >= 2 || (keyWords.length === 1 && matchingWords.length === 1)) {
        if (imageUrl) return imageUrl;
        continue;
      }
    }
  }

  return DEFAULT_HEADLINER_IMAGE;
}

// ============================================================================
// TYPES
// ============================================================================

interface Park {
  id: number;
  name: string;
  operator: string;
}

interface Ride {
  id: number;
  name: string;
  land: string;
  is_open: boolean;
  wait_time: number | null;
  parkId?: number;        // For park hopper: which park this ride belongs to
  parkShortName?: string; // For park hopper: short name badge (e.g., "DL", "DCA")
}

interface SelectedDate {
  date: Date;
  duration: 'full-day' | 'half-day';
  arrivalTime: string;
  ropeDropTarget?: string; // Name of the ride to prioritize at rope drop
}

interface PlanPreferences {
  priority: 'thrill' | 'family' | 'shows' | 'balanced';
  includeBreaks: boolean;
}

interface ItineraryItem {
  time: string;
  type: 'ride' | 'break' | 'meal' | 'suggestion' | 'entertainment';
  name: string;
  expectedWait?: number;
  notes?: string;
  land?: string;
  isReride?: boolean;
  suggestionType?: 'dining' | 'shopping' | 'show';
  // Break-specific fields
  breakDuration?: number; // in minutes
  peakWaitTime?: number; // the wait time being avoided during break
  diningName?: string;
  diningDetail?: string;
  diningImage?: string;
  shoppingName?: string;
  shoppingDetail?: string;
  shoppingImage?: string;
}

interface SkippedRide {
  name: string;
  reason: string;
  category: 'headliner' | 'popular' | 'family' | 'standard';
}

interface DayItinerary {
  date: Date;
  dayNumber: number;
  dayLabel: string;
  dayType: DayType;
  duration: 'full-day' | 'half-day';
  items: ItineraryItem[];
  totalWaitTime: number;
  ridesCount: number;
  insights: string[];
  parkHours?: ParkHours;
  skippedRides?: SkippedRide[];
}

interface TripReport {
  days: DayItinerary[];
  strategySummary: string[];
  headlinerStrategy: string[];
  totalWaitTime: number;
  totalRides: number;
  waitTimeSaved: number;
  percentImprovement: number;
}

interface SavedPlan {
  id: string;
  parkId: number;
  parkName: string;
  dates: string[];
  createdAt: string;
  report: TripReport;
  selectedRides: number[];
}

type Step = 'park' | 'ticket-type' | 'entertainment' | 'schedule-style' | 'dates' | 'rides' | 'report';

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: 'park', label: 'Select Park', icon: <MapPin size={18} /> },
  { key: 'ticket-type', label: 'Ticket Type', icon: <Route size={18} /> },
  { key: 'entertainment', label: 'Entertainment', icon: <Sparkles size={18} /> },
  { key: 'schedule-style', label: 'Schedule Style', icon: <RefreshCw size={18} /> },
  { key: 'dates', label: 'Choose Dates', icon: <Calendar size={18} /> },
  { key: 'rides', label: 'Select Rides', icon: <Star size={18} /> },
  { key: 'report', label: 'Your Plan', icon: <Award size={18} /> },
];

// Parks that have nighttime entertainment (fireworks/shows) and parades
const PARK_ENTERTAINMENT_SUPPORT: Record<number, { hasFireworks: boolean; hasParade: boolean; fireworksName?: string; paradeName?: string }> = {
  // Walt Disney World
  6: { hasFireworks: true, hasParade: true, fireworksName: 'Happily Ever After', paradeName: 'Festival of Fantasy' },
  5: { hasFireworks: true, hasParade: false, fireworksName: 'Luminous' },
  7: { hasFireworks: true, hasParade: false, fireworksName: 'Fantasmic!' },
  8: { hasFireworks: false, hasParade: false }, // Animal Kingdom - no regular nighttime spectacular
  // Disneyland Resort
  16: { hasFireworks: true, hasParade: true, fireworksName: 'Wondrous Journeys', paradeName: 'Magic Happens' },
  17: { hasFireworks: true, hasParade: false, fireworksName: 'World of Color' },
  // Universal parks - generally no fireworks/parades
  64: { hasFireworks: false, hasParade: false },
  65: { hasFireworks: false, hasParade: false },
  334: { hasFireworks: false, hasParade: false },
  66: { hasFireworks: false, hasParade: false },
};

// Fallback park images (used when JSON has no image)
const FALLBACK_PARK_IMAGES: Record<number, string> = {
  // Walt Disney World
  6: 'https://images.pexels.com/photos/8183994/pexels-photo-8183994.jpeg?auto=compress&cs=tinysrgb&w=600', // Magic Kingdom
  5: 'https://media.cntraveler.com/photos/5cb5f5d38ae5d86a66e28b32/master/pass/Epcot-1.jpg', // EPCOT
  7: 'https://images.pexels.com/photos/14243455/pexels-photo-14243455.jpeg?auto=compress&cs=tinysrgb&w=600', // Hollywood Studios (has Fantasmic)
  8: 'https://images.pexels.com/photos/3617464/pexels-photo-3617464.jpeg?auto=compress&cs=tinysrgb&w=600', // Animal Kingdom
  // Disneyland Resort
  16: 'https://cdn1.parksmedia.wdprapps.disney.com/resize/mwImage/1/1349/464/75/dam/disneyland/attractions/disneyland/sleeping-beauty-castle-walkthrough/sleeping-beauty-castle-exterior-16x9.jpg', // Disneyland
  17: 'https://cdn1.parksmedia.wdprapps.disney.com/resize/mwImage/1/480/1280/90/media/disneyparksjapan-prod/disneyparksjapan_v0001/1/media/dlr/events/pixar-pier-sunset-render-16x9.jpg', // Disney California Adventure
  // Universal Orlando
  64: 'https://www.disneydining.com/wp-content/uploads/2024/02/universal-orlando-islands-of-adventure.jpg', // Islands of Adventure
  65: 'https://cache.undercovertourist.com/blog/2022/10/1022-best-time-visit-uor-globe.jpg', // Universal Studios Florida
  67: 'https://www.thetopvillas.com/blog/wp-content/uploads/2017/06/rsz_1volcano_bay_orlando-1.jpg', // Volcano Bay
  334: 'https://www.universalorlando.com/webdata/k2/en/us/files/Images/gds/ueu-theme-park-chronos-daytime-with-guests-c.jpg', // Epic Universe
  // Universal Hollywood
  66: 'https://res.cloudinary.com/simpleview/image/upload/v1612197440/clients/anaheimca/uni_studios_hollywood_max_res_default2_3f15e0a6-8283-470c-8870-1f2a89c02952.jpg', // Universal Studios Hollywood
};

// Build a flat map of park ID to image URL from the JSON
const PARK_IMAGES_FROM_JSON: Record<number, string> = {};
for (const resortParks of Object.values(parkImagesData)) {
  for (const [parkId, parkData] of Object.entries(resortParks)) {
    const data = parkData as { name: string; image: string };
    if (data.image) {
      PARK_IMAGES_FROM_JSON[Number(parkId)] = data.image;
    }
  }
}

/**
 * Get the image URL for a park by ID
 * First checks the JSON file, then falls back to hardcoded defaults
 */
function getParkImage(parkId: number): string {
  // Check JSON-sourced images first
  if (PARK_IMAGES_FROM_JSON[parkId]) {
    return PARK_IMAGES_FROM_JSON[parkId];
  }

  // Fall back to hardcoded defaults
  return FALLBACK_PARK_IMAGES[parkId] || DEFAULT_IMAGE;
}

const DEFAULT_IMAGE =
  'https://images.pexels.com/photos/8183994/pexels-photo-8183994.jpeg?auto=compress&cs=tinysrgb&w=600';

const STORAGE_KEY = 'parkpulse_saved_plans_v2';

const ARRIVAL_TIMES = [
  { value: 'rope-drop', label: 'Rope Drop', sublabel: 'Park Opening' },
  { value: '10am', label: '10:00 AM', sublabel: 'Mid-morning' },
  { value: '12pm', label: '12:00 PM', sublabel: 'Afternoon' },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getSavedPlans(): SavedPlan[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function savePlan(plan: SavedPlan): void {
  const plans = getSavedPlans();
  const existingIndex = plans.findIndex((p) => p.id === plan.id);
  if (existingIndex >= 0) {
    plans[existingIndex] = plan;
  } else {
    plans.unshift(plan);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans.slice(0, 10)));
}

function deletePlan(planId: string): void {
  const plans = getSavedPlans().filter((p) => p.id !== planId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

function generatePlanId(): string {
  return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateFull(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatDayOfWeek(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Add padding for start of week
  const startPadding = firstDay.getDay();
  for (let i = startPadding - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }

  // Add all days in month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  // Add padding for end of week
  const endPadding = 6 - lastDay.getDay();
  for (let i = 1; i <= endPadding; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

// ============================================================================
// STEP INDICATOR
// ============================================================================

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
  const totalSteps = STEPS.length;

  // Progress is calculated as segments completed
  // For 7 steps, there are 6 segments between them
  // currentIndex 0 = 0%, currentIndex 1 = 16.67%, currentIndex 6 = 100%
  const progressPercent = totalSteps > 1 ? (currentIndex / (totalSteps - 1)) * 100 : 0;

  return (
    <div className="pw-stepper">
      {/* Background line - spans full width behind circles */}
      <div className="pw-stepper-track">
        <div
          className="pw-stepper-progress"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step circles - evenly distributed */}
      <div className="pw-stepper-steps">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;

          return (
            <div key={step.key} className="pw-stepper-step">
              <div
                className={`pw-stepper-circle ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
              >
                {isCompleted ? <Check size={16} /> : <span>{index + 1}</span>}
              </div>
              <span className={`pw-stepper-label ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// PARK SELECTION
// ============================================================================

function ParkSelection({
  parks,
  selectedPark,
  onSelect,
}: {
  parks: Park[];
  selectedPark: number | null;
  onSelect: (id: number) => void;
}) {
  const disneyParks = parks.filter((p) => p.operator.toLowerCase() === 'disney');
  const universalParks = parks.filter((p) => p.operator.toLowerCase() === 'universal');

  const ParkCard = ({ park }: { park: Park }) => {
    const isSelected = selectedPark === park.id;
    return (
      <button
        className={`pw-park-card ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelect(park.id)}
      >
        <div
          className="pw-park-image"
          style={{ backgroundImage: `url(${getParkImage(park.id)})` }}
        />
        <div className="pw-park-overlay" />
        <div className="pw-park-content">
          <span className="pw-park-name">{park.name}</span>
          {isSelected && (
            <span className="pw-park-check">
              <Check size={16} />
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="pw-section">
      <div className="pw-section-header">
        <h2>Where's your adventure?</h2>
        <p>Select the park you're planning to visit</p>
      </div>

      <div className="pw-park-group">
        <span className="pw-group-label">Disney Parks</span>
        <div className="pw-park-grid">
          {disneyParks.map((park) => (
            <ParkCard key={park.id} park={park} />
          ))}
        </div>
      </div>

      <div className="pw-park-group">
        <span className="pw-group-label">Universal Parks</span>
        <div className="pw-park-grid">
          {universalParks.map((park) => (
            <ParkCard key={park.id} park={park} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TICKET TYPE SELECTION (Park Hopper)
// ============================================================================

function TicketTypeSelection({
  selectedPark,
  parks,
  isParkHopper,
  secondParkId,
  transitionTime,
  onParkHopperChange,
  onSecondParkChange,
  onTransitionTimeChange,
}: {
  selectedPark: number;
  parks: Park[];
  isParkHopper: boolean;
  secondParkId: number | null;
  transitionTime: string;
  onParkHopperChange: (enabled: boolean) => void;
  onSecondParkChange: (parkId: number) => void;
  onTransitionTimeChange: (time: string) => void;
}) {
  const selectedParkData = parks.find(p => p.id === selectedPark);
  const otherParks = getOtherParksInResort(selectedPark);
  const hasMultipleOptions = otherParks.length > 1;
  const resortConfig = getResortForPark(selectedPark);

  return (
    <div className="pw-section">
      <div className="pw-section-header">
        <h2>What type of ticket?</h2>
        <p>Are you visiting just {selectedParkData?.name}, or hopping between parks?</p>
      </div>

      <div className="pw-ticket-options">
        {/* Single Park Option */}
        <button
          className={`pw-ticket-card ${!isParkHopper ? 'selected' : ''}`}
          onClick={() => onParkHopperChange(false)}
        >
          <div className="pw-ticket-icon">
            <MapPin size={32} />
          </div>
          <div className="pw-ticket-content">
            <span className="pw-ticket-title">Single Park</span>
            <span className="pw-ticket-desc">
              Spend your day at {selectedParkData?.name}
            </span>
          </div>
          <div className="pw-ticket-check">
            {!isParkHopper && <Check size={20} />}
          </div>
        </button>

        {/* Park Hopper Option */}
        <button
          className={`pw-ticket-card ${isParkHopper ? 'selected' : ''}`}
          onClick={() => onParkHopperChange(true)}
        >
          <div className="pw-ticket-icon">
            <Route size={32} />
          </div>
          <div className="pw-ticket-content">
            <span className="pw-ticket-title">Park Hopper</span>
            <span className="pw-ticket-desc">
              Start at {selectedParkData?.name}, then hop to another park
            </span>
          </div>
          <div className="pw-ticket-check">
            {isParkHopper && <Check size={20} />}
          </div>
        </button>
      </div>

      {/* Park Hopper Options */}
      {isParkHopper && (
        <div className="pw-hopper-config">
          {/* Second Park Selection - only show if multiple options */}
          {hasMultipleOptions && (
            <div className="pw-hopper-field">
              <label>Which park will you hop to?</label>
              <div className="pw-hopper-park-options">
                {otherParks.map((park) => (
                  <button
                    key={park.id}
                    className={`pw-hopper-park-btn ${secondParkId === park.id ? 'selected' : ''}`}
                    onClick={() => onSecondParkChange(park.id)}
                  >
                    <span className="pw-hopper-park-name">{park.name}</span>
                    <span className="pw-hopper-park-short">{park.shortName}</span>
                    {secondParkId === park.id && <Check size={16} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Auto-selected message for single option */}
          {!hasMultipleOptions && otherParks.length === 1 && (
            <div className="pw-hopper-auto-select">
              <Check size={16} />
              <span>You'll hop to <strong>{otherParks[0].name}</strong></span>
            </div>
          )}

          {/* Transition Time */}
          <div className="pw-hopper-field">
            <label>When will you switch parks?</label>
            <div className="pw-hopper-time-options">
              {TRANSITION_TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`pw-hopper-time-btn ${transitionTime === opt.value ? 'selected' : ''}`}
                  onClick={() => onTransitionTimeChange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <span className="pw-hopper-time-hint">
              Travel time between parks: ~{resortConfig?.transitionTime || 15} minutes
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ENTERTAINMENT PREFERENCE
// ============================================================================

function EntertainmentPreference({
  selectedPark,
  secondParkId,
  isParkHopper,
  wantFireworks,
  wantParade,
  onFireworksChange,
  onParadeChange,
}: {
  selectedPark: number | null;
  secondParkId: number | null;
  isParkHopper: boolean;
  wantFireworks: boolean;
  wantParade: boolean;
  onFireworksChange: (value: boolean) => void;
  onParadeChange: (value: boolean) => void;
}) {
  // Get entertainment support for selected parks
  const primarySupport = selectedPark ? PARK_ENTERTAINMENT_SUPPORT[selectedPark] : null;
  const secondarySupport = secondParkId ? PARK_ENTERTAINMENT_SUPPORT[secondParkId] : null;

  // Check if any park has fireworks or parades
  const anyFireworks = primarySupport?.hasFireworks || secondarySupport?.hasFireworks;
  const anyParade = primarySupport?.hasParade || secondarySupport?.hasParade;

  // Get fireworks and parade names for display
  const getFireworksNames = () => {
    const names: string[] = [];
    if (primarySupport?.fireworksName) names.push(primarySupport.fireworksName);
    if (secondarySupport?.fireworksName) names.push(secondarySupport.fireworksName);
    return names;
  };

  const getParadeNames = () => {
    const names: string[] = [];
    if (primarySupport?.paradeName) names.push(primarySupport.paradeName);
    if (secondarySupport?.paradeName) names.push(secondarySupport.paradeName);
    return names;
  };

  const fireworksNames = getFireworksNames();
  const paradeNames = getParadeNames();

  // If no entertainment is available, show a simple message
  if (!anyFireworks && !anyParade) {
    return (
      <div className="pw-section">
        <div className="pw-section-header">
          <h2>Entertainment</h2>
          <p>This park doesn't have scheduled fireworks or parades.</p>
        </div>
        <div className="pw-entertainment-none">
          <Sparkles size={48} strokeWidth={1} />
          <p>No nighttime spectaculars are available at this park.</p>
          <p className="pw-entertainment-tip">
            More time for rides!
          </p>
        </div>
      </div>
    );
  }

  const noEntertainmentSelected = !wantFireworks && !wantParade;

  return (
    <div className="pw-section">
      <div className="pw-section-header">
        <h2>Entertainment Preferences</h2>
        <p>Would you like to include fireworks or parades in your day?</p>
      </div>

      <div className="pw-entertainment-options">
        {/* Fireworks Option */}
        {anyFireworks && (
          <button
            className={`pw-entertainment-card ${wantFireworks ? 'selected' : ''}`}
            onClick={() => onFireworksChange(!wantFireworks)}
          >
            <div className="pw-entertainment-icon">
              <Sparkles size={32} />
            </div>
            <div className="pw-entertainment-content">
              <span className="pw-entertainment-title">Nighttime Spectacular</span>
              <span className="pw-entertainment-desc">
                {fireworksNames.length > 0
                  ? fireworksNames.join(', ')
                  : 'End the night with a spectacular show'}
              </span>
              <span className="pw-entertainment-note">
                {wantFireworks
                  ? '✓ Scheduled at the end of your night'
                  : 'Typically ~30 min before park close'}
              </span>
            </div>
            <div className="pw-entertainment-check">
              {wantFireworks && <Check size={20} />}
            </div>
          </button>
        )}

        {/* Parade Option */}
        {anyParade && (
          <button
            className={`pw-entertainment-card ${wantParade ? 'selected' : ''}`}
            onClick={() => onParadeChange(!wantParade)}
          >
            <div className="pw-entertainment-icon">
              <Star size={32} />
            </div>
            <div className="pw-entertainment-content">
              <span className="pw-entertainment-title">Parade</span>
              <span className="pw-entertainment-desc">
                {paradeNames.length > 0
                  ? paradeNames.join(', ')
                  : 'Don\'t miss the daily parade'}
              </span>
              <span className="pw-entertainment-note">
                {wantParade
                  ? '✓ Added to your schedule'
                  : 'Usually in the afternoon'}
              </span>
            </div>
            <div className="pw-entertainment-check">
              {wantParade && <Check size={20} />}
            </div>
          </button>
        )}
      </div>

      {/* Selected Summary */}
      {(wantFireworks || wantParade) && (
        <div className="pw-entertainment-summary">
          <Check size={16} />
          <span>
            {wantFireworks && wantParade
              ? 'We\'ll schedule both the parade and nighttime spectacular'
              : wantFireworks
                ? 'We\'ll end your day with the nighttime spectacular'
                : 'We\'ll fit the parade into your schedule'}
          </span>
        </div>
      )}

      {/* Skip link at bottom */}
      <button
        className="pw-entertainment-skip-link"
        onClick={() => {
          onFireworksChange(false);
          onParadeChange(false);
        }}
      >
        {noEntertainmentSelected
          ? '✓ Skipping entertainment — more time for rides!'
          : 'Skip entertainment and maximize ride time'}
      </button>
    </div>
  );
}

// ============================================================================
// SCHEDULE STYLE PREFERENCE
// ============================================================================

function ScheduleStylePreference({
  allowRerides,
  onReridePrefChange,
}: {
  allowRerides: boolean;
  onReridePrefChange: (value: boolean) => void;
}) {
  return (
    <div className="pw-section">
      <div className="pw-section-header">
        <h2>Schedule Style</h2>
        <p>How would you like us to fill your day?</p>
      </div>

      <div className="pw-schedule-style-options">
        {/* Maximize Rides Option */}
        <button
          className={`pw-schedule-style-card ${allowRerides ? 'selected' : ''}`}
          onClick={() => onReridePrefChange(true)}
        >
          <div className="pw-schedule-style-icon">
            <RefreshCw size={32} />
          </div>
          <div className="pw-schedule-style-content">
            <span className="pw-schedule-style-title">Maximize Ride Time</span>
            <span className="pw-schedule-style-desc">
              Fill any free time with re-rides of your favorite attractions
            </span>
            <span className="pw-schedule-style-note">
              {allowRerides
                ? '✓ We\'ll suggest re-rides to keep you busy'
                : 'Perfect for thrill-seekers who want non-stop action'}
            </span>
          </div>
          <div className="pw-schedule-style-check">
            {allowRerides && <Check size={20} />}
          </div>
        </button>

        {/* Relaxed Option */}
        <button
          className={`pw-schedule-style-card ${!allowRerides ? 'selected' : ''}`}
          onClick={() => onReridePrefChange(false)}
        >
          <div className="pw-schedule-style-icon">
            <Coffee size={32} />
          </div>
          <div className="pw-schedule-style-content">
            <span className="pw-schedule-style-title">Relaxed Pace</span>
            <span className="pw-schedule-style-desc">
              Stick to your selected rides with free time to explore and relax
            </span>
            <span className="pw-schedule-style-note">
              {!allowRerides
                ? '✓ More time to explore, shop, and take breaks'
                : 'Great for families or those who prefer a slower day'}
            </span>
          </div>
          <div className="pw-schedule-style-check">
            {!allowRerides && <Check size={20} />}
          </div>
        </button>
      </div>

      <div className="pw-schedule-style-summary">
        <Lightbulb size={16} />
        <span>
          {allowRerides
            ? 'If you\'ve selected fewer rides than we can fit, we\'ll suggest re-rides of popular attractions during open slots.'
            : 'Your schedule will include only your selected rides with breaks and meals. You\'ll have more free time for spontaneous exploration.'}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// DATE SELECTION CALENDAR
// ============================================================================

function DateSelection({
  selectedDates,
  onToggleDate,
  onUpdateDate,
  selectedPark,
  parkHoursMap,
}: {
  selectedDates: SelectedDate[];
  onToggleDate: (date: Date) => void;
  onUpdateDate: (date: Date, updates: Partial<SelectedDate>) => void;
  selectedPark: number | null;
  parkHoursMap: Record<string, ParkHours>;
}) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  // Check if a date is today
  const isToday = (date: Date) => {
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
  };

  // Get available arrival times for a specific date
  // If it's today, filter out times that have already passed
  const getAvailableArrivalTimes = (date: Date) => {
    if (!isToday(date)) {
      return ARRIVAL_TIMES; // All options available for future dates
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    // Get park opening time for rope drop calculation
    const dateKey = date.toISOString().split('T')[0];
    const parkHours = parkHoursMap[dateKey];
    // Default rope drop to 9am if we don't have park hours
    const ropeDropMinutes = parkHours
      ? parkHours.openHour * 60 + (parkHours.openMinute || 0)
      : 9 * 60; // 9:00 AM default

    return ARRIVAL_TIMES.filter((time) => {
      // Add 15 minutes buffer - if you're within 15 min of an arrival time, it's too late
      const buffer = 15;

      switch (time.value) {
        case 'rope-drop':
          // Rope drop is only available if current time is before park opening
          return currentTotalMinutes < ropeDropMinutes - buffer;
        case '10am':
          return currentTotalMinutes < 10 * 60 - buffer; // Before 9:45 AM
        case '12pm':
          return currentTotalMinutes < 12 * 60 - buffer; // Before 11:45 AM
        default:
          return true;
      }
    });
  };

  // Auto-correct arrival times for today if the selected time is no longer valid
  useEffect(() => {
    for (const sd of selectedDates) {
      if (isToday(sd.date)) {
        const availableTimes = getAvailableArrivalTimes(sd.date);
        const currentTimeIsValid = availableTimes.some(t => t.value === sd.arrivalTime);

        if (!currentTimeIsValid && availableTimes.length > 0) {
          // Auto-select the first available time
          onUpdateDate(sd.date, {
            arrivalTime: availableTimes[0].value,
            // Clear rope drop target if we're no longer doing rope drop
            ropeDropTarget: availableTimes[0].value === 'rope-drop' ? sd.ropeDropTarget : undefined,
          });
        }
      }
    }
  }, [selectedDates, parkHoursMap]); // Re-check when dates or park hours change

  const days = useMemo(() => getMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const isDateSelected = (date: Date) => selectedDates.some((sd) => isSameDay(sd.date, date));
  const getSelectedDate = (date: Date) => selectedDates.find((sd) => isSameDay(sd.date, date));
  const isInCurrentMonth = (date: Date) => date.getMonth() === viewMonth;
  const isPast = (date: Date) => {
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return date < todayStart;
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Sort selected dates for display
  const sortedSelectedDates = [...selectedDates].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  return (
    <div className="pw-section">
      <div className="pw-section-header">
        <h2>When are you visiting?</h2>
        <p>Select the dates you'll be at the park. You can choose multiple non-consecutive days.</p>
      </div>

      <div className="pw-date-layout">
        {/* Calendar */}
        <div className="pw-calendar">
          <div className="pw-calendar-header">
            <button className="pw-cal-nav" onClick={prevMonth}>
              <ChevronLeft size={20} />
            </button>
            <span className="pw-cal-month">{monthName}</span>
            <button className="pw-cal-nav" onClick={nextMonth}>
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="pw-calendar-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="pw-calendar-days">
            {days.map((date, idx) => {
              const selected = isDateSelected(date);
              const inMonth = isInCurrentMonth(date);
              const past = isPast(date);
              const dayType = classifyDayType(date);

              return (
                <button
                  key={idx}
                  className={`pw-cal-day ${selected ? 'selected' : ''} ${!inMonth ? 'other-month' : ''} ${past ? 'past' : ''}`}
                  onClick={() => !past && onToggleDate(date)}
                  disabled={past}
                >
                  <span className="pw-cal-day-num">{date.getDate()}</span>
                  {inMonth && !past && (
                    <span className={`pw-cal-day-type ${dayType}`}>
                      {dayType === 'weekend' && <span className="pw-dot orange" />}
                      {dayType === 'holiday' && <span className="pw-dot red" />}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pw-calendar-legend">
            <span><span className="pw-dot green" /> Weekday (Lower crowds)</span>
            <span><span className="pw-dot orange" /> Weekend</span>
            <span><span className="pw-dot red" /> Holiday/Peak</span>
          </div>
        </div>

        {/* Selected dates panel */}
        <div className="pw-selected-dates">
          <h3>Your Visit Days</h3>
          {sortedSelectedDates.length === 0 ? (
            <div className="pw-no-dates">
              <Calendar size={32} />
              <p>Click on the calendar to select your visit dates</p>
            </div>
          ) : (
            <div className="pw-date-cards">
              {sortedSelectedDates.map((sd, idx) => {
                const dayType = classifyDayType(sd.date);
                return (
                  <div key={sd.date.toISOString()} className="pw-date-card">
                    <div className="pw-date-card-header">
                      <div className="pw-date-card-info">
                        <span className="pw-date-card-day">Day {idx + 1}</span>
                        <span className="pw-date-card-date">{formatDateFull(sd.date)}</span>
                        <span className={`pw-date-card-type ${dayType}`}>
                          {dayType === 'weekday' && 'Lower crowds expected'}
                          {dayType === 'weekend' && 'Weekend crowds'}
                          {dayType === 'holiday' && 'Peak day - plan carefully'}
                        </span>
                      </div>
                      <button
                        className="pw-date-card-remove"
                        onClick={() => onToggleDate(sd.date)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="pw-date-card-options">
                      <div className="pw-option-group">
                        <label>Duration</label>
                        <div className="pw-toggle-buttons">
                          <button
                            className={sd.duration === 'full-day' ? 'active' : ''}
                            onClick={() => onUpdateDate(sd.date, { duration: 'full-day' })}
                          >
                            <Sun size={14} />
                            Full Day
                          </button>
                          <button
                            className={sd.duration === 'half-day' ? 'active' : ''}
                            onClick={() => onUpdateDate(sd.date, { duration: 'half-day' })}
                          >
                            <Sunset size={14} />
                            Half Day
                          </button>
                        </div>
                      </div>

                      <div className="pw-option-group">
                        <label>
                          Arrival
                          {isToday(sd.date) && (
                            <span className="pw-today-badge">Today</span>
                          )}
                        </label>
                        {(() => {
                          const availableTimes = getAvailableArrivalTimes(sd.date);
                          const noTimesAvailable = availableTimes.length === 0;

                          if (noTimesAvailable) {
                            return (
                              <div className="pw-no-times-message">
                                <Clock size={14} />
                                <span>It's too late to plan a visit for today. Please select a future date.</span>
                              </div>
                            );
                          }

                          return (
                            <div className="pw-arrival-options">
                              {availableTimes.map((time) => (
                                <button
                                  key={time.value}
                                  className={`pw-arrival-btn ${sd.arrivalTime === time.value ? 'active' : ''}`}
                                  onClick={() => onUpdateDate(sd.date, { arrivalTime: time.value })}
                                >
                                  {time.label}
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Rope Drop Target Selector */}
                      {sd.arrivalTime === 'rope-drop' && selectedPark && (() => {
                        const strategy = getRopeDropStrategy(selectedPark);
                        if (!strategy) return null;

                        return (
                          <div className="pw-rope-drop-selector">
                            <div className="pw-rope-drop-header">
                              <Target size={16} />
                              <span>Your Rope Drop Target</span>
                            </div>
                            <p className="pw-rope-drop-subtitle">
                              Choose one ride to prioritize when the gates open
                            </p>
                            <div className="pw-rope-drop-targets">
                              {strategy.targets.map((target) => {
                                const timeSaved = target.typicalMiddayWait - target.typicalRopeDropWait;
                                const isSelected = sd.ropeDropTarget === target.rideName;

                                return (
                                  <button
                                    key={target.rideName}
                                    className={`pw-rope-drop-target ${isSelected ? 'selected' : ''}`}
                                    onClick={() => onUpdateDate(sd.date, {
                                      ropeDropTarget: isSelected ? undefined : target.rideName
                                    })}
                                  >
                                    <div className="pw-target-priority">
                                      P{target.priority}
                                    </div>
                                    <div className="pw-target-info">
                                      <span className="pw-target-name">{target.rideName}</span>
                                      <div className="pw-target-stats">
                                        <span className="pw-target-wait">
                                          <Timer size={12} />
                                          ~{target.typicalRopeDropWait} min
                                        </span>
                                        <span className="pw-target-savings">
                                          Save {timeSaved}+ min
                                        </span>
                                      </div>
                                    </div>
                                    <div className="pw-target-check">
                                      {isSelected && <Check size={14} />}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            {strategy.generalTips[0] && (
                              <p className="pw-rope-drop-tip">
                                💡 {strategy.generalTips[0]}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// RIDE SELECTION
// ============================================================================

function RideSelection({
  rides,
  selectedRides,
  onToggle,
  onToggleLand,
  preferences,
  onPreferencesChange,
  ropeDropTargets = [],
  isParkHopper = false,
  maxRideLimit,
  isAtLimit,
  isNearLimit,
}: {
  rides: Ride[];
  selectedRides: number[];
  onToggle: (id: number) => void;
  onToggleLand: (rideIds: number[], selectAll: boolean) => void;
  preferences: PlanPreferences;
  onPreferencesChange: (prefs: PlanPreferences) => void;
  ropeDropTargets?: string[]; // Ride names selected as rope drop targets
  isParkHopper?: boolean;
  maxRideLimit: number;
  isAtLimit: boolean;
  isNearLimit: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Helper to check if a ride is a rope drop target
  const isRopeDropTarget = (rideName: string): boolean => {
    const normalized = rideName.toLowerCase();
    return ropeDropTargets.some(target => {
      const targetNormalized = target.toLowerCase();
      return normalized === targetNormalized ||
             normalized.includes(targetNormalized) ||
             targetNormalized.includes(normalized);
    });
  };

  // Group rides by land (or park+land in park hopper mode)
  const ridesByLand = rides.reduce(
    (acc, ride) => {
      // In park hopper mode, group by park+land to keep parks separate
      // This creates keys like "DL|Fantasyland" or "DCA|Hollywood Land"
      const baseLand = ride.land || 'Other';
      const groupKey = isParkHopper && ride.parkShortName
        ? `${ride.parkShortName}|${baseLand}`
        : baseLand;
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(ride);
      return acc;
    },
    {} as Record<string, Ride[]>
  );

  const filteredRidesByLand = Object.entries(ridesByLand).reduce(
    (acc, [land, landRides]) => {
      const filtered = landRides.filter((ride) =>
        ride.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filtered.length > 0) acc[land] = filtered;
      return acc;
    },
    {} as Record<string, Ride[]>
  );

  // Helper to parse grouped key back to display name and park badge
  const parseLandKey = (key: string): { landName: string; parkBadge: string | null } => {
    if (key.includes('|')) {
      const [parkBadge, landName] = key.split('|');
      return { landName, parkBadge };
    }
    return { landName: key, parkBadge: null };
  };

  // Check if all rides in a land are selected
  const isLandFullySelected = (landRides: Ride[]) => {
    return landRides.every((ride) => selectedRides.includes(ride.id));
  };

  const isLandPartiallySelected = (landRides: Ride[]) => {
    const selectedCount = landRides.filter((ride) => selectedRides.includes(ride.id)).length;
    return selectedCount > 0 && selectedCount < landRides.length;
  };

  return (
    <div className="pw-section">
      <div className="pw-section-header">
        <h2>What do you want to experience?</h2>
        <p>Select your must-do attractions. We'll optimize your schedule around these.</p>
      </div>

      <div className="pw-rides-layout">
        <div className="pw-rides-main">
          <div className="pw-rides-search">
            <input
              type="text"
              placeholder="Search attractions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="pw-rides-list">
            {Object.entries(filteredRidesByLand).map(([landKey, landRides]) => {
              const { landName, parkBadge } = parseLandKey(landKey);
              const allSelected = isLandFullySelected(landRides);
              const partiallySelected = isLandPartiallySelected(landRides);
              const rideIds = landRides.map((r) => r.id);

              return (
                <div key={landKey} className="pw-ride-group">
                  <div className={`pw-ride-group-header ${isParkHopper ? 'sticky' : ''}`}>
                    <label className="pw-land-select-all" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = partiallySelected;
                        }}
                        onChange={() => onToggleLand(rideIds, !allSelected)}
                      />
                      <span className="pw-land-checkbox">
                        {allSelected && <Check size={12} />}
                        {partiallySelected && !allSelected && <span className="pw-checkbox-partial" />}
                      </span>
                    </label>
                    <MapPin size={14} />
                    <span>{landName}</span>
                    {parkBadge && (
                      <span className="pw-land-park-badge">{parkBadge}</span>
                    )}
                    <span className="pw-land-count">
                      {landRides.filter((r) => selectedRides.includes(r.id)).length}/{landRides.length}
                    </span>
                  </div>
                  <div className="pw-ride-items">
                    {landRides.map((ride) => {
                      const isSelected = selectedRides.includes(ride.id);
                      const isRopeDrop = isRopeDropTarget(ride.name);
                      return (
                        <button
                          key={ride.id}
                          className={`pw-ride-item ${isSelected ? 'selected' : ''} ${isRopeDrop ? 'rope-drop-target' : ''}`}
                          onClick={() => onToggle(ride.id)}
                        >
                          <span className="pw-ride-name">
                            {ride.name}
                            {isRopeDrop && (
                              <span className="pw-rope-drop-badge">
                                <Target size={10} />
                                Rope Drop
                              </span>
                            )}
                          </span>
                          <span className="pw-ride-check">
                            {isSelected && <Check size={14} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pw-rides-sidebar">
          {/* Rides Remaining Counter */}
          <div className={`pw-rides-counter-card ${isAtLimit ? 'at-limit' : isNearLimit ? 'near-limit' : ''}`}>
            <div className="pw-rides-counter-header">
              <Star size={18} />
              <span>Rides Selected</span>
            </div>
            <div className="pw-rides-counter-display">
              <span className="pw-rides-counter-current">{selectedRides.length}</span>
              <span className="pw-rides-counter-separator">/</span>
              <span className="pw-rides-counter-max">{maxRideLimit}</span>
            </div>
            <div className="pw-rides-counter-remaining">
              {isAtLimit ? (
                <span className="pw-rides-limit-reached">
                  <Zap size={14} />
                  Limit reached
                </span>
              ) : (
                <span>{maxRideLimit - selectedRides.length} more available</span>
              )}
            </div>
            {isNearLimit && !isAtLimit && (
              <div className="pw-rides-counter-hint">
                Choose your favorites!
              </div>
            )}
            <p className="pw-rides-counter-note">
              {isParkHopper
                ? "*Reduced limit because you're visiting two parks. Travel time between parks means less ride time at each."
                : "*Based on average wait times and park hours to ensure a realistic, enjoyable schedule."
              }
            </p>
          </div>

          <div className="pw-preferences-card">
            <h4>Optimization Preferences</h4>

            <div className="pw-pref-group">
              <label>Experience Priority</label>
              <div className="pw-pref-options">
                {[
                  { value: 'balanced', label: 'Balanced Mix', icon: <Zap size={16} /> },
                  { value: 'thrill', label: 'Thrill Seeker', icon: <Award size={16} /> },
                  { value: 'family', label: 'Family Fun', icon: <Star size={16} /> },
                  { value: 'shows', label: 'Shows First', icon: <Sparkles size={16} /> },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    className={`pw-pref-btn ${preferences.priority === opt.value ? 'active' : ''}`}
                    onClick={() =>
                      onPreferencesChange({
                        ...preferences,
                        priority: opt.value as PlanPreferences['priority'],
                      })
                    }
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pw-pref-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.includeBreaks}
                  onChange={(e) =>
                    onPreferencesChange({ ...preferences, includeBreaks: e.target.checked })
                  }
                />
                <Coffee size={16} />
                Include meal & rest breaks
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TRIP REPORT
// ============================================================================

function TripReportView({
  report,
  parkName,
  onSave,
  isSaved,
}: {
  report: TripReport;
  parkName: string;
  onSave: () => void;
  isSaved: boolean;
}) {
  const [activeDay, setActiveDay] = useState(0);

  // Scroll to top when entering the report view
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleDownload = () => {
    let text = `${parkName} - Trip Plan\n${'='.repeat(50)}\n\n`;

    text += `STRATEGIC SUMMARY\n${'-'.repeat(30)}\n`;
    report.strategySummary.forEach((s) => (text += `• ${s}\n`));
    text += '\n';

    if (report.headlinerStrategy.length > 0) {
      text += `HEADLINER PLACEMENT\n${'-'.repeat(30)}\n`;
      report.headlinerStrategy.forEach((s) => (text += `• ${s}\n`));
      text += '\n';
    }

    report.days.forEach((day) => {
      text += `\n${'='.repeat(50)}\n`;
      text += `${day.dayLabel.toUpperCase()}\n`;
      text += `${day.duration === 'full-day' ? 'Full Day' : 'Half Day'} • ${day.ridesCount} attractions\n`;
      text += `${'='.repeat(50)}\n\n`;

      day.items.forEach((item) => {
        text += `${item.time} - ${item.name}`;
        if (item.expectedWait) text += ` (~${item.expectedWait} min wait)`;
        text += '\n';
        if (item.notes) text += `         ${item.notes}\n`;
      });
    });

    text += `\n${'='.repeat(50)}\n`;
    text += `Total: ${report.totalRides} attractions, ~${report.totalWaitTime} min wait\n`;
    text += `Estimated time saved vs peak hours: ~${report.waitTimeSaved} min (~${report.percentImprovement}%)\n`;
    text += `\nGenerated by ParkPlannerAI\n`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${parkName.replace(/\s+/g, '-').toLowerCase()}-trip-plan.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentDay = report.days[activeDay];

  return (
    <div className="pw-report">
      {/* Report Header */}
      <div className="pw-report-header">
        <div className="pw-report-title">
          <Sparkles size={24} />
          <div>
            <h2>Your Optimized Trip Plan</h2>
            <p>{parkName}</p>
          </div>
        </div>

        <div className="pw-report-actions">
          <button className={`pw-action-btn ${isSaved ? 'saved' : ''}`} onClick={onSave}>
            {isSaved ? <Check size={16} /> : <Save size={16} />}
            {isSaved ? 'Saved' : 'Save Plan'}
          </button>
          <button className="pw-action-btn" onClick={handleDownload}>
            <Download size={16} />
            Download
          </button>
        </div>
      </div>

      {/* Main Content: Schedule + Sticky Sidebar */}
      <div className="pw-report-layout">
        {/* Left: Current Day Schedule */}
        {currentDay && (
          <div className="pw-day-schedule">
          <div className="pw-day-header">
            <div className="pw-day-info">
              <h3>{currentDay.dayLabel}</h3>
              <div className="pw-day-meta">
                <span className={`pw-day-type-badge ${currentDay.dayType}`}>
                  {currentDay.dayType === 'weekday' && 'Weekday'}
                  {currentDay.dayType === 'weekend' && 'Weekend'}
                  {currentDay.dayType === 'holiday' && 'Holiday/Peak'}
                </span>
                <span>{currentDay.duration === 'full-day' ? 'Full Day' : 'Half Day'}</span>
                <span>{currentDay.ridesCount} attractions</span>
              </div>
            </div>
          </div>


          <div className="pw-timeline">
            {/* Park Opens Indicator */}
            {currentDay.parkHours && (
              <div className="pw-timeline-item pw-park-hours-indicator pw-park-open">
                <div className="pw-timeline-time">{currentDay.parkHours.openingTimeFormatted}</div>
                <div className="pw-timeline-marker">
                  <div className="pw-timeline-dot pw-park-dot">
                    <Sun size={10} />
                  </div>
                  <div className="pw-timeline-line pw-park-line" />
                </div>
                <div className="pw-park-hours-content">
                  <span className="pw-park-hours-label">Park Opens</span>
                  <span className="pw-park-hours-name">{currentDay.parkHours.parkName}</span>
                </div>
              </div>
            )}

            {currentDay.items.map((item, idx) => {
              const itemClass = item.isReride ? 'reride' : item.type;
              const isMealBreak = item.type === 'meal' || item.type === 'break';
              const isParkTransition = item.name?.includes('Park Transition');

              // Check if this is a headliner ride (must-do attractions with high weight)
              const isHeadliner = item.type === 'ride' && !item.isReride && (() => {
                const rideWeight = getRideWeight(item.name);
                return rideWeight.mustDo || rideWeight.weight >= 85;
              })();

              // Render special park transition item
              if (isParkTransition) {
                return (
                  <div key={idx} className="pw-timeline-item pw-park-transition">
                    <div className="pw-timeline-time">{item.time}</div>
                    <div className="pw-timeline-marker">
                      <div className="pw-timeline-dot">
                        <Route size={12} />
                      </div>
                      {idx < currentDay.items.length - 1 && <div className="pw-timeline-line" />}
                    </div>
                    <div className="pw-timeline-content">
                      <span className="pw-timeline-name">{item.name}</span>
                      {item.notes && <p className="pw-timeline-notes">{item.notes}</p>}
                    </div>
                  </div>
                );
              }

              // Render special break card for meal/break items
              if (isMealBreak) {
                const isLunchOrDinner = item.name.toLowerCase().includes('lunch') || item.name.toLowerCase().includes('dinner');
                const mealType = item.name.toLowerCase().includes('lunch') ? 'lunch' :
                                 item.name.toLowerCase().includes('dinner') ? 'dinner' : 'a snack';

                // Build a coherent sentence for the break with bolded suggestions
                const buildBreakSentence = () => {
                  const elements: React.ReactNode[] = [];

                  // Start with wait time savings if significant
                  if (item.peakWaitTime && item.peakWaitTime > 20) {
                    elements.push(`Skip the ~${Math.round(item.peakWaitTime)} minute waits during this peak period. `);
                  } else {
                    elements.push(`Great time to recharge while the park is busy. `);
                  }

                  // Add dining suggestion with bolded name
                  if (item.diningName) {
                    elements.push(
                      <span key="dining">
                        Try grabbing {mealType} at <strong>{item.diningName}</strong> or a nearby spot.{' '}
                      </span>
                    );
                  } else if (isLunchOrDinner) {
                    elements.push(`Grab ${mealType} at a nearby restaurant. `);
                  }

                  // Add shopping suggestion with bolded name if available
                  if (item.shoppingName) {
                    elements.push(
                      <span key="shopping">
                        While you're at it, check out <strong>{item.shoppingName}</strong> for some shopping.
                      </span>
                    );
                  }

                  return elements;
                };

                return (
                  <div key={idx} className="pw-timeline-item pw-break-block">
                    <div className="pw-timeline-time">{item.time}</div>
                    <div className="pw-timeline-marker">
                      <div className="pw-timeline-dot pw-break-dot">
                        <Pause size={10} />
                      </div>
                      {idx < currentDay.items.length - 1 && <div className="pw-timeline-line pw-break-line" />}
                    </div>
                    <div className="pw-break-card">
                      <div className="pw-break-header">
                        <div className="pw-break-title-row">
                          <span className="pw-break-icon">
                            {isLunchOrDinner ? <Utensils size={18} /> : <Coffee size={18} />}
                          </span>
                          <div className="pw-break-title-content">
                            <span className="pw-break-name">{item.name}</span>
                            <span className="pw-break-duration">{item.breakDuration || 45} min</span>
                          </div>
                        </div>
                        {item.land && <span className="pw-break-location"><MapPin size={12} /> {item.land}</span>}
                      </div>

                      <p className="pw-break-description">{buildBreakSentence()}</p>
                    </div>
                  </div>
                );
              }

              // Render special entertainment item (parades, fireworks)
              if (item.type === 'entertainment') {
                return (
                  <div key={idx} className="pw-timeline-item pw-entertainment-block">
                    <div className="pw-timeline-time">{item.time}</div>
                    <div className="pw-timeline-marker">
                      <div className="pw-timeline-dot pw-entertainment-dot">
                        <Sparkles size={10} />
                      </div>
                      {idx < currentDay.items.length - 1 && <div className="pw-timeline-line pw-entertainment-line" />}
                    </div>
                    <div className="pw-entertainment-card">
                      <div className="pw-entertainment-header">
                        <span className="pw-entertainment-name">{item.name}</span>
                      </div>
                      {item.notes && <p className="pw-entertainment-notes">{item.notes}</p>}
                    </div>
                  </div>
                );
              }

              // Render special headliner card for must-do attractions
              if (isHeadliner) {
                return (
                  <div key={idx} className="pw-timeline-item pw-headliner-block">
                    <div className="pw-timeline-time">{item.time}</div>
                    <div className="pw-timeline-marker">
                      <div className="pw-timeline-dot pw-headliner-dot">
                        <Star size={10} />
                      </div>
                      {idx < currentDay.items.length - 1 && <div className="pw-timeline-line pw-headliner-line" />}
                    </div>
                    <div className="pw-headliner-wrapper">
                      <div className="pw-headliner-card">
                        <div
                          className="pw-headliner-bg"
                          style={{
                            backgroundImage: `url(${getHeadlinerImage(item.name)})`,
                          }}
                        />
                        <div className="pw-headliner-overlay" />
                        <div className="pw-headliner-content">
                          <div className="pw-headliner-badge">
                            <Star size={12} />
                            <span>Headliner</span>
                          </div>
                          <div className="pw-headliner-header">
                            <span className="pw-headliner-name">{item.name}</span>
                            {item.expectedWait !== undefined && item.expectedWait > 0 && (
                              <span className="pw-headliner-wait">~{item.expectedWait} min wait</span>
                            )}
                          </div>
                          {item.land && <span className="pw-headliner-land"><MapPin size={12} /> {item.land}</span>}
                        </div>
                      </div>
                      {item.notes && <p className="pw-headliner-notes">{item.notes}</p>}
                    </div>
                  </div>
                );
              }

              // Regular ride/suggestion items
              return (
                <div key={idx} className={`pw-timeline-item ${itemClass}`}>
                  <div className="pw-timeline-time">{item.time}</div>
                  <div className="pw-timeline-marker">
                    <div className="pw-timeline-dot" />
                    {idx < currentDay.items.length - 1 && <div className="pw-timeline-line" />}
                  </div>
                  <div className="pw-timeline-content">
                    <div className="pw-timeline-header">
                      <span className="pw-timeline-name">{item.name}</span>
                      {item.isReride && <span className="pw-reride-badge">Re-ride</span>}
                      {item.expectedWait !== undefined && item.expectedWait > 0 && (
                        <span className="pw-timeline-wait">est. {item.expectedWait} min</span>
                      )}
                    </div>
                    {item.land && <span className="pw-timeline-land">{item.land}</span>}
                    {item.notes && <p className="pw-timeline-notes">{item.notes}</p>}
                  </div>
                </div>
              );
            })}

            {/* Park Closes Indicator */}
            {currentDay.parkHours && (
              <div className="pw-timeline-item pw-park-hours-indicator pw-park-close">
                <div className="pw-timeline-time">{currentDay.parkHours.closingTimeFormatted}</div>
                <div className="pw-timeline-marker">
                  <div className="pw-timeline-dot pw-park-dot pw-park-close-dot">
                    <Sunset size={10} />
                  </div>
                </div>
                <div className="pw-park-hours-content">
                  <span className="pw-park-hours-label">Park Closes</span>
                  {currentDay.parkHours.hasExtendedHours && (
                    <span className="pw-park-hours-extended">Extended hours available</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Skipped Rides Notice */}
          {currentDay.skippedRides && currentDay.skippedRides.length > 0 && (
            <div className="pw-skipped-rides">
              <div className="pw-skipped-rides-header">
                <Clock size={16} />
                <span>Rides That Didn't Fit</span>
              </div>
              <p className="pw-skipped-rides-desc">
                The following rides from your selection couldn't be scheduled due to time constraints.
                Consider visiting on a less busy day or arriving earlier.
              </p>
              <div className="pw-skipped-rides-list">
                {currentDay.skippedRides.map((ride, idx) => (
                  <div key={idx} className={`pw-skipped-ride ${ride.category}`}>
                    <span className="pw-skipped-ride-name">{ride.name}</span>
                    <span className={`pw-skipped-ride-category ${ride.category}`}>
                      {ride.category === 'headliner' && 'Headliner'}
                      {ride.category === 'popular' && 'Popular'}
                      {ride.category === 'family' && 'Family'}
                      {ride.category === 'standard' && 'Standard'}
                    </span>
                  </div>
                ))}
              </div>
              <p className="pw-skipped-rides-tip">
                <Lightbulb size={14} />
                Tip: Try selecting fewer rides or extending your visit to fit these attractions.
              </p>
            </div>
          )}
        </div>
        )}

        {/* Right: Sticky Sidebar with Stats & Strategy */}
        <div className="pw-report-sidebar">
          {/* Stats Card */}
          <div className="pw-sidebar-stats">
            <div className="pw-sidebar-stats-header">
              <Zap size={16} />
              <span>Trip Summary</span>
            </div>
            <div className="pw-sidebar-stats-grid">
              <div className="pw-sidebar-stat">
                <span className="pw-sidebar-stat-value">{report.days.length}</span>
                <span className="pw-sidebar-stat-label">Day{report.days.length > 1 ? 's' : ''}</span>
              </div>
              <div className="pw-sidebar-stat">
                <span className="pw-sidebar-stat-value">{report.totalRides}</span>
                <span className="pw-sidebar-stat-label">Attractions</span>
              </div>
              <div className="pw-sidebar-stat">
                <span className="pw-sidebar-stat-value">~{report.totalWaitTime}</span>
                <span className="pw-sidebar-stat-label">Est. Wait (min)</span>
              </div>
              {report.waitTimeSaved > 0 && (
                <div className="pw-sidebar-stat highlight">
                  <span className="pw-sidebar-stat-value">~{report.waitTimeSaved}</span>
                  <span className="pw-sidebar-stat-label">Min Saved vs Peak</span>
                </div>
              )}
            </div>
            {report.waitTimeSaved > 0 && report.percentImprovement > 0 && (
              <div className="pw-sidebar-improvement">
                <TrendingDown size={14} />
                <span>~{report.percentImprovement}% less wait vs peak times</span>
              </div>
            )}
          </div>

          {/* Day Selector (if multiple days) */}
          {report.days.length > 1 && (
            <div className="pw-sidebar-days">
              <div className="pw-sidebar-section-header">
                <Calendar size={14} />
                <span>Your Days</span>
              </div>
              <div className="pw-sidebar-day-list">
                {report.days.map((day, idx) => (
                  <button
                    key={idx}
                    className={`pw-sidebar-day-btn ${activeDay === idx ? 'active' : ''}`}
                    onClick={() => {
                      setActiveDay(idx);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <span className="pw-sidebar-day-num">Day {idx + 1}</span>
                    <span className="pw-sidebar-day-date">{formatDateShort(day.date)}</span>
                    <span className={`pw-sidebar-day-type ${day.dayType}`}>
                      {day.dayType === 'weekday' ? 'Weekday' : day.dayType === 'weekend' ? 'Weekend' : 'Peak'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Why This Works */}
          <div className="pw-sidebar-strategy">
            <div className="pw-sidebar-section-header">
              <Lightbulb size={14} />
              <span>Why This Works</span>
            </div>
            <ul className="pw-sidebar-strategy-list">
              {report.strategySummary.map((insight, idx) => (
                <li key={idx}>{insight}</li>
              ))}
            </ul>
          </div>

          {/* Headliner Strategy */}
          {report.headlinerStrategy.length > 0 && (
            <div className="pw-sidebar-strategy accent">
              <div className="pw-sidebar-section-header">
                <Award size={14} />
                <span>Headliner Strategy</span>
              </div>
              <ul className="pw-sidebar-strategy-list">
                {report.headlinerStrategy.map((strategy, idx) => (
                  <li key={idx}>{strategy}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Pro Tips */}
          <div className="pw-sidebar-tips">
            <div className="pw-sidebar-section-header">
              <Star size={14} />
              <span>Pro Tips</span>
            </div>
            <ul className="pw-sidebar-tips-list">
              <li>Arrive 15-30 min before park opening</li>
              <li>Download the park's official app</li>
              <li>Stay flexible - conditions change</li>
            </ul>
            <p className="pw-sidebar-disclaimer">
              *Estimates based on historical patterns. Actual wait times may vary.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SAVED PLANS
// ============================================================================

function SavedPlansView({
  plans,
  onLoad,
  onDelete,
}: {
  plans: SavedPlan[];
  onLoad: (plan: SavedPlan) => void;
  onDelete: (planId: string) => void;
}) {
  if (plans.length === 0) return null;

  return (
    <div className="pw-saved-plans">
      <h3>Your Saved Plans</h3>
      <div className="pw-saved-list">
        {plans.map((plan) => (
          <div key={plan.id} className="pw-saved-card">
            <div className="pw-saved-info">
              <span className="pw-saved-park">{plan.parkName}</span>
              <span className="pw-saved-dates">
                <Calendar size={12} />
                {plan.dates.length} day{plan.dates.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="pw-saved-actions">
              <button className="pw-saved-btn view" onClick={() => onLoad(plan)}>
                View
              </button>
              <button className="pw-saved-btn delete" onClick={() => onDelete(plan.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PlanWizard() {
  const [step, setStep] = useState<Step>('park');
  const [parks, setParks] = useState<Park[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [selectedPark, setSelectedPark] = useState<number | null>(null);
  const [selectedDates, setSelectedDates] = useState<SelectedDate[]>([]);
  const [selectedRides, setSelectedRides] = useState<number[]>([]);
  const [preferences, setPreferences] = useState<PlanPreferences>({
    priority: 'balanced',
    includeBreaks: true,
  });
  const [report, setReport] = useState<TripReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [parkHoursMap, setParkHoursMap] = useState<Record<string, ParkHours>>({});

  // Park Hopper state
  const [isParkHopper, setIsParkHopper] = useState(false);
  const [secondParkId, setSecondParkId] = useState<number | null>(null);
  const [transitionTime, setTransitionTime] = useState<string>('11:00 AM');
  const [secondParkRides, setSecondParkRides] = useState<Ride[]>([]);

  // Entertainment preferences state
  const [wantFireworks, setWantFireworks] = useState(false);
  const [wantParade, setWantParade] = useState(false);

  // Schedule style preferences
  const [allowRerides, setAllowRerides] = useState(true); // Whether to fill schedule with re-rides

  // Load saved plans on mount
  useEffect(() => {
    setSavedPlans(getSavedPlans());
  }, []);

  // Fetch parks on mount
  useEffect(() => {
    fetch('/api/parks.json')
      .then((res) => res.json())
      .then((data) => {
        setParks(data.parks || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Check for park pre-selection from URL parameter
  useEffect(() => {
    if (parks.length > 0 && !selectedPark) {
      const urlParams = new URLSearchParams(window.location.search);
      const parkIdParam = urlParams.get('park');
      if (parkIdParam) {
        const parkId = parseInt(parkIdParam, 10);
        // Verify the park exists and supports park hopper
        const parkExists = parks.some(p => p.id === parkId);
        if (parkExists && supportsParkHopper(parkId)) {
          setSelectedPark(parkId);
          // Auto-advance to the next step
          setStep('ticket-type');
        }
      }
    }
  }, [parks, selectedPark]);

  // Fetch rides when park is selected
  useEffect(() => {
    if (selectedPark) {
      setLoading(true);
      fetch(`/api/parks/${selectedPark}.json`)
        .then((res) => res.json())
        .then((data) => {
          setRides(data.rides || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [selectedPark]);

  // Fetch rides from second park when park hopper is enabled
  useEffect(() => {
    if (isParkHopper && secondParkId) {
      fetch(`/api/parks/${secondParkId}.json`)
        .then((res) => res.json())
        .then((data) => {
          setSecondParkRides(data.rides || []);
        })
        .catch(() => setSecondParkRides([]));
    } else {
      setSecondParkRides([]);
    }
  }, [isParkHopper, secondParkId]);

  // Reset park hopper state when primary park changes
  useEffect(() => {
    setIsParkHopper(false);
    setSecondParkId(null);
    setSecondParkRides([]);
  }, [selectedPark]);

  // Fetch park hours when park and dates change
  // In park hopper mode, fetch hours for both parks and use second park's closing time
  useEffect(() => {
    if (selectedPark && selectedDates.length > 0) {
      const fetchAllParkHours = async () => {
        const hoursMap: Record<string, ParkHours> = {};
        for (const sd of selectedDates) {
          const dateKey = sd.date.toISOString().split('T')[0];
          try {
            // Fetch primary park hours (used for opening time)
            const primaryHours = await getParkHours(selectedPark, sd.date);

            // In park hopper mode, also fetch second park hours for closing time
            if (isParkHopper && secondParkId) {
              try {
                const secondParkHours = await getParkHours(secondParkId, sd.date);
                // Use primary park's opening time but second park's closing time
                hoursMap[dateKey] = {
                  ...primaryHours,
                  closeHour: secondParkHours.closeHour,
                  closeMinute: secondParkHours.closeMinute,
                  closingTimeFormatted: secondParkHours.closingTimeFormatted,
                };
              } catch (err) {
                console.error(`Failed to fetch second park hours for ${dateKey}:`, err);
                // Fall back to primary park hours
                hoursMap[dateKey] = primaryHours;
              }
            } else {
              hoursMap[dateKey] = primaryHours;
            }
          } catch (err) {
            console.error(`Failed to fetch park hours for ${dateKey}:`, err);
          }
        }
        setParkHoursMap(hoursMap);
      };
      fetchAllParkHours();
    }
  }, [selectedPark, secondParkId, isParkHopper, selectedDates]);

  // Helper to get the best default arrival time for a date
  const getDefaultArrivalTime = (date: Date): string => {
    const today = new Date();
    const isToday = date.getFullYear() === today.getFullYear() &&
                    date.getMonth() === today.getMonth() &&
                    date.getDate() === today.getDate();

    if (!isToday) {
      return 'rope-drop'; // Default for future dates
    }

    // For today, check what times are still available
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    // Get park opening time for rope drop calculation
    const dateKey = date.toISOString().split('T')[0];
    const parkHours = parkHoursMap[dateKey];
    const ropeDropMinutes = parkHours
      ? parkHours.openHour * 60 + (parkHours.openMinute || 0)
      : 9 * 60; // 9:00 AM default

    const buffer = 15; // 15 minute buffer

    if (currentTotalMinutes < ropeDropMinutes - buffer) {
      return 'rope-drop';
    } else if (currentTotalMinutes < 10 * 60 - buffer) {
      return '10am';
    } else if (currentTotalMinutes < 12 * 60 - buffer) {
      return '12pm';
    }

    // If all times have passed, still return 12pm (UI will show appropriate message)
    return '12pm';
  };

  const toggleDate = (date: Date) => {
    const existing = selectedDates.find((sd) => isSameDay(sd.date, date));
    if (existing) {
      setSelectedDates(selectedDates.filter((sd) => !isSameDay(sd.date, date)));
    } else if (selectedDates.length < 5) {
      setSelectedDates([
        ...selectedDates,
        { date, duration: 'full-day', arrivalTime: getDefaultArrivalTime(date) },
      ]);
    }
  };

  const updateDate = (date: Date, updates: Partial<SelectedDate>) => {
    setSelectedDates(
      selectedDates.map((sd) => (isSameDay(sd.date, date) ? { ...sd, ...updates } : sd))
    );
  };

  // ============================================================================
  // RIDE LIMITS - Realistic number of rides per day
  // ============================================================================
  const RIDES_PER_SINGLE_PARK_DAY = 13; // Full day at one park
  const RIDES_PER_PARK_HOPPER_DAY = 10; // Less time at each park due to transitions

  // Calculate total ride limit based on selected dates and park hopper status
  const maxRideLimit = useMemo(() => {
    if (selectedDates.length === 0) return RIDES_PER_SINGLE_PARK_DAY;

    return selectedDates.reduce((total, sd) => {
      const ridesForDay = isParkHopper ? RIDES_PER_PARK_HOPPER_DAY : RIDES_PER_SINGLE_PARK_DAY;
      // Half-day gets fewer rides
      const multiplier = sd.duration === 'half-day' ? 0.5 : 1;
      return total + Math.floor(ridesForDay * multiplier);
    }, 0);
  }, [selectedDates, isParkHopper]);

  const isAtRideLimit = selectedRides.length >= maxRideLimit;
  const isNearRideLimit = selectedRides.length >= maxRideLimit - 2;

  const toggleRide = (id: number) => {
    setSelectedRides((prev) => {
      // Always allow deselection
      if (prev.includes(id)) {
        return prev.filter((r) => r !== id);
      }
      // Check limit before adding
      if (prev.length >= maxRideLimit) {
        return prev; // Don't add if at limit
      }
      return [...prev, id];
    });
  };

  const toggleLand = (rideIds: number[], selectAll: boolean) => {
    setSelectedRides((prev) => {
      if (selectAll) {
        // Add rides from this land, respecting the limit
        const newIds = rideIds.filter((id) => !prev.includes(id));
        const spotsAvailable = maxRideLimit - prev.length;
        const idsToAdd = newIds.slice(0, spotsAvailable); // Only add up to limit
        return [...prev, ...idsToAdd];
      } else {
        // Remove all rides from this land
        return prev.filter((id) => !rideIds.includes(id));
      }
    });
  };

  // Combine rides from both parks when park hopper is enabled
  const combinedRides = useMemo(() => {
    if (!isParkHopper || !secondParkId || secondParkRides.length === 0) {
      // Single park mode - just tag rides with park info if it's a Disney park
      if (selectedPark && supportsParkHopper(selectedPark)) {
        const shortName = getParkShortName(selectedPark);
        return rides.map(r => ({ ...r, parkId: selectedPark, parkShortName: shortName }));
      }
      return rides;
    }

    // Park hopper mode - combine rides from both parks with badges
    const primaryShortName = getParkShortName(selectedPark!);
    const secondaryShortName = getParkShortName(secondParkId);

    const taggedPrimaryRides = rides.map(r => ({
      ...r,
      parkId: selectedPark!,
      parkShortName: primaryShortName,
    }));

    const taggedSecondaryRides = secondParkRides.map(r => ({
      ...r,
      parkId: secondParkId,
      parkShortName: secondaryShortName,
    }));

    return [...taggedPrimaryRides, ...taggedSecondaryRides];
  }, [rides, secondParkRides, isParkHopper, selectedPark, secondParkId]);

  const generateReport = () => {
    const sortedDates = [...selectedDates].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    // Use combinedRides for park hopper support
    const selectedRideObjects = combinedRides
      .filter((r) => selectedRides.includes(r.id))
      .map((ride) => ({
        id: ride.id,
        name: ride.name,
        land: ride.land,
        isOpen: ride.is_open,
        waitTime: ride.wait_time,
        parkId: ride.parkId,
        parkShortName: ride.parkShortName,
      }));

    // Headliner patterns for Epic Universe / Universal
    const headlinerPatterns = [
      'battle', 'ministry', 'hagrid', 'velocicoaster', 'forbidden journey',
      'gringotts', 'kong', 'mummy', 'transformers', 'jimmy fallon',
      'mario kart', 'donkey kong', 'yoshi', 'toadstool', 'bowser',
      'how to train', 'hiccup', 'dragon', 'starfall', 'stardust'
    ];

    // Categorize rides by popularity
    const categorizeRide = (name: string): 'headliner' | 'popular' | 'moderate' => {
      const lower = name.toLowerCase();
      if (headlinerPatterns.some(p => lower.includes(p))) return 'headliner';
      if (lower.includes('coaster') || lower.includes('mountain') || lower.includes('flight')) return 'popular';
      return 'moderate';
    };

    // Calculate capacity per day
    const dayCapacities = sortedDates.map((sd) => (sd.duration === 'full-day' ? 12 : 6));
    const totalCapacity = dayCapacities.reduce((sum, c) => sum + c, 0);

    // Sort rides by popularity (headliners first for better distribution)
    const sortedRides = [...selectedRideObjects].sort((a, b) => {
      const catA = categorizeRide(a.name);
      const catB = categorizeRide(b.name);
      const order = { headliner: 0, popular: 1, moderate: 2 };
      return order[catA] - order[catB];
    });

    // Group rides by land for better distribution
    const ridesByLand: Record<string, typeof selectedRideObjects> = {};
    for (const ride of sortedRides) {
      const land = ride.land || 'Other';
      if (!ridesByLand[land]) ridesByLand[land] = [];
      ridesByLand[land].push(ride);
    }

    // PHASE 1: Distribute rides by land - keep rides from the same land on the same day
    const dayAssignments: Array<typeof selectedRideObjects> = sortedDates.map(() => []);
    const landsPerDay: Array<Set<string>> = sortedDates.map(() => new Set());
    const assignedRideIds = new Set<number | string>(); // Track which rides have been assigned

    // PHASE 0: Assign rope drop target rides to their specific days FIRST
    // This ensures the user's rope drop selection is honored before general distribution
    for (let dayIdx = 0; dayIdx < sortedDates.length; dayIdx++) {
      const dayConfig = sortedDates[dayIdx];
      if (dayConfig.ropeDropTarget) {
        const targetLower = dayConfig.ropeDropTarget.toLowerCase();
        // Find the matching ride in selectedRideObjects
        const targetRide = selectedRideObjects.find(r => {
          const rideLower = r.name.toLowerCase();
          return rideLower === targetLower ||
                 rideLower.includes(targetLower) ||
                 targetLower.includes(rideLower);
        });

        if (targetRide && !assignedRideIds.has(targetRide.id)) {
          dayAssignments[dayIdx].push(targetRide);
          landsPerDay[dayIdx].add(targetRide.land || 'Other');
          assignedRideIds.add(targetRide.id);
        }
      }
    }

    // First, assign headliners evenly, tracking their lands (skip already-assigned rides)
    const headliners = sortedRides.filter(r =>
      categorizeRide(r.name) === 'headliner' && !assignedRideIds.has(r.id)
    );
    headliners.forEach((ride, idx) => {
      const dayIdx = idx % sortedDates.length;
      if (dayAssignments[dayIdx].length < dayCapacities[dayIdx]) {
        dayAssignments[dayIdx].push(ride);
        landsPerDay[dayIdx].add(ride.land || 'Other');
        assignedRideIds.add(ride.id);
      }
    });

    // Then distribute non-headliners, preferring days that already have rides from the same land
    // Skip already-assigned rides (rope drop targets and headliners)
    const nonHeadliners = sortedRides.filter(r =>
      categorizeRide(r.name) !== 'headliner' && !assignedRideIds.has(r.id)
    );

    for (const ride of nonHeadliners) {
      const rideLand = ride.land || 'Other';

      // Find the best day: prefer days with same land, then days with capacity
      let bestDayIdx = -1;
      let bestScore = -1;

      for (let dayIdx = 0; dayIdx < sortedDates.length; dayIdx++) {
        if (dayAssignments[dayIdx].length >= dayCapacities[dayIdx]) continue;

        const initialTarget = Math.ceil(selectedRideObjects.length / sortedDates.length);
        const hasCapacity = dayAssignments[dayIdx].length < initialTarget + 2;
        const hasMatchingLand = landsPerDay[dayIdx].has(rideLand);

        // Score: same land = 10 pts, has capacity = 5 pts, fewer rides = 1-3 pts
        let score = 0;
        if (hasMatchingLand) score += 10;
        if (hasCapacity) score += 5;
        score += (3 - Math.min(3, dayAssignments[dayIdx].length));

        if (score > bestScore) {
          bestScore = score;
          bestDayIdx = dayIdx;
        }
      }

      if (bestDayIdx === -1) {
        // Find day with fewest rides
        bestDayIdx = dayAssignments
          .map((arr, idx) => ({ idx, len: arr.length }))
          .filter(d => d.len < dayCapacities[d.idx])
          .sort((a, b) => a.len - b.len)[0]?.idx ?? 0;
      }

      if (dayAssignments[bestDayIdx].length < dayCapacities[bestDayIdx]) {
        dayAssignments[bestDayIdx].push(ride);
        landsPerDay[bestDayIdx].add(rideLand);
        assignedRideIds.add(ride.id);
      }
    }

    // PHASE 2: Fill remaining capacity with re-rides (only if user wants re-rides)
    // Prioritize headliners AND rides from lands already being visited that day
    const reRideAssignments: Array<Array<typeof selectedRideObjects[0]>> =
      sortedDates.map(() => []);

    // Only fill with re-rides if user has enabled this preference
    if (allowRerides) {
      for (let dayIdx = 0; dayIdx < sortedDates.length; dayIdx++) {
        const currentCount = dayAssignments[dayIdx].length;
        const capacity = dayCapacities[dayIdx];
        let spotsToFill = capacity - currentCount;
        const dayLands = landsPerDay[dayIdx];

        if (spotsToFill > 0) {
        // Get rides that could be re-ridden
        // Priority: 1) headliners in same land, 2) headliners, 3) popular in same land, 4) popular
        const potentialRerides = sortedRides
          .filter(r => {
            const cat = categorizeRide(r.name);
            return cat === 'headliner' || cat === 'popular';
          })
          .sort((a, b) => {
            const catA = categorizeRide(a.name);
            const catB = categorizeRide(b.name);
            const landA = a.land || 'Other';
            const landB = b.land || 'Other';
            const sameLandA = dayLands.has(landA);
            const sameLandB = dayLands.has(landB);
            const isOnDayA = dayAssignments[dayIdx].some(r => r.id === a.id);
            const isOnDayB = dayAssignments[dayIdx].some(r => r.id === b.id);

            // Prefer rides in same land
            if (sameLandA !== sameLandB) return sameLandA ? -1 : 1;
            // Then prefer headliners
            if (catA !== catB) return catA === 'headliner' ? -1 : 1;
            // Then prefer rides NOT already on this day
            if (isOnDayA !== isOnDayB) return isOnDayA ? 1 : -1;
            return 0;
          });

        for (const ride of potentialRerides) {
          if (spotsToFill <= 0) break;
          reRideAssignments[dayIdx].push(ride);
          spotsToFill--;
        }
        }
      }
    }

    // Dining and activity suggestions based on time of day
    const getDiningSuggestions = (land?: string): string[] => {
      const suggestions: Record<string, string[]> = {
        'Super Nintendo World': ['Toadstool Cafe', 'Power-Up Band Snacks'],
        'The Wizarding World': ['Three Broomsticks', 'Leaky Cauldron', 'Butterbeer Cart'],
        'Celestial Park': ['Starfall Lounge', 'Nebula Bites'],
        'Dark Universe': ['Monster Grub', 'Creature Cantina'],
        'default': ['Quick service dining', 'Character dining experience']
      };
      return suggestions[land || ''] || suggestions.default;
    };

    // Generate day schedules
    // Track which rides have been seen across the ENTIRE trip to properly identify re-rides
    const seenRideIds = new Set<number>();

    const dayItineraries: DayItinerary[] = [];
    let totalWaitTime = 0;
    let totalPeakWait = 0; // What wait would be at peak times (for savings calculation)
    let totalAvgWait = 0; // What wait would be at average times
    let totalRidesScheduled = 0;
    let totalRerides = 0;

    // Helper to get next time
    const getNextTime = (timeStr: string, minutesToAdd: number): string => {
      const [time, period] = timeStr.split(' ');
      const [hourStr, minStr] = time.split(':');
      let hour = parseInt(hourStr);
      let min = parseInt(minStr) + minutesToAdd;

      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;

      hour += Math.floor(min / 60);
      min = min % 60;

      const newPeriod = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);

      return `${displayHour}:${min.toString().padStart(2, '0')} ${newPeriod}`;
    };

    for (let i = 0; i < sortedDates.length; i++) {
      const sd = sortedDates[i];
      const dayType = classifyDayType(sd.date);
      // Sort rides by weight so headliners are scheduled first (highest weight = highest priority)
      // This ensures must-do attractions get scheduled before lower-priority rides
      const uniqueRides = [...dayAssignments[i]].sort((a, b) => {
        const weightA = getRideWeight(a.name).weight;
        const weightB = getRideWeight(b.name).weight;
        return weightB - weightA; // Higher weight first
      });
      // Filter fill rides to exclude any that are already in uniqueRides (prevents duplicates)
      const uniqueRideIds = new Set(uniqueRides.map(r => r.id));
      const fillRides = reRideAssignments[i].filter(r => !uniqueRideIds.has(r.id));
      const allDayRides = [...uniqueRides, ...fillRides];

      // Get park hours data for this date (used by optimizer and entertainment)
      const dateKey = sd.date.toISOString().split('T')[0];
      const dayParkHours = parkHoursMap[dateKey];

      if (allDayRides.length > 0) {
        // Detect rope drop mode based on arrival time
        const isRopeDropMode = sd.arrivalTime === 'rope-drop';

        // Get park closing hour from park hours data
        const parkCloseHour = dayParkHours?.closeHour;

        // Build items from optimized schedule
        const items: ItineraryItem[] = [];
        const dayInsights: string[] = []; // Collect insights from optimizer(s)

        // Helper to parse transition time string to hour (e.g., "11:00 AM" -> 11)
        const parseTransitionTimeToHour = (timeStr: string): number => {
          const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (!match) return 11; // Default to 11 AM
          let hour = parseInt(match[1]);
          const period = match[3].toUpperCase();
          if (period === 'PM' && hour !== 12) hour += 12;
          if (period === 'AM' && hour === 12) hour = 0;
          return hour;
        };

        // Helper to format hour to time string (e.g., 11 -> "11:00 AM")
        const formatHourToTimeString = (hour: number): string => {
          const period = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
          return `${displayHour}:00 ${period}`;
        };

        // PARK HOPPER MODE: Dynamic multi-phase scheduling
        // Goal: Complete ALL selected rides while minimizing transition waste
        if (isParkHopper && secondParkId && selectedPark) {
          // All rides by park
          const park1Rides = uniqueRides.filter(r => r.parkId === selectedPark);
          const park2Rides = uniqueRides.filter(r => r.parkId === secondParkId);

          // Track scheduled ride IDs (separate from seenRideIds which tracks re-rides)
          const scheduledRideIds = new Set<number | string>();

          // Park info
          const travelMinutes = getTransitionTime(selectedPark, secondParkId);
          const park1Name = parks.find(p => p.id === selectedPark)?.name || 'Park 1';
          const park2Name = parks.find(p => p.id === secondParkId)?.name || 'Park 2';
          const parkOpenHour = dayParkHours?.openHour || 9;
          const parkCloseMinutes = (parkCloseHour || 22) * 60;

          // Helper: Get unscheduled rides for a park
          const getUnscheduledRides = (parkRides: typeof park1Rides) =>
            parkRides.filter(r => !scheduledRideIds.has(r.id));

          // Helper: Format minutes to time string
          const minutesToTimeStr = (mins: number): string => {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            const period = h >= 12 ? 'PM' : 'AM';
            const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
            return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
          };

          // Helper: Format hour for optimizer (e.g., "9am", "2pm")
          const hourToArrivalStr = (h: number): string =>
            h >= 12 ? `${h > 12 ? h - 12 : 12}pm` : `${h}am`;

          // Helper: Get end time from scheduled items
          const getScheduleEndMinutes = (): number => {
            const lastRide = [...items].reverse().find(item => item.type === 'ride');
            if (!lastRide) return parkOpenHour * 60;

            const match = lastRide.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!match) return parkOpenHour * 60;

            let hour = parseInt(match[1]);
            const minute = parseInt(match[2]);
            if (match[3].toUpperCase() === 'PM' && hour !== 12) hour += 12;
            if (match[3].toUpperCase() === 'AM' && hour === 12) hour = 0;

            // Add ride duration (wait + experience + walk)
            return hour * 60 + minute + (lastRide.expectedWait || 20) + 15;
          };

          // Helper: Schedule rides at a park and add to items
          const scheduleRidesAtPark = (
            parkRides: typeof park1Rides,
            parkId: number,
            startHour: number,
            endHour: number,
            isRopeDrop: boolean,
            ropeDropTarget?: string,
            parkLabel?: string // e.g., "Park 1" or the actual park name for custom messaging
          ): void => {
            if (parkRides.length === 0) return;

            const optimized = optimizeSchedule({
              selectedRides: parkRides,
              preferences: {
                visitDate: dateKey,
                arrivalTime: hourToArrivalStr(startHour),
                duration: 'full-day',
                priority: preferences.priority,
                includeBreaks: false,
                ropeDropMode: isRopeDrop,
                parkId: parkId,
                ropeDropTarget: ropeDropTarget,
                parkCloseHour: endHour,
                skipFirstLastEnhancement: true, // We'll handle first/last messaging after combining parks
              },
            });

            for (const item of optimized.items) {
              if (item.type === 'ride' && item.ride) {
                const rideId = typeof item.ride.id === 'number' ? item.ride.id : parseInt(String(item.ride.id));
                const isReride = seenRideIds.has(rideId);

                // Calculate peak and average wait for savings comparison (park hopper mode)
                if (item.ride.hourlyPredictions && item.ride.hourlyPredictions.length > 0 && !isReride) {
                  const predictions = item.ride.hourlyPredictions;
                  const peakWait = Math.max(...predictions);
                  const avgWait = Math.round(predictions.reduce((a, b) => a + b, 0) / predictions.length);
                  totalPeakWait += peakWait;
                  totalAvgWait += avgWait;
                }

                items.push({
                  time: item.time,
                  type: item.type,
                  name: isReride ? `${item.name} ★` : item.name,
                  expectedWait: item.expectedWait,
                  notes: isReride
                    ? 'Re-ride! Great choice to experience this attraction again.'
                    : (item.reasoning || undefined),
                  land: item.ride?.land,
                  isReride,
                });

                scheduledRideIds.add(rideId);
                seenRideIds.add(rideId);
              }
            }

            dayInsights.push(...optimized.insights);
          };

          // Helper: Add transition block
          const addTransition = (toParkName: string, timeMinutes: number): void => {
            items.push({
              time: minutesToTimeStr(timeMinutes),
              type: 'break',
              name: `🚶 Travel to ${toParkName}`,
              notes: `Park transition (~${travelMinutes} min). Head to ${toParkName}!`,
              breakDuration: travelMinutes,
            });
          };

          // Helper: Get predicted wait times for rides at a specific hour
          const getRidesWithPredictions = (parkRides: typeof park1Rides) => {
            return parkRides.map(ride => ({
              ...ride,
              predictions: predictRideWaitTimes(
                { id: ride.id, name: ride.name, land: ride.land, isOpen: ride.isOpen, waitTime: ride.waitTime },
                sd.date
              )
            }));
          };

          // Helper: Calculate average predicted wait for rides at a given hour
          const getAverageWaitAtHour = (
            ridesWithPreds: ReturnType<typeof getRidesWithPredictions>,
            hour: number
          ): number => {
            if (ridesWithPreds.length === 0) return 0;
            const totalWait = ridesWithPreds.reduce((sum, r) => {
              return sum + getPredictedWaitForHour(r.predictions, hour);
            }, 0);
            return totalWait / ridesWithPreds.length;
          };

          // Helper: Get the daily average wait for rides (to compare if current is above/below)
          const getDailyAverageWait = (ridesWithPreds: ReturnType<typeof getRidesWithPredictions>): number => {
            if (ridesWithPreds.length === 0) return 0;
            let totalSum = 0;
            let count = 0;
            for (const ride of ridesWithPreds) {
              // Check hours 9-21 (9am to 9pm)
              for (let h = 9; h <= 21; h++) {
                totalSum += getPredictedWaitForHour(ride.predictions, h);
                count++;
              }
            }
            return count > 0 ? totalSum / count : 30;
          };

          // Get predictions for both parks
          const park1WithPreds = getRidesWithPredictions(park1Rides);
          const park2WithPreds = getRidesWithPredictions(park2Rides);

          // ============================================================
          // DETERMINE OPTIMAL HOP TIME (Dynamic based on wait times)
          // ============================================================
          const userTargetHour = parseTransitionTimeToHour(transitionTime);

          // Find the optimal hop time by analyzing wait times
          // Check hours around the user's target (±2 hours)
          const minHopHour = Math.max(parkOpenHour + 2, userTargetHour - 2); // At least 2 hours in first park
          const maxHopHour = Math.min((parkCloseHour || 22) - 3, userTargetHour + 2); // Leave 3 hours for second park

          let optimalHopHour = userTargetHour;
          let bestHopScore = -Infinity;

          // Scoring: We want to hop when Park 1 waits are HIGH and Park 2 waits are LOW
          for (let testHour = minHopHour; testHour <= maxHopHour; testHour++) {
            const park1AvgWait = getAverageWaitAtHour(park1WithPreds, testHour);
            const park2AvgWait = getAverageWaitAtHour(park2WithPreds, testHour);
            const park1DailyAvg = getDailyAverageWait(park1WithPreds);
            const park2DailyAvg = getDailyAverageWait(park2WithPreds);

            // Score = how much worse Park 1 is vs its avg + how much better Park 2 is vs its avg
            // Higher score = better time to hop
            const park1AboveAvg = park1AvgWait - park1DailyAvg; // Positive = waits are high
            const park2BelowAvg = park2DailyAvg - park2AvgWait; // Positive = waits are low

            // Also factor in: slight preference for staying near user's target
            const distanceFromTarget = Math.abs(testHour - userTargetHour);
            const targetBonus = (2 - distanceFromTarget) * 5; // Up to 10 point bonus for being on target

            const score = park1AboveAvg + park2BelowAvg + targetBonus;

            if (score > bestHopScore) {
              bestHopScore = score;
              optimalHopHour = testHour;
            }
          }

          // Check if we should delay hopping because Park 1 still has good wait times
          const park1WaitAtOptimal = getAverageWaitAtHour(park1WithPreds, optimalHopHour);
          const park1DailyAvg = getDailyAverageWait(park1WithPreds);

          // If Park 1 waits are still below average at optimal time, consider staying longer
          if (park1WaitAtOptimal < park1DailyAvg * 0.9 && optimalHopHour < maxHopHour) {
            // Find when Park 1 waits exceed average
            for (let h = optimalHopHour; h <= maxHopHour; h++) {
              const waitAtH = getAverageWaitAtHour(park1WithPreds, h);
              if (waitAtH >= park1DailyAvg) {
                optimalHopHour = h;
                break;
              }
            }
          }

          // ============================================================
          // ENSURE ALL PARK 1 RIDES CAN COMPLETE BEFORE TRANSITION
          // MVP: Once we switch parks, we don't go back. So we must
          // finish ALL Park 1 rides before transitioning.
          // ============================================================
          const estimatePark1CompletionTime = (): number => {
            const RIDE_DURATION = 10; // Average ride experience in minutes
            const WALK_TIME = 8; // Average walk time between rides
            let totalMinutes = 0;

            for (let i = 0; i < park1Rides.length; i++) {
              const ride = park1WithPreds[i];
              // Get predicted wait at the estimated hour we'd be riding
              const rideHour = Math.floor((parkOpenHour * 60 + totalMinutes) / 60);
              const clampedHour = Math.min(Math.max(rideHour, 9), 21);
              const predictedWait = getPredictedWaitForHour(ride.predictions, clampedHour);
              totalMinutes += predictedWait + RIDE_DURATION + WALK_TIME;
            }

            // Convert to hour (with some buffer)
            const completionMinutes = parkOpenHour * 60 + totalMinutes + 15; // 15 min buffer
            return Math.ceil(completionMinutes / 60);
          };

          const minTransitionHourForPark1 = estimatePark1CompletionTime();

          // The actual transition hour is the LATER of:
          // 1. The wait-time-optimized hop hour
          // 2. The minimum time needed to complete all Park 1 rides
          let actualTransitionHour = Math.max(optimalHopHour, minTransitionHourForPark1);

          // But don't exceed the max hop hour (need time for Park 2)
          actualTransitionHour = Math.min(actualTransitionHour, maxHopHour);

          // If we had to delay for Park 1 completion, add an insight
          if (minTransitionHourForPark1 > optimalHopHour) {
            dayInsights.push(
              `Extended time at ${park1Name} to complete all selected rides before hopping`
            );
          }

          // Add insight about why we chose this hop time
          if (actualTransitionHour !== userTargetHour) {
            const diff = actualTransitionHour - userTargetHour;
            const direction = diff > 0 ? 'later' : 'earlier';
            dayInsights.push(
              `Adjusted hop time ${Math.abs(diff)} hour${Math.abs(diff) > 1 ? 's' : ''} ${direction} based on predicted wait times`
            );
          }

          // ============================================================
          // PHASE 1: Morning at first park (until optimal transition time)
          // ============================================================

          // Find rope drop target if it's in park 1
          const ropeDropTargetForPark1 = sd.ropeDropTarget
            ? park1Rides.some(r => {
                const targetLower = sd.ropeDropTarget!.toLowerCase();
                const rideLower = r.name.toLowerCase();
                return rideLower === targetLower ||
                       rideLower.includes(targetLower) ||
                       targetLower.includes(rideLower);
              })
              ? sd.ropeDropTarget
              : undefined
            : undefined;

          scheduleRidesAtPark(
            park1Rides,
            selectedPark,
            parkOpenHour,
            actualTransitionHour,
            true, // rope drop mode
            ropeDropTargetForPark1,
            park1Name
          );

          // ============================================================
          // PHASE 2: Transition to second park
          // ============================================================
          const transitionMinutes = actualTransitionHour * 60;
          addTransition(park2Name, transitionMinutes);

          // ============================================================
          // PHASE 3: Afternoon/Evening at second park (until park close)
          // MVP: Single hop only - no returning to first park
          // ============================================================
          const park2ArrivalHour = actualTransitionHour + Math.ceil(travelMinutes / 60);

          // Schedule ALL remaining Park 2 rides until park close
          scheduleRidesAtPark(
            park2Rides,
            secondParkId,
            park2ArrivalHour,
            parkCloseHour || 22,
            false,
            undefined,
            park2Name
          );

          // ============================================================
          // Apply first/last ride messaging for park hopper
          // ============================================================
          const rideItems = items.filter(item => item.type === 'ride');
          if (rideItems.length > 0) {
            // Find first ride of the day (at Park 1)
            const firstRide = rideItems[0];
            const firstRideIndex = items.indexOf(firstRide);
            if (firstRideIndex >= 0) {
              items[firstRideIndex] = {
                ...items[firstRideIndex],
                notes: `🌅 Kick off your day! ${items[firstRideIndex].notes || ''}`.trim(),
              };
            }

            // Find first ride at Park 2 (after transition)
            const transitionIndex = items.findIndex(item => item.type === 'break' && item.name?.includes('Travel to'));
            if (transitionIndex >= 0) {
              const park2Rides = rideItems.filter((_, idx) => {
                const itemIdx = items.indexOf(rideItems[idx]);
                return itemIdx > transitionIndex;
              });
              if (park2Rides.length > 0) {
                const firstPark2Ride = park2Rides[0];
                const firstPark2Index = items.indexOf(firstPark2Ride);
                if (firstPark2Index >= 0 && firstPark2Index !== firstRideIndex) {
                  items[firstPark2Index] = {
                    ...items[firstPark2Index],
                    notes: `🎢 Start your ${park2Name} adventure! ${items[firstPark2Index].notes || ''}`.trim(),
                  };
                }
              }
            }

            // Find last ride of the day
            const lastRide = rideItems[rideItems.length - 1];
            const lastRideIndex = items.indexOf(lastRide);
            if (lastRideIndex >= 0 && lastRideIndex !== firstRideIndex) {
              items[lastRideIndex] = {
                ...items[lastRideIndex],
                notes: `🌙 Wrap up your adventure! ${items[lastRideIndex].notes || ''}`.trim(),
              };
            }
          }

          // ============================================================
          // Final summary
          // ============================================================
          const finalPark1Scheduled = park1Rides.filter(r => scheduledRideIds.has(r.id)).length;
          const finalPark2Scheduled = park2Rides.filter(r => scheduledRideIds.has(r.id)).length;
          const totalScheduled = scheduledRideIds.size;
          const totalSelected = park1Rides.length + park2Rides.length;

          dayInsights.push(`Park Hopper: ${finalPark1Scheduled} rides at ${park1Name}, ${finalPark2Scheduled} rides at ${park2Name}`);

          if (totalScheduled < totalSelected) {
            const unscheduled = totalSelected - totalScheduled;
            dayInsights.push(`Note: ${unscheduled} ride${unscheduled > 1 ? 's' : ''} couldn't fit in the schedule`);
          }

        } else {
          // STANDARD SINGLE-PARK MODE
          // Convert 'rope-drop' to actual park opening time
          let actualArrivalTime = sd.arrivalTime;
          if (sd.arrivalTime === 'rope-drop' && dayParkHours?.openHour) {
            const openHour = dayParkHours.openHour;
            actualArrivalTime = `${openHour > 12 ? openHour - 12 : openHour}${openHour >= 12 ? 'pm' : 'am'}`;
          }

          const optimized = optimizeSchedule({
            selectedRides: uniqueRides,
            preferences: {
              visitDate: dateKey,
              arrivalTime: actualArrivalTime,
              duration: sd.duration,
              priority: preferences.priority,
              includeBreaks: false, // We handle breaks manually to avoid overlap
              ropeDropMode: isRopeDropMode, // Enable rope drop optimization
              parkId: selectedPark || undefined, // Queue-Times park ID for rope drop data
              ropeDropTarget: sd.ropeDropTarget, // User's selected rope drop priority ride
              parkCloseHour, // Pass actual park closing hour to cap schedule
            },
          });

          // Build items from optimized schedule, checking if each ride is a re-ride
          for (const item of optimized.items) {
            if (item.type === 'ride' && item.ride) {
              const rideId = typeof item.ride.id === 'number' ? item.ride.id : parseInt(String(item.ride.id));
              const isReride = seenRideIds.has(rideId);

              // Calculate peak and average wait for savings comparison
              // hourlyPredictions contains wait times for each hour of the day
              if (item.ride.hourlyPredictions && item.ride.hourlyPredictions.length > 0 && !isReride) {
                const predictions = item.ride.hourlyPredictions;
                const peakWait = Math.max(...predictions);
                const avgWait = Math.round(predictions.reduce((a, b) => a + b, 0) / predictions.length);
                totalPeakWait += peakWait;
                totalAvgWait += avgWait;
              }

              items.push({
                time: item.time,
                type: item.type,
                name: isReride ? `${item.name} ★` : item.name,
                expectedWait: item.expectedWait,
                notes: isReride
                  ? 'Re-ride! Great choice to experience this attraction again.'
                  : (item.reasoning || undefined),
                land: item.ride?.land,
                isReride,
              });

              // Mark this ride as seen
              seenRideIds.add(rideId);
            } else {
              items.push({
                time: item.time,
                type: item.type,
                name: item.name,
                expectedWait: item.expectedWait,
                notes: item.reasoning || item.breakInfo?.suggestion,
                land: item.ride?.land,
                isReride: false,
              });
            }
          }

          // Collect insights from standard optimizer
          dayInsights.push(...optimized.insights);
        }

        // Find the last ride time and add fill rides after
        let lastRideIndex = items.length - 1;
        for (let j = items.length - 1; j >= 0; j--) {
          if (items[j].type === 'ride') {
            lastRideIndex = j;
            break;
          }
        }

        // Add fill rides (which may or may not be re-rides) to the end of the day
        // Helper to parse time for park close check
        const parseTimeForClose = (time: string): number => {
          const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (!match) return 0;
          let hours = parseInt(match[1]);
          const minutes = parseInt(match[2]);
          const period = match[3].toUpperCase();
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          return hours * 60 + minutes;
        };

        // Get park close time in minutes (default to 10 PM if not available)
        const parkCloseMinutes = dayParkHours
          ? dayParkHours.closeHour * 60 + (dayParkHours.closeMinute || 0)
          : 22 * 60;

        // Only add fill rides if user wants re-rides to fill their schedule
        // Skip fill rides in park hopper mode - we already schedule all rides from both parks
        // and don't want to suggest returning to the first park after transitioning
        if (allowRerides && fillRides.length > 0 && !isParkHopper) {
          const lastItem = items[lastRideIndex];
          let currentTime = lastItem?.time || '4:00 PM';
          // Track the previous ride's wait for accurate timing
          let previousWait = lastItem?.expectedWait || 30;
          let previousLand = lastItem?.land || null;
          const RIDE_DURATION = 8; // Average ride duration in minutes

          for (const fillRide of fillRides) {
            // Calculate dynamic walk time based on land change
            const walkTime = getWalkTimeBetweenLands(previousLand, fillRide.land);
            // Calculate time offset: previous wait + ride duration + walk time
            const timeOffset = previousWait + RIDE_DURATION + walkTime;
            currentTime = getNextTime(currentTime, timeOffset);
            const fillRideWait = Math.max(15, (fillRide.waitTime || 30) * 0.8); // Evening waits often lower

            // Check if this ride would START or EXTEND past park closing
            const rideStartMinutes = parseTimeForClose(currentTime);

            // If ride starts after park close, stop immediately
            if (rideStartMinutes >= parkCloseMinutes) {
              break;
            }

            // If ride would end after park close, stop
            const rideEndMinutes = rideStartMinutes + fillRideWait + RIDE_DURATION;
            if (rideEndMinutes > parkCloseMinutes) {
              break;
            }

            // Check if this is actually a re-ride (seen before in trip)
            const isReride = seenRideIds.has(fillRide.id);

            items.push({
              time: currentTime,
              type: 'ride',
              name: isReride ? `${fillRide.name} ★` : fillRide.name,
              expectedWait: Math.round(fillRideWait),
              notes: isReride
                ? 'Re-ride! Great choice to experience this attraction again.'
                : 'Added to maximize your day - enjoy!',
              land: fillRide.land,
              isReride,
            });

            // Mark this ride as seen
            seenRideIds.add(fillRide.id);

            // Update tracking for next iteration's timing calculation
            previousWait = Math.round(fillRideWait);
            previousLand = fillRide.land || null;
          }
        }

        // Helper to parse time string to minutes (used by breaks and end-of-day filling)
        const parseTimeToMinutes = (time: string): number => {
          const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (!match) return 0;
          let hours = parseInt(match[1]);
          const minutes = parseInt(match[2]);
          const period = match[3].toUpperCase();
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          return hours * 60 + minutes;
        };

        // Helper to convert minutes back to time string
        const minutesToTimeString = (totalMinutes: number): string => {
          let hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          const period = hours >= 12 ? 'PM' : 'AM';
          if (hours > 12) hours -= 12;
          if (hours === 0) hours = 12;
          return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
        };

        // ADD EXPLORATION BREAKS when breaks are enabled
        // These are dedicated blocks for dining, shopping, and exploring based on WHERE THE USER IS
        // Breaks are DYNAMICALLY placed based on when wait times are highest within a window
        if (preferences.includeBreaks) {
          // Helper to find the land the user is at based on nearby ride times
          const findCurrentLand = (targetTime: string): string => {
            const targetMinutes = parseTimeToMinutes(targetTime);
            // Find the last ride before or at this time
            let currentLand = 'the park';
            for (const item of items) {
              if (item.type === 'ride' && item.land) {
                const itemMinutes = parseTimeToMinutes(item.time);
                if (itemMinutes <= targetMinutes) {
                  currentLand = item.land;
                } else {
                  break;
                }
              }
            }
            return currentLand;
          };

          // Calculate when a ride actually ENDS (start + wait + ride duration + walk)
          const RIDE_DURATION = 10; // Average ride duration in minutes
          const DEFAULT_WALK_TIME = 8; // Default walk time when next destination unknown

          const getRideEndTime = (item: ItineraryItem, nextLand?: string | null): number => {
            const startMinutes = parseTimeToMinutes(item.time);
            const waitTime = item.expectedWait || 0;
            // Use dynamic walk time if we know the next land, otherwise use default
            const walkTime = nextLand !== undefined
              ? getWalkTimeBetweenLands(item.land, nextLand)
              : DEFAULT_WALK_TIME;
            return startMinutes + waitTime + RIDE_DURATION + walkTime;
          };

          // Helper to find insert position based on when rides ACTUALLY END, not start time
          // This ensures breaks are inserted AFTER the previous activity completes
          const findInsertPositionAfterRideEnds = (targetMinutes: number): number => {
            for (let idx = 0; idx < items.length; idx++) {
              const item = items[idx];
              if (item.type === 'ride') {
                // Look ahead to get the next ride's land for accurate walk time
                const nextItem = items[idx + 1];
                const nextLand = nextItem?.type === 'ride' ? nextItem.land : null;
                const rideEnd = getRideEndTime(item, nextLand);
                // Insert AFTER this ride completes if targetMinutes falls after it ends
                if (targetMinutes <= rideEnd) {
                  return idx + 1; // Insert after this ride
                }
              } else {
                // For non-ride items, use start time
                const itemMinutes = parseTimeToMinutes(item.time);
                if (targetMinutes <= itemMinutes) {
                  return idx;
                }
              }
            }
            return items.length;
          };

          // Check if a proposed break time overlaps with any ride
          const isTimeAvailable = (proposedMinutes: number): boolean => {
            for (const item of items) {
              if (item.type !== 'ride') continue;
              const rideStart = parseTimeToMinutes(item.time);
              const rideEnd = getRideEndTime(item);
              // Check if proposed time falls during this ride
              if (proposedMinutes >= rideStart && proposedMinutes < rideEnd) {
                return false;
              }
            }
            return true;
          };

          // Find the next available time slot after a given time
          const findNextAvailableSlot = (afterMinutes: number, beforeMinutes: number): number => {
            // Get all ride items sorted by time
            const rideItems = items
              .filter(item => item.type === 'ride')
              .map(item => ({
                start: parseTimeToMinutes(item.time),
                end: getRideEndTime(item),
                wait: item.expectedWait || 0,
              }))
              .sort((a, b) => a.start - b.start);

            // Find the first gap after 'afterMinutes' but before 'beforeMinutes'
            for (const ride of rideItems) {
              // If this ride ends within our window, that's a potential slot
              if (ride.end >= afterMinutes && ride.end <= beforeMinutes) {
                // Check the next ride doesn't start immediately
                const nextRide = rideItems.find(r => r.start > ride.end);
                if (!nextRide || nextRide.start > ride.end) {
                  return ride.end;
                }
              }
            }

            // If no gap found, use the default (but ensure it's valid)
            return afterMinutes;
          };

          // DYNAMIC BREAK FINDER: Find optimal break time within a window
          // Finds a valid slot BETWEEN rides, ensuring break starts AFTER previous ride completes
          const findOptimalBreakTime = (
            windowStartMinutes: number,
            windowEndMinutes: number,
            defaultMinutes: number,
            breakDuration: number
          ): { time: string; avgWait: number; note: string; insertAfterIndex: number } => {
            // Get ALL rides with their ACTUAL index in the items array (not filtered index)
            const allRides: Array<{
              item: ItineraryItem;
              actualIndex: number;
              start: number;
              end: number;
              wait: number;
            }> = [];

            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (item.type === 'ride') {
                allRides.push({
                  item,
                  actualIndex: i, // This is the real index in items array
                  start: parseTimeToMinutes(item.time),
                  end: getRideEndTime(item),
                  wait: item.expectedWait || 0,
                });
              }
            }

            // Sort by start time
            allRides.sort((a, b) => a.start - b.start);

            if (allRides.length === 0) {
              return {
                time: minutesToTimeString(defaultMinutes),
                avgWait: 0,
                note: 'Good time for a break while you recharge.',
                insertAfterIndex: 0,
              };
            }

            // Find the best ride to insert break AFTER
            // Criteria: Ride ends within window AND next ride would have high waits
            let bestBreakAfterRideIndex = -1;
            let bestBreakTime = defaultMinutes;
            let highestUpcomingWait = 0;

            for (let i = 0; i < allRides.length; i++) {
              const currentRide = allRides[i];
              const rideEndTime = currentRide.end;

              // Check if this ride ends within our break window (or just before it starts)
              if (rideEndTime >= windowStartMinutes - 30 && rideEndTime <= windowEndMinutes) {
                // Look at wait times for rides that would be next
                // We want to break when upcoming rides have HIGH waits
                const laterRides = allRides.slice(i + 1);
                const avgUpcomingWait = laterRides.length > 0
                  ? laterRides.reduce((sum, r) => sum + r.wait, 0) / laterRides.length
                  : 0;

                // Prefer breaking before high-wait periods
                if (avgUpcomingWait >= highestUpcomingWait || bestBreakAfterRideIndex === -1) {
                  // Only update if this creates a valid break time within window
                  const proposedBreakTime = Math.max(rideEndTime, windowStartMinutes);
                  if (proposedBreakTime <= windowEndMinutes) {
                    highestUpcomingWait = avgUpcomingWait;
                    bestBreakTime = proposedBreakTime;
                    bestBreakAfterRideIndex = currentRide.actualIndex; // Use actual index
                  }
                }
              }
            }

            // If no ride ends within window, find the ride that ends just before the window
            // and insert break at window start
            if (bestBreakAfterRideIndex === -1) {
              // Find the LAST ride that ends before the window (closest to break time)
              // Using filter + last element instead of find() which returns first match
              const ridesEndingBeforeWindow = allRides.filter(r => r.end <= windowStartMinutes);
              const lastRideBeforeWindow = ridesEndingBeforeWindow.length > 0
                ? ridesEndingBeforeWindow[ridesEndingBeforeWindow.length - 1]
                : null;

              const ridesDuringWindow = allRides.filter(r =>
                r.start <= windowEndMinutes && r.end >= windowStartMinutes
              );

              if (ridesDuringWindow.length > 0) {
                // There's a ride during the window - insert after it
                const lastRideInWindow = ridesDuringWindow[ridesDuringWindow.length - 1];
                bestBreakAfterRideIndex = lastRideInWindow.actualIndex; // Use actual index
                bestBreakTime = Math.min(lastRideInWindow.end, windowEndMinutes);
              } else if (lastRideBeforeWindow) {
                bestBreakAfterRideIndex = lastRideBeforeWindow.actualIndex; // Use actual index
                bestBreakTime = windowStartMinutes;
              } else {
                // No rides before window - insert at beginning
                bestBreakAfterRideIndex = -1;
                bestBreakTime = windowStartMinutes;
              }
            }

            const note = highestUpcomingWait > 30
              ? `Skip the ~${Math.round(highestUpcomingWait)} min waits - break while crowds are highest.`
              : 'Great time to recharge before continuing.';

            return {
              time: minutesToTimeString(bestBreakTime),
              avgWait: highestUpcomingWait,
              note,
              insertAfterIndex: bestBreakAfterRideIndex,
            };
          };

          // Helper to insert a break and ensure all subsequent items are properly timed
          const insertBreakAndShiftTimes = (
            breakItem: ItineraryItem,
            insertPosition: number,
            breakDuration: number
          ) => {
            // Insert the break
            items.splice(insertPosition, 0, breakItem);

            // Calculate when the break ENDS - this is the earliest any subsequent item can start
            const breakStartMinutes = parseTimeToMinutes(breakItem.time);
            const breakEndMinutes = breakStartMinutes + breakDuration;

            // Track when the previous activity ends (starts with break end time)
            let earliestNextStart = breakEndMinutes;
            // Track the previous ride's land for walk time calculation
            // After a break, we start from the break's land (where we ate/rested)
            let previousLand = breakItem.land || null;

            // Process all items after the break
            for (let i = insertPosition + 1; i < items.length; i++) {
              const item = items[i];

              // Skip non-ride items (they don't need cascading)
              if (item.type !== 'ride') continue;

              const currentStartMinutes = parseTimeToMinutes(item.time);

              // The new start time must be at least when the previous activity ended
              // This ensures proper cascading when multiple items need to shift
              const newStartMinutes = Math.max(currentStartMinutes + breakDuration, earliestNextStart);
              item.time = minutesToTimeString(newStartMinutes);

              // Calculate dynamic walk time to the next ride
              const nextItem = items[i + 1];
              const nextLand = nextItem?.type === 'ride' ? nextItem.land : null;
              const walkTime = getWalkTimeBetweenLands(item.land, nextLand);

              // Calculate when this item ends for the next iteration
              const waitTime = item.expectedWait || 0;
              earliestNextStart = newStartMinutes + waitTime + RIDE_DURATION + walkTime;
              previousLand = item.land || null;
            }
          };

          // LUNCH BREAK - Dynamic within 11:00 AM - 1:00 PM window
          const LUNCH_WINDOW_START = 11 * 60; // 11:00 AM in minutes
          const LUNCH_WINDOW_END = 13 * 60;   // 1:00 PM in minutes
          const LUNCH_DEFAULT = 12 * 60;      // 12:00 PM default
          const LUNCH_DURATION = 45;          // 45 min lunch

          const optimalLunch = findOptimalBreakTime(LUNCH_WINDOW_START, LUNCH_WINDOW_END, LUNCH_DEFAULT, LUNCH_DURATION);
          const lunchLand = findCurrentLand(optimalLunch.time);
          const lunchActivities = getLandActivities(lunchLand);
          const lunchDining = lunchActivities?.dining.find(d => d.type === 'quick-service' || d.type === 'table-service');
          const lunchShopping = lunchActivities?.shopping[0];

          // Insert AFTER the specified ride index
          const lunchPosition = optimalLunch.insertAfterIndex >= 0
            ? optimalLunch.insertAfterIndex + 1
            : 0;

          insertBreakAndShiftTimes({
            time: optimalLunch.time,
            type: 'meal',
            name: 'Lunch Break',
            expectedWait: 0,
            notes: optimalLunch.note,
            land: lunchLand,
            isReride: false,
            breakDuration: LUNCH_DURATION,
            peakWaitTime: optimalLunch.avgWait,
            diningName: lunchDining?.name,
            diningDetail: lunchDining?.specialty || 'Grab a bite to eat',
            diningImage: lunchDining?.image,
            shoppingName: lunchShopping?.name,
            shoppingDetail: lunchShopping?.highlights,
            shoppingImage: lunchShopping?.image,
          }, lunchPosition, LUNCH_DURATION);

          // DINNER BREAK - Only for full-day visits, dynamic within 5:00 PM - 7:00 PM window
          if (sd.duration === 'full-day') {
            const DINNER_WINDOW_START = 17 * 60; // 5:00 PM in minutes
            const DINNER_WINDOW_END = 19 * 60;   // 7:00 PM in minutes
            const DINNER_DEFAULT = 17 * 60 + 30; // 5:30 PM default
            const DINNER_DURATION = 60;          // 60 min dinner

            // Re-run findOptimalBreakTime since items array has changed after lunch insertion
            const optimalDinner = findOptimalBreakTime(DINNER_WINDOW_START, DINNER_WINDOW_END, DINNER_DEFAULT, DINNER_DURATION);
            const dinnerLand = findCurrentLand(optimalDinner.time);
            const dinnerActivities = getLandActivities(dinnerLand);
            const dinnerDining = dinnerActivities?.dining.find(d => d.type === 'table-service' || d.type === 'quick-service');
            const dinnerShopping = dinnerActivities?.shopping[0];

            // Find the correct position in the updated array
            const dinnerPosition = optimalDinner.insertAfterIndex >= 0
              ? optimalDinner.insertAfterIndex + 1
              : items.length;

            insertBreakAndShiftTimes({
              time: optimalDinner.time,
              type: 'meal',
              name: 'Dinner Break',
              expectedWait: 0,
              notes: optimalDinner.note,
              land: dinnerLand,
              isReride: false,
              breakDuration: DINNER_DURATION,
              peakWaitTime: optimalDinner.avgWait,
              diningName: dinnerDining?.name,
              diningDetail: dinnerDining?.specialty || 'Enjoy a sit-down meal',
              diningImage: dinnerDining?.image,
              shoppingName: dinnerShopping?.name,
              shoppingDetail: dinnerShopping?.highlights,
              shoppingImage: dinnerShopping?.image,
            }, dinnerPosition, DINNER_DURATION);
          }

          // Final sort to ensure correct chronological order
          items.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
        }

        // =============================================
        // PARK CLOSING TIME (already calculated above for fill rides)
        // parkCloseMinutes is defined earlier in this loop iteration
        // =============================================

        // Helper to calculate when an item ends
        const getItemEndTime = (item: ItineraryItem): number => {
          const startMinutes = parseTimeToMinutes(item.time);
          if (item.type === 'ride') {
            const wait = item.expectedWait || 0;
            const rideDuration = 10; // Average ride duration
            return startMinutes + wait + rideDuration;
          } else if (item.type === 'meal' || item.type === 'break') {
            return startMinutes + (item.breakDuration || 45);
          }
          return startMinutes + 30; // Default 30 min for other items
        };

        // =============================================
        // ADD ENTERTAINMENT (Fireworks, Parades)
        // Insert nighttime spectaculars and parades based on schedule
        // =============================================
        if (selectedPark && sd.duration === 'full-day') {
          // Try to get live entertainment data, fall back to defaults
          const defaultEntertainment = getDefaultEntertainment(selectedPark);

          // Add nighttime spectacular if available AND user wants it
          if (wantFireworks && defaultEntertainment.nighttimeSpectacular) {
            const show = defaultEntertainment.nighttimeSpectacular;
            const showTime = show.showTimes?.[0]?.startTime;
            if (showTime) {
              // Parse the show time (could be ISO or just HH:MM)
              let showHour: number;
              let showMinute: number;
              if (showTime.includes('T')) {
                const date = new Date(showTime);
                showHour = date.getHours();
                showMinute = date.getMinutes();
              } else {
                const [h, m] = showTime.split(':').map(Number);
                showHour = h;
                showMinute = m || 0;
              }
              const showMinutes = showHour * 60 + showMinute;

              // Only add if we'll be at the park at that time
              const lastScheduledItem = items[items.length - 1];
              const lastItemEnd = lastScheduledItem ? getItemEndTime(lastScheduledItem) : parseTimeToMinutes(sd.arrivalTime);

              // Add if the show fits in our day (park still open)
              if (showMinutes >= lastItemEnd - 30 && showMinutes < parkCloseMinutes) {
                // Check if there's already something at this time
                const conflictingItem = items.find(item => {
                  const itemMinutes = parseTimeToMinutes(item.time);
                  return Math.abs(itemMinutes - showMinutes) < 30;
                });

                if (!conflictingItem) {
                  items.push({
                    time: minutesToTimeString(showMinutes - 30), // Arrive 30 min early for good spot
                    type: 'suggestion',
                    name: `🎆 ${show.name}`,
                    notes: `Must-see nighttime spectacular! Arrive early for a good viewing spot.`,
                    isReride: false,
                    suggestionType: 'show',
                    breakDuration: 45, // 15 min early + 30 min show
                  });
                }
              }
            }
          }

          // Add parade if available AND user wants it
          if (wantParade && defaultEntertainment.parade) {
            const parade = defaultEntertainment.parade;
            const paradeTime = parade.showTimes?.[0]?.startTime;
            if (paradeTime) {
              let paradeHour: number;
              let paradeMinute: number;
              if (paradeTime.includes('T')) {
                const date = new Date(paradeTime);
                paradeHour = date.getHours();
                paradeMinute = date.getMinutes();
              } else {
                const [h, m] = paradeTime.split(':').map(Number);
                paradeHour = h;
                paradeMinute = m || 0;
              }
              const paradeMinutes = paradeHour * 60 + paradeMinute;

              // Check if parade fits in our schedule
              const arrivalMinutes = parseTimeToMinutes(sd.arrivalTime);
              if (paradeMinutes >= arrivalMinutes && paradeMinutes < parkCloseMinutes) {
                // Check for conflicts
                const conflictingItem = items.find(item => {
                  const itemMinutes = parseTimeToMinutes(item.time);
                  return Math.abs(itemMinutes - paradeMinutes) < 20;
                });

                if (!conflictingItem) {
                  items.push({
                    time: minutesToTimeString(paradeMinutes - 15), // Arrive 15 min early
                    type: 'suggestion',
                    name: `🎭 ${parade.name}`,
                    notes: `Classic Disney parade! Find a spot along the parade route about 15 minutes before.`,
                    isReride: false,
                    suggestionType: 'show',
                    breakDuration: 30, // 15 min early + 15 min parade
                  });
                }
              }
            }
          }

          // Re-sort after adding entertainment
          items.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
        }

        // =============================================
        // FILL END-OF-DAY GAP
        // If there's significant time remaining before park closes, fill it
        // Only if user wants re-rides to fill their schedule
        // (parkCloseMinutes and getItemEndTime already defined above)
        // =============================================
        const lastItem = items[items.length - 1];
        const lastItemEndMinutes = lastItem ? getItemEndTime(lastItem) : parseTimeToMinutes(sd.arrivalTime);
        const gapMinutes = parkCloseMinutes - lastItemEndMinutes;

        // If there's more than 60 minutes until park closes and user wants re-rides, fill the gap
        if (allowRerides && gapMinutes > 60) {
          let currentMinutes = lastItemEndMinutes + 10; // Start 10 min after last item ends
          let previousLand = lastItem?.land || null;

          // Determine how many activities we can fit
          // Each re-ride takes ~35 min (15 wait + 10 ride + 10 walk), shopping break ~30 min
          const activitiesToAdd = Math.floor((gapMinutes - 30) / 40); // Leave 30 min buffer before close

          // Get favorite rides for potential re-rides - ONLY rides already seen today
          // Use rides with higher wait times as proxy for popularity (more popular = longer waits)
          const sortedByPopularity = [...allDayRides]
            .filter(r => seenRideIds.has(r.id)) // Only include rides already ridden
            .sort((a, b) => (b.waitTime || 0) - (a.waitTime || 0));
          // Take top half of rides as "favorites" for re-rides
          const favoriteRides = sortedByPopularity.slice(0, Math.max(2, Math.ceil(sortedByPopularity.length / 2)));

          // Mix of re-rides and exploration
          for (let actIdx = 0; actIdx < Math.min(activitiesToAdd, 5); actIdx++) {
            // Stop if we're within 45 min of park close
            if (currentMinutes + 45 > parkCloseMinutes) break;

            // Alternate between re-rides and exploration/shopping
            const isEvenActivity = actIdx % 2 === 0;

            if (isEvenActivity && favoriteRides.length > 0) {
              // Add a re-ride
              const rideIndex = actIdx % favoriteRides.length;
              const reRide = favoriteRides[rideIndex];
              const walkTime = getWalkTimeBetweenLands(previousLand, reRide.land);

              // Evening waits are typically lower
              const eveningWait = Math.max(10, Math.round((reRide.waitTime || 30) * 0.6));
              const RIDE_DURATION = 10;

              // Check if we're already past park close
              if (currentMinutes >= parkCloseMinutes) {
                break;
              }

              // Check if this ride would extend past park closing
              const rideEndMinutes = currentMinutes + walkTime + eveningWait + RIDE_DURATION;
              if (rideEndMinutes > parkCloseMinutes) {
                // This ride would extend past park closing - stop adding activities
                break;
              }

              currentMinutes += walkTime;

              items.push({
                time: minutesToTimeString(currentMinutes),
                type: 'ride',
                name: `${reRide.name} ★`,
                expectedWait: eveningWait,
                notes: 'Evening re-ride - shorter lines as the day winds down!',
                land: reRide.land,
                isReride: true,
              });

              currentMinutes += eveningWait + RIDE_DURATION; // wait + ride duration
              previousLand = reRide.land || null;
            } else {
              // Add shopping/exploration break
              const BREAK_DURATION = 30;

              // Check if this break would extend past park closing
              if (currentMinutes + BREAK_DURATION > parkCloseMinutes) {
                // Not enough time for a break - stop adding activities
                break;
              }

              const currentLand = previousLand || (allDayRides[0]?.land || 'the park');
              const landActivities = getLandActivities(currentLand);
              const shopping = landActivities?.shopping[0];
              const snack = landActivities?.dining.find(d => d.type === 'snack');

              items.push({
                time: minutesToTimeString(currentMinutes),
                type: 'break',
                name: 'Evening Exploration',
                expectedWait: 0,
                notes: `Perfect time to browse shops and grab a snack before the park closes.`,
                land: currentLand,
                isReride: false,
                breakDuration: BREAK_DURATION,
                shoppingName: shopping?.name || 'Nearby shops',
                shoppingDetail: shopping?.highlights || 'End-of-day souvenirs and gifts',
                shoppingImage: shopping?.image,
                diningName: snack?.name,
                diningDetail: snack?.specialty,
                diningImage: snack?.image,
              });

              currentMinutes += BREAK_DURATION;
            }
          }

          // ============================================================
          // ADD ENTERTAINMENT (Parades and Fireworks if enabled)
          // ============================================================

          // Get entertainment support for the current park context
          const currentParkId = isParkHopper && secondParkId ? secondParkId : selectedPark;
          const entertainmentSupport = currentParkId ? PARK_ENTERTAINMENT_SUPPORT[currentParkId] : null;

          // Add Parade (if enabled and supported) - typically around 3 PM
          if (wantParade && entertainmentSupport?.hasParade && entertainmentSupport.paradeName) {
            const paradeTimeMinutes = 15 * 60; // 3:00 PM default
            // Make sure parade isn't past park close
            if (paradeTimeMinutes < parkCloseMinutes - 30) {
              items.push({
                time: minutesToTimeString(paradeTimeMinutes),
                type: 'entertainment',
                name: `🎭 ${entertainmentSupport.paradeName}`,
                notes: 'Find a good viewing spot 15-20 minutes early for the best experience!',
                isReride: false,
                expectedWait: 0,
              });
              dayInsights.push(`Parade: ${entertainmentSupport.paradeName} scheduled for 3:00 PM`);
            }
          }

          // Add Fireworks/Nighttime Spectacular (if enabled and supported) - near park close
          if (wantFireworks && entertainmentSupport?.hasFireworks && entertainmentSupport.fireworksName) {
            // Typically 30-45 minutes before park close, but check park hours
            const fireworksTimeMinutes = Math.max(parkCloseMinutes - 45, 20 * 60); // At least 8 PM
            // Only add if it's reasonably close to evening
            if (fireworksTimeMinutes >= 19 * 60) { // 7 PM or later
              items.push({
                time: minutesToTimeString(fireworksTimeMinutes),
                type: 'entertainment',
                name: `✨ ${entertainmentSupport.fireworksName}`,
                notes: 'Arrive 30-45 minutes early for a prime viewing location. Main Street/Hub area usually has the best views!',
                isReride: false,
                expectedWait: 0,
              });
              dayInsights.push(`Nighttime Spectacular: ${entertainmentSupport.fireworksName} at ${minutesToTimeString(fireworksTimeMinutes)}`);
            }
          }

          // Add final "Park Closes" marker if we have activities
          if (items.length > 0 && gapMinutes > 30) {
            // Don't add if we're already close to closing
            const lastAddedItem = items[items.length - 1];
            const lastAddedEnd = getItemEndTime(lastAddedItem);
            if (parkCloseMinutes - lastAddedEnd > 15) {
              items.push({
                time: minutesToTimeString(parkCloseMinutes - 15),
                type: 'suggestion',
                name: 'Head Towards Exit',
                notes: 'Park closes soon! Great time for last-minute photos and to beat the exit crowds.',
                isReride: false,
              });
            }
          }

          // Re-sort after adding end-of-day activities
          items.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
        }

        // SAFETY FILTER: Remove any rides that START after park close
        // This catches any edge cases missed by earlier checks
        const filteredItems = items.filter(item => {
          if (item.type !== 'ride') return true; // Keep non-ride items
          const startMinutes = parseTimeToMinutes(item.time);
          return startMinutes < parkCloseMinutes;
        });

        // Replace items with filtered version
        items.length = 0;
        items.push(...filteredItems);

        // NOTE: Park hopper two-phase scheduling will be implemented
        // when the wizard flow is updated to properly separate parks

        const allRideItems = items.filter((item) => item.type === 'ride');
        const reRideItems = allRideItems.filter(item => item.isReride);
        const dayWait = allRideItems.reduce((sum, item) => sum + (item.expectedWait || 0), 0);

        // Track which rides from user's selection couldn't be scheduled
        // Compare uniqueRides (user's selected rides for this day) with actually scheduled rides
        const scheduledRideNames = new Set(
          allRideItems
            .filter(item => !item.isReride) // Only count first-time rides, not re-rides
            .map(item => item.name.replace(' ★', '').toLowerCase())
        );

        const skippedRides: SkippedRide[] = uniqueRides
          .filter(ride => !scheduledRideNames.has(ride.name.toLowerCase()))
          .map(ride => {
            // Use ride weights data for accurate categorization
            const rideWeight = getRideWeight(ride.name);
            const isMustDo = rideWeight.mustDo;
            return {
              name: ride.name,
              reason: isMustDo
                ? 'High-priority attraction that couldn\'t fit due to time constraints'
                : 'Not enough time in the day due to wait times at other attractions',
              category: rideWeight.category,
            };
          })
          // Sort by weight (highest first) so most important skipped rides are shown first
          .sort((a, b) => {
            const weightA = getRideWeight(a.name).weight;
            const weightB = getRideWeight(b.name).weight;
            return weightB - weightA; // Higher weight = more important = show first
          });

        // dateKey already declared above in end-of-day gap filling
        dayItineraries.push({
          date: sd.date,
          dayNumber: i + 1,
          dayLabel: `Day ${i + 1} - ${formatDateFull(sd.date)}`,
          dayType,
          duration: sd.duration,
          items,
          totalWaitTime: dayWait,
          ridesCount: allRideItems.length,
          insights: [
            ...dayInsights,
            ...(reRideItems.length > 0 ? [`${reRideItems.length} re-ride${reRideItems.length > 1 ? 's' : ''} added to fill your day`] : []),
          ],
          parkHours: parkHoursMap[dateKey],
          skippedRides: skippedRides.length > 0 ? skippedRides : undefined,
        });

        totalWaitTime += dayWait;
        totalRidesScheduled += allRideItems.length;
        totalRerides += reRideItems.length;
      } else {
        // dateKey already declared at for loop level
        dayItineraries.push({
          date: sd.date,
          dayNumber: i + 1,
          dayLabel: `Day ${i + 1} - ${formatDateFull(sd.date)}`,
          dayType,
          duration: sd.duration,
          items: [],
          totalWaitTime: 0,
          ridesCount: 0,
          insights: [],
          parkHours: parkHoursMap[dateKey],
        });
      }
    }

    // Generate strategy summary
    const strategySummary: string[] = [];

    // Day type analysis
    const weekdayCount = sortedDates.filter(
      (sd) => classifyDayType(sd.date) === 'weekday'
    ).length;
    const weekendCount = sortedDates.filter(
      (sd) => classifyDayType(sd.date) === 'weekend'
    ).length;

    if (weekdayCount > 0 && weekendCount > 0) {
      strategySummary.push(
        `Your trip includes ${weekdayCount} weekday${weekdayCount > 1 ? 's' : ''} and ${weekendCount} weekend day${weekendCount > 1 ? 's' : ''}. Higher-demand attractions are placed on weekdays when crowds tend to be lighter.`
      );
    } else if (weekdayCount === sortedDates.length) {
      strategySummary.push(
        `All your visit days are weekdays - great choice! You'll likely experience lower wait times compared to weekends.`
      );
    }

    // Unique rides vs re-rides breakdown
    const uniqueRidesTotal = totalRidesScheduled - totalRerides;
    strategySummary.push(
      `${uniqueRidesTotal} unique attraction${uniqueRidesTotal !== 1 ? 's' : ''} scheduled across ${sortedDates.length} day${sortedDates.length > 1 ? 's' : ''}.`
    );

    if (totalRerides > 0) {
      strategySummary.push(
        `${totalRerides} re-ride${totalRerides !== 1 ? 's' : ''} added to help maximize your park time. These are marked with ★ in your schedule.`
      );
    }

    // Half day note
    const halfDays = sortedDates.filter((sd) => sd.duration === 'half-day').length;
    if (halfDays > 0) {
      strategySummary.push(
        `${halfDays} half-day visit${halfDays > 1 ? 's' : ''} scheduled with focused morning experiences when wait times tend to be lowest.`
      );
    }

    // Park hopper note
    if (isParkHopper && secondParkId) {
      const firstParkData = parks.find(p => p.id === selectedPark);
      const secondParkData = parks.find(p => p.id === secondParkId);
      const travelTime = getTransitionTime(selectedPark!, secondParkId);
      strategySummary.push(
        `Park Hopper: Starting at ${firstParkData?.name || 'first park'}, then transitioning to ${secondParkData?.name || 'second park'} at ${transitionTime} (~${travelTime} min travel).`
      );
    }

    // Headliner strategy
    const headlinerStrategy: string[] = [];
    const headlinerCount = selectedRideObjects.filter(r => categorizeRide(r.name) === 'headliner').length;

    if (headlinerCount > 0) {
      headlinerStrategy.push(
        `${headlinerCount} headliner attraction${headlinerCount > 1 ? 's' : ''} distributed across your visit days`
      );
      headlinerStrategy.push(
        'Headliners scheduled early each day to help reduce wait times during peak hours'
      );
    }

    if (weekdayCount > 0 && weekendCount > 0 && headlinerCount > 0) {
      headlinerStrategy.push(
        'More headliners placed on weekdays when crowds are typically 20-30% lower'
      );
    }

    // Calculate baseline for comparison using actual ride predictions
    // Compare optimized schedule against peak wait times (worst case without optimization)
    // This shows real value: "If you hit these rides at peak times, you'd wait X more minutes"
    const waitTimeSaved = Math.max(0, totalPeakWait - totalWaitTime);

    // Also calculate savings vs average (more conservative estimate)
    const waitTimeSavedVsAvg = Math.max(0, totalAvgWait - totalWaitTime);

    // Use peak as baseline for percentage (shows maximum potential savings)
    const percentImprovement = totalPeakWait > 0
      ? Math.round((waitTimeSaved / totalPeakWait) * 100)
      : 0;

    const tripReport: TripReport = {
      days: dayItineraries,
      strategySummary,
      headlinerStrategy,
      totalWaitTime,
      totalRides: totalRidesScheduled,
      waitTimeSaved,
      percentImprovement,
    };

    setReport(tripReport);
    setCurrentPlanId(generatePlanId());
    setIsSaved(false);
    setStep('report');
  };

  const handleSavePlan = () => {
    if (!selectedPark || !currentPlanId || !report) return;

    const plan: SavedPlan = {
      id: currentPlanId,
      parkId: selectedPark,
      parkName: selectedParkData?.name || 'Theme Park',
      dates: selectedDates.map((sd) => sd.date.toISOString()),
      createdAt: new Date().toISOString(),
      report,
      selectedRides,
    };

    savePlan(plan);
    setSavedPlans(getSavedPlans());
    setIsSaved(true);
  };

  const handleLoadPlan = (plan: SavedPlan) => {
    setSelectedPark(plan.parkId);
    setSelectedRides(plan.selectedRides);
    setSelectedDates(
      plan.dates.map((d) => ({
        date: new Date(d),
        duration: 'full-day',
        arrivalTime: 'rope-drop',
      }))
    );
    setReport(plan.report);
    setCurrentPlanId(plan.id);
    setIsSaved(true);
    setStep('report');
  };

  const handleDeletePlan = (planId: string) => {
    deletePlan(planId);
    setSavedPlans(getSavedPlans());
  };

  const resetWizard = () => {
    setStep('park');
    setSelectedPark(null);
    setSelectedDates([]);
    setSelectedRides([]);
    setReport(null);
    setCurrentPlanId(null);
    setIsSaved(false);
    setPreferences({ priority: 'balanced', includeBreaks: true });
  };

  const canProceed = () => {
    switch (step) {
      case 'park':
        return selectedPark !== null;
      case 'ticket-type':
        // If park hopper, need a second park selected
        return !isParkHopper || secondParkId !== null;
      case 'entertainment':
        // Entertainment is optional - can always proceed
        return true;
      case 'schedule-style':
        // Schedule style is a preference - can always proceed
        return true;
      case 'dates':
        return selectedDates.length > 0;
      case 'rides':
        return selectedRides.length > 0;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (step === 'park') {
      // Park selection auto-advances via onSelect callback
      return;
    }
    else if (step === 'ticket-type') {
      setStep('entertainment');
    }
    else if (step === 'entertainment') {
      setStep('schedule-style');
    }
    else if (step === 'schedule-style') {
      setStep('dates');
    }
    else if (step === 'dates') {
      // Auto-select rope drop target rides when moving to ride selection
      const ropeDropTargetNames = selectedDates
        .filter(sd => sd.ropeDropTarget)
        .map(sd => sd.ropeDropTarget!.toLowerCase());

      if (ropeDropTargetNames.length > 0) {
        const ridesMatchingTargets = rides.filter(ride => {
          const rideName = ride.name.toLowerCase();
          return ropeDropTargetNames.some(target =>
            rideName === target ||
            rideName.includes(target) ||
            target.includes(rideName)
          );
        });

        // Add matching ride IDs to selection (avoid duplicates)
        const newSelectedRides = [...selectedRides];
        for (const ride of ridesMatchingTargets) {
          if (!newSelectedRides.includes(ride.id)) {
            newSelectedRides.push(ride.id);
          }
        }
        setSelectedRides(newSelectedRides);
      }

      setStep('rides');
    }
    else if (step === 'rides') generateReport();
  };

  const prevStep = () => {
    if (step === 'ticket-type') setStep('park');
    else if (step === 'entertainment') {
      // Go back to ticket-type if it's a Disney park, otherwise park
      if (selectedPark && supportsParkHopper(selectedPark)) {
        setStep('ticket-type');
      } else {
        setStep('park');
      }
    }
    else if (step === 'schedule-style') setStep('entertainment');
    else if (step === 'dates') setStep('schedule-style');
    else if (step === 'rides') setStep('dates');
    else if (step === 'report') setStep('rides');
  };

  const selectedParkData = parks.find((p) => p.id === selectedPark);

  if (loading && step === 'park') {
    return (
      <div className="pw-container">
        <div className="pw-loading">
          <div className="pw-spinner" />
          <span>Loading parks...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pw-container">
      <StepIndicator currentStep={step} />

      <div className="pw-content">
        {step === 'park' && (
          <>
            <ParkSelection
              parks={parks}
              selectedPark={selectedPark}
              onSelect={(parkId) => {
                setSelectedPark(parkId);
                // Check if this park supports park hopper
                if (supportsParkHopper(parkId)) {
                  setStep('ticket-type');
                } else {
                  // Non-Disney parks skip ticket-type, go to entertainment
                  setIsParkHopper(false);
                  setSecondParkId(null);
                  setStep('entertainment');
                }
              }}
            />

            <SavedPlansView
              plans={savedPlans}
              onLoad={handleLoadPlan}
              onDelete={handleDeletePlan}
            />
          </>
        )}

        {step === 'ticket-type' && selectedPark && (
          <TicketTypeSelection
            selectedPark={selectedPark}
            parks={parks}
            isParkHopper={isParkHopper}
            secondParkId={secondParkId}
            transitionTime={transitionTime}
            onParkHopperChange={(enabled) => {
              setIsParkHopper(enabled);
              if (enabled) {
                // Auto-select second park if only one option
                const otherParks = getOtherParksInResort(selectedPark);
                if (otherParks.length === 1) {
                  setSecondParkId(otherParks[0].id);
                } else if (otherParks.length > 1 && !secondParkId) {
                  setSecondParkId(otherParks[0].id);
                }
              } else {
                setSecondParkId(null);
                setSecondParkRides([]);
              }
            }}
            onSecondParkChange={setSecondParkId}
            onTransitionTimeChange={setTransitionTime}
          />
        )}

        {step === 'entertainment' && (
          <EntertainmentPreference
            selectedPark={selectedPark}
            secondParkId={secondParkId}
            isParkHopper={isParkHopper}
            wantFireworks={wantFireworks}
            wantParade={wantParade}
            onFireworksChange={setWantFireworks}
            onParadeChange={setWantParade}
          />
        )}

        {step === 'schedule-style' && (
          <ScheduleStylePreference
            allowRerides={allowRerides}
            onReridePrefChange={setAllowRerides}
          />
        )}

        {step === 'dates' && (
          <DateSelection
            selectedDates={selectedDates}
            onToggleDate={toggleDate}
            onUpdateDate={updateDate}
            selectedPark={selectedPark}
            parkHoursMap={parkHoursMap}
          />
        )}

        {step === 'rides' && (
          <RideSelection
            rides={combinedRides}
            selectedRides={selectedRides}
            onToggle={toggleRide}
            onToggleLand={toggleLand}
            preferences={preferences}
            onPreferencesChange={setPreferences}
            ropeDropTargets={selectedDates
              .filter(sd => sd.ropeDropTarget)
              .map(sd => sd.ropeDropTarget as string)}
            isParkHopper={isParkHopper}
            maxRideLimit={maxRideLimit}
            isAtLimit={isAtRideLimit}
            isNearLimit={isNearRideLimit}
          />
        )}

        {step === 'report' && report && (
          <TripReportView
            report={report}
            parkName={selectedParkData?.name || 'Theme Park'}
            onSave={handleSavePlan}
            isSaved={isSaved}
          />
        )}
      </div>

      <div className="pw-footer">
        {step !== 'park' && (
          <button className="pw-btn secondary" onClick={step === 'report' ? resetWizard : prevStep}>
            {step === 'report' ? (
              'Start Over'
            ) : (
              <>
                <ChevronLeft size={18} />
                Back
              </>
            )}
          </button>
        )}

        {step !== 'report' && (
          <button className="pw-btn primary" onClick={nextStep} disabled={!canProceed()}>
            {step === 'rides' ? 'Generate Plan' : 'Continue'}
            <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
