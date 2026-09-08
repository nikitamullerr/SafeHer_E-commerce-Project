import UserModel from '../models/userModel.js';

export const verifyAdmin = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }

        const user = await UserModel.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        next();

    } catch (error) {
        console.error('Admin verification error:', error);

        return res.status(500).json({
            success: false,
            error: 'Server error during admin verification'
        });
    }
};