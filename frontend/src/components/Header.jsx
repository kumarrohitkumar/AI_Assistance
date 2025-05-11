import React from "react";
import { ChatData } from "../context/ChatContext";

const Header = () => {
  const { chats } = ChatData();

  return (
    <div>
      <p className="text-lg mb-6">Hello, How can I help you today?</p>
      {chats && chats.length === 0 ? (
        <p className="text-lg mb-6">Create a new chat to continue</p>
      ) : (
        <div>
          <p className="text-lg mb-2">You have {chats.length} chat(s).</p>
          {/* Displaying the most recent chat */}
          <p className="text-sm text-gray-500 mb-4">
            Recent Chat: {chats[0]?.question || "No recent chat"}
          </p>
        </div>
      )}
    </div>
  );
};

export default Header;
