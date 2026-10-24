/*
 * QualQuester Plugin for Qualcord
 * Automatically completes Discord Quests (Video, Game, Stream, Activity)
 * With HeaderBar integration in the top titlebar.
 */

import { ApplicationCommandInputType } from "@api/Commands";
import { HeaderBarButton } from "@api/HeaderBar";
import definePlugin from "@utils/types";
import type { ComponentType, SVGProps } from "react";

import { launchQualquester } from "./qualquesterRunner";

export function QuestIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            width={props.width ?? 18}
            height={props.height ?? 18}
            viewBox="0 0 24 24"
            fill="currentColor"
            {...props}
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.64 6.72-2.12 5.09a1 1 0 0 1-.55.55l-5.09 2.12a.5.5 0 0 1-.65-.65l2.12-5.09a1 1 0 0 1 .55-.55l5.09-2.12a.5.5 0 0 1 .65.65zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
            />
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
    authors: [
        {
            name: "Qualcord",
            id: 0n
        }
    ],
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
