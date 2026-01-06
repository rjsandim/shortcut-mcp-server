import swaggerUi from "swagger-ui-express";

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Shortcut MCP Server",
    version: "1.0.0",
    description:
      "API HTTP do servidor MCP que integra com a API do Shortcut, expondo endpoints para transporte MCP (streamable HTTP e SSE) e health check.",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Servidor local",
    },
    {
      url: "https://{subdomain}.ngrok.io",
      description: "Servidor exposto via ngrok",
      variables: {
        subdomain: {
          default: "sua-url-ngrok",
          description:
            "Subdomínio gerado pelo ngrok (ex: abc123.ngrok.io sem o https://)",
        },
      },
    },
  ],
  paths: {
    "/health": {
      get: {
        summary: "Health check do servidor",
        description:
          "Retorna o status do servidor MCP, tools disponíveis, endpoints e número de sessões ativas.",
        responses: {
          200: {
            description: "Status OK",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/HealthResponse",
                },
              },
            },
          },
        },
      },
    },
    "/mcp": {
      post: {
        summary: "Entrada MCP (Streamable HTTP)",
        description:
          "Envia mensagens MCP para o servidor usando transporte HTTP streamable. A primeira requisição da sessão deve ser um `initialize` sem o header `mcp-session-id`. As requisições subsequentes devem incluir o header `mcp-session-id` retornado na inicialização.",
        parameters: [
          {
            name: "mcp-session-id",
            in: "header",
            required: false,
            schema: { type: "string" },
            description:
              "ID da sessão MCP retornado após a requisição de initialize.",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: true,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Resposta MCP para a requisição enviada.",
            content: {
              "application/json": {
                schema: { type: "object", additionalProperties: true },
              },
            },
          },
          400: {
            description:
              "Erro de requisição inválida (por exemplo, primeira requisição deve ser initialize).",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          500: {
            description: "Erro interno do servidor MCP.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      get: {
        summary: "Receber notificações MCP (Streamable HTTP)",
        description:
          "Recebe mensagens/notifications do servidor MCP para uma sessão existente via HTTP streamable.",
        parameters: [
          {
            name: "mcp-session-id",
            in: "header",
            required: true,
            schema: { type: "string" },
            description: "ID da sessão MCP previamente inicializada.",
          },
        ],
        responses: {
          200: {
            description: "Stream de mensagens MCP para o cliente.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  additionalProperties: true,
                },
              },
            },
          },
          400: {
            description: "Sessão não encontrada ou inválida.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        summary: "Encerrar sessão MCP (Streamable HTTP)",
        description:
          "Encerra uma sessão MCP existente e limpa os recursos em memória.",
        parameters: [
          {
            name: "mcp-session-id",
            in: "header",
            required: true,
            schema: { type: "string" },
            description: "ID da sessão MCP a ser encerrada.",
          },
        ],
        responses: {
          200: { description: "Sessão encerrada com sucesso." },
          404: {
            description: "Sessão não encontrada.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/sse": {
      get: {
        summary: "Conexão SSE (legacy MCP)",
        description:
          "Abre uma conexão SSE (Server-Sent Events) para compatibilidade legacy com clientes MCP que utilizam SSE.",
        responses: {
          200: {
            description:
              "Conexão SSE estabelecida. Eventos MCP serão enviados ao longo do stream.",
            content: {
              "text/event-stream": {
                schema: {
                  type: "string",
                  description: "Fluxo de eventos SSE no formato `data: {...}`.",
                },
              },
            },
          },
        },
      },
    },
    "/messages": {
      post: {
        summary: "Receber mensagens SSE (legacy MCP)",
        description:
          "Recebe mensagens/requests MCP para uma sessão SSE pré-existente.",
        parameters: [
          {
            name: "sessionId",
            in: "query",
            required: true,
            schema: { type: "string" },
            description:
              "ID da sessão SSE retornado quando a conexão `/sse` foi estabelecida.",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: true,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Mensagem processada pelo servidor MCP.",
            content: {
              "application/json": {
                schema: { type: "object", additionalProperties: true },
              },
            },
          },
          400: {
            description: "Sessão SSE não encontrada ou payload inválido.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      HealthResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "ok" },
          tools: {
            type: "array",
            items: { type: "string" },
            example: [
              "list_epics",
              "create_epic",
              "create_story",
              "delete_story",
              "search_stories",
              "update_story_estimate",
            ],
          },
          endpoints: {
            type: "object",
            properties: {
              streamable_http: {
                type: "string",
                example: "/mcp (POST/GET/DELETE)",
              },
              legacy_sse: {
                type: "string",
                example: "/sse (GET) + /messages (POST)",
              },
            },
          },
          active_sessions: {
            type: "object",
            properties: {
              streamable: { type: "integer", example: 1 },
              sse: { type: "integer", example: 0 },
            },
          },
        },
        required: ["status"],
      },
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string", example: "Sessão não encontrada." },
        },
        required: ["error"],
      },
    },
  },
};

export function setupOpenApi(app) {
  app.get("/openapi.json", (req, res) => {
    res.json(openApiSpec);
  });

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
}
