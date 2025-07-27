from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import os
import uuid
import subprocess
import json
import shutil
import time
import glob


app = FastAPI()

# Configuração CORS para permitir requisições do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pasta para salvar arquivos temporários e resultados
TEMP_DIR = "temp_files"
os.makedirs(TEMP_DIR, exist_ok=True)



# Verifica se o auto-editor está instalado
if not shutil.which("auto-editor"):
    print("AVISO: auto-editor não encontrado no PATH. Certifique-se de que está instalado.")

# Verifica se o ffmpeg está instalado
def get_ffmpeg_path():
    """Tenta encontrar o FFmpeg no sistema"""
    # Primeiro tenta o PATH normal
    ffmpeg_path = shutil.which("ffmpeg")
    if ffmpeg_path:
        return ffmpeg_path
    
    # Se não encontrar, tenta o caminho do winget
    import os
    winget_path = os.path.join(
        os.environ.get('LOCALAPPDATA', ''),
        'Microsoft', 'WinGet', 'Packages',
        'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe',
        'ffmpeg-7.1.1-full_build', 'bin', 'ffmpeg.exe'
    )
    if os.path.exists(winget_path):
        return winget_path
    
    return None

FFMPEG_PATH = get_ffmpeg_path()
if not FFMPEG_PATH:
    print("AVISO: ffmpeg não encontrado no PATH. A extração de áudio de vídeos não funcionará.")
else:
    print(f"FFmpeg encontrado em: {FFMPEG_PATH}")

def limpar_arquivos_temporarios(excluir_arquivos=None):
    """Remove arquivos temporários da pasta temp_files, exceto os especificados"""
    if excluir_arquivos is None:
        excluir_arquivos = []
    
    try:
        # Remove arquivos temporários, mas mantém os arquivos de resultado
        for arquivo in glob.glob(os.path.join(TEMP_DIR, "*")):
            try:
                if os.path.isfile(arquivo):
                    # Verifica se o arquivo deve ser mantido
                    nome_arquivo = os.path.basename(arquivo)
                    deve_manter = any(excluir in nome_arquivo for excluir in excluir_arquivos)
                    
                    if not deve_manter:
                        os.remove(arquivo)
                        print(f"Arquivo temporário removido: {arquivo}")
                    else:
                        print(f"Arquivo mantido: {arquivo}")
            except PermissionError:
                print(f"Não foi possível remover {arquivo} pois está em uso. Ignorando.")
            except Exception as e:
                print(f"Erro ao remover {arquivo}: {e}")
    except Exception as e:
        print(f"Erro ao limpar arquivos temporários: {e}")

async def get_video_duration(video_path: str) -> float:
    """Obtém a duração do vídeo usando ffprobe ou retorna valor padrão"""
    try:
        # Verifica se ffprobe está disponível
        if not shutil.which("ffprobe"):
            return 0.0
            
        command = [
            "ffprobe", 
            "-v", "quiet", 
            "-show_entries", "format=duration", 
            "-of", "csv=p=0", 
            video_path
        ]
        result = subprocess.run(command, capture_output=True, text=True, check=True, timeout=10)
        
        if result.stdout.strip():
            duration = float(result.stdout.strip())
            return duration
        else:
            return 0.0
            
    except (subprocess.CalledProcessError, ValueError, subprocess.TimeoutExpired):
        return 0.0

@app.get("/test")
async def test():
    """Endpoint de teste para verificar se o servidor está funcionando"""
    return {"message": "Backend funcionando!"}

@app.get("/progress/{task_id}")
async def get_progress(task_id: str):
    """Endpoint para obter progresso de uma tarefa"""
    # Em uma implementação real, você armazenaria o progresso em um banco de dados
    # ou cache. Aqui vamos simular com valores fixos
    progress_data = {
        "task_id": task_id,
        "progress": 0,
        "message": "Aguardando início...",
        "status": "pending"
    }
    
    if task_id.startswith("preview"):
        progress_data.update({
            "progress": 50,
            "message": "Analisando vídeo...",
            "status": "processing"
        })
    elif task_id.startswith("cut"):
        progress_data.update({
            "progress": 90,
            "message": "Processando vídeo...",
            "status": "processing"
        })
    
    return progress_data

