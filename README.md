# ConceptLens v2.0 🚀

**AI-Powered Education Platform for Modern Assessments**

ConceptLens is an advanced education platform designed to help professors create exams, analyze student performance, and detect learning misconceptions using AI. It bridges the gap between assessment and understanding with intuitive dashboards and scalable architecture.

## 🌟 Key Features

-   **AI Exam Generation**: Generate exams instantly from syllabus topics using Gemini AI.
-   **Misconception Analysis**: Deep dive into student performance to identify learning gaps.
-   **Secure Assessments**: Configurable anti-cheat mechanisms (tab-switch detection, fullscreen enforcement).
-   **Role-Based Dashboards**: tailored interfaces for Professors and Students.
-   **Real-time Analytics**: Insights into class performance, topic mastery, and more.

## 🛠️ Tech Stack

-   **Frontend**: Next.js 14, React, Tailwind CSS, Shadcn UI
-   **Backend**: Python (FastAPI), MongoDB, Motor (Async Driver)
-   **AI Integration**: Google Gemini Pro (via `google-generativeai`)
-   **Database**: MongoDB Atlas

---

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### Prerequisites

-   **Node.js** (v18 or higher)
-   **Python** (v3.9 or higher)
-   **MongoDB Atlas Account** (for database)

### 1. Clone the Repository

```bash
git clone https://github.com/conceptlens-system/CONCEPTLENS-v2.0.git
cd CONCEPTLENS-v2.0
```

### 2. Backend Setup (FastAPI)

Navigate to the project root (where `main.py` is located).

1.  **Create a Virtual Environment**:
    ```bash
    python -m venv venv
    
    # Activate on Windows:
    .\venv\Scripts\activate
    
    # Activate on Mac/Linux:
    source venv/bin/activate
    ```

2.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Run the Backend Server**:
    ```bash
    uvicorn main:app --reload
    ```
    The backend will start at `http://127.0.0.1:8000`.

### 3. Frontend Setup (Next.js)

Open a new terminal and navigate to the `frontend` directory.

1.  **Navigate to Frontend**:
    ```bash
    cd frontend
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Run the Frontend Development Server**:
    ```bash
    npm run dev
    ```
    The application will start at `http://localhost:3000`.

---

## 🧪 Running the Project

1.  Ensure your **MongoDB** database is running and the connection string in `.env` is correct.
2.  Start the **Backend** (`uvicorn main:app --reload`).
3.  Start the **Frontend** (`npm run dev`).
4.  Open your browser and visit `http://localhost:3000`.

## 📂 Project Structure

-   `backend/`: FastAPI application, API endpoints, and database logic.
-   `frontend/`: Next.js application, React components, and pages.
-   `scripts/`: Utility scripts for data seeding and debugging.

## 🤝 Contributing

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature`).
3.  Commit your changes.
4.  Push to the branch.
5.  Open a Pull Request.

---

**Developed by the ConceptLens Team**
