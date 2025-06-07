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

function useOneDriveAuth(
  setIsConnected: (v: boolean) => void,
  addLog: (message: string, type?: LogType) => void,
) {
  // guard to restore token only once
  const restoredRef = useRef(false);

  // 1) On mount: restore any existing token exactly once
  useEffect(() => {
    if (!restoredRef.current) {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        setIsConnected(true);
        addLog("Restored OneDrive token", "success");
      }
      restoredRef.current = true;
    }
  }, [setIsConnected, addLog]);

  // 2) Listen for storage events once
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY && e.newValue) {
        setIsConnected(true);
        addLog("OneDrive connected via storage event", "success");
        window.removeEventListener("storage", onStorage);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [setIsConnected, addLog]);

  // 3) ALSO listen for postMessage from the popup once
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "onedrive_connected") {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
          setIsConnected(true);
          addLog("OneDrive connected via postMessage", "success");
          window.removeEventListener("message", onMessage);
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
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
  setIsProcessing: (v: boolean) => void,
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
  getToken: () => string | null,
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
          addLog(
            `Uploading… ${Math.round((e.loaded / e.total) * 100)}%`,
            "info",
          );
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

// Main Inference Component
export default function Inference() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<
    Array<{ msg: string; type: LogType; time: string }>
  >([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<"online" | "upload">("online");
  const [baseDir, setBaseDir] = useState("");
  const [action, setAction] = useState("transcribe");
  const [instruction, setInstruction] = useState("automatic");
  const [language, setLanguage] = useState("");
  const [logsExpanded, setLogsExpanded] = useState(false);

  const addLog = (msg: string, type: LogType = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { msg, type, time }]);
  };

  const clearLogs = () => setLogs([]);

  const { connect, logout, getToken } = useOneDriveAuth(setIsConnected, addLog);
  const { open: streamerOpen, cancel } = useStreamer(addLog, setIsProcessing);
  const { fileInputRef, submit } = useJobSubmission(
    isProcessing,
    setIsProcessing,
    addLog,
    streamerOpen,
    getToken,
  );

  const handleSubmit = () => {
    if (!action || !instruction) {
      addLog("Please select action and instruction", "error");
      return;
    }
    if (!language.trim()) {
      addLog("Please enter a language", "error");
      return;
    }
    if (mode === "online" && !baseDir.trim()) {
      addLog("Please enter base directory", "error");
      return;
    }
    if (
      mode === "upload" &&
      (!fileInputRef.current?.files || fileInputRef.current.files.length === 0)
    ) {
      addLog("Please select files to upload", "error");
      return;
    }

    submit({ mode, baseDir, action, instruction, language });
  };

  const getLogIcon = (type: LogType) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "warning":
        return <X className="h-4 w-4 text-yellow-600" />;
      default:
        return <Terminal className="h-4 w-4 text-blue-600" />;
    }
  };

  const copyLogsToClipboard = () => {
    const logText = logs
      .map((log) => `[${log.time}] ${log.type.toUpperCase()}: ${log.msg}`)
      .join("\n");
    navigator.clipboard.writeText(logText);
    addLog("Logs copied to clipboard", "success");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/")}
              className="hover:bg-white/80"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Inference</h1>
              <p className="text-gray-600 mt-1">Process your linguistic data</p>
            </div>
          </div>

          {/* OneDrive Status */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <Globe className="h-5 w-5 text-blue-600" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">OneDrive</span>
                <Badge
                  variant={isConnected ? "default" : "secondary"}
                  className="w-fit"
                >
                  {isConnected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
              {isConnected ? (
                <Button variant="outline" size="sm" onClick={logout}>
                  Logout
                </Button>
              ) : (
                <Button size="sm" onClick={connect}>
                  Connect
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mode Selection */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Data Source
            </CardTitle>
            <CardDescription>
              Choose how to provide your data for processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                variant={mode === "online" ? "default" : "outline"}
                onClick={() => setMode("online")}
                className="flex-1"
              >
                <Globe className="h-4 w-4 mr-2" />
                OneDrive
              </Button>
              <Button
                variant={mode === "upload" ? "default" : "outline"}
                onClick={() => setMode("upload")}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
            </div>

            {mode === "online" ? (
              <div className="space-y-2">
                <Label htmlFor="baseDir">OneDrive Directory Path</Label>
                <Input
                  id="baseDir"
                  value={baseDir}
                  onChange={(e) => setBaseDir(e.target.value)}
                  placeholder="e.g., /Documents/my-project"
                  disabled={!isConnected}
                />
                {!isConnected && (
                  <p className="text-sm text-red-600">
                    Please connect to OneDrive first
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="fileUpload">Select Files</Label>
                <Input
                  ref={fileInputRef}
                  id="fileUpload"
                  type="file"
                  multiple
                  // @ts-ignore
                  webkitdirectory=""
                  directory=""
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-sm text-gray-600">
                  Select a folder to upload all its contents
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Processing Configuration */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Processing Configuration
            </CardTitle>
            <CardDescription>
              Configure the processing parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="action">Action</Label>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger id="action">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transcribe">Transcribe</SelectItem>
                    <SelectItem value="translate">Translate</SelectItem>
                    <SelectItem value="gloss">Gloss</SelectItem>
                    <SelectItem value="transliterate">Transliterate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instruction">Instruction</Label>
                <Select value={instruction} onValueChange={setInstruction}>
                  <SelectTrigger id="instruction">
                    <SelectValue placeholder="Select instruction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automatic">Automatic</SelectItem>
                    <SelectItem value="corrected">Corrected</SelectItem>
                    <SelectItem value="sentences">Sentences</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Input
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="Enter the language (e.g., English, Spanish, French...)"
              />
            </div>
            <div className="flex gap-4">
              <Button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Processing
                  </>
                )}
              </Button>

              {isProcessing && (
                <Button variant="destructive" onClick={cancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Logs */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                <CardTitle>Processing Logs</CardTitle>
                <Badge variant="outline">{logs.length} entries</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyLogsToClipboard}
                  disabled={logs.length === 0}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearLogs}
                  disabled={logs.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLogsExpanded(!logsExpanded)}
                >
                  {logsExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea
              className={`w-full ${logsExpanded ? "h-96" : "h-48"} transition-all duration-200`}
            >
              <div className="space-y-2">
                {logs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No logs yet. Start processing to see activity here.
                  </p>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      {getLogIcon(log.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono break-words">
                          {log.msg}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{log.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}