//var background_page = chrome.extension.getBackgroundPage();
//var background_page = runtime.getBackgroundPage();

chrome.runtime.onMessage.addListener((message, sender) => {
	if(sender.id === chrome.runtime.id) {
		if(message.ctype) {
			document.getElementById("cname").title = (message.cname) ? document.getElementById('s_uuid').value + " (" + message.ctype + ")":document.getElementById('s_uuid').value;
			if(message !== null) document.getElementById("cname").defaultValue = (message.cname == document.getElementById('s_uuid').value) ? '':message.cname;
		} else if (message.cInfo) {
			let cInfo = JSON.parse(message.cInfo);
			let iBox = document.getElementById("lgini");
			let ip = document.getElementById('ipinfo');
			iBox.style.display = 'block';
			ip.innerText = cInfo.ip;
			let ipinfo = document.createElement('span');
			let tm = new Date(cInfo.tm * 1000).toLocaleString();
			ipinfo.innerText = tm + ' | ' + cInfo.de + ' | ' + cInfo.co + ' | ' + cInfo.ct + ' | ' + cInfo.re + '\n' + cInfo.ua;
			ip.appendChild(ipinfo);
		} else if (message.type == 'bimport' ) {
			let type = (message.text == "successExportBookmarks") ? "info":"error";
			showMsg(chrome.i18n.getMessage(message.text), type);
		} else if (message.type == 'bexport' ) {
			let type = (message.text.includes("Bookmarks received")) ? "info":"error";
			showMsg(message.text, type);
		}
	}
});

function showMsg(text, type) {
	let wmessage = document.getElementById('wmessage');
	wmessage.textContent = text;
	wmessage.style.cssText = (type == 'info') ? "border-color: green; background-color: #98FB98;":"border-color: red; background-color: lightsalmon;";
	wmessage.className = "show";
	setTimeout(function(){wmessage.className = wmessage.className.replace("show", "hide"); }, 3000);
}

