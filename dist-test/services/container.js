"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getService = exports.container = exports.ServiceId = void 0;
// Service identifier symbols
exports.ServiceId = {
    // Core services
    Logger: Symbol.for('Logger'),
    WebhookService: Symbol.for('WebhookService'),
    DiscordClient: Symbol.for('DiscordClient'),
    DiscordService: Symbol.for('DiscordService'),
    LLMManager: Symbol.for('LLMManager'),
    // Bots
    BlueBot: Symbol.for('BlueBot'),
    BananaBot: Symbol.for('BananaBot'),
    AttitudeBot: Symbol.for('AttitudeBot'),
    BabyBot: Symbol.for('BabyBot'),
    CatBot: Symbol.for('CatBot'),
    DadBot: Symbol.for('DadBot'),
    DogBot: Symbol.for('DogBot'),
    FoodBot: Symbol.for('FoodBot'),
    GoodBot: Symbol.for('GoodBot'),
    HugBot: Symbol.for('HugBot'),
    MomBot: Symbol.for('MomBot'),
    SpiderBot: Symbol.for('SpiderBot'),
    VennBot: Symbol.for('VennBot'),
    MusicCorrectBot: Symbol.for('MusicCorrectBot')
};
// Type for service lookup by ID
// Simple container implementation
var SimpleContainer = /** @class */ (function () {
    function SimpleContainer() {
        this.services = new Map();
    }
    SimpleContainer.prototype.register = function (id, instance) {
        this.services.set(id, instance);
    };
    SimpleContainer.prototype.get = function (id) {
        var service = this.services.get(id);
        if (!service) {
            throw new Error("Service not registered: ".concat(String(id)));
        }
        return service;
    };
    SimpleContainer.prototype.has = function (id) {
        return this.services.has(id);
    };
    SimpleContainer.prototype.clear = function () {
        this.services.clear();
    };
    return SimpleContainer;
}());
// Export the container instance
exports.container = new SimpleContainer();
// Helper function to get a service
function getService(serviceId) {
    return exports.container.get(serviceId);
}
exports.getService = getService;
