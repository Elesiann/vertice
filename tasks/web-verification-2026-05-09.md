# Web Verification — Stackr Catalog Claims (24 cards)

**Data:** 2026-05-09
**Branch:** `integration/phase-1-and-2`
**Método:** 4 agentes Sonnet em paralelo, cada um auditando 6 claims contra fonte oficial (site do banco) ou cruzando 2+ fontes secundárias quando o oficial era inacessível por anti-bot/JS.
**Convenção:** ✅ Confirmado · ❌ Errado · ⚠️ Inconclusivo (parcial / desatualizado)

---

## Sumário (TL;DR)

| Status                    | #   | Claims                                                               |
| ------------------------- | --- | -------------------------------------------------------------------- |
| ✅ Confirmado             | 13  | W2, W3, W4, W5\*, W6, W7, W8, W10, W13, W16, W17, W19, W20, W21, W24 |
| ❌ Errado                 | 3   | W9, W12, W14                                                         |
| ⚠️ Inconclusivo / parcial | 8   | W1, W11, W15, W18, W22, W23                                          |

\* W5 foi marcado ✅ "com detalhamento" — o lounge **é** o que o produto vende, mas o catálogo simplifica como `unlimited: true` quando a verdade é "ilimitado só no GRU; 4 visitas/ano via Priority Pass".

### Achados que afetam a recomendação do produto

| #          | Cartão                          | Achado                                                                                                                                                                                                                                                                                               |
| ---------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ❌ **W9**  | Itaú Personnalité Visa Infinite | Lounge "ilimitado" no catálogo é **errado**. Real: 2 visitas/ano via Visa Airport Companion (DragonPass).                                                                                                                                                                                            |
| ❌ **W12** | PicPay Card Black               | "2 visitas/ano LoungeKey" no catálogo é **errado**. Real: LoungeKey **pago** (sem cota gratuita), só Sala Mastercard GRU é grátis. As 2 visitas grátis pertencem ao **PicPay Card Black Epic**.                                                                                                      |
| ❌ **W14** | C6 Carbon                       | "2,5 pts/USD nacional, 3,5 internacional" é **errado**. Real: pontuação por tier de investimento (2,5 → 2,7 → 3,0 → 3,5 com R$ 1M). Não há diferenciação nacional/internacional.                                                                                                                     |
| ⚠️ **W15** | C6 Carbon                       | Lounge "ilimitado" é **errado pra titular padrão**. Real: 4 visitas/ano via DragonPass (substituiu Priority Pass em dez/2025). Ilimitado só com R$ 1M ou gasto R$ 20k/mês × 3 meses, ou no C6 Graphene.                                                                                              |
| ⚠️ **W18** | Sicredi Visa Platinum           | Anuidade **R$ 0** no catálogo é **incompleta**. Real: anuidade nominal R$ 400/ano; isenção depende da cooperativa (varia por região). Para perfil R$ 1.500/mês com retorno de R$ 120,99 modelado, retorno líquido **viraria negativo** se anuidade for R$ 400. **Profile A do teste está suspeito.** |
| ⚠️ **W22** | Nomad Explorer Visa Infinite    | "4 visitas Dragon Pass" no catálogo está **incompleto**. Real: as 4 visitas exigem gasto médio de R$ 4.500/mês; com R$ 3.500/mês são só 2/ano. Lounge próprio Nomad GRU ilimitado é separado.                                                                                                        |
| ⚠️ **W23** | Bradesco Elo Nanquim            | Anuidade **R$ 1.428** no catálogo pode estar errada. Fontes externas indicam R$ 1.356 (12× R$ 113). Diferença ~5%. Site Bradesco JS-only, inacessível pra confirmar.                                                                                                                                 |
| ⚠️ **W11** | PicPay Card Black               | Mecanismo "Investback (CDB automático)" **não confirmado pela help center oficial PicPay** — só por blog terceiro. Help center descreve cashback simples em fatura. Pode ser específico do Epic ou regra recente.                                                                                    |

---

