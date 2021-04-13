const filename = "bookmarks.json";
var dictOldIDsToNewIDs = { "-1": "-1" };
var loglines = '';
var debug = false;
const abrowser = typeof InstallTrigger !== 'undefined';
var clientL = [];
var oMarks = [];

init();

chrome.permissions.getAll(function(e) {
	if(e.permissions.includes('bookmarks')) {
		chrome.bookmarks.onCreated.addListener(onCreatedCheck);
		chrome.bookmarks.onMoved.addListener(onMovedCheck);
		chrome.bookmarks.onRemoved.addListener(onRemovedCheck);
		chrome.bookmarks.onChanged.addListener(onChangedCheck);
	}
});

chrome.notifications.onClicked.addListener(notificationSettings);

chrome.permissions.getAll(function(e) {
	if(e.permissions.includes('contextMenus')) {
		chrome.contextMenus.onClicked.addListener(function(itemData) {
			if(itemData.menuItemId.includes("page_")) {
				chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
					var url = tabs[0].url
					chrome.storage.local.get(null, function(options) {
						if(!("s_uuid" in options)) {
							var s_uuid = uuidv4();
							chrome.storage.local.set({s_uuid: s_uuid});
						} else {
							var s_uuid = options['s_uuid'];
						}
						let tgid = itemData.menuItemId.substring(5);
						let cdata = "client="+s_uuid+"&caction=getpurl&url="+encodeURIComponent(url)+"&tg="+tgid;
						var xhr = new XMLHttpRequest();
						xhr.open("POST", options['wdurl'], true);
						xhr.setRequestHeader("Authorization", 'Basic ' + options['creds']);
						xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
						xhr.withCredentials = true;
						xhr.onload = function () {
							if( xhr.status < 200 || xhr.status > 226) {
								message = chrome.i18n.getMessage("sendLinkNot");
								notify('error',message);
								loglines = logit('Error: '+message);
							} else {
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
					} else {
						var s_uuid = options['s_uuid'];
					}
					let tgid = itemData.menuItemId.substring(5);
					let cdata = "client="+s_uuid+"&caction=getpurl&url="+encodeURIComponent(url)+"&tg="+tgid;
					var xhr = new XMLHttpRequest();
					xhr.open("POST", options['wdurl'], true);
					xhr.setRequestHeader("Authorization", 'Basic ' + options['creds']);
					xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
					xhr.withCredentials = true;
					xhr.onload = function () {
						if( xhr.status < 200 || xhr.status > 226) {
							message = chrome.i18n.getMessage("sendLinkNot");
							notify('error',message);
							loglines = logit('Error: '+message);
						} else {
							loglines = logit("Info: "+chrome.i18n.getMessage("sendLinkYes"));
						}
					}
					loglines = logit("Info: "+chrome.i18n.getMessage("sendLinkYes")+", Client: "+s_uuid);
					xhr.send(cdata);
				})
			}
		});
	}
});

chrome.permissions.getAll(function(e) {
	if(e.permissions.includes('contextMenus')) {
		chrome.storage.local.get(null, function(options) {
			if(options['s_type'] == "PHP") {
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
				} catch(error) {
					loglines = logit(error);
				}
			}
		})
	}
});

function sendTab(element) {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.storage.local.get(null, function(options) {
			var cdata = "client=" + options['s_uuid'] + "&caction=getpurl&url=" + encodeURIComponent(tabs[0].url) + "&tg=" + element.target.id;
			var xhr = new XMLHttpRequest();
			xhr.open("POST", options['wdurl'], true);
			xhr.setRequestHeader("Authorization", 'Basic ' + options['creds']);
			xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
			xhr.withCredentials = true;
			xhr.onload = function () {
				if( xhr.status < 200 || xhr.status > 226) {
					var message = chrome.i18n.getMessage("sendLinkNot");
					notify('error',message);
					loglines = logit('Error: ' + message);
				}
				else {
					loglines = logit("Info: " + chrome.i18n.getMessage("sendLinkYes"));
				}
			}
			loglines = logit("Info: " + chrome.i18n.getMessage("sendLinkYes") + ", Client: " + options['s_uuid']);
			xhr.send(cdata);
			
		});
	});
}

