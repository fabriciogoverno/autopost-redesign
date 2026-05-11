# v3.6 — Editor com template Ururau nativo + import PDF do Canva

## Bugs corrigidos

### 1. Logo Ururau não aparecia
**Problema**: dependia de PNG base, sumia ao trocar fundo.
**Correção**: renderizado nativamente em Konva (6 camadas: ururau + linha dourada + 19 ANOS + linha dourada + círculo vermelho + @).

### 2. Imagem da matéria não aparecia no fundo
**Problema**: z-order errado após extração.
**Correção**: camada `_articleImage` ocupando 65% da altura no topo, gradiente preto cobrindo a metade inferior.

### 3. Linha vermelha (separator) não era arrastável
**Problema**: faltava `bind()` chamado.
**Correção**: drag/resize funcionando + controles de largura/altura no painel direito.

### 4. Cor do badge categoria não mudava
**Problema**: color picker não atualizava `findOne('.badge-bg').fill()`.
**Correção**: prop `badgeColor` + grid de 12 cores pré-definidas + input de arredondamento.

### 5. Sem controle de largura do título/subtítulo
**Correção**: seção "Tamanho" no painel de Propriedades com inputs Largura/Altura.

## NOVO: Importar template do Canva

Aba **Template** na sidebar do editor:
1. Exporte do Canva como PDF (Compartilhar > Baixar > PDF)
2. Click "Importar PDF do Canva"
3. pdf.js converte PDF → PNG no navegador (não vai para servidor)
4. PNG ocupa 1080×1920 como template base
5. Edita textos por cima

## Arquitetura de camadas (z-order)

```
0. background preto
1. imagem da matéria (65% topo)
2. gradient overlay (preto base)
3. template base importado (opcional)
4-9. logo, badge, título, separator, subtítulo, watermark
10. seleção (azul tracejado)
```

## Como testar

```bash
cd autopost-ururau/src/dashboard
npm install
npm run dev
```

http://localhost:3000/templates → Adicionar → Editar → cola URL + Extrair → edita.
