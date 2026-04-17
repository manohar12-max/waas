const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

async function debug() {
  await mongoose.connect('mongodb://127.0.0.1:27017/pixaflip-waas');
  
  const AssignmentSchema = new Schema({
    title: String,
    divisionId: { type: Schema.Types.ObjectId, ref: 'Division' },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User' }
  }, { strict: false });

  const Assignment = mongoose.model('Assignment', AssignmentSchema);

  const all = await Assignment.find({});
  console.log('Total Assignments found:', all.length);
  all.forEach(a => {
    console.log(`ID: ${a._id}, Title: ${a.title}, DivisionId: ${a.divisionId} (${typeof a.divisionId})`);
  });

  process.exit(0);
}

debug();
