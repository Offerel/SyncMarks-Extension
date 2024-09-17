const filename = "bookmarks.json";
const abrowser = typeof browser !== 'undefined';

var dictOldIDsToNewIDs = { "-1": "-1" };
var loglines = '';
var debug = false;
var clientL = [];
var oMarks = [];
var pTabs = [];
var lastseen = null;

init();

chrome.permissions.getAll(function(e) {
	if(e.permissions.includes('bookmarks')) {
		chrome.bookmarks.onCreated.addListener(onCreatedCheck);
		chrome.bookmarks.onMoved.addListener(onMovedCheck);
		chrome.bookmarks.onRemoved.addListener(onRemovedCheck);
		chrome.bookmarks.onChanged.addListener(onChangedCheck);
	} else {
		chrome.storage.local.get(null, function(options) {
			if(options.actions.crsrv === true) {
				chrome.action.onClicked.addListener(bookmarkTab);
			} else {
				chrome.action.onClicked.removeListener(bookmarkTab);
				chrome.action.onClicked.addListener(function() {chrome.runtime.openOptionsPage()});
			}
		});
	}
});

chrome.runtime.onInstalled.addListener(onInstalled);

chrome.notifications.onClicked.addListener(notificationSettings);

chrome.tabs.onActivated.addListener(onTabActivated)

chrome.permissions.getAll(function(e) {
	if(e.permissions.includes('contextMenus')) {
		chrome.contextMenus.onClicked.addListener(function(itemData) {
			if(itemData.menuItemId.includes("page_") || itemData.menuItemId.includes("tab_")) {
				chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
					let tabData = {target:{id:itemData.menuItemId.substring(5),url:tabs[0].url}};
					sendTab(tabData);
				});
			}
			if(itemData.menuItemId.includes("link_")) {
				let tabData = {target:{id:itemData.menuItemId.substring(5),url:itemData.linkUrl}};
				sendTab(tabData);
			}
		});
	}
});

chrome.commands.onCommand.addListener((command) => {
	bookmarkTab();
});

function sendRequest(action, data = null, addendum = null) {
	chrome.storage.local.get(null, function(options) {
		const xhr = new XMLHttpRequest();

		let client = options['s_uuid'];
		let sync = null;

		if(action.name === 'addmark' && options['actions']['crsrv'] === true) {
			client = 'bookmarkTab';
			sync = false;
		}

		const params = {
			action: action.name,
			client: client,
			data: data,
			add: addendum,
			sync: sync
		}

		let url = new URL(options['wdurl']);
		xhr.open("POST", url);
		let tarr = {};
		tarr['client'] = options['s_uuid'];
		tarr['token'] = options['token'];

		let tc = false;

		if(options['token'] != undefined) tc = 'tk';
		if(options['creds'] != undefined) tc = 'cr';
		if(tc == false && data !== 'p') return false;

		if(tc == 'tk') xhr.setRequestHeader('Authorization', 'Bearer ' + btoa(encodeURIComponent(JSON.stringify(tarr))));
		if(tc == 'cr') xhr.setRequestHeader('Authorization', 'Basic ' + options['creds']);

		xhr.withCredentials = true;
		xhr.timeout = 30000;
		xhr.responseType = 'json';

		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					action(xhr.response, addendum);
				} else {
					let message = `Error ${xhr.status}: ${xhr.statusText}`;
					console.error(action.name, message);
					return false;
				}
			}
		}

		xhr.onload = async function () {
			let xtResponse = xhr.getResponseHeader("X-Request-Info");
			if(xtResponse !== null) {
				if(xtResponse !== '0') {
					await chrome.storage.local.set({token: xtResponse});
				} else {
					chrome.storage.local.remove('token');
					let message = chrome.i18n.getMessage("optionsLoginError");
					if(data !== 'p') notify('error', message);
					changeIcon('error');
					if(xhr.response.cInfo) {
						chrome.runtime.sendMessage(xhr.response);
					}
				}
			}
		}

		xhr.onerror = function () {
			let message = "Error: " + xhr.status + ' | ' + xhr.response;
			console.error(action.name, message);
			return false;
		}

		xhr.ontimeout = function() {
			let message = "Error: Timeout of " + parseFloat(xhr.timeout/1000).toFixed(1) + " seconds exceeded";
			notify('error', message);
			loglines = logit(message);
			console.warn(action.name, message);
			return false;
		}

		if (url.searchParams.has('api')) {
			xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
			xhr.send(JSON.stringify(params));
		} else {
			xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
			const qparams = new URLSearchParams(params);
			xhr.send(qparams);
		}
	});
}

function getclients(response, a = '') {
	chrome.storage.local.set({clist:response});
	chrome.permissions.getAll(function(e) {
		if(e.permissions.includes('contextMenus')) {
			if(Array.isArray(response)) {
				response.forEach(function(client){
					var ctitle = client.name ? client.name:client.id;
					chrome.contextMenus.create({
						title: ctitle,
						type: "normal",
						parentId: "ssendpage",
						contexts: ["page"],
						id: 'page_' + client.id
					});
					chrome.contextMenus.create({
						title: ctitle,
						type: "normal",
						parentId: "ssendlink",
						contexts: ["link"],
						id: 'link_' + client.id
					});

					try{
						chrome.contextMenus.create({
							title: ctitle,
							type: "normal",
							parentId: "ssendtab",
							contexts: ["tab"],
							id: 'tab_' + client.id
						});
					} catch {}
				});
				let cnt = response.length - 1;
				loglines = logit("Info: List of " + cnt + " clients received successful.");
			}
		}
	});

	loglines = logit("Info: Get notifications for current client.");
	sendRequest(gurls);
}

