const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron'); // 일주일 간격 스케줄러를 위한 라이브러리

const configPath = path.resolve(__dirname, '../config.json');

// 스케줄러들을 관리할 객체 (봇 실행 중 동적 관리용)
const activeSchedulers = new Map();

// 스케줄러 함수를 모듈 스코프 바깥에 따로 정의하여 this 바인딩 문제를 원천 차단
function startTrackingSchedule(client, guildId, channelId, initialMessageId) {
    if (activeSchedulers.has(guildId)) {
        activeSchedulers.get(guildId).stop();
    }

    let currentMessageId = initialMessageId;

    const task = cron.schedule('0 0 */7 * *', async () => {
        try {
            const guild = await client.guilds.fetch(guildId).catch(() => null);
            if (!guild) return;

            const channel = await guild.channels.fetch(channelId).catch(() => null);
            if (!channel) return;

            // 기존 메시지 삭제 시도
            const oldMessage = await channel.messages.fetch(currentMessageId).catch(() => null);
            if (oldMessage) {
                await oldMessage.delete().catch(() => null);
            }

            // 새 메시지 작성
            const newMessage = await channel.send({ content: '# :warning: 이 채널에 메세지를 남기지 마세요!!\n# :no_entry_sign: 메세지를 남긴다면 서버에서 자동 추방됩니다!!\n-\n# :warning: DO NOT LEAVE MESSAGES IN THIS CHANNEL!!\n# :no_entry_sign: IF YOU LEAVE MESSAGES, YOU WILL BE AUTOMATICALLY BANNED FROM THIS SERVER!!' });
            currentMessageId = newMessage.id;

            // config.json 파일 업데이트
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (config.guilds && config.guilds[guildId]) {
                config.guilds[guildId].messageId = newMessage.id;
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            }
        } catch (err) {
            console.error(`[스케줄러 에러] Guild: ${guildId}`, err);
        }
    });

    task.start();
    activeSchedulers.set(guildId, task);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('채널')
        .setDescription('서버별 설정')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub.setName('설정').setDescription('서버에 트랩 기능을 활성화합니다.'))
        .addSubcommand(sub => sub.setName('해제').setDescription('서버에 활성화된 트랩 기능을 해제합니다.')),

    async execute(interaction) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const guildId = interaction.guildId;
        const guild = interaction.guild;

        if (!config.guilds) config.guilds = {};

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === '설정') {
            // [중복 방지 체크] 이미 서버 설정 데이터가 존재하는 경우
            if (config.guilds[guildId]) {
                return await interaction.reply({ 
                    content: '⚠️ 이 서버에는 이미 트랩 기능이 설정되어 있습니다. 다시 설정하려면 먼저 </채널 해제:1518616245526728854> 를 실행해 주세요.', 
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            // 1. 안내 및 확인 버튼 생성
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_setup')
                        .setLabel('네, 생성합니다')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('cancel_setup')
                        .setLabel('취소')
                        .setStyle(ButtonStyle.Secondary)
                );

            const response = await interaction.reply({
                content: '## ❓ 트랩 기능을 활성화하시겠습니까?\n확인을 누르면 최상단에 카테고리와 전용 채널이 즉시 생성됩니다.\n\n__**위험한 기능이므로 신중하게 사용해주세요.**__',
                components: [row],
                flags: [MessageFlags.Ephemeral]
            });

            // 2. 버튼 클릭 감지(Collector) 설정 (제한시간 60초)
            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 60000 
            });

            collector.on('collect', async (i) => {
                // 명령어를 입력한 본인이 아닌 경우 방지
                if (i.user.id !== interaction.user.id) {
                    return await i.reply({ content: '❌ 명령어를 입력한 관리자만 누를 수 있습니다.', flags: [MessageFlags.Ephemeral] });
                }

                if (i.customId === 'cancel_setup') {
                    row.components.forEach(btn => btn.setDisabled(true)); // 버튼 비활성화
                    await i.update({ content: '❌ 트랩 채널 설정이 취소되었습니다.', components: [row] });
                    return collector.stop();
                }

                if (i.customId === 'confirm_setup') {
                    // 수락 버튼 클릭 시 기존 확인 창을 "생성 중..." 상태로 업데이트
                    row.components.forEach(btn => btn.setDisabled(true));
                    await i.update({ content: '⏳ 카테고리 및 채널을 생성하고 있습니다. 잠시만 기다려 주세요...', components: [row] });

                    try {
                        // 채널 및 카테고리 생성 로직 실행
                        const category = await guild.channels.create({
                            name: '------- DO NOT APPROACH -------',
                            type: ChannelType.GuildCategory,
                            position: 0
                        });

                        const channel = await guild.channels.create({
                            name: 'spam-trap',
                            type: ChannelType.GuildText,
                            permissionOverwrites: [
                                {
                                    id: guild.roles.everyone.id,
                                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                                },
                            ],
                            parent: category.id
                        });

                        const welcomeMessage = await channel.send({ content: '# :warning: 이 채널에 메세지를 남기지 마세요!!\n# :no_entry_sign: 메세지를 남긴다면 서버에서 자동 추방됩니다!!\n-\n# :warning: DO NOT LEAVE MESSAGES IN THIS CHANNEL!!\n# :no_entry_sign: IF YOU LEAVE MESSAGES, YOU WILL BE AUTOMATICALLY BANNED FROM THIS SERVER!!' });

                        // config 데이터 가공 및 저장
                        config.guilds[guildId] = {
                            categoryId: category.id,
                            channelId: channel.id,
                            messageId: welcomeMessage.id,
                            createdAt: new Date().toISOString()
                        };
                        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

                        // 스케줄러 가동 (모듈 내부 스코프 함수 안전하게 호출)
                        startTrackingSchedule(interaction.client, guildId, channel.id, welcomeMessage.id);

                        if (guild.features.includes('COMMUNITY')) {
                            try {
                                // 디스코드 API를 통해 현재 온보딩 데이터 가져오기
                                const onboardingData = await interaction.client.rest.get(
                                    `/guilds/${guildId}/onboarding`
                                ).catch(() => null);

                                if (onboardingData) {
                                    // 기존의 기본 채널 목록 가져오기
                                    const currentDefaultChannels = onboardingData.default_channel_ids || [];
                                    
                                    // 새로 생성한 channel.id 추가 (중복 방지 처리)
                                    if (!currentDefaultChannels.includes(channel.id)) {
                                        currentDefaultChannels.push(channel.id);
                                    }

                                    // 2. 업데이트된 데이터로 온보딩 설정 수정하기
                                    await interaction.client.rest.put(
                                        `/guilds/${guildId}/onboarding`,
                                        {
                                            body: {
                                                default_channel_ids: currentDefaultChannels,
                                                enabled: onboardingData.enabled,
                                                prompts: onboardingData.prompts,
                                                mode: onboardingData.mode
                                            }
                                        }
                                    );
                                    console.log("온보딩 기본 채널 등록 성공!");
                                }
                            } catch (onboardingError) {
                                console.error('온보딩 설정 중 오류가 발생했으나 채널 생성은 유지됩니다:', onboardingError);
                            }
                        } else {
                            console.log(`[${guild.name}] 커뮤니티 서버가 아니므로 온보딩 설정을 건너뜁니다.`);
                        }

                        // 최종 완료 알림 업데이트
                        await interaction.editReply({ content: '✅ 카테고리 및 채널 생성이 완료되었으며, 트랩 기능이 성공적으로 활성화되었습니다.', components: [] });
                    } catch (error) {
                        console.error(error);
                        await interaction.editReply({ content: '❌ 채널 설정 중 오류가 발생했습니다. 권한을 확인해 주세요.', components: [] });
                    }
                    collector.stop();
                }
            });

            // 제한시간(60초) 동안 아무 버튼도 안 눌렀을 때 처리
            collector.on('end', async (collected, reason) => {
                if (reason === 'time') {
                    row.components.forEach(btn => btn.setDisabled(true));
                    await interaction.editReply({ content: '⏰ 시간 초과로 인해 설정 요청이 만료되었습니다.', components: [row] });
                }
            });
        } 
        
        else if (subcommand === '해제') {
            if (!config.guilds[guildId]) {
                return await interaction.reply({ content: '❌ 이 서버에는 활성화된 트랩 기능이 없습니다.', flags: [MessageFlags.Ephemeral] });
            }

            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            try {
                const targetData = config.guilds[guildId];

                // 현재 명령어가 실행된 채널 ID 체크
                const currentChannelId = interaction.channelId;
                const isExecutingInTrapChannel = (currentChannelId === targetData.channelId);

                // ✨ [수정] 채널을 지우기 "전에" 미리 일반 메시지로 알림을 보냅니다.
                if (isExecutingInTrapChannel) {
                    const trapChannel = await guild.channels.fetch(targetData.channelId).catch(() => null);
                    if (trapChannel) {
                        // 에페메럴이 아니라 일반 메시지 전송 (어차피 잠시 후 채널과 함께 유저 화면에서 사라짐)
                        await trapChannel.send({ content: '🔔 트랩 기능이 해제되어 잠시 후 이 채널이 자동 삭제됩니다...' }).catch(() => null);
                        // 디스코드 서버가 메시지를 유저에게 전달할 수 있도록 0.8초 정도 아주 잠깐 대기
                        await new Promise(resolve => setTimeout(resolve, 800));
                    }
                }

                // 생성했던 채널 및 카테고리 삭제
                const channel = await guild.channels.fetch(targetData.channelId).catch(() => null);
                if (channel) await channel.delete().catch(() => null);

                const category = await guild.channels.fetch(targetData.categoryId).catch(() => null);
                if (category) await category.delete().catch(() => null);

                // 스케줄러 중지 및 데이터 삭제
                if (activeSchedulers.has(guildId)) {
                    activeSchedulers.get(guildId).stop();
                    activeSchedulers.delete(guildId);
                }

                delete config.guilds[guildId];
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

            // 삭제된 트랩 채널 안에서 명령어를 실행한 경우 DM 전송
                if (isExecutingInTrapChannel) {
                    try {
                        await interaction.user.send({
                            content: `🔔 **[${guild.name}]** 서버에서 트랩 채널이 안전하게 삭제되었으며, 트랩 기능이 비활성화되었습니다.`
                        })
                    } catch (e) {
                        console.log("DM이 막혀있어 메시지를 보내지 못했지만, 채널에서 사전 안내를 했으므로 패스합니다.");
                    }
                    return;
                }

                // 정상적인 타 채널에서의 실행이라면 기존대로 에페메럴 웹훅 응답
                await interaction.editReply({ content: '🚫 트랩 기능이 해제되었으며 관련 채널이 삭제되었습니다.' }).catch(() => null);
            } catch (error) {
                console.error('해제 프로세스 중 에러 발생:', error);
                
                try {
                    await interaction.editReply({ content: '❌ 해제 중 오류가 발생했습니다.' });
                } catch (finalError) {
                    console.error('유저에게 에러 메시지를 전달하는 데 실패했습니다.', finalError.message);
                }
            }
        }
    },
    
    // 외부 파일(예: index.js)에서 봇이 켜질 때 기존 서버 스케줄러들을 복구할 수 있도록 함수 노출 유지
    startTrackingSchedule
};