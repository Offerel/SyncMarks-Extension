const filename = "bookmarks.json";
var dictOldIDsToNewIDs = { "-1": "-1" };
var loglines = '';
var debug = false;

checkSettings();
init();
browser.browserAction.onClicked.addListener(openSettings);
browser.bookmarks.onCreated.addListener(onCreatedCheck);
browser.bookmarks.onMoved.addListener(onMovedCheck);
browser.bookmarks.onRemoved.addListener(onRemovedCheck);
browser.bookmarks.onChanged.addListener(onChangedCheck);
browser.notifications.onClicked.addListener(notificationSettings);

function logit(message) {
	var options = { day: '2-digit', year: 'numeric', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
	var mDate = new Date().toLocaleString(undefined, options);
	logline = loglines+mDate+" - "+message+"\n";
	return logline;
}

function init() {
	let getting = browser.storage.local.get();
	browser.storage.local.set({last_message: ""});
	getting.then( (option) => {
		let start = option.s_startup || false;
		if( start === true && s_type.indexOf('PHP') == -1) {
			loglines = logit("Info: Initiate WebDAV startup sync");
			getDAVMarks();
		}
		else if(start === true && s_type.indexOf('PHP') == 0) {
			loglines = logit("Info: Initiate PHP startup sync");
			getPHPMarks();
		}
	});
}

function notificationSettings(id) {
	if(id == 'setting') {
		openSettings();
	}
	else if(id == 'console' || id == 'error') {
		debug = true;
		browser.runtime.openOptionsPage().then(function() {
			// something
		}, onError);
	}
}

function openSettings() {
	browser.runtime.openOptionsPage();
}

function checkSettings() {
	var getting = browser.storage.local.get();
	getting.then(onGot, onError);
}

function notify(notid, message) {
	browser.notifications.create(notid, {
		"type": "basic",
		"title": browser.i18n.getMessage("extensionName"),
		"iconUrl": "icons/bookmark.png",
		"message": message
	});
}

function onCreatedCheck(id, bookmark) {
	checkSettings();
	if(s_create === true && s_type.indexOf('PHP') == -1) {
		saveAllMarks();
	}
	else if(s_create === true && s_type.indexOf('PHP') == 0) {
		sendMark(bookmark);
	}
}

function onMovedCheck(id, bookmark) {
	checkSettings();
	if(s_change === true && s_type.indexOf('PHP') == -1) {
		saveAllMarks();
	}
	else if(s_change === true && s_type.indexOf('PHP') == 0) {
		moveMark(id, bookmark);
	}
}

function onChangedCheck(id, changeInfo) {
	checkSettings();
	if(s_change === true && s_type.indexOf('PHP') == -1) {
		saveAllMarks();
	}
	else if(s_change === true && s_type.indexOf('PHP') == 0) {
		console.log(id);
	}
}

function onRemovedCheck(id, bookmark) {
	checkSettings();
	if(s_remove === true  && s_type.indexOf('PHP') == -1) {
		browser.bookmarks.onRemoved.removeListener(onRemovedCheck);
		saveAllMarks();
	}
	else if(s_remove === true  && s_type.indexOf('PHP') == 0) {
		delMark(id, bookmark);
	}
}

function exportPHPMarks() {
	loglines = logit("Info: Requesting all local bookmarks for export");
	browser.bookmarks.getTree().then(function(bookmarkItems) {
		let bookmarks = encodeURIComponent(JSON.stringify(bookmarkItems));
		var getting = browser.storage.local.get();
		getting.then(onGot, onError);
		let cdata = "client="+s_uuid+"&ctype=firefox&caction=import&bookmark="+bookmarks;
		let xhr = new XMLHttpRequest();
		xhr.open("POST", davurl, true);
		xhr.setRequestHeader("Authorization", 'Basic ' + btoa(user + ":" + pw));
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		xhr.withCredentials = true;
		xhr.onload = function () {
			if( xhr.status < 200 || xhr.status > 226) {
				message = browser.i18n.getMessage("errorSaveBookmarks") + xhr.status;
				notify('error',message);
				loglines = logit("Error: "+message);
			}
			else {
				let response = JSON.parse(xhr.responseText);
				if(response == 1) {
					message = browser.i18n.getMessage("successExportBookmarks");
					notify('info',message);
					loglines = logit("Info: "+message);
				}
				else {
					message = browser.i18n.getMessage("errorExportBookmarks");
					notify('error',message);
					loglines = logit("Error: "+message);
				}
			}
		}
		loglines = logit("Info: Sending export of local bookmarks for client "+s_uuid);
		xhr.send(cdata);
	},onRejected);
	
	let datems = Date.now();
	let date = new Date(datems);
	let doptions = { weekday: 'long',  hour: '2-digit', minute: '2-digit' };
	browser.browserAction.setTitle({title: browser.i18n.getMessage("extensionName") + ": " + date.toLocaleDateString(undefined,doptions)});
	browser.storage.local.set({
		last_s: datems,
	});
}

function saveAllMarks() {
	loglines = logit("Info: Requesting all bookmarks from server");
	browser.bookmarks.getTree().then(saveDAVMarks, onRejected);
	
	let datems = Date.now();
	let date = new Date(datems);
	let doptions = { weekday: 'long',  hour: '2-digit', minute: '2-digit' };
	browser.storage.local.set({
		last_s: datems,
	});
	
	browser.browserAction.setTitle({title: browser.i18n.getMessage("extensionName") + ": " + date.toLocaleDateString(undefined,doptions)});
}

function onRejected(error) {
	message = browser.i18n.getMessage("internalError") + error;
	notify('error', message);
	loglines = logit("Error: "+message);
}

function delMark(id, bookmark) {
	let jsonMark = encodeURIComponent(JSON.stringify({ "url": bookmark.node.url,"folder": bookmark.node.parentId,"index": bookmark.node.index,"type": bookmark.node.type,"id": id }));
	let cdata = "client="+s_uuid+"&ctype=firefox&caction=delmark&bookmark="+jsonMark;
	browser.storage.local.get().then(onGot, onError);
	var xhr = new XMLHttpRequest();
	xhr.open("POST", davurl, true);
	xhr.setRequestHeader("Authorization", 'Basic ' + btoa(user + ":" + pw));
	xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	xhr.withCredentials = true;
	xhr.onload = function () {
		if( xhr.status < 200 || xhr.status > 226) {
			message = browser.i18n.getMessage("errorRemoveBookmark") + xhr.status;
			notify('error',message);
			loglines = logit('Error: '+message);
		}
		else {
			let response = JSON.parse(xhr.responseText);
			if(response == 1)
					loglines = logit("Info: Bookmark removed at the server");
				else
					loglines = logit("Error: Bookmark not removed at the server, please check the server logfile");
		}
	}
	loglines = logit("Info: Sending remove request to server. URL: "+bookmark.node.url+", Client: "+s_uuid);
	xhr.send(cdata);
	
	let datems = Date.now();
	let date = new Date(datems);
	let doptions = { weekday: 'long',  hour: '2-digit', minute: '2-digit' };
	browser.storage.local.set({
		last_s: datems,
	});
	
	browser.browserAction.setTitle({title: browser.i18n.getMessage("errorRemoveBookmark") + ": " + date.toLocaleDateString(undefined,doptions)});
}

function moveMark(id, bookmark) {
	browser.bookmarks.get(bookmark.parentId).then(function(folder) {
		let jsonMark = encodeURIComponent(JSON.stringify({ "id": id, "index": bookmark.index, "folderIndex": folder[0]['index'],"folder": bookmark.parentId,"nfolder": folder[0]['title'] }));
		let cdata = "client="+s_uuid+"&ctype=firefox&caction=movemark&bookmark="+jsonMark;
		browser.storage.local.get().then(onGot, onError);
		var xhr = new XMLHttpRequest();
		xhr.open("POST", davurl, true);
		xhr.setRequestHeader("Authorization", 'Basic ' + btoa(user + ":" + pw));
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		xhr.withCredentials = true;
		xhr.onload = function () {
			if( xhr.status < 200 || xhr.status > 226) {
				message = browser.i18n.getMessage("errorMoveBookmark") + xhr.status;
				notify('error',message);
				loglines = logit('Error: '+message);
			}
			else {
				let response = JSON.parse(xhr.responseText);
				if(response == 1)
						loglines = logit("Info: Bookmark moved successfully at the server");
					else
						loglines = logit("Error: Bookmark not moved at the server, please check the server logfile");
			}
		}
		loglines = logit("Info: Sending move request to server. Bookmark ID: "+id+", Client: "+s_uuid);
		xhr.send(cdata);
	},onRejected);
	
	let datems = Date.now();
	let date = new Date(datems);
	let doptions = { weekday: 'long',  hour: '2-digit', minute: '2-digit' };
	browser.storage.local.set({
		last_s: datems,
	});
	
	browser.browserAction.setTitle({title: browser.i18n.getMessage("extensionName") + ": " + date.toLocaleDateString(undefined,doptions)});
}

function sendMark(bookmark) {
	browser.bookmarks.get(bookmark.parentId).then(function(folder) {
		let jsonMark = encodeURIComponent(JSON.stringify({ "id": bookmark.id,"url": bookmark.url, "title": bookmark.title, "type": bookmark.type, "folder": bookmark.parentId, "nfolder": folder[0]['title'], "added": bookmark.dateAdded }));
		let cdata = "client="+s_uuid+"&ctype=firefox&caction=addmark&bookmark="+jsonMark;
		browser.storage.local.get().then(onGot, onError);
		var xhr = new XMLHttpRequest();
		xhr.open("POST", davurl, true);
		xhr.setRequestHeader("Authorization", 'Basic ' + btoa(user + ":" + pw));
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		xhr.withCredentials = true;
		xhr.onload = function () {
			if( xhr.status < 200 || xhr.status > 226) {
				message = browser.i18n.getMessage("errorSaveSingleBookmarks")  + xhr.status;
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
	},onRejected);
	
	let datems = Date.now();
	let date = new Date(datems);
	let doptions = { weekday: 'long',  hour: '2-digit', minute: '2-digit' };
	browser.storage.local.set({
		last_s: datems,
	});
	
	browser.browserAction.setTitle({title: browser.i18n.getMessage("extensionName") + ": " + date.toLocaleDateString(undefined,doptions)});
}

function saveDAVMarks(bookmarkItems) {
	browser.bookmarks.onRemoved.removeListener(onRemovedCheck);
	browser.storage.local.get().then(onGot, onError);
	var bookmarks = JSON.stringify(bookmarkItems);
	var xhr = new XMLHttpRequest();
	xhr.open("PUT", davurl + "/" + filename, true);
	xhr.withCredentials = true;
	xhr.setRequestHeader('X-Filename', filename);
	xhr.setRequestHeader("Authorization", 'Basic ' + btoa(user + ":" + pw));
	
	xhr.onload = function () {
		if( xhr.status < 200 || xhr.status > 226) {
			message = browser.i18n.getMessage("errorSaveBookmarks") + xhr.status;
			notify('error',message);
			loglines = logit("Info: "+message);
			browser.bookmarks.onRemoved.addListener(onRemovedCheck);
		}
		else {
			loglines = logit("Info: Bookmarks send successfully to WebDAV share");
		}
	}
	xhr.send(bookmarks);
}

function getPHPMarks() {
	checkSettings();
	let xhr = new XMLHttpRequest();
	let params = 'client='+s_uuid+'&ctype=firefox&caction=startup';
	xhr.open('POST', davurl + '?t=' + Math.random(), true);
	xhr.withCredentials = true;
	xhr.setRequestHeader("Authorization", 'Basic ' + btoa(user + ":" + pw));
	xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	
	xhr.onload = function () {
		let datems = Date.now();
		let date = new Date(datems);
		let doptions = { weekday: 'long',  hour: '2-digit', minute: '2-digit' };
		browser.browserAction.setTitle({title: browser.i18n.getMessage("extensionName") + ": " + date.toLocaleDateString(undefined,doptions)});
		if( xhr.status != 200 ) {
			message = browser.i18n.getMessage("errorGetBookmarks") + xhr.status;
			notify('error',message);
			loglines = logit('Info: '+message);
		}
		else {
			let PHPMarks = JSON.parse(xhr.responseText);
			if(PHPMarks.includes('New client registered')) {
				message = browser.i18n.getMessage("infoNewClient");
				notify('info',message);
				loglines = logit('Info: '+message);
			}
			else if(PHPMarks.includes('No bookmarks added')) {
				message = browser.i18n.getMessage("infoNoChange");
				loglines = logit("Info: "+message);
				browser.storage.local.set({
					last_message: message,
				});
			}
			else {
				message = PHPMarks.length + browser.i18n.getMessage("infoChanges");
				loglines = logit(message+" Sending them now to add function");
				addPHPMarks(PHPMarks);
				browser.storage.local.set({
					last_message: message,
				});
			}		
		}
	}
	loglines = logit("Info: Sending parameters to server (client,type,action): "+s_uuid+", firefox, startup");
	xhr.send(params);
}

function getAllPHPMarks() {
	checkSettings();
	let xhr = new XMLHttpRequest();
	let params = 'client='+s_uuid+'&ctype=firefox&caction=export';
	xhr.open('POST', davurl + '?t=' + Math.random(), true);
	xhr.withCredentials = true;
	xhr.setRequestHeader("Authorization", 'Basic ' + btoa(user + ":" + pw));
	xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	xhr.onload = function () {
		let datems = Date.now();
		let date = new Date(datems);
		let doptions = { weekday: 'long',  hour: '2-digit', minute: '2-digit' };
		if( xhr.status != 200 ) {
			message = browser.i18n.getMessage("errorGetBookmarks") + xhr.status;
			notify('error',message);
			loglines = logit('Error: '+message);
		}
		else {
			let response = xhr.responseText;
			if(response != "false") {
				let PHPMarks = JSON.parse(response);
				count = 0;
				loglines = logit('Info: Starting bookmark import from server');
				importMarks(PHPMarks);
			}
			else {
				loglines = logit("Error: Error when retrieving bookmarks from server for import");
			}
		}
		browser.browserAction.setTitle({title: browser.i18n.getMessage("extensionName") + ": " + date.toLocaleDateString(undefined,doptions)});
		}
	loglines = logit('Info: Sending import request to server. Client: '+s_uuid);
	xhr.send(params);
}

function addPHPMarks(bArray) {
	bArray.forEach(function(bookmark) {
		if(bookmark.bmAction == 1 && bookmark.bmURL != '') {
			loglines = logit('Info: Try to remove bookmark '+bookmark.bmURL);
			browser.bookmarks.search({url: bookmark.bmURL}).then(function(removeItems) {
				removeItems.forEach(function(removeBookmark) {
					if(removeBookmark.dateAdded == bookmark.bmAdded) {
						browser.bookmarks.onRemoved.removeListener(onRemovedCheck);
						browser.bookmarks.remove(removeBookmark.id).then(function(remove) {
							loglines = logit('Info: Bookmark '+removeBookmark.url+' removed');
							browser.bookmarks.onRemoved.addListener(onRemovedCheck);
						},onRejected);
					}
				});
			},onRejected);
		}
		else {
			if(!bookmark.fdID.endsWith('___')) {
				loglines = logit('Info: Changed bookmark is in userfolder');
				browser.bookmarks.search({title: bookmark.fdName}).then(function(folderItems) {
					folderItems.forEach(function(folder) {
						if(folder.index == bookmark.fdIndex) {
							browser.bookmarks.search({url: bookmark.bmURL}).then(function(bookmarkItems) {
								if (bookmarkItems.length) {
									if (bookmark.fdName != bookmarkItems[0].parentId) {
										browser.bookmarks.onMoved.removeListener(onMovedCheck);
										browser.bookmarks.move(bookmarkItems[0].id, {parentId: folder.id}).then(function(move) {
											loglines = logit('Info: '+move.url + " moved to folder " + folder.title);
											browser.bookmarks.onMoved.addListener(onMovedCheck);
										},onRejected);
									}
								} else {
									browser.bookmarks.onCreated.removeListener(onCreatedCheck);
									browser.bookmarks.create({ type: bookmark.bmType, parentId: folder.id, title: bookmark.bmTitle, url: bookmark.bmURL }).then(function() {
										loglines = logit('Info: '+bookmark.bmURL + " added as new bookmark");
										browser.bookmarks.onCreated.addListener(onCreatedCheck);
									},onRejected);
								}
							},onRejected);
							return false;
						}
					});
				}, onRejected);
			}
			else {
				loglines = logit('Info: Changed bookmark is in systemfolder');
				if(bookmark.bmURL != '') {
					loglines = logit('Info: Try to add bookmark '+bookmark.bmURL);
					browser.bookmarks.search({url: bookmark.bmURL}).then(function(bookmarkItems) {
						if (bookmarkItems.length) {
							if(bookmarkItems[0].parentId != bookmark.fdID) {
								browser.bookmarks.onMoved.removeListener(onMovedCheck);
								browser.bookmarks.move(bookmarkItems[0].id, {parentId: bookmark.fdID}).then(function(move) {
									loglines = logit('Info: '+move.url + " moved to folder " + bookmark.fdName);
									browser.bookmarks.onMoved.addListener(onMovedCheck);
								},onRejected);
							}
						} else {
							browser.bookmarks.onCreated.removeListener(onCreatedCheck);
							browser.bookmarks.create({ type: bookmark.bmType, parentId: bookmark.fdID, title: bookmark.bmTitle, url: bookmark.bmURL }).then(function() {
								loglines = logit('Info: '+bookmark.bmURL + " added as new bookmark.");
								browser.bookmarks.onCreated.addListener(onCreatedCheck);
							},onRejected);
						}
					},onRejected);
				}
			}
		}
	});
}

function getDAVMarks() {
	checkSettings();
	var xhr = new XMLHttpRequest();
	xhr.open('GET', davurl + '/' + filename + '?t=' + Math.random(), true);
	xhr.withCredentials = true;
	xhr.setRequestHeader('X-Filename', filename);
	xhr.setRequestHeader("Authorization", 'Basic ' + btoa(user + ":" + pw));
	
	xhr.onload = function () {		
		if( xhr.status != 200 ) {
			message = browser.i18n.getMessage("errorGetBookmarks") + xhr.status;
			notify('error',message);
			loglines = logit('Error: '+message);
		}
		else {
			let DAVMarks = JSON.parse(xhr.responseText);
			browser.bookmarks.onCreated.removeListener(onCreatedCheck);
			browser.bookmarks.onRemoved.removeListener(onRemovedCheck);
			pMarks = [];
			let parsedMarks = parseMarks(DAVMarks, index=0);
			count = 0;
			addAllMarks(parsedMarks);			
		}
	}
	loglines = logit('Info: Requesting bookmarks from WebDAV Server');
	xhr.send();
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
	browser.bookmarks.onRemoved.removeListener(onRemovedCheck);
	browser.bookmarks.getTree().then(function(tree) {
		tree[0].children.forEach(function(mainfolder) {
			mainfolder.children.forEach(function(userfolder) {
				browser.bookmarks.onRemoved.removeListener(onRemovedCheck);
				browser.bookmarks.removeTree(userfolder.id);
			});
		});
	});
	browser.bookmarks.onRemoved.addListener(onRemovedCheck);
	browser.storage.local.set({
		last_s: 1,
	});
}

function importMarks(parsedMarks, index=0) {
    let bmid = parsedMarks[index].bmID;
    let bmparentId = parsedMarks[index].bmParentID;
    let bmindex = parseInt(parsedMarks[index].bmIndex,10);
    let bmtitle = parsedMarks[index].bmTitle;
    let bmtype = parsedMarks[index].bmType;
    let bmurl = parsedMarks[index].bmURL;
	let bmdate = parsedMarks[index].bmAdded;
    let newParentId = (typeof bmparentId !== 'undefined' && bmparentId.substr(bmparentId.length - 2) == "__") ? bmparentId : dictOldIDsToNewIDs[bmparentId];
	
	if(bmparentId == "root________") {
		importMarks(parsedMarks, ++index);
		return false;
	}
	loglines = logit('Info: Removing listeners');
	browser.bookmarks.onCreated.removeListener(onCreatedCheck);
	browser.bookmarks.onMoved.removeListener(onMovedCheck);
	browser.bookmarks.onRemoved.removeListener(onRemovedCheck);
	browser.bookmarks.onChanged.removeListener(onChangedCheck);

	browser.bookmarks.create(
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
	).then(function(node) {
		let newID = bmid.substr(bmid.length - 2) == "__" ? bmid : node.id;
		dictOldIDsToNewIDs[bmid] = newID;
		++count;

		if (typeof parsedMarks[index+1] == 'undefined') {
			message = count + browser.i18n.getMessage("successImportBookmarks");
			notify('info',message);
			loglines = logit('Info: ' + message + ' Re-adding the listeners now');
			browser.bookmarks.onCreated.addListener(onCreatedCheck);
			browser.bookmarks.onMoved.addListener(onMovedCheck);
			browser.bookmarks.onRemoved.addListener(onRemovedCheck);
			browser.bookmarks.onChanged.addListener(onChangedCheck);
		}
		else {
			importMarks(parsedMarks, ++index);
		}
	}, function(err) {
		message = browser.i18n.getMessage("errorImportBookmark") + '\"' + bmtitle + ' (' + bmurl + ')\"';
		notify('error', message);
		loglines = logit('Error: ' + message);
	});
}

function addAllMarks(parsedMarks, index=1) {
	browser.bookmarks.onCreated.removeListener(onCreatedCheck);
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
	
	browser.bookmarks.create(
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
		)
	).then(function(node) {
		let newID = bmid.substr(bmid.length - 2) == "__" ? bmid : node.id;
		dictOldIDsToNewIDs[bmid] = newID;
		++count;

		if (typeof parsedMarks[index+1] !== 'undefined') {
			addAllMarks(parsedMarks, ++index);
			
		}
		else {
			message = count + browser.i18n.getMessage("successImportBookmarks");
			notify('info',message);
			loglines = logit('Info: '+message);
			browser.bookmarks.onCreated.addListener(onCreatedCheck);
			browser.bookmarks.onRemoved.addListener(onRemovedCheck);
			
			let datems = Date.now();
			let date = new Date(datems);
			let doptions = { weekday: 'long',  hour: '2-digit', minute: '2-digit' };
			browser.storage.local.set({
				last_s: datems,
			});
			browser.browserAction.setTitle({title: browser.i18n.getMessage("extensionName") + ": " + date.toLocaleDateString(undefined,doptions)});
		}
	}, function(err) {
		message = browser.i18n.getMessage("errorImportBookmark") +  '\"' + bmtitle + ' (' + bmurl + ')\".';
		notify('error', message);
		loglines = logit('Error: '+message);
	});
}

function onError(error) {
	message = 'Error: ${error}';
	notify('error', message);
	loglines = logit(message);
}

function onGot(item) {
	s_startup = item.s_startup || false;
	s_create = item.s_create || false;
	s_remove = item.s_remove || false;
	s_change = item.s_change || false;
	last_s = item.last_s || 0;
	
	davurl = item.wdurl || "";
	user = item.user || "";
	pw = item.password || "";
	
	s_uuid = item.s_uuid || '';
	s_type = item.s_type || '';
	
	if(s_uuid.length <= 0) {
		browser.storage.local.set({
			s_uuid: uuidv4(),
		});
	}
	
	if(davurl.length <= 0 || user.length <= 0 || pw.length <= 0 || s_uuid.length <= 0) {
		message = browser.i18n.getMessage("infoEmptyConfig");
		notify('setting', message);
		loglines = logit('Info: '+message);
	}
}

function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  )
}