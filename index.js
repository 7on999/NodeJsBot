const TelegramApi = require('node-telegram-bot-api')
const {gameOptions, restartGameOptions} = require('./options')
require('dotenv').config()
const pool = require('./db')

const bot = new TelegramApi(process.env.TOKEN, {polling:true})

const chats = {}
bot.setMyCommands([
    {command:'/start', description:'Начальное приветствие'},
    {command:'/info', description:'Получить информацию о пользователе'},
    {command:'/game', description:'Начать игру'},
])

const startGame = async(chatId)=>{
    await bot.sendMessage(chatId, 'Сейчас я загадаю цифру от 0 до 9, а ты должен ее угадать')
    const randomNumber = Math.floor(Math.random()*10)
    chats[chatId] = randomNumber
    await bot.sendSticker(chatId, "https://tlgrm.ru/_/stickers/9df/619/9df6199a-ff6a-338d-9f74-625b0a647045/6.jpg")
    await bot.sendMessage(chatId, "Отгадывай", gameOptions)
}


// const pgPool = new Pool(pgConfig);
// const pgPoolWrapper = {
//     async connect() {
//         for (let nRetry = 1; ; nRetry++) {
//             try {
//                 const client = await pgPool.connect();
//                 if (nRetry > 1) {
//                     console.info('Now successfully connected to Postgres');
//                 }
//                 return client;
//             } catch (e) {
//                 if (e.toString().includes('ECONNREFUSED') && nRetry < 5) {
//                     console.info('ECONNREFUSED connecting to Postgres, ' +
//                         'maybe container is not ready yet, will retry ' + nRetry);
//                     // Wait 1 second
//                     await new Promise(resolve => setTimeout(resolve, 1000));
//                 } else {
//                     throw e;
//                 }
//             }
//         }
//     }
// };

bot.on("message", async(msg)=>{
    console.log('inner handle message')

    const text = msg.text
    const chatId = msg.chat.id
    const username = msg.from.username
    
    console.log('msg', msg)

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
            const newPerson = await bot.sendSticker(chatId, "https://cdn.tlgrm.app/stickers/b0d/85f/b0d85fbf-de1b-4aaf-836c-1cddaa16e002/thumb-animated-128.mp4")
            await bot.sendMessage(chatId, 'Добро пожаловать в наш чат')
            break
        case "/info":
            await bot.sendMessage(chatId, `Тебя зовут ${msg.from.first_name}`)
            break
        case "/game":
            startGame(chatId)
            break
        default:
            return bot.sendMessage(chatId, `Дорогой(-ая) ${msg.from.first_name}, я тебя не понимаю`)
    }
})

bot.on('callback_query', async msg=>{
    const userResponse = msg.data
    const chatId = msg?.message?.chat?.id
    
    if (userResponse==='/again') startGame(chatId)
    if (Number(userResponse)>chats[chatId]) return  bot.sendMessage(chatId, 'Загаданное число меньше', restartGameOptions)
    if (Number(userResponse)<chats[chatId]) return  bot.sendMessage(chatId, 'Загаданное число больше', restartGameOptions)
    if (Number(userResponse)===chats[chatId]) {
        await bot.sendSticker(chatId, "https://cdn.tlgrm.app/stickers/9df/619/9df6199a-ff6a-338d-9f74-625b0a647045/192/1.webp")
        return  bot.sendMessage(chatId, 'Поздравляю! Вы выиграли!')
    }
})