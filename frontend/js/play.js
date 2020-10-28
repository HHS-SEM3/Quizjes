function getCookie(name) { var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)')); if (match) return match[2]; else return null; }

if (getCookie("studentnummer") == null) window.location.replace("index.html");

const socket = io();

let sent = 0;

function senddata(data) {
    socket.emit('send', getCookie("studentnummer"), data);
    if (document.getElementById("woorden").style.display === "none")
        end();
    else {
        if (data !== "") {
            sent += data.split(" ").length;
            document.getElementById("verzonden").innerText = "In totaal " + sent + " woorden verzonden";
        }
    }
}

function end() {
    document.getElementById("wacht").style.display = 'initial';
    document.getElementById("opts").style.display = 'none';
    document.getElementById("janee").style.display = 'none';
    document.getElementById("woorden").style.display = 'none';
}

socket.on('end', end);

socket.on('start', function(o) {
    end();
    sent = 0;
    document.getElementById("wacht").style.display = 'none';
    if (o === "janee")
        document.getElementById("janee").style.display = 'block';
    else if (o === "woorden")
        document.getElementById("woorden").style.display = 'block';
    else {
        if (o === "ab") o = 2;
        else if (o === "abc") o = 3;
        else if (o === "abcd") o = 4;
        for (i = 0; i < 4; i+=1) {
            let obj = document.getElementById("opt" + (i + 1));
            obj.style.display = (i < o) ? "initial" : "none";
            obj.style.height = 100 / o + "%";
        }
        document.getElementById("opts").style.display = 'block';
    }
});