## Detalhe — Agent 1 (Inter Win Black + Nubank Ultravioleta)

### W1 — Inter Win Black anuidade R$ 0 permanente

- **Status:** ⚠️ Inconclusivo — anuidade R$ 0 só persiste enquanto mantiver R$ 1M investido
- **Evidência:** "Zero anuidade para clientes com investimentos a partir de R$ 1 milhão" (blog.inter.co)
- **Fonte:** https://blog.inter.co/cliente-inter-win/ , https://www.melhoresdestinos.com.br/cartao-credito-inter-black-win.html

### W2 — Inter Win Black exige R$ 1M no Inter Private

- **Status:** ✅ Confirmado
- **Evidência:** "É necessário possuir acima de R$ 1 milhão em investimentos com o Inter" (blog.inter.co)
- **Fonte:** https://blog.inter.co/cliente-inter-win/
- **Nota:** Inter chama o segmento de "Win" (Inter Wealth Management), não "Private". `requiresRelationship: "private"` no Stackr é um label funcional ok.

### W3 — Nubank Ultravioleta anuidade R$ 1.068, isenção R$ 8k/mês ou R$ 50k investido

- **Status:** ✅ Confirmado
- **Evidência:** "R$89 monthly fee" + isenção por "Spending over R$8,000 on the credit card, OR Maintaining R$50,000 in savings or investments with Nubank"
- **Fonte:** https://nubank.com.br/ultravioleta

### W4 — Nubank Ultravioleta cashback 1,25%

- **Status:** ✅ Confirmado
- **Evidência:** "Ganhe 1,25% de cashback ou a partir de 2,2 pontos por dólar gasto"
- **Fonte:** https://nubank.com.br/ultravioleta
- **Nota:** Saldo NuPay rendendo Selic não foi confirmado nesta auditoria; é benefício histórico geral do Nubank.

### W5 — Nubank Ultravioleta lounge "ilimitado"

- **Status:** ⚠️ Inconclusivo / catálogo simplifica
- **Evidência:** "4 visitas por ano às mais de 1.700 salas VIP da rede Priority Pass" + "Unlimited and complimentary for Ultravioleta cardholders" (Ultravioleta Lounge GRU)
- **Fonte:** https://nubank.com.br/ultravioleta/cartao-black/ultravioleta-lounge
- **Nota:** Marcar `unlimited: true` é incorreto pro Priority Pass — ilimitado só é o GRU.

### W6 — IOF zero + spread 3,5%

- **Status:** ✅ Confirmado
- **Evidência:** "tarifa é totalmente zerada em sua fatura" + spread 3,5%
- **Fonte:** https://nubank.com.br/ultravioleta/cartao-black/iof-zero
- **Nota:** Mecanismo IOF é reembolso na fatura em até 7 dias, não isenção na origem. Efeito líquido zero, mas vale registrar.

---

## Detalhe — Agent 2 (Itaú Personnalité + PicPay Card Black)

### W7 — Itaú Personnalité anuidade R$ 1.056 + isenção R$ 10k/mês ou R$ 50k

- **Status:** ✅ Confirmado
- **Evidência:** "12 prestações de R$ 88,00" = R$ 1.056; "Mantendo volume de investimentos no Itaú Personnalité a partir de R$ 50 mil; ou mantendo volume mensal de gastos em compras por fatura a partir de R$ 10 mil"
- **Fonte:** https://altarendablog.com.br/2026/03/26/itau-personnalite-visa-infinite-2026
- **Nota:** Existe terceira via via "Minhas Vantagens" nível 2+ não modelada.

### W8 — Itaú Personnalité 2 pts/USD nacional + 3 internacional + transfer 1:1 Smiles

- **Status:** ✅ Confirmado
- **Nota:** Programa atual é "Pontos e Cashback Itaú" (antigo Sempre Presente), não exclusivamente Smiles. Transfere 1:1 para Smiles, LATAM Pass, Azul, TAP. O `pointsProgram: "smiles"` no catálogo é simplificação.
- **Fonte:** https://pontospravoar.com/guia-completo-conheca-o-cartao-itau-personnalite-visa-infinite/

