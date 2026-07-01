{
	"translatorID": "e9871542-a3c4-4b9f-8123-d67b2e4f0123",
	"label": "Tribunal de Contas da Uniao (TCU) - Acórdãos  v1.0",
	"creator": "Alexsandro Cardoso Carvalho alexsandro.carvalho@unifesp.br",
	"target": "^https?://pesquisa\\.apps\\.tcu\\.gov\\.br",
	"minVersion": "5.0.97",
	"maxVersion": "",
	"priority": 5,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-06-16 12:30:00"
}

// ---------------------------------------------------------------------------
// Captura de acórdãos do TCU para o tipo "case" (legal_case no CSL).
//
// Método principal: a rota da página tem a forma
//   /documento/acordao-completo/{termo}/{filtro}/{ordenacao}/{índice}
// que mapeia direto para a API pública de documentos. O tradutor replica essa
// consulta e pega o documento no índice exibido, lendo a KEY interna e os
// demais campos do JSON. Isso funciona qualquer que tenha sido a navegação
// (por número, por termo, por filtro), sem depender de número e ano na URL.
//
//   GET /rest/publico/base/acordao-completo/documento?termo=&filtro=&ordenacao=&quantidade=1&inicio=
//   PDF: /rest/publico/base/acordao/documento/download?key=<KEY>&extensao=pdf
//
// Reservas: consulta por NUMACORDAO/ANOACORDAO e, por fim, raspagem do DOM.
//
// Modelagem alinhada ao ramo legal_case do estilo UNIFESP:
//   authority (court)     -> BRASIL. TRIBUNAL DE CONTAS DA UNIÃO (caixa alta no estilo)
//   title (caseName)      -> Acórdão 258/2026
//   contributor           -> relator, renderizado como "Relator: ..."
//   issued (dateDecided)  -> data da sessão
//   access                -> URL e data de acesso
// Colegiado e processo entram no Extra como metadados.
// ---------------------------------------------------------------------------

function detectWeb(doc, url) {
	if (/\/(documento|processo)\//i.test(url) || /acordao/i.test(url)) {
		return "case";
	}
	return false;
}

// Decodifica segmentos com codificação dupla (ex.: %2520 -> %20 -> espaço).
function decodeDuplo(s) {
	try { return decodeURIComponent(decodeURIComponent(s)); }
	catch (e) { try { return decodeURIComponent(s); } catch (e2) { return s; } }
}

