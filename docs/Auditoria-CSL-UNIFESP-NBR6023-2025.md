# Auditoria de conformidade ABNT NBR 6023:2025

**Objeto:** estilo CSL `universidade-federal-de-sao-paulo-abnt` (variante autoria completa) e sua variante `-initials`, derivados do estilo ABNT do IBICT.
**Referência normativa:** ABNT NBR 6023:2025 (terceira edição, 21.05.2025), texto integral.
**Natureza:** auditoria de leitura, verificada contra todos os modelos da Seção 7, as regras da Seção 8 e os Anexos A e B. Nenhuma linha do estilo foi alterada.
**Data:** 13 jun. 2026.

## 1 Sumário executivo

O estilo cobre bem os tipos bibliográficos correntes (monografia, capítulo, artigo de periódico, tese e correspondência) e acerta os elementos transversais mais sensíveis: sobrenome em caixa alta, separação por ponto e vírgula, listagem integral de autores na bibliografia, título em negrito, sequência `Local: Editora, ano` e o bloco de acesso `Disponível em: ... Acesso em: ...`.

As não conformidades concentram-se em três frentes. A primeira, e mais grave para o objetivo da UNIFESP, é o documento jurídico. A norma confirma para legislação o modelo `JURISDIÇÃO. epígrafe. ementa. **Diário Oficial...**: seção, Local, ano, n., p., data` (7.11.1, EXEMPLO 3). O ramo do estilo que produz esse formato responde ao tipo CSL `bill`, mas os itens gerados pelos tradutores do DOU e do Planalto são do tipo Zotero `statute`, que o Zotero exporta como tipo CSL `legislation`. Confirmando-se esse mapeamento em teste, tais itens não acionam o ramo dedicado e caem no modelo genérico, perdendo a ementa e a formatação do periódico oficial. A segunda frente é a ausência de tratamento para jurisprudência (`legal_case`), atos administrativos normativos, eventos no todo, partitura e documento tridimensional. A terceira reúne desvios de transcrição: subtítulo herdando o negrito do título, caixa alta no título inteiro em entradas por título (livros sem autor, filmes, fonogramas e autoria desconhecida), rótulo de organizador no plural, espaçamento de `[S. l.]` e `[s. n.]`, mês no idioma do estilo em vez do idioma original e sobrenome sem caixa alta na citação no texto.

Conclusão: conformidade alta para a literatura técnico-científica usual; conformidade baixa para documento jurídico e tipos especiais, que são exatamente o foco do trabalho em curso.

## 2 Escopo e método

Foram lidas todas as macros do estilo, o elemento `citation` e o elemento `bibliography` com seu `choose` por tipo. Cada ramo foi confrontado com os modelos da Seção 7, as regras de transcrição da Seção 8 e os Anexos A (abreviatura dos meses) e B (abreviaturas). A auditoria distingue duas camadas:

1. **Lógica do estilo CSL.** O que o estilo gera quando recebe as variáveis corretas.
2. **Mapeamento de tipo Zotero para CSL.** Qual ramo do estilo é acionado para cada tipo de item do Zotero. Vários desvios não estão na lógica do estilo, e sim no fato de o item chegar a um ramo que não foi feito para ele.

Os itens marcados como *verificar* dependem de detalhes internos do Zotero ou do processador (`citeproc-js`) que não são observáveis apenas no arquivo CSL e pedem teste empírico no aplicativo.

## 3 Conformidade dos elementos transversais (Seção 8)

