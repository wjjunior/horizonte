# Roteiro da demo: "um alerta, três dias antes"

Contrato da WAG-726. Este arquivo é a fonte da verdade da fala, da ordem das telas e dos beats do 3D. Quem segue este roteiro: o gerador do cenário (WAG-733), o schema (WAG-730), as telas T1 a T3 (WAG-736), o diretor de câmera e o modo gravação (WAG-740) e o slide 4 do deck (WAG-744). Se a fala mudar, mude aqui primeiro.

Cenário ilustrativo, dados sintéticos.

## Estrutura

Durante os 10 min do pitch, a demo usa só as telas e fecha na T3, com a decisão registrada e o valor em dólares. O 3D não entra na demo: fica aberto numa aba e aparece nas perguntas, quando alguém pergunta como o atraso se propaga.

| # | Trecho | O que está na tela | Tempo | Acumulado |
| -- | -- | -- | -- | -- |
| 0 | Abertura | Slide 4, "Um alerta, três dias antes" | 8 s | 0:08 |
| 1 | O que vai desviar? | T1, Horizonte de 10 dias (still do 3D no slot) | 22 s | 0:30 |
| 2 | Por que e quanto? | T2, Alerta do navio C | 26 s | 0:56 |
| 3 | O que eu faço? | T3, Cenários "e se" | 44 s | 1:40 |
| — | Folga | Troca de slide, atraso do Teams, pausa | 20 s | 2:00 |

A meta é falar em 100 s e guardar 20 s de folga dentro dos 120 s do slide 4: demo ao vivo sempre leva mais tempo do que no ensaio.

As telas T1, T2 e T3 entram no deck como slides de tela cheia logo depois do slide 4, então a demo não troca de janela. No PDF, o slide 4 continua com T1 e T3 lado a lado.

## Fala

### 0. Abertura (8 s)

**Tela:** slide 4.

> Antes de tudo: este é um cenário ilustrativo, com dados sintéticos. Os navios têm letras e nenhum número é da MRN.

### 1. T1, O que vai desviar? (22 s)

**Tela:** lista dos 7 navios com faixa P10 a P90, carimbo "Rodada 06h00", card de alerta do navio C.

> Rodada das seis da manhã. Sete navios nos próximos dez dias, da Barra Norte ao Porto Trombetas, cada um com a faixa de chegada do P10 ao P90. Quase tudo verde, menos o navio C: 80% de chance de chegar 36 horas atrasado. O alerta sai hoje, três dias antes do impacto no berço.

**Termina em:** 80% de chance de 36 h de atraso.

### 2. T2, Por que e quanto? (26 s)

**Tela:** cascata do atraso por etapa, causa dominante, régua do rio em Óbidos, efeito no navio D.

> Por que e quanto. O C perde a janela de maré na Barra Norte e ainda espera a inspeção em Fazendinha fora do horário comercial. A régua mostra o rio em Óbidos descendo, perto do calado limite. E, com berço único, o atraso não fica no C: ele empurra o D, que fica fundeado esperando a partir de D+3.

**Termina em:** navio D fundeado em D+3.

### 3. T3, O que eu faço? (44 s)

**Tela:** base, A e B lado a lado, com fita do berço, leque do pátio seco, espera esperada e custo de oportunidade; botão "Registrar decisão".

> O que eu faço. No base, a espera soma 2,1 dias de navio, uns 43 mil dólares, e o pátio de seco passa de 90% em D+5 com 64% de chance. O B, reduzir o seco em 8%, alivia o pátio, mas não mexe na fila. O A, antecipar o D, derruba a espera para 1,2 dia e o risco do pátio para 12%.
>
> *(pausa)*
>
> São 18 mil dólares a menos, num só evento. O planejador registra o A, com o motivo.
>
> Um alerta, três dias antes, e uma decisão registrada. Isso já roda num protótipo; se quiserem, nas perguntas eu mostro o porto em D+5.

**Termina em:** decisão registrada e o convite para o 3D. Depois, slide 5.

## O 3D nas perguntas

O protótipo fica aberto numa segunda aba da mesma janela do navegador, em `?beat=1`. Quando uma pergunta pedir, troque de aba e avance os beats com a seta, no ritmo da conversa. Os beats e a fala são os mesmos de antes; muda só o momento em que aparecem.

