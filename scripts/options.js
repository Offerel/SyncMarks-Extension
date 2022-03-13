var background_page = chrome.extension.getBackgroundPage();

function checkForm() {
	var wchanged = false;

	if((document.getElementById('wdurl').value != '') && (document.getElementById('wdurl').value != document.getElementById('wdurl').defaultValue)) {
		document.getElementById("lginl").style.visibility = 'visible';
	}

	if(document.getElementById('wdurl').value != '' && document.querySelector('input[name="stype"]:checked').value !== true){
		document.getElementById('mdownload').disabled=false;
		document.getElementById('mupload').disabled=false;
    } else{
		document.getElementById('mdownload').disabled=true;
		document.getElementById('mupload').disabled=true;
	}

	if(document.getElementById('wdurl').value != document.getElementById('wdurl').defaultValue) wchanged = true;
	if(wchanged) saveOptions();
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
	document.getElementById('lginl').classList.add('loading');
	document.getElementById('crdialog').style.display = "none";
	let xhr = new XMLHttpRequest();
	let wmessage = document.getElementById('wmessage');
	cdata = "caction=tl&client=" + document.getElementById('s_uuid').value + "&s=" + document.getElementById('s_startup').checked;
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
	xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	xhr.withCredentials = true;
	xhr.onload = function () {
		switch(xhr.status) {
			case 404: 	wmessage.textContent = chrome.i18n.getMessage("optionsErrorURL");
						wmessage.style.cssText = "border-color: red; background-color: lightsalmon;";
						console.error('Syncmarks Error: '+chrome.i18n.getMessage("optionsErrorURL"));
						break;
			case 401:	wmessage.textContent = chrome.i18n.getMessage("optionsErrorUser");
						wmessage.style.cssText = "border-color: red; background-color: lightsalmon;";
						console.error('Syncmarks Error: '+chrome.i18n.getMessage("optionsErrorUser"));
						break;
			case 200:	let rp = xhr.responseText;
						let response = (rp.indexOf('<') === -1) ? JSON.parse(rp):'0';
						if(typeof response.length === 'undefined' && response.token.length != 0) {
							document.getElementById('lginl').classList.remove('loading');
							document.getElementById('lginl').style.visibility = "hidden";
							chrome.storage.local.set({
								wdurl: document.getElementById('wdurl').value,
								token: response.token,
								s_type: 'PHP',
							});
							chrome.storage.local.remove("creds");
						}

						if(response.message.indexOf('updated') == 7) {
							wmessage.textContent = chrome.i18n.getMessage("optionsSuccessLogin");
							wmessage.style.cssText = "border-color: green; background-color: #98FB98;";							
						} else {
							wmessage.textContent = 'Warning: '+ response.message;
							wmessage.style.cssText = "border-color: red; background-color: lightsalmon;";
							console.warn('Syncmarks Warning: '+ response.message);
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
								chrome.storage.local.remove("token");
							} else {
								document.getElementById('lginl').classList.remove('loading');
								chrome.storage.local.set({
									wdurl: document.getElementById('wdurl').value,
									creds: '',
									s_type: 'WebDAV',
								});
								chrome.storage.local.remove("token");
							}
						}
						xhr.send(cdata);
						break;			
			default:	wmessage.textContent = chrome.i18n.getMessage("optionsErrorLogin") + xhr.status;
						wmessage.style.cssText = "background-color: #ff7d52;";
						console.error('Syncmarks Error: '+chrome.i18n.getMessage("optionsErrorLogin") + xhr.status);
						break;
		}
		wmessage.className = "show";
		setTimeout(function(){wmessage.className = wmessage.className.replace("show", "hide"); }, 3000);
		background_page.init();
	};
	xhr.send(cdata);
}

function saveOptions(e) {
	if(typeof e !== "undefined") e.preventDefault();
	var wmessage = document.getElementById('wmessage');
	wmessage.textContent = chrome.i18n.getMessage("optionsSuccessLogin");

	if(typeof last_sync === "undefined" || last_sync.toString().length <= 0) {
		document.getElementById("wmessage").textContent = chrome.i18n.getMessage("optionsNotUsed");
		wmessage.style.cssText = "border-color: darkorange; background-color: gold;";
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
		wdurl: document.getElementById("wdurl").value,
	});

	wmessage.style.cssText = "border-color: green; background-color: #98FB98;";
	wmessage.className = "show";
	setTimeout(function(){wmessage.className = wmessage.className.replace("show", "hide"); }, 5000);
		
}

