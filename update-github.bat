@echo off
echo ========================================================
echo Enviando Atualizacoes do MTG Scanner para o GitHub
echo ========================================================

echo.
echo Passo 1: Adicionando e salvando as modificacoes (Commit)...
git add .
git commit -m "Otimizando Reconhecimento de Camera e adicionando Market"

echo.
echo Passo 2: Sincronizando codigo com a nuvem...
git push origin main

echo.
echo Passo 3: Compilando e Publicando (GH Pages)...
cmd /c npm run deploy

echo.
echo ========================================================
echo ATUALIZACAO PUBLICADA COM SUCESSO! 🚀
echo ========================================================
pause
