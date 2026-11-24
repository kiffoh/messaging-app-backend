import { app, server } from "./app.js";
import { env } from "./config/env.js";

app.set("port", env.PORT);

server.listen(env.PORT, () => console.log("Running on port", env.PORT));
server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.syscall !== "listen") throw error;
  switch (error.code) {
    case "EACCES":
      console.error(`Port ${env.PORT} requires elevated privileges`);
      process.exit(1);
    case "EADDRINUSE":
      console.error(`Port ${env.PORT} is already in use`);
      process.exit(1);
    default:
      throw error;
  }
});
