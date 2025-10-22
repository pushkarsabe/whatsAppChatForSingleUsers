// /controller/group.js (Logic Corrected for 'isPending' Column)

const Group = require('../model/group');
const User = require('../model/user');
const Sequelize = require('sequelize');

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

        // TODO: Send WebSocket notification to the receiver's active session

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
            
            return {
                id: group.id,
                name: friendName,
                isGroupChat: isGroupChat,
                isPending: group.isPending, // Send status to frontend for filtering
                friendId: friendId,
                lastMessage: status === 'pending' ? 'Request Sent' : 'Click to chat.'
            };
        }));
        
        // Filter out PENDING chats from the MAIN sidebar list if the user is the INITIATOR
        // The frontend will need to handle displaying PENDING chats only in the notification modal.
        const finalChatList = chatList.filter(chat => !chat.isPending || (chat.isPending && chat.friendId !== userId)); 


        res.status(200).json({ success: true, chats: finalChatList });

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