| Pergunta da banca | Comece no beat | O que mostrar |
| -- | -- | -- |
| "Isso já existe? Roda de verdade?" | 1 | O corredor inteiro e as faixas de incerteza; avance até o 5 |
| "Como o atraso de um navio afeta os outros?" | 3 | Berço ocupado e o D fundeado em D+3 |
| "E o pátio? E se reduzir o seco?" | 4 | Pilha de seco a 92% em D+5; troque para o cenário B no alternador |
| "E o rio, entra na conta?" | 4 | A água baixando na régua de Óbidos |
| "O que muda com a decisão?" | 5 | Cenário A: a fila se desfaz e a pilha fica abaixo de 80% |

| Beat | Fala de apoio |
| -- | -- |
| 1 | O corredor inteiro, cada navio com a sua faixa. |
| 2 | O C, em vermelho, com a faixa esticada. |
| 3 | Três dias depois: o berço ocupado e o D fundeado esperando. |
| 4 | Em D+5, a pilha de seco a 92%, e o rio baixando na régua. |
| 5 | Com a decisão A, a fila se desfaz e a pilha fica abaixo de 80%. |

Se ninguém perguntar nada que leve ao 3D, ele não aparece. A história já fechou na T3.

## Beats do 3D para `demo/beats.ts` (WAG-740)

| Beat | Tomada | Tempo simulado | Cenário | Navio em destaque | Duração em `?record=1` |
| -- | -- | -- | -- | -- | -- |
| 1 | `overview` | 0 h (D0, 06h00) | `base` | nenhum | 4 s |
| 2 | `overview` | 0 h | `base` | C | 5 s |
| 3 | `port` | 72 h (D+3) | `base` | D | 5 s |
| 4 | `yard` | 120 h (D+5) | `base` | nenhum | 6 s |
| 5 | `yard` | 120 h (D+5) | `A` | D | 13 s |

Nas perguntas os beats avançam pela seta, sem tempo fixo. O `?record=1`, com as durações acima (33 s no total), serve para gravar o vídeo de reserva do 3D (WAG-743), caso o protótipo não abra na hora. A transição de câmera entre beats faz parte da duração do beat.

## Números ditos na fala

Todos vêm do `scenario.json`. O gerador (WAG-733) precisa reproduzi-los dentro da tolerância do `CLAUDE.md`.

| Dito na fala | Onde | O que o cenário precisa ter |
| -- | -- | -- |
| 80% de chance de 36 h de atraso | T1, T2, 3D beat 2 | No `base`, probabilidade de o atraso de chegada do C a Porto Trombetas ser de 36 h ou mais igual a 80% |
| D fundeado a partir de D+3 | T2, 3D beat 3 | No `base`, o D chega por volta de 72 h e espera fundeado com o berço ocupado |
| Rio em Óbidos perto do calado limite | T2, 3D beat 4 | Nível em queda até D+5, próximo de 11,70 m |
| 2,1 / 1,2 dias de espera | T3 | Espera esperada somada: `base` 2,1, `A` 1,2 (`B` 2,0, na tela mas não dito) |
| 43 mil dólares | T3 | Custo de oportunidade do `base`: US$ 43 mil |
| 18 mil dólares num só evento | T3 | Diferença entre `base` e `A`: 0,9 dia × US$ 20.500 ≈ US$ 18,4 mil |
| 64% / 12% de chance de passar de 90% | T3 | P(pátio seco > 90% em D+5): `base` 64%, `A` 12% (`B` 30%) |
| Pilha de seco a 92% em D+5 | 3D beat 4 (perguntas) | No `base`, P50 do pátio seco em 120 h igual a 92% da capacidade |
| Pilha abaixo de 80% | 3D beat 5 (perguntas) | No `A`, P50 do pátio seco em 120 h abaixo de 80% da capacidade |

## Se o tempo apertar

- **Pitch atrasado:** na T2, tire a frase da régua do rio (uns 5 s); na T3, tire a última frase, do convite para o 3D (uns 6 s). A demo cai para cerca de 90 s.
- **Protótipo não abre nas perguntas:** use o vídeo de reserva ou responda com a T2 e a T3 no deck. Não tente recarregar ao vivo.

## Leitura em voz alta

- [ ] Roteiro lido em voz alta uma vez, cronometrado, em até 100 s de fala (Wagner)

Contagem: cerca de 240 palavras de fala nos 100 s, perto de 145 palavras por minuto, com a pausa na T3.
