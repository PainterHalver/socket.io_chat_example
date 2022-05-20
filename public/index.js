/**
 * States
 */
let users = [];
let selectedUser = null;
let nickname = "";
const chatMessages = {
  global: [],
};

/**
 * Init
 */
const socket = io({ autoConnect: false }); // Wait for nickname before connecting

const init = async () => {
  nickname = sessionStorage.getItem("nickname");
  while (!nickname) {
    nickname = prompt("What is your nickname?");
    nickname = nickname.trim();
  }

  const res = await fetch("/api/users");
  users = await res.json();
  if (users.find((user) => user.nickname === nickname)) {
    sessionStorage.clear();
    alert("Nickname already taken.");
    return document.location.reload(true);
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
const messages = document.getElementById("messages");
const onlineUl = document.getElementById("online-users");
const chatRoomName = document.querySelector(".room-name");
const globalBtn = document.querySelector(".btn-global");

/**
 * Events
 */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!input.value) {
    return;
  }

  if (!selectedUser) {
    socket.emit("global message", input.value);
  } else {
    const message = `${socket.auth.nickname}: ${input.value}`;
    socket.emit("private message", {
      to: selectedUser.id,
      message,
    });
    const user = users.findIndex((user) => user.id === selectedUser.id);
    users[user].messages.push(message);
    appendMessage(message); // Directly append msg (different from global message, for now)
  }

  input.value = "";
});

/**
 * Typing
 */

// https://stackoverflow.com/questions/16766488/socket-io-how-to-check-if-user-is-typing-and-broadcast-it-to-other-users
let typing = false;
let timeout = undefined;

const timeoutFunction = () => {
  typing = false;
  socket.emit("typing", { isTyping: false, to: null });
};

input.addEventListener("keypress", (e) => {
  if (e.key !== "Enter") {
    if (!typing) {
      typing = true;
      socket.emit("typing", { isTyping: true, to: selectedUser ? selectedUser.id : null });
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

const setMessages = (msgs) => {
  messages.innerHTML = "";
  msgs.forEach((msg) => appendMessage(msg));
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

socket.on("global message", (msg) => {
  chatMessages.global.push(msg);
  if (!selectedUser) {
    appendMessage(msg);
  }
});

socket.on("private message", ({ from, message }) => {
  const fromUserIndex = users.findIndex((user) => user.id === from);
  users[fromUserIndex].messages.push(message);

  if (selectedUser && from === selectedUser.id) {
    appendMessage(message);
  }
});

socket.on("user connected", (user) => {
  addOnlineUser(user);
  users.push(user);
});
socket.on("user disconnected", (user) => {
  removeOnlineUser(user);
  users = users.filter((u) => u.id !== user.id);
});

socket.on("typing", ({ nickname, isTyping, to }) => {
  if (!isTyping) {
    let items = document.querySelectorAll(`li[data-typing-nickname="${nickname}"]`);
    items.forEach((item) => item.remove());
    return;
  }

  // In private chat, not selected user typing
  if (selectedUser && selectedUser.nickname !== nickname) {
    return;
  }

  // In private chat, but selected user typing in global chat or to someone else
  if (selectedUser && (!to || to !== socket.id)) {
    return;
  }

  // In global chat, but user is typing in private chat
  if (!selectedUser && to) {
    return;
  }

  let item = document.createElement("li");
  item.dataset.typingNickname = nickname;
  item.textContent = `${nickname} is typing...`;
  messages.appendChild(item);
  item.scrollIntoView({ behavior: "smooth" });
});

/**
 * Handle user selection
 */
globalBtn.addEventListener("click", () => {
  selectedUser = null;
  chatRoomName.textContent = "Global";
  globalBtn.classList.add("hidden");

  setMessages(chatMessages.global);
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

    setMessages(users[users.findIndex((user) => user.id === selectedUser.id)].messages);
  }
});
