import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient('mongodb+srv://prathamdarji15122_db_user:pd%409173312623@cluster0.j265yzh.mongodb.net/conceptlens?appName=Cluster0')
    db = client['conceptlens']
    
    await db.users.update_one({'email': 'aryan@gmail.com'}, {'$set': {'points': 850}})
    await db.users.update_one({'email': 'hetkikani880@gmail.com'}, {'$set': {'points': 1240}})
    await db.users.update_one({'email': 'nikhilkoladia@gmail.com'}, {'$set': {'points': 920}})
    await db.users.update_one({'email': 'a_stu@gmail.com'}, {'$set': {'points': 450}})
    await db.users.update_one({'email': 'b_stu@gmail.com'}, {'$set': {'points': 300}})
    
    print('Points updated!')

asyncio.run(main())
