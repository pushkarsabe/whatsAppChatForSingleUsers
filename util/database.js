const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.RENDER) {
    console.log("Connecting to Aiven MySQL database on Render...");

    sequelize = new Sequelize(
        process.env.DB_DATABASE,
        process.env.DB_USER, 
        process.env.DB_PASSWORD, 
        {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            dialect: 'mysql',
            dialectOptions: {
                ssl: {
                    require: true,
                    rejectUnauthorized: false,
                    ca: process.env.DB_CERT,
                }
            }
        }
    );

    
} else {
    console.log("Connecting to local MySQL database...");
    sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASSWORD,
        {
            host: process.env.DB_HOST,
            dialect: 'mysql'
        }
    );
}

module.exports = sequelize;