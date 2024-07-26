# main.py
from fastapi import FastAPI, Request, File, UploadFile
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
import speech_recognition as sr
from pydub import AudioSegment
import io
from marvin import chat
import asyncio

app = FastAPI()

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Set up Jinja2 templates
templates = Jinja2Templates(directory="templates")

@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/recognize")
async def recognize_speech(audio: UploadFile = File(...)):
    # Read the uploaded file
    contents = await audio.read()
    audio_data = io.BytesIO(contents)

    # Convert to wav
    audio_segment = AudioSegment.from_file(audio_data)
    wav_data = io.BytesIO()
    audio_segment.export(wav_data, format="wav")
    wav_data.seek(0)

    # Use speech recognition
    recognizer = sr.Recognizer()
    with sr.AudioFile(wav_data) as source:
        audio_data = recognizer.record(source)
    
    try:
        text = recognizer.recognize_google(audio_data)
        
        async def generate():
            for chunk in chat(text):
                yield f"data: {chunk}\n\n"
                await asyncio.sleep(0.01)  # Small delay to ensure chunks are sent separately
            yield "data: [END]\n\n"
        
        return StreamingResponse(generate(), media_type="text/event-stream")
    except sr.UnknownValueError:
        return {"error": "Speech could not be understood"}
    except sr.RequestError as e:
        return {"error": f"Could not request results; {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)