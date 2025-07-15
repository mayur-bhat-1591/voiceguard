@echo off
echo 🔧 Fixing frontend 404 error...
echo.

echo 📋 Issue: Next.js running but homepage returns 404
echo 🛠️  Fix: Creating proper page structure and index file
echo.

cd packages\web

echo [1/4] Creating proper Next.js folder structure...
if not exist src mkdir src
if not exist src\pages mkdir src\pages
if not exist src\styles mkdir src\styles

echo [2/4] Creating working index page...
echo import { useState } from 'react';> src\pages\index.js
echo.>> src\pages\index.js
echo export default function Home() {>> src\pages\index.js
echo   const [isRecording, setIsRecording] = useState(false);>> src\pages\index.js
echo   const [apiStatus, setApiStatus] = useState('Checking...');>> src\pages\index.js
echo.>> src\pages\index.js
echo   // Test API connection>> src\pages\index.js
echo   const testAPI = async () =^> {>> src\pages\index.js
echo     try {>> src\pages\index.js
echo       const response = await fetch('http://localhost:8000/');>> src\pages\index.js
echo       const data = await response.json();>> src\pages\index.js
echo       setApiStatus(data.message ^|^| 'API Connected');>> src\pages\index.js
echo     } catch (error) {>> src\pages\index.js
echo       setApiStatus('API Disconnected');>> src\pages\index.js
echo     }>> src\pages\index.js
echo   };>> src\pages\index.js
echo.>> src\pages\index.js
echo   const startRecording = () =^> {>> src\pages\index.js
echo     setIsRecording(true);>> src\pages\index.js
echo     setTimeout(() =^> setIsRecording(false), 3000);>> src\pages\index.js
echo   };>> src\pages\index.js
echo.>> src\pages\index.js
echo   return (>> src\pages\index.js
echo     ^<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8"^>>> src\pages\index.js
echo       ^<div className="max-w-4xl mx-auto"^>>> src\pages\index.js
echo         ^<div className="text-center mb-8"^>>> src\pages\index.js
echo           ^<h1 className="text-5xl font-bold text-gray-900 mb-4"^>>> src\pages\index.js
echo             🎤 VoiceGuard>> src\pages\index.js
echo           ^</h1^>>> src\pages\index.js
echo           ^<p className="text-xl text-gray-600 mb-2"^>>> src\pages\index.js
echo             Voice ownership infrastructure for the AI age>> src\pages\index.js
echo           ^</p^>>> src\pages\index.js
echo           ^<p className="text-sm text-gray-500"^>>> src\pages\index.js
echo             Prove you own your voice with cryptographic certainty>> src\pages\index.js
echo           ^</p^>>> src\pages\index.js
echo         ^</div^>>> src\pages\index.js
echo.>> src\pages\index.js
echo         ^<div className="grid md:grid-cols-2 gap-8"^>>> src\pages\index.js
echo           ^{/* API Status */^}>> src\pages\index.js
echo           ^<div className="bg-white rounded-lg shadow-lg p-6"^>>> src\pages\index.js
echo             ^<h2 className="text-2xl font-semibold mb-4"^>System Status^</h2^>>> src\pages\index.js
echo             ^<div className="space-y-3"^>>> src\pages\index.js
echo               ^<div className="flex justify-between"^>>> src\pages\index.js
echo                 ^<span^>Frontend:^</span^>>> src\pages\index.js
echo                 ^<span className="text-green-600 font-medium"^>✅ Running^</span^>>> src\pages\index.js
echo               ^</div^>>> src\pages\index.js
echo               ^<div className="flex justify-between"^>>> src\pages\index.js
echo                 ^<span^>Backend API:^</span^>>> src\pages\index.js
echo                 ^<span className="text-blue-600 font-medium"^>{apiStatus}^</span^>>> src\pages\index.js
echo               ^</div^>>> src\pages\index.js
echo               ^<button>> src\pages\index.js
echo                 onClick={testAPI}>> src\pages\index.js
echo                 className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">> src\pages\index.js
echo               ^>>> src\pages\index.js
echo                 Test API Connection>> src\pages\index.js
echo               ^</button^>>> src\pages\index.js
echo             ^</div^>>> src\pages\index.js
echo           ^</div^>>> src\pages\index.js
echo.>> src\pages\index.js
echo           ^{/* Voice Demo */^}>> src\pages\index.js
echo           ^<div className="bg-white rounded-lg shadow-lg p-6"^>>> src\pages\index.js
echo             ^<h2 className="text-2xl font-semibold mb-4"^>Voice Demo^</h2^>>> src\pages\index.js
echo             ^<div className="text-center space-y-4"^>>> src\pages\index.js
echo               ^<button>> src\pages\index.js
echo                 onClick={startRecording}>> src\pages\index.js
echo                 disabled={isRecording}>> src\pages\index.js
echo                 className={`px-8 py-4 rounded-lg font-medium transition-all ${>> src\pages\index.js
echo                   isRecording >> src\pages\index.js
echo                     ? 'bg-red-500 text-white animate-pulse cursor-not-allowed' >> src\pages\index.js
echo                     : 'bg-green-600 hover:bg-green-700 text-white'>> src\pages\index.js
echo                 }`}>> src\pages\index.js
echo               ^>>> src\pages\index.js
echo                 {isRecording ? '🔴 Recording Voice...' : '🎤 Start Voice Demo'}>> src\pages\index.js
echo               ^</button^>>> src\pages\index.js
echo               ^<p className="text-sm text-gray-500"^>>> src\pages\index.js
echo                 {isRecording ? 'Analyzing voice patterns...' : 'Click to simulate voice registration'}>> src\pages\index.js
echo               ^</p^>>> src\pages\index.js
echo               ^{isRecording ^&^& (>> src\pages\index.js
echo                 ^<div className="bg-gray-100 p-4 rounded"^>>> src\pages\index.js
echo                   ^<div className="text-sm text-gray-600"^>>> src\pages\index.js
echo                     Step 1: Capturing audio... ✅^<br /^>>> src\pages\index.js
echo                     Step 2: Extracting voice features... ⏳^<br /^>>> src\pages\index.js
echo                     Step 3: Creating voice fingerprint... ⏳^<br /^>>> src\pages\index.js
echo                     Step 4: Generating blockchain certificate... ⏳>> src\pages\index.js
echo                   ^</div^>>> src\pages\index.js
echo                 ^</div^>>> src\pages\index.js
echo               )}>> src\pages\index.js
echo             ^</div^>>> src\pages\index.js
echo           ^</div^>>> src\pages\index.js
echo         ^</div^>>> src\pages\index.js
echo.>> src\pages\index.js
echo         ^<div className="mt-8 grid md:grid-cols-3 gap-6"^>>> src\pages\index.js
echo           ^<div className="bg-white p-6 rounded-lg shadow-md text-center"^>>> src\pages\index.js
echo             ^<div className="text-3xl mb-2"^>🔐^</div^>>> src\pages\index.js
echo             ^<h3 className="font-semibold text-lg mb-2"^>Secure^</h3^>>> src\pages\index.js
echo             ^<p className="text-gray-600 text-sm"^>Cryptographic voice ownership certificates on blockchain^</p^>>> src\pages\index.js
echo           ^</div^>>> src\pages\index.js
echo           ^<div className="bg-white p-6 rounded-lg shadow-md text-center"^>>> src\pages\index.js
echo             ^<div className="text-3xl mb-2"^>⚡^</div^>>> src\pages\index.js
echo             ^<h3 className="font-semibold text-lg mb-2"^>Fast^</h3^>>> src\pages\index.js
echo             ^<p className="text-gray-600 text-sm"^>Verify voice ownership in under 2 seconds^</p^>>> src\pages\index.js
echo           ^</div^>>> src\pages\index.js
echo           ^<div className="bg-white p-6 rounded-lg shadow-md text-center"^>>> src\pages\index.js
echo             ^<div className="text-3xl mb-2"^>🌐^</div^>>> src\pages\index.js
echo             ^<h3 className="font-semibold text-lg mb-2"^>Universal^</h3^>>> src\pages\index.js
echo             ^<p className="text-gray-600 text-sm"^>Works with any voice AI platform^</p^>>> src\pages\index.js
echo           ^</div^>>> src\pages\index.js
echo         ^</div^>>> src\pages\index.js
echo       ^</div^>>> src\pages\index.js
echo     ^</div^>>> src\pages\index.js
echo   );>> src\pages\index.js
echo }>> src\pages\index.js

