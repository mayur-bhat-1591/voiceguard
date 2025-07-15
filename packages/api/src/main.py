from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="VoiceGuard API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "VoiceGuard API v0.1.0 - Voice ownership infrastructure"}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "voiceguard-api"}

@app.get("/voice/register")
async def register_voice():
    return {"message": "Voice registration endpoint - TODO: implement"}

@app.post("/voice/verify")
async def verify_voice():
    return {"message": "Voice verification endpoint - TODO: implement"}
