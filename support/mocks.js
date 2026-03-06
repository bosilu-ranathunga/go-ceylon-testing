"use strict";
/**
 * support/mocks.js
 * ─────────────────────────────────────────────────────────────────────────────
 * MOCKING / STUBBING
 *
 * Centralises all stub data and Playwright route intercepts so step
 * definitions stay readable and mock values are consistent across scenarios.
 *
 * Exports:
 *   MOCK_*          — deterministic fixture objects used as API stubs
 *   setupApiMocks() — attaches route intercepts to a Playwright Page
 *   stubBookingStatus() — override a single booking's status mid-scenario
 * ─────────────────────────────────────────────────────────────────────────────
 */


// ── Environment ──────────────────────────────────────────────────────────────
const BASE_URL =
  process.env.BASE_URL || "https://go-ceylon-frontend.vercel.app";

/**
 * Build a properly-structured (but unsigned) JWT that the browser app can
 * decode without errors.
 *
 * The frontend decodes the payload with:
 *   JSON.parse(atob(token.split('.')[1]))
 *
 * atob() requires STANDARD base64 (uses + / =), NOT the URL-safe variant
 * (which uses - _).  So we use Buffer.toString('base64') and strip padding.
 *
 * The backend JWT payload shape (from authController.js):
 *   { id, email, userType }
 * The frontend reads `decoded.id` for the user/guide ID.
 *
 * @param {object} payload
 * @returns {string}  header.payload.sig
 */
function makeJwt(payload) {
  const header = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"; // {"alg":"HS256","typ":"JWT"}
  // Standard base64 (atob-compatible), no padding characters.
  const payloadB64 = Buffer.from(JSON.stringify(payload))
    .toString("base64")
    .replace(/=/g, "");
  // Signature is never verified in the browser; use a short placeholder.
  return `${header}.${payloadB64}.MOCKSIG`;
}

const MOCK_TRAVELER_TOKEN =
  process.env.TRAVELER_TOKEN ||
  makeJwt({
    id: "mock_user_001",
    email: "traveler@test.com",
    userType: "tourist",
  });

const MOCK_GUIDE_TOKEN =
  process.env.GUIDE_TOKEN ||
  makeJwt({ id: "mock_guide_001", email: "guide@test.com", userType: "guide" });

// ── Fixture Data ─────────────────────────────────────────────────────────────

const MOCK_LOCATION = {
  _id: "674abc123def456789012345",
  name: "Sigiriya",
  district: "Matale",
};

const MOCK_GUIDE = {
  _id: "mock_guide_001",
  g_name: "Kamal Perera",
  language: ["English", "Sinhala"],
  price: 2500,
  availability: true,
  // location must be an array of populated objects — Booking.jsx calls .map(loc => loc.name)
  location: [{ _id: MOCK_LOCATION._id, name: MOCK_LOCATION.name }],
  g_dob: "1990-01-01",
  gender: "Male",
  rating: 4.7,
  reviews: 42,
  image: "", // required by Booking.jsx to avoid undefined read
  profileImage: "",
};

const MOCK_GUIDE_2 = {
  _id: "mock_guide_002",
  g_name: "Nimal Silva",
  language: ["English", "Tamil"],
  price: 2000,
  availability: true,
  location: [{ _id: MOCK_LOCATION._id, name: MOCK_LOCATION.name }],
  g_dob: "1988-05-15",
  gender: "Male",
  rating: 4.5,
  reviews: 28,
  image: "",
  profileImage: "",
};

const MOCK_GUIDE_LIST = [MOCK_GUIDE, MOCK_GUIDE_2];

const MOCK_USER = {
  _id: "mock_user_001",
  name: "Test Traveler",
  email: "traveler@test.com",
  phone: "0771234567",
};

/**
 * Base booking shape — field names match what the frontend components read:
 *   guideId.g_name / guideId.image (BookingHistory, BookingInfo)
 *   userId.name / userId.phone     (guide/BookingHistory, guide/BookingInfo)
 *   locationId.name                (all booking views)
 *   bookingStatus                  (status badge)
 *   startAt                        (date/time timestamp)
 */
const MOCK_BOOKING = {
  _id: "mock_booking_001",
  guideId: {
    _id: MOCK_GUIDE._id,
    g_name: MOCK_GUIDE.g_name,
    language: MOCK_GUIDE.language, // needed by traveler BookingInfo: language.join()
    contact_number: "0771234567", // needed by traveler BookingInfo: contact_number
    image: "",
    profileImage: "",
  },
  userId: {
    _id: "mock_user_001",
    name: "Test Traveler",
    email: "traveler@test.com",
    phone: "0771234567",
  },
  locationId: {
    _id: MOCK_LOCATION._id,
    name: MOCK_LOCATION.name,
  },
  bookingStatus: "pending",
  startAt: 1741600000000,
  code: "ABCDEF", // shown in traveler BookingInfo when status is "confirmed"
  price: 2500,
  createdAt: "2026-03-05T08:00:00.000Z",
};

const MOCK_BOOKING_LIST = [
  { ...MOCK_BOOKING, _id: "mock_booking_001", bookingStatus: "pending" },
  {
    ...MOCK_BOOKING,
    _id: "mock_booking_002",
    bookingStatus: "confirmed",
    guideId: {
      _id: MOCK_GUIDE_2._id,
      g_name: MOCK_GUIDE_2.g_name,
      image: "",
      profileImage: "",
    },
  },
];

// ── Route Intercept Helpers ───────────────────────────────────────────────────

