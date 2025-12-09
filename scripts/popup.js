var clone;
var bmIDs = new Array();

getData();

document.getElementById("settings").addEventListener('click', function() {
	chrome.runtime.openOptionsPage();
	window.close();
});

document.getElementById("addbm").addEventListener('click', addBookmark);
document.getElementById("refresh").addEventListener('click', getData);
document.getElementById('cyes').addEventListener('click', cbtn);
document.getElementById('cno').addEventListener('click', cbtn);
document.getElementById('vline').textContent = 'v'+chrome.runtime.getManifest().version;

chrome.storage.session.get(null, function(data) {
	if(data.popup !== undefined) {
		popupMessage(data.popup.message, data.popup.mode);
		chrome.action.setBadgeText({text: ''});
	} else {
		setTimeout(function(){
			chrome.action.setBadgeText({text: ''});
		}, 3000);
	}
});

document.getElementById("search").addEventListener('input', function(e) {
	let filter = e.currentTarget.value;
	let bookmarks = document.querySelectorAll('#bookmarks li.file');
	let bdiv = document.getElementById('bookmarks');

	if(e.currentTarget.value === ''){
		cSearch();
		addClick();
	} else {
		while(bdiv.firstChild) bdiv.removeChild(bdiv.firstChild);
		bookmarks.forEach(bookmark => {
			bdiv.appendChild(bookmark);
			if(bookmark.innerText.toUpperCase().includes(filter.toUpperCase()) || bookmark.firstChild.dataset.url.toUpperCase().includes(filter.toUpperCase())) {
				bookmark.style.display = 'block';
				bookmark.style.paddingLeft = '20px';
			} else {
				bookmark.style.display = 'none';
			}
		});
	}
});

document.addEventListener('keyup', keypress);

document.addEventListener('contextmenu', function(e) {
	e.preventDefault();
});

localizePopup();

function getData(e) {
	chrome.storage.local.get(null, async function(options) {
		if(options.token === undefined) {
			popupMessage('Invalid credentials', 'error');
			return false;
		}
		document.getElementById('loader').classList.add('loader');
		let authheader = 'Bearer ' + btoa(encodeURIComponent(JSON.stringify({
			client:options.uuid,
			token:options.token
		})));

		if(e !== undefined) {
			chrome.storage.session.remove("bmhtml");
			let bookmarks = document.getElementById('bookmarks');
			while (bookmarks.firstChild) {
				bookmarks.removeChild(bookmarks.lastChild);
			}
		}
		
		const data = await chrome.storage.session.get("bmhtml");
		
		if(data.bmhtml === undefined) {
			let ldata = {message: 'No bookmarks for PopUp found', type: 'info', source: 'PopUp, getData'};
			chrome.runtime.sendMessage({action: "loglines", data: ldata});
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
				let parser = new DOMParser();
				let doc = parser.parseFromString(html, "text/html");
				let bookmarks = document.getElementById('bookmarks');
				clone = doc.getElementById('bookmarks').cloneNode(true);
				while(clone.firstChild) bookmarks.appendChild(clone.firstChild);
				addClick();
				urlExists();
				clone = document.getElementById('bookmarks').cloneNode(true);
				chrome.storage.session.set({bmhtml: html});
				document.getElementById('loader').classList.remove('loader');
			}).catch(err => {
				console.error(err);
				chrome.runtime.sendMessage({action: "changeIcon", data: 'error'});
				let ldata = {message: err, type: 'error', source: 'PopUp, getData'};
				chrome.runtime.sendMessage({action: "loglines", data: ldata});
				document.getElementById('loader').classList.remove('loader');
			});
		} else {
			chrome.runtime.sendMessage({action: "loglines", data: {message: 'Info: PopUp data already in session', type: 'info', source: 'PopUp, getData'}});
			let parser = new DOMParser();
			let doc = parser.parseFromString(data.bmhtml, "text/html");
			let bookmarks = document.getElementById('bookmarks');
			clone = doc.getElementById('bookmarks').cloneNode(true);
			while(clone.firstChild) bookmarks.appendChild(clone.firstChild);
			addClick();
			urlExists();
			clone = document.getElementById('bookmarks').cloneNode(true);
			document.getElementById('loader').classList.remove('loader');
		}
	});
}

