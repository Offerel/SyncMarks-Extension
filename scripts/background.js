var mozilla = false;

try {
	chrome.runtime.getBrowserInfo();
	mozilla = true;
} catch (em) {
	mozilla = false;
}

var dictOldIDsToNewIDs = { "-1": "-1" };
var oMarks = [];
var pTabs = [];
var remoteMark;
var [debug, lastseen, count, last_s] = [false, null, 0, 0];

if(!chrome.runtime.onStartup.hasListener(onStartup)) chrome.runtime.onStartup.addListener(onStartup);
init();

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		if(sender.id === chrome.runtime.id) {
			switch (request.action) {
				case 'clientInfo':
					sendRequest(clientInfo, request.data, request.tab);
					break;
				case 'clientRename':
					sendRequest(clientRename, request.data);
					break;
				case 'clientSendOptions':
					sendRequest(clientSendOptions, request.data);
					break;
				case 'clientGetOptions':
					sendRequest(clientGetOptions);
					break;
				case 'clientRemove':
					sendRequest(clientRemove, request.data);
					break;
				case 'removeAllMarks':
					removeAllMarks();
					break;
				case 'bookmarkExport':
					sendRequest(bookmarkExport, request.data, request.tab);
					break;
				case 'exportPHPMarks':
					exportPHPMarks();
					break;
				case 'loglines':
					logit(request.data);
					break;
				case 'getLoglines':
					chrome.runtime.sendMessage({task: "rLoglines"});
					break;
				case 'emptyLoglines':
					chrome.storage.session.remove('sessionlog');
					chrome.runtime.sendMessage({task: "rLoglines"});
					break;
				case 'changeIcon':
					changeIcon(request.data);
					break;
				case 'bookmarkTab':
					bookmarkTab();
					break;
				case 'tabSync':
					tabSync(request.data);
					break;
				case 'bmRemove':
					sendRequest(bmRemove, request.data);
					break;
				case 'puData':
					getPopupData();
					break;
				default:
					return false;
			}
		}
	}
);

