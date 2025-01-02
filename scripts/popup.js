var clone;
document.addEventListener("DOMContentLoaded", function(event) {
	chrome.storage.local.get(null, function(options) {
		let tarr = {
			client:options.uuid,
			token:options.token
		};
		//tarr['client'] = options.uuid;
		//tarr['token'] = options.token;
		let authtype = 'Bearer ' + btoa(encodeURIComponent(JSON.stringify(tarr)));
		fetch(options.instance + '?t=' + Math.random().toString(24).substring(2, 12), {
			method: "GET",
			cache: "no-cache",
			referrerPolicy: "no-referrer",
			headers: {
				'Authorization': authtype,
			}
		}).then(response => {
			let xRinfo = response.headers.get("X-Request-Info");
			if (xRinfo != null) {
				chrome.storage.local.set({token:xRinfo});
			}
			return response.text();
		}).then(html => {
			let parser = new DOMParser();
			let doc = parser.parseFromString(html, "text/html")
			document.getElementById('bookmarks').innerHTML = doc.getElementById('bookmarks').innerHTML;
	
			addClick();
			urlExists();
	
			clone = document.getElementById('bookmarks').cloneNode(true);
		}).catch(err => {
			console.error(err);
			chrome.runtime.sendMessage({action: "changeIcon", data: 'error'});
		});
	});

	search = document.getElementById("search");
	document.getElementById("settings").addEventListener('click', e => {
		chrome.runtime.openOptionsPage();
	});

	document.getElementById("addbm").addEventListener('click', e => {
		chrome.runtime.sendMessage({action: "bookmarkTab"});
		window.close();
	});
});

search.addEventListener('input', function(e) {
	let filter = e.currentTarget.value;
	let bookmarks = document.querySelectorAll('#bookmarks li.file');
	let bdiv = document.getElementById('bookmarks');

	if(e.currentTarget.value === ''){
		cSearch();
		addClick();
	} else {
		bdiv.innerHTML = '';
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
	document.getElementById('bookmarks').innerHTML = clone.innerHTML;
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