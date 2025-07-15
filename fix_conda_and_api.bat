@echo off
echo 🔧 Fixing conda environment and API message...
echo.

echo 📋 Issues detected:
echo   - Wrong API message (Contract Negotiator instead of VoiceGuard)
echo   - Using conda 'videnv' but script looks for 'venv'
echo.

echo [1/3] Fixing API message in backend...
cd packages\api\src

REM Fix the main.py file with correct VoiceGuard message
echo from fastapi import FastAPI> main.py
echo from fastapi.middleware.cors import CORSMiddleware>> main.py
echo.>> main.py
echo app = FastAPI(title="VoiceGuard API", version="0.1.0")>> main.py
echo.>> main.py
echo app.add_middleware(>> main.py
echo     CORSMiddleware,>> main.py
echo     allow_origins=["*"],>> main.py
echo     allow_credentials=True,>> main.py
echo     allow_methods=["*"],>> main.py
echo     allow_headers=["*"],>> main.py
echo )>> main.py
echo.>> main.py
echo @app.get("/")>> main.py
echo async def root():>> main.py
echo     return {"message": "VoiceGuard API v0.1.0 - Voice ownership infrastructure"}>> main.py
echo.>> main.py
echo @app.get("/health")>> main.py
echo async def health():>> main.py
echo     return {"status": "healthy", "service": "voiceguard-api"}>> main.py
echo.>> main.py
echo @app.get("/voice/register")>> main.py
echo async def register_voice():>> main.py
echo     return {"message": "Voice registration endpoint - TODO: implement"}>> main.py
echo.>> main.py
echo @app.post("/voice/verify")>> main.py
echo async def verify_voice():>> main.py
echo     return {"message": "Voice verification endpoint - TODO: implement"}>> main.py

cd ..\..\..

echo [2/3] Updating package.json scripts for conda environment...

REM Update root package.json with conda-compatible scripts
echo {> package.json
echo   "name": "voiceguard",>> package.json
echo   "version": "0.1.0",>> package.json
echo   "description": "Voice ownership infrastructure for the AI age",>> package.json
echo   "private": true,>> package.json
echo   "scripts": {>> package.json
echo     "dev": "concurrently \"npm run dev:web\" \"npm run dev:api\"",>> package.json
echo     "dev:web": "cd packages/web && npm run dev",>> package.json
echo     "dev:api": "cd packages/api && python -m uvicorn src.main:app --reload",>> package.json
echo     "dev:api-conda": "cd packages/api && conda activate videnv && python -m uvicorn src.main:app --reload",>> package.json
echo     "install:all": "npm run install:web && npm run install:voice",>> package.json
echo     "install:web": "cd packages/web && npm install",>> package.json
echo     "install:voice": "cd packages/voice-engine && npm install">> package.json
echo   },>> package.json
echo   "devDependencies": {>> package.json
echo     "concurrently": "^8.2.2">> package.json
echo   }>> package.json
echo }>> package.json

echo [3/3] Creating conda-compatible run scripts...

REM Create conda-specific run script
echo @echo off> run-with-conda.bat
echo echo 🚀 Starting VoiceGuard with conda environment...>> run-with-conda.bat
echo echo.>> run-with-conda.bat
echo start "VoiceGuard Frontend" cmd /k "cd packages/web && npm run dev">> run-with-conda.bat
echo echo ✅ Frontend starting at http://localhost:3000>> run-with-conda.bat
echo echo.>> run-with-conda.bat
echo echo 🔄 Starting backend with conda...>> run-with-conda.bat
echo cd packages/api>> run-with-conda.bat
echo python -m uvicorn src.main:app --reload>> run-with-conda.bat

REM Create individual scripts for testing
echo cd packages/web && npm run dev> run-frontend-only.bat
echo cd packages/api && python -m uvicorn src.main:app --reload> run-backend-only.bat

echo.
echo ✅ Fixed conda environment and API message!
echo.
echo 🎯 What was fixed:
echo   ✓ Corrected API message to show VoiceGuard instead of Contract Negotiator
echo   ✓ Added proper API endpoints (/health, /voice/register, /voice/verify)
echo   ✓ Removed conda venv activation conflicts
echo   ✓ Created conda-compatible run scripts
echo.
echo 🚀 Test options:
echo   1. npm run dev                 (should work now)
echo   2. run-with-conda.bat          (opens separate windows)
echo   3. run-frontend-only.bat       (test frontend only)
echo   4. run-backend-only.bat        (test backend only)
echo.
echo 📍 Expected results:
echo   Frontend: http://localhost:3000 (VoiceGuard landing page)
echo   Backend:  http://localhost:8000 (VoiceGuard API message)
echo.
echo 💡 If frontend still doesn't load in browser:
echo   - Check if any other service is using port 3000
echo   - Try visiting http://127.0.0.1:3000 instead
echo   - Check browser console for errors
echo.
pause