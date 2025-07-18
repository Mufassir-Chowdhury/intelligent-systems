from fastapi.params import Depends
from pydantic_models import Message as PydanticMessage, Chat as PydanticChat, ChatSummary
from langchain_utils import generate_langchain
from typing import Dict, List
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
import uuid
import sqlalchemy_models as models
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload # Make sure to import this

from database import get_db, engine, enable_vector_extension
from rag import process_and_embed_pdfs, model
from sqlalchemy import text

load_dotenv()

app = FastAPI()
# This function should be called at startup to create the database tables.
@app.on_event("startup")
async def startup():
    await enable_vector_extension(engine)
    async with engine.begin() as conn:
        # await conn.run_sync(models.Base.metadata.drop_all)
        await conn.run_sync(models.Base.metadata.create_all)
    async for db in get_db():
        await process_and_embed_pdfs(db)

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


@app.get("/chats", response_model=List[ChatSummary])
async def get_all_chats(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Chat).order_by(models.Chat.timestamp.desc()))
    chats = result.scalars().all()
    return [ChatSummary(id=chat.id, title=chat.title, timestamp=chat.timestamp) for chat in chats]

@app.get("/chats/{chat_id}/messages", response_model=List[PydanticMessage])
async def get_all_messages_for_chat(chat_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Message).where(models.Message.chat_id == chat_id))
    messages = result.scalars().all()
    if not messages:
        raise HTTPException(status_code=404, detail="Chat not found or has no messages")
    return messages

@app.delete("/chats/{chat_id}")
async def delete_chat(chat_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Chat).where(models.Chat.id == chat_id))
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    await db.delete(chat)
    await db.commit()
    return {"message": "Chat deleted successfully"}


@app.post("/chats", response_model=PydanticChat, status_code=201)
async def create_chat(message: PydanticMessage, db: AsyncSession = Depends(get_db)):
    chat_id = str(uuid.uuid4())
    title = await generate_langchain(message.text, title=True)

    new_chat = models.Chat(
        id=chat_id,
        title=title,
        timestamp=datetime.now().isoformat()
    )

    user_message = models.Message(
        id=str(uuid.uuid4()),
        text=message.text,
        sender=message.sender,
        timestamp=message.timestamp,
        chat_id=chat_id
    )
    
    context = None
    if message.rag_enabled:
        user_embedding = model.encode(message.text, convert_to_tensor=False).tolist()
        result = await db.execute(
            select(models.Document)
            .order_by(models.Document.embedding.l2_distance(user_embedding))
            .limit(5)
        )
        documents = result.scalars().all()
        context = "\n".join([doc.text for doc in documents])


    response_generator = await generate_langchain(message.text, history=[], context=context)
    response_chunks = [chunk async for chunk in response_generator]

    assistant_message = models.Message(
        id=str(uuid.uuid4()),
        text="".join(response_chunks),
        sender='model',
        timestamp=datetime.now().isoformat(),
        chat_id=chat_id
    )

    new_chat.messages.extend([user_message, assistant_message])
    db.add(new_chat)
    await db.commit()

    result = await db.execute(
        select(models.Chat)
        .options(selectinload(models.Chat.messages))
        .where(models.Chat.id == chat_id)
    )
    created_chat = result.scalar_one()

    return created_chat

@app.post("/chats/{chat_id}/messages")
async def send_message_to_chat(chat_id: str, message: PydanticMessage, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Chat).where(models.Chat.id == chat_id))
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    user_message = models.Message(
        id=str(uuid.uuid4()),
        text=message.text,
        sender=message.sender,
        timestamp=message.timestamp,
        chat_id=chat_id
    )

    history_result = await db.execute(select(models.Message).where(models.Message.chat_id == chat_id).order_by(models.Message.timestamp))
    history = history_result.scalars().all()

    context = None
    if message.rag_enabled:
        user_embedding = model.encode(message.text, convert_to_tensor=False).tolist()
        result = await db.execute(
            select(models.Document)
            .order_by(models.Document.embedding.l2_distance(user_embedding))
            .limit(5)
        )
        documents = result.scalars().all()
        context = "\n".join([doc.text for doc in documents])

    async def stream_response():
        response_generator = await generate_langchain(message.text, history=[{"sender": msg.sender, "text": msg.text} for msg in history], context=context)
        response_chunks = []
        async for chunk in response_generator:
            response_chunks.append(chunk)
            yield chunk

        assistant_message = models.Message(
            id=str(uuid.uuid4()),
            text="".join(response_chunks),
            sender='model',
            timestamp=datetime.now().isoformat(),
            chat_id=chat_id
        )
        db.add_all([user_message, assistant_message])
        chat.timestamp = datetime.now().isoformat()
        await db.commit()

    return StreamingResponse(stream_response(), media_type="text/plain")