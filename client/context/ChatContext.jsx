import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";
import axios from "axios"; 

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});

  const { socket } = useContext(AuthContext);

  const getUsers = async () => {
    try {
      const { data } = await axios.get("/api/messages/users");
      if (data.success) {
        setUsers(data.users);
        setUnseenMessages(data.unseenMessages);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getMessages = async (userId) => {
    try {
      const { data } = await axios.get(`/api/messages/${userId}`);
      if (data.success) {
        setMessages(data.messages || []); // Ensure it's always an array
      }
    } catch (error) {
      toast.error(error.message);
      setMessages([]); // Set empty array on error
    }
  };

  const sendMessage = async (messageData) => {
    try {
      const { data } = await axios.post(
        `/api/messages/send/${selectedUser._id}`,
        messageData
      );
      
      // Debug log to see response structure
      console.log("Full server response:", data);
      
      // Backend returns "message" not "newMessage"
      const newMessage = data.newMessage || data.message || data.data;
      
      // Validate response before updating state
      if (data.success && newMessage) {
        // Add message even if senderId is missing (backend might have different structure)
        setMessages((prev) => [...prev, newMessage]);
      } else if (newMessage) {
        // No success flag but message exists
        console.warn("Message sent but no success flag:", newMessage);
        setMessages((prev) => [...prev, newMessage]);
      } else {
        console.error("Invalid response structure:", data);
        console.error("Available keys:", Object.keys(data));
        throw new Error("Invalid message response from server");
      }
    } catch (error) {
      console.error("Send message error:", error);
      console.error("Error response:", error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || "Failed to send message";
      toast.error(errorMessage);
      throw error; // Re-throw so Chat component knows it failed
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handler = (newMessage) => {
      // Validate incoming message
      if (!newMessage || !newMessage.senderId || !newMessage._id) {
        console.error("Received invalid message from socket:", newMessage);
        return;
      }

      if (selectedUser && newMessage.senderId === selectedUser._id) {
        newMessage.seen = true;
        setMessages((prev) => [...prev, newMessage]);
        axios.put(`/api/messages/mark/${newMessage._id}`).catch(err => {
          console.error("Failed to mark message as seen:", err);
        });
      } else {
        setUnseenMessages((prev) => ({
          ...prev,
          [newMessage.senderId]: (prev[newMessage.senderId] || 0) + 1,
        }));
      }
    };

    socket.on("newMessage", handler);

    return () => socket.off("newMessage", handler);
  }, [socket, selectedUser]);

  const value = {
    messages,
    users,
    selectedUser,
    getUsers,
    getMessages,
    sendMessage,
    setSelectedUser,
    unseenMessages,
    setUnseenMessages,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};