| Elemento | Seção NBR | Situação | Observação |
|---|---|---|---|
| Pessoa física: sobrenome em maiúsculas, prenome, separador `; ` | 8.1.1 | Conforme | `name-as-sort-order="all"`, família em `uppercase`, `delimiter="; "`, `delimiter-precedes-last="always"`. |
| Quatro ou mais autores | 8.1.1.2 | Conforme | A bibliografia não fixa `et-al-min`, logo lista todos, alinhada à norma de 2025, que recomenda indicar todos e apenas permite *et al.* O *et al.* da citação no texto usa `et-al-min="4"`. |
| Responsável por coletânea: `(org.)`, `(ed.)`, `(coord.)` | 8.1.1.4 | Parcial | O rótulo vem de `label form="short"`, que pluraliza conforme o número de nomes. Com dois ou mais organizadores tende a sair `(orgs.)`, enquanto a norma pede o tipo de participação no singular após o último nome (EXEMPLO 4: dois editores, `(ed.)`). |
| Pessoa jurídica e jurisdição | 8.1.2 | Parcial | Não há lógica de hierarquia de órgão (8.1.2.2) nem de homônimos `(Estado)`/`(Município)` (8.1.2.3). A forma `JURISDIÇÃO. Órgão.` depende de como o autor institucional é digitado. |
| Evento como autor | 8.1.3 | Parcial | Ver tipo `paper-conference` na Seção 4. |
| Autoria desconhecida: entrada por título | 8.1.4 | Parcial | A entrada por título funciona, mas todo o título sai em caixa alta (ver Seção 6 deste relatório). |
| Título e subtítulo separados por `: `, título destacado, subtítulo sem destaque | 8.2 | Parcial | O CSL aplica negrito à variável `title` inteira. Como o Zotero guarda título e subtítulo no mesmo campo, o subtítulo herda o negrito, contrariando o EXEMPLO `Arte sacra: espaço sagrado hoje`. Limitação estrutural do CSL. |
| Entrada por título iniciado por artigo | 8.2.1 | Não conforme | O `substitute` usa `text-case="uppercase"` no título inteiro. A norma pede caixa alta só no artigo e na palavra subsequente (`OS GRANDES clássicos das poesias líricas`). |
| Edição | 8.3 | Parcial | A forma `N. ed.` está correta. A norma pede a edição no idioma do documento (`5th ed.` para obra em inglês, EXEMPLO 1), mas o estilo usa sempre o ordinal do locale `pt`. |
| Local; `[S. l.]` na ausência | 8.4 | Parcial | O termo do locale tende a render `[S.l.]` sem o espaço interno; o Anexo B grafa `s. l.` com espaço, e a norma usa `[S. l.]`. |
| Editora; `[s. n.]`; `[S. l.: s. n.]`; duas editoras | 8.5 | Parcial | O estilo define `no-publisher` como `s.n.`, gerando `[s.n.]` sem espaço (Anexo B: `s. n.`). Sem local e sem editora, o CSL produz dois colchetes `[S.l.]: [s.n.]`, enquanto a norma usa colchete único `[S. l.: s. n.]` (8.5.6). Duas editoras em locais distintos (8.5.2) não são representáveis. |
| Ano | 8.6.1 | Parcial | O ano sai correto. Não há geração do copirraite `c2017` (8.6.1.1, EXEMPLO) nem das formas estimadas `[197-]`, `[ca. 1960]`, `[18--]` (8.6.1.3), que dependem do que for digitado e podem não ser analisadas pelo `date`. Sem data, o estilo recorre a `[s.d.]`, forma que a norma não prevê. |
| Mês abreviado, no idioma original, conforme Anexo A | 8.6.2 | Parcial | As abreviaturas em português coincidem com o Anexo A, inclusive `maio` sem abreviação. Porém o `month form="short"` usa o locale do estilo (`pt`); para publicação estrangeira a norma pede o mês no idioma original (`Sept.`, `janv.`), o que o CSL não faz item a item. |
| Descrição física: `p.`, `f.`, `v.` | 8.7 | Parcial | `p.` e `f.` (tese) corretos. Volumes múltiplos e numeração irregular têm suporte limitado. |
| Disponibilidade e acesso | 8.13 | Conforme | `Disponível em: URL. Acesso em: data`. *Verificar* que os termos `available at` e `accessed` resolvem no locale ativo, pois o estilo não os define no próprio bloco `locale`. |

## 4 Conformidade por tipo de item

A coluna "Tipo CSL" indica o tipo para o qual o Zotero exporta o item. Onde o ramo dedicado não existe, o item cai no `else` genérico da bibliografia.

