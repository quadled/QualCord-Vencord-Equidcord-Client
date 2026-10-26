/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcEvents } from "@shared/IpcEvents";
import { ipcMain } from "electron";
import { existsSync } from "fs";
import { join } from "path";

import gitRemote from "~git-remote";

import { serializeErrors } from "./common";
import GitUpdater from "./git";
import HttpUpdater from "./http";

export type UpdateData = Record<"hash" | "message" | "author", string>;

export interface Updater {
    getRepo(): Promise<string>;
    listUpdates(): Promise<UpdateData[]>;
    fetchUpdate(): Promise<boolean>;
    applyUpdate(): Promise<boolean>;
}

const EQUICORD_DIR = join(__dirname, "../../");

function canUseGit(): boolean {
    if (IS_STANDALONE) return false;
    try {
        return existsSync(join(EQUICORD_DIR, ".git")) || existsSync(join(__dirname, "../.git"));
    } catch {
        return false;
    }
}

const updater: Updater = IS_UPDATER_DISABLED
    ? {
        getRepo: async () => `https://github.com/${gitRemote || "quadled/QualCord-Vencord-Equidcord-Client"}`,
        listUpdates: async () => [],
        fetchUpdate: async () => false,
        applyUpdate: async () => false,
    }
    : {
        getRepo: async () => {
            return `https://github.com/${gitRemote || "quadled/QualCord-Vencord-Equidcord-Client"}`;
        },

        listUpdates: async () => {
            if (canUseGit()) {
                try {
                    return await GitUpdater.listUpdates();
                } catch (e) {
                    console.warn("[Qualcord Updater] Git check failed, falling back to HTTP:", e);
                }
            }
            return await HttpUpdater.listUpdates();
        },

        fetchUpdate: async () => {
            if (canUseGit()) {
                try {
                    return await GitUpdater.fetchUpdate();
                } catch (e) {
                    console.warn("[Qualcord Updater] Git fetch failed, falling back to HTTP:", e);
                }
            }
            return await HttpUpdater.fetchUpdate();
        },

        applyUpdate: async () => {
            if (canUseGit()) {
                try {
                    return await GitUpdater.applyUpdate();
                } catch (e) {
                    console.warn("[Qualcord Updater] Git apply failed, falling back to HTTP:", e);
                }
            }
            return await HttpUpdater.applyUpdate();
        }
    };

ipcMain.handle(IpcEvents.UPDATER_GET_REPO, serializeErrors(updater.getRepo));
ipcMain.handle(IpcEvents.UPDATER_LIST_UPDATES, serializeErrors(updater.listUpdates));
ipcMain.handle(IpcEvents.UPDATER_FETCH_UPDATE, serializeErrors(updater.fetchUpdate));
ipcMain.handle(IpcEvents.UPDATER_APPLY_UPDATE, serializeErrors(updater.applyUpdate));

export default updater;
