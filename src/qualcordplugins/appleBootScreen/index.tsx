/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, StartAt } from "@utils/types";
import { onceReady } from "@webpack";
import { React } from "@webpack/common";

const DISCORD_LOGO_SVG = `
<svg width="84" height="64" viewBox="0 0 127.14 96.36" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="display: block; shape-rendering: geometricPrecision;">
    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,45.91,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,45.91,96.12,53,91.08,65.69,84.69,65.69Z"/>
</svg>
`;

const APPLE_LOGO_SVG = `
<svg width="68" height="82" viewBox="0 0 170 170" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="display: block; shape-rendering: geometricPrecision;">
    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.69-7.74-11.97-14.11-6.1-9.08-10.88-19.52-14.34-31.33-3.46-11.82-5.19-23.2-5.19-34.14 0-16.71 4.13-30.82 12.39-42.33 8.26-11.5 18.66-17.37 31.21-17.59 5.37 0 11.08 1.41 17.13 4.23 6.05 2.82 10.02 4.29 11.92 4.41 1.9.11 6.13-1.42 12.69-4.59 6.56-3.17 12.44-4.58 17.65-4.23 13.72.65 24.81 5.33 33.27 14.04-12.19 7.4-18.17 17.43-17.94 30.1.23 9.9 4.13 18.25 11.71 25.04 7.57 6.79 16.59 10.59 27.05 11.41-2.28 7.07-5.07 14.39-8.37 21.96zM119.22 33.15c0-7.84 2.83-15.34 8.5-22.5 5.66-7.16 12.69-11.39 21.09-12.69.23 1.2.35 2.29.35 3.29 0 7.73-2.94 15.24-8.82 22.53-5.87 7.29-12.92 11.45-21.12 12.5-0.12-1.09-.18-2.14-.18-3.13z"/>
</svg>
`;

let activeOverlay: HTMLDivElement | null = null;
let progressBarFill: HTMLDivElement | null = null;
let currentProgress = 0;
let progressTicker: any = null;
let isFinishing = false;
let startTime = 0;

function getBarColor(choice: string): string {
    switch (choice) {
        case "blurple":
            return "#5865F2";
        case "cyan":
            return "#00F0FF";
        case "white":
        default:
            return "#FFFFFF";
    }
}

function getLogoSvg(choice: string): string {
    switch (choice) {
        case "apple":
            return APPLE_LOGO_SVG;
        case "discord":
        default:
            return DISCORD_LOGO_SVG;
    }
}

function setProgress(val: number) {
    if (!progressBarFill) return;
    currentProgress = Math.max(currentProgress, Math.min(100, val));
    progressBarFill.style.width = `${currentProgress}%`;
}

