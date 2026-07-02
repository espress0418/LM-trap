const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('개인정보')
        .setDescription('개인정보 처리방침 링크를 확인합니다.'),

    async execute(interaction) {
        // 🔗 본인의 실제 개인정보 처리방침 주소로 변경하세요.
        const privacyUrl = 'https://adofai-mentoring-forum.notion.site/3870b076835d807e8701fbe94d184d3a?source=copy_link'; 

        // 버튼 컴포넌트 생성
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('🔒 개인정보 처리방침 보기')
                    .setStyle(ButtonStyle.Link)
                    .setURL(privacyUrl)
            );

        // 대화창을 깔끔하게 유지하기 위해 비밀 메시지로 전송
        await interaction.reply({
            content: ' 아래 버튼을 클릭하면 개인정보 처리방침 페이지로 이동합니다.',
            components: [row],
            flags: [MessageFlags.Ephemeral]
        });
    },
};