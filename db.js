
const { Pool } = require('pg')
require('dotenv').config()

const devConfig = `postgres://${process.env.USER_FOR_DB}:5385c4e52c4b8152545e525425377a91824e86354ed8f79ed224d7534624126d@${process.env.HOST}:${process.env.PORT}/${process.env.DATABASE}`

const pool = new Pool({
  connectionString: devConfig,
  ssl: {
    rejectUnauthorized: false
  }
})

module.exports = pool
