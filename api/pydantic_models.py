from pydantic import BaseModel
from typing import List

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
