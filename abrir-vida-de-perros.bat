@echo off
:: Abre Vida de Perros (veterinaria + pet shop) en modo local.
:: Doble clic sobre este archivo. Para cerrar: cerrar esta ventana negra.
cd /d "%~dp0"
title Vida de Perros - servidor local

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo  Falta instalar Node.js. Descargalo de https://nodejs.org ^(version LTS^) y volve a abrir este archivo.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo  Instalando dependencias por unica vez, puede tardar unos minutos...
  call npm install
)

echo.
echo  Abriendo la tienda y el panel en el navegador...
echo  Desde el celular (misma red WiFi) usa la direccion "Network" que aparece abajo + /veterinaria
echo.
start "" cmd /c "timeout /t 8 >nul && start http://localhost:3000/veterinaria && start http://localhost:3000/veterinaria/admin"
call npm run dev