function getpurl(response, a = '') {
	//
}

function gurls(response, a = '') {
	if(Array.isArray(response)) {
		try {
			response.forEach(function(notification) {
				loglines = logit('Info: Received tab: <a href="' + notification.url + '">' + notification.url + '</a>');
				openTab(notification.url,notification.nkey,notification.title);
			});
		} catch(error) {
			loglines = logit(error);
		}
		loglines = logit("Info: List of " + response.length + " notifications received successful.");
	}

	chrome.storage.local.get(null, async function(options) {
		let s_startup = options['actions']['startup'] || false;
		if(s_startup === true) {
			loglines = logit("Info: Start Sync");
			sendRequest(cinfo, null, 'sync');
		}
	});
}

function cinfo(response, a = '') {
	if(response !== null) {
		lastseen =  response['lastseen'];
		if(a == 'sync') {
			doFullSync();
		} else {
			chrome.runtime.sendMessage(response);
		}
	}
}

function bexport(response) {
	response = JSON.parse(response);
	if(abrowser == false) response = JSON.parse(c2cm(JSON.stringify(response)));
	count = 0;
	
	loglines = logit('Info: '+ response.length +' Bookmarks received from server');
	chrome.runtime.sendMessage({text:'' + response.length + ' Bookmarks received from server', type:'bexport'});
	importFull(response);

	let date = new Date(Date.now());
	let doptions = { weekday: 'short',  hour: '2-digit', minute: '2-digit' };
	chrome.action.setTitle({title: chrome.i18n.getMessage("extensionName") + ": " + date.toLocaleDateString(undefined, doptions)});
}

function bimport(response, a = '') {
	if(response == 1) {
		message = chrome.i18n.getMessage("successExportBookmarks");
		loglines = logit("Info: " + message);
		chrome.runtime.sendMessage({text:"successExportBookmarks", type:'bimport'});
	} else {
		message = chrome.i18n.getMessage("errorExportBookmarks");
		loglines = logit("Error: "+ message + " " + response);
		chrome.runtime.sendMessage({text:"errorExportBookmarks", type:'bimport'});
	}
}

function toastMessage(mode, message) {
	let url = chrome.runtime.getURL('icons/bookmark.png');

	if(mode == '0') {
		color = '#45740d';
		bg = 'rgb(167 241 82)';
	} else {
		color = 'white';
		bg = 'rgb(233 81 61)';
	}

	chrome.tabs.executeScript({code: `(function() {
		let toast = document.createElement('div');
		toast.id = 'htoast';
		let style = document.createElement('style');
		document.head.appendChild(style);
		style.sheet.insertRule(\`
			#htoast {
				position: fixed;
				bottom: -3em;
				z-index: 100;
				left: 50%;
				color: `+color+`;
				background-color: `+bg+`;
				padding: 0.3em 0.5em .3em 3.5em;
				border-radius: 0.4em;
				opacity: 0;
				transform: translateX(-50%);
				width: max-content;
				max-width: 75%;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				box-shadow: rgb(0 0 0 / 50%) 0 0 0.3em 0;
				transition: opacity 0.5s, bottom 0.5s, top 0.3s;
				line-height: 2em;
				font-family: sans-serif;
				background-image: url(`+url+`);
				background-repeat: no-repeat;
				background-size: 2em;
				background-position-x: .7em;
				background-position-y: .3em;
			}
		\`);
		style.sheet.insertRule(\`
			.stoast {
				bottom: 3em !important;
				opacity: 1 !important;
			}
		\`);
		toast.innerText = '` + message + `';
		document.body.appendChild(toast);
		setTimeout(function() {toast.classList.add('stoast')}, 5);
		setTimeout(function() {toast.className = ''}, 3000);
		setTimeout(function() {toast.remove(); style.remove();}, 3500);
	})()`});
}

function addmark(response, a = '') {
	response = response.toString();
	chrome.storage.local.get(null, async function(options) {
		if(options['actions']['crsrv'] === true) {
			if(response === "0") {
				response = "Bookmark added";
				changeIcon('info');
				mode = '0';
			} else {
				response = response;
				changeIcon('warn');
				mode = '1';
			}

			let uastr = navigator.userAgent.toLowerCase();
			
			if(uastr.match(/mobile/i)) {
				toastMessage(mode, response);
			} else {
				notify(Math.random().toString(16).substring(2, 10), response);
			}

			loglines = logit("Info: " + response);
		}
	});

	let datems = Date.now();
	chrome.storage.local.set({last_s: datems});
}

function durl(response, a = '') {
	//
}

function editmark(response, a = '') {
	if(response == 1) {
		loglines = logit("Info: Bookmark edited successfully at the server");
	} else {
		message = "Error: Bookmark not edited at the server, please check the server logfile.";
		loglines = logit(message);
		notify('error',message);
	}
}

function movemark(response, a = '') {
	if(response == 1)
		loglines = logit("Info: Bookmark moved successfully at the server");
	else
		loglines = logit("Error: Bookmark not moved at the server, response from server is: " + response);
}

