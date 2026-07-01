{
	"translatorID": "aaa228d0-15b4-4b33-b830-198d8fe4d6d1",
	"label": "UNIFESP CONSU Resoluções",
	"creator": "Alexsandro Cardoso Carvalho alexsandro.carvalho@unifesp.br",
	"target": "^https?://site\\.unifesp\\.br/conselhos",
	"minVersion": "5.0.97",
	"maxVersion": "",
	"priority": 5,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-06-16 13:30:00"
}

// ---------------------------------------------------------------------------
// Captura de resoluções do Conselho Universitário (CONSU) da UNIFESP.
//
// Atua em dois contextos:
//   1. páginas de listagem em site.unifesp.br/conselhos/resolucoes (e variantes),
//      onde cada resolução é um link para o PDF, com a ementa ao lado;
//   2. a própria URL do PDF da resolução.
//
// O número e o ano são extraídos do nome do arquivo e do caminho, por exemplo
//   .../consu/resolucoes/2026/Resolução_279.2026_3382405_pbsd.pdf  -> 279/2026
//   .../consu/resolucoes/2025/resolucao_256.pdf                    -> 256/2025
//   .../consu/resolucoes/resolucao21.pdf                           -> 21
//
// Modelagem como ato normativo (tipo "statute", legislation no CSL), alinhada
// ao ramo bill/legislation do estilo UNIFESP:
//   author      -> Universidade Federal de São Paulo (instituição; sai em caixa alta)
//   nameOfAct   -> Resolução CONSU nº 279/2026 (epígrafe, vira title)
//   abstract    -> ementa
//   dateEnacted -> ano
//   url         -> PDF, anexado como arquivo
// O órgão (CONSU) entra no Extra como metadado.
// ---------------------------------------------------------------------------

function ehPdfResolucao(url) {
	return /\/resolucoes\/[^?#]*\.pdf(\?|$)/i.test(url) || /resolu[çc][ãa]o[^/?#]*\.pdf(\?|$)/i.test(url);
}

function detectWeb(doc, url) {
	if (ehPdfResolucao(url)) {
		return "statute";
	}
	if (/\/conselhos\/resolucoes/i.test(url) || /\/conselhos\//i.test(url)) {
		if (coletarResolucoes(doc) !== null) return "multiple";
	}
	return false;
}

// Extrai número, ano e nome do arquivo a partir da URL do PDF.
function dadosDoArquivo(pdfUrl) {
	var nome = pdfUrl.split('/').pop().split(/[?#]/)[0];
	try { nome = decodeURIComponent(nome); } catch (e) { /* mantém */ }
	var numero = "", ano = "";
	var mNum = nome.match(/resolu[çc][ãa]o[_\s]*0*(\d+)/i);
	if (mNum) numero = mNum[1];
	var mAnoPath = pdfUrl.match(/\/resolucoes\/(20\d{2})\//i);
	if (mAnoPath) ano = mAnoPath[1];
	if (!ano) {
		var mAnoNome = nome.match(/[._](20\d{2})\b/);
		if (mAnoNome) ano = mAnoNome[1];
	}
	return { numero: numero, ano: ano, arquivo: nome };
}

// Varre a página por links de resolução em PDF. Devolve um mapa
// href -> { rotulo, ementa, numero, ano } ou null se não houver nenhum.
function coletarResolucoes(doc) {
	var mapa = {};
	var achou = false;
	var anchors = doc.querySelectorAll('a[href]');
	for (var i = 0; i < anchors.length; i++) {
		var href = anchors[i].href;
		if (!href || !/\/resolucoes\//i.test(href) || !/\.pdf(\?|$)/i.test(href)) continue;
		var d = dadosDoArquivo(href);
		// Texto da linha (ementa): tenta a linha de tabela, depois o elemento-pai.
		var contexto = "";
		var tr = anchors[i].closest ? anchors[i].closest('tr, li, p') : null;
		if (tr) contexto = tr.textContent;
		else if (anchors[i].parentElement) contexto = anchors[i].parentElement.textContent;
		var ementa = contexto.replace(/\s+/g, ' ').trim();
		// remove o número/identificador do começo, deixando só a ementa
		ementa = ementa.replace(/^\s*resolu[çc][ãa]o[^A-Za-zÀ-ÿ]*\d+[^A-Za-zÀ-ÿ]*/i, '').trim();
		var rotulo = "Resolução " + (d.numero || "?") + (d.ano ? ("/" + d.ano) : "");
		if (ementa) rotulo += " — " + ementa.slice(0, 110);
		mapa[href] = { rotulo: rotulo, ementa: ementa, numero: d.numero, ano: d.ano };
		achou = true;
	}
	return achou ? mapa : null;
}

// Monta o item de resolução a partir da URL do PDF e da ementa (se houver).
function montaItem(pdfUrl, ementa) {
	var d = dadosDoArquivo(pdfUrl);
	var item = new Zotero.Item("statute");

	item.creators.push({ lastName: "Universidade Federal de São Paulo", creatorType: "author", fieldMode: 1 });

	var titulo = "Resolução CONSU nº " + (d.numero || "");
	if (d.ano) titulo += "/" + d.ano;
	item.nameOfAct = titulo;
	if (d.numero) item.codeNumber = d.numero;
	if (d.ano) item.dateEnacted = d.ano;
	if (ementa) item.abstractNote = ementa;
	item.language = "pt-BR";
	item.url = pdfUrl;

	item.attachments.push({ url: pdfUrl, title: "Resolução (PDF)", mimeType: "application/pdf" });

	item.extra = "Colegiado: Conselho Universitário (CONSU)";
	item.complete();
}

async function doWeb(doc, url) {
	if (ehPdfResolucao(url)) {
		// URL direta do PDF: monta o item a partir do nome do arquivo.
		montaItem(url, "");
		return;
	}

	// Página de listagem: oferece as resoluções encontradas.
	var mapa = coletarResolucoes(doc);
	if (!mapa) return;

	var rotulos = {};
	for (var href in mapa) rotulos[href] = mapa[href].rotulo;

	var selecionados = await Zotero.selectItems(rotulos);
	if (!selecionados) return;

	for (var h in selecionados) {
		montaItem(h, mapa[h] ? mapa[h].ementa : "");
	}
}
