
from typing import Dict, Optional
from backend.models.staging import StagingData

# In-memory storage for MVP
# Structure: {patient_id: content}
_staging_db: Dict[str, str] = {}

def get_staging(patient_id: str) -> str:
    return _staging_db.get(patient_id, "")

def update_staging(patient_id: str, content: str):
    _staging_db[patient_id] = content

def clear_staging(patient_id: str):
    if patient_id in _staging_db:
        del _staging_db[patient_id]