function delmark(response, a = '') {
	if(response == 1) {
		loglines = logit("Info: Bookmark removed at the server");
	} else {
		loglines = logit("Error: Bookmark not removed at the server, please check the server logfile");
	}

	let datems = Date.now();
	chrome.storage.local.set({last_s: datems});
}

function arename(response, a = '') {
	//
}

function sendTabs(response) {
	response = parseInt(response);
	if(response < 1) {
		message = "Tabs could not be saved remotely, please check server log";
		loglines = logit(message);
		notify('error',message);
	}
}

function getTabs(response) {
	tabCount = response.length;
	
	for(let i = 0; i < tabCount; i++) {
		chrome.tabs.query({url: response[i].bmURL}, function(tabInfo) {
			if(tabInfo.length === 0) {
				chrome.tabs.create({url: response[i].bmURL, active:false});
			}
		});
	}
}

function getNewTabs() {
	sendRequest(getTabs);
	chrome.tabs.onCreated.addListener(tabCreated);
	chrome.tabs.onUpdated.addListener(tabUpdated);
	chrome.tabs.onRemoved.addListener(tabCreated);
}

function tabCreated(tab) {
	setTimeout(() => {  chrome.tabs.query({}, saveTabs); }, 3000);
}

function tabUpdated(tID, info) {
	if(info.status === 'complete') {
		tabCreated(tID);
	}
}

function saveTabs(oTabs) {
	var tabs = [];
	oTabs.forEach(function(tab){
		if(tab.url !== undefined && tab.pinned === false && tab.incognito === false) {
			tabs.push({'windowId':tab.windowId, 'url':tab.url, title:tab.title});
		}
	});

	sendRequest(sendTabs, JSON.stringify(tabs));
}

function ccMenus() {
	chrome.permissions.getAll(function(e) {
		if(e.permissions.includes('contextMenus')) {
			chrome.contextMenus.removeAll();
			chrome.contextMenus.create({
				id: "sm_settings",
				title: chrome.i18n.getMessage("optionsSyncOptions"),
				contexts: ["action"]
			})
			
			chrome.contextMenus.onClicked.addListener(info => {
				if (info.menuItemId == "sm_settings") chrome.runtime.openOptionsPage();
			})
			
			chrome.storage.local.get(null, function(options) {
				if(options['s_type'] == "PHP") {
					if(options.actions.crsrv === true) {
						chrome.commands.getAll((commands) => {
							for (let {name, shortcut} of commands) {
								var s = (name === 'bookmark-tab') ? shortcut:'undef';
							}
							chrome.contextMenus.create({
								title: chrome.i18n.getMessage("bookmarkTab") + ` (${s})`,
								type: "normal",
								contexts: ["page"],
								id: "smark"
							});
						});
					}
					
					try{
						chrome.contextMenus.create({
							title: chrome.i18n.getMessage("sendPage"),
							type: "normal",
							contexts: ["page"],
							id: "ssendpage"
						});

						chrome.contextMenus.create({
							title: chrome.i18n.getMessage("sendLink"),
							type: "normal",
							contexts: ["link"],
							id: "ssendlink"
						});

						try{
							chrome.contextMenus.create({
								title: chrome.i18n.getMessage("sendTab"),
								type: "normal",
								contexts: ["tab"],
								id: "ssendtab"
							});
						} catch {}
					} catch(error) {
						loglines = logit(error);
					}
				}
			})
		}

		chrome.storage.local.get(null, function(options) {
			if(options.s_tabs === true) {
				getNewTabs();
			}
		});
	});
}

function bookmarkTab() {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		let jsonMark = JSON.stringify({ 
			"id": Math.random().toString(24).substring(2, 12),
			"url": tabs[0].url,
			"title": tabs[0].title,
			"type": 'bookmark',
			"folder": (abrowser === true) ? 'unfiled_____':2,  
			"nfolder": 'More Bookmarks',
			"added": new Date().valueOf()
		});

		sendRequest(addmark, jsonMark, '1');
	});
}

function sendTab(element) {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.storage.local.get(null, function(options) {
			let url = (element.target.url) ? element.target.url:tabs[0].url;
			loglines = logit("Info: " + chrome.i18n.getMessage("sendLinkYes") + ", Client: " + options['s_uuid']);
			sendRequest(getpurl, url, element.target.id);
		});
	});
}

function logit(message) {
	var ndate = new Date();
	var logline = loglines + ndate.toLocaleString() + " - " + message + "\n";
	if(message.toString().toLowerCase().indexOf('error') >= 0 && message.toString().toLowerCase().indexOf('TypeError') <= 0)
		notify('error',message);
	//	console.info(message);
	return logline;
}

function get_oMarks() {
	chrome.permissions.getAll(function(e) {
		if(e.permissions.includes('bookmarks')) {
			chrome.bookmarks.getTree(function(results) { oMarks = results; });
		}
	});
}

function removeAllMarks() {
	loglines = logit('Info: Try to remove all local bookmarks');
	try {
		chrome.bookmarks.onRemoved.removeListener(onRemovedCheck);
		chrome.bookmarks.getTree(function(tree) {
			tree[0].children.forEach(function(mainfolder) {
				mainfolder.children.forEach(function(userfolder) {
					chrome.bookmarks.onRemoved.removeListener(onRemovedCheck);
					chrome.bookmarks.removeTree(userfolder.id);
				});
			});
		});
		chrome.bookmarks.onRemoved.addListener(onRemovedCheck);
	} catch(error) {
		loglines = logit(error);
	} finally {
		chrome.storage.local.set({last_s: 1});
	}
}

