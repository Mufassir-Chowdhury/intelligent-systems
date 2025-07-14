from pydantic_models import Message, Chat, ChatSummary
from llm import generate
from typing import Dict, List
from fastapi import FastAPI, HTTPException
import uuid
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

origins = [
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        title="".join(generate(f"Give a title for a chat with message {message.text}")), # First message text as chat title
        # title="".join(generate(message.text, title=True)),
        messages=[message],
        timestamp=datetime.now().isoformat()
    )
    new_chat.messages.append(Message(
        text =  "".join(generate(f"You are a helpful assistant. Answer the message in short: {message.text}")),
        sender='model',
        timestamp=datetime.now().isoformat()
    ))
    chats_db[chat_id] = new_chat
    return new_chat

@app.post("/chats/{chat_id}/messages", response_model=Message, status_code=201)
def send_message_to_chat(chat_id: str, message: Message):
    chat = chats_db.get(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    chat.messages.append(message)
    
    # Generate assistant's response
    assistant_response = "".join(generate(message.text, history=chat.messages))
    assistant_message = Message(
        text=assistant_response,
        sender='model',
        timestamp=datetime.now().isoformat()
    )
    chat.messages.append(assistant_message)
    
    chat.timestamp = datetime.now().isoformat() # Update chat timestamp on new message
    return message