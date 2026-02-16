const prisma = require('../config/database');

// POST /api/ratings - Submit a rating
const submitRating = async (req, res, next) => {
  try {
    const { jobId, toUserId, emoji, stars } = req.body;
    const fromUserId = req.user.id; // From JWT token

    console.log('⭐ Rating Submission:', { fromUserId, toUserId, jobId, emoji, stars });

    // Validation
    if (!jobId || !toUserId || !emoji) {
      return res.status(400).json({ 
        error: 'Job ID, recipient user ID, and emoji are required' 
      });
    }

    const validEmojis = ['happy', 'neutral', 'sad'];
    if (!validEmojis.includes(emoji)) {
      return res.status(400).json({ 
        error: `Invalid emoji. Must be one of: ${validEmojis.join(', ')}` 
      });
    }

    if (stars && (stars < 1 || stars > 5)) {
      return res.status(400).json({ 
        error: 'Stars must be between 1 and 5' 
      });
    }

    // Check if job exists
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if users exist
    const toUser = await prisma.user.findUnique({ where: { id: toUserId } });
    if (!toUser) {
      return res.status(404).json({ error: 'Recipient user not found' });
    }

    // Create rating
    const rating = await prisma.rating.create({
      data: {
        jobId,
        fromUserId,
        toUserId,
        emoji,
        stars: stars || null,
      },
    });

    // Update recipient's rating average and count
    const allRatings = await prisma.rating.findMany({
      where: { toUserId },
    });

    // Calculate new average (emoji to number: happy=5, neutral=3, sad=1)
    const emojiToNumber = { happy: 5, neutral: 3, sad: 1 };
    const totalScore = allRatings.reduce((sum, r) => {
      return sum + (r.stars || emojiToNumber[r.emoji]);
    }, 0);
    const avgRating = totalScore / allRatings.length;

    await prisma.user.update({
      where: { id: toUserId },
      data: {
        ratingAvg: avgRating,
        ratingCount: allRatings.length,
      },
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

    res.json({
      ratings,
      count: ratings.length,
    });
  } catch (error) {
    console.error('💥 Get User Ratings Error:', error);
    next(error);
  }
};

module.exports = { submitRating, getUserRatings };
