"use strict";

const INCREMENTS = { squat: 5, bench: 2.5, deadlift: 5 };

const MUSCLES = {
  quads: "Quads", hamstrings: "Hamstrings", glutes: "Glutes", "lower-back": "Lower back",
  chest: "Chest", triceps: "Triceps", "front-delts": "Front delts", "upper-back": "Upper back"
};

const EXERCISE_MUSCLES = {
  squat: { quads: 1, glutes: 1, "lower-back": 0.5, hamstrings: 0.5 },
  bench: { chest: 1, triceps: 0.5, "front-delts": 0.5 },
  deadlift: { hamstrings: 1, glutes: 1, "lower-back": 1, "upper-back": 0.5, quads: 0.5 },
  "front-squat": { quads: 1, glutes: 0.5, "upper-back": 0.5 },
  "pause-squat": { quads: 1, glutes: 1, "lower-back": 0.5, hamstrings: 0.5 },
  "romanian-deadlift": { hamstrings: 1, glutes: 0.5, "lower-back": 0.5 },
  "good-morning": { hamstrings: 1, "lower-back": 1, glutes: 0.5 },
  "close-grip-bench": { triceps: 1, chest: 0.5, "front-delts": 0.5 },
  "overhead-press": { "front-delts": 1, triceps: 0.5 },
  dip: { triceps: 1, chest: 0.5, "front-delts": 0.5 },
  "barbell-row": { "upper-back": 1, "lower-back": 0.5 },
  "pull-up": { "upper-back": 1 },
  "leg-press": { quads: 1, glutes: 0.5 },
  "hip-thrust": { glutes: 1, hamstrings: 0.5 },
  "back-extension": { "lower-back": 1, glutes: 0.5, hamstrings: 0.5 }
};

function muscleRecovery(records, now) {
  const hour = 60 * 60 * 1000;
  const recovery = Object.fromEntries(Object.keys(MUSCLES).map(key =>
    [key, { hoursSince: null, weeklySets: 0, recoveryHours: 48, fatigue: 0 }]));
  for (const record of records) {
    const time = Date.parse(record.createdAt);
    if (!Number.isFinite(time) || time > now ||
        !Object.prototype.hasOwnProperty.call(EXERCISE_MUSCLES, record.lift)) continue;
    for (const [key, factor] of Object.entries(EXERCISE_MUSCLES[record.lift])) {
      if (factor <= 0) continue;
      const muscle = recovery[key];
      const hoursSince = (now - time) / hour;
      muscle.hoursSince = muscle.hoursSince === null ? hoursSince : Math.min(muscle.hoursSince, hoursSince);
      if (time > now - 7 * 24 * hour) muscle.weeklySets += factor;
    }
  }
  for (const muscle of Object.values(recovery)) {
    muscle.recoveryHours = 48 + 4 * Math.min(muscle.weeklySets, 12);
    muscle.fatigue = muscle.hoursSince === null ? 0 :
      Math.max(0, Math.min(1, 1 - muscle.hoursSince / muscle.recoveryHours));
  }
  return recovery;
}

function fatigueColour(fatigue) {
  return `hsl(${Math.round(120 * (1 - fatigue))}, 70%, 45%)`;
}

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

const ATTEMPT_PERCENTS = {
  conservative: [0.88, 0.94, 0.98], standard: [0.91, 0.96, 1.00], aggressive: [0.93, 0.98, 1.025]
};
const WARMUP_STEPS = [[0.40, 5], [0.55, 3], [0.70, 2], [0.80, 1], [0.90, 1]];
const WEIGHT_CLASSES = {
  men: ["59", "66", "74", "83", "93", "105", "120", "120+"],
  women: ["47", "52", "57", "63", "69", "76", "84", "84+"]
};

function attemptPlan(max, strategy) {
  return ATTEMPT_PERCENTS[strategy].reduce((plan, percent) => {
    const weight = floorToIncrement(max * percent);
    plan.push(plan.length ? Math.max(weight, plan[plan.length - 1] + 2.5) : weight);
    return plan;
  }, []);
}

function warmupSets(opener) {
  return WARMUP_STEPS.reduce((sets, [fraction, reps]) => {
    const weight = Math.max(20, floorToIncrement(opener * fraction));
    if (weight < opener && weight !== sets[sets.length - 1]?.weight) sets.push({ weight, reps });
    return sets;
  }, []);
}

