'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ChatProvider, useChat } from '@/lib/ChatContext';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const ChatLayout = ({ children }: { children: React.ReactNode }) => {
  const { newMessage, setNewMessage, handleFormSubmit, handleKeyDown } = useChat();

  return (
    <div className="flex h-screen text-lg">
      <aside className="w-72 bg-gray-100 p-4 dark:bg-gray-800">
        <h2 className="text-2xl font-semibold">Chat History</h2>
      </aside>
      <main className="flex flex-1 flex-col">
        {children}
        <form onSubmit={handleFormSubmit} className="border m-6 mx-16 rounded-lg dark:border-gray-800">
          <div className="relative flex flex-col">
            <Textarea
              placeholder="Type your message..."
              className="min-h-[120px] max-h-[200px] w-full resize-none border-0 bg-transparent text-lg p-4 pr-20 focus-visible:ring-0"
              rows={2}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="absolute bottom-3 right-2 flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Paperclip className="h-5 w-5" />
              </Button>
              <Button type="submit" variant="ghost" size="icon">
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ChatProvider>
          <ChatLayout>{children}</ChatLayout>
        </ChatProvider>
      </body>
    </html>
  );
}
