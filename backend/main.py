import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.api import patients, analyze, chat
from backend.api import live_transcribe
from backend.api import live_clinical_check
import os
import json
import base64
import asyncio
import threading
import queue
import websocket

app = FastAPI(title="Medical Copilot MVP")

# Configuração de CORS para permitir requisições do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router)
app.include_router(analyze.router)
app.include_router(chat.router)
app.include_router(live_transcribe.router)
app.include_router(live_clinical_check.router)

@app.get("/")
def read_root():
    return {"message": "Medical Copilot API is running"}


@app.websocket("/ws/transcribe")
async def ws_transcribe(ws: WebSocket):
    await ws.accept()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        await ws.close(code=1011)
        return
    model = os.getenv("OPENAI_REALTIME_MODEL") or "gpt-4o-realtime-preview-2024-12-17"
    to_openai: queue.Queue[str] = queue.Queue()
    from_openai: queue.Queue[str] = queue.Queue()
    stop_flag = threading.Event()
    session_created = False

    client_meta = {"sample_rate_hz": 16000, "codec": "pcm16", "patient_id": None}
    full_text = ""
    segments_acc: list[dict] = []
    
    def to_segment_dict(s):
        if isinstance(s, dict):
            return {
                "id": s.get("id"),
                "start": s.get("start"),
                "end": s.get("end"),
                "speaker": s.get("speaker"),
                "text": s.get("text"),
                "type": s.get("type"),
            }
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
            return {"text": str(s)}

    def run_openai():
        websocket.enableTrace(True)
        url = "wss://api.openai.com/v1/realtime?intent=transcription"
        headers = [
            f"Authorization: Bearer {api_key}",
            "openai-beta: realtime=v1",
        ]

        def on_open(oaiws):
            print("[OAI] on_open")
            oaiws.send(json.dumps({
                "type": "transcription_session.update",
                "session": {
                    "input_audio_format": "pcm16",
                    "input_audio_transcription": {
                        "model": os.getenv("OPENAI_TRANSCRIBE_MODEL") or "gpt-4o-transcribe",
                        "language": "en"
                    },
                    "input_audio_noise_reduction": {"type": "near_field"},
                    "turn_detection": None
                }
            }))
            print("[OAI] transcription_session.update enviado")

        def on_message(oaiws, message):
            try:
                print("[OAI] on_message:", str(message)[:200])
            except Exception:
                pass
            try:
                from_openai.put(message)
            except Exception:
                pass

        def on_error(oaiws, error):
            try:
                print("[OAI] on_error:", error)
            except Exception:
                pass
            try:
                from_openai.put(json.dumps({"type": "error", "error": str(error)}))
            except Exception:
                pass

        def on_close(oaiws, code, reason):
            try:
                print("[OAI] on_close:", code, reason)
            except Exception:
                pass
            try:
                from_openai.put(json.dumps({"type": "close", "code": code, "reason": reason}))
            except Exception:
                pass

        oaiws = websocket.WebSocketApp(
            url,
            header=headers,
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close,
        )

        def sender():
            while not stop_flag.is_set():
                try:
                    item = to_openai.get(timeout=0.1)
                except queue.Empty:
                    continue
                try:
                    try:
                        print("[OAI-SENDER] Enviando:", str(item)[:120])
                    except Exception:
                        pass
                    oaiws.send(item)
                except Exception as e:
                    try:
                        print("[OAI-SENDER] erro:", e)
                    except Exception:
                        pass
                    try:
                        from_openai.put(json.dumps({"type": "error", "error": str(e)}))
                    except Exception:
                        pass

        t = threading.Thread(target=sender, daemon=True)
        t.start()
        try:
            oaiws.run_forever()
        except Exception as e:
            try:
                print("[OAI] run_forever exception:", e)
            except Exception:
                pass
            try:
                from_openai.put(json.dumps({"type": "error", "error": str(e)}))
            except Exception:
                pass
        stop_flag.set()

    thread = threading.Thread(target=run_openai, daemon=True)
    thread.start()

    try:
        while True:
            try:
                for _ in range(8):
                    try:
                        msg = from_openai.get_nowait()
                    except queue.Empty:
                        break
                    try:
                        print("[MAIN] from_openai:", str(msg)[:200])
                    except Exception:
                        pass
                    try:
                        evt = json.loads(msg)
                    except Exception:
                        evt = None
                    if evt:
                        et = evt.get("type")
                        if et == "transcription_session.created":
                            session_created = True
                        elif et == "transcription_session.updated":
                            session_created = True
                        elif et == "input_audio_buffer.speech_started":
                            await ws.send_text(json.dumps({"type": "speech_started"}))
                        elif et == "input_audio_buffer.speech_stopped":
                            await ws.send_text(json.dumps({"type": "speech_stopped"}))
                        elif et == "conversation.item.input_audio_transcription.delta":
                            d = evt.get("delta") or ""
                            if isinstance(d, str) and d:
                                full_text += d
                                await ws.send_text(json.dumps({
                                    "type": "transcription_update",
                                    "text_delta": d,
                                    "segments": [],
                                    "is_final": False,
                                }))
                        elif et == "conversation.item.input_audio_transcription.completed":
                            tr = evt.get("transcript") or evt.get("text")
                            segs_raw = evt.get("segments") or []
                            segs = [to_segment_dict(s) for s in segs_raw] if isinstance(segs_raw, list) else []
                            if segs:
                                segments_acc.extend(segs)
                            if isinstance(tr, str) and tr:
                                full_text = (full_text + " " + tr).strip() if full_text else tr
                            await ws.send_text(json.dumps({
                                "type": "transcription_update",
                                "text_delta": tr or "",
                                "segments": segs,
                                "is_final": True,
                            }))
                        elif et == "response.delta" or et == "response.output_text.delta":
                            d = evt.get("delta") or (evt.get("output_text", {}).get("delta") if isinstance(evt.get("output_text"), dict) else None)
                            if isinstance(d, str) and d:
                                full_text += d
                                await ws.send_text(json.dumps({
                                    "type": "transcription_update",
                                    "text_delta": d,
                                    "segments": [],
                                    "is_final": False,
                                }))
                        elif et == "response.completed" or et == "response.output_text.done":
                            await ws.send_text(json.dumps({
                                "type": "transcription_complete",
                                "full_text": full_text,
                                "segments": segments_acc,
                            }))
                            full_text = ""
                            segments_acc = []
                        else:
                            pass

                try:
                    data = await asyncio.wait_for(ws.receive_text(), timeout=0.02)
                except asyncio.TimeoutError:
                    data = None

                if data:
                    obj = json.loads(data)
                    typ = obj.get("type")
                    if typ == "init":
                        try:
                            print("[CLIENT] init:", obj)
                        except Exception:
                            pass
                        sr = obj.get("sample_rate_hz") or obj.get("sample_rate")
                        if isinstance(sr, int) and sr > 0:
                            client_meta["sample_rate_hz"] = sr
                        client_meta["codec"] = obj.get("codec") or client_meta["codec"]
                        client_meta["patient_id"] = obj.get("patient_id") or client_meta["patient_id"]
                    elif typ == "input_audio_buffer.append":
                        try:
                            print("[CLIENT] audio chunk, len(b64) =", len(obj.get("audio") or ""))
                        except Exception:
                            pass
                        if not session_created:
                            try:
                                print("[CLIENT] ignorando audio: session_created ainda False")
                            except Exception:
                                pass
                            continue
                        audio_b64 = obj.get("audio") or ""
                        to_openai.put(json.dumps({"type": "input_audio_buffer.append", "audio": audio_b64}))
                    elif typ == "commit":
                        try:
                            print("[CLIENT] commit recebido do frontend")
                        except Exception:
                            pass
                        to_openai.put(json.dumps({"type": "input_audio_buffer.commit"}))
                        to_openai.put(json.dumps({
                            "type": "response.create",
                            "response": {
                                "conversation": "none",
                                "instructions": "Transcreva o último áudio em português.",
                                "input_audio": [{"buffer": "default"}]
                            }
                        }))
                    elif typ == "close":
                        break
            except WebSocketDisconnect:
                break
            except Exception:
                await asyncio.sleep(0.01)
            await asyncio.sleep(0.01)
    finally:
        stop_flag.set()
        try:
            await ws.close()
        except Exception:
            pass


if __name__=="__main__":
    uvicorn.run("main:app",host='127.0.0.1', port=8000)
