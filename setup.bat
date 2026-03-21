@echo off
call npx -y create-vite@latest temp-app --template react
xcopy temp-app . /E /H /Y
rmdir /s /q temp-app
call npm install
call npm install -D tailwindcss postcss autoprefixer
call npx tailwindcss init -p
call npm install tesseract.js lucide-react react-router-dom clsx tailwind-merge
