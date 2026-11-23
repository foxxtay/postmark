/* Postmark backup file: build and strictly validate. Pure logic, no DOM.
   A backup file is untrusted input: every field is type- and length-checked and
   copied into fresh objects; anything unexpected rejects the whole file.
   Works in the browser (window.PostmarkBackup) and in Node (module.exports). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PostmarkBackup = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const APP = "postmark";
  const SCHEMA_VERSION = 1;
  const MAX_FILE_BYTES = 10 * 1024 * 1024;
  const LIMITS = { people: 20000, groups: 1000, seasons: 500 };
  const ID_MAX = 64;
  const PERSON_TEXT = { firstName: 200, lastName: 200, householdName: 300, street1: 300, street2: 300, city: 200,
    state: 100, postalCode: 40, country: 100, phone: 100, email: 320, birthday: 10, notes: 5000 };
  const BAD_KEYS = new Set(["__proto__", "constructor", "prototype"]);

  class BackupError extends Error {}
  const fail = (msg) => { throw new BackupError(msg); };
  const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

  function str(v, max, where, { optional = true } = {}) {
    if (v === undefined || v === null) { if (optional) return ""; fail(where + " is missing"); }
    if (typeof v !== "string") fail(where + " must be text");
    if (v.length > max) fail(where + " is too long");
    if (!optional && !v.trim()) fail(where + " is missing");
    return v;
  }
  function id(v, where) {
    const s = str(v, ID_MAX, where, { optional: false });
    if (!s || BAD_KEYS.has(s)) fail(where + " is not a valid id");
    return s;
  }
  function bool(v, where) {
    if (v === undefined || v === null) return false;
    if (typeof v !== "boolean") fail(where + " must be true or false");
    return v;
  }
  function num(v, where, min, max, { nullable = false } = {}) {
    if (v === undefined || v === null) { if (nullable) return null; return 0; }
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) fail(where + " is out of range");
    return v;
  }
  function arr(v, max, where) {
    if (!Array.isArray(v)) fail(where + " must be a list");
    if (v.length > max) fail(where + " has too many entries");
    return v;
  }
  const TIME_MAX = 8.64e15;

  function person(p, i) {
    const w = "Person " + (i + 1);
    if (!isObj(p)) fail(w + " is not an object");
    const out = { id: id(p.id, w + " id") };
    for (const [k, max] of Object.entries(PERSON_TEXT)) out[k] = str(p[k], max, w + " " + k);
    if (out.birthday && !/^\d{4}-\d{2}-\d{2}$/.test(out.birthday)) fail(w + " birthday must look like YYYY-MM-DD");
    out.isFavorite = bool(p.isFavorite, w + " isFavorite");
    out.isSample = bool(p.isSample, w + " isSample");
    out.createdAt = num(p.createdAt, w + " createdAt", 0, TIME_MAX);
    out.lat = num(p.lat, w + " lat", -90, 90, { nullable: true });
    out.lon = num(p.lon, w + " lon", -180, 180, { nullable: true });
    if ((out.lat === null) !== (out.lon === null)) fail(w + " has half a map location");
    return out;
  }
  function group(g, i, personIds) {
    const w = "Group " + (i + 1);
    if (!isObj(g)) fail(w + " is not an object");
    const memberIds = arr(g.memberIds === undefined ? [] : g.memberIds, LIMITS.people, w + " members")
      .map((m, j) => id(m, w + " member " + (j + 1)));
    for (const m of memberIds) if (!personIds.has(m)) fail(w + " lists a person who isn't in the backup");
    const color = str(g.color, 20, w + " color");
    if (color && !/^[a-z]+$/.test(color)) fail(w + " color is not valid");
    return { id: id(g.id, w + " id"), name: str(g.name, 200, w + " name", { optional: false }), emoji: str(g.emoji, 16, w + " emoji"),
      color, memberIds: [...new Set(memberIds)], isSample: bool(g.isSample, w + " isSample"),
      createdAt: num(g.createdAt, w + " createdAt", 0, TIME_MAX) };
  }
  function season(s, i) {
    const w = "Season " + (i + 1);
    if (!isObj(s)) fail(w + " is not an object");
    return { id: id(s.id, w + " id"), name: str(s.name, 200, w + " name", { optional: false }),
      createdAt: num(s.createdAt, w + " createdAt", 0, TIME_MAX) };
  }
  function cards(c, seasonIds, personIds) {
    if (c === undefined || c === null) return {};
    if (!isObj(c)) fail("Card marks must be an object");
    const out = {};
    for (const [sid, marks] of Object.entries(c)) {
      if (BAD_KEYS.has(sid) || !seasonIds.has(sid)) fail("Card marks refer to a season that isn't in the backup");
      if (!isObj(marks)) fail("Card marks for a season must be an object");
      const so = {};
      for (const [pid, m] of Object.entries(marks)) {
        if (BAD_KEYS.has(pid) || !personIds.has(pid)) fail("Card marks refer to a person who isn't in the backup");
        if (!isObj(m)) fail("A card mark is not an object");
        so[pid] = { sent: bool(m.sent, "Card mark sent"), received: bool(m.received, "Card mark received") };
      }
      out[sid] = so;
    }
    return out;
  }
  function unique(list, what) {
    const s = new Set();
    for (const x of list) { if (s.has(x.id)) fail("Two " + what + " share the same id"); s.add(x.id); }
    return s;
  }

  /** Validate parsed JSON; returns a clean copy of the data or throws BackupError. */
  function validate(obj) {
    if (!isObj(obj)) fail("This isn't a Postmark backup file");
    if (obj.app !== APP) fail("This isn't a Postmark backup file");
    if (obj.schemaVersion !== SCHEMA_VERSION) {
      if (typeof obj.schemaVersion === "number" && obj.schemaVersion > SCHEMA_VERSION) fail("This backup was made by a newer version of Postmark");
      fail("Unsupported backup version");
    }
    const d = obj.data;
    if (!isObj(d)) fail("The backup has no data section");
    const people = arr(d.people, LIMITS.people, "People").map(person);
    const personIds = unique(people, "people");
    const groups = arr(d.groups, LIMITS.groups, "Groups").map((g, i) => group(g, i, personIds));
    unique(groups, "groups");
    const seasons = arr(d.seasons === undefined ? [] : d.seasons, LIMITS.seasons, "Seasons").map(season);
    const seasonIds = unique(seasons, "seasons");
    const c = cards(d.cards, seasonIds, personIds);
    let activeSeasonId = d.activeSeasonId == null ? null : id(d.activeSeasonId, "Active season");
    if (activeSeasonId && !seasonIds.has(activeSeasonId)) fail("The active season isn't in the backup");
    if (!activeSeasonId && seasons.length) activeSeasonId = seasons[seasons.length - 1].id;
    return { people, groups, seasons, cards: c, activeSeasonId };
  }

  /** Parse file text (untrusted) into clean data, or throw BackupError. */
  function parse(text) {
    if (typeof text !== "string") fail("Couldn't read that file");
    if (text.length > MAX_FILE_BYTES) fail("That file is too big to be a Postmark backup");
    let obj;
    try { obj = JSON.parse(text); } catch (e) { fail("That file isn't valid JSON"); }
    return validate(obj);
  }

  function countMarks(c) {
    let n = 0;
    for (const s of Object.values(c || {})) for (const m of Object.values(s)) if (m.sent || m.received) n++;
    return n;
  }
  function summary(data) {
    return { people: data.people.length, groups: data.groups.length, seasons: data.seasons.length, cardMarks: countMarks(data.cards) };
  }

  /** Build the backup object from app data (data is validated so the file we write is one we can read). */
  function build(db, now) {
    // Drop dangling references (e.g. card marks for a deleted person) before strict validation.
    const pids = new Set((db.people || []).map((p) => p.id)), sids = new Set((db.seasons || []).map((s) => s.id));
    const cardsIn = {};
    for (const [sid, marks] of Object.entries(db.cards || {})) {
      if (!sids.has(sid) || !isObj(marks)) continue;
      cardsIn[sid] = {};
      for (const [pid, m] of Object.entries(marks)) if (pids.has(pid)) cardsIn[sid][pid] = m;
    }
    const pruned = { people: db.people || [], seasons: db.seasons || [], cards: cardsIn,
      groups: (db.groups || []).map((g) => Object.assign({}, g, { memberIds: (g.memberIds || []).filter((m) => pids.has(m)) })),
      activeSeasonId: sids.has(db.activeSeasonId) ? db.activeSeasonId : null };
    const data = validate({ app: APP, schemaVersion: SCHEMA_VERSION, data: pruned });
    return { app: APP, schemaVersion: SCHEMA_VERSION, exportedAt: new Date(now).toISOString(), data };
  }
  function fileName(now) {
    const d = new Date(now);
    return "postmark-backup-" + d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") + ".json";
  }

  return { APP, SCHEMA_VERSION, MAX_FILE_BYTES, BackupError, validate, parse, build, fileName, summary };
});