/**
 * setupApiMocks(page)
 *
 * Stubs all backend API calls the Booking-Guides feature depends on.
 * Call once per scenario (usually inside a Background or Given step).
 *
 * Network calls that don't match any route fall through to the real server,
 * so non-booking calls (auth, etc.) still work normally.
 *
 * @param {import('@playwright/test').Page} page
 */
// Smallest possible valid 1×1 transparent PNG (67 bytes).
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function setupApiMocks(page) {
  // Backend URL: https://goceylon-effhf6gxg5bqachv.westindia-01.azurewebsites.net
  // Routes have NO /api/ prefix — e.g. /guides/location/:id, /booking/user/:id

  // ── Image requests — return a tiny valid PNG so <img> tags don't 404 ──────
  // The frontend builds src as `${API_BASE_URL}/${guide.image}`.
  // With image:"" that becomes backend-root ("/"), triggering a 404 console
  // error. Intercepting *.png / *.jpg / *.avif / *.webp / *.svg silences them.
  await page.route(
    /\.(png|jpe?g|avif|webp|svg|gif)(\?.*)?$/i,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: TRANSPARENT_PNG,
      });
    },
  );
  // Also catch bare backend-root image requests (image field is empty string →
  // URL becomes "https://backend-host/" with no extension).
  await page.route(
    /goceylon-effhf6gxg5bqachv\.westindia-01\.azurewebsites\.net\/(mock\/|$)/,
    async (route, request) => {
      if (
        request.resourceType() === "image" ||
        request.url().match(/\.(png|jpe?g|avif|webp|svg|gif)/i)
      ) {
        await route.fulfill({
          status: 200,
          contentType: "image/png",
          body: TRANSPARENT_PNG,
        });
      } else {
        await route.continue();
      }
    },
  );

  // ── Auth / user-profile calls ─────────────────────────────────────────────
  await page.route("**/auth/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: MOCK_USER,
        token: "mock.token",
        valid: true,
      }),
    });
  });
  await page.route("**/users/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: MOCK_USER }),
    });
  });

  // ── Single guide lookup — registered FIRST so it has lower priority ────────
  // **/guides/** also matches /guides/location/..., so this must be declared
  // before the more-specific /guides/location/** handler (Playwright honours
  // the LAST registered handler for overlapping patterns).
  await page.route("**/guides/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_GUIDE),
    });
  });

  // ── Guide list for a location — registered LAST → takes priority ──────────
  // Actual URL: /guides/location/:locationId
  await page.route("**/guides/location/**", async (route, request) => {
    console.log(`[Mock] GET ${request.url()}`);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      // App does: Array.isArray(res.data) ? res.data : res.data.guides
      body: JSON.stringify(MOCK_GUIDE_LIST),
    });
  });

  // ── Traveler's booking history ─────────────────────────────────────────────
  // Actual URL: /booking/user/:userId
  await page.route("**/booking/user/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_BOOKING_LIST),
    });
  });

  // ── Guide's booking history ───────────────────────────────────────────────
  // Actual URL: /booking/guide/:guideId
  await page.route("**/booking/guide/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_BOOKING_LIST),
    });
  });

  // ── Cancel booking (PUT /booking/cancel/:id) ─────────────────────────────
  // Use a regex instead of a glob to reliably match multi-segment cancel URLs.
  await page.route(/\/booking\/cancel\//, async (route, request) => {
    console.log(`[Mock] CANCEL ${request.method()} ${request.url()}`);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...MOCK_BOOKING, bookingStatus: "cancelled" }),
    });
  });

  // ── Single booking by ID (GET / PATCH for cancel) ─────────────────────────
  await page.route("**/booking/*", async (route, request) => {
    const method = request.method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_BOOKING),
      });
    } else if (method === "PATCH" || method === "PUT") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...MOCK_BOOKING, bookingStatus: "cancelled" }),
      });
    } else {
      await route.continue();
    }
  });

  // ── Create booking (POST /booking) ────────────────────────────────────────
  await page.route("**/booking", async (route, request) => {
    if (request.method() === "POST") {
      const bodyText = await request.postData();
      console.log(`[Mock] POST /booking — body: ${bodyText}`);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(MOCK_BOOKING),
      });
    } else {
      await route.continue();
    }
  });

  // ── Receipt download (returns a tiny valid PDF stub) ──────────────────────
  const MINIMAL_PDF = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF",
  );
  await page.route("**/booking/*/receipt", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/pdf",
      body: MINIMAL_PDF,
      headers: {
        "Content-Disposition": `attachment; filename="receipt_mock_booking_001.pdf"`,
      },
    });
  });
}

/**
 * stubBookingStatus(page, status)
 *
 * Override the single-booking endpoint mid-scenario so the app renders the
 * booking with a specific status. Useful for Scenario Outlines that drive
 * different status values through the Examples table.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} status  - one of: "pending" | "confirmed" | "canceled"
 */
async function stubBookingStatus(page, status) {
  await page.route("**/booking/*", async (route, request) => {
    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...MOCK_BOOKING, bookingStatus: status }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * stubGuideBookingList(page, bookings)
 *
 * Replace the guide's booking list with a custom array.
 * Useful for verifying that specific status badges are rendered.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object[]} bookings
 */
async function stubGuideBookingList(page, bookings) {
  await page.route("**/booking/guide/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(bookings),
    });
  });
}

module.exports = {
  BASE_URL,
  MOCK_TRAVELER_TOKEN,
  MOCK_GUIDE_TOKEN,
  MOCK_LOCATION,
  MOCK_GUIDE,
  MOCK_GUIDE_2,
  MOCK_GUIDE_LIST,
  MOCK_USER,
  MOCK_BOOKING,
  MOCK_BOOKING_LIST,
  setupApiMocks,
  stubBookingStatus,
  stubGuideBookingList,
};
