"use strict";

const INCREMENTS = { squat: 5, bench: 2.5, deadlift: 5 };

function floorToIncrement(value, step = 2.5) {
  const quotient = value / step;
  return Math.floor(quotient + Number.EPSILON * Math.max(1, Math.abs(quotient)) * 4) * step;
}

function sessionSuggestion(records, lift, today, range) {
  const earlier = records.filter(record => record.lift === lift && record.date < today);
  if (!earlier.length) return null;
  const date = earlier.reduce((latest, record) => record.date > latest ? record.date : latest, "");
  const session = earlier.filter(record => record.date === date);
  const total = session.length;
  const hitTop = session.filter(record => record.reps >= range.max).length;
  const baseWeight = session.reduce((heaviest, record) => Math.max(heaviest, record.weight), 0);
  const increase = hitTop === total;
  return { date, total, hitTop, baseWeight, suggestedWeight: baseWeight + (increase ? INCREMENTS[lift] : 0), increase };
}

function nextSetSuggestion(weight, rpe) {
  return typeof rpe === "number" && rpe >= 9
    ? { dropped: true, weight: floorToIncrement(weight * 0.95) }
    : { dropped: false, weight };
}

const SETTINGS_KEY = "powerlifting-tracker-settings";

function defaultSettings() {
  return { rpeEnabled: false, repRanges: { squat: { min: 3, max: 5 }, bench: { min: 3, max: 5 }, deadlift: { min: 3, max: 5 } } };
}

function validRange(range) {
  return range && Number.isInteger(range.min) && Number.isInteger(range.max) &&
    range.min >= 1 && range.max <= 20 && range.min <= range.max;
}

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (!stored || typeof stored.rpeEnabled !== "boolean" ||
        !["squat", "bench", "deadlift"].every(name => validRange(stored.repRanges?.[name]))) {
      return defaultSettings();
    }
    return { rpeEnabled: stored.rpeEnabled, repRanges: Object.fromEntries(
      ["squat", "bench", "deadlift"].map(name => [name, { min: stored.repRanges[name].min, max: stored.repRanges[name].max }])
    ) };
  } catch {
    return defaultSettings();
  }
}

function epley(weight, reps) {
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

function brzycki(weight, reps) {
  return reps === 1 ? weight : weight * 36 / (37 - reps);
}

function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onabort = () => reject(transaction.error || new Error("Storage transaction aborted."));
    transaction.onerror = () => reject(transaction.error || new Error("Storage transaction failed."));
  });
}

function openDatabase() {
  const request = indexedDB.open("powerlifting-tracker", 1);
  request.onupgradeneeded = () => {
    const store = request.result.createObjectStore("sets", { keyPath: "id", autoIncrement: true });
    store.createIndex("date", "date");
    store.createIndex("lift", "lift");
  };
  request.onblocked = () => showError("Storage is blocked. Close other app tabs and reload.");
  return requestResult(request);
}

const form = document.querySelector("#set-form");
const weightInput = document.querySelector("#weight");
const repsInput = document.querySelector("#reps");
const rpeInput = document.querySelector("#rpe");
const rpeEnabledInput = document.querySelector("#rpe-enabled");
const nextSet = document.querySelector("#next-set");
const saveButton = document.querySelector("#save");
const exportButton = document.querySelector("#export");
const message = document.querySelector("#message");
const names = { squat: "Squat", bench: "Bench", deadlift: "Deadlift" };
let lift = "squat";
let database;
let settings = loadSettings();
let coachRender = 0;

function applySettings() {
  rpeEnabledInput.checked = settings.rpeEnabled;
  document.querySelector("#rpe-field").hidden = !settings.rpeEnabled;
  for (const name of Object.keys(names)) {
    document.querySelector(`#${name}-min`).value = settings.repRanges[name].min;
    document.querySelector(`#${name}-max`).value = settings.repRanges[name].max;
  }
}

function saveSettings() {
  const status = document.querySelector("#settings-message");
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    status.textContent = "";
  } catch (error) {
    settings = defaultSettings();
    applySettings();
    status.textContent = `Could not save settings; defaults restored: ${error.message}`;
    renderCoach();
  }
}

applySettings();
rpeEnabledInput.addEventListener("change", () => {
  settings.rpeEnabled = rpeEnabledInput.checked;
  document.querySelector("#rpe-field").hidden = !settings.rpeEnabled;
  saveSettings();
});

document.querySelectorAll("[data-range]").forEach(row => {
  row.addEventListener("input", () => {
    const name = row.dataset.range;
    const minInput = document.querySelector(`#${name}-min`);
    const maxInput = document.querySelector(`#${name}-max`);
    const range = { min: Number(minInput.value), max: Number(maxInput.value) };
    const valid = validRange(range);
    document.querySelector(`#${name}-error`).textContent = valid ? "" :
      "Use whole-number reps from 1 to 20, with min no greater than max. Last valid range is still active.";
    minInput.setAttribute("aria-invalid", String(!valid));
    maxInput.setAttribute("aria-invalid", String(!valid));
    if (!valid) return;
    settings.repRanges[name] = range;
    saveSettings();
    if (lift === name) renderCoach();
  });
});

function showError(text) {
  message.textContent = text;
}

async function readSets(date) {
  const transaction = database.transaction("sets", "readonly");
  const done = transactionDone(transaction);
  const store = transaction.objectStore("sets");
  const request = date ? store.index("date").getAll(date) : store.getAll();
  const [records] = await Promise.all([requestResult(request), done]);
  return records;
}

