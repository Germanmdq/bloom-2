@echo off
chcp 65001 >nul
title Subir fotos de productos - Bloom
cd /d "%~dp0"

rem Carpeta con las fotos y archivo que dice que foto va con cada producto
set "FOTOS=C:\Users\mateo\Documents\Codex\2026-09-24\files-mentioned-by-the-user-menu\outputs\bloom-imagenes-unicas"
set "MAPEO=C:\Users\mateo\Documents\Codex\2026-09-24\files-mentioned-by-the-user-menu\outputs\bloom-fotos-para-cloud-code-v2.md"

rem Base de datos que usa la app
set "NEXT_PUBLIC_SUPABASE_URL=https://zcgctaqzqcpqopforttc.supabase.co"

if not exist "%FOTOS%" (
  echo No encuentro la carpeta de fotos:
  echo   %FOTOS%
  echo Edita este archivo y corregi la ruta en la linea FOTOS.
  pause
  exit /b 1
)
if not exist "%MAPEO%" (
  echo No encuentro el archivo de mapeo:
  echo   %MAPEO%
  echo Edita este archivo y corregi la ruta en la linea MAPEO.
  pause
  exit /b 1
)

where node >nul 2>nul || (
  echo Falta Node.js. Instalalo desde https://nodejs.org y volve a abrir este archivo.
  pause
  exit /b 1
)

if not exist "node_modules\@supabase\supabase-js" (
  echo Instalando dependencias, puede tardar un par de minutos...
  call npm install
)

echo.
echo Necesito la clave service_role del proyecto zcgctaqzqcpqopforttc.
echo Esta en Supabase: Project Settings ^> API Keys ^> service_role / secret.
echo Si ya esta en tu .env.local, apreta Enter.
set "CLAVE="
set /p "CLAVE=Clave: "
if not "%CLAVE%"=="" set "SUPABASE_SERVICE_ROLE_KEY=%CLAVE%"

echo.
echo ===== REVISION (todavia no se cambia nada) =====
node scripts\asignar-fotos-productos.mjs "%FOTOS%" "%MAPEO%"
if errorlevel 1 (
  echo.
  echo Hubo un error. Revisa el mensaje de arriba.
  pause
  exit /b 1
)

echo.
set "OK="
set /p "OK=Esta bien? Escribi SI para subir las fotos: "
if /i not "%OK%"=="SI" (
  echo No se subio nada.
  pause
  exit /b 0
)

echo.
echo ===== SUBIENDO FOTOS =====
node scripts\asignar-fotos-productos.mjs "%FOTOS%" "%MAPEO%" --aplicar
echo.
pause
