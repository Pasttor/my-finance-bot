# 💰 Mi Finanzas Bot

Sistema de gestión financiera personal con integración de WhatsApp, IA para OCR de recibos, y dashboard interactivo.

## 🚀 Stack Tecnológico

- **Backend**: FastAPI (Python)
- **Base de Datos**: Supabase (PostgreSQL)
- **IA/OCR**: Google Gemini AI
- **WhatsApp**: Twilio API
- **Frontend**: React + TailwindCSS + Recharts
- **Deployment**: Railway (Backend) + Vercel (Frontend)

## 📁 Estructura del Proyecto

```
my-finance-bot/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Environment settings
│   │   ├── models/              # Pydantic models
│   │   ├── services/            # Business logic
│   │   ├── routers/             # API endpoints
│   │   └── scheduler/           # Reminder jobs
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   ├── services/            # API client
│   │   └── hooks/               # Custom hooks
│   ├── package.json
│   └── vercel.json
└── README.md
```

## ⚙️ Configuración

### 1. Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales
```

### 2. Variables de Entorno

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=ACxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=whatsapp:+14155238886

# Gemini AI
GEMINI_API_KEY=your_gemini_key

# Frontend
FRONTEND_URL=http://localhost:5173
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## 🚀 Ejecución

### Backend
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm run dev
```

## 📱 Uso con WhatsApp

### Registrar Gastos
Envía mensajes como:
- `Gasté 150 en Uber #Personal`
- `Pagué 500 de Netflix #LabCasa`
- `Ingreso 5000 de sueldo #Asces`

### Enviar Tickets
Envía una foto de tu ticket/recibo y el sistema extraerá automáticamente:
- Comercio
- Monto total
- Fecha

### Correcciones
Si te equivocaste en el último registro:
- `Cámbialo a 450`
- `No fueron 500, sino 600`

## 📊 Dashboard

El dashboard muestra:
- 💰 Resumen de ingresos/gastos/balance
- 📈 Gráfico de flujo de caja
- 🏷️ Distribución por proyecto (#Asces, #LabCasa, #Personal)
- 📅 Calendario de vencimientos
- 🎯 Progreso de metas de ahorro
- 📋 Transacciones recientes

## 📅 Recordatorios Automáticos

El sistema envía recordatorios por WhatsApp:
- **T-3**: 3 días antes del vencimiento
- **T-0**: El día del vencimiento
- **T+1**: 1 día después (vencido)

## 🔧 API Endpoints

### Dashboard
- `GET /api/dashboard/summary` - Resumen financiero
- `GET /api/dashboard/cashflow` - Flujo de caja diario
- `GET /api/dashboard/by-tag` - Distribución por proyecto
- `GET /api/dashboard/calendar` - Calendario del mes
- `GET /api/dashboard/savings` - Metas de ahorro

### Transacciones
- `GET /api/transactions` - Listar transacciones
- `POST /api/transactions` - Crear transacción
- `PATCH /api/transactions/{id}` - Actualizar transacción

### Webhook
- `POST /webhook/whatsapp` - Recibir mensajes de Twilio

## 🔐 Configuración de Twilio

1. Crear cuenta en [Twilio](https://www.twilio.com)
2. Activar WhatsApp Sandbox
3. Configurar webhook URL: `https://tu-backend.railway.app/webhook/whatsapp`

## 📦 Deployment

### Backend (Railway)
```bash
# Conectar repositorio a Railway
# Configurar variables de entorno
# Deploy automático
```

### Frontend (Vercel)
```bash
cd frontend
vercel
```

## 📄 Licencia

MIT License
