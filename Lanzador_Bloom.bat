@echo off
:: Cierra instancias previas de Chrome para asegurar que tome los parametros
taskkill /F /IM chrome.exe /T >nul 2>&1
timeout /t 1 >nul

:: Inicia Chrome en modo app, directo al dashboard y con impresion directa
start chrome.exe --kiosk-printing --disable-print-preview --app=https://bloommdp.com/dashboard/tables
