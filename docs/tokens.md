# Tokens visuais — Horizonte Trombetas

Contrato visual entre as telas do Claude Design (T1 a T4), os overlays HTML do protótipo (WAG-738) e o deck. Issue de origem: WAG-732.

Os valores de fundo, superfície, acento, status, incerteza, tipografia e tamanhos mínimos vêm do `CLAUDE.md` e não mudam aqui. Os tokens de texto, borda, espaçamento e raio são escolhas desta página.

Tema escuro de sala de controle, telas de 1920×1080. O deck usa tema claro e não consome estes valores de fundo e texto.

## Cores

| Token | Valor | Uso | Origem |
| -- | -- | -- | -- |
| `--color-bg` | `#0E1A22` | fundo da tela | CLAUDE.md |
| `--color-surface` | `#15252F` | cards, painéis, linha do tempo, alternador | CLAUDE.md |
| `--color-border` | `#313F48` | contorno de card (branco 12% sobre a superfície) | escolha |
| `--color-text` | `#E8EEF2` | texto primário | escolha |
| `--color-text-secondary` | `#A9B8C3` | rótulos, legendas, rodapé | escolha |
| `--color-accent` | `#C2622D` | seleção e marca, nada mais | CLAUDE.md |
| `--color-ok` | `#3FB57A` | status verde | CLAUDE.md |
| `--color-warn` | `#E3A13B` | status âmbar | CLAUDE.md |
| `--color-danger` | `#E25A4F` | status vermelho | CLAUDE.md |
| `--color-uncertainty` | `rgba(255, 255, 255, 0.18)` | faixa P10 a P90 | CLAUDE.md |
| `--color-p50` | `#FFFFFF` | marca P50, sólida | CLAUDE.md |

### Justificativa dos textos

- **Texto primário `#E8EEF2`:** branco levemente azulado, em harmonia com o fundo. Evita o branco puro, que cansa em tela escura e “estoura” na compressão do Teams. Contraste de 15,1:1 sobre o fundo e 13,4:1 sobre a superfície, margem enorme para a compressão.
- **Texto secundário `#A9B8C3`:** cinza-azulado mais baixo na hierarquia, mas com 8,7:1 sobre o fundo e 7,7:1 sobre a superfície (passa AAA). Foi escolhido alto de propósito: valores mais escuros ficariam bonitos e ilegíveis depois da compressão de vídeo.
- **Incerteza:** P10 a P90 em branco 18% (equivale a `#39434A` sobre o fundo e `#3F4C54` sobre a superfície); P50 em branco sólido. O texto primário sobre a faixa tem 8,6:1.

## Tipografia

- **Inter** na UI (títulos, rótulos, corpo).
- **IBM Plex Mono** em horários, datas, percentuais e números. Use `font-variant-numeric: tabular-nums` nos KPIs para os dígitos não pularem.
- Ambas servidas localmente (`public/fonts`), sem CDN.

| Token | Tamanho | Uso |
| -- | -- | -- |
| `--text-sm` | 18 px | mínimo absoluto: legendas, rodapé, rótulos de eixo |
| `--text-md` | 20 px | corpo de card e linha do tempo |
| `--text-lg` | 24 px | títulos de card |
| `--text-kpi` | 28 px | mínimo dos KPIs |
| `--text-kpi-lg` | 40 px | KPI principal (ex.: “80%”, “36 h”) |

Pesos: 400 (corpo), 500 (rótulos), 600 (títulos e KPIs). Entrelinha 1,3 no corpo e 1,1 nos KPIs.

Nada abaixo de 18 px, nem rótulo de eixo nem rodapé.

## Bloco CSS (copiar sem mudança)

```css
:root {
  /* cores */
  --color-bg: #0E1A22;
  --color-surface: #15252F;
  --color-border: #313F48;
  --color-text: #E8EEF2;
  --color-text-secondary: #A9B8C3;
  --color-accent: #C2622D;
  --color-ok: #3FB57A;
  --color-warn: #E3A13B;
  --color-danger: #E25A4F;
  --color-uncertainty: rgba(255, 255, 255, 0.18);
  --color-p50: #FFFFFF;

  /* tipografia */
  --font-ui: "Inter", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
  --text-sm: 18px;
  --text-md: 20px;
  --text-lg: 24px;
  --text-kpi: 28px;
  --text-kpi-lg: 40px;
  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;

  /* espaçamento e raio */
  --space-1: 8px;
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 32px;
  --radius-sm: 6px;
  --radius-md: 12px;
}
```

