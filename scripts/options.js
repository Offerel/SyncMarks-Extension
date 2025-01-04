chrome.runtime.onMessage.addListener(
	function(message, sender, sendResponse) {
		if(sender.id === chrome.runtime.id) {
			switch (message.task) {
				case 'clientInfo':
					document.getElementById("cname").title = (message.cname) ? document.getElementById('s_uuid').value + " (" + message.ctype + ")":document.getElementById('s_uuid').value;
					if(message !== null) document.getElementById("cname").defaultValue = (message.cname == document.getElementById('s_uuid').value) ? '':message.cname;
					let iBox = document.getElementById("lgini");
					let ip = document.getElementById('ipinfo');
					iBox.style.display = 'block';
					if(message.cinfo != undefined) {
						ip.innerText = message.cinfo.ip;
						let ipinfo = document.createElement('span');
						ipinfo.className = "iiinfo";
						ipinfo.id = "iiinfo";
						let tm = new Date(message.cinfo.tm * 1000).toLocaleString();
						ipinfo.innerText = tm + '\n' + message.cinfo.de + ' | ' + message.cinfo.co + ' | ' + message.cinfo.ct + ' | ' + message.cinfo.re + '\n' + message.cinfo.ua;
						if(document.getElementById('iiinfo')) document.getElementById('iiinfo').remove();
						ip.after(ipinfo);
					}
					break;
				case 'bookmarkImport':
					showMsg(chrome.i18n.getMessage(message.text), (message.type === 'error') ? 'error':'info');
					break;
				case 'bookmarkExport':
					showMsg(message.text, (message.type === 'error') ? 'error':'info');
					break;
				case 'clientRename':
					showMsg(message.text, (message.type === 'error') ? 'error':'info');
					break;
				case 'rLoglines':
					rLoglines(message.text);
					break;
				case 'clientOptions':
					requestClientOptions(message.cOptions, false);
					break;
				default:
					break;
			}
		}
	}
);

function showMsg(text, type) {
	let wmessage = document.getElementById('wmessage');
	wmessage.textContent = text;
	wmessage.style.cssText = (type == 'info') ? "border-color: green; background-color: #98FB98;":"border-color: red; background-color: lightsalmon;";
	wmessage.className = "show";
	setTimeout(function(){wmessage.className = wmessage.className.replace("show", "hide"); }, 5000);
}

function checkForm() {
	let url = document.getElementById('wdurl');
	if(url.classList.contains('valid')) {
		document.getElementById('blogin').disabled = false;
	}

	chrome.permissions.getAll(function(e) {
		if(e.permissions.includes('bookmarks')) {
			if(url.value != ''){
				document.getElementById('mdownload').disabled=false;
				document.getElementById('mupload').disabled=false;
			} else{
				document.getElementById('mdownload').disabled=true;
				document.getElementById('mupload').disabled=true;
			}
		} else {
			document.getElementById('mdownload').disabled=true;
			document.getElementById('mupload').disabled=true;
			document.getElementById('s_auto').checked = false;
			document.getElementById('s_auto').disabled = true;
		}
	});	
}

function checkLoginForm() {
	if(document.getElementById('nuser').value != '' && document.getElementById('npassword').value != '' ) {
		document.getElementById('lgin').disabled = false;
	} else {
		document.getElementById('lgin').disabled = true;
	}
}

