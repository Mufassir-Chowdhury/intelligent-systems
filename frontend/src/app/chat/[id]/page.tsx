'use client';

import { useChat } from '@/lib/ChatContext';
import { useEffect, useRef } from 'react';

export default function ChatPage({ params }: { params: { id: string } }) {
  const { currentChatMessages, fetchChatMessages, isFetchingMessages } = useChat();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChatMessages(params.id);
  }, [params.id, fetchChatMessages]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [currentChatMessages]);

  return (
    <div ref={chatContainerRef} className="flex-1 p-4 px-20 space-y-8 overflow-y-auto">
      {isFetchingMessages ? (
        <div className="text-center text-gray-500">Loading messages...</div>
      ) : (
        currentChatMessages.map((msg, index) => (
          <div key={index}>
            {msg.sender === 'user' && (
              <div className="flex justify-end">
                <div className="max-w-2xl rounded-xl px-4 py-3 bg-primary text-white break-words">
                  <p className="text-lg">{msg.text}</p>
                </div>
              </div>
            )}
            {msg.sender === 'model' && (
              <div className="flex justify-start items-start gap-3">
                <div className="w-8 h-8 mt-2 rounded-full bg-gray-400 flex-shrink-0"></div>
                <p className="text-lg max-w-2xl break-words">{msg.text}</p>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}