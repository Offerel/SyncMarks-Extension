var background_page = browser.extension.getBackgroundPage();

function checkForm() {
	if(document.getElementById('wdurl').value != '' && document.getElementById('user').value != '' && document.getElementById('password').value != ''){
        document.getElementById('ssubmit').disabled=false;
		document.getElementById('mdownload').disabled=false;
		document.getElementById('mupload').disabled=false;
    }
	else{
        document.getElementById('ssubmit').disabled=true;
		document.getElementById('mdownload').disabled=true;
		document.getElementById('mupload').disabled=true;
    }
}

function saveOptions(e) {
	e.preventDefault();
	
	browser.storage.local.set({
		s_startup: document.querySelector("#s_startup").checked,
		s_create: document.querySelector("#s_create").checked,
		s_remove: document.querySelector("#s_remove").checked,
		s_change: document.querySelector("#s_change").checked,
	});
	
	var xhr = new XMLHttpRequest();
	xhr.open("GET", document.querySelector("#wdurl").value, true);
	xhr.withCredentials = true;
	xhr.setRequestHeader("Authorization", 'Basic ' + btoa(document.querySelector("#user").value + ":" + document.querySelector("#password").value));
	xhr.onload = function () {
		switch(xhr.status) {
			case 404: 	document.getElementById('wmessage').innerHTML = "Login failed: Please check the WebDAV URL. It should be in a form like https://servername/folder";
						document.getElementById('wmessage').style.cssText = "background: #ff7d52; padding: 3px; margin: 2px;";
						break;
			case 401:	document.getElementById('wmessage').innerHTML = "Login failed: Please check username and password";
						document.getElementById('wmessage').style.cssText = "background: #ff7d52; padding: 3px; margin: 2px;";
						break;
			case 200:	document.getElementById('wmessage').innerHTML = "Login successfully. Options saved";
						document.getElementById('wmessage').style.cssText = "background: #98FB98; padding: 3px; margin: 2px;";
						browser.storage.local.set({
							wdurl: document.querySelector("#wdurl").value,
							user: document.querySelector("#user").value,
							password: document.querySelector("#password").value,
							webdav_check: document.querySelector("#webdav_check").checked,
							//local_check: document.querySelector("#local_check").checked,
							//lcpath: document.querySelector("#lcpath").value
						});
						break;
			default:	document.getElementById('wmessage').innerHTML = "Login failed: Status = " + xhr.status;
						document.getElementById('wmessage').style.cssText = "background: #ff7d52; padding: 3px; margin: 2px;";
						break;
		}
	};
	xhr.send();
	
}

function restoreOptions() {
	function setCurrentChoice(result) {
		document.querySelector("#wdurl").value = result.wdurl || "";
		document.querySelector("#user").value = result.user || "";
		document.querySelector("#password").value = result.password || "";
		document.querySelector("#webdav_check").checked = result.webdav_check || true;
		//document.querySelector("#local_check").checked = result.local_check || false;
		//document.querySelector("#lcpath").value = result.lcpath || "";
		
		document.querySelector("#s_startup").checked = result.s_startup || false;
		document.querySelector("#s_create").checked = result.s_create || false;
		document.querySelector("#s_remove").checked = result.s_remove || false;
		document.querySelector("#s_change").checked = result.s_change || false;
		toggleFieldset();
		checkForm();
	}

	function onError(error) {
		console.log(`Error: ${error}`);
	}

	var getting = browser.storage.local.get();
	getting.then(setCurrentChoice, onError);
}

function toggleFieldset() {
	var dav_toggle = document.getElementById("webdav_set");
	var local_toggle = document.getElementById("local_set");
	document.getElementById("webdav_check").checked ? dav_toggle.disabled = false : dav_toggle.disabled = true;
	document.getElementById("local_check").checked ? local_toggle.disabled = false : local_toggle.disabled = true;
}

function manualImport() {
	if(confirm("When you continue, all your current bookmarks are removed and replaced by the bookmarks from the WebDAV server. Are you sure?")) {
		background_page.getDAVMarks();
	}
}

function manualExport() {
	background_page.saveMarks();
}

function syncWarning() {
	if(document.getElementById("s_startup").checked) {
		if(confirm("Warning: If you use \"Firefox Sync\" and activate the option \"Browser startup\", this will lead to duplicate bookmarks. Should this option still be activated?")) {
			document.getElementById("s_startup").checked = true;
		}
		else {
			document.getElementById("s_startup").checked = false;
		}
	}
}

document.querySelector("form").addEventListener("change", toggleFieldset);
document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
document.getElementById("mdownload").addEventListener("click", manualImport);
document.getElementById("mupload").addEventListener("click", manualExport);

document.getElementById("wdurl").addEventListener("keyup", checkForm);
document.getElementById("user").addEventListener("keyup", checkForm);
document.getElementById("password").addEventListener("keyup", checkForm);

document.getElementById("s_startup").addEventListener("input", syncWarning);