function gToken(e) {
	e.preventDefault();
	document.getElementById('blogin').classList.add('loading');
	document.getElementById('crdialog').style.display = "none";

	const params = {
		action: "clientCheck",
		client: document.getElementById('s_uuid').value,
		sync: document.getElementById('s_auto').checked
	};

	const url = document.getElementById('wdurl').value;
	const creds = btoa(document.getElementById('nuser').value + ':' + document.getElementById('npassword').value);
	const headers = new Headers();
	headers.append("Content-Type", "application/json;charset=UTF-8");
	headers.append("Authorization", 'Basic ' + creds);

	const myRequest = fetch(url + '?api=v1', {
		method: "POST",
		body: JSON.stringify(params),
		headers: headers,
		redirect: 'follow',
		referrerPolicy: 'no-referrer',
	}).then(response => response.json()).then(responseData => {
		document.getElementById('blogin').classList.remove('loading');

		let cOptions = {
			sync: document.getElementById("s_auto").checked,
			direct: document.getElementById("b_action").checked,
			name: document.getElementById("cname").value,
			uuid: document.getElementById("s_uuid").value,
			tabs: document.getElementById("s_tabs").checked,
			instance: document.getElementById("wdurl").value
		};

		cOptions.token = responseData.token;

		chrome.storage.local.set(cOptions);
		document.getElementById('blogin').removeAttribute('style')
		chrome.action.setBadgeText({text: 'i'});
		chrome.action.setBadgeBackgroundColor({color: "chartreuse"});
		chrome.action.setTitle({title: chrome.i18n.getMessage("extensionName")});
		setTimeout(function(){
			chrome.action.setBadgeText({text: ''});
		}, 5000);

		document.getElementById('cname').defaultValue = responseData.cname;
		
		if(responseData.message.indexOf('updated') !== -1 || responseData.message.indexOf('registered') !== -1) {
			wmessage.textContent = responseData.message;
			wmessage.style.cssText = "border-color: green; background-color: #98FB98;";
			requestClientOptions(responseData.cOptions);
		} else {
			wmessage.textContent = 'Warning: '+ responseData.message;
			wmessage.style.cssText = "border-color: red; background-color: lightsalmon;";
			chrome.runtime.sendMessage({action: "loglines", data: 'Syncmarks Warning: '+ responseData.message});
		}
	}).catch(err => {
		wmessage.style.cssText = "border-color: red; background-color: lightsalmon;";
		chrome.runtime.sendMessage({action: "loglines", data: err});
		switch(response.status) {
			case 404:	wmessage.textContent = chrome.i18n.getMessage("optionsErrorURL") + err;
						break;
			case 401:	wmessage.textContent = chrome.i18n.getMessage("optionsErrorUser") + err;
						break;
			default:	wmessage.textContent = chrome.i18n.getMessage("optionsErrorLogin") + response.status + err;
		}
		chrome.runtime.sendMessage({action: "loglines", data: 'Syncmarks Error: ' + wmessage.textContent});
	});

	wmessage.className = "show";
	setTimeout(function(){wmessage.className = wmessage.className.replace("show", "hide"); }, 5000);
}

function saveOptions(e) {
	if(typeof e !== "undefined") {
		e.preventDefault();
		if(e.srcElement.id === 's_auto' && e.srcElement.checked) {
			document.getElementById("b_action").checked = false;
			document.getElementById("b_action").disabled = true;
			document.getElementById("s_tabs").disabled = false;
		} else if (e.srcElement.id === 's_auto' && !e.srcElement.checked) {
			document.getElementById("b_action").disabled = false;
			document.getElementById("s_tabs").checked = false;
			document.getElementById("s_tabs").disabled = true;
		}
	
		if(e.srcElement.id === 's_tabs' && e.srcElement.checked) {
			document.getElementById("s_auto").checked = true;
		}
	
		if(e.srcElement.id === 'b_action' && e.srcElement.checked) {
			document.getElementById("s_auto").checked = false;
			document.getElementById("s_tabs").disabled = true;
		} else if(e.srcElement.id === 'b_action' && !e.srcElement.checked) {
			document.getElementById("s_tabs").disabled = false;
		}
	}

	let text = chrome.i18n.getMessage("optionsSuccessSave");
	let type = 'info';

	if(typeof last_sync === "undefined" || last_sync.toString().length <= 0) {
		text = chrome.i18n.getMessage("optionsNotUsed");
		type = 'error';
	}

	const cOptions = {
		sync: document.getElementById("s_auto").checked,
		direct: document.getElementById("b_action").checked,
		name: document.getElementById("cname").value,
		uuid: document.getElementById("s_uuid").value,
		tabs: document.getElementById("s_tabs").checked,
		instance: document.getElementById("wdurl").value
	};

	chrome.storage.local.set(cOptions);
	chrome.runtime.sendMessage({action: "clientSendOptions", data: cOptions});

	showMsg(text, type);
}

function rName() {
	chrome.runtime.sendMessage({action: "clientRename", data: this.value});
}

function gName() {
	chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
		chrome.runtime.sendMessage({action: "clientInfo", tab: tabs[0]['id']});
	});
}

function uuidv4() {
	return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
		(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
	)
}

