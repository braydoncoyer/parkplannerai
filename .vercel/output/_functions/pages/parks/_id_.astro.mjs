import { e as createComponent, f as createAstro, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_zxR_juSk.mjs';
import 'piccolore';
import { $ as $$BaseLayout, a as $$Header } from '../../chunks/Header_BA_6JwJe.mjs';
import { jsx, jsxs } from 'react/jsx-runtime';
import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Compass, Moon, Users, Clock, MapPin, Calendar, BarChart3, Sparkles, Flag, Search, ChevronUp, ChevronDown, Star } from 'lucide-react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, Line } from 'recharts';
/* empty css                                   */
import { p as parkImagesData } from '../../chunks/parkImages_pBtv_KC9.mjs';
export { renderers } from '../../renderers.mjs';

const RESORT_CONFIGS = [
  {
    resortId: "disneyland-resort",
    resortName: "Disneyland Resort",
    parks: [
      { id: 16, name: "Disneyland", shortName: "DL" },
      { id: 17, name: "Disney California Adventure", shortName: "DCA" }
    ],
    transitionTime: 15
    // Walking distance between parks
  },
  {
    resortId: "walt-disney-world",
    resortName: "Walt Disney World",
    parks: [
      { id: 6, name: "Magic Kingdom", shortName: "MK" },
      { id: 5, name: "EPCOT", shortName: "EP" },
      { id: 7, name: "Hollywood Studios", shortName: "HS" },
      { id: 8, name: "Animal Kingdom", shortName: "AK" }
    ],
    transitionTime: 30
    // Bus/monorail travel between parks
  },
  {
    resortId: "universal-orlando",
    resortName: "Universal Orlando Resort",
    parks: [
      { id: 65, name: "Universal Studios Florida", shortName: "USF" },
      { id: 64, name: "Islands of Adventure", shortName: "IOA" },
      { id: 334, name: "Epic Universe", shortName: "EU" }
    ],
    transitionTime: 20
    // Walking/shuttle between parks
  },
  {
    resortId: "universal-hollywood",
    resortName: "Universal Hollywood",
    parks: [
      { id: 66, name: "Universal Studios Hollywood", shortName: "USH" }
    ],
    transitionTime: 0
    // Single park resort
  }
];
function getResortForPark(parkId) {
  return RESORT_CONFIGS.find(
    (resort) => resort.parks.some((park) => park.id === parkId)
  ) || null;
}
function supportsParkHopper(parkId) {
  const resort = getResortForPark(parkId);
  return resort !== null && resort.parks.length > 1;
}