function changeIcon(mode) {
	switch (mode) {
		case 'error':
			chrome.action.setBadgeText({text: '!'});
			chrome.action.setBadgeBackgroundColor({color: "red"});
			chrome.action.onClicked.removeListener(bookmarkTab);
			chrome.action.onClicked.addListener(function() {chrome.runtime.openOptionsPage()});
			break;
		case 'warn':
			chrome.action.setBadgeText({text: '!'});
			chrome.action.setBadgeBackgroundColor({color: "gold"});
			setTimeout(function(){
				chrome.action.setBadgeText({text: ''});
			}, 5000);
			break;
		case 'info':
			chrome.action.setBadgeText({text: 'i'});
			chrome.action.setBadgeBackgroundColor({color: "chartreuse"});
			setTimeout(function(){
				chrome.action.setBadgeText({text: ''});
			}, 5000);
			break;
		default:
			statement(s)
	 }
	
}

async function init() {
	loglines = logit("Info: AddOn version: " + chrome.runtime.getManifest().version);
	loglines = logit("Info: "+navigator.userAgent);
	chrome.runtime.getPlatformInfo(function(info){
		loglines = logit("Info: Current architecture: "+info.arch+" | Current OS: "+info.os);
	});
	await get_oMarks();
	chrome.storage.local.set({last_message: ""});
	chrome.storage.local.get(null, async function(options) {
		if(options['wdurl'] === undefined) {
			changeIcon('error');
			return false;
		}

		if(options.actions.crsrv === true) {
			chrome.commands.getAll((commands) => {
				for (let {name, shortcut} of commands) {
					var s = (name === 'bookmark-tab') ? shortcut:'undef';
				}
				chrome.action.setTitle({title: chrome.i18n.getMessage("bookmarkTab") + ` (${s})`});
				chrome.action.onClicked.addListener(bookmarkTab);
			});
		} else {
			chrome.action.onClicked.addListener(function() {chrome.runtime.openOptionsPage()});
		}
		
		let s_startup = options['actions']['startup'] || false;
		let s_type = options['s_type'] || "";

		if(s_type == 'PHP') {
			if(options['token'] === undefined && options['creds'] === undefined) {
				changeIcon('error');
			} else {
				chrome.action.setBadgeText({text: ''});
			}
		} else if(s_type == 'WebDAV') {
			if(options['creds'] == '') {
				changeIcon('error');
			} else {
				chrome.action.setBadgeText({text: ''});
			}
		}

		if( s_startup === true && s_type.indexOf('PHP') === -1) {
			loglines = logit("Info: Initiate WebDAV startup sync");
			if(options['wdurl']) getDAVMarks();
		} else if(s_type.indexOf('PHP') === 0) {
			if(options['wdurl']) {
				await ccMenus();
				loglines = logit("Info: Get list of clients.");
				sendRequest(getclients, null, null);
				loglines = logit("Info: Init finished");
			}
		}
	});
}

function onTabActivated(tab){
	pTabs.forEach(async function(pTab, index){
		if(pTab.tID == tab.tabId) {
			sendRequest(durl, pTab.nID);
			pTabs.splice(index,1);
		}
	});
	
}

function pTabsLoad(tID, nID) {
	var tabInfo = {tID:tID,nID:Number(nID)};
	chrome.storage.local.get(['pTabs'], function(result){
		pTabs.length = 0;
		if(result.pTabs !== undefined) {
			result.pTabs.forEach(function(e){
				pTabs.push(e);
			});
		}
		pTabs.push(tabInfo);
		pTabsSave(pTabs);
	});
}

function pTabsSave(nTabs) {
	chrome.storage.local.set({
		pTabs:nTabs
	});
}

function openTab(tURL,nID,tTitle) {	
	chrome.tabs.query({url:tURL}, function(tabInfo) {		
		if(tabInfo.length < 1) {
			chrome.tabs.create({url: tURL, active:false}, function(tab) {
				pTabsLoad(tab.id,nID);
			});
		} else {
			pTabsLoad(tabInfo[0].id,nID);
		}

		let nnid = JSON.stringify({id:nID,url:tURL});
		notify(nnid, tURL, tTitle);
	});
}

function notificationSettings(id) {
	let idType = (id.indexOf('{"id":') === 0) ? 'url':id.substring(0, id.indexOf('_'));
	let debugArr = ['console', 'error', 'setting'];

	if(debugArr.includes(idType)) {
		debug = true;
		chrome.runtime.openOptionsPage();
	} else {
		let nd;

		try {
			nd = JSON.parse(id.substring(0, id.indexOf('_')));
		} catch (e) {
			//
		}
		
		if (typeof nd !== 'undefined') {
			try {
				chrome.tabs.query({url:nd.url}, function(tabInfo) {
					if(tabInfo.length > 0) chrome.tabs.highlight({tabs: tabInfo[0].index});
				});
			} catch(error) {
				loglines = logit(error);
			}
		}
	}
}

function onInstalled(details){
	if(details.reason == 'install') {
		chrome.runtime.openOptionsPage();
		checkCommandShortcuts();
	}
}

