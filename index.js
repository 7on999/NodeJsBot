const TelegramApi = require('node-telegram-bot-api')
const {gameOptions, restartGameOptions} = require('./options')
require('dotenv').config()

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

bot.on("message", async(msg)=>{
    const text = msg.text
    const chatId = msg.chat.id;

    switch(text){
        case '/start':
            await bot.sendSticker(chatId, "https://cdn.tlgrm.app/stickers/b0d/85f/b0d85fbf-de1b-4aaf-836c-1cddaa16e002/thumb-animated-128.mp4")
            await bot.sendMessage(chatId, 'Добро пожаловать в наш чат')
            break
        case "/info":
            await bot.sendMessage(chatId, `Тебя зовут ${msg.from.first_name}`)
            break
        case "/game":
            startGame(chatId)
            break
        default:
            return bot.sendMessage(chatId, `Дорогой ${msg.from.first_name}, я тебя не понимаю`)
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