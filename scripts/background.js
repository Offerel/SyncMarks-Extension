const filename = "bookmarks.json";
var dictOldIDsToNewIDs = { "-1": "-1" };
var loglines = '';
var debug = false;
const abrowser = typeof InstallTrigger !== 'undefined';
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

function ccMenus() {
	chrome.permissions.getAll(function(e) {
		if(e.permissions.includes('contextMenus')) {
			chrome.contextMenus.removeAll();
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
								id: "smark",
								onclick: bookmarkTab
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
	});
}

function bookmarkTab() {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.storage.local.get(null, function(options) {
			if(options.actions.create === false) {				
				let jsonMark = encodeURIComponent(JSON.stringify({ 
					"id": Math.random().toString(24).substring(2, 12),
					"url": tabs[0].url,
					"title": tabs[0].title,
					"type": 'bookmark',
					"folder": (abrowser === true) ? 'unfiled_____':2,  
					"nfolder": 'More Bookmarks',
					"added": new Date().valueOf()
				}));
				
				let data = "client=bookmarkTab&caction=addmark&bookmark=" + jsonMark + "&s=false";
				var xhr = new XMLHttpRequest();
				xhr.open("POST", options['wdurl'], true);
				let tarr = {};
				tarr['client'] = options['s_uuid'];
				tarr['token'] = options['token'];
				if(tarr['token'] == '') return false;
				xhr.setRequestHeader('Authorization', 'Bearer ' + btoa(encodeURIComponent(JSON.stringify(tarr))));
				xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
				xhr.withCredentials = true;
				xhr.onload = function () {
					if( xhr.status < 200 || xhr.status > 226) {
						notify('error', xhr.response);
						loglines = logit("Error: " + xhr.response);
					} else {
						let response = JSON.parse(xhr.response);
						let xtResponse = xhr.getResponseHeader("X-Request-Info");
						if(xtResponse !== null) {
							if(xtResponse !== '0') {
								chrome.storage.local.set({token: xtResponse});
								callback(xtResponse);
							} else {
								chrome.storage.local.set({token: ''});
								let message = chrome.i18n.getMessage("optionsLoginError");
								notify('error', message);
							}
						}

						response = (response == "1") ? "'"+tabs[0].title+"' added":JSON.parse(xhr.response);
						notify('info', response);
						loglines = logit("Info: " + response);
					}
				}
				xhr.send(data);
			}
		});
	});
}

function sendTab(element) {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.storage.local.get(null, function(options) {
			let url = (element.target.url) ? element.target.url:tabs[0].url;
			var cdata = "client=" + options['s_uuid'] + "&caction=getpurl&url=" + encodeURIComponent(url) + "&tg=" + element.target.id;
			var xhr = new XMLHttpRequest();
			xhr.open("POST", options['wdurl'], true);
			let tarr = {};
			tarr['client'] = options['s_uuid'];
			tarr['token'] = options['token'];
			if(tarr['token'] == '') return false;
			xhr.setRequestHeader('Authorization', 'Bearer ' + btoa(encodeURIComponent(JSON.stringify(tarr))));
			xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
			xhr.withCredentials = true;
			xhr.onload = function () {
				if( xhr.status < 200 || xhr.status > 226) {
					var message = chrome.i18n.getMessage("sendLinkNot");
					notify('error',message);
					loglines = logit('Error: ' + message);
				} else {
					loglines = logit("Info: " + chrome.i18n.getMessage("sendLinkYes"));
					let xtResponse = xhr.getResponseHeader("X-Request-Info");

					if(xtResponse !== null) {
						if(xtResponse !== '0') {
							chrome.storage.local.set({token: xtResponse});
							callback(xtResponse);
						} else {
							chrome.storage.local.set({token: ''});
							let message = chrome.i18n.getMessage("optionsLoginError");
							notify('error', message);
						}
					}
				}
			}
			loglines = logit("Info: " + chrome.i18n.getMessage("sendLinkYes") + ", Client: " + options['s_uuid']);
			xhr.send(cdata);
		});
	});
}

function logit(message) {
	var ndate = new Date();
	var logline = loglines + ndate.toLocaleString() + " - " + message + "\n";
	if(message.toString().toLowerCase().indexOf('error') >= 0 && message.toString().toLowerCase().indexOf('TypeError') <= 0)
		notify('error',message);
	//	console.warn(message);
	return logline;
}

function get_oMarks() {
	chrome.permissions.getAll(function(e) {
		if(e.permissions.includes('bookmarks')) {
			chrome.bookmarks.getTree(function(results) { oMarks = results; });
		}
	});
}

function findByID(oMarks, id) {
    if(oMarks === null || typeof oMarks === "undefined") return null;
    for (var i = 0; i < oMarks.length; i++) {
        if(oMarks[i].id === id) return oMarks[i];
        var child = findByID(oMarks[i].children, id);
        if(child !== null) return child;
    }
    return null;
}

