/*
 * Qualcord Update Screen / "What's New" Modal
 * Automatically pops up once when a new Qualcord version is detected on startup.
 */

import { DataStore } from "@api/index";
import { Modal, openModal, React, useEffect, useState } from "@webpack/common";

import { QUALCORD_LOGO } from "../../qualcordLogo";
import { QUALCORD_BUILD, QUALCORD_VERSION } from "../../qualcordVersion";

const LAST_SEEN_KEY = "Qualcord_LastSeenChangelogVersion";
const GITHUB_REPO = "quadled/QualCord-Vencord-Equidcord-Client";
const DISCORD_INVITE = "https://discord.gg/Pk3dVqS5Hn";

interface CommitInfo {
    hash: string;
    author: string;
    message: string;
    date: string;
}

export function openQualcordUpdateModal() {
    openModal(modalProps => <QualcordUpdateModal {...modalProps} />);
}

/**
 * Checks on startup whether the running version is newer than the last seen version.
 * If so, displays the "What's New" modal once and records the version as seen.
 */
export async function checkAndShowQualcordUpdateModal() {
    try {
        let lastSeen: string | null = null;
        try {
            lastSeen = (await DataStore.get(LAST_SEEN_KEY)) || localStorage.getItem(LAST_SEEN_KEY);
        } catch {}

        // If the user has never seen this version's update screen
        if (lastSeen !== QUALCORD_VERSION) {
            // Save immediately so subsequent reloads in the same session don't double-trigger
            try {
                await DataStore.set(LAST_SEEN_KEY, QUALCORD_VERSION);
                localStorage.setItem(LAST_SEEN_KEY, QUALCORD_VERSION);
            } catch {}

            // Delay modal popup slightly so Discord UI finishes mounting
            setTimeout(() => {
                openQualcordUpdateModal();
            }, 1400);
        }
    } catch (e) {
        console.warn("[Qualcord] Error during update screen check:", e);
    }
}

