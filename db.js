
const { Pool } = require('pg')
require('dotenv').config()

const devConfig = `postgres://${process.env.USER_DB}:5385c4e52c4b8152545e525425377a91824e86354ed8f79ed224d7534624126d@${process.env.HOST_DB}:${process.env.PORT_DB}/${process.env.DATABASE_DB}`
// const devConfig = "postgres://imgglzlqbqvzzj:5385c4e52c4b8152545e525425377a91824e86354ed8f79ed224d7534624126d@ec2-52-208-164-5.eu-west-1.compute.amazonaws.com:5432/de42h4drq4iqqa"
//const devConfig = `postgres://${process.env.USER_DB}:5385c4e52c4b8152545e525425377a91824e86354ed8f79ed224d7534624126d@ec2-52-208-164-5.eu-west-1.compute.amazonaws.com:${process.env.PORT_DB}/de42h4drq4iqqa`

console.log("devConfig:", devConfig)
const pool = new Pool({
  connectionString: devConfig,
  ssl: {
    rejectUnauthorized: false
  }
})

module.exports = pool
