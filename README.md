# Framework Creative — Portfolio Website

A static, one-page portfolio for **Framework Creative** (Bharat Chandra Mohanty), an independent Canva design studio.
It's plain HTML, CSS and JavaScript with no frameworks and no build step, so it runs on **GitHub Pages** for free.

Design: the "Midnight" layout in mint and green. It has a soft mint background (`#F4F8F5`), deep green text and an emerald accent, set in Unbounded and Manrope (both self-hosted).

---

## What's in the folder

```
index.html            the page
404.html              "page not found" page
favicon.svg           browser tab icon
robots.txt, sitemap.xml
css/style.css         all styles; colours are at the top
js/config.js          ← the file you edit: email, links, contact form, prices
js/library.js         portfolio list (written automatically by the Canva sync)
js/site.js            behaviour and animations
assets/fonts/         Unbounded + Manrope (SIL Open Font License)
assets/library/       portfolio images (one folder per Canva design)
assets/images/        og-image.jpg (preview picture when the link is shared)
scripts/              Canva sync scripts
.github/workflows/    daily Canva sync job
.nojekyll             tells GitHub Pages to serve files as they are
```

## Before you launch: checklist

- [ ] Put your live address in `index.html` (canonical, og:url, og:image, JSON-LD), `robots.txt` and `sitemap.xml`. Search for `your-username`.
- [ ] Check every price, revision count and timeline in `js/config.js`. These are starting defaults, not decisions.
- [ ] Add WhatsApp, LinkedIn or Instagram in `js/config.js` if you want them shown.
- [ ] Choose how the form sends enquiries (see below) and send yourself a test.
- [ ] Look at every portfolio design at full size. Remove any that still show Canva template placeholder text, or that contain QR codes, addresses, client logos without permission, or identifiable people.
- [ ] Optional: replace the "BM" badge in About with your photo (see the comment in `index.html`).
- [ ] Optional: replace `favicon.svg` once you pick a logo.

## Run it locally

Opening `index.html` by double-clicking works for most things. To test it like the live site, run a tiny local server from this folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Editing content

| What | Where |
|---|---|
| Email, WhatsApp, LinkedIn, Instagram | `js/config.js` |
| Monthly packages and one-off prices (₹ and €) | `js/config.js` → `pricing` |
| Headline, services, process, about text | `index.html` (plain text, search for the words) |
| Colours | `css/style.css`, section **2. Tokens** |
| Portfolio designs | your Canva folder (see the sync below) |

INR and EUR are separate prices, not conversions. Visitors whose time zone is in Europe see EUR first. Everyone else sees INR. The visitor's own choice is remembered in their browser.

