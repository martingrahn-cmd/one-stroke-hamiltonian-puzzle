import { OneStrokeApp } from "./game/app.js";

const app = new OneStrokeApp();

// Expose for devtools debugging
window.__oneStroke = app;

// Register service worker for PWA / offline support
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
