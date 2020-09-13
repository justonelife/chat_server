var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var cors = require('cors');
var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;
const { addUser, removeUser, getUserRoom } = require('./user');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');


//@desc mongo config
const MongoURI = 'mongodb://localhost:27017/mydb'
const DATABASE_URL = 'mongodb://localhost:27017/';
const MONGO_OPTIONS = {
    useNewUrlParser: true,
    useUnifiedTopology: true
}
const db_name = 'mydb';


//Middleware
app.use('/static', express.static('public'));
app.use(bodyParser.json());
app.use(cors());


//Create mongo connection 
const conn = mongoose.createConnection(MongoURI, MONGO_OPTIONS);
//Init gfs
let gfs;
conn.once('open', () => {
    //Init stream
    gfs = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'avatars'
    })
})

//Create storage
var storage = new GridFsStorage({
    url: MongoURI,
    options: MONGO_OPTIONS,
    file: (req, file) => {
        // Original filename is user_id
        const fileId = mongo.ObjectId(file.originalname);
        // const filename = file.originalname;
        const filename = file.originalname;
        const fileInfo = {
            id: fileId,
            filename: filename,
            bucketName: 'avatars'
        };
        return fileInfo;
    }
});

const upload = multer({ storage });

//@route POST /uploads
//@desc handle file_upload
app.post('/uploads', upload.single('avatar'), (req, res) => {
    const user_id = req.user_id;
    const filename = req.filename;

    MongoClient.connect(DATABASE_URL, MONGO_OPTIONS, (err, db) => {
        if (err) throw err;
        var dbo = db.db("mydb");
        var myquery = { _id: mongo.ObjectId(user_id) };
        var newvalues = { $set: { avatar_url: filename } };
        dbo.collection("users").updateOne(myquery, newvalues, (err, res) => {
            if (err) throw err;
            db.close();
        });
    });
    res.json({
        status: 'uploaded'
    }).end();
});

//@route GET /file/:filename
//@desc display file
app.get('/avatar/:filename', (req, res) => {
    // Correctly download a GridFS file by name
    const filename = req.params.filename;

    const file = gfs
        .find({
            filename: filename
        })
        .toArray((err, files) => {
            if (!files || files.length === 0) {
                return res.status(404).json({
                    err: "no files exist"
                });
            }
            gfs.openDownloadStreamByName(req.params.filename).pipe(res);
        });
});

//@route POST /delete/:id
//@desc delete chunks from the db
app.post("/avatars/del/:id", (req, res) => {
    gfs.delete(new mongoose.Types.ObjectId(req.params.id), (err, data) => {
        if (err) return res.status(404).json({ err: err.message });
        res.json({
            status: 'deleted'
        }).end();
    });
});


//@route POST /login
//@desc check user login info
app.post('/login', (req, res) => {

    try {
        var user_id = undefined;
        var room_id = undefined;


        MongoClient.connect(DATABASE_URL, MONGO_OPTIONS, (err, db) => {
            if (err) throw err;
            const dbo = db.db(db_name);

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

            var callAllPromises = async () => {
                var result = {};

                var userResult = await usersPromise();

                if (userResult) {
                    result = {
                        allowLogin: true,
                        user_id: userResult._id
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


//@route POST /data
//@desc take user_id then return basic info (nickname, avatar_url, rooms)
app.post('/data', (req, res) => {
    try {
        var user_id = req.body.user_id;
        MongoClient.connect(DATABASE_URL, MONGO_OPTIONS, (err, db) => {
            if (err) throw err;
            var dbo = db.db(db_name);

            var userPromise = () => {
                return new Promise((resolve, reject) => {
                    dbo.collection('users')
                        .find({ _id: mongo.ObjectId(user_id) })
                        .toArray((err, result) => {
                            err
                                ? reject(err)
                                : resolve(result[0]);
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

            var callAllPromises = async () => {
                var userResult = await userPromise();
                var roomsResult = await roomsPromise();
                var tempRoom = [];
                roomsResult.forEach(val =>
                    tempRoom.push({
                        id: val._id,
                        name: val.name,
                        channels: val.channels

                    }));
                return {
                    nickname: userResult.nickname,
                    avatar_url: userResult.avatar_url,
                    rooms: tempRoom
                }
            };

            callAllPromises().then((result) => {
                db.close();
                res.json(result);
            });

        });
    } catch (err) {
        console.log(err);
    }
});

//@route POST /channels
//@desc take channel_id then return channel's data
app.post('/channels', (req, res) => {
    try {
        var channel_id = req.body.id;
        if (!channel_id) res.json({});
        MongoClient.connect(DATABASE_URL, MONGO_OPTIONS, (err, db) => {
            if (err) throw err;
            var dbo = db.db(db_name);

            var channelsPromise = () => {
                return new Promise((resolve, reject) => {
                    dbo.collection('channels')
                        .find({ _id: mongo.ObjectId(channel_id) })
                        .toArray((err, result) => {
                            err
                                ? reject(err)
                                : resolve(result);
                        });
                });
            };

            var callAllPromises = async () => {
                var channelsResult = await channelsPromise();
                return channelsResult[0];
            };

            callAllPromises().then((result) => {
                db.close();
                res.json(result);
            });
        });
    } catch (err) {
        console.log(err);
    }
});



//@desc socket io 
io.on('connection', (socket) => {
    console.log(socket.id);
    const sid = socket.id;
    socket.on('disconnect', () => {
        removeUser(sid);
        console.log(`${sid} has left`);
    });
    socket.on('user_disconnect', () => {
        socket.disconnect();
    });

    //@desc handle user switch room
    socket.on('subscribe', ({ id, name, room }) => {
        const lastRoom = getUserRoom(sid);
        if (lastRoom) {
            socket.leave(lastRoom);
            removeUser(sid);
        }
        addUser(sid, id, name, room);
        socket.join(room);
        console.log(io.sockets.adapter.rooms);
    });

    //@desc handle user send message
    socket.on('message', (user_id, text, room, send_date) => {

        let _id = mongo.ObjectId();
        io.to(room).emit('message', _id, user_id, text, send_date);

        // MongoClient.connect(DATABASE_URL, MONGO_OPTIONS, (err, db) => {
        //     if (err) throw err;
        //     var dbo = db.db(db_name);
        //     dbo.collection('channels').updateOne({ _id: mongo.ObjectId(room) }, {

        //     })
        // })

    });

    //@desc handle user typing, notify to other users
    socket.on('typing', (nickname, room) => {
        socket.to(room).emit('typing', nickname);
    });

    //@desc handle user changed avatar, notify to other users to sync avatar display
    socket.on('notify avatar changed', (roomsList, id) => {
        roomsList.forEach(val => {
            socket.to(val).emit('member changed avatar', id);
        });
    }); 
});


//@desc run server
const PORT = process.env.PORT || 5000;
http.listen(PORT, () => console.log('Listen on port ' + PORT));

