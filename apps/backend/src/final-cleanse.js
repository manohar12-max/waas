const mongoose = require('mongoose');

async function finalCleanse() {
  const URI = 'mongodb://127.0.0.1:27017/pixaflip-waas';
  console.log('Connecting to institutional database...');
  
  try {
    await mongoose.connect(URI);
    const db = mongoose.connection.db;

    const collections = ['workshops', 'divisions', 'attendances'];
    const fields = ['instructorId', 'teacherId', 'studentId', 'verifiedBy', 'collegeId', 'workshopId'];

    for (const collName of collections) {
      console.log(`Scanning collection: ${collName}...`);
      const criteria = {
        $or: fields.map(field => ({ [field]: "" }))
      };
      
      const result = await db.collection(collName).deleteMany(criteria);
      if (result.deletedCount > 0) {
        console.log(`PURGED: Deleted ${result.deletedCount} corrupted records from ${collName}.`);
      } else {
        console.log(`CLEAN: No corrupted records found in ${collName}.`);
      }
    }

    console.log('Infrastructure Sanitization Complete.');
  } catch (err) {
    console.error('Sanitization Failed:', err);
  } finally {
    process.exit(0);
  }
}

finalCleanse();
