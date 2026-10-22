/*
 * Qualcord - Zentrale Plugin-ID-Verwaltung für System-Standards
 * Speicherort: src/qualcordDefaults.ts
 */

/**
 * Normalisiert eine Plugin-ID:
 * Ignoriert Groß-/Kleinschreibung, Bindestriche (-), Unterstriche (_) und Leerzeichen.
 * Beispiel: "fake-nitro" -> "fakenitro", "SpotifyControls" -> "spotifycontrols"
 */
export function normalizePluginId(id: string): string {
    return (id || "").toLowerCase().replace(/[-_\s/.\\]/g, "");
}

/**
 * =========================================================================
 * 1. SYSTEM-STANDARD PLUGINS (Automatisch beim Start aktiviert)
 * =========================================================================
 * Trage hier einfach die IDs beliebiger öffentlicher oder eigener Plugins ein.
 * Du kannst jede Schreibweise nutzen (z. B. "fakenitro", "FakeNitro" oder "fake-nitro").
 *
 * Nutzer können diese Plugins in den Discord-Einstellungen bei Bedarf noch ausschalten.
 */
export const SYSTEM_DEFAULT_PLUGIN_IDS: string[] = [
    // Standardmäßig aktivierte Plugins:
    "MyCustomPlugin",
    "ChannelTabs",
];

/**
 * =========================================================================
 * 2. ZWINGENDE SYSTEM-PLUGINS (Immer aktiv & gesperrt)
 * =========================================================================
 * Plugins in dieser Liste sind IMMER aktiviert und verhalten sich wie
 * feste Kernkomponenten von Qualcord (können nicht deaktiviert werden).
 */
export const SYSTEM_REQUIRED_PLUGIN_IDS: string[] = [
    "MyCustomPlugin",
    "ChannelTabs",
    "ServerListAPI",
];

// Schnelle Sets für blitzschnelle Abfragen
const defaultSet = new Set(SYSTEM_DEFAULT_PLUGIN_IDS.map(normalizePluginId));
const requiredSet = new Set(SYSTEM_REQUIRED_PLUGIN_IDS.map(normalizePluginId));

/**
 * Prüft, ob eine Plugin-ID oder ein Ordnername als System-Standard hinterlegt ist.
 */
export function isSystemDefaultPlugin(pluginName: string, folderName?: string): boolean {
    const normName = normalizePluginId(pluginName);
    if (defaultSet.has(normName)) return true;

    if (folderName) {
        const lastPart = folderName.split(/[/\\]/).pop() || "";
        if (defaultSet.has(normalizePluginId(lastPart))) return true;
    }
    return false;
}

/**
 * Prüft, ob eine Plugin-ID als zwingend erforderliches System-Plugin hinterlegt ist.
 */
export function isSystemRequiredPlugin(pluginName: string, folderName?: string): boolean {
    const normName = normalizePluginId(pluginName);
    if (requiredSet.has(normName)) return true;

    if (folderName) {
        const lastPart = folderName.split(/[/\\]/).pop() || "";
        if (requiredSet.has(normalizePluginId(lastPart))) return true;
    }
    return false;
}

/**
 * Hilfsfunktion zum dynamischen Hinzufügen einer Plugin-ID
 */
export function registerSystemDefaultId(id: string, required: boolean = false) {
    const norm = normalizePluginId(id);
    defaultSet.add(norm);
    if (required) requiredSet.add(norm);
}