function rName() {
	let name = this.value;
	chrome.storage.local.get(null, function(options) {
		var xhr = new XMLHttpRequest();
		let cdata = "client="+options['s_uuid']+"&caction=arename&nname="+name;
		xhr.open("POST", options['wdurl'], true);
		let tarr = {};
		tarr['client'] = options['s_uuid'];
		tarr['token'] = options['token'];
		if(tarr['token'] == '') return false;
		xhr.setRequestHeader('Authorization', 'Bearer ' + btoa(encodeURIComponent(JSON.stringify(tarr))));
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		xhr.withCredentials = true;
		xhr.onload = function () {
			if( xhr.status < 200 || xhr.status > 226) {
				message = "Error set name of client."  + xhr.status;
				background_page.notify('error',message);
				background_page.loglines = background_page.logit('Error: '+message);
			} else {
				let xtResponse = xhr.getResponseHeader("X-Request-Info");
				if(xtResponse !== null) chrome.storage.local.set({token: xtResponse});
			}
		}
		xhr.send(cdata);
	});
}

function gName() {
	let xhr = new XMLHttpRequest();
	let cdata = "client=" + document.getElementById("s_uuid").value + "&caction=cinfo";
	xhr.open("POST", document.getElementById("wdurl").value, true);
	let tarr = {};
	tarr['client'] = options['s_uuid'];
	tarr['token'] = options['token'];
	if(tarr['token'] == '') return false;
	xhr.setRequestHeader('Authorization', 'Bearer ' + btoa(encodeURIComponent(JSON.stringify(tarr))));
	xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	xhr.withCredentials = true;
	xhr.onload = function () {
		if( xhr.status < 200 || xhr.status > 226) {
			message = "Error get name of client."  + xhr.status;
			background_page.notify('error',message);
			background_page.loglines =  background_page.logit('Error: '+message);
		} else {
			let xtResponse = xhr.getResponseHeader("X-Request-Info");
			if(xtResponse !== null) chrome.storage.local.set({token: xtResponse});

			let response = JSON.parse(xhr.responseText);		
			document.getElementById("cname").title = (response) ? document.getElementById('s_uuid').value + " (" + response.ctype + ")":document.getElementById('s_uuid').value;
			if(response !== null) document.getElementById("cname").defaultValue = (response.cname == document.getElementById('s_uuid').value) ? '':response.cname;
		}
	}
	xhr.send(cdata);
}

function restoreOptions() {
	chrome.storage.local.get(null, function(options) {
		let wmessage = document.getElementById('wmessage');
		if(options['wdurl'] == undefined) {
			wmessage.textContent = chrome.i18n.getMessage("infoEmptyConfig");
			wmessage.style.cssText = "border-color: green; background-color: #98FB98;";
			wmessage.className = "show";
			setTimeout(function(){wmessage.className = wmessage.className.replace("show", ""); }, 3000);
		}
		document.querySelector("#wdurl").defaultValue = options['wdurl'] || "";		
		
		if(options['s_uuid'] === undefined) {
			let nuuid = background_page.uuidv4();
			document.getElementById("s_uuid").defaultValue = nuuid;
			document.getElementById("cname").placeholder = nuuid;
		} else {
			document.getElementById("s_uuid").defaultValue = options['s_uuid'];
			document.getElementById("cname").placeholder = options['s_uuid'];
		}

		document.querySelector("#s_startup").defaultChecked = (options['actions'] == undefined) ? true:options['actions']['startup'];
		document.querySelector("#s_create").defaultChecked = (options['actions'] == undefined) ? true:options['actions']['create'];
		document.querySelector("#s_change").defaultChecked = (options['actions'] == undefined) ? true:options['actions']['change'];
		document.querySelector("#s_remove").defaultChecked = (options['actions'] == undefined) ? true:options['actions']['remove'];
		document.querySelector("#b_action").defaultChecked = (options['actions'] == undefined) ? false:options['actions']['crsrv'];

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
				if(options['token'] === '') document.getElementById("lginl").style.visibility = 'visible';
			} else {
				document.getElementById("php_webdav").checked = false;
				if(options['creds'] === '') document.getElementById("lginl").style.visibility = 'visible';
			}
			
		}

		chrome.commands.getAll((commands) => {
			for (let {name, shortcut} of commands) {
				var s = (name === 'bookmark-tab') ? shortcut:'undef';
			}

			document.getElementById("obmd").innerText = document.getElementById("obmd").innerText + ` (${s})`;
		});

		last_sync = options['last_sync'] || 0;
		if(last_sync.toString().length > 0) {
			document.querySelector("#s_startup").removeAttribute("disabled");
		}
		
		if(document.querySelector("#wdurl").value.length > 4) document.getElementById("cexp").disabled = false;

		checkForm();
	});
}

