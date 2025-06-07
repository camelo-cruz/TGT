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
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-purple-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="gap-2 text-purple-700 hover:text-purple-800 hover:bg-purple-50"
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
                <h1 className="text-2xl font-bold text-purple-800">
                  Automatic workflow LeibnizDream
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {isConnectedToOneDrive ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-purple-600" />
                )}
                <span className="text-sm text-purple-600">
                  {isConnectedToOneDrive
                    ? "Connected to OneDrive"
                    : "Not connected to OneDrive"}
                </span>
              </div>
              <span className="text-sm text-purple-500">v1.0.0</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-6">
          {/* File Input Section */}
          <Card className="border-purple-200">
            <CardHeader className="bg-purple-50">
              <CardTitle className="flex items-center gap-2 text-purple-800">
                <Upload className="w-5 h-5" />
                File Input
              </CardTitle>
              <CardDescription className="text-purple-600">
                Choose how you want to provide your files for processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  <Globe className="w-6 h-6" />
                  Work Online
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  <Upload className="w-6 h-6" />
                  Upload Files
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* OneDrive Integration */}
          <Card className="border-purple-200">
            <CardHeader className="bg-purple-50">
              <CardTitle className="text-purple-800">
                OneDrive Integration
              </CardTitle>
              <CardDescription className="text-purple-600">
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
                  className={
                    !isConnectedToOneDrive
                      ? "bg-purple-700 hover:bg-purple-800 text-white"
                      : ""
                  }
                >
                  {isConnectedToOneDrive ? "Logout" : "Connect OneDrive"}
                </Button>
                <Button
                  variant="outline"
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  Use Token
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="directory" className="text-purple-700">
                  Directory Path
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="directory"
                    placeholder="Enter directory path..."
                    value={directoryPath}
                    onChange={(e) => setDirectoryPath(e.target.value)}
                    className="border-purple-200 focus:border-purple-400"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-purple-200 text-purple-700 hover:bg-purple-50"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-fit border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  Select Folder
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Workflow Configuration */}
          <Card className="border-purple-200">
            <CardHeader className="bg-purple-50">
              <CardTitle className="text-purple-800">
                Workflow Configuration
              </CardTitle>
              <CardDescription className="text-purple-600">
                Configure the processing actions and parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="action" className="text-purple-700">
                    Action
                  </Label>
                  <Select
                    value={selectedAction}
                    onValueChange={setSelectedAction}
                  >
                    <SelectTrigger
                      id="action"
                      className="border-purple-200 focus:border-purple-400"
                    >
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
                  <Label htmlFor="instruction" className="text-purple-700">
                    Instruction
                  </Label>
                  <Select
                    value={selectedInstruction}
                    onValueChange={setSelectedInstruction}
                  >
                    <SelectTrigger
                      id="instruction"
                      className="border-purple-200 focus:border-purple-400"
                    >
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
                <Label htmlFor="source-language" className="text-purple-700">
                  Source Language
                </Label>
                <Select
                  value={selectedLanguage}
                  onValueChange={setSelectedLanguage}
                >
                  <SelectTrigger
                    id="source-language"
                    className="border-purple-200 focus:border-purple-400"
                  >
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
          <Card className="border-purple-200">
            <CardContent className="pt-6">
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={handleStart}
                  className="gap-2 px-8 bg-purple-700 hover:bg-purple-800 text-white"
                  disabled={!selectedAction || !selectedInstruction}
                >
                  <Play className="w-4 h-4" />
                  Start
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="gap-2 px-8 border-purple-300 text-purple-700 hover:bg-purple-50"
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
      <footer className="mt-16 py-8 border-t border-purple-200 bg-white/50">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 text-purple-700">
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
