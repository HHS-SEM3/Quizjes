function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2]; else return null;
}

if (getCookie("secret") == null) window.location.href = "adminlogin.html";
else {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);

    var socket = io();
    document.getElementById("time-input").value = urlParams.get("time") || 40;
    const kind = urlParams.get("kind") || "abcd";
    if (kind.startsWith("codegolfjs")) {
        document.getElementById('bestand-input').value = kind.substr("codegolfjs-".length);
        kind = "codegolfjs";
    }
    document.getElementById('select-question-type').value = kind;
}
function f(e) {
    e.preventDefault();
    let kind = document.getElementById('select-question-type').value;
    if (kind == 'codegolfjs')
        kind += '-' + document.getElementById('bestand-input').value;
    window.location.href = 'timer.html?kind=' + kind + '&time=' + document.getElementById("time-input").value;
}