import { useState } from "react";
import axios from "axios";
import type { ChangeEvent, FormEvent } from "react";
import Waveform from "./components/Waveform";

interface PreviewData {
  total_duration: number;
  cut_time: number;
  cut_percentage: number;
  cut_segments: Array<{
    start: number;
    end: number;
    duration: number;
  }>;
  segments_count: number;
  threshold: number;
  status?: string;
}

interface VideoStatus {
  ready: boolean;
  filename: string;
  size: number;
  exists: boolean;
}

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [threshold, setThreshold] = useState<number>(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [silenceData, setSilenceData] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>("");

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const ProgressBar = ({
    progress,
    message,
  }: {
    progress: number;
    message: string;
  }) => (
    <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-medium text-gray-300 flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
          {message}
        </span>
        <span className="text-sm font-mono text-gray-400 bg-gray-700 px-2 py-1 rounded">
          {progress}%
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500 ease-out relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
        </div>
      </div>
    </div>
  );

  const handlePreview = async () => {
    if (!file) return;

    setPreviewLoading(true);
    setPreviewData(null);
    setProgress(0);
    setProgressMessage("Iniciando análise...");

    const form = new FormData();
    form.append("file", file);
    form.append("threshold", threshold.toString());

    try {
      setProgressMessage("Enviando arquivo...");
      setProgress(10);

      console.log("Enviando requisição para /preview...");
      const res = await axios.post<PreviewData>(
        "http://localhost:8000/preview",
        form
      );

      setProgress(100);
      setProgressMessage("Análise concluída!");

      console.log("Resposta recebida:", res.data);
      setPreviewData(res.data);

      setTimeout(() => {
        setProgress(0);
        setProgressMessage("");
      }, 1000);
    } catch (error) {
      console.error("Erro detalhado:", error);
      alert("Erro ao analisar vídeo");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExtractAudio = async () => {
    if (!file) return;

    setAudioLoading(true);
    setAudioUrl(null);
    setProgress(0);
    setProgressMessage("Extraindo áudio...");

    const form = new FormData();
    form.append("file", file);

    try {
      setProgressMessage("Enviando arquivo...");
      setProgress(10);

      // Tenta extrair o áudio
      console.log("Enviando requisição para extrair áudio...");
      const response = await axios.post(
        "http://localhost:8000/extrair-audio",
        form,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          responseType: "blob", // Sempre espera um blob
        }
      );

      console.log("Resposta recebida:", response);
      console.log("Tipo da resposta:", typeof response.data);
      console.log("É Blob?", response.data instanceof Blob);
      console.log(
        "Tamanho do blob:",
        response.data instanceof Blob ? response.data.size : "N/A"
      );

      setProgressMessage("Processando áudio...");
      setProgress(50);

      // Verifica se a resposta é um blob válido
      if (response.data instanceof Blob && response.data.size > 0) {
        console.log("Blob válido encontrado, criando URL...");
        const audioBlob = response.data;
        const audioUrl = URL.createObjectURL(audioBlob);
        console.log("URL do áudio criada:", audioUrl);
        console.log("App: Definindo audioUrl para:", audioUrl);
        setAudioUrl(audioUrl);

        // Força o download do arquivo de áudio
        const downloadLink = document.createElement("a");
        downloadLink.href = audioUrl;
        downloadLink.download = `audio_extraido.wav`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        console.log("App: audioUrl definido, verificando em 1 segundo...");
        setTimeout(() => {
          console.log("App: audioUrl atual:", audioUrl);
          console.log("App: audioUrl state:", audioUrl);
        }, 1000);
        setProgressMessage("Áudio extraído com sucesso!");
        setProgress(100);
      } else {
        console.log("Blob inválido, tentando ler como texto...");
        // Se não é um blob válido, pode ser uma mensagem de erro
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result as string);
            console.log("Erro encontrado:", errorData);
            alert(
              errorData.message ||
                "Não foi possível extrair o áudio para visualização"
            );
          } catch {
            console.log("Erro ao processar resposta:", reader.result);
            alert("Erro ao processar resposta do servidor");
          }
        };
        reader.readAsText(response.data as Blob);
        setProgressMessage("Áudio não disponível para visualização");
        setProgress(100);
      }

      setTimeout(() => {
        setProgress(0);
        setProgressMessage("");
      }, 2000);
    } catch (error) {
      console.error("Erro ao extrair áudio:", error);
      alert("Erro ao extrair áudio do vídeo");
    } finally {
      setAudioLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setVideoUrl(null);
    setSilenceData(null);
    setProgress(0);
    setProgressMessage("Iniciando processamento...");

    const form = new FormData();
    form.append("file", file);
    form.append("threshold", threshold.toString());

    try {
      setProgressMessage("Enviando vídeo para processamento...");
      setProgress(10);

      // 1) Envia o vídeo para cortar
      const res = await axios.post<{
        video_filename: string;
        json_filename: string;
      }>("http://localhost:8000/cortar", form);
      const { video_filename, json_filename } = res.data;

      setProgressMessage("Processando vídeo...");
      setProgress(50);

      // 2) Verifica se o arquivo está pronto
      setProgressMessage("Verificando se o arquivo está pronto...");
      setProgress(60);

      let attempts = 0;
      const maxAttempts = 30; // 30 tentativas = 30 segundos
      let videoReady = false;

      while (attempts < maxAttempts && !videoReady) {
        try {
          const statusRes = await axios.get<VideoStatus>(
            `http://localhost:8000/status/${video_filename}`
          );
          if (statusRes.data.ready && statusRes.data.size > 0) {
            videoReady = true;
            console.log(`Arquivo pronto após ${attempts + 1} tentativas`);
            break;
          }
        } catch (error) {
          console.log(
            `Tentativa ${attempts + 1}: Arquivo ainda não está pronto`
          );
        }

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Espera 1 segundo
      }

      if (!videoReady) {
        throw new Error("Timeout: Arquivo não ficou pronto em 30 segundos");
      }

      setProgressMessage("Baixando vídeo...");
      setProgress(80);

      // 3) Busca o vídeo cortado (responseType blob)
      const videoRes = await axios.get(
        `http://localhost:8000/video/${video_filename}`,
        { responseType: "blob" }
      );
      const videoBlob = videoRes.data as Blob;
      const videoBlobUrl = URL.createObjectURL(videoBlob);
      setVideoUrl(videoBlobUrl);

      // 3.5) Força o download do arquivo
      const downloadLink = document.createElement("a");
      downloadLink.href = videoBlobUrl;
      downloadLink.download = `video_cortado_${threshold}%.mkv`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setProgressMessage("Obtendo dados de análise...");
      setProgress(80);

      // 4) Busca o JSON da análise de silêncio (se disponível)
      if (json_filename) {
        try {
          const jsonRes = await axios.get(
            `http://localhost:8000/silencio/${json_filename}`
          );
          setSilenceData(jsonRes.data);
        } catch (error) {
          console.log("JSON de análise não disponível");
          setSilenceData(null);
        }
      } else {
        setSilenceData(null);
      }

      setProgress(100);
      setProgressMessage("Processamento concluído!");

      setTimeout(() => {
        setProgress(0);
        setProgressMessage("");
      }, 1000);
    } catch (error) {
      alert("Erro ao processar vídeo");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setPreviewData(null); // Limpa preview anterior
    }
  };

  const handleThresholdChange = (e: ChangeEvent<HTMLInputElement>) => {
    setThreshold(Number(e.target.value));
    setPreviewData(null); // Limpa preview quando threshold muda
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-800 to-gray-700 flex flex-col items-center justify-center font-sans text-white">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl min-w-[600px] max-w-[900px]">
        <h1 className="text-center mb-6 font-semibold text-xl">
          Cortar Vídeo Silencioso
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label
            htmlFor="file"
            className="bg-gray-700 p-3 rounded-lg cursor-pointer text-center border-2 border-dashed border-purple-500 font-medium hover:bg-gray-600 transition-colors"
          >
            {file ? file.name : "Selecione um vídeo"}
            <input
              id="file"
              type="file"
              accept="/*"
              onChange={handleFileChange}
              required
              className="hidden"
            />
          </label>
          {previewUrl && (
            <video
              src={previewUrl}
              className="w-full rounded-lg mb-2 border border-gray-700 bg-black"
              controls
              poster=""
            />
          )}

          {/* Instruções para o usuário */}
          {file && (
            <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
              <h3 className="text-blue-300 font-medium mb-2">🎯 Como usar:</h3>
              <div className="text-sm text-blue-200 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">1.</span>
                  <div>
                    <strong>🔊 Ver Forma de Onda:</strong> Clique para
                    visualizar o áudio e identificar as partes silenciosas
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">2.</span>
                  <div>
                    <strong>🎚️ Ajustar Threshold:</strong> Use o slider para
                    definir qual nível de silêncio cortar (1% = muito sensível,
                    30% = menos sensível)
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">3.</span>
                  <div>
                    <strong>👁️ Preview:</strong> Veja exatamente o que seria
                    cortado com o threshold atual
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">4.</span>
                  <div>
                    <strong>✂️ Cortar:</strong> Processe o vídeo removendo as
                    partes silenciosas
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <label htmlFor="threshold" className="font-medium flex-1">
              Threshold de Silêncio:
            </label>
            <input
              id="threshold"
              type="range"
              min={1}
              max={30}
              value={threshold}
              onChange={handleThresholdChange}
              className="flex-3"
            />
            <span className="w-8 text-right font-mono bg-gray-700 px-2 py-1 rounded">
              {threshold}
            </span>
          </div>

          {/* Indicador visual do threshold */}
          {audioUrl && (
            <div className="bg-gray-800 p-3 rounded-lg border border-gray-600">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-300">
                  Nível de corte atual:
                </span>
                <span className="text-sm font-mono text-blue-400">
                  {threshold}% do volume máximo
                </span>
              </div>
              <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-2 transition-all duration-300"
                  style={{ width: `${(threshold / 30) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Baixo (1%)</span>
                <span>Alto (30%)</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewLoading || !file}
              className="flex-1 bg-blue-500 text-white border-none rounded-lg py-3 font-semibold text-base cursor-pointer transition-colors hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {previewLoading ? "Analisando..." : "Preview"}
            </button>
            <button
              type="button"
              onClick={handleExtractAudio}
              disabled={audioLoading || !file}
              className="flex-1 bg-green-500 text-white border-none rounded-lg py-3 font-semibold text-base cursor-pointer transition-colors hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {audioLoading ? "Extraindo..." : "🔊 Ver Forma de Onda"}
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="flex-1 bg-purple-500 text-white border-none rounded-lg py-3 font-semibold text-base cursor-pointer transition-colors hover:bg-purple-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {loading ? "Processando..." : "Cortar"}
            </button>
          </div>
        </form>

        {/* Barra de Progresso */}
        {(previewLoading || audioLoading || loading) && progress > 0 && (
          <ProgressBar progress={progress} message={progressMessage} />
        )}

        {/* Preview da análise */}
        {previewData && (
          <div className="mt-6 bg-gray-900 p-4 rounded-lg">
            <h3 className="mb-3 font-medium text-lg text-blue-400">
              Análise do Corte
            </h3>
            {previewData.status && (
              <div className="mb-3 p-2 bg-blue-900 rounded text-sm text-blue-200">
                {previewData.status}
              </div>
            )}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Duração total:</span>
                <span className="font-mono">
                  {formatTime(previewData.total_duration)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tempo que seria cortado:</span>
                <span className="font-mono text-red-400">
                  {formatTime(previewData.cut_time)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Porcentagem cortada:</span>
                <span className="font-mono text-red-400">
                  {previewData.cut_percentage}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Segmentos silenciosos:</span>
                <span className="font-mono">{previewData.segments_count}</span>
              </div>
            </div>

            {previewData.cut_segments.length > 0 && (
              <div className="mt-3">
                <h4 className="mb-2 font-medium text-sm text-gray-300">
                  Segmentos que seriam cortados:
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {previewData.cut_segments.map((segment, index) => (
                    <div
                      key={index}
                      className="text-xs bg-gray-800 p-2 rounded"
                    >
                      <span className="text-red-400">
                        {formatTime(segment.start)} - {formatTime(segment.end)}
                      </span>
                      <span className="text-gray-400 ml-2">
                        ({formatTime(segment.duration)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* WaveSurfer - Visualização de Áudio */}
        {audioUrl && (
          <div className="mt-6 bg-gray-900 p-6 rounded-lg border border-green-500/30">
            <h3 className="mb-3 font-medium text-lg text-green-400 flex items-center gap-2">
              🔊 Forma de Onda do Áudio
              <span className="text-xs bg-green-500/20 px-2 py-1 rounded text-green-300">
                Interativo
              </span>
            </h3>
            <div className="mb-4 p-3 bg-green-900/20 rounded-lg border border-green-500/20">
              <div className="text-sm text-green-200 space-y-2">
                <p>
                  <strong>🎯 Como interpretar:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>
                    <strong>Partes altas (azul):</strong> Áudio com volume alto
                    - serão mantidas
                  </li>
                  <li>
                    <strong>Partes baixas (azul claro):</strong> Áudio com
                    volume baixo - podem ser cortadas
                  </li>
                  <li>
                    <strong>Linha vermelha:</strong> Threshold atual (
                    {threshold}%) - arraste a linha para ajustar ou use o slider
                  </li>
                </ul>
                <p className="text-xs text-green-300 mt-2">
                  💡 <strong>Dica:</strong> Ajuste o threshold acima para ver
                  como as partes silenciosas são identificadas
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handlePreview}
                    disabled={previewLoading || !file}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    {previewLoading
                      ? "Analisando..."
                      : "👁️ Preview com Threshold Atual"}
                  </button>
                </div>
              </div>
            </div>
            <Waveform
              key={audioUrl}
              audioUrl={audioUrl}
              threshold={threshold}
              onThresholdChange={setThreshold}
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  const downloadLink = document.createElement("a");
                  downloadLink.href = audioUrl;
                  downloadLink.download = `audio_extraido.wav`;
                  document.body.appendChild(downloadLink);
                  downloadLink.click();
                  document.body.removeChild(downloadLink);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                📥 Baixar Áudio Novamente
              </button>
            </div>
          </div>
        )}

        {videoUrl && (
          <div className="mt-6">
            <h3 className="mb-2 font-medium">Vídeo Cortado:</h3>
            <video
              src={videoUrl}
              controls
              className="w-full rounded-lg bg-black"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  const downloadLink = document.createElement("a");
                  downloadLink.href = videoUrl;
                  downloadLink.download = `video_cortado_${threshold}%.mkv`;
                  document.body.appendChild(downloadLink);
                  downloadLink.click();
                  document.body.removeChild(downloadLink);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                📥 Baixar Vídeo Novamente
              </button>
            </div>
          </div>
        )}

        {silenceData && (
          <div className="mt-6 max-h-48 overflow-auto bg-gray-900 p-4 rounded-md text-sm font-mono whitespace-pre-wrap">
            <h3 className="mb-2 font-medium">Análise de Silêncio (JSON):</h3>
            <pre>{JSON.stringify(silenceData, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
