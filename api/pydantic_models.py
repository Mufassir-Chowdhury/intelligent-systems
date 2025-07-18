from pydantic import BaseModel
from typing import List, Optional

class Message(BaseModel):
    text: str
    sender: str
    timestamp: str
    rag_enabled: Optional[bool] = False

class ChatRequest(BaseModel):
    text: str
    sender: str
    timestamp: str
    use_rag: Optional[bool] = False

class Chat(BaseModel):
    id: str
    title: str
    messages: List[Message]
    timestamp: str

class ChatSummary(BaseModel):
    id: str
    title: str
    timestamp: str