chrome.permissions.getAll(function(e) {
	chrome.storage.local.get(null, function(options) {
		if(chrome.bookmarks) bookmarkSync(options.sync);
		tabSync(options.tabs);
	});

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

if(!chrome.runtime.onInstalled.hasListener(onInstalled)) chrome.runtime.onInstalled.addListener(onInstalled);

if(!chrome.notifications.onClicked.hasListener(notificationSettings)) chrome.notifications.onClicked.addListener(notificationSettings);

if(chrome.commands !== undefined) chrome.commands.onCommand.addListener((command) => {
	bookmarkTab();
});

function onStartup() {
	logit({message: "AddOn: " + chrome.runtime.getManifest().version, type: 'info', source: 'init'});
	logit({message: "Browser: " + navigator.userAgent, type: 'info', source: 'init'});

	chrome.runtime.getPlatformInfo(function(info){
		logit({message: "Architecture: " + info.arch + " | OS: " + info.os, type: 'info', source: 'init'});
	});

	logit({message: 'Create context menus', type: 'info', source: 'startup'});
	ccMenus();
	logit({message: 'Get list of clients', type: 'info', source: 'startup'});
	sendRequest(clientList);

	getPopupData();
	logit({message: 'Startup finished', type: 'info', source: 'startup'});
	init();

	chrome.storage.local.get(null, async function(options) {
		if(options.instance == undefined) {
			changeIcon('error');
			let ldata = {message: 'Instance undefined', type: 'error', source: 'init'};
			chrome.storage.session.set({
				popup: {
					message: ldata.message,
					mode: ldata.type
				}
			});
			logit(ldata);
			return false;
		}

		if(options.token === undefined) {
			changeIcon('error');
			chrome.storage.session.remove('bmhtml');
			chrome.storage.session.set({
				popup: {
					message: "Login token missing",
					mode: 'error'
				}
			});
			logit({message: 'Login token missing', type: 'error', source: 'init'});
		} else {
			chrome.action.setBadgeText({text: ''});
		}

		last_s = (options.last_s) ? options.last_s:0;
	});
}

function sendRequest(action, data = null, tab = null) {
	chrome.storage.local.get(null, function(options) {
		if(options.instance == undefined || options.instance.length < 4) return false;

		let btoken = {
			client:options.uuid,
			token:options.token
		};

		let authheader = 'Bearer ' + btoa(encodeURIComponent(JSON.stringify(btoken)));
		let client = options.uuid;

		if(action.name === 'bookmarkAdd' && options.sync === false ) {
			client = 'bookmarkTab';
		}

		const params = {
			action: action.name,
			client: client,
			data: data
		}

		Object.keys(params).forEach((k) => params[k] == null && delete params[k]);

		try {
			fetch(options.instance + '?api=v1', {
				method: "POST",
				cache: "no-cache",
				headers: {
					'Content-type': 'application/json;charset=UTF-8',
					'Authorization': authheader,
				},
				redirect: "follow",
				referrerPolicy: "no-referrer",
				body: JSON.stringify(params)
			}).then(response => {
				let xRinfo = response.headers.get("X-Request-Info");
				if (xRinfo != null) {
					if(xRinfo == 0) {
						chrome.storage.local.remove('token');
						chrome.storage.session.remove('bmhtml');
						let ldata = {message: 'Invalid credentials', type: 'error', source: action.name};
						changeIcon(ldata.type);
						logit(ldata);
						chrome.storage.session.set({
							popup: {
								message:ldata.message,
								mode:ldata.type
							}
						});
						chrome.storage.session.remove('bmhtml');
					} else {
						chrome.storage.local.set({token:xRinfo});
					}
				}
				return response.json();
			}).then(responseData => {
				action(responseData, tab);
			}).catch(err => {
				let ldata = {message: err, type: 'error', source: action.name};
				logit(ldata);
			});
		} catch (ferror) {
			params.url = options.instance;
			params.error = ferror;
			let estr = JSON.stringify(params);
			let ldata = {message: estr, type: 'error', source: 'Fetch'};
			logit(ldata);
		}
	});
}

function clientSendOptions(response) {
	if(response.code == 200) {
		let ldata = {message: response.message, type: 'info', source: 'clientSendOptions'};
		logit(ldata);
		changeIcon('info');
		chrome.storage.session.set({
			popup: {
				message: response.message,
				mode: 'success'
			}
		});
	} else {
		changeIcon('warn');
		chrome.storage.session.set({
			popup: {
				message: response.message,
				mode: 'warn'
			}
		});
		let ldata = {message: response.message, type: 'error', source: 'clientSendOptions'};
		logit(ldata);
	}
}

function clientGetOptions(response) {
	chrome.runtime.sendMessage({task: "clientOptions", cOptions: response.cOptions});
}

function bmRemove(response) {
}

function clientRemove(response) {
}

function clientList(response) {
	chrome.storage.local.remove('clist');
	chrome.storage.local.set({clist:response.clients});
	chrome.permissions.getAll(function(e) {
		if(e.permissions.includes('contextMenus')) {
			if(Array.isArray(response.clients)) {
				response.clients.forEach(function(client){
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
				let cnt = response.clients.length - 1;
				let ldata = {message: 'List of ' + cnt + ' clients received successful', type: 'info', source: 'clientList'};
				logit(ldata);
			}
		}
	});

	logit({message: 'Get notifications for current client', type: 'info', source: 'clientList'});
	sendRequest(pushGet);
}

function pushURL(response) {
	if(response.error) logit({message: 'response.error', type: 'error', source: 'pushURL'});
}

function pushGet(response) {
	if(Array.isArray(response.notifications)) {
		try {
			response.notifications.forEach(function(notification) {
				logit({message: 'Received tab: <a href="' + notification.url + '">' + notification.url + '</a>', type: 'info', source: 'pushGet'});
				openTab(notification.url,notification.nkey,notification.title);
			});
		} catch(error) {
			logit({message: error, type: 'error', source: 'pushGet'});
		}

		logit({message: "List of " + response.notifications.length + " notifications received successful", type: 'info', source: 'pushGet'});
	}

	sendRequest(clientInfo);
}

function clientInfo(response, tab = null) {
	if(response !== null) {
		lastseen =  response['lastseen'];

		if (tab != null) {
			chrome.runtime.sendMessage({task: clientInfo.name, type: 'success', cname: response['cname'], ctype: response['ctype'], cinfo: response['cinfo']});
		} else {
			chrome.storage.local.get(null, async function(options) {
				let sync = options.sync || false;
				if(sync) doFullSync();
			});
		}
	}
}

function bookmarkExport(response, tab = null) {
	let bookmarks = response.bookmarks;
	const message = [];
	if(mozilla === false) bookmarks = c2cm(bookmarks);
	count = 0;
	let ldata = {message: bookmarks.length +' Bookmarks received from server', type: 'info', source: 'bookmarkExport'};
	logit(ldata);
	message.text = ldata.message;
	message.type = 'success';
	message.task = bookmarkExport.name;
	
	importFull(bookmarks);
	
	if (tab != null) chrome.runtime.sendMessage({task: message.task, type: message.type, text: message.text});
	logit({message: 'Import finished', type: 'info', source: 'bookmarkExport'});
}

function bookmarkImport(response) {
	const message = [];
	if(response.code == 200) {
		logit({message: response.message, type: 'info', source: 'bookmarkImport'});
		message.text = "successExportBookmarks";
		message.type = 'success';
	} else {
		logit({message: response.message, type: 'error', source: 'bookmarkImport'});
		message.text = chrome.i18n.getMessage("errorExportBookmarks");
		message.type = 'error';
	}

	chrome.runtime.sendMessage({task: bookmarkImport.name, type: message.type, text: message.text});
}

function bookmarkAdd(response) {
	let text = '';
	let type = '';
	chrome.storage.local.get(null, async function(options) {
		if(options.sync === false) {
			if(response.code === 200) {
				text = "Bookmark added";
				changeIcon('info');
				mode = '0';
				type = 'info';
			} else {
				text = response.message;
				changeIcon('warn');
				chrome.storage.session.set({
					popup: {
						message: response.message,
						mode: 'warn'
					}
				});
				mode = '1';
				type = 'error';
			}
			
			if(response.code !== 200) notify(Math.random().toString(16).substring(2, 10), text);

			logit({message: text, type: type, source: 'bookmarkAdd'});
		}
	});

	last_s = Date.now();
	chrome.storage.local.set({last_s: last_s});
}

function pushHide(response) {
	if(response.error) logit({message: response.error, type: type, source: 'pushHide'});
}

function bookmarkEdit(response) {
	let ldata = {message: '', type: '', source: 'bookmarkEdit'};

	if(response['code'] == 200) {
		ldata.type = 'info';
		ldata.message = 'Bookmark edited successfully at the server';
	} else {
		ldata.type = 'error';
		ldata.message = 'Bookmark not edited at the server, please check the server logfile';
		notify(ldata.type, ldata.message);
	}

	logit(ldata);
}

function bookmarkMove(response) {
	if(response['code'] == 200)
		logit({message: 'Bookmark moved successfully at the server', type: 'info', source: 'bookmarkMove'});
	else
		logit({message: "Bookmark not moved on server. " + response[`message`], type: 'error', source: 'bookmarkMove'});
}

function bookmarkDel(response) {
	switch (response['code']) {
		case 200:
			logit({message: response['message'], type: 'info', source: 'bookmarkDel'});
			break;
		case 204:
			changeIcon('warn');
			logit({message: response['message'], type: 'warn', source: 'bookmarkDel'});
			chrome.storage.session.set({
				popup: {
					message: response['message'],
					mode: 'warn'
				}
			});
		default:
			changeIcon('error');
			logit({message: response['message'], type: 'error', source: 'bookmarkDel'});
			chrome.storage.session.set({
				popup: {
					message: response['message'],
					mode: 'error'
				}
			});
	  }

	last_s = Date.now();
	chrome.storage.local.set({last_s: last_s});
}

function clientRename(response) {
	const message = [];
	if(response.message) {
		message.type = 'error';
		message.text = response.message;
	} else {
		message.type = 'success';
		message.text = 'Client renamed';
		changeIcon('info');
	}

	logit({message: message.text, type: message.type, source: 'clientRename'});

	chrome.runtime.sendMessage({task: clientRename.name, type: message.type, text: '' + message.text});
}

function tabsSend(response) {
	if(parseInt(response['tabs']) < 1) {
		logit({message: 'Tabs could not be saved, please check server error log', type: 'error', source: 'tabsSend'});
		changeIcon('error');
	}
}

function tabsGet(response) {
	for(let i = 0; i < response.tabs.length; i++) {
		chrome.tabs.query({url: response.tabs[i].bmURL}, function(tabInfo) {
			if(tabInfo.length === 0) {
				chrome.tabs.create({url: response.tabs[i].bmURL, active:false});
			}
		});
	}
}

function getNewTabs() {
	sendRequest(tabsGet);
	tabSync(true);
}

function tabSync(mode) {
	if(mode === true) {
		if(!chrome.tabs.onCreated.hasListener(tabCreated)) chrome.tabs.onCreated.addListener(tabCreated);
		if(!chrome.tabs.onUpdated.hasListener(tabUpdated)) chrome.tabs.onUpdated.addListener(tabUpdated);
		if(!chrome.tabs.onRemoved.hasListener(tabCreated)) chrome.tabs.onRemoved.addListener(tabCreated);
	} else {
		chrome.tabs.onCreated.removeListener(tabCreated);
		chrome.tabs.onUpdated.removeListener(tabUpdated);
		chrome.tabs.onRemoved.removeListener(tabCreated);
	}
}

function bookmarkSync(mode) {
	if(mode === true) {
		if(!chrome.bookmarks.onCreated.hasListener(onCreatedCheck)) chrome.bookmarks.onCreated.addListener(onCreatedCheck);
		if(!chrome.bookmarks.onMoved.hasListener(onMovedCheck)) chrome.bookmarks.onMoved.addListener(onMovedCheck);
		if(!chrome.bookmarks.onRemoved.hasListener(onRemovedCheck)) chrome.bookmarks.onRemoved.addListener(onRemovedCheck);
		if(!chrome.bookmarks.onChanged.hasListener(onChangedCheck)) chrome.bookmarks.onChanged.addListener(onChangedCheck);
	} else {
		chrome.bookmarks.onCreated.removeListener(onCreatedCheck);
		chrome.bookmarks.onMoved.removeListener(onMovedCheck);
		chrome.bookmarks.onRemoved.removeListener(onRemovedCheck);
		chrome.bookmarks.onChanged.removeListener(onChangedCheck);
	}
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
		if(tab.url !== undefined && tab.pinned === false && tab.incognito === false && tab.url.startsWith('http')) {
			tabs.push({'windowId':tab.windowId, 'url':tab.url, 'title':tab.title});
		}
	});

	sendRequest(tabsSend, tabs);
}

function ccMenus() {
	chrome.permissions.getAll(function(e) {
		if(e.permissions.includes('contextMenus')) {
			chrome.contextMenus.removeAll();
			chrome.storage.local.get(null, function(options) {
				if(options.sync === false) {
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
					logit({message: error, type: 'error', source: 'ccMenus'});
				}
			})
		}

		chrome.storage.local.get(null, function(options) {
			if(options.tabs === true) {
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
			"folder": (mozilla === true) ? 'unfiled_____':2,  
			"nfolder": 'More Bookmarks',
			"added": new Date().valueOf()
		});

		sendRequest(bookmarkAdd, jsonMark);
	});
}

function sendTab(element) {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.storage.local.get(null, function(options) {
			const data = {
				url: (element.target.url) ? element.target.url:tabs[0].url,
				target: element.target.id
			};

			logit({message: chrome.i18n.getMessage("sendLinkYes") + ", Client: " + options.uuid, type: 'info', source: 'sendTab'});
			sendRequest(pushURL, data);
		});
	});
}

async function logit(logdata) {
	const ndate = new Date();
	let ds = ndate.toLocaleDateString(`sv`) + " " + ndate.toLocaleTimeString(`sv`);

	if(logdata.message.toString().toLowerCase().indexOf('undefined') >= 0) {
		let nmessage = new Error().stack.toString();
		logdata.message = logdata.message + ': trace: ' + nmessage;
		logdata.type = 'error';
	}

	let data = await chrome.storage.session.get('sessionlog');
	data.sessionlog = (data.sessionlog === undefined) ? '':data.sessionlog;

	if(logdata.type === 'error' )  {
		changeIcon('error');
		chrome.storage.session.set({
			popup: {
				message: logdata.message,
				mode: logdata.type
			}
		});

		console.warn(ds + " - " + logdata.message);
	}

	let type = logdata.type[0].toUpperCase() + logdata.type.slice(1);
	chrome.storage.session.set({sessionlog: data.sessionlog + ds + " - " + type + ': ' + logdata.message + "\n"});
}

function get_oMarks() {
	chrome.permissions.getAll(function(e) {
		if(e.permissions.includes('bookmarks')) {
			chrome.bookmarks.getTree(function(results) { oMarks = results; });
		}
	});
}

function removeAllMarks() {
	logit({message: 'Try to remove all local bookmarks', type: 'info', source: 'removeAllMarks'});
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
		if(!chrome.bookmarks.onRemoved.hasListener(onRemovedCheck)) chrome.bookmarks.onRemoved.addListener(onRemovedCheck);
	} catch(error) {
		logit({message: error, type: 'error', source: 'removeAllMarks'});
	} finally {
		chrome.storage.local.set({last_s: 1});
	}
}

