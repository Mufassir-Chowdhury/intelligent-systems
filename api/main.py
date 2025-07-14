from typing import Dict, List, Union
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uuid
from datetime import datetime

app = FastAPI()

class Message(BaseModel):
    text: str
    sender: str
    timestamp: str

class Chat(BaseModel):
    id: str
    title: str
    messages: List[Message]
    timestamp: str

class ChatSummary(BaseModel):
    id: str
    title: str
    timestamp: str

# In-memory store for chats
chats_db: Dict[str, Chat] = {}

@app.get("/chats", response_model=List[ChatSummary])
def get_all_chats():
    return [ChatSummary(id=chat.id, title=chat.title, timestamp=chat.timestamp) for chat in chats_db.values()]

@app.get("/chats/{chat_id}/messages", response_model=List[Message])
def get_all_messages_for_chat(chat_id: str):
    chat = chats_db.get(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat.messages

@app.delete("/chats/{chat_id}")
def delete_chat(chat_id: str):
    if chat_id not in chats_db:
        raise HTTPException(status_code=404, detail="Chat not found")
    del chats_db[chat_id]
    return {"message": "Chat deleted successfully"}

@app.post("/chats", response_model=Chat, status_code=201)
def create_chat(message: Message):
    chat_id = str(uuid.uuid4())
    new_chat = Chat(
        id=chat_id,
        title=message.text, # First message text as chat title
        messages=[message],
        timestamp=datetime.now().isoformat()
    )
    chats_db[chat_id] = new_chat
    return new_chat

@app.post("/chats/{chat_id}/messages", response_model=Message, status_code=201)
def send_message_to_chat(chat_id: str, message: Message):
    chat = chats_db.get(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    chat.messages.append(message)
    chat.timestamp = datetime.now().isoformat() # Update chat timestamp on new message
    return message