import type { Request, Response, NextFunction } from "express";
import createError from "http-errors";
import multer from "multer";
import { ZodError } from "zod";

export const handleError = (err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);

    if (err instanceof ZodError) {
        return res.status(400).json({
            message: "Validation failed",
            errors: err.issues.map(({ path, message }) => ({ field: path.map(String).join("."), message })),
        });
    }
    if (err instanceof multer.MulterError) {
        return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ message: err.message });
    }
    // Errors that carry a status (404s, body-parser failures) are written for clients
    if (createError.isHttpError(err)) {
        return res.status(err.status).json({ message: err.expose ? err.message : "Internal Server Error" });
    }
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
};
