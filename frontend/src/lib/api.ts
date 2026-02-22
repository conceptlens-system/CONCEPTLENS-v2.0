const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function fetchStats() {
    const res = await fetch(`${API_URL}/analytics/dashboard/stats`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status} ${res.statusText}`);
    return res.json();
}

export async function fetchMisconceptions(status: string = "pending") {
    const res = await fetch(`${API_URL}/analytics/misconceptions?status=${status}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch misconceptions: ${res.status} ${res.statusText}`);
    return res.json();
}

// Participation
export const fetchExamParticipation = async (token: string, examId: string) => {
    try {
        const response = await fetch(`${API_URL}/analytics/exams/${examId}/participation`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Failed to fetch participation");
        return await response.json();
    } catch (error) {
        console.error("Error fetching participation:", error);
        return { total_assigned: 0, total_attempted: 0, non_attempted: [] };
    }
};

export async function fetchGroupedMisconceptions(status: string = "valid", token: string, examId?: string) {
    let url = `${API_URL}/analytics/misconceptions/grouped?status=${status}`;
    if (examId) url += `&exam_id=${examId}`;

    const res = await fetch(url, {
        cache: 'no-store',
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Failed to fetch grouped misconceptions: ${res.status} ${res.statusText}`);
    return res.json();
}

export async function updateMisconceptionStatus(id: string, status: string, token: string) {
    const res = await fetch(`${API_URL}/analytics/misconceptions/${id}/status`, {
        method: 'PUT',
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error(`Failed to update status`);
    return res.json();
}

export async function fetchTrends(token: string) {
    console.log("Fetching trends from:", `${API_URL}/analytics/reports/trends`);
    const res = await fetch(`${API_URL}/analytics/reports/trends`, {
        cache: 'no-store',
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Failed to fetch trends`);
    return res.json();
}


export async function fetchAssessmentSummaries(token: string) {
    const res = await fetch(`${API_URL}/analytics/assessments`, {
        cache: 'no-store',
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch assessment summaries");
    return res.json();
}

export async function fetchMisconception(id: string) {
    const res = await fetch(`${API_URL}/analytics/misconceptions/${id}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch detail: ${res.status} ${res.statusText}`);
    return res.json();
}

export async function generateRemediationPlan(id: string, token: string) {
    const res = await fetch(`${API_URL}/analytics/misconceptions/${id}/remediation-plan`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Failed to generate remediation plan`);
    return res.json();
}

export async function askMisconceptionAI(id: string, message: string, token: string) {
    const res = await fetch(`${API_URL}/analytics/misconceptions/${id}/chat`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
    });
    if (!res.ok) throw new Error(`Failed to chat`);
    return res.json();
}

export async function downloadExamPdf(examId: string, token: string) {
    const res = await fetch(`${API_URL}/analytics/exams/${examId}/pdf-report`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Failed to generate PDF`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Exam_Report_${examId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

export async function validateMisconception(id: string, action: "approve" | "reject" | "rename" | "prioritize" | "deprioritize", label?: string) {
    const res = await fetch(`${API_URL}/teacher/misconceptions/${id}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, new_label: label }),
    });
    if (!res.ok) throw new Error(`Validation failed: ${res.status} ${res.statusText}`);
    return res.json();
}

export async function ingestResponses(data: any[]) {
    // data is list of { student_id, question_id, response_text, assessment_id }
    const res = await fetch(`${API_URL}/ingest/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Ingestion failed: ${res.status} ${res.statusText}`);
    return res.json();
}

export async function fetchSubjects(token: string) {
    const res = await fetch(`${API_URL}/subjects/`, {
        cache: 'no-store',
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Failed to fetch subjects: ${res.status} ${res.statusText}`);
    return res.json();
}

export async function createSubject(name: string, token: string, semester?: string, branches: string[] = [], sections: string[] = [], syllabus: any[] = []) {
    const res = await fetch(`${API_URL}/subjects/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name, semester, branches, sections, syllabus }),
    });
    if (!res.ok) throw new Error(`Failed to create subject: ${res.status} ${res.statusText}`);
    return res.json();
}

export async function updateSyllabus(subjectId: string, syllabus: any[], token: string) {
    const res = await fetch(`${API_URL}/subjects/${subjectId}/syllabus`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(syllabus),
    });
    if (!res.ok) throw new Error(`Failed to update syllabus: ${res.status} ${res.statusText}`);
    return res.json();
}

