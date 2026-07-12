---
title: "o que ia realmente faz por trás do prompt"
pubDate: 2026-07-12
tags:
  [ia, llm, tokens, probabilidade, machine-learning, arquitetura]
---

ia virou palavra-coringa. serve pra descrever desde um filtro de spam até um modelo que escreve código. mas por baixo do hype, o que acontece quando você aperta enter num prompt?

**tokens**, tudo começa aqui. o texto não entra inteiro no modelo, ele é fatiado em pedaços chamados tokens. podem ser palavras inteiras, pedaços de palavras, ou até caracteres individuais. "transformador" vira um token. "desempacotando" pode virar dois. o modelo não lê palavras como a gente lê, ele lê números. cada token tem um id numérico num vocabulário que pode ter 50 mil, 100 mil entradas.

**embedding**, depois de tokenizado, cada id vira um vetor de números reais. não é um número só, é uma lista de centenas de dimensões. vetores parecidos ficam próximos nesse espaço matemático. "gato" e "cachorro" ficam mais perto entre si do que de "compilador". o modelo opera nesse espaço, não no texto original.

**attention**, o mecanismo que dá nome à arquitetura transformer. cada token olha pra todos os outros tokens da sequência e calcula "o quanto eu devo prestar atenção em você?". "banco" perto de "dinheiro" puxa o sentido financeiro. "banco" perto de "praça" puxa o sentido de mobília. é matemática de matrizes, sem mágica.

**predição próxima**, no fim das contas, o modelo só faz uma coisa: dado tudo que veio antes, qual o próximo token mais provável? ele não "pensa", não "sabe", não "entende". ele distribui probabilidade sobre o vocabulário inteiro. temperatura controla o quão arriscado ele é: baixa = escolhe sempre o mais provável, alta = deixa tokens menos prováveis terem chance.

**treinamento**, antes de responder qualquer coisa, o modelo passou por uma fase de ver trilhões de tokens. não memorizou, ajustou pesos. bilhões de parâmetros numéricos que foram sendo tweaked pra minimizar o erro de prever o próximo token. é estatística em escala, não inteligência no sentido humano.

**alucinação**, quando o modelo inventa fato com confiança. acontece porque ele foi treinado pra soar plausível, não pra ser verdadeiro. a métrica de sucesso durante o treino era "o token previsto bateu com o real?", não "isso é fato?". por isso ele cita artigo que não existe com tanta naturalidade quanto cita um real.

**context window**, o limite de tokens que o modelo consegue ver de uma vez. tudo que não couber ali, ele não sabe que existe. é por isso que conversas longas degradam: o começo vai sendo empurrado pra fora da janela. modelos com janela maior não são "mais inteligentes", só enxergam mais texto de uma vez.

---

ia generativa é um motor de probabilidade sofisticado, não um oráculo. funciona absurdamente bem pra reformular, resumir, gerar rascunho, traduzir. falha feio quando precisa de precisão factual ou raciocínio que depende de contexto que não está no prompt. o truque é usar como ferramenta, não como substituto de julgamento.
