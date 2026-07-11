export interface SharePointConnection {
  siteUrl: string;
  libraryName: string;
  folderPath: string;
  pollSeconds: number;
}

export interface SharePointFile {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedBy: string;
  uploadedAt: string;
  sourceUrl: string;
}

export interface SharePointMonitorResponse {
  ok: boolean;
  connected: boolean;
  cursor: string;
  files: SharePointFile[];
  message?: string;
}

const CONNECTION_KEY = "pal.sharepoint.connection";
const PROCESSED_KEY = "pal.sharepoint.processedFiles";

export const defaultSharePointConnection: SharePointConnection = {
  siteUrl: "",
  libraryName: "Documents",
  folderPath: "/Compliance Review/Incoming",
  pollSeconds: 8,
};

export function getSharePointConnection(): SharePointConnection | null {
  try {
    const raw = localStorage.getItem(CONNECTION_KEY);
    return raw ? { ...defaultSharePointConnection, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

export function saveSharePointConnection(connection: SharePointConnection) {
  localStorage.setItem(CONNECTION_KEY, JSON.stringify(connection));
}

export function clearSharePointConnection() {
  localStorage.removeItem(CONNECTION_KEY);
}

export function getProcessedSharePointFileIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(PROCESSED_KEY) || "[]");
  } catch {
    return [];
  }
}

export function markSharePointFilesProcessed(ids: string[]) {
  const merged = Array.from(new Set([...getProcessedSharePointFileIds(), ...ids]));
  localStorage.setItem(PROCESSED_KEY, JSON.stringify(merged));
}

export function resetProcessedSharePointFiles() {
  localStorage.removeItem(PROCESSED_KEY);
}

export async function connectSharePoint(connection: SharePointConnection): Promise<SharePointMonitorResponse> {
  const response = await fetch("/api/sharepoint/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(connection),
  });
  if (!response.ok) throw new Error(`SharePoint connection failed: ${response.status}`);
  return response.json();
}

export async function fetchSharePointChanges(connection: SharePointConnection, cursor?: string): Promise<SharePointMonitorResponse> {
  const response = await fetch("/api/sharepoint/changes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...connection, cursor }),
  });
  if (!response.ok) throw new Error(`SharePoint monitor failed: ${response.status}`);
  return response.json();
}
