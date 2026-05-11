import React from "react";

interface Props {
  postId: string;
  question: string;
}

export default function PostPanel({ postId, question }: Props) {
  return (
    <div className="bg-white rounded-lg shadow border border-slate-200 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 rounded-t-lg">
        <h3 className="text-sm font-semibold text-slate-700">
          Original user post
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Post ID: <span className="font-mono font-medium">{postId}</span>
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
          {question}
        </p>
      </div>
    </div>
  );
}
