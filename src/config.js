import "dotenv/config";

export const SHORTCUT_TOKEN = process.env.SHORTCUT_TOKEN;
export const SHORTCUT_BASE_URL = "https://api.app.shortcut.com/api/v3";

export const OBJECTIVE_ID = process.env.OBJECTIVE_ID;
export const PROJECT_ID = parseInt(process.env.PROJECT_ID);
export const WORKFLOW_STATE_ID = parseInt(process.env.WORKFLOW_STATE_ID);
export const EPIC_STATE_ID = parseInt(process.env.EPIC_STATE_ID);
export const REQUESTED_BY_ID = process.env.REQUESTED_BY_ID;

export const PORT = process.env.PORT || 3000;

if (!SHORTCUT_TOKEN) {
  console.error("❌ SHORTCUT_TOKEN não definido. Crie um arquivo .env com:");
  console.error("   SHORTCUT_TOKEN=sua_chave");
  process.exit(1);
}
