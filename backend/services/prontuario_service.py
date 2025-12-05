
import os
from typing import List, Optional, Dict, Any
from backend.models.patient import Patient

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "patients")

def list_patients() -> List[Patient]:
    """List all patients from the data directory."""
    patients = []
    if not os.path.exists(DATA_DIR):
        return []
    
    for folder_name in os.listdir(DATA_DIR):
        folder_path = os.path.join(DATA_DIR, folder_name)
        if os.path.isdir(folder_path):
            prontuario_path = os.path.join(folder_path, "Prontuario.md")
            name = "Unknown"
            if os.path.exists(prontuario_path):
                with open(prontuario_path, "r", encoding="utf-8") as f:
                    first_line = f.readline().strip()
                    if first_line.startswith("# Prontuário - "):
                        name_part = first_line.replace("# Prontuário - ", "")
                        name = name_part.split("(")[0].strip()
            
            patients.append(Patient(id=folder_name, name=name, age=0, gender="Unknown"))
            
    return patients

def get_patient_file_tree(patient_id: str) -> Optional[Dict[str, Any]]:
    """Get the file tree structure for a patient."""
    patient_dir = os.path.join(DATA_DIR, patient_id)
    if not os.path.exists(patient_dir):
        return None
    
    def build_tree(path: str, name: str) -> Dict[str, Any]:
        """Recursively build file tree."""
        if os.path.isfile(path):
            return {
                "name": name,
                "type": "file",
                "path": os.path.relpath(path, patient_dir).replace("\\", "/")
            }
        else:
            children = []
            try:
                for item in os.listdir(path):
                    item_path = os.path.join(path, item)
                    children.append(build_tree(item_path, item))
            except PermissionError:
                pass
            
            return {
                "name": name,
                "type": "folder",
                "path": os.path.relpath(path, patient_dir).replace("\\", "/"),
                "children": children
            }
    
    return build_tree(patient_dir, patient_id)

def get_file_content(patient_id: str, file_path: str) -> Optional[str]:
    """Get content of a specific file within a patient's directory."""
    full_path = os.path.join(DATA_DIR, patient_id, file_path)
    
    # Security check: ensure the path is within the patient directory
    if not os.path.abspath(full_path).startswith(os.path.abspath(os.path.join(DATA_DIR, patient_id))):
        return None
    
    if os.path.exists(full_path) and os.path.isfile(full_path):
        try:
            with open(full_path, "r", encoding="utf-8") as f:
                return f.read()
        except:
            return None
    return None

def get_prontuario(patient_id: str) -> Optional[str]:
    """Get prontuario content for a patient."""
    return get_file_content(patient_id, "Prontuario.md")

def append_to_prontuario(patient_id: str, content: str) -> bool:
    """Append content to a patient's prontuario."""
    path = os.path.join(DATA_DIR, patient_id, "Prontuario.md")
    if os.path.exists(path):
        with open(path, "a", encoding="utf-8") as f:
            f.write(f"\n\n{content}")
        return True
    return False
