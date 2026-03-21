@echo off
echo ========================================================
echo Finalizando Deploy Automatico do MTG Scanner PWA
echo ========================================================

echo.
echo Passo 1: Configurando suas credenciais do Git...
git config user.name "WanderlanLima"
git config user.email "wanderlan@github.com"

echo.
echo Passo 2: Salvando arquivos locais...
git add .
git commit -m "Publicacao final"

echo.
echo Passo 3: Enviando os arquivos para o GitHub...
git branch -M main
git push -u origin main

echo.
echo Passo 4: Construindo e Hospedando no GH Pages...
cmd /c npm run deploy

echo.
echo ========================================================
echo DEPLOY FINALIZADO COM SUCESSO! 
echo Em alguns minutos seu App estara em:
echo https://WanderlanLima.github.io/mtg-scanner/
echo ========================================================
pause
