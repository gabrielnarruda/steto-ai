
from pydantic import BaseModel
from typing import List, Optional

class Patient(BaseModel):
    id: str
    name: str
    age: int
    gender: str
