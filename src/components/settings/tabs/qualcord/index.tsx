/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./QualcordTab.css";

import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { useSettings } from "@api/Settings";
import { Divider } from "@components/Divider";
import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { FolderIcon, LogIcon, PaintbrushIcon, PluginsIcon, RestartIcon } from "@components/Icons";
import { Notice } from "@components/Notice";
import { Paragraph } from "@components/Paragraph";
import { openLivePluginStudio, openPluginModal, openQualcordUpdateModal, SettingsTab, wrapTab } from "@components/settings";
import { QuickAction, QuickActionCard } from "@components/settings/QuickAction";
import BadgeAPI from "@plugins/_api/badges";
import SettingsPlugin from "@plugins/_core/settings";
import { DONOR_ROLE_ID, GUILD_ID, IS_WINDOWS, VC_DONOR_ROLE_ID, VC_GUILD_ID } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { Margins } from "@utils/margins";
import { relaunch } from "@utils/native";
import { promptToRestart } from "@utils/promptToRestart";
import { GuildMemberStore, React, useMemo } from "@webpack/common";

import { PluginMeta } from "~plugins";

import { QUALCORD_LOGO } from "../../../../qualcordLogo";
import { QUALCORD_VERSION } from "../../../../qualcordVersion";
import { MacOSVibrancySettings } from "./MacVibrancySettings";
import { NotificationSection } from "./NotificationSettings";
import { WindowsMaterialSettings } from "./WindowsMaterialSettings";

const DEFAULT_DONATE_IMAGE = "https://cdn.discordapp.com/emojis/1026533090627174460.png";
const SHIGGY_DONATE_IMAGE = "https://equicord.org/assets/favicon.png";

const VENNIE_DONATOR_IMAGE = "https://cdn.discordapp.com/emojis/1238120638020063377.png";
const COZY_CONTRIB_IMAGE = "https://cdn.discordapp.com/emojis/1026533070955872337.png";

const DONOR_BACKGROUND_IMAGE = "https://media.discordapp.net/stickers/1311070116305436712.png?size=2048";
const CONTRIB_BACKGROUND_IMAGE = "https://media.discordapp.net/stickers/1311070166481895484.png?size=2048";

const cl = classNameFactory("vc-vencord-tab-");

type KeysOfType<Object, Type> = {
    [K in keyof Object]: Object[K] extends Type ? K : never;
}[keyof Object];

function Switches() {
    const settings = useSettings(["useQuickCss", "enableReactDevtools", "mainWindowFrameless", "frameless", "nativeTitleBar", "transparent", "winCtrlQ", "disableMinSize"]);

    const Switches = [
        {
            key: "useQuickCss",
            title: "Eigenes CSS (QuickCSS) aktivieren",
            description: "Wendet deine in QuickCSS definierten Styles an"
        },
        (!IS_WEB && !IS_DISCORD_DESKTOP || !IS_WINDOWS) && {
            key: "mainWindowFrameless",
            title: "Fensterrahmen des Hauptfensters entfernen",
            description: "Entfernt den nativen Fensterrahmen für einen modernen, randlosen Look.",
            restartRequired: true,
        },
        !IS_WEB && (!IS_DISCORD_DESKTOP || !IS_WINDOWS
            ? {
                key: "frameless",
                title: "Alle Fensterrahmen entfernen",
                description: "Entfernt alle Fensterrahmen für einen randlosen Look.",
                restartRequired: true,
            }
            : {
                key: "nativeTitleBar",
                title: "Standard Windows-Titelleiste verwenden",
                description: "Ersetzt die benutzerdefinierte Discord-Titelleiste durch die Standard-Windows-Leiste.",
                restartRequired: true,
            }
        ),
        !IS_WEB && {
            key: "transparent",
            title: "Fenstertransparenz aktivieren",
            description: "Macht das Discord-Fenster transparent (erfordert ein Theme mit Transparenz-Support).",
            restartRequired: true,
            warning: IS_WINDOWS
                ? "Das Fenster kann bei aktivierter Transparenz unter Windows nicht mehr an Bildschirmränder angedockt werden."
                : "Das Fenster kann bei aktivierter Transparenz nicht mehr in der Größe verändert werden.",
        },
        IS_DISCORD_DESKTOP && {
            key: "disableMinSize",
            title: "Minimale Fenstergröße aufheben",
            description: "Erlaubt es dir, das Discord-Fenster beliebig klein zu skalieren.",
            restartRequired: true
        },
        !IS_WEB && IS_WINDOWS && {
            key: "winCtrlQ",
            title: "Strg + Q als Tastenkürzel zum Beenden aktivieren",
            description: "Ermöglicht das schnelle Schließen von Discord mit Strg + Q.",
            restartRequired: true,
        },
        !IS_WEB && {
            key: "enableReactDevtools",
            title: "React Developer Tools aktivieren",
            description: "Nützlich für die Entwicklung eigener Plugins und das Untersuchen von Komponenten.",
            restartRequired: true
        },
    ] satisfies Array<false | {
        key: KeysOfType<typeof settings, boolean>;
        title: string;
        description?: string;
        restartRequired?: boolean;
        warning?: string;
    }>;

    return Switches.map(setting => {
        if (!setting) {
            return null;
        }

        const { key, title, description, restartRequired, warning } = setting;

        return (
            <FormSwitch
                key={key}
                title={title}
                description={
                    warning ? (
                        <>
                            {description}
                            <Notice.Warning className={Margins.top8} style={{ width: "100%" }}>
                                {warning}
                            </Notice.Warning>
                        </>
                    ) : (
                        description
                    )
                }
                value={settings[key]}
                hideBorder
                onChange={v => {
                    settings[key] = v;

                    if (restartRequired) {
                        promptToRestart("relaunch");
                    }
                }}
            />
        );
    });
}

