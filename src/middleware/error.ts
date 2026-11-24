import type { Request, Response, NextFunction } from "express";
import createError from "http-errors";
import { ZodError } from "zod";

export const handleError = (err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);

    if (err instanceof ZodError) {
        return res.status(400).json({
            message: "Validation failed",
            errors: err.issues.map(({ path, message }) => ({ field: path.map(String).join("."), message })),
        });
    }
    // Errors that carry a status (404s, body-parser failures) are written for clients
    if (createError.isHttpError(err)) {
        return res.status(err.status).json({ message: err.message });
    }
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
};
