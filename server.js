const express = require('express')
const app = express()

require('dotenv').config();
app.use(express.urlencoded({ extended: true }));
const MongoClient = require('mongodb').MongoClient
app.set('view engine', 'ejs');
const { ObjectId } = require('mongodb')

app.use('/public', express.static('public'));
const methodOverride = require('method-override')
app.use(methodOverride('_method'));

const http = require('http').createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);

var db;
MongoClient.connect(process.env.DB_URL, function (err, client) {
    if (err) return console.log(err);
    db = client.db('todoapp');

    // db.collection('post').insertOne({ 이름: 'john', 나이: 20, _id: 100 }, function (에러, 결과) {
    //     console.log('저장완료');
    // });

    http.listen(process.env.PORT, function () {
        console.log('listening on 8080')
    })
})

// app.get('/', function (요청, 응답) {
//     응답.sendFile(__dirname + '/index.html')
// })

// app.get('/pet', function (req, res) {
//     res.send('펫용품 쇼핑할 수 있는 페이지입니다.');
// });

app.get('/', (req, res) => {
    res.render('index.ejs', {});
})
app.get('/write', function (req, res) {
    res.render('write.ejs', {})
});

app.get('/list', (req, res) => {

    //디비에 저장된 post collection안의 모든 데이터를 꺼내주세요
    db.collection('post').find().toArray(function (에러, 결과) {
        console.log(결과);
        res.render('list.ejs', { posts: 결과 });

    });
})

app.get('/detail/:id', (req, res) => {
    db.collection('post').findOne({ _id: parseInt(req.params.id) }, function (에러, 결과) {
        console.log(결과);
        res.render('detail.ejs', { data: 결과 })
    })
})

app.get('/edit/:id', (req, res) => {
    db.collection('post').findOne({ _id: parseInt(req.params.id) }, (에러, 결과) => {
        console.log(결과);
        res.render('edit.ejs', { post: 결과 })
    })
});

app.put('/edit', (req, res) => {
    console.log(req.body);
    db.collection('post').updateOne({ _id: parseInt(req.body.id) }, { $set: { 제목: req.body.title, 날짜: req.body.date } }, () => {
        console.log('수정완료');
        res.redirect('/list');
    })
})

// app.get('/search', (req, res) => {
//     db.collection('post').find({ $text: { $search: req.query.value } }).toArray((err, data) => {
//         res.render('search.ejs', { search: data })
//     })
// })

app.get('/search', (req, res) => {
    var 검색조건 = [
        {
            $search: {
                index: 'titleSearch',
                text: {
                    query: req.query.value,
                    path: '제목'  // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
                }
            }
        },
        { $sort: { _id: 1 } }, //_id를 순서대로 나타내어줌
        { $limit: 10 }, // 10개만 나타내어줌
        { $project: { 제목: 1, _id: 1, score: { $meta: "searchScore" } } }
    ];

    db.collection('post').aggregate(검색조건).toArray((err, data) => {
        console.log(data);
        res.render('search.ejs', { search: data })
    })
})

app.get('/register', (req, res) => {
    res.render('register.ejs')
})

app.post('/register', 중복검사, (req, res) => {
    console.log(req.body)
    db.collection('login').insertOne({ id: req.body.re_id, pw: req.body.re_pw }, (err, data) => {
        console.log('아이디 등록')
        res.redirect('/')
    })
})

function 중복검사(req, res, next) {
    db.collection('login').findOne({ id: req.body.re_id }, (err, data) => {
        if (data) {
            res.send('아이디가 중복됩니다.')
        } else {
            next()
        }
    });
}


