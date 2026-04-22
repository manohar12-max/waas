const mongoose = require('mongoose');

async function checkFeedback() {
  try {
    await mongoose.connect('mongodb://localhost:27017/nexus_waas');
    console.log('Connected to MongoDB');
    
    const feedbackSchema = new mongoose.Schema({
      workshopId: mongoose.Schema.Types.ObjectId,
      sessionId: mongoose.Schema.Types.ObjectId,
      type: String,
      ratings: Object,
      submittedBy: Object
    }, { collection: 'feedback' });
    
    const Feedback = mongoose.model('Feedback', feedbackSchema);
    
    const count = await Feedback.countDocuments();
    console.log('Total feedback records:', count);
    
    const recent = await Feedback.find().limit(5).sort({ createdAt: -1 });
    console.log('Recent feedback:', JSON.stringify(recent, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkFeedback();
