https://socket.io/get-started/chat

https://socket.io/docs/v4/emit-cheatsheet/

# Homework

Here are some ideas to improve the application:

- [x] Broadcast a message to connected users when someone connects or disconnects.
- [x] Add support for nicknames.
- [x] Make nickname persistent over TAB reloads until manually removed. (sessionStorage, not localStorage)
- [x] Don’t send the same message to the user that sent it. Instead, append the message directly as soon as he/she presses enter. (Doesn't make much sense)
- [x] Add “{user} is typing” functionality.
- [x] Show who’s online.
- [x] Text wrap when msg too long, or limit chars length (`word-break: break-word;`)
- [ ] Filter invalid nicknames.
- [ ] Add private messaging.