### W9 — Itaú Personnalité lounge "ilimitado"

- **Status:** ❌ **Errado**
- **Evidência:** "2 acessos gratuitos por cartão" via Visa Airport Companion (DragonPass). Visitas adicionais US$ 32 cada
- **Fonte:** https://pontospravoar.com/guia-completo-conheca-o-cartao-itau-personnalite-visa-infinite/
- **Nota:** Ilimitado existe **só no Itaú The One Mastercard Black**. Catálogo precisa ser corrigido para `visitsPerYear: 2` + provider DragonPass.

### W10 — PicPay Card Black R$ 1.068, primeiro ano grátis, isenção R$ 5k/mês ou R$ 50k

- **Status:** ✅ Confirmado
- **Fonte:** https://meajuda.picpay.com/hc/pt-br/articles/25183055421843

### W11 — PicPay Card Black investback 1,20% via CDB automático

- **Status:** ⚠️ Inconclusivo
- **Evidência:** Taxa 1,2% confirmada por blog oficial. Mas help center oficial PicPay descreve cashback como crédito em fatura — sem mencionar CDB automático rendendo 102% CDI (que aparece só em fonte terceira).
- **Fonte:** https://blog.picpay.com/cashback-cartao-black/ , https://meajuda.picpay.com/hc/pt-br/articles/15643509034131
- **Nota:** Pode ser específico do Epic ou regra mais recente sem documentação.

### W12 — PicPay Card Black 2 visitas/ano LoungeKey

- **Status:** ❌ **Errado**
- **Evidência:** Card Black padrão tem LoungeKey **pago** (sem cota grátis); só sala Mastercard GRU é grátis. As 2 visitas grátis pertencem ao **PicPay Card Black Epic**.
- **Fonte:** https://meajuda.picpay.com/hc/pt-br/articles/21683946577043 , https://altarendablog.com.br/2026/02/24

---

## Detalhe — Agent 3 (C6 Carbon + Revolut Metal + Sicredi)

### W13 — C6 Carbon R$ 1.176 + isenção R$ 8k/mês ou R$ 50k

- **Status:** ✅ Confirmado
- **Evidência:** "12x de R$ 98" = R$ 1.176; "Gastar a partir de R$ 8 mil por mês na fatura" + "Investir a partir de R$ 50 mil em renda fixa (LCA, LCI, LF, Compromissadas ou CDBs) contratados e emitidos exclusivamente pelo C6 Bank"
- **Fonte:** https://www.c6bank.com.br/blog/como-ter-um-c6-carbon-gratuito-ou-ter-desconto-na-anuidade
- **Nota:** A isenção via investimento exige produtos específicos do C6 (não qualquer renda fixa). Há terceira via via R$ 1M em qualquer aplicação não modelada.

### W14 — C6 Carbon 2,5 nacional / 3,5 internacional

- **Status:** ❌ **Errado**
- **Evidência:** "2,5 pontos a cada 1 dólar, sendo compra nacional ou internacional – não existe diferenciação". A progressão real é por tier de investimento: 2,5 (base) → 2,7 (R$ 250k) → 3,0 (R$ 500k) → 3,5 (R$ 1M).
- **Fonte:** https://www.cartoesdecredito.me/milhas/as-3-diferentes-pontuacoes-do-c6-carbon-mastercard-black/

### W15 — C6 Carbon lounge "ilimitado"

- **Status:** ⚠️ Inconclusivo (errado pra titular padrão)
- **Evidência:** "Clientes C6 Carbon com menos de R$ 1 milhão em investimentos têm direito a 4 acessos anuais gratuitos"
- **Fonte:** https://pontospravoar.com/acesso-as-salas-vip-dragonpass-com-cartoes-c6/
- **Nota:** Provider real **não é mais Priority Pass** — passou pra DragonPass em dezembro/2025. Ilimitado é com R$ 1M investido **ou** gasto R$ 20k/mês × 3 meses **ou** no C6 Graphene.

