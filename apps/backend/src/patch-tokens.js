const mongoose = require('mongoose');

async function patchTokens() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/pixaflip-waas');
    console.log('Connected to DB: pixaflip-waas');

    const workshopSchema = new mongoose.Schema({ inviteToken: String }, { strict: false });
    const Workshop = mongoose.model('Workshop', workshopSchema);

    const workshops = await Workshop.find({ 
      $or: [
        { inviteToken: { $exists: false } },
        { inviteToken: "" },
        { inviteToken: null }
      ]
    });
    
    console.log(`Found ${workshops.length} workshops needing tokens.`);

    for (const w of workshops) {
      const token = Math.random().toString(36).substring(2, 10).toUpperCase() + 
                   Math.random().toString(36).substring(2, 6).toUpperCase();
      
      await Workshop.updateOne({ _id: w._id }, { $set: { inviteToken: token } });
      console.log(`Updated Workshop ${w._id} with token: ${token}`);
    }

    console.log('Identity migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

patchTokens();
