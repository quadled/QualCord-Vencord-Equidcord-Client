/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { AudioPlayerInternal, AudioPlayerOptions, audioProcessorFunctions, AudioType, identifyAudioType, playAudio } from "@api/AudioPlayer";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "AudioPlayerAPI",
    description: "API to play internal Discord audio files or external audio links.",
    authors: [EquicordDevs.Etorix],
    AudioType,
    playAudio,

    patches: [
        {
            find: "could not play audio",
            group: true,
            replacement: [
                {
                    // Uses the audio as-is if external, otherwise checks for an internal Discord sound.
                    // Also force loads the internal sounds module to account for the second patch group below,
                    // as well as accounting for not calling the module in this patch when this.type is not DISCORD.
                    match: /(let \i=class.{0,1250}?new Audio;\i.src=)((\i\(\d+\))\(`\.\/\$\{)this.name(\}\.mp3`\))/,
                    replace: "$3;$1this.type!==$self.AudioType.DISCORD?this.audio:$2this.audio$4"
                },
                {
                    // Adds an optional persistent boolean as well as a callback and error handler to the
                    // audio player which is called after the audio finishes playing and when an error occurs.
                    // Also processes the audio before playing to apply override functions set by plugins.
                    match: /constructor\(((?:\i,){3}\i)([^)]*)\)\{[^}]+}/,
                    replace: "constructor(options,$1$2){$self.buildPlayer(this,options,$1);}"
                },
                {
                    // Prevents an error from the source being cleared during destroyAudio().
                    match: /(\i.pause\(\),(\i).src="".{0,20}?null)/,
                    replace: "$2.onerror=()=>{},$1"
                },
                {
                    // Applies the playback rate passed through options.
                    match: /(?<=(\i).onloadeddata=\(\)=>{)/,
                    replace: "$1.playbackRate=this._speed,"
                },
                {
                    // Makes use of the error handler if an error occurs during playback.
                    match: /(onerror=\()(\)=>{)(?=let)/,
                    replace: "$1error$2this.onError?.(error);"
                },
                {
                    // Makes use of the onEnded callback and persists flag once the audio ends.
                    match: /(?<=onended=\(\)=>)(.{0,40}?),/,
                    replace: "{$self.stopAudio(this);this.onEnded?.();},"
                },
                {
                    // Makes use of the persists flag once the audio is stopped.
                    match: /(stop\()(\){)this.destroyAudio\(\)/,
                    replace: "$1restart$2$self.stopAudio(this,restart);"
                },
                {
                    // Use our playAudio function in place of the default playGiftSound.
                    match: /let \i=new Audio\((\(0,\i.\i\)\(\i\)).{0,35}?play\(\)/,
                    replace: "$self.playAudio($1)"
                }
            ]
        },
        {
            // Pass undefined for options in default Discord calls to the audio constructor.
            find: "SoundUtils",
            replacement: {
                match: /return new (\i)\(([^)]+)\)(?=\})/,
                replace: "return new $1(undefined,$2)"
            }
        },
        {
            // Prevents Discord from forcing full volume for the "discodo" effect on client load.
            // The internal sounds module being loaded on startup relies on one of these calls to volume
            // regardless of if the "discodo" effect is enabled or not. This is due to the volume setter
            // internally calling the ensureAudio function which is where the internal sounds module is loaded
            // by default. To account for this, the module is force loaded in the first patch in the above group.
            find: '"UPDATE_OPEN_ON_STARTUP"',
            group: true,
            replacement: [
                {
                    // Pass the unprocessed volume as 1 instead of overwriting it to 1 afterwards.
                    match: /(?<=discodo",\i)(\);return )\i.volume=1,/,
                    replace: ",1$1"
                },
                {
                    // Don't re-set volume since it was already set during initialization.
                    match: /,(this._connectedSound.volume)=1/,
                    replace: ";"
                }
            ]
        }
    ],

    stopAudio(player: AudioPlayerInternal, restart?: boolean) {
        if (restart) {
            player.ensureAudio().then(audio => {
                audio.currentTime = 0;
                audio.play();
            });
        } else {
            if (!player.persistent) {
                player.destroyAudio();
            } else {
                // Use _audio instead of ensureAudio() to avoid
                // loading the audio if there is none loaded.
                player._audio?.then(audio => {
                    audio.pause();
                    audio.currentTime = 0;
                });
            }
        }
    },

    processAudio(player: AudioPlayerInternal) {
        player.preprocessDataPrevious = player.preprocessDataCurrent ? structuredClone(player.preprocessDataCurrent) : null;
        player.preprocessDataCurrent = structuredClone(player.preprocessDataOriginal);
        player.preprocessDataCurrent.volume *= 100;

        for (const processor of Object.values(audioProcessorFunctions)) {
            try {
                processor(player.preprocessDataCurrent);
            } catch (err) {
                console.error("[AudioPlayerAPI] Error in audio processor:", err);
            }
        }

        player.preprocessDataCurrent.volume /= 100;
        player.audio = player.preprocessDataCurrent.audio;
        player.name = player.audio;
        (player as any)._name = player.audio;
        player.type = identifyAudioType(player.preprocessDataCurrent.audio);

        const currentVolume = typeof player.preprocessDataCurrent.volume === "number" && !isNaN(player.preprocessDataCurrent.volume)
            ? player.preprocessDataCurrent.volume
            : 1;
        const currentSpeed = typeof player.preprocessDataCurrent.speed === "number" && !isNaN(player.preprocessDataCurrent.speed)
            ? player.preprocessDataCurrent.speed
            : 1;

        player._volume = Math.max(0, Math.min(1, currentVolume));
        player._speed = Math.max(0.0625, Math.min(16, currentSpeed));
        (player as any)._playbackRate = player._speed;

        if (player.preprocessDataCurrent.audio !== player.preprocessDataPrevious?.audio) {
            player.destroyAudio();
            player.persistent && player.ensureAudio();
        }

        if (player.preprocessDataCurrent.volume !== player.preprocessDataPrevious?.volume) {
            player._audio?.then(audio => {
                audio.volume = player._volume;
            });
        }

        if (player.preprocessDataCurrent.speed !== player.preprocessDataPrevious?.speed) {
            player._audio?.then(audio => {
                audio.playbackRate = player._speed;
            });
        }
    },

    buildPlayer(
        player: AudioPlayerInternal,
        arg0: any,
        arg1?: any,
        arg2?: any,
        arg3?: any,
        arg4?: any
    ) {
        let soundOptions: AudioPlayerOptions = {};
        let soundName = "";
        let soundVolume = 1;
        let soundChannel = "default";
        let trackNotificationFailure = false;

        if (typeof arg0 === "object" && arg0 !== null) {
            // Equicord style: (options, audio, unused, internalVolume, channel)
            soundOptions = arg0;
            soundName = typeof arg1 === "string" ? arg1 : "";
            if (typeof arg3 === "number") {
                soundVolume = arg3;
            } else if (typeof soundOptions.volume === "number") {
                soundVolume = soundOptions.volume / 100;
            }
            if (typeof arg4 === "string") soundChannel = arg4;
        } else if (typeof arg0 === "string") {
            // Direct Discord call without options:
            soundName = arg0;
            soundOptions = {};
            if (typeof arg1 === "string" && typeof arg2 === "number") {
                // (soundFile, soundName, volume, channel, trackNotificationFailure)
                soundVolume = arg2;
                if (typeof arg3 === "string") soundChannel = arg3;
                if (typeof arg4 === "boolean") trackNotificationFailure = arg4;
            } else if (typeof arg1 === "number") {
                // (soundName, volume, channel)
                soundVolume = arg1;
                if (typeof arg2 === "string") soundChannel = arg2;
            } else if (typeof arg2 === "number") {
                soundVolume = arg2;
                if (typeof arg3 === "string") soundChannel = arg3;
            }
        } else if (arg0 == null && typeof arg1 === "string") {
            // Patched Discord call: (undefined, soundFile, soundName, volume, channel)
            soundName = arg1;
            soundOptions = {};
            if (typeof arg2 === "string" && typeof arg3 === "number") {
                soundVolume = arg3;
                if (typeof arg4 === "string") soundChannel = arg4;
            } else if (typeof arg2 === "number") {
                soundVolume = arg2;
                if (typeof arg3 === "string") soundChannel = arg3;
            }
        } else {
            soundName = typeof arg1 === "string" ? arg1 : (typeof arg0 === "string" ? arg0 : "");
        }

        const safeVolume = typeof soundVolume === "number" && !isNaN(soundVolume)
            ? Math.max(0, Math.min(1, soundVolume))
            : (typeof soundOptions.volume === "number" ? Math.max(0, Math.min(1, soundOptions.volume / 100)) : 1);
        const safeSpeed = Math.max(0.0625, Math.min(16, soundOptions.speed ?? 1));

        player.preprocessDataOriginal = {
            audio: soundName,
            type: identifyAudioType(soundName),
            volume: safeVolume,
            speed: safeSpeed,
        };

        player.name = soundName;
        (player as any)._name = soundName;
        player.audio = soundName;
        player._audio = null;
        player._volume = safeVolume;
        player._speed = safeSpeed;
        (player as any)._playbackRate = safeSpeed;
        player.preload = soundOptions.preload ?? false;
        player.persistent = soundOptions.persistent ?? false;
        player.type = identifyAudioType(soundName);
        player.outputChannel = soundChannel || "default";
        (player as any).trackNotificationFailure = trackNotificationFailure;
        player.onEnded = soundOptions.onEnded;
        player.onError = soundOptions.onError;

        player.processAudio = () => this.processAudio(player);
        player.processAudio();
        player.preload && player.ensureAudio();
    }
});
