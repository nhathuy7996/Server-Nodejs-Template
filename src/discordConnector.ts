 import { Client, Events, GatewayIntentBits, TextChannel } from "discord.js";
import dotenv from "dotenv"; 

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const channelId = process.env.CHANNEL_ID;

if (!token || !channelId) {
    console.error("Vui lòng cung cấp DISCORD_TOKEN và CHANNEL_ID trong .env");
    process.exit(1);
}

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once(Events.ClientReady, async () => {
    console.log(`Bot đã đăng nhập với tên: ${client.user?.tag}`);

    const channel = client.channels.cache.get(channelId!) as TextChannel;
    if (!channel) {
        console.error("Không tìm thấy kênh!");
        return;
    }
    
    // channel.send("Bot đã hoạt động! 🚀");
});

client.on(Events.MessageCreate, async (message) => {
    // Bỏ qua tin nhắn của chính bot
    if (message.author.bot) return;
  
    // Kiểm tra bot có bị tag hay không
    if (message.mentions.has(client.user!)) {
      console.log(`📩 Được tag bởi ${message.author.tag}: ${message.content}`);
        
      if (message.content.toLowerCase().includes("game")) 
        await message.reply(`Chào ${message.author.username}! Game đây nhá!!\n
    🤖 [Shadow Javelin](https://t.me/gamedevtoi_bot/shadow_javelin)\n
    🍉 [Garden DHH](https://t.me/gamedevtoi_bot/gardenDHH)`);
    }
  });

// Xử lý lỗi Discord client
client.on(Events.Error, (error) => {
    console.error('Discord client error:', error);
});

// Đăng nhập với xử lý lỗi
client.login(token).catch((error) => {
    console.error('❌ Discord login failed:', error.message);
    console.log('⚠️  Discord bot không khả dụng');
});

function Connect() {
    return new Promise((resolve, reject) => {
        // Nếu đã ready thì resolve ngay
        if (client.isReady()) {
            resolve(client);
            return;
        }

        // Timeout sau 5 giây nếu không kết nối được
        const timeout = setTimeout(() => {
            clearInterval(check);
            reject(new Error('Discord connection timeout'));
        }, 5000);

        const check = setInterval(() => {
            if (client.isReady()) {
                clearTimeout(timeout);
                clearInterval(check);
                resolve(client);
            }
        }, 100);
    })
}

// Hàm gửi thông báo
export async function sendDiscordNotification(message: string) {
    try {
        await Connect();

        console.log(`Gửi tin đến server!`);
        const channel = client.channels.cache.get(channelId!) as TextChannel;
        if (channel) {
            await channel.send(message);
        } else {
            console.error("Không thể gửi tin nhắn, kênh không tồn tại!");
        }
    } catch (error) {
        console.error("❌ Không thể gửi Discord notification:", error instanceof Error ? error.message : error);
        // Server vẫn tiếp tục chạy, chỉ log lỗi
    }
}


