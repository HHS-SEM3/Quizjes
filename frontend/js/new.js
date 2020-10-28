function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2]; else return null;
}

if (getCookie("secret") == null) window.location.replace("adminlogin.html");

function f(e) {
    e.preventDefault();
    window.location ='timer.html?kind=' + document.getElementById('select-question-type').value + '&time=' + document.getElementById("time-input").value;
}