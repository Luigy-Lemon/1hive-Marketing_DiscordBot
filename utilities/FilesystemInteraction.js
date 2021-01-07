const fs = require('fs');



async function writeFile(file_name, contentToSave) {
    let file_path = __dirname + "/../storage/" + file_name

    fs.writeFile(file_path, contentToSave, (err) => {
        // throws an error, you could also catch it here
        if (err) throw err;

        // success case, the file was saved
        console.log('Saved content into ', file_name);
    });
}

async function appendFile(file_name, contentToSave) {
    let file_path = __dirname + "/../storage/" + file_name

    fs.appendFile(file_path, contentToSave, (err) => {
        // throws an error, you could also catch it here
        if (err) throw err;

        // success case, the file was saved
        console.log('Appended content into ', file_name);
    });
}


function readFile(file_name) {
    let file_path = __dirname + "/../storage/" + file_name
    const content = fs.readFileSync(file_path, 'utf8');
    return content
}

module.exports = { readFile, writeFile, appendFile }