function restoreOptions() {
	chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
		chrome.runtime.sendMessage({action: "clientInfo", tab: tabs[0]['id']});
	});

	chrome.storage.local.get(null, function(options) {
		if(options.instance == undefined) {
			showMsg(chrome.i18n.getMessage("infoEmptyConfig"), 'info');
		}
		document.querySelector("#wdurl").defaultValue = options.instance || "";
		checkURL();
		
		if(options.uuid === undefined) {
			let nuuid = uuidv4();
			document.getElementById("s_uuid").defaultValue = nuuid;
			document.getElementById("cname").placeholder = nuuid;
		} else {
			document.getElementById("s_uuid").defaultValue = options.uuid;
			document.getElementById("cname").placeholder = options.name;
		}

		document.getElementById("s_auto").defaultChecked = options.sync;
		document.getElementById("b_action").defaultChecked = options.direct;
		
		gName();
		document.querySelector("#cname").placeholder = document.querySelector("#s_uuid").defaultValue;
		if(options.token === undefined) {
			document.getElementById("blogin").disabled = false;
			document.getElementById("blogin").style.backgroundColor = "red";
		}
		document.getElementById("s_tabs").defaultChecked = (options.tabs == undefined) ? false:options.tabs;
	
		last_sync = options.last_sync || 0;
		if(last_sync.toString().length > 0) {
			document.querySelector("#s_auto").removeAttribute("disabled");
		}
		
		checkForm();
		
		chrome.commands.getAll((commands) => {
			for (let {name, shortcut} of commands) {
				var s = (name === 'bookmark-tab') ? shortcut:'undef';
			}
			document.getElementById("obmd").title = chrome.i18n.getMessage('bookmarkTab') + ` (${s})`;
		});
		
	});
}

function manualImport(e) {
	e.preventDefault();
	if (this.id === 'iyes') {
		chrome.runtime.sendMessage({action: "removeAllMarks"});
	}
	
	try {
		chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
			chrome.runtime.sendMessage({action: "bookmarkExport", data: 'json', tab: tabs[0]['id']});
		});
	} catch(error) {
		chrome.runtime.sendMessage({action: "loglines", data: error});
	} finally {
		document.getElementById("impdialog").style.display = "none";
		chrome.storage.local.set({last_s: 1});
	}
}

function manualExport(e) {
	e.preventDefault();
	try {
		chrome.runtime.sendMessage({action: "exportPHPMarks"});
	} catch(error) {
		chrome.runtime.sendMessage({action: "loglines", data: error});
	} finally {
		document.getElementById("expdialog").style.display = "none";
		chrome.storage.local.set({last_s: 1});
	}
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

	document.getElementById('oauto').title = chrome.i18n.getMessage("ManAuto");
	document.getElementById('nuser').placeholder = chrome.i18n.getMessage("optionsUsername");
	document.getElementById('npassword').placeholder = chrome.i18n.getMessage("optionsPassword");
	document.getElementById('title').innerText = chrome.i18n.getMessage("extensionName") + " - " + chrome.i18n.getMessage("optionsBTNSettings");
	document.getElementById('obmc').title = chrome.i18n.getMessage("optionsTabsHint");
}

function filterLog() {
	chrome.runtime.sendMessage({action: "getLoglines"});
}

function rLoglines(loglines) {
	let larea = document.getElementById("logarea");
	let lines = loglines.split("\n");
	let debug = document.getElementById('logdebug').checked;
	let tlines = new Array();

	lines.forEach(function(line, key) {
		if(debug) {
			tlines.push(line);
		} else if(!debug && line.indexOf("Debug:") < 0) {
			tlines.push(line);
		}
	});

	let rlines = tlines.join("\n");
	let logp = new DOMParser().parseFromString(rlines, 'text/html').body;

	var existingLog=larea.querySelector('body');
	if(existingLog) {
		existingLog.replaceWith(logp);
	} else {
		larea.appendChild(logp);
	}
}

function openTab(tabname) {
	let x = document.getElementsByClassName("otabs");
	let larea = document.getElementById("logarea");

	if(larea.childNodes.length > 2) {
		larea.removeChild(larea.childNodes[2]); 
	}

	if(tabname.target.innerText == 'Logfile') {
		chrome.runtime.sendMessage({action: "getLoglines"});
	}
	
	for (var i = 0; i < x.length; i++) {
		x[i].style.display = "none";
	}

	document.getElementById(tabname.target.attributes['data-val'].value).style.display = "block";
	document.querySelectorAll('.tab-button').forEach(function(e) {
		e.classList.remove("abutton");
	});
	document.querySelector('button[data-val="'+ tabname.target.attributes['data-val'].value +'"]').classList.add("abutton");
}

function saveLog() {
	var logfile = document.querySelector("#logarea body").innerText;
	var element = document.createElement('a');
	element.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(logfile);
	element.download = 'SyncMarks.log';
	element.style.display = 'none';
	document.body.appendChild(element);
	element.click();
	document.body.removeChild(element);
}

