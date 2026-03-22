@echo off
color 0A
title Publicador MTG Scanner
echo ========================================================
echo   Enviando Atualizacoes do MTG Scanner para Nuvem...
echo ========================================================
echo.

set /p msg="Escreva o que voce mudou (ou aperte Enter para padrao): "
if "%msg%"=="" set msg=Atualizacao Rapida PWA Cloudflare

echo.
echo [1/3] Preparando arquivos modificados...
git add .

echo.
echo [2/3] Carimbando o passaporte (Commit)...
git commit -m "%msg%"

echo.
echo [3/3] Decolando pro GitHub (Cloudflare assume o resto)...
git push origin main

echo.
echo ========================================================
echo DECOLAGEM CONCLUIDA COM SUCESSO!
echo O Cloudflare ja identificou as mudancas e esta publicando o site na internet.
echo ========================================================
pause
