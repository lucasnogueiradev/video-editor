import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface WaveformProps {
  audioUrl: string;
  threshold?: number; // Novo prop para o threshold
  onThresholdChange?: (threshold: number) => void; // Callback para mudar threshold
  onTimeUpdate?: (time: number) => void;
  onDuration?: (duration: number) => void;
}

const Waveform: React.FC<WaveformProps> = ({
  audioUrl,
  threshold = 0, // Valor padrão
  onThresholdChange,
  onTimeUpdate,
  onDuration,
}) => {
  console.log(
    "Waveform: Componente renderizado com audioUrl:",
    audioUrl,
    "threshold:",
    threshold,
    "timestamp:",
    Date.now()
  );
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Waveform: useEffect executado");
    console.log("Waveform: audioUrl mudou para:", audioUrl);
    console.log("Waveform: threshold mudou para:", threshold);
    console.log("Waveform: waveformRef.current existe?", !!waveformRef.current);

    // Evita executar se já está carregando
    if (isLoading) {
      console.log("Waveform: Já está carregando, ignorando...");
      return;
    }

    if (waveformRef.current && audioUrl) {
      console.log("Waveform: Iniciando carregamento do áudio...");
      setIsLoading(true);
      setError(null);

      // Destroi instância anterior se existir
      if (wavesurfer.current) {
        console.log("Waveform: Destruindo instância anterior...");
        wavesurfer.current.destroy();
        wavesurfer.current = null;
      }

      // Aguarda um pouco para garantir que o DOM foi atualizado
      setTimeout(() => {
        if (waveformRef.current && !wavesurfer.current) {
          console.log("Waveform: Criando nova instância do WaveSurfer...");
          console.log("Waveform: Container ref:", waveformRef.current);
          console.log("Waveform: Audio URL:", audioUrl);
          wavesurfer.current = WaveSurfer.create({
            container: waveformRef.current,
            waveColor: "#4f8cff",
            progressColor: "#1e3a8a",
            cursorColor: "#ff6b6b",
            barWidth: 2,
            barGap: 1,
            height: 120,
            normalize: true,
            interact: true,
            hideScrollbar: false,
          });

          wavesurfer.current.on("ready", () => {
            console.log("Waveform: Áudio carregado com sucesso!");
            setIsLoading(false);
            const dur = wavesurfer.current?.getDuration() || 0;
            setDuration(dur);
            onDuration?.(dur);
          });

          wavesurfer.current.on("error", (error) => {
            console.error("Waveform: Erro ao carregar áudio:", error);
            setIsLoading(false);
            setError("Erro ao carregar áudio");
          });

          wavesurfer.current.on("play", () => {
            console.log("Waveform: Áudio iniciado");
            setIsPlaying(true);
          });

          wavesurfer.current.on("pause", () => {
            console.log("Waveform: Áudio pausado");
            setIsPlaying(false);
          });

          wavesurfer.current.on("finish", () => {
            console.log("Waveform: Áudio finalizado");
            setIsPlaying(false);
          });

          console.log("Waveform: Carregando áudio...");
          wavesurfer.current.load(audioUrl);
        }
      }, 100);
    }

    return () => {
      if (wavesurfer.current) {
        console.log("Waveform: Limpeza - destruindo WaveSurfer");
        wavesurfer.current.destroy();
        wavesurfer.current = null;
      }
    };
  }, [audioUrl]); // Removido onTimeUpdate e onDuration das dependências

  // Efeito para atualizar a linha do threshold quando mudar
  useEffect(() => {
    if (wavesurfer.current && waveformRef.current) {
      // Remove linha anterior se existir
      const existingLine = waveformRef.current.querySelector(".threshold-line");
      if (existingLine) {
        existingLine.remove();
      }

      // Cria nova linha do threshold
      const thresholdLine = document.createElement("div");
      thresholdLine.className = "threshold-line";

      // Calcula a posição da linha baseada no threshold
      // threshold 0% = linha no meio (neutra)
      // threshold 15% = linha alta (mais sensível)
      // threshold 30% = linha muito alta (muito sensível)
      const thresholdPosition = Math.max(5, 50 - (threshold / 30) * 40);

      thresholdLine.style.cssText = `
        position: absolute;
        top: ${thresholdPosition}%;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, #ff6b6b 0%, #ff8e8e 50%, #ff6b6b 100%);
        z-index: 10;
        cursor: ns-resize;
        box-shadow: 0 0 4px rgba(255, 107, 107, 0.6);
      `;

      // Adiciona funcionalidade de arrastar a linha
      let isDragging = false;
      let startY = 0;
      let startThreshold = threshold;

      thresholdLine.addEventListener("mousedown", (e) => {
        isDragging = true;
        startY = e.clientY;
        startThreshold = threshold;
        document.body.style.cursor = "ns-resize";
        e.preventDefault();
      });

      document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;

        const deltaY = startY - e.clientY;
        const containerHeight = waveformRef.current?.offsetHeight || 120;
        const deltaPercent = (deltaY / containerHeight) * 100;
        const newThreshold = Math.max(
          0,
          Math.min(30, startThreshold - (deltaPercent * 30) / 40)
        );

        if (onThresholdChange) {
          onThresholdChange(Math.round(newThreshold));
        }
      });

      document.addEventListener("mouseup", () => {
        isDragging = false;
        document.body.style.cursor = "default";
      });

      waveformRef.current.style.position = "relative";
      waveformRef.current.appendChild(thresholdLine);
    }
  }, [threshold]);

  const togglePlay = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
    }
  };

  const stop = () => {
    if (wavesurfer.current) {
      wavesurfer.current.stop();
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="waveform-container">
      <div className="waveform-controls">
        <button
          onClick={togglePlay}
          className="play-button"
          disabled={!audioUrl || isLoading}
        >
          {isPlaying ? "⏸️ Pausar" : "▶️ Reproduzir"}
        </button>
        <button
          onClick={stop}
          className="stop-button"
          disabled={!audioUrl || isLoading}
        >
          ⏹️ Parar
        </button>
        <span className="time-display">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <div className="threshold-info">
          <span className="threshold-label">Threshold: {threshold}%</span>
        </div>
      </div>

      {isLoading && (
        <div className="waveform-loading">
          <div className="loading-spinner">🔄</div>
          <p>Carregando forma de onda...</p>
        </div>
      )}

      {error && (
        <div className="waveform-error">
          <p>❌ {error}</p>
        </div>
      )}

      <div ref={waveformRef} className="waveform" />

      {/* Legenda do threshold */}
      <div className="threshold-legend">
        <div className="legend-item">
          <div
            className="legend-color"
            style={{ backgroundColor: "#4f8cff" }}
          ></div>
          <span>Áudio acima da linha (mantido)</span>
        </div>
        <div className="legend-item">
          <div
            className="legend-color"
            style={{ backgroundColor: "#ff6b6b" }}
          ></div>
          <span>Áudio abaixo da linha (cortado) - Threshold: {threshold}%</span>
        </div>
        <div className="legend-item">
          <div
            className="legend-color"
            style={{ backgroundColor: "#ff6b6b", opacity: 0.3 }}
          ></div>
          <span>
            Threshold 0% = meio (neutro) | 15% = alto | 30% = muito alto
          </span>
        </div>
      </div>
    </div>
  );
};

export default Waveform;