function clearLog() {
	chrome.runtime.sendMessage({action: "emptyLoglines"});
}

function switchBackend() {
	let backendPHP = this.checked;

	if(backendPHP) {
		document.getElementById("blbl").innerText = chrome.i18n.getMessage("backendType");
		document.getElementById('cname').disabled = false;
		document.getElementById('b_action').disabled = false;
		document.getElementById('b_action').parentElement.querySelector('.slider').style.pointerEvents = 'unset';
		document.getElementById('b_action').parentElement.querySelector('.slider').style.backgroundColor = ''
	} else {
		document.getElementById('cname').disabled = true;
		document.getElementById('b_action').disabled = true;
		document.getElementById('b_action').parentElement.querySelector('.slider').style.pointerEvents = 'none';
		document.getElementById('b_action').parentElement.querySelector('.slider').style.backgroundColor = 'lightgrey'
	}

	saveOptions();
}

function requestHostPermission() {
	const instance = document.getElementById('wdurl');
	let newOrigin = new URL(instance.value).origin + '/*';
	chrome.permissions.request({
		origins: [newOrigin]
	}, (granted) => {
		const message = (granted) ? 'Syncmarks: Access to ' + newOrigin + ' granted':'Syncmarks Warning: Access to ' + newOrigin + ' denied';
		chrome.runtime.sendMessage({action: "loglines", data: message});
		checkURL();
	});
}

function requestClientOptions(cOptions, av = false) {
	chrome.storage.local.get(null, function(options) {
		if(cOptions !== undefined && cOptions.length > 0) {
			select = document.getElementById('cimport');
			select.length = 0;
			cOptions.forEach((client) => {
				var opt = document.createElement('option');
				opt.value = client['cOptions'];
				opt.innerText = client['cname']
				select.appendChild(opt);
				if(options.uuid == client['cid']) av = true;
			});
	
			if(!av) document.getElementById('coptionsdialog').style.display = 'block';
		}
	});
}

function serverImport() {
	const current_uuid = document.getElementById('s_uuid').value;
	const url = document.getElementById('wdurl').value;
	const clientSelect = document.getElementById("cimport");
	const restored_Options = JSON.parse(clientSelect.value);
	let selectedText = clientSelect.options[clientSelect.selectedIndex].text;

	const restored_uuid = restored_Options.uuid;
	const creds = btoa(document.getElementById('nuser').value + ':' + document.getElementById('npassword').value);

	document.getElementById('cname').value = (selectedText != restored_Options.name) ? selectedText:restored_Options.name;
	document.getElementById("s_tabs").checked = restored_Options.tabs;
	document.getElementById("s_auto").checked = restored_Options.sync;
	document.getElementById("b_action").checked = restored_Options.direct;

	document.getElementById("coptionsdialog").style.display = "none";

	saveOptions();

	setTimeout(() => {
		if(confirm(chrome.i18n.getMessage("infoRestoreID"))) {
			const params = {
				action: 'clientRemove',
				client: current_uuid,
				data: {
					new: current_uuid,
					old: restored_uuid
				}
			}
		
			fetch(url + '?api=v1', {
				method: "POST",
				cache: "no-cache",
				headers: {
					'Content-type': 'application/json;charset=UTF-8',
					'Authorization': 'Basic ' + creds,
				},
				redirect: "follow",
				referrerPolicy: "no-referrer",
				body: JSON.stringify(params)
			}).then(response => {
				let xRinfo = response.headers.get("X-Request-Info");
				if (xRinfo != null) chrome.storage.local.set({token:xRinfo});
				return response.json();
			}).then(responseData => {
				chrome.runtime.sendMessage({action: "loglines", data: 'Info: Old client removed'});
			}).catch(err => {
				//console.warn(err);
			});
		}
	}, 500);
}

function checkURL() {
	let url = document.getElementById('wdurl');
	var xhr = new XMLHttpRequest();
	xhr.open("GET", url.value, true);
	xhr.onreadystatechange = function () {
		if(xhr.readyState === 4 && xhr.status === 204) {
			url.classList.add('valid');
			url.nextElementSibling.classList.add('valid');
			url.classList.remove('invalid');
			url.nextElementSibling.classList.remove('invalid');
			document.getElementById('blogin').disabled = false;
		} else {
			url.classList.add('invalid');
			url.nextElementSibling.classList.add('invalid');
			url.classList.remove('valid');
			url.nextElementSibling.classList.remove('valid');
			document.getElementById('blogin').disabled = true;
		}
	}
	xhr.setRequestHeader('X-Action', 'verify');
	xhr.send(null);
}