| Tipo Zotero | Tipo CSL | Modelo NBR | Situação | Observação principal |
|---|---|---|---|---|
| Livro | `book` | 7.1 | Parcial | Sequência correta. Subtítulo herda negrito; edição estrangeira no ordinal `pt`. |
| Livro em meio eletrônico | `book` | 7.2 | Parcial | Depende de `medium` digitado (`E-book`, `CD-ROM`). Bloco de acesso correto. |
| Seção de livro | `chapter` | 7.3 | Conforme | `Autor. Parte. In: Autor. **Título**. ed. Local: Editora, ano. p. X-Y`, com *In*: em itálico e parte sem negrito. |
| Tese e dissertação | `thesis` | 7.1.2 | Conforme | Inclui `f.`, o `genre` como `Tese (Grau em Área)`, a vinculação após travessão e o ano repetido, como no modelo. |
| Artigo de periódico | `article-journal` | 7.7.5 | Parcial | `v.`, `n.`, `p.` corretos; periódico em negrito; título do artigo sem negrito. Não há campo para `ano` da publicação, que a norma usa (`ano 3`, `ano 43`); sai como `v.`. Subtítulo herda negrito. |
| Artigo de periódico online | `article-journal` | 7.7.6 | Parcial | Mesmos pontos, com DOI e acesso. |
| Artigo de jornal | `article-newspaper` | 7.7.7 | Parcial | O caderno é antecedido do rótulo `Seção`, enquanto a norma traz o nome do caderno diretamente (`Economia & Negócios, p. B1`). |
| Trabalho ou parte de evento | `paper-conference` | 7.8.4 | Parcial | Número de ocorrência do evento (`9.`) e local de realização não são renderizados; o `[...]` de `Anais [...]` não é gerado. Risco de `In:` ausente ou duplicado conforme a presença de `organizer`. |
| Evento no todo | sem tipo próprio | 7.8.1 | Ausente | Costuma ser cadastrado como livro, sem render do nome do evento como cabeçalho. |
| Patente | `patent` | 7.9 | Parcial | `Depositante:` é ligado à variável `authority`, que costuma ser a autoridade emissora, não o depositante; `Titular` e `Procurador` (EXEMPLO 1) não são tratados. *Verificar* o mapeamento de depositante, titular e procurador. |
| **Legislação (lei, decreto, portaria, etc.)** | **`statute` -> `legislation`** | **7.11.1** | **Não conforme** | **O ramo dedicado responde a `bill`. Itens `statute`, como os gerados pelos tradutores do DOU e do Planalto, são exportados como `legislation` e caem no `else` genérico, sem ementa e sem o periódico oficial em negrito. *Verificar* e, se confirmado, o reparo seria reconhecer `legislation` no `match` do ramo.** |
| Projeto de lei | `bill` | 7.11.1 | Parcial | O ramo existe e acerta o essencial (epígrafe sem negrito, ementa via `abstract`, periódico em negrito), mas usa `, ` no lugar do `: ` antes de `seção`, coloca a seção depois do local, grafa `Seção` em vez de `seção` e não produz o `ano` da publicação. |
| Jurisprudência | `legal_case` | 7.11.3 | Ausente | Sem ramo próprio. Cai no genérico, sem corte, turma, tipo, número do processo, ementa, relator nem `julgado em` data. |
| Atos administrativos normativos | conforme cadastro | 7.11.5 | Ausente | Sem tipo dedicado. Como `statute`, herda o problema da legislação; como documento, vai ao genérico. |
| Documentos civis e de cartórios | sem tipo próprio | 7.12 | Ausente | Sem tratamento (`Registro em:` etc.). |
| Filme e vídeo | `motion_picture` | 7.13.1 | Parcial | `Direção:`, `Produção:`, `Local: produtora, ano` e suporte corretos, mas o título sai em caixa alta integral, e a norma pede só a primeira palavra (`OS PERIGOS do uso de tóxicos`, `BLADE Runner`). Sem diretor, a substituição por título pode duplicar o título; *verificar*. |
| Documento sonoro | `song` | 7.13.3 | Parcial | Mesma caixa alta integral no título. `Compositor:` e `Intérprete:` presentes, mas separados, onde a norma admite `[Compositor e intérprete]:`. |
| Podcast | a confirmar | 7.13.5 | Verificar | Depende de para qual tipo CSL o Zotero exporta `podcast`. |
| Partitura | sem tipo próprio | 7.14 | Ausente | O Zotero não tem tipo nativo de partitura; vai ao genérico. |
| Documento iconográfico | `graphic` | 7.15 | Parcial | O ramo não renderiza a data, que é elemento essencial (`KOBAYASHI, K. **Doença dos xavantes**. 1980. 1 fotografia`). `[Sem título]` não é gerado automaticamente. |
| Documento cartográfico | `map` | 7.17 | Parcial | Inclui data e escala. O prefixo `Escala` e a descrição física dependem do campo usado. |
| Documento tridimensional | sem tipo próprio | 7.19 | Ausente | Sem tipo nem ramo; se cadastrado como `graphic`, perde a data. |
| Software | `software` | 7.20 | Parcial | `Versão` correta. Sem editora separada, gera `: [s.n.]` espúrio, enquanto o modelo traz só `[Cupertino], c2017`. |
| Base de dados | `dataset` | 7.20 | Ausente | Sem ramo; vai ao genérico. |
| Página web, post, blog, rede social | `webpage`, `post`, `post-weblog` | 7.20 | Parcial | O título da página sai sem negrito, mas o modelo o destaca (`**Repositório digital da UFRGS...**`). Não renderiza o local (`Maceió, 19 ago. 2011`) nem o bloco de rede social `Twitter: @perfil` (8.7.3). |
| Carta e e-mail | `personal_communication` | 7.5 e 7.6 | Conforme | `Remetente. [**Correspondência**]. Destinatário: Nome. Local, data. suporte`. |
| Manuscrito | `manuscript` | 7.x | Parcial | Estrutura mínima; arquivo e data presentes. |
| Apresentação | `speech` | sem modelo direto | Ausente | Sem ramo; vai ao genérico. |
| Relatório | `report` | 7.1 e correlatos | Parcial | Tratado como monografia. |
| Verbete de dicionário e enciclopédia | `entry-dictionary`, `entry-encyclopedia` | 7.x | Parcial | Tratado como parte de monografia. |