function checkCommandShortcuts() {
	chrome.commands.getAll((commands) => {
		let missingShortcuts = [];

	for (let {name, shortcut} of commands) {
		if (shortcut === '') {
			missingShortcuts.push(name);
		}
	}

    if (missingShortcuts.length > 0) {
		notify('error', "Default Shortcuts for Extension (Ctrl+Q) could not be set. Please check your settings, if they are blocked by another extension. You can set your own Shortcut in Browser settings.");
    }
  });
}

function notify(notid, message, title=chrome.i18n.getMessage("extensionName")) {
	notid = notid + '_' + Date.now().toString();

	try {
		chrome.notifications.create(notid, {
			"type": "basic",
			"title": title,
			"iconUrl": "icons/bookmark.png",
			"message": message
		});
	} catch(error) {
		loglines = logit(error);
	}
}

function onCreatedCheck(id, bookmark) {
	get_oMarks();
	chrome.storage.local.get(null, function(options) {
		var s_create =options['actions']['create'] || false;
		var s_type = options['s_type'] || "";

		if(s_create === true && s_type.indexOf('PHP') == -1) {
			saveAllMarks();
		}
		else if(s_create === true && s_type.indexOf('PHP') == 0) {
			sendMark(bookmark);
		}
	});	
}

function onMovedCheck(id, bookmark) {
	get_oMarks();
	chrome.storage.local.get(null, async function(options) {
		var s_change = options['actions']['change'] || false;
		var s_type = options['s_type'] || "";
		
		if(s_change === true && s_type.indexOf('PHP') == -1) {
			saveAllMarks();
		} else if (s_change === true && s_type.indexOf('PHP') == 0) {
			chrome.bookmarks.get(bookmark.parentId, function(folder) {
				chrome.bookmarks.get(id, function(bmark) {
					let jsonMark = JSON.stringify({
						"id": id,
						"index": bookmark.index,
						"folderIndex": folder[0]['index'],
						"folder": bookmark.parentId,
						"nfolder": folder[0]['title'],
						"url":bmark[0].url
					});
					loglines = logit("Info: Sending move request to server. Bookmark ID: " + id);
					sendRequest(movemark, jsonMark);
				});
			});
		}
	});
}

function onChangedCheck(id, changeInfo) {
	get_oMarks();
	chrome.storage.local.get(null, function(options) {
		var s_change = options['actions']['change'] || false;
		var s_type = options['s_type'] || "";
		
		if(s_change === true && s_type.indexOf('PHP') == -1) {
			saveAllMarks();
		} else if(s_change === true && s_type.indexOf('PHP') == 0) {
			chrome.bookmarks.get(id, function(bmark) {
				let jsonMark = JSON.stringify({
					"url": changeInfo.url,
					"title": changeInfo.title,
					"parentId": bmark[0].parentId,
					"index": bmark[0].index
				});

				loglines = logit("Info: Sending edit request to server. URL: "+ changeInfo.url);
				sendRequest(editmark, jsonMark);
			});
		}
	});
}

function onRemovedCheck(id, bookmark) {
	chrome.storage.local.get(null, async function(options) {
		var s_remove = options['actions']['remove'] || false;
		var s_type = options['s_type'] || "";
		
		if(s_remove === true  && s_type.indexOf('PHP') == -1) {
			chrome.bookmarks.onRemoved.removeListener(onRemovedCheck);
			saveAllMarks();
		} else if (s_remove === true  && s_type.indexOf('PHP') == 0) {
			await removeMark(bookmark);
			await get_oMarks();
		}
	});
}

function exportPHPMarks(upl=[]) {
	loglines = logit("Info: Send new local bookmarks to server");
	let bookmarks = '';
	let p = 0;

	chrome.bookmarks.getTree(function(bookmarkItems) {
		if(upl.length === 0) {
			bookmarks = bookmarkItems;
			p = 0;
		} else {
			bookmarks = upl;
			p = 1;
		}
		
		sendRequest(bimport, JSON.stringify(bookmarks), p);
	});
	
	let datems = Date.now();
	chrome.storage.local.set({last_s: datems});
}

function saveAllMarks() {
	loglines = logit("Info: Requesting all bookmarks from server");
	chrome.bookmarks.getTree(function(bmTree){
		var bookmarks = JSON.stringify(bmTree);
		var xhr = new XMLHttpRequest();
		chrome.storage.local.get(null, function(options) {
			xhr.open("PUT", options['wdurl'] + "/" + filename, true);
			xhr.withCredentials = true;
			xhr.setRequestHeader('X-Filename', filename);
			xhr.setRequestHeader('Authorization', 'Basic ' + btoa(options['creds']));
			xhr.onload = function () {
				if( xhr.status < 200 || xhr.status > 226) {
					message = chrome.i18n.getMessage("errorSaveBookmarks") + xhr.status;
					notify('error',message);
					loglines = logit("Info: "+message);
					chrome.bookmarks.onRemoved.addListener(onRemovedCheck);
				}
				else {
					loglines = logit("Info: Bookmarks send successfully to WebDAV share");
				}
			}
			xhr.send(bookmarks);
		});
	});
	let datems = Date.now();
	let date = new Date(datems);
	let doptions = { weekday: 'short',  hour: '2-digit', minute: '2-digit' };
	chrome.storage.local.set({last_s: datems});
	chrome.action.setTitle({title: chrome.i18n.getMessage("extensionName") + ": " + date.toLocaleDateString(undefined,doptions)});
}