function changeIcon(mode) {
	let color = 'transparent';
	let text = '';

	switch (mode) {
		case 'error':
			text = '!';
			color = 'red';
			break;
		case 'warn':
			text = '!';
			color = 'gold';
			break;
		case 'info':
			text = 'i';
			color = 'chartreuse';
			break;
		default:
			text = '';
			color = 'transparent';
	}

	chrome.action.setBadgeText({text: text});
	chrome.action.setBadgeBackgroundColor({color: color});

	if(mode != 'error') {
		setTimeout(function(){
			chrome.action.setBadgeText({text: ''});
		}, 5000);
	}
}

async function init() {
	logit({message: 'Starting init', type: 'info', source: 'init'});
	if(!chrome.bookmarks.onRemoved.hasListener(onRemovedCheck)) chrome.bookmarks.onRemoved.addListener(onRemovedCheck);
	if(!chrome.bookmarks.onCreated.hasListener(onCreatedCheck)) chrome.bookmarks.onCreated.addListener(onCreatedCheck);
	if(!chrome.bookmarks.onMoved.hasListener(onMovedCheck)) chrome.bookmarks.onMoved.addListener(onMovedCheck);
	if(!chrome.bookmarks.onChanged.hasListener(onChangedCheck)) chrome.bookmarks.onChanged.addListener(onChangedCheck);
	if(!chrome.tabs.onActivated.hasListener(onTabActivated)) chrome.tabs.onActivated.addListener(onTabActivated);

	get_oMarks();
	logit({message: 'Init finished', type: 'info', source: 'init'});
}

