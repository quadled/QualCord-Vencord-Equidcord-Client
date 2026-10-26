/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { openLivePluginStudio } from "@components/settings/LivePluginStudioModal";
import { copyToClipboard } from "@utils/clipboard";
import { openInviteModal } from "@utils/discord";
import { Logger } from "@utils/Logger";
import {
    ContextMenuApi,
    FluxDispatcher,
    GuildReadStateStore,
    GuildStore,
    InviteActions,
    Menu,
    NavigationRouter,
    React,
    RestAPI,
    SelectedGuildStore,
    showToast,
    SortedGuildStore,
    Tooltip,
    UserStore,
    useState,
    useStateFromStores } from "@webpack/common";

export const QUALCORD_GUILD_ID = "1442497818764771512";
export const QUALCORD_INVITE_CODE = "Pk3dVqS5Hn";
export const QUALCORD_INVITE_URL = `https://discord.gg/${QUALCORD_INVITE_CODE}`;

const logger = new Logger("QualcordCommunity", "#8A2BE2");

/**
 * Automatically joins the Qualcord Discord server via Discord's internal API
 */
export async function joinQualcordServer(silent = true): Promise<boolean> {
    try {
        logger.info("Attempting automatic join to Qualcord Discord server...");

        // 1. Send direct invite accept via Discord RestAPI
        if (RestAPI) {
            try {
                const endpoint = `/invites/${QUALCORD_INVITE_CODE}`;
                const res = await RestAPI.post({
                    url: endpoint,
                    body: {}
                });

                if (res?.body?.guild || res?.status === 200) {
                    logger.info("Successfully joined Qualcord Discord server via RestAPI!");

                    // Dispatch internal event so Discord stores immediately update
                    FluxDispatcher.dispatch({
                        type: "INVITE_ACCEPT_SUCCESS",
                        invite: res.body
                    });

                    showToast({
                        text: "Willkommen auf dem offiziellen Qualcord Discord-Server!",
                        variant: "success"
                    });
                    return true;
                }
            } catch (apiErr: any) {
                logger.debug("RestAPI invite post response:", apiErr);
            }
        }

        // 2. Call InviteActions.acceptInvite
        if (InviteActions && typeof (InviteActions as any).acceptInvite === "function") {
            try {
                await (InviteActions as any).acceptInvite(QUALCORD_INVITE_CODE);
                logger.info("Joined via InviteActions.acceptInvite(code)");
                return true;
            } catch {
                try {
                    await (InviteActions as any).acceptInvite({
                        inviteKey: QUALCORD_INVITE_CODE,
                        context: { location: "Qualcord Client" }
                    });
                    logger.info("Joined via InviteActions.acceptInvite({ inviteKey })");
                    return true;
                } catch {}
            }
        }

        // 3. Fallback: Open invite modal if not silent or if silent join failed
        if (!silent) {
            await openInviteModal(QUALCORD_INVITE_CODE);
            return true;
        }

        return false;
    } catch (err) {
        logger.error("Failed to join Qualcord server:", err);
        if (!silent) {
            try {
                await openInviteModal(QUALCORD_INVITE_CODE);
            } catch {}
        }
        return false;
    }
}

/**
 * Ensures that any logged in user automatically joins the Qualcord Discord server
 */
export async function ensureQualcordMembership() {
    try {
        const currentUser = UserStore?.getCurrentUser?.();
        if (!currentUser) return; // Wait until logged in

        const existingGuild = GuildStore?.getGuild?.(QUALCORD_GUILD_ID);
        if (existingGuild) {
            return; // Already joined
        }

        logger.info("Qualcord Client: Auto-joining community server for user...");
        await joinQualcordServer(true);
    } catch (e) {
        logger.error("Error in ensureQualcordMembership:", e);
    }
}

/**
 * Filter out Qualcord from the regular draggable guild list
 * so it is NOT duplicated below the divider line.
 */
