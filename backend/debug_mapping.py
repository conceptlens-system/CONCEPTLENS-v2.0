from app.db.mongodb import get_database, connect_to_mongo
import asyncio

async def report():
    await connect_to_mongo()
    db = await get_database()
    
    # 1. Map Class IDs to Names
    classes = await db.classes.find().to_list(100)
    c_map = {str(c['_id']): f"{c['name']} ({c['class_code']})" for c in classes}
    print("--- CLASSES ---")
    for cid, name in c_map.items():
        print(f"[{cid}] {name}")

    # 2. List Students and their Enrolled Class Names
    print("\n--- STUDENT ENROLLMENTS ---")
    enrollments = await db.class_students.find().to_list(100)
    
    # Group by student
    stu_map = {}
    for e in enrollments:
        sid = e['student_id']
        cid = e['class_id']
        c_name = c_map.get(cid, f"Unknown ID {cid}")
        if sid not in stu_map: stu_map[sid] = []
        stu_map[sid].append(c_name)
        
    for sid, c_names in stu_map.items():
        print(f"Student: {sid}")
        for cn in c_names:
            print(f"  - Joined: {cn}")

    # 3. List Exams and their Assigned Class Names
    print("\n--- EXAMS ---")
    exams = await db.exams.find().sort("created_at", -1).to_list(20)
    for e in exams:
        print(f"Exam: {e['title']} (ID: {e['_id']})")
        assigned_ids = e.get('class_ids', [])
        if not assigned_ids:
            print("  - Assigned to: NONE")
        for cid in assigned_ids:
            c_name = c_map.get(cid, f"Unknown ID {cid}")
            print(f"  - Assigned to: {c_name}")

if __name__ == "__main__":
    asyncio.run(report())
