const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const notifier = require('node-notifier'); // Para notificações

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

// Função para criar a janela do aplicativo
function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    win.loadFile(path.join(__dirname, 'index.html'));
}

// Inicializa o aplicativo
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Fecha o aplicativo quando todas as janelas são fechadas
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// Enviar QR code para o renderer
client.on('qr', (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
        if (err) {
            console.error('Erro ao gerar QR Code:', err);
            return;
        }
        BrowserWindow.getAllWindows()[0].webContents.send('qr', url);
    });
});

// Tentar reconectar se houver falha
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

const restartClient = () => {
    reconnectAttempts++;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log('Tentativas de reconexão excedidas. Limpando dados e reiniciando a sessão...');
        LocalAuth.removeData(); // Limpa os dados da sessão
        reconnectAttempts = 0; // Reseta as tentativas
        client.initialize(); // Inicializa uma nova sessão
        BrowserWindow.getAllWindows()[0].webContents.send('session-cleared'); // Envia sinal para front-end
    } else {
        console.log(`Tentativa ${reconnectAttempts} de reconexão falhou.`);
    }
};

client.on('auth_failure', () => {
    console.log('Falha na autenticação, tentando reconectar...');
    restartClient();
});

client.on('authenticated', () => {
    reconnectAttempts = 0; // Reseta tentativas após sucesso
    console.log('Cliente autenticado');
    BrowserWindow.getAllWindows()[0].webContents.send('authenticated');
});

const userStates = {};

// Função para exibir o menu principal
const showMainMenu = async (chatId) => {
    const welcomeMessage = `✨ **Bem-vindo(a)!** Como posso ajudar você hoje? ✨\n\n` +
        `               🏥 **Laboratório Central**\n` +
        `Para agendar uma consulta ou exames, escolha a especialidade:\n` +
        `1️⃣ **Consulta com farmacêutico**\n` +
        `2️⃣ **Orçamento**\n` +
        `3️⃣ **Resultado de exames**\n` +
        `4️⃣ **Agendamento coleta a domicílio**\n` +
        `5️⃣ **Consulta e acompanhamento Farmacêutico**\n\n`;

    console.log(`Enviando mensagem para: ${chatId}`);
    await client.sendMessage(chatId, welcomeMessage);
    userStates[chatId] = 'main'; // Define o estado do usuário como "main"
};

// Função para verificar horário comercial
const isWithinBusinessHours = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const workHours = {
        weekdays: [
            { start: { hour: 6, minute: 30 }, end: { hour: 11, minute: 0 } },
            { start: { hour: 13, minute: 0 }, end: { hour: 16, minute: 0 } },
        ],
        saturday: [
            { start: { hour: 6, minute: 30 }, end: { hour: 11, minute: 0 } },
        ],
    };

    if (currentDay >= 1 && currentDay <= 5) {
        return workHours.weekdays.some(period => {
            const startTime = period.start;
            const endTime = period.end;
            const isInTimeRange = (currentHour > startTime.hour || (currentHour === startTime.hour && currentMinute >= startTime.minute)) &&
                (currentHour < endTime.hour || (currentHour === endTime.hour && currentMinute <= endTime.minute));
            return isInTimeRange;
        });
    }

    if (currentDay === 6) {
        return workHours.saturday.some(period => {
            const startTime = period.start;
            const endTime = period.end;
            const isInTimeRange = (currentHour > startTime.hour || (currentHour === startTime.hour && currentMinute >= startTime.minute)) &&
                (currentHour < endTime.hour || (currentHour === endTime.hour && currentMinute <= endTime.minute));
            return isInTimeRange;
        });
    }

    return false;
};

// Evento que lida com mensagens recebidas
client.on('message', async (message) => {
    try {
        console.log(`Mensagem recebida: ${message.body}`);

        // Ignorar mensagens de grupos
        if (message.from.includes('@g.us')) {
            return;
        }

        if (!isWithinBusinessHours()) {
            console.log('Fora do horário comercial, respondendo com mensagem apropriada.');
            const outOfHoursMessage = `🔔 *Atendimento Fora do Horário Comercial*\n` +
                `Olá! 😊\n` +
                `Atualmente, estamos fora do nosso horário de atendimento.\n\n` +
                `📅 *Nosso horário de funcionamento é:*\n\n` +
                `• *De segunda a sexta-feira:* das *06:30 às 11:00* e das *13:00 às 16:00*\n` +
                `• *Sábado:* das *06:30 às 11:00*\n\n` +
                `📩 Deixe sua mensagem, e responderemos assim que possível durante o nosso horário de atendimento. Agradecemos pela sua compreensão! 🙏`;
            await client.sendMessage(message.from, outOfHoursMessage);
            return;
        }

        const userState = userStates[message.from];
        console.log(`Estado do usuário: ${userState}`);

        if (!userState) {
            console.log('Usuário sem estado, mostrando o menu principal.');
            await showMainMenu(message.from);
            return;
        }

        if (userState === 'option') {
            if (message.body === '0') {
                await showMainMenu(message.from);
                userStates[message.from] = 'main';
            } else {
                return;
            }
        }

        if (userState === 'main' && ['1', '2', '3', '4', '5'].includes(message.body)) {
            const optionMessages = {
                '1': 'Você escolheu "Consulta com farmacêutico".',
                '2': 'Você escolheu "Orçamento".',
                '3': 'Você escolheu "Resultado de exames".',
                '4': 'Você escolheu "Agendamento coleta a domicílio".',
                '5': 'Você escolheu "Consulta e acompanhamento Farmacêutico".'
            };
            const responseMessage = `🏥 *Laboratório Central*\n` +
                `✨ Você escolheu: *${optionMessages[message.body]}*\n\n` +
                `🔄 Aguarde um momento, estou te transferindo para um de nossos atendentes 👩‍💻.\n\n` +
                `🔙 *Digite "0" para voltar ao menu principal.*`;

            console.log(`Enviando resposta: ${responseMessage}`);
            await client.sendMessage(message.from, responseMessage);
            userStates[message.from] = 'option';
        }

        notifier.notify({
            title: 'Nova Mensagem',
            message: message.body,
            sound: true,
        });

    } catch (error) {
        console.error('Erro ao processar a mensagem:', error);
    }
});

// Inicializa o cliente
client.initialize().catch(error => {
    console.error('Erro ao inicializar o cliente:', error);
});
