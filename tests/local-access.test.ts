import { test } from "node:test";
import assert from "node:assert/strict";
import { checkOrigin } from "../lib/server/security";

test("localhost login works beside 127.0.0.1 only in development; external origins and ports remain blocked", () => {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    APP_URL: process.env.APP_URL,
    NETLIFY: process.env.NETLIFY,
  };
  try {
    Object.assign(process.env, { NODE_ENV: "development" });
    process.env.APP_URL = "http://127.0.0.1:3000";
    delete process.env.NETLIFY;
    const request = (origin: string) =>
      new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { origin },
      });
    assert.doesNotThrow(() => checkOrigin(request("http://localhost:3000")));
    assert.throws(
      () => checkOrigin(request("http://localhost:4000")),
      /Origen/,
    );
    assert.throws(
      () => checkOrigin(request("https://external.test")),
      /Origen/,
    );
    Object.assign(process.env, { NODE_ENV: "production" });
    assert.throws(
      () => checkOrigin(request("http://localhost:3000")),
      /Origen/,
    );
    assert.doesNotThrow(() => checkOrigin(request("http://127.0.0.1:3000")));
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
