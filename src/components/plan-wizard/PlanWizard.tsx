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
} from 'lucide-react';
import './PlanWizard.css';
import {
  optimizeSchedule,
  optimizeMultiDaySchedule,
  classifyDayType,
  getDayTypeDescription,
  getPredictedWaitForHour,
  type OptimizedSchedule,
  type MultiDaySchedule,
  type DayType,
} from '../../lib/analytics';
import {
  formatBreakSuggestion,
  getLandActivities,
} from '../../lib/analytics/data/landActivities';
import { getWalkTimeBetweenLands } from '../../lib/analytics/optimization/rideOrderer';
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
  type: 'ride' | 'break' | 'meal' | 'suggestion';
  name: string;
  expectedWait?: number;
  notes?: string;
  land?: string;
  isReride?: boolean;
  suggestionType?: 'dining' | 'shopping' | 'show';
  // Break-specific fields
  breakDuration?: number; // in minutes
  diningName?: string;
  diningDetail?: string;
  diningImage?: string;
  shoppingName?: string;
  shoppingDetail?: string;
  shoppingImage?: string;
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

type Step = 'park' | 'dates' | 'rides' | 'report';

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: 'park', label: 'Select Park', icon: <MapPin size={18} /> },
  { key: 'dates', label: 'Choose Dates', icon: <Calendar size={18} /> },
  { key: 'rides', label: 'Select Rides', icon: <Star size={18} /> },
  { key: 'report', label: 'Your Plan', icon: <Sparkles size={18} /> },
];

