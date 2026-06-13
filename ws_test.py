import asyncio
import websockets
import json
import urllib.request
import time

def create_batch():
    req = urllib.request.Request("http://127.0.0.1:8000/ocr/batches", data=b'{"total_files": 2}', headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read())["batch_uuid"]

async def test_ws():
    batch_uuid = create_batch()
    print(f"Created batch {batch_uuid}")
    uri = f"ws://127.0.0.1:8000/ocr/batches/{batch_uuid}/ws"
    async with websockets.connect(uri) as websocket:
        print("Connected")
        msg = await websocket.recv()
        print(f"Received: {msg}")

if __name__ == "__main__":
    asyncio.run(test_ws())