const PARK_IMAGES = {};
for (const resortParks of Object.values(parkImagesData)) {
  for (const [parkId, parkData] of Object.entries(resortParks)) {
    const data = parkData;
    if (data.image) {
      PARK_IMAGES[Number(parkId)] = data.image;
    }
  }
}
const DEFAULT_IMAGE = "https://images.pexels.com/photos/8183994/pexels-photo-8183994.jpeg";
const CROWD_LABELS = {
  low: "Low Crowds",
  moderate: "Moderate",
  high: "Busy",
  "very-high": "Very Busy"
};
const HEADLINER_RIDES = [
  "rise of the resistance",
  "flight of passage",
  "guardians of the galaxy",
  "tron",
  "hagrid",
  "velocicoaster",
  "forbidden journey",
  "hagrid's",
  "radiator springs",
  "web slingers",
  "incredicoaster",
  "cosmic rewind",
  "expedition everest",
  "slinky dog",
  "rock 'n' roller",
  "tower of terror",
  "space mountain",
  "splash mountain",
  "big thunder",
  "pirates",
  "haunted mansion",
  "jungle cruise",
  "matterhorn",
  "indiana jones",
  "millennium falcon",
  "remy",
  "test track",
  "frozen ever after"
];
function getCrowdLevel(avgWaitTime) {
  if (avgWaitTime < 20) return "low";
  if (avgWaitTime < 40) return "moderate";
  if (avgWaitTime < 60) return "high";
  return "very-high";
}
function getWaitColor(waitTime) {
  if (waitTime < 20) return "green";
  if (waitTime < 40) return "amber";
  if (waitTime < 60) return "orange";
  return "red";
}
function isHeadliner(rideName) {
  const lower = rideName.toLowerCase();
  return HEADLINER_RIDES.some((h) => lower.includes(h));
}
function formatShowTime(isoString) {
  const timeMatch = isoString.match(/T(\d{2}):(\d{2})/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2];
    const period = hours >= 12 ? "PM" : "AM";
    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;
    return `${hours}:${minutes} ${period}`;
  }
  return isoString;
}
const PARK_TIMEZONES = {
  // Walt Disney World (Orlando) - Eastern
  5: "America/New_York",
  6: "America/New_York",
  7: "America/New_York",
  8: "America/New_York",
  // Universal Orlando - Eastern
  64: "America/New_York",
  65: "America/New_York",
  334: "America/New_York",
  // Disneyland Resort (Anaheim) - Pacific
  16: "America/Los_Angeles",
  17: "America/Los_Angeles",
  // Universal Hollywood - Pacific
  66: "America/Los_Angeles"
};
function isParkClosed(hours, parkId, ridesOpen) {
  const timezone = hours?.timezone || PARK_TIMEZONES[parkId] || "America/New_York";
  const now = /* @__PURE__ */ new Date();
  const parkTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  const currentHour = parkTime.getHours();
  const currentMinute = parkTime.getMinutes();
  const formatTime = (h, m) => {
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const period = h >= 12 ? "PM" : "AM";
    return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
  };
  const currentTimeFormatted = formatTime(currentHour, currentMinute);
  if (hours) {
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    const openTimeMinutes = hours.openHour * 60 + hours.openMinute;
    const closeTimeMinutes = hours.closeHour < hours.openHour ? (hours.closeHour + 24) * 60 + hours.closeMinute : hours.closeHour * 60 + hours.closeMinute;
    const isClosed = currentTimeMinutes < openTimeMinutes || currentTimeMinutes >= closeTimeMinutes;
    return {
      closed: isClosed,
      currentTime: currentTimeFormatted,
      opensAt: hours.openingTimeFormatted,
      timezone
    };
  }
  if (ridesOpen === 0) {
    return {
      closed: true,
      currentTime: currentTimeFormatted,
      opensAt: "9:00 AM",
      // Default opening time
      timezone
    };
  }
  return { closed: false, currentTime: "", opensAt: "", timezone };
}
function generateMockHistoricalData(avgWaitTime) {
  const hours = Array.from({ length: 14 }, (_, i) => 9 + i);
  const currentHour = (/* @__PURE__ */ new Date()).getHours();
  const hourlyPattern = [
    0.4,
    // 9am - low
    0.6,
    // 10am - building
    0.85,
    // 11am - busy
    1,
    // 12pm - peak
    0.95,
    // 1pm - peak
    0.8,
    // 2pm - moderate
    0.65,
    // 3pm - moderate
    0.55,
    // 4pm - lower
    0.7,
    // 5pm - building
    0.9,
    // 6pm - dinner rush
    1,
    // 7pm - peak
    0.85,
    // 8pm - busy
    0.6,
    // 9pm - winding down
    0.4
    // 10pm - low
  ];
  const today = hours.filter((h) => h <= currentHour).map((hour, i) => {
    const multiplier = hourlyPattern[i] || 0.5;
    const variation = (Math.random() - 0.5) * 10;
    const waitTime = Math.max(5, Math.round(avgWaitTime * multiplier + variation));
    return {
      hour,
      avgWaitTime: waitTime,
      crowdLevel: getCrowdLevel(waitTime)
    };
  });
  const lastWeekMultiplier = 0.85 + Math.random() * 0.3;
  const lastWeek = hours.map((hour, i) => {
    const multiplier = hourlyPattern[i] || 0.5;
    const variation = (Math.random() - 0.5) * 8;
    const waitTime = Math.max(5, Math.round(avgWaitTime * multiplier * lastWeekMultiplier + variation));
    return {
      hour,
      avgWaitTime: waitTime,
      crowdLevel: getCrowdLevel(waitTime)
    };
  });
  const lastMonthMultiplier = 0.7 + Math.random() * 0.5;
  const lastMonth = hours.map((hour, i) => {
    const multiplier = hourlyPattern[i] || 0.5;
    const variation = (Math.random() - 0.5) * 12;
    const waitTime = Math.max(5, Math.round(avgWaitTime * multiplier * lastMonthMultiplier + variation));
    return {
      hour,
      avgWaitTime: waitTime,
      crowdLevel: getCrowdLevel(waitTime)
    };
  });
  const lastYearMultiplier = 0.9 + Math.random() * 0.4;
  const lastYear = hours.map((hour, i) => {
    const multiplier = hourlyPattern[i] || 0.5;
    const variation = (Math.random() - 0.5) * 15;
    const waitTime = Math.max(5, Math.round(avgWaitTime * multiplier * lastYearMultiplier + variation));
    return {
      hour,
      avgWaitTime: waitTime,
      crowdLevel: getCrowdLevel(waitTime)
    };
  });
  return {
    today,
    lastWeek,
    lastMonth,
    lastYear,
    dataCollectionStarted: new Date(Date.now() - 365 * 24 * 60 * 60 * 1e3).toISOString(),
    daysUntilWeeklyData: 0
  };
}
function ParkHero({
  parkId,
  parkName,
  operator
}) {
  const imageUrl = PARK_IMAGES[parkId] || DEFAULT_IMAGE;
  const canParkHop = supportsParkHopper(parkId);
  const handleBack = () => {
    window.location.href = "/";
  };
  const handleCreatePlan = () => {
    window.location.href = `/plan?park=${parkId}`;
  };
  return /* @__PURE__ */ jsxs("div", { className: "pd-hero", children: [
    /* @__PURE__ */ jsx(
      "div",
      {
        className: "pd-hero-image",
        style: { backgroundImage: `url(${imageUrl})` }
      }
    ),
    /* @__PURE__ */ jsx("div", { className: "pd-hero-overlay" }),
    /* @__PURE__ */ jsxs("button", { onClick: handleBack, className: "pd-back-link", children: [
      /* @__PURE__ */ jsx(ArrowLeft, { size: 18 }),
      "Back"
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "pd-hero-content", children: [
      /* @__PURE__ */ jsxs("div", { className: "pd-hero-badges", children: [
        /* @__PURE__ */ jsx("span", { className: "pd-operator-badge", children: operator }),
        /* @__PURE__ */ jsxs("span", { className: "pd-live-badge", children: [
          /* @__PURE__ */ jsx("span", { className: "pd-live-dot" }),
          "Live Data"
        ] })
      ] }),
      /* @__PURE__ */ jsx("h1", { className: "pd-hero-title", children: parkName }),
      canParkHop && /* @__PURE__ */ jsxs("button", { onClick: handleCreatePlan, className: "pd-create-plan-btn", children: [
        /* @__PURE__ */ jsx("span", { className: "pd-plan-btn-icon", children: /* @__PURE__ */ jsx(Compass, { size: 18 }) }),
        /* @__PURE__ */ jsxs("span", { className: "pd-plan-btn-text", children: [
          /* @__PURE__ */ jsx("span", { className: "pd-plan-btn-label", children: "Create Your Day" }),
          /* @__PURE__ */ jsxs("span", { className: "pd-plan-btn-sublabel", children: [
            "Start planning from ",
            parkName.split(" ")[0]
          ] })
        ] })
      ] })
    ] })
  ] });
}
function ParkClosedBanner({
  currentTime,
  opensAt,
  timezone
}) {
  const getTimezoneAbbr = (tz) => {
    if (tz.includes("New_York")) return "ET";
    if (tz.includes("Los_Angeles")) return "PT";
    if (tz.includes("Chicago")) return "CT";
    return tz.split("/")[1]?.replace("_", " ") || tz;
  };
  return /* @__PURE__ */ jsxs("div", { className: "pd-closed-banner", children: [
    /* @__PURE__ */ jsx("div", { className: "pd-closed-icon", children: /* @__PURE__ */ jsx(Moon, { size: 24 }) }),
    /* @__PURE__ */ jsxs("div", { className: "pd-closed-content", children: [
      /* @__PURE__ */ jsx("h3", { className: "pd-closed-title", children: "Park Currently Closed" }),
      /* @__PURE__ */ jsxs("p", { className: "pd-closed-text", children: [
        "It's ",
        currentTime,
        " ",
        getTimezoneAbbr(timezone),
        " at the park. Opens at ",
        opensAt,
        "."
      ] })
    ] })
  ] });
}
function QuickStats({
  stats,
  hours,
  crowdLevel
}) {
  const ridesOpenPercent = stats.totalRides > 0 ? Math.round(stats.ridesOpen / stats.totalRides * 100) : 0;
  return /* @__PURE__ */ jsxs("div", { className: "pd-stats-grid", children: [
    /* @__PURE__ */ jsxs("div", { className: `pd-stat-card crowd-${crowdLevel}`, children: [
      /* @__PURE__ */ jsxs("div", { className: "pd-stat-header", children: [
        /* @__PURE__ */ jsx("div", { className: "pd-stat-icon", children: /* @__PURE__ */ jsx(Users, { size: 18 }) }),
        /* @__PURE__ */ jsx("span", { className: "pd-stat-label", children: "Crowd Level" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "pd-stat-value", children: CROWD_LABELS[crowdLevel] }),
      /* @__PURE__ */ jsx("div", { className: "pd-stat-sublabel", children: "Based on current wait times" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "pd-stat-card", children: [
      /* @__PURE__ */ jsxs("div", { className: "pd-stat-header", children: [
        /* @__PURE__ */ jsx("div", { className: "pd-stat-icon", children: /* @__PURE__ */ jsx(Clock, { size: 18 }) }),
        /* @__PURE__ */ jsx("span", { className: "pd-stat-label", children: "Avg Wait" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "pd-stat-value", children: [
        stats.avgWaitTime,
        " min"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "pd-stat-sublabel", children: [
        "Peak: ",
        stats.maxWaitTime,
        " min"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "pd-stat-card", children: [
      /* @__PURE__ */ jsxs("div", { className: "pd-stat-header", children: [
        /* @__PURE__ */ jsx("div", { className: "pd-stat-icon", children: /* @__PURE__ */ jsx(MapPin, { size: 18 }) }),
        /* @__PURE__ */ jsx("span", { className: "pd-stat-label", children: "Rides Open" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "pd-stat-value", children: [
        stats.ridesOpen,
        " / ",
        stats.totalRides
      ] }),
      /* @__PURE__ */ jsx("div", { className: "pd-stat-progress", children: /* @__PURE__ */ jsx(
        "div",
        {
          className: "pd-stat-progress-bar",
          style: { width: `${ridesOpenPercent}%` }
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "pd-stat-card", children: [
      /* @__PURE__ */ jsxs("div", { className: "pd-stat-header", children: [
        /* @__PURE__ */ jsx("div", { className: "pd-stat-icon", children: /* @__PURE__ */ jsx(Calendar, { size: 18 }) }),
        /* @__PURE__ */ jsx("span", { className: "pd-stat-label", children: "Park Hours" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "pd-stat-value", children: hours?.openingTimeFormatted || "9:00 AM" }),
      /* @__PURE__ */ jsxs("div", { className: "pd-stat-sublabel", children: [
        "Closes ",
        hours?.closingTimeFormatted || "9:00 PM"
      ] })
    ] })
  ] });
}
function CrowdTimeline({
  historicalData
}) {
  const [visibleLines, setVisibleLines] = useState({
    today: true,
    lastWeek: true,
    lastMonth: true,
    lastYear: true
  });
  const currentHour = (/* @__PURE__ */ new Date()).getHours();
  const hasHistoricalData = historicalData && (historicalData.lastWeek || historicalData.lastMonth || historicalData.lastYear);
  const toggleLine = (line) => {
    setVisibleLines((prev) => ({ ...prev, [line]: !prev[line] }));
  };
  if (!hasHistoricalData) {
    const daysRemaining = historicalData?.daysUntilWeeklyData ?? 7;
    const progressPercent = Math.max(0, (7 - daysRemaining) / 7 * 100);
    return /* @__PURE__ */ jsxs("div", { className: "pd-timeline-section pd-section", children: [
      /* @__PURE__ */ jsx("div", { className: "pd-timeline-header", children: /* @__PURE__ */ jsx("h2", { className: "pd-timeline-title", children: "Crowd Comparison" }) }),
      /* @__PURE__ */ jsxs("div", { className: "pd-timeline-empty", children: [
        /* @__PURE__ */ jsx(BarChart3, { className: "pd-timeline-empty-icon", size: 48 }),
        /* @__PURE__ */ jsx("h3", { className: "pd-timeline-empty-title", children: "Collecting Historical Data" }),
        /* @__PURE__ */ jsx("p", { className: "pd-timeline-empty-text", children: "We're gathering crowd patterns for this park. Check back soon for comparisons to last week, month, and year." }),
        /* @__PURE__ */ jsxs("div", { className: "pd-timeline-empty-progress", children: [
          /* @__PURE__ */ jsx("div", { className: "pd-timeline-empty-progress-bar", children: /* @__PURE__ */ jsx(
            "div",
            {
              className: "pd-timeline-empty-progress-fill",
              style: { width: `${progressPercent}%` }
            }
          ) }),
          /* @__PURE__ */ jsxs("span", { className: "pd-timeline-empty-progress-text", children: [
            daysRemaining,
            " days until weekly data"
          ] })
        ] })
      ] })
    ] });
  }
  const hours = Array.from({ length: 14 }, (_, i) => 9 + i);
  const chartData = hours.map((hour) => {
    const formatHour = (h) => h > 12 ? `${h - 12}pm` : h === 12 ? "12pm" : `${h}am`;
    const todayPoint = historicalData?.today?.find((d) => d.hour === hour);
    const lastWeekPoint = historicalData?.lastWeek?.find((d) => d.hour === hour);
    const lastMonthPoint = historicalData?.lastMonth?.find((d) => d.hour === hour);
    const lastYearPoint = historicalData?.lastYear?.find((d) => d.hour === hour);
    return {
      hour,
      label: formatHour(hour),
      today: todayPoint?.avgWaitTime ?? null,
      lastWeek: lastWeekPoint?.avgWaitTime ?? null,
      lastMonth: lastMonthPoint?.avgWaitTime ?? null,
      lastYear: lastYearPoint?.avgWaitTime ?? null
    };
  });
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return /* @__PURE__ */ jsxs("div", { className: "pd-chart-tooltip", children: [
      /* @__PURE__ */ jsx("p", { className: "pd-chart-tooltip-label", children: label }),
      payload.map((entry, i) => entry.value !== null && /* @__PURE__ */ jsxs("p", { style: { color: entry.color }, className: "pd-chart-tooltip-value", children: [
        entry.name,
        ": ",
        entry.value,
        " min"
      ] }, i))
    ] });
  };
  return /* @__PURE__ */ jsxs("div", { className: "pd-timeline-section pd-section", children: [
    /* @__PURE__ */ jsxs("div", { className: "pd-timeline-header", children: [
      /* @__PURE__ */ jsx("h2", { className: "pd-timeline-title", children: "Crowd Comparison" }),
      /* @__PURE__ */ jsxs("div", { className: "pd-timeline-legend", children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            className: `pd-legend-item ${!visibleLines.today ? "disabled" : ""}`,
            onClick: () => toggleLine("today"),
            children: [
              /* @__PURE__ */ jsx("span", { className: "pd-legend-line today" }),
              "Today"
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            className: `pd-legend-item ${!visibleLines.lastWeek ? "disabled" : ""}`,
            onClick: () => toggleLine("lastWeek"),
            children: [
              /* @__PURE__ */ jsx("span", { className: "pd-legend-line last-week" }),
              "Last Week"
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            className: `pd-legend-item ${!visibleLines.lastMonth ? "disabled" : ""}`,
            onClick: () => toggleLine("lastMonth"),
            children: [
              /* @__PURE__ */ jsx("span", { className: "pd-legend-line last-month" }),
              "Last Month"
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            className: `pd-legend-item ${!visibleLines.lastYear ? "disabled" : ""}`,
            onClick: () => toggleLine("lastYear"),
            children: [
              /* @__PURE__ */ jsx("span", { className: "pd-legend-line last-year" }),
              "Last Year"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "pd-timeline-chart", children: /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 220, children: /* @__PURE__ */ jsxs(LineChart, { data: chartData, margin: { top: 20, right: 20, bottom: 20, left: 0 }, children: [
      /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e2e8f0", vertical: false }),
      /* @__PURE__ */ jsx(
        XAxis,
        {
          dataKey: "label",
          axisLine: false,
          tickLine: false,
          tick: { fill: "#94a3b8", fontSize: 12 },
          interval: 1
        }
      ),
      /* @__PURE__ */ jsx(
        YAxis,
        {
          axisLine: false,
          tickLine: false,
          tick: { fill: "#94a3b8", fontSize: 12 },
          tickFormatter: (val) => `${val}m`,
          domain: [0, "auto"],
          width: 40
        }
      ),
      /* @__PURE__ */ jsx(Tooltip, { content: /* @__PURE__ */ jsx(CustomTooltip, {}) }),
      currentHour >= 9 && currentHour <= 22 && /* @__PURE__ */ jsx(
        ReferenceLine,
        {
          x: currentHour > 12 ? `${currentHour - 12}pm` : currentHour === 12 ? "12pm" : `${currentHour}am`,
          stroke: "#c2410c",
          strokeDasharray: "4 4",
          label: { value: "Now", position: "top", fill: "#c2410c", fontSize: 11 }
        }
      ),
      visibleLines.lastYear && /* @__PURE__ */ jsx(
        Line,
        {
          type: "monotone",
          dataKey: "lastYear",
          name: "Last Year",
          stroke: "#e2e8f0",
          strokeWidth: 2,
          strokeDasharray: "2 4",
          dot: false,
          connectNulls: true
        }
      ),
      visibleLines.lastMonth && /* @__PURE__ */ jsx(
        Line,
        {
          type: "monotone",
          dataKey: "lastMonth",
          name: "Last Month",
          stroke: "#cbd5e1",
          strokeWidth: 2,
          strokeDasharray: "4 4",
          dot: false,
          connectNulls: true
        }
      ),
      visibleLines.lastWeek && /* @__PURE__ */ jsx(
        Line,
        {
          type: "monotone",
          dataKey: "lastWeek",
          name: "Last Week",
          stroke: "#94a3b8",
          strokeWidth: 2,
          strokeDasharray: "6 3",
          dot: false,
          connectNulls: true
        }
      ),
      visibleLines.today && /* @__PURE__ */ jsx(
        Line,
        {
          type: "monotone",
          dataKey: "today",
          name: "Today",
          stroke: "#c2410c",
          strokeWidth: 3,
          dot: { fill: "#c2410c", strokeWidth: 0, r: 3 },
          activeDot: { r: 5, fill: "#c2410c" },
          connectNulls: true
        }
      )
    ] }) }) })
  ] });
}
function EntertainmentHighlights({
  entertainment
}) {
  if (!entertainment) return null;
  const { nighttimeSpectacular, parade } = entertainment;
  if (!nighttimeSpectacular && !parade) return null;
  return /* @__PURE__ */ jsxs("div", { className: "pd-section", children: [
    /* @__PURE__ */ jsx("h2", { className: "pd-section-title", children: "Entertainment Highlights" }),
    /* @__PURE__ */ jsxs("div", { className: "pd-entertainment-grid", children: [
      nighttimeSpectacular && /* @__PURE__ */ jsxs("div", { className: "pd-entertainment-card", children: [
        /* @__PURE__ */ jsxs("div", { className: "pd-entertainment-header", children: [
          /* @__PURE__ */ jsx("div", { className: "pd-entertainment-icon", children: /* @__PURE__ */ jsx(Sparkles, { size: 20 }) }),
          /* @__PURE__ */ jsxs("div", { className: "pd-entertainment-info", children: [
            /* @__PURE__ */ jsx("span", { className: "pd-entertainment-type", children: nighttimeSpectacular.isFireworks ? "Fireworks" : "Nighttime Show" }),
            /* @__PURE__ */ jsx("h3", { className: "pd-entertainment-name", children: nighttimeSpectacular.name })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "pd-entertainment-times", children: nighttimeSpectacular.showTimes.slice(0, 3).map((st, i) => /* @__PURE__ */ jsxs(
          "span",
          {
            className: `pd-entertainment-time ${i === 0 ? "next" : ""}`,
            children: [
              formatShowTime(st.startTime),
              i === 0 && /* @__PURE__ */ jsx("span", { className: "pd-today-badge", children: "Next" })
            ]
          },
          i
        )) })
      ] }),
      parade && /* @__PURE__ */ jsxs("div", { className: "pd-entertainment-card", children: [
        /* @__PURE__ */ jsxs("div", { className: "pd-entertainment-header", children: [
          /* @__PURE__ */ jsx("div", { className: "pd-entertainment-icon", children: /* @__PURE__ */ jsx(Flag, { size: 20 }) }),
          /* @__PURE__ */ jsxs("div", { className: "pd-entertainment-info", children: [
            /* @__PURE__ */ jsx("span", { className: "pd-entertainment-type", children: "Parade" }),
            /* @__PURE__ */ jsx("h3", { className: "pd-entertainment-name", children: parade.name })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "pd-entertainment-times", children: parade.showTimes.slice(0, 3).map((st, i) => /* @__PURE__ */ jsxs(
          "span",
          {
            className: `pd-entertainment-time ${i === 0 ? "next" : ""}`,
            children: [
              formatShowTime(st.startTime),
              i === 0 && /* @__PURE__ */ jsx("span", { className: "pd-today-badge", children: "Next" })
            ]
          },
          i
        )) })
      ] })
    ] })
  ] });
}
function RideCard({ ride }) {
  const headliner = isHeadliner(ride.name);
  const waitColor = ride.waitTime !== null ? getWaitColor(ride.waitTime) : null;
  return /* @__PURE__ */ jsxs("div", { className: "pd-ride-card", children: [
    /* @__PURE__ */ jsx("div", { className: "pd-ride-info", children: /* @__PURE__ */ jsxs("h4", { className: "pd-ride-name", children: [
      ride.name,
      headliner && /* @__PURE__ */ jsxs("span", { className: "pd-headliner-badge", children: [
        /* @__PURE__ */ jsx(Star, { size: 10 }),
        "Headliner"
      ] })
    ] }) }),
    ride.status === "open" && ride.waitTime !== null ? /* @__PURE__ */ jsxs("span", { className: `pd-ride-wait ${waitColor}`, children: [
      ride.waitTime,
      " min"
    ] }) : /* @__PURE__ */ jsx("span", { className: "pd-ride-wait closed", children: ride.status === "down" ? "Down" : "Closed" })
  ] });
}
function LandGroup({
  landName,
  rides,
  defaultExpanded = true
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const openCount = rides.filter((r) => r.status === "open").length;
  return /* @__PURE__ */ jsxs("div", { className: `pd-land-group ${!expanded ? "collapsed" : ""}`, children: [
    /* @__PURE__ */ jsxs(
      "button",
      {
        className: "pd-land-header",
        onClick: () => setExpanded(!expanded),
        children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h3", { className: "pd-land-name", children: landName }),
            /* @__PURE__ */ jsxs("span", { className: "pd-land-count", children: [
              openCount,
              " of ",
              rides.length,
              " open"
            ] })
          ] }),
          /* @__PURE__ */ jsx("span", { className: "pd-land-toggle", children: expanded ? /* @__PURE__ */ jsx(ChevronUp, { size: 20 }) : /* @__PURE__ */ jsx(ChevronDown, { size: 20 }) })
        ]
      }
    ),
    /* @__PURE__ */ jsx("div", { className: "pd-land-rides", children: rides.map((ride) => /* @__PURE__ */ jsx(RideCard, { ride }, ride.id)) })
  ] });
}
function LiveWaitTimes({ rides, lands }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("wait-desc");
  const [statusFilter, setStatusFilter] = useState("all");
  const filteredRides = useMemo(() => {
    let result = [...rides];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) => r.name.toLowerCase().includes(query) || r.land.toLowerCase().includes(query)
      );
    }
    if (statusFilter === "open") {
      result = result.filter((r) => r.status === "open");
    } else if (statusFilter === "closed") {
      result = result.filter((r) => r.status !== "open");
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case "wait-desc":
          return (b.waitTime || 0) - (a.waitTime || 0);
        case "wait-asc":
          return (a.waitTime || 0) - (b.waitTime || 0);
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });
    return result;
  }, [rides, searchQuery, sortBy, statusFilter]);
  const ridesByLand = useMemo(() => {
    const grouped = {};
    for (const land of lands) {
      grouped[land.name] = filteredRides.filter((r) => r.land === land.name);
    }
    return grouped;
  }, [filteredRides, lands]);
  const openCount = rides.filter((r) => r.status === "open").length;
  const closedCount = rides.length - openCount;
  return /* @__PURE__ */ jsxs("div", { className: "pd-waits-section pd-section", children: [
    /* @__PURE__ */ jsxs("div", { className: "pd-waits-header", children: [
      /* @__PURE__ */ jsx("h2", { className: "pd-waits-title", children: "Live Wait Times" }),
      /* @__PURE__ */ jsxs("div", { className: "pd-filter-bar", children: [
        /* @__PURE__ */ jsxs("div", { className: "pd-search-wrapper", children: [
          /* @__PURE__ */ jsx(Search, { size: 18, className: "pd-search-icon" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              className: "pd-search-input",
              placeholder: "Search rides...",
              value: searchQuery,
              onChange: (e) => setSearchQuery(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs(
          "select",
          {
            className: "pd-sort-select",
            value: sortBy,
            onChange: (e) => setSortBy(e.target.value),
            children: [
              /* @__PURE__ */ jsx("option", { value: "wait-desc", children: "Longest Wait" }),
              /* @__PURE__ */ jsx("option", { value: "wait-asc", children: "Shortest Wait" }),
              /* @__PURE__ */ jsx("option", { value: "name-asc", children: "Name A-Z" }),
              /* @__PURE__ */ jsx("option", { value: "name-desc", children: "Name Z-A" })
            ]
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "pd-status-tabs", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              className: `pd-status-tab ${statusFilter === "all" ? "active" : ""}`,
              onClick: () => setStatusFilter("all"),
              children: "All"
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              className: `pd-status-tab ${statusFilter === "open" ? "active" : ""}`,
              onClick: () => setStatusFilter("open"),
              children: [
                "Open (",
                openCount,
                ")"
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              className: `pd-status-tab ${statusFilter === "closed" ? "active" : ""}`,
              onClick: () => setStatusFilter("closed"),
              children: [
                "Closed (",
                closedCount,
                ")"
              ]
            }
          )
        ] })
      ] })
    ] }),
    lands.map((land) => {
      const landRides = ridesByLand[land.name];
      if (!landRides || landRides.length === 0) return null;
      return /* @__PURE__ */ jsx(
        LandGroup,
        {
          landName: land.name,
          rides: landRides,
          defaultExpanded: true
        },
        land.name
      );
    }),
    filteredRides.length === 0 && /* @__PURE__ */ jsx("div", { style: { padding: "40px", textAlign: "center", color: "#94a3b8" }, children: "No rides found matching your search." })
  ] });
}
function WaitTimeDistribution({ rides }) {
  const openRides = rides.filter((r) => r.status === "open" && r.waitTime !== null);
  const buckets = [
    { label: "< 20 min", color: "green", count: 0 },
    { label: "20-40", color: "amber", count: 0 },
    { label: "40-60", color: "orange", count: 0 },
    { label: "60+ min", color: "red", count: 0 }
  ];
  for (const ride of openRides) {
    const wait = ride.waitTime || 0;
    if (wait < 20) buckets[0].count++;
    else if (wait < 40) buckets[1].count++;
    else if (wait < 60) buckets[2].count++;
    else buckets[3].count++;
  }
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);
  return /* @__PURE__ */ jsxs("div", { className: "pd-distribution-section pd-section", children: [
    /* @__PURE__ */ jsx("h2", { className: "pd-distribution-title", children: "Wait Time Distribution" }),
    /* @__PURE__ */ jsx("div", { className: "pd-distribution-chart", children: buckets.map((bucket, i) => /* @__PURE__ */ jsxs("div", { className: "pd-distribution-bar", children: [
      /* @__PURE__ */ jsx("span", { className: "pd-distribution-count", children: bucket.count }),
      /* @__PURE__ */ jsx(
        "div",
        {
          className: `pd-distribution-bar-fill ${bucket.color}`,
          style: { height: `${bucket.count / maxCount * 100}%` }
        }
      ),
      /* @__PURE__ */ jsx("span", { className: "pd-distribution-label", children: bucket.label })
    ] }, i)) })
  ] });
}
function LoadingSkeleton() {
  return /* @__PURE__ */ jsxs("div", { className: "pd-container", children: [
    /* @__PURE__ */ jsx("div", { className: "pd-skeleton pd-skeleton-hero" }),
    /* @__PURE__ */ jsxs("div", { className: "pd-content", children: [
      /* @__PURE__ */ jsx("div", { className: "pd-stats-grid", children: [1, 2, 3, 4].map((i) => /* @__PURE__ */ jsx("div", { className: "pd-skeleton pd-skeleton-stat" }, i)) }),
      /* @__PURE__ */ jsx("div", { className: "pd-waits-section", children: [1, 2, 3, 4, 5, 6].map((i) => /* @__PURE__ */ jsx("div", { className: "pd-skeleton pd-skeleton-ride" }, i)) })
    ] })
  ] });
}
function ParkDetailPage({
  parkId,
  parkName,
  operator
}) {
  const [data, setData] = useState(null);
  const [hours, setHours] = useState(null);
  const [entertainment, setEntertainment] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const [parkResponse, hoursResponse, entertainmentResponse] = await Promise.all([
          fetch(`/api/parks/${parkId}.json`),
          fetch(`/api/park-hours/${parkId}.json`).catch(() => null),
          fetch(`/api/entertainment/${parkId}.json`).catch(() => null)
        ]);
        if (!parkResponse.ok) {
          throw new Error("Failed to fetch park data");
        }
        const parkData = await parkResponse.json();
        setData(parkData);
        if (hoursResponse?.ok) {
          const hoursData = await hoursResponse.json();
          setHours(hoursData);
        }
        if (entertainmentResponse?.ok) {
          const entertainmentData = await entertainmentResponse.json();
          setEntertainment(entertainmentData);
        }
        const mockHistorical = generateMockHistoricalData(parkData.stats.avgWaitTime);
        setHistoricalData(mockHistorical);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
    const interval = setInterval(fetchAll, 5 * 60 * 1e3);
    return () => clearInterval(interval);
  }, [parkId]);
  if (loading) {
    return /* @__PURE__ */ jsx(LoadingSkeleton, {});
  }
  if (error || !data) {
    return /* @__PURE__ */ jsx("div", { className: "pd-container", children: /* @__PURE__ */ jsxs("div", { className: "pd-content", style: { textAlign: "center", padding: "80px 20px" }, children: [
      /* @__PURE__ */ jsx("h2", { style: { marginBottom: "16px", color: "#1e293b" }, children: "Unable to load park data" }),
      /* @__PURE__ */ jsx("p", { style: { color: "#64748b", marginBottom: "24px" }, children: error }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => window.location.reload(),
          style: {
            padding: "12px 24px",
            background: "#c2410c",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontWeight: "600",
            cursor: "pointer"
          },
          children: "Try Again"
        }
      )
    ] }) });
  }
  const crowdLevel = getCrowdLevel(data.stats.avgWaitTime);
  const parkClosedStatus = isParkClosed(hours, Number(parkId), data.stats.ridesOpen);
  return /* @__PURE__ */ jsxs("div", { className: "pd-container", children: [
    /* @__PURE__ */ jsx(
      ParkHero,
      {
        parkId: Number(parkId),
        parkName,
        operator
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "pd-content", children: [
      parkClosedStatus.closed && /* @__PURE__ */ jsx(
        ParkClosedBanner,
        {
          currentTime: parkClosedStatus.currentTime,
          opensAt: parkClosedStatus.opensAt,
          timezone: parkClosedStatus.timezone
        }
      ),
      /* @__PURE__ */ jsx(
        QuickStats,
        {
          stats: data.stats,
          hours,
          crowdLevel
        }
      ),
      /* @__PURE__ */ jsx(CrowdTimeline, { historicalData }),
      /* @__PURE__ */ jsx(EntertainmentHighlights, { entertainment }),
      /* @__PURE__ */ jsx(LiveWaitTimes, { rides: data.rides, lands: data.lands }),
      /* @__PURE__ */ jsx(WaitTimeDistribution, { rides: data.rides })
    ] })
  ] });
}

const $$Astro = createAstro();
const prerender = false;
const $$id = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$id;
  const { id } = Astro2.params;
  const parksResponse = await fetch(`https://queue-times.com/parks.json`);
  const parksData = await parksResponse.json();
  let parkName = "Theme Park";
  let parkOperator = "";
  for (const group of parksData) {
    const park = group.parks?.find((p) => p.id === Number(id));
    if (park) {
      parkName = park.name;
      parkOperator = group.name.includes("Disney") ? "Disney" : "Universal";
      break;
    }
  }
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": `${parkName} | Live Wait Times` }, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "Header", $$Header, {})} ${maybeRenderHead()}<main> ${renderComponent($$result2, "ParkDetailPage", ParkDetailPage, { "parkId": id, "parkName": parkName, "operator": parkOperator, "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/braydoncoyer/Development/personal/theme-park-analytics/src/components/park-detail/ParkDetailPage", "client:component-export": "default" })} </main> ` })} `;
}, "/Users/braydoncoyer/Development/personal/theme-park-analytics/src/pages/parks/[id].astro", void 0);

const $$file = "/Users/braydoncoyer/Development/personal/theme-park-analytics/src/pages/parks/[id].astro";
const $$url = "/parks/[id]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$id,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
