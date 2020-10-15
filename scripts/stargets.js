var background_page = chrome.extension.getBackgroundPage();

document.addEventListener("DOMContentLoaded", lCLients, {passive: true});
document.getElementById("settings").addEventListener("click", function() {
    chrome.runtime.openOptionsPage();
}, {passive: true});

function lCLients() {
    var clientl = document.getElementById("clist");
    while (clientl.firstChild) {
        clientl.removeChild(clientl.firstChild);
    }

    background_page.clientL.forEach(client => {
        var cli = document.createElement("li");
        cli.textContent = client.name;
        cli.id = client.id;
        clientl.appendChild(cli);
    });

    clientl.addEventListener("click", function(element) {
        background_page.sendTab(element);
        window.close();
    });
}