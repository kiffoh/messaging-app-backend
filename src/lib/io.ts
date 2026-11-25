import { Server } from "socket.io";
import { verifyToken } from "./token.js";

// Created detached so controllers can import it; app.ts attaches it to the http server.
export const io = new Server();

io.use((socket, next) => {
  try {
    const { id, exp } = verifyToken(String(socket.handshake.auth.token));
    socket.data.userId = id;
    socket.data.exp = exp;
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.data.userId}`);
  const expiry = setTimeout(() => socket.disconnect(true), socket.data.exp * 1000 - Date.now());
  socket.on("disconnect", () => clearTimeout(expiry));
});

export const emitToMembers = (memberIds: number[], event: string, payload: unknown) => {
  if (memberIds.length === 0) return; // io.to([]) would broadcast to every socket
  io.to(memberIds.map((id) => `user:${id}`)).emit(event, payload);
};
