# CONCEPTLENS - System Design Document

## 1. Architecture Overview
ConceptLens follows a modular architecture separating AI intelligence, workflow orchestration, and user interaction.

### High-Level Components
1.  **Frontend (Teacher Dashboard):** Next.js application for teachers to view insights and validate data.
2.  **Backend (API Service):** FastAPI service handling core logic, authentication, and data access.
3.  **Orchestration (KIRO):** Background job processing system for data ingestion and AI analysis.
4.  **Database:** MongoDB for storing student responses, misconceptions, and user data.
5.  **AI Intelligence Engine (Misconception Engine):** The core intelligence layer of ConceptLens, responsible for transforming raw student responses into validated conceptual insights.

## 2. Tech Stack
- **Frontend:** React / Next.js (App Router), Tailwind CSS
- **Backend:** Python (FastAPI)
- **Database:** MongoDB
- **Orchestration:** KIRO (Internal Module/Worker)
- **AI/ML:** Custom Semantic Analysis & Clustering Engine

## 3. Data Flow

### 3.1 Data Ingestion
1.  **Input:** Student response data (from exams, quizzes, or assessments) is uploaded (CSV/LMS).
2.  **Processing:** Backend validates schema and saves raw responses to `student_responses` collection.
3.  **Trigger:** A "New Data" event triggers the KIRO orchestration pipeline.

### 3.2 Analysis Pipeline (KIRO)
1.  **Fetching:** KIRO fetches un-analyzed incorrect responses.
2.  **Clustering:** The AI Engine vectorizes text and clusters similar wrong answers.
3.  **Drafting:** Identified clusters are saved as `DetectedMisconception` with status `pending`.
4.  **Scoring:** The system calculates the percentage of students affected by each misconception.

### 3.3 Teacher Validation Loop
1.  **Review:** Teachers access the specific dashboard view to see `pending` misconceptions.
2.  **Action:** Teachers approve, rename, or reject the identified clusters.
3.  **Update:** Backend updates the status to `valid` and logs the validation.
4.  **Refinement:** (Optional) The system re-calculates statistics based on validated data.

### 3.4 Analytics & Reporting
1.  **Aggregation:** Backend aggregates data from `misconceptions` and `student_responses`.
2.  **Visualization:** Frontend renders heatmaps, bar charts, and trend reports.

## 4. Database Schema Design (MongoDB)

### Collections
- **`users`**: Stores teacher and admin profiles.
- **`student_responses`**: Raw student answers, including student ID, question ID, and text.
- **`assessments`**: Metadata about exams, questions, and correct answers.
- **`misconceptions`**: The core insight documents containing:
    - Cluster ID
    - Description (Auto-generated or Teacher-edited)
    - Associated Question IDs
    - List of Student Response IDs
    - Status (`pending`, `valid`, `rejected`)
    - Confidence Score

## 5. Security & Scalability
- **Authentication:** JWT-based authentication for API access.
- **Scalability:** Asynchronous processing via KIRO allows handling large batches of assessment data without blocking the UI.