echo [3/4] Creating _app.js for global styles...
echo import '../styles/globals.css';> src\pages\_app.js
echo.>> src\pages\_app.js
echo export default function App({ Component, pageProps }) {>> src\pages\_app.js
echo   return ^<Component {...pageProps} /^>;>> src\pages\_app.js
echo }>> src\pages\_app.js

echo [4/4] Creating global CSS with Tailwind...
echo @tailwind base;> src\styles\globals.css
echo @tailwind components;>> src\styles\globals.css
echo @tailwind utilities;>> src\styles\globals.css
echo.>> src\styles\globals.css
echo body {>> src\styles\globals.css
echo   margin: 0;>> src\styles\globals.css
echo   font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;>> src\styles\globals.css
echo }>> src\styles\globals.css

cd ..\..

echo.
echo ✅ Frontend 404 fixed!
echo.
echo 🎯 What was created:
echo   ✓ Proper Next.js page structure
echo   ✓ Working index page with VoiceGuard demo
echo   ✓ API connection testing
echo   ✓ Voice recording simulation
echo   ✓ Global styles and Tailwind CSS
echo.
echo 🚀 The frontend should now load properly!
echo.
echo 📍 Test again:
echo   1. Save any terminal output (Ctrl+C if needed)
echo   2. Run: npm run dev
echo   3. Visit: http://localhost:3000
echo   4. You should see the VoiceGuard demo page
echo.
echo 💡 Features on the page:
echo   • System status checker
echo   • API connection test button
echo   • Voice recording demo simulation
echo   • Clean VoiceGuard branding
echo.
pause