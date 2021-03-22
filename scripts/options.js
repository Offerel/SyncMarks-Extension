var background_page = chrome.extension.getBackgroundPage();

function checkForm() {
	if(document.getElementById('wdurl').value != '' && document.getElementById('user').value != '' && document.getElementById('password').value != '' && document.querySelector('input[name="stype"]:checked').value !== true){
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
}

function saveOptions(e) {
	e.preventDefault();
	let wmessage = document.getElementById('wmessage');
	if(typeof last_sync === "undefined" || last_sync.toString().length <= 0) {
		document.getElementById("wmessage").textContent = chrome.i18n.getMessage("optionsNotUsed");
		wmessage.style.cssText = "border-color: darkorange; background-color: gold;";
	}

	chrome.storage.local.set({
		actions: {
			startup:document.querySelector("#s_startup").checked,
			create:document.querySelector("#s_create").checked,
			change:document.querySelector("#s_change").checked,
			remove:document.querySelector("#s_remove").checked
		},

		s_type: document.querySelector('input[name="stype"]:checked').value,
		s_uuid: document.querySelector("#s_uuid").value,
		wdurl: document.querySelector("#wdurl").value,

		creds: btoa(document.querySelector("#user").value+':'+document.querySelector("#password").value)
	});

	let xhrl = new XMLHttpRequest();
	let cdata = "caction=logout";
	xhrl.open("POST", document.getElementById('wdurl').value, true);
	xhrl.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	xhrl.send(cdata);

	cdata = "client=" + document.getElementById('s_uuid').value + "&caction=tl";
	let xhr = new XMLHttpRequest();
	xhr.open("POST", document.getElementById('wdurl').value, true);
	xhr.setRequestHeader('Authorization', 'Basic ' + btoa(document.getElementById('user').value + ':' + document.getElementById('password').value));
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
			case 200:	if(xhr.responseText.indexOf('updated') == 7) {
							wmessage.textContent = chrome.i18n.getMessage("optionsSuccessLogin");
							wmessage.style.cssText = "border-color: green; background-color: #98FB98;";
							chrome.storage.local.set({
								wdurl: document.getElementById('wdurl').value,
								creds: btoa(document.querySelector("#user").value+':'+document.querySelector("#password").value)
							});
							if(document.querySelector('input[name="stype"]:checked').value = 'PHP') {
								rName(document.querySelector("#cname").value);
							}
						} else {
							wmessage.textContent = 'Warning: '+xhr.responseText;
							wmessage.style.cssText = "border-color: red; background-color: lightsalmon;";
							console.warn('Syncmarks Warning: '+xhr.responseText);
						}
						break;
			default:	wmessage.textContent = chrome.i18n.getMessage("optionsErrorLogin") + xhr.status;
						wmessage.style.cssText = "background-color: #ff7d52;";
						console.error('Syncmarks Error: '+chrome.i18n.getMessage("optionsErrorLogin") + xhr.status);
						break;
		}
		wmessage.className = "show";
		setTimeout(function(){wmessage.className = wmessage.className.replace("show", ""); }, 3000);
	};
	xhr.send(cdata);
}

function rName(name) {
	chrome.storage.local.get(null, function(options) {
		var xhr = new XMLHttpRequest();
		let cdata = "cido="+options['s_uuid']+"&caction=arename&nname="+name;
		xhr.open("POST", options['wdurl'], true);
		xhr.setRequestHeader("Authorization", 'Basic ' + options['creds']);
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		xhr.withCredentials = true;
		xhr.onload = function () {
			if( xhr.status < 200 || xhr.status > 226) {
				message = "Error set name of client."  + xhr.status;
				background_page.notify('error',message);
				background_page.loglines = background_page.logit('Error: '+message);
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
		xhr.setRequestHeader("Authorization", 'Basic ' + options['creds']);
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		xhr.withCredentials = true;
		xhr.onload = function () {
			if( xhr.status < 200 || xhr.status > 226) {
				message = "Error get name of client."  + xhr.status;
				background_page.notify('error',message);
				background_page.loglines =  background_page.logit('Error: '+message);
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
		let wmessage = document.getElementById('wmessage');
		if(options['wdurl'] == undefined) {
			wmessage.textContent = chrome.i18n.getMessage("infoEmptyConfig");
			wmessage.style.cssText = "border-color: green; background-color: #98FB98;";
			wmessage.className = "show";
			setTimeout(function(){wmessage.className = wmessage.className.replace("show", ""); }, 3000);
		}
		document.querySelector("#wdurl").value = options['wdurl'] || "";
		if(options['creds'] !== undefined) {
			let creds = atob(options['creds']).split(':');
			document.querySelector("#user").value = creds[0] || "";
			document.querySelector("#password").value = creds[1] || "";
		}

		if(options['s_uuid'] === undefined) {
			let nuuid = background_page.uuidv4();
			document.getElementById("s_uuid").value = nuuid;
			document.getElementById("cname").placeholder = nuuid;
		} else {
			document.getElementById("s_uuid").value = options['s_uuid'];
			document.getElementById("cname").placeholder = options['s_uuid'];
		}

		document.querySelector("#s_startup").checked = (options['actions'] == undefined) ? true:options['actions']['startup'];
		document.querySelector("#s_create").checked = (options['actions'] == undefined) ? true:options['actions']['create'];
		document.querySelector("#s_change").checked = (options['actions'] == undefined) ? true:options['actions']['change'];
		document.querySelector("#s_remove").checked = (options['actions'] == undefined) ? true:options['actions']['remove'];

		if("s_type" in options) {
			document.querySelector('input[name="stype"][value="'+ options['s_type'] +'"]').checked = true;
			if(options['s_type'] == 'PHP') {
				gName();
				document.querySelector("#cname").placeholder = document.querySelector("#s_uuid").value;
			}
		}

		last_sync = options['last_sync'] || 0;
		if(last_sync.toString().length > 0) {
			document.querySelector("#s_startup").removeAttribute("disabled");
		}

		checkForm();
	});
}

function exportOptions() {
	chrome.storage.local.get(null, function(options) {
		let confJSON = JSON.stringify(options);
		let dString = new Date().toISOString().slice(0,10);
		var element = document.createElement('a');
		element.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(confJSON);
		element.download = 'SyncMarks_Options_'+dString+'.json';
		element.style.display = 'none';
		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
	});
}

function importOptions() {
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
			s_uuid: ioptions.s_uuid,
			wdurl: ioptions.wdurl,
			creds: ioptions.creds,
		});

		let creds = atob(ioptions.creds).split(':');

		document.querySelector("#wdurl").value = ioptions.wdurl;
		document.querySelector("#user").value = creds[0];
		document.querySelector("#password").value = creds[1];
		document.querySelector("#s_uuid").value = ioptions.s_uuid;
		document.querySelector("#s_startup").checked = ioptions.actions.startup;
		document.querySelector("#s_create").checked = ioptions.actions.create;
		document.querySelector("#s_change").checked = ioptions.actions.change;
		document.querySelector("#s_remove").checked = ioptions.actions.remove;

		gName();

		wmessage.textContent = chrome.i18n.getMessage("optionsSuccessImport");
		wmessage.style.cssText = "border-color: green; background-color: #98FB98;";
		wmessage.className = "show";
		setTimeout(function(){wmessage.className = wmessage.className.replace("show", ""); }, 3000);
	});
	reader.readAsText(file);
	document.getElementById("expimpdialog").style.display = "none";
}