function getPopupData() {
	chrome.storage.local.get(null, async function(options) {
		const data = chrome.storage.session.get("bmhtml");
		let authheader = 'Bearer ' + btoa(encodeURIComponent(JSON.stringify({
			client:options.uuid,
			token:options.token
		})));
	
		if(data.bmhtml === undefined) {
			logit({message: 'Get data for PopUp', type: 'info', source: 'getPopupData'});
			fetch(options.instance + '?t=' + Math.random().toString(24).substring(2, 12), {
				method: "GET",
				cache: "no-cache",
				referrerPolicy: "no-referrer",
				headers: {
					'Authorization': authheader,
				}
			}).then(response => {
				let xRinfo = response.headers.get("X-Request-Info");
				if (xRinfo != null) {
					chrome.storage.local.set({token:xRinfo});
				}
				return response.text();
			}).then(html => {
				chrome.storage.session.set({bmhtml: html});
				logit({message: 'PopUp data saved in session storage', type: 'info', source: 'getPopupData'});
				changeIcon('info');
			}).catch(err => {
				console.error(err);
				changeIcon('error');
				logit({message: err, type: 'error', source: 'getPopupData'});
			});
		}
	});
}

function onTabActivated(tab){
	pTabs.forEach(async function(pTab, index){
		if(pTab.tID == tab.tabId) {
			sendRequest(pushHide, pTab.nID);
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
			logit({message: e, type: 'error', source: 'notificationSettings'});
		}
		
		if (typeof nd !== 'undefined') {
			try {
				chrome.tabs.query({url:nd.url}, function(tabInfo) {
					if(tabInfo.length > 0) chrome.tabs.highlight({tabs: tabInfo[0].index});
				});
			} catch(error) {
				logit({message: error, type: 'error', source: 'notificationSettings'});
			}
		}
	}
}

function onInstalled(details){
	if(details.reason == 'install') {
		chrome.runtime.openOptionsPage();
		checkCommandShortcuts();
	}

	if(details.reason == 'update') {
		migrateOptions();
	}
}

function migrateOptions() {
	chrome.storage.local.get(null, function(options) {
		if(options.wdurl != undefined) {
			chrome.storage.local.set({
				sync: options.actions.startup,
				uuid: options.s_uuid,
				tabs: options.s_tabs,
				instance: options.wdurl
			});
		}

		if(options.sync != undefined && options.sync.auto != undefined) {
			chrome.storage.local.set({sync: options.sync.auto});
		}
	});
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
			"iconUrl": "/icons/bookmark.png",
			"message": message
		});
	} catch(error) {
		logit({message: error, type: 'error', source: 'notify'});
	}
}