// Lê a consulta codificada na rota do documento.
function lerConsultaDaURL(url) {
	var m = url.match(/\/documento\/acordao-completo\/([^?#]+)/i);
	if (!m) return null;
	var partes = m[1].split('/');
	if (partes.length < 2) return null;
	var ultimo = partes[partes.length - 1];
	var inicio = /^\d+$/.test(ultimo) ? ultimo : "0";
	var termo = decodeDuplo(partes[0] || "*") || "*";
	var filtro = partes.length > 1 ? decodeDuplo(partes[1]).trim() : "";
	var ordenacao = partes.length > 3 ? decodeDuplo(partes.slice(2, partes.length - 1).join('/')) : "";
	return { termo: termo, filtro: filtro, ordenacao: ordenacao, inicio: inicio };
}

// Monta a chamada à API de documento do TCU.
function montaApiDocumento(termo, filtro, ordenacao, inicio, quantidade) {
	return "https://pesquisa.apps.tcu.gov.br/rest/publico/base/acordao-completo/documento"
		+ "?termo=" + encodeURIComponent(termo || "*")
		+ "&filtro=" + encodeURIComponent(filtro || "")
		+ "&ordenacao=" + encodeURIComponent(ordenacao || "NUMACORDAOINT asc,KEY asc")
		+ "&quantidade=" + (quantidade || 1)
		+ "&inicio=" + (inicio || "0");
}

// Número e ano do acórdão a partir de um filtro NUMACORDAO/ANOACORDAO na URL.
function lerAcordaoDaURL(url) {
	var numero = "", ano = "";
	var mNum = url.match(/NUMACORDAO(?:%253A|%3A|:)\s*(\d{1,6})/i);
	var mAno = url.match(/ANOACORDAO(?:%253A|%3A|:)\s*(\d{4})/i);
	if (mNum) numero = mNum[1];
	if (mAno) ano = mAno[1];
	return { numero: numero, ano: ano };
}

// Recorta o corpo a partir da segunda ocorrência de "Número do Acórdão",
// descartando o índice de navegação que repete os rótulos no topo.
function recortarCorpo(texto) {
	var re = /N[úu]mero do Ac[óo]rd[ãa]o/gi;
	var m1 = re.exec(texto);
	if (!m1) return texto;
	var m2 = re.exec(texto);
	return m2 ? texto.slice(m2.index) : texto.slice(m1.index);
}

// Valor de uma seção: texto entre o rótulo e o próximo rótulo conhecido.
function secao(corpo, labelRe, fimRe) {
	var re = new RegExp(labelRe + "\\s*:?\\s*(.+?)\\s*(?:" + fimRe + ")", "i");
	var m = corpo.match(re);
	return m && m[1] ? m[1].replace(/\s+/g, ' ').trim() : "";
}

// Limpa as pontas do nome do relator, preservando o pronome de tratamento.
function limparRelator(bruto) {
	return (bruto || "").replace(/\s{2,}/g, ' ').replace(/^[\s.,;:-]+/, '').replace(/[\s.,;:-]+$/, '').trim();
}

// Normaliza a caixa de um nome próprio: "AUGUSTO NARDES" -> "Augusto Nardes",
// mantendo as partículas (de, da, do, e, ...) em minúsculas quando não iniciais.
function nomeProprio(txt) {
	var particulas = { de: 1, da: 1, do: 1, das: 1, dos: 1, e: 1, di: 1, du: 1, del: 1, della: 1, van: 1, von: 1 };
	return (txt || "").toLowerCase().split(/\s+/).map(function (p, i) {
		if (!p) return p;
		if (i > 0 && particulas[p]) return p;
		return p.charAt(0).toUpperCase() + p.slice(1);
	}).join(' ').trim();
}

// Extrai o número do processo (NNN.NNN/AAAA-D), ignorando HTML.
function lerProcesso(txt) {
	var m = (txt || "").match(/\d{3}\.\d{3}\/\d{4}-[\dxX]/);
	return m ? m[0] : "";
}

// Converte DD/MM/AAAA em AAAA-MM-DD.
function dataISO(txt) {
	var m = (txt || "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
	return m ? (m[3] + "-" + m[2] + "-" + m[1]) : "";
}

async function doWeb(doc, url) {
	var item = new Zotero.Item("case");
	item.court = "Brasil. Tribunal de Contas da União";
	item.creators.push({ lastName: "Brasil. Tribunal de Contas da União", creatorType: "author", fieldMode: 1 });
	item.language = "pt-BR";
	item.url = url;

	var d = null;

	// (1) Principal: replicar a consulta da URL e pegar o documento no índice exibido.
	var q = lerConsultaDaURL(url);
	if (q) {
		try {
			var resp = await requestJSON(montaApiDocumento(q.termo, q.filtro, q.ordenacao, q.inicio, 1));
			var docs = (resp && resp.documentos) || [];
			if (docs.length) d = docs[0];
		} catch (e) {
			Zotero.debug("TCU: replicação da consulta da URL falhou. " + e);
		}
	}

	// Texto do DOM (sem índice), para reforço de número/ano e reserva final.
	var texto = "";
	try {
		texto = (doc.body ? doc.body.textContent : "").replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
	} catch (e) {
		Zotero.debug("TCU: falha ao ler o DOM. " + e);
	}
	var corpo = recortarCorpo(texto);
	var secNumero = secao(corpo, "N[úu]mero do Ac[óo]rd[ãa]o", "Relator");
	var colegiadoDOM = "";
	var mcoleg = (secNumero + " " + corpo).match(/\b(Plenário|Primeira Câmara|Segunda Câmara)\b/i);
	if (mcoleg) colegiadoDOM = mcoleg[1];

	// (2) Reserva: número e ano (do filtro da URL ou do DOM) por NUMACORDAO/ANOACORDAO.
	if (!d) {
		var daURL = lerAcordaoDaURL(url);
		var numero = daURL.numero, ano = daURL.ano;
		if (!numero || !ano) {
			var mn = secNumero.match(/(\d{1,6})\s*\/\s*(\d{4})/);
			if (mn) { numero = numero || mn[1]; ano = ano || mn[2]; }
		}
		if (numero && ano) {
			try {
				var resp2 = await requestJSON(montaApiDocumento("*", "NUMACORDAO:" + numero + " ANOACORDAO:" + ano, "NUMACORDAOINT asc,KEY asc", "0", 30));
				var docs2 = (resp2 && resp2.documentos) || [];
				if (docs2.length === 1) {
					d = docs2[0];
				} else if (docs2.length > 1) {
					for (var i = 0; i < docs2.length; i++) {
						if (colegiadoDOM && docs2[i].COLEGIADO
							&& docs2[i].COLEGIADO.toLowerCase() === colegiadoDOM.toLowerCase()) {
							d = docs2[i];
							break;
						}
					}
					if (!d) d = docs2[0];
				}
			} catch (e) {
				Zotero.debug("TCU: consulta por número e ano falhou. " + e);
			}
		}
	}

	// (3) Campos: do JSON quando houver; senão, do DOM.
	var relator = "", colegiado = "", processo = "", assunto = "", data = "", numFinal = "", anoFinal = "", key = "";
	if (d) {
		numFinal = d.NUMACORDAO || "";
		anoFinal = d.ANOACORDAO || "";
		key = d.KEY || "";
		relator = limparRelator(d.RELATOR || "");
		colegiado = d.COLEGIADO || colegiadoDOM;
		assunto = (d.ASSUNTO || "").replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
		processo = lerProcesso(d.PROC);
		data = dataISO(d.DATASESSAO);
	} else {
		var mn3 = secNumero.match(/(\d{1,6})\s*\/\s*(\d{4})/);
		if (mn3) { numFinal = mn3[1]; anoFinal = mn3[2]; }
		relator = limparRelator(secao(corpo, "Relator", "Processo"));
		colegiado = colegiadoDOM;
		processo = lerProcesso(secao(corpo, "Processo", "Tipo de processo"));
		data = dataISO(secao(corpo, "Data da sess[ãa]o", "N[úu]mero da ata"));
		assunto = secao(corpo, "Assunto", "Sum[áa]rio") || secao(corpo, "Sum[áa]rio", "Ac[óo]rd[ãa]o");
	}

	// (4) Monta o item.
	if (numFinal && anoFinal) {
		item.caseName = "Acórdão " + numFinal + "/" + anoFinal;
	} else {
		item.caseName = processo ? ("Processo TCU " + processo) : "Acórdão do TCU";
	}
	if (relator) {
		item.creators.push({ lastName: nomeProprio(relator), creatorType: "contributor", fieldMode: 1 });
	}
	if (data) item.dateDecided = data;
	if (assunto) item.abstractNote = assunto.slice(0, 1500);

	// (5) Anexo do PDF oficial a partir da KEY; reservas: link do texto integral, instantâneo.
	var anexou = false;
	if (key) {
		item.attachments.push({
			url: "https://pesquisa.apps.tcu.gov.br/rest/publico/base/acordao/documento/download?key="
				+ key + "&extensao=pdf",
			title: "Acórdão (PDF)", mimeType: "application/pdf"
		});
		anexou = true;
	}
	if (!anexou && numFinal && anoFinal) {
		item.attachments.push({
			url: "https://pesquisa.apps.tcu.gov.br/rest/publico/base/acordao-completo/" + numFinal + anoFinal,
			title: "Acórdão (texto integral, TCU)", snapshot: false
		});
		anexou = true;
	}
	if (!anexou) {
		item.attachments.push({ title: "Instantâneo (TCU)", document: doc });
	}

	// (6) Extra: variáveis CSL lidas pelo citeproc e metadados legíveis.
	var extra = ["publisher-place: Brasília, DF", "jurisdiction: Brasil"];
	if (colegiado) extra.push("Colegiado: " + colegiado);
	if (processo) extra.push("Processo: " + processo);
	item.extra = extra.join("\n");

	item.complete();
}
