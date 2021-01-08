let cron = require('node-cron');
const dotenv = require('dotenv').config(),

const marketingChannelID = process.env.MARKETING_CHANNELID;
const adminRoleID = process.env.ADMIN_ROLEID;
const guildID = process.env.GUILDID;

//getRole(guildID, adminRoleID)

function openNewTask(message, role) {
    let startTime = Date.now();
    let cheese = cron.schedule('0,30 * * * *', function () {
        let shouldKill = runCollector(message, role, startTime)
        if (shouldKill) {
            console.log(`killed task for ${message.id}`)
            cheese.destroy()
        }
    });
}

function getNumberOfMembersInRole(guild, roleID) {
    const members = guild.members.cache.filter(member => member.roles.cache.find(role => role.id === roleID)).map(member => member.id);
    let membersSize = members.length || false
    return membersSize
}

function runCollector(message, role, startTime) {
    let killTask = false
    const currentTime = Date.now();
    let registeredVoters = getNumberOfMembersInRole(message.channel.guild, role);
    if ((currentTime - startTime) > 1200000) {
        console.log('running task')

        let collected = message.reactions.cache
        collected = collected.filter(r => ['👍', '👎'].includes(r.emoji.name))
        //    const collector = message.createReactionCollector(r => ['👍','👎'].includes(r.emoji.name), {time:3000, idle:2000});
        //    collector.on('end', collected => {
        let up = collected.filter(msg => msg.emoji.name === '👍').first()
        let down = collected.filter(msg => msg.emoji.name === '👎').first()
        let usersVoted = [];

        collected.each(msg => {
            msg.users.cache.each(user => {
                usersVoted.push(user.id)
            })
        });

        usersVoted = usersVoted.filter(onlyUnique).length - 1
        let score = (usersVoted > 0) ? (up.count - down.count) : 0
        let percentage = (score) ? (score / registeredVoters) * 100 : -1
        console.log(`
        {\n message: ${message.id}\n
            upvotes:  ${up.count}\n
            downvotes:  ${down.count}\n
            usersVoted: ${usersVoted} out of ${registeredVoters}\n
            percentage score: ${percentage}%\n
        }`);
        if (percentage >= 33 && usersVoted > 4) { //minimum 33% and users
            try {
                message.react('☑️')
                killTask = true
            }
            catch (err) { console.log(err) }
        }
        else if ((currentTime - startTime) > 86400000) {
            try {
                message.react('❌')
                killTask = true
            }
            catch (err) { console.log(err) }
        }

        else if(percentage <=50 && usersVoted > 5){
            try {
                message.delete({timeout:2500})
                killTask = true
            }
            catch (err) { console.log(err) }
        }
    }

    return killTask;
}


function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

module.exports = { openNewTask }