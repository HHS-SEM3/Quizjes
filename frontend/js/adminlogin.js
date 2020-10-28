function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2]; else return null; }

function f() {
    document.cookie = 'secret=' + document.getElementById("secret").value + '; SameSite=None; Secure';
    window.location.replace("new.html");
}
if (getCookie("secret") != null)
    window.location.replace("new.html");