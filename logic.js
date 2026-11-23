/* Postmark web demo: pure logic (no DOM). Mirrors Postmark.swiftpm/Logic/*.swift.
   Works in the browser (window.PostmarkLogic) and in Node (module.exports). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PostmarkLogic = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const DOMESTIC = new Set(["", "us", "u.s.", "usa", "u.s.a.", "united states", "united states of america"]);
  const t = (s) => (s == null ? "" : String(s)).trim();

  function fullName(first, last) {
    return [t(first), t(last)].filter(Boolean).join(" ");
  }
  function addressee(a) {
    const h = t(a.householdName);
    return h || fullName(a.firstName, a.lastName);
  }
  function cityLine(a) {
    const city = t(a.city);
    const stateZip = [t(a.state), t(a.postalCode)].filter(Boolean).join(" ");
    if (city && stateZip) return city + ", " + stateZip;
    return city || stateZip;
  }
  function isDomestic(a) {
    return DOMESTIC.has(t(a.country).toLowerCase());
  }
  function envelopeLines(a) {
    const lines = [addressee(a), t(a.street1), t(a.street2), cityLine(a)];
    if (!isDomestic(a)) lines.push(t(a.country).toUpperCase());
    return lines.filter(Boolean);
  }
  function envelope(a) {
    return envelopeLines(a).join("\n");
  }
  function envelopes(list) {
    return list.map(envelope).filter(Boolean).join("\n\n");
  }
  function hasMailingAddress(a) {
    return !!t(a.street1) && (!!t(a.city) || !!t(a.postalCode));
  }

  // ---- CSV (RFC 4180 + spreadsheet formula-injection guard) ----
  function csvEscape(field) {
    let f = field == null ? "" : String(field);
    if (/^[=+\-@\t\r]/.test(f)) f = "'" + f;
    const needsQuotes = /[",\n\r]/.test(f) || f.startsWith(" ") || f.endsWith(" ");
    return needsQuotes ? '"' + f.replace(/"/g, '""') + '"' : f;
  }
  function csvRow(fields) {
    return fields.map(csvEscape).join(",");
  }
  const CSV_HEADER = ["First Name", "Last Name", "Household", "Street 1", "Street 2", "City",
    "State", "Postal Code", "Country", "Phone", "Email", "Birthday", "Groups", "Envelope"];
  // people: [{...person, groups: [names]}]
  function csv(people) {
    const lines = [csvRow(CSV_HEADER)];
    for (const p of people) {
      lines.push(csvRow([p.firstName, p.lastName, p.householdName, p.street1, p.street2, p.city,
        p.state, p.postalCode, p.country, p.phone, p.email, p.birthday || "",
        (p.groups || []).slice().sort().join("; "), envelope(p)]));
    }
    return lines.join("\r\n") + "\r\n";
  }

  // ---- Sorting ----
  const SORTS = [
    ["lastName", "Last Name"], ["firstName", "First Name"], ["city", "City"],
    ["state", "State"], ["postalCode", "Postal Code"], ["recentlyAdded", "Recently Added"],
  ];
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  function cmp(a, b) {
    const x = t(a), y = t(b);
    if (!x && !y) return 0;
    if (!x) return 1; // empties last
    if (!y) return -1;
    return collator.compare(x, y);
  }
  function compareBy(sort, a, b) {
    let primary;
    switch (sort) {
      case "recentlyAdded": {
        const d = (b.createdAt || 0) - (a.createdAt || 0);
        if (d) return d;
        primary = [];
        break;
      }
      case "firstName": primary = [[a.firstName, b.firstName], [a.lastName, b.lastName]]; break;
      case "city": primary = [[a.city, b.city], [a.state, b.state]]; break;
      case "state": primary = [[a.state, b.state], [a.city, b.city]]; break;
      case "postalCode": primary = [[a.postalCode, b.postalCode]]; break;
      default: primary = [[a.lastName, b.lastName], [a.firstName, b.firstName]];
    }
    for (const [x, y] of primary.concat([[a.lastName, b.lastName], [a.firstName, b.firstName]])) {
      const r = cmp(x, y);
      if (r) return r;
    }
    return 0;
  }
  function sortPeople(list, sort) {
    return list.slice().sort((a, b) => compareBy(sort, a, b));
  }
  function matchesSearch(p, q) {
    q = t(q).toLowerCase();
    if (!q) return true;
    return ["firstName", "lastName", "householdName", "street1", "city", "state", "postalCode", "email", "phone", "notes"]
      .some((k) => t(p[k]).toLowerCase().includes(q));
  }

  // ---- Birthdays (dates as "YYYY-MM-DD"; year 1604 = year unknown, like iOS contacts) ----
  function parseISODay(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t(s));
    return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
  }
  const daysInMonth = (y, m) => new Date(y, m, 0).getDate();
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function nextOccurrence(bday, reference) {
    const b = parseISODay(bday);
    if (!b) return null;
    const today = startOfDay(reference);
    for (let y = today.getFullYear(); y <= today.getFullYear() + 1; y++) {
      const date = new Date(y, b.m - 1, Math.min(b.d, daysInMonth(y, b.m)));
      if (date >= today) return date;
    }
    return null;
  }
  function daysUntil(bday, reference) {
    const next = nextOccurrence(bday, reference);
    if (!next) return null;
    return Math.round((next - startOfDay(reference)) / 86400000);
  }
  function turningAge(bday, reference) {
    const b = parseISODay(bday), next = nextOccurrence(bday, reference);
    if (!b || !next || b.y <= 1900) return null;
    return next.getFullYear() - b.y;
  }
  function upcomingBirthdays(people, withinDays, reference) {
    return people.map((p) => {
      const n = p.birthday ? daysUntil(p.birthday, reference) : null;
      return n == null || n > withinDays ? null : { person: p, date: nextOccurrence(p.birthday, reference), daysAway: n };
    }).filter(Boolean).sort((a, b) => a.daysAway - b.daysAway);
  }
  function isoDay(d) {
    const p = (n, w) => String(n).padStart(w, "0");
    return p(d.getFullYear(), 4) + "-" + p(d.getMonth() + 1, 2) + "-" + p(d.getDate(), 2);
  }

  // ---- Cards ----
  function suggestedSeasonName(date) {
    const y = date.getFullYear();
    return "Christmas " + (date.getMonth() === 0 ? y - 1 : y);
  }
  function tally(states) {
    const r = { total: 0, sent: 0, received: 0, receivedButNotSent: 0 };
    for (const s0 of states) {
      const s = s0 || {};
      r.total++;
      if (s.sent) r.sent++;
      if (s.received) r.received++;
      if (s.received && !s.sent) r.receivedButNotSent++;
    }
    r.notSent = r.total - r.sent;
    return r;
  }

  // ---- Avery 5160 (inches) ----
  const AVERY_5160 = { pageW: 8.5, pageH: 11, top: 0.5, left: 0.1875, labelW: 2.625, labelH: 1,
    hPitch: 2.75, vPitch: 1, columns: 3, rows: 10 };
  function labelPosition(index, L = AVERY_5160) {
    const per = L.columns * L.rows, slot = index % per;
    const row = Math.floor(slot / L.columns), col = slot % L.columns;
    return { page: Math.floor(index / per), x: L.left + col * L.hPitch, y: L.top + row * L.vPitch };
  }
  function pageCount(n, L = AVERY_5160) {
    const per = L.columns * L.rows;
    return n <= 0 ? 0 : Math.ceil(n / per);
  }

  // ---- vCard 3/4 parsing (untrusted input: returns plain strings only) ----
  function unfold(text) {
    return String(text).replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "");
  }
  function unescapeValue(v) {
    return v.replace(/\\([nN,;\\])/g, (_, c) => (c === "n" || c === "N" ? "\n" : c));
  }
  function splitComponents(v) {
    const out = [];
    let cur = "";
    for (let i = 0; i < v.length; i++) {
      const c = v[i];
      if (c === "\\" && i + 1 < v.length) { cur += c + v[i + 1]; i++; continue; }
      if (c === ";") { out.push(cur); cur = ""; continue; }
      cur += c;
    }
    out.push(cur);
    return out.map((s) => unescapeValue(s).trim());
  }
  function parseBday(v) {
    v = t(v).replace(/^value=date:/i, "");
    let m;
    if ((m = /^(\d{4})-?(\d{2})-?(\d{2})/.exec(v))) return m[1] + "-" + m[2] + "-" + m[3];
    if ((m = /^--(\d{2})-?(\d{2})/.exec(v))) return "1604-" + m[1] + "-" + m[2];
    return "";
  }
  const LIMIT = 500;
  const clip = (s) => t(s).slice(0, LIMIT);
  function parseVCards(text, maxCards = 1000) {
    const cards = [];
    let cur = null;
    for (const raw of unfold(text).split("\n")) {
      const line = raw.trimEnd();
      if (!line) continue;
      if (/^BEGIN:VCARD$/i.test(line)) { cur = { props: [] }; continue; }
      if (/^END:VCARD$/i.test(line)) {
        if (cur) cards.push(toPerson(cur.props));
        cur = null;
        if (cards.length >= maxCards) break;
        continue;
      }
      if (!cur) continue;
      const colon = line.indexOf(":");
      if (colon < 0) continue;
      const head = line.slice(0, colon), value = line.slice(colon + 1);
      const parts = head.split(";");
      const name = parts[0].replace(/^[^.]*\./, "").toUpperCase(); // strip "item1." groups
      const params = parts.slice(1).join(";").toUpperCase();
      cur.props.push({ name, params, value });
    }
    return cards.filter((p) => p.firstName || p.lastName || p.householdName);
  }
  function pick(props, name) {
    const all = props.filter((p) => p.name === name);
    return all.find((p) => /PREF/.test(p.params)) || all[0] || null;
  }
  function toPerson(props) {
    const p = { firstName: "", lastName: "", householdName: "", street1: "", street2: "", city: "",
      state: "", postalCode: "", country: "USA", phone: "", email: "", birthday: "", notes: "" };
    const n = pick(props, "N");
    if (n) { const c = splitComponents(n.value); p.lastName = clip(c[0]); p.firstName = clip(c[1]); }
    const fn = pick(props, "FN");
    if (!p.firstName && !p.lastName && fn) {
      const name = clip(unescapeValue(fn.value));
      const sp = name.lastIndexOf(" ");
      if (sp > 0) { p.firstName = name.slice(0, sp); p.lastName = name.slice(sp + 1); } else p.firstName = name;
    }
    const org = pick(props, "ORG");
    if (!p.firstName && !p.lastName && org) p.householdName = clip(splitComponents(org.value)[0]);
    const adrs = props.filter((x) => x.name === "ADR");
    const adr = adrs.find((x) => /HOME/.test(x.params)) || pick(props, "ADR");
    if (adr) {
      const c = splitComponents(adr.value); // PO box; ext; street; city; region; code; country
      const streetLines = (c[2] || "").split("\n").map(t).filter(Boolean);
      p.street1 = clip(streetLines[0] || "");
      p.street2 = clip([c[1], ...streetLines.slice(1)].filter(Boolean).join(", "));
      p.city = clip(c[3]); p.state = clip(c[4]); p.postalCode = clip(c[5]);
      if (t(c[6])) p.country = clip(c[6]);
    }
    const tel = pick(props, "TEL");
    if (tel) p.phone = clip(tel.value.replace(/^tel:/i, ""));
    const email = pick(props, "EMAIL");
    if (email) p.email = clip(email.value.replace(/^mailto:/i, ""));
    const bday = pick(props, "BDAY");
    if (bday) p.birthday = parseBday(bday.value);
    return p;
  }

  return { fullName, addressee, cityLine, isDomestic, envelopeLines, envelope, envelopes, hasMailingAddress,
    csvEscape, csvRow, csv, CSV_HEADER, SORTS, sortPeople, matchesSearch, parseISODay, nextOccurrence,
    daysUntil, turningAge, upcomingBirthdays, isoDay, suggestedSeasonName, tally, AVERY_5160, labelPosition,
    pageCount, parseVCards };
});