const PARK_IMAGES: Record<number, string> = {
  6: 'https://images.pexels.com/photos/8183994/pexels-photo-8183994.jpeg?auto=compress&cs=tinysrgb&w=600',
  5: 'https://images.pexels.com/photos/3617464/pexels-photo-3617464.jpeg?auto=compress&cs=tinysrgb&w=600',
  8: 'https://images.pexels.com/photos/14243455/pexels-photo-14243455.jpeg?auto=compress&cs=tinysrgb&w=600',
  7: 'https://images.pexels.com/photos/3617464/pexels-photo-3617464.jpeg?auto=compress&cs=tinysrgb&w=600',
  16: 'https://images.pexels.com/photos/17892641/pexels-photo-17892641.jpeg?auto=compress&cs=tinysrgb&w=600',
  17: 'https://images.pexels.com/photos/17892641/pexels-photo-17892641.jpeg?auto=compress&cs=tinysrgb&w=600',
  64: 'https://images.pexels.com/photos/5246036/pexels-photo-5246036.jpeg?auto=compress&cs=tinysrgb&w=600',
  65: 'https://images.pexels.com/photos/9400905/pexels-photo-9400905.jpeg?auto=compress&cs=tinysrgb&w=600',
  68: 'https://images.pexels.com/photos/5246036/pexels-photo-5246036.jpeg?auto=compress&cs=tinysrgb&w=600',
};

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

  return (
    <div className="pw-steps">
      {STEPS.map((step, index) => (
        <div
          key={step.key}
          className={`pw-step ${index < currentIndex ? 'completed' : ''} ${
            index === currentIndex ? 'active' : ''
          }`}
        >
          <div className="pw-step-marker">
            {index < currentIndex ? <Check size={14} /> : <span>{index + 1}</span>}
          </div>
          <span className="pw-step-label">{step.label}</span>
        </div>
      ))}
      <div className="pw-step-line" style={{ '--progress': `${(currentIndex / (STEPS.length - 1)) * 100}%` } as React.CSSProperties} />
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
          style={{ backgroundImage: `url(${PARK_IMAGES[park.id] || DEFAULT_IMAGE})` }}
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
}: {
  rides: Ride[];
  selectedRides: number[];
  onToggle: (id: number) => void;
  onToggleLand: (rideIds: number[], selectAll: boolean) => void;
  preferences: PlanPreferences;
  onPreferencesChange: (prefs: PlanPreferences) => void;
  ropeDropTargets?: string[]; // Ride names selected as rope drop targets
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

  // Group rides by land
  const ridesByLand = rides.reduce(
    (acc, ride) => {
      const land = ride.land || 'Other';
      if (!acc[land]) acc[land] = [];
      acc[land].push(ride);
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
        <div className="pw-selection-badge">{selectedRides.length} attractions selected</div>
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
            {Object.entries(filteredRidesByLand).map(([land, landRides]) => {
              const allSelected = isLandFullySelected(landRides);
              const partiallySelected = isLandPartiallySelected(landRides);
              const rideIds = landRides.map((r) => r.id);

              return (
                <div key={land} className="pw-ride-group">
                  <div className="pw-ride-group-header">
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
                    <span>{land}</span>
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
    text += `Estimated time saved: ~${report.waitTimeSaved} min\n`;
    text += `\nGenerated by ParkPulse\n`;

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

      {/* Stats Banner */}
      <div className="pw-report-stats">
        <div className="pw-stat">
          <span className="pw-stat-value">{report.days.length}</span>
          <span className="pw-stat-label">Days</span>
        </div>
        <div className="pw-stat">
          <span className="pw-stat-value">{report.totalRides}</span>
          <span className="pw-stat-label">Attractions</span>
        </div>
        <div className="pw-stat">
          <span className="pw-stat-value">{report.totalWaitTime}</span>
          <span className="pw-stat-label">Est. Wait (min)</span>
        </div>
        {report.waitTimeSaved > 0 && (
          <div className="pw-stat highlight">
            <span className="pw-stat-value">-{report.waitTimeSaved}</span>
            <span className="pw-stat-label">Min Saved</span>
          </div>
        )}
      </div>

      {/* Strategy Summary */}
      <div className="pw-strategy-section">
        <div className="pw-strategy-card">
          <div className="pw-strategy-icon">
            <Lightbulb size={20} />
          </div>
          <div className="pw-strategy-content">
            <h3>Why This Schedule Works</h3>
            <ul>
              {report.strategySummary.map((insight, idx) => (
                <li key={idx}>{insight}</li>
              ))}
            </ul>
          </div>
        </div>

        {report.headlinerStrategy.length > 0 && (
          <div className="pw-strategy-card accent">
            <div className="pw-strategy-icon">
              <Award size={20} />
            </div>
            <div className="pw-strategy-content">
              <h3>Headliner Placement Strategy</h3>
              <ul>
                {report.headlinerStrategy.map((strategy, idx) => (
                  <li key={idx}>{strategy}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Main Content: Schedule + Day Selector */}
      <div className="pw-schedule-layout">
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

          {currentDay.insights.length > 0 && (
            <div className="pw-day-insights">
              {currentDay.insights.map((insight, idx) => (
                <span key={idx} className="pw-insight-chip">
                  <TrendingDown size={12} />
                  {insight}
                </span>
              ))}
            </div>
          )}

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

              // Render special break card for meal/break items
              if (isMealBreak) {
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
                            {item.name.toLowerCase().includes('lunch') || item.name.toLowerCase().includes('dinner')
                              ? <Utensils size={18} />
                              : <Coffee size={18} />}
                          </span>
                          <div className="pw-break-title-content">
                            <span className="pw-break-name">{item.name}</span>
                            <span className="pw-break-duration">{item.breakDuration || 45} min</span>
                          </div>
                        </div>
                        {item.land && <span className="pw-break-location"><MapPin size={12} /> {item.land}</span>}
                      </div>

                      <div className="pw-break-suggestions">
                        {item.diningName && (
                          <div className="pw-break-suggestion pw-break-dining">
                            {item.diningImage ? (
                              <div className="pw-suggestion-image" style={{ backgroundImage: `url(${item.diningImage})` }} />
                            ) : (
                              <div className="pw-suggestion-image pw-suggestion-image-placeholder" />
                            )}
                            <div className="pw-suggestion-content">
                              <span className="pw-suggestion-category">Dining</span>
                              <span className="pw-suggestion-name">{item.diningName}</span>
                              {item.diningDetail && <span className="pw-suggestion-detail">{item.diningDetail}</span>}
                            </div>
                          </div>
                        )}
                        {item.shoppingName && (
                          <div className="pw-break-suggestion pw-break-shopping">
                            {item.shoppingImage ? (
                              <div className="pw-suggestion-image" style={{ backgroundImage: `url(${item.shoppingImage})` }} />
                            ) : (
                              <div className="pw-suggestion-image pw-suggestion-image-placeholder" />
                            )}
                            <div className="pw-suggestion-content">
                              <span className="pw-suggestion-category">Shopping</span>
                              <span className="pw-suggestion-name">{item.shoppingName}</span>
                              {item.shoppingDetail && <span className="pw-suggestion-detail">{item.shoppingDetail}</span>}
                            </div>
                          </div>
                        )}
                      </div>

                      {item.notes && <p className="pw-break-reason">{item.notes}</p>}
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
        </div>
        )}

        {/* Right: Sticky Day Selector */}
        {report.days.length > 1 && (
          <div className="pw-day-selector">
            <div className="pw-day-selector-header">
              <Calendar size={16} />
              <span>Your Days</span>
            </div>
            <div className="pw-day-selector-list">
              {report.days.map((day, idx) => (
                <button
                  key={idx}
                  className={`pw-day-selector-btn ${activeDay === idx ? 'active' : ''}`}
                  onClick={() => {
                    setActiveDay(idx);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <div className="pw-day-selector-num">
                    <span className="pw-day-num-label">Day</span>
                    <span className="pw-day-num-value">{idx + 1}</span>
                  </div>
                  <div className="pw-day-selector-info">
                    <span className="pw-day-selector-date">{formatDateShort(day.date)}</span>
                    <span className="pw-day-selector-meta">
                      {day.ridesCount} rides
                    </span>
                    <span className={`pw-day-selector-type ${day.dayType}`}>
                      {day.dayType === 'weekday' ? 'Weekday' : day.dayType === 'weekend' ? 'Weekend' : 'Peak'}
                    </span>
                  </div>
                  {activeDay === idx && (
                    <div className="pw-day-selector-indicator">
                      <ChevronLeft size={14} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="pw-tips">
        <h4>Pro Tips</h4>
        <ul>
          <li>Arrive 15-30 minutes before park opening for the best experience</li>
          <li>Download the park's official app for real-time wait updates</li>
          <li>This plan is optimized based on historical crowd patterns</li>
          <li>Stay flexible - conditions change throughout the day</li>
        </ul>
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

  // Fetch park hours when park and dates change
  useEffect(() => {
    if (selectedPark && selectedDates.length > 0) {
      const fetchAllParkHours = async () => {
        const hoursMap: Record<string, ParkHours> = {};
        for (const sd of selectedDates) {
          const dateKey = sd.date.toISOString().split('T')[0];
          try {
            const hours = await getParkHours(selectedPark, sd.date);
            hoursMap[dateKey] = hours;
          } catch (err) {
            console.error(`Failed to fetch park hours for ${dateKey}:`, err);
          }
        }
        setParkHoursMap(hoursMap);
      };
      fetchAllParkHours();
    }
  }, [selectedPark, selectedDates]);

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

  const toggleRide = (id: number) => {
    setSelectedRides((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const toggleLand = (rideIds: number[], selectAll: boolean) => {
    setSelectedRides((prev) => {
      if (selectAll) {
        // Add all rides from this land that aren't already selected
        const newIds = rideIds.filter((id) => !prev.includes(id));
        return [...prev, ...newIds];
      } else {
        // Remove all rides from this land
        return prev.filter((id) => !rideIds.includes(id));
      }
    });
  };

  const generateReport = () => {
    const sortedDates = [...selectedDates].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    const selectedRideObjects = rides
      .filter((r) => selectedRides.includes(r.id))
      .map((ride) => ({
        id: ride.id,
        name: ride.name,
        land: ride.land,
        isOpen: ride.is_open,
        waitTime: ride.wait_time,
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

    // First, assign headliners evenly, tracking their lands
    const headliners = sortedRides.filter(r => categorizeRide(r.name) === 'headliner');
    headliners.forEach((ride, idx) => {
      const dayIdx = idx % sortedDates.length;
      if (dayAssignments[dayIdx].length < dayCapacities[dayIdx]) {
        dayAssignments[dayIdx].push(ride);
        landsPerDay[dayIdx].add(ride.land || 'Other');
      }
    });

    // Then distribute non-headliners, preferring days that already have rides from the same land
    const nonHeadliners = sortedRides.filter(r => categorizeRide(r.name) !== 'headliner');

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
      }
    }

    // PHASE 2: Fill remaining capacity with re-rides
    // Prioritize headliners AND rides from lands already being visited that day
    const reRideAssignments: Array<Array<typeof selectedRideObjects[0]>> =
      sortedDates.map(() => []);

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
      const uniqueRides = dayAssignments[i];
      // Filter fill rides to exclude any that are already in uniqueRides (prevents duplicates)
      const uniqueRideIds = new Set(uniqueRides.map(r => r.id));
      const fillRides = reRideAssignments[i].filter(r => !uniqueRideIds.has(r.id));
      const allDayRides = [...uniqueRides, ...fillRides];

      // Get park hours data for this date (used by optimizer and entertainment)
      const dateKey = sd.date.toISOString().split('T')[0];
      const dayParkHours = parkHoursMap[dateKey];

      if (allDayRides.length > 0) {
        // Use single-day optimizer for unique rides first
        // NOTE: We pass includeBreaks: false because we add our own explicit lunch/dinner breaks
        // This prevents duplicate/overlapping breaks
        // Detect rope drop mode based on arrival time
        const isRopeDropMode = sd.arrivalTime === 'rope-drop';

        // Get park closing hour from park hours data
        const parkCloseHour = dayParkHours?.closeHour;

        const optimized = optimizeSchedule({
          selectedRides: uniqueRides,
          preferences: {
            visitDate: dateKey,
            arrivalTime: sd.arrivalTime,
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
        const items: ItineraryItem[] = [];

        for (const item of optimized.items) {
          if (item.type === 'ride' && item.ride) {
            const rideId = typeof item.ride.id === 'number' ? item.ride.id : parseInt(String(item.ride.id));
            const isReride = seenRideIds.has(rideId);

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

        if (fillRides.length > 0) {
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
            diningName: lunchDining?.name || 'Nearby dining',
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
              diningName: dinnerDining?.name || 'Nearby dining',
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

          // Add nighttime spectacular if available
          if (defaultEntertainment.nighttimeSpectacular) {
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

          // Add parade if available
          if (defaultEntertainment.parade) {
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
        // (parkCloseMinutes and getItemEndTime already defined above)
        // =============================================
        const lastItem = items[items.length - 1];
        const lastItemEndMinutes = lastItem ? getItemEndTime(lastItem) : parseTimeToMinutes(sd.arrivalTime);
        const gapMinutes = parkCloseMinutes - lastItemEndMinutes;

        // If there's more than 60 minutes until park closes, fill the gap
        if (gapMinutes > 60) {
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

        const allRideItems = items.filter((item) => item.type === 'ride');
        const reRideItems = allRideItems.filter(item => item.isReride);
        const dayWait = allRideItems.reduce((sum, item) => sum + (item.expectedWait || 0), 0);

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
            ...optimized.insights,
            ...(reRideItems.length > 0 ? [`${reRideItems.length} re-ride${reRideItems.length > 1 ? 's' : ''} added to fill your day`] : []),
          ],
          parkHours: parkHoursMap[dateKey],
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
        `Your trip includes ${weekdayCount} weekday${weekdayCount > 1 ? 's' : ''} and ${weekendCount} weekend day${weekendCount > 1 ? 's' : ''}. We've placed higher-demand attractions on weekdays when crowds are typically lighter.`
      );
    } else if (weekdayCount === sortedDates.length) {
      strategySummary.push(
        `All your visit days are weekdays - excellent choice! You'll experience significantly lower wait times compared to weekends.`
      );
    }

    // Unique rides vs re-rides breakdown
    const uniqueRidesTotal = totalRidesScheduled - totalRerides;
    strategySummary.push(
      `${uniqueRidesTotal} unique attraction${uniqueRidesTotal !== 1 ? 's' : ''} scheduled across ${sortedDates.length} day${sortedDates.length > 1 ? 's' : ''}.`
    );

    if (totalRerides > 0) {
      strategySummary.push(
        `${totalRerides} re-ride${totalRerides !== 1 ? 's' : ''} added to maximize your park time. These are marked with ★ in your schedule.`
      );
    }

    // Half day note
    const halfDays = sortedDates.filter((sd) => sd.duration === 'half-day').length;
    if (halfDays > 0) {
      strategySummary.push(
        `${halfDays} half-day visit${halfDays > 1 ? 's' : ''} scheduled with focused morning experiences when wait times are lowest.`
      );
    }

    // Headliner strategy
    const headlinerStrategy: string[] = [];
    const headlinerCount = selectedRideObjects.filter(r => categorizeRide(r.name) === 'headliner').length;

    if (headlinerCount > 0) {
      headlinerStrategy.push(
        `${headlinerCount} headliner attraction${headlinerCount > 1 ? 's' : ''} strategically distributed across your visit days`
      );
      headlinerStrategy.push(
        'Headliners scheduled early each day to minimize wait times during peak hours'
      );
    }

    if (weekdayCount > 0 && weekendCount > 0 && headlinerCount > 0) {
      headlinerStrategy.push(
        'More headliners placed on weekdays when crowds are historically 20-30% lower'
      );
    }

    // Calculate baseline for comparison
    const baselineWait = totalRidesScheduled * 45; // Rough average if no optimization
    const waitTimeSaved = Math.max(0, baselineWait - totalWaitTime);

    const tripReport: TripReport = {
      days: dayItineraries,
      strategySummary,
      headlinerStrategy,
      totalWaitTime,
      totalRides: totalRidesScheduled,
      waitTimeSaved,
      percentImprovement: baselineWait > 0 ? Math.round((waitTimeSaved / baselineWait) * 100) : 0,
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
      case 'dates':
        return selectedDates.length > 0;
      case 'rides':
        return selectedRides.length > 0;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (step === 'park') setStep('dates');
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
    if (step === 'dates') setStep('park');
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
                // Automatically advance to next step after selecting a park
                setStep('dates');
              }}
            />
            <SavedPlansView
              plans={savedPlans}
              onLoad={handleLoadPlan}
              onDelete={handleDeletePlan}
            />
          </>
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
            rides={rides}
            selectedRides={selectedRides}
            onToggle={toggleRide}
            onToggleLand={toggleLand}
            preferences={preferences}
            onPreferencesChange={setPreferences}
            ropeDropTargets={selectedDates
              .filter(sd => sd.ropeDropTarget)
              .map(sd => sd.ropeDropTarget as string)}
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