## 5 Citação no texto (interface com a NBR 10520)

A Seção 9 da NBR 6023 remete a ordenação e a citação à ABNT NBR 10520. A `citation` do estilo gera `(Autor-curto, Ano, localizador)`, e a macro `author-short` imprime o sobrenome sem caixa alta. A prática consolidada em chamada entre parênteses é o sobrenome em maiúsculas, por exemplo `(SILVA, 2020)`, reservando a inicial maiúscula para a citação no corpo do texto. Como o objetivo declarado inclui citações, convém alinhar a citação parentética a essa convenção.

## 6 Questão pervasiva: caixa alta nas entradas por título

A norma é precisa em 6.7, 8.1.4 e 8.2.1: na obra sem autoria, com entrada pelo título, o destaque tipográfico não se aplica, e a caixa alta recai apenas sobre a primeira palavra, incluindo artigo e palavra monossilábica iniciais. Todos os exemplos seguem isso: `OS GRANDES clássicos...`, `PEQUENA biblioteca do vinho`, `OS PERIGOS do uso de tóxicos`, `BLADE Runner`, `THE NINE symphonies`.

O estilo, em todos os pontos em que o título substitui o autor (macros `author`, `director`, `composer`, `producer`, `guest` e os ramos de `motion_picture` e `song`), aplica `text-case="uppercase"` ao título inteiro. O resultado é `OS GRANDES CLÁSSICOS...`, em desacordo com a norma. O acerto de não aplicar negrito a essas entradas está correto; o erro está em maiúscular o título todo em vez de só a palavra inicial. Como o CSL não distingue a primeira palavra, esta é uma limitação que atinge livros sem autor, autoria desconhecida, filmes e fonogramas de uma só vez.

## 7 Itens críticos para o objetivo (documento jurídico)

Os tradutores do DOU e do Planalto produzem itens `statute` com `nameOfAct` (epígrafe), `abstractNote` (ementa), `publicLawNumber`, `dateEnacted` e, no campo Extra, `publisher`, `publisher-place` e `original-date`. Para render a referência da Seção 7.11.1, três condições precisam ser atendidas e hoje não estão:

