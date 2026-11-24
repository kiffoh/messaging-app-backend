import { env } from "./config/env.js";
import createError from 'http-errors';
import express, { type Request, type Response, type NextFunction } from "express";
import logger from 'morgan';
import cors from 'cors';
import passport from 'passport';
import "./middleware/passport.js";
import { handleError } from './middleware/error.js';

// Import socket.io and http
import { Server } from 'socket.io';
import http from 'http';

console.log(`Current environment: ${process.env.NODE_ENV || "default"}`);

import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './configuration/openapi.js';
import { mountRoutes } from './configuration/defineRoute.js';
import { userRoutes } from './routes/users.js';
import { messageRoutes } from './routes/messages.js';
import { groupRoutes } from './routes/groups.js';

var app = express();

// Create server and socket.io instance
var server = http.createServer(app);
// Initialize socket.io server
const io = new Server(server, {
  cors: {
    origin: env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Set up basic socket connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Disconnect event
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({origin: env.FRONTEND_URL}));

app.use(passport.initialize());

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

const router = express.Router();
mountRoutes(router, [...userRoutes, ...messageRoutes, ...groupRoutes], io);
app.use(router);

// catch 404 and forward to error handler
app.use(function(req: Request, res: Response, next: NextFunction) {
  next(createError(404));
});

app.use(handleError);

// Export app and io for use in routes/controllers
export { app, server, io };
