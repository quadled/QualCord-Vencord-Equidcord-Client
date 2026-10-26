/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import gitHash from "~git-hash";
import gitRemote from "~git-remote";

export { gitHash, gitRemote };

export const gitHashShort = gitHash.slice(0, 9);
export const QUALCORD_USER_AGENT = `Qualcord/${gitHash}${gitRemote ? ` (https://github.com/${gitRemote})` : ""}`;
export const QUALCORD_USER_AGENT_HASHLESS = `Qualcord${gitRemote ? ` (https://github.com/${gitRemote})` : ""}`;

export const VENCORD_USER_AGENT = QUALCORD_USER_AGENT;
export const VENCORD_USER_AGENT_HASHLESS = QUALCORD_USER_AGENT_HASHLESS;
