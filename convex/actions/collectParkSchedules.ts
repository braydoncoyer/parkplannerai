"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Mapping between Queue-Times park IDs and ThemeParks.wiki UUIDs
 */
const PARK_ID_MAPPING: Record<string, string> = {
  // Walt Disney World
  "6": "75ea578a-adc8-4116-a54d-dccb60765ef9", // Magic Kingdom
  "5": "47f90d2c-e191-4239-a466-5892ef59a88b", // EPCOT
  "7": "288747d1-8b4f-4a64-867e-ea7c9b27bad8", // Hollywood Studios
  "8": "1c84a229-8862-4648-9c71-378ddd2c7693", // Animal Kingdom
  // Disneyland Resort
  "16": "7340550b-c14d-4def-80bb-acdb51d49a66", // Disneyland
  "17": "832fcd51-ea19-4e77-85c7-75d5843b127c", // Disney California Adventure
  // Universal Orlando
  "64": "267615cc-8943-4c2a-ae2c-5da728ca591f", // Islands of Adventure
  "65": "eb3f4560-2383-4a36-9152-6b3e5ed6bc57", // Universal Studios Florida
  "334": "12dbb85b-265f-44e6-bccf-f1faa17211fc", // Epic Universe
  // Universal Hollywood
  "66": "bc4005c5-8c7e-41d7-b349-cdddf1796427", // Universal Studios Hollywood
};

interface ParkSchedule {
  date: string;
  openingTime: string;
  closingTime: string;
  type: string;
}

interface ThemeParksScheduleResponse {
  schedule: ParkSchedule[];
}

/**
 * Parse ISO timestamp to hour and minute
 * Extract time directly from ISO string to avoid timezone conversion
 */
function parseISOTime(isoString: string): { hour: number; minute: number } {
  const timeMatch = isoString.match(/T(\d{2}):(\d{2})/);

  if (timeMatch) {
    return {
      hour: parseInt(timeMatch[1], 10),
      minute: parseInt(timeMatch[2], 10),
    };
  }

  // Fallback
  const date = new Date(isoString);
  return {
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

/**
 * Fetch park schedule from ThemeParks.wiki API
 */
async function fetchParkSchedule(
  themeParkId: string,
  targetDate: string
): Promise<{ operating: ParkSchedule | null; extended: ParkSchedule | null }> {
  const response = await fetch(
    `https://api.themeparks.wiki/v1/entity/${themeParkId}/schedule`
  );

  if (!response.ok) {
    throw new Error(`ThemeParks.wiki API error: ${response.status}`);
  }

  const data: ThemeParksScheduleResponse = await response.json();

  const operatingSchedule = data.schedule.find(
    (s) => s.date === targetDate && s.type === "OPERATING"
  );

  const extendedSchedule = data.schedule.find(
    (s) => s.date === targetDate && s.type === "EXTRA_HOURS"
  );

  return {
    operating: operatingSchedule || null,
    extended: extendedSchedule || null,
  };
}

/**
 * Main park schedule collection action
 * Called by the daily cron job at 6 AM UTC
 */
export const run = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log(
      `[${new Date().toISOString()}] Starting park schedule collection...`
    );

    let schedulesCollected = 0;
    let errors = 0;

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    // Also fetch tomorrow and next few days
    const datesToFetch = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      datesToFetch.push(date.toISOString().split("T")[0]);
    }

    // Get all parks from the database
    const parksResult = await ctx.runQuery(internal.queries.parks.getAllParksInternal);

    for (const park of parksResult) {
      const themeParkId = PARK_ID_MAPPING[park.externalId];

      if (!themeParkId) {
        console.log(
          `  Skipping ${park.name} - no ThemeParks.wiki mapping`
        );
        continue;
      }

      for (const date of datesToFetch) {
        try {
          const { operating, extended } = await fetchParkSchedule(
            themeParkId,
            date
          );

          if (!operating) {
            console.log(
              `  No schedule found for ${park.name} on ${date}`
            );
            continue;
          }

          const openTime = parseISOTime(operating.openingTime);
          const closeTime = parseISOTime(operating.closingTime);

          await ctx.runMutation(internal.mutations.schedules.upsertParkSchedule, {
            parkId: park._id,
            externalParkId: park.externalId,
            date: date,
            openingTime: operating.openingTime,
            closingTime: operating.closingTime,
            openHour: openTime.hour,
            openMinute: openTime.minute,
            closeHour: closeTime.hour,
            closeMinute: closeTime.minute,
            hasExtendedHours: !!extended,
            extendedCloseHour: extended
              ? parseISOTime(extended.closingTime).hour
              : undefined,
            extendedCloseMinute: extended
              ? parseISOTime(extended.closingTime).minute
              : undefined,
            scheduleType: "OPERATING",
          });

          schedulesCollected++;
        } catch (error) {
          console.error(
            `  Error fetching schedule for ${park.name} on ${date}:`,
            error
          );
          errors++;
        }
      }
    }

    console.log(
      `[${new Date().toISOString()}] Park schedule collection complete!`
    );
    console.log(`Stats: ${schedulesCollected} schedules collected, ${errors} errors`);

    return {
      success: true,
      schedulesCollected,
      errors,
    };
  },
});
