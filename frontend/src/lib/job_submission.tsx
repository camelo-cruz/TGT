import JSZip from "jszip";
import { useRef } from "react";

const JOB_KEY = "job_id";

function useJobSubmission(
  isProcessing: boolean,
  setIsProcessing: (v: boolean) => void,
  addLog: (m: string, t?: any) => void,
  streamerOpen: (jobId: string) => void,
  getToken: () => string | null
) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = async ({
    mode,
    directoryPath,
    action,
    instruction,
    language,
  }: {
    mode: "online" | "upload";
    directoryPath: string;
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
      form.append("base_dir", directoryPath);
      const token = getToken();
      if (!token) throw new Error("Not connected");
      form.append("access_token", token);

      const res = await fetch("/jobs/process", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      if (!res.ok) {
        const text = await res.text();
        addLog(`Error: ${text}`, "error");
        setIsProcessing(false);
        return;
      }
      const { job_id } = await res.json();
      streamerOpen(job_id);
    } else {
      // upload mode: zip directory
      addLog("Zipping files…");
      const zip = new JSZip();
      const input = fileInputRef.current!;
      Array.from(input.files!).forEach((f) =>
        zip.file((f as any).webkitRelativePath, f)
      );
      const blob = await zip.generateAsync({ type: "blob" }, (meta) => {
        addLog(`Zipping ${Math.round(meta.percent)}%`);
      });
      form.append("zipfile", blob, "upload.zip");

      addLog("Uploading zip…");
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/jobs/process");
      xhr.withCredentials = true;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          addLog(`Uploading… ${Math.round((e.loaded / e.total) * 100)}%`);
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
