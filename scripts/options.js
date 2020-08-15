var background_page = chrome.extension.getBackgroundPage();
const abrowser = (/Firefox/.test(navigator.userAgent)) ? "firefox" : "chrome";

function checkForm() {
	if(document.getElementById('wdurl').value != '' && document.getElementById('user').value != '' && document.getElementById('password').value != '' && document.querySelector('input[name="stype"]:checked').value != true){
        document.getElementById('ssubmit').disabled=false;
		document.getElementById('mdownload').disabled=false;
		document.getElementById('mupload').disabled=false;
		document.getElementById('mremove').disabled=false;
    }
	else{
        document.getElementById('ssubmit').disabled=true;
		document.getElementById('mdownload').disabled=true;
		document.getElementById('mupload').disabled=true;
		document.getElementById('mremove').disabled=false;
	}
	
	if(document.getElementById('php').checked)
		document.getElementById('clientn').classList.add('clients');
	else
	document.getElementById('clientn').classList.remove('clients');
}

function saveOptions(e) {
	e.preventDefault();
	if(typeof last_sync === "undefined" || last_sync.toString().length <= 0) {
		document.getElementById("smessage").textContent = chrome.i18n.getMessage("optionsNotUsed");
	}
	chrome.storage.local.set({
		s_startup: document.querySelector("#s_startup").checked,
		s_create: document.querySelector("#s_create").checked,
		s_remove: document.querySelector("#s_remove").checked,
		s_change: document.querySelector("#s_change").checked,
		s_type: document.querySelector('input[name="stype"]:checked').value,
		s_uuid: document.querySelector("#s_uuid").value,
	});
	rName(document.querySelector("#cname").value);
	let cdata = "client=" + document.querySelector("#s_uuid").value + "&caction=tl&t="+abrowser;
	var xhr = new XMLHttpRequest();
	xhr.open("POST", document.querySelector("#wdurl").value, true);
	xhr.withCredentials = true;
	xhr.setRequestHeader("Authorization", 'Basic ' + btoa(document.querySelector("#user").value + ":" + document.querySelector("#password").value));
	xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	let message = document.getElementById('wmessage');
	xhr.onload = function () {
		switch(xhr.status) {
			case 404: 	message.textContent = chrome.i18n.getMessage("optionsErrorURL");
						message.style.cssText = "background: #ff7d52; padding: 3px; margin: 2px;";
						break;
			case 401:	message.textContent = chrome.i18n.getMessage("optionsErrorUser");
						message.style.cssText = "background: #ff7d52; padding: 3px; margin: 2px;";
						break;
			case 200:	message.textContent = chrome.i18n.getMessage("optionsSuccessLogin");
						message.style.cssText = "background: #98FB98; padding: 3px; margin: 2px;";
						chrome.storage.local.set({
							wdurl: document.querySelector("#wdurl").value,
							user: document.querySelector("#user").value,
							password: document.querySelector("#password").value,
						});
						break;
			default:	message.textContent = chrome.i18n.getMessage("optionsErrorLogin") + xhr.status;
						message.style.cssText = "background: #ff7d52; padding: 3px; margin: 2px;";
						break;
		}
	};
	xhr.send(cdata);
}

function rName(name) {
	chrome.storage.local.get(null, function(options) {
		var xhr = new XMLHttpRequest();
		let cdata = "cido="+options['s_uuid']+"&arename=1&nname="+name;
		xhr.open("POST", options['wdurl'], true);
		xhr.setRequestHeader("Authorization", 'Basic ' + btoa(options['user'] + ":" + options['password']));
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		xhr.withCredentials = true;
		xhr.onload = function () {
			if( xhr.status < 200 || xhr.status > 226) {
				message = "Error set name of client."  + xhr.status;
				notify('error',message);
				loglines = logit('Error: '+message);
			}
		}
		xhr.send(cdata);
	});
}

function gName() {
	chrome.storage.local.get(null, function(options) {
		var xhr = new XMLHttpRequest();
		let cdata = "cl="+options['s_uuid']+"&caction=gname";
		xhr.open("POST", options['wdurl'], true);
		xhr.setRequestHeader("Authorization", 'Basic ' + btoa(options['user'] + ":" + options['password']));
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		xhr.withCredentials = true;
		xhr.onload = function () {
			if( xhr.status < 200 || xhr.status > 226) {
				message = "Error get name of client."  + xhr.status;
				notify('error',message);
				loglines = logit('Error: '+message);
			} else {
				var response = JSON.parse(xhr.responseText);
			}
			document.querySelector("#cname").value = response.cname;
			document.querySelector("#cname").title = options['s_uuid'] + " (" + response.ctype + ")";
		}
		xhr.send(cdata);
	});
}

function restoreOptions() {
	chrome.storage.local.get(null, function(options) {
		document.querySelector("#wdurl").value = options['wdurl'] || "";
		document.querySelector("#bend").href = options['wdurl'] || "";
		document.querySelector("#user").value = options['user'] || "";
		document.querySelector("#password").value = options['password'] || "";
		document.querySelector("#s_uuid").value = options['s_uuid'] || background_page.uuidv4();
		gName();
		document.querySelector("#cname").placeholder = document.querySelector("#s_uuid").value;
		document.querySelector("#s_startup").checked = options['s_startup'] || false;
		document.querySelector("#s_create").checked = options['s_create'] || false;
		document.querySelector("#s_remove").checked = options['s_remove'] || false;
		document.querySelector("#s_change").checked = options['s_change'] || false;

		if("s_type" in options)
			document.querySelector('input[name="stype"][value="'+ options['s_type'] +'"]').checked = true;

		last_sync = options['last_sync'] || 0;
		if(last_sync.toString().length > 0) {
			document.querySelector("#s_startup").removeAttribute("disabled");
		}

		checkForm();
	});
}

