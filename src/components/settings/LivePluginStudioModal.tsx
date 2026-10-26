/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    deleteLivePlugin,
    executeLivePlugin,
    getAllLivePlugins,
    LIVE_PLUGIN_TEMPLATES,
    LivePlugin,
    saveLivePlugin,
    stopLivePlugin
} from "@api/LivePlugins";
import { copyToClipboard } from "@utils/clipboard";
import { Modal, openModal, React, showToast, useEffect, useMemo, useRef, useState } from "@webpack/common";

import { QUALCORD_LOGO } from "../../qualcordLogo";
import { QUALCORD_VERSION } from "../../qualcordVersion";

export function openLivePluginStudio() {
    openModal(modalProps => <LivePluginStudioModal {...modalProps} />);
}

function LivePluginStudioModal(props: any) {
    const [plugins, setPlugins] = useState<LivePlugin[]>(() => getAllLivePlugins());
    const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null);

    // Current editing fields
    const [pluginName, setPluginName] = useState("MeinPlugin");
    const [pluginDesc, setPluginDesc] = useState("Live in Discord erstelltes Qualcord-Plugin");
    const [pluginAuthor, setPluginAuthor] = useState("Qualcord User");
    const [code, setCode] = useState(LIVE_PLUGIN_TEMPLATES.slashCommand.code);

    const gutterRef = useRef<HTMLDivElement>(null);

    // Live terminal log output
    const [logs, setLogs] = useState<Array<{ text: string; type: "info" | "success" | "error"; time: string; }>>([
        {
            text: `Willkommen im Qualcord Live Plugin Studio (v${QUALCORD_VERSION})! Wähle eine Vorlage oder schreibe direkt Code.`,
            type: "info",
            time: new Date().toLocaleTimeString()
        }
    ]);

    // Load initial plugin on mount
    useEffect(() => {
        const all = getAllLivePlugins();
        setPlugins(all);
        if (all.length > 0) {
            loadPlugin(all[0]);
        }
    }, []);

    const addLog = (text: string, type: "info" | "success" | "error" = "info") => {
        setLogs(prev => [
            ...prev.slice(-40),
            { text, type, time: new Date().toLocaleTimeString() }
        ]);
    };

    const loadPlugin = (plugin: LivePlugin) => {
        setSelectedPluginId(plugin.id);
        setPluginName(plugin.name);
        setPluginDesc(plugin.description || "");
        setPluginAuthor(plugin.author || "Qualcord User");
        setCode(plugin.code || "");
        addLog(`Plugin '${plugin.name}' geladen.`, "info");
    };

    // Create a new plugin and immediately persist it
    const handleCreateNew = async () => {
        try {
            const count = plugins.length + 1;
            const newPlugin: LivePlugin = {
                id: "plugin_" + Date.now(),
                name: "NeuesPlugin" + count,
                description: "Mein eigenes Qualcord Plugin",
                author: "Qualcord User",
                code: LIVE_PLUGIN_TEMPLATES.minimal.code,
                enabled: true,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            const updated = await saveLivePlugin(newPlugin);
            setPlugins(updated);
            loadPlugin(newPlugin);
            addLog(`Neues Plugin '${newPlugin.name}' erstellt und gespeichert!`, "success");
            showToast({ text: `Neues Plugin '${newPlugin.name}' erstellt!`, variant: "success" });
        } catch (e: any) {
            addLog(`Fehler beim Erstellen: ${e.message}`, "error");
        }
    };

    const handleTemplateSelect = (key: string) => {
        const tpl = LIVE_PLUGIN_TEMPLATES[key];
        if (!tpl) return;
        setCode(tpl.code);
        setPluginDesc(tpl.description);
        addLog(`Vorlage '${tpl.title}' eingefügt.`, "info");
        showToast({ text: `Vorlage '${tpl.title}' geladen!`, variant: "success" });
    };

    // Live Run / Test in Discord
    const handleRunLive = async () => {
        addLog(`⚡ Starte '${pluginName}' live in Discord...`, "info");
        const res = executeLivePlugin(code, {
            name: pluginName,
            description: pluginDesc,
            author: pluginAuthor
        });

        if (res.success) {
            addLog(`✅ Plugin '${pluginName}' erfolgreich gestartet & aktiv!`, "success");
            showToast({
                text: `Plugin '${pluginName}' läuft jetzt live in Discord!`,
                variant: "success"
            });
            // Auto-save on successful test run
            await handleSave(false);
        } else {
            addLog(`❌ Fehler: ${res.error}`, "error");
            showToast({
                text: `Fehler: ${res.error}`,
                variant: "critical"
            });
        }
    };

    // Stop Plugin
    const handleStop = () => {
        const stopped = stopLivePlugin(pluginName);
        if (stopped) {
            addLog(`⏹ Plugin '${pluginName}' gestoppt.`, "info");
            showToast({ text: `Plugin '${pluginName}' wurde gestoppt.`, variant: "default" });
        } else {
            addLog(`Plugin '${pluginName}' läuft aktuell nicht.`, "info");
        }
    };

    // Save Plugin
    const handleSave = async (showToastNotice = true) => {
        try {
            const id = selectedPluginId || "plugin_" + Date.now();
            const livePlugin: LivePlugin = {
                id,
                name: pluginName.trim() || "Unbenannt",
                description: pluginDesc.trim(),
                author: pluginAuthor.trim() || "Qualcord User",
                code,
                enabled: true,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            const updated = await saveLivePlugin(livePlugin);
            setPlugins(updated);
            setSelectedPluginId(livePlugin.id);

            if (showToastNotice) {
                addLog(`💾 Plugin '${livePlugin.name}' dauerhaft gespeichert!`, "success");
                showToast({
                    text: `Plugin '${livePlugin.name}' gespeichert!`,
                    variant: "success"
                });
            }
        } catch (e: any) {
            addLog(`❌ Fehler beim Speichern: ${e.message}`, "error");
            showToast({
                text: "Fehler beim Speichern!",
                variant: "critical"
            });
        }
    };

    // Delete Plugin
    const handleDelete = async () => {
        if (!selectedPluginId) return;
        try {
            const updated = await deleteLivePlugin(selectedPluginId);
            setPlugins(updated);
            addLog("🗑 Plugin gelöscht.", "info");
            showToast({ text: "Plugin gelöscht.", variant: "default" });

            if (updated.length > 0) {
                loadPlugin(updated[0]);
            } else {
                handleCreateNew();
            }
        } catch (e: any) {
            addLog(`Fehler beim Löschen: ${e.message}`, "error");
        }
    };

    // Handle Tab key in code textarea for clean indentation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Tab") {
            e.preventDefault();
            const textarea = e.currentTarget;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const { value } = textarea;

            const newValue = value.substring(0, start) + "    " + value.substring(end);
            setCode(newValue);

            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + 4;
            }, 0);
        }
    };

    // Synchronize gutter line numbers scrolling with textarea
    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (gutterRef.current) {
            gutterRef.current.scrollTop = e.currentTarget.scrollTop;
        }
    };

    // Calculate line count for gutter
    const lineCount = useMemo(() => {
        return Math.max(code.split("\n").length, 14);
    }, [code]);

    return (
        <Modal
            {...props}
            size="xl"
            title={
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <img
                        src={QUALCORD_LOGO}
                        alt="Qualcord"
                        width={26}
                        height={26}
                        style={{ borderRadius: "50%", boxShadow: "0 0 10px rgba(138, 43, 226, 0.7)" }}
                    />
                    <div>
                        <div style={{ fontWeight: 800, fontSize: "16px", color: "#ffffff" }}>
                            Qualcord Live Plugin Studio
                        </div>
                        <div style={{ fontSize: "11px", color: "#a5b4fc" }}>
                            Programmiere, teste und starte deine eigenen Plugins live in Discord
                        </div>
                    </div>
                </div>
            }
        >
            <div
                style={{
                    display: "flex",
                    width: "100%",
                    height: "560px",
                    background: "#1e1f22",
                    overflow: "hidden",
                    borderRadius: "4px"
                }}
            >
                {/* Linke Leiste: Plugin-Liste & Neu-Button */}
                <div
                    style={{
                        width: "210px",
                        minWidth: "210px",
                        background: "#111214",
                        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
                        display: "flex",
                        flexDirection: "column",
                        padding: "12px",
                        gap: "10px"
                    }}
                >
                    <button
                        onClick={handleCreateNew}
                        style={{
                            background: "linear-gradient(135deg, #5865F2, #8A2BE2)",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "5px",
                            padding: "8px 12px",
                            fontWeight: 700,
                            fontSize: "12px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            boxShadow: "0 2px 8px rgba(88, 101, 242, 0.35)"
                        }}
                    >
                        + Neues Plugin
                    </button>

                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#949ba4", textTransform: "uppercase", marginTop: "2px" }}>
                        Plugins ({plugins.length})
                    </div>

                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "5px" }}>
                        {plugins.length === 0 ? (
                            <div style={{ fontSize: "12px", color: "#80848e", fontStyle: "italic", textAlign: "center", marginTop: "20px" }}>
                                Keine Plugins vorhanden
                            </div>
                        ) : (
                            plugins.map(p => {
                                const isSelected = p.id === selectedPluginId;
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => loadPlugin(p)}
                                        style={{
                                            padding: "8px 10px",
                                            borderRadius: "5px",
                                            cursor: "pointer",
                                            background: isSelected ? "#2b2d31" : "#18191c",
                                            borderLeft: isSelected ? "3px solid #5865F2" : "3px solid transparent",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "2px",
                                            transition: "background 0.15s ease"
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, fontSize: "12.5px", color: isSelected ? "#ffffff" : "#dbdee1" }}>
                                            {p.name}
                                        </div>
                                        <div style={{ fontSize: "10.5px", color: "#949ba4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {p.description || "Keine Beschreibung"}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Rechter Hauptbereich: Toolbar, Editor, Console, Action Bar */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "#1e1f22" }}>
                    {/* Top Toolbar */}
                    <div
                        style={{
                            padding: "10px 14px",
                            background: "#232428",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            flexShrink: 0
                        }}
                    >
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: "11px", fontWeight: 700, color: "#b5bac1", display: "block", marginBottom: "4px" }}>
                                    Plugin Name
                                </label>
                                <input
                                    type="text"
                                    value={pluginName}
                                    onChange={e => setPluginName(e.target.value)}
                                    placeholder="MeinCoolesPlugin"
                                    style={{
                                        width: "100%",
                                        padding: "6px 10px",
                                        background: "#111214",
                                        color: "#ffffff",
                                        border: "1px solid #3b3e45",
                                        borderRadius: "4px",
                                        fontSize: "12.5px",
                                        outline: "none"
                                    }}
                                />
                            </div>

                            <div style={{ width: "230px" }}>
                                <label style={{ fontSize: "11px", fontWeight: 700, color: "#b5bac1", display: "block", marginBottom: "4px" }}>
                                    Vorlage auswählen
                                </label>
                                <select
                                    onChange={e => handleTemplateSelect(e.target.value)}
                                    defaultValue=""
                                    style={{
                                        width: "100%",
                                        padding: "6px 10px",
                                        background: "#111214",
                                        color: "#dbdee1",
                                        border: "1px solid #3b3e45",
                                        borderRadius: "4px",
                                        fontSize: "12px",
                                        outline: "none",
                                        cursor: "pointer"
                                    }}
                                >
                                    <option value="" disabled>-- Vorlage laden --</option>
                                    <option value="slashCommand">⚡ Slash Command (/qualcord)</option>
                                    <option value="toastNotification">🔔 Toast Benachrichtigung</option>
                                    <option value="customCss">🎨 Custom CSS Styling</option>
                                    <option value="chatButton">💬 Chatbar Button</option>
                                    <option value="messageSpy">📩 Message Listener</option>
                                    <option value="minimal">📄 Leeres Template</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "#b5bac1", display: "block", marginBottom: "4px" }}>
                                Beschreibung
                            </label>
                            <input
                                type="text"
                                value={pluginDesc}
                                onChange={e => setPluginDesc(e.target.value)}
                                placeholder="Kurze Beschreibung des Plugins..."
                                style={{
                                    width: "100%",
                                    padding: "6px 10px",
                                    background: "#111214",
                                    color: "#ffffff",
                                    border: "1px solid #3b3e45",
                                    borderRadius: "4px",
                                    fontSize: "12px",
                                    outline: "none"
                                }}
                            />
                        </div>
                    </div>

                    {/* Code Editor */}
                    <div style={{ flex: 1, minHeight: 0, position: "relative", display: "flex", overflow: "hidden", background: "#18191c" }}>
                        {/* Line Numbers Gutter */}
                        <div
                            ref={gutterRef}
                            style={{
                                width: "38px",
                                minWidth: "38px",
                                background: "#111214",
                                borderRight: "1px solid rgba(255, 255, 255, 0.06)",
                                padding: "8px 4px",
                                textAlign: "right",
                                color: "#4e5058",
                                fontFamily: "Consolas, 'Cascadia Code', monospace",
                                fontSize: "12px",
                                lineHeight: "19px",
                                userSelect: "none",
                                overflow: "hidden"
                            }}
                        >
                            {Array.from({ length: lineCount }, (_, i) => (
                                <div key={i}>{i + 1}</div>
                            ))}
                        </div>

                        {/* Textarea Code Editor */}
                        <textarea
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onScroll={handleScroll}
                            spellCheck={false}
                            style={{
                                flex: 1,
                                height: "100%",
                                background: "transparent",
                                color: "#f2f3f5",
                                fontFamily: "Consolas, 'Cascadia Code', 'Fira Code', monospace",
                                fontSize: "12.5px",
                                lineHeight: "19px",
                                padding: "8px 12px",
                                border: "none",
                                resize: "none",
                                outline: "none",
                                whiteSpace: "pre",
                                tabSize: 4
                            }}
                        />
                    </div>

                    {/* Terminal / Output Bar */}
                    <div
                        style={{
                            height: "85px",
                            minHeight: "85px",
                            maxHeight: "85px",
                            background: "#0c0d0e",
                            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                            padding: "6px 12px",
                            overflowY: "auto",
                            fontFamily: "Consolas, monospace",
                            fontSize: "11px",
                            flexShrink: 0
                        }}
                    >
                        <div style={{ color: "#72767d", marginBottom: "3px", fontWeight: 700, fontSize: "10px", textTransform: "uppercase" }}>
                            Terminal & Ausgaben:
                        </div>
                        {logs.map((log, i) => (
                            <div
                                key={i}
                                style={{
                                    color: log.type === "success" ? "#57F287" : log.type === "error" ? "#ED4245" : "#949ba4",
                                    lineHeight: "15px"
                                }}
                            >
                                <span style={{ opacity: 0.6, marginRight: "6px" }}>[{log.time}]</span>
                                {log.text}
                            </div>
                        ))}
                    </div>

                    {/* Footer Actions (immer sichtbar und niemals abgeschnitten!) */}
                    <div
                        style={{
                            padding: "9px 14px",
                            background: "#1e1f22",
                            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexShrink: 0
                        }}
                    >
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                onClick={handleRunLive}
                                style={{
                                    background: "#23a55a",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "4px",
                                    padding: "6px 14px",
                                    fontWeight: 700,
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px"
                                }}
                            >
                                ▶ Live Ausführen
                            </button>

                            <button
                                onClick={handleStop}
                                style={{
                                    background: "#3b3e45",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "4px",
                                    padding: "6px 12px",
                                    fontWeight: 600,
                                    fontSize: "12px",
                                    cursor: "pointer"
                                }}
                            >
                                ⏹ Stoppen
                            </button>

                            <button
                                onClick={() => handleSave(true)}
                                style={{
                                    background: "#5865F2",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "4px",
                                    padding: "6px 14px",
                                    fontWeight: 700,
                                    fontSize: "12px",
                                    cursor: "pointer"
                                }}
                            >
                                💾 Speichern
                            </button>
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                onClick={() => {
                                    copyToClipboard(code);
                                    showToast({ text: "Code in Zwischenablage kopiert!", variant: "success" });
                                    addLog("Code in Zwischenablage kopiert.", "info");
                                }}
                                style={{
                                    background: "transparent",
                                    color: "#dbdee1",
                                    border: "1px solid #4e5058",
                                    borderRadius: "4px",
                                    padding: "5px 10px",
                                    fontSize: "11px",
                                    cursor: "pointer"
                                }}
                            >
                                📋 Kopieren
                            </button>

                            {selectedPluginId && (
                                <button
                                    onClick={handleDelete}
                                    style={{
                                        background: "transparent",
                                        color: "#ED4245",
                                        border: "1px solid #ED4245",
                                        borderRadius: "4px",
                                        padding: "5px 10px",
                                        fontSize: "11px",
                                        cursor: "pointer"
                                    }}
                                >
                                    🗑 Löschen
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
