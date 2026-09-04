import { PremiumService } from '../services/premiumService.js';

// ============================================
// GET ALL LESSONS
// ============================================
export const getLessons = async (req, res) => {
    try {
        const lessons = await PremiumService.getLessons();
        
        // Get user's progress if authenticated
        let progress = [];
        let completedCount = 0;
        let totalLessons = lessons.length;
        
        if (req.user) {
            progress = await PremiumService.getUserProgress(req.user.id);
            completedCount = await PremiumService.getCompletedCount(req.user.id);
        }

        // Add completion status to each lesson
        const lessonsWithProgress = lessons.map(lesson => {
            const isCompleted = progress.some(p => p.lesson_id === lesson.id && p.completed);
            return {
                ...lesson,
                completed: isCompleted
            };
        });

        res.json({
            success: true,
            lessons: lessonsWithProgress,
            progress: {
                completed: completedCount,
                total: totalLessons
            }
        });

    } catch (error) {
        console.error('Get lessons error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch lessons'
        });
    }
};

// ============================================
// GET A SINGLE LESSON
// ============================================
export const getLessonById = async (req, res) => {
    try {
        const { id } = req.params;
        const lesson = await PremiumService.getLessonById(id);

        if (!lesson) {
            return res.status(404).json({
                success: false,
                error: 'Lesson not found'
            });
        }

        // Get user's progress if authenticated
        let isCompleted = false;
        if (req.user) {
            const progress = await PremiumService.getUserProgress(req.user.id);
            isCompleted = progress.some(p => p.lesson_id === parseInt(id) && p.completed);
        }

        res.json({
            success: true,
            lesson: {
                ...lesson,
                completed: isCompleted
            }
        });

    } catch (error) {
        console.error('Get lesson error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch lesson'
        });
    }
};

// ============================================
// MARK LESSON AS COMPLETED
// ============================================
export const markLessonComplete = async (req, res) => {
    try {
        const { lesson_id } = req.body;
        const userId = req.user.id;

        if (!lesson_id) {
            return res.status(400).json({
                success: false,
                error: 'Lesson ID is required'
            });
        }

        // Check if lesson exists
        const lesson = await PremiumService.getLessonById(lesson_id);
        if (!lesson) {
            return res.status(404).json({
                success: false,
                error: 'Lesson not found'
            });
        }

        const updated = await PremiumService.markLessonComplete(userId, lesson_id);

        if (!updated) {
            return res.status(500).json({
                success: false,
                error: 'Failed to update progress'
            });
        }

        const completedCount = await PremiumService.getCompletedCount(userId);
        const totalLessons = await PremiumService.getTotalLessons();

        res.json({
            success: true,
            message: 'Lesson marked as completed',
            progress: {
                completed: completedCount,
                total: totalLessons
            }
        });

    } catch (error) {
        console.error('Mark lesson complete error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark lesson as complete'
        });
    }
};

// ============================================
// GET USER PROGRESS
// ============================================
export const getUserProgress = async (req, res) => {
    try {
        const userId = req.user.id;

        const progress = await PremiumService.getUserProgress(userId);
        const completedCount = await PremiumService.getCompletedCount(userId);
        const totalLessons = await PremiumService.getTotalLessons();

        res.json({
            success: true,
            progress: {
                completed: completedCount,
                total: totalLessons,
                lessons: progress
            }
        });

    } catch (error) {
        console.error('Get user progress error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch progress'
        });
    }
};

// ============================================
// GET SUBSCRIPTION STATUS
// ============================================
export const getSubscription = async (req, res) => {
    try {
        const userId = req.user.id;
        const subscription = await PremiumService.getSubscription(userId);

        if (!subscription) {
            return res.json({
                success: true,
                subscription: null,
                hasPremium: false
            });
        }

        const isActive = new Date(subscription.expires_at) > new Date();

        res.json({
            success: true,
            subscription: {
                ...subscription,
                isActive
            },
            hasPremium: isActive
        });

    } catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch subscription'
        });
    }
};

// ============================================
// SUBSCRIBE TO PREMIUM
// ============================================
export const subscribe = async (req, res) => {
    try {
        const userId = req.user.id;
        const { plan, amount, method, receipt_email, reference } = req.body;

        if (!plan || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Plan and amount are required'
            });
        }

        const updated = await PremiumService.upsertSubscription(userId, {
            plan,
            amount,
            method: method || 'card',
            receipt_email: receipt_email || req.user.email,
            reference: reference || `SUB-${Date.now()}`
        });

        if (!updated) {
            return res.status(500).json({
                success: false,
                error: 'Failed to process subscription'
            });
        }

        const subscription = await PremiumService.getSubscription(userId);

        res.json({
            success: true,
            message: 'Subscription successful',
            subscription
        });

    } catch (error) {
        console.error('Subscribe error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process subscription'
        });
    }
};

// ============================================
// CANCEL SUBSCRIPTION
// ============================================
export const cancelSubscription = async (req, res) => {
    try {
        const userId = req.user.id;

        const cancelled = await PremiumService.cancelSubscription(userId);

        if (!cancelled) {
            return res.status(404).json({
                success: false,
                error: 'No active subscription found'
            });
        }

        res.json({
            success: true,
            message: 'Subscription cancelled successfully'
        });

    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cancel subscription'
        });
    }
};