import { useEffect, useRef } from "react";

function useStreamer(
  addLog: (msg: string, type?: any) => void,
  setIsProcessing: (v: boolean) => void
) {
  const evtRef = useRef<EventSource | null>(null);

  const open = (jobId: string) => {
    localStorage.setItem(JOB_KEY, jobId);
    addLog(`Opened job ${jobId}`, "info");
    setIsProcessing(true);

    const evt = new EventSource(`/jobs/${jobId}/stream`);
    evtRef.current = evt;

    evt.onmessage = (e) => {
      if (e.data === "[PING]") return;
      if (e.data.includes("[ERROR]")) {
        addLog(e.data, "error");
        finish();
      } else if (e.data.includes("[DONE ALL]")) {
        addLog("✅ Workflow complete!", "success");
        finish();
      } else {
        addLog(e.data, "info");
      }
    };
  };

  const finish = () => {
    evtRef.current?.close();
    evtRef.current = null;
    setIsProcessing(false);
    localStorage.removeItem(JOB_KEY);
  };

  // on mount: resume pending
  useEffect(() => {
    const pending = localStorage.getItem(JOB_KEY);
    if (pending) open(pending);
    return () => evtRef.current?.close();
  }, []);

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

  return { open, cancel };
}
