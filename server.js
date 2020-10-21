(async () => {
    const express = require('express');
    const cookieParser = require('cookie-parser');

    var fs = require('fs');

    // fetir16164@maillei.net, Carucel1, tot Dec 22, 2020
    // databaseuser
    // uPmQs9eKrp3BBmUa

    const nextquestioncomposer = ""; // fs.readFileSync('app/nextquestioncomposer.html', 'utf8');

    const secret = process.env.secret; // fs.readFileSync('secret', 'utf8');

    const app = express();
    var http = require('http').createServer(app);
    app.use(cookieParser());
    var io = require('socket.io')(http);
    
    var kind = "";

    // kind = "": no game
    // kind = "janee": ja/nee game
    // kind = "textinput": willekeurige tekst
    // kind = "abc": a b c
    // kind = "abcd": a b c d

    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb+srv://databaseuser:uPmQs9eKrp3BBmUa@mycluster.jcyct.azure.mongodb.net/mydb?retryWrites=true&w=majority";
    var db = await MongoClient.connect(url, {useUnifiedTopology: true});
    var dbo = db.db("mydb");
    var results = dbo.collection("results");
    var games = dbo.collection("games");
    
    io.on('connection', (socket) => {
        if (kind != "") socket.emit("start", kind);
        socket.on('send', (studentnummer, data) => {
            let i = {
                time: (new Date()).getTime(), 
                ip: socket.request.connection.remoteAddress, 
                studentnummer: studentnummer, 
                data: data};
            results.insertOne(i).then(() => res.send("succes"));
            console.log(i);
        });
        socket.on('end', (s) => {
            if (secret != s) return;
            games.find().sort({start: 1}).limit(1).toArray().then((a) => {
                let lastgame = a[0];
                if ("end" in Object.keys(lastgame))
                    return;
                lastgame.end = (new Date()).getTime();
                games.updateOne({ "_id" : lastgame._id }, lastgame).then(() => io.emit('end'));
            });
        });
        socket.on('start', (s, k) => {
            if (secret == s) {
                kind = k;
                games.insertOne({
                    start: (new Date()).getTime(), 
                    kind: kind
                }).then(() => {
                    io.emit('end');
                    io.emit('start', kind); 
                    console.log("started");
                }); 
            }
        });
    });

    app.get('/', (req, res) => res.sendFile("index.html", { root: '.' })); 
    app.get('/play', (req, res) => res.sendFile("play.html", { root: '.' })); 
    app.get('/admin', (req, res) => res.sendFile("admin.html", { root: '.' }));

    app.get('/viewer', 
        async (req, res) => {
            let lastgame = (await games.find().sort({start: 1}).limit(1).toArray())[0];
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
            console.log(datas);
            if (datas == null || datas.length == 0)
                res.send("empty!");
            else {
                let h = Object.keys(datas[0]); //.filter((key) => !key.startsWith("_"));
                res.send("<table>" + ("<th>" + h.join("</th><th>") + "</th>") + ("<tr>" + datas.map((d) => "<td>" + h.map((hh) => d[hh]).join("</td><td>") + "</td>").join("</tr><tr>") + "</tr>") + "</table>");
            }
    });

    function access(req) {
        return req.cookies['secret'] == secret;
    }
    app.get('/nextquestioncomposer', async (req, res) => res.send(access(req) ? nextquestioncomposer : "wrong secret"));


    io.on('connection', (socket) => {
    console.log('a user connected');
    });

    http.listen(process.env.PORT); // 8000
    console.log("Listening");
})();