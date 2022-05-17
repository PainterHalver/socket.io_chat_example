/**
 * States
 */
let users = [];
let selectedUser = null;
let nickname = "";

/**
 * Init
 */
const socket = io({ autoConnect: false }); // Wait for nickname before connecting

const init = async () => {
  nickname = sessionStorage.getItem("nickname");
  while (!nickname) {
    nickname = prompt("What is your nickname?");
  }

  const res = await fetch("/api/users");
  const users = await res.json();
  if (users.find((user) => user.nickname === nickname)) {
    alert("Nickname already taken.");
    document.location.reload(true);
  }

  sessionStorage.setItem("nickname", nickname);
  document.title = `Chat - ${nickname}`;
  socket.auth = { nickname };
  socket.connect();

  users.forEach((user) => addOnlineUser(user));
};
init();

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

const addOnlineUser = (user) => {
  let item = document.createElement("li");
  item.textContent = user.nickname;
  item.dataset.id = user.id;
  item.dataset.nickname = user.nickname;
  onlineUl.appendChild(item);
};

const removeOnlineUser = (user) => {
  const item = onlineUl.querySelector(`[data-id="${user.id}"]`);
  onlineUl.removeChild(item);
};

socket.on("chat message", appendMessage);
socket.on("user connected", addOnlineUser);
socket.on("user disconnected", removeOnlineUser);

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

    selectedUser = {
      nickname: e.target.dataset.nickname,
      id: e.target.dataset.id,
    };
    input.disabled = false;
    input.focus();
    chatRoomName.textContent = `${selectedUser.nickname}`;
    globalBtn.classList.remove("hidden");
  }
});
