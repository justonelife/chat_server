var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var cors = require('cors');
var mongo = require('mongodb');
// const { nextTick } = require('process');
var MongoClient = mongo.MongoClient;

const DATABASE_URL = 'mongodb://localhost:27017/';
const MONGO_OPTIONS = {
    useNewUrlParser: true,
    useUnifiedTopology: true
}

const PORT = process.env.PORT || 5000;

app.use('/static', express.static('public'));
// app.use(express.urlencoded({extended: false}));
// app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cors());

app.post('/login', (req, res) => {

    try {
        var user_id = undefined;
        var room_id = undefined;


        MongoClient.connect(DATABASE_URL, MONGO_OPTIONS, (err, db) => {
            if (err) throw err;
            const dbo = db.db('mydb');

            var usersPromise = () => {
                return new Promise((resolve, reject) => {
                    dbo.collection('users')
                       .find({ username: req.body.username, password: req.body.password })
                       .limit(1)
                       .toArray((err, result) => {
                            if (err) reject(err);
                            resolve(result[0]);
                       });
                });
            };

            var roomsPromise = () => {
                return new Promise((resolve, reject) => {
                    dbo.collection('rooms')
                       .find({ user_id: mongo.ObjectId(user_id) })
                       .toArray((err, result) => {
                           err
                               ? reject(err)
                               : resolve(result);
                       });
                });
            };

            var channelsPromise = () => {
                return new Promise((resolve, reject) => {
                    dbo.collection('channels')
                       .find({ room_id: mongo.ObjectId(room_id) })
                       .toArray((err, result) => {
                           err
                                ? reject(err)
                                : resolve(result);
                       });
                });
            };


            var callAllPromises = async () => {
                var result = {};

                var userResult = await usersPromise();

                if (userResult) {
                    user_id = userResult._id;

                    var roomsResult = await roomsPromise();

                    var tempRoom = [];
                    var tempChannel = [];

                    if (roomsResult) {
                        for (let i = 0; i < roomsResult.length; i++) {  //format room data
                            tempRoom.push({
                                name: roomsResult[i].name,
                                channels: roomsResult[i].channels
                            });

                            room_id = roomsResult[i]._id;

                            var channelsResult = await channelsPromise();
                            
                            for (let j = 0; j < channelsResult.length; j++) {   //format channel data
                                tempChannel.push({
                                    _id: channelsResult[j]._id,
                                    name: channelsResult[j].name,
                                    members: channelsResult[j].members,
                                    messages: channelsResult[j].messages
                                });
                            }

                        }
                    }

                
                    result = {
                        allowLogin: true,
                        nickname: userResult.nickname,
                        avatar_url: userResult.avatar_url,
                        rooms: tempRoom,
                        channels: tempChannel
                    }
                } else {
                    result = {
                        allowLogin: false
                    }
                }

                return result;
            }

            callAllPromises().then((result) => {
                db.close();
                res.json(result);
            });

        });

    
    } catch (err) {
        console.log(err);
    }
});


io.on('connection', (socket) => {
    console.log(socket.id);
    socket.on('disconnect', function() {
        console.log(`${socket.id} has left`);
    });
    socket.on('user_disconnect', function() {
        socket.disconnect();
    });
});



http.listen(PORT, () => console.log('Listen on port ' + PORT));

