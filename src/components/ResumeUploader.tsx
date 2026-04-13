import React, { useState } from "react";
import mammoth from "mammoth";
import * as pdfjs from "pdfjs-dist";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/src/lib/utils";

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

interface ResumeUploaderProps {
  onTextExtracted: (text: string) => void;
  className?: string;
}

export function ResumeUploader({ onTextExtracted, className }: ResumeUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const extractTextFromDocx = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const extractTextFromPdf = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(" ") + "\n";
    }
    return text;
  };

  const handleFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      let text = "";
      if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        text = await extractTextFromDocx(file);
      } else if (file.type === "application/pdf") {
        text = await extractTextFromPdf(file);
      } else if (file.type === "text/plain") {
        text = await file.text();
      } else {
        throw new Error("Unsupported file format. Please upload .docx, .pdf, or .txt");
      }

      if (!text.trim()) {
        throw new Error("Could not extract any text from the file.");
      }

      onTextExtracted(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract text");
      setFileName(null);
    } finally {
      setIsLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 flex flex-col items-center justify-center gap-4 cursor-pointer",
          isDragging 
            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20" 
            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50",
          error ? "border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10" : ""
        )}
      >
        <input
          type="file"
          className="absolute inset-0 opacity-0 cursor-pointer"
          accept=".docx,.pdf,.txt"
          onChange={onFileChange}
        />
        
        {isLoading ? (
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        ) : fileName ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[250px]">{fileName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-500">Click or drag to replace</p>
          </div>
        ) : (
          <>
            <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-100 dark:border-slate-700">
              <Upload className="w-6 h-6 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Upload Resume</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Supports .docx, .pdf, .txt</p>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-100 dark:border-red-900/50">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
