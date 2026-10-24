/*
 * Qualcord HTTP Updater
 * Seamlessly checks GitHub API and downloads pre-built Qualcord packages
 * without requiring Git or Node.js.
 */

import { execFile as cpExecFile } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { promisify } from "util";

import { fetchBuffer, fetchJson } from "@main/utils/http";
import gitHash from "~git-hash";
import gitRemote from "~git-remote";

import { UpdateData, Updater } from ".";

const execFile = promisify(cpExecFile);

const REPO = gitRemote || "quadled/QualCord-Vencord-Equidcord-Client";
const REPO_URL = `https://github.com/${REPO}`;
const API_COMMITS = `https://api.github.com/repos/${REPO}/commits?per_page=15`;
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/main`;

let pendingZipBuffer: Buffer | null = null;
let cachedUpdates: UpdateData[] = [];

async function getRepo() {
    return REPO_URL;
}

async function listUpdates(): Promise<UpdateData[]> {
    try {
        // 1. Try GitHub Commits API
        const commits = await fetchJson<any[]>(API_COMMITS, {
            headers: {
                Accept: "application/vnd.github+json",
                "User-Agent": "QualcordUpdater/1.0"
            }
        });

        if (Array.isArray(commits) && commits.length > 0) {
            const currentHash = (gitHash || "").toLowerCase();
            const latestSha = (commits[0].sha || "").toLowerCase();

            // Already on latest commit
            if (latestSha.startsWith(currentHash) || currentHash.startsWith(latestSha)) {
                cachedUpdates = [];
                return [];
            }

            const updates: UpdateData[] = [];
            for (const c of commits) {
                const sha = (c.sha || "").toLowerCase();
                if (sha.startsWith(currentHash) || currentHash.startsWith(sha)) break;

                updates.push({
                    hash: (c.sha || "").slice(0, 7),
                    author: c.commit?.author?.name || c.author?.login || "Qualcord",
                    message: (c.commit?.message || "").split("\n")[0]
                });
            }

            cachedUpdates = updates;
            return updates;
        }
    } catch (e) {
        // GitHub API rate limited or network issue - fall back to version.json
    }

    // 2. Fallback via raw version.json
    try {
        const vData = await fetchJson<any>(`${RAW_BASE}/version.json?_t=${Date.now()}`);
        if (vData && vData.version) {
            const localVersionFile = join(__dirname, "../../version.json");
            let localVersion = "";
            if (existsSync(localVersionFile)) {
                try {
                    const localJson = JSON.parse(readFileSync(localVersionFile, "utf-8"));
                    localVersion = localJson.version;
                } catch {}
            }

            if (localVersion && vData.version !== localVersion) {
                cachedUpdates = [{
                    hash: "v" + vData.version,
                    author: "Qualcord",
                    message: `Neues Qualcord Update verfuegbar: Version ${vData.version}`
                }];
                return cachedUpdates;
            }
        }
    } catch {}

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
