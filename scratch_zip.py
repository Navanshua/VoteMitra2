import asyncio
import httpx

async def main():
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get("https://api.zippopotam.us/in/700001")
            resp.raise_for_status()
            print(resp.json())
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(main())
