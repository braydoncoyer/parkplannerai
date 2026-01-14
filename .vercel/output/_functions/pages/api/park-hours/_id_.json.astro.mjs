import { g as getParkHours } from '../../../chunks/parkHours_B2r3CuHe.mjs';
export { renderers } from '../../../renderers.mjs';

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
    const hours = await getParkHours(Number(id), /* @__PURE__ */ new Date());
    return new Response(
      JSON.stringify(hours),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600"
          // Cache for 1 hour
        }
      }
    );
  } catch (error) {
    console.error(`Error fetching park hours for ID ${id}:`, error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch park hours",
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
