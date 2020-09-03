const filename = "bookmarks.json";
var dictOldIDsToNewIDs = { "-1": "-1" };
var loglines = '';
var debug = false;
const abrowser = (/Firefox/.test(navigator.userAgent)) ? "firefox" : "chrome";

init();
chrome.browserAction.onClicked.addListener(openSettings);
chrome.bookmarks.onCreated.addListener(onCreatedCheck);
chrome.bookmarks.onMoved.addListener(onMovedCheck);
chrome.bookmarks.onRemoved.addListener(onRemovedCheck);
chrome.bookmarks.onChanged.addListener(onChangedCheck);
chrome.notifications.onClicked.addListener(notificationSettings);
chrome.contextMenus.onClicked.addListener(function(itemData) {
	if(itemData.menuItemId.includes("page_")) {
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			var url = tabs[0].url
			chrome.storage.local.get(null, function(options) {
				if(!("s_uuid" in options)) {
					var s_uuid = uuidv4();
					chrome.storage.local.set({s_uuid: s_uuid});
				}
				else {
					var s_uuid = options['s_uuid'];
				}
				let tgid = itemData.menuItemId.substring(5);
				let cdata = "client="+s_uuid+"&caction=getpurl&url="+encodeURIComponent(url)+"&tg="+tgid;
				var xhr = new XMLHttpRequest();
				xhr.open("POST", options['wdurl'], true);
				xhr.setRequestHeader("Authorization", 'Basic ' + btoa(options['user'] + ":" + options['password']));
				xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
				xhr.withCredentials = true;
				xhr.onload = function () {
					if( xhr.status < 200 || xhr.status > 226) {
						message = chrome.i18n.getMessage("sendLinkNot");
						notify('error',message);
						loglines = logit('Error: '+message);
					}
					else {
						loglines = logit("Info: "+chrome.i18n.getMessage("sendLinkYes"));
					}
				}
				loglines = logit("Info: "+chrome.i18n.getMessage("sendLinkYes")+", Client: "+s_uuid);
				xhr.send(cdata);
			})
		});
	}

	if(itemData.menuItemId.includes("link_")) {
		var url = itemData.linkUrl
		chrome.storage.local.get(null, function(options) {
			if(!("s_uuid" in options)) {
				var s_uuid = uuidv4();
				chrome.storage.local.set({s_uuid: s_uuid});
			}
			else {
				var s_uuid = options['s_uuid'];
			}
			let tgid = itemData.menuItemId.substring(5);
			let cdata = "client="+s_uuid+"&caction=getpurl&url="+encodeURIComponent(url)+"&tg="+tgid;
			var xhr = new XMLHttpRequest();
			xhr.open("POST", options['wdurl'], true);
			xhr.setRequestHeader("Authorization", 'Basic ' + btoa(options['user'] + ":" + options['password']));
			xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
			xhr.withCredentials = true;
			xhr.onload = function () {
				if( xhr.status < 200 || xhr.status > 226) {
					message = chrome.i18n.getMessage("sendLinkNot");
					notify('error',message);
					loglines = logit('Error: '+message);
				}
				else {
					loglines = logit("Info: "+chrome.i18n.getMessage("sendLinkYes"));
				}
			}
			loglines = logit("Info: "+chrome.i18n.getMessage("sendLinkYes")+", Client: "+s_uuid);
			xhr.send(cdata);
		})
	}
});

chrome.storage.local.get(null, function(options) {
	if(options['s_type'] == "PHP") {
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
	}
})

