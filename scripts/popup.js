var background_page = chrome.extension.getBackgroundPage();

window.onload = function() {
	localizeHtmlPage();
	chrome.storage.local.get(null, function(options) {
		let last_message = options.last_message || chrome.i18n.getMessage("popupNoSync");
		if(options['s_uuid'] === undefined) {
			last_message = "No configuration found.";
		}
		else {
			document.getElementById("export").disabled = false;
			document.getElementById("import").disabled = false;
			document.getElementById("remove").disabled = false;
		}
		document.getElementById("popupMessage").appendChild(document.createTextNode(last_message));
	});
	document.getElementById("export").addEventListener("click", manualExport);
	document.getElementById("import").addEventListener("click", manualImport);
	document.getElementById("remove").addEventListener("click", manualRemove);
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
	if(confirm(chrome.i18n.getMessage("optionsBTNRemoveHint"))) {
		background_page.removeAllMarks();
		chrome.storage.local.set({last_s: 1});
	}
}

function manualImport() {
	if(confirm(chrome.i18n.getMessage("popupImportConfirm"))) {
		chrome.storage.local.get(null, function(options) {
			if(options['s_type'] == 'PHP') {
				console.log("test");
				background_page.getAllPHPMarks();
			} else if (options['s_type'] == 'WebDAV') {
				background_page.getDAVMarks();
			}
		});
	}
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

