"use strict";

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
const saveButton = document.querySelector("#save");
const exportButton = document.querySelector("#export");
const message = document.querySelector("#message");
const names = { squat: "Squat", bench: "Bench", deadlift: "Deadlift" };
let lift = "squat";
let database;

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
    item.textContent = `${names[record.lift]} · ${record.weight} kg × ${record.reps} · Epley ${epley(record.weight, record.reps).toFixed(1)} kg`;
    list.append(item);
  });
  document.querySelector("#empty").textContent = records.length ? "" : "No sets yet today.";
}

document.querySelectorAll("[data-lift]").forEach(button => {
  button.addEventListener("click", () => {
    lift = button.dataset.lift;
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
    const transaction = database.transaction("sets", "readwrite");
    const done = transactionDone(transaction);
    const request = transaction.objectStore("sets").add(record);
    await Promise.all([requestResult(request), done]);
    saved = true;
    document.querySelector("#result-text").textContent =
      `${names[record.lift]} · ${weight} kg × ${reps}: Epley ${epley(weight, reps).toFixed(1)} kg · Brzycki ${brzycki(weight, reps).toFixed(1)} kg`;
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
