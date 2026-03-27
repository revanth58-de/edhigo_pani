const prisma = require('../config/database');

const submitRating = async (req, res, next) => {
  try {
    // Accept both field naming conventions from different frontend versions
    const {
      jobId,
      toUserId,   workerId,   farmerId,   // fields names for recipient
      emoji,      rating: ratingNum,   // rename to avoid conflict with prisma.rating variable below
      stars,      feedback,            // optional extras
    } = req.body;
    const fromUserId = req.user.id;

    // Normalise recipient ID
    const recipientId = toUserId || workerId || farmerId;

    // Normalise emoji: convert numeric rating → emoji if needed
    const starsToEmoji = (s) => s >= 4 ? 'happy' : s === 3 ? 'neutral' : 'sad';
    const normalizedEmoji = emoji || (ratingNum ? starsToEmoji(Number(ratingNum)) : null);
    const normalizedStars = stars || (ratingNum ? Number(ratingNum) : null);

    console.log('⭐ Rating Submission:', { fromUserId, recipientId, jobId, normalizedEmoji, normalizedStars });

    // Validation
    if (!jobId || !recipientId || !normalizedEmoji) {
      return res.status(400).json({
        error: 'Job ID, recipient user ID, and a rating (emoji or stars) are required'
      });
    }

    const validEmojis = ['happy', 'neutral', 'sad'];
    if (!validEmojis.includes(normalizedEmoji)) {
      return res.status(400).json({
        error: `Invalid emoji. Must be one of: ${validEmojis.join(', ')}`
      });
    }

    if (normalizedStars && (normalizedStars < 1 || normalizedStars > 5)) {
      return res.status(400).json({ error: 'Stars must be between 1 and 5' });
    }


    // Check if job exists
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if users exist
    const toUser = await prisma.user.findUnique({ where: { id: recipientId } });
    if (!toUser) {
      return res.status(404).json({ error: 'Recipient user not found' });
    }

    // ── Authorization: Verify Participation (Prevent Fake Ratings) ──
    const participationMatch = await prisma.jobApplication.findFirst({
      where: {
        jobId,
        OR: [
          { workerId: fromUserId, status: 'accepted' },
          { workerId: recipientId, status: 'accepted' }
        ]
      }
    });

    // Also check if the 'fromUser' is the farmer who owns the job
    const isJobOwner = job.farmerId === fromUserId;
    const isRecipientOwner = job.farmerId === recipientId;

    if (!isJobOwner && !isRecipientOwner && !participationMatch) {
       return res.status(403).json({ error: 'You can only rate users you have worked with on this job' });
    }

    // Use a transaction to create the rating, then recalculate average from all ratings
    const rating = await prisma.rating.create({
      data: { jobId, fromUserId, toUserId, emoji, stars: stars || null },
    });

    // Fetch ALL ratings AFTER insert (so the new one is included in the list)
    const allRatings = await prisma.rating.findMany({ where: { toUserId } });

    // Calculate new average from all ratings (emoji-to-number: happy=5, neutral=3, sad=1)
    const emojiToNumber = { happy: 5, neutral: 3, sad: 1 };
    const totalScore = allRatings.reduce((sum, r) => {
      return sum + (r.stars || emojiToNumber[r.emoji]);
    }, 0);
    const avgRating = totalScore / allRatings.length;

    await prisma.user.update({
      where: { id: toUserId },
      data: { ratingAvg: avgRating, ratingCount: allRatings.length },
    });

    console.log('✅ Rating submitted successfully:', {
      ratingId: rating.id,
      newAverage: avgRating.toFixed(2),
      totalRatings: allRatings.length
    });

    res.json({
      message: 'Rating submitted successfully',
      rating: {
        id: rating.id,
        emoji: rating.emoji,
        stars: rating.stars,
        createdAt: rating.createdAt,
      },
      recipientStats: {
        ratingAvg: avgRating,
        ratingCount: allRatings.length,
      },
    });
  } catch (error) {
    console.error('💥 Rating Submission Error:', error);
    next(error);
  }
};

// GET /api/ratings/user/:userId - Get ratings for a user
const getUserRatings = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const ratings = await prisma.rating.findMany({
      where: { toUserId: userId },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
          },
        },
        job: {
          select: {
            id: true,
            workType: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to recent 50
    });

    const requesterId = req.user?.id;

    const sanitizedRatings = ratings.map(r => {
      // Hide phone numbers unless the requester is an admin or the user themselves in the profile
      const showFromPhone = requesterId === r.fromUser.id;
      const showToPhone = requesterId === r.toUser.id;

      return {
        ...r,
        fromUser: { ...r.fromUser, phone: showFromPhone ? r.fromUser.phone : undefined },
        toUser: { ...r.toUser, phone: showToPhone ? r.toUser.phone : undefined },
      };
    });

    res.json({
      ratings: sanitizedRatings,
      count: ratings.length,
    });
  } catch (error) {
    console.error('💥 Get User Ratings Error:', error);
    next(error);
  }
};

module.exports = { submitRating, getUserRatings };
