@echo off
chcp 65001 > nul
title GoldenERP - Radar Sync
color 0b
cd /d "%~dp0"
node scripts\cloud-crawler.mjs
pause
