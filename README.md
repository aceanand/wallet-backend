# Wallet Backend

Node.js + Express backend for the Departmental Expense Wallet System with PostgreSQL row-level locking for concurrent transaction handling.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure database
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Setup database
npm run setup-db

# Start server
npm start
```

Server runs on: http://localhost:5001

## 🏗️ Structure

```
server/
├── config/
│   └── database.js              # PostgreSQL connection
├── routes/
│   └── departments.js           # API endpoints
├── scripts/
│   └── setup-database.js        # Database setup
├── app.js                       # Express configuration
└── server.js                    # Server entry point
```

## 🔧 Technical Solution

### Concurrency Control
```javascript
// Row-level locking prevents race conditions
const deptResult = await client.query(
  'SELECT * FROM departments WHERE id = $1 FOR UPDATE',
  [id]
);
```

### Key Features
- Database-level row locking (`SELECT FOR UPDATE`)
- Atomic transactions (BEGIN/COMMIT/ROLLBACK)
- Balance constraint (CHECK balance >= 0)
- Complete audit trail

## 📊 Database Schema

### departments
- id (SERIAL PRIMARY KEY)
- name (VARCHAR)
- balance (DECIMAL, CHECK >= 0)
- created_at (TIMESTAMP)

### transactions
- id (SERIAL PRIMARY KEY)
- department_id (FK)
- amount (DECIMAL)
- description (VARCHAR)
- user_name (VARCHAR)
- status (VARCHAR)
- created_at (TIMESTAMP)

## 🎯 API Endpoints

- `GET /api/departments` - List all departments
- `GET /api/departments/:id/transactions` - Get transactions
- `POST /api/departments/:id/pay` - Process payment
- `POST /api/departments/:id/reset` - Reset balance
- `DELETE /api/departments/:id/transactions` - Clear transactions

## 📦 Technologies

- Node.js + Express
- PostgreSQL with pg driver
- CORS enabled
- dotenv for configuration

## 🌐 Frontend

This backend serves: https://github.com/aceanand/wallet-frontend

## 🔐 Environment Variables

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_wallet_db
DB_USER=postgres
DB_PASSWORD=your_password
PORT=5001
```
