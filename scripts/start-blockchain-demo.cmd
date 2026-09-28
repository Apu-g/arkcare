@echo off
setlocal
cd /d "%~dp0..\Blockchain"

echo ===============================================
echo        CareQuest Free Local Blockchain
echo ===============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. ArkCare already uses Node for the frontend.
  exit /b 1
)

if not exist node_modules (
  echo Installing local blockchain dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)

if exist runtime rmdir /s /q runtime
mkdir runtime

echo Starting free local EVM...
start "CareQuest Local EVM" /min cmd /c "npx hardhat node --hostname 127.0.0.1 --port 8545 > runtime\hardhat.log 2>&1"

node scripts\wait-for-rpc.js
if errorlevel 1 exit /b 1

echo Deploying CareQuest contracts...
node scripts\deploy.js
if errorlevel 1 exit /b 1

echo.
echo ===============================================
echo CareQuest blockchain ready.
echo No faucet. No MetaMask. No paid RPC. No real gas.
echo Keep this window open during the demo.
echo ===============================================
echo.
node bridge-server.js
