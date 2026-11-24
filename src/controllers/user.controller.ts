import type { Request, Response, NextFunction } from "express";
import { Prisma, type User } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import bcrypt from 'bcrypt';
import passport from 'passport';
import jwt from 'jsonwebtoken';

function formatDateTime (isoString: string | Date) {
    const date = new Date(isoString);

    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = date.getUTCFullYear();

    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');

    const formattedDate = `${day}-${month}-${year}`;
    const formattedTime = `${hours}:${minutes}`;

    return {
        date: formattedDate,
        time: formattedTime
    };
}

const isUniqueViolation = (error: unknown) =>
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

async function createUser(req: Request, res: Response) {
    try {
        const {username, password} = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username: username,
                password: hashedPassword
            }
        })
        
        // Edit createdAt to desired format
        const formattedDateTime = formatDateTime(user.createdAt);
        
        // Create JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                bio: user.bio, 
                createdAtDate: formattedDateTime.date, 
                createdAtTime: formattedDateTime.time, 
                photo: user.photo 
            },
            env.SECRET_KEY, // Use your secret key from environment variables
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        return res.status(201).json({ user, token }); // Return both user and token
    } catch (error) {
        if (isUniqueViolation(error)) {
            return res.status(409).json({ 
                message: 'Username already in use. Please try again with a different username' 
            });
        }
        throw error;
    }
}

function logIn(req: Request, res: Response, next: NextFunction) {
    passport.authenticate('local', {session: false}, (err: unknown, user: User | false, info: unknown) => {
        if (err) {
            return next(err);
        }

        if (!user) {
            return res.status(400).json({message: 'Invalid username or password.'})
        }

        // Edit createdAt to desired format
        const formattedDateTime = formatDateTime(user.createdAt);

        // Authenticate user
        const token = jwt.sign(
            { id: user.id, username: user.username, bio: user.bio, createdAtDate: formattedDateTime.date, createdAtTime: formattedDateTime.time, photo: user.photo },
            env.SECRET_KEY,
            {expiresIn: '1hr'}
        )
    
        // Send the token to the client
        return res.status(200).json({ token, message: 'Login successful' });
    })(req, res, next);
}

async function getUser(req: Request, res: Response) {
    const {userId} = req.params as Record<string, string>;
    const userID = parseInt(userId)

    if (isNaN(userID)) {
        return res.status(400).json({ message: 'Invalid user ID.' });
    }

    const user = await prisma.user.findUnique({
        where: {
            id: userID
        },
        include: {
            contacts: true
        }
    })

    if (!user) return res.status(404).json({message: 'User not found.'})

    // Format createdAt to desired format
    const formattedDateTime = formatDateTime(user.createdAt);

    // Create a new user object with formatted date and time
    const newUser = {
        ...user,
        createdAtDate: formattedDateTime.date,
        createdAtTime: formattedDateTime.time
    };
    return res.json(newUser); 
}

async function getAllUsernames(req: Request, res: Response) {
    const users = await prisma.user.findMany({
        select: {
            username: true,
            id: true,
            photo: true
        }
    });

    if (users.length === 0) return res.status(404).json({message: 'No users found.'})

    // Only need in development
    const updatedUsers = users.map(user => {
        return {
            ...user,
            photo: user.photo || env.DEFAULT_PICTURE
        }
    })

    return res.json(updatedUsers)
}

async function updateUser(req: Request, res: Response) {
    const {userId} = req.params as Record<string, string>;
    const {username, bio} = req.body;
    const photo = req.file ? req.file.path : undefined;

    try {
        const updatedUser = await prisma.user.update({
            where: {
                id: parseInt(userId),
            },
            data: {
                username,
                photo,
                bio
            },
            include: {
                contacts: true
            }
        })

        // Format createdAt to desired format
        const formattedDateTime = formatDateTime(updatedUser.createdAt);

        // Create a new user object with formatted date and time
        const updatedUserFormatted = {
            ...updatedUser,
            createdAtDate: formattedDateTime.date,
            createdAtTime: formattedDateTime.time
        };

        res.status(200).json(updatedUserFormatted);

    } catch (error) {
        if (isUniqueViolation(error)) {
            return res.status(409).json({ 
                message: 'Username already in use. Please try again with a different username' 
            });
        }
        throw error;
    }
}

async function updateUserContacts(req: Request, res: Response) {
    const {userId} = req.params as Record<string, string>;
    const {selectedContacts} = req.body;

    const updatedUser =  await prisma.user.update({
        where: {
            id: parseInt(userId),
        },
        data: {
            contacts: {
                connect: selectedContacts.map((contactId: number) => ({id: contactId}))
            }
        },
        include: {
            contacts: true,
            contactedBy: true
        }
    })

    // Format createdAt to desired format
    const formattedDateTime = formatDateTime(updatedUser.createdAt);

    // Create a new user object with formatted date and time
    const updatedUserFormatted = {
        ...updatedUser,
        createdAtDate: formattedDateTime.date,
        createdAtTime: formattedDateTime.time
    };

    res.status(200).json(updatedUserFormatted);
}

async function deleteUser(req: Request, res: Response) {
    const {userId} = req.params as Record<string, string>;
    const userID = parseInt(userId);

    const user = await prisma.user.findUnique({ where: { id: userID } });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Perform the delete
    await prisma.$transaction(async (prisma) => {   
         // Delete the user
        await prisma.user.delete({
            where: {
                id: userID
            }
        })
    })

    return res.status(200).json({ message: 'User successfully deleted.' });
}

export {
    createUser,
    logIn,
    getUser,
    getAllUsernames,
    updateUser,
    deleteUser,
    updateUserContacts
}