#!/bin/bash
# Cerrar Chrome si está abierto para asegurar que tome los permisos de impresión
killall "Google Chrome" 2>/dev/null
sleep 1
# Lanzar Bloom en modo App y con impresión automática (Kiosk)
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --kiosk-printing --disable-print-preview --app=https://bloommdp.com/dashboard/tables
