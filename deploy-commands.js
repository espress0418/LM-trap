const { REST, Routes } = require('discord.js');
const { clientId, token } = require('./config.json');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    }
}

const rest = new REST().setToken(token);

(async () => {
    try {
        console.log(`${commands.length}개의 슬래시 명령어 등록을 시작합니다.`);

        const data = await rest.put(Routes.applicationCommands(clientId), { body: commands });

        console.log(`${data.length}개의 명령어가 성공적으로 등록되었습니다.`);
    } catch (error) {
        console.error(error);
    }
})();