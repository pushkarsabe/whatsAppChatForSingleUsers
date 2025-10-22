const Sequelize = require('sequelize');

const sequelize = require('../util/database');

const Group = sequelize.define('group', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    groupMembers: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: '[]'
    }
    ,
    isPending: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    isDeleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
    }
});

module.exports = Group;