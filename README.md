# Quick Chat

A real-time group chat application built with React and Socket.IO.

## Overview

Quick Chat is a modern web-based chat application that enables real-time messaging between multiple users. Users can join a shared chat room, send messages, and see live typing indicators from other participants.

## Features

- **Real-time Messaging**: Instant message delivery using WebSocket connections
- **Typing Indicators**: See when other users are typing
- **User Notifications**: Toast notifications when users join the chat
- **Auto-scroll**: Automatically scrolls to the latest message
- **Responsive Design**: Beautiful UI built with Tailwind CSS
- **Session Management**: Join with a custom username

## Project Structure

```
quick-chat/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.jsx        # Main chat component
│   │   ├── connection.js  # Socket.IO client connection
│   │   ├── main.jsx       # React entry point
│   │   ├── index.css      # Global styles
│   │   └── App.css        # App-specific styles
│   ├── index.html         # HTML template
│   ├── vite.config.js     # Vite configuration
│   ├── eslint.config.js   # ESLint configuration
│   └── package.json       # Client dependencies
└── server/                # Express backend
    ├── index.js           # Socket.IO server
    └── package.json       # Server dependencies
```

## How It Works

### User Flow
1. User opens the chat application
2. A popup appears prompting for a username
3. User enters their name and clicks "Continue"
4. Socket connection is established and user joins the group room
5. User can now send and receive messages in real-time

### Socket Events

**Client → Server:**
- `joinRoom` - User joins the chat room with their name
- `chatMessage` - Send a message to the room
- `typing` - Notify others that user is typing
- `stopTyping` - Notify others that user stopped typing

**Server → Client:**
- `roomNotice` - Notification when a user joins
- `chatMessage` - Receive a message from another user
- `typing` - Another user is typing
- `stopTyping` - Another user stopped typing

### Message Structure
```javascript
{
  id: "unique-uuid",
  sender: "username",
  text: "message content",
  ts: 1234567890 // timestamp
}
```

## Development Notes

- The application uses a single "group" room for all users
- Typing indicators automatically clear after 1 second of inactivity
- Messages are identified by UUID to prevent duplicates
- All origins are currently allowed in CORS configuration (change in production)
- Time is formatted as HH:mm in 12-hour format

## Future Enhancements

Potential features for future versions:
- Multiple chat rooms
- User profiles and avatars
- Message persistence (database)
- Authentication
- File sharing
- Direct messaging
- Message reactions
