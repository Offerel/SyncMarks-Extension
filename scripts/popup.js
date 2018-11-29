var background_page = browser.extension.getBackgroundPage();

function manualRemove() {
	if(confirm("All current bookmarks are removed. Are you sure?")) {
		background_page.removeAllMarks();
		browser.storage.local.set({last_s: 1});
	}
}

function manualImport() {
	if(confirm("The bookmarks stored on the server are now added. Are you sure?")) {
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

document.getElementById("export").addEventListener("click", manualExport);
document.getElementById("import").addEventListener("click", manualImport);
document.getElementById("remove").addEventListener("click", manualRemove);
document.getElementById("settings").addEventListener("click", background_page.openSettings);