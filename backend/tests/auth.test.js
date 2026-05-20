import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { createClock } from "../src/domain/clock.js";
import { createIdFactory } from "../src/domain/ids.js";

const fixedClock = () => createClock({ fixed: "2026-01-01T00:00:00.000Z" });

function app(env = {}) {
  return createApp({
    env,
    clock: fixedClock(),
    ids: createIdFactory()
  });
}

test("POST /auth/register creates user and tenant", async () => {
  const api = app();
  const response = await api.dispatch({
    method: "POST",
    path: "/auth/register",
    body: {
      email: "newuser@example.com",
      password: "securepassword123",
      name: "New User",
      company_name: "Test Company"
    }
  });

  assert.equal(response.status, 201);
  assert.ok(response.body.user);
  assert.ok(response.body.user.id);
  assert.equal(response.body.user.email, "newuser@example.com");
  assert.equal(response.body.user.name, "New User");
  assert.ok(response.body.token);
  assert.ok(response.body.tenant);
  assert.equal(response.body.tenant.name, "Test Company");
});

test("POST /auth/register rejects duplicate email", async () => {
  const api = app();

  // First registration
  await api.dispatch({
    method: "POST",
    path: "/auth/register",
    body: {
      email: "duplicate@example.com",
      password: "password123",
      name: "First User"
    }
  });

  // Second registration with same email
  const response = await api.dispatch({
    method: "POST",
    path: "/auth/register",
    body: {
      email: "duplicate@example.com",
      password: "password456",
      name: "Second User"
    }
  });

  assert.equal(response.status, 409);
  assert.equal(response.body.error, "EMAIL_EXISTS");
});

test("POST /auth/register requires email and password", async () => {
  const api = app();

  const response = await api.dispatch({
    method: "POST",
    path: "/auth/register",
    body: {
      email: "test@example.com"
      // password missing
    }
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "INVALID_REQUEST");
});

test("POST /auth/login returns token for valid credentials", async () => {
  const api = app();

  // Register first
  const registerRes = await api.dispatch({
    method: "POST",
    path: "/auth/register",
    body: {
      email: "loginuser@example.com",
      password: "loginpassword123",
      name: "Login User"
    }
  });

  assert.equal(registerRes.status, 201);

  // Login with same credentials
  const loginRes = await api.dispatch({
    method: "POST",
    path: "/auth/login",
    body: {
      email: "loginuser@example.com",
      password: "loginpassword123"
    }
  });

  assert.equal(loginRes.status, 200);
  assert.ok(loginRes.body.user);
  assert.ok(loginRes.body.token);
  assert.equal(loginRes.body.user.email, "loginuser@example.com");
});

test("POST /auth/login rejects invalid password", async () => {
  const api = app();

  // Register first
  await api.dispatch({
    method: "POST",
    path: "/auth/register",
    body: {
      email: "wrongpass@example.com",
      password: "correctpassword",
      name: "Wrong Pass User"
    }
  });

  // Login with wrong password
  const response = await api.dispatch({
    method: "POST",
    path: "/auth/login",
    body: {
      email: "wrongpass@example.com",
      password: "wrongpassword"
    }
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.error, "INVALID_CREDENTIALS");
});

test("POST /auth/login rejects unknown email", async () => {
  const api = app();

  const response = await api.dispatch({
    method: "POST",
    path: "/auth/login",
    body: {
      email: "nonexistent@example.com",
      password: "anypassword"
    }
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.error, "INVALID_CREDENTIALS");
});

test("token can be used to access protected endpoints", async () => {
  const api = app();

  // Register and get token
  const registerRes = await api.dispatch({
    method: "POST",
    path: "/auth/register",
    body: {
      email: "protected@example.com",
      password: "protectedpass123",
      name: "Protected User"
    }
  });

  const token = registerRes.body.token;

  // Access creative-projects with token
  const createRes = await api.dispatch({
    method: "POST",
    path: "/creative-projects",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: {
      name: "Test Project",
      creative_subject: {
        subject_type: "product",
        name: "Test Product",
        allowed_claims: ["Test claim"],
        forbidden_claims: [],
        unknown_fields: [],
        source: "user_input"
      },
      source_assets: [
        {
          asset_type: "image",
          source: "external_url",
          url: "https://example.com/image.jpg"
        }
      ]
    }
  });

  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.creative_project.tenant_id, registerRes.body.user.tenant_id);
});

test("requests without token fall back to demo tenant in mock mode", async () => {
  const api = app();

  const response = await api.dispatch({
    method: "POST",
    path: "/creative-projects",
    headers: {},
    body: {
      name: "Demo Project",
      creative_subject: {
        subject_type: "product",
        name: "Demo Product",
        allowed_claims: ["Demo claim"],
        forbidden_claims: [],
        unknown_fields: [],
        source: "mock"
      },
      source_assets: [
        {
          asset_type: "image",
          source: "mock",
          url: "https://example.com/mock.jpg"
        }
      ]
    }
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.creative_project.tenant_id, "demo-tenant");
});

console.log("Auth tests loaded successfully");
