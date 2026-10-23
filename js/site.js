/* =====================================================================
   FRAMEWORK CREATIVE — SITE SCRIPT
   Portfolio grid + popup · pricing + ₹/€ switch · contact form
   (Salesforce / form service / email) · menu · animations.
   Reads js/config.js and js/library.js. No libraries.
   ===================================================================== */
(function () {
  "use strict";
  var CFG = window.FC_CONFIG || {};
  var LIB = window.FC_LIBRARY || { items: [] };
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var EMAIL = CFG.email || "";

  /* ---------------- Contact details from config ---------------- */
  $$("[data-email]").forEach(function (el) { el.textContent = EMAIL; });
  $$("[data-founder]").forEach(function (el) { if (CFG.founderName) el.textContent = CFG.founderName; });
  var links = [];
  if (CFG.whatsapp) links.push(["WhatsApp", "https://wa.me/" + String(CFG.whatsapp).replace(/\D/g, "")]);
  if (CFG.linkedin) links.push(["LinkedIn", CFG.linkedin]);
  if (CFG.instagram) links.push(["Instagram", CFG.instagram]);
  $$("[data-links]").forEach(function (el) {
    if (!links.length) { el.hidden = true; return; }
    el.innerHTML = links.map(function (l) {
      return '<a href="' + esc(l[1]) + '" target="_blank" rel="noopener noreferrer">' + esc(l[0]) + '<span class="visually-hidden"> (opens in a new tab)</span></a>';
    }).join("");
  });
  var yr = $("[data-year]"); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------------- Mobile menu ---------------- */
  var menuBtn = $("[data-menu-btn]"), nav = $("[data-nav]");
  var menuLabel = $("[data-menu-label]");
  function closeMenu() { if (!menuBtn) return; menuBtn.setAttribute("aria-expanded", "false"); nav.classList.remove("is-open"); if (menuLabel) menuLabel.textContent = "Menu"; }
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var open = menuBtn.getAttribute("aria-expanded") !== "true";
      menuBtn.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
      if (menuLabel) menuLabel.textContent = open ? "Close" : "Menu";
    });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
    // Tap anywhere outside the menu to close it
    document.addEventListener("click", function (e) { if (nav.classList.contains("is-open") && !nav.contains(e.target) && !menuBtn.contains(e.target)) closeMenu(); });
  }

  /* ---------------- Portfolio ---------------- */
  var items = (LIB.items || []).filter(function (it) { return it && it.pages && it.pages.length; });
  var grid = $("[data-grid]"), bar = $("[data-filters]"), countEl = $("[data-count]");
  var cards = [], visible = [];
  var ORDER = ["Instagram post", "Banner", "Story", "Presentation", "Document", "Poster"];

  if (grid) {
    var types = [];
    items.forEach(function (it) { if (types.indexOf(it.type) < 0) types.push(it.type); });
    types.sort(function (a, b) { var x = ORDER.indexOf(a), y = ORDER.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y); });
    var plural = function (t) { return /s$/.test(t) ? t : t + "s"; };
    if (bar) {
      bar.innerHTML = [{ id: "all", label: "All work", n: items.length }].concat(types.map(function (t) {
        return { id: t, label: plural(t), n: items.filter(function (i) { return i.type === t; }).length };
      })).map(function (f) {
        return '<button class="chip" type="button" data-filter="' + esc(f.id) + '" aria-pressed="' + (f.id === "all") + '">' +
          esc(f.label) + ' <span class="chip__n">' + f.n + "</span></button>";
      }).join("");
      if (types.length < 2) bar.hidden = true;
    }
    grid.innerHTML = items.map(function (it, i) {
      var wide = (it.width || 1) / (it.height || 1) > 1.2;
      return '<button class="w-card' + (wide ? " w-card--wide" : "") + '" type="button" data-i="' + i + '" data-type="' + esc(it.type) + '" aria-haspopup="dialog" data-reveal style="--i:' + (i % 8) + '">' +
        '<span class="w-card__img"><img src="' + esc(it.pages[0]) + '" alt="" width="' + (it.width || 400) + '" height="' + (it.height || 500) + '" loading="' + (i < 8 ? "eager" : "lazy") + '" decoding="async">' +
        (it.pages.length > 1 ? '<span class="w-card__pages">' + it.pages.length + " pages</span>" : "") +
        '<span class="w-card__zoom" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2"/></svg></span></span>' +
        '<span class="w-card__meta"><span class="w-card__title">' + esc(it.title) + '</span><span class="w-card__type">' + esc(it.type) + "</span></span>" +
        '<span class="visually-hidden"> — view full size</span></button>';
    }).join("");
    cards = $$(".w-card", grid);
    visible = cards.slice();
    if (countEl) { countEl.setAttribute("data-to", items.length); countEl.textContent = pad(items.length); }

    // Hide a card whose image is missing instead of showing a broken picture
    $$("img", grid).forEach(function (img) {
      img.addEventListener("error", function () { var c = img.closest(".w-card"); if (c) c.hidden = true; }, { once: true });
    });

    if (bar) bar.addEventListener("click", function (e) {
      var b = e.target.closest("[data-filter]");
      if (!b || b.getAttribute("aria-pressed") === "true") return;
      $$("[data-filter]", bar).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      var f = b.getAttribute("data-filter");
      visible = cards.filter(function (c) { return f === "all" || c.getAttribute("data-type") === f; });
      cards.forEach(function (c) { c.hidden = visible.indexOf(c) < 0; c.classList.remove("pop"); });
      void grid.offsetWidth;
      visible.forEach(function (c, k) { c.style.setProperty("--i", k % 8); c.classList.add("pop"); });
      if (countEl) { countEl.setAttribute("data-to", visible.length); countEl.textContent = pad(visible.length); }
    });

    // Gentle 3D tilt on mouse/trackpad
    if (finePointer && !reduce) {
      cards.forEach(function (c) {
        var box = $(".w-card__img", c), raf = 0;
        c.addEventListener("pointermove", function (e) {
          var r = box.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(function () {
            box.style.setProperty("--rx", (-y * 8).toFixed(2) + "deg");
            box.style.setProperty("--ry", (x * 10).toFixed(2) + "deg");
          });
        });
        c.addEventListener("pointerleave", function () {
          cancelAnimationFrame(raf);
          box.style.setProperty("--rx", "0deg"); box.style.setProperty("--ry", "0deg");
        });
      });
    }
  }

  /* ---------------- Popup viewer ---------------- */
  var dlg = $("[data-viewer]");
  var cur = 0, page = 0, opener = null;
  function show(i, p) {
    cur = i; page = p || 0;
    var it = items[i];
    $("[data-v-title]", dlg).textContent = it.title;
    var pos = visible.indexOf(cards[i]);
    $("[data-v-meta]", dlg).textContent = (pos > -1 ? (pos + 1) + " of " + visible.length + " · " : "") + it.type +
      (it.pages.length > 1 ? " · page " + (page + 1) + " of " + it.pages.length : "");
    var stage = $("[data-v-stage]", dlg);
    stage.innerHTML = '<img src="' + esc(it.pages[page]) + '" alt="' + esc(it.title + (it.pages.length > 1 ? ", page " + (page + 1) : "")) + '">';
    stage.classList.remove("swap"); void stage.offsetWidth; stage.classList.add("swap");
    var pagesEl = $("[data-v-pages]", dlg);
    pagesEl.innerHTML = it.pages.length < 2 ? "" : it.pages.map(function (src, k) {
      return '<button type="button" class="v-thumb" data-page="' + k + '" aria-label="Page ' + (k + 1) + '"' + (k === page ? ' aria-current="true"' : "") + '><img src="' + esc(src) + '" alt=""></button>';
    }).join("");
  }
  function step(dir) {
    var list = visible.length ? visible : cards;
    var pos = list.indexOf(cards[cur]);
    show(parseInt(list[(pos + dir + list.length) % list.length].getAttribute("data-i"), 10), 0);
  }
  function stepPage(dir) {
    var n = items[cur].pages.length, p = page + dir;
    if (n < 2 || p < 0 || p >= n) return step(dir);
    show(cur, p);
  }
  function closeViewer() {
    if (!dlg.open) return;
    dlg.classList.add("is-closing");
    setTimeout(function () {
      dlg.classList.remove("is-closing");
      dlg.close();
      document.documentElement.classList.remove("no-scroll");
      if (opener && document.contains(opener)) opener.focus();
    }, reduce ? 0 : 220);
  }
  if (dlg && grid) {
    grid.addEventListener("click", function (e) {
      var c = e.target.closest(".w-card");
      if (!c) return;
      opener = c;
      show(parseInt(c.getAttribute("data-i"), 10), 0);
      if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
      document.documentElement.classList.add("no-scroll");
      $("[data-v-close]", dlg).focus();
    });
    $("[data-v-close]", dlg).addEventListener("click", closeViewer);
    $("[data-v-prev]", dlg).addEventListener("click", function () { step(-1); });
    $("[data-v-next]", dlg).addEventListener("click", function () { step(1); });
    $("[data-v-pages]", dlg).addEventListener("click", function (e) {
      var t = e.target.closest("[data-page]"); if (t) show(cur, parseInt(t.getAttribute("data-page"), 10));
    });
    dlg.addEventListener("cancel", function (e) { e.preventDefault(); closeViewer(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) closeViewer(); });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); stepPage(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); stepPage(-1); }
    });
    var sx = null, stageEl = $("[data-v-stage]", dlg);
    stageEl.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    stageEl.addEventListener("touchend", function (e) {
      if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 50) stepPage(dx < 0 ? 1 : -1);
    });
    var sim = $("[data-v-similar]", dlg);
    if (sim) sim.addEventListener("click", function () {
      var it = items[cur];
      opener = null;
      closeViewer();
      prefill("Hi! I'd like something similar to \"" + it.title + "\" for my brand. ");
      setTimeout(goContact, reduce ? 0 : 240);
    });
  }

  /* ---------------- Pricing ---------------- */
  var PR = CFG.pricing || {};
  var fmts = {};
  function money(v, c) {
    if (!fmts[c]) {
      try { fmts[c] = new Intl.NumberFormat(c === "INR" ? "en-IN" : "en-IE", { style: "currency", currency: c, maximumFractionDigits: 0 }); }
      catch (e) { fmts[c] = { format: function (n) { return (c === "INR" ? "₹" : "€") + n; } }; }
    }
    return fmts[c].format(v);
  }
  var currency = store.get("fc-cur");
  if (currency !== "INR" && currency !== "EUR") {
    if (PR.defaultCurrency === "INR" || PR.defaultCurrency === "EUR") currency = PR.defaultCurrency;
    else {
      var tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
      currency = /^Europe\//.test(tz) ? "EUR" : "INR";
    }
  }
  var priceSpan = function (p) { return '<span class="price" data-inr="' + p.inr + '" data-eur="' + p.eur + '">' + money(currency === "INR" ? p.inr : p.eur, currency) + "</span>"; };
  var plansEl = $("[data-plans]"), oneEl = $("[data-oneoff]");
  if (plansEl) plansEl.innerHTML = (PR.monthly || []).map(function (p) {
    return '<article class="plan' + (p.featured ? " plan--hl" : "") + '" data-reveal>' +
      '<div class="plan__top"><h3 class="plan__name">' + esc(p.name) + "</h3>" + (p.featured ? '<span class="plan__badge">Most popular</span>' : "") + "</div>" +
      '<p class="plan__price"><span class="plan__from">from</span>' + priceSpan(p) + '<span class="plan__per">' + esc(p.per || "") + "</span></p>" +
      '<p class="plan__sum">' + esc(p.summary) + "</p>" +
      '<ul class="plan__list">' + (p.includes || []).map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ul>" +
      '<p class="plan__meta">' + esc(p.terms) + "</p>" +
      (p.excludes ? '<details class="plan__more"><summary>Not included</summary><p>' + esc(p.excludes) + "</p></details>" : "") +
      '<a class="btn ' + (p.featured ? "btn--primary" : "btn--ghost") + '" href="#contact" data-choose="' + esc(p.name) + '">Choose ' + esc(p.name) + "</a>" +
      "</article>";
  }).join("");
  if (oneEl) oneEl.innerHTML = (PR.oneOff || []).map(function (p) {
    return '<div class="oneoff" data-reveal><div class="oneoff__text"><h4 class="oneoff__name">' + esc(p.name) + '</h4><p class="oneoff__desc">' + esc(p.desc) + '</p></div>' +
      '<p class="oneoff__price"><span class="plan__from">from</span> ' + priceSpan(p) + '</p>' +
      '<a class="oneoff__cta" href="#contact" data-choose="' + esc(p.name) + '">Enquire <span aria-hidden="true">→</span></a></div>';
  }).join("");
  function setCurrency(c, animate) {
    currency = c; store.set("fc-cur", c);
    $$(".price[data-inr]").forEach(function (el) {
      el.textContent = money(parseFloat(el.getAttribute(c === "INR" ? "data-inr" : "data-eur")), c);
      if (animate && !reduce) { el.classList.remove("flip"); void el.offsetWidth; el.classList.add("flip"); }
    });
    $$("[data-cur]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-cur") === c)); });
  }
  $$("[data-cur]").forEach(function (b) { b.addEventListener("click", function () { setCurrency(b.getAttribute("data-cur"), true); }); });
  setCurrency(currency, false);
  document.addEventListener("click", function (e) {
    var ch = e.target.closest("[data-choose]");
    if (!ch) return;
    e.preventDefault();
    var sel = $("#f-type"), want = ch.getAttribute("data-choose").toLowerCase();
    if (sel) for (var k = 0; k < sel.options.length; k++) if (sel.options[k].text.toLowerCase().indexOf(want) > -1) { sel.selectedIndex = k; break; }
    goContact();
  });

  /* ---------------- Contact form ---------------- */
  function prefill(t) { var ta = $("#f-msg"); if (ta && !ta.value.trim()) ta.value = t; }
  function goContact() {
    var c = $("#contact"); if (c) c.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    var n = $("#f-name"); if (n) setTimeout(function () { n.focus({ preventScroll: true }); }, reduce ? 0 : 700);
  }
  var form = $("[data-form]"), status = $("[data-status]"), submitBtn = $("[data-submit]"), modeEl = $("[data-form-mode]");
  var sf = CFG.salesforce || {};
  var sfOrg = String(sf.orgId || "").trim();
  var useSF = /^[A-Za-z0-9]{15}([A-Za-z0-9]{3})?$/.test(sfOrg);
  var endpoint = String(CFG.formEndpoint || "").trim();
  if (modeEl) {
    modeEl.textContent = useSF || endpoint
      ? "Your enquiry goes straight to my inbox. I usually reply within a couple of working days."
      : "This opens your email app with your message ready. Nothing is sent until you press Send there.";
  }
  if (submitBtn && !useSF && !endpoint) submitBtn.textContent = "Open in my email app";

  function say(kind, text) { status.className = "form__status is-" + kind; status.textContent = text; }
  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("#f-name"), mail = $("#f-email"), msg = $("#f-msg"), trap = $("#f-website");
    var errs = [];
    [name, mail, msg].forEach(function (f) { f.removeAttribute("aria-invalid"); });
    if (!name.value.trim()) errs.push([name, "Please add your name."]);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail.value.trim())) errs.push([mail, "Please add a valid email, like name@company.com."]);
    if (msg.value.trim().length < 20) errs.push([msg, "Please describe your project in at least 20 characters."]);
    if (errs.length) {
      errs.forEach(function (x) { x[0].setAttribute("aria-invalid", "true"); });
      say("error", errs.map(function (x) { return x[1]; }).join(" "));
      errs[0][0].focus();
      if (!reduce) { form.classList.remove("shake"); void form.offsetWidth; form.classList.add("shake"); }
      return;
    }
    if (trap && trap.value) return; // spam bot
    var v = function (id) { var el = $(id); return el ? el.value.trim() : ""; };
    var data = { name: v("#f-name"), email: v("#f-email"), company: v("#f-company"), type: v("#f-type"), budget: v("#f-budget"), message: v("#f-msg") };

    if (useSF) {
      var parts = data.name.split(/\s+/), last = parts.pop(), first = parts.join(" ");
      var fields = {
        oid: sfOrg,
        retURL: sf.returnUrl || (location.origin + location.pathname + "?enquiry=sent#contact"),
        first_name: first, last_name: last, email: data.email, company: data.company,
        description: "Project type: " + data.type + "\nBudget: " + data.budget + "\n\n" + data.message
      };
      if (sf.leadSource) fields.lead_source = sf.leadSource;
      var post = document.createElement("form");
      post.method = "POST"; post.action = "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8"; post.hidden = true;
      Object.keys(fields).forEach(function (k) { var i = document.createElement("input"); i.type = "hidden"; i.name = k; i.value = fields[k]; post.appendChild(i); });
      document.body.appendChild(post);
      submitBtn.disabled = true; submitBtn.textContent = "Sending…";
      post.submit();
      return;
    }
    if (endpoint) {
      submitBtn.disabled = true; submitBtn.textContent = "Sending…"; form.classList.add("is-sending");
      fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) })
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          form.reset();
          say("ok", "Thank you — your enquiry was sent. I'll reply to " + data.email + ".");
          form.classList.add("is-sent");
        })
        .catch(function () { say("error", "Your message couldn't be sent. Please try again, or email me at " + EMAIL + "."); })
        .then(function () { submitBtn.disabled = false; submitBtn.textContent = "Send enquiry"; form.classList.remove("is-sending"); });
      return;
    }
    var body = "Name: " + data.name + "\nEmail: " + data.email + "\nCompany: " + (data.company || "-") + "\nProject type: " + data.type + "\nBudget: " + data.budget + "\n\n" + data.message;
    location.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent("Project enquiry — " + data.type) + "&body=" + encodeURIComponent(body);
    say("ok", "Your email app should open with the message ready — press Send there. If nothing opened, email me at " + EMAIL + ".");
  });
  try {
    if (new URLSearchParams(location.search).get("enquiry") === "sent" && status) {
      say("ok", "Thank you — your enquiry was submitted. I'll reply to the email address you gave.");
      history.replaceState(null, "", location.pathname + "#contact");
    }
  } catch (e) {}

  var copyBtn = $("[data-copy]");
  if (copyBtn) copyBtn.addEventListener("click", function () {
    var done = function (ok) {
      copyBtn.textContent = ok ? "Copied ✓" : "Select the address to copy";
      setTimeout(function () { copyBtn.textContent = "Copy email"; }, 2000);
    };
    try { navigator.clipboard.writeText(EMAIL).then(function () { done(true); }, function () { done(false); }); }
    catch (e) { done(false); }
  });

  /* =================== ANIMATIONS =================== */

  // Headline: words rise in one after another
  var h1 = $("[data-words]");
  if (h1 && !reduce) {
    var n = 0;
    (function wrap(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var s = document.createElement("span"); s.className = "word"; s.style.setProperty("--w", n++); s.textContent = part;
            frag.appendChild(s);
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) wrap(ch);
      });
    })(h1);
    h1.classList.add("is-split");
  }

  // Service icons: prepare stroke "draw-on"
  $$(".svc__icon").forEach(function (svg) {
    $$("path,rect,circle", svg).forEach(function (sh) { if (sh.getAttribute("fill") === "none") sh.setAttribute("pathLength", "1"); });
  });

  // Count-up
  function countUp(el) {
    var to = parseInt(el.getAttribute("data-to") || el.textContent, 10);
    if (!to || reduce) return;
    var t0 = performance.now(), dur = 900;
    (function f(now) {
      var k = Math.min(1, (now - t0) / dur);
      to = parseInt(el.getAttribute("data-to"), 10) || to; // follows the filter if it changes mid-count
      el.textContent = pad(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(f);
    })(t0);
  }

  // Scroll reveals (staggered within each group)
  var revealEls = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduce) {
    document.documentElement.classList.add("reveal-on");
    var io = new IntersectionObserver(function (entries) {
      var shown = 0;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.style.setProperty("--rd", (shown++ * 0.08) + "s");
        en.target.classList.add("is-in");
        if (en.target.hasAttribute("data-count-up")) $$("[data-to]", en.target).forEach(countUp);
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  // Scroll progress, header state, back-to-top
  var prog = $("[data-progress]"), header = $(".site-header"), toTop = $("[data-to-top]"), ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY || 0, max = document.documentElement.scrollHeight - innerHeight;
    if (prog) prog.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0).toFixed(4) + ")";
    if (header) header.classList.toggle("is-scrolled", y > 12);
    if (toTop) toTop.classList.toggle("is-visible", y > innerHeight * 1.2);
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });
  /* =================== MOTION v2 =================== */
  // Rotating word in the hero ("I design ___")
  var rot = $("[data-rotator]");
  if (rot) {
    var words = $$("span", rot), wi = 0;
    words[0].classList.add("is-on");
    var fit = function (el) { rot.style.width = Math.ceil(el.getBoundingClientRect().width) + "px"; };
    var fitNow = function () { fit(words[wi]); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitNow); else fitNow();
    window.addEventListener("resize", fitNow);
    if (!reduce && words.length > 1) setInterval(function () {
      var cur = words[wi]; wi = (wi + 1) % words.length; var nxt = words[wi];
      cur.classList.remove("is-on"); cur.classList.add("is-out");
      nxt.classList.remove("is-out"); nxt.classList.add("is-on"); fit(nxt);
      setTimeout(function () { cur.classList.remove("is-out"); }, 600);
    }, 2200);
  }

  // Section titles split into words (revealed with their section)
  if (!reduce) $$(".h2").forEach(function (h) {
    var k = 0;
    h.innerHTML = h.textContent.trim().split(/\s+/).map(function (w) {
      return '<span class="word" style="--w:' + (k++) + '">' + esc(w) + "</span>";
    }).join(" ");
    h.classList.add("is-split");
  });

  if (finePointer && !reduce) {
    // Buttons lean towards the pointer
    $$("[data-magnetic]").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + "px," + ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + "px)";
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
    // Soft green light follows the pointer in the hero and on service cards
    var hero = $(".hero");
    if (hero) hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", (e.clientX - r.left) + "px"); hero.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
    $$(".svc").forEach(function (c) {
      c.addEventListener("pointermove", function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty("--sx", (e.clientX - r.left) + "px"); c.style.setProperty("--sy", (e.clientY - r.top) + "px");
      });
    });
  }

  // Hero designs drift slightly slower than the page (parallax)
  var par = $("[data-parallax]");
  if (par && !reduce) {
    var pTick = false;
    window.addEventListener("scroll", function () {
      if (pTick) return; pTick = true;
      requestAnimationFrame(function () { pTick = false; var y = window.scrollY || 0; if (y < innerHeight * 1.2) par.style.setProperty("--py", (y * 0.12).toFixed(1)); });
    }, { passive: true });
  }
})();
