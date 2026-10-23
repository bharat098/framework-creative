/* =====================================================================
   FRAMEWORK CREATIVE — SITE SETTINGS
   ---------------------------------------------------------------------
   The one file to edit for contact details, the contact form and prices.
   Keep the quotes and commas as they are. Leave a value "" to hide it.
   ===================================================================== */
window.FC_CONFIG = {

  /* ---------- Identity ---------- */
  studioName: "Framework Creative",
  founderName: "Bharat Chandra Mohanty",

  /* ---------- Contact ----------
     whatsapp : country code + number, digits only, e.g. "919876543210"
     linkedin / instagram : full profile URLs
  */
  email: "bharatmohanty06@gmail.com",
  whatsapp: "",
  linkedin: "",
  instagram: "",

  /* ---------- Contact form: how enquiries are sent ----------
     googleScriptUrl → your Google Apps Script web app address (ends in /exec).
                       Saves each enquiry to your Google Sheet, emails you, and sends the
                       visitor an automatic reply. Setup: README → "Contact form".
     Alternatives (used only if googleScriptUrl is empty):
       salesforce.orgId → creates a Lead in Salesforce (Web-to-Lead)
       formEndpoint     → a form service such as Formspree
     Nothing is ever reported as "sent" unless the service confirms it.
  */
  googleScriptUrl: "",
  formEndpoint: "",
  salesforce: {
    orgId: "",            // 15 or 18 characters, from Salesforce Setup → Company Information
    returnUrl: "",        // leave "" to come back to this page automatically
    leadSource: "Website"
  },

  /* ---------- Pricing ----------
     INR and EUR are separate market prices, not conversions.
     Review revisions, timelines and exclusions before launch — they are starter defaults.
  */
  pricing: {
    defaultCurrency: "auto",   // "auto" (EUR for visitors in Europe), "INR" or "EUR"
    monthly: [
      {
        name: "Social Starter", inr: 7500, eur: 75, per: "/ month", featured: false,
        summary: "A steady, consistent social presence for small brands and creators.",
        includes: ["12 static social media graphics", "Feed posts or story formats", "Designed to your brand colours and fonts"],
        terms: "2 revision rounds per graphic · first batch in about 5–7 working days · editable Canva files",
        excludes: "Copywriting, captions, posting, paid stock assets, video"
      },
      {
        name: "Brand Growth", inr: 12000, eur: 150, per: "/ month", featured: true,
        summary: "More volume and variety for brands running regular campaigns.",
        includes: ["20 static social media graphics", "Mix of posts, carousels and stories", "A reusable branded template set"],
        terms: "2 revision rounds per graphic · first batch in about 7–10 working days · editable Canva files",
        excludes: "Copywriting, captions, posting, paid stock assets, video"
      }
    ],
    oneOff: [
      { name: "Restaurant menu", inr: 1500, eur: 40, desc: "Single-page menu, print-ready PDF + digital version" },
      { name: "Event creative", inr: 1500, eur: 30, desc: "One poster, invitation or banner in one format" },
      { name: "Presentation design", inr: 6000, eur: 80, desc: "Up to 12 designed slides with master layouts" }
    ]
  }
};
