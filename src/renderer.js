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
