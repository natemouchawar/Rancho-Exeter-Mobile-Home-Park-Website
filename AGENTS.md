# Rancho Exeter project instructions

## Project and current content

- Static HTML with vanilla JavaScript; no framework or build step. Marketing pages
  share `assets/site.css` and `assets/site.js`. Keep the cream/green palette,
  Cormorant Garamond / DM Sans typography, and real property photos.
- The homepage uses a full first-screen hero and “A community to call home.”
  Keep the drone photo edge-to-edge with `object-fit: cover`; do not letterbox
  it or separate it from the hero copy on portrait screens. The homepage includes a
  lazy-loaded Google Map and address at `#location`.
  Keep the hero’s two exploration buttons free of prices/counts and omit its old
  “Questions?” phone line. Provide explicit Home / Back to Home navigation.
- `/spaces` is a compact photo-and-blurb page with Ask About a Space and Book a
  Visit actions. Avoid repeated phone CTAs or a separate contact section there.
- The user wants a simple, readable website for a 55+ audience: large controls,
  short copy, prominent phone/visit actions. Detailed questions belong in office
  conversations; avoid long FAQs, estimated costs, and elaborate inquiry forms.
- The user approved publication on **October 7, 2026**. Production is
  `https://ranchoexetermhp.com`; pushing `main` to the existing GitHub repository
  triggers Vercel production deployment. Preview future changes locally and
  do not push or deploy a new change without a user request.
- The only available home is **Space 97, $139,000, 1,240 sq. ft., 2 bedrooms,
  2 bathrooms plus a den**. Do not call the den a third bedroom. Its lot rent is
  **$616/month**; utilities are excluded, and the user wants only the lot rent
  shown. Space 101 is sold. Bringing an existing mobile/manufactured home is the
  primary marketing priority. The last confirmed space count was 8, but the user
  explicitly wants no numeric availability count anywhere on the public site.
  Land is rented only; the user does not want a separate ownership explanation.
  See `PREVIEW_CHECKLIST.md` for the few integration items still open.
- Confirmed contact: **(949) 463-1167**, **office@ranchoexetermhp.com**.
  The phone/email reach the user’s father, who manages the inbox. Jim is the
  on-site tour manager, but the user wants **no staff names on the public site**.
  Tours are **30 minutes**, **Monday–Sunday, 9 AM–3 PM Pacific**, using the office
  Google Calendar account. The public Google booking page is now connected to
  all Book a Visit links. `/contact` sends inquiries through `/api/inquiry`;
  Resend is configured locally and in Vercel Production; one real setup test
  was delivered and the user confirmed receipt. If the
  server has no credentials, the submit button stays disabled and the page
  offers phone/email contact. Never claim an unsent inquiry was sent.

## File map

- `index.html` → `/`; `homes.html` → `/homes` (the one available home).
- `spaces.html` → `/spaces`; `contact.html` → `/contact`.
- `homes/unit-101.html` → old direct link with sold notice.
- `welcome-offer.html` → ask office about current offers; no assumed terms.
- `join.html` → separate resident signup, with its own inline CSS/JS.
- `brochure.html` → print brochure; `Rancho-Exeter-Brochure.pdf` is generated output.
- `brand_assets/` → originals; `brand_assets/web/` → responsive community photos;
  `brand_assets/new-home/` → seven interior photos, the Space 97 exterior drone photo (original plus
  optimized sizes), and the full MP4 walkthrough. The site uses
  `walkthrough-silent.mp4`, with no audio stream; retain original media.
- `serve.mjs` → local static/API server with clean URLs and MP4 range support.
- `api/subscribe.mjs` → existing MailerLite resident signup endpoint.
- `api/inquiry.mjs` → Resend delivery to the fixed office inbox; GET reports
  readiness, POST validates and sends. `tests/inquiry.test.mjs` stubs all email
  requests so tests never send messages.
- `vercel.json` → clean URLs, no trailing slashes. GitHub/Vercel hosting stays intact.
- `.vercelignore` → excludes private/local files, project notes, tests, and
  unused original media from the deployment; originals remain in Git.
- Header markup is repeated across marketing pages; update it consistently.
  The four main pages omit the repeated footer; `/homes` also omits the final
  “Come see it for yourself” block. Keep these pages concise.
  `CLAUDE.md` is legacy context with outdated paths and new-site guidance.

## Run and test

```sh
node serve.mjs         # http://localhost:3000; Node built-ins, no install needed
npm ci                 # Only needed for existing Puppeteer screenshot/PDF helpers
node --check assets/site.js
node --check serve.mjs
node --test tests/inquiry.test.mjs
git diff --check
```

Reuse an existing preview server. Reload pages after HTML/CSS/JS changes; restart
for server/API/environment changes. There are no npm test/lint scripts. Fonts
need internet access. Use the browser to test relevant routes at 320px, 390px,
768px, and desktop: overflow, readable text, image loading, menu/Escape behavior,
phone links, photo enlargement/arrow keys, form validation, and video play/seek.
For server changes, check HTTP status/MIME types and MP4 byte-range responses.

`screenshot.mjs` is an existing 1440px screenshot helper; output goes to ignored
`temporary screenshots/`. Only regenerate the brochure when requested, using
`node make-brochure-pdf.mjs`, then inspect the resulting PDF.

## Integrations and safeguards

- Preserve the resident form's `lotNumber` field mapping (label: “Space Number”).
  The existing API normalizes optional US phone numbers.
- Credentials are unnecessary for page previews. MailerLite uses server-side
  `MAILERLITE_API_KEY` and `MAILERLITE_GROUP_ID` from `.env` locally or Vercel env.
  Never commit secrets. Do not send test signups to the live audience.
- For API changes, test with dummy credentials and stubbed upstream calls. GET
  `/api/subscribe` should return 405; empty-form validation needs no real submission.
- Inquiry delivery needs server-side `RESEND_API_KEY` and `INQUIRY_FROM` from a
  verified Resend sending domain. See `.env.example`; never log credentials or
  inquiry content. The local server binds to loopback and blocks dotfiles/API
  source so `.env` cannot be served. Additional exact preview origins can use
  `INQUIRY_ALLOWED_ORIGINS`. Honeypot and per-instance throttling are present.
  Vercel's enabled “Limit website inquiries” rule limits POST `/api/inquiry`
  to 5 requests per IP per 600-second fixed window, returning 429 above that.
  Resend verified `notify.ranchoexetermhp.com` on October 7, 2026. Its sending-only,
  domain-restricted key is in private local `.env` and Vercel Production as a
  secret, together with `INQUIRY_FROM`. One user-approved test submitted through the local form was confirmed
  delivered by Resend. That authorization is used; do not send additional live
  tests without authorization. The user will test the live email form and
  calendar using their Gmail; do not create test inquiries or tour bookings.
  `PREVIEW_CHECKLIST.md` records setup details.
- The office Google appointment schedule is saved as “Rancho Exeter Community
  Tour”: every day 9 AM–3 PM America/Los_Angeles, 30 minutes, in person at the
  park. Default booking window: 60 days ahead / 4-hour lead time. Busy calendar
  times are excluded; confirmations/updates email office and visitor. Google
  displays the account owner, Alan Mouchawar, as organizer. Do not change the
  Google account’s identity without a user request. Booking is external and live.
  No agent-created test appointment has been booked.
- Preserve originals, avoid invented property features, and keep unrelated
  deployment configuration and brochure output unchanged.
