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
  assert.match(html, /más de 30 años/i);
  assert.match(html, /Financiación y Consultoría/);
  assert.match(html, /Servicios Jurídicos/);
  assert.match(html, /Clientes/);
  assert.match(html, /Probono/);
  assert.match(html, /Convenios/);
  assert.match(html, /638 84 12 38/);
  assert.match(html, /href="\/cbi"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton|conasoc-nosotros|puntuación estimada/i);
});

test("server-renders the CBI route", async () => {
  const response = await render("/cbi");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Conasoc Business Intelligence/);
  assert.match(html, /Entrar en CBI/);
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
