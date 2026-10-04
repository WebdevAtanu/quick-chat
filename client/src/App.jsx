import { useEffect, useRef, useState } from "react";
import { connection } from "./connection";
import { ToastContainer, toast } from "react-toastify";
import { v4 as uuid } from "uuid";

export default function App() {
  const socket = useRef(null);
  const timer = useRef(null);
  const bottomRef = useRef(null);

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

  // SOCKET SETUP
  useEffect(() => {
    socket.current = connection();

    socket.current.on("connect", () => {
      console.log("Connected with socket id:", socket.current.id);
    });

    socket.current.on("chatMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
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
    if (!socket.current || !userId || !selectedUser) return;

    if (text.trim()) {
      socket.current.emit("typing", { receiverId: selectedUser._id });
    }

    clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      socket.current.emit("stopTyping", { receiverId: selectedUser._id });
    }, 1000);

    return () => clearTimeout(timer.current);
  }, [text, userId, selectedUser]);

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
    if (!msgText || !socket.current || !selectedUser) return;
    let newId = uuid();

    const msg = {
      id: newId,
      sender: userName,
      senderId: userId,
      text: msgText,
      ts: Date.now(),
    };

    setMessages((prev) => [...prev, msg]);
    socket.current.emit("chatMessage", {
      senderId: userId,
      receiverId: selectedUser._id,
      message: msgText,
    });

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
              <div className="p-4 border-b border-b-gray-300 bg-white">
                <h2 className="font-semibold text-sm">Users</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {users
                  .filter((u) => u._id !== userId)
                  .map((user) => (
                    <div
                      key={user._id}
                      onClick={() => {
                        setSelectedUser(user);
                        setMessages([]);
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
              </div>
            </div>

            {/* CHAT AREA */}
            <div className="flex-1 flex flex-col">
              {/* HEADER */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-b-gray-300 bg-white">
                <div>
                  <h1 className="font-semibold text-sm">
                    {selectedUser ? selectedUser.username : "Select a user to chat"}
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

                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[50%] px-4 py-2 rounded-2xl text-sm shadow ${
                          mine
                            ? "bg-green-500 text-white rounded-br-sm"
                            : "bg-white border rounded-bl-md"
                        }`}
                      >
                        <p>{m.text}</p>

                        <div className="flex justify-end gap-1 mt-1 text-[10px] opacity-70">
                          <span>{m.sender}</span>
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
                    disabled={!selectedUser}
                  />
                  <button
                    onClick={sendMessage}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition cursor-pointer"
                    disabled={!selectedUser}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