const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({ secret: '비밀코드', resave: true, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.get('/login', (req, res) => {
    res.render('login.ejs')
});

app.post('/login', passport.authenticate('local', {
    failureRedirect: '/fail'
}), (req, res) => {
    res.redirect('/')
});

app.get('/mypage', 로그인했니, (req, res) => {
    res.render('mypage.ejs', { 사용자: req.user })
});

function 로그인했니(req, res, next) {
    if (req.user) {
        next()
    } else {
        res.send('로그인안하셨는데요?')
    }
};


passport.use(new LocalStrategy({
    usernameField: 'id',
    passwordField: 'pw',
    session: true, //로그인 후 세션을 저장할 것인가? true = yes
    passReqToCallback: false, // 아이디/비번 말고도 다른 정보 검증시 true로 하면됨
}, function (입력한아이디, 입력한비번, done) {
    //console.log(입력한아이디, 입력한비번);
    db.collection('login').findOne({ id: 입력한아이디 }, function (에러, 결과) {
        if (에러) return done(에러)

        if (!결과) return done(null, false, { message: '존재하지않는 아이디요' })
        if (입력한비번 == 결과.pw) {
            return done(null, 결과)
        } else {
            return done(null, false, { message: '비번틀렸어요' })
        }
    })
}));

app.post('/add', (req, res) => {
    //res.send('전송완료'); // res.send() 부분은 항상 존재해야한다.  전송 실패 or 성공이든 서버에서 뭔가를 보내주어야함. 안그러면 브라우저가 멈춘다. ;

    console.log(req.body.title);
    console.log(req.body.date);

    db.collection('counter').findOne({ name: '게시물갯수' }, function (에러, 결과) {
        console.log(결과.totalPost)
        var 총게시물갯수 = 결과.totalPost;
        var 저장할거 = { _id: 총게시물갯수 + 1, 작성자: req.user._id, 제목: req.body.title, 날짜: req.body.date, }

        db.collection('post').insertOne(저장할거, function (에러, 결과) {
            console.log('저장완료');
            db.collection('counter').updateOne({ name: '게시물갯수' }, { $inc: { totalPost: 1 } }, function (에러, 결과) {
                if (에러) { return console.log(에러) }
                res.redirect('/list')
            })
        });
    });
})

app.delete('/delete', function (req, res) {
    req.body._id = parseInt(req.body._id);
    var 삭제할데이터 = { _id: req.body._id, 작성자: req.user._id }
    db.collection('post').deleteOne(삭제할데이터, function (err, data) {
        console.log('삭제완료');
        if (err) { console.log(err) }
        res.status(200).send({ message: '성공했습니다' });
    })
})
//세션을 저장시키는 코드 (로그인 성공시 발동)
passport.serializeUser((user, done) => {
    done(null, user.id)
});

passport.deserializeUser((아이디, done) => {
    db.collection('login').findOne({ id: 아이디 }, (err, data) => {
        done(null, data)
    })
});

app.use('/shop', require('./routes/shop.js'));

app.use('/board/sub', require('./routes/board_sub.js'));

//이미지 업로드

let multer = require('multer');
var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/image')
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname + '날짜' + new Date())
    }

});

var upload = multer({ storage: storage });

app.get('/upload', (req, res) => {
    res.render('upload.ejs')
})

app.post('/upload', upload.single('프로필'), (req, res) => {
    res.send('업로드완료')
})

app.get('/image/:imageName', (req, res) => {
    res.sendFile(__dirname + '/public/image/' + req.params.imageName)
})

app.post('/chatroom', 로그인했니, (req, res) => {
    var 저장할거 = {
        title: '채팅채팅방',
        member: [ObjectId(req.body.당한사람id), req.user._id],
        date: new Date()
    }

    db.collection('chatroom').insertOne(저장할거, (err, data) => {
        console.log('저장완료')
    })

})

app.get('/chat', 로그인했니, (req, res) => {
    db.collection('chatroom').find({ member: req.user._id }).toArray((err, data) => {
        res.render('chat.ejs', { 사용자: data })

    })

})

app.post('/message', 로그인했니, function (req, res) {
    var 저장할거 = {
        parent: req.body.parent,
        userid: req.user._id,
        content: req.body.content,
        date: new Date(),
    }
    db.collection('message').insertOne(저장할거)
        .then((data) => {
            res.send(data);
        })
});

app.get('/message/:id', 로그인했니, function (req, res) {

    res.writeHead(200, {
        "Connection": "keep-alive",
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
    });


    db.collection('message').find({ parent: req.params.id }).toArray()
        .then((data) => {
            res.write('event: test\n');
            res.write(`data: ${JSON.stringify(data)} \n\n`);
        });

    const pipeline = [
        { $match: { 'fullDocument.parent': req.params.id } }
    ];

    const changeStream = db.collection('message').watch(pipeline);

    changeStream.on('change', result => {
        console.log(result.fullDocument);
        var 추가된문서 = [result.fullDocument];
        res.write('event: test\n');
        res.write(`data: ${JSON.stringify(추가된문서)}\n\n`);
    });

});

// socket io
app.get('/socket', (req, res) => {
    res.render('socket.ejs')
})

//웹소켓에 접속하면 아래 콜백함수를 실행해주세요
io.on('connection', (socket) => {
    console.log('유저접속됨')

    socket.on('joinRoom', (data) => {
        socket.join('room1');
    })

    socket.on('room1-send', (data) => {
        io.to('room1').emit('broadcast', data);
    })

    socket.on('user-send', (data) => {
        io.emit('broadcast', data)
    })


})