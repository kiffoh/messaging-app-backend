import { env } from "./config/env.js";
import createError from 'http-errors';
import express, { type Request, type Response, type NextFunction } from "express";
import logger from 'morgan';
import cors from 'cors';
import { handleError } from './middleware/error.js';

import { io } from './lib/io.js';
import http from 'http';

console.log(`Current environment: ${process.env.NODE_ENV || "default"}`);

import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './openapi/document.js';
import { mountRoutes } from './openapi/defineRoute.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/users/users.routes.js';
import { messageRoutes } from './routes/messages.js';
import { groupRoutes } from './modules/groups/groups.routes.js';

const app = express();

const server = http.createServer(app);
io.attach(server, {
  cors: {
    origin: env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({origin: env.FRONTEND_URL}));

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

const router = express.Router();
mountRoutes(router, [...authRoutes, ...userRoutes, ...messageRoutes, ...groupRoutes]);
app.use(router);

// catch 404 and forward to error handler
app.use(function(req: Request, res: Response, next: NextFunction) {
  next(createError(404));
});

app.use(handleError);

// Export app and io for use in routes/controllers
export { app, server, io };
