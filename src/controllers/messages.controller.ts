import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { io } from "../lib/io.js";

async function getMessages(req: Request, res: Response, next: NextFunction) {
    const {userId} = req.params as Record<string, string>;
    const userID = parseInt(userId)

    const userMessages = await prisma.group.findMany({
        where: {
            members: {
                some: {
                    id: userID,
                }
            }
        },
        include: {
            members: true,
            messages: {
                orderBy: {
                    createdAt: 'desc'
                }
            },
        },
        orderBy: {
            updatedAt: 'desc',
        }
        
    })

    // Name the unnamed groups/direct messages, specific to the user
    userMessages.forEach(chat => {
        if (chat.name === null) {
            if (chat.members.length  <= 2) {
                const receipient = chat.members.find(member => member.id !== userID);
                chat.name = receipient!.username;
                chat.photo = receipient!.photo;
            } else {
                const otherMembers = chat.members.filter(member => member.id !== userID);
                const otherMembersUsernames: string[] = []
                otherMembers.forEach(member => otherMembersUsernames.push(member.username))
                chat.name = otherMembersUsernames.slice(0, otherMembersUsernames.length - 1).join(', ') + ' & ' + otherMembersUsernames.slice(otherMembersUsernames.length - 1);
            }
        }
        if (chat.photo === null && chat.members.length === 2) chat.photo = env.DEFAULT_PICTURE;
        else if (chat.photo === null) chat.photo = env.DEFAULT_GROUP_PICTURE
    })

    res.json(userMessages);
}

async function createMessage(req: Request, res: Response, next: NextFunction) {
    const {content, groupId, authorId} = req.body;
    const groupID = parseInt(groupId);
    const authorID = parseInt(authorId)

    const photoUrl = req.file ? req.file.path : null;

    const newMessage = await prisma.message.create({
        data: {
            content,
            photoUrl,
            groupId: groupID,
            authorId: authorID
        }
    })

    // Emit the newMessage event to all connected clients
    io.emit('newMessage', newMessage);

    res.status(201).json(newMessage)
}

async function updateMessage(req: Request, res: Response, next: NextFunction) {
    const {content} = req.body;
    const {messageId} = req.params as Record<string, string>;
    const messageID = parseInt(messageId);

    const updatedMessage = await prisma.message.update({
        where: {
            id: messageID
        },
        data: {
            content: content
        }
    })

    // Emit the messageUpdated event
    io.emit('messageUpdated', updatedMessage);

    res.status(200).json(updatedMessage);
}


async function deleteMessage(req: Request, res: Response, next: NextFunction) {
    const {messageId} = req.params as Record<string, string>;
    const messageID = parseInt(messageId);

    const message = await prisma.message.findUnique({ where: { id: messageID } });
    if (!message) return res.status(404).json({ message: 'Message not found.' });

    // Perform the delete
    await prisma.$transaction(async (prisma) => {  
        // Delete the message
        await prisma.message.delete({
            where: {
                id: messageID
            }
        })
    })

    // Emit the messageDeleted event
    io.emit('messageDeleted', messageID);

    return res.status(200).json({ message: 'Message successfully deleted.' });
}


export {
    getMessages,
    createMessage,
    updateMessage,
    deleteMessage
};