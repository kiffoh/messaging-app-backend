import passport from 'passport';
import { Strategy as LocalStrategy } from "passport-local";
import { PrismaClient, type User } from '@prisma/client';
const prisma = new PrismaClient();
import bcrypt from 'bcrypt';

async function validatePassword(user: User, password: string) {
    return await bcrypt.compare(password, user.password);
}

passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
}, async (username, password, done) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                username
            }
        });

        if (!user) {
            return done(null, false, {message: 'Incorrect username.'})
        }

        const isValidPw = await validatePassword(user, password);
        if (!isValidPw) {
            return done(null, false, {message: 'Incorrect password.'})
        }

        return done(null, user)
    } catch (err) {
        return done(err);
    }
}));