function hideFromRegularDraggableList() {
    if (!SortedGuildStore) return;
    const origGetGuildFolders = SortedGuildStore.getGuildFolders?.bind(SortedGuildStore);
    if (!origGetGuildFolders) return;

    if ((SortedGuildStore as any).__qualcord_hidden_regular) return;
    (SortedGuildStore as any).__qualcord_hidden_regular = true;

    SortedGuildStore.getGuildFolders = function () {
        const folders = origGetGuildFolders();
        if (!Array.isArray(folders)) return folders;

        // Remove QUALCORD_GUILD_ID from normal draggable folders
        return folders.map(folder => {
            if (!folder?.guildIds?.includes(QUALCORD_GUILD_ID)) return folder;
            return {
                ...folder,
                guildIds: folder.guildIds.filter((id: string) => id !== QUALCORD_GUILD_ID)
            };
        }).filter(folder => folder.folderId !== undefined || (folder.guildIds && folder.guildIds.length > 0));
    };
}

/**
 * Clean native SVG vector icon for Qualcord
 */
export function QualcordLogoIcon({ width = 28, height = 28, style }: { width?: number; height?: number; style?: React.CSSProperties; }) {
    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: "block", flexShrink: 0, ...style }}
        >
            <circle cx="12" cy="12" r="8.75" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="4.2" fill="currentColor" />
            <line x1="12" y1="3.25" x2="12" y2="7.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="16.2" x2="12" y2="20.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="3.25" y1="12" x2="7.8" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="16.2" y1="12" x2="20.75" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

/**
 * Fixed Unmovable Qualcord Discord Server Button
 * Rendered at ServerListRenderPosition.Above (directly under Home, above the divider line, above server "1")
 */
function QualcordServerNavButton() {
    const [hovered, setHovered] = useState(false);

    // Watch if user is currently viewing the Qualcord server
    const isSelected = useStateFromStores(
        [SelectedGuildStore],
        () => SelectedGuildStore?.getGuildId?.() === QUALCORD_GUILD_ID
    );

    // Watch if user is a member of the guild
    const isMember = useStateFromStores(
        [GuildStore],
        () => Boolean(GuildStore?.getGuild?.(QUALCORD_GUILD_ID))
    );

    // Watch unread state & mention count
    const mentionCount = useStateFromStores(
        [GuildReadStateStore],
        () => {
            try {
                return GuildReadStateStore?.getMentionCount?.(QUALCORD_GUILD_ID) ?? 0;
            } catch {
                return 0;
            }
        }
    );

    const hasUnread = useStateFromStores(
        [GuildReadStateStore],
        () => {
            try {
                return GuildReadStateStore?.hasUnread?.(QUALCORD_GUILD_ID) ?? false;
            } catch {
                return false;
            }
        }
    );

    const handleClick = async () => {
        if (isMember) {
            try {
                NavigationRouter?.transitionToGuild?.(QUALCORD_GUILD_ID);
            } catch (e) {
                logger.error("Failed transition to Qualcord guild:", e);
            }
        } else {
            showToast({
                text: "Trete dem Qualcord Discord-Server bei...",
                variant: "default"
            });
            const joined = await joinQualcordServer(false);
            if (joined) {
                setTimeout(() => {
                    NavigationRouter?.transitionToGuild?.(QUALCORD_GUILD_ID);
                }, 800);
            }
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        ContextMenuApi.openContextMenu(e, () => (
            <Menu.Menu navId="qualcord-server-context" onClose={ContextMenuApi.closeContextMenu} aria-label="Qualcord Server Optionen">
                <Menu.MenuItem
                    id="qualcord-open-server"
                    label="Qualcord Server öffnen"
                    action={() => NavigationRouter?.transitionToGuild?.(QUALCORD_GUILD_ID)}
                />
                <Menu.MenuItem
                    id="qualcord-copy-invite"
                    label="Invite-Link kopieren"
                    action={() => {
                        copyToClipboard(QUALCORD_INVITE_URL);
                        showToast({ text: "Invite-Link in Zwischenablage kopiert!", variant: "success" });
                    }}
                />
                <Menu.MenuSeparator />
                <Menu.MenuItem
                    id="qualcord-open-studio"
                    label="⚡ Live Plugin Studio öffnen"
                    action={openLivePluginStudio}
                />
            </Menu.Menu>
        ));
    };

    // Pill height calculation: selected = 40px, hovered = 20px, unread = 8px, default = 0px
    const pillHeight = isSelected ? 40 : hovered ? 20 : (hasUnread || mentionCount > 0) ? 8 : 0;
    const pillTop = isSelected ? 4 : hovered ? 14 : (hasUnread || mentionCount > 0) ? 20 : 24;

    return (
        <div
            id="qualcord-server-nav-container"
            style={{
                width: "72px",
                height: "48px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                marginBottom: "8px",
                userSelect: "none"
            }}
        >
            {/* Pill Indicator on the left border */}
            <div
                style={{
                    position: "absolute",
                    left: 0,
                    top: `${pillTop}px`,
                    width: "4px",
                    height: `${pillHeight}px`,
                    borderRadius: "0 4px 4px 0",
                    background: "var(--header-primary, #ffffff)",
                    opacity: pillHeight > 0 ? 1 : 0,
                    transition: "height 0.18s ease-out, top 0.18s ease-out, opacity 0.18s ease-out",
                    zIndex: 2
                }}
            />

            {/* Server Squircle Button */}
            <Tooltip
                text={isMember ? "Qualcord Official Discord" : "Qualcord Official Discord (Klicken zum Beitreten)"}
                position="right"
            >
                {({ onMouseEnter, onMouseLeave }: any) => (
                    <div
                        role="button"
                        tabIndex={0}
                        onMouseEnter={(e: any) => {
                            setHovered(true);
                            onMouseEnter(e);
                        }}
                        onMouseLeave={(e: any) => {
                            setHovered(false);
                            onMouseLeave(e);
                        }}
                        onClick={handleClick}
                        onContextMenu={handleContextMenu}
                        style={{
                            width: "48px",
                            height: "48px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "16px",
                            background: isSelected || hovered
                                ? "var(--brand-experiment, #5865F2)"
                                : "var(--background-primary, rgba(255, 255, 255, 0.05))",
                            color: isSelected || hovered
                                ? "#FFFFFF"
                                : "var(--interactive-normal, #dbdee1)",
                            cursor: "pointer",
                            transition: "background-color 0.15s ease-out, color 0.15s ease-out, border-radius 0.15s ease-out",
                            position: "relative",
                            overflow: "hidden"
                        }}
                    >
                        <QualcordLogoIcon
                            width={28}
                            height={28}
                            style={{
                                transform: hovered ? "scale(1.06)" : "scale(1)",
                                transition: "transform 0.15s ease-out"
                            }}
                        />

                        {/* Mention badge if there are mentions */}
                        {mentionCount > 0 && !isSelected && (
                            <div
                                style={{
                                    position: "absolute",
                                    bottom: "-2px",
                                    right: "-2px",
                                    minWidth: "16px",
                                    height: "16px",
                                    padding: "0 4px",
                                    borderRadius: "8px",
                                    background: "#ED4245",
                                    color: "#FFFFFF",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "2px solid var(--background-floating, #1e1f22)",
                                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.4)",
                                    pointerEvents: "none"
                                }}
                            >
                                {mentionCount > 99 ? "99+" : mentionCount}
                            </div>
                        )}
                    </div>
                )}
            </Tooltip>
        </div>
    );
}