function removeMark(bookmark) {
	let jsonMark = JSON.stringify({
		"url": bookmark.node.url,
		"folder": bookmark.node.parentId,
		"index": bookmark.node.index,
		"type": bookmark.node.type,
		"id": bookmark.node.id,
		"title": bookmark.node.title
	});
	
	loglines = logit("Info: Sending remove request to server: <a href='"+bookmark.node.url+"'>"+bookmark.node.url+"</a>");
	sendRequest(delmark, jsonMark);
}

function sendMark(bookmark) {
	if(!("type" in bookmark) && !("url" in bookmark)) {
		bookmark.type = "folder";
	} else if(!("type" in bookmark) && ("url" in bookmark)) {
		bookmark.type = "bookmark";
	}

	chrome.bookmarks.get(bookmark.parentId, async function(bmark) {
		let jsonMark = JSON.stringify({ 
			"id": bookmark.id,
			"url": bookmark.url,
			"title": bookmark.title,
			"type": bookmark.type,
			"folder": bookmark.parentId,
			"nfolder": bmark[0].title,
			"added": bookmark.dateAdded
		});

		loglines = logit("Info: Sending add request to server: <a href='"+bookmark.url+"'>"+bookmark.url+"</a>");
		sendRequest(addmark, jsonMark);
	});
}

async function doFullSync() {
	loglines = logit("Info: Sync started.");
	try {
		chrome.storage.local.get(null, async function(options) {
			if(options['s_type'] == 'PHP') {
				loglines = logit('Info: Sending Sync request to server');
				sendRequest(bexport, 'json');
			}
		});
	} catch(error) {
		loglines = logit(error);
	} finally {
		chrome.storage.local.set({last_s: 1});
	}
}

async function importFull(rMarks) {
	const lMarks = [];
	const dMarks = new Array();
	const uMarks = new Array();

	createLocalMarks(oMarks);
	function createLocalMarks(nodes) {
		nodes.forEach(function (node) {
			lMarks.push(node);
			if (node.children) createLocalMarks(node.children);
		});
	}

	lMarks.forEach(function(lmark) {		
		const duplicate = rMarks.some(element => element.bmTitle === lmark.title);
		if (!duplicate) dMarks.push(lmark);
	});

	async function checkMark(remoteMark, rIndex) {
		let action = 0;
		let localMark = (await searchBookmarkAsync({title: remoteMark.bmTitle}))[0];

		if(typeof localMark === 'undefined') {
			action = 1;
		} else {
			let remoteParentFolderName = rMarks.filter(element => element.bmID === remoteMark.bmParentID)[0].bmTitle;
			let localParentFolderName = (await getBookmarkAsync(localMark.parentId))[0].title;
			if(remoteParentFolderName !== localParentFolderName) {
				action = 2;
			} else {
				action = 3;
			}
		}
		return action;
	}

	async function createMark(remoteMark) {
		let remoteParentFolderName = '';	
		let localParentId = '';

		if(remoteMark.bmParentID.endsWith('_____') || remoteMark.bmParentID.length === 1) {
			localParentId = remoteMark.bmParentID;
		} else {
			let searchedID = remoteMark.bmParentID;
			remoteParentFolderName = (rMarks.filter(element => element.bmID == searchedID)[0] != undefined) ? rMarks.filter(element => element.bmID == searchedID)[0].bmTitle:'';
			let sRes = (await searchBookmarkAsync({title: remoteParentFolderName}));
			if(sRes.length > 0) 
				localParentId = sRes[0].id;
			else
				return false;
		}
		
		let rMark = {};

		if(abrowser) {
			rMark.index = parseInt(remoteMark.bmIndex);
			rMark.parentId = localParentId;
			rMark.title = remoteMark.bmTitle;
			rMark.url = remoteMark.bmURL;
			rMark.type = remoteMark.bmType;
		} else {
			rMark.parentId = localParentId;
			rMark.title = remoteMark.bmTitle;
			rMark.url = remoteMark.bmURL;
		}
		
		let newMark = (await createBookmarkAsync(rMark));
		let cNewMark = newMark;

		if(cNewMark && typeof(cNewMark.url) === undefined) {
			let oldID = remoteMark.bmID;
			let newID = cNewMark.id;

			rMarks.forEach(async function(cmark, index){
				if(rMarks[index].bmParentID === oldID) rMarks[index].bmParentID = newID;
				if(rMarks[index].bmID === oldID) rMarks[index].bmID = newID;
			});
		}
	}

	async function iMoveMark(remoteMark) {
		let localMark = (await searchBookmarkAsync({title: remoteMark.bmTitle}))[0];
		let remoteParentFolderName = '';
		let localParentId = '';

		if(remoteMark.bmParentID.endsWith('_____') || remoteMark.bmParentID.length === 1) {
			localParentId = remoteMark.bmParentID;
		} else {
			let searchedID = remoteMark.bmParentID;
			remoteParentFolderName = rMarks.filter(element => element.bmID == searchedID)[0].bmTitle;		
			localParentId = (await searchBookmarkAsync({title: remoteParentFolderName}))[0].id;
		}

		let destination = new Object();
		destination.parentId = localParentId;
		destination.index = parseInt(remoteMark.bmIndex);
		let newMark = (await moveBookmarkAsync(localMark.id, destination));
	}

	chrome.bookmarks.onCreated.removeListener(onCreatedCheck);
	chrome.bookmarks.onMoved.removeListener(onMovedCheck);
	chrome.bookmarks.onRemoved.removeListener(onRemovedCheck);

	for (let index = 0; index < rMarks.length; index++) {
		let action = 0;
		remoteMark = rMarks[index];

		if((abrowser === true && !remoteMark.bmID.endsWith('_____')) || (abrowser === false && remoteMark.bmID.length > 1)) {
			action = await checkMark(remoteMark, index);
		} else {
			action = 0;
		}
		
		switch (action) {
			case 0:
				loglines = logit('Debug: Ignore bookmark "'+remoteMark.bmID+'"');
				break;
			case 1:
				loglines = logit('Debug: Create bookmark "'+remoteMark.bmID+'"');
				await createMark(remoteMark);
				break;
			case 2:
				loglines = logit('Debug: Move bookmark "'+remoteMark.bmID+'"');
				await iMoveMark(remoteMark);
				break;
			case 3:
				loglines = logit('Debug: Existing Bookmark "'+remoteMark.bmID+'"');
				await iMoveMark(remoteMark);
				break;
			default:
				loglines = logit('Debug: Unknown action for bookmark "'+remoteMark.bmID+'"');
				break;
		}	
	}

	let cDate = (lastseen == 0) ? Date.now():lastseen;
	dMarks.forEach(lmark => {
		if (lmark.id.endsWith('_____') || lmark.id.length < 2) {
			// 
		} else if (lmark.dateAdded >= cDate) {
			uMarks.push(lmark);
		} else {
			chrome.bookmarks.onRemoved.removeListener(onRemovedCheck);
			chrome.bookmarks.remove(lmark.id, function(removeB) {});
		}
	});

	chrome.bookmarks.onCreated.addListener(onCreatedCheck);
	chrome.bookmarks.onMoved.addListener(onMovedCheck);
	chrome.bookmarks.onRemoved.addListener(onRemovedCheck);

	if(uMarks.length > 0) exportPHPMarks(uMarks);
}

