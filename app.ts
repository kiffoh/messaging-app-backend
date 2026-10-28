import { env } from "./src/config/env.js";
import createError from 'http-errors';
import express, { type Request, type Response, type NextFunction } from "express";
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cors from 'cors';
import passport from 'passport';
import "./src/configuration/passportConfig.js";

// Import socket.io and http
import { Server } from 'socket.io';
import http from 'http';

console.log(`Current environment: ${process.env.NODE_ENV || "default"}`);

import indexRouter from './src/routes/index.js';
import usersRouter from './src/routes/users.js';
import messageRouter from './src/routes/messages.js';
import groupRouter from './src/routes/groups.js';

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

// view engine setup
app.set('views', path.join(process.cwd(), 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(process.cwd(), 'public')));
app.use(cors({origin: env.FRONTEND_URL}));
app.options('*', cors());

app.use(passport.initialize());

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/messages', messageRouter(io));
app.use('/groups', groupRouter);

// catch 404 and forward to error handler
app.use(function(req: Request, res: Response, next: NextFunction) {
  next(createError(404));
});

// error handler
app.use(function(err: any, req: Request, res: Response, next: NextFunction) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});


// Export app and io for use in routes/controllers
export { app, server, io };
