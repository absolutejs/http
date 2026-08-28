# @absolutejs/http

Provider-neutral, origin-locked HTTP for AbsoluteJS applications.

```ts
import { http } from '@absolutejs/http';

const orders = await http.get<Order[]>('/api/orders');
await http.post('/api/orders', { sku: 'absolute-shirt', quantity: 1 });
```

Application code stays the same across browser, PWA, and Capacitor builds. The
browser transport uses same-origin HTTP-only cookies. AbsoluteJS installs the
Capacitor transport with the native Auth client's renewable bearer credential;
tokens never enter page code.

## Security contract

- Relative URLs resolve against one configured application origin.
- Absolute URLs must match that exact origin.
- HTTPS is required outside loopback development.
- Application-provided `Authorization`, `Cookie`, and `Proxy-Authorization`
  headers are rejected. The runtime provider owns credentials.
- Redirect following is disabled for trusted requests, preventing a server
  redirect from becoming a credential or request-body forwarding channel.
- HTTP errors expose status and URL but do not automatically copy a private
  response body into an exception or diagnostic.

Use `http.request()` when you need a raw `Response`, `http.text()` for text, and
`http.json()` or the method helpers for JSON. `@absolutejs/sync` remains the
durable local-first API; ordinary HTTP is connected-first.

Type parameters describe the decoded result at the call site. For end-to-end
route inference, pass `http.fetch` into the Elysia Eden client used by your
application so Eden retains the server route types while AbsoluteJS owns the
runtime transport.

## Explicit transports

SSR code must install or construct a request-scoped transport rather than
guessing a public origin:

```ts
import { createAbsoluteHttpClient } from '@absolutejs/http';
import { createSsrHttpTransport } from '@absolutejs/http/ssr';

const http = createAbsoluteHttpClient({
	transport: createSsrHttpTransport({
		origin: 'https://app.example.com'
	})
});
```

Tests can use `createTestHttpTransport()` from `@absolutejs/http/testing`.
