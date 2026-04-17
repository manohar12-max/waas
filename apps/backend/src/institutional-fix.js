const mongoose = require('mongoose');

async function institutionalFix() {
  const MONGODB_URI = 'mongodb://127.0.0.1:27017/pixaflip-waas';
  console.log(`Connecting to MongoDB: ${MONGODB_URI}...`);
  
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    
    // 1. Find the primary college
    const college = await db.collection('colleges').findOne({});
    
    if (!college) {
      console.log('CRITICAL: No college found in database. Please create a college first as Super Admin.');
      process.exit(1);
    }

    console.log(`Using College: ${college.name} (${college._id})`);

    // 2. Assign orphaned users
    const result = await db.collection('users').updateMany(
      { 
        role: { $in: ['COLLEGE_ADMIN', 'TEACHER', 'INSTRUCTOR'] },
        $or: [
          { collegeId: { $exists: false } },
          { collegeId: null },
          { collegeId: "" }
        ]
      }, 
      { $set: { collegeId: college._id } }
    );

    console.log(`Institutional Alignment Complete: Assigned ${result.modifiedCount} users to ${college.name}.`);
  } catch (err) {
    console.error('Institutional Fix Failed:', err);
  } finally {
    process.exit(0);
  }
}

institutionalFix();
