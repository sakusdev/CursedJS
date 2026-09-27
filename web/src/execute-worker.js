const stringify = (value) => {
  if (typeof value === "string") return value;
  if (typeof value === "undefined") return "undefined";
  if (typeof value === "function") return value.toString();

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const send = (kind, args) => {
  self.postMessage({
    type: "console",
    kind,
    text: args.map(stringify).join(" ")
  });
};

console.log = (...args) => send("log", args);
console.info = (...args) => send("info", args);
console.warn = (...args) => send("warn", args);
console.error = (...args) => send("error", args);

self.addEventListener("message", async (event) => {
  const { code } = event.data;

  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    await new AsyncFunction(code)();
    self.postMessage({ type: "done" });
  } catch (error) {
    self.postMessage({
      type: "error",
      text: error?.stack || error?.message || String(error)
    });
  }
});