function onCreatedCheck(id, bookmark) {
	get_oMarks();
	chrome.storage.local.get(null, function(options) {
		var sync = options.sync || false;
		if(sync) sendMark(bookmark);
	});	
}

function onMovedCheck(id, bookmark) {
	get_oMarks();
	chrome.storage.local.get(null, async function(options) {
		var sync = options.sync || false;
		
		if (sync) {
			chrome.bookmarks.get(bookmark.parentId, function(folder) {
				chrome.bookmarks.get(id, function(bmark) {
					let jMark = {
						"id": id,
						"index": bookmark.index,
						"folderIndex": folder[0]['index'],
						"folder": bookmark.parentId,
						"nfolder": folder[0]['title'],
						"url":bmark[0].url,
						"title":bmark[0].title
					};

					logit({message: 'Sending move request to server. Bookmark ID: ' + id, type: 'info', source: 'onMovedCheck'});
					sendRequest(bookmarkMove, jMark);
				});
			});
		}
	});
}

function onChangedCheck(id, changeInfo) {
	get_oMarks();
	chrome.storage.local.get(null, function(options) {
		var sync = options.sync || false;
		
		if(sync) {
			chrome.bookmarks.get(id, function(bmark) {
				let jsonMark = {
					"url": bmark[0].url,
					"title": bmark[0].title,
					"parentId": bmark[0].parentId,
					"index": bmark[0].index
				};

				logit({message: 'Sending edit request to server. URL: '+ changeInfo.url, type: 'info', source: 'onMovedCheck'});
				sendRequest(bookmarkEdit, jsonMark);
			});
		}
	});
}

