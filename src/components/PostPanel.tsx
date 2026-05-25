import React from "react";
import { panel, panelHeader, panelTitle, panelSubtext } from "../lib/ui";

interface Props {
  postId: string;
  question: string;
}

export default function PostPanel({ postId, question }: Props) {
  return (
    <div className={panel}>
      <div className={panelHeader}>
        <h3 className={panelTitle}>Original user post</h3>
        <p className={panelSubtext}>
          Post ID: <span className="font-mono font-medium text-indigo-800">{postId}</span>
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 bg-indigo-50/25">
        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
          {question}
        </p>
      </div>
    </div>
  );
}
