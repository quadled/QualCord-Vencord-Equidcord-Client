/*
 * Qualcord Live Plugin Studio - Core Service
 * Allows users to write, test, execute, and persist custom plugins live inside Discord.
 */

import { registerCommand, sendBotMessage, unregisterCommand } from "@api/Commands";
import { ApplicationCommandInputType, ApplicationCommandOptionType, ApplicationCommandType } from "@api/Commands/types";
import * as DataStore from "@api/DataStore";
import { PMLogger, startPlugin, stopPlugin } from "@api/PluginManager";
import { Settings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import * as Webpack from "@webpack";
import { FluxDispatcher, React, showToast } from "@webpack/common";

import Plugins, { PluginMeta } from "~plugins";

export interface LivePlugin {
    id: string;
    name: string;
    description: string;
    author: string;
    code: string;
    enabled: boolean;
    createdAt: number;
    updatedAt: number;
}

const STORAGE_KEY = "qualcord_live_plugins";
const logger = new Logger("LivePluginStudio", "#8A2BE2");

/**
 * Predefined starter templates for users coding live in Discord
 */
export const LIVE_PLUGIN_TEMPLATES: Record<string, { title: string; description: string; code: string; }> = {
    slashCommand: {
        title: "Slash Command (/qualcord)",
        description: "Registriert einen Discord-Slash-Command mit Chat-Antwort",
        code: `// Qualcord Live Plugin - Slash Command Template
export default definePlugin({
    name: "MeinSlashCommand",
    description: "Fuegt den /qualcord Chat-Befehl hinzu",
    authors: [{ name: "Qualcord User" }],

    commands: [
        {
            name: "qualcord",
            description: "Gibt eine benutzerdefinierte Qualcord-Nachricht aus",
            inputType: 0, // BUILT_IN
            execute(args, ctx) {
                showToast("Befehl /qualcord ausgefuehrt!", { variant: "success" });
                return {
                    content: "⚡ Ausgefuehrt mit **Qualcord Live Plugin Studio**!"
                };
            }
        }
    ],

    start() {
        showToast("Plugin 'MeinSlashCommand' ist jetzt aktiv! Tippe /qualcord in den Chat.", { variant: "success" });
    },

    stop() {
        showToast("Plugin 'MeinSlashCommand' wurde beendet.");
    }
});`
    },

    toastNotification: {
        title: "Toast & Status Notification",
        description: "Zeigt Discord-Toast-Meldungen bei Events oder Tastendruck",
        code: `// Qualcord Live Plugin - Toast & Notification Template
export default definePlugin({
    name: "LiveToastNotifier",
    description: "Zeigt stilvolle Benachrichtigungen in Discord an",
    authors: [{ name: "Qualcord User" }],

    start() {
        showToast("Qualcord Live Notifier aktiviert!", {
            variant: "success"
        });

        // Beispiel: Auf Flux Events wie Channel-Wechsel hören
        this.onChannelSelect = (e) => {
            console.log("[LiveToastNotifier] Channel gewechselt:", e.channelId);
        };
        FluxDispatcher.subscribe("CHANNEL_SELECT", this.onChannelSelect);
    },

    stop() {
        if (this.onChannelSelect) {
            FluxDispatcher.unsubscribe("CHANNEL_SELECT", this.onChannelSelect);
        }
        showToast("LiveToastNotifier gestoppt.");
    }
});`
    },

    customCss: {
        title: "Custom CSS / Style Injector",
        description: "Injiziert Live-CSS-Styles direkt in das Discord-Interface",
        code: `// Qualcord Live Plugin - Custom CSS Template
export default definePlugin({
    name: "NeonGlowStyles",
    description: "Verleiht ausgewählten Discord-Elementen einen individuellen Look",
    authors: [{ name: "Qualcord User" }],

    start() {
        const styleId = "qualcord-custom-neon-style";
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
            styleEl = document.createElement("style");
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }

        // Schreibe hier deine CSS-Styles:
        styleEl.textContent = \`
            /* Sanfter violetter Glow-Effekt */
            .sidebar_a4d4d1 {
                box-shadow: inset 0 0 10px rgba(138, 43, 226, 0.2);
            }
        \`;

        showToast("NeonGlowStyles CSS erfolgreich aktiviert!", { variant: "success" });
    },

    stop() {
        const styleEl = document.getElementById("qualcord-custom-neon-style");
        if (styleEl) styleEl.remove();
        showToast("NeonGlowStyles CSS entfernt.");
    }
});`
    },

    chatButton: {
        title: "Chatbar Button",
        description: "Fügt der Discord-Nachrichtenzeile einen neuen Button hinzu",
        code: `// Qualcord Live Plugin - Chatbar Button Template
export default definePlugin({
    name: "CustomChatButton",
    description: "Erstellt einen benutzerdefinierten Button in der Chatbar",
    authors: [{ name: "Qualcord User" }],

    chatBarButton: {
        render: () => {
            return React.createElement("button", {
                style: {
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px 8px",
                    color: "var(--interactive-normal)",
                    display: "flex",
                    alignItems: "center"
                },
                onClick: () => {
                    showToast("⚡ Button geklickt! Grüße von Qualcord!", { variant: "success" });
                },
                title: "Mein Qualcord Button"
            }, "⚡");
        }
    },

    start() {
        showToast("CustomChatButton geladen! Schaue in deine Chatzeile.", { variant: "success" });
    },

    stop() {
        showToast("CustomChatButton deaktiviert.");
    }
});`
    },

    messageSpy: {
        title: "Message Listener",
        description: "Reagiert auf eintreffende Chat-Nachrichten in Echtzeit",
        code: `// Qualcord Live Plugin - Message Listener Template
export default definePlugin({
    name: "LiveMessageListener",
    description: "Reagiert live auf Nachrichten im Chat",
    authors: [{ name: "Qualcord User" }],

    flux: {
        MESSAGE_CREATE(event) {
            const { message } = event;
            if (!message || !message.content) return;

            // Beispiel: Auf bestimmte Wörter reagieren
            if (message.content.toLowerCase().includes("!ping")) {
                showToast("Jemand hat Ping geschrieben: " + message.author.username, {
                    variant: "success"
                });
            }
        }
    },

    start() {
        showToast("LiveMessageListener aktiv! Hört auf Chat-Events.", { variant: "success" });
    },

    stop() {
        showToast("LiveMessageListener gestoppt.");
    }
});`
    },

    minimal: {
        title: "Leere Vorlage (Blank)",
        description: "Ein sauberes Minimal-Plugin zum freien Programmieren",
        code: `// Qualcord Live Plugin - Minimal Template
export default definePlugin({
    name: "MeinPlugin",
    description: "Mein eigenes, live in Discord programmiertes Plugin",
    authors: [{ name: "Qualcord User" }],

    start() {
        showToast("MeinPlugin gestartet!", { variant: "success" });
        console.log("[MeinPlugin] Live aktiv!");
    },

    stop() {
        showToast("MeinPlugin beendet.");
        console.log("[MeinPlugin] Gestoppt.");
    }
});`
    }
};

/**
 * Gets all saved live plugins from storage
 */
export function getAllLivePlugins(): LivePlugin[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        logger.error("Failed to parse live plugins from storage:", e);
        return [];
    }
}

