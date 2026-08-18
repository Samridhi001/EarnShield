require('dotenv').config();
const mongoose = require('mongoose');
const ClaimEvent = require('./src/models/ClaimEvent');

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const zone = 'Bhubaneswar-Zone1';
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

  const recentClaims = await ClaimEvent.find({
    zone,
    createdAt: { $gte: sixHoursAgo },
  }).select('claimedLocation createdAt');

  console.log(`Claims found within last 6 hours for zone "${zone}": ${recentClaims.length}`);
  console.log(`Current time: ${new Date().toISOString()}`);
  console.log(`Six hours ago cutoff: ${sixHoursAgo.toISOString()}\n`);

  recentClaims.forEach((c) => {
    console.log(`lat=${c.claimedLocation.lat}, lng=${c.claimedLocation.lng}, createdAt=${c.createdAt.toISOString()}`);
  });

  await mongoose.disconnect();
};

run();