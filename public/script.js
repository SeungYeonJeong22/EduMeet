const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myPeer = new Peer(
  undefined
  //     {
  //     host: '/',
  //     port: '3001',
  // }
);
let userId = getCookie("nickname");
console.log(userId);
const myVideo = document.createElement("video");
myVideo.muted = true;

myPeer.on("open", (id) => {
  userId = id;
  start();
});

const start = () => {
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: true,
    })
    .then((stream) => {
      addVideoStream(myVideo, stream, userId);
      socket.on("user-connected", (targetId) => {
        connectToNewUser(targetId, stream);
      });

      socket.on("receive-chat", (text, display) => {
        addChat(display, text);
      });

      myPeer.on("call", (call) => {
        call.answer(stream);
        const video = document.createElement("video");
        call.on("stream", (userVideoStream) => {
          if (isExistVideo(call.peer)) {
            // replace Video
            replaceVideoStream(call.peer, userVideoStream);
          } else {
            addVideoStream(video, userVideoStream, call.peer);
          }
        });
      });

      socket.emit("join-room", ROOM_ID, userId);
    });
};

window.addEventListener("load", checkCompatibility);

function checkCompatibility() {
  console.log("checkCompatibility Success");
  recognition = new (window.SpeechRecognition ||
    window.webkitSpeechRecognition)();
  recognition.lang = "ko";
  recognition.maxAlternatives = 3;
  recognition.interimResults = false; //실시간 강의처럼 빠르게 나오게 함
  recognition.continuous = true;
  console.log("recognition  : ", recognition);
  if (!recognition) {
    alert("You cannot use speech api");
  }

  startSpeechRecognition();
}

function endSpeechRecognition() {
  recognition.stop();
}

function startSpeechRecognition() {
  var i = 0;
  console.log("Start");

  recognition.addEventListener("speechstart", (event) => {
    console.log("Speech Start");
  });

  recognition.addEventListener("speechend", (event) => {
    console.log("Speech End");
  });

  recognition.addEventListener("result", (event) => {
    console.log("result", event.results); //여기서 result를 꺼내보면
    console.log("result", event.results[0][0].transcript);
    document.getElementById("msg").value = event.results[i][0].transcript;

    if (event.results[0].isFinal == true) {
      console.log("after end : ", event.results);
      i = i + 1;
    } else {
      console.log("before end : ", event.results[0].isFinal);
    }
  });

  recognition.addEventListener("end", (event) => {
    recognition.start();
  });

  recognition.start();
}

//방에 기존에 있던 모든 사용자가 새로 방에 들어온 사람에게
//전화를검
function connectToNewUser(targetId, stream) {
  const call = myPeer.call(targetId, stream);
  //새로운 사용자의 비디오를 넣을 비디오태그를 만듭니다.
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    if (isExistVideo(targetId)) {
      replaceVideoStream(targetId, userVideoStream);
    } else {
      addVideoStream(video, userVideoStream, targetId);
    }
  });
  call.on("close", () => {
    video.remove();
  });
}

//video: 내가만든 html element = 내영상이 들어갈 자리
// stream = 진짜 미디어 소스
function addVideoStream(video, stream, targetId) {
  video.srcObject = stream;
  video.setAttribute("display", targetId);
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
}

const sendChat = function () {
  const chat = document.getElementById("textarea-chat-text");
  addChat("나", chat.value);
  socket.emit("send-chat", ROOM_ID, chat.value, userId);
  chat.value = "";
};

const addChat = (display, text) => {
  const chatLog = document.getElementById("chat-log");
  const chat = document.createElement("p");
  chat.innerText = `${display} : ${text}`;
  chatLog.append(chat);
};

const toggleShareScreen = () => {
  if (document.getElementById("shareScreenBtn").innerHTML === "화면공유") {
    shareScreen();
  } else {
    cancelShareScreen();
  }
};

const shareScreen = () => {
  navigator.mediaDevices
    .getDisplayMedia({
      audio: true,
      video: true,
    })
    .then(function (stream) {
      replaceVideoStream(userId, stream); // 내 비디오 변경
      const videos = document.getElementsByTagName("video");
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        const targetId = video.getAttribute("display");
        if (userId === targetId) continue;
        myPeer.call(targetId, stream); // 본인이 call검
      }
      document.getElementById("shareScreenBtn").innerHTML = "공유취소";
    })
    .catch(function (e) {
      //error;
    });
};

const cancelShareScreen = () => {
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: true,
    })
    .then((stream) => {
      replaceVideoStream(userId, stream); // 내 비디오 변경
      const videos = document.getElementsByTagName("video");
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        const targetId = video.getAttribute("display");
        if (userId === targetId) continue;
        myPeer.call(targetId, stream); // 본인이 call검
      }
      document.getElementById("shareScreenBtn").innerHTML = "화면공유";
    });
};

const replaceVideoStream = (userId, stream) => {
  const videos = document.getElementsByTagName("video");
  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    if (video.getAttribute("display") === userId) {
      video.srcObject = stream;
      break;
    }
  }
};

const isExistVideo = (userId) => {
  const videos = document.getElementsByTagName("video");
  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    if (video.getAttribute("display") === userId) {
      return true;
    }
  }
  return false;
};
