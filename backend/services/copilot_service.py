import json
import os
import time
from fastapi import HTTPException
from typing import Dict, Any
from openai import OpenAI

def analyze_text(text: str) -> Dict[str, Any]:
    # MOCK IMPLEMENTATION
    # In a real scenario, this would send text to OpenAI GPT-4
    
    # Simulate processing time
    time.sleep(1)
    
    return {
        "alerts": [
            {"type": "warning", "message": "Paciente hipertenso - monitorar PA."},
            {"type": "info", "message": "Vacinação contra gripe pendente."}
        ],
        "suggestions": [
            {"id": "sug_1", "text": "Solicitar hemograma completo."},
            {"id": "sug_2", "text": "Prescrever AAS 100mg."}
        ]
    }

def build_user_message(question: str, context: str) -> str:
    prontuario_texto = context.strip() if context else "Nenhum prontuário disponível."

    return f"""
Aqui está o prontuário completo do paciente:

--------------------------------
{prontuario_texto}
--------------------------------

Pergunta do médico:
{question}

Com base no prontuário e na pergunta acima, forneça apenas uma resposta textual, clara e objetiva.
"""

def chat_response(question: str, context: str) -> str:
    SYSTEM_PROMPT = """
    Você é um assistente médico que analisa o prontuário e responde perguntas sobre o paciente.
    Seu papel é auxiliar o médico, explicando seu raciocínio clínico de forma clara, objetiva e segura.
    Responda sempre em texto normal, sem JSON, sem listas obrigatórias, sem estrutura fixa.

    Regras:
    - Use apenas informações presentes no prontuário ou lógica clínica de alto nível.
    - Se faltar informação, diga explicitamente.
    - Seja claro e técnico, mas compreensível.
    - NÃO invente dados clínicos.
    - NÃO forneça diagnósticos fechados, apenas hipóteses e raciocínio.
    - Responda sempre como texto corrido.
    """

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY não definido")

    client = OpenAI(api_key=api_key)

    user_message = build_user_message(question, context)

    try:
        completion = client.chat.completions.create(
            model=os.getenv("OPENAI_CLINICAL_MODEL") or "gpt-4.1-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
        )

        resposta = completion.choices[0].message.content
        return resposta

    except Exception as e:
        print("Erro no agente clínico:", e)
        raise HTTPException(status_code=500, detail="Erro na análise clínica")
