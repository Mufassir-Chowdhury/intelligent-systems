from google import genai
from google.genai import types
import os

def generate(prompt, title=False, history=[]):
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable not set")

    client = genai.Client(
        api_key=api_key,
    )
    if title:
        prompt = f'Generate the title for the chat starting with the message: \"{prompt}\". The title should be descriptive of what the chat is about.'
    model = "gemini-2.5-flash-lite-preview-06-17"
    contents = [
        types.Content(
            role=message.sender,
            parts=[
                types.Part.from_text(text=message.text)
            ]
        ) for message in history
    ]
    contents.append(
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=prompt),
            ],
        )
    )
    # for message in history:
    #     contents.append(types.Content(
    #         role=message.sender,
    #         parts=[
    #             types.Part.from_text(text=message.text)
    #         ]
    #     ))
    generate_content_config = types.GenerateContentConfig(
        thinking_config = types.ThinkingConfig(
            thinking_budget=0,
        ),
        response_mime_type="text/plain",
        system_instruction=[
            types.Part.from_text(text="""You are a helpful assistant. Reply to user requests in a concise form. Be direct and don't read too much between the lines."""),
        ],
    )
    if title:
        generate_content_config.response_mime_type="application/json"
        generate_content_config.response_schema=genai.types.Schema(
            type = genai.types.Type.OBJECT,
            required = ["title"],
            properties = {
                "title": genai.types.Schema(
                    type = genai.types.Type.STRING,
                ),
            },
        )
        chunk = client.models.generate_content(model=model, contents=contents, config=generate_content_config)
        title = chunk.parsed['title']
        print(title)
        return title
    else:
        for chunk in client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=generate_content_config,
        ):
            yield chunk.text
