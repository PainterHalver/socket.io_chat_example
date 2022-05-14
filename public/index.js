let nickname = sessionStorage.getItem("nickname");
while (!nickname) {
  nickname = prompt("What is your nickname?");
  sessionStorage.setItem("nickname", nickname);
}
document.title = `Chat - ${nickname}`;
const socket = io({ query: { nickname } });

const form = document.getElementById("form");
const input = document.getElementById("input");

const appendMessage = (msg) => {
  let item = document.createElement("li");
  item.textContent = msg;
  messages.appendChild(item);
  window.scrollTo(0, document.body.scrollHeight);
};

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value) {
    socket.emit("chat message", input.value);
    appendMessage(`${nickname}: ${input.value}`);
    input.value = "";
  }
});

// Typing
// https://stackoverflow.com/questions/16766488/socket-io-how-to-check-if-user-is-typing-and-broadcast-it-to-other-users
let typing = false;
let timeout = undefined;

const timeoutFunction = () => {
  typing = false;
  socket.emit("typing", false);
};

input.addEventListener("keypress", (e) => {
  if (e.key !== "Enter") {
    if (!typing) {
      typing = true;
      socket.emit("typing", true);
      timeout = setTimeout(timeoutFunction, 1000);
    } else {
      clearTimeout(timeout);
      timeout = setTimeout(timeoutFunction, 1000);
    }
  } else {
    clearTimeout(timeout);
    timeoutFunction();
  }
});

socket.on("chat message", appendMessage);

socket.on("typing", ({ nickname, isTyping }) => {
  if (isTyping) {
    let item = document.createElement("li");
    item.dataset.typingNickname = nickname;
    item.textContent = `${nickname} is typing...`;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
  } else {
    let item = document.querySelector(`li[data-typing-nickname="${nickname}"]`);
    item.remove();
  }
});
