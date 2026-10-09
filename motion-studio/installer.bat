@echo off
title Motion Studio - Installation
cd /d "%~dp0"
echo.
echo  === Motion Studio : installation ===
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo  [ERREUR] Node.js n'est pas installe.
  echo  Telechargez la version LTS sur https://nodejs.org puis relancez ce fichier.
  pause
  exit /b 1
)
for /f "tokens=1 delims=v." %%v in ('node -v') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 20 (
  echo  [ERREUR] Node.js 20 ou plus recent est requis. Version actuelle :
  node -v
  echo  Installez la version LTS depuis https://nodejs.org
  pause
  exit /b 1
)
echo  Node.js detecte :
node -v
echo.
echo  Installation des dependances (quelques minutes la premiere fois)...
call npm ci
if errorlevel 1 (
  echo  npm ci a echoue, nouvel essai avec npm install...
  call npm install
  if errorlevel 1 (
    echo  [ERREUR] L'installation a echoue. Verifiez votre connexion Internet.
    pause
    exit /b 1
  )
)
if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo  Fichier .env cree. Ajoutez-y votre cle ANTHROPIC_API_KEY pour activer Claude.
)
echo.
echo  Installation terminee. Lancez demarrer.bat pour ouvrir Motion Studio.
echo.
pause
