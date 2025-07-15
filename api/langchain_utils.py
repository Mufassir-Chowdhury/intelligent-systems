import os
from typing import AsyncGenerator

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.pydantic_v1 import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI

# Check for API key
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY environment variable not set")

# Pydantic model for title generation
class Title(BaseModel):
    """A descriptive title for a chat session."""
    title: str = Field(..., description="A concise and descriptive title for the chat, based on the initial message.")

# Initialize the LLM
model_name = "gemini-2.5-flash"
llm = ChatGoogleGenerativeAI(
    model=model_name,
    google_api_key=api_key,
    generation_config={"thinking_config": {"thinking_budget": 0}}
)

def convert_history_to_langchain_format(history):
    """Converts chat history to LangChain message format."""
    messages = []
    for message in history:
        if message.sender.lower() == 'user':
            messages.append(HumanMessage(content=message.text))
        else:
            messages.append(AIMessage(content=message.text))
    return messages

async def generate_langchain(prompt: str, title: bool = False, history: list = []):
    """
    Generates a response from Gemini using LangChain.
    If title is True, it generates a title for the chat.
    Otherwise, it streams the chat response.
    """
    if title:
        title_prompt = f'Generate the title for the chat starting with the message: "{prompt}". The title should be descriptive of what the chat is about.'
        
        structured_llm = llm.with_structured_output(Title)
        
        messages = [HumanMessage(content=title_prompt)]
        
        result = await structured_llm.ainvoke(messages)
        return result.title
    else:
        system_message = SystemMessage(content="You are a helpful assistant. Reply to user requests in a concise form. Be direct and don't read too much between the lines.")
        
        messages = convert_history_to_langchain_format(history)
        messages.append(HumanMessage(content=prompt))
        
        final_messages = [system_message] + messages

        async def response_generator() -> AsyncGenerator[str, None]:
            async for chunk in llm.astream(final_messages):
                if chunk.content:
                    yield chunk.content
        
        return response_generator()