### W16 — Revolut Metal R$ 79,99 com isenção R$ 8k

- **Status:** ✅ Confirmado
- **Evidência:** "R$ 79,99 por mês, isento no mês em que a fatura for acima de R$ 8.000"
- **Fonte:** https://www.revolut.com/pt-BR/our-pricing-plans/

### W17 — Revolut Metal disponível pra brasileiros como produto local

- **Status:** ✅ Confirmado (com ressalvas)
- **Evidência:** Revolut Sociedade de Crédito Direto S.A. (CNPJ 51.342.763/0001-51), autorizada pelo BCB. Plano Metal é um dos cinco disponíveis localmente em 2026.
- **Fonte:** https://www.melhoresdestinos.com.br/milhas/novidades-revolut-zera-iof-cartao-ultra
- **Nota:** Havia restrição até ~2025; foi removida com lançamento do portfólio completo.

### W18 — Sicredi Visa Platinum anuidade R$ 0

- **Status:** ⚠️ Inconclusivo — provavelmente errado por simplificação
- **Evidência:** Anuidade nominal R$ 400/ano (12× R$ 33,34); isenção depende da cooperativa Sicredi (varia por região). Algumas cooperativas anunciaram isenção pra associados; outras não.
- **Fonte:** https://pontospravoar.com/cartao-sicredi-visa-platinum-analise/ , https://www.sicredi.com.br/coop/caminhodasaguasrs/noticias/produtos/cartao-sicredi-platinum-agora-oferece-anuidade-gratis-aos-associados/
- **Nota crítica:** Profile A do teste recomenda Sicredi Visa Platinum como top com R$ 120,99 retorno/ano. Se anuidade for R$ 400 (não R$ 0), o líquido **fica negativo**. Vale revisitar o `annualFeeBrl: 0` deste cartão.

---

## Detalhe — Agent 4 (RecargaPay/Genial/XP/Nomad/Bradesco/Inter Prime)

### W19 — RecargaPay Titan investback 2% com R$ 30k

- **Status:** ✅ Confirmado
- **Evidência:** "2% cashback em todas as compras... Acesso requer investimento mínimo de R$ 30.000 em CDB"
- **Fonte:** https://recargapay.com.br/cartao-de-credito/titan
- **Nota:** O produto se autodenomina "cashback", não "investback" — mecanismo é o mesmo. CDB de 6 meses sem resgate antecipado, rende 110% CDI.

### W20 — Genial Mastercard Black 1% cashback, R$ 0, LoungeKey 8/ano, R$ 50k

- **Status:** ✅ Confirmado
- **Evidência:** "1% cashback em gCoins... 8 acessos gratuitos por ano (LoungeKey) a partir de 20/jan/2026... R$ 50.000 para elegibilidade"
- **Fonte:** https://altarendablog.com.br/2025/04/14/mastercard-black-genial-sem-anuidade
- **Nota:** Cartão foi lançado com LoungeKey ilimitado — reduzido pra 8/ano em jan/2026. Catálogo já reflete a regra atual. cashback (gCoins) → Azul/Smiles/Livelo ou reinvestir.

### W21 — XP One Visa Infinite anuidade R$ 0, investback, R$ 5k

- **Status:** ✅ Confirmado
- **Evidência:** "Anuidade gratuita para sempre... investimento entre R$ 5.000 e R$ 49.999... Investback 0% (até R$ 1.500), 0,5% (R$ 1.500–3.000), 1% (acima de R$ 3.000)"
- **Fonte:** https://www.xpi.com.br/produtos/cartao-de-credito/
- **Nota:** Investback é escalonado por gasto mensal. Acima de R$ 50k investidos migra para XP Visa Infinite (não-One).

### W22 — Nomad Explorer R$ 0, Dragon Pass 4/ano

