@echo off
setlocal EnableExtensions
cd /d "%~dp0"
if not exist ".env" (
  echo Missing .env. Copy .env.example to .env, set the development secrets, and run this again.
  exit /b 1
)
for /f "usebackq tokens=1,* delims==" %%A in (".env") do if not "%%A"=="" if not "%%A:~0,1%"=="#" set "%%A=%%B"
docker version >nul 2>&1
if errorlevel 1 (
  echo Docker Desktop is unavailable. Start Docker Desktop and retry.
  exit /b 1
)
echo Starting PostgreSQL...
docker compose --env-file .env up -d postgres
if errorlevel 1 exit /b 1
echo Starting backend and frontend in separate terminals...
start "Sunrise CRM API" cmd /k "cd /d ^"%CD%\backend^" ^&^& call mvnw.cmd spring-boot:run"
start "Sunrise CRM Web" cmd /k "cd /d ^"%CD%\frontend^" ^&^& if not exist node_modules npm install ^&^& npm run dev"
echo CRM startup has been launched. Open http://localhost:3000 once both windows report ready.
