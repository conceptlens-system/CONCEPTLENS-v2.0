from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.db.mongodb import get_database
from app.models.schemas import Institution, InstitutionCreate

router = APIRouter()

@router.get("/", response_model=List[Institution])
async def list_institutions():
    db = await get_database()
    cursor = db.institutions.find({})
    insts = await cursor.to_list(100)
    for i in insts:
        i["_id"] = str(i["_id"])
    return insts

@router.post("/", response_model=Institution)
async def create_institution(inst: InstitutionCreate):
    db = await get_database()
    res = await db.institutions.insert_one(inst.dict())
    created = await db.institutions.find_one({"_id": res.inserted_id})
    created["_id"] = str(created["_id"])
    return created
