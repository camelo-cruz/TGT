import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

const Inference = () => {
  const navigate = useNavigate();
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedInstruction, setSelectedInstruction] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [directoryPath, setDirectoryPath] = useState("");
  const [isConnectedToOneDrive, setIsConnectedToOneDrive] = useState(false);

  const handleStart = () => {
    // TODO: Implement start functionality
    console.log("Starting workflow with:", {
      action: selectedAction,
      instruction: selectedInstruction,
      language: selectedLanguage,
      directory: directoryPath,
    });
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
              <div>
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
                <span className="text-sm text-red-600">
                  {isConnectedToOneDrive
                    ? "Connected to OneDrive"
                    : "Not connected to OneDrive"}
                </span>
              </div>
              <span className="text-sm text-red-500">v1.0.0</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-6">
          {/* File Input Section */}
          <Card className="border-red-200">
            <CardHeader className="bg-red-50">
              <CardTitle className="flex items-center gap-2 text-red-800">
                <Upload className="w-5 h-5" />
                File Input
              </CardTitle>
              <CardDescription className="text-red-600">
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
          <Card className="border-red-200">
            <CardHeader className="bg-red-50">
              <CardTitle className="text-red-800">
                OneDrive Integration
              </CardTitle>
              <CardDescription className="text-red-600">
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
          <Card className="border-red-200">
            <CardHeader className="bg-red-50">
              <CardTitle className="text-red-800">
                Workflow Configuration
              </CardTitle>
              <CardDescription className="text-red-600">
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
                <Select
                  value={selectedLanguage}
                  onValueChange={setSelectedLanguage}
                >
                  <SelectTrigger id="source-language">
                    <SelectValue placeholder="Select source language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="it">Italian</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                    <SelectItem value="ru">Russian</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                    <SelectItem value="ko">Korean</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card className="border-red-200">
            <CardContent className="pt-6">
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={handleStart}
                  className="gap-2 px-8 bg-red-700 hover:bg-red-800 text-white"
                  disabled={!selectedAction || !selectedInstruction}
                >
                  <Play className="w-4 h-4" />
                  Start
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="gap-2 px-8 border-red-300 text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-red-200 bg-white/50">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 text-red-700">
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
