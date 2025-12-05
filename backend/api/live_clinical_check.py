from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from openai import OpenAI
import os
import json

class LiveClinicalCheckRequest(BaseModel):
    patient_id: str
    prontuario: str
    transcript_partial: str

class CriticalAlert(BaseModel):
    title: str
    reasoning: str
    evidence_from_transcript: str
    urgency_level: str
    recommended_actions: List[str]

class LiveClinicalCheckResponse(BaseModel):
    critical_alerts: List[CriticalAlert]
    missing_questions: List[str]
    recommended_conducts: List[str]

router = APIRouter(prefix="/api", tags=["live_clinical"])

SYSTEM_PROMPT = (
    "Você é um sistema de SEGURANÇA CLÍNICA EM TEMPO REAL para consultas médicas.\n"
    "Sua função: detectar diagnósticos diferenciais graves (cannot-miss), bandeiras vermelhas\n"
    "e condutas imediatas sugeridas, com foco em evitar erro diagnóstico.\n\n"
    "Regras:\n"
    "- Use somente o que está no prontuário e na transcrição.\n"
    "- Não invente dados.\n"
    "- Não feche diagnóstico: fale em 'hipóteses' e 'risco de'.\n"
    "- Seja conciso.\n"
    "- Sempre responda em JSON estrito, sem texto fora do JSON.\n"
    "- urgência_level: \"vermelho\", \"amarelo\" ou \"verde\".\n\n"
    "Campos do JSON:\n\n"
    "{\n"
    "  \"critical_alerts\": [\n"
    "    {\n"
    "      \"title\": \"\",\n"
    "      \"reasoning\": \"\",\n"
    "      \"evidence_from_transcript\": \"\",\n"
    "      \"urgency_level\": \"vermelho|amarelo|verde\",\n"
    "      \"recommended_actions\": []\n"
    "    }\n"
    "  ],\n"
    "  \"missing_questions\": [],\n"
    "  \"recommended_conducts\": []\n"
    "}\n"
)

def build_user_message(req: LiveClinicalCheckRequest) -> str:
    return (
        "[PRONTUARIO]\n" + req.prontuario + "\n\n"
        + "[TRANSCRICAO_PARCIAL]\n" + req.transcript_partial + "\n\n"
        + f"Tarefa: avaliar segurança clínica da consulta em andamento para o paciente {req.patient_id}.\n"
    )

@router.post("/live-clinical-check", response_model=LiveClinicalCheckResponse)
async def live_clinical_check(payload: LiveClinicalCheckRequest):
    # if len(payload.transcript_partial.strip()) < 30:
    #     return LiveClinicalCheckResponse(
    #         critical_alerts=[],
    #         missing_questions=[],
    #         recommended_conducts=[],
    #     )

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set")

    max_chars = int(os.getenv("LIVE_CLINICAL_MAX_CHARS", "10000"))
    prontuario = payload.prontuario[-max_chars:]
    transcript = payload.transcript_partial[-max_chars:]
    req = LiveClinicalCheckRequest(
        patient_id=payload.patient_id,
        prontuario=prontuario,
        transcript_partial=transcript,
    )

    try:
        client = OpenAI(api_key=api_key)
        completion = client.chat.completions.create(
            model=os.getenv("OPENAI_CLINICAL_MODEL") or "gpt-4.1-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": build_user_message(req)},
            ],
            response_format={"type": "json_object"},
        )
        raw = completion.choices[0].message.content
        data = json.loads(raw)
        alerts = data.get("critical_alerts") or []
        missing = data.get("missing_questions") or []
        conducts = data.get("recommended_conducts") or []
        return LiveClinicalCheckResponse(
            critical_alerts=[CriticalAlert(**a) for a in alerts],
            missing_questions=missing,
            recommended_conducts=conducts,
        )
    except Exception as e:
        print("live_clinical_check error:", e)
        raise HTTPException(status_code=500, detail="Erro na análise clínica em tempo real")

