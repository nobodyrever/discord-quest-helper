(async function () {
    delete window.$;
    let wpRequire = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
    webpackChunkdiscord_app.pop();

    let ApplicationStreamingStore = Object.values(wpRequire.c).find(x => x?.exports?.A?.__proto__?.getStreamerActiveStreamMetadata)?.exports?.A;
    let RunningGameStore = Object.values(wpRequire.c).find(x => x?.exports?.Ay?.getRunningGames)?.exports?.Ay;
    let QuestsStore = Object.values(wpRequire.c).find(x => x?.exports?.A?.__proto__?.getQuest)?.exports?.A;
    let ChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.A?.__proto__?.getAllThreadsForParent)?.exports?.A;
    let GuildChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.Ay?.getSFWDefaultChannel)?.exports?.Ay;
    let FluxDispatcher = Object.values(wpRequire.c).find(x => x?.exports?.h?.__proto__?.flushWaitQueue)?.exports?.h;
    let api = Object.values(wpRequire.c).find(x => x?.exports?.Bo?.get)?.exports?.Bo;

    const supportedTasks = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"];
    
    let quests = [...QuestsStore.quests.values()].filter(x => 
        x.userStatus?.enrolledAt && 
        !x.userStatus?.completedAt && 
        new Date(x.config.expiresAt).getTime() > Date.now() && 
        supportedTasks.find(y => Object.keys((x.config.taskConfig ?? x.config.taskConfigV2).tasks).includes(y))
    );

    let isApp = typeof DiscordNative !== "undefined";

    if (quests.length === 0) {
        console.log("%c[QuestEngine] You don't have any uncompleted quests!", "color:orange;font-weight:bold;");
    } else {
        let doJob = function () {
            const quest = quests.pop();
            if (!quest) return;

            const pid = Math.floor(Math.random() * 30000) + 1000;
            const questName = quest.config.messages.questName;
            const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
            const taskName = supportedTasks.find(x => taskConfig.tasks[x] != null);
            const taskData = taskConfig.tasks[taskName];
            const applicationId = quest.config.application?.id ?? taskData.applications?.[0]?.id;
            const secondsNeeded = taskData.target;
            let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;

            console.log(`%c[QuestEngine] Starting quest: "${questName}" | Task: ${taskName}`, "color:#5865F2;font-weight:bold;");

            if (taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
                const speed = 7;
                let completed = false;
                let fn = async () => {
                    while (true) {
                        const remaining = Math.min(speed, secondsNeeded - secondsDone);
                        await new Promise(resolve => setTimeout(resolve, remaining * 1000));

                        const timestamp = secondsDone + speed;
                        const res = await api.post({
                            url: `/quests/${quest.id}/video-progress`,
                            body: { timestamp: Math.min(secondsNeeded, timestamp + Math.random()) }
                        });
                        completed = res.body.completed_at != null;
                        secondsDone = Math.min(secondsNeeded, timestamp);
                        
                        console.log(`[QuestEngine] Video progress: ${Math.floor(secondsDone)}/${secondsNeeded}`);

                        if (timestamp >= secondsNeeded) {
                            break;
                        }
                    }
                    if (!completed) {
                        await api.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: secondsNeeded } });
                    }
                    console.log("%c[QuestEngine] Quest completed!", "color:lime;font-weight:bold;");
                    doJob();
                };
                fn();
            } else if (taskName === "PLAY_ON_DESKTOP") {
                if (!isApp) {
                    console.log("[QuestEngine] Use the Discord desktop app to complete PLAY_ON_DESKTOP quests!");
                } else {
                    api.get({ url: `/applications/public?application_ids=${applicationId}` }).then(res => {
                        const appData = res.body[0];
                        const exeName = appData.executables?.find(x => x.os === "win32")?.name?.replace(">", "") ?? appData.name.replace(/[\/\\:*?"<>|]/g, "");

                        const fakeGame = {
                            cmdLine: `C:\\Program Files\\${appData.name}\\${exeName}`,
                            exeName,
                            exePath: `c:/program files/${appData.name.toLowerCase()}/${exeName}`,
                            hidden: false,
                            isLauncher: false,
                            id: applicationId,
                            name: appData.name,
                            pid: pid,
                            pidPath: [pid],
                            processName: appData.name,
                            start: Date.now(),
                        };
                        const realGames = RunningGameStore.getRunningGames();
                        const fakeGames = [fakeGame];
                        const realGetRunningGames = RunningGameStore.getRunningGames;
                        const realGetGameForPID = RunningGameStore.getGameForPID;
                        
                        RunningGameStore.getRunningGames = () => fakeGames;
                        RunningGameStore.getGameForPID = (pid) => fakeGames.find(x => x.pid === pid);
                        FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: fakeGames });

                        let fn = data => {
                            let progress = quest.config.configVersion === 1 ? data.userStatus.streamProgressSeconds : Math.floor(data.userStatus.progress.PLAY_ON_DESKTOP.value);
                            console.log(`[QuestEngine] Quest progress: ${progress}/${secondsNeeded}`);

                            if (progress >= secondsNeeded) {
                                console.log("%c[QuestEngine] Quest completed!", "color:lime;font-weight:bold;");
                                RunningGameStore.getRunningGames = realGetRunningGames;
                                RunningGameStore.getGameForPID = realGetGameForPID;
                                FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: [] });
                                FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                                doJob();
                            }
                        };
                        FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                        console.log(`[QuestEngine] Spoofed game to ${appData.name}.`);
                    });
                }
            } else if (taskName === "STREAM_ON_DESKTOP") {
                if (!isApp) {
                    console.log("[QuestEngine] Use the Discord desktop app to complete STREAM_ON_DESKTOP quests!");
                } else {
                    let realFunc = ApplicationStreamingStore.getStreamerActiveStreamMetadata;
                    ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({
                        id: applicationId,
                        pid,
                        sourceName: null
                    });

                    let fn = data => {
                        let progress = quest.config.configVersion === 1 ? data.userStatus.streamProgressSeconds : Math.floor(data.userStatus.progress.STREAM_ON_DESKTOP.value);
                        console.log(`[QuestEngine] Quest progress: ${progress}/${secondsNeeded}`);

                        if (progress >= secondsNeeded) {
                            console.log("%c[QuestEngine] Quest completed!", "color:lime;font-weight:bold;");
                            ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc;
                            FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                            doJob();
                        }
                    };
                    FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                    console.log(`[QuestEngine] Spoofed stream. Stream any window in a voice channel with at least 1 other person.`);
                }
            } else if (taskName === "PLAY_ACTIVITY") {
                const channelId = ChannelStore.getSortedPrivateChannels()[0]?.id ?? Object.values(GuildChannelStore.getAllGuilds()).find(x => x != null && x.VOCAL.length > 0)?.VOCAL[0]?.channel?.id;
                if (!channelId) {
                    console.log("[QuestEngine] Error: Join a voice channel first to run PLAY_ACTIVITY quests.");
                    return;
                }
                const streamKey = `call:${channelId}:1`;

                let fn = async () => {
                    while (true) {
                        const res = await api.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: false } });
                        const progress = res.body.progress.PLAY_ACTIVITY.value;
                        console.log(`[QuestEngine] Quest progress: ${progress}/${secondsNeeded}`);

                        await new Promise(resolve => setTimeout(resolve, 20 * 1000));

                        if (progress >= secondsNeeded) {
                            await api.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: true } });
                            break;
                        }
                    }
                    console.log("%c[QuestEngine] Quest completed!", "color:lime;font-weight:bold;");
                    doJob();
                };
                fn();
            }
        };
        doJob();
    }
})();
