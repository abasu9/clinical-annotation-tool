import React, { useEffect, useState } from "react";
import { panel, panelHeader, panelTitle, panelToolBtn } from "../lib/ui";

interface Props {
  imageUrls: string[];
}

const IMAGE_ZOOM_HELP =
  "Use + and − to zoom in or out. When zoomed in or out, scroll up, down, left, or right in the image area to see other parts of the image.";

export default function ImageViewer({ imageUrls }: Props) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [broken, setBroken] = useState<Set<number>>(new Set());
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    setIndex(0);
    setZoom(1);
    setBroken(new Set());
    setHelpOpen(false);
  }, [imageUrls]);

  useEffect(() => {
    setHelpOpen(false);
  }, [index]);

  if (!imageUrls || imageUrls.length === 0) {
    return (
      <div className={`${panel} items-center justify-center`}>
        <p className="text-slate-400 text-sm">No images for this sample</p>
      </div>
    );
  }

  const total = imageUrls.length;
  const src = imageUrls[index];
  const isBroken = broken.has(index);

  const change = (next: number) => {
    setIndex(next);
    setZoom(1);
  };

  return (
    <div className={panel}>
      <div className={`${panelHeader} flex items-center justify-between gap-2 flex-wrap`}>
        <div className="flex items-center gap-1.5 relative">
          <span className={panelTitle}>
            Image {index + 1} of {total}
          </span>
          <button
            type="button"
            onClick={() => setHelpOpen((open) => !open)}
            aria-label="Image zoom and scroll help"
            aria-expanded={helpOpen}
            className="w-5 h-5 rounded-full border border-indigo-300 bg-white text-[11px] font-bold text-indigo-700 leading-none shadow-sm hover:bg-indigo-50 transition"
            title="How to zoom and scroll"
          >
            i
          </button>
          {helpOpen && (
            <div
              role="tooltip"
              className="absolute left-0 top-full mt-2 z-20 w-64 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg"
            >
              {IMAGE_ZOOM_HELP}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))}
            className={panelToolBtn}
            title="Zoom out"
          >
            −
          </button>
          <span className="text-xs font-semibold text-slate-800 w-12 text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
            className={panelToolBtn}
            title="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className={panelToolBtn}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-200/50 min-h-[200px]">
        {isBroken ? (
          <div className="text-center text-slate-400 p-8">
            <svg
              className="mx-auto h-14 w-14 text-slate-300 mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
            <p className="text-sm font-medium">Image could not be loaded</p>
            <p className="text-xs mt-1 break-all">{src}</p>
          </div>
        ) : (
          <img
            key={src}
            src={src}
            alt={`Sample image ${index + 1}`}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
            }}
            className="max-w-full max-h-full object-contain transition-transform duration-150"
            onError={() =>
              setBroken((prev) => {
                const next = new Set(prev);
                next.add(index);
                return next;
              })
            }
          />
        )}
      </div>

      {total > 1 && (
        <div className="px-4 py-2 border-t border-indigo-200/50 bg-indigo-50/40 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => change(Math.max(0, index - 1))}
            disabled={index === 0}
            className={`${panelToolBtn} px-3 py-1.5 disabled:opacity-40`}
          >
            ← Previous image
          </button>
          <button
            type="button"
            onClick={() => change(Math.min(total - 1, index + 1))}
            disabled={index === total - 1}
            className={`${panelToolBtn} px-3 py-1.5 disabled:opacity-40`}
          >
            Next image →
          </button>
        </div>
      )}
    </div>
  );
}
