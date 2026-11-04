RASCUNHO para revisão do Wagner

# Folha de perguntas da banca (WAG-729)

Uma página para os 20 min de perguntas. A banca é do Porto e do Comercial da MRN. Frases curtas, para falar. As respostas seguem a proposta revisada de 03/11/2026 (`Horizonte_Trombetas_Proposta_Desafio3_MRN_rev-2026-11-03.pdf`); a seção de origem vem entre parênteses. A leitura em voz alta continua com o Wagner.

## Respostas

**1. "Isso roda no Power BI?"**
Sim. Os painéis saem no Power BI que o COI já usa, ligado direto ao banco da plataforma, e os alertas vão também por e-mail e Teams. Na PoC nada muda nos sistemas atuais: a plataforma lê as bases do COI e devolve no mesmo Power BI. A tela T4 da demo mostra esse formato. (seções 7.5 e 8)

**2. "E se o histórico tiver buracos?"**
É o risco mais provável, por isso a PoC começa por ele: auditoria do histórico na semana 1. Onde faltar a hora de um marco, reconstruímos com o AIS histórico e os registros dos agentes. No gate G1, na semana 3, precisamos de pelo menos 250 escalas utilizáveis; abaixo disso, o escopo cai para a cabotagem e os critérios são renegociados com a MRN. No dia a dia, se faltar um dado, o M1 usa regras de reserva e a previsão continua saindo em faixa. O que mostramos hoje é sintético, então pergunto a vocês o que existe e com que qualidade. (seções 7 e 14, risco 1)

**3. "Como funciona sem internet em Trombetas?"**
Um nó local em Trombetas, uma máquina virtual no COI, guarda cópia dos dados, enfileira os envios e roda uma versão reduzida do M1 e do M3 com os últimos dados recebidos. Quando a conexão volta, ele sincroniza e a nuvem reprocessa. O planejador nunca fica sem a última previsão válida, e cada previsão mostra a hora dos dados que a geraram. A meta é 99% de disponibilidade da última previsão válida. O protótipo de hoje também roda offline, sem nenhuma requisição de rede. (seções 8.3 e 17)

**4. "Quem decide, a ferramenta ou o planejador?"**
O planejador. A ferramenta mostra o risco em faixa e compara cenários, como o A e o B na T3. A decisão é do planejador, que registra a escolha com o motivo. É o último passo da demo.

**5. "O que acontece se o G1 falhar?"**
O G1 é o primeiro gate da PoC, na semana 3: pelo menos 250 escalas utilizáveis no histórico. Se não passar, a PoC não para: o escopo cai para a cabotagem e os critérios são renegociados com a MRN. Os outros dois gates: o G2, na semana 11, pede pelo menos três dos cinco critérios técnicos de aceite no retroteste; o G3, na semana 18, pede 70% ou mais de precisão sobre dados ao vivo e decisão registrada em 90% dos alertas da fase assistida. (seção 15)

**6. "Por que R$ 180 mil?"**
Porque cabe no edital: são 24% do orçamento global de R$ 750 mil do ciclo (Art. 7º), com tributos incluídos, pagos em três marcos com entregáveis de aceite objetivos (30% na ordem de serviço, 40% na semana 11 e 30% na semana 18). A conta, se pedirem:

| Item | Valor |
| -- | -- |
| Líder técnico em dedicação integral por 18 semanas | R$ 96 mil |
| Ciência de dados em meio período por 18 semanas | R$ 32 mil |
| Nuvem e nó local em Porto Trombetas | R$ 11 mil |
| Dados AIS, 5 meses | R$ 6 mil |
| Visita técnica, treinamento e materiais | R$ 8 mil |
| Gestão, documentação, relatórios e Demo Day | R$ 5 mil |
| Tributos (Simples Nacional, estimativa) | R$ 22 mil |
| **Total** | **R$ 180 mil** |

A etapa de escala, de R$ 450 mil a R$ 580 mil, fica fora do edital e só se contrata se o Demo Day confirmar o valor. Equipe: o cientista de dados sênior é indicado nominalmente na Imersão, junto com o plano de trabalho. `[A CONFIRMAR: se a WAG-728 decidir nomear antes da entrevista, troque esta frase pelo nome.]` (seções 10 e 12)

**7. "De quem é o código?" (Art. 24º)**
O motor de previsão e simulação é preexistente e fica com a Wagner Junior LTDA; a MRN recebe licença não exclusiva de uso interno durante a PoC e, havendo interesse, na continuidade. Os modelos calibrados com dados da MRN, os relatórios, a base de dados organizada e o código específico da PoC pertencem à MRN. Os apontamentos à minuta de contrato seguem essa divisão. (seção 20)

## Perguntas para a banca

Ouça primeiro o time técnico.

1. Que sistema de programação de navios vocês usam hoje, e quem alimenta?
2. O que "by-pass" significa na operação de vocês?
3. Qual é o tempo médio de espera de um navio hoje, do fundeio ao berço?
4. Quem arca com o demurrage quando o navio espera: a MRN ou o cliente?
5. Qual é a capacidade atual do pátio, de seco e de úmido?

Cenário ilustrativo, dados sintéticos.
