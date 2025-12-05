
from fastapi import APIRouter, HTTPException
from typing import List
from backend.models.patient import Patient
from backend.models.staging import StagingData
from backend.services import prontuario_service, staging_service

router = APIRouter(prefix="/patients", tags=["patients"])

@router.get("/", response_model=List[Patient])
def get_patients():
    """Get list of all patients."""
    return prontuario_service.list_patients()

@router.get("/{patient_id}/files")
def get_patient_files(patient_id: str):
    """Get file tree structure for a patient."""
    tree = prontuario_service.get_patient_file_tree(patient_id)
    if tree is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return tree

@router.get("/{patient_id}/file")
def get_patient_file(patient_id: str, path: str):
    """Get content of a specific file."""
    content = prontuario_service.get_file_content(patient_id, path)
    if content is None:
        raise HTTPException(status_code=404, detail="File not found")
    return {"path": path, "content": content}

@router.get("/{patient_id}/prontuario")
def get_patient_prontuario(patient_id: str):
    """Get prontuario content."""
    content = prontuario_service.get_prontuario(patient_id)
    if content is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"content": content}

@router.get("/{patient_id}/staging")
def get_patient_staging(patient_id: str):
    """Get staging content."""
    content = staging_service.get_staging(patient_id)
    return {"content": content}

@router.post("/{patient_id}/staging")
def update_patient_staging(patient_id: str, data: StagingData):
    """Update staging content."""
    staging_service.update_staging(patient_id, data.content)
    return {"status": "success"}

@router.delete("/{patient_id}/staging")
def clear_patient_staging(patient_id: str):
    """Clear staging content."""
    staging_service.clear_staging(patient_id)
    return {"status": "success"}

@router.post("/{patient_id}/prontuario/append")
def append_to_prontuario(patient_id: str, data: StagingData):
    """Append content to prontuario."""
    success = prontuario_service.append_to_prontuario(patient_id, data.content)
    if not success:
        raise HTTPException(status_code=404, detail="Patient not found")
    staging_service.clear_staging(patient_id)
    return {"status": "success"}
