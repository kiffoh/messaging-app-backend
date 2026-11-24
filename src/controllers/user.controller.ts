import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { withFormattedDate } from "../lib/users.js";

const isUniqueViolation = (error: unknown) =>
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

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
    // Create a new user object with formatted date and time
    const newUser = withFormattedDate(user);
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
        // Create a new user object with formatted date and time
        const updatedUserFormatted = withFormattedDate(updatedUser);

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
    // Create a new user object with formatted date and time
    const updatedUserFormatted = withFormattedDate(updatedUser);

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
    getUser,
    getAllUsernames,
    updateUser,
    deleteUser,
    updateUserContacts
}