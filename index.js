var express = require('express');
var app = express();
var http = require('http').createServer(app);
var bodyParser = require('body-parser');
var cors = require('cors');
var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;

const PORT = process.env.PORT || 5000;

app.use('/static', express.static('public'));
// app.use(express.urlencoded({extended: false}));
// app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => {
    res.sendStatus(200);
});

app.post('/login', (req, res) => {
    var temp = undefined;
    console.log(req.body.username, req.body.password);
    MongoClient.connect('mongodb://localhost:27017', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }, (err, db) => {
        if (err) throw err;
        var dbo = db.db('mydb');
        dbo.collection('users').find({username: req.body.username, password: req.body.password})
                               .toArray((err, result) => {
                                    if (err) throw err;
                                    if (result[0]) temp = true;
                                    else temp = false;
                                    db.close();
                                    res.json({allowLogin: temp});
                               });
    });
});

http.listen(PORT, () => console.log('Listen on port ' + PORT));

