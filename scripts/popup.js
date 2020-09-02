var background_page = chrome.extension.getBackgroundPage();

window.onload = function() {
	localizeHtmlPage();

	var imodal = document.getElementById("impdialog");
	var rmodal = document.getElementById("rmdialog");

	window.onclick = function(event) {
		if (event.target == imodal) {
			imodal.style.display = "none";
		}

		if (event.target == rmodal) {
			rmodal.style.display = "none";
		}
	}

	document.getElementById("iyes").addEventListener("click", manualImport, {passive: true});
	document.getElementById("ryes").addEventListener("click", manualRemove, {passive: true});
	document.getElementById("ino").addEventListener("click", function() { imodal.style.display = "none";}, {passive: true});
	document.getElementById("rno").addEventListener("click", function() { rmodal.style.display = "none";}, {passive: true});
	document.getElementById("iclose").addEventListener("click", function() {imodal.style.display = "none";}, {passive: true});
	document.getElementById("rclose").addEventListener("click", function() {rmodal.style.display = "none";}, {passive: true});

	chrome.storage.local.get(null, function(options) {
		let last_message = options.last_message || chrome.i18n.getMessage("popupNoSync");
		if(options['s_uuid'] === undefined) {
			last_message = "No configuration found.";
		}
		document.getElementById("popupMessage").appendChild(document.createTextNode(last_message));
	});
	document.getElementById("settings").addEventListener("click", background_page.openSettings);
};

function localizeHtmlPage() {
    var objects = document.getElementsByTagName('button');
    for (var j = 0; j < objects.length; j++)
    {
        var obj = objects[j];

        var valStrH = obj.innerHTML.toString();
        var valNewH = valStrH.replace(/__MSG_(\w+)__/g, function(match, v1)
        {
            return v1 ? chrome.i18n.getMessage(v1) : "";
        });

        if(valNewH != valStrH)
        {
			obj.innerText = valNewH;
        }
    }
}

function manualRemove() {
	background_page.removeAllMarks();
	chrome.storage.local.set({last_s: 1});
}

function manualImport() {
	background_page.removeAllMarks();
	chrome.storage.local.get(null, function(options) {
		if(options['s_type'] == 'PHP') {
			background_page.getAllPHPMarks();
		} else if (options['s_type'] == 'WebDAV') {
			background_page.getDAVMarks();
		}
	});
	chrome.storage.local.set({last_s: 1});
}

function manualExport() {
	chrome.storage.local.get(null, function(options) {
		if(options['s_type'] == 'PHP') {
			background_page.exportPHPMarks();
		} else if(options['s_type'] == 'WebDAV') {
			background_page.saveAllMarks();
		}
	});
}

