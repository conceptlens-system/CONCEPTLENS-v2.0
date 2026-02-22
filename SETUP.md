# CONCEPTLENS Setup Guide

Welcome to the **CONCEPTLENS** project! This guide will help you set up the development environment and run the application locally.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

-   [Git](https://git-scm.com/downloads)
-   [Python 3.10+](https://www.python.org/downloads/)
-   [Node.js (LTS version)](https://nodejs.org/)
-   [MongoDB Compass](https://www.mongodb.com/try/download/compass) (Optional, for viewing database)

## 1. Clone the Repository

Open your terminal or command prompt and run:

```bash
git clone https://github.com/conceptlens-system/CONCEPTLENS-v1.0.git
cd CONCEPTLENS-v1.0
```

## 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

### Create Virtual Environment

It's recommended to use a virtual environment to manage Python dependencies.

**Windows:**
```powershell
python -m venv venv
.\venv\Scripts\activate
```

**macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Configure Environment Variables

1.  Copy the example environment file:
    ```bash
    cp .env.example .env
    # On Windows PowerShell: copy .env.example .env
    ```
2.  Open `.env` and update `MONGODB_URL` with your MongoDB connection string.

### Run the Backend Server

```bash
uvicorn app.main:app --reload
```

The backend server will start at `http://127.0.0.1:8000`. API docs are available at `http://127.0.0.1:8000/docs`.

---

## 3. Frontend Setup

Open a new terminal window and navigate to the frontend directory:

```bash
cd frontend
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

1.  Copy the example environment file:
    ```bash
    cp .env.local.example .env.local
    # On Windows PowerShell: copy .env.local.example .env.local
    ```
2.  Open `.env.local` and update the following:
    -   `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID
    -   `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret
    -   `NEXTAUTH_SECRET`: A random string for security

### Run the Frontend Development Server

```bash
npm run dev
```

The frontend application will start at `http://localhost:3000`.

## Troubleshooting

-   **Backend 500 Errors:** Check the terminal running the backend for detailed error logs.
-   **Database Connection Issues:** Ensure your MongoDB URL is correct and your IP address is whitelisted in MongoDB Atlas.
-   **CORS Errors:** Ensure the backend is running and the `ForceCORSMiddleware` is active (it is by default in development).
