#!/usr/bin/env sh
# ==============================================================================
#  ⚡ Qualcord Linux Installer & Injector
#  Copyright (c) 2026 Qualcord and contributors
#  SPDX-License-Identifier: GPL-3.0-or-later
#
#  Usage:
#    sh -c "$(curl -fsSL https://raw.githubusercontent.com/quadled/QualCord-Vencord-Equidcord-Client/main/installer/install.sh)"
#    ./install.sh [--uninstall] [--branch <name>]
# ==============================================================================

set -e

# Terminal colors
if [ -t 1 ]; then
    C_RESET="\033[0m"
    C_BOLD="\033[1m"
    C_CYAN="\033[36m"
    C_MAGENTA="\033[35m"
    C_GREEN="\033[32m"
    C_YELLOW="\033[33m"
    C_RED="\033[31m"
else
    C_RESET=""
    C_BOLD=""
    C_CYAN=""
    C_MAGENTA=""
    C_GREEN=""
    C_YELLOW=""
    C_RED=""
fi

echo "${C_MAGENTA}====================================================${C_RESET}"
echo "${C_BOLD}${C_CYAN}         ⚡ Qualcord Client Linux Installer${C_RESET}"
echo "${C_MAGENTA}====================================================${C_RESET}"
echo ""

# Detect actual user & home (in case running under sudo)
if [ -n "$SUDO_USER" ] && [ "$SUDO_USER" != "root" ]; then
    REAL_USER="$SUDO_USER"
    REAL_HOME=$(getent passwd "$SUDO_USER" | cut -d: -f6)
else
    REAL_USER="$(whoami)"
    REAL_HOME="$HOME"
fi

QUALCORD_DIR="${XDG_DATA_HOME:-$REAL_HOME/.local/share}/qualcord"
GITHUB_RAW="https://raw.githubusercontent.com/quadled/QualCord-Vencord-Equidcord-Client/main"
ZIP_URL="${GITHUB_RAW}/installer/Qualcord-dist.zip"

DO_UNINSTALL=0
TARGET_BRANCH=""

for arg in "$@"; do
    case "$arg" in
        --uninstall|-u)
            DO_UNINSTALL=1
            ;;
        --branch=*)
            TARGET_BRANCH="${arg#*=}"
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --uninstall, -u     Restore vanilla Discord by removing Qualcord injection"
            echo "  --branch=<name>     Specify branch to patch (e.g., stable, ptb, canary, dev)"
            echo "  --help, -h          Show this help dialog"
            exit 0
            ;;
    esac
done

# Terminate running Discord instances
close_running_discord() {
    echo "${C_YELLOW}-> Schließe laufende Discord Prozesse...${C_RESET}"
    killall -q discord discord-ptb discord-canary discord-development Discord DiscordPTB DiscordCanary DiscordDevelopment 2>/dev/null || true
    sleep 1
}

# Helper to execute command with sudo only if needed
run_elevated() {
    if [ ! -w "$1" ]; then
        if command -v sudo >/dev/null 2>&1; then
            shift
            sudo "$@"
        else
            echo "${C_RED}❌ Keine Schreibrechte für $1 und 'sudo' nicht verfügbar!${C_RESET}"
            exit 1
        fi
    else
        shift
        "$@"
    fi
}

# Find all Discord installation resources directories
DISCORD_ENTRIES=""

add_target() {
    _name="$1"
    _res="$2"
    _flatpak="$3"

    if [ -d "$_res" ]; then
        # Prevent duplicates
        case "$DISCORD_ENTRIES" in
            *"|$_res|"*) ;;
            *)
                DISCORD_ENTRIES="${DISCORD_ENTRIES}${_name}|${_res}|${_flatpak}\n"
                ;;
        esac
    fi
}

echo "${C_CYAN}-> Suche nach Discord-Installationen...${C_RESET}"

# 1. Native packages
add_target "Discord (Stable - /opt)" "/opt/discord/resources" ""
add_target "Discord (Stable - /opt)" "/opt/Discord/resources" ""
add_target "Discord PTB (/opt)" "/opt/discord-ptb/resources" ""
add_target "Discord Canary (/opt)" "/opt/discord-canary/resources" ""
add_target "Discord Dev (/opt)" "/opt/discord-development/resources" ""

add_target "Discord (Stable - /usr/share)" "/usr/share/discord/resources" ""
add_target "Discord PTB (/usr/share)" "/usr/share/discord-ptb/resources" ""
add_target "Discord Canary (/usr/share)" "/usr/share/discord-canary/resources" ""
add_target "Discord Dev (/usr/share)" "/usr/share/discord-development/resources" ""

add_target "Discord (Stable - /usr/lib)" "/usr/lib/discord/resources" ""
add_target "Discord (Stable - /usr/lib64)" "/usr/lib64/discord/resources" ""
add_target "Discord PTB (/usr/lib)" "/usr/lib/discord-ptb/resources" ""
add_target "Discord Canary (/usr/lib)" "/usr/lib/discord-canary/resources" ""