function init() {
	loglines = logit("Info: AddOn version: "+chrome.runtime.getManifest().version);
	loglines = logit("Info: "+navigator.userAgent);
	chrome.runtime.getPlatformInfo(function(info){
		loglines = logit("Info: Current architecture: "+info.arch+" | Current OS: "+info.os);
	});
	get_oMarks();
	chrome.storage.local.set({last_message: ""});
	chrome.storage.local.get(null, function(options) {
		if(options['wdurl'] === undefined) return false;
		if(options.actions.crsrv === true) {
			chrome.commands.getAll((commands) => {
				for (let {name, shortcut} of commands) {
					var s = (name === 'bookmark-tab') ? shortcut:'undef';
				}

				chrome.browserAction.setTitle({title: chrome.i18n.getMessage("bookmarkTab") + ` (${s})`});
				chrome.browserAction.setPopup({popup: ''});
				chrome.browserAction.onClicked.addListener(function() {
					bookmarkTab();
				});

			});
		}
		
		let s_startup = options['actions']['startup'] || false;
		let s_type = options['s_type'] || "";

		if( s_startup === true && s_type.indexOf('PHP') == -1) {
			loglines = logit("Info: Initiate WebDAV startup sync");
			if(options['wdurl']) getDAVMarks();
		} else if(s_type.indexOf('PHP') == 0) {
			if(s_startup === true) {
				loglines = logit("Info: Initiate startup sync");
				checkFullSync();
			}

			if(options['wdurl']) {
				ccMenus();
				getClientList();
				getNotifications();
			}
		}
	});
}

function getNotifications() {
	loglines = logit("Info: Get notifications for current client.");
	chrome.storage.local.get(null, function(options) {
		let data = "client=" + options['s_uuid'] + "&caction=gurls&s=" + options['actions']['startup'];
		let xhr = new XMLHttpRequest();
		xhr.open("POST", options['wdurl'], false);
		let tarr = {};
		tarr['client'] = options['s_uuid'];
		tarr['token'] = options['token'];
		if(tarr['token'] == '') return false;
		xhr.setRequestHeader('Authorization', 'Bearer ' + btoa(encodeURIComponent(JSON.stringify(tarr))));
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		
		xhr.withCredentials = true;
		xhr.onload = function () {
			if( xhr.status < 200 || xhr.status > 226) {
				message = "Get list of notifications failed. State: " + xhr.status;
				notify('error',message);
				loglines = logit('Error: '+message);
			} else {
				let xtResponse = xhr.getResponseHeader("X-Request-Info");
				if(xtResponse !== null) {
					if(xtResponse !== '0') {
						chrome.storage.local.set({token: xtResponse});
						callback(xtResponse);
					} else {
						chrome.storage.local.set({token: ''});
						let message = chrome.i18n.getMessage("optionsLoginError");
						notify('error', message);
					}
				}

				if(xhr.responseText.length > 2) {
					var nData = JSON.parse(xhr.responseText);
					if(Array.isArray(nData)) {
						try {
							nData.forEach(function(notification) {
								loglines = logit('Info: Received tab: <a href="' + notification.url + '">' + notification.url + '</a>');
								openTab(notification.url,notification.nkey,notification.title);
							});
						} catch(error) {
							loglines = logit(error);
						}
						loglines = logit("Info: List of " + nData.length + " notifications retrieved successful.");
					}
				}
			}
		}
		xhr.send(data);
	});
}

