const puppeteer = require('puppeteer')
const botResponses = require('./bot-responses')
const {gameOptions, restartGameOptions} = require('./options')

const chats = {}
const weatherInfo={}

async function startGame ({chatId, bot}){
    console.log('начало в startGame')
    await bot.sendMessage(chatId, 'Сейчас я загадаю цифру от 0 до 9, а ты должен ее угадать')
    const randomNumber = Math.floor(Math.random()*10)
    chats[chatId] = randomNumber
    await bot.sendSticker(chatId, "https://tlgrm.ru/_/stickers/9df/619/9df6199a-ff6a-338d-9f74-625b0a647045/6.webp")
    await bot.sendMessage(chatId, botResponses.guessNumber, gameOptions)
   
}

async function guessNumberHandle ({bot, msg}){
    console.log('я в guessNumberHandle')
    const userResponse = msg.data
    const chatId = msg?.message?.chat?.id
    console.log('chats[chatId]:', chats[chatId])

    if (userResponse==='/again') {
        console.log('я в guessNumberHandle в блоке again')
        startGame({chatId, bot})
    }
    if (Number(userResponse)>chats[chatId]) return  bot.sendMessage(chatId, 'Загаданное число меньше', restartGameOptions)
    if (Number(userResponse)<chats[chatId]) return  bot.sendMessage(chatId, 'Загаданное число больше', restartGameOptions)
    if (Number(userResponse)===chats[chatId]) {
        await bot.sendSticker(chatId, "https://cdn.tlgrm.app/stickers/9df/619/9df6199a-ff6a-338d-9f74-625b0a647045/192/1.webp")
        return  bot.sendMessage(chatId, 'Поздравляю! Вы выиграли!')
    }
}

async function selectCityHandle ({bot, msg}){
    const userResponse = msg.data
    const chatId = msg?.message?.chat?.id
    console.log("userResponse:", userResponse)
    console.log('weatherInfo:', weatherInfo)
    if (userResponse==='See all'){
        console.log('user selected see all')
        const cities = Object.keys(weatherInfo)
        console.log("cities:", cities)
        let result=''
        cities.forEach(city=>{
            result+=`${city}: ${weatherInfo[city].description} ${weatherInfo[city].temperature} \n`
        })
        console.log("result:", result)
        const photo = __dirname + '/screenshot.png';
        bot.sendPhoto(chatId, photo, {caption: "Keep the map bro!"});
        return bot.sendMessage(chatId, result)
    }
    return bot.sendMessage(chatId, `${weatherInfo[userResponse]?.description} ${weatherInfo[userResponse]?.temperature}`)
}

async function getInfoWeather({chatId, bot}) {
        console.log('в начале')
        const browser = await puppeteer.launch({ 
            //args: ['--no-sandbox'], 
            headless:false
        })
        const page = await browser.newPage()
        await page.goto('https://www.eldoradoweather.com/canada/CanadaForecasts/canada/canada.php')
        
        const parsedData = await page.$$eval('.wet-boew-zebra tbody tr td', tds => {
            return tds.map(tr => tr.textContent);
        });
    
        parsedData.forEach((str, i)=>{
            if (!(i%3)){
                weatherInfo[str]={}
                weatherInfo[str]['description']= parsedData[i+1]
                weatherInfo[str]['temperature'] = parsedData[i+2]
            }
        })
    
        const cities = Object.keys(weatherInfo)
        const inlineKeyboardCitiesFlat = cities.map(city=>{
            return {
                text:city, 
                callback_data: city
            }
        })
    
        const inlineKeyboardCities = []
    
        for (let i=0; i<inlineKeyboardCitiesFlat.length; i++){
            if (!(i%2)){
                const innerArray = [inlineKeyboardCitiesFlat[i]]
                if (inlineKeyboardCitiesFlat[i+1]) innerArray.push(inlineKeyboardCitiesFlat[i+1])
                i++
                inlineKeyboardCities.push(innerArray)
            }
        }
        inlineKeyboardCities.push([{text:"See all", callback_data:"See all"}])
    
        console.log("inlineKeyboardCitiesFlat:", inlineKeyboardCitiesFlat)
        console.log("inlineKeyboardCities:", inlineKeyboardCities)
    
        const citiesOptions = {
            reply_markup: JSON.stringify({
                inline_keyboard: inlineKeyboardCities
            })
        }
    
        await page.setViewport({
            width:1200,
            height: 780
        })
    
        await page.screenshot({path:'screenshot.png'})
        
        await browser.close()
        return  bot.sendMessage(chatId, botResponses.selectCity, citiesOptions)
    }
    


module.exports = {
    guessNumberHandle,
    selectCityHandle,
    startGame,
    getInfoWeather
}