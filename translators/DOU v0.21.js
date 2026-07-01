{
	"translatorID": "b7e4d9c1-3a2f-4e6b-8c5d-9f1a2b3c4d5e",
	"label": "Planalto - Legislação, Brasil v0.4",
	"creator": "Alexsandro Cardoso Carvalho <alexsandro.carvalho@unifesp.br>",
	"target": "^https?://(?:www\\.)?planalto\\.gov\\.br/ccivil_03/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-06-15 22:00:00"
}

var MESES = {
	"janeiro": "01", "fevereiro": "02", "marco": "03", "abril": "04",
	"maio": "05", "junho": "06", "julho": "07", "agosto": "08",
	"setembro": "09", "outubro": "10", "novembro": "11", "dezembro": "12"
};

// Tipos de norma reconhecidos no cabeçalho (chave sem acento, em caixa alta)
var TIPOS = {
	"LEI COMPLEMENTAR": "Lei Complementar",
	"LEI DELEGADA": "Lei Delegada",
	"DECRETO-LEI": "Decreto-Lei",
	"DECRETO LEGISLATIVO": "Decreto Legislativo",
	"MEDIDA PROVISORIA": "Medida Provisória",
	"EMENDA CONSTITUCIONAL": "Emenda Constitucional",
	"PORTARIA": "Portaria",
	"DECRETO": "Decreto",
	"LEI": "Lei"
};

// Códigos usados no link Viw_Identificacao (reserva)
var CODIGOS = {
	"lei": "Lei", "lcp": "Lei Complementar", "del": "Decreto-Lei",
	"dec": "Decreto", "mpv": "Medida Provisória", "emc": "Emenda Constitucional",
	"dlg": "Decreto Legislativo", "ldl": "Lei Delegada", "prt": "Portaria"
};

// Cabeçalho da norma: tipo + número + ", DE <data por extenso>"
var RE_CABECALHO = /(LEI COMPLEMENTAR|LEI DELEGADA|DECRETO-LEI|DECRETO LEGISLATIVO|MEDIDA PROVIS[ÓO]RIA|EMENDA CONSTITUCIONAL|PORTARIA|DECRETO|LEI)\s*N[º°o.\s]*([\d][\d.]*)\s*,?\s*DE\s+(\d{1,2}[º°o.]?\s+DE\s+\S+\s+DE\s+\d{4})/i;