function classStatus(bodyweight, weightClass) {
  const limit = weightClass.endsWith("+") ? null : Number(weightClass);
  return { limit, diff: limit === null ? null : bodyweight - limit };
}

const MEET_KEY = "powerlifting-tracker-meet";

function defaultMeet() {
  return { maxes: { squat: null, bench: null, deadlift: null }, strategy: "standard",
    division: "men", weightClass: "83", bodyweights: [] };
}

function validMeetMax(value) {
  return Number.isFinite(value) && value > 0 && value <= 1000;
}

function loadMeet() {
  try {
    const stored = JSON.parse(localStorage.getItem(MEET_KEY));
    if (!stored || !["squat", "bench", "deadlift"].every(lift =>
      stored.maxes?.[lift] === null || validMeetMax(stored.maxes?.[lift])) ||
      !Object.prototype.hasOwnProperty.call(ATTEMPT_PERCENTS, stored.strategy) ||
      !Object.prototype.hasOwnProperty.call(WEIGHT_CLASSES, stored.division) ||
      !WEIGHT_CLASSES[stored.division].includes(stored.weightClass) ||
      !Array.isArray(stored.bodyweights) || !stored.bodyweights.every(entry =>
        entry && typeof entry.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) &&
        Number.isFinite(Date.parse(entry.date)) && new Date(entry.date).toISOString().slice(0, 10) === entry.date &&
        Number.isFinite(entry.kg) && entry.kg >= 20 && entry.kg <= 300)) return defaultMeet();
    return { maxes: { squat: stored.maxes.squat, bench: stored.maxes.bench, deadlift: stored.maxes.deadlift },
      strategy: stored.strategy, division: stored.division, weightClass: stored.weightClass,
      bodyweights: stored.bodyweights.map(({ date, kg }) => ({ date, kg })) };
  } catch {
    return defaultMeet();
  }
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

const TYPICAL_SHARE = { squat: 35, bench: 25, deadlift: 40 };

function weekStart(date) {
  const [year, month, day] = date.split("-").map(Number);
  const monday = new Date(year, month - 1, day);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return localDate(monday);
}

function dailyBestE1rm(records) {
  const labels = [...new Set(records.map(record => record.date))].sort();
  const series = {};
  for (const lift of Object.keys(TYPICAL_SHARE)) {
    series[lift] = labels.map(date => {
      const sets = records.filter(record => record.lift === lift && record.date === date);
      return sets.length ? Number(Math.max(...sets.map(set => epley(set.weight, set.reps))).toFixed(1)) : null;
    });
  }
  return { labels, series };
}

function weeklyTonnage(records, today, weeks = 8) {
  const [year, month, day] = weekStart(today).split("-").map(Number);
  const labels = Array.from({ length: weeks }, (_, index) =>
    localDate(new Date(year, month - 1, day - (weeks - 1 - index) * 7)));
  const series = Object.fromEntries(Object.keys(TYPICAL_SHARE).map(lift => [lift, labels.map(() => 0)]));
  for (const record of records) {
    const index = labels.indexOf(weekStart(record.date));
    if (index !== -1) series[record.lift][index] += record.weight * record.reps;
  }
  return { labels, series };
}

function prBoard(records) {
  const prs = {};
  const copySet = ({ weight, reps, date }) => ({ weight, reps, date });
  for (const lift of Object.keys(TYPICAL_SHARE)) {
    const sets = records.filter(record => record.lift === lift);
    if (!sets.length) {
      prs[lift] = null;
      continue;
    }
    const best = sets.reduce((best, set) => {
      const value = epley(set.weight, set.reps);
      const previous = epley(best.weight, best.reps);
      return value > previous || (value === previous && set.date < best.date) ? set : best;
    });
    const heaviest = sets.reduce((best, set) =>
      set.weight > best.weight || (set.weight === best.weight && set.date < best.date) ? set : best);
    prs[lift] = { bestE1rm: epley(best.weight, best.reps), bestSet: copySet(best), heaviestSet: copySet(heaviest) };
  }
  const lifts = Object.keys(TYPICAL_SHARE);
  prs.total = lifts.every(lift => prs[lift]) ? {
    e1rm: lifts.reduce((total, lift) => total + prs[lift].bestE1rm, 0),
    heaviest: lifts.reduce((total, lift) => total + prs[lift].heaviestSet.weight, 0)
  } : null;
  return prs;
}

