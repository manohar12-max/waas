const mongoose = require('mongoose');

async function checkFeedback() {
  try {
    await mongoose.connect('mongodb://localhost:27017/nexus_waas');
    console.log('Connected to MongoDB');
    
    const feedbackSchema = new mongoose.Schema({}, { strict: false, collection: 'feedback' });
    const Feedback = mongoose.model('Feedback', feedbackSchema);
    
    const records = await Feedback.find().limit(10);
    console.log('Records count:', records.length);
    
    records.forEach((r, i) => {
      console.log(`Record ${i}:`);
      console.log(`  workshopId: ${r.workshopId} (Type: ${typeof r.workshopId}, InstanceOf ObjectId: ${r.workshopId instanceof mongoose.Types.ObjectId})`);
      console.log(`  sessionId: ${r.sessionId} (Type: ${typeof r.sessionId}, InstanceOf ObjectId: ${r.sessionId instanceof mongoose.Types.ObjectId})`);
      console.log(`  type: ${r.type}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkFeedback();