export async function updateSubjectMetadata(subjectId: string, updates: { name?: string, semester?: string, branches?: string[], sections?: string[] }, token: string) {
    const res = await fetch(`${API_URL}/subjects/${subjectId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update subject metadata");
    return res.json();
}

export async function deleteSubject(subjectId: string, token: string) {
    const res = await fetch(`${API_URL}/subjects/${subjectId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Failed to delete subject: ${res.status} ${res.statusText}`);
    return res.json();
}

export async function fetchExams(token: string) {
    const res = await fetch(`${API_URL}/exams/`, {
        cache: 'no-store',
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) {
        throw new Error(`Failed to fetch exams: ${res.status} ${res.statusText}`);
    }
    return res.json();
}

export async function createExam(examData: any, token: string) {
    console.log("------------------------------------------");
    console.log("🚀 CREATE EXAM DEBUGGER");
    console.log("API_URL:", API_URL);
    console.log("Token:", token ? `Yes (len: ${token.length})` : "MISSING/NULL");
    console.log("Method:", "POST");

    // Safeguard: Deep Clean Payload
    const payload = JSON.parse(JSON.stringify(examData));

    // Remove top-level system fields
    if (payload._id) delete payload._id;
    if (payload.id) delete payload.id;
    if (payload.created_at) delete payload.created_at;
    if (payload.updated_at) delete payload.updated_at;

    // Clean questions
    if (payload.questions && Array.isArray(payload.questions)) {
        payload.questions = payload.questions.map((q: any) => {
            const cleanQ = { ...q };
            if (cleanQ._id) delete cleanQ._id; // Remove Mongo ID if present
            // Ensure ID exists (but only client-side ID)
            if (!cleanQ.id) cleanQ.id = `q_${Math.random().toString(36).substr(2, 9)}`;
            return cleanQ;
        });
    }

    console.log("Sanitized Payload:", JSON.stringify(payload, null, 2));

    // Proxy Change: Call Next.js API route instead of direct Backend URL
    // This avoids CORS because browser -> Next.js (Same Origin) -> Backend (Server-to-Server)
    console.log(`📤 Front-end Fetch sending token: ${token ? 'YES' : 'NO'} (Length: ${token?.length || 0})`);

    const res = await fetch("/api/exams", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("❌ CREATE EXAM FAILED:", errorData);
        throw new Error(errorData.detail || errorData.error || "Failed to create exam");
    }

    return res.json();
}


export async function fetchExam(id: string) {
    const res = await fetch(`${API_URL}/exams/${id}`, { cache: 'no-store' });
    if (!res.ok) throw new Error("Failed to fetch exam");
    return res.json();
}

export async function updateExam(id: string, examData: any, token: string) {
    const res = await fetch(`${API_URL}/exams/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(examData),
    });
    if (!res.ok) throw new Error("Failed to update exam");
    return res.json();
}



export async function deleteExam(id: string, token: string) {
    const res = await fetch(`${API_URL}/exams/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to delete exam");
    return res.json();
}

export async function fetchExamStudents(id: string, token: string) {
    const res = await fetch(`${API_URL}/exams/${id}/students`, {
        cache: 'no-store',
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch students");
    return res.json();
}

export async function validateExam(id: string, isValidated: boolean, token: string) {
    const res = await fetch(`${API_URL}/exams/${id}/validate`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ is_validated: isValidated }),
    });
    if (!res.ok) throw new Error("Failed to update validation status");
    return res.json();
}

export async function publishResults(examId: string, token: string) {
    const res = await fetch(`${API_URL}/exams/${examId}/publish`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to publish results");
    return res.json();
}

export async function fetchExamStudentsScores(id: string, token: string) {
    const res = await fetch(`${API_URL}/exams/${id}/students_scores`, {
        cache: 'no-store',
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch student scores");
    return res.json();
}
// --- Class Management ---

export async function fetchClasses(token: string) {
    const res = await fetch(`${API_URL}/classes/`, {
        cache: 'no-store',
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Failed to fetch classes");
    }
    return res.json();
}

export async function deleteClass(classId: string, token: string) {
    const res = await fetch(`${API_URL}/classes/${classId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to delete class");
    return res.json();
}

export async function createClass(data: any, token: string) {
    const res = await fetch(`${API_URL}/classes/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Failed to create class");
    }
    return res.json();
}

export async function updateClass(classId: string, data: any, token: string) {
    const res = await fetch(`${API_URL}/classes/${classId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Failed to update class");
    }
    return res.json();
}

export async function joinClass(classCode: string, token: string) {
    const res = await fetch(`${API_URL}/classes/join`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ class_code: classCode }),
    });
    const data = await res.json().catch(() => ({ detail: res.statusText }));
    if (!res.ok) throw new Error(data.detail || "Failed to join class");
    return data;
}

