{
	"translatorID": "e4c2d45d-f9b2-54cc-ae77-38bb7504c328",
	"translatorType": 4,
	"label": "YouTube (Otimizado BR)",
	"creator": "Alexsandro Cardoso Carvalho, Sean Takats, Michael Berkowitz, Matt Burton, Rintze Zelle, and Geoff Banh",
	"target": "^https?://([^/]+\\.)?youtube\\.com/",
	"minVersion": "5.0",
	"maxVersion": null,
	"priority": 90,
	"inRepository": false,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-06-14 20:15:00"
}

/*
	Tradutor customizado focado em extração aprimorada para a ABNT/APA.
	- Adiciona suporte a Lives (Transmissão ao Vivo)
	- Captura idioma e visualizações
	- Mapeia Playlists para o campo "Série"
	- Preenche Licença Padrão vs Creative Commons
*/

function detectWeb(doc, url) {
	if (/\/watch\?(?:.*)\bv=[0-9a-zA-Z_-]+/.test(url)) {
		return "videoRecording";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var links = doc.querySelectorAll('a.ytd-video-renderer, a.ytd-playlist-video-renderer');
	var items = {},
		found = false;
	for (var i = 0, n = links.length; i < n; i++) {
		var title = ZU.trimInternal(links[i].textContent);
		var link = links[i].href;
		if (!title || !link) continue;

		if (checkOnly) return true;

		found = true;
		items[link] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

function getMetaContent(doc, attrName, value) {
	return attr(doc, 'meta[' + attrName + '="' + value + '"]', 'content');
}

function videoIdFromURL(url) {
	var m = url.match(/[?&]v=([0-9a-zA-Z_-]+)/);
	return m ? m[1] : null;
}

function canonicalWatchURL(url) {
	var videoId = videoIdFromURL(url);
	return videoId ? 'https://www.youtube.com/watch?v=' + videoId : url;
}

function walkJson(node, visit) {
	if (!node || typeof node !== 'object') return false;
	if (visit(node)) return true;
	if (Array.isArray(node)) {
		for (var item of node) if (walkJson(item, visit)) return true;
	}
	else {
		for (var key of Object.keys(node)) if (walkJson(node[key], visit)) return true;
	}
	return false;
}

function dataVideoId(data) {
	return (data
		&& data.currentVideoEndpoint
		&& data.currentVideoEndpoint.watchEndpoint
		&& data.currentVideoEndpoint.watchEndpoint.videoId) || null;
}

function channelNamesFromData(data) {
	var vor = null;
	walkJson(data, function (node) {
		if (node.videoSecondaryInfoRenderer) {
			vor = node.videoSecondaryInfoRenderer.owner
				&& node.videoSecondaryInfoRenderer.owner.videoOwnerRenderer;
			return true;
		}
		return false;
	});
	if (!vor) {
		return [];
	}

	var names = [];
	walkJson(vor, function (node) {
		var items = node.dialogViewModel
			&& node.dialogViewModel.customContent
			&& node.dialogViewModel.customContent.listViewModel
			&& node.dialogViewModel.customContent.listViewModel.listItems;
		if (!Array.isArray(items)) return false;
		for (var item of items) {
			var name = item.listItemViewModel
				&& item.listItemViewModel.title
				&& item.listItemViewModel.title.content;
			if (name) names.push(name);
		}
		return true;
	});
	return names;
}

function extractYtInitialData(raw) {
	if (!raw) return null;
	var marker = raw.indexOf('var ytInitialData = {');
	if (marker === -1) return null;
	var start = raw.indexOf('{', marker);

	var depth = 0, end = start, inString = false;
	while (end < raw.length) {
		var ch = raw[end];
		if (inString) {
			if (ch === '\\') end++;
			else if (ch === '"') inString = false;
		}
		else if (ch === '"') inString = true;
		else if (ch === '{') depth++;
		else if (ch === '}') {
			if (--depth === 0) break;
		}
		end++;
	}
	if (depth !== 0) {
		return null;
	}
	try {
		return JSON.parse(raw.substring(start, end + 1));
	}
	catch (e) {
		return null;
	}
}

function namesFromDoc(doc, expectedVideoId) {
	for (var script of doc.querySelectorAll('script:not([src])')) {
		var raw = script.textContent;
		var data = extractYtInitialData(raw);
		if (!data) continue;
		if (dataVideoId(data) !== expectedVideoId) {
			return { stale: true };
		}
		return { names: channelNamesFromData(data) };
	}
	return null;
}

async function extractCreatorNames(doc, url) {
	var videoId = videoIdFromURL(url);
	if (!videoId) return [];

	var result = namesFromDoc(doc, videoId);
	if (!result) return [];
	if (!result.stale) return result.names;

	try {
		var fresh = await requestDocument(canonicalWatchURL(url));
		var refetched = namesFromDoc(fresh, videoId);
		if (refetched && !refetched.stale) return refetched.names;
		return [];
	}
	catch (e) {
		return [];
	}
}

async function scrape(doc, url = doc.location.href) {
	var item = new Zotero.Item("videoRecording");
	
	let jsonLD;
	try {
		jsonLD = JSON.parse(text(doc, 'script[type="application/ld+json"]'));
	}
	catch (e) {
		jsonLD = {};
	}

	item.title = text(doc, '#info-contents h1.title') || text(doc, '#title') || text(doc, '.slim-video-information-title');
	item.url = canonicalWatchURL(url);
	item.runningTime = text(doc, '#movie_player .ytp-time-duration') || text(doc, '.ytm-time-display .time-second'); 
	
	if (!item.runningTime && jsonLD.duration) { 
		let duration = parseInt(jsonLD.duration.substring(2));
		let hours = String(Math.floor(duration / 3600)).padStart(2, '0');
		let minutes = String(Math.floor(duration % 3600 / 60)).padStart(2, '0');
		let seconds = String(duration % 60).padStart(2, '0');
		if (duration >= 3600) {
			item.runningTime = `${hours}:${minutes}:${seconds}`;
		}
		else {
			item.runningTime = `${minutes}:${seconds}`;
		}
	}

	item.date = ZU.strToISO(text(doc, '#info-strings yt-formatted-string') || attr(doc, 'ytm-factoid-renderer:last-child > div', 'aria-label')) || jsonLD.uploadDate;

	var creatorNames = await extractCreatorNames(doc, url);
	if (creatorNames.length) {
		for (var name of creatorNames) {
			item.creators.push({ lastName: name, creatorType: "author", fieldMode: 1 });
		}
	}
	else {
		var author = text(doc, '#meta-contents #text-container .ytd-channel-name') || text(doc, '#upload-info #text-container .ytd-channel-name') || text(doc, '.slim-owner-channel-name');
		if (author) {
			item.creators.push({ lastName: author, creatorType: "author", fieldMode: 1 });
		}
	}

	var description = text(doc, '#description .content') || text(doc, '#description') || text(doc, 'ytm-expandable-video-description-body-renderer .collapsed-string-container') || text(doc, '#snippet span');
	if (description) {
		item.abstractNote = description;
	}

	// 1. Idioma e Formato
	item.language = doc.documentElement.lang || getMetaContent(doc, 'itemprop', 'inLanguage') || "pt-BR";
	item.videoRecordingFormat = "Vídeo Web (MPEG-4)";

	// 2. Licença
	let htmlBody = doc.documentElement.innerHTML;
	if (htmlBody.includes("Creative Commons Attribution") || htmlBody.includes("Creative Commons Atrib")) {
		item.rights = "Licença Creative Commons Atribuição";
	} else {
		item.rights = "Licença Padrão do YouTube";
	}

	// 3. Captura de Playlist como Série
	if (url.includes('list=')) {
		let playlistTitle = text(doc, 'ytd-playlist-panel-renderer .title');
		if (playlistTitle) {
			item.seriesTitle = playlistTitle.trim();
		}
	}

	// 4. Captura de Transmissão ao Vivo (Live) e Visualizações para o Extra
	let extraData = [];
	
	let isLive = getMetaContent(doc, 'itemprop', 'isLiveBroadcast');
	if (isLive === 'True') {
		extraData.push("genre: Transmissão ao Vivo (Live)");
	}

	let views = getMetaContent(doc, 'itemprop', 'interactionCount');
	if (views) {
		extraData.push("views: " + views);
	}
	
	let videoId = videoIdFromURL(url);
	if (videoId) {
		extraData.push("youtube-id: " + videoId);
	}

	if (extraData.length > 0) {
		item.extra = extraData.join("\n");
	}

	item.complete();
}
