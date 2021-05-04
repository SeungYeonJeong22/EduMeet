const btnLoginPage = document.getElementById("btnLoginPage");
const btnRegisterPage = document.getElementById("btnRegisterPage");
const btnMakeRoom = document.getElementById("makeRoom");
const taRoomNumber = document.getElementById("roomNumber");
const btnEnterTheRoom = document.getElementById("enterRoom");
const nickname = getCookie("nickname");
const role = getCookie("role");

const login = () => {
  loginPage();
};

const register = () => {
  registerPage();
};

btnMakeRoom.addEventListener("click", function (e) {
  e.stopPropagation();
  if (!nickname) return;
  else if(role == 'student') {
    alert("Student can't create room");
    return;
  }
  document.location.href = "/requireRoomNumber";
});

btnEnterTheRoom.addEventListener("click", function (e) {
  e.stopPropagation();
  if (!nickname) return;
  if (taRoomNumber.value != "")
    document.location.href = `/${taRoomNumber.value}`;
});

function loginPage() {
  document.location.href = "/login";
}

function registerPage() {
  document.location.href = "/register";
}

const navVarRight = document.getElementById("nav-var-right");
const loginUserDiv = document.getElementById("login-user");
loginUserDiv.innerText = nickname ? `${nickname}님 어서오세요.` : "";

navVarRight.innerHTML = nickname
  ? `<button id="logoutBtn" onclick="logout()">로그아웃</button>`
  : `<button id = "btnLoginPage"  name = "btnLoginPage" type="button" class = "s-margin" onclick="login()">로그인</button>
<button id = "btnRegisterPage" name = "btnRegisterPage" type="button" class = "s-margin" onclick="register()">회원가입</button>`;
