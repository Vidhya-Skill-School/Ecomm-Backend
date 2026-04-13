// test/test-app.js
import { initializeApp } from "../src/app.js";

let app = null;

export async function getTestApp() {
  if (!app) {
    app = await initializeApp();
  }
  return app;
}
