import { createContext, useContext, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";
import { server } from "../main";

// Utility function to wait for a certain period
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function handleRequestWithBackoff(fn, retries = 5, delayMs = 1000) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      if (error.response && error.response.status === 429) {
        // Too many requests, retry after a delay
        attempt += 1;
        const retryAfter = parseInt(
          error.response.headers["retry-after"] || delayMs,
          10
        );
        console.log(`Rate limit exceeded, retrying in ${retryAfter} ms...`);
        await delay(retryAfter);
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [btnLoading, setBtnLoading] = useState(false);

  async function loginUser(email, navigate) {
    setBtnLoading(true);
    try {
      await handleRequestWithBackoff(async () => {
        const { data } = await axios.post(`${server}/api/user/login`, {
          email,
        });

        toast.success(data.message);
        localStorage.setItem("verifyToken", data.verifyToken);
        navigate("/verify");
      });
    } catch (error) {
      console.log("Error during login:", error);
      toast.error(
        error.response ? error.response.data.message : "An error occurred"
      );
    } finally {
      setBtnLoading(false);
    }
  }

  const [user, setUser] = useState([]);
  const [isAuth, setIsAuth] = useState(false);

  async function verifyUser(otp, navigate, fetchChats) {
    const verifyToken = localStorage.getItem("verifyToken");
    setBtnLoading(true);
    if (!verifyToken) return toast.error("Please provide token");
    try {
      await handleRequestWithBackoff(async () => {
        const { data } = await axios.post(`${server}/api/user/verify`, {
          otp,
          verifyToken,
        });
        toast.success(data.message);
        localStorage.clear();
        localStorage.setItem("token", data.token);
        navigate("/");
        setIsAuth(true);
        setUser(data.user);
        fetchChats();
      });
    } catch (error) {
      toast.error(
        error.response ? error.response.data.message : "An error occurred"
      );
    } finally {
      setBtnLoading(false);
    }
  }

  const [loading, setLoading] = useState(true);

  async function fetchUser() {
    try {
      const { data } = await axios.get(`${server}/api/user/me`, {
        headers: {
          token: localStorage.getItem("token"),
        },
      });

      setIsAuth(true);
      setUser(data);
      setLoading(false);
    } catch (error) {
      console.log(error);
      setIsAuth(false);
      setLoading(false);
    }
  }

  const logoutHandler = (navigate) => {
    localStorage.clear();

    toast.success("logged out");
    setIsAuth(false);
    setUser([]);
    navigate("/login");
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <UserContext.Provider
      value={{
        loginUser,
        btnLoading,
        isAuth,
        setIsAuth,
        user,
        verifyUser,
        loading,
        logoutHandler,
      }}
    >
      {children}
      <Toaster />
    </UserContext.Provider>
  );
};

export const UserData = () => useContext(UserContext);
