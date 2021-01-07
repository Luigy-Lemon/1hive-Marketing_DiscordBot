const fetch = require('node-fetch'),
  { readFile, writeFile, appendFile } = require("./FilesystemInteraction.js");



async function getLastMessage() {
  let messages = readFile('messages');
  if(!messages || messages.legth < 10) return false
  let messageObj = messages.split(';');
  return JSON.parse(messageObj[0]); // the Last happens to be the first in the array
}


async function getMessages(channelID, params) {
  let lastLoggedMessage = await getLastMessage()
  let query = (params.limit) ? `limit=${params.limit}` : '';

  query = (lastLoggedMessage && lastLoggedMessage.message) ? query + `&after=${lastLoggedMessage.message}` : query;

  let res = await fetch(`https://discord.com/api/channels/${channelID}/messages?${query}`, { headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` } })
    .then(response => response.json())
    .then(response => {
      return response.map(res => {
        let schema = JSON.stringify({
          author: res.author.id,
          channel: res.channel_id,
          message: res.id,
          timestamp: res.timestamp
        })
        return schema
      })
    });
  if (res && res.length>10){
  let stringOfMessages = res.join(';') + ';'
  appendFile('messages', stringOfMessages)
  }
}


async function getMessage(channelID, messageID) {
  try {
    let message = await fetch(`https://discord.com/api/channels/${channelID}/messages/${messageID}`, { headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` } }).then(response => response.json());
    return message
  }
  catch (err) {
    console.log(err)
  }
}


async function getRole(guildID, roleID) {
  try {
    let roleInfo = await fetch(`https://discord.com/api/guilds/${guildID}/roles`, { method: 'GET', headers: { 'Authorization': `Bot ${process.env.BOT_TOKEN}` } });
    console.log(roleInfo.body)
  }
  catch (err) {
    console.log(err)
  }
}






async function createNewRole(guildID, channelID) {
  try {
    let roleCreated = await fetch(`https://discord.com/api/guilds/${guildID}/roles`, { method: 'POST', body: JSON.stringify({ "name": "Marketing Curator" }), headers: { 'Authorization': `Bot ${process.env.BOT_TOKEN}`, 'Content-Type': 'application/json' } }).then(response => response.json());
   await fetch(`https://discord.com/api/channels/${channelID}/permissions/${roleCreated.id}`, { method: 'PUT', body: JSON.stringify({ "allow": "68608", "deny": "0", "type": 0 }), headers: { 'Authorization': `Bot ${process.env.BOT_TOKEN}`, 'Content-Type': 'application/json' } });
    return roleCreated.id
  }
  catch (err) {
    console.log(err)
    return false
  }
}

async function deleteCurrentRole(guildID, roleID) {
  try {
    fetch(`https://discord.com/api/guilds/${guildID}/roles/${roleID}`, { method: 'DELETE', headers: { 'Authorization': `Bot ${process.env.BOT_TOKEN}` } });
  }
  catch (err) {
    console.log(err)
  }
}




async function setupRegisterMessage(channelID, messageID) {
  let emoji ='✅'
  emoji = encodeURIComponent(emoji);
  try {
    fetch(`https://discord.com/api/channels/${channelID}/messages/${messageID}/reactions/${emoji}/@me`, { method: 'PUT', headers: { 'Authorization': `Bot ${process.env.BOT_TOKEN}` } });
  }
  catch (err) {
    console.log(err)
  }
}


async function purgeRegisterMessageReactions(channelID, messageID) {
  let emoji = '✅'
  emoji = encodeURIComponent(emoji);

  try {
    await fetch(`https://discord.com/api/channels/${channelID}/messages/${messageID}/reactions/${emoji}`, { method: 'DELETE', headers: { 'Authorization': `Bot ${process.env.BOT_TOKEN}` } });
    fetch(`https://discord.com/api/channels/${channelID}/messages/${messageID}/reactions/${emoji}/@me`, { method: 'PUT', headers: { 'Authorization': `Bot ${process.env.BOT_TOKEN}`} })
  }
  catch (err) {
    console.log(err)
  }
}


module.exports = { getMessages, getRole, createNewRole, deleteCurrentRole, purgeRegisterMessageReactions, setupRegisterMessage }