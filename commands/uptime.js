const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('업타임')
        .setDescription('봇이 실행된 이후 연속 구동 시간을 확인합니다.'),

    async execute(interaction) {
        // client.uptime은 봇이 켜진 후 지난 시간(밀리초)을 반환합니다.
        let totalSeconds = (interaction.client.uptime / 1000);
        
        const days = Math.floor(totalSeconds / 86400);
        totalSeconds %= 86400;
        
        const hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);

        // 보기 좋은 문장으로 조립
        let uptimeString = '';
        if (days > 0) uptimeString += `${days}일 `;
        if (hours > 0) uptimeString += `${hours}시간 `;
        if (minutes > 0) uptimeString += `${minutes}분 `;
        uptimeString += `${seconds}초`;

        await interaction.reply({
            content: `⏳ 현재 봇의 연속 구동 시간은 **${uptimeString}** 입니다.`,
            flags: [MessageFlags.Ephemeral] // 본인에게만 보이도록 설정 (원치 않으면 이 줄 삭제)
        });
    },
};