# 🚀 Shortcut MCP Server

Servidor **MCP (Model Context Protocol)** para integração com a **Shortcut API**.
Permite criar, listar, buscar e remover **Epics** e **Stories** diretamente a partir de um cliente MCP (como Claude ou outros).

O projeto também expõe uma API HTTP com documentação **OpenAPI (Swagger UI)**.

---

## 🧱 Estrutura do Projeto

```txt
src/
  app.js           → Express + rotas MCP/SSE/health
  config.js        → env e configurações
  shortcutApi.js   → cliente HTTP para Shortcut API
  mcpServer.js     → definição das tools MCP
  openapi.js       → spec OpenAPI + Swagger setup
index.js           → ponto de entrada
.env
```

---

## 🛠 Tecnologias

* Node.js + Express
* MCP SDK (`@modelcontextprotocol/sdk`)
* Shortcut API v3
* Swagger UI + OpenAPI
* Zod (validação)
* Ngrok (expor publicamente)

---

## ⚙️ Configuração (.env)

Crie um arquivo `.env` na raiz:

```env
SHORTCUT_TOKEN=seu_token_do_shortcut
OBJECTIVE_ID=123
PROJECT_ID=456
WORKFLOW_STATE_ID=789
EPIC_STATE_ID=1011
REQUESTED_BY_ID=999
PORT=3000
```

> ⚠️ O servidor **não inicia sem `SHORTCUT_TOKEN`**

---

## 📦 Instalação

```bash
npm install
```

---

## ▶️ Execução

Modo desenvolvimento (auto-reload):

```bash
npm run dev
```

Produção:

```bash
npm start
```

O servidor irá subir em:

```
http://localhost:3000
```

---

# 🌍 Expondo com Ngrok (necessário para MCP remoto)

Instale:

```bash
npm install -g ngrok
```

Execute:

```bash
ngrok http 3000
```

Você verá algo assim:

```
Forwarding https://abc123.ngrok.io -> http://localhost:3000
```

Use essa URL no cliente MCP.

---

# 🔗 Endpoints HTTP

| Método   | Rota            | Descrição                     |
| -------- | --------------- | ----------------------------- |
| `GET`    | `/health`       | Status do servidor            |
| `POST`   | `/mcp`          | Entrada MCP (Streamable HTTP) |
| `GET`    | `/mcp`          | Notificações MCP              |
| `DELETE` | `/mcp`          | Finaliza sessão MCP           |
| `GET`    | `/sse`          | Conexão MCP via SSE (legacy)  |
| `POST`   | `/messages`     | Envia mensagens MCP para SSE  |
| `GET`    | `/openapi.json` | OpenAPI JSON                  |
| `GET`    | `/docs`         | Swagger UI                    |

---

# 🧠 MCP — Como funciona

## ✅ Streamable HTTP (recomendado)

Cliente envia:

```
POST /mcp
```

Recebe respostas e notificações em:

```
GET /mcp
```

Encerrar sessão:

```
DELETE /mcp
```

---

## 🟡 SSE (modo legacy — ex: Claude)

Use a URL:

```
https://abc123.ngrok.io/sse
```

A sessão é criada automaticamente.

Envio de mensagens MCP:

```
POST /messages?sessionId=<id>
```

---

# 🧰 Tools MCP Disponíveis

### 🔍 `list_epics`

Lista epics do objetivo configurado

### 🧩 `create_epic`

Cria um epic

| Param         | Tipo   | Obrigatório |
| ------------- | ------ | ----------- |
| `name`        | string | ✔           |
| `description` | string | ✔           |

### 🏗 `create_story`

Cria uma story/tarefa

| Param         | Tipo   | Obrigatório |
| ------------- | ------ | ----------- |
| `title`       | string | ✔           |
| `description` | string | ✔           |
| `epic_id`     | number | ✔           |

> Use `list_epics` antes para achar o ID

### 🗑 `delete_story`

Remove story pelo ID

### 🔎 `search_stories`

Busca todas as stories do objetivo

---

# 📘 Documentação OpenAPI / Swagger

Spec JSON:

```
http://localhost:3000/openapi.json
```

Interface Swagger UI:

```
http://localhost:3000/docs
```

Via ngrok:

```
https://abc123.ngrok.io/docs
```

---

# 🩺 Health Check

Teste com:

```bash
curl http://localhost:3000/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "tools": [
    "list_epics",
    "create_epic",
    "create_story",
    "delete_story",
    "search_stories"
  ]
}
```

---

# 🎯 Requisitos

✔ Node 18+ (por causa do `fetch`)
✔ Token válido do Shortcut
✔ Objetivo configurado

---

# ❤️ Boas práticas

✔ Liste epics antes de criar stories
✔ Use `search_stories` para evitar duplicação
✔ Tenha cuidado com `delete_story` (irreversível)

---

# 📄 Licença

Uso interno — adapte conforme sua necessidade.
