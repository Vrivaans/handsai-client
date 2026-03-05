const mongoose = require('mongoose');
async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/LibreChat');
    const obj = await mongoose.connection.db.collection('objectives').findOne({
        _id: new mongoose.Types.ObjectId('69a6fa0a71ef946bfdd6d6f1')
    });
    console.log("Found Objective Database Record:");
    console.dir(obj, { depth: null });
    process.exit(0);
}
main().catch(err => { console.error(err); process.exit(1); });
