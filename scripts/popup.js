var clone;
chrome.storage.local.get(null, function(options) {
	document.getElementById('loader').classList.add('loader');
	let authheader = 'Bearer ' + btoa(encodeURIComponent(JSON.stringify({
		client:options.uuid,
		token:options.token
	})));

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
	}).catch(err => {
		console.error(err);
		chrome.runtime.sendMessage({action: "changeIcon", data: 'error'});
	});

	document.getElementById('loader').classList.remove('loader');
});

search = document.getElementById("search");
document.getElementById("settings").addEventListener('click', function() {
	chrome.runtime.openOptionsPage();
	window.close();
});

document.getElementById("addbm").addEventListener('click', addBookmark);

chrome.storage.local.get(null, function(options) {
	if(options.popup !== undefined) {
		popupMessage(options.popup.message, options.popup.mode);
	}
});

search.addEventListener('input', function(e) {
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

function cSearch() {
	let bookmarks = document.getElementById('bookmarks');
	while(bookmarks.firstChild) bookmarks.removeChild(bookmarks.firstChild);
	while(clone.firstChild) bookmarks.appendChild(clone.firstChild);
	clone = bookmarks.cloneNode(true);
}

function addClick() {
	document.querySelectorAll('.file').forEach(function(bookmark){
		bookmark.addEventListener('mouseup', function(e) {
			window.open(e.target.dataset.url, '_blank', 'noopener,noreferrer');
		}, false);
	});
}

function urlExists() {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		let tabURL = tabs[0].url;
		let urlExists = false;
		let bookmarks = document.querySelectorAll('.file');

		for (let i = 0; i < bookmarks.length; i++) {
			bmURL = bookmarks[i].children[0].dataset.url;
			if(tabURL === bmURL) {
				urlExists = true;
				break;
			}
		}

		if(urlExists) {
			document.getElementById('svgfilled').style.display = 'inline';
			document.getElementById('svgoutline').style.display = 'none';
		} else {
			document.getElementById('svgfilled').style.display = 'none';
			document.getElementById('svgoutline').style.display = 'inline';
		}
	});
}

function popupMessage(message, state) {
	let mdiv = document.getElementById('popupMessage');
	mdiv.innerText = message;
	mdiv.className = 'show ' + state;
	setTimeout(function(){
		mdiv.classList.remove('show');
		chrome.storage.local.remove('popup');
		chrome.action.setBadgeText({text: ''});
	}, 5000);
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
}