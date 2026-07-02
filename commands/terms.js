const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('이용약관')
        .setDescription('서비스 이용약관 링크를 확인합니다.'),

    async execute(interaction) {
        // 🔗 본인의 실제 이용약관 주소로 변경하세요.
        const termsUrl = 'https://adofai-mentoring-forum.notion.site/3870b076835d807d8a61d4bf3971b358?source=copy_link'; 

        // 버튼 컴포넌트 생성
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('📄 이용약관 보기')
                    .setStyle(ButtonStyle.Link)
                    .setURL(termsUrl)
            );

        // MessageFlags.Ephemeral을 사용해 명령어 친 사용자에게만 비밀 메시지로 전송
        await interaction.reply({
            content: ' 아래 버튼을 클릭하면 서비스 이용약관 페이지로 이동합니다.',
            components: [row],
            flags: [MessageFlags.Ephemeral] 
        });
    },
};