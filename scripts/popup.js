var background_page = browser.extension.getBackgroundPage();

window.onload = function() {
	localizeHtmlPage();
	browser.storage.local.get().then( (option) => {
		let last_message = option.last_message || browser.i18n.getMessage("popupNoSync");
		document.getElementById("popupMessage").appendChild(document.createTextNode(last_message));
	});
	
	document.getElementById("export").addEventListener("click", manualExport);
	document.getElementById("import").addEventListener("click", manualImport);
	document.getElementById("remove").addEventListener("click", manualRemove);
	document.getElementById("settings").addEventListener("click", background_page.openSettings);
};

function localizeHtmlPage() {
    var objects = document.getElementsByTagName('html');
    for (var j = 0; j < objects.length; j++)
    {
        var obj = objects[j];

        var valStrH = obj.innerHTML.toString();
        var valNewH = valStrH.replace(/__MSG_(\w+)__/g, function(match, v1)
        {
            return v1 ? browser.i18n.getMessage(v1) : "";
        });

        if(valNewH != valStrH)
        {
            obj.innerHTML = valNewH;
        }
    }
}

function manualRemove() {
	if(confirm(browser.i18n.getMessage("optionsBTNRemoveHint"))) {
		background_page.removeAllMarks();
		browser.storage.local.set({last_s: 1});
	}
}

function manualImport() {
	if(confirm(browser.i18n.getMessage("popupImportConfirm"))) {
		background_page.checkSettings();
		
		if(background_page.s_type == 'PHP') {
			background_page.getAllPHPMarks();
		}
		else if(background_page.s_type == 'WebDAV') {
			background_page.getDAVMarks();
		}
	}
}

function manualExport() {
	background_page.checkSettings();

	if(background_page.s_type == 'PHP') {
		background_page.exportPHPMarks();
	}
	else if(background_page.s_type == 'WebDAV') {
		background_page.saveAllMarks();
	}
}

