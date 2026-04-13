from app.database import SessionLocal
from app.main import esg_predict_net_zero
import asyncio

async def test():
    db = SessionLocal()
    # pass a mock project_id 1
    res = await esg_predict_net_zero(project_id=1, current_user={"email":"test@test.com"}, db=db)
    print(res)

asyncio.run(test())
