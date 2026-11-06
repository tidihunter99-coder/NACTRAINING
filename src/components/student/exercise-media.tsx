"use client";
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { Dumbbell, Play, RotateCcw, Square } from "lucide-react";

export function ExerciseMedia({ name, photo, demonstration, demonstrationType }: { name: string; photo: string | null; demonstration: string | null; demonstrationType: "gif" | "video" | null }) {
  const [playing, setPlaying] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [demoFailed, setDemoFailed] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [reloadAttempt, setReloadAttempt] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  // A new request goes through the protected application endpoint again. The
  // browser never receives a permanent Storage address for private media.
  const source = demoFailed || !demonstration ? null : `${demonstration}${demonstration.includes("?") ? "&" : "?"}attempt=${reloadAttempt}`;
  const playable = !!source && demonstrationType === "video";
  const animated = !!source && demonstrationType === "gif";
  const start = () => {
    setDemoLoading(true);
    setPlaying(true);
  };
  const retry = () => {
    setDemoFailed(false);
    setReloadAttempt((attempt) => attempt + 1);
    start();
  };
  return <div className="student-detail-hero" aria-label={`Imagem de ${name}`}>
    {!playing && photo && !photoFailed && <img alt="" className="student-hero-photo" decoding="async" onError={() => setPhotoFailed(true)} src={photo} />}
    {(!photo || photoFailed) && !playing && <div className="student-media-empty"><Dumbbell aria-hidden="true" size={56} /><span>Imagem em revisão</span></div>}
    {playing && playable && <video autoPlay className="student-hero-video" controls muted onCanPlay={() => setDemoLoading(false)} onError={() => { setDemoLoading(false); setDemoFailed(true); setPlaying(false); }} onLoadStart={() => setDemoLoading(true)} playsInline poster={photo || undefined} preload="metadata" ref={videoRef} src={source!} />}
    {playing && animated && <img alt={`Demonstração de ${name}`} className="student-hero-video" key={animationKey} onError={() => { setDemoLoading(false); setDemoFailed(true); setPlaying(false); }} onLoad={() => setDemoLoading(false)} src={source!} />}
    {!playing && source && (playable || animated) && <button aria-label={`Reproduzir demonstração de ${name}`} className="student-media-play" onClick={start} type="button"><Play fill="currentColor" size={27} /></button>}
    {demoFailed && <div aria-live="polite" className="student-media-unavailable"><span>Demonstração indisponível.</span><button onClick={retry} type="button">Tentar novamente</button></div>}
    {!source && !demoFailed && (!photo || photoFailed) && <span className="student-media-pending">Demonstração em revisão</span>}
    {animated && !playing && <span className="student-media-type">GIF</span>}
    {playing && demoLoading && <span aria-live="polite" className="student-media-loading">Carregando demonstração…</span>}
    {playing && (playable || animated) && <div className="student-media-controls"><button aria-label="Parar demonstração" onClick={() => setPlaying(false)} type="button"><Square size={16} /> Parar</button><button aria-label="Repetir demonstração" onClick={() => { if (playable && videoRef.current) { videoRef.current.currentTime = 0; void videoRef.current.play(); } else setAnimationKey((key) => key + 1); }} type="button"><RotateCcw size={16} /> Repetir</button></div>}
  </div>;
}
