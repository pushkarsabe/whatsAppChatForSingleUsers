const Group = require('../model/group');
const User = require('../model/user');
const Sequelize = require('sequelize');
const { sendMessageToGroup } = require('../socket'); // Import socket utility

// Utility to find if a 1-on-1 chat already exists
async function findExistingOneToOneChat(initiatorId, receiverId) {
    const id1 = String(initiatorId);
    const id2 = String(receiverId);

    return Group.findOne({
        where: {
            [Sequelize.Op.and]: [
                Sequelize.literal(`groupMembers LIKE '%"${id1}"%'`),
                Sequelize.literal(`groupMembers LIKE '%"${id2}"%'`)
            ],
            isDeleted: false
        },
        // IMPORTANT: Select 'isPending' here for checks below
        attributes: ['id', 'groupMembers', 'isPending', 'isDeleted']
    });
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
            const status = existingGroup.isPending ? 'pending' : 'active';
            const message = existingGroup.isPending ? "Chat request already pending." : "Chat already active.";
            return res.status(200).json({
                success: true,
                group: { id: existingGroup.id, status: status },
                message: message
            });
        }

        const receiver = await User.findByPk(receiverId, { attributes: ['name'] });
        if (!receiver) {
            return res.status(404).json({ message: "Receiver user not found." });
        }

        const memberIds = JSON.stringify([String(initiatorId), String(receiverId)]);

        // Creation now correctly uses the 'isPending' column (which defaults to TRUE)
        const newGroup = await Group.create({
            groupMembers: memberIds
            // isPending: true is applied by the model's default value
        });

        // TODO: Send WebSocket notification to the receiver's active session (This would be more complex and require a user-to-socket mapping)
        // For now, we rely on the recipient refreshing the list to see the request in the modal.

        res.status(201).json({
            success: true,
            group: { id: newGroup.id, senderId: initiatorId, status: 'pending' },
            message: "Friend request sent."
        });

    } catch (err) {
        // Logging the original error helps confirm the missing column issue
        console.error("createOneToOneGroup error = ", err.original || err);
        res.status(500).json({ message: "Failed to create group due to a server error." });
    }
}

// GET /groups/get-data (Fetching Sidebar Data)
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
            // Selecting all required attributes, including isPending
            attributes: ['id', 'groupMembers', 'isPending', 'isDeleted', 'createdAt', 'updatedAt']
        });

        const chatList = await Promise.all(groups.map(async group => {
            let friendName = 'Private Chat';
            let friendId = null;
            let status = group.isPending ? 'pending' : 'active';

            const memberIds = JSON.parse(group.groupMembers);
            const isGroupChat = memberIds.length > 2;

            if (!isGroupChat) {
                const otherMemberId = memberIds.find(id => id !== userIdString);

                if (otherMemberId) {
                    friendId = parseInt(otherMemberId);
                    const friend = await User.findByPk(friendId, { attributes: ['name'] });
                    if (friend) {
                        friendName = friend.name;
                    }
                }
            } else {
                friendName = `Group Chat (${memberIds.length} members)`;
            }

            // Determine if the current user is the INITIATOR. If we don't store the initiator, 
            // we have to rely on the side effect that if it's pending, the other user is the initiator.
            // For simplicity, we assume the user who is NOT the current logged-in user is the one 
            // whose name is currently being fetched for a PENDING chat.

            return {
                id: group.id,
                name: friendName,
                isGroupChat: isGroupChat,
                isPending: group.isPending, // Send status to frontend for filtering
                friendId: friendId,
                lastMessage: status === 'pending' ? 'Request Sent' : 'Click to chat.'
            };
        }));

        // The frontend will now handle displaying PENDING chats only in the notification modal.
        // We will send the full list to the frontend to handle filtering/routing based on UI.

        res.status(200).json({ success: true, chats: chatList });

    } catch (err) {
        console.log("getUsersGroups error = ", err);
        res.status(500).json({ error: err, message: "Failed to retrieve user groups." });
    }
}


// POST /groups/accept-request
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

        // Find the Initiator ID for the socket notification
        const initiatorId = memberIds.find(id => id !== String(userId));
        const initiatorUser = await User.findByPk(initiatorId, { attributes: ['name'] });

        group.isPending = false; // Mark as active
        await group.save();

        // 1. Send WebSocket notification to the initiator to refresh their sidebar
        if (initiatorUser) {
            const notificationData = {
                type: 'requestAccepted',
                groupId: groupId,
                accepterName: req.user.name,
                message: `${req.user.name} accepted your chat request!`
            };

            // Use the group ID as the room name (since both users are in the room)
            sendMessageToGroup(groupId, notificationData);
        }

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