add_target "Discord (User - ~/.local/share)" "$REAL_HOME/.local/share/discord/resources" ""
add_target "Discord PTB (User - ~/.local/share)" "$REAL_HOME/.local/share/discord-ptb/resources" ""
add_target "Discord Canary (User - ~/.local/share)" "$REAL_HOME/.local/share/discord-canary/resources" ""

# 2. Flatpak packages (User & System)
FP_PREFIXES="$REAL_HOME/.local/share/flatpak/app /var/lib/flatpak/app"
for fpp in $FP_PREFIXES; do
    add_target "Discord (Flatpak Stable)" "$fpp/com.discordapp.Discord/current/active/files/discord/resources" "com.discordapp.Discord"
    add_target "Discord PTB (Flatpak)" "$fpp/com.discordapp.DiscordPTB/current/active/files/discord/resources" "com.discordapp.DiscordPTB"
    add_target "Discord Canary (Flatpak)" "$fpp/com.discordapp.DiscordCanary/current/active/files/discord/resources" "com.discordapp.DiscordCanary"
    add_target "Discord Dev (Flatpak)" "$fpp/com.discordapp.DiscordDevelopment/current/active/files/discord/resources" "com.discordapp.DiscordDevelopment"
done

if [ -z "$DISCORD_ENTRIES" ]; then
    echo "${C_RED}❌ Keine Discord-Installationen auf deinem Linux-System gefunden!${C_RESET}"
    echo "Stelle sicher, dass Discord (über APT, DNF, Pacman, Snap oder Flatpak) installiert ist."
    exit 1
fi

# Print found targets
echo "${C_GREEN}Gefundene Discord-Installationen:${C_RESET}"
COUNT=0
printf "%b" "$DISCORD_ENTRIES" | while IFS= read -r line; do
    if [ -n "$line" ]; then
        COUNT=$((COUNT + 1))
        _name=$(echo "$line" | cut -d'|' -f1)
        _res=$(echo "$line" | cut -d'|' -f2)
        echo "  ${C_BOLD}[$COUNT]${C_RESET} $_name (${_res})"
    fi
done

close_running_discord

# UNINSTALL FLOW
if [ "$DO_UNINSTALL" -eq 1 ]; then
    echo ""
    echo "${C_YELLOW}-> Entferne Qualcord Injection...${C_RESET}"
    printf "%b" "$DISCORD_ENTRIES" | while IFS= read -r line; do
        if [ -n "$line" ]; then
            _name=$(echo "$line" | cut -d'|' -f1)
            _res=$(echo "$line" | cut -d'|' -f2)
            
            _app="$_res/app.asar"
            _backup="$_res/_app.asar"

            if [ -e "$_backup" ]; then
                echo "-> Deinstalliere aus $_name..."
                if [ -d "$_app" ]; then
                    run_elevated "$_res" rm -rf "$_app"
                fi
                run_elevated "$_res" mv "$_backup" "$_app"
                echo "${C_GREEN}✅ $_name wurde erfolgreich auf Originalzustand zurückgesetzt!${C_RESET}"
            else
                echo "${C_YELLOW}ℹ️ $_name war nicht mit Qualcord gepatcht.${C_RESET}"
            fi
        fi
    done
    echo ""
    echo "${C_MAGENTA}Deinstallation abgeschlossen! Starte Discord wie gewohnt.${C_RESET}"
    exit 0
fi

# INSTALL FLOW
echo ""
echo "${C_CYAN}-> Richte Qualcord-Verzeichnis ein: $QUALCORD_DIR${C_RESET}"
mkdir -p "$QUALCORD_DIR"

# Download or extract payload
SCRIPT_DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd || echo "")"
LOCAL_ZIP="${SCRIPT_DIR}/Qualcord-dist.zip"
DIST_DESKTOP="${SCRIPT_DIR}/../dist/desktop"

if [ -f "$LOCAL_ZIP" ]; then
    echo "${C_CYAN}-> Verwende lokales Archiv: $LOCAL_ZIP${C_RESET}"
    if command -v unzip >/dev/null 2>&1; then
        unzip -q -o "$LOCAL_ZIP" -d "$QUALCORD_DIR"
    elif command -v python3 >/dev/null 2>&1; then
        python3 -m zipfile -e "$LOCAL_ZIP" "$QUALCORD_DIR"
    else
        echo "${C_RED}❌ Weder 'unzip' noch 'python3' zum Entpacken gefunden! Bitte installiere unzip.${C_RESET}"
        exit 1
    fi
