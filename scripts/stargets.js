var background_page = chrome.extension.getBackgroundPage();

document.addEventListener("DOMContentLoaded", lCLients, {passive: true});

document.getElementById('settings').addEventListener('click', function() {
	var settingsurl = chrome.extension.getURL('scripts/options.html');
	chrome.tabs.query({'url': settingsurl}, function(tabs) {
		if(tabs.length == 0) {
			chrome.runtime.openOptionsPage();
			window.close();
		} else {
			chrome.tabs.update(this.id, { active: true });
			window.close();
		}
	});
});

document.getElementById('add').addEventListener('click', function(){
	let fselect = document.getElementById('fselect');
	fselect.style.display = 'block';
});

document.getElementById('addBm').addEventListener('click', function(){
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.storage.local.get(null, function(options) {
			let xhr = new XMLHttpRequest();
			let data = 'caction=madd&folder='+document.getElementById('bfolders').value+'&url='+encodeURIComponent(tabs[0].url);
			xhr.open('POST', options['wdurl'], true);
			xhr.setRequestHeader('Authorization', 'Basic ' + options['creds']);
			xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
			xhr.withCredentials = true;
			xhr.onload = function () {
				if( xhr.status < 200 || xhr.status > 226) {
					console.error('Error: Could not get site data');
				} else {
					console.log('Info: Bookmark created');
					window.close();
				}
			}
			xhr.send(data);
		});
	});
});

document.getElementById('bfolders').addEventListener('change', function(){
	let folder = this.value;
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.storage.local.get(null, function(options) {
			let xhr = new XMLHttpRequest();
			let data = 'caction=madd&folder='+folder+'&url='+encodeURIComponent(tabs[0].url);
			xhr.open('POST', options['wdurl'], true);
			xhr.setRequestHeader('Authorization', 'Basic ' + options['creds']);
			xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
			xhr.withCredentials = true;
			xhr.onload = function () {
				if( xhr.status < 200 || xhr.status > 226) {
					console.error('Error: Could not get site data');
				} else {
					console.log('Info: Bookmark created');
					window.close();
				}
			}
			xhr.send(data);
		});
	});
});

function lCLients() {
	document.getElementById('share').addEventListener('click', function(){
		let clist = document.getElementById('clist');
		clist.style.display = (clist.style.display === 'block') ? 'none':'block';
	});

	chrome.permissions.getAll(function(e) {
		if(e.permissions.includes('bookmarks')) {
			chrome.tabs.query({'url': chrome.extension.getURL('scripts/options.html')}, function(tabs) {
				if(tabs.length == 0) {
					chrome.runtime.openOptionsPage();
					window.close();
				} else {
					chrome.tabs.update(this.id, { active: true });
					window.close();
				}
			});
		} else {
			let xhr = new XMLHttpRequest();
			let data = "caction=maddon";
			chrome.storage.local.get(null, function(options) {
				xhr.open("POST", options['wdurl'], true);
				xhr.setRequestHeader("Authorization", 'Basic ' + options['creds']);
				xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
				xhr.withCredentials = true;
				xhr.onload = function () {
					if( xhr.status < 200 || xhr.status > 226) {
						console.log('Error: Could not get site data');
					} else {
						if(xhr.responseText.length > 2) {
							let response = JSON.parse(xhr.responseText);
							let dom = new DOMParser().parseFromString(response['bookmarks'], 'text/html').body.childNodes[0];
							document.querySelector('body').replaceChild(dom, document.getElementById('bookmarks'));

							let uFolders = response['folders'];
							let selBox = document.getElementById('bfolders');
							uFolders.forEach(function(folder){
								let opt = document.createElement('option');
								opt.value = folder['bmID'];
								opt.text = folder['bmTitle'];
								if(folder['bmID'] == 'unfiled_____') opt.selected = true;
								opt.addEventListener('click', addBm, true);
								selBox.add(opt, null);
							});
							uFolders.selectedIndex = -1; 
						}
					}
				}
				xhr.send(data);
			});
		}
	});

    var clientl = document.getElementById("clist");
	
	while (clientl.firstChild) {
        clientl.removeChild(clientl.firstChild);
    }
	
	chrome.storage.local.get(null, function(options) {
		let clist = options.clist;

		if(typeof clist !== 'undefined') {
			clist.forEach(function(client){
				let cli = document.createElement("li");
				let ctitle = client.name ? client.name:client.id;
				cli.textContent = ctitle;
				cli.id = client.id;
				clientl.appendChild(cli);
			});
		}
		
	});
	
    clientl.addEventListener("click", function(element) {
        background_page.sendTab(element);
        window.close();
    });
}