
from pydantic import BaseModel
from typing import Optional

class StagingData(BaseModel):
    patient_id: str
    content: str
