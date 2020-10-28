function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2]; else return null;
}

if (getCookie("studentnummer") != null)
    window.location.replace("play.html");

function f() {
    let val = document.getElementById("studentid").value.trim();
    if (val.match(/\d{4,9}/) == null)
        alert("Dit is geen studentnummer!");
    else {
        document.cookie = 'studentnummer=' + val + '; expires=max-age; path=/'
        window.location.replace("play.html");
    }
}