export async function fetchClassRequests(classId: string, token: string) {
    const res = await fetch(`${API_URL}/classes/${classId}/requests`, {
        cache: 'no-store',
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch requests");
    return res.json();
}

export async function approveClassRequest(classId: string, requestId: string, token: string) {
    const res = await fetch(`${API_URL}/classes/${classId}/requests/${requestId}/approve`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to approve request");
    return res.json();
}

export async function rejectClassRequest(classId: string, requestId: string, token: string) {
    const res = await fetch(`${API_URL}/classes/${classId}/requests/${requestId}/reject`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to reject request");
    return res.json();
}

export async function fetchClass(classId: string, token: string) {
    const res = await fetch(`${API_URL}/classes/${classId}`, {
        cache: 'no-store',
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch class details");
    return res.json();
}

export async function fetchClassStudents(classId: string, token: string) {
    const res = await fetch(`${API_URL}/classes/${classId}/students`, {
        cache: 'no-store',
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch class students");
    return res.json();
}

export async function removeStudentFromClass(classId: string, studentId: string, token: string) {
    const res = await fetch(`${API_URL}/classes/${classId}/students/${studentId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to remove student");
    return res.json();
}

export async function createAnnouncement(classId: string, title: string, content: string, token: string) {
    const res = await fetch(`${API_URL}/classes/${classId}/announcements`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ title, content }),
    });
    if (!res.ok) throw new Error("Failed to create announcement");
    return res.json();
}

export async function fetchAnnouncements(classId: string, token: string) {
    const res = await fetch(`${API_URL}/classes/${classId}/announcements`, {
        cache: 'no-store',
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch announcements");
    return res.json();
}

export async function fetchMyResult(examId: string, token: string) {
    const res = await fetch(`${API_URL}/exams/${examId}/my_result`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch result");
    return res.json();
}
// --- Notifications ---
export async function fetchNotifications(token: string) {
    const res = await fetch(`${API_URL}/notifications/`, {
        cache: 'no-store',
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch notifications");
    return res.json();
}

export async function markNotificationRead(id: string, token: string) {
    const res = await fetch(`${API_URL}/notifications/${id}/read`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to mark as read");
    return res.json();
}

export async function markAllNotificationsRead(token: string) {
    const res = await fetch(`${API_URL}/notifications/read-all`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to mark all as read");
    return res.json();
}

export async function deleteNotification(id: string, token: string) {
    const res = await fetch(`${API_URL}/notifications/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    })
    if (!res.ok) throw new Error("Failed to delete notification");
    return res.json();
}

// --- Professor Onboarding (Admin) ---

export async function fetchProfessorRequests() {
    const res = await fetch(`${API_URL}/professors/requests`, { cache: 'no-store' });
    if (!res.ok) throw new Error("Failed to fetch requests");
    return res.json();
}

export async function approveProfessorRequest(id: string) {
    const res = await fetch(`${API_URL}/professors/requests/${id}/approve`, {
        method: "POST",
    });
    if (!res.ok) throw new Error("Failed to approve");
    return res.json();
}

// --- Institutes & Onboarding ---

export async function fetchInstitutes() {
    const res = await fetch(`${API_URL}/institutes/`, { cache: 'no-store' });
    if (!res.ok) throw new Error("Failed to fetch institutes");
    return res.json();
}

export async function fetchProfessors() {
    const res = await fetch(`${API_URL}/professors/`, { cache: 'no-store' });
    if (!res.ok) throw new Error("Failed to fetch professors");
    return res.json();
}

export async function createProfessor(data: any) {
    const res = await fetch(`${API_URL}/professors/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Failed to create professor");
    }
    return res.json();
}

export async function deleteProfessor(id: string) {
    const res = await fetch(`${API_URL}/professors/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete professor");
    return res.json();
}

// --- User Profiles ---

export async function fetchUserProfile(token: string) {
    const res = await fetch(`${API_URL}/auth/profile/me`, {
        cache: 'no-store',
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch profile");
    return res.json();
}

export async function updateUserProfile(data: any, token: string) {
    const res = await fetch(`${API_URL}/auth/profile`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Failed to update profile");
    }
    return res.json();
}

export async function fetchPublicProfile(userId: string, token: string) {
    const res = await fetch(`${API_URL}/auth/profile/${userId}`, {
        cache: 'no-store',
        headers: { "Authorization": `Bearer ${token}` }
    });
    return res.json();
}

export async function changePassword(data: any, token: string) {
    const res = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Failed to change password");
    }
    return res.json();
}

export async function generateExam(subjectId: string, count: number, difficulty: string, token: string, units?: string[]) {
    const res = await fetch(`${API_URL}/ai-exams/generate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ subject_id: subjectId, question_count: count, difficulty, units })
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to generate exam");
    }
    return res.json();
}
