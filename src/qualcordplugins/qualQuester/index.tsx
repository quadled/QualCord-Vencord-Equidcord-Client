/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType } from "@api/Commands";
import { HeaderBarButton } from "@api/HeaderBar";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { ComponentType, SVGProps } from "react";

import { launchQualquester } from "./qualquesterRunner";

export function QuestIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            width={props.width ?? 18}
            height={props.height ?? 18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" stroke="none" />
        </svg>
    );
}

function QuestHeaderButton() {
    return (
        <HeaderBarButton
            icon={QuestIcon as ComponentType<any>}
            tooltip="QualQuester"
            onClick={() => {
                const isRunning = (window as any).qualquesterLock || (window as any).orionLock;
                if (isRunning) {
                    const ui = document.getElementById("qualquester-ui") || document.getElementById("orion-ui");
                    if (ui) {
                        ui.style.display = ui.style.display === "none" ? "flex" : "none";
                    }
                } else {
                    launchQualquester();
                }
            }}
        />
    );
}

export default definePlugin({
    name: "QualQuester",
    description: "Fügt ein Quest-Icon in der Discord-Titelleiste hinzu, um Quests automatisch mit QualQuester zu erledigen.",
    authors: [Devs.Qualcord],
    dependencies: ["HeaderBarAPI", "CommandsAPI"],
    enabledByDefault: true,

    headerBarButton: {
        icon: QuestIcon as ComponentType<any>,
        render: () => <QuestHeaderButton />,
        priority: 15,
        location: "headerbar"
    },

    commands: [
        {
            name: "qualquester",
            description: "QualQuester Quest Completer öffnen oder umschalten",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: () => {
                const isRunning = (window as any).qualquesterLock || (window as any).orionLock;
                if (isRunning) {
                    const ui = document.getElementById("qualquester-ui") || document.getElementById("orion-ui");
                    if (ui) ui.style.display = "flex";
                } else {
                    launchQualquester();
                }
            }
        },
        {
            name: "orion",
            description: "QualQuester (Orion Alias) öffnen",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: () => {
                const isRunning = (window as any).qualquesterLock || (window as any).orionLock;
                if (isRunning) {
                    const ui = document.getElementById("qualquester-ui") || document.getElementById("orion-ui");
                    if (ui) ui.style.display = "flex";
                } else {
                    launchQualquester();
                }
            }
        }
    ]
});
