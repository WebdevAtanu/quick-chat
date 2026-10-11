import { useEffect, useRef, useState } from "react";
import { connection } from "./connection";
import { ToastContainer, toast } from "react-toastify";
import { v4 as uuid } from "uuid";

export default function App() {
  const socket = useRef(null);
  const timer = useRef(null);
  const bottomRef = useRef(null);
  const selectedGroupRef = useRef(null);

  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [showAuthPopup, setShowAuthPopup] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [inputName, setInputName] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const [typers, setTypers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messageIds, setMessageIds] = useState(new Set());
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
  }, [selectedGroup]);

  // SOCKET SETUP
  useEffect(() => {
    socket.current = connection();

    socket.current.on("connect", () => {
      console.log("Connected with socket id:", socket.current.id);
    });

    socket.current.on("chatMessage", (msg) => {
      setMessageIds((prev) => {
        if (prev.has(msg.id)) return prev;
        const newSet = new Set(prev);
        newSet.add(msg.id);
        setMessages((prevMsgs) => [...prevMsgs, msg]);
        return newSet;
      });
    });

    socket.current.on("typing", ({ username }) => {
      setTypers((prev) => {
        if (!prev.includes(username)) return [...prev, username];
        return prev;
      });
    });

    socket.current.on("stopTyping", ({ username }) => {
      setTypers((prev) => prev.filter((t) => t !== username));
    });

    socket.current.on("userOnline", ({ userId, username }) => {
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isOnline: true } : u))
      );
    });

    socket.current.on("userOffline", ({ userId }) => {
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isOnline: false } : u))
      );
    });

    socket.current.on("usersList", (usersList) => {
      setUsers(usersList);
    });

    socket.current.on("groupMessage", (msg) => {
      if (selectedGroupRef.current?._id === msg.groupId) {
        setMessageIds((prev) => {
          if (prev.has(msg.id)) return prev;
          const newSet = new Set(prev);
          newSet.add(msg.id);
          setMessages((prevMsgs) => [...prevMsgs, msg]);
          return newSet;
        });
      }
    });

    socket.current.on("groupTyping", ({ username, groupId }) => {
      if (selectedGroupRef.current?._id === groupId) {
        setTypers((prev) => {
          if (!prev.includes(username)) return [...prev, username];
          return prev;
        });
      }
    });

    socket.current.on("groupStopTyping", ({ username, groupId }) => {
      if (selectedGroupRef.current?._id === groupId) {
        setTypers((prev) => prev.filter((t) => t !== username));
      }
    });

    socket.current.on("groupCreated", ({ group, userId: notifiedUserId }) => {
      if (notifiedUserId === userId) {
        fetchGroups(userId);
        toast.info(`New group created: ${group.name}`);
      }
    });

    return () => {
      socket.current.disconnect();
    };
  }, []);

  // AUTO SCROLL
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // TYPING LOGIC
  // When text state changes send typing event
  useEffect(() => {
    if (!socket.current || !userId) return;

    if (text.trim()) {
      if (selectedUser) {
        socket.current.emit("typing", { receiverId: selectedUser._id });
      } else if (selectedGroup) {
        socket.current.emit("groupTyping", { groupId: selectedGroup._id });
      }
    }

    clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      if (selectedUser) {
        socket.current.emit("stopTyping", { receiverId: selectedUser._id });
      } else if (selectedGroup) {
        socket.current.emit("groupStopTyping", { groupId: selectedGroup._id });
      }
    }, 1000);

    return () => clearTimeout(timer.current);
  }, [text, userId, selectedUser, selectedGroup]);

  // FORMAT TIME
  function formatTime(ts) {
    const d = new Date(ts); // convert the passed timestamp to date
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); // format the time as hh:mm
  }

  // FETCH USERS
  const fetchUsers = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/auth/users");
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // FETCH CHAT HISTORY
  const fetchChatHistory = async (otherUserId) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/auth/chats?userId1=${userId}&userId2=${otherUserId}`
      );
      const data = await response.json();

      const formattedChats = data.map((chat) => ({
        id: chat._id,
        sender: chat.sender.username,
        senderId: chat.sender._id,
        text: chat.message,
        ts: chat.createdAt,
      }));

      setMessages(formattedChats);
      setMessageIds(new Set(formattedChats.map((c) => c.id)));
    } catch (error) {
      console.error("Error fetching chat history:", error);
    }
  };

  // FETCH GROUPS
  const fetchGroups = async (currentUserId = userId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/groups/list?userId=${currentUserId}`);
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  // FETCH GROUP MESSAGES
  const fetchGroupMessages = async (groupId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/groups/messages?groupId=${groupId}`);
      const data = await response.json();

      const formattedMessages = data.map((msg) => ({
        id: msg._id,
        groupId: msg.group,
        sender: msg.sender.username,
        senderId: msg.sender._id,
        text: msg.message,
        ts: msg.createdAt,
      }));

      setMessages(formattedMessages);
      setMessageIds(new Set(formattedMessages.map((m) => m.id)));
    } catch (error) {
      console.error("Error fetching group messages:", error);
    }
  };

  // CREATE GROUP
  const createGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || selectedMembers.length === 0) {
      toast.error("Group name and at least one member are required");
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/api/groups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName,
          memberIds: selectedMembers,
          createdBy: userId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Group created successfully");
        setShowGroupModal(false);
        setGroupName("");
        setSelectedMembers([]);
        fetchGroups();
      } else {
        toast.error(data.message || "Failed to create group");
      }
    } catch (error) {
      toast.error("Server error");
    }
  };

  // AUTH HANDLERS
  const handleAuth = async (e) => {
    e.preventDefault();
    const name = inputName.trim();
    const password = inputPassword.trim();
    if (!name || !password) return;

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    
    try {
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setUserId(data.userId);
        setUserName(data.username);
        setShowAuthPopup(false);
        socket.current.emit("joinRoom", data.userId);
        fetchUsers();
        fetchGroups(data.userId);
        toast.success(isLogin ? "Login successful" : "Registration successful");
      } else {
        toast.error(data.message || "Authentication failed");
      }
    } catch (error) {
      toast.error("Server error");
    }
  };

  // SEND MESSAGE
  function sendMessage() {
    const msgText = text.trim();
    if (!msgText || !socket.current) return;

    if (selectedUser) {
      socket.current.emit("chatMessage", {
        senderId: userId,
        receiverId: selectedUser._id,
        message: msgText,
      });
    } else if (selectedGroup) {
      socket.current.emit("groupMessage", {
        groupId: selectedGroup._id,
        senderId: userId,
        message: msgText,
      });
    }

    setText("");
  }

  // ENTER KEY
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      <ToastContainer position="top-right" autoClose={2000} />

      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-100 to-gray-200 p-4">
        {/* AUTH POPUP */}
        {showAuthPopup && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
              <h2 className="text-xl font-semibold">{isLogin ? "Login" : "Register"}</h2>
              <p className="text-gray-500 text-sm mt-1">
                {isLogin ? "Enter your credentials to continue" : "Create a new account"}
              </p>

              <form onSubmit={handleAuth} className="mt-4 space-y-3">
                <input
                  autoFocus
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-400"
                  placeholder="Username"
                />
                <input
                  type="password"
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-400"
                  placeholder="Password"
                />
                <button className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition">
                  {isLogin ? "Login" : "Register"}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-4">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-green-500 hover:underline"
                >
                  {isLogin ? "Register" : "Login"}
                </button>
              </p>
            </div>
          </div>
        )}

        {/* CHAT */}
        {!showAuthPopup && (
          <div className="w-full max-w-4xl h-[90vh] bg-white rounded-2xl shadow-xl flex overflow-hidden">
            {/* USERS SIDEBAR */}
            <div className="w-64 border-r border-r-gray-300 bg-gray-50 flex flex-col">
              <div className="p-4 border-b border-b-gray-300 bg-white flex items-center justify-between">
                <h2 className="font-semibold text-sm">Chats</h2>
                <button
                  onClick={() => setShowGroupModal(true)}
                  className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                >
                  + Group
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {/* Current User Profile */}
                <div className="p-3 rounded-lg mb-2 bg-green-50 border border-green-200">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">{userName} (You)</span>
                  </div>
                  <span className="text-xs text-gray-500 ml-5">Online</span>
                </div>

                {/* Other Users */}
                {users
                  .filter((u) => u._id !== userId)
                  .map((user) => (
                    <div
                      key={user._id}
                      onClick={() => {
                        setSelectedUser(user);
                        setSelectedGroup(null);
                        setMessages([]);
                        setMessageIds(new Set());
                        fetchChatHistory(user._id);
                      }}
                      className={`p-3 rounded-lg cursor-pointer mb-2 ${
                        selectedUser?._id === user._id
                          ? "bg-green-100"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            user.isOnline ? "bg-green-500" : "bg-gray-400"
                          }`}
                        />
                        <span className="text-sm font-medium">{user.username}</span>
                      </div>
                      <span className="text-xs text-gray-500 ml-5">
                        {user.isOnline ? "Online" : `Last seen: ${formatTime(user.lastSeen)}`}
                      </span>
                    </div>
                  ))}

                {/* Groups */}
                {groups.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-t-gray-300">
                    <h3 className="text-xs font-semibold text-gray-500 mb-2 px-2">GROUPS</h3>
                    {groups.map((group) => (
                      <div
                        key={group._id}
                        onClick={() => {
                          setSelectedGroup(group);
                          setSelectedUser(null);
                          setMessages([]);
                          setMessageIds(new Set());
                          fetchGroupMessages(group._id);
                          socket.current.emit("joinGroup", group._id);
                        }}
                        className={`p-3 rounded-lg cursor-pointer mb-2 ${
                          selectedGroup?._id === group._id
                            ? "bg-blue-100"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <span className="text-sm font-medium">{group.name}</span>
                        </div>
                        <span className="text-xs text-gray-500 ml-5">
                          {group.members.length} members
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CHAT AREA */}
            <div className="flex-1 flex flex-col">
              {/* HEADER */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-b-gray-300 bg-white">
                <div>
                  <h1 className="font-semibold text-sm">
                    {selectedUser
                      ? selectedUser.username
                      : selectedGroup
                      ? selectedGroup.name
                      : "Select a user or group to chat"}
                  </h1>
                  {typers.length > 0 && (
                    <p className="text-[10px] text-gray-500">
                      {typers.join(", ")} typing...
                    </p>
                  )}
                </div>
                <span className="text-sm text-gray-500">{userName}</span>
              </div>

              {/* MESSAGES */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
                {messages.map((m) => {
                  const mine = m.senderId === userId;
                  const isGroupMessage = !!m.groupId;

                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[50%] px-4 py-2 rounded-2xl text-sm shadow ${
                          mine
                            ? isGroupMessage
                              ? "bg-blue-500 text-white rounded-br-sm"
                              : "bg-green-500 text-white rounded-br-sm"
                            : "bg-white border rounded-bl-md"
                        }`}
                      >
                        {isGroupMessage && !mine && (
                          <p className="text-xs font-semibold text-gray-500 mb-1">
                            {m.sender}
                          </p>
                        )}
                        <p>{m.text}</p>

                        <div className="flex justify-end gap-1 mt-1 text-[10px] opacity-70">
                          <span>{formatTime(m.ts)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef}></div>
              </div>

              {/* INPUT */}
              <div className="p-4 border-t border-t-gray-300 bg-white">
                <div className="flex items-center gap-3 border rounded px-4 py-2">
                  <textarea
                    rows={1}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 resize-none outline-none text-sm"
                    disabled={!selectedUser && !selectedGroup}
                  />
                  <button
                    onClick={sendMessage}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition cursor-pointer"
                    disabled={!selectedUser && !selectedGroup}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GROUP CREATION MODAL */}
        {showGroupModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
              <h2 className="text-xl font-semibold">Create Group</h2>
              <p className="text-gray-500 text-sm mt-1">
                Add members to create a group chat
              </p>

              <form onSubmit={createGroup} className="mt-4 space-y-3">
                <input
                  autoFocus
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-400"
                  placeholder="Group name"
                />
                <div className="max-h-48 overflow-y-auto border rounded-lg p-2">
                  {users
                    .filter((u) => u._id !== userId)
                    .map((user) => (
                      <label
                        key={user._id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(user._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMembers([...selectedMembers, user._id]);
                            } else {
                              setSelectedMembers(
                                selectedMembers.filter((id) => id !== user._id)
                              );
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{user.username}</span>
                      </label>
                    ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowGroupModal(false);
                      setGroupName("");
                      setSelectedMembers([]);
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
                  >
                    Cancel
                  </button>
                  <button className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition">
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
