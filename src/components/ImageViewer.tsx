import React, { useEffect, useState } from "react";

interface Props {
  imageUrls: string[];
}

export default function ImageViewer({ imageUrls }: Props) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [broken, setBroken] = useState<Set<number>>(new Set());

  useEffect(() => {
    setIndex(0);
    setZoom(1);
    setBroken(new Set());
  }, [imageUrls]);

  if (!imageUrls || imageUrls.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border border-slate-200 flex items-center justify-center h-full">
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
    <div className="bg-white rounded-lg shadow border border-slate-200 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 rounded-t-lg flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-semibold text-slate-700">
          Image {index + 1} of {total}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))}
            className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100"
            title="Zoom out"
          >
            −
          </button>
          <span className="text-xs text-slate-500 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
            className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100"
            title="Zoom in"
          >
            +
          </button>
          <button
            onClick={() => setZoom(1)}
            className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-100 min-h-[200px]">
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
        <div className="px-4 py-2 border-t border-slate-200 flex items-center justify-center gap-3">
          <button
            onClick={() => change(Math.max(0, index - 1))}
            disabled={index === 0}
            className="px-3 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40"
          >
            ← Previous image
          </button>
          <button
            onClick={() => change(Math.min(total - 1, index + 1))}
            disabled={index === total - 1}
            className="px-3 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40"
          >
            Next image →
          </button>
        </div>
      )}
    </div>
  );
}
