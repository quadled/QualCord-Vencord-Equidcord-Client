# Eigene Equicord Plugins Entwickeln

Willkommen in deinem eigenen Equicord Plugin-Workspace!
Hier im Ordner `src/userplugins/` kannst du beliebig viele eigene Plugins erstellen. Der Build-Prozess erkennt jeden Ordner oder jede TypeScript-Datei hier automatisch.

---

## 🚀 Schnellstart

1. **Watch-Modus starten**:
   Führe `dev.cmd` aus oder tippe im Terminal:
   ```bash
   pnpm watch
   ```
   *Jedes Mal, wenn du eine Datei in `src/userplugins/` speicherst, wird dein Code in weniger als einer Sekunde neu gebaut.*

2. **In Discord testen**:
   - Nach dem ersten Kompilieren musst du Equicord einmalig in Discord einbinden (per `inject.cmd`).
   - Sobald Equicord installiert ist, reicht in Discord **`Strg + R`**, um deinen neuesten Plugin-Code live zu laden!

---

## 📁 Anatomie eines Plugins

Erstelle für jedes Plugin einen eigenen Ordner, z.B. `src/userplugins/meinNeuesPlugin/`:
```text
src/userplugins/meinNeuesPlugin/
├── index.tsx          # Hauptdatei des Plugins
└── style.css          # (Optional) Eigene CSS-Styles
```

### Grundaufbau (`index.tsx`)

```tsx
import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { showToast } from "@webpack/common";

// 1. Einstellungen (Optional)
const settings = definePluginSettings({
    meinSchalter: {
        type: OptionType.BOOLEAN,
        description: "Mein Test-Schalter",
        default: true
    }
});

// 2. Plugin-Definition
export default definePlugin({
    name: "MeinNeuesPlugin",
    description: "Beschreibung, was das Plugin macht",
    authors: [{ name: "DeinName", id: 0n }],
    tags: ["Utility"],
    settings,

    start() {
        console.log("Plugin aktiviert!");
    },

    stop() {
        console.log("Plugin deaktiviert!");
    }
});
```

---

## 🛠️ Wichtige APIs & Werkzeuge

| Modul | Wofür? |
| :--- | :--- |
| `@api/Commands` | Eigene Slash-Befehle im Chat registrieren (`ApplicationCommandInputType.BUILT_IN`, `sendBotMessage`) |
| `@api/Settings` | Einstellungsoptionen (`BOOLEAN`, `STRING`, `SELECT`, `SLIDER`, `COLOR`) in den Discord-Einstellungen |
| `@api/ContextMenu` | Kontextmenüs (z.B. Rechtsklick auf Nutzer, Nachrichten oder Channels) erweitern |
| `@api/MessageEvents` | Senden, Bearbeiten oder Empfangen von Nachrichten abfangen (`addMessageSendListener`) |
| `@webpack/common` | Fertige Discord-Module: `React`, `Button`, `Alerts`, `UserStore`, `ChannelStore`, `showToast`, u.v.m. |
| `@webpack` | Zugriff auf Discord Webpack-Module: `findByPropsLazy(...)`, `findStoreLazy(...)`, `findByCodeLazy(...)` |

---

## 💡 Beispiel-Features

### 1. Slash-Command erstellen
```tsx
commands: [
    {
        name: "ping",
        description: "Testbefehl",
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute: async (args, ctx) => {
            sendBotMessage(ctx.channel.id, {
                content: "Pong! 🏓"
            });
        }
    }
]
```

### 2. Discord-Nachrichten beim Absenden verändern
```tsx
import { addMessageSendListener, removeMessageSendListener } from "@api/MessageEvents";

let listener: any;

start() {
    listener = addMessageSendListener((channelId, msg) => {
        // Beispiel: Hänge automatisch ein Emoji an alle deine Nachrichten an
        msg.content += " ✨";
    });
},

stop() {
    removeMessageSendListener(listener);
}
```

### 3. Discord-Webpack Code patchen
```tsx
patches: [
    {
        find: "eineEindeutigeDiscordFunktion",
        replacement: {
            match: /alteFunktion\(\)/,
            replace: "neueFunktion()"
        }
    }
]
```
