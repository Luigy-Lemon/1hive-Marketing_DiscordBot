let cron = require('node-cron');
const dotenv = require('dotenv').config();

const marketingChannelID = process.env.MARKETING_CHANNELID;
const adminRoleID = process.env.ADMIN_ROLEID;
const guildID = process.env.GUILDID;

//getRole(guildID, adminRoleID)

function openNewTask(message, role) {
    let startTime = Date.now();
    let cheese = cron.schedule('0,30 * * * *', function () {
        runCollector(message, role, startTime).then(
            shouldKill => {
                if (shouldKill) {
                    console.log(`killed task for ${message.id}`)
                    cheese.destroy()
                }
            }
        )
    });
}

function getNumberOfMembersInRole(guild, roleID) {
    const members = guild.members.cache.filter(member => member.roles.cache.find(role => role.id === roleID)).map(member => member.id);
    let membersSize = members.length || false
    return membersSize
}

async function runCollector(message, role, startTime) {
    let killTask = false
    const currentTime = Date.now();
    let registeredVoters = getNumberOfMembersInRole(message.channel.guild, role);
    if ((currentTime - startTime) > 0) {
        console.log('running task')

        let collected = message.reactions.cache
        collected = collected.filter(r => ['👍', '👎'].includes(r.emoji.name))
        //    const collector = message.createReactionCollector(r => ['👍','👎'].includes(r.emoji.name), {time:3000, idle:2000});
        //    collector.on('end', collected => {
        let up = collected.filter(msg => msg.emoji.name === '👍').first()
        let down = collected.filter(msg => msg.emoji.name === '👎').first()
        let usersVoted = await getVoters(collected)
        usersVoted = usersVoted.filter(onlyUnique).length - 1
        let score = (usersVoted > 0) ? (up.count - down.count) : 0
        let percentage = (score) ? (score / usersVoted) * 100 : -1
        console.log(`
        {\n message: ${message.id}\n
            upvotes:  ${up.count}\n
            downvotes:  ${down.count}\n
            usersVoted: ${usersVoted} out of ${registeredVoters}\n
            percentage score: ${percentage}%\n
        }`);
        if (percentage >= 33 && usersVoted > (registeredVoters / 5)) { //minimum 33% and users
            try {
                const confirmationEmoji = message.guild.emojis.cache.find(em => em.name === "Honeypot") || "☑️"
                await message.react(confirmationEmoji)
                killTask = true
            }
            catch (err) { console.log(err) }
        }
        else if ((currentTime - startTime) > 86400000) {
            try {
                await message.react('💩')
                killTask = true
            }
            catch (err) { console.log(err) }
        }

        else if (percentage <= -50 && usersVoted > (registeredVoters / 5)) {
            try {
                await message.delete()
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

async function getVoters(collected) {
    let voters = []
    for (let reaction of collected) {
        arr = await reaction[1].users.fetch()
            .then(users => {
                let usersArray = []
                for (const user of users) {
                    usersArray.push(user[0])
                }
                return usersArray
            })
            .catch(err => console.log(err))
        voters = [...voters, ...arr]

    }
    return (voters) ? voters : null
}

module.exports = { openNewTask }
