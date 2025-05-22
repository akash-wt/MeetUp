import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
router.use(cookieParser());

const users = new Map();

//@ts-ignore
router.post('/auth/google', async (req, res) => {
    try {
        const { id_token } = req.body;
        if (!id_token) return res.status(400).json({ error: 'No token provided' });

        const googleRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${id_token}`);


        const { email, name, picture } = googleRes.data;

        const sessionId = uuidv4();

        users.set(sessionId, { email, name, picture });

        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined in the environment variables.');
        }

        const token = jwt.sign({ sid: sessionId }, process.env.JWT_SECRET, { expiresIn: '6d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 6 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({ message: 'Logged in successfully' });
    } catch (err) {
        console.error(err);
        return res.status(401).json(err);
    }
});

//@ts-ignore
router.get('/me', (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Not logged in' });

    try {

        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined in the environment variables.');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET) as { sid: string };
        const user = users.get(decoded.sid);
        if (!user) return res.status(404).json({ error: 'User not found' });

        return res.status(200).json(user);
    } catch (err) {
        return res.status(401).json({ error: 'Invalid session' });
    }
});

export default router;