function manualImport(e) {
	e.preventDefault();
	background_page.removeAllMarks();
	try {
		chrome.storage.local.get(null, function(options) {
			if(options['s_type'] == 'PHP') {
				background_page.getAllPHPMarks();
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

function manualRemove(e) {
	e.preventDefault();
	try {
		background_page.removeAllMarks();
	}
	catch(error) {
		background_page.loglines = background_page.logit(error);
	}
	finally {
		document.getElementById("rmdialog").style.display = "none";
		chrome.storage.local.set({last_s: 1});
	}
}

function manualExport(e) {
	e.preventDefault();
	var background_page = chrome.extension.getBackgroundPage();
	try {
		if(document.querySelector('input[name="stype"]:checked').value == 'WebDAV') {
			background_page.saveAllMarks();
		}
		else if(document.querySelector('input[name="stype"]:checked').value == 'PHP') {
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
	var rmodal = document.getElementById("rmdialog");
	var emodal = document.getElementById("expdialog");
	var comodal = document.getElementById("expimpdialog");

	localizeHtmlPage();
	document.getElementById('version').textContent = chrome.runtime.getManifest().version;
	document.getElementById("ssubmit").addEventListener("click", saveOptions);

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
	document.getElementById("ryes").addEventListener("click", manualRemove);
	document.getElementById("ino").addEventListener("click", function() { imodal.style.display = "none";});
	document.getElementById("rno").addEventListener("click", function() { rmodal.style.display = "none";});
	document.getElementById("eno").addEventListener("click", function() { emodal.style.display = "none";});
	document.getElementById("iclose").addEventListener("click", function() {imodal.style.display = "none";});
	document.getElementById("rclose").addEventListener("click", function() {rmodal.style.display = "none";});
	document.getElementById("eclose").addEventListener("click", function() {emodal.style.display = "none";});
	document.getElementById("mdownload").addEventListener("click", function() {imodal.style.display = "block"});
	document.getElementById("mremove").addEventListener("click", function() {rmodal.style.display = "block"})
	document.getElementById("mupload").addEventListener("click", function() {emodal.style.display = "block"});
	document.getElementById("wdurl").addEventListener("keyup", checkForm);
	document.getElementById("user").addEventListener("keyup", checkForm);
	document.getElementById("password").addEventListener("keyup", checkForm);
	document.getElementById("wdav").addEventListener("input", checkForm);
	document.getElementById("php").addEventListener("input", checkForm);
	document.getElementById("s_startup").addEventListener("input", checkForm);
	document.getElementById("s_create").addEventListener("input", checkForm);
	document.getElementById("s_change").addEventListener("input", checkForm);
	document.getElementById("s_remove").addEventListener("input", checkForm);
	document.querySelectorAll(".tab-button").forEach(function(e){ e.addEventListener("click", openTab);});

	document.getElementById("logsave").addEventListener("click", saveLog);
	document.getElementById("logclear").addEventListener("click", clearLog);

	document.getElementById('ebutton').addEventListener('click', function(e) {
		e.preventDefault();
		this.classList.toggle("active");
		this.nextElementSibling.classList.toggle("active");
		let panel = this.nextElementSibling;
		if (panel.style.maxHeight) {
			panel.style.maxHeight = null;
		} else {
			panel.style.maxHeight = panel.scrollHeight + "px";
		}

	});

	document.querySelector('h1').addEventListener('click', function(){
		window.open(document.getElementById('wdurl').value);
	});

	window.onclick = function(event) {
		if (event.target == imodal) {
			imodal.style.display = "none";
		}

		if (event.target == rmodal) {
			rmodal.style.display = "none";
		}

		if (event.target == emodal) {
			emodal.style.display = "none";
		}
	}
});