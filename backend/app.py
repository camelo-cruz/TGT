from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI()

# Mount the compiled frontend
app.mount("/frontend", StaticFiles(directory="../frontend/dist"), name="frontend")

@app.get("/")
def serve_index():
    return FileResponse("../frontend/dist/index.html")