function liftShares(prs) {
  return prs.total ? Object.fromEntries(Object.keys(TYPICAL_SHARE).map(lift =>
    [lift, prs[lift].bestE1rm / prs.total.e1rm * 100])) : null;
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
let analystRender = 0;
let recoveryRender = 0;
let charts = [];
let chartDefaultsSet = false;
let meet = loadMeet();

function saveMeet() {
  const status = document.querySelector("#meet-message");
  try {
    localStorage.setItem(MEET_KEY, JSON.stringify(meet));
    status.textContent = "";
  } catch (error) {
    status.textContent = `Could not save meet data; changes are only available until reload: ${error.message}`;
  }
}

function applyMeetMaxes() {
  for (const lift of Object.keys(names)) {
    const input = document.querySelector(`#meet-${lift}`);
    input.value = meet.maxes[lift] ?? "";
    input.setAttribute("aria-invalid", "false");
    document.querySelector(`#meet-${lift}-error`).textContent = "";
  }
}

function renderMeet() {
  document.querySelectorAll("[data-strategy]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.strategy === meet.strategy));
  });
  const body = document.querySelector("#attempt-table tbody");
  const warmups = document.querySelector("#warmup-list");
  body.replaceChildren();
  warmups.replaceChildren();
  let total = 0;
  for (const lift of Object.keys(names)) {
    const plan = meet.maxes[lift] === null ? null : attemptPlan(meet.maxes[lift], meet.strategy);
    const row = document.createElement("tr");
    const heading = document.createElement("th");
    heading.scope = "row";
    heading.textContent = names[lift];
    row.append(heading);
    for (const weight of plan || [null, null, null]) {
      const cell = document.createElement("td");
      cell.textContent = weight === null ? "—" : `${weight} kg`;
      row.append(cell);
    }
    body.append(row);
    if (plan) {
      total += plan[2];
      const item = document.createElement("li");
      item.textContent = `${names[lift]} · opener ${plan[0]} kg: ${warmupSets(plan[0])
        .map(set => `${set.weight}×${set.reps}`).join(" · ")}`;
      warmups.append(item);
    }
  }
  if (!warmups.children.length) {
    const item = document.createElement("li");
    item.textContent = "Enter a max to see warm-ups.";
    warmups.append(item);
  }
  document.querySelector("#attempt-total").textContent = Object.values(meet.maxes).every(value => value !== null)
    ? `Projected total: ${total} kg` : "Projected total: enter all three maxes.";
  document.querySelector("#meet-division").value = meet.division;
  const classes = document.querySelector("#meet-class");
  classes.replaceChildren(...WEIGHT_CLASSES[meet.division].map(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = `${value} kg`;
    return option;
  }));
  classes.value = meet.weightClass;
  const entries = [...meet.bodyweights].sort((a, b) => b.date.localeCompare(a.date));
  const latest = entries[0];
  let status = "Log your bodyweight to track your class.";
  if (latest) {
    const { diff } = classStatus(latest.kg, meet.weightClass);
    const rounded = diff === null ? null : Number(diff.toFixed(1));
    const comparison = rounded === null ? "no upper limit" : rounded === 0 ? "exactly at the limit" :
      `${Math.abs(rounded).toFixed(1)} kg ${rounded > 0 ? "over" : "under"} the limit`;
    status = `${meet.weightClass} kg class: ${latest.kg.toFixed(1)} kg on ${latest.date}, ${comparison}.`;
  }
  document.querySelector("#class-status").textContent = status;
  document.querySelector("#bodyweight-list").replaceChildren(...entries.slice(0, 5).map(entry => {
    const item = document.createElement("li");
    item.textContent = `${entry.date} · ${entry.kg.toFixed(1)} kg`;
    return item;
  }));
}

