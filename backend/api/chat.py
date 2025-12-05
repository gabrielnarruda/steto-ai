
from fastapi import APIRouter, Body
from backend.services import copilot_service, prontuario_service

router = APIRouter(prefix="/copilot", tags=["chat"])

@router.post("/chat")
def chat(patient_id: str = Body(...), question: str = Body(...)):
    prontuario = prontuario_service.get_prontuario(patient_id) or ""
    response = copilot_service.chat_response(question, prontuario)
    return {"response": response}
