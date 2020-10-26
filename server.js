(async () => {
    const express = require('express');
    const cookieParser = require('cookie-parser');

    var fs = require('fs');

    const secret = process.env.secret || fs.readFileSync('secrets/secret', 'utf8'); 
    const salt = process.env.salt || fs.readFileSync('secrets/salt', 'utf8'); 

    const app = express();
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
            results.insertOne(i).then(() => res.send("succes"));
        });
        socket.on('end', (s) => {
            if (secret != s) return;
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

    var cache = new Map();

    function replaceAll(str, a, b) {
        let prev = ""
        while (prev != str) {
            prev = str;
            str = str.replace(a, b);
        }
        return str;
    }

    function reqreplace(fname) {
        return (req, res) => {
            res.set('Content-Type', 'text/html');
            if (!cache.has(fname))
                cache.set(fname, fs.readFileSync(fname, 'utf8'));
            let str = cache.get(fname);
            for (var propName in req.query) {
                if (req.query.hasOwnProperty(propName)) {
                    str = replaceAll(str, "###" + propName + "###", req.query[propName]);
                }
            }
            str = replaceAll(str, /###[^#]+###/g, "");
            res.send(str);
        };
    }

    app.get("/", reqreplace("index.html")); 
    for (let route of ["index", "play", "adminlogin", "new", "timer"])
        app.get(new RegExp("^" + "\\/" + route + "(\\.html)?$"), reqreplace(route + ".html")); 
    
    app.get(/\/viewer(\.html)?/, 
        async (req, res) => {
            let lastgame = (await games.find().sort({start: -1}).limit(1).toArray())[0];
            let datas = await results.aggregate([
                {$match: {"time": {$gt: lastgame.start}}},
                {$sort: {"time": 1}},
                {$group: {"_id": "$studentnummer", data: {$last: "$data"}}},
                {$project: {data: {$split: ["$data", ","]}}},
                {$unwind: "$data"},
                {$project: {data : {$trim: {input: "$data"}}}},
                {$group: {_id: "$data", aantal: {$sum: 1}}},
                {$sort: {"aantal": -1}},
            ]).toArray();
            if (datas == null || datas.length == 0)
                res.send("empty!");
            else {
                let h = Object.keys(datas[0]); //.filter((key) => !key.startsWith("_"));
                res.send("<table>" + ("<th>" + h.join("</th><th>") + "</th>") + ("<tr>" + datas.map((d) => "<td>" + h.map((hh) => d[hh]).join("</td><td>") + "</td>").join("</tr><tr>") + "</tr>") + "</table>");
            }
    });

    http.listen(process.env.PORT || 8000); 
    console.log("Listening");
})();