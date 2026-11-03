# Roteiro da demo: "um alerta, três dias antes"

Contrato da WAG-726. Este arquivo é a fonte da verdade da fala, da ordem das telas e dos beats do 3D. Quem segue este roteiro: o gerador do cenário (WAG-733), o schema (WAG-730), as telas T1 a T3 (WAG-736), o diretor de câmera e o modo gravação (WAG-740) e o slide 4 do deck (WAG-744). Se a fala mudar, mude aqui primeiro.

Cenário ilustrativo, dados sintéticos.

## Estrutura (120 s)

As telas contam a história inteira, com os números. O 3D vem no fim como bônus, numa janela só, e mostra a decisão acontecendo no porto. Se o tempo apertar ou o protótipo falhar, o bônus sai e a história já fechou na T3.

| # | Trecho | O que está na tela | Tempo | Acumulado |
| -- | -- | -- | -- | -- |
| 0 | Abertura | Slide 4, "Um alerta, três dias antes" | 8 s | 0:08 |
| 1 | O que vai desviar? | T1, Horizonte de 10 dias (still do 3D no slot) | 21 s | 0:29 |
| 2 | Por que e quanto? | T2, Alerta do navio C | 25 s | 0:54 |
| 3 | O que eu faço? | T3, Cenários "e se" | 30 s | 1:24 |
| — | Troca de janela | Do deck para o navegador com o protótipo | 3 s | 1:27 |
| 4 | Bônus 3D | Protótipo, beats 1 a 5 avançados com a seta | 33 s | 2:00 |

As telas T1, T2 e T3 entram no deck como slides de tela cheia logo depois do slide 4, então só existe uma troca de janela, a do 3D. No PDF, o slide 4 continua com T1 e T3 lado a lado.

## Fala

### 0. Abertura (8 s)

**Tela:** slide 4.

> Antes de tudo: este é um cenário ilustrativo, com dados sintéticos. Os navios têm letras e nenhum número é da MRN.

### 1. T1, O que vai desviar? (21 s)

**Tela:** lista dos 7 navios com faixa P10 a P90, carimbo "Rodada 06h00", card de alerta do navio C.

> Rodada das seis da manhã. Sete navios nos próximos dez dias, da Barra Norte ao Porto Trombetas, cada um com a faixa de chegada do P10 ao P90. Quase tudo verde, menos o navio C: 80% de chance de chegar 36 horas atrasado. O alerta sai hoje, três dias antes do impacto no berço.

**Termina em:** 80% de chance de 36 h de atraso.

### 2. T2, Por que e quanto? (25 s)

**Tela:** cascata do atraso por etapa, causa dominante, régua do rio em Óbidos, efeito no navio D.

> Por que e quanto. O C perde a janela de maré na Barra Norte e ainda espera a inspeção em Fazendinha fora do horário comercial. A régua mostra o rio em Óbidos descendo, perto do calado limite. E, com berço único, o atraso não fica no C: ele empurra o D, que fica fundeado esperando a partir de D+3.

**Termina em:** navio D fundeado em D+3.

### 3. T3, O que eu faço? (30 s)

**Tela:** base, A e B lado a lado, com fita do berço, leque do pátio seco, espera esperada e custo de oportunidade; botão "Registrar decisão".

> O que eu faço. No base, a espera soma 2,1 dias de navio, uns 43 mil dólares, e o pátio de seco passa de 90% em D+5 com 64% de chance. O B, reduzir o seco em 8%, alivia o pátio, mas não mexe na fila. O A, antecipar o D, derruba a espera para 1,2 dia e o risco do pátio para 12%: 18 mil dólares a menos num só evento. O planejador registra o A.

**Termina em:** decisão registrada.

### Troca de janela (3 s)

> E é assim que isso aparece na parede do COI.

Para a troca caber em 3 s, deck e protótipo ficam como duas abas da mesma janela do navegador, e o Teams compartilha essa janela; a troca é só mudar de aba. O protótipo já fica carregado em `?beat=1`, e os beats avançam com a seta para a direita, no ritmo da fala. O `?record=1`, com as durações da tabela abaixo, serve para gravar o vídeo de reserva. Validar no teste do Teams (WAG-742): se trocar de aba não funcionar bem, a troca vira o vídeo de reserva (WAG-743) e esses 3 s sobem para uns 8 s, que saem do beat 5.

