from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.routes import prescription, scans, interactions, drug_chat, analytics, share

app = FastAPI(title="Prescription AI Co-Worker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prescription.router, prefix="/api")
app.include_router(scans.router, prefix="/api")
app.include_router(interactions.router, prefix="/api")
app.include_router(drug_chat.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(share.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
