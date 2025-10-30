@echo off
echo Testing batch file...
echo Current directory: %CD%
echo.

echo Testing Node.js...
node --version
echo Node.js test completed

echo.
echo Testing npm...
npm --version
echo npm test completed

echo.
echo All tests completed
pause