applyMeetMaxes();
document.querySelectorAll("[data-meet-max]").forEach(input => {
  input.addEventListener("input", () => {
    const value = input.value === "" ? null : Number(input.value);
    const valid = !input.validity.badInput && (value === null || validMeetMax(value));
    input.setAttribute("aria-invalid", String(!valid));
    document.querySelector(`#meet-${input.dataset.meetMax}-error`).textContent = valid ? "" :
      "Enter a max above 0 and up to 1000 kg. The last valid max is still active.";
    if (!valid) return;
    meet.maxes[input.dataset.meetMax] = value;
    saveMeet();
    renderMeet();
  });
});
document.querySelectorAll("[data-strategy]").forEach(button => {
  button.addEventListener("click", () => {
    meet.strategy = button.dataset.strategy;
    saveMeet();
    renderMeet();
  });
});
document.querySelector("#meet-use-prs").addEventListener("click", async () => {
  try {
    if (!database) throw new Error("Set storage is not ready. Try again once sets have loaded.");
    const prs = prBoard(await readSets());
    const skipped = [];
    for (const lift of Object.keys(names)) {
      if (!prs[lift]) continue;
      const value = Number(prs[lift].bestE1rm.toFixed(1));
      if (validMeetMax(value)) meet.maxes[lift] = value;
      else skipped.push(names[lift]);
    }
    applyMeetMaxes();
    saveMeet();
    renderMeet();
    if (skipped.length) document.querySelector("#meet-message").textContent +=
      ` ${skipped.join(", ")} e1RM exceeds 1000 kg; the current max was kept.`;
  } catch (error) {
    document.querySelector("#meet-message").textContent = `Could not load best e1RMs: ${error.message}`;
  }
});
document.querySelector("#meet-division").addEventListener("change", event => {
  meet.division = event.target.value;
  meet.weightClass = meet.division === "men" ? "83" : "63";
  saveMeet();
  renderMeet();
});
document.querySelector("#meet-class").addEventListener("change", event => {
  meet.weightClass = event.target.value;
  saveMeet();
  renderMeet();
});
document.querySelector("#bodyweight-form").addEventListener("submit", event => {
  event.preventDefault();
  const input = document.querySelector("#bodyweight");
  const kg = Number(input.value);
  const valid = !input.validity.badInput && Number.isFinite(kg) && kg >= 20 && kg <= 300;
  input.setAttribute("aria-invalid", String(!valid));
  document.querySelector("#bodyweight-error").textContent = valid ? "" : "Enter a bodyweight from 20 to 300 kg.";
  if (!valid) return;
  const date = localDate();
  meet.bodyweights = meet.bodyweights.filter(entry => entry.date !== date);
  meet.bodyweights.push({ date, kg });
  saveMeet();
  renderMeet();
});

function renderPrBoard(prs) {
  const body = document.querySelector("#pr-board tbody");
  body.replaceChildren();
  for (const lift of [...Object.keys(names), "total"]) {
    const pr = prs[lift];
    let best = "—";
    let heaviest = "—";
    if (pr && lift === "total") {
      best = `${pr.e1rm.toFixed(1)} kg`;
      heaviest = `${pr.heaviest} kg`;
    } else if (pr) {
      best = `${pr.bestE1rm.toFixed(1)} kg (${pr.bestSet.weight} × ${pr.bestSet.reps}, ${pr.bestSet.date})`;
      heaviest = `${pr.heaviestSet.weight} kg × ${pr.heaviestSet.reps} (${pr.heaviestSet.date})`;
    }
    const row = document.createElement("tr");
    const heading = document.createElement("th");
    heading.scope = "row";
    heading.textContent = names[lift] || "Total";
    row.append(heading);
    for (const text of [best, heaviest]) {
      const cell = document.createElement("td");
      cell.textContent = text;
      row.append(cell);
    }
    body.append(row);
  }
}

