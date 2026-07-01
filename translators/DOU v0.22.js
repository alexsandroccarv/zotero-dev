{
	"translatorID": "f8e9c32a-5b41-4c17-9d32-8a1b2c3d4e5f",
	"label": "Diário Oficial da União, Brasil v0.22",
	"creator": "Alexsandro Cardoso Carvalho",
	"target": "^https?://(?:www\\.)?in\\.gov\\.br/(?:[a-z]{2}(?:-[a-z]{2})?/)?web/dou/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-06-14 18:00:00"
}

// TODO: [x] extração de metadados  [x] snapshot  [x] tipo de item  [-] salvar pdf certificado
var MESES = {
	"janeiro": "01", "fevereiro": "02", "marco": "03", "abril": "04",
	"maio": "05", "junho": "06", "julho": "07", "agosto": "08",
	"setembro": "09", "outubro": "10", "novembro": "11", "dezembro": "12"
};

function normalizarCaixa(texto) {
	var t = texto.replace(/\s+/g, " ").trim();

	// Conectivos e abreviações para minúscula. As siglas e nomes próprios
	// permanecem intactos porque só estas palavras isoladas são tocadas.
	t = t.replace(/\bDE\b/g, "de")
		.replace(/\bDO\b/g, "do")
		.replace(/\bDA\b/g, "da")
		.replace(/\bDOS\b/g, "dos")
		.replace(/\bDAS\b/g, "das")
		.replace(/\bNº\b/g, "nº")
		.replace(/\bN\.\b/g, "n.");

	// Meses para minúscula
	var meses = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
		"JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
	for (var i = 0; i < meses.length; i++) {
		if (t.indexOf(meses[i]) !== -1) {
			t = t.split(meses[i]).join(meses[i].toLowerCase());
		}
	}

	// Tipo de norma no início para caixa de título
	var tipos = ["PORTARIA", "LEI", "DECRETO", "RESOLUÇÃO", "INSTRUÇÃO",
		"MEDIDA PROVISÓRIA", "EMENDA CONSTITUCIONAL", "DECRETO-LEI"];
	for (var j = 0; j < tipos.length; j++) {
		if (t.indexOf(tipos[j]) === 0) {
			t = tipos[j].charAt(0) + tipos[j].slice(1).toLowerCase() + t.slice(tipos[j].length);
			break;
		}
	}
	return t;
}

function dataExtensoParaISO(texto) {
	var m = texto.match(/(\d{1,2})\s+de\s+(\S+)\s+de\s+(\d{4})/i);
	if (!m) return "";
	var nome = m[2].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
	var mes = MESES[nome];
	if (!mes) return "";
	var dia = ("0" + m[1]).slice(-2);
	return m[3] + "-" + mes + "-" + dia;
}

function detectWeb(doc, url) {
	if (/in\.gov\.br\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?web\/dou\//i.test(url)
		|| doc.querySelector(".identifica")
		|| doc.querySelector(".texto-dou")) {
		return "statute";
	}
	return false;
}

