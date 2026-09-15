@echo off
setlocal
set "WRAPPER_DIR=%~dp0.mvn\wrapper"
set "MAVEN_VERSION=3.9.10"
set "MAVEN_HOME=%WRAPPER_DIR%\apache-maven-%MAVEN_VERSION%"
if exist "%MAVEN_HOME%\bin\mvn.cmd" goto run
echo Downloading the project-local Maven %MAVEN_VERSION% runtime...
if not exist "%WRAPPER_DIR%" mkdir "%WRAPPER_DIR%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='%WRAPPER_DIR%\maven.zip'; Invoke-WebRequest -UseBasicParsing 'https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/%MAVEN_VERSION%/apache-maven-%MAVEN_VERSION%-bin.zip' -OutFile $p; Expand-Archive -Path $p -DestinationPath '%WRAPPER_DIR%' -Force; Remove-Item $p -Force"
if not exist "%MAVEN_HOME%\bin\mvn.cmd" (echo Maven download failed. Check your internet connection and TLS settings.& exit /b 1)
:run
call "%MAVEN_HOME%\bin\mvn.cmd" %*
