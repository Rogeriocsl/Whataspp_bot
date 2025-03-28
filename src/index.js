const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const notifier = require('node-notifier');

// Inicializa o cliente do WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

// Evento que lida com a geração do QR code
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('QR RECEIVED', qr);
});

// Evento que indica que o cliente está pronto
client.on('ready', () => {
    console.log('Client is ready!');
});

// Estado do menu do usuário
const userStates = {};

// Função para exibir o menu principal
const showMainMenu = async (chatId) => {
    const welcomeMessage = `               🏥 **Laboratório Central**\n` +
        `✨ **Bem-vindo(a)!** Como posso ajudar você hoje? ✨\n\n` +        
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
    const currentHour = now.getHours();
    const startHour = 8; // 8:00 AM
    const endHour = 18; // 6:00 PM
    return currentHour >= startHour && currentHour < endHour;
};

// Evento que lida com mensagens recebidas
/*
client.on('message', async (message) => {
    try {
        console.log(`Mensagem recebida: ${message.body}`);

        // Ignorar mensagens de grupos
        if (message.from.includes('@g.us')) {
            return; // Ignora mensagens de grupos
        }

        // Verifica se está fora do horário comercial
        if (!isWithinBusinessHours()) {
            console.log('Fora do horário comercial, respondendo com mensagem apropriada.');
            const outOfHoursMessage = `🔔 *Atendimento fora do horário comercial.*\n` +
                `Estamos disponíveis de *08:00 às 18:00*. Por favor, deixe sua mensagem e entraremos em contato assim que possível.`;
            await client.sendMessage(message.from, outOfHoursMessage);
            return; // Não processa mais mensagens se estiver fora do horário
        }

        // Verifica o estado do usuário
        const userState = userStates[message.from];
        console.log(`Estado do usuário: ${userState}`);

        // Se o usuário não tem um estado, exibe o menu principal
        if (!userState) {
            console.log('Usuário sem estado, mostrando o menu principal.');
            await showMainMenu(message.from);
            return;
        }

        // Se o usuário está aguardando atendimento, ignora mensagens
        if (userState === 'option') {
            if (message.body === '0') {
                await showMainMenu(message.from);
                userStates[message.from] = 'main'; // Retorna ao estado "main"
            } else {
                // Ignora qualquer outra mensagem
                return; 
            }
        }

        // Responde a opções específicas
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
            userStates[message.from] = 'option'; // Define o estado como "option"
        }

        // Adicionar notificação ao receber uma mensagem
        notifier.notify({
            title: 'Nova Mensagem',
            message: message.body,
            sound: true,
        });

    } catch (error) {
        console.error('Erro ao processar a mensagem:', error);
    }
});
*/

client.on('message', async (message) => {
    try {
        console.log(`Mensagem recebida: ${message.body}`);

        // Ignora mensagens de grupos
        if (message.from.includes('@g.us')) {
            return;
        }

        // Responde a qualquer mensagem
        const responseMessage = 'Recebi sua mensagem! Obrigado por entrar em contato.';
        await client.sendMessage(message.from, responseMessage);
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
    }
});



// Inicializa o cliente
client.initialize().catch(error => {
    console.error('Erro ao inicializar o cliente:', error);
});

module.exports = {
    initializeClient,
    sendNotification
};