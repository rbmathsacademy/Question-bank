const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://rbmathsacademy_db_user:rbmaths2025@cluster0.y48zek2.mongodb.net/?appName=Cluster0";

async function findEverywhere() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        
        // List ALL databases in the cluster
        const adminDb = client.db('admin');
        let allDbs = [];
        try {
            const result = await adminDb.command({ listDatabases: 1 });
            allDbs = result.databases.map(d => d.name);
            console.log('ALL DATABASES IN CLUSTER:', allDbs);
        } catch(e) {
            console.log('Cannot list DBs (permission):', e.message);
            // Try known names
            allDbs = ['test', 'rbmathsacademy', 'rbmaths', 'portal', 'questionbank', 'db'];
            console.log('Trying common names:', allDbs);
        }

        // Search each DB for Real Functions questions
        for (const dbName of allDbs) {
            try {
                const db = client.db(dbName);
                const cols = await db.listCollections().toArray();
                const qCol = cols.find(c => c.name === 'questions');
                if (!qCol) continue;
                
                const questions = db.collection('questions');
                const count = await questions.countDocuments();
                const rfCount = await questions.countDocuments({ topic: { $regex: /real.?functions/i } });
                const realIdCount = await questions.countDocuments({ id: { $regex: /^q_real_/ } });
                
                console.log(`\nDB: "${dbName}" | Total questions: ${count} | Real Functions: ${rfCount} | q_real_ IDs: ${realIdCount}`);
                
                if (rfCount > 0 || realIdCount > 0) {
                    const found = await questions.find({
                        $or: [
                            { topic: { $regex: /real.?functions/i } },
                            { id: { $regex: /^q_real_/ } }
                        ]
                    }).toArray();
                    console.log('FOUND QUESTIONS:');
                    found.forEach(q => console.log(JSON.stringify(q, null, 2)));
                }

                // Also show recent questions in this DB
                const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const recent = await questions.find({ createdAt: { $gte: dayAgo } }).toArray();
                if (recent.length > 0) {
                    console.log(`  Recent (24h) in "${dbName}":`, recent.length);
                    const rg = {};
                    recent.forEach(q => { rg[q.topic] = (rg[q.topic]||0)+1; });
                    Object.keys(rg).sort().forEach(t => console.log(`    "${t}": ${rg[t]}`));
                }
            } catch(e) {
                console.log(`  DB "${dbName}" error:`, e.message);
            }
        }
        
    } finally {
        await client.close();
    }
}

findEverywhere().catch(console.error);