function logit(message) {
	var options = { day: '2-digit', year: 'numeric', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
	var mDate = new Date().toLocaleString(undefined, options);
	logline = loglines+mDate+" - "+message+"\n";
	return logline;
}

function init() {
	chrome.storage.local.set({last_message: ""});
	chrome.storage.local.get(null, function(options) {
		var s_startup = options['s_startup'] || false;
		var s_type = options['s_type'] || "";

		if( s_startup === true && s_type.indexOf('PHP') == -1) {
			loglines = logit("Info: Initiate WebDAV startup sync");
			getDAVMarks();
		} else if(s_type.indexOf('PHP') == 0) {
			if(s_startup === true) {
				loglines = logit("Info: Initiate PHP startup sync");
				getPHPMarks();
			}
			loglines = logit("Info: Get list of clients.");
			getClientList();
			loglines = logit("Info: Get notifications for current client.");
			getNotifications();
		}
	});
}

function getNotifications() {
	chrome.storage.local.get(null, function(options) {
		let xhr = new XMLHttpRequest();
		xhr.open("GET", options['wdurl']+"?client="+options['s_uuid']+"&gurls=1", true);
		xhr.setRequestHeader("Authorization", 'Basic ' + btoa(options['user'] + ":" + options['password']));
		xhr.withCredentials = true;
		xhr.onload = function () {
			if( xhr.status < 200 || xhr.status > 226) {
				message = "Get list of notifications failed.";
				notify('error',message);
				loglines = logit('Error: '+message);
			}
			else {
				if(xhr.responseText.length > 0) {
					nData = JSON.parse(xhr.responseText);
					nData.forEach(function(notification) {
						let nnid = JSON.stringify({id:notification.nkey,url:notification.url})
						notify(nnid, notification.url, notification.title);
					});
				}
				loglines = logit("Info: List of notifications retrieved successfully.");
			}
		}
		xhr.send();
	});
	
}

function getClientList() {
	chrome.storage.local.get(null, function(options) {
		if(!("s_uuid" in options)) {
			var s_uuid = uuidv4();
			chrome.storage.local.set({s_uuid: s_uuid});
		}
		else {
			var s_uuid = options['s_uuid'];
		}

		let data = "client="+s_uuid+"&caction=getclients";
		let xhr = new XMLHttpRequest();
		xhr.open("POST", options['wdurl'], true);
		xhr.setRequestHeader("Authorization", 'Basic ' + btoa(options['user'] + ":" + options['password']));
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		xhr.withCredentials = true;
		xhr.onload = function () {
			if( xhr.status < 200 || xhr.status > 226) {
				message = "Get list of clients failed.";
				notify('error',message);
				loglines = logit('Error: '+message);
			}
			else {
				cData = JSON.parse(xhr.responseText);
				cData.unshift({id:'0',name:'All',type:'',date:''});
				cData.forEach(function(client) {
					var ctitle = client.name.length < 1 ? client.id : client.name;
					chrome.contextMenus.create({
						title: ctitle,
						parentId: "ssendpage",
						id: 'page_' + client.id
					});
					chrome.contextMenus.create({
						title: ctitle,
						parentId: "ssendlink",
						id: 'link_' + client.id
					});
				});
				loglines = logit("Info: List of clients retrieved successfully.");
			}
		}
		xhr.send(data);
	});
}

function notificationSettings(id) {
	if(id == 'console' || id == 'error' || id == 'setting') {
		debug = true;
		chrome.runtime.openOptionsPage();
	} else {
		let nd = JSON.parse(id);
		chrome.tabs.create({url: nd.url});
		dmNoti(nd.id);
	}
}

function dmNoti(nkey) {
	chrome.storage.local.get(null, function(options) {
		let xhr = new XMLHttpRequest();
		xhr.open("GET", options['wdurl']+"?client="+options['s_uuid']+"&durl="+nkey, true);
		xhr.setRequestHeader("Authorization", 'Basic ' + btoa(options['user'] + ":" + options['password']));
		xhr.withCredentials = true;
		xhr.onload = function () {
			if( xhr.status < 200 || xhr.status > 226) {
				message = "Dismiss notification "+nkey+".";
				notify('error',message);
				loglines = logit('Error: '+message);
			}
		}
		xhr.send();
	});
}

function openSettings() {
	chrome.runtime.openOptionsPage();
}

function notify(notid, message, title=chrome.i18n.getMessage("extensionName"), url="") {
	chrome.notifications.create(notid, {
		"type": "basic",
		"title": title,
		"iconUrl": "icons/bookmark.png",
		"message": message
	});
}

function onCreatedCheck(id, bookmark) {
	chrome.storage.local.get(null, function(options) {
		var s_create = options['s_create'] || false;
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
	chrome.storage.local.get(null, function(options) {
		var s_change = options['s_change'] || false;
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
	chrome.storage.local.get(null, function(options) {
		var s_change = options['s_change'] || false;
		var s_type = options['s_type'] || "";
		
		if(s_change === true && s_type.indexOf('PHP') == -1) {
			saveAllMarks();
		}
		else if(s_change === true && s_type.indexOf('PHP') == 0) {
			console.log(id);
		}
	});
}

function onRemovedCheck(id, bookmark) {
	chrome.storage.local.get(null, function(options) {
		var s_remove = options['s_remove'] || false;
		var s_type = options['s_type'] || "";
		
		if(s_remove === true  && s_type.indexOf('PHP') == -1) {
			chrome.bookmarks.onRemoved.removeListener(onRemovedCheck);
			saveAllMarks();
		}
		else if(s_remove === true  && s_type.indexOf('PHP') == 0) {
			delMark(id, bookmark);
		}
	});
}

function exportPHPMarks() {
	loglines = logit("Info: Requesting all local bookmarks for export");
	chrome.bookmarks.getTree(function(bookmarkItems) {
		let bookmarks = encodeURIComponent(JSON.stringify(bookmarkItems));
		chrome.storage.local.get(null, function(options) {
			if(!("s_uuid" in options)) {
				var s_uuid = uuidv4();
				chrome.storage.local.set({s_uuid: s_uuid});
			}
			else {
				var s_uuid = options['s_uuid'];
			}
			let cdata = "client="+s_uuid+"&ctype="+abrowser+"&caction=import&bookmark="+bookmarks;
			let xhr = new XMLHttpRequest();
			xhr.open("POST", options['wdurl'], true);
			xhr.setRequestHeader("Authorization", 'Basic ' + btoa(options['user'] + ":" + options['password']));
			xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
			xhr.withCredentials = true;
			xhr.onload = function () {
				if( xhr.status < 200 || xhr.status > 226) {
					message = chrome.i18n.getMessage("errorSaveBookmarks") + xhr.status;
					notify('error',message);
					loglines = logit("Error: "+message);
				}
				else {
					let response = JSON.parse(xhr.responseText);
					if(response == 1) {
						message = chrome.i18n.getMessage("successExportBookmarks");
						notify('info',message);
						loglines = logit("Info: "+message);
					}
					else {
						message = chrome.i18n.getMessage("errorExportBookmarks");
						notify('error',message + ": " + response);
						loglines = logit("Error: "+ message + " " + response);
					}
				}
			}
			loglines = logit("Info: Sending export of local bookmarks for client "+s_uuid);
			xhr.send(cdata);
		})
	});
	
	let datems = Date.now();
	let date = new Date(datems);
	let doptions = { weekday: 'long',  hour: '2-digit', minute: '2-digit' };
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
			xhr.setRequestHeader("Authorization", 'Basic ' + btoa(options['user'] + ":" + options['password']));
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
	let doptions = { weekday: 'long',  hour: '2-digit', minute: '2-digit' };
	chrome.storage.local.set({last_s: datems});
	chrome.browserAction.setTitle({title: chrome.i18n.getMessage("extensionName") + ": " + date.toLocaleDateString(undefined,doptions)});
}

function delMark(id, bookmark) {
	let jsonMark = encodeURIComponent(JSON.stringify({ "url": bookmark.node.url,"folder": bookmark.node.parentId,"index": bookmark.node.index,"type": bookmark.node.type,"id": id }));
	chrome.storage.local.get(null, function(options) {
		if(!("s_uuid" in options)) {
			var s_uuid = uuidv4();
			chrome.storage.local.set({s_uuid: s_uuid});
		}
		else {
			var s_uuid = options['s_uuid'];
		}
		let cdata = "client="+s_uuid+"&ctype="+abrowser+"&caction=delmark&bookmark="+jsonMark;
		var xhr = new XMLHttpRequest();
		xhr.open("POST", options['wdurl'], true);
		xhr.setRequestHeader("Authorization", 'Basic ' + btoa(options['user'] + ":" + options['password']));
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		xhr.withCredentials = true;
		xhr.onload = function () {
			if( xhr.status < 200 || xhr.status > 226) {
				message = chrome.i18n.getMessage("errorRemoveBookmark") + xhr.status;
				notify('error',message);
				chrome.browserAction.setTitle({title: date.toLocaleDateString(undefined,doptions) + ": " + chrome.i18n.getMessage("errorRemoveBookmark")});
				loglines = logit('Error: '+message);
			}
			else {
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
		loglines = logit("Info: Sending remove request to server. URL: "+bookmark.node.url+", Client: "+s_uuid);
		xhr.send(cdata);
	})
	
	let datems = Date.now();
	let date = new Date(datems);
	let doptions = { weekday: 'long',  hour: '2-digit', minute: '2-digit' };
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
				let cdata = "client="+s_uuid+"&ctype="+abrowser+"&caction=movemark&bookmark="+jsonMark;
				var xhr = new XMLHttpRequest();
				xhr.open("POST", options['wdurl'], true);
				xhr.setRequestHeader("Authorization", 'Basic ' + btoa(options['user'] + ":" + options['password']));
				xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
				xhr.withCredentials = true;
				xhr.onload = function () {
					if( xhr.status < 200 || xhr.status > 226) {
						message = chrome.i18n.getMessage("errorMoveBookmark") + xhr.status;
						notify('error',message);
						loglines = logit('Error: '+message);
					}
					else {
						let response = JSON.parse(xhr.responseText);
						if(response == 1)
								loglines = logit("Info: Bookmark moved successfully at the server");
							else
								loglines = logit("Error: Bookmark not moved at the server, response from server is: " + response);
					}
				}
				loglines = logit("Info: Sending move request to server. Bookmark ID: "+id+", Client: "+s_uuid);
				xhr.send(cdata);
			});
		});
	});
	
	let datems = Date.now();
	let date = new Date(datems);
	let doptions = { weekday: 'long',  hour: '2-digit', minute: '2-digit' };
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
			}
			else {
				var s_uuid = options['s_uuid'];
			}

			let cdata = "client="+s_uuid+"&ctype="+abrowser+"&caction=addmark&bookmark="+jsonMark;

			var xhr = new XMLHttpRequest();
			xhr.open("POST", options['wdurl'], true);
			xhr.setRequestHeader("Authorization", 'Basic ' + btoa(options['user'] + ":" + options['password']));
			xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
			xhr.withCredentials = true;
			xhr.onload = function () {
				if( xhr.status < 200 || xhr.status > 226) {
					message = chrome.i18n.getMessage("errorSaveSingleBookmarks")  + xhr.status;
					notify('error',message);
					loglines = logit('Error: '+message);
				}
				else {
					let response = JSON.parse(xhr.responseText);
					if(response == 1)
							loglines = logit("Info: Bookmark added successfully at the server");
						else
							loglines = logit("Error: Bookmark not added at the server, please check the server logfile");
				}
			}
			loglines = logit("Info: Sending add request to server. URL: "+bookmark.url+", Client: "+s_uuid);
			xhr.send(cdata);
		});
	});
	
	let datems = Date.now();
	let date = new Date(datems);
	let doptions = { weekday: 'long',  hour: '2-digit', minute: '2-digit' };
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
		xhr.setRequestHeader("Authorization", 'Basic ' + btoa(options['user'] + ":" + options['password']));
		
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
		let params = 'client='+s_uuid+'&ctype='+abrowser+'&caction=startup';
		xhr.open('POST', options['wdurl'] + '?t=' + Math.random(), true);
		xhr.withCredentials = true;
		xhr.setRequestHeader("Authorization", 'Basic ' + btoa(options['user'] + ":" + options['password']));
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		
		xhr.onload = function () {
			let datems = Date.now();
			let date = new Date(datems);
			let doptions = { weekday: 'long',  hour: '2-digit', minute: '2-digit' };
			chrome.browserAction.setTitle({title: chrome.i18n.getMessage("extensionName") + ": " + date.toLocaleDateString(undefined,doptions)});
			if( xhr.status != 200 ) {
				message = chrome.i18n.getMessage("errorGetBookmarks") + xhr.status;
				notify('error',message);
				loglines = logit('Info: '+message);
			}
			else {
				let PHPMarks = JSON.parse(xhr.responseText);
				if(PHPMarks.includes('New client registered')) {
					message = chrome.i18n.getMessage("infoNewClient");
					notify('info',message);
					loglines = logit('Info: '+message);
				}
				else if(PHPMarks.includes('No bookmarks added')) {
					message = chrome.i18n.getMessage("infoNoChange");
					loglines = logit("Info: "+message);
					chrome.storage.local.set({last_message: message});
				}
				else {
					message = PHPMarks.length + chrome.i18n.getMessage("infoChanges");
					loglines = logit(message+" Sending them now to add function");
					addPHPMarks(PHPMarks);
					chrome.storage.local.set({last_message: message});
				}		
			}
		}
		loglines = logit("Info: Sending parameters to server (client,type,action): "+s_uuid+", "+abrowser+", startup");
		xhr.send(params);
	});
}