function c2cm(bookmarks) {
	bookmarks = bookmarks.replace(/root________/g, '0');
	bookmarks = bookmarks.replace(/toolbar_____/g, '1');
	bookmarks = bookmarks.replace(/unfiled_____/g, '2');
	bookmarks = bookmarks.replace(/mobile______/g, '3');
	bookmarks = bookmarks.replace(/menu________/g, '2'); // 4, not exist in chromium
	return bookmarks;
}

function getBookmarkAsync(id) {
	return new Promise(function(fulfill, reject) {
		chrome.bookmarks.get(id, fulfill);
	});
}

function searchBookmarkAsync(parms) {
	return new Promise(function(fulfill, reject) {
		chrome.bookmarks.search(parms, fulfill);
	});
}

function createBookmarkAsync(parms) {
	return new Promise(function(fulfill, reject) {
		chrome.bookmarks.create(parms, fulfill);
	});
}

function moveBookmarkAsync(id, destination) {
	return new Promise(function(fulfill, reject) {
		chrome.bookmarks.move(id, destination, fulfill);
	});
}

function getDAVMarks() {
	chrome.storage.local.get(null, function(options) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', options['wdurl'] + '/' + filename + '?t=' + Math.random(), true);
		xhr.withCredentials = true;
		xhr.setRequestHeader('X-Filename', filename);
		xhr.setRequestHeader('Authorization', 'Basic ' + btoa(options['creds']));
		xhr.onload = function () {		
			if( xhr.status != 200 ) {
				message = chrome.i18n.getMessage("errorGetBookmarks") + xhr.status;
				notify('error',message);
				loglines = logit('Error: '+message);
			}
			else {
				let DAVMarks = JSON.parse(xhr.responseText);
				chrome.bookmarks.onCreated.removeListener(onCreatedCheck);
				chrome.bookmarks.onRemoved.removeListener(onRemovedCheck);
				pMarks = [];
				let parsedMarks = parseMarks(DAVMarks, index=0);
				count = 0;
				addAllMarks(parsedMarks);			
			}
		}
		loglines = logit('Info: Requesting bookmarks from WebDAV Server');
		xhr.send();
	});
}

function parseMarks(DAVMarks, level=0) {
	pMarks.push(DAVMarks[level]);
	let findex = 0;
	if(DAVMarks[level].children) {
		DAVMarks[level].children.forEach(function() {
			parseMarks(DAVMarks[level].children, findex)
			findex++;
		});
	}
	return pMarks;
}