function semAcento(s) {
	return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function dataExtensoParaISO(texto) {
	var m = texto.match(/(\d{1,2})[º°o.]?\s+de\s+(\S+)\s+de\s+(\d{4})/i);
	if (!m) return "";
	var mes = MESES[semAcento(m[2].toLowerCase())];
	if (!mes) return "";
	return m[3] + "-" + mes + "-" + ("0" + m[1]).slice(-2);
}

// Data de publicação do rodapé: "Este texto não substitui o publicado no
// DOU (ou D.O.U.) de DD.MM.AAAA". Aceita mês/dia de um ou dois dígitos.
function extrairDataPublicacao(corpo) {
	var m = corpo.match(/substitui o publicado[\s\S]{0,60}?\b(?:de|em)\s+(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/i);
	if (!m) return "";
	return m[3] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2);
}

// Localiza o nó de texto da cláusula de promulgação, fronteira entre o
// cabeçalho (onde ficam os links de veto, vigência, etc.) e o corpo da norma.
function acharNoClausula(doc) {
	try {
		var re = /(O PRESIDENTE DA REP|A PRESIDENTA DA REP|O VICE-PRESIDENTE DA REP|O CONGRESSO NACIONAL|AS MESAS|Fa[çc]o saber|O MINISTRO|A MINISTRA|O SECRET[ÁA]RIO|A SECRET[ÁA]RIA|\bresolve\s*:)/i;
		var w = doc.createTreeWalker(doc.body, 4, null);
		var n;
		while ((n = w.nextNode())) {
			if (re.test(n.nodeValue)) return n;
		}
	} catch (e) {}
	return null;
}

function detectWeb(doc, url) {
	if (!/planalto\.gov\.br\/ccivil_03\//i.test(url)) return false;
	if (doc.querySelector('a[href*="Viw_Identificacao"]')) return "statute";
	if (RE_CABECALHO.test(doc.body.textContent.replace(/\s+/g, " "))) return "statute";
	return false;
}

function doWeb(doc, url) {
	var item = new Zotero.Item("statute");
	item.url = url;
	item.language = "pt-BR";
	item.creators.push({ lastName: "Brasil", creatorType: "author", fieldMode: 1 });

	var corpo = doc.body.textContent.replace(/\s+/g, " ");

	var tipoProper = "";
	var numero = "";
	var dataExtenso = "";
	var ano = "";

	var mCab = corpo.match(RE_CABECALHO);
	if (mCab) {
		tipoProper = TIPOS[semAcento(mCab[1].toUpperCase())] || mCab[1];
		numero = mCab[2];
		dataExtenso = mCab[3];
		var mAno = dataExtenso.match(/(\d{4})/);
		ano = mAno ? mAno[1] : "";
	} else {
		// Reserva: identifica pelo link Viw_Identificacao (tipo número-ano)
		var aId = doc.querySelector('a[href*="Viw_Identificacao"]');
		if (aId) {
			var mId = aId.href.match(/Viw_Identificacao\/([^?]+)/i);
			if (mId) {
				var id = decodeURIComponent(mId[1]).replace(/\+/g, " ");
				var mm = id.match(/^(.+?)\s+([\d.]+)-(\d{4})$/);
				if (mm) {
					tipoProper = CODIGOS[mm[1].toLowerCase()] || mm[1];
					numero = mm[2];
					ano = mm[3];
				}
			}
		}
	}

	// Data de assinatura/promulgação (do cabeçalho) e data de publicação (rodapé)
	var dataAssinaturaISO = dataExtenso ? dataExtensoParaISO(dataExtenso) : (ano || "");
	var dataPublicacaoISO = extrairDataPublicacao(corpo);

	if (tipoProper && numero) {
		if (dataExtenso) {
			item.nameOfAct = tipoProper + " nº " + numero + ", de " + dataExtenso.toLowerCase();
		} else {
			item.nameOfAct = tipoProper + " nº " + numero + (ano ? "/" + ano : "");
		}
		item.publicLawNumber = numero;
		item.shortTitle = tipoProper + " nº " + numero + (ano ? "/" + ano : "");
	}

	// dateEnacted recebe a data de PUBLICAÇÃO (a que o estilo ABNT imprime);
	// a data de assinatura já consta do título e vai também para original-date.
	if (dataPublicacaoISO) {
		item.dateEnacted = dataPublicacaoISO;
	} else if (dataAssinaturaISO) {
		item.dateEnacted = dataAssinaturaISO;
	}

	// Histórico: links que ficam à esquerda da ementa (mensagem de veto,
	// vigência, vide, regulamento, texto compilado/impressão, revogação).
	// Restringe pela posição: só links anteriores à cláusula de promulgação,
	// para não capturar os links de alteração espalhados pelos artigos.
	var noProm = acharNoClausula(doc);
	var rotulosCabecalho = [];
	var historico = [];
	try {
		var links = doc.querySelectorAll("a");
		for (var i = 0; i < links.length; i++) {
			var a = links[i];
			if (/Viw_Identificacao/i.test(a.href)) continue; // é o título
			if (noProm && !(noProm.compareDocumentPosition(a) & 2)) continue; // só antes da promulgação
			var rotulo = (a.textContent || "").replace(/\s+/g, " ").trim();
			if (!rotulo) continue;
			rotulosCabecalho.push(rotulo);
			historico.push(rotulo + (a.href ? " (" + a.href + ")" : ""));
		}
	} catch (e) {}
	if (historico.length) item.history = historico.join("; ");

	// Ementa: texto entre o cabeçalho e a cláusula de promulgação, retirando
	// os rótulos dos links já coletados para o Histórico.
	if (mCab) {
		var resto = corpo.slice(mCab.index + mCab[0].length);
		var reProm = /(O PRESIDENTE DA REP[ÚU]BLICA|A PRESIDENTA DA REP[ÚU]BLICA|O VICE-PRESIDENTE DA REP[ÚU]BLICA|O CONGRESSO NACIONAL|AS MESAS|Fa[çc]o saber|O MINISTRO|A MINISTRA|O SECRET[ÁA]RIO|A SECRET[ÁA]RIA|\bresolve\s*:)/i;
		var mProm = resto.match(reProm);
		var ementa = mProm ? resto.slice(0, mProm.index) : resto.slice(0, 600);
		for (var j = 0; j < rotulosCabecalho.length; j++) {
			ementa = ementa.split(rotulosCabecalho[j]).join(" ");
		}
		ementa = ementa
			.replace(/Mensagem de veto/gi, "")
			.replace(/Texto compilado/gi, "")
			.replace(/Texto para impress[ãa]o/gi, "")
			.replace(/\s+/g, " ")
			.replace(/^[\s\-–—:;,.]+/, "")
			.trim();
		if (ementa.length > 8) item.abstractNote = ementa;
	}

	// Campos sem campo nativo no tipo statute, legíveis pelo citeproc (ABNT)
	var extra = "publisher: Presidência da República\npublisher-place: Brasília, DF";
	if (dataPublicacaoISO && dataAssinaturaISO && dataPublicacaoISO !== dataAssinaturaISO) {
		extra += "\noriginal-date: " + dataAssinaturaISO;
	}
	item.extra = extra;

	item.attachments.push({ title: "Snapshot - Planalto", document: doc });

	item.complete();
}