If you change colours, re-check text contrast with a contrast checker (for example WebAIM's). Aim for at least 4.5:1 for normal text.

## Contact form

The form checks the visitor's details first. It then sends them using the first option that's set up in `js/config.js`:

1. **Salesforce Web-to-Lead** (`salesforce.orgId`). This creates a Lead in your Salesforce org. The visitor is redirected to Salesforce and back, and the page then shows a thank-you note.
   - Use **your own** Salesforce org, not an employer's.
   - In Setup, search for **Web-to-Lead** and make sure it's enabled. The Org ID is under Company Information.
   - Salesforce redirects back even if it couldn't create the lead, so the note means "submitted", not "guaranteed". After setup, send a test and confirm the Lead appears.
   - Project type and budget are sent in the Lead's Description.
2. **A form service** (`formEndpoint`), such as Formspree. The form sends directly and shows success only if the service confirms it, or an error with your email as a backup.
   - The hidden spam trap is named `_gotcha`. As far as I know that's Formspree's convention; please check their current docs.
3. **Neither set (current default).** The form opens the visitor's email app with the message ready. The page says clearly that nothing is sent until they press Send.

The form never shows a fake "sent" message.

I'm not a lawyer. If you collect enquiries from EU clients, check your GDPR obligations (for example, a short privacy note) with a qualified advisor.

## Animations

The page includes:
- the headline words rising in one by one, followed by the highlighter swipe
- the 3D cover-flow of real designs (it pauses on hover)
- floating mint shapes behind the hero
- a scroll progress bar, and a header shadow once you scroll
- sections fading up as they appear
- service icons that draw themselves in
- process steps that cascade in, and an animated design counter
- portfolio cards that tilt with the mouse and pop in when you filter
- a popup viewer that zooms in and out
- prices that flip when you switch currency
- a shine sweep on buttons, a shake on invalid form fields, and a back-to-top button

If a visitor's device is set to **reduce motion**, all of this is turned off. The cover-flow then shows as a still fan of three designs.

## Publish on GitHub Pages

1. Create a GitHub account and a new **public** repository (for example `framework-creative`).
2. Upload **everything inside this folder**, including the hidden `.nojekyll` and `.github` folder. `index.html` must sit at the top level.
   - On a Mac, press `Cmd + Shift + .` in Finder to show hidden files.
   - The `.github` folder is easiest to upload with GitHub Desktop or `git`. The browser uploader can skip hidden folders.
3. Go to **Settings → Pages → Build and deployment**. Choose **Deploy from a branch**, then branch **main** and **/ (root)**. Save.
4. After a minute or two the address appears, usually `https://<username>.github.io/<repo>/`. Put it into the files listed in the checklist and commit again.

**404 page note:** on a `github.io/<repo>/` address, the 404 page can lose its styling when someone opens a deep broken link. To fix it, change `css/style.css` and `favicon.svg` in `404.html` to start with `/<repo>/` (for example `/framework-creative/css/style.css`). On a custom domain, use `/css/style.css`.

GitHub's menus change from time to time. The official guide is at https://docs.github.com/en/pages.

### Custom domain (later)
1. Buy a domain from any registrar.
2. Go to **Settings → Pages → Custom domain** and enter it.
3. Add the DNS records GitHub asks for at your registrar. Use the values from GitHub's current custom-domain docs.
4. Tick **Enforce HTTPS**, then update the URLs in the checklist files.

---

## Portfolio and the automatic Canva sync

The **Recent work** section shows every design in your Canva folder **Framework Creative – Website**. Its sub-folders (Instagram, Banners and so on) become the filter buttons, and the design title becomes the caption. Clicking a design opens it full size, with page thumbnails, arrow keys and "Start a similar project".

The current 15 images (11 Instagram posts and 4 banners) are **Canva preview images**, so they're lower resolution than the originals. The first real sync replaces them with full-size exports.

Once a day, and whenever you press **Run workflow**, a GitHub Action:
1. logs in to Canva,
2. lists the designs in your folder,
3. exports new or changed ones as JPG (up to 5 pages each),
4. removes deleted ones, and
5. rewrites `js/library.js`.

If the folder comes back empty, the sync changes nothing, so a mistake can't wipe the site.

### One-time setup (about 20–30 minutes)
1. **Canva integration.** In Canva's Developer Portal (from canva.dev), create an integration.
   - Scopes: `folder:read`, `design:content:read`.
   - Redirect URL: `http://127.0.0.1:3001/oauth/callback`.
   - Copy the Client ID and Client secret.
2. **First refresh token.** Install Node.js 18 or newer, then run this on your computer:
   ```bash
   CANVA_CLIENT_ID=your_id CANVA_CLIENT_SECRET=your_secret node scripts/canva-auth.mjs
   ```
   Open the link it prints, click Allow, and copy the refresh token it shows.
3. **Folder ID.** It's the code after `/folder/` in the Canva address bar. Your website folder's ID is `FAHX8JzXVyA`.
4. **GitHub token.** Create a fine-grained personal access token for this repository only, with **Contents: read & write** and **Secrets: read & write**.
   - The sync needs it because Canva refresh tokens work only **once**, so each run saves a new token back to GitHub.
5. **Repository secrets.** Go to **Settings → Secrets and variables → Actions** and add:
   `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET`, `CANVA_REFRESH_TOKEN`, `CANVA_FOLDER_ID`, `SYNC_PAT`.
6. **Run it.** Go to **Actions → Sync Canva library → Run workflow**.

**Not yet verified:** I tested the sync script against a mock of Canva's documented API, but not against the real Canva API. I also couldn't confirm whether Canva requires a review before a private integration works for its own creator. Do a manual first run and check the result. If Canva's screens differ from these steps, follow their current docs.

If a run fails with "token refresh failed", the stored token was already used. Repeat step 2 and update `CANVA_REFRESH_TOKEN`.

---

## Tested

Tested locally in Chromium at 320, 390, 768 and 1440 px wide:
- no sideways scrolling, and no console or loading errors
- filters, popup viewer (arrows and Escape), currency switch, form validation, the "Choose plan" pre-select, and the reduced-motion mode

Lighthouse (local server, mobile simulation): Accessibility 96, Best Practices 100, SEO 100, Performance 83.
- I fixed the one accessibility issue it reported (a contrast issue) after that run, but haven't re-run Lighthouse since.
- The performance score is mainly about image size and the local test server having no compression or caching. GitHub Pages adds both, so the live score should be different, but I haven't measured it.
