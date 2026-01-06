import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  OBJECTIVE_ID,
  EPIC_STATE_ID,
  WORKFLOW_STATE_ID,
  PROJECT_ID,
  REQUESTED_BY_ID,
} from "./config.js";
import { shortcutApi } from "./shortcutApi.js";

export function createMcpServer() {
  const server = new McpServer({
    name: "shortcut-mcp",
    version: "1.0.0",
  });

  // Tool 1: Listar Epics
  server.tool(
    "list_epics",
    "Lista todos os epics disponíveis no objetivo. Use para encontrar o epic_id correto antes de criar stories.",
    {},
    async () => {
      try {
        const epics = await shortcutApi(`/objectives/${OBJECTIVE_ID}/epics`);

        const epicList = epics.map((epic) => ({
          id: epic.id,
          name: epic.name,
          description: epic.description || "(sem descrição)",
          state: epic.state,
          num_stories: epic.stats?.num_stories || 0,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(epicList, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            { type: "text", text: `Erro ao listar epics: ${error.message}` },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool 2: Criar Epic
  server.tool(
    "create_epic",
    "Cria um novo epic com nome e descrição. Use quando não existir um epic adequado para as stories.",
    {
      name: z.string().describe("Nome do epic"),
      description: z.string().describe("Descrição detalhada do epic"),
    },
    async ({ name, description }) => {
      try {
        const epic = await shortcutApi("/epics", {
          method: "POST",
          body: JSON.stringify({
            name,
            description,
            epic_state_id: EPIC_STATE_ID,
            planned_start_date: null,
            deadline: null,
            objective_ids: [OBJECTIVE_ID],
            group_ids: [],
            owner_ids: [],
            follower_ids: [],
          }),
        });

        return {
          content: [
            {
              type: "text",
              text: `Epic criado com sucesso!\n\nID: ${epic.id}\nNome: ${epic.name}\nURL: ${
                epic.app_url || "N/A"
              }`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            { type: "text", text: `Erro ao criar epic: ${error.message}` },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool 3: Criar Story (Tarefa)
  server.tool(
    "create_story",
    "Cria uma nova story/tarefa. Sempre liste os epics primeiro para usar o epic_id correto.",
    {
      title: z.string().describe("Título da story"),
      description: z.string().describe("Descrição detalhada da tarefa"),
      epic_id: z.number().describe("ID do epic (use list_epics para encontrar)"),
    },
    async ({ title, description, epic_id }) => {
      try {
        const story = await shortcutApi("/stories", {
          method: "POST",
          body: JSON.stringify({
            name: title,
            description,
            deadline: null,
            file_ids: [],
            group_id: null,
            linked_file_ids: [],
            story_links: [],
            story_type: "feature",
            requested_by_id: REQUESTED_BY_ID,
            follower_ids: [],
            owner_ids: [],
            estimate: null,
            external_links: [],
            tasks: [],
            workflow_state_id: WORKFLOW_STATE_ID,
            epic_id,
            labels: [],
            story_template_id: null,
            custom_fields: [],
            iteration_id: null,
            project_id: PROJECT_ID,
            sub_tasks: [],
          }),
        });

        return {
          content: [
            {
              type: "text",
              text: `Story criada com sucesso!\n\nID: ${
                story.id
              }\nTítulo: ${story.name}\nEpic ID: ${epic_id}\nURL: ${
                story.app_url || "N/A"
              }`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            { type: "text", text: `Erro ao criar story: ${error.message}` },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool 4: Deletar Story
  server.tool(
    "delete_story",
    "Deleta uma story pelo ID. Use com cuidado - esta ação é irreversível.",
    {
      story_id: z.number().describe("ID da story a ser deletada"),
    },
    async ({ story_id }) => {
      try {
        await shortcutApi(`/stories/${story_id}`, {
          method: "DELETE",
        });

        return {
          content: [
            {
              type: "text",
              text: `Story ${story_id} deletada com sucesso!`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            { type: "text", text: `Erro ao deletar story: ${error.message}` },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool 5: Buscar Stories
  server.tool(
    "search_stories",
    "Busca todas as stories já criadas no objetivo. Use para ver o que já existe e evitar duplicatas, ou para analisar o progresso do projeto.",
    {},
    async () => {
      try {
        const response = await shortcutApi(
          `/search?query=objective:${OBJECTIVE_ID}&page_size=250`
        );

        const storiesShortcut = response?.stories?.data ?? [];
        console.log(`Encontradas ${storiesShortcut.length} stories`);

        const stories = storiesShortcut.map((story) => ({
          id: story.id,
          name: story.name,
          description: story.description
            ? story.description.substring(0, 200) +
              (story.description.length > 200 ? "..." : "")
            : "(sem descrição)",
          epic_id: story.epic_id,
          story_type: story.story_type,
          workflow_state_id: story.workflow_state_id,
          created_at: story.created_at,
          app_url: story.app_url,
          estimate: story.estimate || "Não definido"
        }));

        return {
          content: [
            {
              type: "text",
              text: `Encontradas ${stories.length} stories:\n\n${JSON.stringify(
                stories,
                null,
                2
              )}`,
            },
          ],
        };
      } catch (error) {
        console.error("Erro em search_stories:", error);
        return {
          content: [
            {
              type: "text",
              text: `Erro ao buscar stories: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool 6: Atualizar Estimativa da Story
  server.tool(
    "update_story_estimate",
    "Atualiza a estimativa (em pontos) de uma story existente. Use para definir ou modificar o esforço estimado de uma tarefa.",
    {
      story_id: z.number().describe("ID da story a ser atualizada"),
      estimate: z.number().describe("Estimativa em pontos escala Fibonacci (ex: 0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144)"),
    },
    async ({ story_id, estimate }) => {
      try {
        const story = await shortcutApi(`/stories/${story_id}`, {
          method: "PUT",
          body: JSON.stringify({
            estimate,
          }),
        });

        return {
          content: [
            {
              type: "text",
              text: `Estimativa atualizada com sucesso!\n\nStory ID: ${story.id}\nTítulo: ${story.name}\nEstimativa: ${story.estimate} pontos\nURL: ${story.app_url || "N/A"}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Erro ao atualizar estimativa: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server;
}
