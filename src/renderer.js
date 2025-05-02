const { ipcRenderer } = require('electron');

// Recebe o QR code do main.js
ipcRenderer.on('qr', (event, qr) => {
    const qrCodeImg = document.getElementById('qr-code');
    
    if (qrCodeImg) {
        qrCodeImg.src = qr;
        qrCodeImg.style.display = 'block'; // Exibe a imagem do QR code
    } else {
        console.error('Elemento de imagem QR code não encontrado.');
    }
});

// Ouve o evento de erro (quando as tentativas de reconexão falharem)
ipcRenderer.on('error', (event, message) => {
    const errorMessage = document.createElement('div');
    errorMessage.style.color = 'red';
    errorMessage.style.marginTop = '20px';
    errorMessage.innerText = message;
    document.body.appendChild(errorMessage); // Exibe a mensagem de erro
});

// Recebe a confirmação de que os dados da sessão foram limpos
ipcRenderer.on('session-cleared', () => {
    alert('Dados da sessão foram limpos. Iniciando uma nova sessão...');
});