async function renderAnalyst() {
  const render = ++analystRender;
  charts.forEach(chart => chart.destroy());
  charts = [];
  document.querySelector("#analyst-empty").hidden = true;
  document.querySelector("#analyst-content").hidden = true;
  if (!database) return;
  try {
    const records = await readSets();
    if (render !== analystRender) return;
    document.querySelector("#analyst-empty").hidden = records.length !== 0;
    if (!records.length) return;
    document.querySelector("#analyst-content").hidden = false;
    const prs = prBoard(records);
    renderPrBoard(prs);
    const shares = liftShares(prs);
    const note = document.querySelector("#balance-note");
    document.querySelector("#balance-chart").parentElement.hidden = !shares;
    if (!shares) {
      note.textContent = "Log squat, bench and deadlift to see your balance.";
    } else {
      const largest = Object.keys(names).reduce((best, lift) =>
        Math.abs(shares[lift] - TYPICAL_SHARE[lift]) > Math.abs(shares[best] - TYPICAL_SHARE[best]) ? lift : best);
      const gap = shares[largest] - TYPICAL_SHARE[largest];
      note.textContent = Math.abs(gap) < 2
        ? "Balanced: every lift is within 2 points of the typical share."
        : `${names[largest]} is ${Math.abs(gap).toFixed(1)} points ${gap > 0 ? "above" : "below"} the typical share (${TYPICAL_SHARE[largest]}%).`;
    }
    document.querySelector("#charts-unavailable").hidden = Boolean(window.Chart);
    document.querySelector("#analyst-charts").hidden = !window.Chart;
    if (!window.Chart) return;
    if (!chartDefaultsSet) {
      window.Chart.defaults.color = "#edf2f7";
      window.Chart.defaults.borderColor = "#2d3a4a";
      chartDefaultsSet = true;
    }
    const colours = { squat: "#a3e6ba", bench: "#7cc4fa", deadlift: "#f4cc79" };
    const options = () => ({ responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { position: "bottom" } } });
    const draw = (id, type, data, scales) => {
      charts.push(new window.Chart(document.querySelector(id), { type, data, options: { ...options(), scales } }));
    };
    const datasets = series => Object.keys(names).map(lift => ({
      label: names[lift], data: series[lift], borderColor: colours[lift], backgroundColor: colours[lift]
    }));
    const daily = dailyBestE1rm(records);
    draw("#e1rm-chart", "line", { labels: daily.labels,
      datasets: datasets(daily.series).map(dataset => ({ ...dataset, spanGaps: true }))
    }, { y: { title: { display: true, text: "e1RM (kg)" } } });
    const weekly = weeklyTonnage(records, localDate());
    draw("#tonnage-chart", "bar", { labels: weekly.labels, datasets: datasets(weekly.series)
    }, { y: { beginAtZero: true, title: { display: true, text: "kg lifted (weight × reps)" } } });
    if (shares) {
      draw("#balance-chart", "radar", { labels: Object.values(names), datasets: [
        { label: "You", data: Object.keys(names).map(lift => Number(shares[lift].toFixed(1))),
          borderColor: "#a3e6ba", backgroundColor: "#a3e6ba33" },
        { label: "Typical", data: Object.values(TYPICAL_SHARE), borderColor: "#a0aec0",
          backgroundColor: "#a0aec022", borderDash: [6, 4] }
      ] }, { r: { min: 0, max: 50 } });
    }
  } catch (error) {
    if (render !== analystRender) return;
    showError(`Could not load analysis: ${error.message}`);
  }
}

async function renderRecovery() {
  const render = ++recoveryRender;
  if (!database) return;
  try {
    const records = await readSets();
    if (render !== recoveryRender) return;
    const recovery = muscleRecovery(records, Date.now());
    document.querySelectorAll("#screen-recovery svg [data-muscle]").forEach(shape => {
      shape.setAttribute("fill", fatigueColour(recovery[shape.dataset.muscle].fatigue));
    });
    const list = document.querySelector("#recovery-list");
    list.replaceChildren();
    for (const [key, label] of Object.entries(MUSCLES)) {
      const { hoursSince, weeklySets, fatigue } = recovery[key];
      const item = document.createElement("li");
      item.dataset.muscle = key;
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.backgroundColor = fatigueColour(fatigue);
      swatch.setAttribute("aria-hidden", "true");
      const ago = hoursSince < 48 ? `${Math.round(hoursSince)} h ago` : `${Math.floor(hoursSince / 24)} d ago`;
      const text = hoursSince === null ? `${label}: rested · no sets logged` :
        `${label}: ${Math.round(fatigue * 100)}% fatigued · last trained ${ago} · ${Number(weeklySets.toFixed(1))} sets this week`;
      item.append(swatch, document.createTextNode(text));
      list.append(item);
    }
  } catch (error) {
    if (render !== recoveryRender) return;
    showError(`Could not load recovery: ${error.message}`);
  }
}

document.querySelectorAll("[data-screen]").forEach(button => {
  button.addEventListener("click", () => {
    const screen = button.dataset.screen;
    const active = document.querySelector(`#screen-${screen}`);
    document.querySelectorAll('[id^="screen-"]').forEach(panel => {
      panel.hidden = panel !== active;
    });
    // Keep the existing alert visible on whichever screen is active.
    if (screen === "log") form.after(message);
    else active.prepend(message);
    document.querySelectorAll("[data-screen]").forEach(toggle => {
      toggle.setAttribute("aria-pressed", String(toggle === button));
    });
    if (screen === "analyst") renderAnalyst();
    else ++analystRender;
    if (screen === "recovery") renderRecovery();
    else ++recoveryRender;
    if (screen === "meet") renderMeet();
  });
});

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
    if (!document.querySelector("#screen-analyst").hidden) await renderAnalyst();
    if (!document.querySelector("#screen-recovery").hidden) await renderRecovery();
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