function getAllPHPMarks() {
	chrome.storage.local.get(null, function(options) {
		let xhr = new XMLHttpRequest();
		let params = 'client='+options['s_uuid']+'&ctype='+abrowser+'&caction=export';
		xhr.open('POST', options['wdurl'] + '?t=' + Math.random(), true);
		xhr.withCredentials = true;
		xhr.setRequestHeader("Authorization", 'Basic ' + btoa(options['user'] + ":" + options['password']));
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		xhr.onload = function () {
			let datems = Date.now();
			let date = new Date(datems);
			let doptions = { weekday: 'long',  hour: '2-digit', minute: '2-digit' };
			if( xhr.status != 200 ) {
				message = chrome.i18n.getMessage("errorGetBookmarks") + xhr.status;
				notify('error',message);
				loglines = logit('Error: '+message);
			}
			else {
				let response = xhr.responseText;
				if(response != "false") {
					if(abrowser != 'firefox') response = c2cm(response);
					let PHPMarks = JSON.parse(response);
					count = 0;
					loglines = logit('Info: Starting bookmark import from server');
					importMarks(PHPMarks);
				}
				else {
					loglines = logit("Error: Error when retrieving bookmarks from server for import");
				}
			}
			chrome.browserAction.setTitle({title: chrome.i18n.getMessage("extensionName") + ": " + date.toLocaleDateString(undefined,doptions)});
			}
		loglines = logit('Info: Sending import request to server. Client: '+options['s_uuid']);
		xhr.send(params);
	});
}

