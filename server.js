const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { v4: uuidV4 } = require("uuid");
const mysql = require("mysql");
const { timeStamp } = require("console");
const { Translate } = require("@google-cloud/translate").v2;
require("dotenv").config();

const CREDENTIALS = JSON.parse(process.env.CREDENTIALS);

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use;
//db 연동
let db_info;
try {
  db_info = mysql.createConnection({
    // host: "192.168.99.100",
    user: "root",
    password: "power900!",
    database: "edumeet",
    port: 3306,
    dateStrings: "date",
  });
  db_info.connect();
} catch (error) {
  console.log(error);
}
const conn = db_info;

app.use(async (req, res, next) => {
  const createUser =
    "create table if not exists `user`(\
  id integer(10),\
   uid varchar(20),\
   user_pw varchar(20),\
   nickname varchar(30),\
   su_date datetime,\
   role varchar(10),\
   primary key(id),\
   constraint user_id UNIQUE(uid)\
)";
  const createAttandanceBook =
    "create table if not exists attandance_book(\
  id integer(10),\
   user_id integer(10),\
   name varchar(30),\
   primary key(id),\
   foreign key (user_id) references user(id)\
)";

  const createAttandance =
    "create table if not exists attandance(\
  id integer(10),\
   att_book_id integer(10),\
   user_id integer(10),\
   datetime datetime,\
   chk_att boolean,\
   primary key(id),\
   foreign key (user_id) references user(id),\
   foreign key (att_book_id) references attandance_book(id)\
)";
  await conn.query(createUser);
  await conn.query(createAttandanceBook);
  await conn.query(createAttandance);

  next();
});

//쿠키 파싱을 위한 함수
const parseCookies = (cookie = "") => {
  let eachCookies = cookie.split(";");
  return eachCookies
    .map((e) => e.split("="))
    .reduce((acc, [key, val]) => {
      acc[key.trim()] = decodeURIComponent(val);
      return acc;
    }, {});
};

//main화면
app.get("/", (req, res) => {
  //쿠키에 아이디가 없으면 그냥 main화면
  if (isEmpty(req.headers.cookie)) {
    res.render("main");
  } else {
    //있으면 쿠키 아이디값을 준 메인 화면
    const cookies = parseCookies(req.headers.cookie);
    res.render("main", { userid: cookies.id, userRole:cookies.role});
  }
});

//login화면
app.get("/login", (req, res) => {
  res.render("login");
});

//login - db 체크
app.post("/loginAF", (req, res) => {
  const expires = new Date();

  var body = req.body;
  const cookies = parseCookies(req.headers.cookie);

  try {
    var chk_usr_sql =
      "select uid,user_pw, nickname, role from user where uid=? and user_pw=?";
    var params = [body.inputId, body.inputPassword];

    conn.query(chk_usr_sql, params, function (err, rows, fields) {
      if (isEmpty(rows)) {
        console.log("query is not excuted. chk_usr_sql fail...\n" + err);
        res.redirect("/login");
      } else {
        console.log("login Success");
        res.cookie("nickname", rows[0]["nickname"], {
          maxAge: 1000 * 60 * 60 * 24 * 7,
        });
        res.cookie("id", rows[0]["uid"], {
          maxAge: 1000 * 60 * 60 * 24 * 7,
        });
        res.cookie("role", rows[0]["role"], {
          maxAge: 1000 * 60 * 60 * 24 * 7,
        });
        res.redirect("/"); //로그인에 성공할 경우 main화면으로 보냄
      }
    });
  } catch (e) {
    console.log(e);
  }
});

app.get("/requireRoomNumber", (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

//회원가입화면
app.get("/register", (req, res) => {
  res.render("register",{fail:false});
});

//회원가입 - db 연동
app.post("/registerAF", (req, res) => {
  var body = req.body;
  //maxId값 가져오기
  var maxId_sql = "select max(id) from `user`";
  var maxId = 0;

  conn.query(maxId_sql, function (err, rows, fields) {
    if (err) console.log("query is not excuted. find max id fail...\n" + err);
    else maxId = rows[0]["max(id)"] + 1;

    var signup_sql = "insert into `user` values (?,?,?,?,?,?)";
    var timestamp = +new Date();
    var date = new Date(timestamp);
    date =
      date.getFullYear() +
      "/" +
      (date.getMonth() + 1) +
      "/" +
      date.getDate() +
      " " +
      date.getHours() +
      ":" +
      date.getMinutes() +
      ":" +
      date.getSeconds();

    var params = [
      maxId,
      body.inputId,
      body.inputPassword,
      body.nickname,
      date,
      body.identity,
    ];

    try {
      conn.query(signup_sql, params, function (err) {
        if (err) {
          console.log("query is not excuted. insert fail...\n" + err);
          res.render('register',{fail:err.code})
        }
        else {
          console.log("success sign up");
          res.redirect("/login"); //회원가입에 성공할경우 바로 로그인창으로 보냄
        }
      });
    } catch (e) {
      console.log('error : ',e);
    }
  });
});


app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);
    socket.broadcast.to(roomId).emit("user-connected", userId);
  });
  socket.on("send-chat", (roomId, chat, userId) => {
    socket.broadcast.to(roomId).emit("receive-chat", chat, userId);
  });
});

//번역
const translate = new Translate({
  credentials: CREDENTIALS,
  projectId: CREDENTIALS.project_id,
});

const translateText = async (text, targetLanguage) => {
  try {
    let [response] = await translate.translate(text, targetLanguage);
    return response;
  } catch (error) {
    console.log(`Error at translateText --> ${error}`);
    return 0;
  }
};

app.post("/translationAF", (req, res) => {
  transMessage = req.body.trans;
  lang = req.body.lang;
  console.log("trans : ", transMessage);
  translateText(transMessage, lang)
    .then((transMessage) => {
      res.json({ ok: true, trans: transMessage });
    })
    .catch((err) => {
      console.log(err);
    });
});

//로그인 체크할 때 값이 들어오는지 확인하기 위함
var isEmpty = function (value) {
  if (
    value == "" ||
    value == null ||
    value == undefined ||
    (value != null && typeof value == "object" && !Object.keys(value).length)
  ) {
    return true;
  } else {
    return false;
  }
};

server.listen(3000);
