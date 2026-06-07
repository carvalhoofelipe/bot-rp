@echo off
cd /d "%~dp0"
echo Iniciando painel web do bot-rp...
echo Acesse http://localhost:3000
node src\web\index.js
echo.
echo O painel foi encerrado. Verifique a mensagem acima.
pause
