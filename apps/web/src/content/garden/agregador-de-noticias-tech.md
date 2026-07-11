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

<svg width="100%" viewBox="0 0 700 460" role="img" aria-label="Diagrama do fluxo de score via IA">
<defs>
<marker id="ar2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="#5F5E5A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker>
<marker id="arw2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="#BA7517" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker>
</defs>

<rect x="30" y="20" width="160" height="60" rx="8" fill="#F1EFE8" stroke="#5F5E5A" stroke-width="0.5"/>
<text x="110" y="46" text-anchor="middle" font-size="14" font-weight="500" fill="#2C2C2A">item novo</text>
<text x="110" y="64" text-anchor="middle" font-size="12" fill="#5F5E5A">hn, tabnews, dev.to...</text>

<rect x="270" y="20" width="160" height="60" rx="8" fill="#FAECE7" stroke="#993C1D" stroke-width="0.5"/>
<text x="350" y="46" text-anchor="middle" font-size="14" font-weight="500" fill="#4A1B0C">keyword fallback</text>
<text x="350" y="64" text-anchor="middle" font-size="12" fill="#993C1D">score na hora</text>

<rect x="270" y="150" width="160" height="60" rx="8" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
<text x="350" y="176" text-anchor="middle" font-size="14" font-weight="500" fill="#04342C">agente ia</text>
<text x="350" y="194" text-anchor="middle" font-size="12" fill="#0F6E56">score 0-100, background</text>

<rect x="510" y="85" width="160" height="60" rx="8" fill="#F1EFE8" stroke="#5F5E5A" stroke-width="0.5"/>
<text x="590" y="111" text-anchor="middle" font-size="14" font-weight="500" fill="#2C2C2A">cache</text>
<text x="590" y="129" text-anchor="middle" font-size="12" fill="#5F5E5A">24h por item</text>

<rect x="270" y="280" width="160" height="60" rx="8" fill="#F1EFE8" stroke="#5F5E5A" stroke-width="0.5"/>
<text x="350" y="306" text-anchor="middle" font-size="14" font-weight="500" fill="#2C2C2A">corte &#8805; 61</text>
<text x="350" y="324" text-anchor="middle" font-size="12" fill="#5F5E5A">filtro final</text>

<rect x="270" y="380" width="160" height="60" rx="8" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
<text x="350" y="406" text-anchor="middle" font-size="14" font-weight="500" fill="#04342C">feed mix</text>
<text x="350" y="424" text-anchor="middle" font-size="12" fill="#0F6E56">o que eu leio</text>

<line x1="190" y1="50" x2="270" y2="50" stroke="#5F5E5A" stroke-width="0.5" marker-end="url(#ar2)"/>
<text x="230" y="40" text-anchor="middle" font-size="11" fill="#5F5E5A">1</text>

<line x1="190" y1="65" x2="270" y2="170" stroke="#5F5E5A" stroke-width="0.5" marker-end="url(#ar2)"/>
<text x="205" y="120" font-size="11" fill="#5F5E5A">2, em paralelo</text>

<path d="M430 50 L470 50 L470 115 L510 115" fill="none" stroke="#993C1D" stroke-width="0.5" marker-end="url(#ar2)"/>
<text x="475" y="40" font-size="11" fill="#993C1D">score provisório</text>

<path d="M430 180 L470 180 L470 130 L510 130" fill="none" stroke="#0F6E56" stroke-width="0.5" marker-end="url(#ar2)"/>
<text x="475" y="205" font-size="11" fill="#0F6E56">score real substitui</text>

<line x1="590" y1="145" x2="350" y2="280" stroke="#5F5E5A" stroke-width="0.5" marker-end="url(#ar2)"/>
<text x="470" y="250" text-anchor="middle" font-size="11" fill="#5F5E5A">3</text>

<line x1="350" y1="340" x2="350" y2="380" stroke="#5F5E5A" stroke-width="0.5" marker-end="url(#ar2)"/>

<path d="M350 310 L120 310 L120 80" fill="none" stroke="#BA7517" stroke-width="0.5" stroke-dasharray="5 5" marker-end="url(#arw2)"/>
<text x="130" y="200" font-size="12" fill="#854F0B">score &lt; 61: descarta, some do feed</text>

<text x="350" y="450" text-anchor="middle" font-size="12" fill="#888780">linha cheia = fluxo de score, tracejada = descarte</text>
</svg>

_item entra, keyword da nota na hora, agente ia reclassifica em background e sobrescreve, cache guarda por 24h, só passa quem tira 61 ou mais._

cansei de abrir 5 aba pra saber o que rolou no dia: hacker news, tabnews, dev.to, lobsters, twitter. cada um com layout diferente, cada um querendo prender atenção. fiz um agregador que junta tudo numa lista só, e delego pra IA a parte chata: decidir o que é relevante.

**score de relevância via agente ia**, cada item novo passa por um agente de IA com um prompt curto: título + corpo, devolve nota de 0 a 100 de quão "tech" aquilo é. sem isso, timeline de agregador vira lixo genérico: post de dieta no hacker news, thread política no lobsters.

**fallback por keyword**, enquanto o agente não classificou (ou se a chamada falha), uma lista de ~100 termos (`typescript`, `docker`, `kubernetes`, `llm` etc) estima o score contando ocorrência no texto. rústico, mas mantém o feed usável sem esperar a IA responder.

**scoring em background**, a classificação real roda assíncrona depois que o item já apareceu com o score do keyword-fallback. resultado fica em cache por 24h, não reclassifico o mesmo post a cada request.

**corte em 61**, só passa pro feed final quem tira score ≥ 61. é o filtro que substitui eu mesmo decidindo "isso vale meu tempo?" pra cada link.

---

o ganho não é ler mais notícia, é ler menos e melhor. a IA faz o trabalho de peneirar sinal de ruído antes de eu gastar atenção nisso. o tempo que sobrava decidindo "abro ou não abro" agora vai pra entender o conteúdo. produtividade real aqui é sobre atenção, não sobre volume.
