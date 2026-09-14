import EmergencyContact from "../models/emergencyContactModel.js";

export const getContacts = async (req, res) => {
    try {
        const userId = req.user.id;

        const contacts = await EmergencyContact.getAllByUser(userId);

        res.json({
            success: true,
            contacts
        });
    } catch (error) {
        console.error("Get emergency contacts error:", error);

        res.status(500).json({
            success: false,
            error: "Failed to get emergency contacts"
        });
    }
};

export const getContact = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const contact = await EmergencyContact.getById(id, userId);

        if (!contact) {
            return res.status(404).json({
                success: false,
                error: "Emergency contact not found"
            });
        }

        res.json({
            success: true,
            contact
        });
    } catch (error) {
        console.error("Get emergency contact error:", error);

        res.status(500).json({
            success: false,
            error: "Failed to get emergency contact"
        });
    }
};

export const createContact = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, phone, relationship, is_primary } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                error: "Name and phone are required"
            });
        }

        const contactId = await EmergencyContact.create(userId, {
            name,
            phone,
            relationship,
            is_primary
        });

        const contact = await EmergencyContact.getById(
            contactId,
            userId
        );

        res.status(201).json({
            success: true,
            message: "Emergency contact created successfully",
            contact
        });
    } catch (error) {
        console.error("Create emergency contact error:", error);

        res.status(500).json({
            success: false,
            error: "Failed to create emergency contact"
        });
    }
};

export const updateContact = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { name, phone, relationship, is_primary } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                error: "Name and phone are required"
            });
        }

        const affectedRows = await EmergencyContact.update(
            id,
            userId,
            {
                name,
                phone,
                relationship,
                is_primary
            }
        );

        if (affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Emergency contact not found"
            });
        }

        const contact = await EmergencyContact.getById(
            id,
            userId
        );

        res.json({
            success: true,
            message: "Emergency contact updated successfully",
            contact
        });
    } catch (error) {
        console.error("Update emergency contact error:", error);

        res.status(500).json({
            success: false,
            error: "Failed to update emergency contact"
        });
    }
};

export const deleteContact = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const affectedRows = await EmergencyContact.delete(
            id,
            userId
        );

        if (affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Emergency contact not found"
            });
        }

        res.json({
            success: true,
            message: "Emergency contact deleted successfully"
        });
    } catch (error) {
        console.error("Delete emergency contact error:", error);

        res.status(500).json({
            success: false,
            error: "Failed to delete emergency contact"
        });
    }
};

import {
    createCheckin,
    getCheckinsByUser,
    updateCheckinStatus
} from "../models/checkinModel.js";

// Start a check-in
export const startCheckin = async (req, res) => {
    try {
        const userId = req.user.id;
        const { duration_minutes } = req.body;

        if (!duration_minutes) {
            return res.status(400).json({
                success: false,
                error: "Duration is required"
            });
        }

        if (duration_minutes <= 0) {
            return res.status(400).json({
                success: false,
                error: "Duration must be greater than 0"
            });
        }

        const checkin = await createCheckin(
            userId,
            duration_minutes
        );

        res.status(201).json({
            success: true,
            message: "Check-in started successfully",
            checkin
        });

    } catch (error) {
        console.error("❌ Start check-in error:", error);

        res.status(500).json({
            success: false,
            error: "Failed to start check-in"
        });
    }
};

// Get user's check-ins
export const getMyCheckins = async (req, res) => {
    try {
        const userId = req.user.id;

        const checkins = await getCheckinsByUser(userId);

        res.json({
            success: true,
            checkins
        });

    } catch (error) {
        console.error("❌ Get check-ins error:", error);

        res.status(500).json({
            success: false,
            error: "Failed to get check-ins"
        });
    }
};

// Update check-in status
export const completeCheckin = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { status } = req.body;

        if (!["completed", "missed"].includes(status)) {
            return res.status(400).json({
                success: false,
                error: "Status must be completed or missed"
            });
        }

        const checkin = await updateCheckinStatus(
            id,
            userId,
            status
        );

        if (!checkin) {
            return res.status(404).json({
                success: false,
                error: "Check-in not found"
            });
        }

        res.json({
            success: true,
            message: `Check-in marked as ${status}`,
            checkin
        });

    } catch (error) {
        console.error("❌ Update check-in error:", error);

        res.status(500).json({
            success: false,
            error: "Failed to update check-in"
        });
    }
};