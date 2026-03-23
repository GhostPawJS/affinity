import { render } from "preact";
import { App } from "./app.tsx";

const host = document.getElementById("app");

if (host === null) {
  throw new Error("Affinity demo root element was not found.");
}

render(<App />, host);