function exportOptions(e) {
	e.preventDefault();
	chrome.storage.local.get(null, function(options) {
		delete options.clist;
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
		});

		if(resCID) {
			document.querySelector("#cname").placeholder = ioptions.s_uuid;
			document.querySelector("#s_uuid").value = ioptions.s_uuid;
			document.getElementById("lginl").style.visibility = 'hidden';

			if (ioptions.s_type === 'PHP') {
				chrome.storage.local.set({
					s_uuid: ioptions.s_uuid,
					token: ioptions.token
				});
			} else if (ioptions.s_type === 'WebDAV') {
				chrome.storage.local.set({
					s_uuid: ioptions.s_uuid,
					creds: ioptions.creds
				})
			}
		}

		document.querySelector("#wdurl").value = ioptions.wdurl;
		document.querySelector("#s_startup").checked = ioptions.actions.startup;
		document.querySelector("#s_create").checked = ioptions.actions.create;
		document.querySelector("#s_change").checked = ioptions.actions.change;
		document.querySelector("#s_remove").checked = ioptions.actions.remove;
		document.querySelector("#b_action").checked = ioptions.actions.crsrv;

		wmessage.textContent = chrome.i18n.getMessage("optionsSuccessImport");
		wmessage.style.cssText = "border-color: green; background-color: #98FB98;";
		wmessage.className = "show";
		setTimeout(function(){wmessage.className = wmessage.className.replace("show", ""); }, 3000);
	});
	reader.readAsText(file);
	document.getElementById("expimpdialog").style.display = "none";
	
	setTimeout(() => {  if(resCID) { gName(); } }, 200);
	setTimeout(() => {  checkForm(); }, 200);
}

function manualImport(e) {
	e.preventDefault();
	if (this.id === 'iyes') background_page.removeAllMarks();

	try {
		chrome.storage.local.get(null, function(options) {
			if(options['s_type'] == 'PHP') {
				background_page.getAllPHPMarks(true);
			} else if (options['s_type'] == 'WebDAV') {
				background_page.getDAVMarks();
			}
		});
	} catch(error) {
		background_page.loglines = background_page.logit(error);
	} finally {
		document.getElementById("impdialog").style.display = "none";
		chrome.storage.local.set({last_s: 1});
	}
}

function manualExport(e) {
	e.preventDefault();
	var background_page = chrome.extension.getBackgroundPage();
	try {
		if(document.querySelector('input[name="stype"]:checked').value == 'WebDAV') {
			background_page.saveAllMarks();
		} else if (document.querySelector('input[name="stype"]:checked').value == 'PHP') {
			background_page.exportPHPMarks();
		}
	} catch(error) {
		background_page.loglines = background_page.logit(error);
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
	document.getElementById('obmd').title = chrome.i18n.getMessage("toBackend");
}

function openTab(tabname) {
	var x = document.getElementsByClassName("otabs");
	for (var i = 0; i < x.length; i++) {
		x[i].style.display = "none";
		let larea = document.getElementById("logarea");

		if(larea.childNodes.length > 2) {
			larea.removeChild(larea.childNodes[2]); 
		}

		if(tabname.target.innerText == 'Logfile') {
			var logp = new DOMParser().parseFromString(background_page.loglines, 'text/html').body;
			larea.appendChild(logp);
		}
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
	background_page.loglines = '';
	let larea = document.getElementById("logarea");
	if(larea.childNodes.length > 2) {
		larea.removeChild(larea.childNodes[2]); 
	}
	if(tabname.target.innerText == 'Logfile') {
		var logp = new DOMParser().parseFromString(background_page.loglines, 'text/html').body;
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
	} else {
		document.getElementById("php").checked = false;
		document.getElementById("wdav").checked = true;
		document.getElementById("blbl").innerText = "Server: WebDAV";
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
	document.getElementById("wdurl").addEventListener("change", checkForm);
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