function c2cm(bookmarks) {
	bookmarks = bookmarks.replace(/root________/g, '0');
	bookmarks = bookmarks.replace(/toolbar_____/g, '1');
	bookmarks = bookmarks.replace(/unfiled_____/g, '2');
	bookmarks = bookmarks.replace(/mobile______/g, '3');
	bookmarks = bookmarks.replace(/menu________/g, '4');
	return bookmarks;
}

function addPHPMarks(bArray) {
	bArray.forEach(function(bookmark) {
		if(bookmark.bmAction == 1 && bookmark.bmURL != '') {
			loglines = logit('Info: Try to remove bookmark '+bookmark.bmURL);
			chrome.bookmarks.search({url: bookmark.bmURL}, function(removeItems) {
				removeItems.forEach(function(removeBookmark) {
					if(removeBookmark.dateAdded == bookmark.bmAdded) {
						chrome.bookmarks.onRemoved.removeListener(onRemovedCheck);
						chrome.bookmarks.remove(removeBookmark.id, function(remove) {
							loglines = logit('Info: Bookmark '+removeBookmark.url+' removed');
							chrome.bookmarks.onRemoved.addListener(onRemovedCheck);
						});
					}
				});
			});
		}
		else {
			if(!bookmark.fdID.endsWith('___')) {
				loglines = logit('Info: Changed bookmark is in userfolder');
				chrome.bookmarks.search({title: bookmark.fdName},function(folderItems) {
					folderItems.forEach(function(folder) {
						if(folder.index == bookmark.fdIndex) {
							chrome.bookmarks.search({url: bookmark.bmURL},function(bookmarkItems) {
								if (bookmarkItems.length) {
									if (bookmark.fdName != bookmarkItems[0].parentId) {
										chrome.bookmarks.onMoved.removeListener(onMovedCheck);
										chrome.bookmarks.move(bookmarkItems[0].id, {parentId: folder.id}, function(move) {
											loglines = logit('Info: '+move.url + " moved to folder " + folder.title);
											chrome.bookmarks.onMoved.addListener(onMovedCheck);
										});
									}
								} else {
									chrome.bookmarks.onCreated.removeListener(onCreatedCheck);
									chrome.bookmarks.create({type: bookmark.bmType, parentId: folder.id, title: bookmark.bmTitle, url: bookmark.bmURL }, function() {
										loglines = logit('Info: '+bookmark.bmURL + " added as new bookmark");
										chrome.bookmarks.onCreated.addListener(onCreatedCheck);
									});
								}
							});
							return false;
						}
					});
				});
			}
			else {
				loglines = logit('Info: Changed bookmark is in systemfolder');
				if(bookmark.bmURL != '') {
					loglines = logit('Info: Try to add bookmark '+bookmark.bmURL);
					chrome.bookmarks.search({url: bookmark.bmURL}, function(bookmarkItems) {
						if (bookmarkItems.length) {
							if(bookmarkItems[0].parentId != bookmark.fdID) {
								chrome.bookmarks.onMoved.removeListener(onMovedCheck);
								chrome.bookmarks.move(bookmarkItems[0].id, {parentId: bookmark.fdID}, function(move) {
									loglines = logit('Info: '+move.url + " moved to folder " + bookmark.fdName);
									chrome.bookmarks.onMoved.addListener(onMovedCheck);
								});
							}
						} else {
							chrome.bookmarks.onCreated.removeListener(onCreatedCheck);
							chrome.bookmarks.create({type: bookmark.bmType, parentId: bookmark.fdID, title: bookmark.bmTitle, url: bookmark.bmURL}, function() {
								loglines = logit('Info: '+bookmark.bmURL + " added as new bookmark.");
								chrome.bookmarks.onCreated.addListener(onCreatedCheck);
							});
						}
					});
				}
			}
		}
	});
}

