const PARK_ID_MAPPING = {
  // Walt Disney World
  6: "75ea578a-adc8-4116-a54d-dccb60765ef9",
  // Magic Kingdom
  5: "47f90d2c-e191-4239-a466-5892ef59a88b",
  // EPCOT
  7: "288747d1-8b4f-4a64-867e-ea7c9b27bad8",
  // Hollywood Studios
  8: "1c84a229-8862-4648-9c71-378ddd2c7693",
  // Animal Kingdom
  // Disneyland Resort
  16: "7340550b-c14d-4def-80bb-acdb51d49a66",
  // Disneyland
  17: "832fcd51-ea19-4e77-85c7-75d5843b127c",
  // Disney California Adventure
  // Universal Orlando
  64: "267615cc-8943-4c2a-ae2c-5da728ca591f",
  // Islands of Adventure
  65: "eb3f4560-2383-4a36-9152-6b3e5ed6bc57",
  // Universal Studios Florida
  334: "12dbb85b-265f-44e6-bccf-f1faa17211fc",
  // Epic Universe
  // Universal Hollywood
  66: "bc4005c5-8c7e-41d7-b349-cdddf1796427"
  // Universal Studios Hollywood
};
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
function formatTimeDisplay(hour, minute) {
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const period = hour >= 12 ? "PM" : "AM";
  return `${h}:${minute.toString().padStart(2, "0")} ${period}`;
}
function parseISOTime(isoString) {
  const timeMatch = isoString.match(/T(\d{2}):(\d{2})/);
  if (timeMatch) {
    return {
      hour: parseInt(timeMatch[1], 10),
      minute: parseInt(timeMatch[2], 10)
    };
  }
  const date = new Date(isoString);
  return {
    hour: date.getHours(),
    minute: date.getMinutes()
  };
}
function getThemeParkWikiId(queueTimesId) {
  return PARK_ID_MAPPING[queueTimesId] || null;
}
async function fetchParkSchedule(queueTimesId, targetDate) {
  const themeParkId = getThemeParkWikiId(queueTimesId);
  if (!themeParkId) {
    console.warn(`No ThemeParks.wiki mapping for park ID: ${queueTimesId}`);
    return null;
  }
  try {
    const response = await fetch(
      `https://api.themeparks.wiki/v1/entity/${themeParkId}/schedule`
    );
    if (!response.ok) {
      throw new Error(`ThemeParks.wiki API error: ${response.status}`);
    }
    const data = await response.json();
    const dateToFind = targetDate ? targetDate.toISOString().split("T")[0] : (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const operatingSchedule = data.schedule.find(
      (s) => s.date === dateToFind && s.type === "OPERATING"
    );
    const extendedSchedule = data.schedule.find(
      (s) => s.date === dateToFind && s.type === "EXTRA_HOURS"
    );
    if (!operatingSchedule) {
      console.warn(`No operating schedule found for date: ${dateToFind}`);
      return null;
    }
    const openTime = parseISOTime(operatingSchedule.openingTime);
    const closeTime = parseISOTime(operatingSchedule.closingTime);
    const parkHours = {
      parkId: queueTimesId,
      parkName: getParkName(queueTimesId),
      date: dateToFind,
      timezone: PARK_TIMEZONES[queueTimesId] || "America/New_York",
      openHour: openTime.hour,
      openMinute: openTime.minute,
      closeHour: closeTime.hour,
      closeMinute: closeTime.minute,
      openingTimeFormatted: formatTimeDisplay(openTime.hour, openTime.minute),
      closingTimeFormatted: formatTimeDisplay(closeTime.hour, closeTime.minute),
      hasExtendedHours: !!extendedSchedule
    };
    if (extendedSchedule) {
      const extendedClose = parseISOTime(extendedSchedule.closingTime);
      parkHours.extendedCloseHour = extendedClose.hour;
      parkHours.extendedCloseMinute = extendedClose.minute;
    }
    return parkHours;
  } catch (error) {
    console.error(`Error fetching park schedule for ID ${queueTimesId}:`, error);
    return null;
  }
}
function getParkName(queueTimesId) {
  const names = {
    // Walt Disney World
    6: "Magic Kingdom",
    5: "EPCOT",
    7: "Disney's Hollywood Studios",
    8: "Disney's Animal Kingdom",
    // Disneyland Resort
    16: "Disneyland",
    17: "Disney California Adventure",
    // Universal Orlando
    64: "Islands of Adventure",
    65: "Universal Studios Florida",
    334: "Epic Universe",
    // Universal Hollywood
    66: "Universal Studios Hollywood"
  };
  return names[queueTimesId] || "Unknown Park";
}
function getDefaultParkHours(queueTimesId) {
  const isDisney = [5, 6, 7, 8, 16, 17].includes(queueTimesId);
  return {
    parkId: queueTimesId,
    parkName: getParkName(queueTimesId),
    date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    timezone: PARK_TIMEZONES[queueTimesId] || "America/New_York",
    openHour: 9,
    openMinute: 0,
    closeHour: isDisney ? 21 : 22,
    // Disney typically 9 PM, Universal 10 PM
    closeMinute: 0,
    openingTimeFormatted: "9:00 AM",
    closingTimeFormatted: isDisney ? "9:00 PM" : "10:00 PM",
    hasExtendedHours: false
  };
}
async function getParkHours(queueTimesId, targetDate) {
  const hours = await fetchParkSchedule(queueTimesId, targetDate);
  return hours || getDefaultParkHours(queueTimesId);
}

export { PARK_ID_MAPPING as P, PARK_TIMEZONES as a, fetchParkSchedule as f, getParkHours as g };
