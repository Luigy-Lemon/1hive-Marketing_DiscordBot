
/*  SETUP */

const path = require('path'),
    dotenv = require('dotenv').config(),
    Discord = require("discord.js"),
    { openNewTask } = require('./controller/cron.js'),
    { getMessages, createNewRole, deleteCurrentRole, purgeRegisterMessageReactions, setupRegisterMessage } = require("./utilities/discord.js");



const client = new Discord.Client({ messageCacheMaxSize: 2000, fetchAllMembers: true, partials: ['MESSAGE', 'CHANNEL', 'REACTION','GUILD_MEMBER'] });
const prefix = "config ";

let RegisterMessage = {
    channelID: process.env.REGISTER_CHANNELID,
    messageID: process.env.REGISTER_MESSAGEID,
    roleID: false
}

const guildID = process.env.GUILDID;
const cachedChannels = process.env.CACHED_CHANNELS.split(',')
const marketingChannelID = process.env.MARKETING_CHANNELID
const adminRoleID = process.env.ADMIN_ROLEID

let MarketingRoleMembers = false;

client.once('ready', async () => {
    setupRegisterMessage(RegisterMessage.channelID, RegisterMessage.messageID)
    for (let channel of cachedChannels) {
        try {
            const cachedChannel = await client.channels.fetch(channel)
            if (cachedChannel.id === RegisterMessage.channelID) {
                await cachedChannel.messages.fetch(RegisterMessage.messageID);
                console.log('caching register message')
            }
            if (cachedChannel.id === marketingChannelID) {
                await cachedChannel.messages.fetch();
                await cachedChannel.guild.members.fetch();
            }
            let marketingRole = cachedChannel.guild.roles.cache.filter(role => role.name === "Marketing Curator").first()
            if (marketingRole) {
                RegisterMessage.roleID = marketingRole.id;
                MarketingRoleMembers = marketingRole.members.size;
            }

        }
        catch (err) {
            console.error('Error fetching channel messages', err)
        }
    }
    console.log(RegisterMessage)
    console.log('Members: ' + MarketingRoleMembers)
});


client.on("message", async function (message) {
    if (!cachedChannels.includes(message.channel.id)) return
    if (message.author.bot) return;

    // if it has a command prefix
    if (prefix === message.content.slice(0, prefix.length) && message.member.roles.cache.has(adminRoleID)) {

        const commandBody = message.content.slice(prefix.length);
        const args = commandBody.split(' ');
        const command = args.shift().toLowerCase();

        if (command === "ping") {
            message.reply(`Pong!`);
            return
        }

        else if (command === "help") {
            message.reply('ask luigy');
        }

        else if (command === "reset") {
            try {
                await purgeRegisterMessageReactions(RegisterMessage.channelID, RegisterMessage.messageID)
                if (RegisterMessage.roleID) {
                    deleteCurrentRole(guildID, RegisterMessage.roleID)
                }
                let createdRole = await createNewRole(guildID, marketingChannelID)
                RegisterMessage.roleID = createdRole
                await setupRegisterMessage(RegisterMessage.channelID, RegisterMessage.messageID)
                message.reply(`The role \`Marketing Curator\` has been reset and the <#${marketingChannelID}> channel requires re-enrolling. ${MarketingRoleMembers} were registered`);
                await getMessages(marketingChannelID, { limit: 100 })
            } catch (err) { console.log(err) }
        }

        else if (command === "start") {
            try {
                if (RegisterMessage.roleID) {
                    message.reply('The role is already set, use `config reset` if you want to force new registration');
                }
                else {
                    let createdRole = await createNewRole(guildID, marketingChannelID)
                    RegisterMessage.roleID = createdRole
                    message.reply(`The role \`Marketing Curator\` has been created and assigned to this channel <#${marketingChannelID}>`);
                }
                await setupRegisterMessage(RegisterMessage.channelID, RegisterMessage.messageID)
            } catch (err) { console.log(err) }
        }

        else if (command === "assign-role") {
            if (!args[0]) message.reply('provide the role id after assign-role')
            RegisterMessage.roleID = args[0]
        }

        else if (command === "fix") {
            if (!RegisterMessage.roleID) message.reply('There is no marketing curator role. `config start` to create the role')
            else {
                await setupRegisterMessage(RegisterMessage.channelID, RegisterMessage.messageID)
                message.reply('The role has been linked to the bot')
            }
        }

        else if (command === "reveal") {
            //getReactionsByMessageID()
        }
    }
    else {
        if (message.channel.id === marketingChannelID && prefix != message.content.slice(0, prefix.length)) {
            console.log('message ' + message.id)
            console.log('channel ' + message.content)
            console.log('author ' + message.author.id)
            message.react('👍')
                .then(() => message.react('👎'))
                .catch(() => console.error('One of the emojis failed to react.'));

            openNewTask(message, RegisterMessage.roleID)
        }
    }
});


client.on('messageReactionAdd', (reaction, user) => {
    // When we receive a reaction we check if the reaction is partial or not
    if (reaction.partial) {
        // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
        try {
            reaction.fetch();
            reaction.message.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the message: ', error);
            // Return as `reaction.message.author` may be undefined/null
            return;
        }
    }

    if (reaction.message.channel.id === marketingChannelID && reaction.emoji.name !== '👍' && reaction.emoji.name !== '👎'  && !user.bot) {
        console.log('deleting: '+reaction.emoji.name)
        reaction.remove()
    }

    if (reaction.message.id === RegisterMessage.messageID && reaction.emoji.name === '✅' && !user.bot) {
        reaction.message.guild.members.fetch(user.id)
            .then(member => {
                member.roles.add(`${RegisterMessage.roleID}`)
                    .then(member => {
                        console.log(`Added the role to ${member.displayName}`);
                    })
                    .catch(err => console.log(err))
            }
            ).catch(err => console.log(err))

        reaction.message.guild.roles.fetch(RegisterMessage.roleID)
            .then(role => {
                console.log('members changed to: ' + role.members.size)
                MarketingRoleMembers = role.members.size
            })
            .catch(err => console.log(err))

    }
});

client.on('messageReactionRemove', (reaction, user) => {

    // When we receive a reaction we check if the reaction is partial or not
    if (reaction.partial) {
        // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
        try {
            reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the message: ', error);
            // Return as `reaction.message.author` may be undefined/null
            return;
        }
    }
    if (reaction.message.id === RegisterMessage.messageID && reaction.emoji.name === '✅' && !user.bot) {
        reaction.message.guild.members.fetch(user.id)
            .then(member => {
                member.roles.remove(`${RegisterMessage.roleID}`)
            })
        reaction.message.guild.roles.fetch(RegisterMessage.roleID)
            .then(role => {
                console.log('members changed to: ' + role.members.size)
                MarketingRoleMembers = role.members.size
            })
            .catch(err => console.log(err))
    }
});


client.login(process.env.BOT_TOKEN);


