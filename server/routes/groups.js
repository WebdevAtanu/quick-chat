import express from 'express';
import Group from '../models/Group.js';
import GroupMessage from '../models/GroupMessage.js';
import User from '../models/User.js';

const router = express.Router();

let io; // Will be set from server

export const setGroupIO = (socketIO) => {
  io = socketIO;
};

router.post('/create', async (req, res) => {
  try {
    const { name, memberIds, createdBy } = req.body;

    if (!name || !memberIds || !createdBy) {
      return res.status(400).json({ message: 'Name, memberIds, and createdBy are required' });
    }

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: 'At least one member is required' });
    }

    const allMemberIds = [...memberIds, createdBy];
    const group = await Group.create({
      name,
      members: allMemberIds,
      createdBy,
    });

    await group.populate('members', 'username');
    await group.populate('createdBy', 'username');

    // Notify all connected clients about the new group
    if (io) {
      io.emit('groupCreated', { group });
    }

    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/list', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const groups = await Group.find({ members: userId })
      .populate('members', 'username')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/messages', async (req, res) => {
  try {
    const { groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({ message: 'groupId is required' });
    }

    const messages = await GroupMessage.find({ group: groupId })
      .sort({ createdAt: 1 })
      .populate('sender', 'username');

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
