const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, REST, Routes } = require('discord.js');
const moment = require('moment');
const fs = require('fs');

// 創建新的 Discord 客戶端
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
});

const commands = [
  {
    name: '乒',
    description: '會回你Pong!',
  },
  {
    name: '身份證',
    description: '會給你身分證卡片喔！',
    options: [
      {
        name: '使用者',
        type: 6, // USER type
        description: '要查詢的用戶',
        required: true,
      },
    ],
  },
  {
    name: 'login',
    description: '登入你的帳號',
    options: [
      {
        name: 'username',
        type: 'STRING',
        description: 'Your username',
        required: true,
      },
      {
        name: 'password',
        type: 'STRING',
        description: 'Your password',
        required: true,
      },
    ],
  },
  {
    name: 'register',
    description: 'Register a new account',
    options: [
      {
        name: 'username',
        type: 'STRING',
        description: 'Your username',
        required: true,
      },
      {
        name: 'password',
        type: 'STRING',
        description: 'Your password',
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: '10' }).setToken('這裡是DC機器人Token');

(async () => {
  try {
    console.log('開始更新機器人斜線指令');

    await rest.put(
      Routes.applicationCommands('這是DC機器人Client ID'),
      { body: commands },
    );

    console.log('成功更新機器人斜線指令');
  } catch (error) {
    console.error(error);
  }
})();

client.once('ready', () => {
  console.log('機器人已上線!');
});


client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === '乒') {
    await interaction.reply('Pong!');
  }

  if (commandName === '身份證') {
    const user = interaction.options.getMember('使用者') || interaction.member;

    if (user.id !== interaction.user.id && !interaction.member.roles.cache.some(role => allowedRoles.includes(role.id))) {
      return interaction.reply('❌ 你沒有權限查詢其他用戶的身份證。');
    }

    const roles = user.roles.cache
      .filter(role => role.name !== '@everyone')
      .map(role => role.name)
      .join(', ') || '無';

    let warningList = '無';
    if (warnings[user.id] && warnings[user.id].length > 0) {
      warningList = warnings[user.id]
        .map((warn, i) => `${i + 1}. 時間: ${warn.timestamp}, 原因: ${warn.reason}, 管理員: ${warn.adminName}`)
        .join('\n');
    }

    const embed = new EmbedBuilder()
      .setTitle(`📇 身分證 - ${user.displayName}`)
      .addFields(
        { name: '👤 用戶名', value: `${user.user.username}#${user.user.discriminator}`, inline: true },
        { name: '🆔 用戶ID', value: `${user.id}`, inline: true },
        { name: '📅 加入日期', value: `${moment(user.joinedAt).format('YYYY-MM-DD HH:mm:ss')}`, inline: true },
        { name: '🔖 角色', value: roles, inline: true },
        { name: '⚠️ 警告記錄', value: warningList, inline: false }
      )
      .setColor(0x00AE86)
      .setThumbnail(user.user.displayAvatarURL({ dynamic: true }));

    try {
      await interaction.user.send({ embeds: [embed] });
    } catch (error) {
      console.error('❌ 無法私訊用戶，身份證未能傳送。');
    }

    const idCardChannel = interaction.guild.channels.cache.get(idCardChannelId);

    if (!idCardChannel) {
      return interaction.reply('❌ 找不到身份證顯示頻道。');
    }

    idCardChannel.send({ embeds: [embed] });
  }
});



// 記錄警告數據的文件名
const warningsFile = './warnings.json';

// 警告數據
let warnings = {};

// 統一的通知頻道 ID（用於封鎖、禁言、警告等通知）
const notificationChannelId = '825293220401381407'; // 替換為你的通知頻道 ID

// 身份證備份頻道 ID
const idCardChannelId = '1277559746823585835'; // 替換為身份證備份頻道的 ID

// 許可查詢所有用戶身份證的角色 ID
const allowedRoles = ['782937754229014568', '832238407118749726', '1074005277881421864', '782571203700719616']; // 替換為你的角色 ID

// 初始化警告數據
function loadWarnings() {
  if (fs.existsSync(warningsFile)) {
    const data = fs.readFileSync(warningsFile, 'utf-8');
    warnings = JSON.parse(data);
  } else {
    warnings = {};
  }
}