1. **O item precisa acionar um ramo de legislação.** O ramo atual responde a `bill`; é preciso confirmar que `statute` chega como `legislation` e, em caso afirmativo, esse tipo precisaria ser reconhecido para que a ementa e o periódico oficial apareçam.
2. **A pontuação e a ordem do periódico oficial precisam seguir o modelo** `**Diário Oficial da União**: seção 1, Brasília, DF, ano 139, n. 8, p. 1-74, 11 jan. 2002`, com dois pontos antes de `seção`, a seção antes do local e `seção` em minúscula.
3. **A epígrafe deve permanecer sem negrito e a ementa em texto corrido**, o que o ramo `bill` já faz, mas o genérico não, pois lá o título sai em negrito e a ementa não é impressa.

Enquanto isso, uma lei capturada pelos tradutores tende a sair como monografia genérica, com título em negrito e sem ementa, longe do modelo 7.11.1. Jurisprudência (7.11.3) e atos administrativos normativos (7.11.5) seguem a mesma sorte por não terem ramo dedicado.

## 8 Lista priorizada de não conformidades

Prioridade P0 (impede conformidade no foco do trabalho):

1. Legislação `statute` não aciona o ramo `bill`, caindo no genérico sem ementa nem periódico oficial.
2. Jurisprudência (`legal_case`) sem ramo dedicado.
3. Atos administrativos normativos sem caminho de cadastro e render definido.

Prioridade P1 (desvios visíveis em tipos comuns):

4. Subtítulo herda o negrito do título (8.2).
5. Caixa alta no título inteiro em entradas por título, atingindo livros sem autor, autoria desconhecida, filmes e fonogramas (6.7, 8.1.4, 8.2.1).
6. Sobrenome sem caixa alta na citação entre parênteses (NBR 10520).
7. Pontuação, ordem e caixa de `seção` no periódico oficial do ramo `bill` (7.11.1).
8. Documento iconográfico sem data (7.15).
9. Patente com `Depositante:` ligado a `authority` e sem `Titular` nem `Procurador` (7.9).

Prioridade P2 (refinamentos):

10. Rótulo de organizador no plural quando a norma pede singular (8.1.1.4).
11. `[S. l.]` e `[s. n.]` sem espaço interno e sem colchete único `[S. l.: s. n.]` (8.4, 8.5).
12. Edição e mês de documento estrangeiro no idioma do estilo, não no idioma original (8.3, 8.6.2).
13. Página web sem local, sem bloco de rede social e com título sem negrito (7.20, 8.7.3).
14. Software com `: [s.n.]` espúrio (7.20).
15. Evento sem número de ocorrência e sem local de realização (7.8.4).
16. Ausência do copirraite `c` e das formas estimadas de data (8.6.1).
17. Caderno de jornal antecedido de `Seção` onde a norma traz só o nome do caderno (7.7.7).
18. Tipos sem ramo: evento no todo, partitura, tridimensional, base de dados, apresentação.

## 9 Pontos a verificar empiricamente no Zotero

1. Para qual tipo CSL o Zotero exporta `statute`, `bill`, `case`, `podcast`, `dataset` e `presentation`.
2. Se os termos `available at` e `accessed` resolvem para `Disponível em` e `Acesso em` no locale ativo, dado que o estilo não os define.
3. Como o Zotero mapeia, na patente, os campos de depositante, titular e procurador para as variáveis CSL.
4. Se o filme ou o fonograma sem diretor ou compositor duplica o título por efeito da substituição por título nessas macros.
5. Se o locale `pt` em uso traz as abreviaturas de mês do Anexo A.

## 10 Conformidades a preservar

Mantêm-se corretos e devem ser preservados em qualquer ajuste futuro: sobrenome em caixa alta com separador `; ` e listagem integral de autores; *In*: em itálico; tese com `f.`, `genre` e vinculação; `Local: Editora, ano`; bloco de acesso `Disponível em: ... Acesso em: ...`; abreviação de meses em português pelo locale; periódico e jornal com o título em negrito e o artigo sem negrito; correspondência com `Destinatário:`.
