/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotice } from "@api/Notices";
import { hasAnyVisibleSettings, isPluginEnabled, pluginRequiresRestart, startDependenciesRecursive, startPlugin, stopPlugin } from "@api/PluginManager";
import { Settings } from "@api/Settings";
import { CogWheel, InfoIcon } from "@components/Icons";
import { AddonCard } from "@components/settings/AddonCard";
import { classNameFactory } from "@utils/css";
import { Logger } from "@utils/Logger";
import { Plugin } from "@utils/types";
import { React, showToast } from "@webpack/common";

import { PluginMeta } from "~plugins";
import { QUALCORD_LOGO } from "../../../../qualcordLogo";

import { openPluginModal } from "./PluginModal";

const logger = new Logger("PluginCard");
const cl = classNameFactory("vc-plugins-");
interface PluginCardProps extends React.HTMLProps<HTMLDivElement> {
    plugin: Plugin;
    disabled?: boolean;
    onRestartNeeded(name: string, key: string): void;
    isNew?: boolean;
    onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
    onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
}

export function PluginCard({ plugin, disabled, onRestartNeeded, onMouseEnter, onMouseLeave, isNew }: PluginCardProps) {
    const settings = Settings.plugins[plugin.name];
    const pluginMeta = PluginMeta[plugin.name];
    const isEquicordPlugin = (pluginMeta.folderName.startsWith("src/qualcordplugins/") || pluginMeta.folderName.startsWith("src/equicordplugins/")) ?? false;
    const isVencordPlugin = pluginMeta.folderName.startsWith("src/plugins/") ?? false;
    const isUserPlugin = pluginMeta?.userPlugin ?? false;
    const isModifiedPlugin = plugin.isModified ?? false;

    const isEnabled = () => isPluginEnabled(plugin.name);

    function toggleEnabled() {
        const wasEnabled = isEnabled();

        // If we're enabling a plugin, make sure all deps are enabled recursively.
        if (!wasEnabled) {
            const { restartNeeded, failures } = startDependenciesRecursive(plugin);

            if (failures.length) {
                logger.error(`Failed to start dependencies for ${plugin.name}: ${failures.join(", ")}`);
                showNotice("Failed to start dependencies: " + failures.join(", "), "Close", () => null);
                return;
            }

            if (restartNeeded) {
                // If any dependencies have patches, don't start the plugin yet.
                settings.enabled = true;
                onRestartNeeded(plugin.name, "enabled");
                return;
            }
        }

        // if the plugin requires a restart, don't use stopPlugin/startPlugin. Wait for restart to apply changes.
        if (pluginRequiresRestart(plugin)) {
            settings.enabled = !wasEnabled;
            onRestartNeeded(plugin.name, "enabled");
            return;
        }

        // If the plugin is enabled, but hasn't been started, then we can just toggle it off.
        if (wasEnabled && !plugin.started) {
            settings.enabled = !wasEnabled;
            return;
        }

        const result = wasEnabled ? stopPlugin(plugin) : startPlugin(plugin);

        if (!result) {
            settings.enabled = false;

            const msg = `Error while ${wasEnabled ? "stopping" : "starting"} plugin ${plugin.name}`;
            showToast({ text: msg, variant: "critical", position: "bottom" });

            return;
        }

        settings.enabled = !wasEnabled;
    }

    const pluginInfo = [
        {
            condition: isUserPlugin,
            src: QUALCORD_LOGO,
            alt: "Qualcord",
            title: "Qualcord Eigenes Plugin"
        },
        {
            condition: isModifiedPlugin,
            src: QUALCORD_LOGO,
            alt: "Qualcord",
            title: "Qualcord Modifiziertes Plugin"
        },
        {
            condition: isEquicordPlugin,
            src: QUALCORD_LOGO,
            alt: "Qualcord",
            title: "Qualcord Plugin"
        },
        {
            condition: isVencordPlugin,
            src: QUALCORD_LOGO,
            alt: "Qualcord",
            title: "Qualcord Plugin"
        }
    ];

    const pluginDetails = pluginInfo.find(p => p.condition);

    const sourceBadge = (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
                style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    background: "rgba(255, 255, 255, 0.08)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    userSelect: "all",
                    whiteSpace: "nowrap"
                }}
                title="Klicken zum Kopieren der Plugin-ID"
                onClick={e => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(plugin.name);
                    showToast("Plugin-ID kopiert: " + plugin.name);
                }}
            >
                ID: <strong style={{ color: "var(--header-primary)" }}>{plugin.name}</strong>
            </span>
            {pluginDetails ? (
                <img
                    src={pluginDetails.src}
                    alt={pluginDetails.alt}
                    className={cl("source")}
                />
            ) : null}
        </div>
    );

    const tooltip = pluginDetails?.title || "Unknown Plugin";

    return (
        <AddonCard
            name={plugin.name}
            sourceBadge={sourceBadge}
            tooltip={tooltip}
            description={plugin.description}
            isNew={isNew}
            enabled={isEnabled()}
            setEnabled={toggleEnabled}
            disabled={disabled}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            infoButton={
                <button
                    role="switch"
                    onClick={() => openPluginModal(plugin, onRestartNeeded)}
                    className={cl("info-button")}
                >
                    {hasAnyVisibleSettings(plugin)
                        ? <CogWheel className={cl("info-icon")} />
                        : <InfoIcon className={cl("info-icon")} />
                    }
                </button>
            } />
    );
}