function keypress(e) {
	if(e.keyCode === 46 && bmIDs.length > 0) showBox();
}

function cbtn(e) {
	if(e.target.id === 'cyes') {
		chrome.runtime.sendMessage({action: "bmRemove", data: bmIDs});
		chrome.runtime.sendMessage({action: "puData"});
	}

	document.getElementById('bglayer').style.display = 'none';
	bmIDs = [];
	window.close();
}

function showBox() {
	document.getElementById('msgText').innerText = chrome.i18n.getMessage("optionsPuDelConfirm");
	document.getElementById('bglayer').style.display = 'block';
}

function cSearch() {
	let bookmarks = document.getElementById('bookmarks');
	while(bookmarks.firstChild) bookmarks.removeChild(bookmarks.firstChild);
	while(clone.firstChild) bookmarks.appendChild(clone.firstChild);
	clone = bookmarks.cloneNode(true);
}

function addClick() {
	document.querySelectorAll('.file').forEach(function(bookmark){
		bookmark.addEventListener('mouseup', function(e) {
			if(e.button === 1) {
				chrome.tabs.create({url: e.target.dataset.url, active: false});
			}

			if(e.button === 0) {
				if(!e.ctrlKey) {
					chrome.tabs.create({url: e.target.dataset.url, active: true});
				} else {
					chrome.tabs.create({url: e.target.dataset.url, active: false});
				}

			} else {
				if(e.ctrlKey) {
					if(e.target.classList.contains('bmMarked')) {
						e.target.classList.remove('bmMarked');
						bmIDs.indexOf(e.target.id) !== -1 && bmIDs.splice(bmIDs.indexOf(e.target.id), 1)
					} else {
						e.target.classList.add('bmMarked');
						bmIDs.push(e.target.id);
					}
				}
			}
		}, false);
		return false;
	});
}

function urlExists() {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		let tabURL = tabs[0].url;
		let urlExists = false;
		let bookmarks = document.querySelectorAll('.file');
		let tbutton = document.getElementById('addbm').children[0];

		for (let i = 0; i < bookmarks.length; i++) {
			bmURL = bookmarks[i].children[0].dataset.url;
			if(tabURL === bmURL) {
				urlExists = true;
				break;
			}
		}

		tbutton.attributes.fill.nodeValue = (urlExists) ? "gold":"currentColor";
	});
}

function popupMessage(message, state) {
	let mdiv = document.getElementById('popupMessage');
	mdiv.innerText = message;
	mdiv.className = 'show ' + state;
	setTimeout(function(){
		mdiv.classList.remove('show');
		chrome.storage.session.remove('popup');
		chrome.action.setBadgeText({text: ''});
	}, 3000);
}

function addBookmark() {
	chrome.storage.local.get(null, function(options) {
		chrome.permissions.getAll(function(e) {
			if(options.sync === false || e.permissions.includes('bookmarks') === false) {
				chrome.runtime.sendMessage({action: "bookmarkTab"});
				window.close();
			} else {
				chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
					let createBookmark = chrome.bookmarks.create({
						title: tabs[0].title,
						url: tabs[0].url,
					}, function(newE) {
						window.close();
					});
				});
			}
		});
	});

	chrome.runtime.sendMessage({action: "puData"});
}

function localizePopup() {
	document.getElementById('settings').title = chrome.i18n.getMessage("optionsBTNSettings");
	document.getElementById('refresh').title = chrome.i18n.getMessage("popupRefresh");
	document.getElementById('addbm').title = chrome.i18n.getMessage("popupAdd");
}