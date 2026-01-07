// index.js
import { app } from "./src/app.js";
import { PORT } from "./src/config.js";

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           🚀 Shortcut MCP Server v2.0                        ║
╠══════════════════════════════════════════════════════════════╣
║  Servidor: http://localhost:${PORT}                          ║
╠══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                  ║
║  • /mcp        - Streamable HTTP (recomendado)               ║
║  • /sse        - SSE legacy (compatibilidade)                ║
║  • /messages   - Endpoint de mensagens SSE                   ║
║  • /health     - Status do servidor                          ║
║  • /openapi.json - Spec OpenAPI                              ║
║  • /docs       - Swagger UI (documentação interativa)        ║
╠══════════════════════════════════════════════════════════════╣
║  Para Claude.ai usar:                                        ║
║  https://sua-url-ngrok.ngrok.io/sse                          ║
╠══════════════════════════════════════════════════════════════╣
║  Tools: list_epics, create_epic, create_story,               ║
║         delete_story, search_stories, get_story,             ║
║         search_stories_by_epic, update_story_estimate,       ║
║         create_story_link, update_story                      ║
╚══════════════════════════════════════════════════════════════╝
`);
});
