# 🎨 Ururau Editor Visual v8 — Instruções de Instalação

## O que é
Editor visual local tipo "mini-Canva" integrado ao **ururau-reels-v8**. Permite editar templates de Reels/Stories 1080x1920 com mouse e teclado, salvar templates JSON e renderizar PNG final via **Sharp**.

---

## 📁 Arquivos Incluídos

```
ururau-editor-v8/
├── public/
│   └── editor/
│       ├── index.html              ← Página do editor
│       ├── css/
│       │   └── editor.css          ← Tema escuro Ururau
│       └── js/
│           ├── editor.js           ← Coordenador principal
│           ├── fabric-editor.js    ← Motor Fabric.js
│           ├── toolbar.js          ← Toolbar e modais
│           ├── layers-panel.js     ← Painel de camadas
│           ├── props-panel.js      ← Painel de propriedades
│           ├── history-manager.js  ← Undo/Redo
│           ├── keyboard.js         ← Atalhos de teclado
│           ├── context-menu.js     ← Menu de contexto
│           └── templates.js        ← API de templates
├── src/
│   ├── routes/
│   │   └── editor.js               ← Rotas Express
│   └── utils/
│       └── fabric-to-sharp.js      ← Renderizador JSON→SVG→Sharp→PNG
└── INSTRUCOES.md                   ← Este arquivo
```

---

## 🚀 Instalação (3 passos)

### Passo 1: Copiar arquivos para o projeto

Copie as pastas inteiras mantendo a estrutura:

```powershell
# Na pasta do projeto ururau-reels-v8
xcopy /E /I "ururau-editor-v8\public\editor" "public\editor"
xcopy /E /I "ururau-editor-v8\src\routes" "src\routes"
xcopy /E /I "ururau-editor-v8\src\utils" "src\utils"
```

### Passo 2: Modificar `src/server.js`

Adicione no topo do arquivo (depois das outras rotas):

```javascript
const editorRoutes = require('./routes/editor');
```

Adicione antes do `app.listen`:

```javascript
app.use('/', editorRoutes);
```

**Exemplo completo do que adicionar:**

```javascript
// ===== EDITOR VISUAL v8 =====
const editorRoutes = require('./routes/editor');
app.use('/', editorRoutes);
// =============================
```

### Passo 3: Adicionar link no menu lateral

No seu HTML principal (`public/index.html` ou template do dashboard), adicione:

```html
<a href="/editor" target="_blank">🎨 Editor de Templates</a>
```

Ou no menu lateral existente, adicione um item **"Templates"** apontando para `/editor`.

---

## ▶️ Como usar

1. Acesse `http://localhost:3000/editor`
2. O canvas carrega automaticamente `public/assets/template-base.png`
3. Use a **toolbar** para adicionar textos, imagens, formas
4. Use o **painel de camadas** (esquerda) para organizar, ocultar, bloquear
5. Use o **painel de propriedades** (direita) para ajustar posição, tamanho, cor, sombra
6. **Salve** o template com nome único
7. Clique em **Preview** para gerar PNG final via Sharp

---

## ⌨️ Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `T` | Adicionar texto |
| `Delete` | Deletar selecionado(s) |
| `Ctrl+D` | Duplicar |
| `Ctrl+G` | Agrupar |
| `Ctrl+Shift+G` | Desagrupar |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+Shift+]` | Trazer para frente |
| `Ctrl+Shift+[` | Enviar para trás |
| `Ctrl+A` | Selecionar todos |
| `Esc` | Desselecionar |
| `Setas` | Mover 1px (Shift = 10px) |
| `Ctrl+Scroll` | Zoom in/out |
| `Alt+Drag` | Pan do canvas |
| `Right-click` | Menu de contexto |

---

## 🖱️ Mouse

- **Click+Drag**: Mover objeto
- **Click handle de canto**: Redimensionar (Shift = manter proporção)
- **Click handle de rotação**: Girar
- **Double-click em texto**: Editar texto inline
- **Shift+Click**: Adicionar à seleção múltipla
- **Right-click**: Menu de contexto

---

## 🗄️ Onde os templates são salvos

- **Arquivo:** `database/templates.json`
- **Formato:** JSON do Fabric.js + metadados (nome, data, thumbnail)
- **Renderização:** `output/reels/preview-{timestamp}.png`

---

## ⚙️ Stack do Editor

| Tecnologia | Função |
|-----------|--------|
| **Fabric.js v5.3** | Motor de canvas (frontend) |
| **Sharp** | Renderização final PNG (backend) |
| **SVG intermediário** | Conversão JSON→SVG→PNG |
| **Vanilla JS** | Zero frameworks frontend |
| **Express** | API REST para templates |

---

## 🔧 Dependências

Não precisa instalar nada novo! O editor usa:
- `sharp` (já instalado no projeto)
- `express` (já instalado)
- `fabric.js` (carregado via CDN no HTML)

**Opcional:** Se quiser renderização server-side com `node-canvas` + Fabric.js StaticCanvas (mais precisa), instale:
```bash
npm install canvas
```
Mas **não é obrigatório** — o conversor SVG→Sharp funciona perfeitamente.

---

## 🎨 Personalização

### Cores do tema
Edite `public/editor/css/editor.css` — variáveis CSS no `:root`.

### Fonte padrão
O editor usa **Aileron** (igual ao seu template Canva). Se não estiver instalada no sistema, usa Arial como fallback.

Para garantir que funcione no canvas, adicione a fonte em `public/editor/index.html`:
```html
<style>
  @font-face {
    font-family: 'Aileron';
    src: url('/assets/fonts/Aileron-Bold.woff2') format('woff2');
    font-weight: bold;
  }
</style>
```

### Tamanho do canvas
Fixo em **1080×1920** (9:16). Altere em `fabric-editor.js` se precisar.

---

## 🐛 Troubleshooting

### "Cannot find module '../utils/fabric-to-sharp'"
Verifique se o caminho em `src/routes/editor.js` está correto relativo ao `server.js`.

### Template-base não carrega
Certifique-se de que `public/assets/template-base.png` existe.

### Fonte Aileron não renderiza no preview
A fonte precisa estar disponível no sistema onde o Node.js roda. No Windows, instale a fonte no sistema ou carregue via @font-face + arquivo WOFF.

### Problemas de CORS na imagem
Se carregar imagens externas, o servidor precisa enviar headers CORS. Para imagens locais (upload), não há problema.

---

## 📜 Licença

Todos os arquivos gerados são **MIT** — use à vontade no projeto Ururau.

---

**Gestor:** fabri | Portal Ururau (19 anos) | Campos dos Goytacazes/RJ
