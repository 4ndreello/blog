---
title: "cache, cinco visões sobre"
pubDate: 2026-07-08
tags: [cache, cache-aside, read-through, write-through, write-behind, write-around, performance, backend, arquitetura-de-software, banco-de-dados, consistencia]
---

<svg width="100%" viewBox="0 0 700 420" role="img" aria-label="Diagrama do fluxo cache-aside">
<defs>
<marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="#5F5E5A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker>
<marker id="arw" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="#BA7517" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker>
</defs>

<rect x="40" y="170" width="140" height="60" rx="8" fill="#F1EFE8" stroke="#5F5E5A" stroke-width="0.5"/>
<text x="110" y="196" text-anchor="middle" font-size="14" font-weight="500" fill="#2C2C2A">App</text>
<text x="110" y="214" text-anchor="middle" font-size="12" fill="#5F5E5A">decide tudo</text>

<rect x="340" y="40" width="160" height="60" rx="8" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
<text x="420" y="66" text-anchor="middle" font-size="14" font-weight="500" fill="#04342C">Cache</text>
<text x="420" y="84" text-anchor="middle" font-size="12" fill="#0F6E56">rápido, pequeno</text>

<rect x="340" y="300" width="160" height="60" rx="8" fill="#FAECE7" stroke="#993C1D" stroke-width="0.5"/>
<text x="420" y="326" text-anchor="middle" font-size="14" font-weight="500" fill="#4A1B0C">Banco</text>
<text x="420" y="344" text-anchor="middle" font-size="12" fill="#993C1D">fonte da verdade</text>

<line x1="180" y1="180" x2="340" y2="55" stroke="#5F5E5A" stroke-width="0.5" marker-end="url(#ar)"/>
<text x="245" y="105" font-size="12" fill="#5F5E5A">1. lê cache</text>

<line x1="340" y1="85" x2="180" y2="200" stroke="#5F5E5A" stroke-width="0.5" marker-end="url(#ar)"/>
<text x="245" y="160" font-size="12" fill="#5F5E5A">2. hit: retorna</text>

<line x1="180" y1="220" x2="340" y2="320" stroke="#5F5E5A" stroke-width="0.5" marker-end="url(#ar)"/>
<text x="185" y="295" font-size="12" fill="#5F5E5A">3. miss: busca no banco</text>

<path d="M500 330 L560 330 L560 70 L502 70" fill="none" stroke="#5F5E5A" stroke-width="0.5" marker-end="url(#ar)"/>
<text x="565" y="200" font-size="12" fill="#5F5E5A">4. popula cache</text>

<path d="M110 170 L110 15 L420 15 L420 40" fill="none" stroke="#BA7517" stroke-width="0.5" stroke-dasharray="5 5" marker-end="url(#arw)"/>
<text x="150" y="9" font-size="12" fill="#854F0B">invalida a entrada no cache</text>

<path d="M110 230 L110 380 L420 380 L420 360" fill="none" stroke="#BA7517" stroke-width="0.5" stroke-dasharray="5 5" marker-end="url(#arw)"/>
<text x="150" y="375" font-size="12" fill="#854F0B">escrita: grava no banco</text>

<text x="350" y="410" text-anchor="middle" font-size="12" fill="#888780">linha cheia = leitura, tracejada = escrita</text>
</svg>

*fluxo do cache-aside: a app comanda tudo, lê o cache, se não tem vai no banco, popula, e na escrita invalida.*

tem uns 5 jeitos de organizar cache e todo mundo reinventa os mesmos nomes.

**cache-aside**, a app cuida de tudo. lê: olha o cache, se não tem vai no banco e guarda. escreve: manda pro banco e invalida o cache. simples, funciona, é o padrão default na cabeça de qualquer um.

**read-through**, igual ao aside, só que quem sabe buscar no banco é o próprio cache, não a app. a app nem sabe que existe banco. tipo um proxy.

**write-through**, escreve no cache, o cache propaga pro banco *na hora*, só confirma depois que salvou os dois. seguro, mas mais lento pra escrever.

**write-behind (write-back)**, escreve no cache, confirma na hora, manda pro banco depois em background. rápido, mas se o cache cair no meio do caminho, perdeu dado.

**write-around**, escreve direto no banco, sem tocar no cache. bom pra dado que é escrito muito e lido pouco (log, auditoria). custo: a próxima leitura sempre dá miss.

---

na prática, read-through + write-through andam juntos (cache abstrai tudo). cache-aside + write-around também combinam bem (app controla tudo na mão).

e o cache-aside é o único que sobrevive numa boa se o cache inteiro cair, vira só "mais lento", não quebra nada. os outros dependem do cache pra manter consistência.
