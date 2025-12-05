from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from openai import OpenAI
import os

router = APIRouter(prefix="/api/transcribe-legacy", tags=["transcribe", "legacy"])

@router.post("/live")
async def transcribe_live_chunk(file: UploadFile = File(...)):
    try:
        if file is None:
            raise HTTPException(status_code=400, detail="Missing 'file' in multipart form-data")

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set")

        file_bytes = await file.read()
        client = OpenAI(api_key=api_key)

        # Call diarization transcription
        # SDK expects a tuple: (filename, file_bytes, content_type)
        resp = client.audio.transcriptions.create(
            file=(file.filename or "chunk.webm", file_bytes, file.content_type or "audio/webm"),
            model="gpt-4o-transcribe-diarize",
            response_format="diarized_json",
        )

        # Normaliza resposta para tipos JSON-serializáveis
        text = getattr(resp, "text", None) or (resp.get("text") if isinstance(resp, dict) else None) or ""
        segments_raw = getattr(resp, "segments", None) or (resp.get("segments") if isinstance(resp, dict) else None) or []

        def _to_segment_dict(s):
            if isinstance(s, dict):
                return s
            try:
                return {
                    "id": getattr(s, "id", None),
                    "start": getattr(s, "start", None),
                    "end": getattr(s, "end", None),
                    "speaker": getattr(s, "speaker", None),
                    "text": getattr(s, "text", None),
                    "type": getattr(s, "type", None),
                }
            except Exception:
                for attr in ("dict", "model_dump", "__dict__"):
                    try:
                        converter = getattr(s, attr, None)
                        if callable(converter):
                            return converter()
                        if isinstance(converter, dict):
                            return converter
                    except Exception:
                        pass
                return str(s)

        segments = []
        if isinstance(segments_raw, list):
            segments = [_to_segment_dict(seg) for seg in segments_raw]
        elif isinstance(segments_raw, dict):
            segments = [segments_raw]
        else:
            segments = []

        print(f'>>>>>>>>>>>{text}')

        return JSONResponse({"text": text, "segments": segments})
    except HTTPException as e:
        raise e
    except Exception as e:
        # Keep recording even if chunk fails: return error JSON
        return JSONResponse({"error": str(e)}, status_code=500)
