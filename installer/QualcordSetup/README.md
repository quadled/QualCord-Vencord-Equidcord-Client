# ZenCord Custom Installer (C# / WPF / .NET)

Ein moderner, maßgeschneiderter Windows-Installer für **ZenCord** im **Discord / OLED Dark-Design** (tiefschwarz mit Indigo/Blurple Akzenten), nativem Vektor-Logo und vollständiger Systemintegration.

---

## ✨ Features & Neuerungen

- **OLED Dark / Discord Theme**:
  - Tiefschwarzer Hintergrund (`#0D0E11`), abgerundete Ecken und dunkle Kontrollleiste (`#090A0D`).
  - Discord- & ZenCord-Akzentfarben (`#5865F2` / `#6366F1`) mit dezentem Leuchteffekt (Glow).
  - Modernste Typografie (`Segoe UI Variable`) mit optimierten Kontrasten für Dark Mode.
- **Original ZenCord Vektor-Logo**:
  - Das Logo aus `logo.svg` wurde nativ in XAML implementiert – gestochen scharf auf jedem Monitor (inkl. 4K & High-DPI).
  - Integriertes Anwendungs-Icon (`app.ico`) für die `Setup.exe`.
- **Installations-Assistent (Wizard)**:
  1. **Willkommen**: ZenCord-Logo, Titel, Version und Express-Installation oder manuelle Anpassung.
  2. **Optionen**: Zielverzeichnis (Standard: `C:\Program Files\ZenCord`), Speicherplatzprüfung in Echtzeit, Checkboxen für Desktop-Icon, Startmenü und Autostart.
  3. **Fortschrittsanzeige**: Zweifarbiger ZenCord-Verlaufsbalken, Echtzeit-Dateikopie und ausklappbares Detail-Protokoll.
  4. **Fertigstellen**: Erfolgsbestätigung mit der Option "ZenCord jetzt starten".
- **Deinstallationsroutine**:
  - Integrierter Deinstallierer (`Setup.exe --uninstall` oder über Windows **Einstellungen -> Installierte Apps**).
  - Entfernt Verknüpfungen, Autostart-Einträge und Installationsdateien rückstandslos.

---

## 🚀 Eigenes ZenCord Setup kompilieren

Das Skript `build-installer.ps1` packt die ZenCord-Dateien automatisch und erzeugt eine fertige `Setup.exe`:

```powershell
cd C:\Users\richt\.gemini\antigravity\scratch\CustomInstaller

# Mit deinen installierten ZenCord-Dateien paketieren:
.\build-installer.ps1 -SourceFolder "C:\Users\richt\AppData\Local\Programs\ZenCord"
```

Oder für ein komplett eigenständiges Setup (inkl. .NET-Runtime, läuft auf jedem PC ohne Voraussetzungen):

```powershell
.\build-installer.ps1 -SourceFolder "C:\Users\richt\AppData\Local\Programs\ZenCord" -SelfContained
```

Die fertige `Setup.exe` liegt danach im Ordner `dist\`.

---

## ⚙️ Konfiguration (`installer-config.json`)

```json
{
  "AppName": "ZenCord",
  "Publisher": "ZenCord",
  "AppVersion": "1.0.0",
  "ExecutableName": "ZenCord.exe",
  "Description": "Modernes, schnelles und datenschutzfreundliches Kommunikationserlebnis.",
  "DefaultInstallFolder": "C:\\Program Files\\ZenCord",
  "AccentColorHex": "#5865F2",
  "EstimatedSizeMB": 150.0,
  "DefaultCreateDesktopShortcut": true,
  "DefaultCreateStartMenuShortcut": true,
  "DefaultLaunchOnStartup": false
}
```
