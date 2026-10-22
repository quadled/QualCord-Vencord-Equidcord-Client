/*
 * Qualcord Live Plugin Studio - In-App IDE Modal
 * Code, test, run, and persist custom plugins live directly inside Discord.
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
import { Button } from "@components/Button";
import { copyToClipboard } from "@utils/clipboard";
import { Modal, openModal, React, Select, showToast, TextInput, useEffect, useMemo, useRef, useState } from "@webpack/common";

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

    // Live terminal log output
    const [logs, setLogs] = useState<Array<{ text: string; type: "info" | "success" | "error"; time: string; }>>([
        {
            text: `Willkommen im Qualcord Live Plugin Studio (v${QUALCORD_VERSION})! Wähle eine Vorlage oder schreibe direkt Code.`,
            type: "info",
            time: new Date().toLocaleTimeString()
        }
    ]);

    // Select the first plugin if available on load
    useEffect(() => {
        if (plugins.length > 0 && !selectedPluginId) {
            loadPlugin(plugins[0]);
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
        setPluginDesc(plugin.description);
        setPluginAuthor(plugin.author);
        setCode(plugin.code);
        addLog(`Plugin '${plugin.name}' geladen.`, "info");
    };

    const handleCreateNew = () => {
        const newId = "plugin_" + Date.now();
        setSelectedPluginId(newId);
        setPluginName("NeuesPlugin" + (plugins.length + 1));
        setPluginDesc("Mein eigenes Qualcord Plugin");
        setPluginAuthor("Qualcord User");
        setCode(LIVE_PLUGIN_TEMPLATES.minimal.code);
        addLog("Neues Plugin erstellt. Du kannst jetzt live programmieren!", "info");
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
    const handleRunLive = () => {
        addLog(`⚡ Starte '${pluginName}' live in Discord...`, "info");
        const res = executeLivePlugin(code, {
            name: pluginName,
            description: pluginDesc,
            author: pluginAuthor
        });

        if (res.success) {
            addLog(`✅ Plugin '${pluginName}' erfolgreich kompiliert und gestartet!`, "success");
            showToast({
                text: `Plugin '${pluginName}' läuft jetzt live in Discord!`,
                variant: "success"
            });

            // Update in plugins list if already saved
            if (selectedPluginId) {
                handleSave(false);
            }
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
            showToast({ text: `Plugin '${pluginName}' wurde gestoppt.`, variant: "normal" });
        } else {
            addLog(`Plugin '${pluginName}' läuft aktuell nicht.`, "info");
        }
    };

    // Save Plugin
    const handleSave = async (showToastNotice = true) => {
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

        await saveLivePlugin(livePlugin);
        const updated = getAllLivePlugins();
        setPlugins(updated);
        setSelectedPluginId(id);

        if (showToastNotice) {
            addLog(`💾 Plugin '${livePlugin.name}' dauerhaft gespeichert!`, "success");
            showToast({
                text: `Plugin '${livePlugin.name}' gespeichert!`,
                variant: "success"
            });
        }
    };

    // Delete Plugin
    const handleDelete = async () => {
        if (!selectedPluginId) return;
        await deleteLivePlugin(selectedPluginId);
        const updated = getAllLivePlugins();
        setPlugins(updated);
        addLog(`🗑 Plugin gelöscht.`, "info");
        showToast({ text: "Plugin gelöscht.", variant: "normal" });

        if (updated.length > 0) {
            loadPlugin(updated[0]);
        } else {
            handleCreateNew();
        }
    };

    // Handle Tab key in code textarea for clean indentation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Tab") {
            e.preventDefault();
            const textarea = e.currentTarget;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const value = textarea.value;

            const newValue = value.substring(0, start) + "    " + value.substring(end);
            setCode(newValue);

            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + 4;
            }, 0);
        }
    };

    // Calculate line count for gutter
    const lineCount = useMemo(() => {
        return Math.max(code.split("\n").length, 12);
    }, [code]);

    return (
        <Modal
            {...props}
            size="dynamic"
            title={
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <img
                        src={QUALCORD_LOGO}
                        alt="Qualcord"
                        width={28}
                        height={28}
                        style={{ borderRadius: "50%", boxShadow: "0 0 10px rgba(138, 43, 226, 0.7)" }}
                    />
                    <div>
                        <div style={{ fontWeight: 800, fontSize: "17px", color: "#ffffff" }}>
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
                    height: "640px",
                    width: "880px",
                    maxWidth: "92vw",
                    background: "#1e1f22",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: "1px solid rgba(138, 43, 226, 0.3)"
                }}
            >
                {/* Linke Leiste: Plugin-Liste & Neu-Button */}
                <div
                    style={{
                        width: "230px",
                        background: "#141518",
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
                            borderRadius: "6px",
                            padding: "9px 12px",
                            fontWeight: 700,
                            fontSize: "12px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            boxShadow: "0 2px 8px rgba(88, 101, 242, 0.4)"
                        }}
                    >
                        ➕ Neues Plugin erstellen
                    </button>

                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#949ba4", textTransform: "uppercase", marginTop: "4px" }}>
                        Deine Live Plugins ({plugins.length})
                    </div>

                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {plugins.length === 0 ? (
                            <div style={{ fontSize: "12px", color: "#80848e", fontStyle: "italic", textAlign: "center", marginTop: "20px" }}>
                                Noch keine Plugins vorhanden. Klicke auf "Neues Plugin"!
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
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                            background: isSelected ? "rgba(138, 43, 226, 0.25)" : "rgba(255, 255, 255, 0.03)",
                                            border: isSelected ? "1px solid #8A2BE2" : "1px solid transparent",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "2px"
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, fontSize: "13px", color: isSelected ? "#ffffff" : "#dbdee1" }}>
                                            {p.name}
                                        </div>
                                        <div style={{ fontSize: "11px", color: "#949ba4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {p.description || "Keine Beschreibung"}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Rechter Hauptbereich: Editor & Console */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#1e1f22" }}>
                    {/* Top Toolbar */}
                    <div
                        style={{
                            padding: "10px 14px",
                            background: "#2b2d31",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px"
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
                                        background: "#1e1f22",
                                        color: "#ffffff",
                                        border: "1px solid #3b3e45",
                                        borderRadius: "4px",
                                        fontSize: "13px",
                                        outline: "none"
                                    }}
                                />
                            </div>

                            <div style={{ width: "230px" }}>
                                <label style={{ fontSize: "11px", fontWeight: 700, color: "#b5bac1", display: "block", marginBottom: "4px" }}>
                                    Vorlage wählen
                                </label>
                                <select
                                    onChange={e => handleTemplateSelect(e.target.value)}
                                    defaultValue=""
                                    style={{
                                        width: "100%",
                                        padding: "6px 10px",
                                        background: "#1e1f22",
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
                                    background: "#1e1f22",
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
                    <div style={{ flex: 1, position: "relative", display: "flex", overflow: "hidden", background: "#111214" }}>
                        {/* Line Numbers Gutter */}
                        <div
                            style={{
                                width: "42px",
                                background: "#18191c",
                                borderRight: "1px solid rgba(255, 255, 255, 0.05)",
                                padding: "10px 6px",
                                textAlign: "right",
                                color: "#4e5058",
                                fontFamily: "Consolas, 'Cascadia Code', monospace",
                                fontSize: "12px",
                                lineHeight: "19px",
                                userSelect: "none"
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
                            spellCheck={false}
                            style={{
                                flex: 1,
                                height: "100%",
                                background: "transparent",
                                color: "#f2f3f5",
                                fontFamily: "Consolas, 'Cascadia Code', 'Fira Code', monospace",
                                fontSize: "13px",
                                lineHeight: "19px",
                                padding: "10px 14px",
                                border: "none",
                                resize: "none",
                                outline: "none",
                                whiteSpace: "pre",
                                tabSize: 4
                            }}
                        />
                    </div>

                    {/* Live Console Output Bar */}
                    <div
                        style={{
                            height: "100px",
                            background: "#0c0d0e",
                            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                            padding: "8px 12px",
                            overflowY: "auto",
                            fontFamily: "Consolas, monospace",
                            fontSize: "11px"
                        }}
                    >
                        <div style={{ color: "#72767d", marginBottom: "4px", fontWeight: 700, fontSize: "10px", textTransform: "uppercase" }}>
                            Terminal & Ausgaben:
                        </div>
                        {logs.map((log, i) => (
                            <div
                                key={i}
                                style={{
                                    color: log.type === "success" ? "#57F287" : log.type === "error" ? "#ED4245" : "#949ba4",
                                    lineHeight: "16px"
                                }}
                            >
                                <span style={{ opacity: 0.6, marginRight: "6px" }}>[{log.time}]</span>
                                {log.text}
                            </div>
                        ))}
                    </div>

                    {/* Footer Actions */}
                    <div
                        style={{
                            padding: "10px 14px",
                            background: "#232428",
                            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}
                    >
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                onClick={handleRunLive}
                                style={{
                                    background: "#57F287",
                                    color: "#000000",
                                    border: "none",
                                    borderRadius: "5px",
                                    padding: "7px 14px",
                                    fontWeight: 800,
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px"
                                }}
                            >
                                ▶ Live Ausführen & Testen
                            </button>

                            <button
                                onClick={handleStop}
                                style={{
                                    background: "#3b3e45",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "5px",
                                    padding: "7px 12px",
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
                                    background: "linear-gradient(135deg, #5865F2, #8A2BE2)",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "5px",
                                    padding: "7px 14px",
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
                                    borderRadius: "5px",
                                    padding: "6px 12px",
                                    fontSize: "11px",
                                    cursor: "pointer"
                                }}
                            >
                                📋 Code Kopieren
                            </button>

                            {selectedPluginId && (
                                <button
                                    onClick={handleDelete}
                                    style={{
                                        background: "transparent",
                                        color: "#ED4245",
                                        border: "1px solid #ED4245",
                                        borderRadius: "5px",
                                        padding: "6px 12px",
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