function onRemovedCheck(id, bookmark) {
	chrome.storage.local.get(null, async function(options) {
		var sync = options.sync || false;

		if (sync) {
			await removeMark(bookmark);
			await get_oMarks();
		}
	});
}

function exportPHPMarks(upl=[]) {
	logit({message: 'Send new local bookmarks to server', type: 'info', source: 'exportPHPMarks'});
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
		
		sendRequest(bookmarkImport, bookmarks);
	});
	
	last_s = Date.now();
	chrome.storage.local.set({last_s: last_s});
}

function removeMark(bookmark) {
	chrome.bookmarks.get(bookmark.parentId, async function(parent) {
		let jsonMark = {
			"url": bookmark.node.url,
			"folder": bookmark.parentId,
			"nfolder": parent[0]['title'],
			"index": bookmark.index,
			"type": bookmark.node.type,
			"id": bookmark.node.id,
			"title": bookmark.node.title
		};

		logit({message: "Remove request: <a href='" + bookmark.node.url + "'>" + bookmark.node.url + "</a>", type: 'info', source: 'removeMark'});
		sendRequest(bookmarkDel, jsonMark);
	});
}

function sendMark(bookmark) {
	if(!("type" in bookmark) && !("url" in bookmark)) {
		bookmark.type = "folder";
	} else if(!("type" in bookmark) && ("url" in bookmark)) {
		bookmark.type = "bookmark";
	}

	if(!bookmark.url.startsWith("http")) {
		logit({message: 'Will not add none-http(s) url' + bookmark.url, type: 'debug', source: 'sendMark'});
		return false;
	}

	chrome.bookmarks.get(bookmark.parentId, async function(bmark) {
		let jMark = { 
			"id": bookmark.id,
			"url": bookmark.url,
			"title": bookmark.title,
			"type": bookmark.type,
			"folder": bookmark.parentId,
			"nfolder": bmark[0].title,
			"added": bookmark.dateAdded
		};

		logit({message: "Add request: <a href='"+bookmark.url+"'>"+bookmark.url+"</a>", type: 'info', source: 'sendMark'});
		sendRequest(bookmarkAdd, jMark);
	});
}

async function doFullSync() {
	logit({message: "Start Sync", type: 'info', source: 'doFullSync'});
	try {
		chrome.storage.local.get(null, async function(options) {
			logit({message: "Sync request", type: 'info', source: 'doFullSync'});
			sendRequest(bookmarkExport, 'json');
		});
	} catch(error) {
		logit({message: error, type: 'error', source: 'doFullSync'});
	} finally {
		chrome.storage.local.set({last_s: 1});
	}
}

