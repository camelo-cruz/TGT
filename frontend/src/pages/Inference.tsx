import React, { useState, useEffect, useRef } from "react";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  Globe,
  FolderOpen,
  Play,
  X,
  CheckCircle2,
  XCircle,
  Terminal,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// Storage keys
const JOB_KEY = "job_id";
const TOKEN_KEY = "access_token";
const ONE_DRIVE_POPUP_URL = "/auth/start";

type LogType = "info" | "success" | "error" | "warning";

// Hook: OneDrive authentication
function useOneDriveAuth(
  setIsConnected: (v: boolean) => void,
  addLog: (message: string, type?: LogType) => void
) {
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      setIsConnected(true);
      addLog("Restored OneDrive token", "success");
    }
  }, [setIsConnected, addLog]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY && e.newValue) {
        localStorage.setItem(TOKEN_KEY, e.newValue);
        setIsConnected(true);
        addLog("OneDrive connected!", "success");
        localStorage.removeItem(TOKEN_KEY);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [setIsConnected, addLog]);

  const connect = () => {
    addLog("Opening OneDrive auth…");
    window.open(ONE_DRIVE_POPUP_URL, "authPopup", "width=600,height=700");
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setIsConnected(false);
    addLog("Logged out of OneDrive", "info");
  };

  const getToken = () => localStorage.getItem(TOKEN_KEY);

  return { connect, logout, getToken };
}

// Hook: SSE Streamer
function useStreamer(
  addLog: (msg: string, type?: LogType) => void,
  setIsProcessing: (v: boolean) => void
) {
  const evtRef = useRef<EventSource | null>(null);

  const finish = () => {
    evtRef.current?.close();
    evtRef.current = null;
    setIsProcessing(false);
    localStorage.removeItem(JOB_KEY);
  };

  const open = (jobId: string) => {
    localStorage.setItem(JOB_KEY, jobId);
    addLog(`Opened job ${jobId}`, "info");
    setIsProcessing(true);

    const evt = new EventSource(`/jobs/${jobId}/stream`);
    evtRef.current = evt;

    evt.onmessage = (e) => {
      const data = e.data;
      if (data === "[PING]") return;
      if (data.includes("[ERROR]")) {
        addLog(data, "error");
        finish();
      } else if (data.includes("[DONE ALL]")) {
        addLog("Workflow completed successfully!", "success");
        finish();
      } else {
        addLog(data, "info");
      }
    };
  };

  const cancel = () => {
    const jobId = localStorage.getItem(JOB_KEY);
    if (!jobId) return;
    fetch("/jobs/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId }),
      credentials: "same-origin",
    }).then(() => {
      addLog("Cancelled", "warning");
      finish();
    });
  };

  useEffect(() => {
    const pending = localStorage.getItem(JOB_KEY);
    if (pending) open(pending);
    return () => evtRef.current?.close();
  }, []);

  return { open, cancel };
}

// Hook: job submission (online & upload)
function useJobSubmission(
  isProcessing: boolean,
  setIsProcessing: (v: boolean) => void,
  addLog: (m: string, t?: LogType) => void,
  streamerOpen: (jobId: string) => void,
  getToken: () => string | null
) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = async ({
    mode,
    baseDir,
    action,
    instruction,
    language,
  }: {
    mode: "online" | "upload";
    baseDir: string;
    action: string;
    instruction: string;
    language: string;
  }) => {
    setIsProcessing(true);
    addLog("Submitting job…", "info");

    const form = new FormData();
    form.append("action", action);
    form.append("instruction", instruction);
    form.append("language", language);

    if (mode === "online") {
      form.append("base_dir", baseDir);
      const token = getToken();
      if (!token) {
        addLog("No OneDrive token. Please connect.", "error");
        setIsProcessing(false);
        return;
      }
      form.append("access_token", token);

      const res = await fetch("/jobs/process", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      if (!res.ok) {
        const errorText = await res.text();
        addLog(`Error: ${errorText}`, "error");
        setIsProcessing(false);
        return;
      }
      const { job_id } = await res.json();
      streamerOpen(job_id);
    } else {
      // offline: zip & upload
      addLog("Zipping files…", "info");
      const zip = new JSZip();
      const input = fileInputRef.current!;
      Array.from(input.files || []).forEach((f) => {
        zip.file((f as any).webkitRelativePath, f);
      });
      const blob = await zip.generateAsync({ type: "blob" }, (meta) => {
        addLog(`Zipping ${Math.round(meta.percent)}%`, "info");
      });
      form.append("zipfile", blob, "upload.zip");

      addLog("Uploading zip…", "info");
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/jobs/process");
      xhr.withCredentials = true;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          addLog(`Uploading… ${Math.round((e.loaded / e.total) * 100)}%`, "info");
        }
      };
      xhr.onload = () => {
        const { job_id } = JSON.parse(xhr.responseText);
        streamerOpen(job_id);
      };
      xhr.send(form);
    }
  };

  return { fileInputRef, submit };
}