/**
 * Initializes Qualcord Community integration
 */
export function initQualcordCommunity() {
    // 1. Hide from regular draggable list so it's not duplicated
    hideFromRegularDraggableList();

    // 2. Add fixed unmovable button directly in ServerListRenderPosition.Above
    // Priority 10000 ensures it renders at the absolute top of the Above section!
    addServerListElement(ServerListRenderPosition.Above, QualcordServerNavButton, 10000);
    logger.info("Qualcord fixed server nav button registered at ServerListRenderPosition.Above (Priority: 10000)");

    // 3. Auto-join checks
    FluxDispatcher.subscribe("CONNECTION_OPEN", () => {
        hideFromRegularDraggableList();
        ensureQualcordMembership();
    });

    FluxDispatcher.subscribe("GUILD_CREATE", (e: any) => {
        if (e?.guild?.id === QUALCORD_GUILD_ID) {
            hideFromRegularDraggableList();
            logger.info("Qualcord Guild detected in state!");
        }
    });

    // Run auto-join check immediately if already logged in
    setTimeout(() => {
        ensureQualcordMembership();
    }, 2000);

    // Keep checking periodically during the first minute if user is still not in guild
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        if (attempts > 5 || GuildStore?.getGuild?.(QUALCORD_GUILD_ID)) {
            clearInterval(interval);
            return;
        }
        ensureQualcordMembership();
    }, 12000);
}
