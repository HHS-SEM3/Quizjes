(async () => {
    const {performance} = require('perf_hooks');
    const express = require('express');
    const cookieParser = require('cookie-parser');

    var fs = require('fs');

    // fetir16164@maillei.net, Carucel1, tot Dec 22, 2020

    const play = fs.readFileSync('app/play.html', 'utf8');
    const viewer  = fs.readFileSync('app/viewer.html', 'utf8');
    const counter = fs.readFileSync('app/counter.html', 'utf8');
    const adminlogin = fs.readFileSync('app/adminlogin.html', 'utf8');
    const nextquestioncomposer = fs.readFileSync('app/nextquestioncomposer.html', 'utf8');

    const secret = fs.readFileSync('secret', 'utf8');

    const app = express();
    app.use(cookieParser());

    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb+srv://databaseuser:uPmQs9eKrp3BBmUa@mycluster.jcyct.azure.mongodb.net/mydb?retryWrites=true&w=majority";
    var db = await MongoClient.connect(url, {useUnifiedTopology: true});
    var dbo = db.db("mydb");
    var results = dbo.collection("results");
    var games = dbo.collection("games");
    var users = dbo.collection("users");

    var game = {
        started: 0, 
        maxtime: 0,
        kind: -1
    };

    function logme(req, f) {
        let t1 = performance.now();
        f();
        let t2 = performance.now();
        console.log("GET " + req.url + " FROM " + req.connection.remoteAddress);
        console.log(t2 - t1);
    }

    function get(url, func) {
        app.get(url, async (req, res) => logme(req, async () => func(req, res)));
    }

    get('/', (req, res) => res.send(play.replace("##REDIRECT##", true ? "https://94.209.210.86/" : "https://localhost:4430/"))); 

    function addmetadata(d, req) {
        return Object.assign({}, d, {time: (new Date()).getTime(), ip: req.connection.remoteAddress});
    }

    app.post('/data', async (req, res) => logme(req, async () => {
        let r = users.find({name: req.query.name}); 
        const aaa = await r.limit(1).toArray();
        if ((await r.count()) == 0)
            await users.insertOne(addmetadata({name: req.query.name, client_info: req.query.client_info}, req));
        else if ((await r.limit(1).toArray()).client_info != req.query.client_info) {
            res.send("fail");
            return;
        }
        results.insertOne(addmetadata({name: req.query.naam, data: req.body}, req)).then(() => res.send("succes"));
    }));

    get('/game', async (_, res) => res.send(game));

    get('/viewer', 
        async (req, res) => {
            let lastgame = (await games.find().sort({started: 1}).limit(1).toArray())[0];
            let datas = await results.aggregate([
                {$match: {"time": {$gt: lastgame.started}}},
                {$sort: {"time": 1}},
                {$group: {"_id": "$name", data: {$last: "$data"}}},
                {$project: {data: {$split: ["$data", ","]}}},
                {$unwind: "$data"},
                {$project: {data : {$trim: {input: "$data"}}}},
                {$group: {_id:"$data", aantal: {$sum: 1}}},
                {$sort: {"aantal": 1}},
            ]).toArray();
            console.log(datas);
            let h = Object.keys(datas[0]).filter((key) => !key.startsWith("_"));
            res.send("<table>" + ("<th>" + h.join("</th><th>") + "</th>") + ("<tr>" + datas.map((d) => "<td>" + h.map((hh) => d[hh]).join("</td><td>") + "</td>").join("</tr><tr>") + "</tr>") + "</table>");
    });

    function access(req) {
        return req.cookies['secret'] == secret;
    }
    get('/nextquestioncomposer', async (req, res) => res.send(access(req) ? nextquestioncomposer : "wrong secret"));

    async function nextquestion(req) {
        if (access(req)) {
            game = {
                started: (new Date()).getTime(), 
                maxtime: req.query.maxtime,
                kind: req.query.kind };
            await games.insertOne(game); 
            return true;
        }
        return false;
    }

    get('/nextquestion', 
        async (req, res) => {
            if (nextquestion(req))
                res.send("succes");
            else
                res.send("wrong secret");
    });

    get('/nextquestionviewer', 
        async (req, res) => {
            if (nextquestion(req))
                res.send(counter.replace("##startval##", req.query.maxtime / 1000));
            else
                res.send("wrong secret");
    });
    
    get('/adminlogin', (req, res) => res.send(adminlogin));

    app.listen(process.env.PORT);
    console.log("Listening");
})();