function QualcordSettings() {
    const settings = useSettings(["plugins.*"]);
    const activePlugins = useMemo(() =>
        Object.values(settings.plugins || {}).filter(p => p?.enabled).length,
        [settings.plugins]
    );
    const userPlugins = useMemo(() =>
        Object.values(PluginMeta || {}).filter(m => m?.userPlugin).length,
        []
    );

    return (
        <SettingsTab>
            {/* Individuelles HTML-Dashboard für Qualcord */}
            <div className="qualcord-dashboard">
                <div className="qualcord-header">
                    <div className="qualcord-title-group">
                        <img
                            src={QUALCORD_LOGO}
                            alt="Qualcord"
                            width={38}
                            height={38}
                            style={{
                                borderRadius: "50%",
                                boxShadow: "0 0 14px rgba(138, 43, 226, 0.7)",
                                border: "2px solid rgba(255, 255, 255, 0.2)",
                                flexShrink: 0
                            }}
                        />
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "24px", fontWeight: "900", color: "#ffffff", letterSpacing: "-0.5px" }}>
                                Qualcord
                            </span>
                            <span className="qualcord-badge">v{QUALCORD_VERSION}</span>
                        </div>
                    </div>
                    <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.8)", background: "rgba(255, 255, 255, 0.12)", padding: "4px 10px", borderRadius: "20px", fontWeight: 600 }}>
                        ● System Aktiv
                    </span>
                </div>

                <p style={{ margin: "0 0 16px 0", color: "#dbdee1", fontSize: "14px", lineHeight: "1.5" }}>
                    Dein maßgeschneiderter Discord-Client mit voller Plugin-Unterstützung und individuellem HTML/CSS-Design.
                </p>

                {/* Live Stats gerendert in HTML */}
                <div className="qualcord-stats-grid">
                    <div className="qualcord-stat-card">
                        <span className="qualcord-stat-value">{activePlugins}</span>
                        <span className="qualcord-stat-label">🚀 Aktive Plugins</span>
                    </div>
                    <div className="qualcord-stat-card">
                        <span className="qualcord-stat-value">{userPlugins}</span>
                        <span className="qualcord-stat-label">📁 Eigene Plugins</span>
                    </div>
                    <div className="qualcord-stat-card">
                        <span className="qualcord-stat-value" style={{ color: "#57F287" }}>Online</span>
                        <span className="qualcord-stat-label">⚡ Client-Status</span>
                    </div>
                </div>
            </div>

            {/* Live Plugin Studio Highlight Banner */}
            <div
                style={{
                    background: "linear-gradient(135deg, rgba(88, 101, 242, 0.25), rgba(138, 43, 226, 0.35))",
                    border: "1px solid rgba(138, 43, 226, 0.5)",
                    borderRadius: "10px",
                    padding: "16px 20px",
                    marginTop: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px"
                }}
            >
                <div>
                    <div style={{ fontWeight: 800, fontSize: "16px", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>⚡ Qualcord Live Plugin Studio</span>
                        <span style={{ fontSize: "10px", background: "#5865F2", color: "#fff", padding: "2px 8px", borderRadius: "10px" }}>NEU</span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#dbdee1", marginTop: "4px" }}>
                        Programmiere und teste eigene Plugins live in Discord – ohne Neustart mit Sofortausführung!
                    </div>
                </div>
                <button
                    onClick={openLivePluginStudio}
                    style={{
                        background: "linear-gradient(135deg, #5865F2, #8A2BE2)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        padding: "10px 18px",
                        fontWeight: 700,
                        fontSize: "13px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        boxShadow: "0 4px 12px rgba(88, 101, 242, 0.4)"
                    }}
                >
                    Studio öffnen
                </button>
            </div>

            <Heading className={Margins.top16}>Schnellaktionen</Heading>
            <Paragraph className={Margins.bottom16}>
                Häufig genutzte Werkzeuge für deinen Client, Themes und Einstellungen.
            </Paragraph>

            <QuickActionCard>
                <QuickAction
                    Icon={PluginsIcon}
                    text="Live Plugin Studio"
                    action={openLivePluginStudio}
                />
                <QuickAction
                    Icon={LogIcon}
                    text={`Was ist neu? (v${QUALCORD_VERSION})`}
                    action={openQualcordUpdateModal}
                />
                <QuickAction
                    Icon={PaintbrushIcon}
                    text="QuickCSS bearbeiten"
                    action={() => VencordNative.quickCss.openEditor()}
                />
                {!IS_WEB && (
                    <QuickAction
                        Icon={RestartIcon}
                        text="Discord neu starten"
                        action={relaunch}
                    />
                )}
                {!IS_WEB && (
                    <QuickAction
                        Icon={FolderIcon}
                        text="Themes-Ordner öffnen"
                        action={() => VencordNative.themes.openFolder()}
                    />
                )}
                {!IS_WEB && (
                    <QuickAction
                        Icon={FolderIcon}
                        text="Einstellungen-Ordner"
                        action={() => VencordNative.settings.openFolder()}
                    />
                )}
                <QuickAction
                    Icon={LogIcon}
                    text="Benachrichtigungs-Log"
                    action={openNotificationLogModal}
                />
            </QuickActionCard>

            <Divider className={Margins.top20} />

            <Heading className={Margins.top20}>Client-Einstellungen</Heading>
            <Paragraph className={Margins.bottom16}>
                Passe das Verhalten und das Aussehen von Qualcord und Discord an deine Vorlieben an.
            </Paragraph>
            <Notice.Info className={Margins.bottom20} style={{ width: "100%" }}>
                Du kannst festlegen, an welcher Position dieser Einstellungsbereich in der Discord-Leiste angezeigt wird, indem du das{" "}
                <a
                    role="button"
                    onClick={() => openPluginModal(SettingsPlugin)}
                    style={{ cursor: "pointer", color: "var(--text-link)" }}
                >
                    Settings Plugin
                </a> anpasst.
            </Notice.Info>

            <Switches />

            <MacOSVibrancySettings />
            <WindowsMaterialSettings />

            <NotificationSection />
        </SettingsTab >
    );
}

export default wrapTab(QualcordSettings, "Qualcord Settings");

export function isEquicordDonor(userId: string): boolean {
    const donorBadges = BadgeAPI.getEquicordDonorBadges(userId);
    return GuildMemberStore.getMember(GUILD_ID, userId)?.roles.includes(DONOR_ROLE_ID) || !!donorBadges;
}

export function isVencordDonor(userId: string): boolean {
    const donorBadges = BadgeAPI.getDonorBadges(userId);
    return GuildMemberStore.getMember(VC_GUILD_ID, userId)?.roles.includes(VC_DONOR_ROLE_ID) || !!donorBadges;
}
