// Wait for nickname before connecting
const socket = io({ autoConnect: false });

let nickname = sessionStorage.getItem("nickname");
while (!nickname) {
  nickname = prompt("What is your nickname?");
}
sessionStorage.setItem("nickname", nickname);
document.title = `Chat - ${nickname}`;

socket.auth = { nickname };
socket.connect();

// Debugging
socket.onAny((event, ...args) => {
  console.log(event, args);
});

/**
 * Variables
 */
const form = document.getElementById("form");
const input = document.getElementById("input");
const online = document.getElementById("online-count");
const onlineUl = document.getElementById("online-users");
const chatRoomName = document.querySelector(".room-name");
const globalBtn = document.querySelector(".btn-global");

/**
 * States
 */
let users = [];
let selectedUser = null;

/**
 * Events
 */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value) {
    socket.emit("chat message", input.value);
    input.value = "";
  }
});

/**
 * Typing
 */

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

/**
 * Socket events
 */
const appendMessage = (msg) => {
  let item = document.createElement("li");
  item.textContent = msg;
  messages.appendChild(item);
  item.scrollIntoView({ behavior: "smooth" });
};

const setOnlineUsers = (users) => {
  onlineUl.innerHTML = "";
  users.forEach((user) => {
    let item = document.createElement("li");
    item.textContent = user.nickname;
    item.dataset.id = user.socketId;
    item.dataset.nickname = user.nickname;
    onlineUl.appendChild(item);
  });
};

socket.on("chat message", appendMessage);
socket.on("online count change", async (count) => {
  online.textContent = `Online: ${count}`;
  const res = await fetch("/api/users");
  users = await res.json();
  setOnlineUsers(users);
});

socket.on("typing", ({ nickname, isTyping }) => {
  if (isTyping) {
    let item = document.createElement("li");
    item.dataset.typingNickname = nickname;
    item.textContent = `${nickname} is typing...`;
    messages.appendChild(item);
    item.scrollIntoView({ behavior: "smooth" });
  } else {
    let item = document.querySelector(`li[data-typing-nickname="${nickname}"]`);
    item.remove();
  }
});

/**
 * Handle user selection
 */
globalBtn.addEventListener("click", () => {
  selectedUser = null;
  chatRoomName.textContent = "Global";
  globalBtn.classList.add("hidden");
});

onlineUl.addEventListener("click", (e) => {
  if (e.target.tagName === "LI") {
    if (e.target.dataset.id === socket.id) {
      return;
    }

    selectedUser = e.target.dataset.nickname;
    input.disabled = false;
    input.focus();
    chatRoomName.textContent = `${selectedUser}`;
    globalBtn.classList.remove("hidden");
  }
});
