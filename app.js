/* Postmark browser demo UI. All DOM is built with createElement/textContent; no innerHTML with data. */
(function () {
  "use strict";
  const L = window.PostmarkLogic;
  const STORE_KEY = "postmark.demo.v1";
  const app = document.getElementById("app");

  // ---------- tiny DOM helper (text only) ----------
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "style") Object.assign(el.style, v);
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "value" || k === "checked" || k === "type") el[k] = v;
      else el.setAttribute(k, v === true ? "" : String(v));
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  // Static icon paths (constants, never user data)
  const ICONS = {
    home: "M3 11 12 3l9 8M5 9.5V21h5v-6h4v6h5V9.5",
    people: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
    groups: "M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6M5 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M19 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M7 20v-1a5 5 0 0 1 10 0v1M1 19v-.5A3.5 3.5 0 0 1 5 15M23 19v-.5A3.5 3.5 0 0 0 19 15",
    map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14",
    cards: "M3 7l9 6 9-6M3 7v11h18V7M3 7l9-4 9 4",
    plus: "M12 5v14M5 12h14",
    gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
    back: "M11 2 2 10.5 11 19",
    chev: "M1 1l6 6-6 6",
    search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3",
    phone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z",
    mail: "M3 5h18v14H3zM3 5l9 7 9-7",
    star: "M12 2l3 6.3 6.9 1-5 4.8 1.2 6.9L12 17.8 5.9 21l1.2-6.9-5-4.8 6.9-1z",
    share: "M12 15V3M8 7l4-4 4 4M5 12v8h14v-8",
    check: "M2 7l3.5 3.5L11 3",
  };
  function icon(name, cls) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", name === "back" ? "0 0 13 21" : name === "chev" ? "0 0 8 14" : name === "check" ? "0 0 13 13" : "0 0 24 24");
    svg.setAttribute("fill", name === "star" && cls === "filled" ? "currentColor" : "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", name === "back" || name === "chev" ? "2.5" : "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    if (cls && cls !== "filled") svg.setAttribute("class", cls);
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", ICONS[name]);
    svg.append(p);
    return svg;
  }
  const COLORS = { red: "#ff3b30", orange: "#ff9500", yellow: "#ffcc00", green: "#34c759", mint: "#00c7be", teal: "#30b0c7",
    blue: "#007aff", indigo: "#5856d6", purple: "#af52de", pink: "#ff2d55", brown: "#a2845e", gray: "#8e8e93" };
  const EMOJIS = ["📬", "🏡", "🎄", "📚", "🎉", "💼", "⛪️", "🏫", "⚽️", "🎂", "❤️", "🌎", "🐶", "🎓", "🍷", "✈️"];

  // ---------- data ----------
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  function blankPerson() {
    return { id: uid(), firstName: "", lastName: "", householdName: "", street1: "", street2: "", city: "", state: "",
      postalCode: "", country: "USA", phone: "", email: "", birthday: "", notes: "", isFavorite: false,
      createdAt: Date.now(), isSample: false, lat: null, lon: null };
  }
  function seed() {
    const now = new Date();
    const md = (days) => { const d = new Date(now); d.setDate(d.getDate() + days); return [d.getMonth() + 1, d.getDate()]; };
    const bd = (y, m, d) => y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    const [sm, sd] = md(9), [s2m, s2d] = md(21);
    const raw = [
      ["Marisol", "Quillfeather", "The Quillfeather Family", "418 Juniper Hollow Rd", "", "Asheville", "NC", "28801", "(828) 555-0142", "marisol@example.com", bd(1984, sm, sd), "Kids: Pip and Juno", true, 35.5951, -82.5515],
      ["Theo", "Brambleton", "", "77 Lantern Wharf", "Unit 4B", "Portland", "ME", "04101", "(207) 555-0199", "theo.b@example.com", bd(1979, 3, 14), "", false, 43.6591, -70.2568],
      ["Priya", "Wobblestone", "Priya & Dev Wobblestone", "2210 Saguaro Bend Dr", "", "Tucson", "AZ", "85719", "(520) 555-0110", "priya@example.com", bd(1990, s2m, s2d), "", true, 32.2319, -110.9501],
      ["Gus", "Fernwhistle", "", "9 Old Mill Ct", "", "Burlington", "VT", "05401", "(802) 555-0187", "", bd(1958, 7, 2), "Prefers handwritten notes", false, 44.4759, -73.2121],
      ["Lena", "Okonkwo-Pebble", "The Okonkwo-Pebble Household", "1503 Magnolia Terrace", "", "Savannah", "GA", "31401", "", "lena.op@example.com", bd(1988, 12, 30), "", false, 32.0809, -81.0912],
      ["Rafael", "Tinderbox", "", "640 Prairie Lark Ave", "", "Lincoln", "NE", "68508", "(402) 555-0123", "", bd(1972, 5, 19), "", false, 40.8136, -96.7026],
      ["Wren", "Applebury", "", "31 Cedar Switchback", "", "Bend", "OR", "97701", "", "wren@example.com", bd(1995, 9, 8), "", true, 44.0582, -121.3153],
      ["Hollis", "Marrowby", "Hollis & June Marrowby", "2 Bayou Lantern Pl", "", "New Orleans", "LA", "70116", "(504) 555-0166", "", bd(1966, 2, 11), "", false, 29.9629, -90.0573],
      ["Ottilie", "Sparrowgate", "", "880 Lakeshore Gable St", "Apt 12", "Madison", "WI", "53703", "", "ottilie@example.com", bd(2001, 6, 27), "", false, 43.0747, -89.3842],
      ["Bartholomew", "Kettleworth", "", "15 Harbor Fig Way", "", "Santa Barbara", "CA", "93101", "(805) 555-0175", "", "", "Moved in 2025, new address", false, 34.4208, -119.6982],
    ];
    const people = raw.map((r, i) => Object.assign(blankPerson(), {
      id: "p" + i, firstName: r[0], lastName: r[1], householdName: r[2], street1: r[3], street2: r[4], city: r[5], state: r[6],
      postalCode: r[7], phone: r[8], email: r[9], birthday: r[10], notes: r[11], isFavorite: r[12], lat: r[13], lon: r[14],
      isSample: true, createdAt: Date.now() - 3600000 * (raw.length - i),
    }));
    const ids = (idx) => idx.map((i) => "p" + i);
    const groups = [
      { id: "g0", name: "Family", emoji: "🏡", color: "orange", memberIds: ids([0, 3, 7]), isSample: true, createdAt: Date.now() - 3 },
      { id: "g1", name: "Christmas cards", emoji: "🎄", color: "green", memberIds: ids([0, 1, 2, 3, 4, 5, 6, 7]), isSample: true, createdAt: Date.now() - 2 },
      { id: "g2", name: "Book club", emoji: "📚", color: "purple", memberIds: ids([1, 4, 6, 8]), isSample: true, createdAt: Date.now() - 1 },
    ];
    const season = { id: "s0", name: L.suggestedSeasonName(now), createdAt: Date.now() };
    const cards = { s0: { p0: { sent: true }, p3: { sent: true, received: true }, p5: { received: true } } };
    return { people, groups, seasons: [season], cards, activeSeasonId: "s0" };
  }
  const META_KEY = "postmark.meta.v1";
  const emptyDb = () => ({ people: [], groups: [], seasons: [], cards: {}, activeSeasonId: null });
  function readJSON(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
  let firstRun = false;
  function load() {
    const d = readJSON(STORE_KEY);
    if (d && Array.isArray(d.people) && Array.isArray(d.groups)) {
      d.seasons = Array.isArray(d.seasons) ? d.seasons : []; d.cards = d.cards && typeof d.cards === "object" ? d.cards : {};
      return d;
    }
    firstRun = true;
    return emptyDb();
  }
  let db = load();
  const meta = Object.assign({ lastBackupAt: null, persist: null, showMap: true }, readJSON(META_KEY) || {});
  const hasRealData = () => db.people.some((p) => !p.isSample) || db.groups.some((g) => !g.isSample);
  const isQuota = (e) => e && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" || e.code === 22 || e.code === 1014);
  // Every write to storage goes through here.
  function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) {
      toast(isQuota(e) ? "Storage is full, so that change wasn't saved. Use Settings > Back up now, then remove some notes or people."
        : "Couldn't save in this browser. Use Settings > Back up now to keep a copy.", 6000);
      return false;
    }
  }
  function saveMeta() { return writeStore(META_KEY, meta); }
  /** Save the address book. edit=false for housekeeping writes that aren't the user's own change. */
  function save(edit = true) {
    const ok = writeStore(STORE_KEY, db);
    if (ok && edit && meta.persist == null && hasRealData()) requestPersist();
    return ok;
  }
  function requestPersist() {
    meta.persist = "pending"; saveMeta();
    const st = navigator.storage;
    if (!st || typeof st.persist !== "function") { meta.persist = "unsupported"; saveMeta(); return; }
    st.persist().then((granted) => { meta.persist = granted ? "granted" : "denied"; saveMeta(); }, () => { meta.persist = "unsupported"; saveMeta(); });
  }
  if (!firstRun) save(false);

  const personById = (id) => db.people.find((p) => p.id === id);
  const groupById = (id) => db.groups.find((g) => g.id === id);
  const groupsOf = (p) => db.groups.filter((g) => g.memberIds.includes(p.id));
  const membersOf = (g) => g.memberIds.map(personById).filter(Boolean);
  const fullName = (p) => L.fullName(p.firstName, p.lastName) || p.householdName || "No Name";
  const initials = (p) => ((p.firstName[0] || "") + (p.lastName[0] || "")).toUpperCase() || "?";
  const hasCoords = (p) => typeof p.lat === "number" && typeof p.lon === "number";
  const activeSeason = () => db.seasons.find((s) => s.id === db.activeSeasonId) || db.seasons[db.seasons.length - 1] || null;
  const cardState = (s, p) => (s && db.cards[s.id] && db.cards[s.id][p.id]) || null;

  // ---------- UI state ----------
  const ui = { tab: "home", stacks: { home: [], people: [], groups: [], map: [], cards: [] },
    search: "", sort: "lastName", groupFilter: "", mapGroup: "", cardsFilter: "all", sheet: null };
  let map = null;

  function toast(msg, ms) {
    const t = h("div", { class: "toast", role: "status", text: msg });
    app.append(t);
    setTimeout(() => t.remove(), ms || 1800);
  }
  function push(view) { ui.stacks[ui.tab].push(view); render(); }
  function pop() { ui.stacks[ui.tab].pop(); render(); }
  function openSheet(fn) { ui.sheet = fn; render(); }
  function closeSheet() { ui.sheet = null; render(); }

  // ---------- building blocks ----------
  const navBtn = (label, onclick, opts = {}) =>
    h("button", { class: "navbtn" + (opts.back ? " back" : ""), onclick, "aria-label": opts.aria || label, style: opts.bold ? { fontWeight: 600 } : null },
      opts.icon ? icon(opts.icon) : null, opts.back ? icon("back") : null, opts.icon ? null : label);
  function screen({ title, large = true, left, right, body }) {
    const nav = h("div", { class: "nav" }, h("div", { class: "side" }, left || null),
      h("div", { class: "inline-title", text: large ? "" : title }), h("div", { class: "side right" }, right || null));
    const content = h("div", { class: "content" }, large ? h("h1", { class: "large-title", text: title }) : null, body);
    return [nav, content];
  }
  const section = (header, rows, footer) => h("div", {},
    header ? h("div", { class: "section-header", text: header }) : null,
    h("div", { class: "section" }, h("div", { class: "list" }, rows), footer ? h("div", { class: "section-footer", text: footer }) : null));
  function row(opts) {
    const tag = opts.onclick || opts.href ? (opts.href ? "a" : "button") : "div";
    return h(tag, { class: "row" + (opts.onclick || opts.href ? " tappable" : "") + (opts.cls ? " " + opts.cls : ""), onclick: opts.onclick, href: opts.href },
      opts.leading || null,
      h("div", { class: "grow" }, h("div", { class: "title", text: opts.title }), opts.sub ? h("div", { class: "sub", text: opts.sub }) : null, opts.extra || null),
      opts.trailing != null ? (opts.trailing instanceof Node ? opts.trailing : h("span", { class: "value", text: opts.trailing })) : null,
      opts.chevron ? icon("chev", "chev") : null);
  }
  const avatar = (p, big) => h("div", { class: "avatar" + (big ? " big" : ""), text: initials(p) });
  const groupBadge = (g) => h("div", { class: "emoji-badge", style: { background: COLORS[g.color] + "33" }, text: g.emoji });
  function personRow(p, onclick) {
    return row({ cls: "indent", leading: avatar(p), title: fullName(p),
      sub: L.hasMailingAddress(p) ? L.cityLine(p) : null,
      extra: L.hasMailingAddress(p) ? null : h("div", { class: "warn", text: "No address" }),
      trailing: p.isFavorite ? h("span", { class: "star" }, icon("star", "filled")) : null,
      chevron: true, onclick: onclick || (() => push({ kind: "person", id: p.id })) });
  }

  // ---------- Home ----------
  function homeView() {
    const missing = db.people.filter((p) => !L.hasMailingAddress(p)).length;
    const s = activeSeason();
    const notSent = s ? db.people.filter((p) => !(cardState(s, p) || {}).sent).length : 0;
    const stat = (num, lbl, tab) => h("button", { class: "stat", onclick: () => { ui.tab = tab; render(); } },
      h("div", { class: "num", text: String(num) }), h("div", { class: "lbl", text: lbl }));
    const up = L.upcomingBirthdays(db.people, 30, new Date());
    const fmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
    const bdays = up.length ? up.map((u) => {
      const age = L.turningAge(u.person.birthday, new Date());
      const when = u.daysAway === 0 ? "Today" : u.daysAway === 1 ? "Tomorrow" : "in " + u.daysAway + " days";
      return row({ cls: "indent", leading: avatar(u.person), title: fullName(u.person),
        sub: fmt.format(u.date) + (age ? " · turning " + age : ""), trailing: when, chevron: true,
        onclick: () => { ui.tab = "people"; ui.stacks.people = [{ kind: "person", id: u.person.id }]; render(); } });
    }) : [h("div", { class: "row" }, h("span", { class: "muted", text: "None coming up." }))];
    const favs = db.people.filter((p) => p.isFavorite);
    const banner = needsBackup() ? h("div", { class: "banner", role: "note" },
      h("div", { class: "grow", text: meta.lastBackupAt ? "It's been over a month since your last backup." : "You haven't backed up your address book yet." }),
      h("button", { class: "banner-btn", text: "Back up now", onclick: backupNow })) : null;
    return screen({ title: "Postmark", right: navBtn("Settings", () => openSheet(settingsSheet), { icon: "gear", aria: "Settings" }), body: [
      banner,
      h("div", { class: "stats" }, stat(db.people.length, "People", "people"), stat(db.groups.length, "Groups", "groups"),
        stat(missing, "Missing addresses", "people"), stat(notSent, s ? "Cards not sent" : "No card season", "cards")),
      section("Birthdays in the next 30 days", bdays),
      favs.length ? section("Favorites", favs.map((p) => personRow(p, () => { ui.tab = "people"; ui.stacks.people = [{ kind: "person", id: p.id }]; render(); }))) : null,
    ] });
  }

  // ---------- People ----------
  function filteredPeople() {
    let list = db.people.filter((p) => L.matchesSearch(p, ui.search));
    if (ui.groupFilter) { const g = groupById(ui.groupFilter); list = g ? list.filter((p) => g.memberIds.includes(p.id)) : list; }
    return L.sortPeople(list, ui.sort);
  }
  function peopleView() {
    const list = filteredPeople();
    const searchInput = h("input", { type: "search", placeholder: "Search", value: ui.search, "aria-label": "Search people",
      oninput: (e) => { ui.search = e.target.value; renderKeepFocus("search"); } });
    searchInput.dataset.focus = "search";
    const sortSel = h("select", { class: "pill", "aria-label": "Sort", onchange: (e) => { ui.sort = e.target.value; render(); } },
      L.SORTS.map(([k, label]) => h("option", { value: k, text: "Sort: " + label })));
    sortSel.value = ui.sort;
    const chips = h("div", { class: "chips" }, sortSel,
      h("button", { class: "chip" + (ui.groupFilter ? "" : " on"), text: "Everyone", onclick: () => { ui.groupFilter = ""; render(); } }),
      db.groups.map((g) => h("button", { class: "chip" + (ui.groupFilter === g.id ? " on" : ""), text: g.emoji + " " + g.name,
        onclick: () => { ui.groupFilter = g.id; render(); } })));
    return screen({ title: "People",
      left: navBtn("Mail", () => openSheet(() => mailSheet(list.map((p) => p.id), "People")), { icon: "share", aria: "Copy, export or print addresses" }),
      right: navBtn("Add", () => openSheet(() => editSheet(null)), { icon: "plus", aria: "Add person" }),
      body: [h("div", { class: "search" }, icon("search"), searchInput), chips,
        list.length ? section(list.length + (list.length === 1 ? " person" : " people"), list.map((p) => personRow(p)))
          : h("div", { class: "empty", text: db.people.length ? "No matches." : "No people yet. Tap + to add someone." })] });
  }
  function personView(id) {
    const p = personById(id);
    if (!p) { ui.stacks[ui.tab].pop(); return currentView(); }
    const action = (label, ic, href) => h("a", { class: "action" + (href ? "" : " disabled"), href: href || null }, icon(ic), h("span", { text: label }));
    const fmt = new Intl.DateTimeFormat(undefined, p.birthday && p.birthday.startsWith("1604") ? { month: "long", day: "numeric" } : { dateStyle: "long" });
    const bdayDate = L.parseISODay(p.birthday);
    const gs = groupsOf(p);
    const s = activeSeason(), cs = cardState(s, p) || {};
    return screen({ title: fullName(p), large: false, left: navBtn("Back", pop, { back: true, aria: "Back" }),
      right: navBtn("Edit", () => openSheet(() => editSheet(p.id))), body: [
        h("div", { class: "profile" }, avatar(p, true), h("h2", { text: fullName(p) }),
          p.householdName ? h("div", { class: "muted", text: p.householdName }) : null,
          h("div", { class: "actions" },
            action("call", "phone", p.phone ? "tel:" + p.phone.replace(/[^\d+]/g, "") : null),
            action("mail", "mail", p.email ? "mailto:" + encodeURIComponent(p.email).replace(/%40/g, "@") : null),
            h("button", { class: "action", onclick: () => { p.isFavorite = !p.isFavorite; save(); render(); } },
              h("span", { class: p.isFavorite ? "star" : "" }, icon("star", p.isFavorite ? "filled" : null)), h("span", { text: p.isFavorite ? "favorite" : "favorite?" })))),
        section("Mailing address", [L.hasMailingAddress(p)
          ? row({ title: "", extra: h("div", { class: "envelope", text: L.envelope(p) }) })
          : row({ title: "No address yet", sub: "Add a street and city so this person shows up on labels." }),
        L.hasMailingAddress(p) ? row({ cls: "button", title: "Copy envelope address", onclick: () => copyText(L.envelope(p), "Address copied") }) : null]),
        p.phone || p.email ? section("Contact", [
          p.phone ? row({ title: p.phone, sub: "phone", href: "tel:" + p.phone.replace(/[^\d+]/g, "") }) : null,
          p.email ? row({ title: p.email, sub: "email", href: "mailto:" + encodeURIComponent(p.email).replace(/%40/g, "@") }) : null]) : null,
        bdayDate ? section("Birthday", [row({ title: fmt.format(new Date(bdayDate.y, bdayDate.m - 1, bdayDate.d)),
          trailing: (() => { const n = L.daysUntil(p.birthday, new Date()); return n === 0 ? "Today 🎂" : "in " + n + " days"; })() })]) : null,
        section("Groups", gs.length ? gs.map((g) => row({ leading: groupBadge(g), title: g.name })) : [row({ title: "Not in any groups", cls: "muted" })]),
        s ? section(s.name, [row({ title: "Card sent", trailing: toggle(!!cs.sent, (v) => setCard(s, p, "sent", v)) }),
          row({ title: "Card received", trailing: toggle(!!cs.received, (v) => setCard(s, p, "received", v)) })]) : null,
        section("Map", [row({ title: hasCoords(p) ? "📍 " + p.lat.toFixed(3) + ", " + p.lon.toFixed(3) : "No map location yet",
          sub: hasCoords(p) ? null : "The iPhone app looks it up automatically.",
          chevron: hasCoords(p), onclick: hasCoords(p) ? () => { ui.tab = "map"; ui.focusPerson = p.id; render(); } : null })]),
        p.notes ? section("Notes", [row({ title: "", extra: h("div", { class: "envelope", text: p.notes }) })]) : null,
      ] });
  }
  function toggle(on, onchange) {
    return h("input", { type: "checkbox", class: "toggle", checked: on, role: "switch", onchange: (e) => onchange(e.target.checked) });
  }
  function setCard(s, p, key, v) {
    db.cards[s.id] = db.cards[s.id] || {};
    const cur = db.cards[s.id][p.id] = db.cards[s.id][p.id] || {};
    cur[key] = v;
    save(); render();
  }

  // ---------- Add / edit person sheet ----------
  function editSheet(id) {
    const existing = id ? personById(id) : null;
    const draft = Object.assign(blankPerson(), existing ? JSON.parse(JSON.stringify(existing)) : {});
    const groupSel = new Set(existing ? groupsOf(existing).map((g) => g.id) : (ui.groupFilter ? [ui.groupFilter] : []));
    const field = (label, key, type = "text", attrs = {}) => h("div", { class: "field" }, h("label", { text: label, for: "f-" + key }),
      h(type === "textarea" ? "textarea" : "input", Object.assign({ id: "f-" + key, type: type === "textarea" ? null : type, value: draft[key] || "",
        oninput: (e) => { draft[key] = e.target.value; } }, attrs)));
    const body = [
      h("div", { class: "section" }, h("div", { class: "list" }, field("First", "firstName", "text", { autocomplete: "given-name" }),
        field("Last", "lastName", "text", { autocomplete: "family-name" }), field("Household", "householdName", "text", { placeholder: "The Smith Family" }))),
      h("div", { class: "section-header", text: "Mailing address" }),
      h("div", { class: "section" }, h("div", { class: "list" }, field("Street", "street1"), field("Street 2", "street2"),
        field("City", "city"), field("State", "state"), field("ZIP", "postalCode", "text", { inputmode: "numeric" }), field("Country", "country"))),
      h("div", { class: "section-header", text: "Contact" }),
      h("div", { class: "section" }, h("div", { class: "list" }, field("Phone", "phone", "tel"), field("Email", "email", "email"),
        field("Birthday", "birthday", "date"))),
      h("div", { class: "section-header", text: "Groups" }),
      h("div", { class: "section" }, h("div", { class: "list" }, db.groups.length ? db.groups.map((g) => {
        const t = toggle(groupSel.has(g.id), (v) => { v ? groupSel.add(g.id) : groupSel.delete(g.id); });
        return row({ leading: groupBadge(g), title: g.name, trailing: t });
      }) : row({ title: "No groups yet", cls: "muted" }))),
      h("div", { class: "section" }, h("div", { class: "list" }, field("Notes", "notes", "textarea"))),
      existing ? h("div", { class: "section" }, h("div", { class: "list" }, h("button", { class: "row destructive", text: "Delete Person", onclick: () => {
        if (!confirm("Delete " + fullName(existing) + "? This can't be undone.")) return;
        db.people = db.people.filter((x) => x.id !== existing.id);
        db.groups.forEach((g) => { g.memberIds = g.memberIds.filter((m) => m !== existing.id); });
        Object.values(db.cards).forEach((c) => delete c[existing.id]);
        save(); ui.stacks[ui.tab] = ui.stacks[ui.tab].filter((v) => v.id !== existing.id); closeSheet();
      } }))) : null,
    ];
    const done = () => {
      if (!draft.firstName.trim() && !draft.lastName.trim() && !draft.householdName.trim()) { toast("Add a name first"); return; }
      if (existing) {
        const addrChanged = ["street1", "street2", "city", "state", "postalCode", "country"].some((k) => (existing[k] || "") !== (draft[k] || ""));
        if (addrChanged) { draft.lat = null; draft.lon = null; } // the iPhone app re-geocodes; the demo never calls a geocoder
        Object.assign(existing, draft);
      } else db.people.push(draft);
      db.groups.forEach((g) => {
        const has = g.memberIds.includes(draft.id);
        if (groupSel.has(g.id) && !has) g.memberIds.push(draft.id);
        if (!groupSel.has(g.id) && has) g.memberIds = g.memberIds.filter((m) => m !== draft.id);
      });
      save(); closeSheet(); toast(existing ? "Saved" : "Added " + fullName(draft));
    };
    return { title: existing ? "Edit Person" : "New Person", left: navBtn("Cancel", closeSheet), right: navBtn("Done", done, { bold: true }), body };
  }

  // ---------- Groups ----------
  function groupsView() {
    const list = db.groups.slice().sort((a, b) => a.name.localeCompare(b.name));
    return screen({ title: "Groups", right: navBtn("Add", () => openSheet(() => groupSheet(null)), { icon: "plus", aria: "New group" }),
      body: list.length ? section(null, list.map((g) => row({ leading: groupBadge(g), title: g.name,
        trailing: h("span", { class: "badge", text: String(membersOf(g).length) }), chevron: true, onclick: () => push({ kind: "group", id: g.id }) })))
        : h("div", { class: "empty", text: "No groups yet. Make one for Family, Christmas cards, a book club…" }) });
  }
  function groupView(id) {
    const g = groupById(id);
    if (!g) { ui.stacks[ui.tab].pop(); return currentView(); }
    const members = L.sortPeople(membersOf(g), "lastName");
    return screen({ title: g.emoji + " " + g.name, large: true, left: navBtn("Groups", pop, { back: true }),
      right: navBtn("Edit", () => openSheet(() => groupSheet(g.id))), body: [
        h("button", { class: "pillbtn", text: "Copy, export or print labels", onclick: () => openSheet(() => mailSheet(members.map((p) => p.id), g.name)) }),
        h("button", { class: "pillbtn secondary", text: "Add or remove members", onclick: () => openSheet(() => membersSheet(g.id)) }),
        members.length ? section(members.length + (members.length === 1 ? " member" : " members"), members.map((p) => personRow(p, () => {
          ui.tab = "people"; ui.stacks.people = [{ kind: "person", id: p.id }]; render(); })))
          : h("div", { class: "empty", text: "No one in this group yet." }),
      ] });
  }
  function groupSheet(id) {
    const g = id ? groupById(id) : null;
    const d = { name: g ? g.name : "", emoji: g ? g.emoji : "📬", color: g ? g.color : "blue" };
    const emojiRow = h("div", { class: "emojis" });
    const swRow = h("div", { class: "swatches" });
    const paint = () => {
      emojiRow.replaceChildren(...EMOJIS.map((e) => h("button", { class: e === d.emoji ? "on" : "", text: e, "aria-label": "Emoji " + e,
        style: e === d.emoji ? { background: COLORS[d.color] + "33" } : null, onclick: () => { d.emoji = e; paint(); } })));
      swRow.replaceChildren(...Object.entries(COLORS).map(([k, c]) => h("button", { class: "swatch" + (k === d.color ? " on" : ""),
        style: { background: c, color: c }, "aria-label": k, onclick: () => { d.color = k; paint(); } })));
    };
    paint();
    const done = () => {
      if (!d.name.trim()) { toast("Name the group"); return; }
      if (g) Object.assign(g, { name: d.name.trim(), emoji: d.emoji, color: d.color });
      else db.groups.push({ id: uid(), name: d.name.trim(), emoji: d.emoji, color: d.color, memberIds: [], isSample: false, createdAt: Date.now() });
      save(); closeSheet();
    };
    return { title: g ? "Edit Group" : "New Group", left: navBtn("Cancel", closeSheet), right: navBtn("Done", done, { bold: true }), body: [
      h("div", { class: "section" }, h("div", { class: "list" }, h("div", { class: "field" }, h("label", { text: "Name", for: "g-name" }),
        h("input", { id: "g-name", value: d.name, placeholder: "Christmas cards", oninput: (e) => { d.name = e.target.value; } })))),
      h("div", { class: "section-header", text: "Emoji" }), h("div", { class: "section" }, h("div", { class: "list" }, emojiRow)),
      h("div", { class: "section-header", text: "Color" }), h("div", { class: "section" }, h("div", { class: "list" }, swRow)),
      g ? h("div", { class: "section" }, h("div", { class: "list" }, h("button", { class: "row destructive", text: "Delete Group", onclick: () => {
        if (!confirm("Delete the group " + g.name + "? People stay in your address book.")) return;
        db.groups = db.groups.filter((x) => x.id !== g.id); save(); ui.stacks.groups = []; closeSheet();
      } }))) : null,
    ] };
  }
  function selectPeopleBody(sel, onchange) {
    const list = L.sortPeople(db.people, "lastName");
    const all = h("button", { class: "row button", text: sel.size === list.length ? "Deselect all" : "Select all", onclick: () => {
      if (sel.size === list.length) sel.clear(); else list.forEach((p) => sel.add(p.id));
      onchange();
    } });
    return section(sel.size + " selected", [all, ...list.map((p) => {
      const on = sel.has(p.id);
      return h("button", { class: "row tappable indent", role: "checkbox", "aria-checked": String(on), onclick: () => { on ? sel.delete(p.id) : sel.add(p.id); onchange(); } },
        h("span", { class: "check" + (on ? " on" : "") }, on ? icon("check") : null), avatar(p),
        h("div", { class: "grow" }, h("div", { class: "title", text: fullName(p) }), h("div", { class: "sub", text: L.cityLine(p) || "No address" })));
    })]);
  }
  function membersSheet(id) {
    const g = groupById(id);
    const sel = new Set(g.memberIds);
    const holder = h("div");
    const paint = () => holder.replaceChildren(selectPeopleBody(sel, paint));
    paint();
    return { title: g.name, left: navBtn("Cancel", closeSheet), right: navBtn("Done", () => {
      g.memberIds = db.people.filter((p) => sel.has(p.id)).map((p) => p.id); save(); closeSheet();
    }, { bold: true }), body: holder };
  }

  // ---------- Mailing: copy / CSV / print labels ----------
  function mailSheet(initialIds, label) {
    const sel = new Set(initialIds);
    const holder = h("div");
    const chosen = () => L.sortPeople(db.people.filter((p) => sel.has(p.id)), "lastName");
    const paint = () => {
      const people = chosen(), withAddr = people.filter((p) => L.hasMailingAddress(p));
      const missing = people.length - withAddr.length;
      holder.replaceChildren(
        h("div", { class: "chips" }, h("span", { class: "chip", text: "Quick pick:" }),
          db.groups.map((g) => h("button", { class: "chip", text: g.emoji + " " + g.name, onclick: () => { sel.clear(); g.memberIds.forEach((m) => sel.add(m)); paint(); } }))),
        section(null, [
          row({ cls: "button", title: "Copy addresses (" + withAddr.length + ")", onclick: () => copyText(L.envelopes(withAddr), "Copied " + withAddr.length + " addresses") }),
          row({ cls: "button", title: "Download CSV (" + people.length + ")", onclick: () => downloadCSV(people, label) }),
          row({ cls: "button", title: "Print labels, Avery 5160 (" + withAddr.length + ")", onclick: () => printLabels(withAddr) }),
        ], missing ? missing + " selected " + (missing === 1 ? "person has" : "people have") + " no mailing address and will be skipped for envelopes and labels." : "Envelope format uses the household name when there is one."),
        selectPeopleBody(sel, paint));
    };
    paint();
    return { title: "Mail " + label, left: navBtn("Done", closeSheet, { bold: true }), body: holder };
  }
  async function copyText(text, msg) {
    try { await navigator.clipboard.writeText(text); toast(msg); }
    catch (e) {
      const ta = h("textarea", { value: text, style: { position: "fixed", opacity: "0" } });
      document.body.append(ta); ta.select();
      try { document.execCommand("copy"); toast(msg); } catch (e2) { toast("Copy isn't allowed here"); }
      ta.remove();
    }
  }
  function downloadCSV(people, label) {
    const rows = people.map((p) => Object.assign({}, p, { groups: groupsOf(p).map((g) => g.name) }));
    const blob = new Blob([L.csv(rows)], { type: "text/csv;charset=utf-8" });
    const a = h("a", { href: URL.createObjectURL(blob), download: "postmark-" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".csv" });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("CSV downloaded");
  }
  function buildLabelSheet(people) {
    const sheet = document.getElementById("print-sheet");
    const pages = [];
    people.forEach((p, i) => {
      const pos = L.labelPosition(i);
      if (!pages[pos.page]) pages[pos.page] = h("div", { class: "label-page" });
      pages[pos.page].append(h("div", { class: "label", style: { left: pos.x + "in", top: pos.y + "in" }, text: L.envelope(p) }));
    });
    sheet.replaceChildren(...pages);
    return pages.length;
  }
  function printLabels(people) {
    if (!people.length) { toast("No one with an address selected"); return; }
    buildLabelSheet(people);
    window.print();
  }

  // ---------- Map ----------
  function mapView() {
    const g = ui.mapGroup ? groupById(ui.mapGroup) : null;
    const people = (g ? membersOf(g) : db.people);
    const pinned = people.filter(hasCoords), unpinned = people.filter((p) => !hasCoords(p));
    const sel = h("select", { class: "pill", "aria-label": "Filter map by group", onchange: (e) => { ui.mapGroup = e.target.value; render(); } },
      h("option", { value: "", text: "Everyone (" + db.people.filter(hasCoords).length + " pins)" }),
      db.groups.map((x) => h("option", { value: x.id, text: x.emoji + " " + x.name })));
    sel.value = ui.mapGroup;
    const nav = h("div", { class: "nav" }, h("div", { class: "side" }), h("div", { class: "inline-title", text: "Map" }), h("div", { class: "side right" }));
    const note = unpinned.length ? h("div", { class: "map-note", text: unpinned.length + " without a map location yet (the iPhone app looks it up automatically)." }) : null;
    if (!meta.showMap || !window.L || typeof window.L.map !== "function") {
      return [nav, h("div", { class: "content" }, h("div", { class: "chips" }, sel),
        h("div", { class: "empty", text: meta.showMap ? "The map couldn't load. Here's everyone with a location instead."
          : "The map is off (Settings > Map), so nothing is loaded from OpenStreetMap. Here's everyone with a location." }),
        section(null, pinned.map((p) => row({ leading: avatar(p), title: fullName(p), sub: L.cityLine(p), trailing: p.lat.toFixed(2) + ", " + p.lon.toFixed(2),
          onclick: () => { ui.tab = "people"; ui.stacks.people = [{ kind: "person", id: p.id }]; render(); } }))), note)];
    }
    const wrap = h("div", { class: "map-wrap" }, h("div", { id: "map", role: "region", "aria-label": "Map of people" }), h("div", { class: "map-filter" }, sel));
    queueMicrotask(() => drawMap(pinned));
    return [nav, wrap, note];
  }
  function drawMap(pinned) {
    const el = document.getElementById("map");
    if (!el) return;
    if (map) { map.remove(); map = null; }
    map = window.L.map(el, { zoomControl: false, attributionControl: true });
    window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
    const markers = pinned.map((p) => {
      const popup = h("div", {}, h("strong", { text: fullName(p) }), h("div", { text: L.cityLine(p) }),
        h("button", { text: "Open", onclick: () => { ui.tab = "people"; ui.stacks.people = [{ kind: "person", id: p.id }]; render(); } }));
      const m = window.L.circleMarker([p.lat, p.lon], { radius: 9, color: "#fff", weight: 2, fillColor: "#ff3b30", fillOpacity: 1 }).bindPopup(popup);
      m.addTo(map);
      return { m, p };
    });
    const focus = markers.find((x) => x.p.id === ui.focusPerson);
    ui.focusPerson = null;
    if (focus) { map.setView([focus.p.lat, focus.p.lon], 11); focus.m.openPopup(); }
    else if (markers.length) map.fitBounds(window.L.latLngBounds(markers.map((x) => [x.p.lat, x.p.lon])), { padding: [40, 40] });
    else map.setView([39.8, -98.6], 3);
  }

  // ---------- Cards ----------
  function cardsView() {
    const s = activeSeason();
    const newSeason = () => {
      const name = prompt("Season name", L.suggestedSeasonName(new Date()));
      if (!name || !name.trim()) return;
      const ns = { id: uid(), name: name.trim().slice(0, 80), createdAt: Date.now() };
      db.seasons.push(ns); db.activeSeasonId = ns.id; save(); render();
    };
    if (!s) return screen({ title: "Cards", body: [h("div", { class: "empty", text: "Start a season like “" + L.suggestedSeasonName(new Date()) + "” to track who you've sent cards to." }),
      h("button", { class: "pillbtn", text: "Start a Season", onclick: newSeason })] });
    const everyone = L.sortPeople(db.people, "lastName");
    const tl = L.tally(everyone.map((p) => cardState(s, p)));
    const shown = everyone.filter((p) => {
      const st = cardState(s, p) || {};
      return ui.cardsFilter === "notSent" ? !st.sent : ui.cardsFilter === "received" ? st.received && !st.sent : true;
    });
    const seasonSel = h("select", { class: "pill", "aria-label": "Season", onchange: (e) => { db.activeSeasonId = e.target.value; save(); render(); } },
      db.seasons.map((x) => h("option", { value: x.id, text: x.name })));
    seasonSel.value = s.id;
    const filt = (k, label) => h("button", { class: "chip" + (ui.cardsFilter === k ? " on" : ""), text: label, onclick: () => { ui.cardsFilter = k; render(); } });
    const pct = tl.total ? Math.round((tl.sent / tl.total) * 100) : 0;
    return screen({ title: "Cards", right: navBtn("New season", newSeason, { icon: "plus", aria: "New season" }), body: [
      h("div", { class: "chips" }, seasonSel),
      h("div", { class: "section" }, h("div", { class: "list" }, h("div", { class: "row", style: { display: "block" } },
        h("div", { text: tl.sent + " of " + tl.total + " sent", style: { fontWeight: 600 } }),
        h("div", { class: "sub", text: tl.received + " received" + (tl.receivedButNotSent ? " · " + tl.receivedButNotSent + " sent you one but haven't heard from you" : "") }),
        h("div", { class: "progress", role: "progressbar", "aria-valuenow": pct, "aria-valuemin": 0, "aria-valuemax": 100 }, h("div", { style: { width: pct + "%" } }))))),
      h("div", { class: "chips" }, filt("all", "Everyone"), filt("notSent", "Not sent yet (" + tl.notSent + ")"), filt("received", "Owe a reply (" + tl.receivedButNotSent + ")")),
      shown.length ? section(null, shown.map((p) => {
        const st = cardState(s, p) || {};
        return h("div", { class: "row indent" }, avatar(p),
          h("div", { class: "grow" }, h("div", { class: "title", text: fullName(p) }),
            L.hasMailingAddress(p) ? h("div", { class: "sub", text: L.cityLine(p) }) : h("div", { class: "warn", text: "No address" })),
          h("button", { class: "mini" + (st.sent ? " on" : ""), text: st.sent ? "Sent ✓" : "Sent", "aria-pressed": String(!!st.sent), onclick: () => setCard(s, p, "sent", !st.sent) }),
          h("button", { class: "mini recv" + (st.received ? " on" : ""), text: st.received ? "Got ✓" : "Got", "aria-pressed": String(!!st.received), onclick: () => setCard(s, p, "received", !st.received) }));
      })) : h("div", { class: "empty", text: "Everyone's done 🎉" }),
    ] });
  }

  // ---------- Settings + vCard import ----------
  // ---------- samples, backup, restore ----------
  function resetUi() { ui.stacks = { home: [], people: [], groups: [], map: [], cards: [] }; ui.groupFilter = ""; ui.mapGroup = ""; }
  function addSamples() {
    const smp = seed();
    const taken = new Set(db.people.map((p) => p.id).concat(db.groups.map((g) => g.id)));
    if (smp.people.some((p) => taken.has(p.id)) || smp.groups.some((g) => taken.has(g.id))) { toast("Sample people are already here"); return; }
    db.people.push(...smp.people); db.groups.push(...smp.groups);
    if (!db.seasons.length) { db.seasons = smp.seasons; db.cards = smp.cards; db.activeSeasonId = smp.activeSeasonId; }
    save(false);
  }
  function removeSamples() {
    const gone = new Set(db.people.filter((p) => p.isSample).map((p) => p.id));
    db.people = db.people.filter((p) => !p.isSample);
    db.groups = db.groups.filter((g) => !g.isSample).map((g) => Object.assign(g, { memberIds: g.memberIds.filter((m) => !gone.has(m)) }));
    for (const marks of Object.values(db.cards)) for (const pid of Object.keys(marks)) if (gone.has(pid)) delete marks[pid];
    save(false);
    return gone.size;
  }
  function firstRunSheet() {
    return { title: "Welcome to Postmark", body: [
      h("div", { class: "empty", text: "Keep addresses, birthdays and card lists in one place. Everything stays on this device." }),
      section(null, [
        row({ cls: "button", title: "Start empty", onclick: () => { firstRun = false; save(false); closeSheet(); } }),
        row({ cls: "button", title: "Explore with sample people", onclick: () => { firstRun = false; addSamples(); closeSheet(); toast("Sample people added"); } }),
      ], "Sample people are fictional. You can remove them any time in Settings, and your own entries stay."),
    ] };
  }
  const dayFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });
  const BACKUP_STALE_MS = 30 * 864e5;
  const needsBackup = () => db.people.some((p) => !p.isSample) && (!meta.lastBackupAt || Date.now() - meta.lastBackupAt > BACKUP_STALE_MS);
  function backupNow() {
    let out;
    try { out = window.PostmarkBackup.build(db, Date.now()); } catch (e) { toast("Couldn't make a backup: " + e.message, 5000); return; }
    const blob = new Blob([JSON.stringify(out, null, 1)], { type: "application/json" });
    const a = h("a", { href: URL.createObjectURL(blob), download: window.PostmarkBackup.fileName(Date.now()) });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    meta.lastBackupAt = Date.now(); saveMeta();
    toast("Backup saved. On iPhone, pick Files or iCloud Drive.", 3500);
    render();
  }
  function restorePreviewSheet(data, name) {
    const c = window.PostmarkBackup.summary(data);
    const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");
    return { title: "Restore", left: navBtn("Cancel", closeSheet), body: [
      section("This backup has", [
        row({ title: plural(c.people, "person").replace("persons", "people") }), row({ title: plural(c.groups, "group") }),
        row({ title: plural(c.seasons, "card season") }), row({ title: plural(c.cardMarks, "card mark") }),
      ], "From " + name + "."),
      section(null, [row({ cls: "button destructive", title: "Replace everything with this backup", onclick: () => {
        if (!confirm("Replace all " + db.people.length + " people, groups and card marks on this device with the backup? This can't be undone.")) return;
        const prev = db;
        db = data;
        if (!save(false)) { db = prev; return; }
        firstRun = false; resetUi(); closeSheet(); toast("Restored " + plural(c.people, "person").replace("persons", "people"));
      } })], "Tip: back up what's here first if you might want it later."),
    ] };
  }
  function readBackupFile(f) {
    if (!f) return;
    if (f.size > window.PostmarkBackup.MAX_FILE_BYTES) { toast("That file is too big to be a Postmark backup", 4000); return; }
    f.text().then((txt) => {
      let data;
      try { data = window.PostmarkBackup.parse(txt); } catch (e) {
        toast("Can't restore: " + (e instanceof window.PostmarkBackup.BackupError ? e.message : "unreadable file"), 5000); return;
      }
      openSheet(() => restorePreviewSheet(data, String(f.name).slice(0, 80)));
    }, () => toast("Couldn't read that file", 4000));
  }
  const PERSIST_TEXT = { granted: "Protected: the browser won't clear it to free space.", denied: "Not protected: the browser may clear it if space runs low. Keep backups.",
    unsupported: "This browser can't protect storage. Keep backups.", pending: "Asking the browser…" };
  function settingsSheet() {
    const file = h("input", { type: "file", accept: ".vcf,text/vcard,text/x-vcard", style: { display: "none" }, onchange: (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) { toast("That file is too big for the demo"); return; }
      f.text().then((txt) => openSheet(() => importPreviewSheet(L.parseVCards(txt))));
    } });
    const restore = h("input", { type: "file", accept: ".json,application/json", style: { display: "none" }, onchange: (e) => {
      readBackupFile(e.target.files && e.target.files[0]); e.target.value = ""; } });
    const nSample = db.people.filter((p) => p.isSample).length;
    return { title: "Settings", right: navBtn("Done", closeSheet, { bold: true }), body: [
      section("Backup", [
        row({ cls: "button", title: "Back up now", onclick: backupNow }),
        row({ cls: "button", title: "Restore from backup…", onclick: () => restore.click() }), restore,
        row({ title: "Last backup", trailing: meta.lastBackupAt ? dayFmt.format(new Date(meta.lastBackupAt)) : "Never" }),
      ], "Saves a .json file with everyone, groups and card marks. Keep it somewhere safe, like iCloud Drive."),
      section("Storage", [row({ title: "", extra: h("div", { class: "sub wrap", text: meta.persist ? PERSIST_TEXT[meta.persist] || meta.persist
        : "Postmark will ask the browser to protect your data after your first change." }) })]),
      section("Import", [row({ cls: "button", title: "Import contacts from a .vcf file…", onclick: () => file.click() }), file],
        "Import a vCard exported from Contacts, Google or Outlook."),
      section("Map", [row({ cls: "wrap-title", title: "Show map (loads map tiles from OpenStreetMap)", trailing: toggle(meta.showMap, (v) => { meta.showMap = v; saveMeta(); render(); }) })],
        "When on, the map asks OpenStreetMap for the map squares of the area you're looking at. Your addresses are never sent."),
      section("Sample people", [nSample
        ? row({ cls: "button destructive", title: "Remove sample people (" + nSample + ")", onclick: () => {
          if (!confirm("Remove the " + nSample + " sample people and sample groups? Your own people and groups stay.")) return;
          const n = removeSamples(); resetUi(); closeSheet(); toast("Removed " + n + " sample people"); } })
        : row({ cls: "button", title: "Add sample people", onclick: () => { addSamples(); resetUi(); closeSheet(); toast("Sample people added"); } })],
        "Sample people are fictional and marked as samples."),
      section("Privacy", [row({ title: "", extra: h("div", { class: "sub wrap",
        text: "Everything is stored only in this browser on this device. There's no account and nothing is uploaded. Anyone who can unlock this device can open Postmark." }) })]),
    ] };
  }
  function importPreviewSheet(found) {
    const sel = new Set(found.map((_, i) => i));
    const holder = h("div");
    const paint = () => holder.replaceChildren(found.length
      ? section(found.length + " contact" + (found.length === 1 ? "" : "s") + " found", found.map((p, i) => {
        const on = sel.has(i);
        return h("button", { class: "row tappable", role: "checkbox", "aria-checked": String(on), onclick: () => { on ? sel.delete(i) : sel.add(i); paint(); } },
          h("span", { class: "check" + (on ? " on" : "") }, on ? icon("check") : null),
          h("div", { class: "grow" }, h("div", { class: "title", text: fullName(p) }),
            h("div", { class: "sub", text: L.hasMailingAddress(p) ? L.envelopeLines(p).slice(1).join(", ") : "No address" })));
      }), "Imported people won't have map pins in the demo; the iPhone app looks addresses up automatically.")
      : h("div", { class: "empty", text: "No contacts with a name were found in that file." }));
    paint();
    return { title: "Import", left: navBtn("Cancel", closeSheet), right: navBtn("Add", () => {
      const now = Date.now();
      found.forEach((p, i) => { if (sel.has(i)) db.people.push(Object.assign(blankPerson(), p, { id: uid(), createdAt: now + i })); });
      save(); closeSheet(); toast("Added " + sel.size + (sel.size === 1 ? " person" : " people"));
    }, { bold: true }), body: holder };
  }

  // ---------- render ----------
  function currentView() {
    const top = ui.stacks[ui.tab][ui.stacks[ui.tab].length - 1];
    if (top && top.kind === "person") return personView(top.id);
    if (top && top.kind === "group") return groupView(top.id);
    return { home: homeView, people: peopleView, groups: groupsView, map: mapView, cards: cardsView }[ui.tab]();
  }
  const TABS = [["home", "Home", "home"], ["people", "People", "people"], ["groups", "Groups", "groups"], ["map", "Map", "map"], ["cards", "Cards", "cards"]];
  function render() {
    if (map && ui.tab !== "map") { map.remove(); map = null; }
    const scroller = app.querySelector(":scope > .content");
    const keepScroll = scroller && app.dataset.view === viewKey() ? scroller.scrollTop : 0;
    const tabbar = h("nav", { class: "tabbar", "aria-label": "Tabs" }, TABS.map(([k, label, ic]) => h("button", {
      class: ui.tab === k ? "on" : "", "aria-current": ui.tab === k ? "page" : null,
      onclick: () => { if (ui.tab === k) ui.stacks[k] = []; ui.tab = k; render(); } }, icon(ic), h("span", { text: label }))));
    app.replaceChildren(...currentView().filter(Boolean), tabbar);
    app.dataset.view = viewKey();
    const sc = app.querySelector(":scope > .content");
    if (sc) sc.scrollTop = keepScroll;
    if (ui.sheet) {
      const s = ui.sheet();
      const sheet = h("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": s.title },
        h("div", { class: "nav" }, h("div", { class: "side" }, s.left || null), h("div", { class: "inline-title", text: s.title }), h("div", { class: "side right" }, s.right || null)),
        h("div", { class: "content" }, s.body));
      app.append(h("div", { class: "sheet-backdrop", onclick: (e) => { if (e.target === e.currentTarget) closeSheet(); } }, sheet));
    }
  }
  function viewKey() { const st = ui.stacks[ui.tab]; const top = st[st.length - 1]; return ui.tab + ":" + (top ? top.kind + top.id : "root"); }
  function renderKeepFocus(key) {
    const el = document.activeElement, pos = el && el.selectionStart;
    render();
    const again = app.querySelector('[data-focus="' + key + '"]');
    if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } }
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ui.sheet) closeSheet(); });

  // Debug/test hook (used by the headless check); harmless in normal use.
  window.PostmarkDemo = { go: (tab) => { ui.tab = tab; render(); }, openSettings: () => openSheet(settingsSheet),
    openMail: () => openSheet(() => mailSheet(db.people.map((p) => p.id), "People")), labelPages: (n) => buildLabelSheet(db.people.slice(0, n)),
    importText: (txt) => openSheet(() => importPreviewSheet(L.parseVCards(txt))), db: () => db, meta: () => meta,
    backupJSON: () => JSON.stringify(window.PostmarkBackup.build(db, Date.now())),
    restoreText: (txt) => openSheet(() => restorePreviewSheet(window.PostmarkBackup.parse(txt), "test")) };
  if (firstRun) ui.sheet = firstRunSheet;
  render();
  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => { /* offline mode unavailable */ }); });
  }
})();
