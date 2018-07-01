var background_page = browser.extension.getBackgroundPage();

function manualRemove() {
	if(confirm("When you continue, all your current bookmarks are removed. Are you sure?")) {
		background_page.removeAllMarks();
	}
}

function manualImport() {
	if(confirm("When you continue, you load the bookmarks saved from the server and add them to the local bookmarks. Are you sure?")) {
		browser.storage.local.set({last_s: 1});
		background_page.getDAVMarks();
	}
}

document.getElementById("export").addEventListener("click", background_page.saveMarks);
document.getElementById("import").addEventListener("click", manualImport);
document.getElementById("remove").addEventListener("click", manualRemove);