async function importFull(rMarks) {
	logit({message: 'Starting import', type: 'info', source: 'importFull'});
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

		if(mozilla) {
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
			let result = (await searchBookmarkAsync({title: remoteParentFolderName}));
			if(result.length == 0) 
				return false;
			else
				localParentId = (await searchBookmarkAsync({title: remoteParentFolderName}))[0].id;
		}

		let destination = new Object();
		destination.parentId = localParentId;
		if('bmIndex' in remoteMark) destination.index = parseInt(remoteMark.bmIndex);
		let newMark = (await moveBookmarkAsync(localMark.id, destination));
	}

	bookmarkSync(false);

	for (let index = 0; index < rMarks.length; index++) {
		let action = 0;
		remoteMark = rMarks[index];
		
		if((mozilla === true && !remoteMark.bmID.endsWith('_____')) || (mozilla === false && remoteMark.bmID.length > 1)) {
			action = await checkMark(remoteMark, index);
		} else {
			action = 0;
		}
		
		switch (action) {
			case 0:
				logit({message: 'Ignore bookmark "'+remoteMark.bmTitle+'"', type: 'debug', source: 'importFull'});
				break;
			case 1:
				logit({message: 'Create bookmark "'+remoteMark.bmTitle+'"', type: 'debug', source: 'importFull'});
				await createMark(remoteMark);
				break;
			case 2:
				logit({message: 'Move bookmark "'+remoteMark.bmTitle+'"', type: 'debug', source: 'importFull'});
				await iMoveMark(remoteMark);
				break;
			case 3:
				logit({message: 'Existing Bookmark "'+remoteMark.bmTitle+'"', type: 'debug', source: 'importFull'});
				//delete remoteMark.bmIndex;
				await iMoveMark(remoteMark);
				break;
			default:
				logit({message: 'Unknown action for bookmark "'+remoteMark.bmTitle+'"', type: 'debug', source: 'importFull'});
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

	bookmarkSync(true);

	if(uMarks.length > 0) exportPHPMarks(uMarks);
}

function c2cm(bookmarks) {
	bookmarks.forEach((bookmark) => {
		if(bookmark.bmID == "root________") bookmark.bmID = "0";
		if(bookmark.bmParentID == "root________") bookmark.bmParentID = "0";
		if(bookmark.bmID == "toolbar_____") bookmark.bmID = "1";
		if(bookmark.bmParentID == "toolbar_____") bookmark.bmParentID = "1";
		if(bookmark.bmID == "unfiled_____") bookmark.bmID = "2";
		if(bookmark.bmParentID == "unfiled_____") bookmark.bmParentID = "2";
		if(bookmark.bmID == "mobile______") bookmark.bmID = "3";
		if(bookmark.bmParentID == "mobile______") bookmark.bmParentID = "3";
		if(bookmark.bmID == "menu________") bookmark.bmID = "2";
		if(bookmark.bmParentID == "menu________") bookmark.bmParentID = "2";
	});

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

function importMarks(parsedMarks, index=0) {
    let bmid = parsedMarks[index].bmID;
    let bmparentId = parsedMarks[index].bmParentID;
	let bmindex = parseInt(parsedMarks[index].bmIndex,10);
    let bmtitle = parsedMarks[index].bmTitle;
    let bmtype = parsedMarks[index].bmType;
    let bmurl = parsedMarks[index].bmURL;

	if(mozilla === true) {
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

	bookmarkSync(false);

	if(mozilla === true) {
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
					logit({message: message + ' Re-adding the listeners now', type: 'info', source: 'importMarks'});
					bookmarkSync(false);
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
					logit({message: message + ' Re-adding the listeners now', type: 'info', source: 'importMarks'});
					bookmarkSync(true);
				}
			}
		);
		}
	}
}

function addAllMarks(parsedMarks, index=1) {
	bookmarkSync(false);
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
		} else {
			message = count + chrome.i18n.getMessage("successImportBookmarks");
			notify('info',message);
			logit({message: message, type: 'info', source: 'addAllMarks'});
			bookmarkSync(true);

			last_s = Date.now();
			chrome.storage.local.set({last_s: last_s});
		}
	});

}