@app.post("/extrair-audio")
async def extrair_audio(file: UploadFile = File(...)):
    """Extrai o áudio de um vídeo para visualização no WaveSurfer"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Arquivo não fornecido")
    
    ext = os.path.splitext(file.filename)[1].lower()
    
    # Se não for vídeo, retorna erro
    if ext not in ['.mp4', '.mkv', '.avi', '.mov', '.flv', '.webm']:
        raise HTTPException(status_code=400, detail="Arquivo deve ser um vídeo")
    
    # Verifica se ffmpeg está disponível
    if not FFMPEG_PATH:
        return JSONResponse(
            status_code=200,
            content={
                "success": False,
                "message": "FFmpeg não está instalado. Não é possível extrair áudio para visualização, mas você ainda pode cortar o vídeo.",
                "can_cut_video": True
            }
        )
    
    # Salva o vídeo temporariamente
    temp_video = os.path.join(TEMP_DIR, f"video_{uuid.uuid4()}{ext}")
    temp_audio = os.path.join(TEMP_DIR, f"audio_{uuid.uuid4()}.wav")
    
    try:
        with open(temp_video, "wb") as f:
            f.write(await file.read())
        
        # Extrai áudio usando ffmpeg
        command = [
            FFMPEG_PATH, "-y", "-i", temp_video,
            "-vn", "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "1", temp_audio
        ]
        
        result = subprocess.run(command, capture_output=True)
        if result.returncode != 0 or not os.path.exists(temp_audio):
            return JSONResponse(
                status_code=200,
                content={
                    "success": False,
                    "message": f"Não foi possível extrair o áudio deste vídeo: {result.stderr.decode(errors='ignore')}",
                    "can_cut_video": True
                }
            )
        
        # Retorna o arquivo de áudio
        audio_filename = os.path.basename(temp_audio)
        response = FileResponse(
            temp_audio,
            media_type="audio/wav",
            filename=f"audio_{uuid.uuid4()}.wav"
        )
        
        # Limpa arquivos temporários, mas mantém o arquivo de áudio
        limpar_arquivos_temporarios(excluir_arquivos=[audio_filename])
        
        return response
        
    except Exception as e:
        print(f"Erro ao extrair áudio: {e}")
        return JSONResponse(
            status_code=200,
            content={
                "success": False,
                "message": f"Erro ao extrair áudio: {str(e)}",
                "can_cut_video": True
            }
        )
    finally:
        # Limpa arquivos temporários
        try:
            if os.path.exists(temp_video):
                os.remove(temp_video)
        except PermissionError:
            pass



@app.post("/preview")
async def preview_corte(
    file: UploadFile = File(...),
    threshold: float = Form(...),
):
    """Analisa o vídeo e retorna informações sobre o que seria cortado"""
    # Verifica se o auto-editor está disponível
    if not shutil.which("auto-editor"):
        raise HTTPException(status_code=500, detail="Auto-editor não está instalado ou não está no PATH")
    
    ext = os.path.splitext(file.filename)[1]
    temp_input = os.path.join(TEMP_DIR, f"preview_{uuid.uuid4()}{ext}")
    json_file = os.path.join(TEMP_DIR, f"preview_{uuid.uuid4()}.json")

    with open(temp_input, "wb") as f:
        f.write(await file.read())

    # Comando para apenas analisar sem cortar
    temp_output = os.path.join(TEMP_DIR, f"temp_output_{uuid.uuid4()}{ext}")
    command = [
        "auto-editor",
        temp_input,
        "--edit", f"audio:threshold={threshold}%",
        "--output", temp_output,
        "--no-open"
    ]

    try:
        result = subprocess.run(command, capture_output=True, text=True)
        
        # Verifica se houve erro específico do auto-editor
        if "Timeline is empty" in result.stderr:
            # Vamos obter informações do vídeo usando ffprobe
            duration = await get_video_duration(temp_input)
            
            # Limpa arquivos temporários
            os.remove(temp_input)
            if os.path.exists(temp_output):
                os.remove(temp_output)
            
            return {
                "total_duration": duration,
                "cut_time": 0,
                "cut_percentage": 0,
                "cut_segments": [],
                "segments_count": 0,
                "threshold": threshold,
                "status": f"Nenhuma parte silenciosa encontrada para cortar (threshold: {threshold}%)"
            }
        
        if result.returncode != 0:
            raise subprocess.CalledProcessError(result.returncode, command, result.stdout, result.stderr)
        
        # Se chegou aqui, o vídeo foi processado com sucesso
        # Vamos obter informações do vídeo original
        duration = await get_video_duration(temp_input)
        
        # Limpa arquivos temporários
        os.remove(temp_input)
        if os.path.exists(temp_output):
            os.remove(temp_output)
        status_msg = "Vídeo processado com sucesso"
        if duration == 0:
            status_msg = "Vídeo processado com sucesso (duração não disponível)"
            
        return {
            "total_duration": duration,
            "cut_time": 0,  # Seria calculado com análise detalhada
            "cut_percentage": 0,
            "cut_segments": [],
            "segments_count": 0,
            "threshold": threshold,
            "status": status_msg
        }
        
    except subprocess.CalledProcessError as e:
        # Limpa arquivos em caso de erro
        if os.path.exists(temp_input):
            os.remove(temp_input)
        if os.path.exists(json_file):
            os.remove(json_file)
        if os.path.exists(temp_output):
            os.remove(temp_output)
        raise HTTPException(status_code=500, detail=f"Erro na análise: {e.stderr}")
    except Exception as e:
        # Limpa arquivos em caso de erro
        if os.path.exists(temp_input):
            os.remove(temp_input)
        if os.path.exists(json_file):
            os.remove(json_file)
        if os.path.exists(temp_output):
            os.remove(temp_output)
        raise HTTPException(status_code=500, detail=f"Erro inesperado: {str(e)}")

@app.post("/cortar")
async def cortar_video(
    file: UploadFile = File(...),
    threshold: float = Form(...),
):
    ext = os.path.splitext(file.filename)[1]
    temp_input = os.path.join(TEMP_DIR, f"temp_{uuid.uuid4()}{ext}")
    output_file = os.path.join(TEMP_DIR, f"output_{uuid.uuid4()}{ext}")
    json_file = os.path.join(TEMP_DIR, f"output_{uuid.uuid4()}.json")

    with open(temp_input, "wb") as f:
        f.write(await file.read())

    command = [
        "auto-editor",
        temp_input,
        "--edit", f"audio:threshold={threshold}%",
        "--output", output_file,
        "--no-open"
    ]

    subprocess.run(command, check=True)

    os.remove(temp_input)

    # Aqui retornamos o vídeo editado
    video_filename = os.path.basename(output_file)
    response = {
        "video_filename": video_filename,
        "json_filename": None
    }
    
    # Limpa arquivos temporários, mas mantém o arquivo de vídeo
    limpar_arquivos_temporarios(excluir_arquivos=[video_filename])
    
    return response

@app.get("/video/{video_filename}")
async def get_video(video_filename: str):
    path = os.path.join(TEMP_DIR, video_filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Video não encontrado")
    return FileResponse(path, filename=video_filename)

@app.get("/status/{video_filename}")
async def check_video_status(video_filename: str):
    """Verifica se o arquivo de vídeo está pronto para download"""
    path = os.path.join(TEMP_DIR, video_filename)
    if os.path.exists(path):
        # Verifica se o arquivo tem tamanho > 0 (não está vazio)
        file_size = os.path.getsize(path)
        return {
            "ready": file_size > 0,
            "filename": video_filename,
            "size": file_size,
            "exists": True
        }
    else:
        return {
            "ready": False,
            "filename": video_filename,
            "size": 0,
            "exists": False
        }

@app.get("/silencio/{json_filename}")
async def get_json(json_filename: str):
    path = os.path.join(TEMP_DIR, json_filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="JSON não encontrado")
    return JSONResponse(content=open(path, "r", encoding="utf-8").read())

@app.post("/limpar-temporarios")
async def limpar_temporarios():
    """Endpoint para limpar manualmente os arquivos temporários"""
    try:
        limpar_arquivos_temporarios()
        return {"message": "Arquivos temporários limpos com sucesso!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao limpar arquivos: {str(e)}")

@app.post("/limpar-todos")
async def limpar_todos():
    """Endpoint para limpar TODOS os arquivos temporários (incluindo resultados)"""
    try:
        # Remove todos os arquivos, incluindo resultados
        for arquivo in glob.glob(os.path.join(TEMP_DIR, "*")):
            try:
                if os.path.isfile(arquivo):
                    os.remove(arquivo)
                    print(f"Arquivo removido: {arquivo}")
            except PermissionError:
                print(f"Não foi possível remover {arquivo} pois está em uso. Ignorando.")
            except Exception as e:
                print(f"Erro ao remover {arquivo}: {e}")
        return {"message": "Todos os arquivos temporários limpos com sucesso!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao limpar arquivos: {str(e)}")
