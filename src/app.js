// src/app.js
import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import { createMcpServer } from "./mcpServer.js";
import { setupOpenApi } from "./openapi.js";

export const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true");
  next();
});

// Swagger / OpenAPI
setupOpenApi(app);

// Armazenar sessões e transportes
const sessions = new Map(); // sessionId -> { server, transport }
const sseTransports = new Map(); // sessionId -> SSEServerTransport

// ============================================
// Streamable HTTP Transport (recomendado)
// ============================================
app.post("/mcp", async (req, res) => {
  console.log("📨 POST /mcp recebido");

  const sessionId = req.headers["mcp-session-id"];
  let session = sessions.get(sessionId);

  // Nova sessão
  if (!session) {
    if (!isInitializeRequest(req.body)) {
      res.status(400).json({ error: "Primeira requisição deve ser initialize" });
      return;
    }

    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newSessionId) => {
        sessions.set(newSessionId, { server, transport });
        console.log(`✅ Nova sessão Streamable HTTP: ${newSessionId}`);
      },
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) {
        sessions.delete(sid);
        console.log(`🔌 Sessão encerrada: ${sid}`);
      }
    };

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    return;
  }

  // Sessão existente
  await session.transport.handleRequest(req, res, req.body);
});

// GET /mcp para notifications
app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  const session = sessions.get(sessionId);

  if (!session) {
    res.status(400).json({ error: "Sessão não encontrada. Faça POST primeiro." });
    return;
  }

  await session.transport.handleRequest(req, res);
});

// DELETE /mcp para encerrar sessão
app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  const session = sessions.get(sessionId);

  if (!session) {
    res.status(404).json({ error: "Sessão não encontrada" });
    return;
  }

  await session.transport.handleRequest(req, res);
  sessions.delete(sessionId);
  console.log(`🗑️ Sessão deletada: ${sessionId}`);
});

// ============================================
// LEGACY: SSE Transport (compatibilidade)
// ============================================
app.get("/sse", async (req, res) => {
  console.log("🔌 Nova conexão SSE (legacy)");

  const server = createMcpServer();
  const transport = new SSEServerTransport("/messages", res);

  sseTransports.set(transport.sessionId, { server, transport });

  res.on("close", () => {
    sseTransports.delete(transport.sessionId);
    console.log(`🔌 Conexão SSE fechada: ${transport.sessionId}`);
  });

  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  const session = sseTransports.get(sessionId);

  if (!session) {
    res.status(400).json({ error: "Sessão SSE não encontrada" });
    return;
  }

  await session.transport.handlePostMessage(req, res, req.body);
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    tools: [
      "list_epics",
      "create_epic",
      "create_story",
      "delete_story",
      "search_stories",
    ],
    endpoints: {
      streamable_http: "/mcp (POST/GET/DELETE)",
      legacy_sse: "/sse (GET) + /messages (POST)",
      openapi: "/openapi.json",
      docs: "/docs",
    },
    active_sessions: {
      streamable: sessions.size,
      sse: sseTransports.size,
    },
  });
});
