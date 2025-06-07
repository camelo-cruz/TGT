import { useState, useEffect, useRef } from "react";
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

const Inference = () => {
  const navigate = useNavigate();
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedInstruction, setSelectedInstruction] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [directoryPath, setDirectoryPath] = useState("");
  const [isConnectedToOneDrive, setIsConnectedToOneDrive] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLogsExpanded, setIsLogsExpanded] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (
    message: string,
    type: "info" | "success" | "error" | "warning" = "info",
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix =
      type === "error"
        ? "❌"
        : type === "success"
          ? "✅"
          : type === "warning"
            ? "⚠️"
            : "ℹ️";
    setLogs((prev) => [...prev, `[${timestamp}] ${prefix} ${message}`]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const copyLogs = () => {
    navigator.clipboard.writeText(logs.join("\n"));
    addLog("Logs copied to clipboard", "success");
  };

  const simulateWorkflow = async () => {
    setIsProcessing(true);
    addLog("Starting LeibnizDream workflow...", "info");
    addLog(`Action: ${selectedAction}`, "info");
    addLog(`Instruction type: ${selectedInstruction}`, "info");
    addLog(`Source language: ${selectedLanguage}`, "info");

    // Simulate processing steps
    const steps = [
      "Initializing workflow engine...",
      "Connecting to processing servers...",
      "Validating input parameters...",
      "Loading language models...",
      "Processing files...",
      "Applying transformations...",
      "Generating output...",
      "Workflow completed successfully!",
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 + Math.random() * 1500),
      );
      if (i === steps.length - 1) {
        addLog(steps[i], "success");
      } else {
        addLog(steps[i], "info");
      }
    }
    setIsProcessing(false);
  };

  const handleStart = () => {
    if (!selectedAction || !selectedInstruction) {
      addLog(
        "Please select both action and instruction before starting",
        "error",
      );
      return;
    }
    simulateWorkflow();
  };

  const handleCancel = () => {
    // Reset form or navigate back
    setSelectedAction("");
    setSelectedInstruction("");
    setSelectedLanguage("");
    setDirectoryPath("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <img
                  src="/placeholder.svg"
                  alt="LeibnizDream Logo"
                  className="w-8 h-8"
                />
                <h1 className="text-2xl font-bold text-slate-800">
                  Automatic workflow LeibnizDream
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {isConnectedToOneDrive ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="text-sm text-slate-600">
                  {isConnectedToOneDrive
                    ? "Connected to OneDrive"
                    : "Not connected to OneDrive"}
                </span>
              </div>
              <span className="text-sm text-slate-500">v1.0.0</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-6">
          {/* File Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                File Input
              </CardTitle>
              <CardDescription>
                Choose how you want to provide your files for processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 flex-col gap-2">
                  <Globe className="w-6 h-6" />
                  Work Online
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2">
                  <Upload className="w-6 h-6" />
                  Upload Files
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* OneDrive Integration */}
          <Card>
            <CardHeader>
              <CardTitle>OneDrive Integration</CardTitle>
              <CardDescription>
                Connect to your OneDrive account for seamless file access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button
                  variant={isConnectedToOneDrive ? "destructive" : "default"}
                  onClick={() =>
                    setIsConnectedToOneDrive(!isConnectedToOneDrive)
                  }
                >
                  {isConnectedToOneDrive ? "Logout" : "Connect OneDrive"}
                </Button>
                <Button variant="outline">Use Token</Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="directory">Directory Path</Label>
                <div className="flex gap-2">
                  <Input
                    id="directory"
                    placeholder="Enter directory path..."
                    value={directoryPath}
                    onChange={(e) => setDirectoryPath(e.target.value)}
                  />
                  <Button variant="outline" size="icon">
                    <FolderOpen className="w-4 h-4" />
                  </Button>
                </div>
                <Button variant="outline" className="w-fit">
                  Select Folder
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Workflow Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow Configuration</CardTitle>
              <CardDescription>
                Configure the processing actions and parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="action">Action</Label>
                  <Select
                    value={selectedAction}
                    onValueChange={setSelectedAction}
                  >
                    <SelectTrigger id="action">
                      <SelectValue placeholder="Select an action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transcribe">Transcribe</SelectItem>
                      <SelectItem value="translate">Translate</SelectItem>
                      <SelectItem value="transliterate">
                        Transliterate
                      </SelectItem>
                      <SelectItem value="gloss">Gloss</SelectItem>
                      <SelectItem value="create-columns">
                        Create columns
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instruction">Instruction</Label>
                  <Select
                    value={selectedInstruction}
                    onValueChange={setSelectedInstruction}
                  >
                    <SelectTrigger id="instruction">
                      <SelectValue placeholder="Select instruction type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrected">Corrected</SelectItem>
                      <SelectItem value="sentences">Sentences</SelectItem>
                      <SelectItem value="automatic">Automatic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="source-language">Source Language</Label>
                <Input
                  id="source-language"
                  placeholder="Enter source language (e.g., English, Arabic, Chinese, etc.)"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={handleStart}
                  className="gap-2 px-8"
                  disabled={
                    !selectedAction || !selectedInstruction || isProcessing
                  }
                >
                  <Play className="w-4 h-4" />
                  {isProcessing ? "Processing..." : "Start"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="gap-2 px-8"
                  disabled={isProcessing}
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Workflow Logs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  <CardTitle>Workflow Logs</CardTitle>
                  {logs.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {logs.length} entries
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {logs.length > 0 && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyLogs}
                        className="gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearLogs}
                        className="gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsLogsExpanded(!isLogsExpanded)}
                    className="gap-1"
                  >
                    {isLogsExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    {isLogsExpanded ? "Collapse" : "Expand"}
                  </Button>
                </div>
              </div>
              <CardDescription>
                Real-time workflow logs and status updates
              </CardDescription>
            </CardHeader>
            {isLogsExpanded && (
              <CardContent>
                <div className="bg-slate-950 rounded-lg p-4 font-mono text-sm">
                  <ScrollArea className="h-80 w-full">
                    {logs.length === 0 ? (
                      <div className="text-slate-400 italic text-center py-8">
                        No logs yet. Start a workflow to see real-time updates
                        here.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {logs.map((log, index) => (
                          <div
                            key={index}
                            className={`text-sm ${
                              log.includes("❌")
                                ? "text-red-400"
                                : log.includes("✅")
                                  ? "text-green-400"
                                  : log.includes("⚠️")
                                    ? "text-yellow-400"
                                    : "text-slate-300"
                            }`}
                          >
                            {log}
                          </div>
                        ))}
                        <div ref={logsEndRef} />
                      </div>
                    )}
                  </ScrollArea>
                </div>
                {isProcessing && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    Workflow in progress...
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-slate-200 bg-white/50">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-600">
            <img
              src="/placeholder.svg"
              alt="LeibnizDream Logo"
              className="w-6 h-6"
            />
            <p>LeibnizDream</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Inference;
