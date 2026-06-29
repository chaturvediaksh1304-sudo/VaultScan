import { useEffect, useRef } from "react";

interface Props {
  src: string;
  className?: string;
}

const FADE_MS = 500;
const FADE_OUT_LEAD = 0.55; // seconds before end to start fading out

/** rAF-based crossfading looping video (per spec). Manual loop via the `ended`
 *  event so the fade-out/fade-in is seamless. Only used if you supply a real
 *  video `src`; the app defaults to AuroraBackground otherwise. */
export default function FadingVideo({ src, className = "" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const fadingOutRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const fadeTo = (target: number, duration: number) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const start = performance.now();
      const from = parseFloat(video.style.opacity || "0");
      const step = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        video.style.opacity = String(from + (target - from) * t);
        if (t < 1) rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    };

    const onLoadedData = () => {
      video.style.opacity = "0";
      void video.play();
      fadeTo(1, FADE_MS);
    };
    const onTimeUpdate = () => {
      if (
        video.duration - video.currentTime <= FADE_OUT_LEAD &&
        !fadingOutRef.current
      ) {
        fadingOutRef.current = true;
        fadeTo(0, FADE_MS);
      }
    };
    const onEnded = () => {
      video.style.opacity = "0";
      setTimeout(() => {
        fadingOutRef.current = false;
        video.currentTime = 0;
        void video.play();
        fadeTo(1, FADE_MS);
      }, 100);
    };

    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      className={className}
      src={src}
      muted
      playsInline
      autoPlay
      style={{ opacity: 0 }}
    />
  );
}