- **Status:** ⚠️ Inconclusivo / desatualizado
- **Evidência:** "2 visitas gratuitas/ano com R$ 3.500+ de média mensal; **4 visitas gratuitas/ano com R$ 4.500+**" (mudança recente). Lounge Nomad GRU separado e ilimitado.
- **Fonte:** https://pontospravoar.com/nomad-muda-regras-acesso-salas-vip-cartao-explorer/
- **Nota:** O claim "4 visitas/ano via Dragon Pass" é incompleto — exige gasto médio R$ 4.500/mês, não é incondicional. Anuidade R$ 0 confirmado.

### W23 — Bradesco Elo Nanquim R$ 1.428, isenção R$ 10k/mês, Livelo

- **Status:** ⚠️ Inconclusivo
- **Evidência:** Fontes apontam **R$ 1.356/ano** (12× R$ 113), não R$ 1.428. Programa Livelo confirmado. Isenção: 50% com R$ 5k anual; 100% com R$ 10k anual (não mensal).
- **Fonte:** https://www.cartoesdecredito.me/cartoes/cartao-de-credito-bradesco-elo-nanquim/
- **Nota:** Anuidade pode ser reajuste 2024/2025 não capturado. Catálogo armazena `annualFeeWaiverThresholdBrl: 10000` (mensal) — mas a fonte diz que é **anual médio**, não mensal. **Possível erro semântico.**

### W24 — Inter Prime R$ 0, R$ 150k investido, lounge "carded"

- **Status:** ✅ Confirmado
- **Evidência:** "Acesso ilimitado às salas VIP do Inter (próprias) + 6 Priority Pass visits annually... R$ 150.000 investidos"
- **Fonte:** https://altarendablog.com.br/2026/04/01/novo-inter-prime , https://passageirodeprimeira.com/inter-prime-acesso-ilimitado-a-salas-vip
- **Nota:** Catálogo é parcialmente correto — também inclui 6 acessos Priority Pass não modelados. Outras vias de acesso não modeladas: gasto R$ 7k/mês × 4 meses, ou Duo Gourmet anual.

---

## Recomendações pro YAML do `stackr-api`

| Cartão                            | Mudança no YAML                                                                                                                                                      |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `itau-personnalite-visa-infinite` | `loungeAccess.unlimited` → remove; `visitsPerYear: 2`; `providers: ["dragon-pass"]` (era priority-pass)                                                              |
| `picpay-mastercard-black`         | `loungeAccess.visitsPerYear: 2` → 0 (ou criar novo card `picpay-mastercard-black-epic` para o caso 2/ano). Registrar sala Mastercard GRU como `carded`.              |
| `c6-carbon-mastercard-black`      | `loungeAccess.unlimited` → remove; `visitsPerYear: 4`; `providers: ["dragon-pass"]` (era priority-pass); `pointsPerUsdInternational` → 2,5 (igual nacional, não 3,5) |
| `sicredi-visa-platinum`           | `annualFeeBrl: 400` (era 0); adicionar `annualFeeWaiverThresholdBrl` ou nota de variação por cooperativa                                                             |
| `nomad-explorer-visa-infinite`    | `loungeAccess.visitsPerYear: 4` → tornar condicional ou criar `loungeAccess.conditionalMonthlySpendBrl: 4500`; documentar lounge Nomad GRU separado                  |
| `bradesco-elo-nanquim`            | Confirmar anuidade; verificar se isenção é mensal ou média anual (semântica `annualFeeWaiverThresholdBrl`)                                                           |
| `nubank-ultravioleta`             | `loungeAccess.unlimited` → remove (só GRU é ilimitado); `visitsPerYear: 4` para Priority Pass                                                                        |
| `inter-prime-mastercard`          | Adicionar 6 visitas Priority Pass anuais ao modelo; documentar vias de acesso alternativas                                                                           |

> **Atenção especial em Sicredi Visa Platinum.** O Stackr está hoje recomendando esse cartão como top da Profile A (gasto R$ 1.500/mês) com retorno modelado R$ 120,99. Se a anuidade real for R$ 400, o usuário sai no negativo. Esse é o cenário mais perigoso da auditoria — recomendar um produto que parece ganhar, mas perde.
