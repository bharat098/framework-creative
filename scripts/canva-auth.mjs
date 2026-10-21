#!/usr/bin/env node
/* =====================================================================
   FRAMEWORK CREATIVE — ONE-TIME CANVA AUTHORISATION
   ---------------------------------------------------------------------
   Run this ONCE on your own computer to get the first refresh token for
   the GitHub sync. You need Node.js 18+ installed.

     CANVA_CLIENT_ID=xxx CANVA_CLIENT_SECRET=yyy node scripts/canva-auth.mjs

   (Windows PowerShell:
     $env:CANVA_CLIENT_ID="xxx"; $env:CANVA_CLIENT_SECRET="yyy"; node scripts/canva-auth.mjs)

   1. It prints a Canva link — open it and click "Allow".
   2. Canva sends you back to http://127.0.0.1:3001/oauth/callback
      (add exactly this URL as a redirect URL in your Canva integration).
   3. The terminal shows your refresh token. Paste it into the GitHub
      secret CANVA_REFRESH_TOKEN. Don't share it or commit it.
   ===================================================================== */
import { createServer } from "node:http";
import { randomBytes, createHash } from "node:crypto";

const ID = process.env.CANVA_CLIENT_ID, SECRET = process.env.CANVA_CLIENT_SECRET;
const PORT = parseInt(process.env.PORT || "3001", 10);
const REDIRECT = `http://127.0.0.1:${PORT}/oauth/callback`;
const SCOPES = "folder:read design:content:read";
if (!ID || !SECRET) { console.error("Set CANVA_CLIENT_ID and CANVA_CLIENT_SECRET first (see the top of this file)."); process.exit(1); }

const b64url = (buf) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const verifier = b64url(randomBytes(64));
const challenge = b64url(createHash("sha256").update(verifier).digest());
const state = b64url(randomBytes(24));

const url = "https://www.canva.com/api/oauth/authorize?" + new URLSearchParams({
  code_challenge: challenge, code_challenge_method: "S256", scope: SCOPES,
  response_type: "code", client_id: ID, state, redirect_uri: REDIRECT,
});

const server = createServer(async (req, res) => {
  const u = new URL(req.url, REDIRECT);
  if (u.pathname !== "/oauth/callback") { res.writeHead(404).end(); return; }
  const done = (msg) => { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(`<p style="font:16px system-ui;padding:2rem">${msg}</p>`); };
  if (u.searchParams.get("state") !== state) { done("State mismatch — please run the script again."); return; }
  if (u.searchParams.get("error")) { done("Canva returned: " + u.searchParams.get("error")); server.close(); return; }
  try {
    const r = await fetch("https://api.canva.com/rest/v1/oauth/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${ID}:${SECRET}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code: u.searchParams.get("code"), code_verifier: verifier, redirect_uri: REDIRECT }),
    });
    const j = await r.json();
    if (!r.ok || !j.refresh_token) throw new Error(`HTTP ${r.status} ${JSON.stringify(j)}`);
    done("Done! Go back to the terminal and copy your refresh token. You can close this tab.");
    console.log("\n✔ Success. Save this as the GitHub secret CANVA_REFRESH_TOKEN:\n\n" + j.refresh_token + "\n");
    console.log("It works only once — the sync job replaces it with a new one on every run.");
  } catch (e) {
    done("Token exchange failed — see the terminal.");
    console.error("Token exchange failed:", e.message);
  }
  server.close();
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("\nOpen this link, log in to Canva and click Allow:\n\n" + url + "\n\nWaiting for Canva on " + REDIRECT + " …");
});
