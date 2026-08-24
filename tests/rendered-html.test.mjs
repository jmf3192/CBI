import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Conasoc home", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Conasoc \| Subvenciones, financiación pública y CBI<\/title>/i);
  assert.match(html, /Conasoc/);
  assert.match(html, /Más de 30 años/);
  assert.match(html, /Financiación pública/);
  assert.match(html, /Conasoc Business Intelligence/);
  assert.match(html, /638 84 12 38/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("server-renders the CBI route", async () => {
  const response = await render("/cbi");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Conasoc Business Intelligence/);
  assert.match(html, /Acceder a CBI/);
  assert.match(html, /Acceso a las herramientas CBI/);
  assert.match(html, /\/cbi\/interfaces\/acceso\.html/);
});

test("documents the site model and CBI migration", async () => {
  const model = await readFile(
    new URL("../docs/modelo-web-conasoc.md", import.meta.url),
    "utf8",
  );

  assert.match(model, /Web actual/);
  assert.match(model, /Web previa en Wix/);
  assert.match(model, /Decisión CBI/);
  assert.match(model, /Supabase Auth/);
});