document.addEventListener("DOMContentLoaded", restoreOptions);

window.addEventListener('load', function () {
	var rawFile = new XMLHttpRequest();
	rawFile.open("GET", "../CHANGELOG.md", true);
	rawFile.responseType = "text";
    rawFile.onreadystatechange = function () {
		if(rawFile.readyState === 4) {
			if(rawFile.status === 200 || rawFile.status == 0) {
				document.getElementById("changelog").innerText = rawFile.responseText;
			}
		}
	}
    rawFile.send(null);

	var imodal = document.getElementById("impdialog");
	var emodal = document.getElementById("expdialog");
	var comodal = document.getElementById("expimpdialog");
	var cmodal = document.getElementById("coptionsdialog");

	localizeHtmlPage();

	document.getElementById('version').textContent = chrome.runtime.getManifest().version;
	document.getElementById("econf").addEventListener("click", function() {comodal.style.display = "block"});
	document.getElementById("cclose").addEventListener("click", function() {comodal.style.display = "none";});
	document.getElementById("cimp").addEventListener("click", function(e){
		e.preventDefault();
		e.stopPropagation();
		comodal.style.display = "none";
		chrome.runtime.sendMessage({action: "clientGetOptions"});
	});
	document.getElementById("logdebug").addEventListener('change', filterLog);
	document.getElementById("iyes").addEventListener("click", manualImport);
	document.getElementById("eyes").addEventListener("click", manualExport);
	document.getElementById("ino").addEventListener("click", manualImport);
	document.getElementById("coimport").addEventListener("click", function(e) {
		e.preventDefault();
		e.stopPropagation();
		serverImport();
	});
	document.getElementById("cochancel").addEventListener("click", function(e) {
		e.preventDefault();
		e.stopPropagation();
		cmodal.style.display = "none";
	});
	document.getElementById("lchancel").addEventListener("click", function(e) {
		e.preventDefault();
		e.stopPropagation();
		document.getElementById("crdialog").style.display = "none";
	});
	document.getElementById("imchancel").addEventListener("click", function(e) {
		e.preventDefault();
		e.stopPropagation();
		document.getElementById("expimpdialog").style.display = "none";
	});
	document.getElementById("eno").addEventListener("click", function() { emodal.style.display = "none";});
	document.getElementById("iclose").addEventListener("click", function() {imodal.style.display = "none";});
	document.getElementById("eclose").addEventListener("click", function() {emodal.style.display = "none";});
	document.getElementById("oclose").addEventListener("click", function() {cmodal.style.display = "none";});
	document.getElementById("crclose").addEventListener("click", function() {document.getElementById("crdialog").style.display = "none";});
	document.getElementById("mdownload").addEventListener("click", function() {imodal.style.display = "block"});
	document.getElementById("mupload").addEventListener("click", function() {emodal.style.display = "block"});
	document.getElementById("wdurl").addEventListener("blur", function() {
		requestHostPermission();
		checkURL();
	});
	document.getElementById("wdurl").addEventListener("change", checkForm);
	document.getElementById("blogin").addEventListener("click", function(e) {
		e.preventDefault();
		e.stopPropagation();
		requestHostPermission();
		document.getElementById("nuser").defaultValue = '';
		document.getElementById("npassword").defaultValue = '';
		document.getElementById("crdialog").style.display = "block";
		document.getElementById("nuser").focus();
	});

	document.getElementById("nuser").addEventListener("input", checkLoginForm);
	document.getElementById("npassword").addEventListener("input", checkLoginForm);
	document.getElementById('lgin').addEventListener("click", gToken);
	document.getElementById("b_action").addEventListener("change", saveOptions);
	document.getElementById("s_tabs").addEventListener("change", saveOptions);
	document.getElementById("s_auto").addEventListener("change", saveOptions);
	document.getElementById("cname").addEventListener("change", rName);
	document.querySelectorAll(".tab-button").forEach(function(e){ e.addEventListener("click", openTab);});
	document.getElementById("logsave").addEventListener("click", saveLog);
	document.getElementById("logclear").addEventListener("click", clearLog);
	document.querySelector('h1').addEventListener('click', function(){
		window.open(document.getElementById('wdurl').value);
	});

	window.onclick = function(event) {
		if (event.target == imodal) {
			imodal.style.display = "none";
		}
		if (event.target == emodal) {
			emodal.style.display = "none";
		}
	}
});
