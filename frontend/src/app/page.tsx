'use client';

import { useChat } from '@/lib/ChatContext';

export default function Home() {
  const { messages } = useChat();

  return (
    <div className="flex-1 flex items-center justify-center">
      <h1 className="text-4xl font-bold">Hello there! How can I help you today?</h1>
    </div>
  );
}