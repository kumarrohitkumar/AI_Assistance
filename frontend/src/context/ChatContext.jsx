import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import { server } from "../main";
import toast from "react-hot-toast";

const ChatContext = createContext();

// Utility function for handling API calls
const handleApiCall = async (apiCall, loadingSetter) => {
  loadingSetter(true);
  try {
    const result = await apiCall();
    return result;
  } catch (error) {
    console.log(error);
    toast.error("Something went wrong");
    throw error;
  } finally {
    loadingSetter(false);
  }
};

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [newRequestLoading, setNewRequestLoading] = useState(false);
  const [chats, setChats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [createLod, setCreateLod] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchChats = async () => {
    try {
      const { data } = await axios.get(`${server}/api/chat/all`, {
        headers: { token: localStorage.getItem("token") },
      });
      setChats(data);
      if (!selected && data.length > 0) setSelected(data[0]._id);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchMessages = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`${server}/api/chat/${selected}`, {
        headers: { token: localStorage.getItem("token") },
      });
      setMessages(data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResponse = async () => {
    if (prompt === "") return toast.error("Write prompt");
    if (!selected) return toast.error("Please select a chat or create one.");

    const currentPrompt = prompt;
    console.log("we are here ");
    setNewRequestLoading(true);
    setPrompt("");

    try {
      const response = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCjpOC2Az6Z9Dw4WlCBHeczOsi3ZmdqFAU",
        { contents: [{ parts: [{ text: currentPrompt }] }] }
      );

      const answer =
        response.data.candidates?.[0]?.content?.parts?.[0]?.text || "No answer";

      const message = { question: currentPrompt, answer };
      setMessages((prev) => [...prev, message]);

      // Save message to backend
      await axios.post(
        `${server}/api/chat/${selected}`,
        { question: currentPrompt, answer },
        { headers: { token: localStorage.getItem("token") } }
      );
    } catch (error) {
      // console.log("error aa gya bhai ");
      console.log(error);
    } finally {
      setNewRequestLoading(false);
    }
  };

  const createChat = async () => {
    setCreateLod(true);
    try {
      const { data } = await axios.post(
        `${server}/api/chat/new`,
        {},
        { headers: { token: localStorage.getItem("token") } }
      );

      setSelected(data._id); // Set the newly created chat as selected
      await fetchChats(); // Fetch all chats again after creation
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setCreateLod(false);
    }
  };

  const deleteChat = async (id) => {
    try {
      const { data } = await axios.delete(`${server}/api/chat/${id}`, {
        headers: { token: localStorage.getItem("token") },
      });

      toast.success(data.message);
      if (selected === id) {
        setSelected(null);
        setMessages([]);
      }
      await fetchChats();
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong");
    }
  };

  // useEffect hooks for fetching chats and messages on mount
  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (selected) fetchMessages();
  }, [selected]);

  return (
    <ChatContext.Provider
      value={{
        fetchResponse,
        messages,
        prompt,
        setPrompt,
        newRequestLoading,
        chats,
        createChat,
        createLod,
        selected,
        setSelected,
        loading,
        deleteChat,
        fetchChats,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const ChatData = () => useContext(ChatContext);