function doWeb(doc, url) {
	var item = new Zotero.Item("statute");
	item.url = url;
	item.language = "pt-BR";

	var dataPromulgacaoISO = "";

	// 1. Título e normalização de caixa
	var tituloEl = doc.querySelector(".identifica");
	if (tituloEl) {
		var titulo = normalizarCaixa(tituloEl.textContent);
		item.nameOfAct = titulo;

		var mNumero = titulo.match(/(?:n[º°]|n\.)\s*([\d.]+)/i);
		if (mNumero) item.publicLawNumber = mNumero[1];

		var mData = titulo.match(/de\s+(\d{1,2}\s+de\s+\S+\s+de\s+\d{4})/i);
		if (mData) dataPromulgacaoISO = dataExtensoParaISO(mData[1]);

		var mAno = titulo.match(/\b(\d{4})\b/);
		var tituloCurto = titulo.split(",")[0].trim();
		if (mAno && tituloCurto.indexOf(mAno[1]) === -1) {
			tituloCurto += "/" + mAno[1];
		}
		item.shortTitle = tituloCurto;
	}

	// 2. Ementa
	var ementaEl = doc.querySelector(".ementa");
	if (ementaEl) item.abstractNote = ementaEl.textContent.replace(/\s+/g, " ").trim();

	// 3. Autor institucional (órgão emissor)
	var orgaoEl = doc.querySelector(".orgao-dou-data");
	if (orgaoEl) {
		var orgaoTexto = orgaoEl.textContent.split(":");
		var nomeOrgao = (orgaoTexto.length > 1 ? orgaoTexto[1] : orgaoTexto[0]).trim();
		item.creators.push({
			lastName: "Brasil. " + nomeOrgao.split("/").join(". "),
			creatorType: "author",
			fieldMode: 1
		});
	}

	// 4. Metadados de publicação. A linha do DOU traz rótulos
	// ("Publicado em | Edição | Seção | Página | Órgão"; na interface /en/ podem
	// vir em inglês). Em vez de confiar na classe de cada elemento (que no DOM
	// atual vem deslocada, fazendo a seção receber o valor da página), montamos
	// uma fonte única com a janela de metadados do corpo somada ao texto dos
	// elementos, e extraímos cada campo EXIGINDO o seu rótulo. Assim a seção só
	// lê o que vem após "Seção".
	var dataPublicacaoISO = "";
	var numeroEdicao = "";
	var secao = "";
	var pagina = "";

	var corpo = doc.body.textContent.replace(/\s+/g, " ");
	var janela = corpo.match(/(?:Publicad[oa] em|Published on)[\s\S]*?(?:[ÓO]rg[ãa]o|Agency|$)/i);

	var elementos = [".publicado-dou-data", ".edicao-dou-data", ".secao-dou-data", ".pagina-dou-data"]
		.map(function (s) {
			var el = doc.querySelector(s);
			return el ? el.textContent : "";
		}).join(" | ");

	var fonte = ((janela ? janela[0] : "") + " | " + elementos).replace(/\s+/g, " ").trim();
	if (fonte.length < 5) fonte = corpo;

	function capturar(re) {
		var m = fonte.match(re);
		return m ? m[1] : "";
	}

	var mPub = fonte.match(/(\d{2})\/(\d{2})\/(\d{4})/);
	if (mPub) dataPublicacaoISO = mPub[3] + "-" + mPub[2] + "-" + mPub[1];

	numeroEdicao = capturar(/(?:Edi[çc][ãa]o|Edition)\s*:?\s*([\wªº.-]+)/i);
	secao = capturar(/(?:Se[çc][ãa]o|Section)\s*:?\s*(\d[\wªº-]*)/i);
	pagina = capturar(/(?:P[áa]gina|Page)s?\s*:?\s*(\d+(?:\s*(?:a|à|to|-)\s*\d+)?)/i)
		.replace(/\s*(?:a|à|to|-)\s*/i, "-");

	// 5. Data principal (CSL issued) no campo nativo dateEnacted, em ISO.
	// Em ABNT, a data impressa na referência de legislação é a de publicação no DOU.
	// Se quiser que o estilo imprima a data de assinatura, troque a ordem abaixo.
	item.dateEnacted = dataPublicacaoISO || dataPromulgacaoISO;

	if (secao) item.section = secao;
	if (pagina) item.pages = pagina;

	// 6. Licença
	item.rights = "Creative Commons Atribuição-SemDerivações 3.0 Não Adaptada";

	// 7. Campo Extra: apenas variáveis sem campo nativo no tipo statute.
	// "issued" foi removido daqui porque o Zotero o move para dateEnacted.
	var extra = [];
	extra.push("publisher: Diário Oficial da União");
	extra.push("publisher-place: Brasília, DF");
	if (numeroEdicao) extra.push("edition: " + numeroEdicao);
	// Data de assinatura/promulgação, distinta da publicação, legível pelo citeproc:
	if (dataPromulgacaoISO && dataPromulgacaoISO !== dataPublicacaoISO) {
		extra.push("original-date: " + dataPromulgacaoISO);
	}
	item.extra = extra.join("\n");

	// 8. Anexos e finalização
	// 8.1 Versão certificada (PDF) do DOU. O servlet INPDFViewer entrega UMA
	// página do jornal por requisição. Como a matéria expõe só a página inicial
	// e a norma pode ocupar várias páginas, perguntamos ao usuário quantas
	// páginas anexar e baixamos as consecutivas a partir da inicial. O Zotero
	// não mescla PDFs, então é um anexo por página.
	var urlCert = "";
	var aCert = doc.querySelector('a[href*="pesquisa.in.gov.br/imprensa"]')
		|| doc.querySelector('a[href*="visualiza/index.jsp"]')
		|| doc.querySelector('a[href*="INPDFViewer"]');
	if (aCert && aCert.href) {
		urlCert = aCert.href;
	} else {
		var ancoras = doc.querySelectorAll("a");
		for (var k = 0; k < ancoras.length; k++) {
			if ((ancoras[k].textContent || "").toLowerCase().indexOf("certificada") !== -1 && ancoras[k].href) {
				urlCert = ancoras[k].href;
				break;
			}
		}
	}

	function paramDe(u, nome) {
		var m = u.match(new RegExp("[?&]" + nome + "=([^&]+)", "i"));
		return m ? decodeURIComponent(m[1]) : "";
	}

	var jornalCert = urlCert ? paramDe(urlCert, "jornal") : "";
	var dataCert = urlCert ? paramDe(urlCert, "data") : "";
	var paginaInicial = urlCert ? (parseInt(paramDe(urlCert, "pagina"), 10) || 0) : 0;
	var temCertificada = !!(jornalCert && dataCert && paginaInicial);

	function urlPaginaCertificada(pag) {
		return "https://pesquisa.in.gov.br/imprensa/servlet/INPDFViewer?jornal="
			+ jornalCert + "&pagina=" + pag + "&data=" + dataCert + "&captchafield=firstAccess";
	}

	function finalizar(qtdPaginas) {
		if (temCertificada) {
			var qtd = qtdPaginas > 0 ? qtdPaginas : 1;
			for (var p = 0; p < qtd; p++) {
				var pag = paginaInicial + p;
				item.attachments.push({
					title: "Versão certificada (DOU) - p. " + pag,
					mimeType: "application/pdf",
					url: urlPaginaCertificada(pag)
				});
			}
		}
		// 8.2 Snapshot da página
		item.attachments.push({ title: "Snapshot do Diário Oficial", document: doc });
		item.complete();
	}

	if (temCertificada) {
		// Diálogo: quantas páginas a norma ocupa (a partir da inicial).
		var opcoes = {};
		for (var n = 1; n <= 12; n++) {
			opcoes[String(n)] = (n === 1) ? "1 página (somente a inicial)" : (n + " páginas");
		}
		Zotero.selectItems(opcoes, function (selecao) {
			var qtd = 1;
			if (selecao) {
				for (var chave in selecao) {
					var v = parseInt(chave, 10);
					if (v > qtd) qtd = v;
				}
			}
			finalizar(qtd);
		});
	} else {
		finalizar(0);
	}
}