function checkForm() {
	if((document.getElementById('wdurl').value != '') && (document.getElementById('wdurl').value != document.getElementById('wdurl').defaultValue)) {
		document.getElementById("lginl").style.visibility = 'visible';
		chrome.storage.local.set({
			actions: {
				crsrv:document.getElementById("b_action").checked
			},	
			s_type: document.querySelector('input[name="stype"]:checked').value,
			s_uuid: document.getElementById("s_uuid").value,
			wdurl: document.getElementById("wdurl").value,
		});
	}

	chrome.permissions.getAll(function(e) {
		if(e.permissions.includes('bookmarks')) {
			if(document.getElementById('wdurl').value != '' && document.querySelector('input[name="stype"]:checked').value !== true){
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

function checkForm2() {
	if(document.getElementById('nuser').value != '' && document.getElementById('npassword').value != '' ) {
		document.getElementById('lgin').disabled = false;
	} else {
		document.getElementById('lgin').disabled = true;
	}
}

function gToken(e) {
	e.preventDefault();
	let tbt = document.getElementById('tbt').checked;
	document.getElementById('lginl').classList.add('loading');
	document.getElementById('crdialog').style.display = "none";
	let xhr = new XMLHttpRequest();

	const params = {
		action: "clientCheck",
		client: document.getElementById('s_uuid').value,
		data: {
			usebasic: tbt
		},
		sync: document.getElementById('s_startup').checked
	}

	
	let rnd = Math.floor((Math.random() * 100) + 1) + '.txt';
	var url = document.getElementById('wdurl').value;	

	if(document.getElementById('php_webdav').checked) {
		xhr.open("POST", url, true);
	} else {
		url = url.endsWith('/') ? url.slice(0, -1):url;
		url = url + "/" + rnd;
		xhr.open("PUT", url, true);
	}

	var creds = btoa(document.getElementById('nuser').value + ':' + document.getElementById('npassword').value);
	xhr.setRequestHeader('Authorization', 'Basic ' + creds);
	xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
			
	xhr.withCredentials = true;
	xhr.onload = function () {
		switch(xhr.status) {
			case 404: 	console.error('Syncmarks Error: '+chrome.i18n.getMessage("optionsErrorURL"));
						showMsg(chrome.i18n.getMessage("optionsErrorURL"), 'error');
						break;
			case 401:	console.error('Syncmarks Error: '+chrome.i18n.getMessage("optionsErrorUser"));
						showMsg(chrome.i18n.getMessage("optionsErrorUser"), 'error');
						break;
			case 200:	let rp = xhr.responseText;
						let response = (rp.indexOf('<') === -1) ? JSON.parse(rp):'0';
						if(response.length > 0 && response.token == undefined || response.token.length != 0) {
							document.getElementById('lginl').classList.remove('loading');
							document.getElementById('lginl').style.visibility = "hidden";
							chrome.storage.local.set({
								wdurl: document.getElementById('wdurl').value,
								s_type: 'PHP',
							});

							if(tbt) {
								chrome.storage.local.set({creds: creds});
								chrome.storage.local.remove('token');
							} else {
								chrome.storage.local.set({token: response.token});
								chrome.storage.local.remove('creds');
							}

							document.getElementById('cname').defaultValue = response.cname;
						}

						if(typeof response.message === 'undefined') {
							showMsg('Your endpoint does not send a expected answer. Please check the URL', 'error');
							console.warn('Your endpoint does not send a expected answer. Please check the URL');
						} else  if(response.message.indexOf('updated') == 7 || response.message.indexOf('registered') == 7) {
							showMsg(chrome.i18n.getMessage("optionsSuccessLogin"), 'info');
						} else {
							showMsg('Warning: '+ response.message, 'error');
							console.warn(response.message);
						}
						
						break;
			case 201:	xhr.open("DELETE", url, true);
						xhr.onload = function () {
							let status = this.status;
							if(status >= 200 || status < 300) {
								document.getElementById('lginl').classList.remove('loading');
								document.getElementById('lginl').style.visibility = "hidden";
								chrome.storage.local.set({
									wdurl: document.getElementById('wdurl').value,
									creds: creds,
									s_type: 'WebDAV',
								});
								document.getElementById('cname').defaultValue = response.cname;
								chrome.storage.local.remove("token");
							} else {
								document.getElementById('lginl').classList.remove('loading');
								chrome.storage.local.set({
									wdurl: document.getElementById('wdurl').value,
									creds: '',
									s_type: 'WebDAV',
								});
								document.getElementById('cname').defaultValue = response.cname;
								chrome.storage.local.remove("token");
							}
						}
						xhr.send(cdata);
						break;			
			default:	console.error('Syncmarks Error: '+chrome.i18n.getMessage("optionsErrorLogin") + xhr.status);
						showMsg(chrome.i18n.getMessage("optionsErrorLogin") + xhr.status, 'error');
						break;
		} 

		chrome.runtime.getBackgroundPage(
			function(bgpage){
				bgpage.init();
			}
		)
	};

	xhr.send(JSON.stringify(params));
}

function saveOptions(e) {
	if(typeof e !== "undefined") e.preventDefault();

	let text = chrome.i18n.getMessage("optionsSuccessLogin");
	let type = 'info';

	if(typeof last_sync === "undefined" || last_sync.toString().length <= 0) {
		text = chrome.i18n.getMessage("optionsNotUsed");
		type = 'error';
	}

	chrome.storage.local.set({
		actions: {
			startup:document.getElementById("s_startup").checked,
			create:document.getElementById("s_create").checked,
			change:document.getElementById("s_change").checked,
			remove:document.getElementById("s_remove").checked,
			crsrv:document.getElementById("b_action").checked
		},

		s_type: document.querySelector('input[name="stype"]:checked').value,
		s_uuid: document.getElementById("s_uuid").value,
		s_tabs: document.getElementById("s_tabs").checked,
		wdurl: document.getElementById("wdurl").value,
	});

	showMsg(text, type);
}

function rName() {
	let name = this.value;
	chrome.runtime.getBackgroundPage(
		function(background){
			background.sendRequest(background.clientRename, name);
		}
	)
}

function gName() {
	chrome.runtime.getBackgroundPage(
		function(background){
			background.clientInfo();
		}
	)
}

function uuidv4() {
	return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
		(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
	)
}

function restoreOptions() {
	chrome.storage.local.get(null, function(options) {
		if(options['wdurl'] == undefined) {
			showMsg(chrome.i18n.getMessage("infoEmptyConfig"), 'info');
		}
		document.querySelector("#wdurl").defaultValue = options['wdurl'] || "";		
		
		if(options['s_uuid'] === undefined) {
			let nuuid = uuidv4();
			document.getElementById("s_uuid").defaultValue = nuuid;
			document.getElementById("cname").placeholder = nuuid;
		} else {
			document.getElementById("s_uuid").defaultValue = options['s_uuid'];
			document.getElementById("cname").placeholder = options['s_uuid'];
		}

		document.getElementById("s_startup").defaultChecked = (options['actions'] == undefined) ? true:options['actions']['startup'];
		document.getElementById("s_create").defaultChecked = (options['actions'] == undefined) ? true:options['actions']['create'];
		document.getElementById("s_change").defaultChecked = (options['actions'] == undefined) ? true:options['actions']['change'];
		document.getElementById("s_remove").defaultChecked = (options['actions'] == undefined) ? true:options['actions']['remove'];
		document.getElementById("b_action").defaultChecked = (options['actions'] == undefined) ? false:options['actions']['crsrv'];

		if(document.getElementById("s_startup").checked && document.getElementById("s_create").checked && document.getElementById("s_change").checked && document.getElementById("s_remove").checked) {
			document.getElementById("s_auto").defaultChecked = true;
		} else {
			document.getElementById("s_auto").defaultChecked = false;
		}
		
		if("s_type" in options) {		
			document.querySelector('input[name="stype"][value="'+ options['s_type'] +'"]').defaultChecked = true;
			if(options['s_type'] == 'PHP') {
				gName();
				document.querySelector("#cname").placeholder = document.querySelector("#s_uuid").defaultValue;
				document.getElementById("php_webdav").checked = true;
				if(options['token'] === undefined && options['creds'] === undefined) {
					chrome.runtime.getBackgroundPage(
						function(background){
							background.clientInfo();
						}
					)
					
					document.getElementById("lginl").style.visibility = 'visible';
				}
				document.getElementById("s_tabs").defaultChecked = (options['s_tabs'] == undefined) ? false:options['s_tabs'];
			} else {
				document.getElementById("php_webdav").checked = false;
				if(options['creds'] === undefined) {
					document.getElementById("lginl").style.visibility = 'visible';
				}
				document.getElementById("s_tabs").defaultChecked = false;
			}
		}
		
		last_sync = options['last_sync'] || 0;
		if(last_sync.toString().length > 0) {
			document.querySelector("#s_startup").removeAttribute("disabled");
		}
		
		if(document.getElementById("wdurl").value.length > 4) document.getElementById("cexp").disabled = false;
		checkForm();
		
		chrome.commands.getAll((commands) => {
			for (let {name, shortcut} of commands) {
				var s = (name === 'bookmark-tab') ? shortcut:'undef';
			}
			document.getElementById("obmd").title = document.getElementById("obmd").title + ` (${s})`;
		});
		
	});
}

function exportOptions(e) {
	e.preventDefault();
	chrome.storage.local.get(null, function(options) {
		delete options.clist;
		delete options.token;
		delete options.creds;
		delete options.last_message;
		delete options.pTabs;

		let confJSON = JSON.stringify(options);
		let dString = new Date().toISOString().slice(0,10);
		let nameStr = document.getElementById('cname').value.replace(/[^a-z0-9]/gi, '_').toLowerCase();
		var element = document.createElement('a');
		element.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(confJSON);
		element.download = 'SyncMarks_' + nameStr + '_' + dString + '.json';
		element.style.display = 'none';
		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
		document.getElementById('expimpdialog').style.display = 'none';
	});
}

function importOptions() {
	let resCID = confirm(chrome.i18n.getMessage("infoRestoreID"));
	let file = document.getElementById("confinput").files[0];
	let reader = new FileReader();
	reader.addEventListener('load', function(e) {
		let ioptions = JSON.parse(e.target.result);
		
		chrome.storage.local.set({
			actions: {
				startup:ioptions.actions.startup,
				create:ioptions.actions.create,
				change:ioptions.actions.change,
				remove:ioptions.actions.remove
			},
			s_type: ioptions.s_type,
			wdurl: ioptions.wdurl,
			s_uuid: ioptions.s_uuid,
		});

		if(resCID) {
			document.getElementById("cname").placeholder = ioptions.s_uuid;
			document.getElementById("s_uuid").value = ioptions.s_uuid;
			document.getElementById("lginl").style.visibility = 'hidden';
		}

		document.getElementById("wdurl").value = ioptions.wdurl;
		document.getElementById("s_startup").checked = ioptions.actions.startup;
		document.getElementById("s_create").checked = ioptions.actions.create;
		document.getElementById("s_change").checked = ioptions.actions.change;
		document.getElementById("s_remove").checked = ioptions.actions.remove;
		document.getElementById("b_action").checked = ioptions.actions.crsrv;
		document.getElementById("s_auto").checked = (ioptions.actions.startup && ioptions.actions.create && ioptions.actions.change && ioptions.actions.remove) ? true:false;
		document.getElementById("s_tabs").checked = ioptions.s_tabs;

		showMsg(chrome.i18n.getMessage("optionsSuccessImport"), 'info');
	});
	reader.readAsText(file);
	document.getElementById("expimpdialog").style.display = "none";
	
	setTimeout(() => {  if(resCID) { gName(); } }, 200);
	setTimeout(() => {  checkForm(); }, 200);
}

function manualImport(e) {
	e.preventDefault();
	if (this.id === 'iyes') chrome.runtime.getBackgroundPage().removeAllMarks();

	try {
		chrome.storage.local.get(null, function(options) {
			if(options['s_type'] == 'PHP') {
				chrome.runtime.getBackgroundPage().sendRequest(chrome.runtime.getBackgroundPage().bexport, 'json');
			} else if (options['s_type'] == 'WebDAV') {
				chrome.runtime.getBackgroundPage().getDAVMarks();
			}
		});
	} catch(error) {
		chrome.runtime.getBackgroundPage().loglines = chrome.runtime.getBackgroundPage().logit(error);
	} finally {
		document.getElementById("impdialog").style.display = "none";
		chrome.storage.local.set({last_s: 1});
	}
}

function manualExport(e) {
	e.preventDefault();
	//var background_page = chrome.extension.getBackgroundPage();
	//var background_page = runtime.getBackgroundPage();
	try {
		if(document.querySelector('input[name="stype"]:checked').value == 'WebDAV') {
			chrome.runtime.getBackgroundPage().saveAllMarks();
		} else if (document.querySelector('input[name="stype"]:checked').value == 'PHP') {
			chrome.runtime.getBackgroundPage().exportPHPMarks();
		}
	} catch(error) {
		chrome.runtime.getBackgroundPage().loglines = chrome.runtime.getBackgroundPage().logit(error);
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

	document.getElementById('blbl').title = chrome.i18n.getMessage("backendType");
	document.getElementById('oauto').title = chrome.i18n.getMessage("ManAuto");
	document.getElementById('obmd').title = chrome.i18n.getMessage("toBackend") + "";
}

function filterLog() {
	let larea = document.getElementById("logarea");
	let debug = document.getElementById('logdebug').checked;
	let lines = chrome.runtime.getBackgroundPage().loglines.split("\n");
	let tlines = new Array();
	let rlines = "";

	if(larea.childNodes.length > 2) {
		larea.removeChild(larea.childNodes[2]); 
	}
	
	if(!debug) {
		lines.forEach(function(line) {
			if(line.indexOf("Debug:") === -1) tlines.push(line);
		});
		rlines = tlines.join("\n");
	} else {
		rlines = lines.join("\n");
	}

	var logp = new DOMParser().parseFromString(rlines, 'text/html').body;
	larea.appendChild(logp);
}

function openTab(tabname) {
	var x = document.getElementsByClassName("otabs");
	let larea = document.getElementById("logarea");
	if(larea.childNodes.length > 2) {
		larea.removeChild(larea.childNodes[2]); 
	}

	if(tabname.target.innerText == 'Logfile') {
		console.log(chrome.runtime.getBackgroundPage().loglines);
		let lines = chrome.runtime.getBackgroundPage().loglines.split("\n");
		let tlines = new Array();
		lines.forEach(function(line, key) {
			if(line.indexOf("Debug:") === -1) tlines.push(line);
		});
		let rlines = tlines.join("\n");
		var logp = new DOMParser().parseFromString(rlines, 'text/html').body;
		larea.appendChild(logp);
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
	chrome.runtime.getBackgroundPage().loglines = '';
	let larea = document.getElementById("logarea");
	if(larea.childNodes.length > 2) {
		larea.removeChild(larea.childNodes[2]); 
	}
	if(tabname.target.innerText == 'Logfile') {
		var logp = new DOMParser().parseFromString(chrome.runtime.getBackgroundPage().loglines, 'text/html').body;
		larea.appendChild(logp);
	}
}

function cCreate() {
	let crsrv = document.getElementById("b_action");
	if(document.getElementById("s_create").checked) {
		crsrv.checked = false;
	} else {
		crsrv.checked = true;
	}
}

function switchBackend() {
	let backendPHP = this.checked;
	if(backendPHP) {
		document.getElementById("php").checked = true;
		document.getElementById("wdav").checked = false;
		document.getElementById("blbl").innerText = "Server: PHP";
		document.getElementById('cname').disabled = false;
		document.getElementById('b_action').disabled = false;
		document.getElementById('b_action').parentElement.querySelector('.slider').style.pointerEvents = 'unset';
		document.getElementById('b_action').parentElement.querySelector('.slider').style.backgroundColor = ''
	} else {
		document.getElementById("php").checked = false;
		document.getElementById("wdav").checked = true;
		document.getElementById("blbl").innerText = "Server: WebDAV";
		document.getElementById('cname').disabled = true;
		document.getElementById('b_action').disabled = true;
		document.getElementById('b_action').parentElement.querySelector('.slider').style.pointerEvents = 'none';
		document.getElementById('b_action').parentElement.querySelector('.slider').style.backgroundColor = 'lightgrey'
	}
}

function cAuto() {
	if(document.getElementById("s_auto").checked) {
		document.getElementById("b_action").checked = false;
		document.getElementById("s_startup").checked = true;
		document.getElementById("s_create").checked = true;
		document.getElementById("s_change").checked = true;
		document.getElementById("s_remove").checked = true;
	} else {
		document.getElementById("b_action").checked = true;
		document.getElementById("s_startup").checked = false;
		document.getElementById("s_create").checked = false;
		document.getElementById("s_change").checked = false;
		document.getElementById("s_remove").checked = false;
	}
	saveOptions();
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

	localizeHtmlPage();

	document.getElementById('version').textContent = chrome.runtime.getManifest().version;
	document.getElementById("econf").addEventListener("click", function() {comodal.style.display = "block"});
	document.getElementById("cclose").addEventListener("click", function() {comodal.style.display = "none";});
	document.getElementById("cexp").addEventListener("click", exportOptions);
	document.getElementById("cimp").addEventListener("click", function(e){
		e.preventDefault();
		document.getElementById("confinput").click();
	});
	document.getElementById("logdebug").addEventListener('change', filterLog);
	document.getElementById("confinput").addEventListener('change', importOptions);
	document.getElementById("iyes").addEventListener("click", manualImport);
	document.getElementById("eyes").addEventListener("click", manualExport);
	document.getElementById("ino").addEventListener("click", manualImport);
	document.getElementById("eno").addEventListener("click", function() { emodal.style.display = "none";});
	document.getElementById("iclose").addEventListener("click", function() {imodal.style.display = "none";});
	document.getElementById("eclose").addEventListener("click", function() {emodal.style.display = "none";});
	document.getElementById("crclose").addEventListener("click", function() {document.getElementById("crdialog").style.display = "none";});
	document.getElementById("mdownload").addEventListener("click", function() {imodal.style.display = "block"});
	document.getElementById("mupload").addEventListener("click", function() {emodal.style.display = "block"});
	document.getElementById("wdurl").addEventListener("input", checkForm);
	document.getElementById("lginl").addEventListener("click", function(e) {
		e.preventDefault;
		document.getElementById("nuser").defaultValue = '';
		document.getElementById("npassword").defaultValue = '';
		document.getElementById("crdialog").style.display = "block";
		document.getElementById("nuser").focus();
	});

	document.getElementById("nuser").addEventListener("input", checkForm2);
	document.getElementById("npassword").addEventListener("input", checkForm2);
	document.getElementById("php_webdav").addEventListener("change", switchBackend);
	document.getElementById('lgin').addEventListener("click", gToken);
	document.getElementById("s_startup").addEventListener("change", saveOptions);
	document.getElementById("s_create").addEventListener("change", saveOptions);
	document.getElementById("s_create").addEventListener("change", cCreate);
	document.getElementById("s_change").addEventListener("change", saveOptions);
	document.getElementById("s_remove").addEventListener("change", saveOptions);
	document.getElementById("b_action").addEventListener("change", saveOptions);
	document.getElementById("s_tabs").addEventListener("change", saveOptions);
	document.getElementById("s_auto").addEventListener("change", cAuto);
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
