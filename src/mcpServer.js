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
    "Lista todos os epics (agrupamentos de stories) disponíveis no objetivo. SEMPRE use este tool ANTES de criar uma nova story para encontrar o epic_id correto. Retorna: id, nome, descrição e número de stories de cada epic.",
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
    "Cria um novo epic (agrupamento/tema de stories). Use SOMENTE quando: 1) Você já listou os epics existentes com list_epics, E 2) Não existe um epic adequado para as stories que serão criadas. Não crie epics duplicados - sempre verifique antes.",
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
    "Cria uma nova story/tarefa no Shortcut. IMPORTANTE: 1) SEMPRE execute list_epics PRIMEIRO para obter o epic_id correto, 2) Use este tool quando precisar adicionar uma nova tarefa/história ao projeto. A story será criada SEM estimativa - use update_story_estimate depois se necessário.",
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
    "DELETA permanentemente uma story pelo ID. ATENÇÃO: Esta ação é IRREVERSÍVEL! Use SOMENTE quando: 1) O usuário explicitamente pedir para deletar, OU 2) Uma story foi criada por engano e precisa ser removida. SEMPRE confirme o story_id antes de deletar.",
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
    "Busca e lista TODAS as stories existentes no objetivo (até 250). Use quando: 1) Precisar ver todas as tarefas do projeto, 2) Quiser evitar criar stories duplicadas, 3) Precisar encontrar o ID de uma story específica, 4) Analisar o progresso geral do projeto. Retorna: id, nome, descrição, epic_id, tipo, estado, data de criação, URL, estimativa de cada story e o relacionamento da story com outras stories.",
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
          estimate: story.estimate || "Não definido",
          story_links: story.story_links
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
    "Atualiza ou define a estimativa (pontos de esforço) de uma story JÁ EXISTENTE. Use quando: 1) Precisar adicionar estimativa a uma story que foi criada sem ela, 2) Modificar a estimativa de uma story existente, 3) Planejar o sprint/esforço do time. Use valores da escala Fibonacci (1, 2, 3, 5, 8, 13, etc). Requer o story_id - use search_stories se não souber o ID.",
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

  // Tool 7: Criar Link de Dependência entre Stories
  server.tool(
    "create_story_link",
    "Cria uma relação/dependência entre duas stories EXISTENTES. Use quando: 1) Uma story BLOQUEIA outra (não pode começar até terminar a primeira) - use verb='blocks', 2) Stories estão relacionadas mas não são bloqueios - use verb='relates to', 3) Uma story é duplicata de outra - use verb='duplicates'. IMPORTANTE: Você precisa ter os IDs de AMBAS as stories - use search_stories se necessário. object_id é quem EXECUTA a ação (ex: quem bloqueia), subject_id é quem RECEBE a ação (ex: quem é bloqueado).",
    {
      object_id: z.number().describe("ID da story que BLOQUEIA/EXECUTA a ação (story origem)"),
      subject_id: z.number().describe("ID da story que É BLOQUEADA/RECEBE a ação (story destino)"),
      verb: z.enum(["blocks", "relates to", "duplicates"]).describe("Tipo de relação: 'blocks' (A bloqueia B - B não pode começar sem A), 'relates to' (A se relaciona com B - sem bloqueio), 'duplicates' (A é cópia de B)").default("blocks"),
    },
    async ({ object_id, subject_id, verb = "blocks" }) => {
      try {
        const storyLink = await shortcutApi("/story-links", {
          method: "POST",
          body: JSON.stringify({
            object_id,
            subject_id,
            verb,
          }),
        });

        return {
          content: [
            {
              type: "text",
              text: `Link de dependência criado com sucesso!\n\nStory ${object_id} ${verb} Story ${subject_id}\nLink ID: ${storyLink.id}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Erro ao criar link de dependência: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool 8: Atualizar Nome e/ou Descrição da Story
  server.tool(
    "update_story",
    "Atualiza o nome (título) e/ou descrição de uma story EXISTENTE. Use quando: 1) Precisar renomear uma story, 2) Atualizar/corrigir a descrição de uma story, 3) Modificar ambos ao mesmo tempo. IMPORTANTE: Você DEVE fornecer pelo menos um dos campos (name ou description). Pode fornecer ambos para atualizar os dois de uma vez. Requer o story_id - use search_stories se não souber o ID.",
    {
      story_id: z.number().describe("ID da story a ser atualizada"),
      name: z.string().optional().describe("Novo nome/título da story (opcional se description for fornecido)"),
      description: z.string().optional().describe("Nova descrição da story (opcional se name for fornecido)"),
    },
    async ({ story_id, name, description }) => {
      try {
        // Validação: pelo menos um campo deve ser fornecido
        if (!name && !description) {
          return {
            content: [
              {
                type: "text",
                text: `Erro: Você deve fornecer pelo menos um campo para atualizar (name ou description).`,
              },
            ],
            isError: true,
          };
        }

        // Monta o body apenas com os campos fornecidos
        const updateData = {};
        if (name) updateData.name = name;
        if (description) updateData.description = description;

        const story = await shortcutApi(`/stories/${story_id}`, {
          method: "PUT",
          body: JSON.stringify(updateData),
        });

        // Monta mensagem de sucesso baseada no que foi atualizado
        const updatedFields = [];
        if (name) updatedFields.push(`Nome: ${story.name}`);
        if (description) updatedFields.push(`Descrição: ${story.description?.substring(0, 100)}${story.description?.length > 100 ? '...' : ''}`);

        return {
          content: [
            {
              type: "text",
              text: `Story atualizada com sucesso!\n\nStory ID: ${story.id}\n${updatedFields.join('\n')}\nURL: ${story.app_url || "N/A"}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Erro ao atualizar story: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool 9: Obter Detalhes de uma Story
  server.tool(
    "get_story",
    "Obtém TODOS os detalhes completos de uma story específica pelo ID. Use quando: 1) Precisar ver informações completas de uma story (não apenas resumo), 2) Verificar status atual, estimativa, descrição completa, labels, tasks, etc, 3) Analisar dependências e links da story, 4) Obter dados precisos antes de fazer atualizações. Retorna o objeto completo da story com todos os campos disponíveis na API do Shortcut.",
    {
      story_id: z.number().describe("ID da story a ser consultada"),
    },
    async ({ story_id }) => {
      try {
        const story = await shortcutApi(`/stories/${story_id}`);

        // Formata as informações principais de forma legível
        const storyDetails = {
          id: story.id,
          name: story.name,
          description: story.description || "(sem descrição)",
          story_type: story.story_type,
          estimate: story.estimate ?? "Não definido",
          epic_id: story.epic_id,
          project_id: story.project_id,
          workflow_state_id: story.workflow_state_id,
          created_at: story.created_at,
          updated_at: story.updated_at,
          deadline: story.deadline || "Não definido",
          started: story.started || false,
          completed: story.completed || false,
          app_url: story.app_url,
          labels: story.labels?.map(l => l.name) || [],
          owner_ids: story.owner_ids || [],
          follower_ids: story.follower_ids || [],
          tasks: story.tasks?.map(t => ({
            id: t.id,
            description: t.description,
            complete: t.complete,
          })) || [],
          story_links: story.story_links?.map(l => ({
            id: l.id,
            verb: l.verb,
            object_id: l.object_id,
            subject_id: l.subject_id,
          })) || [],
          comments_count: story.stats?.num_comments || 0,
        };

        return {
          content: [
            {
              type: "text",
              text: `Detalhes da Story:\n\n${JSON.stringify(storyDetails, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Erro ao obter detalhes da story: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server;
}
