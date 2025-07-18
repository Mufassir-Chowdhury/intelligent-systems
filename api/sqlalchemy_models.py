from sqlalchemy import Column, String, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from pgvector.sqlalchemy import Vector
import uuid


Base = declarative_base()

class Chat(Base):
    __tablename__ = "chats"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, index=True)
    timestamp = Column(String)

    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, index=True)
    text = Column(Text)
    sender = Column(String)
    timestamp = Column(String)
    chat_id = Column(String, ForeignKey("chats.id"))

    chat = relationship("Chat", back_populates="messages")

class Document(Base):
    __tablename__ = 'documents'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    text = Column(Text)
    embedding = Column(Vector(384))