import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
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

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, developmentPreviewMeta);
  assert.match(html, /data-scene="OPENING"/);
  assert.match(html, /Five deliberate steps\./);
  assert.match(html, /data-scene="PROOF LEDGER"/);
  assert.match(html, /REAL FIELD CASE/);
  assert.match(html, /data-scene="CASE ATLAS"/);
  assert.match(html, /data-scene="ROLE FIT"/);
  assert.match(html, /VIEW PUBLIC SOURCE/);
  assert.match(html, /PLAY THE TRANSFORMATION/);

  const clearLoopResponse = await worker.fetch(
    new Request("http://localhost/clearloop", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(clearLoopResponse.status, 200);
  const clearLoopHtml = await clearLoopResponse.text();
  assert.match(clearLoopHtml, /CONTROLLED DEMO/);
  assert.match(clearLoopHtml, /REAL \/ ANONYMIZED/);
});