elif [ -d "$DIST_DESKTOP" ] && [ -f "$DIST_DESKTOP/patcher.js" ]; then
    echo "${C_CYAN}-> Verwende lokalen Build: $DIST_DESKTOP${C_RESET}"
    cp -r "$DIST_DESKTOP"/* "$QUALCORD_DIR/"
else
    echo "${C_CYAN}-> Lade neueste Qualcord-Dateien von GitHub herunter...${C_RESET}"
    TEMP_ZIP="/tmp/qualcord_installer_$$.zip"
    if command -v curl >/dev/null 2>&1; then
        curl -fsSL "$ZIP_URL" -o "$TEMP_ZIP"
    elif command -v wget >/dev/null 2>&1; then
        wget -qO "$TEMP_ZIP" "$ZIP_URL"
    else
        echo "${C_RED}❌ Weder curl noch wget gefunden!${C_RESET}"
        exit 1
    fi

    if command -v unzip >/dev/null 2>&1; then
        unzip -q -o "$TEMP_ZIP" -d "$QUALCORD_DIR"
    elif command -v python3 >/dev/null 2>&1; then
        python3 -m zipfile -e "$TEMP_ZIP" "$QUALCORD_DIR"
    else
        echo "${C_RED}❌ Bitte installiere 'unzip' zum Entpacken.${C_RESET}"
        exit 1
    fi
    rm -f "$TEMP_ZIP"
fi

# Fix ownership of qualcord dir if running under sudo
if [ "$(whoami)" = "root" ] && [ "$REAL_USER" != "root" ]; then
    chown -R "$REAL_USER:$REAL_USER" "$QUALCORD_DIR" 2>/dev/null || true
fi

if [ ! -f "$QUALCORD_DIR/patcher.js" ]; then
    echo "${C_RED}❌ Fehler: patcher.js wurde nicht in '$QUALCORD_DIR' gefunden!${C_RESET}"
    echo "${C_YELLOW}   Discord wurde zum Schutz NICHT verändert.${C_RESET}"
    exit 1
fi

echo "${C_GREEN}✅ Qualcord-Dateien erfolgreich bereitgestellt!${C_RESET}"
echo ""

# Patch Discord targets
printf "%b" "$DISCORD_ENTRIES" | while IFS= read -r line; do
    if [ -n "$line" ]; then
        _name=$(echo "$line" | cut -d'|' -f1)
        _res=$(echo "$line" | cut -d'|' -f2)
        _flatpak=$(echo "$line" | cut -d'|' -f3)

        echo "${C_YELLOW}-> Patche Injection für $_name...${C_RESET}"

        _app="$_res/app.asar"
        _backup="$_res/_app.asar"

        # Backup original app.asar if not already backed up
        if [ -f "$_app" ] && [ ! -d "$_app" ]; then
            if [ ! -e "$_backup" ]; then
                run_elevated "$_res" mv "$_app" "$_backup"
            else
                run_elevated "$_res" rm -f "$_app"
            fi
        fi

        # Create app.asar directory
        if [ ! -d "$_app" ]; then
            run_elevated "$_res" mkdir -p "$_app"
        fi

        # Write package.json and safe fallback index.js
        INDEX_SHIM="const fs = require('fs');
const path = require('path');
const patcher = '$QUALCORD_DIR/patcher.js';
if (fs.existsSync(patcher)) {
    try {
        require(patcher);
    } catch (err) {
        console.error('[Qualcord] Error loading patcher, falling back to vanilla Discord:', err);
        const originalAsar = path.join(__dirname, '..', '_app.asar');
        if (fs.existsSync(originalAsar)) require(originalAsar);
        else throw err;
    }
} else {
    console.warn('[Qualcord] Patcher missing, falling back to vanilla Discord.');
    const originalAsar = path.join(__dirname, '..', '_app.asar');
    if (fs.existsSync(originalAsar)) require(originalAsar);
    else throw new Error('[Qualcord] Missing patcher and _app.asar');
}"
        if [ -w "$_app" ]; then
            printf '{"name":"discord","main":"index.js"}\n' > "$_app/package.json"
            printf '%s\n' "$INDEX_SHIM" > "$_app/index.js"
        else
            printf '{"name":"discord","main":"index.js"}\n' | sudo tee "$_app/package.json" > /dev/null
            printf '%s\n' "$INDEX_SHIM" | sudo tee "$_app/index.js" > /dev/null
        fi

        # Grant Flatpak permissions if it's a flatpak target
        if [ -n "$_flatpak" ] && command -v flatpak >/dev/null 2>&1; then
            echo "${C_CYAN}   (Setze Flatpak Dateisystem-Berechtigung für $_flatpak...)${C_RESET}"
            if [ "$REAL_USER" != "root" ] && [ "$(whoami)" = "root" ]; then
                su - "$REAL_USER" -c "flatpak override --user $_flatpak --filesystem='$QUALCORD_DIR'" 2>/dev/null || true
            else
                flatpak override --user "$_flatpak" --filesystem="$QUALCORD_DIR" 2>/dev/null || true
            fi
        fi

        echo "${C_GREEN}✅ $_name erfolgreich gepatcht!${C_RESET}"
    fi
done

echo ""
echo "${C_MAGENTA}====================================================${C_RESET}"
echo "${C_BOLD}${C_GREEN}🎉 Qualcord wurde erfolgreich auf Linux installiert!${C_RESET}"
echo "${C_MAGENTA}====================================================${C_RESET}"
echo "Starte dein Discord jetzt einfach über dein App-Menü oder im Terminal:"
echo "  ${C_CYAN}discord &${C_RESET}   (oder ${C_CYAN}discord-ptb${C_RESET} / ${C_CYAN}flatpak run com.discordapp.Discord${C_RESET})"
echo ""
echo "Viel Spaß mit Qualcord!"
