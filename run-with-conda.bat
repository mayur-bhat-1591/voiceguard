@echo off
echo 🚀 Starting VoiceGuard with conda environment...
echo.
start "VoiceGuard Frontend" cmd /k "cd packages/web && npm run dev"
echo ✅ Frontend starting at http://localhost:3000
echo.
echo 🔄 Starting backend with conda...
cd packages/api
python -m uvicorn src.main:app --reload
