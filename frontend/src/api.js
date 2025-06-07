export async function fetchJobs() {
  const response = await fetch("http://localhost:8000/jobs/list");
  if (!response.ok) throw new Error("Failed to fetch jobs");
  return await response.json();
}