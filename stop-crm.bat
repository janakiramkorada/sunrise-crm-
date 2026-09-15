@echo off
setlocal
cd /d "%~dp0"
if not exist ".env" (echo Missing .env.& exit /b 1)
docker compose --env-file .env down
echo PostgreSQL has been stopped. Close the Sunrise CRM API and Sunrise CRM Web terminal windows to stop the application processes.
