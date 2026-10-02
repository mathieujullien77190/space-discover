@echo off
cd /d "%~dp0"
echo Serveur sur http://localhost:5179
npx --yes http-server -p 5179 -c-1 -o
