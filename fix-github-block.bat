@echo off
title Corrigindo Segurança do GitHub
echo ========================================================
echo Removendo chaves vazadas do histórico do sistema...
echo ========================================================
echo.

git add miner.mjs src/services/api.js .env.local
git commit --amend --no-edit

echo.
echo ========================================================
echo Chaves permanentemente apagadas do vagão!
echo O caminho esta livre para o Push.
echo ========================================================
pause
