(async () => {
    const express = require('express');
    const cookieParser = require('cookie-parser');

    var fs = require('fs');

    const secret = process.env.secret || fs.readFileSync('secrets/secret', 'utf8'); 
    const salt = process.env.salt || fs.readFileSync('secrets/salt', 'utf8'); 

    const app = express();
    app.use(express.static('frontend'));

    var cors = require('cors');
    app.use(cors());
    var http = require('http').createServer(app);
    app.use(cookieParser());
    var io = require('socket.io')(http);
    
    var kind = "";

    // kind = "": no game
    // kind = "janee": ja/nee game
    // kind = "woorden": woorden -> steeds opnieuw
    // kind = "abc": a b c
    // kind = "abcd": a b c d
    // kind = "codegolfjs-https://wpfw.imfast.io/vieropeenrijtest.js": a codegolf js game, with this js as tester

    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb+srv://databaseuser:" + (process.env.dbpass || fs.readFileSync('secrets/dbpass', 'utf8')) + "@mycluster.jcyct.azure.mongodb.net/mydb?retryWrites=true&w=majority";
    console.log(url);
    var db = await MongoClient.connect(url, {useUnifiedTopology: true});
    var dbo = db.db("mydb");
    var results = dbo.collection("results");
    var games = dbo.collection("games");
    
    Object.defineProperty(String.prototype, 'hashCode', {
        value: function() {
          var hash = 0, i, chr;
          for (i = 0; i < this.length; i++) {
            chr   = this.charCodeAt(i);
            hash  = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
          }
          return hash;
        }
      });

    io.on('connection', (socket) => {
        if (kind != "") socket.emit("start", kind);
        socket.on('send', (studentnummer, data) => {
            let i = {
                time: (new Date()).getTime(), 
                ip: (salt + socket.request.connection.remoteAddress).hashCode(), 
                studentnummer: studentnummer, 
                data: data};
            results.insertOne(i);
        });
        socket.on('end', (s) => {
            if (secret != s) return;
            kind = "";
            games.find().sort({start: 1}).limit(1).toArray().then((a) => {
                let lastgame = a[0];
                if ("end" in Object.keys(lastgame))
                    return;
                lastgame.end = (new Date()).getTime();
                games.updateOne({ "_id" : lastgame._id }, [ { $set: { "end": lastgame.end } }]).then(() => io.emit('end'));
            });
        });
        socket.on('start', (s, k) => {
            console.log("a");
            if (secret == s) {
                console.log("b");
                kind = k;
                games.insertOne({
                    start: (new Date()).getTime(), 
                    kind: kind
                }).then(() => {
                    console.log("c");
                    io.emit('end');
                    io.emit('start', kind);
                    console.log(kind);
                }); 
            }
        });
    });
    
    app.get(/\/viewer(\.html)?/, 
        async (req, res) => {
            let lastgame = (await games.find().sort({start: -1}).limit(1).toArray())[0];
            let datas = await results.aggregate([
                // collect results since game started
                {$match: {"time": {$gt: lastgame.start}}},
                ...(lastgame.kind == "woorden" ?
                    [
                        {$project: {"studentnummer": "$studentnummer", "data": {$split: ["$data", " "]}}},
                        {$unwind: "$data"},
                        {$project: {"studentnummer": "$studentnummer", "data" : {$trim: {input: {$toLower: "$data"}}}}},
                        {$group: {"_id": {"studentnummer": "$studentnummer", "data": "$data"}}},
                        {$project: {"data" : "$_id.data"}}
                    ]
                :
                    [
                        {$sort: {"time": 1}},
                        {$group: {"_id": "$studentnummer", "data": {$last: "$data"}}}
                    ]
                ),
                ...(lastgame.kind.startsWith("codegolfjs") ?
                    [
                        {$project: {len: { $strLenCP: "$data" }, data: "$data"}},
                        {$sort: {"len": 1}},
                        { $unset: "_id" }
                    ]
                :
                    [
                        {$group: {_id: "$data", aantal: {$sum: 1}}},
                        {$sort: {"aantal": -1}}
                    ]
                )
            ]).toArray();
            if (datas == null || datas.length == 0)
                res.send("empty!");
            else {
                let h = Object.keys(datas[0]); //.filter((key) => !key.startsWith("_"));
                const html = `
                    <!doctype html>
                    <html lang="nl">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport"
                            content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
                        <meta http-equiv="X-UA-Compatible" content="ie=edge">
                        <link rel="icon" type="image/svg" href="/favicon.svg">
                        <link rel="stylesheet" href="/css/halfmoon.min.css">
                        <style>
                            td div { max-height: 5em; overflow: auto; }
                        </style>
                        <title>Resultaten</title>
                    </head>
                    <body class="dark-mode d-flex align-items-center justify-content-center">
                        <div class="card">
                            <h1 class="card-title">Resultaten</h1>
                            <table class="table">
                `;
                res.send(html + ("<thead><tr><th>" + h.join("</th><th>") + "</th></tr></thead>") + ("<tbody><tr>" + datas.map((d) => h.map((hh) => "<td><div>" + ("" + d[hh]).replace(/\n/g, "<br/>") + "</div></td>").join("")).join("</tr><tr>") + "</tr>") + "</tbody></table></div><script src=\"js/halfmoon.min.js\"></script></body></html>");
            }
    });

    http.listen(process.env.PORT || 8000); 
    console.log("Listening");
})();