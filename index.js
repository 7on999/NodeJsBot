const TelegramApi = require('node-telegram-bot-api')

const pool = require('./db')
const botResponses = require('./bot-responses')
const {guessNumberHandle, selectCityHandle, startGame, getInfoWeather} = require('./helpers')

require('dotenv').config()

const bot = new TelegramApi(process.env.TOKEN, {polling:true})

bot.setMyCommands([
    {command:'/start', description:'Начальное приветствие'},
    {command:'/info', description:'Получить информацию о пользователе'},
    {command:'/game', description:'Начать игру'},
    {command:'/weather', description:'Узнать погоду в Канаде'},
])

bot.on("message", async(msg)=>{
    console.log('inner handle message')

    const text = msg.text
    const chatId = msg.chat.id
    const username = msg.from.username
    
    const client = await pool.connect()

    try{
        await pool.query("BEGIN")

        try{            
            const responseChatsDb = await pool.query(`INSERT INTO CHATS (telegram_chat_id) values ($1) RETURNING *`, [chatId])
            const responseUsersDb = await pool.query(`INSERT INTO USERS (username, first_name, last_name) values ($1, $2, $3) RETURNING *`, [username, msg.from.first_name, msg.from.last_name])
    
            const userIdDB = responseUsersDb.rows.at(-1).id
            const chatIdDB = responseChatsDb.rows.at(-1).id

            const checkUsersChatsDb = await pool.query(`INSERT INTO chats_users (chat_id, user_id) values ($1, $2) RETURNING *`, [chatIdDB, userIdDB])
            await pool.query("COMMIT")

        } catch(e){
            console.log('попал в ROLLBACK')
            await pool.query("ROLLBACK")
        } finally {
            console.log('внутри finally')
            const userIdFromDb = await pool.query(`select id from users where username='${username}'`)
            const userIdDB = userIdFromDb.rows[0].id

            const responseChatIdDB = await pool.query(`select id from chats where telegram_chat_id=${chatId}`)
            const chatIdDB = responseChatIdDB.rows[0].id

            const responseMessagesDb = await pool.query(`INSERT INTO MESSAGES (value, user_id, chat_id) values ($1, $2, $3) RETURNING *`, [msg.text, userIdDB, chatIdDB])
            client.release()
        }
    
    } catch(e){
        console.log('Не получилось записать данные в БД:', e)
    }

    switch(text){
        case '/start':
            console.log('iiner start')
            await bot.sendSticker(chatId, "https://cdn.tlgrm.app/stickers/b0d/85f/b0d85fbf-de1b-4aaf-836c-1cddaa16e002/thumb-animated-128.mp4")
            await bot.sendMessage(chatId, 'Добро пожаловать в наш чат')
            break
        case "/info":
            await bot.sendMessage(chatId, `Тебя зовут ${msg.from.first_name}`)
            break
        case "/game":
            startGame({chatId, bot})
            break
        case "/weather":
            getInfoWeather({chatId, bot})
            break
        default:
            return bot.sendMessage(chatId, `Дорогой(-ая) ${msg.from.first_name}, я тебя не понимаю`)
    }
})

bot.on('callback_query', async msg=>{

    console.log('I am in callback_query')
    console.log("msg.message.text:", msg.message.text)

    switch(msg.message.text){
        case botResponses.guessNumber:
        case botResponses.guessedNumberBigger:
        case botResponses.guessedNumberSmalller:
            await guessNumberHandle({bot, msg})
            break
        case botResponses.selectCity:
            await selectCityHandle({bot, msg})
            break
    }
})