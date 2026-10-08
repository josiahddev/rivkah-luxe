"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { PlayIcon } from "@/components/ui/icons";

type Media = { url: string; alt: string | null };

function videoEmbed(url: string) {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

export function ProductGallery({ images, name, videoUrl, activeImage }: { images: Media[]; name: string; videoUrl?: string | null; activeImage?: string | null }) {
  const slides: ({ type: "image" } & Media | { type: "video"; url: string })[] = [
    ...images.map((i) => ({ type: "image" as const, ...i })),
    ...(videoUrl ? [{ type: "video" as const, url: videoUrl }] : []),
  ];
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const track = useRef<HTMLDivElement>(null);

  // When a variant with its own photo is chosen, jump to it.
  useEffect(() => {
    if (!activeImage) return;
    const i = slides.findIndex((s) => s.type === "image" && s.url === activeImage);
    if (i >= 0) go(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeImage]);

  const go = (i: number) => {
    setIndex(i);
    const el = track.current;
    if (el) el.scrollTo({ left: el.clientWidth * i, behavior: "smooth" });
  };

  if (!slides.length) return <div className="aspect-[4/5] bg-sand" />;

  return (
    <div className="lg:grid lg:grid-cols-[80px_1fr] lg:gap-4">
      {/* Thumbnails (desktop) */}
      <div className="hidden flex-col gap-3 lg:flex">
        {slides.map((s, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            className={cn("relative aspect-[4/5] overflow-hidden bg-sand transition-opacity", i === index ? "ring-1 ring-ink" : "opacity-60 hover:opacity-100")}
            aria-label={s.type === "video" ? "Play video" : `Show image ${i + 1}`}
            aria-current={i === index}
          >
            {s.type === "image" ? (
              <Image src={s.url} alt="" fill sizes="80px" className="object-cover" />
            ) : (
              <span className="grid h-full place-items-center bg-ink text-ivory"><PlayIcon size={20} /></span>
            )}
          </button>
        ))}
      </div>

      <div className="relative">
        <div
          ref={track}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto lg:overflow-hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            const i = Math.round(el.scrollLeft / el.clientWidth);
            if (i !== index) setIndex(i);
          }}
        >
          {slides.map((s, i) => (
            <div key={i} className="relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden bg-sand">
              {s.type === "image" ? (
                <div
                  className="relative h-full w-full lg:cursor-zoom-in"
                  onMouseMove={(e) => {
                    if (window.matchMedia("(hover: none)").matches) return;
                    const r = e.currentTarget.getBoundingClientRect();
                    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
                  }}
                  onMouseLeave={() => setZoom(null)}
                >
                  <Image
                    src={s.url}
                    alt={s.alt || `${name} — image ${i + 1}`}
                    fill
                    sizes="(min-width:1024px) 50vw, 100vw"
                    quality={85}
                    preload={i === 0}
                    className="object-cover transition-transform duration-300 ease-out"
                    style={zoom && i === index ? { transform: "scale(1.9)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
                  />
                </div>
              ) : videoEmbed(s.url) ? (
                <iframe src={videoEmbed(s.url)!} title={`${name} video`} className="absolute inset-0 h-full w-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
              ) : (
                <video src={s.url} controls playsInline preload="metadata" className="absolute inset-0 h-full w-full bg-ink object-contain" />
              )}
            </div>
          ))}
        </div>
        {/* Dots (mobile) */}
        {slides.length > 1 && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 lg:hidden">
            {slides.map((_, i) => (
              <button key={i} onClick={() => go(i)} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-ink" : "w-1.5 bg-ink/30")} aria-label={`Go to image ${i + 1}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
