# ENEM Backend API

API backend para o simulador ENEM desenvolvido em Node.js com Fastify.

## Features

- 📚 API RESTful para questões do ENEM
- 🔒 Segurança com Helmet e Rate Limiting
- 🌐 CORS configurado para múltiplas origens
- 📝 Suporte a questões em português, inglês e espanhol
- 🚀 Otimizado para performance
- 📊 Dados estáticos de provas ENEM 2010-2023

## Endpoints

- `GET /api/exams` - Lista todos os exames
- `GET /api/exams/:year` - Detalhes de um exame específico
- `GET /api/exams/:year/questions/:id` - Questão específica (suporte a parâmetro `language`)
- `POST /api/simulados/questions` - Múltiplas questões para simulado

## Deploy

Este backend está configurado para deploy no Render.

## Tecnologias

- Node.js
- Fastify
- Helmet (segurança)
- CORS
- Rate Limiting
- Marked (markdown processing)