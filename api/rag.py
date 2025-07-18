
import os
from pypdf import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import sqlalchemy_models as models
from database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from datetime import datetime

# Initialize the sentence transformer model
model = SentenceTransformer('all-MiniLM-L6-v2')

async def process_and_embed_pdfs(db: AsyncSession):
    workspace_dir = os.getenv("WORKSPACE")
    if not workspace_dir or not os.path.isdir(workspace_dir):
        print(f"Invalid WORKSPACE directory: {workspace_dir}")
        return

    # Get all currently processed files from the database
    result = await db.execute(select(models.ProcessedFile))
    processed_files_db = {f.file_path: f for f in result.scalars().all()}

    current_pdf_files = {}
    for root, _, files in os.walk(workspace_dir):
        for file in files:
            if file.endswith(".pdf"):
                pdf_path = os.path.join(root, file)
                current_pdf_files[pdf_path] = os.path.getmtime(pdf_path)

    # Process new or modified files
    for pdf_path, current_mtime in current_pdf_files.items():
        db_file = processed_files_db.get(pdf_path)
        if not db_file or datetime.fromisoformat(db_file.last_modified).timestamp() < current_mtime:
            print(f"Processing/Updating {pdf_path}")
            try:
                # Delete existing documents for this file if it's an update
                if db_file:
                    await db.execute(delete(models.Document).where(models.Document.file_path == pdf_path))
                    await db.delete(db_file)

                reader = PdfReader(pdf_path)
                text = "".join(page.extract_text() for page in reader.pages)

                text_splitter = RecursiveCharacterTextSplitter(
                    chunk_size=1000,
                    chunk_overlap=200,
                    length_function=len
                )
                chunks = text_splitter.split_text(text)

                for chunk in chunks:
                    embedding = model.encode(chunk, convert_to_tensor=False).tolist()
                    document = models.Document(
                        file_path=pdf_path,
                        text=chunk,
                        embedding=embedding
                    )
                    db.add(document)
                
                # Add/Update processed file record
                processed_file = models.ProcessedFile(
                    file_path=pdf_path,
                    last_modified=datetime.fromtimestamp(current_mtime).isoformat()
                )
                db.add(processed_file)
                await db.commit()
                print(f"Finished processing {pdf_path}")
            except Exception as e:
                print(f"Error processing {pdf_path}: {e}")

    # Remove deleted files from the database
    for db_file_path, db_file in processed_files_db.items():
        if db_file_path not in current_pdf_files:
            print(f"Removing deleted file data for {db_file_path}")
            try:
                await db.execute(delete(models.Document).where(models.Document.file_path == db_file_path))
                await db.delete(db_file)
                await db.commit()
                print(f"Removed data for {db_file_path}")
            except Exception as e:
                print(f"Error removing data for {db_file_path}: {e}")
