# database.py
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text


load_dotenv()

engine = create_async_engine(os.environ["DATABASE_URL"], echo=True, future=True)
SessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=engine, class_=AsyncSession
)

async def get_db() -> AsyncSession:
    """
    Dependency function that yields a new SQLAlchemy async session.
    """
    async with SessionLocal() as session:
        yield session

async def enable_vector_extension(engine):
    async with engine.connect() as conn:
        await conn.execute(text('CREATE EXTENSION IF NOT EXISTS vector'))
        await conn.commit()