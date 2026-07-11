# Estilo de escrita, fragmentos

Guia pro estilo dos textos aqui dentro. Baseado em `cinco-padroes-de-cache.md`.

## Tom
- português, minúsculo até no título (frontmatter `title` sempre lowercase)
- direto, sem enrolação, sem introdução de "neste post vou falar sobre..."
- conversacional, como se explicasse pra alguém do lado. "e", "só que", "tipo" são normais
- frases curtas. parágrafo grande só quando amarra ideias no fim

## Estrutura
- abre com 1-2 frases batendo o problema/contexto, sem cabeçalho
- termos-chave em **negrito** quando introduzidos, seguido de explicação corrida (não bullet list)
- se tem categorias/tipos, cada um vira um parágrafo curto: `**nome**, explicação direto ao ponto.`
- fecha com `---` e um parágrafo de síntese: quando usar o quê, trade-off real, ou opinião do autor
- sem "conclusão" ou "resumindo" explícito, a síntese já é o fechamento

## Frontmatter
```yaml
title: "termo, variação-do-termo" # minúsculo
pubDate: YYYY-MM-DD
tags: [tag1, tag2, ...] # minúsculo, kebab-case, específicas
```

## Diagramas
- svg inline quando ajuda visualizar fluxo/arquitetura (ver exemplo no cache post)
- paleta: cinza `#5F5E5A` neutro, verde `#0F6E56`/`#E1F5EE` positivo, laranja `#993C1D`/`#FAECE7` alerta/escrita, dourado `#BA7517` pontilhado/invalidação
- legenda em itálico embaixo do svg: `_descrição curta do diagrama._`

## Evitar
- comparações fofas, jargão de marketing, "revolucionário", "poderoso"
- bullet points genéricos, preferir prosa corrida com negrito nos termos
- explicar o óbvio
- **travessão (—). NUNCA. usuário odeia. usar vírgula, ponto, ou parênteses no lugar.**