function finishBootScreen(fadeOutDuration = 500) {
    if (isFinishing || !activeOverlay) return;
    isFinishing = true;

    if (progressTicker) {
        clearInterval(progressTicker);
        progressTicker = null;
    }

    setProgress(100);

    const overlay = activeOverlay;
    // Kurze Pause bei 100%, genau wie bei macOS vor dem Desktop-Erscheinen
    setTimeout(() => {
        if (!overlay) return;
        overlay.style.transition = `opacity ${fadeOutDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        overlay.style.opacity = "0";

        setTimeout(() => {
            overlay.remove();
            if (activeOverlay === overlay) {
                activeOverlay = null;
                progressBarFill = null;
            }
        }, fadeOutDuration + 50);
    }, 200);
}

function mountBootScreen(isPreview = false) {
    if (activeOverlay) {
        activeOverlay.remove();
        activeOverlay = null;
    }

    isFinishing = false;
    currentProgress = 0;
    startTime = performance.now();

    const logoChoice = settings.store.logo ?? "discord";
    const colorChoice = settings.store.barColor ?? "white";
    const minDuration = isPreview ? 2000 : (settings.store.minDuration ?? 1400);
    const fadeOutDuration = settings.store.fadeOutSpeed ?? 500;

    const overlay = document.createElement("div");
    overlay.id = "qualcord-apple-boot-overlay";
    overlay.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background-color: #000000 !important;
        z-index: 2147483647 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        cursor: default !important;
        pointer-events: all !important;
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
        opacity: 1 !important;
    `;

    const centerBox = document.createElement("div");
    centerBox.style.cssText = `
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        transform: translateY(-24px) !important;
    `;

    // Logo
    const logoContainer = document.createElement("div");
    logoContainer.style.cssText = `
        color: #ffffff !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        margin-bottom: 48px !important;
        filter: drop-shadow(0 0 1px rgba(255, 255, 255, 0.35)) !important;
    `;
    logoContainer.innerHTML = getLogoSvg(logoChoice);

    // Apple Style Progress Track
    const track = document.createElement("div");
    track.style.cssText = `
        width: 220px !important;
        height: 5px !important;
        background-color: #333336 !important;
        border-radius: 9999px !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
        position: relative !important;
    `;

    // Apple Style Progress Fill
    const fill = document.createElement("div");
    fill.style.cssText = `
        height: 100% !important;
        width: 4% !important;
        background-color: ${getBarColor(colorChoice)} !important;
        border-radius: 9999px !important;
        transition: width 0.28s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
    `;
    track.appendChild(fill);

    centerBox.appendChild(logoContainer);
    centerBox.appendChild(track);
    overlay.appendChild(centerBox);

    const parent = document.body || document.documentElement;
    parent.appendChild(overlay);

    activeOverlay = overlay;
    progressBarFill = fill;

    setProgress(isPreview ? 8 : 12);

    if (isPreview) {
        // Vorschau-Animation: füllt sich stetig über ~1.8 Sekunden
        let simProgress = 8;
        progressTicker = setInterval(() => {
            simProgress += (100 - simProgress) * 0.08 + 1;
            setProgress(simProgress);
            if (simProgress >= 98) {
                finishBootScreen(fadeOutDuration);
            }
        }, 50);
    } else {
        // Echter Start: flüssiges Creeping mit Easing bis Discord bereit ist
        progressTicker = setInterval(() => {
            if (currentProgress < 85) {
                setProgress(currentProgress + (85 - currentProgress) * 0.04);
            }
        }, 60);

        document.addEventListener("DOMContentLoaded", () => {
            setProgress(Math.max(currentProgress, 50));
        }, { once: true });

        // Sicherheits-Timeout (maximal 6.5s)
        setTimeout(() => {
            finishBootScreen(fadeOutDuration);
        }, 6500);
    }
}

function handleDiscordReady() {
    if (!activeOverlay || isFinishing) return;
    const minDuration = settings.store.minDuration ?? 1400;
    const fadeOutDuration = settings.store.fadeOutSpeed ?? 500;
    const elapsed = performance.now() - startTime;
    const remainingTime = Math.max(100, minDuration - elapsed);

    // Auf 92% springen, dann bei Ablauf auf 100%
    setProgress(92);
    setTimeout(() => {
        finishBootScreen(fadeOutDuration);
    }, remainingTime);
}

function PreviewButton() {
    return (
        <div style={{ marginTop: "12px", marginBottom: "8px" }}>
            <Button
                variant="primary"
                onClick={() => mountBootScreen(true)}
            >
                🍏 Ladebildschirm-Vorschau abspielen
            </Button>
        </div>
    );
}

const settings = definePluginSettings({
    preview: {
        type: OptionType.COMPONENT,
        description: "Teste den MacBook Boot-Screen direkt in Discord",
        component: PreviewButton
    },
    logo: {
        description: "Welches Logo soll mittig auf dem schwarzen Bildschirm angezeigt werden?",
        type: OptionType.SELECT,
        options: [
            { label: "Discord Logo (Minimalist White wie bei Apple)", value: "discord", default: true },
            { label: "Apple Logo (Klassischer weißer Apfel)", value: "apple" }
        ],
        restartNeeded: false
    },
    barColor: {
        description: "Farbe des eleganten Apple-Ladebalkens",
        type: OptionType.SELECT,
        options: [
            { label: "Apple Weiß (Klassisch)", value: "white", default: true },
            { label: "Discord Blurple (#5865F2)", value: "blurple" },
            { label: "Neon Cyan (#00F0FF)", value: "cyan" }
        ],
        restartNeeded: false
    },
    minDuration: {
        description: "Mindest-Anzeigedauer in Millisekunden (sorgt für eine gleichmäßige, flüssige Animation)",
        type: OptionType.SLIDER,
        markers: [600, 1000, 1400, 2000, 3000],
        default: 1400,
        stickToMarkers: false
    },
    fadeOutSpeed: {
        description: "Dauer der sanften Überblendung (Fade-Out in Millisekunden)",
        type: OptionType.SLIDER,
        markers: [200, 400, 500, 800, 1000],
        default: 500,
        stickToMarkers: false
    }
});

export default definePlugin({
    name: "AppleBootScreen",
    description: "Zeigt beim Start von Discord einen eleganten Apple-MacBook Boot-Screen mit zentriertem weißem Discord-Logo und Fortschrittsbalken.",
    tags: ["Appearance", "Customisation"],
    authors: [Devs.thororen],
    settings,
    startAt: StartAt.Init,

    start() {
        mountBootScreen(false);

        // Sobald Webpack bereit ist und Stores geladen sind
        onceReady.then(() => {
            handleDiscordReady();
        }).catch(() => {
            finishBootScreen();
        });
    },

    stop() {
        if (activeOverlay) {
            activeOverlay.remove();
            activeOverlay = null;
        }
        if (progressTicker) {
            clearInterval(progressTicker);
            progressTicker = null;
        }
    },

    fluxEvents: {
        CONNECTION_OPEN: () => {
            handleDiscordReady();
        }
    }
});
