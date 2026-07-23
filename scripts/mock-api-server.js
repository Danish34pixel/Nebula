const http = require("http");

const PORT = 5002;
const HOST = "127.0.0.1";

const sendJson = (res, statusCode, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  });
  res.end(body);
};

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      let parsedBody = {};
      try {
        parsedBody = JSON.parse(body || "{}");
      } catch {
        parsedBody = {};
      }

      const email = parsedBody.email || "";
      const password = parsedBody.password || "";
      const isKnownUser = Boolean(email && password);

      sendJson(res, 200, {
        success: true,
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        user: {
          _id: isKnownUser ? "mock-user-id-1" : "mock-user-id",
          email: isKnownUser ? email : "demo@meditrap.test",
          name: isKnownUser ? "Mock User" : "Mock Medical Owner",
          approved: true,
          status: "approved",
          role: "medicalOwner",
        },
      });
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/refresh") {
    sendJson(res, 200, {
      accessToken: "mock-access-token-refreshed",
      refreshToken: "mock-refresh-token-refreshed",
    });
    return;
  }

  if (url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true, service: "mock-api" });
    return;
  }

  sendJson(res, 404, {
    success: false,
    message: "Not found",
    path: url.pathname,
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Mock API server listening on http://${HOST}:${PORT}`);
});
