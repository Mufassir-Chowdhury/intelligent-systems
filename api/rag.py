
import os
from pypdf import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import sqlalchemy_models as models
from database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

# Initialize the sentence transformer model
model = SentenceTransformer('all-MiniLM-L6-v2')

async def process_and_embed_pdfs(db: AsyncSession):
    workspace_dir = os.getenv("WORKSPACE")
    if not workspace_dir or not os.path.isdir(workspace_dir):
        print(f"Invalid WORKSPACE directory: {workspace_dir}")
        return

    for root, _, files in os.walk(workspace_dir):
        for file in files:
            if file.endswith(".pdf"):
                pdf_path = os.path.join(root, file)
                print(f"Processing {pdf_path}")
                try:
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
                            text=chunk,
                            embedding=embedding
                        )
                        db.add(document)
                    await db.commit()
                    print(f"Finished processing {pdf_path}")
                except Exception as e:
                    print(f"Error processing {pdf_path}: {e}")