### 4. Bônus 3D (33 s)

**Tela:** protótipo. Os beats 1 a 4 passam rápido, como recapitulação; o tempo fica no beat 5, que é a decisão no porto.

| Beat | Fala | Tempo |
| -- | -- | -- |
| 1 | O corredor inteiro, cada navio com a sua faixa. | 4 s |
| 2 | O C, em vermelho, com a faixa esticada. | 5 s |
| 3 | Três dias depois: o berço ocupado e o D fundeado esperando. | 5 s |
| 4 | Em D+5, a pilha de seco a 92%, e o rio baixando na régua. | 6 s |
| 5 | Agora com a decisão A. A fila se desfaz e a pilha fica abaixo de 80%. *(pausa)* Um alerta, três dias antes, e uma decisão registrada. | 13 s |

Depois do beat 5, voltar ao deck no slide 5.

## Beats do 3D para `demo/beats.ts` (WAG-740)

| Beat | Tomada | Tempo simulado | Cenário | Navio em destaque | Duração em `?record=1` |
| -- | -- | -- | -- | -- | -- |
| 1 | `overview` | 0 h (D0, 06h00) | `base` | nenhum | 4 s |
| 2 | `overview` | 0 h | `base` | C | 5 s |
| 3 | `port` | 72 h (D+3) | `base` | D | 5 s |
| 4 | `yard` | 120 h (D+5) | `base` | nenhum | 6 s |
| 5 | `yard` | 120 h (D+5) | `A` | D | 13 s |

Total de 33 s, abaixo do limite de 40 s. A transição de câmera entre beats faz parte da duração do beat.

## Números ditos na fala

Todos vêm do `scenario.json`. O gerador (WAG-733) precisa reproduzi-los dentro da tolerância do `CLAUDE.md`.

| Dito na fala | Onde | O que o cenário precisa ter |
| -- | -- | -- |
| 80% de chance de 36 h de atraso | T1, T2, 3D beat 2 | No `base`, probabilidade de o atraso de chegada do C a Porto Trombetas ser de 36 h ou mais igual a 80% |
| D fundeado a partir de D+3 | T2, 3D beat 3 | No `base`, o D chega por volta de 72 h e espera fundeado com o berço ocupado |
| Rio em Óbidos perto do calado limite | T2, 3D beat 4 | Nível em queda até D+5, próximo de 11,70 m |
| 2,1 / 1,2 dias de espera | T3 | Espera esperada somada: `base` 2,1, `A` 1,2 (`B` 2,0, na tela mas não dito) |
| 43 mil dólares | T3 | Custo de oportunidade do `base`: US$ 43 mil |
| 18 mil dólares num único evento | T3 | Diferença entre `base` e `A`: 0,9 dia × US$ 20.500 ≈ US$ 18,4 mil |
| 64% / 12% de chance de passar de 90% | T3 | P(pátio seco > 90% em D+5): `base` 64%, `A` 12% (`B` 30%) |
| Pilha de seco a 92% em D+5 | 3D beat 4 | No `base`, P50 do pátio seco em 120 h igual a 92% da capacidade |
| Pilha abaixo de 80% | 3D beat 5 | No `A`, P50 do pátio seco em 120 h abaixo de 80% da capacidade |

## Se o tempo apertar

- **Pitch atrasado ou protótipo com problema:** pular a troca de janela e o bônus. Depois da T3, fechar com "Um alerta, três dias antes, e uma decisão registrada." e seguir para o slide 5. A demo fica em cerca de 85 s.
- **Protótipo travou no meio:** parar onde estiver, dizer a frase de fechamento e voltar ao deck. Não tentar recarregar ao vivo.

## Leitura em voz alta

- [ ] Roteiro lido em voz alta uma vez, cronometrado, em até 2 min (Wagner)

Contagem: cerca de 290 palavras de fala, perto de 145 palavras por minuto em 120 s. A T3 é o trecho mais denso (77 palavras em 30 s, com muitos números): se estourar no ensaio, corte ali primeiro.