function logit(message) {
	var ndate = new Date();
	logline = loglines + ndate.toLocaleString() + " - " + message + "\n";
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
		let s_startup = options['actions']['startup'] || false;
		let s_type = options['s_type'] || "";

		if( s_startup === true && s_type.indexOf('PHP') == -1) {
			loglines = logit("Info: Initiate WebDAV startup sync");
			if(options['wdurl']) getDAVMarks();
		} else if(s_type.indexOf('PHP') == 0) {
			if(s_startup === true) {
				loglines = logit("Info: Initiate PHP startup sync");
				getPHPMarks();
			}
			if(options['wdurl']) {
				getClientList();
				loglines = logit("Info: Get notifications for current client.");
				getNotifications();
			}
		}
	});
}

function getNotifications() {
	chrome.storage.local.get(null, function(options) {
		let xhr = new XMLHttpRequest();
		let data = "client=" + options['s_uuid'] + "&caction=gurls";
		xhr.open("POST", options['wdurl'], true);
		xhr.setRequestHeader("Authorization", 'Basic ' + options['creds']);
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		
		xhr.withCredentials = true;
		xhr.onload = function () {
			if( xhr.status < 200 || xhr.status > 226) {
				message = "Get list of notifications failed. State: "+xhr.status;
				notify('error',message);
				loglines = logit('Error: '+message);
			} else {
				if(xhr.responseText.length > 2) {
					var nData = JSON.parse(xhr.responseText);
					if(Array.isArray(nData)) {
						try {
							nData.forEach(function(notification) {
								let nnid = JSON.stringify({id:notification.nkey,url:notification.url});
								loglines = logit('Info: Received page: <a href="' + notification.url + '">' + notification.url + '</a>');
								notify(nnid, notification.url, notification.title);
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

function getClientList() {
	loglines = logit("Info: Get list of clients.");
	chrome.storage.local.get(null, function(options) {
		let data = "client=" + options['s_uuid'] + "&caction=getclients";
		let xhr = new XMLHttpRequest();
		xhr.open("POST", options['wdurl'], true);
		xhr.setRequestHeader("Authorization", 'Basic ' + options['creds']);
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		xhr.withCredentials = true;
		xhr.onload = function () {
			if( xhr.status < 200 || xhr.status > 226) {
				message = "Get list of clients failed. State: "+xhr.status;
				notify('error',message);
				loglines = logit('Error: '+message);
			} else {
				cData = JSON.parse(xhr.responseText);
				cData.unshift({id:'0',name:'All',type:'',date:''});

				clientL = cData;
				loglines = logit("Info: List of " + cData.length + " clients retrieved successful.");

				chrome.permissions.getAll(function(e) {
					if(e.permissions.includes('contextMenus')) {
						cData.forEach(function(client) {
							var ctitle = client.name ? client.name : client.id
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
					}
				});
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
		try {
			chrome.tabs.create({url: nd.url});
		} catch(error) {
			loglines = logit(error);
		}
		dmNoti(nd.id);
	}
}

function dmNoti(nkey) {
	chrome.storage.local.get(null, function(options) {
		let xhr = new XMLHttpRequest();
		let data = "client=" + options['s_uuid'] + "&caction=durl&durl="+nkey;
		xhr.open("POST", options['wdurl'], true);
		xhr.setRequestHeader("Authorization", 'Basic ' + options['creds']);
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		xhr.withCredentials = true;
		xhr.onload = function () {
			if( xhr.status < 200 || xhr.status > 226) {
				message = "Dismiss notification "+nkey+".";
				notify('error',message);
				loglines = logit('Error: '+message);
			}
		}
		xhr.send(data);
	});
}

function openSettings() {
	chrome.runtime.openOptionsPage();
}

function notify(notid, message, title=chrome.i18n.getMessage("extensionName"), url="") {
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
			xhr.setRequestHeader("Authorization", 'Basic ' + options['creds']);
			xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
			xhr.withCredentials = true;
			xhr.onload = function () {
				if( xhr.status < 200 || xhr.status > 226) {
					message = chrome.i18n.getMessage("errorEditBookmark") + xhr.status;
					notify('error',message);
					chrome.browserAction.setTitle({title: date.toLocaleDateString(undefined,doptions) + ": " + chrome.i18n.getMessage("errorEditBookmark")});
					loglines = logit('Error: '+message);
				}
				else {
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

function exportPHPMarks() {
	loglines = logit("Info: Exporting bookmarks to server");
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
			let cdata = 'client='+s_uuid+'&caction=import&bookmark='+bookmarks;
			let xhr = new XMLHttpRequest();
			xhr.open("POST", options['wdurl'], true);
			xhr.setRequestHeader('Authorization', 'Basic ' + options['creds']);
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
			loglines = logit("Info: Sending export of local bookmarks to server");
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
			xhr.setRequestHeader("Authorization", 'Basic ' + options['creds']);
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
		xhr.setRequestHeader("Authorization", 'Basic ' + options['creds']);
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
				let cdata = "client="+s_uuid+"&caction=movemark&bookmark="+jsonMark;
				var xhr = new XMLHttpRequest();
				xhr.open("POST", options['wdurl'], true);
				xhr.setRequestHeader("Authorization", 'Basic ' + options['creds']);
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
			}
			else {
				var s_uuid = options['s_uuid'];
			}

			let cdata = "client="+s_uuid+"&caction=addmark&bookmark="+jsonMark;

			var xhr = new XMLHttpRequest();
			xhr.open("POST", options['wdurl'], true);
			xhr.setRequestHeader("Authorization", 'Basic ' + options['creds']);
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
		xhr.setRequestHeader("Authorization", 'Basic ' + options['creds']);
		
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
		let params = 'client='+s_uuid+'&caction=startup';
		xhr.open('POST', options['wdurl'] + '?t=' + Math.random(), true);
		xhr.withCredentials = true;
		xhr.setRequestHeader("Authorization", 'Basic ' + options['creds']);
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

function getAllPHPMarks() {
	chrome.storage.local.get(null, function(options) {
		let xhr = new XMLHttpRequest();
		let params = 'client='+options['s_uuid']+'&caction=export&type=json';
		xhr.open('POST', options['wdurl'] + '?t=' + Math.random(), true);
		xhr.withCredentials = true;
		xhr.setRequestHeader("Authorization", 'Basic ' + options['creds']);
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		xhr.onload = function () {
			let datems = Date.now();
			let date = new Date(datems);
			let doptions = { weekday: 'short',  hour: '2-digit', minute: '2-digit' };
			if( xhr.status != 200 ) {
				message = chrome.i18n.getMessage("errorGetBookmarks") + xhr.status;
				notify('error',message);
				loglines = logit('Error: '+message);
			}
			else {
				let response = xhr.responseText;
				if(response != "false") {
					if(abrowser == false) response = c2cm(response);
					let PHPMarks = JSON.parse(response);
					console.log(PHPMarks);
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
		loglines = logit('Info: Sending import request to server');
		xhr.send(params);
	});
}

function c2cm(bookmarks) {
	bookmarks = bookmarks.replace(/root________/g, '0');
	bookmarks = bookmarks.replace(/toolbar_____/g, '1');
	bookmarks = bookmarks.replace(/unfiled_____/g, '2');
	bookmarks = bookmarks.replace(/mobile______/g, '3');
	bookmarks = bookmarks.replace(/menu________/g, '2'); // 4, not exist in chromium
	return bookmarks;
}

function createBookmarkAsync(parms) {
	return new Promise(function(fulfill, reject) {
		chrome.bookmarks.create(parms, fulfill);
	});
}

async function addPHPcMarks(bArray) {
	var bArrayT = bArray;
	for (let bIndex = 0; bIndex < bArray.length; bIndex++) {
		switch(bArrayT[bIndex].bmAction) {
			case 1:	
					if(bArrayT[bIndex].bmURL != null) {
						chrome.bookmarks.search({url: bArrayT[bIndex].bmURL}, function(removeItems) {
							removeItems.forEach(function(removeBookmark) {
								if(removeBookmark.dateAdded == bArrayT[bIndex].bmAdded) {
									chrome.bookmarks.onRemoved.removeListener(onRemovedCheck);
									chrome.bookmarks.remove(removeBookmark.id, function(removeB) {
										chrome.bookmarks.onRemoved.addListener(onRemovedCheck);
									});
								}
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
					break;
			case 2: 
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
					if(bArrayT[bIndex].bmURL != null) {
						chrome.bookmarks.search({url: bArrayT[bIndex].bmURL}, function(removeItems) {
							removeItems.forEach(function(removeBookmark) {
								if(removeBookmark.dateAdded == bArrayT[bIndex].bmAdded) {
									chrome.bookmarks.onRemoved.removeListener(onRemovedCheck);
									chrome.bookmarks.remove(removeBookmark.id, function(removeB) {
										chrome.bookmarks.onRemoved.addListener(onRemovedCheck);
									});
								}
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
					break;
			case "2": 
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
		xhr.setRequestHeader("Authorization", 'Basic ' + options['creds']);
		
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
		console.warn(bmid);
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