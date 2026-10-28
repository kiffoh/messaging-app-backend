import type { Server } from "socket.io";
import express, { type Request, type Response, type NextFunction } from "express";
import * as messageController from '../controllers/messagesController.js';
import { uploadMessagePhoto } from '../configuration/multerConfig.js';

export default function(io: Server) {
    const router = express.Router();

    // Wrap each controller function to include io
    const wrapController = (controller: (req: Request, res: Response, next: NextFunction, io: Server) => unknown) => (req: Request, res: Response, next: NextFunction) => {
        controller(req, res, next, io);
    };

    router.get('/:userId', wrapController(messageController.getMessages));
    router.post('/:chatId', uploadMessagePhoto.single('photoUrl'), wrapController(messageController.createMessage));
    router.put('/:chatId/:messageId', wrapController(messageController.updateMessage));
    router.delete('/:chatId/:messageId', wrapController(messageController.deleteMessage));

    return router;
};