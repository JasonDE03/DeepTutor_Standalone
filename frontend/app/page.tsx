"use client";

import CoWriterEditor from "@/components/CoWriterEditor";
import { Edit3, FolderOpen } from "lucide-react";
import Link from "next/link";

export default function CoWriterPage() {
  return (
    <div className="h-screen animate-fade-in flex flex-col p-6">
      {/* Header */}
      {/* Header */}
      <div className="mb-4 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Edit3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Co-Writer
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Intelligent markdown editor with AI-powered writing assistance.
          </p>
        </div>
        
        <Link 
          href="/files"
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-200 dark:hover:border-purple-800 hover:shadow-sm transition-all text-sm font-medium"
        >
          <FolderOpen className="w-4 h-4" />
          <span>Open Files</span>
        </Link>
      </div>

      {/* Editor Container */}
      <div className="flex-1 min-h-0">
        <CoWriterEditor />
      </div>
    </div>
  );
}