function onTabActivated(tab){
	pTabs.forEach(function(pTab, index){
		if(pTab.tID == tab.tabId) {
			dmNoti(pTab.nID);
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

function getClientList() {
	loglines = logit("Info: Get list of clients.");
	chrome.storage.local.get(null, function(options) {
		let data = "client=" + options['s_uuid'] + "&caction=getclients&s="+options['actions']['startup'];
		let xhr = new XMLHttpRequest();
		xhr.open("POST", options['wdurl'], false);
		let tarr = {};
		tarr['client'] = options['s_uuid'];
		tarr['token'] = options['token'];
		if(tarr['token'] == '') return false;
		xhr.setRequestHeader('Authorization', 'Bearer ' + btoa(encodeURIComponent(JSON.stringify(tarr))));
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

		xhr.withCredentials = true;
		xhr.onload = function () {
			if( xhr.status < 200 || xhr.status > 226) {
				message = "Get list of clients failed. State: "+xhr.status;
				notify('error',message);
				loglines = logit('Error: '+message);
			} else {
				let xtResponse = xhr.getResponseHeader("X-Request-Info");
				if(xtResponse !== null) {
					if(xtResponse !== '0') {
						chrome.storage.local.set({token: xtResponse});
						callback(xtResponse);
					} else {
						chrome.storage.local.set({token: ''});
						let message = chrome.i18n.getMessage("optionsLoginError");
						notify('error', message);
					}
				}

				cData = JSON.parse(xhr.responseText);
				
				chrome.storage.local.set({clist:cData});		
				
				chrome.permissions.getAll(function(e) {
					if(e.permissions.includes('contextMenus')) {
						if(Array.isArray(cData)) {
							cData.forEach(function(client){
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
							let cnt = cData.length - 1;
							loglines = logit("Info: List of " + cnt + " clients retrieved successful.");
						}
					}
				});
			}
		}
		xhr.send(data);
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

function dmNoti(nkey) {
	chrome.storage.local.get(null, function(options) {
		let xhr = new XMLHttpRequest();
		let data = "client=" + options['s_uuid'] + "&caction=durl&durl="+nkey;
		xhr.open("POST", options['wdurl'], true);
		let tarr = {};
		tarr['client'] = options['s_uuid'];
		tarr['token'] = options['token'];
		if(tarr['token'] == '') return false;
		xhr.setRequestHeader('Authorization', 'Bearer ' + btoa(encodeURIComponent(JSON.stringify(tarr))));
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		xhr.withCredentials = true;
		xhr.onload = function () {
			if( xhr.status < 200 || xhr.status > 226) {
				message = "Dismiss notification "+nkey+".";
				notify('error',message);
				loglines = logit('Error: '+message);
			} else {
				let xtResponse = xhr.getResponseHeader("X-Request-Info");
				if(xtResponse !== null) {
					if(xtResponse !== '0') {
						chrome.storage.local.set({token: xtResponse});
						callback(xtResponse);
					} else {
						chrome.storage.local.set({token: ''});
						let message = chrome.i18n.getMessage("optionsLoginError");
						notify('error', message);
					}
				}
			}
		}
		xhr.send(data);
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
	chrome.storage.local.get(null, function(options) {
		var s_change = options['actions']['change'] || false;
		var s_type = options['s_type'] || "";
		
		if(s_change === true && s_type.indexOf('PHP') == -1) {
			saveAllMarks();
		}
		else if(s_change === true && s_type.indexOf('PHP') == 0) {
			moveMark(id, bookmark);
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
		}
		else if(s_change === true && s_type.indexOf('PHP') == 0) {
			editMark(changeInfo,id);
		}
	});
}

function editMark(eData,id) {
	chrome.bookmarks.get(id, function(bmark) {
		let jsonMark = encodeURIComponent(JSON.stringify({ "url": eData.url,"title": eData.title,"parentId": bmark[0].parentId,"index": bmark[0].index }));
		chrome.storage.local.get(null, function(options) {
			var s_uuid = options['s_uuid'];
			let cdata = "client="+s_uuid+"&caction=editmark&bookmark="+jsonMark;
			var xhr = new XMLHttpRequest();
			xhr.open("POST", options['wdurl'], true);
			let tarr = {};
			tarr['client'] = options['s_uuid'];
			tarr['token'] = options['token'];
			if(tarr['token'] == '') return false;
			xhr.setRequestHeader('Authorization', 'Bearer ' + btoa(encodeURIComponent(JSON.stringify(tarr))));
			xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
			xhr.withCredentials = true;
			xhr.onload = function () {
				if( xhr.status < 200 || xhr.status > 226) {
					message = chrome.i18n.getMessage("errorEditBookmark") + xhr.status;
					notify('error', message);
					chrome.browserAction.setTitle({title: date.toLocaleDateString(undefined,doptions) + ": " + chrome.i18n.getMessage("errorEditBookmark")});
					loglines = logit('Error: '+message);
				} else {
					let xtResponse = xhr.getResponseHeader("X-Request-Info");
					if(xtResponse !== null) {
						if(xtResponse !== '0') {
							chrome.storage.local.set({token: xtResponse});
							callback(xtResponse);
						} else {
							chrome.storage.local.set({token: ''});
							let message = chrome.i18n.getMessage("optionsLoginError");
							notify('error', message);
						}
					}

					let response = JSON.parse(xhr.responseText);
					if(response == 1) {
							loglines = logit("Info: Bookmark edited successfully at the server");
							chrome.browserAction.setTitle({title: date.toLocaleDateString(undefined,doptions) + ": Bookmark edited."});
					}
						else {
							message = "Error: Bookmark not edited at the server, please check the server logfile.";
							loglines = logit(message);
							notify('error',message);
							chrome.browserAction.setTitle({title: date.toLocaleDateString(undefined,doptions) + ": " + chrome.i18n.getMessage("errorEditBookmark")});
						}
				}
			}
			loglines = logit("Info: Sending edit request to server. URL: "+ eData.url +", Client: "+s_uuid);
			xhr.send(cdata);
		})
		
		let datems = Date.now();
		let date = new Date(datems);
		let doptions = { weekday: 'short',  hour: '2-digit', minute: '2-digit' };
		chrome.storage.local.set({last_s: datems});
	});
}

function onRemovedCheck(id, bookmark) {
	chrome.storage.local.get(null, function(options) {
		var s_remove = options['actions']['remove'] || false;
		var s_type = options['s_type'] || "";
		
		if(s_remove === true  && s_type.indexOf('PHP') == -1) {
			chrome.bookmarks.onRemoved.removeListener(onRemovedCheck);
			saveAllMarks();
		}
		else if(s_remove === true  && s_type.indexOf('PHP') == 0) {
			delMark(id, bookmark);
			get_oMarks();
		}
	});
}

function exportPHPMarks(upl=[]) {
	loglines = logit("Info: Send  new local bookmarks to server");
	let bookmarks = '';
	let p = 0;
	chrome.bookmarks.getTree(function(bookmarkItems) {
		if(upl.length === 0) {
			bookmarks = encodeURIComponent(JSON.stringify(bookmarkItems));
			p = 0;
		} else {
			bookmarks = encodeURIComponent(JSON.stringify(upl));
			p = 1;
		}

		chrome.storage.local.get(null, function(options) {
			if(!("s_uuid" in options)) {
				var s_uuid = uuidv4();
				chrome.storage.local.set({s_uuid: s_uuid});
			}
			else {
				var s_uuid = options['s_uuid'];
			}

			let cdata = 'client='+s_uuid+'&caction=import&bookmark='+bookmarks+"&p="+p+"&s="+options['actions']['startup'];
			let xhr = new XMLHttpRequest();
			xhr.open("POST", options['wdurl'], true);
			let tarr = {};
			tarr['client'] = options['s_uuid'];
			tarr['token'] = options['token'];
			if(tarr['token'] == '') return false;
			xhr.setRequestHeader('Authorization', 'Bearer ' + btoa(encodeURIComponent(JSON.stringify(tarr))));
			xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
			xhr.withCredentials = true;
			xhr.onload = function () {
				if( xhr.status < 200 || xhr.status > 226) {
					message = chrome.i18n.getMessage("errorSaveBookmarks") + xhr.status;
					notify('error',message);
					loglines = logit("Error: "+message);
				} else {
					let xtResponse = xhr.getResponseHeader("X-Request-Info");
					if(xtResponse !== null) {
						if(xtResponse !== '0') {
							chrome.storage.local.set({token: xtResponse});
							callback(xtResponse);
						} else {
							chrome.storage.local.set({token: ''});
							let message = chrome.i18n.getMessage("optionsLoginError");
							notify('error', message);
						}
					}

					let response = JSON.parse(xhr.responseText);
					if(response == 1) {
						message = chrome.i18n.getMessage("successExportBookmarks");
						if(p == 1) notify('info',message);
						loglines = logit("Info: "+message);
					}
					else {
						message = chrome.i18n.getMessage("errorExportBookmarks");
						if(p == 1) notify('error',message + ": " + response);
						loglines = logit("Error: "+ message + " " + response);
					}
				}
			}
			xhr.send(cdata);
		})
	});
	
	let datems = Date.now();
	let date = new Date(datems);
	let doptions = { weekday: 'short',  hour: '2-digit', minute: '2-digit' };
	chrome.browserAction.setTitle({title: chrome.i18n.getMessage("extensionName") + ": " + date.toLocaleDateString(undefined,doptions)});
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
	chrome.browserAction.setTitle({title: chrome.i18n.getMessage("extensionName") + ": " + date.toLocaleDateString(undefined,doptions)});
}

function delMark(id, bookmark) {
	var oldMark = findByID(oMarks, id);
	var jsonMark = encodeURIComponent(JSON.stringify({ "url": bookmark.node.url,"folder": bookmark.node.parentId,"index": bookmark.node.index,"type": bookmark.node.type,"id": id,"title": oldMark.title }));
	chrome.storage.local.get(null, function(options) {
		if(!("s_uuid" in options)) {
			var s_uuid = uuidv4();
			chrome.storage.local.set({s_uuid: s_uuid});
		}
		else {
			var s_uuid = options['s_uuid'];
		}
		let cdata = "client="+s_uuid+"&caction=delmark&bookmark="+jsonMark;
		var xhr = new XMLHttpRequest();
		xhr.open("POST", options['wdurl'], true);
		let tarr = {};
		tarr['client'] = options['s_uuid'];
		tarr['token'] = options['token'];
		if(tarr['token'] == '') return false;
		xhr.setRequestHeader('Authorization', 'Bearer ' + btoa(encodeURIComponent(JSON.stringify(tarr))));
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		xhr.withCredentials = true;
		xhr.onload = function () {
			if( xhr.status < 200 || xhr.status > 226) {
				message = chrome.i18n.getMessage("errorRemoveBookmark") + xhr.status;
				notify('error',message);
				chrome.browserAction.setTitle({title: date.toLocaleDateString(undefined,doptions) + ": " + chrome.i18n.getMessage("errorRemoveBookmark")});
				loglines = logit('Error: '+message);
			} else {
				let xtResponse = xhr.getResponseHeader("X-Request-Info");
				if(xtResponse !== null) {
					if(xtResponse !== '0') {
						chrome.storage.local.set({token: xtResponse});
						callback(xtResponse);
					} else {
						chrome.storage.local.set({token: ''});
						let message = chrome.i18n.getMessage("optionsLoginError");
						notify('error', message);
					}
				}

				let response = JSON.parse(xhr.responseText);
				if(response == 1) {
						loglines = logit("Info: Bookmark removed at the server");
						chrome.browserAction.setTitle({title: date.toLocaleDateString(undefined,doptions) + ": Bookmark removed."});
				}
					else {
						loglines = logit("Error: Bookmark not removed at the server, please check the server logfile");
						chrome.browserAction.setTitle({title: date.toLocaleDateString(undefined,doptions) + ": " + chrome.i18n.getMessage("errorRemoveBookmark")});
					}
			}
		}
		loglines = logit("Info: Sending remove request to server: <a href='"+bookmark.node.url+"'>"+bookmark.node.url+"</a>");
		xhr.send(cdata);
	})
	
	let datems = Date.now();
	let date = new Date(datems);
	let doptions = { weekday: 'short',  hour: '2-digit', minute: '2-digit' };
	chrome.storage.local.set({last_s: datems});
}

function moveMark(id, bookmark) {
	chrome.storage.local.get(null, function(options) {
		chrome.bookmarks.get(bookmark.parentId, function(folder) {
			chrome.bookmarks.get(id, function(bmark) {
				if(!("s_uuid" in options)) {
					var s_uuid = uuidv4();
					chrome.storage.local.set({s_uuid: s_uuid});
				}
				else {
					var s_uuid = options['s_uuid'];
				}
				
				let jsonMark = encodeURIComponent(JSON.stringify({ "id": id, "index": bookmark.index, "folderIndex": folder[0]['index'],"folder": bookmark.parentId,"nfolder": folder[0]['title'],"url":bmark[0].url }));
				let cdata = "client="+s_uuid+"&caction=movemark&bookmark="+jsonMark+"&s="+options['actions']['startup'];
				var xhr = new XMLHttpRequest();
				xhr.open("POST", options['wdurl'], true);
				let tarr = {};
				tarr['client'] = options['s_uuid'];
				tarr['token'] = options['token'];
				if(tarr['token'] == '') return false;
				xhr.setRequestHeader('Authorization', 'Bearer ' + btoa(encodeURIComponent(JSON.stringify(tarr))));
				xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
				xhr.withCredentials = true;
				xhr.onload = function () {
					if( xhr.status < 200 || xhr.status > 226) {
						message = chrome.i18n.getMessage("errorMoveBookmark") + xhr.status;
						notify('error',message);
						loglines = logit('Error: '+message);
					} else {
						let xtResponse = xhr.getResponseHeader("X-Request-Info");
						if(xtResponse !== null) {
							if(xtResponse !== '0') {
								chrome.storage.local.set({token: xtResponse});
								callback(xtResponse);
							} else {
								chrome.storage.local.set({token: ''});
								let message = chrome.i18n.getMessage("optionsLoginError");
								notify('error', message);
							}
						}

						let response = JSON.parse(xhr.responseText);
						if(response == 1)
								loglines = logit("Info: Bookmark moved successfully at the server");
							else
								loglines = logit("Error: Bookmark not moved at the server, response from server is: "+response);
					}
				}
				loglines = logit("Info: Sending move request to server. Bookmark ID: "+id);
				xhr.send(cdata);
			});
		});
	});
	
	let datems = Date.now();
	let date = new Date(datems);
	let doptions = { weekday: 'short',  hour: '2-digit', minute: '2-digit' };
	chrome.storage.local.set({last_s: datems});
	chrome.browserAction.setTitle({title: chrome.i18n.getMessage("extensionName") + ": " + date.toLocaleDateString(undefined,doptions)});
}

function sendMark(bookmark) {
	if(!("type" in bookmark) && !("url" in bookmark)) {
		bookmark.type = "folder";
	}
	else if(!("type" in bookmark) && ("url" in bookmark)) {
		bookmark.type = "bookmark";
	}

	chrome.bookmarks.get(bookmark.parentId, function(bmark) {
		let jsonMark = encodeURIComponent(JSON.stringify({ 
			"id": bookmark.id,
			"url": bookmark.url,
			"title": bookmark.title,
			"type": bookmark.type,
			"folder": bookmark.parentId,
			"nfolder": bmark[0].title,
			"added": bookmark.dateAdded
		}));

		chrome.storage.local.get(null, function(options) {
			if(!("s_uuid" in options)) {
				var s_uuid = uuidv4();
				chrome.storage.local.set({s_uuid: s_uuid});
			} else {
				var s_uuid = options['s_uuid'];
			}
			let cdata = "client="+s_uuid+"&caction=addmark&bookmark="+jsonMark+"&s="+options['actions']['startup'];
			var xhr = new XMLHttpRequest();
			xhr.open("POST", options['wdurl'], true);
			let tarr = {};
			tarr['client'] = options['s_uuid'];
			tarr['token'] = options['token'];
			if(tarr['token'] == '') return false;
			xhr.setRequestHeader('Authorization', 'Bearer ' + btoa(encodeURIComponent(JSON.stringify(tarr))));
			xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
			xhr.withCredentials = true;
			xhr.onload = function () {
				if( xhr.status < 200 || xhr.status > 226) {
					message = chrome.i18n.getMessage("errorSaveSingleBookmarks")  + xhr.status;
					notify('error',message);
					loglines = logit('Error: '+message);
				} else {
					let xtResponse = xhr.getResponseHeader("X-Request-Info");
					if(xtResponse !== null) {
						if(xtResponse !== '0') {
							chrome.storage.local.set({token: xtResponse});
							callback(xtResponse);
						} else {
							chrome.storage.local.set({token: ''});
							let message = chrome.i18n.getMessage("optionsLoginError");
							notify('error', message);
						}
					}

					let response = JSON.parse(xhr.responseText);
					if(response == 1)
							loglines = logit("Info: Bookmark added successfully at the server");
						else
							loglines = logit("Error: "+response);
				}
			}
			loglines = logit("Info: Sending add request to server. <a href='"+bookmark.url+"'>"+bookmark.url+"</a>");
			xhr.send(cdata);
		});
	});
	
	let datems = Date.now();
	let date = new Date(datems);
	let doptions = { weekday: 'short',  hour: '2-digit', minute: '2-digit' };
	chrome.storage.local.set({last_s: datems});
	
	chrome.browserAction.setTitle({title: chrome.i18n.getMessage("extensionName") + ": " + date.toLocaleDateString(undefined,doptions)});
}

function saveDAVMarks(bookmarkItems) {
	chrome.bookmarks.onRemoved.removeListener(onRemovedCheck);
	chrome.storage.local.get(null, function(options) {
		var bookmarks = JSON.stringify(bookmarkItems);
		var xhr = new XMLHttpRequest();
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
}

function getPHPMarks() {
	chrome.storage.local.get(null, function(options) {
		if(!("s_uuid" in options)) {
			var s_uuid = uuidv4();
			chrome.storage.local.set({s_uuid: s_uuid});
		}
		else {
			var s_uuid = options['s_uuid'];
		}
		let xhr = new XMLHttpRequest();
		let params = 'client='+s_uuid+'&caction=startup&s='+options['actions']['startup'];
		xhr.open('POST', options['wdurl'] + '?t=' + Math.random(), true);
		xhr.withCredentials = true;
		let tarr = {};
		tarr['client'] = options['s_uuid'];
		tarr['token'] = options['token'];
		if(tarr['token'] == '') return false;
		xhr.setRequestHeader('Authorization', 'Bearer ' + btoa(encodeURIComponent(JSON.stringify(tarr))));
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		
		xhr.onload = function () {
			let datems = Date.now();
			let date = new Date(datems);
			let doptions = { weekday: 'short',  hour: '2-digit', minute: '2-digit' };
			chrome.browserAction.setTitle({title: chrome.i18n.getMessage("extensionName") + ": " + date.toLocaleDateString(undefined,doptions)});
			if( xhr.status != 200 ) {
				message = chrome.i18n.getMessage("errorGetBookmarks") + xhr.status;
				notify('error',message);
				loglines = logit('Error: '+message);
			} else {
				let xtResponse = xhr.getResponseHeader("X-Request-Info");
				if(xtResponse !== null) {
					if(xtResponse !== '0') {
						chrome.storage.local.set({token: xtResponse});
						callback(xtResponse);
					} else {
						chrome.storage.local.set({token: ''});
						let message = chrome.i18n.getMessage("optionsLoginError");
						notify('error', message);
					}
				}

				response = (xhr.responseText);
				if(abrowser == false) response = c2cm(response);
				let PHPMarks = JSON.parse(response);
				if(PHPMarks.includes('New client registered')) {
					message = chrome.i18n.getMessage("infoNewClient");
					notify('info',message);
					loglines = logit('Info: '+message);
				} else if(PHPMarks.includes('No bookmarks added')) {
					message = chrome.i18n.getMessage("infoNoChange");
					loglines = logit("Info: "+message);
					chrome.storage.local.set({last_message: message});
				} else {
					message = PHPMarks.length + chrome.i18n.getMessage("infoChanges");
					loglines = logit(message);
					abrowser ? addPHPMarks(PHPMarks) : addPHPcMarks(PHPMarks);
					chrome.storage.local.set({last_message: message});
				}		
			}
		}
		loglines = logit("Info: Initiate startup sync");
		xhr.send(params);
	});
}

function checkFullSync() {
	chrome.storage.local.get(null, function(options) {
		let xhr = new XMLHttpRequest();
		let params = 'client=' + options['s_uuid'] + '&caction=cinfo';
		xhr.open('POST', options['wdurl'] + '?t=' + Math.random(), false);
		xhr.withCredentials = true;
		let tarr = {};
		tarr['client'] = options['s_uuid'];
		tarr['token'] = options['token'];
		if(tarr['token'] == '') return false;
		xhr.setRequestHeader('Authorization', 'Bearer ' + btoa(encodeURIComponent(JSON.stringify(tarr))));
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		xhr.onload = function () {
			if( xhr.status < 200 || xhr.status > 226) {
				let message = 'FullSync Check failed';
				notify('error', message);
				loglines = logit('Error: ' + message);
			} else {
				let rp = xhr.responseText;
				let cinfo = JSON.parse(rp);
				let xtResponse = xhr.getResponseHeader("X-Request-Info");
				if(xtResponse !== null) {
					if(xtResponse !== '0') {
						chrome.storage.local.set({token: xtResponse});
						callback(xtResponse);
						lastseen = cinfo['lastseen'];
						doFullSync();
					} else {
						let message = chrome.i18n.getMessage("optionsLoginError");
						chrome.storage.local.set({token: ''});
						notify('error', message);
					}
				}
			}
		}
		xhr.send(params);
	});
}

function doFullSync() {
	loglines = logit("Info: Sync started.");
	try {
		chrome.storage.local.get(null, function(options) {
			if(options['s_type'] == 'PHP') {
				getAllPHPMarks(true);
			}
		});
	} catch(error) {
		loglines = logit(error);
	} finally {
		chrome.storage.local.set({last_s: 1});
	}
}

function getAllPHPMarks() {
	chrome.storage.local.get(null, function(options) {
		let xhr = new XMLHttpRequest();
		let params = 'client='+options['s_uuid']+'&caction=export&type=json&s='+options['actions']['startup'];
		xhr.open('POST', options['wdurl'] + '?t=' + Math.random(), true);
		xhr.withCredentials = true;
		let tarr = {};
		tarr['client'] = options['s_uuid'];
		tarr['token'] = options['token'];
		if(tarr['token'] == '') return false;
		xhr.setRequestHeader('Authorization', 'Bearer ' + btoa(encodeURIComponent(JSON.stringify(tarr))));
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		xhr.onload = function () {
			if( xhr.status != 200 ) {
				message = chrome.i18n.getMessage("errorGetBookmarks") + xhr.status;
				notify('error',message);
				loglines = logit('Error: ' + message);
			} else {
				let response = xhr.responseText;
				let xtResponse = xhr.getResponseHeader("X-Request-Info");
				if(xtResponse !== null) {
					if(xtResponse !== '0') {
						chrome.storage.local.set({token: xtResponse});
						callback(xtResponse);
					} else {
						chrome.storage.local.set({token: ''});
						let message = chrome.i18n.getMessage("optionsLoginError");
						notify('error', message);
					}
				}
				if(abrowser == false) response = c2cm(response);
				let PHPMarks = JSON.parse(response);
				count = 0;
				loglines = logit('Info: Bookmarks retrieved from server');
				importFull(PHPMarks);
			}

			let date = new Date(Date.now());
			let doptions = { weekday: 'short',  hour: '2-digit', minute: '2-digit' };
			chrome.browserAction.setTitle({title: chrome.i18n.getMessage("extensionName") + ": " + date.toLocaleDateString(undefined,doptions)});
			}
		loglines = logit('Info: Sending Sync request to server');
		xhr.send(params);
	});
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
				action = 0;
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
			remoteParentFolderName = rMarks.filter(element => element.bmID == searchedID)[0].bmTitle;		
			localParentId = (await searchBookmarkAsync({title: remoteParentFolderName}))[0].id;
		}

		let rMark = {};

		if(abrowser) {
			rMark.index = parseInt(remoteMark.bmIndex);
			rMark.parentId = localParentId;
			rMark.title = remoteMark.bmTitle;
			rMark.url = remoteMark.bmURL;
			rMark.type = remoteMark.bmType;
		} else {
			rMark.index = parseInt(remoteMark.bmIndex);
			rMark.parentId = localParentId;
			rMark.title = remoteMark.bmTitle;
			rMark.url = remoteMark.bmURL;
		}

		let newMark = (await createBookmarkAsync(rMark));
		let cNewMark = newMark;

		if(typeof cNewMark.url === 'undefined') {
			let oldID = remoteMark.bmID;
			let newID = cNewMark.id;

			rMarks.forEach(async function(cmark, index){
				if(rMarks[index].bmParentID === oldID) rMarks[index].bmParentID = newID;
				if(rMarks[index].bmID === oldID) rMarks[index].bmID = newID;
			});
		}
		
	}

	async function iMoveMark(remoteMark) {
		console.log(remoteMark);

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

		/*
		if(typeof remoteMark.bmURL !== 'undefined') {
			let localMark = (await searchBookmarkAsync({url: remoteMark.bmURL}))[0];
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
		*/
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
				//console.log('ignore action: ' + action);
				break;
			case 1:
				await createMark(remoteMark);
				break;
			case 2:
				await iMoveMark(remoteMark);
				break;
			default:
				//console.log('unknown action: ' + action);
				break;
		}
		
	}

	dMarks.forEach(lmark => {
		if (lmark.id.endsWith('_____') || lmark.id-length < 2) {
			// 
		} else if (lmark.dateAdded >= lastseen) {
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

async function addPHPcMarks(bArray) {
	var bArrayT = bArray;
	for (let bIndex = 0; bIndex < bArray.length; bIndex++) {
		switch(bArrayT[bIndex].bmAction) {
			case 1:	
				var url = bArrayT[bIndex].bmURL;
				loglines = logit('Info: Delete: ' + url);
				if(url.startsWith("http")) {
					if(url != null) {
						chrome.bookmarks.search({url: bArrayT[bIndex].bmURL}, function(removeItems) {
							removeItems.forEach(function(removeBookmark) {
								chrome.bookmarks.onRemoved.removeListener(onRemovedCheck);
								chrome.bookmarks.remove(removeBookmark.id, function(removeB) {
									chrome.bookmarks.onRemoved.addListener(onRemovedCheck);
								});
							});
						});
					} else {
						chrome.bookmarks.search({title: bArrayT[bIndex].bmTitle}, function(removeFolder) {
							if(removeFolder.length == 1) {
								chrome.bookmarks.onRemoved.removeListener(onRemovedCheck);
								chrome.bookmarks.remove(removeFolder.id, function(removeF) {
									chrome.bookmarks.onRemoved.addListener(onRemovedCheck);
								});
							} else if(removeFolder.length > 1) {
								for (let fIndex = 0; fIndex < removeFolder.length; fIndex++) {
									if(removeFolder[fIndex].index == bArrayT[bIndex].bmIndex) {
										chrome.bookmarks.remove(removeFolder[fIndex].id, function(removeB) {
											chrome.bookmarks.onRemoved.addListener(onRemovedCheck);
										});
									}
								}
							}
						});
					}
				}
				break;
			case 2: 
				loglines = logit('Info: Move: ' + bArrayT[bIndex].bmURL);
				chrome.bookmarks.search({url: bArrayT[bIndex].bmURL},function(bookmarkItems) {
					if (bookmarkItems.length) {
						if (bArrayT[bIndex].fdName != bookmarkItems[0].parentId) {
							chrome.bookmarks.onMoved.removeListener(onMovedCheck);
							chrome.bookmarks.move(bookmarkItems[0].id, {parentId: bArrayT[bIndex].fdID}, function(move) {
								chrome.bookmarks.onMoved.addListener(onMovedCheck);
							});
						}
					}
				});
				break;
			default: 
				loglines = logit('Info: Add: ' + bArrayT[bIndex].bmURL);
				var newId = "";
				if(!bArrayT[bIndex].fdID.length == 1) {
					chrome.bookmarks.search({title: bArrayT[bIndex].fdName}, async function(pFolder) {
						if(pFolder.length == 1 && pFolder[0].url != null) {
							chrome.bookmarks.onCreated.removeListener(onCreatedCheck);
							newId = (await createBookmarkAsync({parentId: pFolder[0].id, title: bArrayT[bIndex].bmTitle, url: bArrayT[bIndex].bmURL})).id;
							chrome.bookmarks.onCreated.addListener(onCreatedCheck);
						} else if(pFolder.length > 1) {
							for(pIndex = 0; pIndex < pFolder.length; pIndex++) {
								if(pFolder[pIndex].index == bArrayT[bIndex].bmIndex) {
									chrome.bookmarks.onCreated.removeListener(onCreatedCheck);
									newId = (await createBookmarkAsync({parentId: pFolder[0].id, title: bArrayT[bIndex].bmTitle, url: bArrayT[bIndex].bmURL})).id;
									chrome.bookmarks.onCreated.addListener(onCreatedCheck);
								}
							}
						} else {
							chrome.bookmarks.onCreated.removeListener(onCreatedCheck);
							newId = (await createBookmarkAsync({parentId: '2', title: bArrayT[bIndex].bmTitle, url: bArrayT[bIndex].bmURL})).id;
							chrome.bookmarks.onCreated.addListener(onCreatedCheck);
						}
					});
				} else {
					chrome.bookmarks.onCreated.removeListener(onCreatedCheck);
					newId = (await createBookmarkAsync({parentId: bArrayT[bIndex].fdID, title: bArrayT[bIndex].bmTitle, url: bArrayT[bIndex].bmURL})).id;
					chrome.bookmarks.onCreated.addListener(onCreatedCheck);
				}
		}
	}
}

async function addPHPMarks(bArray) {
	var bArrayT = bArray;
	for (let bIndex = 0; bIndex < bArray.length; bIndex++) {
		switch(bArrayT[bIndex].bmAction) {
			case "1":
				var url = bArrayT[bIndex].bmURL;
				loglines = logit('Info: Delete: ' + url);
				if(url.startsWith("http")) {
					if(bArrayT[bIndex].bmURL != null) {
						chrome.bookmarks.search({url: url}, function(removeItems) {
							removeItems.forEach(function(removeBookmark) {
								chrome.bookmarks.onRemoved.removeListener(onRemovedCheck);
								chrome.bookmarks.remove(removeBookmark.id, function(removeB) {chrome.bookmarks.onRemoved.addListener(onRemovedCheck);});
							});
						});
					} else {
						chrome.bookmarks.search({title: bArrayT[bIndex].bmTitle}, function(removeFolder) {
							if(removeFolder.length == 1) {
								chrome.bookmarks.onRemoved.removeListener(onRemovedCheck);
								chrome.bookmarks.remove(removeFolder.id, function(removeF) {
									chrome.bookmarks.onRemoved.addListener(onRemovedCheck);
								});
							} else if(removeFolder.length > 1) {
								for (let fIndex = 0; fIndex < removeFolder.length; fIndex++) {
									if(removeFolder[fIndex].index == bArrayT[bIndex].bmIndex) {
										chrome.bookmarks.remove(removeFolder[fIndex].id, function(removeB) {
											chrome.bookmarks.onRemoved.addListener(onRemovedCheck);
										});
									}
								}
							}
						});
					}
				}
				break;
			case "2": 
				loglines = logit('Info: Move: ' + bArrayT[bIndex].bmURL);
				chrome.bookmarks.search({url: bArrayT[bIndex].bmURL},function(bookmarkItems) {
					if (bookmarkItems.length) {
						if (bArrayT[bIndex].fdName != bookmarkItems[0].parentId) {
							chrome.bookmarks.onMoved.removeListener(onMovedCheck);
							chrome.bookmarks.move(bookmarkItems[0].id, {parentId: bArrayT[bIndex].fdID}, function(move) {
								chrome.bookmarks.onMoved.addListener(onMovedCheck);
							});
						}
					}
				});
				break;
			default: 
				loglines = logit('Info: Add: ' + bArrayT[bIndex].bmURL);
				var newId = "";
				chrome.bookmarks.onCreated.removeListener(onCreatedCheck);
				if(!bArrayT[bIndex].fdID.endsWith('_____')) {
					chrome.bookmarks.search({title: bArrayT[bIndex].fdName}, async function(pFolder) {
						if(pFolder.length == 1 && pFolder[0].type == 'folder') {
							chrome.bookmarks.onCreated.removeListener(onCreatedCheck);
							newId = (await createBookmarkAsync({type: bArrayT[bIndex].bmType, parentId: pFolder[0].id, title: bArrayT[bIndex].bmTitle, url: bArrayT[bIndex].bmURL})).id;
							chrome.bookmarks.onCreated.addListener(onCreatedCheck);
						} else if(pFolder.length > 1) {
							for(pIndex = 0; pIndex < pFolder.length; pIndex++) {
								if(pFolder[pIndex].index == bArrayT[bIndex].bmIndex) {
									chrome.bookmarks.onCreated.removeListener(onCreatedCheck);
									newId = (await createBookmarkAsync({type: bArrayT[bIndex].bmType, parentId: pFolder[0].id, title: bArrayT[bIndex].bmTitle, url: bArrayT[bIndex].bmURL})).id;
									chrome.bookmarks.onCreated.addListener(onCreatedCheck);
								}
							}
						} else {
							chrome.bookmarks.onCreated.removeListener(onCreatedCheck);
							newId = (await createBookmarkAsync({type: bArrayT[bIndex].bmType, parentId: 'unfiled_____', title: bArrayT[bIndex].bmTitle, url: bArrayT[bIndex].bmURL})).id;
							chrome.bookmarks.onCreated.addListener(onCreatedCheck);
						}
					});
				} else {
					chrome.bookmarks.onCreated.removeListener(onCreatedCheck);
					newId = (await createBookmarkAsync({type: bArrayT[bIndex].bmType, parentId: bArrayT[bIndex].fdID, title: bArrayT[bIndex].bmTitle, url: bArrayT[bIndex].bmURL})).id;
					chrome.bookmarks.onCreated.addListener(onCreatedCheck);
				}
		}
	}
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
			chrome.browserAction.setTitle({title: chrome.i18n.getMessage("extensionName") + ": " + date.toLocaleDateString(undefined,doptions)});
		}
	});

}

function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  )
}