## Regras de uso

1. **Acento só para seleção e marca.** `--color-accent` aparece no navio selecionado, no item ativo do alternador de cenário, no ícone e no wordmark. Nunca como status, nunca em texto corrido, nunca em gráfico de dados.
2. **Cor de status nunca vai sozinha.** Verde, âmbar e vermelho sempre vêm com ícone, rótulo ou valor, para não depender só de cor (a compressão do Teams achata matizes).
3. **Status em texto:** veja a tabela de contraste abaixo. Na dúvida, use o status como faixa, borda ou ícone e escreva o texto em `--color-text`.
4. **Incerteza:** faixa `--color-uncertainty` de P10 a P90 com a marca P50 sólida em `--color-p50`. Mesma convenção nas telas, no 3D e no deck.
5. **Rodapé obrigatório:** “Cenário ilustrativo, dados sintéticos” em toda tela e overlay, em `--text-sm` e `--color-text-secondary`. No corredor 3D, mantenha também visível “esquemático, fora de escala”.
6. **Tamanho mínimo:** 18 px no texto, 28 px nos KPIs (CLAUDE.md).
7. Texto em PT-BR; identificadores de código em inglês.

## Contraste (WCAG 2.1)

Razões calculadas com a fórmula de luminância relativa do WCAG sobre `#0E1A22` (fundo) e `#15252F` (superfície). AA exige 4,5:1 em texto normal e 3:1 em texto grande (≥ 24 px, ou ≥ 18,66 px em negrito). Todos os KPIs (≥ 28 px) contam como texto grande.

| Cor de texto | Sobre o fundo | AA normal | AA grande | Sobre a superfície | AA normal | AA grande |
| -- | -- | -- | -- | -- | -- | -- |
| Texto `#E8EEF2` | 15,08 | sim | sim | 13,41 | sim | sim |
| Secundário `#A9B8C3` | 8,69 | sim | sim | 7,72 | sim | sim |
| Verde `#3FB57A` | 6,81 | sim | sim | 6,06 | sim | sim |
| Âmbar `#E3A13B` | 7,93 | sim | sim | 7,05 | sim | sim |
| Vermelho `#E25A4F` | 4,88 | sim | sim | **4,34** | **não** | sim |
| Acento `#C2622D` | **4,27** | **não** | sim | **3,80** | **não** | sim |

### O que isso significa

- **Vermelho:** como texto normal passa só sobre o fundo, e por pouco. Sobre a superfície (cards, onde o alerta do navio C mora) reprova AA em texto normal. Use o vermelho como faixa, borda ou ícone e escreva o texto do card em `--color-text`. Só use vermelho como texto em tamanho grande (KPI de 28 px ou mais, ou título de 24 px).
- **Acento:** não passa AA como texto normal em nenhuma das duas bases, e só passa em texto grande. Isso combina com a regra de uso: acento é marca e seleção (borda, ícone, preenchimento), não texto. Nunca escreva texto corrido em acento.
- **Texto sobre preenchimento de status:** branco puro não serve, pois dá 2,59:1 sobre o verde, 2,23:1 sobre o âmbar, 3,62:1 sobre o vermelho e 4,13:1 sobre o acento. Em selos preenchidos, escreva o texto em `--color-bg`: 6,81:1 no verde, 7,93:1 no âmbar e 4,88:1 no vermelho (todos passam AA normal). Sobre o acento, `--color-bg` dá 4,27:1, que só passa em texto grande; selo de acento com texto só em 24 px ou mais.
- **Verde e âmbar:** passam AA normal sobre as duas bases e podem ser texto, mas a regra 2 vale mesmo assim.

## Sugestões para o contrato (não aplicadas)

Nenhum valor do `CLAUDE.md` foi alterado. Duas observações para o Wagner decidir:

- O vermelho `#E25A4F` fica em 4,34:1 sobre a superfície. Um tom um pouco mais claro (ex.: `#E8675C`, com 4,88:1 sobre a superfície e 5,49:1 sobre o fundo) passaria AA em texto normal nos cards. Hoje a regra de uso (faixa ou ícone, texto em branco azulado) resolve sem mudar o contrato.
- O acento `#C2622D` não serve para texto pequeno. Se a T0 precisar de wordmark em texto pequeno sobre fundo escuro, use o branco azulado e deixe o acento no ícone.
