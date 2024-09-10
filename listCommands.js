const { REST, Routes } = require('discord.js');
const rest = new REST({ version: '10' }).setToken('你的機器人Token');

(async () => {
    try {
        console.log('Fetching application (/) commands.');

        // 獲取所有全域指令
        const commands = await rest.get(Routes.applicationCommands('你的應用程式ID'));

        // 列出所有指令及其 ID
        console.log('已知的:');
        commands.forEach(command => {
            console.log(`Name: ${command.name}, ID: ${command.id}`);
        });
    } catch (error) {
        console.error(error);
    }
})();