async function renderToday() {
  const records = await readSets(localDate());
  const list = document.querySelector("#sets");
  list.replaceChildren();
  records.sort((a, b) => b.id - a.id).forEach(record => {
    const item = document.createElement("li");
    item.textContent = `${names[record.lift]} · ${record.weight} kg × ${record.reps}${rpeText(record)} · Epley ${epley(record.weight, record.reps).toFixed(1)} kg`;
    list.append(item);
  });
  document.querySelector("#empty").textContent = records.length ? "" : "No sets yet today.";
}

async function readLiftSets(selectedLift) {
  const transaction = database.transaction("sets", "readonly");
  const done = transactionDone(transaction);
  const request = transaction.objectStore("sets").index("lift").getAll(selectedLift);
  const [records] = await Promise.all([requestResult(request), done]);
  return records;
}

function rpeText(record) {
  return typeof record.rpe === "number" ? ` @ RPE ${record.rpe}` : "";
}

async function renderCoach() {
  const render = ++coachRender;
  const selectedLift = lift;
  const range = settings.repRanges[selectedLift];
  const target = document.querySelector("#session-target");
  if (!database) return;
  try {
    const records = await readLiftSets(selectedLift);
    if (render !== coachRender) return;
    const suggestion = sessionSuggestion(records, selectedLift, localDate(), range);
    const name = names[selectedLift];
    if (!suggestion) {
      target.textContent = `${name}: no earlier session yet. Pick a weight you can lift for ${range.min}–${range.max} reps.`;
    } else if (suggestion.increase) {
      target.textContent = `${name}: last session ${suggestion.date}, all ${suggestion.total} sets reached ${range.max} reps. Increase to ${suggestion.suggestedWeight} kg.`;
    } else {
      target.textContent = `${name}: last session ${suggestion.date}, ${suggestion.hitTop} of ${suggestion.total} sets reached ${range.max} reps. Stay at ${suggestion.baseWeight} kg until every set does.`;
    }
  } catch (error) {
    if (render !== coachRender) return;
    target.textContent = "Session target unavailable.";
    showError(`Could not load coach records: ${error.message}`);
  }
}

document.querySelectorAll("[data-lift]").forEach(button => {
  button.addEventListener("click", () => {
    lift = button.dataset.lift;
    nextSet.hidden = true;
    renderCoach();
    document.querySelectorAll("[data-lift]").forEach(toggle => {
      toggle.setAttribute("aria-pressed", String(toggle === button));
    });
  });
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  message.textContent = "";
  const weight = Number(weightInput.value);
  const reps = Number(repsInput.value);
  if (!Number.isFinite(weight) || weight <= 0 || weight > 1000 ||
      !Number.isInteger(reps) || reps < 1 || reps > 20) {
    showError("Enter a weight above 0 and up to 1000 kg, and whole-number reps from 1 to 20.");
    return;
  }
  if (!database || saveButton.disabled) return;
  saveButton.disabled = true;
  let saved = false;
  try {
    const now = new Date();
    const record = { lift, weight, reps, unit: "kg", date: localDate(now), createdAt: now.toISOString() };
    if (settings.rpeEnabled && rpeInput.value !== "") record.rpe = Number(rpeInput.value);
    const transaction = database.transaction("sets", "readwrite");
    const done = transactionDone(transaction);
    const request = transaction.objectStore("sets").add(record);
    await Promise.all([requestResult(request), done]);
    saved = true;
    rpeInput.value = "";
    const suggestion = nextSetSuggestion(weight, record.rpe);
    nextSet.hidden = !suggestion.dropped || lift !== record.lift;
    if (!nextSet.hidden) {
      nextSet.textContent = `Next set: ${suggestion.weight} kg (RPE ${record.rpe} on ${weight} kg, −5%).`;
      weightInput.value = suggestion.weight;
    }
    document.querySelector("#result-text").textContent =
      `${names[record.lift]} · ${weight} kg × ${reps}${rpeText(record)}: Epley ${epley(weight, reps).toFixed(1)} kg · Brzycki ${brzycki(weight, reps).toFixed(1)} kg`;
    document.querySelector("#result").hidden = false;
    await renderToday();
  } catch (error) {
    showError(`${saved ? "Set saved, but today's list could not refresh" : "Could not save set"}: ${error.message}`);
  } finally {
    saveButton.disabled = !database;
  }
});

exportButton.addEventListener("click", async () => {
  message.textContent = "";
  exportButton.disabled = true;
  let url;
  let link;
  try {
    const sets = await readSets();
    const now = new Date();
    const backup = { app: "powerlifting-tracker", schemaVersion: 1, exportedAt: now.toISOString(), sets };
    url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    link = document.createElement("a");
    link.href = url;
    link.download = `powerlifting-backup-${localDate(now)}.json`;
    document.body.append(link);
    link.click();
  } catch (error) {
    showError(`Could not export data: ${error.message}`);
  } finally {
    if (link) link.remove();
    if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
    exportButton.disabled = !database;
  }
});

async function initialize() {
  try {
    database = await openDatabase();
    database.onversionchange = () => {
      database.close();
      database = undefined;
      saveButton.disabled = true;
      exportButton.disabled = true;
      showError("Storage changed in another tab. Reload the app to continue.");
    };
    await renderToday();
    saveButton.disabled = false;
    await renderCoach();
    exportButton.disabled = false;
  } catch (error) {
    document.querySelector("#empty").textContent = "Sets could not be loaded.";
    showError(`Could not load storage: ${error.message}`);
  }
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("./service-worker.js");
    } catch (error) {
      showError(`Offline setup failed: ${error.message}`);
    }
  } else {
    showError("Offline mode is unavailable in this browser. Use localhost or HTTPS in a supported browser.");
  }
}

initialize();
