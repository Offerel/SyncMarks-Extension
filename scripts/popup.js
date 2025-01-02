var clone;
document.addEventListener("DOMContentLoaded", function(event) {
	chrome.storage.local.get(null, function(options) {
		let tarr = {};
		tarr['client'] = options.uuid;
		tarr['token'] = options.token;
		let authtype = 'Bearer ' + btoa(encodeURIComponent(JSON.stringify(tarr)));
		fetch(options.instance, {
			method: "GET",
			cache: "no-cache",
			referrerPolicy: "no-referrer",
			headers: {
			//	'Content-type': 'application/json;charset=UTF-8',
				'Authorization': authtype,
			}
			//body: JSON.stringify(params)
		}).then(response => {
			let xRinfo = response.headers.get("X-Request-Info");
			if (xRinfo != null) {
				if(xRinfo == 0) {
					chrome.storage.local.remove('token');
					//changeIcon('error');
					console.error('token removed');
				} else {
					chrome.storage.local.set({token:xRinfo});
					console.log(xRinfo);
				}
			}
			return response.text();
		}).then(html => {
			console.log(html)
			let parser = new DOMParser();
			let doc = parser.parseFromString(html, "text/html")
			document.getElementById('bookmarks').innerHTML = doc.getElementById('bookmarks').innerHTML;
	
			addClick();
	
			clone = document.getElementById('bookmarks').cloneNode(true);
		}).catch(err => {
			console.error(err);
		});
	});

	search = document.getElementById("search");
	document.getElementById("settings").addEventListener('click', e => {
		chrome.runtime.openOptionsPage();
	});

	document.getElementById("addbm").addEventListener('click', e => {
		bookmarkTab();
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

		console.log(jsonMark);

		//sendRequest(bookmarkAdd, jsonMark);
	});
}