# CLAUDE.md — Horizonte Trombetas (MVP do pitch)

Repositório do material do pitch do **Horizonte Trombetas** para o Desafio 3 da MRN: demo, protótipo 3D e insumos do deck.

- **Projeto no Linear:** [Horizonte MVP (P-WAG-4)](https://linear.app/wagner-junior/project/horizonte-mvp-d79ebc9024d5), time `WAG`
- **Entrevista:** 06/11/2026, 11h15, no Teams (10 min de pitch + 20 min de perguntas)
- **Envio do PDF:** para inovacao@mrn.com.br até 09h15 de 06/11 (meta interna: 08h30)
- **Janela de trabalho:** 04/11 a 06/11. Prazo curto: priorize o caminho crítico e respeite a regra de corte.

## O produto em uma frase

Previsão probabilística (P10/P50/P90) por etapa do ciclo de navios da MRN, do Barra Norte ao Porto Trombetas, com simulação de cenários "e se" sobre berço único, pátio e nível do rio.

## Narrativa da demo: "um alerta, três dias antes"

O navio C tem 80% de chance de chegar 36 h atrasado; o berço único empurra o navio D; o pátio seco chega a 92% em D+5; o planejador compara o cenário A (antecipar D) com o B (reduzir o seco em 8%) e registra a decisão.

Os 5 beats (fonte da verdade do texto: `docs/beats.md`, WAG-726):

1. `overview` em D0, 06h00: corredor inteiro, 7 navios com incerteza
2. Destaque do navio C: faixa vermelha e card "80% de chance de 36 h de atraso"
3. Avanço até D+3: tomada `port`, navio D fundeado esperando, berço parado reservado para o C
4. Tomada `yard`: pilha seca a 92% em D+5, água baixando na régua
5. Cenário A: fila se desfaz, pilha abaixo de 80%

A demo de 2 min usa só as telas T1, T2 e T3, como slides do deck, e fecha na T3 com a decisão registrada e o valor em dólares. O 3D não entra na demo: fica aberto numa aba e aparece nas perguntas, com os 5 beats acima avançados pela seta. Fala, tempos e gatilhos em `docs/beats.md`.

## Divisão de papéis

- **Claude Design:** linguagem visual, identidade T0 e telas T1 a T4 (1920×1080, tema escuro de sala de controle). T4 em estilo Power BI.
- **Protótipo three.js (este repo):** só a vista principal, corredor fluvial e porto.
- **Deck:** 8 slides, tema claro, título em forma de afirmação.

## Fonte única de dados

Um `scenario.json` sintético, gerado com **semente fixa**, alimenta as telas, o protótipo e os números do deck. Se um número muda, muda no gerador, nunca à mão em um entregável.

- **Contrato:** `docs/schema.ts` exporta os tipos TypeScript e o `ScenarioFileSchema` (Zod) do mesmo arquivo; gerador e app importam dali (WAG-730)
- **Tempo:** horas desde T0 (rodada das 06h00 de D0). Horizonte de D0 a D10.
- **Navios:** ids de `A` a `G`, 7 marcos do ciclo (Barra Norte até a saída pela barra), quantis P10, P50 e P90
- **Séries:** pátio (seco e úmido, com capacidade) e rio em Óbidos (calado limite de 11,70 m ou 11,85 m)
- **Cenários:** `base`, `A` (antecipar D) e `B` (reduzir seco em 8%)
- `trajectories` é opcional: 200 amostras do estoque do pátio seco por cenário, para o leque

Metas que o gerador deve reproduzir (são metas de cenário, não resultados):

| Indicador | Base | A | B |
| -- | -- | -- | -- |
| Espera esperada somada (dias de navio) | 2,1 | 1,2 | 2,0 |
| P(pátio seco > 90% em D+5) | 64% | 12% | 30% |
| Custo de oportunidade (US$ 20.500/dia) | US$ 43 mil | US$ 24,6 mil | US$ 41 mil |

Tolerância: ±0,1 dia e ±3 pontos percentuais. A mesma semente gera o mesmo arquivo byte a byte.

## Stack (planejada)

> A decisão R3F × three.js puro está em aberto (WAG-727). A recomendação é R3F; confirme na issue antes do scaffold.

- Vite + TypeScript (strict) + ESLint
- React Three Fiber + drei sobre three.js
- Zustand (store) e Zod (validação)
- Playwright para still e vídeo; ffmpeg para H.264
- **Sem backend.** Tudo roda offline.

## Estrutura de pastas (planejada, WAG-731)

```
data/      loader e seletores do scenario.json
clock/     tempo simulado e store
scene/     corredor, porto, rio, navios, câmera
ui/        overlays HTML (alerta, KPIs, linha do tempo, alternador)
demo/      beats.ts e modo gravação
scripts/   generate-scenario.ts, export do still
docs/      schema.ts, beats.md, tokens.md
public/    scenario.json gerado, fontes locais
```

## Comandos (planejados; atualize quando existirem)

- `npm run dev`: desenvolvimento
- `npm run build && npx vite preview`: build offline usada na apresentação
- `npm run generate`: gera `public/scenario.json` e imprime os KPIs dos três cenários
- `npm run still`: exporta PNG 3840×2160 da tomada `overview` (Playwright, viewport 1920×1080, deviceScaleFactor 2)

Parâmetros de URL: `?record=1` toca os 5 beats com tempos fixos, sem interação; `&beat=N` posiciona num beat; `&still=1` esconde os overlays DOM.

## Regras do protótipo

- **Offline de verdade:** nenhuma requisição de rede após a carga. Sem fontes ou assets de CDN; Inter e IBM Plex Mono servidas localmente.
- **Determinismo:** nada de `Math.random` em runtime. O mesmo beat produz o mesmo frame em duas execuções. Aleatoriedade só no gerador, com PRNG semeado (ex.: mulberry32).
- **Performance:** low-poly, materiais planos, sem pós-processamento, no máximo 60 draw calls no app inteiro. `InstancedMesh` para os cascos.
- **Leitura do store no `useFrame`:** use `getState()`, não hooks, para não causar re-render.
- **Posição dos navios:** interpolação linear entre os P50 dos marcos; P10 e P90 desenham o segmento de incerteza (branco a 18%, P50 sólido) via `pointAt(milestone)` da `CatmullRomCurve3` do corredor.
- **Overlays:** DOM puro acima do canvas, com variáveis CSS copiadas de `docs/tokens.md`. `drei <Html>` só para os rótulos dos navios.
- **Câmera:** tomadas nomeadas `overview`, `barra`, `port`, `yard`, com lerp amortecido. Setas esquerda/direita navegam os beats.
- **Corredor esquemático e fora de escala**, com a ordem correta: Barra Norte, Fazendinha (praticagem), Macapá (fundeio), Óbidos (estação de nível), foz do Trombetas, Porto Trombetas. O aviso "esquemático, fora de escala" fica visível.
- **Porto com "layout inspirado na planta real"** (WAG-751): o Trombetas passa em frente ao porto e segue rio acima; o porto fica na margem sul, o navio atraca paralelo à margem na ponta de uma ponte de acesso longa, e o fundeio fica no meio do rio, a jusante. Geometria em `scene/portLayout.ts`, fora de escala. As imagens do Google Maps e do Google Earth são só referência visual de disposição: nada decalcado, nenhuma imagem como textura ou no repo. Se um dia usar o OpenStreetMap (ODbL), "© colaboradores do OpenStreetMap" entra no rodapé do 3D.
- Rodapé "Cenário ilustrativo, dados sintéticos" em toda tela e overlay.
- Itens na lista de corte se faltar tempo: animação da água, navios fantasma.

## Tokens visuais (contrato: `docs/tokens.md`, WAG-732)

| Token | Valor |
| -- | -- |
| Fundo | `#0E1A22` |
| Superfícies | `#15252F` |
| Acento ocre-bauxita (só seleção e marca) | `#C2622D` |
| Status verde / âmbar / vermelho | `#3FB57A` / `#E3A13B` / `#E25A4F` |
| Incerteza P10–P90 | branco 18%, P50 sólido |

Tipografia: Inter na UI, IBM Plex Mono em horários e números. Mínimo de 18 px no texto e 28 px nos KPIs, contraste AA (a demo passa pela compressão do Teams).

## Regra de corte

**Às 16h00 de 04/11**, se os beats 1 a 3 do protótipo não estiverem rodando, o 3D fica só como still (capa e T1) e não é usado nas perguntas. Não invista em polimento do 3D antes dos beats 1 a 3 funcionarem.

## Fora de escopo (descartado)

Gêmeo digital realista e mapa georreferenciado: custo alto e risco de parecer enfeite para a banca do Porto. O corredor segue esquemático; só o porto ganhou um layout inspirado na planta real (WAG-751), modelado à mão, sem escala.

## Fluxo de trabalho com o Linear

- Toda mudança se liga a uma issue `WAG-xxx`. Use o `gitBranchName` da issue como nome do branch.
- Labels do time: `execution:*` (tipo de trabalho), `parallel:*` (se pode rodar em paralelo), `agent:*` (área para agente de código), `data:simulated`, `risk:*`.
- Issues `execution:contract-first` (roteiro, schema, tokens) vêm antes das `contract-dependent`. Não mude um contrato sem atualizar a issue de origem.
- Tasks de código estão sem responsável, prontas para Claude Code ou Codex. Decisões, conteúdo e ensaios são do Wagner: não decida por ele (ex.: WAG-727, WAG-728, WAG-745).
- O critério de pronto de cada issue está na seção "Pronto quando". Leia também as "Agent notes" no fim da descrição.

## Idioma

Conteúdo voltado à banca (telas, overlays, deck, docs) em português do Brasil. Identificadores de código em inglês.