function manualImport() {
	var bookmarks = chrome.bookmarks.search({});
	bookmarks.then(doImport, background_page.onRejected);
	
	function doImport(bookmarks) {
		let count = 0;
		for (item of bookmarks) {
			if(typeof item.url !== 'undefined' && item.url.startsWith("http"))
				count++;
		}
		
		if(count > 0) {
			let modal = document.getElementById('importConfirm');
			let impMessage = document.getElementById('impMessage');
			var span = document.getElementsByClassName("close")[0];
			
			modal.style.display = "block";
			span.onclick = function() {
				modal.style.display = "none";
			}
			
			impMessage.textContent = chrome.i18n.getMessage("optionsBeforeImport", count);
			
			document.getElementById('impYes').onclick = function(e) {
				background_page.removeAllMarks();
				chrome.storage.local.set({last_s: 1});
				if(document.querySelector('input[name="stype"]:checked').value == 'WebDAV') {
					background_page.getDAVMarks();
					modal.style.display = "none";
				}
				else if(document.querySelector('input[name="stype"]:checked').value == 'PHP') {
					background_page.getAllPHPMarks();
					modal.style.display = "none";
				}
			};
			document.getElementById('impNo').onclick = function(e) {
				if(document.querySelector('input[name="stype"]:checked').value == 'WebDAV') {
					background_page.getDAVMarks();
					modal.style.display = "none";
				}
				else if(document.querySelector('input[name="stype"]:checked').value == 'PHP') {
					background_page.getAllPHPMarks();
					modal.style.display = "none";
				}
			};
			document.getElementById('impCancel').onclick = function(e) {
				modal.style.display = "none";
			};
		}
		else {
			chrome.storage.local.set({last_s: 1});
			document.querySelector("#s_startup").removeAttribute("disabled");
			if(document.querySelector('input[name="stype"]:checked').value == 'WebDAV') {
				background_page.getDAVMarks();
			}
			else if(document.querySelector('input[name="stype"]:checked').value == 'PHP') {
				background_page.getAllPHPMarks();
			}
		}
	}
}

function manualRemove() {
	if(confirm(chrome.i18n.getMessage("optionsInfoRemove"))) {
		background_page.removeAllMarks();
		chrome.storage.local.set({last_s: 1});
	}
}

function manualExport() {
	var background_page = chrome.extension.getBackgroundPage();

	if(document.querySelector('input[name="stype"]:checked').value == 'WebDAV') {
		background_page.saveAllMarks();
	}
	else if(document.querySelector('input[name="stype"]:checked').value == 'PHP') {
		background_page.exportPHPMarks();
	}
}

function getLog() {
	if(this.checked) {
		document.getElementById("logarea").style.display = "block";
		document.getElementById("logarea").value = background_page.loglines;
	}
	else {
		document.getElementById("logarea").style.display = "none";
	}
}

function checkCheckbox() {
	document.getElementById("mdebug").checked = true;
	document.getElementById("logarea").style.display = "block";
	document.getElementById("logarea").value = background_page.loglines;
}

function localizeHtmlPage() {
    var objects = document.getElementsByTagName('span');
    for (var j = 0; j < objects.length; j++) {
        var obj = objects[j];
        var valStrH = obj.innerHTML.toString();
        var valNewH = valStrH.replace(/__MSG_(\w+)__/g, function(match, v1) {
            return v1 ? chrome.i18n.getMessage(v1) : "";
        });

        if(valNewH != valStrH) {
			obj.innerText = valNewH;
        }
    }
}

document.addEventListener("DOMContentLoaded", restoreOptions, {passive: true});

window.addEventListener('load', function () {
	localizeHtmlPage();
	document.querySelector("form").addEventListener("submit", saveOptions);
	document.getElementById("mdownload").addEventListener("click", manualImport, {passive: true});
	document.getElementById("mupload").addEventListener("click", manualExport, {passive: true});
	document.getElementById("mremove").addEventListener("click", manualRemove, {passive: true});
	document.getElementById("wdurl").addEventListener("keyup", checkForm, {passive: true});
	document.getElementById("user").addEventListener("keyup", checkForm, {passive: true});
	document.getElementById("password").addEventListener("keyup", checkForm, {passive: true});
	document.getElementById("wdav").addEventListener("input", checkForm, {passive: true});
	document.getElementById("php").addEventListener("input", checkForm, {passive: true});
	document.getElementById("s_startup").addEventListener("input", checkForm, {passive: true});
	document.getElementById("s_create").addEventListener("input", checkForm, {passive: true});
	document.getElementById("s_change").addEventListener("input", checkForm, {passive: true});
	document.getElementById("s_remove").addEventListener("input", checkForm, {passive: true});
	document.getElementById("mdebug").addEventListener("change", getLog, {passive: true});
}, {passive: true});