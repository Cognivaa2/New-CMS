// Place at Frontend/src/proxy.js (Next 16 renamed `middleware` -> `proxy`).
// Proxies same-origin /api/* and /socket.io/* to the Hetzner backend server-side,
// so the HTTPS Worker frontend can reach the HTTP backend without browser
// mixed-content errors. nip.io gives the IP a hostname; backend listens on port 80.
const BACKEND = "http://204-168-223-223.nip.io";

export const config = {
  matcher: ["/api/:path*", "/socket.io/:path*"],
};

export async function proxy(request) {
  const url = new URL(request.url);
  const target = BACKEND + url.pathname + url.search;
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("x-forwarded-host", url.host);
  const init = { method: request.method, headers, redirect: "manual" };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }
  return fetch(target, init);
}
