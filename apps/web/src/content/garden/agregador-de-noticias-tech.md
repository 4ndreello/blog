---
title: "usei IA pra filtrar minha timeline"
pubDate: 2026-07-11
tags:
  [
    agregador,
    ia,
    agente-ia,
    rss,
    react,
    hacker-news,
    tabnews,
    dev-to,
    lobsters,
    produtividade,
    side-project,
  ]
---

cansei de abrir várias aba pra saber o que rolou no dia: hacker news, tabnews, twitter. cada um com layout diferente, cada um querendo prender atenção. fiz um agregador que junta tudo numa lista só, e delego pra IA a parte chata: decidir o que é relevante.

![feed do agregador misturando as fontes](/images/agregador/feed-mix.png)

**status dos serviços**, também tinha o hábito de abrir status page da aws, gcp, cloudflare, github, vercel separado, só pra saber se algum problema que eu tava vendo era eu ou era o mundo caindo. juntei isso no mesmo painel do agregador, do lado das fontes do feed. um lugar só pra saber "tá tudo operacional" ou "não, o problema não é meu código".

![painel de fontes do feed e status dos serviços](/images/agregador/status-fontes.png)

**score de relevância via agente ia**, cada item novo passa por um agente de IA com um prompt curto: título + corpo, devolve nota de 0 a 100 de quão "tech" aquilo é. sem isso, timeline de agregador vira lixo genérico: post de dieta no hacker news, thread política no lobsters.

**fallback por heurística**, enquanto o agente não classificou (ou se a chamada falha), uma lista de ~100 termos (`typescript`, `docker`, `kubernetes`, `llm` etc) estima o score contando ocorrência no texto. rústico, mas mantém o feed usável sem esperar a IA responder.

**scoring em background**, a classificação real roda assíncrona depois que o item já apareceu com o score da heurística. resultado fica em cache por 24h (mesmo padrão do [cache-aside que já falei aqui](/fragmentos/cinco-padroes-de-cache)).

**corte em 61**, só passa pro feed final quem tira score ≥ 61. é o filtro que substitui eu mesmo decidindo "isso vale meu tempo?" pra cada link.

<svg width="100%" viewBox="0 0 640 620" role="img" aria-label="Diagrama do fluxo de score via IA">
<defs>
<marker id="ar2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="#5F5E5A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker>
<marker id="arw2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="#BA7517" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker>
</defs>

<rect x="240" y="20" width="160" height="60" rx="8" fill="#F1EFE8" stroke="#5F5E5A" stroke-width="0.5"/>
<text x="320" y="46" text-anchor="middle" font-size="14" font-weight="500" fill="#2C2C2A">item novo</text>
<text x="320" y="64" text-anchor="middle" font-size="12" fill="#5F5E5A">hn, tabnews, dev.to...</text>

<rect x="40" y="150" width="180" height="60" rx="8" fill="#FAECE7" stroke="#993C1D" stroke-width="0.5"/>
<text x="130" y="176" text-anchor="middle" font-size="14" font-weight="500" fill="#4A1B0C">keyword fallback</text>
<text x="130" y="194" text-anchor="middle" font-size="12" fill="#993C1D">score na hora</text>

<rect x="420" y="150" width="180" height="60" rx="8" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
<text x="510" y="176" text-anchor="middle" font-size="14" font-weight="500" fill="#04342C">agente ia</text>
<text x="510" y="194" text-anchor="middle" font-size="12" fill="#0F6E56">score 0-100, background</text>

<rect x="240" y="280" width="160" height="60" rx="8" fill="#F1EFE8" stroke="#5F5E5A" stroke-width="0.5"/>
<text x="320" y="306" text-anchor="middle" font-size="14" font-weight="500" fill="#2C2C2A">cache</text>
<text x="320" y="324" text-anchor="middle" font-size="12" fill="#5F5E5A">24h por item</text>

<rect x="240" y="400" width="160" height="60" rx="8" fill="#F1EFE8" stroke="#5F5E5A" stroke-width="0.5"/>
<text x="320" y="426" text-anchor="middle" font-size="14" font-weight="500" fill="#2C2C2A">corte &#8805; 61</text>
<text x="320" y="444" text-anchor="middle" font-size="12" fill="#5F5E5A">filtro final</text>

<rect x="240" y="530" width="160" height="60" rx="8" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
<text x="320" y="556" text-anchor="middle" font-size="14" font-weight="500" fill="#04342C">feed mix</text>
<text x="320" y="574" text-anchor="middle" font-size="12" fill="#0F6E56">o que eu leio</text>

<rect x="440" y="400" width="160" height="60" rx="8" fill="#FAECE7" stroke="#993C1D" stroke-width="0.5"/>
<text x="520" y="426" text-anchor="middle" font-size="14" font-weight="500" fill="#4A1B0C">descarta</text>
<text x="520" y="444" text-anchor="middle" font-size="12" fill="#993C1D">some do feed</text>

<path d="M300 80 L130 150" fill="none" stroke="#5F5E5A" stroke-width="0.5" marker-end="url(#ar2)"/>
<path d="M340 80 L510 150" fill="none" stroke="#5F5E5A" stroke-width="0.5" marker-end="url(#ar2)"/>
<text x="320" y="115" text-anchor="middle" font-size="11" fill="#5F5E5A">chega, dispara os dois em paralelo</text>

<path d="M150 210 L280 280" fill="none" stroke="#993C1D" stroke-width="0.5" marker-end="url(#ar2)"/>
<text x="145" y="250" font-size="11" fill="#993C1D">score provisório</text>

<path d="M490 210 L360 280" fill="none" stroke="#0F6E56" stroke-width="0.5" marker-end="url(#ar2)"/>
<text x="425" y="250" font-size="11" fill="#0F6E56">score real, atraso</text>

<line x1="320" y1="340" x2="320" y2="400" stroke="#5F5E5A" stroke-width="0.5" marker-end="url(#ar2)"/>

<line x1="320" y1="460" x2="320" y2="530" stroke="#5F5E5A" stroke-width="0.5" marker-end="url(#ar2)"/>
<text x="335" y="500" font-size="11" fill="#5F5E5A">score &#8805; 61</text>

<path d="M400 420 L440 420" fill="none" stroke="#BA7517" stroke-width="0.5" stroke-dasharray="5 5" marker-end="url(#arw2)"/>
<text x="405" y="410" font-size="11" fill="#854F0B">score &lt; 61</text>

<text x="320" y="610" text-anchor="middle" font-size="12" fill="#888780">linha cheia = segue no fluxo, tracejada = descarte</text>
</svg>

_item entra, keyword da nota na hora, agente ia reclassifica em background e sobrescreve, cache guarda por 24h, só passa quem tira 61 ou mais._

---

o ganho não é ler mais notícia, é ler menos e melhor. a IA faz o trabalho de peneirar sinal de ruído antes de eu gastar atenção nisso. o tempo que sobrava decidindo "abro ou não abro" agora vai pra entender o conteúdo. produtividade real aqui é sobre atenção, não sobre volume.

quem quiser ver rodando: [news.andreello.dev.br](https://news.andreello.dev.br)
