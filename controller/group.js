const Group = require('../model/group');
const User = require('../model/user');
const Sequelize = require('sequelize');

// Utility to find if a 1-on-1 chat already exists using string matching
async function findExistingOneToOneChat(initiatorId, receiverId) {
    const id1 = String(initiatorId);
    const id2 = String(receiverId);

    // CRITICAL FIX: Removed the non-existent `isGroupChat: false` condition
    const existingGroup = await Group.findOne({
        where: {
            [Sequelize.Op.and]: [
                Sequelize.literal(`groupMembers LIKE '%"${id1}"%'`),
                Sequelize.literal(`groupMembers LIKE '%"${id2}"%'`)
            ]
        },
        attributes: ['id', 'groupMembers'] // Select only existing columns
    });

    return existingGroup;
}


// POST /groups/create-one-on-one
exports.createOneToOneGroup = async (req, res) => {
    const initiatorId = req.user.id;
    const receiverId = req.body.receiverId;

    if (initiatorId == receiverId) {
        return res.status(400).json({ message: "Cannot start chat with self." });
    }

    try {
        const existingGroup = await findExistingOneToOneChat(initiatorId, receiverId);

        if (existingGroup) {
            return res.status(200).json({
                success: true,
                group: {
                    id: existingGroup.id,
                    senderId: initiatorId,
                    receiverId: receiverId
                },
                message: "Chat already exists"
            });
        }

        const receiver = await User.findByPk(receiverId, { attributes: ['name'] });
        if (!receiver) {
            return res.status(404).json({ message: "Receiver user not found." });
        }

        const memberIds = JSON.stringify([String(initiatorId), String(receiverId)]);

        // CRITICAL FIX: Omitted 'isGroupChat' from creation as well
        const newGroup = await Group.create({
            groupMembers: memberIds
        });

        res.status(201).json({
            success: true,
            group: {
                id: newGroup.id,
                senderId: initiatorId,
                receiverId: receiverId
            },
            message: "New one-on-one chat created"
        });

    } catch (err) {
        console.error("createOneToOneGroup error = ", err.original); // Log original error for better debugging
        res.status(500).json({ error: err.message, message: "Failed to create group due to a server error." });
    }
}

// GET /groups/get-data
exports.getUsersGroups = async (req, res) => {
    try {
        const userId = req.user.id;
        const userIdString = String(userId);

        const groups = await Group.findAll({
            where: {
                isDeleted: false,
                groupMembers: {
                    [Sequelize.Op.like]: `%"${userIdString}"%`
                }
            },
            // CRITICAL FIX: Only select columns that actually exist in your database schema
            attributes: ['id', 'groupMembers', 'isDeleted', 'createdAt', 'updatedAt']
        });

        const chatList = await Promise.all(groups.map(async group => {
            let friendName = 'Private Chat';
            let friendId = null;
            let isGroupChat = false; // Deduced value

            const memberIds = JSON.parse(group.groupMembers);

            if (memberIds.length === 2) {
                const otherMemberId = memberIds.find(id => id !== userIdString);

                if (otherMemberId) {
                    friendId = parseInt(otherMemberId);
                    const friend = await User.findByPk(friendId, { attributes: ['name'] });
                    if (friend) {
                        friendName = friend.name;
                    }
                }
            } else if (memberIds.length > 2) {
                isGroupChat = true;
                friendName = `Group Chat (${memberIds.length} members)`; // Placeholder name
            }

            return {
                id: group.id,
                name: friendName,
                isGroupChat: isGroupChat,
                friendId: friendId,
                lastMessage: "Click to chat."
            };
        }));

        res.status(200).json({ success: true, chats: chatList });

    } catch (err) {
        console.log("getUsersGroups error = ", err);
        res.status(500).json({ error: err, message: "Failed to retrieve user groups." });
    }
}

exports.acceptFriendRequest = async (req, res) => {
    const groupId = req.body.groupId;
    const userId = req.user.id;

    try {
        const group = await Group.findByPk(groupId);

        if (!group || !group.isPending) {
            return res.status(404).json({ message: "Request not found or already accepted." });
        }

        const memberIds = JSON.parse(group.groupMembers);

        // Safety check: only the receiver should accept the request
        if (!memberIds.includes(String(userId))) {
            return res.status(403).json({ message: "Not authorized." });
        }

        group.isPending = false; // Mark as active
        await group.save();

        // TODO: Send WebSocket notification to both users that chat is active.

        res.status(200).json({ success: true, message: "Friend request accepted. Chat is now active." });

    } catch (err) {
        console.error("acceptFriendRequest error = ", err);
        res.status(500).json({ error: err, message: "Failed to accept request." });
    }
}

exports.rejectFriendRequest = async (req, res) => {
    const groupId = req.body.groupId;

    try {
        const group = await Group.findByPk(groupId);

        if (!group) {
            return res.status(404).json({ message: "Group not found." });
        }

        // Permanent rejection: Delete the pending group
        await group.destroy();

        res.status(200).json({ success: true, message: "Friend request rejected and pending chat deleted." });

    } catch (err) {
        console.error("rejectFriendRequest error = ", err);
        res.status(500).json({ error: err, message: "Failed to reject request." });
    }
}