// 保存警告數據到文件
function saveWarnings() {
  fs.writeFileSync(warningsFile, JSON.stringify(warnings, null, 2));
}

// 機器人啟動時讀取警告數據
client.once('ready', () => {
  console.log(`✅ 機器人已登入為 ${client.user.tag}`);
  loadWarnings(); // 啟動時讀取警告數據
});

// 封鎖用戶指令：!ban @用戶 原因
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('!ban') || message.author.bot) return;

  if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
    return message.reply('❌ 你沒有權限使用這個指令。');
  }

  const args = message.content.split(' ').slice(1);
  const user = message.mentions.members.first();
  const reason = args.slice(1).join(' ') || '無原因';

  if (!user) return message.reply('❌ 請指定要封鎖的用戶。');

  try {
    await user.ban({ reason });
    message.reply(`🔒 已封鎖 ${user.user.tag}。\n原因：${reason}`);

    const notificationChannel = message.guild.channels.cache.get(notificationChannelId);

    if (notificationChannel) {
      const embed = new EmbedBuilder()
        .setTitle(`🚫 **封鎖公告**`)
        .addFields(
          { name: '🔹 用戶', value: `${user.user.username}#${user.user.discriminator}`, inline: true },
          { name: '🔹 原因', value: `${reason}`, inline: true },
          { name: '🔹 封鎖時間', value: `${moment().format('YYYY-MM-DD HH:mm:ss')}`, inline: true }
        )
        .setColor(0xFF0000)
        .setThumbnail(user.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: '此為自動通知，請遵守規則。' });

      notificationChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error(error);
    message.reply('❌ 封鎖用戶時發生錯誤。');
  }
});

// 禁言用戶指令：!mute @用戶 時間(分鐘) 原因
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('!mute') || message.author.bot) return;

  if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
    return message.reply('❌ 你沒有權限使用這個指令。');
  }

  const args = message.content.split(' ').slice(1);
  const user = message.mentions.members.first();
  const muteTime = args[1] ? parseInt(args[1], 10) * 60 * 1000 : null;
  const reason = args.slice(2).join(' ') || '無原因';

  if (!user) return message.reply('❌ 請指定要禁言的用戶。');

  try {
    await user.timeout(muteTime, reason);
    message.reply(`🔇 已禁言 ${user.user.tag}。\n原因：${reason}`);

    const notificationChannel = message.guild.channels.cache.get(notificationChannelId);

    if (notificationChannel) {
      const embed = new EmbedBuilder()
        .setTitle(`🔇 **禁言公告**`)
        .addFields(
          { name: '🔹 用戶', value: `${user.user.username}#${user.user.discriminator}`, inline: true },
          { name: '🔹 原因', value: `${reason}`, inline: true },
          { name: '🔹 禁言時間', value: `${moment().format('YYYY-MM-DD HH:mm:ss')}`, inline: true },
          { name: '🔹 禁言長度', value: muteTime ? `${args[1]} 分鐘` : '永久', inline: true }
        )
        .setColor(0xFFA500)
        .setThumbnail(user.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: '此為自動通知，請遵守規則。' });

      notificationChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error(error);
    message.reply('❌ 禁言用戶時發生錯誤。');
  }
});

// 解除禁言指令：!unmute @用戶
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('!unmute') || message.author.bot) return;

  if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
    return message.reply('❌ 你沒有權限使用這個指令。');
  }

  const user = message.mentions.members.first();
  if (!user) return message.reply('❌ 請指定要解除禁言的用戶。');

  try {
    await user.timeout(null);
    message.reply(`🔊 已解除 ${user.user.tag} 的禁言。`);

    const notificationChannel = message.guild.channels.cache.get(notificationChannelId);

    if (notificationChannel) {
      const embed = new EmbedBuilder()
        .setTitle(`🔊 **解除禁言公告**`)
        .addFields(
          { name: '🔹 用戶', value: `${user.user.username}#${user.user.discriminator}`, inline: true },
          { name: '🔹 解除時間', value: `${moment().format('YYYY-MM-DD HH:mm:ss')}`, inline: true }
        )
        .setColor(0x00FF00)
        .setThumbnail(user.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: '此為自動通知。' });

      notificationChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error(error);
    message.reply('❌ 解除禁言時發生錯誤。');
  }
});

