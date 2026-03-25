# Project Nexus

A modern microservices-based e-commerce platform with real-time log aggregation, monitoring, and analytics.

## 📋 Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Services](#services)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Project](#running-the-project)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

Project Nexus is a full-stack e-commerce application built with microservices architecture. It features:
- **Real-time log aggregation** via Kafka and Elasticsearch
- **Commerce functionalities** (products, orders, user authentication)
- **Admin dashboard** with real-time analytics and monitoring
- **Log shipment pipeline** for both application and nginx logs
- **Docker containerization** for easy deployment

## 🏗️ Architecture

The system consists of frontend applications, a backend API, and a log aggregation pipeline:
- **Frontend/Dashboard**: React applications for user commerce and admin monitoring
- **Backend API**: Node.js REST API handling business logic
- **Kafka**: Message broker for log streaming
- **Elasticsearch**: Search and analytics engine for logs
- **Log Pipeline**: Python services shipping application and nginx logs

## 🔧 Services

### Core Infrastructure
| Service | Purpose | Port | Technology |
|---------|---------|------|-----------|
| **Elasticsearch** | Log storage and search | 9200 | Elasticsearch 9.3.0 |
| **Kafka** | Message broker | 9092 | Kafka 7.8.3 (KRaft mode) |

### Application Services

#### Backend (Node.js)
- **Location**: web-server/backend
- **Responsibilities**: RESTful API for commerce operations
- **Features**:
  - User authentication & authorization
  - Product management
  - Order processing
  - Admin functions
- **Routes**: /api/auth, /api/products, /api/orders, /api/admin

#### Frontend (React/Vite)
- **Location**: web-server/frontend
- **Responsibilities**: User-facing e-commerce interface
- **Features**: 
  - Product browsing
  - Shopping cart
  - Order management
  - User authentication

#### Dashboard (React/Vite)
- **Location**: dashboard
- **Responsibilities**: Real-time monitoring and analytics
- **Features**:
  - Log visualization
  - Event tracking
  - Alert management

### Log Processing Pipeline

#### Log Shipper
- **Location**: pp_logs_sender/log_shipper
- **Function**: Reads application logs and sends to Kafka
- **Input**: Backend logs from web-server/backend/logs/app.log

#### To Elastic
- **Location**: pp_logs_sender/to_elastic
- **Function**: Consumes logs from Kafka and indexes to Elasticsearch
- **Input**: Kafka topic logs
- **Output**: Elasticsearch index project_logs

#### Nginx Logger  
- **Locations**: 
ginx_logs/publish (producer), 
ginx_logs/consumer (consumer)
- **Function**: Processes nginx access logs through Kafka

## 📦 Prerequisites

### Required
- **Docker** 20.10+ and **Docker Compose** 2.0+
  - [Install Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Node.js** 16.x or higher
  - [Download Node.js](https://nodejs.org/)
- **Python** 3.9 or higher
  - [Download Python](https://www.python.org/)

### Optional
- **Git** for version control
- **Curl** or **Postman** for API testing

## 🚀 Installation

### 1. Clone/Setup Project
`ash
cd project_nexus
`

### 2. Install Backend Dependencies
`ash
cd web-server/backend
npm install
`

### 3. Install Frontend Dependencies
`ash
cd ../frontend
npm install
`

### 4. Install Dashboard Dependencies
`ash
cd ../../dashboard
npm install
`

### 5. Install Python Service Dependencies
`ash
# Log Shipper
cd ../../app_logs_sender/log_shipper
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Repeat for other services:
# - app_logs_sender/to_elastic
# - nginx_logs/publish
# - nginx_logs/consumer
`

## ⚙️ Configuration

### Environment Variables

Backend (web-server/backend/.env):
`env
NODE_ENV=development
PORT=3000
JWT_SECRET=your_secret_key
`

Python services are configured via docker-compose.yml environment variables:
- BOOTSTRAP_SERVERS: Kafka broker (default: kafka:9092)
- ELASTICSEARCH_HOSTS: Elasticsearch endpoint (default: http://elasticsearch:9200)

### Database Setup

Configure your database connection in [web-server/backend/db.js](web-server/backend/db.js).

## 🏃 Running the Project

### Start All Services
`ash
cd project_nexus
docker-compose up -d
`

### Access Services

| Service | URL |
|---------|-----|
| **Website (Nginx)** | http://localhost:80 |
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Dashboard | http://localhost:5173 |
| Elasticsearch | http://localhost:9200 |

### Stop Services
`ash
docker-compose down
`

## 💻 Development

### Backend
`ash
cd web-server/backend
npm install
npm start
`

### Frontend
`ash
cd web-server/frontend
npm install
npm run dev
`

### Dashboard
`ash
cd dashboard
npm install
npm run dev
`

### Python Services
`ash
cd app_logs_sender/log_shipper
source venv/bin/activate
python main.py
`

## 📚 API Endpoints

Base: http://localhost:3001/api

**Authentication**
- POST /auth/login - User login
- POST /auth/register - User registration

**Products**
- GET /products - List products
- GET /products/:id - Get product details
- POST /products - Create product (Admin)
- PUT /products/:id - Update product (Admin)
- DELETE /products/:id - Delete product (Admin)

**Orders**
- GET /orders - Get user orders
- POST /orders - Create order
- GET /orders/:id - Get order details

**Admin**
- GET /admin/users - List users
- GET /admin/products - Manage products
- GET /admin/analytics - View analytics

## 🐛 Troubleshooting

### Elasticsearch Issues
`ash
# Check if running
docker ps | grep elasticsearch

# View logs
docker logs elasticsearch

# Check health
curl http://localhost:9200/_cat/health
`

### Kafka Issues
`ash
# Test connection
docker exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092
`

### Port Already in Use
`ash
# Windows: Find process on port
netstat -ano | findstr :3000

# macOS/Linux: Find process
lsof -i :3000
`

### Log Pipeline Not Working
`ash
# Check if logs exist
cat web-server/backend/logs/app.log

# Check Kafka topic
docker exec kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic logs --from-beginning

# Check Elasticsearch
curl "http://localhost:9200/project_logs/_doc/_search"
`

## 📋 Project Structure

`
project_nexus/
├── docker-compose.yml
├── README.md
├── app_logs_sender/
│   ├── log_shipper/
│   └── to_elastic/
├── nginx_logs/
│   ├── publish/
│   └── consumer/
├── web-server/
│   ├── backend/
│   ├── frontend/
│   ├── nginx/
│   └── simulation/
└── dashboard/
`

## 🤝 Contributing

1. Follow existing code structure
2. Update documentation for changes
3. Test with Docker Compose before submitting

## 📞 Support

- Check Troubleshooting section
- Review service logs: docker-compose logs <service_name>
- Ensure prerequisites are installed

## ✅ Status

- ✅ Microservices architecture
- ✅ Docker containerization
- ✅ Elasticsearch integration
- ✅ Kafka message broker
- ✅ Real-time log aggregation
- ✅ Admin dashboard
- ✅ E-commerce platform
