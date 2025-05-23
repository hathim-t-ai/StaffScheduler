import httpx
import asyncio
import sys
import traceback

async def test():
    try:
        async with httpx.AsyncClient() as client:
            print("Sending request...")
            resp = await client.post('http://localhost:8000/orchestrate', 
                                json={'query': 'test', 'mode': 'agent'})
            print(f"Status code: {resp.status_code}")
            print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Exception: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test()) 