function importMarks(parsedMarks, index=0) {
    let bmid = parsedMarks[index].bmID;
    let bmparentId = parsedMarks[index].bmParentID;
	let bmindex = parseInt(parsedMarks[index].bmIndex,10);
    let bmtitle = parsedMarks[index].bmTitle;
    let bmtype = parsedMarks[index].bmType;
    let bmurl = parsedMarks[index].bmURL;

	if(abrowser == true) {
		var newParentId = (typeof bmparentId !== 'undefined' && bmparentId.substr(bmparentId.length - 2) == "__") ? bmparentId : dictOldIDsToNewIDs[bmparentId];
		if(bmparentId == "root________") {
			importMarks(parsedMarks, ++index);
			return false;
		}
	} else {
		var newParentId = (typeof bmparentId !== 'undefined' && bmparentId.length < 2) ? bmparentId : dictOldIDsToNewIDs[bmparentId];
		if(bmparentId == '0') {
			importMarks(parsedMarks, ++index);
			return false;
		}
	}
	chrome.bookmarks.onCreated.removeListener(onCreatedCheck);
	chrome.bookmarks.onMoved.removeListener(onMovedCheck);
	chrome.bookmarks.onRemoved.removeListener(onRemovedCheck);
	chrome.bookmarks.onChanged.removeListener(onChangedCheck);

	if(abrowser == true) {
		chrome.bookmarks.create(
			(bmtype == "folder" ?
				{
					index: bmindex,
					parentId: newParentId,
					title: bmtitle,
					type: bmtype
				} :
				{
					index: bmindex,
					parentId: newParentId,
					title: bmtitle,
					type: bmtype,
					url: bmurl
				}
			),
			function(node) {
				let newID = bmid.substr(bmid.length - 2) == "__" ? bmid : node.id;
				dictOldIDsToNewIDs[bmid] = newID;
				++count;
	
				if (typeof parsedMarks[index+1] == 'undefined') {
					message = count + chrome.i18n.getMessage("successImportBookmarks");
					notify('info',message);
					loglines = logit('Info: ' + message + ' Re-adding the listeners now');
					chrome.bookmarks.onCreated.addListener(onCreatedCheck);
					chrome.bookmarks.onMoved.addListener(onMovedCheck);
					chrome.bookmarks.onRemoved.addListener(onRemovedCheck);
					chrome.bookmarks.onChanged.addListener(onChangedCheck);
				}
				else {
					importMarks(parsedMarks, ++index);
				}
		});
	} else {
		if(bmid.length > 1 ) {
		chrome.bookmarks.create(
			(bmtype == "folder" ?
				{
					index: bmindex,
					parentId: newParentId,
					title: bmtitle
				} :
				{
					parentId: newParentId,
					title: bmtitle,
					url: bmurl
				}
			),
			function(node) {
				let alength = parsedMarks.length;
				let nindex = index + 1;

				if(nindex < alength) {
					let newID = bmid.length < 2 ? bmid : node.id;
					dictOldIDsToNewIDs[bmid] = newID;
					importMarks(parsedMarks, nindex);
				} else {
					message = parsedMarks.length + chrome.i18n.getMessage("successImportBookmarks");
					notify('info',message);
					loglines = logit('Info: ' + message + ' Re-adding the listeners now');
					chrome.bookmarks.onCreated.addListener(onCreatedCheck);
					chrome.bookmarks.onMoved.addListener(onMovedCheck);
					chrome.bookmarks.onRemoved.addListener(onRemovedCheck);
					chrome.bookmarks.onChanged.addListener(onChangedCheck);
				}
			}
		);
		}
	}
}

function addAllMarks(parsedMarks, index=1) {
	chrome.bookmarks.onCreated.removeListener(onCreatedCheck);
    let bmid = parsedMarks[index].id;
    let bmparentId = parsedMarks[index].parentId;
    let bmindex = parsedMarks[index].index;
    let bmtitle = parsedMarks[index].title;
    let bmtype = parsedMarks[index].type;
    let bmurl = parsedMarks[index].url;
	let bmdate = parsedMarks[index].dateAdded;
    let newParentId = (typeof bmparentId !== 'undefined' && bmparentId.substr(bmparentId.length - 2) == "__") ? bmparentId : dictOldIDsToNewIDs[bmparentId];
	
	if(bmparentId == "root________" || bmdate < last_s) {
		addAllMarks(parsedMarks, ++index);
		return false;
	}
	
	chrome.bookmarks.create(
		(bmtype == "separator" ?
		 {
			 index: bmindex,
			 parentId: newParentId,
			 type: bmtype
		 } :
		 (bmtype == "folder" ?
		  {
			  index: bmindex,
			  parentId: newParentId,
			  title: bmtitle,
			  type: bmtype
		  } :
		  {
			  index: bmindex,
			  parentId: newParentId,
			  title: bmtitle,
			  type: bmtype,
			  url: bmurl
		  }
		 )
		),
		function(node) {
		let newID = bmid.substr(bmid.length - 2) == "__" ? bmid : node.id;
		dictOldIDsToNewIDs[bmid] = newID;
		++count;

		if (typeof parsedMarks[index+1] !== 'undefined') {
			addAllMarks(parsedMarks, ++index);
			
		}
		else {
			message = count + chrome.i18n.getMessage("successImportBookmarks");
			notify('info',message);
			loglines = logit('Info: '+message);
			chrome.bookmarks.onCreated.addListener(onCreatedCheck);
			chrome.bookmarks.onRemoved.addListener(onRemovedCheck);
			
			let datems = Date.now();
			let date = new Date(datems);
			let doptions = { weekday: 'short',  hour: '2-digit', minute: '2-digit' };
			chrome.storage.local.set({
				last_s: datems,
			});
			chrome.action.setTitle({title: chrome.i18n.getMessage("extensionName") + ": " + date.toLocaleDateString(undefined,doptions)});
		}
	});

}
