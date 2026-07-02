const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('지원')
        .setDescription('봇 서포트(지원) 서버 링크를 확인합니다.'),

    async execute(interaction) {
        // 🔗 본인의 디스코드 서포트 서버 초대 링크를 입력하세요.
        const supportServerUrl = 'https://discord.gg/kScuRkTcPp'; 

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('🤝 서포트 서버 참여하기')
                    .setStyle(ButtonStyle.Link)
                    .setURL(supportServerUrl)
            );

        await interaction.reply({
            content: '🤖 봇 사용 중 문제나 문의사항이 있다면 아래 서포트 서버를 방문해 주세요!',
            components: [row],
            flags: [MessageFlags.Ephemeral] // 본인에게만 보이도록 설정 (원치 않으면 이 줄 삭제)
        });
    },
};