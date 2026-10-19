# Rancho Exeter — release checklist

The user approved publication on **October 7, 2026**. Google Calendar setup is
saved in the office account. Inquiry email is configured locally and in Vercel
Production; the user confirmed receipt of the one approved test email.

## Remaining setup

- [x] Connect the office Google Calendar booking page: **30-minute tours**,
      **every day 9 AM–3 PM Pacific**, using **office@ranchoexetermhp.com**.
      Busy office calendar times are excluded. Google confirms invitations and
      updates are emailed to both the office and visitor. The public page and
      weekday/weekend time slots were checked; no test booking was submitted.
- [x] Activate inquiry email delivery. The server and form are implemented and
      tested with stubbed email calls. The **free Resend account** is connected.
      All three Resend records for `notify.ranchoexetermhp.com` were saved in
      Vercel DNS and confirmed through public DNS on October 7, 2026. Resend
      verified the domain at **2:12 PM Pacific on October 7, 2026**. A **Sending
      access** key restricted to this domain is stored in private, Git-ignored
      local `.env` with `INQUIRY_FROM`; the local server was restarted.
      The recipient is fixed at **office@ranchoexetermhp.com**; optional visitor
      email becomes Reply-To. The one approved labeled test was submitted through
      the actual local form; the form showed success and Resend confirmed
      **delivered**. The user subsequently confirmed they received the email.
- [x] Set `RESEND_API_KEY` and `INQUIRY_FROM` in Vercel Production as secrets.
      Existing MailerLite settings are preserved.
- [x] Publish the Vercel firewall rule “Limit website inquiries”: POST
      `/api/inquiry`, 5 requests per IP per 600-second fixed window, then 429.
      The code also has a honeypot, validation, request size limits, origin
      checks, retry deduplication, and per-instance throttling.
- [x] User reviewed the preview and authorized publication.
- [x] Published through GitHub `main` and verified production on October 7, 2026:
      release `0610a2d`, Vercel deployment `FRSrUnNXHBtY4z6YzBVmqo7cBFQz`, Ready.
      [Live website](https://ranchoexetermhp.com). Main routes/assets return 200,
      inquiry readiness is true, the mobile menu and form are working, video
      range requests return 206, and private environment/project-note URLs
      return 404. No post-publication inquiry or booking was submitted.
- [ ] User will test the live inquiry form and booking link using their Gmail.
      Do not send another test email or create a calendar booking for them.

[Public tour booking page](https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ3GQGH5d3Hx_nez_-RPlBTICJB6D5QBRZGASQpIm4I25AT0gOn2humJpNpgwLMUlAQDrWA1Vq0z)

Email setup: [verified Resend domain](https://resend.com/domains/c6f8cf4d-42df-45fe-891f-89409a28dc44).
The user explicitly approved the three DNS additions, a sending-only key
restricted to this subdomain, private local `.env` storage, and **one labeled
test inquiry to office@ranchoexetermhp.com**. These steps are complete; do not
send additional live tests without authorization. Key name: **Rancho Exeter
Website Inquiries**. Do not replace it with all-domain or full-access permissions.
Existing Google inbox and MailerLite DNS records were
preserved. Added hosts: `resend._domainkey.notify` (TXT), `send.notify` (MX,
priority 10), and `send.notify` (TXT). Sending is enabled; receiving is not.

[Delivered setup test](https://resend.com/emails/01a1186f-cb90-7a7a-b409-e65ea16c7e57):
subject “Website inquiry about Rancho Exeter,” with name/body explicitly marked
as a setup test requiring no action. No tour appointment was created.

Calendar defaults retained: visitors can book up to 60 days ahead with at least
4 hours’ notice. Google displays Alan Mouchawar as organizer from the office
account’s profile. The site and tour title/description have no staff names.

## Confirmed facts

- **Space 97: $139,000, 1,240 sq. ft., 2 bedrooms, 2 bathrooms plus a den.**
  This is the only available home. Advertise the den separately, not as a third
  bedroom. Space 101 is sold; its old URL points visitors to the available home.
- **Monthly lot rent for Space 97: $616.** Utilities are not included; user asked
  to display just the lot rent. Do not imply included utilities or invent charges.
- **Available spaces for people bringing their own mobile/manufactured home.**
  Last confirmed count is 8, but the user wants the count omitted from the public
  website because availability changes. This remains the primary marketing focus. Land is rented
  only; user asked not to add a separate land-ownership explanation to the site.
- **Phone: (949) 463-1167.** Phone links open the dialer; email links open the
  visitor’s email app. Neither depends on the preview inquiry form.
- **Tours:** 30-minute appointments, Monday–Sunday, 9 AM–3 PM Pacific.
  Calendar account spelling and duration confirmed. Jim handles on-site tours,
  but no staff names should appear in public copy or booking-page text.
- **Photos:** community drone hero; 8 home photos including the new exterior of
  Space 97; full 93-second walkthrough with its audio removed for the website.
  Originals preserved; web assets optimized.

Other property details can be handled after inquiry. Keep the site brief and
readable for a 55+ audience. SEO account setup remains separate follow-up work.

Google’s [appointment-schedule setup guide](https://support.google.com/calendar/answer/10729749?hl=en)
explains availability and booking-page configuration. The public booking-page URL
can be linked from the website once it has been created in the correct account.

Latest design review: full-screen homepage photo, “A community to call home,”
clear Home links, no price/count in the hero buttons, no repeated phone block on
the compact spaces page. “Book a Visit” opens the real Google appointment page in a new tab.

Homepage location review: the hero photo fills the screen edge-to-edge; the
address, Google Map, and directions link appear below the community section.
No new amenities were added during this review.

Latest simplification: enlarged the homepage availability labels, removed the
repeated footer from the four main pages, and removed the final visit block on
the available-home page. The homepage map remains.

## October 19 community-focused update

- Homepage now introduces the park with four large, real photos: the entrance,
  neighborhood street, pool, and pool/clubhouse area. The drone hero and slogan
  remain; the gallery is static and stacks on phones.
- Removed the empty-lot and Space 97 sales sections from the homepage. Space 97
  pricing, specifications, photos, and silent walkthrough remain on `/homes`.
  Shared marketing navigation now calls this page **Homes for Sale**.
- Available-space links remain prominent; the location map, contact links, and
  live Google tour-booking links are preserved.
- Verified all four main routes at 320, 390, 768, and 1440 pixels with no horizontal
  overflow. Checked mobile menu/Escape, home navigation, gallery image loading,
  and the Space 97 listing. No live inquiry or tour booking was submitted.
- The user reviewed the local preview and explicitly approved pushing these
  updates to GitHub and making them public on October 19, 2026. Release through
  the existing `main` → Vercel production deployment.

### Space 97 photo selection

- Added only the three user-approved attachments: `image1.jpeg` (street exterior),
  `image11 (1).jpeg` (wide kitchen/dining view), and `image12.jpeg` (living room/den).
  Stored unchanged at 640×480 under descriptive names in `brand_assets/new-home/`.
- The street exterior is the main listing image. The new kitchen/living views
  replace the two older kitchen images and older living-room image; the gallery
  remains eight photos, with the drone, bedroom, and bathroom photos retained.
- Checked the listing/gallery at 320, 390, 768, and 1440 pixels, image loading,
  enlargement, Next, arrow keys, and Escape. Included in the October 19 release.
- Release checks: JavaScript/server syntax, eight stubbed inquiry tests, local
  asset references, and `git diff --check` passed. No live inquiry or booking
  was created.
