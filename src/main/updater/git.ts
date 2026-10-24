/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { execFile as cpExecFile } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { promisify } from "util";

import gitRemote from "~git-remote";

import { Updater } from ".";

const VENCORD_SRC_DIR = join(__dirname, "..");
const EQUICORD_DIR = join(__dirname, "../../");

const execFile = promisify(cpExecFile);

const isFlatpak = process.platform === "linux" && !!process.env.FLATPAK_ID;

// Ensure Git executable is discoverable on Windows & macOS
if (process.platform === "darwin") {
    process.env.PATH = `/usr/local/bin:${process.env.PATH}`;
} else if (process.platform === "win32") {
    const gitPaths = [
        "C:\\Program Files\\Git\\cmd",
        "C:\\Program Files\\Git\\bin",
        "C:\\Program Files (x86)\\Git\\cmd",
        "C:\\Program Files (x86)\\Git\\bin",
        `${process.env.LOCALAPPDATA}\\Programs\\Git\\cmd`,
        `${process.env.LOCALAPPDATA}\\Programs\\Git\\bin`
    ];
    for (const p of gitPaths) {
        if (existsSync(p) && !process.env.PATH?.includes(p)) {
            process.env.PATH = `${p};${process.env.PATH}`;
        }
    }
}

function git(...args: string[]) {
    const cwd = existsSync(join(EQUICORD_DIR, ".git")) ? EQUICORD_DIR : VENCORD_SRC_DIR;
    const opts = { cwd };

    if (isFlatpak) return execFile("flatpak-spawn", ["--host", "git", ...args], opts);
    else return execFile("git", args, opts);
}

async function getRepo() {
    try {
        const res = await git("remote", "get-url", "origin");
        const url = res.stdout.trim()
            .replace(/git@(.+):/, "https://$1/")
            .replace(/\.git$/, "");
        if (url) return url;
    } catch {}
    return `https://github.com/${gitRemote || "quadled/QualCord-Vencord-Equidcord-Client"}`;
}

async function calculateGitChanges() {
    await git("fetch");

    const branch = (await git("branch", "--show-current")).stdout.trim() || "main";

    const existsOnOrigin = (await git("ls-remote", "origin", branch)).stdout.length > 0;
    if (!existsOnOrigin) return [];

    const res = await git("log", `HEAD..origin/${branch}`, "--pretty=format:%an/%h/%s");

    const commits = res.stdout.trim();
    return commits ? commits.split("\n").map(line => {
        const [author, hash, ...rest] = line.split("/");
        return {
            hash, author,
            message: rest.join("/").split("\n")[0]
        };
    }) : [];
}

async function pull() {
    const res = await git("pull");
    return res.stdout.includes("Fast-forward");
}

async function build() {
    const opts = { cwd: EQUICORD_DIR };

    const command = isFlatpak ? "flatpak-spawn" : "node";
    const args = isFlatpak ? ["--host", "node", "scripts/build/build.mjs"] : ["scripts/build/build.mjs"];

    if (IS_DEV) args.push("--dev");

    const res = await execFile(command, args, opts);

    return !res.stderr.includes("Build failed");
}

const GitUpdater: Updater = {
    getRepo,
    listUpdates: calculateGitChanges,
    fetchUpdate: pull,
    applyUpdate: build
};

export default GitUpdater;
