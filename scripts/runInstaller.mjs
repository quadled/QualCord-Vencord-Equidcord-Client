/*
 * Qualcord, a custom client modification for Discord
 * Copyright (c) 2026 Qualcord and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./checkNodeVersion.js";

import { execSync } from "child_process";
import { existsSync, lstatSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const BASE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DESKTOP = join(BASE_DIR, "dist", "desktop");
const PATCHER_JS = join(DIST_DESKTOP, "patcher.js");

function findDiscordInstallations() {
    const targets = [];
    const platform = process.platform;

    if (platform === "win32") {
        const localAppData = process.env.LOCALAPPDATA;
        if (!localAppData) return targets;

        const branches = [
            { name: "Discord Stable", dir: "Discord" },
            { name: "Discord PTB", dir: "DiscordPTB" },
            { name: "Discord Canary", dir: "DiscordCanary" },
            { name: "Discord Development", dir: "DiscordDevelopment" }
        ];

        for (const branch of branches) {
            const branchPath = join(localAppData, branch.dir);
            if (!existsSync(branchPath)) continue;

            try {
                const entries = readdirSync(branchPath, { withFileTypes: true })
                    .filter(e => e.isDirectory() && e.name.startsWith("app-"))
                    .map(e => e.name)
                    .sort();

                if (entries.length > 0) {
                    const latestApp = entries[entries.length - 1];
                    const resourcesDir = join(branchPath, latestApp, "resources");
                    if (existsSync(resourcesDir)) {
                        targets.push({ name: `${branch.name} (${latestApp})`, resourcesDir });
                    }
                }
            } catch {}
        }
    } else if (platform === "linux") {
        const home = process.env.HOME || "";

        // Standard Linux package paths
        const nativeCandidates = [
            { name: "Discord (/opt/discord)", dir: "/opt/discord/resources" },
            { name: "Discord (/opt/Discord)", dir: "/opt/Discord/resources" },
            { name: "Discord PTB (/opt/discord-ptb)", dir: "/opt/discord-ptb/resources" },
            { name: "Discord Canary (/opt/discord-canary)", dir: "/opt/discord-canary/resources" },
            { name: "Discord Dev (/opt/discord-development)", dir: "/opt/discord-development/resources" },
            { name: "Discord (/usr/share/discord)", dir: "/usr/share/discord/resources" },
            { name: "Discord PTB (/usr/share/discord-ptb)", dir: "/usr/share/discord-ptb/resources" },
            { name: "Discord Canary (/usr/share/discord-canary)", dir: "/usr/share/discord-canary/resources" },
            { name: "Discord Dev (/usr/share/discord-development)", dir: "/usr/share/discord-development/resources" },
            { name: "Discord (/usr/lib/discord)", dir: "/usr/lib/discord/resources" },
            { name: "Discord (/usr/lib64/discord)", dir: "/usr/lib64/discord/resources" },
            { name: "Discord PTB (/usr/lib/discord-ptb)", dir: "/usr/lib/discord-ptb/resources" },
            { name: "Discord Canary (/usr/lib/discord-canary)", dir: "/usr/lib/discord-canary/resources" },
            { name: "Discord (User ~/.local/share)", dir: join(home, ".local/share/discord/resources") },
            { name: "Discord PTB (User ~/.local/share)", dir: join(home, ".local/share/discord-ptb/resources") },
            { name: "Discord Canary (User ~/.local/share)", dir: join(home, ".local/share/discord-canary/resources") }
        ];

        for (const candidate of nativeCandidates) {
            if (existsSync(candidate.dir)) {
                targets.push({ name: candidate.name, resourcesDir: candidate.dir });
            }
        }

        // Flatpak paths
        const flatpaks = [
            { id: "com.discordapp.Discord", name: "Discord (Flatpak)" },
            { id: "com.discordapp.DiscordPTB", name: "Discord PTB (Flatpak)" },
            { id: "com.discordapp.DiscordCanary", name: "Discord Canary (Flatpak)" },
            { id: "com.discordapp.DiscordDevelopment", name: "Discord Dev (Flatpak)" }
        ];

        const flatpakPrefixes = [
            join(home, ".local/share/flatpak/app"),
            "/var/lib/flatpak/app"
        ];

        for (const fp of flatpaks) {
            for (const prefix of flatpakPrefixes) {
                const resDir = join(prefix, fp.id, "current/active/files/discord/resources");
                if (existsSync(resDir)) {
                    targets.push({ name: fp.name, resourcesDir: resDir, flatpakId: fp.id });
                    break;
                }
            }
        }
    } else if (platform === "darwin") {
        const macBranches = [
            { name: "Discord", dir: "/Applications/Discord.app/Contents/Resources" },
            { name: "Discord PTB", dir: "/Applications/Discord PTB.app/Contents/Resources" },
            { name: "Discord Canary", dir: "/Applications/Discord Canary.app/Contents/Resources" },
            { name: "Discord Development", dir: "/Applications/Discord Development.app/Contents/Resources" }
        ];

        for (const b of macBranches) {
            if (existsSync(b.dir)) {
                targets.push({ name: b.name, resourcesDir: b.dir });
            }
        }
    }

    return targets;
}

function closeRunningDiscord() {
    try {
        if (process.platform === "win32") {
            execSync("taskkill /F /IM Discord.exe /IM DiscordPTB.exe /IM DiscordCanary.exe /IM DiscordDevelopment.exe", { stdio: "ignore" });
        } else if (process.platform === "linux") {
            execSync("killall -q discord discord-ptb discord-canary discord-development Discord DiscordPTB DiscordCanary DiscordDevelopment 2>/dev/null || true", { stdio: "ignore" });
        } else if (process.platform === "darwin") {
            execSync("killall -q Discord 'Discord PTB' 'Discord Canary' 'Discord Development' 2>/dev/null || true", { stdio: "ignore" });
        }
    } catch {}
}

function patchTarget(target) {
    const appAsar = join(target.resourcesDir, "app.asar");
    const backupAsar = join(target.resourcesDir, "_app.asar");

    try {
        if (existsSync(appAsar)) {
            const isDir = lstatSync(appAsar).isDirectory();
            if (!isDir) {
                if (!existsSync(backupAsar)) {
                    renameSync(appAsar, backupAsar);
                } else {
                    rmSync(appAsar, { force: true });
                }
            }
        }

        if (!existsSync(appAsar)) {
            mkdirSync(appAsar, { recursive: true });
        }

        writeFileSync(join(appAsar, "package.json"), JSON.stringify({ name: "discord", main: "index.js" }));
        const patcherPathNormalized = PATCHER_JS.replace(/\\/g, "/");
        const indexJsShim = `const fs = require("fs");
const path = require("path");
const patcher = ${JSON.stringify(patcherPathNormalized)};

if (fs.existsSync(patcher)) {
    try {
        require(patcher);
    } catch (err) {
        console.error("[Qualcord] Error loading patcher, falling back to vanilla Discord:", err);
        const originalAsar = path.join(__dirname, "..", "_app.asar");
        if (fs.existsSync(originalAsar)) require(originalAsar);
        else throw err;
    }
} else {
    console.warn("[Qualcord] Patcher missing, falling back to vanilla Discord.");
    const originalAsar = path.join(__dirname, "..", "_app.asar");
    if (fs.existsSync(originalAsar)) require(originalAsar);
    else throw new Error("[Qualcord] Missing patcher and original _app.asar!");
}
`;
        writeFileSync(join(appAsar, "index.js"), indexJsShim);

        if (target.flatpakId && process.platform === "linux") {
            try {
                console.log(`Setting Flatpak filesystem override for ${target.flatpakId}...`);
                execSync(`flatpak override --user ${target.flatpakId} --filesystem="${BASE_DIR}"`, { stdio: "inherit" });
            } catch (fpErr) {
                console.warn(`Could not set flatpak override automatically: ${fpErr}`);
            }
        }

        console.log(`✅ [Qualcord] Successfully injected into ${target.name}!`);
        return true;
    } catch (err) {
        console.error(`❌ [Qualcord] Failed to patch ${target.name}:`, err);
        return false;
    }
}

function unpatchTarget(target) {
    const appAsar = join(target.resourcesDir, "app.asar");
    const backupAsar = join(target.resourcesDir, "_app.asar");

    try {
        if (!existsSync(backupAsar)) {
            console.log(`ℹ️ [Qualcord] ${target.name} is not patched (no _app.asar found).`);
            return false;
        }

        if (existsSync(appAsar)) {
            const isDir = lstatSync(appAsar).isDirectory();
            if (isDir) {
                rmSync(appAsar, { recursive: true, force: true });
            }
        }

        renameSync(backupAsar, appAsar);
        console.log(`✅ [Qualcord] Successfully removed patch from ${target.name}!`);
        return true;
    } catch (err) {
        console.error(`❌ [Qualcord] Failed to unpatch ${target.name}:`, err);
        return false;
    }
}

function main() {
    const args = process.argv.slice(2);
    const isUninstall = args.includes("--uninstall") || args.includes("-u");
    const isRepair = args.includes("--repair");

    console.log("====================================================");
    console.log("         ⚡ Qualcord Universal Injector");
    console.log("====================================================");
    console.log(`Platform: ${process.platform} (${process.arch})`);

    const targets = findDiscordInstallations();
    if (targets.length === 0) {
        console.error("❌ No supported Discord installation found on your system!");
        console.error("If you have a custom install path, make sure 'resources/app.asar' exists.");
        process.exit(1);
    }

    console.log(`Found ${targets.length} Discord installation(s):`);
    for (const t of targets) {
        console.log(` - ${t.name}: ${t.resourcesDir}`);
    }

    closeRunningDiscord();

    if (isUninstall) {
        console.log("\nUninjecting Qualcord from Discord...");
        let count = 0;
        for (const t of targets) {
            if (unpatchTarget(t)) count++;
        }
        console.log(`\nDone! Successfully unpatched ${count} installation(s).`);
        return;
    }

    if (!existsSync(PATCHER_JS)) {
        console.error(`\n❌ Error: Built patcher not found at: ${PATCHER_JS}`);
        console.error("Please run 'pnpm build' or 'pnpm buildStandalone' first!\n");
        process.exit(1);
    }

    console.log(`\nInjecting Qualcord dev build: ${PATCHER_JS}`);
    let patched = 0;
    for (const t of targets) {
        if (patchTarget(t)) patched++;
    }

    console.log(`\n🚀 Finished! Patched ${patched} installation(s). Restart Discord to use Qualcord!`);
}

main();
