"use client";

import { useState } from "react";
import { PLACEHOLDER_STORY_IMAGE } from "@/data/stories";

type CoverStatus = "loading" | "loaded" | "error";

interface StoryCoverProps {
  src: string;
  placeholder: string;
  alt: string;
  className?: string;
  /** Padding applied to the PNG so transparent illustrations breathe. */
  imageClassName?: string;
  loading?: "lazy" | "eager";
}

/**
 * Paints the lightweight SVG placeholder immediately, then cross-fades to the
 * PNG illustration once it has fully loaded. If the PNG fails, the SVG stays.
 * The parent controls sizing; this fills it.
 */
export function StoryCover({
  src,
  placeholder,
  alt,
  className = "",
  imageClassName = "object-contain p-4",
  loading = "lazy",
}: StoryCoverProps) {
  const [status, setStatus] = useState<CoverStatus>("loading");
  const [placeholderSrc, setPlaceholderSrc] = useState(placeholder);

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={placeholderSrc}
        alt=""
        aria-hidden="true"
        data-testid="story-cover-placeholder"
        onError={() => {
          if (placeholderSrc !== PLACEHOLDER_STORY_IMAGE) setPlaceholderSrc(PLACEHOLDER_STORY_IMAGE);
        }}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 motion-reduce:transition-none ${
          status === "loaded" ? "opacity-0" : "opacity-100"
        }`}
      />
      {status !== "error" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          data-testid="story-cover-image"
          data-status={status}
          ref={(node) => {
            // Cached images may finish before React attaches onLoad.
            if (node?.complete && node.naturalWidth > 0 && status === "loading") {
              setStatus("loaded");
            }
          }}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className={`absolute inset-0 h-full w-full transition-opacity duration-500 motion-reduce:transition-none ${imageClassName} ${
            status === "loaded" ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}

