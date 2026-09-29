@echo off
echo ===================================================
echo   BLOOM - SUBIENDO A GITHUB Y DESPLEGANDO EN VERCEL
echo ===================================================
node scripts/push-to-github.mjs
echo.
echo Listo. Vercel detectara los cambios y actualizara tu web automaticamente.
pause
