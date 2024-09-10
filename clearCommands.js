const { REST, Routes } = require('discord.js');
const rest = new REST({ version: '10' }).setToken('MTE1Njg1NTkxMzc5NDI2MTEwMw.GR91Ye.xtUxRqvj8xZHmfgiT36J45b7fN6ODw9j96B6Zw');

(async () => {
    try {
        console.log('Started clearing application (/) commands.');

        // 清除所有全域指令
        const commands = await rest.get(Routes.applicationCommands('1156855913794261103'));
        for (const command of commands) {
            await rest.delete(Routes.applicationCommand('1156855913794261103', command.id));
        }

        console.log('Successfully cleared application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();