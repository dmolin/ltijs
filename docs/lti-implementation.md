# LTIJS LTI 1.3 Implementation Guide

This document explains how LTIJS implements the LTI 1.3 protocol, the key flows, and where to change behavior safely. It is intended for new developers onboarding to the codebase.

## Table of Contents

- [High-level architecture](#high-level-architecture)
- [Key modules and responsibilities](#key-modules-and-responsibilities)
- [Database schema overview](#database-schema-overview)
- [Core LTI 1.3 flow](#core-lti-13-flow)
  - [1) OIDC Login Initiation](#1-oidc-login-initiation)
  - [2) OIDC Auth Redirect to Platform](#2-oidc-auth-redirect-to-platform)
  - [3) LTI Launch (id_token POST back to tool)](#3-lti-launch-id_token-post-back-to-tool)
  - [4) LTI Session and ltik](#4-lti-session-and-ltik)
- [Deep Linking flow](#deep-linking-flow)
- [Services: AGS, NRPS, Dynamic Registration](#services-ags-nrps-dynamic-registration)
- [Cookie handling and fallback behavior](#cookie-handling-and-fallback-behavior)
- [Security checks and validations](#security-checks-and-validations)
- [Where to customize behavior](#where-to-customize-behavior)
- [Testing and common pitfalls](#testing-and-common-pitfalls)

## High-level architecture

LTIJS implements an LTI 1.3 Tool Provider ("tool") as an Express application. The core workflow is:

1. Receive an OIDC login initiation request (from the platform/LMS).
2. Redirect the browser to the platform’s authentication endpoint with OIDC params.
3. Receive the platform’s `id_token` (JWT) via `form_post` back to the tool.
4. Validate the `id_token`, store relevant state in DB, issue a signed `ltik` (session token).
5. Redirect the user to the tool’s target route with the `ltik`.
6. For subsequent requests, validate the `ltik` and (optionally) a session cookie.

The same machinery supports regular launches and deep linking launches; the `message_type` claim in the `id_token` determines which callback is invoked.

## Key modules and responsibilities

### `src/Provider/Provider.js`
- Main entry point for the LTI Provider.
- Sets up Express routes:
  - `/login` (OIDC login initiation)
  - `/keys` (public JWK keyset)
  - `/register` (dynamic registration, if enabled)
  - `/` (or `appRoute`, the main LTI launch endpoint)
- Implements the session validation middleware (`sessionValidator`) that:
  - Validates `id_token` during launch.
  - Issues `ltik` and redirects.
  - Validates `ltik` on subsequent requests.
- Handles cookie/session behavior and fallbacks.

### `src/Utils/Auth.js`
- Validates JWTs and enforces OIDC and LTI claim requirements.
- Fetches JWKs from platform JWK set endpoints when needed.
- Validates nonce, audience, algorithm, max age, etc.

### `src/Utils/Request.js`
- Builds the OIDC login redirect parameters (response_type, response_mode, nonce, state, etc.).

### `src/Utils/Database.js`
- MongoDB adapter and schemas for:
  - `idtoken`
  - `contexttoken`
  - `platform`
  - `platformStatus`
  - `nonce`
  - `state`
  - `accesstoken`
  - key material (`publickey`, `privatekey`)

### `src/Provider/Services/*`
- `DeepLinking.js`: constructs deep linking responses.
- `Grade.js`: Assignment and Grade Services (AGS).
- `NamesAndRoles.js`: Names and Roles Service (NRPS).
- `DynamicRegistration.js`: LTI dynamic registration flow.

## Database schema overview

Key collections that affect the LTI flow:

- `state` (TTL: 10 minutes)
  - `state`: random string used for OIDC state validation.
  - `query`: extracted query params from target link (optional).
  - `iss`, `clientId`: platform info to validate when cookies are blocked.

- `nonce` (TTL: 10 seconds)
  - Prevents replay of `id_token`.

- `idtoken` (TTL: 24 hours)
  - Stored platform/user identity and platform metadata used later in the session.

- `contexttoken` (TTL: 24 hours)
  - Stored LTI context and message details for the launch.

The TTLs ensure stale data is cleaned automatically.

## Core LTI 1.3 flow

### 1) OIDC Login Initiation
Entry point: `Provider.setup()` registers `/login` (or custom `loginRoute`).

Relevant code: `src/Provider/Provider.js` → `this.app.all(this.#loginRoute, ...)`

Steps:

1. The platform sends a login initiation request with:
   - `iss`, `login_hint`, `target_link_uri`, and optionally `client_id`.
2. LTIJS locates the platform registration in the DB (`getPlatform`).
3. A random `state` is generated (and checked for uniqueness in DB).
4. Any query params embedded in `target_link_uri` are extracted and stored in DB alongside `state`.
5. A signed `state` cookie is set (1 minute max age).
6. LTIJS builds the OIDC auth request via `Request.ltiAdvantageLogin`.
7. The user is redirected to the platform’s authorization endpoint.

This is purely OIDC setup; no token validation happens yet.

### 2) OIDC Auth Redirect to Platform
The tool redirects the user to the platform authorization endpoint. The platform authenticates the user and then sends a POST back to the tool’s `appRoute` with `id_token` and `state`.

### 3) LTI Launch (id_token POST back to tool)
Entry point: `sessionValidator` middleware (runs on all requests except reserved routes).

Relevant code: `src/Provider/Provider.js` → `sessionValidator`.

Steps when `id_token` is present:

1. Reads `state` from the POST body.
2. Retrieves the `state` validation cookie (`state${state}`) if available.
3. If cookie is missing and `cookies.fallback` is enabled, it looks up the `state` in DB.
4. Calls `Auth.validateToken()` which:
   - Validates JWT signature (JWK set, RSA key, or JWK key).
   - Performs OIDC validation (aud, alg, maxAge, nonce).
   - Enforces LTI claim validation.
5. Deletes the `state` cookie and DB `state` entry (best effort).
6. Builds a `platformToken` and `contextToken` and stores both in DB.
7. Issues a session cookie (platformCode) unless `ltiaas` is enabled.
8. Creates a signed `ltik` and redirects to `appRoute` with `ltik` in query.

At this point the platform launch is validated and the tool has a session token.

### 4) LTI Session and ltik
Subsequent requests (or the redirect after launch) include `ltik` as a query param or Authorization header.

Steps:

1. Validate `ltik` signature.
2. Optionally verify session cookie (unless `ltiaas` is enabled or cookie fallback is enabled and cookie is missing).
3. Load `idtoken` and `contexttoken` from DB.
4. Attach `res.locals.token`, `res.locals.context`, `res.locals.ltik`.
5. Pass request to the main handler.

## Deep Linking flow

Deep linking uses the same launch endpoint as regular launches but with a different `message_type`:

- `LtiDeepLinkingRequest` → `onDeepLinking()` callback.
- `LtiResourceLinkRequest` → `onConnect()` callback.

Relevant code:
- `src/Provider/Provider.js` → `this.app.all(this.#appRoute, ...)`

When deep linking is detected:

1. The normal launch validation happens.
2. The `onDeepLinking` handler is called with `res.locals.token`.
3. The tool renders a resource selection UI.
4. The tool constructs a deep linking response JWT using:
   - `DeepLinking.createDeepLinkingMessage(...)` or
   - `DeepLinking.createDeepLinkingForm(...)`
5. The tool POSTs the deep link response back to the platform.

Deep linking creation logic: `src/Provider/Services/DeepLinking.js`

## Services: AGS, NRPS, Dynamic Registration

- **Assignment and Grade Services (AGS)**
  - `src/Provider/Services/Grade.js`
  - Uses the stored context and platform info to obtain access tokens and call platform endpoints.

- **Names and Roles (NRPS)**
  - `src/Provider/Services/NamesAndRoles.js`
  - Similar flow to AGS: gets access token, fetches members.

- **Dynamic Registration**
  - `src/Provider/Services/DynamicRegistration.js`
  - Handles platform registration using the LTI dynamic registration spec.

## Cookie handling and fallback behavior

By default, LTIJS uses two cookie types:

- **State cookie** (`state${state}`): used to validate the OIDC response.
- **Session cookie** (`platformCode`): used alongside `ltik` to validate session requests.

If `cookies.fallback` is enabled (default: true), LTIJS will:

- Store `state` in DB for every login initiation.
- When the `state` cookie is missing, validate the OIDC response using the DB record.
- When the session cookie is missing, allow `ltik`-only validation.

This improves compatibility with browser third‑party cookie restrictions in iframes.

## Security checks and validations

### OIDC validation (`Auth.oidcValidation`)
- `alg` must be RS256.
- `aud` must match platform client_id (or azp for multi‑aud tokens).
- `iat`/`exp` must be within `tokenMaxAge`.
- `nonce` must be unique (checked against DB).

### LTI core claims validation (`Auth.claimValidation`)
- `message_type` must be `LtiResourceLinkRequest` or `LtiDeepLinkingRequest`.
- If `LtiResourceLinkRequest`, ensure `target_link_uri` and `resource_link.id` are present.
- Validate `version`, `deployment_id`, `sub`, `roles`.

## Where to customize behavior

Common extension points:

- **Change app routes**: via `Provider.setup` options (`appRoute`, `loginRoute`, etc.).
- **Customize login behavior**: modify `/login` handler in `Provider.js`.
- **Customize token validation**: edit `Auth.validateToken` / `Auth.claimValidation`.
- **Adjust cookie strategy**: `cookies` options in `Provider.setup`.
- **Add new services**: create new modules in `src/Provider/Services/`.
- **Override callbacks**: `onConnect`, `onDeepLinking`, `onInvalidToken`, etc.

## Testing and common pitfalls

- Tests require a running MongoDB or `mongodb-memory-server` to be available.
- Node + jsonwebtoken versions can enforce RSA key length >= 2048 bits in tests.
- If you add new DB fields, remember to update both `src/` and build `dist/` before publishing.
- When using `cookies.fallback`, ensure `state` is always persisted on login.

---

If you need a visual sequence diagram or want to add support for additional IMS draft flows (like postMessage), those should be implemented alongside `Provider.js` and documented here.
