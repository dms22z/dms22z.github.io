@echo off
title Motion Studio
cd /d "%~dp0"
if not exist "node_modules" (
  echo  Premiere utilisation : installation en cours...
  call installer.bat
)
echo.
echo  Demarrage de Motion Studio...
echo  L'application va s'ouvrir dans votre navigateur : http://127.0.0.1:5173
echo  Laissez cette fenetre ouverte pendant l'utilisation. Fermez-la pour quitter.
echo.
call npm start
pause