function QualcordUpdateModal(props: any) {
    const [activeTab, setActiveTab] = useState<"features" | "commits">("features");
    const [commits, setCommits] = useState<CommitInfo[]>([]);
    const [commitsLoading, setCommitsLoading] = useState(false);

    useEffect(() => {
        if (activeTab === "commits" && commits.length === 0 && !commitsLoading) {
            setCommitsLoading(true);
            fetch(`https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=10`, {
                headers: {
                    Accept: "application/vnd.github+json",
                    "User-Agent": "QualcordClient/1.0"
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        const parsed: CommitInfo[] = data.map((c: any) => ({
                            hash: (c.sha || "").slice(0, 7),
                            author: c.commit?.author?.name || c.author?.login || "Qualcord Dev",
                            message: (c.commit?.message || "").split("\n")[0] || "Update",
                            date: c.commit?.author?.date ? new Date(c.commit.author.date).toLocaleDateString() : ""
                        }));
                        setCommits(parsed);
                    }
                })
                .catch(() => {})
                .finally(() => setCommitsLoading(false));
        }
    }, [activeTab]);

    return (
        <Modal
            {...props}
            size="large"
            title={
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <img
                        src={QUALCORD_LOGO}
                        alt="Qualcord"
                        width={34}
                        height={34}
                        style={{
                            borderRadius: "50%",
                            boxShadow: "0 0 14px rgba(138, 43, 226, 0.8)",
                            border: "2px solid #8A2BE2"
                        }}
                    />
                    <div>
                        <div style={{ fontWeight: 800, fontSize: "17px", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
                            <span>Qualcord Update</span>
                            <span
                                style={{
                                    background: "linear-gradient(135deg, #5865F2, #8A2BE2)",
                                    color: "#ffffff",
                                    padding: "2px 8px",
                                    borderRadius: "12px",
                                    fontSize: "11px",
                                    fontWeight: 700
                                }}
                            >
                                v{QUALCORD_VERSION} (Build {QUALCORD_BUILD})
                            </span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#a5b4fc", marginTop: "2px" }}>
                            Update erfolgreich installiert! Das ist neu in dieser Version:
                        </div>
                    </div>
                </div>
            }
        >
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px", maxHeight: "560px", overflowY: "auto" }}>
                {/* Tab Switcher */}
                <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "12px" }}>
                    <button
                        onClick={() => setActiveTab("features")}
                        style={{
                            background: activeTab === "features" ? "rgba(88, 101, 242, 0.25)" : "transparent",
                            border: activeTab === "features" ? "1px solid #5865F2" : "1px solid transparent",
                            color: activeTab === "features" ? "#ffffff" : "#949ba4",
                            padding: "6px 14px",
                            borderRadius: "6px",
                            fontWeight: 700,
                            fontSize: "12.5px",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                        }}
                    >
                        ⚡ Highlights & Features
                    </button>
                    <button
                        onClick={() => setActiveTab("commits")}
                        style={{
                            background: activeTab === "commits" ? "rgba(88, 101, 242, 0.25)" : "transparent",
                            border: activeTab === "commits" ? "1px solid #5865F2" : "1px solid transparent",
                            color: activeTab === "commits" ? "#ffffff" : "#949ba4",
                            padding: "6px 14px",
                            borderRadius: "6px",
                            fontWeight: 700,
                            fontSize: "12.5px",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                        }}
                    >
                        📋 GitHub Changelog
                    </button>
                </div>

                {/* Features Tab */}
                {activeTab === "features" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {/* Feature 1: QualQuester */}
                        <div
                            style={{
                                background: "rgba(255, 255, 255, 0.03)",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                borderLeft: "4px solid #5865F2",
                                borderRadius: "8px",
                                padding: "14px 16px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px"
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ fontWeight: 800, fontSize: "14px", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span>⚡ QualQuester in der Titelleiste</span>
                                    <span style={{ background: "#5865F2", color: "#fff", fontSize: "10px", padding: "1px 6px", borderRadius: "8px" }}>NEU</span>
                                </div>
                            </div>
                            <div style={{ fontSize: "12.5px", color: "#dbdee1", lineHeight: "1.45" }}>
                                Oben rechts in der Discord-Titelleiste (neben der Hilfe) findest du jetzt das neue Quest-Icon. Ein Klick startet den automatischen Quest-Completer QualQuester, der Video-, Game-, Streaming- und Aktivitäts-Quests automatisch erledigt und Belohnungen abholt! Funktioniert auch via Chat-Befehl <code>/qualquester</code>.
                            </div>
                        </div>

                        {/* Feature 2: Live Plugin Studio */}
                        <div
                            style={{
                                background: "rgba(255, 255, 255, 0.03)",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                borderLeft: "4px solid #8A2BE2",
                                borderRadius: "8px",
                                padding: "14px 16px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px"
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ fontWeight: 800, fontSize: "14px", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span>💻 Live Plugin Studio (In-App IDE)</span>
                                </div>
                            </div>
                            <div style={{ fontSize: "12.5px", color: "#dbdee1", lineHeight: "1.45" }}>
                                Programmiere und teste eigene Discord-Plugins live in der App! Mit vorgefertigten Vorlagen (Slash-Commands, Toasts, Chatbar-Buttons), sofortiger Ausführung ohne Neustart und dauerhafter lokaler Speicherung.
                            </div>
                        </div>

                        {/* Feature 3: Smarter GitHub Updater */}
                        <div
                            style={{
                                background: "rgba(255, 255, 255, 0.03)",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                borderLeft: "4px solid #57F287",
                                borderRadius: "8px",
                                padding: "14px 16px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px"
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ fontWeight: 800, fontSize: "14px", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span>🔄 Intelligenter GitHub-Auto-Updater</span>
                                    <span style={{ background: "#57F287", color: "#000", fontSize: "10px", padding: "1px 6px", borderRadius: "8px", fontWeight: 700 }}>GEFIXT</span>
                                </div>
                            </div>
                            <div style={{ fontSize: "12.5px", color: "#dbdee1", lineHeight: "1.45" }}>
                                Der Updater ist direkt mit deinem GitHub-Repository synchronisiert. Updates prüfen jetzt saubere Versionsnummern (keine Update-Schleifen mehr!), unterstützen stille automatische Git-Installationen und verfügen über einen robusten HTTP-Fallback.
                            </div>
                        </div>

                        {/* Feature 4: Server Pinning & Sidebar */}
                        <div
                            style={{
                                background: "rgba(255, 255, 255, 0.03)",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                borderLeft: "4px solid #FEE75C",
                                borderRadius: "8px",
                                padding: "14px 16px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px"
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ fontWeight: 800, fontSize: "14px", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span>📌 Qualcord Community Server & Optimierte Sidebar</span>
                                </div>
                            </div>
                            <div style={{ fontSize: "12.5px", color: "#dbdee1", lineHeight: "1.45" }}>
                                Der offizielle Qualcord-Server ist unverschiebbar an oberster Stelle deiner Serverliste verankert. Zudem befinden sich die Qualcord-Einstellungen und Plugins standardmäßig ganz oben in deinen Discord-Optionen.
                            </div>
                        </div>
                    </div>
                )}

                {/* Commits Tab */}
                {activeTab === "commits" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {commitsLoading ? (
                            <div style={{ textAlign: "center", padding: "30px", color: "#949ba4", fontSize: "13px" }}>
                                Lade Changelog von GitHub...
                            </div>
                        ) : commits.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "30px", color: "#949ba4", fontSize: "13px" }}>
                                Changelog konnte nicht geladen werden. Siehe GitHub Repository.
                            </div>
                        ) : (
                            commits.map((c, i) => (
                                <div
                                    key={c.hash + i}
                                    style={{
                                        background: "rgba(255, 255, 255, 0.03)",
                                        border: "1px solid rgba(255, 255, 255, 0.07)",
                                        borderRadius: "6px",
                                        padding: "10px 14px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: "12px"
                                    }}
                                >
                                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#f2f3f5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {c.message}
                                        </div>
                                        <div style={{ fontSize: "11px", color: "#949ba4" }}>
                                            {c.author} {c.date && `• ${c.date}`}
                                        </div>
                                    </div>
                                    <code
                                        style={{
                                            background: "rgba(88, 101, 242, 0.2)",
                                            color: "#a5b4fc",
                                            padding: "3px 8px",
                                            borderRadius: "4px",
                                            fontSize: "11px",
                                            fontFamily: "Consolas, monospace"
                                        }}
                                    >
                                        {c.hash}
                                    </code>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Footer Actions */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingTop: "12px",
                        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                        marginTop: "4px"
                    }}
                >
                    <div style={{ display: "flex", gap: "12px" }}>
                        <a
                            href={DISCORD_INVITE}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                fontSize: "12px",
                                color: "#5865F2",
                                textDecoration: "none",
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                gap: "4px"
                            }}
                        >
                            💬 Discord Server
                        </a>
                        <a
                            href={`https://github.com/${GITHUB_REPO}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                fontSize: "12px",
                                color: "#a5b4fc",
                                textDecoration: "none",
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                gap: "4px"
                            }}
                        >
                            ⭐ GitHub
                        </a>
                    </div>
                    <button
                        onClick={props.onClose}
                        style={{
                            background: "linear-gradient(135deg, #5865F2, #8A2BE2)",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "6px",
                            padding: "8px 22px",
                            fontWeight: 700,
                            fontSize: "13px",
                            cursor: "pointer",
                            boxShadow: "0 2px 10px rgba(88, 101, 242, 0.4)"
                        }}
                    >
                        Alles klar, los geht's! 🚀
                    </button>
                </div>
            </div>
        </Modal>
    );
}
