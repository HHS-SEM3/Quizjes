function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2]; else return null;
}

if (getCookie("secret") == null) window.location.href = "adminlogin.html";

function f(e) {
    e.preventDefault();
    let kind = document.getElementById('select-question-type').value;
    if (kind == 'codegolfjs')
        kind += '-' + document.getElementById('bestand-input').value;
        window.location.href = 'timer.html?kind=' + kind + '&time=' + document.getElementById("time-input").value;
}