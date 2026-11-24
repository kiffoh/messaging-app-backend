import { Server } from "socket.io";
import { verifyToken } from "./token.js";

// Created detached so controllers can import it; app.ts attaches it to the http server.
export const io = new Server();

io.use((socket, next) => {
  try {
    socket.data.userId = verifyToken(String(socket.handshake.auth.token)).id;
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.data.userId}`);
});

export const emitToMembers = (memberIds: number[], event: string, payload: unknown) => {
  io.to(memberIds.map((id) => `user:${id}`)).emit(event, payload);
};
