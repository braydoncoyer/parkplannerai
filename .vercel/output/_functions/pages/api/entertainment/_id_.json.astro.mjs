import { P as PARK_ID_MAPPING } from '../../../chunks/parkHours_B2r3CuHe.mjs';
export { renderers } from '../../../renderers.mjs';

const FIREWORKS_KEYWORDS = [
  "fireworks",
  "happily ever after",
  "luminous",
  "wondrous journeys",
  "enchantment",
  "harmonious",
  "epcot forever",
  "illuminations",
  "remember... dreams come true",
  "wishes"
];
const WATER_SHOW_KEYWORDS = [
  "world of color",
  "fantasmic",
  "rivers of light",
  "fountains"
];
const PARADE_KEYWORDS = [
  "parade",
  "festival of fantasy",
  "magic happens",
  "boo to you",
  "once upon a christmastime",
  "electrical parade",
  "main street electrical",
  "paint the night",
  "spectromagic"
];
const CHARACTER_KEYWORDS = [
  "cavalcade",
  "character",
  "meet",
  "greeting"
];
const NIGHTTIME_KEYWORDS = [
  ...FIREWORKS_KEYWORDS,
  ...WATER_SHOW_KEYWORDS,
  "starlight",
  "cinematic celebration",
  "nighttime"
];
const MUST_SEE_ENTERTAINMENT = [
  "fantasmic",
  "world of color",
  "happily ever after",
  "luminous",
  "wondrous journeys",
  "festival of fantasy",
  "magic happens",
  "cinematic celebration",
  "enchantment"
];
function getEntertainmentCategory(name, showTimes) {
  const lowerName = name.toLowerCase();
  if (PARADE_KEYWORDS.some((keyword) => lowerName.includes(keyword))) {
    return "parade";
  }
  if (FIREWORKS_KEYWORDS.some((keyword) => lowerName.includes(keyword))) {
    return "fireworks";
  }
  if (WATER_SHOW_KEYWORDS.some((keyword) => lowerName.includes(keyword))) {
    return "water-show";
  }
  if (CHARACTER_KEYWORDS.some((keyword) => lowerName.includes(keyword))) {
    return "character";
  }
  if (showTimes.length > 0) {
    const allEvening = showTimes.every((st) => {
      const hour = new Date(st.startTime).getHours();
      return hour >= 19;
    });
    if (allEvening) {
      return "projection";
    }
  }
  if (lowerName.includes("show") || lowerName.includes("musical") || lowerName.includes("live")) {
    return "stage-show";
  }
  return "other";
}
function isNighttimeShow(name, showTimes) {
  const lowerName = name.toLowerCase();
  if (NIGHTTIME_KEYWORDS.some((keyword) => lowerName.includes(keyword))) {
    return true;
  }
  if (showTimes.length > 0) {
    const allEvening = showTimes.every((st) => {
      const hour = new Date(st.startTime).getHours();
      return hour >= 19;
    });
    if (allEvening) return true;
  }
  return false;
}
function isParade(name) {
  const lowerName = name.toLowerCase();
  return PARADE_KEYWORDS.some((keyword) => lowerName.includes(keyword));
}
function getEntertainmentPriority(name) {
  const lowerName = name.toLowerCase();
  if (MUST_SEE_ENTERTAINMENT.some((keyword) => lowerName.includes(keyword))) {
    return "must-see";
  }
  if (isNighttimeShow(name, []) || isParade(name)) {
    return "recommended";
  }
  return "optional";
}
function parseShowTimes(showtimes) {
  return showtimes.filter((st) => st.startTime).map((st) => ({
    startTime: st.startTime,
    endTime: st.endTime,
    type: st.type || "Performance"
  }));
}
async function fetchParkEntertainment(queueTimesId, targetDate) {
  const themeParkId = PARK_ID_MAPPING[queueTimesId];
  if (!themeParkId) {
    console.warn(`No ThemeParks.wiki mapping for park ID: ${queueTimesId}`);
    return null;
  }
  try {
    const response = await fetch(
      `https://api.themeparks.wiki/v1/entity/${themeParkId}/live`
    );
    if (!response.ok) {
      throw new Error(`ThemeParks.wiki API error: ${response.status}`);
    }
    const data = await response.json();
    const entertainmentItems = [];
    let nighttimeSpectacular = null;
    let parade = null;
    const dateToFind = targetDate ? targetDate.toISOString().split("T")[0] : (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    for (const item of data.liveData || []) {
      if (item.entityType !== "SHOW" || !item.showtimes?.length) continue;
      const relevantShowtimes = item.showtimes.filter((st) => {
        if (!st.startTime) return false;
        const showDate = st.startTime.split("T")[0];
        return showDate === dateToFind;
      });
      if (relevantShowtimes.length === 0) continue;
      const showTimes = parseShowTimes(relevantShowtimes);
      const isNighttime = isNighttimeShow(item.name, showTimes);
      const isParadeShow = isParade(item.name);
      const category = getEntertainmentCategory(item.name, showTimes);
      const entertainment = {
        id: item.id,
        name: item.name,
        entityType: item.entityType,
        status: item.status || "OPERATING",
        showTimes,
        isNighttime,
        isParade: isParadeShow,
        isFireworks: category === "fireworks",
        category,
        priority: getEntertainmentPriority(item.name)
      };
      entertainmentItems.push(entertainment);
      if (isNighttime && entertainment.priority === "must-see" && !nighttimeSpectacular) {
        nighttimeSpectacular = entertainment;
      }
      if (isParadeShow && entertainment.priority === "must-see" && !parade) {
        parade = entertainment;
      }
    }
    return {
      parkId: queueTimesId,
      parkName: getParkName(queueTimesId),
      date: dateToFind,
      entertainment: entertainmentItems,
      nighttimeSpectacular,
      parade
    };
  } catch (error) {
    console.error(`Error fetching entertainment for park ID ${queueTimesId}:`, error);
    return null;
  }
}
function getParkName(queueTimesId) {
  const names = {
    6: "Magic Kingdom",
    5: "EPCOT",
    7: "Disney's Hollywood Studios",
    8: "Disney's Animal Kingdom",
    16: "Disneyland",
    17: "Disney California Adventure",
    64: "Islands of Adventure",
    65: "Universal Studios Florida",
    334: "Epic Universe",
    66: "Universal Studios Hollywood"
  };
  return names[queueTimesId] || "Unknown Park";
}
function getDefaultEntertainment(queueTimesId) {
  const defaults = {
    // Magic Kingdom
    6: {
      nighttime: {
        name: "Happily Ever After",
        isNighttime: true,
        isFireworks: true,
        category: "fireworks",
        priority: "must-see",
        showTimes: [{ startTime: "21:00", type: "Performance" }]
        // 9 PM typical
      },
      parade: {
        name: "Festival of Fantasy Parade",
        isParade: true,
        category: "parade",
        priority: "must-see",
        showTimes: [{ startTime: "15:00", type: "Performance" }]
        // 3 PM typical
      }
    },
    // EPCOT
    5: {
      nighttime: {
        name: "Luminous",
        isNighttime: true,
        isFireworks: true,
        category: "fireworks",
        priority: "must-see",
        showTimes: [{ startTime: "21:00", type: "Performance" }]
      }
    },
    // Hollywood Studios
    7: {
      nighttime: {
        name: "Fantasmic!",
        isNighttime: true,
        isFireworks: false,
        category: "water-show",
        priority: "must-see",
        showTimes: [{ startTime: "20:00", type: "Performance" }, { startTime: "21:30", type: "Performance" }]
      }
    },
    // Animal Kingdom
    8: {
      // No regular nighttime spectacular currently
    },
    // Disneyland
    16: {
      nighttime: {
        name: "Wondrous Journeys",
        isNighttime: true,
        isFireworks: true,
        category: "fireworks",
        priority: "must-see",
        showTimes: [{ startTime: "21:30", type: "Performance" }]
      },
      parade: {
        name: "Magic Happens Parade",
        isParade: true,
        category: "parade",
        priority: "must-see",
        showTimes: [{ startTime: "17:30", type: "Performance" }]
        // 5:30 PM typical
      }
    },
    // DCA
    17: {
      nighttime: {
        name: "World of Color",
        isNighttime: true,
        isFireworks: false,
        category: "water-show",
        priority: "must-see",
        showTimes: [{ startTime: "21:00", type: "Performance" }]
      }
    }
  };
  return {
    parkId: queueTimesId,
    parkName: getParkName(queueTimesId),
    nighttimeSpectacular: defaults[queueTimesId]?.nighttime,
    parade: defaults[queueTimesId]?.parade
  };
}

const prerender = false;
const GET = async ({ params }) => {
  const { id } = params;
  if (!id) {
    return new Response(
      JSON.stringify({ error: "Park ID is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  try {
    const entertainment = await fetchParkEntertainment(Number(id), /* @__PURE__ */ new Date());
    if (entertainment) {
      return new Response(
        JSON.stringify(entertainment),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=1800"
            // Cache for 30 minutes
          }
        }
      );
    }
    const defaults = getDefaultEntertainment(Number(id));
    return new Response(
      JSON.stringify({
        parkId: Number(id),
        date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        entertainment: [],
        nighttimeSpectacular: defaults.nighttimeSpectacular || null,
        parade: defaults.parade || null
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=1800"
        }
      }
    );
  } catch (error) {
    console.error(`Error fetching entertainment for park ID ${id}:`, error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch entertainment data",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
