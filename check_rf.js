const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://rbmathsacademy_db_user:rbmaths2025@cluster0.y48zek2.mongodb.net/?appName=Cluster0";

async function findMultiBatch() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const questions = client.db().collection('questions');

        const multi = await questions.find({
            deleted: { $ne: true },
            $expr: { $gt: [{ $size: { $ifNull: ['$batches', []] } }, 1] }
        }, {
            projection: { id: 1, topic: 1, subtopic: 1, batches: 1, text: 1, _id: 0 }
        }).toArray();

        console.log(`Questions with multiple batch tags: ${multi.length}\n`);
        multi.forEach((q, i) => {
            console.log(`[${i+1}] ID: ${q.id}`);
            console.log(`    Topic: ${q.topic} > ${q.subtopic}`);
            console.log(`    Batches: ${JSON.stringify(q.batches)}`);
            console.log(`    Text: ${q.text?.substring(0, 70)}...`);
            console.log();
        });
    } finally {
        await client.close();
    }
}
findMultiBatch().catch(console.error);
