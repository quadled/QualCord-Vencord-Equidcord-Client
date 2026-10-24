/*
 * Qualcord HTTP Updater
 * Seamlessly checks version.json and downloads pre-built Qualcord packages
 * without requiring Git or Node.js.
 */

import { execFile as cpExecFile } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { promisify } from "util";

import { fetchBuffer, fetchJson } from "@main/utils/http";
import gitRemote from "~git-remote";

import { QUALCORD_BUILD, QUALCORD_VERSION } from "../../qualcordVersion";
import { UpdateData, Updater } from ".";

const execFile = promisify(cpExecFile);

const REPO = gitRemote || "quadled/QualCord-Vencord-Equidcord-Client";
const REPO_URL = `https://github.com/${REPO}`;
const API_COMMITS = `https://api.github.com/repos/${REPO}/commits?per_page=5`;
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/main`;

let pendingZipBuffer: Buffer | null = null;
let cachedUpdates: UpdateData[] = [];

async function getRepo() {
    return REPO_URL;
}

function getLocalVersion(): { version: string; build: number } {
    try {
        const localVersionFile = join(__dirname, "../../version.json");
        if (existsSync(localVersionFile)) {
            const data = JSON.parse(readFileSync(localVersionFile, "utf-8"));
            if (data?.version) {
                return { version: data.version, build: Number(data.build) || 0 };
            }
        }
    } catch {}
    return { version: QUALCORD_VERSION, build: QUALCORD_BUILD };
}

function isRemoteNewer(remoteVersion: string, remoteBuild?: number): boolean {
    if (!remoteVersion) return false;

    const local = getLocalVersion();

    // 1. If build numbers exist, compare builds
    if (typeof remoteBuild === "number" && typeof local.build === "number" && local.build > 0) {
        if (remoteBuild > local.build) return true;
        if (remoteBuild < local.build) return false;
    }

    // 2. Compare semver strings (e.g. 1.0.17 vs 1.0.16)
    const remoteParts = remoteVersion.replace(/^v/, "").split(".").map(x => parseInt(x, 10) || 0);
    const localParts = local.version.replace(/^v/, "").split(".").map(x => parseInt(x, 10) || 0);

    for (let i = 0; i < Math.max(remoteParts.length, localParts.length); i++) {
        const r = remoteParts[i] ?? 0;
        const l = localParts[i] ?? 0;
        if (r > l) return true;
        if (r < l) return false;
    }

    return false;
}

async function listUpdates(): Promise<UpdateData[]> {
    try {
        // Check raw version.json from GitHub
        const vData = await fetchJson<any>(`${RAW_BASE}/version.json?_t=${Date.now()}`, {
            headers: {
                "User-Agent": "QualcordUpdater/1.0"
            }
        });

        if (vData && vData.version) {
            if (isRemoteNewer(vData.version, vData.build)) {
                let changelog: UpdateData[] = [];
                try {
                    const commits = await fetchJson<any[]>(API_COMMITS, {
                        headers: {
                            Accept: "application/vnd.github+json",
                            "User-Agent": "QualcordUpdater/1.0"
                        }
                    });
                    if (Array.isArray(commits)) {
                        changelog = commits.map(c => ({
                            hash: (c.sha || "").slice(0, 7),
                            author: c.commit?.author?.name || c.author?.login || "Qualcord",
                            message: (c.commit?.message || "").split("\n")[0]
                        }));
                    }
                } catch {}

                if (changelog.length === 0) {
                    changelog = [{
                        hash: "v" + vData.version,
                        author: "Qualcord",
                        message: `Qualcord Update auf Version ${vData.version} verfuegbar`
                    }];
                }

                cachedUpdates = changelog;
                return changelog;
            } else {
                // Already on latest version or newer!
                cachedUpdates = [];
                return [];
            }
        }
    } catch (e) {
        console.warn("[Qualcord Updater] Failed to check version.json:", e);
    }

    cachedUpdates = [];
    return [];
}

async function fetchUpdate(): Promise<boolean> {
    try {
        const updates = cachedUpdates.length > 0 ? cachedUpdates : await listUpdates();
        if (updates.length === 0) return false;

        // Download latest Qualcord-dist.zip
        const zipUrl = `${RAW_BASE}/installer/Qualcord-dist.zip?_t=${Date.now()}`;
        pendingZipBuffer = await fetchBuffer(zipUrl, {
            headers: { "User-Agent": "QualcordUpdater/1.0" }
        });

        return pendingZipBuffer !== null && pendingZipBuffer.length > 0;
    } catch (e) {
        console.error("[Qualcord Updater] Failed to fetch update zip:", e);
        return false;
    }
}

async function applyUpdate(): Promise<boolean> {
    if (!pendingZipBuffer) {
        const fetched = await fetchUpdate();
        if (!fetched || !pendingZipBuffer) return false;
    }

    try {
        const tempZip = join(process.env.TEMP || "C:\\Windows\\Temp", `qualcord_update_${Date.now()}.zip`);
        writeFileSync(tempZip, pendingZipBuffer);
        pendingZipBuffer = null;

        const targetDir = __dirname; // Current active dist directory (dist/desktop or %LOCALAPPDATA%\Qualcord\dist)

        // Try tar.exe (built-in on Windows 10/11)
        if (process.platform === "win32") {
            try {
                await execFile("tar.exe", ["-xf", tempZip, "-C", targetDir]);
                return true;
            } catch {
                // Fallback to PowerShell Expand-Archive
                await execFile("powershell.exe", [
                    "-NoProfile",
                    "-Command",
                    `Expand-Archive -Path '${tempZip}' -DestinationPath '${targetDir}' -Force`
                ]);
                return true;
            }
        } else {
            // Linux / macOS: unzip
            await execFile("unzip", ["-o", tempZip, "-d", targetDir]);
            return true;
        }
    } catch (e) {
        console.error("[Qualcord Updater] Failed to apply update:", e);
        return false;
    }
}

const HttpUpdater: Updater = {
    getRepo,
    listUpdates,
    fetchUpdate,
    applyUpdate
};

export default HttpUpdater;
