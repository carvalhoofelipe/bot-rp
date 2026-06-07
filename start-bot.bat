@echo off
cd /d "%~dp0"
echo Iniciando bot-rp...
echo Feche esta janela para desligar o bot.
node src\index.js
echo.
echo O bot foi encerrado. Verifique a mensagem acima.
pause