/**
 * Saves a live plugin to persistent storage
 */
export async function saveLivePlugin(plugin: LivePlugin): Promise<void> {
    const list = getAllLivePlugins();
    const idx = list.findIndex(p => p.id === plugin.id);
    plugin.updatedAt = Date.now();

    if (idx >= 0) {
        list[idx] = plugin;
    } else {
        plugin.createdAt ||= Date.now();
        list.push(plugin);
    }

    const json = JSON.stringify(list);
    localStorage.setItem(STORAGE_KEY, json);

    try {
        await DataStore.set(STORAGE_KEY, list);
    } catch {}
}

/**
 * Deletes a live plugin from storage and unregisters it
 */
export async function deleteLivePlugin(id: string): Promise<void> {
    const list = getAllLivePlugins();
    const target = list.find(p => p.id === id);

    if (target) {
        stopLivePlugin(target.name);
        delete (Plugins as any)[target.name];
        delete (PluginMeta as any)[target.name];
    }

    const filtered = list.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    try {
        await DataStore.set(STORAGE_KEY, filtered);
    } catch {}
}

/**
 * Transforms raw user code to be safely executed via Function constructor
 */
export function transformPluginCode(rawCode: string): string {
    let code = rawCode.trim();

    // Remove top-level import statements to avoid SyntaxError
    code = code.replace(/^\s*import\s+.*?;?\s*$/gm, "// [Import auto-resolved by Qualcord]");

    // Convert export default to return
    code = code.replace(/^\s*export\s+default\s+/m, "return ");

    // If there is no return statement, add return definePlugin(...) or return { ... }
    if (!code.includes("return ") && /^\s*(?:definePlugin\s*\(|{)/.test(code)) {
        code = "return " + code;
    }

    return code;
}

/**
 * Executes user plugin code live in Discord and registers it in Qualcord
 */
export function executeLivePlugin(
    code: string,
    fallbackMeta?: { name?: string; description?: string; author?: string; }
): { success: boolean; plugin?: any; error?: string; } {
    try {
        const transformed = transformPluginCode(code);

        // Safe wrapper for showToast accepting string or object
        const safeShowToast = (textOrObj: any, options: any = {}) => {
            if (typeof textOrObj === "string") {
                showToast({ text: textOrObj, ...options });
            } else {
                showToast(textOrObj);
            }
        };

        // Create isolated execution function with Qualcord/Discord APIs passed in
        const executor = new Function(
            "definePlugin",
            "showToast",
            "React",
            "Webpack",
            "find",
            "findByProps",
            "findByCode",
            "Commands",
            "FluxDispatcher",
            "DataStore",
            "Logger",
            "Settings",
            "Plugins",
            "Qualcord",
            "Vencord",
            transformed
        );

        const pluginResult = executor(
            definePlugin,
            safeShowToast,
            React,
            Webpack,
            Webpack.find,
            Webpack.findByProps,
            Webpack.findByCode,
            {
                registerCommand,
                unregisterCommand,
                sendBotMessage,
                ApplicationCommandInputType,
                ApplicationCommandOptionType,
                ApplicationCommandType
            },
            FluxDispatcher,
            DataStore,
            Logger,
            Settings,
            Plugins,
            (window as any).Qualcord || (window as any).Vencord,
            (window as any).Vencord
        );

        if (!pluginResult || typeof pluginResult !== "object") {
            return {
                success: false,
                error: "Das Plugin muss ein Objekt zurückgeben (z.B. mit definePlugin({ name: 'MeinPlugin', ... }))"
            };
        }

        const pluginName = pluginResult.name || fallbackMeta?.name;
        if (!pluginName) {
            return {
                success: false,
                error: "Das Plugin muss einen eindeutigen 'name' besitzen."
            };
        }

        pluginResult.name = pluginName;
        pluginResult.description ||= fallbackMeta?.description || "Live in Discord erstelltes Qualcord-Plugin";
        pluginResult.authors ||= [{ name: fallbackMeta?.author || "Qualcord User" }];

        // Stop previous instance if already running
        if ((Plugins as any)[pluginName]) {
            try {
                stopPlugin((Plugins as any)[pluginName]);
            } catch (err) {
                logger.warn(`Fehler beim Stoppen der vorherigen Instanz von ${pluginName}:`, err);
            }
        }

        // Register in Qualcord's global plugin registries
        (Plugins as any)[pluginName] = pluginResult;
        (PluginMeta as any)[pluginName] = {
            folderName: pluginName,
            userPlugin: true
        };

        // Mark as enabled in settings
        Settings.plugins[pluginName] = { enabled: true };

        // Start the plugin live
        const started = startPlugin(pluginResult);

        if (!started) {
            return {
                success: false,
                error: `Plugin '${pluginName}' konnte nicht gestartet werden. Prüfe die Konsole auf Fehlermeldungen.`
            };
        }

        logger.info(`Live Plugin '${pluginName}' erfolgreich registriert und gestartet!`);
        return { success: true, plugin: pluginResult };
    } catch (err: any) {
        logger.error("Fehler bei der Live-Kompilierung:", err);
        return {
            success: false,
            error: err?.message || String(err)
        };
    }
}

/**
 * Stops an active live plugin
 */
export function stopLivePlugin(pluginName: string): boolean {
    const plugin = (Plugins as any)[pluginName];
    if (!plugin) return false;

    try {
        stopPlugin(plugin);
        if (Settings.plugins[pluginName]) {
            Settings.plugins[pluginName].enabled = false;
        }
        logger.info(`Live Plugin '${pluginName}' gestoppt.`);
        return true;
    } catch (e) {
        logger.error(`Fehler beim Stoppen von '${pluginName}':`, e);
        return false;
    }
}

/**
 * Automatically loads and starts all enabled live plugins on Discord startup
 */
export function initLivePlugins() {
    try {
        const livePlugins = getAllLivePlugins();
        if (!livePlugins.length) return;

        logger.info(`Lade ${livePlugins.length} gespeicherte Live-Plugins...`);

        for (const lp of livePlugins) {
            if (lp.enabled !== false && lp.code) {
                const res = executeLivePlugin(lp.code, {
                    name: lp.name,
                    description: lp.description,
                    author: lp.author
                });

                if (res.success) {
                    logger.info(`✅ Live-Plugin '${lp.name}' geladen und gestartet.`);
                } else {
                    logger.warn(`⚠️ Konnte Live-Plugin '${lp.name}' nicht starten:`, res.error);
                }
            }
        }
    } catch (e) {
        logger.error("Fehler beim Initialisieren der Live-Plugins:", e);
    }
}
