const { Client, GatewayIntentBits, Collection, PermissionsBitField, EmbedBuilder, ActivityType } = require('discord.js');
const { token } = require('./config.json');
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, 'config.json');

// 설정 파일 로드
const config = require(configPath);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// 명령어 로드 (생략되지 않은 핵심 로직)
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.data.name, command);
}

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    try {
        // 1. 최신 설정을 파일에서 직접 읽기
        const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // 2. 해당 서버(guild)의 트랩 설정 데이터 가져오기
        const guildSettings = currentConfig.guilds?.[message.guild.id];
        
        // 3. 설정 데이터가 없거나, 현재 메시지가 쌓인 채널이 트랩 채널 ID와 다르면 무시
        if (!guildSettings || message.channel.id !== guildSettings.channelId) return;

        // 4. 관리자 권한을 가진 유저라면 예외 처리 (차단 안 함)
        if (message.member && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        // 5. 경고 DM 발송 (유저가 DM을 막아두었을 경우를 대비해 try-catch 처리)
        try {
            // 서버 주인 ID 가져오기
            const ownerId = message.guild.ownerId;
            let contactMentions = `👑 서버 주인: <@${ownerId}>`;

            // 관리자(Administrator 권한을 가진 멤버)들 찾기 (성능을 위해 캐시된 멤버 중 상위 몇 명만 추출)
            const admins = message.guild.members.cache
                .filter(member => member.permissions.has('Administrator') && !member.user.bot && member.id !== ownerId)
                .map(member => `<@${member.id}>`);

            // 만약 관리자 권한을 가진 사람이 더 있다면 목록에 추가 (최대 4명만 표시해서 DM이 길어지는 것 방지)
            if (admins.length > 0) {
                contactMentions += `\n🛠️ 관리자 목록: ${admins.slice(0, 4).join(', ')}`;
            }

            const dmEmbed = new EmbedBuilder()
                .setTitle('🚫 차단 알림')
                .setDescription(
                    `**${message.guild.name}** 서버의 스팸 트랩에 메세지를 남겨 영구 차단되셨습니다.\n` +
                   `복구를 원하시면 아래의 서버 주인 또는 관리자에게 DM으로 문의부탁드립니다.\n\n` +
                  `**[문의처 연락처]**\n${contactMentions}`
              )
               .setColor(0xFF0000)
               .setTimestamp();

            await message.author.send({ embeds: [dmEmbed] });
        } catch (e) { 
            // DM 차단 유저 등 전송 실패 시 처리
            console.error('차단 유저에게 DM을 보내지 못했습니다:', e);
        }

        // 6. 서버에서 영구 차단(Ban) 및 메시지 삭제 (최근 1시간 동안의 메시지)
        try {
            await message.guild.members.ban(message.author.id, {
                reason: '스팸 트랩(spam-trap) 채널에 메시지 작성',
                deleteMessageSeconds: 3600 // 1시간
            });
            console.log(`[트랩 작동] ${message.guild.name} 서버에서 ${message.author.tag} 차단 완료.`);
        } catch (e) { 
            console.error('차단 실패:', e); 
        }

    } catch (error) {
        console.error('config.json 읽기 또는 처리 중 에러 발생:', error);
    }
});

// 명령어 실행 핸들러
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (command) await command.execute(interaction);
});

client.once('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    const configPath = path.resolve(__dirname, './config.json'); // 경로 맞추기
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.guilds) {
            // 채널 명령어 파일을 불러와서 내부 함수 호출
            const channelCommand = client.commands.get('채널'); 
            if (channelCommand && channelCommand.startTrackingSchedule) {
                for (const guildId in config.guilds) {
                    const data = config.guilds[guildId];
                    channelCommand.startTrackingSchedule(client, guildId, data.channelId, data.messageId);
                    console.log(`[스케줄러 재구동] GuildID: ${guildId}`);
                }
            }
        }
    }

	client.user.setPresence({
        activities: [{ 
            name: '해커놈들 어떻게 처리할까 고민하는 중', // 표시될 메시지
            type: ActivityType.Custom // '하는 중' 상태
        }],
        status: 'online', // 온라인 상태 (online, idle, dnd, invisible)
    });
});

client.login(token);