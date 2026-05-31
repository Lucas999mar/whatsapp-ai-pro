// ══════════════════════════════════════════════════════════════
// Socket.IO Manager - Real-time delivery tracking
// ══════════════════════════════════════════════════════════════
const { Server } = require('socket.io');

let io = null;

function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        },
        transports: ['websocket', 'polling']
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Socket conectado: ${socket.id}`);

        // Motoboy entra na sala do tenant para receber novas entregas
        socket.on('motoboy:join', ({ tenantId, motoboyId }) => {
            socket.join(`tenant:${tenantId}`);
            socket.join(`motoboy:${motoboyId}`);
            socket.motoboyId = motoboyId;
            socket.tenantId = tenantId;
            console.log(`🏍️ Motoboy ${motoboyId} entrou no tenant ${tenantId}`);
        });

        // Admin entra na sala do tenant
        socket.on('admin:join', ({ tenantId }) => {
            socket.join(`tenant:${tenantId}`);
            socket.join(`admin:${tenantId}`);
            socket.tenantId = tenantId;
            console.log(`🏢 Admin entrou no tenant ${tenantId}`);
        });

        // Cliente entra na sala de tracking específica
        socket.on('tracking:join', ({ trackingCode }) => {
            socket.join(`tracking:${trackingCode}`);
            console.log(`👤 Cliente rastreando: ${trackingCode}`);
        });

        // Motoboy envia GPS → repassa para admin + cliente
        socket.on('motoboy:location', (data) => {
            const { tenantId, motoboyId, trackingCode, lat, lng, accuracy } = data;

            // Envia para o admin
            if (tenantId) {
                io.to(`admin:${tenantId}`).emit('delivery:location', {
                    motoboyId, lat, lng, accuracy, timestamp: new Date().toISOString()
                });
            }

            // Envia para o cliente que está rastreando
            if (trackingCode) {
                io.to(`tracking:${trackingCode}`).emit('delivery:location', {
                    motoboyId, lat, lng, accuracy, timestamp: new Date().toISOString()
                });
            }
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Socket desconectado: ${socket.id}`);
        });
    });

    console.log('🔌 Socket.IO inicializado');
    return io;
}

function getIO() {
    return io;
}

// Emitir eventos do backend para clientes conectados
function emitDeliveryEvent(event, data) {
    if (!io) return;

    const { tenantId, trackingCode } = data;

    // Sempre envia para o admin do tenant
    if (tenantId) {
        io.to(`admin:${tenantId}`).emit(event, data);
        io.to(`tenant:${tenantId}`).emit(event, data);
    }

    // Se tiver tracking code, envia para o cliente
    if (trackingCode) {
        io.to(`tracking:${trackingCode}`).emit(event, data);
    }
}

module.exports = { initSocket, getIO, emitDeliveryEvent };
