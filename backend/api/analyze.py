
from fastapi import APIRouter, Body
from backend.services import copilot_service, prontuario_service, staging_service

router = APIRouter(prefix="/patients", tags=["analyze"])

@router.post("/{patient_id}/analyze")
def analyze_patient(patient_id: str):
    prontuario = prontuario_service.get_prontuario(patient_id) or ""
    staging = staging_service.get_staging(patient_id)
    
    full_text = prontuario + "\n\n---\n\n" + staging
    
    result = copilot_service.analyze_text(full_text)
    return result

@router.post("/{patient_id}/suggestions/{suggestion_id}/accept")
def accept_suggestion(patient_id: str, suggestion_id: str, suggestion_text: str = Body(..., embed=True)):
    # Append suggestion to staging
    current_staging = staging_service.get_staging(patient_id)
    if current_staging:
        new_content = current_staging + "\n\n" + suggestion_text
    else:
        new_content = suggestion_text
        
    staging_service.update_staging(patient_id, new_content)
    return {"status": "success"}
