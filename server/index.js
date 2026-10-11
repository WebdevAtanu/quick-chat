import { createServer } from 'node:http';
import express from 'express';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import groupRoutes, { setGroupIO } from './routes/groups.js';
import User from './models/User.js';
import Chat from './models/Chat.js';
import GroupMessage from './models/GroupMessage.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // allow all origins
    },
});

setGroupIO(io);

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);

const onlineUsers = new Map();
const userGroups = new Map();

io.on('connection', (socket) => {
    console.log('a user connected with socket id: ', socket.id);

    socket.on('joinRoom', async (userId) => {
        console.log(`User ${userId} is joining the room.`);

        socket.userId = userId;

        const user = await User.findById(userId);
        if (user) {
            socket.userName = user.username;
            onlineUsers.set(userId, socket.id);

            await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });

            io.emit('userOnline', { userId, username: user.username });
            io.emit('usersList', await getUsersList());
        }
    });

    socket.on('chatMessage', async (data) => {
        const { senderId, receiverId, message } = data;

        const chat = await Chat.create({
            sender: senderId,
            receiver: receiverId,
            message,
        });

        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('chatMessage', {
                id: chat._id,
                sender: socket.userName,
                senderId,
                text: message,
                ts: chat.createdAt,
            });
        }

        socket.emit('chatMessage', {
            id: chat._id,
            sender: socket.userName,
            senderId,
            text: message,
            ts: chat.createdAt,
        });
    });

    socket.on('typing', (data) => {
        const { receiverId } = data;
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('typing', { username: socket.userName });
        }
    });

    socket.on('stopTyping', (data) => {
        const { receiverId } = data;
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('stopTyping', { username: socket.userName });
        }
    });

    socket.on('joinGroup', (groupId) => {
        socket.join(groupId);
        if (!userGroups.has(socket.userId)) {
            userGroups.set(socket.userId, new Set());
        }
        userGroups.get(socket.userId).add(groupId);
    });

    socket.on('groupMessage', async (data) => {
        const { groupId, senderId, message } = data;

        const groupMessage = await GroupMessage.create({
            group: groupId,
            sender: senderId,
            message,
        });

        io.to(groupId).emit('groupMessage', {
            id: groupMessage._id,
            groupId,
            sender: socket.userName,
            senderId,
            text: message,
            ts: groupMessage.createdAt,
        });
    });

    socket.on('groupTyping', (data) => {
        const { groupId } = data;
        socket.to(groupId).emit('groupTyping', { username: socket.userName, groupId });
    });

    socket.on('groupStopTyping', (data) => {
        const { groupId } = data;
        socket.to(groupId).emit('groupStopTyping', { username: socket.userName, groupId });
    });

    socket.on('disconnect', async () => {
        console.log('user disconnected', socket.id);

        if (socket.userId) {
            onlineUsers.delete(socket.userId);

            const groups = userGroups.get(socket.userId);
            if (groups) {
                groups.forEach(groupId => {
                    socket.leave(groupId);
                });
                userGroups.delete(socket.userId);
            }

            await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: new Date() });
            io.emit('userOffline', { userId: socket.userId, username: socket.userName });
            io.emit('usersList', await getUsersList());
        }
    });
});

async function getUsersList() {
    const users = await User.find().select('username isOnline lastSeen').sort({ username: 1 });
    return users;
}

app.get('/', (_, res) => {
    res.send('<h1>Socket API is running</h1>');
});

connectDB().then(() => {
    server.listen(3000, () => {
        console.log('server running at http://localhost:3000');
    });
});
