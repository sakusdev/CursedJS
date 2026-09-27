import "./style.css";

import apocalypseSource from "../../src/apocalypse.js?raw";
import coreSource from "../../src/index.js?raw";
import astSource from "../../src/ast-crimes.js?raw";
import eldritchSource from "../../src/eldritch.js?raw";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const input = $("#input");
const output = $("#output");
const seed = $("#seed");
const transformButton = $("#transform");
const transformState = $("#transform-state");
const consoleOutput = $("#console-output");

const sources = {
  apocalypse: apocalypseSource,
  core: coreSource,
  ast: astSource,
  eldritch: eldritchSource
};

const presets = {
  hello: `function greet(name) {
  const message = "Hello, " + name;
  console.log(message);
}

greet("World");`,
  unicode: `const message = "Hello, 世界 🌎";
const answer = 42;

console.log(message);
console.log("answer =", answer);`,
  objects: `const config = {
  "message": "technically valid",
  retries: 3,
  enabled: true
};

console.log(config.message);
console.log(config["retries"]);
console.log(config.enabled);`
};

let mode = "apocalypse";
let transformWorker = null;
let transformSequence = 0;
let lastStats = null;

function byteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}

function lineCount(value) {
  if (!value) return 0;
  return value.split(/\r?\n/).length;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function updateInputMeta() {
  $("#input-meta").textContent =
    `${formatBytes(byteLength(input.value))} · ${lineCount(input.value)} lines`;
}

function setMode(nextMode) {
  mode = nextMode;
  $$("[data-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
  transformState.textContent = "ready";
}

function resetTransformWorker() {
  transformWorker?.terminate();
  transformWorker = new Worker(
    new URL("./transform-worker.js", import.meta.url),
    { type: "module" }
  );
}

function setBusy(busy) {
  transformButton.disabled = busy;
  transformButton.textContent = busy ? "CURSING…" : "CURSE IT";
  transformState.textContent = busy ? "transforming" : "ready";
  transformState.classList.toggle("active", busy);
}

function updateStats(stats) {
  lastStats = stats;
  $("#stat-level").textContent = stats.level;
  $("#stat-ratio").textContent = stats.inputBytes === 0
    ? "—"
    : `${(stats.ratio * 100).toFixed(1)}%`;

  if (stats.astCrimes) {
    const a = stats.astCrimes;
    $("#stat-ast").textContent =
      `${a.numbers + a.booleans + a.strings + a.properties} hits`;
  } else {
    $("#stat-ast").textContent = "—";
  }

  const crimes = stats.apocalypseCrimes ?? stats.eldritchCrimes;
  if (crimes) {
    const mined = crimes.minedCharacters ?? 0;
    const total = crimes.characters ?? 0;
    $("#stat-glyphs").textContent = `${mined}/${total}`;
  } else {
    $("#stat-glyphs").textContent = "—";
  }

  $("#output-meta").textContent =
    `${formatBytes(stats.outputBytes)} · ${stats.outputLines} line`;
}

async function transform() {
  setBusy(true);
  transformState.textContent = "parsing AST";

  resetTransformWorker();
  const id = ++transformSequence;
  const worker = transformWorker;

  const timeout = setTimeout(() => {
    worker.terminate();
    if (id === transformSequence) {
      setBusy(false);
      transformState.textContent = "timed out";
      writeConsole("error", "Transformation exceeded 12 seconds and was terminated.");
    }
  }, 12000);

  worker.onmessage = (event) => {
    if (event.data.id !== id) return;

    clearTimeout(timeout);
    setBusy(false);

    if (!event.data.ok) {
      transformState.textContent = "failed";
      writeConsole("error", event.data.error);
      return;
    }

    const result = event.data.result;
    output.value = result.code;
    updateStats(result.stats);
    transformState.textContent = "cursed";
  };

  worker.postMessage({
    id,
    source: input.value,
    level: mode,
    seed: Number(seed.value) || 0
  });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function writeConsole(kind, text) {
  if (consoleOutput.querySelector(".console-muted")) {
    consoleOutput.textContent = "";
  }

  const prefix = {
    log: ">",
    info: "i",
    warn: "!",
    error: "×",
    system: "#"
  }[kind] ?? ">";

  const line = document.createElement("span");
  line.className = `console-line ${kind}`;
  line.textContent = `${prefix} ${text}\n`;
  consoleOutput.appendChild(line);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function runCode(code, label) {
  if (!code.trim()) {
    writeConsole("warn", `${label}: nothing to run`);
    return;
  }

  writeConsole("system", `running ${label} in disposable worker`);

  const worker = new Worker(
    new URL("./execute-worker.js", import.meta.url)
  );

  const timeout = setTimeout(() => {
    worker.terminate();
    writeConsole("error", `${label}: execution timed out after 2s`);
  }, 2000);

  worker.onmessage = (event) => {
    const message = event.data;

    if (message.type === "console") {
      writeConsole(message.kind, message.text);
    } else if (message.type === "error") {
      clearTimeout(timeout);
      writeConsole("error", message.text);
      worker.terminate();
    } else if (message.type === "done") {
      clearTimeout(timeout);
      writeConsole("system", `${label}: process completed`);
      worker.terminate();
    }
  };

  worker.onerror = (event) => {
    clearTimeout(timeout);
    writeConsole("error", event.message || `${label}: worker error`);
    worker.terminate();
  };

  worker.postMessage({ code });
}

async function copyOutput() {
  if (!output.value) return;

  try {
    await navigator.clipboard.writeText(output.value);
    const button = $("#copy-output");
    const old = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => {
      button.textContent = old;
    }, 900);
  } catch {
    writeConsole("warn", "Clipboard permission was denied.");
  }
}

function renderSource(name) {
  const source = sources[name];
  $("#source-code").innerHTML = escapeHtml(source);
  $("#source-lines").textContent = `${lineCount(source)} lines`;

  $$("[data-source]").forEach((button) => {
    button.classList.toggle("active", button.dataset.source === name);
  });
}

$$("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

$$("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => {
    input.value = presets[button.dataset.preset];
    updateInputMeta();
    transform();
  });
});

$$("[data-source]").forEach((button) => {
  button.addEventListener("click", () => renderSource(button.dataset.source));
});

input.addEventListener("input", updateInputMeta);
transformButton.addEventListener("click", transform);
$("#run-original").addEventListener("click", () => runCode(input.value, "original"));
$("#run-output").addEventListener("click", () => runCode(output.value, "cursed"));
$("#copy-output").addEventListener("click", copyOutput);
$("#clear-console").addEventListener("click", () => {
  consoleOutput.innerHTML =
    '<span class="console-muted">Console cleared.</span>';
});

input.value = presets.unicode;
updateInputMeta();
renderSource("apocalypse");
setMode("apocalypse");
transform();

window.addEventListener("beforeunload", () => {
  transformWorker?.terminate();
});
