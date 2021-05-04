const inputID = document.getElementById("inputId");
const inputPw = document.getElementById("inputPassword");
const btnLogin = document.getElementById("btnLogin");

btnLogin.addEventListener("click", function (e) {
  e.stopPropagation();
  login();
});

function login() {
  document.location.href = "/";
}