// 警告系統：!issue_warn @用戶 原因
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('!issue_warn') || message.author.bot) return;

  if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
    return message.reply('❌ 你沒有權限使用這個指令。');
  }

  const args = message.content.split(' ').slice(1);
  const user = message.mentions.members.first();
  const reason = args.slice(1).join(' ') || '無原因';

  if (!user) return message.reply('❌ 請提供格式正確的指令：`!issue_warn @用戶 原因`。');

  const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
  const adminName = message.author.tag;

  if (!warnings[user.id]) warnings[user.id] = [];
  warnings[user.id].push({ reason, timestamp, adminName });

  saveWarnings();

  try {
    await user.send(`⚠️ 你已被警告，原因是：${reason}`);
  } catch (err) {
    message.reply(`⚠️ 無法發送私信給 ${user.user.tag}，但警告已記錄。`);
  }

  message.reply(`⚠️ 已成功給 ${user.user.tag} 發出警告。\n原因：${reason}\n時間：${timestamp}`);

  const notificationChannel = message.guild.channels.cache.get(notificationChannelId);

  if (notificationChannel) {
    const embed = new EmbedBuilder()
      .setTitle(`⚠️ **警告公告**`)
      .addFields(
        { name: '🔹 用戶', value: `${user.user.username}#${user.user.discriminator}`, inline: true },
        { name: '🔹 原因', value: `${reason}`, inline: true },
        { name: '🔹 發出警告時間', value: `${timestamp}`, inline: true },
        { name: '🔹 管理員', value: `${adminName}`, inline: true }
      )
      .setColor(0xFF0000)
      .setThumbnail(user.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: '此為自動通知，請遵守規則。' });

    notificationChannel.send({ embeds: [embed] });
  }
});

// 清除警告指令：!clear_warning @用戶 警告編號
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('!clear_warning') || message.author.bot) return;

  if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
    return message.reply('❌ 你沒有權限使用這個指令。');
  }

  const args = message.content.split(' ').slice(1);
  const user = message.mentions.members.first();
  const warningIndex = parseInt(args[1], 10) - 1;

  if (!user || isNaN(warningIndex)) return message.reply('❌ 請提供格式正確的指令：`!clear_warning @用戶 警告編號`。');

  if (!warnings[user.id] || warnings[user.id].length <= warningIndex) {
    return message.reply('❌ 用戶的該警告記錄不存在。');
  }

  const removedWarning = warnings[user.id].splice(warningIndex, 1)[0];
  saveWarnings();

  message.reply(`⚠️ 已成功清除 ${user.user.tag} 的警告記錄：\n原因：${removedWarning.reason}\n時間：${removedWarning.timestamp}`);

  const notificationChannel = message.guild.channels.cache.get(notificationChannelId);

  if (notificationChannel) {
    const embed = new EmbedBuilder()
      .setTitle(`🗑️ **清除警告公告**`)
      .addFields(
        { name: '🔹 用戶', value: `${user.user.username}#${user.user.discriminator}`, inline: true },
        { name: '🔹 清除原因', value: `${removedWarning.reason}`, inline: true },
        { name: '🔹 清除時間', value: `${moment().format('YYYY-MM-DD HH:mm:ss')}`, inline: true },
        { name: '🔹 管理員', value: `${message.author.tag}`, inline: true }
      )
      .setColor(0x00FF00)
      .setThumbnail(user.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: '此為自動通知。' });

    notificationChannel.send({ embeds: [embed] });
  }
});

// 發送公告指令：!send_announcement 公告內容
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('!send_announcement') || message.author.bot) return;

  const announcement = message.content.split(' ').slice(1).join(' ');
  if (!announcement) return message.reply('❌ 請提供公告內容。');

  const announcementChannelId = '834770383323791420'; // 替換為你的公告頻道 ID
  const channel = message.guild.channels.cache.get(announcementChannelId);

  if (!channel) return message.reply('❌ 找不到指定的公告頻道。');

  channel.send(`${announcement}`);
  message.reply('✅ 公告已發送到指定頻道。');
});

// 身分證系統：!id_card


// 機器人登入
client.login('你的DC機器人Token'); // 替換為你的機器人 Token