function getDAVMarks() {
	chrome.storage.local.get(null, function(options) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', options['wdurl'] + '/' + filename + '?t=' + Math.random(), true);
		xhr.withCredentials = true;
		xhr.setRequestHeader('X-Filename', filename);
		xhr.setRequestHeader("Authorization", 'Basic ' + btoa(options['user'] + ":" + options['password']));
		
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
	chrome.storage.local.set({last_s: 1});
}

function importMarks(parsedMarks, index=0) {
    let bmid = parsedMarks[index].bmID;
    let bmparentId = parsedMarks[index].bmParentID;
    let bmindex = parseInt(parsedMarks[index].bmIndex,10);
    let bmtitle = parsedMarks[index].bmTitle;
    let bmtype = parsedMarks[index].bmType;
    let bmurl = parsedMarks[index].bmURL;
	let bmdate = parsedMarks[index].bmAdded;

	if(abrowser == 'firefox') {
		var newParentId = (typeof bmparentId !== 'undefined' && bmparentId.substr(bmparentId.length - 2) == "__") ? bmparentId : dictOldIDsToNewIDs[bmparentId];
		if(bmparentId == "root________") {
			importMarks(parsedMarks, ++index);
			return false;
		}
	} else {
		var newParentId = (typeof bmparentId !== 'undefined' && bmparentId.length < 2) ? bmparentId : dictOldIDsToNewIDs[bmparentId];
		if(bmparentId == "0") {
			importMarks(parsedMarks, ++index);
			return false;
		}
	}

	loglines = logit('Info: Removing listeners');
	chrome.bookmarks.onCreated.removeListener(onCreatedCheck);
	chrome.bookmarks.onMoved.removeListener(onMovedCheck);
	chrome.bookmarks.onRemoved.removeListener(onRemovedCheck);
	chrome.bookmarks.onChanged.removeListener(onChangedCheck);

	if(abrowser == 'firefox') {
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
		chrome.bookmarks.create(
			(bmtype == "folder" ?
				{
					index: bmindex,
					parentId: newParentId,
					title: bmtitle
				} :
				{
					index: bmindex,
					parentId: newParentId,
					title: bmtitle,
					url: bmurl
				}
			),
			function(node) {			
				if (typeof node == "undefined") {
					message = parsedMarks.length + chrome.i18n.getMessage("successImportBookmarks");
					notify('info',message);
					loglines = logit('Info: ' + message + ' Re-adding the listeners now');
					chrome.bookmarks.onCreated.addListener(onCreatedCheck);
					chrome.bookmarks.onMoved.addListener(onMovedCheck);
					chrome.bookmarks.onRemoved.addListener(onRemovedCheck);
					chrome.bookmarks.onChanged.addListener(onChangedCheck);
				}
				else {
					let newID = bmid.length < 2 ? bmid : node.id;
					dictOldIDsToNewIDs[bmid] = newID;
					importMarks(parsedMarks, ++index);
				}
		});
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
			let doptions = { weekday: 'long',  hour: '2-digit', minute: '2-digit' };
			chrome.storage.local.set({
				last_s: datems,
			});
			chrome.browserAction.setTitle({title: chrome.i18n.getMessage("extensionName") + ": " + date.toLocaleDateString(undefined,doptions)});
		}
	});
}

function onError(error) {
	message = 'Error: ${error}';
	notify('error', message);
	loglines = logit(message);
}

function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  )
}