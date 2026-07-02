const { REST, Routes } = require('discord.js');
const { clientId, token } = require('./config.json');

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('서버의 모든 명령어를 삭제 중입니다...');

        await rest.put(Routes.applicationCommands(clientId), { body: [] });

        console.log('모든 명령어가 성공적으로 삭제되었습니다.');
    } catch (error) {
        console.error(error);
    }
})();